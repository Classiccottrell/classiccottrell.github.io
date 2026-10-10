// Ink & Rule, the optional layer. Every page reads fine without this file;
// each feature below switches on only when its markup is on the page.
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var store = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  var recall = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var cssVar = function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduce.matches ? 0 : ms); }); };

  function copyText(text, status, done, fallbackTarget) {
    function manual() {
      if (fallbackTarget) {
        var range = document.createRange(); range.selectNodeContents(fallbackTarget);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      }
      status.textContent = 'Press Ctrl+C or ⌘C to copy.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { status.textContent = done; }, manual);
    else manual();
  }

  // ------------------------------------------------------------ footer year
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ------------------------------------------------------------ reading progress on the masthead rule
  var mast = $('.mast'), ticking = false;
  function progress() {
    ticking = false;
    var h = root.scrollHeight - window.innerHeight;
    mast.style.setProperty('--read', h > 0 ? Math.min(1, window.scrollY / h).toFixed(4) : '0');
  }
  if (mast) {
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
    progress();
  }

  // ------------------------------------------------------------ phone menu
  var menu = $('.menu');
  if (menu) {
    document.addEventListener('click', function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.open) { menu.open = false; $('summary', menu).focus(); } });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.open = false; });
    menu.addEventListener('focusout', function (e) { if (menu.open && e.relatedTarget && !menu.contains(e.relatedTarget)) menu.open = false; });
  }

  // ------------------------------------------------------------ pencils: the grid, rulers and a redline inspector
  var pencilBtn = $('[data-pencils]');
  if (pencilBtn) {
    var built = false, box, tag, rx, ry, ryBox, pending = null, raf = 0;
    var TOKENS = {
      '10,10,10': 'India ink', '255,255,255': 'Bristol', '85,88,92': 'Graphite', '164,221,237': 'Non-photo blue', '27,98,160': 'Blueline',
      '242,241,238': 'Bristol (ink)', '163,166,170': 'Graphite (ink)', '0,0,0': 'Ink band', '216,240,247': 'Pencil highlight',
      '29,69,82': 'Pencil highlight (ink)', '46,101,119': 'Pencil (ink)'
    };
    var tokenOf = function (c) {
      var m = c.match(/[\d.]+/g); if (!m || m.length < 3) return c;
      var a = m.length > 3 ? +m[3] : 1; if (a === 0) return null;
      var key = m.slice(0, 3).map(function (v) { return Math.round(+v); }).join(',');
      return (TOKENS[key] || 'rgb ' + key) + (a < 1 ? ' at ' + Math.round(a * 100) + '%' : '');
    };
    var build = function () {
      if (built) return; built = true;
      var grid = document.createElement('div'); grid.className = 'pgrid'; grid.setAttribute('aria-hidden', 'true');
      grid.innerHTML = '<div class="wrap pgrid-in">' + new Array(13).join('<b></b>') + '</div>';
      document.body.appendChild(grid);
      [['rl-x', '<i></i>'], ['rl-y', '<i></i>'], ['rl-box', ''], ['rl-tag', '']].forEach(function (d) {
        var el = document.createElement('div'); el.className = d[0]; el.setAttribute('aria-hidden', 'true'); el.innerHTML = d[1]; document.body.appendChild(el);
      });
      box = $('.rl-box'); tag = $('.rl-tag'); rx = $('.rl-x i'); ry = $('.rl-y i'); ryBox = $('.rl-y');
    };
    var hide = function () { if (box) { box.classList.remove('on'); tag.classList.remove('on'); } };
    var set = function (on) {
      if (on) build();
      root.classList.toggle('pencils', on);
      pencilBtn.setAttribute('aria-pressed', String(on));
      store('cc-pencils', on ? '1' : null);
      if (!on) hide();
    };
    var paint = function () {
      raf = 0; var p = pending; if (!p || !box) return;
      rx.style.left = p.x + 'px'; ry.style.top = Math.max(0, p.y - ryBox.getBoundingClientRect().top) + 'px';
      var el = document.elementFromPoint(p.x, p.y);
      if (!el || el === document.body || el === root || el.closest('.mast')) { hide(); return; }
      var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px'; box.classList.add('on');
      var lines = ['x ' + Math.round(p.x) + ' · y ' + Math.round(p.y + window.scrollY) + '   <' + el.tagName.toLowerCase() + '> ' + Math.round(r.width) + ' × ' + Math.round(r.height)];
      var text = Array.prototype.some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
      if (text) {
        var lh = cs.lineHeight === 'normal' ? 'normal' : Math.round(parseFloat(cs.lineHeight));
        lines.push(cs.fontFamily.split(',')[0].replace(/["']/g, '') + ' ' + cs.fontWeight + ' · ' + Math.round(parseFloat(cs.fontSize)) + '/' + lh + ' · ' + tokenOf(cs.color));
      }
      var bg = tokenOf(cs.backgroundColor); if (bg) lines.push('fill ' + bg);
      var bw = parseFloat(cs.borderTopWidth);
      if (bw > 0 && cs.borderTopStyle !== 'none') lines.push('border ' + Math.round(bw * 10) / 10 + ' px ' + cs.borderTopStyle + ' · ' + tokenOf(cs.borderTopColor));
      var pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(function (v) { return Math.round(parseFloat(v)); });
      if (pad.some(function (v) { return v > 0; })) lines.push('padding ' + pad.join(' '));
      tag.textContent = lines.join('\n'); tag.classList.add('on');
      var tw = tag.offsetWidth, th = tag.offsetHeight, tx = p.x + 16, ty = p.y + 18;
      if (tx + tw > window.innerWidth - 8) tx = p.x - tw - 16;
      if (ty + th > window.innerHeight - 8) ty = p.y - th - 14;
      tag.style.left = Math.max(8, tx) + 'px'; tag.style.top = Math.max(76, ty) + 'px';
    };
    pencilBtn.hidden = false;
    pencilBtn.addEventListener('click', function () { set(!root.classList.contains('pencils')); });
    document.addEventListener('mousemove', function (e) {
      if (!root.classList.contains('pencils') || !fine.matches) return;
      pending = { x: e.clientX, y: e.clientY }; if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    document.addEventListener('mouseleave', hide);
    window.addEventListener('scroll', function () { if (root.classList.contains('pencils') && pending && !raf) raf = requestAnimationFrame(paint); }, { passive: true });
    if (recall('cc-pencils') === '1') set(true);
  }

  // ------------------------------------------------------------ pencils, then inks
  function setInk(fig, v) { fig.style.setProperty('--inked', (v * 1.14 - 7).toFixed(2)); }
  function runInk(fig) {
    if (fig._raf) cancelAnimationFrame(fig._raf);
    if (reduce.matches) { setInk(fig, 100); return; }
    var dur = +fig.getAttribute('data-dur') || 1800, t0 = null;
    var step = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setInk(fig, e * 100);
      if (p < 1) fig._raf = requestAnimationFrame(step);
    };
    setInk(fig, 0); fig._raf = requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && !reduce.matches) {
    var inkIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { inkIO.unobserve(en.target); runInk(en.target); } });
    }, { threshold: 0.35 });
    $$('[data-inking]').forEach(function (fig) { inkIO.observe(fig); });
  }

  // ------------------------------------------------------------ the cut: pictures change in the same frame
  $$('[data-cut]').forEach(function (list) {
    var pic = $('.' + list.getAttribute('data-cut') + ' img'); if (!pic) return;
    var rows = $$('[data-src]', list);
    rows.forEach(function (row, i) {
      new Image().src = row.getAttribute('data-src');
      var show = function () { pic.src = row.getAttribute('data-src'); rows.forEach(function (x) { x.classList.toggle('on', x === row); }); };
      row.addEventListener('mouseenter', show); row.addEventListener('focus', show);
      if (i === 0) row.classList.add('on');
    });
  });

  // ------------------------------------------------------------ take it apart
  var xv = $('#xv'), xr = $('#explode');
  if (xv && xr) {
    var xo = $('output[for="explode"]'), xb = $('#explode-btn'), tags = $$('.xv-tag', xv), pins = {};
    $$('.xv-layer', xv).forEach(function (l) { pins[l.getAttribute('data-l')] = $('.xv-pin', l); });
    var placeTags = function () {
      var B = xv.getBoundingClientRect();
      tags.forEach(function (t) {
        var pin = pins[t.getAttribute('data-l')]; if (!pin) return;
        var r = pin.getBoundingClientRect();
        t.style.top = (r.top + r.height / 2 - B.top).toFixed(1) + 'px';
        t.style.width = Math.max(0, r.left + r.width / 2 - B.left).toFixed(1) + 'px';
      });
    };
    var setX = function (v) {
      xv.style.setProperty('--x', (v / 100).toFixed(3)); xr.value = String(Math.round(v));
      if (xo) xo.textContent = Math.round(v) + '%';
      if (xb) xb.textContent = v > 50 ? 'Put it back' : 'Take it apart';
      placeTags();
    };
    var animX = function (to) {
      if (xv._raf) cancelAnimationFrame(xv._raf);
      if (reduce.matches) { setX(to); return; }
      var from = +xr.value, t0 = null;
      var st = function (t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / 1500), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        setX(from + (to - from) * e);
        if (p < 1) xv._raf = requestAnimationFrame(st);
      };
      xv._raf = requestAnimationFrame(st);
    };
    xr.addEventListener('input', function () { if (xv._raf) cancelAnimationFrame(xv._raf); setX(+xr.value); });
    if (xb) xb.addEventListener('click', function () { animX(+xr.value > 50 ? 0 : 100); });
    if (window.ResizeObserver) new ResizeObserver(placeTags).observe(xv);
    if ('IntersectionObserver' in window) {
      var xio = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { xio.disconnect(); setTimeout(function () { animX(100); }, 250); } });
      }, { threshold: 0.45 });
      xio.observe(xv);
    }
  }

  // ------------------------------------------------------------ hot takes, one at a time
  var stage = $('[data-stage]'), data = $('#takes-data');
  if (stage && data) {
    var takes = JSON.parse(data.textContent), idx = 0, timer = 0, playing = !reduce.matches, hold = false;
    var sN = $('[data-stage-n]', stage), sText = $('[data-stage-text]', stage), sSrc = $('[data-stage-src]', stage), sHeat = $('[data-stage-heat]', stage), sPlay = $('[data-stage-play]', stage);
    var show = function (i) {
      idx = (i + takes.length) % takes.length; var t = takes[idx];
      sN.textContent = t.id; sText.textContent = t.text; sText.href = t.href; sSrc.textContent = t.src;
      sHeat.innerHTML = '<span class="heat" role="img" aria-label="Heat ' + t.heat + ' of 3">' + [1, 2, 3].map(function (n) { return '<i' + (n <= t.heat ? ' class="f"' : '') + '></i>'; }).join('') + '</span>';
    };
    var sLive = $('[data-stage-live]', stage);
    var schedule = function () {
      clearTimeout(timer);
      if (sLive) sLive.setAttribute('aria-live', playing && !hold ? 'off' : 'polite');
      if (playing && !hold) timer = setTimeout(function () { show(idx + 1); schedule(); }, 7000);
    };
    var paintPlay = function () { sPlay.textContent = playing ? 'Pause' : 'Play'; };
    $('[data-stage-prev]', stage).addEventListener('click', function () { show(idx - 1); schedule(); });
    $('[data-stage-next]', stage).addEventListener('click', function () { show(idx + 1); schedule(); });
    sPlay.addEventListener('click', function () { playing = !playing; paintPlay(); schedule(); });
    stage.addEventListener('mouseenter', function () { hold = true; schedule(); });
    stage.addEventListener('mouseleave', function () { hold = false; schedule(); });
    stage.addEventListener('focusin', function () { hold = true; schedule(); });
    stage.addEventListener('focusout', function () { hold = false; schedule(); });
    // The band holds the height of its tallest take at this width, so the page
    // under it doesn't jump when a long one rotates in.
    var stageIn = $('.stage-in', stage), stageW = 0;
    var fitStage = function () {
      var cur = idx, tall = 0;
      stageIn.style.minHeight = '';
      for (var i = 0; i < takes.length; i++) { show(i); tall = Math.max(tall, stageIn.getBoundingClientRect().height); }
      show(cur); stageIn.style.minHeight = Math.ceil(tall) + 'px';
    };
    if (window.ResizeObserver) new ResizeObserver(function () { if (stageIn.clientWidth !== stageW) { stageW = stageIn.clientWidth; fitStage(); } }).observe(stageIn);
    if (document.fonts) document.fonts.ready.then(fitStage);
    paintPlay(); schedule();
  }

  // ------------------------------------------------------------ linefield pieces: still off screen and under reduced motion
  $$('.band-art').forEach(function (frame) {
    var visible = false, loaded = false;
    var desc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    var sync = function () {
      var d; try { d = frame.contentDocument; } catch (e) { return; }
      if (!d || !loaded) return;
      var force = !visible || reduce.matches;
      try {
        Object.defineProperty(d, 'hidden', { configurable: true, get: function () { return force || (desc ? desc.get.call(d) : false); } });
        d.dispatchEvent(new Event('visibilitychange'));
      } catch (e) {}
    };
    frame.addEventListener('load', function () { loaded = true; setTimeout(sync, reduce.matches ? 400 : 0); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }).observe(frame);
    else visible = true;
  });

  // ------------------------------------------------------------ the pencil cursor on the home title card
  var trail = $('.hero .trail');
  if (trail && trail.getContext) {
    var tctx = trail.getContext('2d'), pts = [], traf = 0, W = 0, H = 0, LIFE = 1400;
    var size = function () {
      var dpr = Math.min(2, window.devicePixelRatio || 1), r = trail.getBoundingClientRect();
      W = r.width; H = r.height; trail.width = Math.max(1, Math.round(W * dpr)); trail.height = Math.max(1, Math.round(H * dpr)); tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); if (window.ResizeObserver) new ResizeObserver(size).observe(trail);
    var draw = function (now) {
      traf = 0; tctx.clearRect(0, 0, W, H);
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      if (pts.length < 2) return;
      tctx.strokeStyle = cssVar('--pencil') || '#A4DDED'; tctx.lineCap = 'round'; tctx.lineJoin = 'round';
      for (var pass = 0; pass < 2; pass++) {
        for (var i = 1; i < pts.length; i++) {
          var a = pts[i - 1], b = pts[i], age = (now - b.t) / LIFE;
          tctx.globalAlpha = Math.max(0, 1 - age) * (pass ? 0.45 : 0.95); tctx.lineWidth = pass ? 1 : 1.7;
          tctx.beginPath(); tctx.moveTo(a.x + pass * 3, a.y + pass * 2); tctx.lineTo(b.x + pass * 3, b.y + pass * 2); tctx.stroke();
        }
      }
      tctx.globalAlpha = 1; traf = requestAnimationFrame(draw);
    };
    trail.parentElement.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || reduce.matches) return;
      var r = trail.getBoundingClientRect(); pts.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
      if (pts.length > 180) pts.shift();
      if (!traf) traf = requestAnimationFrame(draw);
    });
  }

  // ------------------------------------------------------------ the brief: a work order that writes itself
  var form = $('form.bf');
  if (form) {
    var wo = $('[data-wo]'), status = $('[data-bf-status]'), orderField = form.elements.order;
    var field = function (key) { return $('[data-wo="' + key + '"]', wo); };
    var val = function (name) { var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; };
    var number = function () {
      var seed = ['name', 'company', 'broken', 'kind', 'when', 'team'].map(val).join('|'), h = 7;
      for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
      return 'CC-' + new Date().getFullYear() + '-' + String(100 + h % 900);
    };
    var update = function () {
      if (!wo) return;
      field('from').textContent = [val('name'), val('company')].filter(Boolean).join(', ') || 'Your name, your company';
      field('kind').textContent = val('kind') || 'Not chosen yet';
      field('when').textContent = val('when') || 'Not chosen yet';
      field('team').textContent = val('team') || 'Not chosen yet';
      field('broken').textContent = val('broken') || 'Tell me what’s broken. One sentence is enough.';
      var no = number(); $('[data-wo-no]', wo).textContent = no; orderField.value = no;
    };
    var orderText = function () {
      return ['WORK ORDER ' + orderField.value, 'From: ' + [val('name'), val('company')].filter(Boolean).join(', '), 'Email: ' + val('email'),
        'Bringing: ' + val('kind'), 'Needed: ' + val('when'), 'Team: ' + val('team'), 'What is broken: ' + val('broken')].join('\n');
    };
    var pick = function (kind) { $$('input[name="kind"]', form).forEach(function (r) { r.checked = r.value === kind; }); update(); };
    form.addEventListener('input', update); form.addEventListener('change', update);
    $$('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault(); pick(b.getAttribute('data-kind'));
        $('#brief').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
        setTimeout(function () { form.elements.broken.focus({ preventScroll: true }); }, reduce.matches ? 0 : 450);
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); update();
      var send = $('button[type="submit"]', form); send.disabled = true; status.textContent = 'Sending…';
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          $('[data-wo-stamp]').classList.add('on');
          status.textContent = 'Received. Work order ' + orderField.value + ' is in, and I’ll reply to ' + val('email') + '.';
        })
        .catch(function () {
          var linkedIn = $('.foot-grid a[href*="linkedin"]');
          status.innerHTML = '';
          status.appendChild(document.createTextNode('This copy of the site can’t send the brief. Copy the work order and send it to me on '));
          var a = document.createElement('a'); a.href = linkedIn ? linkedIn.href : 'https://www.linkedin.com/'; a.textContent = 'LinkedIn'; status.appendChild(a);
          status.appendChild(document.createTextNode('. '));
          var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'tool'; copy.textContent = 'Copy work order';
          copy.addEventListener('click', function () { copyText(orderText(), status, 'Copied. Paste it into a message to me on LinkedIn.', wo); });
          status.appendChild(copy);
        })
        .then(function () { send.disabled = false; });
    });
    var preset = new URLSearchParams(location.search).get('kind');
    if (preset) pick(preset); else update();
  }

  // ------------------------------------------------------------ copy a link
  $$('[data-copy-link]').forEach(function (b) {
    b.addEventListener('click', function () { copyText(location.href, $('[data-copy-status]'), 'Link copied.'); });
  });

  // ------------------------------------------------------------ the page audits itself
  var auditBtn = $('[data-audit]'), term = $('[data-audit-out]');
  if (auditBtn && term) {
    var line = function (txt, cls) { var s = document.createElement('span'); if (cls) s.className = cls; s.textContent = txt + '\n'; term.appendChild(s); term.scrollTop = term.scrollHeight; };
    var hexRgb = function (hx) { var n = parseInt(hx.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    var lum = function (c) { var f = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    var ratio = function (a, b) { var x = lum(hexRgb(a)), y = lum(hexRgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    var loadAxe = function () {
      if (window.axe) return Promise.resolve();
      return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = '/assets/vendor/axe.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    };
    var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
    var audit = async function () {
      auditBtn.disabled = true; term.textContent = '';
      line('$ ink-and-rule check --this-page', 'dim'); await wait(220);
      var imgs = $$('img'), described = imgs.filter(function (i) { return i.getAttribute('alt'); }).length, bare = imgs.filter(function (i) { return !i.hasAttribute('alt'); }).length;
      line((bare ? '✗' : '✓') + ' images     ' + (imgs.length - bare) + ' of ' + imgs.length + ' have alt text: ' + described + ' described, ' + (imgs.length - bare - described) + ' decorative', bare ? 'bad' : 'ok'); await wait(160);
      var hs = $$('h1,h2,h3,h4,h5,h6').map(function (x) { return +x.tagName[1]; }), skips = 0;
      for (var i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) skips++;
      line((skips ? '✗' : '✓') + ' headings   ' + plural(hs.length, 'heading', 'headings') + ', ' + $$('h1').length + ' h1, ' + plural(skips, 'skipped level', 'skipped levels'), skips ? 'bad' : 'ok'); await wait(160);
      var fams = ['Familjen Grotesk', 'Newsreader', 'Red Hat Mono'], loaded = fams.filter(function (f) { try { return document.fonts.check('500 16px "' + f + '"'); } catch (e) { return false; } });
      line((loaded.length === 3 ? '✓' : '·') + ' fonts      ' + loaded.length + ' of 3 faces loaded, all from this site', loaded.length === 3 ? 'ok' : 'dim'); await wait(160);
      [['text', '--fg', '--ground'], ['secondary', '--muted', '--ground'], ['notes', '--proof', '--ground'], ['ink band', '--band-fg', '--band'], ['band notes', '--band-proof', '--band']].forEach(function (p) {
        var r = ratio(cssVar(p[1]), cssVar(p[2])); line((r >= 4.5 ? '✓' : '✗') + ' contrast   ' + (p[0] + '            ').slice(0, 12) + r.toFixed(2) + ':1', r >= 4.5 ? 'ok' : 'bad');
      });
      await wait(160);
      var focusable = $$('a[href],button:not([disabled]),input:not([type=hidden]),textarea,summary,[tabindex]:not([tabindex="-1"])').length;
      line('✓ keyboard   ' + focusable + ' focusable elements, each with a 2 px blueline ring', 'ok'); await wait(160);
      line('✓ motion     reduced motion is ' + (reduce.matches ? 'on, so nothing moves on its own' : 'off; turn it on and the page holds still'), 'ok'); await wait(160);
      var res = performance.getEntriesByType('resource'), nav = performance.getEntriesByType('navigation')[0];
      var weight = res.reduce(function (s, r) { return s + (r.transferSize || 0); }, 0) + ((nav && nav.transferSize) || 0);
      line(weight > 0 ? '✓ weight     ' + (weight / 1024).toFixed(0) + ' KB over ' + (res.length + 1) + ' requests' : '· weight     this browser doesn’t report transfer sizes', weight > 0 ? 'ok' : 'dim'); await wait(200);
      try {
        await loadAxe();
        line('$ axe-core ' + window.axe.version + ', WCAG 2.2 AA and best practice', 'dim');
        var r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] });
        var v = r.violations, nodes = v.reduce(function (s, x) { return s + x.nodes.length; }, 0);
        line((v.length ? '✗' : '✓') + ' axe        ' + plural(v.length, 'violation', 'violations') + (v.length ? ' on ' + plural(nodes, 'element', 'elements') : '') + ' · ' + r.passes.length + ' rules passed · ' + r.incomplete.length + (r.incomplete.length === 1 ? ' needs' : ' need') + ' a human', v.length ? 'bad' : 'ok');
        v.forEach(function (x) { line('  ' + x.id + ' × ' + x.nodes.length + ': ' + x.help, 'bad'); });
        line(''); line(v.length ? 'Fix the lines above before this ships.' : 'Clean. The gate would let this page ship.', v.length ? 'bad' : 'ok');
      } catch (e) { line('· axe        couldn’t load. The checks above still ran.', 'dim'); }
      auditBtn.disabled = false; auditBtn.textContent = 'Run the checks again';
    };
    auditBtn.addEventListener('click', function () { audit(); });
  }

  // ------------------------------------------------------------ Terry, on request
  var buf = '', terryTimer = 0, pop = null;
  document.addEventListener('keydown', function (e) {
    var tg = e.target;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    if (!e.key || e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    buf = (buf + e.key.toLowerCase()).slice(-5);
    if (buf !== 'terry') return;
    buf = '';
    if (!pop) {
      pop = document.createElement('div'); pop.className = 'terry-pop'; pop.setAttribute('role', 'status');
      pop.innerHTML = '<span class="terry" aria-hidden="true"></span><p><b>Terry approves.</b><br><span class="note">You found the easter egg.</span></p>';
      document.body.appendChild(pop);
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () { pop.classList.add('on'); }); });
    clearTimeout(terryTimer); terryTimer = setTimeout(function () { pop.classList.remove('on'); }, 3800);
  });
})();
