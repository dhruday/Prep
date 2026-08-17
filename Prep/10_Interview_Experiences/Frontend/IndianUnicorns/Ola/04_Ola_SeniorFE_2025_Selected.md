# Ola — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Build an EV Charging Station Locator with Route Planner
- Map showing available EV charging stations
- Filter by: charger type (Level 2 / DC Fast), availability, connector type
- Route planner: given A→B, suggest charging stops based on battery range
- Station details card: available ports, pricing, wait time estimate
- Real-time availability with simulated WebSocket updates

```javascript
/**
 * EV Charging Station Locator + Route Planner:
 * - Canvas map with stations as markers
 * - Filter by charger type, availability, connector
 * - Route planner: suggest charging stops within range
 * - Station detail cards
 * - Simulated real-time availability updates
 */
class EVStationLocator {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    
    this.filters = {
      chargerType: 'all', // all, level2, dcfast
      available: false,    // show only available
      connector: 'all'     // all, CCS, CHAdeMO, Type2
    };
    
    this.batteryRange = 250; // km on full charge
    this.currentBattery = 80; // %
    this.selectedStation = null;
    
    // Sample stations
    this.stations = [
      { id: 1, name: 'Ola Hypercharger Hub', lat: 12.9716, lng: 77.5946, 
        type: 'dcfast', connector: 'CCS', ports: 8, available: 5, 
        price: 18, waitTime: 0, rating: 4.5, power: 150 },
      { id: 2, name: 'MG Road Charging Point', lat: 12.9752, lng: 77.6011, 
        type: 'level2', connector: 'Type2', ports: 4, available: 2, 
        price: 12, waitTime: 10, rating: 4.0, power: 22 },
      { id: 3, name: 'Electronic City Hub', lat: 12.8400, lng: 77.6770, 
        type: 'dcfast', connector: 'CCS', ports: 12, available: 0, 
        price: 20, waitTime: 25, rating: 4.8, power: 250 },
      { id: 4, name: 'Whitefield Station', lat: 12.9698, lng: 77.7500, 
        type: 'level2', connector: 'CHAdeMO', ports: 6, available: 3, 
        price: 14, waitTime: 5, rating: 3.9, power: 50 },
      { id: 5, name: 'Koramangala Charger', lat: 12.9352, lng: 77.6245, 
        type: 'dcfast', connector: 'CCS', ports: 6, available: 4, 
        price: 16, waitTime: 0, rating: 4.3, power: 120 },
    ];
    
    this.render();
    this.startRealtimeUpdates();
  }
  
  get filteredStations() {
    return this.stations.filter(s => {
      if (this.filters.chargerType !== 'all' && s.type !== this.filters.chargerType) return false;
      if (this.filters.available && s.available === 0) return false;
      if (this.filters.connector !== 'all' && s.connector !== this.filters.connector) return false;
      return true;
    });
  }
  
  /**
   * Route planner: given start + end coordinates + battery %,
   * find charging stops needed along the route.
   * 
   * Greedy algorithm: drive as far as possible, then stop at the
   * nearest station before running out.
   */
  planRoute(startLat, startLng, endLat, endLng) {
    const totalDistance = this.haversine(startLat, startLng, endLat, endLng);
    const effectiveRange = (this.currentBattery / 100) * this.batteryRange;
    
    if (effectiveRange >= totalDistance) {
      return { stops: [], totalDistance, canReach: true };
    }
    
    // Find stations along the route (within 10km of the direct path)
    const routeStations = this.stations
      .filter(s => s.available > 0 && s.type === 'dcfast') // Prefer fast chargers
      .map(s => ({
        ...s,
        distFromStart: this.haversine(startLat, startLng, s.lat, s.lng),
        distFromRoute: this.pointToLineDistance(
          s.lat, s.lng, startLat, startLng, endLat, endLng
        )
      }))
      .filter(s => s.distFromRoute < 10) // Within 10km of route
      .sort((a, b) => a.distFromStart - b.distFromStart);
    
    // Greedy: add stops when range would run out
    const stops = [];
    let currentRange = effectiveRange;
    let lastLat = startLat, lastLng = startLng;
    
    for (const station of routeStations) {
      const distToStation = this.haversine(lastLat, lastLng, station.lat, station.lng);
      
      if (currentRange < distToStation + 20) { // 20km buffer
        // Need to charge at previous closest station
        // After charging: assume 80% charge (DC fast charge to 80%)
        currentRange = 0.8 * this.batteryRange;
        stops.push(station);
        lastLat = station.lat;
        lastLng = station.lng;
      }
    }
    
    // Check if we can reach destination from last stop
    const finalDist = this.haversine(lastLat, lastLng, endLat, endLng);
    const canReach = currentRange >= finalDist;
    
    return { stops, totalDistance, canReach };
  }
  
  haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  
  /**
   * Approximate perpendicular distance from point to line segment.
   * Used to check if station is "along the route".
   */
  pointToLineDistance(pLat, pLng, lat1, lng1, lat2, lng2) {
    const d1 = this.haversine(pLat, pLng, lat1, lng1);
    const d2 = this.haversine(pLat, pLng, lat2, lng2);
    const d12 = this.haversine(lat1, lng1, lat2, lng2);
    
    // If perpendicular foot is outside segment, use min endpoint distance
    if (d1 ** 2 > d2 ** 2 + d12 ** 2) return d2;
    if (d2 ** 2 > d1 ** 2 + d12 ** 2) return d1;
    
    // Heron's formula for triangle area → height = 2*area / base
    const s = (d1 + d2 + d12) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - d1) * (s - d2) * (s - d12)));
    return (2 * area) / d12;
  }
  
  geoToPixel(lat, lng) {
    const padding = 30;
    const allLats = this.stations.map(s => s.lat);
    const allLngs = this.stations.map(s => s.lng);
    const minLat = Math.min(...allLats) - 0.02;
    const maxLat = Math.max(...allLats) + 0.02;
    const minLng = Math.min(...allLngs) - 0.02;
    const maxLng = Math.max(...allLngs) + 0.02;
    
    return {
      x: padding + ((lng - minLng) / (maxLng - minLng)) * (this.canvasW - 2 * padding),
      y: padding + ((maxLat - lat) / (maxLat - minLat)) * (this.canvasH - 2 * padding)
    };
  }
  
  render() {
    this.container.innerHTML = `
      <div class="ev-locator">
        <!-- Filters -->
        <div class="filters" style="padding:12px; display:flex; gap:12px; flex-wrap:wrap; background:#f8f9fa; border-bottom:1px solid #eee">
          <select id="filter-type" aria-label="Charger type">
            <option value="all" ${this.filters.chargerType === 'all' ? 'selected' : ''}>All Types</option>
            <option value="level2" ${this.filters.chargerType === 'level2' ? 'selected' : ''}>Level 2 (AC)</option>
            <option value="dcfast" ${this.filters.chargerType === 'dcfast' ? 'selected' : ''}>DC Fast</option>
          </select>
          <select id="filter-connector" aria-label="Connector type">
            <option value="all">All Connectors</option>
            <option value="CCS">CCS</option>
            <option value="CHAdeMO">CHAdeMO</option>
            <option value="Type2">Type 2</option>
          </select>
          <label style="display:flex; align-items:center; gap:4px">
            <input type="checkbox" id="filter-available" ${this.filters.available ? 'checked' : ''}>
            Available only
          </label>
          <div style="flex:1"></div>
          <div style="display:flex; align-items:center; gap:6px">
            🔋 <input type="range" id="battery-slider" min="5" max="100" value="${this.currentBattery}" style="width:100px">
            <span id="battery-label">${this.currentBattery}%</span>
          </div>
        </div>
        
        <!-- Map -->
        <canvas id="ev-map" style="width:100%; height:300px; display:block; cursor:pointer"></canvas>
        
        <!-- Station Detail Card -->
        <div id="station-detail" style="padding:16px; ${this.selectedStation ? '' : 'display:none'}">
          ${this.selectedStation ? this.renderStationCard(this.selectedStation) : ''}
        </div>
        
        <!-- Station List -->
        <div class="station-list" style="padding:8px; max-height:200px; overflow-y:auto" role="list" aria-label="Charging stations">
          ${this.filteredStations.map(s => `
            <div class="station-row" data-id="${s.id}" role="listitem"
                 style="display:flex; align-items:center; gap:12px; padding:8px; border-bottom:1px solid #f0f0f0; cursor:pointer">
              <span style="font-size:20px">${s.type === 'dcfast' ? '⚡' : '🔌'}</span>
              <div style="flex:1">
                <strong>${this.sanitize(s.name)}</strong>
                <div style="font-size:12px; color:#666">${s.connector} · ${s.power}kW · ₹${s.price}/kWh</div>
              </div>
              <div style="text-align:right">
                <span style="color:${s.available > 0 ? '#22c55e' : '#ef4444'}; font-weight:bold">
                  ${s.available}/${s.ports}
                </span>
                <div style="font-size:11px; color:#999">${s.waitTime > 0 ? `~${s.waitTime} min wait` : 'No wait'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    this.setupCanvas();
    this.attachListeners();
    this.drawMap();
  }
  
  setupCanvas() {
    this.canvas = this.container.querySelector('#ev-map');
    this.ctx = this.canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvasW = rect.width;
    this.canvasH = rect.height;
  }
  
  drawMap() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    
    // Draw stations
    for (const station of this.filteredStations) {
      const { x, y } = this.geoToPixel(station.lat, station.lng);
      const isSelected = this.selectedStation?.id === station.id;
      
      // Availability color
      const color = station.available > 0 ? '#22c55e' : '#ef4444';
      
      // Background circle
      ctx.fillStyle = isSelected ? '#3b82f6' : color;
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 16 : 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Icon
      ctx.fillStyle = '#fff';
      ctx.font = `${isSelected ? 14 : 12}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(station.type === 'dcfast' ? '⚡' : '🔌', x, y);
      
      // Label
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.fillText(station.name.split(' ')[0], x, y + 22);
    }
  }
  
  renderStationCard(station) {
    const chargingTime = station.type === 'dcfast' 
      ? Math.round((100 - this.currentBattery) * 0.6) // ~36 min for 60%
      : Math.round((100 - this.currentBattery) * 3);   // ~180 min
    
    return `
      <div style="background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.1); padding:16px">
        <div style="display:flex; justify-content:space-between; align-items:start">
          <div>
            <h3 style="margin:0">${this.sanitize(station.name)}</h3>
            <p style="color:#666; margin:4px 0">${station.connector} · ${station.power}kW ${station.type === 'dcfast' ? 'DC Fast' : 'Level 2 AC'}</p>
          </div>
          <span style="font-size:24px">${station.type === 'dcfast' ? '⚡' : '🔌'}</span>
        </div>
        
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin:12px 0">
          <div style="text-align:center; padding:8px; background:#f0fdf4; border-radius:8px">
            <div style="font-size:20px; font-weight:bold; color:#22c55e">${station.available}/${station.ports}</div>
            <div style="font-size:11px; color:#666">Available</div>
          </div>
          <div style="text-align:center; padding:8px; background:#eff6ff; border-radius:8px">
            <div style="font-size:20px; font-weight:bold; color:#3b82f6">~${chargingTime}m</div>
            <div style="font-size:11px; color:#666">Charge Time</div>
          </div>
          <div style="text-align:center; padding:8px; background:#fefce8; border-radius:8px">
            <div style="font-size:20px; font-weight:bold; color:#eab308">₹${station.price}/kWh</div>
            <div style="font-size:11px; color:#666">Price</div>
          </div>
        </div>
        
        <div style="display:flex; gap:8px">
          <button style="flex:1; padding:10px; background:#333; color:#fff; border:none; border-radius:8px; cursor:pointer">
            Navigate
          </button>
          <button style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; cursor:pointer"
                  ${station.available === 0 ? 'disabled style="opacity:0.5"' : ''}>
            ${station.available > 0 ? 'Start Charging' : 'Join Waitlist'}
          </button>
        </div>
      </div>
    `;
  }
  
  attachListeners() {
    this.container.querySelector('#filter-type')?.addEventListener('change', (e) => {
      this.filters.chargerType = e.target.value;
      this.render();
    });
    this.container.querySelector('#filter-connector')?.addEventListener('change', (e) => {
      this.filters.connector = e.target.value;
      this.render();
    });
    this.container.querySelector('#filter-available')?.addEventListener('change', (e) => {
      this.filters.available = e.target.checked;
      this.render();
    });
    this.container.querySelector('#battery-slider')?.addEventListener('input', (e) => {
      this.currentBattery = parseInt(e.target.value, 10);
      this.container.querySelector('#battery-label').textContent = `${this.currentBattery}%`;
    });
    
    // Canvas click → select station
    this.canvas?.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      for (const station of this.filteredStations) {
        const p = this.geoToPixel(station.lat, station.lng);
        const dist = Math.hypot(x - p.x, y - p.y);
        if (dist < 20) {
          this.selectedStation = station;
          this.render();
          return;
        }
      }
    });
    
    // Station list click
    this.container.querySelectorAll('.station-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = parseInt(row.dataset.id, 10);
        this.selectedStation = this.stations.find(s => s.id === id);
        this.render();
      });
    });
  }
  
  /**
   * Simulate real-time availability updates.
   */
  startRealtimeUpdates() {
    this.wsInterval = setInterval(() => {
      const station = this.stations[Math.floor(Math.random() * this.stations.length)];
      // Random availability change
      const change = Math.random() > 0.5 ? 1 : -1;
      station.available = Math.max(0, Math.min(station.ports, station.available + change));
      station.waitTime = station.available === 0 ? Math.floor(Math.random() * 30) + 5 : 0;
      
      this.drawMap();
      
      // Update detail card if selected
      if (this.selectedStation?.id === station.id) {
        const detail = this.container.querySelector('#station-detail');
        if (detail) {
          detail.innerHTML = this.renderStationCard(station);
          detail.style.display = '';
        }
      }
    }, 5000);
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
  
  destroy() {
    if (this.wsInterval) clearInterval(this.wsInterval);
  }
}
```

---

## 🎯 Key Takeaways
- Ola FE = **EV charging station locator with route planner + real-time availability**
- **Route planner greedy**: drive until range < distance to next station + 20km buffer → charge to 80%
- **Point-to-line distance**: Heron's formula `area = √(s(s-a)(s-b)(s-c))` → `height = 2*area / base` — filter stations "along the route"
- **Haversine**: standard geo-distance — used for all distance calculations
- **Canvas map**: `geoToPixel` linear interpolation — green/red markers for available/unavailable
- **Charging time estimate**: DC fast ~0.6 min per %, Level 2 ~3 min per % — from battery level to 100%
- **Real-time simulation**: `setInterval` updating random station availability — mimics WebSocket pushes
- Ola = **EV + rides** — Ola Electric is a major focus, expect EV-related questions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Canvas Map, Route Planning, Geo |
| Technical | Hard | JS, React, Performance |
| HM | Medium | Culture Fit |
