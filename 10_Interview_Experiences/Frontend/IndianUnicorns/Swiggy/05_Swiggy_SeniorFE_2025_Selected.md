# Swiggy — Senior Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge: Delivery Agent Assignment Dashboard
- Map view showing delivery agents and orders
- Real-time position updates (WebSocket simulation)
- Order assignment: drag agent to order OR auto-assign button
- Agent status: available, on-delivery, offline
- Distance calculation between agent and restaurant
- Order queue with priority (prep time, distance)

```javascript
/**
 * Delivery Agent Assignment Dashboard:
 * - Canvas-based map with agents + orders
 * - Real-time position updates
 * - Auto-assign: nearest available agent → order
 * - Manual: click agent → click order to assign
 * - Status tracking: available → assigned → picked up → delivered
 */
class DeliveryDashboard {
  constructor(container) {
    this.container = container;
    this.agents = [];    // [{ id, name, lat, lng, status, orderId }]
    this.orders = [];    // [{ id, restaurant, customer, lat, lng, status, assignedAgent, prepTime }]
    this.selectedAgent = null;
    this.mapBounds = { minLat: 12.90, maxLat: 13.05, minLng: 77.55, maxLng: 77.70 };
    
    this.setup();
    this.startSimulation();
  }
  
  setup() {
    this.container.innerHTML = `
      <div class="dashboard" style="display:flex; height:100vh">
        <main class="map-area" style="flex:1; position:relative">
          <canvas id="map-canvas" style="width:100%; height:100%"></canvas>
          <div class="map-controls" style="position:absolute; top:10px; right:10px">
            <button id="auto-assign" class="btn-primary">Auto-Assign All</button>
          </div>
          <div class="stats-bar" style="position:absolute; bottom:0; left:0; right:0; padding:8px; background:rgba(255,255,255,0.95)">
            <span id="stat-available">Available: 0</span> |
            <span id="stat-pending">Pending Orders: 0</span> |
            <span id="stat-active">Active Deliveries: 0</span>
          </div>
        </main>
        <aside class="sidebar" style="width:350px; overflow:auto; border-left:1px solid #e5e7eb">
          <div class="tab-bar">
            <button class="tab active" data-tab="orders">Orders</button>
            <button class="tab" data-tab="agents">Agents</button>
          </div>
          <div id="sidebar-content"></div>
        </aside>
      </div>
    `;
    
    this.canvas = this.container.querySelector('#map-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.container.querySelector('#auto-assign').addEventListener('click', () => {
      this.autoAssignAll();
    });
    
    this.canvas.addEventListener('click', (e) => this.handleMapClick(e));
    
    this.container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderSidebar(tab.dataset.tab);
      });
    });
  }
  
  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.canvasW = rect.width;
    this.canvasH = rect.height;
    this.drawMap();
  }
  
  // Lat/lng to canvas pixel
  geoToPixel(lat, lng) {
    const { minLat, maxLat, minLng, maxLng } = this.mapBounds;
    const x = ((lng - minLng) / (maxLng - minLng)) * this.canvasW;
    const y = ((maxLat - lat) / (maxLat - minLat)) * this.canvasH; // Y inverted
    return { x, y };
  }
  
  // Haversine distance in km
  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  
  drawMap() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    
    // Background
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    
    // Grid lines (simulating streets)
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 20; i++) {
      const y = (this.canvasH / 20) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvasW, y); ctx.stroke();
      const x = (this.canvasW / 20) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvasH); ctx.stroke();
    }
    
    // Draw assignment lines (agent → order)
    for (const agent of this.agents) {
      if (agent.orderId) {
        const order = this.orders.find(o => o.id === agent.orderId);
        if (order) {
          const agentPos = this.geoToPixel(agent.lat, agent.lng);
          const orderPos = this.geoToPixel(order.lat, order.lng);
          
          ctx.beginPath();
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.moveTo(agentPos.x, agentPos.y);
          ctx.lineTo(orderPos.x, orderPos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    
    // Draw orders (orange circles for unassigned, green for assigned)
    for (const order of this.orders) {
      const { x, y } = this.geoToPixel(order.lat, order.lng);
      const isAssigned = order.status !== 'pending';
      
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = isAssigned ? '#22c55e' : '#f97316';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Order icon
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍔', x, y);
    }
    
    // Draw agents (blue markers for available, gray for busy)
    for (const agent of this.agents) {
      const { x, y } = this.geoToPixel(agent.lat, agent.lng);
      const isSelected = this.selectedAgent === agent.id;
      
      // Agent marker
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 14 : 10, 0, Math.PI * 2);
      ctx.fillStyle = agent.status === 'available' ? '#3b82f6' : 
                      agent.status === 'on-delivery' ? '#22c55e' : '#9ca3af';
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Agent icon
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛵', x, y);
    }
    
    this.updateStats();
  }
  
  /**
   * Auto-assign: greedy nearest-agent algorithm.
   * For each pending order (sorted by prep time — ready first):
   *   Find nearest available agent → assign.
   * 
   * Time: O(O × A) where O = orders, A = agents
   * Better: Hungarian algorithm for optimal matching (but overkill for interview)
   */
  autoAssignAll() {
    const pendingOrders = this.orders
      .filter(o => o.status === 'pending')
      .sort((a, b) => a.prepTime - b.prepTime); // Ready-first priority
    
    for (const order of pendingOrders) {
      const availableAgents = this.agents.filter(a => a.status === 'available');
      if (availableAgents.length === 0) break;
      
      // Find nearest agent
      let nearest = null;
      let minDist = Infinity;
      
      for (const agent of availableAgents) {
        const dist = this.haversineDistance(agent.lat, agent.lng, order.lat, order.lng);
        if (dist < minDist) {
          minDist = dist;
          nearest = agent;
        }
      }
      
      if (nearest) {
        this.assignOrder(nearest.id, order.id);
      }
    }
    
    this.drawMap();
    this.renderSidebar('orders');
  }
  
  assignOrder(agentId, orderId) {
    const agent = this.agents.find(a => a.id === agentId);
    const order = this.orders.find(o => o.id === orderId);
    
    if (agent && order) {
      agent.status = 'on-delivery';
      agent.orderId = orderId;
      order.status = 'assigned';
      order.assignedAgent = agentId;
    }
  }
  
  handleMapClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked on an agent
    for (const agent of this.agents) {
      const pos = this.geoToPixel(agent.lat, agent.lng);
      if (Math.hypot(pos.x - x, pos.y - y) < 15) {
        if (this.selectedAgent === agent.id) {
          this.selectedAgent = null;
        } else {
          this.selectedAgent = agent.id;
        }
        this.drawMap();
        return;
      }
    }
    
    // Check if clicked on an order (with agent selected)
    if (this.selectedAgent) {
      const agent = this.agents.find(a => a.id === this.selectedAgent);
      if (agent?.status !== 'available') {
        this.selectedAgent = null;
        this.drawMap();
        return;
      }
      
      for (const order of this.orders) {
        if (order.status !== 'pending') continue;
        const pos = this.geoToPixel(order.lat, order.lng);
        if (Math.hypot(pos.x - x, pos.y - y) < 15) {
          this.assignOrder(this.selectedAgent, order.id);
          this.selectedAgent = null;
          this.drawMap();
          this.renderSidebar('orders');
          return;
        }
      }
    }
    
    this.selectedAgent = null;
    this.drawMap();
  }
  
  updateStats() {
    const available = this.agents.filter(a => a.status === 'available').length;
    const pending = this.orders.filter(o => o.status === 'pending').length;
    const active = this.orders.filter(o => o.status === 'assigned').length;
    
    const el = (id) => this.container.querySelector(`#${id}`);
    if (el('stat-available')) el('stat-available').textContent = `Available: ${available}`;
    if (el('stat-pending')) el('stat-pending').textContent = `Pending: ${pending}`;
    if (el('stat-active')) el('stat-active').textContent = `Active: ${active}`;
  }
  
  renderSidebar(tab) {
    const content = this.container.querySelector('#sidebar-content');
    if (tab === 'orders') {
      content.innerHTML = this.orders.map(o => `
        <div class="order-card" data-id="${o.id}">
          <div class="order-header">
            <span class="order-id">#${o.id}</span>
            <span class="order-status status-${o.status}">${o.status}</span>
          </div>
          <div>🏪 ${this.sanitize(o.restaurant)}</div>
          <div>📍 ${this.sanitize(o.customer)}</div>
          <div>⏱️ Prep: ${o.prepTime}min</div>
          ${o.assignedAgent ? `<div>🛵 Agent: ${this.agents.find(a => a.id === o.assignedAgent)?.name || 'Unknown'}</div>` : ''}
        </div>
      `).join('');
    } else {
      content.innerHTML = this.agents.map(a => `
        <div class="agent-card ${this.selectedAgent === a.id ? 'selected' : ''}" data-id="${a.id}">
          <span class="agent-status status-${a.status}">●</span>
          <span>${this.sanitize(a.name)}</span>
          <span class="agent-type">${a.status}</span>
        </div>
      `).join('');
    }
  }
  
  startSimulation() {
    // Simulate agents and orders
    this.agents = Array.from({ length: 8 }, (_, i) => ({
      id: `agent_${i}`, name: `Agent ${i + 1}`,
      lat: 12.93 + Math.random() * 0.1,
      lng: 77.58 + Math.random() * 0.1,
      status: 'available', orderId: null
    }));
    
    this.orders = Array.from({ length: 5 }, (_, i) => ({
      id: `order_${i}`, restaurant: `Restaurant ${i + 1}`, customer: `Customer ${i + 1}`,
      lat: 12.93 + Math.random() * 0.1,
      lng: 77.58 + Math.random() * 0.1,
      status: 'pending', assignedAgent: null, prepTime: 10 + Math.floor(Math.random() * 20)
    }));
    
    this.drawMap();
    this.renderSidebar('orders');
    
    // Simulate real-time position updates
    setInterval(() => {
      for (const agent of this.agents) {
        if (agent.status === 'on-delivery') {
          // Move agent toward order location
          const order = this.orders.find(o => o.id === agent.orderId);
          if (order) {
            agent.lat += (order.lat - agent.lat) * 0.05;
            agent.lng += (order.lng - agent.lng) * 0.05;
          }
        }
      }
      this.drawMap();
    }, 1000);
  }
  
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Swiggy FE = **Delivery agent assignment dashboard — Canvas map + greedy nearest-agent algorithm**
- **Geo to pixel**: `x = (lng - minLng) / (maxLng - minLng) * width` — linear mapping for simple map
- **Haversine distance**: great-circle distance between two lat/lng points — standard geo formula
- **Greedy assignment**: sort orders by prep time (ready-first) → assign nearest available agent — O(O×A)
- **Click interaction**: check distance from click to each marker — `Math.hypot(dx, dy) < 15`
- **Assignment lines**: dashed line from agent to order — visual indicator of assignments
- **Real-time simulation**: setInterval every 1s — move agents toward assigned order (lerp: `agent.lat += (target - agent) * 0.05`)
- Swiggy FE = **logistics/delivery dashboard** — maps, real-time updates, assignment algorithms

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Very Hard | Canvas Map, Agent Assignment, Real-Time |
| Technical | Hard | React, Performance |
| HM | Medium | Culture Fit |
