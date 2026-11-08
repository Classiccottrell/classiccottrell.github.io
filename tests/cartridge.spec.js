import { expect, test } from '@playwright/test';
import { axeViolations } from './helpers.js';

const reveal = (page) => page.getByRole('button', { name: 'Play arcade' });
const open = async (page) => {
  await page.goto('/');
  await reveal(page).click();
  await expect(page.locator('[data-cart-screen] canvas')).toBeVisible();
};

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('compact project links remain without an empty game shell', async ({ page }) => {
    await page.goto('/');
    for (const slug of ['vpat-vault', 'linefield', 'terry-time']) {
      await expect(page.locator(`[data-cart-fallback] a[href="/work/${slug}/"]`)).toBeVisible();
    }
    await expect(reveal(page)).toBeHidden();
    await expect(page.locator('[data-cart-screen]')).toBeHidden();
    expect((await page.locator('[data-cartridge]').boundingBox()).height).toBeLessThan(140);
  });
});

test('home seam precedes masthead and collapsed never downloads runtime or music', async ({ page }, testInfo) => {
  const requests = [];
  page.on('request', (request) => { if (request.url().includes('/assets/arcade/')) requests.push(request.url()); });
  await page.goto('/');
  await expect(reveal(page)).toHaveAttribute('aria-expanded', 'false');
  const seam = await reveal(page).boundingBox();
  const masthead = await page.locator('.mast').boundingBox();
  expect(seam.height).toBeGreaterThanOrEqual(44);
  expect(seam.y + seam.height).toBeLessThanOrEqual(masthead.y);
  await page.screenshot({ path: testInfo.outputPath('desktop-collapsed.png'), animations: 'disabled' });
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('[data-cart-screen] canvas')).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.goto('/work/');
  await expect(page.locator('[data-cartridge]')).toHaveCount(0);
});

test('reveal pushes content down, Enter stays in page, close destroys game and returns focus', async ({ page }, testInfo) => {
  await page.goto('/');
  const before = await page.locator('.mast').boundingBox();
  await reveal(page).click();
  const canvas = page.locator('[data-cart-screen] canvas');
  await expect(canvas).toBeVisible();
  await expect(reveal(page)).toHaveAttribute('aria-expanded', 'true');
  const after = await page.locator('.mast').boundingBox();
  expect(after.y).toBeGreaterThan(before.y + 300);
  await expect(canvas).toHaveAttribute('data-stage', 'title', { timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('desktop-revealed.png'), animations: 'disabled' });
  await canvas.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Game', exact: true })).toHaveCount(0);
  const help = page.getByRole('button', { name: 'Controls', exact: true });
  await help.click();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await help.click();
  await expect(page.getByRole('button', { name: /^Sound (on|off)$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Game', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Game', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close arcade' }).click();
  await expect(reveal(page)).toBeFocused();
  await expect(reveal(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(canvas).toHaveCount(0);
  expect((await page.locator('.mast').boundingBox()).y).toBe(before.y);
  await reveal(page).click();
  await expect(canvas).toHaveCount(1);
});

test('reduced motion has an immediate static opening and accessible controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.locator('[data-cart-panel]')).toHaveCSS('animation-name', 'none');
  expect(await axeViolations(page)).toEqual([]);
});

test('phone opens in normal layout and scroll remains native', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('phone-collapsed.png'), animations: 'disabled' });
  await reveal(page).click();
  const canvas = page.locator('[data-cart-screen] canvas');
  await expect(canvas).toHaveAttribute('data-stage', 'title', { timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('phone-revealed.png'), animations: 'disabled' });
  const controls = await page.locator('.cc-touch-controls').boundingBox();
  const picture = await canvas.boundingBox();
  expect(controls.y).toBeGreaterThanOrEqual(picture.y + picture.height - 1);
  await expect(page.locator('[data-cart-screen]')).not.toHaveCSS('position', 'fixed');
  const size = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.width);
  await page.evaluate(() => scrollTo(0, 500));
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await context.close();
});

test('failed import leaves compact project links and a working close button', async ({ page }) => {
  await page.route('**/assets/arcade/**/game.js*', (route) => route.abort());
  await page.goto('/');
  await reveal(page).click();
  await expect(page.locator('[data-cart-fallback]')).toBeVisible();
  await expect(page.locator('[data-cart-screen]')).toBeHidden();
  await page.getByRole('button', { name: 'Close arcade' }).click();
  await expect(reveal(page)).toBeFocused();
});

test('closing during download cannot mount a hidden game', async ({ page }) => {
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  await page.route('**/assets/arcade/**/game.js*', async (route) => { await wait; await route.continue(); });
  await page.goto('/');
  const requested = page.waitForRequest((request) => /\/assets\/arcade\/.+\/game\.js/.test(request.url()));
  await reveal(page).click();
  await requested;
  await page.getByRole('button', { name: 'Close arcade' }).click();
  release();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-cart-screen] canvas')).toHaveCount(0);
  await expect(reveal(page)).toHaveAttribute('aria-expanded', 'false');
});

for (const [name,width,touch,motion] of [['desktop',1440,false,'reduce'],['phone',390,true,'no-preference']]) {
  test(`${name}: game utilities and help remain inside the frame, fullscreen closes cleanly`, async ({ browser }) => {
    const context = await browser.newContext({viewport:{width,height:900},hasTouch:touch,isMobile:touch,reducedMotion:motion});
    const page = await context.newPage();
    const rooms=[];
    page.on('request',request=>{if(/\/rooms\/.*\.json/.test(request.url()))rooms.push(request.url());});
    await page.clock.install();
    await open(page);
    const frame=page.locator('.cart-frame'), screen=page.locator('[data-cart-screen]');
    const canvas=screen.locator('canvas');
    await page.waitForLoadState('networkidle');await page.clock.runFor(14000);
    await expect(canvas).toHaveAttribute('data-stage','title');
    for(const label of [/^Sound (on|off)$/, /^Controls$/, /^Fullscreen$/])await expect(frame.getByRole('button',{name:label})).toBeVisible();
    const controls=frame.getByRole('button',{name:'Controls',exact:true});
    await controls.click();await expect(controls).toHaveAttribute('aria-expanded','true');
    const help=screen.locator('.cc-control-help');
    await expect(help).toBeVisible();await expect(help).toContainText('Tap Punch three times');
    expect(await help.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(11);
    const screenBox=await screen.boundingBox(), panelBox=await screen.locator('.cc-touch-controls').boundingBox();
    expect(panelBox.x).toBeGreaterThanOrEqual(screenBox.x);
    expect(panelBox.y+panelBox.height).toBeLessThanOrEqual(screenBox.y+screenBox.height+1);
    const panel=screen.locator('.cc-touch-controls');
    await expect(panel).toHaveCSS('overflow-y','auto');
    await help.evaluate(el=>el.scrollIntoView({block:'end',behavior:'instant'}));
    const helpBox=await help.boundingBox(), scrolledPanelBox=await panel.boundingBox();
    expect(helpBox.y+helpBox.height).toBeLessThanOrEqual(scrolledPanelBox.y+scrolledPanelBox.height+1);
    const dialogue=screen.locator('.cc-dialogue'), dialogueBox=await dialogue.boundingBox();
    await expect(dialogue).toHaveAttribute('role','status');
    expect(await dialogue.locator('p').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBe(22);
    const bubbleSize=await dialogue.locator('.cc-dialogue-bubble').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight}));
    expect(bubbleSize.content).toBeLessThanOrEqual(bubbleSize.height);
    expect(dialogueBox.y).toBeGreaterThanOrEqual((await canvas.boundingBox()).y+(await canvas.boundingBox()).height-1);
    expect(dialogueBox.y+dialogueBox.height).toBeLessThanOrEqual(scrolledPanelBox.y+1);
    await page.screenshot({path:`/private/tmp/cc-site-arcade-${name}.png`});
    await controls.click();
    await frame.getByRole('button',{name:'Fullscreen',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Game',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:/^Sound (on|off)$/})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog',{name:'Game',exact:true})).toHaveCount(0);
    expect(rooms).toEqual([]);
    await context.close();
  });
}
