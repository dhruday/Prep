# Netflix — Senior UI Engineer Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | Senior |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected (Culture Fit) |
| **Location** | Los Gatos, CA |
| **Source** | [Levels.fyi](https://www.levels.fyi/blog/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Reactive State Management Library** (like MobX/Signals)
2. **Follow-up: Support computed values with automatic dependency tracking**

### 💡 Reactive State with Auto-Tracking

```javascript
/**
 * Minimal reactive state library (like Signals/MobX).
 * - signal(value): creates reactive value
 * - computed(fn): derived value, auto-tracks dependencies
 * - effect(fn): side effect, re-runs when dependencies change
 * 
 * Core mechanism: during fn() execution, track which signals are read.
 * When those signals change, re-run the fn.
 */

let currentObserver = null; // Global tracking context

class Signal {
  constructor(value) {
    this._value = value;
    this._subscribers = new Set(); // Set of observers (effects/computed)
  }
  
  get value() {
    // Track this signal as dependency of current observer
    if (currentObserver) {
      this._subscribers.add(currentObserver);
      currentObserver._dependencies.add(this);
    }
    return this._value;
  }
  
  set value(newValue) {
    if (Object.is(this._value, newValue)) return; // No change
    
    this._value = newValue;
    
    // Notify subscribers (batch to avoid redundant runs)
    const toNotify = [...this._subscribers];
    
    // Use microtask for batching
    if (!Signal._batchQueue) {
      Signal._batchQueue = new Set();
      queueMicrotask(() => {
        const queue = Signal._batchQueue;
        Signal._batchQueue = null;
        
        // Topological sort: run computed before effects
        const sorted = [...queue].sort((a, b) => a._order - b._order);
        for (const observer of sorted) {
          observer._run();
        }
      });
    }
    
    for (const sub of toNotify) {
      Signal._batchQueue.add(sub);
    }
  }
  
  // Peek without tracking
  peek() {
    return this._value;
  }
}
Signal._batchQueue = null;

class Computed {
  constructor(fn) {
    this._fn = fn;
    this._value = undefined;
    this._dirty = true;
    this._dependencies = new Set();
    this._subscribers = new Set();
    this._order = 0; // Computed runs before effects
    
    // Initial computation
    this._compute();
  }
  
  get value() {
    // Track as dependency
    if (currentObserver) {
      this._subscribers.add(currentObserver);
      currentObserver._dependencies.add(this);
    }
    
    if (this._dirty) {
      this._compute();
    }
    
    return this._value;
  }
  
  _compute() {
    // Clean up old dependencies
    for (const dep of this._dependencies) {
      dep._subscribers.delete(this);
    }
    this._dependencies.clear();
    
    // Run fn, tracking new dependencies
    const prevObserver = currentObserver;
    currentObserver = this;
    try {
      const newValue = this._fn();
      if (!Object.is(this._value, newValue)) {
        this._value = newValue;
        // Notify downstream subscribers
        for (const sub of this._subscribers) {
          sub._run();
        }
      }
    } finally {
      currentObserver = prevObserver;
      this._dirty = false;
    }
  }
  
  _run() {
    this._dirty = true;
    this._compute();
  }
}

class Effect {
  constructor(fn) {
    this._fn = fn;
    this._dependencies = new Set();
    this._order = 1; // Effects run after computed
    this._disposed = false;
    
    this._run();
  }
  
  _run() {
    if (this._disposed) return;
    
    // Clean up old dependencies
    for (const dep of this._dependencies) {
      dep._subscribers.delete(this);
    }
    this._dependencies.clear();
    
    // Run fn, tracking dependencies
    const prevObserver = currentObserver;
    currentObserver = this;
    try {
      this._fn();
    } finally {
      currentObserver = prevObserver;
    }
  }
  
  dispose() {
    this._disposed = true;
    for (const dep of this._dependencies) {
      dep._subscribers.delete(this);
    }
    this._dependencies.clear();
  }
}

// Public API
function signal(value) { return new Signal(value); }
function computed(fn) { return new Computed(fn); }
function effect(fn) { return new Effect(fn); }

// Usage:
const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log(`Count: ${count.value}, Doubled: ${doubled.value}`);
});
// Logs: "Count: 0, Doubled: 0"

count.value = 5;
// Logs: "Count: 5, Doubled: 10" (batched, single run)

count.value = 5; // No log (same value, Object.is check)
```

---

## Round 2: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Netflix's A/B Testing Platform (Frontend)**
   - Feature flags for UI experiments
   - Multivariate testing: test multiple variables simultaneously
   - Client-side experiment assignment (consistent per user)
   - Metric collection: engagement, play rate, retention
   - Gradual rollout: 1% → 10% → 50% → 100%

### 💡 A/B Testing Platform Architecture

```
Client-Side Experiment System:

Experiment Config (fetched once on app load):
{
  "experiments": {
    "new_browse_layout": {
      "id": "exp-001",
      "status": "active",
      "allocation": 0.10,    // 10% of users
      "variants": {
        "control": { "weight": 50, "config": { "layout": "grid" } },
        "treatment_a": { "weight": 25, "config": { "layout": "masonry" } },
        "treatment_b": { "weight": 25, "config": { "layout": "list" } }
      },
      "targeting": {
        "platforms": ["web", "tv"],
        "countries": ["US", "UK"],
        "newUsersOnly": false
      }
    }
  }
}

Assignment Algorithm (Deterministic):
┌──────────────────────────────────────────────────┐
│ function assignVariant(userId, experiment) {       │
│   // Deterministic hash: same user always gets     │
│   // same variant (no randomness)                  │
│                                                    │
│   const hash = murmur3(userId + experiment.id);    │
│   const bucket = hash % 10000; // 0-9999           │
│                                                    │
│   // Step 1: Is user in experiment?                │
│   const allocationBucket = experiment.allocation   │
│     * 10000; // e.g., 0.10 → 1000                 │
│   if (bucket >= allocationBucket) {                │
│     return null; // Not in experiment              │
│   }                                                │
│                                                    │
│   // Step 2: Assign variant by weight              │
│   const variantHash = murmur3(userId + experiment.id│
│     + '_variant') % 100;                           │
│   let cumulative = 0;                              │
│   for (const [name, variant] of                    │
│     Object.entries(experiment.variants)) {          │
│     cumulative += variant.weight;                  │
│     if (variantHash < cumulative) {                │
│       return { name, config: variant.config };     │
│     }                                              │
│   }                                                │
│ }                                                  │
│                                                    │
│ // MurmurHash3 — fast, uniform distribution        │
│ function murmur3(key) {                            │
│   let h = 0x12345678;                              │
│   for (let i = 0; i < key.length; i++) {           │
│     h ^= key.charCodeAt(i);                        │
│     h = Math.imul(h, 0x5bd1e995);                  │
│     h ^= h >>> 15;                                 │
│   }                                                │
│   return h >>> 0; // Unsigned                      │
│ }                                                  │
└──────────────────────────────────────────────────┘

React Integration:
┌──────────────────────────────────────────────────┐
│ // ExperimentProvider wraps app                    │
│ const ExperimentContext = createContext();          │
│                                                    │
│ function ExperimentProvider({ children }) {         │
│   const [experiments, setExperiments] = useState();│
│   const userId = useUserId();                      │
│                                                    │
│   useEffect(() => {                                │
│     fetchExperiments().then(setExperiments);       │
│   }, []);                                          │
│                                                    │
│   const getVariant = useCallback((experimentId)=>{│
│     const exp = experiments?.[experimentId];       │
│     if (!exp) return null;                         │
│     return assignVariant(userId, exp);             │
│   }, [experiments, userId]);                       │
│                                                    │
│   return (                                         │
│     <ExperimentContext.Provider value={getVariant}>│
│       {children}                                   │
│     </ExperimentContext.Provider>                   │
│   );                                               │
│ }                                                  │
│                                                    │
│ // Hook for components                             │
│ function useExperiment(experimentId) {              │
│   const getVariant = useContext(ExperimentContext); │
│   const variant = useMemo(                         │
│     () => getVariant(experimentId),                │
│     [getVariant, experimentId]                     │
│   );                                               │
│                                                    │
│   // Track exposure                                │
│   useEffect(() => {                                │
│     if (variant) {                                 │
│       trackExposure(experimentId, variant.name);   │
│     }                                              │
│   }, [experimentId, variant]);                     │
│                                                    │
│   return variant;                                  │
│ }                                                  │
│                                                    │
│ // Usage in component:                             │
│ function BrowsePage() {                            │
│   const variant = useExperiment('new_browse_layout')│
│   const layout = variant?.config?.layout ?? 'grid'; │
│   return <ContentGrid layout={layout} />;          │
│ }                                                  │
└──────────────────────────────────────────────────┘

Metric Collection:
- Exposure tracking: user saw experiment variant
- Engagement: scroll depth, click-through, play rate
- Retention: return visits within 7/14/28 days
- sendBeacon for reliable metric delivery on page unload
- Batch metrics every 30s to reduce API calls
```

---

## 🎯 Key Takeaways
- Netflix FE = **Reactive signals + A/B testing platform**
- **Signals/reactive**: global `currentObserver` tracks which signals are read during fn execution
- **Batching**: `queueMicrotask` — collect all changed signals, run observers once per microtask
- **Computed vs Effect**: computed has `_dirty` flag + lazy evaluation; effect always runs immediately
- **Dependency cleanup**: before re-running, remove self from old dependencies — prevents stale subscriptions
- **A/B assignment**: deterministic hash (MurmurHash3) — same user always gets same variant, no server hit needed
- **Exposure tracking**: only track when component renders variant — essential for accurate metrics
- Netflix rejected on **culture fit** — Freedom & Responsibility values interview is uniquely challenging

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Very Hard | Reactive Signals, Auto-Tracking |
| FE System Design | Hard | A/B Testing, Feature Flags |
| Technical 2 | Hard | Performance, Architecture |
| Culture | Hard | Netflix F&R Values |
| Bar Raiser | Hard | Technical Depth |
