# 123. Progressive Rollouts

## 1. High-Level Explanation (Frontend Interview Level)

**Progressive Rollouts** (also called gradual rollouts or phased deployments) is the practice of releasing new features or code changes incrementally to subsets of users, allowing teams to validate changes in production with minimal risk before full deployment.

- **What**: Deploying features to 1% → 5% → 25% → 50% → 100% of users over hours/days, with rollback capability at each stage
- **Why**: Minimize blast radius of bugs, validate performance in production, gather real user feedback, enable safe experimentation
- **When**: Essential for large-scale deployments, risky changes, new features, infrastructure updates, A/B tests
- **Role**: Deployment strategy affecting CI/CD pipelines, feature flags, monitoring, rollback procedures

**Key Principle**: "Deploy slowly, rollback fast"—incremental rollout reduces risk, but instant rollback protects users.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Rollout Strategies

**1. Percentage-Based Rollout**

**Gradual Traffic Shift**:
```javascript
// Feature flag with percentage rollout
class ProgressiveRollout {
  constructor(featureName, rolloutPercentage) {
    this.featureName = featureName;
    this.rolloutPercentage = rolloutPercentage; // 0-100
  }
  
  isEnabled(userId) {
    // Consistent hashing ensures same user always gets same variant
    const hash = this.hashUserId(userId);
    const bucket = hash % 100;
    
    return bucket < this.rolloutPercentage;
  }
  
  hashUserId(userId) {
    // Simple hash function (use better in production)
    let hash = 0;
    const str = `${this.featureName}:${userId}`;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }
}

// Usage
const newCheckoutRollout = new ProgressiveRollout('new-checkout', 5); // 5% rollout

function renderCheckout(userId) {
  if (newCheckoutRollout.isEnabled(userId)) {
    return <NewCheckout />;
  } else {
    return <OldCheckout />;
  }
}
```

**Automated Rollout Schedule**:
```javascript
// Automated gradual rollout with monitoring
class AutomatedRollout {
  constructor(featureName, schedule) {
    this.featureName = featureName;
    this.schedule = schedule; // [ {percentage: 1, duration: 3600}, ... ]
    this.currentStage = 0;
    this.startTime = Date.now();
  }
  
  async start() {
    for (const stage of this.schedule) {
      console.log(`Rolling out to ${stage.percentage}%`);
      
      // Update feature flag
      await this.updateRolloutPercentage(stage.percentage);
      
      // Wait for duration
      await this.sleep(stage.duration * 1000);
      
      // Check health metrics
      const healthy = await this.checkHealthMetrics();
      
      if (!healthy) {
        console.error('Health check failed, rolling back');
        await this.rollback();
        return false;
      }
      
      this.currentStage++;
    }
    
    console.log('Rollout complete: 100%');
    return true;
  }
  
  async checkHealthMetrics() {
    const metrics = await getMetrics(this.featureName);
    
    // Check error rate, latency, conversion
    const healthy = 
      metrics.errorRate < 0.01 &&       // < 1% errors
      metrics.p95Latency < 2000 &&      // < 2s p95
      metrics.conversionRate > 0.02;    // > 2% conversion
    
    return healthy;
  }
  
  async rollback() {
    await this.updateRolloutPercentage(0);
    
    sendAlert({
      severity: 'HIGH',
      message: `Rollout for ${this.featureName} rolled back at stage ${this.currentStage}`
    });
  }
}

// Usage: Roll out over 24 hours
const rollout = new AutomatedRollout('new-dashboard', [
  { percentage: 1, duration: 3600 },    // 1% for 1 hour
  { percentage: 5, duration: 7200 },    // 5% for 2 hours
  { percentage: 25, duration: 14400 },  // 25% for 4 hours
  { percentage: 50, duration: 14400 },  // 50% for 4 hours
  { percentage: 100, duration: 0 }      // 100%
]);

await rollout.start();
```

**2. Canary Deployment**

**Kubernetes Canary with Istio**:
```yaml
# Canary deployment: 95% old, 5% new
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: frontend-service
spec:
  hosts:
  - frontend.example.com
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: frontend
        subset: v2  # Canary version
      weight: 100
  - route:
    - destination:
        host: frontend
        subset: v1  # Stable version
      weight: 95
    - destination:
        host: frontend
        subset: v2  # Canary version
      weight: 5
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: frontend
spec:
  host: frontend
  subsets:
  - name: v1
    labels:
      version: v1.0.0
  - name: v2
    labels:
      version: v2.0.0
```

**Automated Canary Analysis**:
```javascript
// Flagger automated canary promotion
const canaryConfig = {
  targetRef: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    name: 'frontend'
  },
  
  service: {
    port: 80
  },
  
  analysis: {
    interval: '1m',
    threshold: 5,  // Max failed checks before rollback
    maxWeight: 50, // Max traffic to canary
    stepWeight: 5, // Traffic increment per step
    
    metrics: [
      {
        name: 'request-success-rate',
        thresholdRange: { min: 99 },  // >= 99% success
        interval: '1m'
      },
      {
        name: 'request-duration',
        thresholdRange: { max: 500 }, // <= 500ms
        interval: '1m'
      }
    ]
  }
};

// Flagger automatically:
// 1. Deploys canary (v2) alongside stable (v1)
// 2. Gradually shifts traffic: 5% → 10% → 15% → ... → 50%
// 3. Monitors metrics at each step
// 4. Promotes to 100% if healthy, or rolls back if unhealthy
```

**3. Blue-Green Deployment**

**Zero-Downtime Switch**:
```javascript
// Blue (current) and Green (new) environments
const environments = {
  blue: {
    version: 'v1.0.0',
    url: 'https://blue.example.com',
    active: true
  },
  
  green: {
    version: 'v2.0.0',
    url: 'https://green.example.com',
    active: false
  }
};

// Switch traffic from blue to green
async function switchToGreen() {
  // 1. Deploy new version to green environment
  await deployToEnvironment('green', 'v2.0.0');
  
  // 2. Run smoke tests on green
  const greenHealthy = await runSmokeTests(environments.green.url);
  
  if (!greenHealthy) {
    console.error('Green environment unhealthy, aborting switch');
    return false;
  }
  
  // 3. Switch load balancer to green
  await updateLoadBalancer({
    primary: 'green',
    backup: 'blue' // Keep blue for instant rollback
  });
  
  // 4. Monitor green for 1 hour
  await sleep(3600000);
  
  const metricsOK = await checkMetrics('green');
  
  if (!metricsOK) {
    console.error('Green metrics degraded, rolling back to blue');
    await updateLoadBalancer({ primary: 'blue' });
    return false;
  }
  
  // 5. Decommission blue
  console.log('Green deployment successful, decommissioning blue');
  await decommissionEnvironment('blue');
  
  return true;
}
```

**AWS CodeDeploy Blue-Green**:
```javascript
const codeDeployConfig = {
  applicationName: 'frontend-app',
  deploymentGroupName: 'production',
  
  deploymentConfigName: 'CodeDeployDefault.AllAtOnce', // or .HalfAtATime, .OneAtATime
  
  blueGreenDeploymentConfiguration: {
    terminateBlueInstancesOnDeploymentSuccess: {
      action: 'TERMINATE',
      terminationWaitTimeInMinutes: 60 // Keep blue for 1 hour
    },
    
    deploymentReadyOption: {
      actionOnTimeout: 'STOP_DEPLOYMENT', // Wait for manual approval
      waitTimeInMinutes: 10
    },
    
    greenFleetProvisioningOption: {
      action: 'COPY_AUTO_SCALING_GROUP' // Clone blue's ASG
    }
  }
};
```

**4. Ring Deployment**

**Progressive Rings** (Microsoft's approach):
```javascript
// Deploy in concentric rings
const deploymentRings = [
  {
    name: 'ring-0',
    description: 'Internal employees',
    users: ['employee-*'],
    percentage: 100, // All employees
    monitoring: 'intensive'
  },
  
  {
    name: 'ring-1',
    description: 'Early adopters',
    users: ['beta-tester-*'],
    percentage: 100,
    monitoring: 'intensive',
    waitTime: 86400 // 24 hours after ring-0
  },
  
  {
    name: 'ring-2',
    description: 'General availability (10%)',
    percentage: 10,
    monitoring: 'normal',
    waitTime: 172800 // 48 hours after ring-1
  },
  
  {
    name: 'ring-3',
    description: 'General availability (100%)',
    percentage: 100,
    monitoring: 'normal',
    waitTime: 259200 // 72 hours after ring-2
  }
];

function isFeatureEnabled(userId, featureName) {
  const currentRing = getCurrentRing(featureName);
  
  // Check if user is in this ring
  for (const ring of deploymentRings.slice(0, currentRing + 1)) {
    if (matchesRingCriteria(userId, ring)) {
      return true;
    }
  }
  
  return false;
}
```

### Monitoring & Rollback

**1. Real-Time Metrics Dashboard**:
```javascript
// Track metrics during rollout
class RolloutMonitor {
  constructor(featureName) {
    this.featureName = featureName;
    this.baseline = null;
  }
  
  async captureBaseline() {
    // Capture metrics before rollout
    this.baseline = await getMetrics({
      feature: this.featureName,
      timeRange: 3600 // Last hour
    });
  }
  
  async compareWithBaseline() {
    const current = await getMetrics({
      feature: this.featureName,
      timeRange: 300 // Last 5 minutes
    });
    
    const comparison = {
      errorRate: {
        baseline: this.baseline.errorRate,
        current: current.errorRate,
        change: ((current.errorRate - this.baseline.errorRate) / this.baseline.errorRate) * 100
      },
      
      latencyP95: {
        baseline: this.baseline.latencyP95,
        current: current.latencyP95,
        change: ((current.latencyP95 - this.baseline.latencyP95) / this.baseline.latencyP95) * 100
      },
      
      conversionRate: {
        baseline: this.baseline.conversionRate,
        current: current.conversionRate,
        change: ((current.conversionRate - this.baseline.conversionRate) / this.baseline.conversionRate) * 100
      }
    };
    
    // Alert thresholds
    const alerts = [];
    
    if (comparison.errorRate.change > 50) { // 50% increase in errors
      alerts.push({
        severity: 'CRITICAL',
        metric: 'errorRate',
        message: `Error rate increased by ${comparison.errorRate.change.toFixed(1)}%`
      });
    }
    
    if (comparison.latencyP95.change > 25) { // 25% increase in latency
      alerts.push({
        severity: 'HIGH',
        metric: 'latencyP95',
        message: `P95 latency increased by ${comparison.latencyP95.change.toFixed(1)}%`
      });
    }
    
    if (comparison.conversionRate.change < -10) { // 10% drop in conversion
      alerts.push({
        severity: 'HIGH',
        metric: 'conversionRate',
        message: `Conversion rate dropped by ${Math.abs(comparison.conversionRate.change).toFixed(1)}%`
      });
    }
    
    return { comparison, alerts };
  }
}
```

**2. Automated Rollback**:
```javascript
// Automatic rollback on critical metrics
class AutoRollback {
  constructor(featureName, thresholds) {
    this.featureName = featureName;
    this.thresholds = thresholds;
    this.monitoring = true;
  }
  
  async startMonitoring() {
    while (this.monitoring) {
      const metrics = await getMetrics(this.featureName);
      
      // Check thresholds
      if (metrics.errorRate > this.thresholds.maxErrorRate) {
        await this.triggerRollback('Error rate exceeded threshold');
        break;
      }
      
      if (metrics.latencyP95 > this.thresholds.maxLatency) {
        await this.triggerRollback('Latency exceeded threshold');
        break;
      }
      
      // Check every 30 seconds
      await sleep(30000);
    }
  }
  
  async triggerRollback(reason) {
    console.error(`ROLLBACK TRIGGERED: ${reason}`);
    
    // Disable feature immediately
    await setFeatureFlag(this.featureName, 0); // 0% rollout
    
    // Alert team
    await sendAlert({
      severity: 'CRITICAL',
      message: `Auto-rollback: ${this.featureName} - ${reason}`,
      runbook: 'https://wiki.example.com/rollback-procedures'
    });
    
    // Log incident
    await logIncident({
      feature: this.featureName,
      reason,
      timestamp: new Date().toISOString(),
      metrics: await getMetrics(this.featureName)
    });
    
    this.monitoring = false;
  }
  
  stopMonitoring() {
    this.monitoring = false;
  }
}

// Usage
const rollback = new AutoRollback('new-checkout', {
  maxErrorRate: 0.05,  // 5% errors
  maxLatency: 3000     // 3s p95
});

rollback.startMonitoring();
```

### Feature Flag Management

**LaunchDarkly-Style SDK**:
```typescript
// Feature flag client
class FeatureFlagClient {
  private flags: Map<string, FeatureFlag> = new Map();
  
  async initialize(apiKey: string) {
    // Fetch flags from server
    const response = await fetch('https://api.flags.example.com/sdk/flags', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const flags = await response.json();
    
    flags.forEach((flag: FeatureFlag) => {
      this.flags.set(flag.key, flag);
    });
    
    // Subscribe to real-time updates (SSE)
    this.subscribeToUpdates(apiKey);
  }
  
  variation(flagKey: string, user: User, defaultValue: any): any {
    const flag = this.flags.get(flagKey);
    
    if (!flag || !flag.on) {
      return defaultValue;
    }
    
    // Evaluate targeting rules
    for (const rule of flag.rules) {
      if (this.matchesRule(user, rule)) {
        return this.getVariation(flag, rule.variation);
      }
    }
    
    // Fallback to percentage rollout
    return this.getPercentageVariation(flag, user, defaultValue);
  }
  
  private getPercentageVariation(flag: FeatureFlag, user: User, defaultValue: any): any {
    const percentage = flag.rolloutPercentage || 0;
    const hash = this.hashUser(user.id, flag.key);
    const bucket = hash % 100;
    
    if (bucket < percentage) {
      return this.getVariation(flag, flag.variations[0]);
    }
    
    return defaultValue;
  }
  
  private subscribeToUpdates(apiKey: string) {
    const eventSource = new EventSource(`https://api.flags.example.com/stream?apiKey=${apiKey}`);
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      if (update.type === 'flag-update') {
        this.flags.set(update.flag.key, update.flag);
        console.log(`Flag updated: ${update.flag.key}`);
      }
    };
  }
}

// Usage
const flags = new FeatureFlagClient();
await flags.initialize('sdk-key-12345');

// In component
const showNewFeature = flags.variation('new-feature', currentUser, false);
```

### What NOT to Do

- ❌ **Deploy to 100% immediately** (no safety net)
- ❌ **No monitoring during rollout** (can't detect issues)
- ❌ **Manual rollout process** (slow, error-prone)
- ❌ **No rollback plan** (stuck with broken feature)
- ❌ **Ignore baseline metrics** (can't measure impact)

---

## 3. Clear Real-World Examples

### Example 1: Facebook's Gatekeeper

**Gradual Rollout at Scale**:
```javascript
// Facebook deploys features gradually to billions
const facebookRollout = {
  // Phase 1: Employees (1 day)
  phase1: {
    target: 'employees',
    percentage: 100,
    duration: 86400
  },
  
  // Phase 2: 1% users (2 days)
  phase2: {
    target: 'users',
    percentage: 1,
    duration: 172800
  },
  
  // Phase 3: 10% users (3 days)
  phase3: {
    target: 'users',
    percentage: 10,
    duration: 259200
  },
  
  // Phase 4: 100% users
  phase4: {
    target: 'users',
    percentage: 100
  }
};

// Example: News Feed ranking algorithm change
// Rolled out over 2 weeks, monitored for:
// - User engagement (likes, comments, shares)
// - Session time
// - Error rates
// - Server load
```

### Example 2: Netflix A/B Testing Platform

**Controlled Rollout with Experimentation**:
```javascript
// Netflix runs 100+ experiments simultaneously
const netflixExperiment = {
  name: 'autoplay-preview',
  hypothesis: 'Autoplay previews increase engagement',
  
  variants: {
    control: { 
      autoplay: false,
      percentage: 50 
    },
    treatment: { 
      autoplay: true,
      percentage: 50 
    }
  },
  
  metrics: {
    primary: 'playback_starts',
    secondary: ['session_time', 'retention_rate']
  },
  
  // Sample size: 1M users
  sampleSize: 1000000,
  
  // Run for 2 weeks
  duration: 1209600,
  
  // Auto-promote winner
  autoPromote: true,
  threshold: 0.05 // 5% significance
};

// After experiment: autoplay increased playback by 3%
// Rolled out to 100% over 1 week
```

### Example 3: Chrome Browser Updates

**Ring Deployment for Global Product**:
```javascript
// Chrome updates deployed in stages
const chromeRollout = {
  // Ring 0: Canary channel (1-2% users, daily updates)
  canary: {
    percentage: 1,
    updateFrequency: 'daily',
    users: 'early-adopters'
  },
  
  // Ring 1: Dev channel (10% users, weekly updates)
  dev: {
    percentage: 10,
    updateFrequency: 'weekly',
    users: 'developers'
  },
  
  // Ring 2: Beta channel (25% users, 4-week cycle)
  beta: {
    percentage: 25,
    updateFrequency: 'monthly',
    users: 'beta-testers'
  },
  
  // Ring 3: Stable channel (100% users, 6-week cycle)
  stable: {
    percentage: 100,
    updateFrequency: '6-weeks',
    users: 'all'
  }
};

// Takes ~3 months from canary to stable
// Catches 99% of bugs before stable release
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you safely deploy a major UI redesign to millions of users?"

**Answer**:

"I'd use **progressive rollout with feature flags** and automated monitoring:

**1. Feature Flag Setup**:

Wrap new UI in feature flag:
```jsx
function Dashboard() {
  const newUI = useFeatureFlag('redesign-dashboard', user.id);
  
  return newUI ? <NewDashboard /> : <OldDashboard />;
}
```

**2. Rollout Schedule**:

**Week 1**: Deploy to internal employees (100% of employees)
- Gather feedback, fix obvious bugs
- Employees test all features

**Week 2**: 1% of users (consistent hashing for stable assignment)
- Monitor error rates, latency, user engagement
- Capture baseline metrics from old UI for comparison

**Week 3**: 5% of users (if metrics healthy)
- Check for regression: error rate, conversion, session time

**Week 4**: 25% of users
- Larger scale reveals performance issues

**Week 5**: 50% of users
- Final validation before full rollout

**Week 6**: 100% of users
- Remove old UI code in following release

**3. Monitoring**:

Track key metrics during rollout:
- **Error rate**: Must stay < 0.5%
- **Page load time**: Must stay < 2s p95
- **Conversion rate**: Must not drop > 5%
- **User feedback**: NPS score, support tickets

Dashboard compares new vs old UI in real-time.

**4. Automated Rollback**:

If error rate > 1% or conversion drops > 10%, **automatically rollback** to 0%:
```javascript
if (errorRate > 0.01 || conversionDrop > 0.10) {
  await setFeatureFlag('redesign-dashboard', 0);
  sendAlert('ROLLBACK: Dashboard redesign');
}
```

**5. A/B Testing**:

Run controlled experiment during 5% rollout:
- 2.5% get new UI, 2.5% get old UI (control)
- Measure statistical significance (p < 0.05)
- Validate hypothesis: new UI improves engagement

**6. Canary Deployment** (infrastructure):

Deploy new version to:
- 5% of servers initially
- Monitor CPU, memory, error logs
- Gradually increase to 100% over 6 hours

Use **Kubernetes** with Istio for traffic splitting.

**7. Rollback Plan**:

Keep old UI code for 30 days post-launch. If critical bug found, instant rollback via feature flag (< 1 minute).

**Trade-offs**:

Progressive rollout takes weeks (vs instant deploy). But drastically reduces risk—catch issues affecting 1% instead of 100%.

**Real-World**:
- **Facebook**: Gatekeeper rolls out features over 2-4 weeks
- **Netflix**: 100+ A/B tests running simultaneously, auto-promote winners
- **Chrome**: 3-month rollout (Canary → Dev → Beta → Stable)
- **Amazon**: Deploys every 11.6 seconds with automated rollback

For major redesign affecting millions, I'd take 6 weeks for full rollout. Safety > speed."

---

## 6. Why & How Summary

### Why It Matters

**Risk Mitigation**: Catch bugs affecting 1% instead of 100% of users  
**Confidence**: Validate in production before full rollout  
**Experimentation**: Measure real user impact with A/B tests

### How It Works

**1. Feature Flag**: Wrap feature, control with flag  
**2. Gradual**: 1% → 5% → 25% → 50% → 100%  
**3. Monitor**: Error rate, latency, conversion at each stage  
**4. Automate**: Auto-rollback on threshold breach  
**5. Compare**: Baseline metrics to detect regression  
**6. Rollback**: Instant disable via flag (< 1 min)

**FAANG**: 6-week rollout cycles, automated monitoring, auto-rollback, < 1 min rollback time, A/B testing integrated
