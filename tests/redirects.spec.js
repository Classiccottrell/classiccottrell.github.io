// Old addresses keep working, including the #hash links into projects.html.
import { expect, test } from '@playwright/test';

const CASES = [
  ['/projects.html', '/work/'],
  ['/projects.html#forma', '/work/forma/'],
  ['/projects.html#agent-workspace', '/work/agent-bench/'],
  ['/projects.html#agentic-light', '/work/agent-bench/'],
  ['/work/#linefield', '/work/linefield/'],
  ['/art.html', '/drawings/'],
  ['/writing.html', '/writing/'],
  ['/writing', '/writing/'],
];

for (const [from, to] of CASES) {
  test(`${from} lands on ${to}`, async ({ page }) => {
    await page.goto(from);
    await expect(page).toHaveURL(new RegExp(`${to.replace(/\//g, '\\/')}$`));
  });
}

test('an unknown address gets Terry’s 404', async ({ page }) => {
  const res = await page.goto('/no-such-page/');
  expect(res.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('Terry took this page apart');
});
