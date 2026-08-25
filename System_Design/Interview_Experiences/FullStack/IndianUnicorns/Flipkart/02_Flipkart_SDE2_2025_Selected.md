# Flipkart — SDE-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | Software Development Engineer 2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Telephonic + Machine Coding + 2 F2F Onsite)
- **Timeline:** 3 weeks
- **Format:** First 2 rounds telephonic, remaining onsite at Flipkart Bangalore
- **Note:** Flipkart's Machine Coding round is unique — 90 min to build a working system

---

## Round 1: Telephonic — DSA + Tech Discussion
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Technology discussion** — IoC, Dependency Injection, advantages
2. **Alien Dictionary** (LeetCode 269) — Given sorted words, find character ordering
3. **Binary Search: Aggressive Cows** — Place k cows in n stalls to maximize minimum distance

### 💡 Interview-Ready Answer — IoC & Dependency Injection

> **What is IoC (Inversion of Control)?**
> Traditional: Your code creates objects it depends on. IoC: A framework/container creates and injects dependencies FOR you.
>
> **Relationship with DI:** DI is the primary mechanism to achieve IoC. Instead of `new DatabaseService()` inside your class, the container injects it via constructor/setter.
>
> **Advantages:**
> 1. **Testability** — Inject mocks for unit testing
> 2. **Loose coupling** — Classes depend on interfaces, not implementations
> 3. **Single Responsibility** — Object creation separated from business logic
> 4. **Configuration flexibility** — Swap implementations without code changes (e.g., MySQL → PostgreSQL)

### 💡 Interview-Ready Answer — Aggressive Cows (Binary Search on Answer)

```java
public int aggressiveCows(int[] stalls, int k) {
    Arrays.sort(stalls);
    int lo = 1; // minimum possible distance
    int hi = stalls[stalls.length - 1] - stalls[0]; // maximum possible distance
    int result = 0;
    
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (canPlace(stalls, k, mid)) {
            result = mid;
            lo = mid + 1; // try larger distance
        } else {
            hi = mid - 1; // reduce distance
        }
    }
    return result;
}

private boolean canPlace(int[] stalls, int k, int minDist) {
    int count = 1; // place first cow at stalls[0]
    int lastPos = stalls[0];
    
    for (int i = 1; i < stalls.length; i++) {
        if (stalls[i] - lastPos >= minDist) {
            count++;
            lastPos = stalls[i];
            if (count == k) return true;
        }
    }
    return false;
}
```
**Time:** O(n log(maxDist)), **Space:** O(1)

**Key Insight:** Binary search on the answer! Instead of trying all placements, search for the maximum minimum distance that allows placing all k cows.

---

## Round 2: Telephonic — DSA
**Duration:** 60 minutes | **Interviewer:** SDE-2

### Questions Asked
1. **House Painting Problem** — N houses, 3 colors (R/G/B), costs given, no two adjacent same color, minimize cost
2. **Immutable Stack** — Space-optimized approach
3. **Mobile Numeric Keypad** — Count numbers of length n starting from digit d

### 💡 Interview-Ready Answer — House Painting (DP)

```java
public int minCostPaint(int[][] costs) {
    // costs[i][j] = cost to paint house i with color j (0=R, 1=G, 2=B)
    int n = costs.length;
    if (n == 0) return 0;
    
    // dp[i][j] = min cost to paint houses 0..i where house i is color j
    int[][] dp = new int[n][3];
    dp[0] = costs[0].clone();
    
    for (int i = 1; i < n; i++) {
        dp[i][0] = costs[i][0] + Math.min(dp[i-1][1], dp[i-1][2]);
        dp[i][1] = costs[i][1] + Math.min(dp[i-1][0], dp[i-1][2]);
        dp[i][2] = costs[i][2] + Math.min(dp[i-1][0], dp[i-1][1]);
    }
    
    return Math.min(dp[n-1][0], Math.min(dp[n-1][1], dp[n-1][2]));
}

// Space optimized O(1):
public int minCostPaintOptimized(int[][] costs) {
    int r = costs[0][0], g = costs[0][1], b = costs[0][2];
    
    for (int i = 1; i < costs.length; i++) {
        int nr = costs[i][0] + Math.min(g, b);
        int ng = costs[i][1] + Math.min(r, b);
        int nb = costs[i][2] + Math.min(r, g);
        r = nr; g = ng; b = nb;
    }
    return Math.min(r, Math.min(g, b));
}
```
**Time:** O(n), **Space:** O(1) optimized

### 💡 Interview-Ready Answer — Immutable Stack (Persistent Data Structure)

```java
// Key: Each "push" creates a new stack that shares structure with old
// LinkedList-based: new top node points to previous stack's top
class ImmutableStack<T> {
    private final T head;
    private final ImmutableStack<T> tail;
    private final int size;
    
    private ImmutableStack(T head, ImmutableStack<T> tail) {
        this.head = head;
        this.tail = tail;
        this.size = (tail == null) ? 1 : tail.size + 1;
    }
    
    public static <T> ImmutableStack<T> empty() {
        return new ImmutableStack<>(null, null) {
            @Override public T peek() { throw new EmptyStackException(); }
            @Override public ImmutableStack<T> pop() { throw new EmptyStackException(); }
            @Override public boolean isEmpty() { return true; }
        };
    }
    
    public ImmutableStack<T> push(T value) {
        return new ImmutableStack<>(value, this);
    }
    
    public T peek() { return head; }
    
    public ImmutableStack<T> pop() { return tail; }
    
    public boolean isEmpty() { return false; }
    
    public int size() { return size; }
}

// Usage:
// s1 = empty.push(10)        → [10]
// s2 = s1.push(20)           → [20, 10]  (s1 still [10])
// s3 = s2.push(30)           → [30, 20, 10]
// s4 = s3.pop()              → [20, 10]  (s3 still [30, 20, 10])
// All 4 stacks exist simultaneously!
// Space: O(n) total for n operations (structural sharing via pointers)
```

**Space Optimization:** Each push/pop creates only 1 new node — all stacks share the underlying linked structure. This is the key insight the interviewer wanted.

---

## Round 3: Machine Coding (Onsite)
**Duration:** 90 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Design a Task Planner (Sprint Management)** — Like a mini Jira
   - Task types: Bug, Feature, Story
   - Attributes: title, assignee, status, priority, sprint
   - Operations: Create Sprint, Add Task, Change assignee/status, Show all tasks by sprint, Show all tasks by user

### 💡 Interview-Ready Answer

```java
// Enums
enum TaskType { BUG, FEATURE, STORY }
enum TaskStatus { TODO, IN_PROGRESS, IN_REVIEW, DONE }
enum Priority { LOW, MEDIUM, HIGH, CRITICAL }

// Core Entities
class Task {
    private final String taskId;
    private String title;
    private TaskType type;
    private TaskStatus status;
    private Priority priority;
    private String assignee;
    private String sprintId;
    private LocalDateTime createdAt;
    
    Task(String title, TaskType type, Priority priority) {
        this.taskId = "TASK-" + UUID.randomUUID().toString().substring(0, 8);
        this.title = title;
        this.type = type;
        this.priority = priority;
        this.status = TaskStatus.TODO;
        this.createdAt = LocalDateTime.now();
    }
    
    // getters, setters
    void assignTo(String user) { this.assignee = user; }
    void updateStatus(TaskStatus status) { this.status = status; }
    void moveTo(String sprintId) { this.sprintId = sprintId; }
}

class Sprint {
    private final String sprintId;
    private String name;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<String> taskIds; // task IDs in this sprint
    
    Sprint(String name, LocalDateTime start, LocalDateTime end) {
        this.sprintId = "SPR-" + UUID.randomUUID().toString().substring(0, 8);
        this.name = name;
        this.startDate = start;
        this.endDate = end;
        this.taskIds = new ArrayList<>();
    }
    
    void addTask(String taskId) { taskIds.add(taskId); }
    void removeTask(String taskId) { taskIds.remove(taskId); }
}

// Service Layer
class TaskPlanner {
    private Map<String, Task> tasks = new HashMap<>();
    private Map<String, Sprint> sprints = new HashMap<>();
    
    // Indexes for fast lookup
    private Map<String, Set<String>> userTasks = new HashMap<>();     // user → taskIds
    private Map<String, Set<String>> sprintTasks = new HashMap<>();   // sprintId → taskIds
    
    // Create operations
    public Sprint createSprint(String name, LocalDateTime start, LocalDateTime end) {
        Sprint sprint = new Sprint(name, start, end);
        sprints.put(sprint.getSprintId(), sprint);
        sprintTasks.put(sprint.getSprintId(), new LinkedHashSet<>());
        return sprint;
    }
    
    public Task createTask(String title, TaskType type, Priority priority) {
        Task task = new Task(title, type, priority);
        tasks.put(task.getTaskId(), task);
        return task;
    }
    
    // Add task to sprint
    public void addTaskToSprint(String taskId, String sprintId) {
        Task task = getTask(taskId);
        Sprint sprint = getSprint(sprintId);
        
        // Remove from previous sprint if exists
        if (task.getSprintId() != null) {
            sprintTasks.get(task.getSprintId()).remove(taskId);
        }
        
        task.moveTo(sprintId);
        sprint.addTask(taskId);
        sprintTasks.get(sprintId).add(taskId);
    }
    
    // Assign task
    public void assignTask(String taskId, String user) {
        Task task = getTask(taskId);
        
        // Remove from previous assignee's index
        if (task.getAssignee() != null) {
            userTasks.getOrDefault(task.getAssignee(), new HashSet<>()).remove(taskId);
        }
        
        task.assignTo(user);
        userTasks.computeIfAbsent(user, k -> new LinkedHashSet<>()).add(taskId);
    }
    
    // Change status
    public void changeStatus(String taskId, TaskStatus status) {
        getTask(taskId).updateStatus(status);
    }
    
    // Queries
    public List<Task> getTasksBySprint(String sprintId) {
        return sprintTasks.getOrDefault(sprintId, Collections.emptySet())
            .stream()
            .map(tasks::get)
            .sorted(Comparator.comparing(Task::getPriority))
            .collect(Collectors.toList());
    }
    
    public List<Task> getTasksByUser(String user) {
        return userTasks.getOrDefault(user, Collections.emptySet())
            .stream()
            .map(tasks::get)
            .sorted(Comparator.comparing(Task::getStatus))
            .collect(Collectors.toList());
    }
    
    public List<Task> getTasksByType(TaskType type) {
        return tasks.values().stream()
            .filter(t -> t.getType() == type)
            .collect(Collectors.toList());
    }
    
    // Helpers
    private Task getTask(String taskId) {
        Task task = tasks.get(taskId);
        if (task == null) throw new IllegalArgumentException("Task not found: " + taskId);
        return task;
    }
    
    private Sprint getSprint(String sprintId) {
        Sprint sprint = sprints.get(sprintId);
        if (sprint == null) throw new IllegalArgumentException("Sprint not found: " + sprintId);
        return sprint;
    }
}
```

**Design Patterns Used:**
- Secondary indexes (`userTasks`, `sprintTasks`) for O(1) lookups
- Immutable IDs (UUID-based) for task/sprint identification
- Strategy pattern potential for sorting/filtering

**What interviewers look for in Machine Coding:**
1. **Clean OOP** — well-separated concerns
2. **Working code** — it should compile and run
3. **Edge cases handled** — null checks, reassignment cleanup
4. **Extensibility** — easy to add new task types, statuses
5. **Time complexity awareness** — secondary indexes, not scanning all tasks

---

## Round 4: F2F — DSA (Onsite)
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Group Photo Problem** — N teams, M members each with heights. Arrange in rows (one team per row). Person at row i must be taller than person at row i-1 in same column. Maximize teams in photo.
2. **Find Median in a Data Stream** (LeetCode 295)
3. **Largest Number Divisible by 3** from array of digits 0-9

### 💡 Interview-Ready Answer — Median in Data Stream

```java
class MedianFinder {
    PriorityQueue<Integer> maxHeap; // left half (smaller values)
    PriorityQueue<Integer> minHeap; // right half (larger values)
    
    public MedianFinder() {
        maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minHeap = new PriorityQueue<>();
    }
    
    public void addNum(int num) {
        maxHeap.offer(num);
        
        // Balance: ensure maxHeap's top <= minHeap's top
        minHeap.offer(maxHeap.poll());
        
        // Rebalance sizes: maxHeap can have at most 1 extra
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
**Time:** O(log n) per addNum, O(1) for findMedian
**Space:** O(n)

### 💡 Interview-Ready Answer — Largest Number Divisible by 3

```java
public String largestDivisibleBy3(int[] digits) {
    // Sort descending for largest number
    Arrays.sort(digits);
    // Reverse to descending
    int n = digits.length;
    
    int totalSum = 0;
    List<Integer> rem0 = new ArrayList<>(), rem1 = new ArrayList<>(), rem2 = new ArrayList<>();
    
    for (int d : digits) {
        totalSum += d;
        if (d % 3 == 0) rem0.add(d);
        else if (d % 3 == 1) rem1.add(d);
        else rem2.add(d);
    }
    
    // Sort each remainder group ascending (so we remove smallest first)
    Collections.sort(rem1);
    Collections.sort(rem2);
    
    int remainder = totalSum % 3;
    
    if (remainder == 1) {
        // Remove smallest digit with remainder 1, OR two smallest with remainder 2
        if (!rem1.isEmpty()) {
            rem1.remove(0);
        } else if (rem2.size() >= 2) {
            rem2.remove(0); rem2.remove(0);
        } else return "";
    } else if (remainder == 2) {
        if (!rem2.isEmpty()) {
            rem2.remove(0);
        } else if (rem1.size() >= 2) {
            rem1.remove(0); rem1.remove(0);
        } else return "";
    }
    
    // Combine remaining digits, sort descending, build number
    List<Integer> result = new ArrayList<>();
    result.addAll(rem0); result.addAll(rem1); result.addAll(rem2);
    result.sort(Collections.reverseOrder());
    
    if (result.isEmpty()) return "";
    if (result.get(0) == 0) return "0"; // all zeros
    
    StringBuilder sb = new StringBuilder();
    for (int d : result) sb.append(d);
    return sb.toString();
}
```
**Time:** O(n log n), **Space:** O(n)

---

## Round 5: F2F — System Design + Behavioral (Onsite)
**Duration:** 60 minutes | **Interviewer:** Engineering Manager

### Questions Asked
1. **Design Flipkart's Flash Sale System** — Handle 1M+ concurrent users for limited inventory items
2. **"Tell me about your biggest technical challenge"**

### 💡 Interview-Ready Answer — Flash Sale System

```
Key Challenge: 1M users, 100 items → extreme contention

Architecture:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CDN Layer  │     │  Rate Limiter│     │  Queue-based │
│  (Static     │────▶│  (Token      │────▶│  Processing  │
│   assets +   │     │   bucket per │     │              │
│   countdown) │     │   user)      │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                      ┌───────────────────────────┘
                      ▼
              ┌──────────────┐     ┌──────────────┐
              │  Redis Queue │────▶│  Order       │
              │  (First N    │     │  Processor   │
              │   users win) │     │  (Async)     │
              └──────────────┘     └──────────────┘

Strategy:
1. Pre-sale: All assets on CDN. Timer runs on frontend (no server calls).
2. Sale starts: Users hit "Buy Now" → Request goes to rate limiter
   - Each user gets MAX 1 request (dedup by user_id + item_id)
   - Redis LPUSH into queue (atomic, O(1))
3. Queue processor: RPOP first N users (N = inventory)
   - Winners get 5-min payment window
   - Losers get "Sold Out" instantly
4. Inventory: Redis counter (DECR atomic)
   - If counter > 0 → user qualifies
   - If counter ≤ 0 → instant reject (no DB call needed)

Key: NEVER let the DB see the traffic. Redis handles all contention.
     DB only processes N successful orders (100, not 1M).
```

---

## 🎯 Key Takeaways
- Flipkart's **Machine Coding round** is unique and heavily weighted — practice building complete systems in 90 min
- **Binary Search on Answer** pattern (aggressive cows) is a Flipkart favorite
- **Persistent/Immutable data structures** are tested — know how linked-list-based sharing works
- **Indian e-commerce system design** (flash sales, inventory) is common — understand the contention patterns
- Expect **3 DSA problems in a single round** — speed is critical
- Flipkart values **clean code over optimal code** in machine coding — make it compile and run

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 | Medium-Hard | Topological Sort, Binary Search on Answer |
| Round 2 | Medium | DP, Persistent Data Structures |
| Round 3 | Medium | OOP, Machine Coding, Indexing |
| Round 4 | Hard | Two Heaps, Greedy, Sorting |
| Round 5 | Hard | High Concurrency, Redis, Rate Limiting |
