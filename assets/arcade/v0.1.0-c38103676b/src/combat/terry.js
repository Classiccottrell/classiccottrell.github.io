export const TERRY_X=220;
export const TERRY_FRAMES=600;

export function createTerryPickup() {
  return {
    collected:false,frames:0,charge:0,
    step(heroX,powered=true,enabled=true) {
      if(this.frames>0)this.frames--;
      if(!enabled||this.collected||Math.abs(heroX-TERRY_X)>14)return false;
      this.collected=true;this.frames=powered?TERRY_FRAMES:0;return true;
    },
  };
}

export function drawTerryPickup(ctx,pickup,cam,time,reduced,image) {
  if(pickup.collected)return;
  const x=TERRY_X-cam,y=133+(reduced?0:Math.round(Math.sin(time*2)*2));
  if(image)ctx.drawImage(image,x-12,y-18,24,24); // Reference SVG rasterized at 2x density.
  else{ctx.fillStyle='#FFD400';ctx.fillRect(x-9,y-9,18,18);ctx.fillStyle='#19232D';ctx.fillRect(x-8,y-8,16,16);}
  ctx.fillStyle='#FFE778';ctx.fillRect(x+12,y-18,2,1);
}
