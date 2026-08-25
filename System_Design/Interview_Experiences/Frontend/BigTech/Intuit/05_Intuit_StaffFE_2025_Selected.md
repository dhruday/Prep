# Intuit — Senior Frontend Engineer Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Senior Frontend Engineer |
| **Level** | Staff |
| **YOE** | 8 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Mountain View, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | QuickBooks |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + Craft Demo + FE Coding + System Design + HM)

---

## Round 3: Frontend Coding — Build a Financial Report Builder
**Duration:** 60 minutes

### Challenge: Build a drag-and-drop report builder for QuickBooks: select financial data fields (revenue, expenses, profit), drag into row/column zones, configure aggregation (sum, avg, max), and preview a pivot-table-like report.

```javascript
/**
 * Financial Report Builder:
 * 
 * 1. Field palette: available data fields (dimensions + measures)
 * 2. Drop zones: Rows, Columns, Values
 * 3. Aggregation: SUM, AVG, COUNT, MAX, MIN per value field
 * 4. Live report preview: pivot table rendering
 * 5. Number formatting: Indian rupee, percentage, plain
 */
class ReportBuilder {
  constructor(container) {
    this.container = container;
    
    // Available fields
    this.fields = [
      { id: 'category', label: 'Category', type: 'dimension' },
      { id: 'product', label: 'Product', type: 'dimension' },
      { id: 'region', label: 'Region', type: 'dimension' },
      { id: 'quarter', label: 'Quarter', type: 'dimension' },
      { id: 'revenue', label: 'Revenue', type: 'measure', format: 'currency' },
      { id: 'expenses', label: 'Expenses', type: 'measure', format: 'currency' },
      { id: 'units', label: 'Units Sold', type: 'measure', format: 'number' },
      { id: 'profit_margin', label: 'Profit Margin', type: 'measure', format: 'percent' },
    ];
    
    // Drop zone assignments
    this.rows = [];       // dimension field ids
    this.columns = [];    // dimension field ids
    this.values = [];     // { fieldId, aggregation: 'SUM'|'AVG'|'COUNT'|'MAX'|'MIN' }
    
    // Sample data
    this.data = this.generateData();
    
    this.draggedField = null;
    this.render();
  }
  
  generateData() {
    const categories = ['Electronics', 'Clothing', 'Food', 'Furniture'];
    const products = ['Widget A', 'Widget B', 'Widget C'];
    const regions = ['North', 'South', 'East', 'West'];
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const rows = [];
    
    for (const category of categories) {
      for (const product of products) {
        for (const region of regions) {
          for (const quarter of quarters) {
            const revenue = 10000 + Math.round(Math.random() * 90000);
            const expenses = Math.round(revenue * (0.4 + Math.random() * 0.3));
            rows.push({
              category, product, region, quarter,
              revenue, expenses,
              units: 50 + Math.round(Math.random() * 450),
              profit_margin: Math.round((1 - expenses / revenue) * 10000) / 100
            });
          }
        }
      }
    }
    return rows;
  }
  
  render() {
    this.container.innerHTML = `
      <style>
        .rb-layout { font-family:-apple-system,sans-serif; }
        .rb-builder { display:flex; gap:16px; margin-bottom:16px; }
        .rb-palette { width:200px; }
        .rb-zones { flex:1; display:flex; gap:12px; flex-wrap:wrap; }
        .rb-section-title { font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
        .rb-field { padding:6px 10px; background:#fff; border:1px solid #d1d5db; border-radius:6px; font-size:13px; cursor:grab; margin-bottom:4px; display:flex; align-items:center; gap:6px; }
        .rb-field:active { cursor:grabbing; }
        .rb-field.dimension { border-left:3px solid #276ef1; }
        .rb-field.measure { border-left:3px solid #22c55e; }
        .rb-field-icon { font-size:10px; color:#9ca3af; }
        .rb-zone { flex:1; min-width:180px; min-height:80px; border:2px dashed #d1d5db; border-radius:8px; padding:8px; transition:all 0.15s; }
        .rb-zone.dragover { border-color:#276ef1; background:#f0f6ff; }
        .rb-zone-title { font-size:11px; font-weight:600; color:#9ca3af; margin-bottom:6px; text-transform:uppercase; }
        .rb-zone-field { display:flex; align-items:center; gap:4px; padding:4px 8px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; font-size:12px; margin-bottom:4px; }
        .rb-zone-field .rb-remove { cursor:pointer; color:#ef4444; font-size:14px; margin-left:auto; }
        .rb-agg-select { border:1px solid #d1d5db; border-radius:3px; font-size:11px; padding:1px 4px; }
        .rb-preview { border:1px solid #e5e7eb; border-radius:8px; overflow:auto; max-height:400px; }
        .rb-table { width:100%; border-collapse:collapse; font-size:12px; }
        .rb-table th { padding:6px 10px; background:#f3f4f6; border:1px solid #e5e7eb; text-align:left; font-weight:600; white-space:nowrap; position:sticky; top:0; }
        .rb-table td { padding:6px 10px; border:1px solid #f3f4f6; }
        .rb-table td.number { text-align:right; font-variant-numeric:tabular-nums; }
        .rb-table tr:hover { background:#f8fafc; }
        .rb-total-row td { font-weight:700; background:#f9fafb; border-top:2px solid #e5e7eb; }
        .rb-empty { padding:40px; text-align:center; color:#9ca3af; font-size:13px; }
      </style>
      <div class="rb-layout">
        <div class="rb-builder">
          <div class="rb-palette">
            <div class="rb-section-title">Fields</div>
            ${this.fields.map(f => `
              <div class="rb-field ${f.type}" draggable="true" data-field="${f.id}">
                <span class="rb-field-icon">${f.type === 'dimension' ? '📊' : '📈'}</span>
                ${this.esc(f.label)}
              </div>
            `).join('')}
          </div>
          <div class="rb-zones">
            ${this.renderZone('rows', 'Rows', this.rows)}
            ${this.renderZone('columns', 'Columns', this.columns)}
            ${this.renderZone('values', 'Values', this.values)}
          </div>
        </div>
        <div class="rb-preview">
          ${this.renderReport()}
        </div>
      </div>
    `;
    
    this.attachListeners();
  }
  
  renderZone(zoneId, label, items) {
    const renderItem = (item, idx) => {
      if (zoneId === 'values') {
        const field = this.fields.find(f => f.id === item.fieldId);
        return `
          <div class="rb-zone-field">
            ${this.esc(field?.label || item.fieldId)}
            <select class="rb-agg-select" data-zone="${zoneId}" data-idx="${idx}">
              ${['SUM','AVG','COUNT','MAX','MIN'].map(agg => 
                `<option value="${agg}" ${item.aggregation === agg ? 'selected' : ''}>${agg}</option>`
              ).join('')}
            </select>
            <span class="rb-remove" data-zone="${zoneId}" data-idx="${idx}">×</span>
          </div>
        `;
      }
      const field = this.fields.find(f => f.id === item);
      return `
        <div class="rb-zone-field">
          ${this.esc(field?.label || item)}
          <span class="rb-remove" data-zone="${zoneId}" data-idx="${idx}">×</span>
        </div>
      `;
    };
    
    return `
      <div class="rb-zone" data-zone="${zoneId}">
        <div class="rb-zone-title">${label}</div>
        ${items.map((item, idx) => renderItem(item, idx)).join('')}
        ${items.length === 0 ? '<div style="font-size:11px;color:#ccc">Drop fields here</div>' : ''}
      </div>
    `;
  }
  
  renderReport() {
    if (this.values.length === 0) {
      return '<div class="rb-empty">Drag measure fields into Values zone to generate report</div>';
    }
    
    // Generate pivot table
    const rowKeys = this.rows;
    const colKeys = this.columns;
    
    // Group data
    const grouped = new Map();
    
    for (const row of this.data) {
      const rk = rowKeys.map(k => row[k]).join('|');
      const ck = colKeys.map(k => row[k]).join('|');
      const key = rk + '::' + ck;
      
      if (!grouped.has(key)) {
        grouped.set(key, { rowValues: rowKeys.map(k => row[k]), colValues: colKeys.map(k => row[k]), records: [] });
      }
      grouped.get(key).records.push(row);
    }
    
    // Get unique column combinations
    const uniqueCols = [...new Set([...grouped.values()].map(g => g.colValues.join('|')))].sort();
    
    // Get unique row combinations
    const uniqueRows = [...new Set([...grouped.values()].map(g => g.rowValues.join('|')))].sort();
    
    // Build header
    let headerHtml = '<tr>';
    rowKeys.forEach(k => { headerHtml += `<th>${this.esc(this.fields.find(f => f.id === k)?.label || k)}</th>`; });
    
    if (uniqueCols.length > 0 && colKeys.length > 0) {
      for (const colCombo of uniqueCols) {
        for (const val of this.values) {
          const field = this.fields.find(f => f.id === val.fieldId);
          headerHtml += `<th>${this.esc(colCombo.replace(/\|/g, ' / '))} - ${val.aggregation}(${this.esc(field?.label || '')})</th>`;
        }
      }
    } else {
      for (const val of this.values) {
        const field = this.fields.find(f => f.id === val.fieldId);
        headerHtml += `<th>${val.aggregation}(${this.esc(field?.label || '')})</th>`;
      }
    }
    headerHtml += '</tr>';
    
    // Build body
    let bodyHtml = '';
    const grandTotals = this.values.map(() => []);
    
    for (const rowCombo of uniqueRows) {
      bodyHtml += '<tr>';
      const rowParts = rowCombo.split('|');
      rowParts.forEach(p => { bodyHtml += `<td>${this.esc(p || '(All)')}</td>`; });
      
      const targetCols = uniqueCols.length > 0 && colKeys.length > 0 ? uniqueCols : [''];
      
      for (const colCombo of targetCols) {
        const key = rowCombo + '::' + colCombo;
        const group = grouped.get(key);
        
        this.values.forEach((val, vi) => {
          if (group) {
            const result = this.aggregate(group.records, val.fieldId, val.aggregation);
            grandTotals[vi].push(result);
            const field = this.fields.find(f => f.id === val.fieldId);
            bodyHtml += `<td class="number">${this.formatValue(result, field?.format)}</td>`;
          } else {
            bodyHtml += '<td class="number">—</td>';
          }
        });
      }
      
      bodyHtml += '</tr>';
    }
    
    // Grand total row
    bodyHtml += '<tr class="rb-total-row">';
    rowKeys.forEach((k, i) => { bodyHtml += `<td>${i === 0 ? 'Total' : ''}</td>`; });
    
    grandTotals.forEach((vals, vi) => {
      const targetCols = uniqueCols.length > 0 && colKeys.length > 0 ? uniqueCols : [''];
      for (let ci = 0; ci < targetCols.length; ci++) {
        const total = vals.filter(v => !isNaN(v)).reduce((a, b) => a + b, 0);
        const field = this.fields.find(f => f.id === this.values[vi].fieldId);
        bodyHtml += `<td class="number">${this.formatValue(total, field?.format)}</td>`;
      }
    });
    bodyHtml += '</tr>';
    
    return `<table class="rb-table"><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody></table>`;
  }
  
  aggregate(records, fieldId, agg) {
    const values = records.map(r => r[fieldId]).filter(v => v != null && !isNaN(v));
    if (values.length === 0) return 0;
    
    switch (agg) {
      case 'SUM': return values.reduce((a, b) => a + b, 0);
      case 'AVG': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'COUNT': return values.length;
      case 'MAX': return Math.max(...values);
      case 'MIN': return Math.min(...values);
      default: return 0;
    }
  }
  
  formatValue(val, format) {
    if (val == null || isNaN(val)) return '—';
    switch (format) {
      case 'currency': return '₹' + Math.round(val).toLocaleString('en-IN');
      case 'percent': return val.toFixed(1) + '%';
      case 'number': return Math.round(val).toLocaleString('en-IN');
      default: return String(Math.round(val * 100) / 100);
    }
  }
  
  attachListeners() {
    // Drag from palette
    this.container.querySelectorAll('.rb-field[draggable]').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        this.draggedField = el.dataset.field;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', this.draggedField);
      });
    });
    
    // Drop zones
    this.container.querySelectorAll('.rb-zone').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        zone.classList.add('dragover');
      });
      
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        
        const fieldId = this.draggedField;
        const zoneId = zone.dataset.zone;
        const field = this.fields.find(f => f.id === fieldId);
        if (!field) return;
        
        if (zoneId === 'values') {
          if (field.type !== 'measure') return; // Only measures in values zone
          if (!this.values.some(v => v.fieldId === fieldId)) {
            this.values.push({ fieldId, aggregation: 'SUM' });
          }
        } else {
          if (field.type !== 'dimension') return; // Only dimensions in rows/columns
          const target = zoneId === 'rows' ? this.rows : this.columns;
          if (!target.includes(fieldId)) target.push(fieldId);
        }
        
        this.render();
      });
    });
    
    // Remove from zones
    this.container.querySelectorAll('.rb-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const zoneId = btn.dataset.zone;
        const idx = parseInt(btn.dataset.idx);
        if (zoneId === 'values') this.values.splice(idx, 1);
        else if (zoneId === 'rows') this.rows.splice(idx, 1);
        else if (zoneId === 'columns') this.columns.splice(idx, 1);
        this.render();
      });
    });
    
    // Aggregation change
    this.container.querySelectorAll('.rb-agg-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.idx);
        this.values[idx].aggregation = sel.value;
        this.render();
      });
    });
  }
  
  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
```

---

## 🎯 Key Takeaways
- Intuit Staff FE = **Financial report builder with pivot table, drag-and-drop, aggregation**
- **Zone-based DnD**: dimensions → rows/columns zones, measures → values zone — type enforcement
- **Aggregation**: SUM, AVG, COUNT, MAX, MIN — configurable per-measure field
- **Pivot table**: row combo × column combo → group records → aggregate — same as Excel PivotTable
- **Grand total row**: sum of all aggregated values per column
- **Number formatting**: Indian locale (`en-IN`) for currency, percentage, plain number
- **Field type safety**: only dimensions in rows/columns, only measures in values — prevents invalid reports
- **Duplicate prevention**: check if field already in zone before adding
- Intuit QuickBooks = **financial reporting** — pivot tables, aggregation, formatting are core product features

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | JS Coding |
| Craft Demo | Hard | Live coding presentation |
| FE Coding (this) | Very Hard | Drag & Drop, Pivot Table, Aggregation |
| System Design | Hard | QuickBooks Architecture |
| HM | Medium | Culture |
