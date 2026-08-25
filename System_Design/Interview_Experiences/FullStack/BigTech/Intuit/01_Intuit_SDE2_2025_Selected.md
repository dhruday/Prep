# Intuit — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Intuit |
| **Role** | Software Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/intuit-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Craft Demo + 2 Technical + Values)
- **Timeline:** 2 weeks
- **Format:** Virtual
- **Note:** Intuit has a unique "Craft Demo" round where you present a past project. Very values-driven culture (Customer Obsession, Innovation, Integrity).

---

## Round 1: Craft Demo
**Duration:** 60 minutes | **Panel:** 2 engineers + PM

### Questions Asked
1. **Present a project you're proud of — architecture, trade-offs, impact**
2. Follow-up: "What would you do differently?" "How did you measure success?"

### 💡 Interview-Ready Answer — How to Ace Craft Demo

> Structure your presentation:
> 1. **Problem (2 min):** Customer pain point with data. "50% of small businesses abandoned tax filing midway"
> 2. **Approach (5 min):** Architecture diagram, why this approach over alternatives
> 3. **Deep Dive (10 min):** One technically challenging part — show code, system design, trade-offs
> 4. **Impact (3 min):** Metrics. "Reduced abandonment by 35%, saved $2M in support costs"
> 5. **Retrospective (5 min):** What you'd improve. Shows growth mindset.
>
> **Tip:** Intuit loves when you connect technical decisions to customer outcomes.

---

## Round 2: Technical — DSA
**Duration:** 60 minutes | **Interviewer:** Staff Engineer

### Questions Asked
1. **Design HashMap from scratch** (LeetCode 706)
2. **Word Break** (LeetCode 139)
3. **Find Median from Data Stream** (LeetCode 295)

### 💡 Interview-Ready Answer — Design HashMap

```java
class MyHashMap {
    private static final int SIZE = 1024;
    private LinkedList<int[]>[] buckets;
    
    public MyHashMap() {
        buckets = new LinkedList[SIZE];
    }
    
    private int hash(int key) {
        return key % SIZE; // Simple modulo hash
    }
    
    public void put(int key, int value) {
        int idx = hash(key);
        if (buckets[idx] == null) buckets[idx] = new LinkedList<>();
        
        for (int[] pair : buckets[idx]) {
            if (pair[0] == key) {
                pair[1] = value;
                return;
            }
        }
        buckets[idx].add(new int[]{key, value});
    }
    
    public int get(int key) {
        int idx = hash(key);
        if (buckets[idx] == null) return -1;
        
        for (int[] pair : buckets[idx]) {
            if (pair[0] == key) return pair[1];
        }
        return -1;
    }
    
    public void remove(int key) {
        int idx = hash(key);
        if (buckets[idx] == null) return;
        
        buckets[idx].removeIf(pair -> pair[0] == key);
    }
}
```

**Follow-up: "Add dynamic resizing"**
```java
// When load factor > 0.75, double the bucket array
private int size = 0;

public void put(int key, int value) {
    // ... existing put logic ...
    size++;
    
    if ((double) size / buckets.length > 0.75) {
        resize();
    }
}

private void resize() {
    LinkedList<int[]>[] oldBuckets = buckets;
    buckets = new LinkedList[oldBuckets.length * 2];
    size = 0;
    
    for (LinkedList<int[]> bucket : oldBuckets) {
        if (bucket != null) {
            for (int[] pair : bucket) {
                put(pair[0], pair[1]); // rehash into new buckets
            }
        }
    }
}
```

### 💡 Interview-Ready Answer — Find Median from Data Stream

```java
class MedianFinder {
    // Max-heap for lower half, Min-heap for upper half
    PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    
    public void addNum(int num) {
        maxHeap.offer(num);
        minHeap.offer(maxHeap.poll()); // balance: push largest of lower half to upper
        
        // maxHeap should be same size or 1 larger than minHeap
        if (minHeap.size() > maxHeap.size()) {
            maxHeap.offer(minHeap.poll());
        }
    }
    
    public double findMedian() {
        if (maxHeap.size() > minHeap.size()) {
            return maxHeap.peek();
        }
        return (maxHeap.peek() + minHeap.peek()) / 2.0;
    }
}
```
**Time:** O(log n) per add, O(1) for median. **Space:** O(n)

---

## Round 3: System Design
**Duration:** 60 minutes | **Interviewer:** Principal Engineer

### Questions Asked
1. **Design a Tax Calculation Engine** (like TurboTax)
   - Handle different tax brackets, deductions, state taxes, carry-forward losses, real-time calculation as user fills form

### 💡 Interview-Ready Answer

```
Tax Calculation Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Frontend (React)                                             │
│  - Multi-step form wizard                                    │
│  - Real-time tax estimate updates as fields change           │
│  - Auto-save every 30 seconds                                │
│  - Client-side validation (SSN format, date ranges)          │
└────────────────────────┬─────────────────────────────────────┘
                         │ REST API + WebSocket (for live updates)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Tax Return Service                                           │
│  - User's tax return CRUD                                    │
│  - Session management (auto-save, resume later)              │
│  - Version history (track every change for audit)            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Rules Engine (Core — the hard part)                         │
│                                                                │
│  Rules are versioned per tax year (2024 rules ≠ 2025 rules) │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Federal Rules│ │ State Rules  │ │ Deduction    │         │
│  │ (brackets,  │ │ (50 states,  │ │ Rules        │         │
│  │  std deduct)│ │  each unique)│ │ (itemized vs │         │
│  └──────────────┘ └──────────────┘ │  standard)   │         │
│                                     └──────────────┘         │
│  Rule format: JSON-based DSL                                  │
│  {                                                             │
│    "rule_id": "fed_bracket_2025",                             │
│    "tax_year": 2025,                                          │
│    "filing_status": "SINGLE",                                 │
│    "brackets": [                                               │
│      {"min": 0,      "max": 11600,  "rate": 0.10},           │
│      {"min": 11601,  "max": 47150,  "rate": 0.12},           │
│      {"min": 47151,  "max": 100525, "rate": 0.22},           │
│      {"min": 100526, "max": 191950, "rate": 0.24}            │
│    ]                                                           │
│  }                                                             │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Calculation Pipeline (DAG-based)                             │
│                                                                │
│  Income                                                        │
│    ├── Gross Income (W2 + 1099 + investments)                │
│    ├── Adjustments (HSA, student loan interest)              │
│    └── AGI (Adjusted Gross Income)                           │
│           ├── Deductions (max(standard, itemized))           │
│           └── Taxable Income                                  │
│                  ├── Federal Tax (bracket calculation)        │
│                  ├── State Tax                                │
│                  ├── AMT Check                                │
│                  └── Credits (child tax, education)           │
│                         └── Tax Owed / Refund                │
└──────────────────────────────────────────────────────────────┘
```

#### Bracket Calculation
```java
class TaxBracketCalculator {
    List<Bracket> brackets; // sorted by min income
    
    double calculateTax(double taxableIncome) {
        double tax = 0;
        double remainingIncome = taxableIncome;
        
        for (Bracket bracket : brackets) {
            if (remainingIncome <= 0) break;
            
            double bracketWidth = bracket.max - bracket.min + 1;
            double incomeInBracket = Math.min(remainingIncome, bracketWidth);
            
            tax += incomeInBracket * bracket.rate;
            remainingIncome -= incomeInBracket;
        }
        
        return Math.round(tax * 100.0) / 100.0; // round to cents
    }
}

// Example: Single filer, $80,000 taxable income (2025)
// Bracket 1: $11,600 × 10%  = $1,160
// Bracket 2: $35,550 × 12%  = $4,266
// Bracket 3: $32,850 × 22%  = $7,227
// Total tax: $12,653
```

#### DAG-Based Dependency Resolution
```java
class TaxCalculationDAG {
    // Each field depends on other fields
    // Changes propagate through the DAG
    
    Map<String, Set<String>> dependencies = new HashMap<>(); // field → depends-on
    Map<String, Function<Map<String, Double>, Double>> computations = new HashMap<>();
    
    void define(String field, Set<String> deps, Function<Map<String, Double>, Double> compute) {
        dependencies.put(field, deps);
        computations.put(field, compute);
    }
    
    // When a field changes, recompute all downstream dependents
    Map<String, Double> recompute(Map<String, Double> currentValues, String changedField) {
        // Topological sort starting from changedField
        List<String> order = topologicalSort(changedField);
        
        Map<String, Double> result = new HashMap<>(currentValues);
        for (String field : order) {
            Function<Map<String, Double>, Double> compute = computations.get(field);
            if (compute != null) {
                result.put(field, compute.apply(result));
            }
        }
        return result;
    }
}

// Example DAG setup:
// dag.define("AGI", Set.of("grossIncome", "adjustments"), 
//     vals -> vals.get("grossIncome") - vals.get("adjustments"));
// dag.define("taxableIncome", Set.of("AGI", "deductions"),
//     vals -> Math.max(0, vals.get("AGI") - vals.get("deductions")));
// dag.define("federalTax", Set.of("taxableIncome"),
//     vals -> bracketCalc.calculateTax(vals.get("taxableIncome")));
```

---

## Round 4: Values Interview
**Duration:** 45 minutes | **Interviewers:** 2 (Manager + Engineer)

### Questions Asked
1. **Customer Obsession:** "Tell me about a time you went above and beyond for a customer"
2. **Innovation:** "Describe a creative solution to a technical problem"
3. **Integrity:** "Tell me about a time you pushed back on a decision you disagreed with"

---

## 🎯 Key Takeaways
- Intuit has a unique **Craft Demo** round — prepare a compelling technical presentation
- **HashMap from scratch** is the #1 Intuit DSA question — know collision handling + resizing
- **Tax Calculation Engine** = DAG-based computation with versioned rules — unique to Intuit
- **Two-Heap Median** is a classic — practice until it's muscle memory
- **Rules Engine** design with JSON DSL is applicable to many domains
- **Values interview** is pass/fail at Intuit — prepare 3-4 STAR stories touching their core values

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Craft Demo | Medium | Presentation, Architecture, Impact |
| Round 2 | Medium-Hard | HashMap, DP, Two-Heap |
| Round 3 | Hard | Rules Engine, DAG Computation, Tax Domain |
| Round 4 | Medium | Behavioral (Values-focused) |
