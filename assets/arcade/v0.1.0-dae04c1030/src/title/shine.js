// Keep the glint on isolated gold letter faces; discard sun/cloud regions touching the crop edge.
export function letterMask(pixels,width,height,{left=0,right=width,top=28,bottom=112}={}){
 const result=new Uint8ClampedArray(pixels.length),seen=new Uint8Array(width*height);
 const gold=i=>pixels[i*4]>=245&&pixels[i*4+1]>=210&&pixels[i*4+2]<=190;
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
  const start=y*width+x;if(seen[start]||!gold(start))continue;
  const queue=[start];seen[start]=1;let edge=false;
  for(let q=0;q<queue.length;q++){
   const i=queue[q],px=i%width,py=Math.floor(i/width);
   if(px===left||px===right-1||py===top||py===bottom-1)edge=true;
   for(const [nx,ny] of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){
    if(nx<left||nx>=right||ny<top||ny>=bottom)continue;
    const n=ny*width+nx;if(!seen[n]&&gold(n)){seen[n]=1;queue.push(n);}
   }
  }
  if(!edge&&queue.length>=12)for(const i of queue)result.set([255,246,220,255],i*4);
 }
 return result;
}
export function createTitleShine(image){
 const mask=document.createElement('canvas');mask.width=image.width;mask.height=image.height;
 const ctx=mask.getContext('2d');ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,mask.width,mask.height);
 const left=Math.max(0,Math.floor(mask.width/2)-160),right=Math.min(mask.width,left+320);
 pixels.data.set(letterMask(pixels.data,mask.width,mask.height,{left,right}));ctx.putImageData(pixels,0,0);
 return mask;
}
export function drawTitleShine(ctx,mask,x,seconds,reducedMotion){
 const phase=seconds%8-1;if(reducedMotion||!mask||phase<0||phase>1.2)return;
 const start=Math.floor(mask.width/2-180+phase*300);
 for(let y=28;y<112;y++){
  const sx=start-Math.floor((y-28)/3);
  if(sx>=0&&sx+6<=mask.width)ctx.drawImage(mask,sx,y,6,1,x+sx,y,6,1);
 }
}
