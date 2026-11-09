// Code-drawn placeholder sprite registry. Each entry: { w, h, wall?: y, draw(g, x, y) }.
// Floor props sit on FLOOR_Y; wall props use fixed `wall` y. No DOM at import time.
import { PALETTE as P } from '../engine/placeholder.js';
import { FLOOR_Y } from '../../art/rooms/vpat-vault/backdrop.js';

const rect = (g, c, x, y, w, h) => { g.fillStyle = P[c]; g.fillRect(x, y, w, h); };

function stampRow(g, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const sx = x + i * 8;
    rect(g, color, sx, y, 6, 5);
    rect(g, 23, sx + 1, y + 3, 1, 1); rect(g, 23, sx + 2, y + 4, 1, 1); rect(g, 23, sx + 3, y + 3, 1, 1); rect(g, 23, sx + 4, y + 1, 1, 2);
  }
}

function poster(g, x, y, rows, pendingLast) {
  rect(g, 0, x, y, 48, 44);
  rect(g, 23, x + 1, y + 1, 46, 42);
  rect(g, 29, x + 6, y + 4, 36, 2); // heading bar
  for (let r = 0; r < rows; r++) {
    const pending = pendingLast && r === rows - 1;
    stampRow(g, x + 4, y + 10 + r * 8, 5, pending ? 13 : 26);
  }
  rect(g, 11, x + 22, y - 2, 4, 3); // pin
}

export const SPRITES = {
  drawer: { w: 24, h: 64, draw(g, x, y) {
    rect(g, 0, x, y, 24, 64); rect(g, 14, x + 1, y + 1, 22, 62);
    for (let i = 0; i < 4; i++) {
      const dy = y + 2 + i * 15;
      rect(g, 15, x + 2, dy, 20, 13); rect(g, 13, x + 2, dy, 20, 1);
      rect(g, 23, x + 7, dy + 2, 10, 4); rect(g, 0, x + 9, dy + 3, 6, 1); // label
      rect(g, 11, x + 9, dy + 8, 6, 2); // pull
    }
  } },
  desk: { w: 200, h: 34, draw(g, x, y) {
    rect(g, 0, x, y, 200, 8); rect(g, 13, x, y, 200, 5); rect(g, 12, x, y, 200, 1);
    rect(g, 14, x + 4, y + 8, 192, 3);
    rect(g, 15, x + 6, y + 11, 8, 23); rect(g, 15, x + 186, y + 11, 8, 23);
    rect(g, 14, x + 14, y + 12, 172, 14); rect(g, 0, x + 14, y + 12, 172, 1);
    for (let i = 0; i < 3; i++) rect(g, 11, x + 36 + i * 52, y + 18, 6, 2);
  } },
  lamp: { w: 16, h: 28, draw(g, x, y) {
    rect(g, 0, x + 3, y + 25, 10, 3); rect(g, 29, x + 7, y + 8, 2, 17);
    rect(g, 0, x + 1, y + 1, 14, 9); rect(g, 12, x + 2, y + 2, 12, 7); rect(g, 11, x + 4, y + 3, 8, 3);
  } },
  poster_row_signed: { w: 48, h: 44, wall: 84, draw(g, x, y) { poster(g, x, y, 4, false); } },
  poster_row_pending: { w: 48, h: 44, wall: 84, draw(g, x, y) { poster(g, x, y, 4, true); } },
  stamp: { w: 10, h: 14, draw(g, x, y) {
    rect(g, 15, x + 3, y, 4, 5); rect(g, 7, x + 2, y + 5, 6, 3); rect(g, 0, x + 1, y + 8, 8, 6); rect(g, 26, x + 1, y + 11, 8, 3);
  } },
  inkpad: { w: 16, h: 5, draw(g, x, y) { rect(g, 0, x, y, 16, 5); rect(g, 26, x + 2, y + 1, 12, 2); } },
  pen: { w: 14, h: 3, draw(g, x, y) { rect(g, 12, x, y, 3, 3); rect(g, 17, x + 3, y, 9, 3); rect(g, 0, x + 12, y + 1, 2, 1); } },
  ledger: { w: 20, h: 8, draw(g, x, y) {
    rect(g, 0, x, y, 20, 8); rect(g, 5, x + 1, y + 1, 18, 6); rect(g, 23, x + 3, y + 2, 14, 3);
    rect(g, 11, x, y, 1, 8); rect(g, 26, x + 4, y + 3, 2, 1); rect(g, 26, x + 8, y + 3, 2, 1); rect(g, 13, x + 12, y + 3, 2, 1);
  } },
};

// Physical room sizes; scale the loading fallback along with the authored PNGs.
const roomSizes={drawer:[18,48],desk:[144,20],lamp:[10,16],poster_row_signed:[28,24],poster_row_pending:[28,24],stamp:[6,8],inkpad:[12,4],pen:[10,2],ledger:[14,6]};
for(const [name,[w,h]] of Object.entries(roomSizes)){
  const sprite=SPRITES[name],{w:sourceW,h:sourceH,draw}=sprite;
  Object.assign(sprite,{w,h,draw(g,x,y){g.save();g.translate(x,y);g.scale(w/sourceW,h/sourceH);draw(g,0,0);g.restore();}});
  if(sprite.wall!==undefined)sprite.wall=96;
}

export const SPRITE_NAMES = Object.keys(SPRITES);

// Props that sit on the desk top rather than the floor.
const ON_DESK = new Set(['lamp', 'stamp', 'inkpad', 'pen', 'ledger']);
const DESK_TOP = FLOOR_Y - SPRITES.desk.h + 1;

export function spriteY(name) {
  const s = SPRITES[name];
  if (s.wall !== undefined) return s.wall;
  if (ON_DESK.has(name)) return DESK_TOP - s.h;
  return FLOOR_Y - s.h;
}
