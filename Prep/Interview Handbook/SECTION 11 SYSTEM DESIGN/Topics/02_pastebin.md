# Problem 02 — Design Pastebin

> Frequency: ⭐⭐⭐⭐ | Asked at: All companies | Difficulty: 🟢 Entry-Mid

---

## PART 1 — Problem Statement

### Functional Requirements
- Users paste text/code and get a unique URL
- Anyone with the URL can read the paste
- Optional: expiration time, password protection, syntax highlighting
- Optional: user accounts to manage pastes
- Analytics: view count per paste

### Non-Functional Requirements
- **Scale:** 10M DAU, 1M pastes/day
- **Availability:** 99.9%
- **Latency:** Read < 50ms, Write < 200ms
- **Storage:** Up to 10 MB per paste, 10 years retention
- **Read-heavy:** 10:1 read/write ratio

---

## PART 3 — Capacity Estimation

```
=== TRAFFIC ===
Write QPS:     1M pastes/day / 86,400 ≈ 12 writes/sec
Read QPS:      12 × 10 = 120 reads/sec
Peak QPS:      120 × 3 = 360 reads/sec

=== STORAGE ===
Avg paste size:     10 KB (many are small code snippets)
Daily storage:      1M × 10 KB = 10 GB/day
10-year storage:    10 GB × 365 × 10 = 36.5 TB total

=== CACHE ===
20% of pastes → 80% reads
Top pastes cached in Redis
Cache size:    1M pastes × 20% × 10 KB = 2 GB/day (very manageable)
```

---

## PART 4 — High-Level Architecture

```
Client
  │
  ▼
CDN (static assets)
  │
  ▼
Load Balancer
  │
  ├──▶ Paste Write Service
  │         │
  │         ├──▶ Object Storage (S3) ← paste content (large blobs)
  │         └──▶ Metadata DB (PostgreSQL) ← paste metadata
  │
  ├──▶ Paste Read Service
  │         │
  │         ├──▶ Redis Cache (hot pastes)
  │         └──▶ S3 / DB (cache miss)
  │
  └──▶ URL Generation Service
            │
            └──▶ Key-Value Store (unique short codes)
```

---

## PART 5 — Data Model

```sql
CREATE TABLE pastes (
    paste_id       VARCHAR(8) PRIMARY KEY,     -- "aB3xKz2P"
    user_id        BIGINT,                     -- nullable (anonymous)
    title          VARCHAR(200),
    language       VARCHAR(50),                -- 'python', 'javascript'
    visibility     VARCHAR(20) DEFAULT 'public',
    size_bytes     INT,
    content_url    TEXT,                       -- S3 URL for large pastes
    content_inline TEXT,                       -- inline for small (<1KB)
    password_hash  VARCHAR(255),              -- optional protection
    created_at     TIMESTAMP DEFAULT NOW(),
    expires_at     TIMESTAMP,                  -- NULL = never
    view_count     BIGINT DEFAULT 0
);

CREATE INDEX idx_user_pastes ON pastes(user_id, created_at DESC);
CREATE INDEX idx_expiry ON pastes(expires_at) WHERE expires_at IS NOT NULL;
```

### Storage Strategy
```
Small pastes (< 1 KB):  Store inline in DB (content_inline column)
Large pastes (1-10 MB): Store in S3, keep URL in DB (content_url)

Why?
- Avoids large BLOBs in DB (bad for performance)
- S3 is cheap and scales infinitely
- DB stays fast for metadata queries
```

---

## PART 6 — API Design

```http
# Create paste
POST /api/v1/pastes
{
  "title": "My Python Script",
  "content": "print('Hello World')",
  "language": "python",
  "expires_in": "1d",          // 1d, 1w, 1m, never
  "visibility": "public",
  "password": "optional"
}
Response 201: { "paste_id": "aB3xKz2P", "url": "https://paste.ly/aB3xKz2P" }

# Read paste
GET /api/v1/pastes/{paste_id}
Headers: X-Paste-Password: secret  (if password protected)
Response 200: { "title": "...", "content": "...", "language": "..." }

# List user pastes
GET /api/v1/users/{user_id}/pastes?page=1&limit=20

# Delete paste
DELETE /api/v1/pastes/{paste_id}
```

---

## PART 7 — Deep Dive: Key Generation

```
Same approach as URL Shortener:
- Base62 encode auto-increment ID (8 chars = 62^8 = 218 trillion)
- Or pre-generate pool of random codes

Collision avoidance:
- Unique constraint on paste_id column
- On conflict: generate new code (rare, < 0.001%)

Custom slugs (premium feature):
- Allow user to pick "mypaste" → paste.ly/mypaste
- Unique constraint enforced
- Reserved words blacklist (admin, api, etc.)
```

---

## PART 8 — Scalability

```
10K users:   Single server, PostgreSQL, no cache
100K users:  Redis cache, read replicas
1M users:    Multiple app servers, CDN for content delivery
10M users:   S3 for storage, Elasticsearch for search, sharded DB
100M users:  Global CDN, multi-region, dedicated services
```

---

## PART 10 — Caching Strategy

```
Cache-aside for reads:
  Key:   "paste:{paste_id}"
  Value: full paste JSON
  TTL:   1 hour (refresh on access)
  
Eviction: LRU
Cache size: 10 GB RAM handles millions of small pastes

For large pastes (>1MB):
  Don't cache in Redis (wastes memory)
  Use CDN caching with long TTL (paste content is immutable once created)
```

---

## PART 20 — Interview Summary

### 5-Minute Answer
> "Pastebin is read-heavy (10:1). Core components: a write service that takes paste content, generates a Base62 short ID, stores metadata in PostgreSQL and content in S3 (for large pastes), returns the URL. A read service checks Redis cache first (LRU, 1-hour TTL), falls back to S3/DB. CDN caches popular paste URLs. Expiry: background job queries expires_at index and deletes old pastes. Custom slugs stored with unique constraint. Password protection: bcrypt hash stored, verified on read."

---

*Next: `03_whatsapp_messenger.md`*
