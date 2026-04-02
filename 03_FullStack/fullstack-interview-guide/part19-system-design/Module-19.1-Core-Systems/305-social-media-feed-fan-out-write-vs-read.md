# Social Media Feed — Fan-Out on Write vs Read
> Part 19 — System Design Case Studies · High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The fundamental problem**: when User A opens their feed, fetch only posts from people they follow, in reverse chronological order (or ranked by relevance), fast — < 200ms
- **Fan-out on write (push model)**: when User A posts, push a copy of the post ID to each follower's feed cache immediately; when followers open their feed → read directly from cache (fast read); trade-off: if A has 10M followers, that's 10M writes per post (write amplification)
- **Fan-out on read (pull model)**: when User A posts, just store the post; when followers open feed → query each followed user's posts and merge (fast write, expensive read); at scale, merging 500 followed users' posts for every feed load is too expensive
- **Hybrid model** (what Twitter/Facebook/Instagram do): fan-out on write for regular users (< 1M followers); fan-out on read + merge for celebrities; on feed load, merge the pre-built feed with celebrity posts at read time
- **Feed storage**: Redis Sorted Set per user — `feed:{userId}` → members = postIds, score = timestamp (Unix epoch); ZREVRANGEBYSCORE for latest first; ZREMRANGEBYRANK to trim feed to last 1000 posts
- **Ranking vs chronological**: purely chronological → use score = created_at; ranked → score = engagement algorithm output (likes × weight + recency × weight); recompute score async on engagement events
- **Pagination**: cursor-based (not offset-based) — cursor = last seen postId/score; ZREVRANGEBYSCORE with score < cursor; offset pagination drifts when new posts insert above
- **New post notification in feed**: update feed cache via Kafka consumer (fan-out worker); don't update synchronously in the post creation HTTP request
- **Cold start**: new user with no followers → serve "trending" or "recommended" posts based on interests; separate recommendation service

---

## 1. One-Line Definition
A social media feed system delivers a personalised, ordered list of posts from followed users by pre-computing each user's feed (fan-out on write) for fast reads, with a hybrid pull step for high-follower accounts, served from Redis Sorted Sets for sub-100ms latency.

---

## 2. The Problem It Solves

A developer builds a Twitter-like feed naively. Every time a user loads their feed, the system runs a SQL query: "SELECT * FROM posts WHERE user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) ORDER BY created_at DESC LIMIT 20." 

This works for users following 10 people. For users following 500 people, the IN clause has 500 user IDs. For 1 billion users loading their feed simultaneously at 08:00 AM, that's 1 billion complex SQL queries with a 500-row IN clause. The database falls over.

The feed system pattern solves this: compute the feed in advance (at write time), store it cheaply (Redis Sorted Set), serve it instantly (ZREVRANGE in O(log N + K)). The challenge is: who does the computation, when, and how do you handle celebrities without infinite write amplification?

---

## 3. How It Works Internally

### The Mental Model
Fan-out on write is like a post office delivering copies of a letter to every recipient's mailbox as soon as you drop it off. When you check your mailbox (open the app), everything is already there — instant. But if you send a letter to 10 million people, the post office needs 10 million delivery trucks immediately.

Fan-out on read is like a library — your letter is filed in a central location. When a reader wants it, they go to the library and look it up. Cheap to send, expensive to retrieve.

### Architecture

```
Post Creation
  │
  ▼
┌─────────────┐          ┌───────────────────────────────────────┐
│ Post Service │──Kafka──▶│  Fan-Out Service                      │
│  (writes     │          │                                       │
│  to posts DB)│          │  For each follower of post.userId:    │
└─────────────┘          │   if follower_count < 1M:             │
                          │     ZADD feed:{followerId} score postId │ ← push to cache
                          │   else (celebrity):                   │
                          │     skip — pull at read time          │
                          │                                       │
                          │  ZREMRANGEBYRANK feed:{id} 0 -1001    │ ← keep 1000 items
                          └───────────────────────────────────────┘

Feed Read (User opens app)
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ Feed Service                                                      │
│                                                                   │
│  1. ZREVRANGEBYSCORE feed:{userId} +inf cursor COUNT 20          │ ← Redis
│     (fast: pre-built feed, O(log N + 20))                        │
│                                                                   │
│  2. Fetch celebrity posts (users with > 1M followers that         │
│     userId follows): query posts from each celebrity's shard     │
│     in the last 48h (max 5–10 celebrities followed typically)    │
│                                                                   │
│  3. Merge and re-sort by score (chronological or ranked)         │
│                                                                   │
│  4. Hydrate: postIds → full post data via multi-get from Redis   │
│     post cache or post shard DB                                  │
└──────────────────────────────────────────────────────────────────┘

Storage layers:
  posts table (PostgreSQL sharded by userId):
    id, user_id, content, media_url, created_at, like_count, comment_count
    
  feed cache (Redis):
    feed:{userId} → Sorted Set {score: timestamp, member: postId}
    post:{postId} → Hash {id, userId, content, likeCount, preview}  ← 30 min TTL
    
  follows table:
    follower_id, following_id — used to look up follower list at fan-out time
    Cached in Redis SET follows:{userId} for fast lookup
```

---

## 4. The Code

### Wrong Way — SQL Feed On Every Load

```java
// ❌ Re-running expensive SQL on every feed request

@GetMapping("/feed")
public List<Post> getFeed(@RequestAttribute String userId,
                          @RequestParam(defaultValue = "0") int page) {
    
    // ❌ Query O(F) where F = number of people userId follows
    // ❌ IN clause with potentially 500 IDs — full table scan risk
    // ❌ No caching — every page load hits the database
    // ❌ OFFSET pagination: each page re-scans all previous rows
    List<String> followingIds = followsRepository.getFollowing(userId);
    
    return postRepository.findByUserIdInOrderByCreatedAtDesc(
        followingIds,
        PageRequest.of(page, 20)  // ❌ OFFSET-based: drifts when new posts insert
    );
}

// ❌ Synchronous fan-out inside post creation — blocks the user response
@PostMapping("/posts")
public Post createPost(@RequestAttribute String userId, @RequestBody CreatePostRequest req) {
    Post post = postRepository.save(new Post(userId, req.getContent()));
    
    // ❌ Fetching all followers inside the HTTP request thread
    List<String> followers = followsRepository.getFollowers(userId);
    
    // ❌ If userId has 1M followers: 1M Redis writes inside one HTTP request
    // ❌ User waits for this before getting their "post created" response
    for (String followerId : followers) {
        redisTemplate.opsForZSet().add("feed:" + followerId, post.getId(), 
                                       post.getCreatedAt().toEpochMilli());
    }
    
    return post;
}
```

```java
// ✅ Async fan-out via Kafka; Redis Sorted Set feed; cursor pagination

@RestController
@RequestMapping("/posts")
public class PostController {
    private final PostService postService;
    
    @PostMapping
    public ResponseEntity<PostCreatedResponse> createPost(
            @AuthenticationPrincipal UserDetails user,
            @RequestBody @Valid CreatePostRequest req) {
        
        // ✅ Persist post to DB synchronously (fast: single row insert)
        Post post = postService.create(user.getUsername(), req);
        
        // ✅ Fan-out happens asynchronously via Kafka — user gets response immediately
        return ResponseEntity.ok(new PostCreatedResponse(post.getId(), post.getCreatedAt()));
    }
}

@Service
public class PostService {
    private final PostRepository postRepository;
    private final KafkaTemplate<String, PostCreatedEvent> kafkaTemplate;
    
    public Post create(String userId, CreatePostRequest req) {
        Post post = postRepository.save(Post.builder()
            .id(Snowflake.nextId())
            .userId(userId)
            .content(sanitize(req.getContent()))
            .mediaUrl(req.getMediaUrl())
            .createdAt(Instant.now())
            .build());
        
        // ✅ Publish event — fan-out service handles asynchronously
        kafkaTemplate.send("post.created", userId,
            new PostCreatedEvent(post.getId(), userId, post.getCreatedAt().toEpochMilli()));
        
        return post;
    }
}

// ✅ Fan-out worker: push post to followers' feed caches
@KafkaListener(topics = "post.created", groupId = "feed-fanout", concurrency = "20")
@Service
public class FeedFanoutWorker {
    private final FollowService followService;
    private final StringRedisTemplate redis;
    private final CelebrityConfig celebConfig;   // threshold: 1M followers
    
    @KafkaHandler
    public void fanoutPost(PostCreatedEvent event) {
        // ✅ Skip fan-out for celebrity posts — handled at read time
        if (celebConfig.isCelebrity(event.getUserId())) {
            return;
        }
        
        // ✅ Fetch followers in batches of 1000 to avoid huge memory allocation
        followService.getFollowersBatched(event.getUserId(), 1000, followerId -> {
            // ✅ Add postId to follower's feed sorted set, score = timestamp
            redis.opsForZSet().add("feed:" + followerId, event.getPostId(), event.getTimestamp());
            
            // ✅ Trim feed to last 1000 posts per user (memory protection)
            redis.opsForZSet().removeRange("feed:" + followerId, 0, -1001);
        });
    }
}

// ✅ Feed read service with hybrid merge
@Service
public class FeedService {
    private final StringRedisTemplate redis;
    private final PostRepository postRepository;
    private final FollowService followService;
    private final CelebrityConfig celebConfig;
    
    public FeedPage getFeed(String userId, String cursor, int size) {
        // ✅ Cursor = last seen timestamp (or +inf for first page)
        double cursorScore = cursor != null
            ? Double.parseDouble(cursor)
            : Double.MAX_VALUE;
        
        // ✅ Read pre-built feed from Redis — O(log N + size)
        Set<ZSetOperations.TypedTuple<String>> feedItems = redis.opsForZSet()
            .reverseRangeByScoreWithScores("feed:" + userId, 
                                           Double.NEGATIVE_INFINITY, 
                                           cursorScore - 1,  // exclusive cursor
                                           0, size);
        
        List<String> regularPostIds = feedItems.stream()
            .map(ZSetOperations.TypedTuple::getValue)
            .collect(toList());
        
        // ✅ Hybrid: merge celebrity posts fetched at read time
        List<String> celebrities = followService.getCelebrityFollows(userId);
        List<Post> celebrityPosts = celebrities.isEmpty() 
            ? List.of()
            : postRepository.findCelebrityPostsSince(celebrities, cursorScore - 1, size);
        
        // ✅ Hydrate post IDs to full post objects via Redis multi-get or DB batch read
        List<Post> regularPosts = hydratePosts(regularPostIds);
        
        // ✅ Merge + sort by score (timestamp)
        List<Post> merged = Stream.concat(regularPosts.stream(), celebrityPosts.stream())
            .sorted(Comparator.comparing(Post::getCreatedAt).reversed())
            .limit(size)
            .collect(toList());
        
        // ✅ Next cursor = score of last post in this page
        double nextCursor = merged.isEmpty() ? 0 
            : merged.get(merged.size() - 1).getCreatedAt().toEpochMilli();
        
        return new FeedPage(merged, String.valueOf(nextCursor), !merged.isEmpty());
    }
    
    private List<Post> hydratePosts(List<String> postIds) {
        if (postIds.isEmpty()) return List.of();
        
        // ✅ Multi-get from Redis post cache first; fallback to DB for misses
        List<Object> cached = redis.opsForValue().multiGet(
            postIds.stream().map(id -> "post:" + id).collect(toList())
        );
        
        List<String> missedIds = new ArrayList<>();
        for (int i = 0; i < postIds.size(); i++) {
            if (cached.get(i) == null) missedIds.add(postIds.get(i));
        }
        
        if (!missedIds.isEmpty()) {
            postRepository.findAllById(missedIds)
                .forEach(post -> redis.opsForValue().set(
                    "post:" + post.getId(), serialize(post), Duration.ofMinutes(30)));
        }
        
        return postIds.stream()
            .map(id -> /* lookup from cached or DB result */ deserializePost(id))
            .filter(Objects::nonNull)
            .collect(toList());
    }
}
```

```typescript
// ✅ Frontend: infinite scroll feed with cursor pagination

function useFeed(userId: string) {
    const [posts, setPosts]         = useState<Post[]>([]);
    const [cursor, setCursor]       = useState<string | null>(null);
    const [hasMore, setHasMore]     = useState(true);
    const [loading, setLoading]     = useState(false);
    const observerRef               = useRef<IntersectionObserver | null>(null);
    const triggerRef                = useRef<HTMLDivElement | null>(null);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        
        try {
            const url = cursor
                ? `/api/feed?cursor=${cursor}&size=20`
                : `/api/feed?size=20`;
            
            const response = await fetch(url);
            const page: FeedPage = await response.json();
            
            setPosts(prev => {
                // ✅ Deduplicate by postId in case of cursor overlap
                const existingIds = new Set(prev.map(p => p.id));
                const newPosts = page.posts.filter(p => !existingIds.has(p.id));
                return [...prev, ...newPosts];
            });
            setCursor(page.nextCursor);
            setHasMore(page.hasMore);
        } finally {
            setLoading(false);
        }
    }, [cursor, hasMore, loading]);

    // ✅ IntersectionObserver triggers load when sentinel div enters viewport
    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            entries => { if (entries[0].isIntersecting) loadMore(); },
            { threshold: 0.1 }
        );
        if (triggerRef.current) observerRef.current.observe(triggerRef.current);
        return () => observerRef.current?.disconnect();
    }, [loadMore]);

    // ✅ Initial load
    useEffect(() => { loadMore(); }, []);

    return { posts, loading, hasMore, triggerRef };
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the 'celebrity problem' in a social media feed?"

**Hruday's answer:**
> When a user with 50 million followers posts something, fan-out on write means writing that post's ID to 50 million followers' feed caches simultaneously. At even 1 millisecond per write that's 50,000 seconds of work — clearly infeasible in real-time, and it would saturate Redis write capacity for minutes.
>
> The celebrity problem is the asymmetry: regular users have a few hundred to a few thousand followers; celebrities have millions. Fan-out on write works fine for regular users. For celebrities, you switch to fan-out on read.
>
> In practice: define a threshold — say, 1 million followers. Under the threshold: fan-out on write when they post. Over the threshold: no fan-out. When their follower opens a feed, the server detects they follow this celebrity and queries that celebrity's latest posts at read time, then merges into the pre-built feed. The follower sees one unified feed with no visible difference. The server does a bit more work at read time (5–10 extra queries if following 5–10 celebrities) but avoids catastrophic write amplification.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you rank a feed beyond just reverse chronological order?"

**Hruday's answer:**
> You replace the score in the Redis Sorted Set with an engagement-weighted score rather than a pure timestamp.
>
> A simple ranking formula: score = (likes × 1.5 + comments × 2 + shares × 3) × decay. The decay factor reduces score over time — a post that gets 100 likes today is ranked higher than a post from last week with 100 likes. The decay is typically exponential: score = base_score × e^(-λt) where t is hours since posting.
>
> The feed cache stores these computed scores, not timestamps. When a post gets a like, an async worker updates the post's score and does ZADD with the new score to all followers' feed caches that still hold this post. This is expensive: a post with 10K likes has its score updated 10K times, each requiring ZADD in all followers' caches.
>
> At scale (Instagram, Facebook), moving to a dedicated ML ranking service is more practical: at feed load time, fetch 200 candidate posts from the chronological feed, pass them to an ML scorer that predicts engagement probability, return the top 20 ranked. This way the feed cache stays chronological (simpler to maintain), and ranking happens as a separate step at read time. The ML model is the differentiating moat — the infrastructure plumbing is the same.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Why cursor pagination and not offset pagination for the feed?"

**Hruday's answer:**
> Offset pagination is "skip 20 rows, take the next 20." Page 2 is `OFFSET 20 LIMIT 20`. This has two problems.
>
> First: new posts. The feed is live — while a user is scrolling, new posts appear at the top. Page 1 had posts [100, 99, 98…81]. They scroll to page 2: offset 20. But 3 new posts appeared since page 1 load. Now offset 20 starts at post 97 again — the user sees posts they already saw. Duplicate items.
>
> Second: performance. `OFFSET 20000 LIMIT 20` on a database means scanning and discarding 20,000 rows before returning 20. For a user who's scrolled deep, this gets slower with every page. Redis `ZREVRANGEBYSCORE` with a cursor score is O(log N + K) regardless of how many pages in — always fast.
>
> Cursor pagination: cursor is the score (timestamp or engagement score) of the last item seen. Next page: "give me items with score less than cursor." No drift because you're anchored to a specific score, not a position number. No performance degradation. The only downside: users can't jump to "page 10" — but social feeds don't need that. Infinite scroll is always sequential.

---

### Q4 — System Design Angle
**Interviewer asks:** "How does the feed know about new posts in near real-time without polling?"

**Hruday's answer:**
> Two mechanisms: WebSocket/SSE push for connected users, and efficient cache design for feed freshness.
>
> When a user is actively using the app (tab open), the frontend maintains a WebSocket or SSE connection. The fan-out worker, after updating a follower's Redis feed cache, publishes an event to Redis Pub/Sub on channel `feed:new:followerId`. The user's server (which holds their WebSocket connection) is subscribed to this channel and pushes a "new post" event to the frontend. The React app can show "3 new posts — tap to refresh" indicator. When tapped, it loads from the top of the feed cache.
>
> For users returning after being offline (not actively connected), the feed cache in Redis was updated during their absence — feeds get pre-filled passively. When they open the app, the first page fetch hits Redis and immediately returns all new posts accumulated since their last visit. No polling required; the data was written during fan-out.
>
> The only edge case: if a user hasn't used the app in 7 days, their feed cache might have expired in Redis (TTL). On that scenario, the feed service falls back to a direct DB query to rebuild the first page, and schedules a background job to warm the cache. This is the "cold feed" path — slower first load, then Redis takes over.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Fan-out on write for all users" | "Push to every follower's feed cache on post creation — simple and fast reads" | Always triggers the celebrity problem question; missing the celebrity threshold reveals incomplete system thinking; the correct answer is: fan-out on write for regular users, hybrid pull for accounts above the threshold (typically 1M followers); also missing: what happens if the user posting has 10M followers and the fan-out takes 3 minutes — do followers not see the post for 3 minutes? need to bound fan-out latency with the hybrid fallback |
| "Use offset pagination" | "Load 20 posts, next page is offset 20, then 40…" | Immediately reveals unfamiliarity with live feed systems; offset pagination suffers from duplicate/missing items when new posts arrive; offset + large page number also requires scanning discarded rows in DB; cursor pagination is standard for all modern social feeds; naming the problem (position drift with live data) and the solution (score-based cursor anchoring) shows depth |
| "Store ranked score in Redis at fan-out" | "When fanning out, compute the engagement score and store that as the Redis score" | This creates a write amplification cascade: every new like re-scores the post in every follower's cache; for a post liked by 100K people followed by 1K users each, that's 100M Redis ZADD operations; better: store timestamp as score at fan-out time (cheap, static); at read time, fetch 200 candidates and pass through a ranking layer (ML model or simple formula) before returning 20 to the client; separate feed retrieval from ranking |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we built an activity feed for a project management product — team members could see everyone's activity (task updates, comments, file uploads). We started with a SQL query on every page load — SELECT activities WHERE user_id IN (list of teammates). With 50 users per team this was tolerable. But a large customer had 3,000 users on one team account. The IN clause had 3,000 IDs. The feed took 12 seconds to load.
>
> We switched to event-driven fan-out: on any activity event (Kafka `activity.created` topic), a worker pushed the activity ID to each team member's Redis Sorted Set with the timestamp as score. Feed reads became a ZREVRANGE on Redis — 5ms. We kept the UI sorted by timestamp since team tools don't need engagement ranking, keeping the implementation simple. The fan-out for large teams ran in the background; users saw new activity within 2 seconds of it being created."

---

## 8. Scale Evolution

**1,000 users →** Direct SQL query for feed. `SELECT * FROM posts WHERE user_id IN (following_ids) ORDER BY created_at DESC LIMIT 20`. Index on `(user_id, created_at)`. Add Redis cache for frequently-viewed feeds. No Kafka needed.

**100,000 users →** Fan-out on write via async Spring `@Async` worker (or basic Kafka). Redis Sorted Set per user for feed cache. Cursor pagination. Basic celebrity detection (threshold: 10K followers). Post hydration from Redis cache.

**10 million users →** Kafka with 20 fan-out partitions. Redis Cluster sharded by userId. Celebrity threshold at 1M followers with hybrid read. ML ranking service consuming top 200 candidates. Feed cache with 7-day TTL; cold start builder job. WebSocket push for real-time new post indicator. CDN for post media. Read replicas for post metadata DB.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant activity feed (transactions, settlements, disputes); business dashboard showing recent payment events; same fan-out design at smaller scale | Fan-out concepts; Redis Sorted Set; event-driven design |
| Swiggy / Meesho | Seller dashboard activity feed on Meesho; delivery partner app showing order queue (a feed variant); customer order history as a personal activity feed | Real-time order events; cursor pagination for infinite scroll |
| Adobe / Microsoft | LinkedIn-style enterprise feed for Microsoft; Adobe Stock contributor feed showing license events; social features in Office 365 | Large-scale fan-out; celebrity problem at enterprise scale |
| SAP Labs | Activity feed for SAP project management — the real story above; team activity notifications; 3000-user team breaking SQL performance | Real incident narrative; SQL → Redis Sorted Set migration |

---

## 10. Related Topics — What to Study Next

- **Topic 303 — Notification System** — fan-out for feeds and notifications are closely related; both use Kafka fan-out workers; the notification system is the "push to device" layer while the feed is the "read from cache" layer; they complement each other in social apps
- **Topic 313 — Infinite Scroll Feed (Frontend)** — the frontend design for infinite scroll (IntersectionObserver, cursor pagination, optimistic updates, virtual list) is the client-side counterpart to the feed backend designed here
- **Topic 101 — Redis Data Structures** — Redis Sorted Set is the core feed storage structure; understanding ZADD, ZREVRANGEBYSCORE, ZREMRANGEBYRANK, and ZSet memory sizing is essential for this topic
- **Topic 99 — Kafka Fundamentals** — the fan-out workers run off Kafka `post.created` events; partition count, consumer group, and at-least-once guarantees all apply here

---

*Part 19 · Social Media Feed — Fan-Out on Write vs Read · Full Stack Interview Guide · Hruday D · 2026*
