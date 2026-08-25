# JVM Architecture — Heap, Stack, Metaspace
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- The JVM has three main memory areas: **Heap** (objects live here), **Stack** (method calls and local variables for each thread), **Metaspace** (class metadata — method definitions, static fields, bytecode).
- **Heap** = shared by all threads. Divided into Young Gen (Eden + Survivor) and Old Gen. GC runs here.
- **Stack** = one per thread. Not shared. Each method call creates a stack frame. Popped when the method returns. `StackOverflowError` = too many nested calls.
- **Metaspace** replaced PermGen in Java 8. Stored outside the heap in native memory. Can grow dynamically — no more `OutOfMemoryError: PermGen space`.
- Gap to bridge: knowing JVM memory layout directly explains `OutOfMemoryError` types — interviewers at companies like PhonePe and Razorpay ask this when discussing production incidents.

---

## 1. One-Line Definition
The JVM (Java Virtual Machine) is the runtime that executes Java bytecode, managing memory across three areas — the Heap for objects, a per-thread Stack for method calls, and Metaspace for class definitions.

---

## 2. The Problem It Solves

A Spring Boot service running an order processing system starts throwing `java.lang.OutOfMemoryError: Java heap space` at 2 AM. The on-call engineer looks at the logs. Thousands of `Order` objects are piling up. The JVM ran out of memory on the Heap. The service restarts. Orders are lost.

Another service throws `java.lang.OutOfMemoryError: Metaspace`. The team hadn't changed the business logic. But a library was dynamically generating proxy classes at runtime — Spring AOP was creating a new proxy class for every bean method. Metaspace filled up with class metadata and couldn't grow further because no one had set a Metaspace limit.

A third service throws `java.lang.StackOverflowError`. A recursive method was processing a deeply nested JSON structure without a base case guard. Each call pushed a new stack frame. The thread's stack filled up.

Three different errors. Three different memory regions. Each has a completely different cause and fix. Without understanding JVM architecture — heap, stack, metaspace — these errors are mystifying. With it, you know exactly where to look and what to do.

---

## 3. How It Works Internally

### The Mental Model
Think of the JVM as a well-organised office building.

The **Heap** is the main warehouse floor — shared by everyone in the building. All packages (objects) are stored here. The warehouse team (Garbage Collector) periodically walks through and removes packages nobody is using anymore.

The **Stack** is each worker's own desk. Every thread (worker) has their own desk. When a worker starts a task (method call), they put a notepad on their desk with details of that task. When the task is done, they tear off the notepad and toss it. The desk only holds so many notepads — too many nested tasks = `StackOverflowError`.

The **Metaspace** is the company's reference library. It holds the blueprints (class definitions) — how to create objects, what methods exist, how many fields each class has. Every worker refers to these blueprints. The library is separate from the warehouse — storing a new blueprint doesn't use warehouse space.

### The Mechanism — Step by Step

**1. Heap — Object storage, GC-managed**
```
The Heap is divided into:
  Young Generation:
    - Eden Space: where all new objects are born.
    - Survivor 0 (S0) and Survivor 1 (S1): where objects go after surviving a Minor GC.
  Old Generation (Tenured):
    - Where objects that survive many GC cycles are promoted.
    - Major GC (or Full GC) collects this area — expensive, causes stop-the-world pauses.

Object lifecycle:
  1. new Order() → created in Eden
  2. Minor GC runs → Order survives → moved to S0
  3. More Minor GCs → Order survives → moved to S1, then Old Gen
  4. Order no longer referenced → collected in Major GC
```

**2. Stack — One per thread, method call frames**
```
Each thread gets its own Stack at creation.
Default stack size: ~512KB–1MB (JVM-dependent).
Each method call pushes a Stack Frame containing:
  - Local variables (int, references)
  - Operand stack (working area for calculations)
  - Reference to the current method's class in Metaspace

Call returns → frame is popped → memory freed instantly.
No GC needed for stack — frames are deterministically
added/removed with method entry/exit.

Recursion depth limit: typically ~10,000 frames for deep recursive calls.
Exceeded → StackOverflowError.
```

**3. Metaspace — Class metadata, outside the heap**
```
Stores per-class:
  - Bytecode for all methods
  - Field names, types, access modifiers
  - Method signatures and bytecode
  - Static variables (references stored here; objects they point to → Heap)
  - Constant pool

Before Java 8: this was PermGen — a fixed-size heap region.
  Overflow = OutOfMemoryError: PermGen Space

Java 8+: Metaspace uses native memory (OS-level, outside JVM heap).
  Grows automatically as more classes are loaded.
  Set a limit with: -XX:MaxMetaspaceSize=256m
  Without a limit: consumes native memory until the process is killed by the OS.
```

**4. Other memory areas (know the names, not the depth)**
```
PC Register:      One per thread. Tracks the current bytecode instruction.
Native Method Stack: Handles calls into native (C/C++) code via JNI.
Code Cache:       Stores JIT-compiled native code for hot methods.
                  If full: JVM falls back to bytecode interpretation — slowdown.
```

### ASCII Diagram

```
JVM MEMORY LAYOUT:
────────────────────────────────────────────────────────────────────
  JVM PROCESS
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  ┌──────────────── HEAP ────────────────────────────────┐   │
  │  │                                                       │   │
  │  │  ┌─── Young Generation ──────────────┐  ┌─Old Gen─┐  │   │
  │  │  │  ┌──────────┐  ┌────┐  ┌────┐    │  │         │  │   │
  │  │  │  │  Eden    │  │ S0 │  │ S1 │    │  │ Tenured │  │   │
  │  │  │  │(new objs)│  │    │  │    │    │  │         │  │   │
  │  │  │  └──────────┘  └────┘  └────┘    │  └─────────┘  │   │
  │  │  └───────────────────────────────────┘               │   │
  │  │       ↑ Minor GC (fast)              ↑ Major GC      │   │
  │  └───────────────────────────────────────────────────────┘   │
  │                                                              │
  │  ┌─── METASPACE (native memory, outside heap) ───────────┐  │
  │  │  Class bytecode · method signatures · static refs      │  │
  │  │  Spring proxy classes · JPA entity metadata            │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                              │
  │  ┌─ Thread 1 Stack ─┐  ┌─ Thread 2 Stack ─┐  ┌─ T3 ... ─┐  │
  │  │ [Frame: main()]  │  │ [Frame: handle()]│  │ ...       │  │
  │  │ [Frame: parse()] │  │ [Frame: query()] │  │           │  │
  │  │ [Frame: build()] │  │                  │  │           │  │
  │  └──────────────────┘  └──────────────────┘  └───────────┘  │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — Ignoring JVM Limits Until Production Breaks
```java
// WRONG 1: Loading unlimited classes dynamically — fills Metaspace silently
// This pattern appears in Spring AOP, bean proxying, and some code generation libs

// If a library generates proxy classes in a loop (e.g., a buggy AOP setup),
// Metaspace grows without bound:
for (int i = 0; i < Integer.MAX_VALUE; i++) {
    // Each createProxy() call might load a new synthetic class into Metaspace
    ProxyFactory.createProxy(SomeService.class);
}
// OutOfMemoryError: Metaspace — no limit was set, native memory exhausted

// WRONG 2: Unbounded recursion — fills the thread Stack
public long factorial(long n) {
    return n * factorial(n - 1);  // No base case!
}
// factorial(100000) → 100,000 stack frames → StackOverflowError

// WRONG 3: Holding references to live objects — prevents GC from collecting them
@Service
public class ReportService {
    private final List<Report> allReports = new ArrayList<>();  // Static-lifetime field

    public Report generateReport(OrderData data) {
        Report report = new Report(data);     // Object created in Eden
        allReports.add(report);               // Reference held forever
        return report;
        // Report is never garbage-collected because allReports still holds it.
        // After 10 million reports: heap fills up → OutOfMemoryError: Java heap space
    }
}
```

### Right Way — JVM Memory Tuning in Production
```java
// RIGHT 1: JVM startup flags for a Spring Boot production service
// (set in Dockerfile CMD or Kubernetes deployment YAML)

// -Xms512m            → Initial heap size — JVM starts with 512MB
// -Xmx2g              → Max heap size — JVM never exceeds 2GB
// -XX:MaxMetaspaceSize=256m → Cap Metaspace growth (prevents OOM on native mem)
// -Xss512k            → Stack size per thread (default ~1MB, reduce to save memory)
//                         Lower value = more threads possible; higher = deeper recursion
// -XX:+UseG1GC        → Use G1 Garbage Collector (default in Java 9+)
// -XX:+HeapDumpOnOutOfMemoryError  → Auto-dump heap on OOM for analysis
// -XX:HeapDumpPath=/var/log/heapdump.hprof

// Example: Spring Boot Docker container in production
// CMD ["java",
//   "-Xms512m", "-Xmx2g",
//   "-XX:MaxMetaspaceSize=256m",
//   "-XX:+UseG1GC",
//   "-XX:+HeapDumpOnOutOfMemoryError",
//   "-jar", "app.jar"]

// RIGHT 2: Fix unbounded recursion with base case + iteration alternative
public long factorial(long n) {
    if (n <= 1) return 1;          // Base case — stops recursion
    return n * factorial(n - 1);
}
// For very deep recursion (n > 10,000), switch to iterative:
public long factorialIterative(long n) {
    long result = 1;
    for (long i = 2; i <= n; i++) result *= i;
    return result;   // Zero stack growth — just one frame
}

// RIGHT 3: Avoid holding references beyond their needed lifetime
@Service
public class ReportService {
    // Don't store every report in memory — process and discard
    public Report generateReport(OrderData data) {
        Report report = new Report(data);
        reportRepository.save(report);   // Persist to DB
        return report;                   // Caller holds reference briefly
        // After method returns and caller is done → report becomes unreachable → GC eligible
    }
}

// RIGHT 4: Diagnose OutOfMemoryError type from the message
// "OutOfMemoryError: Java heap space"      → Heap too small or memory leak → check -Xmx, heap dump
// "OutOfMemoryError: Metaspace"            → Too many classes loaded → set -XX:MaxMetaspaceSize
// "OutOfMemoryError: unable to create native thread" → Too many threads → reduce -Xss or thread pool size
// "StackOverflowError"                     → Infinite recursion → fix base case
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain the JVM memory model — what are the main memory areas?"

**Hruday's answer:**
> There are three main areas I think about in day-to-day production work.
>
> The **Heap** is where all objects live. It's shared by every thread. The GC manages it. It has a Young Generation for new objects — with Eden and two Survivor spaces — and an Old Generation for objects that survive many GC cycles. Most `OutOfMemoryError: Java heap space` errors mean the heap is full, either because it's too small or there's a memory leak holding references alive.
>
> The **Stack** is per-thread. Each method call pushes a stack frame with local variables and the call state. The frame is popped when the method returns. Stack memory is not GC-managed — it's automatically freed when frames are popped. `StackOverflowError` means a thread ran out of stack space, usually from infinite or very deep recursion.
>
> **Metaspace** holds class definitions — bytecode, method signatures, field metadata, static variable references. It's stored in native memory outside the heap, which is why it replaced PermGen in Java 8. It grows dynamically unless you cap it with `-XX:MaxMetaspaceSize`. `OutOfMemoryError: Metaspace` usually means too many classes are being loaded dynamically — common in Spring-heavy or AOP-heavy applications with proxy class generation.
>
> In production at Oracle India, we set `-Xmx`, `-XX:MaxMetaspaceSize`, and always enabled `-XX:+HeapDumpOnOutOfMemoryError` so we could analyse what filled the heap when it happened.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the Young Generation and why does it exist?"

**Hruday's answer:**
> The Young Generation exists because of a pattern called the "generational hypothesis" — most objects die young. In a typical Java application, the vast majority of objects are created and discarded quickly. Think of a web request: you create `RequestDTO`, `ResponseDTO`, some intermediate processing objects — all short-lived. Only a few objects, like cached services, connection pools, and long-lived domain objects, survive for a long time.
>
> The Young Generation exploits this. All new objects are created in Eden Space. Eden fills up fast. A "Minor GC" runs — it's very fast because 98% of Eden objects are already dead. Only the surviving 2% are copied to a Survivor space. This copy-and-compact approach is fast: the GC doesn't scan the whole heap, just Eden and the last survivor space.
>
> Objects that survive enough Minor GC cycles get promoted to the Old Generation. Minor GC on Old Gen is expensive — it lives longer and is bigger, so collecting it (Major or Full GC) causes a noticeable stop-the-world pause.
>
> The practical implication for Spring Boot apps: create short-lived objects freely — the Young GC is cheap and fast. Be careful about what you put in long-lived collections (like a `@Service` field holding a `List`) — those go to Old Gen and eventually cause expensive GC cycles.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the trade-offs when setting the JVM heap size with -Xmx?"

**Hruday's answer:**
> Setting `-Xmx` is a balance between three forces: memory bill, GC pause frequency, and crash risk.
>
> **Too small**: GC runs constantly because the heap fills quickly. The application spends 30% of its CPU time doing garbage collection instead of serving requests. Latency spikes. If the heap truly runs out, the JVM throws `OutOfMemoryError` and the service dies.
>
> **Too large**: GC runs infrequently but when it does, the pause is longer. A 16GB heap that fills up will take longer to GC than a 2GB heap. Also, you're paying for memory you might not need. In Kubernetes, this means requesting a large pod memory limit that could be better shared across more instances.
>
> **The starting guideline**: set `-Xmx` to 75% of the container's memory limit. Leave 25% for Metaspace, thread stacks, JIT code cache, and the OS. A 4GB Kubernetes pod → `-Xmx 3g` is a reasonable start.
>
> **The tuning approach**: run the service under realistic load, watch GC frequency and pause duration via `-XX:+PrintGCDetails` or a monitoring tool like Micrometer + Prometheus. Ideally, Minor GC should run every few seconds and pause for < 10ms. If Major GC is running more than once per minute, the heap is too small.
>
> In production, I always set both `-Xms` (initial) and `-Xmx` (max) to the same value (e.g., both 2g) in containers. This prevents the JVM from doing repeated incremental heap expansions — it just starts at the full size and is predictable.

---

### Q4 — Scenario Question
**Interviewer asks:** "Your Spring Boot service throws OutOfMemoryError: Metaspace. What do you investigate?"

**Hruday's answer:**
> First: I check if `-XX:MaxMetaspaceSize` is set. If it's not, Metaspace grows unbounded and eventually eats the OS's native memory. The fix might be as simple as adding a cap.
>
> Second: I check the number of loaded classes over time. I'd use `jcmd <PID> VM.class_histogram` or connect JConsole/VisualVM to the running JVM. If the loaded class count keeps growing without bound — a memory leak in Metaspace — that's the real problem.
>
> Third: I look for dynamic class generation. The most common culprits:
> - Spring AOP / CGLIB proxies: every `@Transactional` or `@Aspect` bean gets a proxy class. If beans are created dynamically in a loop (rare but possible with factory patterns), proxy class count grows.
> - Groovy or other scripting engines: every script evaluation can compile to a new class.
> - Java serialisation proxies or reflection-based code generation libraries.
>
> Fourth: if the class count is legitimate (a large application with many modules), I'd increase `-XX:MaxMetaspaceSize` to a higher fixed limit — say 512m — to give it room, while also monitoring over time to validate it stabilises.
>
> At SAP, our micro-frontend shell loaded multiple remote modules at runtime. Each remote module brought in its own class definitions. We had to tune Metaspace because the default limit was too small for 12 remote apps loaded simultaneously.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Confusing OOM error types | "OutOfMemoryError means the heap is full." | "There are three types: heap space (heap full), Metaspace (class metadata full), unable to create native thread (too many threads). Each has a different fix." |
| Static fields = Heap | "Static variables are stored in the Heap." | "References from static fields are in Metaspace. The objects those references point TO are in the Heap." |
| Stack is GC'd | "The GC cleans up the Stack." | "Stack is NOT GC-managed. It's cleaned automatically when method frames are popped — no GC involved." |
| PermGen confusion | "Metaspace is like PermGen." | "Metaspace replaced PermGen in Java 8. PermGen was a fixed-size heap region. Metaspace uses native memory and grows dynamically." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India we ran Spring Boot APIs inside an on-premise server with 8GB RAM. After deploying a new version with Spring AOP advice on 50+ service methods, the service started failing with `OutOfMemoryError: Metaspace` within 48 hours. Our Metaspace limit wasn't set — it was growing without bound as Spring's CGLIB proxied every method. Adding `-XX:MaxMetaspaceSize=256m` stopped the crash. But the real fix was auditing the AOP advice — half of it was added 'just in case' with no active pointcuts. Removing unused advice cut the proxy class count by 40%. That incident made JVM memory configuration part of our standard deployment checklist. Every service ships with explicit Xms, Xmx, and MaxMetaspaceSize values now."

---

## 8. Scale Evolution

**Junior engineer →** Knows "Java has a heap." Doesn't know about Young Gen, Stack, Metaspace, or what each OOM error type means.

**Mid-level engineer →** Can set `-Xmx`. Knows heap dumps exist. Has seen `OutOfMemoryError` but might not know which region caused it.

**Senior engineer →** Tunes `-Xms`, `-Xmx`, `-XX:MaxMetaspaceSize`, `-Xss`. Can read a heap dump with Eclipse MAT or VisualVM. Understands Young Gen / Old Gen promotion lifecycle.

**Staff engineer →** Correlates JVM metrics (GC pause time, GC frequency, heap utilisation, class count) with application SLOs. Writes tooling to alert when Metaspace class count grows unexpectedly. Chooses GC algorithm based on latency vs throughput requirements.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | High-QPS payment services — JVM tuning directly affects p99 latency during GC pauses | "You set both Xms and Xmx to the same value in containers. That's what we do to avoid runtime heap expansion." |
| Swiggy / Meesho | Microservices at high throughput — understanding Young Gen/Old Gen GC frequency matters for SLA | "You explained StackOverflowError as a stack depth issue, not a heap issue. Correct." |
| Adobe / SAP | Enterprise Spring Boot — AOP proxies, JPA entity loading, large classpath apps that stress Metaspace | "You diagnosed Metaspace OOM by looking at loaded class count. That's the right first step." |
| Google / Amazon | JVM internals at SDE-2+ — expect OOM scenario debugging questions | "Walk me through how you'd investigate an OutOfMemoryError in production." |

---

## 10. Related Topics — What to Study Next

- **Garbage Collection — G1, ZGC (Topic 22)** — The next topic. Builds directly on Young Gen / Old Gen understanding from this file.
- **Memory Leaks in Backend Systems (Topic 23)** — What causes objects to never get GC-collected — static references, listener leaks, ThreadLocal.
- **Thread Pools (Topic 26)** — Thread pool size directly determines how many Stack allocations the JVM makes. Under-sizing or over-sizing impacts memory and performance.
- **String Pool and Immutability (Topic 24)** — Strings are stored partly in a special Heap region. Understanding the String pool explains why `String.intern()` can save memory.

---

*Part 2 · JVM Architecture — Heap, Stack, Metaspace · Full Stack Interview Guide · Hruday D · 2026*
