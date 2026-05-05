// ============================================================
//  EduTrack NG — Supabase Client & Shared Utilities
//  Credentials are loaded from js/config.js (never hardcoded here)
// ============================================================
const SUPABASE_URL      = (window.__EDUTRAC_CONFIG__ || {}).SUPABASE_URL;
const SUPABASE_ANON_KEY = (window.__EDUTRAC_CONFIG__ || {}).SUPABASE_ANON_KEY;

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Path Helpers ─────────────────────────────────────────────
// Returns correct relative path to root based on actual folder depth
function getRootPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  return depth <= 1 ? './' : '../'.repeat(depth - 1);
}

// ── Auth Helpers ─────────────────────────────────────────────
async function getSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}

async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await db.from('users')
    .select('*, schools(*)')
    .eq('id', session.user.id)
    .single();
  return data;
}

async function requireAuth(allowedRoles = []) {
  const session = await getSession();
  if (!session) { window.location.href = '/login.html'; return null; }
  const user = await getCurrentUser();
  if (!user) { window.location.href = '/login.html'; return null; }
  if (user.is_active === false) {
    await db.auth.signOut();
    window.location.href = '/login.html'; return null;
  }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = '/login.html'; return null;
  }
  return user;
}

// Single authoritative logout — absolute path, no getRootPath() ambiguity
async function logout() {
  await db.auth.signOut();
  window.location.href = '/login.html';
}

// ── Notification Toast ───────────────────────────────────────
function toast(message, type = 'success') {
  const existing = document.getElementById('et-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'et-toast';
  // Sanitize type to only allow safe CSS class characters
  t.className = 'et-toast et-toast--' + String(type).replace(/[^a-zA-Z0-9_-]/g, '');
  const span = document.createElement('span');
  span.textContent = message; // textContent prevents XSS — no HTML parsing
  t.appendChild(span);
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('et-toast--show'), 10);
  setTimeout(() => { t.classList.remove('et-toast--show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Format Helpers ───────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '₦0';
  return '₦' + Number(amount).toLocaleString('en-NG');
}

function formatPercent(val, total) {
  if (!total) return '0%';
  return Math.round((val / total) * 100) + '%';
}

function gradeFromScale(score, scale) {
  if (!scale || !scale.length) return { grade: '—', remark: '—' };
  const match = scale.find(s => score >= s.min_score && score <= s.max_score);
  return match || { grade: 'F9', remark: 'Fail' };
}

// ── Loading / Empty / Error ──────────────────────────────────
function showLoader(container, message = 'Loading…') {
  if (typeof container === 'string') container = document.querySelector(container);
  if (!container) return;
  container.innerHTML = '';
  const loader = document.createElement('div');
  loader.className = 'et-loader';
  const spinner = document.createElement('div');
  spinner.className = 'et-spinner';
  loader.appendChild(spinner);
  const p = document.createElement('p');
  p.textContent = message; // textContent prevents XSS
  loader.appendChild(p);
  container.appendChild(loader);
}

function showError(container, message) {
  if (typeof container === 'string') container = document.querySelector(container);
  if (!container) return;
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'et-empty';
  const icon = document.createElement('div');
  icon.className = 'et-empty__icon';
  icon.textContent = '⚠️';
  wrap.appendChild(icon);
  const p = document.createElement('p');
  p.textContent = message; // textContent prevents XSS
  wrap.appendChild(p);
  container.appendChild(wrap);
}

function showEmpty(container, message, icon = '(empty)') {
  if (typeof container === 'string') container = document.querySelector(container);
  if (!container) return;
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'et-empty';
  const iconEl = document.createElement('div');
  iconEl.className = 'et-empty__icon';
  iconEl.textContent = icon; // textContent prevents XSS
  wrap.appendChild(iconEl);
  const p = document.createElement('p');
  p.textContent = message; // textContent prevents XSS
  wrap.appendChild(p);
  container.appendChild(wrap);
}

// ── Modal Helpers ────────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) closeModal(e.target.id);
});
