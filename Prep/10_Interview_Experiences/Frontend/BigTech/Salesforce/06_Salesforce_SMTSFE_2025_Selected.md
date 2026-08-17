# Salesforce — SMTS Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | Senior Member of Technical Staff (FE) |
| **Level** | SMTS |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Coding — Notification Center with Priority Queue

### Problem
Build a notification center UI with:
1. Toast-style notification popups (success, warning, error, info)
2. Notification bell with unread count badge
3. Dropdown panel showing notification history (newest first)
4. Auto-dismiss timer with progress bar (configurable per type)
5. Priority queue: error > warning > info > success display order
6. Mark as read / mark all read
7. Group notifications by date

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Notification Center</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f0f2f5; padding: 20px; }

.top-bar { display: flex; justify-content: flex-end; align-items: center; padding: 12px 24px; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 20px; position: relative; }

.bell-btn { position: relative; background: none; border: none; font-size: 24px; cursor: pointer; padding: 8px; border-radius: 8px; }
.bell-btn:hover { background: #f0f2f5; }
.bell-badge { position: absolute; top: 2px; right: 2px; background: #e74c3c; color: #fff; font-size: 11px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
.bell-badge.hidden { display: none; }

.notif-panel { position: absolute; top: 100%; right: 0; width: 380px; max-height: 480px; background: #fff; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); display: none; z-index: 100; overflow: hidden; margin-top: 8px; }
.notif-panel.open { display: block; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #eee; }
.panel-header h3 { font-size: 16px; color: #222; }
.mark-all-btn { background: none; border: none; color: #3498db; cursor: pointer; font-size: 13px; font-weight: 500; }
.mark-all-btn:hover { text-decoration: underline; }
.panel-body { overflow-y: auto; max-height: 420px; }
.date-group { padding: 8px 16px 4px; font-size: 12px; color: #888; font-weight: 600; text-transform: uppercase; background: #fafafa; position: sticky; top: 0; }
.notif-item { display: flex; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5; cursor: pointer; transition: background 0.15s; }
.notif-item:hover { background: #f8f9fa; }
.notif-item.unread { background: #eef6ff; }
.notif-item.unread:hover { background: #ddeeff; }
.notif-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.icon-error { background: #fde8e8; }
.icon-warning { background: #fff3e0; }
.icon-info { background: #e3f2fd; }
.icon-success { background: #e8f5e9; }
.notif-content { flex: 1; }
.notif-title { font-size: 14px; font-weight: 500; color: #222; }
.notif-body { font-size: 13px; color: #666; margin-top: 2px; }
.notif-time { font-size: 11px; color: #999; margin-top: 4px; }
.unread-dot { width: 8px; height: 8px; background: #3498db; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.empty-state { padding: 40px; text-align: center; color: #999; font-size: 14px; }

/* Toast container */
.toast-container { position: fixed; top: 20px; right: 20px; width: 360px; z-index: 1000; display: flex; flex-direction: column; gap: 8px; }
.toast { padding: 12px 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; gap: 10px; align-items: flex-start; animation: slideIn 0.3s ease; position: relative; overflow: hidden; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.toast-exit { animation: slideOut 0.3s ease forwards; }
@keyframes slideOut { to { transform: translateX(100%); opacity: 0; } }
.toast-error { background: #fde8e8; border-left: 4px solid #e74c3c; }
.toast-warning { background: #fff8e1; border-left: 4px solid #f39c12; }
.toast-info { background: #e3f2fd; border-left: 4px solid #3498db; }
.toast-success { background: #e8f5e9; border-left: 4px solid #27ae60; }
.toast-icon { font-size: 18px; }
.toast-text { flex: 1; }
.toast-title { font-size: 14px; font-weight: 600; color: #222; }
.toast-body { font-size: 13px; color: #555; margin-top: 2px; }
.toast-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #999; padding: 0 4px; }
.toast-progress { position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(0,0,0,0.15); transition: width linear; }

/* Demo controls */
.demo { max-width: 600px; margin: 40px auto; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.demo h3 { margin-bottom: 12px; color: #222; }
.demo-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.demo-btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; color: #fff; }
</style>
</head>
<body>
<div class="top-bar">
  <button class="bell-btn" id="bellBtn">
    🔔<span class="bell-badge hidden" id="bellBadge">0</span>
  </button>
  <div class="notif-panel" id="notifPanel">
    <div class="panel-header">
      <h3>Notifications</h3>
      <button class="mark-all-btn" id="markAllBtn">Mark all read</button>
    </div>
    <div class="panel-body" id="panelBody"></div>
  </div>
</div>

<div class="toast-container" id="toastContainer"></div>

<div class="demo">
  <h3>Trigger Notifications</h3>
  <div class="demo-btns">
    <button class="demo-btn" style="background:#e74c3c" onclick="triggerNotif('error')">Error</button>
    <button class="demo-btn" style="background:#f39c12" onclick="triggerNotif('warning')">Warning</button>
    <button class="demo-btn" style="background:#3498db" onclick="triggerNotif('info')">Info</button>
    <button class="demo-btn" style="background:#27ae60" onclick="triggerNotif('success')">Success</button>
    <button class="demo-btn" style="background:#8e44ad" onclick="triggerBurst()">Burst (5)</button>
  </div>
</div>

<script>
// ============================================================
// STATE
// ============================================================
const ICONS = { error: '❌', warning: '⚠️', info: 'ℹ️', success: '✅' };
const PRIORITY = { error: 0, warning: 1, info: 2, success: 3 };
const AUTO_DISMISS = { error: 8000, warning: 6000, info: 4000, success: 3000 };

let notifications = [];
let nextId = 1;

// DOM
const bellBtn = document.getElementById('bellBtn');
const bellBadge = document.getElementById('bellBadge');
const notifPanel = document.getElementById('notifPanel');
const panelBody = document.getElementById('panelBody');
const toastContainer = document.getElementById('toastContainer');

// ============================================================
// NOTIFICATION MANAGEMENT
// ============================================================
function addNotification(type, title, body) {
  const notif = {
    id: nextId++,
    type,
    title,
    body,
    time: new Date(),
    read: false,
    priority: PRIORITY[type]
  };
  notifications.unshift(notif);
  notifications.sort((a, b) => {
    // Sort by priority first (for toast queue), then by time
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.time - a.time;
  });

  updateBadge();
  renderPanel();
  showToast(notif);
}

function markRead(id) {
  const notif = notifications.find(n => n.id === id);
  if (notif) notif.read = true;
  updateBadge();
  renderPanel();
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  updateBadge();
  renderPanel();
}

function updateBadge() {
  const unread = notifications.filter(n => !n.read).length;
  bellBadge.textContent = unread > 99 ? '99+' : unread;
  bellBadge.classList.toggle('hidden', unread === 0);
}

// ============================================================
// PANEL RENDERING
// ============================================================
function renderPanel() {
  panelBody.innerHTML = '';

  if (notifications.length === 0) {
    panelBody.innerHTML = '<div class="empty-state">No notifications yet</div>';
    return;
  }

  // Group by date
  const groups = {};
  const sorted = [...notifications].sort((a, b) => b.time - a.time);

  sorted.forEach(n => {
    const dateKey = formatDate(n.time);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(n);
  });

  for (const [date, notifs] of Object.entries(groups)) {
    const dateHeader = document.createElement('div');
    dateHeader.className = 'date-group';
    dateHeader.textContent = date;
    panelBody.appendChild(dateHeader);

    notifs.forEach(n => {
      const item = document.createElement('div');
      item.className = 'notif-item' + (n.read ? '' : ' unread');
      item.innerHTML = `
        <div class="notif-icon icon-${n.type}">${ICONS[n.type]}</div>
        <div class="notif-content">
          <div class="notif-title">${escHtml(n.title)}</div>
          <div class="notif-body">${escHtml(n.body)}</div>
          <div class="notif-time">${formatTimeAgo(n.time)}</div>
        </div>
        ${n.read ? '' : '<div class="unread-dot"></div>'}
      `;
      item.addEventListener('click', () => markRead(n.id));
      panelBody.appendChild(item);
    });
  }
}

// ============================================================
// TOAST RENDERING
// ============================================================
function showToast(notif) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${notif.type}`;
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[notif.type]}</span>
    <div class="toast-text">
      <div class="toast-title">${escHtml(notif.title)}</div>
      <div class="toast-body">${escHtml(notif.body)}</div>
    </div>
    <button class="toast-close">✕</button>
    <div class="toast-progress" style="width:100%"></div>
  `;

  toastContainer.appendChild(toast);

  // Progress bar countdown
  const duration = AUTO_DISMISS[notif.type];
  const progress = toast.querySelector('.toast-progress');
  progress.style.transitionDuration = duration + 'ms';
  requestAnimationFrame(() => { progress.style.width = '0%'; });

  // Auto dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timer);
    dismissToast(toast);
  });

  // Pause on hover
  toast.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    progress.style.transitionDuration = '0s';
  });
}

function dismissToast(toast) {
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', () => toast.remove());
}

// ============================================================
// HELPERS
// ============================================================
function formatDate(date) {
  const today = new Date();
  const d = new Date(date);
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeAgo(date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ============================================================
// EVENTS
// ============================================================
bellBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  notifPanel.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!notifPanel.contains(e.target) && e.target !== bellBtn) {
    notifPanel.classList.remove('open');
  }
});

document.getElementById('markAllBtn').addEventListener('click', markAllRead);

// ============================================================
// DEMO TRIGGERS
// ============================================================
const DEMO_NOTIFS = {
  error: [
    { title: 'Deployment Failed', body: 'Build #4521 failed on staging environment' },
    { title: 'API Error 500', body: 'Payment service returned internal server error' }
  ],
  warning: [
    { title: 'High Memory Usage', body: 'Server memory at 92% capacity' },
    { title: 'Certificate Expiring', body: 'SSL certificate expires in 7 days' }
  ],
  info: [
    { title: 'New Feature Available', body: 'Dark mode is now available in settings' },
    { title: 'Scheduled Maintenance', body: 'Planned downtime on Sunday 2-4 AM UTC' }
  ],
  success: [
    { title: 'Build Successful', body: 'Build #4522 deployed to production' },
    { title: 'Backup Complete', body: 'Database backup completed successfully' }
  ]
};

window.triggerNotif = function(type) {
  const options = DEMO_NOTIFS[type];
  const n = options[Math.floor(Math.random() * options.length)];
  addNotification(type, n.title, n.body);
};

window.triggerBurst = function() {
  ['error', 'warning', 'info', 'success', 'warning'].forEach((type, i) => {
    setTimeout(() => triggerNotif(type), i * 300);
  });
};

// Seed some initial notifications
addNotification('info', 'Welcome!', 'Your notification center is ready');
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Salesforce FE interviews test **enterprise notification systems** — common in CRM products
- Priority-based ordering: error > warning > info > success for display urgency
- **Toast auto-dismiss** with CSS transition progress bar — no JS interval needed
- Pause toast on hover: clear timeout + stop CSS transition (`transitionDuration = 0`)
- Date grouping: "Today" / "Yesterday" / date — sticky headers with `position: sticky`
- Unread badge: cap at "99+" to prevent badge overflow
- `animationend` event listener for clean toast removal after exit animation
- `escHtml` via textContent → innerHTML prevents XSS in notification content

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical 1 | Medium | DOM, Events |
| Technical 2 | Hard | Notification System, Priority Queue, Animation |
| Hiring Manager | Medium | Culture, Leadership |
