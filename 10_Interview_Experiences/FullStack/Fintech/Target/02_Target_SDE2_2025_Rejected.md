# Target — SDE-2 FullStack Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Lead Engineer |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/target-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (DSA + LLD + HLD + Bar Raiser)
- **Rejection Reason:** LLD round — didn't implement Observer pattern for notifications
- **Timeline:** 1 week

---

## Round 1: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Task Scheduler** (LeetCode 621)
2. **Follow-up: What if tasks have dependencies (like Course Schedule)?**

### 💡 Interview-Ready Answer

```java
// Tasks with cooldown
public int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char t : tasks) freq[t - 'A']++;
    
    Arrays.sort(freq);
    int maxFreq = freq[25];
    int idleSlots = (maxFreq - 1) * n;
    
    // Fill idle slots with other tasks (most frequent first)
    for (int i = 24; i >= 0 && freq[i] > 0; i--) {
        idleSlots -= Math.min(freq[i], maxFreq - 1);
    }
    
    return tasks.length + Math.max(0, idleSlots);
}
// Time: O(n), Space: O(1)

// Math explanation:
// If max freq task is 'A' with freq=3, cooldown=2:
// A _ _ A _ _ A → (maxFreq-1) * (n+1) + count_of_max_freq_tasks
// Fill blanks with other tasks. If more tasks than blanks, no idle needed.

// Follow-up: Tasks with dependencies → topological sort + resource constraints
// Use Kahn's BFS with PriorityQueue (prefer tasks with most dependents)
public int scheduleTasks(int numTasks, int[][] deps, int cooldown) {
    // Build graph
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[numTasks];
    for (int i = 0; i < numTasks; i++) graph.add(new ArrayList<>());
    for (int[] dep : deps) {
        graph.get(dep[0]).add(dep[1]);
        inDegree[dep[1]]++;
    }
    
    // BFS with timestamp tracking for cooldown
    Queue<Integer> available = new LinkedList<>();
    for (int i = 0; i < numTasks; i++) {
        if (inDegree[i] == 0) available.offer(i);
    }
    
    Map<Integer, Integer> lastRun = new HashMap<>(); // task → last timestamp
    int time = 0, completed = 0;
    
    while (completed < numTasks) {
        Queue<Integer> nextRound = new LinkedList<>();
        boolean ranTask = false;
        
        // Find task that can run (no cooldown violation)
        Queue<Integer> deferred = new LinkedList<>();
        while (!available.isEmpty()) {
            int task = available.poll();
            if (lastRun.containsKey(task) && time - lastRun.get(task) <= cooldown) {
                deferred.offer(task);
                continue;
            }
            
            // Run this task
            lastRun.put(task, time);
            completed++;
            ranTask = true;
            
            for (int next : graph.get(task)) {
                if (--inDegree[next] == 0) nextRound.offer(next);
            }
            break;
        }
        
        // Put deferred tasks back
        while (!deferred.isEmpty()) available.offer(deferred.poll());
        while (!nextRound.isEmpty()) available.offer(nextRound.poll());
        
        time++; // Advance time (even if idle)
    }
    
    return time;
}
```

---

## Round 2: LLD
**Duration:** 60 minutes

### Questions Asked
1. **Design an E-Commerce Notification System**
   - Email, SMS, Push notifications for order events, preferences management

### 💡 Interview-Ready Answer

```java
// Observer Pattern + Strategy Pattern

// Notification types
enum NotificationChannel { EMAIL, SMS, PUSH }
enum EventType { ORDER_PLACED, ORDER_SHIPPED, ORDER_DELIVERED, PAYMENT_FAILED, PRICE_DROP }

// Strategy for each channel
interface NotificationSender {
    boolean send(String userId, String title, String body, Map<String, String> metadata);
    NotificationChannel getChannel();
}

class EmailSender implements NotificationSender {
    @Override
    public boolean send(String userId, String title, String body, Map<String, String> metadata) {
        String email = getUserEmail(userId);
        // SMTP / SES API call
        System.out.printf("EMAIL to %s: %s - %s%n", email, title, body);
        return true;
    }
    
    @Override
    public NotificationChannel getChannel() { return NotificationChannel.EMAIL; }
}

class SmsSender implements NotificationSender {
    @Override
    public boolean send(String userId, String title, String body, Map<String, String> metadata) {
        String phone = getUserPhone(userId);
        // Twilio / SNS API call
        System.out.printf("SMS to %s: %s%n", phone, body);
        return true;
    }
    
    @Override
    public NotificationChannel getChannel() { return NotificationChannel.SMS; }
}

class PushNotificationSender implements NotificationSender {
    @Override
    public boolean send(String userId, String title, String body, Map<String, String> metadata) {
        List<String> deviceTokens = getDeviceTokens(userId);
        // FCM / APNs API call
        for (String token : deviceTokens) {
            System.out.printf("PUSH to %s: %s - %s%n", token, title, body);
        }
        return true;
    }
    
    @Override
    public NotificationChannel getChannel() { return NotificationChannel.PUSH; }
}

// Template for different events
interface NotificationTemplate {
    String getTitle(Map<String, String> context);
    String getBody(Map<String, String> context);
    EventType getEventType();
}

class OrderShippedTemplate implements NotificationTemplate {
    @Override
    public String getTitle(Map<String, String> ctx) {
        return "Your order #" + ctx.get("orderId") + " has been shipped!";
    }
    
    @Override
    public String getBody(Map<String, String> ctx) {
        return String.format("Your order is on its way! Track: %s. Estimated delivery: %s",
            ctx.get("trackingUrl"), ctx.get("eta"));
    }
    
    @Override
    public EventType getEventType() { return EventType.ORDER_SHIPPED; }
}

// User preferences
class NotificationPreference {
    private final String userId;
    private final Map<EventType, Set<NotificationChannel>> preferences;
    
    // User can opt-in/out per event type per channel
    // Default: all channels enabled for order events
    // Marketing (PRICE_DROP): only if explicitly opted in
    
    Set<NotificationChannel> getEnabledChannels(EventType eventType) {
        return preferences.getOrDefault(eventType, 
            Set.of(NotificationChannel.EMAIL, NotificationChannel.PUSH));
    }
}

// Main service — coordinates everything
class NotificationService {
    private final Map<NotificationChannel, NotificationSender> senders = new HashMap<>();
    private final Map<EventType, NotificationTemplate> templates = new HashMap<>();
    private final NotificationPreferenceStore prefStore;
    private final NotificationLogStore logStore;
    
    // Rate limiter: max 10 notifications per user per hour
    private final Map<String, Deque<Long>> rateLimiter = new ConcurrentHashMap<>();
    
    void notify(String userId, EventType eventType, Map<String, String> context) {
        // 1. Check rate limit
        if (isRateLimited(userId)) {
            logStore.log(userId, eventType, "RATE_LIMITED");
            return;
        }
        
        // 2. Get user preferences
        NotificationPreference prefs = prefStore.get(userId);
        Set<NotificationChannel> channels = prefs.getEnabledChannels(eventType);
        
        // 3. Get template
        NotificationTemplate template = templates.get(eventType);
        String title = template.getTitle(context);
        String body = template.getBody(context);
        
        // 4. Send via each enabled channel
        for (NotificationChannel channel : channels) {
            NotificationSender sender = senders.get(channel);
            try {
                boolean success = sender.send(userId, title, body, context);
                logStore.log(userId, eventType, channel, success ? "SENT" : "FAILED");
            } catch (Exception e) {
                logStore.log(userId, eventType, channel, "ERROR: " + e.getMessage());
                // Retry via dead letter queue
            }
        }
    }
    
    private boolean isRateLimited(String userId) {
        Deque<Long> timestamps = rateLimiter.computeIfAbsent(userId, k -> new ConcurrentLinkedDeque<>());
        long now = System.currentTimeMillis();
        long oneHourAgo = now - 3600_000;
        
        // Remove old entries
        while (!timestamps.isEmpty() && timestamps.peekFirst() < oneHourAgo) {
            timestamps.pollFirst();
        }
        
        if (timestamps.size() >= 10) return true;
        timestamps.addLast(now);
        return false;
    }
}
```

---

## Round 3: System Design (HLD)
**Duration:** 60 minutes

### Questions Asked
1. **Design Target's Inventory & Pricing System**
   - Real-time inventory across 1900 stores + online, dynamic pricing for promotions

### 💡 Interview-Ready Answer

```
Target Inventory + Pricing:
┌──────────────────────────────────────────────────────────────┐
│  Scale:                                                       │
│  - 1,900 physical stores + online                            │
│  - ~100K SKUs per store, ~500K online                        │
│  - Inventory updates: 10M events/day (sales, returns, restock)│
│                                                                │
│  Inventory Architecture:                                      │
│  - Source of truth: per-store inventory in local POS system  │
│  - Central inventory: aggregated view in real-time via Kafka │
│  - Online inventory = SUM(available - reserved) across stores│
│                                                                │
│  Event Flow:                                                  │
│  POS Sale → Kafka (inventory_events) → Inventory Service    │
│  → Update PostgreSQL (per-store inventory)                   │
│  → Update Redis (aggregate available quantity)               │
│  → If quantity < threshold → trigger restock alert           │
│                                                                │
│  Reservation (Online Order):                                  │
│  1. Customer adds to cart → soft reserve (Redis TTL 15 min)  │
│  2. Customer completes checkout → hard reserve (DB)          │
│  3. Store picks item → mark as allocated                     │
│  4. If cart expires → release reservation                    │
│                                                                │
│  Redis command for atomic reservation:                        │
│  EVAL "if redis.call('GET', KEYS[1]) >= ARGV[1] then        │
│    redis.call('DECRBY', KEYS[1], ARGV[1]) return 1          │
│    else return 0 end" 1 sku:12345:available 1                │
│                                                                │
│  Dynamic Pricing:                                             │
│  - Base price: set by merchandising team                     │
│  - Promotions: scheduled rules (BOGO, 20% off category)     │
│  - Clearance: automatic markdown when overstock detected     │
│  - Competitor matching: scrape + match within margin         │
│                                                                │
│  Price Calculation: applied in priority order:                │
│  1. Check employee discount (if applicable)                  │
│  2. Check active promotions (most specific wins)             │
│  3. Check clearance rules                                    │
│  4. Apply loyalty discount (RedCard: 5%)                     │
│  5. Final price = MAX(base_price * 0.5, calculated_price)    │
│     (never more than 50% off to prevent pricing errors)      │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Target = **e-commerce focused** — inventory, pricing, checkout are core topics
- **Task Scheduler** (LeetCode 621) → formula-based O(n), not simulation → cleaner
- **Notification System LLD** = Observer + Strategy + Template patterns combined
- I **got rejected because** I didn't implement Observer pattern — Target LLD round expects clean design patterns
- **Atomic inventory reservation** via Redis Lua script — prevents overselling
- **Dynamic pricing** with priority rules and safety floor (never > 50% off)
- Target values **retail domain knowledge** — mention stores, fulfillment, RedCard

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium | Task Scheduler, Topological Sort |
| LLD | Hard | Observer, Strategy, Template Patterns |
| HLD | Hard | Inventory, Dynamic Pricing, Redis |
| Bar Raiser | Medium | Behavioral + LP |
