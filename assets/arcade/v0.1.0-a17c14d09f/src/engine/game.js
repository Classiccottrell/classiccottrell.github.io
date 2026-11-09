import {createDialogue} from './dialogue.js';
import { BASE_W, BASE_H, applyScale, applyWide, WORLD_ZOOM, worldViewWidth } from './scale.js';
import { createMusic } from '../music.js';
import {play,startTitleMusic,stopTitleMusic,stopEffects,setMuted as muteEffects} from '../audio/audio.js';
import {createFootsteps} from '../audio/footsteps.js';
import { createLoop } from './loop.js';
import { createInput } from './input.js';
import {createTouchControls} from './touch.js';
import { loadHeroSprite } from './hero.js';
import { loadSceneArt } from './scene-art.js';
import { createDemo } from '../attract/demo.js';
import { followCamera } from './camera.js';
import { drawParallax } from './parallax.js';
import { drawText, textWidth } from './font.js';
import { createLayers, drawHero, PALETTE, WORLD_W, DOOR_X, GROUND_Y } from './placeholder.js';
import { fetchRoom } from '../rooms/loader.js';
import { SPRITE_NAMES } from '../rooms/sprites.js';
import { createRoomView, loadArchiveArt, clampX, nearInteract, wantsExit } from '../rooms/room.js';
import { drawRoomDoor, createDoorArt, doorAvailable } from '../rooms/door.js';
import { createFloor } from './floor.js';
import { createGlow, createShadow, breathIndex } from './light.js';
import { drawToastText, toastWidth } from '../rooms/toast.js';
import { createProjectCaption } from '../rooms/card.js';
import { markFound, TOTAL_ROOMS } from '../rooms/found.js';
import { createCombat } from '../combat/combat.js';
import {drawTerryPickup} from '../combat/terry.js';
import { drawFighters,feedbackSpeech } from '../combat/draw.js';
import {loadEnemySprites} from '../combat/sprites.js';
import { drawHud } from '../combat/hud.js';
import { createSequence, drawSequence, drawTitleCard } from '../title/sequence.js';
import { initialFlow, flowEvent, flowTick, visibleScene, fadeCover } from '../rooms/flow.js';

const ROOM_URL = new URL('../../rooms/vpat-vault.json', import.meta.url);
const DOOR_SLUG = 'vpat-vault';
const DOOR_LABEL = 'VPAT VAULT';
const TOAST_SECS = 3;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

const SPEED = 70; // px/s
const RIM_RANGE = 56; // world units from the door centre within which the hero catches its warm light

export function mountGame(container, {
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  onEnterDoor = (slug) => console.debug('[cc-sidescroller] onEnterDoor', slug),
  roomUrl = ROOM_URL,
  roomsEnabled = false,
  autoplayIntro = false,
  onBeat = () => {}, // title-sequence stage names, for the audio layer to hook later
  onExpandChange = () => {},
  onExit = null, // host closes the embedded arcade, distinct from leaving fullscreen
  fit = 'fixed',            // 'wide': internal width follows the container (height stays 180)
  music = null,            // audio URL; starts on the title-card gesture only, never autoplays
  onMuteChange = () => {},
  onMusicState = () => {}, // 'idle' | 'playing' | 'muted' | 'blocked' | 'off'
} = {}) {
  const wide = fit === 'wide';
  let W = BASE_W;
  let viewW = worldViewWidth(W); // visible world width after the integer zoom
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'Side-scrolling game. Press Enter to start, arrows or A and D to move, Space three times for punch, punch, kick, L or C to dodge, Escape to leave fullscreen. Controls help is in the top right.');
  canvas.style.display = 'block';
  canvas.style.flexShrink = '0';
  container.style.display='flex';container.style.flexDirection='column';container.style.justifyContent='flex-start';
  canvas.style.margin = '0 auto';
  canvas.style.outlineOffset = '2px';
  const stage=document.createElement('div');stage.className='cc-game-stage';
  container.classList.add('cc-game-shell');stage.appendChild(canvas);container.appendChild(stage);
  if (wide) container.style.overflowX = 'hidden';
  container.style.overflowY='auto';
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  // Palette-drawn world art (deterministic generators) and prerendered light masks; all built once.
  const floor = createFloor(makeCanvas), doorArt = createDoorArt(makeCanvas);
  const doorGlow = createGlow(makeCanvas), heroShadow = createShadow(makeCanvas);

  let heroSprite = null, destroyed = false;
  let enemySprites=null;
  loadEnemySprites().then(sprites=>{if(!destroyed)enemySprites=sprites;}).catch(error=>console.warn('[cc-sidescroller] enemy art unavailable; using fallback',error));
  loadHeroSprite(makeCanvas).then(sprite => { if (!destroyed) heroSprite = sprite; })
    .catch(error => console.warn('[cc-sidescroller] hero unavailable; using fallback', error));
  let layers = createLayers(), titleArt = null, stickerArt=null;
  loadSceneArt().then(art => { if (!destroyed) {layers = art.layers; titleArt = art.title; stickerArt=art.sticker;} })
    .catch(error => console.warn('[cc-sidescroller] using fallback scene', error));
  const input = createInput(canvas);
  let combat = createCombat({ reducedMotion, worldW: WORLD_W });
  let soundMuted=false,audioUnlocked=false,introGesture=false;
  try{soundMuted=globalThis.localStorage?.getItem('cc-sidescroller:muted')==='1';}catch{}
  muteEffects(soundMuted);
  function sfx(name){if(audioUnlocked&&!soundMuted&&!demo)play(name);}
  const footstep=createFootsteps();

  let flow = initialFlow();
  let seq = null;
  let demo = null, titleIdle = 0;
  let restoreDemoCombat = () => {};
  function startIntro() {
    demo?.stop(); demo = null; restoreDemoCombat(); titleIdle = 0;
    stopEffects();
    caption?.destroy();caption=null;captionDismissed=false;toast=null;toastT=0;
    const skip=combat.skip;combat=createCombat({reducedMotion,worldW:WORLD_W});combat.setSkip(skip);
    bgm?.fadeOut(0);
    seq = createSequence({reducedMotion,onBeat(name){
      onBeat(name);
      const cue={wipe:'cartridge-click',wordmark:'boot-sting',credit:'blip',title:'title-arrive'}[name];
      if(cue)sfx(cue);
    }});
    flow = flowEvent(initialFlow(),'playIntro');
    time = 0; camX = 0; prevCam = 0;
    if(audioUnlocked&&!soundMuted)startTitleMusic();
    if(expanded)resize();
  }
  const publish = () => {
    const st = flow.name === 'intro' ? seq.stage().name : visibleScene(flow);
    if (canvas.dataset.stage !== st) { canvas.dataset.stage = st; container.dataset.stage = st; }
    container.dataset.attract=demo?.phase||'off';
    dialogue.update(visibleScene(flow)==='overworld'?feedbackSpeech(combat,camX,viewW):null);
    controls.update({scene:visibleScene(flow),blocked:flow.name==='transition',skip:combat.skip,replay:flow.name==='overworld'&&!!combat.flags.loopComplete&&!nearDoor(),muted:soundMuted,activated:audioUnlocked,canInteract:roomsEnabled});
  };
  let time = 0;
  let camX = 0, prevCam = 0;
  let px = 40, prevPx = 40, facing = 1, walkT = 0, frame = 0, moving = false;
  let room = null, roomView = null, caption = null, captionDismissed=false,toast = null, toastT = 0;
  const coverPatterns = [];

  if(roomsEnabled) fetchRoom(roomUrl, { knownSprites: SPRITE_NAMES }).then((r) => {
    if(destroyed)return;
    room = r;
    roomView = createRoomView(r,makeCanvas);
    loadArchiveArt().then(art=>{if(!destroyed)roomView=createRoomView(r,makeCanvas,art);}).catch(error=>console.warn('[cc-sidescroller] archive art unavailable; using fallback',error));
  }).catch((e) => console.warn('[cc-sidescroller] room unavailable', e));

  const nearDoor = () => roomsEnabled && Math.abs(px + 8 - (DOOR_X + 12)) < 20;

  function coverPattern(level) {
    if (!coverPatterns[level]) {
      const c = document.createElement('canvas'); c.width = c.height = 4;
      const g = c.getContext('2d'); g.fillStyle = PALETTE[0];
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (BAYER[y][x] < level) g.fillRect(x, y, 1, 1);
      coverPatterns[level] = ctx.createPattern(c, 'repeat');
    }
    return coverPatterns[level];
  }

  function onSceneChange(scene, prev) {
    prevPx = px;
    if (scene === 'room') {
      combat.endTerry();
      px = 28; facing = 1; camX = 0;
      const r = markFound(room.slug);
      if (r.isNew) { toast = `ROOM FOUND ${Math.min(r.count, TOTAL_ROOMS)}/${TOTAL_ROOMS}`; toastT = TOAST_SECS;sfx('achievement'); }
    } else if (scene === 'overworld' && prev === 'room') { // only a return from the room spawns at the door; a fresh start keeps startPlay's spawn
      px = DOOR_X + 4; facing = 1;
      combat.placeHero(px + 8); combat.hero.facing = 1;
      camX = followCamera({ camX: 0, playerX: px + 8, viewW, worldW: WORLD_W });
      // converge dead-zone camera onto the player
      for (let i = 0; i < 8; i++) camX = followCamera({ camX, playerX: px + 8, viewW, worldW: WORLD_W });
    }
    prevPx = px; prevCam = camX; moving = false; frame = 0; walkT = 0;
  }

  function walk(dt, clamp) {
    const dir = (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
    moving = dir !== 0;
    if (moving) {
      facing = dir;
      px = clamp(px + dir * SPEED * dt);
      walkT += dt;
      frame = reducedMotion ? 0 : Math.floor(walkT / 0.18) % 2;
    } else { walkT = 0; frame = 0; }
  }

  function startPlay() {
    stopTitleMusic();stopEffects();
    if(!bgm?.started)setMusicState(soundMuted?'muted':'off');
    flow = flowEvent(flow, 'start');
    camX = 0; px = 40; prevCam = camX; prevPx = px;
    combat.placeHero(px + 8);
  }

  function update(dt) {
    const waiting = flow.name === 'title' || (flow.name === 'intro' && seq.atTitle());
    titleIdle = waiting ? titleIdle + dt : 0;
    if (waiting && titleIdle >= 12 && (!roomsEnabled || room) && !reducedMotion &&
        !input.pressed('enter') && !input.pressed('act') && !titleGo) {
      const previousSkip = combat.skip;
      startPlay();
      combat=createCombat({reducedMotion,worldW:WORLD_W});
      bgm?.fadeOut(0);stopTitleMusic();
      restoreDemoCombat = () => { combat.setSkip(previousSkip); restoreDemoCombat = () => {}; };
      const endDemo = () => { demo = null; restoreDemoCombat(); };
      demo = createDemo(input,canvas,{combat,onTakeover:endDemo,onDone:startIntro});
    }
    demo?.update(dt);
    if (!reducedMotion) time += dt;
    if (toastT > 0) toastT -= dt;
    prevCam = camX; prevPx = px;
    const before = visibleScene(flow);
    if (flow.name === 'transition') {
      flow = flowTick(flow);
    } else if (flow.name === 'intro') {
      seq.update(dt);
      const go = input.pressed('enter') || input.pressed('act') || titleGo;
      if (go && !introGesture && !seq.skip() && seq.atTitle()) startPlay();
    } else if (flow.name === 'title') {
      if (input.pressed('enter') || input.pressed('act') || titleGo) {
        startPlay();
      }
    } else if (flow.name === 'overworld') {
      const evs = combat.step({
        dir: (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0),
        attack: input.pressed('attack') || input.pressed('act'), jump: false, // Space/J chains punch, cross, hop-kick; no separate jump control
        dodge: input.pressed('dodge'), skip: input.pressed('skip'), collect:!demo,
      }, camX, viewW);
      const hero = combat.hero;
      px = hero.x - 8; facing = hero.facing; moving = hero.state === 'walk';
      walkT = moving ? walkT + dt : 0;
      frame = moving && !reducedMotion ? Math.floor(walkT / 0.18) % 2 : 0;
      for (const ev of evs) {
        if (ev.type === 'hit') sfx(ev.heavy ? 'punch-heavy' : 'punch');
        if (ev.type === 'terry-collected') {sfx(ev.powered?'terry-charge':'pickup');toast=ev.powered?'TERRY MODE':'STICKER FOUND';toastT=TOAST_SECS;}
        if (ev.type === 'cleared') { toast = 'WAVE CLEARED'; toastT = TOAST_SECS; }
        if(ev.type==='boss-tell')sfx('blip');
        if(ev.type==='complete'){toast='WARLORD DEFEATED';toastT=TOAST_SECS;sfx('achievement');}
        if (ev.type === 'wrap') { px = ev.x - 8; prevPx = px; camX = 0; prevCam = 0; }
        if (ev.type === 'respawn') {
          px = ev.x - 8; prevPx = px;
          for (let i = 0; i < 40; i++) camX = followCamera({ camX, playerX: px + 8, viewW, worldW: WORLD_W });
          prevCam = camX;
        }
      }
      if(input.pressed('enter')&&nearDoor()&&combat.director.arena){toast='CLEAR THE FIGHT';toastT=TOAST_SECS;}
      if (input.pressed('enter') && doorAvailable(nearDoor(),combat.director.arena) && room && (hero.state === 'idle' || hero.state === 'walk')) {
        onEnterDoor(DOOR_SLUG);
        sfx('door');
        flow = flowEvent(flow, 'enterDoor', { reducedMotion });
      }
      const arena = combat.director.arena;
      if (arena) camX = arena.camX;
      else {
        const tgt = followCamera({ camX, playerX: px + 8, viewW, worldW: WORLD_W });
        camX += Math.max(-4, Math.min(4, tgt - camX)); // eased so the arena release does not snap
      }
      if(combat.flags.loopComplete&&input.pressed('enter')&&!nearDoor()){combat.nextLap();px=prevPx=combat.hero.x-8;camX=prevCam=0;toast='NEXT LAP';toastT=TOAST_SECS;}
    } else if (flow.name === 'room') {
      walk(dt, (x) => clampX(x, room));
      if (wantsExit(px, { leftHeld: input.held('left'), enter: input.pressed('enter') })) {
        sfx('door');
        flow = flowEvent(flow, 'exit', { reducedMotion });
      }
      camX = followCamera({ camX, playerX: px + 8, viewW, worldW: roomView.width });
    }
    const after = visibleScene(flow);
    if (after !== before) onSceneChange(after, before);
    const byDesk=flow.name==='room'&&nearInteract(px,room,64);
    if(!byDesk)captionDismissed=false;
    else if(input.pressed('enter'))captionDismissed=false;
    if(byDesk&&!captionDismissed&&!caption){
      caption=createProjectCaption(canvas,{title:room.title,blurb:room.interact.card,href:room.href},()=>{captionDismissed=true;if(expanded)resize();});
      caption.setExpanded(expanded);
    }
    if(caption){
      const changed=caption.setVisible(byDesk&&!captionDismissed);
      if(expanded&&changed)resize();
      if(byDesk&&input.pressed('enter')){input.releaseAll();caption.link.focus({preventScroll:true});}
    }
    if(footstep(px,moving&&(flow.name==='overworld'||flow.name==='room')&&audioUnlocked&&!soundMuted&&!demo))sfx('footstep');
    publish();
    titleGo = false;
    introGesture=false;
    input.endFrame();
  }

  function drawToast() {
    if (!toast || toastT <= 0) return;
    const w = toastWidth(toast) + 10, x = Math.floor((W - w) / 2), y = 76;
    ctx.fillStyle = PALETTE[0]; ctx.fillRect(x - 1, y - 1, w + 2, 21);
    ctx.fillStyle = PALETTE[16]; ctx.fillRect(x, y, w, 19);
    ctx.fillStyle = PALETTE[12]; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + 18, w, 1);
    drawToastText(ctx, toast, x + 5, y + 4, '#ffe27a');
  }

  function render(alpha) {
    const scene = visibleScene(flow);
    const cam = scene === 'title' || scene === 'intro' ? 0 : Math.round(prevCam + (camX - prevCam) * alpha);
    const hx = prevPx + (px - prevPx) * alpha;
    ctx.clearRect(0, 0, W, BASE_H);
    const zoomed = scene === 'overworld' || scene === 'room';
    if (scene === 'overworld') drawParallax(ctx, layers.slice(0,3), cam * WORLD_ZOOM, time, W);
    if (zoomed) {ctx.save();ctx.translate(0,GROUND_Y);ctx.scale(WORLD_ZOOM,WORLD_ZOOM);ctx.translate(0,-GROUND_Y);}
    if (scene === 'intro') {
      drawSequence(ctx, seq, {
        width: W,
        titleArt,
        backdrop: (c) => drawParallax(c, layers, time * 8, time, W),
        blinkOn: Math.floor(seq.t * 2) % 2 === 0,
      });
    } else if (scene === 'room' && roomView) {
      const ox = roomView.originX(viewW);
      roomView.draw(ctx, cam, { viewW });
      if (heroSprite) heroSprite.draw(ctx, {x:hx+8-cam+ox,y:150,facing,state:moving?'walk':'idle',seconds:moving?walkT:time,reducedMotion});
      else drawHero(ctx, hx - cam + ox, 150 - 24, frame, facing);
      if (flow.name === 'room' && captionDismissed && nearInteract(px, room,64)) roomView.drawPrompt(ctx, cam, true, ox);
    } else {
      // Title: ambient scroll comes from `time` via the sky layer plus a slow camera drift on far layers.
      const drift = scene === 'title' ? time * 8 : 0;
      const sh = combat.fx.shakeOffset();
      ctx.save(); ctx.translate(sh.x, sh.y);
      drawParallax(ctx, scene === 'overworld' ? [floor.layer] : layers, cam + drift, time, scene === 'overworld' ? viewW : W);
      if (scene === 'overworld') {
        const doorCx = DOOR_X + 12, heroCx = hx + 8, near = flow.name === 'overworld' && doorAvailable(nearDoor(),combat.director.arena);
        floor.drawAnimated(ctx, cam, viewW, time, reducedMotion);
        drawTerryPickup(ctx,combat.terry,cam,time,reducedMotion,stickerArt);
        if(roomsEnabled) doorGlow.draw(ctx, doorCx - cam, GROUND_Y + 2, Math.min(3, breathIndex(time, 5, 4, reducedMotion) + (near ? 1 : 0)));
        if(roomsEnabled) drawRoomDoor(ctx, DOOR_X - cam, DOOR_LABEL, near, doorArt, { time, reduced: reducedMotion });
        heroShadow.draw(ctx, Math.round(heroCx - cam), GROUND_Y + combat.hero.y + 2);
        const gap = Math.abs(heroCx - doorCx);
        const rim = roomsEnabled && gap < RIM_RANGE ? { side: Math.sign(doorCx - heroCx) || 1, index: Math.min(3, Math.floor((1 - gap / RIM_RANGE) * 4)) } : {side:1,index:0};
        drawFighters(ctx, combat, cam, { hx: heroCx, frame, sprite:heroSprite, enemySprites, seconds:moving?walkT:time, reducedMotion, rim,viewW });
      } else {
        if (titleArt) drawTitleCard(ctx,titleArt,W,reducedMotion || Math.floor(time*2)%2===0,{seconds:time,reducedMotion});
        else {
          const s = 'PRESS ENTER';
          const x = Math.floor((W - textWidth(s)) / 2), y = 84;
          if (reducedMotion || Math.floor(time * 2) % 2 === 0) {
            drawText(ctx, s, x + 1, y + 1, '#0e0b1a');
            drawText(ctx, s, x, y, '#f7f4e8');
          }
        }
      }
      ctx.restore();
    }
    if (zoomed) ctx.restore();
    if (scene === 'overworld') drawHud(ctx, combat, W,nearDoor());
    if (zoomed) drawToast();
    const cover = Math.max(fadeCover(flow),demo?.cover||0);
    if (cover > 0) {
      ctx.fillStyle = coverPattern(Math.min(16, Math.round(cover * 16)));
      ctx.fillRect(0, 0, W, BASE_H);
    }
  }

  // Music: created only here; started inside the real gesture handlers below (never from the loop).
  const saveData = !!globalThis.navigator?.connection?.saveData;
  const bgm = music && !saveData ? createMusic({ url: music }) : null;
  container.dataset.music = soundMuted?'muted':'idle';
  const setMusicState = (s) => { container.dataset.music = s; onMusicState(s); };
  const atTitleCard = () => flow.name === 'title' || (flow.name === 'intro' && seq.atTitle());
  function musicGesture() {
    audioUnlocked=true;muteEffects(soundMuted);
    if(!soundMuted&&bgm){
      if(!bgm.started)bgm.start().then(setMusicState);
      else bgm.fadeIn(0)?.then(setMusicState);
    }
    onMuteChange(soundMuted);
  }
  function introSound(){
    audioUnlocked=true;muteEffects(soundMuted);
    if(!soundMuted)startTitleMusic().then(ok=>{if(ok&&!destroyed&&!demo&&(flow.name==='intro'||flow.name==='title'))setMusicState('playing');});
  }
  const needsSoundRestart=()=>flow.name==='intro'&&!seq.atTitle()&&!audioUnlocked;
  canvas.addEventListener('keydown', (e) => {
    if(flow.name==='overworld'&&!e.repeat)musicGesture();
    if((e.key==='Enter'||e.key===' ')&&!e.repeat){
      if(needsSoundRestart()){introGesture=true;introSound();startIntro();}
      else if(atTitleCard())musicGesture();
    }
  });
  // Click/tap on the title card also starts. Touch only grants user activation on pointerup/click (not
  // pointerdown), so the music starts from `click`; `downAtTitle` keeps the tap that skips the intro from
  // also leaving the title card. The scene change itself runs in update() like the keyboard path.
  let downAtTitle = false, titleGo = false;
  canvas.addEventListener('pointerdown', () => {
    downAtTitle = atTitleCard();
    if (!downAtTitle && flow.name === 'intro'&&audioUnlocked) seq.skip();
  });
  function clickGame() {
    if(needsSoundRestart()){introGesture=true;introSound();startIntro();}
    else if (downAtTitle && atTitleCard()) { musicGesture(); titleGo = true; }
    else if(flow.name==='overworld')musicGesture();
    downAtTitle = false;
  }
  canvas.addEventListener('click',clickGame);

  function setMuted(b) {
      soundMuted=!!b;muteEffects(soundMuted);
      try{globalThis.localStorage?.setItem('cc-sidescroller:muted',soundMuted?'1':'0');}catch{}
      const resumeLevel=!demo&&(flow.name==='overworld'||flow.name==='room');
      bgm?.setMuted(soundMuted,{resume:resumeLevel}).then(s=>{if(bgm.started&&resumeLevel)setMusicState(s);});
      if(!soundMuted){audioUnlocked=true;if(flow.name==='intro'||flow.name==='title')introSound();}
      else setMusicState('muted');
      onMuteChange(soundMuted);
    }

  const dialogue=createDialogue(container);
  const controls=createTouchControls(container,canvas,input,{
    onPress(){
      if(demo){demo.stop();demo=null;restoreDemoCombat();}
      return flow.name==='overworld'||flow.name==='room';
    },
    onGesture(action){
      if(action==='enter'&&(flow.name==='intro'||flow.name==='title')){
        if(flow.name==='intro'&&!seq.atTitle()&&audioUnlocked)seq.skip();
        else{downAtTitle=atTitleCard();clickGame();}
      }
      else if(flow.name==='overworld'||flow.name==='room')musicGesture();
    },
    onClose:()=>collapse(),
    onExit,
    onExpand:()=>expand(),
    onMute:()=>setMuted(audioUnlocked&&!soundMuted),
    onLayout:()=>resize(),
  });

  // Expand: fixed, dimmed overlay; the canvas integer-scales to the viewport (letterboxed).
  let expanded = false, savedCss = '', placeholder = null, returnFocus = null,inertSiblings=[];
  function expand() {
    if (expanded) return;
    expanded = true;
    returnFocus = document.activeElement;
    const r = container.getBoundingClientRect();
    placeholder = document.createElement('div'); // keep the page layout from collapsing
    placeholder.style.cssText = `width:${r.width}px;height:${r.height}px;`;
    placeholder.setAttribute('aria-hidden', 'true');
    container.before(placeholder);
    savedCss = container.style.cssText;
    container.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow-x:hidden;overflow-y:auto;background:rgba(14,11,26,0.97);';
    canvas.style.margin = 'auto';
    container.dataset.expanded='true';
    controls.setExpanded(true);
    caption?.setExpanded(true);
    for(let node=container;node&&node!==document.body;node=node.parentElement){
      for(const sibling of node.parentElement.children){if(sibling===node)continue;inertSiblings.push([sibling,sibling.inert]);sibling.inert=true;}
    }
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');
    container.setAttribute('aria-label', 'Game');
    document.addEventListener('keydown', onEsc, true);
    container.addEventListener('click', onBackdrop);
    resize();
    canvas.focus({ preventScroll: true });
    onExpandChange(true);
  }
  function collapse() {
    if (!expanded) return;
    expanded = false;
    delete container.dataset.expanded;
    controls.setExpanded(false);
    caption?.setExpanded(false);
    document.removeEventListener('keydown', onEsc, true);
    container.removeEventListener('click', onBackdrop);
    container.style.cssText = savedCss;
    canvas.style.margin = '0 auto';
    container.removeAttribute('role'); container.removeAttribute('aria-modal'); container.removeAttribute('aria-label');
    for(const [node,previous] of inertSiblings)node.inert=previous;inertSiblings=[];
    placeholder?.remove(); placeholder = null;
    resize();
    const rf = returnFocus; returnFocus = null;
    if (rf && rf !== canvas && rf.isConnected) rf.focus({ preventScroll: true }); else canvas.blur();
    onExpandChange(false);
  }
  function onEsc(e) {
    if(e.key==='Tab'){
      const targets=[...container.querySelectorAll('canvas,a[href],button')].filter(el=>!el.disabled&&el.getClientRects().length);
      const first=targets[0],last=targets.at(-1),active=document.activeElement;
      if(!container.contains(active)||(e.shiftKey&&active===first)||(!e.shiftKey&&active===last)){e.preventDefault();(e.shiftKey?last:first)?.focus({preventScroll:true});}
      return;
    }
    if (e.key !== 'Escape') return;
    if(controls.closeHelp()){e.preventDefault();e.stopPropagation();return;}
    if(document.activeElement?.closest('.cc-project-caption'))return;
    e.preventDefault(); e.stopPropagation();
    collapse();
  }
  function onBackdrop(e) { if (e.target === container) collapse(); }

  const loop = createLoop({ update, render });

  // Pause conditions.
  let visible = true, docVisible = !document.hidden;
  function sync() {
    if(visible&&docVisible){
      muteEffects(soundMuted);loop.start();
      if(!demo&&audioUnlocked&&!soundMuted){
        if(flow.name==='intro'||flow.name==='title')introSound();
        else bgm?.fadeIn(600)?.then(setMusicState);
      }
    }else{loop.stop();controls.release();muteEffects(true);bgm?.fadeOut(0);}
  }
  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; sync(); })
    : null;
  io?.observe(container);
  const onVis = () => { docVisible = !document.hidden; sync(); };
  document.addEventListener('visibilitychange', onVis);

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(container);ro?.observe(stage);
  function resize() {
    const w = container.clientWidth || BASE_W;
    if(expanded){container.style.paddingTop=`${caption?.height||0}px`;container.style.boxSizing='border-box';}
    stage.style.minHeight=`${BASE_H/(globalThis.devicePixelRatio||1)}px`;
    const availableH=stage.clientHeight||BASE_H;
    if (wide) {
      W = applyWide(canvas, w, availableH).width;
    } else {
      applyScale(canvas, w, availableH);
    }
    viewW = worldViewWidth(W);
    const arena=combat.resize(viewW);
    if(arena&&flow.name==='overworld'){camX=arena.camX;prevCam=camX;px=combat.hero.x-8;prevPx=px;}
    ctx.imageSmoothingEnabled = false; // resetting size clears context state
  }
  if(autoplayIntro)startIntro();
  resize();
  sync();

  return {
    input,
    get combat(){return combat;},
    playIntro() { startIntro(); sync(); },
    enableSound(){soundMuted=false;audioUnlocked=true;muteEffects(false);bgm?.setMuted(false,{resume:false});try{globalThis.localStorage?.setItem('cc-sidescroller:muted','0');}catch{}if(flow.name==='intro'||flow.name==='title')introSound();onMuteChange(false);},
    expand,
    collapse,
    isExpanded: () => expanded,
    isMuted: () => soundMuted,
    setMuted,
    destroy() {
      destroyed = true; heroSprite = null;enemySprites=null;
      demo?.stop(); demo = null; restoreDemoCombat();
      stopTitleMusic();stopEffects();muteEffects(true);
      bgm?.destroy();
      collapse();
      loop.stop();
      caption?.destroy();
      io?.disconnect();
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      input.destroy();
      controls.destroy();
      dialogue.destroy();
      stage.remove();container.classList.remove('cc-game-shell');
    },
  };
}
