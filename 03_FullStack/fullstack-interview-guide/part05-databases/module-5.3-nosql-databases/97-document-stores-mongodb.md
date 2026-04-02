# Document Stores — MongoDB Patterns
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- MongoDB stores data as BSON documents (binary JSON). Each collection is like a table, each document is like a row — but with flexible schema (documents in the same collection can have different fields).
- Embedding vs referencing: embed data when it's always read with the parent (order + line items embedded in one document = one read). Reference via ObjectId when data is accessed independently or shared across documents (user referenced in many orders — don't duplicate user in each order).
- Embedding pitfall: the 16MB document size limit, and large embedded arrays that grow unboundedly (e.g., storing all chat messages in a conversation document — will hit 16MB eventually). Use referencing for unbounded collections.
- MongoDB indexes work similarly to SQL: single field, compound (order matters: leftmost prefix rule applies), text index for full-text search, TTL index to auto-delete. Index on every field you filter on.
- Aggregation pipeline: MongoDB's equivalent of GROUP BY + JOIN. Stages: `$match` (filter), `$group` (aggregate), `$sort`, `$project` (select fields), `$lookup` (left outer join to another collection), `$unwind` (destructure array into multiple documents).
- Schema design rule of thumb: store together what is queried together. Embed what has a dependent lifecycle. Reference what has an independent lifecycle.
- Spring Data MongoDB: `@Document`, `MongoRepository<T, ID>`, `@Query` with MongoDB query syntax, `MongoTemplate` for complex aggregations.
- Gap to bridge: candidates know "MongoDB is for flexible schema" but cannot explain the embed vs reference trade-off, the 16MB problem with embedded arrays, the $lookup limitations, or why compound index column order matters in MongoDB exactly as it does in SQL

---

## 1. One-Line Definition
MongoDB stores JSON-like documents in schema-flexible collections, enabling iterative data model evolution and natural mapping of hierarchical application objects — at the cost of multi-collection ACID transactions and the ad-hoc join power of relational SQL.

---

## 2. The Problem It Solves

```
USE CASE: E-learning platform. Each course has varying metadata per category.

Relational approach (rigid):
  courses: id, title, instructor_id, category_id, price, duration_minutes
  video_course_details: course_id, resolution, requires_download_app
  book_details: course_id, isbn, page_count, pdf_available
  workshop_details: course_id, max_participants, physical_location, materials_cost
  
  Adding new course type (live streaming): schema migration for new table.
  Fetching a course: 2-3 JOINs from different tables based on type.
  Schema evolution requires coordination across teams: DBA, backend, data team.

MongoDB approach (flexible):
  Video course document:
  {
    "_id": "C-001",
    "title": "Spring Boot Mastery",
    "instructor_id": "I-42",
    "category": "PROGRAMMING",
    "price": 2999,
    "duration_minutes": 480,
    "resolution": "1080p",     ← video-specific
    "requires_app": false       ← video-specific
  }
  
  Workshop document (same collection, different shape):
  {
    "_id": "C-002",
    "title": "Java 17 Workshop",
    "instructor_id": "I-42",
    "category": "PROGRAMMING",
    "price": 9999,
    "max_participants": 20,    ← workshop-specific
    "location": "Bangalore",    ← workshop-specific
    "materials_included": true  ← workshop-specific
  }
  
  New course type: just use. Zero schema migration. Backend handles new fields.
  Read: db.courses.findOne({ "_id": "C-001" }) → one round trip, all data included.
```

---

## 3. How It Works Internally

### Embedding vs Referencing

```
PATTERN 1 — EMBED (when data is always read with the parent)

Order with line items:
{
  "_id": "ORD-001",
  "customer_id": "C-42",
  "status": "PLACED",
  "created_at": "2026-01-10T10:00:00Z",
  "items": [                            ← embedded array
    {
      "product_id": "P-1",
      "name": "iPhone 15",             ← denormalised for read performance
      "qty": 1,
      "unit_price": 79900
    },
    {
      "product_id": "P-2",
      "name": "AirPods",
      "qty": 2,
      "unit_price": 19900
    }
  ],
  "subtotal": 119700,
  "tax": 21546,
  "total": 141246,
  "shipping_address": {               ← embedded document
    "street": "123 MG Road",
    "city": "Bangalore",
    "pin": "560001"
  }
}

WHY embed items: an order and its items have dependent lifecycles — if the order
is deleted, items go with it. You always need both together. One DB round trip.

PATTERN 2 — REFERENCE (when data has independent lifecycle or is shared)

Blog post with comments:
{
  "_id": "POST-001",
  "title": "Spring Boot Best Practices",
  "author_id": ObjectId("64f..."),    ← reference to users collection
  "body": "...",
  "category_ids": [ObjectId("5a1..."), ObjectId("5a2...")]  ← references to categories
}

Separate comments collection (NOT embedded):
{
  "_id": ObjectId("..."),
  "post_id": ObjectId("POST-001"),   ← reference back to post
  "author_id": ObjectId("64f..."),
  "body": "Great article!",
  "created_at": "2026-01-10T11:00:00Z"
}

WHY reference comments separately:
  → Comments can grow unboundedly — no 16MB document limit risk
  → You want to paginate comments (not load all 5000 comments when viewing a post)
  → Comments are independently deleted (without deleting the post)
  → Comments have their own author, lifecycle, and query patterns

16MB LIMIT VIOLATION EXAMPLE:
  WRONG: Embedding all comments inside the post document
  {
    "_id": "POST-001",
    "comments": [ ... 5000 comment objects ... ]  ← BSON limit: 16MB per document
  }
  
  A popular post with 5000 × 2KB comments = 10MB — approaching the limit.
  With images embedded: can easily exceed 16MB.
  Result: insert fails with "document too large" error in production.
```

### Aggregation Pipeline

```
Aggregation pipeline = a sequence of stages; each stage transforms the documents.
Equivalent to: GROUP BY, JOIN, HAVING, ORDER BY — all in one.

Example: "Average order total per customer for orders placed in 2026"

db.orders.aggregate([
  // Stage 1: $match — filter by year (uses index on created_at if it exists)
  { $match: { created_at: { $gte: ISODate("2026-01-01"), $lt: ISODate("2027-01-01") } } },
  
  // Stage 2: $group — compute average per customer
  { $group: {
      _id: "$customer_id",
      avg_order_total: { $avg: "$total" },
      order_count: { $sum: 1 }
  }},
  
  // Stage 3: $lookup — join to customers collection to get customer name
  { $lookup: {
      from: "customers",           // collection to join
      localField: "_id",           // field in current documents
      foreignField: "_id",         // field in customers collection
      as: "customer_info"          // result field (array)
  }},
  
  // Stage 4: $unwind — flatten the array result from $lookup (one customer per doc)
  { $unwind: "$customer_info" },
  
  // Stage 5: $project — select and rename output fields
  { $project: {
      customer_name: "$customer_info.name",
      avg_order_total: { $round: ["$avg_order_total", 2] },
      order_count: 1
  }},
  
  // Stage 6: $sort — order by average descending
  { $sort: { avg_order_total: -1 } },
  
  // Stage 7: $limit
  { $limit: 10 }
])

KEY: $match MUST come first to use indexes. If you match AFTER $group, you scan
all documents to group them first, then filter — very slow on large collections.
```

---

## 4. The Code

### Wrong Way — Embedding Unbounded Arrays
```java
// WRONG: Embedding growing arrays in a single document

@Document(collection = "conversations")
@Data
public class Conversation {
    @Id
    private String id;
    private List<String> participantIds;

    // WRONG: Messages embedded directly in conversation document
    // A conversation could have millions of messages:
    // 100 messages/day × 365 days = 36,500 messages/year
    // Each message ~500 bytes × 36,500 = ~18MB → EXCEEDS 16MB BSON LIMIT
    private List<Message> messages;  // ← Will fail in production at scale
}

@Data
public class Message {
    private String senderId;
    private String text;
    private Instant sentAt;
    // images, reactions, metadata → even more bytes per message
}
```
> **Why this fails:** BSON documents have a 16MB hard limit. A conversation with thousands of messages will hit this limit and throw an exception, potentially in production with real user data.

### Right Way — Proper Document Design with References
```java
// Conversation document: lightweight, no embedded messages
@Document(collection = "conversations")
@Data
@NoArgsConstructor
public class Conversation {

    @Id
    private String id;

    private List<String> participantIds;
    private String lastMessagePreview;  // denormalised: snippet of most recent message
    private Instant lastMessageAt;      // denormalised: for sorting conversations list
    private Instant createdAt;

    // Message COUNT only — not the full array
    // Actual messages live in the messages collection with conversation_id FK
}

// Messages in a separate collection with pagination support
@Document(collection = "messages")
@Data
@NoArgsConstructor
public class Message {

    @Id
    private String id;

    @Indexed  // index for querying messages by conversation
    private String conversationId;

    private String senderId;
    private String text;
    private Instant sentAt;
    private boolean deleted;
}

// Repository: paginated message loading — never loads all messages at once
@Repository
public interface MessageRepository extends MongoRepository<Message, String> {

    // Query messages for a conversation, sorted newest first, paginated
    Page<Message> findByConversationIdAndDeletedFalseOrderBySentAtDesc(
        String conversationId,
        Pageable pageable
    );
}

// Service: aggregation pipeline via MongoTemplate
@Service
@RequiredArgsConstructor
public class OrderAnalyticsService {

    private final MongoTemplate mongoTemplate;

    public List<CustomerOrderSummary> getTopCustomersByRevenue(
            LocalDate from, LocalDate to, int limit) {

        Instant fromInstant = from.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInstant = to.atStartOfDay(ZoneOffset.UTC).toInstant();

        Aggregation aggregation = Aggregation.newAggregation(
            // Stage 1: FILTER FIRST — uses index on created_at
            Aggregation.match(
                Criteria.where("created_at").gte(fromInstant).lt(toInstant)
                    .and("status").ne("CANCELLED")
            ),

            // Stage 2: AGGREGATE per customer
            Aggregation.group("customer_id")
                .sum("total").as("totalRevenue")
                .count().as("orderCount"),

            // Stage 3: JOIN to customers to get name
            Aggregation.lookup("customers", "_id", "_id", "customerInfo"),

            // Stage 4: FLATTEN the join result array
            Aggregation.unwind("customerInfo"),

            // Stage 5: PROJECT final shape
            Aggregation.project()
                .andExpression("customerInfo.name").as("customerName")
                .and("totalRevenue").as("totalRevenue")
                .and("orderCount").as("orderCount"),

            // Stage 6: SORT and LIMIT
            Aggregation.sort(Sort.Direction.DESC, "totalRevenue"),
            Aggregation.limit(limit)
        );

        return mongoTemplate
            .aggregate(aggregation, "orders", CustomerOrderSummary.class)
            .getMappedResults();
    }
}

// Spring Data MongoDB repository with custom query
@Repository
public interface ProductRepository extends MongoRepository<Product, String> {

    // Basic queries — Spring Data generates the MongoDB query automatically
    List<Product> findByCategoryAndInStockTrue(String category);
    Optional<Product> findBySkuCode(String skuCode);
    List<Product> findByPriceLessThanEqualAndCategoryOrderByPriceAsc(
        BigDecimal maxPrice, String category
    );

    // Text search — requires text index: @CompoundIndex(type = "text", def = "{'name': 'text', 'description': 'text'}")
    @Query("{ $text: { $search: ?0 } }")
    List<Product> searchByText(String searchTerm);

    // Aggregation on nested array items — find products containing a specific tag
    @Query("{ 'tags': { $in: [?0] } }")
    List<Product> findByTag(String tag);
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between embedding and referencing in MongoDB?"

**Hruday's answer:**
> The core rule is: embed data that's always queried together with its parent; reference data that has an independent lifecycle or can grow unboundedly.
>
> Embedding means nesting a document or an array of documents inside the parent. An order document with its line items embedded is a classic example — you never query line items without the order they belong to. One database fetch returns the order and everything you need to display it. No joins needed.
>
> Referencing means storing an ObjectId pointer to a document in another collection — like how a relational FK works. You'd reference the user document in an order rather than embedding user details, because the user exists independently of any single order and changing the user's email shouldn't require updating every order document.
>
> The pitfall with embedding is MongoDB's 16MB document size limit. If you embed an array that grows indefinitely — like all chat messages in a conversation document — eventually you hit the limit and inserts fail. Unbounded arrays should always live in a separate collection with a reference back to the parent.

---

### Q2 — Aggregation Pipeline
**Interviewer asks:** "How does MongoDB's aggregation pipeline work and how is it similar to SQL?"

**Hruday's answer:**
> The aggregation pipeline is a sequence of processing stages where each stage transforms the set of documents. Documents flow through: first stage output is second stage input, and so on.
>
> The SQL-to-MongoDB stage mapping: `$match` is your WHERE clause. `$group` is GROUP BY with $sum, $avg, $count. `$sort` is ORDER BY. `$project` is SELECT — choosing which fields to include. `$lookup` is a left outer JOIN to another collection on a matching field.
>
> A critical performance rule: `$match` must come FIRST. If you put $match after $group, MongoDB groups all documents in the collection before filtering — scanning potentially billions of documents. If $match is first, it uses an index to select only the relevant documents, then groups the small result set. This directly mirrors SQL: the earliest filter in the query plan is most important for performance.
>
> $lookup is the weakest link — it's less flexible and harder to optimise than SQL JOINs. For complex multi-collection joins, either denormalize the data (embed what you need) or move to a relational database. MongoDB's sweet spot is single-collection aggregations with $match + $group.

---

### Q3 — Indexing in MongoDB
**Interviewer asks:** "How does compound index ordering work in MongoDB? Is it different from SQL?"

**Hruday's answer:**
> It's identical to SQL — the leftmost prefix rule applies exactly the same way.
>
> If I create a compound index on `{ status: 1, created_at: -1 }`, this index helps queries that filter on `status` alone, or on `status + created_at` together. It does NOT help a query filtering only on `created_at` — that skips the leftmost field.
>
> The index also captures the sort order: `created_at: -1` means the index stores entries in descending order for created_at within each status group. A query that filters by status and sorts by created_at descending can use this index for both the filter and the sort — no separate sort step needed.
>
> One MongoDB-specific consideration: the ESR rule. For compound indexes: put Equality fields first (=), then Sort fields, then Range fields (>, <, IN). Equality fields narrow the data set most effectively. Sort fields come next so the index can serve the ORDER BY. Range fields come last because range filtering returns multiple index entries. Following ESR order gives the planner the best index navigation path.

---

### Q4 — System Design
**Interviewer asks:** "Design the data model for an e-commerce platform's product catalogue using MongoDB."

**Hruday's answer:**
> The product catalogue is a good MongoDB fit because product types have wildly different attributes — electronics, clothing, books, and food all need different fields. A relational schema would need a products table plus N type-specific attribute tables and complex JOINs.
>
> Core product document: embed the common fields (id, name, price, category, in_stock, created_at) and add a flexible `attributes` map for type-specific fields. This lets a phone document have battery_life and an apparel document have size and colour — same collection, different shapes.
>
> Product variants: a phone comes in 3 colours and 2 storage sizes — 6 SKUs. I'd embed variants as an array of objects within the product document (variants can't exceed ~100 per product, so no 16MB concern). Each variant has its own price, stock count, and SKU code.
>
> Categories: referenced by ObjectId, not embedded. Categories are shared across thousands of products. If a category name changes, one update in the categories collection is sufficient — no product documents need updating.
>
> Indexes: compound index on `{category: 1, price: 1}` for category browse sorted by price. Text index on `{name: 'text', description: 'text'}` for search. Single-field index on `in_stock` and `sku_code` for inventory queries. TTL index for temporary promotional products with an auto-delete expiry date.
>
> For search beyond MongoDB's text index capability: sync to Elasticsearch via a change stream listener for production-grade full-text search with facets and relevance scoring.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "MongoDB is schemaless" | "MongoDB is schemaless so you don't need to worry about structure" | "'Schemaless' means MongoDB doesn't enforce a schema at the database level — not that you don't need one. In practice, your application code IS the schema: your Java Spring model classes define expected fields and types. Without discipline, you end up with documents in the same collection with inconsistent fields, missing required fields, and type mismatches — all invisible to the database, all causing NullPointerExceptions in Java. Treat MongoDB schema like you would an API contract: define it explicitly in your Java model, validate at the application boundary, and version schema changes carefully." |
| "Use $lookup for all joins" | "MongoDB has $lookup so you can join collections like SQL" | "$lookup (MongoDB's left outer join) has significant limitations: you can't use it with sharded collections in all versions, it doesn't use indexes as efficiently as SQL hash joins, and complex multi-level lookup pipelines become verbose and slow. The MongoDB philosophy is: design the data model to minimise cross-collection lookups. If your aggregation pipeline has 3 or more $lookup stages, consider whether this data model belongs in MongoDB at all, or whether a relational database's native JOIN capabilities are a better fit." |
| "No index needed — MongoDB is fast" | "MongoDB doesn't need indexes because it uses storage engines efficiently" | "MongoDB absolutely requires indexes — without them, every query is a collection scan. A 100M document collection with no index on the filter field will take seconds per query. Document databases have the same fundamental indexing requirements as relational databases: filter fields, sort fields, join fields all need indexes. The only difference from SQL is compound index syntax (ESR rule). Run `db.collection.getIndexes()` to audit what indexes exist, and use `explain('executionStats')` to see if queries use them." |
| "Transactions not available in MongoDB" | "MongoDB doesn't support transactions — that's a NoSQL trade-off" | "MongoDB 4.0+ supports multi-document ACID transactions using sessions. So multi-document updates can be wrapped in a transaction with commit/rollback semantics — similar to SQL BEGIN/COMMIT. However, MongoDB transactions are significantly slower than single-document operations (cross-shard transactions especially), and the recommended design approach is still to model your data so that a single document update is sufficient for most operations. Use transactions for true multi-document atomic scenarios — don't use them as a crutch to avoid proper data model design." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, a Node.js service stored user activity events in MongoDB. The initial schema embedded all events as an array inside the user document. At first, this was fine — new users had few events. Within six months, power users had 10,000+ events in their document. Some documents hit several MB. Reads slowed because loading any user data loaded the entire event array. We migrated to a separate `user_events` collection with user_id as a referenced field and `created_at` index for time-range queries. Paginated reads replaced full-document loads. Response times dropped from ~800ms to ~40ms for the user activity endpoint. Lesson learned: never embed unbounded collections."

---

## 8. Scale Evolution

**Small dataset:** Flexible schema and fast development are MongoDB's main benefits. Simple queries by _id or indexed fields. No aggregation complexity needed.

**Medium dataset:** Aggregation pipelines for analytics. Compound indexes for common query patterns. Explicit schema validation (MongoDB JSON Schema validation) to prevent bad documents.

**Large dataset:** MongoDB sharding for horizontal scaling. Shard key selection critical (same pitfalls as SQL sharding). Change Streams for event-driven sync to Elasticsearch or Redis. TTL indexes for automatic cleanup of time-limited data.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant configuration documents with variable attributes per payment type — document store fits naturally. Aggregation pipeline for merchant revenue analytics. | "Design the MongoDB schema for a merchant who can configure different webhook and callback settings per payment method." |
| Swiggy / Meesho | Restaurant menu items with different attributes per cuisine type. Menu is updated frequently by restaurant partners — flexible schema reduces friction. | "How would you model a restaurant menu in MongoDB to handle different item types (food, beverage, combo) with different attributes?" |
| Adobe / Microsoft | Creative asset metadata varies heavily by asset type (photo vs video vs vector vs document). Document model fits better than rigid relational columns. | "Design the asset metadata storage for a cloud digital asset management system with 20+ asset types." |
| SAP Labs (current) | SAP Commerce Cloud (Hybris) uses MongoDB for product content and flexible attribute sets. Understanding MongoDB document design is relevant for SAP B2C platform development. | "How would you model a Hybris product's extensible attribute sets in MongoDB?" |

---

## 10. Related Topics — What to Study Next

- **Topic 96 — When to Choose NoSQL** — the decision framework for choosing MongoDB; read together as a pair
- **Topic 98 — Key-Value Stores (Redis)** — complements MongoDB; Redis for caching MongoDB query results reduces read pressure on MongoDB
- **Topic 100 — Choosing the Right Database** — synthesises all database types covered into a decision framework for system design interviews

---

*Part 5 · Document Stores — MongoDB Patterns · Full Stack Interview Guide · Hruday D · 2026*
