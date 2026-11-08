import { expect, test } from '@playwright/test';
import { axeViolations } from './helpers.js';

const bottom = (page) => page.locator('[data-cartridge]').evaluate(section => section.scrollIntoView({ block: 'center', behavior: 'instant' }));

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('arcade keeps project links available', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('[data-cartridge]');
    for (const slug of ['vpat-vault', 'linefield', 'terry-time']) {
      await expect(section.locator(`a[href="/work/${slug}/"]`)).toBeVisible();
    }
    await expect(section.locator('[data-cart-screen]')).toBeHidden();
    await expect(section.locator('[data-cart-expand]')).toBeHidden();
  });
});

test('arcade is home only and loads on intersection', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.locator('[data-cartridge]')).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('[data-cartridge] canvas')).toHaveCount(0);
  await bottom(page);
  await expect(page.locator('[data-cartridge] canvas')).toBeVisible();
  await expect(page.locator('[data-cart-screen]')).toHaveAttribute('data-music', 'idle');
  await expect(page.locator('[data-cart-mute]')).toBeDisabled();
  expect(await axeViolations(page)).toEqual([]);
});

test('expanded dialog retains sound and close controls, then restores focus', async ({ page }) => {
  await page.goto('/');
  await bottom(page);
  const button = page.locator('[data-cart-expand]');
  await button.click();
  const dialog = page.getByRole('dialog', { name: 'Game', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-cart-mute]')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close game', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
  await expect(page.locator('.cart-tools [data-cart-mute]')).toBeVisible();
});

test('mobile waits for a tap and keeps touch controls below the canvas', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await bottom(page);
  await expect(page.locator('[data-cartridge] canvas')).toHaveCount(0);
  await page.locator('[data-cart-poster]').click();
  await expect(page.locator('[data-cartridge] canvas')).toBeVisible();
  const canvas = await page.locator('[data-cartridge] canvas').boundingBox();
  const controls = await page.locator('.cc-touch-controls').boundingBox();
  expect(controls.y).toBeGreaterThanOrEqual(canvas.y + canvas.height - 1);
  await page.getByRole('button', { name: 'Close game', exact: true }).click();
  await expect(page.locator('[data-cart-expand]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-cartridge]')).toBeVisible();
  await context.close();
});

test('failed runtime import restores fallback links', async ({ page }) => {
  await page.route('**/assets/arcade/**/game.js*', (route) => route.abort());
  await page.goto('/');
  await bottom(page);
  await expect(page.locator('[data-cart-fallback]')).toBeVisible();
  await expect(page.locator('[data-cart-screen]')).toBeHidden();
});

test('release fills the browser width and reduced motion stays at a silent title until play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  const requests = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.goto('/');
  await bottom(page);
  const canvas = page.locator('[data-cart-screen] canvas');
  await expect(canvas).toBeVisible();
  await page.clock.runFor(30000);
  await expect(canvas).toHaveAttribute('data-stage', 'title');
  const width = await page.evaluate(() => innerWidth);
  const bounds = await canvas.boundingBox();
  expect(bounds.x).toBe(0);
  expect(bounds.width).toBe(width);
  expect(requests.filter(path => path.endsWith('.mp3'))).toEqual([]);
  expect(requests.filter(path => path.includes('/rooms/') && path.endsWith('.json'))).toEqual([]);
  await canvas.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cart-screen]')).toHaveAttribute('data-music', 'playing');
  expect(requests.some(path => path.endsWith('/audio/level-3-shadow-fortress.mp3'))).toBe(true);
  await page.locator('[data-cart-mute]').click();
  await expect(page.locator('[data-cart-screen]')).toHaveAttribute('data-music', 'muted');
});
