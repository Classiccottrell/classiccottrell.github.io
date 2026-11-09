export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;

// Pure accumulator. advance(dt) runs update(STEP) 0..n times, returns render alpha in [0,1).
export function createStepper(update, step = STEP, maxFrame = MAX_FRAME) {
  let acc = 0;
  return {
    advance(dt) {
      acc += Math.min(Math.max(dt, 0), maxFrame);
      while (acc >= step) {
        update(step);
        acc -= step;
      }
      return acc / step;
    },
    reset() { acc = 0; },
  };
}

// rAF-driven loop. raf/caf/now injectable.
export function createLoop({ update, render, raf = globalThis.requestAnimationFrame?.bind(globalThis),
  caf = globalThis.cancelAnimationFrame?.bind(globalThis), now = () => performance.now() }) {
  const stepper = createStepper(update);
  let id = 0, last = 0, running = false;
  const frame = (t) => {
    if (!running) return;
    const dt = (t - last) / 1000;
    last = t;
    render(stepper.advance(dt));
    id = raf(frame);
  };
  return {
    start() {
      if (running) return;
      running = true;
      stepper.reset();
      last = now();
      id = raf(frame);
    },
    stop() {
      running = false;
      caf(id);
    },
    get running() { return running; },
  };
}
