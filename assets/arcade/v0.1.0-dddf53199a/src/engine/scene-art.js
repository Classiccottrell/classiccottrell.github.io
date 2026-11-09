import {createTitleShine} from '../title/shine.js';
export async function loadSceneArt() {
  const sources=['../../art/overworld/sky.png','../../art/overworld/far.png','../../art/overworld/water.png','../../art/overworld/ground.png','../boot/title-v2.png','../boot/title-v2-compact.png','../boot/title-v2-wide.png','../../art/pickups/terry-circle.png'];
  const images=await Promise.all(sources.map(path=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Scene art unavailable: ${path}`));
    image.src=new URL(path,import.meta.url).href;
  })));
  return {sticker:images[7],layers:images.slice(0,4).map((source,i)=>({source,factor:[0,.2,0,1][i],ambient:0,fit:i===0||i===2,y:i===1?-16:0})),title:{full:images[4],compact:images[5],wide:images[6],shine:new Map(images.slice(4,7).map(image=>[image,createTitleShine(image)]))}};
}
