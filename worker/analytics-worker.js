/**
 * Cloudflare Worker — Portfolio Click Analytics
 *
 * Separate from cloudflare-worker.js (the OpenRouter proxy) on purpose:
 * different auth model, different methods, different failure blast radius.
 * See docs/ANALYTICS-PLAN.md for the full design rationale.
 *
 * Routes:
 *   POST /collect  → insert one event, no auth, always 204 (never leaks state)
 *   POST /stats    → aggregate query, password-gated
 *   POST /reset    → truncate events table, password-gated + typed confirmation
 *
 * Bindings (wrangler.toml):
 *   DB              D1 database
 * Secrets (wrangler secret put ...):
 *   ADMIN_PASSWORD  plaintext compare, never logged, never returned
 *   HASH_SALT       server-only pepper for the daily visitor hash
 * Vars:
 *   ANALYTICS_ALLOW_LOCAL  "true" to accept events from localhost origins (dev only)
 */

const ALLOWED_ORIGINS = [
  'https://tylerv11.github.io',
  'http://localhost:5000',
  'http://localhost:8000',
  'http://localhost:8080',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8080',
];

const RETENTION_DAYS = 400;
const VALID_TYPES = new Set([
  'pageview',
  'resume_view',
  'pdf_view',
  'youtube_click',
  'tile_expand',
  'tile_link',
  'outbound',
  'nav',
  'section_dwell',
  'tile_dwell',
  'page_time',
]);

function isLocalOrigin(origin) {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch (e) {
    return false;
  }
}

function corsHeaders(origin, env) {
  const localOk = env.ANALYTICS_ALLOW_LOCAL === 'true' && isLocalOrigin(origin);
  const allowed = ALLOWED_ORIGINS.includes(origin) || localOk;
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://tylerv11.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Debug',
    'Vary': 'Origin',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function sha256Hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time-ish string compare (defends against trivial timing attacks on the password).
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function dailySalt(env, day) {
  return sha256Hex((env.HASH_SALT || 'fallback-salt-do-not-use-in-prod') + '|' + day);
}

async function visitorHash(env, day, ip, ua) {
  const salt = await dailySalt(env, day);
  const full = await sha256Hex(salt + '|' + ip + '|' + ua);
  return full.slice(0, 16);
}

// Derive a coarse, storable device bucket from the User-Agent. The raw UA is
// never persisted — only this derived label, e.g. "Desktop · Chrome".
function deviceBucket(ua) {
  if (!ua) return 'Unknown · Unknown';
  const s = ua;

  let type = 'Desktop';
  if (/iPad|Tablet(?!.*Mobile)/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) {
    type = 'Tablet';
  } else if (/Mobi|iPhone|Android/i.test(s)) {
    type = 'Mobile';
  }

  let browser = 'Other';
  if (/Edg\//.test(s)) browser = 'Edge';
  else if (/OPR\//.test(s) || /Opera/.test(s)) browser = 'Opera';
  else if (/Firefox\//.test(s)) browser = 'Firefox';
  else if (/CriOS\//.test(s)) browser = 'Chrome';
  else if (/Chrome\//.test(s)) browser = 'Chrome';
  else if (/Safari\//.test(s) && /Version\//.test(s)) browser = 'Safari';

  return type + ' · ' + browser;
}

function refHost(referrer) {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

async function handleCollect(request, env, origin) {
  // Layer 2 self-exclusion: debug header always dropped.
  if (request.headers.get('X-Debug')) {
    return new Response(null, { status: 204 });
  }
  // Layer 2: localhost dropped unless explicitly allowed (dev mode).
  if (isLocalOrigin(origin) && env.ANALYTICS_ALLOW_LOCAL !== 'true') {
    return new Response(null, { status: 204 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(null, { status: 204 }); // never leak parse errors to a public endpoint
  }

  const type = String(body.type || '');
  if (!VALID_TYPES.has(type)) {
    return new Response(null, { status: 204 });
  }

  const page = typeof body.page === 'string' ? body.page.slice(0, 200) : '/';
  const target = typeof body.target === 'string' ? body.target.slice(0, 300) : null;
  const ms = Number.isFinite(body.ms) ? Math.max(0, Math.min(1000 * 60 * 60 * 6, Math.round(body.ms))) : null;
  const session = typeof body.session === 'string' ? body.session.slice(0, 64) : null;
  const cid = typeof body.cid === 'string' && body.cid.length <= 64 ? body.cid : null;

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const ua = request.headers.get('User-Agent') || '';
  const day = todayUTC();
  const ts = Date.now();

  const visitor = await visitorHash(env, day, ip, ua);
  const device = deviceBucket(ua);
  const ref = refHost(request.headers.get('Referer'));

  await env.DB.prepare(
    `INSERT INTO events (ts, day, type, target, page, ms, ref, visitor, session, device, cid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ts, day, type, target, page, ms, ref, visitor, session, device, cid).run();

  // Every browser that reports a client id shows up in the device list, so it
  // can be labelled and marked as the owner's. A browser that has declared
  // itself admin (localStorage.isAdmin, or ?admin=1) is flagged owner on sight
  // — otherwise the first thing you'd have to do on a new device is go find it
  // in a list. is_owner is only ever set here, never cleared, so an explicit
  // un-mark from the dashboard is not undone by the next pageview.
  if (cid) {
    await env.DB.prepare(
      `INSERT INTO devices (cid, label, is_owner, first_seen, last_seen, device)
       VALUES (?, NULL, ?, ?, ?, ?)
       ON CONFLICT(cid) DO UPDATE SET
         last_seen = excluded.last_seen,
         device    = excluded.device,
         is_owner  = MAX(devices.is_owner, excluded.is_owner)`
    ).bind(cid, body.admin === true ? 1 : 0, ts, ts, device).run();
  }

  // Prune old rows on ~1% of writes — cheap, keeps storage flat forever.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
    await env.DB.prepare('DELETE FROM events WHERE day < ?').bind(cutoff).run();
  }

  return new Response(null, { status: 204 });
}

function rangeDaysToCutoff(range) {
  const map = { '7d': 7, '30d': 30, '90d': 90, '6mo': 182, 'all': null };
  const days = Object.prototype.hasOwnProperty.call(map, range) ? map[range] : 30;
  if (days === null) return null;
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

async function handleStats(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'bad request' }, 400);
  }

  if (!safeEqual(body.password, env.ADMIN_PASSWORD || '')) {
    return json({ error: 'unauthorized' }, 401);
  }

  const range = typeof body.range === 'string' ? body.range : '30d';
  const cutoff = rangeDaysToCutoff(range);
  const typeFilter = Array.isArray(body.types) && body.types.length
    ? body.types.filter(t => VALID_TYPES.has(t))
    : null;

  // baseConds/baseParams are the filters common to every query (date range + type multi-select).
  const baseConds = [];
  const baseParams = [];
  if (cutoff) {
    baseConds.push('day >= ?');
    baseParams.push(cutoff);
  }
  if (typeFilter) {
    baseConds.push(`type IN (${typeFilter.map(() => '?').join(',')})`);
    baseParams.push(...typeFilter);
  }

  // Your own devices are hidden by default so the numbers mean "other people".
  // The events are still stored — `include_mine` brings them back rather than
  // there being nothing to bring back.
  if (body.include_mine !== true) {
    baseConds.push('(cid IS NULL OR cid NOT IN (SELECT cid FROM devices WHERE is_owner = 1))');
  }

  // Drill-down: clicking a chart element narrows every panel at once.
  // device/page/visitor are properties of an individual row, so they filter
  // row-wise. `target` is not — pageviews and page_time carry no target, so a
  // row-wise target filter would blank most of the dashboard. The question a
  // user actually means by clicking "hermes" is "what did the people who
  // opened hermes do?", so target scopes to those sessions instead.
  const str = (v) => (typeof v === 'string' && v.length && v.length <= 300 ? v : null);
  const drillDevice = str(body.device);
  const drillPage = str(body.page);
  const drillVisitor = str(body.visitor);
  const drillTarget = str(body.target);
  if (drillDevice) { baseConds.push('device = ?'); baseParams.push(drillDevice); }
  if (drillPage) { baseConds.push('page = ?'); baseParams.push(drillPage); }
  if (drillVisitor) { baseConds.push('visitor = ?'); baseParams.push(drillVisitor); }
  if (drillTarget) {
    baseConds.push('session IN (SELECT session FROM events WHERE target = ? AND session IS NOT NULL)');
    baseParams.push(drillTarget);
  }

  // q(select, extraConds, tailSql, extraParams) -> SELECT ... WHERE <base+extra> <tailSql>
  const q = (selectSql, extraConds, tailSql, extraParams) => {
    const conds = [...baseConds, ...(extraConds || [])];
    const whereSql = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const params = [...baseParams, ...(extraParams || [])];
    return env.DB.prepare(`${selectSql} ${whereSql} ${tailSql || ''}`.trim()).bind(...params).all();
  };

  const [
    totalSessions,
    totalPageviews,
    uniqueViewers,
    avgEngaged,
    platformRows,
    pageRows,
    engagementRows,
    dwellRows,
    dailyVisits,
    recentRows,
    viewerRows,
    firstEvent,
    lastEvent,
  ] = await Promise.all([
    q('SELECT COUNT(DISTINCT session) AS n FROM events', ['session IS NOT NULL']),
    q('SELECT COUNT(*) AS n FROM events', ["type='pageview'"]),
    q('SELECT COUNT(DISTINCT visitor) AS n FROM events', []),
    q('SELECT AVG(ms) AS avg_ms FROM events', ["type='page_time'", 'ms IS NOT NULL']),
    q('SELECT device, COUNT(*) AS n FROM events', ["type='pageview'", 'device IS NOT NULL'], 'GROUP BY device ORDER BY n DESC'),
    q('SELECT page, COUNT(*) AS views, COUNT(DISTINCT visitor) AS uniques FROM events', ["type='pageview'"], 'GROUP BY page ORDER BY views DESC'),
    q('SELECT type, target, COUNT(*) AS n FROM events', ["type IN ('resume_view','pdf_view','youtube_click','tile_expand','tile_link')"], 'GROUP BY type, target ORDER BY n DESC LIMIT 25'),
    q('SELECT type, target, SUM(ms) AS total_ms FROM events', ["type IN ('section_dwell','tile_dwell')", 'ms IS NOT NULL'], 'GROUP BY type, target ORDER BY total_ms DESC LIMIT 25'),
    q('SELECT day, COUNT(DISTINCT session) AS visits FROM events', ['session IS NOT NULL'], 'GROUP BY day ORDER BY day ASC'),
    q('SELECT ts, type, target, page, ms, device, visitor FROM events', [], 'ORDER BY ts DESC LIMIT 100'),
    q('SELECT visitor, COUNT(DISTINCT session) AS visits, SUM(CASE WHEN type=\'pageview\' THEN 1 ELSE 0 END) AS views FROM events',
      ['visitor IS NOT NULL'], 'GROUP BY visitor ORDER BY views DESC, visits DESC LIMIT 20'),
    // Scoped to the active filters, so the header reads as the range of the
    // data actually on screen rather than the range of the whole table.
    q('SELECT MIN(ts) AS ts FROM events', []),
    q('SELECT MAX(ts) AS ts FROM events', []),
  ]);

  return json({
    kpi: {
      site_visits: totalSessions.results[0]?.n || 0,
      total_pageviews: totalPageviews.results[0]?.n || 0,
      unique_viewers: uniqueViewers.results[0]?.n || 0,
      avg_engaged_ms: avgEngaged.results[0]?.avg_ms || 0,
    },
    platform: platformRows.results,
    pages: pageRows.results,
    engagement_pareto: engagementRows.results,
    dwell_pareto: dwellRows.results,
    daily_visits: dailyVisits.results,
    recent_events: recentRows.results,
    viewers: viewerRows.results,
    first_event_ts: firstEvent.results[0]?.ts || null,
    last_event_ts: lastEvent.results[0]?.ts || null,
    refreshed_ts: Date.now(),
  }, 200);
}

// GET-ish list of every browser that has ever reported a client id, with enough
// context (label, platform, event count, last seen) to recognise which is which.
async function handleDevices(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'bad request' }, 400);
  }
  if (!safeEqual(body.password, env.ADMIN_PASSWORD || '')) {
    return json({ error: 'unauthorized' }, 401);
  }

  // Mark / rename / unmark, then fall through and return the fresh list.
  if (body.action === 'update') {
    const cid = typeof body.cid === 'string' ? body.cid.slice(0, 64) : null;
    if (!cid) return json({ error: 'cid required' }, 400);
    const label = typeof body.label === 'string' ? body.label.slice(0, 60) : null;
    const isOwner = body.is_owner ? 1 : 0;
    await env.DB.prepare(
      'UPDATE devices SET label = ?, is_owner = ? WHERE cid = ?'
    ).bind(label, isOwner, cid).run();
  }

  const rows = await env.DB.prepare(
    `SELECT d.cid, d.label, d.is_owner, d.first_seen, d.last_seen, d.device,
            (SELECT COUNT(*) FROM events e WHERE e.cid = d.cid) AS events,
            (SELECT COUNT(DISTINCT e.session) FROM events e WHERE e.cid = d.cid) AS visits
     FROM devices d
     ORDER BY d.is_owner DESC, d.last_seen DESC
     LIMIT 100`
  ).all();

  return json({ devices: rows.results }, 200);
}

async function handleReset(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'bad request' }, 400);
  }
  if (!safeEqual(body.password, env.ADMIN_PASSWORD || '')) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (body.confirm !== 'RESET') {
    return json({ error: 'confirmation text mismatch' }, 400);
  }
  await env.DB.prepare('DELETE FROM events').run();
  return json({ ok: true }, 200);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405, cors);
    }

    // Reject requests from origins not on the allowlist (mirrors cloudflare-worker.js pattern).
    const localOk = env.ANALYTICS_ALLOW_LOCAL === 'true' && isLocalOrigin(origin);
    if (!ALLOWED_ORIGINS.includes(origin) && !localOk) {
      return json({ error: 'origin not allowed' }, 403, cors);
    }

    try {
      if (url.pathname === '/collect') {
        const res = await handleCollect(request, env, origin);
        const headers = new Headers(res.headers);
        Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
        return new Response(res.body, { status: res.status, headers });
      }
      if (url.pathname === '/stats') {
        const res = await handleStats(request, env);
        const headers = new Headers(res.headers);
        Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
        return new Response(res.body, { status: res.status, headers });
      }
      if (url.pathname === '/devices') {
        const res = await handleDevices(request, env);
        const headers = new Headers(res.headers);
        Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
        return new Response(res.body, { status: res.status, headers });
      }
      if (url.pathname === '/reset') {
        const res = await handleReset(request, env);
        const headers = new Headers(res.headers);
        Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
        return new Response(res.body, { status: res.status, headers });
      }
      return json({ error: 'not found' }, 404, cors);
    } catch (err) {
      return json({ error: 'internal error' }, 500, cors);
    }
  },
};
