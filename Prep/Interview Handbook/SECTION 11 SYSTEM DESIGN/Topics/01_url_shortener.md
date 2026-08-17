# Problem 01 — Design a URL Shortener (TinyURL / bit.ly)

> Frequency: ⭐⭐⭐⭐⭐ | Asked at: All companies | Difficulty: 🟢 Entry

---

## PART 1 — Problem Statement

### Business Requirements
Design a URL shortening service like TinyURL/bit.ly that converts long URLs to short ones and redirects users.

### Functional Requirements
- Given a long URL, generate a unique short URL (e.g., `tiny.ly/aB3xKz`)
- Redirect users from short URL to original long URL
- Custom aliases (optional, e.g., `tiny.ly/my-company`)
- Link analytics: click counts, geographic data, referrers
- Link expiration (optional TTL per URL)
- User accounts for managing links

### Non-Functional Requirements
- **High availability:** 99.99% uptime (redirects must always work)
- **Low latency:** Redirects in < 10ms (p99)
- **Durability:** URLs once created never silently lost
- **Scale:** 100M DAU, 1B URLs stored

### Scale Assumptions
- 100M DAU
- Read/Write ratio: 100:1 (much more reads than writes)
- Average URL length: 200 chars
- Short URL length: 7 characters
- Data retention: 10 years

---

## PART 2 — Requirement Gathering

### Questions to Ask

```
□ What's the expected scale? DAU? Total URLs?
□ Do we need custom short URLs / vanity aliases?
□ Do we need analytics (clicks, geography, device)?
□ Should URLs expire? User-configurable or fixed TTL?
□ User accounts / authentication required?
□ Do we need an API or just a web interface?
□ What's the target latency for redirects?
□ Multi-region deployment needed?
□ Do we need to prevent abuse (spam URLs)?
```

---

## PART 3 — Capacity Estimation

```
=== USERS & TRAFFIC ===
DAU:                    100 million
URL creations/day:      100M × 1% = 1M URLs/day
Redirects/day:          1M × 100 = 100M redirects/day

Write QPS:              1M / 86,400 ≈ 12 writes/sec
Read QPS:               100M / 86,400 ≈ 1,200 reads/sec
Peak Read QPS:          1,200 × 5 = 6,000 reads/sec

=== STORAGE ===
Per URL record:
  id:            8 bytes
  short_code:    7 bytes
  long_url:      200 bytes (avg)
  user_id:       8 bytes
  created_at:    8 bytes
  expires_at:    8 bytes
  click_count:   8 bytes
  Total:         ~247 bytes ≈ 500 bytes (with overhead)

URLs per year:   1M × 365 = 365M URLs
Storage/year:    365M × 500B = 182 GB
10-year storage: 1.8 TB (tiny — this is not a storage problem)

=== CACHE ===
20% of URLs get 80% of traffic (Pareto)
Cache top 20%: 365M × 20% × 500B = 36 GB/year
Redis: Very feasible, keep hot URLs in cache

=== BANDWIDTH ===
Write: 12 writes/sec × 500B = 6 KB/s
Read:  6,000 reads/sec × 500B = 3 MB/s (tiny)
```

**Conclusion:** This is NOT a storage or bandwidth problem. The core challenge is:
1. Generating unique short codes at scale
2. Extremely fast redirects (cache-heavy)
3. Hash collision avoidance

---

## PART 4 — High-Level Architecture

```
                        ┌──────────────────────────────────┐
                        │         Client (Browser)          │
                        └────────────┬─────────────────────┘
                                     │ HTTPS
                                     ▼
                        ┌────────────────────────┐
                        │      CDN / WAF          │  (DDoS, abuse filtering)
                        └────────────┬───────────┘
                                     │
                        ┌────────────▼───────────┐
                        │    API Gateway /         │  (Rate limiting, auth)
                        │    Load Balancer         │
                        └────────┬────────────────┘
                                 │
               ┌─────────────────┼──────────────────┐
               │                 │                   │
               ▼                 ▼                   ▼
    ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  URL Write   │  │   URL Read /     │  │   Analytics      │
    │  Service     │  │   Redirect Svc   │  │   Service        │
    └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘
           │                   │                      │
           │          ┌────────▼────────┐             │
           │          │   Redis Cache   │             │
           │          │  (URL mappings) │             │
           │          └────────┬────────┘             │
           │                   │ (cache miss)         │
           ▼                   ▼                      ▼
    ┌──────────────────────────────────┐   ┌──────────────────┐
    │        Primary Database          │   │  Analytics DB    │
    │    (PostgreSQL / DynamoDB)       │   │  (Cassandra)     │
    └──────────────────────────────────┘   └──────────────────┘
           │
           ▼
    ┌──────────────────┐
    │  ID Generator    │  (Snowflake-style unique IDs)
    │  Service         │
    └──────────────────┘
```

---

## PART 5 — Data Model

### URL Table (PostgreSQL or DynamoDB)
```sql
CREATE TABLE urls (
    id            BIGINT PRIMARY KEY,          -- Snowflake ID
    short_code    VARCHAR(10) UNIQUE NOT NULL, -- "aB3xKz"
    long_url      TEXT NOT NULL,               -- original URL
    user_id       BIGINT REFERENCES users(id), -- nullable (anonymous)
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMP,                   -- NULL = never expires
    is_active     BOOLEAN DEFAULT TRUE,
    custom_alias  VARCHAR(50)                  -- optional vanity
);

-- Indexes
CREATE INDEX idx_short_code ON urls(short_code);  -- Primary lookup
CREATE INDEX idx_user_id ON urls(user_id);         -- User's links
CREATE INDEX idx_expires ON urls(expires_at) WHERE expires_at IS NOT NULL;
```

### Analytics Table (Cassandra - wide column for time-series)
```sql
CREATE TABLE click_events (
    short_code    TEXT,
    clicked_at    TIMESTAMP,
    ip_address    TEXT,
    country       TEXT,
    city          TEXT,
    user_agent    TEXT,
    referrer      TEXT,
    PRIMARY KEY (short_code, clicked_at)
) WITH CLUSTERING ORDER BY (clicked_at DESC)
  AND default_time_to_live = 7776000;  -- 90 days retention
```

### Users Table
```sql
CREATE TABLE users (
    id          BIGINT PRIMARY KEY,
    email       VARCHAR(255) UNIQUE,
    api_key     VARCHAR(64) UNIQUE,
    plan        VARCHAR(20) DEFAULT 'free',  -- free, pro, enterprise
    created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## PART 6 — API Design

### Create Short URL
```http
POST /api/v1/urls
Authorization: Bearer {jwt_token}  (optional, for account linking)
Content-Type: application/json

{
  "long_url": "https://www.example.com/very/long/path?with=params",
  "custom_alias": "my-link",      // optional
  "expires_in_days": 30           // optional
}

Response 201:
{
  "short_url": "https://tiny.ly/aB3xKz",
  "short_code": "aB3xKz",
  "long_url": "https://www.example.com/very/long/path?with=params",
  "created_at": "2024-01-15T10:30:00Z",
  "expires_at": "2024-02-14T10:30:00Z"
}

Errors:
  400: Invalid URL format
  409: Custom alias already taken
  422: URL on blacklist
  429: Rate limit exceeded
```

### Redirect
```http
GET /{short_code}
(No auth required)

Response 301/302 → Location: {long_url}
  301: Permanent redirect (browser caches → no analytics for repeat visits)
  302: Temporary redirect (browser re-requests → full analytics)

Decision: Use 302 for analytics accuracy
```

### Get Analytics
```http
GET /api/v1/urls/{short_code}/analytics
Authorization: Bearer {jwt_token}

Response 200:
{
  "short_code": "aB3xKz",
  "total_clicks": 45231,
  "unique_clicks": 30145,
  "clicks_by_day": [...],
  "top_countries": [{"country": "US", "clicks": 20000}, ...],
  "top_referrers": [...]
}
```

---

## PART 7 — Deep Dive: URL Encoding Strategies

### Option 1: MD5/SHA Hash + Truncate
```python
import hashlib

def generate_short_code(long_url):
    hash = hashlib.md5(long_url.encode()).hexdigest()
    return hash[:7]  # First 7 chars of MD5

# Problem: Collision! Different URLs → same first 7 chars
# Mitigation: Check DB, if collision append index and retry
```

### Option 2: Base62 Encoding of Auto-Increment ID (Recommended)
```python
ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
BASE = 62

def encode(num):
    result = []
    while num:
        result.append(ALPHABET[num % BASE])
        num //= BASE
    return ''.join(reversed(result))

# ID 1,000,000 → "4c92" (4 chars)
# ID 3,521,614,606,208 → "zzzzzz" (all combos for 6 chars)
# 7 chars gives 62^7 = 3.5 trillion unique codes

# Snowflake-style ID for ordering + uniqueness
# No collision possible (IDs are unique by definition)
```

### Option 3: Pre-Generated Code Pool
```
Batch generate codes → store in "available_codes" table
Workers consume from pool and assign to URLs

Pros: No generation at request time
Cons: Must manage pool size, complexity
Used by: Systems needing very predictable latency
```

### Key Generation Service (KGS)
```
Dedicated service generates and pre-loads codes into:
  - "used_keys" table (for lookup)
  - "unused_keys" table (pool)

Each app server fetches a batch (e.g., 1000 keys) into memory
No lock contention during URL creation

Scale: At 12 writes/sec, generating codes is trivial
       KGS is mainly for large-scale (millions of writes/sec)
```

---

## PART 8 — Scalability Evolution

### 10K Users (MVP)
```
Single server + PostgreSQL
Nginx + basic application
No caching needed yet
Cost: ~$50/month
```

### 100K Users
```
Add Redis cache for hot URLs
Read replica for PostgreSQL
Basic monitoring
Cost: ~$200/month
```

### 1M Users
```
Load balancer + multiple app servers (3-5)
Redis cluster
Database connection pooling (PgBouncer)
CDN for static assets
Cost: ~$1,000/month
```

### 10M Users
```
Horizontal sharding of URLs table by short_code hash
Separate analytics pipeline (Kafka → Cassandra)
Multiple Redis shards
Regional deployment
Cost: ~$10,000/month
```

### 100M Users
```
Multi-region active-active
DynamoDB (or Cassandra) instead of PostgreSQL for URL table
Global Redis (ElastiCache Global Datastore)
Dedicated KGS (Key Generation Service)
Bloom filter to avoid DB lookups for non-existent codes
Cost: ~$100,000/month
```

### 1B Users
```
Full geo-distribution (5+ regions)
URL routing at DNS level
Stream processing for real-time analytics (Flink)
ML-based abuse detection
Cost: ~$1M+/month
```

---

## PART 9 — Database Design Decision

**Why not just use MySQL with hash index?**
```
At 1B URLs × 500 bytes = 500 GB
Single MySQL: disk I/O bottleneck at this scale

Solution options:
1. Shard by short_code (hash sharding)
   hash("aB3xKz") % 16 → shard 7
   Add more shards as data grows

2. DynamoDB
   short_code as partition key
   O(1) lookup at any scale
   Serverless capacity mode
   No operational overhead

Recommendation: DynamoDB for production at scale
               PostgreSQL for small/medium (easier ops)
```

---

## PART 10 — Caching Strategy

```
Cache-Aside pattern for URL lookups:

Read path:
1. hash = short_code → Redis key
2. Cache HIT → return long_url → redirect
3. Cache MISS → DynamoDB → cache → redirect

Cache key:  "url:{short_code}"
Cache TTL:  24 hours (refresh on access)
Cache size: Top 20% URLs serve 80% traffic

Warm cache strategy:
  On startup: preload top 1M URLs by click count
  Background job: refresh TTL on accessed keys

Anti-stampede: Lock on cache miss for same key
```

---

## PART 11 — Handling Abuse

```
URL Blacklist:
  Maintain list of malicious domains
  Check before creating short URL
  Safe Browsing API (Google) integration

Rate Limiting:
  Anonymous: 5 URLs/hour per IP
  Free users: 50 URLs/day
  Pro users: 10,000 URLs/day
  Enterprise: Unlimited

Bloom Filter for blacklist:
  Set → billion blacklisted URLs → Bloom filter
  O(1) check before DB lookup
  False positive rate: 0.1% (acceptable)

CAPTCHA for suspicious patterns:
  Same IP creating many URLs quickly
  Unusual URL patterns
```

---

## PART 15 — Security

```
Input Validation:
  Validate URL format (RFC 3986)
  Check URL is accessible (optional)
  Block private IPs (10.x, 192.168.x) → prevent SSRF
  Block javascript: protocol
  Check against phishing/malware blacklists

Short code:
  Cryptographically random (not sequential if sensitive)
  Rate limit guessing attempts
  
HTTPS:
  All redirect traffic over HTTPS
  HSTS header on short domain
```

---

## PART 20 — Interview Summary

### 5-Minute Answer
> "I'd build a URL shortener with these components: An API service that accepts long URLs and generates a unique 7-character Base62 code by encoding a Snowflake ID. Store URL mappings in DynamoDB with short_code as partition key. For redirects, check Redis cache first (24h TTL), fall back to DynamoDB. Use 302 redirects for analytics tracking. For analytics, send click events to Kafka → process → Cassandra."

### 15-Minute Answer
Add:
> "For scale: the system is read-heavy (100:1). The redirect path must be sub-10ms. Redis cluster caches hot URLs — top 20% by traffic. For URL generation, Base62 encoding of auto-increment Snowflake IDs guarantees uniqueness with no collision risk. As we scale: DynamoDB auto-scales, Redis Cluster handles the cache layer, Kafka absorbs analytics writes without blocking redirects. For abuse: maintain a blacklist with a Bloom filter for O(1) checks. Rate limit by IP and API key using token bucket in Redis."

### 45-Minute Deep Dive
Add:
> Deep dive on: KGS vs Base62 encoding trade-offs. Custom alias handling (DB unique constraint + cache invalidation). Analytics pipeline: Kafka topics per event type, Flink for real-time aggregation, Cassandra wide-column design for time-series queries. Multi-region: active-active with geo-DNS routing, eventual consistency across regions for URL lookups (acceptable — 1-2 second window). Expiration: background job scans expires_at index and soft-deletes. Evolution from single PostgreSQL to sharded DynamoDB. Cost optimization: auto-expire cold cache entries, use S3 for archival of old analytics data.

---

*Next: `02_pastebin.md`*
