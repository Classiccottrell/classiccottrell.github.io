// Code-drawn placeholder backdrop for the "archive" theme (low warm light). Swap for PNG later.
import { PALETTE as P } from '../../../src/engine/placeholder.js';
import {PAL} from '../../../src/engine/pal.js';

export const FLOOR_Y = 150;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

export function drawArchiveBackdrop(g, w, h = 180) {
  // Back wall: dark plum with a faint dithered vertical gradient.
  for (let y = 0; y < FLOOR_Y; y++) for (let x = 0; x < w; x++) {
    g.fillStyle = (y / FLOOR_Y) > BAYER[y & 3][x & 3] / 16 ? P[16] : P[1];
    g.fillRect(x, y, 1, 1);
  }
  // Wainscot band + skirting.
  g.fillStyle = P[2]; g.fillRect(0, 112, w, 38);
  g.fillStyle = P[3]; g.fillRect(0, 112, w, 1);
  g.fillStyle = P[0]; g.fillRect(0, 148, w, 2);
  // Floor boards.
  g.fillStyle = P[15]; g.fillRect(0, FLOOR_Y, w, h - FLOOR_Y);
  for (let y = FLOOR_Y + 6; y < h; y += 8) { g.fillStyle = P[14]; g.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 40) { g.fillStyle = P[16]; g.fillRect(x, FLOOR_Y, 1, h - FLOOR_Y); }
}

// Cached, steady half-pixel light preserves the authored desk and paper texture.
export function drawLampLight(g,cx,cy,deskY){
  g.save();g.globalCompositeOperation='screen';g.fillStyle=PAL[28];
  for(let y=Math.round(cy*2);y<=deskY*2;y++){
    const depth=y/2-cy,center=cx+depth*.65,spread=2+depth*1.3;
    for(let x=Math.floor((center-spread)*2);x<=(center+spread)*2;x++){
      const edge=Math.abs(x/2-center)/spread;
      if(edge>.75&&BAYER[y&3][x&3]>5)continue;
      g.globalAlpha=.1+.12*(1-edge);g.fillRect(x/2,y/2,.5,.5);
    }
  }
  g.fillStyle=PAL[13];
  const center=cx+(deskY-cy)*.65;
  for(let y=(deskY-3)*2;y<=(deskY+2)*2;y++)for(let x=Math.floor((center-29)*2);x<=(center+29)*2;x++){
    const distance=((x/2-center)/29)**2+((y/2-deskY)/3)**2;
    if(distance>=1)continue;
    g.globalAlpha=.26*(1-distance);g.fillRect(x/2,y/2,.5,.5);
  }
  g.fillStyle=PAL[31];g.globalAlpha=.7;
  for(let x=(cx-2)*2;x<(cx+2)*2;x++)g.fillRect(x/2,cy,.5,.5);
  g.restore();
}
