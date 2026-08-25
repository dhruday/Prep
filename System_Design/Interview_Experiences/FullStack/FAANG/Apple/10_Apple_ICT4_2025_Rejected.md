# Apple — ICT4 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Software Engineer |
| **Level** | ICT4 (Senior) |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Cupertino |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 On-site: 3 Coding + 1 Manager)
- **Timeline:** 5 weeks
- **Format:** On-site

## Round 3: Coding — Event-Driven Pub/Sub Message Broker

### Problem
Implement a lightweight in-memory publish/subscribe message broker:
1. Topics with multiple subscribers
2. At-least-once delivery with acknowledgment
3. Dead letter queue for messages that fail N times
4. Message ordering guarantee per topic
5. Wildcard topic matching (e.g., `sensor.*` matches `sensor.temp`, `sensor.humidity`)

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.Consumer;
import java.util.regex.Pattern;

public class PubSubBroker {

    static class Message {
        final String id;
        final String topic;
        final String payload;
        final long timestamp;
        final AtomicInteger deliveryAttempts = new AtomicInteger(0);
        volatile boolean acknowledged = false;

        Message(String topic, String payload) {
            this.id = UUID.randomUUID().toString().substring(0, 8);
            this.topic = topic;
            this.payload = payload;
            this.timestamp = System.currentTimeMillis();
        }

        @Override
        public String toString() {
            return String.format("[%s] %s: %s", id, topic, payload);
        }
    }

    interface Subscriber {
        String id();
        boolean onMessage(Message message);
    }

    static class Subscription {
        final String subscriberId;
        final String topicPattern;  // supports wildcards: * (single level), # (multi level)
        final Pattern regex;
        final Subscriber subscriber;

        Subscription(String subscriberId, String topicPattern, Subscriber subscriber) {
            this.subscriberId = subscriberId;
            this.topicPattern = topicPattern;
            this.subscriber = subscriber;
            // Convert MQTT-style wildcards to regex
            String regexStr = topicPattern
                .replace(".", "\\.")
                .replace("*", "[^.]+")
                .replace("#", ".*");
            this.regex = Pattern.compile("^" + regexStr + "$");
        }

        boolean matches(String topic) {
            return regex.matcher(topic).matches();
        }
    }

    // --- Broker State ---
    private final Map<String, Deque<Message>> topicQueues = new ConcurrentHashMap<>();
    private final List<Subscription> subscriptions = new CopyOnWriteArrayList<>();
    private final Deque<Message> deadLetterQueue = new ConcurrentLinkedDeque<>();
    private final int maxRetries;
    private final AtomicLong publishedCount = new AtomicLong(0);
    private final AtomicLong deliveredCount = new AtomicLong(0);
    private final AtomicLong deadLetterCount = new AtomicLong(0);

    public PubSubBroker(int maxRetries) {
        this.maxRetries = maxRetries;
    }

    /**
     * Subscribe to a topic pattern.
     * Supports wildcards: * matches one level, # matches any number of levels.
     * Examples: "sensor.*" matches "sensor.temp" but not "sensor.temp.indoor"
     *           "sensor.#" matches "sensor.temp" and "sensor.temp.indoor"
     */
    public void subscribe(String topicPattern, Subscriber subscriber) {
        subscriptions.add(new Subscription(subscriber.id(), topicPattern, subscriber));
    }

    public void unsubscribe(String subscriberId) {
        subscriptions.removeIf(s -> s.subscriberId.equals(subscriberId));
    }

    /**
     * Publish a message to a topic.
     * Delivers to all matching subscribers synchronously with retry.
     */
    public Message publish(String topic, String payload) {
        Message msg = new Message(topic, payload);

        // Store in topic queue for replay/persistence
        topicQueues.computeIfAbsent(topic, k -> new ConcurrentLinkedDeque<>()).addLast(msg);
        publishedCount.incrementAndGet();

        // Find matching subscribers
        List<Subscription> matching = subscriptions.stream()
            .filter(s -> s.matches(topic))
            .toList();

        if (matching.isEmpty()) {
            return msg; // No subscribers — message stays in queue
        }

        for (Subscription sub : matching) {
            deliverWithRetry(msg, sub);
        }

        return msg;
    }

    private void deliverWithRetry(Message msg, Subscription sub) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            msg.deliveryAttempts.incrementAndGet();
            try {
                boolean ack = sub.subscriber.onMessage(msg);
                if (ack) {
                    msg.acknowledged = true;
                    deliveredCount.incrementAndGet();
                    return;
                }
            } catch (Exception e) {
                // Subscriber threw — count as failed delivery
            }
        }

        // Max retries exhausted — move to dead letter queue
        deadLetterQueue.addLast(msg);
        deadLetterCount.incrementAndGet();
    }

    /**
     * Replay all messages from a topic to a specific subscriber.
     * Useful for catch-up after reconnection.
     */
    public int replay(String topic, Subscriber subscriber) {
        Deque<Message> queue = topicQueues.get(topic);
        if (queue == null) return 0;

        int count = 0;
        for (Message msg : queue) {
            subscriber.onMessage(msg);
            count++;
        }
        return count;
    }

    public List<Message> getDeadLetterQueue() {
        return List.copyOf(deadLetterQueue);
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("published", publishedCount.get());
        stats.put("delivered", deliveredCount.get());
        stats.put("deadLettered", deadLetterCount.get());
        stats.put("topicCount", topicQueues.size());
        stats.put("subscriberCount", subscriptions.size());
        return stats;
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) {
        PubSubBroker broker = new PubSubBroker(3); // 3 retries before DLQ

        // Create subscribers
        Subscriber tempSub = new Subscriber() {
            @Override public String id() { return "temp-monitor"; }
            @Override public boolean onMessage(Message msg) {
                System.out.printf("  [%s] Received: %s%n", id(), msg);
                return true; // ACK
            }
        };

        Subscriber allSensorSub = new Subscriber() {
            @Override public String id() { return "sensor-logger"; }
            @Override public boolean onMessage(Message msg) {
                System.out.printf("  [%s] Logging: %s%n", id(), msg);
                return true;
            }
        };

        // Flaky subscriber — fails first 2 attempts
        Subscriber flakySub = new Subscriber() {
            int callCount = 0;
            @Override public String id() { return "flaky-consumer"; }
            @Override public boolean onMessage(Message msg) {
                callCount++;
                if (callCount % 3 != 0) {
                    System.out.printf("  [%s] NACK (attempt %d)%n", id(), callCount);
                    return false;
                }
                System.out.printf("  [%s] ACK (attempt %d): %s%n", id(), callCount, msg);
                return true;
            }
        };

        // Permanently failing subscriber
        Subscriber deadSub = new Subscriber() {
            @Override public String id() { return "dead-consumer"; }
            @Override public boolean onMessage(Message msg) {
                throw new RuntimeException("I'm broken!");
            }
        };

        // Subscribe
        broker.subscribe("sensor.temp", tempSub);
        broker.subscribe("sensor.*", allSensorSub);      // wildcard: any sensor
        broker.subscribe("sensor.humidity", flakySub);
        broker.subscribe("alert.#", deadSub);             // multi-level wildcard

        // Publish
        System.out.println("=== Publish sensor.temp ===");
        broker.publish("sensor.temp", "22.5°C");

        System.out.println("\n=== Publish sensor.humidity ===");
        broker.publish("sensor.humidity", "65%");

        System.out.println("\n=== Publish sensor.pressure ===");
        broker.publish("sensor.pressure", "1013 hPa");

        System.out.println("\n=== Publish alert.fire.building1 (will DLQ) ===");
        broker.publish("alert.fire.building1", "FIRE DETECTED!");

        // Stats
        System.out.println("\n=== Broker Stats ===");
        broker.getStats().forEach((k, v) -> System.out.printf("  %s: %s%n", k, v));

        // Dead Letter Queue
        System.out.println("\n=== Dead Letter Queue ===");
        broker.getDeadLetterQueue().forEach(m ->
            System.out.printf("  %s (attempts: %d)%n", m, m.deliveryAttempts.get()));

        // Replay
        System.out.println("\n=== Replay sensor.temp ===");
        Subscriber replaySub = new Subscriber() {
            @Override public String id() { return "replay-sub"; }
            @Override public boolean onMessage(Message msg) {
                System.out.printf("  [%s] Replayed: %s%n", id(), msg);
                return true;
            }
        };
        int replayed = broker.replay("sensor.temp", replaySub);
        System.out.printf("  Replayed %d messages%n", replayed);
    }
}
```

## 🎯 Key Takeaways
- Apple interviews tend towards **systems building** — clean OOP with operational features
- MQTT-style wildcards: `*` = one level, `#` = multi-level, converted to regex for matching
- Dead Letter Queue (DLQ) is essential for production messaging systems
- At-least-once delivery: retry N times, then DLQ — interviewer expects this model
- CopyOnWriteArrayList for subscription list — safe iteration during publish
- Message replay enables catch-up semantics for late-joining subscribers
- UUID-based message IDs for deduplication in distributed scenarios

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Arrays, Two Pointers |
| Coding 1 | Medium | Tries, String Matching |
| Coding 2 | Medium-Hard | Concurrency, Design |
| Coding 3 | Hard | Pub/Sub, Message Broker, OOP |
| Manager | Medium | Culture Fit, Ownership |
