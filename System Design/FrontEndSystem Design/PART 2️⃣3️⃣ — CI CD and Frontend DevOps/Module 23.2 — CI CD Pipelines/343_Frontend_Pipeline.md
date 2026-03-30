# 343 – Frontend Pipeline: Lint → Type-Check → Test → Build → Deploy

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
The standard frontend CI pipeline has 5 stages in order: **Lint** (code style) → **Type-Check** (TypeScript) → **Test** (unit + integration) → **Build** (production bundle) → **Deploy** (staging/production). Each stage gates the next — fail early, fail fast.

## 2. 🔬 DEEP-DIVE EXPLANATION

```
┌─────────┐    ┌────────────┐    ┌──────┐    ┌───────┐    ┌────────┐
│  LINT   │───▶│ TYPE-CHECK │───▶│ TEST │───▶│ BUILD │───▶│ DEPLOY │
│  (10s)  │    │   (20s)    │    │ (2m) │    │ (1m)  │    │ (30s)  │
└─────────┘    └────────────┘    └──────┘    └───────┘    └────────┘
   ESLint +       tsc --noEmit     Jest +     Vite/       Vercel /
   Prettier                        RTL      Webpack       CDN
```

```yaml
# Complete pipeline
name: Frontend CI/CD
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  # Stage 1 & 2: Parallel (independent)
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint          # ESLint + Prettier check
      - run: npm run type-check    # tsc --noEmit

  # Stage 3: Tests
  test:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test -- --coverage --ci
      - uses: actions/upload-artifact@v4
        with: { name: coverage, path: coverage/ }

  # Stage 4: Build
  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npx size-limit --check  # bundle size budget
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist/ }

  # Stage 5: Deploy
  deploy-staging:
    needs: build
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist }
      - run: echo "Deploy preview to staging"

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist }
      - run: echo "Deploy to production CDN"
```

### Stage Details
| Stage | Tool | Time | Catches |
|---|---|---|---|
| Lint | ESLint + Prettier | 10s | Style, unused vars, bad patterns |
| Type-Check | tsc --noEmit | 20s | Type errors, missing props |
| Test | Jest + RTL | 2min | Logic bugs, regressions |
| Build | Vite/Webpack | 1min | Import errors, env issues |
| Deploy | Vercel/CDN | 30s | Runtime, integration issues |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"My pipeline gates each stage: lint and type-check run in parallel first (fail in 30s), then tests (fail in 2min), then build with bundle size check, then deploy. PR triggers deploy to staging, main triggers production. At SAP, this pipeline caught 90% of issues before code review."*

## 4. 🧠 MEMORY AID
**"L-T-T-B-D: Lint → Type-check → Test → Build → Deploy. Fail fast: cheapest checks first. Gate each stage."**

## 5. 🎯 KEY INSIGHT
The total pipeline should be under 10 minutes for PRs. Developers stop waiting after 10 minutes and context-switch, losing productivity.
