// Runtime copy of art/palette.json (a test keeps them identical) plus helpers to paint index buffers.
export const PAL = [
  '#19232D', '#48525A', '#9E9B8C', '#F5E6C8', '#FFD400', '#A44F38', '#D67C4B', '#694432',
  '#B36A67', '#C47B70', '#D58D79', '#E6A184', '#F0B68E', '#F5C99B', '#F8DAAB', '#FBE7BE',
  '#294B58', '#305966', '#386874', '#427982', '#528B8F', '#6AA19E', '#8BB7AA', '#B7CEB8',
  '#AF7250', '#DA9B68', '#F4C28C', '#B98A24', '#FFE778', '#35373A', '#508B83', '#FFF6DC',
];
export const CYCLES = {
  sky: { start: 8, end: 15, stepMs: 700, direction: 1 },
  water: { start: 16, end: 23, stepMs: 220, direction: -1 },
};

// Palette index shown at ramp position `i` after `step` cycle steps (pure; reduced motion passes step 0).
export function cycled(cycle, i, step) {
  const n = cycle.end - cycle.start + 1;
  return cycle.start + ((((i + cycle.direction * step) % n) + n) % n);
}
export const cycleStep = (cycle, time, reduced = false) => reduced ? 0 : Math.floor(time * 1000 / cycle.stepMs);

// Paints a palette-index buffer (CLEAR=255 transparent) into a fresh canvas made by make(w,h) -> [canvas, ctx].
export function paintIndexed(pix, w, h, make, x0 = 0, y0 = 0, target = null) {
  const [canvas, g] = target ?? make(w, h);
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const i = pix[y * w + x];
      if (i === 255) { x++; continue; }
      let run = 1;
      while (x + run < w && pix[y * w + x + run] === i) run++;
      g.fillStyle = PAL[i]; g.fillRect(x0 + x, y0 + y, run, 1);
      x += run;
    }
  }
  return canvas;
}
