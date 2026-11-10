// Pure key -> action map.
export function actionFor(key) {
  switch (key) {
    case 'ArrowLeft': case 'a': case 'A': return 'left';
    case 'ArrowRight': case 'd': case 'D': return 'right';
    case 'Enter': return 'enter';
    case ' ': case 'Spacebar': return 'act';
    case 'Escape': return 'escape';
    case 'j': case 'J': return 'attack';
    case 'k': case 'K': case 'z': case 'Z': return 'jump';
    case 'l': case 'L': case 'c': case 'C': return 'dodge';
    case 'f': case 'F': return 'skip';
    default: return null;
  }
}

// X = attack alias. Kept out of actionFor so the legacy actionFor('x') === null contract holds.
const resolve = (key) => actionFor(key) ?? (key === 'x' || key === 'X' ? 'attack' : null);

// Listeners attach ONLY to `el` (focusable canvas), never window. `el` may be null (tests).
export function createInput(el, { onTakeover } = {}) {
  const real = new Set(), scripted = new Set();
  const realPressed = new Set(), scriptedPressed = new Set();
  const touches=new Set(),touchPressed=new Set();

  function press(set, edges, action) {
    if (!set.has(action)) edges.add(action);
    set.add(action);
  }
  function takeover() {
    if (scriptedActive) { cancelScripted(); onTakeover?.(); }
  }
  let scriptedActive = false;

  function cancelScripted() { scripted.clear(); scriptedPressed.clear(); scriptedActive = false; }

  function onKeyDown(e) {
    takeover();
    const a = resolve(e.key);
    if (!a) return;
    e.preventDefault();
    if (a === 'escape') { el.blur(); return; }
    if (!e.repeat) press(real, realPressed, a);
  }
  function onKeyUp(e) {
    const a = resolve(e.key);
    if (!a) return;
    real.delete(a);
    e.preventDefault();
  }
  function onPointerDown() { takeover(); el.focus({ preventScroll: true }); }
  function releaseAll() { real.clear();realPressed.clear();touches.clear();touchPressed.clear(); }

  if (el) {
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('keyup', onKeyUp);
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('blur', releaseAll);
  }

  return {
    held: (a) => real.has(a) || scripted.has(a) || touches.has(a),
    pressed: (a) => realPressed.has(a) || scriptedPressed.has(a) || touchPressed.has(a),
    endFrame() { realPressed.clear(); scriptedPressed.clear();touchPressed.clear(); },
    touch(action,down){
      if(!['left','right','attack','dodge','enter','skip'].includes(action))return;
      if(down){takeover();press(touches,touchPressed,action);}else touches.delete(action);
    },
    // Scripted injection (attract demo). key uses same names as KeyboardEvent.key.
    feed(key, down) {
      const a = resolve(key);
      if (!a || a === 'escape') return;
      scriptedActive = true;
      if (down) press(scripted, scriptedPressed, a); else scripted.delete(a);
    },
    cancelScripted,
    releaseAll,
    destroy() {
      releaseAll();cancelScripted();
      if (!el) return;
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('keyup', onKeyUp);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('blur', releaseAll);
    },
  };
}
