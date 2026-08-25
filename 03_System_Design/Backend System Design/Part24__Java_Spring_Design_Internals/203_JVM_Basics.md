# 203. JVM Basics (Heap, Stack, GC Overview)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

The **Java Virtual Machine (JVM)** is the runtime environment in which Java bytecode executes. Understanding JVM internals is essential for backend engineers because JVM behavior directly impacts application performance, latency, memory usage, and production incidents such as `OutOfMemoryError` and GC pauses.

**What it is:**
- An abstract computing machine that provides a runtime environment for Java bytecode
- An automatic memory manager (via Garbage Collection) that allocates and reclaims objects
- A JIT (Just-In-Time) compiler that compiles frequently-executed bytecode to native machine code at runtime

**Why it matters for backend engineers:**
- Memory sizing comes from understanding heap vs. off-heap allocation
- Latency spikes in production are often caused by GC pause events
- Tuning thread stacks affects how many threads a single JVM instance can support
- Understanding class loading explains startup time in microservices

**The problem it solves:**
- Manual memory management (C/C++) leads to memory leaks and dangling pointers
- JVM provides cross-platform execution ("Write once, run anywhere")
- Automatic GC prevents entire classes of memory bugs

**Role in large-scale backend systems:**
- Every Spring Boot service runs on a JVM — understanding it is non-negotiable
- JVM tuning is often the difference between a service that handles 10,000 QPS and one that handles 50,000
- GC configuration is directly linked to P99 latency SLOs at FAANG

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### JVM Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  JVM                                                  │
│                                                       │
│  ┌─────────────────┐  ┌────────────────────────────┐  │
│  │  ClassLoader    │  │  Execution Engine           │  │
│  │  (load .class)  │  │  - Interpreter              │  │
│  └─────────────────┘  │  - JIT Compiler (HotSpot)   │  │
│                       │  - GC                        │  │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Runtime Data Areas                              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
│  │  │  Heap    │ │  Stack   │ │  Metaspace/       │ │  │
│  │  │          │ │(per thread)│ │  Method Area    │ │  │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │  │
│  │  ┌──────────────────┐ ┌─────────────────────┐   │  │
│  │  │  PC Registers    │ │  Native Method Stack │   │  │
│  │  └──────────────────┘ └─────────────────────┘   │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

### The Heap

The heap is where **all object instances** live. It is the primary concern for memory tuning.

**Heap Structure (in G1/CMS GC):**
```
Heap
  ├── Young Generation (Eden + Survivor S0, S1)
  │     └── Most objects created here (short-lived)
  │         Minor GC runs here frequently (< 10ms)
  └── Old Generation (Tenured)
        └── Long-lived objects promoted from Young Gen
            Major GC runs here (can be 100ms–seconds)
```

**Key heap flags:**
```bash
-Xms2g          # Initial heap size (2 GB)
-Xmx8g          # Maximum heap size (8 GB)
-XX:NewRatio=2  # Old:Young ratio = 2:1
```

**Tuning principle:**
- Set `-Xms` equal to `-Xmx` in production to prevent heap resizing pauses
- Under-size: frequent GC, `OutOfMemoryError`
- Over-size: long GC pauses when the large heap is scanned

---

### The Stack

Each **thread** has its own stack. The stack stores:
- **Stack frames** (method call context)
- **Local variables** (primitives and object references)
- **Return addresses**

**Stack is not GC-managed** — when a frame is popped (method returns), memory is freed automatically.

**Key flag:**
```bash
-Xss512k   # Thread stack size (default: 512KB–1MB)
```

**Implication for microservices:**
- 1000 concurrent threads × 512KB stack = 500MB just for stacks
- Smaller `-Xss` → more threads for the same memory; too small → `StackOverflowError`
- Virtual threads (Project Loom, Java 21+) address this: millions of virtual threads with tiny per-thread overhead

---

### Metaspace (formerly PermGen)

- Stores **class metadata**: class definitions, method bytecode, constant pool
- Since Java 8: Metaspace lives in **native memory** (not the heap) — bounded by OS, not `-Xmx`
- Can grow unboundedly by default → use `-XX:MaxMetaspaceSize=256m` to cap it
- `OutOfMemoryError: Metaspace` → classloader leak (e.g., hot-redeploying in app servers)

---

### Garbage Collection Overview

GC is the automatic process of identifying and reclaiming unreachable objects.

**Generational GC Hypothesis:**
- Most objects die young (short-lived request-scoped objects)
- GC focuses on the young generation (minor GC) — fast because it's small
- Surviving objects are promoted to the old generation (major/full GC)

**Common GC Algorithms:**

| GC | Java Version | Characteristic | Use Case |
|---|---|---|---|
| **Serial GC** | Any | Single-threaded GC | Embedded, single-core |
| **Parallel GC** | Default in Java 8 | Multi-threaded GC, stop-the-world | Throughput-focused workloads |
| **CMS (Concurrent Mark Sweep)** | Deprecated Java 14 | Low pause, concurrent marking | Legacy low-latency systems |
| **G1 GC** | Default Java 9+ | Region-based, predictable pauses | General-purpose, large heaps |
| **ZGC** | Java 15+ | Sub-millisecond pauses | Ultra-low latency systems |
| **Shenandoah** | Java 12+ | Concurrent compaction | Low latency |

**G1 GC** is the recommended default for most Spring Boot services:
```bash
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200   # Soft target: try to keep pauses < 200ms
-XX:G1HeapRegionSize=16m   # Region size (auto-tuned)
```

**ZGC** for ultra-low latency:
```bash
-XX:+UseZGC
# Pauses typically < 1ms even with 100GB heap
```

---

### GC Phases

**Minor GC (Young Gen):**
1. Stop-the-world (briefly — usually < 10ms)
2. Copy live objects from Eden to Survivor space
3. Increment object age counters
4. Promote old-enough objects to Old Gen

**Major / Full GC (Old Gen):**
1. Stop-the-world or concurrent marking (depends on GC algorithm)
2. Mark reachable objects
3. Sweep/compact unreachable objects
4. Can pause for 100ms–several seconds with large heaps

**GC root objects** (what keeps objects alive):
- Static fields
- JVM stack frames (local variables)
- JNI references
- Active threads

---

### JIT Compilation

The JVM interprets bytecode initially, but "hot" methods are JIT-compiled to native code:
- **Tier 1:** Server interpreter
- **Tier 4:** C2 compiler (full optimization — inlining, escape analysis, loop unrolling)

**Escape Analysis:** If an object is created and proven to never escape the method → allocated on the stack (not heap) → no GC pressure

```java
// Object may be stack-allocated by the JIT — no heap allocation if it doesn't escape
public double calculateDistance(double x1, double y1, double x2, double y2) {
    Point p1 = new Point(x1, y1);  // might be stack-allocated by JIT
    Point p2 = new Point(x2, y2);
    return p1.distanceTo(p2);
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

**JVM memory sizing for a typical Spring Boot service:**

```
Heap:           2–8 GB (set -Xms = -Xmx to avoid resizing)
Metaspace:      256 MB (Spring Boot with many classes)
Thread stacks:  500 threads × 512 KB = 256 MB
Code cache:     256 MB (JIT compiled code)
Off-heap:       Netty buffers, NIO, DirectByteBuffer
Total RSS:      Heap + Metaspace + Stack + Code + OS overhead
                ≈ Xmx + 1–2 GB of overhead
```

**Container sizing rule:**
```
Container memory limit ≥ Xmx + 1.5 GB
If Xmx = 4 GB → container limit should be at least 5.5 GB
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

**JVM heap impact on DB connections:**
- Connection pool size (HikariCP default: 10) — each connection holds prepared statements in heap
- Large result sets loaded into heap → `OutOfMemoryError` — use pagination/streaming

**Off-heap storage:**
- Direct ByteBuffers for disk I/O (NIO) — bypasses heap GC overhead
- Many caches (Ehcache off-heap, Chronicle Map) store data outside the heap to avoid GC pressure
- Kafka consumer buffers, Netty network buffers — all off-heap

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

**GC tuning for low-latency services:**
- Target: P99 latency < 50ms → use G1 with `MaxGCPauseMillis=50` or ZGC
- Monitor: `jstat -gcutil <pid> 1000` — watch GC pause frequency and duration
- Alert on: Full GC frequency > 1/hour → sign of memory pressure or leak

**JVM memory leak detection:**
- Heap dump: `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/heapdump.hprof`
- Analyze with Eclipse MAT or VisualVM to find retained object trees
- Common causes: static collections, ThreadLocal not cleaned up, listener registration leaks

**Reliability — JVM options for production:**
```bash
-XX:+ExitOnOutOfMemoryError       # Kill process on OOM instead of limping
-XX:+HeapDumpOnOutOfMemoryError   # Capture heap dump for analysis
-XX:+UseStringDeduplication       # G1 only — deduplicate string instances in heap
-Dfile.encoding=UTF-8             # Consistent character encoding
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- **Deserialization attacks:** Java object deserialization is a major attack vector (CVE-notorious). Use `ObjectInputFilter` or avoid Java serialization entirely for network communication — prefer JSON/Protobuf.
- **JVM security manager:** Deprecated in Java 17, removed in Java 19 — use OS-level sandboxing instead
- **Class loading:** Ensure custom classloaders don't leak classes (Metaspace OOM in long-running app servers)

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Twitter's Scala JVM Tuning
- Twitter's backend (Scala on JVM) experienced multi-second GC pauses with CMS on large heaps
- Migrated to G1 GC with region-based collection → reduced P99 GC pauses from 2–3s to < 200ms
- Heap sizing and GC algorithm choice was a major engineering investment

### Discord's Java Heap Optimization
- Discord's message service was experiencing GC pressure from short-lived message objects
- Fixed by reducing object allocation rate in the hot path: reusing buffers and reducing intermediate object creation
- Result: 60% reduction in minor GC frequency

### Spring Boot K8s Container OOM
- Common pattern: `Xmx=4g`, container limit=4g → JVM RSS grows to 5.5g → container OOM-killed
- Fix: `Xmx=3g`, container limit=4.5g (accounting for JVM overhead beyond the heap)
- Rule: container limit must be at least `Xmx + 1.5 GB`

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "The JVM has three key memory regions for backend engineers to understand. The heap is where objects live — divided into young and old generations; GC is the mechanism that automatically reclaims dead objects. The stack is per-thread and stores local variables and method call frames — it's managed automatically as frames are pushed and popped. Metaspace stores class metadata. In production, I tune `-Xms` and `-Xmx` to be equal to prevent heap resizing pauses, use G1 GC for its predictable pause targets, and set up heap dumps on OOM to diagnose memory leaks. For ultra-low latency services, I evaluate ZGC for its sub-millisecond pause behavior."

### Common Follow-Up Questions

1. **"What causes `OutOfMemoryError: Java heap space`?"** → Either a memory leak (objects retained unintentionally — static maps, unclosed listeners) or under-sized heap for actual live data set. Analyze heap dump to distinguish.
2. **"What is GC pressure?"** → High allocation rate causing frequent minor GCs, or long-lived objects filling the old generation, causing frequent major GCs.
3. **"Difference between G1 and ZGC?"** → G1 is region-based with configurable pause time goals (typically 10–200ms). ZGC is a concurrent algorithm with sub-millisecond pauses, suitable for ultra-low latency but slightly lower throughput.
4. **"What are virtual threads (Java 21)?"** → Lightweight threads managed by the JVM, not OS threads. Allow millions of concurrent threads with minimal memory overhead—eliminating thread pool bottlenecks in I/O-bound workloads.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Object Lifecycle in the Heap

```
new Object()
     │
     ▼
  Eden Space (Young Gen)
     │
     │ (Minor GC — short-lived objects die here)
     │ (survivors increment age counter)
     ▼
  Survivor Space (S0 ↔ S1 alternating)
     │
     │ (age >= threshold, default 15)
     ▼
  Old Generation (Tenured Heap)
     │
     │ (Major/Full GC when old gen fills)
     ▼
  GC Root → reachable? Keep   |   Unreachable? Reclaim
```

### JVM Memory Layout in a Container
```
Container Memory Limit: 6 GB
─────────────────────────────────────────
Heap (-Xms4g -Xmx4g):              4 GB
Metaspace (-XX:MaxMetaspaceSize):   256 MB
Thread Stacks (500 × 512 KB):       256 MB
Code Cache (JIT compiled):          256 MB
OS + Native overhead:               ~1 GB
─────────────────────────────────────────
Total JVM RSS:                     ~5.8 GB   ← safely under 6 GB limit
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why JVM internals matter:**
- GC pauses are a direct cause of latency spikes in production
- Memory sizing errors cause container OOM kills — service outages
- JVM tuning is how FAANG backend teams hit sub-50ms P99 latency targets

**How it works:**
- **Heap:** Where objects live; divided into young (short-lived) and old (long-lived) generations; managed by GC
- **Stack:** Per-thread; stores local variables and call frames; automatically freed on method return
- **GC:** Identifies unreachable objects and reclaims their memory; pause-free GCs (ZGC) are the modern standard
- **JIT:** Compiles hot methods to native code; escape analysis can eliminate heap allocation for local objects

**Key trade-offs:**
- Larger heap → less frequent GC but longer GC pauses
- More threads → more memory for stacks (use virtual threads in Java 21+)
- G1 GC (balanced) vs. ZGC (ultra-low latency, slightly lower throughput)
