// Tiny shared lighting helper. Palette-only: light is an ordered-dither mask of ONE palette colour (opaque pixels,
// binary alpha), prerendered once; "breathing" steps between a few prerendered densities. No per-frame pixel loops.
import { PAL } from './pal.js';
import { BAYER } from '../../art/overworld/tools/gen-util.js';

// Time-of-day tint is a palette choice, not an overlay: which indices carry glow, rim and shadow.
export const TIME_OF_DAY = 'sunset';
export const LIGHTING = {
  sunset: { glow: 26, core: 28, rim: 26, shadow: 0 },
  dusk: { glow: 25, core: 26, rim: 25, shadow: 0 },
};
export const lighting = (tod = TIME_OF_DAY) => LIGHTING[tod] ?? LIGHTING.sunset;

const thr = (x, y) => (BAYER[y & 3][x & 3] + .5) / 16;

// Pure: elliptical dither disc, coverage = level * falloff. Returns Uint8Array(w*h) of 0/1.
export function discMask(w, h, level) {
  const m = new Uint8Array(w * h), cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2));
    if (d < 1 && level * Math.pow(1 - d, 1.4) > thr(x, y)) m[y * w + x] = 1;
  }
  return m;
}

// Pure: silhouette rim. alpha = w*h (non-zero = opaque). Lights opaque pixels 2..4 px inside the silhouette edge that faces
// `side` (+1 right, -1 left), so the 1px ink outline stays untouched; Bayer-thresholded by level (0..1).
export function silhouetteRim(alpha, w, h, side, level) {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!alpha[y * w + x]) continue;
    let d = 1, nx = x + side;
    while (d < 5 && nx >= 0 && nx < w && alpha[y * w + nx]) { d++; nx += side; }
    if (d >= 2 && d <= 4 && level * (5 - d) / 3 > thr(x, y)) m[y * w + x] = 1;
  }
  return m;
}

// Pure: ping-pong breathing index in [0, steps-1]; reduced motion holds the middle level.
export function breathIndex(time, period, steps, reduced = false) {
  if (reduced) return steps >> 1;
  const u = ((time / period) % 1 + 1) % 1, tri = u < .5 ? u * 2 : 2 - u * 2;
  return Math.min(steps - 1, Math.floor(tri * steps));
}

// Pure: low-amplitude flicker index in [0, levels-1]; mostly the middle two, brief excursions by a hash of time bucket.
export function flickerIndex(time, levels, reduced = false, rate = 2) {
  const mid = levels >> 1;
  if (reduced) return mid;
  const k = Math.floor(time * rate);
  const r = (Math.imul(k ^ 0x9E3779B9, 0x85EBCA6B) >>> 0) / 4294967296;
  return r < .12 ? Math.max(0, mid - 1) : r > .88 ? Math.min(levels - 1, mid) : mid;
}

// Browser: paint a 0/1 mask as one palette colour. make(w,h) -> [canvas, ctx].
export function maskCanvas(mask, w, h, colorIndex, make) {
  const [canvas, g] = make(w, h);
  g.fillStyle = PAL[colorIndex];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) g.fillRect(x, y, 1, 1);
  return canvas;
}

// Prerendered glow set: `steps` canvases with rising density. Drawn at world scale via draw(), 1 mask px = 0.5 world px.
export function createGlow(make, { w = 96, h = 24, steps = 4, min = .3, max = .75, color = lighting().glow } = {}) {
  const levels = Array.from({ length: steps }, (_, i) => maskCanvas(discMask(w, h, min + (max - min) * i / (steps - 1)), w, h, color, make));
  return {
    w, h, levels,
    draw(ctx, cx, cy, index) { ctx.drawImage(levels[index], cx - w / 4, cy - h / 4, w / 2, h / 2); },
  };
}

// A continuous core grounds the boots; only the narrow outer edge uses dither.
export function shadowMask(w,h) {
  const mask=new Uint8Array(w*h),cx=(w-1)/2,cy=(h-1)/2;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const d=Math.hypot((x-cx)/(w/2),(y-cy)/(h/2));
    if(d<.82 || (d<1 && (1-d)*4>thr(x,y)))mask[y*w+x]=1;
  }
  return mask;
}

export function createShadow(make, { w = 48, h = 6 } = {}) {
  const canvas = maskCanvas(shadowMask(w,h), w, h, lighting().shadow, make);
  return { w, h, draw(ctx, cx, cy) { ctx.drawImage(canvas, cx - w / 4, cy - h / 4, w / 2, h / 2); } };
}

// Lazy per-frame rim cache for a sprite sheet. alphaOf(frame) -> Uint8Array(frame.w*frame.h); canvases built on first use.
export const RIM_LEVELS = [.35, .55, .75, .95];
export function createRimCache(make, alphaOf, color = lighting().rim) {
  const cache = new Map();
  return (frame, side, index) => {
    const i = Math.max(0, Math.min(RIM_LEVELS.length - 1, index)), key = `${frame.name}|${side}|${i}`;
    if (!cache.has(key)) cache.set(key, maskCanvas(silhouetteRim(alphaOf(frame), frame.w, frame.h, side, RIM_LEVELS[i]), frame.w, frame.h, color, make));
    return cache.get(key);
  };
}
