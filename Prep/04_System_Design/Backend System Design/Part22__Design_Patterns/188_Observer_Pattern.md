# 188. Observer Pattern

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

The **Observer Pattern** is a behavioral design pattern that defines a one-to-many dependency between objects. When one object (the Subject) changes state, all its dependents (Observers) are automatically notified and updated. This pattern is also known as **Publish-Subscribe** or **Pub-Sub** pattern.

**What it is:**
- A design pattern for event-driven communication
- Decouples the sender (subject) from receivers (observers)
- Enables one-to-many broadcasting of state changes
- Foundation for reactive programming and event-driven architectures

**Why it exists:**
- Eliminates tight coupling between event producers and consumers
- Enables dynamic subscription/unsubscription at runtime
- Supports multiple observers for a single subject
- Promotes loose coupling and separation of concerns
- Enables asynchronous, non-blocking event processing

**The problem it solves:**
- Avoids polling for state changes
- Prevents tight coupling between components
- Eliminates hard-coded dependencies
- Supports broadcast communication patterns
- Enables plugin-like extensibility

**Where and when it is used:**
- Event handling systems (GUI frameworks, Spring Events)
- Real-time notification systems (alerts, updates)
- Monitoring and observability platforms (metrics, logs)
- Message brokers and event buses (Kafka, RabbitMQ)
- State management in frontend frameworks (Redux, MobX)
- Stock market tickers and live data feeds
- Social media activity streams

**Role in large-scale distributed systems:**
- Foundation for event-driven microservices
- Enables asynchronous communication between services
- Supports eventual consistency patterns
- Facilitates real-time data synchronization
- Enables scalable notification delivery
- Powers reactive systems and streaming architectures

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Core Components

1. **Subject (Observable)**: Maintains list of observers and notifies them of state changes
2. **Observer (Listener/Subscriber)**: Receives notifications and reacts to changes
3. **ConcreteSubject**: Stores state and triggers notifications
4. **ConcreteObserver**: Implements update logic when notified

### System Architecture & Component Boundaries

```
┌──────────────────────────┐
│   ConcreteSubject        │
│   (maintains state)      │
│                          │
│   - state: StateType     │
│   - observers: List      │
│                          │
│   + attach(observer)     │
│   + detach(observer)     │
│   + notify()             │
└────────────┬─────────────┘
             │
             │ notifies
             ▼
    ┌────────────────┐
    │   Observer     │ (interface)
    │                │
    │   + update()   │
    └────────┬───────┘
             │
    ┌────────┼────────────────┐
    │        │                │
┌───▼───┐ ┌──▼────┐ ┌────────▼──┐
│Observer1│Observer2│  Observer3│
│         │         │           │
│update() │update() │  update() │
└─────────┘ └───────┘ └──────────┘
```

### Data Flow & Request Lifecycle

**1. Registration Phase:**
```
Observer1 → Subject.attach(Observer1)
Observer2 → Subject.attach(Observer2)
Observer3 → Subject.attach(Observer3)

Subject maintains: [Observer1, Observer2, Observer3]
```

**2. State Change & Notification:**
```
Event Occurs → Subject.setState(newState)
              ↓
         Subject.notify()
              ↓
    ┌─────────┼─────────┐
    ▼         ▼         ▼
Observer1  Observer2  Observer3
update()   update()   update()
```

**3. Cleanup Phase:**
```
Observer2 → Subject.detach(Observer2)
Subject now maintains: [Observer1, Observer3]
```

### Push vs Pull Model

**Push Model** (Subject sends data):
```java
interface Observer {
    void update(Event event); // Subject pushes data
}

// Subject sends complete event data
observers.forEach(o -> o.update(event));
```

**Pull Model** (Observer requests data):
```java
interface Observer {
    void update(Subject subject); // Subject reference only
}

// Observer pulls data it needs
public void update(Subject subject) {
    Data data = subject.getState(); // Pull on-demand
}
```

**Trade-offs:**

| Aspect | Push Model | Pull Model |
|--------|------------|------------|
| **Bandwidth** | Higher (sends all data) | Lower (observer requests only needed data) |
| **Coupling** | Higher (observer must know data structure) | Lower (observer decides what to pull) |
| **Latency** | Lower (data ready immediately) | Higher (observer must request) |
| **Flexibility** | Lower (fixed data format) | Higher (observer pulls what it needs) |

### Scalability Strategies

**Horizontal Scaling:**
- Use distributed message brokers (Kafka, RabbitMQ)
- Observer instances can scale independently
- Subject publishes to broker, not directly to observers
- Consumer groups enable load balancing across observer instances

**Vertical Scaling:**
- Thread pools for concurrent notification processing
- Async notification to prevent blocking
- Batch notifications for efficiency

### Performance Bottlenecks

**1. Synchronous Notification Overhead:**
```java
// PROBLEM: Blocking iteration
public void notifyObservers() {
    for (Observer o : observers) {
        o.update(this); // Blocks if observer is slow
    }
}

// SOLUTION: Async notification
public void notifyObservers() {
    CompletableFuture.runAsync(() -> {
        observers.parallelStream()
            .forEach(o -> o.update(this));
    }, executorService);
}
```

**2. Observer Registration Lock Contention:**
```java
// PROBLEM: Synchronized blocks for all operations
private final List<Observer> observers = new ArrayList<>();

public synchronized void attach(Observer o) {
    observers.add(o);
}

public synchronized void notifyObservers() {
    // Lock held during entire notification cycle
}

// SOLUTION: Copy-on-write for read-heavy workloads
private final CopyOnWriteArrayList<Observer> observers = 
    new CopyOnWriteArrayList<>();

public void attach(Observer o) {
    observers.add(o); // No lock needed
}

public void notifyObservers() {
    observers.forEach(o -> o.update(this)); // Lock-free reads
}
```

**3. Memory Leaks from Forgotten Detachments:**
```java
// PROBLEM: Observer never detached
subject.attach(observer);
// ... observer goes out of scope but still registered

// SOLUTION: WeakReference for observers
private final List<WeakReference<Observer>> observers = 
    new ArrayList<>();

public void notifyObservers() {
    observers.removeIf(ref -> ref.get() == null); // Auto-cleanup
    observers.forEach(ref -> {
        Observer o = ref.get();
        if (o != null) o.update(this);
    });
}
```

### Consistency Models

**Strong Consistency** (Synchronous):
```java
// All observers updated before method returns
public void setState(State newState) {
    this.state = newState;
    notifyObservers(); // Blocks until all notified
}
```

**Eventual Consistency** (Asynchronous):
```java
// Observers updated eventually via message queue
public void setState(State newState) {
    this.state = newState;
    eventPublisher.publish(new StateChangedEvent(newState));
    // Returns immediately, observers notified asynchronously
}
```

### Failure Modes & Recovery Paths

**1. Observer Throws Exception:**
```java
// PROBLEM: One failing observer stops notification chain
public void notifyObservers() {
    for (Observer o : observers) {
        o.update(this); // If this throws, rest aren't notified
    }
}

// SOLUTION: Isolate observer failures
public void notifyObservers() {
    for (Observer o : observers) {
        try {
            o.update(this);
        } catch (Exception e) {
            logger.error("Observer {} failed", o, e);
            // Continue notifying other observers
        }
    }
}
```

**2. Subject Failure During Notification:**
```java
// SOLUTION: Transaction log for event replay
@Transactional
public void setState(State newState) {
    this.state = newState;
    eventLog.append(new StateChangedEvent(newState));
    try {
        notifyObservers();
    } catch (Exception e) {
        // Event logged, can retry notification later
        scheduleRetry(newState);
    }
}
```

**3. Network Partition (Distributed Systems):**
```java
// SOLUTION: Message queue with retry and dead-letter queue
public void notifyObservers(Event event) {
    try {
        messageQueue.publish(event);
    } catch (NetworkException e) {
        // Store in local buffer, retry later
        localBuffer.add(event);
        scheduleRetry();
    }
}
```

### Trade-offs at FAANG Scale

| Decision | Benefit | Cost | When to Use |
|----------|---------|------|-------------|
| **Synchronous** | Strong consistency, immediate feedback | Blocks caller, poor scalability | Critical operations, < 100 observers |
| **Asynchronous** | Non-blocking, high throughput | Eventual consistency | High volume, > 1000 observers |
| **Direct Notification** | Simple, low latency | Tight coupling, scaling issues | Single service, small scale |
| **Message Broker** | Decoupled, scalable, durable | Added complexity, cost | Distributed systems, high scale |
| **Push Model** | Fast delivery | Bandwidth overhead | Small payloads, few observers |
| **Pull Model** | Efficient, flexible | Added latency | Large payloads, many observers |

### Design Decisions at FAANG-Scale

**1. Event Delivery Guarantees:**
- **At-most-once**: Fire and forget (metrics, analytics)
- **At-least-once**: Retry until acknowledged (payments, orders)
- **Exactly-once**: Idempotent processing with deduplication (financial transactions)

**2. Event Ordering:**
- **No guarantee**: Independent events (user clicks)
- **Per-partition ordering**: Events for same entity (user actions)
- **Global ordering**: Sequential events (audit logs)

**3. Observer Discovery:**
- **Static registration**: Compile-time wiring (Spring @EventListener)
- **Dynamic registration**: Runtime subscription (WebSocket clients)
- **Service discovery**: Auto-registration via registry (Consul, Eureka)

**4. Backpressure Handling:**
```java
// Reactive Streams pattern
public interface Observer<T> extends Subscriber<T> {
    void onNext(T item);
    void onError(Throwable error);
    void onComplete();
    
    // Backpressure signal
    void onSubscribe(Subscription subscription);
}

// Observer controls flow
subscription.request(100); // Request next 100 events
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Example: Real-Time Notification System (Twitter/Facebook-like)

**Assumptions:**
- 100M daily active users
- Average 10 events/user/day (likes, comments, follows)
- 1B events/day total
- Peak traffic: 3x average
- Average 100 followers per user (100 observers per event)
- 10% of events trigger notifications

**Event Generation Rate:**
```
Average: 1B / (24 * 3600) ≈ 11,600 events/sec
Peak: 11,600 * 3 = 34,800 events/sec
```

**Notification Fanout:**
```
Events requiring notification: 11,600 * 0.1 = 1,160 events/sec
Average fanout: 100 notifications per event

Total notifications: 1,160 * 100 = 116,000 notifications/sec
Peak notifications: 348,000 notifications/sec
```

**Processing Requirements:**
```
Per notification processing: 5ms (lookup + format + send)
CPU time: 348,000 * 5ms = 1,740 CPU-seconds/sec

Required CPU cores: 1,740 cores
With 50% overhead: ~3,500 cores
Typical server: 32 cores

Required servers: 3,500 / 32 ≈ 110 servers
```

**Network Bandwidth:**
```
Notification payload: 1KB
Peak bandwidth: 348,000 * 1KB = 348 MB/sec = 2.78 Gbps

With protocol overhead (×1.5): 4.17 Gbps
```

**Storage:**
```
Event log storage: 1B events/day * 1KB = 1TB/day
Retention 90 days: 90TB
With replication (3x): 270TB

Notification delivery log: 116K/sec * 86400 = 10B/day
Log size: 10B * 500 bytes = 5TB/day
```

**Latency Budget:**
```
Target: < 1 second from event to notification delivery

- Event ingestion: 50ms
- Observer lookup: 100ms
- Notification formatting: 50ms
- Queue processing: 300ms
- Network delivery: 400ms
- Buffer: 100ms
━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 1000ms (1 second)
```

**Why These Numbers Matter:**
- Fanout amplification can overwhelm system (1 event → 100+ notifications)
- Async processing mandatory at this scale
- Message queue required to handle burst traffic
- Geographic distribution needed for latency
- Observer count directly impacts system capacity

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Observer Registration Storage

**In-Memory Registration** (Single Service):
```java
@Service
public class EventPublisher {
    // Fast lookup, but not persistent across restarts
    private final ConcurrentHashMap<String, Set<Observer>> observers = 
        new ConcurrentHashMap<>();
    
    public void subscribe(String eventType, Observer observer) {
        observers.computeIfAbsent(eventType, k -> ConcurrentHashMap.newKeySet())
                 .add(observer);
    }
}
```

**Database-Backed Subscriptions** (Distributed):

**Schema:**
```sql
-- Subscription registry
CREATE TABLE event_subscriptions (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    delivery_method VARCHAR(50), -- email, push, sms, webhook
    endpoint TEXT,               -- where to send notification
    filters JSONB,               -- subscription filters
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    UNIQUE(user_id, event_type, delivery_method)
);

CREATE INDEX idx_event_type_active ON event_subscriptions(event_type, active);
CREATE INDEX idx_user_active ON event_subscriptions(user_id, active);

-- Event log for replay
CREATE TABLE event_log (
    id BIGINT PRIMARY KEY,
    event_id UUID UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    published_at TIMESTAMP NOT NULL,
    publisher_id VARCHAR(100)
) PARTITION BY RANGE (published_at);

CREATE INDEX idx_event_type_time ON event_log(event_type, published_at);

-- Notification delivery tracking
CREATE TABLE notification_deliveries (
    id BIGINT PRIMARY KEY,
    event_id UUID NOT NULL,
    subscription_id BIGINT NOT NULL,
    status VARCHAR(50), -- pending, sent, delivered, failed
    attempted_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error_message TEXT,
    retry_count INT DEFAULT 0
) PARTITION BY RANGE (attempted_at);

CREATE INDEX idx_status_attempted ON notification_deliveries(status, attempted_at);
```

**Caching Strategy:**
```java
@Service
public class CachedSubscriptionService {
    private final LoadingCache<String, Set<Subscription>> subscriptionCache;
    
    public CachedSubscriptionService(SubscriptionRepository repo) {
        this.subscriptionCache = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .refreshAfterWrite(1, TimeUnit.MINUTES)
            .build(eventType -> repo.findActiveByEventType(eventType));
    }
    
    public Set<Subscription> getSubscribers(String eventType) {
        return subscriptionCache.get(eventType);
    }
}
```

### Event Store (For Event Sourcing)

```sql
-- Immutable event store
CREATE TABLE event_store (
    sequence_number BIGSERIAL PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    metadata JSONB,
    version INT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aggregate ON event_store(aggregate_id, version);
CREATE INDEX idx_timestamp ON event_store(timestamp);

-- Snapshot for performance
CREATE TABLE event_snapshots (
    aggregate_id UUID PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL,
    version INT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

### Message Queue Design

**Topic Structure (Kafka-like):**
```
topic: user-events
  partition-0: user_id % 10 == 0
  partition-1: user_id % 10 == 1
  ...
  partition-9: user_id % 10 == 9

topic: notification-events
  partition-0: critical notifications
  partition-1: high priority
  partition-2: normal priority
  partition-3: low priority
```

**Consumer Group Strategy:**
```yaml
consumer-groups:
  email-delivery:
    instances: 20
    max-poll: 100
    
  push-notification:
    instances: 50
    max-poll: 500
    
  analytics:
    instances: 5
    max-poll: 1000
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Horizontal Scaling with Message Brokers

**Architecture:**
```
┌──────────────┐
│   Subject    │
│  (Publisher) │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Message Broker  │
│  (Kafka/RabbitMQ)│
└──────┬───────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
  │Observer1│   │Observer2│   │Observer3│   │Observer4│
  │Instance1│   │Instance2│   │Instance3│   │Instance4│
  └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

**Benefits:**
- Publishers and subscribers scale independently
- Message queue buffers burst traffic
- Automatic load balancing across consumer instances
- Durability: messages persisted until acknowledged

### Asynchronous Notification

**Spring Boot Implementation:**
```java
@Service
public class AsyncEventPublisher {
    private final ApplicationEventPublisher eventPublisher;
    
    @Async("notificationExecutor")
    public void publishEvent(DomainEvent event) {
        eventPublisher.publishEvent(event);
    }
}

@Configuration
public class AsyncConfig {
    @Bean(name = "notificationExecutor")
    public Executor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("notif-");
        executor.setRejectedExecutionHandler(
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
        executor.initialize();
        return executor;
    }
}
```

### Fanout Optimization

**Problem: N+1 Query Problem**
```java
// BAD: One query per observer
public void notifyObservers(Event event) {
    Set<Observer> observers = getObservers(event.getType());
    for (Observer o : observers) {
        User user = userRepository.findById(o.getUserId()); // N queries!
        sendNotification(user, event);
    }
}

// GOOD: Batch loading
public void notifyObservers(Event event) {
    Set<Observer> observers = getObservers(event.getType());
    Set<Long> userIds = observers.stream()
        .map(Observer::getUserId)
        .collect(Collectors.toSet());
    
    // Single query for all users
    Map<Long, User> users = userRepository.findAllById(userIds)
        .stream()
        .collect(Collectors.toMap(User::getId, u -> u));
    
    observers.forEach(o -> {
        User user = users.get(o.getUserId());
        sendNotification(user, event);
    });
}
```

### Circuit Breaker for Observers

```java
@Component
public class ResilientObserver implements Observer {
    private final CircuitBreaker circuitBreaker;
    
    public ResilientObserver() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .slidingWindowSize(10)
            .build();
        
        this.circuitBreaker = CircuitBreaker.of("observer", config);
    }
    
    @Override
    public void update(Event event) {
        Try.ofSupplier(CircuitBreaker.decorateSupplier(
            circuitBreaker, 
            () -> processEvent(event)
        )).recover(throwable -> {
            logger.error("Circuit breaker open or error", throwable);
            return fallbackProcessing(event);
        });
    }
}
```

### Retry Strategy with Exponential Backoff

```java
@Service
public class RetryableNotificationService {
    
    @Retryable(
        value = {TransientException.class},
        maxAttempts = 5,
        backoff = @Backoff(
            delay = 1000,
            multiplier = 2,
            maxDelay = 30000
        )
    )
    public void sendNotification(Notification notification) {
        // Attempt to send
        notificationClient.send(notification);
    }
    
    @Recover
    public void recover(TransientException e, Notification notification) {
        // After all retries failed, send to DLQ
        deadLetterQueue.send(notification);
        logger.error("Failed to send notification after retries", e);
    }
}
```

### Dead Letter Queue (DLQ)

```java
@Service
public class NotificationProcessor {
    
    @KafkaListener(topics = "notifications")
    public void processNotification(Notification notification) {
        try {
            deliveryService.deliver(notification);
        } catch (RecoverableException e) {
            // Retry with exponential backoff
            retryService.scheduleRetry(notification, e);
        } catch (UnrecoverableException e) {
            // Send to DLQ for manual investigation
            dlqProducer.send("notifications-dlq", notification);
            alertService.alert("Unrecoverable notification error", e);
        }
    }
}
```

### Rate Limiting for Notification Delivery

```java
@Service
public class RateLimitedNotifier {
    private final Map<String, RateLimiter> rateLimiters = new ConcurrentHashMap<>();
    
    public void notify(User user, Notification notification) {
        // Per-user rate limiting
        RateLimiter limiter = rateLimiters.computeIfAbsent(
            user.getId().toString(),
            k -> RateLimiter.create(10.0) // 10 notifications/second
        );
        
        if (limiter.tryAcquire()) {
            deliveryService.send(user, notification);
        } else {
            // Queue for later delivery
            delayedQueue.add(new DelayedNotification(user, notification));
            logger.warn("Rate limit exceeded for user {}", user.getId());
        }
    }
}
```

### Graceful Degradation

```java
@Service
public class DegradableNotificationService {
    
    public void notifyAll(Event event, List<Observer> observers) {
        if (isSystemOverloaded()) {
            // Degrade to priority notifications only
            observers = filterPriorityObservers(observers);
        }
        
        if (isSystemCritical()) {
            // Only critical notifications
            observers = filterCriticalObservers(observers);
        }
        
        notifyObservers(event, observers);
    }
    
    private boolean isSystemOverloaded() {
        return metrics.getCpuUsage() > 80 || 
               metrics.getQueueDepth() > 10000;
    }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Webhook Security (Observer as External Service)

```java
@Service
public class SecureWebhookNotifier implements Observer {
    
    @Override
    public void update(Event event) {
        Subscription subscription = getSubscription(event);
        
        // Generate HMAC signature
        String signature = generateHmacSignature(
            event, 
            subscription.getSecretKey()
        );
        
        // Send webhook with signature
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Webhook-Signature", signature);
        headers.set("X-Event-Type", event.getType());
        headers.set("X-Delivery-ID", UUID.randomUUID().toString());
        
        restTemplate.postForEntity(
            subscription.getWebhookUrl(),
            new HttpEntity<>(event, headers),
            Void.class
        );
    }
    
    private String generateHmacSignature(Event event, String secret) {
        Mac hmac = Mac.getInstance("HmacSHA256");
        hmac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
        byte[] signature = hmac.doFinal(event.toJson().getBytes());
        return Base64.getEncoder().encodeToString(signature);
    }
}
```

**Webhook Verification (Receiver Side):**
```java
@RestController
@RequestMapping("/webhooks")
public class WebhookController {
    
    @PostMapping("/events")
    public ResponseEntity<Void> handleEvent(
        @RequestBody Event event,
        @RequestHeader("X-Webhook-Signature") String signature
    ) {
        // Verify signature
        String expectedSignature = generateHmacSignature(event, SECRET_KEY);
        if (!MessageDigest.isEqual(
            signature.getBytes(), 
            expectedSignature.getBytes()
        )) {
            throw new UnauthorizedException("Invalid signature");
        }
        
        // Process event
        eventProcessor.process(event);
        return ResponseEntity.ok().build();
    }
}
```

### Authorization for Subscriptions

```java
@Service
public class AuthorizedSubscriptionService {
    
    public void subscribe(User user, String eventType, Observer observer) {
        // Check permissions
        if (!authService.canSubscribeTo(user, eventType)) {
            throw new ForbiddenException(
                "User not authorized to subscribe to " + eventType
            );
        }
        
        // Validate subscription quota
        long currentSubscriptions = subscriptionRepo.countByUser(user);
        if (currentSubscriptions >= user.getSubscriptionLimit()) {
            throw new QuotaExceededException("Subscription limit reached");
        }
        
        // Register subscription
        subscriptionRegistry.register(eventType, observer, user);
    }
}
```

### Event Filtering and Privacy

```java
public interface FilterableObserver extends Observer {
    boolean shouldReceive(Event event);
}

@Component
public class PrivacyAwareObserver implements FilterableObserver {
    
    @Override
    public boolean shouldReceive(Event event) {
        // Check privacy settings
        User eventOwner = event.getOwner();
        User subscriber = this.getUser();
        
        // Don't send private events to non-followers
        if (event.isPrivate() && !eventOwner.hasFollower(subscriber)) {
            return false;
        }
        
        // Check blocked users
        if (eventOwner.hasBlocked(subscriber)) {
            return false;
        }
        
        return true;
    }
    
    @Override
    public void update(Event event) {
        if (shouldReceive(event)) {
            processEvent(event);
        }
    }
}
```

### Audit Trail for Event Delivery

```java
@Aspect
@Component
public class EventAuditAspect {
    
    @Around("@annotation(Auditable)")
    public Object auditEventDelivery(ProceedingJoinPoint joinPoint) throws Throwable {
        Event event = (Event) joinPoint.getArgs()[0];
        Observer observer = (Observer) joinPoint.getThis();
        
        AuditEntry entry = AuditEntry.builder()
            .eventType(event.getType())
            .eventId(event.getId())
            .observerId(observer.getId())
            .timestamp(Instant.now())
            .build();
        
        try {
            Object result = joinPoint.proceed();
            entry.setStatus("SUCCESS");
            return result;
        } catch (Exception e) {
            entry.setStatus("FAILED");
            entry.setError(e.getMessage());
            throw e;
        } finally {
            auditRepository.save(entry);
        }
    }
}
```

### Rate Limiting per Event Type

```java
@Service
public class EventRateLimiter {
    private final Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();
    
    @Autowired
    public EventRateLimiter(EventRateLimitConfig config) {
        config.getLimits().forEach((eventType, rps) -> {
            limiters.put(eventType, RateLimiter.create(rps));
        });
    }
    
    public boolean allowEvent(Event event) {
        RateLimiter limiter = limiters.get(event.getType());
        if (limiter == null) {
            return true; // No limit configured
        }
        
        if (!limiter.tryAcquire()) {
            logger.warn("Rate limit exceeded for event type: {}", event.getType());
            metrics.increment("event.rate_limited", "type", event.getType());
            return false;
        }
        
        return true;
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Social Media Activity Feed (Facebook/Twitter)

**Problem:**
- User posts content → notify all followers
- Average user: 500 followers
- High-profile users: 10M+ followers
- Need real-time delivery (< 1 second)
- Must handle celebrity "thundering herd" problem

**Implementation:**

```java
// Subject (Post Service)
@Service
public class PostService {
    private final ApplicationEventPublisher eventPublisher;
    private final FanoutService fanoutService;
    
    public Post createPost(User author, String content) {
        Post post = postRepository.save(new Post(author, content));
        
        // Publish event
        PostCreatedEvent event = new PostCreatedEvent(post, author);
        
        // Smart fanout based on follower count
        if (author.getFollowerCount() < 10000) {
            // Immediate fanout for regular users
            fanoutService.fanoutImmediate(event);
        } else {
            // Async batch fanout for celebrities
            fanoutService.fanoutAsync(event);
        }
        
        return post;
    }
}

// Observer (Feed Builder)
@Component
public class FeedBuilderObserver {
    
    @EventListener
    @Async
    public void handlePostCreated(PostCreatedEvent event) {
        // Get all followers
        List<User> followers = followerService.getFollowers(event.getAuthor());
        
        // Write to each follower's feed (fanout-on-write)
        followers.parallelStream().forEach(follower -> {
            feedRepository.addToFeed(follower.getId(), event.getPost());
        });
    }
}

// Alternative: Fanout-on-read for celebrities
@Component
public class CelebrityFeedObserver {
    
    @EventListener
    @Async
    public void handleCelebrityPost(PostCreatedEvent event) {
        if (event.getAuthor().isCelebrity()) {
            // Only store post, don't fanout
            celebrityPostCache.add(event.getPost());
            
            // Followers will pull from cache when reading feed
        }
    }
}
```

**Evolution at Scale:**
1. **Phase 1** (1K users): Direct fanout to all followers
2. **Phase 2** (1M users): Async fanout via message queue
3. **Phase 3** (100M users): Hybrid approach (fanout-write for regular, fanout-read for celebrities)
4. **Phase 4** (1B users): Geo-distributed event streams with regional processing

**Metrics:**
- 10B posts/day
- Average fanout: 500 notifications per post
- Celebrity post: 10M+ fanout
- Delivery latency: p50 = 200ms, p99 = 2s

### Example 2: Stock Trading Platform (Bloomberg Terminal-like)

**Problem:**
- Real-time stock price updates
- Thousands of symbols
- Millions of subscribers
- Sub-millisecond latency requirement
- Must handle market open surge

**Implementation:**

```java
// Subject (Market Data Feed)
@Service
public class MarketDataPublisher {
    private final ConcurrentHashMap<String, Set<PriceObserver>> observers = 
        new ConcurrentHashMap<>();
    
    public void subscribe(String symbol, PriceObserver observer) {
        observers.computeIfAbsent(symbol, k -> ConcurrentHashMap.newKeySet())
                 .add(observer);
    }
    
    public void unsubscribe(String symbol, PriceObserver observer) {
        Set<PriceObserver> symbolObservers = observers.get(symbol);
        if (symbolObservers != null) {
            symbolObservers.remove(observer);
        }
    }
    
    // Called by market data feed
    public void publishPriceUpdate(String symbol, Price price) {
        Set<PriceObserver> symbolObservers = observers.get(symbol);
        if (symbolObservers != null) {
            // Direct notification for low-latency
            symbolObservers.forEach(o -> o.onPriceUpdate(symbol, price));
        }
    }
}

// Observer (Trading Algorithm)
@Component
public class TradingAlgorithmObserver implements PriceObserver {
    
    @Override
    public void onPriceUpdate(String symbol, Price price) {
        // Ultra-low latency processing
        Position position = portfolioService.getPosition(symbol);
        
        if (shouldTriggerOrder(position, price)) {
            orderService.placeOrder(
                new Order(symbol, calculateQuantity(position, price))
            );
        }
    }
    
    private boolean shouldTriggerOrder(Position position, Price price) {
        // Trading logic
        return price.getValue() < position.getTargetPrice();
    }
}

// Observer (WebSocket Client)
@Component
public class WebSocketPriceObserver implements PriceObserver {
    private final SimpMessagingTemplate messagingTemplate;
    
    @Override
    public void onPriceUpdate(String symbol, Price price) {
        // Push to WebSocket clients
        messagingTemplate.convertAndSend(
            "/topic/prices/" + symbol,
            new PriceUpdateMessage(symbol, price)
        );
    }
}
```

**Performance Characteristics:**
- 10M price updates/second during market hours
- Average 100 observers per symbol
- 1B notifications/second
- Latency target: < 1ms from exchange to subscriber
- Memory: 10GB for observer registry

**Optimizations:**
- Lock-free data structures (ConcurrentHashMap)
- Direct method invocation (no message queue overhead)
- Thread affinity for CPU cache locality
- Pre-allocated object pools

### Example 3: System Monitoring & Alerting (Datadog/New Relic)

**Problem:**
- Monitor thousands of metrics
- Multiple alert channels (email, SMS, PagerDuty, Slack)
- Complex alert rules (threshold, anomaly, composite)
- Must prevent alert fatigue

**Implementation:**

```java
// Subject (Metrics Collector)
@Service
public class MetricsCollector {
    private final List<MetricObserver> observers = new CopyOnWriteArrayList<>();
    
    public void registerObserver(MetricObserver observer) {
        observers.add(observer);
    }
    
    @Scheduled(fixedRate = 1000) // Every second
    public void collectMetrics() {
        Map<String, Metric> metrics = metricsSource.collect();
        
        metrics.forEach((name, metric) -> {
            MetricEvent event = new MetricEvent(name, metric);
            notifyObservers(event);
        });
    }
    
    private void notifyObservers(MetricEvent event) {
        observers.parallelStream()
            .filter(o -> o.interestedIn(event))
            .forEach(o -> o.onMetric(event));
    }
}

// Observer (Alert Rule Engine)
@Component
public class AlertRuleObserver implements MetricObserver {
    private final Map<String, AlertRule> rules = new ConcurrentHashMap<>();
    private final AlertDispatcher dispatcher;
    
    @Override
    public boolean interestedIn(MetricEvent event) {
        return rules.containsKey(event.getMetricName());
    }
    
    @Override
    public void onMetric(MetricEvent event) {
        AlertRule rule = rules.get(event.getMetricName());
        
        if (rule.isViolated(event.getValue())) {
            // Check if alert should be fired (debouncing)
            if (shouldFireAlert(rule, event)) {
                Alert alert = rule.createAlert(event);
                dispatcher.dispatch(alert);
            }
        }
    }
    
    private boolean shouldFireAlert(AlertRule rule, MetricEvent event) {
        // Prevent alert fatigue
        Instant lastAlert = lastAlertTime.get(rule.getId());
        if (lastAlert != null && 
            Duration.between(lastAlert, Instant.now()).toMinutes() < 15) {
            return false; // Cooldown period
        }
        
        // Require multiple consecutive violations
        int violations = consecutiveViolations.computeIfAbsent(
            rule.getId(), 
            k -> new AtomicInteger()
        ).incrementAndGet();
        
        return violations >= rule.getMinConsecutiveViolations();
    }
}

// Observer (Metrics Dashboard)
@Component
public class DashboardObserver implements MetricObserver {
    private final SimpMessagingTemplate messagingTemplate;
    
    // Sample metrics to reduce WebSocket traffic
    private final LoadingCache<String, Metric> sampledMetrics = 
        Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.SECONDS)
            .build(key -> null);
    
    @Override
    public void onMetric(MetricEvent event) {
        // Sample to 1 update per 5 seconds per metric
        Metric previous = sampledMetrics.getIfPresent(event.getMetricName());
        if (previous == null) {
            sampledMetrics.put(event.getMetricName(), event.getMetric());
            messagingTemplate.convertAndSend(
                "/topic/metrics",
                event
            );
        }
    }
}
```

**Scale Characteristics:**
- 100K metrics/second ingested
- 1000 alert rules configured
- 10K active dashboard connections
- Alert delivery: < 30 seconds from violation

### Example 4: E-commerce Order Processing (Amazon-like)

**Problem:**
- Order placed → notify multiple systems (inventory, payment, shipping, analytics)
- Each system processes independently
- Eventual consistency acceptable
- Must handle partial failures

**Implementation:**

```java
// Subject (Order Service)
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public Order placeOrder(OrderRequest request) {
        // Create order
        Order order = orderRepository.save(new Order(request));
        
        // Publish event (transactional outbox pattern)
        OrderPlacedEvent event = new OrderPlacedEvent(order);
        outboxRepository.save(new OutboxEvent(event));
        
        // Event will be published by outbox processor
        return order;
    }
}

// Outbox Processor (ensures at-least-once delivery)
@Service
public class OutboxProcessor {
    
    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void processOutbox() {
        List<OutboxEvent> events = outboxRepository.findPending(100);
        
        events.forEach(outboxEvent -> {
            try {
                eventPublisher.publish(outboxEvent.getPayload());
                outboxRepository.markProcessed(outboxEvent);
            } catch (Exception e) {
                logger.error("Failed to publish event", e);
                outboxRepository.incrementRetryCount(outboxEvent);
            }
        });
    }
}

// Observer (Inventory Service)
@Component
public class InventoryObserver {
    
    @KafkaListener(topics = "order-placed")
    @Transactional
    public void handleOrderPlaced(OrderPlacedEvent event) {
        try {
            // Reserve inventory
            inventoryService.reserve(event.getOrder().getItems());
            
            // Publish inventory reserved event
            eventPublisher.publish(new InventoryReservedEvent(event.getOrder()));
        } catch (InsufficientInventoryException e) {
            // Publish compensation event
            eventPublisher.publish(new OrderCancelledEvent(
                event.getOrder(), 
                "Insufficient inventory"
            ));
        }
    }
}

// Observer (Payment Service)
@Component
public class PaymentObserver {
    
    @KafkaListener(topics = "inventory-reserved")
    public void handleInventoryReserved(InventoryReservedEvent event) {
        try {
            paymentService.charge(event.getOrder());
            eventPublisher.publish(new PaymentSucceededEvent(event.getOrder()));
        } catch (PaymentFailedException e) {
            // Compensating transaction
            inventoryService.release(event.getOrder().getItems());
            eventPublisher.publish(new OrderCancelledEvent(
                event.getOrder(), 
                "Payment failed"
            ));
        }
    }
}

// Observer (Analytics Service)
@Component
public class AnalyticsObserver {
    
    @KafkaListener(topics = "order-placed")
    @Async
    public void handleOrderPlaced(OrderPlacedEvent event) {
        // Best-effort analytics (failures don't affect order processing)
        try {
            analyticsService.trackOrder(event.getOrder());
        } catch (Exception e) {
            logger.warn("Analytics tracking failed", e);
            // Don't propagate error
        }
    }
}
```

**Saga Pattern with Observer:**
```
Order Placed
    ↓
Inventory Reserved ← Success → Payment Processed ← Success → Order Confirmed
    ↓ Failure                      ↓ Failure
Order Cancelled                 Inventory Released → Order Cancelled
```

**Characteristics:**
- Eventual consistency via event chain
- Compensating transactions for failures
- Idempotent event handlers
- At-least-once delivery with deduplication

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Crisp Interview Answer

**"Explain the Observer Pattern":**

*"The Observer Pattern is a behavioral design pattern that establishes a one-to-many dependency between objects. When a Subject changes state, all registered Observers are automatically notified.*

*I've used this extensively in event-driven systems. For example, in a social media platform, when a user posts content, we need to notify followers, update feeds, trigger analytics, and potentially send push notifications. Instead of hard-coding these dependencies, the PostService acts as the Subject and publishes a PostCreatedEvent. Multiple observers—FeedBuilder, NotificationService, AnalyticsService—subscribe to this event and react independently.*

*The key benefits are loose coupling and extensibility. I can add new observers without modifying the subject. It's also the foundation for reactive systems and message-driven architectures.*

*At scale, I use message brokers like Kafka as the Subject, enabling distributed observers across multiple services. The main considerations are async processing to prevent blocking, error isolation so one failing observer doesn't affect others, and delivery guarantees—at-least-once with idempotent observers for critical flows.*

*For performance, I use async notification with thread pools, batch observer lookups to avoid N+1 queries, and caching for subscription registries. In production, we handle fanout scenarios where one event triggers thousands of notifications by using message queues with consumer groups for load balancing."*

### Common Follow-Up Questions

**Q1: "What's the difference between Observer and Pub-Sub?"**

| Aspect | Observer Pattern | Pub-Sub Pattern |
|--------|------------------|-----------------|
| **Coupling** | Subject knows observers | Publisher doesn't know subscribers |
| **Communication** | Direct method calls | Via message broker/event bus |
| **Synchronous** | Can be sync or async | Typically async |
| **Scalability** | Limited (in-process) | High (distributed) |
| **Filtering** | Observer decides | Broker can filter (topic-based) |
| **Example** | GUI event listeners | Kafka, RabbitMQ |

**Answer:**
*"Observer is typically in-process with direct method calls, while Pub-Sub uses a message broker as an intermediary. Observer is simpler but doesn't scale across services. In practice, I use Observer within a service and Pub-Sub between services. For example, Spring's @EventListener is Observer pattern, while publishing to Kafka is Pub-Sub."*

**Q2: "How do you prevent memory leaks in Observer pattern?"**

```java
// PROBLEM: Observer never unregistered
public class UserProfileView implements Observer {
    public UserProfileView(UserService subject) {
        subject.attach(this); // Registers observer
        // But never detaches!
    }
    // When view is closed, observer is still registered
}

// SOLUTION 1: Explicit cleanup
public class UserProfileView implements Observer, Closeable {
    private final UserService subject;
    
    public UserProfileView(UserService subject) {
        this.subject = subject;
        subject.attach(this);
    }
    
    @Override
    public void close() {
        subject.detach(this);
    }
}

// SOLUTION 2: Weak references
public class Subject {
    private final List<WeakReference<Observer>> observers = new ArrayList<>();
    
    public void attach(Observer observer) {
        observers.add(new WeakReference<>(observer));
    }
    
    public void notifyObservers() {
        observers.removeIf(ref -> ref.get() == null); // Auto-cleanup
        observers.forEach(ref -> {
            Observer o = ref.get();
            if (o != null) o.update(this);
        });
    }
}

// SOLUTION 3: Try-with-resources
try (Subscription sub = subject.subscribe(observer)) {
    // Observer active here
} // Automatically unsubscribed
```

**Answer:**
*"Memory leaks happen when observers aren't detached. I use three strategies: explicit cleanup in close() methods, WeakReference for observers so GC can collect them, or subscription tokens that auto-unregister when disposed. In Spring, @EventListener observers are managed by the container, so this isn't an issue."*

**Q3: "How do you handle slow observers?"**

```java
// PROBLEM: One slow observer blocks all others
public void notifyObservers() {
    for (Observer o : observers) {
        o.update(this); // If o is slow, others wait
    }
}

// SOLUTION 1: Async notification
@Async
public void notifyObservers() {
    observers.parallelStream().forEach(o -> {
        try {
            o.update(this);
        } catch (Exception e) {
            logger.error("Observer {} failed", o, e);
        }
    });
}

// SOLUTION 2: Timeout per observer
public void notifyObservers() {
    ExecutorService executor = Executors.newCachedThreadPool();
    
    observers.forEach(o -> {
        Future<?> future = executor.submit(() -> o.update(this));
        try {
            future.get(500, TimeUnit.MILLISECONDS); // Timeout
        } catch (TimeoutException e) {
            future.cancel(true);
            logger.warn("Observer {} timed out", o);
        }
    });
}

// SOLUTION 3: Priority-based processing
public void notifyObservers() {
    // Critical observers first (sync)
    criticalObservers.forEach(o -> o.update(this));
    
    // Non-critical observers async
    CompletableFuture.runAsync(() -> 
        normalObservers.forEach(o -> o.update(this))
    );
}
```

**Answer:**
*"Slow observers can block the subject. I use async notification with thread pools so observers run in parallel. For time-critical paths, I add timeouts per observer. I also separate critical observers (processed synchronously) from non-critical ones (async). In distributed systems, I use message queues where each observer consumes at its own pace."*

**Q4: "How do you test Observer pattern?"**

```java
// Test subject in isolation
@Test
public void testSubjectNotifiesObservers() {
    Subject subject = new Subject();
    Observer mockObserver = mock(Observer.class);
    
    subject.attach(mockObserver);
    subject.setState("new state");
    
    verify(mockObserver).update(subject);
}

// Test observer in isolation
@Test
public void testObserverReactsToEvent() {
    FeedBuilderObserver observer = new FeedBuilderObserver(feedRepo);
    PostCreatedEvent event = new PostCreatedEvent(post);
    
    observer.handlePostCreated(event);
    
    verify(feedRepo).addToFeed(any(), eq(post));
}

// Integration test with real observers
@Test
@SpringBootTest
public void testEventPropagation() {
    // Publish event
    eventPublisher.publishEvent(new OrderPlacedEvent(order));
    
    // Wait for async processing
    await().atMost(5, SECONDS).until(() -> 
        inventoryService.isReserved(order.getItems())
    );
    
    // Verify all observers executed
    assertTrue(inventoryService.isReserved(order.getItems()));
    assertTrue(paymentService.isCharged(order));
    assertTrue(analyticsService.isTracked(order));
}
```

**Answer:**
*"I test subject and observers independently using mocks. For subject, I verify it calls update() on registered observers. For observers, I test their logic in isolation with test events. For integration tests, I publish events and verify the expected side effects, using await() for async observers. I also test failure scenarios—what happens if an observer throws an exception."*

**Q5: "When would you NOT use Observer pattern?"**

**Avoid Observer Pattern When:**
- Only one observer ever needed → Just call directly
- Synchronous response required → Use command pattern or direct call
- Complex coordination needed → Use mediator pattern
- Performance critical path → Direct invocation faster than notification
- Observer needs to return values → Observer is notification-only
- Guaranteed delivery critical → Use message queue with acknowledgments

**Example:**
```java
// BAD: Observer for single observer
public class UserService {
    private Observer profileUpdater;
    
    public void updateUser(User user) {
        // Just call directly!
        profileUpdater.update(user);
    }
}

// GOOD: Direct call
public class UserService {
    private final ProfileService profileService;
    
    public void updateUser(User user) {
        profileService.updateProfile(user);
    }
}
```

**Q6: "How does Observer pattern scale in microservices?"**

**Answer:**
*"In microservices, I don't use in-process Observer—I use event-driven architecture with message brokers. Each service publishes domain events to Kafka, and other services subscribe to topics they care about.*

*For example, OrderService publishes OrderPlaced events to Kafka. InventoryService, PaymentService, and NotificationService each consume this event independently. They scale separately—I can have 10 inventory consumer instances and 50 notification consumer instances based on load.*

*The key is making consumers idempotent since Kafka provides at-least-once delivery. I use unique event IDs and check for duplicates before processing. Consumer groups provide load balancing—Kafka ensures each event is processed by only one instance in a consumer group.*

*For cross-region, I use Kafka's MirrorMaker to replicate events, ensuring eventual consistency globally. Monitoring is crucial—I track consumer lag to detect slow or failing observers."*

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Classic Observer Pattern UML

```
┌────────────────────────┐
│      <<interface>>     │
│        Subject         │
│                        │
│  + attach(Observer)    │
│  + detach(Observer)    │
│  + notify()            │
└───────────▲────────────┘
            │
            │implements
            │
┌───────────┴────────────┐
│    ConcreteSubject     │
│                        │
│  - state: State        │
│  - observers: List     │
│                        │
│  + getState(): State   │
│  + setState(State)     │
│  + notify()            │
└────────────────────────┘
            │
            │notifies
            │
            ▼
┌────────────────────────┐
│    <<interface>>       │
│       Observer         │
│                        │
│  + update(Subject)     │
└───────────▲────────────┘
            │
            │implements
            │
     ┌──────┴─────────┐
     │                │
┌────┴────────┐ ┌────┴────────┐
│ConcreteObsA │ │ConcreteObsB │
│             │ │             │
│ + update()  │ │ + update()  │
└─────────────┘ └─────────────┘
```

### Sequence Diagram: Event Flow

```
Subject    Observer1   Observer2   Observer3
   │           │           │           │
   │─setState()│           │           │
   │           │           │           │
   │─notify()──┤           │           │
   │           │           │           │
   │─update()──▶           │           │
   │           │           │           │
   │           ├─process───│           │
   │           │           │           │
   │◀──────────┘           │           │
   │                       │           │
   │─update()──────────────▶           │
   │                       │           │
   │                       ├─process───│
   │                       │           │
   │◀──────────────────────┘           │
   │                                   │
   │─update()──────────────────────────▶
   │                                   │
   │                                   ├─process()
   │                                   │
   │◀──────────────────────────────────┘
   │
   │ (all observers notified)
   ▼
```

### Spring Boot Event-Driven Implementation

```java
// ===== 1. Define Event =====
public class OrderPlacedEvent {
    private final Order order;
    private final Instant timestamp;
    
    public OrderPlacedEvent(Order order) {
        this.order = order;
        this.timestamp = Instant.now();
    }
    
    // Getters
}

// ===== 2. Subject (Publisher) =====
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public Order placeOrder(OrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        
        // Publish event
        eventPublisher.publishEvent(new OrderPlacedEvent(order));
        
        return order;
    }
}

// ===== 3. Observers (Listeners) =====

// Observer 1: Inventory Management
@Component
public class InventoryEventListener {
    
    @EventListener
    @Async
    public void handleOrderPlaced(OrderPlacedEvent event) {
        logger.info("Reserving inventory for order: {}", event.getOrder().getId());
        inventoryService.reserve(event.getOrder().getItems());
    }
}

// Observer 2: Email Notification
@Component
public class EmailNotificationListener {
    
    @EventListener
    @Async
    public void handleOrderPlaced(OrderPlacedEvent event) {
        logger.info("Sending confirmation email for order: {}", event.getOrder().getId());
        emailService.sendOrderConfirmation(event.getOrder());
    }
}

// Observer 3: Analytics
@Component
public class AnalyticsEventListener {
    
    @EventListener
    @Async
    public void handleOrderPlaced(OrderPlacedEvent event) {
        logger.info("Tracking order analytics: {}", event.getOrder().getId());
        analyticsService.trackOrder(event.getOrder());
    }
}

// Observer 4: Conditional Observer
@Component
public class LoyaltyPointsListener {
    
    @EventListener
    @Async
    public void handleOrderPlaced(OrderPlacedEvent event) {
        Order order = event.getOrder();
        
        // Conditional processing
        if (order.getTotal().compareTo(new BigDecimal("100")) > 0) {
            loyaltyService.awardPoints(order.getCustomer(), calculatePoints(order));
        }
    }
}

// ===== 4. Async Configuration =====
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean(name = "eventExecutor")
    public Executor eventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("event-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
```

### Distributed Observer with Kafka

```java
// ===== Publisher Service =====
@Service
public class OrderPublisher {
    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;
    
    public void publishOrderPlaced(Order order) {
        OrderPlacedEvent event = new OrderPlacedEvent(order);
        
        // Publish to Kafka topic
        kafkaTemplate.send(
            "order-events",
            order.getId().toString(),  // Key for partitioning
            event
        );
    }
}

// ===== Consumer 1: Inventory Service =====
@Service
public class InventoryConsumer {
    
    @KafkaListener(
        topics = "order-events",
        groupId = "inventory-service"
    )
    public void consume(OrderPlacedEvent event) {
        logger.info("Inventory service received: {}", event.getOrder().getId());
        inventoryService.reserve(event.getOrder().getItems());
    }
}

// ===== Consumer 2: Notification Service =====
@Service
public class NotificationConsumer {
    
    @KafkaListener(
        topics = "order-events",
        groupId = "notification-service",
        concurrency = "10"  // 10 parallel consumers
    )
    public void consume(OrderPlacedEvent event) {
        logger.info("Notification service received: {}", event.getOrder().getId());
        notificationService.sendOrderConfirmation(event.getOrder());
    }
}

// ===== Consumer 3: Analytics Service =====
@Service
public class AnalyticsConsumer {
    
    @KafkaListener(
        topics = "order-events",
        groupId = "analytics-service"
    )
    public void consume(OrderPlacedEvent event) {
        logger.info("Analytics service received: {}", event.getOrder().getId());
        analyticsService.trackOrder(event.getOrder());
    }
}
```

**Architecture:**
```
OrderService (Publisher)
        │
        ▼
    Kafka Topic: "order-events"
        │
        ├─────────────┬─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
  Inventory     Notification   Analytics      Audit
   Service       Service        Service       Service
  (Consumer)    (Consumer)     (Consumer)    (Consumer)
```

### Observer with Error Handling

```java
@Service
public class ResilientSubject {
    private final List<Observer> observers = new CopyOnWriteArrayList<>();
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);
    
    public void notifyObservers(Event event) {
        List<CompletableFuture<Void>> futures = observers.stream()
            .map(observer -> notifyObserverAsync(observer, event))
            .collect(Collectors.toList());
        
        // Wait for all to complete (or fail)
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .exceptionally(ex -> {
                logger.error("Some observers failed", ex);
                return null;
            })
            .join();
    }
    
    private CompletableFuture<Void> notifyObserverAsync(Observer observer, Event event) {
        return CompletableFuture.runAsync(() -> {
            try {
                observer.update(event);
            } catch (Exception e) {
                logger.error("Observer {} failed", observer.getClass().getSimpleName(), e);
                metrics.increment("observer.failure", 
                    "observer", observer.getClass().getSimpleName());
                
                // Optionally retry
                retryService.scheduleRetry(observer, event, e);
            }
        }, executorService)
        .orTimeout(5, TimeUnit.SECONDS)
        .exceptionally(ex -> {
            if (ex instanceof TimeoutException) {
                logger.warn("Observer {} timed out", observer.getClass().getSimpleName());
            }
            return null;
        });
    }
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why It Matters

**Business Impact:**
- **Faster Feature Development**: Add new reactions to events without modifying core logic
- **System Extensibility**: Plugin-like architecture for third-party integrations
- **Reduced Downtime**: Independent observer deployments don't affect core services
- **Better User Experience**: Real-time updates and notifications
- **Cost Optimization**: Scale observers independently based on load

**User Experience:**
- **Real-time Updates**: Instant feed refreshes, live notifications
- **Personalization**: Each user gets relevant observers based on preferences
- **Reliability**: Failed observers don't block core operations
- **Responsiveness**: Async processing prevents UI blocking

**Engineering Excellence:**
- **Loose Coupling**: Subject doesn't know about observer implementations
- **Testability**: Test subject and observers independently
- **Scalability**: Horizontal scaling via message brokers
- **Maintainability**: Add/remove observers without touching subject code
- **Observability**: Monitor each observer's performance independently

### How It Works (Simple but Precise)

1. **Subject** maintains a list of observers
2. **Observers** register interest in events
3. **State Change** triggers notification
4. **Subject** notifies all registered observers
5. **Observers** react independently and asynchronously

**In Distributed Systems:**
1. **Publisher** sends event to message broker
2. **Broker** delivers to all subscribed topics
3. **Consumers** process events in parallel
4. **Acknowledgment** ensures at-least-once delivery
5. **Dead Letter Queue** handles failures

### Key Trade-offs to Remember

✅ **Use Observer Pattern When:**
- One event needs multiple reactions
- Reactions should be decoupled from trigger
- New reactions will be added frequently
- Async processing is acceptable
- Multiple subscribers need same event

❌ **Avoid Observer Pattern When:**
- Only one listener ever needed
- Synchronous response required
- Observer needs to return value to subject
- Event ordering is critical (use queue with ordering guarantees)
- Observer invocation must be transactional with subject

### Production Checklist

Before shipping observer pattern to production:

- [ ] **Async notification** to prevent blocking subject
- [ ] **Error isolation**: One observer failure doesn't affect others
- [ ] **Timeout per observer** to prevent hanging
- [ ] **Memory leak prevention**: Observers properly detached
- [ ] **Idempotent observers** for at-least-once delivery
- [ ] **Dead letter queue** for failed notifications
- [ ] **Backpressure handling** for high-volume events
- [ ] **Metrics per observer**: latency, error rate, throughput
- [ ] **Circuit breakers** for external observer calls
- [ ] **Event replay** capability for recovery
- [ ] **Rate limiting** to prevent observer overload
- [ ] **Graceful degradation** under high load

### Interview Red Flags to Avoid

🚫 "Observer pattern is just a list of callbacks"
✅ "Observer pattern is a formal design for decoupled event notification with registration/deregistration lifecycle"

🚫 "Always use synchronous notification"
✅ "Sync for critical path with few observers, async for scalability"

🚫 "Pub-Sub and Observer are the same thing"
✅ "Observer is typically in-process, Pub-Sub uses a broker as intermediary"

🚫 "If one observer fails, stop notifying others"
✅ "Isolate observer failures so others continue to execute"

### Final Interview Sound Bite

*"Observer Pattern is fundamental to event-driven architectures. I've used it for real-time feeds, notification systems, and inter-service communication. Within a service, I use Spring Events with @EventListener and async processing. Across services, I use Kafka for distributed pub-sub.*

*The key is making observers asynchronous and isolated—one slow or failing observer shouldn't affect others. At scale, I use message brokers with consumer groups for load balancing. I ensure observers are idempotent since message queues typically provide at-least-once delivery.*

*For critical operations like order processing, I use the Saga pattern with event choreography where each service publishes events that trigger the next step. For analytics and non-critical flows, I use fire-and-forget with best-effort delivery."*

---

## 📚 Additional Resources

**Books:**
- "Design Patterns" by Gang of Four
- "Enterprise Integration Patterns" by Hohpe & Woolf
- "Reactive Design Patterns" by Kuhn & Allen

**Frameworks:**
- **Spring Events**: ApplicationEventPublisher, @EventListener
- **Guava EventBus**: Lightweight in-process event bus
- **RxJava/Project Reactor**: Reactive streams
- **Kafka Streams**: Event-driven microservices

**Real-World Examples:**
- Spring Framework: ApplicationEvent system
- Java Swing: ActionListener, PropertyChangeListener
- Node.js: EventEmitter
- Redux: State change subscribers

**Engineering Blogs:**
- Netflix: Asynchronous Event Processing
- LinkedIn: Real-time Activity Streams
- Uber: Event-Driven Architecture
- Airbnb: Notification System Design

---

**Last Updated**: January 2026
**Target Audience**: Senior Backend Engineers (7+ YOE)
**Interview Level**: FAANG L5/L6 (Senior/Staff)
