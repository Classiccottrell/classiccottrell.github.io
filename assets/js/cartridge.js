// Home arcade: download and mount only after an explicit reveal gesture.
(function () {
  'use strict';
  var section = document.querySelector('[data-cartridge]');
  if (!section) return;
  var reveal = section.querySelector('[data-cart-reveal]');
  var panel = section.querySelector('[data-cart-panel]');
  var screen = section.querySelector('[data-cart-screen]');
  var close = section.querySelector('[data-cart-close]');
  var fallback = section.querySelector('[data-cart-fallback]');
  var game = null, generation = 0, guardUntil = 0, wheelTotal = 0, lastWheel = 0, touch = null;

  function collapse() {
    generation++;
    guardUntil = Date.now() + 400;
    wheelTotal = 0;
    touch = null;
    if (game) game.destroy();
    game = null;
    screen.replaceChildren();
    screen.hidden = true;
    panel.hidden = true;
    reveal.setAttribute('aria-expanded', 'false');
    reveal.focus({ preventScroll: true });
  }
  close.addEventListener('click', collapse);
  function open(activate) {
    if (!panel.hidden) return;
    var request = ++generation;
    reveal.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    screen.hidden = false;
    fallback.hidden = true;
    if (activate) close.focus({ preventScroll: true });
    import(section.getAttribute('data-src')).then(function (module) {
      // Closing during download must not create a hidden game or start sound.
      if (request !== generation) return;
      game = module.mountGame(screen, {
        autoplayIntro: true,
        fit: 'wide',
        music: section.getAttribute('data-music-src'),
        onEnterDoor: function () {},
      });
      if (activate) game.enableSound?.();
      if (activate && document.activeElement === close) screen.querySelector('canvas')?.focus({ preventScroll: true });
    }).catch(function (error) {
      if (request !== generation) return;
      if (game) game.destroy();
      game = null;
      screen.replaceChildren();
      screen.hidden = true;
      fallback.hidden = false;
      console.warn('[cartridge] game unavailable', error && error.message);
    });
  }
  reveal.addEventListener('click', function () { if (panel.hidden) open(true); else collapse(); });

  function eligible(target) {
    return panel.hidden && window.scrollY <= 4 && Date.now() >= guardUntil
      && (reveal.contains(target) || !target.closest?.('input, textarea, select, button, a, [contenteditable], [role="slider"]'));
  }
  window.addEventListener('wheel', function (event) {
    if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.deltaY <= 0 || !eligible(event.target)) {
      wheelTotal = 0;
      return;
    }
    var now = Date.now();
    if (now - lastWheel > 180) wheelTotal = 0;
    lastWheel = now;
    wheelTotal += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    event.preventDefault();
    if (wheelTotal >= 90) { wheelTotal = 0; open(false); }
  }, { passive: false });
  window.addEventListener('touchstart', function (event) {
    touch = event.touches.length === 1 && eligible(event.target)
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  window.addEventListener('touchmove', function (event) {
    if (!touch || event.touches.length !== 1 || !eligible(event.target)) { touch = null; return; }
    var x = event.touches[0].clientX - touch.x, y = event.touches[0].clientY - touch.y;
    if (Math.abs(x) > Math.abs(y) && Math.abs(x) > 8) { touch = null; return; }
    if (Math.abs(y) > Math.abs(x) && Math.abs(y) > 4) event.preventDefault();
    if (Math.abs(y) >= 80 && Math.abs(y) > Math.abs(x)) { touch = null; open(false); }
  }, { passive: false });
  window.addEventListener('touchend', function () { touch = null; }, { passive: true });
  window.addEventListener('touchcancel', function () { touch = null; }, { passive: true });

  var visible = true;
  function motion() { section.dataset.cartFx = visible && !document.hidden ? 'running' : 'paused'; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; motion(); }).observe(section);
  }
  document.addEventListener('visibilitychange', motion);
  motion();
})();
