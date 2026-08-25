# 471 – React Profiler API

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**React Profiler API** measures rendering performance programmatically. `<Profiler>` component wraps subtrees and calls `onRender` with timing data. **React DevTools Profiler** provides visual flame graphs. Use to find slow renders, unnecessary re-renders, and expensive components.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── PROFILER COMPONENT ────
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRender: ProfilerOnRenderCallback = (
  id,               // Profiler id prop
  phase,            // "mount" | "update" | "nested-update"
  actualDuration,   // ms spent rendering this update
  baseDuration,     // ms to render entire subtree without memoization
  startTime,        // when React began rendering this update
  commitTime,       // when React committed this update
) => {
  // Log to analytics or console
  if (actualDuration > 16) { // slower than 60fps frame
    console.warn(`Slow render: ${id} took ${actualDuration.toFixed(2)}ms (phase: ${phase})`);
  }
  
  // Send to monitoring
  performance.mark(`react-render-${id}`);
  sendToAnalytics({
    component: id,
    phase,
    actualDuration,
    baseDuration,
    timestamp: commitTime,
  });
};

function App() {
  return (
    <Profiler id="App" onRender={onRender}>
      <Profiler id="Header" onRender={onRender}>
        <Header />
      </Profiler>
      
      <Profiler id="MainContent" onRender={onRender}>
        <MainContent />
      </Profiler>
      
      <Profiler id="Sidebar" onRender={onRender}>
        <Sidebar />
      </Profiler>
    </Profiler>
  );
}

// ──── PRODUCTION PROFILING ────
// React strips Profiler in production by default
// Enable with: react-dom/profiling
// next.config.js
module.exports = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      };
    }
    return config;
  },
};

// ──── REACT DEVTOOLS PROFILER (visual) ────
// 1. Open React DevTools → Profiler tab
// 2. Click Record → interact with app → Stop
// 3. Analyze:
//    - Flame Graph: component render times (width = duration)
//    - Ranked: components sorted by render time
//    - Why did this render? (enable in settings)
//    - Commits: each render commit with timing

// ──── CUSTOM PERFORMANCE HOOK ────
function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  renderCount.current++;
  
  useEffect(() => {
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
}

function useRenderTiming(componentName: string) {
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    const duration = performance.now() - startTime.current;
    if (duration > 16) {
      console.warn(`${componentName} render: ${duration.toFixed(2)}ms`);
    }
    startTime.current = performance.now();
  });
}

// ──── WHY-DID-YOU-RENDER (debugging tool) ────
// npm install @welldone-software/why-did-you-render
// Logs unnecessary re-renders with prop/state diffs

// wdyr.ts
import React from 'react';
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    logOnDifferentValues: true,
  });
}

// On component:
MyComponent.whyDidYouRender = true;

// Console output:
// MyComponent re-rendered because:
// Props changed: onClick (prev fn !== next fn)
// → Fix with useCallback
```

### Key Metrics
| Metric | What It Tells You |
|---|---|
| actualDuration | How long this render took |
| baseDuration | Cost without memoization |
| phase | Mount vs update |
| Flame graph width | Relative render time |
| Render count | How often component re-renders |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"<Profiler onRender={callback}> wraps subtrees to measure actualDuration (render time) and baseDuration (without memo). DevTools Profiler: flame graphs, ranked view, 'why did this render'. why-did-you-render library shows prop/state diffs causing re-renders. Production profiling: react-dom/profiling build."*

## 4. 🧠 MEMORY AID
**"<Profiler id onRender> → actualDuration (real) vs baseDuration (no memo). DevTools: flame graph + ranked. why-did-you-render for prop diffs."**
