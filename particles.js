// Ambient particle field for the home page background.
//
// The canvas is purely decorative: it sits behind the page content, ignores
// pointer events, and is hidden from assistive tech. Colour is pulled from
// --brand-primary at runtime so it follows the theme picker (including the
// oklch() values the "bolder" theme uses — per-particle opacity goes through
// globalAlpha rather than string-building rgba(), so any colour syntax the
// browser understands works).
//
// Motion is opt-out. prefers-reduced-motion and the "brutal" theme (which
// disables site motion wholesale) get a single static frame instead of an
// animation loop, so the texture survives without anything moving.
(function () {
  var body = document.body;
  if (!body || !body.classList.contains('home-page')) return;
  if (!window.requestAnimationFrame) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'particle-field';
  canvas.setAttribute('aria-hidden', 'true');

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  body.insertBefore(canvas, body.firstChild);

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  var particles = [];
  var width = 0;
  var height = 0;
  var colour = '#437057';
  var frame = null;
  var resizeTimer = null;
  var start = 0;

  // Pointer parallax targets vs. the eased values actually rendered.
  var pointerX = 0;
  var pointerY = 0;
  var easedX = 0;
  var easedY = 0;

  function motionAllowed() {
    return !reduceMotion.matches && root.getAttribute('data-theme') !== 'brutal';
  }

  function readColour() {
    var value = getComputedStyle(root).getPropertyValue('--brand-primary').trim();
    colour = value || '#437057';
  }

  // One particle per ~12k CSS pixels keeps the field even across viewport
  // sizes; the clamp stops phones from looking bare and 4K displays from
  // paying for a thousand draws a frame.
  function targetCount() {
    return Math.max(34, Math.min(130, Math.round((width * height) / 12000)));
  }

  // Radius floor is 1.2px because anything smaller is mostly antialiased
  // edge and reads as haze rather than a dot. Alpha floor is 0.30 for the
  // same reason: measured against the page these values put the median dot
  // at ~1.5:1 and the brightest at ~2.9:1, where the field reads as ambient
  // texture. The first pass used 0.12-0.40, which measured 1.15:1 median --
  // effectively invisible on an average display.
  function makeParticle() {
    var radius = 1.2 + Math.random() * 1.9;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      r: radius,
      // Larger dots read as nearer, so they drift and parallax further.
      vx: (Math.random() - 0.5) * 0.12,
      vy: -0.06 - Math.random() * 0.12,
      depth: radius / 3.1,
      alpha: 0.30 + Math.random() * 0.42,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function build() {
    var count = targetCount();
    particles = [];
    for (var i = 0; i < count; i++) particles.push(makeParticle());
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(elapsed) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = colour;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      // Slow opacity breathing keeps the field from reading as a static
      // dot screen; the offsets are sub-pixel-slow on purpose. The trough
      // stays at 0.8 so the dip never takes a dot below visibility.
      var pulse = 0.9 + 0.1 * Math.sin(elapsed * 0.0008 + p.phase);
      ctx.globalAlpha = p.alpha * pulse;
      ctx.beginPath();
      ctx.arc(
        p.x + easedX * p.depth,
        p.y + easedY * p.depth,
        p.r,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function step(now) {
    if (!start) start = now;
    var elapsed = now - start;

    easedX += (pointerX - easedX) * 0.04;
    easedY += (pointerY - easedY) * 0.04;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      // Wrap with a margin so dots fade in off-screen rather than popping
      // against the viewport edge.
      if (p.y < -p.r * 4) { p.y = height + p.r * 4; p.x = Math.random() * width; }
      if (p.x < -p.r * 4) p.x = width + p.r * 4;
      if (p.x > width + p.r * 4) p.x = -p.r * 4;
    }

    draw(elapsed);
    frame = window.requestAnimationFrame(step);
  }

  function stop() {
    if (frame === null) return;
    window.cancelAnimationFrame(frame);
    frame = null;
  }

  function run() {
    stop();
    if (!motionAllowed()) {
      easedX = 0;
      easedY = 0;
      draw(0);
      return;
    }
    start = 0;
    frame = window.requestAnimationFrame(step);
  }

  function reset() {
    resize();
    build();
    readColour();
    run();
  }

  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(reset, 150);
  });

  // Nothing to animate while the tab is in the background.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (motionAllowed()) run();
  });

  if (finePointer.matches) {
    window.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse') return;
      // Max ~14px of drift at the deepest layer — enough to feel alive,
      // not enough to compete with the copy in front of it.
      pointerX = ((event.clientX / width) - 0.5) * -28;
      pointerY = ((event.clientY / height) - 0.5) * -28;
    }, { passive: true });
  }

  // The theme picker swaps --brand-primary on <html>; recolour (and start or
  // stop, since "brutal" is a motion-free theme) when it changes.
  new MutationObserver(function () {
    readColour();
    run();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  var onMotionChange = function () { run(); };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
  else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

  reset();
}());
