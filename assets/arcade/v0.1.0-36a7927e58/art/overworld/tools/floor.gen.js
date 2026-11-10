// Causeway floor at 2x pixel density: 640x360 px = one 320x180 world tile (feet line world y=150 -> px row 300).
// Palette-index buffer using stable indices only; every feature period divides 640 so the tile wraps without seams.
import { createBuffer, mulberry32, bayer, CLEAR } from './gen-util.js';

export const FLOOR_W = 640, FLOOR_H = 360, FEET_PX = 300;
const INK = 0, SLATE = 1, STONE = 2, CREAM = 3, WOOD_L = 24, WOOD_M = 25, SUN = 26, BRASS_L = 28, CHAR = 29;
export const POST_EVERY = 64;

export function generateFloor(seed = 150) {
  const b = createBuffer(FLOOR_W, FLOOR_H), rnd = mulberry32(seed);
  // --- Rail (behind the hero): lit top edge, bolted posts, lower bar. Gaps stay transparent for the water.
  const R0 = 276;
  b.fill(0, R0, 639, R0, CREAM);                 // rim highlight catching the sunset
  for (let x = 0; x < 640; x++) if (x % 4 < 2) b.put(x, R0, SUN);   // warm dither on the highlight
  b.fill(0, R0 + 1, 639, R0 + 3, STONE);
  b.fill(0, R0 + 4, 639, R0 + 5, SLATE);
  b.fill(0, R0 + 6, 639, R0 + 6, INK);
  b.fill(0, R0 + 16, 639, R0 + 17, SLATE); b.fill(0, R0 + 15, 639, R0 + 15, STONE); b.fill(0, R0 + 18, 639, R0 + 18, INK);
  for (let px = 0; px < 640; px += POST_EVERY) {
    const x0 = px + 4;
    b.fill(x0 - 1, R0, x0 + 6, 299, INK);
    b.fill(x0, R0 + 1, x0 + 5, 299, SLATE);
    b.fill(x0, R0 + 1, x0 + 1, 299, STONE);          // lit left edge
    b.fill(x0 + 5, R0 + 1, x0 + 5, 299, CHAR);        // shaded right edge
    b.fill(x0, R0 + 1, x0 + 1, R0 + 1, CREAM);
    for (const by of [R0 + 4, R0 + 20]) { b.fill(x0 + 2, by, x0 + 3, by + 1, CREAM); b.put(x0 + 3, by + 1, INK); } // bolts
    for (let y = R0 + 24; y < 298; y++) if (rnd() < .12) b.put(x0 + 1 + Math.floor(rnd() * 4), y, CHAR); // rust-dark pitting
  }
  // --- Walkway top face (rows 300-311): warm near the rim, cooling away from the sun.
  for (let y = 300; y <= 311; y++) {
    const warm = Math.max(0, 1 - (y - 300) / 9); // 1 at the rim -> 0
    for (let x = 0; x < 640; x++) {
      let c = STONE;
      if (warm > bayer(x, y)) c = warm > .65 ? SUN : WOOD_M;
      else if ((1 - warm) * .35 > bayer(x + 2, y + 1)) c = SLATE;
      b.put(x, y, c);
    }
  }
  b.fill(0, 300, 639, 300, CREAM);
  for (let x = 0; x < 640; x++) if (x % 4 >= 2) b.put(x, 300, SUN);
  // Plank/bed seams (staggered per band) and gravel speckle.
  for (const [y0, y1, off] of [[302, 305, 0], [306, 309, 32]]) {
    for (let x = off; x < 640; x += 64) b.fill(x, y0, x, y1, SLATE);
    b.fill(0, y1 + 1 > 310 ? 310 : y1 + 1, 639, y1 + 1 > 310 ? 310 : y1 + 1, SLATE);
  }
  for (let i = 0; i < 96; i++) { const x = Math.floor(rnd() * 640), y = 302 + Math.floor(rnd() * 9); b.put(x, y, rnd() < .5 ? SLATE : (rnd() < .5 ? CREAM : WOOD_M)); }
  // Worn patches: lighter dithered ovals (kept off the tile borders).
  for (let i = 0; i < 6; i++) {
    const cx = 40 + Math.floor(rnd() * 560), cy = 304 + Math.floor(rnd() * 4), rx = 10 + Math.floor(rnd() * 14);
    for (let y = 301; y <= 310; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / 4);
      if (d < 1 && (1 - d) * .7 > bayer(x, y)) b.put(x, y, CREAM);
    }
  }
  // Regular drainage slots give the walkway structure without busy gravel noise.
  for (let x=32;x<640;x+=128) {
    b.fill(x,306,x+7,308,INK); b.fill(x,305,x+7,305,SLATE);
    b.put(x+7,309,STONE);
  }
  b.fill(0, 311, 639, 311, INK);
  // --- Front face (rows 312-359): stone courses in cool slate, staggered, darker with depth.
  for (let y = 312; y < FLOOR_H; y++) {
    const depth = (y - 312) / 47;
    for (let x = 0; x < 640; x++) b.put(x, y, depth > bayer(x, y) ? CHAR : SLATE);
  }
  for (let row = 0, y = 316; y < FLOOR_H; row++, y += 10) {
    b.fill(0, y, 639, y, INK);
    for (let x = (row % 2) * 32; x < 640; x += 64) b.fill(x, y + 1, x, y + 9, INK);
    for (let x = 0; x < 640; x++) if (y + 1 < FLOOR_H && (x + row * 7) % 64 < 54 && ((x * 7 + row) % 11) === 0) b.put(x, y + 1, STONE); // lit block tops
  }
  for (let i = 0; i < 56; i++) b.put(Math.floor(rnd() * 640), 313 + Math.floor(rnd() * 20), rnd() < .6 ? STONE : INK);
  return b;
}

// Water glint seeds: tiny dashes in the rail gaps and just below the walkway; each takes one step of the water ramp.
export function generateGlints(seed = 16, count = 28) {
  const rnd = mulberry32(seed), out = [];
  for (let i = 0; i < count; i++) {
    const inGap = i % 4 !== 3;
    out.push({
      x: Math.floor(rnd() * 636),                           // image px
      y: inGap ? 283 + Math.floor(rnd() * 8) : 296 + Math.floor(rnd() * 3),
      len: 2 + 2 * Math.floor(rnd() * 3),
      phase: Math.floor(rnd() * 8),
    });
  }
  return out.filter(g => !(g.y < 299 && (g.x % POST_EVERY) < 12 && (g.x % POST_EVERY) > 2)); // keep posts clear
}

// Dust motes / heat shimmer: at most 6, drifting right and bobbing. Pure in (time, viewW); reduced motion pins time to 0.
export const MAX_MOTES = 6;
export function dustMotes(time, viewW, reduced = false) {
  const t = reduced ? 0 : time, out = [];
  for (let i = 0; i < MAX_MOTES; i++) {
    const seed = mulberry32(900 + i)(), v = 3 + i * .8;
    const x = ((seed * viewW + t * v) % viewW + viewW) % viewW;
    const y = 150 - (14 + ((seed * 977) % 1) * 34) + Math.sin(t * .8 + i * 1.7) * 1.5;
    out.push({ x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2, bright: (Math.floor(t * 1.5 + i) & 1) === 0 });
  }
  return out;
}
export { CLEAR };
