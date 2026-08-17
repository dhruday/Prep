# 97. Lighthouse CI — Automating Performance Budgets in CI/CD

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Lighthouse CI** is Google's open-source tool that runs Lighthouse audits as part of a CI/CD pipeline, enabling automated enforcement of performance budgets on every pull request. Without it, performance is measured reactively — someone notices the app is slow, you look at Lighthouse, you find regressions. With Lighthouse CI, a PR that adds an unoptimized 500KB image or imports a heavy library **fails the build** before merge — the same way a failing unit test blocks deployment. This transforms performance from a periodic concern into a continuous engineering discipline. At senior level, the real value is the **historical assertion server** (LHCI server) that stores audit results over time and enables diff comparisons per commit, so you can see exactly which commit regressed LCP by 400ms.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Architecture

```
Pull Request → CI Pipeline → [Build] → [Serve locally] → [LHCI collect] → [LHCI assert] → [LHCI upload]
                                                              ↓                  ↓               ↓
                                                       Multiple runs      Fail if budget    LHCI server
                                                       (median taken)     exceeded          (trends)
```

### Configuration: `.lighthouserc.js`

```javascript
// lighthouserc.js — the complete config
module.exports = {
  ci: {
    collect: {
      // How to serve the built app
      staticDistDir: './dist',    // OR startServerCommand
      
      // URL patterns to audit
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/products/123',
        'http://localhost:3000/dashboard',
      ],
      
      // Run 3 times per URL — LHCI takes median to reduce noise
      numberOfRuns: 3,
      
      // Lighthouse settings
      settings: {
        // Simulate a mid-tier Android on 4G
        preset: 'desktop',         // or 'mobile'
        throttling: {
          rttMs: 40,              // 4G RTT
          throughputKbps: 10240,  // 10 Mbps down
          cpuSlowdownMultiplier: 1,
        },
        // Block analytics, ads — they're noisy and not your perf budget
        blockedUrlPatterns: [
          '*google-analytics*',
          '*hotjar*',
          '*facebook.net*',
        ],
      },
    },
    
    assert: {
      // Budget-based assertions
      budgets: [
        {
          resourceCounts: [
            { resourceType: 'script', budget: 10 },         // Max 10 JS files
            { resourceType: 'image', budget: 30 },
          ],
          resourceSizes: [
            { resourceType: 'script', budget: 300 },        // Max 300KB JS
            { resourceType: 'total', budget: 1000 },        // Max 1MB total page
            { resourceType: 'image', budget: 500 },
          ],
          timings: [
            { metric: 'first-contentful-paint', budget: 2000 },
            { metric: 'largest-contentful-paint', budget: 2500 },
            { metric: 'cumulative-layout-shift', budget: 0.1 },
            { metric: 'total-blocking-time', budget: 300 },
          ],
        },
      ],
      
      // Score-based assertions (less precise but easy to start with)
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],  // Fail if <85
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
        
        // Specific audit assertions
        'uses-rel-preconnect': 'warn',
        'render-blocking-resources': ['error', { maxLength: 0 }],
        'unused-javascript': ['warn', { maxLength: 1 }],
        'modern-image-formats': 'warn',
      },
    },
    
    upload: {
      target: 'lhci',
      serverBaseUrl: 'https://lhci.internal.yourcompany.com',
      token: process.env.LHCI_TOKEN,
      
      // Also upload to temporary storage for PR comment
      githubToken: process.env.GITHUB_TOKEN,
    },
  },
};
```

### GitHub Actions Integration

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on: [pull_request]

jobs:
  lhci:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build production bundle
        run: npm run build
        env:
          NODE_ENV: production
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
          LHCI_TOKEN: ${{ secrets.LHCI_TOKEN }}
```

### Noise Reduction Strategy

Lighthouse scores are inherently noisy (±5 points) when run on shared CI runners. Solutions:

```javascript
// 1. Run 5 times, take median (not mean — resistant to outliers)
numberOfRuns: 5,

// 2. Use consistent throttling settings — don't rely on CI machine speed
settings: {
  throttlingMethod: 'devtools',  // More consistent than 'simulate'
  cpuSlowdownMultiplier: 4,      // Simulate Moto G4 explicitly
},

// 3. Set generous budgets in CI — reserve tight budgets for LHCI server trend analysis
// CI: fail if LCP > 4000ms
// LHCI server alert: warn if LCP increases >300ms from 30-day rolling average
```

### LHCI Server for Trend Analysis

```
PR merge → LHCI server stores result
         → Compare with previous commit on same branch
         → Detect: LCP regressed 400ms → annotate commit in Grafana
```

```bash
# Setup LHCI server (Docker)
docker run -it -p 9001:9001 patrickhulce/lhci-server

# Create project and get token
lhci wizard  # interactive setup
```

### Angular / Vite Specific Notes

```javascript
// For Angular apps (ng build outputs to dist/<project>)
collect: {
  staticDistDir: './dist/your-app-name',
  
  // Angular uses hash-based routing — need to handle SPA routing
  startServerCommand: 'npx serve dist/your-app-name -s -l 3000',
  startServerReadyPattern: 'Accepting connections',
}

// For Vite/React
collect: {
  staticDistDir: './dist',
  // Vite output is SPA-ready
}
```

### Anti-Patterns

- **Running against dev server**: Lighthouse needs a production build — dev servers have unminified code, source maps, and hot reload overhead
- **Single Lighthouse run in CI**: One run can vary ±20 points — always run ≥3 and take median
- **Blocking merges on score (not budget)**: Scores are too volatile; metric budgets (LCP < 2500ms) are deterministic
- **Not excluding third-party scripts**: Analytics, chat widgets add noise — blocklist them in CI
- **Ignoring accessibility audits**: Teams often focus only on performance; Lighthouse CI enforces a11y budgets for free

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**SAP Fiori (your experience link):**
- The SAP Lighthouse 60→95 improvement at SAP could be protected with LHCI — every subsequent PR would need to maintain that score within budget

**Google (dogfoods LHCI):**
- web.dev itself is audited via Lighthouse CI on each deploy
- LCP budget: 2500ms, CLS budget: 0.1

**Microsoft (Azure DevOps):**
- Azure Static Web Apps has native Lighthouse integration
- PR decorations show score diffs directly in PR comments

**Scaling:**
- 1 developer: run Lighthouse manually
- 5 developers: one unreviewed image PR can silently regress LCP
- 20+ developers: LHCI is non-negotiable to maintain performance culture

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "At SAP, after we took our Lighthouse score from 60 to 95, the immediate next question was: how do we ensure it stays there as 15 engineers continue shipping? That's Lighthouse CI. I configured it to run 3 audits per URL per PR, take the median, and enforce budget assertions — LCP <2500ms, CLS <0.1, TBT <300ms, JS bundle <300KB. The key insight is to assert on **metrics** not **scores** — scores are composites that vary too much on shared CI hardware. I use the LHCI server to store historical results so we can diff any commit against the rolling 30-day average and catch gradual regressions that individually pass the CI budget. PR comments show the before/after delta directly in GitHub, which makes performance regressions visible in code review without anyone going to a dashboard."

**Likely Follow-up Questions:**
1. *How do you handle Lighthouse noise on CI?* → 3-5 runs, take median, fixed throttling settings
2. *What's the difference between score assertions and budget assertions?* → Scores are composites and volatile; budgets assert specific measurable thresholds
3. *How do you exclude third-party noise?* → `blockedUrlPatterns` in Lighthouse settings
4. *How do you audit authenticated pages?* → Use Lighthouse's `puppeteerScript` config to log in before running audit
5. *What Lighthouse categories do you enforce in CI?* → Performance (error <85), accessibility (error <90); SEO and best-practices as warnings

**Comparison With Alternatives:**

| Tool | What it measures | CI integration | Historical trends |
|---|---|---|---|
| Lighthouse CI | All CWV + accessibility + SEO | Native | Via LHCI Server |
| web-vitals library | CWV from real users (RUM) | N/A (runtime) | Via analytics |
| webpack-bundle-analyzer | Bundle size only | Manual CI scripting | No |
| Calibre / SpeedCurve | Full monitoring + trend | Yes (paid) | Yes |
| PageSpeed Insights | Lighthouse remotely | Via API | Limited |

---

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Authenticated Pages)
────────────────────────────────────────────────────────────

```javascript
// Lighthouse CI config for authenticated pages
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/dashboard', 'http://localhost:3000/profile'],
      
      // Puppeteer script to authenticate before audit
      puppeteerScript: './lhci-auth.js',
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required in CI
      },
    },
  },
};

// lhci-auth.js
module.exports = async (browser) => {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login');
  await page.type('#email', process.env.LHCI_TEST_EMAIL);
  await page.type('#password', process.env.LHCI_TEST_PASSWORD);
  await page.click('[type=submit]');
  await page.waitForNavigation();
  await page.close();
};
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"Lighthouse CI turns performance from a fire drill into a gate."** 

Three things always say:
1. **Run 3+ times, use median** — eliminate CI noise
2. **Assert budgets, not scores** — LCP <2500ms is objective; score 85 is not
3. **LHCI server for trends** — catch gradual regressions across commits

**If you go blank:** "LHCI runs Lighthouse in CI, asserts on metric budgets (not scores), blocks PRs that regress LCP/CLS, and stores historical results for trend analysis."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Performance culture**: makes every engineer accountable for performance impact of their PR
→ **Core Web Vitals protection**: Google uses CWV for SEO ranking — regression protection is SEO protection  
→ **Compound effect prevention**: individual small regressions (10ms each) compound to 500ms over 6 months without automated gates

**How it works:**
→ LHCI CLI builds the app, serves it locally, runs Lighthouse N times per URL, takes the median result, asserts it against configured budgets, and uploads results. If assertions fail, the process exits with code 1, failing the CI step.

**Company relevance:**
→ **Microsoft**: Azure DevOps + LHCI is a documented official integration for their web properties
→ **Adobe**: Large engineering org — no individual perf review possible without automation; LHCI is how performance budgets scale
→ **Salesforce**: LWC components in Experience Cloud are Lighthouse-audited; LHCI is used for component library PRs
→ **Cisco**: Internal tools may not have SEO concerns but do have performance SLAs for enterprise customers
