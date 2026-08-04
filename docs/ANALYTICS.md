# Portfolio analytics — runbook

How the click analytics on tylerv11.github.io works, and what to do when it
misbehaves. Design rationale lives in [ANALYTICS-PLAN.md](./ANALYTICS-PLAN.md);
this file is the operational half.

## The shape of it

```
tylerv11.github.io  ──POST /collect──▶  Cloudflare Worker  ──▶  D1 (SQLite)
   analytics.js                      portfolio-analytics          events table
                                              ▲
/admin  ──POST /stats (password)──────────────┘
```

| Piece | Where | Notes |
| --- | --- | --- |
| Tracker | `analytics.js` | ~120 lines, no dependencies, `defer`-loaded |
| Collector + API | `worker/analytics-worker.js` | Cloudflare Worker |
| Storage | D1 `portfolio-analytics` | `events` (400-day retention) + `devices` |
| Dashboard | `admin/index.html` | served at `/admin`, hand-rolled SVG charts |
| Health probe | `.github/workflows/analytics-health.yml` | weekdays 02:00 PT |

Worker URL: `https://portfolio-analytics.tylervincent-ai.workers.dev`
Cloudflare account: **tylervincent.ai@gmail.com** (not the account Hermes uses).

## Costs

Free. Workers free tier is 100k requests/day and D1 free tier is 5M row
reads/day; a personal portfolio uses a rounding error of both.

## Secrets

Nothing secret is in the repo.

| Secret | Lives in | Set with |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Worker secret | `wrangler secret put ADMIN_PASSWORD` |
| `HASH_SALT` | Worker secret | `wrangler secret put HASH_SALT` |
| `ANALYTICS_ADMIN_PASSWORD` | GitHub repo secret | `gh secret set ANALYTICS_ADMIN_PASSWORD` |

The GitHub secret is the same value as the Worker's `ADMIN_PASSWORD` — the
health check authenticates against `/stats`. **If you change the password,
change it in both places** or the daily check starts failing.

`worker/.dev.vars` (local dev only) is gitignored.

## Privacy

No cookies, no PII, no raw IP or user-agent stored. A visitor is identified by
`SHA-256(daily_salt + IP + UA)` truncated to 16 chars. The salt rotates daily,
so the same person on two different days is two different hashes — which is why
"unique viewers" over a long range reads high. This is the Plausible approach:
it makes cross-day tracking of an individual impossible by construction.

## Self-exclusion — how your own visits are kept out

Exclusion is **server-side**, keyed on a durable client id, so it follows you
across every browser you sign in from instead of living in one browser's
localStorage.

Each browser generates a random UUID once and keeps it in
`localStorage._av_cid`. It's a value the browser made up about itself — not a
fingerprint, no cross-site meaning, reset by clearing site data. Every event
carries it, and every client id that shows up lands in the `devices` table.

In the dashboard, **My Devices** opens a drawer listing every browser that has
ever visited, with platform, visit count and last-seen so you can tell them
apart. Name one and tick **Mine**, and its events stop counting toward your
metrics everywhere. **Show my sessions** in the toolbar brings them back into
view — the data is filtered, not discarded.

A browser that has declared itself admin (logging into `/admin`, or visiting any
page with `?admin=1`) is flagged as yours automatically on its first event, so
you normally don't have to touch the drawer at all.

`is_owner` is only ever raised by `/collect`, never lowered — so un-ticking a
device is not silently undone by its next pageview.

For a genuine hard opt-out that records nothing at all, set
`localStorage.trackingOff = 'true'` in that browser.

> **Why not key the exclusion on the visitor hash?** Because it's salted with a
> salt that rotates daily. The same phone is a different hash tomorrow, so an
> exclusion list keyed on it would appear to work and then quietly stop after 24
> hours. That's why the durable client id exists.

## Events collected

| Type | Fires when | `target` | `ms` |
| --- | --- | --- | --- |
| `pageview` | page load | — | — |
| `resume_view` | resume PDF clicked | `resume` | — |
| `pdf_view` | any other PDF clicked | filename | — |
| `youtube_click` | YouTube link clicked | video id | — |
| `tile_expand` | project tile opened | tile id | — |
| `tile_link` | link inside an open tile | `tile:host` | — |
| `outbound` | external link elsewhere | hostname | — |
| `nav` | in-page hash navigation | `#hash` | — |
| `section_dwell` | section held in view ≥5s | section id | dwell |
| `tile_dwell` | open tile held in view ≥5s | tile id | dwell |
| `page_time` | on page unload | — | engaged ms |

`page_time` counts only time with `visibilityState === 'visible'`, so a tab left
open in the background does not inflate it.

## Common tasks

```bash
cd worker

# What's in there right now
wrangler d1 execute portfolio-analytics --remote \
  --command "SELECT type, COUNT(*) n FROM events GROUP BY type ORDER BY n DESC;"

# Last 20 events
wrangler d1 execute portfolio-analytics --remote \
  --command "SELECT ts, type, target, page FROM events ORDER BY id DESC LIMIT 20;"

# Who's registered as a device, and which are marked yours
wrangler d1 execute portfolio-analytics --remote \
  --command "SELECT cid, label, is_owner, device FROM devices ORDER BY last_seen DESC;"

# Wipe everything (the dashboard's Reset Metrics button does the same)
wrangler d1 execute portfolio-analytics --remote --command "DELETE FROM events;"

# Back up before doing anything destructive
wrangler d1 export portfolio-analytics --remote --output backup.sql

# Ship a Worker change
wrangler deploy

# Run the health check on demand
gh workflow run analytics-health.yml
```

Dashboard changes are plain files on GitHub Pages — commit, push to `main`,
wait ~90s.

## Troubleshooting

**"I clicked around and nothing showed up."** In order of likelihood:

1. **You're excluded.** Open **My Devices** and check whether this browser is
   ticked as Mine, or just turn on **Show my sessions**. This is the most common
   cause by a wide margin.
2. **Cached script.** GitHub Pages serves `analytics.js` with an HTTP cache;
   after a deploy your browser may hold the old copy. Hard reload:
   `Cmd+Shift+R`.
3. **Actually broken.** Open DevTools → Network, filter `collect`, click
   something. A `204` means it landed. Then query D1 directly.

**Health check failing.** Read the run's summary in the Actions tab. `HTTP 401`
means the GitHub secret and the Worker secret have drifted apart. `HTTP 500`
usually means the D1 binding — check `wrangler.toml`'s `database_id`.

**Zero traffic warning.** Expected on a quiet week. The check warns rather than
fails on purpose, so it doesn't train you to ignore it.

## Two things worth knowing

**`sendBeacon` returns "queued", not "delivered".** The original tracker used
`navigator.sendBeacon()` first and returned early when it reported success. It
reported success for every event and delivered none — 100% silent data loss
that looked exactly like healthy code. The tracker now uses
`fetch(..., {keepalive: true})` first, which gives the same survives-unload
guarantee and actually reports failure. **If you touch `send()` in
`analytics.js`, verify against the live Worker that a row lands.** The daily
health check exists mostly to catch a regression of this class.

**`intersectionRatio` is a fraction of the element, not of the viewport.** A
section taller than 2× the viewport can never reach a 0.5 ratio no matter how
it's scrolled — `#work` is ~5458px against a ~1035px viewport, a hard ceiling of
0.19. Dwell would never have fired on it. `isEngaged()` handles both cases:
small elements qualify on their own ratio, tall ones qualify by filling the
viewport. Confirmed working in production — `section_dwell` and `tile_dwell`
rows arrive from real browsing. Note that it cannot be verified through browser
automation: an automated tab reports `visibilityState: 'hidden'` permanently,
and browsers don't run IntersectionObserver callbacks for a hidden tab, so dwell
will always look broken from a headless check. Test it by hand.
