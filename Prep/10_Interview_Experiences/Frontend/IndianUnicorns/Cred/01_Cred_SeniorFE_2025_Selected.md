# Cred — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/cred-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + Culture Fit)
- **Timeline:** 2 weeks
- **Note:** CRED values craft & polish — UI quality matters as much as logic

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build an Animated Credit Score Widget** (React)
   - Circular gauge with animated fill, score breakdown, spending insights
   - Must have smooth animations (CSS transitions or requestAnimationFrame)

### 💡 Interview-Ready Answer

```javascript
import { useState, useEffect, useRef } from 'react';

function CreditScoreGauge({ score, maxScore = 900, minScore = 300 }) {
  const [animatedScore, setAnimatedScore] = useState(minScore);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const percentage = ((score - minScore) / (maxScore - minScore)) * 100;
  
  // Animate score counting up
  useEffect(() => {
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();
    const startScore = minScore;
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic: starts fast, decelerates
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setAnimatedScore(Math.round(startScore + (score - startScore) * eased));
      setAnimatedProgress(percentage * eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  }, [score, percentage, minScore]);
  
  // Determine color based on score
  const getColor = (score) => {
    if (score >= 750) return '#00C853'; // Excellent - green
    if (score >= 650) return '#FFD600'; // Good - yellow
    if (score >= 550) return '#FF9100'; // Fair - orange
    return '#FF1744'; // Poor - red
  };
  
  const getLabel = (score) => {
    if (score >= 750) return 'Excellent';
    if (score >= 650) return 'Good';
    if (score >= 550) return 'Fair';
    return 'Needs Work';
  };
  
  // SVG circular gauge
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - animatedProgress / 100 * 0.75); // 75% arc
  
  return (
    <div className="credit-score-widget" role="meter" 
         aria-valuenow={score} aria-valuemin={minScore} aria-valuemax={maxScore}
         aria-label={`Credit score: ${score} out of ${maxScore}`}>
      <svg viewBox="0 0 200 200" className="gauge-svg">
        {/* Background arc */}
        <circle cx="100" cy="100" r={radius}
          fill="none" stroke="#2a2a2a" strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
          transform="rotate(135 100 100)" />
        
        {/* Progress arc */}
        <circle cx="100" cy="100" r={radius}
          fill="none" stroke={getColor(animatedScore)} strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(135 100 100)"
          style={{ transition: 'stroke 0.3s ease' }} />
        
        {/* Score text */}
        <text x="100" y="90" textAnchor="middle" className="score-number"
              fill="white" fontSize="36" fontWeight="bold">
          {animatedScore}
        </text>
        <text x="100" y="115" textAnchor="middle" className="score-label"
              fill={getColor(animatedScore)} fontSize="14">
          {getLabel(animatedScore)}
        </text>
        <text x="100" y="135" textAnchor="middle" fill="#888" fontSize="11">
          out of {maxScore}
        </text>
      </svg>
    </div>
  );
}

function CreditScoreDashboard() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Simulated API
    setTimeout(() => {
      setData({
        score: 782,
        factors: [
          { name: 'Payment History', impact: 'positive', weight: 35, detail: 'All bills paid on time' },
          { name: 'Credit Utilization', impact: 'neutral', weight: 30, detail: '45% utilization' },
          { name: 'Credit Age', impact: 'positive', weight: 15, detail: '6 years average' },
          { name: 'Credit Mix', impact: 'positive', weight: 10, detail: '3 types of credit' },
          { name: 'Hard Inquiries', impact: 'negative', weight: 10, detail: '2 in last 6 months' },
        ]
      });
    }, 500);
  }, []);
  
  if (!data) return <SkeletonLoader />;
  
  return (
    <div className="dashboard">
      <CreditScoreGauge score={data.score} />
      
      <div className="factors-section">
        <h3>Score Breakdown</h3>
        {data.factors.map((factor, i) => (
          <FactorRow key={i} factor={factor} delay={i * 100} />
        ))}
      </div>
    </div>
  );
}

function FactorRow({ factor, delay }) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  const impactColors = { positive: '#00C853', neutral: '#FFD600', negative: '#FF1744' };
  
  return (
    <div className={`factor-row ${visible ? 'visible' : ''}`}
         style={{ transitionDelay: `${delay}ms` }}>
      <div className="factor-header">
        <span className="factor-name">{factor.name}</span>
        <span className="factor-impact" style={{ color: impactColors[factor.impact] }}>
          {factor.impact === 'positive' ? '↑' : factor.impact === 'negative' ? '↓' : '→'}
        </span>
      </div>
      <div className="factor-bar">
        <div className="factor-fill" 
             style={{ width: visible ? `${factor.weight}%` : '0%',
                      background: impactColors[factor.impact] }} />
      </div>
      <div className="factor-detail">{factor.detail}</div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Loading credit score">
      <div className="skeleton-circle pulse" />
      <div className="skeleton-line pulse" />
      <div className="skeleton-line pulse" style={{ width: '80%' }} />
      <div className="skeleton-line pulse" style={{ width: '60%' }} />
    </div>
  );
}
```

```css
.factor-row { opacity: 0; transform: translateY(10px); transition: all 0.4s ease-out; }
.factor-row.visible { opacity: 1; transform: translateY(0); }
.factor-fill { height: 6px; border-radius: 3px; transition: width 0.8s ease-out; }
.skeleton .pulse { animation: pulse 1.5s infinite; background: linear-gradient(90deg, #222 25%, #333 50%, #222 75%); background-size: 200% 100%; }
@keyframes pulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

---

## Round 2: React + Performance
**Duration:** 45 minutes

### Questions Asked
1. **React Fiber Architecture — explain reconciliation**
2. **useMemo vs useCallback vs React.memo — when to use each**
3. **Build an infinite scrolling list that doesn't re-render existing items**

### 💡 React Fiber Explanation

```
React Fiber Architecture:
- Fiber = unit of work (one per React element in the tree)
- Each fiber: { type, props, stateNode, child, sibling, return, alternate }

Old (Stack Reconciler): synchronous, recursive, can't pause
New (Fiber): linked list, can pause/resume, priority-based

Reconciliation:
1. setState → create new fiber tree ("work-in-progress")
2. Compare with current tree: same type? → update. Different? → replace.
3. Work loop: process one fiber → check if browser needs to paint → yield
4. requestIdleCallback (conceptual) → resume when browser is idle
5. Commit phase: apply all DOM mutations at once (synchronous, can't pause)

Two phases:
- Render (interruptible): diff old vs new, compute changes
- Commit (synchronous): apply to DOM, run effects, refs
```

### 💡 useMemo vs useCallback vs React.memo

```javascript
// React.memo: prevents re-render if props haven't changed (shallow compare)
const ExpensiveChild = React.memo(({ data, onClick }) => {
  return <div onClick={onClick}>{data.name}</div>;
});

// useCallback: memoizes function reference (prevents breaking React.memo)
function Parent({ items }) {
  const handleClick = useCallback((id) => {
    // Without useCallback: new function every render → child always re-renders
    console.log(id);
  }, []); // Empty deps → same reference forever
  
  return items.map(item => (
    <ExpensiveChild key={item.id} data={item} onClick={() => handleClick(item.id)} />
    // ⚠️ BUG: arrow function creates new reference! Fix: pass handleClick + id separately
  ));
}

// useMemo: memoizes computed value
function Dashboard({ transactions }) {
  const totalSpend = useMemo(() => 
    transactions.reduce((sum, t) => sum + t.amount, 0), // Expensive computation
    [transactions] // Only recompute if transactions change
  );
  
  return <div>Total: ₹{totalSpend}</div>;
}

// When to use:
// React.memo → child component receives same props but parent re-renders often
// useCallback → passing callbacks to React.memo'd children
// useMemo → expensive computations or preserving object references
// DON'T overuse → premature optimization adds complexity
```

---

## 🎯 Key Takeaways
- CRED values **craft** — UI polish, animations, skeleton loaders all matter
- **Animated SVG gauge** with requestAnimationFrame = CRED's signature question
- **Easing functions** (cubic ease-out) make animations feel professional
- **Staggered entrance animations** with transition-delay = visual polish
- **React Fiber** understanding (render vs commit phase) expected at senior level
- **React.memo + useCallback combo** = must-know optimization pattern
- **Skeleton loaders** with gradient animation > spinners for perceived performance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | SVG, Animation, rAF, React |
| React + Perf | Hard | Fiber, Reconciliation, Optimization |
| System Design | Medium-Hard | Credit Score Dashboard, Animations |
| Culture Fit | Medium | CRED Values, Craft |
