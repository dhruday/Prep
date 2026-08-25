# 345 – Blue-Green Deployment

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Blue-green deployment maintains two identical production environments. **Blue** runs the current version, **Green** gets the new version. After validation, traffic switches from Blue to Green instantly. Rollback = switch back to Blue. Zero downtime, instant rollback.

## 2. 🔬 DEEP-DIVE EXPLANATION

```
BEFORE SWITCH:
Users ──▶ Load Balancer ──▶ Blue (v1.2.0) ✅ LIVE
                             Green (v1.3.0) 🔄 staging/testing

AFTER SWITCH (DNS/LB update):
Users ──▶ Load Balancer ──▶ Green (v1.3.0) ✅ LIVE
                             Blue (v1.2.0) 📦 standby for rollback

ROLLBACK (if issues):
Users ──▶ Load Balancer ──▶ Blue (v1.2.0) ✅ LIVE (instant switch back)
```

### For Frontend (CDN-based)
```typescript
// CDN blue-green with Cloudflare Workers
// worker.js — route requests to correct origin
addEventListener('fetch', event => {
  const activeVersion = DEPLOYMENT_KV.get('active'); // 'blue' or 'green'
  const origin = activeVersion === 'green' 
    ? 'https://green.cdn.example.com'
    : 'https://blue.cdn.example.com';
  
  event.respondWith(fetch(origin + new URL(event.request.url).pathname));
});
```

```yaml
# Deployment script
deploy:
  - Build new version → upload to Green CDN bucket
  - Run smoke tests against Green URL
  - Switch load balancer/DNS to Green
  - Monitor error rates for 15 minutes
  - If OK: mark Green as stable, Blue becomes next staging
  - If errors spike: switch back to Blue (< 30s rollback)
```

### Trade-offs
| Pro | Con |
|---|---|
| Zero downtime | Double infrastructure cost |
| Instant rollback | Database migrations must be backward-compatible |
| Full testing before switch | CDN cache invalidation needed |
| Simple mental model | Shared state (DB, cache) must handle both versions |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Blue-green gives zero-downtime deployment with instant rollback. For frontend, I deploy to a separate CDN bucket (green), run smoke tests, then switch routing. Rollback is a DNS/LB change. The main challenge is database backward compatibility and CDN cache invalidation."*

## 4. 🧠 MEMORY AID
**"Two environments: Blue (live) + Green (new). Deploy to Green → test → switch → Blue becomes rollback target."**

## 5. 🎯 KEY INSIGHT
For static frontend assets on a CDN, blue-green is almost free — just deploy to a separate path/bucket and switch the routing rule.
