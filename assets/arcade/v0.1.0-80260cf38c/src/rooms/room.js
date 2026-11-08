// Room runtime: pure helpers (testable) + canvas view.
import { SCREEN_W } from './loader.js';
import { SPRITES, spriteY } from './sprites.js';
import { PALETTE as P } from '../engine/placeholder.js';
import { drawText, textWidth } from '../engine/font.js';
import { drawArchiveBackdrop, drawLampLight } from '../../art/rooms/vpat-vault/backdrop.js';
import {createDoorArt,drawRoomDoor} from './door.js';

export const HERO_W = 16;
export const REACH = 20;
export const EXIT_X = 0;
const FILL_X = 20; // plain wall starts right of the exit door; 4-aligned so the dither phase matches
const FILL_W = 340; // widest side fill needed (1280-wide view, 640 room, 320 each side)

export const roomPixelWidth = (room) => room.width * SCREEN_W;
export const clampX = (x, room) => Math.min(Math.max(x, 0), roomPixelWidth(room) - HERO_W);
export const nearInteract = (px, room, reach = REACH) => Math.abs(px + HERO_W / 2 - room.interact.x) <= reach;
// Leaving: pushing left against the left edge, or Enter beside the exit door.
export const wantsExit = (px, { leftHeld = false, enter = false } = {}) =>
  (px <= EXIT_X && leftHeld) || (enter && px < 24);

export async function loadArchiveArt(){
  const base=new URL('../../art/rooms/vpat-vault/',import.meta.url);
  const response=await fetch(new URL('props.json',base));
  if(!response.ok)throw new Error(`Archive atlas: HTTP ${response.status}`);
  const atlas=await response.json();
  const [backdrop,props]=await Promise.all(['backdrop.png',atlas.image].map(name=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Archive image ${name} failed`));image.src=new URL(name,base).href;
  })));
  return {atlas,backdrop,props};
}

export function createRoomView(room, makeCanvas,art=null) {
  const w = roomPixelWidth(room);
  const [c, g] = makeCanvas(w*2, 360);g.scale(2,2);g.imageSmoothingEnabled=false;
  const [fill, fg] = makeCanvas((FILL_X + FILL_W)*2, 360);fg.scale(2,2);fg.imageSmoothingEnabled=false;
  const backdrop=(ctx,width)=>{
    if(art){const tileW=art.backdrop.width/2;for(let x=0;x<width;x+=tileW)ctx.drawImage(art.backdrop,x,0,tileW,180);}
    else drawArchiveBackdrop(ctx,width);
  };
  backdrop(g,w);backdrop(fg,FILL_X+FILL_W);
  drawRoomDoor(g,2,'EXIT',false,createDoorArt(makeCanvas),{reduced:true});
  for (const p of room.props) {
    const s = SPRITES[p.sprite];
    const frame=art?.atlas.sprites[p.sprite];
    if(frame)g.drawImage(art.props,frame.x,frame.y,frame.w,frame.h,p.x,spriteY(p.sprite),s.w,s.h);
    else s.draw(g, p.x, spriteY(p.sprite));
  }
  for(const p of room.props.filter(p=>p.sprite==='lamp'))drawLampLight(g,p.x+SPRITES.lamp.w/2,spriteY('lamp')+3,spriteY('desk')+1);
  return {
    width: w,
    // Room narrower than the view: centred (4-aligned), the sides continue the same wall and floor.
    originX: (viewW = SCREEN_W) => Math.max(0, (Math.floor((viewW - w) / 2) >> 2) << 2),
    draw(ctx, cam, { viewW = SCREEN_W } = {}) {
      const ox = Math.max(0, (Math.floor((viewW - w) / 2) >> 2) << 2);
      if (ox > 0) {
        const l = Math.min(ox, FILL_W), r = Math.min(viewW - ox - w, FILL_W);
        ctx.drawImage(fill, FILL_X*2, 0, l*2, 360, ox - l, 0, l, 180);
        ctx.drawImage(fill, FILL_X*2, 0, r*2, 360, ox + w, 0, r, 180);
      }
      ctx.drawImage(c,0,0,w*2,360,ox-cam,0,w,180);
    },
    drawPrompt(ctx, cam, blink = true, ox = 0) {
      if (!blink) return;
      cam -= ox;
      const s = 'ENTER';
      const x = Math.round(room.interact.x - cam - textWidth(s) / 2), y = 86;
      drawText(ctx, s, x + 1, y + 1, '#0e0b1a');
      drawText(ctx, s, x, y, '#ffe27a');
      ctx.fillStyle = P[11]; ctx.fillRect(Math.round(room.interact.x - cam) - 1, y + 7, 3, 1); ctx.fillRect(Math.round(room.interact.x - cam), y + 8, 1, 1);
    },
  };
}
