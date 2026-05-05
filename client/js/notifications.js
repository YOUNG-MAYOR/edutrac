// ============================================================
//  EduTrack NG — Period Reminder Notifications
//  Include this script on teacher/timetable.html
//  Works with Web Notifications API + Audio Bell
// ============================================================

const PERIOD_TIMES = [
  { period: 0, label: 'Period 1',  startH: 8,  startM: 0  },
  { period: 1, label: 'Period 2',  startH: 8,  startM: 45 },
  { period: 2, label: 'Break',     startH: 9,  startM: 30 },
  { period: 3, label: 'Period 3',  startH: 10, startM: 0  },
  { period: 4, label: 'Period 4',  startH: 10, startM: 45 },
  { period: 5, label: 'Period 5',  startH: 11, startM: 30 },
  { period: 6, label: 'Lunch',     startH: 12, startM: 15 },
  { period: 7, label: 'Period 6',  startH: 13, startM: 0  },
  { period: 8, label: 'Period 7',  startH: 13, startM: 45 },
];

// How many minutes BEFORE the period to send the reminder
const REMINDER_MINUTES_BEFORE = 5;

class PeriodNotifier {
  constructor() {
    this.timetableEntries = [];   // teacher's entries for today
    this.scheduledAlerts  = new Map(); // periodIndex -> timeoutId
    this.permissionGranted = false;
    this.audioCtx = null;
    this.checkInterval = null;
    this.notifiedPeriods = new Set(); // avoid double-firing
  }

  // ── 1. Request browser notification permission ────────────
  async requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      this.permissionGranted = true; return true;
    }
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    this.permissionGranted = (result === 'granted');
    return this.permissionGranted;
  }

  // ── 2. Load today's timetable for the teacher ─────────────
  setTodayEntries(entries) {
    const todayShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
    this.timetableEntries = (entries || []).filter(e => e.day === todayShort);
    return this.timetableEntries.length;
  }

  // ── 3. Play a bell sound using Web Audio API ──────────────
  playBell(times = 2) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (offset) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + offset + 0.5);
        gain.gain.setValueAtTime(0.6, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 1.0);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 1.0);
      };
      for (let i = 0; i < times; i++) playTone(i * 1.2);
    } catch (e) { /* audio not available */ }
  }

  // ── 4. Show in-app banner notification ───────────────────
  showBanner(title, body, urgent = false) {
    // Remove existing banner
    document.getElementById('et-period-banner')?.remove();

    const banner = document.createElement('div');
    banner.id = 'et-period-banner';
    banner.innerHTML = `
      <div style="
        position:fixed;top:16px;left:50%;transform:translateX(-50%);
        z-index:99999;min-width:300px;max-width:90vw;
        background:${urgent ? '#0a6e3f' : '#1e40af'};
        color:white;border-radius:14px;
        padding:16px 20px;
        box-shadow:0 8px 32px rgba(0,0,0,.35);
        display:flex;gap:14px;align-items:flex-start;
        animation:slideDown .35s cubic-bezier(.34,1.56,.64,1);
        font-family:var(--B,sans-serif);
      ">
        <div style="font-size:28px;line-height:1;flex-shrink:0;">${urgent ? '(bell)' : '⏰'}</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:15px;margin-bottom:3px;">${title}</div>
          <div style="font-size:13px;opacity:.9;">${body}</div>
        </div>
        <button onclick="document.getElementById('et-period-banner').remove()"
          style="background:rgba(255,255,255,.2);border:none;color:white;
                 border-radius:50%;width:26px;height:26px;cursor:pointer;
                 font-size:14px;flex-shrink:0;line-height:1;">×</button>
      </div>
      <style>
        @keyframes slideDown {
          from { opacity:0; transform:translateX(-50%) translateY(-20px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      </style>
    `;
    document.body.appendChild(banner);

    // Auto-dismiss after 12 seconds
    setTimeout(() => banner.remove(), 12000);
  }

  // ── 5. Fire the actual notification ──────────────────────
  fireNotification(entry, minutesBefore) {
    const subject  = entry.subjects?.name || 'Class';
    const cls      = entry.classes?.name  || '';
    const room     = entry.room ? ` · (pin) ${entry.room}` : '';
    const periodInfo = PERIOD_TIMES[entry.period];
    const isNow    = minutesBefore === 0;

    const title = isNow
      ? `(bell) Period Starting Now!`
      : `⏰ Period in ${minutesBefore} minutes`;

    const body = isNow
      ? `${subject} — ${cls}${room}. Head to class now!`
      : `${subject} — ${cls}${room}. Starts at ${periodInfo.startH}:${String(periodInfo.startM).padStart(2,'0')}.`;

    // Browser push notification
    if (this.permissionGranted) {
      try {
        new Notification(title, {
          body,
          icon: '../icons/logo.jpg',
          badge: '../icons/logo.jpg',
          tag: `period-${entry.period}`,
          requireInteraction: isNow,
        });
      } catch(e) {}
    }

    // In-app banner (always shown)
    this.showBanner(title, body, isNow);

    // Play bell
    this.playBell(isNow ? 3 : 1);

    // Update the period card UI to highlight it
    this.highlightPeriodCard(entry.period, isNow);
  }

  // ── 6. Highlight the period card on the page ─────────────
  highlightPeriodCard(periodIndex, isNow) {
    const cards = document.querySelectorAll('.tt-card');
    cards.forEach(card => {
      const periodLabel = card.querySelector('.tt-day-period');
      if (periodLabel && periodLabel.textContent === `P${periodIndex + 1}`) {
        card.style.transition = 'all .3s';
        card.style.borderColor = isNow ? '#0a6e3f' : '#f59e0b';
        card.style.boxShadow   = isNow
          ? '0 0 0 3px rgba(10,110,63,.2)'
          : '0 0 0 3px rgba(245,158,11,.2)';
        if (isNow) {
          card.style.background = '#f0fdf4';
          // Add "NOW" badge
          if (!card.querySelector('.now-badge')) {
            const badge = document.createElement('span');
            badge.className = 'now-badge';
            badge.textContent = 'NOW';
            badge.style.cssText = `
              background:#0a6e3f;color:white;font-size:10px;font-weight:800;
              padding:2px 7px;border-radius:100px;margin-left:8px;
              letter-spacing:.5px;vertical-align:middle;
            `;
            card.querySelector('.tt-subject')?.appendChild(badge);
          }
        }
      }
    });
  }

  // ── 7. Schedule all reminders for today ──────────────────
  scheduleToday() {
    // Clear old schedules
    this.scheduledAlerts.forEach(id => clearTimeout(id));
    this.scheduledAlerts.clear();
    this.notifiedPeriods.clear();

    const now = new Date();
    let scheduled = 0;

    this.timetableEntries.forEach(entry => {
      const periodInfo = PERIOD_TIMES[entry.period];
      if (!periodInfo) return;

      // ── Reminder: X minutes before ──
      const reminderTime = new Date();
      reminderTime.setHours(periodInfo.startH, periodInfo.startM - REMINDER_MINUTES_BEFORE, 0, 0);
      const reminderMs = reminderTime - now;

      if (reminderMs > 0) {
        const id = setTimeout(() => {
          if (!this.notifiedPeriods.has(`pre-${entry.period}`)) {
            this.notifiedPeriods.add(`pre-${entry.period}`);
            this.fireNotification(entry, REMINDER_MINUTES_BEFORE);
          }
        }, reminderMs);
        this.scheduledAlerts.set(`pre-${entry.period}`, id);
        scheduled++;
      }

      // ── Alert: exactly at period start ──
      const startTime = new Date();
      startTime.setHours(periodInfo.startH, periodInfo.startM, 0, 0);
      const startMs = startTime - now;

      if (startMs > 0) {
        const id = setTimeout(() => {
          if (!this.notifiedPeriods.has(`start-${entry.period}`)) {
            this.notifiedPeriods.add(`start-${entry.period}`);
            this.fireNotification(entry, 0);
          }
        }, startMs);
        this.scheduledAlerts.set(`start-${entry.period}`, id);
        scheduled++;
      }
    });

    return scheduled;
  }

  // ── 8. Start the notifier ─────────────────────────────────
  async start(entries) {
    const count = this.setTodayEntries(entries);
    if (count === 0) return { success: false, reason: 'no_periods_today' };

    const granted = await this.requestPermission();
    this.scheduleToday();

    // Re-schedule at midnight for next day (if page stays open)
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    setTimeout(() => this.scheduleToday(), midnight - new Date());

    return { success: true, periodsToday: count, permissionGranted: granted };
  }

  // ── 9. Stop everything ────────────────────────────────────
  stop() {
    this.scheduledAlerts.forEach(id => clearTimeout(id));
    this.scheduledAlerts.clear();
    document.getElementById('et-period-banner')?.remove();
  }
}

// Export global instance
window.PeriodNotifier = PeriodNotifier;
