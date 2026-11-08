// Causeway floor at 2x pixel density plus its ambient motion (water glints on the palette water cycle, dust motes).
// The static tile comes from the deterministic generator in art/overworld/tools; motion is a pure function of `time`,
// which the engine freezes under prefers-reduced-motion (and every function here also takes `reduced` explicitly).
import { generateFloor, generateGlints, dustMotes, FLOOR_W, FLOOR_H } from '../../art/overworld/tools/floor.gen.js';
import { PAL, CYCLES, cycled, cycleStep, paintIndexed } from './pal.js';
import { layerOffset, tilePositions } from './parallax.js';

export const FLOOR_DENSITY = 2;
export const FLOOR_TILE = FLOOR_W / FLOOR_DENSITY; // world units

export function createFloor(make) {
  const buf = generateFloor();
  const source = paintIndexed(buf.pix, FLOOR_W, FLOOR_H, make);
  const glints = generateGlints();
  return {
    layer: { name: 'floor', source, factor: 1, ambient: 0, density: FLOOR_DENSITY, y: 0 },
    glints,
    drawAnimated(ctx, cam, viewW, time, reduced = false) {
      const step = cycleStep(CYCLES.water, time, reduced);
      ctx.save();
      for (const x of tilePositions(layerOffset(cam, 1, FLOOR_TILE), FLOOR_TILE, viewW)) {
        ctx.save(); ctx.translate(x, 0); ctx.scale(.5, .5); // glint geometry is in 2x-density pixels
        for (const g of glints) { ctx.fillStyle = PAL[cycled(CYCLES.water, g.phase, step)]; ctx.fillRect(g.x, g.y, g.len, 1); }
        ctx.restore();
      }
      for (const m of dustMotes(time, viewW, reduced)) { ctx.fillStyle = PAL[m.bright ? 3 : 26]; ctx.fillRect(m.x, m.y, .5, .5); }
      ctx.restore();
    },
  };
}
