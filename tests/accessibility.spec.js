// Every page passes axe-core (WCAG 2.2 AA and best practice) in both
// polarities, on a desktop and on a phone. This is the gate the roadmap set.
import { expect, test } from '@playwright/test';
import { PAGES, axeViolations } from './helpers.js';

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    for (const [scheme, width] of [['light', 1440], ['dark', 1440], ['light', 390]]) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(path);
      expect(await axeViolations(page), `${scheme} at ${width}px`).toEqual([]);
    }
  });
}

// Keyboard focus never ends up hidden under the sticky masthead (WCAG 2.4.11),
// walking back up the page with Shift+Tab, which is where it used to hide.
for (const [width, path] of [[390, '/'], [1440, '/'], [1440, '/work-with-me/']]) {
  test(`Shift+Tab keeps focus clear of the masthead: ${path} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await page.locator('footer a').first().focus();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Shift+Tab');
      const hidden = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el.closest('.mast, .skip') || el.matches('.skip')) return null;
        const r = el.getBoundingClientRect(), m = document.querySelector('.mast').getBoundingClientRect();
        return r.bottom <= m.bottom + 0.5 ? (el.textContent || el.tagName).trim().slice(0, 40) : null;
      });
      expect(hidden, 'focused element sits under the masthead').toBeNull();
    }
  });
}
