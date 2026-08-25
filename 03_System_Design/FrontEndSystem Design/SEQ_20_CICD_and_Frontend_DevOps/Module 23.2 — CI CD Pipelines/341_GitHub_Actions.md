# 341 – GitHub Actions – Workflows, Jobs, Matrix Builds, Caching

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
GitHub Actions is CI/CD built into GitHub. **Workflows** (YAML files triggered by events) contain **jobs** (parallel by default) with **steps**. **Matrix builds** run the same job across multiple configurations (Node versions, browsers). **Caching** speeds up installs by persisting `node_modules`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'  # built-in npm caching
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck  # sequential dependency
    strategy:
      matrix:
        node-version: [18, 20]
        shard: [1/3, 2/3, 3/3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --shard=${{ matrix.shard }}

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with: { name: build-output }
      - run: echo "Deploy to production"
```

### Key Concepts
| Concept | Purpose |
|---|---|
| `on` | Trigger events (push, PR, schedule, workflow_dispatch) |
| `needs` | Job dependencies (sequential) |
| `matrix` | Run across configurations |
| `if` | Conditional execution |
| `cache` | Persist downloads across runs |
| `artifacts` | Pass data between jobs |
| `environment` | Deployment protection rules |
| `secrets` | Encrypted variables |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I structure GitHub Actions as: lint/typecheck → test (matrix: Node versions × shards) → build → deploy. Caching cuts install time from 60s to 5s. Matrix builds give confidence across Node versions. I use needs for sequencing and environment protection for production deploys."*

## 4. 🧠 MEMORY AID
**"Workflow → Jobs → Steps. Jobs parallel by default, needs for sequence. Matrix = cross-product. Cache npm for speed."**

## 5. 🎯 KEY INSIGHT
Use `npm ci` (not `npm install`) in CI — it's faster, deterministic, and respects the lockfile exactly.
