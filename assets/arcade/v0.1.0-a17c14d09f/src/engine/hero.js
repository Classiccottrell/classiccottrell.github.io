import {createRimCache} from './light.js';
import {TERRY_CHARGE_FRAMES,HERO,COMMON} from '../combat/data.js';
export function heroFrame(atlas, {state='idle', seconds=0, tick=0, move, reducedMotion=false,transformTick=null}) {
  if(transformTick!==null&&atlas.animations.transform){
    const frames=atlas.animations.transform.frames;
    return frames[reducedMotion?frames.length-1:Math.min(frames.length-1,Math.floor(transformTick*frames.length/TERRY_CHARGE_FRAMES))];
  }
  if (move && (state.startsWith('attack') || state === 'jumpkick')) {
    const index=tick===0 ? 0 : tick<move.startup ? 1 : tick<move.startup+move.active ? 2 : 3;
    const animation=state==='attack2'?'punch2':state==='attack3'||state==='jumpkick'?'kick':'punch1';
    return atlas.animations[animation].frames[index];
  }
  const reaction=['hit','dodge','knockdown','getup','dead'].includes(state);
  if(reaction){
    const name=['getup','dead'].includes(state)?'knockdown':state,frames=atlas.animations[name].frames;
    const duration=state==='hit'?COMMON.hitstun:state==='dodge'?HERO.dodge.duration:state==='getup'?COMMON.knockdown.getup:COMMON.knockdown.duration;
    let index=Math.min(frames.length-1,Math.floor(tick*frames.length/duration));
    if(state==='dead')index=frames.length-1;
    else if(state==='getup')index=frames.length-1-index;
    else if(reducedMotion)index=state==='dodge'?Math.floor(frames.length/2):frames.length-1;
    return frames[index];
  }
  const animation=atlas.animations[state==='walk'?'walk':'idle'];
  const index=reducedMotion || !['idle','walk'].includes(state) ? 0 : Math.floor(seconds*animation.fps)%animation.frames.length;
  return animation.frames[index];
}

// Sheet pixels per world unit (hero.json "density"; absent = 1). The draw is compensated by 1/density so the
// on-screen size is unchanged; with an integer zoom divisible by density each sprite pixel stays a whole canvas pixel.
export const atlasDensity = (atlas) => atlas.density || 1;
export const spritePixelRatio = (zoom, atlas) => zoom / atlasDensity(atlas);

// fx (optional): {rimFor(frame, spriteSide, index) -> canvas} for the warm door rim; pose.rim = {side:+-1 (screen), index 0..3}.
// World units the sprite sits below the nominal feet line so boots meet the walkway instead of floating over it (Matt, 2026-11-05).
export const FOOT_DROP=3;
export function drawHeroSprite(ctx,image,atlas,pose,fx=null,powered=null) {
  if(pose.power&&powered){image=powered.image;atlas=powered.atlas;fx=null;}
  const frame=heroFrame(atlas,pose), k=1/atlasDensity(atlas);
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.translate(Math.round(pose.x),Math.round(pose.y)+FOOT_DROP);
  ctx.scale(pose.facing<0?-1:1,1);
  if (pose.flashing) ctx.globalAlpha=.45;
  ctx.scale(k,k);
  const opacity=ctx.globalAlpha??1;
  const composite=ctx.globalCompositeOperation||'source-over';
  if(pose.power&&atlas.animations.aura){
    const aura=atlas.animations.aura,af=aura.frames[pose.reducedMotion?0:Math.floor(pose.seconds*aura.fps)%aura.frames.length];
    ctx.globalAlpha=opacity*.65;ctx.globalCompositeOperation='screen';
    ctx.drawImage(image,af.x,af.y,af.w,af.h,-atlas.anchor.x,-atlas.anchor.y,af.w,af.h);
  }
  ctx.globalAlpha=opacity;ctx.globalCompositeOperation=composite;
  ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,-atlas.anchor.x,-atlas.anchor.y,frame.w,frame.h);
  if(pose.power&&atlas.animations['aura-front']){
    const aura=atlas.animations['aura-front'],af=aura.frames[pose.reducedMotion?0:Math.floor(pose.seconds*aura.fps)%aura.frames.length];
    ctx.globalAlpha=opacity*.45;ctx.globalCompositeOperation='screen';
    ctx.drawImage(image,af.x,af.y,af.w,af.h,-atlas.anchor.x,-atlas.anchor.y,af.w,af.h);
    ctx.globalAlpha=opacity;ctx.globalCompositeOperation=composite;
  }
  if (pose.rim && fx?.rimFor) { // rim mask covers only figure pixels, so it draws plainly on top (mirrors with the sprite)
    const rim=fx.rimFor(frame,pose.rim.side*(pose.facing<0?-1:1),pose.rim.index);
    ctx.drawImage(rim,0,0,frame.w,frame.h,-atlas.anchor.x,-atlas.anchor.y,frame.w,frame.h);
  }
  ctx.restore();
}

export async function loadHeroSprite(make=null) {
  const response=await fetch(new URL('../../art/characters/hero.json',import.meta.url));
  if (!response.ok) throw new Error(`Hero atlas: HTTP ${response.status}`);
  const atlas=await response.json();
  const image=new Image();
  await new Promise((resolve,reject)=>{
    image.onload=resolve;image.onerror=()=>reject(new Error('Hero sheet failed to load'));
    image.src=new URL(`../../art/characters/${atlas.image}`,import.meta.url).href;
  });
  const mk=make||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];});
  const [sheet,sg]=mk(image.width,image.height);sg.drawImage(image,0,0);
  const data=sg.getImageData(0,0,image.width,image.height).data;
  const alphaOf=(f)=>{const a=new Uint8Array(f.w*f.h);for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++)a[y*f.w+x]=data[((f.y+y)*image.width+f.x+x)*4+3]?1:0;return a;};
  const powerResponse=await fetch(new URL('../../art/characters/hero-terry.json',import.meta.url));
  if(!powerResponse.ok)throw new Error(`Terry atlas: HTTP ${powerResponse.status}`);
  const powerAtlas=await powerResponse.json(),powerImage=new Image();
  await new Promise((resolve,reject)=>{powerImage.onload=resolve;powerImage.onerror=()=>reject(new Error('Terry sheet failed to load'));powerImage.src=new URL(`../../art/characters/${powerAtlas.image}`,import.meta.url).href;});
  const powered={image:powerImage,atlas:powerAtlas};
  const fx={rimFor:createRimCache(mk,alphaOf)};
  return {atlas,draw:(ctx,pose)=>drawHeroSprite(ctx,image,atlas,pose,fx,powered)};
}
