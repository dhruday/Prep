# Uber — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Senior Frontend Engineer |
| **Level** | L5a |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Coding + Machine Coding + System Design + Behavioral)
- **Rejection Reason:** Machine coding — map marker clustering wasn't performant enough

---

## Round 1: JavaScript Coding
**Duration:** 45 minutes

### Questions Asked
1. **Implement a PubSub system** with wildcard topic matching
2. **Implement groupBy utility**

### 💡 PubSub with Wildcards

```javascript
class PubSub {
  constructor() {
    this.subscribers = new Map(); // topic → Set<{callback, id}>
    this.nextId = 0;
  }
  
  subscribe(topic, callback) {
    const id = ++this.nextId;
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic).add({ callback, id });
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(topic);
      if (subs) {
        for (const sub of subs) {
          if (sub.id === id) { subs.delete(sub); break; }
        }
        if (subs.size === 0) this.subscribers.delete(topic);
      }
    };
  }
  
  publish(topic, data) {
    // Exact match
    this.notifySubscribers(topic, data);
    
    // Wildcard matching: "ride.*" matches "ride.requested", "ride.completed"
    // Also: "ride.**" matches "ride.requested.confirmed" (multi-level)
    for (const [pattern, subs] of this.subscribers) {
      if (pattern === topic) continue; // Already handled
      if (this.matchWildcard(pattern, topic)) {
        for (const sub of subs) {
          try { sub.callback(data, topic); } catch (e) { console.error(e); }
        }
      }
    }
  }
  
  matchWildcard(pattern, topic) {
    const patternParts = pattern.split('.');
    const topicParts = topic.split('.');
    
    let pi = 0, ti = 0;
    
    while (pi < patternParts.length && ti < topicParts.length) {
      if (patternParts[pi] === '**') {
        // ** matches zero or more levels
        if (pi === patternParts.length - 1) return true; // ** at end matches everything
        // Try matching rest from every position
        for (let k = ti; k <= topicParts.length; k++) {
          if (this.matchWildcard(
            patternParts.slice(pi + 1).join('.'),
            topicParts.slice(k).join('.')
          )) return true;
        }
        return false;
      }
      
      if (patternParts[pi] === '*') {
        // * matches exactly one level
        pi++; ti++;
        continue;
      }
      
      if (patternParts[pi] !== topicParts[ti]) return false;
      pi++; ti++;
    }
    
    return pi === patternParts.length && ti === topicParts.length;
  }
  
  notifySubscribers(topic, data) {
    const subs = this.subscribers.get(topic);
    if (!subs) return;
    for (const sub of subs) {
      try { sub.callback(data, topic); } catch (e) { console.error(e); }
    }
  }
}

// Test:
const ps = new PubSub();
ps.subscribe('ride.*', (data, topic) => console.log(`Single: ${topic}`, data));
ps.subscribe('ride.**', (data, topic) => console.log(`Multi: ${topic}`, data));

ps.publish('ride.requested', { id: 1 });       // Both fire
ps.publish('ride.payment.success', { id: 1 });  // Only ** fires
```

### 💡 groupBy

```javascript
function groupBy(arr, keyOrFn) {
  const getKey = typeof keyOrFn === 'function' ? keyOrFn : (item) => item[keyOrFn];
  
  return arr.reduce((groups, item) => {
    const key = getKey(item);
    (groups[key] ??= []).push(item);
    return groups;
  }, {});
}

// Tests:
groupBy([6.1, 4.2, 6.3], Math.floor);
// { 4: [4.2], 6: [6.1, 6.3] }

groupBy(['one', 'two', 'three'], 'length');
// { 3: ['one', 'two'], 5: ['three'] }
```

---

## Round 2: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build an Interactive Map with Marker Clustering**
   - 10K+ markers, cluster/uncluster on zoom, click to expand cluster, performant

### 💡 Interview-Ready Answer (where I struggled)

```javascript
class MarkerClusterer {
  constructor(map, markers, options = {}) {
    this.map = map;
    this.allMarkers = markers; // [{id, lat, lng, data}]
    this.clusterRadius = options.clusterRadius || 60; // pixels
    this.maxZoom = options.maxZoom || 16;
    this.clusters = [];
    this.renderedElements = new Map(); // cluster/marker → DOM element
    
    this.update();
    this.map.on('zoom', () => this.update());
    this.map.on('pan', () => this.updateVisibility());
  }
  
  update() {
    const zoom = this.map.getZoom();
    
    // At max zoom: show individual markers
    if (zoom >= this.maxZoom) {
      this.clusters = this.allMarkers.map(m => ({
        center: { lat: m.lat, lng: m.lng },
        markers: [m],
        isCluster: false
      }));
    } else {
      this.clusters = this.computeClusters(zoom);
    }
    
    this.render();
  }
  
  // Grid-based clustering (O(n) — performant for 10K+ markers)
  computeClusters(zoom) {
    const gridSize = this.clusterRadius / Math.pow(2, zoom);
    const grid = new Map(); // "gridX,gridY" → cluster
    
    for (const marker of this.allMarkers) {
      // Convert lat/lng to grid cell
      const cellX = Math.floor(marker.lng / gridSize);
      const cellY = Math.floor(marker.lat / gridSize);
      const key = `${cellX},${cellY}`;
      
      if (!grid.has(key)) {
        grid.set(key, {
          center: { lat: marker.lat, lng: marker.lng },
          markers: [],
          sumLat: 0, sumLng: 0
        });
      }
      
      const cluster = grid.get(key);
      cluster.markers.push(marker);
      cluster.sumLat += marker.lat;
      cluster.sumLng += marker.lng;
      
      // Update center to centroid
      const n = cluster.markers.length;
      cluster.center.lat = cluster.sumLat / n;
      cluster.center.lng = cluster.sumLng / n;
    }
    
    return [...grid.values()].map(c => ({
      ...c,
      isCluster: c.markers.length > 1
    }));
  }
  
  render() {
    const viewport = this.map.getBounds();
    const newElements = new Map();
    
    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();
    
    for (const cluster of this.clusters) {
      // Skip off-screen clusters
      if (!this.isInViewport(cluster.center, viewport)) continue;
      
      const point = this.map.latLngToPixel(cluster.center);
      const key = cluster.isCluster 
        ? `cluster_${cluster.center.lat}_${cluster.center.lng}`
        : `marker_${cluster.markers[0].id}`;
      
      // Reuse existing DOM element if possible
      let el = this.renderedElements.get(key);
      if (!el) {
        el = this.createClusterElement(cluster);
        fragment.appendChild(el);
      }
      
      // Position with transform (GPU-accelerated)
      el.style.transform = `translate(${point.x}px, ${point.y}px)`;
      newElements.set(key, el);
    }
    
    // Remove elements no longer needed
    for (const [key, el] of this.renderedElements) {
      if (!newElements.has(key)) {
        el.remove();
      }
    }
    
    this.map.markerLayer.appendChild(fragment);
    this.renderedElements = newElements;
  }
  
  createClusterElement(cluster) {
    const el = document.createElement('div');
    
    if (cluster.isCluster) {
      const count = cluster.markers.length;
      el.className = `cluster cluster-${this.getClusterSize(count)}`;
      el.textContent = count > 99 ? '99+' : count;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Cluster of ${count} markers. Click to expand.`);
      el.tabIndex = 0;
      
      el.addEventListener('click', () => {
        // Zoom in to expand cluster
        this.map.fitBounds(this.getClusterBounds(cluster));
      });
    } else {
      el.className = 'marker';
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', cluster.markers[0].data.name);
      el.tabIndex = 0;
      
      el.addEventListener('click', () => {
        this.showPopup(cluster.markers[0]);
      });
    }
    
    return el;
  }
  
  getClusterSize(count) {
    if (count < 10) return 'small';
    if (count < 100) return 'medium';
    return 'large';
  }
  
  isInViewport(point, bounds) {
    return point.lat >= bounds.south && point.lat <= bounds.north &&
           point.lng >= bounds.west && point.lng <= bounds.east;
  }
}
```

---

## 🎯 Key Takeaways
- Uber FE = **maps, real-time data, performance at scale**
- **PubSub with wildcards** — `*` (single level) vs `**` (multi-level) — Uber uses this for event routing
- **Grid-based clustering** is O(n) — much faster than distance-based O(n²) for 10K+ markers
- I **got rejected** because my clustering used distance-based O(n²) — too slow for Uber's 10K+ driver markers
- **DOM recycling**: reuse elements instead of recreate on every zoom/pan
- Use `transform: translate()` for marker positioning — GPU-accelerated, no layout thrashing
- Uber values **performance engineering** — always discuss big-O for UI operations

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium | PubSub Wildcards, groupBy |
| Machine Coding | Very Hard | Map Clustering, 10K Markers, Performance |
| System Design | Hard | Ride Tracking, Real-Time Map |
| Behavioral | Medium | Problem Solving, Ownership |
