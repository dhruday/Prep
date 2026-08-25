# 107. Reconnection & Backoff

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Reconnection & Backoff** strategies determine how a client should handle connection failures and retry connecting to a server in real-time systems. The goal is to restore the connection **quickly** when possible, while **avoiding overwhelming the server** during outages.

### **What It Is:**
- **Reconnection**: Automatically retry connecting after disconnect
- **Backoff**: Gradually increase delay between retry attempts
- **Exponential backoff**: Double delay after each failure (1s, 2s, 4s, 8s...)
- **Jitter**: Add randomness to prevent thundering herd
- **Max attempts**: Limit total retries before giving up

### **Why It Matters:**
- **Resilience**: Network issues are common, apps must recover
- **Server protection**: Prevents overwhelming server during outages
- **UX**: Users shouldn't have to manually refresh
- **Cost**: Reduces unnecessary server load

### **When and Where Used:**
- WebSocket connections
- SSE (Server-Sent Events)
- Long polling
- Real-time chat, notifications, live updates
- Any persistent connection

### **Role in Large-Scale Applications:**
At FAANG scale:
- **Millions of clients** reconnecting simultaneously can cause cascade failures
- **Jittered backoff** prevents thundering herd
- **Circuit breakers** stop reconnections during total outage
- **Monitoring**: Track reconnection rate, backoff distribution
- **Regional failover**: Reconnect to different datacenter

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Backoff Strategies**

#### **1. Exponential Backoff**
```javascript
class ExponentialBackoff {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000;  // 30 seconds
    this.maxAttempts = options.maxAttempts || 10;
    this.attempts = 0;
  }
  
  getDelay() {
    if (this.attempts >= this.maxAttempts) {
      return null; // Stop retrying
    }
    
    // Calculate exponential delay: baseDelay * 2^attempts
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempts),
      this.maxDelay
    );
    
    this.attempts++;
    return delay;
  }
  
  reset() {
    this.attempts = 0;
  }
}

// Usage
const backoff = new ExponentialBackoff({
  baseDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 10
});

async function connectWithBackoff() {
  while (true) {
    try {
      await connect();
      backoff.reset(); // Reset on successful connection
      break;
    } catch (error) {
      const delay = backoff.getDelay();
      
      if (delay === null) {
        console.error('Max reconnection attempts reached');
        break;
      }
      
      console.log(`Reconnecting in ${delay}ms (attempt ${backoff.attempts})`);
      await sleep(delay);
    }
  }
}
```

**Delay progression:**
- Attempt 1: 1s
- Attempt 2: 2s
- Attempt 3: 4s
- Attempt 4: 8s
- Attempt 5: 16s
- Attempt 6+: 30s (capped)

#### **2. Jittered Backoff (Prevents Thundering Herd)**
```javascript
class JitteredBackoff {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.maxAttempts = options.maxAttempts || 10;
    this.attempts = 0;
  }
  
  getDelay() {
    if (this.attempts >= this.maxAttempts) {
      return null;
    }
    
    // Exponential base delay
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, this.attempts),
      this.maxDelay
    );
    
    // Add random jitter: ±20% of delay
    const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);
    const delay = Math.max(0, exponentialDelay + jitter);
    
    this.attempts++;
    return delay;
  }
  
  reset() {
    this.attempts = 0;
  }
}

// Example: 1000 clients disconnect at same time
// Without jitter: All reconnect at 1s, 2s, 4s, 8s (synchronized spikes)
// With jitter: Reconnections spread out (800ms-1200ms, 1600ms-2400ms, etc.)
```

#### **3. Decorrelated Jitter (AWS Recommendation)**
```javascript
class DecorrelatedJitterBackoff {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.maxAttempts = options.maxAttempts || 10;
    this.attempts = 0;
    this.previousDelay = this.baseDelay;
  }
  
  getDelay() {
    if (this.attempts >= this.maxAttempts) {
      return null;
    }
    
    // Random delay between baseDelay and 3 * previousDelay
    const delay = Math.min(
      this.baseDelay + Math.random() * (this.previousDelay * 3 - this.baseDelay),
      this.maxDelay
    );
    
    this.previousDelay = delay;
    this.attempts++;
    
    return delay;
  }
  
  reset() {
    this.attempts = 0;
    this.previousDelay = this.baseDelay;
  }
}

// Benefits:
// - Better distribution than exponential + jitter
// - Reduced correlation between clients
// - Smoother server load during recovery
```

---

### **B. Reconnection Patterns**

#### **1. WebSocket with Reconnection**
```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.backoff = new JitteredBackoff({
      baseDelay: options.reconnectDelay || 1000,
      maxDelay: options.maxReconnectDelay || 30000,
      maxAttempts: options.maxReconnectAttempts || Infinity
    });
    this.listeners = new Map();
    this.messageQueue = [];
    this.isConnected = false;
    this.shouldReconnect = true;
  }
  
  connect() {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      return; // Already connecting or connected
    }
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.backoff.reset(); // Reset backoff on successful connection
        
        // Flush queued messages
        this.flushQueue();
        
        this.emit('connect');
      };
      
      this.ws.onmessage = (event) => {
        this.emit('message', JSON.parse(event.data));
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.emit('disconnect', { code: event.code, reason: event.reason });
        
        // Attempt reconnection
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  scheduleReconnect() {
    const delay = this.backoff.getDelay();
    
    if (delay === null) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }
    
    console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.backoff.attempts})`);
    this.emit('reconnecting', { delay, attempt: this.backoff.attempts });
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }
  
  send(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }
  
  flushQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.ws.send(message);
    }
  }
  
  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
}

// Usage
const ws = new ReconnectingWebSocket('wss://example.com/socket', {
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  maxReconnectAttempts: 10
});

ws.on('connect', () => {
  console.log('Connected!');
  updateConnectionStatus('connected');
});

ws.on('disconnect', ({ code, reason }) => {
  console.log('Disconnected:', code, reason);
  updateConnectionStatus('disconnected');
});

ws.on('reconnecting', ({ delay, attempt }) => {
  console.log(`Reconnecting in ${delay}ms (attempt ${attempt})`);
  updateConnectionStatus('reconnecting', { delay, attempt });
});

ws.on('max_reconnect_attempts', () => {
  console.error('Failed to reconnect after max attempts');
  updateConnectionStatus('failed');
  showErrorMessage('Failed to connect. Please refresh the page.');
});

ws.connect();
```

---

### **C. Circuit Breaker Pattern**

#### **1. Prevent Reconnection During Outage**
```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.nextAttemptTime = null;
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      // Check if we should try again
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN');
      }
      
      // Try half-open
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      
      // Success - reset circuit breaker
      if (this.state === 'HALF_OPEN') {
        console.log('Circuit breaker: HALF_OPEN → CLOSED');
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      
      return result;
      
    } catch (error) {
      this.failureCount++;
      
      if (this.failureCount >= this.failureThreshold) {
        // Trip circuit breaker
        console.log('Circuit breaker: CLOSED → OPEN');
        this.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.resetTimeout;
      }
      
      throw error;
    }
  }
  
  getState() {
    return this.state;
  }
}

// Integration with reconnection
class ResilientWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.backoff = new JitteredBackoff(options);
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000 // 1 minute
    });
  }
  
  async connect() {
    try {
      await this.circuitBreaker.execute(async () => {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket(this.url);
          
          ws.onopen = () => {
            this.ws = ws;
            this.backoff.reset();
            resolve();
          };
          
          ws.onerror = reject;
          
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
      });
      
      console.log('Connected successfully');
      
    } catch (error) {
      if (this.circuitBreaker.getState() === 'OPEN') {
        console.log('Circuit breaker OPEN, not retrying');
        // Wait for circuit breaker to reset
        return;
      }
      
      const delay = this.backoff.getDelay();
      if (delay !== null) {
        console.log(`Retrying in ${delay}ms`);
        setTimeout(() => this.connect(), delay);
      }
    }
  }
}
```

---

### **D. Visibility-Based Reconnection**

#### **1. Pause Reconnection When Tab Hidden**
```javascript
class VisibilityAwareReconnection {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.backoff = new JitteredBackoff(options);
    this.reconnectOnVisible = false;
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.reconnectOnVisible) {
        console.log('Tab visible, reconnecting...');
        this.reconnectOnVisible = false;
        this.connect();
      }
    });
  }
  
  connect() {
    // Don't connect if tab is hidden
    if (document.hidden) {
      console.log('Tab hidden, deferring connection');
      this.reconnectOnVisible = true;
      return;
    }
    
    // Normal connection logic...
  }
  
  scheduleReconnect() {
    const delay = this.backoff.getDelay();
    
    if (delay === null) {
      return; // Max attempts reached
    }
    
    // If tab hidden, defer until visible
    if (document.hidden) {
      console.log('Tab hidden, will reconnect when visible');
      this.reconnectOnVisible = true;
      return;
    }
    
    setTimeout(() => this.connect(), delay);
  }
}
```

---

### **E. Health Checks & Heartbeats**

#### **1. Detect Connection Issues Early**
```javascript
class HeartbeatMonitor {
  constructor(ws, options = {}) {
    this.ws = ws;
    this.interval = options.interval || 30000; // 30 seconds
    this.timeout = options.timeout || 5000;    // 5 seconds
    this.intervalId = null;
    this.timeoutId = null;
    this.onTimeout = options.onTimeout || (() => {});
  }
  
  start() {
    this.stop(); // Clear any existing interval
    
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, this.interval);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  sendHeartbeat() {
    // Send ping
    this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    
    // Expect pong within timeout
    this.timeoutId = setTimeout(() => {
      console.error('Heartbeat timeout - connection may be dead');
      this.onTimeout();
      
      // Force reconnection
      this.ws.close();
    }, this.timeout);
  }
  
  receivedPong() {
    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

// Usage
const ws = new ReconnectingWebSocket('wss://example.com');

ws.on('connect', () => {
  const heartbeat = new HeartbeatMonitor(ws, {
    interval: 30000,
    timeout: 5000,
    onTimeout: () => {
      console.log('Heartbeat timeout, reconnecting...');
    }
  });
  
  heartbeat.start();
  
  ws.on('message', (data) => {
    if (data.type === 'pong') {
      heartbeat.receivedPong();
    }
  });
});
```

---

### **F. Regional Failover**

#### **1. Retry Different Endpoint on Failure**
```javascript
class MultiRegionWebSocket {
  constructor(endpoints, options = {}) {
    this.endpoints = endpoints; // ['wss://us.example.com', 'wss://eu.example.com']
    this.currentIndex = 0;
    this.backoff = new JitteredBackoff(options);
    this.ws = null;
  }
  
  connect() {
    const url = this.endpoints[this.currentIndex];
    console.log(`Connecting to ${url}`);
    
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('Connected successfully');
      this.backoff.reset();
    };
    
    this.ws.onerror = (error) => {
      console.error('Connection error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('Connection closed');
      this.reconnect();
    };
  }
  
  reconnect() {
    const delay = this.backoff.getDelay();
    
    if (delay === null) {
      // Max attempts for this region, try next
      console.log('Max attempts for this region, trying next');
      this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
      this.backoff.reset();
      this.connect();
      return;
    }
    
    console.log(`Reconnecting in ${delay}ms`);
    setTimeout(() => this.connect(), delay);
  }
}

// Usage
const ws = new MultiRegionWebSocket([
  'wss://us-east.example.com',
  'wss://us-west.example.com',
  'wss://eu-west.example.com',
  'wss://ap-southeast.example.com'
]);

ws.connect();
```

---

### **G. Monitoring & Metrics**

#### **1. Track Reconnection Stats**
```javascript
class ReconnectionMetrics {
  constructor() {
    this.metrics = {
      totalReconnections: 0,
      successfulReconnections: 0,
      failedReconnections: 0,
      averageReconnectionTime: 0,
      currentBackoffDelay: 0,
      lastReconnectTimestamp: null
    };
  }
  
  recordReconnectionAttempt(startTime) {
    this.metrics.totalReconnections++;
    this.metrics.lastReconnectTimestamp = Date.now();
  }
  
  recordReconnectionSuccess(startTime) {
    const duration = Date.now() - startTime;
    this.metrics.successfulReconnections++;
    
    // Update average (exponential moving average)
    this.metrics.averageReconnectionTime = 
      this.metrics.averageReconnectionTime * 0.9 + duration * 0.1;
  }
  
  recordReconnectionFailure() {
    this.metrics.failedReconnections++;
  }
  
  updateBackoffDelay(delay) {
    this.metrics.currentBackoffDelay = delay;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalReconnections > 0
        ? this.metrics.successfulReconnections / this.metrics.totalReconnections
        : 0
    };
  }
}

// Send to analytics
setInterval(() => {
  const metrics = reconnectionMetrics.getMetrics();
  analytics.track('reconnection_metrics', metrics);
}, 60000); // Every minute
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Slack**
- Exponential backoff with jitter
- Max 10 reconnection attempts
- Circuit breaker after 5 consecutive failures
- Heartbeat every 30 seconds
- Pauses reconnection when tab hidden >5 minutes

### **Example 2: WhatsApp Web**
- Decorrelated jitter backoff
- Immediate reconnect on network change (online event)
- Shows "Connecting..." banner during reconnection
- Regional failover (tries nearest data center first)
- Gives up after 5 minutes of failed attempts

### **Example 3: Trading Platform**
- Aggressive reconnection (max 0.5s initial delay)
- Circuit breaker trips after 3 failures
- Health check ping every 10 seconds
- Multi-region failover with latency-based routing
- Alerts user if disconnected >10 seconds

### **Example 4: Gmail**
- Standard exponential backoff (1s, 2s, 4s, ...)
- Reconnects immediately when tab becomes visible
- Shows "Trying to reconnect..." message
- Falls back to polling after 5 failed WebSocket attempts
- Max delay capped at 30 seconds

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"For reconnection, I'd implement exponential backoff with jitter to avoid thundering herd. Start with 1 second delay, double after each failure (1s, 2s, 4s, 8s), cap at 30 seconds. Add ±20% random jitter so not all clients reconnect simultaneously."*
>
> *"I'd limit to 10 reconnection attempts before giving up and showing an error message. On successful reconnection, reset the backoff counter so next disconnect starts fresh at 1 second."*
>
> *"For production, I'd add a circuit breaker—if 5 consecutive connection attempts fail, assume server is down and stop trying for 1 minute. This prevents overwhelming the server during outages. After 1 minute, enter 'half-open' state and try once; if successful, close the circuit, otherwise open it again."*
>
> *"I'd also implement visibility-aware reconnection—pause reconnection attempts when the tab is hidden to save resources, and reconnect immediately when the tab becomes visible. This is important for mobile where tabs are frequently backgrounded."*
>
> *"For monitoring, track reconnection rate, success rate, and average reconnection time. If reconnection rate spikes above 10%, that indicates a systemic issue needing investigation."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive implementations.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Resilience**: Network failures are inevitable, apps must recover
- **Server protection**: Prevents overwhelming server during outages
- **UX**: Seamless reconnection without user intervention
- **Cost**: Reduces unnecessary load and API calls

### **How It Works**
1. **Exponential backoff**: Double delay after each failure
2. **Jitter**: Add randomness to spread out reconnections
3. **Max attempts**: Limit retries before giving up
4. **Circuit breaker**: Stop trying during systemic outages
5. **Visibility-aware**: Pause when tab hidden
6. **Heartbeat**: Detect dead connections early

### **Best Practices**
- Start: 1 second, Max: 30 seconds
- Add 20% jitter to prevent synchronization
- Limit to 10-15 attempts
- Reset backoff on successful connection
- Track metrics (reconnection rate, success rate, latency)
