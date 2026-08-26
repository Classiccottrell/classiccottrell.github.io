// Ambient wireframe landscape for the home page background.
//
// A perspective grid of points recedes to a vanishing point on the horizon.
// Point elevation comes from a seeded ridged-noise field, so every load
// generates a different mountain range; the noise scrolls toward the viewer,
// which reads as slow forward travel over the terrain. Above the horizon a
// sparse particle field links its near neighbours.
//
// The canvas is decorative: it sits behind the page content, ignores pointer
// events, and is hidden from assistive tech. Colour is pulled from
// --brand-primary at runtime so it follows the theme picker (including the
// oklch() values the "bolder" theme uses — depth fade goes through
// globalAlpha rather than string-building rgba(), so any colour syntax the
// browser understands works).
//
// Motion is opt-out. prefers-reduced-motion and the "brutal" theme (which
// disables site motion wholesale) get a single static landscape instead of an
// animation loop.
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

  // --- Terrain shape -------------------------------------------------------
  var COLS = 54;              // vertices across
  var ROWS = 26;              // depth slices
  var Z_NEAR = 260;           // depth of the closest row, in world units
  var Z_FAR = 2600;           // depth of the furthest row
  var FOCAL = 330;            // projection focal length
  var GROUND = 350;           // world units the ground plane sits below eye
  var PEAK = 190;             // maximum ridge elevation, world units
  var WORLD_HALF = 660;       // half-width of the terrain, world units
  var HORIZON_FRAC = 0.52;    // horizon as a fraction of viewport height

  // --- Look ----------------------------------------------------------------
  var RIDGE_ALPHA = 0.34;     // row polylines, at the near plane
  var CONNECTOR_ALPHA = 0.17; // depth connectors, at the near plane
  var VERTEX_ALPHA = 0.46;    // vertex dots, at the near plane
  var HORIZON_ALPHA = 0.20;
  var SKY_ALPHA = 0.30;
  var SKY_LINK_ALPHA = 0.13;
  var CONNECTOR_EVERY = 4;    // draw a depth connector every Nth column
  var VERTEX_EVERY = 2;       // draw a dot every Nth column
  var FADE_POWER = 2.0;       // how fast the distance fade falls off

  // --- Motion --------------------------------------------------------------
  var SPEED = 0.0000135;      // noise scroll per ms
  var NOISE_X = 0.0032;       // noise frequency across
  var NOISE_Z = 0.0010;       // noise frequency into the screen
  var SKY_LINK_DIST = 86;

  var width = 0;
  var height = 0;
  var horizonY = 0;
  var colour = '#437057';
  var seed = (Math.random() * 65536) | 0;
  var rowDepth = [];
  var colX = [];
  var sky = [];
  var frame = null;
  var resizeTimer = null;
  var start = 0;
  var travel = 0;

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

  // --- Noise ---------------------------------------------------------------
  // Integer hash → [0,1). Math.imul keeps the multiplies in 32-bit so the
  // mixing behaves the same everywhere instead of drifting into doubles.
  function hash2(x, z, s) {
    var h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(s, 1013904223);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function valueNoise(x, z, s) {
    var xi = Math.floor(x);
    var zi = Math.floor(z);
    var xf = x - xi;
    var zf = z - zi;
    var u = xf * xf * (3 - 2 * xf);
    var v = zf * zf * (3 - 2 * zf);
    var a = hash2(xi, zi, s);
    var b = hash2(xi + 1, zi, s);
    var c = hash2(xi, zi + 1, s);
    var d = hash2(xi + 1, zi + 1, s);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  // Ridged fBm: folding the noise around its midpoint turns smooth hills into
  // creased ridges, and squaring sharpens the peaks. Three octaves with a
  // steep amplitude falloff — more than that, or a slower falloff, and the
  // high-frequency detail reads as zigzag noise rather than a skyline.
  function ridged(x, z) {
    var sum = 0;
    var amp = 1;
    var freq = 1;
    var norm = 0;
    for (var o = 0; o < 3; o++) {
      var n = valueNoise(x * freq, z * freq, seed + o * 1013);
      n = 1 - Math.abs(n * 2 - 1);
      sum += n * n * amp;
      norm += amp;
      amp *= 0.42;
      freq *= 2;
    }
    return sum / norm;
  }

  function elevationAt(worldX, worldZ) {
    return ridged(worldX * NOISE_X, worldZ * NOISE_Z + travel) * PEAK;
  }

  // --- Geometry ------------------------------------------------------------
  // Depth slices are spaced geometrically rather than evenly: perspective
  // compresses distance, so a constant world-space step would pile the far
  // rows on top of each other while leaving big gaps up close.
  function buildGeometry() {
    rowDepth.length = 0;
    var ratio = Math.pow(Z_FAR / Z_NEAR, 1 / (ROWS - 1));
    for (var r = 0; r < ROWS; r++) rowDepth.push(Z_NEAR * Math.pow(ratio, r));

    colX.length = 0;
    for (var c = 0; c < COLS; c++) {
      colX.push(-WORLD_HALF + (2 * WORLD_HALF * c) / (COLS - 1));
    }

    sky.length = 0;
    var skyCount = Math.max(14, Math.min(46, Math.round((width * horizonY) / 15000)));
    for (var i = 0; i < skyCount; i++) {
      sky.push({
        x: Math.random() * width,
        y: Math.random() * horizonY,
        r: 1.1 + Math.random() * 1.5,
        vx: (Math.random() - 0.5) * 0.09,
        vy: (Math.random() - 0.5) * 0.05,
        a: 0.45 + Math.random() * 0.55,
      });
    }
  }

  function scaleAt(depth) {
    return FOCAL / depth;
  }

  // Distance fade — the atmospheric perspective that sells the depth.
  function fadeAt(depth) {
    var t = 1 - (depth - Z_NEAR) / (Z_FAR - Z_NEAR);
    if (t < 0) t = 0;
    return Math.pow(t, FADE_POWER);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    horizonY = Math.round(height * HORIZON_FRAC);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- Drawing -------------------------------------------------------------
  function drawHorizon(cx, hy) {
    // Faded at both ends so the line reads as haze rather than a drawn rule.
    var grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, colour);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = HORIZON_ALPHA;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hy);
    ctx.lineTo(width, hy);
    ctx.stroke();
    ctx.strokeStyle = colour;
  }

  function drawSky() {
    for (var i = 0; i < sky.length; i++) {
      var p = sky[i];
      for (var j = i + 1; j < sky.length; j++) {
        var q = sky[j];
        var dx = p.x - q.x;
        var dy = p.y - q.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= SKY_LINK_DIST) continue;
        ctx.globalAlpha = SKY_LINK_ALPHA * (1 - dist / SKY_LINK_DIST);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
    for (var k = 0; k < sky.length; k++) {
      var s = sky[k];
      ctx.globalAlpha = SKY_ALPHA * s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTerrain(cx, hy) {
    var r, c, depth, k, fade, px, py;
    // Reused across rows so the connector pass can reach the row behind it
    // without projecting every vertex twice.
    var prevX = new Array(COLS);
    var prevY = new Array(COLS);
    var curX = new Array(COLS);
    var curY = new Array(COLS);
    var havePrev = false;

    // Back to front, so nearer ridges overdraw the ones behind them.
    for (r = ROWS - 1; r >= 0; r--) {
      depth = rowDepth[r];
      k = scaleAt(depth);
      fade = fadeAt(depth);
      if (fade <= 0.004) { havePrev = false; continue; }

      for (c = 0; c < COLS; c++) {
        var elev = elevationAt(colX[c], depth);
        curX[c] = cx + colX[c] * k;
        curY[c] = hy + (GROUND - elev) * k;
      }

      ctx.globalAlpha = RIDGE_ALPHA * fade;
      ctx.beginPath();
      ctx.moveTo(curX[0], curY[0]);
      for (c = 1; c < COLS; c++) ctx.lineTo(curX[c], curY[c]);
      ctx.stroke();

      if (havePrev) {
        ctx.globalAlpha = CONNECTOR_ALPHA * fade;
        ctx.beginPath();
        for (c = 0; c < COLS; c += CONNECTOR_EVERY) {
          ctx.moveTo(curX[c], curY[c]);
          ctx.lineTo(prevX[c], prevY[c]);
        }
        ctx.stroke();
      }

      ctx.globalAlpha = VERTEX_ALPHA * fade;
      var dotR = Math.max(0.55, 1.6 * k);
      for (c = 0; c < COLS; c += VERTEX_EVERY) {
        px = curX[c];
        if (px < -20 || px > width + 20) continue;
        py = curY[c];
        ctx.beginPath();
        ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      for (c = 0; c < COLS; c++) { prevX[c] = curX[c]; prevY[c] = curY[c]; }
      havePrev = true;
    }
  }

  function draw() {
    var cx = width / 2 + easedX;
    var hy = horizonY + easedY;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    drawHorizon(cx, hy);
    drawSky();
    drawTerrain(cx, hy);

    ctx.globalAlpha = 1;
  }

  function step(now) {
    if (!start) start = now;
    travel = (now - start) * SPEED;

    easedX += (pointerX - easedX) * 0.04;
    easedY += (pointerY - easedY) * 0.04;

    for (var i = 0; i < sky.length; i++) {
      var p = sky[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = horizonY;
      if (p.y > horizonY) p.y = -10;
    }

    draw();
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
      travel = 0;
      draw();
      return;
    }
    start = 0;
    frame = window.requestAnimationFrame(step);
  }

  function reset() {
    resize();
    buildGeometry();
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
      // Shifting the vanishing point a little reads as looking around the
      // scene; more than this and the terrain visibly swims.
      pointerX = ((event.clientX / width) - 0.5) * -34;
      pointerY = ((event.clientY / height) - 0.5) * -18;
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
