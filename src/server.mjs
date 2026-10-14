import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

export function createServer({ rootDir = path.join(projectRoot, 'dist'), rateLimit = 120, rateWindowMs = 60000 } = {}) {
  const root = path.resolve(rootDir);
  const visitors = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cache-Control', 'no-cache');
    const reply = (status, message) => {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      req.resume();
      res.setHeader('Allow', 'GET, HEAD');
      return reply(405, 'Método no permitido.');
    }
    const now = Date.now();
    const address = req.socket.remoteAddress;
    let visitor = visitors.get(address);
    if (!visitor || now - visitor.start >= rateWindowMs) {
      if (visitors.size >= 10000) {
        for (const [key, value] of visitors) if (now - value.start >= rateWindowMs) visitors.delete(key);
        if (visitors.size >= 10000) return reply(503, 'Intentá nuevamente en un momento.');
      }
      visitor = { start: now, count: 0 };
      visitors.set(address, visitor);
    }
    if (++visitor.count > rateLimit) {
      res.setHeader('Retry-After', String(Math.ceil((rateWindowMs - (now - visitor.start)) / 1000)));
      return reply(429, 'Intentá nuevamente en un momento.');
    }
    let pathname;
    try {
      // Decode before URL normalization so ../ attacks cannot turn into a valid resource.
      pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch { return reply(400, 'Ruta inválida.'); }
    if (!pathname.startsWith('/') || /[\\\u0000-\u001f\u007f]/u.test(pathname) || pathname.split('/').some(part => part.startsWith('.')) || pathname.includes(':')) {
      return reply(404, 'No encontrado.');
    }
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok' }));
    }
    if (pathname !== '/' && pathname !== '/index.html' && !/^\/assets\/[a-zA-Z0-9_\-/.]+$/.test(pathname)) return reply(404, 'No encontrado.');
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) return reply(404, 'No encontrado.');
    const type = mime[path.extname(filename).toLowerCase()];
    if (!type) return reply(404, 'No encontrado.');
    try {
      const info = await stat(filename);
      if (!info.isFile()) return reply(404, 'No encontrado.');
      const body = req.method === 'HEAD' ? null : await readFile(filename);
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': info.size });
      res.end(body);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return reply(404, 'No encontrado.');
      return reply(500, 'No se pudo cargar el recurso.');
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un puerto válido.');
  const host = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.listen(port, host, () => console.log(`Marieta lista en http://${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
}
