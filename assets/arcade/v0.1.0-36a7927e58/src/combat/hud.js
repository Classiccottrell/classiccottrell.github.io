// Arcade HUD + juice. Flash and shake are disabled under reduced motion.
import { drawText } from '../engine/font.js';
import { drawToastText, toastWidth } from '../rooms/toast.js';
import {ENEMY_TYPES} from './data.js';

export const SHAKE_PX = 2;
export const SHAKE_FRAMES = 6;

export function createFx({ reducedMotion = false } = {}) {
  let shake = 0;
  return {
    onHit(ev) { if (!reducedMotion && ev.heavy) shake = SHAKE_FRAMES; },
    tick() { if (shake > 0) shake--; },
    shakeOffset() { return reducedMotion || shake <= 0 ? { x: 0, y: 0 } : { x: shake % 2 ? SHAKE_PX : -SHAKE_PX, y: 0 }; },
    flashing(f) { return !reducedMotion && f.flash > 0; },
  };
}

function bar(ctx, x, y, w, frac, color) {
  ctx.fillStyle = '#0e0b1a'; ctx.fillRect(x - 1, y - 1, w + 2, 6);
  ctx.fillStyle = '#3b2a3a'; ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = color; ctx.fillRect(x, y, Math.round(w * Math.max(0, frac)), 4);
}

export function drawHud(ctx, combat, viewW = 320, atDoor=false) {
  const h = combat.hero;
  drawText(ctx, 'HERO', 6, 4, '#f7f4e8');
  bar(ctx, 6, 18, 60, h.hp / h.maxHp, '#e0534a');
  if(combat.terry?.frames>0)drawToastText(ctx,`TERRY MODE ${Math.ceil(combat.terry.frames/60)}S`,6,30,'#FFD400');
  const t = combat.target;
  if (t && combat.targetT > 0 && t.state !== 'dead') {
    drawText(ctx, 'FOE', viewW - 66, 4, '#f7f4e8');
    bar(ctx, viewW - 66, 18, 60, t.hp / t.maxHp, '#f6c726');
  }
  const d = combat.director;
  const boss=combat.enemies.find(e=>e.spec.poise&&e.state!=='dead');
  const wave = boss?ENEMY_TYPES[boss.type].name:`LAP ${combat.lap} ${d.cleared}/${d.total}`;
  drawToastText(ctx, wave, Math.floor((viewW - toastWidth(wave)) / 2), 4, d.arena ? '#ffe27a' : '#b3a9ae');

  if(boss){
    const width=Math.min(180,viewW-148),x=Math.floor((viewW-width)/2);
    bar(ctx,x,18,width,boss.hp/boss.maxHp,'#FFD400');
    const tell=boss.ai.phase==='windup'?(boss.ai.pattern==='flurry'?'Dodge: three hits':'Dodge the dash'):boss.ai.phase==='recovery'?'Recovering: strike now':'';
    if(tell)drawToastText(ctx,tell,Math.floor((viewW-toastWidth(tell))/2),166,'#F5E6C8');
  }
  if(combat.flags.loopComplete){const text=atDoor?'LOOP COMPLETE - ENTER VAULT':'SHIFT CLEAR - WALK RIGHT';drawToastText(ctx,text,Math.floor((viewW-toastWidth(text))/2),29,'#FFD400');}
  if(combat.skip)drawToastText(ctx,'FIGHTS SKIPPED',6,166,'#ffe27a');
}
