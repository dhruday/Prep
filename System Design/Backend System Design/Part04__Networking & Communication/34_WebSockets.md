# 34. WebSockets

## ───────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**WebSocket** is a communication protocol providing full-duplex (bidirectional), persistent connections between client and server over a single TCP connection. Unlike HTTP's request-response model, WebSocket enables real-time, low-latency data exchange where either party can send messages at any time.

**What it is:**
- Persistent, bidirectional communication channel
- Starts as HTTP upgrade request, then switches to WebSocket protocol
- Minimal framing overhead (2-14 bytes per message)
- Full-duplex: client and server can send simultaneously

**Why it exists:**
- Enable true real-time communication (chat, gaming, collaboration)
- Eliminate overhead of repeated HTTP requests (polling)
- Reduce latency to sub-100ms for message delivery
- Support server-initiated messages (push notifications)

**Problem it solves:**
- HTTP polling wastes bandwidth and server resources
- Long polling still has reconnection overhead
- SSE is unidirectional (server → client only)
- Need for low-latency, bidirectional communication

**In large-scale distributed systems:**
- Real-time features: chat (Slack, Discord), live updates (trading platforms)
- Multiplayer games requiring sub-50ms latency
- Collaborative tools (Google Docs, Figma)
- Live dashboards and monitoring systems
- IoT device communication

💡 **Interview Opening:** "WebSocket is a protocol for persistent, bidirectional communication between client and server with minimal overhead. Unlike HTTP's request-response model, WebSocket maintains an open connection where either party can send messages anytime, achieving sub-100ms latency. It starts with an HTTP upgrade handshake, then switches to WebSocket framing with only 2-14 bytes per message overhead. Companies like Slack, Discord, and trading platforms use WebSockets for real-time features where even 500ms delay from polling is unacceptable. The trade-off is complexity—load balancing, scaling, and debugging are harder than HTTP."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **WebSocket Protocol**

#### **Connection Upgrade (Handshake)**

**Client request:**
```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Sec-WebSocket-Protocol: chat, superchat
Sec-WebSocket-Extensions: permessage-deflate
Origin: https://example.com
```

**Server response:**
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat
```

**Key headers:**
- `Upgrade: websocket`: Request protocol upgrade
- `Sec-WebSocket-Key`: Random base64-encoded value (16 bytes)
- `Sec-WebSocket-Accept`: Server computes from client key + magic string
- `Sec-WebSocket-Protocol`: Application-level subprotocols
- `Sec-WebSocket-Version`: Protocol version (currently 13)

**Accept key calculation:**
```javascript
const crypto = require('crypto');

function generateAcceptKey(clientKey) {
    const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    const hash = crypto
        .createHash('sha1')
        .update(clientKey + MAGIC_STRING)
        .digest('base64');
    return hash;
}

// Example:
// Client key: dGhlIHNhbXBsZSBub25jZQ==
// Accept key: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

#### **WebSocket Framing**

**Frame structure:**
```
  0                   1                   2                   3
  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-------+-+-------------+-------------------------------+
 |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
 |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
 |N|V|V|V|       |S|             |   (if payload len==126/127)   |
 | |1|2|3|       |K|             |                               |
 +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 |     Extended payload length continued, if payload len == 127  |
 + - - - - - - - - - - - - - - - +-------------------------------+
 |                               |Masking-key, if MASK set to 1  |
 +-------------------------------+-------------------------------+
 | Masking-key (continued)       |          Payload Data         |
 +-------------------------------- - - - - - - - - - - - - - - - +
 :                     Payload Data continued ...                :
 + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
 |                     Payload Data continued ...                |
 +---------------------------------------------------------------+
```

**Opcodes:**
```
0x0: Continuation frame
0x1: Text frame (UTF-8)
0x2: Binary frame
0x8: Connection close
0x9: Ping
0xA: Pong
```

**Example frames:**
```
Text message "Hello":
FIN=1, Opcode=0x1 (text)
MASK=1 (client to server)
Payload length=5
Masking key: 4 random bytes
Payload: "Hello" XOR with masking key

Total frame size: 2 (header) + 4 (mask) + 5 (payload) = 11 bytes
Compare to HTTP: ~500 bytes (headers + body)
```

**Masking (client → server):**
```javascript
function maskPayload(payload, maskingKey) {
    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
        masked[i] = payload[i] ^ maskingKey[i % 4];
    }
    return masked;
}

// Client MUST mask all frames to server
// Server MUST NOT mask frames to client
// Prevents cache poisoning attacks
```

### **Implementation Examples**

#### **Server (Node.js with ws library)**

```javascript
const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Track connected clients
const clients = new Map(); // userId → WebSocket

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    // Extract user ID from query or auth token
    const userId = getUserIdFromRequest(req);
    
    if (!userId) {
        ws.close(1008, 'Unauthorized'); // Policy violation
        return;
    }
    
    // Store client
    clients.set(userId, ws);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        userId: userId,
        timestamp: Date.now()
    }));
    
    // Handle incoming messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(userId, message, ws);
        } catch (error) {
            console.error('Invalid JSON:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        }
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
        console.log(`Client disconnected: ${userId}, code=${code}, reason=${reason}`);
        clients.delete(userId);
    });
    
    // Heartbeat to detect dead connections
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

// Ping all clients every 30 seconds
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate(); // Kill dead connection
        }
        
        ws.isAlive = false;
        ws.ping(); // Send ping, expect pong
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

// Handle application messages
function handleMessage(fromUserId, message, ws) {
    switch (message.type) {
        case 'chat':
            // Send to specific user
            const toWs = clients.get(message.toUserId);
            if (toWs && toWs.readyState === WebSocket.OPEN) {
                toWs.send(JSON.stringify({
                    type: 'chat',
                    from: fromUserId,
                    text: message.text,
                    timestamp: Date.now()
                }));
            } else {
                // User offline, queue message
                queueMessage(message.toUserId, message);
            }
            break;
            
        case 'broadcast':
            // Send to all connected users
            const data = JSON.stringify({
                type: 'broadcast',
                from: fromUserId,
                text: message.text,
                timestamp: Date.now()
            });
            
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(data);
                }
            });
            break;
            
        case 'typing':
            // Typing indicator
            const typingWs = clients.get(message.toUserId);
            if (typingWs && typingWs.readyState === WebSocket.OPEN) {
                typingWs.send(JSON.stringify({
                    type: 'typing',
                    from: fromUserId
                }));
            }
            break;
            
        default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
}

server.listen(3000, () => {
    console.log('WebSocket server listening on port 3000');
});
```

#### **Client (JavaScript)**

```javascript
class WebSocketClient {
    constructor(url, userId) {
        this.url = url;
        this.userId = userId;
        this.ws = null;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.reconnectAttempts = 0;
        this.handlers = new Map();
    }
    
    connect() {
        this.ws = new WebSocket(`${this.url}?userId=${this.userId}`);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectDelay = 1000;
            this.reconnectAttempts = 0;
            
            if (this.handlers.has('open')) {
                this.handlers.get('open')();
            }
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (this.handlers.has(message.type)) {
                    this.handlers.get(message.type)(message);
                }
                
                if (this.handlers.has('message')) {
                    this.handlers.get('message')(message);
                }
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            
            if (this.handlers.has('error')) {
                this.handlers.get('error')(error);
            }
        };
        
        this.ws.onclose = (event) => {
            console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
            
            if (this.handlers.has('close')) {
                this.handlers.get('close')(event);
            }
            
            // Reconnect logic
            if (event.code !== 1000) { // Not normal closure
                this.scheduleReconnect();
            }
        };
    }
    
    scheduleReconnect() {
        this.reconnectAttempts++;
        
        setTimeout(() => {
            console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
            this.connect();
        }, this.reconnectDelay);
        
        // Exponential backoff
        this.reconnectDelay = Math.min(
            this.reconnectDelay * 2,
            this.maxReconnectDelay
        );
    }
    
    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        } else {
            console.error('WebSocket not connected');
        }
    }
    
    on(event, handler) {
        this.handlers.set(event, handler);
    }
    
    close() {
        if (this.ws) {
            this.ws.close(1000, 'Client closing'); // Normal closure
        }
    }
}

// Usage
const client = new WebSocketClient('ws://localhost:3000', 'user123');

client.on('open', () => {
    console.log('Connected to server');
});

client.on('welcome', (message) => {
    console.log('Welcome:', message);
});

client.on('chat', (message) => {
    console.log(`Message from ${message.from}: ${message.text}`);
});

client.on('typing', (message) => {
    console.log(`${message.from} is typing...`);
});

client.on('close', (event) => {
    if (event.code === 1008) {
        console.error('Unauthorized, not reconnecting');
    }
});

client.connect();

// Send message
client.send('chat', {
    toUserId: 'user456',
    text: 'Hello!'
});

// Send typing indicator
client.send('typing', {
    toUserId: 'user456'
});
```

#### **Advanced: WebSocket with Redis for Multi-Server**

```javascript
const WebSocket = require('ws');
const redis = require('redis');

class DistributedWebSocketServer {
    constructor(port) {
        this.port = port;
        this.clients = new Map(); // userId → WebSocket
        
        // Redis for pub/sub across servers
        this.subscriber = redis.createClient();
        this.publisher = redis.createClient();
        
        this.setupWebSocketServer();
        this.setupRedis();
    }
    
    setupWebSocketServer() {
        const server = http.createServer();
        this.wss = new WebSocket.Server({ server });
        
        this.wss.on('connection', (ws, req) => {
            const userId = getUserIdFromRequest(req);
            
            if (!userId) {
                return ws.close(1008, 'Unauthorized');
            }
            
            // Store client
            this.clients.set(userId, ws);
            
            // Subscribe to user's Redis channel
            this.subscriber.subscribe(`ws:${userId}`);
            
            ws.on('message', (data) => {
                const message = JSON.parse(data);
                this.handleMessage(userId, message);
            });
            
            ws.on('close', () => {
                this.clients.delete(userId);
                this.subscriber.unsubscribe(`ws:${userId}`);
            });
            
            // Heartbeat
            ws.isAlive = true;
            ws.on('pong', () => ws.isAlive = true);
        });
        
        // Ping interval
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
        
        server.listen(this.port);
    }
    
    setupRedis() {
        this.subscriber.on('message', (channel, message) => {
            // Received message from Redis
            const userId = channel.split(':')[1];
            const ws = this.clients.get(userId);
            
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(message); // Forward to WebSocket client
            }
        });
    }
    
    handleMessage(fromUserId, message) {
        switch (message.type) {
            case 'chat':
                // Publish to Redis (all servers will receive)
                const data = JSON.stringify({
                    type: 'chat',
                    from: fromUserId,
                    text: message.text,
                    timestamp: Date.now()
                });
                
                this.publisher.publish(`ws:${message.toUserId}`, data);
                break;
                
            case 'broadcast':
                // Publish to broadcast channel
                const broadcastData = JSON.stringify({
                    type: 'broadcast',
                    from: fromUserId,
                    text: message.text,
                    timestamp: Date.now()
                });
                
                this.publisher.publish('ws:broadcast', broadcastData);
                
                // Also subscribe all servers to broadcast channel
                this.subscriber.subscribe('ws:broadcast');
                break;
        }
    }
}

// Start multiple servers
const server1 = new DistributedWebSocketServer(3001);
const server2 = new DistributedWebSocketServer(3002);
const server3 = new DistributedWebSocketServer(3003);
```

### **Load Balancing WebSockets**

#### **Challenge: Sticky Sessions**

```
Problem:
- WebSocket is a persistent connection
- Client must stay connected to same server
- Standard round-robin won't work

User A ──► Server 1 (WebSocket open)
User A ──► Server 2 (load balancer routes here)
❌ Two separate connections, won't work
```

#### **Solution 1: IP Hash (Nginx)**

```nginx
upstream websocket {
    ip_hash;  # Same IP always routes to same server
    server server1:3000;
    server server2:3000;
    server server3:3000;
}

server {
    listen 80;
    
    location /ws {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Important timeouts
        proxy_connect_timeout 7d;  # Long timeout for WebSocket
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

#### **Solution 2: Redis Pub/Sub (Distributed)**

```
Client A ──► Server 1 ──┐
Client B ──► Server 1 ──┤
Client C ──► Server 2 ──┼──► Redis Pub/Sub
Client D ──► Server 2 ──┤
Client E ──► Server 3 ──┘

Message from User A to User C:
1. User A sends to Server 1
2. Server 1 publishes to Redis: channel "ws:userC"
3. Server 2 receives (subscribed to User C)
4. Server 2 sends to User C's WebSocket

No sticky sessions needed!
```

#### **Solution 3: HAProxy with Source Hash**

```haproxy
frontend websocket_front
    bind *:80
    default_backend websocket_back

backend websocket_back
    balance source  # Hash based on source IP
    hash-type consistent  # Consistent hashing
    server server1 192.168.1.10:3000 check
    server server2 192.168.1.11:3000 check
    server server3 192.168.1.12:3000 check
    
    # Health check (HTTP upgrade check)
    option httpchk GET /health
    http-check expect status 200
```

### **WebSocket vs HTTP Overhead**

**Connection establishment:**
```
HTTP request:
TCP handshake:  1.5 RTT (30ms)
TLS handshake:  2 RTT (40ms)
HTTP request:   0.5 RTT (10ms)
Total:          4 RTT (~80ms)

Per request: 80ms + processing

WebSocket:
Initial setup: 4 RTT (~80ms) - same as HTTP
Subsequent messages: 0 RTT
Total: 0ms overhead after connection

Savings: 80ms per message after first
```

**Message overhead:**
```
HTTP (JSON API call):
POST /api/message HTTP/1.1
Host: example.com
Content-Type: application/json
Content-Length: 50
Authorization: Bearer <token>
...other headers...

{"toUserId": "123", "text": "Hello"}

Total: ~500 bytes (400 headers + 100 body)

WebSocket (same message):
Frame header: 2-6 bytes
Payload: {"toUserId":"123","text":"Hello"} = 40 bytes
Total: ~46 bytes

Savings: 91% (500 bytes → 46 bytes)
```

**Bandwidth comparison (1000 messages/sec):**
```
HTTP:
1000 msg/sec × 500 bytes = 500 KB/sec = 4 Mbps

WebSocket:
1000 msg/sec × 46 bytes = 46 KB/sec = 0.368 Mbps

Bandwidth saved: 92%
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Scenario: Real-Time Chat Application**

**Requirements:**
- 10 million registered users
- 1 million concurrent online users at peak
- Average 10 messages per user per hour
- 95th percentile latency < 100ms

**Calculations:**

**1. Concurrent WebSocket connections:**
```
Online users: 1,000,000
WebSocket connections: 1,000,000 (one per user)
```

**2. Memory per connection:**
```
TCP buffers: 100 KB (send + receive buffers)
Application state: 50 KB (user info, message queue)
WebSocket overhead: 10 KB
Total per connection: ~160 KB

Total memory: 1M × 160 KB = 160 GB
```

**3. Server capacity:**
```
Memory per server: 32 GB RAM
Connections per server: 32 GB / 160 KB ≈ 200,000 connections

Number of servers: 1M / 200,000 = 5 servers minimum

With 50% headroom: 8 servers
```

**4. Message rate:**
```
Messages per hour: 1M users × 10 messages = 10M messages
Messages per second: 10M / 3600 = 2,778 msg/sec
Peak (assume 3x): 8,333 msg/sec
```

**5. Bandwidth:**
```
Average message size: 200 bytes (text + metadata)
WebSocket frame overhead: 6 bytes
Total per message: 206 bytes

Inbound: 2,778 msg/sec × 206 bytes = 572 KB/sec = 4.5 Mbps
Outbound: Same (unicast) = 4.5 Mbps

Peak: 13.5 Mbps

With redundancy and control messages: ~20 Mbps per server
Total for 8 servers: 160 Mbps
```

**6. Latency budget:**
```
Target: < 100ms (p95)

Breakdown:
Client send:        5ms
Network to LB:     10ms
LB to server:       5ms
Server processing:  5ms
Redis pub/sub:      3ms (if multi-server)
Server to client:  10ms
Network to client:  5ms
Client receive:     5ms
──────────────────────
Total:            ~48ms

Headroom: 52ms (for network variance, queueing)
```

**7. Cost estimation (AWS):**
```
EC2 instances:
- c5.2xlarge (8 vCPU, 16 GB RAM): $0.34/hour
- 8 instances: $0.34 × 8 × 730 hours = $1,987/month

Load Balancer:
- Application Load Balancer: $22/month
- Data processed: 160 Mbps × 730 hours × 3600s = ~421 TB
- $0.008/GB: 421,000 GB × $0.008 = $3,368/month

Redis (ElastiCache):
- cache.r5.large (2 vCPU, 13.5 GB): $0.145/hour
- 2 instances (primary + replica): $0.145 × 2 × 730 = $212/month

Bandwidth:
- Data transfer out: 421 TB × $0.09/GB = $37,890/month
  (Actual: Only messages sent to clients, ~50% = $18,945/month)

Total: ~$24,500/month

Comparison with HTTP polling (5-second interval):
- 1M users × (3600/5) req/hour = 720M req/hour
- AWS API Gateway: $3.50 per million requests
- 720M req/hour × 730 hours × $3.50/1M = $1,839,600/month

WebSocket savings: 98.7% ($1.8M → $25K)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Message Persistence**

**Scenario: User offline, receives messages when reconnecting**

**Option 1: PostgreSQL (Structured Data)**
```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    INDEX idx_to_user_delivered (to_user_id, delivered_at)
);

-- Client reconnects, fetch undelivered messages
SELECT * FROM messages
WHERE to_user_id = $1 AND delivered_at IS NULL
ORDER BY created_at ASC
LIMIT 100;

-- Mark as delivered
UPDATE messages
SET delivered_at = NOW()
WHERE id = ANY($1);
```

**Option 2: Redis Streams (Fast, Ephemeral)**
```javascript
// Add message to stream
await redis.xadd(
    `stream:user:${toUserId}`,
    'MAXLEN', '~', '1000',  // Keep last ~1000 messages
    '*',  // Auto-generate ID
    'from', fromUserId,
    'text', messageText,
    'timestamp', Date.now()
);

// Client reconnects with last message ID
const messages = await redis.xread(
    'COUNT', 100,
    'STREAMS', `stream:user:${userId}`, lastMessageId
);

// Stream IDs are sortable: 1623456789012-0
// Client can resume from last received ID
```

**Option 3: Cassandra (High Write Throughput)**
```cql
CREATE TABLE messages (
    user_id BIGINT,
    message_id TIMEUUID,
    from_user_id BIGINT,
    message_text TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (user_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- Fetch recent messages
SELECT * FROM messages
WHERE user_id = ?
AND message_id > ?
ORDER BY message_id ASC
LIMIT 100;
```

**Hybrid approach:**
```
Real-time delivery: WebSocket → Redis Pub/Sub
Persistence: PostgreSQL/Cassandra
Offline queue: Redis Streams (TTL 7 days)

Flow:
1. Message sent → Redis Pub/Sub (instant delivery if online)
2. Also write to PostgreSQL (durable storage)
3. If user offline → Add to Redis Stream
4. User reconnects → Fetch from Redis Stream (fast)
5. If Redis expired → Fetch from PostgreSQL (slower)
```

### **Connection State Management**

**Track online users (Redis)**
```javascript
// User connects
await redis.sadd('online_users', userId);
await redis.setex(`user:${userId}:server`, 300, serverIdential);
// Expires in 5 minutes, refreshed by heartbeat

// User disconnects
await redis.srem('online_users', userId);
await redis.del(`user:${userId}:server`);

// Check if user is online
const isOnline = await redis.sismember('online_users', userId);

// Find which server user is connected to
const server = await redis.get(`user:${userId}:server`);
```

**Presence system:**
```javascript
// User activity
await redis.zadd('user_presence', Date.now(), userId);

// Find users active in last 5 minutes
const activeUsers = await redis.zrangebyscore(
    'user_presence',
    Date.now() - 300000,  // 5 minutes ago
    Date.now()
);

// Clean up old entries
await redis.zremrangebyscore(
    'user_presence',
    0,
    Date.now() - 600000  // Remove > 10 minutes old
);
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Horizontal Scaling Pattern**

```
          ┌──────────────┐
          │Load Balancer │
          │  (sticky)    │
          └──────┬───────┘
                 │
        ┌────────┼────────┐
        │        │        │
    ┌───▼───┐ ┌─▼────┐ ┌─▼────┐
    │Server1│ │Server2│ │Server3│
    │       │ │       │ │       │
    │100K   │ │100K   │ │100K   │
    │users  │ │users  │ │users  │
    └───┬───┘ └──┬───┘ └──┬───┘
        │        │        │
        └────────┼────────┘
                 │
          ┌──────▼──────┐
          │Redis Pub/Sub│
          └─────────────┘
```

**Graceful degradation:**
```javascript
// Server announces shutdown
wss.on('close', () => {
    // Send close frame to all clients
    wss.clients.forEach((ws) => {
        ws.close(1001, 'Server restarting'); // Going away
    });
});

// Client handles server shutdown
ws.onclose = (event) => {
    if (event.code === 1001) {
        // Server shutting down gracefully
        console.log('Server restarting, reconnecting...');
        setTimeout(() => this.connect(), 1000);
    } else if (event.code === 1006) {
        // Abnormal closure (crash)
        console.error('Server crashed, reconnecting with backoff...');
        this.exponentialBackoff();
    }
};
```

### **Heartbeat & Dead Connection Detection**

```javascript
// Server-side heartbeat
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 35000;  // 35 seconds

const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('Terminating dead connection');
            return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping(); // Send ping frame
    });
}, HEARTBEAT_INTERVAL);

wss.on('connection', (ws) => {
    ws.isAlive = true;
    
    ws.on('pong', () => {
        ws.isAlive = true; // Received pong, connection alive
    });
});
```

**Client-side heartbeat:**
```javascript
class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.heartbeatInterval = null;
        this.lastPong = Date.now();
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            this.startHeartbeat();
        };
        
        // Handle ping from server
        this.ws.addEventListener('ping', () => {
            this.ws.pong(); // Send pong response
        });
        
        // Note: Browser WebSocket API doesn't expose ping/pong
        // Need to implement application-level heartbeat
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.type === 'ping') {
                this.ws.send(JSON.stringify({ type: 'pong' }));
                this.lastPong = Date.now();
            }
        };
        
        this.ws.onclose = () => {
            this.stopHeartbeat();
        };
    }
    
    startHeartbeat() {
        // Application-level ping/pong
        this.heartbeatInterval = setInterval(() => {
            if (Date.now() - this.lastPong > 35000) {
                console.error('Heartbeat timeout, reconnecting...');
                this.ws.close();
                this.connect();
            } else {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}
```

### **Message Delivery Guarantees**

**At-most-once (no guarantee):**
```javascript
// Simple send, no acknowledgment
ws.send(JSON.stringify({ type: 'chat', text: 'Hello' }));
// If connection dies, message is lost
```

**At-least-once (with retries):**
```javascript
class ReliableWebSocket {
    constructor(url) {
        this.url = url;
        this.pendingMessages = new Map(); // messageId → message
        this.messageId = 0;
    }
    
    send(type, data) {
        const messageId = ++this.messageId;
        const message = { messageId, type, ...data };
        
        // Store for retry
        this.pendingMessages.set(messageId, message);
        
        // Send message
        this.ws.send(JSON.stringify(message));
        
        // Retry if no ACK within 5 seconds
        setTimeout(() => {
            if (this.pendingMessages.has(messageId)) {
                console.log('Retrying message:', messageId);
                this.ws.send(JSON.stringify(message));
            }
        }, 5000);
    }
    
    handleAck(ackMessageId) {
        // Server acknowledged, remove from pending
        this.pendingMessages.delete(ackMessageId);
    }
}

// Server sends ACK
ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    // Process message...
    
    // Send ACK
    ws.send(JSON.stringify({
        type: 'ack',
        messageId: message.messageId
    }));
});
```

**Exactly-once (with idempotency):**
```javascript
// Server tracks processed message IDs
const processedMessages = new Set();

ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    // Check if already processed (de-duplication)
    if (processedMessages.has(message.messageId)) {
        // Already processed, send ACK again
        ws.send(JSON.stringify({ type: 'ack', messageId: message.messageId }));
        return;
    }
    
    // Process message (idempotent operation)
    handleMessage(message);
    
    // Mark as processed
    processedMessages.add(message.messageId);
    
    // Send ACK
    ws.send(JSON.stringify({ type: 'ack', messageId: message.messageId }));
    
    // Clean up old IDs (after 1 hour)
    setTimeout(() => {
        processedMessages.delete(message.messageId);
    }, 3600000);
});
```

### **Monitoring & Observability**

```javascript
const prometheus = require('prom-client');

// Metrics
const wsConnections = new prometheus.Gauge({
    name: 'websocket_connections_total',
    help: 'Number of active WebSocket connections'
});

const wsMessages = new prometheus.Counter({
    name: 'websocket_messages_total',
    help: 'Total number of WebSocket messages',
    labelNames: ['type', 'direction'] // inbound/outbound
});

const wsLatency = new prometheus.Histogram({
    name: 'websocket_message_latency_seconds',
    help: 'WebSocket message processing latency',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

// Update metrics
wss.on('connection', (ws) => {
    wsConnections.inc();
    
    ws.on('message', (data) => {
        const start = Date.now();
        wsMessages.inc({ type: 'chat', direction: 'inbound' });
        
        // Process message...
        
        const duration = (Date.now() - start) / 1000;
        wsLatency.observe(duration);
    });
    
    ws.on('close', () => {
        wsConnections.dec();
    });
});
```

**Alert rules:**
```yaml
groups:
  - name: websocket
    rules:
      - alert: HighWebSocketConnections
        expr: websocket_connections_total > 200000
        for: 5m
        annotations:
          summary: "High number of WebSocket connections"
          
      - alert: WebSocketConnectionDrops
        expr: delta(websocket_connections_total[1m]) < -1000
        annotations:
          summary: "Sudden drop in WebSocket connections"
          
      - alert: HighWebSocketLatency
        expr: histogram_quantile(0.95, websocket_message_latency_seconds) > 0.1
        for: 5m
        annotations:
          summary: "p95 WebSocket latency > 100ms"
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **Authentication**

**Option 1: Query Parameter (Simple but less secure)**
```javascript
// Client
const token = localStorage.getItem('authToken');
const ws = new WebSocket(`wss://api.example.com/ws?token=${token}`);

// Server
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    
    if (!token) {
        return ws.close(1008, 'Missing token');
    }
    
    try {
        const user = verifyJWT(token);
        ws.userId = user.id;
    } catch (error) {
        return ws.close(1008, 'Invalid token');
    }
});
```

**Option 2: Initial Message (Better)**
```javascript
// Client
const ws = new WebSocket('wss://api.example.com/ws');

ws.onopen = () => {
    ws.send(JSON.stringify({
        type: 'auth',
        token: localStorage.getItem('authToken')
    }));
};

// Server
wss.on('connection', (ws) => {
    let authenticated = false;
    let authTimeout;
    
    // Must authenticate within 5 seconds
    authTimeout = setTimeout(() => {
        if (!authenticated) {
            ws.close(1008, 'Authentication timeout');
        }
    }, 5000);
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (!authenticated) {
            if (message.type === 'auth') {
                try {
                    const user = verifyJWT(message.token);
                    ws.userId = user.id;
                    authenticated = true;
                    clearTimeout(authTimeout);
                    
                    ws.send(JSON.stringify({ type: 'auth_success' }));
                } catch (error) {
                    ws.close(1008, 'Invalid token');
                }
            } else {
                ws.close(1008, 'Must authenticate first');
            }
        } else {
            // Handle authenticated messages
            handleMessage(ws, message);
        }
    });
});
```

**Option 3: Subprotocol (Most Secure)**
```javascript
// Client
const ws = new WebSocket('wss://api.example.com/ws', [
    'auth',
    `Bearer.${token}`
]);

// Server
wss.handleProtocols = (protocols, request) => {
    for (const protocol of protocols) {
        if (protocol.startsWith('Bearer.')) {
            const token = protocol.substring(7);
            try {
                const user = verifyJWT(token);
                request.userId = user.id;
                return 'auth'; // Accept connection
            } catch (error) {
                // Reject connection
            }
        }
    }
    return false; // Reject
};
```

### **Authorization & Rate Limiting**

```javascript
const rateLimit = require('express-rate-limit');

// Message rate limiting per user
const userMessageCounts = new Map(); // userId → { count, resetTime }

function checkRateLimit(userId) {
    const now = Date.now();
    const limit = 100; // 100 messages per minute
    const window = 60000; // 1 minute
    
    let record = userMessageCounts.get(userId);
    
    if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + window };
        userMessageCounts.set(userId, record);
    }
    
    if (record.count >= limit) {
        return false; // Rate limit exceeded
    }
    
    record.count++;
    return true;
}

ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    if (!checkRateLimit(ws.userId)) {
        ws.send(JSON.stringify({
            type: 'error',
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many messages, slow down'
        }));
        return;
    }
    
    // Process message...
});
```

### **Input Validation**

```javascript
const Joi = require('joi');

const chatMessageSchema = Joi.object({
    type: Joi.string().valid('chat').required(),
    toUserId: Joi.string().required(),
    text: Joi.string().max(5000).required() // Max 5000 characters
});

ws.on('message', (data) => {
    let message;
    
    try {
        message = JSON.parse(data);
    } catch (error) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
    
    // Validate schema
    const { error, value } = chatMessageSchema.validate(message);
    
    if (error) {
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            details: error.details
        }));
    }
    
    // Check authorization (can user send to toUserId?)
    if (!canSendTo(ws.userId, value.toUserId)) {
        return ws.send(JSON.stringify({
            type: 'error',
            code: 'FORBIDDEN',
            message: 'Cannot send message to this user'
        }));
    }
    
    // Process valid message
    handleChatMessage(ws.userId, value);
});
```

### **Preventing Abuse**

```javascript
// Connection limit per user
const userConnections = new Map(); // userId → Set of WebSocket connections

wss.on('connection', (ws, req) => {
    const userId = authenticateUser(req);
    
    // Check connection limit
    const connections = userConnections.get(userId) || new Set();
    
    if (connections.size >= 5) { // Max 5 connections per user
        return ws.close(1008, 'Too many connections');
    }
    
    connections.add(ws);
    userConnections.set(userId, connections);
    
    ws.on('close', () => {
        connections.delete(ws);
        if (connections.size === 0) {
            userConnections.delete(userId);
        }
    });
});

// Message size limit
ws.on('message', (data) => {
    const MAX_MESSAGE_SIZE = 100 * 1024; // 100 KB
    
    if (data.length > MAX_MESSAGE_SIZE) {
        ws.close(1009, 'Message too large'); // Message too big
        return;
    }
    
    // Process message...
});
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Slack**

**Architecture:**
- WebSocket for real-time messaging
- Channels multiplexed over single connection
- Presence system (online/offline indicators)
- Typing indicators

**Key features:**
```javascript
// Single WebSocket handles multiple channels
{
  "type": "message",
  "channel": "C1234567890",
  "user": "U9876543210",
  "text": "Hello team!"
}

// Typing indicator
{
  "type": "user_typing",
  "channel": "C1234567890",
  "user": "U9876543210"
}

// Presence update
{
  "type": "presence_change",
  "user": "U9876543210",
  "presence": "away"
}
```

**Scaling approach:**
- Sticky sessions with consistent hashing
- Redis for cross-server message routing
- Edge servers in multiple regions (low latency)

### **Example 2: Discord**

**Scale:**
- 150 million monthly active users
- 1 billion messages per day
- Sub-100ms message delivery

**Architecture:**
- Gateway servers (WebSocket connections)
- Guild servers (handle message distribution for each server/guild)
- Voice servers (separate WebSocket for voice)

**Optimization:**
```javascript
// Binary protocol for efficiency (not JSON)
// Payload is compressed with zlib

// Example: Message create event
{
  op: 0,  // Opcode: Dispatch
  d: {    // Data
    content: "Hello",
    author: {...},
    timestamp: "..."
  },
  s: 42,  // Sequence number
  t: "MESSAGE_CREATE"  // Event type
}

// Heartbeat (keep connection alive)
{
  op: 1,  // Opcode: Heartbeat
  d: 251  // Last sequence number received
}
```

**Compression:**
- zlib compression on all payloads
- 80-90% size reduction
- Client must decompress

### **Example 3: Trading Platforms (Coinbase, Robinhood)**

**Requirements:**
- < 50ms latency for price updates
- 10,000+ updates per second
- Guaranteed order of execution

**WebSocket feed:**
```javascript
// Subscribe to BTC/USD ticker
{
  "type": "subscribe",
  "channels": [
    {
      "name": "ticker",
      "product_ids": ["BTC-USD"]
    }
  ]
}

// Receive updates
{
  "type": "ticker",
  "product_id": "BTC-USD",
  "price": "45123.45",
  "time": "2024-01-15T10:30:15.123Z",
  "sequence": 1234567890
}
```

**Optimizations:**
- Direct server-to-client push (no Redis overhead)
- Binary protocol (Protobuf or MessagePack)
- Batch multiple updates per frame
- Throttle updates (max 100 updates/sec per client)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain WebSocket and when you'd use it over HTTP polling.**

**Answer:**
"WebSocket is a protocol for persistent, bidirectional communication between client and server over a single TCP connection. Unlike HTTP's request-response model, WebSocket maintains an open connection where either party can send messages anytime, achieving sub-100ms latency.

**How it works:**
1. Starts with HTTP upgrade request (Upgrade: websocket header)
2. Server responds with 101 Switching Protocols
3. Connection switches to WebSocket protocol
4. Both parties can send messages anytime (full-duplex)
5. Minimal framing overhead (2-14 bytes per message)

**Key advantages over HTTP polling:**

**1. Latency:** Sub-100ms vs 2-5 seconds (polling interval). For chat or trading platforms, this difference is critical.

**2. Efficiency:** After initial handshake, messages have only 2-14 bytes overhead. HTTP requests have ~500 bytes of headers per request. At 1000 msg/sec, WebSocket uses 46 KB/sec vs HTTP's 500 KB/sec (91% reduction).

**3. Server resources:** One persistent connection vs thousands of short-lived HTTP connections. With HTTP polling (5-second interval), 1M users = 200K req/sec. WebSocket = 1M persistent connections but minimal CPU after connection established.

**4. Bidirectional:** Server and client can both initiate messages. HTTP requires separate request for client-to-server communication.

**Trade-offs:**
- ✅ Real-time, low latency (< 100ms)
- ✅ Efficient (minimal overhead)
- ✅ Bidirectional (full-duplex)
- ❌ Complex load balancing (sticky sessions or Redis)
- ❌ Can be blocked by corporate firewalls/proxies
- ❌ No HTTP caching/CDN support
- ❌ Harder to debug (not RESTful)

**I'd use WebSocket for:**
1. Real-time chat (Slack, Discord)
2. Live dashboards (stock tickers, sports scores)
3. Multiplayer games (< 50ms latency required)
4. Collaborative tools (Google Docs, Figma)
5. IoT device communication

**I'd use HTTP (polling/SSE) for:**
1. Low-frequency updates (every 30+ seconds)
2. Public APIs (broader compatibility)
3. One-directional updates only (SSE simpler)
4. Environments with restrictive firewalls

**Real-world pattern:**
Companies like Slack use WebSocket as primary transport with long polling as fallback. If WebSocket connection fails, automatically degrade to long polling. This ensures compatibility while optimizing for performance.

**At scale (Slack, Discord):**
- Sticky sessions with consistent hashing
- Redis Pub/Sub for cross-server routing
- Edge servers for low latency (< 50ms to nearest POP)
- Connection draining for graceful deploys
- Heartbeat/ping every 30s to detect dead connections"

### **Common Follow-Up Questions**

**Q1: How do you load balance WebSocket connections?**
```
Answer:

Challenge: WebSocket is persistent, standard load balancing won't work

Problem with round-robin:
User A connects → Server 1
User A sends message → Load balancer routes to Server 2
❌ Server 2 doesn't have User A's WebSocket connection

Solutions:

1. Sticky Sessions (IP Hash):

Load Balancer (Nginx):
upstream websocket {
    ip_hash;  # Same IP → Same server
    server server1:3000;
    server server2:3000;
}

Pros: Simple
Cons: Uneven load distribution, mobile clients change IPs

2. Session ID in Cookie:

Client sends cookie with session ID
Load balancer routes based on hash(sessionId)

Pros: Works across IP changes
Cons: Requires cookie support

3. Redis Pub/Sub (Distributed):

Architecture:
Client A ──► Server 1 ──┐
Client B ──► Server 2 ──┼──► Redis Pub/Sub
Client C ──► Server 3 ──┘

Flow:
- User A connects to Server 1
- Server 1 subscribes to Redis channel "ws:userA"
- Message for User A published to Redis
- Server 1 receives, forwards to User A's WebSocket

Pros: No sticky sessions, perfect load distribution
Cons: Extra hop through Redis (~3ms latency)

4. Service Mesh (Envoy/Linkerd):

Sidecar proxy handles connection routing
Intelligent routing (least connections, latency-based)
Automatic failover

Best Practice:
- Internal: Redis Pub/Sub (flexibility)
- Edge: Sticky sessions (lowest latency)
- Hybrid: Sticky + Redis failover
```

**Q2: How do you handle reconnections gracefully?**
```
Answer:

Reconnection is inevitable:
- Network interruptions
- Server deployments
- Load balancer timeouts
- Mobile app backgrounding

Client-side strategy:

class ResilientWebSocket {
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('Connected');
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            
            // Resume from last message
            if (this.lastMessageId) {
                this.send({
                    type: 'resume',
                    lastMessageId: this.lastMessageId
                });
            }
        };
        
        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            this.lastMessageId = msg.id; // Track for resume
            this.handleMessage(msg);
        };
        
        this.ws.onclose = (event) => {
            console.log('Disconnected:', event.code);
            
            if (event.code === 1000) {
                // Normal closure, don't reconnect
                return;
            }
            
            // Exponential backoff
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect();
            }, this.reconnectDelay);
            
            this.reconnectDelay = Math.min(
                this.reconnectDelay * 2,
                30000 // Max 30 seconds
            );
        };
    }
}

Server-side strategy:

1. Graceful shutdown:

process.on('SIGTERM', () => {
    wss.clients.forEach((ws) => {
        ws.send(JSON.stringify({
            type: 'server_shutdown',
            message: 'Server restarting, please reconnect'
        }));
        ws.close(1001, 'Going away');
    });
    
    // Wait for connections to close
    setTimeout(() => process.exit(0), 5000);
});

2. Message persistence:

// Store undelivered messages
const messageQueue = new Map(); // userId → messages[]

function sendMessage(userId, message) {
    const ws = connections.get(userId);
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    } else {
        // User offline or disconnected, queue message
        const queue = messageQueue.get(userId) || [];
        queue.push(message);
        messageQueue.set(userId, queue);
    }
}

// On reconnect, send queued messages
ws.on('connection', (ws) => {
    const userId = authenticate(ws);
    
    // Send queued messages
    const queue = messageQueue.get(userId) || [];
    queue.forEach(msg => ws.send(JSON.stringify(msg)));
    messageQueue.delete(userId);
});

3. Resume from last message ID:

// Client sends last received ID
{
  "type": "resume",
  "lastMessageId": "1234567890"
}

// Server sends missed messages
const missedMessages = await db.getMessagesSince(userId, lastMessageId);
missedMessages.forEach(msg => ws.send(JSON.stringify(msg)));

Best practices:
- Exponential backoff (1s → 2s → 4s → ... → 30s)
- Jitter (random offset to prevent thundering herd)
- Message IDs for resumption
- Graceful shutdown (tell clients before closing)
- Queue messages for offline users
```

**Q3: How do you debug WebSocket connections?**
```
Answer:

Challenges:
- Binary protocol (not human-readable like HTTP)
- Real-time, bidirectional (no request/response logs)
- Connection state (open/closing/closed)

Debugging tools:

1. Browser DevTools:

Chrome DevTools → Network → WS (WebSocket tab)
- See handshake request/response
- View all frames (sent/received)
- Filter by frame type (text/binary/ping/pong)
- Export as HAR

Limitations: Only client-side view

2. Wireshark:

- Capture network traffic
- Filter: websocket
- See raw frames (before/after masking)
- Analyze timing, retransmissions

For HTTPS (WSS):
- Need TLS keys to decrypt
- Set SSLKEYLOGFILE environment variable

3. Server-side logging:

const winston = require('winston');

wss.on('connection', (ws, req) => {
    const userId = getUserId(req);
    
    logger.info('WebSocket connected', {
        userId,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
    });
    
    ws.on('message', (data) => {
        logger.debug('Received message', {
            userId,
            message: data.toString()
        });
    });
    
    ws.on('close', (code, reason) => {
        logger.info('WebSocket closed', {
            userId,
            code,
            reason
        });
    });
    
    ws.on('error', (error) => {
        logger.error('WebSocket error', {
            userId,
            error: error.message,
            stack: error.stack
        });
    });
});

4. Proxies (mitmproxy, Charles):

- Intercept WebSocket traffic
- View/modify frames in real-time
- Replay frames
- Simulate slow networks

5. Monitoring:

const prometheus = require('prom-client');

// Track metrics
- Active connections
- Messages per second (inbound/outbound)
- Message latency (p50, p95, p99)
- Connection duration
- Close codes (normal vs abnormal)

// Distributed tracing
- OpenTelemetry spans for each message
- Trace message flow across servers
- Identify bottlenecks

6. Testing tools:

// wscat (command-line)
wscat -c wss://api.example.com/ws
> {"type":"subscribe","channel":"btc-usd"}
< {"type":"ticker","price":"45000"}

// Artillery (load testing)
config:
  target: "wss://api.example.com"
scenarios:
  - engine: ws
    flow:
      - send: '{"type":"subscribe"}'
      - think: 10
      - send: '{"type":"unsubscribe"}'

Production debugging:
1. Structured logging (JSON with context)
2. Correlation IDs (track message across services)
3. Metrics dashboards (Grafana)
4. Distributed tracing (Jaeger/Zipkin)
5. Error tracking (Sentry)
```

**Q4: What are WebSocket close codes and how do you use them?**
```
Answer:

WebSocket close codes indicate why connection closed:

Standard codes:

1000: Normal Closure
- Clean disconnect (user logs out)
- Client: ws.close(1000, 'User logged out')

1001: Going Away
- Server shutting down
- User navigating away from page
- Server: ws.close(1001, 'Server restarting')

1002: Protocol Error
- Client sent malformed frame
- Server: ws.close(1002, 'Invalid frame')

1003: Unsupported Data
- Received binary when expecting text
- Server: ws.close(1003, 'Binary not supported')

1006: Abnormal Closure
- Connection dropped (no close frame sent)
- Network failure, crash
- Cannot be sent in close frame (reserved)

1007: Invalid Frame Payload Data
- Text frame contains invalid UTF-8
- Server: ws.close(1007, 'Invalid UTF-8')

1008: Policy Violation
- Authentication failed
- Rate limit exceeded
- Server: ws.close(1008, 'Unauthorized')

1009: Message Too Big
- Payload exceeds max size
- Server: ws.close(1009, 'Message exceeds 100KB limit')

1011: Internal Server Error
- Server encountered unexpected condition
- Server: ws.close(1011, 'Internal error')

Custom codes (4000-4999):

4000: Invalid Token
ws.close(4000, 'Invalid authentication token')

4001: Duplicate Connection
ws.close(4001, 'Already connected from another device')

4002: Subscription Limit
ws.close(4002, 'Max subscriptions reached')

Client handling:

ws.onclose = (event) => {
    console.log(`Closed: ${event.code} - ${event.reason}`);
    
    switch (event.code) {
        case 1000:
            // Normal closure, don't reconnect
            break;
            
        case 1001:
            // Server restarting, reconnect immediately
            setTimeout(() => this.connect(), 1000);
            break;
            
        case 1006:
            // Abnormal (network issue), exponential backoff
            this.reconnectWithBackoff();
            break;
            
        case 1008:
        case 4000:
            // Auth failed, redirect to login
            window.location.href = '/login';
            break;
            
        case 4001:
            // Duplicate connection, show message
            alert('You are already connected from another device');
            break;
            
        default:
            // Unknown error, try reconnecting
            this.reconnectWithBackoff();
    }
};

Server patterns:

// Authentication timeout
setTimeout(() => {
    if (!ws.authenticated) {
        ws.close(1008, 'Authentication timeout');
    }
}, 5000);

// Rate limit
if (messageCount > RATE_LIMIT) {
    ws.close(1008, 'Rate limit exceeded');
}

// Graceful shutdown
process.on('SIGTERM', () => {
    wss.clients.forEach(ws => {
        ws.close(1001, 'Server maintenance');
    });
});

// Internal error
try {
    handleMessage(message);
} catch (error) {
    logger.error('Error handling message:', error);
    ws.close(1011, 'Internal server error');
}

Best practices:
- Use appropriate codes (clients can react differently)
- Include descriptive reason string
- Don't reconnect on auth failures (1008, 4000-4999)
- Exponential backoff on 1006 (network issues)
- Immediate reconnect on 1001 (server restart)
```

### **Key Talking Points**

1. **"Sub-100ms latency"**: WebSocket's main advantage
2. **"2-14 bytes overhead per message"**: Vs ~500 bytes for HTTP
3. **"Full-duplex communication"**: Both parties can send anytime
4. **"Sticky sessions or Redis Pub/Sub"**: Load balancing strategies
5. **"Heartbeat ping/pong every 30s"**: Detect dead connections
6. **"Exponential backoff for reconnection"**: Prevent thundering herd
7. **"Message IDs for resumption"**: Handle disconnections gracefully

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **WebSocket Handshake**

```
Client                                Server
  │                                      │
  │──── HTTP/1.1 GET /chat ─────────────►│
  │     Upgrade: websocket               │
  │     Connection: Upgrade              │
  │     Sec-WebSocket-Key: abc123==      │
  │                                      │
  │                                      │ Compute accept key
  │                                      │ SHA1(key + magic)
  │                                      │
  │◄──── HTTP/1.1 101 Switching ─────────┤
  │      Upgrade: websocket              │
  │      Sec-WebSocket-Accept: xyz789==  │
  │                                      │
  │═══════════ WebSocket Connected ══════│
  │                                      │
  │──── Text Frame: "Hello" ────────────►│
  │◄──── Text Frame: "Hi there" ─────────┤
  │                                      │
  │──── Ping ───────────────────────────►│
  │◄──── Pong ───────────────────────────┤
  │                                      │
  │──── Close (code=1000) ───────────────►│
  │◄──── Close (code=1000) ───────────────┤
  │                                      │
  │         Connection Closed            │
```

### **Multi-Server Architecture**

```
                 ┌──────────────┐
                 │Load Balancer │
                 │  (IP hash)   │
                 └──────┬───────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
     ┌───▼───┐      ┌───▼───┐      ┌───▼───┐
     │Server1│      │Server2│      │Server3│
     │       │      │       │      │       │
     │Users: │      │Users: │      │Users: │
     │A,B,C  │      │D,E,F  │      │G,H,I  │
     └───┬───┘      └───┬───┘      └───┬───┘
         │              │              │
         └──────────────┼──────────────┘
                        │
              ┌─────────▼─────────┐
              │  Redis Pub/Sub    │
              │                   │
              │  Channels:        │
              │  ws:A, ws:B, ...  │
              └───────────────────┘

Message flow (User A → User E):
1. User A (Server1) sends message to User E
2. Server1 publishes to Redis: channel "ws:E"
3. Server2 receives (subscribed to User E)
4. Server2 forwards to User E's WebSocket
```

### **Frame Structure**

```
WebSocket Text Frame ("Hello"):

 0                   1          
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5
+-+-+-+-+-------+-+-------------+
|1|0|0|0| 0001  |1| 0000101     |  FIN=1, Opcode=text, Mask=1, Len=5
+-+-+-+-+-------+-+-------------+
| Masking Key (4 bytes)         |
+-------------------------------+
| Masked Payload ("Hello")      |
+-------------------------------+

Total: 2 (header) + 4 (mask) + 5 (payload) = 11 bytes

HTTP equivalent:
POST /message HTTP/1.1
Host: example.com
Content-Type: application/json
Content-Length: 19
...
{"message":"Hello"}

Total: ~500 bytes (headers + body)

Overhead reduction: 98% (500 bytes → 11 bytes)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why WebSocket Matters**

**Business Impact:**
- **User experience**: Real-time updates (< 100ms) vs polling delay (2-5s)
- **Cost reduction**: 91-98% less bandwidth vs HTTP polling
- **Competitive advantage**: Enable real-time features (chat, collaboration, live data)
- **Scale efficiency**: Handle millions of users with fewer servers

**Technical Impact:**
- **Performance**: Sub-100ms latency vs 2-5 second polling delay
- **Efficiency**: 2-14 bytes per message vs ~500 bytes for HTTP request
- **Bidirectional**: Full-duplex communication (both parties send anytime)
- **Resource usage**: One persistent connection vs thousands of HTTP requests

### **How It Works (Simple Summary)**

1. **Client initiates HTTP upgrade** request with `Upgrade: websocket` header
2. **Server responds** with `101 Switching Protocols`
3. **Connection switches** to WebSocket protocol
4. **Both parties can send** messages anytime (full-duplex)
5. **Messages framed** with 2-14 bytes overhead (minimal)
6. **Heartbeat ping/pong** every 30s to detect dead connections
7. **Close handshake** when either party terminates connection

**Multi-server scenario:**
- Use sticky sessions (IP hash) OR Redis Pub/Sub
- Redis approach: All servers subscribe to user channels
- Message published to Redis → Server with connection receives → Forward to client

### **Key Trade-offs**

| Aspect | WebSocket | HTTP Polling | Long Polling | SSE |
|--------|-----------|--------------|--------------|-----|
| **Latency** | < 100ms | 2-5s | < 1s | < 1s |
| **Overhead** | 2-14 bytes | ~500 bytes | ~500 bytes | ~200 bytes |
| **Bidirectional** | Yes | Yes | Yes | No |
| **Browser support** | Excellent | Excellent | Excellent | Good |
| **Firewall friendly** | Mostly | Yes | Yes | Yes |
| **Complexity** | High | Low | Medium | Medium |
| **Load balancing** | Hard (sticky) | Easy | Easy | Medium |

### **Remember These Numbers**

```
WebSocket frame overhead:      2-14 bytes
HTTP request overhead:        ~500 bytes
Overhead reduction:           91-98%

Typical latency:              < 100ms
Polling latency:              2-5 seconds
Latency improvement:          95-98%

At scale (1M users, 10 msg/hour each):
HTTP polling (5s interval):   200,000 req/sec
WebSocket:                    2,778 msg/sec
Request reduction:            98.6%

Memory per connection:        160 KB
10K connections:              ~1.6 GB
100K connections:             ~16 GB
1M connections:               ~160 GB

Heartbeat interval:           30 seconds
Heartbeat timeout:            35 seconds
Reconnect base delay:         1 second
Max reconnect delay:          30 seconds
```

### **Production Wisdom**

✅ **Use sticky sessions or Redis Pub/Sub** for load balancing  
✅ **Implement heartbeat ping/pong** (30s interval) for dead connection detection  
✅ **Exponential backoff** on client reconnect (prevent thundering herd)  
✅ **Graceful shutdown** (send 1001 close code, wait for connections to close)  
✅ **Message IDs for resumption** (client tracks last received, resumes on reconnect)  
✅ **Rate limiting per user** (prevent abuse)  
✅ **Authentication on connect** (verify before accepting)  
✅ **Monitor connection count, latency, close codes** (observability)  

❌ **Don't use for low-frequency updates** (polling simpler)  
❌ **Don't skip heartbeat** (dead connections accumulate)  
❌ **Don't forget to handle reconnections** (network failures happen)  
❌ **Don't send huge messages** (max 100KB, consider chunking)  
❌ **Don't ignore close codes** (client should react differently to 1000 vs 1008)  
❌ **Don't use round-robin load balancing** (breaks persistent connections)  

---

**Final thought for interviews:**

> "WebSocket is the gold standard for real-time, bidirectional communication, delivering sub-100ms latency with 98% less overhead than HTTP polling. Companies like Slack, Discord, and trading platforms use WebSockets to enable real-time features where even 500ms delay is unacceptable. The key challenges are load balancing (sticky sessions or Redis Pub/Sub), graceful reconnections (exponential backoff with message resumption), and debugging (binary protocol requires special tools). At scale, WebSocket reduces server costs by 90%+ compared to polling while dramatically improving user experience. The winning pattern is: try WebSocket first, fall back to long polling if blocked by firewalls, ensuring your real-time features work everywhere while optimizing for performance."
