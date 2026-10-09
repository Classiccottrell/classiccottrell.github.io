#!/usr/bin/env node
// A small static server for local previews and the Playwright suite. It
// mirrors the two hosts: folders serve index.html, unknown paths get 404.html.
//
//   npm run serve            http://127.0.0.1:4173
//   PORT=8080 npm run serve

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  // Like Netlify: /about and /about/ both serve about.html ahead of
  // about/index.html, so a page and a folder must never share a name.
  const bare = file.replace(/[\\/]+$/, '');
  if (bare !== ROOT && existsSync(`${bare}.html`)) file = `${bare}.html`;
  else if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }).end(); return; }
    file = path.join(file, 'index.html');
  }
  // Like GitHub Pages: forms can't be posted to a static host.
  if (req.method === 'POST') { res.writeHead(405).end('Method Not Allowed'); return; }
  const found = existsSync(file) && statSync(file).isFile();
  const target = found ? file : path.join(ROOT, '404.html');
  res.writeHead(found ? 200 : 404, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(target));
}).listen(PORT, '127.0.0.1', () => console.log(`serve: http://127.0.0.1:${PORT}`));
