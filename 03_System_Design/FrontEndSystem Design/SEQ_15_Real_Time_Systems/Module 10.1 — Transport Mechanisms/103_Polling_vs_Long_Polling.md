# 103. Polling vs Long Polling

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Polling** and **Long Polling** are HTTP-based techniques for implementing real-time or near-real-time communication between a client (browser) and server when bidirectional protocols like WebSockets are not available or appropriate.

### **What They Are:**

#### **1. Polling (Short Polling)**
- Client repeatedly requests server for updates at fixed intervals (e.g., every 5 seconds)
- Server responds immediately with current data (even if unchanged)
- Simple request-response cycle

#### **2. Long Polling**
- Client requests server for updates
- Server **holds the connection open** until new data is available (or timeout)
- Once data arrives, server responds, and client immediately sends a new request
- Mimics real-time behavior over HTTP

### **Why They Exist:**
- **Fallback mechanism** when WebSockets unavailable (firewall, proxy, old browsers)
- **Simpler** than WebSocket implementation
- **HTTP-compatible** with existing infrastructure
- **Good enough** for low-frequency updates

### **When Used:**
- Notification systems (email, alerts)
- Live dashboards with infrequent updates
- Chat applications (legacy support)
- Stock tickers, sports scores
- Progressive enhancement strategy

### **Role in Large-Scale Applications:**
At FAANG scale:
- **Billions of polling requests** → massive server load
- **Intelligent backoff** strategies to reduce load
- **Hybrid approaches**: polling for discovery, WebSocket for data
- **Cost optimization**: polling is expensive (compute + bandwidth)
- **Graceful degradation**: fallback when WebSocket fails

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Short Polling**

#### **1. How It Works**
```javascript
// Client-side short polling implementation
class ShortPolling {
  constructor(url, interval = 5000) {
    this.url = url;
    this.interval = interval;
    this.intervalId = null;
    this.isRunning = false;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Initial fetch
    this.fetchData();
    
    // Schedule periodic fetches
    this.intervalId = setInterval(() => {
      this.fetchData();
    }, this.interval);
  }
  
  async fetchData() {
    try {
      const response = await fetch(this.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process new data
      this.onData(data);
      
    } catch (error) {
      console.error('Polling error:', error);
      this.onError(error);
    }
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }
  
  // Override these methods
  onData(data) {
    console.log('Received:', data);
  }
  
  onError(error) {
    console.error('Error:', error);
  }
}

// Usage
const poller = new ShortPolling('/api/notifications', 5000);
poller.onData = (data) => {
  updateUI(data);
};
poller.start();
```

#### **2. Server-Side Implementation**
```javascript
// Express endpoint for short polling
app.get('/api/notifications', async (req, res) => {
  const userId = req.user.id;
  
  // Fetch latest notifications
  const notifications = await db.notifications.find({
    userId,
    read: false
  }).limit(20);
  
  res.json({
    timestamp: Date.now(),
    notifications
  });
});
```

#### **3. Characteristics**
- ✅ **Simple**: Easy to implement and debug
- ✅ **Stateless**: No server state between requests
- ❌ **Inefficient**: Most requests return no new data (empty responses)
- ❌ **Latency**: Average delay = `interval / 2`
- ❌ **Resource intensive**: Constant requests even when idle

#### **4. Network Pattern**
```
Client                    Server
  |                         |
  |------- GET /api ------->| (Request 1)
  |<------ 200 OK ----------| (No new data)
  |                         |
  [Wait 5 seconds]          |
  |                         |
  |------- GET /api ------->| (Request 2)
  |<------ 200 OK ----------| (No new data)
  |                         |
  [Wait 5 seconds]          |
  |                         |
  |------- GET /api ------->| (Request 3)
  |<------ 200 OK ----------| (New data!)
  |                         |
```

---

### **B. Long Polling**

#### **1. How It Works**
```javascript
// Client-side long polling implementation
class LongPolling {
  constructor(url, timeout = 30000) {
    this.url = url;
    this.timeout = timeout;
    this.isRunning = false;
    this.abortController = null;
  }
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }
  
  async poll() {
    while (this.isRunning) {
      try {
        // Create abort controller for this request
        this.abortController = new AbortController();
        
        const response = await fetch(this.url, {
          method: 'GET',
          signal: this.abortController.signal,
          headers: {
            'X-Long-Polling': 'true'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process received data
        this.onData(data);
        
        // Immediately start next poll (no delay)
        // Server held connection, so we get updates quickly
        
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Request aborted');
          break;
        }
        
        console.error('Long polling error:', error);
        this.onError(error);
        
        // Wait before retrying on error (exponential backoff)
        await this.backoff();
      }
    }
  }
  
  async backoff() {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.retryCount || 0), 30000);
    this.retryCount = (this.retryCount || 0) + 1;
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  stop() {
    this.isRunning = false;
    
    if (this.abortController) {
      this.abortController.abort();
    }
  }
  
  onData(data) {
    console.log('Received:', data);
    this.retryCount = 0;  // Reset backoff on success
  }
  
  onError(error) {
    console.error('Error:', error);
  }
}

// Usage
const longPoller = new LongPolling('/api/updates');
longPoller.onData = (data) => {
  updateUI(data);
};
longPoller.start();
```

#### **2. Server-Side Implementation**
```javascript
// Express with long polling support
app.get('/api/updates', async (req, res) => {
  const userId = req.user.id;
  const timeout = 30000; // 30 second timeout
  const startTime = Date.now();
  
  // Function to check for updates
  const checkUpdates = async () => {
    const updates = await db.updates.find({
      userId,
      timestamp: { $gt: req.query.lastTimestamp || 0 }
    });
    
    return updates.length > 0 ? updates : null;
  };
  
  // Immediate check
  let updates = await checkUpdates();
  
  if (updates) {
    // Data available immediately
    return res.json(updates);
  }
  
  // No data - start long polling
  const pollInterval = setInterval(async () => {
    // Check if timeout reached
    if (Date.now() - startTime > timeout) {
      clearInterval(pollInterval);
      // Return empty response after timeout
      return res.json({ updates: [], timeout: true });
    }
    
    // Check for new data
    updates = await checkUpdates();
    
    if (updates) {
      clearInterval(pollInterval);
      res.json(updates);
    }
  }, 1000); // Check every second
  
  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(pollInterval);
  });
});
```

#### **3. Better Server Implementation (Event-Based)**
```javascript
// Using EventEmitter for efficient long polling
const EventEmitter = require('events');
const updateEmitter = new EventEmitter();

// When new data arrives, emit event
function onNewUpdate(userId, data) {
  updateEmitter.emit(`update:${userId}`, data);
}

// Long polling endpoint
app.get('/api/updates', async (req, res) => {
  const userId = req.user.id;
  const timeout = 30000;
  
  // Check for existing updates
  const existingUpdates = await db.updates.find({
    userId,
    timestamp: { $gt: req.query.lastTimestamp || 0 }
  });
  
  if (existingUpdates.length > 0) {
    return res.json(existingUpdates);
  }
  
  // Wait for new updates
  const timeoutId = setTimeout(() => {
    updateEmitter.removeListener(`update:${userId}`, handler);
    res.json({ updates: [], timeout: true });
  }, timeout);
  
  const handler = (data) => {
    clearTimeout(timeoutId);
    res.json([data]);
  };
  
  // Listen for updates
  updateEmitter.once(`update:${userId}`, handler);
  
  // Cleanup on disconnect
  req.on('close', () => {
    clearTimeout(timeoutId);
    updateEmitter.removeListener(`update:${userId}`, handler);
  });
});
```

#### **4. Network Pattern**
```
Client                    Server
  |                         |
  |------- GET /api ------->| (Request 1)
  |                         | [Holds connection]
  |                         | [Waits for data...]
  |                         | [30 seconds pass]
  |<------ 200 OK ----------| (Timeout, no data)
  |                         |
  |------- GET /api ------->| (Request 2, immediate)
  |                         | [Holds connection]
  |                         | [New data arrives!]
  |<------ 200 OK ----------| (Response with data)
  |                         |
  |------- GET /api ------->| (Request 3, immediate)
  |                         | [Holds connection]
  |                         | [Waits...]
```

---

### **C. Comparison**

| **Aspect**              | **Short Polling**                  | **Long Polling**                     |
|-------------------------|------------------------------------|--------------------------------------|
| **Latency**             | High (average = interval/2)        | Low (near real-time)                 |
| **Server Load**         | High (constant requests)           | Medium (fewer requests)              |
| **Bandwidth**           | High (many empty responses)        | Lower (fewer wasted requests)        |
| **Complexity**          | Simple                             | Moderate (timeout handling)          |
| **Scalability**         | Poor (constant load)               | Better (event-driven possible)       |
| **Client Resources**    | Low (simple timer)                 | Low (similar to short polling)       |
| **Server Resources**    | Low per request                    | High (holds connections open)        |
| **Connection Reuse**    | Yes (stateless)                    | Limited (long-lived connections)     |
| **Firewall Friendly**   | Yes                                | Yes                                  |
| **Proxy Compatible**    | Yes                                | Depends (may timeout)                |

---

### **D. Optimization Strategies**

#### **1. Adaptive Polling Interval**
```javascript
class AdaptivePoller {
  constructor(url) {
    this.url = url;
    this.minInterval = 2000;   // 2 seconds
    this.maxInterval = 60000;  // 60 seconds
    this.currentInterval = this.minInterval;
    this.lastDataTime = Date.now();
  }
  
  async poll() {
    const data = await fetch(this.url).then(r => r.json());
    
    if (data.updates && data.updates.length > 0) {
      // Data received - decrease interval (poll more frequently)
      this.currentInterval = Math.max(
        this.minInterval,
        this.currentInterval / 2
      );
      this.lastDataTime = Date.now();
    } else {
      // No data - increase interval (poll less frequently)
      this.currentInterval = Math.min(
        this.maxInterval,
        this.currentInterval * 1.5
      );
    }
    
    // Schedule next poll
    setTimeout(() => this.poll(), this.currentInterval);
  }
}
```

#### **2. Visibility-Based Polling**
```javascript
class VisibilityAwarePoller {
  constructor(url) {
    this.url = url;
    this.activeInterval = 5000;   // 5s when tab active
    this.inactiveInterval = 30000; // 30s when tab hidden
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      this.adjustInterval();
    });
  }
  
  adjustInterval() {
    const interval = document.hidden 
      ? this.inactiveInterval 
      : this.activeInterval;
    
    // Restart polling with new interval
    this.stop();
    this.start(interval);
  }
  
  start(interval) {
    this.intervalId = setInterval(() => {
      this.fetchData();
    }, interval);
  }
  
  stop() {
    clearInterval(this.intervalId);
  }
}
```

#### **3. Exponential Backoff on Errors**
```javascript
class ResilientPoller {
  constructor(url) {
    this.url = url;
    this.baseInterval = 5000;
    this.maxRetries = 5;
    this.retryCount = 0;
  }
  
  async poll() {
    try {
      const data = await fetch(this.url).then(r => r.json());
      
      // Success - reset retry count
      this.retryCount = 0;
      this.onData(data);
      
      // Schedule next poll with base interval
      setTimeout(() => this.poll(), this.baseInterval);
      
    } catch (error) {
      console.error('Polling error:', error);
      
      if (this.retryCount >= this.maxRetries) {
        console.error('Max retries reached, stopping');
        this.onFatalError(error);
        return;
      }
      
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
      const backoffDelay = this.baseInterval * Math.pow(2, this.retryCount);
      this.retryCount++;
      
      console.log(`Retrying in ${backoffDelay}ms (attempt ${this.retryCount})`);
      setTimeout(() => this.poll(), backoffDelay);
    }
  }
}
```

#### **4. Jittered Polling (Avoid Thundering Herd)**
```javascript
// Prevent all clients polling at exact same time
function getJitteredInterval(baseInterval) {
  // Add random jitter: ±20% of base interval
  const jitter = baseInterval * 0.2 * (Math.random() * 2 - 1);
  return baseInterval + jitter;
}

// Usage
setInterval(() => {
  fetchData();
}, getJitteredInterval(5000)); // ~4000-6000ms
```

---

### **E. Production Considerations**

#### **1. Load Balancer Timeouts**
```javascript
// Ensure long polling timeout < load balancer timeout
const LOAD_BALANCER_TIMEOUT = 60000; // 60s
const LONG_POLL_TIMEOUT = 55000;     // 55s (buffer)

app.get('/api/long-poll', async (req, res) => {
  const startTime = Date.now();
  
  const checkTimeout = () => {
    return Date.now() - startTime > LONG_POLL_TIMEOUT;
  };
  
  // Poll logic with timeout check
  while (!checkTimeout()) {
    const data = await checkForUpdates();
    if (data) {
      return res.json(data);
    }
    await delay(1000);
  }
  
  // Timeout reached
  res.json({ timeout: true });
});
```

#### **2. Connection Limit Management**
```javascript
// Limit concurrent long polling connections per user
const userConnections = new Map();

app.get('/api/long-poll', (req, res) => {
  const userId = req.user.id;
  
  // Close existing connection if any
  if (userConnections.has(userId)) {
    const oldRes = userConnections.get(userId);
    oldRes.end(); // Close old connection
  }
  
  // Store new connection
  userConnections.set(userId, res);
  
  res.on('close', () => {
    userConnections.delete(userId);
  });
  
  // Long polling logic...
});
```

#### **3. Monitoring & Metrics**
```javascript
// Track polling metrics
const metrics = {
  activePolls: 0,
  totalRequests: 0,
  emptyResponses: 0,
  dataResponses: 0,
  averageHoldTime: 0
};

app.get('/api/poll', async (req, res) => {
  metrics.activePolls++;
  metrics.totalRequests++;
  const startTime = Date.now();
  
  // Polling logic...
  
  const holdTime = Date.now() - startTime;
  metrics.averageHoldTime = 
    (metrics.averageHoldTime * 0.9) + (holdTime * 0.1);
  
  metrics.activePolls--;
  
  if (hasData) {
    metrics.dataResponses++;
  } else {
    metrics.emptyResponses++;
  }
});

// Alert if empty response rate too high
if (metrics.emptyResponses / metrics.totalRequests > 0.8) {
  console.warn('High empty response rate - consider increasing interval');
}
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Facebook Notifications (Long Polling)**
- Uses long polling as fallback when WebSocket unavailable
- 30-second timeout on server
- Adaptive: switches to WebSocket if available
- Jittered intervals to prevent thundering herd

### **Example 2: Gmail (Short Polling)**
- Polls every 60 seconds for new emails (when tab inactive)
- Every 5 seconds when tab active
- Exponential backoff on network errors
- Stops polling when user idle >30 min

### **Example 3: Slack (Hybrid)**
- Primary: WebSocket for real-time messages
- Fallback: Long polling when WebSocket fails
- Short polling every 30s for presence updates
- Stops all polling when tab hidden >5 min

### **Example 4: Trading Platform**
- Short polling every 1 second for stock prices
- Long polling for order execution notifications
- Adaptive interval based on market hours (slower after hours)
- Circuit breaker: stops polling after 5 consecutive failures

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"For real-time updates over HTTP, I'd choose between short polling and long polling based on update frequency and server capacity."*
>
> *"Short polling is simpler—request data every N seconds. It's predictable and stateless, but inefficient because most requests return empty. I'd use it for low-frequency updates like checking inbox every 60 seconds, and implement adaptive intervals: poll more frequently when user active, less when idle."*
>
> *"Long polling is better for real-time feel—server holds the request open until data arrives, then responds immediately, and client sends a new request. This reduces latency and wasted bandwidth. However, it requires managing server-side connection state and handling timeouts carefully."*
>
> *"Key optimizations: exponential backoff on errors, jittered intervals to prevent thundering herd, visibility-based intervals (slow down when tab hidden), and monitoring empty response rate. If >80% requests return empty, increase polling interval."*
>
> *"In production at scale, I'd use long polling as fallback when WebSockets unavailable, with timeout under load balancer timeout (e.g., 55s vs 60s), and limit concurrent connections per user to prevent resource exhaustion."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive implementations.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Fallback mechanism**: Works when WebSockets blocked by firewall/proxy
- **Simpler**: Easier to implement than WebSockets
- **HTTP-compatible**: Works with existing infrastructure
- **Good enough**: For low-frequency updates, polling is acceptable

### **How It Works**

**Short Polling:**
1. Client sends request
2. Server responds immediately (data or empty)
3. Wait N seconds
4. Repeat

**Long Polling:**
1. Client sends request
2. Server holds connection open
3. When data available (or timeout), server responds
4. Client immediately sends new request
5. Repeat

### **When to Use**

- **Short Polling**: Infrequent updates, simple infrastructure, stateless required
- **Long Polling**: Near real-time updates, WebSocket unavailable, better efficiency needed
- **Neither**: If WebSocket available and supported, use that instead
