// Background music. HTMLAudioElement only; start() must be called from a user gesture. Never autoplays.
// Muted preference persists in localStorage (all storage access is try/catch: private mode, quota, disabled).
const KEY = 'cc-sidescroller:muted';

export function createMusic({
  url,
  volume = 0.5,
  createAudio = (u) => new Audio(u),
  storage = null,            // inject for tests; default resolved lazily from globalThis.localStorage
  setTimer = globalThis.setInterval,
  clearTimer = globalThis.clearInterval,
} = {}) {
  const store = () => { try { return storage ?? globalThis.localStorage ?? null; } catch { return null; } };
  const load = () => { try { return store()?.getItem(KEY) === '1'; } catch { return false; } };
  const save = (m) => { try { store()?.setItem(KEY, m ? '1' : '0'); } catch { /* ignore */ } };

  let muted = load();
  let audio = null, started = false, fading = null, fadingOut = false, target = volume;
  let state = 'idle'; // idle | playing | muted | blocked | paused

  const stopFade = () => { if (fading != null) { clearTimer(fading); fading = null; } fadingOut = false; };
  function ramp(to, ms, done) {
    stopFade();
    if (!audio) return;
    if (ms <= 0) { audio.volume = to; done?.(); return; }
    const from = audio.volume, t0 = Date.now();
    fading = setTimer(() => {
      const f = Math.min(1, (Date.now() - t0) / ms);
      audio.volume = from + (to - from) * f;
      if (f >= 1) { stopFade(); done?.(); }
    }, 40);
  }
  function play() {
    // Resolves to 'playing' or 'blocked'; never rejects.
    try {
      const p = audio.play();
      return Promise.resolve(p).then(() => (state = 'playing'), () => (state = 'blocked'));
    } catch { return Promise.resolve((state = 'blocked')); }
  }
  function ensure() {
    if (!audio) {
      audio = createAudio(url);
      audio.preload = 'none';
      audio.loop = true;
      audio.volume = volume;
    }
  }

  const m = {
    get started() { return started; },
    get state() { return state; },
    get element() { return audio; },
    isMuted: () => muted,
    // Call ONLY from a user-gesture handler. Returns 'playing' | 'muted' | 'blocked'.
    start() {
      if (started) return Promise.resolve(state);
      started = true;
      ensure();
      if (muted) { state = 'muted'; return Promise.resolve(state); }
      return play();
    },
    // May be called from a gesture (the Sound button) to unmute and begin playback.
    setMuted(b,{resume=true}={}) {
      b = !!b;
      // Title and attract can unmute the preference while keeping the level track paused.
      if(!b&&!resume){
        if(muted){muted=false;save(false);}
        if(started){stopFade();audio.pause();state='paused';}
        return Promise.resolve(state);
      }
      if (b === muted) return !b && started && audio?.paused && state === 'blocked' ? play() : Promise.resolve(state); // retry a blocked play()
      muted = b; save(b);
      if (!started) return Promise.resolve(state);
      if (b) { stopFade(); audio.pause(); state = 'muted'; return Promise.resolve(state); }
      audio.volume = target;
      return play();
    },
    fadeOut(ms = 400) {
      if (!started || muted || !audio || audio.paused) return;
      ramp(0, ms, () => { audio.pause(); state = 'paused'; });
      if (fading != null) fadingOut = true; // ramp() resets it via stopFade first
    },
    fadeIn(ms = 400) {
      if (!started || muted || !audio) return;
      if (!audio.paused) { if (fadingOut) ramp(target, ms); return; } // fade-out interrupted
      audio.volume = 0;
      return play().then(() => { if (state === 'playing') ramp(target, ms); return state; });
    },
    destroy() {
      stopFade();
      if (audio) { try { audio.pause(); } catch { /* ignore */ } audio.removeAttribute?.('src'); }
      audio = null; started = false;
    },
  };
  return m;
}
