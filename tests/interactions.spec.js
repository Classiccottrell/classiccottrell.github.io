// The optional layer: each interactive piece does what it says.
import { expect, test } from '@playwright/test';
import { takes } from './helpers.js';

test('hot takes rotate on demand and pause', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('[data-stage]');
  await expect(stage.locator('[data-stage-n]')).toHaveText(takes[0].id);
  await stage.locator('[data-stage-next]').click();
  await expect(stage.locator('[data-stage-n]')).toHaveText(takes[1].id);
  await expect(stage.locator('[data-stage-text]')).toHaveAttribute('href', `/takes/${takes[1].slug}/`);
  await stage.locator('[data-stage-prev]').click();
  await stage.locator('[data-stage-prev]').click();
  await expect(stage.locator('[data-stage-n]')).toHaveText(takes[takes.length - 1].id);
  const play = stage.locator('[data-stage-play]');
  const before = await play.textContent();
  await play.click();
  await expect(play).not.toHaveText(before);
});

test('take it apart follows the slider and the button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#xv').scrollIntoViewIfNeeded();
  await page.locator('#explode').fill('30');
  await expect(page.locator('output[for="explode"]')).toHaveText('30%');
  expect(await page.locator('#xv').evaluate((el) => el.style.getPropertyValue('--x'))).toBe('0.300');
  await page.locator('#explode-btn').click();
  await expect(page.locator('#explode')).toHaveValue('100');
  await expect(page.locator('#explode-btn')).toHaveText('Put it back');
});

// Nothing on the page moves when a control changes its own label or a take
// rotates in: the widths where it used to (393 and 1024) are tested.
test('the hot takes band keeps its height and its buttons stay put', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/');
  const stage = page.locator('[data-stage]'), next = stage.locator('[data-stage-next]');
  await page.evaluate(() => document.fonts.ready);
  const height = (await stage.boundingBox()).height;
  for (let i = 0; i < takes.length; i++) {
    await next.click();
    expect((await stage.boundingBox()).height).toBe(height);
  }
  const x = (await next.boundingBox()).x;
  await stage.locator('[data-stage-play]').click();
  expect((await next.boundingBox()).x).toBe(x);
});

test('take it apart keeps its layout when the button label changes', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const legend = page.locator('.xv-legend');
  await page.locator('#explode').fill('40');
  const y = (await legend.boundingBox()).y;
  await page.locator('#explode').fill('60');
  await expect(page.locator('#explode-btn')).toHaveText('Put it back');
  expect((await legend.boundingBox()).y).toBe(y);
});

test('the case-study breadcrumb can be clicked above the big title', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/work/forma/');
  await page.locator('.ph .note a[href="/work/"]').click();
  await expect(page).toHaveURL(/\/work\/$/);
});

test('the phone menu closes when focus moves past it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.menu summary').click();
  await expect(page.locator('.menu')).toHaveAttribute('open', '');
  const links = await page.locator('.menu-panel a').count();
  for (let i = 0; i <= links; i++) await page.keyboard.press('Tab');
  await expect(page.locator('.menu')).not.toHaveAttribute('open', '');
});

test('hot takes stay quiet while they rotate and speak when a person moves them', async ({ page }) => {
  await page.goto('/');
  const live = page.locator('[data-stage-live]');
  await expect(live).toHaveAttribute('aria-live', 'off');
  await page.locator('[data-stage-next]').focus();
  await expect(live).toHaveAttribute('aria-live', 'polite');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-stage-n]')).toHaveText(takes[1].id);
});

test('pencils show the grid and stay on across pages', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-pencils]');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pgrid')).toBeVisible();
  await page.goto('/work/');
  await expect(page.locator('html')).toHaveClass(/pencils/);
  await page.locator('[data-pencils]').click();
  await expect(page.locator('.pgrid')).toBeHidden();
});

test('the phone menu closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.menu summary').click();
  await expect(page.locator('.menu')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu')).not.toHaveAttribute('open', '');
});

test('the brief writes a work order, and falls back where forms can’t be sent', async ({ page }) => {
  await page.goto('/work-with-me/');
  await page.locator('#offer-rulebook [data-kind]').click();
  await expect(page.locator('input[name="kind"][value="A design system"]')).toBeChecked();
  await expect(page.locator('#bf-what')).toBeFocused();
  await page.locator('#bf-what').fill('Our tokens drift between web and mobile.');
  await page.locator('#bf-name').fill('Dana Example');
  await page.locator('#bf-co').fill('Northwind');
  await page.locator('#bf-email').fill('dana@example.com');
  await expect(page.locator('[data-wo="from"]')).toHaveText('Dana Example, Northwind');
  await expect(page.locator('[data-wo="kind"]')).toHaveText('A design system');
  await expect(page.locator('[data-wo-no]')).toHaveText(/^CC-\d{4}-\d{3}$/);
  expect(await page.locator('input[name="order"]').inputValue()).toMatch(/^CC-\d{4}-\d{3}$/);
  // The local server refuses POST like GitHub Pages does.
  await page.locator('.bf button[type="submit"]').click();
  await expect(page.locator('[data-bf-status]')).toContainText('can’t send the brief');
  await expect(page.locator('[data-bf-status] button')).toHaveText('Copy work order');
});

test('the brief is ready for Netlify Forms', async ({ page }) => {
  await page.goto('/work-with-me/');
  const form = page.locator('form[name="brief"]');
  await expect(form).toHaveAttribute('data-netlify', 'true');
  await expect(form.locator('input[name="form-name"]')).toHaveValue('brief');
  for (const name of ['kind', 'broken', 'when', 'team', 'name', 'company', 'email', 'order']) await expect(form.locator(`[name="${name}"]`).first()).toBeAttached();
});

test('the colophon runs axe against itself', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/colophon/');
  await page.locator('[data-audit]').click();
  await expect(page.locator('[data-audit]')).toHaveText('Run the checks again', { timeout: 30_000 });
  await expect(page.locator('[data-audit-out]')).toContainText('0 violations');
});

test('typing terry brings Terry', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.type('terry');
  await expect(page.locator('.terry-pop')).toHaveClass(/on/);
});

test('linefield runs in its band and holds still off screen', async ({ page }) => {
  await page.goto('/');
  await page.locator('.stage').scrollIntoViewIfNeeded();
  const frame = page.frameLocator('.stage .band-art');
  await expect(frame.locator('canvas')).toBeAttached();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.locator('.stage .band-art').evaluate((f) => f.contentDocument.hidden)).toBe(true);
});

test('Terry Time’s footer runs live on its case study', async ({ page }) => {
  await page.goto('/work/terry-time/');
  const canvas = page.locator('canvas[data-terry-symbols]');
  await canvas.scrollIntoViewIfNeeded();
  // WebGL2 where the browser has it, a still typed frame where it doesn't.
  await expect(canvas).toHaveAttribute('data-state', /^(live|flat)$/);
  expect(await canvas.evaluate((c) => c.width > 0 && c.height > 0)).toBe(true);
  await expect(page.locator('.tt-still')).toBeHidden();
  await expect(page.locator('script[src^="/assets/js/terry-symbols.js"]')).toHaveCount(1);
});

test('Terry’s footer holds one frame under reduced motion, and says so', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/work/terry-time/');
  const canvas = page.locator('canvas[data-terry-symbols]');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-state', /^(still|flat)$/);
  const hint = page.locator('[data-tt-hint]');
  const state = await canvas.getAttribute('data-state');
  await expect(hint).toHaveText((await hint.getAttribute(state === 'still' ? 'data-still' : 'data-flat')) ?? '');
});

test('only the Terry Time page loads the Terry script', async ({ page }) => {
  await page.goto('/work/linefield/');
  await expect(page.locator('script[src^="/assets/js/terry-symbols.js"]')).toHaveCount(0);
  await expect(page.locator('.live-band iframe.band-art')).toHaveCount(1);
});
