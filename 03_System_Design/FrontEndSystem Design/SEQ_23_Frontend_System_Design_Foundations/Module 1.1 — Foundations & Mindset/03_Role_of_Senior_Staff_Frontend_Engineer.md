# Role of a Senior / Staff Frontend Engineer

## 1. High-Level Explanation (Frontend Interview Level)

A **Senior/Staff Frontend Engineer** is not just a developer who writes React code faster or knows more libraries. At this level, you are an **architect, technical leader, and force multiplier** for your team and organization.

### Core Responsibilities Shift:

| Junior/Mid-Level | Senior Level | Staff Level |
|------------------|--------------|-------------|
| **Implement features** | **Design systems** | **Set technical direction** |
| Follow patterns | Define patterns | Establish standards across teams |
| Work on assigned tasks | Own entire features | Own platform capabilities |
| Ask "How?" | Ask "Why?" and "What if?" | Ask "Should we?" and "What's the impact?" |
| Focus on code quality | Focus on system quality | Focus on organizational impact |
| Ship features | Ship features reliably at scale | Enable teams to ship features faster |
| Optimize components | Optimize architecture | Optimize processes and culture |

### What Senior/Staff Engineers Do:

**1. System Design & Architecture**
- Design component architectures that scale to millions of users
- Make technology choices (framework, state management, rendering strategy)
- Create technical specifications and RFC documents
- Balance trade-offs (performance vs developer experience, simplicity vs flexibility)

**2. Technical Leadership**
- Mentor junior/mid engineers through code reviews and pair programming
- Define coding standards, best practices, and design patterns
- Lead technical discussions and architecture reviews
- Break down complex projects into manageable tasks

**3. Cross-Functional Collaboration**
- Work with product managers to shape requirements
- Partner with designers to define component APIs
- Collaborate with backend engineers on API contracts
- Communicate technical constraints to non-technical stakeholders

**4. Production Ownership**
- Responsible for system reliability and performance
- Debug complex production issues
- Set up monitoring, alerting, and observability
- Plan for failure modes and disaster recovery

**5. Strategic Thinking**
- Identify technical debt and create paydown plans
- Evaluate new technologies and their adoption
- Improve developer productivity (tooling, CI/CD, dev experience)
- Think 6-12 months ahead (What will we need when we're 10x larger?)

**6. Force Multiplication**
- Enable other engineers to be more effective
- Create reusable components, libraries, and tools
- Write documentation that prevents repeated questions
- Reduce friction in development workflows

### Why This Role Exists:

As companies scale from 10 to 100 to 1000+ engineers:
- **Coordination becomes expensive** - need standards and patterns
- **Quality varies** - need mentorship and code review
- **Technical debt accumulates** - need strategic thinking
- **Systems become complex** - need architects who understand the whole picture

Senior/Staff engineers are **force multipliers** who enable teams to move faster while maintaining quality.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Mindset Shift: From Coding to Impact

#### Junior/Mid Engineer Success Metrics:
```javascript
// Success = shipping features quickly
function Success() {
  return (
    <div>
      ✅ Implemented login page
      ✅ Added dark mode toggle
      ✅ Fixed 5 bugs this week
      ✅ Wrote clean code
    </div>
  );
}
```

#### Senior/Staff Engineer Success Metrics:
```javascript
// Success = multiplying team impact
function Success() {
  return (
    <div>
      ✅ Reduced app bundle size by 40% → 15% increase in conversion
      ✅ Built design system → 3 teams ship features 2x faster
      ✅ Established frontend architecture → 0 production incidents in Q3
      ✅ Mentored 2 engineers to senior level → team capacity increased
      ✅ Identified and prevented scaling issue → saved 6 months of rework
    </div>
  );
}
```

**Key Difference:**
- Junior/Mid: "I shipped this feature"
- Senior/Staff: "The team shipped 10 features because of the foundation I built"

---

### 1. System Design & Architecture Ownership

#### Example: Building an Autocomplete Component

**Mid-Level Approach:**
```javascript
// Works, but not production-ready
function Autocomplete() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const handleChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length > 2) {
      const data = await fetch(`/api/search?q=${value}`).then(r => r.json());
      setResults(data);
    }
  };
  
  return (
    <div>
      <input value={query} onChange={handleChange} />
      <ul>
        {results.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
    </div>
  );
}
```

**Senior/Staff Approach:**
```javascript
// Production-ready, scalable, maintainable
import { useDebounce, useQuery, useA11y } from '@/hooks';
import { ErrorBoundary, VirtualList } from '@/components';

/**
 * Autocomplete component with:
 * - Debouncing (reduce API calls)
 * - Caching (avoid re-fetching)
 * - Virtualization (handle 1000+ results)
 * - Keyboard navigation (accessibility)
 * - Error handling (network failures)
 * - Loading states (perceived performance)
 * - Analytics (track usage)
 */
function Autocomplete({
  fetchResults,
  onSelect,
  debounceMs = 300,
  minChars = 2,
  maxResults = 50,
  placeholder = 'Search...',
  'aria-label': ariaLabel,
}) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  // Fetch with caching and deduplication
  const { data, isLoading, error, refetch } = useQuery(
    ['autocomplete', debouncedQuery],
    () => fetchResults(debouncedQuery),
    {
      enabled: debouncedQuery.length >= minChars,
      staleTime: 60000, // Cache for 1 minute
      retry: 2,
      onError: (err) => {
        // Track errors
        analytics.track('Autocomplete Error', {
          query: debouncedQuery,
          error: err.message,
        });
      },
    }
  );
  
  // Keyboard navigation (a11y)
  const { handleKeyDown, focusedIndex } = useA11y({
    items: data?.results || [],
    onSelect: (item) => {
      onSelect(item);
      setQuery('');
    },
  });
  
  // Track usage
  useEffect(() => {
    if (data?.results?.length > 0) {
      analytics.track('Autocomplete Results', {
        query: debouncedQuery,
        resultCount: data.results.length,
      });
    }
  }, [debouncedQuery, data?.results?.length]);
  
  return (
    <ErrorBoundary fallback={<div>Search unavailable</div>}>
      <div className="autocomplete" role="combobox" aria-expanded={!!data}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-controls="autocomplete-results"
          aria-activedescendant={
            focusedIndex >= 0 ? `result-${focusedIndex}` : undefined
          }
        />
        
        {isLoading && <Spinner aria-label="Loading results" />}
        
        {error && (
          <div role="alert">
            <p>Unable to load results</p>
            <button onClick={() => refetch()}>Retry</button>
          </div>
        )}
        
        {data?.results && (
          <VirtualList
            id="autocomplete-results"
            role="listbox"
            items={data.results.slice(0, maxResults)}
            itemHeight={40}
            height={400}
            renderItem={(item, index) => (
              <AutocompleteItem
                id={`result-${index}`}
                item={item}
                isSelected={index === focusedIndex}
                onClick={() => onSelect(item)}
              />
            )}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

// Export with performance tracking
export default React.memo(Autocomplete);
```

**Senior/Staff Considerations:**
1. **Performance:** Debouncing, caching, virtualization
2. **Accessibility:** ARIA attributes, keyboard navigation, screen reader support
3. **Error Handling:** Retry logic, user-friendly messages
4. **Observability:** Analytics tracking for debugging
5. **Flexibility:** Configurable via props, composable
6. **Documentation:** JSDoc with usage examples
7. **Testing:** Consider edge cases (slow network, errors, empty results)

---

### 2. Technical Leadership Through Code Review

#### Mid-Level Code Review:
```
❌ "This doesn't work"
❌ "Change this to use hooks"
❌ "Bad naming"
```

#### Senior/Staff Code Review:
```
✅ Mentoring-focused, context-rich, actionable

"Great work on the initial implementation! A few suggestions:

**Performance:**
This component re-renders on every parent render. Consider wrapping
in `React.memo()` since props rarely change.

Before:
export default ProductCard;

After:
export default React.memo(ProductCard);

Benchmark: This reduced re-renders by 80% in our similar component.

**Accessibility:**
The button is missing an aria-label for screen readers.

<button onClick={handleDelete}>
  <TrashIcon />
</button>

Should be:
<button onClick={handleDelete} aria-label="Delete product">
  <TrashIcon aria-hidden="true" />
</button>

See: https://www.w3.org/WAI/WCAG21/Understanding/name-role-value

**Architecture:**
This API call should be in a custom hook for reusability:

// hooks/useProduct.js
export function useProduct(id) {
  return useQuery(['product', id], () => fetchProduct(id));
}

// Now multiple components can reuse this logic

**Testing:**
Consider adding a test for the error state:

test('shows error message when fetch fails', async () => {
  server.use(
    rest.get('/api/product/:id', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );
  
  render(<ProductCard id="123" />);
  expect(await screen.findByText(/unable to load/i)).toBeInTheDocument();
});

Let me know if you have questions! Happy to pair on any of this."
```

**What Makes This Senior-Level:**
- ✅ Explains **why**, not just **what**
- ✅ Provides **specific examples** and **before/after**
- ✅ References **standards** and **documentation**
- ✅ **Educates** rather than criticizes
- ✅ Offers to **help** (pair programming)
- ✅ Thinks about **testing** and **observability**

---

### 3. Cross-Functional Collaboration

#### Scenario: Product Manager Wants a Feature "By Tomorrow"

**Mid-Level Response:**
```
"Okay, I'll try my best!"
→ Works all night
→ Ships buggy code
→ Creates technical debt
→ Burns out
```

**Senior/Staff Response:**
```
"Let's break this down. What's driving the urgency?"

[After understanding the business context]

"Here's what I can do:

**Option 1: MVP by tomorrow** (4 hours)
- Basic functionality only
- No error handling
- Desktop only
- Tech debt: Will need 2 days to productionize next week
- Risk: May break in edge cases

**Option 2: Production-ready in 3 days** (2 days)
- Full functionality
- Error handling, loading states
- Responsive design
- Tested and monitored
- Tech debt: None
- Risk: Low

**Option 3: Quick win today + full solution later**
- Ship feature flag disabled (2 hours)
- Enable for 5% of users tomorrow
- Monitor for issues
- Roll out to 100% in 3 days
- Tech debt: Minimal
- Risk: Very low

I recommend Option 3. It de-risks the launch and gives us data
to validate the feature before full rollout.

What do you think?"
```

**Senior/Staff Skills Demonstrated:**
- ✅ **Asks clarifying questions** (understand the "why")
- ✅ **Presents options** with trade-offs
- ✅ **Quantifies effort** and **risk**
- ✅ **Protects team** from burnout
- ✅ **Thinks strategically** (feature flags, gradual rollout)
- ✅ **Collaborates** rather than just executes

---

### 4. Production Ownership & Incident Management

#### Scenario: Page Load Time Increased from 2s to 8s

**Mid-Level Debugging:**
```
1. Check recent PRs
2. Roll back last deploy
3. Hope it fixes itself
```

**Senior/Staff Debugging:**
```javascript
// Systematic approach to production debugging

// 1. Gather data
console.log('Checking monitoring dashboards...');
// - Grafana: LCP increased from 2s to 8s at 10:30 AM
// - Sentry: No new errors
// - DataDog: API latency normal
// - Network tab: One 4MB JavaScript file

// 2. Form hypothesis
"Large JavaScript bundle is blocking page load"

// 3. Identify root cause
// Check build logs:
// ✅ webpack-bundle-analyzer shows lodash (500KB)
//    was imported without tree shaking

// Bad import introduced in PR #1234:
import _ from 'lodash'; // ❌ Imports entire library (500KB)

// Should be:
import { debounce } from 'lodash-es'; // ✅ Only imports debounce

// 4. Immediate mitigation
// - Revert PR #1234
// - Deploy fix
// - Verify metrics return to normal

// 5. Long-term prevention
// Add bundle size check to CI:
// package.json
{
  "scripts": {
    "build": "webpack --config webpack.config.js",
    "analyze": "webpack-bundle-analyzer dist/stats.json"
  }
}

// .github/workflows/ci.yml
- name: Check bundle size
  run: |
    npm run build
    BUNDLE_SIZE=$(ls -lh dist/main.*.js | awk '{print $5}')
    if [ "$BUNDLE_SIZE" -gt 500000 ]; then
      echo "Bundle size too large: $BUNDLE_SIZE"
      exit 1
    fi

// 6. Document incident
// Write postmortem:
// - Timeline
// - Root cause
// - Impact (20% of users affected, avg load time 8s)
// - Resolution (reverted PR)
// - Prevention (added bundle size check)

// 7. Share learnings
// - Post in Slack: "Reminder: Use lodash-es for tree shaking"
// - Update docs: "How to import from lodash"
// - Add ESLint rule: no-restricted-imports
```

**Senior/Staff Incident Response:**
1. ✅ **Stay calm** (don't panic)
2. ✅ **Gather data** (metrics, logs, traces)
3. ✅ **Form hypothesis** (scientific method)
4. ✅ **Communicate** (update stakeholders)
5. ✅ **Mitigate immediately** (stop the bleeding)
6. ✅ **Fix root cause** (not just symptoms)
7. ✅ **Prevent recurrence** (add checks, update docs)
8. ✅ **Share learnings** (blameless postmortem)

---

### 5. Strategic Technical Decisions

#### Example: Choosing a State Management Library

**Mid-Level Decision:**
```
"Let's use Redux because that's what I know."
```

**Senior/Staff Decision:**
```markdown
# RFC: State Management Strategy for Dashboard App

## Context
We're building a real-time analytics dashboard with:
- 50+ charts/tables
- Real-time data updates (WebSocket)
- Complex filtering and drill-downs
- Need to support 10K+ concurrent users

## Current Problems
- Context causing re-renders of entire component tree
- Local state duplicated across components
- No caching of API responses
- Difficult to debug state changes

## Options Evaluated

### Option 1: Redux Toolkit
**Pros:**
- ✅ Predictable state updates
- ✅ Redux DevTools for debugging
- ✅ Well-documented patterns
- ✅ Team already knows it

**Cons:**
- ❌ Boilerplate (actions, reducers, selectors)
- ❌ All state updates trigger re-renders
- ❌ No built-in async handling
- ❌ Bundle size: 15KB

**Use case fit:** 6/10

### Option 2: Zustand
**Pros:**
- ✅ Minimal boilerplate
- ✅ Fine-grained reactivity (no unnecessary re-renders)
- ✅ Built-in middleware (persist, devtools)
- ✅ Bundle size: 2KB

**Cons:**
- ❌ Less mature ecosystem
- ❌ Team learning curve
- ❌ No built-in async patterns

**Use case fit:** 7/10

### Option 3: React Query + Zustand
**Pros:**
- ✅ React Query handles server state (caching, revalidation)
- ✅ Zustand handles UI state (filters, selected items)
- ✅ Clear separation of concerns
- ✅ Automatic background refetching
- ✅ Optimistic updates built-in

**Cons:**
- ❌ Two libraries to learn
- ❌ Bundle size: 12KB total

**Use case fit:** 9/10

## Recommendation: Option 3 (React Query + Zustand)

**Rationale:**
1. **Server state is 80% of our state** → React Query's caching solves our biggest problem
2. **UI state is simple** → Zustand is lightweight for filters/selections
3. **Real-time updates** → React Query's refetch works with WebSocket
4. **Performance** → React Query prevents unnecessary fetches, Zustand prevents unnecessary re-renders
5. **Developer experience** → Less boilerplate than Redux, better debugging

**Migration Plan:**
- Week 1: Proof of concept with one chart
- Week 2: Migrate 20% of dashboard
- Week 3: Complete migration
- Week 4: Remove Context, measure performance

**Success Metrics:**
- Reduce re-renders by 50%
- Reduce API calls by 40%
- Improve LCP by 30%
- Team velocity increases (less boilerplate)

**Risks & Mitigation:**
- Risk: Team learning curve
  - Mitigation: Lunch & learn sessions, pair programming
- Risk: Bugs during migration
  - Mitigation: Gradual rollout, feature flags, monitoring

## Open Questions
1. How will this affect our mobile app? (Different state library?)
2. Should we create shared hooks for common queries?
3. What's our plan for persisting state across sessions?

## Timeline
- Decision: Jan 15
- Implementation: Jan 20 - Feb 10
- Rollout: Feb 15

## Feedback Requested
- @backend-team: Does this affect API design?
- @design-team: Any UX concerns with gradual migration?
- @mobile-team: Should we align on state management?
```

**What Makes This Staff-Level:**
- ✅ **Data-driven decision** (evaluated multiple options)
- ✅ **Clear rationale** (why this choice)
- ✅ **Considers trade-offs** (pros/cons)
- ✅ **Migration plan** (how to get there)
- ✅ **Success metrics** (how to measure)
- ✅ **Risk mitigation** (what could go wrong)
- ✅ **Cross-team impact** (asks for feedback)
- ✅ **Timeline** (realistic expectations)

---

### 6. Force Multiplication: Building Tools & Infrastructure

#### Example: Reducing Dev Environment Setup Time

**Problem:**
- New engineers take 2 days to set up local environment
- Frequent "works on my machine" issues
- Different Node versions, missing env vars, database setup

**Senior/Staff Solution:**

```bash
# create-dev-env.sh
#!/bin/bash

echo "🚀 Setting up frontend development environment..."

# 1. Check prerequisites
echo "Checking Node version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current: $(node -v)"
    exit 1
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci

# 3. Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
    echo "⚠️  Please update .env.local with your API keys"
fi

# 4. Set up Git hooks
echo "🪝 Setting up Git hooks..."
npm run prepare # Installs husky hooks

# 5. Verify setup
echo "✅ Verifying setup..."
npm run lint
npm run type-check
npm run test -- --run

# 6. Start dev server
echo "🎉 Setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "Useful commands:"
echo "  npm run test       - Run tests"
echo "  npm run build      - Build for production"
echo "  npm run storybook  - View component library"
```

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    "prepare": "husky install",
    "setup": "./scripts/setup-dev-env.sh"
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run type-check && npm run test"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

```markdown
# README.md

## Quick Start (5 minutes)

1. Clone the repository
2. Run `npm run setup`
3. Run `npm run dev`
4. Open http://localhost:3000

That's it! 🎉

## Development Workflow

### Running Tests
npm run test          # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report

### Code Quality
npm run lint          # Check for linting errors
npm run lint:fix      # Auto-fix linting errors
npm run type-check    # Check TypeScript types

### Storybook (Component Library)
npm run storybook     # Start Storybook on port 6006

## Common Issues

### "Module not found"
- Run `npm ci` to ensure dependencies are installed

### "Port 3000 already in use"
- Run `lsof -ti:3000 | xargs kill -9` to kill the process

### "Tests failing locally"
- Clear cache: `npm run test:clear-cache`
```

**Impact:**
- ⏱️ **Setup time:** 2 days → 5 minutes (96% reduction)
- 🐛 **"Works on my machine":** Eliminated
- 📚 **Documentation:** Always up-to-date (scripts are self-documenting)
- 🎯 **Onboarding:** New engineers productive on day 1
- 🔄 **Consistency:** Everyone has same dev environment

**Force Multiplication:**
If 10 engineers join per year, saving 2 days each = **20 days** of engineering time saved annually.

---

## 3. Clear Real-World Examples

### Example 1: Senior Engineer at E-Commerce Company

**Scenario:** Site is slow, conversion rate dropping

**What They Do:**

**Week 1: Investigation**
```javascript
// 1. Measure current performance
import { getCLS, getFID, getLCP } from 'web-vitals';

function measurePerformance() {
  getLCP(console.log); // Largest Contentful Paint: 4.2s ❌
  getFID(console.log); // First Input Delay: 180ms ❌
  getCLS(console.log); // Cumulative Layout Shift: 0.3 ❌
}

// 2. Identify bottlenecks
// Chrome DevTools → Performance tab:
// - Main thread blocked for 2.5s by JavaScript
// - 3MB of JavaScript loaded upfront
// - No code splitting
// - No lazy loading of images
```

**Week 2-3: Implementation**
```javascript
// 1. Code splitting by route
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));

// 2. Lazy load images
<img
  src={product.thumbnail}
  loading="lazy"
  width={300}
  height={300}
/>

// 3. Prefetch critical resources
<link rel="preload" as="image" href={heroImage} />
<link rel="preconnect" href="https://api.example.com" />

// 4. Optimize bundle
// webpack.config.js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10,
      },
    },
  },
}
```

**Week 4: Monitoring & Documentation**
```javascript
// Set up performance monitoring
import * as Sentry from '@sentry/react';

Sentry.init({
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});

// Document in Notion/Confluence:
// - Performance best practices
// - Bundle size budgets
// - Code splitting guidelines
// - When to use lazy loading
```

**Results:**
- 📊 **LCP:** 4.2s → 1.8s (57% improvement)
- 📊 **FID:** 180ms → 50ms (72% improvement)
- 📊 **Bundle size:** 3MB → 800KB (73% reduction)
- 💰 **Conversion rate:** +12% (business impact)
- 👥 **Team velocity:** 3 other teams adopted patterns

**Senior/Staff Impact:**
- ✅ Identified systemic issue
- ✅ Fixed root cause, not symptoms
- ✅ Created reusable patterns
- ✅ Documented for future engineers
- ✅ Measured business impact

---

### Example 2: Staff Engineer Leading Design System

**Scenario:** 5 product teams building UI inconsistently

**What They Do:**

**Month 1: Discovery & Planning**
```markdown
# Design System RFC

## Problem
- Each team builds their own components
- Inconsistent UX across products
- Duplicated effort (5 teams building 5 button components)
- No accessibility standards
- Hard to rebrand

## Proposal
Build a centralized design system with:
- Component library (React)
- Design tokens (colors, spacing, typography)
- Documentation (Storybook)
- Automated testing (visual regression, a11y)
- Versioning & publishing (npm)

## Success Metrics
- 80% component reuse across teams
- 50% reduction in UI development time
- 100% WCAG 2.1 AA compliance
- 90% design-dev handoff efficiency

## Timeline
- Month 1: Build core components (Button, Input, Card)
- Month 2: Build complex components (Modal, Dropdown, Table)
- Month 3: Migrate 2 products
- Month 4: All products using design system
```

**Month 2-3: Implementation**
```javascript
// packages/design-system/src/Button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button component with variants and sizes.
 * 
 * @example
 * <Button variant="primary" size="medium">
 *   Click me
 * </Button>
 */

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        small: 'h-8 px-3 text-sm',
        medium: 'h-10 px-4',
        large: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'medium',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Spinner className="mr-2" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

```typescript
// packages/design-system/src/tokens/colors.ts
/**
 * Design tokens for colors.
 * Source of truth for brand colors.
 */
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    // ... 
    600: '#2563eb', // Main brand color
    // ...
  },
  gray: {
    // ...
  },
  success: {
    // ...
  },
  error: {
    // ...
  },
} as const;
```

```typescript
// .storybook/main.ts
// Storybook for documentation
export default {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-a11y',         // Accessibility testing
    '@storybook/addon-interactions', // Interaction testing
    'storybook-addon-performance',   // Performance monitoring
  ],
};
```

**Month 4: Adoption & Governance**
```javascript
// Migration guide for teams
// docs/migration-guide.md

## Migration Checklist

### Phase 1: Install Design System
npm install @company/design-system

### Phase 2: Replace Custom Components
❌ Before:
import Button from './components/Button';

✅ After:
import { Button } from '@company/design-system';

### Phase 3: Use Design Tokens
❌ Before:
<div style={{ color: '#2563eb' }}>

✅ After:
import { colors } from '@company/design-system/tokens';
<div style={{ color: colors.primary[600] }}>

### Phase 4: Remove Custom Components
Delete ./components/Button.tsx (no longer needed)

## Support
- Slack: #design-system
- Office hours: Tuesdays 2-3 PM
- Pair programming: Book time with @staff-engineer
```

**Results:**
- 👥 **5 teams using design system** within 4 months
- ⏱️ **40% reduction in UI development time**
- ♿ **100% WCAG 2.1 AA compliance**
- 🎨 **Consistent UX** across all products
- 🚀 **Rebrand completed in 1 week** (just update tokens)

**Staff-Level Impact:**
- ✅ Led cross-team initiative
- ✅ Built reusable infrastructure
- ✅ Enabled organization to move faster
- ✅ Established governance model
- ✅ Mentored 5 teams on adoption

---

### Example 3: Senior Engineer Mentoring Junior

**Scenario:** Junior engineer struggling with React performance

**What Senior Does:**

**Session 1: Pair Programming**
```javascript
// Junior's code (slow)
function ProductList({ products }) {
  return products.map(product => (
    <ProductCard
      key={product.id}
      product={product}
      onAddToCart={() => addToCart(product)} // ❌ New function every render
    />
  ));
}

// Senior guides:
"Let's use Chrome DevTools Profiler to see what's happening..."

[After profiling]
"See how ProductCard re-renders 100 times even when we only
clicked one button? That's because we're creating a new function
on every render.

Let's fix it together:

1. First, let's memoize ProductCard:
const ProductCard = memo(function ProductCard({ product, onAddToCart }) {
  // ...
});

2. Now, let's make onAddToCart stable:
function ProductList({ products }) {
  const handleAddToCart = useCallback((product) => {
    addToCart(product);
  }, []); // ✅ Stable function reference
  
  return products.map(product => (
    <ProductCard
      key={product.id}
      product={product}
      onAddToCart={() => handleAddToCart(product)}
    />
  ));
}

3. Let's profile again... See? Now only one ProductCard re-renders!

Try this pattern in your next component. If you get stuck, ping me!"
```

**Session 2: Code Review**
```markdown
Junior submits PR with new pattern applied.

Senior's review:
"Awesome! You applied the memoization pattern correctly. 🎉

A couple of refinements:

1. You memoized every component. Not all components need it.
   Rule of thumb: Memoize if:
   - Component re-renders often
   - Component is expensive to render
   - Props are stable

2. You can simplify this with useCallback:

❌ Current:
const handleClick = useCallback(() => {
  onClick(item);
}, [onClick, item]);

✅ Simpler:
const handleClick = () => onClick(item);
// Then memoize only if profiling shows it's needed

3. Great job adding this comment! Future you will thank you:
// Memoized because this list can have 1000+ items

Keep up the great work! Want to pair on optimizing the search
feature next week?"
```

**Session 3: Teaching** Opportunity
```markdown
Junior asks: "When should I use useMemo vs useCallback vs memo?"

Senior creates Notion doc:
```

````markdown
# React Performance Optimization Cheat Sheet

## When to Use Each

### `React.memo()` - Prevent component re-renders
**Use when:** Component re-renders unnecessarily
```javascript
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Only re-renders if `data` changes
  return <div>{complexCalculation(data)}</div>;
});
```

### `useCallback()` - Stabilize function references
**Use when:** Passing functions to memoized child components
```javascript
const Parent = () => {
  const handleClick = useCallback(() => {
    doSomething();
  }, []);
  
  return <MemoizedChild onClick={handleClick} />;
};
```

### `useMemo()` - Cache expensive calculations
**Use when:** Computing derived data is expensive
```javascript
const filteredList = useMemo(() => {
  return items.filter(item => expensiveCheck(item));
}, [items]);
```

## Decision Tree

```
Is the component slow?
├─ NO → Don't optimize (premature optimization)
└─ YES → Profile with React DevTools
    ├─ Re-rendering unnecessarily?
    │   └─ Use React.memo()
    ├─ Props changing (functions)?
    │   └─ Use useCallback()
    └─ Expensive calculation?
        └─ Use useMemo()
```

## Common Mistakes

❌ Memoizing everything
✅ Profile first, optimize what's actually slow

❌ Using useMemo for cheap calculations
✅ useMemo has overhead, only use for expensive operations

❌ Forgetting dependency arrays
✅ Always include all dependencies

## When in doubt, ASK! 🙋‍♂️
````

**Impact:**
- 📚 **Junior learned pattern** that they'll use forever
- 🚀 **Junior became more autonomous** (less hand-holding needed)
- 👥 **Junior can now teach** others (knowledge multiplied)
- 📖 **Documentation created** for entire team

---

## 4. Interview-Oriented Explanation

### Sample Interview Answer (7+ Years Experience)

**Question:** "What do you think differentiates a senior/staff frontend engineer from a mid-level engineer?"

**Your Answer:**

> "The fundamental shift is from **execution to impact**. Mid-level engineers focus on shipping features quickly. Senior and staff engineers focus on **multiplying team effectiveness**.
>
> **Let me break this down with a real example:**
>
> When I was at [Company], our checkout conversion rate was declining. A mid-level engineer might have been tasked with 'add a loading spinner' or 'optimize the button.' But as a senior engineer, I approached it differently:
>
> **1. I investigated the root cause.** I used Real User Monitoring data and found our Largest Contentful Paint was 5.2 seconds. The bottleneck wasn't the button—it was our 4MB JavaScript bundle blocking the page.
>
> **2. I thought systemically.** This wasn't just a checkout problem. Every page in our app had the same issue because we had no code splitting strategy.
>
> **3. I designed a solution.** I wrote an RFC proposing:
>    - Route-based code splitting (reduce initial bundle to 800KB)
>    - Lazy loading for below-the-fold content
>    - Bundle size budgets in CI/CD
>    - Migration plan for 15 existing pages
>
> **4. I led the implementation.** I built the initial pattern, documented it, and paired with 4 engineers to roll it out across the app.
>
> **5. I measured business impact.** LCP improved from 5.2s to 1.9s, and conversion rate increased by 14%, translating to $2M additional annual revenue.
>
> **6. I enabled the organization.** Now any engineer can build a new page with optimal performance by default. I created a force multiplier.
>
> **At the staff level, the scope expands further:**
> - Senior engineers own features and systems
> - Staff engineers own platform capabilities and organizational initiatives
> - Senior engineers make 1 team effective
> - Staff engineers make 5+ teams effective
>
> **The key skills that differentiate senior/staff are:**
> 1. **Strategic thinking** - See beyond the immediate task
> 2. **Communication** - Influence without authority
> 3. **Technical judgment** - Know when to optimize vs move fast
> 4. **Mentorship** - Grow other engineers
> 5. **Production ownership** - Debug complex issues, prevent future problems
> 6. **Business acumen** - Connect technical work to business outcomes
>
> It's not about knowing more React APIs. It's about making better decisions and enabling others to do the same."

---

### Likely Follow-Up Questions

#### Q1: "Tell me about a time you had to make a technical decision with incomplete information."

**Answer Template:**

> "At [Company], we were evaluating GraphQL vs REST for our new dashboard product. Leadership wanted a decision in 2 weeks, but we didn't have all the data.
>
> **What I did:**
>
> **1. Identified key unknowns:**
> - How would GraphQL affect our caching strategy?
> - Could our backend team support GraphQL?
> - What's the learning curve for our team?
>
> **2. Built a proof of concept (3 days):**
> - Implemented one feature with GraphQL
> - Measured bundle size, performance, developer experience
> - Got feedback from 3 engineers
>
> **3. Made a decision framework:**
> - If PoC shows >30% bundle reduction → GraphQL
> - If backend team needs >1 month → REST
> - If team velocity decreases → REST
>
> **4. Recommended REST with a caveat:**
> - PoC showed 25% bundle reduction (good, not great)
> - Backend team needed 6 weeks for GraphQL support (too long)
> - But: Document GraphQL as a future option when backend ready
>
> **5. De-risked the decision:**
> - Used REST with strong API contracts (easy to migrate later)
> - Kept GraphQL PoC as reference
> - Scheduled quarterly review
>
> **Outcome:**
> - Shipped on time with REST
> - 6 months later, backend team built GraphQL layer
> - Migrated in 2 weeks because we designed for it
>
> **Lesson:** You rarely have perfect information. Make the best decision with what you have, but design for change."

---

#### Q2: "How do you handle disagreements with other senior engineers?"

**Answer Template:**

> "I had a disagreement with another senior engineer about state management. They wanted Redux; I wanted React Query + Zustand.
>
> **Here's how I approached it:**
>
> **1. Understood their perspective:**
> 'Why do you prefer Redux?'
> → They valued predictability and debugging (Redux DevTools)
> → Their previous project had bad experiences with Context
>
> **2. Found common ground:**
> We both agreed on:
> - Need for centralized state
> - Importance of debugging
> - Performance is critical
>
> **3. Proposed an experiment:**
> 'What if we build the same feature both ways and compare?'
> - Metrics: Bundle size, lines of code, developer experience
> - Timeline: 1 week
> - Decision criteria: Agreed upfront
>
> **4. Presented data, not opinions:**
> After the experiment:
> - Redux: 200 lines of boilerplate, 15KB bundle
> - React Query: 50 lines, better caching, 12KB bundle
> - Both had good debugging (React Query has devtools too)
>
> **5. Made a collaborative decision:**
> - Use React Query for server state (80% of our state)
> - Use Zustand for UI state (20%)
> - Document the rationale (future engineers will ask why)
>
> **They agreed** because:
> - I respected their concerns
> - We used data, not opinions
> - I showed React Query had debugging (their main concern)
>
> **Outcome:**
> - We both learned from each other
> - Made a better decision together
> - Set a precedent for future technical disagreements
>
> **Key principle:** Disagree and commit. Once a decision is made, fully support it—even if it wasn't your first choice."

---

#### Q3: "How do you balance technical debt with shipping new features?"

**Answer Template:**

> "Technical debt is like financial debt—some is okay, too much is dangerous. I use a framework:
>
> **1. Categorize the debt:**
> - **Type 1: Blocking** (prevents new features) → Fix immediately
> - **Type 2: Slowing** (increases development time) → Schedule paydown
> - **Type 3: Cosmetic** (ugly but works) → Defer indefinitely
>
> **2. Quantify the impact:**
> 
> Example: Our API client had grown to 3000 lines with duplicated logic.
> - Onboarding time: +2 days per new engineer
> - Bug rate: 2x higher than other modules
> - Feature velocity: Every API change touched 10+ files
>
> **3. Make the business case:**
> 
> To product managers:
> 'Refactoring the API client will cost 1 week but will:
> - Reduce onboarding time (save 20 days/year with 10 new hires)
> - Reduce bugs by 50% (less support tickets)
> - Increase velocity by 30% for API-related features (faster time to market)
>
> ROI: 1 week investment, 4+ weeks gained per year'
>
> **4. Use the 20% rule:**
> - 80% of time: Ship features
> - 20% of time: Pay down debt, improve tooling, mentorship
>
> **5. Opportunistic paydown:**
> When working on a feature, leave code better than you found it:
> - Refactor nearby code
> - Add tests
> - Update documentation
>
> **Real example:**
> At [Company], we had a deadline for a major feature. The modal component was terrible (2000 lines, untested, buggy). But rewriting it would take 2 weeks.
>
> **My decision:**
> - Ship the feature with the old modal (met deadline)
> - Documented why the modal is bad (prevent others from making it worse)
> - Scheduled 2-week refactor for next quarter
> - Used feature flag to A/B test new modal (de-risk the refactor)
>
> **Result:**
> - Feature shipped on time
> - Modal refactored later without breaking anything
> - Team velocity increased 40% for modal-related features
>
> **Principle:** Technical debt is a tool, not a failure. Use it strategically, but always have a paydown plan."

---

## 5. Code Examples

### Example: Senior Engineer's Approach to a Feature

**Feature Request:** "Add ability to filter products by price range"

#### Mid-Level Implementation (Works, but not production-ready)

```javascript
function ProductList() {
  const [products, setProducts] = useState([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  
  useEffect(() => {
    fetch(`/api/products?min=${minPrice}&max=${maxPrice}`)
      .then(r => r.json())
      .then(setProducts);
  }, [minPrice, maxPrice]);
  
  return (
    <div>
      <input value={minPrice} onChange={e => setMinPrice(e.target.value)} />
      <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
```

#### Senior/Staff Implementation (Production-ready, scalable, maintainable)

```typescript
// 1. Define types
interface PriceFilter {
  min: number;
  max: number;
}

interface ProductFilters {
  price?: PriceFilter;
  category?: string;
  sortBy?: 'price' | 'name' | 'rating';
}

// 2. Create custom hook (reusable)
function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters: ProductFilters = useMemo(() => ({
    price: {
      min: Number(searchParams.get('minPrice') || 0),
      max: Number(searchParams.get('maxPrice') || 1000),
    },
    category: searchParams.get('category') || undefined,
    sortBy: (searchParams.get('sortBy') as ProductFilters['sortBy']) || 'name',
  }), [searchParams]);
  
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    const params = new URLSearchParams(searchParams);
    
    if (newFilters.price) {
      params.set('minPrice', String(newFilters.price.min));
      params.set('maxPrice', String(newFilters.price.max));
    }
    if (newFilters.category) {
      params.set('category', newFilters.category);
    }
    if (newFilters.sortBy) {
      params.set('sortBy', newFilters.sortBy);
    }
    
    setSearchParams(params);
  }, [searchParams, setSearchParams]);
  
  return { filters, updateFilters };
}

// 3. Create reusable filter component
interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: PriceFilter;
  onChange: (value: PriceFilter) => void;
  'aria-label'?: string;
}

function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  'aria-label': ariaLabel = 'Price range',
}: PriceRangeSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  
  // Debounce to avoid excessive API calls
  const debouncedOnChange = useDebouncedCallback(onChange, 500);
  
  const handleChange = (newValue: PriceFilter) => {
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };
  
  return (
    <div className="price-range-slider" role="group" aria-label={ariaLabel}>
      <div className="flex justify-between mb-2">
        <label htmlFor="min-price">
          Min: <output>${localValue.min}</output>
        </label>
        <label htmlFor="max-price">
          Max: <output>${localValue.max}</output>
        </label>
      </div>
      
      <div className="flex gap-4">
        <input
          id="min-price"
          type="range"
          min={min}
          max={max}
          value={localValue.min}
          onChange={(e) => handleChange({ ...localValue, min: Number(e.target.value) })}
          aria-label="Minimum price"
        />
        <input
          id="max-price"
          type="range"
          min={min}
          max={max}
          value={localValue.max}
          onChange={(e) => handleChange({ ...localValue, max: Number(e.target.value) })}
          aria-label="Maximum price"
        />
      </div>
    </div>
  );
}

// 4. Main component
function ProductList() {
  const { filters, updateFilters } = useProductFilters();
  
  // Use React Query for caching and revalidation
  const { data, isLoading, error } = useQuery(
    ['products', filters],
    () => fetchProducts(filters),
    {
      keepPreviousData: true, // Show previous results while loading
      staleTime: 60000,       // Cache for 1 minute
    }
  );
  
  // Track filter usage
  useEffect(() => {
    analytics.track('Product Filter Applied', {
      minPrice: filters.price?.min,
      maxPrice: filters.price?.max,
      category: filters.category,
    });
  }, [filters]);
  
  if (error) {
    return (
      <ErrorBoundary>
        <Alert variant="error">
          <p>Unable to load products</p>
          <button onClick={() => queryClient.invalidateQueries(['products'])}>
            Retry
          </button>
        </Alert>
      </ErrorBoundary>
    );
  }
  
  return (
    <div className="product-list">
      <aside className="filters" aria-label="Product filters">
        <h2>Filters</h2>
        
        <PriceRangeSlider
          min={0}
          max={1000}
          value={filters.price || { min: 0, max: 1000 }}
          onChange={(price) => updateFilters({ price })}
        />
        
        {/* More filters... */}
      </aside>
      
      <main>
        {isLoading && <Skeleton count={12} />}
        
        {data?.products && (
          <>
            <div className="results-header">
              <p>{data.total} products found</p>
              <SortDropdown
                value={filters.sortBy || 'name'}
                onChange={(sortBy) => updateFilters({ sortBy })}
              />
            </div>
            
            <div className="product-grid">
              {data.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {data.hasMore && (
              <button onClick={loadMore}>
                Load more
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// 5. Tests (senior engineers write tests!)
describe('ProductList', () => {
  it('applies price filter from URL params', async () => {
    render(<ProductList />, {
      initialUrl: '/?minPrice=100&maxPrice=500',
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/minimum price/i)).toHaveValue('100');
      expect(screen.getByLabelText(/maximum price/i)).toHaveValue('500');
    });
  });
  
  it('updates URL when filter changes', async () => {
    const { user } = render(<ProductList />);
    
    const minPriceSlider = screen.getByLabelText(/minimum price/i);
    await user.type(minPriceSlider, '200');
    
    await waitFor(() => {
      expect(window.location.search).toContain('minPrice=200');
    });
  });
  
  it('shows previous results while loading new ones', async () => {
    const { user, rerender } = render(<ProductList />);
    
    await waitFor(() => {
      expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    });
    
    const minPriceSlider = screen.getByLabelText(/minimum price/i);
    await user.type(minPriceSlider, '200');
    
    // Previous results still visible
    expect(screen.getByText(/product 1/i)).toBeInTheDocument();
    
    // Loading indicator visible
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

**What Makes This Senior/Staff Level:**

1. ✅ **URL state** (shareable filters)
2. ✅ **Debouncing** (performance)
3. ✅ **Caching** (React Query)
4. ✅ **Accessibility** (ARIA labels, keyboard navigation)
5. ✅ **Error handling** (retry logic)
6. ✅ **Loading states** (skeleton, keep previous data)
7. ✅ **Analytics** (track usage)
8. ✅ **Reusability** (custom hooks, components)
9. ✅ **Type safety** (TypeScript)
10. ✅ **Tests** (comprehensive coverage)
11. ✅ **Documentation** (JSDoc, comments)

---

## 6. Why & How Summary

### Why Senior/Staff Engineers Matter

**For the Organization:**
- **10x leverage:** One senior engineer enables 10 engineers to be more effective
- **Reduce risk:** Catch architectural issues before they become expensive
- **Maintain quality:** Set standards that scale across teams
- **Retain talent:** Mentorship keeps engineers engaged and growing

**For the Product:**
- **Better systems:** Thoughtful architecture scales to millions of users
- **Faster delivery:** Reusable patterns accelerate feature development
- **Fewer incidents:** Production ownership prevents issues
- **Business impact:** Connect technical decisions to revenue/growth

**For Engineers:**
- **Career growth:** Learn from experienced engineers
- **Autonomy:** Clear patterns enable independent decision-making
- **Efficiency:** Good tooling and docs reduce friction
- **Pride:** Work on well-architected systems

### How to Grow from Mid to Senior/Staff

**1. Expand Scope**
- Mid: Own tasks → Senior: Own features → Staff: Own platform capabilities

**2. Think Beyond Code**
- Ask "Why?" before "How?"
- Consider business impact, not just technical correctness

**3. Develop Communication**
- Write RFCs and design docs
- Present technical ideas to non-technical stakeholders
- Influence without authority

**4. Mentor Others**
- Review code with educational intent
- Pair program regularly
- Share knowledge through docs and presentations

**5. Own Production**
- Debug complex issues
- Set up monitoring and alerting
- Write postmortems that prevent future issues

**6. Build Infrastructure**
- Create reusable components and libraries
- Improve developer tooling (CI/CD, linting, testing)
- Reduce friction for other engineers

**7. Make Trade-Offs Explicitly**
- Document "why" not just "what"
- Consider multiple options
- Quantify costs and benefits

---

## Interview Confidence Boosters

### Stories to Prepare

Have 2-3 stories ready for each:

**1. Technical Leadership**
- "Tell me about a time you designed a system from scratch"
- "Describe your approach to making technical decisions"

**2. Mentorship**
- "How do you help junior engineers grow?"
- "Tell me about a challenging code review"

**3. Production Ownership**
- "Describe a complex production issue you debugged"
- "How do you prevent incidents?"

**4. Cross-Functional Collaboration**
- "Tell me about a time you influenced product direction"
- "How do you handle disagreements with PM/design?"

**5. Strategic Thinking**
- "How do you balance technical debt with feature work?"
- "Tell me about a time you prevented a major issue"

### STAR Framework

For each story:
- **Situation:** Context (2 sentences)
- **Task:** Your responsibility
- **Action:** What you did (specific, detailed)
- **Result:** Quantifiable impact

### Red Flags to Avoid

- ❌ "I just write code really fast"
- ❌ "I know all the latest frameworks"
- ❌ "I always ship features on time"
- ❌ Taking credit for team achievements
- ❌ No mention of collaboration/mentorship

### Senior/Staff Signals

- ✅ "I enabled the team to..."
- ✅ "I measured the impact as..."
- ✅ "I documented this pattern so..."
- ✅ "I collaborated with PM/design to..."
- ✅ "I prevented this issue by..."
- ✅ "I mentored junior engineers on..."

---

**Next Topic:** What FAANG Interviewers Look For
