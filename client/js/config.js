/**
 * EduTrack NG — Client Configuration
 *
 * API_BASE_URL:
 *   - In development, leave as empty string '' so that fetch('/api/...')
 *     hits the Express server which also serves these static files.
 *   - If you deploy the client separately (e.g. a CDN), set this to
 *     your Express server's full URL, e.g. 'https://api.yourschool.com'.
 */
window.__EDUTRAC_CONFIG__ = {
  SUPABASE_URL:      'https://nbgdjwuoiglkrmdeezsk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZ2Rqd3VvaWdsa3JtZGVlenNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODM5ODgsImV4cCI6MjA4OTc1OTk4OH0.x2pGldYnTMZSNMARQ2H4IBIWrUL2OtVQVOoWzkhU_Xg',

  // Base URL for the Express backend. Empty string = same origin (recommended).
  // Change to 'http://localhost:5000' only if serving the client from a
  // different port (e.g. VS Code Live Server during development).
  API_BASE_URL: '',
};

// ── Validate at load time ─────────────────────────────────────────
(function () {
  const cfg = window.__EDUTRAC_CONFIG__;
  const missing = [];
  if (!cfg.SUPABASE_URL      || cfg.SUPABASE_URL.startsWith('REPLACE_'))      missing.push('SUPABASE_URL');
  if (!cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.startsWith('REPLACE_')) missing.push('SUPABASE_ANON_KEY');

  if (missing.length) {
    const msg =
      '❌ EduTrack NG — Missing configuration: ' + missing.join(', ') + '.\n' +
      'Open client/js/config.js and fill in the real values.';
    console.error(msg);
    document.addEventListener('DOMContentLoaded', function () {
      const banner = document.createElement('div');
      banner.style.cssText =
        'position:fixed;top:0;left:0;right:0;z-index:99999;' +
        'background:#c0392b;color:#fff;font-family:monospace;' +
        'font-size:13px;padding:12px 16px;white-space:pre-wrap;';
      banner.textContent = msg;
      document.body.prepend(banner);
    });
  }
})();
