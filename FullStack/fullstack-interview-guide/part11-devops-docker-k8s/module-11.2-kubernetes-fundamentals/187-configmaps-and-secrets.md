# ConfigMaps and Secrets
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **ConfigMap**: stores non-sensitive configuration data as key-value pairs — Spring profile name, log level, feature flag values, external service URLs; pods consume them as environment variables or as mounted files
- **Secret**: stores sensitive data — passwords, API keys, TLS certificates; stored base64-encoded in etcd (NOT encrypted by default — base64 is not encryption, just encoding); same consumption patterns as ConfigMap but shows as `[secret]` in `kubectl describe`
- **Two consumption patterns**: (1) env var injection — pod startup reads key as environment variable into the container process; pod must restart to pick up changes; (2) volume mount — file appears inside the container at a path; kubelet re-mounts updated values without pod restart (live reload)
- **Volume mount enables live config reload**: mount a ConfigMap as files; application reads the file at the path; when ConfigMap updates, the mounted file updates within ~60 seconds without restarting the pod — Spring Cloud Kubernetes Config Watcher uses this
- **Production secret pattern**: base64 in etcd isn't safe enough; use External Secrets Operator to sync from AWS Secrets Manager/HashiCorp Vault into Kubernetes Secrets automatically; application reads from K8s Secret normally; the actual secret lives in a managed vault, not in your git repo
- **Never put secrets in git**: `application.yml` or Dockerfile `ENV` containing passwords = credentials in your repository history forever = security breach
- 🆕 **Gap topic for Hruday**: "I've used ConfigMaps and Secrets at SAP for injecting Spring profiles and DB credentials. I'm building depth on External Secrets Operator and the fine-grained control differences between env vars and volume mounts"

---

## 1. One-Line Definition
ConfigMaps and Secrets decouple configuration and credentials from container images — so the same image runs identically in dev, staging, and production, with environment-specific config injected at runtime by Kubernetes rather than baked into the image or checked into version control.

---

## 2. The Problem It Solves

Every Spring Boot application needs configuration: a database URL, a Redis host, an API key for Stripe, a feature flag to enable a new payment flow. Without a configuration mechanism, you have three bad options: bake config into the image (different image per environment, defeats the purpose of containers), pass it via command line (credentials visible in `ps aux` output), or use environment variables set manually on each server (fragile, not version-controlled).

ConfigMaps solve the non-sensitive config problem. They're stored in Kubernetes (version-controlled through GitOps), decoupled from the image, and environment-specific without requiring different images per environment.

Secrets solve the sensitive config problem — same mechanism but with access controls: RBAC can let only the payment-service Service Account read the payment-db-credentials Secret, not the user-service. Secrets can also be encrypted at rest in etcd if you configure an EncryptionConfiguration.

The deeper value: **infrastructure as code**. Your ConfigMap YAML is in your git repository alongside your Deployment YAML. A new developer cloning the repo can see exactly what configuration the service needs. The configuration history is in git. You can review config changes in pull requests. This is the foundation of GitOps.

---

## 3. How It Works Internally

### ConfigMap — Structure and Consumption

```
ConfigMap object (stored in etcd):
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: payment-config
    namespace: payment
  data:
    SPRING_PROFILES_ACTIVE: "production"
    LOG_LEVEL: "INFO"
    PAYMENT_GATEWAY_URL: "https://api.stripe.com/v1"
    application.properties: |
      spring.profiles.active=production
      logging.level.root=INFO
      payment.gateway.url=https://api.stripe.com/v1
      payment.timeout.ms=5000

Two consumption patterns:

Pattern 1 — Environment Variable injection:
  Container starts → Kubernetes sets env vars before JVM starts
  JVM reads SPRING_PROFILES_ACTIVE from environment
  Application uses the value
  ⚠️ If ConfigMap changes, pod must restart to see new values

Pattern 2 — Volume Mount (file system):
  Kubernetes creates a file at the mount path
  For key "application.properties" → file at /config/application.properties
  Spring Boot reads: spring.config.import=configtree:/config/
  ✅ When ConfigMap is updated:
     etcd is updated
     kubelet on the node detects the change (polls every ~60s)
     kubelet re-mounts the new content to the container's filesystem
     Application reads the new file content
     No pod restart needed (if application watches the file)
```

### Secret — What Base64 Means (and What It Doesn't)

```
Secret object:
  kind: Secret
  type: Opaque
  data:
    DB_PASSWORD: cGFzc3dvcmQxMjM=    ← "password123" encoded in base64

Let's be clear about what this is:
  $ echo "password123" | base64
  cGFzc3dvcmQxMjM=                   ← this is base64 encoding

  $ echo "cGFzc3dvcmQxMjM=" | base64 --decode
  password123                         ← anyone can decode it instantly

Base64 is NOT encryption:
  - It's a text encoding format (binary data → ASCII text)
  - Zero security value — anyone with the etcd data can decode it in seconds
  - Kubernetes uses it for consistent encoding of binary data (TLS certs, etc.)
  - The security comes from: Kubernetes RBAC (who can GET secrets), etcd
    encryption at rest (cluster config), and network policies

Real security measures:
  1. RBAC — only the payment service's ServiceAccount can read the payment Secret
  2. Etcd encryption at rest — encrypt the etcd storage using AES-GCM
  3. External Secrets — don't store actual secrets in etcd at all (best practice)
```

### External Secrets Operator — The Production Pattern

```
Without External Secrets (naive):
  Developer → git push application.yml with DB_PASSWORD hardcoded
  CI pipeline → builds Docker image containing the password
  Password is in: git history, Docker image layers, K8s Secret in etcd
  
  OR developer creates K8s Secret manually → not in git → config drift

With External Secrets Operator (production):
  
  Source of truth: AWS Secrets Manager
  Key: /payment-service/production/db_password
  Value: actual password (rotated every 90 days automatically)
  
  ExternalSecret resource (safe to commit to git):
    ┌─────────────────────────────────────────────┐
    │ apiVersion: external-secrets.io/v1beta1     │
    │ kind: ExternalSecret                        │
    │ spec:                                       │
    │   secretStoreRef:                           │
    │     name: aws-secrets-manager               │
    │   refreshInterval: 1h                       │
    │   target:                                   │
    │     name: payment-db-credentials            │
    │   data:                                     │
    │   - secretKey: DB_PASSWORD                  │
    │     remoteRef:                              │
    │       key: /payment-service/production/...  │
    └─────────────────────────────────────────────┘
    
  External Secrets Operator:
    - Reads ExternalSecret resource
    - Calls AWS Secrets Manager API (using IRSA — IAM Role for Service Account)
    - Creates/updates Kubernetes Secret with the value from AWS
    - Refreshes every 1 hour
    
  Application reads from Kubernetes Secret — same mechanism as before
  Actual secret lives in AWS Secrets Manager, not in git or etcd
```

---

## 4. The Code

### Wrong Way — Hardcoded Config in Images or YAML
```yaml
# ❌ WRONG — config hardcoded in Dockerfile ENV
FROM eclipse-temurin:17-jre
ENV SPRING_PROFILES_ACTIVE=production
ENV DB_PASSWORD=supersecretpassword123    # committed to git, in image layers, visible in `docker inspect`
ENV STRIPE_API_KEY=sk_live_abc123         # EVERY environment using this image has the same password
COPY app.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
# ❌ WRONG — database password in application.yml committed to git
spring:
  datasource:
    url: jdbc:postgresql://prod-db.internal:5432/payments
    username: payment_user
    password: supersecretpassword123     # This is now in your git history forever
    
# Even if you delete it from the latest commit, git history retains it
# `git log -p -- src/main/resources/application.yml` reveals it
```

> **Why this is a security breach:** Credentials in git history are permanent. Even after rotation, the old password exists in every clone, fork, and backup of the repository. Secret scanners like truffleHog, GitGuardian, and GitHub's own secret scanning automatically detect patterns for AWS keys, database passwords, and API tokens. OWASP A07 (Identification and Authentication Failures) and the broader "Secrets Exposure" risk category make this a common and severe finding in security audits at enterprise companies.

### Right Way — ConfigMap for Non-Sensitive, Secret (via External Secrets) for Sensitive
```yaml
# configmap.yaml — safe to commit to git
apiVersion: v1
kind: ConfigMap
metadata:
  name: payment-config
  namespace: payment
data:
  # Simple key-value — available as env vars
  SPRING_PROFILES_ACTIVE: "production"
  LOG_LEVEL: "INFO"
  
  # File content — mount this as /config/application.properties
  application.properties: |
    spring.profiles.active=production
    logging.level.root=INFO
    logging.level.com.sap.payment=DEBUG
    payment.gateway.url=https://api.stripe.com/v1
    payment.gateway.timeout-ms=5000
    payment.retry.max-attempts=3
    management.health.livenessState.enabled=true
    management.health.readinessState.enabled=true
```

```yaml
# external-secret.yaml — safe to commit to git (no actual credentials here)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payment-db-credentials
  namespace: payment
spec:
  refreshInterval: "1h"                     # Re-sync from Secrets Manager every hour
  secretStoreRef:
    name: aws-secrets-manager-store         # Reference to the SecretStore that defines
    kind: SecretStore                       # how to connect to AWS Secrets Manager
  target:
    name: payment-db-credentials            # Name of the K8s Secret to create/update
    creationPolicy: Owner                   # External Secrets owns this K8s Secret
  data:
    - secretKey: DB_PASSWORD                # Key in the K8s Secret
      remoteRef:
        key: /payment-service/production/database  # Path in AWS Secrets Manager
        property: password                  # JSON property in the Secrets Manager value
    - secretKey: STRIPE_API_KEY
      remoteRef:
        key: /payment-service/production/stripe
        property: api_key
```

```yaml
# deployment.yaml — consuming both ConfigMap and Secret
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payment
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
      containers:
        - name: payment-service
          image: payment-service:1.1.0
          ports:
            - containerPort: 8080
          
          # Pattern 1: env vars from ConfigMap (non-sensitive)
          env:
            - name: SPRING_PROFILES_ACTIVE
              valueFrom:
                configMapKeyRef:
                  name: payment-config
                  key: SPRING_PROFILES_ACTIVE
            
            # Pattern 2: env vars from Secret (sensitive)
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: payment-db-credentials
                  key: DB_PASSWORD
            
            - name: STRIPE_API_KEY
              valueFrom:
                secretKeyRef:
                  name: payment-db-credentials
                  key: STRIPE_API_KEY
          
          # Pattern 3: volume mount for file-based config (live reload possible)
          volumeMounts:
            - name: app-config
              mountPath: /config               # Files appear at /config/application.properties
              readOnly: true
      
      volumes:
        - name: app-config
          configMap:
            name: payment-config
            items:
              - key: application.properties    # ConfigMap key
                path: application.properties   # File name at the mountPath

# Spring Boot reads: spring.config.import=configtree:/config/
# This reads all files in /config/ as Spring properties
# When ConfigMap updates, mounted file updates within ~60s — no pod restart needed
# (Spring Cloud Kubernetes can also watch for changes and refresh beans automatically)
```

**RBAC to restrict who can read Secrets:**
```yaml
# Only the payment-service ServiceAccount can read the payment Secret
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: payment-secret-reader
  namespace: payment
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["payment-db-credentials"]  # Only THIS specific Secret
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payment-secret-reader-binding
  namespace: payment
subjects:
  - kind: ServiceAccount
    name: payment-service                      # Only the payment-service pod's identity
    namespace: payment
roleRef:
  kind: Role
  name: payment-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

> **Key decisions here:**
> - Never use `envFrom: secretRef` to inject ALL keys from a Secret — this bulk-imports every secret into the environment, including keys added in the future that may not be intended for this pod; import only the specific keys the pod needs
> - File mounts for live reload ONLY work if the application reads the config file at request time (or has a file watcher) — Spring Boot doesn't re-read `application.properties` on disk changes by default; use Spring Cloud Kubernetes Config Watcher or design the app to re-read from the file
> - Restarting a pod picks up the latest ConfigMap/Secret values even with env var injection — the env vars are re-evaluated at pod start; this is why a `kubectl rollout restart deployment/payment-service` is a safe way to force config reload

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between a ConfigMap and a Secret in Kubernetes?"

**Hruday's answer:**
> Both store configuration data as key-value pairs and both can be consumed by pods as environment variables or mounted file volumes. The difference is the type of data and access controls.
>
> ConfigMaps are for non-sensitive configuration: Spring profiles, log levels, feature flags, external service URLs. They're unencoded — the values are stored as plaintext in etcd and are visible to anyone who can read the resource.
>
> Secrets are for sensitive data: passwords, API keys, TLS certificates. They're base64-encoded in etcd. I want to be precise here — base64 is encoding, not encryption. It makes binary data safe to store as text, but it provides zero security by itself. Anyone with `kubectl get secret -o yaml` and the right RBAC permissions can decode the value in seconds. The security value of Secrets comes from: Kubernetes RBAC restricting who can GET secrets, etcd encryption at rest using AES-GCM, and in production, using External Secrets Operator to sync from AWS Secrets Manager or Vault so the actual credential never lives in etcd at all.

---

### Q2 — Deep Dive
**Interviewer asks:** "If you update a ConfigMap, do running pods see the change? How does it work?"

**Hruday's answer:**
> It depends on how the pod consumes the ConfigMap.
>
> With environment variable injection, the env vars are set at pod startup. Kubernetes doesn't update running container environment variables. The pod must be restarted to read the new values. `kubectl rollout restart deployment/payment-service` triggers a rolling restart and applies the new ConfigMap values in the new pods.
>
> With volume mounts, Kubernetes can propagate the update to running pods without a restart. The ConfigMap data is stored in etcd. The kubelet on each node watches for ConfigMap changes and updates the projected volume (the mounted file) on the pod's filesystem. This typically happens within 60 seconds of the ConfigMap being updated. After the file changes, whether the application picks up the change depends on the application — if it reads the file on each request or uses a file watcher, it will see the new values; if it cached the config at startup, it won't.
>
> Spring Boot's `spring.config.import=configtree:/config/` reads the mounted files. Spring Cloud Kubernetes integrates with this to detect file changes and trigger a `ContextRefreshEvent` — refreshing `@ConfigurationProperties` beans annotated with `@RefreshScope`. This enables zero-downtime configuration changes for many non-critical settings like log levels and feature flags.

---

### Q3 — Trade-Off
**Interviewer asks:** "Why would you use External Secrets Operator instead of just creating Kubernetes Secrets?"

**Hruday's answer:**
> Kubernetes Secrets stored directly have several problems in enterprise production:
>
> First, they need to be created somehow — either manually (secrets drift from the source of truth, can't be reproduced), or via CI/CD (credentials end up in pipeline variables or git history somewhere in the chain). Neither is ideal.
>
> Second, secret rotation is manual and error-prone. If a database password is compromised and needs rotation, you update AWS Secrets Manager, then someone has to update every Kubernetes Secret in every cluster and namespace that uses it — and restart every pod that injected the old value as an env var.
>
> Third, git is the typical source of truth for Kubernetes YAML in GitOps workflows. You can't safely commit a Secret containing a real password to git.
>
> External Secrets Operator solves all three: the ExternalSecret resource (which is safe to commit to git) declares what to sync from where. The operator handles creating and updating the Kubernetes Secret automatically. Secret rotation in AWS Secrets Manager propagates to Kubernetes within the refresh interval. The source of truth is a proper secrets manager with audit logging, access policies, and encryption.
>
> At scale, I'd make External Secrets Operator mandatory — no manually created Kubernetes Secrets in production, and the CI pipeline validates that no Secret resources exist in the committed YAML.

---

### Q4 — Scenario
**Interviewer asks:** "A team member says 'let's just put the database password in the Deployment YAML as an env var.' How do you respond?"

**Hruday's answer:**
> I'd explain why that's a security risk and then offer the correct pattern.
>
> The immediate problem: Deployment YAML is committed to git. The password is now in the repository. Even if we remove it in the next commit, git history retains it permanently — `git log -p` can retrieve it indefinitely. Every developer who clones the repo, every CI runner that checks out the code, every backup of the repository contains the credential. If the repo ever becomes public or is breached, the credential is fully exposed.
>
> The OWASP category is "Cryptographic failures" (A02) and "Security misconfiguration" (A05) — storing credentials in plaintext in source control is a well-known vulnerability that's been responsible for major cloud account compromises.
>
> The right approach depends on the team's setup: if we have External Secrets Operator, I'd write an ExternalSecret resource pointing to the AWS Secrets Manager key where the password already lives. If we don't have ESO yet, I'd create a Kubernetes Secret manually for now (kubectl create secret generic, not in git), inject it via secretKeyRef in the Deployment, and document that adding ESO is the next step. I'd never accept a direct password in YAML as a solution.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Secrets are encrypted" | "Kubernetes Secrets are encrypted" | Secrets are base64-encoded, not encrypted; etcd stores them encoded but decoding takes one command; real security requires etcd encryption at rest (EncryptionConfiguration) or External Secrets via a secrets manager |
| ConfigMap restart assumption | "ConfigMaps update running pods automatically" | Only volume-mounted ConfigMaps update without restart; env var ConfigMaps require pod restart; live reload also requires application-level file watching |
| Bulk Secret import | "Use envFrom: secretRef to import all secrets at once" | Bulk import injects ALL keys including ones added later that weren't intended for this pod; always use `secretKeyRef` to import specific keys the pod needs |
| Secrets = safe to put in git | "We can commit Secrets YAML to git since they're encoded" | Base64 is trivially reversible; Secrets YAML in git = credential exposure; use External Secrets (ExternalSecret YAML is safe to commit) or sealed secrets |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we had a strict policy against hardcoded credentials after an early incident where someone accidentally committed an application.properties file with a test database password to the shared repository. That incident drove us to fully adopt environment-based config injection. I worked with ConfigMaps for Spring profile management — our Deployment YAML injected the `SPRING_PROFILES_ACTIVE` env var from a ConfigMap, so the same Docker image (tagged with the Git commit SHA) ran identically in staging and production with only the ConfigMap differing. For database credentials and API keys, we used Secrets injected via secretKeyRef, and I understand the External Secrets Operator pattern deeply since SAP BTP uses AWS Secrets Manager as the credentials backend — the operator pattern is what I'd use on any new project."

---

## 8. Scale Evolution

**1,000 users/day →** ConfigMaps for profiles and URLs, Kubernetes Secrets for credentials. Manually created Secrets are acceptable with small team and few services. Single environment typically.

**100,000 users/day →** Multiple environments (dev, staging, prod), multiple namespaces. External Secrets Operator becomes necessary — managing dozens of manually created Secrets across environments is error-prone. GitOps workflow: ExternalSecret resources in git, ESO syncs from Secrets Manager.

**10 million users/day →** Large number of services, automated secret rotation (30-90 day rotation for all credentials), Kubernetes RBAC tightly scoped per namespace and service account, etcd encryption at rest mandatory, secret access logged via Secrets Manager audit logs, compliance requirements met via automated evidence collection.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial services under PCI-DSS compliance; secret management is a security requirement, not optional; direct questions about how to handle credentials in Kubernetes are common | Explain the difference between encoding and encryption; know External Secrets pattern |
| Swiggy / Meesho | Many microservices each with their own database credentials and API keys; centralized secrets management via Vault or AWS Secrets Manager; DevSecOps culture | Explain volume mount vs env var trade-off; know when live reload is possible |
| Adobe / Microsoft | Enterprise cloud security standards; SOC2 and ISO 27001 require proper credential management; senior engineers expected to know why base64 ≠ encryption | Deep dive on RBAC for Secrets; etcd encryption at rest; audit logging |
| SAP Labs | SAP BTP enterprise customers require rigorous security; credential management in multi-tenant Kubernetes environments; External Secrets Operator or equivalent used in production | Direct experience with env var injection and Spring profile management |

---

## 10. Related Topics — What to Study Next

- **Topic 176 — Secrets Management** (Part 10 Security) — the deeper secrets management topic covering HashiCorp Vault, AWS Secrets Manager, and application-level secret consumption; ConfigMaps and Secrets is the Kubernetes-layer implementation; Topic 176 covers the secrets management platform layer
- **Topic 185 — Kubernetes Architecture** — ConfigMaps and Secrets are stored in etcd (the cluster's state store); etcd encryption at rest is configured at the Kubernetes cluster level; understanding the architecture explains why etcd access control is the root of K8s security
- **Topic 188 — Liveness and Readiness Probes** — if a ConfigMap change causes the application to restart (rolling restart), the readiness probe determines when the new pod is ready to receive traffic; correct probe configuration prevents traffic being sent to unconfigured pods during a rolling restart
- **Topic 197 — EKS: Kubernetes on AWS** — IAM Roles for Service Accounts (IRSA) enables the External Secrets Operator to call AWS Secrets Manager without a static credential stored anywhere; this is the AWS-specific implementation of the secure secrets pattern

---

*Part 11 · ConfigMaps and Secrets · Full Stack Interview Guide · Hruday D · 2026*
