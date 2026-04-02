# Horizontal Pod Autoscaler
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What HPA does**: watches a metric (CPU usage, memory, custom Kafka lag); when the metric exceeds the target, scales the Deployment up (adds pods); when traffic drops and the metric falls, scales down; all automatic, no human intervention
- **HPA formula**: `desiredReplicas = ceil(currentReplicas × (currentMetricValue / targetMetricValue))`; if 4 pods running at 80% CPU average, target 50%: `ceil(4 × 80/50) = ceil(6.4) = 7 pods`
- **Scale-up is fast, scale-down is slow (deliberately)**: scale-up happens quickly to handle demand spikes; scale-down has a 5-minute stabilization window (default) to prevent thrashing — traffic could spike again immediately after scaling down
- **CPU-based HPA requires resource requests**: HPA compares current usage against the pod's `resources.requests.cpu`; without resource requests defined, HPA has no baseline to compare and won't work
- **KEDA (Kubernetes Event-driven Autoscaling)**: extends HPA with custom metrics — scale based on Kafka consumer lag, SQS queue depth, Redis list length, Prometheus metrics; far more useful for backend services than pure CPU scaling
- **VPA vs HPA**: HPA changes pod count (scaling out); VPA changes pod CPU/memory requests (scaling up per pod); use HPA for stateless services, VPA for databases/workers where you can't just add more replicas
- 🆕 **Gap topic for Hruday**: "I understand HPA conceptually and have seen it configured at SAP. I'm building depth on KEDA for Kafka-based autoscaling — directly relevant to my Spring Kafka experience"

---

## 1. One-Line Definition
The Horizontal Pod Autoscaler automatically adjusts the number of pod replicas in a Deployment based on observed metrics — CPU utilisation, memory, or custom metrics like Kafka consumer lag — without any manual intervention.

---

## 2. The Problem It Solves

Traffic to web services is not constant. A payment service might handle 100 requests per second at 9am and 2,000 requests per second at 9pm (salary day, shopping events). A Kafka consumer might have 0 pending messages overnight and 500,000 messages backed up during a peak event.

Without autoscaling, you have two bad options: run enough replicas to handle the worst-case load at all times (expensive — you're paying for 20 pods at 3am when 2 would suffice), or run a minimal fleet and accept degraded performance during peaks (poor user experience, potential SLA breaches).

HPA solves this by continuously monitoring resource metrics and adjusting the pod count. During peak load, more pods share the work, keeping per-pod CPU utilisation below the threshold and preventing latency from climbing. During off-peak hours, unused pods are terminated, reducing cost.

The business impact is direct: at Swiggy, ordering traffic spikes 5-10× during dinner hours. Over-provisioning for peak 24/7 multiplies infrastructure cost by 5-10×. HPA (or KEDA on queue depth) allows the cluster to scale precisely with demand, cutting infrastructure cost while maintaining the performance needed during peak.

---

## 3. How It Works Internally

### The HPA Control Loop

```
HPA controller (runs in kube-controller-manager):
  Every 15 seconds:
    1. Get current replica count from Deployment
    2. Query metrics-server for current CPU/memory usage per pod
    3. Calculate desired replicas: ceil(currentReplicas × (currentMetric / targetMetric))
    4. Compare desired to current
    5. If different: call apiserver to update Deployment.spec.replicas
    6. Deployment controller scales the ReplicaSet accordingly
    
metrics-server:
  Runs on the cluster (kube-system namespace)
  Collects CPU and memory from kubelet's cAdvisor on each node
  Aggregates per-pod resource usage
  HPA queries metrics-server for the data

For custom metrics (KEDA or Prometheus adapter):
  KEDA/Prometheus adapter runs in the cluster
  Exposes custom metrics via the Kubernetes custom.metrics API
  HPA (or KEDA ScaledObject) queries this API for Kafka lag, SQS depth, etc.
```

### Scaling Formula in Practice

```
Scenario: payment-service handling salary day traffic

   Time   | Avg CPU | Current Pods | Target CPU | Calculation                 | New Pods
   --------|---------|--------------|------------|-----------------------------|---------
   09:00   | 30%     | 3            | 60%        | ceil(3 × 30/60) = ceil(1.5) | 2 (min: 2)
   12:00   | 55%     | 3            | 60%        | ceil(3 × 55/60) = ceil(2.75)| 3 (no change)
   17:00   | 75%     | 3            | 60%        | ceil(3 × 75/60) = ceil(3.75)| 4
   18:00   | 90%     | 4            | 60%        | ceil(4 × 90/60) = ceil(6.0) | 6
   19:00   | 95%     | 6            | 60%        | ceil(6 × 95/60) = ceil(9.5) | 10
   20:00   | 70%     | 10           | 60%        | ceil(10 × 70/60) = ceil(11.7)| 12
   22:00   | 45%     | 12           | 60%        | ceil(12 × 45/60) = ceil(9.0)| 9 (scale-down stabilization active)
   23:00   | 25%     | 9            | 60%        | ceil(9 × 25/60) = ceil(3.75)| 4 (after 5min stabilization)
   01:00   | 15%     | 4            | 60%        | ceil(4 × 15/60) = ceil(1.0) | 2 (min: 2)
   
   Note: scale-down is slower than scale-up due to the 5-minute stabilization window
   Kubernetes holds the highest desired replica count for 5 minutes before scaling down
   This prevents: rapid scale-up, immediate traffic spike, scale-down, spike again → thrashing
```

### KEDA — Scale on What Actually Matters

```
CPU-based HPA problem for Kafka consumers:
  A Kafka consumer reading 1 msg/s uses ~15% CPU
  A Kafka consumer reading 1000 msg/s uses ~40% CPU
  CPU target of 60% → Kubernetes thinks you're fine at 40% CPU
  But you have 500,000 messages in the topic and 1 consumer!
  The queue is growing faster than you're consuming

KEDA solves this:
  Scale trigger: Kafka topic consumer group lag
  Target: 1000 messages per consumer pod
  Current lag: 500,000 messages
  Desired replicas: ceil(500,000 / 1000) = 500 (capped at maxReplicas)
  
  KEDA ScaledObject watches Kafka consumer lag via Kafka admin client
  As lag decreases (consumers catch up), KEDA scales down
  At lag = 0: KEDA scales to 0 pods (scale-to-zero — not possible with standard HPA)
```

---

## 4. The Code

### Wrong Way — Static Replica Count for Variable Traffic
```yaml
# ❌ WRONG — hardcoded replicas, no autoscaling
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 10               # Sized for peak — but it's 3am, traffic is 10% of peak
  template:                  # Paying for 10 pods 24/7 to handle peak load 2 hours/day
    spec:
      containers:
        - name: payment-service
          # No resource requests!
          # Even if HPA was configured, it wouldn't work without requests.cpu
```

```bash
# ❌ WRONG — manual scaling in response to incidents
# Engineer gets paged at 8pm: "Service is degrading!"
kubectl scale deployment payment-service --replicas=20

# 3am: forgot to scale back down
# Paying for 20 pods all night

# Next morning: another engineer scales down
kubectl scale deployment payment-service --replicas=3
# But now it's lunch hour and traffic is already rising...
# Manual reaction is always behind the demand curve
```

> **Why this is costly and unreliable:** Manual scaling introduces human delay (paging an engineer, confirming the issue, executing the command) that can take 10-30 minutes — ample time for SLA breaches. Over-provisioning for peak 24/7 multiplies infrastructure cost. Under-provisioning for off-hours causes incidents. Autoscaling with correct thresholds removes the human reaction time entirely.

### Right Way — HPA with Properly Configured Resource Requests
```yaml
# deployment.yaml — resource requests are REQUIRED for CPU-based HPA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payment
spec:
  replicas: 3                  # Starting replica count — HPA will override this
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment-service
          image: payment-service:1.1.0
          resources:
            requests:
              cpu: "250m"       # HPA bases its calculation on this value
              memory: "256Mi"   # "I need at least 250 millicores"
            limits:
              cpu: "500m"       # CPU is throttled (not killed) above this
              memory: "512Mi"   # Pod is OOM-killed above this
```

```yaml
# hpa.yaml — CPU-based autoscaling (classic pattern)
apiVersion: autoscaling/v2                # Use v2 — v1 only supports CPU
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: payment
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service               # Points to the Deployment to scale
  
  minReplicas: 2                        # Never go below 2 — maintain minimum availability
  maxReplicas: 20                       # Never exceed 20 — protect the database from too many connections
  
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60        # Target: keep average CPU utilisation at 60%
                                        # HPA scales up when average exceeds 60%
                                        # HPA scales down when average drops well below 60%
    
    # Add memory-based scaling alongside CPU:
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70        # Also scale if memory is running high
  
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0    # Scale up immediately (no stabilization)
      policies:
        - type: Pods
          value: 4                     # Add at most 4 pods per scaling event
          periodSeconds: 60
        - type: Percent
          value: 100                   # Or double the pod count — whichever is larger
          periodSeconds: 60
      selectPolicy: Max                # Use the policy that allows faster scale-up
    
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
        - type: Pods
          value: 2                     # Remove at most 2 pods per scaling event
          periodSeconds: 120           # Per 2 minutes — gradual scale-down
```

```yaml
# keda-scaledobject.yaml — KEDA for Kafka consumer lag (production pattern for event-driven services)
# Requires KEDA installed in the cluster: helm install keda kedacore/keda
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: payment-event-consumer-scaledobject
  namespace: payment
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-event-consumer        # Your Spring Kafka consumer Deployment
  
  minReplicaCount: 1                    # Keep 1 replica always running (warm)
  maxReplicaCount: 50                   # Maximum 50 consumer pods
  
  # Optional: scale to 0 when no messages (good for batch jobs, not always good for services)
  # minReplicaCount: 0                  # KEDA can scale to 0 and back to 1 when messages arrive
  
  cooldownPeriod: 300                   # Wait 5 min after last scale event before scaling down
  pollingInterval: 15                   # Check Kafka lag every 15 seconds
  
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-broker:9092         # Kafka broker address
        consumerGroup: payment-processing-group     # Your Spring Kafka consumer group
        topic: payment-events                       # The topic being consumed
        lagThreshold: "100"                         # 1 pod per 100 messages of lag
                                                    # 5000 lag → 50 pods (capped at maxReplicaCount)
        offsetResetPolicy: latest
      authenticationRef:
        name: keda-kafka-credentials                # KEDA TriggerAuthentication for SASL/TLS
```

```yaml
# For VPA — adjusting pod SIZE rather than pod count
# Use for stateful workloads where you can't just add replicas
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: payment-service-vpa
  namespace: payment
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  updatePolicy:
    updateMode: "Off"         # "Off" = VPA only recommends, doesn't apply automatically
                              # "Auto" = VPA evicts and recreates pods with new requests
                              # Start with "Off" in production — review recommendations first
  resourcePolicy:
    containerPolicies:
      - containerName: payment-service
        minAllowed:
          cpu: "100m"
          memory: "128Mi"
        maxAllowed:
          cpu: "2"
          memory: "4Gi"
```

```bash
# Check HPA status — see current metrics and replica counts
kubectl get hpa payment-service-hpa -n payment
# NAME                   REFERENCE                       TARGETS          MINPODS  MAXPODS  REPLICAS
# payment-service-hpa    Deployment/payment-service      45%/60%          2        20       4
#                                                         ^current/target

# Watch HPA in real time
kubectl get hpa payment-service-hpa -n payment -w

# Describe for full details including recent events
kubectl describe hpa payment-service-hpa -n payment
# Events show scaling decisions and reasons

# Check KEDA ScaledObject status
kubectl get scaledobject payment-event-consumer-scaledobject -n payment
# NAME                                    READY   ACTIVE   FALLBACK   MIN   MAX   DESIRED   AGE
# payment-event-consumer-scaledobject     True    True     False      1     50    12        2h
```

> **Key decisions here:**
> - `minReplicas: 2` is intentional — a single pod creates a SPOF; during a rolling update, if the only pod is being replaced, there's a window of zero pods; `minReplicas: 2` keeps at least one running during the update
> - The `maxReplicas` ceiling should be set with the downstream in mind — 20 pods × 10 DB connections each = 200 DB connections; if your PostgreSQL max_connections is 100, uncapped autoscaling will exhaust your database connection pool; calculate the maximum safe load your infrastructure can handle and set `maxReplicas` accordingly
> - KEDA's scale-to-zero (minReplicaCount: 0) is excellent for batch Kafka consumers that don't need to be warm — they save money when the queue is empty and start instantly when messages arrive; not ideal for latency-sensitive services where cold start adds response time

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Kubernetes HPA and how does it work?"

**Hruday's answer:**
> HPA stands for Horizontal Pod Autoscaler. It's a Kubernetes control loop that automatically adjusts the number of pod replicas in a Deployment based on observed metrics.
>
> Every 15 seconds, the HPA controller queries the metrics-server for the current resource usage of the pods it's watching. It compares the observed metric against the target and uses a formula: desired replicas = ceil(current replicas × current metric/target metric). If the desired count exceeds the current count, it increases replicas; if it's lower, it decreases replicas (subject to a default 5-minute stabilization window on scale-down to prevent flapping).
>
> The simplest case is CPU-based: you target 60% CPU utilisation. At 4 pods running at 90% average, the formula says: ceil(4 × 90/60) = 6 pods. HPA updates the Deployment's replica count to 6 and the ReplicaSet creates 2 new pods.
>
> For this to work, the pods must have `resources.requests.cpu` defined — HPA calculates utilisation as actual CPU usage divided by the request amount. Without requests, HPA has no baseline and won't scale.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why does scale-down have a stabilization window and scale-up doesn't? Isn't this asymmetric?"

**Hruday's answer:**
> It's deliberately asymmetric for reliability reasons.
>
> The failure mode of over-scaling (too many pods) is waste — money. The failure mode of under-scaling (too few pods) is a user-facing outage. So the system is biased toward scaling up quickly and scaling down cautiously.
>
> Here's the concrete problem the stabilization window solves: imagine traffic spikes to "scale up to 10 pods." The algorithm runs, traffic happens to dip slightly for a moment, and at 15 seconds the algorithm now calculates "only need 6 pods." It scales down to 6. Traffic spikes again — scale back up to 10. This thrashing can happen multiple times a minute, and the pods being created and destroyed rapidly adds scheduling overhead and causes connection churn for your database connection pools.
>
> The 5-minute stabilization window on scale-down means Kubernetes checks: "over the last 5 minutes, what's the maximum desired replica count the algorithm would have produced?" It uses that maximum rather than the latest calculation. So if traffic briefly dips but then spikes again, the stabilization window prevents the scale-down from starting until the traffic has been continuously low for 5 minutes.
>
> For scale-up, the default `stabilizationWindowSeconds: 0` means scale-up is immediate — if the algorithm says you need more pods right now, you get them right now. The asymmetry is correct for the priorities.

---

### Q3 — Trade-Off
**Interviewer asks:** "When would you choose KEDA over standard HPA for scaling a service?"

**Hruday's answer:**
> Standard HPA with CPU metrics is the right starting point for most HTTP services — CPU utilisation is a reasonable proxy for request load, and it works out of the box with just the metrics-server.
>
> KEDA becomes the better choice in three scenarios.
>
> First, Kafka consumer services (directly relevant to my Spring Kafka work): a Spring Kafka consumer's CPU usage doesn't correlate well with how far it is behind. You could have 100,000 messages backed up and only 20% CPU because messages process fast — HPA says nothing to scale up. KEDA on Kafka consumer lag says: 100,000 messages at 1,000 messages-per-pod threshold = 100 pods needed. It scales on the actual queue depth, which is what matters.
>
> Second, bursty batch workloads where scale-to-zero applies: KEDA supports minReplicas: 0 — it can scale the Deployment to zero pods when there's nothing to process, and scale up to 1 pod the moment messages or events appear. Standard HPA minimum is 1. For nightly batch jobs sitting idle 23 hours a day, scale-to-zero is significant cost savings.
>
> Third, multi-metric workflows: KEDA lets you combine multiple triggers — scale based on BOTH CPU AND Kafka lag or SQS queue depth. One of them triggers a scale-up. Standard HPA's v2 API supports multiple resource metrics but not external custom metrics from any source.

---

### Q4 — Scenario
**Interviewer asks:** "Your service is autoscaling, but you notice it's hitting maxReplicas and still underperforming. What do you check?"

**Hruday's answer:**
> When you've hit maxReplicas and adding more pods isn't helping, the bottleneck is usually not the pods themselves — it's a shared constraint they all depend on.
>
> The first thing to check is the database connection pool. If maxReplicas is 20 and each pod maintains 10 DB connections, the pool is at 200 connections. If PostgreSQL's max_connections parameter is 200, every pod is competing for the last few connections — you're seeing DB connection pool exhaustion. Symptoms: slow queries, connection timeout errors in logs. Fix: either increase the database's max_connections (requires instance resize or RDS parameter group change) or add PgBouncer as a connection pooler so many app connections share fewer actual DB connections.
>
> Second, the downstream services the payment service calls. If payment-service calls a vendor payment gateway API that has a rate limit of 100 req/s, adding more pods doesn't help — the bottleneck is the external API. Check the downstream service's error rates and latency.
>
> Third, check whether you've hit maxReplicas because the limit is too low rather than because you've found a bottleneck. Review the HPA events: `kubectl describe hpa` shows "couldn't scale to desired replicas — current: 20, desired: 35, limited: 20 (maxReplicas)." If the algorithm wants 35 pods but you capped at 20, consider whether raising maxReplicas is appropriate given the downstream infrastructure capacity.
>
> The root diagnostics: check application metrics (latency histogram, error rate), check DB metrics (connections, slow query log), and check downstream service metrics before declaring the pods as the bottleneck.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "HPA works without resource requests" | "Just set up the HPA and it scales automatically" | HPA computes CPU utilisation as (actual usage / requests.cpu); without requests.cpu defined, there's no denominator — HPA controller cannot calculate utilisation; it will show "unknown" for current metrics and won't scale |
| "HPA scales databases to zero" | "Use HPA for everything including stateful sets" | HPA with minReplicas: 0 isn't supported (minimum is 1); KEDA supports scale-to-zero but databases and stateful services should never scale to zero — data integrity issues; stateful scaling is done with VPA or manual replica adjustment |
| "VPA and HPA are alternatives" | "Use either VPA or HPA" | They target different dimensions: HPA scales pod count (out/in), VPA scales pod resource allocation (up/down); for stateless services HPA is primary; for stateful workloads VPA adjusts the per-pod allocation; they can coexist if you exclude the autoscaled resources from VPA |
| "maxReplicas doesn't matter much" | "Set maxReplicas: 1000 to be safe" | maxReplicas is a safety cap for downstream protection; 1000 pods × 10 DB connections = 10,000 DB connections that will saturate any database; set it based on what your infrastructure can support |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our Kubernetes cluster used HPA for the HTTP-facing services and it worked well for normal traffic patterns. The more interesting challenge was our Spring Kafka-based event processing services — they had highly variable Kafka consumer lag depending on how many events were queued from upstream SAP systems. Standard CPU-based HPA didn't scale them correctly; the consumers were efficient and didn't spike CPU proportionally to lag. I studied KEDA as the right solution for this: the ScaledObject pointed at the Kafka consumer group lag and would scale up to keep lag below a target threshold. While I've studied KEDA in depth and understand the YAML configuration, our team was evaluating it during my time at SAP. I'd propose it confidently on any new Spring Kafka project — the lag-based scaling model directly solves the mismatch between CPU metrics and throughput for event-driven consumers."

---

## 8. Scale Evolution

**1,000 users/day →** Basic CPU-based HPA with minReplicas: 2, maxReplicas: 5. Simple and sufficient. The main value is keeping the minimum available for redundancy and scaling before a developer notices and manually adjusts.

**100,000 users/day →** Multiple services with HPA, each with properly tuned CPU targets (measured based on actual profiling data, not guesses). KEDA for Kafka consumers. `maxReplicas` calculated based on database connection pool sizing. Scale-up behavior tuned to react fast, scale-down stabilization window increased to 10 minutes to prevent thrashing during variable load.

**10 million users/day →** KEDA as the primary autoscaling mechanism for all event-driven services. HPA for HTTP APIs but with custom metrics from Prometheus: "requests per second per pod" as the scaling metric instead of CPU — more directly correlated to latency and user experience. Cluster Autoscaler (or Karpenter on AWS) adds/removes nodes as HPA creates more pods than fit on current nodes. Cost monitoring aligned with autoscaling — Grafana dashboards show pod count vs cost over time.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction volume spikes 10× during salary days, IPOs, and festive sales; autoscaling is business-critical for financial availability; KEDA used for payment event consumers | Know the scaling formula; understand stabilization windows; KEDA for queue-based scaling |
| Swiggy / Meesho | Dinner-peak ordering traffic is 5-8× off-peak; autoscaling determines cost efficiency; engineers expected to understand HPA configuration deeply | Explain maxReplicas DB connection constraint; know the CPU target calculation |
| Adobe / Microsoft | Large-scale cloud services where cost optimisation is a multi-million dollar exercise; HPA + Cluster Autoscaler + spot instances is the standard cost optimisation stack | VPA vs HPA distinction; Cluster Autoscaler interaction; Karpenter on AWS |
| SAP Labs | SAP BTP services have bursty business-hours traffic; event processing (Spring Kafka) needs intelligent autoscaling; enterprise customers have SLA requirements for peak performance | KEDA for Kafka; HPA fundamentals; direct Spring Kafka autoscaling context |

---

## 10. Related Topics — What to Study Next

- **Topic 185 — Kubernetes Architecture** — HPA controller is part of kube-controller-manager; it watches pod metrics from the metrics-server; understanding the control plane clarifies why HPA has a 15-second polling interval (not 1 second) and why there's inherent lag between metric change and pod creation
- **Topic 186 — Deployments, ReplicaSets, Services** — HPA works by updating `Deployment.spec.replicas`; the Deployment controller then adjusts the ReplicaSet; your readiness probes (Topic 188) determine when new pods start receiving traffic; the full chain from HPA calculation to traffic serving requires all three objects working correctly
- **Topic 188 — Liveness and Readiness Probes** — HPA scales up pods, but those pods must pass readiness before they serve traffic; slow startup (Spring Boot's 30-60s startup) means new HPA-created pods aren't immediately available; the startup probe ensures liveness doesn't kill them during that startup window
- **Topic 198 — CloudWatch Logs, Metrics, Alarms** — KEDA with custom Prometheus metrics requires Prometheus running in the cluster; CloudWatch Metrics (on EKS) can feed into HPA via the Prometheus adapter; understanding the full observability stack is needed to build non-CPU metric-based autoscaling

---

*Part 11 · Horizontal Pod Autoscaler · Full Stack Interview Guide · Hruday D · 2026*
