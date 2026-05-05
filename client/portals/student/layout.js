// ============================================================
//  EduTrack NG — Student Portal Auth & Layout  v3.0
//  Updated: All direct db.from() calls replaced with
//  SECURITY DEFINER RPCs to fix blank screen after login
// ============================================================

function getStudentSession() {
  try {
    const s = sessionStorage.getItem('et_student_session');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function requireStudentAuth() {
  const s = getStudentSession();
  if (!s) { window.location.href = 'login.html'; return null; }
  const loginTime = new Date(s.logged_in_at);
  if (Date.now() - loginTime.getTime() > 8 * 60 * 60 * 1000) {
    sessionStorage.removeItem('et_student_session');
    window.location.href = 'login.html';
    return null;
  }
  return s;
}

function studentLogout() {
  sessionStorage.removeItem('et_student_session');
  window.location.href = '../index.html';
}

// ── Sidebar toggle (required by topbar hamburger & overlay) ──
function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.toggle('open');
  if (ov) ov.classList.toggle('active');
}
function closeSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('active');
}

function renderStudentLayout(activePage, pageTitle, unreadCount) {
  unreadCount = unreadCount || 0;
  const navItems = [
    { id: 'dashboard',     icon: '&#127968;', label: 'Home',          href: 'index.html' },
    { id: 'results',       icon: '&#128202;', label: 'Results',       href: 'results.html' },
    { id: 'attendance',    icon: '&#128203;', label: 'Attendance',    href: 'attendance.html' },
    { id: 'fees',          icon: '&#128176;', label: 'Fees',          href: 'fees.html' },
    { id: 'notifications', icon: '&#128276;', label: 'Notifications', href: 'notifications.html' },
    { id: 'profile',       icon: '&#128100;', label: 'Profile',       href: 'profile.html' },
  ];

  const badge = unreadCount > 0 ? '<span class="stu-notif-badge">' + (unreadCount > 99 ? '99+' : unreadCount) + '</span>' : '';
  const bnBadge = unreadCount > 0 ? '<span class="stu-bnav-badge">' + (unreadCount > 9 ? '9+' : unreadCount) + '</span>' : '';

  return '<style>' +
    '.stu-notif-badge{display:inline-flex;align-items:center;justify-content:center;background:#ef4444;color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:100px;padding:0 5px;margin-left:6px;}' +
    '.stu-bnav-badge{position:absolute;top:2px;right:4px;background:#ef4444;color:#fff;font-size:9px;font-weight:700;min-width:14px;height:14px;border-radius:100px;padding:0 3px;display:flex;align-items:center;justify-content:center;}' +
    '.bottom-nav a{position:relative;}' +
    '</style>' +
    '<div class="sidebar" id="sidebar">' +
      '<div class="sidebar__brand">' +
        '<div class="sidebar__logo">' +
          '<div class="sidebar__logo-icon" id="stuSidebarLogo" style="background:white;padding:2px;overflow:hidden;">' +
            '<img src="../icons/logo.jpg" style="width:32px;height:32px;object-fit:cover;border-radius:5px;display:block;" onerror="this.parentElement.innerHTML=\'&#127979;\'">' +
          '</div>EduTrack NG' +
        '</div>' +
        '<div class="sidebar__school" id="stuSchoolName">Loading...</div>' +
      '</div>' +
      '<nav class="sidebar__nav">' +
        '<div class="sidebar__section">Student Menu</div>' +
        navItems.map(function(n) {
          return '<a href="' + n.href + '" class="nav-item ' + (activePage === n.id ? 'active' : '') + '">' +
            '<span class="nav-icon">' + n.icon + '</span>' + n.label +
            (n.id === 'notifications' ? badge : '') +
          '</a>';
        }).join('') +
      '</nav>' +
      '<div class="sidebar__footer">' +
        '<div class="sidebar__user">' +
          '<div class="sidebar__avatar" id="stuInitial">?</div>' +
          '<div><div class="sidebar__user-name" id="stuName">...</div><div class="sidebar__user-role">Student</div></div>' +
          '<button class="sidebar__logout" onclick="studentLogout()" title="Logout">&#8651;</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>' +
    '<div class="main-content">' +
      '<div class="topbar">' +
        '<button class="topbar__toggle" onclick="toggleSidebar()">&#9776;</button>' +
        '<h1 class="topbar__title">' + pageTitle + '</h1>' +
        '<div class="topbar__actions" id="topbarActions">' +
          '<a href="notifications.html" style="position:relative;display:inline-flex;align-items:center;padding:6px 10px;border-radius:6px;color:var(--ink-2);font-size:20px;text-decoration:none;" title="Notifications">' +
            '&#128276;' +
            (unreadCount > 0 ? '<span class="stu-notif-badge" style="position:absolute;top:0;right:0;font-size:9px;min-width:15px;height:15px;">' + (unreadCount > 9 ? '9+' : unreadCount) + '</span>' : '') +
          '</a>' +
        '</div>' +
      '</div>' +
      '<div class="page-body" id="pageBody"></div>' +
    '</div>' +
    '<nav class="bottom-nav">' +
      navItems.map(function(n) {
        return '<a href="' + n.href + '" class="' + (activePage === n.id ? 'active' : '') + '">' +
          '<span class="bnav-icon">' + n.icon + '</span>' + n.label +
          (n.id === 'notifications' && unreadCount > 0 ? bnBadge : '') +
        '</a>';
      }).join('') +
    '</nav>';
}

// Pre-loaded subject maps for results page
window._stuSubjectMaps = null;

// loadStudentSubjectMaps is now a no-op — data comes from get_student_init RPC.
// Kept for backwards compatibility so existing call sites don't throw.
async function loadStudentSubjectMaps(schoolId, classId, termId) {
  return window._stuSubjectMaps || { comboSubjectMap: {}, classSubjectMap: {}, comboNameMap: {} };
}

async function initStudentLayout(activePage, pageTitle) {
  var session = requireStudentAuth();
  if (!session) return null;

  // One RPC replaces all 8 direct queries (notifications, students, schools,
  // dashboard_settings, terms, subject_combinations, combination_subjects, class_subjects)
  var data, error;
  try {
    var rpcResult = await db.rpc('get_student_init', {
      p_student_id: session.id,
      p_school_id:  session.school_id
    });
    data  = rpcResult.data;
    error = rpcResult.error;
  } catch (ex) {
    error = { message: ex && ex.message || String(ex) };
  }

  if (error || !data || !data.ok) {
    document.getElementById('app').innerHTML =
      '<div style="padding:2rem;color:red;font-family:sans-serif;">' +
      '⚠️ Failed to load portal. Please <a href="login.html">log in again</a>.' +
      '<br><small style="color:#999;">' + (error && (error.message || error) || (data && data.error) || '') + '</small>' +
      '</div>';
    return null;
  }

  var { student, school, dash_settings, unread_count, combos, combo_subs, class_subs } = data;
  var term = data.term || null;

  // Fallback: if the RPC didn't return a term, query directly for is_current=true
  if (!term && session && session.school_id) {
    try {
      var termFallback = await db.from('terms')
        .select('*')
        .eq('school_id', session.school_id)
        .eq('is_current', true)
        .maybeSingle();
      if (termFallback && termFallback.data) term = termFallback.data;
    } catch (_) { /* ignore fallback errors */ }
  }

  // Build subject maps exactly as loadStudentSubjectMaps() did before
  var maps = { comboSubjectMap: {}, classSubjectMap: {}, comboNameMap: {} };
  (combos || []).forEach(function(c) { maps.comboNameMap[c.id] = c.name; });
  (combo_subs || []).forEach(function(cs) {
    if (!cs.subjects) return;
    if (!maps.comboSubjectMap[cs.combination_id]) maps.comboSubjectMap[cs.combination_id] = [];
    if (!maps.comboSubjectMap[cs.combination_id].find(function(s) { return s.id === cs.subject_id; }))
      maps.comboSubjectMap[cs.combination_id].push(Object.assign({}, cs.subjects, { is_compulsory: cs.is_compulsory }));
  });
  (class_subs || []).forEach(function(cs) {
    if (!cs.subjects) return;
    if (!maps.classSubjectMap[cs.class_id]) maps.classSubjectMap[cs.class_id] = [];
    if (!maps.classSubjectMap[cs.class_id].find(function(s) { return s.id === cs.subject_id; }))
      maps.classSubjectMap[cs.class_id].push(cs.subjects);
  });
  window._stuSubjectMaps = maps;

  // Render the layout shell
  document.getElementById('app').innerHTML =
    renderStudentLayout(activePage, pageTitle, unread_count || 0);

  // Populate sidebar
  document.getElementById('stuSchoolName').textContent = school && school.name ? school.name : 'My School';
  document.getElementById('stuName').textContent       = session.full_name || 'Student';
  document.getElementById('stuInitial').textContent    = (session.full_name || 'S').charAt(0).toUpperCase();

  if (school && school.logo_url) {
    document.getElementById('stuSidebarLogo').innerHTML =
      '<img src="' + school.logo_url + '" style="width:36px;height:36px;border-radius:7px;object-fit:cover;">';
  }

  // Apply dashboard visibility settings
  if (dash_settings) {
    if (!dash_settings.student_see_fees)
      document.querySelectorAll('a[href="fees.html"]').forEach(function(el) { el.style.display = 'none'; });
    if (!dash_settings.student_see_attendance)
      document.querySelectorAll('a[href="attendance.html"]').forEach(function(el) { el.style.display = 'none'; });
    if (!dash_settings.student_see_results)
      document.querySelectorAll('a[href="results.html"]').forEach(function(el) { el.style.display = 'none'; });
  }

  var classId = student && student.class_id;
  var currentEnrollment = classId ? {
    class_id: classId,
    classes: {
      name:           student.class_name,
      level:          student.class_level,
      section:        student.class_section,
      combination_id: student.class_combo_id
    }
  } : null;

  return {
    session:           session,
    student:           student,
    school:            school,
    dashSettings:      dash_settings,
    term:              term,
    currentEnrollment: currentEnrollment,
    classId:           classId,
  };
}
