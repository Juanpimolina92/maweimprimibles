import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { products } from '../src/catalog.js';

const base = new URL('https://maweimprimibles.vercel.app/');
const root = new URL('../', import.meta.url);
const html = await readFile(new URL('dist/index.html', root), 'utf8');
const resources = new Set([
  './index.html',
  ...[...html.matchAll(/(?:src|href)=["'](\.\/assets\/[^"']+)["']/g)].map(match => match[1]),
  './assets/catalog.js',
  ...products.map(product => product.image),
]);
const checks = [];
const hash = data => createHash('sha256').update(data).digest('hex');

for (const resource of resources) {
  const response = await fetch(new URL(resource, base), { redirect: 'error', signal: AbortSignal.timeout(15000) });
  const body = Buffer.from(await response.arrayBuffer());
  const local = await readFile(new URL(resource.slice(2), new URL('dist/', root)));
  checks.push({ resource, status: response.status, type: response.headers.get('content-type'), sha256: hash(body), pass: response.ok && hash(body) === hash(local) });
}
const home = await fetch(base, { redirect: 'error', signal: AbortSignal.timeout(15000) });
checks.push({ resource: '/', status: home.status, pass: home.ok && (await home.text()) === html });
const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
for (const header of config.headers[0].headers) {
  const actual = home.headers.get(header.key);
  checks.push({ header: header.key, actual, pass: actual === header.value });
}
for (const resource of ['/.env', '/src/server.mjs', '/src/index.haml', '/reports/verification.md']) {
  const response = await fetch(new URL(resource, base), { redirect: 'error', signal: AbortSignal.timeout(15000) });
  checks.push({ resource, status: response.status, pass: response.status === 404 });
}
const report = { url: base.href, time: new Date().toISOString(), scope: 'Public static resources, matching local build, configured headers and private-path isolation; no payment or external attacks', checks, passed: checks.filter(check => check.pass).length, failed: checks.filter(check => !check.pass).length };
await writeFile(new URL('reports/live-verification.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: fileURLToPath(new URL('reports/live-verification.json', root)), passed: report.passed, failed: report.failed, failures: checks.filter(check => !check.pass) }, null, 2));
if (report.failed) process.exitCode = 1;
