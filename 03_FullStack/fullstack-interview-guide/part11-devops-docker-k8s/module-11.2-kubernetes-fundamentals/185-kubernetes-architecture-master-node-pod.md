# Kubernetes Architecture — Master, Node, Pod
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What Kubernetes solves**: running containers manually means manually deciding which server, manually restarting crashed containers, manually scaling up, manually routing traffic — Kubernetes automates all of this across a cluster of machines
- **Control Plane (master)**: the brain — `kube-apiserver` (the REST API; every kubectl command hits this), `etcd` (the cluster's database — stores desired state), `kube-scheduler` (decides which node gets each pod), `kube-controller-manager` (watches state and fixes drift — if you want 3 replicas and 1 crashes, this brings it back)
- **Data Plane (nodes)**: the muscle — each node has `kubelet` (talks to apiserver; starts/stops containers via CRI), `kube-proxy` (handles network routing for Services), and a **container runtime** (containerd or CRI-O — the thing that actually runs containers)
- **Pod**: the smallest deployable unit; one or more containers sharing a network namespace (same IP, same localhost) and storage; containers in a pod are always scheduled together on the same node
- **The declarative model**: you tell Kubernetes *what you want* (3 replicas of this pod, port 8080 exposed) via YAML; the control plane figures out *how to make it happen* and keeps it that way; if a pod crashes, Kubernetes brings a new one — you never told it to, it inferred it from the desired state
- 🆕 **Gap topic for Hruday**: "I've deployed services to Kubernetes at SAP (Azure Kubernetes Service). I understand the architecture at the conceptual level and I'm bridging to deeper knowledge of control plane internals and scheduling"

---

## 1. One-Line Definition
Kubernetes is a container orchestration platform that manages clusters of machines — deciding where to run containerised applications, keeping them running, scaling them, and routing traffic to them — all through a declarative YAML-based desired state model.

---

## 2. The Problem It Solves

You have 10 microservices, each containerised. You have 20 servers. How do you decide which container runs on which server? What happens when a container crashes at 3am? What happens when traffic spikes at 8pm and you need 10 copies of the payment service instead of 2?

Without Kubernetes — or any orchestrator — the answers are: a human decides (slowly), a human restarts crashes (at 3am), a human spins up extra instances (after the spike damage is done). This doesn't scale. One engineer can't watch 50 containers across 20 servers.

Kubernetes is the automated answer to all three.

**Scheduling**: you describe what you want — "run 3 replicas of payment-service, each needing 0.5 CPU and 512 MB RAM." Kubernetes's scheduler looks at all available nodes, checks which ones have sufficient remaining capacity, and places the pod there. The engineer doesn't decide which server — the machine does.

**Self-healing**: the controller-manager constantly compares the current state (what's actually running) to the desired state (what you declared). If a pod crashes, current state diverges from desired state. The controller-manager creates a new pod to reconcile. This happens in seconds, at any time, automatically.

**Scaling**: set `replicas: 10` in the Deployment YAML and apply it — Kubernetes creates 7 more pods (you already had 3). Or better, set up a HorizontalPodAutoscaler (Topic 189) to do this automatically based on CPU usage.

---

## 3. How It Works Internally

### The Full Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CONTROL PLANE (Master Node — the brain, usually 3 for HA)                    │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │ kube-apiserver   │  │ etcd         │  │ kube-controller-manager         │ │
│  │                  │  │              │  │                                  │ │
│  │ REST API endpoint│  │ Key-value    │  │ Deployment controller            │ │
│  │ kubectl hits this│  │ store        │  │ ReplicaSet controller            │ │
│  │ All components   │  │ ALL cluster  │  │ Node controller                  │ │
│  │ talk to apiserver│  │ state lives  │  │ Job controller                   │ │
│  │ via this API     │  │ here         │  │ Namespace controller             │ │
│  │                  │  │ (desired +   │  │                                  │ │
│  │ Validates and    │  │  actual)     │  │ Watches apiserver, reconciles    │ │
│  │ persists to etcd │  │              │  │ current → desired state          │ │
│  └────────┬─────────┘  └──────────────┘  └─────────────────────────────────┘ │
│           │                                                                    │
│  ┌────────▼────────────┐                                                      │
│  │ kube-scheduler      │                                                      │
│  │                     │                                                      │
│  │ Watches for new pods│                                                      │
│  │ with no node assigned                                                      │
│  │ Scores all nodes and│                                                      │
│  │ assigns best fit    │                                                      │
│  │ (CPU, memory,       │                                                      │
│  │  affinity rules,    │                                                      │
│  │  taints/tolerations)│                                                      │
│  └─────────────────────┘                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
           │ watches node status
           │ assigns pods to nodes
           ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│ WORKER NODE 1                  │  │ WORKER NODE 2                  │
│                                │  │                                │
│  ┌─────────────────────────┐   │  │  ┌─────────────────────────┐  │
│  │ kubelet                 │   │  │  │ kubelet                 │  │
│  │                         │   │  │  │                         │  │
│  │ Agent that talks to API │   │  │  │ Agent that talks to API │  │
│  │ server on behalf of the │   │  │  │ server on behalf of the │  │
│  │ node                    │   │  │  │ node                    │  │
│  │ Starts/stops pods       │   │  │  │ Starts/stops pods       │  │
│  │ Reports node capacity   │   │  │  │ Reports node capacity   │  │
│  │ Reports pod health      │   │  │  │ Reports pod health      │  │
│  └─────────────────────────┘   │  │  └─────────────────────────┘  │
│                                │  │                                │
│  ┌─────────────────────────┐   │  │  ┌─────────────────────────┐  │
│  │ kube-proxy              │   │  │  │ kube-proxy              │  │
│  │                         │   │  │  │                         │  │
│  │ Maintains iptables/IPVS │   │  │  │ Maintains iptables/IPVS │  │
│  │ rules to route traffic  │   │  │  │ rules to route traffic  │  │
│  │ for Services to pods    │   │  │  │ for Services to pods    │  │
│  └─────────────────────────┘   │  │  └─────────────────────────┘  │
│                                │  │                                │
│  ┌─────────────────────────┐   │  │  ┌─────────────────────────┐  │
│  │ Container Runtime       │   │  │  │ Container Runtime       │  │
│  │ (containerd)            │   │  │  │ (containerd)            │  │
│  │                         │   │  │  │                         │  │
│  │ Actually runs containers│   │  │  │ Actually runs containers│  │
│  │ kubelet tells it what   │   │  │  │ via Container Runtime   │  │
│  │ to start/stop via CRI   │   │  │  │ Interface (CRI)         │  │
│  └─────────────────────────┘   │  │  └─────────────────────────┘  │
│                                │  │                                │
│  Pods running on this node:    │  │  Pods running on this node:   │
│  ┌─────────┐ ┌─────────┐      │  │  ┌─────────┐ ┌─────────┐     │
│  │ Payment │ │ Redis   │      │  │  │ Payment │ │ Order   │     │
│  │ Service │ │ sidecar │      │  │  │ Service │ │ Service │     │
│  │  Pod    │ │  Pod    │      │  │  │  Pod    │ │  Pod    │     │
│  └─────────┘ └─────────┘      │  │  └─────────┘ └─────────┘     │
└────────────────────────────────┘  └────────────────────────────────┘
```

### What a Pod Is

```
Pod — the atomic unit in Kubernetes:
  
  A Pod wraps one or more containers that ALWAYS run together on the SAME node
  
  ┌──────────────────────────────────────────────────────────┐
  │ Pod: payment-service-pod                                 │
  │                                                          │
  │  Shared:                                                 │
  │    Network namespace: both containers share 127.0.0.1    │
  │                       and the same pod IP               │
  │    Storage: mounted volumes accessible to all containers │
  │                                                          │
  │  ┌──────────────────────┐  ┌──────────────────────────┐ │
  │  │ Main container       │  │ Sidecar container        │ │
  │  │ payment-service:1.0  │  │ fluent-bit:1.9 (logging) │ │
  │  │ Port 8080            │  │ Port 24224               │ │
  │  │                      │  │                          │ │
  │  │ Spring Boot app      │  │ Ships app logs to        │ │
  │  │                      │  │ Elasticsearch            │ │
  │  └──────────────────────┘  └──────────────────────────┘ │
  │                                                          │
  │  The sidecar reads the main container's logs because     │
  │  they share the same pod and volume mounts               │
  └──────────────────────────────────────────────────────────┘

Multi-container pods use cases:
  Sidecar:   log shipper, service mesh proxy (Envoy/Istio), secret rotator
  Init containers: run before main container starts (DB migration, wait for dependencies)
  Ambassador: proxy for external services

Most pods are single-container — one Spring Boot service per pod
```

### The Declarative Model — Desire State Reconciliation

```
How Kubernetes thinks:

You submit YAML → apiserver stores in etcd as "desired state"
Controller-manager watches etcd for changes
Current state diverges from desired state → controller-manager takes action

Example: you want 3 replicas of payment-service

Desired state (in etcd):
  Deployment:
    replicas: 3
    image: payment-service:1.0.0

Current state:
  Pods running: 3 ✓  → Nothing to do

Pod on Node 1 crashes (docker process dies):
Current state:
  Pods running: 2 → DRIFT from desired (3)

ReplicaSet controller sees drift:
  Missing 1 pod → creates a new pod spec
  Scheduler: assigns new pod to Node 2 (which has capacity)
  Kubelet on Node 2: pulls image, starts container
Current state:
  Pods running: 3 ✓ → Back to desired

Time from crash to recovery: ~10-30 seconds
No human involved. Any time. Any reason.
```

---

## 4. The Code

### Wrong Way — Managing Containers Manually on Multiple Servers
```bash
# Managing services manually across 3 servers — pre-Kubernetes
ssh server1.company.com "docker run -d --name payment-v1 payment-service:1.0"
ssh server2.company.com "docker run -d --name payment-v1 payment-service:1.0"
ssh server3.company.com "docker run -d --name payment-v1 payment-service:1.0"

# 3am: server2's payment-service crashes
# Need to: SSH in, check logs, restart manually
ssh server2.company.com "docker start payment-v1 || docker run -d --name payment-v1 payment-service:1.0"

# Deploy a new version:
# 1. Manually SSH to each server (can't do rolling — all go down together)
# 2. Hope nothing crashes between bringing old down and new up
# 3. No rollback mechanism

# Scaling for peak traffic:
# Manually provision a VM, install Docker, run the container, add to load balancer
# Takes 20-30 minutes — the traffic spike has already passed
```

> **Why this fails in production:** Human-in-the-loop for failures and scaling makes 3am outages inevitable and response-to-traffic-spikes impossible. As the service count grows from 5 to 50, manual management becomes a full-time job for multiple engineers. The lack of a consistent desired state definition means servers drift and debugging becomes archaeology into what commands were run when.

### Right Way — Kubernetes Resource Definitions
```yaml
# pod.yaml — the simplest unit (rarely used directly; use Deployment instead)
apiVersion: v1
kind: Pod
metadata:
  name: payment-service-pod
  namespace: payment              # Namespace for isolation
  labels:
    app: payment-service
    version: "1.0.0"
spec:
  containers:
    - name: payment-service
      image: 123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:1.0.0
      ports:
        - containerPort: 8080
      resources:
        requests:                 # Minimum resources the pod needs — scheduler uses this
          cpu: "250m"             # 250 millicores = 0.25 CPU
          memory: "256Mi"         # 256 mebibytes
        limits:                   # Maximum resources — pod is killed if it exceeds memory limit
          cpu: "500m"             # 0.5 CPU — throttled (not killed) if exceeded
          memory: "512Mi"         # 512 MB — OOM killed if exceeded
      env:
        - name: SPRING_PROFILES_ACTIVE
          value: "production"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:         # Reference a Kubernetes Secret (not hardcoded!)
              name: payment-db-credentials
              key: password
```

```yaml
# deployment.yaml — the correct way to run pods in production
# A Deployment manages ReplicaSets which manage Pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payment
spec:
  replicas: 3                     # Desired number of pods
  selector:
    matchLabels:
      app: payment-service        # The Deployment manages pods with this label
  
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                 # Start 1 new pod before removing an old one
      maxUnavailable: 0           # Never reduce available pods below the desired count
                                  # Combined: always at least 3 pods serving traffic
  
  template:                       # Pod template — every pod created by this Deployment
    metadata:                     # will have these specs
      labels:
        app: payment-service
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
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "production"
          # Health checks — critical for safe rolling deployments (Topic 188)
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30   # Wait 30s before first check (Spring Boot startup)
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 45
            periodSeconds: 30
```

```yaml
# service.yaml — stable DNS name and load balancing for pods
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: payment
spec:
  selector:
    app: payment-service          # Routes traffic to pods with this label
  ports:
    - protocol: TCP
      port: 80                    # Service port (what callers use)
      targetPort: 8080            # Pod port (where the app listens)
  type: ClusterIP                 # Only accessible within the cluster
                                  # Use LoadBalancer for external access
```

**kubectl commands — working with the cluster:**
```bash
# Apply the YAML — create or update resources
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Check what's running
kubectl get pods -n payment
# NAME                              READY   STATUS    RESTARTS   AGE
# payment-service-7d9f8b6c4-abc12   1/1     Running   0          2m
# payment-service-7d9f8b6c4-def34   1/1     Running   0          2m
# payment-service-7d9f8b6c4-ghi56   1/1     Running   0          1m

# See pod details and events (useful for debugging startup failures)
kubectl describe pod payment-service-7d9f8b6c4-abc12 -n payment

# View logs
kubectl logs payment-service-7d9f8b6c4-abc12 -n payment
kubectl logs -f payment-service-7d9f8b6c4-abc12 -n payment  # follow

# Execute into a pod
kubectl exec -it payment-service-7d9f8b6c4-abc12 -n payment -- /bin/sh

# Rolling update — change the image version
kubectl set image deployment/payment-service \
  payment-service=payment-service:1.1.0 -n payment
# Kubernetes performs rolling update while keeping minimum pods available

# Rollback if the new version has issues
kubectl rollout undo deployment/payment-service -n payment

# Scale — change replica count
kubectl scale deployment payment-service --replicas=5 -n payment

# Check rollout status
kubectl rollout status deployment/payment-service -n payment
```

> **Key decisions here:**
> - `resources.requests` and `resources.limits` are mandatory — without them, a pod with a memory leak can consume all node memory, causing OTHER pods to be OOM killed; requests are what the scheduler uses for placement; limits are the enforcement ceiling
> - `maxUnavailable: 0` in rolling update — during a deployment, never drop below the desired replica count; this ensures zero downtime deployments assuming your readiness probes are correct
> - The `readinessProbe` is what makes rolling updates safe — Kubernetes won't remove old pods from service until new pods pass their readiness check; without this, traffic is sent to pods that aren't ready yet, causing errors

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Kubernetes and how is it different from Docker?"

**Hruday's answer:**
> Docker is the container engine — it builds and runs a single container on a single machine. Kubernetes is the orchestration layer — it runs hundreds of containers across dozens of machines, deciding where to run them, keeping them running, and managing their networking.
>
> Think of Docker as the delivery truck. It picks up a container and runs it. Kubernetes is the logistics company — it decides which truck delivers to which location, reroutes when a truck breaks down, scales up trucks during peak demand, and ensures packages get to the right destination.
>
> In practice at SAP, Docker is what builds the image and what the engineer runs locally. Kubernetes (Azure Kubernetes Service) is what runs the images in production. The CI pipeline builds a Docker image, pushes it to the registry, and then Kubernetes pulls and runs that image in the production cluster — maintaining the desired number of replicas, restarting any that crash, and routing traffic through internal Services.

---

### Q2 — Deep Dive
**Interviewer asks:** "What happens in Kubernetes when a pod crashes? Walk me through the components involved."

**Hruday's answer:**
> Let me walk through this step by step.
>
> The pod's process — say, the JVM — encounters an unrecoverable error and exits. The container runtime (containerd) on the node detects the process exit. It reports the container status change to the kubelet running on that node.
>
> The kubelet sees the pod is no longer running. It reports the pod's status change — from Running to Failed — to the kube-apiserver. The apiserver persists this updated status to etcd.
>
> The ReplicaSet controller (inside kube-controller-manager) watches etcd for state changes. It notices: desired state = 3 pods running; current state = 2 pods running. This is a divergence. The controller creates a new pod spec and submits it to the apiserver.
>
> The kube-scheduler, also watching the apiserver, sees a new pod with no node assigned. It evaluates all nodes — checks CPU and memory available, checks taints and tolerations, checks any affinity rules. It picks the best fit node and assigns the pod to it.
>
> The kubelet on the assigned node sees a new pod assigned to it. It asks the container runtime to pull the image (from the registry) and start the container. Once the container starts and the readiness probe passes, the Service's endpoint list is updated and traffic is sent to the new pod.
>
> Total time from crash to new pod serving traffic: typically 15-30 seconds, depending on image pull time and application startup time.

---

### Q3 — Trade-Off
**Interviewer asks:** "What are the trade-offs of Kubernetes compared to simpler deployment approaches?"

**Hruday's answer:**
> Kubernetes is genuinely complex. The learning curve is steep — understanding pods, deployments, services, ingresses, config maps, secrets, RBAC, namespaces, persistent volumes... it requires weeks of dedicated study and hands-on practice. A team that moves from "just run docker on a VM" to Kubernetes overnight takes on significant operational risk if nobody on the team has Kubernetes experience.
>
> The operational cost is real: someone needs to maintain the cluster — upgrade Kubernetes versions, manage etcd backups, handle control plane failures. AWS EKS, Google GKE, and Azure AKS abstract the control plane management, but you still need engineers who understand how to configure the data plane: node groups, autoscaling, networking plugins.
>
> The payoff is most clear when: you have more than 5-10 services that need to run reliably, you need automatic scaling, you need zero-downtime deployments, or you need to run on multiple availability zones for high availability. A startup with 2-3 services might be better served by ECS, Heroku, or Railway until they prove product-market fit.
>
> At SAP, Kubernetes made sense because we had 20+ services, needed multi-AZ deployment for enterprise reliability SLAs, and had an operations team with Kubernetes expertise. For a 5-person startup, I'd choose a simpler managed platform first.

---

### Q4 — Scenario
**Interviewer asks:** "A pod is stuck in 'Pending' state in Kubernetes. How do you diagnose it?"

**Hruday's answer:**
> A pod in Pending state means it's been created but the scheduler hasn't assigned it to a node yet — or the scheduler assigned it but the node hasn't started it. `kubectl describe pod <pod-name> -n <namespace>` is the first step — look at the Events section at the bottom. It tells you exactly why the pod is pending.
>
> The most common causes: First, resource insufficiency — the pod requests 2 CPU or 4 GB RAM and no node has that much free capacity. `kubectl describe nodes` shows the "Allocatable" vs "Allocated" capacity on each node. Fix: add more nodes or lower the resource request.
>
> Second, no matching node due to node selectors or affinity rules. The pod has `nodeSelector: disktype: ssd` and no node has that label. Fix: label a node correctly or adjust the pod spec.
>
> Third, a PersistentVolumeClaim (PVC) is pending — the pod requires a volume but the storage class hasn't provisioned it yet. `kubectl get pvc -n <namespace>` shows PVC status.
>
> Fourth, image pull failure — the pod is Pending then transitions to ImagePullBackOff. The container runtime can't pull the image — wrong image tag, private registry without pull credentials, or network connectivity to the registry. Fix: check the image name and ensure an image pull secret is configured in the pod spec.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Kubernetes = Docker" | "Kubernetes runs containers like Docker does" | Kubernetes orchestrates containers across a cluster; containerd or CRI-O actually runs the containers on each node; Kubernetes itself doesn't run containers — it manages the machines that do |
| Control plane on each node | "Each Kubernetes node has the API server and scheduler" | Control plane components (apiserver, etcd, scheduler, controller-manager) run on master/control-plane nodes only; worker nodes have kubelet, kube-proxy, and the container runtime — not the control plane |
| Deploying pods directly | "I create pods with kubectl" | Pods should almost never be created directly — if a Pod crashes, nobody restarts it; use a Deployment which manages a ReplicaSet which manages Pods; only use raw Pods for debugging |
| Missing resource limits | "We don't set resource limits" | Without limits, a pod with a memory leak takes down the entire node, OOM-killing every other pod on it; limits are mandatory for any production cluster |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our services ran on Azure Kubernetes Service (AKS). I worked with Kubernetes on a daily basis — writing Deployment and Service YAML, reading pod logs with `kubectl logs`, describing pods to debug startup failures, and running `kubectl rollout status` to monitor deployments. When we had a pod crash loop on one of our services, I used `kubectl describe pod` to see the liveness probe was failing because the readiness endpoint wasn't yet implemented — the pod kept getting killed before it finished starting. Adding the `/actuator/health/liveness` and `/actuator/health/readiness` Spring Boot Actuator endpoints and configuring the `initialDelaySeconds` correctly fixed the restart loop. I've studied the control plane components and scheduling logic in depth to build on that operational experience."

---

## 8. Scale Evolution

**1,000 users/day →** A small Kubernetes cluster (2-3 nodes) running a handful of services. The main benefit at this scale is self-healing — pods restart automatically — and the rolling deployment pattern. Managed K8s (EKS/GKE/AKS) abstracts the control plane. 

**100,000 users/day →** 10-20 nodes, multiple availability zones, HorizontalPodAutoscaler (Topic 189) scales pods based on CPU/memory metrics. Node groups with different instance types for different workloads. Resource requests and limits tuned based on real profiling data. Kubernetes Dashboard or Lens for cluster visibility.

**10 million users/day →**100+ nodes across 3+ AZs. Cluster Autoscaler dynamically adds/removes nodes based on pod pending state. Node affinity rules spread workloads across AZs for fault tolerance. Resource quotas per namespace prevent one team from starving another. Network policies restrict pod-to-pod communication to only what's needed. Kyverno or OPA Gatekeeper enforce cluster-wide policies (no root containers, resource limits required, approved base images only).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | All production services run on Kubernetes; every engineer is expected to understand pod lifecycle, service mesh, and deployment strategies; Kubernetes knowledge is required, not optional | Know deployment strategies; know liveness/readiness probes; explain control plane components |
| Swiggy / Meesho | Large Kubernetes estate (hundreds of pods) across multiple regions; autoscaling critical for peak meal-ordering times; reliability engineering heavily Kubernetes-focused | Know HPA; explain the scheduler's resource-based placement; describe self-healing flow |
| Adobe / Microsoft | Enterprise software is containerised and deployed on Kubernetes; both companies have Kubernetes-at-scale teams; senior engineers expected to understand cluster architecture not just dev workflows | Know the control plane in depth; explain etcd's role; describe rolling update internals |
| SAP Labs | SAP BTP (Business Technology Platform) is built on Kubernetes; all SAP product teams deploy services to Kubernetes; SAP works with enterprise cloud providers (AWS, Azure, GCP) for managed Kubernetes | Direct production experience (AKS); connect to specific debugging stories |

---

## 10. Related Topics — What to Study Next

- **Topic 186 — Deployments, ReplicaSets, Services** — the objects you interact with daily; Deployment managages ReplicaSets which manage Pods; Service provides stable DNS and load balancing across pods; these are the core production Kubernetes objects
- **Topic 188 — Liveness and readiness probes** — without correct probes, rolling deployments can send traffic to unready pods and self-healing can restart healthy pods; probes are what make Kubernetes's automation reliable
- **Topic 189 — Horizontal Pod Autoscaler** — the automatic scaling layer on top of Deployments; monitors CPU/memory and adjusts `replicas` automatically
- **Topic 197 — EKS: Kubernetes on AWS** — this architecture topic plus the AWS-specific managed Kubernetes service; EKS abstracts the control plane and integrates with AWS IAM, ALB, and EBS
- **Practice**: get a local Kubernetes cluster running with `minikube start` or `kind create cluster`; deploy a simple nginx pod and service; kill the pod with `kubectl delete pod` and watch it recreate automatically; this experience solidifies the declarative model mentally

---

*Part 11 · Kubernetes Architecture — Master, Node, Pod · Full Stack Interview Guide · Hruday D · 2026*
