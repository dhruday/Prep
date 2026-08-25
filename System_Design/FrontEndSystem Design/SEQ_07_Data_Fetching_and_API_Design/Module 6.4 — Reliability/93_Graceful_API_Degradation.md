# 93. Graceful API Degradation

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Graceful API degradation** is the design philosophy that a frontend application should never become completely unusable when one or more backend services fail — instead, it should progressively reduce functionality while keeping the core experience alive. It's the frontend equivalent of a restaurant continuing to serve drinks when the kitchen is closed: you're open, you're serving, and you're being honest about what's unavailable. This requires deliberate tiering of your application's features: must-have (core workflow), should-have (enrichment), nice-to-have (personalization). At senior level, graceful degradation is not an afterthought — it's a first-class architectural concern designed before writing the first API call.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Feature Tier Classification

Before you can degrade gracefully, you must classify your features:

```typescript
// Feature tier taxonomy
const FeatureTier = {
  CRITICAL: 'CRITICAL',    // App is unusable without this — never degrade, always show error
  CORE: 'CORE',            // Primary user workflow — degrade to cached/stub data
  ENRICHMENT: 'ENRICHMENT', // Improves the experience — hide gracefully if unavailable
  OPTIONAL: 'OPTIONAL',    // Personalisation, analytics, recommendations — silent fail
} as const;

type FeatureTier = typeof FeatureTier[keyof typeof FeatureTier];

// Example: E-commerce product page
const featureMap: Record<string, FeatureTier> = {
  'product-details': FeatureTier.CRITICAL,      // Can't shop without this
  'product-images': FeatureTier.CORE,           // Degrade to placeholder
  'inventory-status': FeatureTier.CORE,         // Show "Check with seller" if unavailable
  'recommendations': FeatureTier.ENRICHMENT,   // Hide "You may also like" section
  'reviews': FeatureTier.ENRICHMENT,            // Show "Reviews temporarily unavailable"
  'personalized-pricing': FeatureTier.OPTIONAL, // Show standard price silently
  'analytics-events': FeatureTier.OPTIONAL,    // Drop silently — loss OK
};
```

### Degradation Strategy Implementation

```typescript
interface DegradationStrategy<T> {
  primary: () => Promise<T>;
  fallbacks: Array<{
    name: string;
    execute: () => Promise<T>;
    tier: FeatureTier;
  }>;
  staleDataMaxAge?: number;  // ms — how stale is acceptable
}

class DegradationOrchestrator {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  
  async execute<T>(key: string, strategy: DegradationStrategy<T>): Promise<{
    data: T;
    source: 'live' | 'cache' | 'fallback' | 'default';
    isStale: boolean;
  }> {
    // 1. Try primary
    try {
      const data = await strategy.primary();
      this.cache.set(key, { data, timestamp: Date.now() });
      return { data, source: 'live', isStale: false };
    } catch (primaryError) {
      console.warn(`Primary source failed for ${key}:`, primaryError);
    }
    
    // 2. Try stale cache
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      const maxAge = strategy.staleDataMaxAge ?? Infinity;
      if (age < maxAge) {
        return { data: cached.data as T, source: 'cache', isStale: true };
      }
    }
    
    // 3. Try fallbacks in order
    for (const fallback of strategy.fallbacks) {
      try {
        const data = await fallback.execute();
        return { data, source: 'fallback', isStale: false };
      } catch (fallbackError) {
        console.warn(`Fallback ${fallback.name} failed:`, fallbackError);
      }
    }
    
    // 4. Nothing worked — throw to let circuit breaker / error boundary handle
    throw new AllSourcesFailedError(`All sources failed for ${key}`);
  }
}
```

### Parallel Degradation for Multi-Service Pages

Most real pages hit multiple APIs. Fail fast on any one of them shouldn't fail the page:

```typescript
// Dashboard pattern — each widget degrades independently
async function loadDashboard(userId: string) {
  const [userProfile, notifications, recentActivity, recommendations] = 
    await Promise.allSettled([
      fetchUserProfile(userId),
      fetchNotifications(userId),
      fetchRecentActivity(userId),
      fetchRecommendations(userId),
    ]);
  
  return {
    user: userProfile.status === 'fulfilled'
      ? userProfile.value
      : getCachedUser(userId) ?? guestUser,
    
    notifications: notifications.status === 'fulfilled'
      ? notifications.value
      : [],  // Empty list is valid degraded state — no error shown
    
    recentActivity: recentActivity.status === 'fulfilled'
      ? recentActivity.value
      : null,  // null triggers "Recently viewed temporarily unavailable" UI
    
    recommendations: recommendations.status === 'fulfilled'
      ? recommendations.value
      : null,  // null hides the section entirely — OPTIONAL tier
  };
}
```

### UI Degradation Patterns

```typescript
// Component reflects degradation state cleanly
interface DegradedSectionProps {
  data: unknown | null;
  isStale: boolean;
  tier: FeatureTier;
  children: (data: NonNullable<typeof data>) => React.ReactNode;
}

function DegradedSection({ data, isStale, tier, children }: DegradedSectionProps) {
  if (data === null) {
    // OPTIONAL tier: hide completely, no noise
    if (tier === 'OPTIONAL') return null;
    
    // ENRICHMENT: friendly notice
    if (tier === 'ENRICHMENT') {
      return (
        <div className="section-unavailable" role="region" aria-live="polite">
          <span>This section is temporarily unavailable</span>
        </div>
      );
    }
    
    // CORE: stale placeholder
    return <CorePlaceholder tier={tier} />;
  }
  
  return (
    <>
      {isStale && (
        <div role="status" className="stale-banner">
          Showing saved data · <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      )}
      {children(data)}
    </>
  );
}
```

### Network Condition Awareness

```typescript
// Adaptive degradation based on connection quality
function useAdaptiveFetching() {
  const connection = (navigator as any).connection;
  
  const tier = useMemo(() => {
    if (!connection) return 'full';
    if (connection.saveData) return 'minimal';        // Data saver mode
    if (connection.effectiveType === 'slow-2g') return 'minimal';
    if (connection.effectiveType === '2g') return 'reduced';
    if (connection.effectiveType === '3g') return 'standard';
    return 'full';
  }, [connection?.effectiveType, connection?.saveData]);
  
  return tier;
}

// Usage: only fetch recommendations on full connections
function ProductPage() {
  const fetchTier = useAdaptiveFetching();
  const showRecommendations = fetchTier === 'full';
  // ...
}
```

### Anti-Patterns

- **Showing error modals for OPTIONAL features**: analytics failures should be absolutely silent
- **Cascading degradation**: one failure shouldn't cause unrelated features to degrade (bulkhead them)
- **Stale data without staleness indicators**: users make decisions on data — they must know if it's stale
- **Degrading AUTH flows**: authentication is always CRITICAL — use a proper fallback (offline login cache) or hard fail
- **Silent CORE degradation**: users MUST know when core workflow data is stale/unavailable

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Gmail Offline Mode:**
- CRITICAL: compose/read emails → localStorage cache
- CORE: send email → queue in IndexedDB, send when back online
- ENRICHMENT: search → only recent cached emails
- OPTIONAL: smart reply suggestions → hidden when offline

**Salesforce Sales Cloud:**
- Account record fields: CRITICAL — always cached
- Activity timeline: CORE — stale cache with banner
- Einstein AI insights: OPTIONAL — hidden without notice
- News feed widget: ENRICHMENT — "Unable to load news at this time"

**SAP Fiori (your experience):**
- Each SAP module is a separate MFE. If the Analytics module fails, the Sales module is unaffected. Degradation is built into the micro-frontend boundary itself.

**Scaling:**
- 1,000 users: degradation is polish
- 100,000 users: a 5-minute API outage without degradation = 500,000 frustrated sessions
- 10M users: every API has SLA < 100%; designing for degradation is designing for reality

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Graceful degradation is about making deliberate, upfront decisions about which features are critical, core, enrichment, or optional — and coding the degradation path for each before the primary path. I classify every API call by tier during feature design. For OPTIONAL features, I silently fail. For ENRICHMENT, I show a friendly notice. For CORE, I serve stale cache data with a staleness indicator. For CRITICAL features, I never degrade — I use the circuit breaker + error boundary to show a clear actionable error. I also use `Promise.allSettled` for parallel page loads so a slow recommendations API doesn't block the critical product data. At SAP, the micro-frontend architecture gave us this for free at the boundary level — an entire module could fail while the shell and other modules remained fully operational."

**Likely Follow-up Questions:**
1. *How do you handle partial data from a partially failing API?* → At the field level, use optional chaining + fallbacks; show what you have
2. *How is this different from error boundaries?* → Error boundaries catch render errors; degradation handles fetch failures before render
3. *How do you communicate degradation to the user without alarming them?* → "Showing saved data" for stale; hide completely for optional; "temporarily unavailable" for enrichment
4. *What's your testing strategy for degradation paths?* → Mock APIs to return 500s in tests; every degraded state should have a snapshot test
5. *How do you handle degradation in a micro-frontend architecture?* → Each MFE has its own degradation strategy; the shell renders the MFE or a fallback slot

**Comparison With Alternatives:**

| Approach | User impact | Server protection | Complexity |
|---|---|---|---|
| Hard fail (error page) | High — all users affected | Low — retries still happen | Low |
| Retry loop | Medium — delay | Low — amplifies load | Low |
| Graceful degradation | Low — reduced features | High — fewer requests | Medium |
| Full offline support | Minimal | Maximum | High |

---

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (React Error Boundary + Degradation)
────────────────────────────────────────────────────────────

```typescript
// Widget-level error boundary with degradation slot
class DegradableWidget extends React.Component<{
  fallback: React.ReactNode;
  tier: FeatureTier;
  children: React.ReactNode;
}, { hasError: boolean }> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Always log — even optional features failing is signal
    errorTracker.capture(error, { extra: { tier: this.props.tier, componentStack: info.componentStack } });
  }
  
  render() {
    if (this.state.hasError) {
      if (this.props.tier === 'OPTIONAL') return null;
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Usage
<DegradableWidget tier="ENRICHMENT" fallback={<RecommendationsUnavailable />}>
  <RecommendationsPanel userId={userId} />
</DegradableWidget>
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**The Restaurant Rule:** A restaurant doesn't close when the kitchen is slow — they tell you there's a wait, offer drinks, and seat you. Tier your features: **CRITICAL** = you ARE the food; **CORE** = keep them seated; **ENRICHMENT** = the appetizer; **OPTIONAL** = the mints.

**`Promise.allSettled` is the key primitive** — never `Promise.all` for multi-widget pages.

**If you go blank:** "Classify every API by tier: critical/core/enrichment/optional. Degrade each tier differently. Use `Promise.allSettled` so widgets fail independently. Always show staleness indicators when serving cache."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **UX**: Partial functionality beats a white page — users can still complete their primary goal
→ **Reliability**: 99.9% uptime requires 100% of your APIs to have 99.9% uptime — statistically improbable; degradation is the only realistic path
→ **Business**: Lost sessions during outages cost money; degraded sessions have a completion rate

**How it works:**
→ Each API call has a classified tier. Primary call fails → try stale cache → try fallback → render degraded UI. `Promise.allSettled` ensures parallel calls don't block each other. UI renders available data immediately, fills in enrichments as they arrive.

**Company relevance:**
→ **Salesforce**: CRM pages hit 10+ APIs — user, account, activity, AI, news. Must work when any subset fails
→ **Adobe**: Creative Cloud has identity, storage, library, preferences services — core editing must work when preferences service is down
→ **Microsoft**: Azure Portal shows "Service health" inline for degraded widgets — the same pattern
→ **Cisco**: Network dashboard must show last-known topology when live data is unavailable — stale + degraded is infinitely better than blank
