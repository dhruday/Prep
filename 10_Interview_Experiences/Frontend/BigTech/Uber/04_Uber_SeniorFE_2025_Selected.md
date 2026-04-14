# Uber — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Senior Frontend Engineer |
| **Level** | L5a |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | San Francisco, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Uber Eats |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding — Real-Time Data Stream Processing
**Duration:** 60 minutes

### Question 1: Implement a Moving Average + Percentile Calculator over a Sliding Window

```javascript
/**
 * Real-time metrics calculator over sliding time window.
 * Supports: average, p50, p95, p99, min, max, count.
 * 
 * Uses a circular buffer + sorted multiset approach:
 * - Circular buffer for O(1) insertion
 * - Sorted array maintained via binary search for O(log n) insert + percentile queries
 * - Time-based eviction: remove entries older than window size
 * 
 * Time: O(log n) per add, O(1) per percentile query
 * Space: O(n) where n = max entries in window
 */
class SlidingWindowMetrics {
  constructor(windowMs = 60000) { // Default 60-second window
    this.windowMs = windowMs;
    this.entries = [];       // [{ timestamp, value }] — chronological
    this.sorted = [];        // [value] — sorted for percentile queries
    this.sum = 0;
    this.count = 0;
  }
  
  add(value, timestamp = Date.now()) {
    // Evict expired entries
    this._evict(timestamp);
    
    // Add to chronological list
    this.entries.push({ timestamp, value });
    
    // Insert into sorted array (binary search)
    const idx = this._bisectLeft(this.sorted, value);
    this.sorted.splice(idx, 0, value);
    
    this.sum += value;
    this.count++;
  }
  
  _evict(now) {
    const cutoff = now - this.windowMs;
    
    while (this.entries.length > 0 && this.entries[0].timestamp <= cutoff) {
      const removed = this.entries.shift();
      
      // Remove from sorted array
      const idx = this._bisectLeft(this.sorted, removed.value);
      if (idx < this.sorted.length && this.sorted[idx] === removed.value) {
        this.sorted.splice(idx, 1);
      }
      
      this.sum -= removed.value;
      this.count--;
    }
  }
  
  average() {
    this._evict(Date.now());
    return this.count === 0 ? 0 : this.sum / this.count;
  }
  
  percentile(p) {
    this._evict(Date.now());
    if (this.count === 0) return 0;
    
    const idx = Math.ceil((p / 100) * this.count) - 1;
    return this.sorted[Math.max(0, Math.min(idx, this.count - 1))];
  }
  
  p50() { return this.percentile(50); }
  p95() { return this.percentile(95); }
  p99() { return this.percentile(99); }
  
  min() {
    this._evict(Date.now());
    return this.sorted[0] ?? 0;
  }
  
  max() {
    this._evict(Date.now());
    return this.sorted[this.sorted.length - 1] ?? 0;
  }
  
  getCount() {
    this._evict(Date.now());
    return this.count;
  }
  
  _bisectLeft(arr, target) {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

// Usage: track API response times
const metrics = new SlidingWindowMetrics(60000); // 60s window

// Simulate incoming requests
metrics.add(120); // 120ms response time
metrics.add(45);
metrics.add(230);
metrics.add(89);
metrics.add(1500); // slow request

console.log('Average:', metrics.average().toFixed(0), 'ms');
console.log('P50:', metrics.p50(), 'ms');
console.log('P95:', metrics.p95(), 'ms');
console.log('P99:', metrics.p99(), 'ms');
console.log('Min:', metrics.min(), 'Max:', metrics.max());
```

---

## Round 2: Frontend System Design — Uber Eats Real-Time Order Tracking

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│              Uber Eats Order Tracking Frontend                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Order Status Component                                │       │
│  │ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │       │
│  │ │Placed│──│Prepar│──│Pickup│──│OnWay │──│Deliv │   │       │
│  │ │  ✓   │  │ing ▶ │  │      │  │      │  │      │   │       │
│  │ └──────┘  └──────┘  └──────┘  └──────┘  └──────┘   │       │
│  │ State Machine: placed→preparing→pickup→transit→delivered│    │
│  └──────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Map Component (Mapbox GL / Google Maps)               │       │
│  │                                                       │       │
│  │  🍔 Restaurant ────── 🏍️ Driver ────── 🏠 You        │       │
│  │       (fixed)      (real-time GPS)     (fixed)        │       │
│  │                                                       │       │
│  │  - Animated marker for driver position                │       │
│  │  - Route polyline: restaurant → you                   │       │
│  │  - ETA: recalculated every 10s from driver GPS        │       │
│  │  - Geofence: "Driver is nearby" when < 200m           │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │ ETA Timer            │  │ Chat / Call Component         │    │
│  │ Countdown to arrival │  │ In-app messaging to driver    │    │
│  │ Server-reconciled    │  │ VoIP call via WebRTC          │    │
│  └──────────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

Data Flow:
  Server ──WebSocket──→ Client State Store
  Events: { type: 'LOCATION_UPDATE', lat, lng, heading, speed, eta }
          { type: 'STATUS_CHANGE', status: 'transit' }
          { type: 'ETA_UPDATE', eta: '12 min', recalculated: true }

Client Architecture:
  ┌──────────────────────┐
  │ WebSocket Manager    │
  │ - Auto-reconnect     │
  │ - Exponential backoff│
  │ - Heartbeat ping     │
  └──────────┬───────────┘
             │
  ┌──────────▼───────────┐
  │ Order Store (Zustand) │
  │ - order: { status,   │
  │    items, eta }       │
  │ - driver: { lat, lng,│
  │    name, photo }      │
  │ - map: { route,      │
  │    bounds }           │
  └──────────┬───────────┘
             │
  ┌──────────▼───────────┐
  │ Components subscribe │
  │ to relevant slices   │
  │ via selectors        │
  └──────────────────────┘

GPS Smoothing (Driver Marker Animation):
  - Raw GPS updates: every 3-5 seconds (from driver app)
  - Client interpolation: animate marker along route polyline
  - Use requestAnimationFrame for 60fps marker movement
  - Snap-to-road: project GPS point to nearest road segment
  - Heading smoothing: LERP between old/new heading for rotation

ETA Reconciliation:
  - Client counts down locally (setInterval every 1s)
  - Server sends corrected ETA every 30s
  - If diff > 60s: animate to new ETA (no jarring jump)
  - If diff < 60s: gradually adjust (±1s per tick until synced)
```

### Performance Optimizations:
```javascript
// GPS smoothing for driver marker — 60fps animation
class MarkerAnimator {
  constructor(marker, map) {
    this.marker = marker;
    this.map = map;
    this.currentPos = null;
    this.targetPos = null;
    this.startTime = 0;
    this.duration = 3000; // Animate over 3s (expected GPS interval)
    this.rafId = null;
  }
  
  updatePosition(newLat, newLng) {
    if (this.currentPos) {
      this.startPos = { ...this.currentPos };
    }
    this.targetPos = { lat: newLat, lng: newLng };
    this.startTime = performance.now();
    
    if (!this.rafId) this.animate();
  }
  
  animate() {
    this.rafId = requestAnimationFrame((now) => {
      const elapsed = now - this.startTime;
      const t = Math.min(elapsed / this.duration, 1);
      
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      
      if (this.startPos && this.targetPos) {
        this.currentPos = {
          lat: this.startPos.lat + (this.targetPos.lat - this.startPos.lat) * eased,
          lng: this.startPos.lng + (this.targetPos.lng - this.startPos.lng) * eased
        };
        
        this.marker.setLngLat([this.currentPos.lng, this.currentPos.lat]);
      }
      
      if (t < 1) {
        this.animate();
      } else {
        this.rafId = null;
      }
    });
  }
  
  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
```

---

## 🎯 Key Takeaways
- Uber FE = **Real-time data streams + map animations + metrics**
- **Sliding window metrics**: sorted array + binary search = O(log n) add, O(1) percentile
- **Time-based eviction**: remove entries older than window — shift from chronological array
- **GPS smoothing**: interpolate between GPS points using requestAnimationFrame — prevents jumping
- **Ease-out cubic**: `1 - (1-t)^3` — natural deceleration for marker movement
- **ETA reconciliation**: gradual adjustment prevents user anxiety from jarring countdown jumps
- **WebSocket + reconnect**: auto-reconnect with exponential backoff — users stay on tracking page for minutes
- Uber FE: **real-time UX** is core — map performance, smooth animations, data stream handling

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Sliding Window, Percentiles, Binary Search |
| FE Design | Very Hard | Real-Time Order Tracking, Maps, WebSocket |
| Technical 3 | Medium-Hard | React Performance, Web APIs |
| Behavioral | Medium | Leadership, Conflict |
| HM | Medium | Career |
