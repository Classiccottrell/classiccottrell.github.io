// Title sequence: CRT wipe -> wordmark reveal -> credit card -> title card (PRESS ENTER).
// Pure timeline (stageAt / createSequence) + a canvas drawer on a 180-high canvas of any width. No audio:
// `onBeat(name)` fires once on entering each stage so the audio layer can hook in later.
// NOTE: Codex's src/boot/boot.js replaces this sequence when it lands; keep the createSequence
// contract (update/skip/stage/done) so game.js only needs an import swap.
import { BASE_W, BASE_H } from '../engine/scale.js';
import { drawText, textWidth,FONT_ADVANCE } from '../engine/font.js';

export const WORDMARK = 'CLASSIC COTTRELL';
export const CREDIT = 'DEVELOPED BY CLASSIC COTTRELL';
export const STAGES = ['wipe', 'wordmark', 'credit', 'title'];
// Deliberate holds leave time to read the studio and credit before the title settles.
export const TIMES = { wipe: 0, wordmark: 1.2, credit: 4.8, title: 8.4 };
export const TOTAL = 12;
// Reduced motion: static cards only, no wipe, no letter reveal, no blink.
export const TIMES_REDUCED = { wipe: 0, wordmark: 0, credit: 3.5, title: 7 };

const COLORS = { bg: '#0e0b1a', line: '#2d2250', text: '#f7f4e8', accent: '#ffe27a', dim: '#a1608a' };

// Pure: which stage is active at time t, and 0..1 progress within it (title: always 1 progress capped).
export function stageAt(t, reducedMotion = false) {
  const times = reducedMotion ? TIMES_REDUCED : TIMES;
  let name = 'wipe';
  for (const s of STAGES) if (t >= times[s]) name = s;
  if (reducedMotion && name === 'wipe') name = 'wordmark';
  const i = STAGES.indexOf(name);
  const start = times[name];
  const end = i < STAGES.length - 1 ? times[STAGES[i + 1]] : TOTAL;
  return { name, progress: end > start ? Math.min(1, Math.max(0, (t - start) / (end - start))) : 1 };
}

export const lettersShown = (progress, reducedMotion = false) =>
  reducedMotion ? WORDMARK.length : Math.min(WORDMARK.length, Math.floor(progress * 1.25 * (WORDMARK.length + 1)));

export function createSequence({ reducedMotion = false, onBeat = () => {} } = {}) {
  let t = 0, last = null;
  const enter = () => {
    const cur = stageAt(t, reducedMotion).name;
    if (cur !== last) {
      // fire every stage passed through (large dt) in order
      const from = last ? STAGES.indexOf(last) + 1 : 0;
      for (let i = from; i <= STAGES.indexOf(cur); i++) if (!(reducedMotion && STAGES[i] === 'wipe')) onBeat(STAGES[i]);
      last = cur;
    }
  };
  enter();
  return {
    get t() { return t; },
    get reducedMotion() { return reducedMotion; },
    update(dt) { t += dt; enter(); },
    skip() {
      if (stageAt(t, reducedMotion).name === 'title') return false;
      onBeat('skip');
      t = (reducedMotion ? TIMES_REDUCED : TIMES).title;
      last = 'title'; onBeat('title'); // skipped stages do not fire
      return true;
    },
    stage: () => stageAt(t, reducedMotion),
    atTitle: () => stageAt(t, reducedMotion).name === 'title',
    done: () => t >= TOTAL,
  };
}

function big(ctx, s, cx, y, scale, color) {
  const w = textWidth(s) * scale;
  ctx.save();
  ctx.translate(Math.floor(cx - w / 2), y);
  ctx.scale(scale, scale);
  drawText(ctx, s, 0, 0, color);
  ctx.restore();
}

function scanlines(ctx, alpha, W) {
  ctx.fillStyle = `rgba(14,11,26,${alpha})`;
  for (let y = 0; y < BASE_H; y += 2) ctx.fillRect(0, y, W, 1);
}

// backdrop(ctx): optional painter for the title card (e.g. the parallax sky).
export function drawSequence(ctx, seq, { backdrop, titleArt, blinkOn = true, width = BASE_W } = {}) {
  const W = width;
  const { name, progress } = seq.stage();
  const rm = seq.reducedMotion;
  const cx = W / 2;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, BASE_H);
  if (name === 'wipe') {
    // Bright scan line sweeps down while the lines behind it fill in.
    const y = Math.floor(progress * BASE_H);
    ctx.fillStyle = COLORS.line;
    for (let r = 0; r < y; r += 2) ctx.fillRect(0, r, W, 1);
    ctx.fillStyle = COLORS.text;
    ctx.fillRect(0, y, W, 1);
    return;
  }
  if (titleArt && name === 'wordmark') {
    ctx.save();
    ctx.beginPath();ctx.rect(0,0,Math.ceil(W*(rm?1:progress)),BASE_H);ctx.clip();
    drawTitleCard(ctx,titleArt,W,true);ctx.restore();return;
  }
  if (titleArt && name === 'title') {drawTitleCard(ctx,titleArt,W,rm||blinkOn);return;}
  if (name === 'wordmark') {
    const n = lettersShown(progress, rm);
    const full = WORDMARK;
    const scale=Math.max(1,Math.min(3,Math.floor((W-16)/textWidth(full))));
    const w = textWidth(full) * scale;
    const x0 = Math.floor(cx - w / 2);
    ctx.save(); ctx.translate(x0, 76); ctx.scale(scale,scale);
    for (let i = 0; i < n; i++) {
      if (full[i] !== ' ') drawText(ctx, full[i], i * FONT_ADVANCE, 0, i === n - 1 && !rm ? COLORS.accent : COLORS.text);
    }
    ctx.restore();
    ctx.fillStyle = COLORS.dim;
    ctx.fillRect(x0, 98, Math.floor(w * (rm ? 1 : Math.min(1, n / full.length))), 1);
  } else if (name === 'credit') {
    big(ctx,CREDIT,cx,80,Math.max(1,Math.min(2,Math.floor((W-24)/textWidth(CREDIT)))),COLORS.text);
  } else {
    backdrop?.(ctx);
    ctx.fillStyle = 'rgba(14,11,26,0.45)';
    ctx.fillRect(0, 0, W, BASE_H);
    big(ctx,WORDMARK,cx,62,Math.max(1,Math.min(3,Math.floor((W-16)/textWidth(WORDMARK)))),COLORS.text);
    if (rm || blinkOn) {
      big(ctx, 'PRESS ENTER', cx, 112, 1, COLORS.accent);
    }
  }
  if (!rm) scanlines(ctx, 0.18, W);
}

export function drawTitleCard(ctx,art,width,blinkOn=true) {
  const image=width>=480&&art.wide?art.wide:width<320?art.compact:art.full;
  const x=Math.floor((width-image.width)/2);
  ctx.fillStyle='#19232D';ctx.fillRect(0,0,width,BASE_H);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(image,x,0);
  // Extend the landscape edge colours; the central wordmark stays at its authored pixel size.
  if (x>0) ctx.drawImage(image,0,0,1,BASE_H,0,0,x,BASE_H);
  const right=x+image.width;
  if (right<width) ctx.drawImage(image,image.width-1,0,1,BASE_H,right,0,width-right,BASE_H);
  // Keep the approved illustrated wordmark; set the prompt and credit in the licensed game face.
  ctx.fillStyle='#19232D';ctx.fillRect(0,154,width,26);
  if(blinkOn)drawText(ctx,'PRESS ENTER',Math.floor((width-textWidth('PRESS ENTER'))/2),157,'#FFE778');
  drawText(ctx,CREDIT,Math.floor((width-textWidth(CREDIT))/2),171,'#F5E6C8');
}
