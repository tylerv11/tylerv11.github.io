const CACHE_VERSION = 'tv-portfolio-v3';
const STATIC_CACHE = CACHE_VERSION + '-static';
const PAGE_CACHE   = CACHE_VERSION + '-pages';

const PRECACHE_STATIC = [
  '/favicon.svg',
  '/portfolio-assistant.js',
  '/video-wrap.css',
];

const PRECACHE_PAGES = [
  '/',
  '/index.html',
  '/about.html',
  '/education.html',
];

// Install: precache static shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(function(c) { return c.addAll(PRECACHE_STATIC); }),
      caches.open(PAGE_CACHE).then(function(c) { return c.addAll(PRECACHE_PAGES); }),
    ]).then(function() { return self.skipWaiting(); })
  );
});

// Activate: purge old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== STATIC_CACHE && k !== PAGE_CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// Fetch strategy:
//   - Images / fonts / cdn assets  → cache-first
//   - HTML pages                   → network-first (offline fallback only)
//   - Everything else              → network-first
self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

  // Analytics: never cache. The collector must always hit the network (fresh
  // beacons, no replay-from-cache), and the admin dashboard must never serve
  // stale metrics. Both are excluded before any other routing decision.
  var isAnalyticsWorker = /(^|\.)workers\.dev$/.test(url.hostname) ||
                           url.hostname === 'portfolio-analytics.workers.dev';
  var isAdminRoute = url.pathname === '/admin' || url.pathname.indexOf('/admin/') === 0;
  if (isAnalyticsWorker || isAdminRoute) return;

  // Only handle GET requests on our origin or whitelisted CDNs
  if (req.method !== 'GET') return;

  var isSameOrigin = url.origin === self.location.origin;
  var isCDN = url.hostname === 'cdnjs.cloudflare.com' ||
              url.hostname === 'fonts.googleapis.com' ||
              url.hostname === 'fonts.gstatic.com';

  if (!isSameOrigin && !isCDN) return;

  var isPage = isSameOrigin && (url.pathname.endsWith('.html') || url.pathname === '/');
  var isStatic = isSameOrigin && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp')
  );

  if (isPage) {
    // Network-first for HTML: visitors always get current content;
    // cache is only a fallback when offline.
    event.respondWith(
      fetch(req).then(function(res) {
        if (res.ok) {
          caches.open(PAGE_CACHE).then(function(cache) { cache.put(req, res.clone()); });
        }
        return res;
      }).catch(function() {
        return caches.open(PAGE_CACHE).then(function(cache) { return cache.match(req); });
      })
    );
  } else if (isStatic || isCDN) {
    // Cache-first for static assets
    event.respondWith(
      caches.open(STATIC_CACHE).then(function(cache) {
        return cache.match(req).then(function(cached) {
          if (cached) return cached;
          return fetch(req).then(function(res) {
            if (res.ok) cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
  }
});
