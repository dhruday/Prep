# Deployments, ReplicaSets, Services
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Pod alone is fragile**: if a raw pod crashes, it stays dead — nobody recreates it; you never create pods directly in production
- **ReplicaSet**: keeps exactly N copies of a pod running at all times; if a pod dies, ReplicaSet creates a replacement; you rarely interact with ReplicaSets directly — Deployment manages them
- **Deployment**: manages ReplicaSets to give you rolling updates and rollbacks; when you change the image version, Deployment creates a new ReplicaSet with the new image, gradually scales it up while scaling down the old one — zero-downtime update
- **Service**: provides a stable DNS name and a stable IP (ClusterIP) for a group of pods; pods come and go, their IPs change — Service's IP stays constant; Service routes traffic to pods that match its label selector; built-in load balancing
- **Service types**: `ClusterIP` (inside cluster only), `NodePort` (exposes a port on every node — external access without a load balancer), `LoadBalancer` (provisions a cloud load balancer with an external IP — production pattern)
- **Label selectors** are the glue: `Service.spec.selector.app: payment-service` finds pods with label `app: payment-service`; change a pod label and the Service immediately stops routing to it — this is how blue-green deployments work
- 🆕 **Gap topic for Hruday**: "I've worked with Deployments and Services at SAP on AKS. I'm building depth on ReplicaSet internals and Service types, especially how label selectors tie the whole system together"

---

## 1. One-Line Definition
A Deployment manages the lifecycle of pods at scale — maintaining a desired replica count through ReplicaSets and enabling rolling updates and rollbacks. A Service gives those pods a stable network identity — a fixed DNS name and IP that routes traffic to whichever pod instances are currently healthy.

---

## 2. The Problem It Solves

**The Pod stability problem**: a pod is the unit of execution, but it's not the unit of reliability. Pods fail — JVM crashes, OOM kills, node failures. A raw pod that dies stays dead. You need something watching the desired state and creating replacement pods. That's a ReplicaSet.

**The update problem**: you have 3 pods running your payment service. You need to deploy version 1.1.0. If you delete all 3 and start 3 new ones, there's downtime. If you update one at a time manually, you have an inconsistent fleet. You need something that orchestrates the transition — old version down, new version up — while keeping a minimum number of pods serving traffic at all times. That's a Deployment managing two ReplicaSets.

**The networking problem**: Kubernetes creates each pod with a unique IP from the cluster network. When a pod is replaced (after a crash or a deployment), the new pod has a different IP. Any other service that's hardcoded to pod IP addresses is now broken. You need a stable network endpoint — a virtual IP that always maps to "whatever pods are currently healthy and running payment-service." That's a Service.

**These three objects work together as a unit**: Deployment manages ReplicaSets which manage Pods. Service routes traffic to Pods. You define the Deployment and Service once. Kubernetes keeps the system at the desired state.

---

## 3. How It Works Internally

### Object Hierarchy

```
Deployment
  └── ReplicaSet (current version: payment-service:1.1.0)
        ├── Pod  payment-service-abc123
        ├── Pod  payment-service-def456
        └── Pod  payment-service-ghi789
  └── ReplicaSet (old version: payment-service:1.0.0) — scaled to 0
        (retained for rollback reference)

Service: payment-service (ClusterIP)
  └── watches for Pods where label app=payment-service
      └── routes to any of the 3 running pods (load balanced)
```

### Rolling Update — What Actually Happens

```
Before update:
  Deployment (payment-service, replicas: 3)
    ReplicaSet A (image: :1.0.0, replicas: 3)
      Pod A1 Running ✓
      Pod A2 Running ✓
      Pod A3 Running ✓

You run: kubectl set image deployment/payment-service payment-service=payment:1.1.0

Step 1 — Deployment creates new ReplicaSet:
    ReplicaSet B (image: :1.1.0, replicas: 0) ← created empty

Step 2 — Rolling update begins (maxSurge: 1, maxUnavailable: 0):
    Scale ReplicaSet B up by 1 → Pod B1 starts
    Wait for Pod B1 to pass readiness probe
    Scale ReplicaSet A down by 1 → Pod A1 terminated
    (Total: A2, A3, B1 running = 3 pods, zero downtime)

Step 3 — Continue:
    Scale B up → Pod B2 starts, passes readiness
    Scale A down → Pod A2 terminated
    (Total: A3, B1, B2 running = 3 pods)

Step 4 — Complete:
    Scale B up → Pod B3 starts, passes readiness
    Scale A down → Pod A3 terminated

After update:
  Deployment (payment-service, replicas: 3)
    ReplicaSet B (image: :1.1.0, replicas: 3) ← active
      Pod B1 Running ✓
      Pod B2 Running ✓
      Pod B3 Running ✓
    ReplicaSet A (image: :1.0.0, replicas: 0) ← retained (rollback)
```

### Service Routing — Label Selectors

```
Service definition:
  spec.selector:
    app: payment-service

Pods with label app=payment-service:
  Pod A  (IP: 10.244.1.5)  ← receives traffic ✓
  Pod B  (IP: 10.244.2.3)  ← receives traffic ✓
  Pod C  (IP: 10.244.1.9)  ← receives traffic ✓

Service (ClusterIP: 10.96.45.1):
  Maintains an Endpoints object listing: 10.244.1.5, 10.244.2.3, 10.244.1.9
  kube-proxy on each node uses iptables/IPVS to load balance requests
  across these IPs

When Pod C crashes (IP 10.244.1.9 gone):
  Endpoint controller removes 10.244.1.9 from the Endpoints object
  kube-proxy updates its iptables rules
  Traffic now routes to only A and B — no config change needed by callers

When a new Pod D starts (IP: 10.244.2.7) with label app=payment-service:
  Endpoint controller adds 10.244.2.7 to the Endpoints object
  Traffic automatically flows to A, B, D

Callers never know pod IPs changed — they call payment-service:80 and it works
```

---

## 4. The Code

### Wrong Way — Self-Managed Pod Without Deployment
```yaml
# pod-raw.yaml — DON'T do this in production
apiVersion: v1
kind: Pod
metadata:
  name: payment-service        # Static name — can't have two pods with the same name
  labels:
    app: payment-service
spec:
  containers:
    - name: payment-service
      image: payment-service:1.0.0
      ports:
        - containerPort: 8080
```
```bash
kubectl apply -f pod-raw.yaml

# This pod crashes:
# kubectl get pods
# NAME                READY   STATUS      RESTARTS   AGE
# payment-service     0/1     Completed   0          5m   ← stays dead, nobody restarts it

# To deploy a new version:
kubectl delete pod payment-service   # downtime starts
kubectl apply -f pod-raw.yaml        # downtime until new pod starts
# This is full downtime on every deployment — unacceptable for production
```

> **Why this breaks:** Raw pods have no self-healing and no rolling update. When the pod crashes (and it will), it stays dead until a human notices. When you deploy a new version, there's guaranteed downtime. Scaling means creating pods with different names manually — error-prone and unmanageable above 2-3 pods.

### Right Way — Deployment + Service
```yaml
# payment-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payment
  labels:
    app: payment-service
  annotations:
    kubernetes.io/change-cause: "Release 1.1.0 — payment gateway timeout fix"  # rollout history
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service        # Must match spec.template.metadata.labels
  
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                 # Allow 1 extra pod during update (so 4 while transitioning)
      maxUnavailable: 0           # Never go below 3 healthy pods during update
  
  template:                       # Pod template — this is what pods look like
    metadata:
      labels:
        app: payment-service      # Label that Service selector will match
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
          
          # Health probes — prerequisite for rolling update safety
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            successThreshold: 1
            failureThreshold: 3
          
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 45
            periodSeconds: 30
          
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "production"
            - name: SERVER_PORT
              value: "8080"
```

```yaml
# payment-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service          # DNS name within the cluster — other services call payment-service:80
  namespace: payment
spec:
  selector:
    app: payment-service         # Routes to any pod with this label — regardless of pod IP
  ports:
    - name: http
      protocol: TCP
      port: 80                   # Port the Service is accessed on
      targetPort: 8080           # Port on the pod
  type: ClusterIP                # ClusterIP = internal only; use LoadBalancer for external
```

```yaml
# Load balancer Service — for external access (creates AWS ELB when on EKS)
apiVersion: v1
kind: Service
metadata:
  name: payment-service-external
  namespace: payment
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"  # Network Load Balancer on AWS
spec:
  selector:
    app: payment-service
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer             # Kubernetes provisions an AWS ELB/NLB with an external IP
```

**Rollout and rollback operations:**
```bash
# Deploy a new version — update the image
kubectl set image deployment/payment-service \
  payment-service=payment-service:1.2.0 \
  -n payment

# Monitor the rollout
kubectl rollout status deployment/payment-service -n payment
# Waiting for deployment "payment-service" rollout to finish: 1 out of 3 new replicas...
# Waiting for deployment "payment-service" rollout to finish: 2 out of 3 new replicas...
# deployment "payment-service" successfully rolled out

# Check rollout history
kubectl rollout history deployment/payment-service -n payment
# REVISION  CHANGE-CAUSE
# 1         Release 1.0.0 — initial deployment
# 2         Release 1.1.0 — payment gateway timeout fix
# 3         Release 1.2.0 — performance improvements

# Rollback to previous version (revision 2)
kubectl rollout undo deployment/payment-service -n payment

# Or rollback to a specific revision
kubectl rollout undo deployment/payment-service --to-revision=1 -n payment

# Check the Endpoints — what pods is the Service actually sending to?
kubectl get endpoints payment-service -n payment
# NAME              ENDPOINTS                                   AGE
# payment-service   10.244.1.5:8080,10.244.2.3:8080,10.244.1.9:8080   5m

# Check ReplicaSets (see old and new versions)
kubectl get replicasets -n payment
# NAME                            DESIRED   CURRENT   READY   AGE
# payment-service-7d9f8b6c4       3         3         3       5m  ← active (v1.2.0)
# payment-service-5c8f7b4d2       0         0         0       1h  ← previous (v1.1.0, 0 replicas)
# payment-service-3a6e5c1b9       0         0         0       2h  ← older (v1.0.0, 0 replicas)
```

> **Key decisions here:**
> - The `selector.matchLabels` in the Deployment must match the `labels` on the pod template — Kubernetes enforces this; if they don't match, the Deployment can't own the ReplicaSet's pods
> - Setting `maxUnavailable: 0` requires at least `maxSurge: 1` so the update can make progress — without surge, it would be deadlocked (can't bring new up without some old going down, but can't bring old down without violating maxUnavailable: 0)
> - Old ReplicaSets are kept (at 0 replicas) to enable `kubectl rollout undo` — Kubernetes maintains the last 10 by default (controlled by `revisionHistoryLimit`)

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between a Pod, a ReplicaSet, and a Deployment?"

**Hruday's answer:**
> They're a hierarchy of increasing functionality.
>
> A Pod is the basic execution unit — it wraps one or more containers that run together on the same node. But a raw Pod has no self-healing. If it crashes, it stays dead.
>
> A ReplicaSet adds self-healing — it ensures exactly N copies of a pod template are always running. If a pod crashes, the ReplicaSet controller creates a replacement. But a ReplicaSet doesn't know how to do rolling updates — changing the pod template doesn't smoothly transition running pods to the new spec.
>
> A Deployment manages ReplicaSets to provide rolling updates and rollback. When you change the image version, the Deployment creates a new ReplicaSet with the new spec, scales it up while scaling down the old ReplicaSet, and retains the old ReplicaSet at 0 replicas so you can roll back instantly with `kubectl rollout undo`.
>
> In practice, you almost always define Deployments — never raw Pods or ReplicaSets directly, unless you have a very specific reason like an immutable infrastructure pattern.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain how a Kubernetes Service load balances traffic across pods."

**Hruday's answer:**
> A Service gets a stable virtual IP — the ClusterIP — when it's created. This IP never changes for the lifetime of the Service. When another pod calls `http://payment-service:80`, the cluster DNS resolves the service name to the ClusterIP.
>
> The actual load balancing happens in kube-proxy on each node. kube-proxy watches the Kubernetes API server for Endpoints updates. The Endpoint controller maintains an Endpoints object that lists the IP:port of every pod matching the Service's label selector. Whenever a pod starts, passes its readiness probe, and gets the matching label, its IP is added to the Endpoints. When a pod dies or fails its readiness probe, its IP is removed.
>
> kube-proxy translates these Endpoints into iptables rules (or IPVS rules in more modern setups) that redirect traffic from the ClusterIP to one of the real pod IPs using round-robin selection. This is stateless load balancing — no sticky sessions by default. If you need session affinity, you can configure `spec.sessionAffinity: ClientIP` on the Service, which routes requests from the same client IP to the same pod for the session duration.
>
> The key insight: when a pod is replaced after a crash, the new pod gets a different IP, but the Service routing updates automatically through the Endpoints mechanism — callers are never aware of the pod IP changes.

---

### Q3 — Trade-Off
**Interviewer asks:** "When would you choose NodePort over LoadBalancer for a Service?"

**Hruday's answer:**
> LoadBalancer is the correct production choice when you're on a cloud provider like AWS, GCP, or Azure — it provisions a cloud load balancer with an external IP, handles TLS termination in many configurations, and is managed by the cloud provider. The downside is cost — every LoadBalancer Service provisions a separate cloud load balancer, which costs money per Service.
>
> NodePort is useful in specific scenarios: first, in bare-metal Kubernetes clusters or development environments where there's no cloud load balancer controller available; second, when you want external access without a cloud LB as a temporary measure (often you'll use an Ingress controller on top of a single LoadBalancer instead of a LoadBalancer per Service).
>
> In production at scale, the modern pattern isn't to use multiple LoadBalancer Services — it's to use a single LoadBalancer (or a cloud-native load balancer like AWS ALB) pointing to an Ingress controller, and then route HTTP traffic based on host and path rules with Ingress resources. This way, 20 services share one load balancer, and you define routing rules in Kubernetes YAML rather than in cloud console configurations.
>
> At SAP, we used an NGINX Ingress controller on AKS — one external LoadBalancer Service for the ingress controller, and ClusterIP Services for all internal microservices. The ingress controller routed external HTTPS traffic to the right internal ClusterIP service based on URL path patterns.

---

### Q4 — Scenario
**Interviewer asks:** "Halfway through a rolling update, you notice the new pods are crashing. How does Kubernetes respond and what do you do?"

**Hruday's answer:**
> If the new pods crash during a rolling update, Kubernetes's readiness probes will start failing on the new pods. Since I used `maxUnavailable: 0`, the rollout controller won't terminate any old pods until the new pods pass their readiness check. The rollout freezes — it made some progress (maybe 1 new pod is running) but it can't continue because new pods aren't becoming ready.
>
> `kubectl rollout status` will show it's stuck: "Waiting for deployment rollout to finish." I can run `kubectl get pods` to see the new pods are in CrashLoopBackOff or have error states. `kubectl logs <new-pod-name>` gives me the application error. `kubectl describe pod <new-pod-name>` shows the crash details and any readiness probe failures.
>
> If the crash is a deployment error (wrong config, bad image), the correct response is `kubectl rollout undo deployment/payment-service` — this immediately transitions back to the previous ReplicaSet (the old image is still there at 0 replicas but ready to scale back up). The rollback is fast — no image pull needed, the old pods just scale back up.
>
> This scenario is exactly why readiness probes and `maxUnavailable: 0` matter: they turn a potentially catastrophic "all new pods crash and no old pods are left" situation into a safe partial rollout that freezes and waits for human intervention.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Misunderstanding Deployment vs ReplicaSet | "Deployment and ReplicaSet do the same thing" | Deployment manages ReplicaSets for rolling updates and rollback; ReplicaSet alone can maintain replica count but can't roll back; you almost always use Deployments, not raw ReplicaSets |
| Service selector confusion | "Service routes by pod name" | Service routes by label selector — any pod with matching labels gets traffic; pod names are irrelevant; this is why label discipline matters — one wrong label and a pod is excluded from routing |
| Rolling update assuming no downtime automatically | "Rolling update means zero downtime" | Rolling update is zero downtime ONLY if readiness probes are correctly configured; without readiness probes, Kubernetes has no way to know the new pod is ready before routing traffic to it — you'll send requests to unready pods and get errors |
| LoadBalancer = free | "Just use LoadBalancer type for everything" | Each LoadBalancer Service provisions a cloud load balancer that costs money; 20 Services × 1 LB each = 20 cloud LBs; use an Ingress controller as a single ingress point instead |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we regularly deployed new versions of our Java microservices to AKS using rolling updates. I wrote and maintained the Deployment YAML, tuned the `initialDelaySeconds` on the readiness probes to match Spring Boot's actual startup time (we measured it as ~40 seconds for our heaviest service), and used `kubectl rollout status` output in our CI pipeline to block the CI job until the deployment completed successfully. We hit a situation once where a new deployment was stuck — `kubectl rollout status` was hanging. I investigated by running `kubectl describe pod` on the new pods and found the image pull was failing because the registry credentials Secret had expired in that namespace. Renewing the image pull secret and re-triggering the deployment fixed it. That made me understand the Service/Endpoint binding much more deeply — traffic kept flowing from the old ReplicaSet's pods the whole time."

---

## 8. Scale Evolution

**1,000 users/day →** 2-3 replicas per service. `maxUnavailable: 1` is acceptable — small window of capacity reduction during updates. Single LoadBalancer Service or NodePort. Rolling updates done manually by the engineer.

**100,000 users/day →** 5-10 replicas per service. `maxUnavailable: 0, maxSurge: 2` — faster rollouts without reduced capacity. Ingress controller replaces multiple LoadBalancer Services for cost efficiency. Canary deployments using two Deployments with weight-based traffic splitting in the Ingress.

**10 million users/day →** 20-50+ replicas. Progressive delivery with Argo Rollouts or Flagger replacing standard Kubernetes Deployments — automated canary promotions based on error rate and latency metrics from Prometheus. Multiple Deployments per service (canary vs stable). Service mesh (Istio) for fine-grained traffic control between Services. Automated rollback triggered by SLO violations.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment flow services deployed on Kubernetes; zero-downtime deployments are mandatory for financial services; rolling update strategy directly impacts availability SLAs | Explain readiness probe role in rolling updates; know rollback commands |
| Swiggy / Meesho | High-frequency deployments (10+ per day per service) on large K8s clusters; Engineers expected to write and debug Deployment YAML without assistance; Service networking knowledge tested | Know Service types and when to use each; explain endpoint mechanism |
| Adobe / Microsoft | Enterprise services with complex Service meshes; deep knowledge of Service types, Ingress, and internal routing expected at senior levels; blue-green and canary patterns standard | Know how label selectors work as the routing mechanism; discuss Ingress |
| SAP Labs | AKS-based deployments across SAP BTP product teams; Deployment and Service YAML is the daily workflow; rollout debugging is a common task for senior engineers | Direct experience using rolling updates, rollout undo, and endpoint debugging |

---

## 10. Related Topics — What to Study Next

- **Topic 185 — Kubernetes Architecture** — understanding why Deployments and Services work the way they do requires knowing the control plane: the ReplicaSet controller inside kube-controller-manager is what does the replica count reconciliation; the Endpoint controller tracks healthy pod IPs; kube-proxy on each node reads Endpoints and programs iptables rules
- **Topic 188 — Liveness and Readiness Probes** — readiness probes are what make rolling updates safe; the Endpoint controller only adds a pod to a Service's Endpoints after the pod passes its readiness probe; without probes, traffic is sent to pods that aren't ready
- **Topic 193 — Blue-Green Deployment** — an advanced deployment strategy using two separate Deployments and Service selector switching to cut over all traffic instantly rather than gradually rolling pods; builds directly on Service label selector understanding
- **Topic 194 — Canary Releases** — sending a small percentage of traffic to a new version while most traffic goes to the old version; requires either multiple Deployments with proportional replica counts or a Service mesh for fine-grained traffic splitting

---

*Part 11 · Deployments, ReplicaSets, Services · Full Stack Interview Guide · Hruday D · 2026*
