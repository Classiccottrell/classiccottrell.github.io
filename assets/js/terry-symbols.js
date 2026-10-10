// Terry, set in type: the footer piece from Terry Time, ported from its React
// component (components/TerrySymbols.tsx in Classiccottrell/TerryTime) to plain
// JavaScript so the case study can run it live. Loaded only on that page.
//
// A grid of monospace symbols reads the face drawing cell by cell: outlines take a
// glyph that follows the stroke (| / \ -), solid strokes take heavy glyphs, and the
// background prints faint engraving rows. Every cell keeps re-picking its glyph
// within its weight class, so the type never stops switching while the face stays
// legible. A stable-fluids simulation runs underneath: hovering speeds up the
// switching, and a fast flick smears the type and scrambles it in a red second
// plate before it settles. On first view the face prints top to bottom.
//
// WebGL2 with float render targets; without them, a still typed frame in canvas 2D.
// Reduced motion gets one still frame. Decorative: aria-hidden, paused off screen.
//
// Markup: <canvas data-terry-symbols data-src="face.png"> (data-ink, data-paper and
// data-cell are optional; the colours default to the --tt-ink and --tt-paper tokens)
// in a positioned parent that also holds an element with data-tt-face: the face is
// drawn over that element's box. An optional [data-tt-hint] gets data-still or
// data-flat as its text when the piece can't move.
(function () {
  'use strict';
  var SLOTS = ['-', '-', '|', '/', '\\', ':', '+', '#', '@'];
  var HEAVY = '#@%&$8', MID = '+=*:', SCRAMBLE = '!<>_[]{}=+*^?#%$&@/\\';
  var FONT = 'ui-monospace, "SFMono-Regular", "Cascadia Mono", "Roboto Mono", Menlo, monospace';
  var PLATE = [0.949, 0.271, 0.42], MASK = 1024, FACE_SCALE = 0.92;

  var rgb = function (hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16) / 255; }); };

  // The face drawing as ink coverage (0-255), in GL row order (bottom row first).
  function loadMask(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = c.height = MASK;
        var x = c.getContext('2d', { willReadFrequently: true });
        x.fillStyle = '#fff';
        x.fillRect(0, 0, MASK, MASK);
        x.drawImage(img, 0, 0, MASK, MASK);
        var d = x.getImageData(0, 0, MASK, MASK).data, m = new Uint8Array(MASK * MASK);
        for (var y = 0; y < MASK; y++) for (var i = 0; i < MASK; i++) m[(MASK - 1 - y) * MASK + i] = 255 - d[(y * MASK + i) * 4];
        resolve(m);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Glyph atlas: one row of every slot and pool glyph, the heavy ones in an extra-heavy cut.
  function atlas(px) {
    var chars = SLOTS.concat(HEAVY.split(''), MID.split(''), SCRAMBLE.split(''));
    var cw = Math.max(1, Math.round(px * 0.62)), c = document.createElement('canvas');
    c.width = cw * chars.length;
    c.height = px;
    var x = c.getContext('2d');
    x.fillStyle = '#000';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = x.strokeStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '700 ' + Math.round(px * 0.9) + 'px ' + FONT;
    x.lineWidth = Math.max(1, px * 0.11);
    chars.forEach(function (k, i) {
      x.fillText(k, cw * i + cw / 2, px * 0.54);
      if (i >= 7 && i < 9 + HEAVY.length) x.strokeText(k, cw * i + cw / 2, px * 0.54);
    });
    return { canvas: c, count: chars.length, heavy: [9, HEAVY.length], mid: [9 + HEAVY.length, MID.length], pool: [9 + HEAVY.length + MID.length, SCRAMBLE.length] };
  }

  var VS = '#version 300 es\nin vec2 a; out vec2 vUv; void main(){ vUv = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }';
  var FS = function (body) { return '#version 300 es\nprecision highp float; in vec2 vUv; out vec4 o; ' + body; };
  var ADVECT = FS('uniform sampler2D uVel; uniform float dt, dis; void main(){ o = dis * texture(uVel, vUv - dt * texture(uVel, vUv).xy); }');
  var SPLAT = FS('uniform sampler2D uSrc; uniform vec2 pt, force; uniform float r, aspect;\n' +
    'void main(){ vec2 d = vUv - pt; d.x *= aspect; o = texture(uSrc, vUv) + vec4(force * exp(-dot(d,d) / r), 0., 0.); }');
  var DIVERGE = FS('uniform sampler2D uVel; uniform vec2 tx;\n' +
    'void main(){ o = vec4(.5 * (texture(uVel, vUv + vec2(tx.x,0)).x - texture(uVel, vUv - vec2(tx.x,0)).x + texture(uVel, vUv + vec2(0,tx.y)).y - texture(uVel, vUv - vec2(0,tx.y)).y), 0, 0, 1); }');
  var JACOBI = FS('uniform sampler2D uP, uDiv; uniform vec2 tx;\n' +
    'void main(){ o = vec4((texture(uP, vUv - vec2(tx.x,0)).x + texture(uP, vUv + vec2(tx.x,0)).x + texture(uP, vUv - vec2(0,tx.y)).x + texture(uP, vUv + vec2(0,tx.y)).x - texture(uDiv, vUv).x) * .25, 0, 0, 1); }');
  var PROJECT = FS('uniform sampler2D uP, uVel; uniform vec2 tx;\n' +
    'void main(){ o = vec4(texture(uVel, vUv).xy - .5 * vec2(texture(uP, vUv + vec2(tx.x,0)).x - texture(uP, vUv - vec2(tx.x,0)).x, texture(uP, vUv + vec2(0,tx.y)).x - texture(uP, vUv - vec2(0,tx.y)).x), 0, 1); }');
  var DISP = FS('uniform sampler2D uVel, uDisp; uniform float dt, relax;\n' +
    'void main(){ vec2 v = texture(uVel, vUv).xy; o = vec4(texture(uDisp, vUv - dt * v).xy * relax + v * dt, 0, 1); }');
  var RENDER = FS([
    'uniform sampler2D uDisp, uVel, uMask, uAtlas;',
    'uniform vec2 res, faceC, cell, ptr, heavy, mid, pool; uniform float faceS, maskSize, glyphs, t, intro, hover;',
    'uniform vec3 ink, paper, plate;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
    'float mask(vec2 p, float lod){ vec2 f = (p - faceC) / faceS + .5; if (f.x < 0. || f.y < 0. || f.x > 1. || f.y > 1.) return 0.; return textureLod(uMask, f, lod).r; }',
    'void main(){',
    '  vec2 px = gl_FragCoord.xy, ci = floor(px / cell), cc = (ci + .5) * cell, uv = cc / res;',
    '  vec2 d = texture(uDisp, uv).xy * res, v = texture(uVel, uv).xy * res;',
    '  vec2 p = cc - d;',
    '  float lod = max(0., log2(cell.y / (faceS / maskSize)) - .75);',
    '  float cov = mask(p, lod);',
    // Structure tensor over a 3x3 neighbourhood: a stable stroke direction.
    '  float gxx = 0., gyy = 0., gxy = 0., e = cell.y * .45;',
    '  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {',
    '    vec2 q = p + vec2(float(i), float(j)) * cell * .5;',
    '    float gx = mask(q + vec2(e, 0.), lod) - mask(q - vec2(e, 0.), lod), gy = mask(q + vec2(0., e), lod) - mask(q - vec2(0., e), lod);',
    '    gxx += gx * gx; gyy += gy * gy; gxy += gx * gy;',
    '  }',
    '  float strength = sqrt(gxx + gyy) / 3.;',
    // Constant switching: each cell re-picks within its weight class on its own clock.
    '  float near = hover * exp(-dot(cc - ptr, cc - ptr) / (res.y * res.y * .02));',
    '  float rate = (2.2 + 5. * near) * (.6 + hash(ci * 3.1));',
    '  float tick = floor(t * rate + hash(ci) * 50.);',
    '  float r = hash(ci + tick * .713);',
    '  float slot, alpha = 1.;',
    '  if (cov > .74) slot = heavy.x + floor(r * heavy.y);',
    '  else if (strength > .2 && cov > .12) {',
    '    float a = mod(.5 * atan(2. * gxy, gxx - gyy) + 1.5708, 3.14159);',
    '    slot = (a < .3927 || a > 2.7489) ? 1. : (a < 1.1781 ? 3. : (a < 1.9635 ? 2. : 4.));',
    '    if (r > .82) slot = mid.x + floor(hash(ci + tick) * mid.y);',
    '  }',
    '  else if (cov > .3) slot = mid.x + floor(r * mid.y);',
    '  else { slot = r > .9 ? 5. : 0.; alpha = mod(ci.y, 2.) < 1. ? .2 : 0.; }',
    // Scramble in the red plate: a fast flick, plus the print head sweeping down on load.
    '  float rowsFromTop = (res.y - cc.y) / cell.y, head = intro * (res.y / cell.y + 6.);',
    '  float printing = clamp(1. - (head - rowsFromTop) / 3., 0., 1.);',
    '  float speed = smoothstep(30., 420., length(v));',
    '  float ftick = floor(t * 18.);',
    '  bool scrambled = hash(ci + ftick) < max(speed, printing);',
    '  if (scrambled) { slot = pool.x + floor(hash(ci * 1.7 + ftick) * pool.y); alpha = max(alpha, .9); }',
    '  if (rowsFromTop > head) alpha = 0.;',
    '  vec2 lc = fract(px / cell);',
    '  float gi = texture(uAtlas, vec2((slot + lc.x) / glyphs, 1. - lc.y)).r * alpha;',
    '  o = vec4(mix(paper, scrambled ? mix(ink, plate, .85) : ink, gi), 1.);',
    '}',
  ].join('\n'));

  function program(gl, fs) {
    var sh = function (type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p: p, u: u };
  }

  function target(gl, w, h) {
    var make = function () {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex: tex, fb: fb };
    };
    var a = make(), b = make();
    return { w: w, h: h, get read() { return a; }, get write() { return b; }, swap: function () { var s = a; a = b; b = s; } };
  }

  // A still typed frame with canvas 2D, for browsers without WebGL2 float targets.
  function drawFlat(canvas, mask, o) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var x = canvas.getContext('2d');
    if (!x) return;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = o.paper;
    x.fillRect(0, 0, W, H);
    var ch = o.cell, cw = ch * 0.62, f = o.face(), size = f.s, fx = f.x - size / 2, fy = f.y - size / 2;
    var cov = function (px, py) {
      var u = (px - fx) / size, v = (py - fy) / size;
      if (u < 0 || v < 0 || u >= 1 || v >= 1) return 0;
      return mask[(MASK - 1 - Math.floor(v * MASK)) * MASK + Math.floor(u * MASK)] / 255;
    };
    x.font = '700 ' + Math.round(ch * 0.9) + 'px ' + FONT;
    x.lineWidth = Math.max(0.6, ch * 0.11);
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (var row = 0; row * ch < H; row++) {
      for (var col = 0; col * cw < W; col++) {
        var cx = (col + 0.5) * cw, cy = (row + 0.5) * ch, c = cov(cx, cy);
        var gx = cov(cx + ch * 0.45, cy) - cov(cx - ch * 0.45, cy), gy = cov(cx, cy + ch * 0.45) - cov(cx, cy - ch * 0.45);
        var glyph, alpha = 1;
        if (c > 0.74) glyph = HEAVY[(row * 7 + col) % HEAVY.length];
        else if (Math.hypot(gx, gy) > 0.2 && c > 0.12) {
          var a = ((Math.atan2(-gy, gx) + Math.PI / 2) % Math.PI + Math.PI) % Math.PI;
          glyph = a < 0.3927 || a > 2.7489 ? '-' : a < 1.1781 ? '/' : a < 1.9635 ? '|' : '\\';
        } else if (c > 0.3) glyph = MID[(row + col) % MID.length];
        else if (row % 2 === 0) { glyph = '-'; alpha = 0.2; }
        else continue;
        x.globalAlpha = alpha;
        x.fillStyle = x.strokeStyle = o.ink;
        x.fillText(glyph, cx, cy);
        if (c > 0.74) x.strokeText(glyph, cx, cy);
      }
    }
    x.globalAlpha = 1;
  }

  function runGL(gl, canvas, host, mask, o) {
    var quadVao = gl.createVertexArray();
    gl.bindVertexArray(quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var P = { advect: program(gl, ADVECT), splat: program(gl, SPLAT), diverge: program(gl, DIVERGE), jacobi: program(gl, JACOBI), project: program(gl, PROJECT), disp: program(gl, DISP), render: program(gl, RENDER) };

    var maskTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, MASK, MASK, 0, gl.RED, gl.UNSIGNED_BYTE, mask);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var atlasTex = gl.createTexture();

    var inkRgb = rgb(o.ink), paperRgb = rgb(o.paper), reduce = o.reduce;
    var W = 0, H = 0, dpr = 1, cellPx = 6, glyphInfo, sim, pres, div, disp, face = o.face();
    var raf = 0, visible = false, last = performance.now(), start = last, hoverA = 0;
    var pointer = { x: -1, y: -1, dx: 0, dy: 0, active: false };

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(canvas.clientWidth * dpr));
      H = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = W;
      canvas.height = H;
      var sw = 160, sh = Math.max(32, Math.round((160 * H) / W));
      sim = target(gl, sw, sh); pres = target(gl, sw, sh); div = target(gl, sw, sh); disp = target(gl, sw, sh);
      cellPx = Math.max(5, Math.round(o.cell * dpr));
      glyphInfo = atlas(cellPx);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphInfo.canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      face = o.face();
    }

    function pass(prog, out, uniforms) {
      gl.useProgram(prog.p);
      var unit = 0;
      Object.keys(uniforms).forEach(function (k) {
        var loc = prog.u[k], v = uniforms[k];
        if (loc == null) return;
        if (v instanceof WebGLTexture) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v); gl.uniform1i(loc, unit++); }
        else if (typeof v === 'number') gl.uniform1f(loc, v);
        else if (v.length === 2) gl.uniform2fv(loc, v);
        else gl.uniform3fv(loc, v);
      });
      if (out) { gl.bindFramebuffer(gl.FRAMEBUFFER, out.write.fb); gl.viewport(0, 0, out.w, out.h); }
      else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); }
      gl.bindVertexArray(quadVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (out) out.swap();
    }

    function frame(now) {
      raf = 0;
      var dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      var t = (now - start) / 1000, tx = [1 / sim.w, 1 / sim.h];
      if (pointer.active && (pointer.dx || pointer.dy)) {
        // Hovering stirs the switching; only a fast flick pushes the ink.
        var sp = Math.hypot(pointer.dx, pointer.dy) / Math.max(dt, 1e-3), k = Math.min(1, Math.max(0, (sp - 250) / 900));
        if (k > 0) pass(P.splat, sim, { uSrc: sim.read.tex, pt: [(pointer.x * dpr) / W, (pointer.y * dpr) / H], force: [(pointer.dx * dpr * 9 * k) / W, (pointer.dy * dpr * 9 * k) / H], r: 0.0016, aspect: W / H });
        pointer.dx = pointer.dy = 0;
      }
      pass(P.advect, sim, { uVel: sim.read.tex, dt: dt, dis: 0.985 });
      pass(P.diverge, div, { uVel: sim.read.tex, tx: tx });
      for (var i = 0; i < 20; i++) pass(P.jacobi, pres, { uP: pres.read.tex, uDiv: div.read.tex, tx: tx });
      pass(P.project, sim, { uP: pres.read.tex, uVel: sim.read.tex, tx: tx });
      pass(P.disp, disp, { uVel: sim.read.tex, uDisp: disp.read.tex, dt: dt, relax: 0.95 });
      hoverA += ((pointer.active && !reduce ? 1 : 0) - hoverA) * 0.1;
      pass(P.render, null, {
        uDisp: disp.read.tex, uVel: sim.read.tex, uMask: maskTex, uAtlas: atlasTex,
        res: [W, H], faceC: [face.x * dpr, H - face.y * dpr], faceS: face.s * dpr,
        cell: [Math.max(1, Math.round(cellPx * 0.62)), cellPx], maskSize: MASK,
        glyphs: glyphInfo.count, heavy: glyphInfo.heavy, mid: glyphInfo.mid, pool: glyphInfo.pool,
        ptr: [pointer.x * dpr, pointer.y * dpr], hover: hoverA,
        t: reduce ? 0 : t, intro: reduce ? 99 : t / 2.2,
        ink: inkRgb, paper: paperRgb, plate: PLATE,
      });
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    }
    var kick = function () { if (!raf) raf = requestAnimationFrame(frame); };

    if (!reduce) {
      var onMove = function (e) {
        var r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = r.height - (e.clientY - r.top);
        if (pointer.active) { pointer.dx += px - pointer.x; pointer.dy += py - pointer.y; }
        pointer.x = px; pointer.y = py; pointer.active = true;
      };
      var onLeave = function () { pointer.active = false; };
      host.addEventListener('pointermove', onMove);
      host.addEventListener('pointerdown', onMove);
      host.addEventListener('pointerleave', onLeave);
      host.addEventListener('pointercancel', onLeave);
    }
    var ro = new ResizeObserver(function () { resize(); kick(); });
    ro.observe(canvas);
    if (o.faceEl) ro.observe(o.faceEl);
    // The print-in starts the first time the piece scrolls into view.
    var seen = false;
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !seen) { seen = true; start = last = performance.now(); }
      if (visible) kick();
    }).observe(canvas);
    resize();
  }

  function mount(canvas) {
    var host = canvas.parentElement || canvas;
    var faceEl = host.querySelector('[data-tt-face]'), hint = host.querySelector('[data-tt-hint]');
    var say = function (key) { if (hint && hint.getAttribute('data-' + key)) hint.textContent = hint.getAttribute('data-' + key); };
    var css = getComputedStyle(host);
    var o = {
      ink: canvas.getAttribute('data-ink') || css.getPropertyValue('--tt-ink').trim() || '#1233c7',
      paper: canvas.getAttribute('data-paper') || css.getPropertyValue('--tt-paper').trim() || '#f7f6f1',
      cell: Number(canvas.getAttribute('data-cell')) || 6,
      reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      faceEl: faceEl,
      // The face's centre and size in CSS px, measured from the top left of the canvas.
      face: function () {
        var c = canvas.getBoundingClientRect(), f = faceEl ? faceEl.getBoundingClientRect() : c;
        return { x: f.left - c.left + f.width / 2, y: f.top - c.top + f.height / 2, s: Math.min(f.width, f.height) * FACE_SCALE };
      },
    };
    var gl = null;
    try { gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false }); } catch (e) { gl = null; }
    var glOk = !!gl && !!gl.getExtension('EXT_color_buffer_float');

    function flat(mask) {
      // A canvas that already holds a WebGL context can't give a 2D one, so swap in a fresh copy.
      if (gl) { var fresh = canvas.cloneNode(false); canvas.parentNode.replaceChild(fresh, canvas); canvas = fresh; }
      var paint = function () { drawFlat(canvas, mask, o); }, ro = new ResizeObserver(paint);
      ro.observe(canvas);
      if (faceEl) ro.observe(faceEl);
      paint();
      canvas.setAttribute('data-state', 'flat');
      say('flat');
    }

    loadMask(canvas.getAttribute('data-src')).then(function (mask) {
      if (!glOk) return flat(mask);
      try {
        runGL(gl, canvas, host, mask, o);
        canvas.setAttribute('data-state', o.reduce ? 'still' : 'live');
        if (o.reduce) say('still');
      } catch (e) {
        flat(mask);
      }
    }, function () { canvas.setAttribute('data-state', 'missing'); });
  }

  Array.prototype.forEach.call(document.querySelectorAll('canvas[data-terry-symbols]'), mount);
})();
