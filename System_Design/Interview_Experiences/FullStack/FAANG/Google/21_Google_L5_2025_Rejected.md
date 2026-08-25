# Google — L5 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Software Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site)
- **Timeline:** 5 weeks
- **Format:** Virtual

## Round 3: Coding — Design a Spreadsheet Formula Evaluator

### Problem
Implement a spreadsheet engine:
- Parse cell references (A1, B2) and formulas (=A1+B2*3)
- Support basic arithmetic (+, -, *, /) with operator precedence
- Detect circular references
- Lazy evaluation — only compute when a cell is read
- Support SUM, AVG, MIN, MAX over ranges (A1:A5)

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.regex.*;

public class SpreadsheetEngine {

    enum CellType { NUMBER, TEXT, FORMULA }

    static class Cell {
        String rawContent;
        CellType type;
        Object cachedValue;
        boolean dirty = true;
        Set<String> dependsOn = new HashSet<>(); // cells this formula references

        Cell(String content) {
            this.rawContent = content;
            if (content.startsWith("=")) {
                this.type = CellType.FORMULA;
            } else {
                try {
                    this.cachedValue = Double.parseDouble(content);
                    this.type = CellType.NUMBER;
                    this.dirty = false;
                } catch (NumberFormatException e) {
                    this.cachedValue = content;
                    this.type = CellType.TEXT;
                    this.dirty = false;
                }
            }
        }
    }

    private final Map<String, Cell> cells = new HashMap<>();
    // Reverse dependency: if A1 changes, who needs recalculation?
    private final Map<String, Set<String>> dependents = new HashMap<>();

    public void setCell(String ref, String content) {
        ref = ref.toUpperCase();
        Cell oldCell = cells.get(ref);

        // Remove old dependencies
        if (oldCell != null) {
            for (String dep : oldCell.dependsOn) {
                dependents.getOrDefault(dep, Collections.emptySet()).remove(ref);
            }
        }

        Cell cell = new Cell(content);
        cells.put(ref, cell);

        if (cell.type == CellType.FORMULA) {
            cell.dependsOn = extractReferences(content);
            for (String dep : cell.dependsOn) {
                dependents.computeIfAbsent(dep, k -> new HashSet<>()).add(ref);
            }
        }

        // Invalidate this cell and all dependents
        invalidate(ref);
    }

    public Object getCell(String ref) {
        ref = ref.toUpperCase();
        Cell cell = cells.get(ref);
        if (cell == null) return 0.0;

        if (cell.dirty) {
            evaluate(ref, new HashSet<>());
        }
        return cell.cachedValue;
    }

    private void evaluate(String ref, Set<String> evaluating) {
        Cell cell = cells.get(ref);
        if (cell == null) return;
        if (!cell.dirty) return;

        // Circular reference detection
        if (evaluating.contains(ref)) {
            cell.cachedValue = "#CIRCULAR!";
            cell.dirty = false;
            return;
        }

        evaluating.add(ref);

        if (cell.type == CellType.FORMULA) {
            // Ensure dependencies are evaluated first
            for (String dep : cell.dependsOn) {
                Cell depCell = cells.get(dep);
                if (depCell != null && depCell.dirty) {
                    evaluate(dep, evaluating);
                }
            }
            cell.cachedValue = evaluateFormula(cell.rawContent.substring(1));
        }

        cell.dirty = false;
        evaluating.remove(ref);
    }

    private void invalidate(String ref) {
        Cell cell = cells.get(ref);
        if (cell != null) cell.dirty = true;

        // Cascade invalidation to dependents
        Set<String> deps = dependents.getOrDefault(ref, Collections.emptySet());
        for (String dep : deps) {
            Cell depCell = cells.get(dep);
            if (depCell != null && !depCell.dirty) {
                invalidate(dep);
            }
        }
    }

    /**
     * Evaluate a formula expression with operator precedence.
     * Supports: +, -, *, /, cell references (A1), numbers, functions (SUM, AVG, MIN, MAX)
     */
    private double evaluateFormula(String expr) {
        try {
            return parseExpression(new FormulaParser(expr));
        } catch (Exception e) {
            return Double.NaN;
        }
    }

    // Recursive descent parser with operator precedence
    static class FormulaParser {
        final String expr;
        int pos = 0;

        FormulaParser(String expr) { this.expr = expr.replaceAll("\\s+", ""); }
        char peek() { return pos < expr.length() ? expr.charAt(pos) : '\0'; }
        char next() { return expr.charAt(pos++); }
        boolean hasMore() { return pos < expr.length(); }
    }

    private double parseExpression(FormulaParser p) {
        double left = parseTerm(p);
        while (p.hasMore() && (p.peek() == '+' || p.peek() == '-')) {
            char op = p.next();
            double right = parseTerm(p);
            left = op == '+' ? left + right : left - right;
        }
        return left;
    }

    private double parseTerm(FormulaParser p) {
        double left = parseFactor(p);
        while (p.hasMore() && (p.peek() == '*' || p.peek() == '/')) {
            char op = p.next();
            double right = parseFactor(p);
            left = op == '*' ? left * right : left / right;
        }
        return left;
    }

    private double parseFactor(FormulaParser p) {
        if (p.peek() == '(') {
            p.next(); // consume (
            double val = parseExpression(p);
            if (p.peek() == ')') p.next();
            return val;
        }

        if (p.peek() == '-') {
            p.next();
            return -parseFactor(p);
        }

        // Function call: SUM(A1:A5) or AVG(...)
        if (Character.isLetter(p.peek())) {
            int start = p.pos;
            while (p.hasMore() && Character.isLetterOrDigit(p.peek())) p.pos++;
            String token = p.expr.substring(start, p.pos);

            if (p.peek() == '(') {
                return parseFunction(token.toUpperCase(), p);
            }

            // Cell reference
            return cellToDouble(token.toUpperCase());
        }

        // Number literal
        int start = p.pos;
        while (p.hasMore() && (Character.isDigit(p.peek()) || p.peek() == '.')) p.pos++;
        return Double.parseDouble(p.expr.substring(start, p.pos));
    }

    private double parseFunction(String funcName, FormulaParser p) {
        p.next(); // consume (
        int start = p.pos;
        int depth = 1;
        while (p.hasMore() && depth > 0) {
            if (p.peek() == '(') depth++;
            if (p.peek() == ')') depth--;
            if (depth > 0) p.pos++;
        }
        String args = p.expr.substring(start, p.pos);
        p.next(); // consume )

        // Parse range (A1:A5)
        List<Double> values = new ArrayList<>();
        if (args.contains(":")) {
            String[] parts = args.split(":");
            values = getRangeValues(parts[0].trim(), parts[1].trim());
        } else {
            // Comma-separated args
            for (String arg : args.split(",")) {
                values.add(evaluateFormula(arg.trim()));
            }
        }

        return switch (funcName) {
            case "SUM" -> values.stream().mapToDouble(Double::doubleValue).sum();
            case "AVG" -> values.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            case "MIN" -> values.stream().mapToDouble(Double::doubleValue).min().orElse(0);
            case "MAX" -> values.stream().mapToDouble(Double::doubleValue).max().orElse(0);
            case "COUNT" -> (double) values.size();
            default -> Double.NaN;
        };
    }

    private List<Double> getRangeValues(String from, String to) {
        int fromCol = from.charAt(0) - 'A';
        int fromRow = Integer.parseInt(from.substring(1));
        int toCol = to.charAt(0) - 'A';
        int toRow = Integer.parseInt(to.substring(1));

        List<Double> values = new ArrayList<>();
        for (int c = fromCol; c <= toCol; c++) {
            for (int r = fromRow; r <= toRow; r++) {
                String ref = "" + (char) ('A' + c) + r;
                values.add(cellToDouble(ref));
            }
        }
        return values;
    }

    private double cellToDouble(String ref) {
        Object val = getCell(ref);
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); }
        catch (Exception e) { return 0.0; }
    }

    private Set<String> extractReferences(String formula) {
        Set<String> refs = new HashSet<>();
        Matcher m = Pattern.compile("[A-Z]\\d+").matcher(formula.toUpperCase());
        while (m.find()) refs.add(m.group());

        // Expand ranges
        Matcher range = Pattern.compile("([A-Z]\\d+):([A-Z]\\d+)").matcher(formula.toUpperCase());
        while (range.find()) {
            String from = range.group(1), to = range.group(2);
            int fromCol = from.charAt(0) - 'A', fromRow = Integer.parseInt(from.substring(1));
            int toCol = to.charAt(0) - 'A', toRow = Integer.parseInt(to.substring(1));
            for (int c = fromCol; c <= toCol; c++)
                for (int r = fromRow; r <= toRow; r++)
                    refs.add("" + (char) ('A' + c) + r);
        }
        return refs;
    }

    public static void main(String[] args) {
        SpreadsheetEngine ss = new SpreadsheetEngine();

        ss.setCell("A1", "10");
        ss.setCell("A2", "20");
        ss.setCell("A3", "30");
        ss.setCell("B1", "=A1+A2*2");      // 10 + 20*2 = 50
        ss.setCell("B2", "=SUM(A1:A3)");   // 60
        ss.setCell("B3", "=AVG(A1:A3)");   // 20
        ss.setCell("C1", "=B1+B2");        // 50+60=110

        System.out.println("B1 = " + ss.getCell("B1")); // 50.0
        System.out.println("B2 = " + ss.getCell("B2")); // 60.0
        System.out.println("B3 = " + ss.getCell("B3")); // 20.0
        System.out.println("C1 = " + ss.getCell("C1")); // 110.0

        // Update triggers cascade
        System.out.println("\n--- Update A1 to 100 ---");
        ss.setCell("A1", "100");
        System.out.println("B1 = " + ss.getCell("B1")); // 100+20*2=140
        System.out.println("B2 = " + ss.getCell("B2")); // 150
        System.out.println("C1 = " + ss.getCell("C1")); // 140+150=290

        // Circular reference detection
        System.out.println("\n--- Circular Reference ---");
        ss.setCell("D1", "=D2+1");
        ss.setCell("D2", "=D1+1");
        System.out.println("D1 = " + ss.getCell("D1")); // #CIRCULAR!
    }
}
```

## 🎯 Key Takeaways
- Google DSA/design hybrids test **parser + graph** combos — spreadsheets, compilers
- Recursive descent parser: `expression → term (+/- term)* → factor (*/÷ factor)* → atom`
- Lazy evaluation with dirty flag avoids redundant computation
- Dependency graph + reverse dependency map enables efficient cascade invalidation
- Circular reference detection using visiting set during evaluation
- Range expansion (A1:A5) resolves to individual cell references in the dependency set

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Trees, BFS |
| On-site 1 | Hard | Recursive Descent Parser |
| On-site 2 | Hard | Graph DAG, Topological Evaluation |
| System Design | Hard | Collaborative Spreadsheet |
| Behavioral | Medium | Googleyness, Leadership |
