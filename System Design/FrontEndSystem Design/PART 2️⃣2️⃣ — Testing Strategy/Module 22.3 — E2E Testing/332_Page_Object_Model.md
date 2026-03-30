# 332 – Page Object Model (POM) Pattern

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Page Object Model encapsulates page-specific selectors and actions into classes. Tests call `loginPage.login(email, password)` instead of raw selectors. Benefits: DRY, easy maintenance when UI changes, readable tests. Industry standard for E2E test organization.

## 2. 🔬 DEEP-DIVE EXPLANATION

```typescript
// ──── PAGE OBJECT (Playwright) ────
import { Page, Locator } from '@playwright/test';

class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() { await this.page.goto('/login'); }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

class DashboardPage {
  readonly page: Page;
  readonly welcomeText: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeText = page.locator('.welcome');
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
  }

  async isVisible() { return this.welcomeText.isVisible(); }
  async logout() { await this.logoutButton.click(); }
}

// ──── TEST USING PAGE OBJECTS ────
import { test, expect } from '@playwright/test';

test('successful login redirects to dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.goto();
  await loginPage.login('hruday@test.com', 'password123');
  
  await expect(dashboardPage.welcomeText).toContainText('Hruday');
});

test('invalid credentials show error', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('wrong@test.com', 'wrong');
  
  await expect(loginPage.errorMessage).toHaveText('Invalid credentials');
});

// ──── COMPONENT-BASED PAGE OBJECT (reusable across pages) ────
class NavigationBar {
  constructor(private page: Page) {}
  
  async navigateTo(section: string) {
    await this.page.getByRole('link', { name: section }).click();
  }
  
  async search(query: string) {
    await this.page.getByPlaceholder('Search...').fill(query);
    await this.page.keyboard.press('Enter');
  }
}
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"POM encapsulates selectors and actions per page. When a button's selector changes, I update one place — not every test. I split page objects into page-level (LoginPage) and component-level (NavigationBar) for reusability. This is exactly how I structured E2E tests at SAP."*

## 4. 🧠 MEMORY AID
**"Page Object = class per page with selectors as properties and actions as methods. Selector changes → fix one class, not N tests."**

## 5. 🎯 KEY INSIGHT
Keep page objects focused on **actions** (login, addToCart) not individual steps (fill email, fill password). Tests should read like user stories.
