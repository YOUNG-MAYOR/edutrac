// ============================================================
//  EduTrack NG — Service Worker v3.1
//  ─────────────────────────────────────────────────────────
//  BUGS FIXED vs v3.0:
//   ① resp.clone() now called synchronously (before any async)
//     so the body stream is never consumed before cloning.
//   ② Portal pages cached by PATHNAME only (no query string),
//     so report-cards.html?class=X always hits the cache even
//     if the user navigated with a different ?class= param.
//   ③ stale-while-revalidate uses same synchronous-clone fix.
//
//  Strategies:
//   APP_SHELL  → cache-first, pre-cached on install
//   Portal HTML → network-first; stored by pathname; served
//                 from PORTAL_CACHE when offline; cleared on
//                 CLEAR_PORTAL_CACHE (logout)
//   Supabase   → always network (data comes from IndexedDB
//                 via SyncEngine when offline)
//   CDN        → cache-first
//   JS/CSS/img → stale-while-revalidate
// ============================================================

const SW_VERSION    = 'v3.1';
const SHELL_CACHE   = `edutrack-${SW_VERSION}-shell`;
const PORTAL_CACHE  = `edutrack-${SW_VERSION}-portal`;
const CDN_CACHE     = `edutrack-${SW_VERSION}-cdn`;

// ── Pre-cached shell assets ───────────────────────────────────
const APP_SHELL = [
  '/',
  '/index.html',
  '/login.html',
  '/offline.html',
  '/manifest.json',
  // ★ config.js MUST be here — contains Supabase URL + anon key
  '/js/config.js',
  '/js/supabase.js',
  '/js/pwa.js',
  '/js/sync-engine.js',
  '/js/layout.js',
  '/js/notifications.js',
  '/js/ai-assistant.js',
  '/api/database.js',
  '/api/auth.js',
  '/api/calculations.js',
  '/assets/js/sidebar.js',
  '/assets/css/global.css',
  '/css/global.css',
];

// CDN origins to cache
const CDN_ORIGINS = [
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Portal URL-path prefixes (all treated as portal pages)
const PORTAL_PREFIXES = [
  '/portals/',
  '/admin/',
  '/report-card/',
  '/saas-console/',
];

// ── Helpers ───────────────────────────────────────────────────
const isPortalPage  = url => url.pathname !== '/portals/student/login.html'
                           && PORTAL_PREFIXES.some(p => url.pathname.startsWith(p));
const isSupabase    = url => url.hostname.includes('supabase.co');
const isCdn         = url => CDN_ORIGINS.includes(url.hostname);

/**
 * Returns a cache key Request using PATHNAME only (strips query
 * string) so ?class=X and ?class=Y both hit the same cached entry.
 */
function portalCacheKey(url) {
  return new Request(url.origin + url.pathname, { mode: 'same-origin' });
}

/**
 * Clone a Response synchronously right away, then fire-and-forget
 * the async cache write. The clone is captured before any awaits
 * so the body stream is still available.
 */
function cacheResponse(cacheName, cacheKey, response) {
  if (!response || !response.ok) return;
  const clone = response.clone(); // ← synchronous, body not yet consumed
  caches.open(cacheName).then(c => {
    c.put(cacheKey, clone).catch(e =>
      console.warn(`[SW ${SW_VERSION}] cache.put failed (${cacheName}):`, e.message)
    );
  });
}

// ── INSTALL ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log(`[SW ${SW_VERSION}] Installing…`);
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => Promise.allSettled(
        APP_SHELL.map(url =>
          c.add(url).catch(e => console.warn(`[SW] Shell miss: ${url}`, e.message))
        )
      ))
      .then(() => {
        console.log(`[SW ${SW_VERSION}] Shell cached (incl. config.js). Activating.`);
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log(`[SW ${SW_VERSION}] Activating…`);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== PORTAL_CACHE && k !== CDN_CACHE)
          .map(k => { console.log(`[SW ${SW_VERSION}] Purging stale cache:`, k); return caches.delete(k); })
      ))
      .then(() => {
        console.log(`[SW ${SW_VERSION}] Active. Claiming clients.`);
        return self.clients.claim();
      })
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  let url;
  try { url = new URL(request.url); } catch { return; }

  // Only handle GET requests over HTTP(S)
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // ── 1. Supabase — always network-only ────────────────────
  //    Offline data served from IndexedDB by the page's SyncEngine
  if (isSupabase(url)) return;

  // ── 2. CDN — cache-first ─────────────────────────────────
  if (isCdn(url)) {
    event.respondWith(handleCdn(request, url));
    return;
  }

  // ── 3. Portal HTML navigation — network-first + SW cache ─
  if (isPortalPage(url) &&
      (request.destination === 'document' || request.mode === 'navigate')) {
    event.respondWith(handlePortalNav(request, url));
    return;
  }

  // ── 4. Public navigation (/, /login.html…) — cache-first ─
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(handlePublicNav(request));
    return;
  }

  // ── 5. Sub-resources (JS, CSS, fonts, images) ────────────
  //    Stale-while-revalidate
  event.respondWith(handleSubResource(request));
});

// ── Strategy implementations ──────────────────────────────────

async function handleCdn(request, url) {
  const cached = await caches.match(request, { cacheName: CDN_CACHE });
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    cacheResponse(CDN_CACHE, request, resp);
    return resp;
  } catch {
    return cached || Response.error();
  }
}

async function handlePortalNav(request, url) {
  const key = portalCacheKey(url); // pathname-only cache key

  try {
    // Always try network first so the user gets fresh content when online
    const resp = await fetch(request);
    // ★ BUG FIX: clone() called synchronously here, before any await
    cacheResponse(PORTAL_CACHE, key, resp);
    return resp;
  } catch {
    // Offline (or server error) — serve cached shell
    const cached = await caches.match(key, { cacheName: PORTAL_CACHE });
    if (cached) {
      console.log(`[SW ${SW_VERSION}] Serving offline portal: ${url.pathname}`);
      return cached;
    }
    // Never visited while online — show helpful offline page
    const offlinePage = await caches.match('/offline.html', { cacheName: SHELL_CACHE });
    return offlinePage || new Response(
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
       <meta name="viewport" content="width=device-width,initial-scale=1">
       <title>Offline — EduTrack NG</title>
       <style>body{font-family:system-ui;background:#0d1117;color:#e2e8f0;display:flex;align-items:center;
       justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}
       .c{max-width:380px}h2{font-size:20px;margin-bottom:12px}
       p{color:#64748b;font-size:14px;line-height:1.6;margin-bottom:20px}
       a{display:inline-block;padding:10px 24px;background:#0a6e3f;color:white;
       border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
       </style></head><body><div class="c">
       <div style="font-size:48px;margin-bottom:16px">📶</div>
       <h2>You are offline</h2>
       <p>This page hasn't been cached yet.<br>
       Visit it once while connected so it works offline.</p>
       <a href="/offline.html">← Back to offline page</a>
       </div></body></html>`,
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function handlePublicNav(request) {
  const cached = await caches.match(request, { cacheName: SHELL_CACHE });
  // Background revalidate
  const networkPromise = fetch(request).then(resp => {
    cacheResponse(SHELL_CACHE, request, resp);
    return resp;
  }).catch(() => null);
  // Return cache immediately if available, else wait for network
  if (cached) { networkPromise; return cached; }
  return networkPromise.then(r => r || caches.match('/offline.html'));
}

async function handleSubResource(request) {
  const cached = await caches.match(request);
  // ★ BUG FIX: clone() called synchronously in the .then() before awaiting
  const networkPromise = fetch(request).then(resp => {
    if (resp && resp.status === 200 && resp.type !== 'opaque')
      cacheResponse(SHELL_CACHE, request, resp);
    return resp;
  }).catch(() => null);
  // Serve cached immediately, update in background
  if (cached) { networkPromise; return cached; }
  return networkPromise;
}

// ── MESSAGES ─────────────────────────────────────────────────
self.addEventListener('message', event => {
  const { type, urls } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Called on logout — clears cached portal shells
  if (type === 'CLEAR_PORTAL_CACHE') {
    console.log(`[SW ${SW_VERSION}] Clearing portal cache on logout…`);
    caches.delete(PORTAL_CACHE)
      .then(() => console.log(`[SW ${SW_VERSION}] Portal cache cleared.`));
    return;
  }

  // Dynamically warm additional non-Supabase URLs
  if (type === 'CACHE_URLS' && Array.isArray(urls)) {
    const safe = urls.filter(u => {
      try { return !isSupabase(new URL(u, self.location.origin)); } catch { return false; }
    });
    caches.open(SHELL_CACHE)
      .then(c => Promise.allSettled(safe.map(u => c.add(u).catch(() => {}))));
    return;
  }

  // Ping — used to check if SW is alive
  if (type === 'PING') {
    event.source?.postMessage({ type: 'PONG', version: SW_VERSION });
    return;
  }
});

// ── BACKGROUND SYNC ───────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'edutrack-sync') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          clients.forEach(c => c.postMessage({ type: 'BACKGROUND_SYNC' }));
          console.log(`[SW ${SW_VERSION}] BG sync — notified ${clients.length} tab(s).`);
        })
    );
  }
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let d;
  try { d = event.data.json(); } catch { d = { title: 'EduTrack NG', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(d.title || 'EduTrack NG', {
      body:    d.body    || 'You have a new notification',
      icon:    d.icon    || '/icons/icon-192.png',
      badge:              '/icons/icon-72.png',
      tag:     d.tag     || 'edutrack',
      data:    d.data    || {},
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
