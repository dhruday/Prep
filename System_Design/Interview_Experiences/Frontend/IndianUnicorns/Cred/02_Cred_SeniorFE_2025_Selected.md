# Cred — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Cred |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/cred-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + Founder)
- **Timeline:** 2 weeks

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a CRED Coins Reward Animation + Scratch Card**
   - Coin rain animation, scratch-to-reveal with Canvas, progressive reveal percentage

### 💡 Interview-Ready Answer

```javascript
function ScratchCard({ prize, onReveal, revealThreshold = 60 }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [percentage, setPercentage] = useState(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Draw scratch surface (gradient overlay)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2A2A2A');
    gradient.addColorStop(0.5, '#3A3A3A');
    gradient.addColorStop(1, '#2A2A2A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Pattern text
    ctx.fillStyle = '#444';
    ctx.font = '14px monospace';
    for (let y = 20; y < canvas.height; y += 30) {
      for (let x = 10; x < canvas.width; x += 100) {
        ctx.fillText('SCRATCH', x, y);
      }
    }
    
    // Set composite operation for "erasing" effect
    ctx.globalCompositeOperation = 'destination-out';
  }, []);
  
  const getPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };
  
  const scratch = (e) => {
    if (!isDrawingRef.current || revealed) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPosition(e);
    
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, 2 * Math.PI); // Circular brush
    ctx.fill();
    
    // Calculate reveal percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }
    
    const pct = Math.round((transparent / (pixels.length / 4)) * 100);
    setPercentage(pct);
    
    if (pct >= revealThreshold && !revealed) {
      setRevealed(true);
      // Full reveal animation
      canvas.style.transition = 'opacity 0.5s ease-out';
      canvas.style.opacity = '0';
      onReveal?.(prize);
    }
  };
  
  const handleStart = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    scratch(e);
  };
  
  const handleEnd = () => { isDrawingRef.current = false; };
  
  return (
    <div className="scratch-card" role="application" aria-label="Scratch card">
      {/* Prize underneath */}
      <div className="prize-content" aria-hidden={!revealed}>
        <div className="coins-amount">🪙 {prize.coins}</div>
        <div className="prize-label">{prize.label}</div>
      </div>
      
      {/* Scratch overlay */}
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        onMouseDown={handleStart}
        onMouseMove={scratch}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={scratch}
        onTouchEnd={handleEnd}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
        aria-label={revealed ? `Revealed: ${prize.coins} coins` : `Scratch to reveal. ${percentage}% scratched.`}
      />
      
      {!revealed && <div className="hint">Scratch to reveal your reward!</div>}
    </div>
  );
}

// Coin Rain Animation
function CoinRain({ coins, duration = 3000 }) {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,       // Random horizontal position (%)
      delay: Math.random() * 2000,   // Staggered start
      size: 20 + Math.random() * 20, // Variable size
      rotation: Math.random() * 360,
      duration: 1500 + Math.random() * 1000,
    }));
    
    setParticles(newParticles);
    
    const timer = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(timer);
  }, [coins, duration]);
  
  return (
    <div className="coin-rain" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="coin-particle"
          style={{
            left: `${p.x}%`,
            '--fall-duration': `${p.duration}ms`,
            '--delay': `${p.delay}ms`,
            '--rotation': `${p.rotation}deg`,
            '--size': `${p.size}px`,
          }}
        >
          🪙
        </div>
      ))}
      
      <style>{`
        .coin-rain { position: fixed; inset: 0; pointer-events: none; z-index: 1000; overflow: hidden; }
        
        .coin-particle {
          position: absolute;
          top: -50px;
          font-size: var(--size);
          animation: coinFall var(--fall-duration) ease-in var(--delay) forwards;
        }
        
        @keyframes coinFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
```

---

## Round 2: JavaScript + React Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Explain React reconciliation algorithm (Fiber)**
2. **What's the difference between `useMemo`, `useCallback`, and `React.memo`?**
3. **Implement `useTimeout` and `useInterval` hooks**

### 💡 Custom Hooks

```javascript
function useTimeout(callback, delay) {
  const callbackRef = useRef(callback);
  
  // Update ref on each render so we always call latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (delay === null) return; // null = paused
    
    const id = setTimeout(() => callbackRef.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

function useInterval(callback, delay) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (delay === null) return;
    
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// React Fiber reconciliation summary:
// 1. Work is split into "fiber" units (one per component/element)
// 2. Each fiber has: type, key, child, sibling, parent, effectTag
// 3. Reconciliation phases:
//    a. Render phase (interruptible): walk fiber tree, diff, create work-in-progress tree
//    b. Commit phase (synchronous): apply all DOM mutations at once
// 4. Keys help: identify which items moved/added/removed in lists
//    Without keys: reconciler pairs children by index → wrong updates
//    With keys: reconciler creates map, matches by key → correct minimal DOM ops

// useMemo vs useCallback vs React.memo:
// useMemo: memoize a computed VALUE → const sorted = useMemo(() => data.sort(), [data])
// useCallback: memoize a FUNCTION reference → same as useMemo(() => fn, deps)
// React.memo: memoize a COMPONENT render → skip re-render if props unchanged (shallow compare)
// When to use:
// - React.memo: expensive child component receiving same props from re-rendering parent
// - useCallback: function passed as prop to React.memo'd child
// - useMemo: expensive computation that shouldn't re-run on every render
```

---

## 🎯 Key Takeaways
- Cred FE = **animations + gamification + premium UX** — unique interview style
- **Scratch card** with Canvas: `destination-out` composite for erasing, pixel-count for percentage
- **Touch support**: `touchAction: 'none'` to prevent scroll, use `touches[0]` for coordinates
- **Coin rain animation**: CSS keyframes with randomized delays + positions
- **React Fiber**: interruptible render phase + synchronous commit phase
- **useInterval/useTimeout hooks**: use ref for callback to avoid stale closures
- Cred values **pixel-perfect animations** and **premium design** — their bar is visual fidelity
- Scratch card reveal threshold (60%) — auto-reveal when enough is scratched

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Canvas Scratch Card, CSS Animations |
| JavaScript | Medium-Hard | React Fiber, Hooks, Memoization |
| System Design | Hard | Rewards Platform, Gamification |
| Founder | Hard | Product Sense, Culture Fit |
