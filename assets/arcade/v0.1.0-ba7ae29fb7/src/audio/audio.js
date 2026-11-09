// Tuple: offset seconds, duration, Hz, waveform, gain. Original C-major motifs.
const sounds = {
  'cartridge-click': [[0, .025, 160, 'square', .09], [.035, .04, 80, 'triangle', .12]],
  'boot-sting': [[0,.18,262,'square',.06],[.2,.18,330,'square',.06],[.4,.18,392,'square',.06],[.6,.25,523,'square',.06],[.9,.2,392,'triangle',.08],[1.15,.8,262,'triangle',.05],[1.15,.8,330,'triangle',.05],[1.15,.8,392,'triangle',.05]],
  'title-arrive': [[0,.3,523,'triangle',.045],[.12,.35,659,'triangle',.04],[.24,.55,784,'triangle',.035],[.24,.55,392,'triangle',.025]],
  blip: [[0,.07,784,'square',.05]],
  footstep: [[0,.035,90,'triangle',.035],[0,.012,260,'square',.014]],
  punch: [[0,.035,120,'square',.035],[.012,.09,65,'triangle',.08]],
  pickup: [[0,.09,784,'triangle',.07],[.08,.18,1047,'triangle',.06]],
  'terry-charge': [[0,.12,131,'triangle',.04],[.1,.12,196,'triangle',.045],[.2,.12,262,'square',.035],[.3,.12,392,'square',.035],[.4,.12,523,'triangle',.05],[.52,.35,659,'triangle',.05],[.52,.35,784,'triangle',.035]],
  door: [[0,.14,131,'triangle',.1],[.08,.18,196,'triangle',.08]],
  achievement: [[0,.12,523,'square',.05],[.13,.12,659,'square',.05],[.26,.12,784,'square',.05],[.4,.45,1047,'triangle',.07],[.4,.45,523,'triangle',.05]],
};
// Parametric punch: noise "crack" (bandpassed burst) over a sine "body" that drops in pitch.
// Tuned in tools/sound-workbench.html; paste its JSON over these defaults.
export const PUNCH = { crack: .9, crackHz: 2600, crackMs: 45, body: 1, bodyHz: 170, drop: .45, bodyMs: 130 };
export const PUNCH_HEAVY = { ...PUNCH, crack: 1, crackHz: 1900, crackMs: 70, bodyHz: 120, bodyMs: 210 };
const params = { punch: PUNCH, 'punch-heavy': PUNCH_HEAVY };
sounds['punch-heavy'] = []; // name registered; voice built in whap()
let context;
let master;
let muted = false;

let titleTimer;
let titleRequest = 0;
let titlePending;
const titleVoices = new Set();
const effectVoices = new Set();
let effectRequest = 0;

async function ready(allowAutoplay = false) {
  if (muted || (!allowAutoplay && !globalThis.navigator?.userActivation?.hasBeenActive)) return false;
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return false;
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.setValueAtTime(muted ? 0 : 1, context.currentTime);
    master.connect(context.destination);
  }
  if (context.state === 'suspended') await context.resume();
  return !muted && context.state === 'running';
}

function tone(start, duration, hz, type, volume, voices) {
  const osc = context.createOscillator(), envelope = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, start);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(volume, start + .004);
  envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
  osc.connect(envelope); envelope.connect(master);
  const voice = { source: osc, nodes: [osc, envelope] };
  voices?.add(voice);
  osc.onended = () => { voices?.delete(voice); osc.disconnect(); envelope.disconnect(); };
  osc.start(start); osc.stop(start + duration + .005);
}

/** True means scheduled. Unsupported/blocked audio stays silent without listeners. */
export async function play(name, over) {
  if (!Object.hasOwn(sounds, name)) throw new RangeError(`Unknown sound: ${name}`);
  const request = effectRequest;
  try {
    if (!await ready() || request !== effectRequest) return false;
    const now = context.currentTime;
    if (params[name]) { whap({ ...params[name], ...over }, now); return true; }
    for (const [offset, duration, hz, type, volume] of sounds[name]) {
      tone(now + offset, duration, hz, type, volume, effectVoices);
    }
    return true;
  } catch {
    // A denied/interrupted audio device must never prevent the game from running.
    return false;
  }
}

// Original four-bar, 120 BPM phrase: Cmaj7 / Am7 / Fmaj7 / G6.
function titlePhrase(start) {
  const melody = [76,79,83,79,74,76,79,0, 76,72,71,72,76,79,76,0,
    77,81,84,81,79,77,76,0, 74,79,83,81,79,76,74,0];
  const chords = [[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,59]];
  const hz = note => 440 * 2 ** ((note - 69) / 12);
  melody.forEach((note, i) => {
    if (note) tone(start + i * .25, i % 8 === 6 ? .4 : .18, hz(note), 'square', .013, titleVoices);
  });
  chords.forEach((chord, bar) => {
    chord.slice(1).forEach(note => tone(start + bar * 2, 1.8, hz(note), 'triangle', .018, titleVoices));
    for (let beat = 0; beat < 4; beat++) {
      const at = start + bar * 2 + beat * .5;
      tone(at, .32, hz(chord[0] + (beat === 2 ? 7 : 0)), 'triangle', .055, titleVoices);
      tone(at, .075, beat % 2 ? 180 : 65, 'sine', beat % 2 ? .018 : .045, titleVoices);
      titleHat(at + .25);
    }
  });
}

let hatBuffer;
function titleHat(at) {
  if (!hatBuffer) {
    hatBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .035), context.sampleRate);
    const data = hatBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  }
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
  source.buffer = hatBuffer; filter.type = 'highpass'; filter.frequency.value = 6500; gain.gain.value = .025;
  source.connect(filter); filter.connect(gain); gain.connect(master);
  const voice = { source, nodes: [source, filter, gain] };
  titleVoices.add(voice);
  source.onended = () => { titleVoices.delete(voice); voice.nodes.forEach(node => node.disconnect()); };
  source.start(at); source.stop(at + .04);
}

/** Call from a focused game gesture. Repeated starts share the current loop. */
export function isAudioRunning(){return !muted && context?.state==='running';}
export function resumeAudioFromGesture(){if(globalThis.navigator?.userActivation?.hasBeenActive && context?.state==='suspended')context.resume().catch(()=>{});}

export function startTitleMusic({allowAutoplay=false}={}) {
  if (titlePending) return titlePending;
  if (titleTimer !== undefined) return Promise.resolve(true);
  const request = ++titleRequest;
  const pending = (async () => {
    try {
      if (!await ready(allowAutoplay) || request !== titleRequest) return false;
      let next = context.currentTime + .02;
      const schedule = () => {
        if (context.state !== 'running') return;
        if (next < context.currentTime) next = context.currentTime + .02;
        if (next <= context.currentTime + .15) {
          try { titlePhrase(next); next += 8; } catch { stopTitleMusic(); }
        }
      };
      schedule();
      if (request !== titleRequest) return false;
      titleTimer = globalThis.setInterval(schedule, 100);
      return true;
    } catch {
      if (request === titleRequest) stopTitleMusic();
      return false;
    }
  })();
  titlePending = pending;
  pending.finally(() => { if (titlePending === pending) titlePending = undefined; });
  return pending;
}

/** Cancel the loop, its scheduled notes, and any pending device resume. */
export function stopTitleMusic() {
  titleRequest++;
  titlePending = undefined;
  if (titleTimer !== undefined) globalThis.clearInterval(titleTimer);
  titleTimer = undefined;
  stopVoices(titleVoices);
}

/** Cancel one-shot effects and invalidate their pending device resumes. */
export function stopEffects() {
  effectRequest++;
  stopVoices(effectVoices);
}

function stopVoices(voices) {
  for (const voice of voices) {
    try { voice.source.stop(); } catch { /* Already ended. */ }
    voice.nodes.forEach(node => node.disconnect());
  }
  voices.clear();
}

/** Mute also cuts notes already scheduled by a sting. Returns the muted state. */
export function setMuted(value) {
  if (typeof value !== 'boolean') throw new TypeError('Muted state must be boolean');
  muted = value;
  if (muted) { stopTitleMusic(); stopEffects(); }
  if (master) {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(muted ? 0 : 1, context.currentTime);
  }
  return muted;
}

function whap(p, now) {
  const rate = context.sampleRate, n = Math.max(1, Math.round(rate * p.crackMs / 1000));
  const buf = context.createBuffer(1, n, rate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const noise = context.createBufferSource(), band = context.createBiquadFilter(), ng = context.createGain();
  band.type = 'bandpass'; band.frequency.value = p.crackHz; band.Q.value = .8;
  ng.gain.value = p.crack * .5;
  noise.buffer = buf; noise.connect(band); band.connect(ng); ng.connect(master);
  const crack = { source: noise, nodes: [noise, band, ng] };
  effectVoices.add(crack);
  noise.onended = () => { effectVoices.delete(crack); crack.nodes.forEach(node => node.disconnect()); };
  noise.start(now); noise.stop(now + p.crackMs / 1000);
  const osc = context.createOscillator(), og = context.createGain(), end = now + p.bodyMs / 1000;
  osc.frequency.setValueAtTime(p.bodyHz, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, p.bodyHz * p.drop), end);
  og.gain.setValueAtTime(p.body * .45, now);
  og.gain.exponentialRampToValueAtTime(.0001, end);
  osc.connect(og); og.connect(master); osc.start(now); osc.stop(end + .01);
  const body = { source: osc, nodes: [osc, og] };
  effectVoices.add(body);
  osc.onended = () => { effectVoices.delete(body); osc.disconnect(); og.disconnect(); };
}
