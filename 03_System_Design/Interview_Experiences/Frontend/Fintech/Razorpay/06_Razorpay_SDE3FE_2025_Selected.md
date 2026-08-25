# Razorpay — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + SD + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Payment Links Builder

### Problem
Build a payment link creation & management interface:
1. Form to create payment link: amount, description, customer name/email, expiry date
2. Generated link preview with copy-to-clipboard
3. Share via buttons (WhatsApp, Email, SMS)
4. Payment links list with status (Active, Paid, Expired)
5. Partial payments toggle — allow customer to pay amount in installments
6. Auto-expiry countdown on active links
7. Mini payment page preview (what the customer sees)

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Payment Links Builder</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f1f5f9; }

.layout { display: grid; grid-template-columns: 400px 1fr; min-height: 100vh; }

/* Left Panel — Form */
.form-panel { background: #fff; padding: 24px; border-right: 1px solid #e2e8f0; overflow-y: auto; }
.form-panel h2 { font-size: 18px; margin-bottom: 16px; color: #0f172a; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 12px; color: #475569; margin-bottom: 4px; font-weight: 500; }
.form-group input, .form-group textarea, .form-group select { width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; }
.form-group textarea { resize: vertical; height: 60px; }
.toggle-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.toggle-sw { position: relative; width: 36px; height: 20px; }
.toggle-sw input { display: none; }
.toggle-sw .slider { position: absolute; inset: 0; background: #cbd5e1; border-radius: 10px; transition: 0.2s; cursor: pointer; }
.toggle-sw .slider::before { content: ''; position: absolute; width: 16px; height: 16px; background: #fff; border-radius: 50%; top: 2px; left: 2px; transition: 0.2s; }
.toggle-sw input:checked + .slider { background: #2563eb; }
.toggle-sw input:checked + .slider::before { transform: translateX(16px); }
.toggle-label { font-size: 12px; color: #475569; }
.create-btn { width: 100%; padding: 10px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.create-btn:hover { background: #1d4ed8; }

/* Generated Link */
.link-box { margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: none; }
.link-box.visible { display: block; }
.link-url { font-family: monospace; font-size: 12px; color: #2563eb; word-break: break-all; margin-bottom: 8px; }
.link-actions { display: flex; gap: 6px; }
.link-action-btn { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px; cursor: pointer; background: #fff; }
.link-action-btn:hover { background: #f1f5f9; }
.copy-success { font-size: 11px; color: #16a34a; display: none; margin-top: 4px; }

/* Right Panel */
.right-panel { padding: 24px; overflow-y: auto; }
.tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
.tab { padding: 8px 18px; font-size: 13px; cursor: pointer; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }

/* Links List */
.links-list { display: flex; flex-direction: column; gap: 8px; }
.link-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; display: flex; align-items: center; gap: 12px; }
.link-status { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.link-status.active { background: #16a34a; }
.link-status.paid { background: #2563eb; }
.link-status.expired { background: #dc2626; }
.link-info { flex: 1; }
.link-customer { font-size: 13px; font-weight: 600; color: #0f172a; }
.link-desc { font-size: 11px; color: #64748b; margin-top: 2px; }
.link-countdown { font-size: 10px; color: #f59e0b; margin-top: 2px; }
.link-amount { font-size: 16px; font-weight: 700; color: #0f172a; }
.link-badge { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
.badge-active { background: #dcfce7; color: #16a34a; }
.badge-paid { background: #dbeafe; color: #2563eb; }
.badge-expired { background: #fee2e2; color: #dc2626; }
.partial-tag { font-size: 10px; color: #7c3aed; background: #ede9fe; padding: 1px 6px; border-radius: 3px; margin-left: 4px; }

/* Preview Panel */
.preview-panel { display: none; }
.preview-panel.visible { display: block; }
.preview-frame { max-width: 380px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,.1); overflow: hidden; }
.preview-header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 24px; text-align: center; color: #fff; }
.preview-logo { font-size: 24px; margin-bottom: 8px; }
.preview-amount { font-size: 28px; font-weight: 700; }
.preview-desc { font-size: 13px; opacity: 0.8; margin-top: 4px; }
.preview-body { padding: 20px; }
.preview-field { margin-bottom: 12px; }
.preview-field label { font-size: 11px; color: #64748b; display: block; margin-bottom: 4px; }
.preview-field .value { font-size: 14px; color: #0f172a; }
.preview-pay-btn { width: 100%; padding: 12px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.preview-footer { text-align: center; padding: 12px; font-size: 10px; color: #94a3b8; }
</style>
</head>
<body>

<div class="layout">
  <div class="form-panel">
    <h2>🔗 Create Payment Link</h2>
    <div class="form-group"><label>Amount (₹)</label><input type="number" id="plAmount" placeholder="1000" min="1"></div>
    <div class="form-group"><label>Description</label><textarea id="plDesc" placeholder="Invoice for web development"></textarea></div>
    <div class="form-group"><label>Customer Name</label><input type="text" id="plName" placeholder="John Doe"></div>
    <div class="form-group"><label>Customer Email</label><input type="email" id="plEmail" placeholder="john@example.com"></div>
    <div class="form-group"><label>Expiry</label><select id="plExpiry"><option value="24">24 hours</option><option value="72">3 days</option><option value="168" selected>7 days</option><option value="720">30 days</option></select></div>
    <div class="toggle-row">
      <label class="toggle-sw"><input type="checkbox" id="plPartial"><span class="slider"></span></label>
      <span class="toggle-label">Allow Partial Payments</span>
    </div>
    <button class="create-btn" id="createBtn">Generate Payment Link</button>
    <div class="link-box" id="linkBox">
      <div class="link-url" id="linkUrl"></div>
      <div class="link-actions">
        <button class="link-action-btn" id="copyBtn">📋 Copy</button>
        <button class="link-action-btn" id="whatsappBtn">💬 WhatsApp</button>
        <button class="link-action-btn" id="emailBtn">✉️ Email</button>
        <button class="link-action-btn" id="smsBtn">📱 SMS</button>
      </div>
      <div class="copy-success" id="copyMsg">✓ Copied to clipboard!</div>
    </div>
  </div>

  <div class="right-panel">
    <div class="tabs">
      <div class="tab active" data-tab="list">Payment Links</div>
      <div class="tab" data-tab="preview">Customer Preview</div>
    </div>
    <div id="listPanel" class="links-list"></div>
    <div id="previewPanel" class="preview-panel"></div>
  </div>
</div>

<script>
// ============================================================
// STATE
// ============================================================
let links = [
  { id: 'pl_001', amount: 5000, desc: 'Logo design', name: 'Priya S.', email: 'priya@example.com', status: 'active', partial: false, created: Date.now() - 86400000, expiryHrs: 168 },
  { id: 'pl_002', amount: 12000, desc: 'Monthly retainer', name: 'Arjun K.', email: 'arjun@corp.in', status: 'paid', partial: true, created: Date.now() - 172800000, expiryHrs: 168 },
  { id: 'pl_003', amount: 3500, desc: 'Consultation fee', name: 'Meera R.', email: 'meera@test.com', status: 'expired', partial: false, created: Date.now() - 864000000, expiryHrs: 168 }
];

let activeTab = 'list';
let lastCreated = null;

// ============================================================
// LINK CREATION
// ============================================================
document.getElementById('createBtn').addEventListener('click', () => {
  const amount = parseInt(document.getElementById('plAmount').value, 10);
  const desc = document.getElementById('plDesc').value.trim();
  const name = document.getElementById('plName').value.trim();
  const email = document.getElementById('plEmail').value.trim();
  const expiryHrs = parseInt(document.getElementById('plExpiry').value, 10);
  const partial = document.getElementById('plPartial').checked;

  if (!amount || amount <= 0) return alert('Enter a valid amount');
  if (!desc) return alert('Enter a description');
  if (!name) return alert('Enter customer name');
  if (!email || !email.includes('@')) return alert('Enter a valid email');

  const id = 'pl_' + Math.random().toString(36).substr(2, 8);
  const link = { id, amount, desc, name, email, status: 'active', partial, created: Date.now(), expiryHrs };
  links.unshift(link);
  lastCreated = link;

  // Show generated link
  const url = `https://rzp.io/l/${id}`;
  document.getElementById('linkUrl').textContent = url;
  document.getElementById('linkBox').classList.add('visible');

  renderLinks();
});

// ============================================================
// COPY & SHARE
// ============================================================
document.getElementById('copyBtn').addEventListener('click', () => {
  const url = document.getElementById('linkUrl').textContent;
  navigator.clipboard.writeText(url).then(() => {
    const msg = document.getElementById('copyMsg');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
  });
});

document.getElementById('whatsappBtn').addEventListener('click', () => {
  if (!lastCreated) return;
  const url = `https://rzp.io/l/${lastCreated.id}`;
  const text = `Hi ${lastCreated.name}, here's your payment link for ₹${lastCreated.amount}: ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
});

document.getElementById('emailBtn').addEventListener('click', () => {
  if (!lastCreated) return;
  const url = `https://rzp.io/l/${lastCreated.id}`;
  const subject = `Payment Link — ₹${lastCreated.amount}`;
  const body = `Hi ${lastCreated.name},\n\nPlease complete your payment of ₹${lastCreated.amount} for "${lastCreated.desc}".\n\nPayment Link: ${url}\n\nThank you!`;
  window.open(`mailto:${lastCreated.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
});

document.getElementById('smsBtn').addEventListener('click', () => {
  if (!lastCreated) return;
  const url = `https://rzp.io/l/${lastCreated.id}`;
  window.open(`sms:?body=${encodeURIComponent(`Pay ₹${lastCreated.amount}: ${url}`)}`);
});

// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    activeTab = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
    document.getElementById('listPanel').style.display = activeTab === 'list' ? 'flex' : 'none';
    const preview = document.getElementById('previewPanel');
    preview.classList.toggle('visible', activeTab === 'preview');
    if (activeTab === 'preview') renderPreview();
  });
});

// ============================================================
// LINKS LIST
// ============================================================
function renderLinks() {
  // Auto-expire check
  links.forEach(l => {
    if (l.status === 'active') {
      const expiresAt = l.created + l.expiryHrs * 3600000;
      if (Date.now() > expiresAt) l.status = 'expired';
    }
  });

  document.getElementById('listPanel').innerHTML = links.map(l => {
    const remaining = l.created + l.expiryHrs * 3600000 - Date.now();
    const countdownStr = l.status === 'active' && remaining > 0
      ? formatCountdown(remaining)
      : '';

    return `
      <div class="link-card">
        <div class="link-status ${l.status}"></div>
        <div class="link-info">
          <div class="link-customer">${l.name}${l.partial ? '<span class="partial-tag">Partial</span>' : ''}</div>
          <div class="link-desc">${l.desc}</div>
          ${countdownStr ? `<div class="link-countdown">⏰ Expires in ${countdownStr}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div class="link-amount">₹${l.amount.toLocaleString()}</div>
          <span class="link-badge badge-${l.status}">${l.status.charAt(0).toUpperCase() + l.status.slice(1)}</span>
        </div>
      </div>
    `;
  }).join('') || '<p style="color:#94a3b8;font-size:13px;">No payment links yet.</p>';
}

function formatCountdown(ms) {
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ============================================================
// PREVIEW
// ============================================================
function renderPreview() {
  const link = lastCreated || links[0];
  if (!link) { document.getElementById('previewPanel').innerHTML = '<p style="color:#94a3b8;text-align:center;">Create a link first</p>'; return; }

  document.getElementById('previewPanel').innerHTML = `
    <div class="preview-frame">
      <div class="preview-header">
        <div class="preview-logo">💳</div>
        <div class="preview-amount">₹${link.amount.toLocaleString()}</div>
        <div class="preview-desc">${link.desc}</div>
      </div>
      <div class="preview-body">
        <div class="preview-field"><label>Pay to</label><div class="value">Merchant Co.</div></div>
        <div class="preview-field"><label>For</label><div class="value">${link.desc}</div></div>
        ${link.partial ? '<div class="preview-field"><label>Minimum Amount</label><div class="value">₹' + Math.round(link.amount * 0.1) + ' (10%)</div></div>' : ''}
        <div class="preview-field"><label>Payment Methods</label><div class="value">💳 Card · 📱 UPI · 🏦 Netbanking</div></div>
        <button class="preview-pay-btn">Pay ₹${link.amount.toLocaleString()}</button>
      </div>
      <div class="preview-footer">Powered by Razorpay · Secure Payment</div>
    </div>
  `;
}

// ============================================================
// AUTO COUNTDOWN UPDATE
// ============================================================
setInterval(renderLinks, 60000);

// INIT
renderLinks();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Payment link form with validation: amount>0, email includes @, required fields
- Generated link with **clipboard API** for copy, `window.open` for WhatsApp/Email/SMS sharing
- Link list with auto-expiry: `created + expiryHrs * 3600000` compared to `Date.now()`
- Countdown display: days/hours/minutes breakdown from remaining milliseconds
- Customer preview panel: mock payment page showing what the recipient sees
- Partial payments: toggle stores boolean, shown on link card with purple tag

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium | Forms, Validation, DOM |
| Technical 2 | Hard | Payment Links, Share API, Preview |
| System Design | Hard | Payment Infrastructure |
| Hiring Manager | Medium | Fintech, Merchant Experience |
