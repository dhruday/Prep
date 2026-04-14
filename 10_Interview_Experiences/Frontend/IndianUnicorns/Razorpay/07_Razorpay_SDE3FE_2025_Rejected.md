# Razorpay — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks (rejected after Technical 2)
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Invoice Generator

### Problem
Build an **invoice generator** (45 min):
1. Editable company name, logo placeholder, and address fields
2. Line items table: description, quantity, unit price, calculated total
3. Add/remove line items dynamically
4. Tax rate input (percentage) — auto-calculated subtotal, tax, grand total
5. Discount field (flat or percentage toggle)
6. Currency selector (₹, $, €, £) — updates all amounts
7. "Generate PDF" simulation: renders a print-friendly view
8. Pure HTML/CSS/JS — no frameworks

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice Generator</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI', sans-serif; background:#f0f2f5; color:#333; }

  .app { max-width:800px; margin:20px auto; }
  .toolbar { display:flex; justify-content:space-between; align-items:center;
             padding:16px 0; }
  .toolbar h1 { font-size:1.3rem; color:#2d3ea0; }
  .toolbar-actions { display:flex; gap:8px; }

  /* Invoice */
  .invoice { background:#fff; border-radius:12px; padding:40px;
    box-shadow:0 2px 16px rgba(0,0,0,0.06); }
  .invoice-header { display:flex; justify-content:space-between; margin-bottom:32px; }
  .company-section { flex:1; }
  .invoice-meta { text-align:right; }
  .editable { border:1px dashed transparent; padding:4px 8px; border-radius:4px;
    outline:none; transition:border-color 0.2s; min-width:60px; }
  .editable:hover { border-color:#ccc; }
  .editable:focus { border-color:#2d3ea0; background:#f8f9ff; }
  .company-name { font-size:1.5rem; font-weight:700; color:#2d3ea0; }
  .company-addr { font-size:0.85rem; color:#666; margin-top:4px; }
  .logo-placeholder { width:80px; height:80px; border:2px dashed #ddd; border-radius:8px;
    display:flex; align-items:center; justify-content:center; color:#aaa;
    font-size:0.7rem; margin-bottom:8px; cursor:pointer; }

  .inv-label { font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:0.5px; }
  .inv-number { font-size:1.1rem; font-weight:600; margin-top:2px; }

  /* Client */
  .client-section { margin-bottom:24px; padding:16px; background:#f8f9fb; border-radius:8px; }
  .client-section h4 { font-size:0.8rem; color:#888; margin-bottom:8px; text-transform:uppercase; }

  /* Table */
  .items-table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  .items-table th { background:#f4f5f7; padding:10px 12px; text-align:left;
    font-size:0.75rem; color:#666; text-transform:uppercase; letter-spacing:0.5px; }
  .items-table td { padding:8px 12px; border-bottom:1px solid #f0f0f0; }
  .items-table input { border:1px solid transparent; padding:6px 8px; border-radius:4px;
    width:100%; outline:none; font-size:0.9rem; }
  .items-table input:focus { border-color:#2d3ea0; }
  .items-table .num-input { width:80px; text-align:right; }
  .line-total { font-weight:600; text-align:right; }
  .remove-row { color:#ff3b30; cursor:pointer; border:none; background:none;
    font-size:1.1rem; }
  .add-row { border:none; background:none; color:#2d3ea0; cursor:pointer;
    font-weight:600; font-size:0.85rem; padding:8px 0; }

  /* Totals */
  .totals { display:flex; justify-content:flex-end; }
  .totals-table { width:300px; }
  .totals-table tr td { padding:6px 12px; font-size:0.9rem; }
  .totals-table tr td:last-child { text-align:right; font-weight:600; }
  .totals-table .grand-total td { font-size:1.1rem; font-weight:700; color:#2d3ea0;
    border-top:2px solid #2d3ea0; padding-top:10px; }

  /* Controls */
  .controls { display:flex; gap:16px; align-items:center; margin-bottom:16px;
    padding:12px; background:#f8f9fb; border-radius:8px; flex-wrap:wrap; }
  .control-group { display:flex; align-items:center; gap:6px; font-size:0.85rem; }
  .control-group label { color:#666; }
  .control-group select, .control-group input { padding:6px 10px; border:1px solid #ddd;
    border-radius:6px; font-size:0.85rem; outline:none; }
  .control-group select:focus, .control-group input:focus { border-color:#2d3ea0; }
  .disc-toggle { padding:4px 10px; border:1px solid #ddd; border-radius:6px;
    cursor:pointer; font-size:0.8rem; background:#fff; }
  .disc-toggle.active { background:#2d3ea0; color:#fff; border-color:#2d3ea0; }

  .btn { padding:10px 20px; border:none; border-radius:8px; cursor:pointer;
         font-weight:600; font-size:0.85rem; }
  .btn-primary { background:#2d3ea0; color:#fff; }
  .btn-outline { background:#fff; border:2px solid #2d3ea0; color:#2d3ea0; }

  /* Print styles */
  @media print {
    body { background:#fff; }
    .toolbar, .controls, .add-row, .remove-row, .toolbar-actions { display:none !important; }
    .invoice { box-shadow:none; padding:20px; }
    .editable { border:none !important; padding:0; }
    .items-table input { border:none; padding:0; }
  }
</style>
</head>
<body>

<div class="app">
  <div class="toolbar">
    <h1>📄 Invoice Generator</h1>
    <div class="toolbar-actions">
      <button class="btn btn-outline" onclick="resetInvoice()">Reset</button>
      <button class="btn btn-primary" onclick="printInvoice()">🖨 Generate PDF</button>
    </div>
  </div>

  <div class="controls">
    <div class="control-group">
      <label>Currency:</label>
      <select id="currencySelect" onchange="updateCurrency()">
        <option value="₹" selected>₹ INR</option>
        <option value="$">$ USD</option>
        <option value="€">€ EUR</option>
        <option value="£">£ GBP</option>
      </select>
    </div>
    <div class="control-group">
      <label>Tax Rate:</label>
      <input type="number" id="taxRate" value="18" min="0" max="100"
             style="width:60px" oninput="recalculate()">
      <span>%</span>
    </div>
    <div class="control-group">
      <label>Discount:</label>
      <input type="number" id="discountVal" value="0" min="0"
             style="width:70px" oninput="recalculate()">
      <button class="disc-toggle active" id="discPct" onclick="setDiscountType('pct')">%</button>
      <button class="disc-toggle" id="discFlat" onclick="setDiscountType('flat')">Flat</button>
    </div>
  </div>

  <div class="invoice" id="invoice">
    <div class="invoice-header">
      <div class="company-section">
        <div class="logo-placeholder">LOGO</div>
        <div contenteditable class="editable company-name">Your Company</div>
        <div contenteditable class="editable company-addr">123 Business Street, City, 560001</div>
      </div>
      <div class="invoice-meta">
        <div class="inv-label">Invoice</div>
        <div class="inv-number">#INV-2025-001</div>
        <div style="margin-top:12px">
          <div class="inv-label">Date</div>
          <div contenteditable class="editable" id="invDate">2025-04-25</div>
        </div>
        <div style="margin-top:8px">
          <div class="inv-label">Due Date</div>
          <div contenteditable class="editable" id="invDue">2025-05-25</div>
        </div>
      </div>
    </div>

    <div class="client-section">
      <h4>Bill To</h4>
      <div contenteditable class="editable" style="font-weight:600">Client Name</div>
      <div contenteditable class="editable" style="color:#666;font-size:0.85rem">Client Address, City, PIN</div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:40%">Description</th>
          <th style="width:15%">Qty</th>
          <th style="width:20%">Unit Price</th>
          <th style="width:20%">Total</th>
          <th style="width:5%"></th>
        </tr>
      </thead>
      <tbody id="itemsBody"></tbody>
    </table>
    <button class="add-row" onclick="addItem()">+ Add Line Item</button>

    <div class="totals">
      <table class="totals-table">
        <tr><td>Subtotal</td><td id="subtotalEl">₹0</td></tr>
        <tr><td id="discLabel">Discount (0%)</td><td id="discountEl">-₹0</td></tr>
        <tr><td id="taxLabel">Tax (18%)</td><td id="taxEl">₹0</td></tr>
        <tr class="grand-total"><td>Total</td><td id="grandTotalEl">₹0</td></tr>
      </table>
    </div>
  </div>
</div>

<script>
// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let items = [
  { desc: 'Web Development Service', qty: 1, price: 50000 },
  { desc: 'UI/UX Design', qty: 2, price: 15000 },
  { desc: 'Server Hosting (Monthly)', qty: 12, price: 2000 },
];
let currency = '₹';
let discountType = 'pct'; // 'pct' or 'flat'

// ═══════════════════════════════════════
// RENDER
// ═══════════════════════════════════════
function renderItems() {
  const tbody = document.getElementById('itemsBody');
  tbody.innerHTML = '';

  items.forEach((item, idx) => {
    const total = item.qty * item.price;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${item.desc}" onchange="updateItem(${idx},'desc',this.value)"></td>
      <td><input type="number" class="num-input" value="${item.qty}" min="1"
                 onchange="updateItem(${idx},'qty',+this.value)"></td>
      <td><input type="number" class="num-input" value="${item.price}" min="0"
                 onchange="updateItem(${idx},'price',+this.value)"></td>
      <td class="line-total">${currency}${total.toLocaleString()}</td>
      <td><button class="remove-row" onclick="removeItem(${idx})">×</button></td>
    `;
    tbody.appendChild(tr);
  });
  recalculate();
}

function addItem() {
  items.push({ desc: 'New Item', qty: 1, price: 0 });
  renderItems();
}

function removeItem(idx) {
  if (items.length <= 1) return;
  items.splice(idx, 1);
  renderItems();
}

function updateItem(idx, field, value) {
  items[idx][field] = value;
  renderItems();
}

// ═══════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════
function recalculate() {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
  const discVal = parseFloat(document.getElementById('discountVal').value) || 0;

  let discount = discountType === 'pct'
    ? subtotal * (discVal / 100)
    : discVal;
  discount = Math.min(discount, subtotal);

  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (taxRate / 100);
  const grandTotal = afterDiscount + tax;

  const discLabel = discountType === 'pct' ? `Discount (${discVal}%)` : 'Discount (Flat)';
  document.getElementById('subtotalEl').textContent = currency + subtotal.toLocaleString();
  document.getElementById('discLabel').textContent = discLabel;
  document.getElementById('discountEl').textContent = '-' + currency + discount.toLocaleString();
  document.getElementById('taxLabel').textContent = `Tax (${taxRate}%)`;
  document.getElementById('taxEl').textContent = currency + Math.round(tax).toLocaleString();
  document.getElementById('grandTotalEl').textContent = currency + Math.round(grandTotal).toLocaleString();
}

// ═══════════════════════════════════════
// CONTROLS
// ═══════════════════════════════════════
function updateCurrency() {
  currency = document.getElementById('currencySelect').value;
  renderItems();
}

function setDiscountType(type) {
  discountType = type;
  document.getElementById('discPct').classList.toggle('active', type === 'pct');
  document.getElementById('discFlat').classList.toggle('active', type === 'flat');
  recalculate();
}

function printInvoice() {
  window.print();
}

function resetInvoice() {
  items = [{ desc: 'New Item', qty: 1, price: 0 }];
  document.getElementById('taxRate').value = 18;
  document.getElementById('discountVal').value = 0;
  renderItems();
}

// INIT
renderItems();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — didn't implement **persistent storage** (localStorage for draft saving) as discussed
- **contenteditable**: inline editing for company/client fields without form inputs
- **Line items CRUD**: add/remove/update with index-based callbacks and full re-render
- **Discount toggle**: percentage vs flat amount — using `classList.toggle` for button active state
- **Currency selector**: updates global `currency` variable, triggers full re-render
- **Print CSS**: `@media print` hides toolbar/controls, removes shadows and borders for clean output
- **Tax on discounted amount**: tax calculated after discount deduction (standard accounting)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Hard | Invoice Builder, Print CSS, CRUD Table |
| Technical 2 | Medium | Form Handling, Calculations |
| Hiring Manager | Medium | Payments Domain, Product UX |
