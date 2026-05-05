// ============================================================
//  EduTrack NG v2 — api/database.js
//  Supabase client + all shared query helpers
//  Single source of truth for every DB call in the app
// ============================================================

const SUPABASE_URL      = (window.__EDUTRAC_CONFIG__ || {}).SUPABASE_URL;
const SUPABASE_ANON_KEY = (window.__EDUTRAC_CONFIG__ || {}).SUPABASE_ANON_KEY;

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Path Helper ────────────────────────────────────────────────
function getRootPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  return depth <= 1 ? './' : '../'.repeat(depth - 1);
}

// ── Auth Helpers ───────────────────────────────────────────────
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

// logout() is the single authoritative version in api/auth.js — not redeclared here

// ── Shared Queries ─────────────────────────────────────────────

// ── School Context Cache (ISSUE B-02 fix) ─────────────────────
// loadSchoolContext() fires 6 parallel DB queries on every page load.
// In low-bandwidth environments this means 6× round-trip latency per click.
// Fix: memoize in sessionStorage with a 5-minute TTL per school.
// Cache is busted automatically when:
//   • 5 minutes elapse (TTL timer)
//   • Admin calls bustSchoolContextCache(schoolId) after mutating
//     terms/classes/subjects/grading/dashSettings

const _CTX_TTL_MS = 5 * 60 * 1000; // 5 minutes

function _ctxCacheKey(schoolId) {
  return `school_ctx_v1_${schoolId}`;
}

function _ctxTimerKey(schoolId) {
  return `school_ctx_ttl_${schoolId}`;
}

function bustSchoolContextCache(schoolId) {
  if (!schoolId) return;
  try {
    sessionStorage.removeItem(_ctxCacheKey(schoolId));
    const tid = sessionStorage.getItem(_ctxTimerKey(schoolId));
    if (tid) { clearTimeout(Number(tid)); sessionStorage.removeItem(_ctxTimerKey(schoolId)); }
  } catch (_) { /* sessionStorage unavailable — ignore */ }
}

// School-wide bootstrap — call once per page, returns everything.
// Results are cached in sessionStorage for 5 minutes to eliminate
// repeated 6-query fan-outs on every navigation (ISSUE B-02).
async function loadSchoolContext(schoolId) {
  // 1. Try cache
  try {
    const raw = sessionStorage.getItem(_ctxCacheKey(schoolId));
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && cached._expires > Date.now()) {
        return cached;
      }
      // Expired — remove stale entry
      sessionStorage.removeItem(_ctxCacheKey(schoolId));
    }
  } catch (_) { /* sessionStorage unavailable or parse error — fall through */ }

  // 2. Cache miss — fire all 6 queries in parallel
  const [
    { data: term },
    { data: classes },
    { data: subjects },
    { data: terms },
    { data: grading },
    { data: dashSettings }
  ] = await Promise.all([
    db.from('terms').select('*').eq('school_id', schoolId).eq('is_current', true).maybeSingle(),
    db.from('classes').select('id,name,level,teacher_id,combination_id').eq('school_id', schoolId).order('name'),
    db.from('subjects').select('id,name,code').eq('school_id', schoolId).order('name'),
    db.from('terms').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
    db.from('grading_scales').select('*').eq('school_id', schoolId).order('min_score', { ascending: false }),
    db.from('dashboard_settings').select('*').eq('school_id', schoolId).maybeSingle()
  ]);

  const ctx = {
    term,
    classes:     classes     || [],
    subjects:    subjects    || [],
    terms:       terms       || [],
    grading:     grading     || [],
    dashSettings,
    _expires:    Date.now() + _CTX_TTL_MS,
  };

  // 3. Write to cache; schedule auto-removal at TTL expiry
  try {
    sessionStorage.setItem(_ctxCacheKey(schoolId), JSON.stringify(ctx));
    const tid = setTimeout(() => {
      sessionStorage.removeItem(_ctxCacheKey(schoolId));
      sessionStorage.removeItem(_ctxTimerKey(schoolId));
    }, _CTX_TTL_MS);
    // Store timer ID so bustSchoolContextCache() can cancel it
    sessionStorage.setItem(_ctxTimerKey(schoolId), String(tid));
  } catch (_) { /* sessionStorage full or unavailable — just return fresh data */ }

  return ctx;
}

// All classes for a teacher (form teacher + subject assignments merged)
async function getTeacherClasses(teacherId, schoolId, termId = null) {
  const [{ data: formClasses }, { data: subjectAssignments }] = await Promise.all([
    db.from('classes').select('id,name,level').eq('teacher_id', teacherId).eq('school_id', schoolId),
    db.from('class_subjects')
      .select('class_id,subject_id,term_id,classes(id,name,level),subjects(id,name,code)')
      .eq('teacher_id', teacherId).eq('school_id', schoolId)
  ]);

  let assignments = subjectAssignments || [];
  if (termId) assignments = assignments.filter(a => a.term_id === termId);
  else assignments = assignments.filter((a, i, arr) => arr.findIndex(x => x.class_id === a.class_id && x.subject_id === a.subject_id) === i);

  const classMap = {};
  (formClasses || []).forEach(c => {
    classMap[c.id] = { ...c, subjects: [], subjectIds: new Set(), isFormTeacher: true };
  });
  assignments.forEach(a => {
    if (!a.classes) return;
    if (!classMap[a.class_id]) classMap[a.class_id] = { id: a.class_id, name: a.classes.name, level: a.classes.level || '', subjects: [], subjectIds: new Set(), isFormTeacher: false };
    if (a.subjects?.id && !classMap[a.class_id].subjectIds.has(a.subject_id)) {
      classMap[a.class_id].subjects.push({ id: a.subjects.id, name: a.subjects.name, code: a.subjects.code || '' });
      classMap[a.class_id].subjectIds.add(a.subject_id);
    }
  });
  return Object.values(classMap);
}

// Students enrolled in a specific class for a term.
// After ISSUE A-01 fix: unique constraint is now (student_id, class_id, term_id),
// allowing SS3 multi-class students. Always filter by class_id to get the correct roster.
async function getEnrolledStudents(classId, termId, schoolId) {
  const { data } = await db.from('enrollments')
    .select('student_id, students(id,full_name,admission_no,gender,combination_id,is_active)')
    .eq('class_id', classId)
    .eq('term_id', termId)
    .eq('school_id', schoolId);
  return (data || []).map(e => e.students).filter(Boolean);
}

// Full results for a student for a term (used in report card + cumulative)
async function getStudentResults(studentId, termId) {
  const { data } = await db.from('results')
    .select('score, subject_id, exam_id, subjects(id,name,code), exams(id,name,max_score,weight)')
    .eq('student_id', studentId)
    .eq('term_id', termId);
  return data || [];
}

// Fee balance for a student (expected - paid)
async function getStudentFeeBalance(studentId, schoolId, termId = null) {
  const feeQuery = db.from('fee_types').select('id,name,amount,class_id').eq('school_id', schoolId);
  const payQuery = db.from('payments').select('amount_paid,fee_type_id').eq('student_id', studentId).eq('school_id', schoolId);
  if (termId) payQuery.eq('term_id', termId);

  const [{ data: feeTypes }, { data: payments }] = await Promise.all([feeQuery, payQuery]);
  const expected = (feeTypes || []).reduce((s, f) => s + Number(f.amount), 0);
  const paid = (payments || []).reduce((s, p) => s + Number(p.amount_paid), 0);
  return { expected, paid, balance: Math.max(0, expected - paid), feeTypes: feeTypes || [], payments: payments || [] };
}

// Family/sibling discount check
// After ISSUE C-03 fix: family_id now has a proper FK to the families table.
// Always create the family row first via createFamily() before assigning family_id to students.
async function getFamilyStudents(familyId, schoolId) {
  if (!familyId) return [];
  const { data } = await db.from('students')
    .select('id,full_name,admission_no,is_active')
    .eq('family_id', familyId)
    .eq('school_id', schoolId)
    .eq('is_active', true);
  return data || [];
}

// Create a new family record. Returns the new family id or null on error.
// Always call this before linking students via family_id (ISSUE C-03 fix).
async function createFamily(schoolId, label = null) {
  const { data, error } = await db.from('families')
    .insert({ school_id: schoolId, label })
    .select('id')
    .single();
  if (error) { console.error('[EduTrack] createFamily error:', error.message); return null; }
  return data.id;
}

// ── Formatting Helpers ─────────────────────────────────────────
function formatMoney(n) {
  if (n === null || n === undefined) return '₦0';
  return '₦' + Number(n).toLocaleString('en-NG');
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatPercent(val, total) {
  if (!total) return '0%';
  return Math.round((val / total) * 100) + '%';
}
function gradeFromScale(score, scale) {
  if (!scale?.length) return { grade: '—', remark: '—' };
  return scale.find(s => score >= s.min_score && score <= s.max_score) || { grade: 'F9', remark: 'Fail' };
}

// ── UI Helpers ─────────────────────────────────────────────────
function toast(message, type = 'success') {
  const existing = document.getElementById('et-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'et-toast';
  t.className = `et-toast et-toast--${type}`;
  t.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('et-toast--show'), 10);
  setTimeout(() => { t.classList.remove('et-toast--show'); setTimeout(() => t.remove(), 300); }, 3500);
}

function showLoader(container, msg = 'Loading…') {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (el) el.innerHTML = `<div class="et-loader"><div class="et-spinner"></div><p>${msg}</p></div>`;
}
function showError(container, msg) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (el) el.innerHTML = `<div class="et-empty"><div class="et-empty__icon">⚠️</div><p>${msg}</p></div>`;
}
function showEmpty(container, msg, icon = '(empty)') {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (el) el.innerHTML = `<div class="et-empty"><div class="et-empty__icon">${icon}</div><p>${msg}</p></div>`;
}

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
