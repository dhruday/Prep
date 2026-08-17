# Amazon — SDE-2 Interview Experience (2024)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-2 |
| **Level** | L5 |
| **YOE** | 4+ years |
| **Date** | 2024 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad (Onsite) |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/amazon-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 6 (1 Phone + 4 Onsite + 1 Bar Raiser)
- **Timeline:** 4 weeks (phone → 2 weeks → onsite loop in single day)
- **Format:** Phone (Google Doc) + Onsite (Whiteboard + Laptop)
- **Key Focus:** Amazon Leadership Principles (LP) woven into EVERY round

---

## Round 1: Phone Screen — DSA + LP
**Duration:** 60 minutes | **Interviewer:** SDE-2

### Questions Asked
1. **Introduction & Current Project Discussion**
2. **Simple Binary Tree Problem** — Find the height of a binary tree
3. **Binary Tree — Print Left View**
4. **LRU Cache** — Design and implement with full code + test cases
5. **LP:** "How do you write code — test first or code first?"

### 💡 Interview-Ready Answers

**Q1: Height of Binary Tree**
```java
public int height(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(height(root.left), height(root.right));
}
// Time: O(n), Space: O(h) — stack depth
```

**Q2: Left View of Binary Tree**
```java
public List<Integer> leftView(TreeNode root) {
    List<Integer> result = new ArrayList<>();
    if (root == null) return result;
    
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    
    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            if (i == 0) result.add(node.val); // first node of each level
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
    }
    return result;
}
// Time: O(n), Space: O(w) where w = max width of tree
```

**Q3: LRU Cache — Full Implementation**
```java
class LRUCache {
    private final int capacity;
    private final Map<Integer, Node> map;
    private final Node head, tail; // dummy nodes
    
    class Node {
        int key, value;
        Node prev, next;
        Node(int k, int v) { key = k; value = v; }
    }
    
    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head.next = tail;
        tail.prev = head;
    }
    
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node node = map.get(key);
        remove(node);
        addToFront(node);
        return node.value;
    }
    
    public void put(int key, int value) {
        if (map.containsKey(key)) {
            Node node = map.get(key);
            node.value = value;
            remove(node);
            addToFront(node);
        } else {
            if (map.size() == capacity) {
                Node lru = tail.prev;
                remove(lru);
                map.remove(lru.key);
            }
            Node newNode = new Node(key, value);
            map.put(key, newNode);
            addToFront(newNode);
        }
    }
    
    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void addToFront(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
}
// Time: O(1) for get and put
// Space: O(capacity)
```

**Test Cases Written:**
```
LRUCache cache = new LRUCache(2);
cache.put(1, 1);           // cache: {1=1}
cache.put(2, 2);           // cache: {2=2, 1=1}
cache.get(1);              // returns 1, cache: {1=1, 2=2}
cache.put(3, 3);           // evicts key 2, cache: {3=3, 1=1}
cache.get(2);              // returns -1 (not found)
cache.put(4, 4);           // evicts key 1, cache: {4=4, 3=3}
cache.get(1);              // returns -1
cache.get(3);              // returns 3
// Edge: capacity=1, get non-existent, update existing key
```

---

## Round 2: Onsite — Project + Leadership Principles
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **"Draw your current project architecture on the whiteboard"**
2. **LP - "Have you ever had conflicts within the team?"** (Earn Trust / Have Backbone)
3. **LP - "Have you ever disagreed with your manager?"** (Have Backbone, Disagree & Commit)
4. **LP - "Have you ever proposed a solution and couldn't make it happen?"** (Bias for Action)
5. **"How do you ensure your code is fully tested?"** (Insist on Highest Standards)
6. **"Have you made changes to make the system more efficient?"** (Invent & Simplify)

### 💡 Interview-Ready Answers (STAR + LP)

**Q: "Conflict within the team" — LP: Earn Trust**

**Situation:** Our backend team (5 engineers) was split on whether to use GraphQL or REST for our new customer-facing API. The senior engineer favored GraphQL for flexibility; the lead preferred REST for simplicity and existing tooling.

**Task:** As the SDE-2, I needed to break the deadlock and propose a solution that addressed both concerns without damaging team dynamics.

**Action:** I **dove deep** into both options — built a PoC for each over a weekend. Created a comparison matrix: developer experience, query performance on our actual data model (nested orders → items → reviews), caching complexity, monitoring/debugging, and team learning curve. Presented findings objectively in a tech review meeting. The data showed GraphQL was 40% faster for our mobile clients (fewer round trips) but REST was better for internal services (simpler caching, better observability).

**Result:** We adopted a hybrid: GraphQL BFF (Backend-for-Frontend) for mobile/web clients, REST for service-to-service communication. Both engineers' concerns were addressed. Mobile API response size reduced by 60%, and our internal services maintained simple caching. The team shipped the API 1 week early.

> **What interviewers look for:** Data-driven decisions, not picking sides. Show you **earn trust** by being objective and inclusive.

**Q: "Disagreed with manager" — LP: Have Backbone, Disagree & Commit**

**Situation:** My manager wanted to ship a new payment feature by Friday to meet a marketing deadline. I identified that our error handling for payment failures was incomplete — we had no retry logic for transient bank errors, which could silently lose customer payments.

**Task:** Push back respectfully on the deadline while proposing a path that balanced speed with quality.

**Action:** I wrote a 1-page risk document: "If we ship without retry logic, we estimate 2-3% of payments will silently fail (based on our bank error rate data). That's ~$50K/week in lost revenue and customer complaints." I proposed: ship the feature with a feature flag, add retry logic (2 additional days), then enable the flag.

**Result:** Manager agreed. We shipped with the flag Monday (3 days late but safe). Added retry with exponential backoff. Post-launch: zero silent payment failures, 99.7% success rate vs the estimated 97% without retry. Manager publicly credited me in the team retro.

---

## Round 3: Onsite — DSA (Competitive Programming)
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Stream Processing Problem**
   - Problem: There's an infinite stream of students submitting answers. Select the student who gives a unique answer first. Optimize for real-time processing.

### 💡 Interview-Ready Answer

**Approach 1 (Brute Force): Store all answers, check uniqueness → O(n²)**

**Approach 2 (Optimal): HashMap + LinkedHashSet → O(1) amortized**

```java
class UniqueAnswerFinder {
    private Map<String, Integer> answerCount = new HashMap<>();
    private LinkedHashSet<String> uniqueAnswers = new LinkedHashSet<>();
    private Map<String, String> answerToStudent = new HashMap<>();
    
    // Process each submission in O(1)
    public void processSubmission(String studentId, String answer) {
        int count = answerCount.getOrDefault(answer, 0) + 1;
        answerCount.put(answer, count);
        
        if (count == 1) {
            uniqueAnswers.add(answer);
            answerToStudent.put(answer, studentId);
        } else {
            uniqueAnswers.remove(answer); // no longer unique
        }
    }
    
    // Get first student with unique answer in O(1)
    public String getFirstUniqueStudent() {
        if (uniqueAnswers.isEmpty()) return null;
        String firstUniqueAnswer = uniqueAnswers.iterator().next();
        return answerToStudent.get(firstUniqueAnswer);
    }
}
```

**Time:** O(1) per submission, O(1) for query
**Space:** O(n) for storing all submissions

**Follow-up: "Optimize further"**
→ Use a doubly-linked list (like LRU) instead of LinkedHashSet for guaranteed O(1) removal:

```java
class OptimizedFinder {
    private Map<String, Node> answerToNode = new HashMap<>();
    private Map<String, Integer> answerCount = new HashMap<>();
    private Node head = new Node("", ""), tail = new Node("", "");
    
    static class Node {
        String answer, studentId;
        Node prev, next;
        Node(String a, String s) { answer = a; studentId = s; }
    }
    
    OptimizedFinder() { head.next = tail; tail.prev = head; }
    
    void process(String studentId, String answer) {
        int count = answerCount.merge(answer, 1, Integer::sum);
        if (count == 1) {
            Node node = new Node(answer, studentId);
            answerToNode.put(answer, node);
            // Add to tail (preserves order)
            node.prev = tail.prev;
            node.next = tail;
            tail.prev.next = node;
            tail.prev = node;
        } else if (answerToNode.containsKey(answer)) {
            // Remove from unique list
            Node node = answerToNode.remove(answer);
            node.prev.next = node.next;
            node.next.prev = node.prev;
        }
    }
    
    String getFirstUnique() {
        return head.next == tail ? null : head.next.studentId;
    }
}
```

---

## Round 4: Bar Raiser — DSA + Testing
**Duration:** 60 minutes | **Interviewer:** Bar Raiser (Principal SDE from different team)

### Questions Asked
1. **Largest Number in K Swaps**
   - Problem: Given an array of digits and k swaps allowed, form the largest possible number
2. **"Write all test cases BEFORE writing code"** — including edge cases

### 💡 Interview-Ready Answer

**Test Cases First (Amazon loves this — "Insist on Highest Standards"):**
```
Input: [1,2,3,4,5], k=1 → Expected: [5,2,3,4,1] (swap 1↔5)
Input: [9,8,7,6,5], k=3 → Expected: [9,8,7,6,5] (already sorted desc)
Input: [1,1,1], k=2 → Expected: [1,1,1] (all same)
Input: [2,1], k=1 → Expected: [2,1] (already max)
Input: [1,2], k=1 → Expected: [2,1]
Input: [4,5,2,3,1], k=2 → Expected: [5,4,3,2,1]? No → [5,4,2,3,1]
Edge: k=0 → return original
Edge: empty array → return empty
Edge: single element → return as-is
```

**Solution: Greedy Approach**

```java
public String largestNumberInKSwaps(int[] digits, int k) {
    char[] arr = new char[digits.length];
    for (int i = 0; i < digits.length; i++) arr[i] = (char)('0' + digits[i]);
    
    largestHelper(arr, k, 0);
    return new String(arr);
}

private String maxResult = "";

private void largestHelper(char[] arr, int k, int index) {
    String current = new String(arr);
    if (current.compareTo(maxResult) > 0) maxResult = current;
    
    if (k == 0 || index == arr.length) return;
    
    // Find max digit from index to end
    char maxDigit = arr[index];
    for (int i = index + 1; i < arr.length; i++) {
        if (arr[i] > maxDigit) maxDigit = arr[i];
    }
    
    // If current position already has max, move to next
    if (arr[index] == maxDigit) {
        largestHelper(arr, k, index + 1);
        return;
    }
    
    // Try swapping with each position that has maxDigit
    for (int i = index + 1; i < arr.length; i++) {
        if (arr[i] == maxDigit) {
            // Swap
            char temp = arr[index]; arr[index] = arr[i]; arr[i] = temp;
            largestHelper(arr, k - 1, index + 1);
            // Backtrack
            arr[i] = arr[index]; arr[index] = temp; // swap back
            temp = arr[index]; arr[index] = arr[i]; arr[i] = temp;
        }
    }
}
```

**Time:** O(n! / (n-k)!) worst case, but greedy pruning makes it practical
**Space:** O(n) recursion depth

---

## Round 5: High-Level System Design
**Duration:** 60 minutes | **Interviewer:** Senior Manager

### Questions Asked
1. **Design a Grocery Store (like Amazon Fresh) using Kroger's Inventory**
   - Third-party inventory at backend, Amazon branding at frontend
   - Real-time stock updates, delivery management

### 💡 Interview-Ready Answer

**Requirements:**
- **Functional:** Browse products, search, add to cart, checkout, schedule delivery, real-time stock
- **Non-Functional:** Low latency (<200ms search), consistency (no overselling), 99.9% uptime
- **Scale:** 10M products, 5M DAU, 100K concurrent orders

**Architecture:**
```
┌──────────┐     ┌──────────────┐     ┌────────────────┐
│  Web/App  │────▶│  API Gateway  │────▶│  Auth Service   │
│  Client   │     │  (Rate Limit) │     │  (JWT + OAuth)  │
└──────────┘     └──────┬───────┘     └────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
   ┌───────────┐ ┌───────────┐ ┌──────────────┐
   │  Product   │ │  Cart     │ │  Order       │
   │  Service   │ │  Service  │ │  Service     │
   └─────┬─────┘ └─────┬─────┘ └──────┬───────┘
         │              │              │
         ▼              ▼              ▼
   ┌───────────┐ ┌───────────┐ ┌──────────────┐
   │ Inventory  │ │  Redis    │ │  Payment     │
   │ Sync Svc   │ │  (Cart)   │ │  Service     │
   └─────┬─────┘ └───────────┘ └──────────────┘
         │
         ▼
   ┌───────────┐
   │  Kroger    │  ← Third-party inventory API
   │  API       │     (REST, polled every 5 min)
   └───────────┘
```

**Inventory Sync Strategy:**
- **Push model** (preferred): Kroger sends webhook on stock changes
- **Pull fallback:** Poll Kroger API every 5 minutes for delta changes
- **Local cache:** Redis with TTL=5min for product availability
- **Overselling protection:** Distributed lock (Redis SETNX) during checkout

**Database:**
```sql
-- Products (synced from Kroger)
products: {id, kroger_sku, name, price, category, image_url, last_synced}

-- Inventory (real-time)
inventory: {product_id, warehouse_id, quantity, reserved_qty, updated_at}

-- Orders
orders: {id, user_id, status, total, delivery_slot, address, created_at}
order_items: {order_id, product_id, quantity, unit_price}
```

---

## Round 6: Low-Level Design
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Find bugs in given code snippet** (code review exercise)
2. **Design Vending Machine** — State Design Pattern

### 💡 Interview-Ready Answer — Vending Machine LLD

**Design Pattern: State Pattern**

```java
// States
enum VendingState { IDLE, HAS_MONEY, DISPENSING, OUT_OF_STOCK }

interface State {
    void insertMoney(VendingMachine vm, double amount);
    void selectProduct(VendingMachine vm, String productId);
    void dispense(VendingMachine vm);
    void cancelTransaction(VendingMachine vm);
}

class IdleState implements State {
    public void insertMoney(VendingMachine vm, double amount) {
        vm.setBalance(amount);
        vm.setState(new HasMoneyState());
        System.out.println("Inserted $" + amount);
    }
    public void selectProduct(VendingMachine vm, String id) {
        System.out.println("Please insert money first");
    }
    public void dispense(VendingMachine vm) {
        System.out.println("Please insert money and select product");
    }
    public void cancelTransaction(VendingMachine vm) {
        System.out.println("No transaction to cancel");
    }
}

class HasMoneyState implements State {
    public void insertMoney(VendingMachine vm, double amount) {
        vm.setBalance(vm.getBalance() + amount);
    }
    public void selectProduct(VendingMachine vm, String productId) {
        Product p = vm.getProduct(productId);
        if (p == null || p.getQuantity() == 0) {
            System.out.println("Product unavailable");
            return;
        }
        if (vm.getBalance() < p.getPrice()) {
            System.out.println("Insufficient funds. Need $" + (p.getPrice() - vm.getBalance()));
            return;
        }
        vm.setSelectedProduct(p);
        vm.setState(new DispensingState());
        vm.dispense();
    }
    public void dispense(VendingMachine vm) {
        System.out.println("Please select a product first");
    }
    public void cancelTransaction(VendingMachine vm) {
        double refund = vm.getBalance();
        vm.setBalance(0);
        vm.setState(new IdleState());
        System.out.println("Refunded $" + refund);
    }
}

class DispensingState implements State {
    public void insertMoney(VendingMachine vm, double amt) {
        System.out.println("Please wait, dispensing...");
    }
    public void selectProduct(VendingMachine vm, String id) {
        System.out.println("Please wait, dispensing...");
    }
    public void dispense(VendingMachine vm) {
        Product p = vm.getSelectedProduct();
        p.setQuantity(p.getQuantity() - 1);
        double change = vm.getBalance() - p.getPrice();
        vm.setBalance(0);
        vm.setSelectedProduct(null);
        System.out.println("Dispensed " + p.getName() + ". Change: $" + change);
        vm.setState(new IdleState());
    }
    public void cancelTransaction(VendingMachine vm) {
        System.out.println("Cannot cancel while dispensing");
    }
}

// Main class
class VendingMachine {
    private State currentState;
    private double balance;
    private Product selectedProduct;
    private Map<String, Product> inventory;
    
    public VendingMachine() {
        this.currentState = new IdleState();
        this.inventory = new HashMap<>();
    }
    
    // Delegate to current state
    public void insertMoney(double amount) { currentState.insertMoney(this, amount); }
    public void selectProduct(String id) { currentState.selectProduct(this, id); }
    public void dispense() { currentState.dispense(this); }
    public void cancel() { currentState.cancelTransaction(this); }
    
    // Getters/Setters
    public void setState(State s) { currentState = s; }
    public double getBalance() { return balance; }
    public void setBalance(double b) { balance = b; }
    public Product getProduct(String id) { return inventory.get(id); }
    public Product getSelectedProduct() { return selectedProduct; }
    public void setSelectedProduct(Product p) { selectedProduct = p; }
}
```

**SOLID Principles Demonstrated:**
- **S** — Each state class has a single responsibility
- **O** — Open for extension (add new states without modifying existing)
- **L** — All states implement the same interface
- **I** — State interface methods are cohesive
- **D** — VendingMachine depends on State interface, not concrete states

---

## 🎯 Key Takeaways
- Amazon LP stories are **50% of the evaluation** — prepare 14 stories (one per LP)
- "Write test cases first" → Amazon values **testability** and TDD mindset
- Bar Raiser evaluates **culture fit** across teams — be authentic
- HLD and LLD are **separate rounds** at SDE-2 level — prepare both
- **State Design Pattern** is an Amazon LLD favorite (Vending Machine, Elevator, Traffic Light)
- Always tie technical answers back to **customer impact**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 (Phone) | Medium | Binary Trees, LRU Cache |
| Round 2 (LP) | Medium | Leadership Principles, STAR |
| Round 3 (DSA) | Medium-Hard | Stream Processing, HashMap+LinkedList |
| Round 4 (Bar Raiser) | Hard | Greedy, Backtracking, Test-First |
| Round 5 (HLD) | Medium | API Gateway, Inventory Sync, Microservices |
| Round 6 (LLD) | Medium | State Pattern, OOP, SOLID |
