#!/usr/bin/env node
// Contact sheet: every page at 390, 768 and 1440 px, in both polarities, laid
// side by side so the whole site can be checked at a glance before a launch.
// Writes contact-sheet/<polarity>-<width>.png (git-ignored).
//
//   npm run contact-sheet
//
// Uses Playwright's Chromium. Set PW_CHROMIUM to use an installed Chromium.

import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'contact-sheet');
const json = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const PAGES = ['/', '/work/', ...json('data/work.json').map((p) => `/work/${p.slug}/`), '/takes/', '/takes/mood-board/', '/work-with-me/', '/writing/', '/drawings/', '/about/', '/colophon/', '/404.html'];
const THUMB = 320, MAX_H = 2400;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
mkdirSync(OUT, { recursive: true });
for (const scheme of ['light', 'dark']) {
  for (const width of [390, 768, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
    await ctx.route('http://site.local/**', (route) => {
      let file = path.join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
      if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
      return route.fulfill({ path: existsSync(file) ? file : path.join(ROOT, '404.html') });
    });
    const page = await ctx.newPage();
    const tiles = [];
    for (const p of PAGES) {
      await page.goto(`http://site.local${p}`, { waitUntil: 'networkidle' });
      const full = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < full; y += 800) await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const shot = await page.screenshot({ fullPage: true });
      const scaled = await sharp(shot).resize({ width: THUMB }).png().toBuffer();
      const h = Math.min(MAX_H, (await sharp(scaled).metadata()).height);
      tiles.push(await sharp(scaled).extract({ left: 0, top: 0, width: THUMB, height: h }).png().toBuffer());
    }
    const heights = await Promise.all(tiles.map(async (t) => (await sharp(t).metadata()).height));
    const file = path.join(OUT, `${scheme}-${width}.png`);
    await sharp({ create: { width: tiles.length * (THUMB + 24) + 24, height: Math.max(...heights) + 48, channels: 3, background: '#9a9a9a' } })
      .composite(tiles.map((input, i) => ({ input, left: 24 + i * (THUMB + 24), top: 24 }))).png().toFile(file);
    console.log(`contact-sheet: ${path.relative(ROOT, file)} (${tiles.length} pages)`);
    await ctx.close();
  }
}
await browser.close();
