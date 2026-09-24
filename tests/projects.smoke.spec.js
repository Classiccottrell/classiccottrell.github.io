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
  await expect(page.locator('.project-title')).not.toBeFocused();
  await expect(page.locator('.project-detail')).not.toContainText('Get VPAT Vault');

  await page.locator('.project-repo-link').focus();
  await expect(page.locator('.project-repo-link')).toHaveCSS('outline-style', 'solid');

  await page.locator('#theme-select').selectOption('brutal');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'brutal');

  await page.locator('.project-nav-item[data-id="second"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.project-nav-item[data-id="second"]')).toHaveClass(/active/);
  await expect(page.locator('.project-title')).toHaveText('Second');
  await expect(page.locator('.project-title')).toBeFocused();
});

test('VPAT Vault card uses current product scope, purchase CTA, extension link, and roadmap', async ({ page }) => {
  await page.goto('/projects.html');

  const card = page.locator('.project-nav-item[data-id="vpat-vault"]');
  await expect(card).toContainText('VPAT Vault');
  await card.click();

  await expect(page.locator('.project-title')).toHaveText('VPAT Vault');
  await expect(page.locator('.project-detail')).toContainText('50-record reference dataset');
  await expect(page.locator('.project-detail')).toContainText('evidence review');
  await expect(page.locator('p.project-cta a')).toHaveAttribute('href', 'https://shop.classiccottrell.ca/product/vpat-vault');
  await expect(page.locator('.project-buy-section')).toContainText('Get VPAT Vault');
  await expect(page.locator('.project-buy-section .project-buy-cta')).toHaveAttribute('href', 'https://shop.classiccottrell.ca/product/vpat-vault');
  await expect(page.locator('.project-extension-cta')).toHaveAttribute('href', 'https://vpat.classiccottrell.ca/');
  await expect(page.locator('.project-section-image')).toHaveAttribute('src', 'img/products/vpat-vault-evidence.webp');
  await expect(page.locator('.project-roadmap .project-inline-link').first()).toHaveAttribute('href', 'https://shop.classiccottrell.ca/product/vpat-vault');
  await expect(page.locator('.project-roadmap .project-inline-link').nth(1)).toHaveAttribute('href', 'https://vpat.classiccottrell.ca/');
  await expect(page.locator('.roadmap-stage')).toHaveCount(4);
  await page.locator('.roadmap-stage').nth(1).click();
  await expect(page.locator('.roadmap-detail')).toContainText('active tab');
  await expect(page.locator('.project-detail')).not.toContainText(/covering 50|each prompt tested|optimizer|token overhead/i);
});

test('headed sections render their paragraphs and skip empty lists', async ({ page }) => {
  await page.route('**/data/projects_data.json*', route => route.fulfill({
    json: [{
      id: 'p', status: 'Live', title: 'P', subtitle: 's', repos: [],
      sections: [
        { heading: 'Why', paragraphs: ['Headed paragraph renders.'] },
        { heading: 'With items', items: [{ lead: 'Lead.', text: 'Text.' }] },
      ],
    }],
  }));

  await page.goto('/projects.html');
  await expect(page.locator('.project-detail')).toContainText('Headed paragraph renders.');
  await expect(page.locator('.project-detail ul')).toHaveCount(1);
});

for (const reducedMotion of ['reduce', 'no-preference']) {
  test(`mobile project hashes keep the active card visible (${reducedMotion})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion });
    await page.route('**/data/projects_data.json*', route => route.fulfill({
      json: Array.from({ length: 9 }, (_, index) => ({
        id: `project-${index}`, title: `Project ${index}`, status: 'Live', subtitle: 'Case study', repos: [],
        sections: [{ paragraphs: Array(12).fill('Project details with enough content to preserve the document scroll position.') }],
      })),
    }));
    const expectActiveCard = async id => {
      await expect(page.locator('.project-nav-item.active')).toHaveAttribute('data-id', id);
      await expect.poll(() => page.locator('.project-nav-item.active').evaluate(card => {
        const bounds = card.getBoundingClientRect();
        const rail = card.parentElement.getBoundingClientRect();
        return bounds.left >= rail.left - 1 && bounds.right <= rail.right + 1;
      })).toBe(true);
    };

    await page.goto('/projects.html#project-8');
    await expectActiveCard('project-8');
    await page.evaluate(() => window.scrollTo({ top: 120, behavior: 'instant' }));
    await page.evaluate(() => { location.hash = 'project-2'; });
    await expectActiveCard('project-2');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
    await page.goBack();
    await expectActiveCard('project-8');
    await page.goForward();
    await expectActiveCard('project-2');

    await page.locator('.project-nav-item.active').focus();
    const beforeSelection = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Enter');
    await expect(page.locator('.project-title')).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(beforeSelection);

    await page.goto('/projects.html');
    await expectActiveCard('project-0');
    await page.evaluate(() => { location.hash = 'project-8'; });
    await expectActiveCard('project-8');
    await page.goBack();
    await expectActiveCard('project-0');
  });
}

test('repo links retain distinct destinations and suppress duplicate CTAs for both data formats', async ({ page }) => {
  const sharedUrl = 'https://github.com/example/shared';
  const distinctUrl = 'https://github.com/example/engine';
  await page.route('**/data/projects_data.json*', route => route.fulfill({
    json: [
      { id: 'modern', title: 'Modern', status: 'Live', subtitle: 's', sections: [], ctaLabel: 'Source', ctaUrl: sharedUrl,
        repos: [{ label: 'Shared', url: sharedUrl }, { label: 'Engine', url: distinctUrl }] },
      { id: 'legacy', title: 'Legacy', status: 'Live', subtitle: 's', sections: [], ctaLabel: 'Source', ctaUrl: sharedUrl, repo: sharedUrl },
    ],
  }));
  await page.goto('/projects.html');
  await expect(page.locator('.project-repo-link')).toHaveAttribute('href', distinctUrl);
  await expect(page.locator('.project-detail a').filter({ hasText: 'Source' })).toHaveAttribute('href', sharedUrl);
  await page.locator('[data-id="legacy"]').click();
  await expect(page.locator('.project-repo-links')).toHaveCount(0);
  await expect(page.locator('.project-cta a')).toHaveAttribute('href', sharedUrl);
});

test('preview figures lead the case study and preserve quoted text without injecting attributes', async ({ page }) => {
  const quoted = 'A "shape" onload="alert(1)';
  await page.route('**/data/projects_data.json*', route => route.fulfill({
    json: [{ id: 'preview', title: quoted, status: 'Live', subtitle: 's',
      image: 'img/projects/forma-editor.webp', imageAlt: quoted, imageCaption: 'The editor at work.',
      repos: [{ label: quoted, url: 'https://example.com/" data-injected="true' }],
      sections: [{ paragraphs: ['The case study starts here.'] }],
    }],
  }));
  await page.goto('/projects.html');
  await expect(page.locator('.project-title')).toHaveText(quoted);
  await expect(page.locator('.project-heading-row + .project-product figure img')).toHaveAttribute('alt', quoted);
  await expect(page.locator('.project-product + section')).toContainText('The case study starts here.');
  await expect(page.locator('figcaption')).toHaveText('The editor at work.');
  await expect(page.locator('.project-product-actions, [onload], [data-injected]')).toHaveCount(0);
  await expect(page.locator('.project-repo-link')).toHaveAttribute('href', 'https://example.com/" data-injected="true');
});
