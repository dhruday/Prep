# 509. How to Fix Accessibility — A Production Guide

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**What it is:**
This is a systematic, production-tested guide for remediating accessibility (a11y) failures in existing web applications. It covers the complete workflow: auditing with automated tools (axe-core, Lighthouse, Pa11y), triaging by WCAG impact level, fixing the top categories of failures (missing alt text, color contrast, focus management, ARIA misuse, form labels, semantic HTML), verifying fixes with screen readers (NVDA, VoiceOver, JAWS), and implementing CI/CD gates to prevent regressions.

**Why it exists:**
96.3% of home pages have detectable WCAG 2 failures (WebAIM 2024 Million). Most teams don't start with accessibility — they retrofit it. The challenge isn't knowing WCAG criteria; it's knowing *how to systematically fix a codebase with hundreds of violations* without breaking functionality, how to prioritize which failures matter most, and how to prevent regressions once fixed.

**When and where it's used:**
- Enterprise WCAG remediation projects (SAP, Microsoft, Salesforce compliance initiatives)
- Design system accessibility hardening (fixing all base components)
- Pre-launch accessibility audits (legal compliance before go-live)
- Post-lawsuit remediation (ADA Title III settlements require specific timelines)
- CI/CD pipeline integration (automated gates for new code)
- Sprint-level a11y bug fixing (triaged from audit results)

**Role in large-scale applications:**
At FAANG scale, accessibility remediation is a cross-functional program: eng, design, QA, legal, and product. A Staff engineer leads the technical strategy — choosing tools, defining severity tiers, building automated testing infrastructure, training teams, and establishing the long-term testing culture that prevents future violations.

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. The Remediation Pipeline**

```
┌────────────────────────────────────────────────────────────────┐
│                    ACCESSIBILITY REMEDIATION PIPELINE           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Phase 1: AUDIT                                                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ Automated Scan │  │ Manual Testing │  │ Screen Reader  │  │
│  │ (axe, Pa11y)   │  │ (keyboard nav) │  │ (NVDA, VO)     │  │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  │
│          └───────────────────┼───────────────────┘            │
│                              ▼                                 │
│  Phase 2: TRIAGE            [Violation Report]                │
│  ┌──────────────────────────────────────────────┐             │
│  │ Priority 1 (Critical): Blocks access entirely │             │
│  │ Priority 2 (Serious):  Major friction          │             │
│  │ Priority 3 (Moderate): Minor friction           │             │
│  │ Priority 4 (Minor):   Cosmetic/best practice   │             │
│  └───────────────────────────┬──────────────────┘             │
│                              ▼                                 │
│  Phase 3: FIX               [Sprint Backlog]                  │
│  ┌────────────────────────────────────────────┐               │
│  │ Fix by category (batch similar violations)  │               │
│  │ → Missing alt text: global sweep            │               │
│  │ → Contrast: design token update             │               │
│  │ → Focus: component-level fixes              │               │
│  └───────────────────────────┬────────────────┘               │
│                              ▼                                 │
│  Phase 4: VERIFY             [QA + Screen Reader]             │
│  ┌────────────────────────────────────────────┐               │
│  │ Re-run automated scan (zero P1/P2)          │               │
│  │ Manual keyboard walkthrough                 │               │
│  │ Screen reader verification (NVDA + VO)      │               │
│  └───────────────────────────┬────────────────┘               │
│                              ▼                                 │
│  Phase 5: PREVENT            [CI/CD Gates]                    │
│  ┌────────────────────────────────────────────┐               │
│  │ axe-core in unit tests                      │               │
│  │ Pa11y in integration tests                  │               │
│  │ Lighthouse CI with a11y threshold            │               │
│  │ ESLint a11y plugin (jsx-a11y)               │               │
│  └────────────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────┘
```

### **B. Phase 1 — Automated Audit Setup**

#### Tool Comparison

| Tool | Type | Rules | CI Integration | Best For |
|------|------|-------|----------------|----------|
| **axe-core** | Library | 90+ rules | Jest, Cypress, Playwright | Component-level testing |
| **Pa11y** | CLI/Runner | WCAG 2.1 AA/AAA | CI pipeline, URL scanning | Page-level scanning |
| **Lighthouse** | Audit | Subset of axe | Lighthouse CI | Performance + a11y combined |
| **WAVE** | Extension | Visual overlay | API available | Designer/QA manual review |
| **IBM Equal Access** | Extension + CI | 600+ rules | Travis/GitHub Actions | Enterprise thoroughness |
| **eslint-plugin-jsx-a11y** | Linter | 30+ rules | ESLint (build-time) | Catching errors before runtime |
| **Storybook a11y addon** | Dev tool | axe-core | Storybook CI | Component development |

#### Automated Scan Setup (axe-core + Playwright)

```typescript
// playwright-a11y.config.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

interface A11yViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  nodes: { html: string; target: string[]; failureSummary: string }[];
}

test.describe('Accessibility Audit', () => {
  const pages = [
    '/',
    '/dashboard',
    '/settings',
    '/profile',
    '/search',
  ];

  for (const pagePath of pages) {
    test(`${pagePath} has no critical/serious a11y violations`, async ({ page }) => {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = results.violations.filter(
        (v: A11yViolation) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (critical.length > 0) {
        const report = critical.map((v: A11yViolation) => ({
          rule: v.id,
          impact: v.impact,
          description: v.description,
          elements: v.nodes.map((n) => n.html).slice(0, 3),
        }));
        console.error('A11y violations:', JSON.stringify(report, null, 2));
      }

      expect(critical).toHaveLength(0);
    });
  }
});
```

#### Jest + axe-core for Component Testing

```typescript
// Button.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';

expect.extend(toHaveNoViolations);

describe('Button accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<Button onClick={() => {}}>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with icon-only variant', async () => {
    const { container } = render(
      <Button aria-label="Close" variant="icon-only">
        <CloseIcon />
      </Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### **C. Phase 2 — Triage by WCAG Impact**

**The top 6 failure categories (covering ~90% of violations):**

| # | Category | % of Failures | Typical Impact | WCAG Criteria | Fix Effort |
|---|----------|--------------|----------------|---------------|------------|
| 1 | Low contrast text | 83.6% | Serious | 1.4.3 Contrast (Minimum) | Low (design tokens) |
| 2 | Missing alt text | 58.2% | Critical | 1.1.1 Non-text Content | Low (content sweep) |
| 3 | Missing form labels | 53.8% | Critical | 1.3.1, 4.1.2 Name, Role, Value | Medium |
| 4 | Empty links | 48.6% | Serious | 2.4.4, 4.1.2 Link Purpose | Low |
| 5 | Missing document language | 18.6% | Serious | 3.1.1 Language of Page | Trivial |
| 6 | Empty buttons | 26.9% | Critical | 4.1.2 Name, Role, Value | Low |

**Severity tiers for sprint planning:**

| Tier | Impact | SLA | Examples |
|------|--------|-----|---------|
| P1 Critical | User completely blocked | Fix this sprint | No keyboard access, missing form labels, no focus trap in modal |
| P2 Serious | Major friction, workaround exists | Fix within 2 sprints | Low contrast, missing alt text, broken focus order |
| P3 Moderate | Minor friction | Fix within 1 month | Redundant ARIA, tab order suboptimal, missing skip link |
| P4 Minor | Best practice, no user impact | Backlog | Valid ARIA but not ideal, minor heading order |

### **D. Phase 3 — Fix Patterns (The Top 6 Categories)**

#### Fix 1: Color Contrast (83.6% of sites)

```css
/* ❌ BEFORE: 2.5:1 contrast ratio (fails WCAG AA 4.5:1 for normal text) */
.text-light {
  color: #999999; /* on white background */
}

/* ✅ AFTER: Update design tokens at the source */
:root {
  /* Normal text: minimum 4.5:1 against background */
  --text-primary:   #1f1f1f; /* 14.7:1 on white */
  --text-secondary: #5f6368; /* 4.6:1 on white — Google's gray */
  --text-tertiary:  #70757a; /* 4.5:1 on white — exactly at threshold */

  /* Large text (18px+ or 14px bold): minimum 3:1 */
  --text-large-secondary: #80868b; /* 3.1:1 on white */

  /* Interactive elements */
  --link-color:     #1a73e8; /* 4.5:1 on white — Google blue */
  --link-visited:   #681da8; /* 8.2:1 on white */
  --error-text:     #d93025; /* 4.5:1 on white — Google red */
}
```

**Contrast checking in CI:**

```typescript
// contrast-check.ts — build-time check for design tokens
interface ContrastResult {
  token: string;
  ratio: number;
  passes: 'AA' | 'AAA' | 'fail';
  background: string;
}

function luminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;

  const [rL, gL, bL] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

#### Fix 2: Missing Alt Text (58.2% of sites)

```typescript
// ❌ BEFORE: No alt text
<img src="/hero.jpg" />

// ✅ FIX: Informative images need descriptive alt
<img src="/hero.jpg" alt="Dashboard showing real-time analytics with 3 charts" />

// ✅ FIX: Decorative images need empty alt
<img src="/bg-pattern.svg" alt="" role="presentation" />

// ✅ FIX: Complex images need extended description
<figure>
  <img src="/architecture.png" alt="System architecture diagram" aria-describedby="arch-desc" />
  <figcaption id="arch-desc">
    Three-tier architecture: React frontend connects to Node.js BFF via GraphQL,
    BFF communicates with PostgreSQL and Redis cache. CDN serves static assets.
  </figcaption>
</figure>

// ❌ ANTI-PATTERN: alt="image" or alt="photo" — meaningless
// ❌ ANTI-PATTERN: alt="logo" — say what the logo represents: alt="Acme Corp home"
```

#### Fix 3: Missing Form Labels (53.8% of sites)

```html
<!-- ❌ BEFORE: Placeholder-only label (disappears on focus) -->
<input type="email" placeholder="Email address" />

<!-- ✅ FIX: Visible label with explicit for/id association -->
<label for="email-input">Email address</label>
<input type="email" id="email-input" placeholder="jane@example.com" />

<!-- ✅ FIX: When visible label isn't possible, use aria-label -->
<input type="search" aria-label="Search products" placeholder="Search..." />

<!-- ✅ FIX: For groups, use fieldset + legend -->
<fieldset>
  <legend>Shipping address</legend>
  <label for="street">Street</label>
  <input type="text" id="street" />
  <label for="city">City</label>
  <input type="text" id="city" />
</fieldset>

<!-- ❌ ANTI-PATTERN: Wrapping input in label without text -->
<label><input type="checkbox" /></label>
<!-- Screen reader announces: "checkbox" — no description! -->

<!-- ✅ FIX -->
<label><input type="checkbox" /> I agree to the terms</label>
```

#### Fix 4: Semantic HTML (Empty Links/Buttons)

```html
<!-- ❌ BEFORE: Empty link (screen reader says "link") -->
<a href="/settings"><i class="icon-gear"></i></a>

<!-- ✅ FIX: aria-label for icon-only links -->
<a href="/settings" aria-label="Settings">
  <i class="icon-gear" aria-hidden="true"></i>
</a>

<!-- ❌ BEFORE: div as button (no keyboard access, no role) -->
<div class="btn" onclick="handleClick()">Submit</div>

<!-- ✅ FIX: Use semantic element -->
<button type="submit" onclick="handleClick()">Submit</button>

<!-- If div MUST be used: -->
<div role="button" tabindex="0"
     onclick="handleClick()"
     onkeydown="if(event.key==='Enter'||event.key===' '){handleClick()}">
  Submit
</div>
```

### **E. Phase 4 — Verification Strategy**

| Test Type | Tool | What It Catches | Coverage |
|-----------|------|----------------|----------|
| Automated (axe) | axe-core, Pa11y | ~30-40% of WCAG criteria | Low contrast, missing labels, ARIA errors |
| Keyboard manual | Human tester | Focus order, trap, restoration | Tab through every interactive flow |
| Screen reader | NVDA (Windows), VoiceOver (macOS) | Announcements, live regions, reading order | Names, roles, states, dynamic updates |
| Zoom/magnification | 200% zoom test | Content reflow, no horizontal scroll | WCAG 1.4.10 Reflow |
| Color only | Grayscale filter | Info conveyed by color alone | WCAG 1.4.1 Use of Color |

**Screen reader testing matrix (minimum):**

| Screen Reader | Browser | OS | Priority |
|--------------|---------|-----|----------|
| NVDA | Chrome | Windows | P1 (highest user base) |
| NVDA | Firefox | Windows | P2 |
| JAWS | Chrome | Windows | P2 (enterprise) |
| VoiceOver | Safari | macOS | P1 (Mac users) |
| VoiceOver | Safari | iOS | P1 (mobile) |
| TalkBack | Chrome | Android | P2 (mobile) |

### **F. Phase 5 — Regression Prevention (CI/CD)**

```yaml
# .github/workflows/a11y.yml
name: Accessibility CI
on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx eslint --ext .tsx,.jsx src/ --rule 'jsx-a11y/*: error'

  unit-a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx jest --testPathPattern='.a11y.test'

  integration-a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build && npm start &
      - run: npx pa11y-ci --config .pa11yci.json

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: .lighthouserc.json
          urls: |
            http://localhost:3000/
            http://localhost:3000/dashboard
```

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

```json
// .pa11yci.json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 10000,
    "wait": 2000,
    "ignore": []
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/settings"
  ]
}
```

### **G. Anti-Patterns & Pitfalls**

1. **"Just add ARIA everywhere"** — ARIA is a last resort. Use semantic HTML first (`<button>` not `<div role="button">`). The first rule of ARIA is: don't use ARIA.

2. **Relying only on automated tools** — axe-core catches ~30-40% of WCAG issues. Focus order, reading order, dynamic content updates, and screen reader compatibility require manual testing.

3. **Fixing axe errors without understanding the user impact** — An `aria-hidden="true"` error on a decorative element is cosmetic; a missing label on a login form blocks users. Triage by user impact, not tool severity.

4. **Adding `aria-label` to elements that already have visible text** — `aria-label` overrides the visible text for screen readers, creating a mismatch. Use `aria-labelledby` to reference the visible text, or just ensure the visible text is descriptive enough.

5. **Testing only with Chrome + axe** — Different screen readers behave differently. NVDA + Chrome, VoiceOver + Safari, and JAWS + Edge each have quirks. Test across at least 2 combinations.

6. **One-time audit without CI gates** — Accessibility is a continuous effort. Without CI checks, regressions appear immediately after the audit.

7. **Making all images have alt text** — Decorative images should have `alt=""`. Informational alt text on decorative images adds noise for screen reader users.

────────────────────────────────────
## 3. Real-World Examples
────────────────────────────────────

### Hruday's SAP WCAG AA Remediation

At SAP, the 80% security vulnerability reduction included accessibility fixes as part of the overall quality initiative. The WCAG AA certification project for Fiori apps likely followed this exact pipeline:

1. **Audit:** axe-core integrated into SAP UI5 component tests, manual testing with JAWS (enterprise standard)
2. **Triage:** P1 = blocked keyboard access in dialogs, P2 = contrast failures in data tables
3. **Fix:** Updated design tokens globally, added focus trapping to all dialog components
4. **Verify:** Screen reader testing matrix (JAWS + Chrome, NVDA + Firefox, VoiceOver + Safari)
5. **Prevent:** ESLint a11y rules in CI, axe-core in component test suite

### Google's Approach
- Material Design 3 mandates WCAG 2.1 AA for all components
- Google uses automated Accessibility Scanner for Android, Lighthouse for web
- Internal "a11y dogfooding" program: engineers use apps with screen readers for a day
- Biweekly a11y bug triage with dedicated accessibility team

### Scale Evolution

| Scale | A11y Approach | Tooling |
|-------|---------------|---------|
| Startup | Ad-hoc fixes, axe browser extension | Manual |
| Growth | axe in CI, eslint-plugin-jsx-a11y | Automated gates |
| Enterprise | Full audit pipeline, screen reader QA team | Pa11y + custom rules |
| FAANG | Dedicated a11y team, automated + manual, legal compliance | Org-wide standards |

────────────────────────────────────
## 4. Interview-Oriented Answer
────────────────────────────────────

**Sample Answer (7+ years level):**

> "When I led the WCAG AA remediation at SAP, I used a five-phase approach. First, automated scanning with axe-core and Pa11y to generate the baseline violation report — we had 400+ issues across our Fiori apps 1,200+ violations. Second, we triaged into four priority tiers based on user impact: P1 critical (keyboard access blocked, missing form labels) got fixed in the current sprint; P2 serious (contrast, alt text) within two sprints.
>
> Third, we batched fixes by category — contrast was a single design-token PR that fixed 200+ violations at once. Form labels required component-level changes. Focus trapping went into the shared dialog component, fixing all dialogs across the app.
>
> Fourth, verification: we tested with NVDA + Chrome, VoiceOver + Safari, and JAWS + IE11 (enterprise requirement). Fifth, we added CI gates: axe-core in Jest for component tests, Pa11y-CI for page-level scans, and a Lighthouse threshold of 95 for the a11y category. No PR merges if a11y score drops.
>
> The result: 80% reduction in accessibility violations within one quarter, and near-zero regressions after the CI gates went live."

**Likely Follow-up Questions:**

1. **"What can't automated tools catch?"** → Focus order, reading order, meaningful alt text quality, screen reader announcement accuracy, dynamic content updates (aria-live timing), keyboard trap scenarios.
2. **"How do you prioritize a11y in sprint planning?"** → P1 (blocks users) in current sprint, P2 (major friction) within 2 sprints. Use the 96.3% stat — most competitors are non-compliant, so a11y is a competitive advantage.
3. **"How do you handle third-party component a11y failures?"** → Report to vendor, patch locally if critical, set acceptance criteria for future procurement.
4. **"What's the ROI of accessibility?"** → Legal risk reduction (ADA lawsuits averaged $25K+ settlement), 15% more addressable users, SEO benefits (semantic HTML = better crawling), keyboard-first UX benefits power users.

────────────────────────────────────
## 5. Code Example (TypeScript)
────────────────────────────────────

### Automated A11y Report Generator

```typescript
import AxeBuilder from '@axe-core/playwright';
import { chromium, Page, Browser } from 'playwright';
import * as fs from 'fs';

interface ViolationSummary {
  page: string;
  total: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  violations: {
    id: string;
    impact: string;
    description: string;
    count: number;
    wcag: string[];
  }[];
}

async function generateA11yReport(urls: string[]): Promise<ViolationSummary[]> {
  const browser: Browser = await chromium.launch();
  const results: ViolationSummary[] = [];

  for (const url of urls) {
    const page: Page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const summary: ViolationSummary = {
      page: url,
      total: axeResults.violations.length,
      critical: axeResults.violations.filter((v) => v.impact === 'critical').length,
      serious: axeResults.violations.filter((v) => v.impact === 'serious').length,
      moderate: axeResults.violations.filter((v) => v.impact === 'moderate').length,
      minor: axeResults.violations.filter((v) => v.impact === 'minor').length,
      violations: axeResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? 'unknown',
        description: v.description,
        count: v.nodes.length,
        wcag: v.tags.filter((t) => t.startsWith('wcag')),
      })),
    };

    results.push(summary);
    await page.close();
  }

  await browser.close();

  // Write report
  fs.writeFileSync(
    'a11y-report.json',
    JSON.stringify(results, null, 2)
  );

  // Console summary
  for (const r of results) {
    console.log(`\n${r.page}: ${r.total} violations`);
    console.log(`  Critical: ${r.critical} | Serious: ${r.serious} | Moderate: ${r.moderate} | Minor: ${r.minor}`);
  }

  return results;
}
```

────────────────────────────────────
## 6. Memory Aid (Quick Recall)
────────────────────────────────────

**The a11y fix pipeline: "ATFVP"** — Audit → Triage → Fix → Verify → Prevent.

**Top 6 fixes that resolve 90% of violations:**
1. Contrast → Update design tokens (fixes 83%)
2. Alt text → Content sweep (fixes 58%)
3. Form labels → `<label for>` + `aria-label` (fixes 54%)
4. Empty links → `aria-label` on icon links (fixes 49%)
5. Document lang → `<html lang="en">` (fixes 19%)
6. Empty buttons → `aria-label` on icon buttons (fixes 27%)

**If you go blank:** "Automate with axe-core in CI, triage by user impact, batch fixes by category (contrast is one PR via design tokens), verify with NVDA + VoiceOver, and gate PRs on Lighthouse a11y score ≥ 95."

────────────────────────────────────
## 7. Why & How Summary
────────────────────────────────────

**Why it matters:**
→ 96.3% of websites fail WCAG 2. At SAP, Hruday's team achieved 80% violation reduction through a systematic remediation pipeline. ADA lawsuits are increasing 300% year-over-year. Accessibility is both a legal requirement and a competitive advantage (15% more addressable users, better SEO, better keyboard UX).

**How it works:**
→ Five phases: (1) Automated audit (axe-core + Pa11y) to generate baseline, (2) Triage by user impact (P1-P4), (3) Batch fixes by category (design tokens for contrast, component-level for focus/labels), (4) Manual verification with screen readers (NVDA + VoiceOver), (5) CI/CD gates (axe in Jest, Pa11y-CI, Lighthouse threshold) to prevent regressions.

**Company relevance:**
→ **Google:** Material Design mandates WCAG AA. Google's internal a11y team reviews all product launches. Interview questions test practical remediation knowledge, not just WCAG theory.
→ **Microsoft:** Inclusive Design is a core principle. Fluent UI has per-component a11y test suites. Microsoft Accessibility Insights is their open-source testing tool.
→ **SAP (Hruday's current):** Fiori WCAG AA certification — Hruday's direct experience leading this remediation is his strongest differentiator in a11y interviews.
