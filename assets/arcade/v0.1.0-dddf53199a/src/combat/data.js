// Single tuning file for combat. Frame counts are 60fps update steps; retune here when real sprites land.
// Fighter x = horizontal centre, y = offset above ground (<=0 airborne). Box y values are relative to the feet.
export const MIN_TELEGRAPH = 12;
export const HITSTOP_MIN = 2;
export const HITSTOP_MAX = 4;
export const TERRY_CHARGE_FRAMES = 36;

export const COMMON = {
  gravity: 0.45,
  jumpVy: -6.5,
  hitstun: 14,
  comboWindow: 12, // frames after the active frames in which attack chains
  knockdown: { duration: 32, getup: 16, getupInvuln: 10 },
  hurt: { w: 12, h: 24 },
};

export const HERO = {
  id: 'hero',
  hurt: { w:18, h:44 },
  hp: 100,
  speed: 70 / 60,
  dodge: { duration: 16, invuln: 12, speed: 2.6 },
  moves: {
    attack1: { startup: 3, active: 3, recovery: 14, damage: 6, hitbox: { x: 4, y: -32, w: 18, h: 14 }, knockback: 1, hitstop: 2, next: 'attack2' },
    attack2: { startup: 3, active: 3, recovery: 14, damage: 7, hitbox: { x: 4, y: -32, w: 20, h: 14 }, knockback: 1.4, hitstop: 3, next: 'attack3' },
    attack3: { startup: 5, active: 4, recovery: 18, launchVy: -3.5, damage: 12, hitbox: { x: 8, y: -27, w: 23, h: 12 }, knockback: 3, hitstop: 4, heavy: true, knockdown: true },
    jumpkick: { startup: 2, active: 12, recovery: 0, damage: 8, hitbox: { x: 4, y: -10, w: 16, h: 10 }, knockback: 2, hitstop: 3 },
  },
};

export const ENEMY_TYPES = {
  'contrast-bandit': {
    hp: 30, hurt: {w:16,h:40}, speed: 0.8, range: 22, windup: 20, retreat: 0, color: '#B98A24',
    moves: { attack1: { startup: 6, active: 3, recovery: 16, damage: 10, hitbox: { x: 8, y: -18, w: 18, h: 8 }, knockback: 1.5, hitstop: 3 } },
  },
  'alt-text-gremlin': {
    hp: 18, hurt: {w:14,h:32}, speed: 1.5, range: 18, windup: 12, retreat: 28, color: '#4f8a54',
    moves: { attack1: { startup: 4, active: 3, recovery: 12, damage: 5, hitbox: { x: 6, y: -16, w: 14, h: 8 }, knockback: 1, hitstop: 2 } },
  },
  'lord-overlay': {
    name:'LORD OVERLAY',dialogue:{enter:'This needs another layer.',windup:'I can cover that.',defeat:'I was on top of this.'},
    hp:90,hurt:{w:22,h:50},speed:.65,range:30,windup:28,retreat:44,color:'#294B58',
    moves:{attack1:{startup:8,active:4,recovery:24,damage:16,hitbox:{x:8,y:-38,w:28,h:30},knockback:3,hitstop:4,heavy:true,knockdown:true}},
  },
  'warlord-z-index': {
    dialogue:{enter:'This needs my approval.',dash:'Let me push this through.',flurry:'Three more changes.',recovery:"That wasn't in the brief.",defeat:'Can we roll that back?'},
    boss:true,name:'WARLORD Z-INDEX',hp:140,hurt:{w:24,h:52},speed:1.2,range:52,windup:42,flurryWindup:60,bossRecovery:60,retreat:0,color:'#9E9B8C',
    moves:{
      attack1:{startup:8,active:6,recovery:22,damage:8,hitbox:{x:8,y:-34,w:28,h:24},lunge:3.2,knockback:.5,hitstop:3,next:'attack2'},
      attack2:{startup:5,active:3,recovery:12,damage:6,hitbox:{x:6,y:-34,w:30,h:24},lunge:.8,knockback:.5,hitstop:2,next:'attack3'},
      attack3:{startup:6,active:4,recovery:24,damage:10,hitbox:{x:6,y:-34,w:32,h:24},lunge:1,knockback:3,hitstop:4,heavy:true,knockdown:true},
    },
  },
  'logo-reviewer': {
    feedback:'Make the logo bigger.', hp:28,hurt:{w:18,h:42},speed:.75,range:26,windup:84,retreat:45,color:'#F5E6C8',
    moves:{attack1:{startup:6,active:4,recovery:24,damage:8,hitbox:{x:6,y:-34,w:25,h:20},knockback:4,hitstop:4,heavy:true}},
  },
  'pop-reviewer': {
    feedback:"It doesn't pop.", hp:18,hurt:{w:16,h:42},speed:.85,range:72,windup:72,retreat:45,color:'#508B83',
    moves:{attack1:{startup:6,active:1,recovery:28,damage:4,projectile:{speed:2.4,life:100},knockback:.5,hitstop:2}},
  },
  'options-reviewer': {
    feedback:'Can we try a few options?', feint:true,hp:22,hurt:{w:16,h:42},speed:1,range:22,windup:84,retreat:40,color:'#A44F38',
    moves:{attack1:{startup:4,active:3,recovery:18,damage:4,hitbox:{x:4,y:-32,w:20,h:14},knockback:1,hitstop:2}},
  },
  'small-change-reviewer': {
    feedback:'Just one small change.',combo:true,hp:26,hurt:{w:16,h:42},speed:.9,range:22,windup:84,retreat:60,color:'#B98A24',
    moves:{
      attack1:{startup:4,active:3,recovery:12,damage:3,hitbox:{x:4,y:-32,w:18,h:14},knockback:.2,hitstop:2,next:'attack2'},
      attack2:{startup:5,active:3,recovery:12,damage:3,hitbox:{x:4,y:-32,w:20,h:14},knockback:.2,hitstop:2,next:'attack3'},
      attack3:{startup:5,active:3,recovery:22,damage:5,hitbox:{x:4,y:-32,w:22,h:14},knockback:2,hitstop:3},
    },
  },
};

export const ARENA_PAD = 8;
export const WAVES = [
  {id:'overworld-1',at:320,enemies:[{type:'contrast-bandit',side:'right'},{type:'alt-text-gremlin',side:'left'},{type:'logo-reviewer',side:'right'}]},
  ...[
    ['feedback-round',480,['Make the logo bigger.',"It doesn't pop.",'Can we try a few options?','Just one small change.']],
    ['product-review',720,['Could this feel a little more premium?',"This doesn't quite meet our users' needs.",'Can you explain why you made the button this way?',"I've got one more change for you."]],
    ['final-signoff',960,["Let's revisit the version from yesterday.",'Can we squeeze this into the release?','Can we get one more stakeholder in here?',"It's a tiny change. Should be quick."]],
  ].map(([id,at,lines])=>({id,at,enemies:['logo-reviewer','pop-reviewer','options-reviewer','small-change-reviewer'].map((type,i)=>({type,side:i%2?'left':'right',feedback:lines[i]}))})),
  {id:'overworld-2',at:1180,enemies:[{type:'lord-overlay',side:'right'},{type:'contrast-bandit',side:'left'}]},
  {id:'overworld-3',at:1400,boss:true,enemies:[{type:'warlord-z-index',side:'right'}]},
];
