// Code-drawn placeholder art for "The Long Causeway" (docs/design.md s3). Canvas-dependent; untested.
// TODO: replace PALETTE with art/palette.json once Codex lands it, and swap layers for real PNGs.
export const PALETTE = [
  '#0e0b1a', '#1d1535', '#2d2250', '#43306b', '#5e3f7e', '#7d4e86', '#a1608a', '#c97a8c',
  '#e89a8a', '#f5be90', '#fbd9a0', '#ffe27a', '#f6c726', '#e29b1c', '#b5651d', '#7a3f22',
  '#3b2a3a', '#2a3a55', '#2f5b7a', '#3f86a0', '#6fb5bf', '#a6dcd5', '#d8f2e6', '#f7f4e8',
  '#1f3a33', '#2f5e45', '#4f8a54', '#86b66a', '#5a5560', '#837c88', '#b3a9ae', '#e0d6d2',
];
const P = PALETTE;

export const WORLD_W = 1600;
export const DOOR_X = 480;
export const GROUND_Y = 150; // hero feet line

function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// Periodic height so the layer tiles seamlessly at width w (integer periods only).
function ridge(w, base, amps) {
  return (x) => {
    let h = base;
    for (const [period, amp, phase] of amps) h += Math.sin(((x / w) * period + phase) * Math.PI * 2) * amp;
    return Math.round(h);
  };
}

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

const SKY_W = 1280; // widest view; one sun, no visible repeat inside a view

function drawSky() {
  const [c, g] = mk(320, 180);
  // Banded gradient with ordered-dither transitions between adjacent bands.
  const bands = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const bandH = 14;
  for (let y = 0; y < 180; y++) {
    const f = y / bandH, i = Math.min(Math.floor(f), bands.length - 2), t = f - i;
    for (let x = 0; x < 320; x++) {
      const thr = BAYER[y & 3][x & 3] / 16;
      const k = t > thr ? i + 1 : i;
      g.fillStyle = P[bands[Math.min(k, bands.length - 1)]];
      g.fillRect(x, y, 1, 1);
    }
  }
  const [wc, wg] = mk(SKY_W, 180);
  for (let x = 0; x < SKY_W; x += 320) wg.drawImage(c, x, 0);
  wg.fillStyle = P[11]; wg.fillRect(228, 74, 22, 22); // signal-yellow sun
  wg.fillStyle = P[10]; wg.fillRect(230, 72, 18, 26);
  wg.fillStyle = P[12]; wg.fillRect(230, 76, 18, 18);
  return wc;
}

function drawMountains() {
  const w = 640, [c, g] = mk(w, 180);
  const far = ridge(w, 100, [[2, 14, 0.1], [5, 6, 0.4], [11, 2, 0.7]]);
  for (let x = 0; x < w; x++) {
    const y = far(x);
    g.fillStyle = P[4]; g.fillRect(x, y, 1, 180 - y);
    g.fillStyle = P[5]; g.fillRect(x, y, 1, 2);
  }
  const near = ridge(w, 122, [[3, 10, 0.3], [7, 4, 0.9]]);
  for (let x = 0; x < w; x++) {
    const y = near(x);
    g.fillStyle = P[3]; g.fillRect(x, y, 1, 180 - y);
  }
  return c;
}

function drawMid() {
  const w = 640, [c, g] = mk(w, 180);
  // Cloud bank: dithered lumps above the horizon.
  const cl = ridge(w, 112, [[4, 6, 0.2], [9, 3, 0.6]]);
  for (let x = 0; x < w; x++) {
    const y = cl(x);
    for (let yy = y; yy < 140; yy++) {
      const thr = BAYER[yy & 3][x & 3] / 16;
      g.fillStyle = (yy - y) / 14 > thr ? P[7] : P[9];
      g.fillRect(x, yy, 1, 1);
    }
  }
  // Tidal flat water.
  for (let y = 140; y < 180; y++) {
    g.fillStyle = P[(y >> 3) % 2 ? 19 : 18]; g.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 24) { g.fillStyle = P[21]; g.fillRect(x + ((x * 7) % 13), 146 + ((x * 3) % 20), 6, 1); }
  return c;
}

function drawGround() {
  const w = 320, [c, g] = mk(w, 180);
  g.fillStyle = P[28]; g.fillRect(0, 154, w, 26);       // causeway bed
  g.fillStyle = P[29]; g.fillRect(0, 154, w, 2);
  g.fillStyle = P[16]; g.fillRect(0, 164, w, 16);       // underside shade
  for (let x = 0; x < w; x += 16) { g.fillStyle = P[30]; g.fillRect(x, 160, 8, 1); }
  // Rail line + posts (periodic every 32px).
  g.fillStyle = P[31]; g.fillRect(0, 140, w, 1);
  g.fillStyle = P[29]; g.fillRect(0, 146, w, 1);
  for (let x = 0; x < w; x += 32) { g.fillStyle = P[29]; g.fillRect(x, 140, 2, 14); }
  return c;
}

export function createLayers() {
  return [
    { name: 'sky', source: drawSky(), factor: 0, ambient: 3 },
    { name: 'far', source: drawMountains(), factor: 0.2, ambient: 0 },
    { name: 'mid', source: drawMid(), factor: 0.5, ambient: 0 },
    { name: 'ground', source: drawGround(), factor: 1, ambient: 0 },
  ];
}

// 16x24 hero block, 2-frame walk bob (frame 1 = 1px lower body, legs swapped).
export function drawHero(g, x, y, frame = 0, facing = 1) {
  x = Math.round(x); y = Math.round(y);
  const bob = frame ? 1 : 0;
  g.fillStyle = P[16]; g.fillRect(x + 3, y + bob, 10, 8);          // head
  g.fillStyle = P[9];  g.fillRect(x + 4, y + 2 + bob, 8, 5);       // face
  g.fillStyle = P[0];  g.fillRect(x + (facing > 0 ? 9 : 5), y + 3 + bob, 2, 2); // eye
  g.fillStyle = P[12]; g.fillRect(x + 2, y + 8 + bob, 12, 9);      // jacket (signal yellow)
  g.fillStyle = P[17]; g.fillRect(x + 4, y + 17, 3, 7 - (frame ? 0 : 1));
  g.fillRect(x + 9, y + 17, 3, 7 - (frame ? 1 : 0));
}

// Sign/door marker placeholder at DOOR_X: post + board.
export function drawDoorMarker(g, screenX, active = false) {
  const x = Math.round(screenX), y = GROUND_Y - 40;
  g.fillStyle = P[15]; g.fillRect(x + 7, y + 14, 2, 26);
  g.fillStyle = active ? P[11] : P[13]; g.fillRect(x, y, 16, 16);
  g.fillStyle = P[0]; g.fillRect(x + 6, y + 4, 4, 9); g.fillRect(x + 6, y + 2, 4, 1);
}
