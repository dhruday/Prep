# Razorpay — Senior FE Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Payment Link Generator and Tracker
**Duration:** 90 minutes

### Challenge: Build a payment link management dashboard: create payment links with amount/description/expiry, copy link, list all links with status (active/expired/paid), and a real-time payment status tracker.

```javascript
/**
 * Razorpay Payment Link Manager:
 * 
 * Features:
 * - Create payment links (amount, description, customer, expiry)
 * - Copy link to clipboard
 * - Status tracking: active → paid/expired
 * - List with search, filter by status, sort by date/amount
 * - Payment details breakdown (amount, fee, tax, net)
 * - Auto-expire detection
 * - Simulated real-time status updates
 */
class PaymentLinkManager {
  constructor(container) {
    this.container = container;
    this.links = [];
    this.nextId = 1;
    this.filter = 'all'; // 'all' | 'active' | 'paid' | 'expired'
    this.searchQuery = '';
    
    this.render();
    
    // Check for expired links every 10 seconds
    this.expiryTimer = setInterval(() => this.checkExpired(), 10000);
  }
  
  createLink({ amount, description, customerName, customerEmail, expiryMinutes }) {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (amount > 500000) throw new Error('Amount exceeds ₹5,00,000 limit');
    
    const id = `pay_${Date.now()}_${this.nextId++}`;
    const fee = Math.round(amount * 0.02); // 2% Razorpay fee
    const gst = Math.round(fee * 0.18);   // 18% GST on fee
    
    const link = {
      id,
      shortId: id.slice(-8),
      amount,
      description: description || 'Payment',
      customerName: customerName || '',
      customerEmail: customerEmail || '',
      fee,
      gst,
      netAmount: amount - fee - gst,
      status: 'active', // 'active' | 'paid' | 'expired' | 'cancelled'
      createdAt: new Date(),
      expiresAt: expiryMinutes ? new Date(Date.now() + expiryMinutes * 60000) : null,
      paidAt: null,
      url: `https://rzp.io/l/${id.slice(-8)}` // Simulated short URL
    };
    
    this.links.unshift(link); // Newest first
    this.renderLinks();
    return link;
  }
  
  cancelLink(id) {
    const link = this.links.find(l => l.id === id);
    if (link && link.status === 'active') {
      link.status = 'cancelled';
      this.renderLinks();
    }
  }
  
  // Simulate payment received
  simulatePayment(id) {
    const link = this.links.find(l => l.id === id);
    if (link && link.status === 'active') {
      link.status = 'paid';
      link.paidAt = new Date();
      this.renderLinks();
    }
  }
  
  checkExpired() {
    const now = new Date();
    let changed = false;
    
    for (const link of this.links) {
      if (link.status === 'active' && link.expiresAt && now > link.expiresAt) {
        link.status = 'expired';
        changed = true;
      }
    }
    
    if (changed) this.renderLinks();
  }
  
  getFiltered() {
    let result = [...this.links];
    
    if (this.filter !== 'all') {
      result = result.filter(l => l.status === this.filter);
    }
    
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(l => 
        l.description.toLowerCase().includes(q) ||
        l.customerName.toLowerCase().includes(q) ||
        l.id.includes(q)
      );
    }
    
    return result;
  }
  
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    }
  }
  
  formatAmount(amount) {
    return '₹' + amount.toLocaleString('en-IN');
  }
  
  formatDate(date) {
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  }
  
  getStatusBadge(status) {
    const styles = {
      active: 'background:#dcfce7;color:#166534',
      paid: 'background:#dbeafe;color:#1e40af',
      expired: 'background:#fef3c7;color:#92400e',
      cancelled: 'background:#fee2e2;color:#991b1b'
    };
    return `<span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;${styles[status]}">${status.toUpperCase()}</span>`;
  }
  
  render() {
    this.container.innerHTML = `
      <style>
        .plm { font-family:-apple-system,sans-serif; max-width:900px; margin:0 auto; padding:20px; }
        .plm-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .plm-header h2 { margin:0; font-size:22px; }
        .plm-create-btn { padding:10px 20px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
        .plm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        .plm-stat { padding:16px; border-radius:8px; background:#f9fafb; border:1px solid #e5e7eb; }
        .plm-stat-value { font-size:24px; font-weight:700; }
        .plm-stat-label { font-size:12px; color:#666; margin-top:4px; }
        .plm-toolbar { display:flex; gap:12px; margin-bottom:16px; align-items:center; }
        .plm-search { flex:1; padding:8px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:14px; }
        .plm-filter-btn { padding:6px 14px; border:1px solid #d1d5db; border-radius:20px; cursor:pointer; font-size:13px; background:#fff; }
        .plm-filter-btn.active { background:#2563eb; color:#fff; border-color:#2563eb; }
        .plm-table { width:100%; border-collapse:collapse; }
        .plm-table th { text-align:left; padding:10px 12px; border-bottom:2px solid #e5e7eb; font-size:12px; color:#666; text-transform:uppercase; }
        .plm-table td { padding:10px 12px; border-bottom:1px solid #f3f4f6; font-size:13px; }
        .plm-table tr:hover { background:#f9fafb; }
        .plm-action-btn { padding:4px 10px; border:1px solid #d1d5db; border-radius:4px; cursor:pointer; font-size:12px; background:#fff; margin-right:4px; }
        .plm-action-btn:hover { background:#f3f4f6; }
      </style>
      <div class="plm">
        <div class="plm-header">
          <h2>Payment Links</h2>
          <button class="plm-create-btn" id="create-link-btn">+ Create Payment Link</button>
        </div>
        <div class="plm-stats" id="stats"></div>
        <div class="plm-toolbar">
          <input class="plm-search" type="text" placeholder="Search by description, customer, or ID..." id="search-input">
          <button class="plm-filter-btn active" data-filter="all">All</button>
          <button class="plm-filter-btn" data-filter="active">Active</button>
          <button class="plm-filter-btn" data-filter="paid">Paid</button>
          <button class="plm-filter-btn" data-filter="expired">Expired</button>
        </div>
        <table class="plm-table">
          <thead>
            <tr><th>ID</th><th>Description</th><th>Amount</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody id="links-body"></tbody>
        </table>
      </div>
    `;
    
    // Create link
    this.container.querySelector('#create-link-btn')?.addEventListener('click', () => this.showCreateForm());
    
    // Search
    this.container.querySelector('#search-input')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderLinks();
    });
    
    // Filters
    this.container.querySelectorAll('.plm-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.filter;
        this.container.querySelectorAll('.plm-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderLinks();
      });
    });
    
    this.renderStats();
    this.renderLinks();
  }
  
  renderStats() {
    const stats = this.container.querySelector('#stats');
    if (!stats) return;
    
    const total = this.links.length;
    const active = this.links.filter(l => l.status === 'active').length;
    const paid = this.links.filter(l => l.status === 'paid').length;
    const totalCollected = this.links.filter(l => l.status === 'paid').reduce((s, l) => s + l.amount, 0);
    
    stats.innerHTML = `
      <div class="plm-stat"><div class="plm-stat-value">${total}</div><div class="plm-stat-label">Total Links</div></div>
      <div class="plm-stat"><div class="plm-stat-value">${active}</div><div class="plm-stat-label">Active</div></div>
      <div class="plm-stat"><div class="plm-stat-value">${paid}</div><div class="plm-stat-label">Paid</div></div>
      <div class="plm-stat"><div class="plm-stat-value">${this.formatAmount(totalCollected)}</div><div class="plm-stat-label">Collected</div></div>
    `;
  }
  
  renderLinks() {
    const tbody = this.container.querySelector('#links-body');
    if (!tbody) return;
    
    const filtered = this.getFiltered();
    
    tbody.innerHTML = filtered.length === 0 
      ? `<tr><td colspan="6" style="text-align:center;padding:40px;color:#888">No payment links found</td></tr>`
      : filtered.map(l => `
        <tr>
          <td style="font-family:monospace;font-size:12px">${l.shortId}</td>
          <td>
            <div style="font-weight:500">${this.esc(l.description)}</div>
            ${l.customerName ? `<div style="font-size:12px;color:#888">${this.esc(l.customerName)}</div>` : ''}
          </td>
          <td style="font-weight:600">${this.formatAmount(l.amount)}</td>
          <td>${this.getStatusBadge(l.status)}</td>
          <td style="font-size:12px;color:#666">${this.formatDate(l.createdAt)}</td>
          <td>
            <button class="plm-action-btn" data-copy="${l.url}" title="Copy link">📋</button>
            ${l.status === 'active' ? `<button class="plm-action-btn" data-pay="${l.id}" title="Simulate payment">💰</button>` : ''}
            ${l.status === 'active' ? `<button class="plm-action-btn" data-cancel="${l.id}" title="Cancel">✕</button>` : ''}
          </td>
        </tr>
      `).join('');
    
    // Action handlers
    tbody.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.copyToClipboard(btn.dataset.copy);
        btn.textContent = '✅';
        setTimeout(() => btn.textContent = '📋', 1500);
      });
    });
    
    tbody.querySelectorAll('[data-pay]').forEach(btn => {
      btn.addEventListener('click', () => this.simulatePayment(btn.dataset.pay));
    });
    
    tbody.querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', () => this.cancelLink(btn.dataset.cancel));
    });
    
    this.renderStats();
  }
  
  showCreateForm() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center';
    
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:24px;width:440px">
        <h3 style="margin:0 0 16px">Create Payment Link</h3>
        <label style="display:block;margin-bottom:12px">
          <span style="font-size:13px;font-weight:500">Amount (₹) *</span>
          <input type="number" id="pl-amount" min="1" max="500000" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;box-sizing:border-box">
        </label>
        <label style="display:block;margin-bottom:12px">
          <span style="font-size:13px;font-weight:500">Description *</span>
          <input type="text" id="pl-desc" maxlength="200" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;box-sizing:border-box">
        </label>
        <label style="display:block;margin-bottom:12px">
          <span style="font-size:13px;font-weight:500">Customer Name</span>
          <input type="text" id="pl-name" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;box-sizing:border-box">
        </label>
        <label style="display:block;margin-bottom:12px">
          <span style="font-size:13px;font-weight:500">Expiry (minutes, 0 = never)</span>
          <input type="number" id="pl-expiry" value="60" min="0" style="display:block;width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;box-sizing:border-box">
        </label>
        <div style="display:flex;gap:12px;margin-top:20px">
          <button id="pl-cancel" style="flex:1;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer">Cancel</button>
          <button id="pl-create" style="flex:1;padding:10px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-weight:600">Create Link</button>
        </div>
      </div>
    `;
    
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#pl-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#pl-create').addEventListener('click', () => {
      const amount = parseInt(overlay.querySelector('#pl-amount').value, 10);
      const desc = overlay.querySelector('#pl-desc').value.trim();
      
      if (!amount || amount <= 0) { alert('Enter a valid amount'); return; }
      if (!desc) { alert('Enter a description'); return; }
      
      this.createLink({
        amount,
        description: desc,
        customerName: overlay.querySelector('#pl-name').value.trim(),
        expiryMinutes: parseInt(overlay.querySelector('#pl-expiry').value, 10) || 0
      });
      overlay.remove();
    });
    
    document.body.appendChild(overlay);
    overlay.querySelector('#pl-amount').focus();
  }
  
  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  
  destroy() {
    clearInterval(this.expiryTimer);
  }
}
```

---

## 🎯 Key Takeaways
- Razorpay SDE-3 FE = **Payment link dashboard — CRUD, status tracking, clipboard, search/filter**
- **Fee calculation**: 2% Razorpay fee + 18% GST on fee — standard Indian payment gateway pricing
- **Clipboard fallback**: `navigator.clipboard.writeText()` with `execCommand('copy')` fallback — older browsers
- **Auto-expiry**: `setInterval(10s)` checks expiry — marks active links as expired
- **Status badge styling**: colored rounded pills — green=active, blue=paid, yellow=expired, red=cancelled
- **Amount limits**: max ₹5,00,000 per payment link — RBI regulation for payment links
- **Short URL**: `rzp.io/l/{shortId}` — Razorpay's actual short link pattern
- Razorpay FE = **fintech dashboards, payment forms, embeddable widgets** — expect CRUD + real-time status

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Hard | Dashboard, CRUD, Status Tracking |
| System Design | Very Hard | Payment Gateway |
| HM | Medium | Culture |
