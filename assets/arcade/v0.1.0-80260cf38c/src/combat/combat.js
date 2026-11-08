// Orchestrates hero, enemies, waves, hitstop and fx. Pure (no canvas); game.js feeds intent each 60fps step.
import { HERO_SPEC, createFighter, stepFighter, bufferAttack,applyHit,isInvulnerable } from './fighter.js';
import { createEnemy, stepEnemy } from './enemy.js';
import { resolveHits,activeMove,aabb,hurtbox,clampHitstop } from './hit.js';
import { createWaveDirector } from './wave.js';
import { createFx } from './hud.js';
import { WAVES, TERRY_CHARGE_FRAMES } from './data.js';
import {createTerryPickup} from './terry.js';

const DEAD_LINGER = 40;
const RESPAWN_DELAY = 60;
const TARGET_SHOW = 120;

const WRAP_PAD = 24; // px past the world edge = fully off-screen
export function createCombat({ reducedMotion = false, worldW = 1600, waves = WAVES, heroX = 48 } = {}) {
  const director = createWaveDirector({ waves });
  const fx = createFx({ reducedMotion });
  const mkHero = (x) => createFighter({...HERO_SPEC}, { id: 'hero', x, team: 'hero' });
  let nextId = 1;
  const c = {
    director, fx, hero: mkHero(heroX), terry:createTerryPickup(), enemies: [], projectiles:[],hitstop: 0, skip: false,
    target: null, targetT: 0, flags: {}, lap:1,
    nextLap() { director.reset();c.hero=mkHero(-WRAP_PAD);c.terry=createTerryPickup();c.enemies=[];c.projectiles=[];c.target=null;c.targetT=0;c.hitstop=0;c.flags={};c.lap++; },
    placeHero(x) { c.hero.x = x; },
    resize(viewW){
      const arena=director.resize({heroX:c.hero.x,viewW,worldW});if(!arena)return null;
      for(const f of [c.hero,...c.enemies])f.x=Math.max(arena.minX,Math.min(arena.maxX,f.x));
      c.projectiles=c.projectiles.filter(p=>p.x>=arena.minX&&p.x<=arena.maxX);return arena;
    },
    endTerry() {c.terry.frames=0;c.terry.charge=0;c.hero.damageMultiplier=1;c.hero.spec.speed=HERO_SPEC.speed;},
    setSkip(v) {
      c.skip = !!v; director.setSkip(c.skip);
      if (c.skip) { c.enemies = []; c.projectiles=[];c.target = null; c.endTerry(); }
    },
    step(intent = {}, camX = 0, viewW = 320) {
      const events = [];
      fx.tick();
      if (intent.skip) c.setSkip(!c.skip);
      c.resize(viewW);
      if (c.targetT > 0) c.targetT--;
      if(c.hero.hp<=0){c.endTerry();c.projectiles=[];}
      if(c.terry.charge>0){c.terry.charge--;return events;}
      if(c.terry.step(c.hero.x,!c.skip,intent.collect!==false&&c.hero.hp>0)){
        events.push({type:'terry-collected',powered:c.terry.frames>0});
        if(c.terry.frames>0){
          c.terry.charge=TERRY_CHARGE_FRAMES;
          Object.assign(c.hero,{state:'idle',t:0,y:0,vy:0,vx:0,queuedAttacks:0});
        }
      }
      c.hero.damageMultiplier=c.terry.frames>0?1.5:1;
      c.hero.spec.speed=HERO_SPEC.speed*(c.terry.frames>0?1.15:1);
      if(c.terry.charge>0)return events;
      if (c.hitstop > 0) { if(intent.attack)bufferAttack(c.hero); c.hitstop--; return events; }
      const a = director.arena;
      stepFighter(c.hero, intent, a ? { minX: a.minX, maxX: a.maxX } : { minX: Math.min(8, c.hero.x), maxX: worldW + WRAP_PAD });
      // Leaving the causeway starts a fresh lap, including its waves and sticker.
      if (!a && c.hero.x >= worldW + WRAP_PAD - 1) {
        c.nextLap();
        events.push({ type: 'wrap', x: c.hero.x });
      }
      const w = director.update({ heroX: c.hero.x, camX, viewW, alive: c.enemies.filter((e) => e.state !== 'dead').length });
      for (const s of w.spawns) c.enemies.push(Object.assign(createEnemy(s.type, s.x, `e${nextId++}`, s.x < c.hero.x ? 1 : -1),{feedback:s.feedback}));
      if (w.locked) events.push({ type: 'locked' });
      if (w.cleared) {
        c.projectiles=[];c.flags[w.flag] = true; events.push({ type: 'cleared', flag: w.flag });
        if(w.boss){c.flags.loopComplete=true;events.push({type:'complete'});}
      }
      for (const e of c.enemies){
        const phase=e.ai.phase;stepEnemy(e, c.hero, director.arena ?? { minX: -64, maxX: worldW + 64 });
        if(e.spec.poise&&phase!=='windup'&&e.ai.phase==='windup')events.push({type:'boss-tell'});
      }
      for(const e of c.enemies){
        const m=activeMove(e);
        if(c.hero.hp>0 && m?.projectile && e.t===m.startup)c.projectiles.push({x:e.x+16*e.facing,y:e.y-30,vx:m.projectile.speed*e.facing,life:m.projectile.life,move:m,owner:e});
      }
      const noteHits=[];
      for(const p of c.projectiles){
        p.x+=p.vx;p.life--;
        if(aabb({x:p.x-2,y:p.y-2,w:5,h:5},hurtbox(c.hero))){
          p.life=0;
          if(!isInvulnerable(c.hero)){
            applyHit(c.hero,p.move,Math.sign(p.vx));
            noteHits.push({attacker:p.owner,target:c.hero,move:p.move,heavy:false,hitstop:clampHitstop(p.move.hitstop)});
          }
        }
      }
      c.projectiles=c.projectiles.filter(p=>p.life>0);
      for (const ev of [...resolveHits([c.hero], c.enemies), ...resolveHits(c.enemies, [c.hero]),...noteHits]) {
        fx.onHit(ev);
        events.push({ type: 'hit', heavy: ev.heavy, byHero: ev.attacker === c.hero });
        c.hitstop = Math.max(c.hitstop, ev.hitstop);
        if (ev.target !== c.hero) { c.target = ev.target; c.targetT = TARGET_SHOW; }
      }
      if(c.hero.hp<=0)c.projectiles=[];
      c.enemies = c.enemies.filter((e) => !(e.state === 'dead' && e.t > DEAD_LINGER));
      if (c.hero.state === 'dead' && c.hero.t >= RESPAWN_DELAY) {
        const x = director.respawnX() ?? heroX;
        director.abort();
        c.enemies = []; c.projectiles=[];c.target = null; c.hitstop = 0;
        c.hero = mkHero(x);
        events.push({ type: 'respawn', x });
      }
      return events;
    },
  };
  return c;
}
