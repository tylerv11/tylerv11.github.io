# Portfolio Click Analytics — Plan & Structural Guide

**Goal:** know which parts of the portfolio actually drive engagement from recruiters and hiring managers, so the site can be tuned for job applications. Track clicks, hits, and time spent. No heavy third-party scripts, no measurable page-speed cost, no PII.

Status: **plan approved, not yet implemented.** Implementation handed to Sonnet in-session.

---

## 1. Current state (verified 2026-08-04)

| Thing | Finding |
|---|---|
| Repo | `tylerv11/tylerv11.github.io`, public, GitHub Pages, `main` branch |
| Structure | `index.html` (387 KB single page) + `about.html`, `education.html`, `elements.html`, `generic.html` |
| Existing JS | `portfolio-assistant.js` (only `<script src>` on the page), `service-worker.js` |
| Existing analytics | **None.** Zero `sendBeacon`, zero `gtag`. Clean slate. |
| Existing backend | `cloudflare-worker.js` — an OpenRouter proxy, already deployed, already CORS-locked to `tylerv11.github.io` |
| Secrets hygiene | `.gitignore` already blocks `.env*`, `*.key`, `*.pem` — good baseline |

**Trackable targets already on the site:**

- PDFs (4): `DualMonitor.pdf`, `EconomicAnalysisReport.pdf`, `Genetic Algorithm.pdf`, `SPOTapp.pdf`
- YouTube (3): `Ee7PgJgc0hA`, `K_zY6VuuR1I`, `n--isQ2pwJc`
- Sections: `#systems`, `#work`, `#projects`, `#exp-tile-hermes`, `#exp-tile-plutus`
- Pages: `/`, `/about.html`, `/education.html`

---

## 2. Five corrections to the original spec

These are deliberate departures. Each one is a case where the original instruction would either not work or would leak something.

### 2.1 Don't use a third-party JSON host — you already own the backend

The spec called for a mock `https://my-free-json-db.com` placeholder. Skip it. You already have a Cloudflare Worker deployed and CORS-locked to this domain. Attaching **Cloudflare D1** (serverless SQLite) to a Worker gives real SQL aggregation on the free tier:

- 5 GB storage, 5 M rows read/day, 100 k rows written/day — orders of magnitude beyond a portfolio's volume
- No new vendor, no new account, no new bill, no data leaving infrastructure you control
- Real `GROUP BY` / `SUM` means Pareto and time-on-page are one query each, not client-side JSON munging

This is the answer to "ideally I don't want to set up a database." You don't set one up in the traditional sense — D1 is a binding you declare in `wrangler.toml`, and the schema is one `CREATE TABLE` run once.

**Rejected alternative:** Workers KV. Writes cap at 1 000/day free, and it's eventually consistent with read-modify-write races that silently lose counter increments. Wrong tool for counters.

### 2.2 A frontend-only password cannot be secret on a public repo

The spec asked for a password check in `admin.html` with the password gitignored. Those two requirements are mutually exclusive: `tylerv11.github.io` is a **public** repo serving static files, so any string in the shipped JS is readable via View Source, and a file that's gitignored is never deployed at all.

**What we build instead:**

- The password lives as a **Cloudflare Worker secret** (`wrangler secret put ADMIN_PASSWORD`). Never in the repo, never in the bundle — including not in this document.
- `admin/index.html` prompts, then POSTs the attempt to the Worker. The **Worker** compares and returns data or `401`.
- The client-side prompt becomes a UX gate; the actual data is protected server-side.
- Repo ships zero secrets. `.dev.vars` (local Worker dev secrets) gets added to `.gitignore`.

Net result: this is *more* secure than what was asked for, and it's the only version where the analytics data is actually private rather than merely hidden.

### 2.3 GitHub Pages will not serve `admin.html` at `/admin`

GitHub Pages does not strip `.html` extensions. `admin.html` resolves only at `/admin.html`. To get `tylerv11.github.io/admin`, the file must be **`admin/index.html`**.

### 2.4 There is no `resume.pdf` on the site

The spec assumed one. The four PDFs present are project artifacts, not a resume. For a careers site the resume click is the single most important engagement signal — every other metric is secondary to "did they open the resume." Recommend adding `files/TylerVincent-Resume.pdf` and a visible link, so the tracker has the headline event to record.

### 2.5 The service worker will cache the admin page and break it

`service-worker.js` is live. It must explicitly bypass the analytics endpoint and the admin route, or the dashboard will serve stale metrics from cache and the collector may replay stale beacons.

---

## 3. Architecture

```
┌──────────────────────────────────────────────┐
│  GitHub Pages (static, public)               │
│                                              │
│  index.html ─┐                               │
│  about.html  ├─ <script defer src=           │
│  education.. ┘      "analytics.js">          │
│                          │                   │
│  admin/index.html ───────┼──────┐            │
└──────────────────────────┼──────┼────────────┘
                           │      │
              sendBeacon   │      │  POST + password
              (fire/forget)│      │  (fetch, awaited)
                           ▼      ▼
        ┌──────────────────────────────────────┐
        │  Cloudflare Worker                   │
        │  portfolio-analytics.workers.dev     │
        │                                      │
        │  POST /collect  → insert (no auth)   │
        │  POST /stats    → aggregate (pw)     │
        │  POST /reset    → truncate (pw)      │
        │                                      │
        │  secret: ADMIN_PASSWORD              │
        │  binding: DB → D1                    │
        └──────────────┬───────────────────────┘
                       ▼
              ┌─────────────────┐
              │  Cloudflare D1  │
              │  (SQLite)       │
              │  table: events  │
              └─────────────────┘
```

**Why a separate Worker from the existing OpenRouter proxy:** different auth model, different allowed methods, different failure blast radius. If analytics breaks, the portfolio assistant keeps working. Isolation is free here — Workers free tier allows 100 k requests/day across all Workers.

---

## 4. Data model

```sql
CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       INTEGER NOT NULL,   -- epoch ms, SERVER-assigned (never trust client clocks)
  day      TEXT    NOT NULL,   -- 'YYYY-MM-DD', denormalized for cheap grouping
  type     TEXT    NOT NULL,   -- see taxonomy below
  target   TEXT,               -- 'TylerVincent-Resume.pdf' | '#projects' | 'youtu.be/Ee7PgJgc0hA'
  page     TEXT    NOT NULL,   -- '/' | '/about.html'
  ms       INTEGER,            -- duration, for dwell + page_time only
  ref      TEXT,               -- referrer HOST only ('linkedin.com'), never full URL
  visitor  TEXT    NOT NULL,   -- daily-rotating salted hash — see below
  session  TEXT,               -- random per-tab id, sessionStorage
  device   TEXT                -- 'mobile' | 'desktop'
);

CREATE INDEX IF NOT EXISTS idx_events_day  ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, day);
```

**Visitor identity — anonymous by construction.** No cookies, no localStorage ID, no stored IP. The Worker computes:

```
visitor = SHA256(daily_salt + client_ip + user_agent).slice(0, 16)
```

where `daily_salt` rotates every 24 h. This yields unique-visitor counts and same-day dedup, but the hash is irreversible and becomes uncorrelatable the next day. It's the approach Plausible uses; it's GDPR-clean and stores no PII. **The raw IP is never written to D1.**

**Retention:** the Worker prunes rows older than 400 days on write (cheap `DELETE WHERE day < ...`, runs on ~1 % of inserts). Keeps storage flat forever.

**Rollups:** not needed initially. At portfolio volume, aggregating raw rows per dashboard load is well inside D1's free read budget. A `daily_rollup` table is the documented escape hatch if volume ever justifies it.

---

## 5. Event taxonomy

| `type` | Fires when | `target` | `ms` |
|---|---|---|---|
| `pageview` | Page load | — | — |
| `resume_view` | `TylerVincent-Resume.pdf` clicked | `resume` | — |
| `pdf_view` | Any other `a[href$=".pdf"]` clicked | filename | — |
| `youtube_click` | Any `youtu.be` / `youtube.com` link clicked | video id | — |
| `tile_expand` | An `exp-tile-*` dropdown is opened | tile slug (`hermes`, `plutus`, …) | — |
| `tile_link` | A link **inside** an expanded `exp-body-*` is clicked | `tile:destination-host` | — |
| `outbound` | Any other off-domain link clicked | destination host | — |
| `nav` | Hash-section change or multi-page nav | `#projects` / `/about.html` | — |
| `section_dwell` | Section ≥50 % visible for ≥5 consecutive s | section id | dwell ms |
| `tile_dwell` | An expanded tile body visible ≥5 consecutive s | tile slug | dwell ms |
| `page_time` | On `pagehide` | — | total engaged ms |

**All 11 experiment tiles are tracked** (`hermes`, `plutus`, `openclaw`, `satellite`, `surftime`, `weather`, `blackjack`, `catapult`, `expedition`, `bizcase`, `signal-sweep`) — both the expand action and any link clicked inside. Tile expansion is the clearest "this project interested me" signal on the site, and it's currently invisible.

**Engaged time, not wall-clock.** The timer accumulates only while `document.visibilityState === 'visible'`, pausing on tab-blur. A page left open in a background tab overnight records seconds, not hours — which is what makes the "time spent" Pareto trustworthy rather than noise.

---

## 6. Self-exclusion (two layers)

1. **Client:** `localStorage.isAdmin === 'true'` → the tracker returns immediately, sends nothing. Set automatically on successful admin login. Also settable by visiting `?admin=1`.
2. **Server:** the Worker drops any event carrying the `X-Debug` header, and drops events whose `Origin` is `localhost` unless `ANALYTICS_ALLOW_LOCAL` is set.

Layer 2 matters because layer 1 alone silently fails the moment you clear browser storage or open the site on a new device — you'd start polluting your own metrics without noticing.

---

## 7. File-by-file structural guide

### New files

```
tylerv11.github.io/
├── analytics.js                     ← tracker, ~2.5 KB unminified, zero deps
├── admin/
│   └── index.html                   ← dashboard, resolves at /admin
├── worker/
│   ├── analytics-worker.js          ← Worker source
│   ├── wrangler.toml                ← D1 binding + routes
│   ├── schema.sql                   ← the CREATE TABLE above
│   └── .dev.vars.example            ← documents ADMIN_PASSWORD, no real value
└── docs/
    ├── ANALYTICS-PLAN.md            ← this file
    ├── ANALYTICS.md                 ← operator runbook (written at the end)
    └── IDEAS.md                     ← site ideas backlog (see §11)
```

### Modified files

| File | Change |
|---|---|
| `index.html` | `<script defer src="analytics.js"></script>` before `</body>` |
| `about.html` | same |
| `education.html` | same |
| `service-worker.js` | bypass cache for the Worker origin and `/admin` |
| `.gitignore` | add `.dev.vars`, `worker/.wrangler/` |
| `.env.example` | document `ANALYTICS_WORKER_URL` |

### Load-cost budget

`analytics.js` ships `defer`, so it never blocks parse or render. Target **< 3 KB** uncompressed, no dependencies, all sends via `navigator.sendBeacon` (browser-scheduled, off the main thread, survives navigation). Fallback to `fetch(..., {keepalive: true})` where `sendBeacon` is unavailable. Expected Lighthouse delta: **0 points.** This will be measured, not assumed.

---

## 8. Admin dashboard spec

Route `/admin` → `admin/index.html`. Password verified server-side against the Worker secret (§2.2). On success: store a short-lived token in `sessionStorage`, set `localStorage.isAdmin = 'true'`.

**Layout, top to bottom:**

**1. KPI cards (4)**
- **Site Visits** — total sessions, non-distinct
- **Total Page Views** — every `pageview` event
- **Unique Viewers** — distinct daily `visitor` hashes
- **Avg Engaged Time** — mean `page_time` per session

**2. Platform pie chart** — % of visitors by platform: `Mobile`, `Desktop`, `Tablet`, plus browser family. Derived from **user-agent**, not hostname (see §8.1).

**3. Page-views bar chart** — one row per page, descending by views, each showing three numbers:

> `Index — 56 unique viewers · 200 views · 50%`

Percentage is that page's share of total views across the site.

**4. Pareto — most-clicked items.** Bars descending left→right, cumulative-% line on a right axis, 80 % reference line. Covers resume, project PDFs, YouTube links, tile expands, and tile links in one ranking. Answers "which 20 % of my content earns 80 % of the engagement."

**5. Pareto — time spent per page/section/tile.** Same form, ranked by dwell.

**6. Visits-over-time chart** — daily site visits as **bars**, with a **rolling 7-day average** overlaid as a trend line. Default window 6 months.

**7. Recent events table.** Last 100, filterable.

**8. Data-scope footer** — three timestamps, so no chart is ever read without knowing its provenance:
- `Last refreshed: <datetime>`
- `First recorded event: <datetime>`
- `Most recent event: <datetime>`

**Filters (apply to everything above):** date range `7d / 30d / 90d / 6mo / all`, event-type multi-select.

**Buttons:** `Refresh Data` (re-query, no mutation) and `Reset Metrics` (password-gated `POST /reset`, plus a typed confirmation — destructive and irreversible).

**Charts:** hand-rolled inline SVG. No Chart.js, no D3 — a Pareto, a pie, a bar chart, and a bar+trendline are ~40 lines of SVG each, and the constraint was "no heavy scripts." Implementation must follow the `dataviz` skill for color, axis, and legend conventions, and must render correctly in both light and dark mode.

### 8.1 Correction: there is no `m.tylerv11.github.io`

The spec asked to split mobile vs. desktop by hostname (`m.` vs `www.`). GitHub Pages serves a **single** hostname — there is no `m.` subdomain and no way to create one that serves different content. Splitting by hostname would report 100 % desktop forever.

Platform is instead derived server-side from the **User-Agent** header, which is how it's actually done and which additionally yields tablet and browser-family breakdowns the hostname approach couldn't give. The UA string itself is never stored — only the derived `device` bucket.

---

## 9. Implementation phases (for Sonnet)

**Phase 1 — Backend.** `worker/` scaffold, `schema.sql`, D1 create + bind, three routes, CORS lock, visitor hashing, retention prune. Verify with `curl` against `wrangler dev`.

**Phase 2 — Tracker.** `analytics.js` implementing §5 taxonomy + §6 exclusion. Wire into the three HTML pages. Verify events land in local D1.

**Phase 3 — Dashboard.** `admin/index.html`, password flow, `POST /stats`, all five widgets, filters, both buttons.

**Phase 4 — Localhost verification (gate before prod).**
- Serve the site locally, click through **real** interactions: open each PDF, click a YouTube link, navigate sections, dwell >5 s on a section, close the tab.
- Confirm each event type appears in D1 with correct `ms` values.
- Confirm `localStorage.isAdmin = 'true'` fully suppresses sending.
- Confirm a wrong password returns `401` **and** no data.
- **Screenshot** the dashboard with real (not seeded) data.
- Run Lighthouse before/after; confirm no performance regression.

**Phase 5 — Production.** Deploy Worker (`wrangler deploy`), set the secret, point `analytics.js` at the live URL, commit, push to `main`, verify on the live domain, screenshot.

**Phase 6 — Documentation.** `docs/ANALYTICS.md` runbook: how to deploy, rotate the password, query D1 by hand, interpret each chart, and what to do when numbers look wrong. Update `docs/IDEAS.md`.

**Gate:** Phase 5 does not start until Phase 4 screenshots exist and show real data.

---

## 10. Cost & limits

| Resource | Free tier | Portfolio's realistic use | Headroom |
|---|---|---|---|
| Worker requests | 100 k/day | < 500/day | 200× |
| D1 rows written | 100 k/day | < 500/day | 200× |
| D1 rows read | 5 M/day | ~2 k/dashboard load | huge |
| D1 storage | 5 GB | ~50 MB after 5 years | 100× |

**Projected cost: $0/month.** No credit card required for any of it. Realistically this stays free permanently at portfolio traffic levels.

---

## 11. Open items

1. ~~**Resume PDF**~~ — **resolved.** Copied from `/Volumes/1TBExternal/shared/2026 Tyler Vincent.pdf` to `files/TylerVincent-Resume.pdf` (42 KB). Sonnet must still add a visible link to it in `index.html`.
2. **Ideas doc** — the `future-ideas.md` referenced is in the **hermes-events** repo and is Hermes-specific. The website repo has no ideas backlog. Plan creates `docs/IDEAS.md` seeded with the ideas from this session.
3. **`domain-strategy.md` is untracked** — sitting uncommitted in the repo root. Unrelated to this work, but worth committing or removing so it isn't lost.
4. **Custom domain** — if `sladestudio.us` (per `domain-strategy.md`) ever fronts this site, the Worker CORS allowlist needs the new origin added.

---

## 12. Ideas backlog seeded from this session

Career-site-specific analytics ideas worth building *after* the base pipeline works:

- **Recruiter-signal scoring** — weight events by hiring intent (resume open ≫ YouTube click ≫ scroll). One composite "engagement quality" number per visit rather than raw click counts.
- **Referrer attribution** — bucket traffic by source host (LinkedIn / Indeed / direct / email). Tells you which application channel actually sends people to the site, which is the highest-leverage thing to know when job hunting.
- **Scroll-depth per project tile** — which projects get read vs. scrolled past. Directly actionable for reordering the page.
- **Drop-off funnel** — landing → project view → resume open. Shows exactly where interest dies.
- **Time-of-day heatmap** — when recruiters actually browse; useful for timing application sends.
- **Weekly digest** — reuse the existing OpenRouter Worker to summarize the week's engagement in plain English and email/Discord it. Ties into the Hermes cron infrastructure already running.
