# Garbage Collection — G1, ZGC, Types of GC
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **GC's job**: find objects on the Heap that no code can reach anymore, and free their memory — automatically.
- **Minor GC**: fast, cleans Young Generation only (Eden + Survivors). Runs often. Pause is short (< 10ms typically).
- **Major/Full GC**: cleans Old Generation. Runs rarely. Pause can be hundreds of milliseconds or seconds. This is what causes user-facing latency spikes.
- **G1GC** (default since Java 9): divides heap into equal-sized regions, collects the regions with the most garbage first ("Garbage First"). Targets a configurable pause time goal (default 200ms).
- **ZGC** (Java 15+ production-ready): designed for sub-millisecond GC pauses even on multi-terabyte heaps. Uses load barriers and concurrent phases. Best for ultra-low latency services.
- Interview trap: "stop-the-world" means all application threads pause while GC runs. Reducing stop-the-world time is the main goal of every modern GC algorithm.

---

## 1. One-Line Definition
Garbage Collection (GC) is the JVM's automatic process of finding objects that no running code references anymore, and reclaiming their Heap memory so new objects can be created.

---

## 2. The Problem It Solves

In C and C++, the programmer manually allocates memory (`malloc`) and frees it (`free`). Forget to free it → memory leak. The process slowly consumes all available RAM and crashes. Free it too early, while another part of code still has a pointer to it → dangling pointer → undefined behaviour → crash or security exploit.

Java solves this by making memory management automatic. You create objects with `new`. The JVM tracks which objects are still reachable — referenced from some live thread, static field, or other live object. When an object becomes unreachable, the GC reclaims its memory at the next collection cycle. You never call `free()`. Memory leaks still happen in Java (when you accidentally hold references), but they're far rarer and more diagnosable.

The trade-off: GC has a cost. During collection, the JVM must pause application threads to safely identify unreachable objects (stop-the-world pause). If GC pauses are too long, a payment service misses its 200ms SLA. An e-commerce checkout feels frozen. A real-time dashboard shows stale data. The evolution of Java GC algorithms (Serial → Parallel → CMS → G1 → ZGC → Shenandoah) is the story of making these pauses shorter and shorter.

---

## 3. How It Works Internally

### The Mental Model
Think of GC like a hotel housekeeping team. Guests (objects) check into rooms (heap memory). Some guests are still in their rooms (referenced by live code). Others have checked out but haven't told anyone (unreachable objects) — their rooms still look "occupied." The housekeeping team (GC) periodically walks all the rooms, checks which guests are still there, and checks out the empty rooms so new guests can move in.

The challenge: to check out an empty room, you have to stop the corridor briefly (stop-the-world). If you do it for too long, guests waiting for a room get frustrated (latency spikes). Modern GC algorithms minimise how long the corridor is stopped, doing most of the work while guests are still moving (concurrent phases).

### The Mechanism — GC Types in Order of Evolution

**1. Serial GC** (`-XX:+UseSerialGC`)
- Single-threaded. Pauses everything to collect.
- Simple, low overhead.
- Use case: small single-threaded apps, CLI tools. Never used for Spring Boot services.

**2. Parallel GC** (`-XX:+UseParallelGC`)
- Multi-threaded collection — uses all CPU cores.
- Still stop-the-world for both Minor and Major GC.
- Higher throughput (less total GC time), but longer individual pauses.
- Good for batch processing where latency doesn't matter, only total throughput.

**3. G1GC — Garbage First** (`-XX:+UseG1GC`, default since Java 9)
```
How it works:
  - Divides the heap into ~2048 equal-sized regions (1MB–32MB each).
  - Each region is labeled: Eden, Survivor, Old, or Humongous (for large objects).
  - Runs concurrently most of the time — application threads keep running.
  - Stop-the-world only for "remark" and "cleanup" phases (milliseconds).
  - Collections prioritise regions with the most garbage ("Garbage First").

Key tuning flag:
  -XX:MaxGCPauseMillis=200  ← G1 tries to stay under 200ms pause
  (It's a goal, not a hard guarantee.)

Minor GC: Collects only Eden + Survivor regions. Fast.
Mixed GC: Runs after a full heap scan — collects some Old regions + Young.
Full GC: Fallback if G1 can't keep up — all threads stop, expensive.
```

**4. ZGC** (`-XX:+UseZGC`, production-ready Java 15+)
```
How it works:
  - Almost everything runs concurrently — application threads never fully pause.
  - Uses "load barriers" — tiny code inserted by JIT at every object read.
    When your code reads a field of an object, the load barrier checks
    if that object was moved by the GC concurrent to your read.
    If it was moved, the barrier transparently redirects the pointer.
  - Uses "coloured pointers" — metadata bits in the 64-bit pointer address
    to track GC state without scanning the whole object.

Result:
  - Pause times: sub-millisecond even on 32GB+ heaps.
  - Trade-off: slightly higher CPU overhead (load barriers everywhere),
    slightly lower maximum throughput vs G1 under no-contention.

When to use ZGC:
  - Ultra-low latency services: trading systems, gaming, real-time payment
    confirmation, anything where even 50ms GC pause is unacceptable.
```

**5. Shenandoah GC** (OpenJDK, similar goals to ZGC)
```
  - Also sub-millisecond pauses, concurrent compaction.
  - Uses "Brooks forwarding pointers" (slightly different from ZGC's approach).
  - Available in OpenJDK distributions, not in Oracle JDK by default.
```

### ASCII Diagram

```
G1GC HEAP REGIONS:
────────────────────────────────────────────────────────────────────
  Heap divided into equal-sized regions (~2048 total):

  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
  │ E │ │ E │ │ S │ │ O │ │ O │ │ E │ │ H │ │ O │  ...
  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
    E=Eden  S=Survivor  O=Old  H=Humongous (>50% of region size)

  G1 tracks "liveness" per region.
  At collection time: pick regions with most garbage first.
  Evacuate surviving objects to free regions.
  A 2GB heap with 80% garbage in 4 regions? Collect those 4, free 1.6GB.
  Don't touch the 90% regions with mostly-live objects — efficient.

GC PAUSE COMPARISON:
────────────────────────────────────────────────────────────────────
  Serial GC:    [====ALL THREADS STOPPED====] (100ms–seconds)
  Parallel GC:  [===ALL THREADS STOPPED===]   (50ms–seconds, multi-core)
  G1GC:         [=CONC=][SW][=CONC=][SW]      (2–50ms stop-the-world)
              concurrent phases keep app running, tiny STW at edges
  ZGC:          [==========CONCURRENT==========][<1ms]
              nearly all work concurrent, sub-millisecond STW only
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — Ignoring GC Impact in Application Design
```java
// WRONG 1: Creating excessive short-lived objects in a tight loop
// (hammers the Young Generation — triggers frequent Minor GCs)

@GetMapping("/reports")
public List<ReportDTO> getReports(List<Order> orders) {
    List<ReportDTO> result = new ArrayList<>();
    for (Order order : orders) {
        // Bad: new object created on every iteration
        StringBuilder sb = new StringBuilder();
        sb.append("Order-").append(order.getId());
        sb.append(":").append(order.getStatus());
        result.add(new ReportDTO(sb.toString(), order.getTotal()));
        // sb is discarded after append — millions of tiny StringBuilder objects
        // fill Eden quickly → frequent Minor GC
    }
    return result;
}

// WRONG 2: Creating large byte arrays repeatedly (causes Humongous allocations in G1)
// Humongous objects skip Young Gen entirely → go straight to Old Gen → trigger Full GC
public byte[] downloadFile(String url) {
    byte[] buffer = new byte[16 * 1024 * 1024];  // 16MB — Humongous in G1
    // This goes directly to Old Gen and pressures Major GC
    // New 16MB buffer on every call = frequent Old Gen growth
    return buffer;
}

// WRONG 3: Holding references that prevent GC (common memory leak pattern)
public class EventSystem {
    private static final List<EventListener> listeners = new ArrayList<>();

    public static void register(EventListener listener) {
        listeners.add(listener);  // Static list — never cleared
    }
    // Objects registered here are NEVER garbage-collected.
    // Even if the caller loses its reference, the static list holds it.
    // Classic memory leak: soft static reference accumulation.
}
```

### Right Way — GC-Friendly Application Code
```java
// RIGHT 1: Reuse objects in loops / use streams more efficiently
@GetMapping("/reports")
public List<ReportDTO> getReports(List<Order> orders) {
    return orders.stream()
        .map(order -> new ReportDTO(
            "Order-" + order.getId() + ":" + order.getStatus(),
            order.getTotal()
        ))
        .collect(Collectors.toList());
    // JVM string concatenation with + on literals is optimised by javac to use
    // StringBuilder internally — concise and efficient.
    // Stream avoids intermediate List allocations.
}

// RIGHT 2: Buffer reuse for large byte operations (avoid Humongous allocations)
// Use a pool or reuse a fixed buffer:
private static final ThreadLocal<byte[]> BUFFER_POOL =
    ThreadLocal.withInitial(() -> new byte[16 * 1024 * 1024]);

public byte[] getBuffer() {
    return BUFFER_POOL.get();  // Reuse same buffer per thread — no repeated large alloc
}
// WARNING: ThreadLocal holds references per thread — must remove() when done
// to avoid memory leaks (covered in Topic 30)

// RIGHT 3: Weak references for listeners — allows GC to collect unreachable listeners
import java.lang.ref.WeakReference;

public class EventSystem {
    private final List<WeakReference<EventListener>> listeners = new ArrayList<>();

    public void register(EventListener listener) {
        listeners.add(new WeakReference<>(listener));
    }

    public void notifyAll(Event event) {
        listeners.removeIf(ref -> {
            EventListener l = ref.get();
            if (l == null) return true;  // GC'd — remove from list
            l.onEvent(event);
            return false;
        });
    }
    // Listener becomes GC-eligible when the caller drops its reference.
    // The WeakReference doesn't prevent GC. Memory leak fixed.
}

// RIGHT 4: JVM GC flags for a production Spring Boot service
// In Dockerfile or K8s deployment:
// java -XX:+UseG1GC               ← G1 for most services (default Java 9+)
//      -XX:MaxGCPauseMillis=100   ← Target 100ms max pause
//      -Xms2g -Xmx2g              ← Fixed heap (no dynamic expansion)
//      -XX:+PrintGCDetails        ← GC logs for analysis
//      -Xlog:gc*:file=/var/log/gc.log:time,uptime ← Structured GC log
//
// For ultra-low-latency (payment confirmation, real-time):
// java -XX:+UseZGC
//      -Xms4g -Xmx4g
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is stop-the-world in garbage collection and why does it matter?"

**Hruday's answer:**
> Stop-the-world means the JVM pauses ALL application threads — including the threads serving HTTP requests — while GC does its work.
>
> Why it happens: GC needs to find all live objects and trace the references between them. If application threads keep modifying references while GC is tracing, the GC gets an inconsistent view. So it pauses everything to get a consistent snapshot.
>
> Why it matters: during a stop-the-world pause, your application is frozen. A 200ms GC pause on a payment service means every in-flight request at that moment waits 200ms. If your SLA is 200ms p99, one GC pause breaks it.
>
> The evolution goal of Java GC has been to eliminate or minimise stop-the-world pauses. G1 does most work concurrently but still has short stop-the-world phases (2–50ms). ZGC's stop-the-world phases are sub-millisecond — it handles nearly everything concurrently.
>
> In production, you monitor GC pauses via GC logs or Micrometer/Prometheus. If pause time exceeds your latency SLO, you tune: increase heap size (less frequent GC), switch to ZGC, or find and fix memory allocation hotspots in the application code.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does G1GC decide which regions to collect first?"

**Hruday's answer:**
> G1 stands for "Garbage First" — it prioritises the regions with the most garbage (lowest live object percentage) so each collection frees the most memory for the least work.
>
> G1 tracks "remembered sets" for each region — a record of which objects in OTHER regions point into this region. During the concurrent marking phase (which runs while the app runs), G1 builds a liveness map of each region. After marking, it knows: region A is 5% live (95% garbage), region B is 80% live (20% garbage).
>
> The "collection set" it picks first: the regions with the most garbage, up to the amount needed to hit the pause time goal (`-XX:MaxGCPauseMillis`). It evacuates (copies) the surviving objects from those regions to free regions, then the old regions are completely free.
>
> This is why G1 is more predictable than Parallel GC. Parallel GC collects the entire Old Gen in one go (potentially seconds of pause). G1 collects incrementally — enough to hit the pause budget, no more.
>
> The failure mode: if allocation rate exceeds G1's ability to collect incrementally, it falls back to a Full GC — all threads stopped, entire heap collected. This is the "G1 evacuation failure" you'll see in GC logs as `[Full GC (Allocation Failure)]`. Fix: increase heap size or reduce allocation rate.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you choose ZGC over G1GC?"

**Hruday's answer:**
> ZGC when latency is everything. G1GC when throughput efficiency matters more.
>
> G1 is the right default for most Spring Boot services. It gives low-to-moderate pause times (2–50ms typically), handles large heaps well, and has lower CPU overhead than ZGC.
>
> ZGC shines when even a 10ms GC pause is unacceptable — real-time payment confirmation, gaming backends, financial trading systems, or any service with a strict sub-10ms p99 SLA. ZGC's stop-the-world pauses are sub-millisecond regardless of heap size. At 256GB heaps where G1 would pause for hundreds of milliseconds, ZGC still pauses for less than 1ms.
>
> The cost of ZGC: load barriers — tiny code inserted at every object field read. This adds CPU overhead. ZGC typically has 5–15% lower maximum throughput than G1 under no-latency-pressure workloads. If you're optimising for max transactions-per-second in a batch job, G1 or Parallel GC wins.
>
> Decision rule: need latency < 10ms always → ZGC. Normal web services → G1GC with tuning. Batch jobs → Parallel GC.

---

### Q4 — Scenario Question
**Interviewer asks:** "Your service has GC pause spikes of 500ms every 10 minutes. How do you investigate and fix it?"

**Hruday's answer:**
> Every 10 minutes suggests Old Generation filling up and triggering a Major GC (or Full GC). Here's my investigation approach:
>
> Step 1: Enable and check GC logs. `-Xlog:gc*:file=/var/log/gc.log:time,uptime` in the JVM flags. Look for `[Full GC]` or `[GC pause (mixed)]` entries with the pause duration. Confirm the type and frequency.
>
> Step 2: Check heap utilisation over time. Old Gen should be mostly stable — a slow steady rise means objects are being promoted there and not collected when they eventually die. That's a promotion rate problem.
>
> Step 3: Check for large object allocations. If objects > 50% of a G1 region size are being created repeatedly, they skip Young Gen entirely and go to Old Gen (Humongous allocations). Every 10 minutes of such allocations fills Old Gen and triggers Major GC.
>
> Step 4: Look for memory leak patterns. Use a heap dump (`jcmd <PID> GC.heap_dump dump.hprof` or the auto-dump on OOM flag). Analyse with Eclipse MAT or VisualVM — look for unexpected object counts (10 million `Order` objects in a service that shouldn't hold them all at once).
>
> Common fixes for 500ms spikes:
> - Increase heap size (`-Xmx`) — gives more room before Major GC triggers.
> - Change to ZGC — the same cleanup work but concurrently, removing the pause.
> - Fix the allocation pattern — find what's filling Old Gen and fix the reference leak.
>
> In production I'd correlate GC log timestamps with application request logs. If 500ms pauses happen every 10 minutes and a scheduled batch job runs every 10 minutes — the batch job is the culprit.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "GC runs Minor GC on Old Gen" | "Minor GC cleans Old Generation." | "Minor GC cleans Young Gen only (Eden + Survivors). Old Gen is cleaned by Major GC or G1's Mixed GC." |
| "More heap = less GC" | "I'll just increase -Xmx to avoid GC issues." | "More heap = less frequent GC but longer pauses when it runs. For latency-sensitive services, switch to ZGC instead." |
| "Full GC is always bad" | "Full GC is a bug." | "Full GC is a fallback when incremental collection (G1/ZGC) can't keep up. It's expensive but not a bug — it's a signal to investigate allocation rate or heap sizing." |
| GC chooses itself | "JVM picks the best GC automatically." | "JVM picks a default (G1 since Java 9), but you should explicitly test and tune for your workload." |

---

## 7. Hruday's Real Experience Hook

> "At Bosch, our real-time dashboard had a JVM running on an old on-premise server. Every few minutes, the dashboard would freeze for about 2 seconds and then catch up. Customers thought it was a network issue. I enabled GC logging and saw `[Full GC (Ergonomics)]` every 4 minutes pausing for 1.8 seconds. Old Generation was filling because the WebSocket event handler was holding references to historical sensor data in a `Map<DeviceId, List<SensorReading>>` that never cleared old readings. Two changes: evict readings older than 5 minutes, and switch from Parallel GC to G1GC with `-XX:MaxGCPauseMillis=100`. The 1.8-second freezes dropped to 20ms GC pause blips that the dashboard didn't even render as a flicker. That was the day GC tuning went from 'JVM magic' to a concrete engineering tool for me."

---

## 8. Scale Evolution

**Junior engineer →** Knows GC "runs automatically." Doesn't know GC types, doesn't read GC logs, hasn't debugged a GC-related production issue.

**Mid-level engineer →** Knows about heap size flags. Has seen GC pause in logs. Knows G1 is the default and it's "good."

**Senior engineer →** Reads GC logs. Understands Young/Old Gen promotion. Knows when to use G1 vs ZGC. Can identify memory leak patterns from a heap dump.

**Staff engineer →** Sets GC budgets per service tier (batch vs real-time vs API). Runs GC benchmarks before choosing algorithm for new services. Evaluates JVM upgrades for GC improvements.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment confirmation latency is a hard SLA — GC pauses must not spike it | "You chose ZGC for the payment critical path and G1 for the analytics service. Right trade-off." |
| Swiggy / Meesho | Order processing pipelines — GC pauses during meal ordering = customer frustration | "You pointed to Old Gen allocation pressure from a scheduler as the 10-min pause cause. Correct diagnosis." |
| Adobe / SAP | Enterprise Spring Boot with large heaps — G1 tuning for multi-service architectures | "You knew the G1 evacuation failure signature in GC logs. That's production depth." |
| Google / Amazon | SDE-2+ interviews on JVM internals and production reliability | "Explain how ZGC achieves sub-millisecond pauses — what are load barriers?" |

---

## 10. Related Topics — What to Study Next

- **JVM Architecture — Heap, Stack, Metaspace (Topic 21)** — The foundation for this topic — understanding Young/Old Gen requires understanding the Heap structure.
- **Memory Leaks in Backend Systems (Topic 23)** — What prevents GC from collecting objects — the most common production memory issue.
- **Thread Pools (Topic 26)** — Thread pools interact with GC — too many threads means too many stack allocations and ThreadLocal references that hold Heap objects.
- **Observability — Metrics and Alerting (Part 16)** — GC pause time, GC frequency, and heap utilisation are standard JVM metrics exported via Micrometer to Prometheus/Grafana.

---

*Part 2 · Garbage Collection — G1, ZGC, Types of GC · Full Stack Interview Guide · Hruday D · 2026*
