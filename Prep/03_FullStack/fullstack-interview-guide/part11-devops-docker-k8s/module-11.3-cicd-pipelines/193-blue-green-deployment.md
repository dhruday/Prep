# Blue-Green Deployment
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Core idea**: run two identical production environments simultaneously — "blue" (current live version) and "green" (new version); blue receives all production traffic; green is deployed and tested in isolation; when green is verified, switch ALL traffic from blue to green in under a second; blue becomes standby
- **Instant cutover**: unlike rolling deployments that gradually replace pods, blue-green switches a single router/load balancer/Service selector setting — the entire fleet transitions at once; zero traffic to old version the moment you switch
- **Instant rollback**: if green has problems, flip the switch back to blue — entire fleet reverts in under a second; blue is still running, not scaled down immediately; this is the safety net that makes blue-green less risky than rolling updates for large changes
- **The cost**: you need 2× the compute resources during the transition window; blue environment continues running after the switch for rollback capacity; you can't afford this for large, expensive workloads
- **Kubernetes implementation**: two Deployments (`payment-service-blue`, `payment-service-green`); one Service pointed at the active deployment via its label selector; switching traffic = updating `spec.selector.version` in the Service or using an Ingress annotation
- **Database schema challenge**: both versions must be able to read the same database simultaneously during the transition; incompatible migrations (dropping a column blue still reads) require multi-phase migration strategies
- 🆕 **Gap topic for Hruday**: "I've implemented blue-green conceptually and with basic Service selector switching on AKS. I'm deepening knowledge of the database compatibility patterns and Argo Rollouts automation"

---

## 1. One-Line Definition
Blue-green deployment is a release pattern that maintains two complete, identical production environments — old (blue) and new (green) — so traffic can be switched instantly and completely from one to the other, enabling zero-downtime deployments with immediate rollback capability.

---

## 2. The Problem It Solves

Rolling deployments (Topic 186) are safe for incremental changes but have a window where both old and new versions simultaneously serve production traffic. If version 1.0 sends events in format A and version 1.1 sends events in format B, some consumers see format A and some see format B during the rollout. For most changes this is fine. For breaking API changes, protocol changes, or changes that must not be partially visible to users, this mixed-version window is a problem.

Blue-green eliminates the mixed-version window: the switchover is atomic. One moment 100% of traffic goes to version 1.0. The next moment 100% goes to version 1.1. There's no state where some requests see old behaviour and some see new behaviour.

**Rollback speed**: rolling deployment rollback involves re-deploying old pods, which takes the same time as the original deployment (minutes). Blue-green rollback involves flipping the switch back to the blue environment — the switch takes under a second, and all traffic is back on the stable version immediately. This is the single biggest advantage for high-stakes deployments (payment API changes, database schema updates, authentication flow changes).

**Smoke testing before cutover**: green is running in production infrastructure (same machines, same network, same connections to the database) but receiving zero production traffic. You can run automated smoke tests against green, manually verify critical flows, check metrics — all before any user sees the new version. Rolling deployments don't let you test in production without affecting production users.

---

## 3. How It Works Internally

### The Traffic Switching Mechanism

```
BEFORE SWITCH (blue is active):

  Users → Load Balancer/Service (active: blue)
                  │
                  ▼ 100% traffic
  ┌─────────────────────────────┐
  │ BLUE Environment             │               ┌────────────────────────────┐
  │ payment-service:1.0.0        │               │ GREEN Environment          │
  │ Pods: 3/3 RUNNING            │               │ payment-service:1.1.0      │
  │ Serving: YES ✓               │               │ Pods: 3/3 RUNNING          │
  │                              │               │ Serving: NO (no traffic)   │
  │ (stable, proven)             │               │                            │
  └─────────────────────────────┘               │ (deployed, tested, ready)  │
                                                 └────────────────────────────┘

SWITCHING (traffic switch — takes milliseconds):
  
  Update Service selector:
    Old: selector.version = "blue"   →   New: selector.version = "green"
  
  Kubernetes endpoint controller updates the Endpoints list immediately
  All new incoming requests route to green pods
  In-flight requests to blue pods complete normally (connection draining)

AFTER SWITCH (green is active):

  Users → Load Balancer/Service (active: green)
                  │
                  ▼ 100% traffic
  ┌─────────────────────────────┐               ┌────────────────────────────┐
  │ BLUE Environment             │               │ GREEN Environment          │
  │ payment-service:1.0.0        │               │ payment-service:1.1.0      │
  │ Pods: 3/3 RUNNING            │               │ Pods: 3/3 RUNNING          │
  │ Serving: NO (standby)        │               │ Serving: YES ✓             │
  │                              │               │                            │
  │ (ready for rollback)         │               │ (now live)                 │
  └─────────────────────────────┘               └────────────────────────────┘

ROLLBACK (if green has issues — takes milliseconds):
  Switch selector back: version = "green"  →  version = "blue"
  Blue immediately active again
  Green pods remain running (can diagnose the failure without affecting users)

CLEANUP (after green is stable — hours or days later):
  Scale blue Deployment to 0 replicas (save compute cost)
  Next deployment: blue becomes the new "green" for the next release
```

### Kubernetes Implementation Using Service Selector

```
Two Deployments:
  payment-service-blue:
    - image: payment-service:1.0.0
    - replicas: 3
    - labels:
        app: payment-service
        version: blue                # The discriminating label

  payment-service-green:  
    - image: payment-service:1.1.0
    - replicas: 3
    - labels:
        app: payment-service
        version: green               # Different version label

One Service:
  payment-service:
    spec.selector:
      app: payment-service
      version: blue                  # ← This determines which pods receive traffic
                                     # Change blue to green → instant traffic switch
                                     # Change green to blue → instant rollback

The switch:
  kubectl patch service payment-service \
    -p '{"spec":{"selector":{"version":"green"}}}'
  
  → Endpoint controller removes blue pod IPs, adds green pod IPs
  → kube-proxy updates iptables rules within seconds
  → All new requests go to green
```

---

## 4. The Code

### Wrong Way — Uncoordinated Deployment Without Rollback Path
```yaml
# ❌ WRONG — deploy new version directly, overwriting old
# kubectl set image deployment/payment-service payment-service=payment-service:2.0.0
# This starts a rolling update — blue and green mixed for 2-3 minutes
# If the new version has a critical bug:
#   - Rolling update is 60% done
#   - 2 new pods (v2.0.0) serving traffic, 1 old pod (v1.0.0) serving traffic
#   - Users are randomly hitting v1 or v2
#   - Rollback: kubectl rollout undo — takes 3-5 minutes of mixed-version traffic

# For a payment API with breaking response format changes:
# - v1 clients expect: { "status": "SUCCESS", "transactionId": "..." }
# - v2 response is: { "result": "success", "id": "..." }
# - During rolling update: some clients get v1 format, some get v2 format
# - Mobile app clients caching the response format are broken
# - No way to instantly revert once the rollout is 50% done
```

> **Why this breaks high-stakes changes:** Rolling updates are safe for backward-compatible changes, but for breaking changes, protocol changes, or significant database migrations, the overlap window where both versions serve traffic creates unpredictable client-facing behaviour. A payment service that changes its response schema during a rolling update means some fraction of users receive unrecognised responses from their clients — a live incident, not a graceful deployment.

### Right Way — Blue-Green with Service Selector Switching
```yaml
# blue-deployment.yaml — current live version (blue)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-blue
  namespace: payment
  labels:
    app: payment-service
    color: blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
      color: blue
  template:
    metadata:
      labels:
        app: payment-service
        color: blue
        version: "1.0.0"
    spec:
      containers:
        - name: payment-service
          image: 123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

```yaml
# service.yaml — points to blue (the current live version)
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: payment
spec:
  selector:
    app: payment-service
    color: blue            # ← This label determines which deployment is live
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

```yaml
# green-deployment.yaml — new version being deployed
# Deploy this BEFORE switching traffic
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-green
  namespace: payment
  labels:
    app: payment-service
    color: green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
      color: green
  template:
    metadata:
      labels:
        app: payment-service
        color: green
        version: "1.1.0"
    spec:
      containers:
        - name: payment-service
          image: 123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:1.1.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

**Blue-green deployment script — the orchestration:**
```bash
#!/bin/bash
# blue-green-deploy.sh — orchestrates the full blue-green deployment

set -e   # Exit on any error

NAMESPACE="payment"
SERVICE="payment-service"
NEW_IMAGE="123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:${GIT_SHA}"
SMOKE_TEST_URL="http://payment-service-green.payment.svc.cluster.local/actuator/health"

echo "=== STEP 1: Deploy green (new version) ==="
kubectl apply -f green-deployment.yaml -n ${NAMESPACE}

echo "=== STEP 2: Wait for green pods to be ready ==="
kubectl rollout status deployment/payment-service-green -n ${NAMESPACE} --timeout=5m

echo "=== STEP 3: Run smoke tests against green (no production traffic yet) ==="
# Smoke tests call the green service internally — users are unaffected
# In Kubernetes: directly access green pods via their pod IPs or a temporary ClusterIP Service

# Option A: exec into a test pod and curl the green service's internal address
kubectl run smoke-test --rm -i --image=curlimages/curl --restart=Never -- \
  curl -f "http://payment-service-green.payment.svc.cluster.local/api/health"

# Option B: run a Kubernetes Job that makes API calls to green
# If the Job fails (non-zero exit), the deployment stops before switching traffic
kubectl apply -f smoke-test-job.yaml
kubectl wait --for=condition=complete --timeout=2m job/payment-smoke-test

echo "=== STEP 4: Switch traffic from blue to green ==="
# Update the Service selector to point to green
kubectl patch service ${SERVICE} -n ${NAMESPACE} \
  --type=merge \
  -p '{"spec":{"selector":{"color":"green"}}}'

echo "=== STEP 5: Verify green is handling traffic (check metrics for 2 minutes) ==="
# Brief monitoring window — check error rates haven't spiked
sleep 30
ERROR_RATE=$(kubectl exec -it monitoring-pod -- curl -s "http://prometheus:9090/api/v1/query?query=rate(http_errors_total{app='payment-service'}[1m])")
echo "Error rate check: ${ERROR_RATE}"

echo "=== STEP 6: Scale down blue (optional — keep for rollback) ==="
# Keep blue running for at least 1 hour for easy rollback
# echo "Keeping blue running for rollback capability"
# kubectl scale deployment/payment-service-blue --replicas=0 -n ${NAMESPACE}

echo "=== Deployment complete ==="
echo "To rollback: kubectl patch service ${SERVICE} -p '{\"spec\":{\"selector\":{\"color\":\"blue\"}}}'"
```

```yaml
# Argo Rollouts — automated blue-green with progressive analysis
# Install first: kubectl create namespace argo-rollouts; kubectl apply -f https://...argo-rollouts.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payment-service
  namespace: payment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  
  strategy:
    blueGreen:
      activeService: payment-service          # Service receiving production traffic
      previewService: payment-service-preview  # Service for pre-switch verification (green)
      autoPromotionEnabled: false             # Require manual promotion (or auto after analysis)
      
      # Run analysis before promoting — automatically rollback if error rate > 5%
      prePromotionAnalysis:
        templates:
          - templateName: success-rate-check
        args:
          - name: service-name
            value: payment-service-preview    # Analyse the preview (green) service
      
      # Scale down old blue after promotion
      scaleDownDelaySeconds: 3600             # Keep blue for 1 hour for easy rollback
  
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment-service
          image: payment-service:1.1.0
          ...
---
# AnalysisTemplate — the definition of what "good" means for promotion
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate-check
  namespace: payment
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      successCondition: result[0] >= 0.95    # > 95% success rate required
      failureLimit: 3
      interval: 60s
      count: 5                               # 5 checks × 60s = 5 minutes of analysis
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}", status!~"5.."}[2m]))
            /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[2m]))
```

> **Key decisions here:**
> - Smoke tests against green BEFORE switching traffic — this is the unique advantage of blue-green; you can run integration/smoke tests in production infrastructure (same DB, same network) with zero user impact; if smoke tests fail, blue is still live and no user saw the issue
> - `scaleDownDelaySeconds: 3600` — keep blue running for 1 hour after switching; this gives operations teams a rollback window without requiring a new deployment; the cost is 2× compute for that hour
> - `autoPromotionEnabled: false` — for payment services, manual promotion is safer; the operator validates the smoke test results and metrics in the preview environment before clicking promote; Argo Rollouts shows both blue and green status in its UI

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is blue-green deployment and how is it different from a rolling deployment?"

**Hruday's answer:**
> Blue-green deployment maintains two complete production environments running simultaneously. "Blue" is the current live version receiving all traffic. "Green" is the new version deployed in parallel, receiving zero traffic. Once green is deployed and verified, traffic is switched instantly — a single load balancer or Kubernetes Service selector update — from blue to green. All traffic moves atomically; there's no period where both versions serve production requests simultaneously.
>
> Rolling deployment, by contrast, gradually replaces pods: it brings up one new pod, waits for it to be ready, terminates one old pod, and repeats. During the rollout, both old and new versions simultaneously serve traffic. For backward-compatible changes this is fine. For breaking changes — a new API response format, a payment flow redesign — that mixed-version window can cause inconsistent user experiences or client errors.
>
> Blue-green's advantages: instant rollback (flip the switch back to blue, which is still running), pre-cutover verification in production infrastructure (smoke test green before any user sees it), and atomic switchover (no mixed-version window). The cost: 2× infrastructure during the transition.
>
> Rolling deployment's advantages: lower infrastructure cost (no need to run 2× replicas), better for incremental, backward-compatible changes, and native to Kubernetes Deployment objects — no extra tooling needed.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you handle database migrations in a blue-green deployment?"

**Hruday's answer:**
> This is the hardest part of blue-green deployment. During the switch, both blue (old version) and green (new version) may coexist — blue is standing by for rollback, green is live. If you run a migration that drops a column that blue still reads, and you then roll back to blue, blue breaks because the column it expects is gone.
>
> The standard approach is the Expand-Contract (or backward-compatible migration) pattern, done in phases:
>
> Phase 1 — Expand migration: add the new column, add new indexes, keep old columns; deploy v1.1.0 that uses BOTH old and new columns (writes to both, can read from either); at this point you can roll back to v1.0.0 safely since old columns still exist.
>
> Phase 2 — Cutover: once v1.1.0 is stable and old columns have been migrated to the new format, stop writing to old columns in the code (v1.2.0 reads only from new columns); deploy v1.2.0.
>
> Phase 3 — Contract migration: now that no code reads old columns, drop them; both v1.1.0 and v1.2.0 don't need them; the drop is safe.
>
> The key insight: the database migration can never be ahead of the application's code compatibility. During any blue-green window when blue could roll back, the database must be in a state readable by the blue version.
>
> Tools like Liquibase and Flyway help manage migration sequencing. For Kubernetes, running the migration as an init container in the green Deployment ensures migration runs before green pods start, and rollback procedures account for migration state.

---

### Q3 — Trade-Off
**Interviewer asks:** "When would you choose rolling deployment over blue-green?"

**Hruday's answer:**
> Rolling deployment is the better choice in most everyday deployment scenarios for several reasons.
>
> Cost: blue-green requires 2× the compute resources during the active deployment window. For large services (20 pods, each with significant CPU/memory allocation), the cost of running 40 pods is significant. Rolling deployment maintains approximately the same pod count throughout.
>
> Simplicity: rolling deployments are native to Kubernetes Deployments — it's the default strategy, requiring no extra tooling. Blue-green requires either manual coordination or a tool like Argo Rollouts to automate the switch and analysis.
>
> Frequency: if you deploy 10 times per day per service, keeping two full environments alive for 1+ hour per deployment is a significant ongoing cost. Rolling deployments clean up as they go.
>
> Where blue-green is clearly better: breaking API changes (v1 to v2 API), payment flow overhauls, authentication system changes, any release where the mixed-version window creates unacceptable risk, or high-stakes releases where the ability to roll back in under a second is worth the cost.
>
> My approach in practice: use rolling deployments as the default, and reserve blue-green for the subset of releases that involve breaking changes, significant risk, or require verified smoke testing in production infrastructure before any user traffic.

---

### Q4 — Scenario
**Interviewer asks:** "You did a blue-green deployment. Green is live. 5 minutes later, you detect elevated error rates. How do you respond?"

**Hruday's answer:**
> The first action, immediately: confirm the errors started after the green deployment, not before. If this is confirmed, execute the rollback: `kubectl patch service payment-service -p '{"spec":{"selector":{"color":"blue"}}}'` or the equivalent in Argo Rollouts. This takes under 5 seconds to execute. All new requests immediately route back to blue, which is still running at full capacity. User-facing error rate drops back to baseline within seconds.
>
> This is the entire reason blue-green is worth the cost for high-risk deployments: the rollback is instant (under a second), not a new deployment cycle. Compare to rolling deployment rollback which requires redeploying the old image — minutes of partial traffic on both versions.
>
> With blue now live again, I investigate green without time pressure: `kubectl logs` on green pods, look at the error details in Prometheus/CloudWatch, reproduce in a staging environment. Green is still running but receiving no traffic — it's a perfect diagnostic environment.
>
> Post-incident: I'd set up automated analysis in Argo Rollouts (`prePromotionAnalysis`) to check error rate and latency percentiles before the switch, so next time the pipeline catches this before any user is affected. The analysis template would fail the promotion if error rate exceeds 1%, preventing the switch to green from happening automatically.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Blue-green means zero downtime" | "Just use blue-green and you have zero downtime automatically" | Blue-green achieves zero downtime only if the database migration is backward compatible (both versions can read the same schema), if the application handles in-flight requests correctly during the switch, and if smoke tests in green actually validate the critical paths |
| "Blue is turned off after switch" | "After switching to green, you terminate blue immediately to save cost" | Blue must stay running for rollback capability — the entire point is instant revert; scale blue down after a confidence period (30 mins to hours), not immediately; the 2× cost during this window is the price of the safety net |
| "Blue-green is always better than rolling" | "We should use blue-green everywhere" | Blue-green has real cost overhead; for backward-compatible incremental deployments, rolling is simpler and cheaper; reserve blue-green for high-risk changes that justify the 2× compute cost |
| "Any migration is safe" | "Just run the migration when deploying green" | Database migrations that drop or rename columns used by the blue version will break rollback; always use expand-contract migration pattern when blue-green rollback must remain viable |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I proposed blue-green deployment for a major API versioning change in our payment service — we were changing the JSON response structure, which would break clients using the old format if they saw responses from both versions during a rolling update. I implemented the Kubernetes pattern using two Deployments and Service selector switching. The key part was running our integration test suite against the green deployment (calling it directly via internal ClusterIP before switching) — we caught a serialisation bug in the new response format during that pre-switch verification that would otherwise have hit production users. After fixing and redeploying green (blue still serving traffic throughout), we switched the Service selector and monitored for 30 minutes before scaling down blue. The deployment was completely transparent to users — no errors, no mixed-format responses."

---

## 8. Scale Evolution

**1,000 users/day →** Service selector switching with a simple script. Two Deployments, one Service. Manual smoke test by the engineer (curl the green internal endpoint). Keep blue for 1 hour post-switch.

**100,000 users/day →** Argo Rollouts for automated promotion with prePromotionAnalysis (Prometheus-based error rate check). Automated smoke test Jobs in the pipeline before calling `kubectl argo rollouts promote`. Alert on rollback events in PagerDuty.

**10 million users/day →** Full progressive delivery platform: Argo Rollouts with multi-step analysis, canary graduation as a precursor to full blue-green switch, automated rollback on SLO violation, traffic mirroring (shadow traffic) — send production clone to green before going live to verify under real load. Feature flags decouple code deployment from feature activation (Unleash, LaunchDarkly).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment API changes carry significant risk; blue-green enables safe rollout of breaking changes with instant rollback; zero-downtime during peak hours is a business requirement | Explain the database migration constraint; describe the rollback procedure; know Argo Rollouts |
| Swiggy / Meesho | High-visibility consumer product where service degradation is immediately felt; blue-green preferred for order flow changes; automated analysis is used to gate promotions | Explain automated promotion analysis; discuss cost trade-offs |
| Adobe / Microsoft | Enterprise software with SLAs requiring zero-downtime deployments; blue-green combined with feature flags for safe rollout of major product changes | Know expand-contract migration; discuss feature flags vs deployment strategies |
| SAP Labs | SAP BTP and enterprise products require rigorous deployment strategies; breaking API changes in enterprise platforms can affect thousands of customers; blue-green with proper Database migration planning is standard | Direct experience implementing blue-green for breaking API changes at SAP |

---

## 10. Related Topics — What to Study Next

- **Topic 186 — Deployments, ReplicaSets, Services** — the Kubernetes objects that blue-green deployment coordinates; understanding how Service label selectors work is the prerequisite for the selector-switching pattern
- **Topic 194 — Canary Releases** — the alternative advanced deployment strategy; where blue-green switches all traffic at once, canary routes a small percentage gradually; the two strategies are compared frequently in interviews; for most high-risk deployments, canary (gradual) is safer than blue-green (all-at-once); Argo Rollouts supports both
- **Topic 193 is paired with Topic 194** — understanding both strategies and being able to articulate when to use each is the key interview signal
- **Topic 190 — Pipeline Stages** — the pipeline's deploy stage orchestrates the blue-green switch; the integration test / smoke test stage runs against green before the switch; the pipeline is the automation layer above the Kubernetes objects

---

*Part 11 · Blue-Green Deployment · Full Stack Interview Guide · Hruday D · 2026*
