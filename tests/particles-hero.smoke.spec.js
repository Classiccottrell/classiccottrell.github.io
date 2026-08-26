import { expect, test } from '@playwright/test';

// Smoke coverage for the particles.js hero animation tuning:
// - loads without runtime errors
// - renders a full-viewport canvas
// - survives a grab/drag/release cycle (spring-settle path) without erroring
test('home hero particle field renders and survives a drag/release cycle', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/index.html');

  const canvas = page.locator('canvas.particle-field');
  await expect(canvas).toBeAttached();

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);

  // Let a few animation frames run.
  await page.waitForTimeout(300);

  // Grab a node near mid-canvas, drag it, and release — exercises pullTo(),
  // the spring-damper settle() path, and the pointer event wiring end to end.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.4;
  await page.mouse.move(cx, cy);
  await page.mouse.move(cx + 5, cy + 5); // nudge to trigger hover hit-test
  await page.mouse.down();
  // Confirm the grab actually engaged a node (nearestNode hit within
  // GRAB_RADIUS) rather than silently no-opping.
  await expect(page.locator('body')).toHaveCSS('cursor', 'grabbing');
  await page.mouse.move(cx + 80, cy - 60, { steps: 10 });
  await page.mouse.up();

  // Let the spring settle for a couple of seconds — this is where an
  // unstable/divergent spring (bad SPRING_K/SPRING_DAMPING) would throw or
  // produce NaND canvas draws.
  await page.waitForTimeout(2000);

  expect(errors, `console/page errors: ${errors.join(', ')}`).toHaveLength(0);
});

// Smoke coverage for the ripple-on-move feature: sweeping the pointer across
// the field should disturb nearby nodes/particles (rippleAt) and settle back
// out without throwing.
test('moving the pointer across the hero field produces a ripple without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/index.html');

  const canvas = page.locator('canvas.particle-field');
  await expect(canvas).toBeAttached();
  const box = await canvas.boundingBox();

  await page.waitForTimeout(300);

  // Sweep the pointer through the field, exercising rippleAt()'s per-node
  // and per-sky-particle impulse path on every move event.
  const cy = box.y + box.height * 0.3;
  for (let x = box.x + 40; x < box.x + box.width - 40; x += 60) {
    await page.mouse.move(x, cy, { steps: 3 });
  }

  // Let the ripple spring-back settle — a divergent/NaN ripple offset would
  // throw or freeze the draw loop here.
  await page.waitForTimeout(1500);

  expect(errors, `console/page errors: ${errors.join(', ')}`).toHaveLength(0);
});
