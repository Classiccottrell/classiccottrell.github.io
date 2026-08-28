import { expect, test } from '@playwright/test';

test('art.html renders both the grid and the timeline', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('/art.html');

  // Grid entries render, unconditionally alongside the timeline (no tab switcher)
  const gridEntries = page.locator('#art-grid .art-entry');
  await expect(gridEntries).toHaveCount(3);

  // Each entry exposes its detail fields and a real, loadable image
  const first = gridEntries.first();
  await expect(first.locator('.art-quote')).not.toBeEmpty();
  await expect(first.locator('.detail-row')).toHaveCount(6);

  const visual = first.locator('.art-visual');
  const bgImage = await visual.evaluate(el => getComputedStyle(el).backgroundImage);
  expect(bgImage).toContain('gents-lg.png');

  // Timeline still renders alongside the grid (both sections visible, no display:none toggle)
  await expect(page.locator('#art-timeline')).toBeVisible();
  await expect(page.locator('#art-grid')).toBeVisible();

  // No leftover tab-switcher controls from the removed view-switcher
  await expect(page.locator('.tab-btn')).toHaveCount(0);

  expect(errors, `console/page errors on art.html: ${errors.join(', ')}`).toHaveLength(0);
});
