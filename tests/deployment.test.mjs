import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/server.mjs';
import { products } from '../src/catalog.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distRoot = path.join(projectRoot, 'dist');

async function filesUnder(directory, relative = '') {
  const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filename = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`El artefacto público no debe contener enlaces simbólicos: ${filename}`);
    if (entry.isDirectory()) files.push(...await filesUnder(directory, filename));
    else if (entry.isFile()) files.push(filename.replaceAll(path.sep, '/'));
  }
  return files.sort();
}

async function startStaticMount(prefix) {
  // Simulate a host mounting the generated repository export under a path.
  // This does not claim that the local Node server runs on Vercel.
  const application = createServer({ rootDir: projectRoot, rateLimit: 1000 });
  const server = http.createServer((request, response) => {
    if (!request.url.startsWith(prefix)) {
      response.writeHead(404);
      response.end('Fuera del montaje de prueba');
      return;
    }
    if (prefix !== '/') request.url = request.url.slice(prefix.length - 1);
    application.emit('request', request, response);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, documentUrl: new URL(prefix, `http://127.0.0.1:${server.address().port}`) };
}

async function closeServer(server) {
  const closed = once(server, 'close');
  server.close();
  server.closeAllConnections();
  await closed;
}

async function verifyPublicDependencyGraph(prefix) {
  const { server, documentUrl } = await startStaticMount(prefix);
  try {
    const page = await fetch(documentUrl);
    assert.equal(page.status, 200, `${prefix}: documento principal`);
    const html = await page.text();
    const urls = new Set();
    for (const [, reference] of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
      if (reference.startsWith('#')) continue;
      const resolved = new URL(reference, documentUrl);
      if (resolved.origin === documentUrl.origin) urls.add(resolved.href);
    }
    assert.ok(urls.size >= 8, `${prefix}: deben existir estilos, scripts y fotos locales`);
    const seen = new Set();
    const queue = [...urls];
    while (queue.length > 0) {
      const href = queue.shift();
      if (seen.has(href)) continue;
      seen.add(href);
      const resourceUrl = new URL(href);
      assert.ok(resourceUrl.pathname.startsWith(prefix), `${prefix}: recurso escapó del montaje: ${resourceUrl.pathname}`);
      const response = await fetch(resourceUrl);
      assert.equal(response.status, 200, `${prefix}: ${resourceUrl.pathname}`);
      const content = new Uint8Array(await response.arrayBuffer());
      assert.ok(content.byteLength > 0, `${prefix}: recurso vacío ${resourceUrl.pathname}`);
      if (resourceUrl.pathname.endsWith('.js')) {
        assert.match(response.headers.get('content-type'), /(?:text|application)\/javascript/);
        const source = new TextDecoder().decode(content);
        for (const [, reference] of source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?["']([^"']+)["']/g)) {
          assert.match(reference, /^\.\.?\//, `${prefix}: import no relativo ${reference}`);
          queue.push(new URL(reference, resourceUrl).href);
        }
      }
      if (resourceUrl.pathname.endsWith('.css')) {
        assert.match(response.headers.get('content-type'), /^text\/css/);
        const css = new TextDecoder().decode(content);
        for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]+))\s*\)/g)) {
          const reference = match[1] ?? match[2] ?? match[3];
          if (reference.startsWith('data:') || reference.startsWith('#')) continue;
          const dependency = new URL(reference, resourceUrl);
          assert.equal(dependency.origin, documentUrl.origin, `${prefix}: recurso CSS externo ${reference}`);
          queue.push(dependency.href);
        }
      }
    }
    assert.ok([...seen].some((href) => href.endsWith('/assets/catalog.js')), `${prefix}: import del catálogo no comprobado`);
    for (const product of products) {
      for (const source of new Set([product.image, ...(product.gallery ?? []).map((image) => image.src)])) {
        const imageUrl = new URL(source, documentUrl);
        assert.ok(imageUrl.pathname.startsWith(prefix), `${product.id}: foto escapó de ${prefix}`);
        const response = await fetch(imageUrl);
        assert.equal(response.status, 200, `${prefix}: foto ${product.id} ${source}`);
        assert.match(response.headers.get('content-type'), /^image\//);
        assert.ok((await response.arrayBuffer()).byteLength > 100, `${product.id}: foto vacía`);
      }
    }
  } finally {
    await closeServer(server);
  }
}

test('la configuración de Vercel limita la salida a dist y el artefacto excluye archivos privados y de desarrollo', async () => {
  const config = JSON.parse(await readFile(path.join(projectRoot, 'vercel.json'), 'utf8'));
  assert.equal(config.outputDirectory, 'dist');
  const files = await filesUnder(distRoot);
  assert.ok(files.includes('index.html'));
  assert.ok(files.includes('assets/app.js'));
  for (const filename of files) {
    assert.ok(filename === 'index.html' || filename.startsWith('assets/'), `Archivo fuera de la salida pública esperada: ${filename}`);
    assert.doesNotMatch(filename, /(?:^|\/)(?:\.[^/]+|src|private|reports|tests|node_modules|package(?:-lock)?\.json)(?:\/|$)/i, filename);
    assert.doesNotMatch(filename, /\.(?:haml|scss|mjs|map|env)$/i, filename);
  }
});

test('index.html y assets del repositorio coinciden byte por byte con la compilación dist', async () => {
  const distFiles = await filesUnder(distRoot);
  assert.deepEqual(await filesUnder(path.join(projectRoot, 'assets')), distFiles.filter((filename) => filename.startsWith('assets/')).map((filename) => filename.slice('assets/'.length)));
  for (const filename of distFiles) {
    const [expected, exported] = await Promise.all([readFile(path.join(distRoot, filename)), readFile(path.join(projectRoot, filename))]);
    assert.equal(Buffer.compare(expected, exported), 0, `Export desactualizado: ${filename}`);
  }
});

test('la exportación estática resuelve HTML, imports JavaScript y fotos desde la raíz del dominio', async () => {
  await verifyPublicDependencyGraph('/');
});

test('la exportación estática conserva recursos, imports y fotos bajo /maweimprimibles/', async () => {
  await verifyPublicDependencyGraph('/maweimprimibles/');
});
