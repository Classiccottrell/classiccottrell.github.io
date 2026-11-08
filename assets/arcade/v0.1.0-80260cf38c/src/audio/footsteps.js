// Actual travel, rather than held input or rendered frames, sets foot-contact cadence.
export function createFootsteps(){
  let previous=null,distance=0;
  return (x,walking)=>{
    const delta=previous===null?0:Math.abs(x-previous);previous=x;
    if(!walking||delta>4){distance=0;return false;}
    distance+=delta;
    if(distance<24)return false;
    distance-=24;return true;
  };
}
