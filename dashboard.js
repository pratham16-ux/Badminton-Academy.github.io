/* Stackly shared auth + data layer (browser localStorage demo backend) */
var SB = (function () {
  'use strict';
  var K = { u: 'sb_users', s: 'sb_session', d: 'sb_shared', m: 'sb_mem_' };
  var PRICE = { 'Junior Foundation': 2500, 'Teen Performance': 3500, 'Adult Fitness': 3000, 'Elite Squad': 5500 };
  function get(k, f) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function iso(off) { var d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function hash(s) {
    var subtle = window.crypto && window.crypto.subtle;
    if (!subtle) return Promise.resolve('p:' + btoa(unescape(encodeURIComponent('stackly:' + s))));
    return subtle.digest('SHA-256', new TextEncoder().encode('stackly:' + s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function invoice(plan, label, due, paid) {
    return { id: uid(), label: plan + ' · ' + label, amt: PRICE[plan] || 3000, due: due, paid: !!paid, paidOn: paid ? due : null, ref: paid ? 'SBA' + Math.floor(100000 + Math.random() * 900000) : null };
  }
  function monthName(off) { var d = new Date(); d.setMonth(d.getMonth() + off); return d.toLocaleDateString('en-IN', { month: 'long' }); }

  function init() {
    if (get(K.u, null)) return Promise.resolve();
    return Promise.all([hash('Member@123'), hash('Coach@123')]).then(function (h) {
      var m = 'member@stackly.in', r = 'riya@example.com', k = 'kabir@example.com', e = 'meera@example.com', c = 'coach@stackly.in';
      set(K.u, [
        { name: 'Aarav Sharma', email: m, phone: '9845000001', role: 'member', plan: 'Teen Performance', level: 'Intermediate', goal: 'Win my first district tournament', pass: h[0], joined: iso(-60) },
        { name: 'Riya Nair', email: r, phone: '9845000002', role: 'member', plan: 'Junior Foundation', level: 'Beginner', goal: '', pass: h[0], joined: iso(-30) },
        { name: 'Kabir Rao', email: k, phone: '9845000003', role: 'member', plan: 'Adult Fitness', level: 'Intermediate', goal: 'Get fitter and play doubles', pass: h[0], joined: iso(-45) },
        { name: 'Meera Iyer', email: e, phone: '9845000004', role: 'member', plan: 'Elite Squad', level: 'Advanced', goal: 'State ranking', pass: h[0], joined: iso(-90) },
        { name: 'Arjun Menon', email: c, phone: '9845000005', role: 'coach', specialty: 'Singles and footwork', bio: 'BWF-certified coach.', pass: h[1], joined: iso(-400) }
      ]);
      set(K.d, {
        slots: [
          { id: 's1', title: 'Footwork drills', level: 'Intermediate', coach: c, coachName: 'Arjun Menon', date: iso(-3), time: '17:00', court: 2, cap: 8, booked: [m, k, e] },
          { id: 's2', title: 'Junior rally basics', level: 'Beginner', coach: c, coachName: 'Arjun Menon', date: iso(-1), time: '18:30', court: 4, cap: 10, booked: [r] },
          { id: 's3', title: 'Morning singles', level: 'Intermediate', coach: c, coachName: 'Arjun Menon', date: iso(1), time: '06:30', court: 1, cap: 6, booked: [m, e] },
          { id: 's4', title: 'Doubles tactics', level: 'Advanced', coach: c, coachName: 'Arjun Menon', date: iso(2), time: '17:30', court: 3, cap: 8, booked: [e, k] },
          { id: 's5', title: 'Beginner clinic', level: 'Beginner', coach: c, coachName: 'Arjun Menon', date: iso(4), time: '16:00', court: 5, cap: 10, booked: [r] },
          { id: 's6', title: 'Match play', level: 'Intermediate', coach: c, coachName: 'Arjun Menon', date: iso(5), time: '19:00', court: 2, cap: 6, booked: [m, k] }
        ],
        att: { s1: (function () { var o = {}; o[m] = true; o[k] = true; o[e] = false; return o; })(), s2: (function () { var o = {}; o[r] = true; return o; })() },
        notes: (function () { var o = {}; o[m] = [{ id: uid(), by: 'Arjun Menon', date: iso(-3), text: 'Good split-step timing. Work on recovering to the centre after net shots.' }]; return o; })(),
        ann: [{ id: uid(), title: 'Court 3 maintenance', text: 'Court 3 is closed on Sunday morning for resurfacing. Sessions move to Court 4.', by: 'Arjun Menon', byEmail: c, date: iso(-1) }]
      });
      set(K.m + m, { invoices: [invoice('Teen Performance', monthName(0), iso(5), false), invoice('Teen Performance', monthName(-1), iso(-25), true)] });
    });
  }

  function users() { return get(K.u, []); }
  function find(email) { email = (email || '').trim().toLowerCase(); return users().filter(function (u) { return u.email === email; })[0] || null; }
  function pub(u) { if (!u) return null; var c = {}; for (var k in u) if (k !== 'pass') c[k] = u[k]; return c; }
  function sessionEmail() {
    try { var v = sessionStorage.getItem(K.s) || localStorage.getItem(K.s); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function session() { var e = sessionEmail(); return e ? pub(find(e)) : null; }
  function home(role) { return role === 'coach' ? 'coach.html' : 'member.html'; }

  function register(d) {
    var email = d.email.trim().toLowerCase();
    if (find(email)) return Promise.resolve({ ok: false, field: 'email', err: 'An account with this email already exists. Log in instead.' });
    return hash(d.password).then(function (h) {
      var u = { name: d.name.trim(), email: email, phone: d.phone, role: d.role, pass: h, joined: iso(0) };
      if (d.role === 'member') { u.plan = d.plan; u.level = d.level; u.goal = ''; } else { u.specialty = 'Badminton coaching'; u.bio = ''; }
      var all = users(); all.push(u);
      if (!set(K.u, all)) return { ok: false, err: 'Could not save your account. Check that browser storage is not blocked.' };
      if (d.role === 'member') set(K.m + email, { invoices: [invoice(d.plan, monthName(0), iso(7), false)] });
      return { ok: true };
    });
  }
  function login(email, pass, role, remember) {
    var u = find(email);
    if (!u) return Promise.resolve({ ok: false, err: 'No account found with this email. Check it or create an account.' });
    return hash(pass).then(function (h) {
      if (h !== u.pass) return { ok: false, err: 'Incorrect password. Try again.' };
      if (u.role !== role) return { ok: false, err: 'This is a ' + u.role + ' account. Switch to "' + (u.role === 'coach' ? 'Coach' : 'Member') + '" above to log in.' };
      try { localStorage.removeItem(K.s); sessionStorage.removeItem(K.s); } catch (e) {}
      try { (remember ? localStorage : sessionStorage).setItem(K.s, JSON.stringify(u.email)); } catch (e) { return { ok: false, err: 'Browser storage is blocked, so login cannot be saved.' }; }
      return { ok: true, user: pub(u) };
    });
  }
  function logout() { try { localStorage.removeItem(K.s); sessionStorage.removeItem(K.s); } catch (e) {} }
  function guard(role) {
    var u = session();
    if (!u) { location.replace('login.html'); return null; }
    if (u.role !== role) { location.replace(home(u.role)); return null; }
    return u;
  }
  function updateUser(email, patch) {
    var all = users();
    all.forEach(function (u) { if (u.email === email) for (var k in patch) u[k] = patch[k]; });
    return set(K.u, all);
  }
  function changePassword(email, cur, next) {
    var u = find(email);
    return Promise.all([hash(cur), hash(next)]).then(function (h) {
      if (h[0] !== u.pass) return { ok: false, err: 'Current password is incorrect.' };
      updateUser(email, { pass: h[1] }); return { ok: true };
    });
  }
  return {
    init: init, users: users, find: find, session: session, home: home, register: register, login: login, logout: logout, guard: guard,
    updateUser: updateUser, changePassword: changePassword, uid: uid, iso: iso, invoice: invoice, PRICE: PRICE,
    shared: function () { return get(K.d, { slots: [], att: {}, notes: {}, ann: [] }); },
    saveShared: function (d) { return set(K.d, d); },
    mem: function (e) { return get(K.m + e, { invoices: [] }); },
    saveMem: function (e, d) { return set(K.m + e, d); },
    flash: function (msg, email) { try { sessionStorage.setItem('sb_flash', JSON.stringify({ msg: msg, email: email || '' })); } catch (e) {} },
    takeFlash: function () { try { var f = sessionStorage.getItem('sb_flash'); sessionStorage.removeItem('sb_flash'); return f ? JSON.parse(f) : null; } catch (e) { return null; } }
  };
})();
/* Shared dashboard shell: layout, hash routing, toast, confirm dialog, helpers */
var SBUI = (function () {
  'use strict';
  var LOGO = 'https://wsrv.nl/?url=https://snabsolutions.in/wp-content/uploads/2026/02/stackly-snab-solutions.png&w=280&output=webp&q=85&fit=cover';
  function logo(cls) { return '<img class="lgo ' + (cls || 'lg-g') + '" src="' + LOGO + '" alt="Stackly" width="140" height="40">'; }
  var I = {
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a7 7 0 0 1 4 7"/>',
    check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    trophy: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"/>',
    wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    pct: '<path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I[n] + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtD(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function fmtT(t) { var p = t.split(':'), h = +p[0], ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + ':' + p[1] + ' ' + ap; }
  function money(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function initials(n) { return n.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function startOf(s) { return new Date(s.date + 'T' + s.time + ':00'); }
  function isPast(s) { return startOf(s).getTime() + 90 * 60000 < Date.now(); }
  function cmp(a, b) { return startOf(a) - startOf(b); }
  function download(name, text, mime) {
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain' }));
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  var tt;
  function toast(msg, kind) {
    var t = document.getElementById('toast'); t.textContent = msg; t.className = 'show ' + (kind || '');
    clearTimeout(tt); tt = setTimeout(function () { t.className = ''; }, 3200);
  }
  function confirmBox(title, msg, label, danger) {
    return new Promise(function (res) {
      var d = document.getElementById('dlg');
      if (!d.showModal) { res(window.confirm(title + '\n' + msg)); return; }
      d.querySelector('h3').textContent = title; d.querySelector('p').textContent = msg;
      var ok = d.querySelector('[value=ok]'); ok.textContent = label || 'Confirm'; ok.className = 'bt ' + (danger ? 'bt-d' : 'bt-p');
      d.addEventListener('close', function () { res(d.returnValue === 'ok'); }, { once: true });
      d.returnValue = ''; d.showModal();
    });
  }
  function kpi(ic, label, val, sub, tone) { return '<div class="k ' + (tone || '') + '"><span class="ki">' + icon(ic) + '</span><div><span class="kl">' + label + '</span><b>' + val + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>'; }
  function ring(p, label, sub) { p = Math.max(0, Math.min(100, p)); var c = 2 * Math.PI * 52; return '<div class="ring"><svg viewBox="0 0 120 120" role="img" aria-label="' + label + ' ' + p + ' percent"><circle cx="60" cy="60" r="52" class="rb"/><circle cx="60" cy="60" r="52" class="rf" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 60 60)"/></svg><div><b>' + p + '%</b><span>' + label + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>'; }
  function bars(items) { var mx = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1])); return '<div class="bars">' + items.map(function (i) { return '<div class="bc' + (i.now ? ' now' : '') + '"><span class="bv">' + i.v + '</span><i style="--h:' + (i.v / mx * 100) + '%"></i><span class="bl">' + i.l + '</span></div>'; }).join('') + '</div>'; }
  function pb(p) { return '<div class="pb" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><i style="--w:' + p + '%"></i></div>'; }
  function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  function table(cols, rows) {
    return '<div class="tw"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
      var c = r.c || r, a = r.s ? ' data-s="' + esc(r.s) + '"' : '';
      return '<tr' + a + '>' + c.map(function (x, i) { return '<td data-l="' + esc(cols[i]) + '">' + x + '</td>'; }).join('') + '</tr>' + (r.x ? '<tr class="xr"' + a + '><td colspan="' + cols.length + '">' + r.x + '</td></tr>' : '');
    }).join('') + '</tbody></table></div>';
  }
  function memberId(email) { var h = 7; for (var i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) % 90000; return 'SBA-' + (10000 + h); }
  function sw(key, label, desc, on) { return '<label class="sw"><span><b>' + label + '</b><small>' + desc + '</small></span><input type="checkbox" role="switch" data-chg="pref" data-k="' + key + '"' + (on ? ' checked' : '') + '><i aria-hidden="true"></i></label>'; }
  function prefAct(el, u, c) { var p = Object.assign({}, u.prefs || {}); p[el.dataset.k] = el.checked; SB.updateUser(u.email, { prefs: p }); c.toast('Preference saved.'); return false; }
  function on(u, k) { return (u.prefs || {})[k] !== false; }
  function dayTip(list) { var d = new Date(), n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); return list[n % list.length]; }
  function countUp(root) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    Array.prototype.forEach.call(root.querySelectorAll('.k b,.ring b'), function (el) {
      var m = el.textContent.trim().match(/^(₹?)([\d,]+)(%?)$/); if (!m) return;
      var to = +m[2].replace(/,/g, ''), pre = m[1], suf = m[3], t0 = null;
      function f(ts) { if (!t0) t0 = ts; var p = Math.min((ts - t0) / 850, 1), v = Math.round(to * (1 - Math.pow(1 - p, 3))); el.textContent = pre + v.toLocaleString('en-IN') + suf; if (p < 1) requestAnimationFrame(f); }
      el.textContent = pre + '0' + suf; requestAnimationFrame(f);
    });
  }
  function empty(msg, cta) { return '<div class="empty"><p>' + msg + '</p>' + (cta || '') + '</div>'; }

  function mount(cfg) {
    SB.init().then(function () {
      var u = SB.guard(cfg.role); if (!u) return;
      var app = document.getElementById('app'), cur = null;
      app.innerHTML =
        '<div class="dx"><aside class="sb"><a class="brand" href="index.html" aria-label="Stackly Badminton Academy home">' + logo('lg-g') + '</a>' +
        '<div class="me"><span class="ava" id="av"></span><div><b id="wn"></b><small>' + cfg.roleLabel + '</small></div></div>' +
        '<p class="sn-l">Menu</p><nav class="sn" aria-label="Dashboard">' + cfg.nav.map(function (n) { return '<a href="#' + n.id + '" data-id="' + n.id + '">' + icon(n.icon) + '<span>' + n.label + '</span></a>'; }).join('') + '</nav>' +
        '<div class="sb-f"><a href="index.html">' + icon('home') + '<span>Back to website</span></a><button type="button" data-out>' + icon('out') + '<span>Log out</span></button></div></aside>' +
        '<div class="mn"><header class="tb"><a class="tb-b" href="index.html" aria-label="Stackly Badminton Academy home">' + logo('lg-p') + '</a><div class="tb-t"><h1 id="ttl"></h1><p id="sub"></p></div><div class="tb-r"><div class="tb-u"><b id="un"></b><small>' + cfg.roleLabel + '</small></div><span class="ava" id="av2"></span><button type="button" class="bt bt-o" data-out aria-label="Log out">' + icon('out') + '<span>Log out</span></button></div></header><main id="view" tabindex="-1"></main></div></div>';
      document.addEventListener('error', function (ev) { var im = ev.target; if (im && im.tagName === 'IMG' && im.classList.contains('lgo') && im.parentNode) im.replaceWith(Object.assign(document.createElement('span'), { className: 'lgo-t', textContent: 'Stackly' })); if (0) im.outerHTML = '<span class="lgo-t">Stackly</span>'; }, true);
      var view = document.getElementById('view'), ttl = document.getElementById('ttl');
      function who() { u = SB.session(); document.getElementById('av').textContent = document.getElementById('av2').textContent = initials(u.name); document.getElementById('wn').textContent = document.getElementById('un').textContent = u.name; document.getElementById('sub').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
      function render(top) {
        var id = (location.hash || '').slice(1); if (!cfg.views[id]) id = cfg.nav[0].id; cur = id;
        who(); var v = cfg.views[id]; ttl.textContent = v.title; document.title = v.title + ' | Stackly Badminton Academy';
        view.classList.toggle('enter', !!top); view.innerHTML = v.render(u);
        Array.prototype.forEach.call(document.querySelectorAll('.sn a'), function (a) { a.toggleAttribute('aria-current', a.dataset.id === id); if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); });
        if (top) { window.scrollTo(0, 0); countUp(view); }
      }
      function refresh() { var y = window.scrollY; render(false); window.scrollTo(0, y); }
      var ctx = { refresh: refresh, toast: toast, confirm: confirmBox, state: cfg.state || {}, go: function (h) { location.hash = h; } };
      window.addEventListener('hashchange', function () { render(true); });
      document.addEventListener('click', function (e) {
        if (e.target.closest('[data-out]')) { SB.logout(); location.href = 'login.html'; }
      });
      function run(fn, el, e) { Promise.resolve(fn(el, SB.session(), ctx, e)).then(function (r) { if (r !== false) refresh(); }); }
      view.addEventListener('click', function (e) {
        var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
        var fn = cfg.acts[el.dataset.act]; if (!fn) return;
        if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault();
        if (el.tagName === 'BUTTON') e.preventDefault();
        run(fn, el, e);
      });
      ['change', 'input'].forEach(function (ev) {
        view.addEventListener(ev, function (e) {
          var el = e.target.closest('[data-chg]'); if (!el) return;
          if (ev === 'change' && el.dataset.live) return; if (ev === 'input' && !el.dataset.live) return;
          var fn = cfg.acts[el.dataset.chg]; if (fn) run(fn, el, e);
        });
      });
      view.addEventListener('submit', function (e) {
        var f = e.target.closest('form[data-fa]'); if (!f) return; e.preventDefault();
        var fn = cfg.forms[f.dataset.fa]; if (fn) run(fn, f, e);
      });
      render(true);
    });
  }
  return { logo: logo, memberId: memberId, sw: sw, prefAct: prefAct, pref: on, dayTip: dayTip, kpi: kpi, ring: ring, bars: bars, pb: pb, greet: greet, table: table, mount: mount, icon: icon, esc: esc, fmtD: fmtD, fmtT: fmtT, money: money, initials: initials, isPast: isPast, cmp: cmp, startOf: startOf, toast: toast, confirm: confirmBox, download: download, empty: empty };
})();
(function () {
  'use strict';
  var U = SBUI, e = U.esc, LV = ['Beginner', 'Intermediate', 'Advanced'];
  var st = { lvl: 'All', tab: 'up' };
  var TIPS = ['Split-step just as your opponent hits the shuttle. It makes your first move quicker in every direction.', 'Warm up shoulders and ankles for 10 minutes before play. Most badminton niggles start cold.', 'Hold the racket like a handshake. A tight grip kills wrist speed on clears and drops.', 'After every net shot, recover to the centre of the court before the shuttle comes back.', 'Sip water at every change of ends. Even mild dehydration slows your reactions.', 'Aim clears at the back tramlines. A deep clear buys you time to reset.', 'Practise serves for five minutes each session. Consistent serves win easy points.', 'Sleep 7 to 9 hours. Recovery between training days is where you improve.', 'Keep your non-racket arm up for balance on overhead shots.', 'Replace worn court shoes. Lost grip causes ankle and knee injuries.', 'Watch your opponent\'s racket face, not the shuttle, to read shots earlier.', 'Stretch calves and hamstrings after training to keep lunges comfortable.'];

  function mine(u) { var sh = SB.shared(); return sh.slots.filter(function (s) { return s.booked.indexOf(u.email) > -1; }); }
  function dateBlock(s) { var d = new Date(s.date + 'T00:00:00'); return '<div class="dt"><b>' + d.getDate() + '</b><small>' + d.toLocaleDateString('en-IN', { month: 'short' }) + '</small></div>'; }
  function meta(s) { return U.fmtT(s.time) + ' · Court ' + s.court + ' · ' + e(s.coachName); }

  function weekStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function since(u) { return new Date((u.joined || SB.iso(0)) + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); }
  function memberCard(u) {
    return '<div class="mcard"><div class="mc-t">' + U.logo('lg-g') + '<span class="tag ok">Active</span></div><b class="mc-n">' + e(u.name) + '</b><span class="mc-p">' + e(u.plan) + '</span>' +
      '<div class="mc-g"><div><small>Member ID</small><b>' + U.memberId(u.email) + '</b></div><div><small>Level</small><b>' + e(u.level) + '</b></div><div><small>Member since</small><b>' + since(u) + '</b></div></div></div>';
  }
  function overview(u) {
    var sh = SB.shared(), my = mine(u), up = my.filter(function (s) { return !U.isPast(s); }).sort(U.cmp), done = my.filter(U.isPast);
    var marked = done.filter(function (s) { return sh.att[s.id] && u.email in sh.att[s.id]; }), att = marked.filter(function (s) { return sh.att[s.id][u.email]; }).length;
    var rate = marked.length ? Math.round(att / marked.length * 100) : 0;
    var inv = SB.mem(u.email).invoices, dueList = inv.filter(function (i) { return !i.paid; }), due = dueList.reduce(function (a, i) { return a + i.amt; }, 0);
    var notes = (sh.notes[u.email] || []).slice().reverse().slice(0, 3), next = up[0], w0 = weekStart(new Date()).getTime(), wk = [];
    for (var k = -2; k <= 1; k++) { (function (k) { var from = w0 + k * 7 * 864e5, d = new Date(from); wk.push({ l: k === 0 ? 'This week' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), v: my.filter(function (s) { var t = U.startOf(s).getTime(); return t >= from && t < from + 7 * 864e5; }).length, now: k === 0 }); })(k); }
    var goal = u.weekGoal || 3, tw = wk[2].v, gp = Math.min(100, Math.round(tw / goal * 100));
    return '<section class="hero-d"><div><h2>' + U.greet() + ', ' + e(u.name.split(' ')[0]) + '</h2><p>' + (next ? 'Next up: ' + e(next.title) + ' on ' + U.fmtD(next.date) + ' at ' + U.fmtT(next.time) + '.' : 'No sessions booked yet. Pick a time that suits you.') + '</p></div><div class="hd-a"><a class="bt bt-g" href="#book">Book a session</a>' + (due ? '<a class="bt bt-ghost" href="#payments">Pay ' + U.money(due) + '</a>' : '') + '</div><span class="shuttle" aria-hidden="true"></span></section>' +
      '<section class="kp">' + U.kpi('cal', 'Upcoming sessions', up.length, 'Booked and confirmed') + U.kpi('check', 'Sessions attended', att, 'Out of ' + done.length + ' past sessions', 'g') + U.kpi('pct', 'Attendance rate', marked.length ? rate + '%' : '–', marked.length ? 'From coach records' : 'Not recorded yet', 'b') + U.kpi('wallet', 'Amount due', U.money(due), due ? dueList.length + ' unpaid invoice' + (dueList.length > 1 ? 's' : '') : 'You are all paid up', due ? 'rd' : 'g') + '</section>' +
      '<div class="cols"><section class="pn"><div class="pn-h"><h2>Sessions per week</h2><span class="tag mut">' + e(u.plan) + '</span></div>' + U.bars(wk) + '</section>' +
      '<section class="pn"><div class="pn-h"><h2>Attendance</h2></div>' + U.ring(rate, 'Attendance rate', marked.length ? att + ' of ' + marked.length + ' marked sessions' : 'Appears after your first marked session') +
      '<div class="goal"><div class="goal-h"><b>Weekly goal</b><span>' + tw + ' of ' + goal + ' sessions</span></div>' + U.pb(gp) + '<div class="goal-a"><button class="bt bt-o" data-act="goal" data-d="-" aria-label="Lower weekly goal"' + (goal <= 1 ? ' disabled' : '') + '>−</button><button class="bt bt-o" data-act="goal" data-d="+" aria-label="Raise weekly goal"' + (goal >= 7 ? ' disabled' : '') + '>+</button><small>' + (gp >= 100 ? 'Goal reached. Nice work.' : 'Book ' + (goal - tw) + ' more to hit your goal.') + '</small></div></div></section></div>' +
      '<div class="cols"><section class="pn"><div class="pn-h"><h2>Next session</h2><a class="bt bt-o" href="#bookings">All bookings</a></div>' +
      (next ? '<div class="r">' + dateBlock(next) + '<div class="r-m"><b>' + e(next.title) + '</b><small>' + U.fmtD(next.date) + ' · ' + meta(next) + '</small></div><div class="r-a"><button class="bt bt-o" data-act="ics" data-id="' + next.id + '">Add to calendar</button></div></div>' : U.empty('You have no upcoming sessions.', '<a class="bt bt-g" href="#book">Book a session</a>')) +
      '<div class="tip"><b>Tip of the day</b><p>' + U.dayTip(TIPS) + '</p></div></section>' + memberCard(u) + '</div>' +
      '<div class="cols"><section class="pn"><div class="pn-h"><h2>Feedback from your coach</h2></div>' + (notes.length ? '<div class="rl">' + notes.map(function (n) { return '<div class="r"><div class="r-m"><b>' + e(n.by) + '</b><small>' + U.fmtD(n.date) + '</small><p>' + e(n.text) + '</p></div></div>'; }).join('') + '</div>' : U.empty('No feedback yet. Your coach adds notes after sessions.')) + '</section>' +
      '<section class="pn"><div class="pn-h"><h2>Academy updates</h2></div>' + (sh.ann.length ? '<div class="rl">' + sh.ann.slice(0, 4).map(function (a) { return '<div class="r"><div class="r-m"><b>' + e(a.title) + '</b><small>' + U.fmtD(a.date) + ' · ' + e(a.by) + '</small><p>' + e(a.text) + '</p></div></div>'; }).join('') + '</div>' : U.empty('No updates right now.')) + '</section></div>' +
      '<section class="pn help"><div><h2>Need a hand?</h2><p>The front desk can help with bookings, fees and batch changes.</p><small>HSR Layout, Bengaluru 560102</small></div><div class="r-a"><a class="bt bt-o" href="mailto:hello@stacklybadminton.in">Email front desk</a><a class="bt bt-g" href="https://wa.me/919845012345" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></section>';
  }

  function book(u) {
    var sh = SB.shared(), all = sh.slots.filter(function (s) { return !U.isPast(s); }), list = all.filter(function (s) { return st.lvl === 'All' || s.level === st.lvl; }).sort(U.cmp);
    var mineN = all.filter(function (s) { return s.booked.indexOf(u.email) > -1; }).length, match = all.filter(function (s) { return s.level === u.level && s.booked.length < s.cap; }).length;
    return '<section class="kp three">' + U.kpi('cal', 'Open sessions', all.filter(function (s) { return s.booked.length < s.cap; }).length, 'With spots available') + U.kpi('check', 'Booked by you', mineN, 'Upcoming', 'g') + U.kpi('trophy', 'Match your level', match, e(u.level) + ' sessions', 'y') + '</section>' +
      '<section class="pn"><div class="pn-h"><h2>Open sessions</h2><label class="fl">Level <select data-chg="lvl">' + ['All'].concat(LV).map(function (l) { return '<option' + (l === st.lvl ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></label></div>' +
      (list.length ? '<div class="rl">' + list.map(function (s) {
        var has = s.booked.indexOf(u.email) > -1, left = s.cap - s.booked.length, f = Math.round(s.booked.length / s.cap * 100);
        return '<div class="r">' + dateBlock(s) + '<div class="r-m"><b>' + e(s.title) + ' <span class="tag">' + e(s.level) + '</span>' + (s.level === u.level ? ' <span class="tag ok">Recommended</span>' : '') + '</b><small>' + U.fmtD(s.date) + ' · ' + meta(s) + '</small>' + U.pb(f) + '<small>' + (left > 0 ? left + ' of ' + s.cap + ' spots left' : 'Session full') + '</small></div><div class="r-a">' +
          (has ? '<span class="tag ok">Booked</span><button class="bt bt-o" data-act="cancel" data-id="' + s.id + '">Cancel</button>' : left > 0 ? '<button class="bt bt-g" data-act="book" data-id="' + s.id + '">Book</button>' : '<button class="bt bt-o" disabled>Full</button>') + '</div></div>';
      }).join('') + '</div>' : U.empty('No open sessions for this level. Try another level.')) + '</section>';
  }

  function bookings(u) {
    var sh = SB.shared(), my = mine(u), up = my.filter(function (s) { return !U.isPast(s); }).sort(U.cmp), past = my.filter(U.isPast).sort(function (a, b) { return U.cmp(b, a); });
    var tabs = '<div class="pills" role="tablist"><button role="tab" aria-selected="' + (st.tab === 'up') + '" data-act="tab" data-v="up">Upcoming (' + up.length + ')</button><button role="tab" aria-selected="' + (st.tab === 'past') + '" data-act="tab" data-v="past">Past (' + past.length + ')</button></div>';
    var body;
    if (st.tab === 'up') body = up.length ? U.table(['Session', 'Date', 'Time', 'Court', 'Coach', ''], up.map(function (s) { return [e(s.title) + ' <span class="tag">' + e(s.level) + '</span>', U.fmtD(s.date), U.fmtT(s.time), 'Court ' + s.court, e(s.coachName), '<div class="r-a"><button class="bt bt-o" data-act="ics" data-id="' + s.id + '">Add to calendar</button><button class="bt bt-d" data-act="cancel" data-id="' + s.id + '">Cancel</button></div>']; })) : U.empty('No upcoming bookings.', '<a class="bt bt-g" href="#book">Book a session</a>');
    else body = past.length ? U.table(['Session', 'Date', 'Time', 'Court', 'Coach', 'Attendance'], past.map(function (s) { var a = (sh.att[s.id] || {})[u.email]; return [e(s.title), U.fmtD(s.date), U.fmtT(s.time), 'Court ' + s.court, e(s.coachName), '<span class="tag ' + (a === true ? 'ok' : a === false ? 'bad' : 'mut') + '">' + (a === true ? 'Present' : a === false ? 'Absent' : 'Not marked') + '</span>']; })) : U.empty('Your past sessions will show here.');
    var missed = past.filter(function (s) { return (sh.att[s.id] || {})[u.email] === false; }).length, went = past.filter(function (s) { return (sh.att[s.id] || {})[u.email] === true; }).length;
    return '<section class="kp three">' + U.kpi('cal', 'Upcoming', up.length, 'Sessions booked') + U.kpi('check', 'Attended', went, 'Marked present', 'g') + U.kpi('clock', 'Missed', missed, 'Marked absent', missed ? 'rd' : 'y') + '</section><section class="pn">' + tabs + body + '</section>';
  }

  function payments(u) {
    var inv = SB.mem(u.email).invoices.slice().sort(function (a, b) { return a.paid - b.paid || (a.due < b.due ? 1 : -1); });
    var due = inv.filter(function (i) { return !i.paid; }).reduce(function (a, i) { return a + i.amt; }, 0), paid = inv.filter(function (i) { return i.paid; }).reduce(function (a, i) { return a + i.amt; }, 0);
    return '<section class="kp two">' + U.kpi('wallet', 'Outstanding', U.money(due), due ? 'Pay to keep your slot active' : 'Nothing to pay', due ? 'rd' : 'g') + U.kpi('check', 'Paid so far', U.money(paid), inv.filter(function (i) { return i.paid; }).length + ' receipts available', 'g') + '</section>' +
      '<section class="pn plan-p"><div><span class="tag">Your plan</span><h2>' + e(u.plan) + '</h2><p class="fee"><b>' + U.money(SB.PRICE[u.plan] || 0) + '</b> per month</p></div><ul><li>Coached group sessions</li><li>Session booking with calendar sync</li><li>Coach feedback and attendance tracking</li><li>Downloadable receipt for every payment</li></ul></section>' +
      '<section class="pn"><div class="pn-h"><h2>Invoices</h2></div>' + (inv.length ? U.table(['Invoice', 'Date', 'Reference', 'Amount', 'Status', ''], inv.map(function (i) {
        return [e(i.label), (i.paid ? 'Paid ' + U.fmtD(i.paidOn) : 'Due ' + U.fmtD(i.due)), i.paid ? e(i.ref) : '–', '<b class="pay">' + U.money(i.amt) + '</b>', '<span class="tag ' + (i.paid ? 'ok' : 'warn') + '">' + (i.paid ? 'Paid' : 'Unpaid') + '</span>',
          i.paid ? '<button class="bt bt-o" data-act="receipt" data-id="' + i.id + '">Receipt</button>' : '<button class="bt bt-g" data-act="pay" data-id="' + i.id + '">Pay now</button>'];
      })) : U.empty('No invoices yet.')) + '</section>';
  }

  function profile(u) {
    return '<div class="cols"><section class="pn"><div class="pn-h"><h2>Your details</h2></div><form data-fa="profile" class="frm" novalidate>' +
      '<div class="fg"><label for="pn">Full name</label><input id="pn" name="name" value="' + e(u.name) + '" autocomplete="name"><span class="err"></span></div>' +
      '<div class="fg"><label for="pe">Email</label><input id="pe" value="' + e(u.email) + '" disabled></div>' +
      '<div class="fg"><label for="pp">Mobile</label><input id="pp" name="phone" inputmode="numeric" maxlength="10" value="' + e(u.phone) + '" autocomplete="tel"><span class="err"></span></div>' +
      '<div class="fg"><label for="pl">Level</label><select id="pl" name="level">' + LV.map(function (l) { return '<option' + (l === u.level ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></div>' +
      '<div class="fg"><label for="pg">Your goal</label><input id="pg" name="goal" maxlength="80" value="' + e(u.goal || '') + '" placeholder="e.g. Win a district tournament"></div>' +
      '<button class="bt bt-g" type="submit">Save changes</button></form></section>' +
      '<section class="pn"><div class="pn-h"><h2>Change password</h2></div><form data-fa="password" class="frm" novalidate>' +
      '<div class="fg"><label for="p1">Current password</label><input id="p1" name="cur" type="password" autocomplete="current-password"><span class="err"></span></div>' +
      '<div class="fg"><label for="p2">New password</label><input id="p2" name="next" type="password" autocomplete="new-password"><span class="err"></span></div>' +
      '<button class="bt bt-p" type="submit">Update password</button></form></section></div>' +
      '<section class="pn"><div class="pn-h"><h2>Notifications</h2></div><div class="sws">' + U.sw('remind', 'Session reminders', 'A reminder the evening before each session', U.pref(u, 'remind')) + U.sw('news', 'Academy updates', 'Batch changes, tournaments and camp dates', U.pref(u, 'news')) + U.sw('fees', 'Fee reminders', 'A nudge a few days before an invoice is due', U.pref(u, 'fees')) + '</div></section>';
  }

  function ics(s) {
    var p = function (d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '00'; };
    var a = U.startOf(s), b = new Date(a.getTime() + 90 * 60000);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stackly//EN', 'BEGIN:VEVENT', 'UID:' + s.id + '@stackly', 'DTSTAMP:' + p(new Date()), 'DTSTART:' + p(a), 'DTEND:' + p(b), 'SUMMARY:' + s.title + ' (Stackly)', 'LOCATION:Stackly Badminton Academy\\, HSR Layout\\, Bengaluru - Court ' + s.court, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function slot(id) { return SB.shared().slots.filter(function (s) { return s.id === id; })[0]; }
  function fieldErr(f, name, msg) { var i = f.querySelector('[name=' + name + ']'); i.closest('.fg').classList.add('bad'); i.closest('.fg').querySelector('.err').textContent = msg; }
  function clearErr(f) { Array.prototype.forEach.call(f.querySelectorAll('.fg.bad'), function (x) { x.classList.remove('bad'); }); }

  if (document.body.dataset.role === 'member') SBUI.mount({
    role: 'member', roleLabel: 'Member', state: st,
    nav: [{ id: 'overview', label: 'Overview', icon: 'grid' }, { id: 'book', label: 'Book', icon: 'cal' }, { id: 'bookings', label: 'Bookings', icon: 'list' }, { id: 'payments', label: 'Payments', icon: 'card' }, { id: 'profile', label: 'Profile', icon: 'user' }],
    views: {
      overview: { title: 'Overview', render: overview }, book: { title: 'Book a session', render: book }, bookings: { title: 'My bookings', render: bookings },
      payments: { title: 'Payments', render: payments }, profile: { title: 'Profile', render: profile }
    },
    acts: {
      pref: U.prefAct,
      goal: function (el, u, c) { var g = Math.max(1, Math.min(7, (u.weekGoal || 3) + (el.dataset.d === '+' ? 1 : -1))); SB.updateUser(u.email, { weekGoal: g }); c.toast('Weekly goal set to ' + g + ' sessions.'); },
      lvl: function (el) { st.lvl = el.value; },
      tab: function (el) { st.tab = el.dataset.v; },
      book: function (el, u, c) {
        var sh = SB.shared(), s = sh.slots.filter(function (x) { return x.id === el.dataset.id; })[0];
        if (!s || s.booked.length >= s.cap) { c.toast('This session just filled up.', 'bad'); return; }
        var clash = sh.slots.some(function (x) { return x.id !== s.id && x.booked.indexOf(u.email) > -1 && x.date === s.date && x.time === s.time; });
        if (clash) { c.toast('You already have a session at this time.', 'bad'); return; }
        s.booked.push(u.email); SB.saveShared(sh); c.toast('Booked ' + s.title + ' on ' + U.fmtD(s.date) + '.');
      },
      cancel: function (el, u, c) {
        var s = slot(el.dataset.id); if (!s) return;
        return c.confirm('Cancel this booking?', s.title + ' on ' + U.fmtD(s.date) + ' at ' + U.fmtT(s.time) + '. Your spot will open for others.', 'Cancel booking', true).then(function (ok) {
          if (!ok) return false; var sh = SB.shared(), x = sh.slots.filter(function (y) { return y.id === s.id; })[0];
          x.booked = x.booked.filter(function (m) { return m !== u.email; }); SB.saveShared(sh); c.toast('Booking cancelled.');
        });
      },
      ics: function (el, u, c) { var s = slot(el.dataset.id); U.download('stackly-' + s.date + '.ics', ics(s), 'text/calendar'); c.toast('Calendar file downloaded.'); return false; },
      pay: function (el, u, c) {
        var m = SB.mem(u.email), i = m.invoices.filter(function (x) { return x.id === el.dataset.id; })[0];
        return c.confirm('Pay ' + U.money(i.amt) + '?', i.label + '. This demo records the payment without charging a card.', 'Pay ' + U.money(i.amt)).then(function (ok) {
          if (!ok) return false; i.paid = true; i.paidOn = SB.iso(0); i.ref = 'SBA' + Math.floor(100000 + Math.random() * 900000); SB.saveMem(u.email, m); c.toast('Payment received. Receipt is ready.');
        });
      },
      receipt: function (el, u, c) {
        var i = SB.mem(u.email).invoices.filter(function (x) { return x.id === el.dataset.id; })[0];
        U.download('receipt-' + i.ref + '.txt', ['STACKLY BADMINTON ACADEMY', 'HSR Layout, Bengaluru 560102', '', 'Receipt: ' + i.ref, 'Member: ' + u.name + ' (' + u.email + ')', 'Item: ' + i.label, 'Amount: ' + U.money(i.amt), 'Paid on: ' + i.paidOn].join('\n'));
        c.toast('Receipt downloaded.'); return false;
      }
    },
    forms: {
      profile: function (f, u, c) {
        clearErr(f); var d = new FormData(f), ok = true;
        if (!/^[A-Za-z][A-Za-z .'-]{1,29}$/.test(d.get('name').trim())) { fieldErr(f, 'name', 'Use letters only, 2 to 30 characters.'); ok = false; }
        if (!/^[6-9]\d{9}$/.test(d.get('phone'))) { fieldErr(f, 'phone', 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.'); ok = false; }
        if (!ok) return false;
        SB.updateUser(u.email, { name: d.get('name').trim(), phone: d.get('phone'), level: d.get('level'), goal: d.get('goal').trim() }); c.toast('Profile saved.');
      },
      password: function (f, u, c) {
        clearErr(f); var d = new FormData(f), n = d.get('next');
        if (!d.get('cur')) { fieldErr(f, 'cur', 'Enter your current password.'); return false; }
        if (n.length < 8 || !/[A-Za-z]/.test(n) || !/\d/.test(n)) { fieldErr(f, 'next', 'Use at least 8 characters with a letter and a number.'); return false; }
        return SB.changePassword(u.email, d.get('cur'), n).then(function (r) { if (!r.ok) { fieldErr(f, 'cur', r.err); return false; } c.toast('Password updated.'); });
      }
    }
  });
})();
(function () {
  'use strict';
  var U = SBUI, e = U.esc, LV = ['Beginner', 'Intermediate', 'Advanced'];
  var st = { att: null, note: null };
  var TIPS = ['Give each session one clear focus so feedback sticks.', 'Use a 2-and-1 ratio: two things done well, one thing to fix.', 'Rotate court partners every 10 minutes so players adapt to different styles.', 'End with a short cooldown and one question: what did you learn today?', 'Record attendance within an hour while it is fresh.', 'Leave a short note after sessions. Members read them and it keeps them motivated.', 'Plan a light session after a heavy one to avoid overload in junior players.'];
  function own(u) { return SB.shared().slots.filter(function (s) { return s.coach === u.email; }); }
  function members() { return SB.users().filter(function (x) { return x.role === 'member'; }); }
  function dateBlock(s) { var d = new Date(s.date + 'T00:00:00'); return '<div class="dt"><b>' + d.getDate() + '</b><small>' + d.toLocaleDateString('en-IN', { month: 'short' }) + '</small></div>'; }
  function name(email) { var m = SB.find(email); return m ? m.name : email; }

  function overview(u) {
    var sh = SB.shared(), my = own(u), up = my.filter(function (s) { return !U.isPast(s); }).sort(U.cmp), today = SB.iso(0), tcount = my.filter(function (s) { return s.date === today; }).length;
    var uniq = {}, bk = 0, cap = 0; up.forEach(function (s) { bk += s.booked.length; cap += s.cap; s.booked.forEach(function (m) { uniq[m] = 1; }); });
    var rec = 0, pres = 0, tally = {}; my.forEach(function (s) { var a = sh.att[s.id]; if (a) for (var k in a) { rec++; tally[k] = tally[k] || { p: 0, t: 0 }; tally[k].t++; if (a[k]) { pres++; tally[k].p++; } } });
    var rate = rec ? Math.round(pres / rec * 100) : 0, fill = cap ? Math.round(bk / cap * 100) : 0, days = [];
    for (var i = 0; i < 7; i++) { (function (i) { var d = SB.iso(i), dd = new Date(d + 'T00:00:00'); days.push({ l: i === 0 ? 'Today' : dd.toLocaleDateString('en-IN', { weekday: 'short' }), v: my.filter(function (s) { return s.date === d; }).length, now: i === 0 }); })(i); }
    var nd = up.length ? up[0].date : null, sched = nd ? up.filter(function (s) { return s.date === nd; }) : [];
    var top = Object.keys(tally).map(function (k) { return { m: k, p: tally[k].p, t: tally[k].t, r: Math.round(tally[k].p / tally[k].t * 100) }; }).sort(function (a, b) { return b.r - a.r || b.t - a.t; }).slice(0, 4);
    var lv = { Beginner: 0, Intermediate: 0, Advanced: 0 }, ms = members(); ms.forEach(function (m) { if (lv[m.level] != null) lv[m.level]++; });
    return '<section class="hero-d"><div><h2>' + U.greet() + ', ' + e(u.name.split(' ')[0]) + '</h2><p>' + (tcount ? 'You have ' + tcount + ' session' + (tcount > 1 ? 's' : '') + ' on court today.' : 'No sessions today. ' + (up.length ? 'Next one is ' + U.fmtD(up[0].date) + '.' : 'Create one to get started.')) + '</p></div><div class="hd-a"><a class="bt bt-g" href="#sessions">New session</a><a class="bt bt-ghost" href="#attendance">Take attendance</a></div><span class="shuttle" aria-hidden="true"></span></section>' +
      '<section class="kp">' + U.kpi('cal', 'Upcoming sessions', up.length, tcount + ' today') + U.kpi('users', 'Students booked', Object.keys(uniq).length, 'Across upcoming sessions', 'g') + U.kpi('pct', 'Attendance rate', rec ? rate + '%' : '–', rec ? pres + ' of ' + rec + ' marked present' : 'No records yet', 'b') + U.kpi('trend', 'Capacity filled', cap ? fill + '%' : '–', bk + ' of ' + cap + ' spots booked', 'y') + '</section>' +
      '<div class="cols"><section class="pn"><div class="pn-h"><h2>Sessions, next 7 days</h2></div>' + U.bars(days) + '</section>' +
      '<section class="pn"><div class="pn-h"><h2>Attendance</h2></div>' + U.ring(rate, 'Attendance rate', rec ? pres + ' of ' + rec + ' present' : 'Appears after you take attendance') + '</section></div>' +
      '<div class="cols"><section class="pn"><div class="pn-h"><h2>' + (nd === today ? 'Today\'s schedule' : nd ? 'Next on court: ' + U.fmtD(nd) : 'Schedule') + '</h2><a class="bt bt-o" href="#sessions">Manage</a></div>' +
      (sched.length ? '<ol class="tl2">' + sched.map(function (s) { return '<li><time>' + U.fmtT(s.time) + '</time><div><b>' + e(s.title) + '</b><small>Court ' + s.court + ' · ' + e(s.level) + ' · ' + s.booked.length + ' of ' + s.cap + ' booked</small></div><button class="bt bt-o" data-act="takeatt" data-id="' + s.id + '">Attendance</button></li>'; }).join('') + '</ol>' : U.empty('Nothing scheduled yet.', '<a class="bt bt-g" href="#sessions">Create a session</a>')) + '</section>' +
      '<section class="pn"><div class="pn-h"><h2>Best attendance</h2></div>' + (top.length ? '<div class="rl">' + top.map(function (t, i) { return '<div class="r"><span class="rk">' + (i + 1) + '</span><div class="r-m"><b>' + e(name(t.m)) + '</b>' + U.pb(t.r) + '<small>' + t.p + ' of ' + t.t + ' sessions attended</small></div><b class="pay">' + t.r + '%</b></div>'; }).join('') + '</div>' : U.empty('Take attendance to see who is most consistent.')) + '</section></div>' +
      '<div class="cols"><section class="pn"><div class="pn-h"><h2>Next sessions</h2><a class="bt bt-o" href="#sessions">All</a></div>' +
      (up.length ? '<div class="rl">' + up.slice(0, 4).map(function (s) { var f = Math.round(s.booked.length / s.cap * 100); return '<div class="r">' + dateBlock(s) + '<div class="r-m"><b>' + e(s.title) + '</b><small>' + U.fmtD(s.date) + ' · ' + U.fmtT(s.time) + ' · Court ' + s.court + '</small>' + U.pb(f) + '<small>' + s.booked.length + ' of ' + s.cap + ' booked</small></div></div>'; }).join('') + '</div>' : U.empty('No upcoming sessions.')) + '</section>' +
      '<section class="pn"><div class="pn-h"><h2>Post an update</h2></div><form data-fa="ann" class="frm" novalidate><div class="fg"><label for="at">Title</label><input id="at" name="title" maxlength="60"><span class="err"></span></div><div class="fg"><label for="am">Message</label><textarea id="am" name="text" maxlength="240" rows="3"></textarea><span class="err"></span></div><button class="bt bt-g" type="submit">Post to members</button></form></section></div>' +
      '<div class="cols"><section class="pn"><div class="pn-h"><h2>Students by level</h2><a class="bt bt-o" href="#students">View all</a></div>' + Object.keys(lv).map(function (k) { return '<div class="lvr"><span>' + k + '</span>' + U.pb(ms.length ? Math.round(lv[k] / ms.length * 100) : 0) + '<b>' + lv[k] + '</b></div>'; }).join('') + '<div class="tip"><b>Coaching tip</b><p>' + U.dayTip(TIPS) + '</p></div></section>' +
      '<section class="pn"><div class="pn-h"><h2>Posted updates</h2></div>' + (sh.ann.length ? '<div class="rl">' + sh.ann.map(function (a) { return '<div class="r"><div class="r-m"><b>' + e(a.title) + '</b><small>' + U.fmtD(a.date) + ' · ' + e(a.by) + '</small><p>' + e(a.text) + '</p></div>' + (a.byEmail === u.email ? '<div class="r-a"><button class="bt bt-d" data-act="delann" data-id="' + a.id + '">Delete</button></div>' : '') + '</div>'; }).join('') + '</div>' : U.empty('Nothing posted yet.')) + '</section></div>';
  }

  function sessions(u) {
    var my = own(u).sort(U.cmp), sh = SB.shared(), wkEnd = SB.iso(7), tb = 0, tc = 0; my.forEach(function (s) { tb += s.booked.length; tc += s.cap; });
    return '<section class="kp three">' + U.kpi('cal', 'Total sessions', my.length, 'You created') + U.kpi('clock', 'Next 7 days', my.filter(function (s) { return s.date >= SB.iso(0) && s.date < wkEnd; }).length, 'On the schedule', 'g') + U.kpi('trend', 'Average fill', tc ? Math.round(tb / tc * 100) + '%' : '–', tb + ' of ' + tc + ' spots', 'y') + '</section>' +
      '<section class="pn"><div class="pn-h"><h2>Create a session</h2></div><form data-fa="slot" class="frm grid" novalidate>' +
      '<div class="fg"><label for="st">Title</label><input id="st" name="title" maxlength="40" placeholder="e.g. Net play clinic"><span class="err"></span></div>' +
      '<div class="fg"><label for="sl">Level</label><select id="sl" name="level">' + LV.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select></div>' +
      '<div class="fg"><label for="sd">Date</label><input id="sd" name="date" type="date" min="' + SB.iso(0) + '"><span class="err"></span></div>' +
      '<div class="fg"><label for="sm">Start time</label><input id="sm" name="time" type="time"><span class="err"></span></div>' +
      '<div class="fg"><label for="sc">Court</label><select id="sc" name="court">' + [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></div>' +
      '<div class="fg"><label for="sp">Capacity</label><input id="sp" name="cap" type="number" min="1" max="20" value="8"><span class="err"></span></div>' +
      '<button class="bt bt-g" type="submit">Create session</button></form></section>' +
      '<section class="pn"><div class="pn-h"><h2>Your sessions</h2></div>' + (my.length ? '<div class="rl">' + my.map(function (s) {
        var open = st.roster === s.id, past = U.isPast(s);
        return '<div class="r wrapr">' + dateBlock(s) + '<div class="r-m"><b>' + e(s.title) + ' <span class="tag">' + e(s.level) + '</span>' + (past ? ' <span class="tag mut">Done</span>' : '') + '</b><small>' + U.fmtD(s.date) + ' · ' + U.fmtT(s.time) + ' · Court ' + s.court + ' · ' + s.booked.length + '/' + s.cap + ' booked</small></div>' +
          '<div class="r-a"><button class="bt bt-o" data-act="roster" data-id="' + s.id + '" aria-expanded="' + open + '">' + (open ? 'Hide roster' : 'View roster') + '</button><button class="bt bt-o" data-act="dup" data-id="' + s.id + '">Repeat next week</button><button class="bt bt-d" data-act="delslot" data-id="' + s.id + '">Cancel</button></div>' +
          (open ? '<div class="roster">' + (s.booked.length ? '<ul>' + s.booked.map(function (m) { return '<li><span>' + e(name(m)) + '</span><button class="bt bt-o" data-act="kick" data-id="' + s.id + '" data-m="' + e(m) + '">Remove</button></li>'; }).join('') + '</ul>' : '<p class="mut">No students booked yet.</p>') + '</div>' : '') + '</div>';
      }).join('') + '</div>' : U.empty('You have not created any sessions yet.')) + '</section>';
  }

  function attendance(u) {
    var my = own(u).sort(function (a, b) { return U.cmp(b, a); }), sh = SB.shared();
    if (!my.length) return '<section class="pn">' + U.empty('Create a session first, then you can take attendance here.', '<a class="bt bt-g" href="#sessions">Create a session</a>') + '</section>';
    if (!st.att || !my.some(function (s) { return s.id === st.att; })) { st.att = (my.filter(U.isPast)[0] || my[my.length - 1]).id; }
    var s = my.filter(function (x) { return x.id === st.att; })[0], a = sh.att[s.id] || {};
    var present = s.booked.filter(function (m) { return a[m] === true; }).length, absent = s.booked.filter(function (m) { return a[m] === false; }).length;
    return '<section class="kp three">' + U.kpi('check', 'Present', present, 'Marked present', 'g') + U.kpi('clock', 'Absent', absent, 'Marked absent', absent ? 'rd' : 'y') + U.kpi('users', 'Not marked', s.booked.length - present - absent, 'Still to record', 'b') + '</section><section class="pn"><div class="pn-h"><h2>Roll call</h2><label class="fl">Session <select data-chg="pickatt">' + my.map(function (x) { return '<option value="' + x.id + '"' + (x.id === s.id ? ' selected' : '') + '>' + U.fmtD(x.date) + ' · ' + e(x.title) + '</option>'; }).join('') + '</select></label></div>' +
      '<p class="mut">' + U.fmtD(s.date) + ' · ' + U.fmtT(s.time) + ' · Court ' + s.court + ' · ' + present + ' of ' + s.booked.length + ' present</p>' +
      (s.booked.length ? '<div class="qa"><button class="bt bt-p" data-act="allp">Mark all present</button><button class="bt bt-o" data-act="allx">Clear all</button><button class="bt bt-o" data-act="csv">Export CSV</button></div><div class="rl">' + s.booked.map(function (m) {
        return '<label class="r chk"><input type="checkbox" data-chg="mark" data-m="' + e(m) + '"' + (a[m] === true ? ' checked' : '') + '><div class="r-m"><b>' + e(name(m)) + '</b><small>' + e(m) + '</small></div><span class="tag ' + (a[m] === true ? 'ok' : a[m] === false ? 'bad' : 'mut') + '">' + (a[m] === true ? 'Present' : a[m] === false ? 'Absent' : 'Not marked') + '</span></label>';
      }).join('') + '</div>' : U.empty('Nobody has booked this session.')) + '</section>';
  }

  function students(u) {
    var sh = SB.shared(), list = members();
    var rows = list.map(function (m) {
      var bk = sh.slots.filter(function (s) { return s.booked.indexOf(m.email) > -1; }), notes = (sh.notes[m.email] || []).slice().reverse(), open = st.note === m.email;
      var x = open ? '<form data-fa="addnote" class="frm" novalidate><input type="hidden" name="m" value="' + e(m.email) + '"><div class="fg"><label for="nt">New note for ' + e(m.name.split(' ')[0]) + '</label><textarea id="nt" name="text" rows="2" maxlength="240" placeholder="What went well, what to practise"></textarea><span class="err"></span></div><button class="bt bt-p" type="submit">Save note</button></form>' +
        (notes.length ? '<ul class="nl2">' + notes.map(function (n) { return '<li><div><b>' + U.fmtD(n.date) + '</b> · ' + e(n.by) + '<p>' + e(n.text) + '</p></div><button class="bt bt-o" data-act="delnote" data-m="' + e(m.email) + '" data-id="' + n.id + '">Delete</button></li>'; }).join('') + '</ul>' : '') : '';
      return { s: (m.name + ' ' + m.email).toLowerCase(), x: x, c: ['<div class="who2"><span class="ava sm">' + U.initials(m.name) + '</span><div><b>' + e(m.name) + '</b><small>' + e(m.email) + '</small></div></div>', e(m.plan || ''), '<span class="tag">' + e(m.level || '') + '</span>', bk.length, '<div class="r-a"><a class="bt bt-o" href="mailto:' + e(m.email) + '">Email</a><a class="bt bt-o" href="tel:+91' + e(m.phone) + '">Call</a><button class="bt bt-g" data-act="note" data-m="' + e(m.email) + '" aria-expanded="' + open + '">' + (open ? 'Close' : 'Notes (' + notes.length + ')') + '</button></div>'] };
    });
    var lc = function (l) { return list.filter(function (m) { return m.level === l; }).length; };
    return '<section class="kp">' + U.kpi('users', 'Total students', list.length, 'Registered members') + U.kpi('user', 'Beginner', lc('Beginner'), 'Foundation level', 'g') + U.kpi('trend', 'Intermediate', lc('Intermediate'), 'Building skills', 'b') + U.kpi('trophy', 'Advanced', lc('Advanced'), 'Competitive', 'y') + '</section><section class="pn"><div class="pn-h"><h2>Students (' + list.length + ')</h2><label class="fl">Search <input type="search" data-chg="search" data-live="1" placeholder="Name or email"></label></div><div id="stl">' + U.table(['Student', 'Program', 'Level', 'Booked', ''], rows) + '</div><p class="empty" id="nomatch" hidden>No students match your search.</p></section>';
  }

  function profile(u) {
    return '<div class="cols"><section class="pn"><div class="pn-h"><h2>Your details</h2></div><form data-fa="profile" class="frm" novalidate>' +
      '<div class="fg"><label for="pn">Full name</label><input id="pn" name="name" value="' + e(u.name) + '"><span class="err"></span></div>' +
      '<div class="fg"><label for="pe">Email</label><input id="pe" value="' + e(u.email) + '" disabled></div>' +
      '<div class="fg"><label for="pp">Mobile</label><input id="pp" name="phone" inputmode="numeric" maxlength="10" value="' + e(u.phone) + '"><span class="err"></span></div>' +
      '<div class="fg"><label for="ps">Specialty</label><input id="ps" name="specialty" maxlength="60" value="' + e(u.specialty || '') + '"></div>' +
      '<div class="fg"><label for="pb">Short bio</label><textarea id="pb" name="bio" rows="3" maxlength="200">' + e(u.bio || '') + '</textarea></div>' +
      '<button class="bt bt-g" type="submit">Save changes</button></form></section>' +
      '<section class="pn"><div class="pn-h"><h2>Change password</h2></div><form data-fa="password" class="frm" novalidate>' +
      '<div class="fg"><label for="p1">Current password</label><input id="p1" name="cur" type="password" autocomplete="current-password"><span class="err"></span></div>' +
      '<div class="fg"><label for="p2">New password</label><input id="p2" name="next" type="password" autocomplete="new-password"><span class="err"></span></div>' +
      '<button class="bt bt-p" type="submit">Update password</button></form></section></div>' +
      '<section class="pn"><div class="pn-h"><h2>Notifications</h2></div><div class="sws">' + U.sw('bookings', 'New bookings', 'Know when a student joins or leaves a session', U.pref(u, 'bookings')) + U.sw('daily', 'Daily schedule', 'A summary of tomorrow\'s sessions each evening', U.pref(u, 'daily')) + U.sw('att', 'Attendance reminders', 'A nudge if a past session has no attendance recorded', U.pref(u, 'att')) + '</div></section>';
  }

  function fe(f, n, m) { var i = f.querySelector('[name=' + n + ']'); i.closest('.fg').classList.add('bad'); i.closest('.fg').querySelector('.err').textContent = m; }
  function ce(f) { Array.prototype.forEach.call(f.querySelectorAll('.fg.bad'), function (x) { x.classList.remove('bad'); }); }
  function getSlot(sh, id) { return sh.slots.filter(function (s) { return s.id === id; })[0]; }

  if (document.body.dataset.role === 'coach') SBUI.mount({
    role: 'coach', roleLabel: 'Coach', state: st,
    nav: [{ id: 'overview', label: 'Overview', icon: 'grid' }, { id: 'sessions', label: 'Sessions', icon: 'cal' }, { id: 'attendance', label: 'Attendance', icon: 'check' }, { id: 'students', label: 'Students', icon: 'users' }, { id: 'profile', label: 'Profile', icon: 'user' }],
    views: { overview: { title: 'Overview', render: overview }, sessions: { title: 'Sessions', render: sessions }, attendance: { title: 'Attendance', render: attendance }, students: { title: 'Students', render: students }, profile: { title: 'Profile', render: profile } },
    acts: {
      pref: U.prefAct,
      takeatt: function (el, u, c) { st.att = el.dataset.id; c.go('attendance'); return false; },
      delann: function (el, u, c) { return c.confirm('Delete this update?', 'Members will no longer see it.', 'Delete', true).then(function (ok) { if (!ok) return false; var sh = SB.shared(); sh.ann = sh.ann.filter(function (a) { return a.id !== el.dataset.id; }); SB.saveShared(sh); c.toast('Update deleted.'); }); },
      roster: function (el) { st.roster = st.roster === el.dataset.id ? null : el.dataset.id; },
      kick: function (el, u, c) { var sh = SB.shared(), s = getSlot(sh, el.dataset.id); s.booked = s.booked.filter(function (m) { return m !== el.dataset.m; }); SB.saveShared(sh); c.toast('Student removed from session.'); },
      dup: function (el, u, c) {
        var sh = SB.shared(), s = getSlot(sh, el.dataset.id), d = new Date(s.date + 'T00:00:00'); d.setDate(d.getDate() + 7);
        var nd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (sh.slots.some(function (x) { return x.court === s.court && x.date === nd && x.time === s.time; })) { c.toast('Court ' + s.court + ' is already used at that time next week.', 'bad'); return false; }
        sh.slots.push({ id: SB.uid(), title: s.title, level: s.level, coach: s.coach, coachName: s.coachName, date: nd, time: s.time, court: s.court, cap: s.cap, booked: [] }); SB.saveShared(sh); c.toast('Added for ' + U.fmtD(nd) + '.');
      },
      delslot: function (el, u, c) {
        var sh = SB.shared(), s = getSlot(sh, el.dataset.id);
        return c.confirm('Cancel this session?', s.title + ' on ' + U.fmtD(s.date) + '. ' + s.booked.length + ' booked student(s) will lose their spot.', 'Cancel session', true).then(function (ok) { if (!ok) return false; sh.slots = sh.slots.filter(function (x) { return x.id !== s.id; }); delete sh.att[s.id]; SB.saveShared(sh); c.toast('Session cancelled.'); });
      },
      pickatt: function (el) { st.att = el.value; },
      mark: function (el, u, c) { var sh = SB.shared(); sh.att[st.att] = sh.att[st.att] || {}; sh.att[st.att][el.dataset.m] = el.checked; SB.saveShared(sh); c.toast(el.checked ? 'Marked present.' : 'Marked absent.'); },
      allp: function (el, u, c) { var sh = SB.shared(), s = getSlot(sh, st.att); sh.att[s.id] = {}; s.booked.forEach(function (m) { sh.att[s.id][m] = true; }); SB.saveShared(sh); c.toast('Everyone marked present.'); },
      allx: function (el, u, c) { var sh = SB.shared(); delete sh.att[st.att]; SB.saveShared(sh); c.toast('Attendance cleared.'); },
      csv: function (el, u, c) { var sh = SB.shared(), s = getSlot(sh, st.att), a = sh.att[s.id] || {}; U.download('attendance-' + s.date + '.csv', 'Name,Email,Status\n' + s.booked.map(function (m) { return '"' + name(m).replace(/"/g, '""') + '",' + m + ',' + (a[m] === true ? 'Present' : a[m] === false ? 'Absent' : 'Not marked'); }).join('\n'), 'text/csv'); c.toast('CSV downloaded.'); return false; },
      search: function (el) {
        var q = el.value.trim().toLowerCase(), n = 0;
        Array.prototype.forEach.call(document.querySelectorAll('#stl [data-s]'), function (r) { var m = !q || r.dataset.s.indexOf(q) > -1; r.hidden = !m; if (m) n++; });
        document.getElementById('nomatch').hidden = n > 0; return false;
      },
      note: function (el) { st.note = st.note === el.dataset.m ? null : el.dataset.m; },
      delnote: function (el, u, c) { var sh = SB.shared(); sh.notes[el.dataset.m] = (sh.notes[el.dataset.m] || []).filter(function (n) { return n.id !== el.dataset.id; }); SB.saveShared(sh); c.toast('Note deleted.'); }
    },
    forms: {
      ann: function (f, u, c) {
        ce(f); var d = new FormData(f), ok = true;
        if (!d.get('title').trim()) { fe(f, 'title', 'Add a title.'); ok = false; }
        if (!d.get('text').trim()) { fe(f, 'text', 'Write a short message.'); ok = false; }
        if (!ok) return false; var sh = SB.shared();
        sh.ann.unshift({ id: SB.uid(), title: d.get('title').trim(), text: d.get('text').trim(), by: u.name, byEmail: u.email, date: SB.iso(0) }); SB.saveShared(sh); c.toast('Update posted.');
      },
      slot: function (f, u, c) {
        ce(f); var d = new FormData(f), ok = true, cap = parseInt(d.get('cap'), 10);
        if (!d.get('title').trim()) { fe(f, 'title', 'Add a title.'); ok = false; }
        if (!d.get('date')) { fe(f, 'date', 'Pick a date.'); ok = false; }
        if (!d.get('time')) { fe(f, 'time', 'Pick a start time.'); ok = false; }
        if (!(cap >= 1 && cap <= 20)) { fe(f, 'cap', 'Enter 1 to 20.'); ok = false; }
        if (!ok) return false;
        var s = { id: SB.uid(), title: d.get('title').trim(), level: d.get('level'), coach: u.email, coachName: u.name, date: d.get('date'), time: d.get('time'), court: +d.get('court'), cap: cap, booked: [] };
        if (U.isPast(s)) { fe(f, 'date', 'Choose a date and time in the future.'); return false; }
        var sh = SB.shared();
        if (sh.slots.some(function (x) { return x.court === s.court && x.date === s.date && x.time === s.time; })) { fe(f, 'time', 'Court ' + s.court + ' is already booked at this time.'); return false; }
        sh.slots.push(s); SB.saveShared(sh); c.toast('Session created.');
      },
      addnote: function (f, u, c) {
        ce(f); var d = new FormData(f); if (!d.get('text').trim()) { fe(f, 'text', 'Write a note first.'); return false; }
        var sh = SB.shared(), m = d.get('m'); sh.notes[m] = sh.notes[m] || []; sh.notes[m].push({ id: SB.uid(), by: u.name, date: SB.iso(0), text: d.get('text').trim() }); SB.saveShared(sh); c.toast('Note saved. The student can see it.');
      },
      profile: function (f, u, c) {
        ce(f); var d = new FormData(f), ok = true;
        if (!/^[A-Za-z][A-Za-z .'-]{1,29}$/.test(d.get('name').trim())) { fe(f, 'name', 'Use letters only, 2 to 30 characters.'); ok = false; }
        if (!/^[6-9]\d{9}$/.test(d.get('phone'))) { fe(f, 'phone', 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.'); ok = false; }
        if (!ok) return false;
        SB.updateUser(u.email, { name: d.get('name').trim(), phone: d.get('phone'), specialty: d.get('specialty').trim(), bio: d.get('bio').trim() }); c.toast('Profile saved.');
      },
      password: function (f, u, c) {
        ce(f); var d = new FormData(f), n = d.get('next');
        if (!d.get('cur')) { fe(f, 'cur', 'Enter your current password.'); return false; }
        if (n.length < 8 || !/[A-Za-z]/.test(n) || !/\d/.test(n)) { fe(f, 'next', 'Use at least 8 characters with a letter and a number.'); return false; }
        return SB.changePassword(u.email, d.get('cur'), n).then(function (r) { if (!r.ok) { fe(f, 'cur', r.err); return false; } c.toast('Password updated.'); });
      }
    }
  });
})();
/* login + signup page behaviour */
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('img.lgo'), function (im) { if (im.complete && im.naturalWidth === 0 && im.parentNode) im.replaceWith(Object.assign(document.createElement('span'), { className: 'lgo-t', textContent: 'Stackly' })); });
  document.addEventListener('error', function (ev) { var im = ev.target; if (im && im.tagName === 'IMG' && im.classList.contains('lgo') && im.parentNode) im.replaceWith(Object.assign(document.createElement('span'), { className: 'lgo-t', textContent: 'Stackly' })); if (0) im.outerHTML = '<span class="lgo-t">Stackly</span>'; }, true);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

  function bad(input, msg) { var fg = input.closest('.fg'); fg.classList.add('bad'); $('.err', fg).textContent = msg; }
  function clear(input) { var fg = input.closest('.fg'); fg.classList.remove('bad'); }
  function alertBox(f, msg) { var a = $('.alert', f); a.textContent = msg; a.classList.toggle('show', !!msg); }
  function roleSwitch(f, cb) {
    var role = 'member', bs = $$('[data-role]', f);
    function set(r) {
      role = r;
      bs.forEach(function (b) { b.setAttribute('aria-checked', b.dataset.role === r); });
      $$('[data-only]', f).forEach(function (x) { var on = x.dataset.only === r; x.hidden = !on; $$('input,select', x).forEach(function (i) { i.disabled = !on; }); });
      alertBox(f, ''); if (cb) cb(r);
    }
    bs.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.role); }); });
    set('member');
    return { get: function () { return role; }, set: set };
  }
  function pwToggles(f) {
    $$('.pw button', f).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = $('input', b.parentElement), show = i.type === 'password';
        i.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    });
  }
  function busy(btn, on, label) { btn.disabled = on; btn.textContent = on ? label : btn.dataset.l; }

  function initLogin(f) {
    var r = roleSwitch(f), btn = $('button[type=submit]', f); btn.dataset.l = btn.textContent;
    pwToggles(f);
    var u = SB.session(); if (u) { location.replace(SB.home(u.role)); return; }
    var fl = SB.takeFlash(), fe = $('#flash');
    if (fl && fe) { fe.textContent = fl.msg; fe.classList.add('show'); if (fl.email) $('#lemail').value = fl.email; }
    $$('input', f).forEach(function (i) { i.addEventListener('input', function () { clear(i); alertBox(f, ''); }); });
    $$('[data-demo]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = b.dataset.demo === 'member'; r.set(b.dataset.demo);
        $('#lemail').value = m ? 'member@stackly.in' : 'coach@stackly.in'; $('#lpass').value = m ? 'Member@123' : 'Coach@123';
        $$('input', f).forEach(clear); $('#lpass').focus();
      });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); var em = $('#lemail'), pw = $('#lpass'), ok = true;
      if (!EMAIL.test(em.value.trim())) { bad(em, 'Enter a valid email like name@example.com.'); ok = false; }
      if (!pw.value) { bad(pw, 'Enter your password.'); ok = false; }
      if (!ok) { $('.bad input', f).focus(); return; }
      busy(btn, true, 'Logging in…');
      SB.login(em.value, pw.value, r.get(), $('#lremember').checked).then(function (res) {
        if (!res.ok) { busy(btn, false); alertBox(f, res.err); return; }
        var url = SB.home(res.user.role); btn.textContent = 'Opening dashboard…';
        alertBox(f, ''); var a = $('#flash'); a.innerHTML = 'Logged in. Opening your dashboard… <a href="' + url + '">Continue</a>'; a.classList.add('show');
        location.replace(url);
      });
    });
  }

  function initSignup(f) {
    var r = roleSwitch(f), btn = $('button[type=submit]', f); btn.dataset.l = btn.textContent;
    pwToggles(f);
    var u = SB.session(); if (u) { location.replace(SB.home(u.role)); return; }
    $('#sphone').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 10); });
    $$('input,select', f).forEach(function (i) { i.addEventListener('input', function () { clear(i); alertBox(f, ''); }); i.addEventListener('change', function () { clear(i); }); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var g = function (id) { return $('#' + id); }, ok = true, role = r.get();
      function chk(c, el, m) { if (!c) { bad(el, m); ok = false; } }
      chk(/^[A-Za-z][A-Za-z .'-]{1,29}$/.test(g('sname').value.trim()), g('sname'), 'Use letters only, 2 to 30 characters.');
      chk(EMAIL.test(g('semail').value.trim()), g('semail'), 'Enter a valid email like name@example.com.');
      chk(/^[6-9]\d{9}$/.test(g('sphone').value), g('sphone'), 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.');
      if (role === 'member') { chk(!!g('splan').value, g('splan'), 'Choose a program.'); chk(!!g('slevel').value, g('slevel'), 'Choose your level.'); }
      else chk(g('scode').value.trim().toUpperCase() === 'COACH2026', g('scode'), 'Staff code is incorrect. Ask the academy admin.');
      chk(g('spass').value.length >= 8 && /[A-Za-z]/.test(g('spass').value) && /\d/.test(g('spass').value), g('spass'), 'Use at least 8 characters with a letter and a number.');
      chk(g('spass2').value === g('spass').value && g('spass2').value, g('spass2'), 'Passwords do not match.');
      var tc = g('sterms'); if (!tc.checked) { bad(tc, 'Please accept the terms to continue.'); ok = false; }
      if (!ok) { var b = $('.bad input,.bad select', f); if (b) b.focus(); return; }
      busy(btn, true, 'Creating account…');
      SB.register({ role: role, name: g('sname').value, email: g('semail').value, phone: g('sphone').value, plan: g('splan').value, level: g('slevel').value, password: g('spass').value }).then(function (res) {
        if (!res.ok) { busy(btn, false); if (res.field === 'email') bad(g('semail'), res.err); else alertBox(f, res.err); return; }
        SB.flash('Account created. Log in to open your ' + role + ' dashboard.', g('semail').value.trim().toLowerCase());
        var s = $('#done'); s.classList.add('show'); btn.textContent = 'Redirecting…';
        setTimeout(function () { location.href = 'login.html'; }, 900);
      });
    });
  }
  if (typeof SB === 'undefined') { var al = document.querySelector('.alert'); if (al) { al.textContent = 'auth.js did not load. Keep auth.js in the same folder as login.html.'; al.classList.add('show'); } return; }
  if (!window.localStorage) { var a2 = document.querySelector('.alert'); if (a2) { a2.textContent = 'Browser storage is blocked. Open the site through a local server or allow storage.'; a2.classList.add('show'); } }
  SB.init().then(function () { var l = $('#loginForm'), s = $('#signupForm'); if (l) initLogin(l); if (s) initSignup(s); });
})();