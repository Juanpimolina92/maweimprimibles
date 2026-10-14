import { readFile, writeFile, mkdir, cp, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import haml from 'hamljs';
import * as sass from 'sass';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const dist = path.join(root, 'dist');
await mkdir(path.join(dist, 'assets', 'vendor'), { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });
const template = await readFile(path.join(root, 'src', 'index.haml'), 'utf8');
const html = haml.render(template, { filename: 'src/index.haml' });
await writeFile(path.join(dist, 'index.html'), html);
const css = sass.compile(path.join(root, 'src', 'styles.scss'), { style: 'compressed' });
await writeFile(path.join(dist, 'assets', 'styles.css'), css.css);
for (const file of ['app.js', 'catalog.js']) await copyFile(path.join(root, 'src', file), path.join(dist, 'assets', file));
for (const [moduleFile, destination] of [
  ['bootstrap/dist/css/bootstrap.min.css', 'bootstrap.min.css'],
  ['bootstrap/dist/js/bootstrap.bundle.min.js', 'bootstrap.bundle.min.js'],
  ['aos/dist/aos.css', 'aos.css'],
  ['aos/dist/aos.js', 'aos.js'],
]) await copyFile(require.resolve(moduleFile), path.join(dist, 'assets', 'vendor', destination));
console.log('Landing construida en dist/.');
