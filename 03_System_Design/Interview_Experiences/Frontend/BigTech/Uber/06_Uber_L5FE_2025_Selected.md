# Uber — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Senior Frontend Engineer |
| **Level** | L5a |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Amsterdam, Netherlands |
| **Source** | [Blind](https://www.teamblind.com/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone + 2 Coding + System Design)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 1: Coding — Build a Real-Time Map Pin Marker Component
**Duration:** 45 minutes

### Problem
Build a map-like component showing pins on a 2D canvas:
- Add/remove/update pin positions
- Click a pin to select (show tooltip)
- Cluster nearby pins at zoom-out levels
- Smooth animation when pins move (driver tracking)

### 💡 Interview-Ready Answer

```javascript
class MapPinOverlay {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;

    this.pins = new Map();        // id -> { x, y, label, type, targetX, targetY }
    this.clusters = [];
    this.selectedPin = null;
    this.tooltip = null;
    this.clusterRadius = options.clusterRadius || 50;
    this.animating = false;

    this.onClick = options.onClick || (() => {});
    this.onPinSelect = options.onPinSelect || (() => {});

    this._setupEvents();
    this._createTooltip();
  }

  _setupEvents() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const pin = this._findPinAt(x, y);
      if (pin) {
        this.selectedPin = pin;
        this._showTooltip(pin, e.clientX, e.clientY);
        this.onPinSelect(pin);
      } else {
        this.selectedPin = null;
        this._hideTooltip();
        this.onClick({ x, y });
      }
      this._draw();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pin = this._findPinAt(x, y);
      this.canvas.style.cursor = pin ? 'pointer' : 'default';
    });
  }

  _createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
      position:fixed;background:#333;color:#fff;padding:6px 10px;
      border-radius:4px;font-size:12px;pointer-events:none;
      display:none;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.2);
      max-width:200px;
    `;
    document.body.appendChild(this.tooltip);
  }

  _showTooltip(pin, clientX, clientY) {
    this.tooltip.textContent = pin.label || `Pin ${pin.id}`;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${clientX + 10}px`;
    this.tooltip.style.top = `${clientY - 30}px`;
  }

  _hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  // === Pin Management ===

  addPin(id, x, y, options = {}) {
    this.pins.set(id, {
      id,
      x, y,
      targetX: x, targetY: y,
      label: options.label || '',
      type: options.type || 'default', // driver, rider, destination
      color: options.color || this._typeColor(options.type || 'default'),
      size: options.size || 8,
    });
    this._clusterAndDraw();
    return this;
  }

  removePin(id) {
    this.pins.delete(id);
    if (this.selectedPin && this.selectedPin.id === id) {
      this.selectedPin = null;
      this._hideTooltip();
    }
    this._clusterAndDraw();
    return this;
  }

  /**
   * Smoothly animate a pin to a new position.
   * Used for real-time driver tracking.
   */
  updatePinPosition(id, newX, newY) {
    const pin = this.pins.get(id);
    if (!pin) return;

    pin.targetX = newX;
    pin.targetY = newY;

    if (!this.animating) {
      this._animateFrame();
    }
  }

  _animateFrame() {
    const LERP_SPEED = 0.1; // 10% per frame
    let needsMore = false;

    for (const pin of this.pins.values()) {
      const dx = pin.targetX - pin.x;
      const dy = pin.targetY - pin.y;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        pin.x += dx * LERP_SPEED;
        pin.y += dy * LERP_SPEED;
        needsMore = true;
      } else {
        pin.x = pin.targetX;
        pin.y = pin.targetY;
      }
    }

    this._clusterAndDraw();

    if (needsMore) {
      this.animating = true;
      requestAnimationFrame(() => this._animateFrame());
    } else {
      this.animating = false;
    }
  }

  // === Clustering ===

  /**
   * Simple grid-based clustering.
   * Group nearby pins into clusters to avoid visual clutter.
   */
  _clusterPins() {
    const radius = this.clusterRadius;
    const pinArray = [...this.pins.values()];
    const used = new Set();
    this.clusters = [];

    for (let i = 0; i < pinArray.length; i++) {
      if (used.has(pinArray[i].id)) continue;

      const cluster = { pins: [pinArray[i]], x: pinArray[i].x, y: pinArray[i].y };
      used.add(pinArray[i].id);

      for (let j = i + 1; j < pinArray.length; j++) {
        if (used.has(pinArray[j].id)) continue;

        const dist = Math.hypot(pinArray[j].x - cluster.x, pinArray[j].y - cluster.y);
        if (dist <= radius) {
          cluster.pins.push(pinArray[j]);
          used.add(pinArray[j].id);
        }
      }

      // Recalculate cluster center
      if (cluster.pins.length > 1) {
        cluster.x = cluster.pins.reduce((s, p) => s + p.x, 0) / cluster.pins.length;
        cluster.y = cluster.pins.reduce((s, p) => s + p.y, 0) / cluster.pins.length;
      }

      this.clusters.push(cluster);
    }
  }

  _clusterAndDraw() {
    this._clusterPins();
    this._draw();
  }

  // === Drawing ===

  _draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw grid (map background)
    this._drawGrid();

    // Draw clusters and individual pins
    for (const cluster of this.clusters) {
      if (cluster.pins.length > 1) {
        this._drawCluster(cluster);
      } else {
        this._drawPin(cluster.pins[0]);
      }
    }

    // Draw selected pin highlight
    if (this.selectedPin) {
      this._drawSelectedHighlight(this.selectedPin);
    }
  }

  _drawGrid() {
    this.ctx.strokeStyle = '#f0f0f0';
    this.ctx.lineWidth = 0.5;
    for (let x = 0; x < this.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  _drawPin(pin) {
    const ctx = this.ctx;
    const { x, y, color, size } = pin;

    // Pin shape (teardrop)
    ctx.beginPath();
    ctx.arc(x, y - size, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pin point
    ctx.beginPath();
    ctx.moveTo(x - size * 0.6, y - size * 0.3);
    ctx.lineTo(x, y + size * 0.5);
    ctx.lineTo(x + size * 0.6, y - size * 0.3);
    ctx.fillStyle = color;
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y - size, size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  _drawCluster(cluster) {
    const ctx = this.ctx;
    const r = 18 + cluster.pins.length * 2;

    ctx.beginPath();
    ctx.arc(cluster.x, cluster.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(66, 133, 244, 0.7)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Count text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(cluster.pins.length), cluster.x, cluster.y);
  }

  _drawSelectedHighlight(pin) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(pin.x, pin.y - pin.size, pin.size + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#4285F4';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  _findPinAt(x, y) {
    const HIT_RADIUS = 15;
    for (const pin of this.pins.values()) {
      const dist = Math.hypot(x - pin.x, y - (pin.y - pin.size));
      if (dist <= HIT_RADIUS) return pin;
    }
    return null;
  }

  _typeColor(type) {
    const colors = {
      driver: '#34A853',
      rider: '#4285F4',
      destination: '#EA4335',
      default: '#666',
    };
    return colors[type] || colors.default;
  }

  destroy() {
    this.tooltip.remove();
    this.canvas.removeEventListener('click', this._onClick);
  }
}

// === Usage ===
/*
const canvas = document.getElementById('map');
canvas.width = 800;
canvas.height = 600;

const map = new MapPinOverlay(canvas, {
  clusterRadius: 40,
  onPinSelect: (pin) => console.log('Selected:', pin)
});

map.addPin('driver1', 200, 300, { label: 'Driver A', type: 'driver' })
   .addPin('driver2', 220, 310, { label: 'Driver B', type: 'driver' })
   .addPin('rider1', 500, 400, { label: 'You', type: 'rider' })
   .addPin('dest', 600, 200, { label: 'Office', type: 'destination' });

// Simulate driver movement
setInterval(() => {
  const d = map.pins.get('driver1');
  if (d) map.updatePinPosition('driver1', d.targetX + 2, d.targetY - 1);
}, 1000);
*/
```

## 🎯 Key Takeaways
- Uber FE asks **map/canvas** components — directly used in their rider/driver apps
- Canvas 2D rendering for performant map overlays (hundreds of pins)
- **LERP animation** (linear interpolation) for smooth pin movement
- Clustering prevents visual clutter — grid-based is simplest approach
- Hit testing: check distance from click point to each pin center

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Canvas 2D, Animation, Clustering |
| System Design | Hard | Uber Real-Time Tracking |
| Behavioral | Medium | Uber Values |
