# Lighthouse CI in the Build Pipeline
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What Lighthouse CI does**: runs Google Lighthouse (the performance/accessibility/SEO audit tool) automatically on every pull request and build — same scores Hruday looks at in Chrome DevTools, but now enforced as a gate in CI before code ships
- **Why it matters**: without CI enforcement, performance regressions ship silently; a developer adds a 500KB analytics script and the LCP goes from 1.3s to 3.8s — nobody notices until a user complains; Lighthouse CI fails the build at 3.8s and the developer fixes it immediately
- **Two parts**: `@lhci/cli` (runs audits); `lighthouserc.json` (defines what scores cause failures — assertions: LCP < 2.5s, CLS < 0.1, performance score ≥ 85)
- **Workflow**: deploy preview → run `lhci autorun` → compare scores to thresholds → fail PR if threshold breached → developer sees which metric regressed and by how much
- **`assert` section**: `"first-contentful-paint": ["error", {"maxNumericValue": 1800}]` — the metric stays under 1.8s or the build fails; `"categories:performance": ["warn", {"minScore": 0.9}]` for score-based checks
- **`upload` section**: stores reports on `@lhci/server` (self-hosted) or `storage.googlelabs.com` — gives diffs between PR and main branch so the team sees exactly what changed
- ✅ **Hruday's anchor**: SAP Commerce Cloud — added Lighthouse CI to the Jenkins pipeline; set LCP ≤ 2500ms, CLS ≤ 0.1, perf score ≥ 85 as required gates; caught 3 regressions in Q1 before they reached production: one from a third-party analytics script (bundle size spike), one from a missing `width`/`height` on a hero image (CLS spike), one from synchronous CSS blocking paint

---

## 1. One-Line Definition
Lighthouse CI is a command-line tool that runs automated Lighthouse performance and quality audits on a deployed URL and fails the CI build if the scores drop below defined thresholds.

---

## 2. The Problem It Solves

Performance is easy to break accidentally. A developer adds a new chart library, imports the whole bundle instead of a specific component, and the bundle size grows by 400KB. LCP goes from 1.3s to 3.2s on a 4G connection. Nobody reviews bundle size in code reviews. The feature ships. Users on slower connections start dropping off the checkout page.

This is not a hypothetical. It happens to every team that only measures performance manually and occasionally.

Lighthouse CI makes performance a non-negotiable part of the definition of done. It ties the same metrics you track manually (LCP, CLS, INP, performance score, accessibility score) to the build pipeline. A score drop fails the PR. The author sees it, fixes it, and the metric stays stable over time.

The other benefit: trend visibility. Lighthouse CI stores reports for every build, so you can chart LCP over 6 months and see whether the product is getting faster or slower as features are added. Without this, performance "appears fine" until it suddenly becomes a crisis.

---

## 3. How It Works Internally

### The Mechanism — Step by Step

```
1. Developer opens a pull request
   → Branch is built and deployed to a preview URL

2. CI step triggers: lhci autorun --config=lighthouserc.json
   → @lhci/cli launches a headless Chrome browser (via Puppeteer)
   → Chrome navigates to the preview URL 3 times (median of 3 runs used)
   → Lighthouse runs all audits: Performance, Accessibility, Best Practices, SEO
   → Scores computed: 0–100 per category, raw metrics per audit

3. Assertion phase (lighthouserc.json assert block):
   → Compare each metric to the threshold defined
   → LCP: 1,850ms | Threshold: maxNumericValue 2500ms → PASS
   → CLS: 0.03    | Threshold: maxNumericValue 0.1   → PASS
   → Performance: 91 score | Threshold: minScore 0.85 → PASS
   → If any threshold fails: exit code 1 → CI step fails → PR blocked

4. Upload phase:
   → HTML report saved to @lhci/server or temp storage
   → GitHub CI comment posted with links to full report
   → If the @lhci/server is configured: scores compared to base branch
   → Developer sees: "LCP regressed from 1.3s → 2.9s — bundle size increased"

5. Developer fixes the regression, pushes:
   → lhci autorun runs again on the new commit
   → Scores pass thresholds → CI green → PR can merge
```

### ASCII Diagram

```
Pull Request Flow with Lighthouse CI:
                                                         
  Developer opens PR ──→ Preview build deployes         
                                ↓                        
                      CI: lhci autorun                   
                                ↓                        
                    Chrome (headless) ×3 runs           
                    on preview URL                       
                                ↓                        
                    Audits: LCP / CLS / INP             
                            Perf Score                   
                            A11y Score                   
                                ↓                        
                   Compare to lighthouserc.json          
                   assertions                            
                       ↙         ↘                       
                 PASS ✅       FAIL ❌                   
                   ↓               ↓                     
              CI green         CI fails                  
              PR can merge     PR blocked                 
                               ↓                         
                        Developer sees:                  
                        "LCP 2.9s > 2.5s limit"         
                        Link to full HTML report         
                                ↓                        
                        Developer investigates:          
                        webpack-bundle-analyzer           
                        finds 400KB unneeded import      
                                ↓                        
                        Fixes + pushes                   
                                ↓                        
                        CI re-runs → PASS ✅             
```

---

## 4. The Code

### Wrong Way — Manual Lighthouse Checks Only

```json
// ❌ WRONG — no CI enforcement, manual checks only

// No lighthouserc.json exists. No @lhci/cli in the pipeline.

// What developers do: 
// "I'll run Lighthouse in Chrome DevTools on my laptop before submitting the PR"
// Problems:
//   1. Tests on localhost (no network conditions, no CDN, no real server)
//   2. Different laptop specs = different throttling results  
//   3. Developers forget to run it under deadline pressure
//   4. No historical record of score trends
//   5. A merged feature can degrade score even if the feature branch was fine
//      (merge conflict resolution adds an unreviewed script tag)

// The regression happens with no warning:
// main branch: LCP 1.3s  (good)
// after feature/analytics-v2 merges: LCP 3.8s  (nobody noticed)
// 3 weeks later: a product manager asks "why did conversion drop?"
```

### Right Way — Full Lighthouse CI Setup

```json
// ✅ lighthouserc.json — sits in repo root, committed to version control

{
  "ci": {
    "collect": {
      "url": [
        "https://preview-$PULL_REQUEST_NUMBER.ecommerce-preview.sap.io/",
        "https://preview-$PULL_REQUEST_NUMBER.ecommerce-preview.sap.io/products/laptops"
      ],
      "numberOfRuns": 3,
      // 3 runs → use median score (removes noise from a single cold/warm cache run)
      "startServerCommand": "",
      // empty: preview URL is already deployed by a previous CI step
      "settings": {
        "preset": "desktop",
        // "desktop" or "mobile" — run both for complete coverage
        // mobile is more sensitive to performance regressions
        "throttlingMethod": "simulate",
        // "simulate" = throttles CPU and network in software (faster, good enough)
        // "devtools" = real Chrome DevTools throttling (slower, use for precise measurement)
        "chromeFlags": "--no-sandbox"
        // required when running in Docker/CI containers as root
      }
    },

    "assert": {
      "preset": "lighthouse:no-pwa",
      // base: use the no-PWA preset as a baseline (disables PWA checks for non-PWA sites)
      "assertions": {
        // ✅ Core Web Vitals thresholds — fail the build if breached
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        // LCP ≤ 2.5s (Google's "Good" threshold)
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        // CLS ≤ 0.1 (no unexpected layout movement)
        "total-blocking-time": ["warn", {"maxNumericValue": 300}],
        // TBT ≤ 300ms — warning not error (TBT varies more than CLS/LCP)
        "first-contentful-paint": ["warn", {"maxNumericValue": 1800}],
        // FCP ≤ 1.8s for visual responsiveness signal
        
        // ✅ Score-based thresholds (0-1 scale)
        "categories:performance": ["error", {"minScore": 0.85}],
        // Performance category must score ≥ 85
        "categories:accessibility": ["error", {"minScore": 0.95}],
        // Accessibility ≥ 95 — important for WCAG compliance commitment
        "categories:best-practices": ["warn", {"minScore": 0.9}],
        // Best practices ≥ 90 (warn, not error)

        // ✅ Specific audits that indicate specific regressions
        "render-blocking-resources": "off",
        // turned off: we manually manage render-blocking via preload hints
        "unused-javascript": ["warn", {"maxLength": 1}],
        // warn if more than 1 unused JS script detected (bundle hygiene)
        "uses-optimized-images": "off"
        // images managed by CDN/next-gen format conversion — skip this audit
      }
    },

    "upload": {
      "target": "lhci",
      // upload to self-hosted @lhci/server (not public GitHub status storage)
      "serverBaseUrl": "https://lighthouse-ci.internal.sap-ecommerce.io",
      "token": "$LHCI_TOKEN",
      // token from environment variable — never commit to repo

      // Enables base-branch comparison in the LHCI dashboard
      // Shows diffs: "LCP: main 1.3s → PR 2.9s (+123%)"
      "basicAuth": {
        "username": "$LHCI_BASIC_AUTH_USERNAME",
        "password": "$LHCI_BASIC_AUTH_PASSWORD"
      }
    }
  }
}
```

```yaml
# ✅ GitHub Actions workflow — lighthouse-ci.yml

name: Lighthouse CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --prefer-offline

      - name: Build production bundle
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy preview (Vercel / internal preview)
        id: deploy-preview
        run: |
          PREVIEW_URL=$(npm run deploy:preview -- --token ${{ secrets.DEPLOY_TOKEN }})
          echo "url=$PREVIEW_URL" >> $GITHUB_OUTPUT
        # outputs the deployed preview URL for the next step

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.14.x
          lhci autorun --config=lighthouserc.json
        env:
          LHCI_TOKEN: ${{ secrets.LHCI_TOKEN }}
          LHCI_BASIC_AUTH_USERNAME: ${{ secrets.LHCI_BASIC_AUTH_USERNAME }}
          LHCI_BASIC_AUTH_PASSWORD: ${{ secrets.LHCI_BASIC_AUTH_PASSWORD }}
          PULL_REQUEST_NUMBER: ${{ github.event.pull_request.number }}

      - name: Upload Lighthouse HTML reports as artifact
        if: always()  # upload even if CI fails (need the report for debugging)
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-reports
          path: .lighthouseci/
          retention-days: 30
```

```groovy
// ✅ Jenkins declarative pipeline (SAP's Jenkins setup)
// File: Jenkinsfile (in repo root)

pipeline {
    agent { label 'ci-node-20' }

    environment {
        LHCI_TOKEN = credentials('lighthouse-ci-token')
    }

    stages {
        stage('Build') {
            steps {
                sh 'npm ci --prefer-offline'
                sh 'npm run build'
            }
        }

        stage('Deploy Preview') {
            steps {
                script {
                    // Deploy to internal preview; URL stored in env
                    def previewUrl = sh(
                        script: 'npm run deploy:preview',
                        returnStdout: true
                    ).trim()
                    env.PREVIEW_URL = previewUrl
                }
            }
        }

        stage('Lighthouse CI') {
            steps {
                sh 'npm install -g @lhci/cli@0.14.x'
                sh 'lhci autorun --config=lighthouserc.json'
                // ← exit code 1 on assertion failure → stage fails → PR can't merge
            }
            post {
                always {
                    // Archive HTML reports regardless of pass/fail
                    archiveArtifacts artifacts: '.lighthouseci/*.html',
                                     allowEmptyArchive: true
                }
            }
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Lighthouse CI and why would you add it to a build pipeline?"

**Hruday's answer:**
> Lighthouse CI is a command-line tool that runs Google's Lighthouse audits automatically in a CI environment and fails the build if performance or quality scores drop below thresholds you define.
>
> The reason to add it to a pipeline is that performance degrades gradually and invisibly without automated enforcement. A code review doesn't catch a 400KB bundle size increase. A developer running Lighthouse on a deadline might skip it. But once Lighthouse CI is in the pipeline, every PR is measured against the same objective thresholds — LCP, CLS, performance score, accessibility score — before it can merge.
>
> At SAP, I added it to our Jenkins pipeline with three concrete thresholds: LCP ≤ 2.5 seconds, CLS ≤ 0.1, and a performance score of at least 85. Those numbers came directly from our Lighthouse 60 → 95 improvement project — we knew exactly what "good" looked like for our app and we encoded it as a gate. In Q1 after adding it, it caught three regressions before they reached production. Without the gate, all three would have shipped.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Lighthouse CI decide whether a metric passes or fails? What are the threshold types?"

**Hruday's answer:**
> The `assert` section in `lighthouserc.json` defines the thresholds. There are two kinds of assertions.
>
> The first is audit-based: you target a specific audit ID (`largest-contentful-paint`, `cumulative-layout-shift`, `total-blocking-time`) and set `maxNumericValue` or `minNumericValue` in milliseconds or the raw metric unit. LCP is in milliseconds, CLS is a unitless decimal. So `["error", {"maxNumericValue": 2500}]` means LCP must be under 2.5 seconds or the build errors.
>
> The second is category-based: you target the aggregate score for a category (`categories:performance`, `categories:accessibility`) and set `minScore` on a 0-1 scale. `["error", {"minScore": 0.85}]` means the performance category score must be 85 or above.
>
> The severity level is either `error` (fails the build, non-zero exit code) or `warn` (logs a warning but doesn't fail the build). For our core web vitals gates I use `error`. For secondary metrics like total blocking time, which has more natural variance across runs, I use `warn` so developers know about it without blocking the PR.
>
> Lighthouse CI runs the URL 3 times and uses the median result, which reduces noise from a single warm-cache or cold-cache run.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the limitations of Lighthouse CI? When might scores in CI not reflect real user experience?"

**Hruday's answer:**
> Three meaningful limitations.
>
> First, the network and device are simulated, not real. Lighthouse CI uses CPU and network throttling in software — it emulates a mid-tier mobile device on a 4G connection. This is a useful proxy but it's not the same as a real Moto G4 on a real 4G network. Real User Monitoring (RUM) tools like Sentry Performance or Datadog measure actual field data across all devices and connections, which is more accurate for user impact.
>
> Second, Lighthouse CI tests to a fixed URL — a preview deploy, a staging environment, or a local server. If that environment differs from production in any meaningful way (different CDN, different asset serving, different database latency), the Lighthouse CI scores may not match production scores. I've seen cases where a staging server with smaller instance sizes gave worse TBT scores than production because of slower server-side rendering.
>
> Third, Lighthouse measures page-level performance on specific pages you configure. If a regression happens on a page you're not testing (a checkout step, a settings page), Lighthouse CI won't catch it. You need to choose representative pages carefully — typically the highest-traffic pages plus any with known performance sensitivity.
>
> The right complementary setup: Lighthouse CI for pre-merge gates + RUM tool like Sentry for post-deploy real-world measurement. Both serve different purposes.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "A developer on your team is about to merge a PR where LCP jumped from 1.3s to 3.8s. How does your pipeline catch this?"

**Hruday's answer:**
> Lighthouse CI stops the merge before it happens. When the PR is opened, the pipeline deploys a preview of that branch to a staging URL. The Lighthouse CI job then runs `lhci autorun` against that URL — 3 times, taking the median score. The LCP result comes back at 3.8 seconds.
>
> Our `lighthouserc.json` has `"largest-contentful-paint": ["error", {"maxNumericValue": 2500}]`. The 3.8-second result is 3,800ms, which exceeds 2,500ms. The assertion fails. `lhci` exits with code 1. The CI step is marked as failed. The PR is blocked from merging.
>
> GitHub shows the Lighthouse CI check as red in the PR status checks. The developer clicks the link to the uploaded HTML report, which shows: LCP 3,800ms. The report also highlights the top opportunities, including "Avoid enormous network payloads" — it flags a 380KB JavaScript chunk that wasn't there before.
>
> The developer opens the bundle analyzer, finds that a new chart library was imported at the component level as `import Recharts from 'recharts'` (importing the entire library) instead of `import { LineChart } from 'recharts'`. They fix the import, push, CI reruns — LCP is back at 1.4 seconds, assertion passes, PR merges.
>
> The whole loop took less than 20 minutes. Without Lighthouse CI it would have shipped and the regression would have taken weeks to trace back to that PR.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Set a performance score ≥ 95 threshold" | "I'll set the performance score gate to 95 so we maintain excellence" | Starting with a 95 threshold on an existing codebase is a recipe for immediate failure and team frustration; if the current score is 87, a 95 gate blocks every PR instantly; the right approach: set thresholds slightly below the CURRENT best baseline to prevent regression without blocking normal work; as the score improves, raise the threshold incrementally; at SAP I started at 85 (current was ~89), which gave 4-point headroom for legitimate variance while catching real regressions |
| "Lighthouse CI replaces RUM" | "We use Lighthouse CI so we know our real user experience metrics" | Lighthouse CI is synthetic — it measures a simulated user on a simulated network; Real User Monitoring (RUM) measures actual users on actual devices and connections; they answer different questions: Lighthouse CI (pre-merge) = "will this change make things worse?" and RUM (post-deploy) = "what are real users actually experiencing?"; Lighthouse CI can pass (no regression vs baseline) while real users still have poor metrics due to geography, slow devices, or third-party scripts that aren't caught in the preview environment; both are needed |
| "One run is enough" | "I run lighthouse once per PR to keep CI fast" | A single Lighthouse run has high variance — a warm browser cache, a slow network moment, or a CPU spike on the CI machine can shift LCP by 200-500ms; running 3 times and taking the median removes this noise; Lighthouse CI's `numberOfRuns: 3` is the standard setting precisely because single runs are unreliable; one noisy failing run blocks a legitimate PR (false negative) or one lucky run passes a real regression (false positive); the extra 2-3 minutes for 3 runs is worth the reliability |

---

## 7. Hruday's Real Experience Hook
> "Adding Lighthouse CI to the SAP Jenkins pipeline was one of those changes that seemed like overhead at first — the team was sceptical about build time going up. But after Q1 where it caught three regressions before production, nobody questioned it again. The most memorable catch was a missing `width` and `height` on a hero image that caused a CLS of 0.38 — the image loaded in and pushed all the content below it down by 120px. That would have been a terrible user experience on mobile. The CI gate caught it in the PR review, the developer added the attributes, CLS dropped to 0.02, and it merged in the same day.
>
> What I'd do again: start with realistic thresholds based on what the current score actually is. Setting aspirational thresholds from day one breaks CI on every PR and causes the team to disable the checks in frustration. Start below current baseline, build trust, raise the bar incrementally."

---

## 8. Scale Evolution

**Small app (one team, < 10 PRs/day) →** GitHub Actions with `@lhci/cli`, upload to `storage.googlelabs.com` (free Lighthouse CI temporary storage), basic performance + accessibility thresholds; no self-hosted server needed; report links in PR comments sufficient.

**Medium app (3-5 teams, 20+ PRs/day) →** self-hosted `@lhci/server` (Postgres backend, Docker Compose) for historical score tracking and base-branch comparison; per-page thresholds for different critical pages (homepage vs product detail vs checkout); split into separate CI jobs for mobile and desktop audits.

**Large scale (SAP Commerce, multiple products) →** Lighthouse CI in Jenkins/GitHub Actions with dedicated CI runners (consistent hardware = consistent scores); custom audit configuration per product vertical; Slack bot that posts regression reports to the #performance channel; weekly Lighthouse score trends in engineering all-hands; integration with feature flag tool so Lighthouse CI runs new feature variants against control to detect performance impact of A/B test branches.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flows must meet LCP/CLS standards — a layout shift during checkout can cause a user to tap the wrong button; Lighthouse CI as a safety gate on the critical checkout funnel | Pre-merge LCP/CLS gates on payment-critical pages; accessibility score for compliance |
| Swiggy / Meesho | Product listing and order pages are high-traffic and performance-sensitive; Lighthouse CI catches regressions from frequent feature deployments across catalog, cart, and checkout UIs | CI thresholds for mobile-first performance; different thresholds per page type |
| Adobe / Microsoft | Enterprise tools with strict accessibility requirements; Lighthouse CI accessibility score gates support WCAG AA compliance; performance SLAs for enterprise customers | Accessibility score gates; integration with enterprise CI (Azure Pipelines, GitHub Actions) |
| SAP Labs | Direct experience: Jenkins Lighthouse CI gate deployed; LCP ≤ 2500ms, CLS ≤ 0.1, perf ≥ 85; caught 3 Q1 regressions; prevented bundle size spike, CLS spike (hero image dimensions), CSS render-blocking regression | Specific thresholds + exact regressions caught; `lhci autorun` CLI command; `@lhci/server` self-hosted upload |

---

## 10. Related Topics — What to Study Next

- **Topic 234 — Core Web Vitals** — Lighthouse CI enforces the CWV thresholds; understanding what LCP, CLS, and INP actually measure makes the threshold numbers meaningful — you know why 2.5s for LCP and 0.1 for CLS are the right industry thresholds, not arbitrary numbers
- **Topic 235 — Code Splitting** — the most common trigger for Lighthouse CI failures is a bundle size regression; code splitting is the primary fix; when Lighthouse CI flags "reduce unused JavaScript", the solution is lazy loading and dynamic imports
- **Topic 238's complement — RUM / Sentry** *(Topic 269)* — Lighthouse CI catches regressions before deploy; Sentry Performance and Real User Monitoring catch issues in production that synthetic testing misses; they're complementary tools, not alternatives
- **Topic 190 — CI/CD Pipeline Stages** — Lighthouse CI is one stage in a broader pipeline; understanding how it fits alongside lint, unit tests, E2E tests, and deploy stages helps you position it correctly (after deploy, before merge gate)

---

*Part 14 · Lighthouse CI in the Build Pipeline · Full Stack Interview Guide · Hruday D · 2026*
