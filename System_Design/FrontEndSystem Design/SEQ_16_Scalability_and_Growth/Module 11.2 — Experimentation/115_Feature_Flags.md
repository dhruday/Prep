# 115. Feature Flags

## 1. High-Level Explanation (Frontend Interview Level)

**Feature Flags** (also called feature toggles or feature switches) are a software development technique that allows teams to enable or disable functionality at runtime without deploying new code, enabling progressive rollouts, A/B testing, and instant rollback capabilities.

- **What**: Conditional logic that wraps features, controlled by configuration stored remotely (database, CDN, edge KV), allowing dynamic enabling/disabling per user, segment, or globally
- **Why**: Decouple deployments from releases, enable canary testing (1% → 100%), instant rollback without code deployment, personalization, beta programs, kill switches for buggy features
- **When**: Essential for continuous deployment pipelines, A/B testing platforms, progressive rollouts, multi-tenant applications, feature development cycles
- **Role**: Forms the foundation of modern deployment strategies—enables trunk-based development, reduces risk in releases, provides operational control post-deployment

**Key Principle**: Deploy code disabled behind flags, enable progressively, roll back instantly if issues detected.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Types of Feature Flags

**1. Release Flags (Temporary)**
- **Purpose**: Hide incomplete features in production
- **Lifetime**: Days to weeks (until feature complete)
- **Example**: New checkout flow behind `new_checkout_enabled`
- **Cleanup**: Remove flag + old code after 100% rollout

**2. Experiment Flags (Temporary)**
- **Purpose**: A/B testing, multivariate testing
- **Lifetime**: Weeks to months (until statistical significance)
- **Example**: Button color variants behind `button_color_experiment`
- **Cleanup**: Remove losing variant + flag after winner determined

**3. Ops Flags (Permanent)**
- **Purpose**: Kill switches, load shedding, circuit breakers
- **Lifetime**: Permanent (operational control)
- **Example**: `recommendations_enabled` to disable during overload
- **Cleanup**: Never removed (operational necessity)

**4. Permission Flags (Long-lived)**
- **Purpose**: Premium features, beta access, entitlements
- **Lifetime**: Months to years
- **Example**: `advanced_analytics_enabled` for premium users
- **Cleanup**: Refactor to authorization system eventually

**Architecture Patterns**

**1. Client-Side Evaluation (Fast, Staleness Risk)**
```javascript
// Flags fetched on app load, cached locally
class FeatureFlagManager {
  flags = {};
  userId = null;
  
  async initialize(userId) {
    this.userId = userId;
    
    // Fetch flags from CDN edge (< 50ms)
    const response = await fetch('/api/flags', {
      headers: { 'X-User-ID': userId },
      cache: 'no-store' // Always fresh
    });
    
    this.flags = await response.json();
    this.cacheLocally();
  }
  
  isEnabled(flagKey) {
    // Check local cache first (instant)
    const cached = this.getCached(flagKey);
    if (cached !== undefined) return cached;
    
    // Fallback to fetched flags
    return this.flags[flagKey] ?? false; // Default: disabled
  }
  
  cacheLocally() {
    localStorage.setItem('feature_flags', JSON.stringify(this.flags));
  }
  
  getCached(flagKey) {
    const cached = localStorage.getItem('feature_flags');
    if (cached) {
      const flags = JSON.parse(cached);
      return flags[flagKey];
    }
  }
}
```

**Trade-offs**:
- ✅ **Fast**: No network call during evaluation (< 1ms)
- ✅ **Offline**: Works without connection
- ❌ **Stale**: Flags updated only on app refresh
- ❌ **Security**: Client can manipulate flags

**2. Server-Side Evaluation (Secure, Slower)**
```javascript
// Flags evaluated on backend, frontend receives result
async function getFlags(userId, context) {
  return await fetch('/api/flags/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      context: {
        country: context.country,
        userAgent: context.userAgent,
        subscription: context.subscription
      }
    })
  }).then(r => r.json());
}

// Backend (Node.js)
app.post('/api/flags/evaluate', async (req, res) => {
  const { userId, context } = req.body;
  
  // Evaluate flags server-side (secure, complex targeting)
  const flags = await evaluateFlags(userId, context);
  
  res.json(flags);
});
```

**Trade-offs**:
- ✅ **Secure**: Client cannot manipulate
- ✅ **Fresh**: Always latest config
- ✅ **Complex Targeting**: Evaluate based on backend data (subscription, spend)
- ❌ **Latency**: Network call required (50-200ms)

**3. Hybrid (Edge Evaluation)**
```javascript
// Edge Worker (Cloudflare, Fastly) evaluates flags
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const userId = getCookie(request, 'user_id');
  
  // Fetch flag config from KV store (< 5ms)
  const flagConfig = await FEATURE_FLAGS.get('config', 'json');
  
  // Evaluate at edge
  const flags = evaluateFlags(userId, flagConfig);
  
  // Inject into HTML or set header
  const response = await fetch(request);
  return new Response(response.body, {
    ...response,
    headers: {
      ...response.headers,
      'X-Feature-Flags': JSON.stringify(flags)
    }
  });
}

function evaluateFlags(userId, config) {
  return Object.entries(config).reduce((acc, [key, rule]) => {
    acc[key] = evaluateRule(userId, rule);
    return acc;
  }, {});
}

function evaluateRule(userId, rule) {
  // Percentage rollout
  if (rule.type === 'percentage') {
    const hash = hashCode(userId + rule.salt);
    return (hash % 100) < rule.percentage;
  }
  
  // User whitelist
  if (rule.type === 'whitelist') {
    return rule.users.includes(userId);
  }
  
  // Default
  return rule.enabled ?? false;
}
```

**Trade-offs**:
- ✅ **Fast**: Edge evaluation (1-10ms overhead)
- ✅ **Fresh**: Flags updated at edge (< 1min propagation)
- ✅ **Scalable**: No backend load
- ⚠️ **Limited Context**: Only request data available at edge

**Targeting Strategies**

**1. Percentage Rollout (Canary)**
```javascript
{
  "new_checkout": {
    "type": "percentage",
    "percentage": 10, // 10% of users
    "salt": "checkout_v2_2024", // Consistent hashing seed
    "enabled": true
  }
}

// Evaluation: Consistent hash ensures same user always gets same variant
function isEnabledForUser(userId, flag) {
  const hash = hashCode(userId + flag.salt);
  return (hash % 100) < flag.percentage;
}

// Progressive rollout:
// Day 1: 1% → Monitor errors, performance
// Day 2: 5% → Validate at scale
// Day 3: 25% → Broad exposure
// Day 4: 50% → Majority
// Day 5: 100% → Full rollout
```

**2. User Segment Targeting**
```javascript
{
  "premium_features": {
    "type": "segment",
    "rules": [
      { "attribute": "subscription", "operator": "equals", "value": "premium" },
      { "attribute": "country", "operator": "in", "value": ["US", "CA", "UK"] }
    ],
    "logic": "AND" // All rules must match
  }
}

function evaluateSegment(user, flag) {
  return flag.rules.every(rule => {
    switch (rule.operator) {
      case 'equals':
        return user[rule.attribute] === rule.value;
      case 'in':
        return rule.value.includes(user[rule.attribute]);
      case 'gt':
        return user[rule.attribute] > rule.value;
      default:
        return false;
    }
  });
}
```

**3. Context-Based Targeting**
```javascript
{
  "mobile_redesign": {
    "type": "context",
    "rules": [
      { "attribute": "platform", "operator": "equals", "value": "mobile" },
      { "attribute": "appVersion", "operator": "gte", "value": "2.5.0" }
    ]
  }
}

// Usage
const flags = featureFlags.evaluate(userId, {
  platform: isMobile ? 'mobile' : 'desktop',
  appVersion: '2.5.1',
  locale: 'en-US'
});
```

**4. Time-Based Activation**
```javascript
{
  "black_friday_banner": {
    "type": "scheduled",
    "startDate": "2024-11-29T00:00:00Z",
    "endDate": "2024-12-01T23:59:59Z",
    "timezone": "America/New_York"
  }
}

function evaluateScheduled(flag) {
  const now = new Date();
  const start = new Date(flag.startDate);
  const end = new Date(flag.endDate);
  
  return now >= start && now <= end;
}
```

**Flag Management Lifecycle**

```
1. Create Flag
   ↓
2. Deploy Code (flag disabled)
   ↓
3. Enable for Internal Users (beta testing)
   ↓
4. Canary Rollout (1% → 5% → 25% → 50% → 100%)
   ↓
5. Monitor Metrics (errors, conversions, performance)
   ↓
6. Decision Point:
   ├─ Success → 100% rollout → Remove flag (cleanup)
   └─ Failure → Rollback to 0% → Fix → Retry
```

**Technical Debt: Flag Cleanup**
```javascript
// Before cleanup
if (featureFlags.isEnabled('new_checkout')) {
  return <NewCheckout />;
} else {
  return <OldCheckout />; // Remove after 100% rollout
}

// After cleanup (new_checkout at 100% for 2 weeks)
return <NewCheckout />; // Flag removed, old code deleted
```

**Flag Cleanup Process**:
1. Flag at 100% for 2+ weeks (ensure stability)
2. Remove flag check, delete old code path
3. Remove flag from config, database
4. Update documentation

**Anti-Pattern**: Accumulating flags over time → code complexity, technical debt. Aim: < 20 active flags, aggressive cleanup.

**Performance Optimization**

**1. Batch Flag Fetching**
```javascript
// Anti-pattern: 10 flags → 10 API calls
const flag1 = await featureFlags.isEnabled('feature1');
const flag2 = await featureFlags.isEnabled('feature2');
// ...

// Pattern: 1 API call for all flags
const flags = await featureFlags.initialize(userId);
const flag1 = flags.feature1;
const flag2 = flags.feature2;
```

**2. Flag Caching with TTL**
```javascript
class CachedFeatureFlags {
  cache = new Map();
  ttl = 60000; // 1min
  
  async get(userId) {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.flags; // Cache HIT
    }
    
    // Cache MISS: Fetch fresh
    const flags = await this.fetchFlags(userId);
    this.cache.set(userId, { flags, timestamp: Date.now() });
    
    return flags;
  }
}
```

**3. Real-Time Updates (WebSocket)**
```javascript
// Subscribe to flag updates
const flagSocket = new WebSocket('wss://flags.example.com');

flagSocket.onmessage = (event) => {
  const { flagKey, value } = JSON.parse(event.data);
  
  // Update flag in memory
  featureFlags.update(flagKey, value);
  
  // Re-render components using this flag
  flagUpdateEmitter.emit('update', flagKey);
};

// React integration
function useFeatureFlag(flagKey) {
  const [value, setValue] = useState(featureFlags.isEnabled(flagKey));
  
  useEffect(() => {
    const listener = (updatedKey) => {
      if (updatedKey === flagKey) {
        setValue(featureFlags.isEnabled(flagKey));
      }
    };
    
    flagUpdateEmitter.on('update', listener);
    return () => flagUpdateEmitter.off('update', listener);
  }, [flagKey]);
  
  return value;
}
```

**What NOT to Do**:
- ❌ Store sensitive logic in client-side flags (client can manipulate)
- ❌ Evaluate flags synchronously blocking render
- ❌ No flag cleanup (accumulate 100+ flags over years)
- ❌ No monitoring (don't track flag usage, errors)
- ❌ No default values (flag fetch fails → app breaks)

---

## 3. Clear Real-World Examples

### Example 1: Facebook's Gatekeeper System

**Architecture**:
```javascript
// Gatekeeper: Facebook's internal feature flag system
// Used for: Progressive rollouts, A/B tests, kill switches

const Gatekeeper = {
  // Example flag configuration
  flags: {
    'news_feed_algorithm_v3': {
      type: 'percentage',
      percentage: 25, // 25% rollout
      countries: ['US', 'CA'], // Geographic targeting
      minVersion: '100.0' // Only users on v100+
    },
    
    'messenger_ui_redesign': {
      type: 'whitelist',
      users: ['fb_employees', 'beta_testers'],
      enabled: true
    },
    
    'video_autoplay': {
      type: 'segment',
      rules: [
        { attribute: 'connection', operator: 'in', value: ['wifi', '4g'] },
        { attribute: 'dataSaver', operator: 'equals', value: false }
      ]
    }
  }
};

// Client evaluation (React Native)
function NewsFeed() {
  const isNewAlgorithm = Gatekeeper.isEnabled('news_feed_algorithm_v3');
  
  const posts = isNewAlgorithm 
    ? fetchWithAlgorithmV3() 
    : fetchWithAlgorithmV2();
  
  return <PostList posts={posts} />;
}
```

**Scale Numbers**:
- **10,000+ active flags** at any time
- **3B+ evaluations/second** globally
- **< 1ms overhead** per evaluation (client-side cache)
- **100+ experiments** running concurrently

**Key Learnings**:
- Flags evaluated client-side for performance (cached locally)
- Server provides flag config on app open
- Real-time updates via persistent connection for critical flags

### Example 2: Netflix Feature Flag Platform

**Zuul-Based Edge Flag Evaluation**:
```javascript
// Edge Gateway (Zuul) injects flags into request context
app.use(async (req, res, next) => {
  const userId = req.headers['x-netflix-user-id'];
  const deviceType = req.headers['x-netflix-device-type'];
  
  // Evaluate flags at edge
  const flags = await evaluateFlags(userId, {
    deviceType,
    country: req.geo.country,
    abTestGroup: getABTestGroup(userId)
  });
  
  // Inject into context
  req.featureFlags = flags;
  next();
});

// Example flags
const netflixFlags = {
  'skip_intro_button': {
    type: 'percentage',
    percentage: 100, // Fully rolled out
    devices: ['tv', 'web'] // Not on mobile
  },
  
  'autoplay_previews': {
    type: 'user_preference',
    defaultValue: true,
    allowUserOverride: true // User can disable in settings
  },
  
  'download_feature': {
    type: 'subscription',
    requiredTier: 'premium',
    regions: ['US', 'UK', 'CA']
  }
};
```

**Rollout Example (2022 Shuffle Play)**:
```
Week 1: 1% US users → Monitor engagement metrics
Week 2: 5% globally → Validate internationalization
Week 3: 25% → Detect performance issues (none found)
Week 4: 50% → Majority adoption, positive feedback
Week 5: 100% → Full rollout complete
```

**Incident Response with Flags**:
- **Problem**: New recommendation algorithm causing 3x API load (Oct 2023)
- **Action**: Disabled `ml_recommendations_v4` flag (1 command, < 10s propagation)
- **Result**: Instant rollback to v3, API load normalized
- **Resolution**: Optimized v4 algorithm, re-enabled after 24h

### Example 3: Stripe's Feature Flag Best Practices

**Typed Feature Flags (TypeScript)**:
```typescript
// flags.ts - Type-safe flag definitions
export const FLAGS = {
  enhancedCheckout: {
    key: 'enhanced_checkout',
    defaultValue: false,
    type: 'release' as const,
    owner: 'payments-team',
    jiraTicket: 'PAY-1234',
    removalDate: '2024-12-31'
  },
  
  paymentMethodExperiment: {
    key: 'payment_method_experiment',
    defaultValue: 'control' as 'control' | 'variant-a' | 'variant-b',
    type: 'experiment' as const,
    owner: 'growth-team',
    metrics: ['conversion_rate', 'revenue_per_user']
  },
  
  rateLimitingV2: {
    key: 'rate_limiting_v2',
    defaultValue: false,
    type: 'ops' as const,
    owner: 'infra-team',
    permanent: true // Never remove
  }
} as const;

// Usage with type safety
function CheckoutPage() {
  const flags = useFeatureFlags();
  
  // TypeScript knows this is boolean
  if (flags.get(FLAGS.enhancedCheckout)) {
    return <EnhancedCheckout />;
  }
  
  // TypeScript knows this is 'control' | 'variant-a' | 'variant-b'
  const variant = flags.get(FLAGS.paymentMethodExperiment);
  
  switch (variant) {
    case 'variant-a':
      return <CheckoutVariantA />;
    case 'variant-b':
      return <CheckoutVariantB />;
    default:
      return <CheckoutControl />;
  }
}
```

**Flag Governance**:
```javascript
// Automated flag cleanup alerts
const flagAudit = {
  'enhanced_checkout': {
    createdAt: '2024-01-15',
    rolloutPercentage: 100,
    daysSince100: 45, // > 30 days
    status: '⚠️ READY_FOR_CLEANUP' // Alert sent to owner
  },
  
  'payment_method_experiment': {
    createdAt: '2024-03-01',
    status: 'ACTIVE',
    expectedCompletion: '2024-04-15'
  }
};

// Automated cleanup PR creation
// After 30 days at 100%, bot creates PR:
// 1. Removes flag check
// 2. Deletes old code path
// 3. Updates tests
// 4. Tags owner for review
```

### Example 4: GitHub's Ship Mode

**Emergency Flag Management**:
```javascript
// GitHub "Ship Mode" - disable non-critical features during incidents
const shipModeFlags = {
  actionsCI: { enabled: true, priority: 'critical' },
  pullRequests: { enabled: true, priority: 'critical' },
  issueTracking: { enabled: true, priority: 'critical' },
  
  // Disabled in ship mode
  codeSearch: { enabled: false, priority: 'high' },
  notifications: { enabled: false, priority: 'medium' },
  activityFeed: { enabled: false, priority: 'low' },
  socialFeatures: { enabled: false, priority: 'low' }
};

// Activated during Oct 2021 incident (database overload)
// Effect: Disabled 30% of features, maintained core workflows
// Result: Site remained functional for critical paths (CI/CD, PR reviews)
```

**Incident Timeline**:
```
12:00 PM: Database latency spike detected (5s → 15s queries)
12:02 PM: Ship Mode activated via flag (1 command)
12:02 PM: 10 non-critical features disabled instantly
12:05 PM: Core features (CI, PR, Issues) performing normally
2:00 PM: Database issue resolved
2:05 PM: Ship Mode deactivated, all features re-enabled
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you implement a feature flag system for a large-scale application?"

**Answer**:

"I'd design a **hybrid evaluation system** with edge-side evaluation for performance and server-side for complex targeting:

**Architecture**:

**Client-Side**: Flags fetched on app initialization, cached in memory and localStorage. Evaluation is synchronous (< 1ms), works offline. Used for: UI toggles, simple percentage rollouts.

**Edge-Side**: Cloudflare Workers evaluate flags at CDN edge. Flags config stored in KV store (1-5ms lookup). Consistent hashing for percentage rollouts. Used for: Geographic targeting, A/B tests, device-based targeting.

**Server-Side**: Complex rules requiring database context—subscription tier, user lifetime value, feature entitlements. Used for: Premium features, compliance rules (GDPR), enterprise contracts.

**Flag Types**:

1. **Release Flags** (temporary): Hide incomplete features. Example: `new_checkout_enabled` starts at 0%, progressive rollout 1% → 5% → 25% → 100%. Removed after 2 weeks at 100%.

2. **Experiment Flags** (temporary): A/B testing. Example: `button_color_experiment` with variants 'red', 'blue', 'green'. User assigned via consistent hash. Removed after statistical significance + winner implementation.

3. **Ops Flags** (permanent): Kill switches. Example: `recommendations_enabled` to disable during API overload. Never removed—operational necessity.

4. **Permission Flags** (long-lived): Entitlements. Example: `advanced_analytics` for premium users. Eventually refactored to permission system.

**Targeting Strategies**:

**Percentage Rollout**:
```javascript
const hash = hashCode(userId + flag.salt) % 100;
return hash < flag.percentage; // 25% → hash < 25
```

Salt ensures consistent assignment—user always sees same variant. Progressive: 1% (test) → 5% (validate) → 25% (scale) → 100% (done).

**Segment Targeting**:
```javascript
rules: [
  { attribute: 'subscription', operator: 'equals', value: 'premium' },
  { attribute: 'country', operator: 'in', value: ['US', 'CA'] }
]
```

**Context Targeting**: Mobile vs desktop, app version, connection speed.

**Technical Implementation**:

**Caching**: Flags cached 1min client-side, 5min edge-side. Trade-off: Slight staleness vs performance.

**Real-Time Updates**: WebSocket for critical flags (ops flags like kill switches). 99% of flags use polling (1min interval).

**Default Values**: Every flag has fallback—if fetch fails, defaults to 'off' (safe default).

**Monitoring**: Track flag evaluations (how many users seeing each variant), errors, performance impact. Alert if flag at 100% for > 30 days (cleanup reminder).

**Flag Cleanup**: Aggressive policy—release flags removed within 2 weeks of 100% rollout. Automated PRs created by bot. Target: < 20 active release flags.

**Trade-offs**:

- Caching: Faster evaluation but 1min staleness (acceptable for most flags)
- Client-side: Performance but less secure (ops flags are server-side)
- Complexity: Managing hundreds of flags requires governance (ownership, expiry dates, automated cleanup)

**Real-World**: Stripe uses typed flags with mandatory owners + removal dates. GitHub has 'Ship Mode' to disable non-critical features during incidents. Facebook evaluates 3B+ flags/second client-side."

### Follow-Up Questions

**Q1**: "How do you prevent feature flag technical debt?"

**A**: "Multi-pronged approach:

**1. Mandatory Metadata**: Every flag requires owner, type (release/experiment/ops/permission), creation date, expected removal date (release flags only).

**2. Automated Alerts**: Bot checks daily:
   - Flags at 100% for > 30 days → alert owner for cleanup
   - Flags older than 90 days without activity → flag for review
   - Flags without owner → escalate to engineering manager

**3. Automated Cleanup PRs**: Bot creates PR removing flag code:
   - Removes flag check (`if (flag.enabled)` → always true path)
   - Deletes unused code path
   - Updates tests
   - Tags owner for review

**4. Dashboard Visibility**: Public dashboard showing:
   - Total flags: 45 (target: < 50)
   - Ready for cleanup: 5 flags
   - Overdue cleanup: 2 flags (> 60 days at 100%)
   - Ownership: 3 orphaned flags

**5. Quarterly Audits**: Team reviews all active flags, prunes unused ones.

**6. Permanent Flag Documentation**: Ops/permission flags documented in wiki with rationale for permanence.

**7. Testing**: E2E tests for both flag states (on/off) to ensure cleanup doesn't break functionality.

Stripe maintains < 100 active flags across 1000s of features by aggressive cleanup."

**Q2**: "How do you handle flag evaluation failures gracefully?"

**A**: "Defense in depth:

**1. Default Values**: Every flag has safe default (usually 'off' for new features, 'on' for established):
```javascript
const isEnabled = flags.get('new_feature', false); // Default: false
```

**2. Try-Catch Wrapper**:
```javascript
function isFeatureEnabled(key, defaultValue = false) {
  try {
    return featureFlags.get(key) ?? defaultValue;
  } catch (error) {
    logger.error('Flag evaluation failed', { key, error });
    return defaultValue; // Fail safe
  }
}
```

**3. Stale Cache Fallback**: If fetch fails, serve from stale cache (even if expired):
```javascript
const cached = staleCache.get(flagKey);
if (fetchError && cached) {
  return cached; // Serve stale rather than fail
}
```

**4. Circuit Breaker**: After 5 consecutive flag service failures, stop requests for 1min, serve from cache only.

**5. Feature Detection**: Check if flag service reachable before relying on it:
```javascript
const flagServiceHealthy = await checkFlagService();
if (!flagServiceHealthy) {
  return defaultFlags; // Fallback to safe defaults
}
```

**6. Monitoring**: Alert if flag fetch success rate < 99.9% or latency > 200ms.

**Real-World**: During AWS S3 outage (2017), companies with flag systems in S3 failed. Lesson: Host flag config in multiple providers (S3 + CloudFront + Fastly) with fallback."

**Q3**: "How do you A/B test with feature flags?"

**A**: "Feature flags are foundation of A/B testing:

**1. Variant Assignment**:
```javascript
const variant = getVariant(userId, 'checkout_button_color', {
  control: 0.33,   // 33% blue (current)
  variant_a: 0.33, // 33% red
  variant_b: 0.34  // 34% green
});
```

Consistent hashing ensures user always sees same variant.

**2. Tracking**:
```javascript
// Log variant assignment
analytics.track('experiment_viewed', {
  experiment: 'checkout_button_color',
  variant,
  userId
});

// Track conversion
analytics.track('purchase_completed', {
  experiment: 'checkout_button_color',
  variant,
  revenue: 99.99
});
```

**3. Statistical Significance**: Wait for 10,000 samples per variant + 7 days minimum. Use Bayesian A/B testing for early stopping if clear winner.

**4. Winner Implementation**:
```
Experiment runs 14 days → Variant A wins (5% conversion increase, p < 0.01)
   ↓
Implement variant A as default
   ↓
Remove experiment flag + losing variants
   ↓
Document learnings
```

**5. Interaction Effects**: Run one experiment per page section to avoid interactions (button color + checkout flow = confounded).

**6. Metrics**: Define success metrics upfront: primary (conversion rate), secondary (revenue, engagement), guardrail (error rate, latency).

**Tools**: LaunchDarkly, Split.io, Optimizely integrate flags + analytics. Facebook runs 100+ experiments concurrently using Gatekeeper + internal analytics."

---

## 5. Code Examples

### Example 1: Production-Ready Feature Flag Manager

```typescript
// featureFlags.ts
interface FlagConfig {
  key: string;
  type: 'release' | 'experiment' | 'ops' | 'permission';
  defaultValue: boolean | string;
  targeting?: {
    percentage?: number;
    users?: string[];
    segments?: Array<{
      attribute: string;
      operator: 'equals' | 'in' | 'gt' | 'lt';
      value: any;
    }>;
  };
}

interface User {
  id: string;
  email?: string;
  attributes?: Record<string, any>;
}

class FeatureFlagManager {
  private flags: Map<string, FlagConfig> = new Map();
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1min
  
  async initialize(apiKey: string) {
    try {
      const response = await fetch('/api/flags', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error('Flag fetch failed');
      }
      
      const configs: FlagConfig[] = await response.json();
      
      configs.forEach(config => {
        this.flags.set(config.key, config);
      });
      
      this.cacheLocally();
      
      return true;
    } catch (error) {
      console.error('[FeatureFlags] Initialization failed', error);
      this.loadFromLocalStorage(); // Fallback to cached
      return false;
    }
  }
  
  isEnabled(key: string, user: User): boolean {
    const flag = this.flags.get(key);
    if (!flag) {
      console.warn(`[FeatureFlags] Unknown flag: ${key}`);
      return false; // Safe default
    }
    
    // Check cache
    const cacheKey = `${key}:${user.id}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }
    
    // Evaluate
    const value = this.evaluate(flag, user);
    
    // Cache result
    this.cache.set(cacheKey, { value, timestamp: Date.now() });
    
    return value;
  }
  
  getVariant(key: string, user: User): string {
    const flag = this.flags.get(key);
    if (!flag || flag.type !== 'experiment') {
      return 'control';
    }
    
    return this.evaluateExperiment(flag, user);
  }
  
  private evaluate(flag: FlagConfig, user: User): boolean {
    // No targeting: use default
    if (!flag.targeting) {
      return flag.defaultValue as boolean;
    }
    
    const { percentage, users, segments } = flag.targeting;
    
    // User whitelist
    if (users && users.includes(user.id)) {
      return true;
    }
    
    // Segment targeting
    if (segments && !this.matchesSegments(user, segments)) {
      return false;
    }
    
    // Percentage rollout
    if (percentage !== undefined) {
      const hash = this.hashCode(user.id + flag.key);
      return (hash % 100) < percentage;
    }
    
    return flag.defaultValue as boolean;
  }
  
  private evaluateExperiment(flag: FlagConfig, user: User): string {
    const variants = flag.defaultValue as Record<string, number>; // { control: 0.5, variant_a: 0.5 }
    
    const hash = this.hashCode(user.id + flag.key);
    const bucket = hash % 100;
    
    let cumulative = 0;
    for (const [variant, percentage] of Object.entries(variants)) {
      cumulative += percentage * 100;
      if (bucket < cumulative) {
        return variant;
      }
    }
    
    return 'control';
  }
  
  private matchesSegments(user: User, segments: FlagConfig['targeting']['segments']): boolean {
    return segments.every(segment => {
      const userValue = user.attributes?.[segment.attribute];
      
      switch (segment.operator) {
        case 'equals':
          return userValue === segment.value;
        case 'in':
          return segment.value.includes(userValue);
        case 'gt':
          return userValue > segment.value;
        case 'lt':
          return userValue < segment.value;
        default:
          return false;
      }
    });
  }
  
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
  
  private cacheLocally() {
    const data = Array.from(this.flags.entries());
    localStorage.setItem('feature_flags', JSON.stringify(data));
  }
  
  private loadFromLocalStorage() {
    try {
      const cached = localStorage.getItem('feature_flags');
      if (cached) {
        const data = JSON.parse(cached);
        this.flags = new Map(data);
        console.info('[FeatureFlags] Loaded from local cache');
      }
    } catch (error) {
      console.error('[FeatureFlags] Failed to load cache', error);
    }
  }
  
  // Real-time updates
  subscribe(callback: (key: string, value: boolean) => void) {
    const ws = new WebSocket('wss://flags.example.com');
    
    ws.onmessage = (event) => {
      const { key, config } = JSON.parse(event.data);
      this.flags.set(key, config);
      this.cache.clear(); // Invalidate cache
      callback(key, this.flags.get(key).defaultValue as boolean);
    };
    
    return () => ws.close();
  }
}

export const featureFlags = new FeatureFlagManager();
```

### Example 2: React Integration with Hooks

```tsx
// useFeatureFlag.tsx
import { useState, useEffect, useContext, createContext } from 'react';
import { featureFlags } from './featureFlags';

interface FeatureFlagContextValue {
  isEnabled: (key: string) => boolean;
  getVariant: (key: string) => string;
  loading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({ 
  children, 
  user, 
  apiKey 
}: { 
  children: React.ReactNode; 
  user: User; 
  apiKey: string;
}) {
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    featureFlags.initialize(apiKey).then(() => {
      setLoading(false);
    });
    
    // Subscribe to real-time updates
    const unsubscribe = featureFlags.subscribe(() => {
      forceUpdate({}); // Trigger re-render
    });
    
    return unsubscribe;
  }, [apiKey]);
  
  const value = {
    isEnabled: (key: string) => featureFlags.isEnabled(key, user),
    getVariant: (key: string) => featureFlags.getVariant(key, user),
    loading
  };
  
  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(key: string): boolean {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlag must be used within FeatureFlagProvider');
  }
  
  return context.isEnabled(key);
}

export function useExperiment(key: string): string {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useExperiment must be used within FeatureFlagProvider');
  }
  
  const variant = context.getVariant(key);
  
  useEffect(() => {
    // Track experiment view
    analytics.track('experiment_viewed', {
      experiment: key,
      variant
    });
  }, [key, variant]);
  
  return variant;
}

// Usage in component
function CheckoutPage() {
  const isNewCheckout = useFeatureFlag('new_checkout');
  const buttonVariant = useExperiment('checkout_button_color');
  
  if (isNewCheckout) {
    return <NewCheckout buttonColor={buttonVariant} />;
  }
  
  return <OldCheckout />;
}

// Conditional rendering wrapper
function FeatureFlag({ 
  flag, 
  fallback = null, 
  children 
}: { 
  flag: string; 
  fallback?: React.ReactNode; 
  children: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(flag);
  
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}

// Usage
function ProductPage() {
  return (
    <div>
      <ProductDetails />
      
      <FeatureFlag flag="reviews_enabled">
        <Reviews />
      </FeatureFlag>
      
      <FeatureFlag 
        flag="recommendations_enabled" 
        fallback={<div>Recommendations temporarily unavailable</div>}
      >
        <Recommendations />
      </FeatureFlag>
    </div>
  );
}
```

### Example 3: Edge Worker Flag Evaluation (Cloudflare)

```javascript
// Cloudflare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const userId = getCookie(request, 'user_id') || generateGuestId();
  
  // Fetch flag config from KV (< 5ms)
  const flagConfig = await FLAGS_KV.get('config', 'json');
  
  // Evaluate flags at edge
  const flags = evaluateAllFlags(userId, flagConfig, request);
  
  // Inject flags into HTML or header
  const response = await fetch(request);
  
  if (response.headers.get('Content-Type')?.includes('text/html')) {
    // Inject into HTML
    const html = await response.text();
    const injected = html.replace(
      '<head>',
      `<head><script>window.__FEATURE_FLAGS__=${JSON.stringify(flags)}</script>`
    );
    
    return new Response(injected, {
      ...response,
      headers: response.headers
    });
  }
  
  // Or set header
  return new Response(response.body, {
    ...response,
    headers: {
      ...response.headers,
      'X-Feature-Flags': JSON.stringify(flags)
    }
  });
}

function evaluateAllFlags(userId, config, request) {
  const flags = {};
  
  for (const [key, rule] of Object.entries(config)) {
    flags[key] = evaluateFlag(userId, rule, request);
  }
  
  return flags;
}

function evaluateFlag(userId, rule, request) {
  // Percentage rollout
  if (rule.type === 'percentage') {
    const hash = hashCode(userId + rule.salt);
    return (hash % 100) < rule.percentage;
  }
  
  // Geographic targeting
  if (rule.type === 'geo') {
    const country = request.cf.country;
    return rule.countries.includes(country);
  }
  
  // Device targeting
  if (rule.type === 'device') {
    const userAgent = request.headers.get('User-Agent');
    const isMobile = /mobile/i.test(userAgent);
    return rule.devices.includes(isMobile ? 'mobile' : 'desktop');
  }
  
  // Default
  return rule.defaultValue ?? false;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getCookie(request, name) {
  const cookies = request.headers.get('Cookie');
  if (!cookies) return null;
  
  const match = cookies.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? match[2] : null;
}

function generateGuestId() {
  return 'guest_' + Math.random().toString(36).substr(2, 9);
}
```

---

## 6. Why & How Summary

### Why It Matters

**Business Impact**:
- **Risk Reduction**: Instant rollback without code deployment (< 1min vs 30min deploy)
- **Velocity**: Ship features disabled, enable progressively (10x faster than big-bang deploys)
- **Experimentation**: A/B test everything → data-driven decisions (5-10% conversion improvements)
- **Operational Control**: Kill switches prevent cascading failures during incidents

**Engineering Productivity**:
- **Trunk-Based Development**: All code merged to main, no long-lived branches
- **Continuous Deployment**: Deploy 100x/day with confidence (features hidden behind flags)
- **Safe Refactoring**: Gradual migrations (old + new code coexist, toggle between them)

### How It Works (Technical Summary)

**1. Flag Definition**: Create flag with type (release/experiment/ops), default value, targeting rules

**2. Deployment**: Ship code with flag checks (`if (flag.enabled)`), disabled by default

**3. Evaluation**: Client/edge/server evaluates flag per user:
   - **Percentage**: Consistent hash determines if user in rollout (10% → hash < 10)
   - **Segment**: Check user attributes (premium, US, mobile)
   - **Schedule**: Time-based activation

**4. Progressive Rollout**:
   - 1% → Monitor metrics (errors, conversions)
   - 5% → Validate at scale
   - 25% → Broad exposure
   - 100% → Full rollout

**5. Monitoring**: Track flag evaluations, A/B test results, performance impact

**6. Cleanup**: After 2+ weeks at 100%, remove flag code, delete config

**FAANG-Level Expectation**:
- < 1ms flag evaluation latency
- < 10 API calls to fetch all flags (batch fetching)
- < 20 active release flags (aggressive cleanup)
- 100% rollout in < 7 days (gradual with monitoring)
- Instant rollback capability (< 1min to 0%)
