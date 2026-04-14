# Goldman Sachs — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | VP — Software Engineer |
| **Level** | VP (SDE-2 equivalent) |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/goldman-sachs-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + 4 Technical/Behavioral)
- **Timeline:** 4 weeks
- **Format:** Virtual
- **Note:** Goldman Sachs interviews are very heavy on core CS (OOP, DBMS, OS) + DSA. Less focus on system design compared to FAANG.

---

## Round 1: HackerRank Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Power Set / Subsets** (LeetCode 78)
2. **Stock Buy and Sell — Multiple Transactions** (LeetCode 122)
3. **SQL: Complex JOIN query with GROUP BY and HAVING**

### 💡 Interview-Ready Answer — Power Set

```java
public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, int start, List<Integer> current, List<List<Integer>> result) {
    result.add(new ArrayList<>(current)); // add current subset (including empty)
    
    for (int i = start; i < nums.length; i++) {
        current.add(nums[i]);
        backtrack(nums, i + 1, current, result);
        current.remove(current.size() - 1); // backtrack
    }
}

// Bit manipulation approach (elegant alternative):
public List<List<Integer>> subsets_bits(int[] nums) {
    int n = nums.length;
    List<List<Integer>> result = new ArrayList<>();
    
    for (int mask = 0; mask < (1 << n); mask++) {
        List<Integer> subset = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if ((mask & (1 << i)) != 0) subset.add(nums[i]);
        }
        result.add(subset);
    }
    return result;
}
```

### 💡 Interview-Ready Answer — SQL Complex Query

```sql
-- "Find departments where average salary is above company average, 
--  showing department name, employee count, avg salary, and highest earner"

SELECT 
    d.department_name,
    COUNT(e.employee_id) AS employee_count,
    ROUND(AVG(e.salary), 2) AS avg_salary,
    MAX(e.salary) AS max_salary,
    (SELECT e2.name FROM employees e2 
     WHERE e2.department_id = d.department_id 
     ORDER BY e2.salary DESC LIMIT 1) AS highest_earner
FROM departments d
JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name
HAVING AVG(e.salary) > (SELECT AVG(salary) FROM employees)
ORDER BY avg_salary DESC;
```

---

## Round 2: Core CS + DSA
**Duration:** 60 minutes | **Interviewer:** VP

### Questions Asked
1. **OOP Concepts**: Explain SOLID with real examples
2. **Producer-Consumer Problem** — implement with Java concurrency
3. **Merge Sorted Arrays in-place** (LeetCode 88)

### 💡 Interview-Ready Answer — SOLID Principles

```
S — Single Responsibility
  Bad:  UserService does authentication + email sending + logging
  Good: UserService, AuthService, EmailService, LogService

O — Open/Closed
  Bad:  if (shape == "circle") {...} else if (shape == "square") {...}
  Good: Shape interface → Circle implements Shape, Square implements Shape
        Add Triangle without modifying existing code

L — Liskov Substitution
  Bad:  Square extends Rectangle (breaking setWidth/setHeight invariant)
  Good: Both implement Shape interface independently

I — Interface Segregation
  Bad:  Worker interface with work() + eat() — robots can't eat
  Good: Workable interface (work()) + Feedable interface (eat())

D — Dependency Inversion
  Bad:  OrderService creates new MySQLDatabase() directly
  Good: OrderService takes Database interface → inject any implementation
```

### 💡 Interview-Ready Answer — Producer-Consumer

```java
class ProducerConsumer {
    private final BlockingQueue<Integer> queue;
    private volatile boolean running = true;
    
    ProducerConsumer(int capacity) {
        this.queue = new ArrayBlockingQueue<>(capacity);
    }
    
    // Producer
    void produce() throws InterruptedException {
        int value = 0;
        while (running) {
            queue.put(value); // blocks if queue is full
            System.out.println("Produced: " + value);
            value++;
        }
    }
    
    // Consumer
    void consume() throws InterruptedException {
        while (running) {
            Integer value = queue.take(); // blocks if queue is empty
            System.out.println("Consumed: " + value);
            // process value
        }
    }
    
    void stop() { running = false; }
    
    // Manual implementation without BlockingQueue
    static class ManualPC<T> {
        private final Object[] buffer;
        private int head, tail, count;
        private final Object lock = new Object();
        
        ManualPC(int capacity) {
            buffer = new Object[capacity];
        }
        
        void produce(T item) throws InterruptedException {
            synchronized (lock) {
                while (count == buffer.length) lock.wait(); // full
                buffer[tail] = item;
                tail = (tail + 1) % buffer.length;
                count++;
                lock.notifyAll();
            }
        }
        
        @SuppressWarnings("unchecked")
        T consume() throws InterruptedException {
            synchronized (lock) {
                while (count == 0) lock.wait(); // empty
                T item = (T) buffer[head];
                buffer[head] = null;
                head = (head + 1) % buffer.length;
                count--;
                lock.notifyAll();
                return item;
            }
        }
    }
}
```

---

## Round 3: System Design
**Duration:** 60 minutes | **Interviewer:** Executive Director

### Questions Asked
1. **Design a Stock Trading Platform**
   - Order matching, order book, market data, risk management

### 💡 Interview-Ready Answer

#### Architecture
```
┌──────────────────────────────────────────────────────────────┐
│  Trading Client (Bloomberg Terminal / Web / API)              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Order Gateway                                                │
│  - Authentication (2FA, API keys)                            │
│  - Input validation (price limits, quantity limits)          │
│  - Rate limiting per trader                                  │
│  - Risk pre-check (position limits, margin check)            │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Order Management System (OMS)                                │
│  - Order state management (NEW → PARTIAL → FILLED → CANCELLED)│
│  - Order routing (which exchange/dark pool)                   │
│  - Smart order routing (best execution)                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Matching Engine (Core)                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    Order Book                           │  │
│  │                                                         │  │
│  │  Buy Orders (Bids)          Sell Orders (Asks)         │  │
│  │  Price │ Qty │ Time        Price │ Qty │ Time         │  │
│  │  ──────┼─────┼──────       ──────┼─────┼──────        │  │
│  │  150.5 │ 100 │ 09:01       150.6 │  50 │ 09:00       │  │
│  │  150.4 │ 200 │ 09:00       150.7 │ 150 │ 09:01       │  │
│  │  150.3 │  50 │ 09:02       150.8 │ 300 │ 09:00       │  │
│  │                                                         │  │
│  │  Matching: Price-Time Priority (FIFO at same price)    │  │
│  │  Buy at 150.6 matches Sell at 150.6 → Trade!          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### Order Book Implementation
```java
class OrderBook {
    // Buy side: highest price first (max-heap)
    TreeMap<Double, LinkedList<Order>> bids = new TreeMap<>(Collections.reverseOrder());
    // Sell side: lowest price first (min-heap)  
    TreeMap<Double, LinkedList<Order>> asks = new TreeMap<>();
    
    List<Trade> addOrder(Order order) {
        List<Trade> trades = new ArrayList<>();
        
        if (order.side == Side.BUY) {
            // Match against asks
            while (!asks.isEmpty() && order.remainingQty > 0) {
                Map.Entry<Double, LinkedList<Order>> bestAsk = asks.firstEntry();
                if (order.price < bestAsk.getKey()) break; // no match
                
                LinkedList<Order> askQueue = bestAsk.getValue();
                Order matchOrder = askQueue.peek();
                
                int matchQty = Math.min(order.remainingQty, matchOrder.remainingQty);
                double matchPrice = matchOrder.price; // price-time priority: maker's price
                
                trades.add(new Trade(order.orderId, matchOrder.orderId, matchPrice, matchQty));
                
                order.remainingQty -= matchQty;
                matchOrder.remainingQty -= matchQty;
                
                if (matchOrder.remainingQty == 0) {
                    askQueue.poll();
                    if (askQueue.isEmpty()) asks.pollFirstEntry();
                }
            }
            
            // If order not fully filled, add to bid book
            if (order.remainingQty > 0 && order.type == OrderType.LIMIT) {
                bids.computeIfAbsent(order.price, k -> new LinkedList<>()).add(order);
            }
        } else {
            // Mirror logic for SELL orders against bids
            while (!bids.isEmpty() && order.remainingQty > 0) {
                Map.Entry<Double, LinkedList<Order>> bestBid = bids.firstEntry();
                if (order.price > bestBid.getKey()) break;
                
                LinkedList<Order> bidQueue = bestBid.getValue();
                Order matchOrder = bidQueue.peek();
                
                int matchQty = Math.min(order.remainingQty, matchOrder.remainingQty);
                trades.add(new Trade(order.orderId, matchOrder.orderId, matchOrder.price, matchQty));
                
                order.remainingQty -= matchQty;
                matchOrder.remainingQty -= matchQty;
                
                if (matchOrder.remainingQty == 0) {
                    bidQueue.poll();
                    if (bidQueue.isEmpty()) bids.pollFirstEntry();
                }
            }
            
            if (order.remainingQty > 0 && order.type == OrderType.LIMIT) {
                asks.computeIfAbsent(order.price, k -> new LinkedList<>()).add(order);
            }
        }
        
        return trades;
    }
    
    void cancelOrder(String orderId) {
        // Need orderId → (side, price) index for O(1) cancelation
        // In production: maintain HashMap<orderId, Order> + remove from TreeMap
    }
}
```

#### Latency Requirements
```
Matching engine latency: < 100 microseconds (not milliseconds!)
Order gateway to match: < 1ms
Market data dissemination: < 5ms

Techniques for ultra-low latency:
1. In-memory only (no disk I/O in hot path)
2. Lock-free data structures (Disruptor pattern)
3. Kernel bypass networking (DPDK)
4. CPU affinity (pin threads to cores)
5. Pre-allocated memory (no GC pauses)
6. Single-threaded matching engine (avoid lock contention)
```

---

## Round 4: Behavioral + Technical
**Duration:** 60 minutes | **Interviewer:** Managing Director

### Questions Asked
1. **"Why Goldman Sachs?"**
2. **"Explain multithreading vs multiprocessing with a real example"**
3. **"Describe your leadership in a team project"**

### 💡 Interview-Ready Answer — MT vs MP

| Aspect | Multithreading | Multiprocessing |
|--------|---------------|-----------------|
| **Memory** | Shared (same address space) | Separate (isolated) |
| **Communication** | Fast (shared variables) | IPC (pipes, sockets, shared memory) |
| **Overhead** | Low (lightweight context switch) | High (process creation, memory duplication) |
| **Safety** | Needs synchronization (locks, CAS) | Naturally isolated (harder to corrupt) |
| **Use Case** | I/O-bound tasks, web servers | CPU-bound tasks, data processing |
| **GIL (Python)** | Limited by GIL (use multiprocessing) | Each process has own GIL (true parallelism) |

**Real Example:**
> "For our web server, we use multithreading — 200 threads handling concurrent HTTP requests, sharing the connection pool and cache. For our risk calculation engine that runs Monte Carlo simulations, we use multiprocessing — 32 worker processes each running independent simulations on separate CPU cores. The web server needs low-latency shared state access; the risk engine needs true CPU parallelism."

---

## 🎯 Key Takeaways
- Goldman Sachs interviews test **core CS fundamentals** deeply (OOP, DBMS, OS, concurrency)
- **Stock Trading Platform** is the signature GS system design question — know order books and matching
- **Producer-Consumer** is asked in almost every GS interview — know both BlockingQueue and manual implementation
- **SOLID principles** with real examples, not just definitions
- **SQL skills** are mandatory — complex JOINs, GROUP BY, HAVING, subqueries
- **Ultra-low latency** concepts (lock-free, kernel bypass, CPU affinity) are important for trading platform design
- GS interviews are **more traditional** than FAANG — strong on CS theory + Java internals

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Medium | Backtracking, Greedy, SQL |
| Round 2 | Medium-Hard | SOLID, Concurrency, Array |
| Round 3 | Very Hard | Order Book, Matching Engine, Ultra-Low Latency |
| Round 4 | Medium | OS Concepts, Behavioral, Leadership |
