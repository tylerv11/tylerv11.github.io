/* Portfolio click-analytics tracker. Zero deps, defer-loaded, sendBeacon-first.
   Taxonomy + self-exclusion: docs/ANALYTICS-PLAN.md §5-6 */
(function () {
  'use strict';
  var WORKER_URL = 'https://portfolio-analytics.tylervincent-ai.workers.dev';
  var COLLECT_URL = WORKER_URL + '/collect';

  try {
    if (location.search.indexOf('admin=1') !== -1) localStorage.setItem('isAdmin', 'true');
    if (localStorage.getItem('isAdmin') === 'true') return; // layer-1 self-exclusion
  } catch (e) {}

  var session;
  try {
    session = sessionStorage.getItem('_av_sid');
    if (!session) {
      session = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('_av_sid', session);
    }
  } catch (e) { session = Math.random().toString(36).slice(2); }

  var page = location.pathname || '/';

  function send(type, target, ms) {
    var payload = JSON.stringify({ type: type, target: target || null, page: page, ms: typeof ms === 'number' ? ms : null, session: session });
    // fetch+keepalive first, not sendBeacon. sendBeacon returns true for
    // "queued", not "delivered", so a beacon that dies in transit reports
    // success and suppresses any fallback — silent total data loss. Verified
    // against the live Worker: beacons were accepted and never arrived, while
    // keepalive fetch landed every time. keepalive gives the same
    // survives-page-unload guarantee at this payload size.
    try {
      fetch(COLLECT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function () {});
      return;
    } catch (e) {}
    try { navigator.sendBeacon && navigator.sendBeacon(COLLECT_URL, new Blob([payload], { type: 'application/json' })); } catch (e) {}
  }

  send('pageview');

  function tileLink(el, dest) {
    var body = el.closest ? el.closest('.exp-tile-body') : null;
    if (!body) return false;
    var tile = body.closest('.exp-tile');
    send('tile_link', (tile && tile.id ? tile.id.replace('exp-tile-', '') : 'unknown') + ':' + dest);
    return true;
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('a[href]') : null;
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#') { tileLink(el, href); return; }
    var abs;
    try { abs = new URL(href, location.href); } catch (err) { return; }
    if (/TylerVincent-Resume\.pdf$/i.test(abs.pathname)) send('resume_view', 'resume');
    else if (/\.pdf$/i.test(abs.pathname)) send('pdf_view', abs.pathname.split('/').pop());
    else if (/(^|\.)youtube\.com$/.test(abs.hostname) || /(^|\.)youtu\.be$/.test(abs.hostname)) {
      send('youtube_click', abs.hostname.indexOf('youtu.be') !== -1 ? abs.pathname.replace(/^\//, '') : (abs.searchParams.get('v') || abs.pathname.split('/').pop()));
    } else if (abs.hostname && abs.hostname !== location.hostname) {
      if (!tileLink(el, abs.hostname)) send('outbound', abs.hostname);
    } else tileLink(el, abs.hostname || location.hostname);
  }, true);

  // Bubble phase (not capture): must run AFTER the tile's own inline onclick
  // (toggleExpTile) has already flipped the 'open' class, so this sees final state.
  document.addEventListener('click', function (e) {
    var header = e.target.closest ? e.target.closest('.exp-tile-header') : null;
    if (!header) return;
    var tile = header.closest('.exp-tile');
    if (tile && tile.classList.contains('open')) send('tile_expand', tile.id.replace('exp-tile-', ''));
  }, false);

  window.addEventListener('hashchange', function () { if (location.hash) send('nav', location.hash); });

  var DWELL_MS = 5000, dwellState = new Map();
  function startDwell(id, isTile) {
    if (dwellState.has(id)) return;
    var t = setTimeout(function () { send(isTile ? 'tile_dwell' : 'section_dwell', id, DWELL_MS); }, DWELL_MS);
    dwellState.set(id, t);
  }
  function stopDwell(id) { var t = dwellState.get(id); if (t) { clearTimeout(t); dwellState.delete(id); } }

  function observeAll(io) {
    ['systems', 'work', 'projects'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    document.querySelectorAll('.exp-tile-body').forEach(function (el) { io.observe(el); });
  }

  // "Is the user looking at this?" is two different questions depending on size.
  // intersectionRatio is the fraction of THE ELEMENT that's visible, so a
  // section taller than 2x the viewport can never reach 0.5 no matter how it's
  // scrolled — #work is 5458px against a ~1035px viewport, a ceiling of 0.19,
  // meaning it could never register dwell on any device. So: small elements
  // qualify on their own ratio, tall ones qualify by filling the viewport.
  function isEngaged(entry) {
    if (!entry.isIntersecting) return false;
    if (entry.intersectionRatio >= 0.5) return true;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var visible = entry.intersectionRect ? entry.intersectionRect.height : 0;
    return vh > 0 && visible / vh >= 0.5;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target, isTile = el.classList.contains('exp-tile-body');
        var id = isTile ? (el.closest('.exp-tile') ? el.closest('.exp-tile').id.replace('exp-tile-', '') : el.id) : el.id;
        if (!id) return;
        if (isEngaged(entry) && document.visibilityState === 'visible') startDwell(id, isTile);
        else stopDwell(id);
      });
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });

    if (document.readyState !== 'loading') observeAll(io);
    else document.addEventListener('DOMContentLoaded', function () { observeAll(io); });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') dwellState.forEach(function (t, id) { stopDwell(id); });
    });
  }

  var engagedMs = 0, lastTick = document.visibilityState === 'visible' ? Date.now() : null;
  function tick() { if (lastTick !== null) { engagedMs += Date.now() - lastTick; lastTick = Date.now(); } }
  document.addEventListener('visibilitychange', function () { tick(); lastTick = document.visibilityState === 'visible' ? Date.now() : null; });
  window.addEventListener('pagehide', function () { tick(); send('page_time', null, Math.round(engagedMs)); });
})();
