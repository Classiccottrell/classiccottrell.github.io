// The whole site reads with JavaScript turned off.
import { expect, test } from '@playwright/test';
import { PAGES, work } from './helpers.js';

test.use({ javaScriptEnabled: false });

for (const path of PAGES) {
  test(`renders without JavaScript: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('.mast-name')).toBeVisible();
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('footer.foot')).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/no-js/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('every case study is a real page with its title block and sections', async ({ page }) => {
  for (const p of work) {
    await page.goto(`/work/${p.slug}/`);
    await expect(page.locator('h1')).toHaveText(p.title);
    await expect(page.locator('.cs-tb dt').first()).toHaveText('Role');
    await expect(page.locator('.cs-sec')).toHaveCount(p.sections.length);
  }
});

test('Terry in the footer goes to his shop, and so does the bio', async ({ page }) => {
  await page.goto('/about/');
  const terry = page.locator('.foot-base a.terry-a');
  await expect(terry).toHaveAttribute('href', '/work/terry-time/');
  await expect(terry).toHaveAccessibleName('Terry Time, Terry’s shop');
  await page.locator('.about-text a[href="/work/terry-time/"]').click();
  await expect(page.locator('h1')).toHaveText('Terry Time');
  await expect(page.locator('.foot-base a.terry-a')).toHaveAttribute('aria-current', 'page');
});

test('Terry’s footer shows a still frame without JavaScript', async ({ page }) => {
  await page.goto('/work/terry-time/');
  const still = page.locator('.tt-band .tt-still');
  await still.scrollIntoViewIfNeeded();
  await expect(still).toBeVisible();
  expect(await still.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.locator('[data-tt-hint]')).toBeHidden();
});

test('the work index lists every project, grouped', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.locator('.groups .idx-row')).toHaveCount(work.length);
});

test('the phone menu opens without JavaScript', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.menu summary').click();
  await expect(page.locator('.menu-panel a[href="/work/"]')).toBeVisible();
});
