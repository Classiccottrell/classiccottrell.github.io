#!/usr/bin/env node
// Builds the whole site from data/*.json into static HTML, committed to the
// repo so GitHub Pages and Netlify can serve it as-is. No framework, no bundler.
//
//   node scripts/build.mjs          write every page
//   node scripts/build.mjs --check  exit non-zero if anything committed is stale

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { checkContrast, ratio } from './check-contrast.mjs';
import * as P from './lib/pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);

const files = (dir) => readdirSync(path.join(ROOT, dir), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const bytes = (list) => list.reduce((s, f) => s + statSync(path.join(ROOT, f)).size, 0);

// ---------------------------------------------------------------- data
const ctx = {
  site: json('data/site.json'),
  work: json('data/work.json').sort((a, b) => a.number - b.number),
  takes: json('data/takes.json'),
  rules: json('data/rules.json'),
  writing: json('data/writing.json'),
  drawings: json('data/drawings.json'),
  hire: json('data/hire.json'),
  year: 2026,
};
ctx.ratio = ratio;

// Data sanity: every reference has to land somewhere.
const slugs = new Set(ctx.work.map((p) => p.slug));
const fail = (msg) => { console.error(`build: ${msg}`); process.exit(1); };
for (const p of ctx.work) if (p.take && !ctx.takes.some((t) => t.id === p.take)) fail(`${p.slug} cites missing take ${p.take}`);
for (const t of ctx.takes) for (const s of t.sources) if (s.href.startsWith('/work/') && s.href !== '/work/' && !slugs.has(s.href.split('/')[2])) fail(`${t.id} links to missing ${s.href}`);
for (const r of ctx.rules) if (!slugs.has(r.href.split('/')[2])) fail(`${r.id} links to missing ${r.href}`);

// ---------------------------------------------------------------- generated assets
const outputs = new Map(); // repo path -> string | Buffer

// Vendored files: copied from their sources so they can be updated in one place.
const axeSrc = path.join(ROOT, 'node_modules/axe-core/axe.min.js');
if (existsSync(axeSrc)) outputs.set('assets/vendor/axe.min.js', readFileSync(axeSrc));
// linefield pieces: the baked export, tuned the way the control panel would,
// plus one line that holds the piece still under reduced motion (site.js also
// pauses it while it's off screen).
const TUNING = { 'grain-field.html': { density: 1.8 } };
for (const name of readdirSync(path.join(ROOT, 'source/linefield')).filter((f) => f.endsWith('.html'))) {
  const raw = read(`source/linefield/${name}`);
  const marker = '<script>window.__LF_BAKED_VALUES__ = ';
  const i = raw.indexOf(marker);
  if (i < 0) fail(`source/linefield/${name} is not a baked linefield export`);
  const end = raw.indexOf('</script>', i);
  const shim = `\nObject.assign(window.__LF_BAKED_VALUES__, ${JSON.stringify(TUNING[name] || {})});`
    + "\nif(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){window.__LF_BAKED_VALUES__.speed=0;}";
  outputs.set(`assets/linefield/${name}`, raw.slice(0, end) + shim + raw.slice(end));
}

const css = read('assets/css/site.css');
const js = read('assets/js/site.js');
ctx.assets = { css: hash(css), js: hash(js) };

const contrast = checkContrast();
if (contrast.failures.length) fail(`contrast below 4.5:1: ${contrast.failures.map((p) => p.name).join(', ')}`);
ctx.contrast = contrast;

const images = files('assets/img');
const fonts = files('assets/fonts').filter((f) => f.endsWith('.woff2'));

// ---------------------------------------------------------------- pages
const pages = [
  ['index.html', () => P.home(ctx)],
  ['work/index.html', () => P.workIndex(ctx)],
  ...ctx.work.map((p) => [`work/${p.slug}/index.html`, () => P.caseStudy(ctx, p)]),
  ['takes/index.html', () => P.takesIndex(ctx)],
  ...ctx.takes.filter((t) => !t.retired).map((t) => [`takes/${t.slug}/index.html`, () => P.takePage(ctx, t)]),
  ['work-with-me/index.html', () => P.hire(ctx)],
  ['work-with-me/thanks/index.html', () => P.thanks(ctx)],
  ['writing/index.html', () => P.writingPage(ctx)],
  ['drawings/index.html', () => P.drawingsPage(ctx)],
  ['about/index.html', () => P.about(ctx)],
  ['colophon/index.html', () => P.colophon(ctx)],
  ['404.html', () => P.notFound(ctx)],
];
ctx.stats = {
  pages: pages.length,
  cssLines: css.split('\n').length,
  cssGzip: gzipSync(css).length,
  jsGzip: gzipSync(js).length,
  fonts: bytes(fonts),
  images: images.length,
  imageBytes: bytes(images),
  pairs: contrast.all.length,
  minRatio: contrast.min,
};
for (const [file, render] of pages) outputs.set(file, render());

// Old addresses keep working.
const legacy = Object.fromEntries(ctx.work.flatMap((p) => p.legacyIds.map((id) => [id, `/work/${p.slug}/`])));
outputs.set('projects.html', P.moved(ctx, '/work/', legacy));
outputs.set('art.html', P.moved(ctx, '/drawings/'));
outputs.set('writing.html', P.moved(ctx, '/writing/'));

const indexable = pages.map(([f]) => f).filter((f) => f !== '404.html' && !f.includes('thanks'));
outputs.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((f) => `  <url><loc>${ctx.site.url}/${f.replace(/index\.html$/, '')}</loc></url>`).join('\n')}
</urlset>
`);
outputs.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ctx.site.url}/sitemap.xml\n`);

// ---------------------------------------------------------------- write or check
const stale = [];
for (const [file, content] of outputs) {
  const target = path.join(ROOT, file);
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const same = existsSync(target) && readFileSync(target).equals(next);
  if (same) continue;
  if (CHECK) { stale.push(file); continue; }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, next);
  console.log(`build: wrote ${file}`);
}
if (CHECK) {
  if (stale.length) {
    console.error(`build --check: out of date: ${stale.join(', ')}\nRun \`npm run build\` and commit the result.`);
    process.exit(1);
  }
  console.log(`build --check: all ${outputs.size} files in sync.`);
} else {
  console.log(`build: ${outputs.size} files, ${pages.length} pages, contrast lowest ${contrast.min.toFixed(2)}:1`);
}
