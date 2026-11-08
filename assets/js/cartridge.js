// Arcade strip: loads the game only once the strip is scrolled into view. Optional layer; the
// HTML fallback links stay if anything here fails. Audio starts only inside the game, on the
// first Enter/click on its title card (never on load); keys are captured only by the focused canvas.
(function () {
  'use strict';
  var sec = document.querySelector('[data-cartridge]');
  if (!sec) return;
  var $ = function (s) { return sec.querySelector(s); };
  var screen = $('[data-cart-screen]'), fallback = $('[data-cart-fallback]'), poster = $('[data-cart-poster]');
  var expandBtn = $('[data-cart-expand]'), muteBtn = $('[data-cart-mute]');
  var small = window.matchMedia('(max-width: 699px)');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var game = null, loading = null;
  var muteHome = muteBtn.parentNode, muteNext = muteBtn.nextSibling;

  // Sound button mirrors the game's music state: on only while actually playing.
  function paintSound(state) {
    var on = state === 'playing';
    muteBtn.disabled = !(state === 'playing' || state === 'muted' || state === 'blocked');
    muteBtn.setAttribute('aria-pressed', String(on));
    muteBtn.textContent = on ? 'Sound on' : 'Sound off';
  }
  muteBtn.addEventListener('click', function () {
    if (game) game.setMuted(screen.getAttribute('data-music') === 'playing');
  });

  function boot() {
    if (game) return Promise.resolve(game);
    if (loading) return loading;
    loading = import(sec.getAttribute('data-src')).then(function (mod) {
      screen.hidden = false;
      screen.inert = false;
      poster.hidden = true;
      game = mod.mountGame(screen, {
        autoplayIntro: true,
        onEnterDoor: function () {},
        fit: 'wide',
        music: sec.getAttribute('data-music-src') || null,
        onMusicState: paintSound,
        onExpandChange: function (on) {
          expandBtn.setAttribute('aria-expanded', String(on));
          expandBtn.textContent = on ? 'Collapse' : 'Expand';
          // The expanded game makes the rest of the page inert; keep sound within its dialog.
          if (on) (screen.querySelector('.cc-touch-tools') || screen).appendChild(muteBtn);
          else muteHome.insertBefore(muteBtn, muteNext);
        },
      });
      fallback.hidden = true;
      // Enter inside the strip opens the fuller view (the game also handles the key).
      screen.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !game.isExpanded()) game.expand(); });
      return game;
    }).catch(function (err) {
      loading = null;
      screen.hidden = true;
      screen.inert = true;
      poster.hidden = true;
      fallback.hidden = false;
      console.warn('[cartridge] game unavailable', err && err.message);
      return null;
    });
    return loading;
  }

  expandBtn.addEventListener('click', function () {
    if (game && game.isExpanded()) { game.collapse(); return; }
    boot().then(function (g) { if (g) g.expand(); });
  });

  // Phones, data-saver: nothing loads or plays until the visitor asks.
  if (small.matches || saveData) {
    poster.hidden = false;
    fallback.hidden = true;
    poster.addEventListener('click', function () { boot().then(function (g) { if (g) g.expand(); else { poster.hidden = true; fallback.hidden = false; } }); });
    return;
  }
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    boot();
  }, { threshold: 0.6 });
  io.observe(sec);
})();
