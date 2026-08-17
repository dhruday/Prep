# 333 – E2E in CI – Parallel Execution, Sharding

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
E2E tests are slow — running them serially in CI can take 30+ minutes. Solutions: **parallelization** (run tests across multiple workers), **sharding** (split tests across CI machines), **selective execution** (only run tests for changed features). This keeps CI fast and reliable.

## 2. 🔬 DEEP-DIVE EXPLANATION

```yaml
# ──── PLAYWRIGHT IN GITHUB ACTIONS WITH SHARDING ────
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]  # 4 parallel CI machines
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --shard=${{ matrix.shard }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
```

```typescript
// ──── PLAYWRIGHT CONFIG FOR CI ────
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  workers: process.env.CI ? 4 : undefined, // 4 parallel workers in CI
  retries: process.env.CI ? 2 : 0,         // retry flaky tests in CI
  reporter: process.env.CI ? 'blob' : 'html',
  use: {
    trace: 'on-first-retry',   // capture trace on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
```

### Strategies
| Strategy | Benefit | Tool |
|---|---|---|
| **Workers** | Parallel within one machine | Playwright --workers=4 |
| **Sharding** | Split across CI machines | Playwright --shard=1/4 |
| **Selective** | Only run affected tests | Custom script + git diff |
| **Matrix** | Cross-browser coverage | GitHub Actions matrix |
| **Retry** | Handle flaky tests | retries: 2 in config |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I use Playwright's built-in sharding to split E2E tests across 4 CI machines, reducing 20-min runs to 5 minutes. Each shard runs a subset of test files. I combine this with 2 retries for flakiness, trace-on-failure for debugging, and selective test execution based on changed files."*

## 4. 🧠 MEMORY AID
**"Shard = split across machines. Workers = parallel within machine. Retry = handle flaky. Trace = debug failures. All combined: fast reliable CI."**

## 5. 🎯 KEY INSIGHT
The #1 rule of E2E in CI: if it takes > 10 minutes, developers will ignore it. Optimize ruthlessly with sharding, parallelization, and selective execution.
