// Ambient wireframe landscape for the home page background.
//
// A perspective grid of points recedes to a vanishing point on the horizon,
// anchored to the TOP of the viewport. Point elevation comes from a seeded
// ridged-noise field, so every load generates a different mountain range;
// the noise scrolls toward the viewer, which reads as slow forward travel.
// Above the horizon a sparse particle field links its near neighbours.
//
// Nodes can be grabbed and pulled with a mouse, dragging nearby connected mesh
// along with a falloff by grid distance. On release, every affected node
// overshoots and rings back via an underdamped spring, settling just off its
// original position rather than snapping exactly back to it — the bounce
// amplitude falls off with distance from the grabbed node. Simply moving the
// pointer through the field also disturbs nearby terrain vertices and sky
// particles with a brief, decaying ripple, via the same spring-back physics.
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
  var SKY_ALPHA = 0.28;
  var SKY_LINK_ALPHA = 0.12;
  var CONNECTOR_EVERY = 4;
  var VERTEX_EVERY = 2;
  var FADE_POWER = 2.0;

  // Rare special-character vertices/particles: a small, curated, geometric
  // glyph set that fits the wireframe aesthetic — chosen once per node at
  // geometry-build time (deterministic, not re-rolled every frame) so it
  // reads as an occasional easter egg rather than noise.
  // Ω repeated so it's picked more often — glyph selection below is a uniform
  // random index into this array, so duplicate entries are the weighting knob.
  var GLYPHS = ['Ω', 'Ω', 'Ω', '✦', '✧', '∴', '⟡'];
  var GLYPH_CHANCE = 0.13; // ~13% of terrain vertices
  var SKY_GLYPH_CHANCE = 0.15; // ~15% of sky particles (nice-to-have reuse)

  // --- Motion ----------------------------------------------------------------
  var SPEED = 0.000017;
  var NOISE_X = 0.0026;
  var NOISE_Z = 0.0008;
  var SKY_LINK_DIST = 86;
  var PARALLAX_EASE = 0.02;  // pointer-parallax follow rate, kept gentle for a steadier read

  // A slow sinusoidal swell layered on top of the ridged noise, independent of
  // the noise scroll above — this is what turns "ridges sliding sideways"
  // into "ridges visibly rising and falling", i.e. rolling waves rather than
  // a scrolling skyline. Frequency/amplitude kept tame: subtle-plus, not storm.
  var SWELL_FREQ = 0.0006;   // spatial frequency across depth (world z)
  var SWELL_SPEED = 0.00045; // phase advance per ms
  var SWELL_AMP = 0.09;      // fraction of peak height added by the swell (was 0.16 — toned down for a steadier read)

  // Per-vertex undulation layered on top of the shared swell above: every
  // vertex gets its own phase (derived from its grid position) so neighbours
  // don't bob in lockstep — this is what reads as individual nodes "moving
  // around" rather than one uniform wave. Kept small relative to SWELL_AMP so
  // it adds life without shaking the terrain.
  var UNDULATE_FREQ = 0.00085;  // per-vertex phase advance per ms
  var UNDULATE_AMP = 0.028;     // fraction of peak height per vertex (was 0.05 — toned down for a steadier read)
  // Checkerboard cell size (world units) for the alternating sign below — tuned
  // to roughly the grid's own spacing so the flip is visible between neighbours
  // rather than only across large regions.
  var UNDULATE_CELL = 34;

  // --- Drag --------------------------------------------------------------
  var GRAB_RADIUS = 26;       // px from a node's centre that counts as a grab
  var MESH_DRAG_RADIUS = 3;   // grid cells (row/col distance) a drag pulls neighbours along for
  var SPRING_K = 0.15;        // spring stiffness pulling a settling node toward its target
  var SPRING_DAMPING = 0.85;  // velocity damping per frame; <1 stays underdamped (lets it overshoot).
                               // Raised from 0.66 so the spring rings through several visible
                               // back-and-forth swings before settling, instead of 1-2 quick ones.
  // Release target is a small fraction of the drag, not the exact origin — the
  // node springs back through several audible-feeling swings and comes to rest
  // just off its original position, rather than landing dead-on where it started.
  var SETTLE_OFFSET = 0.06;
  // Kick release velocity proportional to the retained delta (dx-tx) so the
  // overshoot/bounce reads clearly against how far the user actually dragged.
  // Re-tuned alongside the SPRING_DAMPING raise above — a less-damped spring
  // overshoots more per swing, so this needed lowering to keep the first swing
  // in a readable (not wild) range while still ringing through several cycles.
  var RELEASE_KICK = 0.9;

  // --- Ripple (expanding wavefront, spawned by the cursor but travels on its
  // own — it must not read as "following the cursor") -----------------------
  var RIPPLE_SPAWN_DIST = 40;   // px the pointer must move before a new ring spawns
  var RIPPLE_SPAWN_MS = 90;     // minimum ms between spawns, even if moving fast
  var RIPPLE_BAND = 70;         // px thickness of the traveling wavefront
  var RIPPLE_SPEED = 0.4;       // px/ms the ring's radius grows
  var RIPPLE_MAX_RADIUS = 1200; // px travelled before the ring is retired
  // Lifetime = RIPPLE_MAX_RADIUS / RIPPLE_SPEED = 1200/0.4 = 3000ms (was 520/0.5
  // = 1040ms) — roughly triples ring lifetime into the 2.5-3.5s "lasts longer" band.
  var RIPPLE_STRENGTH = 1.7;    // world-unit velocity kick at the wavefront's peak
  var MAX_RIPPLES = 5;          // concurrent rings kept alive (trimmed from 8 since
                                 // rings now overlap far longer at the same spawn rate)

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

  // Falling haze: a vertical gradient in the theme colour, washing down from
  // the top of the canvas past the horizon and over the upper wave terrain —
  // not confined to the sky band, so it actually reads as "falling onto the
  // waves" rather than a thin strip nobody notices. Cached and only rebuilt on
  // resize/theme change, since createLinearGradient is comparatively expensive
  // to redo every frame.
  var HAZE_SPAN_FRAC = 0.4; // fraction of viewport height the haze extends past the horizon
  var hazeGradient = null;

  function buildHazeGradient() {
    if (!ctx || !height) { hazeGradient = null; return; }
    var hazeEnd = Math.min(height, horizonY + height * HAZE_SPAN_FRAC);
    var g = ctx.createLinearGradient(0, 0, 0, hazeEnd);
    g.addColorStop(0, colour);
    g.addColorStop(1, 'transparent');
    hazeGradient = g;
  }
  var rowDepth = [];
  var colX = [];
  var sky = [];

  // Per-node drag state, indexed r * cols + c. dx/de are the live displacement
  // (world x, elevation); tx/te are what it is easing toward.
  var dx, de, tx, te, vx, ve, projX, projY;
  var dragWeight, dragBaseDx, dragBaseDe, dragAffected;
  // Per-vertex glyph assignment: -1 means "draw the usual dot", otherwise an
  // index into GLYPHS. Fixed at buildGeometry() time, not re-rolled per frame.
  var vertexGlyph;
  var vertexSizeMul;
  var vertexAlphaMul;
  // Deterministic per-vertex glyph-size multiplier (same hash pattern as
  // vertexSizeMul, distinct seed offset) — makes glyphs vary noticeably in
  // size rather than all rendering at the same font-size math.
  var vertexGlyphSizeMul;
  // Cross-frame sky-link state ("i,j" -> ms since the link first formed), so a
  // freshly-formed connector line can fade/scale in rather than snapping to
  // full opacity — the "spring into existence" spiderweb effect.
  var skyLinkAge = {};
  var LINK_SPAWN_MS = 420;
  var frameDt = 16.7;

  var frame = null;
  var resizeTimer = null;
  var start = 0;
  var travel = 0;

  var pointerX = 0;
  var pointerY = 0;
  var easedX = 0;
  var easedY = 0;

  // Raw last pointer screen coords (unlike pointerX/Y above, not remapped to
  // the parallax range) — used to find sky particles near the cursor for the
  // hover-vortex nudge below.
  var rawPointerX = -9999;
  var rawPointerY = -9999;

  var dragIndex = -1;
  var hoverIndex = -1;

  var swellPhase = 0;
  var undulatePhase = 0;
  var lastFrameTime = 0;

  // Active ripple rings: { x, y, r } in screen px, origin fixed at spawn time.
  var ripples = [];
  var lastRippleX = null;
  var lastRippleY = null;
  var lastRippleTime = 0;

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
    var ridge = ridged(worldX * NOISE_X, worldZ * NOISE_Z + travel) * peakWorld;
    // Slow swell riding on top of the ridge noise — rises and falls over time
    // rather than just scrolling, so the terrain reads as rolling waves.
    var swell = Math.sin(worldZ * SWELL_FREQ + swellPhase) * SWELL_AMP * peakWorld;
    // Per-vertex undulation: each (worldX, worldZ) gets a fixed spatial phase
    // offset (from a cheap sine of its own position, at a high enough spatial
    // frequency that adjacent vertices land in visibly different phase), so
    // neighbouring vertices drift out of sync with each other and with the
    // shared swell above.
    var vertexPhase = (worldX * 0.045 + worldZ * 0.03) * Math.PI * 2;
    // Checkerboard sign flip on top of the phase drift above: this is what
    // makes adjacent nodes/rows read as moving in visibly OPPOSITE directions
    // (an interference-pattern look) rather than a smooth shared ripple.
    var cellX = Math.floor(worldX / UNDULATE_CELL);
    var cellZ = Math.floor(worldZ / UNDULATE_CELL);
    var altSign = ((cellX + cellZ) & 1) ? -1 : 1;
    var undulate = Math.sin(undulatePhase + vertexPhase) * UNDULATE_AMP * peakWorld * altSign;
    return ridge + swell + undulate;
  }

  function scaleAt(depth) { return FOCAL / depth; }

  // Sky particle lifecycle (fade in -> hold -> fade out -> respawn), a slow
  // ambient twinkle rather than a permanently-on field. Durations are randomised
  // per particle in buildGeometry() so the field never pulses in sync.
  var TWINKLE_FADE_MIN = 1800;  // ms, fastest fade in/out
  var TWINKLE_FADE_MAX = 3400;  // ms, slowest fade in/out
  var TWINKLE_HOLD_MIN = 1500;  // ms, shortest fully-visible hold
  var TWINKLE_HOLD_MAX = 4500;  // ms, longest fully-visible hold

  // Subtle vortex-on-hover: sky particles within this radius of the pointer
  // get a gentle tangential (perpendicular-to-cursor) nudge, feeding the same
  // rvx/rvy spring-back used for ripples — a soft drift/swirl, not a spin.
  var VORTEX_RADIUS = 140;
  var VORTEX_STRENGTH = 0.0009; // kept low; scaled further by proximity below

  var SKY_MAX_SPEED = 0.26; // ceiling for the small wrap-edge speed kick (raised for floatier drift)
  function clampSpeed(v) {
    return v > SKY_MAX_SPEED ? SKY_MAX_SPEED : v < -SKY_MAX_SPEED ? -SKY_MAX_SPEED : v;
  }

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
    cols = Math.max(24, Math.min(70, Math.round(width / 22)));
    rows = Math.max(16, Math.min(34, Math.round(height / 32)));

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildHazeGradient();
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
    vx = new Float32Array(n);
    ve = new Float32Array(n);
    projX = new Float32Array(n);
    projY = new Float32Array(n);
    // Connected-mesh drag: while a node is grabbed, nearby nodes (by grid
    // distance) get dragged along too, weighted by dragWeight (1 at the
    // grabbed node, fading to 0 at MESH_DRAG_RADIUS). dragBaseDx/De snapshot
    // each affected node's displacement at drag-start so the live override in
    // pullTo() applies the grabbed node's *delta*, not its absolute position.
    dragWeight = new Float32Array(n);
    dragBaseDx = new Float32Array(n);
    dragBaseDe = new Float32Array(n);
    dragAffected = [];
    dragIndex = -1;
    hoverIndex = -1;

    // Deterministic per-vertex glyph flag (row/col + seed hash, so a resize
    // that rebuilds geometry re-rolls consistently rather than reusing stale
    // indices against a differently-sized grid).
    vertexGlyph = new Int8Array(n);
    // Per-vertex size/opacity variance for plain-dot vertices, deterministic
    // from row/col + seed so the field looks organic but stays stable across
    // frames (re-rolled only when geometry rebuilds, same as vertexGlyph).
    vertexSizeMul = new Float32Array(n);
    vertexAlphaMul = new Float32Array(n);
    vertexGlyphSizeMul = new Float32Array(n);
    for (var vr = 0; vr < rows; vr++) {
      for (var vc = 0; vc < cols; vc++) {
        var vi = vr * cols + vc;
        var vRoll = hash2(vr, vc, seed + 7919);
        vertexGlyph[vi] = vRoll < GLYPH_CHANCE
          ? Math.floor(hash2(vc, vr, seed + 104729) * GLYPHS.length)
          : -1;
        vertexSizeMul[vi] = 0.5 + hash2(vr, vc, seed + 40961) * 1.4;
        vertexAlphaMul[vi] = 0.8 + hash2(vc, vr, seed + 65537) * 0.4;
        vertexGlyphSizeMul[vi] = 0.5 + hash2(vr, vc, seed + 24847) * 1.7;
      }
    }

    skyLinkAge = {};
    sky.length = 0;
    var skyCount = Math.max(14, Math.min(48, Math.round((width * horizonY) / 11000)));
    for (var i = 0; i < skyCount; i++) {
      sky.push({
        x: Math.random() * width,
        y: Math.random() * horizonY,
        r: 1.1 + Math.random() * 1.5,
        // Floatier drift than before (0.09/0.05 -> 0.17/0.11), so the field
        // feels less static without breaking the twinkle/link readability.
        vx: (Math.random() - 0.5) * 0.17,
        vy: (Math.random() - 0.5) * 0.11,
        a: 0.45 + Math.random() * 0.55,
        glyph: Math.random() < SKY_GLYPH_CHANCE ? Math.floor(Math.random() * GLYPHS.length) : -1,
        // Parallel per-particle glyph-size multiplier (same range as the
        // terrain's vertexGlyphSizeMul), so sky glyphs vary in size too.
        glyphSizeMul: 0.5 + Math.random() * 1.7,
        // Ripple displacement: a separate spring-back offset from the base
        // wander position, so a cursor pass reads as a transient disturbance
        // rather than a permanent change to the particle's drift.
        rx: 0, ry: 0, rvx: 0, rvy: 0,
        // Twinkle lifecycle: fade in, hold at full, fade out to transparent,
        // then respawn elsewhere. Phase durations randomised so particles
        // never sync up; `twinklePhase` starts partway through a random
        // phase so the field doesn't all begin mid-fade-in on load.
        twinkleState: 'in',
        twinkleT: 0,
        twinkleFadeIn: TWINKLE_FADE_MIN + Math.random() * (TWINKLE_FADE_MAX - TWINKLE_FADE_MIN),
        twinkleHold: TWINKLE_HOLD_MIN + Math.random() * (TWINKLE_HOLD_MAX - TWINKLE_HOLD_MIN),
        twinkleFadeOut: TWINKLE_FADE_MIN + Math.random() * (TWINKLE_FADE_MAX - TWINKLE_FADE_MIN),
        twinkle: Math.random(),
      });
    }
  }

  // --- Drawing ---------------------------------------------------------------
  // Advances a sky particle's twinkle lifecycle by dt ms, respawning it at a
  // new random position once a full fade-out completes.
  function updateTwinkle(p, dt) {
    p.twinkleT += dt;
    if (p.twinkleState === 'in') {
      p.twinkle = Math.min(1, p.twinkleT / p.twinkleFadeIn);
      if (p.twinkleT >= p.twinkleFadeIn) { p.twinkleState = 'hold'; p.twinkleT = 0; }
    } else if (p.twinkleState === 'hold') {
      p.twinkle = 1;
      if (p.twinkleT >= p.twinkleHold) { p.twinkleState = 'out'; p.twinkleT = 0; }
    } else {
      p.twinkle = Math.max(0, 1 - p.twinkleT / p.twinkleFadeOut);
      if (p.twinkleT >= p.twinkleFadeOut) {
        p.x = Math.random() * width;
        p.y = Math.random() * horizonY;
        p.twinkleState = 'in';
        p.twinkleT = 0;
        p.twinkle = 0;
        p.twinkleFadeIn = TWINKLE_FADE_MIN + Math.random() * (TWINKLE_FADE_MAX - TWINKLE_FADE_MIN);
        p.twinkleHold = TWINKLE_HOLD_MIN + Math.random() * (TWINKLE_HOLD_MAX - TWINKLE_HOLD_MIN);
        p.twinkleFadeOut = TWINKLE_FADE_MIN + Math.random() * (TWINKLE_FADE_MAX - TWINKLE_FADE_MIN);
      }
    }
  }

  function drawSky() {
    // Rebuilt fresh each frame from what's actually in range right now: a key
    // missing from the previous frame's map means the link just formed, so it
    // starts its spring-in fade from zero; a key that carries over keeps
    // accumulating age until it reaches full opacity. Keys that drop out of
    // range simply aren't copied forward, so they vanish instead of leaking.
    var nextLinkAge = {};
    for (var i = 0; i < sky.length; i++) {
      var p = sky[i];
      for (var j = i + 1; j < sky.length; j++) {
        var q = sky[j];
        var ddx = p.x - q.x;
        var ddy = p.y - q.y;
        var dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist >= SKY_LINK_DIST) continue;
        var key = i + ',' + j;
        var age = (skyLinkAge[key] || 0) + frameDt;
        nextLinkAge[key] = age;
        var spawnT = Math.min(1, age / LINK_SPAWN_MS);
        ctx.globalAlpha = SKY_LINK_ALPHA * (1 - dist / SKY_LINK_DIST) * spawnT;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
    skyLinkAge = nextLinkAge;

    for (var k = 0; k < sky.length; k++) {
      var s = sky[k];
      ctx.globalAlpha = SKY_ALPHA * s.a * s.twinkle;
      if (s.glyph >= 0) {
        ctx.save();
        ctx.font = ((s.r * 5.2 + 4) * s.glyphSizeMul) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(GLYPHS[s.glyph], s.x + s.rx, s.y + s.ry);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(s.x + s.rx, s.y + s.ry, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
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
        if (vertexGlyph[i] >= 0) {
          ctx.globalAlpha = VERTEX_ALPHA * fade + lifted * 0.45;
          ctx.save();
          ctx.font = ((dotR * 4.2 + lifted * 3) * vertexGlyphSizeMul[i]) + 'px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(GLYPHS[vertexGlyph[i]], projX[i], projY[i]);
          ctx.restore();
        } else {
          ctx.globalAlpha = VERTEX_ALPHA * fade * vertexAlphaMul[i] + lifted * 0.45;
          ctx.beginPath();
          ctx.arc(projX[i], projY[i], dotR * vertexSizeMul[i] + lifted * 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
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

    drawSky();

    if (hazeGradient) {
      ctx.save();
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = hazeGradient;
      ctx.fillRect(0, 0, width, Math.min(height, horizonY + height * HAZE_SPAN_FRAC));
      ctx.restore();
    }

    drawTerrain(cx, hy);

    ctx.globalAlpha = 1;
  }

  // Draw once when the animation loop is not running (reduced motion, brutal),
  // so a drag still updates the picture.
  function requestDraw() {
    if (frame === null) draw();
  }

  // Spring-damper settle: a released node overshoots its retained position and
  // rings back with decaying amplitude, rather than easing straight to it.
  // Underdamped (SPRING_DAMPING < 1) so several visible back-and-forth swings
  // happen before the node comes to rest.
  function settle() {
    for (var i = 0; i < dx.length; i++) {
      if (i === dragIndex || dragWeight[i] > 0) continue;
      var ax = tx[i] - dx[i];
      var ae = te[i] - de[i];
      if (ax * ax + ae * ae < 0.0001 && vx[i] * vx[i] + ve[i] * ve[i] < 0.0001) {
        dx[i] = tx[i]; de[i] = te[i]; vx[i] = 0; ve[i] = 0;
        continue;
      }
      vx[i] = (vx[i] + ax * SPRING_K) * SPRING_DAMPING;
      ve[i] = (ve[i] + ae * SPRING_K) * SPRING_DAMPING;
      dx[i] += vx[i];
      de[i] += ve[i];
    }
  }

  function step(now) {
    if (!start) start = now;
    travel = (now - start) * SPEED;
    swellPhase = (now - start) * SWELL_SPEED;
    undulatePhase = (now - start) * UNDULATE_FREQ;
    var dt = lastFrameTime ? Math.min(now - lastFrameTime, 48) : 16.7;
    lastFrameTime = now;
    frameDt = dt;

    easedX += (pointerX - easedX) * PARALLAX_EASE;
    easedY += (pointerY - easedY) * PARALLAX_EASE;

    // Ripples travel outward on their own clock — nothing here reads the
    // live pointer position, so a ring keeps expanding after the cursor
    // has moved elsewhere or stopped.
    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      var ring = ripples[ri];
      ring.r += RIPPLE_SPEED * dt;
      if (ring.r > RIPPLE_MAX_RADIUS) { ripples.splice(ri, 1); continue; }
      applyRipple(ring);
    }

    for (var i = 0; i < sky.length; i++) {
      var p = sky[i];
      updateTwinkle(p, dt);
      p.x += p.vx;
      p.y += p.vy;
      // Wrap keeps its full velocity (restitution 1) plus a small kick, so
      // the field stays lively instead of losing energy at the seam.
      if (p.x < -10) { p.x = width + 10; p.vx = clampSpeed(p.vx * 1.05); }
      if (p.x > width + 10) { p.x = -10; p.vx = clampSpeed(p.vx * 1.05); }
      if (p.y < -10) { p.y = horizonY; p.vy = clampSpeed(p.vy * 1.05); }
      if (p.y > horizonY) { p.y = -10; p.vy = clampSpeed(p.vy * 1.05); }

      // Subtle vortex-on-hover: nudge particles near the pointer tangentially
      // around it, scaled down by proximity, so it reads as a soft swirl
      // rather than a violent spin.
      if (finePointer.matches && motionAllowed()) {
        var vdx = p.x - rawPointerX;
        var vdy = p.y - rawPointerY;
        var vdist = Math.sqrt(vdx * vdx + vdy * vdy);
        if (vdist < VORTEX_RADIUS && vdist > 0.0001) {
          var vf = (1 - vdist / VORTEX_RADIUS) * VORTEX_STRENGTH * dt;
          // Perpendicular to the pointer->particle vector = tangential.
          p.rvx += -vdy / vdist * vf;
          p.rvy += vdx / vdist * vf;
        }
      }

      // Ripple offset springs back to zero, same underdamped model as the
      // terrain settle below, so a cursor pass fades rather than sticks.
      p.rvx = (p.rvx + -p.rx * SPRING_K) * SPRING_DAMPING;
      p.rvy = (p.rvy + -p.ry * SPRING_K) * SPRING_DAMPING;
      p.rx += p.rvx;
      p.ry += p.rvy;
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
    buildHazeGradient();
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

  // Finds every node within MESH_DRAG_RADIUS grid cells of the grabbed node,
  // assigns each a falloff weight (1 at the grabbed node, fading to 0 at the
  // radius), and snapshots their current displacement as the base pullTo()
  // will apply the drag delta on top of. Called once per grab, not per frame.
  function computeDragAffected(i) {
    var r0 = (i / cols) | 0;
    var c0 = i % cols;
    dragAffected.length = 0;
    for (var r = Math.max(0, r0 - MESH_DRAG_RADIUS); r <= Math.min(rows - 1, r0 + MESH_DRAG_RADIUS); r++) {
      for (var c = Math.max(0, c0 - MESH_DRAG_RADIUS); c <= Math.min(cols - 1, c0 + MESH_DRAG_RADIUS); c++) {
        var dr = r - r0, dc = c - c0;
        var dist = Math.sqrt(dr * dr + dc * dc);
        if (dist > MESH_DRAG_RADIUS) continue;
        var idx = r * cols + c;
        dragWeight[idx] = idx === i ? 1 : Math.max(0, 1 - dist / MESH_DRAG_RADIUS);
        dragBaseDx[idx] = dx[idx];
        dragBaseDe[idx] = de[idx];
        dragAffected.push(idx);
      }
    }
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
    vx[i] = 0;
    ve[i] = 0;

    // Drag the connected mesh along with the grabbed node: apply the same
    // delta the grabbed node just moved, scaled by each neighbour's falloff
    // weight, on top of its position when the drag started.
    var deltaX = dx[i] - dragBaseDx[i];
    var deltaE = de[i] - dragBaseDe[i];
    for (var a = 0; a < dragAffected.length; a++) {
      var idx = dragAffected[a];
      if (idx === i) continue;
      dx[idx] = dragBaseDx[idx] + deltaX * dragWeight[idx];
      de[idx] = dragBaseDe[idx] + deltaE * dragWeight[idx];
    }
  }

  // A ripple ring: a thin traveling band at radius `r` from a fixed origin.
  // Terrain vertices / sky particles close to that band get an outward
  // velocity kick; the amplitude decays as the ring expands, so it fades out
  // on its own well before RIPPLE_MAX_RADIUS. They spring back through the
  // same settle()/ripple-offset physics used for drag-release.
  function applyRipple(ring) {
    var half = RIPPLE_BAND / 2;
    var decay = 1 - ring.r / RIPPLE_MAX_RADIUS;
    if (decay <= 0) return;

    for (var i = 0; i < projX.length; i++) {
      if (i === dragIndex) continue;
      var ddx = projX[i] - ring.x;
      var ddy = projY[i] - ring.y;
      var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.0001;
      var band = Math.abs(dist - ring.r);
      if (band >= half) continue;
      var bandFalloff = 1 - band / half;
      var k = scaleAt(rowDepth[(i / cols) | 0]);
      var push = bandFalloff * bandFalloff * decay * RIPPLE_STRENGTH / k;
      vx[i] += (ddx / dist) * push;
      ve[i] += (ddy / dist) * push;
    }

    for (var s = 0; s < sky.length; s++) {
      var p = sky[s];
      var sdx = (p.x + p.rx) - ring.x;
      var sdy = (p.y + p.ry) - ring.y;
      var sd = Math.sqrt(sdx * sdx + sdy * sdy) || 0.0001;
      var sband = Math.abs(sd - ring.r);
      if (sband >= half) continue;
      var sf = 1 - sband / half;
      var spush = sf * sf * decay * RIPPLE_STRENGTH * 0.35;
      p.rvx += (sdx / sd) * spush;
      p.rvy += (sdy / sd) * spush;
    }
  }

  // Throttled spawn: a new ring is only created once the pointer has moved
  // far enough (or enough time has passed) since the last one, so a sweep
  // across the screen leaves a trail of a few rings rather than one per
  // pixel of movement. The rings themselves never re-read pointer position.
  function maybeSpawnRipple(px, py, now) {
    if (!motionAllowed()) return;
    var movedFar = lastRippleX === null ||
      (px - lastRippleX) * (px - lastRippleX) + (py - lastRippleY) * (py - lastRippleY) >=
        RIPPLE_SPAWN_DIST * RIPPLE_SPAWN_DIST;
    if (!movedFar || now - lastRippleTime < RIPPLE_SPAWN_MS) return;

    lastRippleX = px;
    lastRippleY = py;
    lastRippleTime = now;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x: px, y: py, r: 0 });
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
      computeDragAffected(i);
      pullTo(i, event.clientX, event.clientY);
      body.style.cursor = 'grabbing';
      event.preventDefault();
      requestDraw();
    });

    window.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch') return;

      rawPointerX = event.clientX;
      rawPointerY = event.clientY;

      maybeSpawnRipple(event.clientX, event.clientY, event.timeStamp || performance.now());

      if (dragIndex >= 0) {
        pullTo(dragIndex, event.clientX, event.clientY);
        event.preventDefault();
        requestDraw();
        return;
      }

      // Shifting the vanishing point a little reads as looking around the
      // scene; more than this and the terrain visibly swims.
      pointerX = ((event.clientX / width) - 0.5) * -16;
      pointerY = ((event.clientY / height) - 0.5) * -9;

      var i = interactiveTarget(event) ? -1 : nearestNode(event.clientX, event.clientY);
      if (i !== hoverIndex) {
        hoverIndex = i;
        body.style.cursor = i >= 0 ? 'grab' : '';
        requestDraw();
      }
    }, { passive: false });

    window.addEventListener('pointerup', function () {
      if (dragIndex < 0) return;
      // Release every mesh-dragged node (the grabbed one plus its weighted
      // neighbours), each springing back toward just-off-original (SETTLE_OFFSET)
      // with a release kick scaled by that node's dragWeight — full strength at
      // the grabbed node, fading out toward MESH_DRAG_RADIUS, so the bounce
      // visibly weakens the farther a node is from where it was grabbed.
      for (var a = 0; a < dragAffected.length; a++) {
        var idx = dragAffected[a];
        var w = dragWeight[idx];
        tx[idx] = dx[idx] * SETTLE_OFFSET;
        te[idx] = de[idx] * SETTLE_OFFSET;
        if (motionAllowed()) {
          vx[idx] = -(dx[idx] - tx[idx]) * RELEASE_KICK * w;
          ve[idx] = -(de[idx] - te[idx]) * RELEASE_KICK * w;
        } else {
          dx[idx] = tx[idx];
          de[idx] = te[idx];
        }
        dragWeight[idx] = 0;
      }
      dragAffected.length = 0;
      dragIndex = -1;
      body.style.cursor = hoverIndex >= 0 ? 'grab' : '';
      requestDraw();
    });

    window.addEventListener('pointercancel', function () {
      if (dragIndex >= 0) {
        for (var a = 0; a < dragAffected.length; a++) dragWeight[dragAffected[a]] = 0;
        dragAffected.length = 0;
      }
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
    buildHazeGradient();
    run();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  var onMotionChange = function () { run(); };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
  else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

  reset();
}());
