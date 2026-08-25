# Apple — ICT3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Software Engineer ICT3 |
| **Level** | ICT3 (Senior) |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Apple Health |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Thread-Safe Bounded Blocking Queue** (Producer-Consumer)
2. **Follow-up: Support timeout-based offer/poll and batch operations**

### 💡 Bounded Blocking Queue

```java
import java.util.concurrent.locks.*;
import java.util.concurrent.TimeUnit;

/**
 * Thread-safe bounded blocking queue using explicit lock + conditions.
 * - put(): blocks if full
 * - take(): blocks if empty
 * - offer(timeout): returns false if timeout
 * - poll(timeout): returns null if timeout
 * 
 * Uses circular array buffer (avoids LinkedList node allocation overhead).
 */
class BoundedBlockingQueue<T> {
    private final Object[] buffer;
    private int head, tail, count;
    
    private final ReentrantLock lock = new ReentrantLock(true); // Fair lock
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    
    BoundedBlockingQueue(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException();
        this.buffer = new Object[capacity];
        this.head = 0;
        this.tail = 0;
        this.count = 0;
    }
    
    // Blocking put: waits indefinitely if full
    void put(T item) throws InterruptedException {
        lock.lockInterruptibly();
        try {
            while (count == buffer.length) {
                notFull.await(); // Release lock, wait for space
            }
            enqueue(item);
        } finally {
            lock.unlock();
        }
    }
    
    // Blocking take: waits indefinitely if empty
    @SuppressWarnings("unchecked")
    T take() throws InterruptedException {
        lock.lockInterruptibly();
        try {
            while (count == 0) {
                notEmpty.await();
            }
            return dequeue();
        } finally {
            lock.unlock();
        }
    }
    
    // Timed offer: returns false if timeout expires
    boolean offer(T item, long timeout, TimeUnit unit) throws InterruptedException {
        long nanos = unit.toNanos(timeout);
        lock.lockInterruptibly();
        try {
            while (count == buffer.length) {
                if (nanos <= 0) return false;
                nanos = notFull.awaitNanos(nanos); // Returns remaining nanos
            }
            enqueue(item);
            return true;
        } finally {
            lock.unlock();
        }
    }
    
    // Timed poll: returns null if timeout expires
    @SuppressWarnings("unchecked")
    T poll(long timeout, TimeUnit unit) throws InterruptedException {
        long nanos = unit.toNanos(timeout);
        lock.lockInterruptibly();
        try {
            while (count == 0) {
                if (nanos <= 0) return null;
                nanos = notEmpty.awaitNanos(nanos);
            }
            return dequeue();
        } finally {
            lock.unlock();
        }
    }
    
    // Batch drain: take up to maxItems (non-blocking after first)
    int drainTo(java.util.Collection<T> collection, int maxItems) throws InterruptedException {
        lock.lockInterruptibly();
        try {
            int n = Math.min(count, maxItems);
            for (int i = 0; i < n; i++) {
                collection.add(dequeue());
            }
            return n;
        } finally {
            lock.unlock();
        }
    }
    
    int size() {
        lock.lock();
        try { return count; }
        finally { lock.unlock(); }
    }
    
    private void enqueue(T item) {
        buffer[tail] = item;
        tail = (tail + 1) % buffer.length;
        count++;
        notEmpty.signal(); // Wake up one waiting consumer
    }
    
    @SuppressWarnings("unchecked")
    private T dequeue() {
        T item = (T) buffer[head];
        buffer[head] = null; // Help GC
        head = (head + 1) % buffer.length;
        count--;
        notFull.signal(); // Wake up one waiting producer
        return item;
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Apple Health Data Aggregation Platform**
   - Aggregate health data from multiple sources: Apple Watch, iPhone, third-party apps
   - Data types: heart rate, steps, sleep, blood oxygen, ECG, workouts
   - On-device aggregation (privacy-first: raw data stays on device)
   - Differential privacy for population-level insights
   - Health Records (FHIR/HL7 integration)
   - Scale: 1B+ Apple devices, 500B health samples/day (across all devices)

### 💡 Apple Health Platform Architecture

```
Privacy-First Architecture (On-Device Processing):
┌────────────────────────────────────────────────────┐
│                    Apple Watch                      │
│  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Sensors      │  │ On-Device Processing      │   │
│  │ • Accelerometer│ │ • Step counting (pedometer)│  │
│  │ • Heart rate │  │ • Heart rhythm analysis   │   │
│  │ • Gyroscope  │  │ • Fall detection (CoreML) │   │
│  │ • Blood O2   │  │ • Sleep staging (ML)      │   │
│  │ • ECG        │  │ • Workout auto-detection  │   │
│  └──────┬───────┘  └──────────┬───────────────┘   │
│         │                     │                     │
│  ┌──────▼─────────────────────▼────────────────┐   │
│  │          HealthKit (On-Watch)                │   │
│  │  SQLite DB: raw samples + aggregations       │   │
│  │  Background tasks: hourly/daily rollups      │   │
│  └──────────────────┬─────────────────────────┘   │
│                     │ Bluetooth / Wi-Fi sync       │
└─────────────────────┼─────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────┐
│                    iPhone                           │
│  ┌──────────────────────────────────────────────┐  │
│  │              HealthKit Store                   │  │
│  │  (SQLite, encrypted at rest with device key)  │  │
│  │                                               │  │
│  │  Schema:                                      │  │
│  │  samples {                                    │  │
│  │    id, type, value, unit,                     │  │
│  │    start_date, end_date,                      │  │
│  │    source_bundle_id, device_id,               │  │
│  │    metadata (JSON)                            │  │
│  │  }                                            │  │
│  │  Indexed by: (type, start_date) for fast      │  │
│  │  range queries                                │  │
│  │                                               │  │
│  │  Aggregation Engine:                          │  │
│  │  • statisticsQuery: sum/avg/min/max over range│  │
│  │  • statisticsCollectionQuery: bucketed by     │  │
│  │    hour/day/week/month                        │  │
│  │  • Incremental computation: maintain running  │  │
│  │    aggregates, update on new sample insert    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Data Source Priority Resolution              │  │
│  │  When multiple sources report same type:      │  │
│  │                                               │  │
│  │  Conflict: Watch says 8000 steps, Phone says  │  │
│  │  9200 steps (some overlap, some not)          │  │
│  │                                               │  │
│  │  Resolution:                                  │  │
│  │  1. Priority ranking: user-configured source  │  │
│  │     order (default: Watch > Phone > 3rd party)│  │
│  │  2. De-duplication: overlapping time ranges    │  │
│  │     → keep highest-priority source's data     │  │
│  │  3. Gap filling: if Watch has no data for a   │  │
│  │     period, use Phone data for that period    │  │
│  │  4. Result: merged timeline with no double-   │  │
│  │     counting                                  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  iCloud Health Sync (E2E Encrypted)           │  │
│  │                                               │  │
│  │  • Only encrypted blob synced to iCloud       │  │
│  │  • Apple cannot read health data              │  │
│  │  • Key derived from device passcode           │  │
│  │  • Sync protocol: CRDTs for merge             │  │
│  │    (new device downloads encrypted blob,      │  │
│  │     decrypts, merges with local)              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

Differential Privacy (Population Insights):
┌──────────────────────────────────────────────────┐
│ Apple wants: aggregate health trends (avg heart   │
│ rate by age group, sleep patterns by region)      │
│                                                   │
│ BUT: cannot see individual health data            │
│                                                   │
│ Solution: Local Differential Privacy              │
│                                                   │
│ On-device:                                        │
│ 1. Compute local aggregate (e.g., avg HR = 72)   │
│ 2. Add calibrated noise (Laplace mechanism)       │
│    noisy_value = 72 + Laplace(0, sensitivity/ε)   │
│ 3. Send noisy_value to Apple server               │
│                                                   │
│ On server:                                        │
│ 4. Aggregate noisy values from millions of users  │
│ 5. Noise cancels out at scale → accurate          │
│    population estimate                            │
│ 6. No individual health data exposed              │
│                                                   │
│ Privacy budget: ε = 2 (conservative)              │
│ Each user contributes max 1 noisy value/day/metric│
│ Users can opt out entirely from population studies │
└──────────────────────────────────────────────────┘

Health Records (FHIR):
┌──────────────────────────────────────────────────┐
│ Integration with hospitals/clinics via FHIR R4:   │
│                                                   │
│ 1. User authenticates with hospital's EHR portal  │
│ 2. iPhone fetches FHIR resources via REST API:    │
│    • Patient, Condition, Medication, Observation   │
│    • Lab results, immunizations, allergies         │
│ 3. FHIR → HealthKit mapping:                     │
│    • FHIR Observation(code=LOINC:8867-4) →       │
│      HKQuantityType.heartRate                     │
│ 4. Stored locally in HealthKit, encrypted         │
│ 5. Background refresh every 24h                    │
│                                                   │
│ Scale: 800+ healthcare institutions connected     │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Apple ICT3 = **Blocking queue + Health data platform (privacy-first)**
- **Bounded Blocking Queue**: circular array + ReentrantLock + 2 Conditions — `notFull` and `notEmpty`
- **Fair lock**: `new ReentrantLock(true)` prevents thread starvation — important for producer-consumer
- **awaitNanos**: returns remaining nanos — essential for accurate timeout implementation
- **Privacy-first**: raw health data NEVER leaves device — only encrypted blob to iCloud, noisy aggregate to Apple
- **De-duplication**: priority-based source resolution — Watch > Phone > 3rd party, gap-filling for incomplete data
- **Differential Privacy**: Laplace noise added on-device — noise cancels at population scale → accurate aggregates
- Apple interviews: **privacy is a core design principle** — every system design must address data minimization

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Concurrency, Blocking Queue |
| System Design | Very Hard | Health Platform, Privacy, FHIR |
| Technical 2 | Hard | On-Device ML, CoreML |
| Behavioral | Medium | Collaboration, Craftsmanship |
| Manager | Medium | Career Goals |
