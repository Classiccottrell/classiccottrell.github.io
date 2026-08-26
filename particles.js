// Ambient wireframe landscape for the home page background.
//
// A perspective grid of points recedes to a vanishing point on the horizon,
// anchored to the TOP of the viewport. Point elevation comes from a seeded
// ridged-noise field, so every load generates a different mountain range;
// the noise scrolls toward the viewer, which reads as slow forward travel.
// Above the horizon a sparse particle field links its near neighbours.
//
// Nodes can be grabbed and pulled with a mouse. On release a node floats a
// little of the way back and then holds near where it was dropped, so the
// terrain keeps a record of having been handled.
//
// Every world-space dimension is derived from the viewport in resize(), so
// the composition holds its proportions instead of drifting as the window
// changes shape.
//
// The canvas itself keeps pointer-events: none and is hidden from assistive
// tech. Dragging is wired through window-level listeners that bail out over
// any interactive element, so links and buttons are never swallowed.
//
// Colour is pulled from --brand-primary at runtime so it follows the theme
// picker (including the oklch() values the "bolder" theme uses — depth fade
// goes through globalAlpha rather than string-building rgba(), so any colour
// syntax the browser understands works).
//
// Motion is opt-out. prefers-reduced-motion and the "brutal" theme get a
// single static landscape with no animation loop; dragging still works
// there, redrawing on demand and settling instantly rather than easing.
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

  // --- Composition, as fractions of the viewport -----------------------------
  var HORIZON_FRAC = 0.15;    // horizon this far down the viewport
  var GROUND_SPAN = 0.40;     // ground plane drops this much by the near plane
  var PEAK_SPAN = 0.26;       // ridges rise this much above the ground plane
  var OVERHANG = 1.6;         // terrain width at the near plane, vs viewport

  // --- Projection ------------------------------------------------------------
  var Z_NEAR = 260;
  var Z_FAR = 2600;
  var FOCAL = 330;

  // --- Look ------------------------------------------------------------------
  var RIDGE_ALPHA = 0.30;
  var CONNECTOR_ALPHA = 0.15;
  var VERTEX_ALPHA = 0.42;
  var HORIZON_ALPHA = 0.18;
  var SKY_ALPHA = 0.28;
  var SKY_LINK_ALPHA = 0.12;
  var CONNECTOR_EVERY = 4;
  var VERTEX_EVERY = 2;
  var FADE_POWER = 2.0;

  // --- Motion ----------------------------------------------------------------
  var SPEED = 0.0000135;
  var NOISE_X = 0.0032;
  var NOISE_Z = 0.0010;
  var SKY_LINK_DIST = 86;

  // --- Drag ------------------------------------------------------------------
  var GRAB_RADIUS = 26;       // px from a node's centre that counts as a grab
  var RETAIN = 0.82;          // fraction of the pull a node keeps on release
  var SETTLE = 0.055;         // per-frame easing toward the retained position

  var width = 0;
  var height = 0;
  var horizonY = 0;
  var groundWorld = 0;
  var peakWorld = 0;
  var worldHalf = 0;
  var cols = 0;
  var rows = 0;

  var colour = '#437057';
  var seed = (Math.random() * 65536) | 0;
  var rowDepth = [];
  var colX = [];
  var sky = [];

  // Per-node drag state, indexed r * cols + c. dx/de are the live displacement
  // (world x, elevation); tx/te are what it is easing toward.
  var dx, de, tx, te, projX, projY;

  var frame = null;
  var resizeTimer = null;
  var start = 0;
  var travel = 0;

  var pointerX = 0;
  var pointerY = 0;
  var easedX = 0;
  var easedY = 0;

  var dragIndex = -1;
  var hoverIndex = -1;

  function motionAllowed() {
    return !reduceMotion.matches && root.getAttribute('data-theme') !== 'brutal';
  }

  function readColour() {
    var value = getComputedStyle(root).getPropertyValue('--brand-primary').trim();
    colour = value || '#437057';
  }

  // --- Noise -----------------------------------------------------------------
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
    return ridged(worldX * NOISE_X, worldZ * NOISE_Z + travel) * peakWorld;
  }

  function scaleAt(depth) { return FOCAL / depth; }

  // Distance fade — the atmospheric perspective that sells the depth.
  function fadeAt(depth) {
    var t = 1 - (depth - Z_NEAR) / (Z_FAR - Z_NEAR);
    if (t < 0) t = 0;
    return Math.pow(t, FADE_POWER);
  }

  // --- Layout ----------------------------------------------------------------
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    horizonY = Math.round(height * HORIZON_FRAC);

    // World dimensions are solved backwards from the viewport: pick how much
    // of the screen the terrain should occupy, then divide by the near-plane
    // scale to get the world units that produce it. That is what keeps the
    // composition proportional across viewport sizes rather than fixed.
    var kNear = scaleAt(Z_NEAR);
    groundWorld = (height * GROUND_SPAN) / kNear;
    peakWorld = (height * PEAK_SPAN) / kNear;
    worldHalf = (width * 0.5 * OVERHANG) / kNear;

    // Vertex density tracks viewport size so a phone is not drawing a desktop
    // mesh and a wide display is not left sparse.
    cols = Math.max(22, Math.min(64, Math.round(width / 24)));
    rows = Math.max(14, Math.min(30, Math.round(height / 34)));

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Depth slices are spaced geometrically rather than evenly: perspective
  // compresses distance, so a constant world-space step would pile the far
  // rows on top of each other while leaving big gaps up close.
  function buildGeometry() {
    rowDepth.length = 0;
    var ratio = Math.pow(Z_FAR / Z_NEAR, 1 / (rows - 1));
    for (var r = 0; r < rows; r++) rowDepth.push(Z_NEAR * Math.pow(ratio, r));

    colX.length = 0;
    for (var c = 0; c < cols; c++) {
      colX.push(-worldHalf + (2 * worldHalf * c) / (cols - 1));
    }

    var n = rows * cols;
    dx = new Float32Array(n);
    de = new Float32Array(n);
    tx = new Float32Array(n);
    te = new Float32Array(n);
    projX = new Float32Array(n);
    projY = new Float32Array(n);
    dragIndex = -1;
    hoverIndex = -1;

    sky.length = 0;
    var skyCount = Math.max(10, Math.min(38, Math.round((width * horizonY) / 15000)));
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

  // --- Drawing ---------------------------------------------------------------
  function drawHorizon(hy) {
    // Faded at both ends so the line reads as haze rather than a drawn rule.
    var grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, colour);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = HORIZON_ALPHA;
    ctx.strokeStyle = grad;
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
        var ddx = p.x - q.x;
        var ddy = p.y - q.y;
        var dist = Math.sqrt(ddx * ddx + ddy * ddy);
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
    var r, c, i, depth, k, fade;
    var prevX = new Array(cols);
    var prevY = new Array(cols);
    var havePrev = false;

    // Back to front, so nearer ridges overdraw the ones behind them.
    for (r = rows - 1; r >= 0; r--) {
      depth = rowDepth[r];
      k = scaleAt(depth);
      fade = fadeAt(depth);

      var base = r * cols;
      for (c = 0; c < cols; c++) {
        i = base + c;
        var elev = elevationAt(colX[c], depth) + de[i];
        projX[i] = cx + (colX[c] + dx[i]) * k;
        projY[i] = hy + (groundWorld - elev) * k;
      }

      if (fade <= 0.004) { havePrev = false; continue; }

      ctx.globalAlpha = RIDGE_ALPHA * fade;
      ctx.beginPath();
      ctx.moveTo(projX[base], projY[base]);
      for (c = 1; c < cols; c++) ctx.lineTo(projX[base + c], projY[base + c]);
      ctx.stroke();

      if (havePrev) {
        ctx.globalAlpha = CONNECTOR_ALPHA * fade;
        ctx.beginPath();
        for (c = 0; c < cols; c += CONNECTOR_EVERY) {
          ctx.moveTo(projX[base + c], projY[base + c]);
          ctx.lineTo(prevX[c], prevY[c]);
        }
        ctx.stroke();
      }

      var dotR = Math.max(0.55, 1.6 * k);
      for (c = 0; c < cols; c += VERTEX_EVERY) {
        i = base + c;
        if (projX[i] < -20 || projX[i] > width + 20) continue;
        // A grabbed or hovered node gets a little more presence, so the
        // interaction has a visible target rather than an invisible hotspot.
        var lifted = (i === dragIndex) ? 1 : (i === hoverIndex ? 0.75 : 0);
        ctx.globalAlpha = VERTEX_ALPHA * fade + lifted * 0.45;
        ctx.beginPath();
        ctx.arc(projX[i], projY[i], dotR + lifted * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      for (c = 0; c < cols; c++) { prevX[c] = projX[base + c]; prevY[c] = projY[base + c]; }
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

    drawHorizon(hy);
    drawSky();
    drawTerrain(cx, hy);

    ctx.globalAlpha = 1;
  }

  // Draw once when the animation loop is not running (reduced motion, brutal),
  // so a drag still updates the picture.
  function requestDraw() {
    if (frame === null) draw();
  }

  function settle() {
    for (var i = 0; i < dx.length; i++) {
      if (i === dragIndex) continue;
      var ax = tx[i] - dx[i];
      var ae = te[i] - de[i];
      if (ax * ax + ae * ae < 0.0001) { dx[i] = tx[i]; de[i] = te[i]; continue; }
      dx[i] += ax * SETTLE;
      de[i] += ae * SETTLE;
    }
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

    settle();
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

  // --- Pointer interaction ---------------------------------------------------
  // The canvas is pointer-events: none and stays that way; these listeners sit
  // on window and hit-test the last frame's projected positions by hand. That
  // way a drag can never intercept a click meant for a link.
  function interactiveTarget(event) {
    var el = event.target;
    return !!(el && el.closest && el.closest('a, button, input, select, textarea, [role="button"]'));
  }

  function nearestNode(px, py) {
    var best = -1;
    var bestDist = GRAB_RADIUS * GRAB_RADIUS;
    for (var i = 0; i < projX.length; i++) {
      var ax = projX[i] - px;
      var ay = projY[i] - py;
      var d = ax * ax + ay * ay;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function pullTo(i, px, py) {
    var r = (i / cols) | 0;
    var c = i % cols;
    var k = scaleAt(rowDepth[r]);
    var cx = width / 2 + easedX;
    var hy = horizonY + easedY;
    // Invert the projection so the node lands under the cursor.
    dx[i] = tx[i] = (px - cx) / k - colX[c];
    var elev = groundWorld - (py - hy) / k;
    de[i] = te[i] = elev - elevationAt(colX[c], rowDepth[r]);
  }

  if (finePointer.matches) {
    // Mouse and pen only. Claiming touch drags here would fight the page's
    // own scrolling, which matters far more than the toy.
    window.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      if (interactiveTarget(event)) return;
      var i = nearestNode(event.clientX, event.clientY);
      if (i < 0) return;
      dragIndex = i;
      pullTo(i, event.clientX, event.clientY);
      body.style.cursor = 'grabbing';
      event.preventDefault();
      requestDraw();
    });

    window.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;

      if (dragIndex >= 0) {
        pullTo(dragIndex, event.clientX, event.clientY);
        event.preventDefault();
        requestDraw();
        return;
      }

      // Shifting the vanishing point a little reads as looking around the
      // scene; more than this and the terrain visibly swims.
      pointerX = ((event.clientX / width) - 0.5) * -34;
      pointerY = ((event.clientY / height) - 0.5) * -18;

      var i = interactiveTarget(event) ? -1 : nearestNode(event.clientX, event.clientY);
      if (i !== hoverIndex) {
        hoverIndex = i;
        body.style.cursor = i >= 0 ? 'grab' : '';
        requestDraw();
      }
    }, { passive: false });

    window.addEventListener('pointerup', function () {
      if (dragIndex < 0) return;
      // Float back a little of the way, then hold near where it was dropped.
      tx[dragIndex] = dx[dragIndex] * RETAIN;
      te[dragIndex] = de[dragIndex] * RETAIN;
      if (!motionAllowed()) {
        dx[dragIndex] = tx[dragIndex];
        de[dragIndex] = te[dragIndex];
      }
      dragIndex = -1;
      body.style.cursor = hoverIndex >= 0 ? 'grab' : '';
      requestDraw();
    });

    window.addEventListener('pointercancel', function () {
      dragIndex = -1;
      body.style.cursor = '';
    });
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
