# 266 – Handling Performance Questions

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Performance questions come in two forms: **(1) "How would you optimize this?"** — tests breadth of performance knowledge, and **(2) "This page is slow, how would you debug it?"** — tests diagnostic process. For both, use a structured framework: **Measure → Identify → Optimize → Verify**. Never jump to solutions ("use React.memo!") without first asking what metric is slow and measuring the baseline. Senior engineers debug with data, not guesswork.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### The MIVE Framework

**M — Measure** (What's the baseline?)
```
"First, I'd measure using Lighthouse, Chrome DevTools Performance tab, 
 and React Profiler. What's the current LCP? How long is the main 
 thread blocked? What's the re-render count?"
```

**I — Identify** (Where's the bottleneck?)
```
Network?  → Large bundles, too many requests, no caching
Rendering? → Excessive re-renders, layout thrashing, unoptimized images
JavaScript? → Long tasks blocking main thread, memory leaks
CSS?       → Render-blocking stylesheets, complex selectors
```

**V — Fix with Verified Technique**
```
Network:    Code splitting, lazy loading, CDN, compression (Brotli)
Rendering:  React.memo, virtualization, CSS containment
JavaScript: Web Workers for heavy computation, debouncing/throttling
CSS:        Critical CSS inlining, preload key fonts
```

**E — Evidence** (Verify the improvement)
```
"After applying lazy loading, LCP improved from 3.2s to 1.4s.
 Bundle size reduced from 2.1MB to 450KB initial load."
```

### Common Interview Performance Questions

| Question | Framework Answer |
|----------|-----------------|
| "The page loads slowly" | Measure LCP/FCP → check bundle size → code split → lazy load → cache |
| "Scrolling is janky" | Check repaints (Performance tab) → virtualize list → use will-change → reduce layout triggers |
| "Memory keeps growing" | DevTools Memory → heap snapshot → find detached DOM nodes / event listeners / closures |
| "API calls are slow" | Network tab → check payload size → implement caching → stale-while-revalidate → pagination |

### Anti-Patterns

- ❌ "Just use React.memo everywhere" — shows no diagnostic skill
- ❌ Optimizing without measuring — premature optimization
- ❌ Only knowing one optimization technique — shows shallow knowledge
- ❌ Not mentioning Core Web Vitals — LCP, FID/INP, CLS

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs
At SAP, I improved Lighthouse performance from 60 to 95 using exactly this framework: measured (Lighthouse audit), identified (large bundle + render-blocking CSS), optimized (lazy loading, critical CSS, image optimization), verified (re-measured post-deployment).

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

*"I use the MIVE framework: Measure first with Lighthouse and DevTools Performance tab. Identify the bottleneck — is it network (large bundle), rendering (excessive re-renders), JavaScript (long tasks), or CSS (render-blocking)? Apply the verified technique for that category. Then re-measure to verify. At SAP, this process took our Lighthouse score from 60 to 95. I never optimize without measuring first."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Example: Diagnosing and fixing slow component rendering

// STEP 1: Measure — use React Profiler
<Profiler id="ProductList" onRender={(id, phase, duration) => {
  console.log(`${id} ${phase} render: ${duration.toFixed(2)}ms`);
  // If > 16ms, we're dropping frames
}}>
  <ProductList />
</Profiler>

// STEP 2: Identify — ProductList re-renders on every parent state change
// Root cause: new array reference created on every render

// STEP 3: Fix
const filteredProducts = useMemo(
  () => products.filter(p => p.category === selectedCategory),
  [products, selectedCategory]
);

const ProductList = React.memo(function ProductList({ items }: { items: Product[] }) {
  return (
    <Virtuoso
      data={items}
      itemContent={(_, item) => <ProductCard product={item} />}
    />
  );
});

// STEP 4: Verify — re-render time dropped from 45ms to 2ms ✓
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"MIVE = Measure, Identify, Verify fix, Evidence."** Never say "use memo" without first asking what's slow. Categories: Network (bundle), Rendering (re-renders), JavaScript (long tasks), CSS (blocking). Always mention your SAP Lighthouse 60→95 story. Core Web Vitals: LCP, INP, CLS.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Performance questions test diagnostic thinking, not just knowledge of optimization techniques.
**How:** MIVE framework — Measure baseline, Identify bottleneck category, apply Verified technique, show Evidence of improvement.
**Companies:** All four test performance. Adobe and Microsoft deep-dive into Core Web Vitals and rendering pipeline.
