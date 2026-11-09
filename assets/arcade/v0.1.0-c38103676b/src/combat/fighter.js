// Pure fighter state machine. One stepFighter call = one 60fps frame.
import { COMMON, HERO } from './data.js';

export const isAttackState = (s) => s === 'attack1' || s === 'attack2' || s === 'attack3' || s === 'jumpkick';
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export function makeSpec(base) { return { ...COMMON, dodge: null, ...base }; }
export const HERO_SPEC = makeSpec(HERO);

export function createFighter(spec, { id, x = 0, facing = 1, team = 'hero' } = {}) {
  return { id, team, spec, x, y: 0, vx: 0, vy: 0, facing, hp: spec.hp, maxHp: spec.hp,
    state: 'idle', t: 0, queuedAttacks: 0, damageMultiplier: 1, attackId: 0, hits: new Set(), flash: 0 };
}

function enter(f, state) {
  f.state = state; f.t = 0;
  if (isAttackState(state)) { f.attackId++; f.hits = new Set(); f.vy=f.spec.moves[state].launchVy||0; }
  else f.queuedAttacks=0;
}

export function isInvulnerable(f) {
  switch (f.state) {
    case 'dodge': return f.t < f.spec.dodge.invuln;
    case 'knockdown': case 'dead': return true;
    case 'getup': return f.t < f.spec.knockdown.getupInvuln;
    default: return false;
  }
}

function idleLogic(f, intent) {
  const sp = f.spec, dir = intent.dir || 0;
  if (dir) f.facing = dir;
  if (intent.attack) return enter(f, 'attack1');
  if (intent.jump) { enter(f, 'jump'); f.vy = sp.jumpVy; f.vx = dir * sp.speed; return; }
  if (intent.dodge && sp.dodge) { enter(f, 'dodge'); f.vx = (dir || -f.facing) * sp.dodge.speed; return; }
  if (dir) { if (f.state !== 'walk') enter(f, 'walk'); f.x += dir * sp.speed; }
  else if (f.state !== 'idle') enter(f, 'idle');
}

// Buffer at most the two remaining combo presses, including presses during hitstop.
export function bufferAttack(f) {
  const m=f.spec.moves[f.state];
  if(m?.next && f.t<m.startup+m.active+f.spec.comboWindow) f.queuedAttacks=Math.min(2,f.queuedAttacks+1);
}

export function stepFighter(f, intent = {}, env = {}) {
  const sp = f.spec;
  if (f.flash > 0) f.flash--;
  f.t++;
  if (!isAttackState(f.state)) f.queuedAttacks=0;
  switch (f.state) {
    case 'idle': case 'walk': idleLogic(f, intent); break;
    case 'attack1': case 'attack2': case 'attack3': {
      const m = sp.moves[f.state], end = m.startup + m.active;
      if(intent.attack) bufferAttack(f);
      if(m.lunge&&f.t>=m.startup&&f.t<end)f.x+=f.facing*m.lunge;
      if(m.launchVy) {f.vy+=sp.gravity;f.y=Math.min(0,f.y+f.vy);if(f.y===0)f.vy=0;}
      if (m.next && sp.moves[m.next] && f.queuedAttacks>0 && f.t >= end && f.t < end + sp.comboWindow) {f.queuedAttacks--;enter(f,m.next);}
      else if (f.t >= end + m.recovery) { enter(f, 'idle'); idleLogic(f, intent); }
      break;
    }
    case 'jump': case 'jumpkick':
      f.vy += sp.gravity; f.y += f.vy; f.x += f.vx;
      if (f.y >= 0) { f.y = 0; f.vy = 0; f.vx = 0; enter(f, 'idle'); }
      else if (f.state === 'jump' && intent.attack && sp.moves.jumpkick) enter(f, 'jumpkick');
      break;
    case 'dodge':
      f.x += f.vx;
      if (f.t >= sp.dodge.duration) { f.vx = 0; enter(f, 'idle'); }
      break;
    case 'hit':
      f.x += f.vx; f.vx *= 0.85;
      if (f.t >= sp.hitstun) { f.vx = 0; enter(f, 'idle'); }
      break;
    case 'knockdown':
      f.x += f.vx; f.vx *= 0.9;
      if (f.t >= sp.knockdown.duration) { f.vx = 0; enter(f, 'getup'); }
      break;
    case 'getup':
      if (f.t >= sp.knockdown.getup) enter(f, 'idle');
      break;
    case 'dead': f.x += f.vx; f.vx *= 0.9; break;
  }
  f.x = clamp(f.x, env.minX ?? -Infinity, env.maxX ?? Infinity);
}

export function applyHit(target, move, fromDir) {
  target.hp = Math.max(0, target.hp - move.damage);
  target.flash = 1;
  if(target.hp>0&&target.spec.poise&&(target.ai?.phase==='windup'||isAttackState(target.state)))return;
  target.vx = fromDir * move.knockback;
  target.y = 0; target.vy = 0;
  enter(target, target.hp === 0 ? 'dead' : move.knockdown ? 'knockdown' : 'hit');
}
