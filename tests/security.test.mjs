import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../src/server.mjs';

let fixture;
let publicRoot;
let server;
let port;
const page = '<!doctype html><html lang="es"><body>Catálogo público de Marieta</body></html>';
const privateSentinel = 'PRIVATE_REVIEW_SENTINEL_DO_NOT_SERVE';

async function start(options = {}) {
  const instance = createServer({ rootDir: publicRoot, rateLimit: 1000, ...options });
  instance.listen(0, '127.0.0.1');
  await once(instance, 'listening');
  return instance;
}

async function close(instance) {
  if (!instance?.listening) return;
  const closed = once(instance, 'close');
  instance.close();
  instance.closeAllConnections();
  await closed;
}

function requestRaw(requestPath, { method = 'GET', headers = {}, body, requestPort = port } = {}) {
  return new Promise((resolve, reject) => {
    const framedHeaders = body === undefined ? headers : { 'Content-Length': Buffer.byteLength(body), ...headers };
    const request = http.request({ hostname: '127.0.0.1', port: requestPort, path: requestPath, method, headers: framedHeaders }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(5000, () => request.destroy(new Error('Local security request timed out')));
    request.end(body);
  });
}

before(async () => {
  fixture = await mkdtemp(path.join(os.tmpdir(), 'mawe-security-'));
  publicRoot = path.join(fixture, 'dist');
  await mkdir(path.join(publicRoot, 'assets'), { recursive: true });
  await mkdir(path.join(publicRoot, 'assets', 'vendor'), { recursive: true });
  await mkdir(path.join(fixture, 'src'), { recursive: true });
  await writeFile(path.join(publicRoot, 'index.html'), page);
  await writeFile(path.join(publicRoot, 'assets', 'app.js'), 'export const safe = true;');
  await writeFile(path.join(publicRoot, 'assets', 'vendor', 'plugin.bundle.min.js'), 'window.vendorSafe = true;');
  await writeFile(path.join(fixture, '.env'), privateSentinel);
  await writeFile(path.join(fixture, 'src', 'server.mjs'), privateSentinel);
  await writeFile(path.join(fixture, 'private.html'), privateSentinel);
  server = await start();
  port = server.address().port;
});

after(async () => {
  await close(server);
  // mkdtemp returned this dedicated directory; never remove the project checkout.
  if (fixture && path.resolve(fixture).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(fixture).startsWith('mawe-security-')) {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('HTML y JavaScript reciben protección contra ejecución externa y MIME sniffing', async () => {
  for (const route of ['/', '/assets/app.js', '/ruta-que-no-existe']) {
    const response = await requestRaw(route);
    assert.equal(response.headers['x-content-type-options'], 'nosniff', route);
    assert.equal(response.headers['x-frame-options'], 'DENY', route);
    assert.match(response.headers['content-security-policy'], /script-src 'self'(?:;|$)/, route);
    assert.match(response.headers['content-security-policy'], /object-src 'none'/, route);
    assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/, route);
    assert.match(response.headers['content-security-policy'], /base-uri 'none'/, route);
    assert.equal(response.headers['access-control-allow-origin'], undefined, route);
  }
});

test('HEAD expone metadatos del recurso sin descargar el cuerpo', async () => {
  const response = await requestRaw('/', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(response.body, '');
  assert.equal(Number(response.headers['content-length']), Buffer.byteLength(page));
});

test('el límite de rutas permite nombres vendor con puntos internos sin permitir archivos ocultos', async () => {
  const response = await requestRaw('/assets/vendor/plugin.bundle.min.js');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /^text\/javascript/);
  assert.equal(response.body, 'window.vendorSafe = true;');
  for (const route of ['/assets/vendor/.private.js', '/assets/vendor/../app.js', '/assets/vendor/plugin.bundle.min.js.map']) {
    assert.equal((await requestRaw(route)).status, 404, route);
  }
});

test('rutas raw con traversal no exponen archivos fuera de dist', async () => {
  const routes = [
    '/../private.html', '/assets/../../private.html', '/assets/../index.html',
    '/%2e%2e/private.html', '/assets/%2e%2e/%2e%2e/private.html',
    '/assets/..%2f..%2fprivate.html', '/assets/%2E%2E%5C%2E%2E%5Cprivate.html',
    '/%252e%252e/private.html', '/assets/C:/private.html',
  ];
  for (const route of routes) {
    const response = await requestRaw(route);
    assert.equal(response.status, 404, route);
    assert.doesNotMatch(response.body, new RegExp(privateSentinel), route);
  }
});

test('archivos de entorno, fuentes privadas y rutas de cobro están fuera del servidor público', async () => {
  for (const route of ['/.env', '/.git/config', '/src/server.mjs', '/package.json', '/private/orders.json', '/api/config', '/api/checkout', '/assets/app.js.map']) {
    const response = await requestRaw(route);
    assert.equal(response.status, 404, route);
    assert.doesNotMatch(response.body, new RegExp(privateSentinel), route);
    assert.doesNotMatch(response.body, /access_token|C:\\Users|OPENAI_API_KEY/i, route);
  }
});

test('rutas mal codificadas y bytes de control se rechazan sin filtrar errores internos', async () => {
  for (const route of ['/assets/%', '/%E0%A4%A', '/%C0%AE', '/assets/app.js%00', '/assets/app.js%0a']) {
    const response = await requestRaw(route);
    assert.ok([400, 404].includes(response.status), route);
    assert.doesNotMatch(response.body, /(?:Error:|at createServer|node:|C:\\|PRIVATE_REVIEW)/, route);
  }
  assert.equal((await requestRaw('/api/health')).status, 200);
});

test('datos XSS de la query y del origen no se reflejan ni modifican la página', async () => {
  const response = await requestRaw('/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E', { headers: { Origin: 'https://attacker.example', 'X-Forwarded-Host': 'attacker.example' } });
  assert.equal(response.status, 200);
  assert.equal(response.body, page);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.equal(response.headers.location, undefined);
});

test('métodos que podrían iniciar escrituras se rechazan y no habilitan cobros', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE']) {
    const response = await requestRaw('/api/checkout', { method, headers: { 'Content-Type': 'application/json' }, body: '{"amount":1,"alias":"attacker"}' });
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.allow, 'GET, HEAD', method);
    assert.equal(response.headers.location, undefined, method);
  }
  assert.equal((await requestRaw('/')).body, page);
});

test('el límite por IP no acepta X-Forwarded-For como identidad y recupera al caducar la ventana', async () => {
  const limited = await start({ rateLimit: 2, rateWindowMs: 180 });
  const requestPort = limited.address().port;
  try {
    assert.equal((await requestRaw('/', { requestPort, headers: { 'X-Forwarded-For': '192.0.2.1' } })).status, 200);
    assert.equal((await requestRaw('/', { requestPort, headers: { 'X-Forwarded-For': '192.0.2.2' } })).status, 200);
    const blocked = await requestRaw('/', { requestPort, headers: { 'X-Forwarded-For': '192.0.2.3' } });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers['retry-after']) >= 1);
    await new Promise((resolve) => setTimeout(resolve, 230));
    assert.equal((await requestRaw('/', { requestPort })).status, 200);
  } finally {
    await close(limited);
  }
});
