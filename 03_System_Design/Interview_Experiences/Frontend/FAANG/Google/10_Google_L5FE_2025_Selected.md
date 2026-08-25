# Google — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Frontend Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite: 2 Frontend Coding + Frontend Design + Googleyness)
- **Timeline:** 5 weeks (with team matching)
- **Format:** Virtual

## Round 1: Phone Screen — Frontend Coding
**Duration:** 45 minutes

### Questions Asked
1. **Build a Spreadsheet Cell Dependency Resolver**
   - Given cells with formulas referencing other cells, evaluate all cells
   - Detect circular dependencies
   - Support basic operations: =A1+B2, =SUM(A1:A5)

### 💡 Interview-Ready Answer

```javascript
class Spreadsheet {
  constructor() {
    this.cells = new Map();    // cellId -> { raw, evaluated, formula }
    this.deps = new Map();     // cellId -> Set<cellId> (cells this cell depends on)
    this.dependents = new Map(); // cellId -> Set<cellId> (cells that depend on this cell)
  }

  // ============================
  // Cell Reference Parsing
  // ============================
  static parseCellRef(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    return { col: match[1], row: parseInt(match[2]) };
  }

  static expandRange(range) {
    const [start, end] = range.split(':');
    const s = Spreadsheet.parseCellRef(start);
    const e = Spreadsheet.parseCellRef(end);
    if (!s || !e) return [];

    const cells = [];
    // Simple: same column, range of rows
    if (s.col === e.col) {
      for (let r = s.row; r <= e.row; r++) {
        cells.push(`${s.col}${r}`);
      }
    }
    // Same row, range of columns
    else if (s.row === e.row) {
      const startCode = s.col.charCodeAt(0);
      const endCode = e.col.charCodeAt(0);
      for (let c = startCode; c <= endCode; c++) {
        cells.push(`${String.fromCharCode(c)}${s.row}`);
      }
    }
    return cells;
  }

  // ============================
  // Formula Parsing & Evaluation
  // ============================
  extractDependencies(formula) {
    const deps = new Set();
    // Match cell references (e.g., A1, B2)
    const cellPattern = /[A-Z]+\d+/g;
    // Match ranges (e.g., A1:A5)
    const rangePattern = /([A-Z]+\d+):([A-Z]+\d+)/g;

    let match;
    // First expand ranges
    while ((match = rangePattern.exec(formula)) !== null) {
      const expanded = Spreadsheet.expandRange(match[0]);
      expanded.forEach(c => deps.add(c));
    }
    // Then individual cells (exclude range endpoints already counted)
    const formulaNoRanges = formula.replace(rangePattern, '');
    while ((match = cellPattern.exec(formulaNoRanges)) !== null) {
      deps.add(match[0]);
    }
    return deps;
  }

  evaluate(formula) {
    if (!formula.startsWith('=')) {
      const num = parseFloat(formula);
      return isNaN(num) ? formula : num;
    }

    const expr = formula.substring(1); // Remove '='

    // Handle SUM(range)
    const sumMatch = expr.match(/^SUM\((.+)\)$/i);
    if (sumMatch) {
      const range = sumMatch[1];
      const cells = range.includes(':')
        ? Spreadsheet.expandRange(range)
        : range.split(',').map(s => s.trim());
      let sum = 0;
      for (const cellId of cells) {
        const val = this.getCellValue(cellId);
        sum += typeof val === 'number' ? val : 0;
      }
      return sum;
    }

    // Handle AVG(range)
    const avgMatch = expr.match(/^AVG\((.+)\)$/i);
    if (avgMatch) {
      const range = avgMatch[1];
      const cells = range.includes(':')
        ? Spreadsheet.expandRange(range)
        : range.split(',').map(s => s.trim());
      let sum = 0, count = 0;
      for (const cellId of cells) {
        const val = this.getCellValue(cellId);
        if (typeof val === 'number') { sum += val; count++; }
      }
      return count > 0 ? sum / count : 0;
    }

    // Handle arithmetic expressions: replace cell refs with values
    let resolvedExpr = expr.replace(/[A-Z]+\d+/g, (cellRef) => {
      const val = this.getCellValue(cellRef);
      return typeof val === 'number' ? val : 0;
    });

    // Safe arithmetic evaluation (no eval!)
    return this.safeEval(resolvedExpr);
  }

  // Simple arithmetic parser (supports +, -, *, /, parentheses)
  safeEval(expr) {
    const tokens = expr.match(/(\d+\.?\d*|[+\-*/()])/g);
    if (!tokens) return 0;

    let pos = 0;

    const parseExpr = () => {
      let result = parseTerm();
      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        const op = tokens[pos++];
        const right = parseTerm();
        result = op === '+' ? result + right : result - right;
      }
      return result;
    };

    const parseTerm = () => {
      let result = parseFactor();
      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
        const op = tokens[pos++];
        const right = parseFactor();
        result = op === '*' ? result * right : result / right;
      }
      return result;
    };

    const parseFactor = () => {
      if (tokens[pos] === '(') {
        pos++; // skip '('
        const result = parseExpr();
        pos++; // skip ')'
        return result;
      }
      return parseFloat(tokens[pos++]);
    };

    return parseExpr();
  }

  // ============================
  // Circular Dependency Detection
  // ============================
  hasCycle(cellId, newDeps) {
    const visited = new Set();
    const stack = [...newDeps];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === cellId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const currentDeps = this.deps.get(current);
      if (currentDeps) {
        for (const dep of currentDeps) {
          stack.push(dep);
        }
      }
    }
    return false;
  }

  // ============================
  // Topological Sort for Evaluation Order
  // ============================
  topologicalSort() {
    const inDegree = new Map();
    const order = [];

    for (const [cellId] of this.cells) {
      if (!inDegree.has(cellId)) inDegree.set(cellId, 0);
      const cellDeps = this.deps.get(cellId) || new Set();
      inDegree.set(cellId, cellDeps.size);
    }

    const queue = [];
    for (const [cellId, degree] of inDegree) {
      if (degree === 0) queue.push(cellId);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      order.push(current);

      const dependentCells = this.dependents.get(current) || new Set();
      for (const dep of dependentCells) {
        const newDegree = inDegree.get(dep) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) queue.push(dep);
      }
    }

    return order;
  }

  // ============================
  // Public API
  // ============================
  setCell(cellId, rawValue) {
    const newDeps = rawValue.startsWith('=')
      ? this.extractDependencies(rawValue)
      : new Set();

    // Check for circular dependencies
    if (this.hasCycle(cellId, newDeps)) {
      throw new Error(`Circular dependency detected for cell ${cellId}`);
    }

    // Update dependency graph
    const oldDeps = this.deps.get(cellId) || new Set();
    for (const dep of oldDeps) {
      this.dependents.get(dep)?.delete(cellId);
    }
    this.deps.set(cellId, newDeps);
    for (const dep of newDeps) {
      if (!this.dependents.has(dep)) this.dependents.set(dep, new Set());
      this.dependents.get(dep).add(cellId);
    }

    this.cells.set(cellId, { raw: rawValue, evaluated: null });
    this.recalculate(cellId);
  }

  recalculate(cellId) {
    const cell = this.cells.get(cellId);
    if (!cell) return;

    cell.evaluated = this.evaluate(cell.raw);

    // Propagate to dependents
    const depCells = this.dependents.get(cellId) || new Set();
    for (const dep of depCells) {
      this.recalculate(dep);
    }
  }

  getCellValue(cellId) {
    const cell = this.cells.get(cellId);
    return cell ? cell.evaluated : 0;
  }

  print() {
    for (const [id, cell] of this.cells) {
      console.log(`${id}: raw="${cell.raw}" => ${cell.evaluated}`);
    }
  }
}

// Usage
const sheet = new Spreadsheet();
sheet.setCell('A1', '10');
sheet.setCell('A2', '20');
sheet.setCell('A3', '=A1+A2');       // 30
sheet.setCell('A4', '=SUM(A1:A3)');  // 10+20+30 = 60
sheet.setCell('B1', '=A4*2');         // 120

sheet.print();

// Update A1 → cascades to A3, A4, B1
sheet.setCell('A1', '50');
console.log('After updating A1 to 50:');
sheet.print();
```

## Round 2: Frontend Coding Onsite 1
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Virtual DOM Diffing Algorithm**
   - Compare old and new virtual DOM trees
   - Generate minimal patch operations

## Round 3: Frontend Coding Onsite 2
**Duration:** 45 minutes

### Questions Asked
1. **Build a Kanban Board with Drag and Drop**
   - Multiple columns (To Do, In Progress, Done)
   - Drag cards between columns and reorder within

## Round 4: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Google Sheets Frontend Architecture**
   - Collaborative real-time editing (OT/CRDT)
   - Cell dependency graph and recalculation engine
   - Virtual rendering for million-cell spreadsheets

## Round 5: Googleyness & Leadership
**Duration:** 45 minutes

## 🎯 Key Takeaways
- Google frontend L5 tests **data structure thinking in a UI context** — spreadsheets, virtual DOM, dependency graphs
- Circular dependency detection via DFS is a must-know
- **Safe arithmetic evaluation** (no eval) shows production awareness
- Frontend system design at Google goes very deep into **collaborative editing** mechanics
- Topological sort for recalculation order is the key insight for spreadsheet engines

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Spreadsheet, DAG, Topological Sort |
| Frontend Coding 1 | Hard | Virtual DOM, Tree Diffing |
| Frontend Coding 2 | Medium | Drag & Drop, DOM Manipulation |
| Frontend Design | Hard | Sheets, CRDT, Virtual Rendering |
| Googleyness | Medium | Behavioral |
