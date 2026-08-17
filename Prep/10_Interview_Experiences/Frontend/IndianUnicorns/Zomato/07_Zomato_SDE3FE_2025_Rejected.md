# Zomato — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Gurgaon |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS + Machine Coding + FE Design + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Live Order Tracking Map

### Problem
Build a live order tracking component:
- Map view showing rider location (simulated with updates)
- Order status timeline (Placed → Confirmed → Preparing → Out for Delivery → Delivered)
- ETA countdown that updates dynamically
- Delivery address display with distance
- Rider info card
- Polling for status updates with exponential backoff

### 💡 Interview-Ready Answer

```javascript
class OrderTracker {
  constructor(container, orderId) {
    this.container = container;
    this.orderId = orderId;
    this.pollInterval = 3000;
    this.maxPollInterval = 30000;
    this.backoffMultiplier = 1.5;
    this.pollTimer = null;

    this.statusStages = [
      { key: 'placed', label: 'Order Placed', icon: '📋' },
      { key: 'confirmed', label: 'Confirmed', icon: '✅' },
      { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
      { key: 'delivered', label: 'Delivered', icon: '📦' }
    ];

    this.order = null;
    this.riderPath = [];

    this.init();
  }

  async init() {
    this.render();
    this.showLoading();
    await this.fetchOrder();
    this.startPolling();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'order-tracker';
    this.container.style.cssText = 'max-width:500px;margin:0 auto;font-family:system-ui;';
  }

  renderOrder() {
    this.container.innerHTML = '';

    this.renderMap();
    this.renderRiderCard();
    this.renderETA();
    this.renderTimeline();
    this.renderOrderDetails();
  }

  renderMap() {
    this.mapEl = document.createElement('div');
    this.mapEl.className = 'tracker-map';
    this.mapEl.style.cssText = 'height:250px;background:#e8f5e9;border-radius:12px;position:relative;overflow:hidden;';

    // Canvas for path + rider dot
    this.canvas = document.createElement('canvas');
    this.canvas.width = 500;
    this.canvas.height = 250;
    this.canvas.style.cssText = 'width:100%;height:100%;';
    this.mapEl.appendChild(this.canvas);

    // Restaurant marker
    const restaurant = document.createElement('div');
    restaurant.style.cssText = 'position:absolute;font-size:24px;';
    restaurant.textContent = '🍽️';
    restaurant.style.left = '10%';
    restaurant.style.top = '60%';
    this.mapEl.appendChild(restaurant);

    // Delivery address marker
    const destination = document.createElement('div');
    destination.style.cssText = 'position:absolute;font-size:24px;';
    destination.textContent = '🏠';
    destination.style.right = '10%';
    destination.style.top = '30%';
    this.mapEl.appendChild(destination);

    // Rider marker
    this.riderMarker = document.createElement('div');
    this.riderMarker.style.cssText = 'position:absolute;font-size:24px;transition:left 1s ease,top 1s ease;';
    this.riderMarker.textContent = '🛵';
    this.mapEl.appendChild(this.riderMarker);

    this.drawPath();
    this.container.appendChild(this.mapEl);
  }

  drawPath() {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, 500, 250);

    // Draw dashed route
    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2;
    ctx.moveTo(60, 165);
    ctx.quadraticCurveTo(250, 200, 430, 90);
    ctx.stroke();

    // Draw rider trail
    if (this.riderPath.length > 1) {
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = 3;
      ctx.moveTo(this.riderPath[0].x * 5, this.riderPath[0].y * 2.5);
      for (let i = 1; i < this.riderPath.length; i++) {
        ctx.lineTo(this.riderPath[i].x * 5, this.riderPath[i].y * 2.5);
      }
      ctx.stroke();
    }
  }

  renderRiderCard() {
    if (!this.order.rider) return;

    const card = document.createElement('div');
    card.className = 'rider-card';
    card.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;margin:12px 0;border:1px solid #eee;border-radius:12px;';

    card.innerHTML = `
      <div style="width:48px;height:48px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:24px;">🏍️</div>
      <div style="flex:1;">
        <div style="font-weight:600;">${this.escapeHtml(this.order.rider.name)}</div>
        <div style="font-size:13px;color:#666;">⭐ ${this.order.rider.rating} • ${this.order.rider.deliveries}+ deliveries</div>
      </div>
      <a href="tel:${this.order.rider.phone}" style="width:40px;height:40px;border-radius:50%;background:#0f8a0f;color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:18px;" aria-label="Call rider">📞</a>
    `;

    this.container.appendChild(card);
  }

  renderETA() {
    const etaEl = document.createElement('div');
    etaEl.className = 'eta-display';
    etaEl.style.cssText = 'text-align:center;padding:16px;background:#fff8e1;border-radius:12px;margin:12px 0;';

    const etaMinutes = this.order.etaMinutes;
    const stage = this.statusStages.find(s => s.key === this.order.status);

    if (this.order.status === 'delivered') {
      etaEl.innerHTML = `<div style="font-size:24px;">🎉</div><div style="font-weight:600;font-size:18px;">Delivered!</div>`;
    } else {
      etaEl.innerHTML = `
        <div style="font-size:13px;color:#666;">${stage?.label || 'Processing'}</div>
        <div style="font-weight:700;font-size:28px;">${etaMinutes} min</div>
        <div style="font-size:13px;color:#666;">Estimated delivery time</div>
      `;

      // Countdown
      this.startCountdown(etaEl, etaMinutes);
    }

    this.container.appendChild(etaEl);
  }

  startCountdown(el, minutes) {
    let seconds = minutes * 60;
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(this.countdownTimer);
        return;
      }
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      const display = el.querySelector('[data-countdown]');
      if (display) display.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }, 1000);

    // Add countdown sub-label
    const countdownEl = document.createElement('div');
    countdownEl.dataset.countdown = '';
    countdownEl.style.cssText = 'font-size:14px;color:#e65100;margin-top:4px;';
    countdownEl.textContent = `${minutes}:00`;
    el.appendChild(countdownEl);
  }

  renderTimeline() {
    const timeline = document.createElement('div');
    timeline.className = 'order-timeline';
    timeline.setAttribute('role', 'list');
    timeline.style.cssText = 'padding:16px 0;';

    const currentIdx = this.statusStages.findIndex(s => s.key === this.order.status);

    this.statusStages.forEach((stage, i) => {
      const step = document.createElement('div');
      step.setAttribute('role', 'listitem');
      const isDone = i <= currentIdx;
      const isCurrent = i === currentIdx;

      step.style.cssText = 'display:flex;align-items:flex-start;gap:12px;position:relative;';

      // Connector line + dot
      const indicator = document.createElement('div');
      indicator.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

      const dot = document.createElement('div');
      dot.style.cssText = `
        width:${isCurrent ? 20 : 16}px;height:${isCurrent ? 20 : 16}px;
        border-radius:50%;flex-shrink:0;
        background:${isDone ? '#0f8a0f' : '#ddd'};
        ${isCurrent ? 'box-shadow:0 0 0 4px rgba(15,138,15,0.2);' : ''}
        display:flex;align-items:center;justify-content:center;
        font-size:10px;color:#fff;
      `;
      dot.textContent = isDone ? '✓' : '';
      indicator.appendChild(dot);

      if (i < this.statusStages.length - 1) {
        const line = document.createElement('div');
        line.style.cssText = `width:2px;height:24px;background:${isDone ? '#0f8a0f' : '#ddd'};`;
        indicator.appendChild(line);
      }

      step.appendChild(indicator);

      // Label
      const label = document.createElement('div');
      label.style.cssText = `padding-bottom:16px;${isCurrent ? 'font-weight:600;' : ''}color:${isDone ? '#333' : '#999'};`;
      label.innerHTML = `
        <span>${stage.icon} ${stage.label}</span>
        ${this.order.timestamps?.[stage.key] ? `<div style="font-size:12px;color:#999;">${this.formatTime(this.order.timestamps[stage.key])}</div>` : ''}
      `;
      step.appendChild(label);

      timeline.appendChild(step);
    });

    this.container.appendChild(timeline);
  }

  renderOrderDetails() {
    const details = document.createElement('div');
    details.style.cssText = 'padding:12px;border:1px solid #eee;border-radius:12px;font-size:14px;';

    details.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px;">Order #${this.escapeHtml(this.orderId)}</div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;">
        <span>🏠 ${this.escapeHtml(this.order.deliveryAddress)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;">
        <span>📏 ${this.order.distance} km away</span>
      </div>
    `;

    this.container.appendChild(details);
  }

  // === Polling with Backoff ===

  startPolling() {
    this.currentPollInterval = this.pollInterval;
    this.poll();
  }

  async poll() {
    try {
      const changed = await this.fetchOrder();

      if (this.order.status === 'delivered') {
        this.stopPolling();
        return;
      }

      // Reset interval on data change, backoff if unchanged
      if (changed) {
        this.currentPollInterval = this.pollInterval;
      } else {
        this.currentPollInterval = Math.min(
          this.currentPollInterval * this.backoffMultiplier,
          this.maxPollInterval
        );
      }
    } catch (err) {
      this.currentPollInterval = Math.min(
        this.currentPollInterval * 2,
        this.maxPollInterval
      );
    }

    this.pollTimer = setTimeout(() => this.poll(), this.currentPollInterval);
  }

  stopPolling() {
    clearTimeout(this.pollTimer);
    clearInterval(this.countdownTimer);
  }

  async fetchOrder() {
    // Simulate API call
    const prevStatus = this.order?.status;

    this.order = this.simulateOrderData();

    if (this.order.riderLocation) {
      this.riderPath.push(this.order.riderLocation);
      if (this.riderMarker) {
        this.riderMarker.style.left = `${this.order.riderLocation.x}%`;
        this.riderMarker.style.top = `${this.order.riderLocation.y}%`;
      }
    }

    this.renderOrder();
    return this.order.status !== prevStatus;
  }

  simulateOrderData() {
    const elapsed = (Date.now() % 60000) / 1000;
    const stageIdx = Math.min(Math.floor(elapsed / 12), 4);
    const progress = (elapsed % 12) / 12;

    return {
      status: this.statusStages[stageIdx].key,
      etaMinutes: Math.max(1, Math.round(25 - elapsed / 2.4)),
      rider: { name: 'Raj Kumar', rating: 4.8, deliveries: 1250, phone: '+91XXXXXXXXXX' },
      deliveryAddress: '42, Koramangala 5th Block, Bangalore',
      distance: (3.2 - progress * 0.5).toFixed(1),
      riderLocation: { x: 15 + progress * 70, y: 65 - progress * 35 },
      timestamps: Object.fromEntries(
        this.statusStages.slice(0, stageIdx + 1).map((s, i) =>
          [s.key, new Date(Date.now() - (stageIdx - i) * 5 * 60000).toISOString()]
        )
      )
    };
  }

  showLoading() {
    const loader = document.createElement('div');
    loader.style.cssText = 'text-align:center;padding:40px;';
    loader.textContent = 'Loading order status...';
    this.container.appendChild(loader);
  }

  formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    this.stopPolling();
    this.container.innerHTML = '';
  }
}

// Usage:
// const tracker = new OrderTracker(document.getElementById('app'), 'ORD-2025-42');
// To cleanup: tracker.destroy();
```

## 🎯 Key Takeaways
- Zomato FE R2 variant — **real-time tracking UI** with polling, maps, and status
- **Exponential backoff polling**: reset on status change, double interval on errors
- Canvas for rider trail + CSS transitions for smooth marker movement
- Vertical timeline with dot indicators and timestamps per stage
- ETA countdown with `setInterval` — always clear on component destroy
- `destroy()` method to clean up timers — prevents memory leaks

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Fundamentals | Medium | Async/Await, Timers, AbortController |
| Machine Coding | Medium-Hard | Canvas, Polling, State Machine |
| FE System Design | Hard | Real-time Tracking Architecture |
| HM | Medium | Behavioral |
