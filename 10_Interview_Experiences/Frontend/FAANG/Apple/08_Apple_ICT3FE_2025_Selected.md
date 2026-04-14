# Apple — ICT-3 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Frontend Engineer |
| **Level** | ICT-3 |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone + 3 Onsite)
- **Timeline:** 3 weeks
- **Format:** In-person

## Round 1: Coding — Build an Accessible Color Picker Component
**Duration:** 45 minutes

### Problem
Build a color picker with:
- Hue slider, saturation/brightness 2D picker
- Hex/RGB input fields
- Color preview swatch
- Full keyboard & screen reader accessibility

### 💡 Interview-Ready Answer

```javascript
class ColorPicker {
  constructor(container, { initialColor = '#ff0000', onChange = () => {} } = {}) {
    this.container = container;
    this.onChange = onChange;

    // HSV model (easier for picker UI than RGB)
    this.hue = 0;        // 0-360
    this.saturation = 100; // 0-100
    this.brightness = 100; // 0-100

    this._parseInitialColor(initialColor);
    this._build();
    this._updateUI();
  }

  _parseInitialColor(hex) {
    const rgb = this._hexToRgb(hex);
    if (rgb) {
      const hsv = this._rgbToHsv(rgb.r, rgb.g, rgb.b);
      this.hue = hsv.h;
      this.saturation = hsv.s;
      this.brightness = hsv.v;
    }
  }

  _build() {
    this.container.innerHTML = '';
    this.container.setAttribute('role', 'group');
    this.container.setAttribute('aria-label', 'Color picker');
    this.container.style.cssText = 'width:300px;font-family:system-ui;';

    // === Saturation/Brightness Picker (2D) ===
    this.svPicker = document.createElement('div');
    this.svPicker.className = 'sv-picker';
    this.svPicker.setAttribute('role', 'slider');
    this.svPicker.setAttribute('aria-label', 'Saturation and brightness');
    this.svPicker.setAttribute('tabindex', '0');
    this.svPicker.style.cssText = `
      width:100%;height:200px;position:relative;cursor:crosshair;
      border-radius:4px;overflow:hidden;
    `;

    this.svCursor = document.createElement('div');
    this.svCursor.style.cssText = `
      width:14px;height:14px;border:2px solid #fff;border-radius:50%;
      position:absolute;transform:translate(-50%,-50%);
      box-shadow:0 0 2px rgba(0,0,0,0.5);pointer-events:none;
    `;
    this.svPicker.appendChild(this.svCursor);

    this._setupSVInteraction();
    this.container.appendChild(this.svPicker);

    // === Hue Slider ===
    const hueRow = document.createElement('div');
    hueRow.style.cssText = 'margin-top:10px;display:flex;align-items:center;gap:8px;';

    const hueLabel = document.createElement('label');
    hueLabel.textContent = 'H';
    hueLabel.style.cssText = 'font-size:12px;font-weight:bold;color:#666;';
    hueLabel.setAttribute('for', 'hue-slider');

    this.hueSlider = document.createElement('input');
    this.hueSlider.type = 'range';
    this.hueSlider.id = 'hue-slider';
    this.hueSlider.min = '0';
    this.hueSlider.max = '360';
    this.hueSlider.value = this.hue;
    this.hueSlider.setAttribute('aria-label', 'Hue');
    this.hueSlider.style.cssText = `
      flex:1;height:12px;border-radius:6px;-webkit-appearance:none;
      background:linear-gradient(to right,
        hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),
        hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%)
      );
    `;
    this.hueSlider.addEventListener('input', () => {
      this.hue = parseInt(this.hueSlider.value);
      this._updateUI();
      this._emitChange();
    });

    hueRow.appendChild(hueLabel);
    hueRow.appendChild(this.hueSlider);
    this.container.appendChild(hueRow);

    // === Color Preview & Inputs ===
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'margin-top:10px;display:flex;gap:8px;align-items:center;';

    // Preview swatch
    this.swatch = document.createElement('div');
    this.swatch.setAttribute('role', 'img');
    this.swatch.setAttribute('aria-label', 'Selected color preview');
    this.swatch.style.cssText = `
      width:40px;height:40px;border-radius:4px;border:1px solid #ccc;
      flex-shrink:0;
    `;
    inputRow.appendChild(this.swatch);

    // Hex input
    const hexGroup = this._createInputGroup('Hex', 'hex');
    this.hexInput = hexGroup.querySelector('input');
    this.hexInput.maxLength = 7;
    this.hexInput.style.width = '80px';
    this.hexInput.addEventListener('change', () => {
      let val = this.hexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      const rgb = this._hexToRgb(val);
      if (rgb) {
        const hsv = this._rgbToHsv(rgb.r, rgb.g, rgb.b);
        this.hue = hsv.h;
        this.saturation = hsv.s;
        this.brightness = hsv.v;
        this._updateUI();
        this._emitChange();
      }
    });
    inputRow.appendChild(hexGroup);

    // RGB inputs
    ['R', 'G', 'B'].forEach(channel => {
      const group = this._createInputGroup(channel, channel.toLowerCase());
      const input = group.querySelector('input');
      input.type = 'number';
      input.min = '0';
      input.max = '255';
      input.style.width = '48px';
      input.addEventListener('change', () => this._onRGBInputChange());
      this[`${channel.toLowerCase()}Input`] = input;
      inputRow.appendChild(group);
    });

    this.container.appendChild(inputRow);
  }

  _createInputGroup(label, id) {
    const group = document.createElement('div');
    group.style.cssText = 'display:flex;flex-direction:column;';

    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.setAttribute('for', `color-${id}`);
    lbl.style.cssText = 'font-size:11px;color:#666;text-align:center;';
    group.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `color-${id}`;
    input.style.cssText = 'padding:4px;border:1px solid #ccc;border-radius:4px;text-align:center;font-size:12px;';
    group.appendChild(input);

    return group;
  }

  _setupSVInteraction() {
    let isDragging = false;

    const updateFromEvent = (e) => {
      const rect = this.svPicker.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      this.saturation = Math.round((x / rect.width) * 100);
      this.brightness = Math.round(100 - (y / rect.height) * 100);

      this._updateUI();
      this._emitChange();
    };

    this.svPicker.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateFromEvent(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) updateFromEvent(e);
    });

    document.addEventListener('mouseup', () => { isDragging = false; });

    // Keyboard support for 2D picker
    this.svPicker.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 2;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          this.saturation = Math.min(100, this.saturation + step);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.saturation = Math.max(0, this.saturation - step);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.brightness = Math.min(100, this.brightness + step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.brightness = Math.max(0, this.brightness - step);
          break;
        default:
          return;
      }
      this._updateUI();
      this._emitChange();
    });
  }

  _onRGBInputChange() {
    const r = parseInt(this.rInput.value) || 0;
    const g = parseInt(this.gInput.value) || 0;
    const b = parseInt(this.bInput.value) || 0;
    const hsv = this._rgbToHsv(
      Math.max(0, Math.min(255, r)),
      Math.max(0, Math.min(255, g)),
      Math.max(0, Math.min(255, b))
    );
    this.hue = hsv.h;
    this.saturation = hsv.s;
    this.brightness = hsv.v;
    this._updateUI();
    this._emitChange();
  }

  _updateUI() {
    // SV picker background (hue gradient)
    this.svPicker.style.background = `
      linear-gradient(to top, #000, transparent),
      linear-gradient(to right, #fff, hsl(${this.hue}, 100%, 50%))
    `;

    // Cursor position
    const x = this.saturation;
    const y = 100 - this.brightness;
    this.svCursor.style.left = `${x}%`;
    this.svCursor.style.top = `${y}%`;

    // Hue slider
    this.hueSlider.value = this.hue;

    // Get RGB
    const rgb = this._hsvToRgb(this.hue, this.saturation, this.brightness);
    const hex = this._rgbToHex(rgb.r, rgb.g, rgb.b);

    // Update inputs
    this.hexInput.value = hex;
    this.rInput.value = rgb.r;
    this.gInput.value = rgb.g;
    this.bInput.value = rgb.b;

    // Swatch
    this.swatch.style.background = hex;
    this.swatch.setAttribute('aria-label', `Selected color: ${hex}`);

    // ARIA value for SV picker
    this.svPicker.setAttribute('aria-valuetext',
      `Saturation ${this.saturation}%, Brightness ${this.brightness}%`);
  }

  _emitChange() {
    const rgb = this._hsvToRgb(this.hue, this.saturation, this.brightness);
    const hex = this._rgbToHex(rgb.r, rgb.g, rgb.b);
    this.onChange({ hex, rgb, hsv: { h: this.hue, s: this.saturation, v: this.brightness } });
  }

  // === Color Conversions ===

  _hsvToRgb(h, s, v) {
    s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r, g, b;

    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  _rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h, s = max === 0 ? 0 : d / max, v = max;

    if (d === 0) { h = 0; }
    else if (max === r) { h = ((g - b) / d + 6) % 6; }
    else if (max === g) { h = (b - r) / d + 2; }
    else { h = (r - g) / d + 4; }

    return { h: Math.round(h * 60), s: Math.round(s * 100), v: Math.round(v * 100) };
  }

  _hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
  }

  _rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  // Public API
  getColor() {
    const rgb = this._hsvToRgb(this.hue, this.saturation, this.brightness);
    return { hex: this._rgbToHex(rgb.r, rgb.g, rgb.b), rgb };
  }

  setColor(hex) {
    this._parseInitialColor(hex);
    this._updateUI();
  }
}

// === Usage ===
/*
const picker = new ColorPicker(document.getElementById('picker'), {
  initialColor: '#3498db',
  onChange: ({ hex, rgb }) => {
    console.log('Color:', hex, rgb);
    document.body.style.backgroundColor = hex;
  }
});
*/
```

## 🎯 Key Takeaways
- Apple cares deeply about **accessibility** — color picker must work with keyboard + screen reader
- HSV color model is natural for 2D picker (saturation on X, brightness on Y)
- Must handle all color conversions: HSV ↔ RGB ↔ Hex
- 2D picker keyboard support via arrow keys + Shift for larger steps
- `aria-valuetext` provides meaningful descriptions for screen readers

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | Color Theory, HSV/RGB, Canvas/DOM, A11y |
| Design | Hard | Apple Music Player Architecture |
| Behavioral | Medium | Collaboration, Craft |
