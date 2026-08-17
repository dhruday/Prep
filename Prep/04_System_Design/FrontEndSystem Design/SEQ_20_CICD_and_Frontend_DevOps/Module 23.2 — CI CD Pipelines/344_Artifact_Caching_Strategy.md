# 344 – Artifact Caching Strategy in CI

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
CI caching stores `node_modules`, build outputs, and other artifacts between runs to avoid re-downloading/re-building. Proper caching can reduce pipeline time by 50-80%. Key: cache by lockfile hash, invalidate on dependency changes.

## 2. 🔬 DEEP-DIVE EXPLANATION

### What to Cache
| Artifact | Key | Impact |
|---|---|---|
| `node_modules` | hash of package-lock.json | Save 30-60s install |
| `.next/cache` | Previous build hash | Faster Next.js builds |
| `~/.cache/Cypress` | Cypress version | Save 20s binary download |
| `~/.cache/ms-playwright` | Playwright version | Save 30s browser download |
| Turbo cache | Content hash | Skip unchanged packages |

```yaml
# ──── GITHUB ACTIONS CACHING ────
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'  # Built-in: caches ~/.npm by package-lock.json hash

# ──── CUSTOM CACHE (more control) ────
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
      .next/cache
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-  # fallback to partial match

# ──── TURBO REPO REMOTE CACHE ────
- name: Turbo Cache
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ github.sha }}
    restore-keys: turbo-

# ──── PLAYWRIGHT BROWSER CACHE ────
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ hashFiles('**/package-lock.json') }}
```

```groovy
// ──── JENKINS CACHING ────
pipeline {
    options {
        // Stash/unstash between stages
    }
    stages {
        stage('Install') {
            steps {
                // Jenkins doesn't have built-in caching like GH Actions
                // Use custom workspace persistence or Docker layer caching
                sh '''
                    if [ -f node_modules/.cache-key ] && [ "$(cat node_modules/.cache-key)" = "$(md5sum package-lock.json | cut -d' ' -f1)" ]; then
                        echo "Cache hit"
                    else
                        npm ci
                        md5sum package-lock.json | cut -d' ' -f1 > node_modules/.cache-key
                    fi
                '''
            }
        }
    }
}
```

### Best Practices
1. **Key by lockfile hash** — exact match for dependencies
2. **Use restore-keys** — fallback to stale cache (faster than cold install)
3. **Separate caches** — node_modules, build cache, test cache independently
4. **Cache size limit** — GitHub: 10GB per repo, oldest evicted first
5. **Don't cache build output** — use artifacts for passing between jobs

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I cache node_modules by package-lock.json hash with restore-keys as fallback. For monorepos, Turbo remote cache skips unchanged packages entirely. At SAP, proper caching reduced our CI pipeline from 12 minutes to 4 minutes."*

## 4. 🧠 MEMORY AID
**"Cache key = lockfile hash. Restore-key = stale fallback. Separate caches for deps, build, browsers. Artifacts for job-to-job data."**

## 5. 🎯 KEY INSIGHT
Cache invalidation is automatic when the lockfile changes — no manual cache busting needed. But always test with a cold cache occasionally to catch issues.
