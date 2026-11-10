// Pure game-state machine: [intro ->] title -> overworld -> room -> overworld, with 12-frame dither fades.
export const FADE_FRAMES = 12;

export const initialFlow = () => ({ name: 'title', t: 0, from: null, to: null });

export function flowEvent(s, ev, { reducedMotion = false } = {}) {
  const go = (from, to) => reducedMotion
    ? { name: to, t: 0, from: null, to: null }
    : { name: 'transition', t: 0, from, to };
  if (ev === 'playIntro' && (s.name === 'title' || s.name === 'intro')) return { name: 'intro', t: 0, from: null, to: null };
  if (s.name === 'intro' && ev === 'introDone') return { name: 'title', t: 0, from: null, to: null };
  if ((s.name === 'title' || s.name === 'intro') && ev === 'start') return { name: 'overworld', t: 0, from: null, to: null };
  if (s.name === 'overworld' && ev === 'enterDoor') return go('overworld', 'room');
  if (s.name === 'room' && ev === 'exit') return go('room', 'overworld');
  return s;
}

export function flowTick(s) {
  if (s.name !== 'transition') return s;
  const t = s.t + 1;
  if (t >= FADE_FRAMES * 2) return { name: s.to, t: 0, from: null, to: null };
  return { ...s, t };
}

// Scene to draw: during a transition, swap at the fully covered midpoint.
export function visibleScene(s) {
  if (s.name !== 'transition') return s.name;
  return s.t < FADE_FRAMES ? s.from : s.to;
}

// Black cover amount 0..1.
export function fadeCover(s) {
  if (s.name !== 'transition') return 0;
  return s.t < FADE_FRAMES ? s.t / FADE_FRAMES : (FADE_FRAMES * 2 - s.t) / FADE_FRAMES;
}
