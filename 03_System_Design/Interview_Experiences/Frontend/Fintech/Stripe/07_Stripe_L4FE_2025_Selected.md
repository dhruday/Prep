# Stripe — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Senior Frontend Engineer |
| **Level** | L4 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore (Remote) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 3 Technical + Hiring Manager)
- **Timeline:** 4 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — API Key Management Console

### Problem
Build a developer API key management interface:
1. List of API keys: name, key (masked), type (SECRET/PUBLISHABLE), created date, last used
2. Create new key: name, type selection, optional restriction (IP allow-list)
3. Key reveal: click to unmask, auto-hide after 10 seconds
4. Rotate key: generate a new secret while keeping same name/config, old key shown with "deprecated" warning
5. Copy to clipboard with visual feedback
6. Webhook signing secret section with roll-over support
7. Usage sparkline per key (mini chart of last 7 days API calls)

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>API Key Management</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'SF Mono', 'Menlo', monospace; background: #0a0f1e; color: #e2e8f0; padding: 20px; }

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 18px; color: #93c5fd; }
.header-actions { display: flex; gap: 8px; }
.btn { padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; border: none; font-family: inherit; }
.btn-primary { background: #635bff; color: #fff; }
.btn-primary:hover { background: #5347d6; }
.btn-outline { background: transparent; border: 1px solid #334155; color: #94a3b8; }
.btn-outline:hover { border-color: #635bff; color: #635bff; }
.btn-danger { background: #7f1d1d; color: #fca5a5; }

/* Cards */
.section { margin-bottom: 20px; }
.section-title { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.key-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; margin-bottom: 8px; }
.key-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.key-name { font-size: 14px; font-weight: 600; }
.key-type { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
.type-secret { background: #7f1d1d; color: #fca5a5; }
.type-publishable { background: #064e3b; color: #34d399; }
.deprecated-tag { background: #713f12; color: #fbbf24; padding: 2px 6px; border-radius: 3px; font-size: 9px; margin-left: 6px; }

.key-value-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; background: #0f172a; padding: 8px 10px; border-radius: 6px; }
.key-value { flex: 1; font-size: 12px; color: #93c5fd; word-break: break-all; }
.key-masked { color: #475569; }
.eye-btn, .copy-btn { background: none; border: none; font-size: 14px; cursor: pointer; padding: 2px; }
.copy-feedback { font-size: 10px; color: #34d399; margin-left: 4px; display: none; }

.key-meta { display: flex; gap: 16px; font-size: 11px; color: #475569; }
.key-actions { display: flex; gap: 6px; margin-top: 8px; }

/* Sparkline */
.sparkline-wrap { display: flex; align-items: center; gap: 8px; }
.sparkline-label { font-size: 10px; color: #475569; }

/* IP Restrictions */
.ip-list { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.ip-badge { background: #1e293b; padding: 1px 6px; border-radius: 3px; margin-right: 4px; }

/* Create Modal */
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 100; align-items: center; justify-content: center; }
.modal-overlay.visible { display: flex; }
.modal { background: #111827; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; width: 400px; }
.modal h3 { font-size: 16px; margin-bottom: 14px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 11px; color: #64748b; margin-bottom: 4px; }
.form-group input, .form-group select { width: 100%; padding: 8px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; font-family: inherit; font-size: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

/* Webhook Section */
.webhook-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; }
.webhook-secret-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; background: #0f172a; padding: 8px 10px; border-radius: 6px; }
.rollover-info { font-size: 10px; color: #d97706; margin-top: 6px; }
</style>
</head>
<body>

<div class="header">
  <h1>🔑 API Keys</h1>
  <div class="header-actions">
    <button class="btn btn-primary" id="createKeyBtn">+ Create Key</button>
  </div>
</div>

<div class="section">
  <div class="section-title">Standard Keys</div>
  <div id="keysList"></div>
</div>

<div class="section">
  <div class="section-title">Webhook Signing Secret</div>
  <div id="webhookSection"></div>
</div>

<div class="modal-overlay" id="modalOverlay">
  <div class="modal">
    <h3>Create API Key</h3>
    <div class="form-group"><label>Key Name</label><input type="text" id="newKeyName" placeholder="Production Key"></div>
    <div class="form-group"><label>Type</label><select id="newKeyType"><option value="secret">Secret</option><option value="publishable">Publishable</option></select></div>
    <div class="form-group"><label>IP Restrictions (comma-separated, optional)</label><input type="text" id="newKeyIPs" placeholder="203.0.113.1, 198.51.100.0"></div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="cancelCreate">Cancel</button>
      <button class="btn btn-primary" id="confirmCreate">Create</button>
    </div>
  </div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
function genKey(type) {
  const prefix = type === 'secret' ? 'sk_live_' : 'pk_live_';
  return prefix + Array.from({ length: 24 }, () => '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 62)]).join('');
}

let keys = [
  { id: 1, name: 'Production Secret', key: genKey('secret'), type: 'secret', created: new Date('2025-01-15'), lastUsed: new Date('2025-04-20'), ips: ['203.0.113.1'], usage: [120, 145, 130, 160, 180, 150, 175], deprecated: false },
  { id: 2, name: 'Production Publishable', key: genKey('publishable'), type: 'publishable', created: new Date('2025-01-15'), lastUsed: new Date('2025-04-20'), ips: [], usage: [400, 380, 420, 450, 410, 440, 460], deprecated: false },
  { id: 3, name: 'Legacy Key (rotated)', key: genKey('secret'), type: 'secret', created: new Date('2024-06-01'), lastUsed: new Date('2025-03-01'), ips: [], usage: [5, 3, 1, 0, 0, 0, 0], deprecated: true }
];

let webhookSecret = { current: 'whsec_' + genKey('secret').slice(8), rollover: null, rolledAt: null };
let revealedKeys = new Set();
let hideTimers = {};

// ============================================================
// SPARKLINE
// ============================================================
function drawSparkline(data, width = 70, height = 20) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const max = Math.max(...data);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * (height - 4) - 2
  }));

  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#635bff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Fill
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fillStyle = 'rgba(99,91,255,0.1)';
  ctx.fill();

  return canvas.toDataURL();
}

// ============================================================
// RENDER KEYS
// ============================================================
function renderKeys() {
  document.getElementById('keysList').innerHTML = keys.map(k => {
    const revealed = revealedKeys.has(k.id);
    const displayKey = revealed ? k.key : k.key.slice(0, 7) + '••••••••••••••••' + k.key.slice(-4);
    const sparkImg = drawSparkline(k.usage);
    const totalCalls = k.usage.reduce((a, b) => a + b, 0);

    return `
      <div class="key-card">
        <div class="key-header">
          <div>
            <span class="key-name">${k.name}</span>
            <span class="key-type type-${k.type}">${k.type.toUpperCase()}</span>
            ${k.deprecated ? '<span class="deprecated-tag">DEPRECATED</span>' : ''}
          </div>
          <div class="sparkline-wrap">
            <img src="${sparkImg}" style="vertical-align:middle;">
            <span class="sparkline-label">${totalCalls} calls / 7d</span>
          </div>
        </div>
        <div class="key-value-row">
          <span class="key-value ${revealed ? '' : 'key-masked'}">${displayKey}</span>
          <button class="eye-btn" data-id="${k.id}" title="Reveal">${revealed ? '🙈' : '👁'}</button>
          <button class="copy-btn" data-key="${k.key}" title="Copy">📋</button>
          <span class="copy-feedback" id="copyFB_${k.id}">Copied!</span>
        </div>
        ${k.ips.length ? `<div class="ip-list">Restricted to: ${k.ips.map(ip => `<span class="ip-badge">${ip}</span>`).join('')}</div>` : ''}
        <div class="key-meta">
          <span>Created: ${k.created.toLocaleDateString()}</span>
          <span>Last used: ${k.lastUsed.toLocaleDateString()}</span>
        </div>
        <div class="key-actions">
          ${!k.deprecated ? `<button class="btn btn-outline" data-rotate="${k.id}">🔄 Rotate</button>` : ''}
          <button class="btn btn-danger" data-delete="${k.id}">🗑 Revoke</button>
        </div>
      </div>
    `;
  }).join('');

  attachKeyEvents();
}

function attachKeyEvents() {
  // Reveal/hide
  document.querySelectorAll('.eye-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (revealedKeys.has(id)) {
        revealedKeys.delete(id);
        clearTimeout(hideTimers[id]);
      } else {
        revealedKeys.add(id);
        hideTimers[id] = setTimeout(() => { revealedKeys.delete(id); renderKeys(); }, 10000);
      }
      renderKeys();
    });
  });

  // Copy
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.key).then(() => {
        const fb = btn.nextElementSibling;
        fb.style.display = 'inline';
        setTimeout(() => fb.style.display = 'none', 2000);
      });
    });
  });

  // Rotate
  document.querySelectorAll('[data-rotate]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.rotate);
      if (!confirm('Rotate this key? The old key will be deprecated.')) return;
      const old = keys.find(k => k.id === id);
      if (!old) return;

      // Deprecate old
      old.deprecated = true;
      old.name += ' (rotated)';

      // Create new
      const newKey = {
        id: Date.now(),
        name: old.name.replace(' (rotated)', ''),
        key: genKey(old.type),
        type: old.type,
        created: new Date(),
        lastUsed: new Date(),
        ips: [...old.ips],
        usage: [0, 0, 0, 0, 0, 0, 0],
        deprecated: false
      };
      keys.unshift(newKey);
      renderKeys();
    });
  });

  // Delete
  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.delete);
      if (!confirm('Permanently revoke this key?')) return;
      keys = keys.filter(k => k.id !== id);
      renderKeys();
    });
  });
}

// ============================================================
// WEBHOOK SECRET
// ============================================================
function renderWebhook() {
  const s = webhookSecret;
  const masked = s.current.slice(0, 6) + '••••••••••••••••' + s.current.slice(-4);

  document.getElementById('webhookSection').innerHTML = `
    <div class="webhook-card">
      <div style="font-size:13px;font-weight:600;">Signing Secret</div>
      <div class="webhook-secret-row">
        <span class="key-value key-masked" style="flex:1;">${masked}</span>
        <button class="copy-btn" id="copyWebhook">📋</button>
      </div>
      ${s.rollover ? `<div class="rollover-info">⚠️ Roll-over active since ${s.rolledAt.toLocaleDateString()}. Previous secret still accepted for 24h.</div>` : ''}
      <div style="margin-top:8px;">
        <button class="btn btn-outline" id="rollWebhook">🔄 Roll Secret</button>
      </div>
    </div>
  `;

  document.getElementById('copyWebhook').addEventListener('click', () => {
    navigator.clipboard.writeText(s.current);
  });

  document.getElementById('rollWebhook').addEventListener('click', () => {
    if (!confirm('Roll webhook secret? Current secret will still work for 24 hours.')) return;
    s.rollover = s.current;
    s.current = 'whsec_' + genKey('secret').slice(8);
    s.rolledAt = new Date();
    renderWebhook();
  });
}

// ============================================================
// CREATE MODAL
// ============================================================
document.getElementById('createKeyBtn').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.add('visible');
});

document.getElementById('cancelCreate').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.remove('visible');
});

document.getElementById('confirmCreate').addEventListener('click', () => {
  const name = document.getElementById('newKeyName').value.trim();
  const type = document.getElementById('newKeyType').value;
  const ipsRaw = document.getElementById('newKeyIPs').value.trim();

  if (!name) return alert('Enter a key name');

  const ips = ipsRaw ? ipsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  keys.unshift({
    id: Date.now(), name, key: genKey(type), type, created: new Date(),
    lastUsed: new Date(), ips, usage: [0, 0, 0, 0, 0, 0, 0], deprecated: false
  });

  document.getElementById('modalOverlay').classList.remove('visible');
  document.getElementById('newKeyName').value = '';
  document.getElementById('newKeyIPs').value = '';
  renderKeys();
});

// ============================================================
// INIT
// ============================================================
renderKeys();
renderWebhook();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Key masking**: `key.slice(0,7) + '••••' + key.slice(-4)`, reveal toggle with auto-hide `setTimeout(10000)`
- **Sparkline**: Canvas mini chart — normalized y-values, gradient fill under line, exported as `canvas.toDataURL()` for inline `<img>`
- **Key rotation**: deprecate old key (mark + rename), create clone with new secret, preserve IP restrictions
- **Webhook roll-over**: old secret kept active for 24h grace period alongside new secret
- Copy to clipboard: `navigator.clipboard.writeText()` + brief "Copied!" flash
- Modal form: overlay with fixed positioning, visible class toggle
- Dark developer console theme: monospace font, dark blue-gray palette

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Fundamentals, API Design |
| Technical 1 | Medium | DOM, CSS, Forms |
| Technical 2 | Hard | Key Management, Canvas, Rotation Logic |
| Technical 3 | Hard | System Design Discussion |
| Hiring Manager | Medium | Developer Tools, API Platform |
