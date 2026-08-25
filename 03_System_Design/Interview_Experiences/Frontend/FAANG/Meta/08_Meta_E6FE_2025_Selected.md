# Meta — L6 Frontend Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Staff Frontend Engineer |
| **Level** | E6 |
| **YOE** | 9 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | London, UK |
| **Source** | [Blind](https://www.teamblind.com) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Behavioral)

---

## Round 3: Frontend Coding — Build a Spreadsheet Formula Parser and Evaluator
**Duration:** 45 minutes

### Challenge: Build a formula parser that supports `=SUM(A1:A5)`, `=A1+B2*3`, cell references, ranges, and nested functions like `=SUM(A1, MAX(B1:B5))`.

```javascript
/**
 * Spreadsheet Formula Parser & Evaluator:
 * 
 * Grammar (simplified):
 *   formula    → '=' expression
 *   expression → term (('+' | '-') term)*
 *   term       → factor (('*' | '/') factor)*
 *   factor     → number | cellRef | funcCall | '(' expression ')'
 *   funcCall   → IDENT '(' argList ')'
 *   argList    → arg (',' arg)*
 *   arg        → range | expression
 *   range      → cellRef ':' cellRef
 *   cellRef    → [A-Z]+[0-9]+
 *   number     → [0-9]+('.'[0-9]+)?
 * 
 * Recursive descent parser — O(N) where N = formula length.
 */
class FormulaEvaluator {
  constructor(getCellValue) {
    // getCellValue(col, row) → number
    // col is 0-indexed (A=0, B=1, ...), row is 0-indexed
    this.getCellValue = getCellValue;
    this.functions = this.buildFunctions();
  }
  
  buildFunctions() {
    return {
      SUM: (args) => args.flat().reduce((a, b) => a + b, 0),
      AVG: (args) => {
        const flat = args.flat();
        return flat.length === 0 ? 0 : flat.reduce((a, b) => a + b, 0) / flat.length;
      },
      MAX: (args) => Math.max(...args.flat()),
      MIN: (args) => Math.min(...args.flat()),
      COUNT: (args) => args.flat().length,
      IF: (args) => args[0] ? args[1] : (args[2] ?? 0),
      ABS: (args) => Math.abs(args.flat()[0] ?? 0),
      ROUND: (args) => {
        const flat = args.flat();
        const decimals = flat[1] ?? 0;
        return Math.round(flat[0] * 10 ** decimals) / 10 ** decimals;
      },
    };
  }
  
  evaluate(formula) {
    if (!formula.startsWith('=')) return parseFloat(formula) || formula;
    
    this.tokens = this.tokenize(formula.substring(1));
    this.pos = 0;
    
    try {
      const result = this.parseExpression();
      return result;
    } catch (e) {
      return `#ERROR: ${e.message}`;
    }
  }
  
  // ---- Tokenizer ----
  
  tokenize(input) {
    const tokens = [];
    let i = 0;
    
    while (i < input.length) {
      if (input[i] === ' ') { i++; continue; }
      
      // Number
      if (/\d/.test(input[i])) {
        let num = '';
        while (i < input.length && /[\d.]/.test(input[i])) num += input[i++];
        tokens.push({ type: 'NUMBER', value: parseFloat(num) });
        continue;
      }
      
      // Identifier (cell ref or function name)
      if (/[A-Za-z]/.test(input[i])) {
        let ident = '';
        while (i < input.length && /[A-Za-z0-9]/.test(input[i])) ident += input[i++];
        
        // Distinguish: function (next char is '(') vs cell ref
        if (i < input.length && input[i] === '(') {
          tokens.push({ type: 'FUNC', value: ident.toUpperCase() });
        } else {
          tokens.push({ type: 'CELL', value: ident.toUpperCase() });
        }
        continue;
      }
      
      // Operators and punctuation
      const char = input[i++];
      switch (char) {
        case '+': tokens.push({ type: 'PLUS' }); break;
        case '-': tokens.push({ type: 'MINUS' }); break;
        case '*': tokens.push({ type: 'STAR' }); break;
        case '/': tokens.push({ type: 'SLASH' }); break;
        case '(': tokens.push({ type: 'LPAREN' }); break;
        case ')': tokens.push({ type: 'RPAREN' }); break;
        case ',': tokens.push({ type: 'COMMA' }); break;
        case ':': tokens.push({ type: 'COLON' }); break;
        case '>': 
          if (i < input.length && input[i] === '=') { tokens.push({ type: 'GTE' }); i++; }
          else tokens.push({ type: 'GT' });
          break;
        case '<':
          if (i < input.length && input[i] === '=') { tokens.push({ type: 'LTE' }); i++; }
          else tokens.push({ type: 'LT' });
          break;
        case '=': tokens.push({ type: 'EQ' }); break;
        default: throw new Error(`Unexpected character: ${char}`);
      }
    }
    
    tokens.push({ type: 'EOF' });
    return tokens;
  }
  
  // ---- Recursive Descent Parser ----
  
  peek() { return this.tokens[this.pos]; }
  advance() { return this.tokens[this.pos++]; }
  
  expect(type) {
    const token = this.advance();
    if (token.type !== type) throw new Error(`Expected ${type}, got ${token.type}`);
    return token;
  }
  
  parseExpression() {
    let left = this.parseTerm();
    
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.advance().type;
      const right = this.parseTerm();
      left = op === 'PLUS' ? left + right : left - right;
    }
    
    return left;
  }
  
  parseTerm() {
    let left = this.parseComparison();
    
    while (this.peek().type === 'STAR' || this.peek().type === 'SLASH') {
      const op = this.advance().type;
      const right = this.parseComparison();
      left = op === 'STAR' ? left * right : (right === 0 ? NaN : left / right);
    }
    
    return left;
  }
  
  parseComparison() {
    let left = this.parseFactor();
    
    if (['GT', 'GTE', 'LT', 'LTE', 'EQ'].includes(this.peek().type)) {
      const op = this.advance().type;
      const right = this.parseFactor();
      switch (op) {
        case 'GT': return left > right ? 1 : 0;
        case 'GTE': return left >= right ? 1 : 0;
        case 'LT': return left < right ? 1 : 0;
        case 'LTE': return left <= right ? 1 : 0;
        case 'EQ': return left === right ? 1 : 0;
      }
    }
    
    return left;
  }
  
  parseFactor() {
    const token = this.peek();
    
    // Unary minus
    if (token.type === 'MINUS') {
      this.advance();
      return -this.parseFactor();
    }
    
    // Number literal
    if (token.type === 'NUMBER') {
      this.advance();
      return token.value;
    }
    
    // Function call
    if (token.type === 'FUNC') {
      return this.parseFuncCall();
    }
    
    // Cell reference
    if (token.type === 'CELL') {
      this.advance();
      const { col, row } = this.parseCellRef(token.value);
      return this.getCellValue(col, row);
    }
    
    // Parenthesized expression
    if (token.type === 'LPAREN') {
      this.advance();
      const val = this.parseExpression();
      this.expect('RPAREN');
      return val;
    }
    
    throw new Error(`Unexpected token: ${token.type}`);
  }
  
  parseFuncCall() {
    const funcToken = this.advance(); // FUNC
    const funcName = funcToken.value;
    
    this.expect('LPAREN');
    
    const args = [];
    
    if (this.peek().type !== 'RPAREN') {
      args.push(this.parseArg());
      
      while (this.peek().type === 'COMMA') {
        this.advance(); // consume comma
        args.push(this.parseArg());
      }
    }
    
    this.expect('RPAREN');
    
    const func = this.functions[funcName];
    if (!func) throw new Error(`Unknown function: ${funcName}`);
    
    return func(args);
  }
  
  parseArg() {
    // Check if it's a range (CELL : CELL)
    if (this.peek().type === 'CELL') {
      const savedPos = this.pos;
      const firstCell = this.advance();
      
      if (this.peek().type === 'COLON') {
        this.advance(); // consume ':'
        const secondCell = this.expect('CELL');
        return this.expandRange(firstCell.value, secondCell.value);
      }
      
      // Not a range — backtrack and parse as expression
      this.pos = savedPos;
    }
    
    return this.parseExpression();
  }
  
  /**
   * Expand A1:C3 into flat array of cell values.
   */
  expandRange(startRef, endRef) {
    const start = this.parseCellRef(startRef);
    const end = this.parseCellRef(endRef);
    
    const values = [];
    for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
      for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
        values.push(this.getCellValue(c, r));
      }
    }
    return values;
  }
  
  /**
   * Parse cell reference string like "AB12" → { col: 27, row: 11 }
   * Column: A=0, B=1, ..., Z=25, AA=26, AB=27, ...
   * Row: 1-indexed in ref, convert to 0-indexed
   */
  parseCellRef(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid cell reference: ${ref}`);
    
    let col = 0;
    for (const ch of match[1]) {
      col = col * 26 + (ch.charCodeAt(0) - 64);
    }
    col -= 1; // 0-indexed
    
    const row = parseInt(match[2], 10) - 1; // 0-indexed
    return { col, row };
  }
}

// Usage:
// const data = [[10, 20], [30, 40], [50, 60]]; // 3 rows × 2 cols
// const evaluator = new FormulaEvaluator((col, row) => data[row]?.[col] ?? 0);
// evaluator.evaluate('=SUM(A1:A3)');    // 90
// evaluator.evaluate('=A1+B2*3');       // 10 + 40*3 = 130
// evaluator.evaluate('=SUM(A1, MAX(B1:B3))'); // 10 + 60 = 70
```

---

## 🎯 Key Takeaways
- Meta E6 FE = **Spreadsheet formula parser — recursive descent parser, tokenizer, cell references**
- **Recursive descent**: `expression → term → factor → number|cell|func|parens` — mirrors operator precedence
- **Tokenizer**: single-pass, classifies FUNC vs CELL by lookahead for `(`
- **Range expansion**: `A1:C3` → iterate col/row bounds, collect all values as flat array
- **Column parsing**: base-26 conversion — `A=1, Z=26, AA=27, AB=28` — subtract 1 for 0-indexing
- **Nested functions**: `SUM(A1, MAX(B1:B5))` — `parseArg` checks for range pattern first, fallback to expression
- **Comparison operators**: `>`, `>=`, `<`, `<=`, `=` return 1/0 (truthy/falsy) — used by `IF` function
- **Division by zero**: return `NaN` not throw — matches spreadsheet behavior
- Meta FE = **complex parsing, state management, formula evaluation** — expect recursive descent

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | JS Coding |
| Coding 1 | Hard | Data Structures |
| Coding 2 (this) | Very Hard | Parser, Tokenizer, Recursion |
| System Design | Very Hard | Facebook Feed |
| Behavioral | Hard | Meta Culture |
