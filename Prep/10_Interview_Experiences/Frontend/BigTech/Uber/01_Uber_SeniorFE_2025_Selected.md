# Uber — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 (5B) |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Timeline:** 3 weeks
- **Format:** Virtual

---

## Round 1: Phone Screen — JavaScript + DOM
**Duration:** 45 minutes

### Questions Asked
1. **Implement a rate limiter for DOM events (throttle with queuing)**
2. **Explain ResizeObserver and IntersectionObserver differences**

### 💡 Interview-Ready Answer — Throttle with Queue

```javascript
function throttleWithQueue(fn, interval) {
  let isThrottled = false;
  let queue = [];
  
  function processQueue() {
    if (queue.length === 0) {
      isThrottled = false;
      return;
    }
    
    const { args, resolve } = queue.shift();
    resolve(fn(...args));
    
    setTimeout(processQueue, interval);
  }
  
  return function (...args) {
    return new Promise((resolve) => {
      if (!isThrottled) {
        isThrottled = true;
        resolve(fn(...args));
        setTimeout(processQueue, interval);
      } else {
        queue.push({ args, resolve });
      }
    });
  };
}

// Simple throttle (more commonly asked):
function throttle(fn, delay) {
  let lastTime = 0;
  let timer = null;
  
  return function (...args) {
    const now = Date.now();
    const remaining = delay - (now - lastTime);
    
    clearTimeout(timer);
    
    if (remaining <= 0) {
      lastTime = now;
      fn.apply(this, args);
    } else {
      // Trailing call: ensure last event fires
      timer = setTimeout(() => {
        lastTime = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}
```

---

## Round 2: Frontend Coding
**Duration:** 60 minutes

### Questions Asked
1. **Build a Map component with draggable markers and route display**
   - Render a map canvas, allow placing markers, draw route between them

### 💡 Interview-Ready Answer — Interactive Map Canvas

```javascript
class MapCanvas {
  constructor(container, options = {}) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = container;
    this.markers = [];
    this.route = [];
    this.isDragging = false;
    this.dragMarkerIdx = -1;
    this.pan = { x: 0, y: 0 };
    this.zoom = 1;
    
    this.canvas.width = options.width || 800;
    this.canvas.height = options.height || 600;
    container.appendChild(this.canvas);
    
    this.attachEvents();
    this.render();
  }
  
  attachEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
  }
  
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.pan.x) / this.zoom,
      y: (e.clientY - rect.top - this.pan.y) / this.zoom
    };
  }
  
  onDoubleClick(e) {
    const pos = this.getMousePos(e);
    this.markers.push({
      x: pos.x,
      y: pos.y,
      label: String.fromCharCode(65 + this.markers.length), // A, B, C...
      color: '#276EF1' // Uber blue
    });
    
    // Auto-calculate route between consecutive markers
    if (this.markers.length >= 2) {
      this.calculateRoute();
    }
    
    this.render();
  }
  
  onMouseDown(e) {
    const pos = this.getMousePos(e);
    
    // Check if clicking on a marker
    this.dragMarkerIdx = this.markers.findIndex(m => 
      Math.hypot(m.x - pos.x, m.y - pos.y) < 15
    );
    
    if (this.dragMarkerIdx >= 0) {
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
    }
  }
  
  onMouseMove(e) {
    if (this.isDragging && this.dragMarkerIdx >= 0) {
      const pos = this.getMousePos(e);
      this.markers[this.dragMarkerIdx].x = pos.x;
      this.markers[this.dragMarkerIdx].y = pos.y;
      
      if (this.markers.length >= 2) {
        this.calculateRoute();
      }
      
      this.render();
    }
  }
  
  onMouseUp() {
    this.isDragging = false;
    this.dragMarkerIdx = -1;
    this.canvas.style.cursor = 'default';
  }
  
  calculateRoute() {
    // Simplified: straight lines between consecutive markers
    // Real app: call routing API (Dijkstra on road network)
    this.route = [];
    for (let i = 0; i < this.markers.length - 1; i++) {
      this.route.push({
        from: this.markers[i],
        to: this.markers[i + 1]
      });
    }
  }
  
  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.scale(this.zoom, this.zoom);
    
    // Draw grid (map background)
    this.drawGrid();
    
    // Draw route
    if (this.route.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#276EF1';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      
      ctx.moveTo(this.route[0].from.x, this.route[0].from.y);
      for (const segment of this.route) {
        ctx.lineTo(segment.to.x, segment.to.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw distance labels
      for (const segment of this.route) {
        const midX = (segment.from.x + segment.to.x) / 2;
        const midY = (segment.from.y + segment.to.y) / 2;
        const dist = Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${(dist / 50).toFixed(1)} km`, midX + 5, midY - 5);
      }
    }
    
    // Draw markers
    for (const marker of this.markers) {
      // Pin shape
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = marker.color;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(marker.label, marker.x, marker.y);
    }
    
    ctx.restore();
  }
  
  drawGrid() {
    const { ctx, canvas } = this;
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }
}
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Uber's Rider App — real-time driver tracking on map**

### 💡 Interview-Ready Answer

```
Uber Rider App — Real-Time Driver Tracking:
┌──────────────────────────────────────────────────────────────┐
│  Map Rendering Engine                                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Mapbox GL JS / Google Maps JS SDK                     │    │
│  │  - Vector tile rendering (GPU-accelerated via WebGL)  │    │
│  │  - Custom layers: route overlay, driver icon, ETA     │    │
│  │  - Smooth animation: interpolate GPS positions        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Real-Time Driver Location:                                   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  WebSocket connection to location service              │    │
│  │  - Driver sends GPS every 4 seconds                   │    │
│  │  - Server pushes to rider's WebSocket                 │    │
│  │                                                        │    │
│  │  Smooth animation between GPS updates:                │    │
│  │  - Don't jump car icon from point A to B              │    │
│  │  - Interpolate position over 4 seconds using          │    │
│  │    requestAnimationFrame                              │    │
│  │  - Also interpolate car heading/rotation              │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

#### Smooth Driver Animation
```javascript
class DriverAnimation {
  constructor(mapMarker) {
    this.marker = mapMarker;
    this.currentPos = null;
    this.targetPos = null;
    this.currentHeading = 0;
    this.targetHeading = 0;
    this.startTime = null;
    this.duration = 4000; // 4s between GPS updates
    this.animFrameId = null;
  }
  
  updatePosition(newLat, newLng, heading) {
    if (this.currentPos === null) {
      this.currentPos = { lat: newLat, lng: newLng };
      this.currentHeading = heading;
      this.marker.setPosition(this.currentPos);
      return;
    }
    
    // Start interpolation from current position to new
    this.currentPos = this.marker.getPosition();
    this.targetPos = { lat: newLat, lng: newLng };
    this.currentHeading = this.marker.getRotation();
    this.targetHeading = heading;
    this.startTime = performance.now();
    
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.animate();
  }
  
  animate() {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    // Ease-out cubic for natural deceleration
    const eased = 1 - Math.pow(1 - progress, 3);
    
    const lat = this.currentPos.lat + (this.targetPos.lat - this.currentPos.lat) * eased;
    const lng = this.currentPos.lng + (this.targetPos.lng - this.currentPos.lng) * eased;
    const heading = this.currentHeading + (this.targetHeading - this.currentHeading) * eased;
    
    this.marker.setPosition({ lat, lng });
    this.marker.setRotation(heading);
    
    if (progress < 1) {
      this.animFrameId = requestAnimationFrame(() => this.animate());
    }
  }
}

// WebSocket integration
const ws = new WebSocket('wss://api.uber.com/driver-location');
const driverAnim = new DriverAnimation(driverMarker);

ws.onmessage = (event) => {
  const { lat, lng, heading, eta } = JSON.parse(event.data);
  driverAnim.updatePosition(lat, lng, heading);
  updateETA(eta);
};
```

#### Ride State Machine (Client-Side)
```javascript
const RIDE_STATES = {
  LOOKING:     { next: ['MATCHED', 'NO_DRIVERS'] },
  MATCHED:     { next: ['DRIVER_EN_ROUTE', 'CANCELLED'] },
  DRIVER_EN_ROUTE: { next: ['ARRIVED', 'CANCELLED'] },
  ARRIVED:     { next: ['IN_RIDE', 'CANCELLED', 'NO_SHOW'] },
  IN_RIDE:     { next: ['COMPLETED'] },
  COMPLETED:   { next: ['RATING'] },
  RATING:      { next: ['IDLE'] },
  CANCELLED:   { next: ['IDLE'] },
};

// Each state maps to a different UI:
// LOOKING → searching animation, surge notice
// MATCHED → driver card (name, photo, car, rating)
// DRIVER_EN_ROUTE → map with driver tracking + ETA
// ARRIVED → "Your driver has arrived" notification
// IN_RIDE → route progress, share trip button, SOS
// COMPLETED → fare breakdown, tip, rating
```

---

## Round 4: Behavioral
**Duration:** 45 minutes

---

## 🎯 Key Takeaways
- Uber FE tests **Canvas/Map manipulation** — practice drawing on HTML5 Canvas
- **Throttle with trailing call** is critical for real-time location events
- **GPS interpolation** with requestAnimationFrame — key for smooth map animations
- **Ride state machine** on client-side determines the entire UI flow
- **WebSocket** for real-time location, with reconnection and fallback to polling
- **Vector tile maps** (Mapbox GL) over raster (Google Maps) for performance
- Uber cares about **60fps animations** — never block the main thread

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Throttle, Observer APIs |
| Coding | Hard | Canvas, Map, Drag-and-Drop |
| System Design | Very Hard | Real-Time Location, Animation, Maps |
| Behavioral | Medium | Leadership, Collaboration |
