# Zomato — Senior Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Gurugram, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build a Real-Time Order Tracking Map Interface
- Map view showing rider path from restaurant to user
- Animated rider marker moving along path
- ETA countdown timer with dynamic updates
- Order status timeline (Placed → Preparing → Picked Up → On the Way → Delivered)
- Pull-to-refresh for latest status
- Smooth path interpolation between GPS points

```javascript
/**
 * Real-Time Order Tracking Map:
 * - Animated rider marker on path
 * - ETA countdown with dynamic updates
 * - Status timeline
 * - GPS path interpolation
 * - Canvas-based map rendering
 */
class OrderTracker {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    
    this.order = {
      id: 'ORD-2025-42',
      status: 'on_the_way', // placed, preparing, picked_up, on_the_way, delivered
      restaurant: { name: 'Pizza Palace', lat: 28.6139, lng: 77.2090 },
      user: { lat: 28.6280, lng: 77.2195 },
      rider: { name: 'Rahul', phone: '+91XXXXXXXX', lat: 28.6200, lng: 77.2140 },
      eta: 12, // minutes
      placedAt: Date.now() - 25 * 60 * 1000,
    };
    
    // Path waypoints (simulated)
    this.path = [
      { lat: 28.6139, lng: 77.2090 }, // restaurant
      { lat: 28.6155, lng: 77.2100 },
      { lat: 28.6170, lng: 77.2115 },
      { lat: 28.6185, lng: 77.2130 },
      { lat: 28.6200, lng: 77.2140 }, // current rider position
      { lat: 28.6220, lng: 77.2155 },
      { lat: 28.6245, lng: 77.2170 },
      { lat: 28.6265, lng: 77.2185 },
      { lat: 28.6280, lng: 77.2195 }, // user
    ];
    
    this.riderPathIndex = 4; // Current position on path
    this.riderAnimProgress = 0; // 0-1 between current and next waypoint
    this.animFrame = null;
    this.etaTimer = null;
    
    this.statuses = [
      { key: 'placed', label: 'Order Placed', icon: '📝', time: this.order.placedAt },
      { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', time: this.order.placedAt + 5 * 60000 },
      { key: 'picked_up', label: 'Picked Up', icon: '🏍️', time: this.order.placedAt + 15 * 60000 },
      { key: 'on_the_way', label: 'On the Way', icon: '🛵', time: this.order.placedAt + 20 * 60000 },
      { key: 'delivered', label: 'Delivered', icon: '✅', time: null },
    ];
    
    this.render();
    this.startAnimation();
    this.startEtaCountdown();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="order-tracker" style="font-family:-apple-system,sans-serif">
        <!-- Header -->
        <header style="padding:16px; background:#e23744; color:#fff">
          <h2 style="margin:0">Order #${this.order.id}</h2>
          <p style="margin:4px 0 0; opacity:0.9">From ${this.sanitize(this.order.restaurant.name)}</p>
        </header>
        
        <!-- Map Canvas -->
        <div style="position:relative">
          <canvas id="tracking-map" width="400" height="300" 
                  style="width:100%; background:#f0f0f0; display:block"></canvas>
          
          <!-- ETA overlay -->
          <div id="eta-overlay" style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.8); 
               color:#fff; padding:8px 16px; border-radius:20px; font-size:14px">
            Arriving in <strong id="eta-value">${this.order.eta}</strong> min
          </div>
        </div>
        
        <!-- Rider Info -->
        <div style="display:flex; align-items:center; gap:12px; padding:16px; border-bottom:1px solid #eee">
          <div style="width:40px; height:40px; border-radius:50%; background:#e23744; color:#fff; 
               display:flex; align-items:center; justify-content:center; font-size:20px">🛵</div>
          <div style="flex:1">
            <strong>${this.sanitize(this.order.rider.name)}</strong>
            <p style="margin:2px 0 0; font-size:13px; color:#666">Your delivery partner</p>
          </div>
          <button style="padding:8px 16px; border:1px solid #e23744; color:#e23744; background:none; 
                  border-radius:20px; cursor:pointer" aria-label="Call rider">📞 Call</button>
        </div>
        
        <!-- Status Timeline -->
        <div class="status-timeline" style="padding:16px" role="list" aria-label="Order status">
          ${this.renderTimeline()}
        </div>
      </div>
    `;
    
    this.canvas = this.container.querySelector('#tracking-map');
    this.ctx = this.canvas.getContext('2d');
    
    // High DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    
    this.drawMap();
  }
  
  renderTimeline() {
    const statusOrder = this.statuses.map(s => s.key);
    const currentIdx = statusOrder.indexOf(this.order.status);
    
    return this.statuses.map((status, i) => {
      const isComplete = i <= currentIdx;
      const isCurrent = i === currentIdx;
      const time = status.time ? new Date(status.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
      
      return `
        <div role="listitem" style="display:flex; gap:12px; align-items:flex-start; margin-bottom:${i < this.statuses.length - 1 ? '0' : '0'}px">
          <!-- Line + dot -->
          <div style="display:flex; flex-direction:column; align-items:center; width:24px">
            <div style="width:24px; height:24px; border-radius:50%; font-size:14px; display:flex; align-items:center; justify-content:center;
                 ${isComplete ? 'background:#e23744; color:#fff' : 'background:#eee; color:#999'}
                 ${isCurrent ? 'box-shadow:0 0 0 4px rgba(226,55,68,0.2)' : ''}">
              ${status.icon}
            </div>
            ${i < this.statuses.length - 1 ? `
              <div style="width:2px; height:24px; ${isComplete ? 'background:#e23744' : 'background:#eee'}"></div>
            ` : ''}
          </div>
          
          <!-- Label -->
          <div style="padding-top:2px">
            <span style="font-weight:${isCurrent ? 'bold' : 'normal'}; color:${isComplete ? '#333' : '#999'}">
              ${status.label}
            </span>
            ${time ? `<span style="font-size:12px; color:#999; margin-left:8px">${time}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
  
  /**
   * Convert geo coordinates to canvas pixel coordinates.
   * Simple linear interpolation within the bounding box.
   */
  geoToPixel(lat, lng) {
    const padding = 40;
    
    const minLat = Math.min(...this.path.map(p => p.lat)) - 0.002;
    const maxLat = Math.max(...this.path.map(p => p.lat)) + 0.002;
    const minLng = Math.min(...this.path.map(p => p.lng)) - 0.002;
    const maxLng = Math.max(...this.path.map(p => p.lng)) + 0.002;
    
    const x = padding + ((lng - minLng) / (maxLng - minLng)) * (this.canvasWidth - 2 * padding);
    const y = padding + ((maxLat - lat) / (maxLat - minLat)) * (this.canvasHeight - 2 * padding);
    
    return { x, y };
  }
  
  drawMap() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Draw path (completed portion in red, remaining in gray dashed)
    const riderPos = this.getRiderPosition();
    
    // Completed path (solid red)
    ctx.beginPath();
    ctx.strokeStyle = '#e23744';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    
    for (let i = 0; i <= this.riderPathIndex; i++) {
      const p = this.geoToPixel(this.path[i].lat, this.path[i].lng);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    
    // Line to current animated position
    const rp = this.geoToPixel(riderPos.lat, riderPos.lng);
    ctx.lineTo(rp.x, rp.y);
    ctx.stroke();
    
    // Remaining path (dashed gray)
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.moveTo(rp.x, rp.y);
    
    for (let i = this.riderPathIndex + 1; i < this.path.length; i++) {
      const p = this.geoToPixel(this.path[i].lat, this.path[i].lng);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Restaurant marker
    const rStart = this.geoToPixel(this.order.restaurant.lat, this.order.restaurant.lng);
    this.drawMarker(ctx, rStart.x, rStart.y, '🍕', '#ff6b35');
    
    // User marker
    const uEnd = this.geoToPixel(this.order.user.lat, this.order.user.lng);
    this.drawMarker(ctx, uEnd.x, uEnd.y, '🏠', '#3b82f6');
    
    // Rider marker (animated pulse)
    this.drawRiderMarker(ctx, rp.x, rp.y);
  }
  
  drawMarker(ctx, x, y, emoji, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
  }
  
  drawRiderMarker(ctx, x, y) {
    // Pulse animation ring
    const pulseSize = 18 + 8 * Math.sin(Date.now() / 300);
    ctx.strokeStyle = 'rgba(226, 55, 68, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
    ctx.stroke();
    
    // Rider dot
    ctx.fillStyle = '#e23744';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛵', x, y);
  }
  
  getRiderPosition() {
    const current = this.path[this.riderPathIndex];
    const next = this.path[Math.min(this.riderPathIndex + 1, this.path.length - 1)];
    
    return {
      lat: current.lat + (next.lat - current.lat) * this.riderAnimProgress,
      lng: current.lng + (next.lng - current.lng) * this.riderAnimProgress
    };
  }
  
  startAnimation() {
    const tick = () => {
      this.riderAnimProgress += 0.003; // Speed of rider movement
      
      if (this.riderAnimProgress >= 1) {
        this.riderAnimProgress = 0;
        this.riderPathIndex = Math.min(this.riderPathIndex + 1, this.path.length - 2);
        
        if (this.riderPathIndex >= this.path.length - 2) {
          // Rider arrived
          this.order.status = 'delivered';
          this.render();
          return;
        }
      }
      
      this.drawMap();
      this.animFrame = requestAnimationFrame(tick);
    };
    
    this.animFrame = requestAnimationFrame(tick);
  }
  
  startEtaCountdown() {
    this.etaTimer = setInterval(() => {
      if (this.order.eta > 0) {
        this.order.eta = Math.max(0, this.order.eta - 1);
        const el = this.container.querySelector('#eta-value');
        if (el) el.textContent = this.order.eta;
      }
    }, 60000); // Decrease every minute
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
  
  destroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.etaTimer) clearInterval(this.etaTimer);
  }
}
```

---

## 🎯 Key Takeaways
- Zomato FE = **Real-time order tracking map with animated rider, ETA countdown, status timeline**
- **geoToPixel**: linear interpolation within bounding box — `(lng - minLng) / (maxLng - minLng) × width`
- **Path interpolation**: lerp between waypoints — `current + (next - current) × progress`
- **Rider pulse**: `sin(Date.now() / 300)` modulates radius — creates breathing effect
- **Status timeline**: ordered list with connected dots — complete/current/upcoming states
- **Canvas + setLineDash**: completed path solid red, remaining dashed gray — visual progress
- **High DPI Canvas**: `canvas.width = rect.width × devicePixelRatio` + `ctx.scale(dpr, dpr)`
- Zomato = **food delivery UX** — tracking, restaurant discovery, real-time updates

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Canvas Map, Animation, Real-Time |
| Technical | Hard | JS, React, Performance |
| HM | Medium | Culture Fit |
