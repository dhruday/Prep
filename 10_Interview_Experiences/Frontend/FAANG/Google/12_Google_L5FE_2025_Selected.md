# Google — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Frontend Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Mountain View |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site: 2 FE Coding + System Design + Googliness)
- **Timeline:** 5 weeks
- **Format:** On-site

## Round 3: Frontend Coding — Spreadsheet Grid with Formula Bar

### Problem
Build a spreadsheet grid component (like Google Sheets) with:
1. Editable cells organized in rows and columns (A1, B2, etc.)
2. Formula bar that shows/edits the active cell's value or formula
3. Support formulas: `=A1+B2`, `=SUM(A1:A5)`, `=IF(A1>10,"High","Low")`
4. Dependency tracking — cells that reference others auto-update
5. Keyboard navigation (arrows, Tab, Enter)
6. Column resize by dragging header borders

Build with **vanilla JavaScript** only — no frameworks or libraries.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Spreadsheet Grid</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f5f5f5; }

.spreadsheet { max-width: 900px; margin: 20px auto; background: #fff; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; }

.formula-bar { display: flex; align-items: center; border-bottom: 1px solid #ddd; background: #f8f8f8; }
.cell-ref { width: 70px; padding: 6px 10px; border-right: 1px solid #ddd; font-size: 13px; font-weight: 600; color: #333; text-align: center; }
.formula-input { flex: 1; padding: 6px 10px; border: none; outline: none; font-size: 13px; font-family: monospace; }
.formula-input:focus { background: #fffde7; }

.grid-wrapper { overflow: auto; max-height: 500px; position: relative; }
table { border-collapse: collapse; width: max-content; }
th, td { border: 1px solid #e0e0e0; padding: 0; min-width: 80px; height: 28px; font-size: 13px; }
th { background: #f0f0f0; font-weight: 500; position: sticky; color: #555; user-select: none; }
th.col-header { top: 0; z-index: 2; cursor: default; }
th.row-header { left: 0; z-index: 1; width: 40px; min-width: 40px; text-align: center; }
th.corner { top: 0; left: 0; z-index: 3; width: 40px; min-width: 40px; }

td { position: relative; cursor: cell; }
td .cell-display { padding: 2px 6px; width: 100%; height: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
td.active { outline: 2px solid #1a73e8; outline-offset: -1px; z-index: 1; }
td.editing .cell-display { display: none; }
td .cell-edit { display: none; position: absolute; inset: 0; border: none; padding: 2px 6px; font-size: 13px; font-family: inherit; outline: none; background: #e8f0fe; z-index: 2; }
td.editing .cell-edit { display: block; }

td.dependency-highlight { background: #e3f2fd; }
td.error { color: #d32f2f; font-style: italic; }

.col-resize-handle { position: absolute; right: -2px; top: 0; width: 5px; height: 100%; cursor: col-resize; z-index: 5; }
.col-resize-handle:hover { background: #1a73e8; }
</style>
</head>
<body>
<div class="spreadsheet" id="app"></div>

<script>
const ROWS = 20;
const COLS = 8;

// ============================================================
// DATA MODEL
// ============================================================
class CellData {
  constructor() {
    this.rawValue = '';     // what user typed (formula or value)
    this.computed = '';     // evaluated result
    this.dependents = new Set();  // cells that depend on this cell
    this.dependencies = new Set(); // cells this cell references
  }
}

class SpreadsheetModel {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = {};
    this.colWidths = Array(cols).fill(80);
  }

  getCell(ref) {
    if (!this.cells[ref]) this.cells[ref] = new CellData();
    return this.cells[ref];
  }

  setCellValue(ref, rawValue) {
    const cell = this.getCell(ref);
    // Clear old dependencies
    for (const dep of cell.dependencies) {
      this.getCell(dep).dependents.delete(ref);
    }
    cell.dependencies.clear();

    cell.rawValue = rawValue;

    if (rawValue.startsWith('=')) {
      this._evaluateFormula(ref, cell);
    } else {
      cell.computed = isNaN(rawValue) || rawValue === '' ? rawValue : parseFloat(rawValue);
    }

    // Cascade updates to dependents
    this._cascadeUpdate(ref, new Set());
  }

  _evaluateFormula(ref, cell) {
    const formula = cell.rawValue.substring(1).trim();
    try {
      // Extract cell references and build dependency graph
      const refs = this._extractRefs(formula);
      for (const depRef of refs) {
        cell.dependencies.add(depRef);
        this.getCell(depRef).dependents.add(ref);
      }

      // Check circular dependency
      if (this._hasCircular(ref, new Set())) {
        cell.computed = '#CIRC!';
        return;
      }

      cell.computed = this._evalExpression(formula);
    } catch (e) {
      cell.computed = '#ERROR!';
    }
  }

  _extractRefs(formula) {
    const refs = new Set();
    // Match cell refs like A1, B12
    const cellPattern = /\b([A-Z]+)(\d+)\b/gi;
    let match;
    while ((match = cellPattern.exec(formula)) !== null) {
      refs.add(match[0].toUpperCase());
    }
    // Match ranges like A1:A5
    const rangePattern = /([A-Z]+\d+):([A-Z]+\d+)/gi;
    while ((match = rangePattern.exec(formula)) !== null) {
      const expanded = this._expandRange(match[1].toUpperCase(), match[2].toUpperCase());
      expanded.forEach(r => refs.add(r));
    }
    return refs;
  }

  _expandRange(start, end) {
    const [sc, sr] = this._parseRef(start);
    const [ec, er] = this._parseRef(end);
    const refs = [];
    for (let c = sc; c <= ec; c++) {
      for (let r = sr; r <= er; r++) {
        refs.push(this._toRef(c, r));
      }
    }
    return refs;
  }

  _parseRef(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    let col = 0;
    for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    return [col - 1, parseInt(match[2]) - 1];
  }

  _toRef(col, row) {
    let colStr = '';
    let c = col + 1;
    while (c > 0) { colStr = String.fromCharCode(((c - 1) % 26) + 65) + colStr; c = Math.floor((c - 1) / 26); }
    return colStr + (row + 1);
  }

  _hasCircular(startRef, visited) {
    if (visited.has(startRef)) return true;
    visited.add(startRef);
    const cell = this.getCell(startRef);
    for (const dep of cell.dependencies) {
      if (this._hasCircular(dep, new Set(visited))) return true;
    }
    return false;
  }

  _evalExpression(formula) {
    // Handle functions: SUM, AVG, MIN, MAX, IF
    let processed = formula;

    // SUM(range)
    processed = processed.replace(/SUM\(([^)]+)\)/gi, (_, args) => {
      const vals = this._resolveArgs(args);
      return vals.reduce((a, b) => a + b, 0);
    });

    // AVG / AVERAGE
    processed = processed.replace(/(?:AVG|AVERAGE)\(([^)]+)\)/gi, (_, args) => {
      const vals = this._resolveArgs(args);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });

    processed = processed.replace(/MIN\(([^)]+)\)/gi, (_, args) => {
      const vals = this._resolveArgs(args);
      return Math.min(...vals);
    });

    processed = processed.replace(/MAX\(([^)]+)\)/gi, (_, args) => {
      const vals = this._resolveArgs(args);
      return Math.max(...vals);
    });

    // IF(condition, trueVal, falseVal)
    processed = processed.replace(/IF\(([^,]+),([^,]+),([^)]+)\)/gi, (_, cond, t, f) => {
      const condVal = this._evalSimple(this._substituteCellRefs(cond.trim()));
      return condVal ? this._evalSimple(this._substituteCellRefs(t.trim()))
                     : this._evalSimple(this._substituteCellRefs(f.trim()));
    });

    // Substitute remaining cell references with values
    processed = this._substituteCellRefs(processed);

    return this._evalSimple(processed);
  }

  _resolveArgs(args) {
    // Could be range A1:A5 or comma-separated A1,B1,C1
    const parts = args.split(',').map(s => s.trim());
    const values = [];
    for (const part of parts) {
      if (part.includes(':')) {
        const [start, end] = part.split(':');
        const refs = this._expandRange(start.trim().toUpperCase(), end.trim().toUpperCase());
        refs.forEach(r => {
          const v = parseFloat(this.getCell(r).computed);
          if (!isNaN(v)) values.push(v);
        });
      } else {
        const ref = part.toUpperCase();
        if (/^[A-Z]+\d+$/.test(ref)) {
          const v = parseFloat(this.getCell(ref).computed);
          if (!isNaN(v)) values.push(v);
        } else {
          const v = parseFloat(part);
          if (!isNaN(v)) values.push(v);
        }
      }
    }
    return values;
  }

  _substituteCellRefs(expr) {
    return expr.replace(/\b([A-Z]+\d+)\b/gi, (match) => {
      const val = this.getCell(match.toUpperCase()).computed;
      if (typeof val === 'string' && val.startsWith('#')) return '0';
      return isNaN(val) || val === '' ? '0' : val;
    });
  }

  _evalSimple(expr) {
    // Remove string quotes for comparison
    const cleaned = expr.replace(/["']/g, '');
    // Safe evaluation: only allow numbers, operators, parens
    if (/^[\d\s+\-*/().><!=&|?:]+$/.test(cleaned)) {
      try { return Function('"use strict"; return (' + cleaned + ')')(); } catch { return '#ERROR!'; }
    }
    return cleaned;
  }

  _cascadeUpdate(ref, visited) {
    if (visited.has(ref)) return;
    visited.add(ref);
    const cell = this.getCell(ref);
    for (const depRef of cell.dependents) {
      const depCell = this.getCell(depRef);
      if (depCell.rawValue.startsWith('=')) {
        this._evaluateFormula(depRef, depCell);
      }
      this._cascadeUpdate(depRef, visited);
    }
  }
}

// ============================================================
// VIEW / RENDERER
// ============================================================
class SpreadsheetView {
  constructor(container, model) {
    this.container = container;
    this.model = model;
    this.activeCell = null;
    this.editingCell = null;
    this.resizingCol = null;
    this._build();
    this._bindEvents();
    this.selectCell('A1');
  }

  _build() {
    this.container.innerHTML = '';

    // Formula bar
    const bar = document.createElement('div');
    bar.className = 'formula-bar';
    this.cellRefEl = document.createElement('div');
    this.cellRefEl.className = 'cell-ref';
    this.formulaInput = document.createElement('input');
    this.formulaInput.className = 'formula-input';
    this.formulaInput.placeholder = 'Enter value or formula (e.g. =SUM(A1:A5))';
    bar.append(this.cellRefEl, this.formulaInput);
    this.container.appendChild(bar);

    // Grid
    const wrapper = document.createElement('div');
    wrapper.className = 'grid-wrapper';
    const table = document.createElement('table');

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'corner col-header';
    headerRow.appendChild(corner);
    for (let c = 0; c < COLS; c++) {
      const th = document.createElement('th');
      th.className = 'col-header';
      th.textContent = String.fromCharCode(65 + c);
      th.style.width = this.model.colWidths[c] + 'px';
      th.style.position = 'sticky';
      th.style.top = '0';
      th.setAttribute('data-col', c);

      // Resize handle
      const handle = document.createElement('div');
      handle.className = 'col-resize-handle';
      handle.setAttribute('data-col', c);
      th.style.position = 'relative';
      th.appendChild(handle);

      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    this.cellElements = {};
    for (let r = 0; r < ROWS; r++) {
      const tr = document.createElement('tr');
      const rowHeader = document.createElement('th');
      rowHeader.className = 'row-header';
      rowHeader.textContent = r + 1;
      tr.appendChild(rowHeader);

      for (let c = 0; c < COLS; c++) {
        const ref = String.fromCharCode(65 + c) + (r + 1);
        const td = document.createElement('td');
        td.setAttribute('data-ref', ref);

        const display = document.createElement('div');
        display.className = 'cell-display';

        const edit = document.createElement('input');
        edit.className = 'cell-edit';

        td.append(display, edit);
        tr.appendChild(td);
        this.cellElements[ref] = { td, display, edit };
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);
    this.container.appendChild(wrapper);
    this.table = table;
  }

  _bindEvents() {
    // Cell click
    this.table.addEventListener('click', (e) => {
      const td = e.target.closest('td[data-ref]');
      if (td) this.selectCell(td.getAttribute('data-ref'));
    });

    // Cell double-click → edit
    this.table.addEventListener('dblclick', (e) => {
      const td = e.target.closest('td[data-ref]');
      if (td) this._startEdit(td.getAttribute('data-ref'));
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (this.editingCell) {
        if (e.key === 'Enter') { this._commitEdit(); this._moveActive(1, 0); }
        else if (e.key === 'Escape') this._cancelEdit();
        else if (e.key === 'Tab') { e.preventDefault(); this._commitEdit(); this._moveActive(0, e.shiftKey ? -1 : 1); }
        return;
      }

      if (!this.activeCell) return;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); this._moveActive(-1, 0); break;
        case 'ArrowDown': e.preventDefault(); this._moveActive(1, 0); break;
        case 'ArrowLeft': e.preventDefault(); this._moveActive(0, -1); break;
        case 'ArrowRight': e.preventDefault(); this._moveActive(0, 1); break;
        case 'Tab': e.preventDefault(); this._moveActive(0, e.shiftKey ? -1 : 1); break;
        case 'Enter': e.preventDefault(); this._startEdit(this.activeCell); break;
        case 'Delete': case 'Backspace':
          this.model.setCellValue(this.activeCell, '');
          this._renderCell(this.activeCell);
          this._renderDependents(this.activeCell);
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            this._startEdit(this.activeCell, e.key);
          }
      }
    });

    // Formula bar
    this.formulaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.model.setCellValue(this.activeCell, this.formulaInput.value);
        this._renderCell(this.activeCell);
        this._renderDependents(this.activeCell);
        this._moveActive(1, 0);
      } else if (e.key === 'Escape') {
        this.formulaInput.value = this.model.getCell(this.activeCell).rawValue;
        this.table.querySelector(`td[data-ref="${this.activeCell}"]`)?.focus();
      }
    });

    // Column resize
    let startX, startWidth, resizeCol;
    this.table.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.col-resize-handle');
      if (!handle) return;
      resizeCol = parseInt(handle.getAttribute('data-col'));
      startX = e.clientX;
      startWidth = this.model.colWidths[resizeCol];
      e.preventDefault();

      const onMove = (e2) => {
        const diff = e2.clientX - startX;
        const newWidth = Math.max(40, startWidth + diff);
        this.model.colWidths[resizeCol] = newWidth;
        const th = this.table.querySelector(`th[data-col="${resizeCol}"]`);
        if (th) th.style.width = newWidth + 'px';
        // Update all cells in this column
        for (let r = 0; r < ROWS; r++) {
          const ref = String.fromCharCode(65 + resizeCol) + (r + 1);
          const el = this.cellElements[ref];
          if (el) el.td.style.width = newWidth + 'px';
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  selectCell(ref) {
    if (this.editingCell) this._commitEdit();

    // Clear old active
    if (this.activeCell && this.cellElements[this.activeCell]) {
      this.cellElements[this.activeCell].td.classList.remove('active');
    }
    // Clear dependency highlights
    document.querySelectorAll('.dependency-highlight').forEach(el => el.classList.remove('dependency-highlight'));

    this.activeCell = ref;
    const el = this.cellElements[ref];
    if (el) {
      el.td.classList.add('active');
      // Highlight dependencies
      const cell = this.model.getCell(ref);
      for (const dep of cell.dependencies) {
        if (this.cellElements[dep]) this.cellElements[dep].td.classList.add('dependency-highlight');
      }
    }

    // Update formula bar
    this.cellRefEl.textContent = ref;
    this.formulaInput.value = this.model.getCell(ref).rawValue;
  }

  _startEdit(ref, initialChar) {
    this.editingCell = ref;
    const el = this.cellElements[ref];
    if (!el) return;

    el.td.classList.add('editing');
    const cell = this.model.getCell(ref);
    el.edit.value = initialChar || cell.rawValue;
    el.edit.focus();
    if (initialChar) {
      el.edit.setSelectionRange(1, 1);
    } else {
      el.edit.select();
    }
  }

  _commitEdit() {
    if (!this.editingCell) return;
    const ref = this.editingCell;
    const el = this.cellElements[ref];
    if (!el) { this.editingCell = null; return; }

    const newValue = el.edit.value;
    this.model.setCellValue(ref, newValue);
    el.td.classList.remove('editing');
    this._renderCell(ref);
    this._renderDependents(ref);
    this.formulaInput.value = newValue;
    this.editingCell = null;
  }

  _cancelEdit() {
    if (!this.editingCell) return;
    const el = this.cellElements[this.editingCell];
    if (el) el.td.classList.remove('editing');
    this.editingCell = null;
  }

  _moveActive(dRow, dCol) {
    if (!this.activeCell) return;
    const col = this.activeCell.charCodeAt(0) - 65 + dCol;
    const row = parseInt(this.activeCell.substring(1)) - 1 + dRow;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    const newRef = String.fromCharCode(65 + col) + (row + 1);
    this.selectCell(newRef);
  }

  _renderCell(ref) {
    const el = this.cellElements[ref];
    if (!el) return;
    const cell = this.model.getCell(ref);
    const val = cell.computed;
    el.display.textContent = val;
    el.td.classList.toggle('error', typeof val === 'string' && val.startsWith('#'));
  }

  _renderDependents(ref) {
    const cell = this.model.getCell(ref);
    for (const dep of cell.dependents) {
      this._renderCell(dep);
      this._renderDependents(dep); // cascade
    }
  }
}

// ============================================================
// INIT
// ============================================================
const model = new SpreadsheetModel(ROWS, COLS);
const view = new SpreadsheetView(document.getElementById('app'), model);

// Pre-populate demo data
const demoData = { A1: 'Item', B1: 'Price', C1: 'Qty', D1: '=B1&" Total"',
  A2: 'Widget', B2: '10', C2: '5', D2: '=B2*C2',
  A3: 'Gadget', B3: '25', C3: '3', D3: '=B3*C3',
  A4: 'Doohickey', B4: '7', C4: '12', D4: '=B4*C4',
  A5: 'Total', D5: '=SUM(D2:D4)', E5: '=AVG(B2:B4)', F5: '=IF(D5>100,"Big","Small")'
};
for (const [ref, val] of Object.entries(demoData)) {
  model.setCellValue(ref, val);
  view._renderCell(ref);
}
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Google FE L5 expects **complex interactive UI** with clean architecture (model/view separation)
- Formula evaluation: parse cell references → build dependency graph → cascade updates
- **Circular dependency detection** via DFS on the dependency graph — display `#CIRC!`
- Keyboard navigation: Arrow keys, Tab, Enter, Delete — same as Google Sheets muscle memory
- Column resize with mousedown/mousemove/mouseup handler chain
- Dependency highlighting shows which cells a formula references
- Formula bar + inline editing = two editing modes, synchronized via model
- `Function()` for safe expression evaluation — discuss sanitization tradeoffs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | DOM, Event Handling |
| FE Coding 1 | Medium-Hard | Component Architecture |
| FE Coding 2 | Hard | Spreadsheet, Formula Parsing, Dependency Graphs |
| System Design | Hard | Collaborative Editing at Scale |
| Googliness | Medium | Teamwork, Ambiguity |
