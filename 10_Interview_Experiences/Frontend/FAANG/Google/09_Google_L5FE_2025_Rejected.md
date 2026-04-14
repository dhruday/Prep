# Google — L5 Frontend Interview Experience (2025) — #9

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Senior Frontend Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 2: Frontend Coding — Build an Accessible Color Picker Component
**Duration:** 45 minutes

### Challenge: Build a color picker with: hue spectrum bar, saturation-brightness 2D area, hex/RGB input, and full keyboard + screen reader accessibility.

```javascript
/**
 * Accessible Color Picker:
 * - Hue spectrum bar (horizontal, 0-360)
 * - Saturation-Brightness 2D picker area
 * - Hex input (#RRGGBB)
 * - RGB inputs (0-255 each)
 * - Keyboard: arrow keys for fine control, Tab between sections
 * - ARIA: announcements on color change, role=slider
 * - High contrast selection indicators
 */
class AccessibleColorPicker {
  constructor(container, options = {}) {
    this.container = container;
    this.onChange = options.onChange || (() => {});
    
    // HSB state (canonical format)
    this.hue = 0;        // 0-360
    this.saturation = 100; // 0-100
    this.brightness = 100; // 0-100
    
    // Canvas elements
    this.hueCanvas = null;
    this.sbCanvas = null;
    this.dragging = null; // 'hue' | 'sb' | null
    
    this.render();
    this.drawHueBar();
    this.drawSBArea();
  }
  
  // ---- Color Conversions ----
  
  hsbToRgb(h, s, b) {
    s /= 100; b /= 100;
    const k = (n) => (n + h / 60) % 6;
    const f = (n) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    return {
      r: Math.round(f(5) * 255),
      g: Math.round(f(3) * 255),
      b: Math.round(f(1) * 255)
    };
  }
  
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  rgbToHsb(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0, s = max === 0 ? 0 : d / max;
    
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h: Math.round(h * 360), s: Math.round(s * 100), b: Math.round(max * 100) };
  }
  
  get currentColor() {
    const rgb = this.hsbToRgb(this.hue, this.saturation, this.brightness);
    return {
      hex: this.rgbToHex(rgb.r, rgb.g, rgb.b),
      rgb,
      hsb: { h: this.hue, s: this.saturation, b: this.brightness }
    };
  }
  
  setFromHex(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return;
    const hsb = this.rgbToHsb(rgb.r, rgb.g, rgb.b);
    this.hue = hsb.h;
    this.saturation = hsb.s;
    this.brightness = hsb.b;
    this.update();
  }
  
  setFromRgb(r, g, b) {
    const hsb = this.rgbToHsb(r, g, b);
    this.hue = hsb.h;
    this.saturation = hsb.s;
    this.brightness = hsb.b;
    this.update();
  }
  
  // ---- Rendering ----
  
  render() {
    const color = this.currentColor;
    
    this.container.innerHTML = `
      <div class="color-picker" role="group" aria-label="Color picker" style="font-family:-apple-system,sans-serif; width:320px">
        
        <!-- SB Area (2D picker) -->
        <div style="position:relative; margin-bottom:12px">
          <canvas id="sb-canvas" width="300" height="200" 
                  style="width:300px; height:200px; cursor:crosshair; border-radius:8px; display:block"
                  role="slider" tabindex="0"
                  aria-label="Saturation and brightness"
                  aria-valuetext="Saturation ${this.saturation}%, Brightness ${this.brightness}%"></canvas>
          <!-- SB cursor -->
          <div id="sb-cursor" style="position:absolute; width:16px; height:16px; border:2px solid #fff; border-radius:50%;
               box-shadow:0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.3);
               pointer-events:none; transform:translate(-50%,-50%);
               left:${this.saturation}%; top:${100 - this.brightness}%"></div>
        </div>
        
        <!-- Hue Bar -->
        <div style="position:relative; margin-bottom:12px">
          <canvas id="hue-canvas" width="300" height="20" 
                  style="width:300px; height:20px; cursor:pointer; border-radius:4px; display:block"
                  role="slider" tabindex="0"
                  aria-label="Hue"
                  aria-valuemin="0" aria-valuemax="360" aria-valuenow="${this.hue}"
                  aria-valuetext="Hue ${this.hue} degrees"></canvas>
          <!-- Hue cursor -->
          <div id="hue-cursor" style="position:absolute; top:-2px; width:6px; height:24px; background:#fff;
               border:1px solid rgba(0,0,0,0.3); border-radius:3px; pointer-events:none; transform:translateX(-50%);
               left:${(this.hue / 360) * 100}%"></div>
        </div>
        
        <!-- Color preview + inputs -->
        <div style="display:flex; gap:12px; align-items:start">
          <!-- Preview swatch -->
          <div style="width:48px; height:48px; border-radius:8px; border:1px solid #e5e7eb; flex-shrink:0;
               background:${color.hex}" aria-label="Selected color: ${color.hex}" role="img"></div>
          
          <div style="flex:1">
            <!-- Hex input -->
            <label style="display:block; margin-bottom:8px">
              <span style="font-size:11px; color:#666; font-weight:500">HEX</span>
              <input type="text" id="hex-input" value="${color.hex}" maxlength="7"
                     style="width:100%; padding:4px 8px; border:1px solid #d1d5db; border-radius:4px; font-family:monospace; font-size:13px"
                     aria-label="Hex color value">
            </label>
            
            <!-- RGB inputs -->
            <div style="display:flex; gap:6px">
              ${['R', 'G', 'B'].map((ch, i) => {
                const val = [color.rgb.r, color.rgb.g, color.rgb.b][i];
                return `
                  <label style="flex:1">
                    <span style="font-size:11px; color:#666; font-weight:500">${ch}</span>
                    <input type="number" class="rgb-input" data-channel="${'rgb'[i]}" 
                           value="${val}" min="0" max="255"
                           style="width:100%; padding:4px; border:1px solid #d1d5db; border-radius:4px; font-size:13px"
                           aria-label="${ch === 'R' ? 'Red' : ch === 'G' ? 'Green' : 'Blue'} channel, 0 to 255">
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        </div>
        
        <!-- Screen reader announcement area -->
        <div id="sr-announce" aria-live="polite" class="sr-only" style="position:absolute; width:1px; height:1px; overflow:hidden"></div>
      </div>
    `;
    
    this.hueCanvas = this.container.querySelector('#hue-canvas');
    this.sbCanvas = this.container.querySelector('#sb-canvas');
    
    this.attachListeners();
    this.drawHueBar();
    this.drawSBArea();
  }
  
  drawHueBar() {
    const canvas = this.hueCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 300, 0);
    
    for (let i = 0; i <= 360; i += 30) {
      const rgb = this.hsbToRgb(i, 100, 100);
      gradient.addColorStop(i / 360, this.rgbToHex(rgb.r, rgb.g, rgb.b));
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 20);
  }
  
  drawSBArea() {
    const canvas = this.sbCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Base hue color
    const hueRgb = this.hsbToRgb(this.hue, 100, 100);
    ctx.fillStyle = this.rgbToHex(hueRgb.r, hueRgb.g, hueRgb.b);
    ctx.fillRect(0, 0, 300, 200);
    
    // Saturation: white → transparent (left to right)
    const satGradient = ctx.createLinearGradient(0, 0, 300, 0);
    satGradient.addColorStop(0, 'rgba(255,255,255,1)');
    satGradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = satGradient;
    ctx.fillRect(0, 0, 300, 200);
    
    // Brightness: transparent → black (top to bottom)
    const brightGradient = ctx.createLinearGradient(0, 0, 0, 200);
    brightGradient.addColorStop(0, 'rgba(0,0,0,0)');
    brightGradient.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = brightGradient;
    ctx.fillRect(0, 0, 300, 200);
  }
  
  update() {
    this.drawSBArea();
    
    const color = this.currentColor;
    
    // Update cursors
    const sbCursor = this.container.querySelector('#sb-cursor');
    if (sbCursor) {
      sbCursor.style.left = `${this.saturation}%`;
      sbCursor.style.top = `${100 - this.brightness}%`;
    }
    
    const hueCursor = this.container.querySelector('#hue-cursor');
    if (hueCursor) {
      hueCursor.style.left = `${(this.hue / 360) * 100}%`;
    }
    
    // Update inputs
    const hexInput = this.container.querySelector('#hex-input');
    if (hexInput && document.activeElement !== hexInput) hexInput.value = color.hex;
    
    this.container.querySelectorAll('.rgb-input').forEach(input => {
      if (document.activeElement !== input) {
        const ch = input.dataset.channel;
        input.value = color.rgb[ch];
      }
    });
    
    // Update preview
    const preview = this.container.querySelector('[role="img"]');
    if (preview) {
      preview.style.background = color.hex;
      preview.setAttribute('aria-label', `Selected color: ${color.hex}`);
    }
    
    // ARIA announcements
    const srAnnounce = this.container.querySelector('#sr-announce');
    if (srAnnounce) srAnnounce.textContent = `Color: ${color.hex}`;
    
    // Update ARIA attributes
    this.sbCanvas?.setAttribute('aria-valuetext', 
      `Saturation ${this.saturation}%, Brightness ${this.brightness}%`);
    this.hueCanvas?.setAttribute('aria-valuenow', this.hue);
    this.hueCanvas?.setAttribute('aria-valuetext', `Hue ${this.hue} degrees`);
    
    this.onChange(color);
  }
  
  attachListeners() {
    // SB canvas mouse interaction
    const handleSBMouse = (e) => {
      const rect = this.sbCanvas.getBoundingClientRect();
      this.saturation = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
      this.brightness = Math.round(Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100)));
      this.update();
    };
    
    this.sbCanvas?.addEventListener('mousedown', (e) => {
      this.dragging = 'sb';
      handleSBMouse(e);
    });
    
    // Hue canvas mouse interaction
    const handleHueMouse = (e) => {
      const rect = this.hueCanvas.getBoundingClientRect();
      this.hue = Math.round(Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360)));
      this.update();
    };
    
    this.hueCanvas?.addEventListener('mousedown', (e) => {
      this.dragging = 'hue';
      handleHueMouse(e);
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.dragging === 'sb') handleSBMouse(e);
      else if (this.dragging === 'hue') handleHueMouse(e);
    });
    
    document.addEventListener('mouseup', () => { this.dragging = null; });
    
    // Keyboard: Arrow keys for fine control
    this.sbCanvas?.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowRight': this.saturation = Math.min(100, this.saturation + step); break;
        case 'ArrowLeft':  this.saturation = Math.max(0, this.saturation - step); break;
        case 'ArrowUp':    this.brightness = Math.min(100, this.brightness + step); break;
        case 'ArrowDown':  this.brightness = Math.max(0, this.brightness - step); break;
        default: return;
      }
      e.preventDefault();
      this.update();
    });
    
    this.hueCanvas?.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowRight') this.hue = (this.hue + step) % 361;
      else if (e.key === 'ArrowLeft') this.hue = (this.hue - step + 360) % 361;
      else return;
      e.preventDefault();
      this.update();
    });
    
    // Hex input
    this.container.querySelector('#hex-input')?.addEventListener('change', (e) => {
      this.setFromHex(e.target.value);
    });
    
    // RGB inputs
    this.container.querySelectorAll('.rgb-input').forEach(input => {
      input.addEventListener('change', () => {
        const inputs = this.container.querySelectorAll('.rgb-input');
        const r = parseInt(inputs[0].value, 10) || 0;
        const g = parseInt(inputs[1].value, 10) || 0;
        const b = parseInt(inputs[2].value, 10) || 0;
        this.setFromRgb(
          Math.max(0, Math.min(255, r)),
          Math.max(0, Math.min(255, g)),
          Math.max(0, Math.min(255, b))
        );
      });
    });
  }
}
```

---

## 🎯 Key Takeaways
- Google L5 FE = **Accessible color picker — HSB model, Canvas 2D SB area, keyboard + ARIA**
- **HSB model**: Hue (0-360) on spectrum bar, Saturation (left-right) × Brightness (top-bottom) on 2D area
- **Canvas gradients**: base hue fill → white-to-transparent left-right → black-from-top-to-bottom — creates full SB space
- **HSB↔RGB conversion**: standard formulas — work in HSB internally, convert for display
- **Keyboard**: Arrow keys ±1 (Shift ±10) — fine control for accessibility
- **ARIA**: `role="slider"`, `aria-valuetext` with human-readable descriptions, `aria-live="polite"` announcements
- **Don't update active input**: `if (document.activeElement !== input)` — prevents overwriting user's typing
- **Rejection reason**: coding was strong but system design (Google Docs collaboration) didn't go deep enough on OT/CRDT
- Google FE = **accessibility is non-negotiable** — expect keyboard nav + screen reader support

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | JS Coding |
| FE Coding (this) | Very Hard | Color Picker, Canvas, A11y |
| System Design | Very Hard | Collaborative Editor |
| Behavioral | Medium | Googleyness |
| Coding 2 | Hard | DSA |
