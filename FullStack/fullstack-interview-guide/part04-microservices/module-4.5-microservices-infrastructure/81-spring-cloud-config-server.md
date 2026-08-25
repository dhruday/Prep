# Spring Cloud Config Server — Centralised Configuration
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Spring Cloud Config Server = a centralised configuration service that serves external configuration to all microservices from a Git repository (or filesystem/Vault/S3); instead of each service having its own `application.yml` bundled inside the JAR, configuration lives in a Git repo and is fetched at startup (or refreshed at runtime)
- Why needed: without centralised config, changing one value (like a Kafka broker URL changing after a migration) means rebuilding and redeploying every service; with Config Server, change the Git repo and refresh services without redeployment
- Config Server setup: annotate a Spring Boot app with `@EnableConfigServer`, point it at a Git repo URL — done; it serves `/ordersvc/production` → reads `ordersvc-production.yml` from the Git repo and returns the properties as JSON
- Client setup: add `spring-cloud-starter-config` dependency, set `spring.config.import=configserver:http://config-server:8888` in `bootstrap.yml` — the client fetches its config from the server before its application context even starts
- `@RefreshScope` + Spring Cloud Bus: annotate a bean with `@RefreshScope` and call `/actuator/refresh` on the service (or broadcast via Bus with a Kafka/RabbitMQ message) — the bean is re-created with the new config values without a service restart
- Gap to bridge: most candidates only know the basic setup; depth is in profiles and labels (environment-specific config with Git branches), encryption of sensitive values, refresh propagation via Spring Cloud Bus, and config precedence order

---

## 1. One-Line Definition
Spring Cloud Config Server externalises configuration for distributed systems into a central Git-backed service, allowing each microservice to fetch environment-specific configuration at startup and refresh it at runtime without redeployment.

---

## 2. The Problem It Solves

Each microservice typically includes an `application.yml` file inside the JAR. In a simple application, this works fine. In a microservices deployment with 20+ services, this becomes a maintenance problem:

```
Problems with per-service bundled configuration:
─────────────────────────────────────────────────
1. SHARED CONFIG DUPLICATION:
   Every service has: kafka.bootstrap-servers: kafka-broker:9092
   New Kafka broker IP → update 20 services → rebuild 20 JARs → redeploy 20 services
   For a 5-minute config change, you're triggering 20 CI/CD pipelines

2. ENVIRONMENT INCONSISTENCY:
   dev/staging/prod environments have different database URLs, Kafka topics, feature flags
   Bundled config means you either: 
   (a) bundle all environments in the JAR and switch by profile (config inside JAR = not ideal for secrets)
   (b) pass every config as an environment variable (unwieldy with 50+ properties)

3. AUDIT TRAIL:
   Who changed which property? When? Why? 
   With bundled config, there's no audit — just git history of individual service repos
   With Config Server backed by a dedicated Git repo, every change is a Git commit with message + author

4. RUNTIME CHANGES WITHOUT RESTART:
   Feature flags that should toggle without downtime need a mechanism
   Bundled config requires redeployment for every flag change
```

Config Server solves all of these by making the Git repo the single source of truth for all config, and enabling runtime refresh without restarts.

---

## 3. How It Works Internally

### File Layout Convention — Config Repo in Git

```
git repository: https://github.com/org/config-repo
├── application.yml          ← shared config for ALL services
├── application-production.yml ← shared config for ALL services in production
├── ordersvc.yml             ← specific to ordersvc, all environments
├── ordersvc-dev.yml         ← specific to ordersvc, dev environment
├── ordersvc-staging.yml     ← specific to ordersvc, staging environment
├── ordersvc-production.yml  ← specific to ordersvc, production environment
├── inventorysvc.yml
├── inventorysvc-production.yml
└── ... (one file per service × per environment)

Resolution order (highest precedence first):
  ordersvc-production.yml        (service + profile specific)
  ordersvc.yml                   (service specific, all profiles)  
  application-production.yml    (shared, production profile)
  application.yml                (shared, all services/profiles)

Properties in higher-precedence files OVERRIDE those in lower-precedence files.
```

### Config Server — Request Flow

```
OrderService starts up:
  1. Reads spring.config.import=configserver:http://config-server:8888
  2. Makes HTTP GET → http://config-server:8888/ordersvc/production
  
Config Server receives GET /ordersvc/production:
  3. Pulls latest changes from Git repo (git pull or cache check)
  4. Reads and merges: ordersvc-production.yml + ordersvc.yml + application-production.yml + application.yml
  5. Returns merged JSON to client

OrderService:
  6. Maps returned JSON to @Value-annotated fields and @ConfigurationProperties beans
  7. Application context starts with these external config values

Result: OrderService's JAR contains NO environment-specific configuration.
The same JAR binary runs in dev, staging, and production — pulling correct config from Config Server.
```

### `@RefreshScope` — Runtime Config Refresh

```
Config refresh flow (without restart):

1. Engineer pushes a commit to Git config repo:
   - feature.payment-v2-enabled: false → true (feature flag)

2. Trigger refresh (two options):
   Option A: Call POST /actuator/refresh on each service instance directly
   Option B: Use Spring Cloud Bus — one call to any service → Bus broadcasts to all
             (Spring Cloud Bus uses Kafka or RabbitMQ as the broadcast mechanism)

3. Service with @RefreshScope beans:
   @RefreshScope
   @Component
   public class FeatureFlags {
       @Value("${feature.payment-v2-enabled:false}")
       private boolean paymentV2Enabled;
       // This bean will be destroyed and re-created with new values on refresh
   }

4. After refresh: paymentV2Enabled = true, without restarting the JVM or redeploying

Note: @RefreshScope works for beans annotated with it. It does NOT work for beans that Spring
creates during startup and caches permanently (like DataSource factory beans).
Config Server is powerful for feature flags and light config; not for core infrastructure changes
that require a fresh application context (like changing the database URL).
```

---

## 4. The Code

### Config Server — Setup (one Spring Boot app)
```java
// pom.xml only needs:
// <dependency>
//     <groupId>org.springframework.cloud</groupId>
//     <artifactId>spring-cloud-config-server</artifactId>
// </dependency>

@SpringBootApplication
@EnableConfigServer  // That's it. This makes it a Config Server.
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

```yaml
# Config Server's own application.yml
server:
  port: 8888

spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/org/config-repo
          # For private repos:
          username: ${GIT_USERNAME}
          password: ${GIT_TOKEN}
          # Clone on start — don't wait for first client request
          clone-on-start: true
          # Clone into this directory (for container use, ensure writable volume mount)
          basedir: /tmp/config-repo
          # Force pull on every request (always check for updates)
          force-pull: true
          # Different branch per Spring profile
          search-paths: '{application}'  # search inside per-service subdirectories
          default-label: main  # Git branch to use

# Optional: encrypt sensitive values in config repo
encrypt:
  key: ${CONFIG_ENCRYPTION_KEY}  # Symmetric key for {cipher} values
```

### Config Client — OrderService Setup
```yaml
# bootstrap.yml (loaded BEFORE application context, so Config Server is contacted early)
spring:
  application:
    name: ordersvc  # This tells Config Server which files to look for
  profiles:
    active: production
  config:
    import: "configserver:http://config-server:8888"
  cloud:
    config:
      fail-fast: true  # Fail to start if Config Server is unreachable
      retry:
        max-attempts: 6
        initial-interval: 1000
        max-interval: 2000
```

```java
// Configuration Properties class (recommended over @Value for structured config)
@ConfigurationProperties(prefix = "payment")
@RefreshScope  // Will be refreshed when /actuator/refresh is called
@Data
public class PaymentConfig {
    private String gatewayUrl;
    private String apiKey;       // Stored encrypted as {cipher}xxx in Git
    private int timeoutMs = 5000;
    private boolean v2Enabled = false;
}

// Main application config class
@Configuration
@EnableConfigurationProperties(PaymentConfig.class)
public class AppConfig {
    // PaymentConfig is now injectable with @Autowired
}

// Using the config
@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentConfig paymentConfig;

    public PaymentResult charge(ChargeRequest request) {
        if (paymentConfig.isV2Enabled()) {
            return chargeWithV2Gateway(request, paymentConfig.getGatewayUrl());
        }
        return chargeWithLegacyGateway(request, paymentConfig.getGatewayUrl());
    }
}
```

### Encrypting Sensitive Properties in Git
```bash
# Config Server exposes /encrypt and /decrypt endpoints for easy key management

# Encrypt a database password:
curl -X POST http://config-server:8888/encrypt \
  -H "Content-Type: text/plain" \
  -d "my-super-secret-db-password"
# Returns: AQB3xy...{cipher}EncryptedBase64String...

# In config-repo/ordersvc-production.yml:
# spring:
#   datasource:
#     password: '{cipher}AQB3xy...EncryptedBase64String...'

# Config Server decrypts the value before serving it to the client service.
# The Git repo never contains plaintext secrets — safe to have in version control.
# Even if the Git repo is compromised, passwords are encrypted.

# For production: use HashiCorp Vault instead of symmetric key encryption
# spring.cloud.config.server.vault.* configuration streams secrets from Vault
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Spring Cloud Config Server and when would you use it?"

**Hruday's answer:**
> Spring Cloud Config Server is a dedicated Spring Boot application that serves external configuration to all microservices from a centralised Git repository. Instead of each service having its own configuration bundled inside its JAR, all configuration lives in a separate Git repo that the Config Server clones. When a microservice starts, it contacts the Config Server and fetches its configuration before initialising.
>
> I'd use it when I have 5 or more microservices that share any configuration (Kafka broker URLs, external service URLs, feature flags) or where I need per-environment config management. The practical trigger: when I realise changing a shared configuration value requires rebuilding and redeploying multiple services, Config Server is the right abstraction.
>
> The key benefits: a single Git history for ALL config changes across all services (who changed what and why), the same JAR binary that runs in development also runs in production (config is external), and the ability to toggle feature flags or update non-structural config without a deployment using `@RefreshScope` and the refresh endpoint.

---

### Q2 — Profile and Label Resolution
**Interviewer asks:** "How does Config Server handle different environments like dev, staging, and production?"

**Hruday's answer:**
> Config Server uses Spring profiles and Git labels (branches) to serve environment-specific configuration. The client sends its application name and active profile to the server as part of the request path: GET /{application}/{profile}/{label}.
>
> For OrderService running in production: GET /ordersvc/production/main — the server reads and merges files in precedence order: ordersvc-production.yml (highest — service and profile specific) overrides ordersvc.yml (service, all profiles) which overrides application-production.yml (shared, production) which overrides application.yml (lowest — shared, all).
>
> This layered system lets you define shared config once in application.yml — like the Kafka cluster URL that all services use — and override it only where needed. An individual service's specific override only needs to contain the diff, not a full copy of all shared config.
>
> Git branches can be used as labels to isolate config by release branch: config-branch=release-2.1 means Config Server reads from the release-2.1 Git branch. This means a service on v2.1 gets v2.1 config while a service on v2.2 gets v2.2 config during a rolling deployment — config is versioned alongside code.

---

### Q3 — Refresh Mechanism
**Interviewer asks:** "How do you push a config change to all running services without restarting them?"

**Hruday's answer:**
> There are two approaches using Spring Cloud Config and `@RefreshScope`.
>
> The simple approach: after pushing the config change to Git, call POST /actuator/refresh on each service instance. Spring Cloud Config client fetches the new config from the Config Server and re-creates all `@RefreshScope` beans with the updated values. The downside: you must call it on each service instance — with 20 services each running 3 replicas, that's 60 HTTP calls to trigger.
>
> The scalable approach: Spring Cloud Bus. It uses a message broker — Kafka or RabbitMQ — as a broadcast channel. You call POST /actuator/busrefresh on ANY one service instance. That instance publishes a RefreshRemoteApplicationEvent to the Kafka topic. Every service instance subscribed to that topic receives the event and triggers its own config refresh. One HTTP call triggers a refresh across the entire cluster.
>
> A common production pattern: use a webhook in the Git repo (GitHub webhook or GitLab CI trigger) to call /actuator/busrefresh on the Config Server itself when config changes are pushed. This makes config change deployment fully automated — push to the config repo → webhook fires → Bus broadcasts → all services reload config within seconds.

---

### Q4 — Secrets Management Integration
**Interviewer asks:** "Is it safe to put database passwords in a Git repo if it's the config source?"

**Hruday's answer:**
> Not in plaintext — but Config Server supports encryption so sensitive values are stored encrypted in Git. Config Server has /encrypt and /decrypt endpoints. You encrypt the password (AES symmetric or RSA asymmetric key), store the ciphertext in the Git config file using the {cipher}xxx syntax, and Config Server decrypts it when serving the config to clients. The plaintext never touches Git.
>
> However, for production-level secrets management, I'd integrate Config Server with HashiCorp Vault. Spring Cloud Config has native Vault support. Vault provides: dynamic secrets (Vault generates a unique DB username/password per service with limited TTL, rotated automatically), fine-grained access policies (service A can only read its own secrets), secrets versioning, and a comprehensive audit log of who accessed what secret and when.
>
> The practical setup for production: non-sensitive config (Kafka topics, service URLs, feature flags) in Git; sensitive secrets (database passwords, API keys, JWT secrets) in Vault. Config Server routes /{service}/{profile} requests to both Git and Vault backends, merges the results, and serves everything to the client service. The client service doesn't know or care where each property came from — it gets a unified configuration map.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Config Server in production with no HA" | "Just run one Config Server instance" | "Config Server is a critical dependency — if it's down, no service can start. In production, run Config Server behind a load balancer with 2+ instances. Each instance clones the Git repo, so failover is transparent. Also configure `fail-fast: false` with retries on clients for cases where Config Server restarts — a service waiting 6 attempts × 2s = 12s to connect is much better than a hard fail that triggers a crash loop." |
| "@RefreshScope on everything" | "Just annotate all beans with @RefreshScope and everything updates" | "@RefreshScope creates a proxy; on refresh, the real bean is destroyed and re-created. This has overhead and some beans don't play well with it — Spring Security's filter chain, for example, or DataSource beans where pool recreation on refresh would drop all active connections. Use @RefreshScope only for beans where runtime refresh is genuinely needed and tested: feature flags, rate limit configs, feature toggles. Not for core infrastructure beans." |
| "Config Server works with no Git history" | "Just use the Config Server filesystem backend for simplicity" | "Git backend provides audit trail: who changed what config value, when, and with what commit message. This is essential for production troubleshooting — when something breaks, 'what changed?' is the first question. Using a Git repo as the config store means the answer is always traceable. Filesystem or S3 backends lose this audit trail. Use Git backend in production; filesystem only for local development." |
| "All config can be refreshed at runtime" | "With @RefreshScope, any config change is live immediately" | "Some config changes require a JVM restart to take effect — they're not @RefreshScope-aware: datasource pool configuration (HikariCP initialises at startup), @ConditionalOnProperty beans (conditionals are evaluated at startup), server port, spring.jpa settings, and Kafka consumer group IDs. Config Server + @RefreshScope is for lightweight, runtime-changeable config (feature flags, timeouts, rate limits). Anything that affects Spring's infrastructure beans requires a rolling restart." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, SAP's enterprise software ships with a concept called the 'Configuration Transport Layer' — configuration changes flow from a development client → quality assurance system → production, tracked in change and transport requests with mandatory approvals and audit logs. This is effectively the enterprise version of Config Server: centralised, version-controlled, per-environment config with audit trails. Spring Cloud Config Server brings the same discipline to microservices but with Git and HTTP instead of SAP's transport layer. Explaining this connection in an interview makes the trade-offs intuitive — the enterprise world solved this problem decades ago, and Spring Cloud Config is the microservices-native realisation of the same principles."

---

## 8. Scale Evolution

**Single service, local dev:** Use application.yml bundled in the JAR with Spring profiles. Config Server is overkill.

**5-10 services, team growing:** Deploy Config Server backed by a Git repo. Services fetch config at startup. Centralise shared config and per-service overrides. Greatly reduces config drift between environments.

**20+ services, multiple teams:** Add Spring Cloud Bus (Kafka-backed) for broadcast refresh. Configure webhook from Git repo to trigger auto-refresh on config push. Add per-service subdirectory organisation in the config repo. Teams own their subdirectory.

**Security-mature stage:** Migrate secrets to HashiCorp Vault. Config Server serves non-sensitive config from Git and sensitive config from Vault. Enforce least-privilege Vault policies per service. Rotate secrets regularly with Vault's dynamic secret feature.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Kafka broker endpoints, payment gateway URLs, rate limiting values — shared across many services. Config Server ensures consistency and enables runtime toggling of limits without deployment. | "How do you change a rate limit for a specific payment method across all services simultaneously?" |
| Swiggy / Meesho | Feature flags for A/B testing, restaurant availability toggles, surge pricing configs — all need runtime changeability without deployments. Config Server + @RefreshScope is the standard mechanism. | "How would you implement feature flags across 30 microservices?" |
| Adobe / Microsoft | Enterprise SaaS products with feature flag management and per-customer config are natural Config Server use cases. Adobe Launch and similar products are conceptually Config Server at enterprise scale. | "How do you manage configuration for a SaaS product that supports customer-specific feature sets?" |
| SAP Labs (current) | SAP BTP (Business Technology Platform) has concept of "destination services" and "config services" — Config Server aligns conceptually. Demonstrating this connection shows breadth of thinking. | "How would you manage configuration for 20 BTP microservices across dev/QA/prod landscapes?" |

---

## 10. Related Topics — What to Study Next

- **Topic 68 — Service Discovery (Eureka/Consul)** — Config Server is itself a discoverable service; clients can find the Config Server address via Eureka rather than hardcoding it, making the entire infrastructure more dynamic
- **Topic 84 — Distributed Tracing** — Config Server changes affect service behaviour; distributed tracing helps debug which config value caused a change in service behaviour after a config refresh
- **Topic 85 — Health Checks and Readiness Probes** — services in Kubernetes that depend on Config Server must ensure their readiness probe fails if Config Server is unreachable at startup (`fail-fast: true`), so Kubernetes doesn't route traffic to the misconfigured instance
- **Topic 69 — API Gateway** — the API Gateway (Spring Cloud Gateway) itself needs centralised configuration (route definitions, rate limit configs) that can be refreshed at runtime without redeployment — ideal Config Server use case

---

*Part 4 · Spring Cloud Config Server · Full Stack Interview Guide · Hruday D · 2026*
