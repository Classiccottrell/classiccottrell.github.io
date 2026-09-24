import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`writing cards pair each essay with a decorative thumbnail (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/writing.html');

    const cards = page.locator('.writing-card');
    await expect(cards).toHaveCount(3);

    // Lazy thumbnails below the fold would report naturalWidth 0; force them to load first.
    await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }));
    const thumbs = page.locator('img.writing-card-thumb');
    await expect(thumbs).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect.poll(() => thumbs.nth(i).evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
      await expect(thumbs.nth(i)).toHaveAttribute('alt', '');
    }

    for (let i = 0; i < 3; i++) {
      const layout = await cards.nth(i).evaluate(card => {
        const box = el => el.getBoundingClientRect();
        const cardBox = box(card);
        return {
          contentTop: cardBox.top + parseFloat(getComputedStyle(card).paddingTop),
          thumb: box(card.querySelector('.writing-card-thumb')),
          title: box(card.querySelector('.writing-card-title')),
          date: box(card.querySelector('.writing-card-date')),
        };
      });
      if (viewport.width >= 1024) {
        // Thumbnail sits in the right column, top-aligned with the card's content box.
        expect(layout.thumb.left).toBeGreaterThan(layout.title.right - 1);
        expect(Math.abs(layout.thumb.top - layout.contentTop)).toBeLessThanOrEqual(2);
      } else {
        // Single column: thumbnail stacks above the text.
        expect(layout.thumb.bottom).toBeLessThanOrEqual(layout.date.top + 1);
      }
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
