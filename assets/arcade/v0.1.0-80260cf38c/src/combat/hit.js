// Pure AABB hit resolution. Boxes: {x,y,w,h} in world space (y down).
import { applyHit, isAttackState, isInvulnerable } from './fighter.js';
import { HITSTOP_MIN, HITSTOP_MAX } from './data.js';

export const aabb = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function hurtbox(f) {
  const { w, h } = f.spec.hurt;
  return { x: f.x - w / 2, y: f.y - h, w, h };
}

// Move whose active frames the fighter is currently in, else null.
export function activeMove(f) {
  if (!isAttackState(f.state)) return null;
  const m = f.spec.moves[f.state];
  return m && f.t >= m.startup && f.t < m.startup + m.active ? m : null;
}

export function hitbox(f, m = activeMove(f)) {
  if (!m?.hitbox) return null;
  const b = m.hitbox;
  return { x: f.facing > 0 ? f.x + b.x : f.x - b.x - b.w, y: f.y + b.y, w: b.w, h: b.h };
}

export const clampHitstop = (n) => Math.min(HITSTOP_MAX, Math.max(HITSTOP_MIN, n ?? HITSTOP_MIN));

// One hit per attack (f.attackId) per target; invulnerable/dead targets are skipped.
export function resolveHits(attackers, targets) {
  const events = [];
  for (const a of attackers) {
    const m = activeMove(a);
    if (!m) continue;
    const hb = hitbox(a, m);
    if (!hb) continue;
    for (const t of targets) {
      if (t === a || t.state === 'dead' || isInvulnerable(t) || a.hits.has(t.id)) continue;
      if (!aabb(hb, hurtbox(t))) continue;
      a.hits.add(t.id);
      const move=a.damageMultiplier!==1&&a.damageMultiplier?{...m,damage:Math.round(m.damage*a.damageMultiplier)}:m;
      applyHit(t, move, Math.sign(t.x - a.x) || a.facing);
      events.push({ attacker: a, target: t, move, damage: move.damage, heavy: !!m.heavy, hitstop: clampHitstop(m.hitstop) });
    }
  }
  return events;
}
