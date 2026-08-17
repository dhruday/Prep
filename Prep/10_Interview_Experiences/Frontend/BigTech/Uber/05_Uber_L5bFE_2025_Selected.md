# Uber — L5 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Senior Frontend Engineer |
| **Level** | L5b |
| **YOE** | 7 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Amsterdam, Netherlands |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone + 3 Onsite: FE Coding + System Design + HM)

---

## Round 2: Frontend Coding — Build a Trip Timeline with Route Replay
**Duration:** 60 minutes

### Challenge: Build a trip timeline that visualizes past Uber trips: route path on Canvas, animated replay, fare breakdown, stops/waypoints, and trip stats (distance, duration, speed).

```javascript
/**
 * Uber Trip Timeline with Route Replay:
 * 
 * - Canvas route rendering with animated replay
 * - Trip list with search + date filter
 * - Fare breakdown (base + distance + time + surge + tip)
 * - Trip stats: distance, duration, avg speed, max speed
 * - Waypoint markers with labels
 * - Speed graph (sparkline)
 */
class TripTimeline {
  constructor(container) {
    this.container = container;
    this.trips = this.generateTrips();
    this.selectedTrip = null;
    this.replayProgress = 0; // 0-1
    this.isReplaying = false;
    this.replayRAF = null;
    
    this.render();
  }
  
  generateTrips() {
    const trips = [];
    const routes = [
      { name: 'Home → Office', points: [{x:50,y:350},{x:100,y:300},{x:180,y:280},{x:250,y:220},{x:350,y:180},{x:400,y:150}] },
      { name: 'Office → Airport', points: [{x:400,y:150},{x:380,y:200},{x:350,y:260},{x:300,y:300},{x:200,y:320},{x:150,y:380},{x:100,y:400}] },
      { name: 'Airport → Hotel', points: [{x:100,y:400},{x:150,y:350},{x:200,y:300},{x:280,y:280},{x:350,y:250},{x:420,y:200}] },
    ];
    
    for (let i = 0; i < 12; i++) {
      const route = routes[i % routes.length];
      const distance = 5 + Math.random() * 25; // km
      const duration = 10 + Math.random() * 50; // minutes
      const surgeMultiplier = Math.random() > 0.7 ? 1.2 + Math.random() * 0.8 : 1.0;
      const baseFare = 50;
      const distanceFare = distance * 12;
      const timeFare = duration * 2;
      const surgeFare = (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1);
      const tip = Math.random() > 0.5 ? Math.round(Math.random() * 50) : 0;
      
      trips.push({
        id: `trip_${i}`,
        name: route.name,
        date: new Date(Date.now() - i * 86400000 * (1 + Math.random() * 3)),
        route: route.points,
        distance: Math.round(distance * 10) / 10,
        duration: Math.round(duration),
        avgSpeed: Math.round((distance / (duration / 60)) * 10) / 10,
        maxSpeed: Math.round(40 + Math.random() * 60),
        fare: {
          base: baseFare,
          distance: Math.round(distanceFare),
          time: Math.round(timeFare),
          surge: Math.round(surgeFare),
          tip,
          total: Math.round(baseFare + distanceFare + timeFare + surgeFare + tip)
        },
        surgeMultiplier,
        driverName: ['Rajesh', 'Amit', 'Priya', 'Deepak', 'Sunita'][i % 5],
        vehicleType: ['UberGo', 'Premier', 'Auto', 'XL'][i % 4],
        rating: 4 + Math.random()
      });
    }
    return trips;
  }
  
  render() {
    this.container.innerHTML = `
      <style>
        .tt-layout { display:flex; gap:16px; font-family:-apple-system,sans-serif; height:600px; }
        .tt-list { width:320px; overflow-y:auto; border-right:1px solid #e5e7eb; padding-right:16px; }
        .tt-detail { flex:1; display:flex; flex-direction:column; }
        .tt-trip-card { padding:12px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; cursor:pointer; transition:all 0.15s; }
        .tt-trip-card:hover { border-color:#000; }
        .tt-trip-card.selected { border-color:#276ef1; background:#f0f6ff; }
        .tt-trip-name { font-weight:600; font-size:14px; }
        .tt-trip-date { font-size:12px; color:#666; margin-top:2px; }
        .tt-trip-fare { font-size:16px; font-weight:700; margin-top:4px; }
        .tt-trip-meta { display:flex; gap:12px; font-size:12px; color:#888; margin-top:4px; }
        .tt-canvas-wrap { flex:1; position:relative; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb; overflow:hidden; }
        .tt-canvas { display:block; width:100%; height:100%; }
        .tt-controls { display:flex; gap:8px; margin-top:8px; align-items:center; }
        .tt-btn { padding:6px 16px; border:1px solid #d1d5db; border-radius:6px; cursor:pointer; font-size:13px; background:#fff; }
        .tt-btn.primary { background:#276ef1; color:#fff; border-color:#276ef1; }
        .tt-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:8px; }
        .tt-stat { padding:8px; border-radius:6px; background:#f3f4f6; text-align:center; }
        .tt-stat-value { font-size:18px; font-weight:700; }
        .tt-stat-label { font-size:11px; color:#666; }
        .tt-fare-breakdown { margin-top:8px; font-size:13px; }
        .tt-fare-row { display:flex; justify-content:space-between; padding:3px 0; }
        .tt-surge { color:#e11d48; font-weight:500; }
        .tt-progress { flex:1; height:4px; background:#e5e7eb; border-radius:2px; overflow:hidden; }
        .tt-progress-fill { height:100%; background:#276ef1; transition:width 0.1s; }
      </style>
      <div class="tt-layout">
        <div class="tt-list" id="trip-list">
          ${this.trips.map(t => `
            <div class="tt-trip-card ${this.selectedTrip?.id === t.id ? 'selected' : ''}" data-id="${t.id}">
              <div class="tt-trip-name">${this.esc(t.name)}</div>
              <div class="tt-trip-date">${t.date.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })} · ${t.vehicleType}</div>
              <div class="tt-trip-fare">₹${t.fare.total.toLocaleString('en-IN')}${t.surgeMultiplier > 1 ? ` <span class="tt-surge">(${t.surgeMultiplier.toFixed(1)}×)</span>` : ''}</div>
              <div class="tt-trip-meta">
                <span>${t.distance} km</span> · <span>${t.duration} min</span> · <span>⭐ ${t.rating.toFixed(1)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="tt-detail">
          <div class="tt-canvas-wrap"><canvas class="tt-canvas" id="route-canvas"></canvas></div>
          <div class="tt-controls" id="controls" style="display:none">
            <button class="tt-btn primary" id="replay-btn">▶ Replay</button>
            <div class="tt-progress"><div class="tt-progress-fill" id="progress-fill" style="width:0%"></div></div>
          </div>
          <div class="tt-stats" id="stats" style="display:none"></div>
          <div class="tt-fare-breakdown" id="fare-breakdown" style="display:none"></div>
        </div>
      </div>
    `;
    
    // Canvas sizing
    const canvas = this.container.querySelector('#route-canvas');
    const wrap = canvas.parentElement;
    canvas.width = wrap.clientWidth * 2;
    canvas.height = wrap.clientHeight * 2;
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(2, 2); // High DPI
    
    // Trip card clicks
    this.container.querySelectorAll('.tt-trip-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedTrip = this.trips.find(t => t.id === card.dataset.id);
        this.selectTrip();
      });
    });
    
    // Replay button
    this.container.querySelector('#replay-btn')?.addEventListener('click', () => this.toggleReplay());
    
    // Auto-select first trip
    if (this.trips.length > 0) {
      this.selectedTrip = this.trips[0];
      this.selectTrip();
    }
  }
  
  selectTrip() {
    this.stopReplay();
    this.replayProgress = 1; // Show full route initially
    
    // Update selection state
    this.container.querySelectorAll('.tt-trip-card').forEach(c => 
      c.classList.toggle('selected', c.dataset.id === this.selectedTrip.id));
    
    // Show controls
    this.container.querySelector('#controls').style.display = 'flex';
    
    this.drawRoute();
    this.renderStats();
    this.renderFareBreakdown();
  }
  
  drawRoute() {
    const trip = this.selectedTrip;
    if (!trip) return;
    
    const ctx = this.ctx;
    const w = this.canvas.width / 2;
    const h = this.canvas.height / 2;
    
    ctx.clearRect(0, 0, w, h);
    
    // Scale route points to canvas
    const points = trip.route;
    const scaleX = (w - 40) / 500;
    const scaleY = (h - 40) / 500;
    
    const scaled = points.map(p => ({
      x: p.x * scaleX + 20,
      y: p.y * scaleY + 20
    }));
    
    // Draw full path (gray)
    ctx.beginPath();
    ctx.moveTo(scaled[0].x, scaled[0].y);
    for (let i = 1; i < scaled.length; i++) {
      ctx.lineTo(scaled[i].x, scaled[i].y);
    }
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw traveled path (blue, based on replay progress)
    const totalLen = this.pathLength(scaled);
    const traveledLen = totalLen * this.replayProgress;
    
    ctx.beginPath();
    ctx.moveTo(scaled[0].x, scaled[0].y);
    
    let accumulated = 0;
    for (let i = 1; i < scaled.length; i++) {
      const segLen = this.dist(scaled[i - 1], scaled[i]);
      
      if (accumulated + segLen <= traveledLen) {
        ctx.lineTo(scaled[i].x, scaled[i].y);
        accumulated += segLen;
      } else {
        // Interpolate
        const frac = (traveledLen - accumulated) / segLen;
        const px = scaled[i - 1].x + (scaled[i].x - scaled[i - 1].x) * frac;
        const py = scaled[i - 1].y + (scaled[i].y - scaled[i - 1].y) * frac;
        ctx.lineTo(px, py);
        
        // Draw car marker at current position
        ctx.strokeStyle = '#276ef1';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#276ef1';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        break;
      }
    }
    
    if (this.replayProgress >= 1) {
      ctx.strokeStyle = '#276ef1';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    
    // Start marker (green)
    ctx.beginPath();
    ctx.arc(scaled[0].x, scaled[0].y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // End marker (red)
    const last = scaled[scaled.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Labels
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = '#333';
    ctx.fillText('Pickup', scaled[0].x + 10, scaled[0].y - 8);
    ctx.fillText('Dropoff', last.x + 10, last.y - 8);
    
    // Progress bar
    const fill = this.container.querySelector('#progress-fill');
    if (fill) fill.style.width = `${this.replayProgress * 100}%`;
  }
  
  toggleReplay() {
    if (this.isReplaying) {
      this.stopReplay();
    } else {
      this.replayProgress = 0;
      this.isReplaying = true;
      this.container.querySelector('#replay-btn').textContent = '⏸ Pause';
      
      const start = performance.now();
      const duration = 3000; // 3 second animation
      
      const animate = (now) => {
        const elapsed = now - start;
        this.replayProgress = Math.min(1, elapsed / duration);
        this.drawRoute();
        
        if (this.replayProgress < 1) {
          this.replayRAF = requestAnimationFrame(animate);
        } else {
          this.isReplaying = false;
          this.container.querySelector('#replay-btn').textContent = '▶ Replay';
        }
      };
      
      this.replayRAF = requestAnimationFrame(animate);
    }
  }
  
  stopReplay() {
    this.isReplaying = false;
    if (this.replayRAF) cancelAnimationFrame(this.replayRAF);
    this.container.querySelector('#replay-btn').textContent = '▶ Replay';
  }
  
  renderStats() {
    const t = this.selectedTrip;
    const stats = this.container.querySelector('#stats');
    if (!stats || !t) return;
    
    stats.style.display = 'grid';
    stats.innerHTML = `
      <div class="tt-stat"><div class="tt-stat-value">${t.distance} km</div><div class="tt-stat-label">Distance</div></div>
      <div class="tt-stat"><div class="tt-stat-value">${t.duration} min</div><div class="tt-stat-label">Duration</div></div>
      <div class="tt-stat"><div class="tt-stat-value">${t.avgSpeed} km/h</div><div class="tt-stat-label">Avg Speed</div></div>
      <div class="tt-stat"><div class="tt-stat-value">${t.maxSpeed} km/h</div><div class="tt-stat-label">Max Speed</div></div>
    `;
  }
  
  renderFareBreakdown() {
    const t = this.selectedTrip;
    const el = this.container.querySelector('#fare-breakdown');
    if (!el || !t) return;
    
    el.style.display = 'block';
    el.innerHTML = `
      <div class="tt-fare-row"><span>Base fare</span><span>₹${t.fare.base}</span></div>
      <div class="tt-fare-row"><span>Distance (${t.distance} km)</span><span>₹${t.fare.distance}</span></div>
      <div class="tt-fare-row"><span>Time (${t.duration} min)</span><span>₹${t.fare.time}</span></div>
      ${t.fare.surge > 0 ? `<div class="tt-fare-row tt-surge"><span>Surge (${t.surgeMultiplier.toFixed(1)}×)</span><span>₹${t.fare.surge}</span></div>` : ''}
      ${t.fare.tip > 0 ? `<div class="tt-fare-row"><span>Tip</span><span>₹${t.fare.tip}</span></div>` : ''}
      <div class="tt-fare-row" style="font-weight:700;border-top:1px solid #e5e7eb;padding-top:4px;margin-top:4px"><span>Total</span><span>₹${t.fare.total}</span></div>
    `;
  }
  
  pathLength(points) {
    let len = 0;
    for (let i = 1; i < points.length; i++) len += this.dist(points[i - 1], points[i]);
    return len;
  }
  
  dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
  
  esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

---

## 🎯 Key Takeaways
- Uber L5b FE = **Trip timeline with animated route replay on Canvas**
- **Route replay**: `requestAnimationFrame` animates `replayProgress` 0→1 over 3s — interpolate position along path
- **Path interpolation**: accumulate segment lengths → when exceeding target length, lerp within that segment
- **High DPI Canvas**: `canvas.width *= 2; ctx.scale(2, 2)` — crisp on Retina displays
- **Fare breakdown**: base + distance×rate + time×rate + surge + tip — standard Uber pricing model
- **Start/End markers**: green circle (pickup), red circle (dropoff) — standard ride-hailing UX
- **Surge pricing**: highlighted in red when multiplier > 1.0
- Uber FE = **maps, animations, real-time tracking** — Canvas rendering + requestAnimationFrame are core

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | JS Coding |
| FE Coding (this) | Very Hard | Canvas, Animation, Map Rendering |
| System Design | Very Hard | Ride Matching |
| HM | Medium | Culture |
