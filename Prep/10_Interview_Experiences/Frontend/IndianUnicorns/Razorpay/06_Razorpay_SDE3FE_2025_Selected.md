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
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + HM + Founder)
- **Timeline:** 3 weeks
- **Format:** Virtual + Onsite Final

## Round 2: Frontend Machine Coding — Subscription Plan Builder

### Problem
Build a **subscription plan management UI** (45 min):
1. Display plan cards (Basic/Pro/Enterprise) with feature comparison
2. Monthly/Annual toggle with savings highlight
3. Add custom plan: form with plan name, price, features (add/remove)
4. Feature checklist with drag-to-reorder
5. Plan selection highlights selected card with border animation
6. Export plan config as JSON, copy to clipboard
7. Pure HTML/CSS/JS — no frameworks

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Subscription Plan Builder</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background:#f4f6f9; color:#333; padding:24px; }
  h1 { text-align:center; margin-bottom:8px; color:#2d3ea0; }
  .subtitle { text-align:center; color:#888; margin-bottom:24px; }

  /* Toggle */
  .toggle-wrap { display:flex; justify-content:center; align-items:center; gap:12px; margin-bottom:28px; }
  .toggle-label { font-size:0.9rem; color:#555; }
  .toggle-label.active { color:#2d3ea0; font-weight:600; }
  .toggle { position:relative; width:52px; height:28px; background:#ccc; border-radius:14px;
            cursor:pointer; transition:background 0.3s; }
  .toggle.on { background:#2d3ea0; }
  .toggle-knob { position:absolute; top:3px; left:3px; width:22px; height:22px;
                 background:#fff; border-radius:50%; transition:left 0.3s; }
  .toggle.on .toggle-knob { left:27px; }
  .savings { background:#e6f9ee; color:#0a9e3f; padding:2px 10px; border-radius:12px;
             font-size:0.75rem; font-weight:600; }

  /* Plan cards */
  .plans { display:flex; gap:20px; justify-content:center; flex-wrap:wrap; margin-bottom:28px; }
  .plan-card { background:#fff; border-radius:16px; padding:28px 24px; width:280px;
    box-shadow:0 2px 12px rgba(0,0,0,0.06); border:2px solid transparent;
    cursor:pointer; transition:all 0.3s; position:relative; }
  .plan-card:hover { transform:translateY(-4px); box-shadow:0 8px 24px rgba(0,0,0,0.1); }
  .plan-card.selected { border-color:#2d3ea0;
    box-shadow:0 0 0 3px rgba(45,62,160,0.15), 0 8px 24px rgba(0,0,0,0.1); }
  .plan-card.popular::before { content:'POPULAR'; position:absolute; top:-12px; left:50%;
    transform:translateX(-50%); background:#ff6b35; color:#fff; padding:3px 14px;
    border-radius:10px; font-size:0.7rem; font-weight:700; }
  .plan-name { font-size:1.1rem; font-weight:700; margin-bottom:4px; }
  .plan-price { font-size:2rem; font-weight:800; color:#2d3ea0; }
  .plan-price span { font-size:0.9rem; font-weight:400; color:#888; }
  .plan-features { margin-top:16px; list-style:none; }
  .plan-features li { padding:6px 0; font-size:0.85rem; color:#555;
    display:flex; align-items:center; gap:8px; }
  .plan-features li::before { content:'✓'; color:#0a9e3f; font-weight:700; }
  .plan-features li.no::before { content:'✗'; color:#ccc; }
  .plan-features li.no { color:#bbb; }
  .select-btn { width:100%; margin-top:16px; padding:10px; border:2px solid #2d3ea0;
    background:transparent; color:#2d3ea0; border-radius:8px; font-weight:600;
    cursor:pointer; transition:all 0.2s; }
  .plan-card.selected .select-btn { background:#2d3ea0; color:#fff; }
  .remove-plan { position:absolute; top:8px; right:12px; background:none; border:none;
    color:#ccc; cursor:pointer; font-size:1.2rem; }
  .remove-plan:hover { color:#ff3b30; }

  /* Custom plan form */
  .form-section { background:#fff; border-radius:16px; padding:24px; max-width:600px;
    margin:0 auto 28px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
  .form-section h3 { margin-bottom:16px; color:#2d3ea0; }
  .form-row { display:flex; gap:12px; margin-bottom:12px; }
  .form-row input { flex:1; padding:10px 14px; border:1px solid #ddd; border-radius:8px;
    font-size:0.9rem; outline:none; }
  .form-row input:focus { border-color:#2d3ea0; }
  .features-list { list-style:none; margin:12px 0; }
  .features-list li { display:flex; align-items:center; gap:8px; padding:8px 12px;
    background:#f8f9fb; border-radius:8px; margin-bottom:6px; cursor:grab;
    font-size:0.85rem; }
  .features-list li:active { cursor:grabbing; opacity:0.6; }
  .feat-remove { background:none; border:none; color:#ff3b30; cursor:pointer; font-size:0.9rem; }
  .btn { padding:10px 20px; border:none; border-radius:8px; cursor:pointer;
         font-weight:600; font-size:0.85rem; }
  .btn-primary { background:#2d3ea0; color:#fff; }
  .btn-secondary { background:#e8eaf6; color:#2d3ea0; }
  .btn-group { display:flex; gap:8px; margin-top:12px; }

  /* Export */
  .export { text-align:center; margin-top:20px; }
  .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#333; color:#fff; padding:10px 24px; border-radius:8px;
    font-size:0.85rem; opacity:0; transition:opacity 0.3s; pointer-events:none; }
  .toast.show { opacity:1; }
</style>
</head>
<body>

<h1>💳 Subscription Plans</h1>
<p class="subtitle">Choose or build your perfect plan</p>

<div class="toggle-wrap">
  <span class="toggle-label active" id="lblMonthly">Monthly</span>
  <div class="toggle" id="billingToggle" onclick="toggleBilling()">
    <div class="toggle-knob"></div>
  </div>
  <span class="toggle-label" id="lblAnnual">Annual</span>
  <span class="savings">Save 20%</span>
</div>

<div class="plans" id="plansContainer"></div>

<div class="form-section">
  <h3>+ Create Custom Plan</h3>
  <div class="form-row">
    <input type="text" id="customName" placeholder="Plan name">
    <input type="number" id="customPrice" placeholder="Monthly price (₹)">
  </div>
  <div class="form-row">
    <input type="text" id="featureInput" placeholder="Add a feature..."
           onkeydown="if(event.key==='Enter')addFeature()">
    <button class="btn btn-secondary" onclick="addFeature()">+ Add</button>
  </div>
  <ul class="features-list" id="featuresList"></ul>
  <div class="btn-group">
    <button class="btn btn-primary" onclick="createCustomPlan()">Create Plan</button>
    <button class="btn btn-secondary" onclick="resetForm()">Reset</button>
  </div>
</div>

<div class="export">
  <button class="btn btn-primary" onclick="exportJSON()">📋 Export Config as JSON</button>
</div>

<div class="toast" id="toast"></div>

<script>
// ═══════════════════════════════════════
// DATA
// ═══════════════════════════════════════
let plans = [
  { id: 1, name:'Basic', monthlyPrice:499, popular:false,
    features:['5 payment links','Email support','Basic dashboard','100 transactions/mo'],
    noFeatures:['API access','Custom branding','Priority support'] },
  { id: 2, name:'Pro', monthlyPrice:1499, popular:true,
    features:['Unlimited payment links','Priority support','Advanced dashboard','10,000 transactions/mo','API access','Custom branding'],
    noFeatures:['Dedicated account manager'] },
  { id: 3, name:'Enterprise', monthlyPrice:4999, popular:false,
    features:['Everything in Pro','Dedicated account manager','Custom integration','Unlimited transactions','SLA guarantee','On-call support','White-label solution'],
    noFeatures:[] },
];

let selectedPlanId = 2;
let isAnnual = false;
let customFeatures = [];
let nextId = 4;

// Drag state
let dragIdx = null;

// ═══════════════════════════════════════
// BILLING TOGGLE
// ═══════════════════════════════════════
function toggleBilling() {
  isAnnual = !isAnnual;
  document.getElementById('billingToggle').classList.toggle('on', isAnnual);
  document.getElementById('lblMonthly').classList.toggle('active', !isAnnual);
  document.getElementById('lblAnnual').classList.toggle('active', isAnnual);
  renderPlans();
}

// ═══════════════════════════════════════
// RENDER PLANS
// ═══════════════════════════════════════
function renderPlans() {
  const container = document.getElementById('plansContainer');
  container.innerHTML = '';

  plans.forEach(plan => {
    const price = isAnnual
      ? Math.round(plan.monthlyPrice * 12 * 0.8)
      : plan.monthlyPrice;
    const period = isAnnual ? '/year' : '/month';

    const card = document.createElement('div');
    card.className = 'plan-card' + (plan.popular ? ' popular' : '')
                   + (plan.id === selectedPlanId ? ' selected' : '');
    card.onclick = () => { selectedPlanId = plan.id; renderPlans(); };

    let featHTML = plan.features.map(f => `<li>${f}</li>`).join('');
    featHTML += (plan.noFeatures || []).map(f => `<li class="no">${f}</li>`).join('');

    const isCustom = plan.id >= 4;
    card.innerHTML = `
      ${isCustom ? '<button class="remove-plan" onclick="event.stopPropagation();removePlan(' + plan.id + ')">×</button>' : ''}
      <div class="plan-name">${plan.name}</div>
      <div class="plan-price">₹${price.toLocaleString()} <span>${period}</span></div>
      <ul class="plan-features">${featHTML}</ul>
      <button class="select-btn">${plan.id === selectedPlanId ? '✓ Selected' : 'Select Plan'}</button>
    `;
    container.appendChild(card);
  });
}

function removePlan(id) {
  plans = plans.filter(p => p.id !== id);
  if (selectedPlanId === id) selectedPlanId = plans[0]?.id;
  renderPlans();
  showToast('Plan removed');
}

// ═══════════════════════════════════════
// CUSTOM PLAN FORM
// ═══════════════════════════════════════
function addFeature() {
  const input = document.getElementById('featureInput');
  const val = input.value.trim();
  if (!val) return;
  customFeatures.push(val);
  input.value = '';
  renderFeaturesList();
}

function removeFeature(idx) {
  customFeatures.splice(idx, 1);
  renderFeaturesList();
}

function renderFeaturesList() {
  const ul = document.getElementById('featuresList');
  ul.innerHTML = '';
  customFeatures.forEach((feat, idx) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.innerHTML = `☰ ${feat} <button class="feat-remove" onclick="removeFeature(${idx})">✕</button>`;
    li.ondragstart = () => { dragIdx = idx; };
    li.ondragover = (e) => e.preventDefault();
    li.ondrop = (e) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === idx) return;
      const item = customFeatures.splice(dragIdx, 1)[0];
      customFeatures.splice(idx, 0, item);
      dragIdx = null;
      renderFeaturesList();
    };
    ul.appendChild(li);
  });
}

function createCustomPlan() {
  const name = document.getElementById('customName').value.trim();
  const price = parseInt(document.getElementById('customPrice').value);
  if (!name || !price || customFeatures.length === 0) {
    showToast('Fill all fields and add at least one feature');
    return;
  }
  plans.push({ id: nextId++, name, monthlyPrice: price, popular: false,
    features: [...customFeatures], noFeatures: [] });
  resetForm();
  renderPlans();
  showToast('Custom plan created!');
}

function resetForm() {
  document.getElementById('customName').value = '';
  document.getElementById('customPrice').value = '';
  customFeatures = [];
  renderFeaturesList();
}

// ═══════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════
function exportJSON() {
  const config = {
    billing: isAnnual ? 'annual' : 'monthly',
    selectedPlan: selectedPlanId,
    plans: plans.map(p => ({
      name: p.name,
      price: isAnnual ? Math.round(p.monthlyPrice * 12 * 0.8) : p.monthlyPrice,
      billing: isAnnual ? 'annual' : 'monthly',
      features: p.features,
    }))
  };
  const json = JSON.stringify(config, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast('Config copied to clipboard!');
  }).catch(() => {
    showToast('Copy failed — check clipboard permissions');
  });
}

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// INIT
renderPlans();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Billing toggle**: boolean state flips monthly/annual; annual = monthly × 12 × 0.8
- **Plan selection**: card click updates `selectedPlanId`, re-renders with border highlight
- **Drag-to-reorder**: HTML5 drag events on feature `<li>` — splice + insert on drop
- **Custom plan creation**: push to plans array, auto-render alongside default plans
- **JSON export**: `navigator.clipboard.writeText()` with `.then`/`.catch` for feedback
- **Popular badge**: CSS `::before` pseudo-element positioned absolutely above card

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Hard | Plan Builder, Drag-Drop, Export |
| Technical 2 | Medium | Form Validation, State |
| Hiring Manager | Medium | Product Sense, Payments |
| Founder | Hard | Vision, Culture |
