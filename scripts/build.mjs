import { readFile, writeFile, mkdir, cp, copyFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import haml from 'hamljs';
import * as sass from 'sass';
import { build } from 'esbuild';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const dist = path.join(root, 'dist');
await mkdir(path.join(dist, 'assets', 'vendor'), { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });
const template = await readFile(path.join(root, 'src', 'index.haml'), 'utf8');
const serverBundle = await build({ entryPoints: [path.join(root, 'src', 'hero.jsx')], bundle: true, platform: 'node', format: 'esm', write: false, packages: 'external', jsx: 'automatic' });
const serverFile = path.join(root, 'scripts', `hero-ssr-${randomUUID()}.mjs`);
let heroMarkup;
await writeFile(serverFile, serverBundle.outputFiles[0].text, { flag: 'wx' });
try {
  const { default: HeroScene } = await import(pathToFileURL(serverFile).href);
  heroMarkup = renderToString(React.createElement(HeroScene));
} finally {
  await unlink(serverFile);
}
const html = haml.render(template, { filename: 'src/index.haml', locals: { heroMarkup } });
await writeFile(path.join(dist, 'index.html'), html);
const css = sass.compile(path.join(root, 'src', 'styles.scss'), { style: 'compressed' });
await writeFile(path.join(dist, 'assets', 'styles.css'), css.css);
await build({ entryPoints: [path.join(root, 'src', 'hero-client.jsx')], outfile: path.join(dist, 'assets', 'hero.js'), bundle: true, format: 'esm', platform: 'browser', minify: true, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'linked' });
for (const file of ['app.js', 'catalog.js', 'card-motion.js', 'hero-motion.js']) await copyFile(path.join(root, 'src', file), path.join(dist, 'assets', file));
for (const [moduleFile, destination] of [
  ['bootstrap/dist/css/bootstrap.min.css', 'bootstrap.min.css'],
  ['bootstrap/dist/js/bootstrap.bundle.min.js', 'bootstrap.bundle.min.js'],
  ['aos/dist/aos.css', 'aos.css'],
  ['aos/dist/aos.js', 'aos.js'],
]) await copyFile(require.resolve(moduleFile), path.join(dist, 'assets', 'vendor', destination));
await mkdir(path.join(dist, 'assets', 'fonts'), { recursive: true });
for (const style of ['normal', 'italic']) await copyFile(require.resolve(`@fontsource-variable/fraunces/files/fraunces-latin-full-${style}.woff2`), path.join(dist, 'assets', 'fonts', `fraunces-${style}.woff2`));
await copyFile(require.resolve('@fontsource-variable/fraunces/LICENSE'), path.join(dist, 'assets', 'fonts', 'LICENSE.txt'));

// Keep a ready-to-publish entry point in Git as well as the isolated Vercel output.
await copyFile(path.join(dist, 'index.html'), path.join(root, 'index.html'));
await cp(path.join(dist, 'assets'), path.join(root, 'assets'), { recursive: true });
console.log('Landing construida en dist/ y exportada a index.html + assets/.');
