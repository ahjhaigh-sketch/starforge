// Folds dist-single/ into one file: every script and stylesheet the page links goes inline, and
// files from public/ (the favicon) become data URIs. Writes dist-single/Starforge-<version>.html.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-single';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
let html = readFileSync(join(dir, 'index.html'), 'utf8');
const read = (href) => readFileSync(join(dir, href.replace(/^\.\//, '')), 'utf8');

// scripts: a module script can't hold "</script" literally, so break it up
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => `<script type="module">${read(src).replace(/<\/script/gi, '<\\/script')}</script>`);
// stylesheets
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`);
// icons from public/: inline what exists, drop the rest (no manifest: a file can't be installed)
html = html.replace(/<link rel="(icon|apple-touch-icon)"[^>]*href="([^"]+)"[^>]*>/g, (tag, rel, href) => {
  const file = join(dir, href.replace(/^\.\//, ''));
  if (!existsSync(file)) return '';
  const type = href.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  return `<link rel="${rel}" href="data:${type};base64,${readFileSync(file).toString('base64')}">`;
});
html = html.replace(/<link rel="manifest"[^>]*>/g, '');

const left = html.match(/(src|href)="\.\/assets\/[^"]+"/g);
if (left) throw new Error(`still linked: ${left.join(', ')}`);
const out = join(dir, `Starforge-${version}.html`);
writeFileSync(out, html);
console.log(`${out}: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
