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
