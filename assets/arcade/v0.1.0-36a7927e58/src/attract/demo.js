// Scripted rehearsal uses the live fight state so the same reel works at every viewport width.
export function createDemo(input,target,{combat,onTakeover=()=>{},onDone=()=>{}}={}){
 let elapsed=0,phase='walk',phaseTime=0,attackClock=0,stopped=false;
 const held=new Set();
 function keys(next){
  for(const key of held)if(!next.includes(key)){input.feed(key,false);held.delete(key);}
  for(const key of next)if(!held.has(key)){input.feed(key,true);held.add(key);}
 }
 function stop(){
  if(stopped)return;stopped=true;input.cancelScripted();held.clear();
  for(const name of ['keydown','pointerdown','blur'])target.removeEventListener(name,takeover,true);
 }
 function takeover(event){if(stopped)return;stop();onTakeover(event);}
 for(const name of ['keydown','pointerdown','blur'])target.addEventListener(name,takeover,true);
 return {
  stop,get phase(){return phase;},get cover(){return stopped?0:phase==='fade'?Math.min(1,phaseTime/1.2):0;},
  update(dt){
   if(!Number.isFinite(dt)||dt<0)throw new RangeError('Demo dt must be finite and nonnegative');
   if(stopped)return;
   elapsed+=dt;phaseTime+=dt;attackClock-=dt;
   if((combat.director.cleared>0||elapsed>45||combat.hero.hp<=0)&&!['linger','fade'].includes(phase)){phase='linger';phaseTime=0;}
   if(phase==='linger'&&phaseTime>=1.5){phase='fade';phaseTime=0;}
   if(phase==='fade'&&phaseTime>=1.2){stop();onDone();return;}
   if(phase==='linger'||phase==='fade'){keys([]);return;}
   if(combat.director.arena)phase='fight';
   if(phase==='walk'){keys(['ArrowRight']);return;}
   const hero=combat.hero,foes=combat.enemies.filter(e=>e.state!=='dead');
   const foe=foes.sort((a,b)=>Math.abs(a.x-hero.x)-Math.abs(b.x-hero.x))[0];
   if(!foe){keys([]);return;}
   const dx=foe.x-hero.x,dir=Math.sign(dx)||hero.facing,next=[];
   if(Math.abs(dx)>15||hero.facing!==dir)next.push(dir>0?'ArrowRight':'ArrowLeft');
   if(Math.abs(dx)<29&&attackClock<=0){next.push('j');attackClock=.14;}
   keys(next);
  },
 };
}
