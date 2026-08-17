# 62. Performance Budgets

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Performance budgets** are quantitative limits set on metrics that affect web performance and user experience. They act as guardrails during development to prevent performance regressions.

### What it is:
A performance budget is a set of constraints imposed on:
- **JavaScript bundle size** (e.g., initial JS < 170KB gzipped)
- **Total page weight** (e.g., total assets < 2MB)
- **Performance metrics** (e.g., LCP < 2.5s, TTI < 3.5s)
- **Number of requests** (e.g., < 50 requests on initial load)
- **Third-party scripts** (e.g., analytics/ads < 100KB total)

### Why it exists:
- **Prevents performance degradation** over time ("death by a thousand cuts")
- **Makes performance measurable and accountable**
- **Forces teams to prioritize what ships**
- **Protects user experience**, especially on slower networks/devices
- **Reduces business impact** (slower sites = lower conversions, higher bounce rates)

### When and where it's used:
- **During development**: Pre-commit hooks, CI/CD pipelines
- **Code reviews**: Bundle analysis reports
- **Release gates**: Automated checks before production deployment
- **Monitoring**: Continuous tracking in production (RUM data)
- **Planning**: Feature prioritization based on budget availability

### Role in large-scale applications:
In enterprise applications with multiple teams, performance budgets:
- **Prevent feature creep** from degrading UX
- **Create shared ownership** of performance
- **Enable data-driven conversations** ("We're 20KB over budget")
- **Support A/B testing** by quantifying performance impact
- **Align business goals** with technical constraints

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Architecture and Implementation

**Budget Categories:**

1. **Quantity-based budgets** (easiest to track):
   - Bundle size limits
   - Number of HTTP requests
   - Total page weight
   - Number of fonts loaded
   
2. **Time-based budgets** (user-centric):
   - FCP < 1.8s
   - LCP < 2.5s
   - TTI < 3.5s
   - TBT < 300ms
   - CLS < 0.1
   
3. **Rule-based budgets**:
   - Maximum image dimensions
   - No synchronous scripts in `<head>`
   - Maximum depth of component nesting
   - Maximum Redux store size

### Browser & Network Considerations

**Why bundle size matters:**
```
Parse + Compile + Execute time for JavaScript:
- 170KB (gzipped) ≈ 600KB (uncompressed) ≈ 1-3s on mid-tier mobile
- Every additional 100KB adds ~300-500ms on slow 3G
```

**Critical rendering path impact:**
- Larger CSS = delayed CSSOM = delayed first render
- Larger JS = longer parse time = delayed interactivity
- More requests = more RTTs = slower overall load

### Performance Implications

**Measurement approaches:**

1. **Lab-based (Lighthouse CI)**:
   - Consistent environment
   - Fast feedback
   - May not reflect real users
   
2. **Field-based (RUM - Real User Monitoring)**:
   - Actual user experience
   - Network variability included
   - Geographic and device diversity
   
3. **Synthetic monitoring**:
   - Scheduled tests from multiple locations
   - Tracks trends over time

### Scalability Considerations

**Multi-team challenges:**
- Team A ships 50KB → Team B now has 120KB left
- Need **budgets per route/page**, not just global
- Shared dependencies counted against multiple teams
- Micro-frontends each need sub-budgets

**Budget allocation strategies:**
```
Total budget: 200KB JS
- Framework/core: 80KB (40%)
- Feature code: 80KB (40%)
- Third-party: 30KB (15%)
- Buffer: 10KB (5%)
```

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Strict budgets** | Prevents bloat, enforces discipline | Can block urgent features |
| **Flexible budgets** | Allows exceptions for high-value features | Slippery slope, exceptions become norm |
| **Per-route budgets** | Granular control, fair allocation | Complex to manage, harder to track |
| **Metric-based only** | User-centric | Hard to debug (many factors affect metrics) |

### Best Practices in Production

1. **Set baseline from 75th percentile** of current performance
2. **Budget for P75 or P90**, not median (protects slower users)
3. **Include third-party in budgets** (analytics, ads, chat widgets)
4. **Create budget dashboards** visible to entire team
5. **Automate enforcement** in CI/CD
6. **Review quarterly** based on real user data

### Common Pitfalls

1. **Setting unrealistic budgets** that get ignored
2. **Only measuring at build time**, not runtime
3. **Ignoring mobile/slow network** scenarios
4. **Not accounting for code loaded after initial render**
5. **Forgetting about CSS and images** (focusing only on JS)
6. **No process for budget exceptions**
7. **Static budgets** that never adapt to business needs

### Real-World Failure Scenarios

**Case 1: The "One More Library" Problem**
- Team adds 40KB library for one feature
- Crosses budget by 10KB
- "It's just 10KB" mentality spreads
- 6 months later: 200KB over budget, site is 40% slower

**Case 2: Third-Party Budget Violation**
- Marketing adds new tracking script (50KB)
- Not included in frontend team's build
- Bypasses all budget checks
- Users experience degraded performance

**Case 3: Mobile-Only Budget Breach**
- Budget set based on desktop testing
- Mobile users on 3G hit 10s TTI
- Budget looked fine in CI but fails in production

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Product Page

**Initial Budget:**
```
Total JS: 250KB (gzipped)
- Core framework (React): 45KB
- Product display logic: 80KB
- Recommendations engine: 60KB
- Payment integration: 40KB
- Buffer: 25KB
```

**Budget exceeded scenario:**
- Team adds AR feature (try-on visualization): +90KB
- Options:
  1. **Lazy load AR** → only loads when user clicks "Try On"
  2. **Remove recommendations** temporarily
  3. **Request budget increase** with business justification (AR increases conversion by 15%)

**Evolution at scale:**
```
Year 1: 250KB budget
Year 2: Split by route
  - /product → 250KB
  - /checkout → 180KB (minimal UI)
  - /search → 200KB (includes filtering)
```

### Example 2: FAANG-Scale Dashboard (Like Google Analytics)

**Time-based budget:**
```
Page: Dashboard homepage
- FCP < 1.5s (P75)
- LCP < 2.5s (P75)
- TTI < 3.5s (P75)
- Bundle < 300KB (gzipped)
```

**Monitoring strategy:**
```javascript
// Lighthouse CI in GitHub Actions
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/dashboard'],
      numberOfRuns: 5
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'first-contentful-paint': ['error', {maxNumericValue: 1500}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'interactive': ['error', {maxNumericValue: 3500}],
        'total-byte-weight': ['error', {maxNumericValue: 307200}]
      }
    }
  }
};
```

### Example 3: News Website (JS Yatra-Style Widget)

**Embeddable poll widget budget:**
```
Constraint: Must be lightweight (site owner concern)
- Total size: < 15KB gzipped
- No external dependencies (bundle everything)
- Render within 500ms
- Support IE11 (broader adoption)
```

**Implementation:**
- Used Preact (3KB) instead of React (45KB)
- Inlined CSS (2KB)
- Zero animations (no animation library)
- Manual XHR (no Axios/Fetch polyfill)

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question: "How do you approach performance budgets in a large-scale application?"**

**Strong Answer:**

"Performance budgets are quantitative constraints we set to prevent performance degradation. I categorize them into three types: quantity-based like bundle size, time-based like LCP and TTI, and rule-based like no synchronous scripts.

In my previous role, we implemented a multi-tier budget system. At the build level, we used Webpack Bundle Analyzer with size limits enforced in CI. For example, our main bundle couldn't exceed 170KB gzipped. We also had per-route budgets—checkout was stricter at 120KB since conversion was critical.

At the runtime level, we used Lighthouse CI in our deployment pipeline. We set P75 targets: FCP under 1.8s, LCP under 2.5s, and TTI under 3.5s. If any build violated these, it blocked deployment.

The challenge with multiple teams was budget allocation. We adopted a 40-40-20 rule: 40% for core framework, 40% for feature code, 20% for third-party scripts and buffer. Each team got a sub-budget for their features.

We also tracked real user data through RUM, which caught issues lab tests missed—like third-party scripts added by marketing that bypassed our build checks. This led to a 'third-party budget' policy where all external scripts required approval and were included in total budget.

The key trade-off is between strictness and flexibility. Too strict blocks legitimate features; too flexible and budgets become meaningless. We handled exceptions through a 'performance council' review where teams justified budget increases with business metrics—like 'this 50KB feature increases engagement by 20%.'

Quarterly, we reviewed budgets against P90 RUM data and adjusted based on device/network mix and business priorities."

### Likely Follow-Up Questions

1. **"What happens when you need to exceed the budget for a critical feature?"**
   - Budget exception process
   - Temporary vs permanent increase
   - Offsetting by removing other features
   - Lazy loading strategies

2. **"How do you handle third-party scripts in your budget?"**
   - Tag management systems
   - Third-party budgets
   - Facade patterns for analytics
   - Monitoring third-party performance

3. **"How do you enforce budgets across multiple teams?"**
   - Automated CI/CD checks
   - Shared dashboards
   - Budget ownership model
   - Cross-team performance reviews

4. **"What metrics do you prioritize for budgets?"**
   - User-centric metrics (Core Web Vitals)
   - Business metrics (conversion, bounce rate)
   - Lab vs field data trade-offs

5. **"How do you account for different devices and networks?"**
   - Budget for P75/P90, not median
   - Device-specific testing in CI
   - Network throttling simulation
   - Progressive enhancement strategies

### Comparison with Alternatives

| Approach | When to Use | Drawbacks |
|----------|-------------|-----------|
| **No budget** (reactive) | Very small teams, prototypes | Performance degrades over time |
| **Simple size limits** | Starting point | Doesn't capture user experience |
| **Metric-only budgets** | User-centric products | Harder to debug, many variables |
| **Comprehensive budgets** | Enterprise, multiple teams | Complex to manage, needs tooling |

### Trade-Off Explanations

**Trade-off 1: Strict vs Flexible**
- "We initially had strict budgets that blocked deploys. Teams found workarounds. We shifted to 'budget advisory' with required review for overages. This balanced performance with velocity."

**Trade-off 2: Lab vs Field Data**
- "Lab data (Lighthouse) gives fast, consistent feedback in CI. Field data (RUM) shows real user impact but has more noise. We use both—lab for gates, field for trends."

**Trade-off 3: Global vs Per-Route**
- "Global budgets are simpler but unfair—homepage needs more JS than a static FAQ. Per-route budgets are fair but require more tooling. We use per-route for core flows, global for everything else."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Webpack Bundle Size Budget

```javascript
// webpack.config.js
module.exports = {
  // ...other config
  performance: {
    maxAssetSize: 250000, // 250KB
    maxEntrypointSize: 250000,
    hints: 'error', // Fail build if exceeded
    assetFilter: function(assetFilename) {
      // Only check JS bundles
      return assetFilename.endsWith('.js');
    }
  },
  
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ]
};
```

**Why structured this way:**
- `hints: 'error'` makes budget violation fail the build (hard enforcement)
- `assetFilter` focuses on JS (biggest performance impact)
- `BundleAnalyzerPlugin` provides visual feedback for developers

**Production considerations:**
- Add separate budgets for CSS, images
- Different budgets per entry point (main, vendor, async chunks)
- Integrate with CI to post bundle size comments on PRs

### Example 2: Lighthouse CI Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      staticDistDir: './build',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/product/123',
        'http://localhost:3000/checkout'
      ],
      numberOfRuns: 3,
      settings: {
        // Simulate slow 4G
        throttling: {
          rttMs: 150,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 4
        }
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'first-contentful-paint': ['error', {maxNumericValue: 1800}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'interactive': ['error', {maxNumericValue: 3500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
        'total-blocking-time': ['error', {maxNumericValue: 300}],
        
        // Size budgets
        'total-byte-weight': ['error', {maxNumericValue: 2000000}], // 2MB
        'resource-summary:script:size': ['error', {maxNumericValue: 200000}], // 200KB
        'resource-summary:stylesheet:size': ['error', {maxNumericValue: 50000}], // 50KB
        
        // Resource counts
        'resource-summary:script:count': ['warn', {maxNumericValue: 15}],
        'resource-summary:third-party:count': ['warn', {maxNumericValue: 5}]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

**Why structured this way:**
- Multiple URLs test different pages with different budgets
- Throttling simulates realistic conditions (not lab-only)
- Both metric and size assertions cover different aspects
- 'error' vs 'warn' creates hard vs soft limits

**Interview setting changes:**
- In interview, explain thresholds (don't need exact numbers)
- Emphasize P75 target setting methodology
- Mention integration with GitHub Actions/Jenkins

### Example 3: Custom Budget Monitor Hook (React)

```javascript
// useBudgetMonitor.js
import { useEffect } from 'react';

export function useBudgetMonitor(componentName) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Track component mount time
      const mountStart = performance.now();
      
      return () => {
        const mountDuration = performance.now() - mountStart;
        
        // Budget: Components should mount in < 50ms
        if (mountDuration > 50) {
          console.warn(
            `⚠️ Performance Budget Warning: ${componentName} ` +
            `took ${mountDuration.toFixed(2)}ms to mount (budget: 50ms)`
          );
          
          // In CI, fail the test
          if (process.env.CI) {
            throw new Error(`Performance budget exceeded for ${componentName}`);
          }
        }
      };
    }
  }, [componentName]);
}

// Usage
function ExpensiveComponent() {
  useBudgetMonitor('ExpensiveComponent');
  
  // ...component logic
}
```

**Why this approach:**
- Catches performance issues during development
- Component-level granularity helps identify culprits
- Fails in CI, warns locally (good developer experience)
- Low overhead (development only)

**Production changes:**
- Use real user monitoring instead
- Track render time, not mount time
- Aggregate metrics to analytics service

### Example 4: Bundle Size Check in CI (GitHub Actions)

```yaml
# .github/workflows/performance-budget.yml
name: Performance Budget Check

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Check bundle size
        run: |
          # Get main bundle size
          BUNDLE_SIZE=$(du -k build/static/js/main.*.js | cut -f1)
          BUDGET=250
          
          echo "Bundle size: ${BUNDLE_SIZE}KB"
          echo "Budget: ${BUDGET}KB"
          
          if [ $BUNDLE_SIZE -gt $BUDGET ]; then
            echo "❌ Bundle size exceeds budget!"
            exit 1
          else
            echo "✅ Bundle size within budget"
          fi
          
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
          
      - name: Comment PR
        uses: actions/github-script@v5
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('.lighthouseci/manifest.json'));
            const comment = `
            ## 📊 Performance Budget Report
            
            | Metric | Score | Budget | Status |
            |--------|-------|--------|--------|
            | LCP | ${report.lcp} | 2.5s | ${report.lcp < 2.5 ? '✅' : '❌'} |
            | FCP | ${report.fcp} | 1.8s | ${report.fcp < 1.8 ? '✅' : '❌'} |
            | Bundle | ${report.size}KB | 250KB | ${report.size < 250 ? '✅' : '❌'} |
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

**Why structured this way:**
- Automated checks catch regressions early
- PR comments provide visibility to entire team
- Fails CI if budget exceeded (prevents merging)
- Tracks both size and metrics

### Example 5: Performance Budget Dashboard Component

```javascript
// BudgetDashboard.jsx
import { useEffect, useState } from 'react';

function BudgetDashboard() {
  const [budgets, setBudgets] = useState([]);
  
  useEffect(() => {
    // Fetch from RUM service
    fetch('/api/performance/budgets')
      .then(res => res.json())
      .then(setBudgets);
  }, []);
  
  return (
    <div className="budget-dashboard">
      <h2>Performance Budgets (Last 7 Days)</h2>
      {budgets.map(budget => (
        <BudgetCard key={budget.id} budget={budget} />
      ))}
    </div>
  );
}

function BudgetCard({ budget }) {
  const percentage = (budget.actual / budget.limit) * 100;
  const status = percentage <= 100 ? 'good' : 'exceeded';
  
  return (
    <div className={`budget-card budget-card--${status}`}>
      <h3>{budget.name}</h3>
      <div className="budget-bar">
        <div 
          className="budget-bar__fill"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="budget-stats">
        <span>{budget.actual.toFixed(1)}{budget.unit}</span>
        <span>/</span>
        <span>{budget.limit}{budget.unit}</span>
        <span className={`badge badge--${status}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      {status === 'exceeded' && (
        <div className="budget-warning">
          ⚠️ Over budget by {(budget.actual - budget.limit).toFixed(1)}{budget.unit}
        </div>
      )}
    </div>
  );
}

export default BudgetDashboard;
```

**Why structured this way:**
- Real-time visibility for entire team
- Visual representation (bar graph) is intuitive
- Clearly shows exceeded budgets
- Can be embedded in team dashboards

**Production enhancements:**
- Add time-series graph (trend over time)
- Drill-down to specific routes/pages
- Alert integration (Slack notification on breach)
- Historical comparison

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- Faster sites = better engagement, lower bounce rates
- Every 100ms delay reduces conversions by ~1%
- Mobile users on slower networks disproportionately affected

**Business Impact:**
- Amazon: 100ms delay = 1% revenue loss
- Google: 500ms delay = 20% drop in traffic
- Pinterest: 40% reduction in wait time = 15% increase in SEO traffic

**Engineering Culture:**
- Creates shared responsibility for performance
- Makes performance objective, not subjective
- Prevents "tragedy of the commons" (everyone adding "just a little more")

### How It Works

**Technical Summary:**

1. **Define budgets** based on baseline + user research
   - Set quantity limits (KB, request count)
   - Set time limits (LCP, TTI, CLS)
   - Prioritize P75 or P90 (protect slower users)

2. **Measure in multiple places:**
   - Build time: Webpack, Rollup plugin checks
   - CI/CD: Lighthouse CI, bundle size checks
   - Production: RUM (Real User Monitoring)

3. **Enforce through automation:**
   - Pre-commit hooks (local validation)
   - CI fails if budget exceeded
   - Monitoring alerts in production

4. **Review and adapt:**
   - Quarterly budget review with RUM data
   - Adjust based on device/network mix changes
   - Rebalance between teams/features

**Mental Model:**
Think of performance budgets like financial budgets:
- You have limited "space" (bytes/milliseconds)
- Every feature "costs" something
- You must prioritize and make trade-offs
- Going over budget has consequences
- Regular audits prevent overspending

---

**Key Takeaway for Interviews:**
Performance budgets transform performance from a subjective goal into an objective, measurable, enforceable constraint. At scale, they're essential for preventing degradation across multiple teams and ensuring consistent user experience. The key is balancing strictness with pragmatism—too rigid blocks progress, too loose becomes meaningless.
