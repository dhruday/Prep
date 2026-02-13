# 110. Event De-duplication

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Event De-duplication** is the process of identifying and filtering out **duplicate events** in real-time systems. Network retries, server failovers, and client reconnections can cause the same event to be received multiple times, leading to incorrect application state if not handled.

### **What It Is:**
- **Duplicate detection**: Identify events already processed
- **Idempotent handling**: Process same event multiple times safely
- **Unique identifiers**: Use IDs to track processed events
- **Time windows**: Remember recent events to detect duplicates
- **Hash-based detection**: Use content hashing for stateless events

### **Why It Matters:**
- **Data integrity**: Prevents double-processing (e.g., double-charging)
- **UI consistency**: Avoids duplicate chat messages, notifications
- **Performance**: Reduces unnecessary re-renders
- **Correctness**: Critical for financial transactions, inventory

### **When and Where Used:**
- Chat applications (duplicate messages)
- Payment systems (duplicate transactions)
- Notifications (duplicate alerts)
- Real-time feeds (duplicate posts)
- Event streams (duplicate events)
- WebSocket reconnections

### **Role in Large-Scale Applications:**
At FAANG scale:
- **Billions of events** daily, many duplicates from retries
- **Distributed systems**: Same event from multiple sources
- **At-least-once delivery**: Message queues guarantee delivery but may duplicate
- **Bloom filters**: Efficient duplicate detection for high-volume streams
- **Monitoring**: Track deduplication rate, false positives

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. ID-Based De-duplication**

#### **1. Simple Set-Based**
```javascript
class EventDeduplicator {
  constructor(maxSize = 1000) {
    this.seen = new Set();
    this.maxSize = maxSize;
  }
  
  isDuplicate(eventId) {
    if (this.seen.has(eventId)) {
      return true; // Duplicate
    }
    
    this.seen.add(eventId);
    
    // Prevent unbounded growth
    if (this.seen.size > this.maxSize) {
      // Remove oldest (in insertion order)
      const firstKey = this.seen.values().next().value;
      this.seen.delete(firstKey);
    }
    
    return false;
  }
  
  clear() {
    this.seen.clear();
  }
}

// Usage
const dedup = new EventDeduplicator(1000);

socket.on('message', (event) => {
  if (dedup.isDuplicate(event.id)) {
    console.log('Duplicate event detected, ignoring');
    return;
  }
  
  // Process event
  processEvent(event);
});
```

#### **2. Time-Window Based (LRU)**
```javascript
class TimeWindowDeduplicator {
  constructor(windowMs = 60000) {
    this.seen = new Map(); // eventId -> timestamp
    this.windowMs = windowMs;
  }
  
  isDuplicate(eventId) {
    const now = Date.now();
    const lastSeen = this.seen.get(eventId);
    
    if (lastSeen && now - lastSeen < this.windowMs) {
      return true; // Duplicate within window
    }
    
    // Update timestamp
    this.seen.set(eventId, now);
    
    // Clean old entries
    this.cleanOldEntries(now);
    
    return false;
  }
  
  cleanOldEntries(now) {
    // Remove entries older than window
    for (const [id, timestamp] of this.seen.entries()) {
      if (now - timestamp >= this.windowMs) {
        this.seen.delete(id);
      }
    }
  }
  
  clear() {
    this.seen.clear();
  }
}

// Usage
const dedup = new TimeWindowDeduplicator(60000); // 1 minute window

socket.on('event', (event) => {
  if (dedup.isDuplicate(event.id)) {
    console.log('Duplicate within 1 minute window');
    return;
  }
  
  processEvent(event);
});
```

#### **3. Sliding Window with Scheduled Cleanup**
```javascript
class SlidingWindowDeduplicator {
  constructor(windowMs = 60000, cleanupIntervalMs = 10000) {
    this.seen = new Map();
    this.windowMs = windowMs;
    
    // Periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }
  
  isDuplicate(eventId) {
    const now = Date.now();
    const entry = this.seen.get(eventId);
    
    if (entry && now - entry.timestamp < this.windowMs) {
      entry.count++; // Track duplicate count
      return true;
    }
    
    this.seen.set(eventId, { timestamp: now, count: 1 });
    return false;
  }
  
  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [id, entry] of this.seen.entries()) {
      if (now - entry.timestamp >= this.windowMs) {
        this.seen.delete(id);
        removed++;
      }
    }
    
    console.log(`Cleaned up ${removed} old entries`);
  }
  
  destroy() {
    clearInterval(this.cleanupInterval);
    this.seen.clear();
  }
}
```

---

### **B. Content-Based De-duplication**

#### **1. Hash-Based (for stateless events)**
```javascript
function hashEvent(event) {
  // Create hash from event content (excluding timestamps)
  const { timestamp, ...content } = event;
  return JSON.stringify(content);
}

class ContentDeduplicator {
  constructor(windowMs = 60000) {
    this.seen = new Map(); // hash -> timestamp
    this.windowMs = windowMs;
  }
  
  isDuplicate(event) {
    const hash = hashEvent(event);
    const now = Date.now();
    const lastSeen = this.seen.get(hash);
    
    if (lastSeen && now - lastSeen < this.windowMs) {
      return true;
    }
    
    this.seen.set(hash, now);
    return false;
  }
}

// Usage for events without IDs
const dedup = new ContentDeduplicator();

socket.on('notification', (event) => {
  if (dedup.isDuplicate(event)) {
    console.log('Duplicate notification (same content)');
    return;
  }
  
  showNotification(event);
});
```

#### **2. Crypto Hash (more robust)**
```javascript
async function cryptoHashEvent(event) {
  const { timestamp, ...content } = event;
  const str = JSON.stringify(content);
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

class CryptoDeduplicator {
  constructor() {
    this.seen = new Set();
  }
  
  async isDuplicate(event) {
    const hash = await cryptoHashEvent(event);
    
    if (this.seen.has(hash)) {
      return true;
    }
    
    this.seen.add(hash);
    return false;
  }
}
```

---

### **C. React Component De-duplication**

#### **1. Chat Messages**
```javascript
function ChatMessages() {
  const [messages, setMessages] = useState([]);
  const seenIds = useRef(new Set());
  
  useEffect(() => {
    socket.on('message', (message) => {
      // Check for duplicate
      if (seenIds.current.has(message.id)) {
        console.log(`Duplicate message ${message.id} ignored`);
        return;
      }
      
      // Add to seen set
      seenIds.current.add(message.id);
      
      // Add to messages
      setMessages(prev => [...prev, message]);
      
      // Limit seen set size
      if (seenIds.current.size > 1000) {
        // Remove oldest (can't easily do with Set, so clear periodically)
        seenIds.current.clear();
        messages.forEach(msg => seenIds.current.add(msg.id));
      }
    });
    
    return () => socket.off('message');
  }, []);
  
  return (
    <div className="messages">
      {messages.map(msg => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  );
}
```

#### **2. Custom Hook for De-duplication**
```javascript
function useDeduplicatedEvents(eventName, handler, windowMs = 60000) {
  const seenRef = useRef(new Map());
  
  useEffect(() => {
    const wrappedHandler = (event) => {
      const now = Date.now();
      const lastSeen = seenRef.current.get(event.id);
      
      if (lastSeen && now - lastSeen < windowMs) {
        console.log(`Duplicate ${eventName} event ${event.id}`);
        return;
      }
      
      seenRef.current.set(event.id, now);
      
      // Cleanup old entries periodically
      if (seenRef.current.size > 1000) {
        for (const [id, timestamp] of seenRef.current.entries()) {
          if (now - timestamp >= windowMs) {
            seenRef.current.delete(id);
          }
        }
      }
      
      handler(event);
    };
    
    socket.on(eventName, wrappedHandler);
    
    return () => socket.off(eventName, wrappedHandler);
  }, [eventName, handler, windowMs]);
}

// Usage
function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  
  const handleNotification = useCallback((notification) => {
    setNotifications(prev => [...prev, notification]);
    showToast(notification.message);
  }, []);
  
  useDeduplicatedEvents('notification', handleNotification, 30000);
  
  return <NotificationList notifications={notifications} />;
}
```

---

### **D. Server-Side De-duplication**

#### **1. Database-Based**
```javascript
// Idempotency key pattern
app.post('/api/payment', async (req, res) => {
  const { idempotencyKey, amount, userId } = req.body;
  
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'idempotencyKey required' });
  }
  
  try {
    // Check if this request was already processed
    const existing = await db.payments.findOne({ idempotencyKey });
    
    if (existing) {
      // Duplicate request - return cached result
      console.log(`Duplicate payment request: ${idempotencyKey}`);
      return res.json(existing.result);
    }
    
    // Process payment
    const result = await processPayment({ amount, userId });
    
    // Store result with idempotency key
    await db.payments.insert({
      idempotencyKey,
      userId,
      amount,
      result,
      timestamp: Date.now()
    });
    
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Client generates idempotency key
async function submitPayment(amount) {
  const idempotencyKey = `payment-${Date.now()}-${Math.random()}`;
  
  try {
    const response = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey, amount, userId: currentUser.id })
    });
    
    return await response.json();
  } catch (error) {
    // Retry with same idempotency key - will not double-charge
    console.log('Retrying payment with same idempotency key');
    const response = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey, amount, userId: currentUser.id })
    });
    
    return await response.json();
  }
}
```

#### **2. Redis-Based (Distributed)**
```javascript
const redis = require('redis');
const client = redis.createClient();

async function deduplicateEvent(eventId, handler) {
  const key = `dedup:${eventId}`;
  const ttl = 60; // 1 minute
  
  // Check if event was already processed
  const exists = await client.exists(key);
  
  if (exists) {
    console.log(`Duplicate event: ${eventId}`);
    return false; // Duplicate
  }
  
  // Mark as processed
  await client.setex(key, ttl, '1');
  
  // Process event
  await handler();
  
  return true; // Processed
}

// Usage
socket.on('event', async (event) => {
  const processed = await deduplicateEvent(event.id, async () => {
    await processEvent(event);
  });
  
  if (processed) {
    console.log('Event processed successfully');
  }
});
```

---

### **E. Bloom Filter (High Performance)**

#### **1. Space-Efficient De-duplication**
```javascript
class BloomFilter {
  constructor(size = 10000, hashCount = 3) {
    this.bits = new Uint8Array(size);
    this.size = size;
    this.hashCount = hashCount;
  }
  
  hash(str, seed) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.size;
  }
  
  add(item) {
    const str = String(item);
    
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.hash(str, i);
      this.bits[index] = 1;
    }
  }
  
  probablyContains(item) {
    const str = String(item);
    
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.hash(str, i);
      if (this.bits[index] === 0) {
        return false; // Definitely not present
      }
    }
    
    return true; // Probably present (may be false positive)
  }
  
  clear() {
    this.bits.fill(0);
  }
}

// Usage for high-volume streams
const bloom = new BloomFilter(10000, 3);

socket.on('event', (event) => {
  if (bloom.probablyContains(event.id)) {
    // Probably duplicate (may be false positive)
    // Double-check with exact method if critical
    if (exactDedup.isDuplicate(event.id)) {
      console.log('Confirmed duplicate');
      return;
    }
  }
  
  bloom.add(event.id);
  processEvent(event);
});
```

---

### **F. React State De-duplication**

#### **1. Prevent Duplicate State Updates**
```javascript
function useUniqueEvents() {
  const [events, setEvents] = useState([]);
  const eventIds = useRef(new Set());
  
  const addEvent = useCallback((event) => {
    if (eventIds.current.has(event.id)) {
      return false; // Duplicate
    }
    
    eventIds.current.add(event.id);
    
    setEvents(prev => {
      // Double-check in state (in case of race condition)
      if (prev.some(e => e.id === event.id)) {
        return prev;
      }
      return [...prev, event];
    });
    
    return true; // Added
  }, []);
  
  return [events, addEvent];
}

// Usage
function EventFeed() {
  const [events, addEvent] = useUniqueEvents();
  
  useEffect(() => {
    socket.on('event', (event) => {
      const added = addEvent(event);
      if (!added) {
        console.log('Duplicate event ignored');
      }
    });
    
    return () => socket.off('event');
  }, [addEvent]);
  
  return (
    <div className="feed">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

---

### **G. Monitoring & Metrics**

#### **1. Track Deduplication Stats**
```javascript
class DeduplicationMetrics {
  constructor() {
    this.metrics = {
      totalEvents: 0,
      uniqueEvents: 0,
      duplicates: 0,
      duplicateRate: 0
    };
  }
  
  recordEvent(isDuplicate) {
    this.metrics.totalEvents++;
    
    if (isDuplicate) {
      this.metrics.duplicates++;
    } else {
      this.metrics.uniqueEvents++;
    }
    
    this.metrics.duplicateRate = this.metrics.totalEvents > 0
      ? this.metrics.duplicates / this.metrics.totalEvents
      : 0;
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
  
  reset() {
    this.metrics = {
      totalEvents: 0,
      uniqueEvents: 0,
      duplicates: 0,
      duplicateRate: 0
    };
  }
}

const metrics = new DeduplicationMetrics();

// Enhanced deduplicator with metrics
class MeteredDeduplicator extends TimeWindowDeduplicator {
  isDuplicate(eventId) {
    const duplicate = super.isDuplicate(eventId);
    metrics.recordEvent(duplicate);
    return duplicate;
  }
}

// Send metrics
setInterval(() => {
  const data = metrics.getMetrics();
  
  if (data.duplicateRate > 0.1) {
    console.warn('High duplicate rate:', data);
  }
  
  analytics.track('deduplication_metrics', data);
  metrics.reset();
}, 60000);
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Stripe Payments**
- Idempotency keys for all API requests
- Stores results for 24 hours
- Same key returns cached result
- Critical for preventing double-charges
- Client generates unique key per request

### **Example 2: Slack**
- Message IDs for de-duplication
- 5-minute window for detecting duplicates
- Handles reconnection duplicates gracefully
- Shows "This message has been deleted" for removed duplicates
- Bloom filter for high-volume channels

### **Example 3: WhatsApp**
- Content-based hashing for messages
- 1-minute de-duplication window
- Handles network retry duplicates
- Server assigns unique IDs
- Client maintains seen set of recent message IDs

### **Example 4: Twitter / X**
- Tweet IDs for de-duplication
- Real-time feed uses Bloom filter
- 10-minute window for duplicate detection
- Handles duplicates from multiple data centers
- Shows "You've already seen this" for old duplicates

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"Event de-duplication prevents processing the same event multiple times, which is critical for correctness—especially in payments where duplicate processing means double-charging."*
>
> *"I'd use ID-based de-duplication with a time window. Maintain a Map of eventId → timestamp for events seen in the last 60 seconds. When a new event arrives, check if its ID exists in the map and was seen recently. If yes, it's a duplicate—ignore it. If no, add to map and process."*
>
> *"For memory efficiency, periodically clean old entries from the map—anything older than the window can be removed. Alternatively, use a sliding window with scheduled cleanup every 10 seconds."*
>
> *"For server-side de-duplication, use idempotency keys stored in the database. For a payment API, the client sends an idempotency key with each request. Server checks if this key exists in the database—if yes, return cached result instead of processing again. This makes retries safe."*
>
> *"For high-volume streams where memory is constrained, use a Bloom filter for probabilistic de-duplication—it can check millions of IDs with minimal memory. It may have false positives (thinks it's a duplicate when it's not) but never false negatives, so use it as a first-pass filter before exact checking."*
>
> *"Track deduplication rate—if >10%, indicates network issues or client bugs causing excessive retries. Monitor false positive rate for Bloom filters to tune parameters."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive implementations.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Correctness**: Prevents double-processing (double-charging, duplicate notifications)
- **Performance**: Reduces unnecessary work
- **UX**: Avoids duplicate UI elements
- **Data integrity**: Maintains consistent state

### **How It Works**
1. **ID tracking**: Remember processed event IDs
2. **Time window**: Keep only recent IDs in memory
3. **Content hashing**: For events without IDs
4. **Idempotency keys**: Server-side de-duplication
5. **Bloom filter**: Space-efficient probabilistic detection
6. **Cleanup**: Remove old entries periodically

### **Best Practices**
- 60-second time window for most cases
- Idempotency keys for critical operations (payments)
- Bloom filter for high-volume (millions of events)
- Monitor duplicate rate (should be <5%)
- Server-side de-duplication for critical paths
- Client-side for UX (chat messages, notifications)
