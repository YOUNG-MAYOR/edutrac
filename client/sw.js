// ============================================================
//  EduTrack NG — Service Worker v2.1 (ISSUE D-04 fix)
//  Offline-first caching + Background Sync for queued writes
//  ─────────────────────────────────────────────────────────────
//  Strategy:
//   • Truly public assets (login, offline, shared CSS/JS) → Cache-first
//   • Supabase API (data)      → Network-only (bypass cache)
//   • CDN assets (fonts, libs) → Cache-first with 7-day TTL
//   • Role-specific portal HTML → NEVER cached (no-store)
//     Covers: /admin/*, /portals/staff/*, /portals/academic-office/*,
//             /portals/bursary/*, /portals/admin-office/*,
//             /portals/parent/*, /portals/student/* (except login),
//             /report-card/*
//
//  ISSUE D-04 rationale:
//    Caching portal HTML in the SW means ANY browser that has visited
//    an admin/staff/report-card page serves that HTML shell from cache
//    AFTER logout — leaking UI structure and feature existence to
//    subsequent users on the same device. Auth checks are in JS and run
//    after the HTML is already delivered; the HTML itself must never be
//    cached by the SW.
//
//  Background Sync:
//   • Tag: 'edutrack-sync'
//   • When online is restored after offline queuing, the SW
//     wakes and notifies open tabs to run SyncEngine.push()
// ============================================================

const CACHE_VERSION = 'edutrack-v2.2';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const CDN_CACHE     = `${CACHE_VERSION}-cdn`;

// ── PUBLIC shell: only truly unauthenticated / shared assets ──
// Role-specific portal pages are intentionally NOT listed here.
// They carry Cache-Control: no-store from the server (netlify.toml)
// AND the SW will refuse to cache them even if somehow requested.
const APP_SHELL = [
  '/',
  '/index.html',
  '/login.html',
  '/offline.html',
  '/manifest.json',

  // Shared CSS & JS — safe to cache, contain no auth-gated UI
  '/css/global.css',
  '/assets/css/global.css',
  '/js/supabase.js',
  '/js/layout.js',
  '/js/sync-engine.js',
  '/js/notifications.js',
  '/js/pwa.js',
  '/api/database.js',
  '/api/auth.js',
  '/api/calculations.js',
  '/assets/js/sidebar.js',
];

// CDN assets to cache (external libraries)
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap',
];

// ── Role-gated paths — NEVER cache these HTML pages ──────────
// Matched as prefix; any URL starting with one of these is network-only,
// no-store. The one exception is the student public login page which is
// unauthenticated but handled separately below.
const PROTECTED_PREFIXES = [
  '/admin/',
  '/portals/staff/',
  '/portals/academic-office/',
  '/portals/bursary/',
  '/portals/admin-office/',
  '/portals/parent/',
  '/portals/student/',   // includes index, results, attendance, fees, profile
  '/report-card/',
  '/saas-console/',
  '/saas-console/index.html',
  '/saas-console/schools.html',
  '/saas-console/school-detail.html',
  '/saas-console/users.html',
  '/saas-console/billing.html',
  '/saas-console/scratch-cards.html',
  '/saas-console/card-history.html',
  '/saas-console/announcements.html',
  '/saas-console/audit.html',
];

// Student portal public login page — unauthenticated, safe to cache
const STUDENT_PUBLIC_PAGES = [
  '/portals/student/login.html',
];

function isProtectedPath(url) {
  const path = new URL(url).pathname;
  // Allow the student public login page explicitly
  if (STUDENT_PUBLIC_PAGES.some(p => path === p || path.endsWith(p))) return false;
  return PROTECTED_PREFIXES.some(prefix => path.startsWith(prefix));
}

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW v2.1] Installing…');
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then(cache =>
        Promise.allSettled(
          APP_SHELL.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] Shell cache miss: ${url}`, err.message)
            )
          )
        )
      ),
      caches.open(CDN_CACHE).then(cache =>
        Promise.allSettled(
          CDN_ASSETS.map(url =>
            cache.add(url).catch(err =>
              console.warn(`[SW] CDN cache miss: ${url}`, err.message)
            )
          )
        )
      ),
    ]).then(() => {
      console.log('[SW v2.1] Public shell cached. Role-gated pages excluded.');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW v2.1] Activating…');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== CDN_CACHE)
          .map(k => {
            console.log('[SW v2.1] Purging old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET — let them pass through to network
  if (request.method !== 'GET') return;

  // 2. Skip Supabase API calls — always network (live data)
  if (url.hostname.includes('supabase.co')) return;

  // 3. Skip chrome-extension and non-http
  if (!url.protocol.startsWith('http')) return;

  // 4. ISSUE D-04: Role-specific portal HTML — NEVER serve from cache.
  //    Respond with a network-only fetch that sets no-store so browsers
  //    and any intermediate cache also refuse to store it.
  if (isProtectedPath(request.url) &&
      (request.destination === 'document' || request.mode === 'navigate')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() =>
        // If offline and they try to hit a portal page, send them to login
        caches.match('/login.html').then(r => r || caches.match('/offline.html'))
      )
    );
    return;
  }

  // 5. CDN assets — cache-first (long TTL)
  if (CDN_ASSETS.some(a => request.url.startsWith(new URL(a).origin))) {
    event.respondWith(
      caches.match(request, { cacheName: CDN_CACHE }).then(cached => {
        if (cached) return cached;
        return fetch(request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CDN_CACHE).then(c => c.put(request, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 6. Public navigation (HTML pages) — cache-first, stale-while-revalidate
  //    Fallback: login.html (safer than offline.html for auth flows)
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchAndCache = fetch(request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(SHELL_CACHE).then(c => c.put(request, clone));
          }
          return resp;
        }).catch(() => null);

        if (cached) {
          fetchAndCache; // fire-and-forget background update
          return cached;
        }
        return fetchAndCache.then(resp => {
          if (resp) return resp;
          return caches.match('/offline.html') || caches.match('/login.html');
        });
      })
    );
    return;
  }

  // 7. All other GET (CSS, JS, images) — cache-first, stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchAndCache = fetch(request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(SHELL_CACHE).then(c => c.put(request, clone));
        }
        return resp;
      }).catch(() => null);

      return cached || fetchAndCache;
    })
  );
});

// ── BACKGROUND SYNC ──────────────────────────────────────────
self.addEventListener('sync', event => {
  console.log('[SW v2.1] Background sync:', event.tag);
  if (event.tag === 'edutrack-sync') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length === 0) {
    console.log('[SW v2.1] No open tabs — sync will happen on next open');
    return;
  }
  for (const client of clients) {
    client.postMessage({ type: 'BACKGROUND_SYNC', tag: 'edutrack-sync' });
  }
  console.log(`[SW v2.1] Notified ${clients.length} tab(s) to sync`);
}

// ── PUSH NOTIFICATIONS ───────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'EduTrack NG', body: event.data.text() }; }

  const options = {
    body:    data.body   || 'You have a new notification',
    icon:    data.icon   || '/icons/icon-192.png',
    badge:   data.badge  || '/icons/icon-72.png',
    tag:     data.tag    || 'edutrack',
    data:    data.data   || {},
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'EduTrack NG', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── MESSAGE HANDLER (from tabs) ──────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    // Only cache URLs that are not in protected paths
    const safe = (event.data.urls || []).filter(u => !isProtectedPath(u));
    caches.open(SHELL_CACHE).then(cache => cache.addAll(safe));
  }
});

