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
  var game = null, generation = 0;

  function collapse() {
    generation++;
    if (game) game.destroy();
    game = null;
    screen.replaceChildren();
    screen.hidden = true;
    panel.hidden = true;
    reveal.setAttribute('aria-expanded', 'false');
    reveal.focus({ preventScroll: true });
  }
  close.addEventListener('click', collapse);
  reveal.addEventListener('click', function () {
    if (!panel.hidden) { collapse(); return; }
    var request = ++generation;
    reveal.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    screen.hidden = false;
    fallback.hidden = true;
    close.focus({ preventScroll: true });
    import(section.getAttribute('data-src')).then(function (module) {
      // Closing during download must not create a hidden game or start sound.
      if (request !== generation) return;
      game = module.mountGame(screen, {
        autoplayIntro: true,
        fit: 'wide',
        music: section.getAttribute('data-music-src'),
        onEnterDoor: function () {},
      });
      game.enableSound?.();
      if (document.activeElement === close) screen.querySelector('canvas')?.focus({ preventScroll: true });
    }).catch(function (error) {
      if (request !== generation) return;
      if (game) game.destroy();
      game = null;
      screen.replaceChildren();
      screen.hidden = true;
      fallback.hidden = false;
      console.warn('[cartridge] game unavailable', error && error.message);
    });
  });
})();
