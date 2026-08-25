# Goldman Sachs — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Senior Frontend Engineer |
| **Level** | VP |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + JS Coding + System Design + HM)
- **Timeline:** 3 weeks
- **Format:** On-site

## Round 2: Coding — Build an Interactive Financial Chart (Candlestick)

### Problem
Build a candlestick chart for stock price visualization:
- Draw OHLC (Open, High, Low, Close) candlesticks on canvas
- Green candle for bullish (close > open), red for bearish
- Horizontal panning (drag to scroll through time)
- Vertical zoom (mouse wheel to change price range)
- Crosshair cursor showing current price/date
- Volume bars below the main chart
- Responsive to container size

### 💡 Interview-Ready Answer

```javascript
class CandlestickChart {
  constructor(container, data) {
    this.container = container;
    this.data = data; // [{ date, open, high, low, close, volume }]
    this.visibleStart = Math.max(0, data.length - 60); // Show last 60 candles
    this.visibleCount = 60;
    this.isDragging = false;
    this.dragStartX = 0;
    this.crosshair = { x: 0, y: 0, visible: false };

    this.padding = { top: 20, right: 60, bottom: 80, left: 10 };
    this.volumeHeight = 60; // Height of volume section

    this.init();
  }

  init() {
    this.container.style.cssText = 'position:relative;user-select:none;';

    // Main canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;display:block;';
    this.container.appendChild(this.canvas);

    // Overlay canvas for crosshair (avoids redrawing chart)
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;pointer-events:none;';
    this.container.appendChild(this.overlayCanvas);

    // Info panel
    this.infoPanel = document.createElement('div');
    this.infoPanel.style.cssText = 'position:absolute;top:4px;left:4px;font-size:12px;font-family:monospace;color:#333;background:rgba(255,255,255,0.85);padding:4px 8px;border-radius:4px;display:none;';
    this.container.appendChild(this.infoPanel);

    this.setupEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = Math.max(400, rect.width * 0.5);

    [this.canvas, this.overlayCanvas].forEach(c => {
      c.width = this.width * dpr;
      c.height = this.height * dpr;
      c.style.height = this.height + 'px';
      c.getContext('2d').scale(dpr, dpr);
    });

    this.chartWidth = this.width - this.padding.left - this.padding.right;
    this.chartHeight = this.height - this.padding.top - this.padding.bottom - this.volumeHeight;

    this.draw();
  }

  setupEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartVisible = this.visibleStart;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const candleWidth = this.chartWidth / this.visibleCount;
        const shift = Math.round(dx / candleWidth);
        this.visibleStart = Math.max(0,
          Math.min(this.dragStartVisible - shift, this.data.length - this.visibleCount));
        this.draw();
      } else {
        const rect = this.canvas.getBoundingClientRect();
        this.crosshair = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          visible: true
        };
        this.drawOverlay();
      }
    });

    window.addEventListener('mouseup', () => { this.isDragging = false; });
    this.canvas.addEventListener('mouseleave', () => {
      this.crosshair.visible = false;
      this.drawOverlay();
      this.infoPanel.style.display = 'none';
    });

    // Zoom with mouse wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 5 : -5;
      const newCount = Math.max(20, Math.min(200, this.visibleCount + delta));
      // Keep center point stable
      const center = this.visibleStart + this.visibleCount / 2;
      this.visibleCount = newCount;
      this.visibleStart = Math.max(0,
        Math.min(Math.round(center - newCount / 2), this.data.length - newCount));
      this.draw();
    }, { passive: false });
  }

  draw() {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.width, this.height);

    const visible = this.data.slice(this.visibleStart, this.visibleStart + this.visibleCount);
    if (visible.length === 0) return;

    // Calculate price range
    this.priceMin = Math.min(...visible.map(d => d.low));
    this.priceMax = Math.max(...visible.map(d => d.high));
    const priceMargin = (this.priceMax - this.priceMin) * 0.05;
    this.priceMin -= priceMargin;
    this.priceMax += priceMargin;

    // Volume range
    this.volumeMax = Math.max(...visible.map(d => d.volume));

    this.drawGrid(ctx);
    this.drawCandles(ctx, visible);
    this.drawVolume(ctx, visible);
    this.drawPriceAxis(ctx);
    this.drawDateAxis(ctx, visible);
  }

  drawGrid(ctx) {
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;

    // Horizontal grid lines (price levels)
    const priceStep = this.niceStep(this.priceMax - this.priceMin, 6);
    const startPrice = Math.ceil(this.priceMin / priceStep) * priceStep;

    for (let price = startPrice; price <= this.priceMax; price += priceStep) {
      const y = this.priceToY(price);
      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(this.width - this.padding.right, y);
      ctx.stroke();
    }
  }

  drawCandles(ctx, visible) {
    const candleWidth = this.chartWidth / this.visibleCount;
    const bodyWidth = Math.max(1, candleWidth * 0.7);

    visible.forEach((d, i) => {
      const x = this.padding.left + (i + 0.5) * candleWidth;
      const isBullish = d.close >= d.open;
      const color = isBullish ? '#22c55e' : '#ef4444';

      const openY = this.priceToY(d.open);
      const closeY = this.priceToY(d.close);
      const highY = this.priceToY(d.high);
      const lowY = this.priceToY(d.low);

      // Wick (high-low line)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body (open-close rectangle)
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(openY - closeY));

      ctx.fillStyle = isBullish ? '#22c55e' : '#ef4444';
      if (isBullish) {
        // Hollow bullish candles (outline only)
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
      } else {
        ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
      }
    });
  }

  drawVolume(ctx, visible) {
    const candleWidth = this.chartWidth / this.visibleCount;
    const barWidth = candleWidth * 0.6;
    const volumeBase = this.height - this.padding.bottom;
    const volumeTop = volumeBase - this.volumeHeight;

    visible.forEach((d, i) => {
      const x = this.padding.left + (i + 0.5) * candleWidth;
      const barHeight = (d.volume / this.volumeMax) * this.volumeHeight;
      const isBullish = d.close >= d.open;

      ctx.fillStyle = isBullish ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
      ctx.fillRect(x - barWidth / 2, volumeBase - barHeight, barWidth, barHeight);
    });

    // Volume label
    ctx.fillStyle = '#999';
    ctx.font = '10px monospace';
    ctx.fillText('Vol', this.padding.left, volumeTop - 4);
  }

  drawPriceAxis(ctx) {
    ctx.fillStyle = '#333';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';

    const priceStep = this.niceStep(this.priceMax - this.priceMin, 6);
    const startPrice = Math.ceil(this.priceMin / priceStep) * priceStep;

    for (let price = startPrice; price <= this.priceMax; price += priceStep) {
      const y = this.priceToY(price);
      ctx.fillText(price.toFixed(2), this.width - this.padding.right + 4, y + 4);
    }
  }

  drawDateAxis(ctx, visible) {
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const step = Math.max(1, Math.floor(visible.length / 8));
    const y = this.height - this.padding.bottom + this.volumeHeight + 14;

    visible.forEach((d, i) => {
      if (i % step === 0) {
        const x = this.padding.left + (i + 0.5) * (this.chartWidth / this.visibleCount);
        const date = new Date(d.date);
        ctx.fillText(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), x, y);
      }
    });
  }

  drawOverlay() {
    const ctx = this.overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.width, this.height);

    if (!this.crosshair.visible) return;

    const { x, y } = this.crosshair;

    // Crosshair lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(this.padding.left, y);
    ctx.lineTo(this.width - this.padding.right, y);
    ctx.stroke();

    // Vertical
    ctx.beginPath();
    ctx.moveTo(x, this.padding.top);
    ctx.lineTo(x, this.height - this.padding.bottom);
    ctx.stroke();

    ctx.setLineDash([]);

    // Price label on axis
    const price = this.yToPrice(y);
    if (price >= this.priceMin && price <= this.priceMax) {
      ctx.fillStyle = '#333';
      ctx.fillRect(this.width - this.padding.right, y - 10, this.padding.right, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), this.width - this.padding.right + 4, y + 4);
    }

    // Show candle info
    const candleWidth = this.chartWidth / this.visibleCount;
    const idx = Math.floor((x - this.padding.left) / candleWidth);
    const dataIdx = this.visibleStart + idx;

    if (dataIdx >= 0 && dataIdx < this.data.length) {
      const d = this.data[dataIdx];
      this.infoPanel.style.display = 'block';
      this.infoPanel.innerHTML = `
        <span style="color:#666;">${new Date(d.date).toLocaleDateString()}</span>
        O: <b>${d.open.toFixed(2)}</b>
        H: <b style="color:#22c55e;">${d.high.toFixed(2)}</b>
        L: <b style="color:#ef4444;">${d.low.toFixed(2)}</b>
        C: <b>${d.close.toFixed(2)}</b>
        Vol: <b>${(d.volume / 1e6).toFixed(1)}M</b>
      `;
    }
  }

  priceToY(price) {
    const ratio = (price - this.priceMin) / (this.priceMax - this.priceMin);
    return this.padding.top + this.chartHeight * (1 - ratio);
  }

  yToPrice(y) {
    const ratio = 1 - (y - this.padding.top) / this.chartHeight;
    return this.priceMin + ratio * (this.priceMax - this.priceMin);
  }

  niceStep(range, targetSteps) {
    const rough = range / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const normalized = rough / magnitude;
    const nice = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
    return nice * magnitude;
  }
}

// Usage:
// const data = Array.from({ length: 200 }, (_, i) => {
//   const base = 1800 + Math.sin(i / 20) * 100 + Math.random() * 50;
//   const open = base + (Math.random() - 0.5) * 20;
//   const close = base + (Math.random() - 0.5) * 20;
//   return {
//     date: new Date(2024, 0, 1 + i).toISOString(),
//     open, close,
//     high: Math.max(open, close) + Math.random() * 15,
//     low: Math.min(open, close) - Math.random() * 15,
//     volume: Math.floor(Math.random() * 10e6)
//   };
// });
// new CandlestickChart(document.getElementById('app'), data);
```

## 🎯 Key Takeaways
- Goldman Sachs FE tests **financial visualization** — charts, dashboards, real-time data
- Dual canvas: main chart + overlay for crosshair (avoids full redraw on mouse move)
- `niceStep` function rounds grid intervals to human-friendly numbers (1, 2, 5, 10)
- DevicePixelRatio scaling for crisp rendering on Retina displays
- Panning via drag, zooming via mouse wheel — both keep data centered
- Bullish candles are hollow (stroke), bearish are filled — standard convention
- Volume bars below main chart with 30% opacity matching candle color

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Sorting |
| JS Coding | Hard | Canvas 2D, Math, Interactive Charts |
| System Design | Hard | Trading Dashboard Architecture |
| HM | Medium | Behavioral, Leadership |
