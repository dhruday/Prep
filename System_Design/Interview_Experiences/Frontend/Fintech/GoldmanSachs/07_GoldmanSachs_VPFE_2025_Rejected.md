# Goldman Sachs — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Senior Frontend Engineer |
| **Level** | VP |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + 2 Technical + System Design + Superday)
- **Timeline:** 4 weeks
- **Format:** Virtual + On-site Superday

## Round 3: Frontend Machine Coding — Portfolio Risk Heatmap

### Problem
Build a portfolio risk analysis dashboard:
1. Asset allocation table (equities, bonds, commodities, cash) with percentages
2. Risk heatmap: color-coded grid where rows=sectors, columns=risk factors (market, credit, liquidity, operational)
3. Tooltip on hover showing exact risk value and description
4. Risk score calculator: weighted sum of allocations × risk factors
5. Conditional formatting: green (<30), yellow (30-70), red (>70)
6. Sort heatmap by any risk factor column
7. Export risk report as JSON

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Portfolio Risk Heatmap</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'SF Mono', Consolas, monospace; background: #0a0f1e; color: #e2e8f0; padding: 20px; }

h1 { font-size: 18px; margin-bottom: 16px; color: #93c5fd; }
.dashboard { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* Allocation Table */
.card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; }
.card h3 { font-size: 13px; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #1e293b; color: #64748b; font-size: 11px; cursor: pointer; user-select: none; }
th:hover { color: #93c5fd; }
th .sort-arrow { font-size: 10px; margin-left: 2px; }
td { padding: 6px 8px; border-bottom: 1px solid #0f172a; }
.pct-bar { display: flex; align-items: center; gap: 6px; }
.pct-track { flex: 1; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden; }
.pct-fill { height: 100%; border-radius: 3px; }

/* Heatmap */
.heatmap-container { grid-column: 1 / -1; }
.heatmap { width: 100%; border-collapse: separate; border-spacing: 2px; }
.heatmap th { background: #111827; padding: 8px; font-size: 11px; }
.heatmap td { padding: 0; }
.heat-cell { width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border-radius: 4px; cursor: pointer; position: relative; transition: transform 0.15s; }
.heat-cell:hover { transform: scale(1.1); z-index: 10; }

/* Tooltip */
.tooltip { display: none; position: fixed; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 10px 14px; font-size: 12px; z-index: 1000; pointer-events: none; max-width: 240px; }
.tooltip.visible { display: block; }
.tooltip-title { font-weight: 700; color: #93c5fd; margin-bottom: 4px; }
.tooltip-value { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.tooltip-desc { font-size: 11px; color: #94a3b8; }

/* Risk Score */
.risk-score { text-align: center; padding: 20px; }
.score-value { font-size: 48px; font-weight: 700; }
.score-label { font-size: 12px; color: #64748b; margin-top: 4px; }

/* Export */
.export-btn { padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; margin-top: 10px; font-family: inherit; }
.export-btn:hover { background: #1d4ed8; }
</style>
</head>
<body>

<h1>📊 Portfolio Risk Heatmap</h1>
<div class="dashboard">
  <div class="card"><h3>Asset Allocation</h3><table id="allocTable"></table></div>
  <div class="card">
    <h3>Overall Risk Score</h3>
    <div class="risk-score"><div class="score-value" id="riskScore">—</div><div class="score-label">Weighted Risk Index</div></div>
    <button class="export-btn" id="exportBtn">📥 Export Risk Report (JSON)</button>
  </div>
  <div class="card heatmap-container">
    <h3>Risk Heatmap — Sectors × Risk Factors</h3>
    <table class="heatmap" id="heatmap"></table>
  </div>
</div>
<div class="tooltip" id="tooltip"></div>

<script>
// ============================================================
// DATA
// ============================================================
const allocations = [
  { asset: 'Equities', pct: 45, color: '#3b82f6' },
  { asset: 'Bonds', pct: 25, color: '#10b981' },
  { asset: 'Commodities', pct: 20, color: '#f59e0b' },
  { asset: 'Cash', pct: 10, color: '#94a3b8' }
];

const riskFactors = ['Market', 'Credit', 'Liquidity', 'Operational'];
const sectors = ['Technology', 'Healthcare', 'Financial', 'Energy', 'Consumer', 'Industrial', 'Real Estate'];

// Generate risk matrix
const riskMatrix = {};
sectors.forEach(s => {
  riskMatrix[s] = {};
  riskFactors.forEach(f => {
    riskMatrix[s][f] = Math.round(Math.random() * 100);
  });
});

const riskDescriptions = {
  Market: 'Exposure to market price volatility and systematic risk',
  Credit: 'Counterparty default probability and credit spread risk',
  Liquidity: 'Ability to liquidate positions without significant loss',
  Operational: 'Risk from internal processes, systems, or external events'
};

let sortCol = null;
let sortDir = 1;

// ============================================================
// ALLOCATION TABLE
// ============================================================
function renderAllocations() {
  document.getElementById('allocTable').innerHTML = `
    <tr><th>Asset Class</th><th>Allocation</th><th>%</th></tr>
    ${allocations.map(a => `
      <tr>
        <td>${a.asset}</td>
        <td><div class="pct-bar"><div class="pct-track"><div class="pct-fill" style="width:${a.pct}%;background:${a.color}"></div></div></div></td>
        <td>${a.pct}%</td>
      </tr>
    `).join('')}
  `;
}

// ============================================================
// HEATMAP
// ============================================================
function riskColor(value) {
  if (value < 30) return { bg: '#064e3b', text: '#34d399' };
  if (value < 70) return { bg: '#713f12', text: '#fbbf24' };
  return { bg: '#7f1d1d', text: '#fca5a5' };
}

function renderHeatmap() {
  let sortedSectors = [...sectors];
  if (sortCol !== null) {
    sortedSectors.sort((a, b) => (riskMatrix[a][sortCol] - riskMatrix[b][sortCol]) * sortDir);
  }

  const headerCells = riskFactors.map(f => {
    const arrow = sortCol === f ? (sortDir === 1 ? '▲' : '▼') : '';
    return `<th onclick="sortHeatmap('${f}')">${f} <span class="sort-arrow">${arrow}</span></th>`;
  }).join('');

  const rows = sortedSectors.map(s => {
    const cells = riskFactors.map(f => {
      const val = riskMatrix[s][f];
      const { bg, text } = riskColor(val);
      return `<td><div class="heat-cell" style="background:${bg};color:${text}" data-sector="${s}" data-factor="${f}" data-value="${val}">${val}</div></td>`;
    }).join('');
    return `<tr><th style="text-align:right;padding-right:12px;">${s}</th>${cells}</tr>`;
  }).join('');

  document.getElementById('heatmap').innerHTML = `<tr><th></th>${headerCells}</tr>${rows}`;

  // Attach hover listeners
  document.querySelectorAll('.heat-cell').forEach(cell => {
    cell.addEventListener('mouseenter', showTooltip);
    cell.addEventListener('mouseleave', hideTooltip);
  });
}

function sortHeatmap(factor) {
  if (sortCol === factor) {
    sortDir *= -1;
  } else {
    sortCol = factor;
    sortDir = 1;
  }
  renderHeatmap();
}
window.sortHeatmap = sortHeatmap;

// ============================================================
// TOOLTIP
// ============================================================
const tooltip = document.getElementById('tooltip');

function showTooltip(e) {
  const cell = e.target;
  const sector = cell.dataset.sector;
  const factor = cell.dataset.factor;
  const value = parseInt(cell.dataset.value);
  const level = value < 30 ? 'Low' : value < 70 ? 'Medium' : 'High';

  tooltip.innerHTML = `
    <div class="tooltip-title">${sector} — ${factor}</div>
    <div class="tooltip-value" style="color:${riskColor(value).text}">${value} (${level})</div>
    <div class="tooltip-desc">${riskDescriptions[factor]}</div>
  `;
  tooltip.classList.add('visible');

  const rect = cell.getBoundingClientRect();
  tooltip.style.left = (rect.right + 8) + 'px';
  tooltip.style.top = (rect.top - 10) + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ============================================================
// RISK SCORE
// ============================================================
function calculateRiskScore() {
  // Weighted average: each sector's avg risk × allocation weight
  const sectorAvgs = sectors.map(s => {
    const vals = riskFactors.map(f => riskMatrix[s][f]);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });
  const overallAvg = sectorAvgs.reduce((a, b) => a + b, 0) / sectorAvgs.length;
  const score = Math.round(overallAvg);

  const el = document.getElementById('riskScore');
  el.textContent = score;
  el.style.color = riskColor(score).text;
}

// ============================================================
// EXPORT
// ============================================================
document.getElementById('exportBtn').addEventListener('click', () => {
  const report = {
    generatedAt: new Date().toISOString(),
    allocations,
    riskMatrix,
    overallScore: parseInt(document.getElementById('riskScore').textContent)
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `risk_report_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

// ============================================================
// INIT
// ============================================================
renderAllocations();
renderHeatmap();
calculateRiskScore();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Got rejected — interviewer wanted **interactive allocation slider** that recalculates risk in real-time
- **Heatmap conditional formatting**: `riskColor()` returns bg/text colors based on threshold bands (green <30, amber 30-70, red >70)
- Column sorting: toggle `sortDir` on same column, reset on new column — sectors re-sort by selected risk factor
- **Tooltip**: fixed-position div, shown on mouseenter, hidden on mouseleave, positioned relative to cell `getBoundingClientRect()`
- Risk score: average of all sector averages — weighted composite index
- Dark theme financials: monospace font, dark blue-gray palette #0a0f1e/#111827
- JSON export: `Blob` + `URL.createObjectURL` for client-side download

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Medium | Algorithms, Data Structures |
| Technical 1 | Medium | DOM, CSS Grid, Tables |
| Technical 2 | Hard | Heatmap, Tooltips, Conditional Formatting |
| System Design | Hard | Trading Platform, Real-time Data |
| Superday | Hard | Multi-round Behavioral + Technical |
