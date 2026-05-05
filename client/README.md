# EduTrack NG — v4.0 Final

**Smart School Management System for Nigerian Primary & Secondary Schools**

---

## 🚀 Quick Setup (under 30 minutes)

### Step 1 — Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project → Choose a region closest to Nigeria (Europe West recommended)
2. Copy your **Project URL** and **anon public key** from Settings → API

### Step 2 — Configure Credentials
Open `js/supabase.js` and replace:
```js
const SUPABASE_URL = 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### Step 3 — Disable Email Confirmation
Supabase → Authentication → Settings → Email → **Disable "Confirm email"**
*(Required so school admins can log in immediately after registration)*

### Step 4 — Run the Database Schema
1. Go to Supabase → SQL Editor
2. Paste the entire contents of `sql/SCHEMA_FINAL.sql`
3. Click **Run**

### Step 5 — Enable JWT Hook
Supabase → Authentication → Hooks → Enable **custom_access_token_hook**
- Provider: `postgres`
- Schema: `public`
- Function: `custom_access_token_hook`

### Step 6 — Create SaaS Owner Account
1. Supabase → Authentication → Users → **Add user** → enter your email + password
2. Copy the **UUID** from the user row
3. In SQL Editor, run:
```sql
SELECT create_saas_owner('YOUR-UUID-HERE', 'Your Name');
```

### Step 7 — Deploy on Netlify
1. Go to [netlify.com](https://netlify.com) → Add new site → Drag & drop the project folder
2. Your site is live!

### Step 8 — Register Your First School
1. Log in at `/saas-admin/login.html`
2. Click **+ Register New School**
3. Fill in school details + first admin account
4. The wizard creates everything in one shot

### Step 9 — Log in as School Admin
1. Go to `/login.html`
2. Use the admin email/password from Step 8
3. Go to Settings → Load Nigerian Grading Scale
4. Create classes, admit students, assign teachers — you're done!

---

## 📁 Project Structure

```
edutrack_NG/
├── index.html              — Public landing page (includes CBT app download)
├── login.html              — Staff login (Admin, Teacher, Exam Officer, Parent)
├── offline.html            — Standalone CBT practice app (downloadable)
├── manifest.json           — PWA manifest
├── sw.js                   — Service worker (offline support)
├── netlify.toml            — Netlify config
│
├── admin/                  — School Administrator portal
│   ├── index.html          — Dashboard
│   ├── students.html       — Student management + bulk CSV import
│   ├── staff.html          — Staff management
│   ├── classes.html        — Class management
│   ├── results.html        — Results entry
│   ├── attendance.html     — Attendance overview
│   ├── fees.html           — Fee types
│   ├── payments.html       — Payment recording
│   ├── timetable.html      — Timetable builder
│   ├── sms.html            — SMS via Termii
│   ├── whatsapp.html       — WhatsApp notifications
│   ├── import.html         — Bulk CSV student import
│   ├── settings.html       — School settings + grading scale
│   └── results.html        — Publish results
│
├── teacher/                — Teacher portal
│   ├── index.html          — Dashboard
│   ├── attendance.html     — Mark attendance
│   ├── scores.html         — Enter CA & exam scores
│   ├── students.html       — View class students
│   └── timetable.html      — View timetable
│
├── exam-officer/           — Exam Officer portal
│   ├── index.html          — Dashboard
│   ├── exams.html          — Create/manage exams
│   ├── results.html        — Enter results
│   ├── students.html       — View students
│   └── report-cards.html   — Print report cards
│
├── parent/                 — Parent/Guardian portal
│   ├── index.html          — Dashboard
│   ├── results.html        — View child's results
│   ├── attendance.html     — View attendance
│   └── fees.html           — View fee balance
│
├── student/                — Student portal (PIN login)
│   ├── login.html          — Login with Admission No. + PIN
│   ├── index.html          — Dashboard
│   ├── results.html        — View own results
│   ├── attendance.html     — View attendance
│   ├── fees.html           — View fee status
│   └── profile.html        — Student profile
│
├── saas-admin/             — SaaS Platform Admin (you, the owner)
│   ├── login.html          — Platform owner login
│   ├── index.html          — Platform dashboard
│   ├── schools.html        — All schools + Register New School
│   ├── school-detail.html  — Per-school deep dive
│   ├── users.html          — All users across schools
│   ├── billing.html        — Subscription management
│   ├── announcements.html  — Platform-wide announcements
│   └── audit.html          — Action audit log
│
├── report-card/
│   └── index.html          — Printable report card generator
│
├── css/
│   └── global.css          — Shared design system (Plus Jakarta Sans)
│
├── js/
│   ├── supabase.js         — Supabase client + shared utilities
│   ├── layout.js           — Portal layout renderer
│   ├── notifications.js    — In-app notification system
│   └── pwa.js              — PWA install prompt
│
├── sql/
│   ├── SCHEMA_FINAL.sql    — ⭐ THE DEFINITIVE SCHEMA — run this
│   └── NUCLEAR_RESET.sql   — Drops all tables (use only for fresh start)
│
└── icons/                  — School & app images
```

---

## 🗄️ Database Overview (23 Tables)

| Table | Purpose |
|-------|---------|
| `schools` | School records (SaaS tenants) |
| `users` | All staff accounts (mirrors auth.users) |
| `academic_years` | E.g. "2024/2025" |
| `terms` | First, Second, Third Term |
| `classes` | JSS1A, SS2B, etc. |
| `subject_combinations` | Science, Arts, Commercial |
| `subjects` | All 30+ Nigerian subjects |
| `combination_subjects` | Which subjects belong to which combo |
| `class_subjects` | Teacher → Class → Subject → Term assignment |
| `students` | Student records |
| `enrollments` | Student → Class per Term |
| `attendance` | Daily attendance (P/A/L/E) |
| `exams` | CA1, CA2, Exam definitions |
| `results` | Scores per student/subject/exam |
| `grading_scales` | A1–F9 per school |
| `parent_students` | Parent ↔ Student links |
| `fee_types` | Fee definitions (with amount) |
| `payments` | Payment records |
| `timetable` | Class timetable |
| `sms_log` | SMS notification log |
| `dashboard_settings` | Per-school visibility toggles |
| `saas_audit_log` | SaaS owner action log |
| `platform_announcements` | Broadcast to all schools |

---

## 🔒 Security Model

- **JWT Hook** embeds `user_role` + `school_id` into every Supabase token
- **Row Level Security** on all 23 tables — no cross-school data leaks
- **SaaS owner** can see and manage all schools
- **School admin** can only see their school's data
- **Teachers** can only enter scores for their assigned subjects
- **Student portal** uses anon key with admission_no + PIN — no auth.users required

---

## 🐛 Bugs Fixed in v4.0

1. **Session destruction bug** — `signUp()` in school registration no longer logs out the SaaS owner (session is saved and restored)
2. **Plan value bug** — select option values are now clean (`free`, `basic`, `pro`)
3. **Exams UNIQUE constraint** — fixed from `(school_id, name)` to `(school_id, name, term_id)`
4. **Grading scale duplicates** — added `UNIQUE(school_id, grade)` constraint
5. **Missing `create_saas_owner()` function** — added safe idempotent helper
6. **Missing `seed_default_exams()` function** — added helper for CA1/CA2/Exam defaults
7. **Font consistency** — Plus Jakarta Sans + DM Sans used across all portals

---

## 📱 CBT App

The downloadable CBT practice app (`offline.html`) is a single-file offline application that:
- Works 100% without internet after download
- Covers JAMB UTME past questions
- Runs a real exam timer simulation
- Shows instant score + answer review
- Works on ₦30,000 Android phones

Download it from the homepage CBT section.

---

## 💬 Support

- WhatsApp: via homepage support link
- GitHub Issues: file bugs at your repository
- SaaS Admin: `yoursite.com/saas-admin/login.html`

---

*EduTrack NG — Proudly built for Nigerian schools 🇳🇬*
