# 335 – Visual Regression Testing – Storybook, Chromatic, Percy

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Visual regression testing captures screenshots of components/pages and compares them against baselines to detect unintended visual changes. **Storybook** isolates component states, **Chromatic** (by Storybook team) does cloud-based visual diffing, **Percy** (BrowserStack) does cross-browser visual testing.

## 2. 🔬 DEEP-DIVE EXPLANATION

### Tools Comparison
| Tool | Approach | Pricing | Best For |
|---|---|---|---|
| **Chromatic** | Cloud Storybook snapshots | Free tier (5K/month) | Component-level visual testing |
| **Percy** | Full-page screenshots | Free tier (5K/month) | Cross-browser full-page tests |
| **Playwright** | Built-in screenshot comparison | Free | E2E visual testing |
| **BackstopJS** | Open-source, self-hosted | Free | Budget-conscious teams |

```typescript
// ──── PLAYWRIGHT VISUAL TESTING ────
import { test, expect } from '@playwright/test';

test('homepage visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixelRatio: 0.01, // allow 1% pixel difference
    animations: 'disabled',  // deterministic screenshots
  });
});

test('button states', async ({ page }) => {
  await page.goto('/components/button');
  await expect(page.locator('.btn-primary')).toHaveScreenshot('btn-default.png');
  await page.locator('.btn-primary').hover();
  await expect(page.locator('.btn-primary')).toHaveScreenshot('btn-hover.png');
});

// ──── STORYBOOK STORY (for Chromatic) ────
// Button.stories.tsx
export default { title: 'Components/Button', component: Button };
export const Primary = { args: { variant: 'primary', label: 'Click Me' } };
export const Disabled = { args: { variant: 'primary', label: 'Disabled', disabled: true } };
export const Loading = { args: { variant: 'primary', label: 'Loading', loading: true } };
// Each story = one visual snapshot in Chromatic
```

```yaml
# ──── CHROMATIC IN CI ────
- name: Visual Tests
  run: npx chromatic --project-token=${{ secrets.CHROMATIC_TOKEN }}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Visual regression testing is my safety net for CSS changes. I use Storybook stories as the source of truth for component states, then Chromatic captures screenshots per story on every PR. For E2E visual tests, Playwright's toHaveScreenshot() is built-in and free. At SAP, this caught 15+ CSS regressions in the first month."*

## 4. 🧠 MEMORY AID
**"Storybook = component isolation. Chromatic = cloud visual diff per story. Percy = cross-browser full page. Playwright = free built-in screenshots."**

## 5. 🎯 KEY INSIGHT
Always disable animations and use deterministic data in visual tests. Animations cause pixel differences that trigger false positives.
