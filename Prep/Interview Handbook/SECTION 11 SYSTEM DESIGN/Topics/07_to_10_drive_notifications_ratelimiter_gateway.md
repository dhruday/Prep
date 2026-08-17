# Problem 07 — Design Dropbox / Google Drive (Cloud File Storage)

> Frequency: ⭐⭐⭐⭐ | Asked at: Google, Microsoft, Dropbox, Meta | Difficulty: 🔴 Senior

---

## PART 1 — Problem Statement

### Functional Requirements
- Upload/download files of any type and size
- Folder hierarchy and organization
- File sharing (view/edit permissions)
- Version history (30 versions)
- Real-time sync across devices
- Offline access (sync when reconnected)
- Collaborative editing (Google Docs integration)
- Search file content and name

### Non-Functional Requirements
- **Scale:** 1B users, 100M DAU, 15 GB free/user
- **Storage:** 15 PB (Google Drive) to EB scale
- **Availability:** 99.99% (file loss is catastrophic)
- **Consistency:** Strong (users must see their own uploads)
- **Durability:** 99.999999999% (11 nines, like S3)
- **Upload throughput:** 1 GB/sec aggregate globally

---

## PART 3 — Capacity Estimation

```
=== USERS & STORAGE ===
Users:          1 billion
Avg storage:    10 GB/user
Total storage:  10 PB (petabytes) → growing to EB

=== TRAFFIC ===
DAU:            100M users
Uploads/day:    100M × 2 = 200M file uploads/day
Avg file size:  100 KB (mix of docs, photos, videos)
Upload bandwidth: 200M × 100KB / 86400 = 231 GB/sec aggregate

Download reads: 10:1 read ratio
Read QPS:       200M × 20 requests / 86400 ≈ 46K reads/sec

=== CHUNKING ===
File split into 4MB chunks
1 GB file = 250 chunks
Upload 250 chunks in parallel
```

---

## PART 4 — High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Desktop / Mobile Client                       │
│              (Sync daemon watching file system changes)          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
                   ┌─────────────────────┐
                   │    API Gateway       │
                   └──────┬──────────────┘
                          │
         ┌────────────────┼──────────────────┐
         ▼                ▼                  ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────────┐
│  File Service  │ │  Sync Service  │ │  Metadata Service   │
│  (upload/down) │ │  (real-time)   │ │  (folders, shares)  │
└───────┬────────┘ └────────┬───────┘ └────────┬────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐  ┌──────────────────────┐
│  Object Store│   │   Kafka      │  │  Metadata DB          │
│  (S3/GCS)    │   │  (file events│  │  (PostgreSQL +        │
│              │   │   sync queue)│  │   Elasticsearch)      │
│  Chunks      │   └──────────────┘  └──────────────────────┘
│  Blocks      │
│  (deduplicated│  ┌──────────────────────────────────────────┐
│   content)   │  │              CDN                           │
└──────────────┘  │  (file download acceleration)             │
                  └──────────────────────────────────────────┘
```

---

## PART 5 — Data Model

```sql
-- Files table (PostgreSQL)
CREATE TABLE files (
    file_id         BIGINT PRIMARY KEY,
    owner_id        BIGINT NOT NULL,
    folder_id       BIGINT REFERENCES folders(folder_id),
    name            VARCHAR(500) NOT NULL,
    size_bytes      BIGINT,
    mime_type       VARCHAR(100),
    current_version INT DEFAULT 1,
    storage_key     TEXT,       -- S3 key or dedup hash
    checksum        VARCHAR(64), -- SHA-256 for integrity
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP,
    modified_at     TIMESTAMP
);

-- File versions (up to 30)
CREATE TABLE file_versions (
    version_id      BIGINT PRIMARY KEY,
    file_id         BIGINT REFERENCES files(file_id),
    version_number  INT NOT NULL,
    size_bytes      BIGINT,
    storage_key     TEXT,
    checksum        VARCHAR(64),
    created_at      TIMESTAMP,
    created_by      BIGINT,
    UNIQUE (file_id, version_number)
);

-- File chunks (for large file management)
CREATE TABLE file_chunks (
    chunk_id    BIGINT PRIMARY KEY,
    file_id     BIGINT,
    version_id  BIGINT,
    chunk_index INT,
    chunk_hash  VARCHAR(64),    -- SHA-256 of chunk content
    storage_key TEXT,           -- S3 key
    size_bytes  INT
);

-- Folders (closure table for hierarchy)
CREATE TABLE folders (
    folder_id   BIGINT PRIMARY KEY,
    owner_id    BIGINT,
    parent_id   BIGINT REFERENCES folders(folder_id),
    name        VARCHAR(500),
    path        TEXT            -- materialized path for fast hierarchy
);

-- Shares / permissions
CREATE TABLE shares (
    share_id    BIGINT PRIMARY KEY,
    file_id     BIGINT,
    folder_id   BIGINT,
    shared_by   BIGINT,
    shared_with BIGINT,         -- user_id OR NULL (public link)
    share_token VARCHAR(64),    -- for public links
    permission  VARCHAR(20),    -- 'view', 'edit', 'admin'
    expires_at  TIMESTAMP
);
```

---

## PART 7 — Deep Dive: File Upload

### Chunked Upload Flow
```
Client (Upload 1GB file):

Step 1: Split file into 4MB chunks (250 chunks)
Step 2: Compute SHA-256 of each chunk
Step 3: Call POST /upload/initiate → get upload_id
Step 4: For each chunk:
  Check: has server seen this chunk? (deduplication check)
  If YES: skip upload (server already has it)
  If NO:  upload chunk → PUT /upload/{upload_id}/chunk/{i}
Step 5: POST /upload/complete → merge chunks, create file record

Parallel upload:
  Upload 5-10 chunks concurrently
  Resume: track uploaded chunks, retry only failed ones
```

### Content-Addressable Storage (Deduplication)
```
Key insight: If two files (or chunks) have same SHA-256 hash,
             they're identical → store only once

Global deduplication:
  chunk_hash (SHA-256) → storage_key (S3 key)
  
  Before upload: check if hash exists in DB
  If exists: just create reference, don't upload bytes
  
  Example: 1M users have the same Linux ISO
    → Store once on S3 (4GB saved per user)
    → 1M references to same storage_key
    
  Dropbox saves ~50% storage cost via deduplication

File-level dedup:
  Hash entire file → if exists, just create metadata record
  Works for identical files (same document shared many times)

Block-level dedup (Dropbox approach):
  Split into 4MB chunks → dedup at chunk level
  Partial file changes → only changed chunks re-uploaded
```

### Delta Sync (Differential Sync)
```
User edits a 100 MB document
Only 2 KB actually changed
→ Don't re-upload 100 MB, only the changed chunks

rsync algorithm (Dropbox):
  Client computes rolling hash of local file blocks
  Sends hashes to server
  Server computes diff (which blocks changed)
  Client uploads only changed blocks

Result:
  Large file edit: only ~1% of file re-uploaded
  Massive bandwidth savings for users on slow connections
```

---

## PART 8 — Real-Time Sync

```
When file changes on Device A:
  1. Client daemon detects file system change (inotify/FSEvents)
  2. Computes delta (changed chunks)
  3. Uploads to server
  4. Server publishes event to Kafka: {file_id, new_version, user_id}
  5. Sync service consumes Kafka event
  6. Sync service pushes notification to all of user's devices via WebSocket
  7. Device B receives notification, downloads changed chunks

Connection model:
  Each device maintains persistent WebSocket to Sync Service
  Sync Service maintains: user_id → [list of connected devices]
  Push delta notifications to all devices
  
  On reconnect after offline:
    1. Client sends last_sync_timestamp
    2. Server returns all changes since that timestamp
    3. Client applies changes (with conflict resolution)
```

### Conflict Resolution
```
Device A and Device B both edit file while offline

Resolution strategies:
1. Last Write Wins (LWW):
   Latest modification_time wins
   Risk: data loss (other device's changes discarded)

2. Duplicate with conflict suffix:
   Both versions kept: "document.txt" + "document (Device B conflict).txt"
   User manually merges
   Used by: Dropbox

3. Operational Transformation:
   Merge changes intelligently at character level
   Used by: Google Docs (requires real-time coordination server)

4. CRDTs (Conflict-free Replicated Data Types):
   Data structure that merges automatically without conflicts
   Used by: Notion, some collaborative editors
```

---

## PART 9 — Storage Architecture

```
Three-tier storage:
  Hot (SSD):      Recent files (< 30 days), frequently accessed
  Warm (HDD):     Older files (30 days - 1 year)
  Cold (Glacier): Archive (> 1 year, rarely accessed)

Transition (S3 Lifecycle Policies):
  Day 0:   Upload → S3 Standard (hot)
  Day 30:  → S3 Standard-IA (infrequent access, cheaper)
  Day 365: → S3 Glacier (cold archive)

Cost savings: 70% reduction vs keeping everything hot

Replication:
  3 copies across 3 availability zones (S3 standard)
  Cross-region replication for disaster recovery
  Geographic redundancy for global access
```

---

## PART 20 — Interview Summary (Drive)

### 5-Minute Answer
> "Google Drive is primarily a storage + sync problem. Files are split into 4MB chunks, each hash-deduplicated (SHA-256). Client uploads only unique chunks to S3 via pre-signed URLs. Metadata (file tree, versions, shares) stored in PostgreSQL. On file change: Kafka event → all user's devices notified via WebSocket → download changed chunks only (delta sync). Versions stored for 30 days. Deduplication: if chunk hash already exists in storage, skip the upload — saves ~50% storage. Sharing: share_token in DB, permissions enforced at API layer."

---

---

# Problem 08 — Design a Notification System

> Frequency: ⭐⭐⭐⭐⭐ | Asked at: All companies | Difficulty: 🟡 Mid-Senior

---

## PART 1 — Problem Statement

### Functional Requirements
- Send notifications via: Push (iOS/Android), Email, SMS, In-app
- Notifications triggered by: user actions, system events, marketing campaigns
- User preferences: opt-in/out per channel and notification type
- Template management (different messages per language)
- Scheduled notifications (send at 9am in user's timezone)
- Rate limiting (don't spam users)
- Delivery tracking: sent, delivered, opened

### Non-Functional Requirements
- **Scale:** 100M users, 1B notifications/day
- **Throughput:** 10K notifications/sec sustained, 100K peak
- **Latency:** Critical alerts < 1 second; marketing < 1 minute
- **Reliability:** At-least-once delivery for critical, best-effort for marketing

---

## PART 3 — Capacity Estimation

```
Notifications/day:  1 billion
Avg QPS:            1B / 86,400 ≈ 11,500/sec
Peak QPS:           ~50,000/sec

Channel breakdown:
  Push (70%):   700M/day → 8,100/sec
  Email (20%):  200M/day → 2,300/sec
  SMS (10%):    100M/day → 1,150/sec (most expensive!)
```

---

## PART 4 — Architecture

```
Event Sources (order placed, friend request, etc.)
         │
         ▼
┌──────────────────┐
│ Notification API │  POST /notify
│ (Event Ingestion)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Preference Check │  Is user subscribed to this type/channel?
│ Service          │  User locale, DND hours, rate limits
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│                  Kafka Topics                     │
│  push-notifications  email-queue  sms-queue       │
└──────┬───────────────────┬──────────┬────────────┘
       │                   │          │
       ▼                   ▼          ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Push Workers │  │ Email Workers│  │  SMS Workers  │
│              │  │              │  │               │
│ APNs (iOS)   │  │ SendGrid     │  │ Twilio        │
│ FCM (Android)│  │ SES (AWS)    │  │ SNS (AWS)     │
│ Web Push     │  │ Mailgun      │  │               │
└──────┬───────┘  └──────┬───────┘  └──────┬────────┘
       │                 │                  │
       └─────────────────┴──────────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │ Delivery Tracker │  (Cassandra: sent, delivered, opened)
               └──────────────────┘
```

---

## PART 5 — Data Model

```sql
-- Notification templates
CREATE TABLE templates (
    template_id     BIGINT PRIMARY KEY,
    name            VARCHAR(100),
    channel         VARCHAR(20),        -- 'push', 'email', 'sms'
    language        VARCHAR(10),        -- 'en', 'es', 'fr'
    subject         TEXT,               -- email subject
    body            TEXT,               -- template with placeholders
    created_at      TIMESTAMP
);

-- User preferences
CREATE TABLE notification_preferences (
    user_id         BIGINT,
    notification_type VARCHAR(50),      -- 'order_status', 'marketing', 'friend_request'
    channel         VARCHAR(20),
    is_enabled      BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, notification_type, channel)
);

-- Delivery log (Cassandra)
CREATE TABLE notification_log (
    notification_id BIGINT,
    user_id         BIGINT,
    channel         VARCHAR(20),
    status          VARCHAR(20),        -- 'queued', 'sent', 'delivered', 'failed', 'opened'
    sent_at         TIMESTAMP,
    delivered_at    TIMESTAMP,
    opened_at       TIMESTAMP,
    error_message   TEXT,
    PRIMARY KEY (user_id, notification_id)
) WITH CLUSTERING ORDER BY (notification_id DESC);
```

---

## PART 7 — Deep Dive

### Push Notification Flow (APNs/FCM)
```
1. Device registers with APNs/FCM → receives device token
2. App sends token to our backend
3. Backend stores: user_id → [device_token_1, device_token_2] (multi-device)
4. On send: POST to APNs/FCM API with device_token + payload
5. APNs/FCM delivers to device
6. Delivery webhook: device confirmation → update delivery_log

Token refresh: tokens expire or change
  → Handle token expiry errors from APNs/FCM
  → Prompt app to re-register
  → Clean up invalid tokens from DB
```

### Rate Limiting (Don't Spam Users)
```
Rules (per user):
  Max 3 marketing push/day
  Max 10 push notifications/day total
  No notifications 10pm - 8am (user's local timezone)
  No duplicate notification within 1 hour (same template)

Implementation (Redis):
  Key: "notif_count:{user_id}:{channel}:{date}"
  Command: INCR + EXPIRE (sliding window)
  
DND hours:
  User timezone stored in DB
  Convert send time to user's timezone
  If in DND window: queue for next morning 8am
```

### Scheduled Notifications
```
Marketing team: "Send this email at 9am in user's local timezone"

Approach 1: Delay queue (SQS with DelaySeconds)
  Max delay: 15 minutes (SQS limit)
  Not suitable for days-in-advance scheduling

Approach 2: Scheduled Job (Cron + DB)
  INSERT scheduled_notifications (send_at, user_id, template_id)
  Cron job runs every minute: SELECT * WHERE send_at <= NOW()
  Scale issue: scanning 1B rows every minute
  Solution: Index on send_at, partition by date

Approach 3: Distributed Job Scheduler (Kafka + partitioned topics)
  Partition by send_time (minute granularity)
  Consumer processes notifications for current minute
  (See Problem 20: Distributed Job Scheduler)
```

---

## PART 20 — Notification Summary

### 5-Minute Answer
> "A notification system has three layers: ingestion (API accepts events), routing (check user preferences, apply rate limits, queue per channel), and delivery workers (Push via APNs/FCM, Email via SendGrid, SMS via Twilio). Kafka decouples ingestion from delivery and handles peak loads. Delivery is tracked in Cassandra. User preferences and device tokens are cached in Redis. Critical path: triggered event → API → preference check → Kafka → worker → delivery provider → user."

---

---

# Problem 09 — Design a Rate Limiter

> Frequency: ⭐⭐⭐⭐⭐ | Asked at: All companies | Difficulty: 🟡 Mid

---

## PART 1 — Problem Statement

### Requirements
- Limit requests per user/IP/API key within a time window
- Multiple rate limits: per second, per minute, per hour
- Low latency (< 1ms overhead)
- Works across multiple servers (distributed)
- Return 429 Too Many Requests with retry-after header
- Different limits per tier (free: 100/min, pro: 10K/min)

---

## PART 4 — Architecture

```
Request
  │
  ▼
API Gateway / Middleware
  │
  ├──▶ Rate Limiter Check (< 1ms, Redis)
  │         │ ALLOWED → forward to service
  │         └ DENIED → 429 response
  │
  ▼
Backend Service
```

---

## PART 7 — Algorithms

### Token Bucket (Recommended)
```python
def is_allowed(user_id: str, limit: int, window_sec: int) -> bool:
    key = f"rate_limit:{user_id}"
    pipe = redis.pipeline()
    
    now = time.time()
    window_start = now - window_sec
    
    # Sliding window using sorted set
    pipe.zremrangebyscore(key, 0, window_start)      # Remove old entries
    pipe.zadd(key, {str(now): now})                  # Add current request
    pipe.zcard(key)                                   # Count in window
    pipe.expire(key, window_sec)
    
    _, _, count, _ = pipe.execute()
    
    return count <= limit

# Headers to return on 429:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1700000060
# Retry-After: 60
```

### Fixed Window Counter (Simple, cheap)
```python
def is_allowed_fixed(user_id: str, limit: int) -> bool:
    window = int(time.time() / 60)   # 1-minute windows
    key = f"rl:{user_id}:{window}"
    
    count = redis.incr(key)
    if count == 1:
        redis.expire(key, 60)
    
    return count <= limit

# Problem: Boundary spike
# 100 requests at :59, 100 at :01 = 200 in 2 seconds!
```

### Sliding Window Log (Most accurate, more memory)
```python
# Store timestamp of each request in sorted set
# Count requests in window = ZCOUNT key (now-window) now
# Problem: O(n) memory per user where n = requests in window
```

### Leaky Bucket
```
Queue requests at fixed output rate
Smooth bursts into steady stream
Good for: backend request rate control, not API limiting
```

### Distributed Rate Limiting
```
Challenge: Multiple API servers, each with local counter
Solution A: Centralized Redis (single counter per key)
  - Accurate but network hop per request (~1ms)
  
Solution B: Local + Redis sync (hybrid)
  - Local counter: fast (no network)
  - Sync to Redis every 100ms
  - Small window of inaccuracy acceptable
  - Used by: Netflix, Stripe
  
Solution C: Fixed partition (user always hits same server)
  - Consistent hashing: user → server
  - Local rate limit, no Redis
  - Not truly distributed (server failure = limit reset)
```

---

## PART 20 — Rate Limiter Summary

### 5-Minute Answer
> "A rate limiter uses Redis as a shared counter across all API servers. For sliding window: each request adds a timestamped entry to a sorted set, then counts entries in the last N seconds. For fixed window: INCR a key with 60-second TTL. Token bucket: INCR counter, if > limit return 429. Return X-RateLimit-Remaining header. For multi-tier: different limits per API key tier stored in Redis or a config service. For < 1ms overhead: use local in-memory counter synced to Redis every 100ms (Netflix approach)."

---

---

# Problem 10 — Design an API Gateway

> Frequency: ⭐⭐⭐⭐ | Asked at: Amazon, Google, Microsoft | Difficulty: 🟡 Mid

---

## PART 4 — Architecture

```
Clients (Mobile, Web, Partners)
         │
         ▼
┌────────────────────────────────────────────────────────┐
│                    API Gateway                          │
│                                                        │
│  ┌─────────────┐  Request pipeline:                   │
│  │ SSL Termination │  1. Auth (JWT validation)        │
│  │ TLS 1.3         │  2. Rate limiting                │
│  │                 │  3. Request validation            │
│  └─────────────────┘  4. Transform / enrich           │
│                         5. Route to service            │
│                         6. Aggregate responses         │
│                         7. Transform response          │
│                         8. Return to client            │
│                                                        │
│  Cross-cutting concerns:                               │
│    Logging, Metrics, Tracing, Circuit Breaking         │
└────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
    User Service   Order Service  Payment Service
```

### Key Features

```
1. Authentication & Authorization
   Validate JWT → decode user claims → pass as headers to services
   Services trust the gateway (no re-auth needed internally)

2. Rate Limiting
   Per API key, per endpoint, per tier
   Redis-backed sliding window counters

3. Request Routing
   /api/v1/users/** → User Service
   /api/v1/orders/** → Order Service
   A/B routing: 10% → new service version

4. Load Balancing
   Round-robin or least-connections across service instances
   Health check → remove unhealthy instances

5. Protocol Translation
   REST → gRPC (internal services may use gRPC)
   HTTP/1.1 → HTTP/2 multiplexing

6. Response Caching
   Cache GET responses with Cache-Control headers
   Redis or in-memory Caffeine cache

7. Circuit Breaking
   Resilience4j / Hystrix per downstream service
   50% errors in 10sec → open circuit → fast fail

8. Request/Response Transformation
   Add/remove headers
   Validate request schema
   Mask PII in logs

9. SSL Termination
   Decrypt HTTPS at gateway
   Internal traffic over HTTP (or mutual TLS for sensitive)

10. Observability
    Request ID injection (trace header)
    Log every request (structured JSON)
    Metrics: request count, latency, errors per service
```

### Popular Gateway Implementations

| Tool | Best For |
|------|---------|
| Kong (open source) | Feature-rich, plugin ecosystem |
| AWS API Gateway | AWS-native, serverless |
| Nginx + Lua | High performance, custom logic |
| Envoy + Istio | Service mesh, Kubernetes |
| Traefik | Kubernetes native, auto-discovery |

### 5-Minute Answer
> "An API Gateway is the single entry point for all clients. It handles: SSL termination, authentication (JWT validation), rate limiting (Redis-backed), request routing to microservices, response caching, circuit breaking to prevent cascading failures, and observability (logs, metrics, traces injected per request). Internal services trust the gateway — they receive validated user context as request headers, so no re-authentication is needed. Kong, Nginx, or AWS API Gateway are common implementations."

---

*Next: `11_search_engine.md`*
