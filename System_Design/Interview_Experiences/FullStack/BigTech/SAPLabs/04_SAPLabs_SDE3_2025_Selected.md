# SAPLabs — Senior FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Senior Developer |
| **Level** | SDE-3 |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |
| **Team** | SAP HANA Cloud |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: Coding — Implement a Column-Store Index with Compression
**Duration:** 60 minutes

### Question: Build an in-memory column-store index that supports dictionary encoding, run-length encoding, and fast aggregation queries (SUM, COUNT, AVG, MIN, MAX).

```java
import java.util.*;

/**
 * Column-Store Index with compression (SAP HANA-style):
 * 
 * Traditional row store: [row1: {name,age,salary}, row2: ...]
 * Column store: name_col: [A,A,B,C,C,C], age_col: [25,30,25,40,40,35]
 * 
 * Compression:
 * 1. Dictionary Encoding: map values to integer codes
 *    "Engineering" → 0, "Sales" → 1, "Marketing" → 2
 *    Column: [0, 0, 1, 2, 0, 1] instead of strings
 * 
 * 2. Run-Length Encoding: consecutive same values
 *    [0, 0, 0, 1, 1, 2] → [(0,3), (1,2), (2,1)]
 *    Especially effective on sorted columns
 * 
 * Benefits: cache-friendly scans, SIMD-like operations, compression
 */
class ColumnStore {
    
    static class Column<T> {
        String name;
        
        // Dictionary encoding
        List<T> dictionary;          // code → value
        Map<T, Integer> valueToCodes; // value → code
        int[] encodedData;            // Actual column data (dictionary codes)
        int rowCount;
        
        // Optional: Run-Length Encoding for sorted columns
        int[][] rleData;  // [[code, runLength], ...] — null if not RLE-compressed
        boolean isRLECompressed;
        
        Column(String name) {
            this.name = name;
            this.dictionary = new ArrayList<>();
            this.valueToCodes = new HashMap<>();
            this.isRLECompressed = false;
        }
        
        /**
         * Build column from raw values.
         * Step 1: Dictionary encode
         * Step 2: Optionally RLE compress if sorted
         */
        void build(List<T> values) {
            this.rowCount = values.size();
            this.encodedData = new int[values.size()];
            
            // Dictionary encoding
            for (int i = 0; i < values.size(); i++) {
                T val = values.get(i);
                Integer code = valueToCodes.get(val);
                if (code == null) {
                    code = dictionary.size();
                    dictionary.add(val);
                    valueToCodes.put(val, code);
                }
                encodedData[i] = code;
            }
        }
        
        /**
         * Apply RLE compression (effective on sorted columns).
         */
        void applyRLE() {
            if (encodedData.length == 0) return;
            
            List<int[]> runs = new ArrayList<>();
            int currentCode = encodedData[0];
            int runLength = 1;
            
            for (int i = 1; i < encodedData.length; i++) {
                if (encodedData[i] == currentCode) {
                    runLength++;
                } else {
                    runs.add(new int[]{currentCode, runLength});
                    currentCode = encodedData[i];
                    runLength = 1;
                }
            }
            runs.add(new int[]{currentCode, runLength});
            
            // Only use RLE if it actually compresses (fewer entries than original)
            if (runs.size() < encodedData.length * 0.7) {
                this.rleData = runs.toArray(new int[0][]);
                this.isRLECompressed = true;
            }
        }
        
        /**
         * Get original value at row index.
         */
        T getValue(int rowIndex) {
            if (isRLECompressed) {
                int pos = 0;
                for (int[] run : rleData) {
                    pos += run[1];
                    if (rowIndex < pos) {
                        return dictionary.get(run[0]);
                    }
                }
                throw new IndexOutOfBoundsException();
            }
            return dictionary.get(encodedData[rowIndex]);
        }
        
        /**
         * Scan column with predicate, return matching row indices.
         * Dictionary-aware: look up code first, then scan codes (integer comparison).
         */
        BitSet scan(java.util.function.Predicate<T> predicate) {
            // Find matching dictionary codes
            Set<Integer> matchingCodes = new HashSet<>();
            for (int code = 0; code < dictionary.size(); code++) {
                if (predicate.test(dictionary.get(code))) {
                    matchingCodes.add(code);
                }
            }
            
            BitSet result = new BitSet(rowCount);
            
            if (isRLECompressed) {
                int pos = 0;
                for (int[] run : rleData) {
                    if (matchingCodes.contains(run[0])) {
                        result.set(pos, pos + run[1]);
                    }
                    pos += run[1];
                }
            } else {
                for (int i = 0; i < encodedData.length; i++) {
                    if (matchingCodes.contains(encodedData[i])) {
                        result.set(i);
                    }
                }
            }
            
            return result;
        }
        
        double compressionRatio() {
            int originalSize = rowCount; // Assuming fixed-size values
            int compressedSize = isRLECompressed ? rleData.length * 2 : encodedData.length;
            compressedSize += dictionary.size(); // Dictionary overhead
            return (double) originalSize / compressedSize;
        }
    }
    
    private Map<String, Column<?>> columns = new LinkedHashMap<>();
    private int rowCount = 0;
    
    /**
     * Add a column to the store.
     */
    public <T> void addColumn(String name, List<T> values, boolean sorted) {
        Column<T> column = new Column<>(name);
        column.build(values);
        if (sorted) {
            column.applyRLE();
        }
        columns.put(name, column);
        rowCount = values.size();
    }
    
    /**
     * Aggregation query with filter.
     * 
     * SELECT SUM(salary) FROM table WHERE department = 'Engineering'
     * 
     * 1. Scan department column → BitSet of matching rows
     * 2. Aggregate salary column using matching BitSet
     * 
     * Very fast: scan + aggregate operate on compressed integer arrays.
     */
    @SuppressWarnings("unchecked")
    public double aggregate(String aggColumn, String aggType, 
                            String filterColumn, Object filterValue) {
        
        // Step 1: Get matching rows from filter column
        Column<Object> filterCol = (Column<Object>) columns.get(filterColumn);
        BitSet matchingRows = filterCol.scan(v -> v.equals(filterValue));
        
        // Step 2: Aggregate on target column
        Column<Number> aggCol = (Column<Number>) columns.get(aggColumn);
        
        double sum = 0;
        int count = 0;
        double min = Double.MAX_VALUE;
        double max = Double.MIN_VALUE;
        
        for (int i = matchingRows.nextSetBit(0); i >= 0; i = matchingRows.nextSetBit(i + 1)) {
            double val = aggCol.getValue(i).doubleValue();
            sum += val;
            count++;
            min = Math.min(min, val);
            max = Math.max(max, val);
        }
        
        return switch (aggType.toUpperCase()) {
            case "SUM" -> sum;
            case "COUNT" -> count;
            case "AVG" -> count > 0 ? sum / count : 0;
            case "MIN" -> min;
            case "MAX" -> max;
            default -> throw new IllegalArgumentException("Unknown aggregation: " + aggType);
        };
    }
}

// Usage:
ColumnStore store = new ColumnStore();
store.addColumn("department", Arrays.asList("Eng", "Eng", "Sales", "Eng", "Sales", "Mkt"), true);
store.addColumn("salary", Arrays.asList(120000, 130000, 90000, 150000, 95000, 85000), false);

double totalEngSalary = store.aggregate("salary", "SUM", "department", "Eng");
// → 400000 (120K + 130K + 150K)
```

---

## 🎯 Key Takeaways
- SAP Labs SDE-3 = **Column-store index with dictionary + RLE compression + aggregation**
- **Column store**: store data by column not row — cache-friendly for analytics (scan one column at a time)
- **Dictionary encoding**: map string values to integer codes — integer comparison is 10x faster than string
- **RLE on sorted columns**: `[(code, runLength)]` — dramatically compresses low-cardinality sorted data
- **BitSet scan**: evaluate predicate on dictionary first → scan integer codes → BitSet of matching rows
- **Aggregation with BitSet**: iterate set bits, apply aggregate function — near-optimal cache locality
- **Compression ratio check**: only use RLE if `runs.size() < encodedData.length * 0.7` — don't make it worse
- SAP = **database internals** — column stores, compression, query execution, memory management

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Technical 1 | Very Hard | Column Store, Compression |
| Technical 2 | Hard | System Design |
| HM | Medium | Culture Fit |
