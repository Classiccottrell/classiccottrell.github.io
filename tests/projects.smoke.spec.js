import { expect, test } from '@playwright/test';

test('legacy project data supports themes, focus, and mobile selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/data/projects_data.json*', route => route.fulfill({
    json: [
      { id: 'legacy', status: 'Live', title: 'Legacy', subtitle: 'Old cache', repo: 'https://github.com/example/legacy', ctaLabel: 'Visit', ctaUrl: '#', sections: [] },
      { id: 'second', status: 'Live', title: 'Second', subtitle: 'Swipe target', repo: 'https://github.com/example/second', ctaLabel: 'Visit', ctaUrl: '#', sections: [] },
    ],
  }));

  await page.goto('/projects.html');
  await expect(page.locator('.project-repo-link')).toHaveAttribute('href', 'https://github.com/example/legacy');

  await page.locator('.project-repo-link').focus();
  await expect(page.locator('.project-repo-link')).toHaveCSS('outline-style', 'solid');

  await page.locator('#theme-select').selectOption('brutal');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'brutal');

  await page.locator('.project-nav-item[data-id="second"]').click();
  await expect(page.locator('.project-nav-item[data-id="second"]')).toHaveClass(/active/);
  await expect(page.locator('.project-title')).toHaveText('Second');
});
