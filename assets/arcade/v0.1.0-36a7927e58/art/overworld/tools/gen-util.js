// Shared helpers for the deterministic palette-index generators (door, floor). Pure, no DOM.
export const CLEAR = 255; // transparent sentinel in an index buffer

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a over the bytes; compact stable fingerprint for determinism tests.
export function hashBuffer(buf) {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i++) h = Math.imul(h ^ buf[i], 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const bayer = (x, y) => (BAYER[y & 3][x & 3] + .5) / 16;

export function createBuffer(w, h, fill = CLEAR) {
  const pix = new Uint8Array(w * h).fill(fill);
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  return {
    w, h, pix,
    put(x, y, i) { if (inb(x, y)) pix[y * w + x] = i; },
    get(x, y) { return inb(x, y) ? pix[y * w + x] : CLEAR; },
    fill(x0, y0, x1, y1, i) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, i); },
    frame(x0, y0, x1, y1, i) { this.fill(x0, y0, x1, y0, i); this.fill(x0, y1, x1, y1, i); this.fill(x0, y0, x0, y1, i); this.fill(x1, y0, x1, y1, i); },
  };
}
