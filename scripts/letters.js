/* Throwable letters. No dependencies.
   Markup: <div data-letters="blog." data-max="150" data-height-wide="260" data-height-narrow="190"
                [data-start-on-visible] [data-align="center"]><span class="lt" aria-hidden="true">b</span>...</div>
   The server-rendered markup is a static, readable layout; mount() enhances it. */
(function () {
  'use strict';

  function mount(el, opts) {
    var ds = el.dataset;
    var o = {
      maxSize: +ds.max || 150,
      heightWide: +ds.heightWide || 260,
      heightNarrow: +ds.heightNarrow || 190,
      startOnVisible: ds.startOnVisible !== undefined,
      align: ds.align || 'left'
    };
    for (var k in opts) o[k] = opts[k];

    var chars = (el.getAttribute('data-letters') || el.textContent || '').split('');
    var spans = [].slice.call(el.querySelectorAll('.lt'));
    if (spans.length !== chars.length) {
      spans.forEach(function (s) { s.remove(); });
      spans = chars.map(function (c) {
        var s = document.createElement('span');
        s.className = 'lt' + (c === '.' ? ' dot' : '');
        s.setAttribute('aria-hidden', 'true');
        s.textContent = c;
        el.appendChild(s);
        return s;
      });
    }
    var reduce = false;
    try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var bodies = [], d = null, boxH = 0, drag = -1, dragId = null, off = { x: 0, y: 0 }, last = { x: 0, y: 0 };
    var sleep = 0, raf = 0, active = false, io, ro;

    el.classList.add('on');

    function dims() {
      var W = el.clientWidth, s = Math.max(64, Math.min(o.maxSize, W / 4.4));
      return { W: W, H: boxH, s: s, w: s * 0.66, h: s * 0.92 };
    }
    function render() {
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        spans[i].style.transform = 'translate3d(' + (b.x - d.w / 2).toFixed(2) + 'px,' + (b.y - d.h / 2).toFixed(2) + 'px,0) rotate(' + b.rot.toFixed(2) + 'deg)';
      }
    }
    function wake() { sleep = 0; if (!raf) raf = requestAnimationFrame(loop); }
    function fit() {
      var W = el.clientWidth;
      if (!W) return;
      var h = W < 640 ? o.heightNarrow : o.heightWide;
      if (h !== boxH) { boxH = h; el.style.height = h + 'px'; }
      d = dims();
      spans.forEach(function (s) { s.style.fontSize = d.s + 'px'; s.style.width = d.w + 'px'; s.style.height = d.h + 'px'; });
      bodies.forEach(function (b) { b.x = Math.max(d.w / 2, Math.min(d.W - d.w / 2, b.x)); });
      render();
      wake();
    }
    function init(settled) {
      d = dims();
      var n = chars.length;
      var x0 = o.align === 'center' ? d.W / 2 - (n - 1) * d.w * 0.52 : d.w / 2 + 4;
      var gap = o.align === 'center' ? 1.04 : 1.02;
      bodies = chars.map(function (c, i) {
        return {
          x: x0 + i * d.w * gap,
          y: settled ? d.H - d.h / 2 : -d.h - i * 60 - Math.random() * 40,
          vx: settled ? 0 : (Math.random() - 0.5) * 2, vy: 0,
          rot: settled ? 0 : (Math.random() - 0.5) * 24, vr: 0
        };
      });
      render();
      wake();
    }
    function pt(e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

    function onDown(i, e) {
      if (!active || (e.button !== undefined && e.button > 0)) return;
      e.preventDefault();
      try { spans[i].setPointerCapture(e.pointerId); } catch (err) {}
      var p = pt(e), b = bodies[i];
      drag = i; dragId = e.pointerId; off = { x: p.x - b.x, y: p.y - b.y }; last = p; b.vx = 0; b.vy = 0;
      spans[i].classList.add('grab');
      wake();
    }
    function onMove(e) {
      if (drag < 0 || e.pointerId !== dragId) return;
      var p = pt(e), b = bodies[drag];
      b.vx = (p.x - last.x) * 0.9; b.vy = (p.y - last.y) * 0.9; b.vr = b.vx * 0.6;
      b.x = Math.max(d.w / 2, Math.min(d.W - d.w / 2, p.x - off.x));
      b.y = Math.min(d.H - d.h / 2, p.y - off.y);
      last = p; sleep = 0;
    }
    function onUp(e) {
      if (drag < 0 || (e && e.pointerId !== dragId)) return;
      var b = bodies[drag], cap = 45;
      b.vx = Math.max(-cap, Math.min(cap, b.vx)); b.vy = Math.max(-cap, Math.min(cap, b.vy));
      spans[drag].classList.remove('grab');
      drag = -1; dragId = null;
      wake();
    }

    function step() {
      var bs = bodies, energy = 0, i, j;
      bs.forEach(function (b, i) {
        if (i === drag) return;
        b.vy += 0.75; b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.vx *= 0.995; b.vr *= 0.97;
        var floor = d.H - d.h / 2;
        if (b.y > floor) { b.y = floor; b.vy = b.vy > 2 ? -b.vy * 0.42 : 0; b.vx *= 0.88; b.vr = b.vx * 0.9; b.rot *= 0.94; }
        if (b.x < d.w / 2) { b.x = d.w / 2; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x > d.W - d.w / 2) { b.x = d.W - d.w / 2; b.vx = -Math.abs(b.vx) * 0.5; }
      });
      var R = d.w * 0.5;
      for (i = 0; i < bs.length; i++) {
        for (j = i + 1; j < bs.length; j++) {
          var a = bs[i], c = bs[j], dx = c.x - a.x, dy = c.y - a.y, dist = Math.sqrt(dx * dx + dy * dy) || 0.01, min = R * 2;
          if (dist < min) {
            var nx = dx / dist, ny = dy / dist, ov = min - dist, aFix = i === drag, cFix = j === drag;
            if (aFix) { c.x += nx * ov; c.y += ny * ov; }
            else if (cFix) { a.x -= nx * ov; a.y -= ny * ov; }
            else { a.x -= nx * ov / 2; a.y -= ny * ov / 2; c.x += nx * ov / 2; c.y += ny * ov / 2; }
            var vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
            if (vn < 0) {
              var jm = -1.3 * vn / 2;
              if (!aFix) { a.vx -= jm * nx; a.vy -= jm * ny; a.vr -= jm * 0.8; }
              if (!cFix) { c.vx += jm * nx; c.vy += jm * ny; c.vr += jm * 0.8; }
            }
          }
        }
      }
      bs.forEach(function (b) { energy += Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vr); });
      sleep = energy < 0.3 && drag < 0 ? sleep + 1 : 0;
    }
    function loop() {
      raf = 0;
      if (!d || !bodies.length) return;
      step();
      render();
      if (sleep > 30 && drag < 0) return; // at rest: stop the loop entirely
      raf = requestAnimationFrame(loop);
    }

    function start() { if (active) return; active = true; init(reduce); }

    spans.forEach(function (s, i) { s.addEventListener('pointerdown', function (e) { onDown(i, e); }); });
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    // Show the settled word straight away, then (unless reduced motion) drop it.
    boxH = el.clientHeight; fit(); init(true);
    if (reduce) { active = true; }
    else if (o.startOnVisible && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { start(); io.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(el);
    } else start();

    if ('ResizeObserver' in window) { ro = new ResizeObserver(fit); ro.observe(el); }
    else window.addEventListener('resize', fit);

    return {
      destroy: function () {
        cancelAnimationFrame(raf); raf = 0;
        if (io) io.disconnect(); if (ro) ro.disconnect(); window.removeEventListener('resize', fit);
        el.classList.remove('on');
      }
    };
  }

  window.Letters = { mount: mount };
  [].forEach.call(document.querySelectorAll('[data-letters]'), function (el) { mount(el); });
})();
