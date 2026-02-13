# 152. Accessibility as NFR (Non-Functional Requirement)

## 1. High-Level Explanation (Frontend Interview Level)

**Accessibility as NFR** means treating accessibility not as an optional feature but as a core non-functional requirement like performance, security, and scalability—integrated from design phase through deployment with automated enforcement preventing regressions.

- **What**: WCAG compliance as mandatory requirement, not afterthought
- **Why**: Legal compliance (ADA lawsuits $25M+ settlements), 1B+ disabled users (WHO), ethical imperative
- **When**: From design phase, enforced in CI/CD, continuous monitoring
- **Role**: System design consideration at architecture level, not UI polish

**Key Principle**: "Shift left" – catch accessibility issues in design/dev, not production.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Architecture-Level Integration

**1. Design System with Accessibility Baked In**:
```typescript
// Design tokens enforce accessible color combinations
interface ColorToken {
  name: string;
  value: string;
  contrastWith: string[];  // Pre-validated combinations
  wcagLevel: 'AA' | 'AAA';
}

const tokens: ColorToken[] = [
  {
    name: 'text.primary',
    value: '#1a1a1a',
    contrastWith: ['background.surface'],  // 16:1 ratio (AAA)
    wcagLevel: 'AAA'
  },
  {
    name: 'background.surface',
    value: '#ffffff',
    contrastWith: ['text.primary', 'text.secondary'],
    wcagLevel: 'AAA'
  }
];

// Build-time validation
function validateTokens(tokens: ColorToken[]): void {
  tokens.forEach(token => {
    token.contrastWith.forEach(targetName => {
      const target = tokens.find(t => t.name === targetName);
      if (!target) {
        throw new Error(`Token ${targetName} not found`);
      }
      
      const ratio = getContrastRatio(token.value, target.value);
      const minRatio = token.wcagLevel === 'AAA' ? 7 : 4.5;
      
      if (ratio < minRatio) {
        throw new Error(
          `${token.name} vs ${targetName}: ${ratio.toFixed(2)}:1 ` +
          `(need ${minRatio}:1 for ${token.wcagLevel})`
        );
      }
    });
  });
}

// Run in CI – build fails if tokens don't meet WCAG
validateTokens(tokens);
```

**2. Component Library with Accessibility Enforced**:
```tsx
// Button component with accessibility requirements baked in

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  // aria-label required if children is not text
  'aria-label'?: string;
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  'aria-label': ariaLabel,
  ...rest
}: ButtonProps) {
  // Enforce: Text content OR aria-label required
  useEffect(() => {
    if (typeof children !== 'string' && !ariaLabel) {
      console.error(
        'Button: Must provide aria-label when children is not text'
      );
    }
  }, [children, ariaLabel]);
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      // Min touch target: 44x44px (WCAG 2.5.5)
      style={{
        minHeight: '44px',
        minWidth: '44px',
        padding: '12px 16px'
      }}
      // Focus indicator: 3:1 contrast minimum (WCAG 2.4.7)
      className={`
        button
        button--${variant}
        focus:outline-2
        focus:outline-offset-2
        focus:outline-blue-600
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
```

**3. Automated Accessibility Testing in CI/CD**:
```typescript
// Jest + jest-axe: Fail tests on accessibility violations

import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('ProductCard', () => {
  it('should be accessible', async () => {
    const { container } = render(
      <ProductCard
        title="Product Name"
        price={29.99}
        image="/product.jpg"
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    // Fails if: Missing alt text, insufficient contrast,
    //           no keyboard access, invalid ARIA
  });
  
  it('should have keyboard navigation', () => {
    const { getByRole } = render(<ProductCard />);
    
    const button = getByRole('button', { name: /add to cart/i });
    
    // Tab navigation
    button.focus();
    expect(button).toHaveFocus();
    
    // Enter key activation
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    expect(mockAddToCart).toHaveBeenCalled();
  });
});

// Lighthouse CI: Fail builds on accessibility score < 90
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "color-contrast": "error",
        "image-alt": "error",
        "label": "error",
        "valid-lang": "error"
      }
    }
  }
}
```

### Accessibility Performance Budgets

**1. Screen Reader Performance**:
```typescript
// Large DOM = slow screen reader performance

interface PerformanceBudget {
  maxDOMNodes: number;        // Max DOM nodes for screen readers
  maxARIALiveUpdates: number; // Max updates per second
  maxFocusableElements: number; // Max tab stops per page
}

const budget: PerformanceBudget = {
  maxDOMNodes: 1500,           // NVDA slows down >1500 nodes
  maxARIALiveUpdates: 3,       // Max 3 announcements/sec
  maxFocusableElements: 100    // Max 100 tab stops
};

// Monitor in production
class AccessibilityPerformanceMonitor {
  checkDOMSize(): void {
    const nodeCount = document.querySelectorAll('*').length;
    
    if (nodeCount > budget.maxDOMNodes) {
      console.warn(
        `DOM too large for screen readers: ${nodeCount} nodes ` +
        `(budget: ${budget.maxDOMNodes})`
      );
      
      // Suggest virtual scrolling
      this.suggestVirtualization();
    }
  }
  
  throttleARIALiveUpdates(): void {
    let updateCount = 0;
    let lastReset = Date.now();
    
    return (message: string) => {
      const now = Date.now();
      
      // Reset counter every second
      if (now - lastReset > 1000) {
        updateCount = 0;
        lastReset = now;
      }
      
      updateCount++;
      
      if (updateCount > budget.maxARIALiveUpdates) {
        console.warn(
          `Too many ARIA live updates: ${updateCount}/sec ` +
          `(budget: ${budget.maxARIALiveUpdates}/sec)`
        );
        return; // Skip update
      }
      
      // Announce to screen reader
      announceToScreenReader(message);
    };
  }
}
```

**2. Keyboard Navigation Complexity**:
```typescript
// Too many tab stops = unusable keyboard navigation

function auditTabStops() {
  const focusableElements = document.querySelectorAll(
    'a[href], button:not([disabled]), ' +
    'input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const count = focusableElements.length;
  
  if (count > budget.maxFocusableElements) {
    console.warn(
      `Too many tab stops: ${count} ` +
      `(budget: ${budget.maxFocusableElements})`
    );
    
    // Suggestions
    console.info('Consider:');
    console.info('- Skip links for long lists');
    console.info('- Roving tabindex for complex widgets');
    console.info('- Collapse/expand sections');
  }
  
  return count;
}

// Skip link for long lists
function ProductList({ products }: { products: Product[] }) {
  return (
    <>
      {products.length > 20 && (
        <a href="#product-list-end" className="skip-link">
          Skip to end of list ({products.length} items)
        </a>
      )}
      
      <div role="list">
        {products.map(p => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>
      
      <div id="product-list-end" />
    </>
  );
}
```

### Scalability of Accessible Patterns

**1. Virtual Scrolling with Accessibility**:
```tsx
// Challenge: Virtual scrolling breaks screen reader navigation
// Solution: Hybrid approach with aria-setsize and aria-posinset

interface VirtualListProps {
  items: any[];
  height: number;
  itemHeight: number;
}

function AccessibleVirtualList({
  items,
  height,
  itemHeight
}: VirtualListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  
  // Calculate visible range
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(height / itemHeight),
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  return (
    <div
      role="list"
      aria-label={`List of ${items.length} items`}
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* Spacer for scrollbar positioning */}
      <div style={{ height: startIndex * itemHeight }} />
      
      {visibleItems.map((item, idx) => (
        <div
          key={item.id}
          role="listitem"
          // Tell screen reader: "Item X of Y"
          aria-setsize={items.length}
          aria-posinset={startIndex + idx + 1}
        >
          {item.name}
        </div>
      ))}
      
      {/* Spacer after */}
      <div style={{
        height: (items.length - endIndex) * itemHeight
      }} />
    </div>
  );
}
```

**2. Infinite Scroll with Announcements**:
```tsx
function AccessibleInfiniteScroll() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  
  async function loadMore() {
    setIsLoading(true);
    
    const newItems = await fetchItems();
    setItems(prev => [...prev, ...newItems]);
    
    // Announce to screen reader
    setAnnouncement(
      `Loaded ${newItems.length} more items. ` +
      `Total: ${items.length + newItems.length} items.`
    );
    
    setIsLoading(false);
  }
  
  return (
    <>
      {/* ARIA live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      
      <div role="list">
        {items.map(item => (
          <div key={item.id} role="listitem">
            {item.name}
          </div>
        ))}
      </div>
      
      {isLoading ? (
        <div role="status" aria-label="Loading more items">
          <Spinner />
        </div>
      ) : (
        <button onClick={loadMore}>
          Load More
        </button>
      )}
    </>
  );
}
```

### Legal Compliance Tracking

**1. WCAG Conformance Documentation**:
```typescript
interface WCAGCriterion {
  id: string;              // e.g., "1.4.3"
  name: string;            // e.g., "Contrast (Minimum)"
  level: 'A' | 'AA' | 'AAA';
  status: 'pass' | 'fail' | 'not-applicable';
  evidence: string;        // Proof of compliance
  dateVerified: Date;
}

const conformance: WCAGCriterion[] = [
  {
    id: '1.4.3',
    name: 'Contrast (Minimum)',
    level: 'AA',
    status: 'pass',
    evidence: 'All text has 4.5:1 contrast minimum. ' +
              'Verified with axe DevTools. Design tokens enforce compliance.',
    dateVerified: new Date('2024-01-15')
  },
  {
    id: '2.1.1',
    name: 'Keyboard',
    level: 'A',
    status: 'pass',
    evidence: 'All functionality available via keyboard. ' +
              'Automated tests verify keyboard navigation.',
    dateVerified: new Date('2024-01-15')
  }
  // ... all 78 WCAG 2.1 criteria
];

// Generate compliance report
function generateVPAT(): string {
  // VPAT = Voluntary Product Accessibility Template
  // Required for government contracts
  
  return `
    WCAG 2.1 Level AA Conformance Report
    
    Conformance Level: AA
    
    Success Criteria:
    ${conformance.map(c => `
      ${c.id} ${c.name} (Level ${c.level}): ${c.status}
      Evidence: ${c.evidence}
    `).join('\n')}
  `;
}
```

**2. Accessibility Audit Trail**:
```typescript
// Track all accessibility issues and resolutions

interface AccessibilityIssue {
  id: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagCriterion: string;  // e.g., "1.4.3"
  description: string;
  affectedUsers: string[];  // User segments affected
  discoveredDate: Date;
  resolvedDate?: Date;
  fix: string;
}

const issues: AccessibilityIssue[] = [
  {
    id: 'A11Y-001',
    severity: 'critical',
    wcagCriterion: '1.1.1',
    description: 'Product images missing alt text',
    affectedUsers: ['Blind users', 'Screen reader users'],
    discoveredDate: new Date('2024-01-10'),
    resolvedDate: new Date('2024-01-12'),
    fix: 'Added alt text to all product images. ' +
         'Enforced in ProductImage component.'
  }
];

// SLA: Critical issues must be fixed within 48 hours
function checkSLA(issue: AccessibilityIssue): boolean {
  if (issue.severity === 'critical' && !issue.resolvedDate) {
    const hoursSinceDiscovery = 
      (Date.now() - issue.discoveredDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceDiscovery > 48) {
      throw new Error(
        `Critical accessibility issue ${issue.id} breached SLA ` +
        `(${hoursSinceDiscovery.toFixed(1)} hours)`
      );
    }
  }
  
  return true;
}
```

### What NOT to Do

- ❌ **Accessibility as afterthought** (bolt-on post-launch)
- ❌ **Manual testing only** (doesn't scale, misses regressions)
- ❌ **ARIA soup** (over-use of ARIA, semantic HTML first)
- ❌ **Ignore performance** (slow screen readers = unusable)
- ❌ **No ownership** (everyone's responsibility = no one's responsibility)

---

## 3. Clear Real-World Examples

### Example 1: GOV.UK – Accessibility First

**Approach**: Accessibility as mandatory requirement for all government services.

**Implementation**:
- Design system: All components AA compliant by default
- Automated testing: Every PR checked with axe + Pa11y
- Manual testing: Regular screen reader testing (JAWS, NVDA, VoiceOver)
- WCAG compliance: Published conformance statements for all services

**Result**: 
- 100% of services meet WCAG 2.1 AA
- Reduced support costs (accessible = usable for everyone)
- Legal protection (compliance documented)

### Example 2: Microsoft – Inclusive Design Principles

**Approach**: Permanent, temporary, situational disabilities framework.

**Example**:
- Permanent: Blind user (screen reader)
- Temporary: Eye surgery (can't see screen for weeks)
- Situational: Parent holding baby (one hand free)

**Design Impact**:
- Keyboard navigation helps all three
- Voice control helps all three
- Clear visual hierarchy helps all three

**Result**: Accessibility features used by 100% of users (everyone has temporary/situational disabilities).

### Example 3: GitHub – Automated Accessibility Testing

**Pipeline**:
```yaml
# GitHub Actions workflow
name: Accessibility

on: [pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run axe tests
        run: npm run test:a11y
      
      - name: Lighthouse CI
        run: |
          npm run build
          lhci autorun
      
      - name: Comment results
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: 'Accessibility Score: 95/100 ✅'
            })
```

**Result**: Zero accessibility regressions (caught in PR before merge).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How do you ensure accessibility at scale?"

**Answer**:

"I treat accessibility as a **non-functional requirement** like performance or security—enforced architecturally, not as an afterthought:

**1. Design System with Accessibility Baked In**

Pre-validated color tokens:
```typescript
{
  name: 'text.primary',
  value: '#1a1a1a',
  contrastWith: ['background.surface'],  // 16:1 (AAA)
  wcagLevel: 'AAA'
}
```

Build fails if tokens don't meet WCAG.

Components enforce accessibility:
- Min 44x44px touch targets (WCAG 2.5.5)
- Focus indicators 3:1 contrast (WCAG 2.4.7)
- aria-label required if no text content

**2. Automated Testing in CI/CD**

Every PR runs:
```typescript
// Jest + jest-axe
const results = await axe(container);
expect(results).toHaveNoViolations();
```

Lighthouse CI:
```json
{
  "assertions": {
    "categories:accessibility": ["error", { "minScore": 0.9 }]
  }
}
```

Fails build if accessibility score < 90.

**3. Performance Budgets for Screen Readers**

```typescript
maxDOMNodes: 1500        // NVDA slows down >1500
maxARIALiveUpdates: 3    // Max 3 announcements/sec
maxFocusableElements: 100 // Max 100 tab stops
```

Large lists use virtual scrolling with `aria-setsize` / `aria-posinset`.

**4. Scalable Patterns**

Virtual scrolling:
```tsx
<div
  role="listitem"
  aria-setsize={10000}      // Total items
  aria-posinset={position}  // Current position
>
  Item {position} of 10,000
</div>
```

Screen reader announces position without rendering all 10,000 items.

**5. Legal Compliance**

Document WCAG conformance:
- All 78 WCAG 2.1 AA criteria tracked
- Evidence for each (screenshots, test results)
- VPAT (Voluntary Product Accessibility Template) for enterprise

SLA: Critical issues fixed within 48 hours.

**6. Ownership**

- Accessibility champions per team
- Quarterly audits (manual + automated)
- Metrics: Accessibility score, issue count, time to resolution

**7. Real-World Examples**

**GOV.UK**: All services WCAG 2.1 AA compliant by default. Design system enforces accessibility.

**GitHub**: Automated testing in every PR. Zero regressions.

**Microsoft**: Inclusive design framework. Accessibility features used by 100% of users (everyone has situational disabilities).

**Trade-offs**:

- Upfront cost: Design system, automated testing
- Ongoing cost: Manual testing, audits
- Benefit: Legal protection (ADA lawsuits $25M+ settlements), broader audience (1B+ disabled users), better UX for everyone

**Challenges**:

- Virtual scrolling + screen readers (use aria-setsize/posinset)
- SPA navigation (announce route changes with aria-live)
- Complex widgets (roving tabindex, extensive keyboard handlers)

I prioritize **shift left**: Catch issues in design/dev, not production. Automated testing prevents regressions. Manual testing ensures real-world usability."

---

## 6. Why & How Summary

### Why It Matters

**Legal**: ADA lawsuits ($25M+ settlements for Target, Domino's)  
**Ethical**: 1B+ disabled users (WHO), human right to access information  
**Business**: Broader audience, better SEO, improved usability for all

### How to Implement

**1. Design System**: Pre-validated color tokens, accessible components by default  
**2. Automated Testing**: jest-axe in unit tests, Lighthouse CI, fail builds < 90 score  
**3. Performance Budgets**: Max 1500 DOM nodes, 3 ARIA updates/sec, 100 tab stops  
**4. Scalable Patterns**: Virtual scrolling with aria-setsize/posinset, roving tabindex  
**5. Legal Tracking**: Document all 78 WCAG criteria, VPAT for enterprise, 48hr SLA for critical issues

**FAANG**: Treat as non-functional requirement (like security), enforce in CI/CD, design system bakes in compliance, automated + manual testing, performance budgets for assistive tech, legal compliance tracked, accessibility champions ownership model
