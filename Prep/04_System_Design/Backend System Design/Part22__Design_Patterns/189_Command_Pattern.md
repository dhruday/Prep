# 189. Command Pattern

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

The **Command Pattern** is a behavioral design pattern that encapsulates a request as an object, thereby allowing you to parameterize clients with different requests, queue or log requests, and support undoable operations. It decouples the sender of a request from the object that executes the request.

**What it is:**
- A design pattern that turns requests into stand-alone objects
- Encapsulates all information needed to perform an action or trigger an event
- Decouples the invoker (caller) from the receiver (executor)
- Enables request queuing, logging, and undo/redo functionality

**Why it exists:**
- Separates the object that invokes the operation from the object that performs it
- Enables parameterization of objects with operations
- Supports queuing, scheduling, and logging of requests
- Provides undo/redo functionality
- Enables macro commands (composite commands)
- Facilitates request tracking and auditing

**The problem it solves:**
- Eliminates tight coupling between request sender and receiver
- Enables request queuing and delayed execution
- Supports transactional behavior with rollback
- Allows command history and replay
- Facilitates centralized logging and monitoring
- Enables distributed task execution

**Where and when it is used:**
- Task queue systems (Celery, Sidekiq, Bull)
- Undo/Redo functionality (text editors, graphics software)
- Transaction management (database operations)
- Job schedulers (Quartz, Spring Batch)
- Remote procedure calls (RPC systems)
- GUI actions (menu items, buttons, keyboard shortcuts)
- Event sourcing systems
- Workflow engines

**Role in large-scale distributed systems:**
- Foundation for async task processing
- Enables distributed job execution across workers
- Supports event sourcing and CQRS patterns
- Facilitates request/response decoupling
- Powers retry mechanisms and circuit breakers
- Enables audit trails and compliance logging
- Supports saga pattern for distributed transactions

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Core Components

1. **Command Interface**: Declares the execution method
2. **ConcreteCommand**: Implements the command interface and encapsulates receiver + parameters
3. **Receiver**: The object that performs the actual work
4. **Invoker**: Asks the command to execute the request
5. **Client**: Creates command objects and sets their receivers

### System Architecture & Component Boundaries

```
┌──────────┐
│  Client  │ (creates command)
└─────┬────┘
      │
      ▼
┌──────────────────┐         ┌─────────────────┐
│    Invoker       │────────▶│    Command      │ (interface)
│                  │         │                 │
│ - command: Cmd   │         │ + execute()     │
│ + setCommand()   │         │ + undo()        │
│ + executeCmd()   │         └────────▲────────┘
└──────────────────┘                  │
                                      │
                           ┌──────────┴──────────┐
                           │                     │
                    ┌──────┴────────┐   ┌───────┴──────┐
                    │ ConcreteCmd A │   │ConcreteCmd B │
                    │               │   │              │
                    │ - receiver    │   │ - receiver   │
                    │ - state       │   │ - state      │
                    │ + execute()   │   │ + execute()  │
                    │ + undo()      │   │ + undo()     │
                    └───────┬───────┘   └──────┬───────┘
                            │                  │
                            ▼                  ▼
                    ┌────────────────┐  ┌─────────────┐
                    │  Receiver A    │  │ Receiver B  │
                    │                │  │             │
                    │ + action()     │  │ + action()  │
                    └────────────────┘  └─────────────┘
```

### Data Flow & Request Lifecycle

**1. Command Creation Phase:**
```
Client creates Command → Sets Receiver → Passes Command to Invoker
```

**2. Execution Phase:**
```
Invoker.execute()
    ↓
Command.execute()
    ↓
Receiver.action()
    ↓
Return result (optional)
```

**3. Undo Phase (if supported):**
```
Invoker.undo()
    ↓
Command.undo()
    ↓
Receiver.reverseAction()
```

### Command Execution Models

**Synchronous Execution:**
```java
public interface Command {
    void execute();
}

public class Invoker {
    public void executeCommand(Command cmd) {
        cmd.execute(); // Blocks until complete
    }
}
```

**Asynchronous Execution:**
```java
public interface AsyncCommand {
    CompletableFuture<Result> executeAsync();
}

public class AsyncInvoker {
    private final ExecutorService executor;
    
    public CompletableFuture<Result> executeCommand(AsyncCommand cmd) {
        return cmd.executeAsync();
    }
}
```

**Queued Execution:**
```java
public class QueuedInvoker {
    private final BlockingQueue<Command> commandQueue;
    
    public void submitCommand(Command cmd) {
        commandQueue.offer(cmd);
    }
    
    // Worker thread processes queue
    private void processQueue() {
        while (true) {
            Command cmd = commandQueue.take();
            cmd.execute();
        }
    }
}
```

### Scalability Strategies

**Horizontal Scaling with Message Queues:**
```
Producer                    Message Queue               Workers
(Invoker)                   (Redis/Kafka)             (Executors)

Command A  ──┐
Command B  ──┼──▶  [Queue] ──▶  Worker 1 (executes commands)
Command C  ──┘                  Worker 2 (executes commands)
                                Worker 3 (executes commands)
```

**Benefits:**
- Commands persist in queue until processed
- Workers scale independently
- Load balancing across workers
- Failure isolation

**Vertical Scaling:**
- Thread pools for concurrent command execution
- Priority queues for important commands
- Resource pooling for expensive operations

### Performance Bottlenecks

**1. Command Serialization Overhead:**
```java
// PROBLEM: Expensive serialization per command
public class SerializableCommand implements Command, Serializable {
    private ComplexObject data; // Large object graph
    
    // Serialization is slow
}

// SOLUTION: Use lightweight command representation
public class LightweightCommand implements Command {
    private Long dataId; // Reference instead of full object
    
    public void execute() {
        ComplexObject data = repository.findById(dataId);
        // Process
    }
}
```

**2. Command Queue Bottleneck:**
```java
// PROBLEM: Single queue for all commands
BlockingQueue<Command> queue = new LinkedBlockingQueue<>();

// SOLUTION: Multiple priority queues
class PriorityCommandQueue {
    private final BlockingQueue<Command> highPriority;
    private final BlockingQueue<Command> mediumPriority;
    private final BlockingQueue<Command> lowPriority;
    
    public void submit(Command cmd, Priority priority) {
        switch (priority) {
            case HIGH -> highPriority.offer(cmd);
            case MEDIUM -> mediumPriority.offer(cmd);
            case LOW -> lowPriority.offer(cmd);
        }
    }
}
```

**3. Memory Overhead from Command History:**
```java
// PROBLEM: Unbounded command history for undo
List<Command> history = new ArrayList<>(); // Grows forever

// SOLUTION: Bounded history with circular buffer
class BoundedCommandHistory {
    private final Command[] history;
    private int position = -1;
    private final int maxSize = 100;
    
    public void add(Command cmd) {
        position = (position + 1) % maxSize;
        history[position] = cmd;
    }
}
```

### Consistency Models

**Strong Consistency (Synchronous):**
```java
@Transactional
public void executeCommand(Command cmd) {
    cmd.execute(); // Executes in transaction
    commandLog.save(cmd); // Logged before commit
}
```

**Eventual Consistency (Async with Queue):**
```java
public void submitCommand(Command cmd) {
    commandQueue.publish(cmd); // Returns immediately
    // Command executed eventually by worker
}
```

### Failure Modes & Recovery Paths

**1. Command Execution Failure:**
```java
public class ResilientInvoker {
    
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public void executeCommand(Command cmd) {
        try {
            cmd.execute();
        } catch (TransientException e) {
            // Retry automatically
            throw e;
        } catch (PermanentException e) {
            // Move to dead letter queue
            deadLetterQueue.add(cmd);
            throw e;
        }
    }
}
```

**2. Compensation Logic (Undo):**
```java
public interface CompensatableCommand extends Command {
    void execute();
    void compensate(); // Undo operation
}

public class SagaOrchestrator {
    private final Stack<CompensatableCommand> executed = new Stack<>();
    
    public void executeTransaction(List<CompensatableCommand> commands) {
        try {
            for (CompensatableCommand cmd : commands) {
                cmd.execute();
                executed.push(cmd);
            }
        } catch (Exception e) {
            // Rollback by compensating in reverse order
            while (!executed.isEmpty()) {
                executed.pop().compensate();
            }
            throw new TransactionFailedException(e);
        }
    }
}
```

**3. Idempotency for Retry Safety:**
```java
public abstract class IdempotentCommand implements Command {
    private final String commandId;
    
    @Override
    public final void execute() {
        if (executionLog.wasExecuted(commandId)) {
            logger.info("Command {} already executed, skipping", commandId);
            return;
        }
        
        doExecute();
        executionLog.markExecuted(commandId);
    }
    
    protected abstract void doExecute();
}
```

### Trade-offs at FAANG Scale

| Decision | Benefit | Cost | When to Use |
|----------|---------|------|-------------|
| **Sync Execution** | Immediate feedback, simple | Blocks caller, poor throughput | Critical operations, < 100ms latency |
| **Async Execution** | High throughput, non-blocking | Eventual consistency | Batch jobs, background tasks |
| **Persistent Queue** | Durability, recovery | Storage cost, latency | Must-process commands |
| **In-Memory Queue** | Low latency, high throughput | Data loss on crash | Best-effort processing |
| **Command Logging** | Audit trail, replay | Storage overhead | Compliance, debugging |
| **Undo Support** | User-friendly, reversible | Memory overhead, complexity | Interactive systems |

### Design Decisions at FAANG-Scale

**1. Command Serialization Format:**
- **JSON**: Human-readable, language-agnostic, slower
- **Protocol Buffers**: Compact, fast, schema evolution support
- **Avro**: Schema registry, compression
- **Java Serialization**: Java-only, versioning issues

**2. Queue Selection:**
- **Redis**: Fast, in-memory, limited durability
- **RabbitMQ**: Feature-rich, complex
- **Kafka**: High throughput, durable, ordering guarantees
- **SQS**: Managed, scalable, eventual consistency

**3. Execution Guarantees:**
- **At-most-once**: Fire and forget
- **At-least-once**: Retry until success (requires idempotency)
- **Exactly-once**: Complex, requires distributed transactions

**4. Command Routing:**
```java
// Topic-based routing
public class CommandRouter {
    private final Map<Class<? extends Command>, CommandHandler> handlers;
    
    public void route(Command cmd) {
        CommandHandler handler = handlers.get(cmd.getClass());
        handler.handle(cmd);
    }
}

// Content-based routing
public class ContentBasedRouter {
    public void route(Command cmd) {
        if (cmd.getPriority() == HIGH) {
            highPriorityQueue.send(cmd);
        } else if (cmd.getSize() > LARGE_THRESHOLD) {
            bulkProcessingQueue.send(cmd);
        } else {
            standardQueue.send(cmd);
        }
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Example: Background Job Processing System (Stripe/Shopify-like)

**Assumptions:**
- 10M API requests/day requiring async processing
- Average command payload: 5KB
- Command types: Email, Payment, Export, Analytics
- Peak traffic: 5x average
- Target processing latency: < 5 minutes (p95)

**Command Generation Rate:**
```
Average: 10M / (24 * 3600) ≈ 116 commands/sec
Peak: 116 * 5 = 580 commands/sec
```

**Command Distribution:**
```
Email commands:      40% = 232 cmd/sec peak
Payment commands:    30% = 174 cmd/sec peak
Export commands:     20% = 116 cmd/sec peak
Analytics commands:  10% =  58 cmd/sec peak
```

**Processing Capacity Required:**
```
Average execution time per command:
- Email: 2 seconds
- Payment: 5 seconds
- Export: 30 seconds
- Analytics: 1 second

Weighted average: (0.4*2 + 0.3*5 + 0.2*30 + 0.1*1) = 8.4 seconds

Required CPU time at peak: 580 cmd/sec * 8.4s = 4,872 CPU-seconds/sec

With 50% overhead for retries/failures: ~7,308 CPU cores needed
Typical server: 32 cores

Required servers: 7,308 / 32 ≈ 228 servers
With redundancy (2x): ~456 servers
```

**Queue Sizing:**
```
Commands in queue during processing:
Peak rate: 580 cmd/sec
Average processing time: 8.4s
Queue depth: 580 * 8.4 ≈ 4,872 commands

With 5-minute buffering: 580 * 300 = 174,000 commands
```

**Storage Requirements:**
```
Daily command storage: 10M * 5KB = 50GB/day
Retention 90 days: 50GB * 90 = 4.5TB

Command execution logs: 10M * 1KB = 10GB/day
90-day logs: 900GB

Total: ~5.4TB (with replication 3x = 16.2TB)
```

**Network Bandwidth:**
```
Peak command submission: 580 cmd/sec * 5KB = 2.9 MB/sec = 23.2 Mbps
Peak result retrieval: Similar
Total: ~50 Mbps per datacenter
```

**Latency Budget:**
```
Target: 5 minutes (300 seconds) at p95

- Queue insertion: 10ms
- Queue residence time: 280s (buffer time)
- Command deserialization: 5ms
- Execution: 8.4s (average)
- Result serialization: 5ms
- Result storage: 100ms
━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ~289 seconds (under budget)
```

**Why These Numbers Matter:**
- Queue depth determines memory requirements
- Processing time directly impacts worker count
- Peak traffic requires significant over-provisioning
- Retry logic can amplify resource needs
- Long-running commands need separate worker pools

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Command Persistence Schema

**Command Table:**
```sql
CREATE TABLE commands (
    id BIGSERIAL PRIMARY KEY,
    command_id UUID UNIQUE NOT NULL,
    command_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL, -- pending, executing, completed, failed
    priority INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMP, -- for delayed execution
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    user_id BIGINT,
    trace_id VARCHAR(100)
) PARTITION BY RANGE (created_at);

-- Indexes
CREATE INDEX idx_status_priority ON commands(status, priority DESC, created_at);
CREATE INDEX idx_scheduled ON commands(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_user_commands ON commands(user_id, created_at DESC);
CREATE INDEX idx_trace ON commands(trace_id);
CREATE INDEX idx_idempotency ON commands(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Partitions (monthly)
CREATE TABLE commands_2026_01 PARTITION OF commands
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**Command Execution Log:**
```sql
CREATE TABLE command_execution_log (
    id BIGSERIAL PRIMARY KEY,
    command_id UUID NOT NULL REFERENCES commands(command_id),
    execution_attempt INT NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    worker_id VARCHAR(100),
    duration_ms INT,
    UNIQUE(command_id, execution_attempt)
) PARTITION BY RANGE (started_at);

CREATE INDEX idx_command_log ON command_execution_log(command_id, execution_attempt);
CREATE INDEX idx_worker_performance ON command_execution_log(worker_id, completed_at);
```

**Undo History Table:**
```sql
CREATE TABLE command_undo_history (
    id BIGSERIAL PRIMARY KEY,
    command_id UUID NOT NULL,
    undo_command_id UUID NOT NULL,
    original_payload JSONB NOT NULL,
    undo_payload JSONB NOT NULL,
    executed_at TIMESTAMP NOT NULL,
    undone_at TIMESTAMP,
    undone_by VARCHAR(100),
    reason TEXT
);

CREATE INDEX idx_command_undo ON command_undo_history(command_id);
CREATE INDEX idx_undo_time ON command_undo_history(undone_at) WHERE undone_at IS NOT NULL;
```

### Event Sourcing with Command Pattern

**Event Store:**
```sql
CREATE TABLE event_store (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID UNIQUE NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    command_id UUID, -- Which command triggered this event
    event_data JSONB NOT NULL,
    metadata JSONB,
    version INT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(aggregate_id, version)
);

CREATE INDEX idx_aggregate ON event_store(aggregate_id, version);
CREATE INDEX idx_command_events ON event_store(command_id);
CREATE INDEX idx_event_type_time ON event_store(event_type, timestamp);
```

### Redis for In-Flight Command Tracking

```java
@Service
public class CommandTracker {
    private final RedisTemplate<String, String> redis;
    
    public void markInProgress(String commandId, String workerId) {
        String key = "command:inflight:" + commandId;
        redis.opsForValue().set(
            key, 
            workerId, 
            Duration.ofMinutes(10) // TTL
        );
    }
    
    public boolean isInProgress(String commandId) {
        return redis.hasKey("command:inflight:" + commandId);
    }
    
    public void markComplete(String commandId) {
        redis.delete("command:inflight:" + commandId);
    }
}
```

### Command Queue Implementation Choices

**Option 1: Database as Queue (Simple, Lower Scale)**
```sql
-- Polling query for next command
SELECT * FROM commands
WHERE status = 'pending'
  AND (scheduled_at IS NULL OR scheduled_at <= NOW())
ORDER BY priority DESC, created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Update to executing
UPDATE commands SET status = 'executing', started_at = NOW()
WHERE command_id = ?;
```

**Pros:** ACID guarantees, simple, no additional infrastructure
**Cons:** Polling overhead, doesn't scale to 10K+ QPS

**Option 2: Redis as Queue (Medium Scale)**
```java
// Using Redis List for FIFO queue
public void enqueue(Command cmd) {
    String json = serialize(cmd);
    redis.opsForList().leftPush("command:queue", json);
}

public Command dequeue() {
    String json = redis.opsForList().rightPop("command:queue", 5, TimeUnit.SECONDS);
    return deserialize(json);
}

// Using Redis Sorted Set for priority queue
public void enqueueWithPriority(Command cmd, double priority) {
    String json = serialize(cmd);
    redis.opsForZSet().add("command:priority:queue", json, priority);
}

public Command dequeueHighestPriority() {
    Set<String> items = redis.opsForZSet().reverseRange("command:priority:queue", 0, 0);
    if (items.isEmpty()) return null;
    String json = items.iterator().next();
    redis.opsForZSet().remove("command:priority:queue", json);
    return deserialize(json);
}
```

**Pros:** Fast, in-memory, pub/sub support
**Cons:** Limited durability, single-threaded

**Option 3: Kafka (High Scale)**
```java
// Producer
public void submitCommand(Command cmd) {
    ProducerRecord<String, Command> record = new ProducerRecord<>(
        "commands",
        cmd.getCommandId(),
        cmd
    );
    kafkaTemplate.send(record);
}

// Consumer
@KafkaListener(topics = "commands", groupId = "command-workers")
public void processCommand(Command cmd) {
    commandExecutor.execute(cmd);
}
```

**Pros:** High throughput, durable, ordering guarantees, partitioning
**Cons:** Complex setup, eventual consistency

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Horizontal Scaling with Worker Pool

**Architecture:**
```
┌────────────┐
│  Producer  │
│  (Invoker) │
└──────┬─────┘
       │
       ▼
┌──────────────────┐
│  Message Queue   │
│  (Kafka/Redis)   │
└──────┬───────────┘
       │
       ├───────────┬───────────┬───────────┐
       ▼           ▼           ▼           ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
  │Worker 1 │ │Worker 2 │ │Worker 3 │ │Worker N │
  │Execute  │ │Execute  │ │Execute  │ │Execute  │
  └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

**Worker Implementation:**
```java
@Service
public class CommandWorker {
    private final ExecutorService executor;
    
    @PostConstruct
    public void startProcessing() {
        for (int i = 0; i < WORKER_THREADS; i++) {
            executor.submit(this::processCommands);
        }
    }
    
    private void processCommands() {
        while (!Thread.interrupted()) {
            try {
                Command cmd = commandQueue.dequeue();
                if (cmd != null) {
                    processCommand(cmd);
                }
            } catch (Exception e) {
                logger.error("Error processing command", e);
            }
        }
    }
    
    private void processCommand(Command cmd) {
        try {
            cmd.execute();
            commandRepository.markCompleted(cmd.getId());
        } catch (Exception e) {
            handleFailure(cmd, e);
        }
    }
}
```

### Retry Strategy with Exponential Backoff

```java
@Service
public class RetryableCommandExecutor {
    
    public void execute(Command cmd) {
        int maxRetries = cmd.getMaxRetries();
        int attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                cmd.execute();
                return; // Success
            } catch (TransientException e) {
                attempt++;
                if (attempt >= maxRetries) {
                    throw new MaxRetriesExceededException(cmd, e);
                }
                
                long delay = calculateBackoff(attempt);
                logger.warn("Command {} failed, retry {} after {}ms", 
                    cmd.getId(), attempt, delay);
                
                Thread.sleep(delay);
            } catch (PermanentException e) {
                // Don't retry permanent failures
                throw e;
            }
        }
    }
    
    private long calculateBackoff(int attempt) {
        // Exponential backoff: 1s, 2s, 4s, 8s, ...
        return (long) (1000 * Math.pow(2, attempt - 1));
    }
}
```

### Dead Letter Queue for Failed Commands

```java
@Service
public class CommandProcessorWithDLQ {
    private final CommandQueue mainQueue;
    private final CommandQueue deadLetterQueue;
    
    public void processCommand(Command cmd) {
        try {
            cmd.execute();
        } catch (Exception e) {
            if (cmd.getRetryCount() >= cmd.getMaxRetries()) {
                // Exhausted retries, send to DLQ
                deadLetterQueue.enqueue(cmd);
                alertService.notifyDLQInsertion(cmd, e);
                logger.error("Command {} moved to DLQ after {} retries", 
                    cmd.getId(), cmd.getRetryCount());
            } else {
                // Increment retry and requeue
                cmd.incrementRetryCount();
                mainQueue.enqueue(cmd);
            }
        }
    }
}
```

### Circuit Breaker for External Dependencies

```java
@Component
public class CircuitBreakerCommand implements Command {
    private final CircuitBreaker circuitBreaker;
    private final ExternalService externalService;
    
    @Override
    public void execute() {
        Try.ofSupplier(CircuitBreaker.decorateSupplier(
            circuitBreaker,
            () -> externalService.callApi()
        )).recover(CallNotPermittedException.class, ex -> {
            // Circuit is open, use fallback
            logger.warn("Circuit breaker open, using fallback");
            return fallbackResponse();
        }).get();
    }
}
```

### Command Deduplication (Idempotency)

```java
@Service
public class IdempotentCommandProcessor {
    private final RedisTemplate<String, Boolean> redis;
    
    public void execute(Command cmd) {
        String idempotencyKey = cmd.getIdempotencyKey();
        
        // Try to acquire execution lock
        Boolean wasExecuted = redis.opsForValue()
            .setIfAbsent(
                "cmd:executed:" + idempotencyKey,
                true,
                Duration.ofDays(7)
            );
        
        if (Boolean.FALSE.equals(wasExecuted)) {
            logger.info("Command {} already executed, skipping", idempotencyKey);
            return;
        }
        
        try {
            cmd.execute();
        } catch (Exception e) {
            // Remove lock if execution failed
            redis.delete("cmd:executed:" + idempotencyKey);
            throw e;
        }
    }
}
```

### Rate Limiting for Command Submission

```java
@Service
public class RateLimitedCommandInvoker {
    private final RateLimiter globalRateLimiter;
    private final Map<String, RateLimiter> perUserRateLimiters;
    
    public void submitCommand(Command cmd, String userId) {
        // Global rate limit
        if (!globalRateLimiter.tryAcquire()) {
            throw new RateLimitExceededException("Global rate limit exceeded");
        }
        
        // Per-user rate limit
        RateLimiter userLimiter = perUserRateLimiters.computeIfAbsent(
            userId,
            k -> RateLimiter.create(10.0) // 10 commands/sec per user
        );
        
        if (!userLimiter.tryAcquire()) {
            throw new RateLimitExceededException("User rate limit exceeded");
        }
        
        commandQueue.enqueue(cmd);
    }
}
```

### Priority-Based Processing

```java
@Service
public class PriorityCommandProcessor {
    private final BlockingQueue<Command> highPriority = new LinkedBlockingQueue<>();
    private final BlockingQueue<Command> mediumPriority = new LinkedBlockingQueue<>();
    private final BlockingQueue<Command> lowPriority = new LinkedBlockingQueue<>();
    
    public void submit(Command cmd, Priority priority) {
        switch (priority) {
            case HIGH -> highPriority.offer(cmd);
            case MEDIUM -> mediumPriority.offer(cmd);
            case LOW -> lowPriority.offer(cmd);
        }
    }
    
    @Async
    public void processCommands() {
        while (true) {
            Command cmd = null;
            
            // Check queues in priority order
            cmd = highPriority.poll();
            if (cmd == null) cmd = mediumPriority.poll();
            if (cmd == null) cmd = lowPriority.poll(1, TimeUnit.SECONDS);
            
            if (cmd != null) {
                executeCommand(cmd);
            }
        }
    }
}
```

### Graceful Shutdown

```java
@Service
public class GracefulCommandWorker {
    private final ExecutorService executor;
    private volatile boolean shutdown = false;
    
    @PreDestroy
    public void shutdown() {
        logger.info("Initiating graceful shutdown");
        shutdown = true;
        
        // Stop accepting new commands
        executor.shutdown();
        
        try {
            // Wait for in-progress commands to complete
            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                logger.warn("Forcing shutdown after timeout");
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
        }
    }
    
    private void processCommands() {
        while (!shutdown) {
            Command cmd = commandQueue.poll(1, TimeUnit.SECONDS);
            if (cmd != null) {
                executeCommand(cmd);
            }
        }
    }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Command Authorization

```java
@Service
public class SecureCommandInvoker {
    private final AuthorizationService authService;
    
    public void executeCommand(Command cmd, User user) {
        // Check if user is authorized to execute this command
        if (!authService.canExecute(user, cmd.getClass())) {
            throw new UnauthorizedException(
                "User not authorized to execute " + cmd.getClass().getSimpleName()
            );
        }
        
        // Check command-specific permissions
        if (!cmd.isAuthorized(user)) {
            throw new ForbiddenException("Insufficient permissions");
        }
        
        cmd.execute();
    }
}

// Command with authorization
public abstract class SecureCommand implements Command {
    protected final User executor;
    
    public abstract boolean isAuthorized(User user);
    
    @Override
    public final void execute() {
        if (!isAuthorized(executor)) {
            throw new ForbiddenException("Not authorized");
        }
        doExecute();
    }
    
    protected abstract void doExecute();
}
```

### Command Validation

```java
public interface ValidatableCommand extends Command {
    ValidationResult validate();
}

@Service
public class ValidatingCommandInvoker {
    
    public void executeCommand(ValidatableCommand cmd) {
        ValidationResult result = cmd.validate();
        
        if (!result.isValid()) {
            throw new ValidationException(result.getErrors());
        }
        
        cmd.execute();
    }
}

// Example command with validation
public class CreateOrderCommand implements ValidatableCommand {
    private final OrderRequest request;
    
    @Override
    public ValidationResult validate() {
        ValidationResult result = new ValidationResult();
        
        if (request.getItems().isEmpty()) {
            result.addError("Order must have at least one item");
        }
        
        if (request.getTotal().compareTo(BigDecimal.ZERO) <= 0) {
            result.addError("Order total must be positive");
        }
        
        return result;
    }
    
    @Override
    public void execute() {
        orderService.createOrder(request);
    }
}
```

### Audit Trail for Command Execution

```java
@Aspect
@Component
public class CommandAuditAspect {
    
    @Around("@annotation(Auditable)")
    public Object auditCommand(ProceedingJoinPoint joinPoint) throws Throwable {
        Command cmd = (Command) joinPoint.getArgs()[0];
        User user = SecurityContextHolder.getCurrentUser();
        
        AuditEntry entry = AuditEntry.builder()
            .commandType(cmd.getClass().getSimpleName())
            .commandId(cmd.getId())
            .userId(user.getId())
            .timestamp(Instant.now())
            .build();
        
        try {
            Object result = joinPoint.proceed();
            entry.setStatus("SUCCESS");
            return result;
        } catch (Exception e) {
            entry.setStatus("FAILED");
            entry.setErrorMessage(e.getMessage());
            throw e;
        } finally {
            auditRepository.save(entry);
        }
    }
}

// Usage
@Service
public class OrderService {
    
    @Auditable
    public void createOrder(CreateOrderCommand cmd) {
        cmd.execute();
    }
}
```

### Command Encryption for Sensitive Data

```java
public class EncryptedCommand implements Command {
    private final String encryptedPayload;
    private final EncryptionService encryptionService;
    
    @Override
    public void execute() {
        // Decrypt payload
        String decryptedPayload = encryptionService.decrypt(encryptedPayload);
        
        // Process command
        processCommand(decryptedPayload);
        
        // Ensure sensitive data is cleared
        decryptedPayload = null;
    }
}

// Encryption at submission
@Service
public class SecureCommandSubmitter {
    
    public void submitCommand(SensitiveCommand cmd) {
        // Encrypt sensitive fields
        String encrypted = encryptionService.encrypt(cmd.getSensitiveData());
        
        // Create encrypted command
        Command encryptedCmd = new EncryptedCommand(encrypted);
        
        commandQueue.enqueue(encryptedCmd);
    }
}
```

### Rate Limiting and Throttling

```java
@Service
public class ThrottledCommandProcessor {
    
    @RateLimited(
        key = "#cmd.userId",
        limit = 100,
        duration = Duration.ofMinutes(1)
    )
    public void submitCommand(Command cmd) {
        commandQueue.enqueue(cmd);
    }
}

// Custom rate limiter annotation
@Aspect
@Component
public class RateLimitAspect {
    private final RateLimiterService rateLimiter;
    
    @Around("@annotation(rateLimited)")
    public Object checkRateLimit(ProceedingJoinPoint joinPoint, RateLimited rateLimited) {
        String key = evaluateKey(joinPoint, rateLimited.key());
        
        if (!rateLimiter.allowRequest(key, rateLimited.limit(), rateLimited.duration())) {
            throw new RateLimitExceededException("Too many commands");
        }
        
        return joinPoint.proceed();
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Text Editor Undo/Redo (VS Code, Google Docs)

**Problem:**
- Support undo/redo for text operations
- Maintain command history
- Handle complex operations (multi-cursor edits)
- Efficient memory usage

**Implementation:**

```java
// Command Interface
public interface TextCommand {
    void execute();
    void undo();
}

// Concrete Commands
public class InsertTextCommand implements TextCommand {
    private final TextBuffer buffer;
    private final int position;
    private final String text;
    
    @Override
    public void execute() {
        buffer.insert(position, text);
    }
    
    @Override
    public void undo() {
        buffer.delete(position, text.length());
    }
}

public class DeleteTextCommand implements TextCommand {
    private final TextBuffer buffer;
    private final int position;
    private final int length;
    private String deletedText; // Store for undo
    
    @Override
    public void execute() {
        deletedText = buffer.read(position, length);
        buffer.delete(position, length);
    }
    
    @Override
    public void undo() {
        buffer.insert(position, deletedText);
    }
}

// Command History Manager
public class CommandHistory {
    private final Stack<TextCommand> undoStack = new Stack<>();
    private final Stack<TextCommand> redoStack = new Stack<>();
    private static final int MAX_HISTORY = 1000;
    
    public void executeCommand(TextCommand cmd) {
        cmd.execute();
        
        // Add to undo stack
        undoStack.push(cmd);
        
        // Clear redo stack on new command
        redoStack.clear();
        
        // Limit history size
        if (undoStack.size() > MAX_HISTORY) {
            undoStack.remove(0);
        }
    }
    
    public void undo() {
        if (undoStack.isEmpty()) {
            throw new IllegalStateException("Nothing to undo");
        }
        
        TextCommand cmd = undoStack.pop();
        cmd.undo();
        redoStack.push(cmd);
    }
    
    public void redo() {
        if (redoStack.isEmpty()) {
            throw new IllegalStateException("Nothing to redo");
        }
        
        TextCommand cmd = redoStack.pop();
        cmd.execute();
        undoStack.push(cmd);
    }
}

// Macro Command (Composite)
public class MacroCommand implements TextCommand {
    private final List<TextCommand> commands = new ArrayList<>();
    
    public void addCommand(TextCommand cmd) {
        commands.add(cmd);
    }
    
    @Override
    public void execute() {
        commands.forEach(TextCommand::execute);
    }
    
    @Override
    public void undo() {
        // Undo in reverse order
        for (int i = commands.size() - 1; i >= 0; i--) {
            commands.get(i).undo();
        }
    }
}
```

**Scale Characteristics:**
- Commands: 100s per second during active editing
- History: Last 1000 commands (configurable)
- Memory: ~100 bytes per command average
- Undo latency: < 10ms

### Example 2: E-commerce Order Processing (Amazon/Shopify)

**Problem:**
- Process orders asynchronously
- Support order cancellation (compensation)
- Handle payment, inventory, shipping coordination
- Ensure exactly-once processing

**Implementation:**

```java
// Command Interface with Compensation
public interface OrderCommand extends Command {
    void execute();
    void compensate(); // Rollback
}

// Place Order Command
public class PlaceOrderCommand implements OrderCommand {
    private final Order order;
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    
    private String paymentId;
    private String reservationId;
    
    @Override
    public void execute() {
        // Reserve inventory
        reservationId = inventoryService.reserve(order.getItems());
        
        // Process payment
        paymentId = paymentService.charge(order.getTotal(), order.getPaymentMethod());
        
        // Update order status
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
    }
    
    @Override
    public void compensate() {
        // Refund payment
        if (paymentId != null) {
            paymentService.refund(paymentId);
        }
        
        // Release inventory
        if (reservationId != null) {
            inventoryService.release(reservationId);
        }
        
        // Cancel order
        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
    }
}

// Cancel Order Command
public class CancelOrderCommand implements OrderCommand {
    private final String orderId;
    private final PlaceOrderCommand originalCommand;
    
    @Override
    public void execute() {
        // Execute compensation of original command
        originalCommand.compensate();
    }
    
    @Override
    public void compensate() {
        // Re-execute original command (undo cancellation)
        originalCommand.execute();
    }
}

// Saga Orchestrator using Command Pattern
@Service
public class OrderSagaOrchestrator {
    
    @Transactional
    public void processOrder(Order order) {
        List<OrderCommand> commands = new ArrayList<>();
        
        // Build command chain
        commands.add(new ReserveInventoryCommand(order));
        commands.add(new ProcessPaymentCommand(order));
        commands.add(new CreateShipmentCommand(order));
        commands.add(new SendConfirmationCommand(order));
        
        Stack<OrderCommand> executed = new Stack<>();
        
        try {
            for (OrderCommand cmd : commands) {
                cmd.execute();
                executed.push(cmd);
            }
        } catch (Exception e) {
            logger.error("Order processing failed, compensating", e);
            
            // Compensate in reverse order
            while (!executed.isEmpty()) {
                try {
                    executed.pop().compensate();
                } catch (Exception compensationError) {
                    logger.error("Compensation failed", compensationError);
                    // Alert for manual intervention
                    alertService.criticalAlert("Saga compensation failed", compensationError);
                }
            }
            
            throw new OrderProcessingException("Order failed", e);
        }
    }
}
```

**Production Metrics:**
- 1M orders/day
- Average 4 commands per order
- Processing time: 2-5 seconds per order
- Compensation rate: ~2% of orders
- Exactly-once via idempotency keys

### Example 3: Background Job Processing (Sidekiq/Celery-like)

**Problem:**
- Execute background jobs (email, export, analytics)
- Support job scheduling and delayed execution
- Provide retry mechanism
- Handle millions of jobs per day

**Implementation:**

```java
// Job Command Interface
public interface JobCommand extends Serializable {
    String getJobId();
    void execute();
    int getMaxRetries();
    Duration getRetryDelay();
}

// Email Job Command
@Data
public class SendEmailCommand implements JobCommand {
    private final String jobId;
    private final String to;
    private final String subject;
    private final String body;
    
    @Override
    public void execute() {
        emailService.send(to, subject, body);
    }
    
    @Override
    public int getMaxRetries() {
        return 3;
    }
    
    @Override
    public Duration getRetryDelay() {
        return Duration.ofMinutes(5);
    }
}

// Export Job Command (Long-Running)
public class ExportDataCommand implements JobCommand {
    private final String jobId;
    private final ExportRequest request;
    
    @Override
    public void execute() {
        List<Record> data = dataService.fetchData(request);
        String fileUrl = exportService.generateFile(data, request.getFormat());
        
        // Notify user via another job
        jobQueue.enqueue(new SendEmailCommand(
            UUID.randomUUID().toString(),
            request.getUserEmail(),
            "Export Complete",
            "Your export is ready: " + fileUrl
        ));
    }
    
    @Override
    public int getMaxRetries() {
        return 1; // Long jobs shouldn't retry much
    }
}

// Job Worker
@Service
public class JobWorker {
    
    @KafkaListener(topics = "jobs", groupId = "job-workers", concurrency = "10")
    public void processJob(JobCommand cmd) {
        String jobId = cmd.getJobId();
        
        try {
            logger.info("Processing job: {}", jobId);
            
            // Mark as in-progress
            jobRepository.updateStatus(jobId, JobStatus.IN_PROGRESS);
            
            // Execute job
            cmd.execute();
            
            // Mark as completed
            jobRepository.updateStatus(jobId, JobStatus.COMPLETED);
            
        } catch (Exception e) {
            handleJobFailure(cmd, e);
        }
    }
    
    private void handleJobFailure(JobCommand cmd, Exception e) {
        JobRecord job = jobRepository.findById(cmd.getJobId());
        
        if (job.getRetryCount() < cmd.getMaxRetries()) {
            // Schedule retry
            job.incrementRetryCount();
            
            Instant retryAt = Instant.now().plus(cmd.getRetryDelay());
            jobScheduler.scheduleAt(cmd, retryAt);
            
            logger.warn("Job {} failed, scheduled retry at {}", 
                cmd.getJobId(), retryAt);
        } else {
            // Max retries exceeded
            jobRepository.updateStatus(cmd.getJobId(), JobStatus.FAILED);
            
            // Send to DLQ
            deadLetterQueue.enqueue(cmd);
            
            logger.error("Job {} failed after {} retries", 
                cmd.getJobId(), cmd.getMaxRetries());
        }
    }
}

// Job Scheduler for Delayed Execution
@Service
public class JobScheduler {
    
    public void scheduleAt(JobCommand cmd, Instant executeAt) {
        ScheduledJob scheduled = ScheduledJob.builder()
            .jobId(cmd.getJobId())
            .command(serialize(cmd))
            .scheduledAt(executeAt)
            .status(JobStatus.SCHEDULED)
            .build();
        
        scheduledJobRepository.save(scheduled);
    }
    
    @Scheduled(fixedDelay = 10000) // Every 10 seconds
    public void processScheduledJobs() {
        List<ScheduledJob> dueJobs = scheduledJobRepository
            .findByScheduledAtBeforeAndStatus(Instant.now(), JobStatus.SCHEDULED);
        
        dueJobs.forEach(job -> {
            JobCommand cmd = deserialize(job.getCommand());
            jobQueue.enqueue(cmd);
            scheduledJobRepository.updateStatus(job.getId(), JobStatus.QUEUED);
        });
    }
}
```

**Production Scale:**
- 10M jobs/day
- 50 worker instances
- Average processing: 2 seconds per job
- Peak: 1000 jobs/second
- Job types: Email (40%), Export (20%), Analytics (30%), Other (10%)

### Example 4: API Request/Response with Command (CQRS)

**Problem:**
- Separate read and write operations
- Command for writes, Query for reads
- Event sourcing for audit trail
- Eventual consistency

**Implementation:**

```java
// Command Side (Writes)
public interface WriteCommand {
    void execute();
    List<DomainEvent> getGeneratedEvents();
}

public class CreateUserCommand implements WriteCommand {
    private final String userId;
    private final String email;
    private final String name;
    private final List<DomainEvent> events = new ArrayList<>();
    
    @Override
    public void execute() {
        // Validate
        if (userRepository.existsByEmail(email)) {
            throw new UserAlreadyExistsException(email);
        }
        
        // Create user entity
        User user = new User(userId, email, name);
        userRepository.save(user);
        
        // Generate event
        events.add(new UserCreatedEvent(userId, email, name, Instant.now()));
    }
    
    @Override
    public List<DomainEvent> getGeneratedEvents() {
        return events;
    }
}

// Command Handler
@Service
public class CommandBus {
    private final EventStore eventStore;
    private final EventPublisher eventPublisher;
    
    @Transactional
    public void dispatch(WriteCommand cmd) {
        // Execute command
        cmd.execute();
        
        // Store events
        List<DomainEvent> events = cmd.getGeneratedEvents();
        events.forEach(eventStore::append);
        
        // Publish events for read model update
        events.forEach(eventPublisher::publish);
    }
}

// Read Side (Queries)
public interface ReadQuery<T> {
    T execute();
}

public class GetUserByIdQuery implements ReadQuery<UserDTO> {
    private final String userId;
    private final UserReadRepository readRepo;
    
    @Override
    public UserDTO execute() {
        return readRepo.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
    }
}

// Query Handler
@Service
public class QueryBus {
    
    public <T> T dispatch(ReadQuery<T> query) {
        return query.execute();
    }
}

// Event Handler (Updates Read Model)
@Component
public class UserEventHandler {
    
    @EventListener
    public void handleUserCreated(UserCreatedEvent event) {
        // Update read-optimized projection
        UserReadModel readModel = UserReadModel.builder()
            .userId(event.getUserId())
            .email(event.getEmail())
            .name(event.getName())
            .createdAt(event.getTimestamp())
            .build();
        
        userReadRepository.save(readModel);
    }
}
```

**Benefits:**
- Scalable reads and writes independently
- Read models optimized for queries
- Complete audit trail via events
- Eventual consistency acceptable for most use cases

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Crisp Interview Answer

**"Explain the Command Pattern":**

*"The Command Pattern encapsulates a request as an object, decoupling the sender from the receiver. Instead of calling a method directly, you create a command object that contains all the information needed to execute the action.*

*I've used this extensively in async task processing systems. For example, in an e-commerce platform, when a user places an order, instead of processing it synchronously, we create a PlaceOrderCommand that encapsulates the order details. This command is queued—typically in Kafka or Redis—and processed asynchronously by worker services.*

*The key benefits are decoupling, queueability, and undo support. Commands can be queued for later execution, allowing us to handle traffic spikes without blocking the API. We can also log commands for audit trails, retry failed commands, and even implement compensation logic for rollback.*

*At scale, I use message queues like Kafka where command producers submit commands to topics, and consumer groups process them in parallel. Each worker can scale independently based on queue depth. For reliability, I implement retry logic with exponential backoff and dead-letter queues for permanently failed commands.*

*The pattern is also foundational for CQRS and Event Sourcing—every state change is represented as a command, which generates events that are stored for replay and audit."*

### Common Follow-Up Questions

**Q1: "What's the difference between Command and Strategy patterns?"**

| Aspect | Command Pattern | Strategy Pattern |
|--------|-----------------|------------------|
| **Purpose** | Encapsulate request as object | Encapsulate algorithm |
| **Focus** | What to do (action) | How to do it (algorithm) |
| **Receiver** | Command knows receiver | Strategy doesn't know context details |
| **State** | Often stateful (parameters) | Usually stateless |
| **Undo** | Commonly supports undo | No undo concept |
| **Example** | PlaceOrderCommand | PaymentStrategy |

**Answer:**
*"Strategy is about selecting an algorithm—like choosing between credit card or PayPal payment methods. Command is about encapsulating a complete request—like 'place this order with these items.' Commands often have state and support undo, while strategies are typically stateless algorithms."*

**Q2: "How do you implement undo/redo efficiently?"**

```java
// Option 1: Memento Pattern (Store State)
public class UndoableCommand implements Command {
    private Memento previousState;
    
    @Override
    public void execute() {
        previousState = receiver.saveState(); // Memento
        receiver.performAction();
    }
    
    @Override
    public void undo() {
        receiver.restoreState(previousState);
    }
}

// Option 2: Inverse Operations (Store Actions)
public class InsertCommand implements Command {
    private int position;
    private String text;
    
    @Override
    public void undo() {
        // Inverse of insert is delete
        document.delete(position, text.length());
    }
}

// Option 3: Event Sourcing (Replay Events)
public class EventSourcedCommand implements Command {
    @Override
    public void undo() {
        // Remove event from event store
        eventStore.remove(commandId);
        
        // Rebuild state by replaying remaining events
        aggregate.rebuildFromEvents(eventStore.getEvents(aggregateId));
    }
}
```

**Trade-offs:**
- **Memento**: Simple but memory-intensive for large states
- **Inverse Operations**: Efficient but requires careful inverse logic
- **Event Sourcing**: Complete history but replay can be slow

**Answer:**
*"For text editors, I use inverse operations—insert's undo is delete. For complex domain objects, I use Memento to snapshot state. For distributed systems, I use event sourcing where undo means applying a compensation event. The choice depends on state size and undo frequency."*

**Q3: "How do you handle long-running commands?"**

```java
// Option 1: Async with Status Tracking
@Service
public class AsyncCommandExecutor {
    
    public String submitCommand(Command cmd) {
        String commandId = UUID.randomUUID().toString();
        
        // Store command
        commandRepository.save(new CommandRecord(commandId, cmd, Status.PENDING));
        
        // Execute asynchronously
        CompletableFuture.runAsync(() -> {
            try {
                cmd.execute();
                commandRepository.updateStatus(commandId, Status.COMPLETED);
            } catch (Exception e) {
                commandRepository.updateStatus(commandId, Status.FAILED);
            }
        });
        
        return commandId; // Return immediately
    }
    
    public CommandStatus getStatus(String commandId) {
        return commandRepository.findById(commandId).getStatus();
    }
}

// Option 2: Polling vs WebSocket Updates
@RestController
public class CommandController {
    
    @PostMapping("/commands")
    public ResponseEntity<CommandResponse> submitCommand(@RequestBody Command cmd) {
        String commandId = commandExecutor.submitCommand(cmd);
        
        return ResponseEntity.accepted()
            .body(new CommandResponse(commandId, "/commands/" + commandId + "/status"));
    }
    
    @GetMapping("/commands/{id}/status")
    public CommandStatus getStatus(@PathVariable String id) {
        return commandExecutor.getStatus(id);
    }
}

// Option 3: Callbacks/Webhooks
public class CallbackCommand implements Command {
    private final String callbackUrl;
    
    @Override
    public void execute() {
        try {
            // Execute long-running task
            Result result = performLongTask();
            
            // Notify via webhook
            restTemplate.postForEntity(callbackUrl, result, Void.class);
        } catch (Exception e) {
            // Notify failure
            restTemplate.postForEntity(callbackUrl, 
                new ErrorResponse(e.getMessage()), 
                Void.class
            );
        }
    }
}
```

**Answer:**
*"For long-running commands, I return a command ID immediately and process asynchronously. The client can poll for status, or I send a webhook when complete. For very long tasks like data exports, I use a separate queue with dedicated worker pools and send email notifications upon completion."*

**Q4: "How do you ensure exactly-once command execution?"**

```java
// Idempotency Key Pattern
@Service
public class IdempotentCommandProcessor {
    
    @Transactional
    public void execute(Command cmd, String idempotencyKey) {
        // Check if already executed
        Optional<CommandExecution> existing = 
            executionRepo.findByIdempotencyKey(idempotencyKey);
        
        if (existing.isPresent()) {
            if (existing.get().getStatus() == Status.COMPLETED) {
                logger.info("Command already executed: {}", idempotencyKey);
                return; // Idempotent return
            } else if (existing.get().getStatus() == Status.PROCESSING) {
                throw new ConcurrentExecutionException("Command in progress");
            }
        }
        
        // Create execution record
        CommandExecution execution = new CommandExecution(
            idempotencyKey, 
            Status.PROCESSING
        );
        executionRepo.save(execution);
        
        try {
            cmd.execute();
            execution.setStatus(Status.COMPLETED);
            executionRepo.save(execution);
        } catch (Exception e) {
            execution.setStatus(Status.FAILED);
            executionRepo.save(execution);
            throw e;
        }
    }
}

// Distributed Lock Pattern
@Service
public class DistributedLockCommandProcessor {
    private final RedissonClient redisson;
    
    public void execute(Command cmd) {
        String lockKey = "cmd:lock:" + cmd.getIdempotencyKey();
        RLock lock = redisson.getLock(lockKey);
        
        try {
            // Try to acquire lock for 10 seconds, auto-release after 30 seconds
            if (lock.tryLock(10, 30, TimeUnit.SECONDS)) {
                try {
                    cmd.execute();
                } finally {
                    lock.unlock();
                }
            } else {
                throw new LockAcquisitionException("Could not acquire lock");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CommandExecutionException(e);
        }
    }
}
```

**Answer:**
*"I use idempotency keys stored in the database. Before executing, I check if the key exists. If it does and status is COMPLETED, I return immediately. If PROCESSING, someone else is handling it. Otherwise, I mark as PROCESSING, execute, then mark COMPLETED. For distributed systems, I also use distributed locks in Redis to prevent concurrent execution."*

**Q5: "How do you test Command Pattern code?"**

```java
// Test command in isolation
@Test
public void testPlaceOrderCommand() {
    // Arrange
    Order order = new Order(/* ... */);
    PaymentService mockPayment = mock(PaymentService.class);
    InventoryService mockInventory = mock(InventoryService.class);
    
    PlaceOrderCommand cmd = new PlaceOrderCommand(order, mockPayment, mockInventory);
    
    // Act
    cmd.execute();
    
    // Assert
    verify(mockInventory).reserve(order.getItems());
    verify(mockPayment).charge(order.getTotal(), order.getPaymentMethod());
    assertEquals(OrderStatus.CONFIRMED, order.getStatus());
}

// Test undo functionality
@Test
public void testCommandUndo() {
    TextBuffer buffer = new TextBuffer("Hello");
    InsertCommand cmd = new InsertCommand(buffer, 5, " World");
    
    cmd.execute();
    assertEquals("Hello World", buffer.getText());
    
    cmd.undo();
    assertEquals("Hello", buffer.getText());
}

// Test command invoker
@Test
public void testCommandInvoker() {
    Command mockCmd = mock(Command.class);
    Invoker invoker = new Invoker();
    
    invoker.executeCommand(mockCmd);
    
    verify(mockCmd).execute();
}

// Integration test with queue
@Test
@SpringBootTest
public void testAsyncCommandExecution() {
    Command cmd = new SendEmailCommand("test@example.com", "Subject", "Body");
    
    String commandId = commandExecutor.submitCommand(cmd);
    
    // Wait for async processing
    await().atMost(5, SECONDS).until(() -> 
        commandExecutor.getStatus(commandId) == Status.COMPLETED
    );
    
    verify(emailService).send("test@example.com", "Subject", "Body");
}
```

**Answer:**
*"I test commands in isolation using mocks for dependencies. I test undo by verifying state before and after. For invokers, I verify commands are executed. For integration tests with queues, I submit commands and use await() to verify async completion. I also test failure scenarios—retry logic, DLQ, and compensation."*

**Q6: "When would you NOT use Command Pattern?"**

**Avoid Command Pattern When:**
- Simple direct method call suffices
- No need for queueing, logging, or undo
- No benefit from decoupling sender/receiver
- Overhead not justified
- Synchronous execution required with immediate response

**Example:**
```java
// BAD: Unnecessary Command Pattern
public class GetUserCommand implements Command {
    private User result;
    
    public void execute() {
        result = userService.getUser(userId);
    }
    
    public User getResult() {
        return result;
    }
}

// GOOD: Direct call
public User getUser(String userId) {
    return userService.getUser(userId);
}
```

**Answer:**
*"Don't use Command for simple CRUD reads—just call the repository directly. Use Command when you need async processing, queueing, audit trails, undo/redo, or transaction coordination. For synchronous queries that return values immediately, direct method calls are simpler and faster."*

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Classic Command Pattern UML

```
┌────────────┐
│   Client   │
└──────┬─────┘
       │creates
       ▼
┌─────────────────┐         ┌──────────────────┐
│    Invoker      │────────▶│   <<interface>>  │
│                 │         │     Command      │
│ - command: Cmd  │         │                  │
│                 │         │  + execute()     │
│ + setCommand()  │         └────────▲─────────┘
│ + execute()     │                  │
└─────────────────┘                  │implements
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                   ┌──────┴────────┐   ┌────────┴────────┐
                   │ ConcreteCmd A │   │ ConcreteCmd B   │
                   │               │   │                 │
                   │ - receiver    │   │ - receiver      │
                   │ + execute()   │   │ + execute()     │
                   └───────┬───────┘   └────────┬────────┘
                           │                    │
                           │references          │references
                           ▼                    ▼
                   ┌───────────────┐   ┌────────────────┐
                   │  Receiver A   │   │  Receiver B    │
                   │               │   │                │
                   │  + action()   │   │  + action()    │
                   └───────────────┘   └────────────────┘
```

### Sequence Diagram: Command Execution Flow

```
Client      Invoker     Command     Receiver
  │            │           │           │
  │─create cmd─│           │           │
  │            │           │           │
  │─setCmd()──▶│           │           │
  │            │           │           │
  │─execute()─▶│           │           │
  │            │           │           │
  │            │─execute()─▶           │
  │            │           │           │
  │            │           │─action()─▶│
  │            │           │           │
  │            │           │           │ (performs work)
  │            │           │           │
  │            │           │◀──result──┤
  │            │           │           │
  │            │◀──result──┤           │
  │            │           │           │
  │◀──result───┤           │           │
  │            │           │           │
```

### Async Command Processing Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      API Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ REST API │  │ GraphQL  │  │ gRPC API │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │              │                    │
│       └─────────────┴──────────────┘                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│              Command Dispatcher                        │
│  - Validates commands                                  │
│  - Assigns idempotency keys                           │
│  - Publishes to queue                                 │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│           Message Queue (Kafka/RabbitMQ)              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐        │
│  │High Pri Q │  │Medium Pri │  │ Low Pri Q │        │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘        │
└────────┼──────────────┼──────────────┼───────────────┘
         │              │              │
    ┌────┼──────────────┼──────────────┼────┐
    │    │              │              │     │
    ▼    ▼              ▼              ▼     ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Wkr 1│ │Wkr 2│ │Wkr 3│ │Wkr 4│ │Wkr 5│ │Wkr N│
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘
   │       │       │       │       │       │
   └───────┴───────┴───────┴───────┴───────┘
                   │
                   ▼
       ┌───────────────────────┐
       │  Command Execution    │
       │  - Execute command    │
       │  - Update status      │
       │  - Handle errors      │
       │  - Emit events        │
       └───────────────────────┘
```

### Spring Boot Command Pattern Implementation

```java
// ===== 1. Command Interface =====
public interface Command {
    String getCommandId();
    void execute();
}

// ===== 2. Concrete Command =====
@Data
@AllArgsConstructor
public class SendEmailCommand implements Command {
    private final String commandId;
    private final String to;
    private final String subject;
    private final String body;
    
    @Override
    public void execute() {
        // Executed by worker
        EmailService emailService = ApplicationContextProvider.getBean(EmailService.class);
        emailService.send(to, subject, body);
    }
}

// ===== 3. Command Dispatcher (Invoker) =====
@Service
public class CommandDispatcher {
    private final KafkaTemplate<String, Command> kafkaTemplate;
    private final CommandRepository commandRepository;
    
    public String dispatch(Command cmd) {
        // Persist command
        CommandRecord record = CommandRecord.builder()
            .commandId(cmd.getCommandId())
            .type(cmd.getClass().getSimpleName())
            .status(CommandStatus.PENDING)
            .createdAt(Instant.now())
            .build();
        
        commandRepository.save(record);
        
        // Publish to queue
        kafkaTemplate.send("commands", cmd.getCommandId(), cmd);
        
        return cmd.getCommandId();
    }
    
    public CommandStatus getStatus(String commandId) {
        return commandRepository.findById(commandId)
            .map(CommandRecord::getStatus)
            .orElseThrow(() -> new CommandNotFoundException(commandId));
    }
}

// ===== 4. Command Worker (Receiver) =====
@Service
public class CommandWorker {
    
    @KafkaListener(
        topics = "commands",
        groupId = "command-workers",
        concurrency = "10"
    )
    public void processCommand(Command cmd) {
        String commandId = cmd.getCommandId();
        
        try {
            logger.info("Executing command: {}", commandId);
            
            // Update status to IN_PROGRESS
            commandRepository.updateStatus(commandId, CommandStatus.IN_PROGRESS);
            
            // Execute command
            cmd.execute();
            
            // Update status to COMPLETED
            commandRepository.updateStatus(commandId, CommandStatus.COMPLETED);
            
            logger.info("Command completed: {}", commandId);
            
        } catch (Exception e) {
            logger.error("Command failed: {}", commandId, e);
            handleFailure(cmd, e);
        }
    }
    
    private void handleFailure(Command cmd, Exception e) {
        CommandRecord record = commandRepository.findById(cmd.getCommandId())
            .orElseThrow();
        
        if (record.getRetryCount() < 3) {
            // Retry
            record.incrementRetryCount();
            commandRepository.save(record);
            kafkaTemplate.send("commands", cmd.getCommandId(), cmd);
        } else {
            // Max retries exceeded
            commandRepository.updateStatus(
                cmd.getCommandId(), 
                CommandStatus.FAILED
            );
            deadLetterQueue.send(cmd);
        }
    }
}

// ===== 5. REST Controller =====
@RestController
@RequestMapping("/api/commands")
public class CommandController {
    
    @PostMapping("/send-email")
    public ResponseEntity<CommandResponse> sendEmail(@RequestBody EmailRequest request) {
        Command cmd = new SendEmailCommand(
            UUID.randomUUID().toString(),
            request.getTo(),
            request.getSubject(),
            request.getBody()
        );
        
        String commandId = commandDispatcher.dispatch(cmd);
        
        return ResponseEntity.accepted()
            .body(new CommandResponse(commandId, "/api/commands/" + commandId));
    }
    
    @GetMapping("/{commandId}")
    public ResponseEntity<CommandStatusResponse> getStatus(@PathVariable String commandId) {
        CommandStatus status = commandDispatcher.getStatus(commandId);
        return ResponseEntity.ok(new CommandStatusResponse(commandId, status));
    }
}
```

### Command Pattern with Undo Support

```java
// ===== Undoable Command =====
public interface UndoableCommand extends Command {
    void execute();
    void undo();
}

// ===== Command History Manager =====
@Service
public class CommandHistory {
    private final Deque<UndoableCommand> undoStack = new ArrayDeque<>();
    private final Deque<UndoableCommand> redoStack = new ArrayDeque<>();
    private static final int MAX_HISTORY = 100;
    
    public void executeCommand(UndoableCommand cmd) {
        // Execute command
        cmd.execute();
        
        // Add to undo stack
        undoStack.push(cmd);
        if (undoStack.size() > MAX_HISTORY) {
            undoStack.removeLast();
        }
        
        // Clear redo stack on new command
        redoStack.clear();
    }
    
    public void undo() {
        if (undoStack.isEmpty()) {
            throw new IllegalStateException("Nothing to undo");
        }
        
        UndoableCommand cmd = undoStack.pop();
        cmd.undo();
        redoStack.push(cmd);
    }
    
    public void redo() {
        if (redoStack.isEmpty()) {
            throw new IllegalStateException("Nothing to redo");
        }
        
        UndoableCommand cmd = redoStack.pop();
        cmd.execute();
        undoStack.push(cmd);
    }
    
    public boolean canUndo() {
        return !undoStack.isEmpty();
    }
    
    public boolean canRedo() {
        return !redoStack.isEmpty();
    }
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why It Matters

**Business Impact:**
- **Scalability**: Handle traffic spikes by queueing commands
- **Reliability**: Retry failed operations automatically
- **Auditability**: Complete trail of all actions for compliance
- **User Experience**: Non-blocking APIs, background processing
- **Cost Optimization**: Process commands during off-peak hours

**User Experience:**
- **Responsiveness**: API returns immediately, processing happens in background
- **Reliability**: Commands retried automatically on failure
- **Undo/Redo**: User-friendly reversible operations
- **Status Tracking**: Users can check progress of long-running operations

**Engineering Excellence:**
- **Decoupling**: Sender doesn't know about receiver implementation
- **Testability**: Commands tested in isolation
- **Scalability**: Workers scale independently
- **Maintainability**: Add new commands without changing infrastructure
- **Observability**: Track command execution metrics

### How It Works (Simple but Precise)

1. **Encapsulate**: Wrap request in command object
2. **Queue**: Submit command to queue (optional)
3. **Execute**: Worker dequeues and executes command
4. **Track**: Update command status (pending → executing → completed/failed)
5. **Retry**: Automatically retry transient failures
6. **Audit**: Log all commands for compliance

**In Distributed Systems:**
1. **Producer** creates command
2. **Dispatcher** validates and publishes to message queue
3. **Queue** buffers commands
4. **Workers** consume and execute commands in parallel
5. **Status Store** tracks execution state
6. **DLQ** captures failed commands for review

### Key Trade-offs to Remember

✅ **Use Command Pattern When:**
- Need async/background processing
- Want to queue requests
- Require audit trail
- Need undo/redo functionality
- Want to decouple sender from receiver
- Implementing CQRS or Event Sourcing

❌ **Avoid Command Pattern When:**
- Simple synchronous operation suffices
- No benefit from queueing
- Immediate response required
- Command has no state (use Strategy instead)
- Over-engineering simple CRUD operations

### Production Checklist

Before shipping command pattern to production:

- [ ] **Idempotency keys** for exactly-once execution
- [ ] **Retry logic** with exponential backoff
- [ ] **Dead letter queue** for failed commands
- [ ] **Command versioning** for backward compatibility
- [ ] **Timeout configuration** for long-running commands
- [ ] **Circuit breakers** for external dependencies
- [ ] **Metrics** per command type (latency, success rate, queue depth)
- [ ] **Graceful shutdown** handling in-flight commands
- [ ] **Command serialization** format chosen (JSON/Protobuf)
- [ ] **Queue monitoring** and alerting
- [ ] **Worker auto-scaling** based on queue depth
- [ ] **Audit logging** for compliance

### Interview Red Flags to Avoid

🚫 "Command pattern is just a wrapper around a method call"
✅ "Command pattern encapsulates a request as a first-class object with state, enabling queuing, logging, and undo"

🚫 "Always use Command pattern for all operations"
✅ "Use Command for write operations that benefit from async processing; use direct calls for simple reads"

🚫 "Commands should execute themselves"
✅ "Commands encapsulate the request; a receiver/handler executes the actual logic"

🚫 "Command pattern solves all concurrency issues"
✅ "Command pattern helps with async execution, but you still need idempotency, distributed locks, and proper error handling"

### Final Interview Sound Bite

*"Command Pattern is essential for building scalable async systems. I've used it for background job processing, order workflows, and event sourcing architectures. The pattern shines when you need to decouple request submission from execution.*

*In production, I use message queues like Kafka where commands are published to topics and consumed by worker pools. Each command is idempotent with a unique key to prevent duplicate execution. I implement retry logic with exponential backoff and dead-letter queues for failed commands.*

*For CQRS systems, every write operation is a command that generates events. Commands are validated and executed transactionally, then events are published for read model updates. This provides complete auditability and enables event sourcing.*

*The key is making commands self-contained with all necessary data, ensuring idempotency for retries, and monitoring queue depth for scaling decisions."*

---

## 📚 Additional Resources

**Books:**
- "Design Patterns" by Gang of Four
- "Enterprise Integration Patterns" by Hohpe & Woolf
- "Implementing Domain-Driven Design" by Vaughn Vernon (CQRS/Command)

**Frameworks:**
- **Spring Batch**: Job processing framework
- **Quartz Scheduler**: Job scheduling
- **Axon Framework**: CQRS and Event Sourcing
- **MediatR**: .NET mediator pattern implementation

**Message Queues:**
- **Kafka**: High-throughput distributed queue
- **RabbitMQ**: Feature-rich message broker
- **Redis**: In-memory queue
- **AWS SQS**: Managed queue service

**Real-World Examples:**
- Sidekiq (Ruby background jobs)
- Celery (Python task queue)
- Bull (Node.js job queue)
- Spring Cloud Task

**Engineering Blogs:**
- Uber: Asynchronous Task Processing
- Netflix: Command Pattern in Hystrix
- Amazon: SQS and Async Processing
- Stripe: Background Job Architecture

---

**Last Updated**: January 2026
**Target Audience**: Senior Backend Engineers (7+ YOE)
**Interview Level**: FAANG L5/L6 (Senior/Staff)
