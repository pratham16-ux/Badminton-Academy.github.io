(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header, progress, back-to-top, hero parallax */
  var hd = $('.hd'), bar = $('#bar'), top = $('.top'), heroImg = $('.hero-bg');
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    if (hd) hd.classList.toggle('on', y > 8);
    if (bar) bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (top) top.classList.toggle('show', y > 700);
    if (heroImg && !reduce && y < window.innerHeight) heroImg.style.translate = '0 ' + (y * 0.12) + 'px';
    $$('.tl').forEach(function (t) {
      var r = t.getBoundingClientRect(), p = (window.innerHeight * 0.6 - r.top) / r.height;
      t.style.setProperty('--p', Math.max(0, Math.min(1, p)) * 100 + '%');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* mobile overlay menu */
  var bg = $('.burger'), ov = $('.ov');
  function toggle(open) {
    bg.classList.toggle('x', open); ov.classList.toggle('open', open);
    bg.setAttribute('aria-expanded', open); document.body.classList.toggle('lock', open);
  }
  if (bg && ov) {
    bg.addEventListener('click', function () { toggle(!ov.classList.contains('open')); });
    $$('a', ov).forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024) toggle(false); });
  }

  /* reveal on scroll + counters + bars */
  function count(el) {
    var to = parseFloat(el.dataset.to), dec = (el.dataset.to.split('.')[1] || '').length, suf = el.dataset.s || '', t0 = null, dur = 1800;
    function f(ts) {
      if (!t0) t0 = ts; var p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * e).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suf;
      if (p < 1) requestAnimationFrame(f);
    }
    reduce ? (el.textContent = to + suf) : requestAnimationFrame(f);
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-to]', e.target).forEach(count);
      if (e.target.hasAttribute('data-to')) count(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-a],.bar,.stat').forEach(function (el) { io.observe(el); });

  /* button ripple */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.btn'); if (!b) return;
    var r = b.getBoundingClientRect(), s = document.createElement('span'), d = Math.max(r.width, r.height);
    s.className = 'rp'; s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(s); setTimeout(function () { s.remove(); }, 700);
  });

  /* tabs */
  $$('[data-tabs]').forEach(function (w) {
    var bs = $$('[role=tab]', w), ps = $$('.pan', w);
    bs.forEach(function (b, i) {
      b.addEventListener('click', function () {
        bs.forEach(function (x, j) { x.setAttribute('aria-selected', j === i); ps[j].classList.toggle('on', j === i); });
      });
    });
  });

  /* faq */
  $$('.fq button').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.closest('.fq'), open = !f.classList.contains('open');
      $$('.fq', f.parentElement).forEach(function (x) { x.classList.remove('open'); $('button', x).setAttribute('aria-expanded', 'false'); });
      f.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
    });
  });

  /* testimonial slider */
  $$('[data-slider]').forEach(function (s) {
    var tk = $('.tk', s), n = $$('.sd', s).length, i = 0, dots = $('.dots', s.parentElement), timer, sx = null;
    for (var k = 0; k < n; k++) { (function (k) { var d = document.createElement('button'); d.setAttribute('aria-label', 'Go to review ' + (k + 1)); d.addEventListener('click', function () { go(k); auto(); }); dots.appendChild(d); })(k); }
    function go(x) { i = (x + n) % n; tk.style.transform = 'translateX(' + (-100 * i) + '%)'; $$('button', dots).forEach(function (d, j) { d.classList.toggle('on', j === i); }); }
    function auto() { clearInterval(timer); if (!reduce) timer = setInterval(function () { go(i + 1); }, 6000); }
    s.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    s.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1)); auto(); } sx = null; });
    go(0); auto();
  });

  /* validation: letters-only name (max 16), 10-digit Indian mobile (6-9), strict email */
  var RX = { name: /^[A-Za-z]+(?: [A-Za-z]+)*$/, phone: /^[6-9]\d{9}$/, email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/ };
  var MSG = { name: 'Use letters only, up to 16 characters.', phone: 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.', email: 'Enter a valid email like name@example.com.', req: 'This field is required.' };
  function check(inp) {
    var t = inp.dataset.v, v = inp.value.trim(), fg = inp.closest('.fg'), ok = true;
    if (t === 'name') ok = v.length > 0 && v.length <= 16 && RX.name.test(v);
    else if (t === 'phone') ok = RX.phone.test(v);
    else if (t === 'email') ok = RX.email.test(v);
    else if (t === 'req') ok = v.length > 0;
    fg.classList.toggle('bad', !ok);
    var er = $('.err', fg); if (er) er.textContent = v.length ? MSG[t] : MSG.req;
    return ok;
  }
  $$('form[data-form]').forEach(function (f) {
    var fields = $$('[data-v]', f);
    fields.forEach(function (i) {
      i.addEventListener('input', function () {
        if (i.dataset.v === 'phone') i.value = i.value.replace(/\D/g, '').slice(0, 10);
        if (i.dataset.v === 'name') i.value = i.value.replace(/[^A-Za-z ]/g, '').slice(0, 16);
        if (i.closest('.fg').classList.contains('bad')) check(i);
      });
      i.addEventListener('blur', function () { if (i.value) check(i); });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var all = fields.map(check).every(Boolean), ok = $('.ok', f.parentElement) || $('.ok', f);
      if (!all) { var b = $('.bad input,.bad select,.bad textarea', f); if (b) b.focus(); return; }
      f.reset(); if (ok) { ok.classList.add('show'); setTimeout(function () { ok.classList.remove('show'); }, 7000); }
    });
  });

  /* hero shuttle rally (canvas) */
  var cv = $('.hero canvas');
  if (cv && !reduce) {
    var cx = cv.getContext('2d'), W, H, dpr = Math.min(window.devicePixelRatio || 1, 2), t = 0, dir = 1, pause = 0, trail = [], vis = true, last = 0;
    function size() { var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }, { threshold: 0 }).observe(cv);
    function pt(p) {
      var a = dir > 0 ? [W * 0.08, H * 0.78] : [W * 0.92, H * 0.78], b = dir > 0 ? [W * 0.92, H * 0.78] : [W * 0.08, H * 0.78], c = [W * 0.5, H * 0.02], q = 1 - p;
      return [q * q * a[0] + 2 * q * p * c[0] + p * p * b[0], q * q * a[1] + 2 * q * p * c[1] + p * p * b[1]];
    }
    function draw(p) {
      var s = Math.max(10, Math.min(W, 1400) / 55), a = pt(Math.max(0, p - 0.01)), b = pt(Math.min(1, p + 0.01)), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      cx.save(); cx.translate(b[0], b[1]); cx.rotate(ang);
      cx.fillStyle = 'rgba(247,248,244,.95)'; cx.beginPath(); cx.moveTo(0, -s * .2); cx.lineTo(-s * 2.2, -s * .85); cx.lineTo(-s * 2.2, s * .85); cx.lineTo(0, s * .2); cx.closePath(); cx.fill();
      cx.strokeStyle = 'rgba(120,140,128,.7)'; cx.lineWidth = 1; for (var k = -3; k <= 3; k++) { cx.beginPath(); cx.moveTo(0, k * s * .05); cx.lineTo(-s * 2.2, k * s * .28); cx.stroke(); }
      cx.fillStyle = '#E8C77A'; cx.beginPath(); cx.arc(0, 0, s * .3, 0, 7); cx.fill(); cx.restore();
    }
    function frame(ts) {
      requestAnimationFrame(frame);
      if (!vis) return; var dt = Math.min((ts - last) / 1000, 0.05); last = ts;
      cx.clearRect(0, 0, W, H);
      if (pause > 0) { pause -= dt; trail = trail.slice(2); }
      else { t += dt / 2.1; if (t >= 1) { t = 0; dir *= -1; pause = 0.35; trail = []; } else { var p = pt(t); trail.push(p); if (trail.length > 38) trail.shift(); } }
      for (var i = 1; i < trail.length; i++) { cx.strokeStyle = 'rgba(232,199,122,' + (i / trail.length * .55) + ')'; cx.lineWidth = i / trail.length * 5; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(trail[i - 1][0], trail[i - 1][1]); cx.lineTo(trail[i][0], trail[i][1]); cx.stroke(); }
      if (pause <= 0) draw(t);
    }
    requestAnimationFrame(frame);
  }
})();
/* ================= v2 enhancements ================= */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* sliding gold nav indicator */
  var nav = $('.nav'), ind = $('.nav-i');
  if (nav && ind) {
    var links = $$('a', nav), curA = $('a.cur', nav);
    var place = function (a, instant) {
      if (!a) { ind.style.opacity = 0; return; }
      if (instant) ind.style.transition = 'none';
      ind.style.opacity = 1; ind.style.width = a.offsetWidth + 'px'; ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
      if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
    };
    links.forEach(function (a) { a.addEventListener('mouseenter', function () { place(a); }); a.addEventListener('focus', function () { place(a); }); });
    nav.addEventListener('mouseleave', function () { place(curA); });
    nav.addEventListener('focusout', function () { place(curA); });
    var init = function () { place(curA, true); };
    init(); window.addEventListener('resize', init);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  }

  /* overlay aria-hidden follows state */
  var ov = $('.ov');
  if (ov) new MutationObserver(function () { ov.setAttribute('aria-hidden', ov.classList.contains('open') ? 'false' : 'true'); }).observe(ov, { attributes: true, attributeFilter: ['class'] });

  /* broken image fallback */
  $$('img').forEach(function (im) {
    function bad() { var p = im.closest('.img,.ph'); if (p) p.classList.add('broken'); }
    im.addEventListener('error', bad);
    if (im.complete && im.naturalWidth === 0 && im.currentSrc) bad();
  });

  if (reduce) return;

  /* floating shuttles in hero */
  $$('.hero').forEach(function (h) {
    var fx = document.createElement('div'); fx.className = 'fx'; fx.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 14; i++) {
      var d = document.createElement('i');
      d.style.cssText = '--x:' + Math.round(Math.random() * 100) + '%;--s:' + (6 + Math.round(Math.random() * 10)) + 'px;--t:' + (9 + Math.round(Math.random() * 9)) + 's;--dl:-' + Math.round(Math.random() * 14) + 's;--dx:' + (Math.round(Math.random() * 160) - 80) + 'px';
      fx.appendChild(d);
    }
    h.insertBefore(fx, h.querySelector('.wrap'));
  });

  if (!fine) return;

  /* 3D tilt on cards */
  $$('.card,.plan,.coach').forEach(function (el) {
    el.classList.add('tilt');
    el.addEventListener('mousemove', function (e) {
      if (!el.classList.contains('in')) return;
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = 'transform .12s, box-shadow .5s, border-color .4s';
      el.style.transform = 'perspective(900px) rotateX(' + (-y * 7) + 'deg) rotateY(' + (x * 9) + 'deg) translateY(-8px)';
    });
    el.addEventListener('mouseleave', function () { el.style.transition = ''; el.style.transform = ''; });
  });

  /* magnetic gold buttons */
  $$('.btn-g').forEach(function (b) {
    b.addEventListener('mousemove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.18) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.28) + 'px';
    });
    b.addEventListener('mouseleave', function () { b.style.translate = ''; });
  });

  /* cursor spotlight on dark blocks */
  $$('.s.dark,.cta-b').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
})();