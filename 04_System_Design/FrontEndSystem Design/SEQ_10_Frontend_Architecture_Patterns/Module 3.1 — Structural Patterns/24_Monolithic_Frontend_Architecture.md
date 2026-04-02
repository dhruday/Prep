# 24. Monolithic Frontend Architecture

## 1. High-Level Explanation (Frontend Interview Level)

**Monolithic Frontend Architecture** is a single, unified codebase where all frontend features, components, and logic are tightly coupled in one application bundle—common in traditional web apps before the micro-frontend era, characterized by shared state, single deployment, and centralized build process.

**Characteristics**:
- **Single codebase**: All features in one repository
- **Shared dependencies**: One version of React/Vue/Angular
- **Single deployment**: Deploy entire app at once
- **Tight coupling**: Features depend on shared code

**Key Principle**: "One application, one build, one deployment—simple initially but becomes bottleneck at scale (large teams, frequent releases, independent feature velocity)."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Definition & Structure

**Monolithic Frontend**: All frontend code lives in a single repository, compiles to a single (or few) JavaScript bundles, and deploys as one unit.

**Typical Structure**:
```
monolith-app/
├── src/
│   ├── components/          # Shared UI components
│   │   ├── Button/
│   │   ├── Modal/
│   │   └── Navbar/
│   ├── features/            # Feature modules
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   ├── Analytics/
│   │   ├── Settings/
│   │   └── UserProfile/
│   ├── services/            # API clients
│   │   ├── authService.js
│   │   └── apiClient.js
│   ├── store/               # Global state (Redux/MobX)
│   │   ├── authSlice.js
│   │   ├── userSlice.js
│   │   └── store.js
│   ├── utils/               # Shared utilities
│   ├── styles/              # Global styles
│   ├── App.js               # Root component
│   └── index.js             # Entry point
├── public/
├── package.json             # Single dependency list
└── webpack.config.js        # Single build config

Build output:
├── main.bundle.js           # ~2-5MB (all features)
├── vendor.bundle.js         # ~500KB (React, libraries)
└── index.html
```

---

### Characteristics

#### 1. **Single Repository (Monorepo vs Monolith)**

**Monolith** (one app):
```
monolith-app/
└── src/
    ├── featureA/
    ├── featureB/
    └── featureC/

Result: One package.json, one build, one deployment
```

**Monorepo** (multiple apps, not monolithic):
```
monorepo/
├── apps/
│   ├── app-1/              # Separate app
│   ├── app-2/              # Separate app
│   └── app-3/              # Separate app
└── packages/
    └── shared-ui/          # Shared library

Result: Multiple package.json, independent builds/deployments
```

**Key Difference**: Monolith = single application, Monorepo = multiple applications sharing code.

---

#### 2. **Shared Dependencies**

**Single Version Policy**:
```json
// package.json
{
  "dependencies": {
    "react": "18.2.0",        // All features use same React version
    "redux": "4.2.0",         // All features share same state library
    "axios": "1.3.0"          // All features use same HTTP client
  }
}
```

**Problem**: Can't upgrade React for one feature without affecting all features.

---

#### 3. **Tight Coupling**

**Shared State**:
```javascript
// Global Redux store (all features access)
const store = createStore({
  auth: authReducer,         // Feature A depends on this
  user: userReducer,         // Feature B depends on this
  dashboard: dashboardReducer,
  analytics: analyticsReducer
});

// Feature A imports Feature B's code
import { UserProfile } from '../UserProfile/UserProfile';

// Feature B imports shared state
import { useSelector } from 'react-redux';
const user = useSelector(state => state.user);

Result: Changes in auth affect all features (tight coupling)
```

---

#### 4. **Single Build Process**

**Build Command**:
```bash
npm run build

# Webpack compiles entire app:
├── Analyze all imports (tree shaking)
├── Bundle all features into main.bundle.js
├── Extract vendor libraries (code splitting)
├── Optimize images, CSS
└── Output: dist/ folder

Time: 5-15 minutes (large apps)
Output: main.bundle.js (2-5MB)
```

**Problem**: Change one line in one feature → rebuild entire app.

---

#### 5. **Single Deployment**

**Deployment Flow**:
```
Code change in Feature A:
├── Commit to main branch
├── CI/CD pipeline triggers
├── Run tests (all features)
├── Build entire app (5-15 min)
├── Deploy to CDN (replace all files)
└── Cache invalidation (entire app)

Result: All features deploy together (no independent releases)
```

---

### Advantages

#### 1. **Simplicity** (small teams)

**Single codebase**:
- Easy to navigate (one project structure)
- Simple dependency management (one package.json)
- Unified tooling (one Webpack config, one ESLint config)
- Clear ownership (one team, one repository)

**Example** (5-person team):
```
Team owns monolith:
├── All 5 developers work in same repo
├── Easy code sharing (import directly)
├── No cross-repo coordination
└── Simple onboarding (one codebase to learn)

Result: Fast initial development (no overhead)
```

---

#### 2. **Code Sharing** (easy reuse)

**Direct imports**:
```javascript
// Feature A uses Feature B's component
import { UserProfile } from '../UserProfile/UserProfile';

// Feature B uses shared service
import { authService } from '../../services/authService';

// Feature C uses shared state
import { useSelector } from 'react-redux';
const user = useSelector(state => state.user);

Result: Easy code reuse (no package publishing)
```

---

#### 3. **Atomic Deployments** (consistency)

**All-or-nothing**:
```
Deploy:
├── Feature A: Updated
├── Feature B: Updated (depends on Feature A)
├── API client: Updated (new endpoints)
└── Deploy all at once (consistent state)

Result: No version mismatches (all features compatible)
```

---

#### 4. **Unified Testing** (end-to-end)

**Test entire app**:
```javascript
// Integration test (crosses features)
test('User can login and view dashboard', async () => {
  // Test auth feature
  await login('user@example.com', 'password');
  
  // Test dashboard feature (depends on auth)
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  
  // Test analytics feature (depends on auth + dashboard)
  await clickAnalytics();
  expect(screen.getByText('Analytics')).toBeInTheDocument();
});

Result: Catch integration issues (features interact)
```

---

### Disadvantages

#### 1. **Scalability Issues** (large teams)

**Team Bottlenecks**:
```
10 teams × 5 developers = 50 developers:
├── All work in same repository
├── Merge conflicts (parallel changes)
├── Code review queue (50+ PRs/day)
├── Build queue (CI/CD overloaded)
└── Deploy coordination (who deploys when?)

Result: Slow velocity (waiting for builds, reviews, deploys)
```

**Real-World**: Google (2010s) had monolithic frontend for Google+, 100+ developers, 30-minute builds, deploy queue hours long.

---

#### 2. **Build Time** (slow feedback)

**Large Bundle**:
```
Codebase: 500,000 lines of JavaScript
Build time: 15 minutes (full production build)

Developer experience:
├── Change 1 line in Feature A
├── Wait 15 minutes for build
├── Deploy to staging
├── Test feature
└── Repeat (1 hour per iteration)

Result: Slow feedback loop (developer productivity ↓)
```

---

#### 3. **Deploy Risk** (all-or-nothing)

**Single Deploy Unit**:
```
Deploy monolith:
├── Feature A: New feature (risky)
├── Feature B: Bug fix (safe)
├── Feature C: Refactor (medium risk)
└── Deploy all together (if A breaks, all features roll back)

Result: High-risk deploys (one failure affects entire app)
```

**Example**: Facebook (2012) had monolithic frontend, one bad deploy took down entire site (2 hours outage).

---

#### 4. **Tight Coupling** (hard to change)

**Shared Dependencies**:
```javascript
// Feature A depends on Redux
import { useSelector } from 'react-redux';

// Feature B depends on same Redux store
const user = useSelector(state => state.user);

// Want to migrate Feature A to Zustand?
// ❌ Can't (Feature B still needs Redux)
// Must migrate entire app at once (risky, slow)

Result: Hard to adopt new technologies (all-or-nothing migration)
```

---

#### 5. **Bundle Size** (performance)

**Large Initial Bundle**:
```
User visits /dashboard:
├── Downloads main.bundle.js (5MB)
│   ├── Dashboard code (100KB, needed)
│   ├── Analytics code (500KB, not needed)
│   ├── Settings code (200KB, not needed)
│   └── UserProfile code (300KB, not needed)
├── Parse + compile: 2000ms (slow)
└── Time to Interactive (TTI): 3000ms

Result: Slow initial load (download/parse unnecessary code)
```

**With Code Splitting**:
```
User visits /dashboard:
├── Downloads main.bundle.js (500KB, core app)
├── Downloads dashboard.chunk.js (100KB, route-specific)
├── Parse + compile: 500ms
└── TTI: 1000ms (3× faster)

But: Still shares core app bundle (all features' dependencies)
```

---

#### 6. **Technology Lock-In** (hard to upgrade)

**Single Version**:
```json
{
  "dependencies": {
    "react": "17.0.0"      // Outdated, but app depends on it
  }
}

Upgrade path:
├── React 17 → React 18 (breaking changes)
├── Must update ALL features at once
├── Test ALL features (regression risk)
├── Fix ALL breaking changes (100+ components)
└── Deploy ALL at once (high risk)

Result: Stuck on old versions (upgrade cost too high)
```

---

### When to Use Monolithic Architecture

**Good Fit**:

1. **Small teams** (≤10 developers):
   - Simple coordination (no cross-team overhead)
   - Fast initial development (no micro-frontend complexity)
   - Easy code sharing (direct imports)

2. **Simple applications** (few features):
   - Small codebase (<50K lines)
   - Few features (≤5 major features)
   - Low complexity (no deep module interactions)

3. **Infrequent deployments** (weekly/monthly):
   - Low deploy cadence (no need for independent releases)
   - Coordinated releases OK (all features aligned)

4. **Single team ownership**:
   - One team owns entire app (no cross-team dependencies)
   - Unified roadmap (no conflicting priorities)

**Example**: Admin dashboard for internal tool (5 developers, 10 features, deploy weekly).

---

**Poor Fit**:

1. **Large teams** (50+ developers):
   - Merge conflicts, code review queues
   - Deploy coordination overhead
   - Build time bottleneck

2. **Frequent deployments** (multiple times/day):
   - Need independent feature releases
   - Canary deploys (gradual rollout)
   - Fast rollback (one feature without affecting others)

3. **Diverse tech stacks**:
   - Some features need React, others Angular
   - Different performance requirements (some need SSR)
   - Different security requirements (some features sensitive)

4. **Independent feature teams**:
   - Teams own features end-to-end (frontend + backend)
   - Different release cadences (Team A weekly, Team B daily)
   - Autonomous development (no cross-team blocking)

**Example**: Facebook.com (1000+ developers, 100+ features, deploy every 5 minutes) → migrated to micro-frontends.

---

### Evolution & Migration

**Migration Path**: Monolith → Modular Monolith → Micro-Frontends

**Stage 1: Monolith** (initial):
```
monolith-app/
└── src/
    ├── featureA/
    ├── featureB/
    └── featureC/

One build, one deploy
```

**Stage 2: Modular Monolith** (intermediate):
```
monolith-app/
└── src/
    ├── modules/
    │   ├── featureA/          # Independent module (weak coupling)
    │   │   ├── components/
    │   │   ├── store/
    │   │   └── index.js       # Public API
    │   ├── featureB/
    │   └── featureC/
    └── App.js                 # Imports modules

Still one build/deploy, but enforced boundaries (no cross-module imports)
```

**Stage 3: Micro-Frontends** (scaled):
```
micro-frontends/
├── feature-a/                 # Separate app
│   └── package.json
├── feature-b/                 # Separate app
│   └── package.json
├── feature-c/                 # Separate app
│   └── package.json
└── shell-app/                 # Container
    └── package.json

Independent builds/deploys
```

---

### Real-World Examples

#### Example 1: **Gmail (Early 2000s)**

**Architecture**: Monolithic frontend (single JavaScript bundle).

**Structure**:
```
gmail/
├── compose.js                 # Email composition
├── inbox.js                   # Inbox view
├── search.js                  # Search
├── settings.js                # Settings
└── common.js                  # Shared utilities

Build: gmail.bundle.js (~1MB)
```

**Problems**:
- **Slow builds**: 10-minute full builds (100K+ lines)
- **Deploy risk**: One bug → entire Gmail down
- **Bundle size**: 1MB initial load (slow on 2000s networks)

**Evolution**: Migrated to modular architecture (2010s), then micro-frontends (2020s).

---

#### Example 2: **Airbnb (2015)**

**Architecture**: Monolithic React app (single repository).

**Features**:
```
airbnb-monolith/
├── search/                    # Search listings
├── booking/                   # Booking flow
├── host/                      # Host dashboard
├── payments/                  # Payments
└── messaging/                 # Chat

Build: main.bundle.js (~3MB)
```

**Problems**:
- **Team scaling**: 50+ developers, merge conflicts daily
- **Build time**: 15-minute production builds (slow CI/CD)
- **Deploy coordination**: Weekly deploys (teams blocked waiting)

**Evolution**: Migrated to micro-frontends (2018), independent team deploys (10+ times/day).

---

#### Example 3: **Shopify Admin (2017)**

**Architecture**: Monolithic Rails + JavaScript (jQuery).

**Structure**:
```
shopify-admin/
├── products.js                # Product management
├── orders.js                  # Order management
├── customers.js               # Customer management
├── analytics.js               # Analytics
└── settings.js                # Settings

Build: admin.bundle.js (~2MB)
```

**Problems**:
- **Performance**: 2MB bundle, 5s TTI (slow for merchants)
- **Tech debt**: Stuck on jQuery (hard to migrate to React)
- **Feature velocity**: 100+ developers, slow builds (20 minutes)

**Evolution**: Migrated to Polaris (component library) + micro-frontends (2020), independent feature deploys.

---

## 3. Clear Real-World Examples

### Example 1: **Startup MVP** (Good Fit)

**Scenario**: Early-stage startup, 5 developers, building SaaS dashboard.

**Architecture**: Monolithic React app.
```
dashboard/
├── src/
│   ├── auth/
│   ├── dashboard/
│   ├── analytics/
│   ├── settings/
│   └── shared/
└── package.json

Build: 500KB bundle, 2-minute builds
Deploy: Weekly releases
```

**Why Monolith Works**:
- **Simplicity**: 5 developers, easy coordination
- **Fast development**: Direct code sharing, no micro-frontend overhead
- **Low traffic**: 100 users, bundle size OK
- **Infrequent deploys**: Weekly releases acceptable

**Result**: Ship MVP in 3 months (vs 6 months with micro-frontends).

---

### Example 2: **Enterprise App** (Poor Fit)

**Scenario**: E-commerce platform, 200 developers, 20 teams, 50 features.

**Architecture**: Initially monolithic, became bottleneck.

**Problems**:
```
Monolith challenges:
├── Build time: 30 minutes (developers wait)
├── Deploy queue: 10+ teams waiting (deploy once/day)
├── Merge conflicts: 50+ PRs/day (conflicts)
├── Bundle size: 10MB (slow load for users)
└── Tech debt: Stuck on React 16 (upgrade too risky)

Impact:
├── Feature velocity: 2 weeks → 6 weeks (waiting, coordination)
├── Bugs: High (tight coupling, all features affect each other)
├── Developer frustration: High (slow feedback loop)
└── User experience: Slow (10MB bundle, 10s load time)
```

**Solution**: Migrated to micro-frontends (2-year migration).

**Result**: Build time 30min → 5min, deploy 1×/day → 10×/day, bundle size 10MB → 1MB.

---

### Example 3: **Admin Tool** (Good Fit)

**Scenario**: Internal admin tool for customer support (10 features, 5 developers).

**Architecture**: Monolithic Next.js app.

**Why Monolith Works**:
- **Low traffic**: 50 internal users (performance not critical)
- **Simple features**: CRUD operations (no complex state)
- **Unified UI**: Same design system (easy code sharing)
- **Infrequent updates**: Monthly releases (no deploy pressure)

**Result**: Maintain monolith (no need for complexity).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain monolithic frontend architecture and when to use it."

**Answer**:

"**Monolithic frontend architecture** is a **single codebase** where all features, components, and logic are **tightly coupled** in one application, with **shared dependencies**, **single build process**, and **single deployment**—simple initially but becomes a bottleneck at scale.

---

### Structure

**Characteristics**:

1. **Single repository**: All features in one codebase
2. **Shared dependencies**: One version of React/libraries (package.json)
3. **Tight coupling**: Features share state, utilities, components
4. **Single build**: Compile entire app (~5-15 minutes large apps)
5. **Single deployment**: Deploy all features together (atomic)

**Example**:
```
monolith-app/
├── src/
│   ├── features/
│   │   ├── Auth/
│   │   ├── Dashboard/
│   │   └── Analytics/
│   ├── shared/             # Shared components/state
│   ├── store/              # Global Redux store
│   └── App.js
└── package.json            # Single dependency list

Build: main.bundle.js (2-5MB)
Deploy: All features at once
```

---

### Advantages

**1. Simplicity** (small teams):
- Easy navigation (one project)
- Simple tooling (one Webpack config)
- Direct code sharing (import directly)
- Fast initial development (no overhead)

**2. Atomic deploys**:
- All features deploy together (consistent)
- No version mismatches (all compatible)

**3. Unified testing**:
- Test entire app (end-to-end)
- Catch integration issues (features interact)

**Example**: Startup MVP (5 developers, 10 features, deploy weekly) → monolith is perfect (ship fast, simple).

---

### Disadvantages

**1. Scalability issues** (large teams):
- **Team bottlenecks**: 50+ developers → merge conflicts, code review queues
- **Build time**: 15-minute builds (slow feedback loop)
- **Deploy coordination**: Weekly deploys (teams blocked)

**2. Bundle size** (performance):
- Large initial bundle (5MB) → slow load (download/parse unnecessary code)
- Example: User visits `/dashboard` → downloads all features (analytics, settings, profile) even though not needed

**3. Deploy risk** (all-or-nothing):
- One feature breaks → entire app rolls back
- Can't deploy independently (Feature A blocked by Feature B bug)

**4. Tight coupling** (hard to change):
- Shared dependencies → can't upgrade React for one feature
- Shared state → changes affect all features (regression risk)
- Tech lock-in → stuck on old versions (upgrade entire app at once)

**5. Feature velocity** (slow at scale):
- 50+ developers → waiting for builds, reviews, deploys
- Real-World: Facebook (2012) had 30-minute builds, deploy once/day → migrated to micro-frontends (deploy every 5 minutes)

---

### When to Use

**Good Fit** (Monolith):

1. **Small teams** (≤10 developers)
   - Easy coordination, no cross-team overhead
   
2. **Simple applications** (<50K lines, ≤5 features)
   - Low complexity, fast initial development

3. **Infrequent deployments** (weekly/monthly)
   - Low deploy cadence, coordinated releases OK

4. **Single team ownership**
   - One team owns entire app, unified roadmap

**Example**: Admin dashboard for internal tool (5 developers, 10 features, 50 users, deploy weekly).

---

**Poor Fit** (Micro-Frontends):

1. **Large teams** (50+ developers)
   - Merge conflicts, build queues, deploy coordination

2. **Frequent deployments** (multiple times/day)
   - Need independent feature releases, canary deploys

3. **Diverse tech stacks**
   - Some features React, others Angular (monolith forces single tech)

4. **Independent feature teams**
   - Teams own features end-to-end, different release cadences

**Example**: Facebook (1000+ developers, 100+ features, deploy every 5 minutes) → monolith bottleneck → migrated to micro-frontends.

---

### Evolution Path

**Monolith → Modular Monolith → Micro-Frontends**:

**Stage 1: Monolith**:
- One build, one deploy (simple)

**Stage 2: Modular Monolith**:
- Enforce boundaries (no cross-module imports)
- Still one build/deploy, but looser coupling
- Example: Gmail (2010s) had modules (compose, inbox, settings)

**Stage 3: Micro-Frontends**:
- Independent builds/deploys (autonomous teams)
- Example: Airbnb (2018) migrated from monolith → deploy 10× faster

---

### Trade-offs

**Monolith vs Micro-Frontends**:

| Aspect | Monolith | Micro-Frontends |
|--------|----------|-----------------|
| **Simplicity** | ✅ Simple | ❌ Complex (orchestration) |
| **Scalability** | ❌ Bottleneck (large teams) | ✅ Scales (independent teams) |
| **Build time** | ❌ Slow (15 min) | ✅ Fast (5 min per feature) |
| **Deploy risk** | ❌ High (all-or-nothing) | ✅ Low (independent) |
| **Bundle size** | ❌ Large (5MB) | ✅ Small (1MB per feature) |
| **Tech flexibility** | ❌ Locked (single tech) | ✅ Flexible (different tech per feature) |

**Decision**: Start with monolith (simple, fast initial development), migrate to micro-frontends when hitting scalability limits (50+ developers, 15+ minute builds, deploy bottleneck).

---

### Real-World

**Gmail (Early 2000s)**: Monolith → slow builds (10 min), 1MB bundle → migrated to modular architecture (2010s) → micro-frontends (2020s).

**Airbnb (2015)**: Monolith → 50+ developers, 15-min builds, weekly deploys → migrated to micro-frontends (2018) → deploy 10× faster.

**Shopify Admin (2017)**: Monolith → 100+ developers, 20-min builds, 2MB bundle → migrated to micro-frontends (2020) → independent feature deploys.

---

**Follow-up I Expect**:

Q: 'When to migrate from monolith to micro-frontends?'
A: **Signals**: (1) **Team size** >50 developers (merge conflicts, code review queues), (2) **Build time** >10 minutes (slow feedback loop), (3) **Deploy frequency** need multiple deploys/day (deploy queue), (4) **Feature velocity** slow (teams blocked waiting), (5) **Bundle size** >5MB (slow load). **Migration**: (1) Identify boundaries (features), (2) Extract feature (own repo, build, deploy), (3) Integrate with shell app (Module Federation), (4) Gradual migration (one feature at a time, 1-2 years). **Cost**: 6-12 months migration (orchestration complexity, shared components, testing).

Q: 'Can you have monolith with code splitting?'
A: **Yes**: Monolith with **dynamic imports** (route-based splitting). Example: `const Dashboard = lazy(() => import('./Dashboard'))` → loads dashboard.chunk.js only when route accessed. **Benefits**: Smaller initial bundle (500KB core vs 5MB full app), faster TTI. **Limitation**: Still monolith (one build, one deploy, tight coupling), just optimized loading. Doesn't solve team scalability (50+ developers still bottleneck).

Q: 'What's modular monolith?'
A: **Intermediate step** between monolith and micro-frontends. **Characteristics**: (1) **Enforced boundaries** (modules with public APIs, no cross-module imports), (2) **Still one build/deploy** (simpler than micro-frontends), (3) **Looser coupling** (modules independent, easier to extract later). **Example**: Gmail modules (compose, inbox, settings) export public APIs, no direct imports. **Benefits**: Better organization (clear boundaries), easier to migrate to micro-frontends (modules → separate apps). **When**: 20-50 developers (too big for pure monolith, too small for micro-frontends complexity)."

---

## 5. Code Examples

### Monolithic Structure

```javascript
// ❌ Monolith: Tight coupling (direct imports)

// src/features/Dashboard/Dashboard.js
import { useSelector } from 'react-redux';
import { UserProfile } from '../UserProfile/UserProfile'; // Direct import

export function Dashboard() {
  // Global state (tight coupling)
  const user = useSelector(state => state.user);
  
  return (
    <div>
      <h1>Dashboard</h1>
      <UserProfile user={user} />  {/* Feature depends on UserProfile */}
    </div>
  );
}

// src/features/UserProfile/UserProfile.js
import { authService } from '../../services/authService'; // Shared service

export function UserProfile({ user }) {
  const handleLogout = () => authService.logout(); // Shared dependency
  
  return <div>{user.name} <button onClick={handleLogout}>Logout</button></div>;
}

// Problem: Changes in UserProfile affect Dashboard (tight coupling)
// Problem: Can't deploy Dashboard without UserProfile (atomic deploy)
```

---

### Modular Monolith (Better Boundaries)

```javascript
// ✅ Modular Monolith: Enforced boundaries (public API)

// src/modules/UserProfile/index.js (public API)
export { UserProfile } from './UserProfile';
export { useUserProfile } from './useUserProfile';
// Only export what's needed (hide internals)

// src/modules/UserProfile/UserProfile.js (private)
import { authService } from './services/authService'; // Module-scoped service

export function UserProfile({ user }) {
  const handleLogout = () => authService.logout();
  return <div>{user.name} <button onClick={handleLogout}>Logout</button></div>;
}

// src/modules/Dashboard/Dashboard.js
import { UserProfile } from '@modules/UserProfile'; // Import from public API

export function Dashboard() {
  const user = useUserProfile(); // Module's hook (no global state)
  
  return (
    <div>
      <h1>Dashboard</h1>
      <UserProfile user={user} />
    </div>
  );
}

// Benefits:
// - Enforced boundaries (can't import UserProfile internals)
// - Easier to extract (UserProfile module → separate app)
// - Still one build/deploy (simpler than micro-frontends)
```

---

### Build Configuration

```javascript
// webpack.config.js (monolith)

module.exports = {
  entry: './src/index.js',        // Single entry point
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.bundle.js',   // Single bundle (or split)
  },
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',           // vendor.bundle.js (~500KB)
        },
        default: {
          minChunks: 2,
          priority: -20,
        },
      },
    },
  },
  
  // Problem: Full rebuild on any change (5-15 minutes)
  // Output: main.bundle.js (2-5MB) + vendor.bundle.js (500KB)
};
```

---

## 6. Why & How Summary

### Why It Matters

**Initial Simplicity**: Monolith enables fast initial development (small teams, direct code sharing, simple tooling, ship MVP quickly)  
**Scalability Bottleneck**: Becomes limiting at scale (50+ developers, 15-minute builds, deploy coordination, tight coupling, large bundles)  
**Team Velocity**: Impacts feature velocity (merge conflicts, code review queues, waiting for builds/deploys, slow feedback loop)  
**User Experience**: Affects performance (large bundles 5MB, slow TTI 5s, download/parse unnecessary code)  
**Technology Flexibility**: Constrains tech choices (single version of React/libraries, hard to upgrade, stuck on old versions, all-or-nothing migration)

### How It Works

**Structure**: Single repository (all features in one codebase), shared dependencies (one package.json, one version of React/libraries), tight coupling (features share state/utilities/components, direct imports, global Redux store), single build process (compile entire app 5-15 minutes, output main.bundle.js 2-5MB), single deployment (deploy all features at once, atomic releases, consistent state, no version mismatches)  
**Advantages**: Simplicity (easy navigation, simple tooling, direct code sharing, fast initial development), atomic deploys (all features together, no version mismatches), unified testing (end-to-end tests, catch integration issues), good for small teams (≤10 developers, simple coordination, low overhead)  
**Disadvantages**: Scalability issues (large teams 50+ developers merge conflicts code review queues deploy coordination, build time 15 minutes slow feedback loop, deploy risk all-or-nothing one feature breaks entire app rolls back, bundle size 5MB download/parse unnecessary code slow load, tight coupling hard to change shared dependencies can't upgrade React for one feature tech lock-in, feature velocity slow at scale waiting for builds reviews deploys)  
**When to Use**: Small teams (≤10 developers easy coordination), simple applications (<50K lines ≤5 features low complexity), infrequent deployments (weekly/monthly coordinated releases), single team ownership (one team owns entire app unified roadmap), examples: startup MVP admin dashboard internal tool  
**When to Avoid**: Large teams (50+ developers merge conflicts build queues), frequent deployments (multiple times/day independent feature releases canary deploys), diverse tech stacks (some features React others Angular), independent feature teams (own features end-to-end different release cadences), examples: Facebook Airbnb Shopify at scale  
**Evolution Path**: Monolith (one build one deploy simple) → Modular Monolith (enforced boundaries still one build/deploy looser coupling) → Micro-Frontends (independent builds/deploys autonomous teams), migration triggers: team size >50, build time >10 minutes, deploy frequency need multiple/day, feature velocity slow, bundle size >5MB

**FAANG Expectation**: Define monolithic frontend (single codebase shared dependencies tight coupling single build/deploy), advantages (simplicity atomic deploys unified testing good for small teams), disadvantages (scalability issues build time deploy risk bundle size tight coupling feature velocity slow at scale), when to use (small teams ≤10 simple apps infrequent deploys single team ownership) vs avoid (large teams 50+ frequent deploys diverse tech independent teams), evolution path (monolith → modular monolith → micro-frontends), trade-offs (simplicity vs scalability, fast initial development vs slow at scale, easy code sharing vs tight coupling, atomic deploys vs deploy risk), real-world examples (Gmail monolith slow builds migrated, Airbnb 50+ developers 15-min builds migrated to micro-frontends 10× faster deploys, Shopify 100+ developers 20-min builds migrated independent feature deploys), migration signals (team size >50, build time >10 min, deploy frequency need multiple/day, feature velocity slow, bundle size >5MB), modular monolith as intermediate (enforced boundaries still one build/deploy easier to extract)
