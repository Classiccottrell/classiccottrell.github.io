// Pure wave director. Locks the camera ("arena") while a wave is alive.
import { WAVES, ARENA_PAD } from './data.js';

const DEFAULT_VIEW_W = 320;

export function createWaveDirector({ waves = WAVES } = {}) {
  let idx = 0, active = null, arena = null, skip = false, cleared = 0;
  const d = {
    get arena() { return arena; },
    get active() { return active; },
    get cleared() { return cleared; },
    get total() { return waves.length; },
    get skip() { return skip; },
    setSkip(v) { skip = !!v; if (skip) d.abort(); },
    // Drop the running wave without crediting it (skip toggle, hero death). It re-triggers later.
    abort() { active = null; arena = null; },
    reset() { idx=0;cleared=0;d.abort(); },
    respawnX() { return active ? active.at - 40 : null; },
    resize({heroX,viewW,worldW}){
      if(!arena||arena.maxX-arena.minX===viewW-2*ARENA_PAD)return null;
      const camX=Math.max(0,Math.min(worldW-viewW,heroX-viewW/2));
      arena={camX,minX:camX+ARENA_PAD,maxX:camX+viewW-ARENA_PAD};return arena;
    },
    update({ heroX, camX, alive, viewW = DEFAULT_VIEW_W }) {
      const res = { spawns: [], locked: false, cleared: false, flag: null };
      if (skip) return res;
      if (!active) {
        const w = waves[idx];
        if (w && heroX >= w.at) {
          active = w;
          arena = { camX, minX: camX + ARENA_PAD, maxX: camX + viewW - ARENA_PAD };
          const n = { left: 0, right: 0 };
          res.spawns = w.enemies.map((e) => ({ type: e.type, feedback:e.feedback, x: e.side === 'left' ? camX - 16 - 20 * n.left++ : camX + viewW + 16 + 20 * n.right++ }));
          res.locked = true;
        }
      } else if (alive === 0) {
        res.cleared = true; res.flag = active.id;res.boss=!!active.boss;
        cleared++; idx++; active = null; arena = null;
      }
      return res;
    },
  };
  return d;
}
