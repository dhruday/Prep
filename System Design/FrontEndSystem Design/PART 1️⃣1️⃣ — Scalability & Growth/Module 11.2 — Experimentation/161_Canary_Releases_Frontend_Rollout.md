# 161. Canary Releases & Frontend Rollout Strategies ★★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Canary releases** (also called progressive rollouts or percentage deployments) are a deployment strategy where a new version of the frontend is exposed to a small percentage of users first — the "canaries" — before rolling out to everyone. If the canary shows elevated error rates, performance regressions, or user complaints, you roll back to just the affected cohort with minimal blast radius. The frontend equivalent includes **feature flags** (runtime configuration that enables/disables features per user), **A/B testing** (split traffic to compare variants), **blue/green deployments** (two production environments, traffic switch via DNS or CDN), and **ring-based deployments** (internal → beta → GA rings). At SAP Labs, new micro-frontend versions in the SAP Launchpad were deployed to internal users (ring 0) before external customers, catching integration issues that unit tests missed. This approach is non-negotiable at Microsoft/Adobe/Salesforce scale where a bad deploy can impact millions of users.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Deployment Strategies Comparison

```
Blue/Green:
- Two identical environments: Blue (current prod) and Green (new version)
- Switch 100% traffic at once via DNS/load balancer
- Instant rollback: switch back to Blue
- Risk: 100% users hit the change simultaneously; need 2x infrastructure

Canary:
- Route N% of traffic to new version (e.g., 1% → 5% → 20% → 100%)
- Gradually increase percentage as confidence grows
- Automatic rollback if error rate exceeds threshold
- Risk: complexity of running multiple versions simultaneously

Rolling:
- Replace instances one by one (or batch by batch)
- Zero downtime, no extra infrastructure
- Risk: multiple versions live simultaneously (API compatibility matters)
- Common with Kubernetes deployments

Feature Flags (Runtime):
- All users get same deployed code; features hidden/shown by flag
- Decouple deploy from release — deploy code dark, flag-enable when ready
- Most sophisticated: user targeting, gradual rollout, instant kill switch
```

### Feature Flag Implementation

```typescript
// Feature flag service — integrates with LaunchDarkly, Unleash, or internal
interface FeatureFlag {
  key: string;
  enabled: boolean;
  percentage?: number;    // 0-100 for percentage rollout
  allowlist?: string[];   // Specific user IDs or groups
  metadata?: Record<string, unknown>;
}

class FeatureFlagService {
  private flags = new Map<string, FeatureFlag>();
  private userId: string;
  private userGroups: string[];
  
  constructor(userId: string, userGroups: string[]) {
    this.userId = userId;
    this.userGroups = userGroups;
  }
  
  async loadFlags(): Promise<void> {
    const response = await fetch('/api/feature-flags', {
      headers: { 'X-User-Id': this.userId },
    });
    const flags: FeatureFlag[] = await response.json();
    flags.forEach(flag => this.flags.set(flag.key, flag));
  }
  
  isEnabled(flagKey: string): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;  // Default: OFF for unknown flags
    if (!flag.enabled) return false;
    
    // Allowlist check (internal users, beta testers)
    if (flag.allowlist?.includes(this.userId)) return true;
    if (flag.allowlist?.some(group => this.userGroups.includes(group))) return true;
    
    // Percentage rollout: hash userId to ensure consistent assignment
    if (flag.percentage !== undefined) {
      const hash = this.stableHash(flagKey + this.userId);
      return (hash % 100) < flag.percentage;
    }
    
    return flag.enabled;
  }
  
  // Stable hash ensures same user always sees same flag state (no flicker)
  private stableHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash = hash & hash;  // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// React context for feature flags
const FeatureFlagContext = React.createContext<FeatureFlagService | null>(null);

function useFeatureFlag(flagKey: string): boolean {
  const service = useContext(FeatureFlagContext);
  if (!service) throw new Error('FeatureFlagProvider not found');
  return service.isEnabled(flagKey);
}
```

### Canary Routing via CDN (CloudFront/Fastly)

```typescript
// CDN Edge Worker (Cloudflare Workers / AWS Lambda@Edge)
// Route X% of traffic to canary origin based on cookie or random sampling

// The frontend doesn't need to know which version it's seeing —
// the CDN silently routes requests to v1 or v2 origin

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Read existing canary cookie for sticky sessions
  const cookies = parseCookies(request.headers.get('Cookie') ?? '');
  let isCanary = cookies['x-canary'] === 'true';
  
  // New users: assign to canary with 10% probability
  if (cookies['x-canary'] === undefined) {
    isCanary = Math.random() < 0.10;  // 10% canary cohort
  }
  
  // Route to appropriate origin
  const origin = isCanary
    ? 'https://canary.app.example.com'
    : 'https://prod.app.example.com';
  
  const upstreamRequest = new Request(origin + url.pathname + url.search, request);
  const response = await fetch(upstreamRequest);
  
  // Set sticky session cookie (30-day canary assignment)
  const mutableResponse = new Response(response.body, response);
  mutableResponse.headers.append(
    'Set-Cookie',
    `x-canary=${isCanary}; Max-Age=${30 * 24 * 3600}; SameSite=Lax; Secure; Path=/`
  );
  
  // Tag response for monitoring/analytics
  mutableResponse.headers.set('X-Canary-Version', isCanary ? 'v2' : 'v1');
  
  return mutableResponse;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
  );
}
```

### Automated Rollback Strategy

```typescript
// Monitor canary health — auto-rollback if error rate exceeds threshold
interface DeploymentMetrics {
  errorRate: number;     // Error % in last 5 minutes
  p95LatencyMs: number;  // 95th percentile response time  
  activeSessions: number;
}

class CanaryDeploymentController {
  private canaryPercentage = 1;  // Start at 1%
  private readonly ROLLOUT_STAGES = [1, 5, 20, 50, 100];
  private readonly ERROR_RATE_THRESHOLD = 0.02;   // 2% error rate triggers rollback
  private readonly LATENCY_THRESHOLD_MS = 3000;   // 3s P95 triggers rollback
  
  async runRollout(): Promise<void> {
    for (const targetPercentage of this.ROLLOUT_STAGES) {
      await this.setCanaryPercentage(targetPercentage);
      console.log(`Canary at ${targetPercentage}% — monitoring for 10 minutes...`);
      
      // Monitor for 10 minutes at each stage
      const healthy = await this.monitorForDuration(10 * 60 * 1000);
      
      if (!healthy) {
        console.error(`Health check failed at ${targetPercentage}% — initiating rollback`);
        await this.rollback();
        return;
      }
      
      console.log(`Stage ${targetPercentage}% healthy — proceeding`);
    }
    
    console.log('Full rollout complete');
  }
  
  private async monitorForDuration(durationMs: number): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < durationMs) {
      const metrics = await this.fetchCanaryMetrics();
      
      if (metrics.errorRate > this.ERROR_RATE_THRESHOLD) {
        console.error(`Error rate ${(metrics.errorRate * 100).toFixed(1)}% exceeds threshold`);
        return false;
      }
      
      if (metrics.p95LatencyMs > this.LATENCY_THRESHOLD_MS) {
        console.error(`P95 latency ${metrics.p95LatencyMs}ms exceeds threshold`);
        return false;
      }
      
      await sleep(30_000);  // Check every 30 seconds
    }
    
    return true;
  }
  
  private async setCanaryPercentage(pct: number): Promise<void> {
    await fetch('/api/deployments/canary-weight', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentage: pct }),
    });
    this.canaryPercentage = pct;
  }
  
  private async rollback(): Promise<void> {
    await this.setCanaryPercentage(0);
    await fetch('/api/deployments/rollback', { method: 'POST' });
    // Notify team via Slack/PagerDuty
    await this.sendAlert(`Canary rollback triggered at ${this.canaryPercentage}% — health check failed`);
  }
  
  private fetchCanaryMetrics(): Promise<DeploymentMetrics> {
    return fetch('/api/monitoring/canary-metrics').then(r => r.json());
  }
  
  private sendAlert(message: string): Promise<void> {
    return fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, severity: 'critical' }),
    }).then(() => undefined);
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

### Angular/React Feature Flag Components

```typescript
// React: Conditional rendering based on feature flags
function FeatureGate({
  flag,
  fallback,
  children,
}: {
  flag: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const enabled = useFeatureFlag(flag);
  return enabled ? <>{children}</> : <>{fallback ?? null}</>;
}

// Usage: New checkout flow behind flag
function CheckoutPage() {
  return (
    <FeatureGate
      flag="new-checkout-flow"
      fallback={<LegacyCheckout />}
    >
      <NewCheckout />
    </FeatureGate>
  );
}

// Angular: Feature flag directive
@Directive({ selector: '[featureFlag]', standalone: true })
export class FeatureFlagDirective implements OnInit {
  @Input({ required: true }) featureFlag!: string;
  
  constructor(
    private template: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private flagService: FeatureFlagService,
  ) {}
  
  ngOnInit(): void {
    if (this.flagService.isEnabled(this.featureFlag)) {
      this.viewContainer.createEmbeddedView(this.template);
    } else {
      this.viewContainer.clear();
    }
  }
}

// Usage in template:
// <new-dashboard *featureFlag="'new-dashboard-v2'" />
```

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Facebook/Meta:**
Meta famously deploys to 1% of users first, measures error rates, engagement, and performance, then progresses through rings. Their Gatekeeper system manages feature flags across 3B+ users, with each flag having fine-grained targeting (country, device, age group).

**Netflix:**
Netflix uses A/B testing for virtually every UI change — thumbnail sizes, button colors, onboarding flows. Their experimentation platform automatically routes cohorts and reports statistical significance. Canary deployments catch performance regressions (longer TTI impairs engagement).

**Spotify:**
Spotify's "feature toggles in production" approach: all code ships to all users, but features are dark (hidden). Internal teams are ring 0, Spotify employees are ring 1, beta users ring 2, GA ring 3. This was documented in their engineering blog as key to their 30-minute deploy cycle.

**Microsoft:**
Teams and Outlook use ring-based rollouts: Microsoft employees → Microsoft corporate users → targeted external users → general availability. Flagged feature can be instant-disabled for specific Azure tenants if a customer reports a bug.

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Canary releases and feature flags are two complementary tools. A canary deployment is an infrastructure-level strategy: you route X% of traffic to a new version of the application and monitor error rates and performance metrics before expanding. Feature flags are code-level: you deploy the same code everywhere but control which features are active per user cohort. I prefer feature flags for frontend work because they decouple deployment from release — you can merge code dark, deploy safely, then gradually enable. The key architectural requirement is consistent assignment: a given user should always see the same variant (using a stable hash of userId + flagKey), preventing the 'flickering' experience where a user sees different UIs between sessions. For rollback, feature flags win: instant disable with no re-deploy. For infrastructure-level changes (new deployment pipeline, new CDN routing), canary traffic splitting at the CDN edge via cookies or headers is the right level."

**Follow-up Questions:**
1. *How do you prevent flag proliferation?* → Enforce TTL on feature flags — each flag has a scheduled cleanup date; flags for shipped features are removed in the next sprint; dead code elimination.
2. *How do you ensure A/B tests are statistically valid?* → Minimum sample size before concluding (power analysis); consistent user assignment (bucketing by userId hash); avoid novelty effect (run for ≥2 weeks); use only one primary metric.
3. *What's the blast radius difference between flags and canary?* → Flag: change one flag = impacts only flag-enabled users; instant rollback. Canary: route X% to new version = X% of ALL traffic sees every change in the new version; more coarse-grained.

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE
────────────────────────────────────────────────────────────

```typescript
// Minimal feature flag hook with server-sent real-time updates
function useFeatureFlags(userId: string) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    // Initial load
    fetch(`/api/flags?userId=${userId}`)
      .then(r => r.json())
      .then(setFlags);
    
    // Real-time updates via SSE (if flag changes while user is online)
    const eventSource = new EventSource(`/api/flags/stream?userId=${userId}`);
    eventSource.onmessage = (e) => {
      const update: { key: string; enabled: boolean } = JSON.parse(e.data);
      setFlags(prev => ({ ...prev, [update.key]: update.enabled }));
    };
    
    return () => eventSource.close();
  }, [userId]);
  
  return {
    isEnabled: (key: string) => flags[key] ?? false,
    flags,
  };
}
```

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Three deployment patterns:**
1. **Blue/Green** = swap all traffic between two environments (instant, high risk if bug)
2. **Canary** = gradually route % traffic to new version (requires health monitoring)
3. **Feature Flags** = same code everywhere, feature on/off per user (most flexible)

**Canary stages:** 1% → 5% → 20% → 50% → 100% with health checks between each
**Flag consistency:** hash(userId + flagKey) % 100 → ensures same user always sees same variant

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ A bad deploy impacting 100% of users is an outage; impacting 1% is a canary — contained, low-stress
→ Feature flags enable "trunk-based development" — all engineers merge to main daily, no feature branches merging after weeks of divergence
→ Instant rollback of feature flags vs 20-minute re-deploy for infrastructure rollback

**How it works:**
→ CDN/load balancer routes X% traffic to new pod based on cookie or request hash
→ Feature flag service returns enabled/disabled per userId; frontend caches flags and evaluates locally
→ Monitoring compares error rates, latency, and business metrics between canary and baseline cohorts

**Company relevance:**
→ **Microsoft**: Azure DevOps Progressive Exposure (Ring 0/1/2/3) — used for Office 365 and Teams deployments
→ **Adobe**: Adobe I/O Feature Flags service used across Creative Cloud products for regional rollout control
→ **Salesforce**: Salesforce uses release trains + dark launches behind "perm flags" — features gated by org permission sets before GA
→ **Cisco**: Meraki dashboard uses canary deployments across their cloud-managed networking customer base to prevent service disruption
