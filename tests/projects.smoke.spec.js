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

test('VPAT Vault card uses current product scope, purchase CTA, extension link, and roadmap', async ({ page }) => {
  await page.goto('/projects.html');

  const card = page.locator('.project-nav-item[data-id="vpat-vault"]');
  await expect(card).toContainText('VPAT Vault');
  await card.click();

  await expect(page.locator('.project-title')).toHaveText('VPAT Vault');
  await expect(page.locator('.project-detail')).toContainText('50-record reference dataset');
  await expect(page.locator('.project-detail')).toContainText('human evidence review');
  await expect(page.locator('p.project-cta a')).toHaveAttribute('href', 'https://shop.classiccottrell.ca/product/vpat-vault');
  await expect(page.locator('.project-buy-section')).toContainText('Get VPAT Vault');
  await expect(page.locator('.project-buy-section .project-buy-cta')).toHaveAttribute('href', 'https://shop.classiccottrell.ca/product/vpat-vault');
  await expect(page.locator('.project-extension-cta')).toHaveAttribute('href', 'https://vpat.classiccottrell.ca/');
  await expect(page.locator('.project-section-image')).toHaveAttribute('src', 'img/products/vpat-vault-evidence.webp');
  await expect(page.locator('.project-roadmap .project-inline-link')).toHaveAttribute('href', 'https://shop.classiccottrell.ca/product/vpat-vault');
  await expect(page.locator('.roadmap-stage')).toHaveCount(4);
  await page.locator('.roadmap-stage').nth(1).click();
  await expect(page.locator('.roadmap-detail')).toContainText('active tab');
  await expect(page.locator('.project-detail')).not.toContainText(/covering 50|each prompt tested|optimizer|token overhead/i);
});
