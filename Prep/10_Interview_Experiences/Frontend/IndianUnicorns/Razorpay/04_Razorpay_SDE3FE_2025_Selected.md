# Razorpay — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Payment Checkout Widget

### Problem
Build an embeddable payment checkout widget:
1. Payment amount display with currency formatting
2. Payment method tabs: Card, UPI, Netbanking, Wallet
3. Card form with real-time validation (Luhn, expiry, CVV)
4. UPI ID validation and VPA format check
5. Processing spinner with timeout handling
6. Success/failure animation
7. Responsive: works as overlay modal and inline embed

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Razorpay Checkout</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f0f4ff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }

.checkout-widget { width: 420px; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: hidden; }

/* Header */
.checkout-header { background: #2b84ea; padding: 16px 20px; color: #fff; display: flex; justify-content: space-between; align-items: center; }
.merchant-name { font-size: 14px; opacity: 0.8; }
.pay-amount { font-size: 24px; font-weight: 700; }

/* Tabs */
.method-tabs { display: flex; border-bottom: 1px solid #e5e7eb; }
.tab { flex: 1; padding: 12px; text-align: center; font-size: 13px; cursor: pointer; border-bottom: 2px solid transparent; color: #6b7280; transition: all 0.15s; }
.tab:hover { color: #2b84ea; }
.tab.active { color: #2b84ea; border-bottom-color: #2b84ea; font-weight: 600; }
.tab-icon { font-size: 18px; display: block; margin-bottom: 2px; }

/* Form Content */
.form-content { padding: 20px; min-height: 240px; }
.field-group { margin-bottom: 14px; }
.field-group label { display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px; }
.field-group input, .field-group select { width: 100%; padding: 10px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.15s; }
.field-group input:focus { border-color: #2b84ea; box-shadow: 0 0 0 3px rgba(43,132,234,0.1); }
.field-group.error input { border-color: #ef4444; }
.error-text { font-size: 11px; color: #ef4444; margin-top: 3px; display: none; }
.field-group.error .error-text { display: block; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.card-brand { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 20px; }
.field-relative { position: relative; }

/* Card Number Formatting */
.card-display { letter-spacing: 2px; }

/* Bank List */
.bank-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.bank-item { display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 13px; }
.bank-item:hover { border-color: #2b84ea; background: #f0f7ff; }
.bank-item.selected { border-color: #2b84ea; background: #e8f0fe; }

/* Wallet List */
.wallet-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.wallet-item { text-align: center; padding: 12px 8px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 12px; }
.wallet-item:hover { border-color: #2b84ea; }
.wallet-item.selected { border-color: #2b84ea; background: #e8f0fe; }
.wallet-icon { font-size: 24px; margin-bottom: 4px; }

/* Pay Button */
.pay-btn { display: block; width: calc(100% - 40px); margin: 0 20px 20px; padding: 14px; background: #2b84ea; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; }
.pay-btn:hover { background: #1a6fd4; }
.pay-btn:disabled { background: #93c5fd; cursor: not-allowed; }

/* Processing */
.processing { text-align: center; padding: 48px 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
.proc-spinner { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #2b84ea; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
.proc-text { font-size: 15px; color: #374151; }
.proc-sub { font-size: 12px; color: #9ca3af; margin-top: 4px; }
.timeout-text { color: #ef4444; font-size: 12px; margin-top: 8px; display: none; }

/* Result */
.result { text-align: center; padding: 40px 20px; }
.result-icon { font-size: 48px; margin-bottom: 12px; }
@keyframes popIn { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
.result-icon { animation: popIn 0.4s ease; }
.result-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.result-title.success { color: #16a34a; }
.result-title.failure { color: #ef4444; }
.result-sub { font-size: 13px; color: #6b7280; }
.result-txn { font-size: 11px; color: #9ca3af; margin-top: 12px; background: #f8f9fa; padding: 8px; border-radius: 6px; }
.retry-btn { margin-top: 16px; padding: 10px 32px; background: #2b84ea; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }

/* Secured */
.secured { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; font-size: 11px; color: #9ca3af; border-top: 1px solid #f0f0f0; }
</style>
</head>
<body>
<div class="checkout-widget" id="widget"></div>

<script>
// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  merchantName: 'TechStore India',
  amount: 249900, // ₹2499.00
  currency: 'INR',
  orderId: 'order_OmK5aBhT3x7z'
};

const BANKS = [
  { code: 'HDFC', name: 'HDFC Bank', icon: '🏦' },
  { code: 'SBI', name: 'SBI', icon: '🏛️' },
  { code: 'ICICI', name: 'ICICI Bank', icon: '🏦' },
  { code: 'AXIS', name: 'Axis Bank', icon: '🏦' },
  { code: 'KOTAK', name: 'Kotak', icon: '🏦' },
  { code: 'PNB', name: 'PNB', icon: '🏛️' }
];

const WALLETS = [
  { code: 'paytm', name: 'Paytm', icon: '💰' },
  { code: 'phonepe', name: 'PhonePe', icon: '📱' },
  { code: 'amazonpay', name: 'Amazon', icon: '📦' },
  { code: 'mobikwik', name: 'MobiKwik', icon: '💳' },
  { code: 'freecharge', name: 'FreeCharge', icon: '⚡' },
  { code: 'airtel', name: 'Airtel', icon: '📡' }
];

// ============================================================
// STATE
// ============================================================
let activeTab = 'card';
let screen = 'form'; // form | processing | result
let paymentResult = null;
let formData = { cardNumber: '', expiry: '', cvv: '', name: '', upi: '', bank: '', wallet: '' };

// ============================================================
// CARD VALIDATION
// ============================================================
function luhnCheck(num) {
  const digits = num.replace(/\D/g, '').split('').reverse().map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function getCardBrand(num) {
  const n = num.replace(/\D/g, '');
  if (/^4/.test(n)) return '💳 Visa';
  if (/^5[1-5]/.test(n)) return '💳 MC';
  if (/^3[47]/.test(n)) return '💳 Amex';
  if (/^6(?:011|5)/.test(n)) return '💳 Discover';
  if (/^35/.test(n)) return '💳 JCB';
  return '';
}

function formatCardNumber(val) {
  const digits = val.replace(/\D/g, '').substring(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').substring(0, 4);
  if (digits.length >= 3) return digits.substring(0, 2) + '/' + digits.substring(2);
  return digits;
}

function validateExpiry(val) {
  const match = val.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1]);
  const year = parseInt('20' + match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return new Date(year, month) > now;
}

function validateUPI(val) {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(val);
}

// ============================================================
// RENDER
// ============================================================
function render() {
  const widget = document.getElementById('widget');

  if (screen === 'processing') { renderProcessing(widget); return; }
  if (screen === 'result') { renderResult(widget); return; }

  const formattedAmount = (CONFIG.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: CONFIG.currency });

  widget.innerHTML = `
    <div class="checkout-header">
      <div><div class="merchant-name">${CONFIG.merchantName}</div></div>
      <div class="pay-amount">${formattedAmount}</div>
    </div>
    <div class="method-tabs">
      ${['card', 'upi', 'netbanking', 'wallet'].map(t => `
        <div class="tab ${activeTab === t ? 'active' : ''}" data-tab="${t}">
          <span class="tab-icon">${{ card: '💳', upi: '📲', netbanking: '🏦', wallet: '👛' }[t]}</span>
          ${t.charAt(0).toUpperCase() + t.slice(1)}
        </div>
      `).join('')}
    </div>
    <div class="form-content" id="formContent"></div>
    <button class="pay-btn" id="payBtn">Pay ${formattedAmount}</button>
    <div class="secured">🔒 Secured by Razorpay</div>
  `;

  // Tab listeners
  widget.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => { activeTab = tab.dataset.tab; render(); });
  });

  renderForm();

  widget.querySelector('#payBtn').addEventListener('click', handlePay);
}

function renderForm() {
  const content = document.getElementById('formContent');
  switch (activeTab) {
    case 'card':
      content.innerHTML = `
        <div class="field-group">
          <label>Card Number</label>
          <div class="field-relative">
            <input type="text" id="cardNum" class="card-display" placeholder="1234 5678 9012 3456" value="${formData.cardNumber}" maxlength="19">
            <span class="card-brand" id="cardBrand">${getCardBrand(formData.cardNumber)}</span>
          </div>
          <div class="error-text" id="cardNumErr">Invalid card number</div>
        </div>
        <div class="field-row">
          <div class="field-group">
            <label>Expiry</label>
            <input type="text" id="cardExp" placeholder="MM/YY" value="${formData.expiry}" maxlength="5">
            <div class="error-text" id="cardExpErr">Invalid expiry</div>
          </div>
          <div class="field-group">
            <label>CVV</label>
            <input type="password" id="cardCvv" placeholder="•••" value="${formData.cvv}" maxlength="4">
            <div class="error-text" id="cardCvvErr">Invalid CVV</div>
          </div>
        </div>
        <div class="field-group">
          <label>Cardholder Name</label>
          <input type="text" id="cardName" placeholder="Name on card" value="${formData.name}">
        </div>
      `;
      setupCardListeners();
      break;

    case 'upi':
      content.innerHTML = `
        <div class="field-group">
          <label>UPI ID / VPA</label>
          <input type="text" id="upiId" placeholder="yourname@upi" value="${formData.upi}">
          <div class="error-text" id="upiErr">Enter valid UPI ID (e.g. name@upi)</div>
        </div>
        <div style="font-size:12px;color:#9ca3af;margin-top:8px;">Supported: @ybl @okhdfcbank @okicici @paytm @apl</div>
      `;
      document.getElementById('upiId').addEventListener('input', e => formData.upi = e.target.value);
      break;

    case 'netbanking':
      content.innerHTML = `
        <div style="font-size:13px;color:#374151;margin-bottom:10px;">Select your bank</div>
        <div class="bank-list">
          ${BANKS.map(b => `
            <div class="bank-item ${formData.bank === b.code ? 'selected' : ''}" data-bank="${b.code}">
              <span>${b.icon}</span> ${b.name}
            </div>
          `).join('')}
        </div>
      `;
      content.querySelectorAll('.bank-item').forEach(item => {
        item.addEventListener('click', () => { formData.bank = item.dataset.bank; renderForm(); });
      });
      break;

    case 'wallet':
      content.innerHTML = `
        <div style="font-size:13px;color:#374151;margin-bottom:10px;">Select wallet</div>
        <div class="wallet-list">
          ${WALLETS.map(w => `
            <div class="wallet-item ${formData.wallet === w.code ? 'selected' : ''}" data-wallet="${w.code}">
              <div class="wallet-icon">${w.icon}</div>
              ${w.name}
            </div>
          `).join('')}
        </div>
      `;
      content.querySelectorAll('.wallet-item').forEach(item => {
        item.addEventListener('click', () => { formData.wallet = item.dataset.wallet; renderForm(); });
      });
      break;
  }
}

function setupCardListeners() {
  const numInput = document.getElementById('cardNum');
  const expInput = document.getElementById('cardExp');
  const cvvInput = document.getElementById('cardCvv');
  const nameInput = document.getElementById('cardName');

  numInput.addEventListener('input', () => {
    formData.cardNumber = numInput.value;
    numInput.value = formatCardNumber(numInput.value);
    document.getElementById('cardBrand').textContent = getCardBrand(numInput.value);
  });

  expInput.addEventListener('input', () => { formData.expiry = formatExpiry(expInput.value); expInput.value = formData.expiry; });
  cvvInput.addEventListener('input', () => formData.cvv = cvvInput.value);
  nameInput.addEventListener('input', () => formData.name = nameInput.value);

  // Blur validation
  numInput.addEventListener('blur', () => {
    const clean = numInput.value.replace(/\D/g, '');
    const valid = clean.length >= 13 && luhnCheck(clean);
    numInput.closest('.field-group').classList.toggle('error', clean.length > 0 && !valid);
  });
  expInput.addEventListener('blur', () => {
    expInput.closest('.field-group').classList.toggle('error', formData.expiry.length > 0 && !validateExpiry(formData.expiry));
  });
}

function handlePay() {
  // Validate based on active tab
  let valid = true;
  if (activeTab === 'card') {
    const num = formData.cardNumber.replace(/\D/g, '');
    if (num.length < 13 || !luhnCheck(num)) valid = false;
    if (!validateExpiry(formData.expiry)) valid = false;
    if (formData.cvv.length < 3) valid = false;
  } else if (activeTab === 'upi') {
    if (!validateUPI(formData.upi)) {
      document.getElementById('upiId')?.closest('.field-group')?.classList.add('error');
      valid = false;
    }
  } else if (activeTab === 'netbanking') {
    if (!formData.bank) { alert('Select a bank'); valid = false; }
  } else if (activeTab === 'wallet') {
    if (!formData.wallet) { alert('Select a wallet'); valid = false; }
  }

  if (!valid) return;

  screen = 'processing';
  render();

  // Simulate payment
  const timeout = setTimeout(() => {
    const el = document.querySelector('.timeout-text');
    if (el) el.style.display = 'block';
  }, 5000);

  setTimeout(() => {
    clearTimeout(timeout);
    paymentResult = Math.random() > 0.15; // 85% success
    screen = 'result';
    render();
  }, 3000);
}

function renderProcessing(widget) {
  const formattedAmount = (CONFIG.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: CONFIG.currency });
  widget.innerHTML = `
    <div class="checkout-header">
      <div class="merchant-name">${CONFIG.merchantName}</div>
      <div class="pay-amount">${formattedAmount}</div>
    </div>
    <div class="processing">
      <div class="proc-spinner"></div>
      <div class="proc-text">Processing payment...</div>
      <div class="proc-sub">Do not close this window</div>
      <div class="timeout-text">Taking longer than expected. Please wait...</div>
    </div>
    <div class="secured">🔒 Secured by Razorpay</div>
  `;
}

function renderResult(widget) {
  const txnId = 'pay_' + Math.random().toString(36).substring(2, 12);
  const formattedAmount = (CONFIG.amount / 100).toLocaleString('en-IN', { style: 'currency', currency: CONFIG.currency });

  widget.innerHTML = `
    <div class="checkout-header">
      <div class="merchant-name">${CONFIG.merchantName}</div>
      <div class="pay-amount">${formattedAmount}</div>
    </div>
    <div class="result">
      <div class="result-icon">${paymentResult ? '✅' : '❌'}</div>
      <div class="result-title ${paymentResult ? 'success' : 'failure'}">${paymentResult ? 'Payment Successful' : 'Payment Failed'}</div>
      <div class="result-sub">${paymentResult ? `${formattedAmount} paid to ${CONFIG.merchantName}` : 'Please try again or use a different method'}</div>
      <div class="result-txn">Transaction ID: ${txnId}<br>Order: ${CONFIG.orderId}</div>
      ${!paymentResult ? '<button class="retry-btn" id="retryBtn">Try Again</button>' : ''}
    </div>
    <div class="secured">🔒 Secured by Razorpay</div>
  `;

  document.getElementById('retryBtn')?.addEventListener('click', () => { screen = 'form'; render(); });
}

render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Razorpay FE interviews focus on **payment checkout UX** — card validation, multi-method tabs
- **Luhn algorithm**: sum digits with doubling rule, valid if sum % 10 === 0 — standard credit card check
- Card brand detection: regex on first digits (4=Visa, 5[1-5]=MC, 3[47]=Amex, 6=Discover)
- Card number auto-formatting: insert space every 4 digits with regex `.replace(/(.{4})/g, '$1 ')`
- Expiry validation: parse MM/YY, check `new Date(year, month) > now` — handles rollover correctly
- UPI VPA validation: `username@provider` format with regex
- Processing timeout UX: show "taking longer" message after 5s — prevents user abandoning
- Pop-in animation on result icon: scale 0 → 1.2 → 1 with ease — satisfying completion feel

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Validation |
| Technical 1 | Medium | DOM, CSS |
| Technical 2 | Hard | Payment Checkout, Card Validation |
| Hiring Manager | Medium | Fintech, Checkout UX |
