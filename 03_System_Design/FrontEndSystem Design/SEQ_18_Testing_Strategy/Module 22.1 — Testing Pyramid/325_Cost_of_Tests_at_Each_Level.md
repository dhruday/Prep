# 325 – Cost of Tests at Each Level

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Each test level has different costs: **write time**, **run time**, **maintenance**, **flakiness**, and **confidence**. The optimal investment maximizes confidence per dollar. Unit tests are cheap to run but may not catch real bugs. E2E tests catch real bugs but are expensive to maintain.

## 2. 🔬 DEEP-DIVE EXPLANATION

| Cost Dimension | Unit | Integration | E2E |
|---|---|---|---|
| **Write Time** | Minutes | 15-30 min | 30-60 min |
| **Run Time** | 1-10ms | 50-500ms | 2-30s |
| **Maintenance** | Low (if testing behavior) | Medium | High |
| **Flakiness** | ~0% | ~2% | 5-15% |
| **Bug Detection** | Logic errors only | Interface + logic | Real user flows |
| **CI Cost** | Seconds | Minutes | 5-15 min |
| **Confidence** | Low-Medium | High | Very High |
| **Refactor Resilience** | Breaks on implementation change | Survives refactors | Survives refactors |

### ROI Analysis
```
Confidence per $ spent:

Integration ████████████████████  (highest ROI)
E2E          ████████████         (high confidence, high cost)
Unit         ██████████           (low cost, low confidence for UI)
Static       ████████████████     (nearly free with TS + ESLint)
```

### Hidden Costs
- **Flaky E2E**: Each flaky test wastes 15-30 min of developer investigation
- **Over-mocked units**: Tests pass but production breaks (false confidence)
- **Snapshot tests**: Low effort but catch noise, not real bugs
- **Slow CI**: If pipeline > 15 min, developers skip it

### Cost Optimization Strategies
```typescript
// 1. Static analysis catches 30-40% of bugs for FREE
// TypeScript + strict ESLint + Prettier

// 2. Integration tests: test behavior, not implementation
// BAD (tests implementation)
expect(component.state.count).toBe(1);
// GOOD (tests behavior)
expect(screen.getByText('Count: 1')).toBeInTheDocument();

// 3. E2E: only critical paths, parallelize
// Playwright: 5 critical flows × 3 browsers = 15 tests
// With sharding: runs in <5 min

// 4. Visual regression: catches CSS bugs cheaply
// Storybook + Chromatic: per-component snapshots
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I optimize test spend for maximum confidence per dollar. TypeScript eliminates type bugs for free. Integration tests (RTL) give the highest ROI for UI — they test what users see and survive refactors. E2E tests cover 5-10 critical paths. At SAP, we reduced CI time from 25 to 8 minutes by converting over-mocked unit tests to focused integration tests."*

## 4. 🧠 MEMORY AID
**"Static analysis = free bugs caught. Integration = highest ROI. E2E = highest confidence, highest cost. Optimize: test behavior not implementation."**

## 5. 🎯 KEY INSIGHT
A test that doesn't catch real bugs is a liability, not an asset. Better to have 50 high-quality integration tests than 500 shallow unit tests.
