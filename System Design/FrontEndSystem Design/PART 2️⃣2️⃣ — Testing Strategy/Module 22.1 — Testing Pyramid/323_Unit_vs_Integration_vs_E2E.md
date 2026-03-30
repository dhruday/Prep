# 323 – Unit vs Integration vs E2E – When to Use Which

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Unit tests** verify individual functions/components in isolation (fast, many). **Integration tests** verify how modules work together (medium speed, medium count). **E2E tests** simulate real user flows through the full stack (slow, few). The right mix depends on your app's risk profile — most frontend apps benefit from emphasizing integration tests.

## 2. 🔬 DEEP-DIVE EXPLANATION

| Dimension | Unit | Integration | E2E |
|---|---|---|---|
| **Scope** | Single function/component | Module interactions | Full user flow |
| **Speed** | <10ms each | 50-500ms each | 2-30s each |
| **Reliability** | Very stable | Stable | Flaky risk |
| **Setup** | Minimal mocking | Some real, some mocked | Full environment |
| **Catches** | Logic bugs | Interface mismatches | Workflow breaks |
| **Example** | `formatCurrency()` returns correct string | Cart component calls API and renders items | User logs in → adds item → checks out |

### When to Use Which
- **Unit**: Pure functions, utilities, reducers, custom hooks, complex business logic
- **Integration**: Component with children, form submission flow, state management integration
- **E2E**: Critical paths (login, checkout, payment), cross-page flows

### Anti-Patterns
- ❌ Only unit testing — misses how components integrate
- ❌ Only E2E testing — slow feedback, expensive maintenance
- ❌ Testing implementation details (internal state names, method calls)
- ✅ Test behavior: "When user clicks Add, item appears in cart"

```typescript
// Unit test example
describe('formatPrice', () => {
  it('formats with currency symbol', () => {
    expect(formatPrice(1299, 'USD')).toBe('$12.99');
  });
});

// Integration test example
describe('CartComponent', () => {
  it('adds item and updates total', async () => {
    render(<CartPage />);
    await userEvent.click(screen.getByText('Add to Cart'));
    expect(screen.getByTestId('total')).toHaveTextContent('$12.99');
  });
});

// E2E test example (Playwright)
test('checkout flow', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="add-item"]');
  await page.click('[data-testid="checkout"]');
  await expect(page.locator('.confirmation')).toBeVisible();
});
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I use unit tests for pure logic and utilities, integration tests for component interactions and data flows, and E2E for critical business paths. I've moved toward the Testing Trophy model — heavy on integration tests — because they catch the most real bugs per effort. At SAP, I focused E2E on the 5 critical user journeys while having 80% coverage with integration tests."*

## 4. 🧠 MEMORY AID
**"Unit = fast/isolated/many. Integration = realistic/medium. E2E = full user flow/few. Testing Trophy: mostly integration tests."**

## 5. 🎯 COMPLEXITY
Unit: 100s-1000s, seconds to run | Integration: 50-200, minutes | E2E: 10-50, 5-15min
