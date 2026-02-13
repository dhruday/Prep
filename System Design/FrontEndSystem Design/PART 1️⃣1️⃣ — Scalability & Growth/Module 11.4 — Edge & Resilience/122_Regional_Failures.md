# 122. Regional Failures

## 1. High-Level Explanation (Frontend Interview Level)

**Regional Failures** refers to handling scenarios where an entire geographic region (data center, CDN node, cloud availability zone) becomes unavailable due to network outages, natural disasters, infrastructure failures, or other disruptions—requiring automatic failover and graceful degradation.

- **What**: Detecting, responding to, and recovering from complete regional outages with automatic failover, circuit breakers, graceful degradation, and disaster recovery
- **Why**: Ensure application availability despite regional disasters, meet SLA commitments (99.99%+ uptime), protect revenue during outages
- **When**: Critical for globally distributed apps, mission-critical systems, high-availability requirements, regulatory compliance
- **Role**: Architecture patterns for resilience, redundancy, failover automation, disaster recovery planning

**Key Principle**: "Expect failure, design for resilience"—assume any region can fail at any time and architect accordingly.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Multi-Region Failover Patterns

**1. Active-Active (Multi-Master)**

**Both regions serve traffic simultaneously**:
```javascript
// Route 53 weighted routing (50/50 split)
const activeActiveConfig = {
  'us-east-1': {
    weight: 50,
    healthCheck: 'us-east-health',
    endpoints: ['lb1.us-east.example.com', 'lb2.us-east.example.com']
  },
  
  'eu-west-1': {
    weight: 50,
    healthCheck: 'eu-west-health',
    endpoints: ['lb1.eu-west.example.com', 'lb2.eu-west.example.com']
  }
};

// If one region fails, 100% traffic to healthy region
function calculateWeights(regions) {
  const healthy = regions.filter(r => r.healthCheck.status === 'healthy');
  
  if (healthy.length === 0) {
    throw new Error('All regions unhealthy');
  }
  
  const weightPerRegion = 100 / healthy.length;
  
  return healthy.map(r => ({
    ...r,
    weight: weightPerRegion
  }));
}
```

**Pros**: Load distribution, no idle resources, instant failover  
**Cons**: Complex data sync, eventual consistency, higher cost

**2. Active-Passive (Hot Standby)**

**Primary region serves traffic, secondary on standby**:
```javascript
// Route 53 failover routing
const activePassiveConfig = {
  primary: {
    region: 'us-east-1',
    priority: 1,
    healthCheck: 'us-east-health',
    endpoint: 'api.example.com'
  },
  
  secondary: {
    region: 'eu-west-1',
    priority: 2, // Only used if primary fails
    healthCheck: 'eu-west-health',
    endpoint: 'api-backup.example.com'
  }
};

// Automatic failover on health check failure
function checkFailoverStatus() {
  if (!primaryHealthCheck.isHealthy()) {
    console.log('Primary region failed, failing over to secondary');
    updateDNS('api.example.com', secondaryEndpoint);
    
    // Notify ops team
    sendAlert({
      severity: 'CRITICAL',
      message: 'Regional failover triggered: US-East → EU-West'
    });
  }
}
```

**Pros**: Simple, lower cost (passive idle), predictable  
**Cons**: Wasted capacity, failover delay (30-60s DNS TTL), cold start issues

**3. Multi-CDN Failover**

**Switch between CDN providers on failure**:
```javascript
// Primary: Cloudflare, Fallback: Fastly
const multiCDNConfig = {
  primary: {
    provider: 'cloudflare',
    cname: 'example.cdn.cloudflare.net',
    healthCheck: 'https://example.cdn.cloudflare.net/health'
  },
  
  secondary: {
    provider: 'fastly',
    cname: 'example.fastly.net',
    healthCheck: 'https://example.fastly.net/health'
  }
};

// Client-side CDN failover
class CDNFailover {
  constructor(config) {
    this.config = config;
    this.currentCDN = config.primary;
  }
  
  async fetchWithFailover(url) {
    try {
      const response = await fetch(
        url.replace('{cdn}', this.currentCDN.cname),
        { timeout: 5000 }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.warn(`Primary CDN failed: ${error.message}`);
      
      // Try secondary CDN
      this.currentCDN = this.config.secondary;
      
      return fetch(
        url.replace('{cdn}', this.currentCDN.cname),
        { timeout: 5000 }
      );
    }
  }
}

// Usage
const cdn = new CDNFailover(multiCDNConfig);
const data = await cdn.fetchWithFailover('https://{cdn}/api/products');
```

### Health Checks & Circuit Breakers

**1. Health Check Implementation**:
```typescript
// Comprehensive health check endpoint
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    s3: boolean;
    externalAPI: boolean;
  };
  latency: {
    database: number; // ms
    redis: number;
    s3: number;
  };
  timestamp: string;
}

async function healthCheck(): Promise<HealthCheckResult> {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkS3(),
    checkExternalAPI()
  ]);
  
  const results = {
    database: checks[0].status === 'fulfilled',
    redis: checks[1].status === 'fulfilled',
    s3: checks[2].status === 'fulfilled',
    externalAPI: checks[3].status === 'fulfilled'
  };
  
  // Determine overall status
  const criticalFailed = !results.database || !results.redis;
  const anyFailed = Object.values(results).some(r => !r);
  
  const status = criticalFailed 
    ? 'unhealthy' 
    : anyFailed 
      ? 'degraded' 
      : 'healthy';
  
  return {
    status,
    checks: results,
    latency: {
      database: checks[0].status === 'fulfilled' ? checks[0].value : -1,
      redis: checks[1].status === 'fulfilled' ? checks[1].value : -1,
      s3: checks[2].status === 'fulfilled' ? checks[2].value : -1
    },
    timestamp: new Date().toISOString()
  };
}

async function checkDatabase(): Promise<number> {
  const start = Date.now();
  await db.query('SELECT 1');
  return Date.now() - start;
}
```

**Route 53 Health Check Configuration**:
```javascript
const healthCheckConfig = {
  type: 'HTTPS',
  resourcePath: '/health',
  port: 443,
  requestInterval: 30, // seconds
  failureThreshold: 3, // consecutive failures
  measureLatency: true,
  
  // Alert on failure
  alarmActions: ['arn:aws:sns:us-east-1:123456789:ops-alerts']
};
```

**2. Circuit Breaker Pattern**:
```typescript
// Circuit breaker for external API calls
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number = 0;
  
  constructor(
    private threshold: number = 5,      // Failures to open
    private timeout: number = 60000,    // Reset timeout (ms)
    private halfOpenRequests: number = 3 // Test requests
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout elapsed
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker OPEN: service unavailable');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      // If enough successes, close circuit
      if (this.successCount >= this.halfOpenRequests) {
        this.state = CircuitState.CLOSED;
        console.log('Circuit breaker CLOSED: service recovered');
      }
    }
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
      console.error(`Circuit breaker OPEN: ${this.failureCount} failures`);
      
      // Alert ops
      sendAlert({
        severity: 'HIGH',
        message: `Circuit breaker opened for ${this.constructor.name}`
      });
    }
  }
  
  getState() {
    return this.state;
  }
}

// Usage
const apiCircuitBreaker = new CircuitBreaker(5, 60000, 3);

async function callExternalAPI() {
  return apiCircuitBreaker.execute(async () => {
    const response = await fetch('https://external-api.com/data', {
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return response.json();
  });
}
```

### Graceful Degradation Strategies

**1. Feature Flags for Regional Failures**:
```javascript
// Automatically disable features on regional failure
class FailureResponseManager {
  constructor() {
    this.degradedMode = false;
    this.disabledFeatures = new Set();
  }
  
  async checkRegionalHealth() {
    const health = await fetch('/api/health').then(r => r.json());
    
    if (health.status === 'degraded') {
      this.enableDegradedMode(health);
    } else if (health.status === 'healthy' && this.degradedMode) {
      this.disableDegradedMode();
    }
  }
  
  enableDegradedMode(health) {
    this.degradedMode = true;
    
    // Disable non-critical features
    if (!health.checks.recommendationService) {
      this.disabledFeatures.add('recommendations');
    }
    
    if (!health.checks.searchService) {
      this.disabledFeatures.add('search');
    }
    
    // Show banner to users
    showBanner('Some features temporarily unavailable');
    
    console.warn('Degraded mode enabled:', Array.from(this.disabledFeatures));
  }
  
  disableDegradedMode() {
    this.degradedMode = false;
    this.disabledFeatures.clear();
    hideBanner();
    console.log('Degraded mode disabled: all features restored');
  }
  
  isFeatureEnabled(feature) {
    return !this.disabledFeatures.has(feature);
  }
}

// React component with degradation
function ProductPage() {
  const failureManager = useFailureManager();
  
  return (
    <div>
      <ProductDetails />
      
      {failureManager.isFeatureEnabled('recommendations') ? (
        <Recommendations />
      ) : (
        <div>Recommendations temporarily unavailable</div>
      )}
      
      {failureManager.isFeatureEnabled('reviews') ? (
        <Reviews />
      ) : null
      }
    </div>
  );
}
```

**2. Stale Content Serving**:
```javascript
// Serve stale cached content during outage
async function fetchWithStaleOnError(url, cacheKey, maxAge) {
  try {
    const response = await fetch(url, { timeout: 5000 });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache fresh data
    await cache.set(cacheKey, JSON.stringify(data), {
      ttl: maxAge
    });
    
    return data;
  } catch (error) {
    console.warn(`Fetch failed: ${error.message}, serving stale content`);
    
    // Serve stale cache (even if expired)
    const stale = await cache.get(cacheKey);
    
    if (stale) {
      return JSON.parse(stale);
    }
    
    // No cache available
    throw new Error('Service unavailable and no cache available');
  }
}
```

### Data Replication & Consistency

**1. Cross-Region Database Replication**:
```javascript
// Aurora Global Database (multi-region)
const databaseConfig = {
  primary: {
    region: 'us-east-1',
    endpoint: 'primary.cluster-abc123.us-east-1.rds.amazonaws.com',
    role: 'writer'
  },
  
  secondaryRegions: [
    {
      region: 'eu-west-1',
      endpoint: 'replica.cluster-def456.eu-west-1.rds.amazonaws.com',
      role: 'reader',
      replicationLag: '< 1s' // Typical lag
    },
    {
      region: 'ap-southeast-1',
      endpoint: 'replica.cluster-ghi789.ap-southeast-1.rds.amazonaws.com',
      role: 'reader',
      replicationLag: '< 1s'
    }
  ]
};

// Automatic promotion on primary failure
async function handlePrimaryFailure() {
  console.error('Primary database failed, promoting EU replica');
  
  // Promote replica to primary (AWS RDS API)
  await rds.promoteReadReplica({
    DBInstanceIdentifier: 'replica.cluster-def456.eu-west-1'
  });
  
  // Update application config
  updateDatabaseEndpoint('eu-west-1', 'writer');
  
  // Notify team
  sendAlert({
    severity: 'CRITICAL',
    message: 'Database failover: US-East → EU-West'
  });
}
```

**2. Eventual Consistency Handling**:
```javascript
// Handle replication lag gracefully
async function getUserWithConsistency(userId, requireLatest = false) {
  if (requireLatest) {
    // Read from primary (always up-to-date)
    return db.primary.query('SELECT * FROM users WHERE id = ?', [userId]);
  }
  
  // Read from nearest replica (may be slightly stale)
  const user = await db.replica.query('SELECT * FROM users WHERE id = ?', [userId]);
  
  // Check if data is too stale
  const age = Date.now() - new Date(user.updated_at).getTime();
  
  if (age > 5000) { // > 5 seconds old
    console.warn('Replica data stale, reading from primary');
    return db.primary.query('SELECT * FROM users WHERE id = ?', [userId]);
  }
  
  return user;
}
```

### Disaster Recovery Planning

**1. Backup Strategy**:
```javascript
// Automated backups across regions
const backupStrategy = {
  database: {
    frequency: 'continuous', // Point-in-time recovery
    retention: 35, // days
    crossRegion: true,
    regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1']
  },
  
  s3: {
    versioning: true,
    crossRegionReplication: {
      source: 'us-east-1-bucket',
      destination: 'eu-west-1-bucket',
      rules: [
        { prefix: 'critical/', priority: 1 },
        { prefix: 'user-uploads/', priority: 2 }
      ]
    }
  },
  
  snapshots: {
    frequency: 'daily',
    retention: 30,
    automatedTesting: true // Restore test monthly
  }
};
```

**2. Recovery Time Objective (RTO) & Recovery Point Objective (RPO)**:
```javascript
const disasterRecoveryTargets = {
  tier1: {
    // Critical services (checkout, payments)
    rto: 300, // 5 minutes
    rpo: 0,   // Zero data loss
    strategy: 'active-active'
  },
  
  tier2: {
    // Important services (product catalog)
    rto: 3600, // 1 hour
    rpo: 300,  // 5 minutes data loss acceptable
    strategy: 'active-passive'
  },
  
  tier3: {
    // Non-critical services (recommendations)
    rto: 14400, // 4 hours
    rpo: 3600,  // 1 hour data loss acceptable
    strategy: 'backup-restore'
  }
};
```

### What NOT to Do

- ❌ **Single region deployment** (no failover capability)
- ❌ **No health checks** (can't detect failures)
- ❌ **Manual failover** (too slow, error-prone)
- ❌ **No backups** (data loss on failure)
- ❌ **Untested failover** (fails when needed)

---

## 3. Clear Real-World Examples

### Example 1: AWS S3 Outage (Feb 2017)

**Incident**: Typo in command took down S3 US-East-1 for 4 hours.

**Impact**:
- Thousands of sites down (S3 dependency)
- AWS dashboard down (hosted on S3)
- Estimated $150M-$300M economic impact

**Lessons**:
```javascript
// Multi-region S3 strategy
const s3Failover = {
  primary: 's3.us-east-1.amazonaws.com',
  secondary: 's3.us-west-2.amazonaws.com',
  
  async getObject(key) {
    try {
      return await s3.getObject({
        Bucket: this.primary,
        Key: key
      });
    } catch (error) {
      console.warn('Primary S3 failed, trying secondary');
      return await s3.getObject({
        Bucket: this.secondary,
        Key: key
      });
    }
  }
};
```

### Example 2: GitHub Outage (Oct 2018)

**Incident**: Network partition split primary/replica databases for 43 seconds.

**Impact**:
- 24 hours degraded service
- Data inconsistency between US/EU
- Required manual data reconciliation

**Response**:
```javascript
// Improved health check with partition detection
async function detectNetworkPartition() {
  const [primaryPing, replicaPing] = await Promise.all([
    ping(primaryDB),
    ping(replicaDB)
  ]);
  
  // Both reachable from app, but can they see each other?
  const crossReplication = await checkReplicationStatus();
  
  if (primaryPing && replicaPing && !crossReplication) {
    // Network partition detected!
    console.error('NETWORK PARTITION DETECTED');
    
    // Stop writes to prevent split-brain
    pauseWrites();
    
    // Alert ops immediately
    sendCriticalAlert('Network partition detected');
  }
}
```

### Example 3: Cloudflare Outage (July 2019)

**Incident**: Bad regex in WAF rules caused CPU spikes, 27-minute global outage.

**Impact**:
- 11M HTTP requests failed
- Multiple Fortune 500 sites affected

**Prevention**:
```javascript
// Canary deployments for infrastructure changes
async function deployWAFRule(rule) {
  // Deploy to 1% of edge nodes
  await deployToCanary(rule, 0.01);
  
  // Monitor error rates
  await sleep(300000); // 5 minutes
  
  const errorRate = await getErrorRate();
  
  if (errorRate > 0.01) { // > 1% errors
    console.error('Canary deployment failing, rolling back');
    await rollback(rule);
    return false;
  }
  
  // Gradually roll out: 5% → 25% → 100%
  await deployToCanary(rule, 0.05);
  await deployToCanary(rule, 0.25);
  await deployFull(rule);
  
  return true;
}
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you handle regional failures in a globally distributed application?"

**Answer**:

"I'd implement **multi-region active-active architecture** with automatic failover:

**1. Multi-Region Deployment**:

Deploy in **3+ regions**: US-East, EU-West, AP-Southeast. Each region has full stack (load balancers, app servers, database replicas).

**2. Health Checks**:

Comprehensive health checks every 30s:
```javascript
{
  database: true/false,
  redis: true/false,
  externalAPIs: true/false,
  latency: { db: 50ms, redis: 5ms }
}
```

**Route 53** monitors health, removes unhealthy regions from DNS.

**3. Automatic Failover**:

**DNS-based**: Route 53 weighted routing (33% each region). If one fails, traffic automatically redistributed to healthy regions (< 60s).

**Application-level**: Circuit breakers for external dependencies:
```javascript
if (errorRate > 50%) {
  circuitBreaker.open();
  serveStaleCache(); // Fallback
}
```

**4. Data Replication**:

**Aurora Global Database**: Primary in US-East, replicas in EU/APAC (< 1s lag). Writes to primary, reads from nearest replica.

On primary failure, **auto-promote** replica to primary (< 60s RTO, < 1s RPO).

**5. Graceful Degradation**:

Disable non-critical features during regional issues:
- Recommendations: OFF (serve cached)
- Search: Limited (local cache only)
- Checkout: ON (critical, always available)

Show user banner: "Some features temporarily unavailable."

**6. Multi-CDN**:

Primary CDN (Cloudflare), fallback CDN (Fastly). Client-side failover:
```javascript
try {
  await fetch('cdn1.example.com/asset.js');
} catch {
  await fetch('cdn2.example.com/asset.js');
}
```

**7. Backup Strategy**:

- **Database**: Continuous backups, 35-day retention, cross-region replication
- **S3**: Versioning enabled, cross-region replication (sync within 15 minutes)
- **Monthly DR drills**: Test failover procedure, verify RTO/RPO

**8. Monitoring**:

Per-region dashboards (error rate, latency, throughput). Alert thresholds:
- **P1**: Region error rate > 5% (page ops immediately)
- **P2**: Latency > 2x baseline (investigate)

**9. Incident Response**:

Runbook for regional failure:
1. Automated failover (Route 53 + app circuit breakers)
2. Ops notified via PagerDuty
3. Update status page
4. Investigate root cause
5. Post-mortem within 48 hours

**RTO/RPO**:

- **Tier 1** (checkout): RTO 5 min, RPO 0 (zero data loss)
- **Tier 2** (catalog): RTO 1 hour, RPO 5 min
- **Tier 3** (analytics): RTO 4 hours, RPO 1 hour

**Real-World**: AWS S3 outage (2017) taught importance of multi-region. GitHub (2018) improved partition detection. Cloudflare (2019) added canary deployments for infrastructure changes."

---

## 6. Why & How Summary

### Why It Matters

**Availability**: 99.99%+ uptime despite regional outages  
**Revenue**: Prevent downtime losses ($100K-$1M+/hour for large sites)  
**Reputation**: User trust depends on reliability

### How It Works

**1. Deploy**: Multi-region (3+ regions, full stack each)  
**2. Health Check**: Monitor every 30s, auto-remove unhealthy  
**3. Failover**: DNS + circuit breakers (< 60s)  
**4. Replicate**: Database replication (< 1s lag)  
**5. Degrade**: Disable non-critical features gracefully  
**6. Backup**: Cross-region, tested monthly

**FAANG**: < 60s RTO, < 1s RPO, 99.99%+ availability, automated failover, monthly DR drills
