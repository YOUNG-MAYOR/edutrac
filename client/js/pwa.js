// ============================================================
//  EduTrack NG — PWA Manager  (js/pwa.js)
//  Handles: SW registration & updates, offline pill banner,
//           SyncEngine auto-init, logout cache clearing
// ============================================================

// ── Service Worker Registration ───────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] SW registered:', reg.scope);

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'BACKGROUND_SYNC') {
          window._eduSyncEngine?.push().catch(console.warn);
        }
      });

      // Show update banner when a new SW version is waiting
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    } catch (err) {
      console.warn('[PWA] SW registration failed:', err);
    }
  });
}

// ── Logout helper — clears portal cache in SW ─────────────────
window.clearPortalCacheOnLogout = function () {
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_PORTAL_CACHE' });
    }
  } catch {}
};

// ── SyncEngine Auto-Init ──────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(tryInitSyncEngine, 1500);
});

async function tryInitSyncEngine() {
  if (window._eduSyncEngine) return;
  if (typeof SyncEngine === 'undefined' || typeof window._supabase === 'undefined') return;
  let schoolId = null;
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    const u = raw ? JSON.parse(raw) : null;
    schoolId = u?.school_id || u?.schools?.id || null;
  } catch {}
  if (!schoolId) return;
  try {
    const engine = new SyncEngine(window._supabase, schoolId);
    await engine.init();
    window._eduSyncEngine = engine;
    if (navigator.onLine) engine.pull().catch(e => console.warn('[Sync] Pull:', e));
    console.log('[PWA] SyncEngine initialised for school:', schoolId);
  } catch (e) {
    console.warn('[PWA] SyncEngine init failed:', e);
  }
}

// ─────────────────────────────────────────────────────────────
//  OFFLINE PILL BANNER
//  • Compact floating chip — does NOT cover page content
//  • Appears at bottom-centre; slides up from edge
//  • On mobile: 100% width strip only 40px tall (smaller font)
//  • Auto-hides after 8 s with a close (×) button
//  • Reappears permanently after 2 dismissed attempts
// ─────────────────────────────────────────────────────────────

const PILL_ID     = 'et-offline-pill';
const UPDATE_ID   = 'et-update-bar';
let _pillDismissCount = 0;
let _pillTimeout  = null;

const PILL_STYLES = `
  #${PILL_ID} {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%) translateY(0);
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(30, 30, 40, 0.92);
    color: #fbbf24;
    border: 1px solid rgba(251,191,36,0.35);
    border-radius: 999px;
    padding: 9px 16px 9px 14px;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 600;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(251,191,36,0.1);
    white-space: nowrap;
    max-width: calc(100vw - 32px);
    animation: pillSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
    transition: opacity 0.25s, transform 0.25s;
  }
  #${PILL_ID}.hiding {
    opacity: 0;
    transform: translateX(-50%) translateY(16px);
  }
  #${PILL_ID} .pill-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #f59e0b;
    flex-shrink: 0;
    animation: pillBlink 1.8s ease-in-out infinite;
  }
  #${PILL_ID} .pill-text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  #${PILL_ID} .pill-close {
    background: none; border: none; cursor: pointer;
    color: rgba(251,191,36,0.6); font-size: 16px; line-height: 1;
    padding: 0 0 0 4px; margin: 0; flex-shrink: 0;
    transition: color 0.15s;
  }
  #${PILL_ID} .pill-close:hover { color: #fbbf24; }
  @keyframes pillSlideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes pillBlink {
    0%,100% { opacity: 1; } 50% { opacity: 0.3; }
  }
  @media (max-width: 480px) {
    #${PILL_ID} {
      bottom: 0;
      left: 0;
      right: 0;
      transform: none;
      border-radius: 12px 12px 0 0;
      width: 100%;
      max-width: 100%;
      justify-content: center;
      font-size: 12px;
      padding: 10px 14px;
      border-left: none; border-right: none; border-bottom: none;
      animation: pillSlideUpMobile 0.3s ease both;
    }
    #${PILL_ID}.hiding {
      transform: translateY(100%);
    }
    @keyframes pillSlideUpMobile {
      from { opacity: 0; transform: translateY(100%); }
      to   { opacity: 1; transform: translateY(0); }
    }
  }
`;

function injectPillStyles() {
  if (document.getElementById('et-pill-styles')) return;
  const s = document.createElement('style');
  s.id = 'et-pill-styles';
  s.textContent = PILL_STYLES;
  document.head.appendChild(s);
}

function showOfflinePill() {
  injectPillStyles();
  clearTimeout(_pillTimeout);

  // Remove existing pill if present
  document.getElementById(PILL_ID)?.remove();

  const pill = document.createElement('div');
  pill.id = PILL_ID;
  pill.innerHTML = `
    <span class="pill-dot"></span>
    <span class="pill-text">You are offline — cached pages still work</span>
    <button class="pill-close" onclick="window._dismissOfflinePill()" title="Dismiss">×</button>
  `;
  document.body.appendChild(pill);

  // Auto-dismiss after 8 s (unless user has dismissed before — then stay)
  if (_pillDismissCount < 2) {
    _pillTimeout = setTimeout(() => window._dismissOfflinePill(true), 8000);
  }
}

window._dismissOfflinePill = function (auto = false) {
  clearTimeout(_pillTimeout);
  const pill = document.getElementById(PILL_ID);
  if (!pill) return;
  pill.classList.add('hiding');
  setTimeout(() => pill.remove(), 280);
  if (!auto) _pillDismissCount++;
};

function hideOfflinePill() {
  clearTimeout(_pillTimeout);
  const pill = document.getElementById(PILL_ID);
  if (!pill) return;
  pill.classList.add('hiding');
  setTimeout(() => pill.remove(), 280);
  _pillDismissCount = 0;

  // Let the user know they're back online via the existing toast() helper if available
  if (typeof toast === 'function') {
    toast('Back online!', 'success');
  } else {
    showOnlineToast();
  }

  // Push any queued offline writes
  window._eduSyncEngine?.push().catch(console.warn);
  window._eduSyncEngine?.pull().catch(console.warn);
}

function showOnlineToast() {
  injectPillStyles();
  const t = document.createElement('div');
  t.id = 'et-online-toast';
  t.style.cssText = `
    position:fixed;bottom:16px;left:50%;transform:translateX(-50%);
    z-index:9998;display:flex;align-items:center;gap:8px;
    background:rgba(5,46,22,0.92);color:#4ade80;
    border:1px solid rgba(74,222,128,0.3);border-radius:999px;
    padding:9px 18px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
    font-size:13px;font-weight:600;backdrop-filter:blur(10px);
    box-shadow:0 4px 24px rgba(0,0,0,0.4);
    animation:pillSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
  `;
  t.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0"></span> Back online!`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 2500);
}

// Attach listeners
window.addEventListener('offline', showOfflinePill);
window.addEventListener('online',  hideOfflinePill);

// Show immediately if starting offline
if (!navigator.onLine) {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', showOfflinePill);
  } else {
    showOfflinePill();
  }
}

// ── Update Banner ─────────────────────────────────────────────
function showUpdateBanner() {
  if (document.getElementById(UPDATE_ID)) return;
  const bar = document.createElement('div');
  bar.id = UPDATE_ID;
  bar.style.cssText = `
    position:fixed;bottom:16px;right:16px;z-index:9999;
    background:rgba(10,46,30,0.95);color:#4ade80;
    border:1px solid rgba(74,222,128,0.3);border-radius:14px;
    padding:12px 16px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
    font-size:13px;backdrop-filter:blur(12px);
    box-shadow:0 4px 24px rgba(0,0,0,0.4);
    display:flex;align-items:center;gap:12px;max-width:320px;
  `;
  bar.innerHTML = `
    <span style="font-size:20px">🔄</span>
    <div style="flex:1">
      <div style="font-weight:700;margin-bottom:2px">Update available</div>
      <div style="font-size:11px;color:#86efac;opacity:.8">New version of EduTrack NG is ready</div>
    </div>
    <button onclick="navigator.serviceWorker.controller?.postMessage({type:'SKIP_WAITING'});location.reload()" style="
      background:#0a6e3f;color:white;border:none;border-radius:8px;
      padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer;
      font-family:inherit;white-space:nowrap;
    ">Update</button>
    <button onclick="this.parentElement.remove()" style="
      background:none;border:none;color:rgba(74,222,128,.5);
      font-size:18px;cursor:pointer;padding:0;line-height:1;
    ">×</button>
  `;
  document.body.appendChild(bar);
}

// ── Install Prompt ────────────────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) {
    btn.style.display = 'flex';
    btn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      btn.style.display = 'none';
    });
  }
});
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; });
