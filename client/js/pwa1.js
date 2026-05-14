// ============================================================
//  EduTrack NG — PWA Registration & Offline Status
// ============================================================

// Register Service Worker — always use absolute path so it works at any folder depth
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] Service worker registered:', reg.scope);

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    } catch (err) {
      console.log('[PWA] Service worker registration failed:', err);
    }
  });
}

// ── Online/Offline Status Bar ────────────────────────────────
function showOfflineBar() {
  if (document.getElementById('et-offline-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'et-offline-bar';
  bar.innerHTML = `
    <div style="
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: #dc2626; color: white;
      padding: 10px 16px; text-align: center;
      font-size: 13px; font-weight: 600;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      animation: slideUp 0.3s ease;
    ">
      <span style="font-size:16px;">(sync)</span>
      You are offline. The app is still usable — data will sync when connection returns.
    </div>
  `;
  document.body.appendChild(bar);
}

function hideOfflineBar() {
  const bar = document.getElementById('et-offline-bar');
  if (bar) bar.remove();
  // Show reconnected toast
  if (typeof toast === 'function') {
    toast('Back online! Data is syncing…', 'success');
  }
}

// Listen for online/offline events
window.addEventListener('offline', showOfflineBar);
window.addEventListener('online', hideOfflineBar);

// Check on load
if (!navigator.onLine) {
  window.addEventListener('DOMContentLoaded', showOfflineBar);
}

// ── Update Banner ─────────────────────────────────────────────
function showUpdateBanner() {
  if (document.getElementById('et-update-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'et-update-bar';
  bar.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: #0a6e3f; color: white;
      padding: 10px 16px; text-align: center;
      font-size: 13px; font-weight: 600;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      display: flex; align-items: center; justify-content: center; gap: 12px;
    ">
      <span>(refresh) New version of EduTrack NG available!</span>
      <button onclick="window.location.reload()" style="
        background: white; color: #0a6e3f; border: none;
        padding: 5px 14px; border-radius: 6px; font-weight: 700;
        font-size: 12px; cursor: pointer; font-family: inherit;
      ">Update Now</button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: transparent; color: rgba(255,255,255,0.7); border: none;
        font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;
      ">×</button>
    </div>
  `;
  document.body.appendChild(bar);
}

// ── Install Prompt (Add to Home Screen) ──────────────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install button if it exists on the page
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.style.display = 'flex';
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
  }
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] EduTrack NG installed as app!');
  deferredPrompt = null;
  if (typeof toast === 'function') {
    toast('EduTrack NG installed! Open from your home screen.', 'success');
  }
});
