# 104. WebSockets

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**WebSockets** provide **full-duplex**, **bidirectional communication** between client and server over a single, long-lived TCP connection. Unlike HTTP (request-response), WebSockets allow both client and server to send messages at any time without waiting for a request.

### **What It Is:**
- **Persistent connection**: Opens once, stays open
- **Bidirectional**: Server can push data without client asking
- **Low latency**: No HTTP overhead after initial handshake
- **Protocol upgrade**: Starts as HTTP, upgrades to WebSocket protocol

### **Why It Exists:**
- **Real-time apps**: Chat, live updates, collaborative editing
- **Efficiency**: No repeated HTTP handshakes, headers, or polling
- **Push capability**: Server initiates communication
- **Lower latency**: Instant message delivery (no polling delay)

### **When and Where Used:**
- Chat applications (Slack, Discord, WhatsApp Web)
- Live dashboards & real-time analytics
- Multiplayer games
- Collaborative editing (Google Docs, Figma)
- Stock trading platforms
- Live notifications & feeds

### **Role in Large-Scale Applications:**
At FAANG scale:
- **Millions of concurrent connections** (sticky sessions, connection pooling)
- **Message routing** across distributed servers (Redis Pub/Sub, message brokers)
- **Connection management**: heartbeats, reconnection, load balancing
- **Security**: authentication, rate limiting, DoS protection
- **Monitoring**: connection count, message throughput, latency

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. WebSocket Protocol**

#### **1. Connection Handshake**
```
Client → Server (HTTP Upgrade Request):
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

Server → Client (Switching Protocols):
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

[Connection now uses WebSocket protocol]
```

**Key Points:**
- Starts as HTTP GET request with `Upgrade` header
- Server responds with `101 Switching Protocols`
- After handshake, connection is WebSocket (not HTTP)
- Uses same port as HTTP (80/443) for firewall compatibility

#### **2. Frame Structure**
```
WebSocket Frame:
┌──────────────────────────────────────────────────────┐
│ FIN │RSV│Opcode│Mask│Payload Length│Masking Key│Data│
└──────────────────────────────────────────────────────┘

- FIN: Is this the final fragment?
- Opcode: Text (0x1), Binary (0x2), Close (0x8), Ping (0x9), Pong (0xA)
- Mask: Client → Server messages must be masked
- Payload: Actual data
```

**Message Types:**
- **Text frames** (UTF-8 encoded)
- **Binary frames** (raw bytes)
- **Control frames** (Ping, Pong, Close)

---

### **B. Client-Side Implementation**

#### **1. Basic WebSocket Usage**
```javascript
// Create WebSocket connection
const ws = new WebSocket('wss://example.com/socket');

// Connection opened
ws.addEventListener('open', (event) => {
  console.log('Connected to WebSocket server');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'join',
    room: 'general'
  }));
});

// Listen for messages
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Message from server:', data);
  
  handleMessage(data);
});

// Connection closed
ws.addEventListener('close', (event) => {
  console.log('Disconnected:', event.code, event.reason);
  
  if (event.wasClean) {
    console.log('Clean disconnect');
  } else {
    console.log('Connection lost, reconnecting...');
    reconnect();
  }
});

// Error occurred
ws.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
});
```

#### **2. Production-Ready WebSocket Client**
```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = 30000; // 30 seconds
    this.heartbeatTimer = null;
    this.messageQueue = [];
    this.isConnected = false;
    this.listeners = new Map();
  }
  
  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Send queued messages
        this.flushQueue();
        
        // Emit connection event
        this.emit('connect');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle heartbeat response
          if (data.type === 'pong') {
            this.lastPong = Date.now();
            return;
          }
          
          // Emit message event
          this.emit('message', data);
          
          // Emit type-specific event
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        
        this.emit('disconnect', { code: event.code, reason: event.reason });
        
        // Attempt reconnection if not clean close
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.reconnect();
    }
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
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.ws.send(message);
    }
  }
  
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', timestamp: Date.now() });
        
        // Check if we received pong recently
        if (this.lastPong && Date.now() - this.lastPong > this.heartbeatInterval * 2) {
          console.warn('Heartbeat timeout, reconnecting...');
          this.ws.close();
        }
      }
    }, this.heartbeatInterval);
  }
  
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  reconnect() {
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }
  
  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
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
}

// Usage
const client = new WebSocketClient('wss://example.com/socket');

client.on('connect', () => {
  console.log('Connected!');
  client.send({ type: 'subscribe', channel: 'notifications' });
});

client.on('message', (data) => {
  console.log('Received:', data);
  updateUI(data);
});

client.on('disconnect', ({ code, reason }) => {
  console.log('Disconnected:', code, reason);
  showReconnectingUI();
});

client.connect();
```

---

### **C. Server-Side Implementation**

#### **1. Node.js with `ws` Library**
```javascript
const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track connected clients
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = generateId();
  console.log(`Client ${clientId} connected`);
  
  // Store client
  clients.set(clientId, {
    ws,
    userId: null,
    subscriptions: new Set()
  });
  
  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(clientId, message);
    } catch (error) {
      console.error('Invalid message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`Client ${clientId} error:`, error);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId
  }));
});

function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  
  switch (message.type) {
    case 'ping':
      // Respond to heartbeat
      client.ws.send(JSON.stringify({ type: 'pong' }));
      break;
      
    case 'authenticate':
      // Authenticate user
      client.userId = message.userId;
      client.ws.send(JSON.stringify({
        type: 'authenticated',
        userId: message.userId
      }));
      break;
      
    case 'subscribe':
      // Subscribe to channel
      client.subscriptions.add(message.channel);
      client.ws.send(JSON.stringify({
        type: 'subscribed',
        channel: message.channel
      }));
      break;
      
    case 'message':
      // Broadcast message to channel
      broadcast(message.channel, {
        type: 'message',
        from: client.userId,
        text: message.text,
        timestamp: Date.now()
      });
      break;
  }
}

function broadcast(channel, message) {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.subscriptions.has(channel) && 
        client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

// Start server
server.listen(8080, () => {
  console.log('WebSocket server running on port 8080');
});
```

#### **2. Scaling WebSockets with Redis Pub/Sub**
```javascript
const redis = require('redis');
const WebSocket = require('ws');

// Create Redis clients
const publisher = redis.createClient();
const subscriber = redis.createClient();

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Map();

// Subscribe to Redis channels
subscriber.on('message', (channel, message) => {
  // Broadcast to WebSocket clients subscribed to this channel
  const data = JSON.parse(message);
  
  clients.forEach((client) => {
    if (client.subscriptions.has(channel) && 
        client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
});

wss.on('connection', (ws) => {
  const clientId = generateId();
  
  clients.set(clientId, {
    ws,
    subscriptions: new Set()
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    if (message.type === 'subscribe') {
      // Subscribe to Redis channel
      const channel = message.channel;
      clients.get(clientId).subscriptions.add(channel);
      subscriber.subscribe(channel);
      
    } else if (message.type === 'publish') {
      // Publish to Redis (will be broadcast to all servers)
      publisher.publish(message.channel, JSON.stringify(message.data));
    }
  });
  
  ws.on('close', () => {
    const client = clients.get(clientId);
    
    // Unsubscribe from Redis channels
    client.subscriptions.forEach((channel) => {
      subscriber.unsubscribe(channel);
    });
    
    clients.delete(clientId);
  });
});
```

---

### **D. Connection Management**

#### **1. Heartbeat / Ping-Pong**
```javascript
// Server-side heartbeat
wss.on('connection', (ws) => {
  ws.isAlive = true;
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Ping all clients every 30 seconds
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      // Client didn't respond to last ping
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});
```

#### **2. Automatic Reconnection**
```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.reconnectInterval = options.reconnectInterval || 1000;
    this.maxReconnectInterval = options.maxReconnectInterval || 30000;
    this.reconnectDecay = options.reconnectDecay || 1.5;
    this.timeoutInterval = options.timeoutInterval || 2000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || null;
    
    this.reconnectAttempts = 0;
    this.readyState = WebSocket.CONNECTING;
    this.forcedClose = false;
    
    this.open();
  }
  
  open() {
    this.ws = new WebSocket(this.url);
    
    const timeout = setTimeout(() => {
      console.log('Connection timeout');
      this.ws.close();
      this.reconnect();
    }, this.timeoutInterval);
    
    this.ws.onopen = (event) => {
      clearTimeout(timeout);
      console.log('WebSocket connected');
      this.readyState = WebSocket.OPEN;
      this.reconnectAttempts = 0;
      this.onopen && this.onopen(event);
    };
    
    this.ws.onmessage = (event) => {
      this.onmessage && this.onmessage(event);
    };
    
    this.ws.onclose = (event) => {
      clearTimeout(timeout);
      this.readyState = WebSocket.CLOSED;
      
      if (this.forcedClose) {
        this.onclose && this.onclose(event);
      } else {
        this.reconnect();
      }
    };
    
    this.ws.onerror = (event) => {
      clearTimeout(timeout);
      this.onerror && this.onerror(event);
    };
  }
  
  reconnect() {
    if (this.maxReconnectAttempts !== null && 
        this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts - 1),
      this.maxReconnectInterval
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.open();
    }, delay);
  }
  
  send(data) {
    if (this.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      throw new Error('WebSocket is not open');
    }
  }
  
  close() {
    this.forcedClose = true;
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage
const ws = new ReconnectingWebSocket('wss://example.com/socket', {
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
  reconnectDecay: 1.5,
  maxReconnectAttempts: 10
});

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onclose = () => console.log('Disconnected');
```

---

### **E. Security Considerations**

#### **1. Authentication**
```javascript
// Client sends auth token during connection
const ws = new WebSocket('wss://example.com/socket');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: getAuthToken()
  }));
};

// Server validates token
wss.on('connection', (ws, req) => {
  let authenticated = false;
  let userId = null;
  
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      ws.close(4000, 'Authentication timeout');
    }
  }, 5000); // 5 second timeout
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    if (!authenticated && message.type === 'auth') {
      // Validate token
      const user = validateToken(message.token);
      
      if (user) {
        authenticated = true;
        userId = user.id;
        clearTimeout(authTimeout);
        
        ws.send(JSON.stringify({
          type: 'auth_success',
          userId: user.id
        }));
      } else {
        ws.close(4001, 'Invalid token');
      }
    } else if (!authenticated) {
      ws.close(4002, 'Must authenticate first');
    } else {
      // Handle authenticated messages
      handleMessage(userId, message);
    }
  });
});
```

#### **2. Rate Limiting**
```javascript
const rateLimits = new Map();

function checkRateLimit(clientId) {
  const now = Date.now();
  const limit = rateLimits.get(clientId) || { count: 0, resetTime: now + 60000 };
  
  if (now > limit.resetTime) {
    // Reset window
    limit.count = 1;
    limit.resetTime = now + 60000;
  } else {
    limit.count++;
  }
  
  rateLimits.set(clientId, limit);
  
  return limit.count <= 100; // 100 messages per minute
}

ws.on('message', (data) => {
  if (!checkRateLimit(clientId)) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Rate limit exceeded'
    }));
    return;
  }
  
  // Process message
});
```

---

### **F. Production Optimizations**

#### **1. Message Batching**
```javascript
// Client-side message batching
class BatchingWebSocket {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.queue = [];
    this.batchInterval = 100; // 100ms
    this.batchTimer = null;
  }
  
  send(message) {
    this.queue.push(message);
    
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flush();
      }, this.batchInterval);
    }
  }
  
  flush() {
    if (this.queue.length > 0) {
      this.ws.send(JSON.stringify({
        type: 'batch',
        messages: this.queue
      }));
      this.queue = [];
    }
    this.batchTimer = null;
  }
}
```

#### **2. Binary Compression**
```javascript
// Use binary frames for efficiency
const buffer = new ArrayBuffer(8);
const view = new DataView(buffer);

view.setUint32(0, userId);
view.setUint32(4, timestamp);

ws.send(buffer); // Send as binary frame
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Slack**
- WebSocket for real-time messages
- Heartbeat every 30 seconds
- Automatic reconnection with exponential backoff
- Falls back to polling if WebSocket unavailable
- Uses Redis Pub/Sub for multi-server scaling

### **Example 2: Google Docs**
- WebSocket for collaborative editing
- Operational Transform for conflict resolution
- Batches keystrokes every 200ms
- Sends cursor position updates
- Maintains connection even when tab hidden

### **Example 3: Trading Platform**
- Binary WebSocket frames for efficiency
- Separate connections for different data streams
- Sub-millisecond latency requirements
- Extensive monitoring and alerting
- Circuit breaker if message rate exceeds threshold

### **Example 4: Live Sports App**
- WebSocket for live score updates
- Pub/Sub for multi-server broadcasting
- Connection pooling (1 connection per 1000 users)
- Graceful degradation to SSE or polling
- Regional WebSocket servers for low latency

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"WebSockets provide full-duplex, bidirectional communication over a single TCP connection. The connection starts with an HTTP upgrade handshake, then switches to WebSocket protocol for efficient, low-latency messaging."*
>
> *"For production, I'd implement heartbeats to detect dead connections—send ping every 30 seconds, close if no pong response. For reliability, I'd add automatic reconnection with exponential backoff, starting at 1 second and capping at 30 seconds, with a maximum of 10 attempts."*
>
> *"Authentication happens after connection—client sends auth token in first message, server validates within 5 seconds or closes connection. For security, I'd also add rate limiting (e.g., 100 messages per minute per client) and message size limits (e.g., 64KB max)."*
>
> *"At scale with multiple servers, I'd use Redis Pub/Sub for message routing—each server subscribes to Redis channels, and when a client publishes a message, it's broadcast through Redis to all servers, which then push to their connected clients. This enables horizontal scaling while maintaining message delivery to all clients."*
>
> *"For monitoring, I'd track connection count, message throughput, reconnection rate, and heartbeat failures. If reconnection rate exceeds 10%, that indicates network issues or server problems needing investigation."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive implementations.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Real-time**: Instant message delivery (no polling delay)
- **Efficient**: No repeated HTTP handshakes, minimal overhead
- **Bidirectional**: Server can push without client request
- **Low latency**: Ideal for interactive applications

### **How It Works**
1. **Handshake**: Client sends HTTP upgrade request
2. **Protocol switch**: Server accepts, switches to WebSocket
3. **Messaging**: Both sides send/receive frames at will
4. **Heartbeat**: Periodic pings to detect dead connections
5. **Close**: Either side can close gracefully

### **When to Use**
- Real-time chat, notifications, live updates
- Collaborative editing
- Multiplayer games
- Live dashboards
- Any app requiring instant bidirectional communication
