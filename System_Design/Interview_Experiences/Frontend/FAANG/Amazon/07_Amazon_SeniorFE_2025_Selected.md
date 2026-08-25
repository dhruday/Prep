# Amazon — Senior Frontend Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Senior Frontend Engineer |
| **Level** | L6 |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Seattle, WA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Amazon Ads Console |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 4 Loop: 2 Coding/FE + System Design + Bar Raiser)

---

## Round 1: Machine Coding — Campaign Performance Dashboard
**Duration:** 60 minutes

### Challenge: Build an Ad Campaign Dashboard with:
- Real-time metrics updates (impressions, clicks, spend, CTR)
- Interactive chart component (Canvas-based line chart)
- Date range picker with campaign comparison
- Data table with sorting and CSV export

```javascript
/**
 * Canvas-Based Line Chart Component:
 * - Multiple datasets (compare campaigns)
 * - Interactive: hover to see values, click to pin tooltip
 * - Responsive: resize with ResizeObserver
 * - Performance: Canvas for 10K+ data points
 * - Accessibility: screen reader announces chart summary
 */
class LineChart {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.datasets = [];          // [{ label, data: [{x: Date, y: Number}], color }]
    this.padding = { top: 20, right: 30, bottom: 50, left: 70 };
    this.tooltip = null;
    this.pinnedTooltip = null;
    this.hoveredPoint = null;
    this.yAxisLabel = options.yAxisLabel || '';
    this.formatY = options.formatY || (v => v.toLocaleString());
    
    this.setupInteraction();
    this.setupResizeObserver();
  }
  
  setData(datasets) {
    this.datasets = datasets;
    this.computeScales();
    this.draw();
    this.updateAccessibility();
  }
  
  computeScales() {
    if (this.datasets.length === 0) return;
    
    const allPoints = this.datasets.flatMap(d => d.data);
    
    this.xMin = Math.min(...allPoints.map(p => p.x.getTime()));
    this.xMax = Math.max(...allPoints.map(p => p.x.getTime()));
    this.yMin = 0;
    this.yMax = Math.max(...allPoints.map(p => p.y)) * 1.1; // 10% headroom
    
    const area = this.getPlotArea();
    this.scaleX = (t) => area.x + ((t - this.xMin) / (this.xMax - this.xMin)) * area.width;
    this.scaleY = (v) => area.y + area.height - ((v - this.yMin) / (this.yMax - this.yMin)) * area.height;
  }
  
  getPlotArea() {
    return {
      x: this.padding.left,
      y: this.padding.top,
      width: this.canvas.width - this.padding.left - this.padding.right,
      height: this.canvas.height - this.padding.top - this.padding.bottom
    };
  }
  
  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    this.drawGrid();
    this.drawAxes();
    
    // Draw each dataset
    for (const dataset of this.datasets) {
      this.drawLine(dataset);
    }
    
    // Draw hover indicator
    if (this.hoveredPoint) {
      const { x, y, dataset, point } = this.hoveredPoint;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = dataset.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    this.drawLegend();
    this.drawTooltip();
  }
  
  drawLine(dataset) {
    const { ctx } = this;
    if (dataset.data.length === 0) return;
    
    ctx.beginPath();
    ctx.strokeStyle = dataset.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    
    dataset.data.forEach((point, i) => {
      const x = this.scaleX(point.x.getTime());
      const y = this.scaleY(point.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
    
    // Area fill (gradient)
    const area = this.getPlotArea();
    const gradient = ctx.createLinearGradient(0, area.y, 0, area.y + area.height);
    gradient.addColorStop(0, dataset.color + '33'); // 20% opacity
    gradient.addColorStop(1, dataset.color + '00'); // 0% opacity
    
    ctx.lineTo(this.scaleX(dataset.data[dataset.data.length - 1].x.getTime()), area.y + area.height);
    ctx.lineTo(this.scaleX(dataset.data[0].x.getTime()), area.y + area.height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  
  drawGrid() {
    const { ctx } = this;
    const area = this.getPlotArea();
    const gridLines = 5;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= gridLines; i++) {
      const y = area.y + (area.height / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.width, y);
      ctx.stroke();
    }
  }
  
  drawAxes() {
    const { ctx } = this;
    const area = this.getPlotArea();
    
    // Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const value = this.yMin + ((this.yMax - this.yMin) / 5) * (5 - i);
      const y = area.y + (area.height / 5) * i;
      ctx.fillText(this.formatY(value), area.x - 10, y + 4);
    }
    
    // X-axis labels (dates)
    ctx.textAlign = 'center';
    const tickCount = Math.min(7, this.datasets[0]?.data.length || 0);
    const step = Math.max(1, Math.floor((this.datasets[0]?.data.length || 1) / tickCount));
    
    const data = this.datasets[0]?.data || [];
    for (let i = 0; i < data.length; i += step) {
      const x = this.scaleX(data[i].x.getTime());
      const label = data[i].x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, area.y + area.height + 20);
    }
  }
  
  drawLegend() {
    const { ctx } = this;
    let x = this.padding.left;
    const y = this.canvas.height - 10;
    
    ctx.font = '12px sans-serif';
    
    for (const dataset of this.datasets) {
      ctx.fillStyle = dataset.color;
      ctx.fillRect(x, y - 8, 12, 12);
      x += 16;
      ctx.fillStyle = '#374151';
      ctx.fillText(dataset.label, x, y + 2);
      x += ctx.measureText(dataset.label).width + 20;
    }
  }
  
  drawTooltip() {
    if (!this.hoveredPoint) return;
    
    const { ctx } = this;
    const { x, y, dataset, point } = this.hoveredPoint;
    
    const label = `${dataset.label}: ${this.formatY(point.y)}`;
    const date = point.x.toLocaleDateString();
    const text = `${date}\n${label}`;
    
    ctx.font = '12px sans-serif';
    const width = Math.max(ctx.measureText(date).width, ctx.measureText(label).width) + 16;
    const height = 44;
    const tx = Math.min(x + 10, this.canvas.width - width - 5);
    const ty = Math.max(y - height - 10, 5);
    
    // Tooltip background
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.roundRect(tx, ty, width, height, 4);
    ctx.fill();
    
    // Tooltip text
    ctx.fillStyle = '#fff';
    ctx.fillText(date, tx + 8, ty + 16);
    ctx.fillStyle = dataset.color;
    ctx.fillText(label, tx + 8, ty + 34);
  }
  
  setupInteraction() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      
      this.hoveredPoint = this.findNearestPoint(mx, my);
      this.draw();
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredPoint = null;
      this.draw();
    });
  }
  
  findNearestPoint(mx, my) {
    let nearest = null;
    let minDist = 20; // Max hover distance in px
    
    for (const dataset of this.datasets) {
      for (const point of dataset.data) {
        const px = this.scaleX(point.x.getTime());
        const py = this.scaleY(point.y);
        const dist = Math.hypot(px - mx, py - my);
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: px, y: py, dataset, point };
        }
      }
    }
    
    return nearest;
  }
  
  setupResizeObserver() {
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      this.canvas.width = width * window.devicePixelRatio;
      this.canvas.height = height * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      this.computeScales();
      this.draw();
    });
    observer.observe(this.canvas.parentElement);
  }
  
  updateAccessibility() {
    // Screen reader summary
    const summary = this.datasets.map(d => {
      const values = d.data.map(p => p.y);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      return `${d.label}: min ${this.formatY(min)}, max ${this.formatY(max)}, avg ${this.formatY(avg)}`;
    }).join('. ');
    
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', `Line chart. ${summary}`);
  }
}
```

---

## 🎯 Key Takeaways
- Amazon L6 FE = **Canvas-based interactive chart + dashboard machine coding**
- **Canvas for performance**: 10K+ data points — DOM-based SVG would be too slow
- **Coordinate scaling**: `scaleX = plotWidth * (value - min) / (max - min)` — map data to pixel space
- **Area gradient**: `createLinearGradient` + addColorStop with alpha — subtle fill under line
- **Tooltip**: find nearest point within 20px radius — `Math.hypot` for distance
- **devicePixelRatio**: multiply canvas dimensions for HiDPI screens — prevents blurry rendering
- **ResizeObserver**: responsive canvas — resize canvas.width/height on container resize, recompute scales
- **Accessibility**: `aria-label` with chart summary (min, max, avg per dataset) — Canvas is opaque to screen readers
- Amazon FE = **data visualization + LP stories** — show Customer Obsession with dashboards users love

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Very Hard | Canvas Charts, Dashboard |
| Technical | Hard | React, Performance |
| System Design | Hard | FE Architecture |
| Bar Raiser | Hard | LP Deep Dive |
