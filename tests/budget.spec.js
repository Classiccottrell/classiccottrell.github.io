// Weight and stability gates from the roadmap.
import { expect, test } from '@playwright/test';
import { statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { CARDS } from './helpers.js';

const TEXT = /text\/|javascript|json|xml|svg/;

test('the drawings page transfers under 400 KB, with no layout shift', async ({ page }) => {
  let bytes = 0;
  page.on('response', async (res) => {
    if (res.request().resourceType() === 'document' && res.status() >= 300) return;
    const body = await res.body().catch(() => Buffer.alloc(0));
    // Both hosts compress text; images and fonts are already compressed.
    bytes += TEXT.test(res.headers()['content-type'] || '') ? gzipSync(body).length : body.length;
  });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/drawings/');
  for (let y = 0; y < 6000; y += 600) await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForLoadState('networkidle');
  expect(bytes / 1024).toBeLessThan(400);
  expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.02);
});

test('every image is described or marked decorative', async ({ page }) => {
  for (const path of ['/', '/drawings/', '/writing/', '/work/linefield/', '/about/']) {
    await page.goto(path);
    expect(await page.locator('img:not([alt])').count(), path).toBe(0);
  }
});

test('every page has a share card under 200 KB', async () => {
  for (const name of CARDS) {
    const size = statSync(new URL(`../assets/cards/${name}.png`, import.meta.url)).size;
    expect(size, name).toBeLessThan(200 * 1024);
  }
});
