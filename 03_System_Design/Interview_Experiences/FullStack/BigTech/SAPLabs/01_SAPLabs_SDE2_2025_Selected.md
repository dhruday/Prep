# SAP Labs — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP Labs |
| **Role** | Developer Associate |
| **Level** | T3 (SDE-2 equivalent) |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/sap-labs-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Managerial)
- **Timeline:** 2 weeks
- **Format:** Virtual
- **Note:** SAP focuses on ERP/enterprise systems. Heavy on Java, DB design, and clean code.

---

## Round 1: Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Validate BST** (LeetCode 98)
2. **Maximum Profit in Job Scheduling** (LeetCode 1235)
3. **OOP MCQs: Inheritance, Polymorphism, Abstract vs Interface**

### 💡 Interview-Ready Answer — Validate BST

```java
public boolean isValidBST(TreeNode root) {
    return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
}

private boolean validate(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return validate(node.left, min, node.val) && validate(node.right, node.val, max);
}
```

### 💡 Interview-Ready Answer — Maximum Profit Job Scheduling

```java
public int jobScheduling(int[] startTime, int[] endTime, int[] profit) {
    int n = startTime.length;
    int[][] jobs = new int[n][3];
    for (int i = 0; i < n; i++) jobs[i] = new int[]{startTime[i], endTime[i], profit[i]};
    
    // Sort by end time
    Arrays.sort(jobs, (a, b) -> a[1] - b[1]);
    
    // dp[i] = max profit considering first i jobs
    int[] dp = new int[n + 1];
    
    for (int i = 1; i <= n; i++) {
        // Option 1: Skip job i
        dp[i] = dp[i - 1];
        
        // Option 2: Take job i
        // Find last non-overlapping job (binary search on end times)
        int lastNonOverlap = binarySearch(jobs, i - 1, jobs[i-1][0]);
        dp[i] = Math.max(dp[i], dp[lastNonOverlap + 1] + jobs[i-1][2]);
    }
    return dp[n];
}

// Find rightmost job with endTime <= target
private int binarySearch(int[][] jobs, int endIdx, int target) {
    int lo = 0, hi = endIdx - 1, result = -1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (jobs[mid][1] <= target) { result = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return result;
}
```
**Time:** O(n log n), **Space:** O(n)

---

## Round 2: Technical — Java + DSA
**Duration:** 60 minutes

### Questions Asked
1. **Java Streams: filter, map, reduce — implement a reporting query**
2. **Design Pattern: Builder pattern for complex object construction**
3. **Flatten Nested List Iterator** (LeetCode 341)

### 💡 Interview-Ready Answer — Java Streams Reporting

```java
// Given: List of PurchaseOrders
// Find: Top 5 vendors by total order value in Q1 2025, with count of orders

record PurchaseOrder(String vendor, String product, double value, LocalDate date) {}

Map<String, String> report = orders.stream()
    .filter(o -> o.date().getYear() == 2025)
    .filter(o -> o.date().getMonthValue() <= 3) // Q1
    .collect(Collectors.groupingBy(
        PurchaseOrder::vendor,
        Collectors.collectingAndThen(
            Collectors.toList(),
            list -> {
                double total = list.stream().mapToDouble(PurchaseOrder::value).sum();
                long count = list.size();
                return String.format("Orders: %d, Total: $%.2f", count, total);
            }
        )
    ))
    .entrySet().stream()
    .sorted(Map.Entry.<String, String>comparingByValue().reversed())
    .limit(5)
    .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, 
        (a, b) -> a, LinkedHashMap::new));
```

### 💡 Interview-Ready Answer — Builder Pattern

```java
class PurchaseOrder {
    private final String orderId;
    private final String vendor;
    private final List<LineItem> lineItems;
    private final double totalValue;
    private final LocalDate orderDate;
    private final LocalDate deliveryDate;
    private final String currency;
    private final Address shippingAddress;
    private final Address billingAddress;
    
    private PurchaseOrder(Builder builder) {
        this.orderId = builder.orderId;
        this.vendor = builder.vendor;
        this.lineItems = Collections.unmodifiableList(builder.lineItems);
        this.totalValue = builder.lineItems.stream().mapToDouble(LineItem::total).sum();
        this.orderDate = builder.orderDate;
        this.deliveryDate = builder.deliveryDate;
        this.currency = builder.currency;
        this.shippingAddress = builder.shippingAddress;
        this.billingAddress = builder.billingAddress != null ? builder.billingAddress : builder.shippingAddress;
    }
    
    static class Builder {
        private String orderId;
        private String vendor;
        private List<LineItem> lineItems = new ArrayList<>();
        private LocalDate orderDate = LocalDate.now();
        private LocalDate deliveryDate;
        private String currency = "USD";
        private Address shippingAddress;
        private Address billingAddress;
        
        Builder(String orderId, String vendor) {
            this.orderId = Objects.requireNonNull(orderId);
            this.vendor = Objects.requireNonNull(vendor);
        }
        
        Builder addLineItem(String product, int qty, double price) {
            lineItems.add(new LineItem(product, qty, price));
            return this;
        }
        
        Builder deliveryDate(LocalDate date) { this.deliveryDate = date; return this; }
        Builder currency(String currency) { this.currency = currency; return this; }
        Builder shippingAddress(Address addr) { this.shippingAddress = addr; return this; }
        Builder billingAddress(Address addr) { this.billingAddress = addr; return this; }
        
        PurchaseOrder build() {
            if (lineItems.isEmpty()) throw new IllegalStateException("At least one line item required");
            if (shippingAddress == null) throw new IllegalStateException("Shipping address required");
            return new PurchaseOrder(this);
        }
    }
}

// Usage:
PurchaseOrder po = new PurchaseOrder.Builder("PO-2025-001", "Acme Corp")
    .addLineItem("Widget A", 100, 5.99)
    .addLineItem("Widget B", 50, 12.99)
    .deliveryDate(LocalDate.of(2025, 4, 15))
    .currency("INR")
    .shippingAddress(warehouseAddr)
    .build();
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design an ERP System — Order-to-Cash Module**
   - Sales order → delivery → billing → payment → accounting

### 💡 Interview-Ready Answer

```
Order-to-Cash (O2C) Flow:
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│  1. SALES ORDER                                               │
│  ┌────────────┐                                               │
│  │ Customer    │──▶ Create Sales Order                        │
│  │ places order│    (material, qty, price, delivery date)     │
│  └────────────┘    ↓ Credit Check (is customer creditworthy?)│
│                    ↓ ATP Check (is material available?)        │
│                                                                │
│  2. DELIVERY                                                   │
│  ┌────────────┐                                               │
│  │ Warehouse  │──▶ Pick → Pack → Ship → Goods Issue          │
│  │ fulfillment│    ↓ Inventory decremented                   │
│  └────────────┘    ↓ Delivery note created                   │
│                                                                │
│  3. BILLING                                                    │
│  ┌────────────┐                                               │
│  │ Invoice    │──▶ Generate invoice from delivery              │
│  │ creation   │    ↓ Tax calculation                          │
│  └────────────┘    ↓ Accounting document created              │
│                                                                │
│  4. PAYMENT                                                    │
│  ┌────────────┐                                               │
│  │ Customer   │──▶ Payment received → matched to invoice      │
│  │ pays       │    ↓ AR (Accounts Receivable) cleared         │
│  └────────────┘    ↓ Cash journal updated                     │
│                                                                │
│  Each step creates a "document" linked to the chain:          │
│  SO → Delivery → Invoice → Payment                            │
│  Complete audit trail — can trace any transaction back         │
└──────────────────────────────────────────────────────────────┘
```

#### Data Model
```sql
-- Sales Order
CREATE TABLE sales_orders (
    order_id        VARCHAR(20) PRIMARY KEY,
    customer_id     VARCHAR(20) REFERENCES customers(id),
    order_date      DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'CREATED', -- CREATED → CONFIRMED → DELIVERED → INVOICED → PAID
    total_amount    DECIMAL(15,2),
    currency        VARCHAR(3) DEFAULT 'INR',
    payment_terms   VARCHAR(10) -- NET30, NET60, COD
);

-- Sales Order Line Items
CREATE TABLE order_items (
    item_id         SERIAL PRIMARY KEY,
    order_id        VARCHAR(20) REFERENCES sales_orders(order_id),
    material_id     VARCHAR(20) REFERENCES materials(id),
    quantity        INTEGER NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    tax_code        VARCHAR(5),
    delivery_date   DATE
);

-- Delivery
CREATE TABLE deliveries (
    delivery_id     VARCHAR(20) PRIMARY KEY,
    order_id        VARCHAR(20) REFERENCES sales_orders(order_id),
    ship_date       DATE,
    status          VARCHAR(20), -- PICKED → PACKED → SHIPPED → DELIVERED
    tracking_number VARCHAR(50),
    carrier         VARCHAR(50)
);

-- Invoice (linked to delivery)
CREATE TABLE invoices (
    invoice_id      VARCHAR(20) PRIMARY KEY,
    delivery_id     VARCHAR(20) REFERENCES deliveries(delivery_id),
    order_id        VARCHAR(20) REFERENCES sales_orders(order_id),
    invoice_date    DATE,
    due_date        DATE,      -- based on payment_terms
    subtotal        DECIMAL(15,2),
    tax_amount      DECIMAL(15,2),
    total           DECIMAL(15,2),
    status          VARCHAR(20)  -- OPEN → PARTIALLY_PAID → PAID → OVERDUE
);

-- Double-Entry Accounting (for each invoice)
-- DEBIT: Accounts Receivable (customer owes us)
-- CREDIT: Revenue (we earned money)
-- When paid:
-- DEBIT: Cash/Bank (we received money)
-- CREDIT: Accounts Receivable (customer no longer owes)
```

---

## 🎯 Key Takeaways
- SAP interviews test **ERP/enterprise domain** — know Order-to-Cash, Procure-to-Pay flows
- **Java Streams** advanced usage (groupingBy + collectingAndThen) is SAP's favorite
- **Builder Pattern** for complex objects is almost always asked
- **Job Scheduling DP** with binary search is a common OA problem
- **BST Validation** is an SAP classic — use long min/max to handle edge cases
- **Document flow** (SO → Delivery → Invoice → Payment) is the core ERP concept
- **Double-entry accounting** knowledge helps even if not directly asked

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium-Hard | BST, DP + Binary Search |
| Round 2 | Medium | Java Streams, Builder Pattern, Iterator |
| Round 3 | Hard | ERP Domain, O2C Flow, Data Modeling |
| Round 4 | Medium | Behavioral |
