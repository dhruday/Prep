# 06 — Design a Design System (Frontend System Design)

> ⚡ **Quick Summary:** A design system is a collection of reusable components, design tokens, and guidelines that gives products a consistent UI. The hard parts are: making components accessible by default, supporting theming without CSS chaos, managing versioning across 100+ consuming apps, and driving adoption. This is a **staff-level** favorite question.

---

## 🧠 Mental Model
Think of a Design System as: **A product within a product** — it has its own roadmap, consumers (other teams), versioning, documentation, and SLAs. The team building it is a platform team, not a feature team.

```
Design Tokens → Primitives → Components → Patterns → Guidelines
     ↓              ↓            ↓           ↓            ↓
 Colors/Font   Button/Input   Form/Modal  Auth Flow   When to use X
```

---

## PART 1 — Architecture

### The 3 Layers

```
Layer 1: TOKENS (Design primitives)
  --color-primary-500: #3B82F6;
  --font-size-lg: 1.125rem;
  --spacing-4: 1rem;
  --radius-md: 0.375rem;

Layer 2: COMPONENTS (Built from tokens)
  <Button> <Input> <Modal> <Table> <Select>
  <DatePicker> <Toast> <Tooltip> <Dropdown>

Layer 3: PATTERNS / TEMPLATES
  <LoginForm> (Button + Input + Link)
  <DataTable> (Table + Pagination + Filter)
  <EmptyState> (Icon + Heading + Button)
```

---

## PART 2 — Design Tokens

### Token Structure
```javascript
// tokens.js — the single source of truth
const tokens = {
  color: {
    // Raw values (never use directly)
    brand: {
      50:  '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',  // primary brand blue
      600: '#2563EB',
      900: '#1E3A8A',
    },
    
    // Semantic tokens (USE THESE in components)
    semantic: {
      'action-primary':       'var(--color-brand-500)',
      'action-primary-hover': 'var(--color-brand-600)',
      'text-primary':         'var(--color-gray-900)',
      'text-secondary':       'var(--color-gray-600)',
      'background-page':      'var(--color-white)',
      'border-default':       'var(--color-gray-200)',
      'feedback-error':       'var(--color-red-500)',
      'feedback-success':     'var(--color-green-500)',
    },
  },
  
  spacing: {
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
  },
  
  typography: {
    size: {
      xs:   '0.75rem',   // 12px
      sm:   '0.875rem',  // 14px
      base: '1rem',      // 16px
      lg:   '1.125rem',  // 18px
      xl:   '1.25rem',   // 20px
      '2xl':'1.5rem',    // 24px
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    family: {
      sans: "'Inter', -apple-system, sans-serif",
      mono: "'Fira Code', monospace",
    },
  },
};
```

### Theming with CSS Variables
```css
/* Base theme */
:root {
  --color-action-primary: #3B82F6;
  --color-text-primary: #111827;
  --color-background-page: #FFFFFF;
}

/* Dark mode */
[data-theme="dark"] {
  --color-action-primary: #60A5FA;
  --color-text-primary: #F9FAFB;
  --color-background-page: #111827;
}

/* Enterprise custom theme (override) */
[data-theme="enterprise"] {
  --color-action-primary: #EF4444; /* Company brand red */
}
```

---

## PART 3 — Component Design

### Accessible Button (Production-Ready)
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  // Allows as=<a> for link buttons
  as?: 'button' | 'a';
  href?: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  as: Tag = 'button',
  ...rest
}, ref) => {
  const isDisabled = disabled || loading;
  
  return (
    <Tag
      ref={ref}
      className={clsx(styles.button, styles[variant], styles[size])}
      disabled={Tag === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <span className={styles.spinner} aria-hidden="true" />
      )}
      {leftIcon && <span className={styles.leftIcon} aria-hidden="true">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className={styles.rightIcon} aria-hidden="true">{rightIcon}</span>}
    </Tag>
  );
});

Button.displayName = 'Button';
```

### Component API Design Rules
```
1. Composition over configuration
   ❌ <Card type="image-top" hasFooter hasActions />
   ✅ <Card><CardImage /><CardBody><CardFooter /></CardBody></Card>

2. Polymorphic components (as prop)
   <Button as="a" href="/signup">Sign Up</Button>

3. Accessible by default (no aria required from consumer)
   <Button loading> saves user from adding aria-busy

4. Escape hatches (className, style for customization)
   <Button className="custom-override">

5. Controlled + Uncontrolled
   <Select value={...} onChange={...} />  ← controlled
   <Select defaultValue="..." />           ← uncontrolled
```

---

## PART 4 — Versioning Strategy

### Semantic Versioning Rules
```
MAJOR.MINOR.PATCH

PATCH: Bug fixes, internal refactors, no API changes
       1.2.3 → 1.2.4
       
MINOR: New components, new props (backward compatible)
       1.2.3 → 1.3.0
       
MAJOR: Breaking changes (renamed props, removed components, redesign)
       1.2.3 → 2.0.0
       
Rule: Never break a component without a major version bump.
Rule: Always provide a codemod for breaking changes.
Rule: Support N and N-1 major versions simultaneously.
```

### Deprecation Process
```javascript
// Step 1: Add deprecation warning (minor version)
const OldButton = (props) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[DesignSystem] OldButton is deprecated. Use Button instead. ' +
      'Will be removed in v3.0.0. Migration guide: https://...'
    );
  }
  return <Button {...props} />;
};

// Step 2: Remove in next major version (with codemod)
// npx @company/codemod OldButton-to-Button ./src
```

---

## PART 5 — Documentation (Storybook)

### Story Template
```javascript
// Button.stories.tsx
export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'Primary interactive element for user actions.',
      },
    },
  },
};

// All variants
export const AllVariants = () => (
  <Stack>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="danger">Danger</Button>
  </Stack>
);

// Loading state
export const Loading = () => <Button loading>Saving...</Button>;

// Accessibility story
export const AccessibilityTest = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await expect(button).toHaveAccessibleName();
    await expect(button).not.toHaveAttribute('disabled');
  },
};
```

---

## PART 6 — Adoption Strategy

### The 3 Phases
```
Phase 1: Foundation (Month 1-3)
  - Tokens defined and agreed with design
  - 10 core components (Button, Input, Modal, Table, etc.)
  - Documentation in Storybook
  - 1-2 pilot teams using it
  
Phase 2: Growth (Month 3-9)
  - 30+ components covering 80% of use cases
  - CLI tool: npx create-feature --template
  - Visual regression testing (Chromatic)
  - Consumption analytics (which components are used most)
  
Phase 3: Scale (Month 9+)
  - Codemods for breaking changes
  - Contribution process for product teams
  - A11y automated testing in CI
  - Performance budgets per component
```

### Driving Adoption
```
❌ Mandate adoption (causes resentment)
✅ Make it EASIER than building custom (natural adoption)
✅ Fix your bugs within 48 hours (build trust)
✅ Office hours: weekly session for teams to ask questions
✅ Slack channel: #design-system-help
✅ Migration tool: automate updating to new version
✅ Show ROI: "Teams using DS ship 2x faster"
```

---

## 🎯 Design System Cheat Sheet

```
Design System = Tokens + Components + Documentation + Process

Token Hierarchy:
  Raw values → Semantic tokens → Component-level tokens
  #3B82F6   → --color-action-primary → --button-bg

Component Rules:
  1. Accessible by default (no aria props needed from consumer)
  2. Polymorphic (as prop for links vs buttons)
  3. Composition over configuration
  4. Always provide controlled + uncontrolled versions

Versioning: MAJOR for breaking, MINOR for new, PATCH for fixes
Documentation: Storybook + usage examples + do/don't
Adoption: Make it easier than DIY, fix bugs fast, show ROI
```

---
---
---

# 07 — Design Micro Frontend Platform (Frontend System Design)

> ⚡ **Quick Summary:** A Micro Frontend (MFE) platform breaks a large frontend app into independently deployed pieces, each owned by a different team. The key technology is **Webpack Module Federation**. The hard parts are: sharing dependencies without duplication, routing between MFEs, and maintaining a consistent user experience when each team moves independently.

---

## 🧠 Mental Model
Think of Micro Frontends as: **Microservices, but for the frontend.** Each team owns their piece end-to-end (backend + frontend). Teams deploy independently. The "host" app stitches pieces together at runtime.

```
Shell App (host)                    
├── /home      → Marketing MFE (Team A)
├── /checkout  → Checkout MFE (Team B)
├── /account   → Account MFE (Team C)
└── /reports   → Reports MFE (Team D)

Each MFE:
  - Own repo
  - Own deployment pipeline
  - Own tech stack (mostly)
  - Shares: auth, design system, routing
```

---

## PART 1 — When to Use Micro Frontends

### Use MFE When:
- Multiple teams (5+) sharing one frontend codebase
- Teams blocking each other on deployments
- Different parts of app need different release cadences
- Teams want technology independence (within reason)
- Monorepo has become unmaintainable

### Don't Use MFE When:
- Single team or small teams (2-3)
- App is small or new
- Team doesn't have DevOps maturity to manage N deployment pipelines
- Performance is critical and you can't afford MFE overhead

---

## PART 2 — Integration Strategies

### Comparison
```
Build-time integration:
  npm packages — compile together
  ✅ Simple, great performance
  ❌ Requires all teams to rebuild when one changes
  When: Design system, shared utils

Server-side composition:
  Server stitches HTML from multiple services
  ✅ Great for SSR, each team independent
  ❌ Complex infrastructure
  When: E-commerce (Zalando's approach)

Runtime integration (Module Federation): ← Most Common
  One app loads another's JavaScript at runtime
  ✅ True independent deployment
  ❌ Runtime complexity, version conflicts
  When: Dashboard-style apps, Spotify, Netflix
```

---

## PART 3 — Module Federation

### Host App Setup
```javascript
// webpack.config.js (Shell App)
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      
      remotes: {
        // Tell shell where to find each MFE
        checkout:  'checkout@https://checkout.mycompany.com/remoteEntry.js',
        account:   'account@https://account.mycompany.com/remoteEntry.js',
        reports:   'reports@https://reports.mycompany.com/remoteEntry.js',
      },
      
      shared: {
        // Share these libraries (don't load twice)
        react:        { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom':  { singleton: true, requiredVersion: '^18.0.0' },
        'react-router-dom': { singleton: true },
        '@company/design-system': { singleton: true },
      },
    }),
  ],
};
```

### Remote MFE Setup
```javascript
// webpack.config.js (Checkout MFE)
new ModuleFederationPlugin({
  name: 'checkout',
  filename: 'remoteEntry.js',  // entry point loaded by host
  
  exposes: {
    // Which components the host can use
    './CheckoutPage': './src/pages/CheckoutPage',
    './CartSummary': './src/components/CartSummary',
  },
  
  shared: {
    // Must match host's shared config
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
});
```

### Loading an MFE in the Shell
```jsx
// Shell App: load checkout lazily
const CheckoutPage = lazy(() => import('checkout/CheckoutPage'));

const App = () => (
  <Router>
    <Routes>
      <Route path="/checkout" element={
        <Suspense fallback={<PageSkeleton />}>
          <ErrorBoundary fallback={<MFEError name="checkout" />}>
            <CheckoutPage />
          </ErrorBoundary>
        </Suspense>
      } />
    </Routes>
  </Router>
);
```

---

## PART 4 — Communication Between MFEs

### Custom Events (Decoupled)
```javascript
// MFE A: dispatch event
const notifyCartUpdated = (cartItems) => {
  window.dispatchEvent(new CustomEvent('cart:updated', {
    detail: { items: cartItems, total: calculateTotal(cartItems) },
    bubbles: true,
  }));
};

// Shell / MFE B: listen to event
window.addEventListener('cart:updated', (event) => {
  updateCartIcon(event.detail.total);
  syncCartState(event.detail.items);
});
```

### Shared State (Event Bus + Module Federation)
```javascript
// shared-state/index.js (exposed via Module Federation)
import mitt from 'mitt';
const emitter = mitt();

export const eventBus = {
  on: emitter.on,
  off: emitter.off,
  emit: emitter.emit,
};

export const sharedStore = {
  user: null,
  cart: [],
};

// Usage in any MFE:
import { eventBus } from 'shell/sharedState';
eventBus.on('user:login', (user) => setCurrentUser(user));
```

### URL / Query Params (Simple, No Library Needed)
```javascript
// MFE A navigates to MFE B's route via router
navigate('/checkout?product=123&qty=2');

// MFE B reads URL params
const { productId, qty } = useSearchParams();
```

---

## PART 5 — Routing Architecture

```javascript
// Shell owns top-level routing
// Each MFE owns routing within its prefix

// Shell routes
const ShellRoutes = () => (
  <Routes>
    <Route path="/home/*"     element={<MarketingMFE />} />
    <Route path="/checkout/*" element={<CheckoutMFE />} />
    <Route path="/account/*"  element={<AccountMFE />} />
    <Route path="/*"          element={<NotFound />} />
  </Routes>
);

// Checkout MFE has sub-routes (doesn't know about shell)
const CheckoutMFE = () => (
  <Routes>
    <Route path="/checkout/cart"     element={<CartPage />} />
    <Route path="/checkout/payment"  element={<PaymentPage />} />
    <Route path="/checkout/confirm"  element={<ConfirmPage />} />
  </Routes>
);
```

---

## PART 6 — Shared Dependencies Problem

### The Version Conflict Problem
```
Shell uses React 18.2.0
Checkout MFE uses React 18.0.0
Account MFE uses React 17.0.2

Without singleton: 3 copies of React loaded 😱 → React hook errors
With singleton: one version wins, others must be compatible

Solution:
  All teams agree on minimum version ranges
  Use semver ranges, not exact versions
  React: singleton: true, requiredVersion: '>=18.0.0'
```

### Dependency Governance
```
Core shared (strict versioning):
  React, React DOM, React Router
  Design System (your company's)
  Authentication library
  Analytics client

Team-local (free to choose):
  State management (Redux, Zustand, MobX — their problem)
  Date library (dayjs, date-fns — whatever they want)
  Testing framework
```

---

## PART 7 — Deployment Strategy

```
Each MFE:
  - Own GitHub repo (or monorepo with separate build artifacts)
  - Own CI/CD pipeline (GitHub Actions / Jenkins / GitLab CI)
  - Deployed to own CDN path: cdn.company.com/mfe/checkout/
  - remoteEntry.js at stable URL (versionless)
  - Actual assets are versioned: main.a3f2c1.js

Deployment Flow:
  1. Developer pushes to checkout-mfe repo
  2. CI builds checkout bundle
  3. Deploys to cdn.company.com/mfe/checkout/
  4. Shell picks up new version automatically (next page load)
  5. No shell re-deploy needed ✅

Gotcha: Always test MFE integration before production
Solution: Contract tests between shell and MFE exposed APIs
```

---

## 🎯 Micro Frontend Cheat Sheet

```
MFE = Module Federation + Event Bus + Shared Design System + Independent Deployment

When to Use:
  > 5 teams, blocking each other, need independent deployment

Key Patterns:
  Shell (host)        → Top-level routing, auth, nav shell
  Remote (MFE)        → Feature slice, exposes components
  Singleton: true     → Prevents multiple React copies
  Custom events       → Decoupled communication
  remoteEntry.js      → Dynamic entry point, no rebuild needed

Common Pitfalls:
  ❌ Different React versions across MFEs (hook errors)
  ❌ Circular dependencies between MFEs (use shell events instead)
  ❌ MFE doesn't compile independently (always test standalone)
  ❌ No fallback when remote fails (always use ErrorBoundary)
  ❌ Forgetting to type-check contract between shell and remote
```

---
---
---

# 08 — Design Enterprise Portal (Frontend System Design)

> ⚡ **Quick Summary:** An enterprise portal is a gateway application that consolidates navigation, search, user personalization, role-based access, and multi-tenancy for large organizations. Think SAP Launchpad, Salesforce App Launcher, or ServiceNow. Key challenges are role-based navigation, multi-tenant customization, and enterprise-scale search.

---

## 🧠 Mental Model
Think of an Enterprise Portal as: **A mall directory** — it doesn't sell things itself, it helps you find the right store. The portal owns navigation, search, and entry points. The actual apps (tenants) handle their own logic.

---

## PART 1 — Core Features

```
Navigation:
  - Mega menu with grouped categories
  - Favorites (user bookmarks specific apps/reports)
  - Recent items (last 10 visited)
  - Role-based: user only sees apps they're authorized for

Search:
  - Global search across all apps
  - Federated search (queries multiple backends)
  - Instant suggestions on type
  - Permission-aware results (don't show things user can't access)

Personalization:
  - Homepage widget layout (drag to customize)
  - Notification preferences
  - Language, timezone, date format
  - Saved searches, favorites

Multi-Tenancy:
  - Each company (tenant) gets own branding (logo, colors)
  - Tenant-specific app catalog (Company A sees HR apps, Company B sees Finance apps)
  - Data isolation (tenant A never sees tenant B's data)
```

---

## PART 2 — Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      PORTAL SHELL                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Header: [Logo] [Global Search] [Notifications] [User]│ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────┐  ┌───────────────────────────────────┐  │
│  │  Sidebar Nav │  │  Content Area                    │  │
│  │  ┌─────────┐ │  │  ┌───────────────────────────┐   │  │
│  │  │ Home    │ │  │  │  Homepage Widgets         │   │  │
│  │  │ HR ▼   │ │  │  │  [Quick Links] [My Tasks]  │   │  │
│  │  │  ├ Payroll│  │  │  [News] [Reports]         │   │  │
│  │  │  └ Leave │  │  └───────────────────────────┘   │  │
│  │  │ Finance ▼│  │                                   │  │
│  │  │ Reports  │  │  OR                               │  │
│  │  └─────────┘ │  │  ┌───────────────────────────┐   │  │
│  └──────────────┘  │  │  Embedded App (MFE/iframe)│   │  │
│                    │  └───────────────────────────┘   │  │
│                    └───────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

Multi-Tenant Config: User → Tenant → Role → Permissions → App Catalog
```

---

## PART 3 — Authorization (RBAC)

```javascript
// Permission-aware component rendering
const PortalApp = ({ app }) => {
  const { hasPermission } = useAuth();
  
  // Check if user has access to this app
  if (!hasPermission(app.permissionKey)) {
    return null; // Don't show apps user can't access
  }
  
  return (
    <AppCard
      app={app}
      onClick={() => navigate(app.route)}
    />
  );
};

// Role-based navigation
const NavigationTree = () => {
  const { userRoles, tenantConfig } = useAuth();
  
  const allowedItems = tenantConfig.navItems
    .filter(item => {
      // Show item if user has ANY of the required roles
      return item.requiredRoles.some(role => userRoles.includes(role));
    });
  
  return <NavTree items={allowedItems} />;
};
```

---

## PART 4 — Global Search (Federated)

```javascript
// Federated search: query multiple backends simultaneously
const useFederatedSearch = (query) => {
  const debouncedQuery = useDebounce(query, 300);
  
  // Parallel queries to different search endpoints
  const [appsResult, reportsResult, usersResult, docsResult] = useQueries([
    {
      queryKey: ['search', 'apps', debouncedQuery],
      queryFn: () => searchApps(debouncedQuery),
      enabled: debouncedQuery.length > 2,
    },
    {
      queryKey: ['search', 'reports', debouncedQuery],
      queryFn: () => searchReports(debouncedQuery),
      enabled: debouncedQuery.length > 2,
    },
    {
      queryKey: ['search', 'users', debouncedQuery],
      queryFn: () => searchUsers(debouncedQuery),
      enabled: debouncedQuery.length > 2,
    },
  ]);
  
  return {
    apps: appsResult.data || [],
    reports: reportsResult.data || [],
    users: usersResult.data || [],
    isLoading: [appsResult, reportsResult, usersResult].some(r => r.isLoading),
  };
};

// Show results grouped by category
const SearchResults = ({ query }) => {
  const { apps, reports, users, isLoading } = useFederatedSearch(query);
  
  return (
    <div role="listbox" aria-label="Search results">
      {apps.length > 0 && (
        <ResultGroup label="Applications" items={apps} />
      )}
      {reports.length > 0 && (
        <ResultGroup label="Reports" items={reports} />
      )}
      {users.length > 0 && (
        <ResultGroup label="People" items={users} />
      )}
    </div>
  );
};
```

---

## PART 5 — Multi-Tenant Theming

```javascript
// Load tenant configuration on app start
const initializePortal = async () => {
  const tenantId = getTenantFromURL(); // e.g., mycompany.portal.com → "mycompany"
  const tenantConfig = await fetchTenantConfig(tenantId);
  
  // Apply tenant theme
  const root = document.documentElement;
  root.style.setProperty('--color-brand-primary', tenantConfig.brandColor);
  root.style.setProperty('--logo-url', `url(${tenantConfig.logoUrl})`);
  root.style.setProperty('--font-family', tenantConfig.fontFamily || 'Inter');
  
  // Apply tenant-specific features
  setFeatureFlags(tenantConfig.enabledFeatures);
  
  // Set tenant's app catalog
  setAvailableApps(tenantConfig.apps);
};
```

---

## 🎯 Enterprise Portal Cheat Sheet

```
Enterprise Portal = Navigation + RBAC + Federated Search + Multi-Tenancy + Personalization

Key Patterns:
  Permission-first rendering  → Never render what user can't access
  Federated search           → Parallel queries, grouped results
  URL-based tenancy          → mycompany.portal.com → tenant config
  CSS variables for theming  → Swap brand colors without rebuild
  Favorites + recents        → Store in user profile API, not localStorage

Enterprise-Specific:
  SSO (SAML / OAuth)         → Never build your own auth
  Audit logging              → Track every navigation and action
  Session timeout            → Warn before expiry, auto-logout
  Accessibility              → WCAG AA minimum, enterprise has disability inclusion requirements
  Data residency             → Tenant data must stay in their region
```
