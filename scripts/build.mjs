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

// House style in the copy: curly apostrophes and Canadian spelling. Text in
// `code` is exempt, so terminal terms like `256-color` stay as they are.
const US_SPELLING = /\b(colors?|colored|coloring|behaviors?|behavioral|labeling|labeled|dialed|favorites?|gray|centers?|centered|catalogs?|maths)\b/i;
const prose = (v) => (typeof v === 'string' ? (/^(https?:|\/)/.test(v) ? [] : [v.replace(/`[^`]*`/g, '')])
  : v && typeof v === 'object' ? Object.values(v).flatMap(prose) : []);
for (const key of ['site', 'work', 'takes', 'rules', 'writing', 'drawings', 'hire']) {
  for (const text of prose(ctx[key])) {
    const straight = text.match(/\w'\w/), us = text.match(US_SPELLING);
    if (straight) fail(`data/${key}.json has a straight apostrophe ("${straight[0]}"); use ’`);
    if (us) fail(`data/${key}.json uses US spelling "${us[0]}"; this site writes Canadian English`);
  }
}

// ---------------------------------------------------------------- generated assets
const outputs = new Map(); // repo path -> string | Buffer

// Vendored files: copied from their sources so they can be updated in one place.
const axeSrc = path.join(ROOT, 'node_modules/axe-core/axe.min.js');
if (existsSync(axeSrc)) outputs.set('assets/vendor/axe.min.js', readFileSync(axeSrc));
// linefield pieces: the baked export, tuned the way the control panel would,
// plus one line that holds the piece still under reduced motion (site.js also
// pauses it while it's off screen).
// The piece repaints its own ground every frame, so it is given the band's
// colour in each scheme (read from site.css) and meets the band with no seam.
const TUNING = { 'grain-field.html': { density: 1.8 } };
const siteCss = read('assets/css/site.css');
const bandOf = (css) => (css.match(/--band:\s*(#[0-9a-fA-F]{6})/) || [])[1];
const BAND = { light: bandOf(siteCss), dark: bandOf(siteCss.slice(siteCss.indexOf('@media (prefers-color-scheme:dark)'))) };
if (!BAND.light || !BAND.dark) fail('site.css: could not read --band for both schemes');
ctx.band = BAND;
const GROUND_PAINT = "ctx.fillStyle = values.invert ? '#f2f2f4' : '#0a0a0d';";
const GROUND_CSS = 'html, body { margin: 0; height: 100%; background: #0a0a0d; overflow: hidden; }';
for (const name of readdirSync(path.join(ROOT, 'source/linefield')).filter((f) => f.endsWith('.html'))) {
  let raw = read(`source/linefield/${name}`);
  if (raw.split(GROUND_PAINT).length !== 2 || raw.split(GROUND_CSS).length !== 2) fail(`source/linefield/${name}: its ground paint has changed; update the band-colour bake in build.mjs`);
  raw = raw.replace(GROUND_PAINT, "ctx.fillStyle = values.invert ? '#f2f2f4' : (window.__LF_GROUND__ || '#0a0a0d');")
    .replace(GROUND_CSS, `html, body { margin: 0; height: 100%; background: ${BAND.light}; overflow: hidden; }\n  @media (prefers-color-scheme: dark) { html, body { background: ${BAND.dark}; } }`);
  const marker = '<script>window.__LF_BAKED_VALUES__ = ';
  const i = raw.indexOf(marker);
  if (i < 0) fail(`source/linefield/${name} is not a baked linefield export`);
  const end = raw.indexOf('</script>', i);
  const shim = `\nObject.assign(window.__LF_BAKED_VALUES__, ${JSON.stringify(TUNING[name] || {})});`
    + "\nif(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){window.__LF_BAKED_VALUES__.speed=0;}"
    + `\n(function(){var q=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)');var g=function(){window.__LF_GROUND__=q&&q.matches?'${BAND.dark}':'${BAND.light}';};g();if(q&&q.addEventListener)q.addEventListener('change',g);})();`;
  outputs.set(`assets/linefield/${name}`, raw.slice(0, end) + shim + raw.slice(end));
}

const css = read('assets/css/site.css');
const js = read('assets/js/site.js');
ctx.assets = { css: hash(css), js: hash(js), terry: hash(read('assets/js/terry-symbols.js')) };

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
// Inline links in the data, [label](/path/), have to land on a page this build writes.
const routes = new Set(pages.map(([f]) => `/${f.replace(/index\.html$/, '')}`));
const linksIn = (v) => (typeof v === 'string' ? [...v.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1])
  : v && typeof v === 'object' ? Object.values(v).flatMap(linksIn) : []);
for (const key of ['site', 'work', 'takes', 'rules', 'writing', 'drawings', 'hire']) {
  for (const href of linksIn(ctx[key])) if (!routes.has(href.split('#')[0])) fail(`data/${key}.json links to missing ${href}`);
}
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
// No writing.html stub: it would hide writing/ (see below). Netlify 301s the
// old address, and the 404 page forwards it on GitHub Pages.

const indexable = pages.map(([f]) => f).filter((f) => f !== '404.html' && !f.includes('thanks'));
outputs.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((f) => `  <url><loc>${ctx.site.url}/${f.replace(/index\.html$/, '')}</loc></url>`).join('\n')}
</urlset>
`);
outputs.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ctx.site.url}/sitemap.xml\n`);

// A page and a folder can't share a name. Netlify serves x.html for both /x
// and /x/, so x/index.html would never be reached (this once looped /writing/).
for (const file of outputs.keys()) {
  const dir = file.match(/^(.+)\/index\.html$/);
  if (dir && (outputs.has(`${dir[1]}.html`) || existsSync(path.join(ROOT, `${dir[1]}.html`)))) fail(`${dir[1]}.html would hide ${file} on Netlify; remove one of them`);
}

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
