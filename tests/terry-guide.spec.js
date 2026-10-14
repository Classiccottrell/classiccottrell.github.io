// The Terry guide, /work/terry-home-lab/guide/: its anchors, the prompt copy
// buttons, the seven-layer exploded view that follows the reader, and the
// public-copy rules for the guide and its case study.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GUIDE } from './helpers.js';

const guide = JSON.parse(readFileSync(new URL('../data/guide.json', import.meta.url), 'utf8'));
const PROMPTS = guide.steps.flatMap((s) => s.blocks.filter((b) => b.prompt).map((b) => b.prompt));
const STEPS = guide.steps.map((s) => s.id);
const CASE = '/work/terry-home-lab/';
const STEP_NAMES = ['The machine', 'The OS', 'The network', 'The services', 'The ports', 'The runbook', 'The backups'];

const settle = (page) => expect(page.locator('#lab-range')).toHaveValue('100');

test('the guide has every anchor, and 7 steps with 11 prompts', async ({ page }) => {
  await page.goto(GUIDE);
  for (const id of [...STEPS, 'questions', 'agents', 'known-mistakes', 'next']) await expect(page.locator(`#${id}`), id).toHaveCount(1);
  await expect(page.locator('.guide-step')).toHaveCount(7);
  await expect(page.locator('[data-copy-prompt]')).toHaveCount(11);
  expect(PROMPTS).toHaveLength(11);
  await expect(page.locator('.last-updated, .g-upd')).toContainText('Last updated: 2026-10-09');
  await expect(page.locator('h1')).toHaveText(guide.title);
});

test('copy buttons copy only the prompt text', async ({ page }) => {
  await page.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__copied.push(t); return Promise.resolve(); } }, configurable: true });
  });
  await page.goto(GUIDE);
  const buttons = page.locator('[data-copy-prompt]');
  for (let i = 0; i < 11; i++) {
    await buttons.nth(i).click();
    await expect(buttons.nth(i).locator('xpath=following-sibling::*[@role="status"]')).toHaveText('Copied');
  }
  expect(await page.evaluate(() => window.__copied)).toEqual(PROMPTS);
  // the live region lives next to the button and is polite
  await expect(buttons.first().locator('xpath=following-sibling::*[@role="status"]')).toHaveAttribute('aria-live', 'polite');
});

test('copy falls back to a textarea when the clipboard API is missing or refuses', async ({ page }) => {
  await page.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    document.execCommand = (cmd) => { window.__copied.push(document.activeElement.value); return cmd === 'copy'; };
  });
  await page.goto(GUIDE);
  const buttons = page.locator('[data-copy-prompt]');
  await buttons.nth(3).click();
  await expect(buttons.nth(3).locator('xpath=following-sibling::*[@role="status"]')).toHaveText('Copied');
  expect(await page.evaluate(() => window.__copied)).toEqual([PROMPTS[3]]);
  expect(await page.locator('textarea').count()).toBe(0);
  await expect(buttons.nth(3)).toBeFocused();
});

test('the slider and the button take it apart and put it back', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(GUIDE);
  await settle(page); // reduced motion: it opens by itself, instantly
  await page.locator('#lab-range').fill('30');
  await expect(page.locator('output[for="lab-range"]')).toHaveText('30%');
  expect(await page.locator('#lab-xv').evaluate((el) => el.style.getPropertyValue('--x'))).toBe('0.300');
  await page.locator('#lab-range').fill('0');
  await expect(page.locator('#lab-btn')).toHaveText('Take it apart');
  await page.locator('#lab-btn').click();
  await expect(page.locator('#lab-range')).toHaveValue('100');
  await expect(page.locator('#lab-btn')).toHaveText('Put it back');
  await page.locator('#lab-btn').click();
  await expect(page.locator('#lab-range')).toHaveValue('0');
});

test('the slider says its value in words', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(GUIDE);
  await settle(page);
  await page.locator('#lab-range').fill('40');
  await expect(page.locator('#lab-range')).toHaveAttribute('aria-valuetext', '40 percent apart');
});

test('no date is printed anywhere in the drawings or the table', async ({ page }) => {
  await page.goto(GUIDE);
  const text = await page.locator('main').evaluate((el) => el.textContent);
  expect(text.replace(/Last updated: 2026-10-09/, '')).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
});

test('it opens by itself the first time it is seen, and by keyboard', async ({ page }) => {
  await page.goto(GUIDE);
  await expect(page.locator('#lab-range')).toHaveValue('100', { timeout: 6000 });
  await page.locator('#lab-range').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('output[for="lab-range"]')).toHaveText('0%');
  await page.locator('#lab-btn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#lab-range')).toHaveValue('100', { timeout: 6000 });
});

test('reduced motion: no animation, the layers are open at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(GUIDE);
  await settle(page);
  expect(await page.locator('#lab-xv').evaluate((el) => el.style.getPropertyValue('--x'))).toBe('1.000');
  const t = await page.locator('.xv-lab .xv-layer').first().evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(t.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
});

test('scroll sync: the layer for the step being read lifts and the others dim', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(GUIDE);
  await settle(page);
  for (let n = 1; n <= 7; n++) {
    await page.evaluate((id) => {
      const top = document.getElementById(id).getBoundingClientRect().top + window.scrollY - 150;
      window.scrollTo({ top, behavior: 'instant' });
    }, STEPS[n - 1]);
    const on = page.locator(`.xv-layer[data-step="${n}"]`);
    await expect(on, `step ${n}`).toHaveClass(/is-on/);
    await expect(page.locator('.xv-layer.is-on')).toHaveCount(1);
    await expect(page.locator('.xv-layer.is-dim')).toHaveCount(6);
    expect(await on.evaluate((el) => getComputedStyle(el).getPropertyValue('--lift'))).toBe('1');
    await expect(page.locator(`.step-index a[data-step="${n}"]`)).toHaveAttribute('aria-current', 'step');
    await expect(page.locator(`.guide-step[data-step="${n}"]`)).toHaveClass(/is-on/);
  }
  // back above the first step: nothing is singled out
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('.xv-layer.is-on')).toHaveCount(0);
  await expect(page.locator('.xv-layer.is-dim')).toHaveCount(0);
});

test('clicking a tag or a layer jumps to its step, with one announcement per jump', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(GUIDE);
  await settle(page);
  await page.evaluate(() => {
    window.__live = [];
    new MutationObserver(() => { const t = document.querySelector('[data-lab-live]').textContent; if (t) window.__live.push(t); })
      .observe(document.querySelector('[data-lab-live]'), { childList: true, characterData: true, subtree: true });
  });
  await page.locator('.xv-tag[data-step="5"]').click();
  await expect(page).toHaveURL(/#step-5-ports$/);
  await expect(page.locator('#step-5-ports h2')).toBeFocused();
  await expect(page.locator('.xv-layer[data-step="5"]')).toHaveClass(/is-on/);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__live)).toEqual(['Step 5 of 7: The ports']);
  await page.locator('.xv-layer[data-step="2"]').dispatchEvent('click');
  await expect(page).toHaveURL(/#step-2-install$/);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__live)).toEqual(['Step 5 of 7: The ports', 'Step 2 of 7: The OS']);
  const top = await page.locator('#step-2-install').evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThan(50);
  expect(top).toBeLessThan(200);
});

test('every layer has a name that matches its step', async ({ page }) => {
  await page.goto(GUIDE);
  const tags = page.locator('.xv-tag');
  await expect(tags).toHaveCount(7);
  for (let n = 1; n <= 7; n++) {
    const tag = page.locator(`.xv-tag[data-step="${n}"]`);
    await expect(tag).toHaveAttribute('href', `#${STEPS[n - 1]}`);
    await expect(tag.locator('span')).toHaveText(STEP_NAMES[n - 1]);
  }
  await expect(page.locator('.step-index a')).toHaveCount(7);
});

test('on a phone the exploded view is sticky above the steps, about 38vh, and never covers a jump', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(GUIDE);
  await settle(page);
  const fig = await page.locator('#lab-xv').boundingBox();
  expect(fig.height).toBeLessThanOrEqual(0.38 * 844 + 1);
  await page.locator('.step-index a[data-step="6"]').click();
  await expect(page.locator('.xv-layer[data-step="6"]')).toHaveClass(/is-on/);
  const dock = await page.locator('.lab-dock').boundingBox();
  const head = await page.locator('#step-6-runbook').boundingBox();
  expect(dock.y).toBeLessThan(70); // pinned under the masthead
  expect(head.y).toBeGreaterThanOrEqual(dock.y + dock.height - 1); // the step starts below it
  expect(dock.height).toBeLessThan(0.5 * 844);
});

for (const [width, height] of [[390, 800], [320, 568]]) {
  test(`Tab never lands under the sticky dock at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(GUIDE);
    await settle(page);
    let seen = 0;
    for (let i = 0; i < 90; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        if (el.closest('footer, .mast, .lab-dock, .skip')) return { skip: el.closest('footer') ? 'end' : true };
        const dock = document.querySelector('.lab-dock');
        if (!(dock.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) return { skip: true }; // above the dock in the page
        const b = el.getBoundingClientRect(), d = dock.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, dock: d.bottom, name: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30) };
      });
      if (!r) continue;
      if (r.skip === 'end') break;
      if (r.skip) continue;
      seen++;
      expect(r.top, `${r.name} under the dock at ${width}x${height}`).toBeGreaterThanOrEqual(r.dock - 1);
      expect(r.bottom).toBeLessThanOrEqual(height + 1);
    }
    expect(seen).toBeGreaterThan(20); // 7 index links, 11 copy buttons, and the rest
  });
}

test('without JavaScript the dock does not stick on a phone', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(GUIDE);
  expect(await page.locator('.lab-dock').evaluate((el) => getComputedStyle(el).position)).toBe('static');
  await page.evaluate(() => window.scrollTo(0, 1500));
  const b = await page.locator('.lab-dock').boundingBox();
  expect(b.y + b.height).toBeLessThan(0); // scrolled away, not pinned
  await ctx.close();
});

test('on a desktop the exploded view stays beside the steps', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(GUIDE);
  await page.evaluate(() => window.scrollTo({ top: 1800, behavior: 'instant' }));
  const dock = await page.locator('.lab-dock').boundingBox();
  const main = await page.locator('.lab-main').boundingBox();
  expect(dock.y).toBeGreaterThan(40);
  expect(dock.y).toBeLessThan(120);
  expect(dock.x).toBeGreaterThan(main.x + main.width);
});

for (const width of [320, 375, 390, 768, 1440]) {
  test(`no horizontal scroll and no colliding tags at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of [GUIDE, CASE]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0);
    }
    await page.goto(GUIDE);
    await settle(page);
    for (const n of [0, 3, 7]) {
      if (n) await page.locator(`.step-index a[data-step="${n}"]`).click();
      const figure = await page.locator('#lab-xv').boundingBox();
      const boxes = await page.locator('.xv-tag').evaluateAll((els) => els.map((el) => {
        const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
        const label = el.querySelector('span');
        const shown = label && getComputedStyle(label).display !== 'none';
        const parts = [r(el.querySelector('b')), ...(shown ? [r(label)] : [])];
        return { parts, lead: r(el.querySelector('.ld')), whole: r(el) };
      }));
      for (let i = 0; i < boxes.length; i++) {
        // the label fits left of its own pin, and inside the figure
        expect(boxes[i].lead.w, `tag ${i} leader at ${width}px`).toBeGreaterThanOrEqual(6);
        for (const p of boxes[i].parts) expect(p.x, `tag ${i} inside figure`).toBeGreaterThanOrEqual(figure.x - 1);
        for (let j = i + 1; j < boxes.length; j++) {
          for (const a of boxes[i].parts) for (const b of boxes[j].parts) {
            const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
            expect(overlap, `tags ${i} and ${j} overlap at ${width}px`).toBe(false);
          }
        }
      }
    }
  });
}

test('no console errors anywhere on the guide', async ({ page }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(GUIDE);
  await expect(page.locator('#lab-range')).toHaveValue('100', { timeout: 6000 });
  await page.locator('[data-copy-prompt]').first().click();
  await page.locator('.xv-tag[data-step="4"]').click();
  await page.locator('#lab-btn').click();
  await page.goto(CASE);
  expect(errors).toEqual([]);
});

test('Known mistakes is a real table', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(GUIDE);
    const table = page.getByRole('table', { name: guide.mistakes.caption });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader')).toHaveText(['What happened', 'Fix']);
    expect(await table.innerText()).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
    await expect(table.getByRole('row')).toHaveCount(guide.mistakes.rows.length + 1);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the guide reads in full: steps, prompts, the exploded view and the step index', async ({ page }) => {
    await page.goto(GUIDE);
    await expect(page.locator('.guide-step')).toHaveCount(7);
    await expect(page.locator('.prompt-t')).toHaveCount(11);
    await expect(page.locator('[data-copy-prompt]').first()).toBeHidden();
    await expect(page.locator('.lab-ctl')).toBeHidden();
    await expect(page.locator('.xv-layer')).toHaveCount(7);
    expect(await page.locator('#lab-xv').evaluate((el) => getComputedStyle(el).getPropertyValue('--x').trim())).toBe('1');
    await expect(page.locator('.xv-tags')).toBeHidden();
    const links = page.locator('.step-index a');
    await expect(links).toHaveCount(7);
    for (let i = 0; i < 7; i++) await expect(links.nth(i)).toHaveAttribute('href', `#${STEPS[i]}`);
    await links.nth(4).click();
    await expect(page).toHaveURL(/#step-5-ports$/);
    await expect(page.locator('#lab-xv figcaption')).toHaveText(/seven layers/);
    await expect(page.locator('table.kt')).toBeVisible();
  });
});

// ---- public copy
const BANNED = /\b(harness|ecosystem|seamless|intuitive|elegant|explore|navigate|robust|dynamic|leverage|journey|innovative)\w*/i;

for (const path of [GUIDE, CASE, '/work/']) {
  test(`public copy rules hold on ${path}`, async ({ page }) => {
    const res = await page.request.get(path);
    const html = await res.text();
    await page.goto(path);
    const visible = await page.evaluate(() => {
      const attrs = [...document.querySelectorAll('[alt],[aria-label],[title]')].map((el) => `${el.getAttribute('alt') || ''} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''}`);
      return `${document.body.innerText}\n${document.body.textContent}\n${attrs.join('\n')}`;
    });
    expect(visible, 'em dash').not.toContain('—');
    expect(html, 'em dash in html').not.toContain('—');
    expect(visible.match(BANNED), 'banned word').toBeNull();
    expect(visible.match(/\b\d{1,3}(\.\d{1,3}){3}\b/), 'ip address').toBeNull();
    expect(visible.match(/\b100\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/), 'tailscale address').toBeNull();
    expect(visible.match(/[\w.-]+:\d{2,5}\b/), 'host:port').toBeNull();
    expect(visible.match(/\bports? \d{2,5}\b/i), 'port number').toBeNull();
    expect(visible.match(/\b[a-z][\w-]*@[\w.-]+/i), 'user@host').toBeNull();
    expect(html.includes('{{') || /SUBSTACK_/.test(visible) || /\{\{/.test(visible), 'placeholder').toBe(false);
    expect(html.match(/href="(#?|\{\{[^"]*)"/), 'dead link').toBeNull();
  });
}

test('the two Substack references are real external links to the combined post', async ({ page }) => {
  const URL = 'https://classiccottrell.substack.com/p/self-hosting-and-homelab-field-notes';
  const html = await (await page.request.get(GUIDE)).text();
  expect(html).not.toContain('TODO(url)');
  await page.goto(GUIDE);
  for (const [scope, label] of [['#step-2-install', 'Field Note 01'], ['#next', 'Field Note 02']]) {
    const a = page.locator(`${scope} a[href="${URL}"]`);
    await expect(a).toHaveCount(1);
    await expect(a).toContainText(`${label}, in Self-Hosting & Homelab Field Notes (on Substack)`);
    await expect(a.locator('span.ext')).toHaveAttribute('aria-hidden', 'true'); // the site's external-link arrow
    expect(await a.getAttribute('target')).toBeNull(); // the site opens no new tabs
  }
});

// ---- the case study and the work index
test('the case study says what is true about its links, and carries the roadmap and the guide button', async ({ page }) => {
  await page.goto(CASE);
  await expect(page.locator('h1')).toHaveText('Terry: Home AI Lab');
  await expect(page.locator('.cs-tb')).toContainText('no repository to link');
  const stages = page.locator('.roadmap li');
  await expect(stages).toHaveCount(6);
  await expect(page.locator('.roadmap')).toContainText('Done');
  await expect(page.locator('.roadmap')).toContainText('In progress');
  await expect(page.locator('.roadmap')).toContainText('Planned');
  await expect(page.locator('a.btn[href="/work/terry-home-lab/guide/"]')).toBeVisible();
  await expect(page.locator('.plate img')).toHaveAttribute('src', /terry-home-lab\.webp/);
  await page.goto('/work/');
  await expect(page.locator('#g-agents ~ .idx a[href="/work/terry-home-lab/"], #g-agents + .idx a[href="/work/terry-home-lab/"]')).toHaveCount(1);
});

test('the old projects.html address for the card still lands on the case study', async ({ page }) => {
  await page.goto('/projects.html#terry-home-ai-lab');
  await expect(page).toHaveURL(/\/work\/terry-home-lab\/$/);
});

// ---- the guide's dock offsets must not leak onto any other page
const OTHER = ['/', '/work/', '/work/terry-time/', '/takes/', '/about/', '/work-with-me/', '/writing/', '/drawings/', '/colophon/'];

for (const [width, height] of [[390, 800], [768, 1024]]) {
  test(`other pages keep scroll-padding-top auto and land anchors near the top at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of OTHER) {
      await page.goto(path);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), path).toBe('auto');
    }
    for (const [path, id] of [['/work-with-me/', 'offers-h'], ['/work-with-me/', 'offer-teardown'], ['/about/', 'rules']]) {
      await page.goto(`${path}#${id}`);
      await page.waitForTimeout(150);
      const top = await page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, id);
      expect(top, `${path}#${id}`).toBeGreaterThanOrEqual(0);
      expect(top, `${path}#${id}`).toBeLessThan(130);
    }
  });
}

test('the guide, on a phone, pads its scrolling for the dock; on a desktop it does not', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(GUIDE);
  const mobile = await page.evaluate(() => ({ pad: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop), dock: document.querySelector('.lab-dock').offsetHeight }));
  expect(mobile.pad).toBeGreaterThan(mobile.dock + 56);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop)).toBe('auto');
});

test('the home slider has value text from load', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#explode')).toHaveAttribute('aria-valuetext', /^\d+ percent apart$/);
});
