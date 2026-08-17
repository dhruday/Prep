# Choosing the Right Database for System Design
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- In a system design interview, database choice is one of the most impactful decisions. Interviewers look for: (1) reasoning behind the choice, not just the name; (2) awareness of trade-offs; (3) that you don't default to a single database for every problem.
- The key selection questions: What is the data model (relational, hierarchical, graph, key-value, time-series)? What are the dominant access patterns (by key, by range, by relationship traversal, ad-hoc)? What are the consistency requirements (ACID, eventual, strong)? What is the scale (reads/sec, writes/sec, data volume)?
- Decision shortcuts: Need ACID transactions, joins, ad-hoc queries → PostgreSQL. Need flexible schema, document hierarchy → MongoDB. Need sub-millisecond ephemeral data → Redis. Need high-write time-series → Cassandra. Need full-text search with relevance → Elasticsearch. Need graph traversal → Neo4j.
- Most real systems use MULTIPLE databases (polyglot persistence): a core relational DB + Redis cache + Elasticsearch for search + optionally Cassandra for time-series.
- The most common interview mistake: putting everything in one database type because "it scales" or "it's what I know." A good candidate says "core transactional data in PostgreSQL, search in Elasticsearch synced via CDC, sessions in Redis — here's why each."
- Gap to bridge: candidates state "use PostgreSQL for user data, Cassandra for everything else" without explaining WHY Cassandra is right for the second use case — justification with access patterns and scale is what earns points

---

## 1. One-Line Definition
Database selection for a system design requires matching the data model, access pattern, consistency requirement, and scale of each sub-domain to the database whose design assumptions and trade-offs best fit that sub-domain — often resulting in multiple specialized databases per system.

---

## 2. Decision Framework

```
DECISION TREE FOR DATABASE SELECTION:

Step 1 — Data model?
  │
  ├── Relational (entities with relationships, need JOINs, ACID)?
  │     → PostgreSQL / MySQL
  │
  ├── Hierarchical / flexible schema (JSON, varying fields per entity)?
  │     → MongoDB (document store)
  │
  ├── Purely key-based access (get by ID only, no query)?
  │     → Redis (if ephemeral/small) or DynamoDB (if large, persistent)
  │
  ├── Time-series / high write throughput (sensor data, events)?
  │     → Cassandra / TimescaleDB / InfluxDB
  │
  ├── Full-text search with relevance scoring?
  │     → Elasticsearch / OpenSearch
  │
  ├── Graph (traverse relationships many hops deep)?
  │     → Neo4j / Amazon Neptune
  │
  └── Binary files / large objects (images, videos)?
        → S3 / Azure Blob Storage (not a database — object store)

Step 2 — Scale?
  │
  ├── < 10M rows, < 1,000 req/sec → Single PostgreSQL (possibly + read replica)
  ├── < 100M rows, < 10,000 req/sec → PostgreSQL + read replicas + Redis cache
  ├── > 100M rows, < 100,000 req/sec → Add sharding evaluation; Cassandra for write-heavy
  └── > billions of rows → Cassandra, DynamoDB, or horizontally sharded PostgreSQL

Step 3 — Consistency requirement?
  │
  ├── Financial, inventory, user account → ACID mandatory → PostgreSQL
  ├── User preferences, product catalogue, profiles → eventual OK → MongoDB / Redis
  ├── Analytics, search, feeds → eventual OK → Cassandra / Elasticsearch
  └── Cross-service transactions → Saga pattern + at-least-once delivery (no single DB)

Step 4 — Does this use case need multiple databases?
  Usually YES. Most systems are polyglot.
```

---

## 3. System Design Scenarios — Database Choice Map

```
SCENARIO A: PAYMENT PLATFORM (Razorpay-like)

Sub-domain          | Database      | Why
--------------------|---------------|----------------------------------
User accounts        | PostgreSQL    | Relational, ACID, identity
Transactions         | PostgreSQL    | ACID multi-table, audit integrity
Merchant config      | MongoDB       | Variable attributes per payment type
Sessions / OTP       | Redis         | Ephemeral, sub-ms, auto-TTL
Rate limiting        | Redis         | INCR + EXPIRE per window
Transaction events   | Cassandra     | Append-only audit log, high-write
Product search       | Not needed    | (payments don't need text search)
Idempotency keys     | Redis (SETNX) | Atomic check-and-set, short TTL
Reports / analytics  | Read replica or data warehouse (Redshift / BigQuery)

SCENARIO B: E-COMMERCE PLATFORM (Swiggy-like)

Sub-domain          | Database      | Why
--------------------|---------------|----------------------------------
User accounts        | PostgreSQL    | Relational, ACID
Orders               | PostgreSQL    | ACID, complex JOIN queries
Product catalogue    | MongoDB       | Flexible attributes per product type
Product search       | Elasticsearch | Full-text, facets, relevance sorting
User sessions        | Redis         | Shared stateless session store
Product cache        | Redis         | Cache DB reads, 5-min TTL
Real-time location   | Redis Geo     | Driver coordinates, sub-second updates
Activity feed        | Cassandra     | Time-series, always by user_id + time
Ratings / reviews    | PostgreSQL    | Relational, moderation queries

SCENARIO C: SOCIAL MEDIA PLATFORM (Instagram-like)

Sub-domain          | Database      | Why
--------------------|---------------|----------------------------------
User accounts        | PostgreSQL    | Core identity, ACID
Follow graph         | Neo4j / SQL   | Graph traversal vs. simple adjacency list
Post content         | PostgreSQL    | Metadata + FK to object store
Media files          | S3 / CDN      | Binary files — not a DB
Post search          | Elasticsearch | Full-text, hashtag search
Feed storage         | Redis ZSet    | Pre-computed sorted feed per user
Activity events      | Cassandra     | Likes, views — high write, time-ordered
Comments             | MongoDB       | Threaded, flexible nested structure
Notifications        | Redis List    | Bounded recent notifications per user
Analytics            | Data warehouse| Aggregations across all users

```

---

## 4. Interview Walk-Through Pattern

```
INTERVIEW QUESTION: "Design the storage layer for Uber's ride-sharing platform."

1. LIST THE ENTITIES AND SUB-DOMAINS:
   - User accounts: name, payment methods, rating
   - Driver accounts: vehicle info, license, rating
   - Live driver locations (GPS pings every 5-10 seconds)
   - Ride requests (match driver to rider)
   - Trip history (completed rides)
   - Pricing (surge multipliers by region)
   - Payments: charges, splits, receipts

2. MATCH TO DATABASE PER SUB-DOMAIN:

   User/driver accounts → PostgreSQL
   Why: relational (users have payment methods, drivers have vehicles),
   ACID needed for account operations, joins for profiles.

   Live driver locations → Redis / specialized geo-store
   Why: 1M active drivers × 1 GPS update/10 seconds = 100K writes/sec.
   Data is ephemeral (expires when offline). Need geo-proximity queries.
   Redis Geo commands: GEOADD, GEORADIUS.

   Ride requests and matching → Redis + PostgreSQL
   Why: matching state is ephemeral (seconds to make a match). Redis for
   real-time state machine. Final matched ride persisted to PostgreSQL.

   Trip history → PostgreSQL + Cassandra
   Why: recent trips by user → PostgreSQL (joins, ACID). Long-term audit
   event log per trip → Cassandra (append-only, time-ordered, high volume).

   Pricing (surge maps) → Redis with short TTL
   Why: read-heavy, changes every few minutes, sub-ms for pricing API.
   Calculated by a separate service and cached in Redis.

   Payments → PostgreSQL
   Why: ACID mandatory. Multi-table: charge + driver payout + platform fee.

3. MENTION SYNC STRATEGY:
   PostgreSQL → Elasticsearch (via CDC/Kafka) for driver/rider search.
   PostgreSQL → Cassandra (via event-sourcing) for audit event log.
   Redis geo updated in real-time by driver mobile apps.

4. STATE THE SCALE ASSUMPTION:
   "At 50M rides/day, PostgreSQL handles trips with read replicas.
   Redis cluster for locations (purely in-memory, stays small).
   Cassandra for event log (append-only, grows but Cassandra handles this)."
```

---

## 5. Interview Questions & Model Answers

### Q1 — Direct Choice
**Interviewer asks:** "For a fintech app storing transactions, why PostgreSQL and not MongoDB?"

**Hruday's answer:**
> Transactions in fintech need ACID guarantees: a debit from account A and a credit to account B must be atomic — either both happen or neither happens. PostgreSQL provides multi-row, multi-table transactions with rollback. If the credit call fails after the debit commits, PostgreSQL lets me roll back the entire operation. MongoDB 4+ does support multi-document transactions, but they're slower and more complex, and the MongoDB data model is not designed around this use case.
>
> Additionally, financial data requires ad-hoc querying: show all transactions above ₹10,000 for merchant X in Q1 sorted by date, aggregated by category — SQL handles this naturally. MongoDB's aggregation pipeline is more verbose and less capable for this class of analytical query.
>
> Finally: audit trail. Regulatory compliance requires querying financial data in arbitrary ways — by date range, by amount range, by merchant, by status. SQL's flexible WHERE clause and JOINs are essential. MongoDB's requirement to know the query at table design time is a liability here.

---

### Q2 — Polyglot Justification
**Interviewer asks:** "Isn't it operationally complex to run PostgreSQL, Redis, MongoDB, and Elasticsearch together?"

**Hruday's answer:**
> Yes — polyglot persistence adds operational complexity: more services to monitor, more backup strategies, more failure modes, more developer expertise required. This is a real trade-off and worth acknowledging.
>
> But the alternative — forcing all data into one database type — introduces different problems. Using MongoDB for financial transactions means reimplementing ACID. Using PostgreSQL for full-text product search means slow, limited search compared to Elasticsearch. Using PostgreSQL for session storage means a bottleneck that should be sub-millisecond.
>
> The right question is: is the complexity worth it? For a mature product serving millions of users, yes — each database does its job well, and the performance and correctness gains outweigh the operational overhead. For a startup's MVP, start with PostgreSQL only — it handles most use cases well enough early on. Add Redis when you need caching. Add Elasticsearch when search quality matters. Each addition should be justified by a specific requirement, not added speculatively.
>
> Managed services (RDS, ElastiCache, Atlas, Elastic Cloud) dramatically reduce operational burden — you get multi-database architecture without running the infrastructure yourself.

---

### Q3 — System Design
**Interviewer asks:** "Design the database layer for a URL shortener at 100M shortlinks."

**Hruday's answer:**
> This is a clean, focused system. Two core operations: write (create a shortcode→URL mapping) and read (resolve a shortcode to URL).
>
> Write is infrequent — maybe 100-1000 new shortlinks per second peak. Read is extremely frequent — 100M shortlinks, popular ones hit millions of times per day.
>
> Base storage: PostgreSQL. The shortlinks table: (id, shortcode, original_url, user_id, created_at, click_count, expires_at). Shortcode needs a unique index. Original_url indexed for deduplication checks. This fits naturally in SQL — relational (user has many shortlinks), ACID for creation, queryable.
>
> But reading from PostgreSQL on every click is unnecessary — the shortcode→URL mapping doesn't change. Redis cache: `SET shortcode:xyz <url> EX 86400` with a 24-hour TTL. On click: check Redis first (cache hit → redirect immediately, ~0.5ms). Cache miss → PostgreSQL lookup → re-cache. For popular shortlinks: essentially all reads from Redis.
>
> Click analytics: if we count clicks, appending every click to PostgreSQL as a separate row is expensive. Instead: Redis INCR for `clicks:{shortcode}` per hour. A batch job aggregates hourly counts to PostgreSQL for dashboards. Real-time high-frequency writes → Redis; persistent analytics → PostgreSQL.
>
> Scale: PostgreSQL handles 100M shortlinks without sharding (well within single-server capacity). At 10,000 click redirects/second: Redis handles this easily. No Cassandra or MongoDB needed — the simplest architecture that fits the problem.

---

### Q4 — Comparison
**Interviewer asks:** "Cassandra vs DynamoDB — when would you choose one over the other?"

**Hruday's answer:**
> Both are distributed wide-column stores with similar design philosophy: partition key → row, clustering key → sort order, denormalized tables per query pattern.
>
> Cassandra is open-source and self-hosted (or via Astra DB managed). Choose it when: you need multi-datacenter replication with consistency control per-operation, you want to avoid vendor lock-in, or your team has Cassandra operational expertise.
>
> DynamoDB is AWS-managed. Choose it when: you're already on AWS and want zero operational overhead (no server management, auto-scaling built-in), you need seamless integration with Lambda/Kinesis/Aurora, and you accept AWS vendor lock-in.
>
> DynamoDB's on-demand pricing is convenient for unpredictable workloads. Cassandra's throughput is more predictable for sustained high-volume workloads and often cheaper per unit at scale.
>
> Both make the same fundamental demands on the developer: you MUST know your access patterns upfront, you CANNOT use ALLOW FILTERING / Scan in production, and you WILL duplicate data across multiple tables for different queries. The choice between them is primarily operational and cloud strategy, not data model.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use one DB for everything" | "I'll put everything in PostgreSQL / MongoDB — it's simpler" | "Starting with one database is the right strategy for MVP. But in a system design interview, you're asked to design for scale and the right tool for each sub-domain. Saying 'PostgreSQL for everything including session storage and GPS coordinates' signals you haven't thought about access patterns. The interviewer wants to see you identify WHAT makes each sub-domain different and WHICH database properties serve it best. Then say if a mono-DB is acceptable for MVP and when to add each specialist." |
| "NoSQL scales, SQL doesn't" | "Use Cassandra because PostgreSQL won't scale to millions of users" | "This is the most common and most penalising answer in a design interview. PostgreSQL scales to billions of rows with proper indexing, partitioning, and read replicas. 'Millions of users' does not automatically mean you need NoSQL. The right trigger: 'Our current DB is at 90% CPU under peak write load after adding read replicas' or 'Our time-series table grows 100GB/day and range queries are slow.' Evidence-based scaling, not technology-based scaling." |
| "Elasticsearch is a primary database" | "Store all data in Elasticsearch for fast search" | "Elasticsearch is optimised for search and analytics — not as a primary transactional database. It is eventually consistent, does not support ACID multi-document transactions, and loses data resiliency guarantees during writes that SQL provides. The correct pattern: primary data in PostgreSQL → sync to Elasticsearch via CDC (change data capture) or scheduled jobs → serve search queries from Elasticsearch. Elasticsearch as read-only search replica, PostgreSQL as source of truth." |
| "Cache everything in Redis" | "Put all read traffic through Redis to avoid DB load" | "Redis caching is appropriate for read-heavy, read frequently accessed, data that changes infrequently or tolerates brief staleness. Caching financial balances in Redis introduces risk: if the cache is stale by 5 seconds, the user's balance check passes but the database rejects the transaction. For CRITICAL READS that must be fresh (balance before deduction, inventory before reservation), go to the primary database directly. Redis caching is for pages, product details, user preferences — not for data driving real-money decisions at the point of action." |

---

## 7. Hruday's Real Experience Hook

> "In the Oracle ERP project, the data layer was entirely Oracle Database — all transactional data, all reporting, all session state in one mammoth Oracle cluster. The reporting queries were impacting transactional API performance. If I were designing it from scratch now, I would separate the concerns: Oracle/PostgreSQL for the core ERP transactional tables (ACID mandatory), a dedicated analytics read replica for reports (isolation), and Redis for API response caching of relatively static reference data (GL accounts, currency rates, cost centres). Three databases, each doing what it does best. The insight was that not all data needs the same guarantees — and mixing high-consistency transactional data with eventual-consistency analytics reads on the same instance was the root cause of performance coupling."

---

## 8. Interview Scoring — What Answers Get Which Level

```
Junior / passing answer:
  "Use PostgreSQL for relational data and Redis for caching."
  ✓ Shows awareness of caching pattern.
  ✗ Doesn't address non-relational use cases. Doesn't connect to access patterns.

Mid-level / good answer:
  "PostgreSQL for transactions and user data. Redis for sessions and rate limiting.
  Elasticsearch for search. MongoDB for product catalogue flexibility."
  ✓ Polyglot awareness. Reasonable choices.
  ✗ Missing justification: WHY MongoDB for catalogue vs PostgreSQL with JSONB?

Senior / excellent answer:
  "Core transactional entities — users, orders, payments — in PostgreSQL because ACID,
  multi-table transactions, and ad-hoc analytical queries. Access patterns here are
  complex and unpredictable: audit teams, support, finance all query differently.
  PostgreSQL + read replica for reporting isolation.
  
  Product catalogue in MongoDB because product types have 20+ different attribute shapes.
  JSONB in PostgreSQL is an option but GIN indexing on arbitrary JSONB paths adds query
  planning complexity. For the catalogue's read-heavy, schema-flexible requirements,
  MongoDB's document model is a better fit.
  
  Sessions in Redis: stateless API servers need shared session access, TTL is automatic,
  sub-millisecond is required, and if Redis loses recently-written sessions users
  re-authenticate — acceptable for this data.
  
  Search in Elasticsearch synced via CDC from PostgreSQL + MongoDB. CDC (Debezium) watches
  the transaction log and pushes changes to Elasticsearch within seconds.
  
  At this scale: all on managed services — RDS PostgreSQL, ElastiCache Redis,
  Atlas MongoDB, Elastic Cloud."
  ✓ Justification per choice. Addresses sync strategy. Scale-aware. Trade-off aware.
  ✓ Shows awareness of alternatives (JSONB vs MongoDB).
  ✓ Mentions managed services vs self-hosted.
```

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Database selection is a core problem for payment infrastructure. Every component — transactions, notifications, analytics, rate limiting — is a distinct sub-domain requiring the right store. | "Walk me through ALL the databases you would use in a complete payment platform and justify each." |
| Swiggy / Meesho | High-traffic e-commerce with real-time features (live order tracking, flash sales, search) requires polyglot persistence. Interview often includes database-per-component justification. | "Design the full data layer for an e-commerce platform handling 100K orders/hour." |
| Adobe / Microsoft | Enterprise software design round typically features a large system — creative asset management, collaboration platform — where database selection across sub-domains is the focal question. | "Design the backend for a cloud-based document collaboration platform serving 50M users." |
| SAP Labs (current) | SAP hybrid cloud architectures combine SAP HANA, PostgreSQL, Redis, and Elasticsearch. Understanding polyglot persistence helps when designing custom extensions or new cloud-native SAP applications. | "What mix of databases would you use for a new microservices-based SAP extension with high read load?" |

---

## 10. Related Topics — What to Study Next

- **Topics 86-99** — each database type covered in the preceding topics feeds into this synthesis. If any topic's rationale is unclear, revisit it before the interview
- **Topic 91 — Replication**, **Topic 92 — Sharding** — the scaling dimension of database selection; what happens when a chosen database's single-server capacity is exceeded
- **System Design — Frontend and Backend** — database choice is part of a larger system design discussion; Topics 100 connects to the broader architecture patterns in System Design module

---

*Part 5 · Choosing the Right Database for System Design · Full Stack Interview Guide · Hruday D · 2026*
