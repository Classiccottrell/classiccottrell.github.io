#!/usr/bin/env node
// Share cards: one 1200 × 630 PNG per page and per take, drawn in the site's
// own type and colours, for LinkedIn and other link previews. Committed to
// assets/cards/ like the rest of the build.
//
//   npm run cards
//
// Uses Playwright's Chromium. Set PW_CHROMIUM to use an installed Chromium.

import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, plain } from './lib/html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const site = json('data/site.json'), work = json('data/work.json'), takes = json('data/takes.json').filter((t) => !t.retired);
const drawings = json('data/drawings.json');
const pad2 = (n) => String(n).padStart(2, '0');

const CSS = `
@font-face{font-family:F;src:url(/assets/fonts/familjen-grotesk.woff2);font-weight:400 700}
@font-face{font-family:N;src:url(/assets/fonts/newsreader.woff2);font-weight:200 800}
@font-face{font-family:N;src:url(/assets/fonts/newsreader-italic.woff2);font-weight:200 800;font-style:italic}
@font-face{font-family:M;src:url(/assets/fonts/red-hat-mono.woff2);font-weight:300 700}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#fff;color:#0A0A0A;font-family:N}
.c{position:relative;width:1200px;height:630px;padding:56px 64px;display:flex;gap:48px}
.ink{background:#0A0A0A;color:#F2F1EE}
.t{flex:1;display:flex;flex-direction:column;min-width:0}
.k{font:500 17px/1.4 M;letter-spacing:.06em;text-transform:uppercase;color:#1B62A0}
.ink .k{color:#A4DDED}
h1{font:700 104px/.9 F;letter-spacing:-.045em;margin:22px 0 22px}
h1.m{font-size:76px;letter-spacing:-.035em}
h1.s{font-size:60px;line-height:.98;letter-spacing:-.03em}
p.s{font-size:30px;line-height:1.3;max-width:24ch}
.f{margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:3px solid currentColor;padding-top:16px;font:600 22px F}
.f span{font:500 16px M;letter-spacing:.06em;text-transform:uppercase;color:#1B62A0}
.ink .f span{color:#A4DDED}
.pic{width:430px;flex:none;align-self:center;border:4px solid #0A0A0A;background:#fff;position:relative}
.pic img{display:block;width:100%;height:440px;object-fit:cover;object-position:top}
.pic.drawing{border:0;background:none}.pic.drawing img{object-fit:contain;height:520px}
.pic::after{content:"";position:absolute;inset:-16px;background:
 linear-gradient(#A4DDED,#A4DDED) 0 0/12px 2px no-repeat,linear-gradient(#A4DDED,#A4DDED) 0 0/2px 12px no-repeat,
 linear-gradient(#A4DDED,#A4DDED) 100% 0/12px 2px no-repeat,linear-gradient(#A4DDED,#A4DDED) 100% 0/2px 12px no-repeat,
 linear-gradient(#A4DDED,#A4DDED) 0 100%/12px 2px no-repeat,linear-gradient(#A4DDED,#A4DDED) 0 100%/2px 12px no-repeat,
 linear-gradient(#A4DDED,#A4DDED) 100% 100%/12px 2px no-repeat,linear-gradient(#A4DDED,#A4DDED) 100% 100%/2px 12px no-repeat}
.pic.drawing::after{display:none}
.ink .pic.drawing img{mix-blend-mode:screen}
.heat{display:inline-flex;gap:5px;margin-left:16px;vertical-align:-2px}.heat i{width:16px;height:16px;border:2px solid currentColor}.heat i.f{background:currentColor}
.terry{position:absolute;right:64px;top:48px;width:92px;height:92px;background:currentColor;-webkit-mask:url(/assets/img/terry.svg) center/contain no-repeat}
`;

const foot = (right) => `<div class="f">${esc(site.name)}<span>${esc(right)}</span></div>`;
const card = ({ kicker, title, sub, size = '', img, drawing = false, ink = false, right = 'Product designer', terry = false }) => `<!doctype html>
<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="c${ink ? ' ink' : ''}">
  <div class="t">
    <p class="k">${kicker}</p>
    <h1 class="${size}">${esc(title)}</h1>
    ${sub ? `<p class="s">${esc(sub)}</p>` : ''}
    ${foot(right)}
  </div>
  ${img ? `<div class="pic${drawing ? ' drawing' : ''}"><img src="${esc(img)}" alt=""></div>` : ''}
  ${terry ? '<span class="terry"></span>' : ''}
</div></body></html>`;

const heat = (n) => `<span class="heat">${[1, 2, 3].map((i) => `<i${i <= n ? ' class="f"' : ''}></i>`).join('')}</span>`;
const kurtz = drawings.drawings.find((d) => d.slug === 'kurtz');

const cards = [
  ['home', card({ kicker: 'Product designer · Enterprise IT · Design systems', title: site.headline, size: 'm', img: site.portrait.ink, drawing: true })],
  ['work', card({ kicker: `Work · ${work.length} projects`, title: 'Work', sub: 'Products, systems, agents and tools, each with a title block and the take it proves.', terry: true })],
  ...work.map((p) => [`work-${p.slug}`, card({
    kicker: `Work / ${pad2(p.number)} · ${esc(p.kind)}`, title: plain(p.title), size: p.title.length > 14 ? 's' : 'm', sub: plain(p.summary),
    img: p.plate && p.plate.src, right: p.status.label, terry: !p.plate,
  })]),
  ['takes', card({ kicker: `Takes · ${takes.length}, with receipts`, title: 'Takes', sub: 'Opinions I’ll defend in a meeting, each backed by work you can check.', ink: true, terry: true })],
  ...takes.map((t) => [`take-${t.slug}`, card({ kicker: `${esc(t.id)}${heat(t.heat)}`, title: plain(t.text), size: 's', ink: true, right: 'Takes, with receipts' })]),
  ['work-with-me', card({ kicker: 'Work with me', title: 'Bring me a problem.', size: 'm', sub: `${site.availability.label}. Four ways in, and a brief that writes itself.`, terry: true })],
  ['writing', card({ kicker: 'Writing · on Substack', title: 'Writing', sub: 'Essays on design, AI, and the occasional roll of packing tape.', terry: true })],
  ['drawings', card({ kicker: `Drawings · ${drawings.drawings.length} portraits in ink`, title: 'Drawings', sub: 'One film, one face, one line of dialogue.', img: kurtz.image, drawing: true, ink: true })],
  ['about', card({ kicker: 'About', title: site.name, size: 'm', sub: site.headline, img: site.portrait.ink, drawing: true })],
  ['colophon', card({ kicker: 'Colophon', title: 'Colophon', sub: 'How this site is made, and a button that checks it.', terry: true })],
];

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let current = '';
await page.route('http://cards.local/**', (route) => {
  const url = new URL(route.request().url());
  if (url.pathname === '/card') return route.fulfill({ body: current, contentType: 'text/html' });
  return route.fulfill({ path: path.join(ROOT, decodeURIComponent(url.pathname)) });
});
mkdirSync(path.join(ROOT, 'assets/cards'), { recursive: true });
for (const [name, html] of cards) {
  current = html;
  await page.goto('http://cards.local/card');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  const file = path.join(ROOT, 'assets/cards', `${name}.png`);
  const info = await sharp(await page.screenshot()).png({ palette: true, colours: 128, compressionLevel: 9, effort: 10 }).toFile(file);
  console.log(`cards: ${name}.png ${Math.round(info.size / 1024)} KB`);
}
await browser.close();
