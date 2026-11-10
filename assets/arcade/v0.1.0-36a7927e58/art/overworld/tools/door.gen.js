// Overworld door at 2x pixel density: 56x104 px = 28x52 world units (door body 24 wide + 2 each side for the step).
// Output is a palette-index buffer (stable indices only: no 8-23 cycling ramps) so it is palette-only by construction.
import { createBuffer, mulberry32, bayer, CLEAR } from './gen-util.js';

export const DOOR_IMG_W = 56;
export const DOOR_IMG_H = 104;
export const WINDOW = { x: 14, y: 13, w: 28, h: 20 };       // glass interior, image px
export const WINDOW_LEVELS = 4;                              // flicker variants, dim..bright
const INK = 0, SLATE = 1, STONE = 2, CREAM = 3, RUST = 5, RUST_L = 6, LEATHER = 7;
const WOOD_L = 24, WOOD_M = 25, SUN = 26, BRASS = 27, BRASS_L = 28, CHAR = 29;

export function generateDoor(seed = 480) {
  const b = createBuffer(DOOR_IMG_W, DOOR_IMG_H), rnd = mulberry32(seed);
  // Stone frame with lit top/left edge, shaded bottom/right.
  b.fill(4, 2, 51, 97, INK);
  b.fill(5, 3, 50, 97, STONE);
  b.fill(5, 3, 50, 4, CREAM); b.fill(5, 3, 6, 97, CREAM);
  b.fill(49, 5, 50, 97, SLATE); b.fill(7, 96, 50, 97, SLATE);
  for (let i = 0; i < 40; i++) b.put(7 + Math.floor(rnd() * 41), 6 + Math.floor(rnd() * 88), rnd() < .5 ? SLATE : CREAM); // stone grain
  // Small mortar joints make the stone read as blocks rather than random grain.
  for (const y of [22, 50, 78]) { b.fill(5,y,7,y,SLATE); b.fill(48,y+8,50,y+8,SLATE); }
  // Door leaf: leather wood, vertical planks with grain.
  b.fill(8, 7, 47, 96, INK);
  b.fill(9, 8, 46, 96, LEATHER);
  for (let x = 9; x <= 46; x++) {
    const plank = Math.floor((x - 9) / 7);
    if ((x - 9) % 7 === 0) { b.fill(x, 36, x, 96, INK); continue; }          // plank seam
    if ((x - 9) % 7 === 1) b.fill(x, 36, x, 96, WOOD_L);                      // lit plank edge
    for (let y = 36; y < 96; y++) if (rnd() < .07 + (plank % 2) * .03) b.put(x, y, rnd() < .5 ? RUST : WOOD_M);
  }
  // Raised panels over the planks.
  for (const [y0, y1] of [[40, 64], [68, 92]]) {
    b.frame(13, y0, 42, y1, INK);
    b.fill(14, y0 + 1, 41, y0 + 1, WOOD_L); b.fill(14, y0 + 1, 14, y1 - 1, WOOD_L);
    b.fill(15, y1 - 1, 41, y1 - 1, RUST); b.fill(41, y0 + 2, 41, y1 - 1, RUST);
  }
  // Brushed metal kick plate, inset screws and a worn upper rim.
  b.fill(15,87,40,93,INK); b.fill(16,88,39,92,CHAR);
  b.fill(16,87,39,87,STONE); b.fill(16,88,16,91,SLATE);
  for (const x of [18,37]) {b.put(x,89,BRASS_L);b.put(x,90,INK);}
  // Transom window: dark frame, mullions; glass is painted per flicker level.
  b.frame(WINDOW.x - 1, WINDOW.y - 1, WINDOW.x + WINDOW.w, WINDOW.y + WINDOW.h, INK);
  b.fill(WINDOW.x - 1, WINDOW.y + WINDOW.h + 1, WINDOW.x + WINDOW.w, WINDOW.y + WINDOW.h + 1, WOOD_L); // sill
  b.fill(9, 8, 46, 12, LEATHER); b.fill(9, 34, 46, 35, INK);
  // Hinges (left) and handle + keyhole (right).
  for (const y of [46, 78]) { b.fill(9, y, 13, y + 5, INK); b.fill(10, y + 1, 12, y + 4, CHAR); b.put(10, y + 1, STONE); b.put(11, y + 2, BRASS_L); }
  b.fill(38, 63, 42, 71, INK); b.fill(39, 64, 41, 70, BRASS); b.fill(39, 64, 39, 66, BRASS_L); b.put(40, 67, INK);
  b.fill(36, 66, 37, 68, BRASS); b.put(36, 66, BRASS_L);
  // Step: lit top, shaded front, speckle.
  b.fill(0, 98, 55, 103, INK);
  b.fill(1, 98, 54, 99, STONE); b.fill(1, 98, 54, 98, CREAM);
  b.fill(1, 100, 54, 102, SLATE); b.fill(1, 100, 54, 100, STONE);
  for (let i = 0; i < 18; i++) b.put(2 + Math.floor(rnd() * 52), 99 + Math.floor(rnd() * 4), rnd() < .5 ? STONE : CHAR);
  b.fill(0, 98, 0, 98, CLEAR); b.fill(55, 98, 55, 98, CLEAR); // soften the step corners
  return b;
}

// Warm interior seen through the transom. level 0..3 = dim..bright; returns WINDOW.w*WINDOW.h indices.
export function generateWindow(level, seed = 7) {
  const rnd = mulberry32(seed), out = new Uint8Array(WINDOW.w * WINDOW.h);
  const shelves = [3, 8, 13, 18].map(x => x + Math.floor(rnd() * 2));
  for (let y = 0; y < WINDOW.h; y++) for (let x = 0; x < WINDOW.w; x++) {
    const heat = (y / WINDOW.h) * .55 + .2 + level * .12; // brighter toward the floor of the room, and with level
    let c = heat > bayer(x, y) ? (heat > .8 ? BRASS_L : SUN) : WOOD_M;
    if (shelves.some(s => x >= s && x < s + 2) && y > 4) c = INK;      // shelving silhouettes
    else if (y % 6 === 5 && x > 1 && x < WINDOW.w - 2) c = LEATHER;    // shelf boards
    out[y * WINDOW.w + x] = c;
  }
  // mullion cross
  for (let y = 0; y < WINDOW.h; y++) out[y * WINDOW.w + 13] = out[y * WINDOW.w + 14] = LEATHER;
  for (let x = 0; x < WINDOW.w; x++) out[9 * WINDOW.w + x] = LEATHER;
  return out;
}
