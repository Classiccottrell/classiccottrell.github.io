import {windupFrames} from './enemy.js';
import {FOOT_DROP} from '../engine/hero.js';

export const ENEMY_SHEETS={
  'contrast-bandit':'auditor','alt-text-gremlin':'alt-text-gremlin','lord-overlay':'lord-overlay','warlord-z-index':'warlord-z-index',
  'logo-reviewer':'logo-reviewer','pop-reviewer':'pop-reviewer','options-reviewer':'options-reviewer','small-change-reviewer':'small-change-reviewer',
};
export function enemyFrame(atlas,e,{seconds=0,reducedMotion=false}={}){
  let name='idle',index=0;
  const progress=(n,d)=>Math.min(n-1,Math.floor(e.t*n/d));
  if(e.state==='dead')name='dead';
  else if(e.state==='hit'){name='hurt';index=progress(atlas.animations.hurt.frames.length,e.spec.hitstun);}
  else if(e.state==='knockdown'||e.state==='getup'){
    name='knockdown';const n=atlas.animations[name].frames.length;
    index=e.state==='getup'?n-1-progress(n,e.spec.knockdown.getup):progress(n,e.spec.knockdown.duration);
  }else if(e.state.startsWith('attack')){
    name='attack';const m=e.spec.moves[e.state];index=e.t===0?0:e.t<m.startup?1:e.t<m.startup+m.active?2:3;
    if(e.spec.poise&&e.ai.pattern==='flurry'){name='signature';index=({attack1:0,attack2:2,attack3:4})[e.state]+(e.t>=m.startup?1:0);}
  }else if(e.ai.phase==='windup'){
    name='windup';const n=atlas.animations[name].frames.length;
    index=reducedMotion?n-1:Math.min(n-1,Math.floor(e.ai.t*n/windupFrames(e.type,e.ai.pattern,e.feedback)));
  }else{
    name=e.state==='walk'?'walk':'idle';const a=atlas.animations[name];
    index=reducedMotion?0:Math.floor(seconds*a.fps)%a.frames.length;
  }
  return atlas.animations[name].frames[index];
}

export async function loadEnemySprites(){
  const sets=Object.fromEntries(await Promise.all(Object.entries(ENEMY_SHEETS).map(async([type,name])=>{
    const response=await fetch(new URL(`../../art/characters/${name}.json`,import.meta.url));
    if(!response.ok)throw new Error(`Enemy atlas ${name}: HTTP ${response.status}`);
    const atlas=await response.json(),image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error(`Enemy sheet ${name} failed`));image.src=new URL(`../../art/characters/${atlas.image}`,import.meta.url).href;});
    return [type,{atlas,image}];
  })));
  return {draw(ctx,e,cam,options){
    const set=sets[e.type];if(!set)return false;
    const {atlas,image}=set,f=enemyFrame(atlas,e,options);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(e.x-cam),Math.round(options.ground+e.y)+FOOT_DROP);
    ctx.scale((e.facing<0?-1:1)/atlas.density,1/atlas.density);
    ctx.drawImage(image,f.x,f.y,f.w,f.h,-atlas.anchor.x,-atlas.anchor.y,f.w,f.h);ctx.restore();return true;
  }};
}
