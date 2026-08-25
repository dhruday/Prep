# 229 – Accessibility Auditing Tools — axe, Lighthouse, Arc Toolkit

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

Accessibility auditing tools automate the detection of WCAG violations in web applications, catching issues like missing alt text, insufficient color contrast, unlabeled form fields, and invalid ARIA usage. The three key tools are: **axe-core** (the most accurate rule engine, used by Deque, integrated into Chrome DevTools), **Lighthouse Accessibility** (Google's automated audit built into Chrome, scores 0-100), and **Arc Toolkit** (by TPGi, focuses on manual + automated testing with detailed WCAG mapping). The critical insight: automated tools catch only **30-40% of accessibility issues**. The remaining 60-70% require manual testing with screen readers and keyboard navigation. These tools are the **starting point**, not the complete solution.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Tool Comparison

| Feature | axe-core / axe DevTools | Lighthouse | Arc Toolkit |
|---------|------------------------|------------|-------------|
| Engine | axe-core (open-source) | Uses axe-core internally | Proprietary + axe |
| False positive rate | Very low (~0%) | Low | Low |
| WCAG coverage | A, AA, AAA rules | A, AA rules | A, AA with manual guides |
| CI integration | axe-core + Playwright/Cypress | Lighthouse CI | Limited |
| Output | Individual violations with fix guidance | Score (0-100) + diagnostics | Detailed report with WCAG mapping |
| Best for | Development + CI/CD | Quick audits + performance | Compliance documentation |

### axe-core Architecture

```
axe-core Rule Engine
    ↓
1. Scans the DOM (document or specified container)
2. Checks each element against 100+ rules
3. Each rule has:
   - Check functions (what to evaluate)
   - Impact level (critical, serious, moderate, minor)
   - WCAG mapping (which SC the rule addresses)
   - Fix guidance (what to do)
4. Returns:
   - violations[] — elements that FAIL
   - passes[] — elements that PASS
   - incomplete[] — elements that NEED MANUAL REVIEW
   - inapplicable[] — rules that don't apply
```

### CI/CD Integration Pattern

```typescript
// axe-core + Playwright — automated a11y testing in CI
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Homepage has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) // WCAG 2.1 AA
    .exclude('#third-party-widget') // Exclude elements you don't control
    .analyze();
  
  // Fail the build if any critical/serious violations
  const criticalViolations = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );
  
  expect(criticalViolations).toHaveLength(0);
});
```

### Lighthouse Accessibility Audit

Lighthouse accessibility scoring:
- Runs axe-core rules against the rendered page
- Each rule has a weight (some issues count more than others)
- Score = weighted sum of passing rules / total applicable rules × 100
- **Score of 100 does NOT mean your site is accessible** — it means you passed all automated checks

### What Automated Tools CANNOT Catch

| Issue | Why Tools Miss It |
|-------|------------------|
| Focus management in SPAs | Tools can't test dynamic interactions |
| Screen reader announcement quality | Tools check markup, not SR experience |
| Reading order vs visual order | Tools can't assess logical flow |
| Keyboard trap (complex widgets) | Requires interactive testing |
| Alt text quality ("image.png" passes) | Tools check presence, not quality |
| Error message association timing | Dynamic content timing is untestable |
| Cognitive accessibility | No rule can evaluate "plain language" |

### Anti-Patterns

- ❌ **"We got 100 on Lighthouse, we're accessible"** — 100 = no automated violations. 60-70% of real issues are unchecked.
- ❌ **Running axe only on the homepage** — test every page type, every state (modals open, forms filled, error states)
- ❌ **Ignoring `incomplete` results** — these are axe's way of saying "I can't determine this, check manually"
- ❌ **Adding `aria-label` to everything to fix violations** — over-labeling creates screen reader noise
- ❌ **Not running in CI** — accessibility regressions sneak in with every PR

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Hruday @ SAP Labs — axe-core CI Integration

At SAP, we integrated axe-core with our Playwright E2E test suite. Every PR ran accessibility checks on 8 key page types (login, dashboard, invoice list, invoice detail, settings, reports, user management, help). We caught 47 violations in the first run — 12 critical (missing form labels, empty buttons), 18 serious (contrast violations). Within 2 sprints, we reached zero critical/serious violations, and the CI pipeline prevented regressions.

### FAANG: Microsoft Accessibility Insights

Microsoft built Accessibility Insights — a Chrome/Edge extension that provides:
1. **FastPass**: automated axe-core scan (2 minutes)
2. **Assessment**: guided manual testing (30-60 minutes, covers the 60-70% that tools miss)
3. **Ad hoc tools**: tab stops visualizer, color analyzer, headings outline

Microsoft requires both FastPass (automated) AND Assessment (manual) pass before shipping any feature in Office 365.

### FAANG: Adobe

Adobe uses a combination of axe-core in CI (every component in Spectrum must pass), plus manual testing with NVDA/VoiceOver for every component variant. Their "accessibility acceptance criteria" document maps each component to specific WCAG SCs and required screen reader announcements.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"I use a layered approach to accessibility auditing: automated tools in CI catch the 30-40% of issues that are programmatically detectable, and manual testing covers the rest.*

*In CI, I integrate axe-core with Playwright — every PR runs accessibility checks against 8 page types with WCAG 2.1 AA rules. Critical and serious violations fail the build. This prevents regressions and catches the obvious issues: missing labels, empty buttons, contrast violations.*

*But automated tools have a ceiling. Lighthouse 100 doesn't mean accessible — it means no automated violations. The remaining 60-70% requires manual testing: screen reader testing with NVDA and VoiceOver, keyboard navigation verification, and focus management testing in SPA route changes. At SAP, we used axe in CI for prevention plus quarterly manual audits with Deque's assessment for comprehensive WCAG AA coverage."*

### Likely Follow-up Questions

1. **"How do you handle third-party component accessibility?"** — Audit them with axe before adoption. If violations exist, check if the library is actively addressing a11y. Use `exclude()` in axe scans for elements you truly can't control, but document the risk.
2. **"axe vs Lighthouse — which should I use?"** — Both. Lighthouse uses axe-core internally but adds a score and CI integration. Use axe directly in tests for granular control; Lighthouse for quick audits and performance context.
3. **"What if the design violates WCAG?"** — Raise it during design review. Color contrast violations are the most common. Use Figma plugins (Stark, axe for Figma) to catch issues before implementation.

### Comparison: Auditing Tools Workflow

| Stage | Tool | Purpose |
|-------|------|---------|
| Design | Stark / axe for Figma | Catch contrast + structure issues in design |
| Development | axe DevTools extension | Live feedback while coding |
| PR / CI | axe-core + Playwright | Automated regression prevention |
| QA | NVDA + VoiceOver + keyboard | Manual testing for remaining 60-70% |
| Release | Lighthouse CI | Accessibility score tracking over time |
| Compliance | Arc Toolkit + Deque audit | Formal WCAG AA certification documentation |

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Complete CI/CD accessibility testing setup

// 1. Playwright + axe-core test
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGE_ROUTES = [
  '/',
  '/dashboard',
  '/invoices',
  '/invoices/123',
  '/settings',
  '/reports',
];

for (const route of PAGE_ROUTES) {
  test(`a11y: ${route} has no WCAG AA violations`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log(`A11y violations on ${route}:`);
      results.violations.forEach(v => {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
        v.nodes.forEach(n => console.log(`    ${n.html}`));
      });
    }
    
    expect(results.violations).toHaveLength(0);
  });
}

// 2. Test modal/dialog states
test('a11y: open modal has no violations', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('[data-testid="create-invoice-btn"]');
  await page.waitForSelector('[role="dialog"]');
  
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]') // Only scan the modal
    .analyze();
  
  expect(results.violations).toHaveLength(0);
});

// 3. Lighthouse CI config (lighthouserc.js)
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/dashboard'],
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'temporary-public-storage', // or your LHCI server
    },
  },
};
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Automated tools are the spell-checker; manual testing is the editor."** axe-core in CI prevents regressions (the 30-40%). Screen reader + keyboard testing catches the real experience (the 60-70%). Lighthouse 100 ≠ accessible. Three-layer defense: **CI (axe)** → **QA (NVDA + keyboard)** → **Compliance (formal audit)**. The killer phrase: "I use automated axe checks in CI for regression prevention, complemented by manual screen reader testing for the issues tools can't programmatically detect."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ Without tooling, accessibility regressions sneak into every sprint. Without manual testing, 60-70% of issues ship to production. A layered approach — automated CI checks + manual QA + periodic formal audits — provides comprehensive WCAG coverage.

**How it works:**
→ axe-core scans the DOM against 100+ rules mapped to WCAG criteria. It returns violations (fails), passes, incomplete (needs manual review), and inapplicable. Integrate into CI with Playwright/Cypress to prevent regressions. Complement with Lighthouse CI for score tracking and manual screen reader testing for complete coverage.

**Company relevance:**
→ **Microsoft**: Built Accessibility Insights. Requires FastPass + Assessment for every feature. Will ask how you integrate automated a11y testing.
→ **Adobe**: Spectrum components require axe-core CI pass plus NVDA/VoiceOver manual testing matrix.
→ **Salesforce**: LWC components must pass axe-core checks. SLDS has built-in accessibility testing guidance.
→ **Cisco**: Webex VPAT (Voluntary Product Accessibility Template) requires documented accessibility testing results — both automated and manual.
