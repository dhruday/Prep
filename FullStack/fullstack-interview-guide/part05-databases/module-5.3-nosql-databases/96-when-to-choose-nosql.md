# When to Choose NoSQL Over SQL
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- NoSQL does NOT mean "no SQL syntax." It means "Not Only SQL" — a family of databases designed for specific data models and access patterns where relational databases (with their ACID transactions, rigid schemas, and join-based querying) are a poor fit.
- Four NoSQL categories: document stores (MongoDB, Couchbase — store JSON documents), key-value stores (Redis, DynamoDB — get/set by key), columnar/wide-column stores (Cassandra, HBase — partition key → column families), graph databases (Neo4j, Amazon Neptune — nodes and edges for relationship-heavy data).
- Choose NoSQL when: (1) schema is dynamic and evolves frequently (different document shapes per entity), (2) the access pattern is always by a single key — never complex joins or aggregations, (3) you need horizontal write scaling beyond what a single relational DB can handle, (4) you specifically need a data model the relational model handles badly (graphs, time-series, vectors).
- Keep SQL when: (1) data has complex relationships and you need JOINs, (2) you need multi-row ACID transactions, (3) you need ad-hoc queries (analytics, reporting), (4) your team is more experienced with SQL (operational simplicity matters).
- CAP theorem (simplified): in a network partition (when nodes can't communicate), you must choose between Consistency (all nodes return the same data) or Availability (nodes always respond, possibly with stale data). Most NoSQL databases choose AP (available, eventually consistent). Most RDBMS choose CP.
- The common interview mistake: choosing NoSQL because "SQL doesn't scale." Postgres scales to billions of rows with good design. NoSQL is not a scaling silver bullet — it's a tool for specific data model and access pattern requirements.
- Gap to bridge: candidates say "use NoSQL for large data" without explaining which type, why the data model fits, or what consistency trade-offs they're accepting

---

## 1. One-Line Definition
NoSQL databases are purpose-built data stores optimised for specific data models (documents, key-value, wide-column, graph) and access patterns where the relational model's schema rigidity, join-based querying, and single-machine vertical scaling are limiting factors.

---

## 2. The Problem It Solves

```
SCENARIO 1: Product catalogue where every product type has different attributes.

Relational approach:
  products table: id, name, price, category_id
  electronics_attributes table: id, product_id, battery_life, screen_size, ...
  clothing_attributes table: id, product_id, size, material, care_instructions, ...
  books_attributes table: id, product_id, isbn, author_id, pages, language, ...
  
  5 different product types = 5 different attribute tables.
  Adding a new product type: schema migration, new table, new JOIN.
  A query for "all product attributes": complex UNION query across 5 tables.
  
Document store approach (MongoDB):
  {
    "_id": "P-001",
    "name": "iPhone 15",
    "price": 79900,
    "category": "ELECTRONICS",
    "battery_life_hours": 18,
    "screen_size_inches": 6.1,
    "5g_capable": true
  }
  {
    "_id": "P-002",
    "name": "Running Shoes",
    "price": 5999,
    "category": "FOOTWEAR",
    "sizes_available": ["UK7", "UK8", "UK9", "UK10"],
    "material": "mesh",
    "colour": "blue"
  }
  
  No schema to migrate. New product type = just start using new fields.
  Read: single document fetch by _id. No JOINs needed.
  
SCENARIO 2: User session data. 100 million users. Each session is unique data
  that only one user accesses. Access pattern: always by session_id key.
  
  NoSQL key-value (Redis): SET session:abc123 <json_blob> EX 3600
  → Sub-millisecond read/write. 100M sessions distributed across Redis cluster.
  → Relational DB: overkill for purely key-based access, can't horizontally scale writes easily.

SCENARIO 3: Fraud detection — analyse relationships between transactions, accounts,
  devices, IP addresses. "Is this device connected to known fraud accounts?"
  
  In SQL: 5-level JOIN query. Complex. Slow. Hard to express path traversal.
  In Neo4j graph database: MATCH (device)-[:USED_BY]->(account)-[:FLAGGED_FOR]->(fraud)
  RETURN account LIMIT 10 — natural, fast traversal of relationships.
```

---

## 3. How It Works Internally

### The Four NoSQL Types

```
1. DOCUMENT STORES (MongoDB, Couchbase, DynamoDB in document mode)
   
   Data model: JSON/BSON documents. Nested objects and arrays are first-class.
   
   {
     "order_id": "ORD-001",
     "customer": { "id": "C-1", "name": "Alice" },    ← embedded doc
     "items": [                                         ← embedded array
       { "product_id": "P-1", "qty": 2, "price": 599 },
       { "product_id": "P-2", "qty": 1, "price": 999 }
     ],
     "total": 2197,
     "status": "SHIPPED"
   }
   
   Best for: entities with variable schema, nested data that's always read together,
             content management, catalogues, user profiles.
   
   NOT for: queries needing JOINs across documents at query time (expensive),
            multi-document ACID transactions (MongoDB 4+ supports, but limited).

2. KEY-VALUE (Redis, DynamoDB, Riak)
   
   Data model: a distributed hash map. get(key) → value. set(key, value, TTL).
   
   Redis keys:
     user:sessions:{session_id} → JSON blob
     product:cache:{product_id} → serialised product
     rate_limit:{user_id}:{window} → counter
     leaderboard → sorted set of (user_id, score)
   
   Best for: caching, sessions, rate limiting, real-time counters, pub/sub.
   NOT for: queries on field values (no filtering by field inside the value),
            complex aggregations, relational data.

3. WIDE-COLUMN / COLUMNAR (Cassandra, HBase, DynamoDB in table mode)
   
   Data model: rows identified by a PARTITION KEY. Within a partition, rows are
   ordered by a CLUSTER KEY. Columns can be sparse.
   
   Cassandra example — time-series IoT sensor data:
   
   CREATE TABLE sensor_readings (
     sensor_id  UUID,
     reading_ts TIMESTAMP,
     value      DOUBLE,
     unit       TEXT,
     PRIMARY KEY (sensor_id, reading_ts)  ← sensor_id = partition, reading_ts = cluster
   ) WITH CLUSTERING ORDER BY (reading_ts DESC);
   
   Query: SELECT * FROM sensor_readings WHERE sensor_id=? AND reading_ts > ?
   → All within one partition (sensor_id) — single-node lookup. Very fast.
   → Write throughput scales by adding nodes. No single-node write bottleneck.
   
   NOT for: cross-partition queries ("all sensors above a threshold"), JOINs,
            updates without knowing the partition key.

4. GRAPH DATABASES (Neo4j, Amazon Neptune, TigerGraph)
   
   Data model: nodes (entities) and edges (relationships), both with properties.
   
   (User {name: "Alice"}) -[:PURCHASED]-> (Product {name: "iPhone"})
   (User {name: "Alice"}) -[:FRIEND_WITH]-> (User {name: "Bob"})
   
   Query: Who are Alice's friends who have also purchased iPhone?
   MATCH (alice:User {name: 'Alice'})-[:FRIEND_WITH]->(friend)-[:PURCHASED]->(p:Product {name:'iPhone'})
   RETURN friend.name
   
   → Natural traversal. In SQL: 3-level JOIN that's hard to optimise for deep traversal.
   
   Best for: social networks, fraud detection (connected entities), knowledge graphs,
             recommendation engines based on relationships.
```

### CAP Theorem — The Consistency vs Availability Trade-off

```
When a network partition occurs (nodes can't communicate — always happens eventually):

PARTITION (network split):
  Node A and Node B can't communicate.
  A write arrives at Node A.
  
  CP (Consistency + Partition Tolerance — e.g., traditional RDBMS, HBase, Zookeeper):
    Node A refuses the write: "I can't update both nodes and maintain consistency.
    I'll be unavailable until the partition heals."
    → System is CONSISTENT but UNAVAILABLE during the partition.
    
  AP (Availability + Partition Tolerance — Cassandra, DynamoDB, CouchDB):
    Node A accepts the write: "I'll write locally and sync to Node B when the
    partition heals. Users get responses even during the partition."
    → System is AVAILABLE but temporarily INCONSISTENT (B has stale data).
    
Most NoSQL databases are AP: they prioritise staying available over being perfectly
consistent. After the partition heals, they reconcile (eventual consistency).

Practical meaning for application code:
  With AP databases: a read might return stale data for seconds to minutes after
  a write. Application must handle eventual consistency — "your changes will be
  reflected shortly" is a valid UX pattern for AP systems.
  
  With CP databases (or SQL): data is always consistent but the system may
  briefly be unavailable during partitions or failover events.
```

---

## 4. The Code

### Wrong Way — Using NoSQL for Relational Data
```java
// WRONG: Using MongoDB for financial ledger data that needs aggregation and joins

// MongoDB document:
// { account_id: "ACC-1", tx_id: "TX-001", amount: 500, type: "DEBIT", ts: "2026-01-10" }
// { account_id: "ACC-2", tx_id: "TX-002", amount: 500, type: "CREDIT", ts: "2026-01-10" }
// { account_id: "ACC-1", tx_id: "TX-003", amount: 200, type: "DEBIT", ts: "2026-01-11" }

// Now try: "Show account balance = sum of CREDITs - sum of DEBITs per account"
// MongoDB aggregation:
@Service
public class LedgerService {

    @Autowired
    private MongoTemplate mongoTemplate;

    public BigDecimal getBalance(String accountId) {
        // Requires a multi-stage aggregation pipeline — verbose and complex
        Aggregation agg = Aggregation.newAggregation(
            Aggregation.match(Criteria.where("account_id").is(accountId)),
            Aggregation.project()
                .andExpression("cond(eq(type, 'CREDIT'), amount, multiply(amount, -1))")
                .as("signed_amount"),
            Aggregation.group().sum("signed_amount").as("balance")
        );
        // This works but is much more complex than: SELECT SUM(CASE WHEN type='CREDIT' THEN amount ELSE -amount END) FROM transactions WHERE account_id=?
        // Also: no ACID across documents. A debit without credit (partial failure) leaves inconsistent state.
        // MongoDB multi-document transactions exist but are slow and complex.
        return mongoTemplate.aggregate(agg, "transactions", BalanceResult.class)
            .getUniqueMappedResult().getBalance();
    }
}
```
> **Why this fails:** Financial data inherently needs: multi-row ACID (debit + credit are one atomic operation), ad-hoc sum aggregations, and consistent reads across related records. SQL is designed for exactly this. Using MongoDB adds complexity with no benefit — and loses ACID guarantees.

### Right Way — Matching NoSQL to the Right Use Case
```java
// CORRECT: MongoDB for product catalogue with variable schema

@Document(collection = "products")
@Data
@NoArgsConstructor
public class Product {

    @Id
    private String id;

    @Indexed
    private String category;          // ELECTRONICS, FOOTWEAR, BOOKS, etc.

    @Indexed
    private String name;

    private BigDecimal price;

    // The flexible part: category-specific attributes without rigid schema
    private Map<String, Object> attributes;
    // Electronics: {"battery_life_hours": 18, "screen_size_in": 6.1, "5g": true}
    // Footwear:    {"sizes": ["UK7","UK8"], "material": "mesh", "colour": "blue"}
    // Books:       {"isbn": "978-...", "author": "Name", "pages": 312}
    // New type: just add new keys to attributes — zero schema migration

    // Common fields for all product types
    private boolean inStock;
    private Instant createdAt;
    private Instant updatedAt;
}

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    // Query by category — MongoDB index on category field
    List<Product> findByCategory(String category);

    // Full-text search across name field
    List<Product> findByNameContainingIgnoreCase(String searchTerm);

    // Find in-stock items by category under a price
    List<Product> findByCategoryAndInStockTrueAndPriceLessThan(
        String category, BigDecimal maxPrice, Sort sort
    );
}

// Getting type-specific attributes — type-safe via a DTO
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepo;

    public ElectronicsDto getElectronicsDetails(String productId) {
        Product p = productRepo.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product: " + productId));

        // Type-safe projection from the flexible attributes map
        Map<String, Object> attrs = p.getAttributes();
        return ElectronicsDto.builder()
            .name(p.getName())
            .price(p.getPrice())
            .batteryLifeHours((Integer) attrs.get("battery_life_hours"))
            .screenSizeInches((Double) attrs.get("screen_size_in"))
            .fiveGCapable((Boolean) attrs.getOrDefault("5g", false))
            .build();
    }
}

// CORRECT: Redis for session storage and caching
@Service
@RequiredArgsConstructor
public class SessionService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String SESSION_PREFIX = "session:";
    private static final Duration SESSION_TTL = Duration.ofHours(24);

    public void createSession(String sessionId, UserSession sessionData) throws JsonProcessingException {
        String key = SESSION_PREFIX + sessionId;
        String json = objectMapper.writeValueAsString(sessionData);
        // SET session:abc123 <json> EX 86400
        redisTemplate.opsForValue().set(key, json, SESSION_TTL);
    }

    public Optional<UserSession> getSession(String sessionId) {
        String key = SESSION_PREFIX + sessionId;
        String json = redisTemplate.opsForValue().get(key);
        if (json == null) return Optional.empty();
        try {
            // Refresh TTL on access (sliding expiration)
            redisTemplate.expire(key, SESSION_TTL);
            return Optional.of(objectMapper.readValue(json, UserSession.class));
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialise session {}", sessionId, e);
            return Optional.empty();
        }
    }

    public void invalidateSession(String sessionId) {
        redisTemplate.delete(SESSION_PREFIX + sessionId);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you choose NoSQL over a relational database?"

**Hruday's answer:**
> I'd choose NoSQL in four specific situations.
>
> First: when the schema is flexible and evolving. If different instances of the same entity have very different attributes — like a product catalogue where electronics, clothing, and books all have different fields — a document store like MongoDB lets each document have its own shape without schema migrations.
>
> Second: when the access pattern is purely key-based. If the only query is "give me everything about this user" by a user ID, a key-value store or document store is simpler and faster than a relational database with its join infrastructure.
>
> Third: when write throughput genuinely exceeds what a single SQL server can handle and you can't solve it with read replicas and sharding. Cassandra distributes writes across a cluster linearly without a single write master.
>
> Fourth: when the data model is fundamentally non-relational — like a social graph or fraud detection network where you need to traverse many hops of relationships efficiently. Graph databases make this natural.
>
> I'd keep SQL when I need ACID transactions across multiple rows, complex ad-hoc queries and aggregations, or when the data is genuinely relational with many-to-many relationships between entities.

---

### Q2 — CAP Theorem Impact
**Interviewer asks:** "What is the CAP theorem and how does it affect choosing a database?"

**Hruday's answer:**
> The CAP theorem says a distributed database can only guarantee two of three properties: Consistency (all nodes return the same data), Availability (the system always responds), and Partition tolerance (the system keeps working despite network splits).
>
> Since network partitions happen in any distributed system — a cloud AZ loses connectivity, a network switch fails — you must choose either C or A when a partition occurs.
>
> Most relational databases choose CP: during a partition, they refuse writes or new reads until the system is consistent again. You might have a brief outage, but when it comes back, you're sure the data is correct. This is right for financial systems.
>
> Most NoSQL AP databases — Cassandra, DynamoDB — choose to stay available: they accept writes during a partition and reconcile when the partition heals. Users always get a response, but reads might be stale for a period. This is fine for product catalogues, user preferences, sessions — where a few seconds of stale data is acceptable.
>
> Practically: the consistency choice affects your application code. With an AP database, code should handle eventual consistency — don't assume a write is immediately visible to all readers. With a CP database, you can rely on consistency but must handle brief unavailability gracefully with retries.

---

### Q3 — NoSQL Misconception
**Interviewer asks:** "A colleague says 'We should use Cassandra because our SQL database doesn't scale.' How do you respond?"

**Hruday's answer:**
> I'd push back gently and ask what specific scaling problem they're hitting. "SQL doesn't scale" is a myth perpetuated by people who conflated poor schema design or missing indexes with the relational model.
>
> Postgres can handle billions of rows with proper indexing, partitioning, and read replicas. Companies at significant scale — Notion, GitHub, Shopify — run on PostgreSQL. "We need NoSQL for scale" is not a technical reason; it's often a guess.
>
> Cassandra specifically is designed for one thing: extremely high write throughput distributed across many nodes, with a data model designed for known access patterns. It sacrifices: ad-hoc queries, JOINs, cross-partition aggregations, and multi-row ACID transactions. If your current data has complex relationships or you run analytical queries, Cassandra will make your life harder, not easier.
>
> The conversation to have: what query or operation is slow? Let's look at EXPLAIN ANALYZE. Is it a missing index? Can we add a read replica? Is the write throughput actually exceeding what one well-configured Postgres instance handles? If after all those options are exhausted, the write volume still requires distributing across nodes — then evaluate Cassandra. Start with the problem, not the technology.

---

### Q4 — System Design with NoSQL
**Interviewer asks:** "Design the storage layer for a social media app with 500M users, posts, and a live activity feed."

**Hruday's answer:**
> Different data types require different storage, and a social media app is a clear multi-database system.
>
> User profiles: PostgreSQL. Structured relational data, need ACID for account operations (sign-up, deactivation), and relationships between users are queryable. User-to-user friendship is a many-to-many SQL relationship — manageable.
>
> Post content: PostgreSQL for the post record (id, author_id, text, created_at) with Elasticsearch for full-text search. Posts are mostly immutable after creation.
>
> Activity feed — who follows whom, what posts appear in whose feed — this is the hard one. At 500M users generating feed events, writes are extremely high-frequency and reads are always per-user ("give me my feed"). Redis sorted sets work well: for each user, maintain a sorted set of (timestamp, post_id) representing their feed. On new post from someone I follow: fanout ZADD to each follower's feed key. Read feed: ZRANGE. With 500M users, celebrity accounts have millions of followers: for high-follower accounts, a pull model instead of fanout — compute feed lazily on read by merging the high-follower's recent posts with the fanout feed.
>
> Likes and counters: Redis INCR for the like counter per post, with periodic flush to Postgres for persistence. Exact count in Redis; Postgres is the source of truth.
>
> The decision: PostgreSQL for core entities (transactions, user data), Redis for real-time feeds and counters, Elasticsearch for full-text search.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "NoSQL scales, SQL doesn't" | "We switched to MongoDB because our Postgres database was getting large" | "This is the most common and most harmful NoSQL misconception. Postgres scales to terabytes with partitioning and read replicas. MongoDB growing large isn't evidence of MongoDB being inherently more scalable — it's flexible schema and document model that makes it useful for specific use cases. StackOverflow, GitHub, and Shopify run on PostgreSQL at massive scale. 'Use NoSQL because SQL is slow' is a sign of unoptimised SQL or schema design, not SQL's limitation." |
| "Eventual consistency is always fine" | "NoSQL is eventually consistent — users will see updates in a few seconds, that's OK" | "For some use cases: absolutely fine. For others: catastrophic. User sees their own just-made payment or post not appear? Confusing at best. A financial debit that's not visible to the system for 30 seconds allowing a second debit of the same amount? Dangerous. When designing with AP NoSQL, explicitly enumerate which operations require read-after-write consistency, and handle those paths with primary reads, sticky routing, or explicit write-then-wait patterns. Don't accept eventual consistency globally then be surprised by its effects." |
| "MongoDB is good for relationships" | "MongoDB supports nested documents so it handles relationships well" | "MongoDB embeds data that's read together — that's NOT the same as modeling relationships. MongoDB handles one-to-few (an order with line items) well as an embedded array. But one-to-many where you query from either direction (all orders for customer AND customer for an order), many-to-many, and multi-document aggregations are genuinely painful in MongoDB compared to SQL. MongoDB 4+ supports $lookup for cross-collection joins, but its performance and expressive power is significantly weaker than SQL JOINs. If your data model has significant inter-entity relationships, SQL is likely the better choice." |
| "Cassandra handles all reads" | "Add Cassandra for all reads, Postgres for writes" | "Cassandra is designed around very specific, known access patterns defined at table creation time. You define your table by how you will query it — the primary key is (partition_key, clustering_key) and must match your query. Ad-hoc reads not matching the partition key require ALLOW FILTERING (which is a full cluster scan — dangerous). You cannot migrate queries to Cassandra without redesigning the table schema. It's not a drop-in read store; it's a specialised time-series or write-heavy store with specific access pattern requirements." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, a Node.js service stored user product preferences — each user could have any combination of preference keys. The early design used a Postgres table with a JSONB column for the preferences. This worked fine at first. As the project grew, queries across users' preferences became common: 'all users with preference X=Y.' These queries on JSONB columns were slow without GIN indexes, and once indexed, adding new preference types required re-analysis of which paths to index. I evaluated MongoDB for this specific sub-domain and migrated user preferences there. MongoDB's natural document model eliminated the JSONB gymnastics. The experience reinforced the lesson: use the right tool for the specific data model and query requirement, not one database for everything."

---

## 8. Scale Evolution

**Early startup:** PostgreSQL for everything. It genuinely scales far beyond most startups' needs. Focus on schema correctness, indexing, and query optimisation.

**Growth:** Add Redis for caching and sessions (reduces DB read load). Add Elasticsearch if you've added full-text search requirements that pg's tsvector isn't meeting.

**Scale:** Evaluate specific use cases for NoSQL: time-series data → InfluxDB or TimescaleDB. Product catalogue variations → MongoDB. High-write event streams → Cassandra or Kafka + event store. Each addition is justified by specific requirements, not general "scale."

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Core financial transactions stay in PostgreSQL (ACID mandatory). Redis for rate limiting and OTP. MongoDB for merchant documents with variable configuration attributes. | "Design the storage layer for a multi-product payment platform where each payment type has different attributes." |
| Swiggy / Meesho | Product catalogue (MongoDB for variable restaurant item attributes). Order tracking events (DynamoDB or Cassandra). Live delivery location (Redis pub/sub or geospatial). | "Why would you use different databases for product catalogue vs real-time delivery tracking?" |
| Adobe / Microsoft | Asset management metadata (flexible schema → document store). User collaboration events (event store or Cassandra). Core entitlement and billing (PostgreSQL). | "Walk through the full data storage architecture for a cloud-based creative platform." |
| SAP Labs (current) | SAP HANA is both relational and document-capable. SAP uses PostgreSQL for some services. Understanding when to use HANA's column store vs row store vs document engine is relevant for SAP Native Cloud development. | "SAP HANA has both row store and column store tables. How would you decide which to use for an application table?" |

---

## 10. Related Topics — What to Study Next

- **Topic 97 — Document Stores (MongoDB)** — deep dive into MongoDB patterns, data modelling, and replication, building on the NoSQL overview in this topic
- **Topic 98 — Key-Value Stores (Redis)** — Redis use cases covered in overview here; Topic 98 goes deep on data structures and production patterns
- **Topic 95 — Isolation Levels** — SQL ACID and isolation are the benchmark against which NoSQL eventual consistency is compared; understanding both is needed to make the right choice

---

*Part 5 · When to Choose NoSQL Over SQL · Full Stack Interview Guide · Hruday D · 2026*
