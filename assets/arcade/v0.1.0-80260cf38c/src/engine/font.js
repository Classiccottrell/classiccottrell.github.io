import { GLYPHS } from '../../art/font/silkscreen.js';

export const FONT_ADVANCE = 6;
export const FONT_HEIGHT = 5;
export const FONT_LINE_HEIGHT = 6;

export function textWidth(s) {
  const length = [...s.toUpperCase()].length;
  return length ? length * FONT_ADVANCE - 1 : 0;
}

export function drawText(ctx, s, x, y, color = '#fff') {
  ctx.fillStyle = color;
  for (const ch of s.toUpperCase()) {
    const glyph = GLYPHS[ch] || GLYPHS['?'];
    for (let row = 0; row < FONT_LINE_HEIGHT; row++) for (let col = 0; col < 5; col++) {
      if (glyph[row] & (16 >> col)) ctx.fillRect(x + col, y + row, 1, 1);
    }
    x += FONT_ADVANCE;
  }
}
