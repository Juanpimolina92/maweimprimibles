import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/server.mjs';
import { products } from '../src/catalog.js';

const distDir = fileURLToPath(new URL('../dist/', import.meta.url));
let server;
let origin;

before(async () => {
  server = createServer({ rootDir: distDir, rateLimit: 1000 });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) {
    const closed = once(server, 'close');
    server.close();
    server.closeAllConnections();
    await closed;
  }
});

test('la página servida identifica a Marieta y enlaza consultas y crédito correctos', async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  const html = await response.text();
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  assert.match(html, /<html\b[^>]*lang=["']es-AR["']/);
  assert.match(text, /Soy Marieta.*imprimibles,.*kits y demás.*cosas lindas/);
  assert.match(html, /https:\/\/wa\.me\/5492646241204/);
  assert.match(text, /marie\.pezzutti\.mp/);
  assert.match(text, /Desarrollado por Juan Pablo Molina/);
  assert.match(html, /href=["']https:\/\/github\.com\/Juanpimolina92["']/);
  assert.match(html, /href=["']https:\/\/www\.instagram\.com\/mawe_kits\/["']/);
});

test('el hero React llega renderizado en HTML con título, consultas e imágenes antes de ejecutar JavaScript', async () => {
  const html = await (await fetch(origin)).text();
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, 'El documento debe tener un único título principal');
  const sectionStart = html.search(/<section\b[^>]*id=["']inicio["'][^>]*>/);
  assert.ok(sectionStart >= 0);
  const sectionEnd = html.indexOf('</section>', sectionStart);
  assert.ok(sectionEnd > sectionStart);
  const hero = html.slice(sectionStart, sectionEnd);
  assert.match(hero, /id=["']hero-react-root["']/);
  assert.match(hero, /<h1\b[^>]*id=["']hero-title["']/);
  assert.match(hero.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '), /Soy Marieta.*imprimibles,.*kits y demás.*cosas lindas/);
  assert.match(hero, /href=["']#catalogo["']/);
  assert.match(hero, /https:\/\/wa\.me\/5492646241204/);
  assert.match(hero, /data-catalog-filter=["']colorear["']/);
  assert.match(hero, /src=["']\.\/assets\/coloring-cover\.jpeg["']/);
  assert.match(hero, /src=["']\.\/assets\/coloring-pages\.jpeg["']/);
  assert.doesNotMatch(hero, /&lt;(?:div|h1|img)|<noscript\b/, 'El hero debe ser HTML real y no una alternativa oculta o escapada');
  const scripts = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/g)].map((match) => match[1]);
  assert.ok(scripts.includes('./assets/hero.js'), 'La hidratación debe tener un bundle local');
  for (const source of scripts) {
    assert.equal(new URL(source, `${origin}/`).origin, origin, `Script de un proveedor externo: ${source}`);
  }
  const response = await fetch(`${origin}/assets/hero.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /(?:text|application)\/javascript/);
  assert.ok((await response.arrayBuffer()).byteLength > 0);
});

test('todos los recursos declarados por la página responden con un tipo correcto', async () => {
  const html = await (await fetch(origin)).text();
  const assetPaths = [...new Set([...html.matchAll(/(?:src|href)=["']((?:\.\/|\/)assets\/[^"']+)["']/g)].map((match) => match[1]))];
  assert.ok(assetPaths.length >= 8, 'Debe haber estilos, librerías, aplicación e imágenes');
  for (const assetPath of assetPaths) {
    const response = await fetch(new URL(assetPath, `${origin}/`));
    assert.equal(response.status, 200, assetPath);
    const mime = response.headers.get('content-type');
    if (assetPath.endsWith('.css')) assert.match(mime, /^text\/css/, assetPath);
    if (assetPath.endsWith('.js')) assert.match(mime, /(?:text|application)\/javascript/, assetPath);
    if (/\.(?:jpg|jpeg|png|webp|svg)$/.test(assetPath)) assert.match(mime, /^image\//, assetPath);
    assert.ok((await response.arrayBuffer()).byteLength > 0, assetPath);
  }
  const catalogResponse = await fetch(`${origin}/assets/catalog.js`);
  assert.equal(catalogResponse.status, 200);
  assert.match(await catalogResponse.text(), /export const products/);
});

test('cada foto del catálogo real se sirve como imagen con contenido', async () => {
  for (const product of products) {
    for (const source of new Set([product.image, ...(product.gallery ?? []).map((image) => image.src)])) {
      const response = await fetch(new URL(source, `${origin}/`));
      assert.equal(response.status, 200, `${product.id}: ${source}`);
      assert.match(response.headers.get('content-type'), /^image\//, product.id);
      const bytes = new Uint8Array(await response.arrayBuffer());
      assert.ok(bytes.length > 100, `${product.id}: imagen vacía o demasiado pequeña`);
      if (/\.jpe?g$/.test(source)) assert.deepEqual([...bytes.slice(0, 3)], [0xff, 0xd8, 0xff]);
    }
  }
});

test('el documento contiene controles accesibles del catálogo, carrusel y alias', async () => {
  const html = await (await fetch(origin)).text();
  assert.match(html, /id=["']catalog-grid["']/);
  assert.match(html, /data-category=["']todos["']/);
  assert.match(html, /data-category=["']kits["']/);
  assert.match(html, /data-category=["']colorear["']/);
  assert.match(html, /id=["']product-gallery["']/);
  assert.match(html, /data-bs-target=["']#design-carousel["']/);
  assert.match(html, /id=["']copy-alias["']/);
  assert.match(html, /<dialog\b[^>]*id=["']payment-dialog["']/);
  assert.match(html, /aria-live=["']polite["']/);
  assert.doesNotMatch(html, /\baria_[a-z_]+=|\bdata_[a-z_]+=/, 'Los atributos HAML deben compilarse con guiones');
});

test('el HTML y la aplicación no publican precios ni iniciación de cobros', async () => {
  const html = await (await fetch(origin)).text();
  const app = await (await fetch(`${origin}/assets/app.js`)).text();
  assert.doesNotMatch(html, /\$\s*\d|(?:ARS|USD)\s*\d/i);
  assert.doesNotMatch(html, /<input\b[^>]*(?:amount|importe|price|precio)/i);
  assert.doesNotMatch(app, /api\/checkout|access_token|checkout\/preferences/i);
  assert.equal((await fetch(`${origin}/api/checkout`)).status, 404);
  const removedPaymentRoute = await fetch(`${origin}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"amount":1}' });
  assert.equal(removedPaymentRoute.status, 405);
  assert.equal(removedPaymentRoute.headers.get('allow'), 'GET, HEAD');
});

test('la comprobación de salud responde JSON y una ruta inexistente se rechaza', async () => {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  const body = await response.json();
  assert.equal(typeof body, 'object');
  assert.ok(body !== null);
  assert.doesNotMatch(JSON.stringify(body), /access_token|private|\.env|C:\\\\Users/i);
  assert.equal((await fetch(`${origin}/pagina-inexistente`)).status, 404);
});
