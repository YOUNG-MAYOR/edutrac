// ============================================================
//  EduTrack NG v2 — api/auth.js
//  Unified Auth Guard: checks login status, role vs folder,
//  redirects instantly on mismatch
// ============================================================

// Map each role to its portal folder
const ROLE_PORTALS = {
  admin:        '/portals/admin/',
  exam_officer: '/portals/academic-office/',
  vp_academic:  '/portals/academic-office/',
  vp_admin:     '/portals/admin-office/',
  registrar:    '/portals/admin-office/',
  accountant:   '/portals/bursary/',
  bursary:      '/portals/bursary/',
  teacher:      '/portals/staff/',
  parent:       '/portals/parent/',
  student:      '/portals/student/',
  saas_owner:   '/saas-console/',
};

// Which roles are allowed in each portal folder
const PORTAL_ALLOWED_ROLES = {
  '/portals/admin/':           ['admin', 'saas_owner'],
  '/portals/academic-office/': ['exam_officer', 'vp_academic', 'admin'],
  '/portals/admin-office/':    ['vp_admin', 'registrar', 'admin'],
  '/portals/bursary/':         ['accountant', 'bursary', 'admin'],
  '/portals/staff/':           ['teacher', 'admin'],
  '/portals/parent/':          ['parent'],
  '/portals/student/':         ['student'],
  '/saas-console/':            ['saas_owner'],
};

// ── Main Auth Guard ────────────────────────────────────────────
// Call at top of every portal page. Returns user or null.
// Pass explicit allowedRoles to override folder-based check.
async function authGuard(allowedRoles = null) {
  const session = await db.auth.getSession().then(r => r.data.session);

  if (!session) {
    _redirectToLogin();
    return null;
  }

  const { data: user } = await db.from('users')
    .select('*, schools(*)')
    .eq('id', session.user.id)
    .single();

  if (!user) { _redirectToLogin(); return null; }
  if (user.is_active === false) { await db.auth.signOut(); _redirectToLogin(); return null; }

  // Determine allowed roles: explicit override, or from current path
  const roles = allowedRoles || _getRolesForCurrentPath();

  if (roles.length && !roles.includes(user.role)) {
    // Wrong portal — redirect to the correct one
    const correctPortal = ROLE_PORTALS[user.role];
    if (correctPortal) {
      window.location.href = correctPortal + 'index.html';
    } else {
      _redirectToLogin();
    }
    return null;
  }

  return user;
}

// ── Login page: redirect if already authed ─────────────────────
async function redirectIfLoggedIn() {
  const session = await db.auth.getSession().then(r => r.data.session);
  if (!session) return;
  const { data: user } = await db.from('users').select('role,is_active').eq('id', session.user.id).single();
  if (!user || !user.is_active) return;
  const portal = ROLE_PORTALS[user.role];
  if (portal) window.location.href = portal + 'index.html';
}

// ── Role-based redirect after login ───────────────────────────
function redirectByRole(role) {
  const portal = ROLE_PORTALS[role];
  window.location.href = portal ? portal + 'index.html' : '/login.html';
}

// ── Logout ─────────────────────────────────────────────────────
async function logout() {
  // Clear SW portal cache so next user on same device sees nothing
  if (typeof clearPortalCacheOnLogout === 'function') clearPortalCacheOnLogout();
  try { localStorage.removeItem('user'); sessionStorage.removeItem('user'); } catch {}
  await db.auth.signOut();
  window.location.href = '/login.html';
}

// ── Student Portal Auth (PIN-based, no Supabase auth) ──────────
function getStudentSession() {
  try {
    const s = sessionStorage.getItem('et_student_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function requireStudentAuth() {
  const s = getStudentSession();
  if (!s) { window.location.href = '/portals/student/login.html'; return null; }
  if (Date.now() - new Date(s.logged_in_at).getTime() > 8 * 60 * 60 * 1000) {
    sessionStorage.removeItem('et_student_session');
    window.location.href = '/portals/student/login.html';
    return null;
  }
  return s;
}

function studentLogout() {
  sessionStorage.removeItem('et_student_session');
  window.location.href = '/login.html';
}

// ── Private Helpers ────────────────────────────────────────────
function _redirectToLogin() {
  window.location.href = '/login.html';
}

function _getRolesForCurrentPath() {
  const path = window.location.pathname;
  for (const [folder, roles] of Object.entries(PORTAL_ALLOWED_ROLES)) {
    if (path.includes(folder)) return roles;
  }
  return [];
}
