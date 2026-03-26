# Secrets Management — Vault, AWS Secrets Manager
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem**: secrets (DB passwords, API keys, TLS private keys) in source code or `application.yml` → committed to Git → accessible to every engineer, every CI runner, every deployment history entry; the most common cause of cloud breaches
- **The solution**: secrets never in source code; injected at runtime from a secrets manager — **HashiCorp Vault** (self-hosted, fine-grained policies) or **AWS Secrets Manager** (managed, native AWS integration, auto-rotation for RDS)
- **Vault dynamic secrets**: Vault generates a fresh, time-limited DB credential for each Spring Boot instance on startup; the real long-term DB password stays in Vault; even if the app is compromised, the attacker only gets a short-lived credential that expires
- **AWS Secrets Manager**: stores secrets as JSON strings; integrates with Spring Cloud AWS to inject at startup; native rotation for RDS (calls your Lambda to update credentials); `SecretString` retrieved at runtime, not baked into the Docker image
- **Environment variables**: a reasonable middle ground between hardcoded and full secrets manager; secrets in Kubernetes Secrets → projected into container env vars; not as good as Vault (no rotation, visible in K8s API), but infinitely better than source code
- **Secret rotation**: secrets should rotate automatically; AWS Secrets Manager can auto-rotate RDS passwords by calling a Lambda; Vault's dynamic secrets rotate by definition (fresh credential per request); rotation reduces the damage window from a potential leak
- 🆕 **Gap topic for Hruday**: "I've used Kubernetes Secrets and environment variable injection in production; I've studied Vault dynamic secrets and AWS Secrets Manager architecture; this is a strength-in-progress area"

---

## 1. One-Line Definition
Secrets management is the discipline of storing, accessing, rotating, and auditing sensitive credentials (passwords, API keys, certificates, tokens) through a dedicated secure system — keeping them out of source code, configuration files, and deployment artifacts.

---

## 2. The Problem It Solves

An engineer adds a database password to `application.yml` to make the CI/CD pipeline work quickly. They commit it. Now:
- Every developer who clones the repo has the production DB password
- Every CI runner log that prints the environment has the password
- The Git history retains it forever — even if you delete the file, the password is visible in `git log`
- A disgruntled engineer who leaves the company still has it
- A GitHub public repo accidental push exposes it to the internet (this happens: Tesla, Uber, Capital One)

The damage: an attacker with a database password can exfiltrate your entire database in hours. GDPR/CCPA penalties for this are in the millions. Data breaches make headlines and destroy user trust.

Proper secrets management eliminates this attack surface:
- No secret is ever in source code, ever
- No secret is ever visible in CI/CD logs
- Access is governed by policies — this service can read these secrets, that service cannot
- Every secret access is logged — complete audit trail
- Secrets rotate automatically — a leaked credential expires quickly

For a senior engineer: knowing secrets management means knowing OWASP A05 (Security Misconfiguration) and A02 (Cryptographic Failures) in practice. It's the difference between "we don't expose secrets" as a policy statement and "we have a technical control that makes it impossible to expose secrets in source code."

---

## 3. How It Works Internally

### The Mental Model — Compare to a Physical Key Safe

A physical key safe: you don't carry the master key to the building in your pocket everywhere. You go to the security desk, show your badge, they check the access log, and give you today's key to your specific room. The key is time-limited (expires today). The security desk logs who accessed what key and when.

Secrets management is the same pattern for software. Your Spring Boot service (the application) authenticates to Vault (the security desk) using its Kubernetes service account or AWS IAM role (the badge). Vault checks its policy: is this service allowed to read the `payment-service/db-credentials` secret? If yes, it returns the credential. The access is logged. The credential has a lease (expires after 1 hour). When the service needs it again, it authenticates again.

### HashiCorp Vault — Dynamic Secrets

```
Static secrets (BAD — what people do without Vault):
  DB_PASSWORD=hardcoded-in-config → same password for months → if leaked, attacker has long window

Vault dynamic secrets (GOOD):
  On service startup:
    1. Spring Boot authenticates to Vault using Kubernetes service account token
    2. Vault checks: does role "payment-service" have the "db-creds" policy?
    3. Vault calls Postgres: CREATE ROLE vault_payment_abc123 WITH LOGIN PASSWORD 'temp-pw' VALID UNTIL 'now() + 1 hour'
    4. Vault returns { username: "vault_payment_abc123", password: "temp-pw" }
    5. Spring Boot connects to DB with these credentials
    6. After 1 hour, Vault calls Postgres: DROP ROLE vault_payment_abc123  

Result:
├── No static long-term DB password in any config file
├── Each service instance has its OWN credential — isolated
├── A compromised instance's credential expires in 1 hour
└── Vault audit log: who requested credentials, when, from where
```

### AWS Secrets Manager — Static Secrets with Rotation

```
AWS Secrets Manager flow:
1. Store secret:
   aws secretsmanager create-secret \
     --name /prod/payment-service/db-password \
     --secret-string '{"username":"dbuser","password":"strongpassword"}'

2. Spring Boot at startup:
   @Value("${db.password}") ← Spring Cloud AWS resolves this from Secrets Manager
   OR
   SecretsManagerClient.getSecretValue("prod/payment-service/db-password")
   → Returns: {"username":"dbuser","password":"strongpassword"}

3. RDS auto-rotation (optional but recommended):
   AWS creates a Lambda rotation function
   Every 30 days: Lambda generates new password, updates RDS, updates Secrets Manager
   Spring Boot uses Spring Cloud AWS's refreshable secrets — picks up new password
   without a restart

IAM policy for the service:
{
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue"],
  "Resource": "arn:aws:secretsmanager:us-east-1:123456:secret:/prod/payment-service/*"
  // This service can ONLY read its own secrets, not other services' secrets
}
```

### Kubernetes Secrets → Environment Variables

```
Kubernetes approach (production, less sophisticated than Vault but common):

1. Create K8s Secret:
   kubectl create secret generic db-credentials \
     --from-literal=DB_PASSWORD=strongpassword \
     --namespace=payment-service
   
   OR via Helm/Kustomize — never hardcoded in values.yaml (use Vault + External Secrets Operator)

2. Mount as env var in Pod spec:
   env:
     - name: DB_PASSWORD
       valueFrom:
         secretKeyRef:
           name: db-credentials
           key: DB_PASSWORD

3. Spring Boot reads it:
   @Value("${DB_PASSWORD}")
   private String dbPassword;

Or use Spring's environment binding:
   spring.datasource.password=${DB_PASSWORD}

K8s Secrets limitations:
├── Base64-encoded in etcd (NOT encrypted by default — enable etcd encryption)
├── Accessible to cluster admins — not fine-grained like Vault
├── No built-in rotation
└── Better than source code; worse than Vault/Secrets Manager
```

### Secret Hierarchy (from best to worst)

```
BEST ─────────────────────────────────────────────────────────────────
│
├── Vault dynamic secrets: credentials generated per-instance, TTL-based
│   Auto-expire, audited, policy-gated, per-service isolation
│
├── AWS Secrets Manager / Azure Key Vault / GCP Secret Manager:
│   Managed, IAM-controlled, audit log, auto-rotation capability
│   "The right choice for AWS workloads"
│
├── Kubernetes Secrets + External Secrets Operator (ESO):
│   K8s Secrets sync'd from Vault/AWS SM — best of both worlds
│   Services use K8s native env var injection; Vault is the source of truth
│
├── Kubernetes Secrets (alone, with etcd encryption):
│   No rotation, cluster admin access, but out of source code
│   Acceptable middle ground for smaller teams
│
├── Environment variables injected at deployment (Docker/CI):
│   Out of source code, but may appear in CI logs; no rotation; no audit
│
WORST ───────────────────────────────────────────────────────────────
    └── Hardcoded in application.yml / source code:
        NEVER. In Git forever. Accessible to everyone. OWASP A05.
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```yaml
# application.yml — NEVER DO THIS IN PRODUCTION
spring:
  datasource:
    url: jdbc:postgresql://prod-db.company.com:5432/payments
    username: payments_user
    password: P@ssw0rd123!         # HARDCODED SECRET — in Git forever

  redis:
    password: redis-secret-123     # HARDCODED SECRET

aws:
  access-key-id: AKIAIO5EXAMPLE    # AWS access key — hardcoded
  secret-access-key: abc123defXXX  # AWS secret key — hardcoded
  
stripe:
  api-key: sk_live_XXXXXXXXXXXX    # Payment API key — hardcoded → anyone with repo access can charge cards
```

```yaml
# application.yml — also wrong: using environment variable names that get logged
spring:
  datasource:
    # If Spring Boot's debug logging is on, it prints all resolved properties
    # Including passwords — they appear in logs in plaintext
    password: ${DB_PASSWORD}  # Fine if debug logging is OFF; dangerous if ON
    
# Developer might also do:
# export DB_PASSWORD=$(cat /tmp/password.txt)
# Not great: /tmp is usually readable by all users, file persists after script ends
```

> **Why this fails in production:** Once a secret is in Git, it's accessible to everyone with repo access — and to anyone who ever gains repo access in the future. "But I'll delete the file" — `git log` still shows it. `git filter-branch` or `git bfg` can remove it, but everyone who cloned already has it. Real-world consequence: the average data breach involving hardcoded credentials is discovered by a third party, not by the company. By then, the attacker has had access for weeks.

### Right Way — Production Quality

**Spring Boot + AWS Secrets Manager (Spring Cloud AWS 3.x):**
```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.awspring.cloud</groupId>
    <artifactId>spring-cloud-aws-starter-secrets-manager</artifactId>
</dependency>
```

```yaml
# application.yml — no secrets, only pointers to secret paths
spring:
  config:
    import:
      # Spring Cloud AWS loads this secret from Secrets Manager on startup
      # The secret is a JSON object: {"username":"...","password":"..."}
      - aws-secretsmanager:/prod/payment-service/db-credentials
      - aws-secretsmanager:/prod/payment-service/stripe-api-key
      - aws-secretsmanager:/prod/payment-service/redis-password

# After import, these properties are available:
# db-credentials.username (from JSON field)
# db-credentials.password
# stripe-api-key.value (depends on the JSON structure stored)
```

```java
// Java — application properties bound from Secrets Manager
@ConfigurationProperties(prefix = "db-credentials")
@Component
public class DatabaseSecrets {
    private String username;
    private String password;
    // Spring automatically binds the JSON fields from the secret
}

// DataSource configuration uses the secret
@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource dataSource(DatabaseSecrets dbSecrets) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://prod-db.internal:5432/payments");
        config.setUsername(dbSecrets.getUsername());
        config.setPassword(dbSecrets.getPassword());  // from Secrets Manager, not config file
        return new HikariDataSource(config);
    }
}
```

**Spring Boot + HashiCorp Vault (Spring Cloud Vault):**
```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-vault-config</artifactId>
</dependency>
```

```yaml
# bootstrap.yml — Vault configuration (loaded before application.yml)
spring:
  cloud:
    vault:
      host: vault.internal.company.com
      port: 8200
      scheme: https
      authentication: KUBERNETES          # Auth using K8s service account token
      kubernetes:
        role: payment-service             # Vault role for this service
        kubernetes-path: kubernetes       # Vault auth path
      kv:
        enabled: true
        backend: secret                   # KV v2 mount path
        default-context: payment-service  # Vault path prefix
```

```java
// After Vault configuration, Spring properties are automatically populated:
@Value("${db.password}")
private String dbPassword;  // Resolved from Vault secret: secret/payment-service/db → db.password

// For Vault dynamic secrets (database secrets engine):
@Configuration
public class VaultDynamicDBConfig {

    private final VaultTemplate vaultTemplate;

    @Bean
    @RefreshScope  // Allows runtime refresh when credentials rotate
    public DataSource dataSource() {
        // Request dynamic credentials from Vault Database secrets engine
        VaultResponseSupport<Map<String, Object>> response =
            vaultTemplate.read("database/creds/payment-service");
        
        Map<String, Object> data = response.getData();
        String username = (String) data.get("username");
        String password = (String) data.get("password");
        
        // These credentials are Vault-managed, time-limited
        // Vault automatically creates and destroys them in PostgreSQL
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://prod-db.internal:5432/payments");
        config.setUsername(username);
        config.setPassword(password);
        return new HikariDataSource(config);
    }
}
```

**Kubernetes + External Secrets Operator (bridging K8s Secrets and Vault/AWS SM):**
```yaml
# ExternalSecret resource — tells the operator to sync from AWS Secrets Manager to K8s Secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payment-service-db-credentials
  namespace: payment-service
spec:
  refreshInterval: 1h    # Sync every hour — picks up rotated secrets automatically
  secretStoreRef:
    name: aws-secrets-manager     # SecretStore that points to AWS SM + IAM role
    kind: ClusterSecretStore
  target:
    name: db-credentials-k8s-secret  # Creates/updates this K8s Secret
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD           # Key in the K8s Secret
      remoteRef:
        key: /prod/payment-service/db-credentials  # AWS SM secret path
        property: password                          # JSON field name in the secret
    - secretKey: DB_USERNAME
      remoteRef:
        key: /prod/payment-service/db-credentials
        property: username

---
# The resulting K8s Secret 'db-credentials-k8s-secret' is automatically updated
# Spring Boot Pod mounts it as env vars — no source code changes needed
```

**AWS IAM policy for the service — least-privilege access:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOwnSecrets",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789:secret:/prod/payment-service/*"
      ]
      // This role can ONLY access /prod/payment-service/* secrets
      // NOT /prod/user-service/*, NOT /prod/admin/*, etc.
      // A compromised payment service cannot escalate to read other services' secrets
    },
    {
      "Sid": "DenyDecryptOtherKeys",
      "Effect": "Deny",
      "Action": "kms:Decrypt",
      "NotResource": "arn:aws:kms:us-east-1:123456789:key/payment-service-key-id"
      // Can only decrypt secrets encrypted with this service's own KMS key
    }
  ]
}
```

**Secret rotation Lambda for RDS (AWS Secrets Manager built-in):**
```java
// AWS generates this Lambda for you with RDS auto-rotation
// Understanding what it does is the key knowledge:
// 1. Creates a new password in RDS  
// 2. Tests the new password by connecting
// 3. Updates the secret in Secrets Manager
// 4. Spring Cloud AWS's @RefreshScope beans pick it up on next refresh cycle
// All without any downtime or manual intervention

// Spring Boot side — enable props refresh for rotated secrets (Spring Cloud AWS 3.x)
// awspring.cloud.secretsmanager.reload.strategy=refresh
// awspring.cloud.secretsmanager.reload.period=1m
// This polls Secrets Manager every minute and refreshes any changed secrets
```

> **Key decisions here:**
> - Spring Cloud AWS 3.x (for Spring Boot 3.x) uses `spring.config.import=aws-secretsmanager:` prefix — secrets are injected as Spring properties at startup; no custom code to write secret retrieval
> - The IAM role used by the application should have the most restrictive permissions possible — only the specific secret paths this service needs; this limits the blast radius of a compromised service
> - Kubernetes External Secrets Operator bridges the gap between cloud secrets managers and K8s-native env var injection — services use standard K8s Secrets, but the source of truth is Vault or AWS SM with rotation
> - Never log properties that might contain secrets — `spring.security.filter.init-params-as-debug` and `logging.level.org.springframework=DEBUG` can both expose secrets in logs

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is wrong with putting database credentials in `application.yml`?"

**Hruday's answer:**
> Three fundamental problems.
>
> First, it gets committed to source control. Even if you try to remove it later, the Git history retains it. Everyone who has ever cloned the repo has the credential. Every CI runner that cloned the repo stores logs with it. Credential rotation doesn't help because the old credential is in the history.
>
> Second, the access model is wrong. Source code access is much broader than "who needs to connect to production databases." Junior developers, contractors, external auditors, CI systems — all might have repo access; none of them should have the production DB password. Secrets management separates access to configuration from access to secrets, with fine-grained policies per-secret per-service.
>
> Third, rotation is hard. If you need to rotate a credential that's in config files, you need to update the file, commit it, redeploy. There's usually a window where some instances are running with the old credential and some with the new. With secrets managers, you update the secret once in Vault or AWS SM; all services pick it up at their next refresh cycle without any redeployment.
>
> The correct model: `application.yml` contains only the path to the secret (`/prod/payment-service/db`) — never the actual credential. The secret is injected at runtime by the deployment infrastructure.

---

### Q2 — Deep Dive
**Interviewer asks:** "What are Vault dynamic secrets and why are they more secure than static secrets?"

**Hruday's answer:**
> Static secrets are credentials created once and used indefinitely — a database password set up 2 years ago and still in use. If it leaks — a compromised application, an insider threat, a log file — the attacker has unlimited access until someone notices and rotates it. Detection might take weeks or months.
>
> Vault dynamic secrets flip the model. When a Spring Boot service starts up, it authenticates to Vault using its Kubernetes service account token. Vault verifies the service's identity and policies, then calls the target system — PostgreSQL, AWS, SSH — to create a fresh credential with a short TTL: say 1 hour for a database user. Vault returns the credential to the service. When the TTL expires, Vault automatically revokes the credential at the database. The next time the service needs it, it requests a new one.
>
> The security improvements: the credential exists only during its TTL window. If it's stolen, the window is bounded. Each service instance has its own unique credential — a compromised instance doesn't give you access from another instance. If the service is decommissioned and some code path was accidentally not cleaned up and is still holding a token — Vault revokes it automatically at TTL. And there's an audit log of every credential issuance and use.
>
> The operational overhead is non-trivial — you need to run Vault, configure its policies, and handle credential refresh in the service. AWS Secrets Manager with rotation is a managed alternative that's more approachable operationally while providing similar benefits.

---

### Q3 — Gap-to-Bridge Frame
**Interviewer asks:** "Have you used HashiCorp Vault or AWS Secrets Manager in production?"

**Hruday's answer:**
> In production at SAP, I used Kubernetes Secrets with etcd encryption and environment variable injection as the primary secrets delivery mechanism — secrets stored in Azure DevOps and injected into Kubernetes Secrets via pipeline. This is the K8s-native approach and keeps secrets out of source code, though without the dynamic rotation capabilities of Vault.
>
> I've studied Vault's architecture in depth — the dynamic secrets model, the Kubernetes auth backend using service account tokens, and the policy engine for per-service secret access. I've also worked through AWS Secrets Manager configuration with Spring Cloud AWS in a sandbox environment, including the RDS auto-rotation setup.
>
> If I were building a new platform today, I'd choose AWS Secrets Manager for new microservices deployed on AWS — because it's a managed service (no infrastructure to run), native IAM integration, and automatic RDS rotation built in. For a multi-cloud or on-premise scenario, Vault is the right choice. Either way, the External Secrets Operator bridges these to K8s Secrets for consumption, which is the current best practice for Kubernetes-deployed services.

---

### Q4 — Scenario
**Interviewer asks:** "A junior engineer is about to commit an API key to `application.yml` in a PR. What do you do and what systemic changes do you make to prevent this in the future?"

**Hruday's answer:**
> Immediate: block the PR. Add a PR comment explaining why — link to the secrets management policy. The engineer didn't make a malicious choice; they did what worked fastest. Educate, don't embarrass.
>
> For the specific secret: even though it's not merged, the developer's branch has it. Treat the key as compromised and rotate it immediately — assume someone else may have access to the branch. After rotation, the old key is worthless.
>
> Systemic prevention: three controls layered on top of each other.
>
> First, pre-commit hooks. Tools like `git-secrets` (AWS), `detect-secrets` (Yelp), or `gitleaks` run before every commit and scan staged files for patterns matching API keys, connection strings, and passwords. The commit is blocked if a secret pattern is found. Developers install this once; it runs locally before code even reaches the remote.
>
> Second, CI/CD pipeline scanning. Even if a pre-commit hook is bypassed, the CI pipeline runs `detect-secrets` or a similar tool on every push. A PR with a detected secret fails the CI check and cannot be merged.
>
> Third, correct secrets infrastructure. Set up AWS Secrets Manager or Vault with the correct paths for the service. Update the onboarding guide with "how to add a new secret" → always through the secrets manager, never in configuration files. The application.yml template should show `spring.config.import=aws-secretsmanager:/prod/my-service/api-key` as the pattern to follow, with no actual values.
>
> The combination of prevention (pre-commit hooks, CI scanning) and infrastructure (proper secrets manager) makes it easier to do the right thing than the wrong thing.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use environment variables" | "Environment variables are safe for secrets" | Better than source code, but still have issues: visible in CI logs, available to all processes on the machine, no audit trail; proper secrets managers solve all these; env vars are the minimum viable approach, not the recommended one |
| Rotation is complex | "Rotation is operationally difficult, we do it manually quarterly" | Manual rotation is error-prone and delayed — leaks are often only discovered after discovery, not before; automatic rotation (Vault TTL, AWS SM auto-rotation) eliminates the operational overhead |
| "The repo is private" | "We use a private GitHub repo so it's OK to put secrets there" | Private repos are accessible to all contributors, all CI systems, any future employee or contractor; access control on a repo is too broad to be a security boundary for production credentials |
| Base64 is encryption | "K8s Secrets are encrypted (Base64)" | Base64 is encoding, not encryption; `kubectl get secret -o json` decodes instantly; K8s Secrets need etcd encryption and RBAC to be meaningful security controls |

---

## 7. Hruday's Real Experience Hook
> "At SAP, secrets management was a recurring concern across our Spring Boot microservices. The baseline practice I established was: no secrets in `application.yml` or any configuration file, ever. Environment variables were injected via Kubernetes Secrets, which were managed in our Azure DevOps pipeline with encrypted variable groups — separate from source code entirely. I implemented `detect-secrets` scanning in our CI pipeline as a mandatory build step, which immediately caught an accidentally-committed API key in a new service PR before it merged. I also advocated for migrating to AWS Secrets Manager for our AWS-deployed services, including configuring Spring Cloud AWS's `spring.config.import=aws-secretsmanager:...` integration — which made the application code completely unaware of where secrets come from. The IAM policies were scoped to each service's specific secret paths, so no service could read another's credentials."

---

## 8. Scale Evolution

**1,000 users/day →** Environment variables from your deployment platform (Heroku config vars, Railway env variables, Kubernetes Secrets) is the minimum requirement. Never source code. `detect-secrets` in CI.

**100,000 users/day →** AWS Secrets Manager (if on AWS) or similar managed service. Set up automatic rotation for database credentials. Per-service IAM roles and per-service secret paths. Audit log review for secret access patterns.

**10 million users/day →** Vault with dynamic secrets for all database credentials — no static long-lived DB passwords in any service. External Secrets Operator for K8s-native secret injection from Vault. Secret access patterns monitored with anomaly detection — an unusual number of secret reads from an unexpected service triggers an alert. Certificate lifecycle management (private keys rotated automatically). Secrets scanning in CI the complete pipeline: pre-commit hooks, PR checks, container image scanning (Trivy for secrets in images).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | PCI-DSS requirement for payment card processors: no hardcoded credentials, automated rotation, audit logs for secret access — all are compliance requirements, not optional | Know Vault dynamic secrets and AWS SM auto-rotation; explain the audit trail benefits |
| Swiggy / Meesho | At scale, many services each with their own DB credentials, API keys, messaging passwords — central secrets management becomes operationally necessary | Know External Secrets Operator for K8s-scale secret injection |
| Adobe / Microsoft | Enterprise security compliance (SOC 2, ISO 27001): secretsmanagement is explicitly assessed; secrets in source code fails compliance audits | Know the full stack: pre-commit hooks → CI scanning → secrets manager → per-service IAM policies |
| SAP Labs | SAP product security standards require no hardcoded credentials; customer enterprise security assessments check for OWASP A05 compliance | Know Kubernetes Secrets + etcd encryption + Spring Cloud AWS/Vault integration |

---

## 10. Related Topics — What to Study Next

- **Topic 177 — Encryption at rest and in transit** — the secrets manager itself must encrypt secrets at rest; KMS key management for the secrets store is part of this topic; encryption at rest is the A02 control that secrets management serves
- **Topic 175 — HTTPS/TLS** — the TLS private key is one of the most sensitive secrets in your infrastructure; its rotation and storage are part of secrets management
- **Topic 169 — OWASP Top 10** — hardcoded credentials are OWASP A05: Security Misconfiguration; many real-world breaches are A05 findings; this is one of the most practically impactful security controls to implement
- **Topic 170 — JWT deep dive** — the JWT signing private key (RS256) is a critical secret; its storage in Vault or HSM is the correct approach; the public key can be published; the private key management follows the same secrets management principles
- **Topic 169 → Practice**: do a "secrets audit" of your current project — grep for any patterns matching connection strings, API keys, `password`, `secret`, `key` in non-test config files; fix any findings immediately

---

*Part 10 · Secrets Management — Vault, AWS Secrets Manager · Full Stack Interview Guide · Hruday D · 2026*
