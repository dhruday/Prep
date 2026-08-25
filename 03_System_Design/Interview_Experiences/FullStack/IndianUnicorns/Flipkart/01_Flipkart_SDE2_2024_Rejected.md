# Flipkart — SDE-2 Interview Experience (2024)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-2 |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | 2024 |
| **Result** | ❌ Rejected (after Round 4) |
| **Location** | Bangalore (Onsite) |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience-for-sde-2/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (2 Telephonic + 1 Machine Coding + 1 F2F Onsite)
- **Timeline:** ~3 weeks
- **Format:** Telephonic (phone + shared editor) → Onsite (whiteboard + laptop for machine coding)
- **Key Focus:** DSA (heavy), Machine Coding (OOP/LLD), Problem Solving depth

---

## Round 1: Telephonic — DSA + System Concepts
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Tech Discussion:** IoC, Dependency Injection, advantages
2. **Alien Dictionary** — Given sorted words from alien language, find character order
3. **Binary Search on Answer** — N stalls on x-axis, k people, maximize minimum distance

### 💡 Interview-Ready Answers

**Q1: IoC and Dependency Injection**

> **Inversion of Control (IoC):** A design principle where the control of object creation and lifecycle is transferred from the application code to a framework/container. Instead of `new Service()`, the container injects dependencies.

> **Dependency Injection (DI):** A specific implementation of IoC where dependencies are injected via constructor, setter, or interface injection.

```java
// WITHOUT DI (tightly coupled)
class OrderService {
    private PaymentGateway gateway = new StripeGateway(); // hardcoded
}

// WITH DI (loosely coupled)
class OrderService {
    private final PaymentGateway gateway;
    
    @Inject // constructor injection
    OrderService(PaymentGateway gateway) {
        this.gateway = gateway;
    }
}
```

**Advantages:** Testability (mock dependencies), loose coupling, single responsibility, easier to swap implementations.

---

**Q2: Alien Dictionary — Topological Sort**

```java
public String alienOrder(String[] words) {
    // Build adjacency list from word comparisons
    Map<Character, Set<Character>> graph = new HashMap<>();
    Map<Character, Integer> inDegree = new HashMap<>();
    
    // Initialize all characters
    for (String word : words) {
        for (char c : word.toCharArray()) {
            graph.putIfAbsent(c, new HashSet<>());
            inDegree.putIfAbsent(c, 0);
        }
    }
    
    // Compare adjacent words to find ordering
    for (int i = 0; i < words.length - 1; i++) {
        String w1 = words[i], w2 = words[i + 1];
        
        // Edge case: "abc" before "ab" is invalid
        if (w1.length() > w2.length() && w1.startsWith(w2)) return "";
        
        for (int j = 0; j < Math.min(w1.length(), w2.length()); j++) {
            if (w1.charAt(j) != w2.charAt(j)) {
                char from = w1.charAt(j), to = w2.charAt(j);
                if (graph.get(from).add(to)) { // new edge
                    inDegree.merge(to, 1, Integer::sum);
                }
                break; // only first diff matters
            }
        }
    }
    
    // BFS Topological Sort (Kahn's Algorithm)
    Queue<Character> queue = new LinkedList<>();
    for (var entry : inDegree.entrySet()) {
        if (entry.getValue() == 0) queue.offer(entry.getKey());
    }
    
    StringBuilder result = new StringBuilder();
    while (!queue.isEmpty()) {
        char c = queue.poll();
        result.append(c);
        for (char neighbor : graph.get(c)) {
            inDegree.merge(neighbor, -1, Integer::sum);
            if (inDegree.get(neighbor) == 0) queue.offer(neighbor);
        }
    }
    
    // If not all chars processed, there's a cycle
    return result.length() == inDegree.size() ? result.toString() : "";
}
```

**Time:** O(C) where C = total characters across all words
**Space:** O(U + E) where U = unique characters, E = edges

**Edge Cases:**
- Single word → return characters in any order
- All identical words → return characters, any order
- Cycle in ordering → invalid, return ""
- Prefix conflict: ["abc", "ab"] → invalid ordering

---

**Q3: Maximize Minimum Distance — Binary Search on Answer**

```java
public int maxMinDistance(int[] stalls, int k) {
    Arrays.sort(stalls);
    int low = 1; // minimum possible distance
    int high = stalls[stalls.length - 1] - stalls[0]; // max possible distance
    int result = 0;
    
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (canPlace(stalls, k, mid)) {
            result = mid;
            low = mid + 1; // try for larger distance
        } else {
            high = mid - 1;
        }
    }
    return result;
}

private boolean canPlace(int[] stalls, int k, int minDist) {
    int count = 1; // place first person at first stall
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

**Time:** O(n log n + n log(max_dist)) — sort + binary search × linear scan
**Space:** O(1) extra

---

## Round 2: Telephonic — DSA Deep Dive
**Duration:** 60 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Paint Houses** — N houses, 3 colors (R/G/B), minimize cost, no adjacent same color
2. **Immutable Stack** — Create stack where push/pop create new stacks (persistent data structure)
3. **Knight Dialer / Numeric Keypad** — Count n-length numbers from starting digit, moving to adjacent keys

### 💡 Interview-Ready Answers

**Q1: Paint Houses — DP**

```java
public int minCost(int[][] costs) {
    if (costs == null || costs.length == 0) return 0;
    int n = costs.length;
    
    // dp[i][j] = min cost to paint houses 0..i where house i is color j
    // Optimize: only need previous row
    int prevR = costs[0][0], prevG = costs[0][1], prevB = costs[0][2];
    
    for (int i = 1; i < n; i++) {
        int currR = costs[i][0] + Math.min(prevG, prevB);
        int currG = costs[i][1] + Math.min(prevR, prevB);
        int currB = costs[i][2] + Math.min(prevR, prevG);
        prevR = currR; prevG = currG; prevB = currB;
    }
    
    return Math.min(prevR, Math.min(prevG, prevB));
}
```

**Time:** O(n), **Space:** O(1) — constant space with rolling variables

---

**Q2: Immutable/Persistent Stack**

Key insight: Use linked list where push creates a new head pointing to existing list. Old stacks remain untouched (immutable).

```java
class ImmutableStack<T> {
    private final T head;
    private final ImmutableStack<T> tail;
    private final int size;
    
    // Empty stack
    private static final ImmutableStack<?> EMPTY = new ImmutableStack<>();
    
    private ImmutableStack() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }
    
    private ImmutableStack(T head, ImmutableStack<T> tail) {
        this.head = head;
        this.tail = tail;
        this.size = tail.size + 1;
    }
    
    @SuppressWarnings("unchecked")
    public static <T> ImmutableStack<T> empty() { 
        return (ImmutableStack<T>) EMPTY; 
    }
    
    // Push returns NEW stack (O(1) — shares tail with old stack)
    public ImmutableStack<T> push(T value) {
        return new ImmutableStack<>(value, this);
    }
    
    // Pop returns NEW stack (O(1) — just returns existing tail)
    public ImmutableStack<T> pop() {
        if (isEmpty()) throw new EmptyStackException();
        return tail;
    }
    
    public T peek() {
        if (isEmpty()) throw new EmptyStackException();
        return head;
    }
    
    public boolean isEmpty() { return size == 0; }
    public int size() { return size; }
}
```

```
// Usage:
s1 = empty.push(10)     → [10]        (s1 exists, 1 node)
s2 = s1.push(20)        → [20→10]     (s2 exists, s1 still [10])
s3 = s2.push(30)        → [30→20→10]  (all 3 stacks exist)
s4 = s3.pop()           → [20→10]     (s4 ≡ s2, shares same nodes)
```

**Space optimization:** O(1) per push/pop because nodes are shared (structural sharing)
**All stacks remain valid and unchanged** — true immutability

---

**Q3: Knight Dialer / Numeric Keypad Paths**

```java
public int countPaths(int startDigit, int n) {
    // Adjacency: which digits can reach which
    int[][] moves = {
        {0, 8}, {1, 2, 4}, {2, 1, 3, 5}, {3, 2, 6},
        {4, 1, 5, 7}, {5, 2, 4, 6, 8}, {6, 3, 5, 9},
        {7, 4, 8}, {8, 0, 5, 7, 9}, {9, 6, 8}
    };
    
    int MOD = 1_000_000_007;
    long[] dp = new long[10]; // dp[digit] = count of paths ending at digit
    dp[startDigit] = 1;
    
    for (int step = 1; step < n; step++) {
        long[] newDp = new long[10];
        for (int digit = 0; digit <= 9; digit++) {
            if (dp[digit] > 0) {
                for (int next : moves[digit]) {
                    newDp[next] = (newDp[next] + dp[digit]) % MOD;
                }
            }
        }
        dp = newDp;
    }
    
    long total = 0;
    for (long count : dp) total = (total + count) % MOD;
    return (int) total;
}
```

**Time:** O(n × 10 × avg_neighbors) ≈ O(n × 40) = O(n)
**Space:** O(1) — only 10-element arrays

---

## Round 3: Machine Coding — OOP/LLD
**Duration:** 90 minutes | **Interviewer:** SDE-3

### Questions Asked
1. **Design a Task Planner** (like Jira Sprint Board)
   - Task types: Bug, Feature, Story
   - Sprint: collection of tasks
   - Operations: create sprint, add task, change assignee/status, show tasks per sprint/per user

### 💡 Interview-Ready Answer

```java
// ---- Enums ----
enum TaskType { BUG, FEATURE, STORY }
enum TaskStatus { OPEN, IN_PROGRESS, TESTING, DONE }

// ---- Models ----
class Task {
    private final String id;
    private final TaskType type;
    private String title;
    private String description;
    private String assignee;
    private TaskStatus status;
    private final LocalDateTime createdAt;
    
    public Task(String id, TaskType type, String title) {
        this.id = id;
        this.type = type;
        this.title = title;
        this.status = TaskStatus.OPEN;
        this.createdAt = LocalDateTime.now();
    }
    
    // getters, setters...
    public void setAssignee(String assignee) { this.assignee = assignee; }
    public void setStatus(TaskStatus status) { this.status = status; }
    public String getId() { return id; }
    public TaskType getType() { return type; }
    public String getAssignee() { return assignee; }
    public TaskStatus getStatus() { return status; }
    public String getTitle() { return title; }
}

class Sprint {
    private final String id;
    private final String name;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final Map<String, Task> tasks; // taskId → Task
    
    public Sprint(String id, String name, LocalDate start, LocalDate end) {
        this.id = id;
        this.name = name;
        this.startDate = start;
        this.endDate = end;
        this.tasks = new LinkedHashMap<>();
    }
    
    public void addTask(Task task) { tasks.put(task.getId(), task); }
    public void removeTask(String taskId) { tasks.remove(taskId); }
    
    public List<Task> getAllTasks() { return new ArrayList<>(tasks.values()); }
    
    public List<Task> getTasksByStatus(TaskStatus status) {
        return tasks.values().stream()
            .filter(t -> t.getStatus() == status)
            .collect(Collectors.toList());
    }
    
    public List<Task> getTasksByAssignee(String assignee) {
        return tasks.values().stream()
            .filter(t -> assignee.equals(t.getAssignee()))
            .collect(Collectors.toList());
    }
    
    public String getId() { return id; }
}

// ---- Service Layer ----
class TaskPlanner {
    private final Map<String, Sprint> sprints = new HashMap<>();
    private final Map<String, Task> allTasks = new HashMap<>();
    private final Map<String, Set<String>> userTasks = new HashMap<>(); // user → taskIds
    private int taskCounter = 0;
    private int sprintCounter = 0;
    
    // Sprint operations
    public Sprint createSprint(String name, LocalDate start, LocalDate end) {
        String id = "SPR-" + (++sprintCounter);
        Sprint sprint = new Sprint(id, name, start, end);
        sprints.put(id, sprint);
        return sprint;
    }
    
    // Task operations
    public Task createTask(TaskType type, String title) {
        String prefix = type == TaskType.BUG ? "BUG" : type == TaskType.FEATURE ? "FEAT" : "STORY";
        String id = prefix + "-" + (++taskCounter);
        Task task = new Task(id, type, title);
        allTasks.put(id, task);
        return task;
    }
    
    public void addTaskToSprint(String sprintId, String taskId) {
        Sprint sprint = sprints.get(sprintId);
        Task task = allTasks.get(taskId);
        if (sprint == null || task == null) throw new IllegalArgumentException("Invalid ID");
        sprint.addTask(task);
    }
    
    public void changeAssignee(String taskId, String newAssignee) {
        Task task = allTasks.get(taskId);
        if (task == null) throw new IllegalArgumentException("Task not found");
        
        // Remove from old assignee's set
        String oldAssignee = task.getAssignee();
        if (oldAssignee != null) {
            userTasks.getOrDefault(oldAssignee, new HashSet<>()).remove(taskId);
        }
        
        // Add to new assignee's set
        task.setAssignee(newAssignee);
        userTasks.computeIfAbsent(newAssignee, k -> new HashSet<>()).add(taskId);
    }
    
    public void changeStatus(String taskId, TaskStatus newStatus) {
        Task task = allTasks.get(taskId);
        if (task == null) throw new IllegalArgumentException("Task not found");
        task.setStatus(newStatus);
    }
    
    // Query operations
    public List<Task> getSprintTasks(String sprintId) {
        Sprint sprint = sprints.get(sprintId);
        return sprint != null ? sprint.getAllTasks() : Collections.emptyList();
    }
    
    public List<Task> getUserTasks(String userId) {
        Set<String> taskIds = userTasks.getOrDefault(userId, Collections.emptySet());
        return taskIds.stream()
            .map(allTasks::get)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }
    
    public void printSprintBoard(String sprintId) {
        Sprint sprint = sprints.get(sprintId);
        if (sprint == null) return;
        
        System.out.println("=== Sprint: " + sprint.getId() + " ===");
        for (TaskStatus status : TaskStatus.values()) {
            System.out.println("\n--- " + status + " ---");
            sprint.getTasksByStatus(status).forEach(t -> 
                System.out.printf("  [%s] %s (%s) → %s%n", 
                    t.getId(), t.getTitle(), t.getType(), 
                    t.getAssignee() != null ? t.getAssignee() : "Unassigned"));
        }
    }
}
```

**Design Decisions:**
- `LinkedHashMap` for tasks → preserves insertion order
- Separate `userTasks` index → O(1) lookup for user's tasks instead of scanning
- ID generation with type prefix → human-readable IDs (BUG-1, FEAT-2, STORY-3)
- Sprint is a self-contained unit → can query tasks within a sprint efficiently

---

## Round 4: F2F Onsite — DSA (Hard)
**Duration:** 60 minutes | **Interviewer:** Senior SDE

### Questions Asked
1. **Group Photo Problem** — N teams, M members each with heights. Arrange in rows so person in row i is taller than corresponding person in row i-1. Maximize teams in photo.
2. **Find Median from Data Stream** — Running median as integers arrive
3. **Largest Number Divisible by 3** — From array of digits 0-9

### 💡 Interview-Ready Answers

**Q2: Running Median — Two Heaps**

```java
class MedianFinder {
    private PriorityQueue<Integer> maxHeap; // lower half
    private PriorityQueue<Integer> minHeap; // upper half
    
    public MedianFinder() {
        maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minHeap = new PriorityQueue<>();
    }
    
    public void addNum(int num) {
        maxHeap.offer(num);
        minHeap.offer(maxHeap.poll()); // balance
        
        // Keep maxHeap.size >= minHeap.size
        if (maxHeap.size() < minHeap.size()) {
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

**Q3: Largest Number Divisible by 3**

Key insight: A number is divisible by 3 if the sum of its digits is divisible by 3. Sort digits descending. If sum % 3 != 0, remove the smallest digit(s) with matching remainder.

```java
public String largestDivisibleBy3(int[] digits) {
    Arrays.sort(digits);
    int sum = 0;
    for (int d : digits) sum += d;
    
    if (sum % 3 == 0) {
        return buildNumber(digits);
    }
    
    int remainder = sum % 3;
    
    // Try removing one digit with same remainder
    for (int i = 0; i < digits.length; i++) {
        if (digits[i] % 3 == remainder) {
            return buildNumberExcluding(digits, new int[]{i});
        }
    }
    
    // Try removing two digits with remainder (3 - remainder)
    int target = 3 - remainder;
    List<Integer> toRemove = new ArrayList<>();
    for (int i = 0; i < digits.length && toRemove.size() < 2; i++) {
        if (digits[i] % 3 == target) {
            toRemove.add(i);
        }
    }
    if (toRemove.size() == 2) {
        return buildNumberExcluding(digits, toRemove.stream().mapToInt(Integer::intValue).toArray());
    }
    
    return ""; // impossible
}

private String buildNumber(int[] digits) {
    StringBuilder sb = new StringBuilder();
    for (int i = digits.length - 1; i >= 0; i--) sb.append(digits[i]);
    return sb.length() > 0 && sb.charAt(0) == '0' ? "0" : sb.toString();
}
```

---

## 🎯 Key Takeaways
- Flipkart SDE-2 interviews are **DSA-heavy** — 3 of 4 rounds had DSA
- **Machine Coding round** is uniquely Flipkart — practice LLD with working code in 90 minutes
- **Topological Sort** and **Binary Search on Answer** are Flipkart favorites
- The group photo problem is a **creative sorting + greedy** problem — think beyond standard patterns
- **Persistent/Immutable data structures** test understanding of structural sharing
- Being eliminated after Round 4 means the DSA rounds need to be near-perfect

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Round 1 (Phone) | Medium-Hard | Topological Sort, Binary Search on Answer |
| Round 2 (Phone) | Hard | DP, Persistent DS, Graph on Grid |
| Round 3 (Machine Coding) | Medium | OOP, LLD, Sprint Board Design |
| Round 4 (F2F) | Hard | Greedy+Sorting, Two Heaps, Math |
