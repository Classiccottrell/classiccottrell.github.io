import { GLYPHS } from '../../art/font/departure.js';

export const FONT_ADVANCE = 7;
export const FONT_HEIGHT = 11;
export const FONT_LINE_HEIGHT = 12;

export function textWidth(s) {
  return [...s].length * FONT_ADVANCE;
}

export function drawText(ctx, s, x, y, color = '#fff') {
  ctx.fillStyle = color;
  for (const ch of s.replace(/[‘’]/g, "'")) {
    const glyph = GLYPHS[ch] || GLYPHS['?'];
    for (let row = 0; row < FONT_HEIGHT; row++) for (let col = 0; col < FONT_ADVANCE; col++) {
      if (glyph[row] & (64 >> col)) ctx.fillRect(x + col, y + row, 1, 1);
    }
    x += FONT_ADVANCE;
  }
}
