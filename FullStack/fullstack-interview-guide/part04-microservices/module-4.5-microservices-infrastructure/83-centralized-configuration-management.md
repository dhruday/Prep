# Centralised Configuration Management — Multi-Environment Strategies
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Centralised configuration management = a set of practices and tools that ensure every microservice in every environment (dev, staging, prod) has the correct, consistent, audited configuration without that configuration being baked into the service JAR or scattered across per-service environment variables
- Three sources of configuration truth across environments: (1) **Spring Cloud Config Server** (backed by Git) for application-level config — service URLs, feature flags, Kafka topics; (2) **Kubernetes ConfigMaps** for infrastructure-level config — JVM args, environment identifiers, pod-level settings; (3) **HashiCorp Vault** (or AWS Secrets Manager) for secrets — database passwords, API keys, JWT signing keys
- Hierarchical override chain: Vault secrets override Config Server properties override Kubernetes ConfigMaps override default application.yml — most specific wins
- Environment parity principle: dev/staging/prod should differ ONLY in specific values (database URLs, external API endpoints, scalability settings) — the service configuration structure should be identical across environments; "it works in staging but not in production" problems are often configuration drift
- Secret rotation: Vault issues short-lived secrets (database credentials valid for 1 hour) and renews them automatically; the service never handles long-lived static credentials; this limits the blast radius of a credential compromise
- Gap to bridge: most candidates can describe Config Server but cannot articulate HOW different environment tiers are isolated, HOW secrets are handled safely, and HOW they validate configuration parity before promotion

---

## 1. One-Line Definition
Centralised configuration management is the practice of externalising, versioning, and securely delivering configuration to all microservices at all environment tiers from dedicated, audited configuration sources — ensuring no service contains environment-specific or sensitive configuration values inside its deployable artefact.

---

## 2. The Problem It Solves

### The Configuration Sprawl Problem

```
Services: 20 microservices
Environments: dev, staging, staging-perf, production-eu, production-us

20 × 5 = 100 environment-specific configuration sets

Without centralised management:
  Each configuration lives in one of:
  (a) application-{profile}.yml bundled in the JAR
  (b) Kubernetes Secret and ConfigMap YAML checked into a monorepo
  (c) CI/CD environment variables per service per pipeline
  (d) Someone's local machine (the real danger)
  (e) "It was working, I don't know what it was set to before"

Problems that emerge:
  
  DRIFT: "Why does staging work but production doesn't?"
  → Compare 100 config sets manually to find the difference
  → Drift accumulated as teams made emergency fixes directly in prod without propagating back

  NO AUDIT: "Who changed the rate limit from 1000 to 100 at 3pm on Friday?"
  → No central audit log → root cause analysis is impossible

  SECRET LEAKS: Passwords in application.yml committed to Git
  → GitHub secret scanning detects → credential rotation + incident report
  
  ROTATION COMPLEXITY: "Change the DB password" means:
  → Update 20 service environment variables across 5 environments = 100 manual changes
  → Missed one → service fails → pagerduty alert at 2am
```

### The Three-Source Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                  CONFIGURATION RESOLUTION ORDER                   │
│  (highest → lowest precedence — highest overrides lowest)         │
│                                                                    │
│   ┌──────────────────────────────────────────────────┐            │
│   │  3. VAULT (or Secrets Manager)                    │ highest   │
│   │     database passwords, API keys, JWT secrets     │           │
│   │     Short-lived, auto-rotated, access-audited      │           │
│   └──────────────────────────────────────────────────┘            │
│                          ↓ overridden by ↑                        │
│   ┌──────────────────────────────────────────────────┐            │
│   │  2. Spring Cloud Config Server (Git-backed)       │ middle    │
│   │     service URLs, Kafka topics, feature flags     │           │
│   │     timeouts, rate limits, environment pointers   │           │
│   └──────────────────────────────────────────────────┘            │
│                          ↓ overridden by ↑                        │
│   ┌──────────────────────────────────────────────────┐            │
│   │  1. Kubernetes ConfigMaps / Env Vars              │ lowest    │
│   │     NODE_ENV, JVM args, pod identity labels       │           │
│   │     service name, namespace, cluster region       │           │
│   └──────────────────────────────────────────────────┘            │
│                          ↓ overridden by ↑                        │
│   (implicit: application.yml defaults in JAR — fallbacks only)    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. How It Works Internally

### Environment Isolation via Git Branches and Profiles

```
Config Repository Structure (Git):
config-repo/
├── application.yml                     ← global defaults (all services, all envs)
├── application-production.yml         ← overrides for ALL services in production
├── ordersvc/
│   ├── ordersvc.yml                    ← ordersvc defaults (all envs)
│   ├── ordersvc-dev.yml                ← ordersvc dev overrides
│   ├── ordersvc-staging.yml            ← ordersvc staging overrides
│   └── ordersvc-production.yml        ← ordersvc production overrides
└── inventorysvc/
    └── ... (same pattern)

Branches:
  main         → active production config (protected, requires PR + review)
  staging      → staging config (requires PR)
  feature/*    → developer experiments (freely changeable)

Config Server is configured with search-paths to use the branch matching the SPRING_PROFILES_ACTIVE:
  SPRING_PROFILES_ACTIVE=production → Config Server reads from 'main' branch
  SPRING_PROFILES_ACTIVE=staging    → Config Server reads from 'staging' branch
  SPRING_PROFILES_ACTIVE=dev        → Config Server reads from 'dev' branch

Result:
  Promotion flow: dev config → PR to staging branch → review → merge → staging env picks up
                  staging config → PR to main branch → review → merge → production picks up
  Every change to production config is a PR review. Audit trail = Git history.
```

### Kubernetes ConfigMap — Infrastructure-level Config

```yaml
# ordersvc-configmap.yaml — non-sensitive, rarely-changing operational config
apiVersion: v1
kind: ConfigMap
metadata:
  name: ordersvc-config
  namespace: production
data:
  SPRING_PROFILES_ACTIVE: "production"
  CONFIG_SERVER_URL: "http://config-server.infra:8888"
  OTEL_SERVICE_NAME: "ordersvc"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4317"
  JVM_ARGS: "-Xmx512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

---
# Mounted as environment variables in the Pod:
spec:
  containers:
    - name: ordersvc
      image: ordersvc:3.2.1
      envFrom:
        - configMapRef:
            name: ordersvc-config
      # ConfigMap values become env vars — Spring Boot reads them automatically
```

### HashiCorp Vault Integration

```yaml
# Vault secret engine: database dynamic secrets
# Vault generates a UNIQUE username/password per service, valid for 1 hour
# Automatically renews before expiry — service never sees rotation

# spring.cloud.vault configuration (in application.yml — non-sensitive)
spring:
  cloud:
    vault:
      host: vault.infra.cluster
      port: 8200
      authentication: KUBERNETES   # Uses K8s service account token for auth
      kubernetes:
        role: ordersvc-role          # Vault role mapped to this K8s service account
      kv:
        enabled: true
        backend: secret
        application-name: ordersvc  # Reads from secret/ordersvc
        
# What's stored in Vault (managed by platform team, rotated automatically):
# secret/ordersvc:
#   spring.datasource.password = "dynamically-generated-by-vault"
#   payment.gateway.api-key    = "from-vault-static-secret-engine"
#   jwt.signing-key            = "from-vault-transit-key"

# Spring Cloud Vault fetches these at startup and maps them to Spring properties.
# On Vault secret rotation: Spring Cloud Vault + @RefreshScope can re-fetch without restart.
```

---

## 4. The Code

### Multi-Environment Configuration with Consistent Structure

```yaml
# application.yml (in JAR — only DEFAULTS, never environment-specific values!)
kafka:
  bootstrap-servers: "localhost:9092"   # ← default for LOCAL dev only
  consumer:
    group-id: ${spring.application.name}
    auto-offset-reset: earliest

resilience4j:
  circuit-breaker:
    instances:
      inventorysvc:
        sliding-window-size: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 10s

feature:
  payment-v2-enabled: false  # ← default OFF, enabled per-environment in Config Server
```

```yaml
# ordersvc-production.yml (in Config Repo Git main branch):
kafka:
  bootstrap-servers: "kafka-broker-1.prod:9092,kafka-broker-2.prod:9092"  # Production cluster

resilience4j:
  circuit-breaker:
    instances:
      inventorysvc:
        sliding-window-size: 20  # Larger window for higher traffic in production
        wait-duration-in-open-state: 30s  # Longer backoff in production

feature:
  payment-v2-enabled: true  # ← Full rollout in production after canary validates

spring:
  datasource:
    url: "jdbc:postgresql://orders-db.prod.internal:5432/orders"
    username: ${vault:spring.datasource.username}  # ← From Vault, not hardcoded
    password: ${vault:spring.datasource.password}  # ← From Vault, not hardcoded
```

### Configuration Parity Validation (Pre-Deploy Checklist)
```java
// ConfigurationValidationService — validates all required config keys are present at startup
@Component
@Slf4j
public class ConfigurationValidator implements ApplicationRunner {

    @Value("${kafka.bootstrap-servers}")
    private String kafkaBootstrapServers;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${payment.gateway.url}")
    private String paymentGatewayUrl;

    @Value("${feature.payment-v2-enabled}")
    private boolean paymentV2Enabled;

    @Override
    public void run(ApplicationArguments args) {
        List<String> missing = new ArrayList<>();

        if (!StringUtils.hasText(kafkaBootstrapServers) || kafkaBootstrapServers.contains("localhost")) {
            missing.add("kafka.bootstrap-servers (must be production endpoint, not localhost)");
        }

        if (!StringUtils.hasText(paymentGatewayUrl) || paymentGatewayUrl.contains("sandbox")) {
            if ("production".equals(System.getenv("SPRING_PROFILES_ACTIVE"))) {
                missing.add("payment.gateway.url (sandbox URL detected in production profile)");
            }
        }

        if (!missing.isEmpty()) {
            log.error("Configuration validation FAILED. Missing or suspicious values: {}", missing);
            throw new IllegalStateException("Configuration validation failed: " + missing);
        }

        log.info("Configuration validation passed: profile={}, kafkaBrokers={}",
            System.getenv("SPRING_PROFILES_ACTIVE"), kafkaBootstrapServers);
    }
}
```

### Spring Boot Actuator — Config Visibility Endpoint
```yaml
# Enable config visibility (useful for debugging — restrict in production!)
management:
  endpoints:
    web:
      exposure:
        include: "health,info,refresh,configprops"
  endpoint:
    configprops:
      show-values: WHEN_AUTHORIZED  # Only show values when authenticated
      # Never use ALWAYS in production — this exposes config including partial secrets
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you manage configuration across dev, staging, and production?"

**Hruday's answer:**
> I use a three-tier approach: Kubernetes ConfigMaps for infrastructure metadata (which profile is active, where the Config Server is, JVM settings), Spring Cloud Config Server backed by a Git repository for application-level configuration, and HashiCorp Vault for secrets.
>
> For the Config Server Git repo, I use a branching strategy that mirrors the promotion flow: a dev branch for development config, a staging branch for staging, and a protected main branch for production. Config changes are PRs — you can't change production config without a peer review. Every change has a Git commit with author, timestamp, and reason.
>
> The key principle I enforce: the same JAR binary that runs in development must run in production. The JAR contains only default values (which are safe to commit to version control — things like default feature flags being Off). All environment-specific values come from external sources fetched at startup. "It works in staging but not in production" should be a config diff problem, not a code problem.

---

### Q2 — Secrets Management
**Interviewer asks:** "How do you handle database passwords in your configuration?"

**Hruday's answer:**
> Never in Git, even encrypted, if I can avoid it — that's my starting position. Encrypted ciphertext in Git is better than plaintext, but it still means long-lived credentials that someone must manually rotate. With volume and compliance requirements, that becomes unsustainable.
>
> The production standard I aim for: HashiCorp Vault with dynamic database secrets. Vault's database secret engine connects to Postgres and generates a unique database username and password for each service instance, valid for a configurable TTL — say, one hour. The service authenticates to Vault using its Kubernetes service account token. Vault verifies the token with the Kubernetes API and issues the credential. The service renews it before expiry. If the service is compromised, the credential expires in at most one hour with no further rotation needed.
>
> The practical setup: Spring Cloud Vault maps Vault paths to Spring properties transparently. The service code just uses `@Value("${spring.datasource.password}")` — it doesn't know whether the value came from Vault or a config file. The abstraction is clean.
>
> For teams not yet on Vault, Kubernetes Secrets annotated with the External Secrets Operator (syncing from AWS Secrets Manager or Azure Key Vault) is a good intermediate step — secrets are in the cloud secrets store, not in Git.

---

### Q3 — Configuration Drift
**Interviewer asks:** "How do you ensure staging and production configurations don't drift?"

**Hruday's answer:**
> Configuration drift is one of the most common causes of "works in staging, broken in production" bugs. My mitigation approach:
>
> First: both staging and production read from the same Config Server with the same config structure — only the values differ, never the keys. I enforce this with a config schema test that runs in CI: parse both staging and production config and verify that the set of keys is identical. A key present in staging but absent in production is a CI failure before deployment.
>
> Second: promotion is mandatory. Every change to staging branch that will go to production goes through a PR from staging to main. The PR diff shows exactly what will change. Platform teams review config changes for production just like code reviews.
>
> Third: the startup validation I build into services — if the service detects it's running in production but config looks like staging (for example: payment gateway URL points to the sandbox instead of production), it fails to start. This is a last-resort safety net: better to fail clearly than silently use wrong config.
>
> Fourth: config diff tooling. After a production deployment, I run an automated comparison of fetched config vs expected config (fetched from the Config Server by the deployment tooling as part of smoke tests). Any unexpected difference is reported.

---

### Q4 — Runtime Config Change
**Interviewer asks:** "A feature flag change needs to reach 50 services in production immediately. How do you do it without restarting all 50 services?"

**Hruday's answer:**
> Spring Cloud Bus with Kafka as the transport. When I push the feature flag change to the Config Server's Git repo, a webhook in the Git repo calls POST /actuator/busrefresh on any ONE running service instance. That service publishes a RefreshRemoteApplicationEvent to the Kafka topic monitored by Spring Cloud Bus. Every service instance subscribed to that Kafka topic receives the event and triggers a local config refresh.
>
> Each service fetches the new config from Config Server, and any beans annotated with @RefreshScope are destroyed and re-created with the new values. The feature flag — implemented as a @ConfigurationProperties class with @RefreshScope — reflects the new value immediately.
>
> The propagation across 50 services × 3 replicas = 150 instances happens within seconds of the Kafka broadcast. No restarts, no deployments triggered.
>
> Two important caveats: @RefreshScope works for beans that Spring can safely re-create at runtime. Core infrastructure beans (DataSource, KafkaConsumerFactory) are not @RefreshScope-aware. And the operation is eventually consistent — for a brief window after the refresh broadcast, some instances have the new flag value while others are still refreshing. For feature flags that must be atomic (flip for ALL users simultaneously), a database-backed feature flag store (like Unleash or LaunchDarkly) provides stronger guarantees.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use different application.yml per env" | "I have application-dev.yml, application-staging.yml, application-prod.yml in the JAR" | "Config bundled in the JAR is environment config in your deployable artefact. If production config has a bug (wrong value, accidental secret), fixing it requires a full rebuild and redeployment of the JAR. It also means your 'production JAR' and 'staging JAR' are technically different binaries — you can't guarantee the same code is running. Externalise all environment-specific config via Config Server and Kubernetes." |
| "Kubernetes Secrets are secure" | "I store passwords in Kubernetes Secrets — they're encrypted" | "Kubernetes Secrets are base64 encoded by default, NOT encrypted. They can be read by anyone with kubectl access to the namespace: `kubectl get secret my-secret -o yaml`. etcd encryption at rest can be enabled, but access control at the kubectl level is the real security boundary. For production secret management, use Vault or a cloud secrets manager, and sync values into Kubernetes Secrets at deploy time via External Secrets Operator — don't maintain secrets manually in Kubernetes." |
| "Config Server is stateless, no concerns" | "Config Server just serves Git files, nothing to worry about" | "Config Server clones and caches the Git repo locally. If multiple Config Server instances are running behind a load balancer, you need to ensure they all see the same Git state — use the `force-pull: true` setting and a shared clone directory (or stateless instances that clone on every request, which is slow). Stale cached config in one server instance causes some services to get old config and others to get new config — split-brain configuration state." |
| "All configuration changes are safe to refresh" | "Just @RefreshScope everything" | "Some properties are consumed during application startup and cached permanently by Spring internals: datasource connection pool configuration, server.port, spring.kafka.consumer.group-id, and any property used in @ConditionalOnProperty. @RefreshScope only re-creates APPLICATION-LAYER beans — it does NOT restart the application context or reinitialise Spring infrastructure. Document which properties are refreshable and which require a restart; enforce this documentation in the config repo via comments." |

---

## 7. Hruday's Real Experience Hook

> "SAP's landscape concept — three-system landscape: Development (DEV), Quality Assurance (QAS), Production (PRD) — is directly analogous to the config management hierarchy I'm describing. SAP enforces that configuration transport (moving config from DEV to QAS to PRD) happens through SAP's Transport Management System with mandatory approvals and audit trails, never through manual direct-edit on production. When I designed the config management approach for my microservices context, I explicitly copied this discipline: configuration changes flow from dev → staging → production through a Git-PR review process, never directly applied to production. The SAP enterprise principle of 'no direct-edit in production' is sound, and translating it to a Git-branch-based workflow makes it practical for a microservices team."

---

## 8. Scale Evolution

**Early microservices:** application.yml in JAR with profiles. Simple, fast to set up. Acceptable for < 5 services.

**5-15 services:** Spring Cloud Config Server + Git repo. Centralise shared config. Per-service override files. Simple `@RefreshScope` for runtime updates.

**15-50 services:** Config Server with Spring Cloud Bus for broadcast refresh. Vault for secrets. Separate Git repo for config with branch-per-environment and PR review required for production changes. Config validation in CI.

**50+ services, multi-region:** Federated Config Servers per region (each region has local instances of Config Server sharing the same Git remote). Vault with HA configuration. External Secrets Operator for Kubernetes-native secret injection. GitOps for config + infrastructure together.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | PCI-DSS compliance requires audited access to cryptographic keys and database credentials. Vault's dynamic secrets + access audit log directly address this. Config drift between environments could mean a production system using sandbox credentials — catastrophic. | "How do you ensure payment gateway API keys are properly managed and rotated?" |
| Swiggy / Meesho | Feature flags for A/B testing, restaurant onboarding configs, region-specific pricing — all need centralised management with runtime update capability. Config Server + Bus refresh is standard. | "How do you toggle a feature flag for 20 services in production without a deployment?" |
| Adobe / Microsoft | Enterprise SaaS with per-customer and per-tenant config management. Config Server architecture scales to tenant-specific overrides (per-tenant files in Git, resolved by tenant ID in app name). | "How would you implement per-customer feature configuration for a SaaS product?" |
| SAP Labs (current) | SAP BTP uses destination services and environment variables that are conceptually config management. Formalising that into Config Server + Vault shows architectural maturity for a senior role. | "How do you manage configuration for BTP microservices across dev/Q/prod landscapes?" |

---

## 10. Related Topics — What to Study Next

- **Topic 81 — Spring Cloud Config Server** — the technical implementation of Config Server that this topic builds on; foundational setup before the multi-environment strategy described here
- **Topic 82 — Service Mesh (Istio)** — Istio's certificate management for mTLS is complementary to Vault for application-level secrets; both are components of a zero-trust security posture, operating at different layers
- **Topic 85 — Health Checks and Readiness Probes** — a service with misconfigured configuration should fail its startup health check before Kubernetes routes traffic to it; connecting config validation to readiness probes creates a safety net for config errors
- **Topic 84 — Distributed Tracing** — correlating a configuration change event with a downstream performance change requires distributed tracing; "something changed" and "something got slower" need to be correlated across time

---

*Part 4 · Centralised Configuration Management · Full Stack Interview Guide · Hruday D · 2026*
