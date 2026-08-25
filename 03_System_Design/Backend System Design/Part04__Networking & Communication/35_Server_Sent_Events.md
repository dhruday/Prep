# 35. Server-Sent Events (SSE)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Server-Sent Events (SSE)** is a server push technology that enables servers to send real-time updates to clients over a single, long-lived HTTP connection. Unlike WebSocket's bidirectional communication, SSE is unidirectional (server → client only) and uses standard HTTP, making it simpler to implement and firewall-friendly.

**What it is:**
- Standard HTTP connection that stays open for streaming data
- Server pushes text-based events to client
- Built into browsers via EventSource API
- Automatic reconnection with last event ID tracking

**Why it exists:**
- Enable server push without WebSocket complexity
- Provide real-time updates using standard HTTP (works through proxies)
- Simpler than WebSocket for one-way data flow
- Built-in reconnection and event ID management

**Problem it solves:**
- Long polling wastes resources with constant reconnections
- WebSocket is overkill for server-to-client only updates
- Need real-time push that works through corporate firewalls
- Client needs to resume from last received event after disconnect

**In large-scale distributed systems:**
- Live dashboards and monitoring (metrics, logs)
- Notification systems (alerts, updates)
- News feeds and social media timelines
- Stock tickers and real-time analytics
- Progress updates (file uploads, job processing)

💡 **Interview Opening:** "Server-Sent Events is a standard for server-to-client push over HTTP using text-based event streams. Unlike WebSocket which is bidirectional, SSE is unidirectional (server → client) but simpler to implement and works with standard HTTP infrastructure. The browser's EventSource API handles reconnection automatically and tracks the last event ID to resume after disconnects. It's perfect for notifications, live feeds, and dashboards where you only need server push. Major sites like Twitter, Facebook notifications, and GitHub use SSE for real-time updates."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **SSE Protocol**

#### **HTTP Response Format**

**Server response:**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: This is the first message

data: This is the second message

data: {"type": "notification", "message": "You have a new message"}

```

**Key headers:**
- `Content-Type: text/event-stream`: Required for SSE
- `Cache-Control: no-cache`: Prevent caching
- `Connection: keep-alive`: Keep connection open

#### **Event Format**

**Basic event:**
```
data: Hello, World!

```

**Multi-line event:**
```
data: First line
data: Second line
data: Third line

```

**Event with ID:**
```
id: 1234567890
data: Event with unique ID

```

**Event with type:**
```
event: userJoined
data: {"userId": "123", "name": "Alice"}

```

**Event with retry:**
```
retry: 10000
data: Set retry time to 10 seconds

```

**Complete event:**
```
id: msg_12345
event: notification
retry: 5000
data: {"type": "message", "from": "Alice", "text": "Hello!"}

```

**Important:** Each event must end with double newline (`\n\n`)

### **Implementation Examples**

#### **Server (Node.js/Express)**

```javascript
const express = require('express');
const app = express();

// SSE endpoint
app.get('/events', (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORS
    
    // Get last event ID (for resumption)
    const lastEventId = req.headers['last-event-id'];
    if (lastEventId) {
        console.log('Client resuming from event ID:', lastEventId);
        // Send missed events since lastEventId
        sendMissedEvents(res, lastEventId);
    }
    
    // Send initial connection message
    res.write('retry: 10000\n');
    res.write('data: Connected to event stream\n\n');
    
    // Send periodic updates
    const intervalId = setInterval(() => {
        const eventId = Date.now();
        const data = {
            timestamp: new Date().toISOString(),
            message: 'Periodic update',
            random: Math.random()
        };
        
        res.write(`id: ${eventId}\n`);
        res.write(`event: update\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }, 5000); // Every 5 seconds
    
    // Keep connection alive (heartbeat)
    const heartbeatId = setInterval(() => {
        res.write(':heartbeat\n\n'); // Comment, ignored by client
    }, 30000); // Every 30 seconds
    
    // Clean up on disconnect
    req.on('close', () => {
        console.log('Client disconnected');
        clearInterval(intervalId);
        clearInterval(heartbeatId);
        res.end();
    });
});

app.listen(3000, () => {
    console.log('SSE server listening on port 3000');
});
```

#### **Client (Browser - EventSource API)**

```javascript
class SSEClient {
    constructor(url) {
        this.url = url;
        this.eventSource = null;
        this.handlers = new Map();
    }
    
    connect() {
        // Create EventSource connection
        this.eventSource = new EventSource(this.url);
        
        // Connection opened
        this.eventSource.onopen = (event) => {
            console.log('SSE connection opened');
            
            if (this.handlers.has('open')) {
                this.handlers.get('open')(event);
            }
        };
        
        // Default message handler (no event type specified)
        this.eventSource.onmessage = (event) => {
            console.log('Received message:', event.data);
            
            if (this.handlers.has('message')) {
                this.handlers.get('message')(event);
            }
        };
        
        // Error handler
        this.eventSource.onerror = (event) => {
            if (event.target.readyState === EventSource.CLOSED) {
                console.log('Connection closed');
            } else if (event.target.readyState === EventSource.CONNECTING) {
                console.log('Reconnecting...');
            } else {
                console.error('SSE error:', event);
            }
            
            if (this.handlers.has('error')) {
                this.handlers.get('error')(event);
            }
        };
    }
    
    // Register handler for specific event type
    on(eventType, handler) {
        if (eventType === 'message' || eventType === 'open' || eventType === 'error') {
            this.handlers.set(eventType, handler);
        } else {
            // Custom event type
            this.eventSource.addEventListener(eventType, handler);
        }
    }
    
    // Close connection
    close() {
        if (this.eventSource) {
            this.eventSource.close();
            console.log('SSE connection closed');
        }
    }
}

// Usage
const client = new SSEClient('http://localhost:3000/events');

client.on('open', () => {
    console.log('Connected to server');
});

client.on('message', (event) => {
    console.log('Default message:', event.data);
});

client.on('update', (event) => {
    const data = JSON.parse(event.data);
    console.log('Update event:', data);
    console.log('Event ID:', event.lastEventId); // Track last ID
});

client.on('error', (event) => {
    console.error('Connection error');
});

client.connect();

// Close connection when done
// client.close();
```

#### **Advanced: SSE with Redis for Multi-Server**

```javascript
const express = require('express');
const redis = require('redis');
const app = express();

class SSEServer {
    constructor() {
        this.clients = new Map(); // clientId → response object
        this.subscriber = redis.createClient();
        this.publisher = redis.createClient();
        
        this.setupRedis();
    }
    
    setupRedis() {
        // Subscribe to broadcast channel
        this.subscriber.subscribe('sse:broadcast');
        
        this.subscriber.on('message', (channel, message) => {
            if (channel === 'sse:broadcast') {
                // Broadcast to all connected clients
                this.broadcast(message);
            } else if (channel.startsWith('sse:user:')) {
                // Send to specific user
                const userId = channel.split(':')[2];
                this.sendToUser(userId, message);
            }
        });
    }
    
    handleConnection(req, res) {
        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Extract user ID (from auth)
        const userId = req.query.userId || req.headers['user-id'];
        const clientId = `${userId}_${Date.now()}`;
        
        if (!userId) {
            res.status(401).write('data: {"error": "Unauthorized"}\n\n');
            return res.end();
        }
        
        // Store client connection
        this.clients.set(clientId, { userId, res });
        
        // Subscribe to user-specific channel
        this.subscriber.subscribe(`sse:user:${userId}`);
        
        // Send connection confirmation
        res.write('retry: 10000\n');
        res.write(`id: ${Date.now()}\n`);
        res.write('event: connected\n');
        res.write(`data: {"clientId": "${clientId}"}\n\n`);
        
        // Heartbeat
        const heartbeatId = setInterval(() => {
            try {
                res.write(':heartbeat\n\n');
            } catch (error) {
                clearInterval(heartbeatId);
            }
        }, 30000);
        
        // Clean up on disconnect
        req.on('close', () => {
            console.log('Client disconnected:', clientId);
            this.clients.delete(clientId);
            clearInterval(heartbeatId);
            
            // Unsubscribe if no more clients for this user
            const hasOtherClients = Array.from(this.clients.values())
                .some(client => client.userId === userId);
            
            if (!hasOtherClients) {
                this.subscriber.unsubscribe(`sse:user:${userId}`);
            }
        });
    }
    
    broadcast(message) {
        const eventId = Date.now();
        const eventData = `id: ${eventId}\nevent: broadcast\ndata: ${message}\n\n`;
        
        for (const [clientId, client] of this.clients.entries()) {
            try {
                client.res.write(eventData);
            } catch (error) {
                console.error('Failed to send to client:', clientId, error);
                this.clients.delete(clientId);
            }
        }
    }
    
    sendToUser(userId, message) {
        const eventId = Date.now();
        const eventData = `id: ${eventId}\nevent: notification\ndata: ${message}\n\n`;
        
        for (const [clientId, client] of this.clients.entries()) {
            if (client.userId === userId) {
                try {
                    client.res.write(eventData);
                } catch (error) {
                    console.error('Failed to send to user:', userId, error);
                    this.clients.delete(clientId);
                }
            }
        }
    }
    
    // API to send event
    sendEvent(userId, eventType, data) {
        const message = JSON.stringify({ type: eventType, data });
        
        if (userId) {
            // Send to specific user via Redis
            this.publisher.publish(`sse:user:${userId}`, message);
        } else {
            // Broadcast to all users via Redis
            this.publisher.publish('sse:broadcast', message);
        }
    }
}

const sseServer = new SSEServer();

// SSE endpoint
app.get('/events', (req, res) => {
    sseServer.handleConnection(req, res);
});

// API to trigger events
app.post('/api/notify', express.json(), (req, res) => {
    const { userId, eventType, data } = req.body;
    
    sseServer.sendEvent(userId, eventType, data);
    
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log('SSE server listening on port 3000');
});
```

### **Automatic Reconnection**

**Browser behavior:**
```javascript
// EventSource automatically reconnects on connection loss
const eventSource = new EventSource('/events');

eventSource.onerror = (event) => {
    if (event.target.readyState === EventSource.CONNECTING) {
        console.log('Reconnecting...');
        // Browser automatically retries
        // Uses "retry" value from server (default 3 seconds)
    }
};

// Server can set retry interval
res.write('retry: 5000\n'); // 5 seconds
res.write('data: Message\n\n');
```

**Retry behavior:**
```
Connection lost at t=0
Browser waits "retry" milliseconds (default 3000ms)
Reconnects at t=3s

If reconnection fails:
Exponential backoff: 3s → 6s → 12s → ... (browser-dependent)
```

**Resume from last event ID:**
```javascript
// Server sends events with IDs
res.write('id: 1001\n');
res.write('data: First message\n\n');

res.write('id: 1002\n');
res.write('data: Second message\n\n');

// Connection drops after client receives 1001

// Browser reconnects with Last-Event-ID header
GET /events HTTP/1.1
Last-Event-ID: 1001

// Server detects and sends missed events
const lastEventId = req.headers['last-event-id'];
if (lastEventId) {
    const missedEvents = getEventsSince(parseInt(lastEventId));
    missedEvents.forEach(event => {
        res.write(`id: ${event.id}\n`);
        res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    });
}
```

### **SSE vs WebSocket vs Long Polling**

**Connection model:**
```
SSE:
Client ──► Server (initial HTTP request)
       ◄── Server (keeps sending events)

WebSocket:
Client ◄──► Server (bidirectional)

Long Polling:
Client ──► Server (request)
       ◄── Server (response)
Client ──► Server (immediate reconnect)
```

**Overhead comparison:**
```
SSE:
Initial request: ~500 bytes (HTTP headers)
Each event: data + 2 newlines (~message size + 2 bytes)
No reconnection overhead (persistent)

WebSocket:
Initial handshake: ~600 bytes
Each message: 2-14 bytes frame overhead
No reconnection overhead (persistent)

Long Polling:
Each poll: ~500 bytes (HTTP headers)
Constant reconnection overhead

Result:
SSE ≈ WebSocket >> Long Polling (for overhead)
```

**Feature comparison:**
```
               SSE    WebSocket  Long Polling
──────────────────────────────────────────────
Direction      S→C    S↔C        S→C
Persistent     Yes    Yes        No
Auto reconnect Yes    No         No
Event IDs      Yes    No         Manual
Text only      Yes    No         Yes
Binary         No     Yes        No
HTTP/1.1 limit Yes*   No         No
Firewall       ✓      ✗**        ✓
Complexity     Low    High       Medium

* HTTP/1.1 limit: Max 6 connections per domain
** Can be blocked by proxies/firewalls
```

**Latency comparison:**
```
SSE (event arrival to client):
Server writes data: < 1ms
Network propagation: 10-50ms
Client receives: 10-51ms

WebSocket (message):
Send frame: < 1ms
Network: 10-50ms
Total: 10-51ms

Long Polling (30s timeout):
Connection held: 0-30,000ms
Message arrives: 0-30,000ms
Average: 15,000ms

Result: SSE ≈ WebSocket << Long Polling
```

### **HTTP/1.1 Connection Limit**

**Problem:**
```javascript
// Browser limit: 6 connections per domain (HTTP/1.1)

// Tab 1: Opens 1 SSE connection
const sse1 = new EventSource('/events');

// Tab 2: Opens 1 SSE connection
const sse2 = new EventSource('/events');

// ... (6 SSE connections)

// 7th connection: Blocked! Waits for one to close
const sse7 = new EventSource('/events'); // Hangs
```

**Solutions:**

**1. HTTP/2 (Best solution):**
```javascript
// HTTP/2: Unlimited connections per domain
// Browser multiplexes over single TCP connection

// Server (Node.js with HTTP/2)
const http2 = require('http2');
const fs = require('fs');

const server = http2.createSecureServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
});

server.on('stream', (stream, headers) => {
    if (headers[':path'] === '/events') {
        stream.respond({
            'content-type': 'text/event-stream',
            ':status': 200
        });
        
        setInterval(() => {
            stream.write('data: Update\n\n');
        }, 5000);
    }
});

server.listen(443);

// No connection limit with HTTP/2!
```

**2. Use subdomains:**
```javascript
// Each subdomain gets 6 connections

// events1.example.com
const sse1 = new EventSource('https://events1.example.com/stream');

// events2.example.com
const sse2 = new EventSource('https://events2.example.com/stream');

// Distribute across subdomains based on user ID
const subdomain = userId % 4; // 4 subdomains
const url = `https://events${subdomain}.example.com/stream`;
```

**3. Share single connection:**
```javascript
// Single EventSource, multiplex event types

class SharedSSE {
    constructor(url) {
        this.eventSource = new EventSource(url);
        this.handlers = new Map(); // eventType → Set of handlers
    }
    
    subscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
            
            // Register listener for this event type
            this.eventSource.addEventListener(eventType, (event) => {
                const handlers = this.handlers.get(eventType);
                handlers.forEach(h => h(event));
            });
        }
        
        this.handlers.get(eventType).add(handler);
    }
    
    unsubscribe(eventType, handler) {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }
}

// Global shared instance
const sharedSSE = new SharedSSE('/events');

// Component A subscribes to notifications
sharedSSE.subscribe('notification', (event) => {
    console.log('Notification:', event.data);
});

// Component B subscribes to updates
sharedSSE.subscribe('update', (event) => {
    console.log('Update:', event.data);
});

// Only 1 EventSource connection used!
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Scenario: Live Dashboard with Real-Time Metrics**

**Requirements:**
- 100,000 concurrent users viewing dashboards
- Metrics updated every 5 seconds
- Each update: 1 KB of data (JSON)
- 99th percentile latency < 2 seconds

**Calculations:**

**1. Concurrent SSE connections:**
```
Active users: 100,000
SSE connections: 100,000 (one per user)
```

**2. Memory per connection:**
```
TCP buffer: 64 KB (send buffer)
Application state: 16 KB (user context, message queue)
HTTP overhead: 8 KB
Total per connection: ~88 KB

Total memory: 100,000 × 88 KB = 8.8 GB
```

**3. Server capacity:**
```
Memory per server: 16 GB RAM
Connections per server: 16 GB / 88 KB ≈ 180,000 connections

Number of servers: 100,000 / 180,000 = 1 server sufficient

With headroom (50%): 2 servers
```

**4. Event rate:**
```
Updates per user per hour: 3600s / 5s = 720 events
Total events per hour: 100,000 × 720 = 72M events
Events per second: 72M / 3600 = 20,000 events/sec

With 2 servers:
Each server: 10,000 events/sec
```

**5. Bandwidth:**
```
Event size: 1 KB (data) + ~50 bytes (SSE format)
Per event: ~1,050 bytes

Outbound bandwidth:
20,000 events/sec × 1,050 bytes = 21 MB/sec = 168 Mbps

With redundancy: ~200 Mbps
```

**6. Comparison with polling:**
```
Short polling (5-second interval):
Requests per second: 100,000 / 5 = 20,000 req/sec
Request overhead: ~500 bytes (headers)
Response size: 1,000 bytes
Per request: 1,500 bytes

Bandwidth: 20,000 × 1,500 = 30 MB/sec = 240 Mbps

SSE bandwidth: 168 Mbps
Polling bandwidth: 240 Mbps

Savings: 30% (plus no request overhead, persistent connection)

More importantly:
Polling requires processing 20,000 req/sec
SSE requires maintaining 100K connections, but only 10K writes/sec
CPU savings: ~50%
```

**7. Cost estimation (AWS):**
```
EC2 instances:
- t3.xlarge (4 vCPU, 16 GB): $0.1664/hour
- 2 instances: $0.1664 × 2 × 730 hours = $243/month

Load balancer:
- Application Load Balancer: $22/month
- Data processed: 168 Mbps × 730 hours × 3600s = ~443 TB
  (Actually less due to compression and idle periods)
- Actual: ~100 TB
- $0.008/GB: 100,000 GB × $0.008 = $800/month

Total: ~$1,065/month

Comparison with WebSocket:
WebSocket would be similar cost (same persistent connection model)

Comparison with short polling:
Would need 5-10x more servers due to request processing overhead
Estimated: ~$5,000+/month

SSE savings: 80%
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Event Storage for Resumption**

**Challenge:** Client disconnects, needs to receive missed events

**Option 1: In-Memory Ring Buffer (Redis)**
```javascript
const redis = require('redis');
const client = redis.createClient();

// Store event with ID
async function storeEvent(eventId, eventData) {
    // Add to sorted set (score = eventId)
    await client.zadd('events', eventId, JSON.stringify(eventData));
    
    // Keep only last 1000 events
    const count = await client.zcard('events');
    if (count > 1000) {
        await client.zremrangebyrank('events', 0, count - 1001);
    }
}

// Get events since lastEventId
async function getEventsSince(lastEventId) {
    const events = await client.zrangebyscore('events', lastEventId + 1, '+inf');
    return events.map(JSON.parse);
}

// SSE handler
app.get('/events', async (req, res) => {
    const lastEventId = parseInt(req.headers['last-event-id'] || '0');
    
    // Send missed events
    if (lastEventId > 0) {
        const missedEvents = await getEventsSince(lastEventId);
        missedEvents.forEach(event => {
            res.write(`id: ${event.id}\n`);
            res.write(`data: ${JSON.stringify(event.data)}\n\n`);
        });
    }
    
    // Continue with real-time events...
});
```

**Option 2: Database (PostgreSQL)**
```sql
CREATE TABLE sse_events (
    event_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    event_type VARCHAR(50),
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_event (user_id, event_id)
);

-- Partition by time (keep last 7 days)
CREATE TABLE sse_events_2024_01 PARTITION OF sse_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Get missed events
SELECT event_id, event_type, event_data
FROM sse_events
WHERE user_id = $1 AND event_id > $2
ORDER BY event_id ASC
LIMIT 100;
```

**Option 3: Kafka (High Throughput)**
```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: ['localhost:9092'] });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'sse-server' });

// Produce event
async function sendEvent(userId, eventData) {
    await producer.send({
        topic: 'sse-events',
        messages: [{
            key: userId.toString(),
            value: JSON.stringify(eventData)
        }]
    });
}

// Consume events and send to SSE clients
await consumer.subscribe({ topic: 'sse-events', fromBeginning: false });

await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
        const userId = message.key.toString();
        const eventData = JSON.parse(message.value.toString());
        
        // Send to SSE client if connected
        sendToSSEClient(userId, eventData);
    }
});
```

### **Event ID Generation**

**Strategies:**

**1. Timestamp-based (Simple):**
```javascript
const eventId = Date.now(); // Millisecond timestamp

// Pros: Auto-incrementing, sortable
// Cons: Collisions if multiple events per millisecond
```

**2. Snowflake ID (Twitter):**
```javascript
// 64-bit ID:
// - 41 bits: Timestamp (milliseconds since epoch)
// - 10 bits: Machine ID
// - 12 bits: Sequence number

class SnowflakeGenerator {
    constructor(machineId) {
        this.machineId = machineId & 0x3FF; // 10 bits
        this.sequence = 0;
        this.lastTimestamp = 0;
    }
    
    generate() {
        let timestamp = Date.now();
        
        if (timestamp === this.lastTimestamp) {
            // Same millisecond, increment sequence
            this.sequence = (this.sequence + 1) & 0xFFF; // 12 bits
            
            if (this.sequence === 0) {
                // Sequence overflow, wait for next millisecond
                while (timestamp <= this.lastTimestamp) {
                    timestamp = Date.now();
                }
            }
        } else {
            this.sequence = 0;
        }
        
        this.lastTimestamp = timestamp;
        
        // Combine into 64-bit ID
        const id = (BigInt(timestamp) << 22n) |
                   (BigInt(this.machineId) << 12n) |
                   BigInt(this.sequence);
        
        return id.toString();
    }
}

const generator = new SnowflakeGenerator(1); // Machine ID = 1
const eventId = generator.generate(); // "1234567890123456789"

// Pros: Unique, sortable, distributed generation
// Cons: Complexity
```

**3. UUID (Guaranteed Unique):**
```javascript
const { v4: uuidv4 } = require('uuid');

const eventId = uuidv4(); // "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

// Pros: Guaranteed unique across all servers
// Cons: Not sortable, larger (36 characters)
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Horizontal Scaling with Redis Pub/Sub**

```
          ┌──────────────┐
          │Load Balancer │
          └──────┬───────┘
                 │
        ┌────────┼────────┐
        │        │        │
    ┌───▼───┐ ┌─▼────┐ ┌─▼────┐
    │Server1│ │Server2│ │Server3│
    │  SSE  │ │  SSE  │ │  SSE  │
    │30K    │ │30K    │ │40K    │
    │users  │ │users  │ │users  │
    └───┬───┘ └──┬───┘ └──┬───┘
        │        │        │
        └────────┼────────┘
                 │
          ┌──────▼──────┐
          │Redis Pub/Sub│
          │             │
          │Channels:    │
          │sse:broadcast│
          │sse:user:*   │
          └─────────────┘

All servers subscribe to relevant channels
Event published to Redis → All servers receive → Forward to connected clients
```

### **Graceful Shutdown**

```javascript
// Server graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, starting graceful shutdown...');
    
    // Stop accepting new connections
    server.close(() => {
        console.log('Server closed to new connections');
    });
    
    // Send shutdown message to all clients
    for (const [clientId, client] of clients.entries()) {
        try {
            client.res.write('event: shutdown\n');
            client.res.write('data: {"message": "Server restarting", "reconnect": true}\n\n');
            
            // Close connection after short delay
            setTimeout(() => {
                client.res.end();
            }, 1000);
        } catch (error) {
            console.error('Error notifying client:', clientId, error);
        }
    }
    
    // Wait for connections to close
    setTimeout(() => {
        console.log('Forcing shutdown');
        process.exit(0);
    }, 10000); // 10 second grace period
});
```

**Client handling:**
```javascript
eventSource.addEventListener('shutdown', (event) => {
    const data = JSON.parse(event.data);
    console.log('Server shutting down:', data.message);
    
    if (data.reconnect) {
        // Close current connection
        eventSource.close();
        
        // Reconnect after short delay (server will be back up)
        setTimeout(() => {
            connectSSE();
        }, 5000);
    }
});
```

### **Heartbeat & Dead Connection Detection**

```javascript
// Server sends periodic heartbeat (comment)
setInterval(() => {
    clients.forEach((client) => {
        try {
            client.res.write(':heartbeat\n\n');
            client.lastHeartbeat = Date.now();
        } catch (error) {
            // Connection dead, remove client
            clients.delete(client.id);
        }
    });
}, 30000); // Every 30 seconds

// Detect dead connections (no write acknowledgment)
setInterval(() => {
    const now = Date.now();
    clients.forEach((client, clientId) => {
        if (now - client.lastHeartbeat > 60000) { // 1 minute
            console.log('Dead connection detected:', clientId);
            clients.delete(clientId);
            client.res.end();
        }
    });
}, 60000); // Check every minute
```

### **Error Handling & Retry Logic**

```javascript
// Client with custom retry logic
class ResilientSSE {
    constructor(url, options = {}) {
        this.url = url;
        this.maxRetries = options.maxRetries || Infinity;
        this.retryDelay = options.retryDelay || 3000;
        this.maxRetryDelay = options.maxRetryDelay || 30000;
        this.currentRetry = 0;
        this.eventSource = null;
    }
    
    connect() {
        this.eventSource = new EventSource(this.url);
        
        this.eventSource.onopen = () => {
            console.log('SSE connected');
            this.currentRetry = 0;
            this.retryDelay = 3000; // Reset delay
        };
        
        this.eventSource.onerror = (event) => {
            console.error('SSE error');
            
            if (event.target.readyState === EventSource.CLOSED) {
                // Connection closed, reconnect
                this.reconnect();
            }
        };
    }
    
    reconnect() {
        if (this.currentRetry >= this.maxRetries) {
            console.error('Max retries reached, giving up');
            return;
        }
        
        this.currentRetry++;
        
        console.log(`Reconnecting (attempt ${this.currentRetry})...`);
        
        setTimeout(() => {
            this.connect();
        }, this.retryDelay);
        
        // Exponential backoff with jitter
        this.retryDelay = Math.min(
            this.retryDelay * 2 + Math.random() * 1000,
            this.maxRetryDelay
        );
    }
    
    close() {
        if (this.eventSource) {
            this.eventSource.close();
        }
    }
}
```

### **Monitoring**

```javascript
const prometheus = require('prom-client');

// Metrics
const sseConnections = new prometheus.Gauge({
    name: 'sse_connections_total',
    help: 'Number of active SSE connections'
});

const sseEvents = new prometheus.Counter({
    name: 'sse_events_sent_total',
    help: 'Total number of SSE events sent',
    labelNames: ['event_type']
});

const sseEventLatency = new prometheus.Histogram({
    name: 'sse_event_latency_seconds',
    help: 'SSE event send latency',
    buckets: [0.001, 0.01, 0.1, 0.5, 1]
});

// Track connections
app.get('/events', (req, res) => {
    sseConnections.inc();
    
    req.on('close', () => {
        sseConnections.dec();
    });
});

// Track events
function sendEvent(res, eventType, data) {
    const start = Date.now();
    
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    
    const duration = (Date.now() - start) / 1000;
    sseEventLatency.observe(duration);
    sseEvents.inc({ event_type: eventType });
}

// Expose metrics
app.get('/metrics', (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(prometheus.register.metrics());
});
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **Authentication**

**Option 1: Token in URL (Simple but less secure):**
```javascript
// Client
const token = localStorage.getItem('token');
const eventSource = new EventSource(`/events?token=${token}`);

// Server
app.get('/events', (req, res) => {
    const token = req.query.token;
    
    if (!token || !verifyToken(token)) {
        res.status(401).write('data: {"error": "Unauthorized"}\n\n');
        return res.end();
    }
    
    // Continue with SSE...
});
```

**Option 2: Cookie (Better):**
```javascript
// Client (cookie set by login endpoint)
const eventSource = new EventSource('/events', { withCredentials: true });

// Server
app.get('/events', (req, res) => {
    const token = req.cookies.authToken;
    
    if (!token || !verifyToken(token)) {
        res.status(401).write('data: {"error": "Unauthorized"}\n\n');
        return res.end();
    }
    
    // CORS for credentials
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    
    // Continue with SSE...
});
```

**Option 3: Initial auth message (Most flexible):**
```javascript
// Client
const eventSource = new EventSource('/events');

eventSource.onopen = () => {
    // Can't send message over EventSource!
    // Need separate HTTP request for auth
    
    fetch('/events/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
    });
};

// Server tracks authenticated sessions
const authenticatedSessions = new Set();

app.post('/events/auth', (req, res) => {
    const token = req.headers.authorization;
    const { sessionId } = req.body;
    
    if (verifyToken(token)) {
        authenticatedSessions.add(sessionId);
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid token' });
    }
});

app.get('/events', (req, res) => {
    const sessionId = req.query.sessionId;
    
    if (!authenticatedSessions.has(sessionId)) {
        return res.status(401).end();
    }
    
    // Continue with SSE...
});
```

### **Rate Limiting**

```javascript
const rateLimit = new Map(); // userId → { count, resetTime }

function checkRateLimit(userId) {
    const now = Date.now();
    const limit = 1000; // 1000 events per minute
    const window = 60000; // 1 minute
    
    let record = rateLimit.get(userId);
    
    if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + window };
        rateLimit.set(userId, record);
    }
    
    if (record.count >= limit) {
        return false; // Rate limit exceeded
    }
    
    record.count++;
    return true;
}

function sendEvent(userId, res, eventData) {
    if (!checkRateLimit(userId)) {
        console.warn('Rate limit exceeded for user:', userId);
        return; // Drop event
    }
    
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
}
```

### **Input Validation & Sanitization**

```javascript
// Validate event data before sending
function sanitizeEvent(eventData) {
    // Remove dangerous characters that could break SSE format
    const sanitized = JSON.stringify(eventData);
    
    // Ensure no newlines in data (would break SSE)
    if (sanitized.includes('\n')) {
        throw new Error('Event data contains newlines');
    }
    
    return sanitized;
}

function sendEvent(res, eventType, eventData) {
    try {
        const sanitized = sanitizeEvent(eventData);
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${sanitized}\n\n`);
    } catch (error) {
        console.error('Invalid event data:', error);
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Twitter (Timeline Updates)**

**Use case:** Real-time tweet updates on timeline

**Implementation:**
```javascript
// Client subscribes to timeline updates
const eventSource = new EventSource('/timeline/stream');

eventSource.addEventListener('tweet', (event) => {
    const tweet = JSON.parse(event.data);
    prependTweetToTimeline(tweet);
});

// Server pushes new tweets
function onNewTweet(userId, tweet) {
    const followers = getFollowers(userId);
    
    followers.forEach(followerId => {
        const client = clients.get(followerId);
        if (client) {
            client.res.write('event: tweet\n');
            client.res.write(`data: ${JSON.stringify(tweet)}\n\n`);
        }
    });
}
```

### **Example 2: GitHub (Notifications)**

**Use case:** Real-time notifications for mentions, PRs, issues

**Architecture:**
- SSE for browser clients
- WebSocket for desktop app (bidirectional needed)
- Long polling as fallback

**Features:**
- Badge count updates
- Toast notifications
- Event aggregation (batch multiple events)

### **Example 3: Stock Trading Platforms**

**Use case:** Real-time stock price updates

**Implementation:**
```javascript
// Client subscribes to specific stocks
const eventSource = new EventSource('/market/stream?symbols=AAPL,GOOGL,MSFT');

eventSource.addEventListener('price', (event) => {
    const update = JSON.parse(event.data);
    // { symbol: 'AAPL', price: 150.25, change: +2.5 }
    updateStockPrice(update);
});

// Server broadcasts price updates
function broadcastPriceUpdate(symbol, price, change) {
    // Find all clients subscribed to this symbol
    clients.forEach((client) => {
        if (client.symbols.includes(symbol)) {
            client.res.write('event: price\n');
            client.res.write(`data: ${JSON.stringify({ symbol, price, change })}\n\n`);
        }
    });
}
```

**Optimization:**
- Throttle updates (max 10 per second per symbol)
- Batch multiple stock updates in single event
- Use binary format (Protobuf) for efficiency (requires custom client, not EventSource)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain Server-Sent Events and when you'd use it.**

**Answer:**
"Server-Sent Events (SSE) is a standard for server-to-client push over HTTP using text-based event streams. Unlike WebSocket which is bidirectional, SSE is unidirectional (server → client only) but simpler to implement and works with standard HTTP infrastructure.

**How it works:**
1. Client creates EventSource connection to HTTP endpoint
2. Server responds with `Content-Type: text/event-stream`
3. Server keeps connection open and sends events as they occur
4. Events are text-based: `data: message\\n\\n`
5. Browser automatically reconnects on disconnect
6. Server can assign event IDs for client to resume from

**Key advantages:**

**1. Simplicity:** Uses standard HTTP, no special protocol. Just set `Content-Type: text/event-stream` and write data to response stream.

**2. Built-in reconnection:** Browser's EventSource API handles reconnection automatically with exponential backoff. Server sends `retry: 5000` to set reconnect interval.

**3. Event resumption:** Server assigns IDs to events. On reconnect, browser sends `Last-Event-ID` header. Server can resend missed events.

**4. Firewall-friendly:** Uses standard HTTP, passes through proxies that might block WebSocket.

**5. HTTP/2 compatible:** With HTTP/2, no connection limit (HTTP/1.1 has 6 connections per domain).

**Trade-offs:**
- ✅ Simple (just HTTP)
- ✅ Auto reconnection with event IDs
- ✅ Works through all proxies
- ✅ Lower overhead than long polling
- ❌ Unidirectional (server → client only)
- ❌ Text only (no binary)
- ❌ HTTP/1.1: Max 6 connections per domain
- ❌ Higher latency than WebSocket (~50-100ms vs ~10ms)

**I'd use SSE for:**
1. Live dashboards (metrics, logs, analytics)
2. Notifications (alerts, messages)
3. News feeds and social media timelines
4. Progress updates (file uploads, job processing)
5. Stock tickers and real-time data displays

**I'd use WebSocket instead for:**
1. Chat (need client → server messages)
2. Collaborative editing (bidirectional)
3. Gaming (ultra-low latency required)
4. Any scenario needing client-initiated messages

**Real-world pattern:**
Twitter, GitHub, and Facebook use SSE for notifications. They chose SSE over WebSocket because:
- Notifications are server → client only (unidirectional)
- Simpler implementation (standard HTTP)
- Better compatibility (works through all proxies)
- Built-in reconnection handles network issues

**At scale:**
For 100K concurrent users with updates every 5 seconds:
- SSE: 1-2 servers (persistent connections, minimal CPU)
- WebSocket: Similar (also persistent)
- Long polling: 5-10 servers (constant request processing)

**Implementation details:**
- Use Redis Pub/Sub for multi-server coordination
- Store recent events (last 1000) for resumption on reconnect
- Send heartbeat comments every 30s to detect dead connections
- Set appropriate `retry` value (5-10 seconds)
- With HTTP/2, share single EventSource across components (avoid connection limit)"

### **Common Follow-Up Questions**

**Q1: How do you handle the HTTP/1.1 connection limit (6 per domain)?**
```
Answer:

Problem:
Browser limits to 6 simultaneous connections per domain (HTTP/1.1)
If you open 6 SSE connections, 7th will hang

Solutions:

1. HTTP/2 (Best):
- HTTP/2 multiplexes over single TCP connection
- No connection limit
- All modern browsers support it
- Requires HTTPS

Server setup (Node.js):
const http2 = require('http2');
const server = http2.createSecureServer({ key, cert });

server.on('stream', (stream, headers) => {
    if (headers[':path'] === '/events') {
        stream.respond({
            'content-type': 'text/event-stream',
            ':status': 200
        });
        // Send events to stream...
    }
});

2. Shared EventSource:
- Use single EventSource connection
- Multiplex different event types over it
- Components subscribe to specific event types

class SharedSSE {
    constructor(url) {
        this.eventSource = new EventSource(url);
        this.subscribers = new Map(); // eventType → handlers[]
    }
    
    subscribe(eventType, handler) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
            this.eventSource.addEventListener(eventType, (event) => {
                this.subscribers.get(eventType).forEach(h => h(event));
            });
        }
        this.subscribers.get(eventType).push(handler);
    }
}

// Global instance
const sse = new SharedSSE('/events');

// Component A subscribes
sse.subscribe('notification', handleNotification);

// Component B subscribes
sse.subscribe('update', handleUpdate);

// Only 1 connection used!

3. Use subdomains:
- Each subdomain gets its own 6 connections
- Distribute connections across subdomains

const subdomain = userId % 4; // 0-3
const url = `https://events${subdomain}.example.com/stream`;
const eventSource = new EventSource(url);

4. Fallback to long polling:
- Detect when limit reached
- Fall back to long polling for additional connections

if (connectionCount >= 6) {
    // Use long polling instead
    startLongPolling();
} else {
    // Use SSE
    startSSE();
}

Best practice:
- Use HTTP/2 (solves problem completely)
- Share single EventSource if HTTP/1.1
- Monitor connection count, warn users if near limit
```

**Q2: How do you ensure message delivery guarantees with SSE?**
```
Answer:

Challenge: SSE is fire-and-forget, no ACKs

Strategies:

1. Event IDs with resumption:

// Server assigns sequential IDs
let eventId = 0;

function sendEvent(res, data) {
    eventId++;
    res.write(`id: ${eventId}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    
    // Store in buffer (last 1000 events)
    eventBuffer.push({ id: eventId, data });
    if (eventBuffer.length > 1000) {
        eventBuffer.shift();
    }
}

// On reconnect, send missed events
app.get('/events', (req, res) => {
    const lastEventId = parseInt(req.headers['last-event-id'] || '0');
    
    // Send missed events
    const missedEvents = eventBuffer.filter(e => e.id > lastEventId);
    missedEvents.forEach(event => {
        res.write(`id: ${event.id}\n`);
        res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    });
    
    // Continue with new events...
});

Guarantee: At-least-once delivery
- Client tracks last received ID
- On reconnect, server resends from last ID
- Client may receive duplicates (handle with idempotency)

2. Durable storage (PostgreSQL/Redis):

// Store events in database
await db.insertEvent({
    userId: userId,
    eventId: eventId,
    eventType: 'notification',
    eventData: data,
    createdAt: new Date()
});

// On reconnect, fetch from database
const missedEvents = await db.getEvents(userId, lastEventId);

Guarantee: Exactly-once if client de-duplicates
- Events persisted to database
- Client can replay from any point
- Handle de-duplication client-side

3. Kafka (High throughput):

// Produce to Kafka
await producer.send({
    topic: 'notifications',
    messages: [{
        key: userId,
        value: JSON.stringify(data)
    }]
});

// Consume and send to SSE
consumer.run({
    eachMessage: async ({ message }) => {
        const userId = message.key.toString();
        const data = JSON.parse(message.value.toString());
        
        sendToSSEClient(userId, data);
    }
});

// On reconnect, consume from offset
const offset = await getLastOffset(userId);
consumer.seek({ topic: 'notifications', partition: 0, offset });

Guarantee: Exactly-once with offset tracking
- Kafka provides durable, ordered log
- Client tracks Kafka offset
- Resume from exact position

4. Application-level ACKs:

// Send event with ACK expectation
res.write(`id: ${eventId}\n`);
res.write(`data: ${JSON.stringify(data)}\n\n`);

// Client sends ACK via separate HTTP request
fetch('/events/ack', {
    method: 'POST',
    body: JSON.stringify({ eventId })
});

// Server tracks unacked events
if (!acked.has(eventId)) {
    // Resend after timeout
    setTimeout(() => {
        if (!acked.has(eventId)) {
            resendEvent(eventId);
        }
    }, 10000);
}

Guarantee: Guaranteed delivery with retries
- Server tracks which events are acked
- Resends unacked events
- Client de-duplicates

Best practice:
- Use event IDs for at-least-once delivery
- Store events in Redis/DB for 24 hours (resume window)
- Client handles de-duplication (idempotent processing)
- Monitor gap between sent and acked events
```

**Q3: How does SSE compare to WebSocket and when do you choose each?**
```
Answer:

Feature comparison:

                    SSE             WebSocket
────────────────────────────────────────────────
Direction           S→C             S↔C
Protocol            HTTP            WebSocket
Reconnection        Auto            Manual
Event IDs           Yes             No
Text/Binary         Text only       Both
Complexity          Low             Medium
Latency             50-100ms        10-50ms
HTTP caching        No              No
Firewall friendly   Yes             Sometimes
Connection limit    Yes (HTTP/1.1)  No

Decision tree:

Use SSE when:
✓ One-way communication (server → client)
✓ Text data only
✓ Need automatic reconnection with resumption
✓ Want simplicity (standard HTTP)
✓ Must work through strict firewalls
✓ Don't need ultra-low latency (<100ms acceptable)

Examples:
- Live dashboards (metrics, logs)
- Notifications (alerts, messages)
- News feeds, social media timelines
- Stock tickers (server push only)
- Progress bars (file uploads, jobs)

Use WebSocket when:
✓ Bidirectional communication needed
✓ Client must send messages to server
✓ Need very low latency (<50ms)
✓ Binary data (images, audio, video)
✓ High-frequency updates (>100/sec)

Examples:
- Chat applications (both directions)
- Collaborative editing (Google Docs)
- Multiplayer games (low latency critical)
- Trading platforms (bidirectional orders)
- IoT device communication

Hybrid approach:

// Try WebSocket first
if (WebSocket.isSupported() && !behindRestrictiveFirewall) {
    useWebSocket();
} else {
    // Fall back to SSE
    if (EventSource.isSupported()) {
        useSSE();
    } else {
        // Last resort: Long polling
        useLongPolling();
    }
}

Real-world examples:

1. Slack:
- WebSocket for chat (bidirectional)
- SSE not used (need bidirectional)

2. GitHub:
- SSE for notifications (server push only)
- No need for bidirectional

3. Trading platforms:
- WebSocket for order execution (bidirectional)
- Could use SSE for market data (server push)
- But WebSocket simplifies architecture (one protocol)

Cost comparison (100K users, 1 event/sec):

SSE:
- Persistent connections: 100K
- Memory: ~8GB (88KB per connection)
- Bandwidth: ~10MB/sec (100 bytes per event)
- Servers: 2-3 (16GB RAM each)

WebSocket:
- Persistent connections: 100K
- Memory: ~16GB (160KB per connection, includes bidirectional buffers)
- Bandwidth: ~10MB/sec (same data)
- Servers: 3-4 (16GB RAM each)

Result: SSE slightly more efficient for unidirectional

Best practice:
- Default to SSE for server → client only
- Use WebSocket if you need client → server
- Don't use WebSocket just because it's "cooler"
- SSE is simpler, more reliable, and works everywhere
```

### **Key Talking Points**

1. **"Server → client only, simpler than WebSocket"**: Core distinction
2. **"Auto reconnection with event IDs"**: Built-in reliability
3. **"Works through all proxies/firewalls"**: Compatibility advantage
4. **"HTTP/2 eliminates connection limit"**: Scaling solution
5. **"Use Redis Pub/Sub for multi-server"**: Distributed architecture
6. **"Store last 1000 events for resumption"**: Recovery strategy
7. **"Perfect for notifications, dashboards, feeds"**: Common use cases

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **SSE Communication Flow**

```
Client                                Server
  │                                      │
  │──── GET /events HTTP/1.1 ────────────►│
  │     Last-Event-ID: 1234 (if reconnect)│
  │                                      │
  │◄──── HTTP/1.1 200 OK ─────────────────┤
  │      Content-Type: text/event-stream  │
  │      Cache-Control: no-cache          │
  │                                      │
  │         (connection held open)        │
  │                                      │
  │                                      │ Event occurs
  │                                      │
  │◄──── id: 1235 ───────────────────────┤
  │      event: notification              │
  │      data: {"msg":"New message"}      │
  │      (blank line)                     │
  │                                      │
  │◄──── :heartbeat ──────────────────────┤ (comment, every 30s)
  │      (blank line)                     │
  │                                      │
  │                                      │ Another event
  │                                      │
  │◄──── id: 1236 ───────────────────────┤
  │      data: {"msg":"Update"}           │
  │      (blank line)                     │
  │                                      │
  │         Connection drops              │
  │ ×                                     │
  │                                      │
  │  (Browser auto-reconnects)            │
  │                                      │
  │──── GET /events HTTP/1.1 ────────────►│
  │     Last-Event-ID: 1236               │
  │                                      │
  │◄──── (server sends events 1237+) ─────┤
```

### **Event Format**

```
Simple event:
─────────────
data: Hello, World!
<blank line>

Event with ID:
──────────────
id: 123
data: Message with ID
<blank line>

Event with type:
────────────────
event: notification
data: {"type":"alert","msg":"Important"}
<blank line>

Complete event:
───────────────
id: 456
event: update
retry: 10000
data: {"status":"complete"}
<blank line>

Multi-line data:
────────────────
id: 789
data: Line 1
data: Line 2
data: Line 3
<blank line>

Heartbeat (comment):
────────────────────
:heartbeat
<blank line>
(Client ignores lines starting with :)
```

### **Multi-Server Architecture**

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Client A │  │ Client B │  │ Client C │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     │  SSE        │  SSE        │  SSE
     │             │             │
┌────▼─────┐  ┌───▼──────┐  ┌───▼──────┐
│ Server 1 │  │ Server 2 │  │ Server 3 │
│ (40K)    │  │ (30K)    │  │ (30K)    │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
            ┌──────▼──────┐
            │    Redis    │
            │   Pub/Sub   │
            └─────────────┘

Event flow:
1. POST /api/notify { userId: "A", data: {...} }
2. API server publishes to Redis: "sse:user:A"
3. Server 1 (connected to User A) receives from Redis
4. Server 1 sends event to Client A via SSE
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why SSE Matters**

**Business Impact:**
- **User experience**: Real-time updates without polling delay
- **Cost reduction**: 50-80% less overhead than long polling
- **Reliability**: Built-in reconnection and event resumption
- **Compatibility**: Works through all firewalls and proxies

**Technical Impact:**
- **Simplicity**: Standard HTTP, no special protocol
- **Auto reconnection**: Browser handles reconnection with exponential backoff
- **Event tracking**: Event IDs enable resumption after disconnect
- **Efficiency**: Persistent connection, minimal overhead

### **How It Works (Simple Summary)**

1. **Client creates EventSource** connection to HTTP endpoint
2. **Server responds** with `Content-Type: text/event-stream`
3. **Server keeps connection open** and writes events as they occur
4. **Events formatted** as `data: message\\n\\n` (text-based)
5. **Browser automatically reconnects** on disconnect (with exponential backoff)
6. **Server assigns event IDs**, browser sends `Last-Event-ID` header on reconnect
7. **Server resends missed events** since last ID

**Multi-server scenario:**
- Use Redis Pub/Sub for coordination
- All servers subscribe to relevant channels
- Event published to Redis → Server with connection receives → Forward to client

### **Key Trade-offs**

| Aspect | SSE | WebSocket | Long Polling |
|--------|-----|-----------|--------------|
| **Direction** | S→C | S↔C | S→C |
| **Complexity** | Low | Medium | Medium |
| **Reconnection** | Auto | Manual | Manual |
| **Event IDs** | Yes | No | Manual |
| **Latency** | 50-100ms | 10-50ms | 1-30s |
| **Overhead** | Low | Very low | High |
| **HTTP/1.1 limit** | Yes (6) | No | No |
| **Binary data** | No | Yes | Yes |

### **Remember These Numbers**

```
HTTP headers overhead:          ~200 bytes
Event data overhead:            ~10 bytes (id + format)
Heartbeat interval:             30 seconds
Default retry:                  3 seconds
Max HTTP/1.1 connections:       6 per domain
HTTP/2 connections:             Unlimited

Memory per SSE connection:      ~88 KB
100K connections:               ~8.8 GB
Latency:                        50-100ms
Bandwidth (1KB event/5s):       200 bytes/sec per user

Event buffer size:              1000 recent events
Resumption window:              24 hours typical
```

### **Production Wisdom**

✅ **Use HTTP/2** to eliminate connection limit  
✅ **Assign event IDs** for resumption after reconnect  
✅ **Store recent events** (last 1000) for missed event delivery  
✅ **Send heartbeat comments** every 30s (`:heartbeat\\n\\n`)  
✅ **Set retry interval** appropriate for your use case (5-10s)  
✅ **Use Redis Pub/Sub** for multi-server coordination  
✅ **Monitor connection count** and event delivery rate  
✅ **Implement graceful shutdown** (notify clients before closing)  

❌ **Don't use for bidirectional** (need WebSocket)  
❌ **Don't send binary data** (text only, base64 if needed)  
❌ **Don't forget heartbeat** (detect dead connections)  
❌ **Don't skip event IDs** (needed for reliable resumption)  
❌ **Don't ignore HTTP/1.1 limit** (max 6 connections per domain)  
❌ **Don't use for high-frequency** (>100 events/sec, consider WebSocket)  

---

**Final thought for interviews:**

> "Server-Sent Events is the pragmatic choice for server-to-client real-time updates. It delivers the benefits of WebSocket (persistent connection, server push, low latency) with the simplicity of HTTP. The browser's EventSource API handles reconnection automatically and tracks event IDs for resumption, making it more reliable than long polling with less complexity than WebSocket. Twitter, GitHub, and Facebook use SSE for notifications because it works everywhere (no firewall issues), handles network failures gracefully, and requires minimal client code. The key limitation is unidirectional—if you need client→server messages, use WebSocket. But for dashboards, notifications, and feeds where you only need server push, SSE is often the better choice: simpler, more reliable, and just as fast."
