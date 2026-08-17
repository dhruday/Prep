# Auto-Scaling Strategies
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Auto-scaling** = automatically adjusting the number of running server instances based on observed demand. Scale out when demand rises, scale in when demand falls. The goal: always have enough capacity to serve traffic without over-provisioning (wasting money when traffic is low).
- **Horizontal Pod Autoscaler (HPA)** is the Kubernetes way: watches a metric (CPU, memory, or custom), calculates the desired replica count, and instructs the Kubernetes control plane to add or remove pods. Response time: ~2-3 minutes from metric breach to new pod fully serving traffic (metric collection → HPA reaction → pod schedule → pod start → readiness check).
- **Reactive scaling**: scale in response to a metric that is already elevated. Simple to set up. Works for gradual ramp-ups. Fails for sudden spikes (HPA can't add 10 pods in 30 seconds if the spike lasts 2 minutes).
- **Predictive / scheduled scaling**: add capacity BEFORE the spike arrives. Use CronJob-based scaling (pre-scale Order Service to 20 pods at 11:30 AM, scale back at 2:30 PM). Works for predictable patterns (lunch rush, salary-day payments, month-end close reports).
- **Queue-depth-based scaling**: scale consumers based on how many messages are waiting in a Kafka topic or SQS queue. If Kafka consumer lag > 10,000 messages: add more consumer pods. This decouples write-rate (how fast producers publish) from process-rate (how fast consumers can handle the load) and avoids DB overload during spikes.
- **Scale-in conservatively, scale-out aggressively**: the principle. Scale out fast (traffic spike hits NOW — respond immediately). Scale in slowly (avoid oscillation — if you remove pods immediately when traffic drops, then it spikes again 30 seconds later and you have to spin them back up). HPA stabilisation windows: scale-up stabilisation = 30s (react fast), scale-down stabilisation = 5 minutes (cautious).
- **Cold-start problem**: a newly launched pod takes 30-60 seconds to be ready for traffic (JVM startup, Spring context init, readiness probe). During this 30-60 second cold-start window, the pod can't absorb traffic. For sudden spikes, this window is too slow. Mitigation: keep minimum replicas above zero baseline, use GraalVM native images for faster startup, or keep "warm" spare pods alive.

---

## 1. One-Line Definition
Auto-scaling automatically adjusts the number of running instances based on demand metrics (CPU, queue depth, custom business metrics), scaling out to handle load increases and scaling in to reduce cost when demand decreases.

---

## 2. The Problem It Solves

### The Cost-vs-Reliability Dilemma Without Auto-Scaling

```
SCENARIO: Swiggy's Order Service.
          Traffic pattern:
          2 AM  - 7 AM:  50 orders/minute (overnight low)
          7 AM  - 11 AM: 200 orders/minute (breakfast ramp)
          11 AM - 2 PM:  800 orders/minute (LUNCH RUSH PEAK)
          2 PM  - 6 PM:  300 orders/minute (post-lunch normal)
          6 PM  - 10 PM: 600 orders/minute (DINNER RUSH PEAK)
          10 PM - 2 AM:  150 orders/minute (evening decline)
          Each pod handles 150 orders/minute.

WITHOUT AUTO-SCALING:
  Option A: Provision for PEAK (800/min ÷ 150 = 6 pods minimum)
  
    2 AM - 7 AM:  6 pods, 50 orders/min → 5 pods idle (83% wasted capacity)
    11 AM:        6 pods, 800 orders/min → fully utilised ✅
    2 PM:         6 pods, 300 orders/min → 4 pods idle (67% wasted capacity)
    
    Average pod utilisation: ~35% of the time at actual capacity
    Cost per month: 6 pods × $50/pod/month = $300/month
    
  Option B: Provision for AVERAGE (~300/min → 2 pods)
  
    11 AM:        2 pods, 800 orders/min → capacity exceeded by 400%
                  POST /orders → 503 Service Unavailable (revenue loss)
                  
  Conclusion: under-provision = outages; over-provision = waste.
  Either option is wrong.

WITH AUTO-SCALING:
  2 AM  - 7 AM:  HPA scales to 1 pod (50/min, CPU at 33%)  → $50/month equivalent
  11 AM:         HPA scales to 6 pods at 11:00 AM (CPU alarm fires)
                 [BUT: lunch rush starts at 11:00 AM and HPA needs 2-3 min to scale]
                 → use predictive scaling: pre-scale to 6 pods at 10:45 AM via CronJob
  2 PM:          HPA scales back to 2 pods (5-min scale-down stabilisation)
  6 PM:          Pre-scale to 5 pods at 5:45 PM (predictive)
  10 PM:         Scales back to 2 pods
  
  Average cost: ~2.5 pods equivalent over 24 hours = $125/month (vs $300/month)
  58% cost reduction. Zero outages at peak.
```

---

## 3. How It Works Internally

### HPA Algorithm — How It Calculates Desired Replica Count

```
HPA SCALING FORMULA:

desiredReplicas = ceil(currentReplicas × (currentMetricValue / targetMetricValue))

Example 1 — Scaling up:
  currentReplicas = 3
  currentCPUUtilization = 80%
  targetCPUUtilization = 60%
  
  desiredReplicas = ceil(3 × (80 / 60))
                 = ceil(3 × 1.333)
                 = ceil(4.0)
                 = 4 pods
  
  → Kubernetes schedules 1 new pod

Example 2 — Scaling down:
  currentReplicas = 6
  currentCPUUtilization = 20%
  targetCPUUtilization = 60%
  
  desiredReplicas = ceil(6 × (20 / 60))
                 = ceil(6 × 0.333)
                 = ceil(2.0)
                 = 2 pods
  
  → HPA wants to scale down to 2
  → Scale-down stabilisation window (5 min): must stay below target for 5 min
  → After 5 minutes confirmed: terminate 4 pods gracefully
  → SIGTERM → 30s drain → SIGKILL if not finished

HPA METRICS TYPES:
  1. Resource metrics (CPU, memory) — built-in, no extra setup
     Target: AverageUtilization: 60 (across all pods)
     
  2. Custom metrics (application-level) — requires Prometheus Adapter
     Examples:
     - requests per second (RPS) — "keep average RPS below 1000 per pod"
     - Kafka consumer lag — "add pods if lag > 10,000 messages"
     - active database connections — "keep active connections below 80 per pod"
     - queue depth (SQS, RabbitMQ) — "1 pod per 500 queued messages"
```

### Queue-Depth-Based Scaling (KEDA)

```
KEDA (Kubernetes Event-Driven Autoscaling):
Kubernetes controller that scales based on external event queue depth.

USE CASE: Kafka consumer group scaling
  Kafka topic: payment-events
  Consumer group: payment-processor
  
  Without autoscaling: always run 5 consumer pods
  Problem: at 2 AM, 5 pods process 5 messages/minute each (very inefficient)
           At 12 PM Salary Day, Kafka lag grows to 500,000 messages (overwhelmed)
  
  With KEDA:

apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: payment-consumer-scaler
spec:
  scaleTargetRef:
    name: payment-processor   # Kubernetes Deployment to scale
  minReplicaCount: 0          # ✅ Scale to ZERO at 2 AM (zero cost!)
  maxReplicaCount: 50         # ✅ Up to 50 consumers for Salary Day
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-cluster:9092
        consumerGroup: payment-processor
        topic: payment-events
        lagThreshold: "100"   # ✅ Target: each pod processes at most 100 lagged messages
        activationLagThreshold: "5"  # Start scaling from 0 when lag > 5

KEDA logic:
  desiredReplicas = ceil(consumerGroupLag / lagThreshold)
  lag=0:         desiredReplicas = 0 (scale to zero — zero cost)
  lag=500:       desiredReplicas = ceil(500/100) = 5
  lag=5000:      desiredReplicas = ceil(5000/100) = 50
  lag=500,000:   desiredReplicas = min(ceil(5,000,000/100), maxReplicas=50) = 50

BENEFIT:
  2 AM overnight: 0 pods running (no Kafka messages → zero cost)
  12 PM Salary Day: automatically scales to 50 pods within 2-3 minutes as lag grows
  1 PM: lag cleared → scales back down to 0 over 5 minutes
```

### Predictive Scaling with CronJob

```
KUBERNETES CRONJOB-BASED SCHEDULED SCALING (Predictive):

Method: use a Kubernetes CronJob that patches the Deployment's replica count
directly before the predicted traffic spike

apiVersion: batch/v1
kind: CronJob
metadata:
  name: pre-scale-lunch-rush
spec:
  schedule: "30 10 * * *"  # 10:30 AM IST daily (30 min before 11 AM lunch rush)
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: scaler-sa  # SA with permission to patch Deployments
          containers:
            - name: scaler
              image: bitnami/kubectl:latest
              command:
                - kubectl
                - patch
                - deployment
                - order-service
                - -p
                - '{"spec":{"replicas":15}}'  # Pre-scale to 15 pods
---
# Scale back down after lunch rush
apiVersion: batch/v1
kind: CronJob
metadata:
  name: post-scale-lunch-rush
spec:
  schedule: "0 14 * * *"   # 2:00 PM IST (after lunch rush)
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: scaler-sa
          containers:
            - name: scaler
              image: bitnami/kubectl:latest
              command:
                - kubectl
                - patch
                - deployment
                - order-service
                - -p
                - '{"spec":{"replicas":5}}'  # Scale back to baseline 5 pods
                
Note: HPA still runs alongside — if lunch rush is heavier than expected,
       HPA will scale beyond 15 as needed (up to maxReplicas=30)
       If lighter, HPA may scale back from 15 to 10 pods
```

---

## 4. The Code

### ❌ Wrong Way — No Scaling Configuration with Hard Limits

```yaml
# ❌ WRONG: Static replica count, no HPA, will fail under load

apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3   # ❌ Always 3 pods — can't handle 10x lunch rush
  template:
    spec:
      containers:
        - name: order-service
          image: swiggy/order-service:v1.2
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            # ❌ No limits: a memory leak can consume all node memory
            # and kill OTHER pods on the same node ("noisy neighbour")
          # ❌ No readinessProbe: traffic sent to pods before they're ready
          # (Spring Boot context init takes 20-30 seconds)
          # Result: 503 errors during pod startup
          
# ❌ No HPA defined.
# At lunch rush: 3 pods handle 450 orders/minute max
# Actual demand: 800 orders/minute
# Result: 43% requests rejected or timed out
```

---

### ✅ Right Way — HPA with Custom Metrics and Proper Pod Config

```yaml
# ✅ CORRECT: Deployment with resource limits + readiness probes

apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3   # Initial replica count (HPA will manage this dynamically)
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2          # Add up to 2 extra pods during deployment
      maxUnavailable: 0    # ✅ Zero downtime deployment — never remove pod until new one ready
  template:
    spec:
      containers:
        - name: order-service
          image: swiggy/order-service:v1.2
          resources:
            requests:
              cpu: "500m"        # 0.5 CPU requested for scheduling
              memory: "512Mi"    # 512MB requested
            limits:
              cpu: "1000m"       # ✅ CPU limit: prevents noisy neighbour
              memory: "1024Mi"   # ✅ Memory limit: OOMKill this pod before killing neighbours

          # ✅ Readiness probe: pod only receives traffic when Spring context is ready
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 25   # Give Spring Boot 25s to start
            periodSeconds: 5
            failureThreshold: 3       # 3 consecutive failures → remove from rotation

          # ✅ Liveness probe: restart pod if JVM is completely unresponsive
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60   # Higher delay: allow Spring context to fully start
            periodSeconds: 10
            failureThreshold: 3

          # ✅ Graceful shutdown: drain in-flight requests before shutdown
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]  # Drain for 10s before SIGTERM

      terminationGracePeriodSeconds: 45
```

```yaml
# ✅ HPA with CPU + custom metric (RPS per pod)

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service

  minReplicas: 3    # ✅ Always at least 3 (spans 3 AZs for zone fault tolerance)
  maxReplicas: 30   # ✅ Cost cap — max spend limit

  metrics:
    # ✅ Primary scaling metric: CPU utilisation
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60   # Scale up when pods average 60% CPU

    # ✅ Custom metric: RPS per pod (from Prometheus via Custom Metrics API)
    # More direct than CPU — CPU can be high from non-request work
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "150"   # Each pod should handle at most 150 req/sec

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30    # ✅ React fast to rising traffic (30s)
      policies:
        - type: Pods
          value: 5                      # Add at most 5 pods per scale event
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300   # ✅ Wait 5 minutes before scaling down (avoid oscillation)
      policies:
        - type: Pods
          value: 2                      # Remove at most 2 pods per scale event
          periodSeconds: 120
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Scaling Dilemma
**Interviewer asks:** "Why is scale-down riskier than scale-up, and how does HPA handle it?"

**Hruday's answer:**
> Scale-up risk is straightforward: if it's too slow, you have an outage during the gap between traffic spike and new pods being ready. You address that with readiness probes and pre-scaling.
>
> Scale-down risk is subtler and often worse: premature scale-down causes oscillation, which is far more damaging than just slightly over-provisioning. Here's the failure mode — traffic drops after lunch rush, HPA scales from 10 pods to 3. 3 pods are handling the reduced load at 40% CPU. Then a small second spike arrives — 3 pods jump to 80% CPU. HPA triggers scale-up again. New pods take 45 seconds to start. During those 45 seconds, 3 pods are overloaded. Requests time out. Then 7 new pods start, CPU drops, HPA scales them back down. The cycle repeats every few minutes — this is oscillation, and it creates intermittent outages that are very hard to diagnose.
>
> HPA addresses this with the scale-down stabilisation window. In our configuration: `stabilizationWindowSeconds: 300`. This means HPA will NOT scale down unless the metric has been below target for 5 consecutive minutes. If traffic dips briefly and then comes back up, the 5-minute window hasn't elapsed and no pods are removed. Only a sustained, genuine drop in traffic triggers scale-down. This matches reality: lunch rush ends gradually, not in a sudden cliff.
>
> The asymmetry is intentional: scale-up stabilisation is 30 seconds (respond fast to genuine spikes); scale-down stabilisation is 5 minutes (be cautious about removing capacity). The asymmetry errs on the side of availability.

---

### Q2 — Queue-Based Scaling
**Interviewer asks:** "If you have a Kafka consumer group processng payment events, how would you auto-scale the consumer pods?"

**Hruday's answer:**
> I'd use KEDA — Kubernetes Event-Driven Autoscaling. It's a controller that adds an autoscaling trigger type for Kafka consumer group lag. Here's why Kafka consumer lag is a better metric than CPU for this use case: when messages arrive in bursts, the consumer pods' CPU might not spike immediately (they're waiting for messages), but the lag grows. Scaling on lag means "how long will users wait for their payment to be processed?" — which is the right business metric. CPU tells you what the pods are doing now; lag tells you how much backlog has accumulated.
>
> The KEDA ScaledObject would have a Kafka trigger with `lagThreshold: 100` — meaning each pod is responsible for at most 100 unprocessed messages. If the lag is 2,000 messages: `ceil(2000/100) = 20 pods`. As consumers drain the queue, lag drops and pods scale down.
>
> The key parameter is `minReplicaCount: 0` — this scales the deployment to zero pods when there are no messages. At 3 AM when no payments are being processed, zero consumer pods run, zero compute cost. This is fundamentally different from HPA which only scales to `minReplicas` (which must be at least 1). KEDA enables true zero-to-N scaling for event-driven workloads.
>
> One caveat: the lag threshold must account for message processing time. If each payment message takes 200ms to process, each pod can handle 5 messages/second = 300 messages/minute. If the expected SLA is "all messages processed within 60 seconds," each pod must clear 300 messages in 60 seconds. With `lagThreshold=300`: KEDA keeps one pod per 300 messages in the queue, which maintains the 60-second processing SLA.

---

### Q3 — The Cold Start Problem
**Interviewer asks:** "HPA scales out new pods, but there's a delay before they can serve traffic. How do you minimise this?"

**Hruday's answer:**
> The cold-start window in a typical Spring Boot application is 30-60 seconds: the JVM starts, Spring's dependency injection container initialises all beans, database connection pools are established, and then the readiness probe starts passing. During this window, the load balancer correctly keeps the pod out of rotation — but that 45-second window is real dead time when you're waiting for scale-out capacity.
>
> Four strategies to address this. First, the Kubernetes readiness probe: set `initialDelaySeconds` appropriately for your application. Our Spring Boot services take about 25 seconds to fully start — so `initialDelaySeconds: 25, periodSeconds: 5`. The pod starts receiving traffic within 25-30 seconds rather than the default 3-second delay (which causes early failures when the app isn't ready).
>
> Second, keep `minReplicas` higher than strictly necessary. For a lunch-rush service, keep 3 pods running overnight instead of 1. The 3-pod baseline means the load balancer always has warm pods. Scale-out still helps but you start from a healthier baseline.
>
> Third, pre-scale with CronJob-based scheduled scaling. At 10:30 AM, scale to 15 pods — 30 minutes before the 11 AM lunch rush. All 15 pods have their full 45-second startup completed before traffic arrives. This eliminates the cold-start window entirely for predicted spikes.
>
> Fourth, for services with extreme cold-start sensitivity: use GraalVM native image compilation. A Spring Boot native image binary starts in under 1 second (no JVM startup, no reflection warm-up). The tradeoff is longer build times and some Spring features need extra annotation hints. For our SAP Labs services, we evaluated native images for the payment notification service — startup dropped from 30 seconds to 800ms. That's appropriate when every second of cold-start matters.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Scale to zero means free" | "With scale to zero, costs drop to nothing overnight" | "Scale to zero eliminates compute cost but doesn't eliminate storage, network, and the latency cost of the first warm-up request. The first request to a zero-scaled service takes 30-60 seconds (cold start) — which is a terrible user experience for user-facing APIs. Scale to zero is appropriate for batch consumer pods (Kafka consumer that processes overnight jobs) and for dev/staging environments. For prod APIs: keep minimum replicas at a warm baseline. Scale to zero is a KEDA feature for event-driven workloads, not a general API scaling strategy." |
| "HPA based on CPU is best" | "I'd set up HPA with CPU at 70% threshold" | "CPU is a lagging indicator. When a Kafka consumer is waiting for messages (idle blocking on poll()), CPU is near 0 but the work isn't getting done — Kafka lag is growing. When a Spring Boot API is I/O-bound (waiting for DB query), CPU is low but users are experiencing slow responses. Use custom metrics that directly measure the constraint: RPS per pod (measures request throughput), p99 latency (measures user experience), queue lag (measures backlog), active DB connections (measures DB pressure). CPU is a decent proxy for CPU-bound compute services, but I/O-bound services are better scaled on request throughput or queue depth." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we had a SAP CFIN report generation service that was relatively quiet during the day but got hammered during month-end financial close — 48 hours where every finance manager generates detailed reports for monthly books. Before auto-scaling, we ran 10 pods permanently (needed for month-end), paying for them 100% of the time even though normal daily load needed only 2 pods.
>
> We implemented two changes. HPA with CPU target 60% (takes care of day-to-day fluctuations). And a CronJob-based scheduled scale: on the 28th of each month at 6 PM, scale to 12 pods (ahead of month-end close which starts the next morning). On the 3rd of the month, scale back to 2. This reduced month-to-month compute cost by 63% while guaranteeing zero degradation during the month-end window. The key insight: HPA alone would have been too slow (metric alert → HPA reaction → pod start → readiness → 3 minutes total). Month-end starts with hundreds of concurrent report requests in the first 5 minutes. Pre-scaling ensures those pods are warm before the first request arrives."

---

## 8. Scale Evolution

**1,000 users →** No auto-scaling. Static 2-pod deployment. Manual scaling if needed. HPA is over-engineering for this traffic level.

**100,000 users →** HPA on CPU (60% target), minReplicas=3, maxReplicas=20. Scale-up stabilisation 30s, scale-down 5 minutes. Readiness probes properly configured. CronJob pre-scaling for known daily spikes (lunch rush, EOD batch). Redis and DB connection pool sizing to match max replica count.

**10 million users →** KEDA for Kafka consumers (scale to zero overnight, scale to 100 during business peaks). HPA for API pods with custom RPS metric (from Prometheus). Predictive auto-scaling using ML-based traffic forecasting (AWS Predictive Scaling or custom Prometheus-based forecast). Multi-region: each region scales independently. Spot instances (2-3x cheaper) for non-critical workers with graceful shutdown handling. Zero-downtime rolling deployments with `maxUnavailable: 0` always.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Salary day (25th of each month): payment API gets 20x normal load. HPA + predictive CronJob scaling. KEDA for payment event processing consumers (Kafka lag). Real-time monitoring: alarm if HPA can't scale fast enough before pod count maxReplicas is hit. | "On the 25th of each month (India salary day), Razorpay's transaction volume spikes to 20x normal. How do you auto-scale the payment API to handle this?" |
| Swiggy / Meesho | Lunch and dinner rush HPA. Flash sale scaling (KEDA on order-placed Kafka topic) for Meesho. Scale to zero for overnight batch services. Predictive scaling for weekend vs weekday patterns. | "Swiggy's Order Service needs to go from 3 pods to 15 pods within 2 minutes of lunch rush starting. HPA takes 3 minutes. How do you close the gap?" |
| Adobe / Microsoft | Adobe rendering: KEDA on SQS render job queue (scale based on number of files queued). Microsoft Azure Autoscale: VM Scale Sets for compute-heavy workloads. Azure Functions scale to zero for event-triggered workloads. Azure AKS HPA for microservices. | "Adobe needs to process 100,000 user-uploaded documents during a campaign launch. Each processes in 1 second. You have 10 worker pods now. How do you auto-scale to finish in 5 minutes?" |
| SAP Labs (current) | SAP CFIN month-end: CronJob pre-scaling. Normal days: HPA. SAP BTP microservices: HPA with CPU metric. CFIN event processing (Spring Kafka): scale consumers based on Kafka lag with KEDA. KEDA available on SAP BTP Kyma runtime (SAP's managed Kubernetes). | "SAP's financial reporting service is used 24/7 by 50 finance users normally but by 500 users during the 48-hour month-end close window. How do you auto-scale without over-provisioning year-round?" |

---

## 10. Related Topics — What to Study Next

- **Topic 145 — Horizontal vs Vertical Scaling** — auto-scaling is automated horizontal scaling; this topic explains the foundational trade-offs between horizontal and vertical growth, and why auto-scaling only works for the horizontal dimension (you can't auto-scale the size of a single machine mid-request without downtime)
- **Topic 146 — Stateless Services** — auto-scaling adds and removes instances dynamically; this only works cleanly if services are stateless; a new pod that joins mid-traffic must be immediately capable of handling any user's request — which requires session state to be in Redis (not in any particular pod's memory), confirming that statelessness is a prerequisite for auto-scaling to work correctly
- **Topic 150 — Single Point of Failure** — auto-scaling sets a minimum replica count (minReplicas: 3) to ensure no single pod failure causes an outage; the minimum replica count spans 3 Availability Zones, so infrastructure failure in one AZ still leaves 2 pods running in other AZs; auto-scaling and SPOF elimination overlap in the minimum replica count decision
- **Topic 154 — SLI, SLO, SLA** — auto-scaling targets are derived from SLOs; if the SLO is "p99 latency < 500ms," the HPA target CPU percentage is calibrated to keep enough pods running so p99 stays below 500ms at peak load; scaling decisions are meaningless without defined performance targets — SLOs make auto-scaling thresholds objective rather than guesswork

---

*Part 8 · Auto-Scaling Strategies · Full Stack Interview Guide · Hruday D · 2026*
