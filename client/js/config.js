window.__EDUTRAC_CONFIG__ = {
  SUPABASE_URL:      'https://nbgdjwuoiglkrmdeezsk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iZ2Rqd3VvaWdsa3JtZGVlenNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODM5ODgsImV4cCI6MjA4OTc1OTk4OH0.x2pGldYnTMZSNMARQ2H4IBIWrUL2OtVQVOoWzkhU_Xg',  // ← paste your real eyJ... key here
};

// Validate at load time so every page fails loudly if config is missing
(function () {
  const cfg = window.__EDUTRAC_CONFIG__;
  const missing = [];
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.startsWith('REPLACE_'))
    missing.push('SUPABASE_URL');
  if (!cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.startsWith('REPLACE_'))
    missing.push('SUPABASE_ANON_KEY');

  if (missing.length) {
    const msg =
      '❌ EduTrack NG — Missing configuration: ' + missing.join(', ') + '.\n' +
      'Open js/config.js and follow the instructions at the top of the file.';
    console.error(msg);
    // Surface the error visibly so it is never silently swallowed
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

