// Data-driven enemy AI: approach -> windup (telegraph) -> attack -> retreat.
import { ENEMY_TYPES, MIN_TELEGRAPH } from './data.js';
import { createFighter, makeSpec, stepFighter, isAttackState } from './fighter.js';

const specs = {};
function specFor(typeId) {
  const t = ENEMY_TYPES[typeId];
  if (!t) throw new Error(`unknown enemy type ${typeId}`);
  return specs[typeId] ??= makeSpec({ id: typeId, hp: t.hp, hurt:t.hurt, speed: t.speed, moves: t.moves,poise:!!t.boss });
}
export const windupFrames = (typeId,pattern,feedback=ENEMY_TYPES[typeId].feedback) => Math.max(MIN_TELEGRAPH,Math.min(180,(feedback?.length??0)*3),pattern==='flurry'?ENEMY_TYPES[typeId].flurryWindup:ENEMY_TYPES[typeId].windup);
function say(e,text,kind){if(text)e.speech={text,kind,frames:180};}

export function createEnemy(typeId, x, id, facing = -1) {
  const e = createFighter(specFor(typeId), { id, x, facing, team: 'enemy' });
  e.type = typeId;
  e.ai = { phase: 'approach', t: 0,pattern:ENEMY_TYPES[typeId].boss?'dash':null };
  say(e,ENEMY_TYPES[typeId].dialogue?.enter,'enter');
  return e;
}

export const isTelegraphing = (e) => e.ai.phase === 'windup';

export function stepEnemy(e, target, env = {}) {
  const ai = e.ai, type = ENEMY_TYPES[e.type];
  if(e.speech?.frames>0)e.speech.frames--;
  if(type.feedback&&!e.entrySpoken&&e.x>=(env.minX??-Infinity)&&e.x<=(env.maxX??Infinity)){
    say(e,e.feedback??type.feedback,'enter');e.entrySpoken=true;
  }
  if(e.state==='dead'&&!e.defeatSpoken){say(e,type.dialogue?.defeat,'defeat');e.defeatSpoken=true;}
  const previousPhase=ai.phase;
  const dx = target.x - e.x, toward = Math.sign(dx) || e.facing;
  const intent = {};
  if(type.boss&&ai.phase==='recovery'){
    if(++ai.t>=type.bossRecovery){ai.phase='approach';ai.t=0;ai.pattern=ai.pattern==='dash'?'flurry':'dash';}
  } else if (e.state === 'hit' || e.state === 'knockdown' || e.state === 'getup' || e.state === 'dead') {
    ai.phase = 'approach'; ai.t = 0;
  } else if (target.state === 'dead') {
    ai.phase = 'approach';
  } else {
    switch (ai.phase) {
      case 'approach':
        if (Math.abs(dx) <= type.range && e.x >= (env.minX ?? -Infinity) && e.x <= (env.maxX ?? Infinity)) { ai.phase = 'windup'; ai.t = 0; e.facing = toward; }
        else intent.dir = toward;
        break;
      case 'windup':
        e.facing = toward;
        if(type.feint && ai.t>=24 && ai.t<40)intent.dir=ai.t<32?-toward:toward;
        if (++ai.t >= windupFrames(e.type,ai.pattern,e.feedback)) { ai.phase = 'attack'; ai.t = 1; intent.attack = true; }
        break;
      case 'attack':
        if((type.combo||ai.pattern==='flurry') && e.spec.moves[e.state]?.next)intent.attack=true;
        if (!isAttackState(e.state) && ai.t > 1) { ai.phase = type.boss?'recovery':type.retreat>0?'retreat':'approach'; ai.t = 0; } else ai.t++;
        break;
      case 'retreat':
        intent.dir = -toward;
        if (++ai.t >= type.retreat) { ai.phase = 'approach'; ai.t = 0; }
        break;
    }
  }
  // Walk in from the spawn edge; once inside, retreat and knockback obey the arena.
  stepFighter(e, intent, { minX: Math.min(e.x, env.minX ?? -Infinity), maxX: Math.max(e.x, env.maxX ?? Infinity) });
  if(ai.phase!==previousPhase){
    if(ai.phase==='windup')say(e,type.dialogue?.[ai.pattern]??type.dialogue?.windup??e.feedback??type.feedback,'windup');
    if(ai.phase==='recovery')say(e,type.dialogue?.recovery,'recovery');
  }
}
