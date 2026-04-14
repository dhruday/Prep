# Google — Senior Frontend Engineer Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | L4 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Workspace |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + FE Design + Googliness)
- **Timeline:** 6 weeks (incl. team matching)

---

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Implement `Array.prototype.reduce` from scratch**
2. **Follow-up: Make it work with async reducers** (each step returns a Promise)

### 💡 reduce Polyfill + Async Variant

```javascript
// Standard reduce polyfill
Array.prototype.myReduce = function(callback, initialValue) {
  if (this == null) throw new TypeError('Cannot read properties of null');
  if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
  
  const arr = Object(this);
  const len = arr.length >>> 0; // ToUint32
  
  let accumulator;
  let startIndex = 0;
  
  if (initialValue !== undefined) {
    accumulator = initialValue;
  } else {
    // Find first non-empty slot (sparse array handling)
    let found = false;
    while (startIndex < len) {
      if (startIndex in arr) {
        accumulator = arr[startIndex++];
        found = true;
        break;
      }
      startIndex++;
    }
    if (!found) throw new TypeError('Reduce of empty array with no initial value');
  }
  
  for (let i = startIndex; i < len; i++) {
    if (i in arr) { // Skip holes in sparse arrays
      accumulator = callback(accumulator, arr[i], i, arr);
    }
  }
  
  return accumulator;
};

// Async reduce — each callback returns a Promise
async function asyncReduce(array, callback, initialValue) {
  let accumulator = initialValue;
  let startIndex = 0;
  
  if (accumulator === undefined) {
    accumulator = array[0];
    startIndex = 1;
  }
  
  for (let i = startIndex; i < array.length; i++) {
    accumulator = await callback(accumulator, array[i], i, array);
  }
  
  return accumulator;
}

// Usage:
const urls = ['/api/step1', '/api/step2', '/api/step3'];
const result = await asyncReduce(urls, async (acc, url) => {
  const res = await fetch(url, { method: 'POST', body: JSON.stringify(acc) });
  return res.json();
}, { token: null });
```

---

## Round 2: Frontend Coding
**Duration:** 45 minutes

### Questions Asked
1. **Build an Accessible Color Picker** (HSL model)
   - Hue slider (0-360°)
   - Saturation-Lightness 2D canvas picker
   - Hex/RGB/HSL input fields (bidirectional sync)
   - Keyboard accessible (arrow keys in 2D picker)

### 💡 Color Picker Implementation

```jsx
function ColorPicker({ value = '#ff0000', onChange }) {
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  
  // Sync HSL → Hex → parent onChange
  useEffect(() => {
    const hex = hslToHex(hsl.h, hsl.s, hsl.l);
    onChange?.(hex);
  }, [hsl, onChange]);
  
  // Draw saturation-lightness canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Hue gradient (fixed hue, vary S and L)
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const s = x / width * 100;
        const l = 100 - (y / height * 100);
        ctx.fillStyle = `hsl(${hsl.h}, ${s}%, ${l}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hsl.h]);
  
  const handleCanvasInteraction = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    setHsl(prev => ({
      ...prev,
      s: Math.round(x / rect.width * 100),
      l: Math.round(100 - (y / rect.height * 100)),
    }));
  };
  
  // Keyboard nav for 2D picker
  const handlePickerKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 1;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setHsl(prev => ({ ...prev, s: Math.min(100, prev.s + step) }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setHsl(prev => ({ ...prev, s: Math.max(0, prev.s - step) }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHsl(prev => ({ ...prev, l: Math.min(100, prev.l + step) }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHsl(prev => ({ ...prev, l: Math.max(0, prev.l - step) }));
        break;
    }
  };
  
  const hex = hslToHex(hsl.h, hsl.s, hsl.l);
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  
  return (
    <div className="color-picker" role="group" aria-label="Color picker">
      {/* 2D Saturation-Lightness Picker */}
      <div className="sl-picker">
        <canvas
          ref={canvasRef}
          width={256} height={256}
          role="slider"
          aria-label="Saturation and lightness"
          aria-valuetext={`Saturation ${hsl.s}%, Lightness ${hsl.l}%`}
          tabIndex={0}
          onMouseDown={(e) => { isDragging.current = true; handleCanvasInteraction(e); }}
          onMouseMove={(e) => isDragging.current && handleCanvasInteraction(e)}
          onMouseUp={() => isDragging.current = false}
          onKeyDown={handlePickerKeyDown}
        />
        {/* Crosshair indicator */}
        <div className="crosshair" style={{
          left: `${hsl.s}%`, top: `${100 - hsl.l}%`,
          borderColor: hsl.l > 50 ? '#000' : '#fff'
        }} aria-hidden="true" />
      </div>
      
      {/* Hue Slider */}
      <label>
        Hue
        <input
          type="range" min={0} max={360} value={hsl.h}
          onChange={e => setHsl(prev => ({ ...prev, h: Number(e.target.value) }))}
          className="hue-slider"
          aria-label={`Hue: ${hsl.h} degrees`}
          style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        />
      </label>
      
      {/* Value Inputs */}
      <div className="value-inputs">
        <label>
          Hex
          <input
            type="text" value={hex} maxLength={7}
            onChange={e => {
              const parsed = hexToHsl(e.target.value);
              if (parsed) setHsl(parsed);
            }}
          />
        </label>
        <label>
          R
          <input type="number" min={0} max={255} value={rgb.r}
            onChange={e => setHsl(rgbToHsl(Number(e.target.value), rgb.g, rgb.b))} />
        </label>
        <label>
          G
          <input type="number" min={0} max={255} value={rgb.g}
            onChange={e => setHsl(rgbToHsl(rgb.r, Number(e.target.value), rgb.b))} />
        </label>
        <label>
          B
          <input type="number" min={0} max={255} value={rgb.b}
            onChange={e => setHsl(rgbToHsl(rgb.r, rgb.g, Number(e.target.value)))} />
        </label>
      </div>
      
      {/* Preview swatch */}
      <div className="preview" style={{ backgroundColor: hex }}
        role="img" aria-label={`Selected color: ${hex}`} />
    </div>
  );
}

// Color conversion utilities
function hexToHsl(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
```

---

## 🎯 Key Takeaways
- Google FE = **polyfills + interactive components + a11y + math-heavy**
- **Array.reduce polyfill**: handle sparse arrays with `i in arr`, `length >>> 0`, no initial value edge case
- **Async reduce**: `await callback(acc, item)` — sequential by nature (no parallel!)
- **Color picker HSL model**: hue slider (0-360) + 2D canvas for saturation × lightness
- **Canvas 2D picker**: pixel-by-pixel rendering with `hsl()` — or use ImageData for performance
- **Keyboard 2D navigation**: arrow keys adjust S/L, Shift for larger steps
- **Bidirectional color sync**: hex → hsl → rgb all derived from single HSL state
- Google FE interviews: emphasis on **correctness of polyfills**, edge cases, and Canvas API usage

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | reduce polyfill, async variant |
| FE Coding | Hard | Color Picker, Canvas, HSL math |
| Coding 2 | Medium-Hard | Graph traversal |
| FE Design | Hard | Google Docs Editor Architecture |
| Googliness | Medium | Behavioral |
