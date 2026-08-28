import { expect, test } from '@playwright/test';

const expectedDrawerItems = [
  { index: '01', text: 'Home', href: /index\.html$/ },
  { index: '02', text: 'Art', href: /art\.html$/ },
  { index: '03', text: 'Writing', href: /writing\.html$/ },
  { index: '04', text: 'Projects', href: /projects\.html$/ },
  { index: '05', text: 'Shop', href: 'https://shop.classiccottrell.ca' },
];

for (const page of ['index.html', 'art.html', 'writing.html', 'projects.html']) {
  test(`header renders on ${page} with mobile drawer order and desktop Shop link`, async ({ page: p }) => {
    const errors = [];
    p.on('pageerror', err => errors.push(err));
    p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(`/${page}`);

    // Desktop nav-links includes Shop as final item, opening in new tab
    const desktopLinks = p.locator('.nav-links .header-link');
    await expect(desktopLinks).toHaveCount(4);
    await expect(desktopLinks.last()).toContainText('Shop');
    await expect(desktopLinks.last()).toHaveAttribute('href', 'https://shop.classiccottrell.ca');
    await expect(desktopLinks.last()).toHaveAttribute('target', '_blank');
    await expect(desktopLinks.last().locator('span[aria-hidden="true"]')).toHaveText('↗');
    await expect(desktopLinks.last().locator('.visually-hidden')).toHaveText(' (opens in a new tab)');

    // Mobile drawer order and hrefs
    const drawerLinks = p.locator('.nav-drawer-links .nav-drawer-link');
    await expect(drawerLinks).toHaveCount(5);
    for (let i = 0; i < expectedDrawerItems.length; i++) {
      const item = expectedDrawerItems[i];
      const link = drawerLinks.nth(i);
      await expect(link.locator('.nav-drawer-index')).toHaveText(item.index);
      await expect(link).toContainText(item.text);
      await expect(link).toHaveAttribute('href', item.href);
    }
    // Shop drawer link also carries the visible arrow + hidden a11y text (no double announcement)
    const drawerShopLink = drawerLinks.last();
    await expect(drawerShopLink.locator('span[aria-hidden="true"]')).toHaveText('↗');
    await expect(drawerShopLink.locator('.visually-hidden')).toHaveText(' (opens in a new tab)');

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
