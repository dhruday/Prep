# Liveness and Readiness Probes
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Readiness probe**: "Should this pod receive traffic right now?" — kubelet runs the probe; if it fails, the pod is removed from the Service's Endpoints (no traffic); if it passes, the pod is added back; used during startup (app not ready yet), during rolling deployment (new pod must pass readiness before old pod is removed), and during runtime (pod temporarily overwhelmed — stop sending it more work)
- **Liveness probe**: "Is this pod alive and should it stay alive?" — if it fails N consecutive times, kubelet kills the pod and restarts it; NOT for startup — use to detect stuck/deadlocked states the app can't recover from itself
- **Startup probe**: "Is this slow-starting app still in the process of starting?" — gives slow apps (Spring Boot takes 20-60s) extra time without triggering liveness kills; runs INSTEAD of liveness during startup; once startup probe succeeds, liveness probe takes over
- **Spring Boot Actuator**: `management.health.livenessState.enabled=true` and `management.health.readinessState.enabled=true` automatically expose `/actuator/health/liveness` and `/actuator/health/readiness` — these are the correct endpoints to use for K8s probes
- **Wrong pattern**: using the same endpoint for both liveness and readiness — liveness killing a pod because it's momentarily busy (DB connection spike) causes a restart loop; readiness should temporarily route traffic away from a pod that's stressed; liveness should only kill a pod that's truly stuck
- **initialDelaySeconds is critical**: too short = liveness kills Spring Boot before JVM is ready; too long = genuine crashes go undetected for too long; measure actual startup time and set `initialDelaySeconds` at 1.5× that time
- 🆕 **Gap topic for Hruday**: "I fixed a CrashLoopBackOff at SAP caused by a liveness probe firing before Spring Boot finished starting — this gave me direct, painful experience with probe timing"

---

## 1. One-Line Definition
Liveness probes tell Kubernetes when to restart a pod (the pod is alive but stuck). Readiness probes tell Kubernetes when a pod is ready to receive traffic (the pod is healthy enough to serve requests). Together they make automated failure detection, rolling deployments, and traffic routing safe.

---

## 2. The Problem It Solves

**Without probes, Kubernetes is blind:**

A container starts running (process started — status = Running). Kubernetes sees: process running → pod is ready. But the JVM takes 40 seconds to load Spring Boot, initialise all Spring beans, and connect to the database. During those 40 seconds, the pod is Running but not actually able to handle HTTP requests. Without a readiness probe, the Service sends traffic to that pod immediately — and every request fails with a connection refused or 503 error.

A different failure: the application has a thread pool that deadlocks under specific conditions. The JVM is running. The process hasn't crashed. `/health` still returns 200 because the health check runs on a separate thread that isn't deadlocked. But every request to the main API endpoint hangs indefinitely. This pod is technically alive but completely useless. Without a liveness probe pointing to the right indicator, Kubernetes keeps sending traffic to this dead-end pod.

**The third problem — rolling deployments:** Kubernetes removes old pods from the Service's Endpoint list and adds new pods. Without readiness probes, Kubernetes adds a new pod to the Service as soon as the process starts — before Spring Boot has even finished loading. Traffic is sent to an unready pod, causing errors during the exact window a deployment is supposed to be zero-downtime.

Readiness probes = protection against unready traffic. Liveness probes = automated recovery from stuck states.

---

## 3. How It Works Internally

### Probe Types

```
Three probe mechanisms — pick based on what you can check:

1. HTTP GET (most common — use this for Spring Boot):
   kubelet makes HTTP GET to the pod's IP:port/path
   Success: 200-399 status code
   Failure: anything else (400+, connection refused, timeout)
   
   Example: GET http://10.244.1.5:8080/actuator/health/liveness → 200 OK → alive

2. TCP Socket:
   kubelet tries to open a TCP connection to the pod's port
   Success: connection opens
   Failure: connection refused or timeout
   
   Good for: non-HTTP services (Redis, MySQL, gRPC without HTTP probe)

3. Exec (command):
   kubelet runs a command inside the container
   Success: exit code 0
   Failure: non-zero exit code
   
   Example: exec: ["redis-cli", "ping"] → "PONG" → exit 0 → alive
   Use sparingly — exec spawns a process on every probe interval (CPU overhead)
```

### Startup Probe — The Java Solution

```
Problem for Spring Boot:
  - Spring Boot initialises ALL beans, connections, caches on startup
  - Large apps: 30-60 seconds to start
  - Liveness probe fires every 10s with initialDelaySeconds: 20
  - At 20s: Spring Boot still loading → liveness returns 503
  - kubelet: probe failed (1 of 3 failures threshold)
  - At 30s: Spring Boot still loading → liveness returns 503
  - kubelet: probe failed (2 of 3)
  - At 40s: Spring Boot still loading → liveness returns 503
  - kubelet: KILLS POD — CrashLoopBackOff begins
  - This repeats: pod never starts successfully

Solution — startup probe:
  startupProbe:
    httpGet:
      path: /actuator/health/liveness
      port: 8080
    failureThreshold: 30        # Allow up to 30 failures
    periodSeconds: 5            # Check every 5 seconds
                                # 30 × 5s = 150 seconds max startup time

  While startup probe is active: liveness probe is SUSPENDED
  Starting Pod → startup probe checks every 5s (up to 150s)
  Spring Boot finishes starting → /actuator/health/liveness returns 200
  startup probe succeeds → switches to liveness probe (running every 30s now)
  
  This gives Spring Boot up to 2.5 minutes to start without liveness interference
```

### How Readiness Affects Service Endpoints

```
Service routes to a pod ONLY while its readiness probe is passing:

healthy pod:
  readiness probe → GET /actuator/health/readiness → 200 OK
  Endpoint controller: adds pod IP to Service Endpoints
  Service: routes traffic to this pod ✓

pod under heavy load (DB connection pool exhausted, upstream service slow):
  readiness probe → GET /actuator/health/readiness → 503 (DB pool not healthy)
  Endpoint controller: removes pod IP from Service Endpoints
  Service: stops routing new requests to this pod
  Pod: finishes processing in-flight requests, then sits idle
  DB connection pool recovers
  readiness probe → 200 OK again
  Endpoint controller: adds pod IP back
  Service: routes traffic to this pod again ✓
  
  Key: kubelet does NOT restart the pod — it's still alive, just not receiving traffic
  Liveness probe (30s period, 3-failure threshold) is still passing

During rolling deployment:
  New pod starts → readiness probe starts failing (Spring Boot loading)
  Service DOES NOT route traffic to new pod
  Old pods continue serving traffic
  Spring Boot finishes → readiness probe passes → pod added to Service
  Only then does Deployment controller remove one old pod
  Zero-downtime is the result
```

---

## 4. The Code

### Wrong Way — Missing or Incorrectly Configured Probes
```yaml
# ❌ WRONG — no probes at all
spec:
  containers:
    - name: payment-service
      image: payment-service:1.0.0
      ports:
        - containerPort: 8080
# Result: Kubernetes sends traffic to the pod the moment the process starts
# All traffic during Spring Boot startup = 503 errors
# Stuck/deadlocked pods receive traffic indefinitely
# Rolling deployments cause brief error spikes
```

```yaml
# ❌ WRONG — liveness fires too early (CrashLoopBackOff)
livenessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 10      # JVM takes 40s to load Spring Boot — 10s is too early
  periodSeconds: 5
  failureThreshold: 3          # 10 + (5 × 3) = 25 seconds — Spring Boot still loading at 25s
                               # Kubernetes kills the pod before it ever starts
```

```yaml
# ❌ WRONG — same health endpoint for both probes
livenessProbe:
  httpGet:
    path: /actuator/health     # This aggregates ALL health indicators
    port: 8080                 # If database pool is momentarily slow → 503 → pod restarted
readinessProbe:
  httpGet:
    path: /actuator/health     # Same endpoint
    port: 8080                 
# A brief DB hiccup → liveness kills the pod → pod restarts → brief DB hiccup → kills again
# Restart loop under exactly the conditions when you need the pod most
```

> **Why this destroys production:** Liveness probes should only fire when the application is truly stuck in an unrecoverable state — not when it's slow or when an upstream dependency is temporarily unhealthy. Using the wrong endpoint for liveness is the most common K8s operational mistake, and it typically shows up as a CrashLoopBackOff during incident response when you can least afford the restarts.

### Right Way — Spring Boot Actuator with Separate Liveness/Readiness Endpoints
```yaml
# Correct probe configuration for Spring Boot on Kubernetes
spec:
  containers:
    - name: payment-service
      image: payment-service:1.1.0
      ports:
        - containerPort: 8080
      
      # STARTUP PROBE — suspends liveness during startup
      # Gives Spring Boot up to 150 seconds to start (30 checks × 5s interval)
      startupProbe:
        httpGet:
          path: /actuator/health/liveness
          port: 8080
        failureThreshold: 30            # Total startup budget: 150 seconds
        periodSeconds: 5
        # No initialDelaySeconds needed — startup probe handles the delay implicitly
      
      # READINESS PROBE — controls traffic routing
      # Only fires after startup probe succeeds
      readinessProbe:
        httpGet:
          path: /actuator/health/readiness
          port: 8080
        initialDelaySeconds: 0          # Startup probe already handled the wait
        periodSeconds: 10               # Check every 10 seconds
        successThreshold: 1             # 1 success → back in service
        failureThreshold: 3             # 3 failures → removed from Service (30 seconds of failures)
        timeoutSeconds: 5               # Consider it failed if no response in 5 seconds
      
      # LIVENESS PROBE — restarts if truly stuck
      # Should fire MUCH less often than readiness — only for genuine unrecoverable states
      livenessProbe:
        httpGet:
          path: /actuator/health/liveness
          port: 8080
        initialDelaySeconds: 0          # Startup probe already handled the wait
        periodSeconds: 30               # Check every 30 seconds — not noisy
        failureThreshold: 3             # 3 failures in a row → restart (90 seconds of failures)
        timeoutSeconds: 10              # Spring Boot health checks can be slow under load
```

```yaml
# application.yml (or application-production.yml) — Spring Boot side
management:
  # Enable the Kubernetes-specific liveness and readiness state actuators
  health:
    livenessState:
      enabled: true              # Exposes /actuator/health/liveness
    readinessState:
      enabled: true              # Exposes /actuator/health/readiness
  
  endpoint:
    health:
      show-details: always       # Show component health details (DB, Redis, etc.)
      probes:
        enabled: true            # Needed for older Spring Boot versions

# What /actuator/health/liveness returns:
# {
#   "status": "UP",
#   "components": {
#     "livenessState": {
#       "status": "CORRECT"      ← Spring Boot liveness state — is the app alive?
#     }
#   }
# }

# What /actuator/health/readiness returns:
# {
#   "status": "UP",
#   "components": {
#     "readinessState": {
#       "status": "ACCEPTING_TRAFFIC"  ← is the app ready for traffic?
#     },
#     "db": {
#       "status": "UP"          ← DB connectivity check
#     },
#     "redis": {
#       "status": "UP"          ← Redis connectivity check
#     }
#   }
# }
```

```java
// Custom health indicator — add your own checks to readiness
// src/main/java/com/sap/payment/health/PaymentGatewayHealthIndicator.java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {
    
    private final PaymentGatewayClient gatewayClient;
    
    public PaymentGatewayHealthIndicator(PaymentGatewayClient gatewayClient) {
        this.gatewayClient = gatewayClient;
    }
    
    @Override
    public Health health() {
        // This check is included in /actuator/health/readiness
        // If it returns DOWN, the pod is removed from Service routing
        // The payment service won't accept new requests when the gateway is down
        try {
            boolean gatewayReachable = gatewayClient.ping();
            if (gatewayReachable) {
                return Health.up()
                    .withDetail("payment-gateway", "reachable")
                    .build();
            } else {
                return Health.down()
                    .withDetail("payment-gateway", "unreachable")
                    .build();
            }
        } catch (Exception ex) {
            return Health.down()
                .withDetail("payment-gateway", "connection error")
                .withException(ex)
                .build();
        }
    }
}
```

```java
// Programmatic liveness/readiness state management
// When you detect a condition requiring graceful shutdown or temporary traffic stop:
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.AvailabilityChangeEvent;
import org.springframework.boot.availability.LivenessState;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class ApplicationStateService {
    
    private final ApplicationEventPublisher eventPublisher;
    
    public ApplicationStateService(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }
    
    // Call this when you detect the app is in an unrecoverable broken state
    // Kubernetes will restart the pod
    public void signalBroken() {
        AvailabilityChangeEvent.publish(
            eventPublisher, this, LivenessState.BROKEN
        );
        // /actuator/health/liveness now returns 503
        // kubelet will kill and restart this pod after failureThreshold consecutive failures
    }
    
    // Call this during graceful shutdown or when temporarily overwhelmed
    // Kubernetes stops sending new requests; in-flight requests complete
    public void acceptTrafficStop() {
        AvailabilityChangeEvent.publish(
            eventPublisher, this, ReadinessState.REFUSING_TRAFFIC
        );
        // /actuator/health/readiness now returns 503
        // Endpoint controller removes this pod from Service; no new requests arrive
    }
    
    // Call this when the pod is ready to accept traffic again
    public void acceptTrafficResume() {
        AvailabilityChangeEvent.publish(
            eventPublisher, this, ReadinessState.ACCEPTING_TRAFFIC
        );
        // /actuator/health/readiness back to 200; pod added back to Service
    }
}
```

> **Key decisions here:**
> - The startup probe is the correct pattern for Spring Boot — NOT a very long `initialDelaySeconds` on liveness; the startup probe gives precise control: "keep checking until the app says it's alive, up to 150 seconds, then switch to liveness"; `initialDelaySeconds` on liveness is a static wait that doesn't adapt to actual startup time
> - Readiness endpoint should check all the application's live dependencies (DB, Redis, upstream APIs) — if the app can't function without them, failing when they're down is correct; liveness endpoint should ONLY check whether the JVM/threads are stuck — it should pass even when upstream deps are briefly down
> - `timeoutSeconds` on the liveness probe should be generous (10s) — Spring Boot's health endpoint can be slow under high load; a timeout that's too tight causes liveness to fail during high-traffic periods, which is exactly when you don't want pod restarts

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between a liveness probe and a readiness probe in Kubernetes?"

**Hruday's answer:**
> Readiness asks: "Should this pod receive traffic right now?" If a readiness probe fails, Kubernetes removes the pod from the Service's endpoint list — traffic stops flowing to it. The pod isn't restarted; it's just quarantined from traffic. This is useful for pods that are starting up, temporarily overloaded, or waiting for a dependency to come back online.
>
> Liveness asks: "Is this pod alive, or is it stuck in an unrecoverable state that requires a restart?" If a liveness probe fails a configured number of times consecutively, kubelet kills the container and restarts it. This handles cases where the application is running but deadlocked — the process is up but can't serve any requests, and the only recovery is a restart.
>
> The important distinction: readiness temporarily withdraws a pod from service; liveness permanently kills and restarts it. Using the wrong probe for the wrong purpose causes real problems — liveness on a readiness scenario causes pods to restart under load, which is the worst time to be down.

---

### Q2 — Deep Dive
**Interviewer asks:** "A Spring Boot pod is in CrashLoopBackOff. The logs show the application is still starting. What's the cause and how do you fix it?"

**Hruday's answer:**
> CrashLoopBackOff with the app still starting is almost always a liveness probe firing before Spring Boot finishes initialising. Spring Boot's startup sequence loads all Spring beans, opens database connections, warms caches, and registers health endpoints — this takes 20-60 seconds for a typical enterprise service.
>
> If the liveness probe is configured with a short `initialDelaySeconds` — say 10 seconds — and Spring Boot takes 40 seconds, the probe fires at 10s, finds no response (Spring Boot hasn't registered the `/actuator/health/liveness` endpoint yet), fails. It fires at 20s, fails. At 30s, fails. After the `failureThreshold` (usually 3), kubelet kills the pod. The pod restarts, the same thing happens — CrashLoopBackOff.
>
> The fix is a startup probe, not increasing `initialDelaySeconds`. I add a startup probe on the liveness endpoint with `failureThreshold: 30` and `periodSeconds: 5` — this gives Spring Boot up to 150 seconds to start. While the startup probe is running, the liveness probe is suspended. Once Spring Boot starts and the health endpoint returns 200, the startup probe succeeds and the liveness probe takes over on its normal schedule.
>
> I confirmed this fix at SAP — we had a service that had worked fine for months and started failing after we added a new database migration step that extended startup time past the liveness probe's threshold. Adding the startup probe resolved the CrashLoopBackOff immediately.

---

### Q3 — Trade-Off
**Interviewer asks:** "Is there a risk to using very aggressive readiness probe settings — like checking every 5 seconds?"

**Hruday's answer:**
> Yes, there are two trade-offs.
>
> First, there's the network overhead — kubelet makes an HTTP request to every pod every 5 seconds on every node. At scale (50 pods), that's 600 probe requests per minute just for readiness probes. Each probe request goes through the JVM's web layer and could run a database check if you've added custom health indicators. At very high frequency, probes can contribute non-trivial load to the application and to the database connection pool.
>
> Second, there's the flapping risk — if the probe endpoint has any latency variance (common when a database query is part of the health check), a probe that times out at 3 seconds might intermittently fail when the DB is at 2.5 seconds response time. This causes the pod to flicker in and out of the Service's endpoints, routing some requests to it while removing others — inconsistent behavior that's hard to diagnose.
>
> The practical balance I use: readiness every 10 seconds, liveness every 30 seconds. Check readiness more often since it controls traffic routing granularity. Check liveness less often since it triggers a disruptive restart. Keep `timeoutSeconds` generous on both — 5s for readiness, 10s for liveness. The goal is detecting genuine problems, not creating false alarms under load.

---

### Q4 — Scenario
**Interviewer asks:** "All pods of a service fail readiness but not liveness. What does this mean in practice and how do you investigate?"

**Hruday's answer:**
> All pods failing readiness but not liveness means the pods are alive (no restart happening) but they've all been removed from the Service's endpoints simultaneously. The Service is routing traffic to zero pods — every request to the service is getting a 503 or connection refused. This is effectively a full outage without a pod crash.
>
> Common causes: a shared dependency failing. If the readiness probe checks the database connection and the database is down, all pods fail readiness at the same time. Another cause: a dependency that the readiness probe checks but liveness doesn't — Redis, an upstream API, the filesystem.
>
> Investigation steps: first, `kubectl get pods -n <ns>` — confirm all pods are Running (not CrashLoopBackOff), which confirms it's a readiness-only issue. Then `kubectl describe pod <pod-name>` — the Events section shows "Readiness probe failed" with the HTTP response or error. Then `kubectl logs <pod-name>` to see if the application is logging errors. The health check endpoint itself often tells you the failing component: `kubectl exec -it <pod-name> -- curl http://localhost:8080/actuator/health/readiness` shows which component is returning DOWN.
>
> Resolution depends on the root cause: if the database is down, fix the database and pods will automatically become ready. If it's a misconfigured health indicator checking something it shouldn't, update the Spring Boot `application.yml` to remove that indicator from the readiness group. Once the root cause is fixed, the readiness probes start passing and pods are automatically readded to the Service endpoints.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use the same /health endpoint for both" | "Just configure both probes to check /actuator/health" | Readiness components (DB, Redis, upstream APIs) should NOT trigger liveness kills; liveness fires on genuinely broken JVM state; use distinct endpoints; Spring Boot provides separate /liveness and /readiness for this reason |
| "Set a long initialDelaySeconds to solve startup problems" | "Set initialDelaySeconds: 120 so Spring Boot has time to start" | Static delay doesn't adapt; if the app starts in 20s the delay wastes 100 seconds on every pod start and deployment; the startup probe is the correct solution — it checks continuously and handoff happens exactly when ready |
| "Readiness probe failure causes restart" | "If the readiness probe fails the pod is restarted" | Readiness probe failure removes the pod from traffic routing — kubelets does NOT restart it; only liveness failure triggers restarts |
| "Probes are optional for development" | "In dev we don't bother with probes" | Without probes, kubectl rollout behaves identically in dev and production — but in production the stakes are real; always test with probes in a development cluster to ensure the probe timing is actually correct before production |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we had a new microservice go into CrashLoopBackOff on its very first deployment to the staging AKS cluster. The pod logs showed Spring Boot was still initialising — loading our multi-datasource configuration — when kubelet killed it. The liveness probe had `initialDelaySeconds: 20` left over from a lighter service and our new service was taking 45 seconds to start. I diagnosed it using `kubectl describe pod` which showed 'Liveness probe failed: HTTP probe failed with statuscode: 503' in the Events section. I replaced `initialDelaySeconds` with a startup probe: `failureThreshold: 30`, `periodSeconds: 5` — giving 150 seconds of startup budget. That resolved the CrashLoopBackOff immediately. We also took the opportunity to add a custom health indicator for our SAP Document Management System integration, so that readiness would fail gracefully if DMS was unreachable, preventing traffic from reaching pods that couldn't serve any document-related requests."

---

## 8. Scale Evolution

**1,000 users/day →** Basic probes — HTTP GET on `/actuator/health/liveness` and `/actuator/health/readiness` with startup probe for Spring Boot startup time. Single pod per service usually. Probes primarily useful for zero-downtime deployments.

**100,000 users/day →** 5-10 pods per service; probe configuration tuned based on measured startup time and response time data; custom health indicators for critical dependencies (DB, Redis, upstream payment APIs); readiness probe prevents traffic reaching overloaded pods during traffic spikes.

**10 million users/day →** 50+ pods per service; probe health is a SRE responsibility separate from feature development; health indicator response times monitored in CloudWatch/Prometheus; probes are part of the formal SLO framework — "pod in service" percentage tracked; custom health indicators for each major dependency; startup probes with warm-up periods for cache-heavy services that need minutes to build their local cache before serving production traffic.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial services — incorrect probes during a high-traffic period (salary day, IPO day) can cause mass pod restarts when you can least afford it; probe configuration is a reliability engineering requirement | Know the liveness/readiness distinction cold; explain why misconfigured probes are dangerous during peak traffic |
| Swiggy / Meesho | Rolling deployments several times per day; probe timing directly impacts deployment bumpiness; engineering culture tests probe configuration in CI | Explain how readiness probes make rolling updates safe; startup probe for Spring Boot |
| Adobe / Microsoft | Enterprise Kubernetes clusters serving millions of users; liveness kill storms (all pods liveness-failing simultaneously) have caused production incidents; senior engineers expected to know probe design | Discuss the risk of aggressive liveness settings; explain the startup probe pattern |
| SAP Labs | AKS-based services with Spring Boot; a CrashLoopBackOff caused by probe timing was a real incident; senior engineers are expected to diagnose probe issues without assistance | Direct experience diagnosing and fixing probe-related CrashLoopBackOff |

---

## 10. Related Topics — What to Study Next

- **Topic 186 — Deployments, ReplicaSets, Services** — readiness probes are what make rolling updates safe; the Deployment controller waits for new pod readiness before removing old pods; without probes, `maxUnavailable: 0` provides no protection since Kubernetes doesn't know the pod is unready
- **Topic 189 — Horizontal Pod Autoscaler** — HPA scales based on CPU/memory metrics from the metrics-server; pods removed from Service endpoints by readiness failures don't stop the HPA from counting them in the replica calculation; understanding the interaction between readiness and autoscaling is important for sizing
- **Topic 198 — CloudWatch Logs, Metrics, Alarms** — the readiness probe health endpoint responses can be scraped into Prometheus/CloudWatch as metrics; trending "readiness failures per hour" is a leading indicator of infrastructure problems; liveness kill events should be alerted on separately
- **Spring Boot Actuator** — the foundation for K8s probes in Spring Boot; `spring-boot-starter-actuator` dependency adds `/actuator/health` and its sub-paths; `management.health.livenessState.enabled=true` enables the K8s-specific endpoints; default group memberships determine which components affect liveness vs readiness

---

*Part 11 · Liveness and Readiness Probes · Full Stack Interview Guide · Hruday D · 2026*
