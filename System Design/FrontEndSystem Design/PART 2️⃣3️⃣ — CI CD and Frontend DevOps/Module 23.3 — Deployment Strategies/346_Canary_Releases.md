# 346 – Canary Releases for Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Canary releases gradually roll out a new version to a small percentage of users (1% → 5% → 25% → 100%), monitoring for errors at each step. If error rates spike, stop the rollout. Less risky than blue-green's all-at-once switch.

## 2. 🔬 DEEP-DIVE EXPLANATION

```
Traffic Distribution Over Time:

Time    v1.2 (stable)    v1.3 (canary)    Error Rate
─────   ──────────────   ─────────────    ──────────
T+0     100%              0%              baseline
T+1h    99%               1%              monitoring...
T+2h    95%               5%              OK ✅
T+4h    75%               25%             OK ✅
T+8h    50%               50%             OK ✅
T+12h   0%                100%            Promoted ✅

If error spike at any step → automatic rollback to 100% v1.2
```

### Implementation for Frontend
```typescript
// 1. CDN-level canary (Cloudflare Workers / AWS Lambda@Edge)
async function handleRequest(request: Request): Promise<Response> {
  const userId = getCookie(request, 'user_id') || crypto.randomUUID();
  const canaryPercentage = await KV.get('canary_percentage'); // e.g., '5'
  
  // Consistent assignment: same user always gets same version
  const hash = hashString(userId);
  const isCanary = (hash % 100) < parseInt(canaryPercentage);
  
  const origin = isCanary
    ? 'https://canary.cdn.example.com'
    : 'https://stable.cdn.example.com';
  
  const response = await fetch(origin + new URL(request.url).pathname);
  // Add header for debugging
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-Version', isCanary ? 'canary' : 'stable');
  return newResponse;
}

// 2. Application-level canary (feature flag)
function getAppVersion(userId: string): 'stable' | 'canary' {
  const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % 100 < CANARY_PERCENTAGE ? 'canary' : 'stable';
}
```

### Monitoring Checklist
| Metric | Threshold | Action |
|---|---|---|
| Error rate | > 2× baseline | Auto-rollback |
| LCP | > 3s (was 2s) | Pause rollout |
| CLS | > 0.15 | Pause rollout |
| API 5xx | > 1% | Auto-rollback |
| Client crashes | >0.5% | Auto-rollback |

### Canary vs Blue-Green
| Dimension | Canary | Blue-Green |
|---|---|---|
| Risk | Very low (small %) | Medium (all at once) |
| Rollback speed | Instant | Instant |
| Monitoring | Required | Optional |
| Complexity | Higher | Lower |
| blast radius | 1-5% of users | All users |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Canary releases send 1-5% of traffic to the new version first, with automated monitoring. If error rates stay normal, we gradually increase to 100%. I use consistent user hashing so the same user always sees the same version. This limits blast radius to a small percentage."*

## 4. 🧠 MEMORY AID
**"Canary = gradual rollout: 1% → 5% → 25% → 100%. Monitor error rates at each step. Same user = same version (hash). Auto-rollback on spike."**

## 5. 🎯 KEY INSIGHT
The key to canary is **consistent assignment** — the same user must see the same version throughout the rollout to avoid UX inconsistencies.
