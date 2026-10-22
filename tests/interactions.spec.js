// The optional layer: each interactive piece does what it says.
import { expect, test } from '@playwright/test';
import { takes, work } from './helpers.js';

test('hot takes rotate on demand and pause', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('[data-stage]');
  await expect(stage.locator('[data-stage-n]')).toHaveText(takes[0].id);
  await stage.locator('[data-stage-next]').click();
  await expect(stage.locator('[data-stage-n]')).toHaveText(takes[1].id);
  await expect(stage.locator('[data-stage-text]')).toHaveAttribute('href', `/takes/${takes[1].slug}/`);
  await stage.locator('[data-stage-prev]').click();
  await stage.locator('[data-stage-prev]').click();
  await expect(stage.locator('[data-stage-n]')).toHaveText(takes[takes.length - 1].id);
  const play = stage.locator('[data-stage-play]');
  const before = await play.textContent();
  await play.click();
  await expect(play).not.toHaveText(before);
});

test('take it apart follows the slider and the button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#xv').scrollIntoViewIfNeeded();
  await page.locator('#explode').fill('30');
  await expect(page.locator('output[for="explode"]')).toHaveText('30%');
  expect(await page.locator('#xv').evaluate((el) => el.style.getPropertyValue('--x'))).toBe('0.300');
  await page.locator('#explode-btn').click();
  await expect(page.locator('#explode')).toHaveValue('100');
  await expect(page.locator('#explode-btn')).toHaveText('Put it back');
});

test('pencils show the grid and stay on across pages', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('[data-pencils]');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pgrid')).toBeVisible();
  await page.goto('/work/');
  await expect(page.locator('html')).toHaveClass(/pencils/);
  await page.locator('[data-pencils]').click();
  await expect(page.locator('.pgrid')).toBeHidden();
});

test('the phone menu closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.menu summary').click();
  await expect(page.locator('.menu')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu')).not.toHaveAttribute('open', '');
});

test('the form is three labelled fields, and falls back where forms can’t be sent', async ({ page }) => {
  await page.goto('/work-with-me/');
  const form = page.locator('form[name="brief"]');
  await expect(form.getByLabel('Name')).toHaveAttribute('name', 'name');
  await expect(form.getByLabel('Email')).toHaveAttribute('type', 'email');
  await expect(form.getByLabel('What’s broken?')).toHaveAttribute('name', 'broken');
  await expect(form.locator('select, input[type="radio"], fieldset')).toHaveCount(0);
  await form.getByLabel('Name').fill('Dana Example');
  await form.getByLabel('Email').fill('dana@example.com');
  await form.getByLabel('What’s broken?').fill('Our tokens drift between web and mobile.');
  // The local server refuses POST like GitHub Pages does.
  await form.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('[data-bf-status]')).toContainText('can’t send messages');
  await expect(page.locator('[data-bf-status] button')).toHaveText('Copy message');
});

test('the form is ready for Netlify Forms', async ({ page }) => {
  await page.goto('/work-with-me/');
  const form = page.locator('form[name="brief"]');
  await expect(form).toHaveAttribute('data-netlify', 'true');
  await expect(form).toHaveAttribute('netlify-honeypot', 'website');
  await expect(form).toHaveAttribute('action', '/work-with-me/thanks/');
  await expect(form.locator('input[name="form-name"]')).toHaveValue('brief');
  for (const name of ['name', 'email', 'broken', 'website']) await expect(form.locator(`[name="${name}"]`)).toHaveCount(1);
});

test('the colophon runs axe against itself', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/colophon/');
  await page.locator('[data-audit]').click();
  await expect(page.locator('[data-audit]')).toHaveText('Run the checks again', { timeout: 30_000 });
  await expect(page.locator('[data-audit-out]')).toContainText('0 violations');
});

test('typing terry brings Terry', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.type('terry');
  await expect(page.locator('.terry-pop')).toHaveClass(/on/);
});

test('linefield runs in its band and holds still off screen', async ({ page }) => {
  await page.goto('/');
  await page.locator('.stage').scrollIntoViewIfNeeded();
  const frame = page.frameLocator('.stage .band-art.on');
  await expect(frame.locator('canvas')).toBeAttached();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.locator('.stage .band-art.on').evaluate((f) => f.contentDocument.hidden)).toBe(true);
});

test('Terry Time’s footer runs live on its case study', async ({ page }) => {
  await page.goto('/work/terry-time/');
  const canvas = page.locator('canvas[data-terry-symbols]');
  await canvas.scrollIntoViewIfNeeded();
  // WebGL2 where the browser has it, a still typed frame where it doesn't.
  await expect(canvas).toHaveAttribute('data-state', /^(live|flat)$/);
  expect(await canvas.evaluate((c) => c.width > 0 && c.height > 0)).toBe(true);
  await expect(page.locator('.tt-still')).toBeHidden();
  await expect(page.locator('script[src^="/assets/js/terry-symbols.js"]')).toHaveCount(1);
});

test('Terry’s footer holds one frame under reduced motion, and says so', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/work/terry-time/');
  const canvas = page.locator('canvas[data-terry-symbols]');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-state', /^(still|flat)$/);
  const hint = page.locator('[data-tt-hint]');
  const state = await canvas.getAttribute('data-state');
  await expect(hint).toHaveText((await hint.getAttribute(state === 'still' ? 'data-still' : 'data-flat')) ?? '');
});

test('only the Terry Time page loads the Terry script', async ({ page }) => {
  await page.goto('/work/linefield/');
  await expect(page.locator('script[src^="/assets/js/terry-symbols.js"]')).toHaveCount(0);
  await expect(page.locator('.live-band iframe.band-art')).toHaveCount(1);
});

test('selected work: three large pictures, each opening its case study in the same tab', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const items = page.locator('.sel-list .item');
  const featured = work.filter((p) => p.featured).slice(0, 3);
  await expect(items).toHaveCount(3);
  for (const [i, p] of featured.entries()) {
    const item = items.nth(i);
    await expect(item.locator('h3')).toHaveText(p.title);
    await expect(item.locator('p')).toHaveText(p.summary);
    await expect(item).toHaveAttribute('href', `/work/${p.slug}/`);
    await expect(item).not.toHaveAttribute('target', /.*/);
    await expect(item).not.toHaveAttribute('rel', /.*/);
  }
  await expect(page.locator('.sel-head a')).toHaveText(new RegExp(`All ${work.length} projects`));
});

test('the headline, in Newsreader italic on the last word, and Takes in the nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('I take complicated software apart, then put it back simpler.');
  await expect(page.locator('h1 em')).toHaveText('simpler.');
  expect(await page.locator('h1 em').evaluate((e) => getComputedStyle(e).fontStyle)).toBe('italic');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /then put it back simpler/);
  await expect(page.locator('.mast-nav a')).toHaveText(['Work', 'Takes', 'Writing', 'Drawings', 'About', 'Work with me']);
  await page.goto('/about/');
  await expect(page.locator('.lede')).toHaveText('I take complicated software apart, then put it back simpler.');
});

test('the first fold holds five things: wordmark, nav, headline, portrait and one link', async ({ page }) => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.goto('/');
    const fold = await page.evaluate(() => {
      const vh = innerHeight;
      const seen = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.top < vh && r.bottom > 0; };
      const interesting = [...document.querySelectorAll('header.mast a, header.mast summary, main h1, main figure, main a, main h2, main p, main figcaption, main li')].filter(seen);
      return interesting.filter((el) => !el.closest('.menu-panel') && !(el.closest('.mast-nav') && el.tagName === 'A') && !(el.closest('.sel') && el.getBoundingClientRect().top >= vh)).map((el) => el.className || el.tagName.toLowerCase());
    });
    // wordmark, the nav (links or the Menu button), h1, figure, one go link
    expect(fold.filter((c) => !/^(mast-name|go|hero-h|hero-fig.*|summary)$/.test(c)), `${vp.width}`).toEqual([]);
    await expect(page.locator('.hero p, .hero .lede, .hero .note, .hero .avail, .hero .btn, .hero figcaption')).toHaveCount(0);
    await expect(page.locator('.hero a')).toHaveCount(1);
    await expect(page.locator('.hero a')).toHaveText(/Selected work/);
    await expect(page.locator('.hero img')).toHaveCount(1);
    await expect(page.locator('.hero .pen')).toHaveCount(0);
  }
});

test('the masthead nav sits fully on the slab on wide screens, in both schemes', async ({ page }) => {
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [1100, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const nav = await page.locator('.mast-nav').boundingBox();
      const slab = await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().width / 2);
      expect(nav.x, `${scheme} ${width}`).toBeGreaterThanOrEqual(slab);
      expect(await page.locator('.mast-nav a').first().evaluate((a) => getComputedStyle(a).color)).toBe('rgb(17, 17, 17)');
    }
  }
});

test('phone: Menu is a disclosure that keeps every link reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.mast-nav')).toBeHidden();
  await page.locator('.menu summary').click();
  await expect(page.locator('.menu-panel a')).toHaveText(['Work', 'Takes', 'Writing', 'Drawings', 'About', 'Work with me']);
  for (const a of await page.locator('.menu-panel a').all()) await expect(a).toBeVisible();
});

test('the portrait is signed once the ink is down, and is already signed with reduced motion', async ({ page }) => {
  await page.goto('/');
  const fig = page.locator('.hero-fig');
  await expect(fig).toHaveClass(/sig-wait/);
  await expect(fig).not.toHaveClass(/sig-wait/, { timeout: 8000 });
  await expect.poll(() => fig.locator('.sig .m4').evaluate((p) => getComputedStyle(p).strokeDashoffset), { timeout: 8000 }).toBe('0px');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('.hero-fig')).not.toHaveClass(/sig-wait/);
  expect(await page.locator('.hero-fig .sig .m4').evaluate((p) => getComputedStyle(p).strokeDashoffset)).toBe('0px');
});

test('take it apart follows the page scroll, and the slider moves the page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const run = page.locator('[data-xv-run]');
  const at = (frac) => run.evaluate((el, f) => {
    const dock = el.querySelector('.xv-dock'), top = parseFloat(getComputedStyle(dock).top);
    const span = el.offsetHeight - dock.offsetHeight;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - top + span * f);
  }, frac);
  await at(0.5);
  // Scroll covers 35% (the rest state) to 100%.
  await expect(page.locator('#explode')).toHaveValue('68');
  await expect(page.locator('output[for="explode"]')).toHaveText('68%');
  await at(0.9);
  await expect(page.locator('#explode')).toHaveValue('94');
  const y = await page.evaluate(() => window.scrollY);
  await page.locator('#explode').fill('20');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(y);
  await expect(page.locator('#explode')).toHaveValue('20');
});

test('each hot take brings its own linefield piece, one running at a time', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('[data-stage]');
  await stage.scrollIntoViewIfNeeded();
  const on = stage.locator('.stage-art .band-art.on');
  await expect(on).toHaveAttribute('data-piece', 'grain-field');
  await stage.locator('[data-stage-next]').click();
  await expect(on).toHaveAttribute('data-piece', 'terminator');
  await stage.locator('[data-stage-next]').click();
  await expect(on).toHaveAttribute('data-piece', 'dark-nebula');
  await expect(stage.locator('.stage-art .band-art.on')).toHaveCount(1);
  await expect.poll(() => stage.locator('.stage-art .band-art:not(.on)').evaluateAll((fs) => fs.every((f) => f.contentDocument.hidden === true))).toBe(true);
});

test('take it apart: the button reaches 100% on a phone with reduced motion, and back to the start', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#xv').scrollIntoViewIfNeeded();
  await expect(page.locator('#explode')).toHaveValue(/^(3[5-9]|[4-9]\d)$/);
  await page.locator('#explode-btn').click();
  await expect(page.locator('#explode')).toHaveValue('100');
  await expect(page.locator('#explode-btn')).toHaveText('Put it back');
  await page.locator('#explode-btn').click();
  await expect(page.locator('#explode')).toHaveValue('35');
});
