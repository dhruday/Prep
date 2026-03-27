# URL Shortener — Hashing, Redirects, Analytics
> Part 19 — System Design Case Studies · 🔥 High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Core function**: accept a long URL, return a short 6–8 character alias; on short URL hit, HTTP 301/302 redirect to long URL
- **Hash vs counter**: MD5/SHA256 of URL + base62 encode first 6 chars → collision risk; counter-based (auto-increment ID encoded in base62) → no collisions, predictable, but exposes sequence; most production systems use both (try hash first, fallback to counter on collision)
- **Base62**: 62 chars (a-z A-Z 0-9); 6 chars = 62^6 = ~56 billion URLs; 8 chars = 218 trillion — pick based on expected volume
- **301 vs 302**: 301 = Permanent (browser caches, no analytics on repeat hits); 302 = Temporary (hits your server every time, full analytics but more load); use 302 for analytics-heavy products (bitly, Razorpay payment links)
- **Read heavy**: 100:1 read-to-write ratio typical; massive cache layer (Redis) for hot URLs; write once, read many — cache-aside pattern with TTL
- **Custom aliases**: user-defined slugs (e.g., `sap.to/ceo-letter`) stored separately in same table; always check alias availability before allowing
- **Expiry**: store `expires_at` nullable; background job (Spring `@Scheduled`) sweeps expired rows and evicts from cache
- **Analytics**: on each redirect intercept user agent, referrer, IP → publish `ClickEvent` to Kafka → analytics consumer aggregates into time-series store (InfluxDB/ClickHouse)

---

## 1. One-Line Definition
A URL shortener maps a long URL to a short alias, stores that mapping persistently, redirects users to the original URL on alias access, and optionally tracks click analytics per redirect.

---

## 2. The Problem It Solves

Twitter in 2010 had a 140-character limit. A single URL often consumed 80+ characters. Users couldn't share links without eating their whole post. URL shorteners solved this: compress `https://www.amazon.com/product/B09XLKF7JC?ref=nav_deals_bestseller&tag=affiliate001` to `amzn.to/3Px1abc`.

Payment companies like Razorpay generate short payment links: `rzp.me/pay/123abc`. These links are shared over WhatsApp, SMS, and email where long URLs break or look untrusted. They also need click tracking — did the customer open the link? From which device?

The naive solution (store full URL, look it up on every hit) doesn't scale. When 50 million SMS links go out at once (think Flipkart sale day), the lookup system must handle millions of redirects per second with sub-5ms latency. That requires distributed caching, efficient storage, and a carefully designed write path.

---

## 3. How It Works Internally

### The Mental Model
Think of it like a phone book but in reverse — you give a phone number (short code), it tells you the person's address (long URL). The book itself (database) stores all mappings. A cache (Redis) keeps the most-called phone numbers in memory so you don't look up the book every time.

### Mechanism — Step by Step

**Write path (shorten a URL):**
```
1. Client sends POST /shorten { longUrl, customAlias?, expiresAt? }
2. Validate longUrl format (regex, max length 2048)
3. Check if longUrl already has a short code (dedup lookup in DB)
    - if yes: return existing short code
    - if no: continue
4. Generate short code:
    a. Try hash-based: base62(md5(longUrl)[0:6])
    b. Check code doesn't exist in DB
    c. Collision? Append salt and retry, or fall through to counter
    d. Fall through: counter = DB auto-increment ID → base62(counter)
5. Store: INSERT INTO urls (code, long_url, user_id, created_at, expires_at)
6. Cache: Redis SET short:code longUrl EX 86400
7. Return { shortUrl: "https://s.ly/code" }
```

**Read path (redirect):**
```
1. GET /code hits load balancer
2. App server checks Redis: GET short:code
    - Cache hit: 302 redirect immediately (< 2ms)
    - Cache miss: SELECT long_url FROM urls WHERE code = ? AND (expires_at IS NULL OR expires_at > NOW())
        - Found: cache it, 302 redirect
        - Not found / expired: 404
3. Publish to Kafka: { code, timestamp, ip, userAgent, referer }
4. Analytics consumer processes Kafka events async
```

### ASCII Diagram

```
Client
  │
  ▼
Load Balancer (AWS ALB / Nginx)
  │
  ▼
App Server Cluster (Spring Boot)
  │          │
  ▼          ▼
Redis     PostgreSQL
(cache)   (primary store)
  
Analytics Path:
App Server ──Kafka──► Analytics Consumer ──► ClickHouse / InfluxDB
                                          ──► Grafana dashboard
```

---

## 4. The Code

### Wrong Way — Everything in One Method, No Cache

```java
// ❌ No cache, no dedup, blocking analytics, predictable sequential IDs exposed

@RestController
class UrlShortenerController {
    
    @Autowired
    private UrlRepository repo;
    
    @PostMapping("/shorten")
    public String shorten(@RequestBody String longUrl) {
        // ❌ Auto-increment ID exposed directly — attacker can enumerate all URLs
        long id = repo.count() + 1;   // ❌ race condition: two threads get same count
        String code = Long.toString(id);  // ❌ not base62, predictable sequential codes
        repo.save(new UrlMapping(code, longUrl));
        return "https://s.ly/" + code;
    }
    
    @GetMapping("/{code}")
    public ResponseEntity<Void> redirect(@PathVariable String code,
                                         HttpServletRequest request) {
        // ❌ DB hit on EVERY redirect — no cache — 10ms+ per request at scale
        UrlMapping mapping = repo.findByCode(code)
            .orElseThrow(() -> new RuntimeException("Not found"));
        
        // ❌ Synchronous analytics write — blocks the redirect response
        analyticsRepo.save(new ClickEvent(code, request.getRemoteAddr()));
        
        return ResponseEntity.status(302)
            .header("Location", mapping.getLongUrl())
            .build();
        // ❌ Using 301 here would break analytics — browsers cache and never come back
    }
}
```

```java
// ✅ Production-quality URL shortener service

@Service
public class UrlShortenerService {
    private final UrlRepository urls;
    private final StringRedisTemplate redis;
    private final ApplicationEventPublisher events;
    private final Base62Encoder encoder;
    
    private static final String CACHE_PREFIX = "url:short:";
    private static final long CACHE_TTL_SECONDS = 86_400; // 24h
    
    @Transactional
    public ShortUrlResponse shorten(ShortenRequest request) {
        validateUrl(request.getLongUrl());
        
        // ✅ Dedup: if we already shortened this URL, return existing code
        Optional<UrlMapping> existing = urls.findByLongUrl(request.getLongUrl());
        if (existing.isPresent() && !isExpired(existing.get())) {
            return ShortUrlResponse.of(existing.get());
        }
        
        // ✅ Custom alias: check availability
        String code = resolveCode(request);
        
        UrlMapping mapping = UrlMapping.builder()
            .code(code)
            .longUrl(request.getLongUrl())
            .userId(request.getUserId())
            .createdAt(Instant.now())
            .expiresAt(request.getExpiresAt())  // nullable
            .build();
        
        urls.save(mapping);
        
        // ✅ Pre-warm cache immediately after write
        redis.opsForValue().set(
            CACHE_PREFIX + code,
            request.getLongUrl(),
            Duration.ofSeconds(CACHE_TTL_SECONDS)
        );
        
        return ShortUrlResponse.of(mapping);
    }
    
    private String resolveCode(ShortenRequest request) {
        if (request.getCustomAlias() != null) {
            String alias = request.getCustomAlias().toLowerCase();
            if (urls.existsByCode(alias)) {
                throw new AliasAlreadyTakenException(alias);
            }
            return alias;
        }
        return generateUniqueCode(request.getLongUrl());
    }
    
    private String generateUniqueCode(String longUrl) {
        // ✅ Hash-based: deterministic, no collision in most cases
        String hash = DigestUtils.md5DigestAsHex(longUrl.getBytes(StandardCharsets.UTF_8));
        String candidate = hash.substring(0, 6);  // 6 chars of MD5 hex → encode
        String code = encoder.encode(candidate);
        
        // ✅ Collision resolution: try up to 5 salted variants before counter fallback
        int attempt = 0;
        while (urls.existsByCode(code) && attempt < 5) {
            code = encoder.encode(hash.substring(attempt, attempt + 6));
            attempt++;
        }
        
        if (urls.existsByCode(code)) {
            // Counter fallback: guaranteed unique, slightly predictable
            // Mitigate enumeration by starting counter at random offset
            code = encoder.encode(urls.nextSequenceId());
        }
        return code;
    }
}

@RestController
@RequestMapping("/api/v1")
public class RedirectController {
    private final StringRedisTemplate redis;
    private final UrlRepository urls;
    private final ApplicationEventPublisher events;
    
    private static final String CACHE_PREFIX = "url:short:";
    
    // ✅ Separate controller for redirect — different threading/scaling concerns
    @GetMapping("/{code}")
    public ResponseEntity<Void> redirect(@PathVariable @Pattern(regexp = "[a-zA-Z0-9]{4,12}") String code,
                                         HttpServletRequest request) {
        // ✅ Cache-first: typical hit rate 95%+ for popular URLs
        String longUrl = redis.opsForValue().get(CACHE_PREFIX + code);
        
        if (longUrl == null) {
            // Cache miss — DB lookup
            UrlMapping mapping = urls.findByCodeNotExpired(code, Instant.now())
                .orElseThrow(() -> new UrlNotFoundException(code));
            longUrl = mapping.getLongUrl();
            // Re-warm cache
            redis.opsForValue().set(CACHE_PREFIX + code, longUrl,
                Duration.ofSeconds(86_400));
        }
        
        // ✅ Publish analytics async — does NOT block the redirect
        events.publishEvent(new ClickEvent(code, request));
        
        // ✅ 302 (not 301): server sees every hit → full analytics
        return ResponseEntity.status(HttpStatus.FOUND)
            .header(HttpHeaders.LOCATION, longUrl)
            .build();
    }
}

// ✅ Async click analytics handler
@Component
class ClickAnalyticsHandler {
    private final KafkaTemplate<String, ClickEvent> kafka;
    
    @Async
    @EventListener
    public void handle(ClickEvent event) {
        // Fire to Kafka; analytics consumer processes separately
        kafka.send("url-clicks", event.getCode(), event);
    }
}
```

```yaml
# application.yml — Redis and DB config
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: 6379
      timeout: 1000ms          # fail fast — don't let Redis slowness block redirects

  datasource:
    url: jdbc:postgresql://${DB_HOST}/urlshortener
    hikari:
      maximum-pool-size: 20    # tune based on redirect QPS
      connection-timeout: 3000 # 3s max wait for connection

url-shortener:
  base-url: https://s.ly
  max-alias-length: 20
  default-ttl-days: 365
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How would you generate unique short codes without collisions?"

**Hruday's answer:**
> I'd use a two-tier approach. First, hash-based: take MD5 of the long URL, base62-encode the first 6 characters. This is deterministic — the same URL always hashes to the same code, which handles deduplication naturally. Collision probability with 6 chars from a 62-char alphabet is about 1 in 56 billion.
>
> For the rare collision, I retry with a different 6-char window of the hash — up to 5 attempts. If all 5 collide (effectively impossible in practice but we code defensively), fall back to a counter: the database auto-increment ID encoded in base62. This is always unique.
>
> The counter approach alone is simpler but exposes something: sequential codes let anyone enumerate all URLs by incrementing. To mitigate this, start the counter at a random large offset (say, 1 million) and don't advertise the sequence. For high-security use cases (one-time payment links), XOR the counter with a secret before encoding.

---

### Q2 — Deep Dive
**Interviewer asks:** "Your redirect endpoint handles 100,000 RPS. Redis goes down. What happens?"

**Hruday's answer:**
> Without a fallback, 100% of redirects hit the database — PostgreSQL will buckle immediately at that load.
>
> My approach: Redis with a local in-process cache as L1. I use Caffeine (Guava's successor) as an in-memory LRU cache on each app node — capacity 50,000 entries, 5-minute TTL. hit order is: L1 Caffeine → L2 Redis → L3 PostgreSQL.
>
> When Redis goes down: L1 absorbs the hot URLs (typically top 5% URLs drive 95% of traffic). L3 database handles the cold cache misses. Database needs connection pool headroom for this scenario — set HikariCP max-pool-size to handle surge.
>
> Optionally: configure Resilience4j circuit breaker on the Redis call. When Redis fails, it opens the circuit after 5 consecutive failures and routes straight to the local cache + DB path, without waiting for each Redis timeout. Redirects keep working; analytics events are queued in memory with a bounded queue — no data loss for hot URLs.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "301 vs 302 redirect — which would you use and why?"

**Hruday's answer:**
> 302 Temporary Redirect for most production URL shorteners, especially analytics-heavy ones.
>
> 301 Permanent means browsers cache the redirect after the first hit. Every subsequent visit from that browser goes directly to the destination — your server never sees the request. Zero analytics data for repeat visitors. You also lose the ability to update the long URL behind a short code (which some products need for editing campaigns).
>
> 302 means the browser always checks the server. Every hit registers in your analytics. You can update the mapping if the long URL changes. The cost is server load — but with Redis caching, a cache hit is 2ms and you barely feel the difference per request.
>
> The one case for 301: pure URL shortening for personal use with no analytics, or when SEO matters (search engines follow 301s and transfer page rank to the destination). Bitly uses 301 as an option for transparency. Razorpay payment links always use 302 — every click is a billing or conversion event.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the analytics for 1 billion clicks per day."

**Hruday's answer:**
> At 1 billion clicks per day, that's about 11,600 clicks per second average, with spikes 10x higher. Writing each click to a relational DB is unworkable.
>
> My design: on each redirect, publish a lightweight event to Kafka — just the short code, timestamp, IP hash (not raw IP — privacy), user agent string, and referrer. Kafka handles 10M+ events/sec, so this is fine.
>
> Kafka consumer aggregates events into a time-series database — ClickHouse works well here, handles hundreds of millions of rows with fast analytical queries. I store pre-aggregated hourly and daily rollups for common queries (clicks per URL, by country, by device type). Raw events sit in ClickHouse for up to 90 days for detailed drill-down.
>
> The frontend dashboard queries ClickHouse with a REST API on the reporting service. For real-time (last 5 minutes), query the Kafka consumer's in-memory aggregation endpoint or a Redis HyperLogLog counter (`PFADD clicks:code`).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| MD5 is enough, no collision handling | "I'll just use MD5 of the URL and take the first 6 characters — collision probability is low" | Collision probability is about 1 in 56 billion which sounds safe, but with 10 billion existing URLs (~TinyURL scale), the birthday paradox makes collision probability non-negligible; always implement collision resolution — retry with different hash window, fall back to counter; also, two different users sharing the same link get the same short code — which is usually fine (dedup benefit) but must be a deliberate decision, not an accident |
| 301 for everything | "I'd use 301 because it reduces server load" | 301 eliminates analytics for repeat visitors and prevents updating destination URLs; most production shorteners choose 302 precisely because analytics and flexibility are more valuable than the marginal server load saving (which Redis eliminates anyway); only choose 301 when: SEO link equity transfer is needed, product ownership of the short domain is confident, and analytics for repeat visits are explicitly not required |
| Single region, no DR | "One PostgreSQL and one Redis is enough" | The database is the single source of truth; if it goes down, redirects fail; use PostgreSQL with a read replica; redirect reads can go to the replica (slightly stale is fine for URL lookups); writes (new shortenings) go to primary; Redis cluster or Redis Sentinel for HA; for global products, use geographically distributed caches (CloudFlare Workers KV or regional Redis) so that a user in Singapore doesn't wait for a cache miss to resolve in Mumbai |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we built short URLs for internal newsletter campaigns — clicking a feature announcement link had to track whether engineers in each region actually opened the notification. We hit exactly the 302 vs analytics question. Initially someone used 301 'for performance.' Two campaigns in, we noticed zero analytics for repeat clicks — anyone who had visited once showed 0 click-throughs on repeat campaigns. Switch to 302 immediately recovered full analytics.
>
> For the caching layer, we used a local Caffeine cache on each instance (500 entries, 10-minute TTL) in front of Redis. During a Redis maintenance window, the local cache absorbed 90% of traffic and only 10% hit the database — the system stayed up without any incident during the window."

---

## 8. Scale Evolution

**1,000 users →** Single Spring Boot app + PostgreSQL. No Redis needed. All in one server. Generate codes with counter-based base62. Simple works.

**100,000 users →** Redis cache layer essential (100ms DB → 2ms cache). Read replicas for PostgreSQL. 302 redirects with async Kafka analytics. Horizontal scaling of app servers behind a load balancer.

**10 million users →** Distributed Redis cluster (Redis Cluster with 3 shards). ClickHouse for analytics at 1B+ clicks/day. Multi-region caching (CloudFlare Workers or regional Redis) for global low-latency redirects. Counter-based IDs generated via distributed counter service (Redis INCR is atomic) to prevent collisions across app server cluster. Separate read and write services (CQRS-lite): write service handles URL creation, read service handles redirects — independent scaling.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment links are URL shorteners — short URL per payment, 302 for every-click analytics, custom aliases for merchants, expiry for timed payment windows | Analytics accuracy (302 vs 301); expiry and custom alias design |
| Swiggy / Meesho | Referral links, campaign tracking, QR code generation for restaurant menus — all URL shortening variants; high-volume Meesho seller share links | High-volume read path; Kafka analytics fan-out |
| Adobe / Microsoft | SaaS product deep links — short URLs for sharing reports and documents; enterprise audit requirement = every redirect must be logged | Compliance audit log; TTL and expiry design |
| SAP Labs | Internal campaign tracking (newsletter click-through analytics); the 302 vs 301 story from real experience; Caffeine + Redis two-level cache during scheduled maintenance | Real-world experience anchor; multi-level cache design |

---

## 10. Related Topics — What to Study Next

- **Topic 102 — Redis as Cache (TTL, eviction policies)** — the entire redirect hot path depends on Redis; understanding cache eviction and TTL is essential to avoid serving expired short codes or running out of Redis memory
- **Topic 128 — Pagination (cursor-based vs offset)** — the analytics query endpoint (list all clicks for a URL, sorted by time) is a classic cursor-based pagination problem at scale; offset pagination breaks at 10M+ rows
- **Topic 135 — Rate Limiting** — the shorten endpoint must be rate-limited; without it, a bot generates 10 billion URLs and fills storage; token bucket per IP/user ID protects the write path
- **Topic 107 — Kafka Topics, Partitions, Consumer Groups** — the analytics event pipeline uses Kafka; partition by short code to ensure all clicks for one URL are ordered and aggregated by one consumer
- **Topic 302 (next) — Rate Limiter System Design** — rate limiting is a follow-up design question that often comes right after URL shortener in interviews; designing both shows breadth in a single session

---

*Part 19 · URL Shortener — Hashing, Redirects, Analytics · Full Stack Interview Guide · Hruday D · 2026*
