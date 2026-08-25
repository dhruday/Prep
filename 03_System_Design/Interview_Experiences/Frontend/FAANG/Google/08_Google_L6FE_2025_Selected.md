# Google — Staff Frontend Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Staff Frontend Engineer |
| **Level** | L6 |
| **YOE** | 11 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | New York, NY |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Workspace — Docs |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + FE System Design + Googliness + Tech Leadership)

---

## Round 1: FE Coding — Build a Spreadsheet Formula Engine
**Duration:** 45 minutes

### Question: Implement a formula evaluator for a spreadsheet. Support cell references (A1, B2), basic arithmetic (+, -, *, /), and detect circular references.

```javascript
/**
 * Spreadsheet Formula Engine:
 * - Parse formulas: "=A1+B2*3"
 * - Resolve cell references recursively
 * - Detect circular dependencies (DFS cycle detection)
 * - Support: +, -, *, / operators with correct precedence
 * - Reactive: when a cell value changes, recompute dependents
 * 
 * Key: Build dependency graph, topological evaluation order.
 * 
 * Time: O(V + E) for evaluation where V = cells, E = references
 * Space: O(V + E) for dependency graph
 */
class SpreadsheetEngine {
  constructor() {
    this.cells = new Map();      // cellId → { raw, computed, formula, error }
    this.deps = new Map();       // cellId → Set<cellId it depends ON>
    this.rdeps = new Map();      // cellId → Set<cellId that depend on IT>
  }
  
  /**
   * Set a cell value. Can be:
   * - Number: "42"
   * - Text: "Hello"
   * - Formula: "=A1+B2*3"
   */
  setCell(cellId, rawValue) {
    const cell = this.cells.get(cellId) || {};
    cell.raw = rawValue;
    cell.error = null;
    
    // Remove old dependencies
    const oldDeps = this.deps.get(cellId) || new Set();
    for (const dep of oldDeps) {
      this.rdeps.get(dep)?.delete(cellId);
    }
    this.deps.set(cellId, new Set());
    
    if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
      cell.formula = rawValue.slice(1); // Remove '='
      
      // Extract cell references
      const refs = this.extractRefs(cell.formula);
      this.deps.set(cellId, new Set(refs));
      
      for (const ref of refs) {
        if (!this.rdeps.has(ref)) this.rdeps.set(ref, new Set());
        this.rdeps.get(ref).add(cellId);
      }
      
      // Check for circular dependency
      if (this.hasCycle(cellId)) {
        cell.error = '#CIRCULAR!';
        cell.computed = null;
        this.cells.set(cellId, cell);
        return;
      }
      
      // Evaluate formula
      try {
        cell.computed = this.evaluate(cell.formula);
      } catch (e) {
        cell.error = '#ERROR!';
        cell.computed = null;
      }
    } else {
      cell.formula = null;
      cell.computed = isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
    }
    
    this.cells.set(cellId, cell);
    
    // Recompute all cells that depend on this one (topological order)
    this.recomputeDependents(cellId);
  }
  
  getValue(cellId) {
    const cell = this.cells.get(cellId);
    if (!cell) return 0;
    if (cell.error) return cell.error;
    return cell.computed;
  }
  
  /**
   * Extract cell references from formula string.
   * Matches patterns like A1, B2, AA99, etc.
   */
  extractRefs(formula) {
    const refs = [];
    const regex = /[A-Z]+[0-9]+/g;
    let match;
    while ((match = regex.exec(formula)) !== null) {
      refs.push(match[0]);
    }
    return refs;
  }
  
  /**
   * Detect circular dependency using DFS 3-color algorithm.
   * WHITE=unvisited, GRAY=in-stack, BLACK=done
   */
  hasCycle(startCell) {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map();
    
    const dfs = (cell) => {
      color.set(cell, GRAY);
      
      const deps = this.deps.get(cell) || new Set();
      for (const dep of deps) {
        const depColor = color.get(dep) ?? WHITE;
        if (depColor === GRAY) return true;  // Back edge = cycle
        if (depColor === WHITE && dfs(dep)) return true;
      }
      
      color.set(cell, BLACK);
      return false;
    };
    
    return dfs(startCell);
  }
  
  /**
   * Evaluate a formula expression with operator precedence.
   * Recursive descent parser:
   *   expression → term (('+' | '-') term)*
   *   term → factor (('*' | '/') factor)*
   *   factor → number | cellRef | '(' expression ')'
   */
  evaluate(formula) {
    const tokens = this.tokenize(formula);
    let pos = 0;
    
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    
    const parseExpression = () => {
      let left = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseTerm();
        left = op === '+' ? left + right : left - right;
      }
      return left;
    };
    
    const parseTerm = () => {
      let left = parseFactor();
      while (peek() === '*' || peek() === '/') {
        const op = consume();
        const right = parseFactor();
        left = op === '*' ? left * right : left / right;
      }
      return left;
    };
    
    const parseFactor = () => {
      const token = peek();
      
      if (token === '(') {
        consume(); // '('
        const val = parseExpression();
        consume(); // ')'
        return val;
      }
      
      // Cell reference
      if (/^[A-Z]+[0-9]+$/.test(token)) {
        consume();
        const val = this.getValue(token);
        if (typeof val === 'string' && val.startsWith('#')) throw new Error(val);
        return Number(val) || 0;
      }
      
      // Negative number
      if (token === '-') {
        consume();
        return -parseFactor();
      }
      
      // Number
      consume();
      return Number(token);
    };
    
    return parseExpression();
  }
  
  /**
   * Tokenize formula into numbers, cell references, operators, parens.
   */
  tokenize(formula) {
    const tokens = [];
    let i = 0;
    
    while (i < formula.length) {
      if (formula[i] === ' ') { i++; continue; }
      
      // Operators and parens
      if ('+-*/()'.includes(formula[i])) {
        tokens.push(formula[i]);
        i++;
        continue;
      }
      
      // Cell reference: A1, B2, AA99
      if (/[A-Z]/.test(formula[i])) {
        let ref = '';
        while (i < formula.length && /[A-Z]/.test(formula[i])) ref += formula[i++];
        while (i < formula.length && /[0-9]/.test(formula[i])) ref += formula[i++];
        tokens.push(ref);
        continue;
      }
      
      // Number
      if (/[0-9.]/.test(formula[i])) {
        let num = '';
        while (i < formula.length && /[0-9.]/.test(formula[i])) num += formula[i++];
        tokens.push(num);
        continue;
      }
      
      i++; // Skip unknown chars
    }
    
    return tokens;
  }
  
  /**
   * Recompute all cells that depend on the changed cell.
   * BFS topological order to ensure correct evaluation sequence.
   */
  recomputeDependents(changedCell) {
    const visited = new Set();
    const queue = [...(this.rdeps.get(changedCell) || [])];
    
    while (queue.length > 0) {
      const cellId = queue.shift();
      if (visited.has(cellId)) continue;
      visited.add(cellId);
      
      const cell = this.cells.get(cellId);
      if (cell?.formula) {
        try {
          cell.computed = this.evaluate(cell.formula);
          cell.error = null;
        } catch (e) {
          cell.error = '#ERROR!';
          cell.computed = null;
        }
      }
      
      // Add reverse dependents to queue
      for (const dep of (this.rdeps.get(cellId) || [])) {
        queue.push(dep);
      }
    }
  }
}

// Usage:
const engine = new SpreadsheetEngine();
engine.setCell('A1', '10');
engine.setCell('B1', '20');
engine.setCell('C1', '=A1+B1*2');     // 10 + 40 = 50
engine.setCell('D1', '=C1/5');         // 50 / 5 = 10
engine.setCell('A1', '100');           // C1 auto-recomputes to 140, D1 to 28
```

---

## 🎯 Key Takeaways
- Google L6 FE = **Spreadsheet formula engine with recursive descent parser + circular dependency detection**
- **Recursive descent parser**: expression→term→factor precedence — handles `A1+B2*3` correctly (multiply first)
- **3-color cycle detection**: WHITE/GRAY/BLACK DFS — GRAY→GRAY edge = cycle = `#CIRCULAR!`
- **Dependency graph**: forward deps (what I depend on) + reverse deps (what depends on me) — for reactive recompute
- **Reactive recompute**: BFS from changed cell through reverse deps — topological order ensures correctness
- **Tokenizer**: separate pass to split formula into tokens — handles multi-char cell refs (AA99) and decimals
- **Cell reference regex**: `/[A-Z]+[0-9]+/g` — matches A1, B22, AA99 patterns
- Google FE L6 = **compiler/interpreter skills** — formula parsing, expression evaluation, dependency graphs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Very Hard | Recursive Descent Parser, Graph |
| Coding 2 | Hard | DSA |
| FE System Design | Very Hard | Spreadsheet Architecture |
| Googliness | Medium | Collaboration stories |
| Tech Leadership | Hard | Architecture decisions |
