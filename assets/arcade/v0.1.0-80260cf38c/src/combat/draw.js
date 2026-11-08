// Authored fighters with loading fallbacks, sticky notes and attack warnings.
import { drawHero } from '../engine/placeholder.js';
import { GROUND_Y } from '../engine/placeholder.js';
import { activeMove, hitbox } from './hit.js';
import { isTelegraphing } from './enemy.js';
import { ENEMY_TYPES,TERRY_CHARGE_FRAMES } from './data.js';
import {drawText,textWidth} from '../engine/font.js';

const STATE_TINT = { hit: '#e0534a', knockdown: '#837c88', getup: '#b3a9ae', dead: '#3b2a3a' };

function box(ctx, f, cam, color) {
  const { w, h } = f.spec.hurt;
  const down = f.state === 'knockdown' || f.state === 'dead';
  const x = Math.round(f.x - cam - w / 2), y = Math.round(GROUND_Y + f.y);
  ctx.fillStyle = color;
  if (down) ctx.fillRect(x - 6, y - 8, w + 12, 8); else ctx.fillRect(x, y - h, w, h);
  if (!down) { ctx.fillStyle = '#0e0b1a'; ctx.fillRect(x + (f.facing > 0 ? w - 3 : 1), y - h + 4, 2, 2); }
}

export function feedbackBubble(combat,cam,viewW){
  const e=combat.enemies.filter(e=>ENEMY_TYPES[e.type].feedback && isTelegraphing(e) && ['idle','walk'].includes(e.state) && e.x>=cam-8 && e.x<=cam+viewW+8)
    .sort((a,b)=>Math.abs(a.x-combat.hero.x)-Math.abs(b.x-combat.hero.x))[0];
  if(!e)return null;
  const lines=[''];
  for(const word of (e.feedback??ENEMY_TYPES[e.type].feedback).split(' ')){
    const i=lines.length-1,line=lines[i]?`${lines[i]} ${word}`:word;
    if(textWidth(line)>Math.min(119,viewW-14) && lines[i])lines.push(word);else lines[i]=line;
  }
  const w=Math.max(...lines.map(textWidth))+8,h=lines.length*6+6;
  const x=Math.round(Math.max(3,Math.min(viewW-w-3,e.x-cam-w/2)));
  const y=Math.max(76,Math.round(GROUND_Y-e.spec.hurt.h-h-5));
  return {lines,x,y,w,h,tailX:Math.round(Math.max(x+3,Math.min(x+w-5,e.x-cam)))};
}

export function drawFighters(ctx, combat, cam, { hx, frame, sprite, enemySprites=null, seconds=0, reducedMotion=false, rim=null,viewW=320 }) {
  const fx = combat.fx;
  for (const e of combat.enemies) {
    if(enemySprites?.draw(ctx,e,cam,{seconds,reducedMotion,ground:GROUND_Y}))continue;
    let color = fx.flashing(e) ? '#ffffff' : STATE_TINT[e.state] ?? ENEMY_TYPES[e.type].color;
    if (isTelegraphing(e)) color = '#FFD400';
    box(ctx, e, cam, color);
    const hb = hitbox(e);
    if (hb) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(Math.round(hb.x - cam), Math.round(GROUND_Y + hb.y), hb.w, hb.h); }
  }
  const h = combat.hero;
  if (sprite) sprite.draw(ctx, {x:hx-cam,y:GROUND_Y+h.y,facing:h.facing,state:h.state,seconds,tick:h.t,move:h.spec.moves[h.state],reducedMotion,flashing:fx.flashing(h),rim,power:combat.terry.frames>0,transformTick:combat.terry.charge>0?TERRY_CHARGE_FRAMES-combat.terry.charge:null});
  else if (fx.flashing(h)) box(ctx, h, cam, '#ffffff');
  else if (h.state === 'idle' || h.state === 'walk') drawHero(ctx, Math.round(hx - 8 - cam), GROUND_Y - 24, frame, h.facing);
  else box(ctx, h, cam, h.state === 'dodge' ? '#6fb5bf' : STATE_TINT[h.state] ?? '#f6c726');
  const hb = hitbox(h);
  if (!sprite && hb && activeMove(h)) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(Math.round(hb.x - cam), Math.round(GROUND_Y + hb.y), hb.w, hb.h); }
  for(const p of combat.projectiles){
    const x=Math.round(p.x-cam),y=Math.round(GROUND_Y+p.y);
    ctx.fillStyle='#19232D';ctx.fillRect(x-3,y-3,7,7);
    ctx.fillStyle='#FFD400';ctx.fillRect(x-2,y-2,5,5);
    ctx.fillStyle='#FFF6DC';ctx.fillRect(x+1,y-2,2,2);
  }
  const b=feedbackBubble(combat,cam,viewW);
  if(b){
    ctx.fillStyle='#19232D';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillRect(b.tailX,b.y+b.h,4,3);
    ctx.fillStyle='#F5E6C8';ctx.fillRect(b.x+1,b.y+1,b.w-2,b.h-2);ctx.fillRect(b.tailX+1,b.y+b.h-1,2,3);
    b.lines.forEach((line,i)=>drawText(ctx,line,b.x+4,b.y+3+i*6,'#19232D'));
  }
}
