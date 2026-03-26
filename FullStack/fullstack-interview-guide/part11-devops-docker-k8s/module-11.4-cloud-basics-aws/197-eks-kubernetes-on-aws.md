# EKS — Kubernetes on AWS
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **EKS = managed Kubernetes**: AWS manages the control plane (kube-apiserver, etcd, kube-controller-manager, kube-scheduler) across 3 Availability Zones; you manage the worker nodes (EC2 instances) and what runs on them; EKS is Kubernetes — everything from Topics 185-189 applies unchanged
- **Node groups**: managed node groups (AWS provisions and manages EC2 Auto Scaling Groups for worker nodes, handles OS patches and node version upgrades); Fargate profiles (serverless worker nodes — no EC2 instances to manage, AWS runs pods on shared infrastructure billed per pod CPU/memory); managed node groups with Graviton (arm64) for 20% cost savings
- **IRSA (IAM Roles for Service Accounts)**: pods access AWS services (S3, RDS, Secrets Manager) via IAM roles attached to Kubernetes ServiceAccounts; each pod gets a scoped IAM role — the payment service reads from payment-bucket ONLY, the user service reads from user-bucket ONLY; eliminates the need for hardcoded AWS credentials anywhere in the codebase; the AWS SDK auto-discovers credentials from the pod's projected service account token
- **AWS Load Balancer Controller**: add-on that watches Kubernetes Ingress resources and provisions actual AWS Application Load Balancers; one ALB per Ingress; annotation-based configuration for SSL termination, WAF attachment, access logs to S3
- **EBS CSI Driver / EFS CSI Driver**: Kubernetes PersistentVolumeClaims provision AWS EBS volumes (block storage, single AZ — for stateful pods) or EFS mounts (shared NFS-like filesystem across AZs — for shared reads); required for any stateful workload (Elasticsearch, PostgreSQL on Kubernetes, media processing)
- 🆕 **Gap topic for Hruday**: "I used AKS (Azure Kubernetes Service) at SAP — the Kubernetes concepts are identical; EKS differs only in how it integrates with AWS-specific services (IAM, ALB, EBS). I can apply all Kubernetes fundamentals to EKS and learn the AWS integrations."

---

## 1. One-Line Definition
Amazon EKS is a managed Kubernetes service that runs the Kubernetes control plane on AWS-managed infrastructure and lets you focus on deploying and operating workloads on worker nodes, with native integrations to AWS services like IAM, VPC, ALB, EBS, and CloudWatch.

---

## 2. The Problem It Solves

Running Kubernetes without EKS means managing the control plane yourself: provisioning and paying for etcd cluster nodes (high availability requires 3-5 etcd nodes), securing the kube-apiserver endpoint, handling control plane upgrades (a complex multi-step process that can break production if done incorrectly), monitoring control plane health, and maintaining control plane infrastructure 24/7. This is non-trivial operational overhead that has nothing to do with your actual application.

EKS removes all of that. AWS operates the control plane as a managed service with a charged hourly rate per cluster ($0.10/hour). You get a highly-available, auto-updated (with your approval) Kubernetes control plane with zero operational overhead on your part. You pay only for the worker nodes (EC2 instances) where your actual workloads run.

The second problem EKS solves: **AWS service integration**. Pod-level IAM roles (IRSA) allow Kubernetes workloads to access AWS services with fine-grained permissions without credentials anywhere in the codebase. Kubernetes PersistentVolumeClaims can provision and manage real EBS volumes. Kubernetes Ingress objects provision real Application Load Balancers. CloudWatch Container Insights reads pod-level metrics from EKS. These integrations require significant custom configuration in self-managed Kubernetes but are official first-party add-ons on EKS.

---

## 3. How It Works Internally

### EKS Architecture

```
AWS EKS Cluster Architecture:

  AWS-managed Control Plane (you pay $0.10/hr, you DON'T touch these):
  ┌─────────────────────────────────────────────────────────┐
  │  kube-apiserver (3-5 replicas across AZs)               │
  │  etcd (5 nodes, encrypted, backed up by AWS)            │
  │  kube-controller-manager (replicated, leader-elected)   │
  │  kube-scheduler (replicated, leader-elected)            │
  │  AWS VPC CNI controller (assigns ENIs/IPs to pods)      │
  └────────────────┬────────────────────────────────────────┘
                   │ API calls (kubectl, Helm, CI/CD)
  ┌────────────────┼────────────────────────────────────────┐
  │  Your VPC      │                                        │
  │                ▼                                        │
  │  ┌──────────── Managed Node Group ──────────────────┐  │
  │  │  EC2: m6g.xlarge (Graviton arm64, 4vCPU, 16GB)   │  │
  │  │  EC2: m6g.xlarge                                  │  │
  │  │  EC2: m6g.xlarge                                  │  │
  │  │  kubelet running on each → reports to apiserver   │  │
  │  │  Amazon Linux 2023 EKS-optimized AMI              │  │
  │  │  Managed by AWS: patches, node recycling, upgrades│  │
  │  └───────────────────────────────────────────────────┘  │
  │                                                         │
  │  ┌──────────── Fargate Profile ─────────────────────┐   │
  │  │  No EC2 instances — pods run on AWS-managed infra │   │
  │  │  Each pod gets dedicated compute (no neighbours)  │   │
  │  │  Billed per pod CPU/memory per second             │   │
  │  │  Good for: batch jobs, low-traffic services       │   │
  │  └───────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────┘
```

### IRSA (IAM Roles for Service Accounts) — Deep Dive

```
Problem: Pod needs to read from S3 bucket.

Wrong approach:
  Store AWS access key + secret in Kubernetes Secret
  → All pods on the node share if mounted wrong
  → Credentials rotate manually → downtime risk
  → Security audit: hardcoded/stored credentials (OWASP A02)

IRSA approach (correct):
  
  1. EKS cluster has an OIDC Identity Provider URL (assigned at cluster creation)
     e.g., https://oidc.eks.ap-south-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE
  
  2. Create an IAM Role with a trust relationship to the OIDC provider:
     {
       "Condition": {
         "StringEquals": {
           "oidc.eks.ap-south-1.amazonaws.com/id/EXAMPLE:sub": 
             "system:serviceaccount:payment-service:payment-sa"
         }
       }
     }
     This trust policy says: "Only the 'payment-sa' ServiceAccount in 
     the 'payment-service' namespace may assume this role"
  
  3. Attach IAM policy to the role:
     Allow: s3:GetObject on arn:aws:s3:::payment-documents/*
  
  4. Annotate the Kubernetes ServiceAccount:
     apiVersion: v1
     kind: ServiceAccount
     metadata:
       name: payment-sa
       namespace: payment-service
       annotations:
         eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/PaymentS3ReadRole
  
  5. Use the ServiceAccount in the Deployment:
     spec:
       serviceAccountName: payment-sa
  
  Runtime flow:
    Pod starts → Kubernetes injects a projected volume with a signed JWT token
                  (the token's audience = the OIDC provider URL)
    AWS SDK calls STS: AssumeRoleWithWebIdentity (using the JWT token)
    STS validates the JWT with the OIDC provider → verifies namespace + SA name
    STS returns temporary credentials (valid 1 hour, auto-refreshed by SDK)
    AWS SDK uses the temporary credentials for all subsequent API calls
  
  Your Java code doesn't change at all:
    S3Client.builder().build()  // SDK auto-detects IRSA credentials
```

### AWS Load Balancer Controller

```
Without AWS Load Balancer Controller:
  Kubernetes LoadBalancer Service → AWS creates Classic Load Balancer per service
  → 10 services = 10 Classic Load Balancers = 10x cost + separate SSL termination
  → Classic Load Balancers are legacy (no HTTP/2, no gRPC, no WAF support)

With AWS Load Balancer Controller:
  Kubernetes Ingress → Controller reconciles → creates 1 AWS ALB
  All routing rules defined in the Ingress → ALB target group rules
  
  Ingress rules:
    /api/payments/* → payment-service:8080
    /api/users/*    → user-service:8080
    /api/products/* → product-service:8080
  
  One ALB handles all routing → cost-effective

ALB features accessible via Kubernetes annotations:
  - SSL termination (attach ACM certificate via annotation)
  - WAF v2 integration (attach Web Application Firewall)
  - Access logs to S3
  - Sticky sessions  
  - Weighted target groups (for canary deployments)
  - Health check path and thresholds
```

---

## 4. The Code

### Wrong Way — No IRSA, Shared Node Role
```yaml
# ❌ WRONG — relying on EC2 instance profile (the node IAM role) for all pod permissions

# Node IAM role attached to managed node group:
# Policy: AmazonS3FullAccess (attached to node group IAM role)
# 
# This means: ALL pods running on this node can access ALL S3 buckets
# The payment service, the user service, the logging sidecar, everything —
# all have equal unrestricted S3 access because the node's IAM role grants it.
#
# If any pod is compromised, the attacker has full S3 access for your entire account.
# This violates the principle of least privilege and is flagged by AWS Security Hub.

# Also wrong:
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: payment-service
          env:
            - name: AWS_ACCESS_KEY_ID      # ❌ Hardcoded/injected key in env vars
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: accessKeyId
            - name: AWS_SECRET_ACCESS_KEY  # ❌ Rotates manually, downtime risk
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secretAccessKey
```

> **Why this fails:** The node IAM role approach means any pod on any node can access all AWS services the node has permission for. A compromised pod (via dependency vulnerability) means the attacker can list all S3 objects, access all secrets. Using stored credentials in Kubernetes Secrets means manual rotation risk and a wider blast radius if the Secret is accidentally exposed in logs.

### Right Way — IRSA with Per-Service Scoped Roles
```bash
# Step 1: Create OIDC provider for the cluster (one-time setup)
eksctl utils associate-iam-oidc-provider \
    --cluster payment-platform-prod \
    --region ap-south-1 \
    --approve

# Step 2: Create IAM service account (creates both K8s SA + IAM Role in one command)
eksctl create iamserviceaccount \
    --cluster payment-platform-prod \
    --namespace payment-service \
    --name payment-sa \
    --attach-policy-arn arn:aws:iam::123456789012:policy/PaymentServicePolicy \
    --approve \
    --region ap-south-1
# This command:
# → Creates Kubernetes ServiceAccount "payment-sa" in "payment-service" namespace
# → Creates IAM Role with OIDC trust policy scoped to this exact namespace+SA
# → Annotates the ServiceAccount with the IAM Role ARN
# → All in one CLI command

# The resulting ServiceAccount YAML (created automatically):
# apiVersion: v1
# kind: ServiceAccount
# metadata:
#   name: payment-sa
#   namespace: payment-service
#   annotations:
#     eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/eksctl-payment-platform-prod-addon-iamserviceaccount-...
```

```yaml
# IAM Policy for payment service (minimal permissions only):
# PaymentServicePolicy.json:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::payment-documents-prod/*"
      # Not s3:* — only GetObject and PutObject
      # Not arn:aws:s3:::*/* — only this specific bucket
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:ap-south-1:123456789012:secret:payment/*"
      # Only payment/* secrets — not all secrets in the account
    }
  ]
}
```

```yaml
# Deployment using the IRSA ServiceAccount:
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payment-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      serviceAccountName: payment-sa          # Picks up the IRSA IAM role annotation
      # NO AWS credentials anywhere — SDK discovers them from the projected token volume
      
      containers:
        - name: payment-service
          image: 123456789012.dkr.ecr.ap-south-1.amazonaws.com/payment-service:v1.2.3
          # Note: ECR image — not Docker Hub; private registry in same AWS account
          # EKS nodes have permission to pull from ECR automatically
          
          ports:
            - containerPort: 8080
          
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: production
            # DB credentials from Secrets Manager — retrieved at runtime via SDK, not injected as env var
            # The ExternalSecrets Operator can sync Secrets Manager secrets to K8s Secrets automatically
          
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 10
          
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 30

---
# AWS Load Balancer Controller Ingress:
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payment-platform-ingress
  namespace: payment-service
  annotations:
    # AWS Load Balancer Controller annotations — configure the provisioned ALB
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing       # Public ALB (internal for private APIs)
    alb.ingress.kubernetes.io/target-type: ip               # Direct to pod IPs (not NodePort)
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:ap-south-1:123:certificate/abc-123
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS": 443}, {"HTTP": 80}]'
    alb.ingress.kubernetes.io/actions.ssl-redirect: |        # Redirect HTTP → HTTPS
      {
        "Type": "redirect",
        "RedirectConfig": {"Protocol": "HTTPS", "StatusCode": "HTTP_301"}
      }
    alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:ap-south-1:123:regional/webacl/payment-waf/xxxx
    alb.ingress.kubernetes.io/access-logs-s3-bucket: payment-alb-logs
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=60
spec:
  rules:
    - http:
        paths:
          - path: /api/payments
            pathType: Prefix
            backend:
              service:
                name: payment-service
                port:
                  number: 8080
          - path: /api/users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 8080
```

```java
// Java code — ZERO changes for IRSA; AWS SDK auto-detects credentials
@Service
public class PaymentDocumentService {
    
    // SDK creates a DefaultCredentialsProvider chain that checks, in order:
    // 1. Env vars (AWS_ACCESS_KEY_ID) — not set in IRSA pods
    // 2. System properties — not set
    // 3. Web Identity Token File — THIS IS SET by Kubernetes for IRSA pods
    //    (AWS_WEB_IDENTITY_TOKEN_FILE env var + AWS_ROLE_ARN are auto-injected by EKS)
    // 4. EC2 instance metadata — fallback if running on EC2 without IRSA
    
    private final S3Client s3Client = S3Client.builder()
        .region(Region.AP_SOUTH_1)
        // No .credentialsProvider() needed — auto-detected
        .build();
    
    public void storeDocument(String documentId, byte[] content) {
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket("payment-documents-prod")
                .key("documents/" + documentId + ".pdf")
                .contentType("application/pdf")
                .build(),
            RequestBody.fromBytes(content)
        );
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What does EKS give you over running your own Kubernetes cluster on EC2?"

**Hruday's answer:**
> EKS buys you a fully managed, highly available Kubernetes control plane. The control plane is the brain of Kubernetes — kube-apiserver, etcd, controller-manager — and AWS manages it across 3 Availability Zones with automated health monitoring and recovery. Without EKS, running production-grade HA Kubernetes control plane means maintaining 3-5 etcd nodes, securing the kube-apiserver, handling upgrade procedures. This is significant operational work.
>
> Beyond the control plane, EKS provides native integrations that are custom-built work on vanilla Kubernetes: IRSA (pod-level IAM roles via OIDC), the AWS Load Balancer Controller (Ingress → ALB), EBS/EFS CSI drivers (PVC → actual AWS storage), Container Insights (CloudWatch metrics for Kubernetes workloads), and AWS VPC CNI (pods get real VPC IP addresses, enabling security group rules at the pod level).
>
> The operational cost reduction is the main value. At SAP, our equivalent on AKS dramatically reduced platform engineering time — we focused on deploying and scaling services rather than maintaining control plane infrastructure.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain IRSA and why it matters for security."

**Hruday's answer:**
> IRSA stands for IAM Roles for Service Accounts. It's the mechanism by which individual Kubernetes pods can authenticate to AWS services (like S3, Secrets Manager, RDS via its SDK-aware connectors) using IAM roles, without any stored credentials anywhere in the codebase or cluster.
>
> The mechanism uses OIDC (OpenID Connect). Each EKS cluster has an OIDC Identity Provider URL registered with AWS IAM. You create an IAM Role with a trust policy that says "only the ServiceAccount named X in namespace Y may assume this role." You annotate the Kubernetes ServiceAccount with that IAM Role ARN. When a pod using that ServiceAccount starts, Kubernetes injects a projected volume containing a signed JWT token — the pod's identity token. The AWS SDK automatically detects this token (via the `AWS_WEB_IDENTITY_TOKEN_FILE` environment variable injected by EKS), calls STS AssumeRoleWithWebIdentity, gets temporary credentials valid for 1 hour, and uses those for all API calls. The SDK refreshes automatically before expiry.
>
> The security benefit: every service has a scoped IAM role that grants minimum permissions. The payment service's role allows `s3:GetObject` on `payment-documents/*` only. The user service's role has access to `user-media/*` only. If either pod is compromised, the blast radius is contained to those exact resources. There are no long-lived credentials to rotate, no credentials to accidentally commit to Git, no secrets to rotate manually.
>
> Without IRSA, the alternative is either the EC2 node's instance profile (shared by all pods on that node — terrible blast radius) or Kubernetes Secrets containing AWS credentials (manual rotation, risk of secret exposure in logs). IRSA eliminates both problems.

---

### Q3 — Trade-off
**Interviewer asks:** "When would you use Fargate profiles vs managed node groups on EKS?"

**Hruday's answer:**
> Managed node groups are the right choice for most production workloads. You get EC2 instances with predictable compute capacity, flexible instance sizing, support for GPU instances, ability to use Spot instances for cost savings, and no restrictions on workloads (any Kubernetes feature works — DaemonSets, HostPath volumes, privileged containers).
>
> Fargate profiles are compelling for:
>
> First, batch jobs. A nightly report generation job that runs for 10 minutes at 2am doesn't justify keeping EC2 instances warm. Fargate profiles let Kubernetes schedule those pods on AWS-managed compute, billed for execution time only, with no idle cost. Using a Kubernetes CronJob plus Fargate profile is essentially Lambda-style billing for Kubernetes workloads.
>
> Second, blast radius isolation. Fargate pods run on completely isolated compute — no pod neighbours. This matters for security-sensitive workloads.
>
> Third, teams without dedicated platform engineers. Fargate removes the need to manage node group upgrades, AMI patches, and capacity planning. A small team can focus entirely on application deployment.
>
> The trade-offs of Fargate: it's more expensive per CPU/memory unit than EC2 Spot, it doesn't support DaemonSets (can't run a log shipping sidecar as a DaemonSet — you'd run it as a sidecar container instead), and there are limits on pod size (maximum 4 vCPU, 30GB memory per pod at current limits).
>
> My recommendation: managed node groups (Graviton/arm64 with Spot for cost savings) for stateless services, Fargate for batch/CronJob workloads, and consideration of Karpenter for auto-provisioning heterogeneous instance types.

---

### Q4 — Experience
**Interviewer asks:** "You haven't used EKS directly, only AKS. How comfortable are you operating on EKS?"

**Hruday's answer:**
> Kubernetes is Kubernetes. The core primitives — Deployments, Services, Ingress, ConfigMaps, Secrets, HPA, PodDisruptionBudgets — are identical between AKS and EKS. The `kubectl` commands, the YAML manifests, the Helm charts, the Kubernetes API — all work exactly the same way.
>
> The differences are cloud-specific integrations. On AKS at SAP, I used Azure AD Workload Identity (the equivalent of IRSA for Azure); on EKS, that's IRSA with OIDC and AWS IAM. On AKS, the load balancer integration uses Azure Application Gateway Ingress Controller; on EKS, that's the AWS Load Balancer Controller (ALB). On AKS, persistent volumes use Azure Disk CSI Driver; on EKS, that's EBS CSI Driver. The concepts are identical — the specific services and annotations differ.
>
> I've studied EKS IRSA, ALB Controller, EBS CSI Driver, and Karpenter. I'm confident I could operate an EKS cluster from day one. The 30% of EKS knowledge I'd build from AKS experience is "which AWS service name does this AWS concept map to" — not "what does Kubernetes do."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "EKS is expensive" | "EKS costs $0.10/hour so it's expensive for small teams" | $73/month for the control plane is negligible compared to EC2 worker node costs; a 3-node cluster at m6g.large = ~$180/month in nodes vs $73 control plane; for production, the managed control plane HA is worth far more than $73/month vs the operational cost of self-managing it |
| "Use one IAM role per cluster" | "We give all pods the cluster-level IAM role for simplicity" | One IAM role per service (IRSA) is the correct pattern; a compromised pod with cluster-level S3 full access is a critical security incident; IRSA scoped to exactly what the service needs limits blast radius to that service's data only |
| "node-to-pod communication requires a Service" | "Pods talk to each other via Services always" | Pods have real VPC IP addresses on EKS (AWS VPC CNI assigns them); pods CAN communicate directly via pod IP; Services provide stable DNS names and load balancing across pod replicas — use Services for pod-to-pod communication; direct pod IPs are ephemeral |
| "EKS upgrades are automatic" | "AWS upgrades Kubernetes automatically on EKS" | AWS will update the MANAGED CONTROL PLANE minor versions but nodes (managed node groups) require your approval and action to upgrade; Kubernetes releases are supported for ~14 months; plan node group upgrades before end of support; in-place upgrades mean rolling-replace of nodes; test workloads against new K8s version in staging first |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I worked on an AKS cluster hosting our core SAP BTP integration services — a mix of Spring Boot microservices communicating over Kafka, with a few heavier Java batch processors. The experience closest to EKS IRSA was Azure AD Workload Identity, where each Spring Boot service had an associated Azure Managed Identity with scoped permissions to Azure Key Vault secrets and Azure Blob Storage. The principle is identical: pod-level identity → cloud IAM → specific resource access → no stored credentials.
>
> We used the Azure Ingress Controller (nginx on AKS) to expose our services through a single ingress point — mapping paths to backend services, handling TLS termination, and rate-limiting the public-facing endpoints. This is functionally identical to the AWS Load Balancer Controller pattern on EKS.
>
> What I would do differently knowing EKS now: the ALB integration on EKS natively supports WAF v2 and access logs to S3 via annotations — on AKS we had a separate nginx ingress controller configuration. EKS's tighter AWS integration is an advantage for teams already in AWS."

---

## 8. Scale Evolution

**Small team (2-5 services, 5-20 pods total) →** Single managed node group (2-3 nodes), Fargate for CronJobs, eksctl for cluster management, Helm charts for deployments, no service mesh needed.

**Medium team (10-30 services, 100+ pods) →** Multiple node groups by workload type (compute-intensive, memory-intensive, general); Karpenter for node provisioning (automatically provisions the right EC2 instance type for the pod's resource requests); Cluster Autoscaler or Karpenter for scaling; Argo CD for GitOps-based deployment; proper namespace separation per team/domain.

**Large org (50+ services, 1,000+ pods) →** Multiple EKS clusters by environment and potentially region; Istio or AWS App Mesh for service-to-service mTLS and observability; Karpenter with Spot + On-Demand mixed deployments; VPC per cluster architecture; dedicated platform engineering team running the cluster; Prometheus + Grafana for metrics (beyond CloudWatch Container Insights).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment services run on EKS with strict IAM policies (PCI-DSS compliance); IRSA is mandatory for any pod touching payment data; ALB WAF for payment API protection; EKS in multi-region for HA of payment processing | Know EKS security deeply: IRSA, security groups for pods, private clusters, EKS Audit Logging |
| Swiggy / Meesho | Mixed workloads: always-on order processing on managed node groups; transient batch order-forecasting on Fargate; Karpenter scaling for order surge on evenings | Know node provisioning (Karpenter vs Cluster Autoscaler); Spot instance handling; pod scheduling constraints |
| Adobe / Microsoft | Adobe uses EKS for Creative Cloud processing pipelines at large scale; GPU node groups for ML workloads; EFS shared storage for processing pipelines | EKS GPU node groups; stateful workloads on EBS; large-scale multi-tenant EKS patterns |
| SAP Labs | SAP BTP uses a mix of AKS and EKS; team expected to operate Kubernetes regardless of cloud; cross-cloud Kubernetes knowledge valued | Map AKS → EKS equivalents confidently; IRSA vs Azure Workload Identity; AWS ALB vs Azure AppGW |

---

## 10. Related Topics — What to Study Next

- **Topic 185-189 — Kubernetes Fundamentals** — All Kubernetes concepts apply directly to EKS; EKS is Kubernetes; master the Deployments, Services, ConfigMaps, Probes, and HPA topics before studying EKS-specific integrations; EKS adds AWS-integrations on top of standard Kubernetes
- **Topic 199 — VPC, Security Groups, IAM** — EKS runs inside a VPC; worker nodes live in private subnets; ALB lives in public subnets; security groups at the node level (all traffic) and optionally pod level (with security groups for pods feature); IAM is central to EKS operations — node IAM role, IRSA, eksctl permissions
- **Topic 198 — CloudWatch Logs, Metrics, Alarms** — CloudWatch Container Insights is the primary metrics/logging solution for EKS; installs as a DaemonSet (CloudWatch agent) or Fluent Bit DaemonSet for log shipping; provides pod-level CPU/memory/network metrics in CloudWatch dashboards; essential for EKS observability
- **Topic 196 — API Gateway + Lambda** — The EKS vs Lambda decision recurs constantly; some AWS architectures mix both — EKS for synchronous APIs, Lambda for event-driven processing; IRSA and Lambda execution roles are both OIDC-based IAM approaches; understanding both helps architect systems that use each appropriately

---

*Part 11 · EKS — Kubernetes on AWS · Full Stack Interview Guide · Hruday D · 2026*
