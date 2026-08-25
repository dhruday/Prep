# Salesforce — SMTS FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Salesforce |
| **Role** | Senior Member of Technical Staff |
| **Level** | SMTS (SDE-3 equivalent) |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/salesforce-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + Phone + Machine Coding + System Design + HM)

---

## Round 3: Machine Coding — Build a Pub/Sub Event System with Dead Letter Queue
**Duration:** 90 minutes

### Challenge: Build a topic-based publish/subscribe system with: at-least-once delivery, consumer groups, retry logic, dead letter queue, and backpressure handling.

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Topic-Based Pub/Sub with DLQ:
 * 
 * Features:
 * 1. Topics with multiple subscribers
 * 2. Consumer groups (competing consumers — only one in group gets message)
 * 3. At-least-once delivery with retry (max 3 attempts)
 * 4. Dead Letter Queue for failed messages
 * 5. Backpressure: bounded queue per consumer with configurable overflow policy
 * 6. Message ordering within a topic-partition
 */

class Message {
    final long id;
    final String topic;
    final Object payload;
    final long timestamp;
    final Map<String, String> headers;
    int deliveryAttempts;
    
    Message(long id, String topic, Object payload) {
        this.id = id;
        this.topic = topic;
        this.payload = payload;
        this.timestamp = System.currentTimeMillis();
        this.headers = new ConcurrentHashMap<>();
        this.deliveryAttempts = 0;
    }
}

enum OverflowPolicy { BLOCK, DROP_OLDEST, DROP_NEWEST, REJECT }

class Subscription {
    final String subscriberId;
    final String topic;
    final String consumerGroup; // null = independent consumer
    final Consumer<Message> handler;
    final BlockingQueue<Message> queue;
    final OverflowPolicy overflowPolicy;
    
    Subscription(String subscriberId, String topic, String consumerGroup,
                 Consumer<Message> handler, int queueSize, OverflowPolicy policy) {
        this.subscriberId = subscriberId;
        this.topic = topic;
        this.consumerGroup = consumerGroup;
        this.handler = handler;
        this.queue = new LinkedBlockingQueue<>(queueSize);
        this.overflowPolicy = policy;
    }
}

class PubSubSystem {
    
    private final AtomicLong messageIdGen = new AtomicLong(0);
    
    // topic → list of subscriptions
    private final ConcurrentHashMap<String, List<Subscription>> topicSubscriptions = new ConcurrentHashMap<>();
    
    // Consumer group round-robin counters: "topic:group" → index
    private final ConcurrentHashMap<String, AtomicLong> groupCounters = new ConcurrentHashMap<>();
    
    // DLQ: topic → failed messages
    private final ConcurrentHashMap<String, BlockingQueue<Message>> deadLetterQueues = new ConcurrentHashMap<>();
    
    // Worker thread per subscription
    private final ExecutorService workerPool = Executors.newCachedThreadPool();
    private final Map<String, Future<?>> workerFutures = new ConcurrentHashMap<>();
    
    private final int maxRetries;
    private volatile boolean running = true;
    
    public PubSubSystem(int maxRetries) {
        this.maxRetries = maxRetries;
    }
    
    /**
     * Subscribe to a topic.
     */
    public Subscription subscribe(String subscriberId, String topic, String consumerGroup,
                                   Consumer<Message> handler, int queueSize, OverflowPolicy policy) {
        Subscription sub = new Subscription(subscriberId, topic, consumerGroup, handler, queueSize, policy);
        
        topicSubscriptions.computeIfAbsent(topic, k -> Collections.synchronizedList(new ArrayList<>()))
                          .add(sub);
        
        // Start worker thread for this subscription
        Future<?> future = workerPool.submit(() -> processMessages(sub));
        workerFutures.put(subscriberId, future);
        
        return sub;
    }
    
    /**
     * Publish a message to a topic.
     * Routes to all independent subscribers + one per consumer group (round-robin).
     */
    public long publish(String topic, Object payload) {
        long id = messageIdGen.incrementAndGet();
        Message msg = new Message(id, topic, payload);
        
        List<Subscription> subs = topicSubscriptions.getOrDefault(topic, Collections.emptyList());
        
        // Group subscriptions by consumer group
        Map<String, List<Subscription>> groups = new HashMap<>();
        List<Subscription> independents = new ArrayList<>();
        
        synchronized (subs) {
            for (Subscription sub : subs) {
                if (sub.consumerGroup == null) {
                    independents.add(sub);
                } else {
                    groups.computeIfAbsent(sub.consumerGroup, k -> new ArrayList<>()).add(sub);
                }
            }
        }
        
        // Deliver to all independent subscribers
        for (Subscription sub : independents) {
            enqueue(sub, msg);
        }
        
        // Deliver to one per consumer group (round-robin)
        for (var entry : groups.entrySet()) {
            String groupKey = topic + ":" + entry.getKey();
            AtomicLong counter = groupCounters.computeIfAbsent(groupKey, k -> new AtomicLong(0));
            long idx = counter.getAndIncrement();
            
            List<Subscription> members = entry.getValue();
            Subscription target = members.get((int)(idx % members.size()));
            enqueue(target, msg);
        }
        
        return id;
    }
    
    /**
     * Enqueue message to subscription with backpressure handling.
     */
    private void enqueue(Subscription sub, Message msg) {
        boolean offered = sub.queue.offer(msg);
        
        if (!offered) {
            switch (sub.overflowPolicy) {
                case BLOCK:
                    try { sub.queue.put(msg); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                    break;
                case DROP_OLDEST:
                    sub.queue.poll(); // Remove oldest
                    sub.queue.offer(msg);
                    break;
                case DROP_NEWEST:
                    // Drop the incoming message (do nothing)
                    break;
                case REJECT:
                    throw new RejectedExecutionException("Queue full for subscriber " + sub.subscriberId);
            }
        }
    }
    
    /**
     * Worker loop: dequeue and process messages with retry.
     */
    private void processMessages(Subscription sub) {
        while (running) {
            try {
                Message msg = sub.queue.poll(100, TimeUnit.MILLISECONDS);
                if (msg == null) continue;
                
                boolean success = false;
                int attempts = 0;
                
                while (attempts < maxRetries && !success) {
                    attempts++;
                    msg.deliveryAttempts = attempts;
                    
                    try {
                        sub.handler.accept(msg);
                        success = true;
                    } catch (Exception e) {
                        if (attempts < maxRetries) {
                            // Exponential backoff: 100ms, 200ms, 400ms, ...
                            Thread.sleep(100L * (1L << (attempts - 1)));
                        }
                    }
                }
                
                if (!success) {
                    // Send to DLQ
                    sendToDLQ(msg);
                }
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
    
    private void sendToDLQ(Message msg) {
        String dlqTopic = msg.topic + ".dlq";
        deadLetterQueues.computeIfAbsent(dlqTopic, k -> new LinkedBlockingQueue<>(10000))
                        .offer(msg);
    }
    
    /**
     * Get DLQ messages for a topic (for manual retry/inspection).
     */
    public List<Message> getDLQMessages(String topic) {
        String dlqTopic = topic + ".dlq";
        BlockingQueue<Message> dlq = deadLetterQueues.get(dlqTopic);
        if (dlq == null) return Collections.emptyList();
        
        List<Message> messages = new ArrayList<>();
        dlq.drainTo(messages);
        return messages;
    }
    
    /**
     * Replay DLQ messages back to the original topic.
     */
    public int replayDLQ(String topic) {
        List<Message> messages = getDLQMessages(topic);
        for (Message msg : messages) {
            publish(msg.topic, msg.payload);
        }
        return messages.size();
    }
    
    public void shutdown() {
        running = false;
        workerPool.shutdown();
        try { workerPool.awaitTermination(5, TimeUnit.SECONDS); } 
        catch (InterruptedException e) { workerPool.shutdownNow(); }
    }
}
```

---

## 🎯 Key Takeaways
- Salesforce SMTS = **Pub/Sub with DLQ, consumer groups, retry, backpressure**
- **Consumer groups**: round-robin with AtomicLong counter — competing consumers pattern (like Kafka consumer groups)
- **At-least-once**: retry up to maxRetries with exponential backoff — then DLQ
- **Backpressure policies**: BLOCK (back-pressure), DROP_OLDEST (bounded buffer), DROP_NEWEST (sampling), REJECT (fail-fast)
- **DLQ**: `topic.dlq` convention — supports drain + replay for manual recovery
- **Worker per subscription**: each has its own thread + queue — prevents slow consumer from blocking others
- **Exponential backoff**: `100ms * 2^(attempt-1)` — 100, 200, 400ms
- Salesforce = **multi-tenant platform** — event-driven architecture, Apex triggers, platform events

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Phone Screen | Medium | Java/Spring |
| Machine Coding (this) | Very Hard | Pub/Sub, Concurrency |
| System Design | Very Hard | Multi-Tenant Event Bus |
| HM | Medium | Culture |
