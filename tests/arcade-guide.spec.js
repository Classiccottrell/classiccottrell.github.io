import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { plain } from '../scripts/lib/html.mjs';
import { axeViolations } from './helpers.js';

const route = '/how-to/build-a-browser-arcade/';
const guide = JSON.parse(readFileSync(new URL('../data/arcade-guide.json', import.meta.url), 'utf8'));
const figures = guide.sections.filter((section) => section.figure).map((section) => section.figure);
const prompts = guide.sections.filter((section) => section.prompt).map((section) => section.prompt);

for (const width of [1440, 390]) {
  test(`published guide reads without overflow or accessibility violations at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(guide.title);
    await expect(page.getByText('How-to', { exact: true })).toBeVisible();
    await expect(page.getByText('Draft for review')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    for (const section of guide.sections) {
      await expect(page.locator(`#${section.id}-h`)).toHaveText(plain(section.heading));
    }
    await page.locator('#guide-skill').screenshot({ path: testInfo.outputPath(`download-${width}.png`), animations: 'disabled' });
    expect(figures.length).toBeGreaterThan(0);
    await expect(page.locator('.arcade-figure')).toHaveCount(figures.length);
    for (let i = 0; i < figures.length; i++) {
      const figure = page.locator('.arcade-figure').nth(i), image = figure.locator('img');
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
      await expect(image).toHaveAttribute('alt', figures[i].alt);
      await expect(image).toHaveAttribute('width', String(figures[i].width));
      await expect(image).toHaveAttribute('height', String(figures[i].height));
      await expect(image).toHaveAttribute('loading', 'lazy');
      await expect(image).toHaveAttribute('decoding', 'async');
      await expect(image).toHaveCSS('image-rendering', figures[i].kind === 'pixel' ? 'pixelated' : 'auto');
      await expect(figure.locator('figcaption')).toHaveText(plain(figures[i].caption));
      if (i === 0) await figure.screenshot({ path: testInfo.outputPath(`figure-${width}.png`), animations: 'disabled' });
      if (figures[i].src.endsWith('.png')) {
        await expect(figure.locator('a')).toHaveAttribute('aria-label', `Open full-size image: ${figures[i].alt}`);
        expect(await figure.locator('a').getAttribute('href')).toContain(figures[i].src);
      } else await expect(figure.locator('a')).toHaveCount(0);
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

test('skill ZIP downloads with portable installation and invocation instructions', async ({ page, request }) => {
  await page.goto(route);
  const download = page.getByRole('link', { name: 'Download the skill (ZIP)', exact: true });
  await expect(download).toHaveAttribute('download', guide.skill.filename);
  const response = await request.get(await download.getAttribute('href'));
  expect(response.status()).toBe(200);
  expect([...(await response.body()).subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  for (const instruction of guide.skill.install) await expect(page.locator('#guide-skill')).toContainText(plain(instruction));
  await expect(page.locator('#guide-skill pre code')).toHaveText(guide.skill.prompt);
  expect(guide.skill.install.join(' ')).toContain('build-browser-arcade');
  expect(guide.skill.install.join(' ')).not.toContain('/Users/');
  await expect(page.locator('[data-copy-prompt]')).toHaveCount(prompts.length);
});

test('published guide is in the sitemap and linked from Writing', async ({ page, request }) => {
  expect(await (await request.get('/sitemap.xml')).text()).toContain(route);
  await page.goto('/writing/');
  await expect(page.getByRole('link',{name:guide.title,exact:true})).toHaveAttribute('href',route);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all sections and prompts remain readable', async ({ page }) => {
    await page.goto(route);
    for (const section of guide.sections) await expect(page.locator(`#${section.id}-h`)).toHaveText(plain(section.heading));
    await expect(page.locator('.prompt-t')).toHaveCount(prompts.length);
    await expect(page.locator('[data-copy-prompt]').first()).toBeHidden();
    for (const text of prompts) await expect(page.locator('.prompt-t').filter({ hasText: text })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download the skill (ZIP)', exact: true })).toBeVisible();
    for (const figure of figures) {
      const image = page.getByAltText(figure.alt, { exact: true });
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
  });
});
