# 136. URL Shortener (like bit.ly, TinyURL)

## 📌 Problem Statement

**Design a URL shortening service** that converts long URLs to short URLs.

**Example**:
```
Long URL:  https://www.amazon.com/product/B08N5WRWNW?ref=123&category=electronics
Short URL: https://bit.ly/3x4k9Lm

User clicks short URL → Redirects to long URL
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Shorten URL**: Given long URL, return short URL
2. **Redirect**: Given short URL, redirect to long URL
3. **Custom aliases** (optional): User chooses custom short URL
4. **Analytics** (optional): Track clicks, referrers, locations

### **Non-Functional Requirements**

1. **High availability**: 99.9% uptime (43 min downtime/month)
2. **Low latency**: Redirect < 100ms (fast)
3. **Scalability**: 1 billion URLs, 10k writes/sec, 100k reads/sec
4. **Durability**: URLs never lost

---

## 🎯 Step 2: Capacity Estimation

### **Traffic**

```
Writes (create short URL): 10k/sec = 864 million/day = 315 billion/year
Reads (redirect):          100k/sec (read-heavy, 10:1 ratio)
```

### **Storage**

```
URL data per record: 500 bytes (long URL + short URL + metadata)
Total URLs over 5 years: 315 billion/year × 5 = 1.5 trillion URLs
Total storage: 1.5 trillion × 500 bytes = 750 TB
```

### **Bandwidth**

```
Write bandwidth: 10k req/sec × 500 bytes = 5 MB/sec
Read bandwidth:  100k req/sec × 500 bytes = 50 MB/sec
```

---

## 🎯 Step 3: API Design

### **1. Create Short URL**

**Request**:
```http
POST /api/shorten
Content-Type: application/json

{
  "long_url": "https://www.amazon.com/product/B08N5WRWNW",
  "custom_alias": "my-product",  // Optional
  "user_id": 123,                // Optional (for tracking)
  "expiry_date": "2025-12-31"    // Optional
}
```

**Response**:
```json
{
  "short_url": "https://bit.ly/3x4k9Lm",
  "long_url": "https://www.amazon.com/product/B08N5WRWNW",
  "created_at": "2024-01-15T10:00:00Z",
  "expiry_date": "2025-12-31"
}
```

---

### **2. Redirect**

**Request**:
```http
GET /3x4k9Lm
```

**Response**:
```http
HTTP/1.1 301 Moved Permanently
Location: https://www.amazon.com/product/B08N5WRWNW
```

**301 vs 302**:
- **301 (Permanent)**: Browser caches redirect (faster, but can't track clicks)
- **302 (Temporary)**: No cache (slower, but can track every click) ✓

---

### **3. Analytics** (Optional)

**Request**:
```http
GET /api/analytics/3x4k9Lm
```

**Response**:
```json
{
  "short_url": "3x4k9Lm",
  "total_clicks": 1234,
  "clicks_by_date": [
    {"date": "2024-01-15", "clicks": 100},
    {"date": "2024-01-16", "clicks": 150}
  ],
  "clicks_by_country": [
    {"country": "US", "clicks": 500},
    {"country": "IN", "clicks": 300}
  ],
  "referrers": [
    {"referrer": "facebook.com", "clicks": 400},
    {"referrer": "twitter.com", "clicks": 200}
  ]
}
```

---

## 🎯 Step 4: Database Schema

### **URLs Table**

```sql
CREATE TABLE urls (
    id BIGSERIAL PRIMARY KEY,
    short_url VARCHAR(10) UNIQUE NOT NULL,     -- e.g., "3x4k9Lm"
    long_url TEXT NOT NULL,                     -- Original URL
    user_id BIGINT,                             -- Optional (for tracking)
    created_at TIMESTAMP DEFAULT NOW(),
    expiry_date TIMESTAMP,                      -- Optional
    clicks BIGINT DEFAULT 0,                    -- Total clicks
    INDEX idx_short_url (short_url)
);
```

### **Analytics Table** (Optional)

```sql
CREATE TABLE analytics (
    id BIGSERIAL PRIMARY KEY,
    short_url VARCHAR(10) NOT NULL,
    clicked_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    country VARCHAR(2),
    referrer TEXT,
    user_agent TEXT,
    INDEX idx_short_url_date (short_url, clicked_at)
);
```

---

## 🎯 Step 5: Short URL Generation

### **Approach 1: Hash (MD5, SHA-256)**

**Algorithm**:
```python
import hashlib

def generate_short_url(long_url):
    # MD5 hash (128 bits = 32 hex chars)
    hash_value = hashlib.md5(long_url.encode()).hexdigest()
    
    # Take first 7 characters
    short_url = hash_value[:7]  # e.g., "3a7f9b2"
    
    return short_url
```

**Pros**:
- Deterministic (same long URL → same short URL)
- No coordination needed (distributed systems)

**Cons**:
- **Collision risk** (2 different URLs → same hash)
- Not sequential (can't predict next short URL)

**Collision handling**:
```python
def generate_short_url(long_url):
    short_url = hashlib.md5(long_url.encode()).hexdigest()[:7]
    
    # Check if short URL already exists
    if db.exists(short_url):
        # Append counter or timestamp
        short_url = hashlib.md5((long_url + str(time.time())).encode()).hexdigest()[:7]
    
    return short_url
```

---

### **Approach 2: Base62 Encoding** (Recommended ✓)

**Why Base62?** (0-9, a-z, A-Z = 62 characters)

```
URL-safe characters: 0-9 (10) + a-z (26) + A-Z (26) = 62 characters
Length 7: 62^7 = 3.5 trillion unique URLs
```

**Algorithm**:
```python
BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def base62_encode(num):
    if num == 0:
        return BASE62[0]
    
    result = []
    while num > 0:
        result.append(BASE62[num % 62])
        num //= 62
    
    return ''.join(reversed(result))

# Example:
base62_encode(123456789)  # "8M0kX"
```

**How to generate unique ID?**

**Option 1: Auto-increment ID** (Database)

```python
# PostgreSQL auto-increment
id = db.insert('INSERT INTO urls (long_url) VALUES (?)', long_url)
short_url = base62_encode(id)

# Example:
# ID 1 → "1"
# ID 62 → "10"
# ID 123456789 → "8M0kX"
```

**Pros**: Simple, no collisions

**Cons**: Single point of failure (database bottleneck)

---

**Option 2: Distributed ID Generator** (Snowflake, Twitter)

**Snowflake ID** (64 bits):

```
| 1 bit (unused) | 41 bits (timestamp) | 10 bits (machine ID) | 12 bits (sequence) |

Example: 1234567890123456789
```

**Implementation**:

```python
class SnowflakeIDGenerator:
    def __init__(self, machine_id):
        self.machine_id = machine_id  # 0-1023 (10 bits)
        self.sequence = 0             # 0-4095 (12 bits)
        self.last_timestamp = 0
        self.epoch = 1609459200000    # 2021-01-01 00:00:00 UTC
    
    def generate_id(self):
        timestamp = int(time.time() * 1000)  # Milliseconds
        
        if timestamp == self.last_timestamp:
            # Same millisecond → Increment sequence
            self.sequence = (self.sequence + 1) & 0xFFF  # Max 4095
            if self.sequence == 0:
                # Sequence overflow → Wait next millisecond
                while timestamp <= self.last_timestamp:
                    timestamp = int(time.time() * 1000)
        else:
            self.sequence = 0
        
        self.last_timestamp = timestamp
        
        # Generate ID: timestamp (41 bits) | machine_id (10 bits) | sequence (12 bits)
        id = ((timestamp - self.epoch) << 22) | (self.machine_id << 12) | self.sequence
        return id

# Usage
generator = SnowflakeIDGenerator(machine_id=1)
id = generator.generate_id()  # 1234567890123456789
short_url = base62_encode(id)  # "aB3xK9m"
```

**Pros**: Distributed, no coordination, sortable

**Cons**: Requires machine ID management

---

**Option 3: Key Generation Service** (KGS)

**Pre-generate short URLs**:

```python
# Background job: Generate 1 billion short URLs
for i in range(1_000_000_000):
    short_url = base62_encode(i)
    db.insert('INSERT INTO key_pool (short_url, used) VALUES (?, false)', short_url)

# When user requests short URL:
short_url = db.query('SELECT short_url FROM key_pool WHERE used=false LIMIT 1')
db.update('UPDATE key_pool SET used=true WHERE short_url=?', short_url)
```

**Pros**: Fast (no computation), no collisions

**Cons**: Key pool can be exhausted (need refill job)

---

## 🎯 Step 6: High-Level Design

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. POST /api/shorten (long URL)
       ▼
┌─────────────────────────────────────┐
│       Load Balancer (NGINX)         │
└──────────────┬──────────────────────┘
               │
               │ 2. Route to API Server
               ▼
┌─────────────────────────────────────┐
│         API Servers (Flask)         │
│  - Generate short URL (Base62)      │
│  - Store in database                │
└──────────────┬──────────────────────┘
               │
               │ 3. Write to database
               ▼
┌─────────────────────────────────────┐
│     Database (PostgreSQL)           │
│  - urls table (short_url, long_url) │
└─────────────────────────────────────┘


Redirect Flow:
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. GET /3x4k9Lm
       ▼
┌─────────────────────────────────────┐
│       Load Balancer (NGINX)         │
└──────────────┬──────────────────────┘
               │
               │ 2. Check cache (Redis)
               ▼
┌─────────────────────────────────────┐
│         Redis Cache                 │
│  - Key: short_url → long_url        │
│  - 80% cache hit rate               │
└──────────────┬──────────────────────┘
               │
               │ 3. Cache miss → Query database
               ▼
┌─────────────────────────────────────┐
│     Database (PostgreSQL)           │
└─────────────────────────────────────┘
```

---

## 🎯 Step 7: Optimizations

### **1. Caching (Redis)**

**Read-heavy** (100k reads/sec vs 10k writes/sec) → Cache long URLs

```python
def redirect(short_url):
    # 1. Check cache (Redis)
    long_url = redis.get(short_url)
    
    if long_url:
        # Cache hit (80% of requests)
        return redirect(long_url, 302)
    
    # 2. Cache miss → Query database
    long_url = db.query('SELECT long_url FROM urls WHERE short_url=?', short_url)
    
    if not long_url:
        return 404  # Not found
    
    # 3. Store in cache (TTL = 1 day)
    redis.setex(short_url, 86400, long_url)
    
    return redirect(long_url, 302)
```

**Cache eviction**: LRU (Least Recently Used)

---

### **2. Database Sharding**

**Problem**: 1.5 trillion URLs → Single database can't handle

**Solution**: Shard by short URL hash

```python
# Shard key: First character of short URL
def get_shard(short_url):
    return hash(short_url[0]) % NUM_SHARDS

# Example:
# "3x4k9Lm" → Shard 3
# "aB3xK9m" → Shard 10
```

**Shards**:
```
Shard 0: URLs starting with [0-9, a-e]
Shard 1: URLs starting with [f-k]
Shard 2: URLs starting with [l-p]
Shard 3: URLs starting with [q-z, A-E]
...
```

---

### **3. Rate Limiting**

**Prevent abuse** (spammers creating millions of URLs)

```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/shorten', methods=['POST'])
@limiter.limit("10 per minute")  # 10 URLs per minute per IP
def shorten():
    # Create short URL...
```

---

### **4. Analytics (Separate Service)**

**Problem**: Tracking clicks in database slows down redirects

**Solution**: Async analytics (Kafka + separate service)

```python
def redirect(short_url):
    long_url = get_long_url(short_url)
    
    # Track click asynchronously (Kafka)
    kafka.send('clicks', {
        'short_url': short_url,
        'ip': request.remote_addr,
        'referrer': request.referrer,
        'timestamp': time.time()
    })
    
    return redirect(long_url, 302)

# Analytics service (consumes Kafka)
def process_clicks():
    for message in kafka.consume('clicks'):
        db.insert('INSERT INTO analytics (short_url, ip, referrer, clicked_at) VALUES (?, ?, ?, ?)',
                  message['short_url'], message['ip'], message['referrer'], message['timestamp'])
```

---

## 🎯 Step 8: Deep Dive Topics

### **Custom Aliases**

**User wants**: `https://bit.ly/my-product` (instead of random `3x4k9Lm`)

**Implementation**:

```python
@app.route('/api/shorten', methods=['POST'])
def shorten():
    data = request.json
    long_url = data['long_url']
    custom_alias = data.get('custom_alias')
    
    if custom_alias:
        # Check if custom alias available
        if db.exists('SELECT 1 FROM urls WHERE short_url=?', custom_alias):
            return {'error': 'Alias already taken'}, 409
        
        short_url = custom_alias
    else:
        # Generate random short URL
        id = generate_id()
        short_url = base62_encode(id)
    
    db.insert('INSERT INTO urls (short_url, long_url) VALUES (?, ?)', short_url, long_url)
    return {'short_url': f'https://bit.ly/{short_url}'}
```

---

### **Expiration**

**Delete old URLs** (reduce storage)

```python
# Background job (runs daily)
def delete_expired_urls():
    db.execute('DELETE FROM urls WHERE expiry_date < NOW()')
```

---

### **Security**

**1. Malicious URLs**: Check against blacklist

```python
BLACKLIST = ['malware.com', 'phishing.com']

def is_malicious(long_url):
    for domain in BLACKLIST:
        if domain in long_url:
            return True
    return False

@app.route('/api/shorten', methods=['POST'])
def shorten():
    long_url = request.json['long_url']
    
    if is_malicious(long_url):
        return {'error': 'URL is blacklisted'}, 403
    
    # Create short URL...
```

**2. DDoS protection**: Rate limiting, CAPTCHA

---

## 🎯 Step 9: Trade-offs

| Decision | Trade-off |
|----------|-----------|
| **301 vs 302 redirect** | 301 (cached, faster) vs 302 (trackable, slower) |
| **Hash vs Base62** | Hash (collisions) vs Base62 (no collisions, needs ID) |
| **Database vs KGS** | Database (simple, bottleneck) vs KGS (fast, complex) |
| **Cache TTL** | Long TTL (stale data) vs Short TTL (more DB queries) |

---

## 🎯 Step 10: Real-World Examples

### **bit.ly**

- **Stack**: Python, Redis, PostgreSQL, Kafka
- **Scale**: 600+ million links/month, 9 billion clicks/month
- **Features**: Custom aliases, analytics, QR codes, API

### **TinyURL**

- **Stack**: PHP, MySQL
- **Scale**: 3 billion URLs created
- **Features**: Simple, no analytics, free

### **goo.gl** (Deprecated)

- **Stack**: Google infrastructure
- **Deprecated**: 2019 (Firebase Dynamic Links replaced it)

---

## 🎓 Interview Tips

**Q: "How do you generate short URLs?"**

A: "I use **Base62 encoding** with a distributed ID generator:

**Base62**: 0-9, a-z, A-Z (62 characters), length 7 = 62^7 = 3.5 trillion URLs

**ID generation**:
1. **Snowflake ID** (distributed, no coordination):
   - 64 bits: timestamp (41) | machine_id (10) | sequence (12)
   - Example: 1234567890123456789 → Base62 → 'aB3xK9m'

2. **Auto-increment** (simple, but bottleneck):
   - Database auto-increment: ID 123 → Base62 → '1Z'

3. **Key Generation Service** (pre-generated pool):
   - Pre-generate 1 billion short URLs, store in database
   - When user requests, fetch unused key from pool

**Why not hash (MD5)?**
- Collision risk (2 URLs → same hash)
- Need collision handling (slower)

**My choice**: Snowflake + Base62 (distributed, no collisions)"

---

**Q: "How do you handle high read traffic (100k/sec)?"**

A: "
1. **Caching** (Redis):
   - Cache long URLs (key: short_url, value: long_url)
   - 80% cache hit rate → Only 20k DB queries/sec
   - TTL: 1 day (balance freshness vs DB load)

2. **Database read replicas**:
   - Master: Writes (10k/sec)
   - Replicas: Reads (20k/sec cache misses)

3. **CDN** (optional):
   - Cache redirect responses (301 permanent)
   - Even faster (no API server hit)

4. **Sharding**:
   - Shard by first character of short URL
   - Distribute 1.5 trillion URLs across shards

**Result**: 100k reads/sec with <100ms latency"

---

## 📚 Summary

**Core design**: Base62 encoding + Snowflake ID + Redis cache + Database sharding

**API**: POST /api/shorten (create), GET /:short_url (redirect), GET /api/analytics/:short_url

**Optimizations**: Redis cache (80% hit rate), read replicas, async analytics (Kafka)

**Scale**: 10k writes/sec, 100k reads/sec, 1.5 trillion URLs over 5 years 🚀

