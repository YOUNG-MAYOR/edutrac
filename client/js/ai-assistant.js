/**
 * EduTrack NG — AI Assistant  v2
 * One script, every page. Bottom-left. Context-aware.
 */
(function () {
  'use strict';
  if (document.getElementById('edt-ai-root')) return;

  const path = window.location.pathname;
  const title = document.title || '';
  const pageName = title.replace(/EduTrack NG\s*[—–-]\s*/i, '').trim() || 'this page';

  function getRole() {
    if (path.includes('/saas-console/'))           return 'saas';
    if (path.includes('/admin/'))                   return 'admin';
    if (path.includes('/portals/staff/'))           return 'staff';
    if (path.includes('/portals/student/'))         return 'student';
    if (path.includes('/portals/parent/'))          return 'parent';
    if (path.includes('/portals/academic-office/')) return 'academic';
    if (path.includes('/portals/admin-office/'))    return 'adminoffice';
    if (path.includes('/portals/bursary/'))         return 'bursary';
    return 'visitor';
  }
  const ROLE = getRole();

  const CTX_META = {
    visitor:     { label: 'Help Centre',   avatar: '🌐' },
    admin:       { label: 'Admin Desk',    avatar: '🛠️' },
    staff:       { label: 'Teacher Help',  avatar: '📚' },
    student:     { label: 'Student Hub',   avatar: '🎓' },
    parent:      { label: 'Parent Portal', avatar: '👨‍👩‍👧' },
    academic:    { label: 'Exam Office',   avatar: '📋' },
    adminoffice: { label: 'Admin Office',  avatar: '🏢' },
    bursary:     { label: 'Bursary',       avatar: '💰' },
    saas:        { label: 'SaaS Console',  avatar: '⚙️' },
  };
  const meta = CTX_META[ROLE];

  const CHIPS = {
    visitor:     ['How do I register my school?', 'What features are included?', 'How much does it cost?', 'Good for Islamic schools?'],
    admin:       ['How do I add a new staff?', 'How do I import students?', 'How do I set up classes?', 'How do I generate results?'],
    staff:       ['How do I enter exam scores?', 'How do I take attendance?', 'How do I view my timetable?', 'Log daily activities?'],
    student:     ['How do I check my results?', 'How do I view attendance?', 'How do I check my fees?', 'How do I update my profile?'],
    parent:      ["Check my child's results?", 'How do I pay school fees?', "View child's attendance?", 'Submit a complaint?'],
    academic:    ['Generate a broadsheet?', 'Build report cards?', 'Configure grading scales?', 'Manage exams?'],
    adminoffice: ['Admit a new student?', 'Update student records?', 'Generate admission letter?'],
    bursary:     ['Record a payment?', 'Generate a receipt?', 'View outstanding fees?', 'Set up fee structure?'],
    saas:        ['Approve a school?', 'Manage billing plans?', 'Generate scratch cards?', 'Suspend a school?'],
  };

  const SYSTEM = {
    visitor: `You are the EduTrack NG AI assistant on the marketing homepage. EduTrack NG is a Nigerian school management SaaS for Primary, Secondary, Islamiyya/Tahfeez, Vocational, and combined schools. Features: student records, attendance, results (A1-F9 grading), fees, CBT app, SMS/WhatsApp, multi-role portals (admin, staff, student, parent), timetable, report cards. Schools register via "Register Your School" form, reviewed and approved within 24-48 hours. Plans: Free, Basic, Pro. Be warm, enthusiastic, and concise (2-4 sentences). Encourage registration.`,
    admin: `You are the EduTrack NG AI assistant for school administrators. Current page: "${pageName}". Help with: adding/editing/importing staff (CSV), resetting passwords, ID cards, class assignment; admitting/importing students; creating classes/sections/subjects; timetable builder; grading scales; result sheets/broadsheets/report cards; fee structures/payments/receipts; attendance; SMS/WhatsApp notifications; school settings and session/term management. Give clear step-by-step instructions.`,
    staff: `You are the EduTrack NG AI assistant for teachers. Current page: "${pageName}". Help with: entering CA and exam scores per subject/class; taking attendance (present/absent/late); viewing personal timetable; logging daily teaching activities; viewing assigned students; notifications/announcements; generating personal ID card. Be practical and step-by-step.`,
    student: `You are the EduTrack NG AI assistant for students. Current page: "${pageName}". Help with: viewing results and report cards; understanding Nigerian grades (A1=75-100, B2=65-69, C4=55-59, D7=40-44, F9=0-34); attendance records; fee balance and payment history; using scratch cards; updating profile. Be friendly, encouraging, and use simple language.`,
    parent: `You are the EduTrack NG AI assistant for parents/guardians. Current page: "${pageName}". Help with: checking child's results and report cards; understanding grades; monitoring attendance; viewing and paying school fees; submitting complaints; reading school notices. Be warm and reassuring.`,
    academic: `You are the EduTrack NG AI assistant for Academic/Exam Officers. Current page: "${pageName}". Help with: generating class broadsheets; building and printing report cards in batch; combining CA+exam scores; setting up A1-F9 grading scales with custom remarks; creating exam timetables; managing subject results; exporting data. Be precise and thorough.`,
    adminoffice: `You are the EduTrack NG AI assistant for Admin Office staff. Current page: "${pageName}". Help with: admitting new students (form, class assignment, photo); updating student records; generating admission letters, transfer letters, testimonials; managing transfers. Be detailed and step-by-step.`,
    bursary: `You are the EduTrack NG AI assistant for the Bursary/Accounts Officer. Current page: "${pageName}". Help with: recording fee payments; generating and printing receipts; viewing outstanding balances by class/student; creating fee structures and levies; financial summaries. Accuracy is critical — be precise.`,
    saas: `You are the EduTrack NG AI assistant for the platform SaaS administrator. Current page: "${pageName}". Help with: reviewing and approving/rejecting school applications; managing schools (suspend/reactivate, change plan); viewing all users; managing billing plans; generating and assigning scratch cards; platform announcements; audit logs. Be professional and thorough.`,
  };

  const GREET = {
    visitor:     "👋 Hi there! I'm EduTrack NG's AI assistant. Ask me anything about features, registration, pricing, or how the platform works for Nigerian schools.",
    admin:       "👋 Hello, Admin! I'm here to help — whether it's managing staff, students, results, fees, or settings. What do you need help with today?",
    staff:       "👋 Hi, Teacher! I can help you enter scores, take attendance, view your timetable, or log activities. What can I do for you?",
    student:     "👋 Hello! I can help you check your results, attendance, fee balance, or update your profile. What do you need?",
    parent:      "👋 Hello! I can help you check your child's results, attendance, fees, or submit a complaint to the school. How can I help?",
    academic:    "👋 Hello, Exam Officer! I can help with broadsheets, report cards, grading scales, or exam timetables. What do you need?",
    adminoffice: "👋 Hello! I can help with student admissions, updating records, or generating letters. What do you need?",
    bursary:     "👋 Hello! I can help you record payments, generate receipts, track outstanding fees, or set up fee structures. What would you like to do?",
    saas:        "👋 Hello! I can help you review school applications, manage schools and billing, or generate scratch cards. What do you need?",
  };

  // ── CSS ──────────────────────────────────────────────────────
  const CSS = `
#edt-ai-root{
  position:fixed;bottom:24px;left:24px;z-index:999999;
  display:flex;flex-direction:column;align-items:flex-start;gap:12px;
  pointer-events:none;
  font-family:-apple-system,'Inter','DM Sans',system-ui,sans-serif;
  font-size:14px;
}

/* Toggle button */
#edt-ai-btn{
  position:relative;width:54px;height:54px;border-radius:16px;
  background:linear-gradient(145deg,#084d2c 0%,#0a6e3f 55%,#12a05a 100%);
  border:none;cursor:pointer;pointer-events:all;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 20px rgba(10,110,63,.5),0 2px 6px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.18);
  transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;
  outline:none;
}
#edt-ai-btn:hover{transform:translateY(-2px) scale(1.05);box-shadow:0 10px 28px rgba(10,110,63,.6),0 3px 8px rgba(0,0,0,.2)}
#edt-ai-btn:active{transform:scale(.95)}

/* Pulse ring */
#edt-ai-btn::before{
  content:'';position:absolute;inset:-4px;border-radius:20px;
  background:transparent;
  border:2px solid rgba(18,160,90,.45);
  animation:edtPulse 2.6s ease-in-out infinite;pointer-events:none;
}
@keyframes edtPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.08)}}
#edt-ai-btn.open::before{display:none}

/* Rotating icons */
#edt-ai-btn .edt-ico{
  position:absolute;display:flex;align-items:center;justify-content:center;
  transition:opacity .22s ease,transform .25s cubic-bezier(.34,1.56,.64,1);
}
#edt-ai-btn .edt-ico-chat{opacity:1;transform:scale(1) rotate(0)}
#edt-ai-btn .edt-ico-x{opacity:0;transform:scale(.3) rotate(-90deg)}
#edt-ai-btn.open .edt-ico-chat{opacity:0;transform:scale(.3) rotate(90deg)}
#edt-ai-btn.open .edt-ico-x{opacity:1;transform:scale(1) rotate(0)}

/* Notif dot */
#edt-ai-notif{
  position:absolute;top:-3px;right:-3px;
  width:13px;height:13px;border-radius:50%;
  background:#f0a500;border:2.5px solid white;
  box-shadow:0 2px 6px rgba(240,165,0,.55);
}

/* Tooltip */
#edt-ai-tip{
  position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%);
  background:rgba(8,12,16,.92);color:white;font-size:12px;font-weight:600;
  padding:7px 13px;border-radius:9px;white-space:nowrap;
  pointer-events:none;opacity:0;transition:opacity .18s;
  backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);
  box-shadow:0 6px 20px rgba(0,0,0,.35);letter-spacing:.1px;
}
#edt-ai-tip::before{
  content:'';position:absolute;right:100%;top:50%;transform:translateY(-50%);
  border:5px solid transparent;border-right-color:rgba(8,12,16,.92);
}
#edt-ai-btn:hover #edt-ai-tip{opacity:1}

/* Chat window */
#edt-ai-win{
  width:384px;max-width:calc(100vw - 32px);
  border-radius:22px;background:#fff;pointer-events:all;
  box-shadow:0 24px 64px rgba(0,0,0,.13),0 8px 24px rgba(0,0,0,.07),0 0 0 1px rgba(0,0,0,.055);
  display:none;flex-direction:column;max-height:min(548px,76vh);
  transform-origin:bottom left;overflow:hidden;
}
#edt-ai-win.show{
  display:flex;
  animation:edtOpen .3s cubic-bezier(.16,1,.3,1) both;
}
@keyframes edtOpen{from{opacity:0;transform:scale(.88) translateY(14px)}to{opacity:1;transform:scale(1) translateY(0)}}

/* Header */
#edt-hd{
  flex-shrink:0;
  background:linear-gradient(150deg,#062c1c 0%,#0a6e3f 55%,#0d8a4e 100%);
  position:relative;overflow:hidden;
}
#edt-hd::after{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse 90% 120% at 105% -15%,rgba(255,255,255,.07) 0%,transparent 55%),
             radial-gradient(ellipse 60% 80% at -5% 110%,rgba(0,0,0,.18) 0%,transparent 55%);
}
#edt-hd-top{
  position:relative;z-index:1;
  padding:18px 18px 12px;display:flex;align-items:center;gap:12px;
}
#edt-hd-avt{
  width:44px;height:44px;border-radius:14px;flex-shrink:0;
  background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.22);
  display:flex;align-items:center;justify-content:center;font-size:21px;
  box-shadow:0 3px 10px rgba(0,0,0,.22);
}
#edt-hd-info{flex:1;min-width:0}
#edt-hd-name{font-size:14.5px;font-weight:700;color:#fff;letter-spacing:-.25px;margin-bottom:4px}
#edt-hd-status{font-size:11.5px;color:rgba(255,255,255,.62);display:flex;align-items:center;gap:6px}
#edt-hd-live{
  width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0;
  box-shadow:0 0 8px rgba(74,222,128,.7);
  animation:edtLive 2.2s ease-in-out infinite;
}
@keyframes edtLive{0%,100%{opacity:1}50%{opacity:.35}}
#edt-hd-close{
  background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.75);
  cursor:pointer;width:32px;height:32px;border-radius:10px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;transition:all .15s;
}
#edt-hd-close:hover{background:rgba(255,255,255,.22);color:#fff}
#edt-hd-close svg{width:15px;height:15px;stroke:currentColor;stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round}

#edt-hd-bar{
  position:relative;z-index:1;
  padding:0 18px 16px;display:flex;align-items:center;gap:9px;
}
#edt-ctx-pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:3px 11px 3px 9px;border-radius:20px;
  background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.2);
  font-size:11px;font-weight:700;color:rgba(255,255,255,.88);letter-spacing:.15px;
}
#edt-ctx-dot{width:5px;height:5px;border-radius:50%;background:#4ade80}
#edt-ctx-pg{
  font-size:11px;color:rgba(255,255,255,.4);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}

/* Messages */
#edt-msgs{
  flex:1;overflow-y:auto;padding:16px 14px 10px;
  display:flex;flex-direction:column;gap:10px;
  background:#f7faf8;scroll-behavior:smooth;
}
#edt-msgs::-webkit-scrollbar{width:3px}
#edt-msgs::-webkit-scrollbar-thumb{background:rgba(10,110,63,.2);border-radius:2px}
#edt-msgs::-webkit-scrollbar-track{background:transparent}

.edt-ts{font-size:10.5px;color:#a0adb8;text-align:center;padding:2px 0 4px;letter-spacing:.3px}

.edt-row{display:flex;gap:8px;align-items:flex-end}
.edt-row.user{flex-direction:row-reverse}

.edt-avt{
  width:30px;height:30px;border-radius:10px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:14px;
  box-shadow:0 1px 5px rgba(0,0,0,.1);
}
.edt-avt.bot{background:linear-gradient(135deg,#084d2c,#0a6e3f)}
.edt-avt.user{background:linear-gradient(135deg,#1e3a5f,#1d4ed8)}

.edt-bbl{
  max-width:80%;padding:10px 14px;
  font-size:13px;line-height:1.68;word-break:break-word;
}
.edt-bbl.bot{
  background:#fff;color:#111827;
  border-radius:16px 16px 16px 4px;
  box-shadow:0 1px 4px rgba(0,0,0,.07),0 0 0 1px rgba(0,0,0,.04);
}
.edt-bbl.user{
  background:linear-gradient(135deg,#0a6e3f,#12a05a);
  color:#fff;border-radius:16px 16px 4px 16px;
  box-shadow:0 3px 10px rgba(10,110,63,.32);
}
.edt-bbl.typing{
  background:#fff;border-radius:16px 16px 16px 4px;
  box-shadow:0 1px 4px rgba(0,0,0,.07),0 0 0 1px rgba(0,0,0,.04);
  padding:12px 16px;
}
.edt-dots{display:flex;gap:4px;align-items:center}
.edt-dots span{
  width:7px;height:7px;border-radius:50%;
  background:linear-gradient(135deg,#0a6e3f,#12a05a);
  animation:edtBounce 1.4s ease-in-out infinite;
}
.edt-dots span:nth-child(2){animation-delay:.17s}
.edt-dots span:nth-child(3){animation-delay:.34s}
@keyframes edtBounce{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-7px);opacity:1}}

/* Quick chips */
#edt-chips{
  padding:10px 14px 2px;display:flex;flex-wrap:wrap;gap:5px;
  background:#f7faf8;flex-shrink:0;
}
.edt-chip{
  padding:5px 12px;border-radius:20px;
  background:#fff;border:1.5px solid #cce5d8;
  color:#065f46;font-size:11.5px;font-weight:600;
  cursor:pointer;transition:all .15s;font-family:inherit;
  box-shadow:0 1px 3px rgba(0,0,0,.05);white-space:nowrap;
}
.edt-chip:hover{background:#ecfdf5;border-color:#0a6e3f;color:#0a6e3f;transform:translateY(-1px);box-shadow:0 3px 9px rgba(10,110,63,.16)}

/* Input */
#edt-foot{
  padding:10px 12px 12px;background:#fff;
  border-top:1px solid #eef1ef;
  display:flex;gap:8px;align-items:flex-end;flex-shrink:0;
}
#edt-inp{
  flex:1;border:1.5px solid #e0e8e4;border-radius:13px;
  padding:9px 13px;font-size:13px;font-family:inherit;
  color:#111827;outline:none;resize:none;background:#f7faf8;
  line-height:1.55;max-height:90px;overflow-y:auto;
  transition:border-color .18s,background .18s,box-shadow .18s;
}
#edt-inp:focus{border-color:#0a6e3f;background:#fff;box-shadow:0 0 0 3px rgba(10,110,63,.1)}
#edt-inp::placeholder{color:#a0adb8}
#edt-send{
  width:38px;height:38px;border-radius:12px;border:none;
  background:linear-gradient(145deg,#0a6e3f,#12a05a);
  color:#fff;cursor:pointer;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 3px 10px rgba(10,110,63,.38);
  transition:all .18s;
}
#edt-send:hover{transform:translateY(-1px) scale(1.05);box-shadow:0 5px 14px rgba(10,110,63,.48)}
#edt-send:active{transform:scale(.95)}
#edt-send:disabled{background:#d1d5db;box-shadow:none;cursor:not-allowed;transform:none}
#edt-send svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}

/* Brand */
#edt-brand{
  padding:6px 0 8px;text-align:center;background:#fff;
  border-top:1px solid #f2f4f3;font-size:10.5px;color:#b0bab5;
  display:flex;align-items:center;justify-content:center;gap:5px;
  flex-shrink:0;letter-spacing:.2px;
}
#edt-brand svg{width:11px;height:11px;opacity:.5;stroke:currentColor;fill:none}

@media(max-width:440px){
  #edt-ai-root{bottom:16px;left:12px;z-index:999999}
  #edt-ai-win{width:calc(100vw - 24px)}
}
`;

  const sEl = document.createElement('style');
  sEl.textContent = CSS;
  document.head.appendChild(sEl);

  // ── Build DOM ────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'edt-ai-root';
  root.innerHTML = `
    <div id="edt-ai-win">
      <div id="edt-hd">
        <div id="edt-hd-top">
          <div id="edt-hd-avt">${meta.avatar}</div>
          <div id="edt-hd-info">
            <div id="edt-hd-name">EduTrack AI Assistant</div>
            <div id="edt-hd-status">
              <span id="edt-hd-live"></span>
              Online &mdash; always ready to help
            </div>
          </div>
          <button id="edt-hd-close" aria-label="Close">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="edt-hd-bar">
          <div id="edt-ctx-pill"><span id="edt-ctx-dot"></span>${meta.label}</div>
          <span id="edt-ctx-pg">${pageName}</span>
        </div>
      </div>

      <div id="edt-msgs"></div>

      <div id="edt-chips">
        ${(CHIPS[ROLE]||CHIPS.visitor).map(q=>`<button class="edt-chip" data-q="${q.replace(/"/g,'&quot;')}">${q}</button>`).join('')}
      </div>

      <div id="edt-foot">
        <textarea id="edt-inp" rows="1" placeholder="Type your question…"></textarea>
        <button id="edt-send">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      <div id="edt-brand">
        <svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
        Powered by Claude AI &middot; EduTrack NG
      </div>
    </div>

    <button id="edt-ai-btn">
      <span class="edt-ico edt-ico-chat">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <circle cx="9"  cy="10" r="1" fill="white" stroke="none"/>
          <circle cx="12" cy="10" r="1" fill="white" stroke="none"/>
          <circle cx="15" cy="10" r="1" fill="white" stroke="none"/>
        </svg>
      </span>
      <span class="edt-ico edt-ico-x">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </span>
      <span id="edt-ai-notif"></span>
      <span id="edt-ai-tip">Ask AI Assistant</span>
    </button>
  `;
  // ── Mount robustly — survive layout.js innerHTML wipes ─────
  function mountWidget() {
    // Remove stale instance if somehow duplicated
    const existing = document.getElementById('edt-ai-root');
    if (existing && existing !== root) existing.remove();
    // Always append fresh to body so it's never inside a transformed ancestor
    if (!document.body.contains(root)) {
      document.body.appendChild(root);
    }
  }

  // Initial mount — runs after DOMContentLoaded (script is defer)
  mountWidget();

  // Re-mount after any layout.js call that does app.innerHTML = ...
  // layout.js calls initAdminLayout etc. which replace #app innerHTML
  // but don't touch document.body children, so the widget survives.
  // However, if some future code wipes body, observer will re-inject it.
  const _observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      document.body.appendChild(root);
      // Re-wire event listeners since root was re-attached
      _wireListeners();
    }
  });
  _observer.observe(document.body, { childList: true });

  // ── Wire up ──────────────────────────────────────────────────
  let win, btn, msgs, chips, inp, send, notif;
  let isOpen = false, greeted = false, history = [];

  function _wireListeners() {
    win   = document.getElementById('edt-ai-win');
    btn   = document.getElementById('edt-ai-btn');
    msgs  = document.getElementById('edt-msgs');
    chips = document.getElementById('edt-ai-chips');
    inp   = document.getElementById('edt-inp');
    send  = document.getElementById('edt-send');
    notif = document.getElementById('edt-ai-notif');
    if (!btn) return;

    btn.addEventListener('click', toggle);
    const closeBtn = document.getElementById('edt-hd-close');
    if (closeBtn) closeBtn.addEventListener('click', toggle);
    if (chips) chips.addEventListener('click', e => {
      const c = e.target.closest('.edt-chip');
      if (!c) return;
      inp.value = c.dataset.q;
      doSend();
    });
    if (inp) {
      inp.addEventListener('input', () => {
        inp.style.height = 'auto';
        inp.style.height = Math.min(inp.scrollHeight, 90) + 'px';
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
      });
    }
    if (send) send.addEventListener('click', doSend);
  }
  _wireListeners();

  function toggle() {
    isOpen = !isOpen;
    btn.classList.toggle('open', isOpen);
    if (isOpen) {
      win.style.display = 'flex';
      requestAnimationFrame(() => win.classList.add('show'));
      notif.style.display = 'none';
      if (!greeted) {
        greeted = true;
        addTs();
        addMsg('bot', GREET[ROLE] || GREET.visitor);
      }
      setTimeout(() => inp.focus(), 180);
    } else {
      win.classList.remove('show');
      setTimeout(() => { if (!isOpen) win.style.display = 'none'; }, 300);
    }
  }

  btn.addEventListener('click', toggle);
  document.getElementById('edt-hd-close').addEventListener('click', toggle);

  chips.addEventListener('click', e => {
    const c = e.target.closest('.edt-chip');
    if (!c) return;
    inp.value = c.dataset.q;
    doSend();
  });

  inp.addEventListener('input', () => {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 90) + 'px';
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  send.addEventListener('click', doSend);

  function addTs() {
    const el = document.createElement('div');
    el.className = 'edt-ts';
    el.textContent = new Date().toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'});
    msgs.appendChild(el);
  }

  function addMsg(role, text) {
    const row = document.createElement('div');
    row.className = 'edt-row ' + role;

    const avt = document.createElement('div');
    avt.className = 'edt-avt ' + role;
    avt.textContent = role === 'bot' ? '🤖' : '👤';

    const bbl = document.createElement('div');
    bbl.className = 'edt-bbl ' + role;
    bbl.textContent = text;

    if (role === 'bot') { row.appendChild(avt); row.appendChild(bbl); }
    else                { row.appendChild(bbl); row.appendChild(avt); }

    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'edt-row bot'; row.id = 'edt-typing';
    const avt = document.createElement('div');
    avt.className = 'edt-avt bot'; avt.textContent = '🤖';
    const bbl = document.createElement('div');
    bbl.className = 'edt-bbl typing';
    bbl.innerHTML = '<div class="edt-dots"><span></span><span></span><span></span></div>';
    row.appendChild(avt); row.appendChild(bbl);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    const t = document.getElementById('edt-typing');
    if (t) t.remove();
  }

  async function doSend() {
    const text = inp.value.trim();
    if (!text || send.disabled) return;
    inp.value = ''; inp.style.height = 'auto';
    chips.style.display = 'none';

    addMsg('user', text);
    history.push({ role: 'user', content: text });
    send.disabled = true;
    showTyping();

    try {
      // Calls the Express backend proxy at /api/ai-chat
      // which holds the ANTHROPIC_API_KEY server-side (no CORS issues)
      const _apiBase = (window.__EDUTRAC_CONFIG__ || {}).API_BASE_URL || '';
      const res = await fetch(_apiBase + '/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM[ROLE] || SYSTEM.visitor,
          messages: history,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text
        || "I'm having trouble connecting right now. Please try again shortly!";
      hideTyping();
      addTs();
      addMsg('bot', reply);
      history.push({ role: 'assistant', content: reply });
      if (history.length > 24) history = history.slice(-24);
    } catch {
      hideTyping();
      addMsg('bot', "Sorry, I couldn't connect. Please check your internet and try again.");
    }

    send.disabled = false;
    inp.focus();
  }

})();
