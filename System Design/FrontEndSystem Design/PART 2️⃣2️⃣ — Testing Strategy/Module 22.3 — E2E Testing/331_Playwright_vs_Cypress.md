# 331 – Playwright vs Cypress – Architecture & Trade-offs

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Cypress** runs in-browser (same process as app), great DX, but single-tab only. **Playwright** controls browsers via CDP/WebSocket externally, supports multi-tab, multi-browser, and is faster for parallel execution. Playwright is the industry trend for new projects.

## 2. 🔬 DEEP-DIVE EXPLANATION

| Feature | Cypress | Playwright |
|---|---|---|
| **Architecture** | In-browser (same event loop) | Out-of-process (CDP/WebSocket) |
| **Browsers** | Chrome, Firefox, Edge | Chrome, Firefox, Safari, Edge |
| **Multi-tab** | ❌ No | ✅ Yes |
| **Multi-domain** | Limited (cy.origin) | ✅ Native |
| **Parallel** | Via Cypress Cloud ($) | Built-in sharding (free) |
| **Auto-wait** | ✅ Yes | ✅ Yes |
| **Network intercept** | cy.intercept() | route() / page.on('request') |
| **Language** | JavaScript only | JS, TS, Python, Java, C# |
| **Mobile** | Limited | Android/iOS emulation |
| **Speed** | Medium | Fast |
| **DX** | Excellent (time travel UI) | Good (trace viewer, codegen) |

```typescript
// ──── CYPRESS ────
describe('Login', () => {
  it('logs in successfully', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('hruday@test.com');
    cy.get('[data-testid="password"]').type('pass123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('.welcome').should('contain', 'Hruday');
  });
});

// ──── PLAYWRIGHT ────
import { test, expect } from '@playwright/test';
test('logs in successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'hruday@test.com');
  await page.fill('[data-testid="password"]', 'pass123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('.welcome')).toContainText('Hruday');
});
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Cypress runs in-browser — great DX with time-travel debugging but limited to single tab. Playwright runs out-of-process — supports multi-tab, all browsers including Safari, and free parallel execution. For new projects, I choose Playwright for its broader capabilities and speed."*

## 4. 🧠 MEMORY AID
**"Cypress = same process, single tab, great DX. Playwright = external process, multi-tab, multi-browser, faster."**

## 5. 🎯 KEY INSIGHT
Playwright's codegen (`npx playwright codegen`) generates test code from user actions — great for bootstrapping E2E tests quickly.
