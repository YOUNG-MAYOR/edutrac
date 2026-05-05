// ============================================================
//  EduTrack NG — Shared Layout (All Portals)
// ============================================================

// ── Sidebar toggle ───────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

// ── Admin Accordion Sidebar ───────────────────────────────────
// SVG helpers (inline, reusable)
const _SVG = {
  dashboard:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  students:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  staff:        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>',
  people:       '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  parents:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  book:         '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  classes:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>',
  subjects:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  sections:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>',
  results:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
  attendance:   '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="9 11 11 13 15 9"/></svg>',
  timetable:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  builder:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  biometric:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
  activity:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  idcard:       '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="12" r="2.5"/><line x1="13" y1="10" x2="20" y2="10"/><line x1="13" y1="14" x2="20" y2="14"/></svg>',
  bell:         '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  money:        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  payment:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  megaphone:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  sms:          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  whatsapp:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  import:       '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  scratch:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>',
  settings:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  gear:         '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  chevron:      '<svg class="nav-group__chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
};

// Admin nav group definitions
const _ADMIN_GROUPS = [
  // ─ Top-level direct links ─
  { type:'link', id:'dashboard', icon:_SVG.dashboard, label:'Dashboard', href:'index.html' },

  // ─ People ─
  { type:'group', id:'grp-people', icon:_SVG.people, label:'People & Students',
    children:[
      { id:'students',      icon:_SVG.students,  label:'All Students',     href:'students.html' },
      { id:'staff',         icon:_SVG.staff,      label:'Staff Directory',   href:'staff.html' },
      { id:'parents',       icon:_SVG.parents,    label:'Parents / Guardians', href:'students.html' },
    ]
  },

  // ─ Academics ─
  { type:'group', id:'grp-academics', icon:_SVG.book, label:'Academics',
    children:[
      { id:'classes',          icon:_SVG.classes,    label:'Classes',           href:'classes.html' },
      { id:'class-subjects',   icon:_SVG.subjects,   label:'Class Subjects',    href:'class-subjects.html' },
      { id:'sections',         icon:_SVG.sections,   label:'Staff Sections',    href:'sections.html' },
      { id:'results',          icon:_SVG.results,    label:'Results',           href:'results.html' },
      { id:'attendance',       icon:_SVG.attendance, label:'Attendance',        href:'attendance.html' },
      { id:'timetable',        icon:_SVG.timetable,  label:'Timetable',         href:'timetable.html' },
      { id:'timetable-builder',icon:_SVG.builder,    label:'Timetable Builder', href:'timetable-builder.html' },
    ]
  },

  // ─ Staff Office ─
  { type:'group', id:'grp-staff', icon:_SVG.staff, label:'Staff Office',
    children:[
      { id:'staff-attendance',   icon:_SVG.attendance, label:'Staff Attendance',    href:'../portals/staff/attendance.html' },
      { id:'staff-biometric',    icon:_SVG.biometric,  label:'Biometric Check-In',  href:'../portals/staff/attendance-biometric.html' },
      { id:'daily-activities',   icon:_SVG.activity,   label:'Daily Activity Logs', href:'../portals/staff/daily-activities.html' },
      { id:'score-entry',        icon:_SVG.results,    label:'Score Entry Monitor', href:'../portals/staff/score-entry.html' },
      { id:'staff-timetable',    icon:_SVG.timetable,  label:'Staff Timetable',     href:'../portals/staff/timetable.html' },
      { id:'staff-id-card',      icon:_SVG.idcard,     label:'Staff ID Cards',      href:'../portals/staff/id-card.html' },
      { id:'staff-notifications',icon:_SVG.bell,       label:'Staff Notifications', href:'../portals/staff/notifications.html' },
    ]
  },

  // ─ Finance ─
  { type:'group', id:'grp-finance', icon:_SVG.money, label:'Finance',
    children:[
      { id:'fees',     icon:_SVG.money,   label:'Fee Management', href:'fees.html' },
      { id:'payments', icon:_SVG.payment, label:'Payments',       href:'payments.html' },
    ]
  },

  // ─ Communications ─
  { type:'group', id:'grp-comms', icon:_SVG.megaphone, label:'Communications',
    children:[
      { id:'notifications', icon:_SVG.bell,      label:'Notifications', href:'notifications.html' },
      { id:'sms',           icon:_SVG.sms,        label:'SMS & Alerts',  href:'sms.html' },
      { id:'whatsapp',      icon:_SVG.whatsapp,   label:'WhatsApp',      href:'whatsapp.html' },
    ]
  },

  // ─ Operations ─
  { type:'group', id:'grp-ops', icon:_SVG.gear, label:'Operations',
    children:[
      { id:'import',        icon:_SVG.import,   label:'Import Data',    href:'import.html' },
      { id:'scratch-cards', icon:_SVG.scratch,  label:'Scratch Cards',  href:'scratch-cards.html' },
      { id:'settings',      icon:_SVG.settings, label:'Settings',       href:'settings.html' },
    ]
  },
];

function _renderAdminNav(activePage) {
  // Find which group contains the active page
  const activeGroup = _ADMIN_GROUPS.find(g =>
    g.type === 'group' && g.children.some(c => c.id === activePage)
  );

  return _ADMIN_GROUPS.map(item => {
    if (item.type === 'link') {
      const isActive = activePage === item.id;
      return `<a href="${item.href}" class="nav-item${isActive ? ' active' : ''}">
        <span class="nav-icon">${item.icon}</span>${item.label}
      </a>`;
    }
    // Group
    const isOpen   = activeGroup?.id === item.id;
    const hasActive = isOpen;
    return `
      <div class="nav-group${isOpen ? ' open' : ''}${hasActive ? ' active-group' : ''}" id="${item.id}">
        <button class="nav-group__header" onclick="toggleNavGroup('${item.id}')">
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-group__label">${item.label}</span>
          <span class="nav-group__badge">${item.children.length}</span>
          ${_SVG.chevron}
        </button>
        <div class="nav-group__body">
          ${item.children.map(c => {
            const isCActive = activePage === c.id;
            return `<a href="${c.href}" class="nav-item nav-item--child${isCActive ? ' active' : ''}">
              <span class="nav-icon">${c.icon}</span>${c.label}
            </a>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
}

function toggleNavGroup(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const wasOpen = el.classList.contains('open');
  // Close all other groups
  document.querySelectorAll('.nav-group.open').forEach(g => {
    if (g.id !== id) g.classList.remove('open');
  });
  el.classList.toggle('open', !wasOpen);
}

function renderAdminLayout(activePage, pageTitle) {
  const bottomItems = [
    { id:'dashboard',  icon:_SVG.dashboard, label:'Home',     href:'index.html' },
    { id:'students',   icon:_SVG.students,  label:'Students', href:'students.html' },
    { id:'results',    icon:_SVG.results,   label:'Results',  href:'results.html' },
    { id:'fees',       icon:_SVG.money,     label:'Finance',  href:'fees.html' },
    { id:'settings',   icon:_SVG.settings,  label:'Settings', href:'settings.html' },
  ];
  const navHtml = _renderAdminNav(activePage);
  const bottomHtml = bottomItems.map(n =>
    `<a href="${n.href}" class="${activePage===n.id?'active':''}"><span class="bnav-icon">${n.icon}</span>${n.label}</a>`
  ).join('');

  return `
    <div class="sidebar" id="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__logo">
          <div class="sidebar__logo-icon" id="schoolLogoWrap" style="background:white;padding:2px;overflow:hidden;">
            <img id="schoolLogoImg" src="../icons/logo.jpg" style="width:32px;height:32px;object-fit:cover;border-radius:5px;display:block;"
              onerror="this.parentElement.innerHTML='&#127979;';this.parentElement.style.background='var(--primary)'">
          </div>
          EduTrack NG
        </div>
        <div class="sidebar__school" id="schoolName">Loading…</div>
      </div>
      <nav class="sidebar__nav">${navHtml}</nav>
      <div class="sidebar__footer">
        <div class="sidebar__user">
          <div class="sidebar__avatar" id="userInitial">?</div>
          <div>
            <div class="sidebar__user-name" id="userName">…</div>
            <div class="sidebar__user-role">Administrator</div>
          </div>
          <button class="sidebar__logout" onclick="logout()" title="Logout">⎋</button>
        </div>
      </div>
    </div>
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
    <div class="main-content">
      <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1 class="topbar__title">${pageTitle}</h1>
        <div class="topbar__actions" id="topbarActions"></div>
      </div>
      <div class="page-body" id="pageBody"></div>
    </div>
    <nav class="bottom-nav">${bottomHtml}</nav>
  `;
}

async function initAdminLayout(activePage, pageTitle) {
  document.getElementById('app').innerHTML = renderAdminLayout(activePage, pageTitle);
  const user = await requireAuth(['admin']);
  if (!user) return null;
  // Update school info
  document.getElementById('schoolName').textContent = user.schools?.name || 'My School';
  document.getElementById('userName').textContent = user.full_name;
  document.getElementById('userInitial').textContent = user.full_name?.charAt(0).toUpperCase() || 'A';
  // Fix logo: use school logo_url if available
  if (user.schools?.logo_url) {
    const logoImg = document.getElementById('schoolLogoImg');
    if (logoImg) logoImg.src = user.schools.logo_url;
  }
  return user;
}

// ── Teacher Layout ───────────────────────────────────────────
function renderTeacherLayout(activePage, pageTitle) {
  const navItems = [
    { id: 'dashboard',  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: 'Dashboard',   href: 'index.html' },
    { id: 'attendance', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>', label: 'Attendance',   href: 'attendance.html' },
    { id: 'scores',     icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>', label: 'Scores',       href: 'scores.html' },
    { id: 'students',   icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>', label: 'My Students',  href: 'students.html' },
    { id: 'timetable',  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: 'Timetable',    href: 'timetable.html' },
  ];
  return buildLayout({ navItems, bottomNavItems: navItems.slice(0, 4), activePage, pageTitle, roleLabel: 'Teacher', logoSrc: '../icons/logo.jpg' });
}

async function initTeacherLayout(activePage, pageTitle) {
  document.getElementById('app').innerHTML = renderTeacherLayout(activePage, pageTitle);
  const user = await requireAuth(['teacher']);
  if (!user) return null;
  document.getElementById('schoolName').textContent = user.schools?.name || 'My School';
  document.getElementById('userName').textContent = user.full_name;
  document.getElementById('userInitial').textContent = user.full_name?.charAt(0).toUpperCase() || 'T';
  return user;
}

// ── Exam Officer Layout ──────────────────────────────────────
function renderExamOfficerLayout(activePage, pageTitle) {
  const navItems = [
    { id: 'dashboard',    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: 'Dashboard',     href: 'index.html' },
    { id: 'results',      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>', label: 'Results',       href: 'results.html' },
    { id: 'report-cards', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>', label: 'Report Cards',  href: 'report-cards.html' },
    { id: 'exams',        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', label: 'Exam Setup',    href: 'exams.html' },
    { id: 'students',     icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>', label: 'Students',      href: 'students.html' },
  ];
  return buildLayout({ navItems, bottomNavItems: navItems, activePage, pageTitle, roleLabel: 'Exam Officer', logoSrc: '../icons/logo.jpg', accentColor: '#7c3aed' });
}

async function initExamOfficerLayout(activePage, pageTitle) {
  document.getElementById('app').innerHTML = renderExamOfficerLayout(activePage, pageTitle);
  const user = await requireAuth(['exam_officer', 'admin']);
  if (!user) return null;
  document.getElementById('schoolName').textContent = user.schools?.name || 'My School';
  document.getElementById('userName').textContent = user.full_name;
  document.getElementById('userInitial').textContent = user.full_name?.charAt(0).toUpperCase() || 'E';
  return user;
}

// ── Parent Layout ────────────────────────────────────────────
function renderParentLayout(activePage, pageTitle) {
  const navItems = [
    { id: 'dashboard',  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: 'Home',       href: 'index.html' },
    { id: 'results',    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>', label: 'Results',    href: 'results.html' },
    { id: 'attendance',    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>', label: 'Attendance',   href: 'attendance.html' },
    { id: 'notifications', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', label: 'Notifications',  href: 'notifications.html' },
    { id: 'fees',       icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', label: 'Fees',       href: 'fees.html' },
  ];
  return buildLayout({ navItems, bottomNavItems: navItems, activePage, pageTitle, roleLabel: 'Parent / Guardian', logoSrc: '../icons/logo.jpg' });
}

async function initParentLayout(activePage, pageTitle) {
  document.getElementById('app').innerHTML = renderParentLayout(activePage, pageTitle);
  const user = await requireAuth(['parent']);
  if (!user) return null;
  document.getElementById('schoolName').textContent = user.schools?.name || 'My School';
  document.getElementById('userName').textContent = user.full_name;
  document.getElementById('userInitial').textContent = user.full_name?.charAt(0).toUpperCase() || 'P';
  return user;
}

// ── Shared Layout Builder ────────────────────────────────────
function buildLayout({ navItems, bottomNavItems, activePage, pageTitle, roleLabel, logoSrc, accentColor }) {
  const accentStyle = accentColor ? `style="background:${accentColor}"` : '';
  return `
    <div class="sidebar" id="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__logo">
          <div class="sidebar__logo-icon" style="background:white;padding:2px;overflow:hidden;">
            <img src="${logoSrc}" style="width:32px;height:32px;object-fit:cover;border-radius:5px;display:block;"
              onerror="this.parentElement.innerHTML='&#127979;';this.parentElement.style.background='var(--primary)'">
          </div>
          EduTrack NG
        </div>
        <div class="sidebar__school" id="schoolName">Loading…</div>
      </div>
      <nav class="sidebar__nav">
        ${navItems.map(n => n.section
          ? `<div class="sidebar__section">${n.section}</div>`
          : `<a href="${n.href}" class="nav-item ${activePage === n.id ? 'active' : ''}">
            <span class="nav-icon">${n.icon}</span> ${n.label}
          </a>`
        ).join('')}
      </nav>
      <div class="sidebar__footer">
        <div class="sidebar__user">
          <div class="sidebar__avatar" id="userInitial" ${accentStyle}>?</div>
          <div>
            <div class="sidebar__user-name" id="userName">…</div>
            <div class="sidebar__user-role">${roleLabel}</div>
          </div>
          <button class="sidebar__logout" onclick="logout()" title="Logout">⎋</button>
        </div>
      </div>
    </div>
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>
    <div class="main-content">
      <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
        <h1 class="topbar__title">${pageTitle}</h1>
        <div class="topbar__actions" id="topbarActions"></div>
      </div>
      <div class="page-body" id="pageBody"></div>
    </div>
    <nav class="bottom-nav">
      ${(bottomNavItems || navItems).map(n => `
        <a href="${n.href}" class="${activePage === n.id ? 'active' : ''}">
          <span class="bnav-icon">${n.icon}</span>${n.label}
        </a>
      `).join('')}
    </nav>
  `;
}

// ── SaaS Owner Layout ────────────────────────────────────────
function renderSaasLayout(activePage, pageTitle) {
  const navItems = [
    { id: 'dashboard',      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', label: 'Platform Overview', href: 'index.html' },
    { id: 'applications',   icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', label: 'School Applications', href: 'applications.html' },
    { id: 'schools',        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>', label: 'All Schools',       href: 'schools.html' },
    { id: 'users',          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'All Users',         href: 'users.html' },
    { id: 'billing',        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>', label: 'Billing & Plans',   href: 'billing.html' },
    { id: 'scratch-cards',  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>', label: 'Scratch Cards',     href: '../saas-console/scratch-cards.html' },
    { id: 'announcements',  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>', label: 'Announcements',     href: 'announcements.html' },
    { id: 'audit',          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', label: 'Audit Log',         href: 'audit.html' },
  ];
  const bottomNavItems = [
    { id: 'dashboard',     icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', label: 'Overview', href: 'index.html' },
    { id: 'applications',  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', label: 'Applications', href: 'applications.html' },
    { id: 'schools',       icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>', label: 'Schools',  href: 'schools.html' },
    { id: 'users',         icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Users',    href: 'users.html' },
    { id: 'billing',       icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>', label: 'Billing',  href: 'billing.html' },
  ];
  return buildLayout({
    navItems, bottomNavItems, activePage, pageTitle,
    roleLabel: 'SaaS Owner',
    logoSrc: '../icons/logo.jpg',
    accentColor: '#6d28d9'
  });
}

async function initSaasLayout(activePage, pageTitle) {
  document.getElementById('app').innerHTML = renderSaasLayout(activePage, pageTitle);
  const user = await requireAuth(['saas_owner']);
  if (!user) return null;
  document.getElementById('schoolName').textContent = 'EduTrack NG — Platform';
  document.getElementById('userName').textContent = user.full_name;
  document.getElementById('userInitial').textContent = user.full_name?.charAt(0).toUpperCase() || 'S';
  return user;
}

// ================================================================
// UI / Format helpers (duplicated from api/database.js so that
// admin pages which only load layout.js have access to them too)
// ================================================================
if (typeof formatDate === 'undefined') {
  window.formatDate = function(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  };
}
if (typeof formatMoney === 'undefined') {
  window.formatMoney = function(n) {
    if (n === null || n === undefined) return '₦0';
    return '₦' + Number(n).toLocaleString('en-NG');
  };
}
if (typeof gradeFromScale === 'undefined') {
  window.gradeFromScale = function(score, scale) {
    if (!scale?.length) return { grade: '—', remark: '—' };
    return scale.find(s => score >= s.min_score && score <= s.max_score) || { grade: 'F9', remark: 'Fail' };
  };
}
if (typeof toast === 'undefined') {
  window.toast = function(message, type = 'success') {
    const existing = document.getElementById('et-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'et-toast';
    t.className = `et-toast et-toast--${type}`;
    t.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('et-toast--show'), 10);
    setTimeout(() => { t.classList.remove('et-toast--show'); setTimeout(() => t.remove(), 300); }, 3500);
  };
}
if (typeof showLoader === 'undefined') {
  window.showLoader = function(container, msg = 'Loading…') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = `<div class="et-loader"><div class="et-spinner"></div><p>${msg}</p></div>`;
  };
}
if (typeof showError === 'undefined') {
  window.showError = function(container, msg) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = `<div class="et-empty"><div class="et-empty__icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>️</div><p>${msg}</p></div>`;
  };
}
if (typeof showEmpty === 'undefined') {
  window.showEmpty = function(container, msg, icon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) el.innerHTML = `<div class="et-empty"><div class="et-empty__icon">${icon}</div><p>${msg}</p></div>`;
  };
}
if (typeof openModal === 'undefined') {
  window.openModal = function(id) {
    const m = document.getElementById(id);
    // Use overflow on the modal itself rather than body — keeps fixed AI widget visible
    if (m) {
      m.classList.add('active');
      // Prevent body scroll without breaking fixed-position children (like AI widget)
      document.body.dataset.scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
    }
  };
  window.closeModal = function(id) {
    const m = document.getElementById(id);
    if (m) {
      m.classList.remove('active');
      // Restore scroll position
      const scrollY = document.body.dataset.scrollY || '0';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      window.scrollTo(0, parseInt(scrollY));
    }
  };
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
  });
}
