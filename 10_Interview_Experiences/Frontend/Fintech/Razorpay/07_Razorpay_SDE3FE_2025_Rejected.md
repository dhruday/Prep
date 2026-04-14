# Razorpay — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Settlement Reconciliation Viewer

### Problem
Build a settlement reconciliation dashboard:
1. Two-panel comparison: Bank statement (left) vs Razorpay records (right)
2. Auto-match: link records with same amount + date range (±1 day tolerance)
3. Color-coded: Matched (green), Unmatched (red), Partial Match (amber)
4. Summary stats: total matched amount, unmatched count, discrepancy amount
5. Manual match: drag an unmatched item from one side to the other to force-match
6. Filter by status: All, Matched, Unmatched
7. Export discrepancy report

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Settlement Reconciliation</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f1f5f9; padding: 16px; }

h1 { font-size: 18px; color: #0f172a; margin-bottom: 4px; }
.subtitle { font-size: 12px; color: #64748b; margin-bottom: 14px; }

/* Stats Row */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
.stat-card { background: #fff; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0; }
.stat-label { font-size: 11px; color: #64748b; }
.stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
.stat-green { color: #16a34a; }
.stat-red { color: #dc2626; }
.stat-amber { color: #d97706; }

/* Filter & Export */
.toolbar { display: flex; justify-content: space-between; margin-bottom: 10px; }
.filters { display: flex; gap: 6px; }
.filter-btn { padding: 6px 14px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; font-size: 11px; cursor: pointer; color: #475569; }
.filter-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
.export-btn { padding: 6px 14px; background: #dc2626; color: #fff; border: none; border-radius: 6px; font-size: 11px; cursor: pointer; }

/* Two Panel */
.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.panel { background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
.panel-header { padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; }
.panel-count { font-size: 11px; color: #94a3b8; font-weight: 400; }

.record { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 8px; font-size: 12px; transition: 0.2s; cursor: grab; }
.record:active { cursor: grabbing; }
.record.matched { background: #f0fdf4; border-left: 3px solid #16a34a; }
.record.unmatched { background: #fef2f2; border-left: 3px solid #dc2626; }
.record.partial { background: #fffbeb; border-left: 3px solid #d97706; }
.record.drop-target { background: #dbeafe; border: 2px dashed #2563eb; }

.record-id { font-family: monospace; color: #64748b; font-size: 10px; width: 80px; }
.record-info { flex: 1; }
.record-name { font-weight: 500; color: #0f172a; }
.record-date { font-size: 10px; color: #94a3b8; }
.record-amount { font-weight: 700; color: #0f172a; }
.match-icon { font-size: 14px; }

.empty-msg { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>

<h1>🔍 Settlement Reconciliation</h1>
<p class="subtitle">Comparing Bank Statements vs Razorpay Records — Period: Apr 1-7, 2025</p>

<div class="stats-row" id="statsRow"></div>

<div class="toolbar">
  <div class="filters" id="filters"></div>
  <button class="export-btn" id="exportBtn">📥 Export Discrepancies</button>
</div>

<div class="panels">
  <div class="panel" id="bankPanel">
    <div class="panel-header">🏦 Bank Statement <span class="panel-count" id="bankCount"></span></div>
    <div id="bankList"></div>
  </div>
  <div class="panel" id="rzpPanel">
    <div class="panel-header">💳 Razorpay Records <span class="panel-count" id="rzpCount"></span></div>
    <div id="rzpList"></div>
  </div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
function randId(prefix) { return prefix + '_' + Math.random().toString(36).substr(2, 6); }

const bankRecords = [
  { id: 'BNK_001', name: 'Settlement #4521', amount: 15000, date: new Date('2025-04-01'), ref: 'NEFT001' },
  { id: 'BNK_002', name: 'Settlement #4522', amount: 28500, date: new Date('2025-04-02'), ref: 'NEFT002' },
  { id: 'BNK_003', name: 'Settlement #4523', amount: 9800, date: new Date('2025-04-03'), ref: 'NEFT003' },
  { id: 'BNK_004', name: 'Settlement #4524', amount: 42000, date: new Date('2025-04-04'), ref: 'NEFT004' },
  { id: 'BNK_005', name: 'Settlement #4525', amount: 31200, date: new Date('2025-04-05'), ref: 'NEFT005' },
  { id: 'BNK_006', name: 'Settlement #4526', amount: 7600, date: new Date('2025-04-05'), ref: 'NEFT006' },
  { id: 'BNK_007', name: 'Settlement #4527', amount: 18900, date: new Date('2025-04-06'), ref: 'NEFT007' },
  { id: 'BNK_008', name: 'Unknown Credit', amount: 5500, date: new Date('2025-04-07'), ref: 'NEFT008' }
];

const rzpRecords = [
  { id: 'RZP_001', name: 'Pay_batch_apr01', amount: 15000, date: new Date('2025-04-01'), ref: 'setl_001' },
  { id: 'RZP_002', name: 'Pay_batch_apr02', amount: 28500, date: new Date('2025-04-02'), ref: 'setl_002' },
  { id: 'RZP_003', name: 'Pay_batch_apr03', amount: 9800, date: new Date('2025-04-03'), ref: 'setl_003' },
  { id: 'RZP_004', name: 'Pay_batch_apr04', amount: 42000, date: new Date('2025-04-04'), ref: 'setl_004' },
  { id: 'RZP_005', name: 'Pay_batch_apr05', amount: 31000, date: new Date('2025-04-05'), ref: 'setl_005' },  // ₹200 discrepancy
  { id: 'RZP_006', name: 'Pay_batch_apr05b', amount: 7600, date: new Date('2025-04-06'), ref: 'setl_006' },   // 1 day off
  { id: 'RZP_007', name: 'Pay_batch_apr06', amount: 18900, date: new Date('2025-04-06'), ref: 'setl_007' },
  { id: 'RZP_009', name: 'Pay_batch_apr08', amount: 11200, date: new Date('2025-04-07'), ref: 'setl_009' }    // no bank match
];

let matches = {};   // bankId -> { rzpId, type: 'exact'|'partial'|'manual' }
let filter = 'all';

// ============================================================
// AUTO MATCHING
// ============================================================
function autoMatch() {
  matches = {};
  const usedRzp = new Set();

  // Pass 1: Exact match (same amount, date within 1 day)
  bankRecords.forEach(b => {
    const match = rzpRecords.find(r =>
      !usedRzp.has(r.id) &&
      r.amount === b.amount &&
      Math.abs(r.date - b.date) <= 86400000
    );
    if (match) {
      matches[b.id] = { rzpId: match.id, type: 'exact' };
      usedRzp.add(match.id);
    }
  });

  // Pass 2: Partial match (date within 1 day, amount within 5%)
  bankRecords.forEach(b => {
    if (matches[b.id]) return;
    const match = rzpRecords.find(r =>
      !usedRzp.has(r.id) &&
      Math.abs(r.date - b.date) <= 86400000 &&
      Math.abs(r.amount - b.amount) / b.amount <= 0.05
    );
    if (match) {
      matches[b.id] = { rzpId: match.id, type: 'partial' };
      usedRzp.add(match.id);
    }
  });
}

function getMatchStatus(recordId, side) {
  if (side === 'bank') {
    if (matches[recordId]) return matches[recordId].type === 'exact' || matches[recordId].type === 'manual' ? 'matched' : 'partial';
    return 'unmatched';
  }
  // RZP side
  const entry = Object.entries(matches).find(([, v]) => v.rzpId === recordId);
  if (entry) return entry[1].type === 'exact' || entry[1].type === 'manual' ? 'matched' : 'partial';
  return 'unmatched';
}

// ============================================================
// RENDER
// ============================================================
function renderStats() {
  const matchedBank = bankRecords.filter(b => matches[b.id]);
  const unmatchedBank = bankRecords.filter(b => !matches[b.id]);
  const unmatchedRzp = rzpRecords.filter(r => !Object.values(matches).find(m => m.rzpId === r.id));
  const matchedAmt = matchedBank.reduce((s, b) => s + b.amount, 0);
  const discrepancy = matchedBank.reduce((s, b) => {
    const m = matches[b.id];
    const rzp = rzpRecords.find(r => r.id === m.rzpId);
    return s + Math.abs(b.amount - (rzp?.amount || 0));
  }, 0);

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-label">Matched</div><div class="stat-value stat-green">${matchedBank.length}</div></div>
    <div class="stat-card"><div class="stat-label">Unmatched</div><div class="stat-value stat-red">${unmatchedBank.length + unmatchedRzp.length}</div></div>
    <div class="stat-card"><div class="stat-label">Matched Amount</div><div class="stat-value">₹${matchedAmt.toLocaleString()}</div></div>
    <div class="stat-card"><div class="stat-label">Discrepancy</div><div class="stat-value stat-amber">₹${discrepancy.toLocaleString()}</div></div>
  `;
}

function renderFilters() {
  const opts = ['all', 'matched', 'unmatched'];
  document.getElementById('filters').innerHTML = opts.map(f =>
    `<button class="filter-btn${filter === f ? ' active' : ''}" data-f="${f}">${f.charAt(0).toUpperCase() + f.slice(1)}</button>`
  ).join('');

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.addEventListener('click', () => { filter = b.dataset.f; render(); });
  });
}

function filterRecords(records, side) {
  if (filter === 'all') return records;
  return records.filter(r => {
    const status = getMatchStatus(r.id, side);
    if (filter === 'matched') return status === 'matched' || status === 'partial';
    return status === 'unmatched';
  });
}

function renderList(records, containerId, countId, side) {
  const filtered = filterRecords(records, side);
  document.getElementById(countId).textContent = `${filtered.length} records`;

  const container = document.getElementById(containerId);
  if (!filtered.length) {
    container.innerHTML = '<div class="empty-msg">No records match filter</div>';
    return;
  }

  container.innerHTML = filtered.map(r => {
    const status = getMatchStatus(r.id, side);
    return `
      <div class="record ${status}" draggable="true" data-id="${r.id}" data-side="${side}" data-amount="${r.amount}">
        <span class="match-icon">${status === 'matched' ? '✅' : status === 'partial' ? '⚠️' : '❌'}</span>
        <span class="record-id">${r.id}</span>
        <div class="record-info">
          <div class="record-name">${r.name}</div>
          <div class="record-date">${r.date.toLocaleDateString('en-IN')} · Ref: ${r.ref}</div>
        </div>
        <div class="record-amount">₹${r.amount.toLocaleString()}</div>
      </div>
    `;
  }).join('');

  // Drag & Drop
  container.querySelectorAll('.record').forEach(el => {
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ id: el.dataset.id, side: el.dataset.side }));
    });
  });

  container.addEventListener('dragover', e => e.preventDefault());
  container.addEventListener('drop', e => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const dropTarget = e.target.closest('.record');
    if (!dropTarget || data.side === dropTarget.dataset.side) return;

    // Manual match
    const bankId = data.side === 'bank' ? data.id : dropTarget.dataset.id;
    const rzpId = data.side === 'rzp' ? data.id : dropTarget.dataset.id;
    matches[bankId] = { rzpId, type: 'manual' };
    render();
  });
}

function render() {
  renderStats();
  renderFilters();
  renderList(bankRecords, 'bankList', 'bankCount', 'bank');
  renderList(rzpRecords, 'rzpList', 'rzpCount', 'rzp');
}

// ============================================================
// EXPORT
// ============================================================
document.getElementById('exportBtn').addEventListener('click', () => {
  const unmatchedBank = bankRecords.filter(b => !matches[b.id]);
  const unmatchedRzp = rzpRecords.filter(r => !Object.values(matches).find(m => m.rzpId === r.id));
  const partials = bankRecords.filter(b => matches[b.id]?.type === 'partial').map(b => {
    const rzp = rzpRecords.find(r => r.id === matches[b.id].rzpId);
    return { bank: b, rzp, discrepancy: b.amount - (rzp?.amount || 0) };
  });

  const report = { generatedAt: new Date().toISOString(), unmatchedBank, unmatchedRzp, partialMatches: partials };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'discrepancy_report.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

// ============================================================
// INIT
// ============================================================
autoMatch();
render();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewer wanted **async reconciliation with progress bar** for large datasets
- **Auto-matching algorithm**: Two-pass (exact → partial). Exact: same amount + date within ±1 day. Partial: date ±1 day, amount within 5%
- Manual match via **drag-and-drop**: `dragstart` sets source data, `drop` on opposite panel creates manual match
- Color-coded status: green=matched, amber=partial (amount discrepancy), red=unmatched
- Discrepancy calculation: sum of `|bankAmount - rzpAmount|` across matched pairs
- Export: JSON blob download with unmatched + partial match details

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium | DOM, CSS Grid |
| Technical 2 | Hard | Reconciliation Logic, Drag-Drop, Matching |
| Hiring Manager | Medium | Fintech, Settlements |
