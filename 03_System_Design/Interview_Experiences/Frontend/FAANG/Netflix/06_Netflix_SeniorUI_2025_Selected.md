# Netflix — Senior UI Engineer Frontend Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Netflix Studio |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding — Advanced Async Patterns
**Duration:** 60 minutes

### Question 1: Implement a Task Scheduler with Priority, Concurrency Limit, and Dependency Resolution

```javascript
/**
 * TaskScheduler: runs async tasks with:
 * - Priority ordering (lower number = higher priority)
 * - Configurable concurrency limit
 * - DAG dependency resolution — a task runs only after its dependencies complete
 * - Cycle detection — throws if circular dependency exists
 * 
 * Time: O(V + E) for topological sort + O(n log n) for priority queue operations
 */
class TaskScheduler {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.tasks = new Map();  // id → { fn, priority, deps, status, result }
    this.running = 0;
    this.completedIds = new Set();
    this.waiters = new Map(); // id → [resolve callbacks]
  }
  
  addTask(id, fn, { priority = 0, deps = [] } = {}) {
    if (this.tasks.has(id)) throw new Error(`Task ${id} already exists`);
    
    this.tasks.set(id, {
      fn,
      priority,
      deps,
      status: 'pending',
      result: undefined
    });
    
    return this;
  }
  
  async run() {
    // 1. Validate DAG — detect cycles via DFS
    this.detectCycles();
    
    // 2. Run all tasks, respecting deps + priority + concurrency
    const taskPromises = [];
    
    for (const [id] of this.tasks) {
      taskPromises.push(this.scheduleTask(id));
    }
    
    const results = await Promise.allSettled(taskPromises);
    
    // Build results map
    const output = {};
    let i = 0;
    for (const [id] of this.tasks) {
      output[id] = results[i].status === 'fulfilled' ? results[i].value : results[i].reason;
      i++;
    }
    return output;
  }
  
  async scheduleTask(id) {
    const task = this.tasks.get(id);
    
    // Wait for all dependencies to complete
    if (task.deps.length > 0) {
      await Promise.all(task.deps.map(depId => this.waitForCompletion(depId)));
    }
    
    // Wait for concurrency slot
    while (this.running >= this.concurrency) {
      await this.waitForSlot();
    }
    
    // Execute
    this.running++;
    task.status = 'running';
    
    try {
      // Pass dependency results to the task
      const depResults = {};
      for (const depId of task.deps) {
        depResults[depId] = this.tasks.get(depId).result;
      }
      
      task.result = await task.fn(depResults);
      task.status = 'completed';
      this.completedIds.add(id);
      
      // Notify waiters
      const waiters = this.waiters.get(id);
      if (waiters) {
        waiters.forEach(resolve => resolve());
        this.waiters.delete(id);
      }
      
      return task.result;
    } catch (err) {
      task.status = 'failed';
      throw err;
    } finally {
      this.running--;
      // Notify concurrency waiters
      const slotWaiters = this.waiters.get('__slot__');
      if (slotWaiters?.length) {
        slotWaiters.shift()();
      }
    }
  }
  
  waitForCompletion(taskId) {
    if (this.completedIds.has(taskId)) return Promise.resolve();
    
    return new Promise(resolve => {
      if (!this.waiters.has(taskId)) this.waiters.set(taskId, []);
      this.waiters.get(taskId).push(resolve);
    });
  }
  
  waitForSlot() {
    return new Promise(resolve => {
      if (!this.waiters.has('__slot__')) this.waiters.set('__slot__', []);
      this.waiters.get('__slot__').push(resolve);
    });
  }
  
  detectCycles() {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const colors = new Map();
    
    for (const [id] of this.tasks) colors.set(id, WHITE);
    
    const dfs = (id) => {
      colors.set(id, GRAY);
      const task = this.tasks.get(id);
      
      for (const dep of task.deps) {
        if (!this.tasks.has(dep)) throw new Error(`Dependency ${dep} not found for task ${id}`);
        if (colors.get(dep) === GRAY) throw new Error(`Circular dependency detected: ${id} → ${dep}`);
        if (colors.get(dep) === WHITE) dfs(dep);
      }
      
      colors.set(id, BLACK);
    };
    
    for (const [id] of this.tasks) {
      if (colors.get(id) === WHITE) dfs(id);
    }
  }
}

// Usage:
const scheduler = new TaskScheduler(2); // max 2 concurrent

scheduler
  .addTask('fetch-user', async () => {
    const res = await fetch('/api/user');
    return res.json();
  }, { priority: 1 })
  .addTask('fetch-prefs', async (deps) => {
    const user = deps['fetch-user'];
    return fetch(`/api/prefs/${user.id}`).then(r => r.json());
  }, { priority: 2, deps: ['fetch-user'] })
  .addTask('fetch-recs', async (deps) => {
    const prefs = deps['fetch-prefs'];
    return fetch(`/api/recs?genre=${prefs.genre}`).then(r => r.json());
  }, { priority: 3, deps: ['fetch-prefs'] });

const results = await scheduler.run();
```

---

## Round 2: System Design — Netflix Video Player Architecture
**Duration:** 60 minutes

### 💡 Netflix Video Player Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Video Player Architecture                    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Player Shell │  │   Controls   │  │    State Machine     │  │
│  │ <video> tag  │──│ Play/Pause   │──│ idle→loading→playing │  │
│  │ MSE API      │  │ Seek Bar     │  │ →paused→buffering    │  │
│  │              │  │ Volume       │  │ →error→ended         │  │
│  └──────┬───────┘  │ Subtitles    │  └──────────────────────┘  │
│         │          │ Settings     │                             │
│         ▼          └──────────────┘                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ ABR Engine   │  │   Buffer     │  │  DRM (Widevine/FPS)  │  │
│  │ VMAF-based   │──│  Manager     │──│  EME API             │  │
│  │ BW estimate  │  │ Dual buffer  │  │  License fetch       │  │
│  │ quality pick │  │ fwd + back   │  │  Key rotation         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Analytics   │  │  Preloader   │  │  Error Recovery      │  │
│  │ Rebuffer %   │  │ Next episode │  │  Retry w/ lower      │  │
│  │ Start time   │  │ prefetch     │  │  quality fallback    │  │
│  │ QoE score    │  │              │  │  CDN failover        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

ABR Algorithm (VMAF-based):
1. Measure download throughput (EWMA — exponentially weighted moving avg)
2. Check buffer occupancy (seconds of video buffered ahead)
3. For each available bitrate, predict:
   - Download time for next chunk
   - VMAF quality score for that bitrate+resolution
4. Pick highest VMAF that won't cause rebuffering
5. Hysteresis: require sustained BW improvement before upshifting

Buffer Strategy:
- Forward buffer: 30-60 seconds (configurable)
- Backward buffer: 15 seconds (for instant seek-back)
- Buffer health thresholds:
  * < 5s → emergency quality drop
  * 5-15s → conservative mode (no upshift)
  * > 15s → allow quality upgrade
  * > 60s → pause fetching

Player State Machine:
  IDLE ─load()─→ LOADING ─canplay─→ READY ─play()─→ PLAYING
                                               ↕ pause()
  PLAYING ─waiting─→ BUFFERING ─progress─→ PLAYING
  ANY ─error─→ ERROR ─retry─→ LOADING
  PLAYING ─ended─→ ENDED ─→ next episode auto-play
```

### Key Design Decisions:
- **MSE (Media Source Extensions)**: append video segments to SourceBuffer — enables ABR switching
- **VMAF over bitrate**: Netflix uses perceptual quality scores (VMAF) — dark/static scenes need less bitrate
- **Dual buffer strategy**: forward + backward — enables instant seek-back without refetching
- **EWMA bandwidth estimation**: weight recent measurements higher — adapts quickly to BW changes
- **Error recovery waterfall**: retry same CDN → lower quality → different CDN → show error UI
- **Next episode prefetch**: start loading first segment 10s before current ends — sub-second transition
- **Analytics pipeline**: buffer events → local aggregation → batch to server every 30s

---

## 🎯 Key Takeaways
- Netflix FE at L5 = **Heavy async patterns + video player architecture**
- **Task Scheduler**: DAG dependency resolution + concurrency limit + priority — tests async mastery
- **Cycle detection**: 3-color DFS (WHITE/GRAY/BLACK) — GRAY back-edge = cycle
- **VMAF-based ABR**: perceptual quality > raw bitrate — Netflix's key innovation
- **MSE API**: `MediaSource` + `SourceBuffer.appendBuffer()` — enables adaptive streaming in browser
- **Player state machine**: explicit states prevent impossible transitions — no "playing while loading"
- **EWMA**: `estimate = alpha * sample + (1 - alpha) * estimate` — smooths bandwidth spikes
- Netflix FE: **deep browser API knowledge** — MSE, EME, Web Audio, Service Workers expected at senior level

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Async Coding | Very Hard | TaskScheduler, DAG, Concurrency |
| System Design | Very Hard | Video Player Architecture |
| Technical 3 | Hard | Performance, React |
| Behavioral | Medium | Culture |
| Manager | Medium | Growth |
