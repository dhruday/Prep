# Spring Boot Autoconfiguration — How It Works
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Autoconfiguration = Spring Boot automatically registers beans based on what is on your classpath
- `spring.factories` (or `AutoConfiguration.imports` in Spring Boot 3) lists every autoconfiguration class — Spring reads this file at startup
- `@ConditionalOnClass` means "only configure this if this class exists in the classpath" — this is how Spring Boot detects what you added in `pom.xml`
- `@ConditionalOnMissingBean` means "only configure this if you haven't defined your own" — this lets you override any autoconfiguration by declaring your own bean
- Order: your beans always take priority over autoconfiguration beans
- Gap to bridge: understanding exactly HOW `@SpringBootApplication` triggers autoconfiguration — it includes `@EnableAutoConfiguration` which imports `AutoConfigurationImportSelector`

---

## 1. One-Line Definition
Spring Boot autoconfiguration automatically registers Spring beans for common dependencies (data sources, web servers, security, Jackson) based on what jars are on your classpath — so you get a working application with zero XML and minimal setup code.

---

## 2. The Problem It Solves

Before Spring Boot, setting up a Spring MVC web application required:
- A web.xml to register DispatcherServlet
- An applicationContext.xml to configure every bean (DataSource, TransactionManager, ViewResolver, MessageConverter...)
- A spring-mvc.xml for web-layer config
- Manual dependency version management

Adding JPA meant writing another 30 lines of XML for EntityManagerFactory, TransactionManager, and data source. Adding security meant another XML file. Changing databases meant rewriting config.

Every new project started with copying configuration from the previous project and hoping nothing broke.

Spring Boot autoconfiguration applies the principle: "if Jackson is on the classpath, you almost certainly want a Jackson `ObjectMapper` bean — so Spring Boot provides one". If you agree with the default, you need zero configuration. If you want a different setup, you declare your own bean and Spring Boot backs off.

This changed Spring development from "configure everything explicitly" to "configure what differs from the sensible default".

---

## 3. How It Works Internally

### The Mental Model
Think of autoconfiguration like a smart hotel room. When you check in, the TV is on your preferred channel (default config), the temperature is set to 22 degrees, and the mini-bar is stocked. You did not ask for any of this — the hotel just knows what most guests want. But if you want a different temperature, you change it yourself and the hotel does not override you. `@ConditionalOnMissingBean` is the rule: "only do this if the guest hasn't set their own preference."

### The Mechanism — Step by Step

1. **`@SpringBootApplication` is the trigger** — This annotation includes `@EnableAutoConfiguration`, which imports `AutoConfigurationImportSelector`.

2. **`AutoConfigurationImportSelector` reads the candidates list** — In Spring Boot 2.x, it reads `META-INF/spring.factories` from every jar on the classpath. Under the key `org.springframework.boot.autoconfigure.EnableAutoConfiguration`, this file lists autoconfiguration class names. In Spring Boot 3.x, it reads `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — a simpler file format with one class per line.

3. **The full candidate list is assembled** — Spring Boot collects ALL autoconfiguration classes from all jars. Including the `spring-boot-autoconfigure` jar, there are 150+ autoconfiguration classes.

4. **Conditions are evaluated** — For each candidate class, Spring evaluates its conditions:
   - `@ConditionalOnClass(DataSource.class)` — is this class on the classpath?
   - `@ConditionalOnMissingBean(DataSource.class)` — has the user NOT defined their own DataSource bean?
   - `@ConditionalOnProperty(name="spring.datasource.url")` — is this property set?
   - Conditions combine — ALL conditions on a class must pass for it to be applied.

5. **Non-matching classes are filtered out** — If HikariCP is not on the classpath, `HikariDataSourceConfiguration` is skipped. If you defined a custom `DataSource` bean, `DataSourceAutoConfiguration` is skipped.

6. **Passing classes are applied as configuration** — The ones that pass all conditions are treated as `@Configuration` classes. Their `@Bean` methods are called and the beans are registered.

7. **Order and dependencies** — Autoconfiguration classes can declare order: `@AutoConfigureAfter(DataSourceAutoConfiguration.class)` or `@AutoConfigureBefore`. This ensures dependent autoconfiguration runs in the right sequence.

### What `@ConditionalOnMissingBean` Actually Does
When an autoconfiguration class defines a bean with this condition, Spring checks the bean registry BEFORE applying the autoconfiguration. If a bean of that type or name already exists (because you declared it in a `@Configuration` class that ran first), the condition returns false and the autoconfiguration bean is skipped. Your bean wins.

This is why you can override any Spring Boot default: define your own bean of the same type in your `@Configuration` class.

### ASCII Diagram

```
@SpringBootApplication
         |
         └── @EnableAutoConfiguration
                    |
                    └── AutoConfigurationImportSelector
                               |
                               v
         Read spring/AutoConfiguration.imports from ALL jars on classpath
            ┌────────────────────────────────────────────────┐
            │ DataSourceAutoConfiguration                    │
            │ JpaRepositoriesAutoConfiguration               │
            │ SecurityAutoConfiguration                      │
            │ WebMvcAutoConfiguration                        │
            │ KafkaAutoConfiguration                         │
            │ ... 150+ more                                  │
            └────────────────────────────────────────────────┘
                               |
                               v
              Evaluate @Conditional... on each class
            ┌──────────────────────────────────────────────────────────────┐
            │ DataSourceAutoConfiguration                                  │
            │   @ConditionalOnClass(DataSource.class)    → ✅ HikariCP on CP│
            │   @ConditionalOnMissingBean(DataSource.class)→ ✅ user has none│
            │   RESULT: APPLY — register HikariDataSource bean            │
            ├──────────────────────────────────────────────────────────────┤
            │ KafkaAutoConfiguration                                        │
            │   @ConditionalOnClass(KafkaTemplate.class) → ❌ not on CP    │
            │   RESULT: SKIP                                               │
            ├──────────────────────────────────────────────────────────────┤
            │ SecurityAutoConfiguration                                    │
            │   @ConditionalOnClass(AuthenticationManager.class)→ ✅       │
            │   RESULT: APPLY — register default security filter chain     │
            └──────────────────────────────────────────────────────────────┘
                               |
                               v
              Beans registered → ApplicationContext ready
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Assuming Spring Boot will always configure a DataSource for free
// without understanding WHEN it doesn't and what to do then

@SpringBootApplication
public class MyApp {
    public static void main(String[] args) {
        SpringApplication.run(MyApp.class, args);
        // This works fine — until you add spring-boot-starter-data-jpa
        // WITHOUT adding a DataSource config or database driver
        // Then you get: HikariPool-1 - Exception during pool initialization
        // Most devs panic and search StackOverflow instead of understanding why
    }
}
```
> **Why this fails in production:** Autoconfiguration is conditional — not guaranteed. If the conditions are not met (missing driver jar, missing property), the bean is not created and you get a startup failure or a silent missing dependency. Knowing the conditions helps you debug these failures in 2 minutes instead of 2 hours.

### Right Way — Understanding and Overriding Autoconfiguration
```java
// Overriding autoconfiguration — the correct approach
// Spring Boot's DataSourceAutoConfiguration provides a HikariCP pool by default
// Override it to use a custom configuration (e.g., multi-tenant setup)

@Configuration
public class DatabaseConfig {

    // By declaring a DataSource bean yourself, you trigger @ConditionalOnMissingBean
    // Spring Boot's DataSourceAutoConfiguration has:
    //   @ConditionalOnMissingBean(DataSource.class)
    // So when Spring finds YOUR bean first, autoconfiguration backs off
    @Bean
    @Primary  // if multiple DataSources exist, mark the main one as @Primary
    public DataSource primaryDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("${app.db.url}");
        config.setUsername("${app.db.username}");
        config.setPassword("${app.db.password}");
        config.setMaximumPoolSize(20);     // tuned for production load
        config.setMinimumIdle(5);          // keep 5 idle connections ready
        config.setConnectionTimeout(30000); // wait max 30s for a connection
        config.setIdleTimeout(600000);     // evict idle connections after 10min
        return new HikariDataSource(config);
    }
}
```

```java
// Writing your own autoconfiguration — useful for shared platform libraries
@AutoConfiguration  // Spring Boot 3.x annotation (replaces @Configuration in auto-configs)
@ConditionalOnClass(AuditService.class)   // only apply if AuditService jar is on classpath
@ConditionalOnProperty(
    name = "audit.enabled",
    havingValue = "true",
    matchIfMissing = true // if the property is MISSING, treat it as true — default ON
)
@EnableConfigurationProperties(AuditProperties.class) // bind audit.* properties to a class
public class AuditAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean // only create if user hasn't defined their own AuditService
    public AuditService auditService(AuditProperties props) {
        return new DefaultAuditService(props.getRetentionDays());
    }
}
```

```java
// AuditProperties — holds all the config properties for your autoconfiguration
@ConfigurationProperties(prefix = "audit")  // binds audit.* properties from application.yml
public class AuditProperties {

    private boolean enabled = true;
    private int retentionDays = 90;

    // getters and setters needed (or use a record in Java 17+)
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public int getRetentionDays() { return retentionDays; }
    public void setRetentionDays(int retentionDays) { this.retentionDays = retentionDays; }
}
```

### Registration for Autoconfiguration (Spring Boot 3.x)
```
# File: src/main/resources/META-INF/spring/
# org.springframework.boot.autoconfigure.AutoConfiguration.imports

com.myplatform.audit.AuditAutoConfiguration
```

### Configuration (application.yml)
```yaml
# Disable a specific autoconfiguration class — useful for testing or custom setup
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration
      # Use this to disable Spring Security's default login form in tests
      # Or to replace the entire security setup with your own configuration

# Autoconfiguration debug — prints which autocopletes applied and which were skipped
debug: true
# This outputs an "CONDITIONS EVALUATION REPORT" at startup
# Shows: POSITIVE MATCHES (applied) and NEGATIVE MATCHES (skipped with reason)
# This is the first thing to check when beans are not being created as expected
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does Spring Boot know what to configure automatically when you add a dependency?"

**Hruday's answer:**
> Spring Boot uses a two-step mechanism: classpath detection and conditional configuration.
>
> When you add a starter like `spring-boot-starter-data-jpa` to your `pom.xml`, you pull in several jars including Hibernate, the JPA API, and `spring-boot-autoconfigure`. Inside `spring-boot-autoconfigure`, there is a file called `AutoConfiguration.imports` (in Spring Boot 3.x) that lists every autoconfiguration class available in that jar.
>
> At startup, `@EnableAutoConfiguration` tells Spring to read all these files from every jar on the classpath and collect the full list of autoconfiguration candidates.
>
> Then Spring evaluates conditions on each candidate. `JpaRepositoriesAutoConfiguration` has `@ConditionalOnClass(JpaRepository.class)` — if that class is on the classpath (which it is, because we added the starter), the condition passes. It also has `@ConditionalOnMissingBean(JpaRepositoryFactoryBean.class)` — if you haven't defined your own JPA factory, the condition passes.
>
> Since both conditions pass, Spring registers the JPA repository infrastructure beans for you automatically.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the difference between @ConditionalOnClass and @ConditionalOnMissingBean? How do they interact?"

**Hruday's answer:**
> These two conditions serve different purposes and are often used together.
>
> `@ConditionalOnClass` answers: "Is this class available in the classpath?" It checks whether a class can be loaded — if yes, the condition passes. This is how autoconfiguration detects what libraries you added. If you did NOT add Kafka to your `pom.xml`, `KafkaTemplate.class` does not exist, and `KafkaAutoConfiguration` is skipped entirely.
>
> `@ConditionalOnMissingBean` answers: "Has the application already defined a bean of this type?" It checks the `BeanDefinitionRegistry` — if a bean of the specified type already exists (because you declared it in your own `@Configuration`), the condition returns false and the autoconfiguration bean is skipped.
>
> Together they form the autoconfiguration contract: "Configure this bean IF the library is present AND the user hasn't provided a custom one." Both conditions must be true.
>
> If you want to override Spring Boot's default `ObjectMapper`, you declare your own `@Bean` returning `ObjectMapper` in a `@Configuration` class. `JacksonAutoConfiguration` has `@ConditionalOnMissingBean(ObjectMapper.class)` — it detects your bean and backs off. Your `ObjectMapper` wins.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the downsides of autoconfiguration? When is it better to configure manually?"

**Hruday's answer:**
> Autoconfiguration is a convenience that hides complexity. The downsides come when that hidden complexity becomes a problem.
>
> First: magic behaviour that is hard to debug. A new developer asks "where is the DataSource configured?" and cannot find it — it is in autoconfiguration. You need to know to check the Conditions Evaluation Report (`debug: true`) or look in `spring-boot-autoconfigure` source.
>
> Second: version conflicts. When you upgrade Spring Boot, autoconfiguration classes change. HikariCP default pool size might change, Jackson's serialization defaults might change — these can break production behaviour silently.
>
> Third: autoconfiguration is not always optimal for production. The default connection pool settings, cache sizes, and timeout values are tuned for general use. A payment service with specific throughput requirements needs hand-tuned HikariCP settings with explicit values, not defaults.
>
> I recommend: rely on autoconfiguration for development speed, but for production-critical beans (DataSource, security config, message broker clients), write explicit `@Configuration` with every value documented. This way, the config is visible, version-controlled, and tunable.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Your team is building a shared Spring Boot library used by 30 microservices. The library should automatically apply distributed tracing to all HTTP calls without any setup from the service teams. How would you build this?"

**Hruday's answer:**
> This is exactly the autoconfiguration use case. I would build a library with three components.
>
> First, a `TraceAutoConfiguration` class annotated with `@AutoConfiguration`. It has `@ConditionalOnClass(RestTemplate.class)` so it only applies to services using RestTemplate, and `@ConditionalOnProperty(name="tracing.enabled", matchIfMissing=true)` so it is on by default but can be disabled.
>
> Inside, I declare two beans: a `RestTemplate` `@Bean` with a `TraceInterceptor` added to it (annotated `@ConditionalOnMissingBean` so services can override it), and a `TraceFilter` that adds a correlation ID to every incoming request's thread context.
>
> Second, I register the `TraceAutoConfiguration` class in `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`. When any service adds this library as a dependency, Spring Boot picks it up automatically.
>
> Third, I write the `TraceInterceptor` that reads the `X-Correlation-ID` header from incoming requests and sets it on all outgoing `RestTemplate` calls via `ClientHttpRequestInterceptor`.
>
> Services get automatic tracing by adding one dependency. They can disable it with `tracing.enabled=false`. They can override the `RestTemplate` bean if they need custom configuration. This is the full autoconfiguration contract.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Where does autoconfiguration config come from?" | "It's built into Spring" | "It comes from META-INF/spring.factories (Spring Boot 2.x) or META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports (Spring Boot 3.x) inside every jar on the classpath. Multiple jars can contribute — including your own libraries." |
| "Adding spring-boot-starter-security secures my whole app automatically" | "Yes, it adds security" | "Yes and no. It registers a default security filter chain that requires HTTP Basic auth for ALL endpoints. In tests this breaks everything. Add @SpringBootTest without security or use @WithMockUser, or manually configure SecurityFilterChain to your needs. The autoconfiguration is a starting point, not a production setup." |
| "How to debug 'No qualifying bean of type' errors" | "Check if @Component is on the class" | "Set debug: true in application.yml. The Conditions Evaluation Report shows NEGATIVE MATCHES with the exact reason why a bean was NOT created. It says 'DataSourceAutoConfiguration: did not match: @ConditionalOnClass found: HikariDataSource — not found: ...' — tells you exactly what's missing." |
| "@SpringBootApplication includes everything" | "Yes, it handles all config automatically" | "@SpringBootApplication = @Configuration + @EnableAutoConfiguration + @ComponentScan. @EnableAutoConfiguration is what triggers autoconfiguration reading. @ComponentScan scans your own package. Understanding this lets you use each part individually — useful in tests." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we had a Spring Boot service that worked fine locally but crashed in the staging environment with `Failed to configure a DataSource`. Locally, we had an H2 in-memory database on the classpath (from a test dependency). Staging did not. Spring Boot's `DataSourceAutoConfiguration` was attempting to create a DataSource but found no driver. Setting `debug: true` showed the exact condition failure in 10 seconds. We moved the H2 dependency to `test` scope only and added the PostgreSQL driver to production classpath. Understanding autoconfiguration conditions turned a 30-minute mystery into a 5-minute fix."

---

## 8. Scale Evolution

**1,000 users →** Autoconfiguration defaults work fine. Use them. The default HikariCP pool, the default Jackson ObjectMapper, the default Spring MVC setup all handle this scale without tuning.

**100,000 users →** Start explicitly tuning the beans that autoconfiguration provides. Override `DataSource` bean with specific pool sizes — you know your load pattern. Override `ObjectMapper` with specific serialization settings — you have specific API contracts. Configure thread pools explicitly — the defaults are for demos, not production workloads.

**10 million users →** Significant startup-time optimisation matters. Run with `spring.main.lazy-initialization=true` in non-critical beans to speed up instance startup during auto-scale events. Use the autoconfiguration exclusion list to disable unused autoconfiguration classes — a payment service does not need `WebSocketAutoConfiguration` or `GraphQLAutoConfiguration`. Every skipped class reduces startup time marginally, but 20 skipped classes add up to 300ms less startup time.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Production Spring Boot tuning is critical. They override autoconfiguration defaults for DataSource, Jackson, and security. Understanding how override works is table stakes. | "Explain how you would override Spring Boot's default Jackson configuration to add a custom serializer." |
| Swiggy / Meesho | Building and maintaining shared platform libraries for 50+ microservices. Autoconfiguration is how they distribute common behaviour (audit, tracing, feature flags). | "How would you build a starter that auto-instruments all services with distributed tracing?" |
| Adobe / Microsoft | Enterprise Spring Boot standards. They publish internal starters. Understanding autoconfiguration writing is required for platform team roles. | "Write a @ConditionalOnMissingBean conditional and explain when it fires relative to user-defined beans." |
| Remote / Global roles | Standard senior Spring Boot interview topic. Companies across fintech, e-commerce, SaaS all use Spring Boot. This topic separates developers who use it from those who understand it. | Any Spring Boot role will ask the "how does autoconfiguration work" question in some form. |

---

## 10. Related Topics — What to Study Next

- **Topic 42 — Spring Boot Request Lifecycle** — the `DispatcherServlet` and `WebMvcAutoConfiguration` are registered by autoconfiguration — understanding autoconfiguration shows how the web layer is set up
- **Topic 45 — Spring Boot Actuator** — Actuator is another autoconfiguration module — `ActuatorAutoConfiguration` registers all the health and metrics endpoints conditionally
- **Topic 37 — IoC Container Internals** — `BeanDefinition` registration and `BeanPostProcessor` are the underlying mechanism that autoconfiguration builds on top of
- **Topic 44 — @Transactional Internals** — `TransactionAutoConfiguration` registers the `PlatformTransactionManager` — understanding this shows how transactions get wired automatically
- **Topic 48 — HikariCP Connection Pooling** — `DataSourceAutoConfiguration` registers HikariCP by default — overriding it is the first customisation most production teams make

---

*Part 3 · Spring Boot Autoconfiguration · Full Stack Interview Guide · Hruday D · 2026*
