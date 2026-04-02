# ☕ Java Advanced - FAANG Level (Senior Engineer 7+ YOE)

> **Target:** L5/E5/SDE-3 level depth  
> **Focus:** Production scenarios, JVM internals, performance optimization  
> **Not included:** Basic syntax, simple OOP concepts

---

## 📋 Table of Contents

1. [JVM Internals & Memory Model](#jvm-internals)
2. [Garbage Collection Deep Dive](#garbage-collection)
3. [Multithreading & Concurrency](#multithreading)
4. [Java Memory Model (JMM)](#java-memory-model)
5. [CompletableFuture & Async Programming](#completablefuture)
6. [Streams API Internals](#streams-api)
7. [Reflection & Dynamic Proxy](#reflection)
8. [ClassLoaders](#classloaders)
9. [Java 8-21 Features](#modern-java-features)
10. [Performance Tuning](#performance-tuning)
11. [Output-Based Tricky Questions](#output-questions)
12. [FAANG Interview Questions](#faang-questions)

---

## 🧠 JVM Internals & Memory Model

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  JVM Architecture                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ Class      │  │ Method      │  │ Heap         │ │
│  │ Loader     │→ │ Area        │  │              │ │
│  │ Subsystem  │  │ (Metadata)  │  │ (Objects)    │ │
│  └────────────┘  └─────────────┘  └──────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │            Execution Engine                   │  │
│  │  ┌────────┐  ┌────────┐  ┌────────────────┐ │  │
│  │  │ Inter- │  │ JIT    │  │ Garbage        │ │  │
│  │  │ preter │  │ Comp.  │  │ Collector      │ │  │
│  │  └────────┘  └────────┘  └────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │         Runtime Data Areas                    │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐ │  │
│  │  │ PC   │  │Native│  │Stack │  │ Heap     │ │  │
│  │  │ Reg. │  │Method│  │      │  │          │ │  │
│  │  └──────┘  │Stack │  └──────┘  └──────────┘ │  │
│  │            └──────┘                           │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Memory Areas Deep Dive

#### 1. **Heap Memory**

**Structure (Java 8+):**
```
Heap
├── Young Generation
│   ├── Eden Space (where new objects are created)
│   └── Survivor Spaces (S0 and S1)
└── Old Generation (Tenured)
    └── Long-lived objects
```

**Key Points:**
- **Shared** across all threads
- **Garbage collected**
- Size controlled by: `-Xms` (initial) and `-Xmx` (maximum)

**Example:**
```java
// These objects go to Heap
public class HeapExample {
    private String name;  // Instance variable → Heap
    private static int count;  // Static variable → Heap (Metaspace reference)
    
    public void method() {
        Person p = new Person();  // 'p' reference → Stack, Person object → Heap
        String s = new String("test");  // String object → Heap
    }
}
```

**Interview Question:**
> "Where does the string literal "test" go?"

**Answer:**
```java
String s1 = "test";        // String Pool (part of Heap in Java 7+)
String s2 = new String("test");  // Heap (outside String Pool)

System.out.println(s1 == s2);  // false (different memory locations)
System.out.println(s1 == s2.intern());  // true (intern() returns pool reference)
```

#### 2. **Stack Memory**

**Structure:**
```
Thread Stack
├── Stack Frame 1 (Current method)
│   ├── Local Variables
│   ├── Operand Stack
│   └── Frame Data (return address, exception table)
├── Stack Frame 2
└── Stack Frame 3
```

**Key Points:**
- **Per-thread** memory
- **LIFO** (Last In, First Out)
- **Not garbage collected** (automatic deallocation on method return)
- Size controlled by: `-Xss`

**Example:**
```java
public void calculate(int a, int b) {
    int result = a + b;  // 'a', 'b', 'result' → Stack
    String msg = "Done"; // 'msg' reference → Stack, "Done" → String Pool
}

// When method returns:
// - Stack frame is popped
// - Local variables 'a', 'b', 'result', 'msg' are removed
// - Objects in Heap remain (until GC)
```

**StackOverflowError Example:**
```java
public void recursiveMethod() {
    recursiveMethod();  // Infinite recursion
}
// Throws: StackOverflowError
// Each call adds a stack frame, eventually exhausts stack memory
```

#### 3. **Metaspace (Java 8+)**

**Replaces PermGen from Java 7**

**What it stores:**
- Class metadata
- Method metadata
- Static variables (reference, actual object in Heap)
- Constant pool (runtime)

**Key Differences from PermGen:**
```
PermGen (Java 7)             Metaspace (Java 8+)
├── Fixed size               ├── Grows dynamically
├── Part of Heap             ├── Native memory
├── Can cause OutOfMemory    ├── Less OOM issues
└── Size: -XX:MaxPermSize    └── Size: -XX:MaxMetaspaceSize
```

**Example:**
```java
public class MetaspaceExample {
    static int counter = 0;  // counter reference → Metaspace
                            // actual int value → Metaspace
    
    static Person person = new Person();  // person reference → Metaspace
                                         // Person object → Heap
}
```

**When Metaspace OutOfMemory happens:**
```java
// Generating classes dynamically
while (true) {
    Class<?> clazz = new ByteBuddy()
        .subclass(Object.class)
        .make()
        .load(getClass().getClassLoader())
        .getLoaded();
}
// Eventually: OutOfMemoryError: Metaspace
```

#### 4. **Program Counter (PC) Register**

- One per thread
- Stores address of current JVM instruction
- If native method, PC is undefined

#### 5. **Native Method Stack**

- Used for native (C/C++) methods
- JNI (Java Native Interface) calls

---

### FAANG Interview Question 1

**Q: What happens when you create a new object in Java? Walk through the entire process.**

**Expected Answer (Senior Level):**

```java
Person person = new Person("John", 30);
```

**Step-by-step:**

1. **Compile Time:**
   - Compiler checks if `Person` class is accessible
   - Type checking: assignment compatible
   - Generates bytecode: `new`, `dup`, `invokespecial`

2. **Runtime - Class Loading:**
   - Check if `Person.class` is loaded
   - If not loaded:
     - ClassLoader finds the `.class` file
     - Loads bytecode into Metaspace
     - Verification (bytecode validation)
     - Preparation (allocate memory for static variables)
     - Resolution (resolve symbolic references)
     - Initialization (execute static initializers)

3. **Memory Allocation:**
   - JVM calculates object size:
     ```
     Object size = Header (12-16 bytes) 
                 + Instance variables size
                 + Padding (align to 8-byte boundary)
     ```
   - Allocates memory in Eden space (Young Generation)
   - Two allocation strategies:
     - **Bump-the-pointer**: Fast, for single-threaded
     - **TLAB (Thread Local Allocation Buffer)**: For multi-threaded

4. **Object Initialization:**
   - Set default values (0, null, false)
   - Set object header:
     - Mark word (hash code, GC age, lock info)
     - Class metadata pointer
   - Execute constructor:
     - Call super constructor first
     - Initialize instance variables
     - Execute constructor body

5. **Reference Assignment:**
   - Store object address in `person` variable (on Stack)

**Follow-up: What if allocation fails?**

**Answer:**
```
If Eden is full:
1. Minor GC is triggered
2. Live objects moved to Survivor space
3. If still not enough space → OutOfMemoryError

If object is very large (>50% of Eden):
- Directly allocated in Old Generation
```

---

### FAANG Interview Question 2

**Q: Explain the difference between `==` and `equals()`. Then explain why String behaves differently.**

**Answer:**

```java
// Example 1: Primitives
int a = 5;
int b = 5;
System.out.println(a == b);  // true (compares values)

// Example 2: Objects
String s1 = new String("hello");
String s2 = new String("hello");
System.out.println(s1 == s2);        // false (different memory addresses)
System.out.println(s1.equals(s2));   // true (String overrides equals)

// Example 3: String Pool
String s3 = "hello";
String s4 = "hello";
System.out.println(s3 == s4);        // true (same object from String Pool)

// Example 4: Integer Cache
Integer i1 = 127;
Integer i2 = 127;
System.out.println(i1 == i2);        // true (cached)

Integer i3 = 128;
Integer i4 = 128;
System.out.println(i3 == i4);        // false (not cached)
```

**Why this behavior?**

**String Pool (Intern Pool):**
```java
// String literals are automatically interned
String s1 = "test";  // Added to String Pool
String s2 = "test";  // Returns existing reference from pool

// Manual interning
String s3 = new String("test");  // Creates new object in Heap
String s4 = s3.intern();  // Returns reference from pool
System.out.println(s1 == s4);  // true
```

**Integer Cache (-128 to 127):**
```java
// Java caches Integer objects from -128 to 127
public static Integer valueOf(int i) {
    if (i >= IntegerCache.low && i <= IntegerCache.high)
        return IntegerCache.cache[i + (-IntegerCache.low)];
    return new Integer(i);
}

// Can extend cache range:
// -XX:AutoBoxCacheMax=1000
```

**Production Scenario:**
```java
// Bad: Creates 1,000,000 String objects
for (int i = 0; i < 1000000; i++) {
    String s = new String("constant");  // Each iteration creates new object
}

// Good: Reuses single String object
for (int i = 0; i < 1000000; i++) {
    String s = "constant";  // All iterations use same object from pool
}
```

**Follow-up: How would you implement your own object pool?**

```java
public class ObjectPool<T> {
    private final ConcurrentLinkedQueue<T> pool;
    private final Supplier<T> factory;
    private final int maxSize;
    
    public ObjectPool(Supplier<T> factory, int maxSize) {
        this.factory = factory;
        this.maxSize = maxSize;
        this.pool = new ConcurrentLinkedQueue<>();
    }
    
    public T borrow() {
        T object = pool.poll();
        return (object != null) ? object : factory.get();
    }
    
    public void returnObject(T object) {
        if (pool.size() < maxSize) {
            pool.offer(object);
        }
        // Else: let GC collect it
    }
}

// Usage for expensive objects (DB connections, etc.)
ObjectPool<Connection> connectionPool = new ObjectPool<>(
    () -> DriverManager.getConnection(url), 
    100  // max pool size
);
```

---

## 🗑️ Garbage Collection Deep Dive

### GC Basics

**What is eligible for GC?**
```java
public void method() {
    Person p1 = new Person();  // p1 is reachable
    p1 = null;  // Now unreachable → eligible for GC
    
    Person p2 = new Person();
    Person p3 = p2;  // Two references to same object
    p2 = null;  // Still reachable via p3
    p3 = null;  // Now unreachable → eligible for GC
}

// When method returns:
// - All local variables removed from stack
// - All objects created in method eligible for GC
```

**GC Root Objects (Never collected):**
1. Local variables on stack
2. Active threads
3. Static variables
4. JNI references

### Garbage Collection Algorithms

#### 1. **Serial GC** (`-XX:+UseSerialGC`)

**How it works:**
```
Stop-the-World event:
1. Pause all application threads
2. Mark all reachable objects
3. Sweep (deallocate) unreachable objects
4. Compact memory (optional)
5. Resume application threads
```

**Use case:** Single-core machines, small heaps (<100MB)

**Downside:** Long pause times (unsuitable for production)

#### 2. **Parallel GC** (`-XX:+UseParallelGC`) [Java 8 default]

**How it works:**
```
Multiple GC threads work in parallel:
1. Stop-the-World
2. Multiple threads mark & sweep concurrently
3. Faster than Serial GC
4. Resume application
```

**Use case:** Batch processing, throughput-oriented apps

**Tuning:**
```bash
-XX:ParallelGCThreads=8  # Number of GC threads
-XX:MaxGCPauseMillis=200  # Target max pause time
```

#### 3. **G1 GC (Garbage First)** (`-XX:+UseG1GC`) [Java 9+ default]

**How it works:**
```
Heap divided into regions:
┌─────────────────────────────────┐
│ E │ S │ O │ H │ E │ E │ O │ S │  E=Eden, S=Survivor
│ O │ E │ E │ O │ H │ S │ E │ O │  O=Old, H=Humongous
└─────────────────────────────────┘

1. Young GC: Collect Eden + Survivor (Stop-the-World)
2. Concurrent Marking: Mark live objects in Old Gen
3. Mixed GC: Collect Young + some Old regions (prioritizes garbage-heavy regions)
4. Full GC: Last resort (Stop-the-World) - avoid this!
```

**Key Features:**
- Predictable pause times
- No full heap collection (regional)
- Good for large heaps (>4GB)

**Tuning:**
```bash
-XX:MaxGCPauseMillis=200  # Target pause time
-XX:G1HeapRegionSize=16m  # Region size
-XX:InitiatingHeapOccupancyPercent=45  # When to start marking
```

**Production Example:**
```bash
java -Xms4g -Xmx4g \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -XX:+PrintGCDetails \
     -XX:+PrintGCDateStamps \
     -Xloggc:/var/log/gc.log \
     -jar myapp.jar
```

#### 4. **ZGC (Z Garbage Collector)** (`-XX:+UseZGC`) [Java 15+]

**Revolutionary features:**
- Pause times <10ms (even for TB-sized heaps!)
- Concurrent (no Stop-the-World except initial mark)
- Scalable (8MB to 16TB heaps)

**How it achieves low latency:**
```
1. Colored Pointers: Encodes GC state in object reference
2. Load Barriers: Checks on each object load (small overhead)
3. Concurrent Compaction: Moves objects while app runs
```

**Use case:** Low-latency requirements (trading systems, real-time apps)

**Tuning:**
```bash
-XX:+UseZGC
-XX:ZCollectionInterval=300  # Force GC every 5 minutes
-XX:SoftMaxHeapSize=4g  # Soft limit (can exceed if needed)
```

**Production Scenario:**
```
Application: Real-time bid processing
Requirements: p99 latency <50ms
Heap: 32GB

Without ZGC:
- G1 GC pause times: 50-200ms
- Occasional Full GC: 2-5 seconds
- Result: Missed bids during GC pauses

With ZGC:
- Pause times: 1-5ms consistently
- No Full GC
- Result: Zero missed bids
```

#### 5. **Shenandoah GC** (`-XX:+UseShenandoahGC`)

Similar to ZGC, focuses on low pause times.

**Key difference from ZGC:**
- ZGC: Uses colored pointers
- Shenandoah: Uses forwarding pointers

Both achieve <10ms pause times.

---

### Memory Leak Detection

**Common causes:**

#### 1. **Not closing resources**
```java
// Bad
public List<String> readFile(String path) {
    BufferedReader reader = new BufferedReader(new FileReader(path));
    // If exception occurs, reader never closed → file handle leak
    return reader.lines().collect(Collectors.toList());
}

// Good
public List<String> readFile(String path) throws IOException {
    try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
        return reader.lines().collect(Collectors.toList());
    }  // Automatically closed
}
```

#### 2. **Static collections growing unbounded**
```java
// Bad
public class Cache {
    private static Map<String, Object> cache = new HashMap<>();
    
    public static void put(String key, Object value) {
        cache.put(key, value);  // Never evicted → memory leak
    }
}

// Good
public class Cache {
    private static Map<String, Object> cache = new LinkedHashMap<>(100, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry eldest) {
            return size() > 100;  // LRU eviction
        }
    };
}

// Better: Use Guava Cache or Caffeine
LoadingCache<String, Object> cache = Caffeine.newBuilder()
    .maximumSize(1000)
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .build(key -> loadFromDB(key));
```

#### 3. **Thread local variables not removed**
```java
// Bad
public class RequestContext {
    private static ThreadLocal<User> currentUser = new ThreadLocal<>();
    
    public static void setUser(User user) {
        currentUser.set(user);  // If not removed, thread pool holds reference
    }
}

// Good
public class RequestContext {
    private static ThreadLocal<User> currentUser = new ThreadLocal<>();
    
    public static void setUser(User user) {
        currentUser.set(user);
    }
    
    public static void clear() {
        currentUser.remove();  // Always call in finally block
    }
}

// Usage in web filter
try {
    RequestContext.setUser(authenticatedUser);
    chain.doFilter(request, response);
} finally {
    RequestContext.clear();  // Critical!
}
```

#### 4. **Listeners not unregistered**
```java
// Bad
public class EventManager {
    private List<EventListener> listeners = new ArrayList<>();
    
    public void addListener(EventListener listener) {
        listeners.add(listener);  // If listener never removed → leak
    }
}

// Good
public class EventManager {
    private List<WeakReference<EventListener>> listeners = new ArrayList<>();
    
    public void addListener(EventListener listener) {
        listeners.add(new WeakReference<>(listener));
        // If listener is GC'd, weak reference becomes null
    }
    
    private void fireEvent(Event event) {
        listeners.removeIf(ref -> {
            EventListener listener = ref.get();
            if (listener == null) return true;  // Remove dead reference
            listener.onEvent(event);
            return false;
        });
    }
}
```

**Production Memory Leak Detection:**

```bash
# 1. Heap dump on OutOfMemoryError
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/log/heapdump.hprof

# 2. Analyze with Eclipse MAT or JProfiler
# Look for:
# - Objects with high retention size
# - Duplicate strings
# - Large collections

# 3. Common patterns in heap dump:
# - char[] taking 80% of heap → String leak
# - HashMap with millions of entries → cache leak
# - Thread[] with hundreds of threads → thread leak
```

---

### FAANG Interview Question 3

**Q: Your application is experiencing memory leaks. Walk me through how you'd debug this in production.**

**Expected Answer:**

**Step 1: Identify symptoms**
```
Symptoms:
- Memory usage keeps growing
- Frequent Full GCs
- Eventually OutOfMemoryError
- Slow response times
```

**Step 2: Enable diagnostics (without restart)**
```bash
# Get PID
jps

# Enable GC logging (Java 8)
jstat -gcutil <PID> 1000
# Watch for:
# - OU (Old Gen Utilization) keeps growing
# - FGC (Full GC Count) increasing

# Capture heap dump
jmap -dump:live,format=b,file=heap.hprof <PID>
```

**Step 3: Analyze heap dump**
```
Use Eclipse MAT:
1. Open heap.hprof
2. Run "Leak Suspects Report"
3. Look at "Dominator Tree"
   - Shows objects sorted by retained heap
4. Check for:
   - Large HashMap/ArrayList
   - Many instances of same class
   - Suspicious static fields
```

**Step 4: Common findings**

```java
// Example 1: Found in heap dump
// com.myapp.Cache$CacheMap retaining 2GB
// Root: static field in Cache class

// Fix:
public class Cache {
    // Before
    private static Map<String, byte[]> cache = new HashMap<>();
    
    // After
    private static LoadingCache<String, byte[]> cache = Caffeine.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(1, TimeUnit.HOURS)
        .removalListener((key, value, cause) -> {
            logger.info("Evicted: {}, reason: {}", key, cause);
        })
        .build(key -> loadFromDB(key));
}

// Example 2: Found thread locals holding large objects
// Fix: Always remove in finally block

// Example 3: Event listeners not unregistered
// Fix: Use weak references or unregister pattern
```

**Step 5: Validate fix**
```bash
# Load test with fixed code
# Monitor memory over time
jstat -gcutil <PID> 1000

# Should see:
# - Old Gen stabilizes (sawtooth pattern, not growing)
# - Minor GCs clear Eden effectively
# - Rare Full GCs
```

**Step 6: Prevent future leaks**
```java
// Add monitoring
MBeanServer mbs = ManagementFactory.getPlatformMBeanServer();
MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();

// Alert if Old Gen > 80% for 5 minutes
if (memoryBean.getHeapMemoryUsage().getUsed() > threshold) {
    alertOps("High memory usage detected");
}
```

---

## 🧵 Multithreading & Concurrency

### Thread Lifecycle

```
        NEW
         ↓
    [start()]
         ↓
     RUNNABLE ←→ RUNNING
         ↓           ↓
    [wait()]    [sleep()]
         ↓           ↓
     WAITING    TIMED_WAITING
         ↓           ↓
    [notify()]  [timeout]
         ↓           ↓
     RUNNABLE ←→ RUNNING
         ↓
    [finish]
         ↓
    TERMINATED
```

### Creating Threads

```java
// Method 1: Extend Thread
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("Running in: " + Thread.currentThread().getName());
    }
}

// Method 2: Implement Runnable (preferred)
class MyTask implements Runnable {
    @Override
    public void run() {
        System.out.println("Running in: " + Thread.currentThread().getName());
    }
}

// Method 3: Callable (can return value)
class MyCallable implements Callable<String> {
    @Override
    public String call() throws Exception {
        return "Result from " + Thread.currentThread().getName();
    }
}

// Usage
Thread t1 = new MyThread();
t1.start();

Thread t2 = new Thread(new MyTask());
t2.start();

ExecutorService executor = Executors.newSingleThreadExecutor();
Future<String> future = executor.submit(new MyCallable());
String result = future.get();  // Blocks until result available
```

**Why Runnable/Callable over Thread extension?**
1. Java doesn't support multiple inheritance
2. Separation of concern (task vs execution)
3. Can use with thread pools

### Thread Pools

**Why use thread pools?**
- Thread creation is expensive (~1MB stack + OS overhead)
- Reuse threads
- Control concurrency level
- Better resource management

```java
// Types of thread pools
ExecutorService executor;

// 1. Fixed Thread Pool
executor = Executors.newFixedThreadPool(10);
// Use case: Processing 10 requests concurrently
// Queue: Unbounded LinkedBlockingQueue

// 2. Cached Thread Pool
executor = Executors.newCachedThreadPool();
// Use case: Many short-lived tasks
// Creates threads on demand, reuses if available
// Threads idle for 60s are terminated

// 3. Single Thread Executor
executor = Executors.newSingleThreadExecutor();
// Use case: Tasks must execute sequentially
// Guarantees FIFO order

// 4. Scheduled Thread Pool
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(5);
scheduler.scheduleAtFixedRate(() -> {
    System.out.println("Running every 10 seconds");
}, 0, 10, TimeUnit.SECONDS);
```

**Production-grade thread pool:**
```java
ThreadPoolExecutor executor = new ThreadPoolExecutor(
    10,  // corePoolSize: minimum threads to keep alive
    50,  // maximumPoolSize: max threads
    60L, TimeUnit.SECONDS,  // keepAliveTime: idle thread timeout
    new LinkedBlockingQueue<>(1000),  // workQueue: bounded queue (prevents OOM)
    new ThreadFactoryBuilder()
        .setNameFormat("worker-%d")
        .setDaemon(false)
        .build(),
    new ThreadPoolExecutor.CallerRunsPolicy()  // RejectedExecutionHandler
);

// Rejection Policies:
// 1. AbortPolicy (default): Throw RejectedExecutionException
// 2. CallerRunsPolicy: Execute in caller's thread (provides backpressure)
// 3. DiscardPolicy: Silently discard task
// 4. DiscardOldestPolicy: Discard oldest task in queue

// Shutdown gracefully
executor.shutdown();  // No new tasks accepted, finish existing
if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
    executor.shutdownNow();  // Force shutdown
}
```

**Thread Pool Sizing Formula:**
```
For CPU-bound tasks:
  Pool size = Number of CPU cores + 1

For I/O-bound tasks:
  Pool size = Number of CPU cores × (1 + Wait time / Service time)

Example:
- 8 CPU cores
- Wait time (I/O): 100ms
- Service time (CPU): 10ms
Pool size = 8 × (1 + 100/10) = 8 × 11 = 88 threads
```

---

### Synchronization

#### 1. **synchronized keyword**

```java
public class Counter {
    private int count = 0;
    
    // Method-level synchronization
    public synchronized void increment() {
        count++;  // Atomic operation on 'this' monitor
    }
    
    // Block-level synchronization
    public void incrementBlock() {
        synchronized(this) {
            count++;
        }
    }
    
    // Static synchronization (locks on Class object)
    public static synchronized void staticMethod() {
        // Thread-safe at class level
    }
    
    // Different lock object
    private final Object lock = new Object();
    public void incrementCustomLock() {
        synchronized(lock) {
            count++;
        }
    }
}
```

**Bytecode of synchronized:**
```
public void increment();
  Code:
     0: aload_0
     1: dup
     2: getfield      #2  // Field count:I
     5: iconst_1
     6: iadd
     7: putfield      #2  // Field count:I
    10: return

public synchronized void increment();
  Code:
     0: monitorenter        // Acquire lock
     1: aload_0
     2: dup
     3: getfield      #2  
     6: iconst_1
     7: iadd
     8: putfield      #2  
    11: monitorexit         // Release lock
    12: return
```

**Important:** `synchronized` uses intrinsic lock (monitor) of object

**Interview Question: What happens if exception thrown in synchronized block?**

```java
public synchronized void method() {
    // ... some code
    throw new RuntimeException();  // Lock is STILL released!
}
// Monitor automatically released even on exception
```

#### 2. **volatile keyword**

**Problem it solves:**
```java
class Task implements Runnable {
    private boolean running = true;  // Cached in CPU cache
    
    public void run() {
        while (running) {  // Thread may never see update!
            // do work
        }
    }
    
    public void stop() {
        running = false;  // Updated in main thread's cache
    }
}
```

**Solution:**
```java
class Task implements Runnable {
    private volatile boolean running = true;  // Always read from main memory
    
    public void run() {
        while (running) {  // Guaranteed to see update
            // do work
        }
    }
    
    public void stop() {
        running = false;  // Immediately visible to all threads
    }
}
```

**What volatile does:**
1. Prevents CPU caching of variable
2. Ensures happens-before relationship
3. **Does NOT provide atomicity!**

**volatile vs synchronized:**
```java
// This is NOT thread-safe!
private volatile int count = 0;
public void increment() {
    count++;  // Read-modify-write: NOT atomic
}

// Thread-safe version:
private int count = 0;
public synchronized void increment() {
    count++;  // Atomic
}

// Or use AtomicInteger:
private AtomicInteger count = new AtomicInteger(0);
public void increment() {
    count.incrementAndGet();  // Atomic, lock-free
}
```

**When to use volatile:**
1. Simple flag variables (boolean)
2. One writer, multiple readers
3. No compound operations (read-modify-write)

#### 3. **Atomic Classes**

```java
// AtomicInteger, AtomicLong, AtomicBoolean, AtomicReference
AtomicInteger counter = new AtomicInteger(0);

// Compare-and-Swap (CAS) operation
int oldValue = counter.get();
int newValue = oldValue + 1;
boolean success = counter.compareAndSet(oldValue, newValue);

// High-level methods (use CAS internally)
counter.incrementAndGet();  // ++count
counter.getAndIncrement();  // count++
counter.addAndGet(5);       // count += 5
counter.updateAndGet(n -> n * 2);  // Functional update

// Why it's fast: Lock-free, uses CPU-level CAS instruction
```

**Implementation (simplified):**
```java
public class AtomicInteger {
    private volatile int value;
    
    public final int incrementAndGet() {
        int current;
        int next;
        do {
            current = value;
            next = current + 1;
        } while (!compareAndSwapInt(current, next));  // CPU CAS instruction
        return next;
    }
    
    // Native method using CPU's CAS instruction
    private native boolean compareAndSwapInt(int expect, int update);
}
```

**Production scenario:**
```java
// High-throughput counter (millions of increments/sec)
public class MetricsCollector {
    private final AtomicLong requestCount = new AtomicLong(0);
    private final AtomicLong errorCount = new AtomicLong(0);
    
    public void recordRequest() {
        requestCount.incrementAndGet();  // Lock-free, very fast
    }
    
    public void recordError() {
        errorCount.incrementAndGet();
    }
    
    public Map<String, Long> getMetrics() {
        return Map.of(
            "requests", requestCount.get(),
            "errors", errorCount.get()
        );
    }
}
```

#### 4. **Locks (java.util.concurrent.locks)**

**ReentrantLock:**
```java
public class BankAccount {
    private double balance = 1000;
    private final ReentrantLock lock = new ReentrantLock();
    
    public void withdraw(double amount) {
        lock.lock();
        try {
            if (balance >= amount) {
                balance -= amount;
            }
        } finally {
            lock.unlock();  // MUST be in finally!
        }
    }
    
    // Try-lock pattern (non-blocking)
    public boolean tryWithdraw(double amount) {
        if (lock.tryLock()) {
            try {
                if (balance >= amount) {
                    balance -= amount;
                    return true;
                }
                return false;
            } finally {
                lock.unlock();
            }
        }
        return false;  // Couldn't acquire lock
    }
    
    // Timeout
    public boolean withdrawWithTimeout(double amount) throws InterruptedException {
        if (lock.tryLock(5, TimeUnit.SECONDS)) {
            try {
                // ...
            } finally {
                lock.unlock();
            }
        }
        return false;
    }
}
```

**ReentrantLock vs synchronized:**

| Feature | synchronized | ReentrantLock |
|---------|-------------|---------------|
| Fairness | Not fair | Can be fair (`new ReentrantLock(true)`) |
| Try-lock | No | Yes (`tryLock()`) |
| Timeout | No | Yes (`tryLock(time, unit)`) |
| Interruptible | No | Yes (`lockInterruptibly()`) |
| Condition variables | Single (wait/notify) | Multiple (`newCondition()`) |
| Performance | Slightly faster (JVM optimized) | Slightly slower |

**When to use ReentrantLock:**
1. Need fairness guarantee
2. Need try-lock (non-blocking)
3. Need timeout on lock acquisition
4. Need multiple condition variables

**ReadWriteLock:**
```java
public class Cache {
    private final Map<String, Object> cache = new HashMap<>();
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();
    private final Lock readLock = rwLock.readLock();
    private final Lock writeLock = rwLock.writeLock();
    
    public Object get(String key) {
        readLock.lock();  // Multiple readers allowed
        try {
            return cache.get(key);
        } finally {
            readLock.unlock();
        }
    }
    
    public void put(String key, Object value) {
        writeLock.lock();  // Exclusive access
        try {
            cache.put(key, value);
        } finally {
            writeLock.unlock();
        }
    }
}

// Use case: Read-heavy workloads (10:1 read:write ratio)
```

**StampedLock (Java 8+):**
```java
public class Point {
    private double x, y;
    private final StampedLock sl = new StampedLock();
    
    // Optimistic read (lock-free)
    public double distanceFromOrigin() {
        long stamp = sl.tryOptimisticRead();  // No lock acquired
        double currentX = x, currentY = y;
        
        if (!sl.validate(stamp)) {  // Check if modified
            stamp = sl.readLock();  // Acquire read lock
            try {
                currentX = x;
                currentY = y;
            } finally {
                sl.unlockRead(stamp);
            }
        }
        return Math.sqrt(currentX * currentX + currentY * currentY);
    }
    
    public void move(double deltaX, double deltaY) {
        long stamp = sl.writeLock();
        try {
            x += deltaX;
            y += deltaY;
        } finally {
            sl.unlockWrite(stamp);
        }
    }
}

// Benefit: Optimistic read has zero overhead if no concurrent writes
```

---

### Concurrent Collections

#### 1. **ConcurrentHashMap**

```java
// Thread-safe, high-performance alternative to Hashtable
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();

// Atomic operations
map.putIfAbsent("key", 1);
map.compute("key", (k, v) -> v == null ? 1 : v + 1);
map.computeIfAbsent("key", k -> loadFromDB(k));

// Parallel operations (Java 8+)
map.forEach(10, (k, v) -> System.out.println(k + ": " + v));
// Parallelism threshold: 10 (if map size > 10, uses ForkJoinPool)

// Search
String result = map.search(10, (k, v) -> v > 100 ? k : null);

// Reduce
Integer sum = map.reduce(10, 
    (k, v) -> v,  // Transformer
    (v1, v2) -> v1 + v2  // Reducer
);
```

**How it works (simplified):**
```
ConcurrentHashMap internal structure:
┌──────────────────────────────────────┐
│        Segment Array (16 by default) │
├──────────────────────────────────────┤
│ Seg0 │ Seg1 │ ... │ Seg15           │
└──────┴──────┴─────┴──────────────────┘
   │      │            │
   ↓      ↓            ↓
 Bucket Bucket      Bucket
 (Lock) (Lock)      (Lock)

- Each segment has its own lock
- Allows 16 concurrent writes (to different segments)
- Read operations often don't require locks
```

**Performance:**
```java
// Bad: Hashtable (entire map locked)
Hashtable<String, Integer> hashtable = new Hashtable<>();
// Only 1 writer at a time, even if writing to different keys

// Good: ConcurrentHashMap (segment-level locking)
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
// 16 writers concurrently (to different segments)

// Benchmark results (16 threads, 1M operations):
// Hashtable:           5000ms
// Collections.synchronizedMap: 4800ms
// ConcurrentHashMap:   800ms
```

#### 2. **CopyOnWriteArrayList**

```java
// Thread-safe ArrayList alternative
// Every write operation creates a copy of underlying array
CopyOnWriteArrayList<String> list = new CopyOnWriteArrayList<>();

list.add("A");  // Creates new array: ["A"]
list.add("B");  // Creates new array: ["A", "B"]

// Read operations don't require locks
for (String item : list) {  // Lock-free iteration
    System.out.println(item);
}
```

**When to use:**
- Read-heavy workloads (100:1 read:write ratio)
- Small lists (<1000 elements)
- Acceptable to have slightly stale reads

**When NOT to use:**
- Write-heavy workloads (expensive array copying)
- Large lists (copying overhead)

**Example use case:**
```java
// Event listeners (rarely added/removed, frequently iterated)
public class EventManager {
    private final CopyOnWriteArrayList<EventListener> listeners = 
        new CopyOnWriteArrayList<>();
    
    public void addListener(EventListener listener) {
        listeners.add(listener);  // Rare operation, OK to copy
    }
    
    public void fireEvent(Event event) {
        for (EventListener listener : listeners) {  // Frequent, lock-free
            listener.onEvent(event);
        }
    }
}
```

#### 3. **BlockingQueue Implementations**

```java
// 1. ArrayBlockingQueue (bounded, array-backed)
BlockingQueue<Task> queue = new ArrayBlockingQueue<>(100);

// Producer
queue.put(task);  // Blocks if full
queue.offer(task, 5, TimeUnit.SECONDS);  // Waits up to 5 seconds

// Consumer
Task task = queue.take();  // Blocks if empty
Task task = queue.poll(5, TimeUnit.SECONDS);  // Waits up to 5 seconds

// 2. LinkedBlockingQueue (optionally bounded, linked-list)
BlockingQueue<Task> queue = new LinkedBlockingQueue<>();  // Unbounded
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(1000);  // Bounded

// 3. PriorityBlockingQueue (unbounded, sorted by priority)
BlockingQueue<Task> queue = new PriorityBlockingQueue<>();

// 4. SynchronousQueue (no capacity, direct handoff)
BlockingQueue<Task> queue = new SynchronousQueue<>();
// Producer blocks until consumer takes the item
```

**Producer-Consumer Pattern:**
```java
public class TaskProcessor {
    private final BlockingQueue<Task> queue = new LinkedBlockingQueue<>(1000);
    private final ExecutorService executor = Executors.newFixedThreadPool(10);
    
    public void start() {
        // Start 10 consumer threads
        for (int i = 0; i < 10; i++) {
            executor.submit(() -> {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Task task = queue.take();  // Blocks if empty
                        processTask(task);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }
            });
        }
    }
    
    public void submitTask(Task task) throws InterruptedException {
        queue.put(task);  // Blocks if full (backpressure)
    }
}
```

---

### Deadlocks

**Classic deadlock example:**
```java
public class DeadlockExample {
    private final Object lock1 = new Object();
    private final Object lock2 = new Object();
    
    public void method1() {
        synchronized(lock1) {  // Thread A acquires lock1
            System.out.println("Acquired lock1");
            
            // Simulate some work
            try { Thread.sleep(100); } catch (InterruptedException e) {}
            
            synchronized(lock2) {  // Thread A waits for lock2 (held by Thread B)
                System.out.println("Acquired lock2");
            }
        }
    }
    
    public void method2() {
        synchronized(lock2) {  // Thread B acquires lock2
            System.out.println("Acquired lock2");
            
            // Simulate some work
            try { Thread.sleep(100); } catch (InterruptedException e) {}
            
            synchronized(lock1) {  // Thread B waits for lock1 (held by Thread A)
                System.out.println("Acquired lock1");
            }
        }
    }
}

// Thread A: method1() → locks lock1, waits for lock2
// Thread B: method2() → locks lock2, waits for lock1
// DEADLOCK!
```

**Detecting deadlock:**
```bash
# Get thread dump
jstack <PID> > thread_dump.txt

# Look for:
Found one Java-level deadlock:
=============================
"Thread-1":
  waiting to lock monitor 0x00007f8b1c004e20 (object 0x00000000d5f3e5b0, a java.lang.Object),
  which is held by "Thread-2"
"Thread-2":
  waiting to lock monitor 0x00007f8b1c004d70 (object 0x00000000d5f3e5a0, a java.lang.Object),
  which is held by "Thread-1"
```

**Prevention strategies:**

1. **Lock ordering:**
```java
// Always acquire locks in same order
private final Object lock1 = new Object();
private final Object lock2 = new Object();

public void method1() {
    synchronized(lock1) {
        synchronized(lock2) {
            // do work
        }
    }
}

public void method2() {
    synchronized(lock1) {  // Same order!
        synchronized(lock2) {
            // do work
        }
    }
}
```

2. **Trylock with timeout:**
```java
public boolean transfer(Account from, Account to, double amount) {
    if (from.lock.tryLock()) {
        try {
            if (to.lock.tryLock()) {
                try {
                    from.balance -= amount;
                    to.balance += amount;
                    return true;
                } finally {
                    to.lock.unlock();
                }
            }
        } finally {
            from.lock.unlock();
        }
    }
    return false;  // Couldn't acquire both locks
}
```

3. **Use higher-level concurrency utilities:**
```java
// Instead of manual locking, use:
- ConcurrentHashMap
- BlockingQueue
- Atomic classes
- CompletableFuture
```

---

### FAANG Interview Question 4

**Q: Implement a thread-safe LRU Cache that supports get() and put() operations.**

**Expected answer:**

```java
public class LRUCache<K, V> {
    private final int capacity;
    private final Map<K, Node<K, V>> cache;
    private final DoublyLinkedList<K, V> list;
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    
    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.cache = new HashMap<>();
        this.list = new DoublyLinkedList<>();
    }
    
    public V get(K key) {
        lock.readLock().lock();
        try {
            Node<K, V> node = cache.get(key);
            if (node == null) {
                return null;
            }
            
            // Move to front (most recently used)
            // PROBLEM: This modifies list → needs write lock!
        } finally {
            lock.readLock().unlock();
        }
        
        // Upgrade to write lock
        lock.writeLock().lock();
        try {
            Node<K, V> node = cache.get(key);
            if (node != null) {
                list.moveToFront(node);
                return node.value;
            }
            return null;
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    public void put(K key, V value) {
        lock.writeLock().lock();
        try {
            Node<K, V> node = cache.get(key);
            
            if (node != null) {
                // Update existing node
                node.value = value;
                list.moveToFront(node);
            } else {
                // Add new node
                if (cache.size() >= capacity) {
                    // Evict least recently used
                    Node<K, V> lru = list.removeLast();
                    cache.remove(lru.key);
                }
                
                Node<K, V> newNode = new Node<>(key, value);
                list.addToFront(newNode);
                cache.put(key, newNode);
            }
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    private static class Node<K, V> {
        K key;
        V value;
        Node<K, V> prev, next;
        
        Node(K key, V value) {
            this.key = key;
            this.value = value;
        }
    }
    
    private static class DoublyLinkedList<K, V> {
        private Node<K, V> head, tail;
        
        void addToFront(Node<K, V> node) {
            if (head == null) {
                head = tail = node;
            } else {
                node.next = head;
                head.prev = node;
                head = node;
            }
        }
        
        void moveToFront(Node<K, V> node) {
            if (node == head) return;
            
            // Remove from current position
            if (node == tail) {
                tail = node.prev;
                tail.next = null;
            } else {
                node.prev.next = node.next;
                node.next.prev = node.prev;
            }
            
            // Add to front
            node.next = head;
            node.prev = null;
            head.prev = node;
            head = node;
        }
        
        Node<K, V> removeLast() {
            if (tail == null) return null;
            
            Node<K, V> last = tail;
            if (head == tail) {
                head = tail = null;
            } else {
                tail = tail.prev;
                tail.next = null;
            }
            return last;
        }
    }
}
```

**Follow-up: Can you optimize this further?**

**Better solution using LinkedHashMap:**
```java
public class LRUCache<K, V> {
    private final int capacity;
    private final Map<K, V> cache;
    
    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.cache = Collections.synchronizedMap(
            new LinkedHashMap<K, V>(capacity, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                    return size() > capacity;
                }
            }
        );
    }
    
    public V get(K key) {
        return cache.get(key);  // Automatically moves to end (LRU)
    }
    
    public void put(K key, V value) {
        cache.put(key, value);  // Automatically evicts if needed
    }
}
```

**Production solution using Caffeine/Guava:**
```java
LoadingCache<K, V> cache = Caffeine.newBuilder()
    .maximumSize(1000)
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .recordStats()  // Track hit rate, evictions
    .build(key -> loadFromDB(key));

// Usage
V value = cache.get(key);  // Loads from DB if not in cache

// Metrics
CacheStats stats = cache.stats();
System.out.println("Hit rate: " + stats.hitRate());
System.out.println("Evictions: " + stats.evictionCount());
```

---

## ⚡ CompletableFuture & Async Programming

### Why CompletableFuture?

**Problem with Future:**
```java
ExecutorService executor = Executors.newFixedThreadPool(10);
Future<String> future = executor.submit(() -> {
    Thread.sleep(1000);
    return "Result";
});

// Can only block and wait
String result = future.get();  // Blocks for 1 second

// Cannot:
// - Chain operations
// - Combine multiple futures
// - Handle exceptions elegantly
```

**Solution: CompletableFuture**

### Basic Operations

```java
// 1. Create CompletableFuture
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    // Runs in ForkJoinPool.commonPool()
    return "Result";
});

// 2. Get result (blocking)
String result = future.get();  // Blocks
String result = future.get(5, TimeUnit.SECONDS);  // Timeout

// 3. Get result (non-blocking)
future.thenAccept(result -> System.out.println(result));

// 4. Manual completion
CompletableFuture<String> future = new CompletableFuture<>();
future.complete("Done");  // Completes the future
future.completeExceptionally(new RuntimeException("Error"));
```

### Chaining Operations

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    return "Hello";
})
.thenApply(s -> s + " World")  // Transform result
.thenApply(String::toUpperCase)  // Another transformation
.thenAccept(System.out::println)  // Consume result
.exceptionally(ex -> {  // Handle exception
    System.err.println("Error: " + ex.getMessage());
    return null;
});
```

### Combining Multiple Futures

```java
// 1. thenCombine: Combine two independent futures
CompletableFuture<String> future1 = CompletableFuture.supplyAsync(() -> "Hello");
CompletableFuture<String> future2 = CompletableFuture.supplyAsync(() -> "World");

CompletableFuture<String> combined = future1.thenCombine(future2, 
    (s1, s2) -> s1 + " " + s2);

// 2. thenCompose: Chain dependent futures
CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(() -> getUser(userId));
CompletableFuture<Order> orderFuture = userFuture.thenCompose(user -> 
    CompletableFuture.supplyAsync(() -> getOrders(user.getId()))
);

// 3. allOf: Wait for all futures
CompletableFuture<String> f1 = CompletableFuture.supplyAsync(() -> "A");
CompletableFuture<String> f2 = CompletableFuture.supplyAsync(() -> "B");
CompletableFuture<String> f3 = CompletableFuture.supplyAsync(() -> "C");

CompletableFuture<Void> all = CompletableFuture.allOf(f1, f2, f3);
all.join();  // Wait for all to complete

// 4. anyOf: Wait for first future
CompletableFuture<Object> any = CompletableFuture.anyOf(f1, f2, f3);
Object firstResult = any.join();
```

### Production Example

**Scenario: Fetch user, orders, and recommendations in parallel**

```java
public class UserService {
    private final ExecutorService executor = Executors.newFixedThreadPool(20);
    
    public UserDashboard getDashboard(String userId) {
        // Start all operations in parallel
        CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(
            () -> fetchUser(userId), executor);
            
        CompletableFuture<List<Order>> ordersFuture = CompletableFuture.supplyAsync(
            () -> fetchOrders(userId), executor);
            
        CompletableFuture<List<Product>> recommendationsFuture = CompletableFuture.supplyAsync(
            () -> fetchRecommendations(userId), executor);
        
        // Combine results
        return CompletableFuture.allOf(userFuture, ordersFuture, recommendationsFuture)
            .thenApply(v -> {
                User user = userFuture.join();
                List<Order> orders = ordersFuture.join();
                List<Product> recommendations = recommendationsFuture.join();
                return new UserDashboard(user, orders, recommendations);
            })
            .exceptionally(ex -> {
                log.error("Error fetching dashboard for user: {}", userId, ex);
                return UserDashboard.empty();
            })
            .join();  // Block and wait for result
    }
    
    // Individual fetch methods (simulate DB/API calls)
    private User fetchUser(String userId) {
        sleep(100);  // Simulate 100ms latency
        return userRepository.findById(userId);
    }
    
    private List<Order> fetchOrders(String userId) {
        sleep(200);  // Simulate 200ms latency
        return orderRepository.findByUserId(userId);
    }
    
    private List<Product> fetchRecommendations(String userId) {
        sleep(150);  // Simulate 150ms latency
        return recommendationService.getForUser(userId);
    }
}

// Performance:
// Sequential:  100ms + 200ms + 150ms = 450ms
// Parallel:    max(100ms, 200ms, 150ms) = 200ms (2.25x faster)
```

### Exception Handling

```java
CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    if (Math.random() > 0.5) {
        throw new RuntimeException("Random failure");
    }
    return "Success";
})
.handle((result, ex) -> {
    if (ex != null) {
        return "Default value";  // Recover from exception
    }
    return result;
})
.exceptionally(ex -> {
    log.error("Error occurred", ex);
    return "Fallback value";
})
.whenComplete((result, ex) -> {
    // Always executed (like finally)
    if (ex != null) {
        log.error("Failed with exception", ex);
    } else {
        log.info("Succeeded with result: {}", result);
    }
});
```

### Custom Executor

```java
// Don't use ForkJoinPool.commonPool() for blocking operations
Executor customExecutor = Executors.newFixedThreadPool(50);

CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> {
    // This blocks thread!
    return restTemplate.getForObject(url, String.class);
}, customExecutor);  // Use custom thread pool

// Common mistake: Using common pool for I/O
// ForkJoinPool.commonPool() size = Number of CPU cores
// If you block, you starve other tasks!
```

### FAANG Interview Question 5

**Q: Implement a method that calls 3 external APIs in parallel and returns combined result. If any call takes >5 seconds, use cached value. If all fail, return empty result.**

**Answer:**

```java
public class AggregatorService {
    private final RestTemplate restTemplate;
    private final Cache<String, Response> cache;
    private final ExecutorService executor = Executors.newFixedThreadPool(10);
    
    public AggregatedResult getAggregatedData(String userId) {
        // Create futures with timeout
        CompletableFuture<ApiResponse1> api1Future = callApi1(userId)
            .orTimeout(5, TimeUnit.SECONDS)
            .exceptionally(ex -> getCachedOrDefault("api1", userId));
            
        CompletableFuture<ApiResponse2> api2Future = callApi2(userId)
            .orTimeout(5, TimeUnit.SECONDS)
            .exceptionally(ex -> getCachedOrDefault("api2", userId));
            
        CompletableFuture<ApiResponse3> api3Future = callApi3(userId)
            .orTimeout(5, TimeUnit.SECONDS)
            .exceptionally(ex -> getCachedOrDefault("api3", userId));
        
        // Combine results
        return CompletableFuture.allOf(api1Future, api2Future, api3Future)
            .thenApply(v -> new AggregatedResult(
                api1Future.join(),
                api2Future.join(),
                api3Future.join()
            ))
            .exceptionally(ex -> AggregatedResult.empty())
            .join();
    }
    
    private CompletableFuture<ApiResponse1> callApi1(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                ApiResponse1 response = restTemplate.getForObject(
                    "https://api1.com/users/" + userId, 
                    ApiResponse1.class
                );
                cache.put("api1:" + userId, response);
                return response;
            } catch (Exception e) {
                throw new CompletionException(e);
            }
        }, executor);
    }
    
    private ApiResponse1 getCachedOrDefault(String api, String userId) {
        ApiResponse1 cached = cache.get(api + ":" + userId);
        if (cached != null) {
            log.warn("Using cached value for {} due to timeout/error", api);
            return cached;
        }
        log.error("No cached value available for {}, using default", api);
        return ApiResponse1.empty();
    }
    
    // Similar for api2, api3...
}

// Key points:
// 1. orTimeout(): Automatic timeout handling
// 2. exceptionally(): Fallback to cache
// 3. Custom executor: Don't block ForkJoinPool
// 4. join(): Final blocking call to get result
// 5. Caching: Store successful responses for fallback
```

---

## 🌊 Streams API Internals

### How Streams Work

**Stream Pipeline:**
```
Source → Intermediate Operations → Terminal Operation
 (List)    (filter, map, sorted)     (collect, forEach)
```

**Example:**
```java
List<String> result = list.stream()  // Source
    .filter(s -> s.length() > 5)      // Intermediate (lazy)
    .map(String::toUpperCase)         // Intermediate (lazy)
    .sorted()                         // Intermediate (lazy)
    .collect(Collectors.toList());    // Terminal (triggers execution)
```

**Key characteristics:**
1. **Lazy evaluation**: Intermediate operations don't execute until terminal operation
2. **Short-circuiting**: `findFirst()`, `anyMatch()` stop early
3. **Stateless vs Stateful**: `filter()` is stateless, `sorted()` is stateful

### Internal Execution

```java
// How this executes internally:
list.stream()
    .filter(s -> s.length() > 5)
    .map(String::toUpperCase)
    .collect(Collectors.toList());

// For list = ["hi", "hello", "world", "a"]
// Execution (element-by-element):
// 1. "hi" → filter(false) → skip
// 2. "hello" → filter(true) → map("HELLO") → collect
// 3. "world" → filter(true) → map("WORLD") → collect
// 4. "a" → filter(false) → skip

// NOT like this (stage-by-stage):
// Stage 1: filter all → ["hello", "world"]
// Stage 2: map all → ["HELLO", "WORLD"]
// Stage 3: collect all
```

**Optimization example:**
```java
// Inefficient: sorted() processes all elements
long count = list.stream()
    .sorted()  // Sorts entire list
    .limit(10)  // Then takes first 10
    .count();

// Efficient: limit() before sorted()
long count = list.stream()
    .limit(10)  // Takes first 10 (no sorting needed!)
    .sorted()  // Sorts only 10 elements
    .count();

// Even better: Use min/max for single element
Optional<String> min = list.stream()
    .min(Comparator.naturalOrder());  // No full sort needed
```

### Parallel Streams

```java
// Sequential
list.stream()
    .filter(...)
    .map(...)
    .collect(...);

// Parallel (uses ForkJoinPool)
list.parallelStream()
    .filter(...)
    .map(...)
    .collect(...);
```

**When to use parallel streams:**

✅ **Good use cases:**
```java
// CPU-intensive operations on large datasets
List<BigDecimal> results = numbers.parallelStream()
    .map(n -> computeExpensiveCalculation(n))  // CPU-bound
    .collect(Collectors.toList());

// Large collection (>10,000 elements)
long sum = largeList.parallelStream()
    .mapToLong(Integer::longValue)
    .sum();
```

❌ **Bad use cases:**
```java
// 1. Small collections (<1000 elements)
// Overhead of splitting > benefit of parallelism

// 2. I/O operations (already parallelized via blocking)
list.parallelStream()
    .map(id -> restTemplate.getForObject(...))  // DON'T DO THIS!
    // Use CompletableFuture instead

// 3. Non-thread-safe operations
List<Integer> result = new ArrayList<>();  // NOT thread-safe!
list.parallelStream()
    .forEach(result::add);  // RACE CONDITION!

// Correct:
List<Integer> result = list.parallelStream()
    .collect(Collectors.toList());  // Thread-safe collector
```

**Parallel stream performance:**
```java
// Benchmark: Sum of 10 million numbers
List<Integer> numbers = IntStream.range(0, 10_000_000)
    .boxed()
    .collect(Collectors.toList());

// Sequential: 250ms
long sum = numbers.stream()
    .mapToLong(Integer::longValue)
    .sum();

// Parallel: 80ms (3x faster on 8-core CPU)
long sum = numbers.parallelStream()
    .mapToLong(Integer::longValue)
    .sum();

// Primitive stream: 40ms (6x faster, no boxing overhead)
long sum = IntStream.range(0, 10_000_000)
    .sum();
```

### Custom Collectors

```java
// Built-in collector
List<String> list = stream.collect(Collectors.toList());

// Custom collector: Joining with custom delimiter
String result = stream.collect(Collectors.joining(", ", "[", "]"));
// Input: ["a", "b", "c"]
// Output: "[a, b, c]"

// Group by
Map<Integer, List<String>> grouped = stream.collect(
    Collectors.groupingBy(String::length)
);
// Input: ["a", "bb", "ccc", "dd"]
// Output: {1=["a"], 2=["bb", "dd"], 3=["ccc"]}

// Partition by
Map<Boolean, List<Integer>> partitioned = stream.collect(
    Collectors.partitioningBy(n -> n % 2 == 0)
);
// Input: [1, 2, 3, 4, 5]
// Output: {true=[2, 4], false=[1, 3, 5]}

// Count by
Map<String, Long> counts = stream.collect(
    Collectors.groupingBy(
        Function.identity(),
        Collectors.counting()
    )
);
// Input: ["a", "b", "a", "c", "b", "a"]
// Output: {"a"=3, "b"=2, "c"=1}
```

**Advanced custom collector:**
```java
// Implement Collector interface
public class ImmutableListCollector<T> implements Collector<T, ImmutableList.Builder<T>, ImmutableList<T>> {
    
    @Override
    public Supplier<ImmutableList.Builder<T>> supplier() {
        return ImmutableList::builder;
    }
    
    @Override
    public BiConsumer<ImmutableList.Builder<T>, T> accumulator() {
        return ImmutableList.Builder::add;
    }
    
    @Override
    public BinaryOperator<ImmutableList.Builder<T>> combiner() {
        return (b1, b2) -> b1.addAll(b2.build());
    }
    
    @Override
    public Function<ImmutableList.Builder<T>, ImmutableList<T>> finisher() {
        return ImmutableList.Builder::build;
    }
    
    @Override
    public Set<Characteristics> characteristics() {
        return Collections.emptySet();
    }
}

// Usage
ImmutableList<String> result = stream.collect(new ImmutableListCollector<>());
```

### FAANG Interview Question 6

**Q: Given a list of transactions, find the top 3 categories by total amount, excluding categories with less than 5 transactions.**

```java
class Transaction {
    String category;
    BigDecimal amount;
}

List<Transaction> transactions = ...;
```

**Answer:**

```java
List<String> top3Categories = transactions.stream()
    // Group by category
    .collect(Collectors.groupingBy(
        Transaction::getCategory,
        Collectors.collectingAndThen(
            Collectors.toList(),
            list -> Map.entry(list.size(), 
                             list.stream()
                                 .map(Transaction::getAmount)
                                 .reduce(BigDecimal.ZERO, BigDecimal::add))
        )
    ))
    .entrySet().stream()
    // Filter: at least 5 transactions
    .filter(e -> e.getValue().getKey() >= 5)
    // Sort by total amount descending
    .sorted(Map.Entry.<String, Map.Entry<Integer, BigDecimal>>comparingByValue(
        (e1, e2) -> e2.getValue().compareTo(e1.getValue())
    ))
    // Take top 3
    .limit(3)
    // Extract category names
    .map(Map.Entry::getKey)
    .collect(Collectors.toList());
```

**Cleaner version:**
```java
// Step 1: Group and aggregate
Map<String, CategoryStats> categoryStats = transactions.stream()
    .collect(Collectors.groupingBy(
        Transaction::getCategory,
        Collectors.collectingAndThen(
            Collectors.toList(),
            list -> new CategoryStats(
                list.size(),
                list.stream()
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
            )
        )
    ));

// Step 2: Filter, sort, limit
List<String> top3 = categoryStats.entrySet().stream()
    .filter(e -> e.getValue().count >= 5)
    .sorted(Map.Entry.comparingByValue(
        Comparator.comparing(CategoryStats::getTotalAmount).reversed()
    ))
    .limit(3)
    .map(Map.Entry::getKey)
    .collect(Collectors.toList());

record CategoryStats(int count, BigDecimal totalAmount) {}
```

---

## 🔍 Reflection & Dynamic Proxy

### Reflection Basics

```java
// Get Class object
Class<?> clazz = String.class;
Class<?> clazz = "hello".getClass();
Class<?> clazz = Class.forName("java.lang.String");

// Get fields
Field[] fields = clazz.getDeclaredFields();
for (Field field : fields) {
    System.out.println(field.getName() + ": " + field.getType());
}

// Get methods
Method[] methods = clazz.getDeclaredMethods();
for (Method method : methods) {
    System.out.println(method.getName());
}

// Access private field
public class Person {
    private String name = "John";
}

Person person = new Person();
Field nameField = Person.class.getDeclaredField("name");
nameField.setAccessible(true);  // Bypass private access
String name = (String) nameField.get(person);  // "John"
nameField.set(person, "Jane");  // Modify private field

// Invoke private method
Method method = Person.class.getDeclaredMethod("privateMethod");
method.setAccessible(true);
method.invoke(person);
```

**Use cases:**
1. Frameworks (Spring, Hibernate)
2. Testing (mocking frameworks)
3. Serialization/deserialization
4. Dependency injection

**Downsides:**
1. Performance overhead (~10-50x slower)
2. Breaks encapsulation
3. Security issues (need to disable security manager)
4. Type safety lost (runtime errors)

### Dynamic Proxy

**JDK Dynamic Proxy (interface-based):**
```java
public interface UserService {
    User findById(String id);
    void save(User user);
}

public class UserServiceImpl implements UserService {
    public User findById(String id) {
        return database.find(id);
    }
    
    public void save(User user) {
        database.save(user);
    }
}

// Create proxy
UserService proxy = (UserService) Proxy.newProxyInstance(
    UserService.class.getClassLoader(),
    new Class<?>[] { UserService.class },
    new InvocationHandler() {
        private final UserService target = new UserServiceImpl();
        
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            // Before method execution
            long start = System.currentTimeMillis();
            System.out.println("Calling: " + method.getName());
            
            // Execute actual method
            Object result = method.invoke(target, args);
            
            // After method execution
            long duration = System.currentTimeMillis() - start;
            System.out.println("Completed in: " + duration + "ms");
            
            return result;
        }
    }
);

// Usage
User user = proxy.findById("123");
// Output:
// Calling: findById
// Completed in: 45ms
```

**Production example: Transaction proxy**
```java
public class TransactionHandler implements InvocationHandler {
    private final Object target;
    private final TransactionManager txManager;
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (method.isAnnotationPresent(Transactional.class)) {
            // Start transaction
            txManager.begin();
            try {
                Object result = method.invoke(target, args);
                txManager.commit();  // Commit on success
                return result;
            } catch (Exception e) {
                txManager.rollback();  // Rollback on error
                throw e;
            }
        } else {
            return method.invoke(target, args);  // No transaction
        }
    }
}

// This is how @Transactional works in Spring!
```

**CGLIB Proxy (class-based):**
```java
// When target class doesn't implement interface
public class UserService {  // No interface
    public User findById(String id) {
        return database.find(id);
    }
}

// Spring uses CGLIB to create subclass proxy
// Generated class:
public class UserService$$EnhancerByCGLIB$$12345 extends UserService {
    @Override
    public User findById(String id) {
        // Interceptor logic (transactions, security, etc.)
        return super.findById(id);
    }
}
```

---

## 📚 ClassLoaders

### ClassLoader Hierarchy

```
    Bootstrap ClassLoader (C++)
           ↑
    Extension ClassLoader (Java 8) / Platform ClassLoader (Java 9+)
           ↑
    System/Application ClassLoader
           ↑
    Custom ClassLoader (e.g., Tomcat, Spring Boot)
```

**What each loads:**

1. **Bootstrap ClassLoader:**
   - `rt.jar` (Java 8) or modules (Java 9+)
   - Core classes: `java.lang.*`, `java.util.*`

2. **Extension/Platform ClassLoader:**
   - `lib/ext` directory (Java 8)
   - Platform modules (Java 9+)

3. **System ClassLoader:**
   - Application classpath
   - Your application classes

**Delegation model:**
```
Request to load com.myapp.MyClass:
1. System ClassLoader → checks if already loaded
2. Delegates to Parent (Extension)
3. Extension → Delegates to Parent (Bootstrap)
4. Bootstrap → Can't find → returns to Extension
5. Extension → Can't find → returns to System
6. System → Finds in classpath → Loads class
```

**Custom ClassLoader:**
```java
public class MyClassLoader extends ClassLoader {
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        // Load class from custom source (database, network, etc.)
        byte[] classBytes = loadClassBytesFromCustomSource(name);
        return defineClass(name, classBytes, 0, classBytes.length);
    }
    
    private byte[] loadClassBytesFromCustomSource(String className) {
        // Custom logic to load .class file
        // Could be from encrypted file, remote server, etc.
        return ...;
    }
}

// Usage
MyClassLoader loader = new MyClassLoader();
Class<?> clazz = loader.loadClass("com.myapp.MyClass");
Object instance = clazz.getDeclaredConstructor().newInstance();
```

**Real-world use cases:**
1. **Hot reload** (Spring DevTools, JRebel)
2. **Plugin systems** (Eclipse, IntelliJ)
3. **Web containers** (Tomcat - separate classloader per WAR)
4. **OSGi** (modular class loading)

**FAANG Interview Question:**

**Q: What happens when you have the same class in two different JARs on classpath?**

**Answer:**
```
First JAR on classpath wins (loaded first):

Classpath: lib/app-v1.jar:lib/app-v2.jar

If both contain com.myapp.MyClass:
- System ClassLoader finds it in app-v1.jar first
- Loads and caches it
- Never loads from app-v2.jar (already in cache)

This causes "JAR hell" - unpredictable behavior based on classpath order

Solutions:
1. Maven dependency management (exclude conflicting JARs)
2. Shading/relocation (rename packages in one JAR)
3. OSGi (explicit versioning)
4. Custom classloader per module
```

---

*[Continued in next message due to length...]*

This is just the first section! I'll continue creating all the other sections. Would you like me to proceed with the remaining topics?
