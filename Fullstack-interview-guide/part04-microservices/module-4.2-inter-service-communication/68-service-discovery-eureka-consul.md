# Service Discovery — Eureka, Consul, and Kubernetes DNS
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Service discovery = how does Service A find the current network address of Service B when IP addresses change dynamically (container restarts, scaling up/down, rolling deployments)?
- **Client-side discovery (Eureka/Ribbon)**: each service registers itself with a registry; callers query the registry and load-balance themselves — Spring Cloud Eureka, the classic Spring microservices choice, uses this model
- **Server-side discovery (Kubernetes DNS / Consul)**: a load balancer or DNS server does the discovery for you; your code just calls `http://order-service/api` — no discovery logic in application code
- In Kubernetes: service discovery is built-in via DNS — `http://order-service.namespace.svc.cluster.local` resolves to the healthy pods behind a Kubernetes Service — no Eureka needed
- The industry trend: Eureka was the answer in 2015-2020 (Spring Cloud Netflix stack); in 2020-2026, Kubernetes DNS is the answer for containerised workloads, Consul for multi-cloud scenarios
- Gap to bridge: knowing WHEN each mechanism applies (Eureka in non-K8s Spring Boot apps; K8s DNS in containerised environments) is what separates theoretical knowledge from practical judgment

---

## 1. One-Line Definition
Service discovery is the mechanism by which microservices dynamically locate each other's network addresses at runtime — since IP addresses change with every container restart, scaling event, or deployment — removing the need to hardcode service locations in configuration.

---

## 2. The Problem It Solves

In a monolith, components call each other in-process. No network addresses involved. When you split to microservices, every call becomes a network call — and network addresses must be managed.

The naive approach: hardcode service addresses in configuration files.
```yaml
# application.yml — BAD APPROACH
inventory-service:
  url: http://192.168.1.10:8080

payment-service:
  url: http://192.168.1.11:8080
```

What breaks immediately:
- Containers restart → new IP address is assigned → hardcoded config is now wrong
- You scale InventoryService from 1 to 3 instances → which IP do you use? → load balancing is broken
- A rolling deployment → old instance goes down, new instance comes up → the IP changes mid-deployment
- You move to Kubernetes → pods get new IPs every restart → hardcoded IPs are instantly stale

Service discovery solves this: instead of knowing WHERE a service is, you know its NAME. The discovery mechanism translates the name to a current, healthy address at call time.

---

## 3. How It Works Internally

### Pattern 1 — Client-Side Discovery (Spring Cloud Eureka)

In client-side discovery, each service registers itself with a Service Registry (Eureka Server). When Service A needs to call Service B, Service A's code queries the registry, gets a list of healthy instances of Service B, picks one (load balancing), and makes the call.

```
STARTUP SEQUENCE:
OrderService instance starts
  → Sends heartbeat registration to Eureka Server: "I'm order-service at 10.0.0.5:8080"
  → Eureka stores its entry
  → OrderService sends heartbeat every 30 seconds to indicate it's still alive
  → If Eureka stops receiving heartbeats for 90 seconds → marks instance DOWN

CALLING SEQUENCE:
InventoryServiceClient in OrderService needs to call InventoryService:
  1. Spring Cloud LoadBalancer queries Eureka: "List all UP instances of inventory-service"
  2. Eureka returns: [10.0.0.8:8080, 10.0.0.9:8080, 10.0.0.10:8080]
  3. LoadBalancer picks one (round-robin): 10.0.0.9:8080
  4. WebClient makes HTTP call to http://10.0.0.9:8080/api/v1/inventory/...
  5. On next call, LoadBalancer picks 10.0.0.10:8080 (round-robin continues)
```

#### Eureka Server Setup (Spring Boot)
```java
// Simple Spring Boot Eureka Server
@SpringBootApplication
@EnableEurekaServer
public class ServiceRegistryApplication {
    public static void main(String[] args) {
        SpringApplication.run(ServiceRegistryApplication.class, args);
    }
}
```

```yaml
# Eureka Server application.yml
server:
  port: 8761

eureka:
  instance:
    hostname: localhost
  client:
    registerWithEureka: false    # The registry itself doesn't register with itself
    fetchRegistry: false          # Doesn't need to fetch registry from itself
  server:
    enableSelfPreservation: false  # OK for dev; consider true for production
```

#### Eureka Client Setup (Service Registration)
```java
@SpringBootApplication
@EnableDiscoveryClient  // Registers this service with Eureka
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}
```

```yaml
# OrderService application.yml
spring:
  application:
    name: order-service  # This is the service name registered in Eureka

eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka/
  instance:
    prefer-ip-address: true             # Register with IP, not hostname (better for containers)
    lease-renewal-interval-in-seconds: 10   # Heartbeat every 10 seconds
    lease-expiration-duration-in-seconds: 30  # Marked down after 30 seconds no heartbeat
    instance-id: ${spring.application.name}:${server.port}:${random.value}
```

#### Calling a Discovered Service
```java
// Spring Cloud LoadBalancer replaces old Ribbon library
// Use @LoadBalanced WebClient — it intercepts calls and resolves via Eureka

@Configuration
public class WebClientConfig {

    @Bean
    @LoadBalanced  // KEY: This annotation makes WebClient use service discovery
    public WebClient.Builder loadBalancedWebClientBuilder() {
        return WebClient.builder();
    }
}

@Service
public class InventoryServiceClient {

    private final WebClient webClient;

    public InventoryServiceClient(@LoadBalanced WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("http://inventory-service").build();
        // NOTE: "inventory-service" is the Eureka service name — NOT an IP address
        // Spring Cloud LoadBalancer will resolve this to an actual IP at call time
    }

    public Mono<StockResponse> checkStock(String productId, int qty) {
        return webClient.get()
                .uri("/api/v1/inventory/{productId}?quantity={qty}", productId, qty)
                .retrieve()
                .bodyToMono(StockResponse.class);
    }
}
```

### Pattern 2 — Server-Side Discovery (Kubernetes DNS)

In Kubernetes, every Service object gets a stable DNS name regardless of which pods are running behind it. The kube-proxy and CoreDNS handle all discovery transparently. Application code uses the DNS name — no Spring Cloud dependencies, no Eureka client jars.

```
Kubernetes Service Definition for InventoryService:
---
apiVersion: v1
kind: Service
metadata:
  name: inventory-service
  namespace: production
spec:
  selector:
    app: inventory-service   # Routes traffic to pods with this label
  ports:
    - port: 80
      targetPort: 8080

DNS Names automatically created:
  inventory-service.production.svc.cluster.local  (fully qualified)
  inventory-service.production                     (within cluster)
  inventory-service                                (within same namespace)

OrderService calls: http://inventory-service/api/v1/inventory/{productId}
  → Kubernetes DNS resolves to ClusterIP of the Service
  → kube-proxy routes to one of the healthy pods behind the Service
  → No Eureka, no discovery client library, no registration code needed
```

```java
// Kubernetes-native service call — no Spring Cloud needed
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient inventoryWebClient(
            @Value("${services.inventory.url:http://inventory-service}") String baseUrl) {
        return WebClient.builder()
                .baseUrl(baseUrl)  // Just a DNS name — Kubernetes handles the rest
                .build();
        // No @LoadBalanced needed — Kubernetes Service does the load balancing
    }
}
```

### Pattern 3 — Consul (Multi-Cloud / Hybrid)

Consul is a multi-platform service registry from HashiCorp — works across VMs, containers, bare metal, and cloud environments. Used when services are NOT all in Kubernetes (hybrid on-prem + cloud, or multiple Kubernetes clusters).

Spring Cloud Consul integration is nearly identical to Eureka from the application programmer's perspective — just different XML configuration.

```yaml
spring:
  cloud:
    consul:
      host: ${CONSUL_HOST:localhost}
      port: 8500
      discovery:
        service-name: ${spring.application.name}
        health-check-path: /actuator/health
        health-check-interval: 10s
```

### Which to Use When

```
Deployment Environment        Recommended Approach
───────────────────────────────────────────────────────────
Spring Boot, non-containerised   Eureka (Spring Cloud Netflix)
Spring Boot in Kubernetes        K8s built-in DNS + Service objects
Multi-cloud / hybrid             Consul
Istio service mesh               Istio's built-in discovery (Envoy sidecar)
AWS ECS / Fargate                AWS Cloud Map (managed service discovery)
```

---

## 4. The Code

### Health Check Configuration (Critical for Discovery)

Service discovery is only useful if the registry knows which instances are healthy. Spring Boot Actuator provides health endpoints that Eureka and Kubernetes both use.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true   # Enables /actuator/health/liveness and /actuator/health/readiness
  health:
    livenessstate:
      enabled: true   # Is the app running? (restart if false)
    readinessstate:
      enabled: true   # Is the app ready to receive traffic? (remove from LB if false)
```

```yaml
# Kubernetes Deployment with health probes
spec:
  containers:
    - name: inventory-service
      image: inventory-service:1.2.0
      ports:
        - containerPort: 8080
      
      livenessProbe:           # Is the container still running healthily?
        httpGet:
          path: /actuator/health/liveness
          port: 8080
        initialDelaySeconds: 30  # Wait 30s after start before first check
        periodSeconds: 10
        failureThreshold: 3    # Restart after 3 consecutive failures
      
      readinessProbe:          # Is the container ready to receive traffic?
        httpGet:
          path: /actuator/health/readiness
          port: 8080
        initialDelaySeconds: 20
        periodSeconds: 5
        failureThreshold: 3    # Remove from Service endpoint list after 3 failures
        # During startup, DB connection pooling needs time — readiness probe delays traffic
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is service discovery and why is it needed in microservices?"

**Hruday's answer:**
> Service discovery is the mechanism by which services dynamically find each other's network addresses at runtime. It is needed because in a microservices environment, services run in containers that are restarted, scaled up, scaled down, and moved across machines frequently. Each restart typically results in a new IP address.
>
> If you hardcode service addresses — "InventoryService is at 192.168.1.10:8080" — the moment that container restarts and gets a new IP, your callers break. Service discovery replaces the hardcoded address with a logical name: "call inventory-service." The discovery mechanism resolves that name to a currently available, healthy instance at call time.
>
> There are two main patterns: client-side discovery (Eureka) where the calling service queries a registry and load-balances itself, and server-side discovery (Kubernetes DNS) where a load balancer or DNS server handles it transparently. In modern Kubernetes deployments, the platform handles discovery natively — calling `http://inventory-service` works because Kubernetes DNS resolves it to the Service's ClusterIP, which routes to healthy pods.

---

### Q2 — Comparison Question
**Interviewer asks:** "When would you use Eureka vs Kubernetes DNS for service discovery?"

**Hruday's answer:**
> My primary criteria is the deployment environment.
>
> Eureka makes sense in a standalone Spring Boot microservices deployment — not in Kubernetes. If I have 10 Spring Boot services running on VMs or EC2 instances directly (no container orchestration), Eureka with Spring Cloud provides service registry, health checking, and load-balanced clients in a pure Java/Spring stack. Eureka was the standard for the Spring Cloud Netflix microservices pattern from 2015-2020.
>
> Once services are containerised and running in Kubernetes — which is the case for most new deployments in 2024 — Kubernetes DNS is superior. There is no separate service registry to deploy and operate. Kubernetes handles service registration, health checking, and load balancing natively through its Service objects. My application code just uses a DNS name. No Spring Cloud dependencies, no Eureka client jar, no registration logic. Cleaner, simpler, operationally lighter.
>
> The decision is not "Eureka vs Kubernetes DNS" as competing approaches — it is "what is my deployment platform?" If the answer is Kubernetes, use Kubernetes DNS. The only reason to add Eureka on top of Kubernetes is multi-cluster discovery across Kubernetes clusters that cannot natively see each other — and even there, Consul or a service mesh is generally a better answer than Eureka.

---

### Q3 — Deep Dive on Eureka
**Interviewer asks:** "What happens if the Eureka server goes down?"

**Hruday's answer:**
> Eureka is designed with a self-preservation mode specifically to handle network partitions and server restarts without de-registering all services at once.
>
> If the Eureka server goes down, clients continue to operate using their locally cached registry. When a service starts up, it fetches the full registry from Eureka and stores it locally (in memory). Subsequent calls use this cache, refreshed periodically. If the Eureka server is unreachable at refresh time, the client uses the last good cache. Calls continue.
>
> This means a brief Eureka outage (seconds to minutes) does not take down the entire system. Services continue calling each other using cached addresses. The risk is serving stale data — if InventoryService added a new instance during the Eureka outage, callers won't know about it until the cache is refreshed. And if an InventoryService instance went down during the outage, callers might still route to it (the stale cache shows it as UP) — circuit breakers handle that failure.
>
> For production — Eureka should be deployed as a cluster of 2-3 nodes for high availability. If any one node is up, clients can register and fetch registry. For Kubernetes deployments, this concern is eliminated because Kubernetes DNS is distributed across all cluster nodes and has no single point of failure.

---

### Q4 — Scenario
**Interviewer asks:** "Your service is deployed in Kubernetes. How do you configure inter-service communication?"

**Hruday's answer:**
> In Kubernetes, I would remove Spring Cloud Eureka entirely and use the native Kubernetes service discovery.
>
> Each microservice has a Kubernetes Deployment (pods) and a Kubernetes Service (stable DNS name and ClusterIP). The Service selector points to pods by label. When a pod restarts or scales, Kubernetes automatically updates the list of healthy endpoints behind that Service.
>
> For the calling code: a plain WebClient with the Kubernetes DNS name. `WebClient.builder().baseUrl("http://inventory-service").build()`. No annotations, no discovery client. Kubernetes CoreDNS resolves `inventory-service` to the ClusterIP of the Kubernetes Service. kube-proxy routes the traffic to one of the healthy pods behind that Service using round-robin by default.
>
> Load balancing is at the kube-proxy/iptables level (or IPVS for high performance) — transparent to the application. The Kubernetes Service does health checking via liveness and readiness probes on each pod — if a pod fails its readiness probe, Kubernetes removes it from the Service endpoint list, so no traffic is routed to it.
>
> For cross-namespace calls: `http://inventory-service.production.svc.cluster.local`. For cross-cluster calls (microservices in two separate Kubernetes clusters): this is where Istio multi-cluster or Consul service mesh becomes relevant.
>
> The operational benefit: no Eureka cluster to maintain, monitor, or scale. Discovery infrastructure is the Kubernetes control plane itself, which is already managed as part of the cluster.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Always use Eureka in Spring Boot microservices" | "Eureka is the Spring Cloud standard" | "Eureka was the Spring Cloud standard when microservices ran on VMs (2015-2020). In 2024, if you run on Kubernetes, Eureka is redundant — Kubernetes provides better service discovery natively. Adding Eureka to a Kubernetes deployment is adding a dependency to solve a problem Kubernetes already solves." |
| "Service discovery = just Eureka registration" | "Register with Eureka and calls are automatically routed" | "Service discovery also requires health checking. Registering a service that is up but not healthy (DB connection broken, memory exhausted) without health checks routes traffic to a broken instance. Spring Boot Actuator health endpoint + Kubernetes readiness probes together ensure only truly ready instances receive traffic." |
| "Set DNS/registry cache TTL to 0 for freshness" | "Reduce cache TTL to always have fresh addresses" | "Zero TTL means every service call requires a DNS lookup or registry query — that add latency to every request. Set TTL to 5-30 seconds for a balance between freshness and performance. In Kubernetes, the Service object caches are managed by the control plane — you don't tune DNS TTL in the application for pod-level discovery, only for external DNS." |
| "Ignore the unavailable period after startup" | "The service is registered immediately on startup" | "There is a gap between when a Spring Boot application starts (listening on port 8080) and when it is truly ready (DB connections pooled, caches warm, dependencies checked). If the service registers with Eureka or starts receiving Kubernetes traffic before it is ready, the first N requests will fail. Use Spring Boot's readiness probe to hold traffic until the application is genuinely ready. In Kubernetes: `readinessProbe` on the Deployment. In Eureka: `eureka.instance.initial-status=OUT_OF_SERVICE` until the app marks itself UP." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, the ERP services called each other through a combination of hardcoded hostnames in JEE JNDI trees and a service bus — effectively a static form of service discovery. When a service moved to a different server (not a common event in the monolith days), we'd manually update the JNDI configuration and restart. In the Spring Cloud world, that manual step is replaced by Eureka. In Kubernetes, even that is unnecessary — it is all automatic. The progression from 'manually pick up the phone and update the config file' to 'Kubernetes just handles it' reflects how much the infrastructure layer has matured. Understanding the full stack of solutions — from manual config, to Eureka, to K8s DNS — helps explain WHY each layer was introduced and what problem each solved."

---

## 8. Scale Evolution

**Small team, VMs, no K8s →** Eureka is the right choice. Simple to set up, integrates tightly with Spring Cloud circuit breakers and WebClient, well-documented.

**Containerised, single K8s cluster →** Remove Eureka. Use Kubernetes Services and DNS. Simpler, operationally lighter, no separate registry cluster to manage.

**Multi-cluster production (multiple K8s clusters for HA/geo) →** Kubernetes doesn't natively handle cross-cluster service discovery. Consul service mesh or Istio multi-cluster configuration. This is where organisations like Google, Stripe, and Razorpay invest in service mesh infrastructure.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Kubernetes-based deployment — Kubernetes DNS for service discovery, potentially with Istio for advanced service mesh (mTLS, traffic policies, observability). | "How does PaymentService discover InventoryService in your Kubernetes setup?" |
| Swiggy / Meesho | High-velocity deployments — services scale up and down frequently during peak hours. Kubernetes readiness probes + Service-level discovery ensures no traffic goes to cold instances. | "We noticed new instances receiving traffic before they're ready during scale-out. How do you fix this?" |
| SAP Labs (current) | SAP BTP uses Kubernetes under the hood. Service-to-service discovery in the SAP BTP Kyma runtime is Kubernetes-native. Understanding K8s discovery patterns is directly applicable. | Architecture discussions in SAP BTP service integration. |
| Google / Microsoft / Amazon | Service mesh (Istio, Linkerd, AWS App Mesh) is the evolution of service discovery — adds mTLS, circuit breaking, observability to Kubernetes DNS. Senior engineers are expected to know the full stack from DNS to mesh. | "Walk me through how services discover each other in a multi-region Kubernetes deployment." |

---

## 10. Related Topics — What to Study Next

- **Topic 66 — REST vs gRPC** — once services discover each other's addresses, the protocol choice for the actual communication is REST or gRPC — these topics work together
- **Topic 69 — API Gateway** — the API Gateway is the external entry point for all client-to-service calls; internally, services discover each other via registry/DNS but external clients go through the gateway
- **Topic 71 — Circuit Breaker** — service discovery gives you the address; the circuit breaker protects you when the service at that address is slow or broken — they are almost always used together
- **Topic 85 — Health Checks and Readiness Probes** — the mechanism that service discovery systems use to know which instances are healthy — a direct dependency of effective service discovery
- **Topic 82 — Service Mesh (Istio)** — the evolution of service discovery: a service mesh handles discovery, mTLS, load balancing, and observability at the infrastructure level, removing all service discovery logic from application code entirely

---

*Part 4 · Service Discovery (Eureka, Consul, Kubernetes DNS) · Full Stack Interview Guide · Hruday D · 2026*
