# Paytm — SDE-3 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
| **Role** | SDE-3 Frontend |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Payments |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a UPI Payment Flow with QR Scanner Simulation
**Duration:** 75 minutes

### Challenge: Build a complete UPI payment flow: enter UPI ID or scan QR, enter amount + note, select bank account, PIN entry (masked), payment processing with status (success/failure/pending), transaction receipt.

```javascript
/**
 * Paytm UPI Payment Flow:
 * 
 * States: HOME → ENTER_DETAILS → CONFIRM → PIN_ENTRY → PROCESSING → RESULT
 * - UPI ID validation (name@bank format)
 * - Amount validation (₹1 to ₹1,00,000)
 * - 6-digit PIN entry (masked with •)
 * - Simulated processing with 3 outcomes: success(70%), failed(20%), pending(10%)
 * - Transaction receipt with details
 */
class UPIPaymentFlow {
  constructor(container) {
    this.container = container;
    this.state = 'HOME';
    
    this.upiId = '';
    this.amount = '';
    this.note = '';
    this.selectedBank = 0;
    this.pin = '';
    this.result = null; // { status, txnId, timestamp }
    
    this.banks = [
      { name: 'HDFC Bank', balance: '₹42,580', upiHandle: '@hdfcbank', icon: '🏦' },
      { name: 'SBI', balance: '₹1,28,340', upiHandle: '@sbi', icon: '🏛️' },
      { name: 'ICICI Bank', balance: '₹67,200', upiHandle: '@icici', icon: '🏦' },
    ];
    
    this.recentPayees = [
      { name: 'Rajesh Kumar', upiId: 'rajesh.k@hdfcbank' },
      { name: 'Swiggy', upiId: 'swiggy@ybl' },
      { name: 'Amazon Pay', upiId: 'amazonpay@apl' },
      { name: 'Flipkart', upiId: 'flipkart@axisbank' },
    ];
    
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <style>
        .upi-app { max-width:400px; margin:0 auto; font-family:-apple-system,sans-serif; background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.1); overflow:hidden; min-height:500px; display:flex; flex-direction:column; }
        .upi-header { background:#00baf2; color:#fff; padding:16px 20px; display:flex; align-items:center; gap:12px; }
        .upi-back { cursor:pointer; font-size:20px; }
        .upi-title { font-size:16px; font-weight:600; }
        .upi-body { flex:1; padding:20px; }
        .upi-input { width:100%; padding:12px 16px; border:1px solid #e5e7eb; border-radius:10px; font-size:15px; outline:none; box-sizing:border-box; margin-bottom:12px; }
        .upi-input:focus { border-color:#00baf2; }
        .upi-input.error { border-color:#ef4444; }
        .upi-error { color:#ef4444; font-size:12px; margin:-8px 0 8px; }
        .upi-label { font-size:12px; color:#888; margin-bottom:6px; display:block; }
        .upi-amount-input { font-size:32px; font-weight:700; text-align:center; border:none; border-bottom:2px solid #e5e7eb; border-radius:0; padding:8px; letter-spacing:2px; }
        .upi-amount-input:focus { border-bottom-color:#00baf2; }
        .upi-btn { width:100%; padding:14px; border:none; border-radius:12px; font-size:16px; font-weight:600; cursor:pointer; }
        .upi-btn-primary { background:#00baf2; color:#fff; }
        .upi-btn-primary:hover { background:#0096c7; }
        .upi-btn-primary:disabled { background:#d1d5db; cursor:not-allowed; }
        .upi-recent { margin-top:20px; }
        .upi-recent-title { font-size:13px; color:#888; margin-bottom:8px; }
        .upi-payee { display:flex; align-items:center; gap:12px; padding:10px; border-radius:8px; cursor:pointer; }
        .upi-payee:hover { background:#f3f4f6; }
        .upi-payee-avatar { width:40px; height:40px; border-radius:50%; background:#e0f2fe; display:flex; align-items:center; justify-content:center; font-weight:600; color:#00baf2; }
        .upi-payee-name { font-weight:500; font-size:14px; }
        .upi-payee-id { font-size:12px; color:#888; }
        .upi-bank-list { margin:12px 0; }
        .upi-bank { display:flex; align-items:center; gap:12px; padding:12px; border:2px solid #e5e7eb; border-radius:10px; margin-bottom:8px; cursor:pointer; }
        .upi-bank.selected { border-color:#00baf2; background:#f0f9ff; }
        .upi-bank-icon { font-size:24px; }
        .upi-bank-name { font-weight:500; font-size:14px; }
        .upi-bank-balance { font-size:12px; color:#888; }
        .upi-pin-dots { display:flex; gap:12px; justify-content:center; margin:24px 0; }
        .upi-pin-dot { width:14px; height:14px; border-radius:50%; border:2px solid #d1d5db; }
        .upi-pin-dot.filled { background:#00baf2; border-color:#00baf2; }
        .upi-keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; max-width:280px; margin:0 auto; }
        .upi-key { padding:14px; text-align:center; font-size:20px; font-weight:500; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; background:#fff; }
        .upi-key:hover { background:#f3f4f6; }
        .upi-key:active { background:#e5e7eb; }
        .upi-processing { text-align:center; padding:40px 20px; }
        .upi-spinner { width:48px; height:48px; border:3px solid #e5e7eb; border-top-color:#00baf2; border-radius:50%; animation:upi-spin 0.8s linear infinite; margin:0 auto 16px; }
        @keyframes upi-spin { to { transform:rotate(360deg); } }
        .upi-result { text-align:center; padding:32px 20px; }
        .upi-result-icon { font-size:56px; margin-bottom:12px; }
        .upi-result-amount { font-size:28px; font-weight:700; margin:8px 0; }
        .upi-receipt { background:#f9fafb; border-radius:10px; padding:16px; margin:16px 0; text-align:left; }
        .upi-receipt-row { display:flex; justify-content:space-between; padding:4px 0; font-size:13px; }
        .upi-receipt-label { color:#888; }
        .upi-confirm-card { background:#f8fafc; border-radius:12px; padding:16px; margin-bottom:16px; }
        .upi-confirm-row { display:flex; justify-content:space-between; padding:4px 0; font-size:14px; }
      </style>
      <div class="upi-app">
        <div class="upi-header">
          ${this.state !== 'HOME' ? `<span class="upi-back" id="back-btn">←</span>` : ''}
          <span class="upi-title">${this.getTitle()}</span>
        </div>
        <div class="upi-body">
          ${this.renderState()}
        </div>
      </div>
    `;
    this.attachListeners();
  }
  
  getTitle() {
    const titles = {
      HOME: 'Send Money', ENTER_DETAILS: 'Payment Details',
      CONFIRM: 'Confirm Payment', PIN_ENTRY: 'Enter UPI PIN',
      PROCESSING: 'Processing...', RESULT: 'Payment ' + (this.result?.status || '')
    };
    return titles[this.state] || '';
  }
  
  renderState() {
    switch (this.state) {
      case 'HOME': return this.renderHome();
      case 'ENTER_DETAILS': return this.renderDetails();
      case 'CONFIRM': return this.renderConfirm();
      case 'PIN_ENTRY': return this.renderPinEntry();
      case 'PROCESSING': return this.renderProcessing();
      case 'RESULT': return this.renderResult();
    }
  }
  
  renderHome() {
    return `
      <label class="upi-label">Enter UPI ID</label>
      <input class="upi-input" id="upi-id-input" placeholder="name@bank" value="${this.esc(this.upiId)}">
      
      <div class="upi-recent">
        <div class="upi-recent-title">Recent</div>
        ${this.recentPayees.map(p => `
          <div class="upi-payee" data-upi="${this.esc(p.upiId)}">
            <div class="upi-payee-avatar">${p.name.charAt(0)}</div>
            <div>
              <div class="upi-payee-name">${this.esc(p.name)}</div>
              <div class="upi-payee-id">${this.esc(p.upiId)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="margin-top:16px">
        <button class="upi-btn upi-btn-primary" id="proceed-btn" ${!this.upiId ? 'disabled' : ''}>Proceed</button>
      </div>
    `;
  }
  
  renderDetails() {
    return `
      <div style="text-align:center;margin-bottom:20px">
        <div class="upi-payee-avatar" style="width:56px;height:56px;font-size:20px;margin:0 auto 8px">${this.upiId.charAt(0).toUpperCase()}</div>
        <div style="font-weight:600">${this.esc(this.upiId)}</div>
      </div>
      
      <label class="upi-label">Amount (₹)</label>
      <div style="text-align:center">
        <span style="font-size:28px;font-weight:700;color:#888">₹</span>
        <input class="upi-input upi-amount-input" id="amount-input" type="text" 
          inputmode="decimal" placeholder="0" value="${this.esc(this.amount)}" style="display:inline-block;width:200px">
      </div>
      <div id="amount-error" class="upi-error" style="text-align:center;display:none"></div>
      
      <label class="upi-label" style="margin-top:12px">Note (optional)</label>
      <input class="upi-input" id="note-input" placeholder="Add a note" value="${this.esc(this.note)}">
      
      <label class="upi-label" style="margin-top:12px">Pay from</label>
      <div class="upi-bank-list">
        ${this.banks.map((b, i) => `
          <div class="upi-bank ${i === this.selectedBank ? 'selected' : ''}" data-bank="${i}">
            <div class="upi-bank-icon">${b.icon}</div>
            <div>
              <div class="upi-bank-name">${this.esc(b.name)}</div>
              <div class="upi-bank-balance">Balance: ${b.balance}</div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <button class="upi-btn upi-btn-primary" id="confirm-btn" ${!this.amount ? 'disabled' : ''}>Continue</button>
    `;
  }
  
  renderConfirm() {
    const bank = this.banks[this.selectedBank];
    return `
      <div class="upi-confirm-card">
        <div style="text-align:center;margin-bottom:12px">
          <div style="font-size:32px;font-weight:700">₹${this.formatAmount(this.amount)}</div>
        </div>
        <div class="upi-confirm-row"><span style="color:#888">To</span><span>${this.esc(this.upiId)}</span></div>
        <div class="upi-confirm-row"><span style="color:#888">From</span><span>${this.esc(bank.name)} (${bank.upiHandle})</span></div>
        ${this.note ? `<div class="upi-confirm-row"><span style="color:#888">Note</span><span>${this.esc(this.note)}</span></div>` : ''}
      </div>
      <button class="upi-btn upi-btn-primary" id="pay-btn">Pay ₹${this.formatAmount(this.amount)}</button>
    `;
  }
  
  renderPinEntry() {
    return `
      <div style="text-align:center;margin-bottom:8px">
        <div style="font-size:13px;color:#888">Paying ₹${this.formatAmount(this.amount)} to ${this.esc(this.upiId)}</div>
        <div style="font-size:12px;color:#aaa;margin-top:4px">${this.esc(this.banks[this.selectedBank].name)}</div>
      </div>
      
      <div class="upi-pin-dots">
        ${[0,1,2,3,4,5].map(i => `
          <div class="upi-pin-dot ${i < this.pin.length ? 'filled' : ''}"></div>
        `).join('')}
      </div>
      
      <div class="upi-keypad">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(key => 
          key === '' ? '<div></div>' :
          `<div class="upi-key" data-key="${key}">${key}</div>`
        ).join('')}
      </div>
    `;
  }
  
  renderProcessing() {
    return `
      <div class="upi-processing">
        <div class="upi-spinner"></div>
        <div style="font-size:16px;font-weight:600">Processing Payment...</div>
        <div style="font-size:13px;color:#888;margin-top:4px">Please wait, do not press back</div>
      </div>
    `;
  }
  
  renderResult() {
    const r = this.result;
    const icons = { Success: '✅', Failed: '❌', Pending: '⏳' };
    const colors = { Success: '#22c55e', Failed: '#ef4444', Pending: '#f59e0b' };
    
    return `
      <div class="upi-result">
        <div class="upi-result-icon">${icons[r.status] || '❓'}</div>
        <div style="font-size:18px;font-weight:600;color:${colors[r.status]}">${r.status}</div>
        <div class="upi-result-amount">₹${this.formatAmount(this.amount)}</div>
        <div style="font-size:13px;color:#888">to ${this.esc(this.upiId)}</div>
        
        <div class="upi-receipt">
          <div class="upi-receipt-row"><span class="upi-receipt-label">Transaction ID</span><span>${r.txnId}</span></div>
          <div class="upi-receipt-row"><span class="upi-receipt-label">Date & Time</span><span>${r.timestamp}</span></div>
          <div class="upi-receipt-row"><span class="upi-receipt-label">From</span><span>${this.esc(this.banks[this.selectedBank].name)}</span></div>
          <div class="upi-receipt-row"><span class="upi-receipt-label">To</span><span>${this.esc(this.upiId)}</span></div>
          ${this.note ? `<div class="upi-receipt-row"><span class="upi-receipt-label">Note</span><span>${this.esc(this.note)}</span></div>` : ''}
        </div>
        
        <button class="upi-btn upi-btn-primary" id="done-btn" style="margin-top:8px">Done</button>
      </div>
    `;
  }
  
  attachListeners() {
    // Back button
    this.container.querySelector('#back-btn')?.addEventListener('click', () => this.goBack());
    
    // Home screen
    this.container.querySelector('#upi-id-input')?.addEventListener('input', (e) => {
      this.upiId = e.target.value;
      const btn = this.container.querySelector('#proceed-btn');
      if (btn) btn.disabled = !this.upiId;
    });
    
    this.container.querySelectorAll('.upi-payee').forEach(el => {
      el.addEventListener('click', () => {
        this.upiId = el.dataset.upi;
        this.state = 'ENTER_DETAILS';
        this.render();
      });
    });
    
    this.container.querySelector('#proceed-btn')?.addEventListener('click', () => {
      if (this.validateUpiId(this.upiId)) {
        this.state = 'ENTER_DETAILS';
        this.render();
      }
    });
    
    // Details screen
    this.container.querySelector('#amount-input')?.addEventListener('input', (e) => {
      // Allow only digits and one decimal point
      const cleaned = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
      e.target.value = cleaned;
      this.amount = cleaned;
      
      const btn = this.container.querySelector('#confirm-btn');
      const errEl = this.container.querySelector('#amount-error');
      const numAmt = parseFloat(this.amount);
      
      if (this.amount && (isNaN(numAmt) || numAmt < 1 || numAmt > 100000)) {
        if (errEl) { errEl.textContent = 'Amount must be ₹1 to ₹1,00,000'; errEl.style.display = 'block'; }
        if (btn) btn.disabled = true;
      } else {
        if (errEl) errEl.style.display = 'none';
        if (btn) btn.disabled = !this.amount;
      }
    });
    
    this.container.querySelector('#note-input')?.addEventListener('input', (e) => { this.note = e.target.value; });
    
    this.container.querySelectorAll('.upi-bank').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedBank = parseInt(el.dataset.bank);
        this.render();
      });
    });
    
    this.container.querySelector('#confirm-btn')?.addEventListener('click', () => {
      this.state = 'CONFIRM';
      this.render();
    });
    
    // Confirm screen
    this.container.querySelector('#pay-btn')?.addEventListener('click', () => {
      this.state = 'PIN_ENTRY';
      this.pin = '';
      this.render();
    });
    
    // PIN keypad
    this.container.querySelectorAll('.upi-key').forEach(key => {
      key.addEventListener('click', () => {
        const val = key.dataset.key;
        if (val === '⌫') {
          this.pin = this.pin.slice(0, -1);
        } else if (this.pin.length < 6) {
          this.pin += val;
        }
        
        // Re-render pin dots
        this.container.querySelectorAll('.upi-pin-dot').forEach((dot, i) => {
          dot.classList.toggle('filled', i < this.pin.length);
        });
        
        // Auto-submit on 6 digits
        if (this.pin.length === 6) {
          setTimeout(() => this.processPayment(), 300);
        }
      });
    });
    
    // Done button
    this.container.querySelector('#done-btn')?.addEventListener('click', () => {
      this.state = 'HOME';
      this.upiId = ''; this.amount = ''; this.note = ''; this.pin = ''; this.result = null;
      this.render();
    });
  }
  
  goBack() {
    const backMap = {
      ENTER_DETAILS: 'HOME', CONFIRM: 'ENTER_DETAILS',
      PIN_ENTRY: 'CONFIRM', RESULT: 'HOME'
    };
    this.state = backMap[this.state] || 'HOME';
    this.render();
  }
  
  validateUpiId(id) {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(id);
  }
  
  processPayment() {
    this.state = 'PROCESSING';
    this.render();
    
    // Simulate outcome
    setTimeout(() => {
      const rand = Math.random();
      const status = rand < 0.7 ? 'Success' : rand < 0.9 ? 'Failed' : 'Pending';
      
      this.result = {
        status,
        txnId: 'UPI' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(),
        timestamp: new Date().toLocaleString('en-IN', { 
          day:'numeric', month:'short', year:'numeric', 
          hour:'2-digit', minute:'2-digit', second:'2-digit'
        })
      };
      
      this.state = 'RESULT';
      this.render();
    }, 1500 + Math.random() * 1500);
  }
  
  formatAmount(amt) {
    const num = parseFloat(amt);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-IN', { minimumFractionDigits: num % 1 !== 0 ? 2 : 0 });
  }
  
  esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
```

---

## 🎯 Key Takeaways
- Paytm SDE-3 FE = **UPI payment flow with pin entry, state machine, transaction receipt**
- **6-state flow**: HOME → ENTER_DETAILS → CONFIRM → PIN_ENTRY → PROCESSING → RESULT
- **UPI ID validation**: regex `^[a-zA-Z0-9._-]+@[a-zA-Z]+$` — standard UPI format
- **Amount validation**: ₹1 to ₹1,00,000 limit — input sanitization for digits + decimal only
- **PIN entry**: 6-dot display + number keypad — auto-submit on 6th digit with 300ms delay
- **PIN masking**: dots (•) not digits — never show PIN in plain text (security)
- **Three outcomes**: Success (70%), Failed (20%), Pending (10%) — realistic distribution
- **Transaction ID**: UPI + Base36 timestamp — unique, human-readable
- **Indian locale**: `toLocaleString('en-IN')` for amounts — ₹1,00,000 format
- **Back navigation**: explicit back map per state — no browser history dependency

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Hard | State Machine, Form Validation, UPI Flow |
| System Design | Very Hard | Payment Architecture |
| HM | Medium | Culture |
