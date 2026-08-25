# 499 – Google Sheets Frontend System Design

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Google Sheets is a collaborative spreadsheet that tests **Canvas-based grid rendering** (millions of cells without DOM), **cell formula evaluation** (dependency graph, topological sort), **CRDT/OT collaboration** (concurrent cell edits without conflicts), **virtual scrolling** (smooth scroll across 1M+ rows/10K+ columns), **clipboard and selection** (range selection, copy/paste, fill-drag), and **conditional formatting** (rule evaluation across ranges). The key challenge is rendering a virtually infinite grid at 60fps while evaluating formulas across dependent cells in real-time.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Google Sheets Client                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Menu Bar: File | Edit | View | Insert | Format | Data    ││
│  ├──────────────────────────────────────────────────────────┤│
│  │ Formula Bar:  fx  =SUM(A1:A100) * B2                    ││
│  ├──────────────────────────────────────────────────────────┤│
│  │    │ A      │ B      │ C      │ D      │ E      │ ...  ││
│  │ ───┼────────┼────────┼────────┼────────┼────────┼─────  ││
│  │  1 │ Name   │ Qty    │ Price  │=B1*C1  │        │       ││
│  │  2 │ Widget │ 100    │ 9.99   │ 999    │        │       ││
│  │  3 │ Gadget │ 50     │ 24.99  │ 1249.5 │        │       ││
│  │  4 │        │        │        │=SUM(D2 │        │       ││
│  │  . │        │        │        │ :D3)   │        │       ││
│  │  . │ ████████████████ ← Selection highlight     │       ││
│  │    │(Canvas rendering — no DOM cells)            │       ││
│  ├──────────────────────────────────────────────────────────┤│
│  │ Sheet1 | Sheet2 | + (tabs)   │ 100% zoom │ Σ=2248.5    ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface Spreadsheet {
  id: string;
  sheets: Sheet[];
  namedRanges: Map<string, CellRange>;
}

interface Sheet {
  id: string;
  name: string;
  cells: Map<string, Cell>;      // sparse — only non-empty cells stored
  rowCount: number;              // default 1000, grows on demand
  colCount: number;              // default 26 (A-Z), grows on demand
  rowHeights: Map<number, number>;   // overrides for resized rows
  colWidths: Map<number, number>;    // overrides for resized columns
  defaultRowHeight: number;      // 21px
  defaultColWidth: number;       // 100px
  mergedCells: MergedRange[];
  conditionalFormats: ConditionalRule[];
  frozenRows: number;
  frozenCols: number;
}

interface Cell {
  raw: string;                   // what the user typed: "=SUM(A1:A3)"
  value: CellValue;              // computed: 42
  type: 'string' | 'number' | 'boolean' | 'error' | 'formula';
  format: CellFormat;
  note?: string;                 // cell comment
}

type CellValue = string | number | boolean | CellError;

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  numberFormat?: string;         // "#,##0.00", "0%", "MMM DD, YYYY"
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  borders?: CellBorders;
}
```

### Canvas Grid Renderer

```typescript
class GridRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sheet: Sheet;

  // Viewport state
  private scrollTop = 0;
  private scrollLeft = 0;
  private viewportWidth: number;
  private viewportHeight: number;

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

    // Calculate visible row/col range
    const { startRow, endRow, startCol, endCol } = this.getVisibleRange();

    // ──── 1. Draw cell backgrounds ────
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = this.sheet.cells.get(cellKey(row, col));
        const rect = this.getCellRect(row, col);

        if (cell?.format.backgroundColor) {
          ctx.fillStyle = cell.format.backgroundColor;
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
      }
    }

    // ──── 2. Draw grid lines ────
    ctx.strokeStyle = '#e2e2e3';
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let row = startRow; row <= endRow + 1; row++) {
      const y = this.getRowTop(row) - this.scrollTop;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5); // +0.5 for crisp 1px lines
      ctx.lineTo(this.viewportWidth, y + 0.5);
      ctx.stroke();
    }

    // Vertical lines
    for (let col = startCol; col <= endCol + 1; col++) {
      const x = this.getColLeft(col) - this.scrollLeft;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, this.viewportHeight);
      ctx.stroke();
    }

    // ──── 3. Draw cell text ────
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = this.sheet.cells.get(cellKey(row, col));
        if (!cell || cell.value === '') continue;

        const rect = this.getCellRect(row, col);
        const fmt = cell.format;

        ctx.font = `${fmt.bold ? 'bold ' : ''}${fmt.italic ? 'italic ' : ''}${fmt.fontSize ?? 13}px ${fmt.fontFamily ?? 'Arial'}`;
        ctx.fillStyle = fmt.textColor ?? '#000';
        ctx.textAlign = fmt.horizontalAlign ?? (typeof cell.value === 'number' ? 'right' : 'left');
        ctx.textBaseline = 'middle';

        const text = this.formatCellValue(cell);
        const x = fmt.horizontalAlign === 'right'
          ? rect.x + rect.width - 4
          : rect.x + 4;
        const y = rect.y + rect.height / 2;

        // Clip text to cell bounds
        ctx.save();
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
        ctx.clip();
        ctx.fillText(text, x, y);
        ctx.restore();
      }
    }

    // ──── 4. Draw selection ────
    this.renderSelection();

    // ──── 5. Draw frozen row/col separator ────
    this.renderFrozenPanes();
  }

  // Calculate visible range for viewport culling
  private getVisibleRange() {
    let startRow = 0, accY = 0;
    while (accY < this.scrollTop && startRow < this.sheet.rowCount) {
      accY += this.getRowHeight(startRow);
      startRow++;
    }

    let endRow = startRow;
    while (accY < this.scrollTop + this.viewportHeight && endRow < this.sheet.rowCount) {
      accY += this.getRowHeight(endRow);
      endRow++;
    }

    // Similar for columns...
    let startCol = 0, accX = 0;
    while (accX < this.scrollLeft && startCol < this.sheet.colCount) {
      accX += this.getColWidth(startCol);
      startCol++;
    }

    let endCol = startCol;
    while (accX < this.scrollLeft + this.viewportWidth && endCol < this.sheet.colCount) {
      accX += this.getColWidth(endCol);
      endCol++;
    }

    return { startRow, endRow: Math.min(endRow + 2, this.sheet.rowCount - 1),
             startCol, endCol: Math.min(endCol + 2, this.sheet.colCount - 1) };
  }

  private getRowHeight(row: number): number {
    return this.sheet.rowHeights.get(row) ?? this.sheet.defaultRowHeight;
  }

  private getColWidth(col: number): number {
    return this.sheet.colWidths.get(col) ?? this.sheet.defaultColWidth;
  }
}
```

### Formula Engine

```typescript
// ──── Cell Dependency Graph + Topological Evaluation ────
class FormulaEngine {
  private sheet: Sheet;
  private dependencies: Map<string, Set<string>> = new Map(); // cell → cells it depends on
  private dependents: Map<string, Set<string>> = new Map();   // cell → cells that depend on it

  parseAndEvaluate(cellRef: string, formula: string): CellValue {
    const ast = parseFormula(formula); // "=SUM(A1:A3)" → AST
    const refs = extractReferences(ast); // ["A1", "A2", "A3"]

    // Update dependency graph
    this.dependencies.set(cellRef, new Set(refs));
    for (const ref of refs) {
      if (!this.dependents.has(ref)) this.dependents.set(ref, new Set());
      this.dependents.get(ref)!.add(cellRef);
    }

    // Check for circular dependency
    if (this.hasCircularDependency(cellRef)) {
      return { error: '#CIRCULAR!' };
    }

    return this.evaluate(ast);
  }

  // When a cell changes, re-evaluate all dependents (topological order)
  onCellChange(changedRef: string) {
    const toReeval = this.getTopologicalOrder(changedRef);

    for (const ref of toReeval) {
      const cell = this.sheet.cells.get(ref);
      if (cell?.type === 'formula') {
        const ast = parseFormula(cell.raw);
        cell.value = this.evaluate(ast);
      }
    }
  }

  // BFS topological sort of dependents
  private getTopologicalOrder(startRef: string): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const queue = [startRef];

    while (queue.length > 0) {
      const ref = queue.shift()!;
      if (visited.has(ref)) continue;
      visited.add(ref);

      const deps = this.dependents.get(ref);
      if (deps) {
        for (const dep of deps) {
          queue.push(dep);
        }
      }
      if (ref !== startRef) order.push(ref);
    }

    return order;
  }

  private hasCircularDependency(startRef: string): boolean {
    const visited = new Set<string>();
    const stack = [...(this.dependencies.get(startRef) ?? [])];

    while (stack.length > 0) {
      const ref = stack.pop()!;
      if (ref === startRef) return true;
      if (visited.has(ref)) continue;
      visited.add(ref);

      const deps = this.dependencies.get(ref);
      if (deps) stack.push(...deps);
    }
    return false;
  }

  private evaluate(ast: FormulaAST): CellValue {
    switch (ast.type) {
      case 'number': return ast.value;
      case 'string': return ast.value;
      case 'reference': {
        const cell = this.sheet.cells.get(ast.ref);
        return cell?.value ?? 0;
      }
      case 'function': {
        switch (ast.name) {
          case 'SUM': {
            const values = this.resolveRange(ast.args[0]);
            return values.reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
          }
          case 'AVERAGE': {
            const values = this.resolveRange(ast.args[0]);
            const nums = values.filter(v => typeof v === 'number') as number[];
            return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
          }
          case 'IF': {
            const condition = this.evaluate(ast.args[0]);
            return condition ? this.evaluate(ast.args[1]) : this.evaluate(ast.args[2]);
          }
          // VLOOKUP, COUNTIF, INDEX, MATCH, etc.
        }
      }
      case 'binary': {
        const left = this.evaluate(ast.left) as number;
        const right = this.evaluate(ast.right) as number;
        switch (ast.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right === 0 ? { error: '#DIV/0!' } : left / right;
        }
      }
    }
    return { error: '#ERROR!' };
  }
}
```

### Selection, Copy/Paste, Clipboard

```typescript
// ──── Range Selection ────
interface SelectionState {
  anchor: CellRef;               // where selection started
  focus: CellRef;                // where selection currently extends to
  ranges: CellRange[];           // for multi-select (Ctrl+click)
}

function useSelectionHandler(canvas: HTMLCanvasElement, sheet: Sheet) {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  // Map pixel (clientX, clientY) to cell (row, col)
  const pixelToCell = (clientX: number, clientY: number): CellRef => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left + scrollLeft;
    const y = clientY - rect.top + scrollTop;

    let col = 0, accX = 0;
    while (accX < x && col < sheet.colCount) {
      accX += getColWidth(col);
      col++;
    }
    col = Math.max(0, col - 1);

    let row = 0, accY = 0;
    while (accY < y && row < sheet.rowCount) {
      accY += getRowHeight(row);
      row++;
    }
    row = Math.max(0, row - 1);

    return { row, col };
  };

  // Copy selection to clipboard
  const handleCopy = async () => {
    if (!selection) return;
    const range = getSelectionRange(selection);
    const tsv = rangeToCopiedText(sheet, range); // Tab-separated values

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([tsv], { type: 'text/plain' }),
        'text/html': new Blob([rangeToHTML(sheet, range)], { type: 'text/html' }),
      }),
    ]);
  };

  // Paste from clipboard
  const handlePaste = async () => {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (item.types.includes('text/html')) {
        const blob = await item.getType('text/html');
        const html = await blob.text();
        pasteFromHTML(html, selection!.anchor);
      } else {
        const blob = await item.getType('text/plain');
        const text = await blob.text();
        pasteFromTSV(text, selection!.anchor);
      }
    }
  };
}
```

### Real-Time Collaboration (OT)

```typescript
// Google Sheets uses OT (Operational Transform), not CRDT
// OT operations for spreadsheet:

type SheetOperation =
  | { type: 'SET_CELL'; ref: string; value: string; format?: CellFormat }
  | { type: 'INSERT_ROW'; index: number; count: number }
  | { type: 'DELETE_ROW'; index: number; count: number }
  | { type: 'INSERT_COL'; index: number; count: number }
  | { type: 'RESIZE_ROW'; index: number; height: number }
  | { type: 'MERGE_CELLS'; range: CellRange }
  | { type: 'CONDITIONAL_FORMAT'; rule: ConditionalRule };

// OT transform: when two users edit simultaneously
// User A: SET_CELL A1 = "hello"
// User B: INSERT_ROW at row 0  (pushes everything down)
// Transform A against B: SET_CELL A2 = "hello" (reference shifted)

function transformOperation(op: SheetOperation, against: SheetOperation): SheetOperation {
  if (op.type === 'SET_CELL' && against.type === 'INSERT_ROW') {
    const [col, row] = parseCellRef(op.ref);
    if (row >= against.index) {
      return { ...op, ref: cellRef(col, row + against.count) };
    }
  }
  // ... many more transform cases
  return op;
}
```

### Anti-Patterns

- ❌ DOM-based cells (one `<td>` per cell) → millions of DOM nodes = browser crash. Use Canvas.
- ❌ Evaluating all formulas on every change → only re-evaluate dependents (topological order).
- ❌ Loading entire spreadsheet data at once → load visible viewport + buffer, lazy-load rest.
- ❌ No circular dependency detection → infinite loop. Check before evaluating.
- ❌ Plain text clipboard only → lose formatting. Use `text/html` ClipboardItem for rich paste.
- ❌ Immediate re-render on every keystroke → batch cell edits with requestAnimationFrame.

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Google Sheets
- Canvas-based rendering (migrated from HTML tables)
- OT collaboration via Google's own infra
- 10M cells per sheet limit
- Web Workers for formula evaluation

### Microsoft Excel Online
- Canvas rendering with OfficeJS API
- Co-authoring via Fluid Framework (CRDT-based)
- Complex formula engine with 400+ built-in functions

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design Google Sheets around four core systems: Canvas grid renderer, formula engine, selection/clipboard, and collaboration.*

*Grid: Canvas-based — no DOM cells. The renderer calculates the visible row/column range from scroll position, then draws backgrounds, grid lines, and text for only visible cells. Sparse storage: only non-empty cells exist in the Map. Default row height 21px, column width 100px, with override maps for resized rows/columns.*

*Formulas: AST parser converts '=SUM(A1:A3)' into a tree. Dependency graph tracks which cells depend on which. When a cell changes, BFS topological sort finds all dependents and re-evaluates them in order. Circular dependency detection via DFS before evaluation.*

*Selection: Mouse events mapped to cell coordinates via cumulative row/col offset calculation. Copy writes both 'text/plain' (TSV) and 'text/html' (formatted) to clipboard API. Paste reads HTML-first for rich paste, TSV as fallback.*

*Collaboration: Operational Transform for concurrent edits. INSERT_ROW operations transform cell references in pending SET_CELL operations (shift row indices)."*

────────────────────────────────────────────────────────────

## 5. ✅ WHY & HOW SUMMARY

**Why:** Google Sheets is the ultimate canvas rendering + formula engine question — tests Canvas drawing, graph algorithms (topological sort, cycle detection), clipboard API, and real-time collaboration.
**How:** Canvas grid → sparse cell Map → AST formula parser → dependency graph with topological eval → OT collaboration → Clipboard API with text/html → viewport culling for performance.
**Companies:** Google (Sheets), Microsoft (Excel Online), Notion (tables), Airtable, Smartsheet.
