import { expect, test } from '@playwright/test';

const expectedDrawerItems = [
  { index: '01', text: 'Home', href: /index\.html$/ },
  { index: '02', text: 'Art', href: /art\.html$/ },
  { index: '03', text: 'Writing', href: /writing\.html$/ },
  { index: '04', text: 'Projects', href: /projects\.html$/ },
];

for (const page of ['index.html', 'art.html', 'writing.html', 'projects.html']) {
  test(`header renders on ${page} with mobile drawer order and desktop nav links`, async ({ page: p }) => {
    const errors = [];
    p.on('pageerror', err => errors.push(err));
    p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(`/${page}`);

    // Desktop nav-links ends at Projects; no external links
    const desktopLinks = p.locator('.nav-links .header-link');
    await expect(desktopLinks).toHaveCount(3);
    await expect(desktopLinks.last()).toContainText('Projects');
    await expect(desktopLinks.last()).toHaveAttribute('href', /projects\.html$/);
    await expect(desktopLinks.last()).not.toHaveAttribute('target', '_blank');

    // Mobile drawer order and hrefs
    const drawerLinks = p.locator('.nav-drawer-links .nav-drawer-link');
    await expect(drawerLinks).toHaveCount(4);
    for (let i = 0; i < expectedDrawerItems.length; i++) {
      const item = expectedDrawerItems[i];
      const link = drawerLinks.nth(i);
      await expect(link.locator('.nav-drawer-index')).toHaveText(item.index);
      await expect(link).toContainText(item.text);
      await expect(link).toHaveAttribute('href', item.href);
    }

    await expect(p.locator('a[href*="shop.classiccottrell"]')).toHaveCount(0);
    await expect(p.locator('label[for="theme-select"]')).toHaveText('Theme');
    await expect(p.locator('a[href="sandbox.html"]')).toHaveCount(0);

    // nav-toggle open/close
    const toggle = p.locator('#nav-toggle');
    const drawer = p.locator('#mobile-nav-drawer');
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');
    await toggle.click({ force: true });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');

    expect(errors, `console/page errors on ${page}: ${errors.join(', ')}`).toHaveLength(0);
  });
}

test('404 page header has no shop link', async ({ page: p }) => {
  await p.goto('/404.html');
  await expect(p.locator('.nav-links .header-link')).toHaveCount(3);
  await expect(p.locator('.nav-drawer-links .nav-drawer-link')).toHaveCount(4);
  await expect(p.locator('a[href*="shop.classiccottrell"]')).toHaveCount(0);
});
