# Adobe — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | Senior Frontend Engineer |
| **Level** | E3/IC3 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design round — failed to explain micro-frontend architecture for Adobe Express

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Color Picker with Gradient Selection**
   - HSL color wheel, gradient preview, opacity slider, hex/RGB input

### 💡 Interview-Ready Answer

```javascript
function ColorPicker({ value = '#FF0000', onChange }) {
  const [hsl, setHSL] = useState({ h: 0, s: 100, l: 50 });
  const [alpha, setAlpha] = useState(1);
  const [hexInput, setHexInput] = useState(value);
  const canvasRef = useRef(null);
  
  // Draw color wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    
    // Hue ring
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      
      ctx.beginPath();
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.arc(center, center, radius - 30, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }
    
    // Saturation-Lightness square in center
    const squareSize = (radius - 30) * Math.SQRT2 * 0.7;
    const squareOffset = center - squareSize / 2;
    
    // Horizontal: saturation (0→100%)
    // Vertical: lightness (100%→0%)
    const imageData = ctx.createImageData(squareSize, squareSize);
    
    for (let y = 0; y < squareSize; y++) {
      for (let x = 0; x < squareSize; x++) {
        const s = (x / squareSize) * 100;
        const l = 100 - (y / squareSize) * 100;
        const [r, g, b] = hslToRgb(hsl.h, s, l);
        const idx = (y * squareSize + x) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, squareOffset, squareOffset);
  }, [hsl.h]);
  
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const center = canvas.width / 2;
    const dx = x - center;
    const dy = y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = center - 10;
    
    if (dist > radius - 30 && dist < radius) {
      // Clicked on hue ring
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const hue = ((angle + 360) % 360) | 0;
      updateColor({ ...hsl, h: hue });
    } else {
      // Clicked on SL square
      const squareSize = (radius - 30) * Math.SQRT2 * 0.7;
      const squareOffset = center - squareSize / 2;
      const sx = x - squareOffset;
      const sy = y - squareOffset;
      
      if (sx >= 0 && sx <= squareSize && sy >= 0 && sy <= squareSize) {
        const s = Math.round((sx / squareSize) * 100);
        const l = Math.round(100 - (sy / squareSize) * 100);
        updateColor({ ...hsl, s, l });
      }
    }
  };
  
  const updateColor = (newHSL) => {
    setHSL(newHSL);
    const hex = hslToHex(newHSL.h, newHSL.s, newHSL.l);
    setHexInput(hex);
    onChange?.(alpha < 1 ? hex + alphaToHex(alpha) : hex);
  };
  
  const handleHexInput = (e) => {
    const hex = e.target.value;
    setHexInput(hex);
    
    // Validate hex: #RGB, #RRGGBB, #RRGGBBAA
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex)) {
      const { h, s, l } = hexToHSL(hex);
      setHSL({ h, s, l });
      onChange?.(hex);
    }
  };
  
  return (
    <div className="color-picker" role="application" aria-label="Color picker">
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        onClick={handleCanvasClick}
        role="img"
        aria-label={`Color wheel. Current hue: ${hsl.h} degrees`}
      />
      
      {/* Opacity slider */}
      <label>
        Opacity: {Math.round(alpha * 100)}%
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={alpha}
          onChange={(e) => {
            setAlpha(parseFloat(e.target.value));
            onChange?.(hexInput + alphaToHex(parseFloat(e.target.value)));
          }}
          style={{
            background: `linear-gradient(to right, transparent, hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%))`
          }}
          aria-label="Color opacity"
        />
      </label>
      
      {/* Hex input */}
      <div className="inputs">
        <label>
          HEX
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInput}
            maxLength={9}
            pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$"
            aria-label="Hex color value"
          />
        </label>
        
        <label>H: <input type="number" min="0" max="360" value={hsl.h}
          onChange={e => updateColor({...hsl, h: +e.target.value})} /></label>
        <label>S: <input type="number" min="0" max="100" value={hsl.s}
          onChange={e => updateColor({...hsl, s: +e.target.value})} /></label>
        <label>L: <input type="number" min="0" max="100" value={hsl.l}
          onChange={e => updateColor({...hsl, l: +e.target.value})} /></label>
      </div>
      
      {/* Preview */}
      <div
        className="preview"
        style={{ backgroundColor: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})` }}
        aria-label={`Color preview: ${hexInput}`}
      />
    </div>
  );
}

// Utility functions
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement Object.assign polyfill with deep copy option**
2. **Explain the Event Loop with microtasks vs macrotasks**
3. **What is the difference between `requestAnimationFrame` and `setTimeout(fn, 0)`?**

### 💡 Object.assign Polyfill (Deep)

```javascript
function deepAssign(target, ...sources) {
  if (target == null) throw new TypeError('Cannot convert undefined or null to object');
  
  const result = Object(target);
  
  for (const source of sources) {
    if (source == null) continue;
    
    for (const key of [...Object.keys(source), ...Object.getOwnPropertySymbols(source)]) {
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      if (!descriptor?.enumerable) continue;
      
      const sourceVal = source[key];
      const targetVal = result[key];
      
      // Deep merge objects (not arrays, not null, not Date, not RegExp)
      if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
        result[key] = deepAssign({}, targetVal, sourceVal);
      } else {
        result[key] = sourceVal;
      }
    }
  }
  
  return result;
}

function isPlainObject(val) {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

// rAF vs setTimeout(fn, 0):
// - rAF: runs BEFORE next paint (typically 16.67ms for 60fps)
//   Synced to display refresh rate, batched by browser
//   Paused when tab is not visible
// - setTimeout(fn, 0): runs after current task + microtasks
//   Minimum 4ms clamp after 5 nested calls
//   Subject to throttling when tab is inactive
//   NOT synced to refresh rate → can cause jank
```

---

## 🎯 Key Takeaways
- Adobe FE = **creative tools UI** (color picker, canvas, gradient) — unique to Adobe
- **Color picker**: HSL color wheel on Canvas + saturation/lightness square + hex input
- `hslToRgb` conversion formula — memorize the 6-sector hue mapping
- **Deep Object.assign** — handle Symbol keys, plain objects vs arrays, non-enumerable
- **rAF vs setTimeout**: rAF syncs to display refresh, setTimeout doesn't
- Adobe values **visual/creative UI skills** + understanding of color theory
- Failed on **micro-frontend architecture** for Adobe Express — study module federation

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Canvas, HSL Color Space, Accessibility |
| JavaScript | Medium-Hard | Deep Clone, Event Loop, rAF |
| System Design | Hard | Micro-Frontends, Module Federation |
| HM | Medium | Behavioral |
