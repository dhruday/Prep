# Google — SDE-2 FullStack Interview Experience (2025) — #12

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | L5 FullStack |
| **Level** | Senior |
| **YOE** | 8 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Google Cloud Storage |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Googliness)

---

## Round 1: Coding
**Duration:** 45 minutes

### Questions Asked
1. **Design Hit Counter** (LeetCode 362) — O(1) amortized
2. **Follow-up: Make it thread-safe and distributed**

### 💡 Hit Counter with Circular Buffer

```java
class HitCounter {
    private final int windowSeconds;
    private final int[] hits;
    private final int[] timestamps;
    
    HitCounter(int windowSeconds) {
        this.windowSeconds = windowSeconds;
        this.hits = new int[windowSeconds];
        this.timestamps = new int[windowSeconds];
    }
    
    void hit(int timestamp) {
        int idx = timestamp % windowSeconds;
        if (timestamps[idx] != timestamp) {
            // New second — reset bucket
            timestamps[idx] = timestamp;
            hits[idx] = 1;
        } else {
            hits[idx]++;
        }
    }
    
    int getHits(int timestamp) {
        int total = 0;
        for (int i = 0; i < windowSeconds; i++) {
            if (timestamp - timestamps[i] < windowSeconds) {
                total += hits[i];
            }
        }
        return total;
    }
}
// Time: hit O(1), getHits O(windowSeconds) — constant since window is fixed
// Space: O(windowSeconds)

// Thread-safe version
class ConcurrentHitCounter {
    private final int windowSeconds;
    private final AtomicIntegerArray hits;
    private final AtomicIntegerArray timestamps;
    
    void hit(int timestamp) {
        int idx = timestamp % windowSeconds;
        // CAS loop for thread safety
        while (true) {
            int oldTs = timestamps.get(idx);
            if (oldTs == timestamp) {
                hits.incrementAndGet(idx);
                return;
            }
            if (timestamps.compareAndSet(idx, oldTs, timestamp)) {
                hits.set(idx, 1);
                return;
            }
        }
    }
    
    int getHits(int timestamp) {
        int total = 0;
        for (int i = 0; i < windowSeconds; i++) {
            if (timestamp - timestamps.get(i) < windowSeconds) {
                total += hits.get(i);
            }
        }
        return total;
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Google Pub/Sub Messaging System**
   - Publisher-subscriber with topics
   - At-least-once delivery guarantee
   - Subscription types: push (webhook) + pull
   - Message ordering within partition
   - Dead letter queue for failed messages
   - Message replay (seek to timestamp)

### 💡 Key Design

```
Architecture:
┌──────────┐                           ┌──────────┐
│ Publisher │──publish──▶ ┌────────┐ ──▶│Subscriber│
│  Client   │            │  Topic  │    │  Client  │
└──────────┘            └────┬───┘    └──────────┘
                             │
                  ┌──────────┼──────────┐
                  │          │          │
             ┌────▼───┐ ┌───▼────┐ ┌──▼──────┐
             │Sub A   │ │Sub B   │ │Sub C    │
             │(push)  │ │(pull)  │ │(pull)   │
             │webhook │ │        │ │         │
             └────────┘ └────────┘ └─────────┘

Storage Layer (Append-Only Log):
┌─────────────────────────────────────────────┐
│  Topic: "orders"                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │Partition0│ │Partition1│ │Partition2│       │
│  │ msg_001  │ │ msg_002  │ │ msg_004  │       │
│  │ msg_003  │ │ msg_005  │ │ msg_007  │       │
│  │ msg_006  │ │ msg_008  │ │ msg_009  │       │
│  └─────────┘ └─────────┘ └─────────┘       │
└─────────────────────────────────────────────┘

Data Model:
CREATE TABLE messages (
    topic_id UUID,
    partition_id INT,
    sequence_num BIGINT, -- Monotonically increasing per partition
    message_id UUID,
    payload BYTES,
    attributes MAP<TEXT, TEXT>,
    publish_time TIMESTAMP,
    ordering_key TEXT,
    PRIMARY KEY ((topic_id, partition_id), sequence_num)
) WITH CLUSTERING ORDER BY (sequence_num ASC);

CREATE TABLE subscriptions (
    subscription_id UUID PRIMARY KEY,
    topic_id UUID,
    type TEXT, -- 'push' or 'pull'
    push_endpoint TEXT, -- For push subscriptions
    ack_deadline_seconds INT DEFAULT 30,
    max_delivery_attempts INT DEFAULT 5,
    dead_letter_topic_id UUID,
    filter TEXT, -- CEL expression for filtering
    seek_position BIGINT, -- For message replay
);

CREATE TABLE subscription_cursors (
    subscription_id UUID,
    partition_id INT,
    acked_sequence BIGINT, -- Last acknowledged sequence number
    PRIMARY KEY (subscription_id, partition_id)
);

Message Delivery Service:
class MessageDeliveryService {
    // Pull: subscriber polls for messages
    List<Message> pull(String subscriptionId, int maxMessages) {
        Subscription sub = subscriptionRepo.findById(subscriptionId);
        List<Message> messages = new ArrayList<>();
        
        for (int partId : getPartitions(sub.topicId)) {
            long lastAcked = cursorRepo.getAckedSequence(subscriptionId, partId);
            
            // Fetch unacked messages from storage
            List<Message> batch = messageStore.getMessages(
                sub.topicId, partId,
                lastAcked + 1, // Start after last acked
                maxMessages - messages.size()
            );
            
            // Apply subscription filter
            if (sub.filter != null) {
                batch = batch.stream()
                    .filter(msg -> celEvaluator.evaluate(sub.filter, msg.attributes))
                    .toList();
            }
            
            // Track delivery (for ack deadline)
            for (Message msg : batch) {
                deliveryTracker.startDeadline(
                    subscriptionId, msg.id, sub.ackDeadlineSeconds
                );
            }
            
            messages.addAll(batch);
            if (messages.size() >= maxMessages) break;
        }
        
        return messages;
    }
    
    // Acknowledge: mark messages as processed
    void acknowledge(String subscriptionId, List<String> messageIds) {
        for (String msgId : messageIds) {
            deliveryTracker.cancelDeadline(subscriptionId, msgId);
            
            // Advance cursor
            Message msg = messageStore.getMessage(msgId);
            cursorRepo.updateAckedSequence(
                subscriptionId, msg.partitionId,
                Math.max(cursorRepo.getAcked(subscriptionId, msg.partitionId), msg.sequenceNum)
            );
        }
    }
    
    // Nack: message will be redelivered after deadline
    void nack(String subscriptionId, String messageId) {
        deliveryTracker.resetDeadline(subscriptionId, messageId);
    }
    
    // Dead letter: after max attempts, move to DLQ topic
    void handleDeadLetter(String subscriptionId, Message message) {
        Subscription sub = subscriptionRepo.findById(subscriptionId);
        
        if (message.deliveryAttempts >= sub.maxDeliveryAttempts) {
            if (sub.deadLetterTopicId != null) {
                // Republish to dead letter topic
                publisher.publish(sub.deadLetterTopicId, message.payload,
                    Map.of("original_topic", sub.topicId.toString(),
                           "delivery_attempts", String.valueOf(message.deliveryAttempts),
                           "failure_reason", message.lastError));
            }
            // Acknowledge original (remove from queue)
            acknowledge(subscriptionId, List.of(message.id));
        }
    }
    
    // Seek: replay messages from a timestamp
    void seek(String subscriptionId, Instant timestamp) {
        Subscription sub = subscriptionRepo.findById(subscriptionId);
        
        for (int partId : getPartitions(sub.topicId)) {
            // Binary search for sequence number at timestamp
            long seqNum = messageStore.findSequenceAtTimestamp(sub.topicId, partId, timestamp);
            cursorRepo.updateAckedSequence(subscriptionId, partId, seqNum - 1);
        }
        // Next pull will start from the sought position
    }
}

Scale:
- 1M topics, 10B messages/day
- Message retention: 7 days default (configurable up to 365 days)
- Throughput: 100K messages/sec per topic
- End-to-end latency: < 100ms (publish to pull availability)
- Storage: append-only log in distributed file system (Colossus)
- Partitioning: ordering_key → consistent hash → partition
```

---

## 🎯 Key Takeaways
- Google = **distributed systems + correctness + scale**
- **Hit counter circular buffer**: `timestamp % windowSize` for bucket index, check freshness before counting
- **Thread-safe with CAS**: `AtomicIntegerArray` + `compareAndSet` — lock-free for high throughput
- **Pub/Sub design**: append-only log + subscription cursors + ack deadlines
- **At-least-once delivery**: ack deadline timer → if not acked, redeliver → DLQ after max attempts
- **Message ordering**: ordering_key → same partition → sequential delivery within partition
- **Seek/replay**: binary search on publish_time → reset subscription cursor → reprocess messages
- **Dead Letter Queue**: separate topic for failed messages — enables debugging and retry

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding 1 | Medium | Hit Counter, Circular Buffer |
| Coding 2 | Medium-Hard | Graph, BFS/DFS |
| System Design | Hard | Pub/Sub, Message Queue, Ordering |
| Googliness | Medium | Behavioral |
