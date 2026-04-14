# Oracle — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Oracle |
| **Role** | IC-3 Frontend |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/oracle-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Oracle Cloud Infrastructure (OCI) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System design round — missed caching layer and CDN strategy

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Spreadsheet Grid** (like Google Sheets — simplified)
   - Editable cells (click to edit, Enter to confirm, Escape to cancel)
   - Formula support: `=A1+B2`, `=SUM(A1:A5)`
   - Cell dependencies: when A1 changes, all cells referencing A1 recalculate
   - Circular dependency detection

### 💡 Interview-Ready Answer

```javascript
class Spreadsheet {
  constructor(rows, cols) {
    this.data = {}; // { 'A1': { raw: '=B1+C1', computed: 42 }, ... }
    this.deps = {}; // { 'A1': Set(['B1', 'C1']) } — cells A1 depends on
    this.rdeps = {}; // Reverse: { 'B1': Set(['A1']) } — cells that depend on B1
    this.rows = rows;
    this.cols = cols;
  }
  
  setCell(cellId, value) {
    // Remove old dependencies
    if (this.deps[cellId]) {
      for (const dep of this.deps[cellId]) {
        this.rdeps[dep]?.delete(cellId);
      }
    }
    
    // Parse formula
    if (typeof value === 'string' && value.startsWith('=')) {
      const refs = this.#extractRefs(value);
      
      // Check circular dependency BEFORE setting
      if (this.#hasCircularDep(cellId, refs)) {
        throw new Error(`Circular dependency detected: ${cellId}`);
      }
      
      this.deps[cellId] = new Set(refs);
      for (const ref of refs) {
        if (!this.rdeps[ref]) this.rdeps[ref] = new Set();
        this.rdeps[ref].add(cellId);
      }
      
      this.data[cellId] = { raw: value, computed: this.#evaluate(value) };
    } else {
      this.deps[cellId] = new Set();
      this.data[cellId] = { raw: value, computed: Number(value) || value };
    }
    
    // Propagate changes to dependents (topological order)
    this.#propagate(cellId);
  }
  
  getCell(cellId) {
    return this.data[cellId]?.computed ?? '';
  }
  
  getRaw(cellId) {
    return this.data[cellId]?.raw ?? '';
  }
  
  // Extract cell references from formula: =A1+B2 → ['A1', 'B2']
  #extractRefs(formula) {
    const refs = [];
    const rangeRegex = /([A-Z]+\d+):([A-Z]+\d+)/g;
    const cellRegex = /[A-Z]+\d+/g;
    
    // Expand ranges first: SUM(A1:A5) → [A1, A2, A3, A4, A5]
    const expanded = formula.replace(rangeRegex, (_, start, end) => {
      const range = this.#expandRange(start, end);
      range.forEach(r => refs.push(r));
      return range.join(',');
    });
    
    // Extract individual cell refs
    const matches = expanded.match(cellRegex) || [];
    return [...new Set([...refs, ...matches])];
  }
  
  #expandRange(start, end) {
    const cells = [];
    const startCol = start.match(/[A-Z]+/)[0];
    const startRow = parseInt(start.match(/\d+/)[0]);
    const endCol = end.match(/[A-Z]+/)[0];
    const endRow = parseInt(end.match(/\d+/)[0]);
    
    for (let col = startCol.charCodeAt(0); col <= endCol.charCodeAt(0); col++) {
      for (let row = startRow; row <= endRow; row++) {
        cells.push(String.fromCharCode(col) + row);
      }
    }
    return cells;
  }
  
  // Evaluate formulas
  #evaluate(formula) {
    const expr = formula.substring(1); // Remove '='
    
    // Handle SUM
    const sumEval = expr.replace(/SUM\(([^)]+)\)/g, (_, args) => {
      const cells = args.split(',').map(c => c.trim());
      return cells.reduce((sum, cellId) => sum + (this.getCell(cellId) || 0), 0);
    });
    
    // Replace cell refs with their values
    const withValues = sumEval.replace(/[A-Z]+\d+/g, (cellId) => {
      const val = this.getCell(cellId);
      return typeof val === 'number' ? val : 0;
    });
    
    // Safe evaluation (no eval!)
    return this.#safeCalc(withValues);
  }
  
  // Simple arithmetic parser (no eval)
  #safeCalc(expr) {
    // Tokenize and parse (+, -, *, /)
    const tokens = expr.match(/(\d+\.?\d*|[+\-*/()])/g) || [];
    let pos = 0;
    
    const parseExpr = () => {
      let left = parseTerm();
      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        const op = tokens[pos++];
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    };
    
    const parseTerm = () => {
      let left = parseFactor();
      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
        const op = tokens[pos++];
        const right = parseFactor();
        left = op === '*' ? left * right : left / right;
      }
      return left;
    };
    
    const parseFactor = () => {
      if (tokens[pos] === '(') {
        pos++; // Skip (
        const val = parseExpr();
        pos++; // Skip )
        return val;
      }
      return parseFloat(tokens[pos++]) || 0;
    };
    
    return parseExpr();
  }
  
  // BFS cycle detection
  #hasCircularDep(cellId, newDeps) {
    const visited = new Set();
    const queue = [...newDeps];
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === cellId) return true; // Cycle found!
      if (visited.has(current)) continue;
      visited.add(current);
      
      const cellDeps = this.deps[current];
      if (cellDeps) {
        for (const dep of cellDeps) queue.push(dep);
      }
    }
    return false;
  }
  
  // Propagate change to all dependents (topological)
  #propagate(changedCell) {
    const visited = new Set();
    const queue = [changedCell];
    // BFS ensures topological-like order (parent before child)
    
    while (queue.length > 0) {
      const cellId = queue.shift();
      if (cellId !== changedCell) {
        // Recalculate this cell
        if (this.data[cellId]?.raw?.startsWith?.('=')) {
          this.data[cellId].computed = this.#evaluate(this.data[cellId].raw);
        }
      }
      
      // Queue dependents
      const dependents = this.rdeps[cellId];
      if (dependents) {
        for (const dep of dependents) {
          if (!visited.has(dep)) {
            visited.add(dep);
            queue.push(dep);
          }
        }
      }
    }
  }
}

// Usage:
const sheet = new Spreadsheet(100, 26);
sheet.setCell('A1', '10');
sheet.setCell('B1', '20');
sheet.setCell('C1', '=A1+B1');      // 30
sheet.setCell('D1', '=SUM(A1:C1)'); // 60
sheet.setCell('A1', '50');           // C1→70, D1→140 (auto-propagation)
```

---

## 🎯 Key Takeaways
- Oracle FE = **complex data grids + enterprise components + performance**
- **Spreadsheet engine**: dependency graph (DAG) + topological propagation + cycle detection
- **No eval()**: use recursive descent parser for safe arithmetic evaluation
- **Two dependency maps**: `deps` (who do I depend on) + `rdeps` (who depends on me) — bidirectional for O(1) lookups
- **Range expansion**: `A1:A5` → expand to all cells in range before evaluating
- **BFS propagation**: ensures parent cells recalculate before children
- **Cycle detection**: BFS from new deps — if reach original cell, it's circular
- Oracle values: **database-level correctness**, cloud infrastructure (OCI), JET framework knowledge

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Spreadsheet, DAG, Formula Parsing |
| JavaScript | Medium | Prototypes, Event Loop |
| System Design | Hard | OCI Dashboard, Caching, CDN |
| HM | Medium | Behavioral |
