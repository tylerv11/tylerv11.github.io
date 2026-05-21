const CACHE_VERSION = 'tv-portfolio-v2';
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
//   - HTML pages                   → stale-while-revalidate
//   - Everything else              → network-first
self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

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
    // Stale-while-revalidate for HTML
    event.respondWith(
      caches.open(PAGE_CACHE).then(function(cache) {
        return cache.match(req).then(function(cached) {
          var fresh = fetch(req).then(function(res) {
            if (res.ok) cache.put(req, res.clone());
            return res;
          }).catch(function() { return cached; });
          return cached || fresh;
        });
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
