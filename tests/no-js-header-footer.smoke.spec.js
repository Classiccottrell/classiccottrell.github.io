import { test, expect, chromium } from '@playwright/test';

// Verifies UX audit finding #03: site is no longer blank without JS.
// Header nav links and footer content must be present in the rendered DOM
// with JavaScript disabled. Page-specific JSON-driven content (project/art
// grids) is out of scope and expected to remain empty without JS.
test.describe('no-JS header/footer inlining', () => {
  for (const page of ['index.html', 'projects.html']) {
    test(`${page} renders real header nav + footer without JS`, async ({ baseURL }) => {
      const browser = await chromium.launch();
      const context = await browser.newContext({ javaScriptEnabled: false });
      const p = await context.newPage();
      await p.goto(`${baseURL}/${page}`);

      const navLinks = p.locator('.nav-links .header-link');
      await expect(navLinks).toHaveCount(4);
      await expect(navLinks.last()).toContainText('Shop');
      await expect(navLinks.last()).toHaveAttribute('href', 'https://shop.classiccottrell.ca');

      const drawerLinks = p.locator('.nav-drawer-links .nav-drawer-link');
      await expect(drawerLinks).toHaveCount(5);

      const footer = p.locator('#footer');
      await expect(footer).not.toBeEmpty();
      const footerText = await footer.innerText();
      expect(footerText.trim().length).toBeGreaterThan(0);

      await browser.close();
    });
  }

  test('projects.html grid content remains empty without JS (by design)', async ({ baseURL }) => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ javaScriptEnabled: false });
    const p = await context.newPage();
    await p.goto(`${baseURL}/projects.html`);

    // JSON-driven detail/nav content is still JS-rendered; header/footer
    // above confirms this is by design, not a header/footer regression.
    const projectNav = p.locator('.project-nav-item');
    await expect(projectNav).toHaveCount(0);

    await browser.close();
  });
});
