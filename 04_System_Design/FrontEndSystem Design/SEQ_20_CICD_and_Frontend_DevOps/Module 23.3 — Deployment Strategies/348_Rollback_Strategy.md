# 348 – Rollback Strategy

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Rollback reverts a production deployment when issues are detected. Strategies: **instant rollback** (blue-green switch), **revert commit** (rebuild + redeploy), **feature flag disable** (no redeploy), **CDN cache purge** (serve previous assets). The best rollback is one that doesn't require a new deployment.

## 2. 🔬 DEEP-DIVE EXPLANATION

### Rollback Methods (fastest to slowest)
| Method | Time | Downtime | Complexity |
|---|---|---|---|
| **Feature flag disable** | Seconds | Zero | Flag must exist |
| **CDN rollback** | 30s-2min | Zero | Requires versioned assets |
| **Blue-green switch** | 30s | Zero | Requires dual infra |
| **Git revert + redeploy** | 5-15min | Minutes | Always available |
| **Database rollback** | 30min+ | Yes | Very complex |

```typescript
// ──── CDN ROLLBACK: Serve previous version ────
// Versioned deployments: /v1.2.0/index.html, /v1.3.0/index.html
async function rollback(targetVersion: string) {
  // Update CDN routing to serve old version
  await updateCDNOrigin(`https://cdn.example.com/${targetVersion}/`);
  // Purge CDN cache
  await purgeCDNCache('/*');
  console.log(`Rolled back to ${targetVersion}`);
}

// ──── AUTOMATED ROLLBACK: Monitor + auto-revert ────
interface HealthCheck {
  errorRate: number;
  p95Latency: number;
  statusCode: number;
}

async function monitorAndRollback(deployId: string, previousVersion: string) {
  const CHECK_INTERVAL = 30_000; // 30s
  const MAX_ERROR_RATE = 0.05;   // 5%
  const CHECK_DURATION = 10;     // 10 checks (5 min)

  for (let i = 0; i < CHECK_DURATION; i++) {
    await sleep(CHECK_INTERVAL);
    const health = await getHealthMetrics();
    
    if (health.errorRate > MAX_ERROR_RATE) {
      console.error(`Error rate ${health.errorRate} exceeds threshold`);
      await rollback(previousVersion);
      await notifyTeam(`Auto-rollback: ${deployId} → ${previousVersion}`);
      return;
    }
  }
  console.log(`Deploy ${deployId} is stable`);
}
```

### Rollback Runbook
```markdown
## Production Rollback Runbook
1. **Detect**: Alert from monitoring (error rate > 5%, LCP > 4s)
2. **Assess**: Is it the deployment? Check timing correlation
3. **Decide**: Rollback vs hotfix (if fix < 10 min, hotfix; else rollback)
4. **Execute**: 
   - Feature flag? → Disable flag
   - CDN? → Switch to previous version
   - Full rollback? → `git revert` → CI → deploy
5. **Verify**: Confirm metrics return to baseline
6. **Communicate**: Post in #incidents, update status page
7. **Post-mortem**: Root cause analysis within 48h
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"My rollback ladder: 1) disable feature flag (seconds), 2) switch CDN to previous version (30s), 3) blue-green switch (30s), 4) git revert + redeploy (10min). I keep the previous two versions deployed for instant rollback. Automated monitoring triggers rollback when error rate exceeds 5%."*

## 4. 🧠 MEMORY AID
**"Fastest rollback: flag off > CDN switch > blue-green > git revert. Keep previous versions deployed. Automate with health checks."**

## 5. 🎯 KEY INSIGHT
Design for rollback from day one: versioned deployments, backward-compatible DB migrations, and feature flags make rollback trivial instead of terrifying.
