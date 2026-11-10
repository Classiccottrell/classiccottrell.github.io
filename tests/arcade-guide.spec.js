import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { plain } from '../scripts/lib/html.mjs';
import { axeViolations } from './helpers.js';

const route = '/how-to/build-a-browser-arcade/';
const guide = JSON.parse(readFileSync(new URL('../data/arcade-guide.json', import.meta.url), 'utf8'));
const prompts = guide.sections.filter((section) => section.prompt).map((section) => section.prompt);

for (const width of [1440, 390]) {
  test(`draft guide reads without overflow or accessibility violations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(guide.title);
    await expect(page.getByText('How-to · Draft for review', { exact: true })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    for (const section of guide.sections) {
      await expect(page.locator(`#${section.id}-h`)).toHaveText(plain(section.heading));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await axeViolations(page)).toEqual([]);
  });
}

test('copy buttons copy prompt text only', async ({ page }) => {
  await page.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text) => { window.__copied.push(text); return Promise.resolve(); } } });
  });
  await page.goto(route);
  const buttons = page.locator('[data-copy-prompt]');
  await expect(buttons).toHaveCount(prompts.length);
  expect(prompts.length).toBeGreaterThan(0);
  for (let i = 0; i < prompts.length; i++) {
    await buttons.nth(i).click();
    await expect(buttons.nth(i).locator('xpath=following-sibling::*[@role="status"]')).toHaveText('Copied');
  }
  expect(await page.evaluate(() => window.__copied)).toEqual(prompts);
});

test('draft remains outside the sitemap and public indexes', async ({ page, request }) => {
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain(route);
  for (const path of ['/', '/writing/']) {
    await page.goto(path);
    await expect(page.locator(`a[href="${route}"]`)).toHaveCount(0);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all sections and prompts remain readable', async ({ page }) => {
    await page.goto(route);
    for (const section of guide.sections) await expect(page.locator(`#${section.id}-h`)).toHaveText(plain(section.heading));
    await expect(page.locator('.prompt-t')).toHaveCount(prompts.length);
    await expect(page.locator('[data-copy-prompt]').first()).toBeHidden();
    for (const text of prompts) await expect(page.locator('.prompt-t').filter({ hasText: text })).toBeVisible();
  });
});
