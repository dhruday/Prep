# Target — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target Corporation |
| **Role** | Senior Software Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (HackerRank OA + 2 Technical + 1 Managerial)
- **Timeline:** 2 weeks
- **Format:** Virtual (first round OA, rest via Teams)
- **Note:** Target focuses heavily on real-world system design and clean coding

---

## Round 1: Online Assessment
**Duration:** 75 minutes | **Platform:** HackerRank

### Questions Asked
1. **Maximum Subarray Sum** (Kadane's Algorithm)
2. **LRU Cache Implementation**
3. **MCQ: Java/Spring Boot concepts, REST API best practices, SQL queries**

### 💡 Interview-Ready Answer — LRU Cache

```java
class LRUCache {
    class Node {
        int key, value;
        Node prev, next;
        Node(int k, int v) { key = k; value = v; }
    }
    
    int capacity;
    Map<Integer, Node> map;
    Node head, tail; // dummy head and tail
    
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
        moveToHead(node);
        return node.value;
    }
    
    public void put(int key, int value) {
        if (map.containsKey(key)) {
            Node node = map.get(key);
            node.value = value;
            moveToHead(node);
        } else {
            Node node = new Node(key, value);
            map.put(key, node);
            addToHead(node);
            if (map.size() > capacity) {
                Node lru = tail.prev;
                remove(lru);
                map.remove(lru.key);
            }
        }
    }
    
    private void addToHead(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
    
    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void moveToHead(Node node) {
        remove(node);
        addToHead(node);
    }
}
```
**All operations O(1)**

---

## Round 2: Technical — DSA + LLD
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Group Anagrams** (LeetCode 49)
2. **Design a Library Management System** (LLD)
3. **Discussion:** Microservices vs Monolith trade-offs

### 💡 Interview-Ready Answer — Group Anagrams

```java
public List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    
    for (String s : strs) {
        // Method 1: Sort key (simple)
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);
        
        // Method 2: Count key (faster for long strings)
        // int[] count = new int[26];
        // for (char c : s.toCharArray()) count[c - 'a']++;
        // String key = Arrays.toString(count);
        
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    
    return new ArrayList<>(groups.values());
}
```
**Time:** O(n * k log k) with sort, O(n * k) with count. **Space:** O(n * k)

### 💡 Interview-Ready Answer — Library Management System

```java
enum BookStatus { AVAILABLE, CHECKED_OUT, RESERVED, LOST }

class Book {
    String isbn;
    String title;
    String author;
    BookStatus status;
    LocalDate dueDate;
    String borrowerId;
    
    Book(String isbn, String title, String author) {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
        this.status = BookStatus.AVAILABLE;
    }
}

class Member {
    String memberId;
    String name;
    int maxBooksAllowed = 5;
    List<String> borrowedBookIsbns = new ArrayList<>();
    double fineBalance = 0.0;
}

class Library {
    Map<String, Book> books = new HashMap<>();        // isbn → book
    Map<String, Member> members = new HashMap<>();    // memberId → member
    Map<String, Queue<String>> reservations = new HashMap<>(); // isbn → queue of memberIds
    
    static final double FINE_PER_DAY = 1.0;
    static final int BORROW_DAYS = 14;
    
    // Search
    List<Book> searchByTitle(String query) {
        return books.values().stream()
            .filter(b -> b.title.toLowerCase().contains(query.toLowerCase()))
            .collect(Collectors.toList());
    }
    
    List<Book> searchByAuthor(String author) {
        return books.values().stream()
            .filter(b -> b.author.equalsIgnoreCase(author))
            .collect(Collectors.toList());
    }
    
    // Checkout
    void checkoutBook(String memberId, String isbn) {
        Member member = members.get(memberId);
        Book book = books.get(isbn);
        
        if (member == null) throw new IllegalArgumentException("Member not found");
        if (book == null) throw new IllegalArgumentException("Book not found");
        if (book.status != BookStatus.AVAILABLE) throw new IllegalStateException("Book not available");
        if (member.borrowedBookIsbns.size() >= member.maxBooksAllowed)
            throw new IllegalStateException("Max borrow limit reached");
        if (member.fineBalance > 0) 
            throw new IllegalStateException("Please clear pending fines: $" + member.fineBalance);
        
        book.status = BookStatus.CHECKED_OUT;
        book.borrowerId = memberId;
        book.dueDate = LocalDate.now().plusDays(BORROW_DAYS);
        member.borrowedBookIsbns.add(isbn);
    }
    
    // Return
    void returnBook(String isbn) {
        Book book = books.get(isbn);
        if (book.status != BookStatus.CHECKED_OUT) throw new IllegalStateException("Book not checked out");
        
        Member member = members.get(book.borrowerId);
        
        // Calculate fine if overdue
        if (LocalDate.now().isAfter(book.dueDate)) {
            long daysOverdue = ChronoUnit.DAYS.between(book.dueDate, LocalDate.now());
            member.fineBalance += daysOverdue * FINE_PER_DAY;
        }
        
        member.borrowedBookIsbns.remove(isbn);
        book.borrowerId = null;
        book.dueDate = null;
        
        // Check reservations
        Queue<String> queue = reservations.get(isbn);
        if (queue != null && !queue.isEmpty()) {
            String nextMemberId = queue.poll();
            book.status = BookStatus.RESERVED;
            // Notify next member (Observer pattern in real system)
        } else {
            book.status = BookStatus.AVAILABLE;
        }
    }
    
    // Reserve
    void reserveBook(String memberId, String isbn) {
        Book book = books.get(isbn);
        if (book.status == BookStatus.AVAILABLE) {
            throw new IllegalStateException("Book is available — checkout instead");
        }
        reservations.computeIfAbsent(isbn, k -> new LinkedList<>()).add(memberId);
    }
}
```

**Design Patterns:**
- **Observer:** Notify members when reserved book becomes available
- **Strategy:** Different fine calculation policies (student, faculty, external)
- **Singleton:** Library instance (if single library)

---

## Round 3: Technical — System Design
**Duration:** 60 minutes | **Interviewer:** Principal SDE

### Questions Asked
1. **Design Target's Inventory Management System**
   - Real-time stock across 1900+ stores, online fulfillment, store pickup, supply chain

### 💡 Interview-Ready Answer

#### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Inventory Sources                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  POS     │  │  E-comm  │  │  Warehouse│  │  Vendor  │   │
│  │  (Store  │  │  Orders  │  │  Receipts │  │  Shipment│   │
│  │   Sales) │  │          │  │           │  │  Updates │   │
│  └────┬─────┘  └────┬─────┘  └─────┬────┘  └────┬─────┘   │
└───────┼──────────────┼──────────────┼────────────┼──────────┘
        │              │              │            │
        ▼              ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│              Event Bus (Apache Kafka)                         │
│  Topics: pos-transactions, order-events, warehouse-receipts  │
│          vendor-shipments, inventory-adjustments              │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌──────────────┐  ┌──────────┐  ┌──────────────┐
    │  Inventory   │  │  ATP     │  │  Analytics   │
    │  Ledger      │  │  Service │  │  Pipeline    │
    │  Service     │  │ (Avail- │  │  (Demand     │
    │  (Source of  │  │  to-    │  │   forecast)  │
    │   truth)     │  │  Promise)│  │              │
    └──────┬───────┘  └────┬─────┘  └──────────────┘
           │               │
           ▼               ▼
    ┌──────────────┐  ┌──────────────┐
    │  PostgreSQL  │  │  Redis       │
    │  (Inventory  │  │  (ATP Cache  │
    │   Ledger)    │  │   per store) │
    └──────────────┘  └──────────────┘
```

#### Inventory Ledger (Event Sourcing)
```sql
-- Every inventory change is an immutable event
CREATE TABLE inventory_events (
    event_id        BIGSERIAL PRIMARY KEY,
    sku             VARCHAR(50) NOT NULL,
    store_id        VARCHAR(20) NOT NULL,
    event_type      VARCHAR(30) NOT NULL,  -- SALE, RETURN, RECEIPT, ADJUSTMENT, TRANSFER
    quantity_change  INT NOT NULL,          -- negative for reductions
    reference_id    VARCHAR(100),           -- order_id, receipt_id, etc.
    created_at      TIMESTAMP DEFAULT NOW(),
    INDEX idx_sku_store (sku, store_id, created_at)
);

-- Materialized view for current stock
CREATE MATERIALIZED VIEW current_inventory AS
SELECT sku, store_id, SUM(quantity_change) as on_hand
FROM inventory_events
GROUP BY sku, store_id;

-- Refresh periodically or use triggers
```

#### Available-to-Promise (ATP) Service
```java
class ATPService {
    // ATP = on_hand - reserved - safety_stock + incoming
    
    public int getATP(String sku, String storeId) {
        // Check Redis cache first (TTL: 30 seconds)
        String cacheKey = "atp:" + sku + ":" + storeId;
        Integer cached = redis.get(cacheKey);
        if (cached != null) return cached;
        
        int onHand = inventoryService.getOnHand(sku, storeId);
        int reserved = orderService.getReservedQty(sku, storeId);
        int safetyStock = configService.getSafetyStock(sku, storeId);
        int incoming = supplyChainService.getIncomingQty(sku, storeId, days: 7);
        
        int atp = onHand - reserved - safetyStock + incoming;
        atp = Math.max(atp, 0); // never negative
        
        redis.setex(cacheKey, 30, atp); // cache for 30 seconds
        return atp;
    }
}
```

#### Omnichannel Fulfillment Logic
```
Customer orders online:
  1. Check ATP at fulfillment centers (FC) → prefer FC (cheapest)
  2. If FC out of stock → check nearby stores (within 50 miles)
  3. If store has stock → offer "Ship from Store" or "Buy Online Pickup In Store" (BOPIS)
  4. If no stock anywhere → show "Out of Stock" or "Notify when available"

Allocation priority:
  FC > Store (by distance to customer) > Transfer from another FC
  
Constraint: never sell below safety stock for walk-in customers
```

#### Scale Numbers
```
- 1,900 stores × 100K SKUs = 190M inventory records
- POS events: ~500K transactions/hour during peak
- Online orders: ~50K/hour during flash sales
- ATP lookups: 10M/hour (every product page view)
- Redis: 190M ATP values × 8 bytes = ~1.5GB (fits in memory)
```

---

## Round 4: Managerial
**Duration:** 45 minutes | **Interviewer:** Engineering Director

### Questions Asked
1. **"Walk me through a project where you owned the architecture end-to-end"**
2. **"How do you handle scope creep?"**
3. **"What's your approach to balancing tech debt vs feature development?"**
4. **"Where do you see yourself in 3 years?"**

### 💡 Interview-Ready Answer — Handling Scope Creep

**Situation:** Building a customer analytics dashboard — scope ballooned from 5 charts to 25 with custom date ranges, PDF export, email scheduling, and role-based views. Timeline was fixed at 6 weeks.

**Task:** Deliver a usable product on time without demoralizing the team or upsetting stakeholders.

**Action:**
1. **Categorized features** into MoSCoW (Must/Should/Could/Won't): 8 Must-Have, 7 Should-Have, 10 Could-Have
2. **Timeboxed the Must-Haves** to 4 weeks with specific acceptance criteria per chart
3. **Created a "Phase 2 backlog"** for remaining features — gave stakeholders visibility that their requests weren't rejected, just sequenced
4. **Daily standups** with strict focus: "Is this a Must-Have? If not, it waits."
5. **Delivered MVP** at week 5 with 8 core charts + 3 bonuses. Stakeholders were happy. Phase 2 came 4 weeks later.

**Result:** On-time delivery. Stakeholder satisfaction score 4.5/5. The MoSCoW template became our team's standard for all new projects.

---

## 🎯 Key Takeaways
- Target interviews are **practical and business-oriented** — understand retail domain (stores, inventory, fulfillment)
- **Event Sourcing** for inventory is a key design pattern — every change is an immutable event
- **Available-to-Promise (ATP)** is Target's core concept — know how to calculate it
- **Omnichannel fulfillment** (FC vs Store) is unique to retail companies — understand the logistics
- **LLD questions at Target** are practical (Library, Parking Lot) — focus on clean OOP
- **LRU Cache** appears in almost every Target OA — practice until you can write it in your sleep

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Kadane's, LRU Cache, MCQ |
| Round 2 | Medium | Hashing, OOP, LLD |
| Round 3 | Hard | Event Sourcing, Inventory, Omnichannel |
| Round 4 | Medium | Behavioral, Scope Management |
