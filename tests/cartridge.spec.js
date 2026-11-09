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
  await page.evaluate(() => scrollTo({top:500,behavior:'instant'}));
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
  await expect(page.getByRole('button', { name: /^(Mute|Unmute|Start) sound$/ })).toBeVisible();
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
  await page.locator('[data-cart-close]').click();
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
    await page.route('**/assets/arcade/**/game.js*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:(await response.text()).replace('return mountSource(', 'return window.__arcade = mountSource(')});
    });
    await page.clock.install();
    await open(page);
    const frame=page.locator('.cart-frame'), screen=page.locator('[data-cart-screen]');
    const canvas=screen.locator('canvas');
    await page.waitForLoadState('networkidle');await page.clock.runFor(14000);
    await expect(canvas).toHaveAttribute('data-stage','title');
    const tools=screen.getByRole('group',{name:'Game utilities'});
    const icons=tools.locator(':scope > button');
    await expect(icons).toHaveCount(4);
    for(const label of [/^(Mute|Unmute|Start) sound$/, /^Controls$/, /^Fullscreen$/, /^Close arcade$/]){
      const button=tools.getByRole('button',{name:label});
      await expect(button).toBeVisible();await expect(button.locator('svg')).toBeVisible();
      const box=await button.boundingBox(), header=await tools.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(header.x+header.width-204);
      expect(box.y).toBeGreaterThanOrEqual(header.y);
      expect(box.y+box.height).toBeLessThanOrEqual(header.y+header.height);
    }
    await expect(frame.locator('.cart-head')).toBeHidden();
    await expect(tools.getByRole('button',{name:'Fullscreen',exact:true}).locator('xpath=following-sibling::button[1]')).toHaveAccessibleName('Close arcade');
    const stage=screen.locator('.cc-game-stage'), screenBox=await screen.boundingBox();
    expect((await stage.boundingBox()).height).toBe(touch?180:360);
    expect((await tools.boundingBox()).y+52).toBe((await stage.boundingBox()).y);
    const dialogue=screen.locator('.cc-dialogue');
    await expect(dialogue).toHaveAttribute('role','status');await expect(dialogue).toBeHidden();
    const panel=screen.locator('.cc-touch-controls');
    if(touch){
      await expect(panel).toBeVisible();
      expect((await panel.boundingBox()).y).toBeGreaterThanOrEqual((await stage.boundingBox()).y+(await stage.boundingBox()).height);
    }else await expect(panel).toBeHidden();
    const controls=tools.getByRole('button',{name:'Controls',exact:true});
    await controls.click();await expect(controls).toHaveAttribute('aria-expanded','true');
    const help=screen.getByRole('region',{name:'Controls help'});
    await expect(help).toBeVisible();await expect(help).toContainText('Punch, punch, kick');
    await expect(help.getByRole('button',{name:'Skip fights'})).toBeVisible();
    await expect(help).toHaveCSS('position','absolute');
    expect((await help.boundingBox()).height).toBeLessThanOrEqual(240);
    expect((await screen.boundingBox()).height).toBe(screenBox.height);
    await page.screenshot({path:`/private/tmp/cc-site-arcade-${name}.png`});
    await controls.click();
    await frame.getByRole('button',{name:'Fullscreen',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Game',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Exit fullscreen',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:/^(Mute|Unmute|Start) sound$/})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog',{name:'Game',exact:true})).toHaveCount(0);
    expect(rooms).toEqual([]);
    await tools.getByRole('button',{name:'Mute sound',exact:true}).click();
    await canvas.focus();await page.keyboard.press('Enter');await page.clock.runFor(100);
    await expect(canvas).toHaveAttribute('data-stage','overworld');
    await page.keyboard.down('ArrowRight');await page.clock.runFor(1800);await page.keyboard.up('ArrowRight');
    await page.screenshot({path:`/private/tmp/cc-compact-terry-${name}.png`});
    await page.keyboard.down('ArrowRight');
    await expect.poll(async()=>{
      await page.clock.runFor(100);
      return page.evaluate(()=>window.__arcade.combat.director.active?.id);
    },{intervals:[10]}).toBe('feedback-round');
    await page.keyboard.up('ArrowRight');
    const opening=await page.evaluate(()=>window.__arcade.combat.enemies.map(e=>e.type));
    expect(opening).toHaveLength(4);expect(opening.every(type=>type.endsWith('-reviewer'))).toBe(true);
    await expect.poll(async()=>{
      await page.clock.runFor(100);
      return dialogue.isVisible();
    },{intervals:[10]}).toBe(true);
    await expect(dialogue.locator('p')).toHaveText(/Make the logo bigger\.|It doesn't pop\.|Can we try a few options\?|Just one small change\./);
    await page.screenshot({path:`/private/tmp/cc-office-opening-${name}.png`});
    const speech='Can you explain why you made the button this way?';
    await page.evaluate(async text=>{
      const entry=document.querySelector('[data-cartridge]').dataset.src;
      const {createEnemy}=await import(new URL('./src/combat/enemy.js',new URL(entry,location.href)));
      const combat=window.__arcade.combat;
      const actor=createEnemy('options-reviewer',combat.hero.x+35,'speech-fixture');
      actor.ai.phase='windup';actor.speech={text,frames:180,kind:'windup'};
      combat.enemies=[actor];
    },speech);
    await page.clock.runFor(100);
    await expect(dialogue).toBeVisible();await expect(dialogue.locator('p')).toHaveText(speech);
    await expect(dialogue).toHaveAttribute('data-speaker','options reviewer');
    await expect(dialogue).toHaveAttribute('aria-label',`options reviewer: ${speech}`);
    await expect(stage.locator('.cc-dialogue')).toHaveCSS('position','absolute');
    await expect(dialogue.locator('svg.cc-dialogue-tail')).toBeVisible();
    const bubble=await dialogue.boundingBox(), picture=await canvas.boundingBox();
    expect(bubble.x).toBeGreaterThanOrEqual(picture.x);
    expect(bubble.x+bubble.width).toBeLessThanOrEqual(picture.x+picture.width+1);
    expect(bubble.y).toBeGreaterThanOrEqual(picture.y);
    expect(bubble.y+bubble.height).toBeLessThanOrEqual(picture.y+picture.height);
    expect(await dialogue.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    const head=await page.evaluate(()=>{const e=window.__arcade.combat.enemies.find(e=>e.id==='speech-fixture');return 150+2*(e.y-e.spec.hurt.h);});
    expect(bubble.y+bubble.height).toBeLessThanOrEqual(picture.y+(head+8)*picture.height/180);
    expect((await screen.boundingBox()).height).toBe(screenBox.height);
    await page.screenshot({path:`/private/tmp/cc-actor-speech-${name}.png`});
    await tools.getByRole('button',{name:'Close arcade',exact:true}).click();
    await expect(reveal(page)).toBeFocused();await expect(canvas).toHaveCount(0);
    await reveal(page).click();await expect(canvas).toBeVisible();
    await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
    await page.getByRole('dialog',{name:'Game',exact:true}).getByRole('button',{name:'Close arcade',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Game',exact:true})).toHaveCount(0);
    await expect(reveal(page)).toBeFocused();await expect(canvas).toHaveCount(0);
    await context.close();
  });
}


test('scroll down stays native; scroll up at top reveals with sound without focus', async ({ page }) => {
  await page.clock.install();
  const music=[];
  page.on('request',request=>{if(/\.mp3(?:\?|$)/.test(request.url()))music.push(request.url());});
  await page.addInitScript(()=>{
    window.__audioAttempts=0;
    for(const name of ['AudioContext','webkitAudioContext']){
      if(window[name])window[name]=new Proxy(window[name],{construct(target,args){window.__audioAttempts++;return Reflect.construct(target,args);}});
    }
    window.Audio=new Proxy(window.Audio,{construct(target,args){window.__audioAttempts++;return Reflect.construct(target,args);}});
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){window.__audioAttempts++;return play.apply(this,args);};
  });
  await page.goto('/');
  expect(await page.evaluate(()=>window.__audioAttempts)).toBe(0);
  await reveal(page).hover();
  await page.mouse.wheel(0,500);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await expect(reveal(page)).toHaveAttribute('aria-expanded','false');
  await page.mouse.wheel(0,-10000);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await expect(reveal(page)).toHaveAttribute('aria-expanded','false');
  await page.mouse.wheel(0,-100);
  await expect(page.locator('[data-cart-screen] canvas')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.clock.runFor(14000);
  await expect(page.locator('[data-cart-screen] canvas')).toHaveAttribute('data-stage','title');
  expect(await page.evaluate(()=>document.activeElement===document.body)).toBe(true);
  expect(await page.evaluate(()=>window.__audioAttempts)).toBeGreaterThan(0);
  await expect(page.getByRole('button',{name:'Unmute sound',exact:true})).toHaveCount(0);
  const startSound=page.getByRole('button',{name:'Start sound',exact:true});
  await expect(page.getByRole('button',{name:/^(Start|Mute) sound$/})).toBeVisible();
  expect(music).toEqual([]);
  await page.mouse.wheel(0,500);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  if(await startSound.isVisible()){
    await startSound.click();await page.clock.runFor(100);
    await expect(page.getByRole('button',{name:'Mute sound',exact:true})).toBeVisible();
  }
});

test('wheel ignores zoom, horizontal and form controls; positive and pause reset intent', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const wheel=(delta)=>page.locator('.hero').dispatchEvent('wheel',{deltaY:delta,deltaMode:0});
  await page.locator('.hero').dispatchEvent('wheel',{deltaY:-120,ctrlKey:true});
  await page.locator('.hero').dispatchEvent('wheel',{deltaY:-120,metaKey:true});
  await page.locator('.hero').dispatchEvent('wheel',{deltaY:-10,deltaX:120});
  await page.evaluate(()=>{const field=document.createElement('input');field.type='range';field.id='gesture-range';document.querySelector('.hero').append(field);});
  await page.locator('#gesture-range').dispatchEvent('wheel',{deltaY:-120});
  await expect(reveal(page)).toHaveAttribute('aria-expanded','false');
  await wheel(-60);await wheel(10);await wheel(-60);
  await expect(reveal(page)).toHaveAttribute('aria-expanded','false');
  await page.clock.runFor(200);await wheel(-40);
  await expect(reveal(page)).toHaveAttribute('aria-expanded','false');
  await page.locator('.hero').dispatchEvent('wheel',{deltaY:-4,deltaMode:1});
  await expect(reveal(page)).toHaveAttribute('aria-expanded','true');
});

test('close rejects residual momentum then permits a fresh reveal', async ({ page }) => {
  await page.clock.install();
  await open(page);
  await page.getByRole('button',{name:'Close arcade'}).click();
  await page.locator('.hero').dispatchEvent('wheel',{deltaY:-150});
  await expect(reveal(page)).toHaveAttribute('aria-expanded','false');
  await page.clock.runFor(401);
  await page.locator('.hero').dispatchEvent('wheel',{deltaY:-1,deltaMode:2});
  await expect(reveal(page)).toHaveAttribute('aria-expanded','true');
});

test('touch swipe up scrolls natively; pull down at top reveals without focus',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(), music=[];
  page.on('request',request=>{if(/\.mp3(?:\?|$)/.test(request.url()))music.push(request.url());});
  await page.goto('/');
  const cdp=await context.newCDPSession(page);
  const swipe=async(direction)=>{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:400}]});
    for(const distance of [15,40,85,100])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y:400+direction*distance}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  await swipe(-1);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await expect(reveal(page)).toHaveAttribute('aria-expanded','false');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  // Fresh document ends compositor fling from the preceding native swipe.
  await page.reload();
  await swipe(1);
  await expect(page.locator('[data-cart-screen] canvas')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(()=>document.activeElement===document.body)).toBe(true);
  expect(music).toEqual([]);
  await context.close();
});

test('reveal stays bounded without decorative effects under reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('.cart-effects,.cart-fracture')).toHaveCount(0);
  expect(await reveal(page).evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  await expect(page.locator('[data-cartridge]')).not.toHaveAttribute('data-cart-fx');
});


test('pulling directly on the seam reveals without focus',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto('/');
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:15}]});
  for(const y of [30,55,95,115])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(reveal(page)).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(()=>document.activeElement===document.body)).toBe(true);
  await context.close();
});
