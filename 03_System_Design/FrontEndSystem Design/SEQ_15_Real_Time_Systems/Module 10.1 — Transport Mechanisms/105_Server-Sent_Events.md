# 105. Server-Sent Events (SSE)

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Server-Sent Events (SSE)** is a standard that allows a server to **push updates to the client** over a single HTTP connection. Unlike WebSockets (which are bidirectional), SSE is **unidirectional** (server → client only), making it simpler but still effective for real-time updates.

### **What It Is:**
- **HTTP-based**: Uses standard HTTP/HTTPS (not a new protocol)
- **Unidirectional**: Server pushes, client receives (no client → server messaging)
- **Text-based**: Sends text data (typically JSON)
- **Automatic reconnection**: Browser automatically reconnects if connection drops
- **EventSource API**: Native browser support (no library needed)

### **Why It Exists:**
- **Simpler than WebSockets**: No protocol upgrade, just HTTP
- **Built-in reconnection**: Browser handles reconnection automatically
- **HTTP-friendly**: Works through proxies, load balancers, CDNs
- **Event IDs**: Supports resuming from last received event
- **Good for read-only updates**: When client doesn't need to send frequent messages

### **When and Where Used:**
- Live news feeds & notifications
- Real-time dashboards & metrics
- Stock price updates
- Social media timelines (Twitter, Facebook)
- Live sports scores
- Server progress updates (file uploads, processing)
- Activity streams

### **Role in Large-Scale Applications:**
At FAANG scale:
- **Millions of concurrent SSE connections** (sticky sessions required)
- **Event replay**: Resume from last event ID after disconnect
- **Efficient broadcasting**: Single event to millions of clients
- **CDN compatibility**: Can be cached/proxied
- **Fallback strategy**: SSE → Long Polling → Short Polling

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. SSE Protocol**

#### **1. HTTP Request/Response**
```
Client → Server:
GET /events HTTP/1.1
Host: example.com
Accept: text/event-stream
Cache-Control: no-cache
Last-Event-ID: 42  (optional, for reconnection)

Server → Client:
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"message": "Hello"}

data: {"message": "World"}

event: notification
data: {"type": "alert", "text": "New message"}
id: 43

: This is a comment (ignored by client)

data: Line 1
data: Line 2

```

**Key Points:**
- Content-Type must be `text/event-stream`
- Each message ends with `\n\n` (double newline)
- Fields: `event`, `data`, `id`, `retry`
- Comments start with `:` (useful for heartbeats)

#### **2. Event Format**
```
event: customEvent
id: 123
retry: 5000
data: {"key": "value"}
data: {"more": "data"}

[blank line marks end of event]
```

**Fields:**
- `event`: Event name (default: "message")
- `id`: Event ID for resuming
- `retry`: Reconnection delay in milliseconds
- `data`: Payload (can span multiple lines)

---

### **B. Client-Side Implementation**

#### **1. Basic EventSource Usage**
```javascript
// Create SSE connection
const eventSource = new EventSource('/api/events');

// Listen for default "message" events
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  updateUI(data);
});

// Listen for custom events
eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  console.log('Notification:', data);
  showNotification(data);
});

// Connection opened
eventSource.addEventListener('open', () => {
  console.log('SSE connection opened');
});

// Error occurred
eventSource.addEventListener('error', (error) => {
  console.error('SSE error:', error);
  
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('SSE connection closed');
  } else {
    console.log('SSE connection error, will retry...');
  }
});

// Close connection (when done)
eventSource.close();
```

#### **2. Production-Ready SSE Client**
```javascript
class SSEClient {
  constructor(url, options = {}) {
    this.url = url;
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.lastEventId = options.lastEventId || null;
    this.isConnected = false;
  }
  
  connect() {
    try {
      // Add last event ID to URL if resuming
      const url = this.lastEventId 
        ? `${this.url}?lastEventId=${this.lastEventId}`
        : this.url;
      
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        console.log('SSE connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connect');
      };
      
      this.eventSource.onmessage = (event) => {
        // Store last event ID for resumption
        if (event.lastEventId) {
          this.lastEventId = event.lastEventId;
          localStorage.setItem('lastEventId', event.lastEventId);
        }
        
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
        } catch (error) {
          console.error('Failed to parse SSE data:', error);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        this.isConnected = false;
        
        if (this.eventSource.readyState === EventSource.CLOSED) {
          this.emit('disconnect');
          this.handleReconnection();
        } else {
          // Transient error, browser will auto-reconnect
          this.emit('error', error);
        }
      };
      
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.handleReconnection();
    }
  }
  
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }
    
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // If custom event (not built-in), add to EventSource
    if (this.eventSource && !['connect', 'disconnect', 'error', 'message'].includes(event)) {
      this.eventSource.addEventListener(event, (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit(event, data);
        } catch (error) {
          console.error('Failed to parse event data:', error);
        }
      });
    }
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
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
  
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.isConnected = false;
    }
  }
}

// Usage
const sseClient = new SSEClient('/api/events', {
  lastEventId: localStorage.getItem('lastEventId'),
  maxReconnectAttempts: 10,
  reconnectDelay: 1000
});

sseClient.on('connect', () => {
  console.log('Connected to SSE');
});

sseClient.on('message', (data) => {
  console.log('Message:', data);
  updateUI(data);
});

sseClient.on('notification', (data) => {
  console.log('Notification:', data);
  showNotification(data);
});

sseClient.on('disconnect', () => {
  console.log('Disconnected from SSE');
  showReconnectingUI();
});

sseClient.connect();
```

---

### **C. Server-Side Implementation**

#### **1. Node.js / Express**
```javascript
const express = require('express');
const app = express();

// SSE endpoint
app.get('/api/events', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Optional: support CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Get last event ID (for resumption)
  const lastEventId = req.headers['last-event-id'] || req.query.lastEventId;
  
  console.log(`Client connected, last event ID: ${lastEventId}`);
  
  // Send initial connection event
  res.write('data: {"type": "connected"}\n\n');
  
  // Send periodic heartbeat (keeps connection alive)
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000); // Every 30 seconds
  
  // Send events to client
  const sendEvent = (data, eventId) => {
    res.write(`id: ${eventId}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Example: Send event every 5 seconds
  let eventId = parseInt(lastEventId) || 0;
  const eventInterval = setInterval(() => {
    eventId++;
    sendEvent({
      message: `Event ${eventId}`,
      timestamp: Date.now()
    }, eventId);
  }, 5000);
  
  // Cleanup on client disconnect
  req.on('close', () => {
    console.log('Client disconnected');
    clearInterval(heartbeatInterval);
    clearInterval(eventInterval);
    res.end();
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

#### **2. Event-Driven SSE Server**
```javascript
const express = require('express');
const EventEmitter = require('events');

const app = express();
const eventBus = new EventEmitter();

// Track connected clients
const clients = new Set();

app.get('/api/events', (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const lastEventId = req.headers['last-event-id'];
  
  // Create client object
  const client = {
    id: generateId(),
    res,
    lastEventId: parseInt(lastEventId) || 0
  };
  
  clients.add(client);
  console.log(`Client ${client.id} connected`);
  
  // Send initial event
  client.res.write(`data: {"type": "connected", "clientId": "${client.id}"}\n\n`);
  
  // Send missed events (if resuming)
  if (client.lastEventId) {
    sendMissedEvents(client);
  }
  
  // Listen for events and broadcast to this client
  const eventHandler = (data) => {
    sendEvent(client, data);
  };
  
  eventBus.on('broadcast', eventHandler);
  
  // Heartbeat
  const heartbeat = setInterval(() => {
    client.res.write(': heartbeat\n\n');
  }, 30000);
  
  // Cleanup
  req.on('close', () => {
    console.log(`Client ${client.id} disconnected`);
    clearInterval(heartbeat);
    eventBus.removeListener('broadcast', eventHandler);
    clients.delete(client);
  });
});

function sendEvent(client, data) {
  const eventId = data.id || Date.now();
  
  // Send event with ID
  client.res.write(`id: ${eventId}\n`);
  
  if (data.event) {
    client.res.write(`event: ${data.event}\n`);
  }
  
  client.res.write(`data: ${JSON.stringify(data.payload)}\n\n`);
  
  client.lastEventId = eventId;
}

function sendMissedEvents(client) {
  // Fetch events after lastEventId from database/cache
  const missedEvents = getEventsAfter(client.lastEventId);
  
  missedEvents.forEach(event => {
    sendEvent(client, event);
  });
}

// API to trigger broadcasts
app.post('/api/broadcast', (req, res) => {
  const data = {
    id: Date.now(),
    event: req.body.event || 'message',
    payload: req.body.data
  };
  
  // Store event for resumption
  storeEvent(data);
  
  // Broadcast to all connected clients
  eventBus.emit('broadcast', data);
  
  res.json({ success: true, clients: clients.size });
});

app.listen(3000);
```

#### **3. Scaling with Redis Pub/Sub**
```javascript
const redis = require('redis');
const express = require('express');

const app = express();
const subscriber = redis.createClient();
const publisher = redis.createClient();

const clients = new Set();

// Subscribe to Redis channel
subscriber.subscribe('sse-events');

subscriber.on('message', (channel, message) => {
  const data = JSON.parse(message);
  
  // Broadcast to all connected SSE clients on this server
  clients.forEach(client => {
    client.res.write(`id: ${data.id}\n`);
    client.res.write(`data: ${JSON.stringify(data.payload)}\n\n`);
  });
});

app.get('/api/events', (req, res) => {
  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const client = { id: generateId(), res };
  clients.add(client);
  
  req.on('close', () => {
    clients.delete(client);
  });
});

app.post('/api/broadcast', (req, res) => {
  const data = {
    id: Date.now(),
    payload: req.body.data
  };
  
  // Publish to Redis (all servers will receive)
  publisher.publish('sse-events', JSON.stringify(data));
  
  res.json({ success: true });
});

app.listen(3000);
```

---

### **D. Advanced Features**

#### **1. Event Replay / Resumption**
```javascript
// Server: Store events in Redis with expiry
const eventStore = new Map();

function storeEvent(event) {
  eventStore.set(event.id, event);
  
  // Expire after 1 hour
  setTimeout(() => {
    eventStore.delete(event.id);
  }, 3600000);
}

function getEventsAfter(eventId) {
  return Array.from(eventStore.values())
    .filter(event => event.id > eventId)
    .sort((a, b) => a.id - b.id);
}

// Client: Resume from last event ID
app.get('/api/events', (req, res) => {
  const lastEventId = parseInt(req.headers['last-event-id']) || 0;
  
  // Send missed events
  const missedEvents = getEventsAfter(lastEventId);
  missedEvents.forEach(event => {
    res.write(`id: ${event.id}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  });
  
  // Continue with live events...
});
```

#### **2. Custom Retry Logic**
```javascript
// Server: Suggest retry delay
res.write('retry: 5000\n'); // Client should retry in 5 seconds
res.write('data: {"message": "Event"}\n\n');

// Client: Browser automatically uses retry value
// Manual override:
class SSEClientWithCustomRetry extends SSEClient {
  connect() {
    this.eventSource = new EventSource(this.url);
    
    // Override browser's retry with custom logic
    this.eventSource.onerror = () => {
      this.eventSource.close();
      
      // Custom retry logic
      const delay = this.getRetryDelay();
      setTimeout(() => this.connect(), delay);
    };
  }
  
  getRetryDelay() {
    // Exponential backoff with jitter
    const baseDelay = 1000 * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 30000);
  }
}
```

#### **3. Multiplexing (Multiple Event Types)**
```javascript
// Server: Send different event types
app.get('/api/events', (req, res) => {
  // ... SSE setup ...
  
  // Send different event types
  res.write('event: notification\n');
  res.write('data: {"message": "You have a new message"}\n\n');
  
  res.write('event: update\n');
  res.write('data: {"count": 42}\n\n');
  
  res.write('event: alert\n');
  res.write('data: {"level": "warning", "text": "System maintenance"}\n\n');
});

// Client: Listen to specific event types
const eventSource = new EventSource('/api/events');

eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  showNotification(data.message);
});

eventSource.addEventListener('update', (event) => {
  const data = JSON.parse(event.data);
  updateCounter(data.count);
});

eventSource.addEventListener('alert', (event) => {
  const data = JSON.parse(event.data);
  showAlert(data.level, data.text);
});
```

---

### **E. Comparison with Other Technologies**

| **Feature**              | **SSE**                           | **WebSocket**                    | **Long Polling**                |
|--------------------------|-----------------------------------|----------------------------------|---------------------------------|
| **Direction**            | Unidirectional (server → client)  | Bidirectional                    | Unidirectional (server → client)|
| **Protocol**             | HTTP                              | WebSocket (ws://)                | HTTP                            |
| **Browser Support**      | All modern browsers               | All modern browsers              | All browsers                    |
| **Reconnection**         | Automatic (built-in)              | Manual                           | Manual                          |
| **Event Replay**         | Yes (with event IDs)              | No (manual implementation)       | No                              |
| **Complexity**           | Low                               | Medium                           | Low                             |
| **Efficiency**           | High                              | Highest                          | Low                             |
| **Firewall/Proxy**       | Friendly                          | May be blocked                   | Friendly                        |
| **Text vs Binary**       | Text only                         | Text + Binary                    | Text (JSON)                     |
| **Use Case**             | Read-only updates                 | Interactive, bidirectional       | Fallback                        |

---

### **F. Production Considerations**

#### **1. Sticky Sessions**
```nginx
# Nginx: Sticky sessions for SSE
upstream sse_backend {
    ip_hash;  # Same client always goes to same server
    server backend1:3000;
    server backend2:3000;
}

server {
    location /api/events {
        proxy_pass http://sse_backend;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

#### **2. Connection Limits**
```javascript
// Limit concurrent SSE connections per user
const userConnections = new Map();
const MAX_CONNECTIONS_PER_USER = 3;

app.get('/api/events', (req, res) => {
  const userId = req.user.id;
  
  const connections = userConnections.get(userId) || [];
  
  if (connections.length >= MAX_CONNECTIONS_PER_USER) {
    // Close oldest connection
    const oldest = connections.shift();
    oldest.end();
  }
  
  connections.push(res);
  userConnections.set(userId, connections);
  
  req.on('close', () => {
    const index = connections.indexOf(res);
    if (index > -1) {
      connections.splice(index, 1);
    }
  });
});
```

#### **3. Monitoring**
```javascript
// Track SSE metrics
const metrics = {
  activeConnections: 0,
  totalConnections: 0,
  messagesSent: 0,
  reconnections: 0
};

app.get('/api/events', (req, res) => {
  metrics.activeConnections++;
  metrics.totalConnections++;
  
  if (req.headers['last-event-id']) {
    metrics.reconnections++;
  }
  
  req.on('close', () => {
    metrics.activeConnections--;
  });
});

// Expose metrics
app.get('/metrics', (req, res) => {
  res.json(metrics);
});
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Twitter / X**
- SSE for live tweet updates
- Event IDs for resuming after disconnect
- Falls back to polling if SSE unavailable
- Limits to 1 SSE connection per user

### **Example 2: Facebook**
- SSE for live notifications
- 30-second heartbeats
- Automatic reconnection with last event ID
- Uses sticky sessions for multi-server deployment

### **Example 3: Financial Dashboard**
- SSE for live stock prices
- Sends updates every second
- Binary encoding for efficiency
- Event replay for missed data during disconnect

### **Example 4: GitHub**
- SSE for live build status
- Custom event types (build.started, build.completed)
- 60-second timeout, then reconnect
- Event IDs stored in Redis for replay

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"Server-Sent Events are an HTTP-based protocol for server-to-client push updates. The key advantage over WebSockets is simplicity—it's just HTTP with `Content-Type: text/event-stream`, and the browser automatically handles reconnection."*
>
> *"For production, I'd implement event IDs so clients can resume from the last received event after disconnecting. The server stores recent events (e.g., in Redis with 1-hour TTL), and when a client reconnects with `Last-Event-ID` header, the server sends missed events before continuing with live updates."*
>
> *"SSE requires sticky sessions at the load balancer because the connection is stateful—use ip_hash or cookie-based routing in Nginx. To scale horizontally, I'd use Redis Pub/Sub: each server subscribes to a Redis channel, and when an event is published, all servers receive it and push to their connected clients."*
>
> *"For monitoring, track active connections, reconnection rate, and message throughput. If reconnection rate exceeds 5%, investigate network issues. Send heartbeat comments every 30 seconds to keep connections alive through proxies."*
>
> *"SSE is best when updates are mostly server → client (dashboards, notifications). If you need client → server messaging frequently, WebSocket is better. But for simple push updates, SSE's built-in reconnection and event replay make it easier to implement correctly."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive implementations.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Simpler than WebSockets**: Just HTTP, no protocol upgrade
- **Built-in reconnection**: Browser handles it automatically
- **Event replay**: Resume from last event ID
- **HTTP-friendly**: Works through proxies, CDNs, firewalls

### **How It Works**
1. **Client** opens connection to `/api/events`
2. **Server** responds with `Content-Type: text/event-stream`
3. **Server** pushes events as `data: {...}\n\n`
4. **Client** receives events via `EventSource.onmessage`
5. **Auto-reconnect** if connection drops (with `Last-Event-ID`)

### **When to Use**
- **Read-only updates**: Notifications, dashboards, live feeds
- **When you don't need client → server messaging**
- **Simpler alternative to WebSockets**
- **Good browser support required** (IE11 doesn't support SSE)
