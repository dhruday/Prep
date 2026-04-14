# Netflix — Senior Frontend Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Studio Technology |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 3 Onsite)
- Netflix has no whiteboard DSA — only practical coding and system design

---

## Round 2: Practical Coding — Build a Video Timeline Editor Component
**Duration:** 90 minutes

### Challenge: Build a video timeline editor where users can scrub, add markers, select regions, and see frame-accurate timestamps.

```javascript
/**
 * Video Timeline Editor:
 * - Horizontal timeline bar representing video duration
 * - Scrubber / playhead that follows playback or can be dragged
 * - Click anywhere on timeline to seek
 * - Add markers (named bookmarks) at current position
 * - Select a region (in/out points) for clip extraction
 * - Frame-accurate time display (HH:MM:SS:FF at 24fps)
 * - Zoom into a section of the timeline
 */
class TimelineEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.duration = options.duration || 3600; // seconds
    this.fps = options.fps || 24;
    this.onSeek = options.onSeek || (() => {});
    this.onRegionChange = options.onRegionChange || (() => {});
    
    this.currentTime = 0;
    this.markers = []; // [{ time, label, color }]
    this.region = null; // { inPoint, outPoint } or null
    this.zoom = { start: 0, end: this.duration }; // visible time range
    this.isDragging = false;
    this.isSelectingRegion = false;
    
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 80;
    
    this.render();
  }
  
  /**
   * Convert time (seconds) to pixel position within the visible zoom range.
   */
  timeToPixel(time) {
    const visibleDuration = this.zoom.end - this.zoom.start;
    return ((time - this.zoom.start) / visibleDuration) * this.width;
  }
  
  /**
   * Convert pixel position to time.
   */
  pixelToTime(pixel) {
    const visibleDuration = this.zoom.end - this.zoom.start;
    return this.zoom.start + (pixel / this.width) * visibleDuration;
  }
  
  /**
   * Format time as HH:MM:SS:FF (timecode).
   * FF = frame number within the current second.
   */
  formatTimecode(seconds) {
    const totalFrames = Math.floor(seconds * this.fps);
    const frames = totalFrames % this.fps;
    const totalSecs = Math.floor(seconds);
    const ss = totalSecs % 60;
    const mm = Math.floor(totalSecs / 60) % 60;
    const hh = Math.floor(totalSecs / 3600);
    
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  }
  
  setCurrentTime(time) {
    this.currentTime = Math.max(0, Math.min(this.duration, time));
    this.drawTimeline();
  }
  
  addMarker(label, color = '#f59e0b') {
    this.markers.push({ time: this.currentTime, label, color });
    this.markers.sort((a, b) => a.time - b.time);
    this.drawTimeline();
  }
  
  removeMarker(index) {
    this.markers.splice(index, 1);
    this.drawTimeline();
  }
  
  setRegion(inPoint, outPoint) {
    this.region = inPoint != null ? { inPoint, outPoint: outPoint ?? inPoint } : null;
    this.drawTimeline();
    if (this.region) {
      this.onRegionChange(this.region);
    }
  }
  
  zoomTo(start, end) {
    this.zoom = {
      start: Math.max(0, start),
      end: Math.min(this.duration, end)
    };
    this.drawTimeline();
  }
  
  zoomIn() {
    const center = (this.zoom.start + this.zoom.end) / 2;
    const halfRange = (this.zoom.end - this.zoom.start) / 4;
    this.zoomTo(center - halfRange, center + halfRange);
  }
  
  zoomOut() {
    const center = (this.zoom.start + this.zoom.end) / 2;
    const halfRange = (this.zoom.end - this.zoom.start);
    this.zoomTo(center - halfRange, center + halfRange);
  }
  
  render() {
    this.container.innerHTML = `
      <div class="timeline-editor" style="font-family:-apple-system,sans-serif; user-select:none">
        
        <!-- Controls bar -->
        <div style="display:flex; align-items:center; gap:12px; padding:8px; background:#1a1a2e; color:#fff; border-radius:8px 8px 0 0">
          <button id="btn-marker" style="padding:4px 12px; background:#f59e0b; color:#000; border:none; border-radius:4px; cursor:pointer; font-size:12px">
            + Marker
          </button>
          <button id="btn-in" style="padding:4px 12px; background:#3b82f6; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px">
            Set In [I]
          </button>
          <button id="btn-out" style="padding:4px 12px; background:#3b82f6; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px">
            Set Out [O]
          </button>
          <button id="btn-clear-region" style="padding:4px 12px; background:#6b7280; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px">
            Clear Region
          </button>
          <div style="flex:1"></div>
          <button id="btn-zoom-in" style="background:none; border:1px solid #555; color:#fff; padding:2px 8px; cursor:pointer; border-radius:4px">+</button>
          <button id="btn-zoom-out" style="background:none; border:1px solid #555; color:#fff; padding:2px 8px; cursor:pointer; border-radius:4px">−</button>
          <button id="btn-zoom-fit" style="background:none; border:1px solid #555; color:#fff; padding:2px 8px; cursor:pointer; border-radius:4px; font-size:11px">Fit</button>
        </div>
        
        <!-- Timeline Canvas -->
        <canvas id="timeline-canvas" style="width:100%; height:${this.height}px; display:block; background:#0f0f23; cursor:crosshair"></canvas>
        
        <!-- Timecode display -->
        <div style="display:flex; justify-content:space-between; padding:8px; background:#1a1a2e; color:#fff; border-radius:0 0 8px 8px; font-family:monospace; font-size:13px">
          <span>Current: <strong id="tc-current">${this.formatTimecode(this.currentTime)}</strong></span>
          ${this.region ? `
            <span>Region: ${this.formatTimecode(this.region.inPoint)} → ${this.formatTimecode(this.region.outPoint)} 
                  (${this.formatTimecode(this.region.outPoint - this.region.inPoint)})</span>
          ` : '<span>No region selected</span>'}
          <span>Duration: ${this.formatTimecode(this.duration)}</span>
        </div>
        
        <!-- Markers list -->
        ${this.markers.length > 0 ? `
          <div style="padding:8px; font-size:12px; max-height:80px; overflow-y:auto">
            ${this.markers.map((m, i) => `
              <div style="display:flex; align-items:center; gap:6px; padding:2px 0">
                <span style="width:8px; height:8px; border-radius:50%; background:${m.color}; display:inline-block"></span>
                <span style="flex:1; cursor:pointer" class="marker-label" data-time="${m.time}">
                  ${this.formatTimecode(m.time)} — ${this.sanitize(m.label)}
                </span>
                <button class="marker-remove" data-index="${i}" style="background:none; border:none; color:#ef4444; cursor:pointer">×</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    this.setupCanvas();
    this.drawTimeline();
    this.attachListeners();
  }
  
  setupCanvas() {
    this.canvas = this.container.querySelector('#timeline-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }
  
  drawTimeline() {
    const ctx = this.ctx;
    if (!ctx) return;
    
    ctx.clearRect(0, 0, this.width, this.height);
    
    // Background
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Region highlight
    if (this.region) {
      const inX = this.timeToPixel(this.region.inPoint);
      const outX = this.timeToPixel(this.region.outPoint);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(inX, 0, outX - inX, this.height);
      
      // Region edges
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(inX, 0); ctx.lineTo(inX, this.height);
      ctx.moveTo(outX, 0); ctx.lineTo(outX, this.height);
      ctx.stroke();
    }
    
    // Time ticks
    const visibleDuration = this.zoom.end - this.zoom.start;
    const tickInterval = this.calculateTickInterval(visibleDuration);
    const startTick = Math.ceil(this.zoom.start / tickInterval) * tickInterval;
    
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;
    
    for (let t = startTick; t <= this.zoom.end; t += tickInterval) {
      const x = this.timeToPixel(t);
      
      // Major tick
      ctx.beginPath();
      ctx.moveTo(x, this.height - 20);
      ctx.lineTo(x, this.height);
      ctx.stroke();
      
      // Label
      ctx.fillText(this.formatTimecode(t).slice(0, 8), x, this.height - 24);
      
      // Minor ticks
      for (let m = 1; m < 5; m++) {
        const minorT = t + (tickInterval / 5) * m;
        if (minorT > this.zoom.end) break;
        const mx = this.timeToPixel(minorT);
        ctx.beginPath();
        ctx.moveTo(mx, this.height - 8);
        ctx.lineTo(mx, this.height);
        ctx.stroke();
      }
    }
    
    // Markers
    for (const marker of this.markers) {
      if (marker.time < this.zoom.start || marker.time > this.zoom.end) continue;
      const x = this.timeToPixel(marker.time);
      
      ctx.strokeStyle = marker.color;
      ctx.setLineDash([4, 2]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Marker triangle
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.moveTo(x - 5, 0);
      ctx.lineTo(x + 5, 0);
      ctx.lineTo(x, 8);
      ctx.closePath();
      ctx.fill();
    }
    
    // Playhead
    const playX = this.timeToPixel(this.currentTime);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, this.height);
    ctx.stroke();
    
    // Playhead triangle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(playX - 6, 0);
    ctx.lineTo(playX + 6, 0);
    ctx.lineTo(playX, 10);
    ctx.closePath();
    ctx.fill();
    
    // Update timecode display
    const tcEl = this.container.querySelector('#tc-current');
    if (tcEl) tcEl.textContent = this.formatTimecode(this.currentTime);
  }
  
  calculateTickInterval(visibleDuration) {
    // Choose tick interval based on zoom level
    const intervals = [1/this.fps, 1, 5, 10, 30, 60, 300, 600, 1800, 3600];
    const targetTicks = this.width / 100; // ~1 tick per 100px
    
    for (const interval of intervals) {
      if (visibleDuration / interval <= targetTicks) return interval;
    }
    return intervals[intervals.length - 1];
  }
  
  attachListeners() {
    // Canvas interaction
    this.canvas?.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = this.pixelToTime(x);
      
      if (e.altKey) {
        // Alt+click starts region selection
        this.isSelectingRegion = true;
        this.setRegion(time, time);
      } else {
        this.isDragging = true;
        this.setCurrentTime(time);
        this.onSeek(this.currentTime);
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging && !this.isSelectingRegion) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min(this.duration, this.pixelToTime(x)));
      
      if (this.isDragging) {
        this.setCurrentTime(time);
        this.onSeek(this.currentTime);
      } else if (this.isSelectingRegion && this.region) {
        this.region.outPoint = Math.max(this.region.inPoint, time);
        this.drawTimeline();
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isSelectingRegion && this.region) {
        this.onRegionChange(this.region);
      }
      this.isDragging = false;
      this.isSelectingRegion = false;
    });
    
    // Zoom with scroll wheel
    this.canvas?.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseTime = this.pixelToTime(e.clientX - rect.left);
      
      const factor = e.deltaY > 0 ? 1.2 : 0.8; // zoom out/in
      const newDuration = (this.zoom.end - this.zoom.start) * factor;
      
      // Zoom centered on mouse position
      const ratio = (mouseTime - this.zoom.start) / (this.zoom.end - this.zoom.start);
      const newStart = mouseTime - ratio * newDuration;
      const newEnd = newStart + newDuration;
      
      this.zoomTo(newStart, newEnd);
    }, { passive: false });
    
    // Keyboard shortcuts
    this.container.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'i': case 'I':
          this.setRegion(this.currentTime, this.region?.outPoint ?? this.currentTime);
          break;
        case 'o': case 'O':
          if (this.region) this.setRegion(this.region.inPoint, this.currentTime);
          break;
        case 'm': case 'M':
          this.addMarker(`Marker ${this.markers.length + 1}`);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.setCurrentTime(this.currentTime - (e.shiftKey ? 1 : 1 / this.fps));
          this.onSeek(this.currentTime);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.setCurrentTime(this.currentTime + (e.shiftKey ? 1 : 1 / this.fps));
          this.onSeek(this.currentTime);
          break;
      }
    });
    
    // Buttons
    this.container.querySelector('#btn-marker')?.addEventListener('click', () => {
      const label = prompt('Marker label:') || `Marker ${this.markers.length + 1}`;
      this.addMarker(label);
    });
    
    this.container.querySelector('#btn-in')?.addEventListener('click', () => {
      this.setRegion(this.currentTime, this.region?.outPoint ?? this.currentTime);
    });
    
    this.container.querySelector('#btn-out')?.addEventListener('click', () => {
      if (this.region) this.setRegion(this.region.inPoint, this.currentTime);
    });
    
    this.container.querySelector('#btn-clear-region')?.addEventListener('click', () => {
      this.setRegion(null);
      this.render();
    });
    
    this.container.querySelector('#btn-zoom-in')?.addEventListener('click', () => this.zoomIn());
    this.container.querySelector('#btn-zoom-out')?.addEventListener('click', () => this.zoomOut());
    this.container.querySelector('#btn-zoom-fit')?.addEventListener('click', () => this.zoomTo(0, this.duration));
    
    // Marker click to seek
    this.container.querySelectorAll('.marker-label').forEach(label => {
      label.addEventListener('click', () => {
        this.setCurrentTime(parseFloat(label.dataset.time));
        this.onSeek(this.currentTime);
      });
    });
    
    this.container.querySelectorAll('.marker-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeMarker(parseInt(btn.dataset.index, 10));
        this.render();
      });
    });
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
- Netflix FE = **Video timeline editor with scrubber, markers, regions, zoom** — no leetcode, all practical
- **Timecode**: `HH:MM:SS:FF` format — frame = `floor(seconds * fps) % fps` — standard in video editing
- **Zoom**: `timeToPixel` / `pixelToTime` relative to `zoom.start..zoom.end` — mouse wheel zoom centered on cursor
- **tick interval selection**: based on zoom level — 1 frame at closest zoom → 1 hour at widest
- **Region selection**: Alt+click starts, drag extends outPoint — in/out keyboard shortcuts I/O
- **Frame-accurate stepping**: Arrow keys = ±1/fps seconds, Shift+Arrow = ±1 second
- **Canvas-based timeline**: markers as dashed lines + triangles, playhead as solid red line
- Netflix Studio = **content creation tools** — timeline editors, QC tools, asset management

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | System Design Discussion |
| Practical Coding | Very Hard | Timeline Editor, Canvas, Video |
| System Design | Very Hard | Netflix Studio Infrastructure |
| Culture Fit | Hard | Netflix Culture Deck Values |
