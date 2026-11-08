// Overworld door: "VPAT VAULT" sign over a 2x-density door (stone frame, wood leaf, warm transom).
// Footprint stays 24x52 world units (plus a 2-unit step each side); art is generated in art/overworld/tools/door.gen.js.
import { GROUND_Y } from '../engine/placeholder.js';
import { drawText, textWidth } from '../engine/font.js';
import { PAL, paintIndexed } from '../engine/pal.js';
import { flickerIndex } from '../engine/light.js';
import { generateDoor, generateWindow, DOOR_IMG_W, DOOR_IMG_H, WINDOW, WINDOW_LEVELS } from '../../art/overworld/tools/door.gen.js';

export const doorAvailable = (near,arena) => near && !arena;
export const DOOR_W = 24;
export const DOOR_H = 52;
const STEP_PAD = (DOOR_IMG_W / 2 - DOOR_W) / 2; // world units the step overhangs each side

export function createDoorArt(make) {
  const buf = generateDoor();
  const body = paintIndexed(buf.pix, DOOR_IMG_W, DOOR_IMG_H, make);
  const windows = Array.from({ length: WINDOW_LEVELS }, (_, i) => paintIndexed(generateWindow(i), WINDOW.w, WINDOW.h, make));
  return { body, windows };
}

// Which transom brightness level to show (pure; reduced motion holds a constant level).
export const doorWindowLevel = (time, active, reduced) => Math.min(WINDOW_LEVELS - 1, flickerIndex(time, WINDOW_LEVELS, reduced) + (active ? 1 : 0));

export function drawRoomDoor(g, screenX, label, active = false, art = null, { time = 0, reduced = false } = {}) {
  const x = Math.round(screenX), y = GROUND_Y - DOOR_H;
  if (art) {
    g.drawImage(art.body, x - STEP_PAD, y, DOOR_IMG_W / 2, DOOR_IMG_H / 2);
    g.drawImage(art.windows[doorWindowLevel(time, active, reduced)], x - STEP_PAD + WINDOW.x / 2, y + WINDOW.y / 2, WINDOW.w / 2, WINDOW.h / 2);
  } else { // art still loading: flat stand-in in the same colours
    g.fillStyle = PAL[0]; g.fillRect(x - 1, y - 1, DOOR_W + 2, DOOR_H + 1);
    g.fillStyle = PAL[2]; g.fillRect(x, y, DOOR_W, DOOR_H);
    g.fillStyle = PAL[7]; g.fillRect(x + 4, y + 4, DOOR_W - 8, DOOR_H - 4);
  }
  // Brass sign on two short hangers; plate drawn at 2x density, text at world scale.
  const tw = textWidth(label), sw = tw + 6, sx = x + Math.floor((DOOR_W - sw) / 2), sy = y - 14;
  g.save(); g.translate(sx, sy); g.scale(.5, .5);
  const W = sw * 2, H = 20;
  g.fillStyle = PAL[0]; g.fillRect(0, 0, W, H);
  g.fillStyle = PAL[27]; g.fillRect(2, 2, W - 4, H - 4);
  g.fillStyle = PAL[active ? 31 : 28]; g.fillRect(2, 2, W - 4, 2); g.fillRect(2, 2, 2, H - 4);
  g.fillStyle = PAL[7]; g.fillRect(2, H - 4, W - 4, 2); g.fillRect(W - 4, 4, 2, H - 6);
  g.fillStyle = PAL[0]; g.fillRect(4, 4, 2, 2); g.fillRect(W - 6, 4, 2, 2); g.fillRect(4, H - 6, 2, 2); g.fillRect(W - 6, H - 6, 2, 2); // rivets
  g.fillStyle = PAL[1]; g.fillRect(6, H, 2, 8); g.fillRect(W - 8, H, 2, 8);   // hangers down to the lintel
  g.fillStyle = PAL[2]; g.fillRect(6, H, 1, 8); g.fillRect(W - 8, H, 1, 8);
  g.restore();
  drawText(g, label, sx + 3, sy + 2, PAL[0]);
  if (active) {
    const s = 'ENTER';
    // Beside the sign plate (the hero stands in front of the leaf when this shows); clears the screen-top HUD.
    const px = sx + sw + 3, py = sy + 2;
    drawText(g, s, px + 1, py + 1, PAL[0]);
    drawText(g, s, px, py, PAL[28]);
  }
}
