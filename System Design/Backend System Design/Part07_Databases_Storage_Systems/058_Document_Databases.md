# 58. Document Databases

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Document Databases**: NoSQL databases storing data as self-contained documents (typically JSON/BSON) with flexible schema—optimized for hierarchical data, rapid development, and horizontal scalability without complex JOINs.

### Core Concept

**What it is:**
- **Document-oriented storage**: Each record is a document (JSON-like structure)
- **Flexible schema**: Different documents can have different fields (no rigid table structure)
- **Embedded data**: Store related data together (denormalization)
- **Hierarchical structure**: Nested objects and arrays within documents
- **Native JSON support**: Direct mapping to application objects (no ORM impedance mismatch)

**Why it exists:**
- **Developer productivity**: Schema flexibility accelerates development (no migrations for field additions)
- **Object mapping**: Natural fit for object-oriented programming (documents ≈ objects)
- **Scaling**: Horizontal scaling via sharding without distributed transactions
- **Agility**: Evolve schema without downtime or complex migrations
- **Complex data**: Handle nested, variable structures (e.g., product attributes, user preferences)

**Simple analogy:**
- **Relational database**: Like a filing cabinet with strict folders
  - Everything must fit predefined structure
  - Related data in separate drawers (tables)
  - Find information by cross-referencing (JOINs)
- **Document database**: Like a collection of documents/folders
  - Each document self-contained (all related info together)
  - Variable structure (invoice ≠ receipt ≠ contract)
  - Retrieve complete document in one operation

### Key Components

**1. Document Structure (BSON in MongoDB)**
```json
{
  "_id": "507f1f77bcf86cd799439011",  // Auto-generated unique ID
  "user_id": 1000,
  "name": "John Doe",
  "email": "john@example.com",
  "address": {                         // Embedded object
    "street": "123 Main St",
    "city": "San Francisco",
    "zip": "94102"
  },
  "orders": [                          // Embedded array
    {
      "order_id": 5001,
      "date": "2024-01-15",
      "total": 99.99,
      "items": [
        {"product": "Laptop", "price": 999.99, "qty": 1}
      ]
    }
  ],
  "tags": ["premium", "verified"],     // Array of primitives
  "created_at": ISODate("2024-01-01T00:00:00Z"),
  "metadata": {                        // Flexible nested data
    "source": "mobile_app",
    "version": "2.1.0"
  }
}
```

**2. Collections**
- **Collection**: Group of documents (like table in relational DB)
- No enforced schema (documents can vary)
- Indexed for fast queries
- Sharded for horizontal scaling

**3. Querying**
- **Find by field**: `db.users.find({email: "john@example.com"})`
- **Nested field**: `db.users.find({"address.city": "San Francisco"})`
- **Array queries**: `db.users.find({tags: "premium"})`
- **Range queries**: `db.orders.find({total: {$gte: 100}})`

### Popular Document Databases

**MongoDB:**
- Most popular document database
- Rich query language (aggregation pipelines)
- ACID transactions (multi-document since 4.0)
- Horizontal scaling (auto-sharding)
- Replication (replica sets)
- Use cases: Content management, catalogs, user profiles, IoT data

**Couchbase:**
- Built-in caching (in-memory + persistent)
- SQL-like query language (N1QL)
- Mobile sync (Couchbase Lite)
- Use cases: Mobile apps, user profiles, session store

**Amazon DocumentDB:**
- MongoDB-compatible API
- Fully managed (AWS)
- Automatic backups, scaling
- Use cases: Same as MongoDB but serverless preference

### Why Document Databases Matter

**Business Impact:**
- **Time to market**: 30-50% faster development (no schema migrations)
- **Scalability**: Handle millions of users via horizontal scaling
- **Cost efficiency**: Fewer JOINs = less compute, cheaper servers
- **Flexibility**: Adapt to changing requirements without downtime
- **Developer satisfaction**: Work with native objects (no ORM complexity)

**Role in interviews:**
- FAANG asks: "Design a product catalog for Amazon"
- Data modeling: "How to store polymorphic data (posts, comments, videos)?"
- Scale questions: "Handle 100M users with variable profile schemas"
- Trade-off questions: "When to embed vs reference?"

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🍃 MongoDB Deep Dive

#### Architecture and Components

```
┌─────────────────────────────────────────────────────────────┐
│          MONGODB ARCHITECTURE (Replica Set)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CLIENT APPLICATION                                 │    │
│  │  - MongoDB Driver (connection pool)                 │    │
│  │  - Automatic retry logic                            │    │
│  │  - Read preference (primary, secondary)             │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  REPLICA SET (High Availability)                    │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  PRIMARY                                 │      │    │
│  │  │  - All writes                            │      │    │
│  │  │  - Reads (by default)                    │      │    │
│  │  │  - Oplog (operation log)                 │      │    │
│  │  └────────────┬─────────────────────────────┘      │    │
│  │               │ Async replication (oplog)           │    │
│  │       ┌───────┴────────┐                            │    │
│  │       ▼                ▼                            │    │
│  │  ┌─────────┐      ┌─────────┐                      │    │
│  │  │SECONDARY│      │SECONDARY│                      │    │
│  │  │- Reads  │      │- Reads  │                      │    │
│  │  │(optional)│      │(optional)│                      │    │
│  │  └─────────┘      └─────────┘                      │    │
│  │                                                      │    │
│  │  Automatic Failover:                                │    │
│  │  - Heartbeat every 2 seconds                        │    │
│  │  - Primary fails → Secondary elected                │    │
│  │  - Election via Raft consensus                      │    │
│  │  - Typical failover: 10-30 seconds                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          MONGODB SHARDED CLUSTER                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  APPLICATION SERVERS                                │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  MONGOS (Query Router) - Multiple Instances         │    │
│  │  - Route queries to appropriate shards              │    │
│  │  - Merge results from multiple shards               │    │
│  │  - No persistent state (stateless)                  │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CONFIG SERVERS (Replica Set)                       │    │
│  │  - Store cluster metadata                           │    │
│  │  - Shard key ranges (chunk mappings)                │    │
│  │  - 3 config servers for high availability           │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SHARDS (Each is a Replica Set)                     │    │
│  │                                                      │    │
│  │  ┌──────────────────┐  ┌──────────────────┐        │    │
│  │  │  Shard 1         │  │  Shard 2         │        │    │
│  │  │  Range: A-M      │  │  Range: N-Z      │        │    │
│  │  │  ┌────────────┐  │  │  ┌────────────┐  │        │    │
│  │  │  │  Primary   │  │  │  │  Primary   │  │        │    │
│  │  │  └─────┬──────┘  │  │  └─────┬──────┘  │        │    │
│  │  │    ┌───┴────┐    │  │    ┌───┴────┐    │        │    │
│  │  │    ▼        ▼    │  │    ▼        ▼    │        │    │
│  │  │  [Sec]   [Sec]   │  │  [Sec]   [Sec]   │        │    │
│  │  └──────────────────┘  └──────────────────┘        │    │
│  │                                                      │    │
│  │  ┌──────────────────┐                               │    │
│  │  │  Shard 3         │  (More shards...)             │    │
│  │  │  Range: 0-9      │                               │    │
│  │  │  ┌────────────┐  │                               │    │
│  │  │  │  Primary   │  │                               │    │
│  │  │  └─────┬──────┘  │                               │    │
│  │  │    ┌───┴────┐    │                               │    │
│  │  │    ▼        ▼    │                               │    │
│  │  │  [Sec]   [Sec]   │                               │    │
│  │  └──────────────────┘                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Chunk Distribution:                                         │
│  - Collection divided into chunks (default 64 MB)            │
│  - Each chunk: Range of shard key values                    │
│  - Balancer: Automatically migrates chunks between shards   │
│  - Example: users collection sharded by user_id             │
│    Shard 1: user_id 1-1000000                               │
│    Shard 2: user_id 1000001-2000000                         │
│    Shard 3: user_id 2000001-3000000                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

MongoDB Storage Engine (WiredTiger):
═══════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  CLIENT QUERY                                                │
│       ↓                                                      │
│  ┌─────────────────────────────────────┐                    │
│  │  QUERY OPTIMIZER                    │                    │
│  │  - Analyze query                    │                    │
│  │  - Choose index                     │                    │
│  │  - Generate execution plan          │                    │
│  └─────────────┬───────────────────────┘                    │
│                ↓                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  WIREDTIGER CACHE (RAM)             │                    │
│  │  - Default: 50% of RAM - 1 GB       │                    │
│  │  - LRU eviction                     │                    │
│  │  - Dirty pages written periodically │                    │
│  └─────────────┬───────────────────────┘                    │
│                ↓                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  JOURNAL (Write-Ahead Log)          │                    │
│  │  - Durability guarantee             │                    │
│  │  - Flush every 100ms (default)      │                    │
│  │  - Replay on crash recovery         │                    │
│  └─────────────┬───────────────────────┘                    │
│                ↓                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  DISK STORAGE                       │                    │
│  │  - BSON documents                   │                    │
│  │  - B-tree indexes                   │                    │
│  │  - Compression (snappy/zlib/zstd)   │                    │
│  └─────────────────────────────────────┘                    │
│                                                              │
│  MVCC (Multi-Version Concurrency Control):                  │
│  - Readers don't block writers                              │
│  - Writers don't block readers                              │
│  - Snapshot isolation                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Data Modeling: Embedded vs Referenced

```javascript
// ═══════════════════════════════════════════════════════════
// MongoDB Data Modeling Patterns
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// PATTERN 1: EMBEDDING (Denormalization)
// ─────────────────────────────────────────────────────────

// Use when: One-to-few relationship, data accessed together

// Blog post with comments embedded
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "title": "MongoDB Data Modeling",
  "author": "John Doe",
  "content": "Content here...",
  "published_date": ISODate("2024-01-15"),
  "comments": [  // ← EMBEDDED
    {
      "comment_id": 1,
      "user": "Alice",
      "text": "Great post!",
      "date": ISODate("2024-01-16")
    },
    {
      "comment_id": 2,
      "user": "Bob",
      "text": "Thanks for sharing",
      "date": ISODate("2024-01-17")
    }
  ],
  "tags": ["mongodb", "databases", "nosql"]
}

// Benefits:
// ✅ Single query retrieves post + comments
// ✅ No JOINs (faster reads)
// ✅ Atomic updates (update post + add comment in one operation)
// ✅ Better locality (data stored together on disk)

// Drawbacks:
// ⚠️ Document size limit (16 MB in MongoDB)
// ⚠️ Duplication if embedded data shared across documents
// ⚠️ Complex to query embedded data across collection
// ⚠️ Unbounded growth (comments could grow indefinitely)

// MongoDB operations:
const { MongoClient } = require('mongodb');

// Insert post with embedded comments
await db.collection('posts').insertOne({
  title: "MongoDB Data Modeling",
  author: "John Doe",
  content: "Content here...",
  comments: []
});

// Add comment (array push)
await db.collection('posts').updateOne(
  { _id: ObjectId("507f1f77bcf86cd799439011") },
  {
    $push: {
      comments: {
        comment_id: 3,
        user: "Charlie",
        text: "Excellent!",
        date: new Date()
      }
    }
  }
);

// Query post with comments
const post = await db.collection('posts').findOne(
  { _id: ObjectId("507f1f77bcf86cd799439011") }
);
// Returns entire document including all comments

// ─────────────────────────────────────────────────────────
// PATTERN 2: REFERENCING (Normalization)
// ─────────────────────────────────────────────────────────

// Use when: One-to-many, many-to-many, large/unbounded data

// Posts collection:
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "title": "MongoDB Data Modeling",
  "author_id": ObjectId("507f1f77bcf86cd799439012"),  // ← REFERENCE
  "content": "Content here...",
  "published_date": ISODate("2024-01-15")
}

// Comments collection (separate):
{
  "_id": ObjectId("507f1f77bcf86cd799439020"),
  "post_id": ObjectId("507f1f77bcf86cd799439011"),  // ← REFERENCE
  "user_id": ObjectId("507f1f77bcf86cd799439013"),
  "text": "Great post!",
  "date": ISODate("2024-01-16")
}

// Users collection:
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "name": "John Doe",
  "email": "john@example.com"
}

// Benefits:
// ✅ No duplication (single source of truth)
// ✅ Unlimited relationships (no document size limit)
// ✅ Easy to query comments independently
// ✅ Flexible schema evolution

// Drawbacks:
// ⚠️ Multiple queries required (application-level JOINs)
// ⚠️ No atomic updates across collections (need transactions)
// ⚠️ Potential consistency issues

// MongoDB operations:

// Insert post
const postResult = await db.collection('posts').insertOne({
  title: "MongoDB Data Modeling",
  author_id: ObjectId("507f1f77bcf86cd799439012"),
  content: "Content here...",
  published_date: new Date()
});
const postId = postResult.insertedId;

// Insert comments (separate collection)
await db.collection('comments').insertMany([
  {
    post_id: postId,
    user_id: ObjectId("507f1f77bcf86cd799439013"),
    text: "Great post!",
    date: new Date()
  },
  {
    post_id: postId,
    user_id: ObjectId("507f1f77bcf86cd799439014"),
    text: "Thanks for sharing",
    date: new Date()
  }
]);

// Query post with comments (two queries):
const post = await db.collection('posts').findOne({ _id: postId });
const comments = await db.collection('comments')
  .find({ post_id: postId })
  .toArray();

// Or use $lookup (aggregation JOIN):
const postWithComments = await db.collection('posts').aggregate([
  { $match: { _id: postId } },
  {
    $lookup: {
      from: 'comments',
      localField: '_id',
      foreignField: 'post_id',
      as: 'comments'
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'author_id',
      foreignField: '_id',
      as: 'author'
    }
  },
  { $unwind: '$author' }  // Convert array to object
]).toArray();

// Result:
// {
//   "_id": ObjectId("..."),
//   "title": "MongoDB Data Modeling",
//   "author": { "_id": ..., "name": "John Doe", "email": "..." },
//   "content": "...",
//   "comments": [
//     { "_id": ..., "post_id": ..., "text": "Great post!", ... },
//     { "_id": ..., "post_id": ..., "text": "Thanks for sharing", ... }
//   ]
// }

// ─────────────────────────────────────────────────────────
// PATTERN 3: HYBRID (Embedded + Reference)
// ─────────────────────────────────────────────────────────

// Use when: Need both fast reads and flexibility

// E-commerce order with embedded line items but referenced products
{
  "_id": ObjectId("507f1f77bcf86cd799439030"),
  "order_id": "ORD-2024-001",
  "customer_id": ObjectId("507f1f77bcf86cd799439031"),  // Reference
  "order_date": ISODate("2024-01-15"),
  "status": "shipped",
  "line_items": [  // Embedded (snapshot at order time)
    {
      "product_id": ObjectId("507f1f77bcf86cd799439040"),  // Reference
      "product_name": "Laptop",  // Denormalized (snapshot)
      "price": 999.99,           // Price at order time
      "quantity": 1,
      "subtotal": 999.99
    },
    {
      "product_id": ObjectId("507f1f77bcf86cd799439041"),
      "product_name": "Mouse",
      "price": 29.99,
      "quantity": 2,
      "subtotal": 59.98
    }
  ],
  "shipping_address": {  // Embedded (belongs to order)
    "street": "123 Main St",
    "city": "San Francisco",
    "zip": "94102"
  },
  "total": 1059.97
}

// Benefits:
// ✅ Order is self-contained (single query)
// ✅ Historical snapshot (price at order time preserved)
// ✅ Can still link to current product (product_id)
// ✅ Fast order retrieval without JOINs

// Products collection (separate, can change):
{
  "_id": ObjectId("507f1f77bcf86cd799439040"),
  "name": "Laptop",
  "price": 899.99,  // Current price (may differ from order)
  "description": "...",
  "stock": 50
}

// ─────────────────────────────────────────────────────────
// PATTERN 4: EXTENDED REFERENCE (Two-Way Referencing)
// ─────────────────────────────────────────────────────────

// Use when: Need to query relationship from both sides

// Users collection:
{
  "_id": ObjectId("507f1f77bcf86cd799439050"),
  "name": "Alice",
  "friends": [  // Array of friend IDs
    ObjectId("507f1f77bcf86cd799439051"),
    ObjectId("507f1f77bcf86cd799439052")
  ]
}

// Query: Find Alice's friends
db.users.findOne({ _id: ObjectId("507f1f77bcf86cd799439050") })

// Query: Find all users who are friends with Alice
db.users.find({ friends: ObjectId("507f1f77bcf86cd799439050") })

// ─────────────────────────────────────────────────────────
// Decision Matrix: Embed vs Reference
// ─────────────────────────────────────────────────────────

/*
┌──────────────────┬─────────────┬─────────────┐
│ Factor           │ EMBED       │ REFERENCE   │
├──────────────────┼─────────────┼─────────────┤
│ Relationship     │ One-to-few  │ One-to-many │
│ Cardinality      │ Bounded     │ Unbounded   │
│ Access pattern   │ Together    │ Independent │
│ Update frequency │ Rare        │ Frequent    │
│ Data duplication │ OK          │ Avoid       │
│ Atomicity needed │ Yes         │ No          │
│ Document size    │ <16 MB      │ No limit    │
└──────────────────┴─────────────┴─────────────┘

Examples:
- Embed: User profile + addresses (1-3 addresses)
- Embed: Blog post + comments (if <100 comments)
- Reference: User + orders (unbounded, grow over time)
- Reference: Products + categories (many-to-many)
- Hybrid: Order + line items (snapshot) + product reference
*/
```

#### Advanced Querying and Aggregation

```javascript
// ═══════════════════════════════════════════════════════════
// MongoDB Advanced Queries
// ═══════════════════════════════════════════════════════════

const { MongoClient } = require('mongodb');

// ─────────────────────────────────────────────────────────
// 1. Complex Queries
// ─────────────────────────────────────────────────────────

// Find users in San Francisco, age 25-35, premium tier
const users = await db.collection('users').find({
  'address.city': 'San Francisco',  // Nested field
  age: { $gte: 25, $lte: 35 },      // Range query
  tier: 'premium',
  tags: { $in: ['verified', 'active'] }  // Array contains any
}).toArray();

// Find posts with 5+ comments or 100+ likes
const popularPosts = await db.collection('posts').find({
  $or: [
    { comment_count: { $gte: 5 } },
    { likes: { $gte: 100 } }
  ]
}).toArray();

// Find users who have NOT made any orders
const inactiveUsers = await db.collection('users').find({
  orders: { $exists: false }
  // Or: orders: { $size: 0 }  if orders is empty array
}).toArray();

// Text search (requires text index)
await db.collection('posts').createIndex({ content: 'text' });
const results = await db.collection('posts').find({
  $text: { $search: 'mongodb nosql' }
}).toArray();

// ─────────────────────────────────────────────────────────
// 2. Aggregation Pipeline (Complex Analytics)
// ─────────────────────────────────────────────────────────

// Example: Calculate total revenue by category and month

const revenueByCategory = await db.collection('orders').aggregate([
  // Stage 1: Filter (only completed orders in 2024)
  {
    $match: {
      status: 'completed',
      order_date: {
        $gte: new Date('2024-01-01'),
        $lt: new Date('2025-01-01')
      }
    }
  },
  
  // Stage 2: Unwind line items (flatten array)
  { $unwind: '$line_items' },
  
  // Stage 3: Lookup product details
  {
    $lookup: {
      from: 'products',
      localField: 'line_items.product_id',
      foreignField: '_id',
      as: 'product'
    }
  },
  { $unwind: '$product' },  // Convert array to object
  
  // Stage 4: Add computed fields
  {
    $addFields: {
      month: { $month: '$order_date' },
      revenue: '$line_items.subtotal'
    }
  },
  
  // Stage 5: Group by category and month
  {
    $group: {
      _id: {
        category: '$product.category',
        month: '$month'
      },
      total_revenue: { $sum: '$revenue' },
      order_count: { $sum: 1 },
      avg_order_value: { $avg: '$revenue' }
    }
  },
  
  // Stage 6: Sort by revenue (descending)
  { $sort: { total_revenue: -1 } },
  
  // Stage 7: Format output
  {
    $project: {
      _id: 0,
      category: '$_id.category',
      month: '$_id.month',
      total_revenue: { $round: ['$total_revenue', 2] },
      order_count: 1,
      avg_order_value: { $round: ['$avg_order_value', 2] }
    }
  }
]).toArray();

// Result:
// [
//   { category: 'Electronics', month: 1, total_revenue: 150000, order_count: 500, avg_order_value: 300 },
//   { category: 'Books', month: 1, total_revenue: 50000, order_count: 2000, avg_order_value: 25 },
//   ...
// ]

// ─────────────────────────────────────────────────────────
// 3. Real-Time Analytics (Change Streams)
// ─────────────────────────────────────────────────────────

// Watch for new orders in real-time
const changeStream = db.collection('orders').watch([
  { $match: { operationType: 'insert' } }
]);

changeStream.on('change', (change) => {
  const newOrder = change.fullDocument;
  console.log(`New order: ${newOrder.order_id}, total: $${newOrder.total}`);
  
  // Trigger real-time actions:
  // - Send confirmation email
  // - Update inventory
  // - Notify warehouse
  // - Update analytics dashboard
});

// Watch for order status changes
const statusStream = db.collection('orders').watch([
  {
    $match: {
      operationType: 'update',
      'updateDescription.updatedFields.status': { $exists: true }
    }
  }
]);

statusStream.on('change', (change) => {
  const orderId = change.documentKey._id;
  const newStatus = change.updateDescription.updatedFields.status;
  console.log(`Order ${orderId} status changed to: ${newStatus}`);
});

// ─────────────────────────────────────────────────────────
// 4. Geospatial Queries
// ─────────────────────────────────────────────────────────

// Store locations with GeoJSON
await db.collection('stores').insertOne({
  name: "Downtown Store",
  location: {
    type: "Point",
    coordinates: [-122.4194, 37.7749]  // [longitude, latitude]
  }
});

// Create 2dsphere index
await db.collection('stores').createIndex({ location: '2dsphere' });

// Find stores within 5km of user location
const nearbyStores = await db.collection('stores').find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-122.4, 37.78]  // User location
      },
      $maxDistance: 5000  // 5 km in meters
    }
  }
}).limit(10).toArray();

// Find stores within polygon (e.g., delivery zone)
const storesInZone = await db.collection('stores').find({
  location: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [[
          [-122.5, 37.7],
          [-122.3, 37.7],
          [-122.3, 37.9],
          [-122.5, 37.9],
          [-122.5, 37.7]  // Close polygon
        ]]
      }
    }
  }
}).toArray();

// ─────────────────────────────────────────────────────────
// 5. Full-Text Search
// ─────────────────────────────────────────────────────────

// Create text index on multiple fields
await db.collection('products').createIndex({
  name: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,         // Name matches weighted higher
    description: 5,
    tags: 1
  }
});

// Search with scoring
const searchResults = await db.collection('products').find(
  { $text: { $search: 'laptop gaming performance' } },
  { score: { $meta: 'textScore' } }
).sort({ score: { $meta: 'textScore' } })
  .limit(20)
  .toArray();

// Result includes relevance score
// [
//   { name: "Gaming Laptop Pro", score: 8.5, ... },
//   { name: "Performance Laptop", score: 6.2, ... },
//   ...
// ]
```

#### Indexing Strategies

```javascript
// ═══════════════════════════════════════════════════════════
// MongoDB Indexing Best Practices
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// 1. Single Field Index
// ─────────────────────────────────────────────────────────

// Index on email for fast user lookup
await db.collection('users').createIndex({ email: 1 });  // 1 = ascending

// Query benefits from index (O(log n) instead of O(n))
const user = await db.collection('users').findOne({ email: 'john@example.com' });

// Check if index used:
const explain = await db.collection('users')
  .find({ email: 'john@example.com' })
  .explain('executionStats');

console.log(explain.executionStats.executionStages.stage);
// "IXSCAN" = index used ✅
// "COLLSCAN" = full collection scan ❌

// ─────────────────────────────────────────────────────────
// 2. Compound Index (Multiple Fields)
// ─────────────────────────────────────────────────────────

// Index for query: city + age range + sort by created_at
await db.collection('users').createIndex({
  'address.city': 1,
  age: 1,
  created_at: -1  // -1 = descending (newest first)
});

// Query uses compound index:
const results = await db.collection('users')
  .find({
    'address.city': 'San Francisco',
    age: { $gte: 25, $lte: 35 }
  })
  .sort({ created_at: -1 })
  .limit(20)
  .toArray();

// Index order matters!
// Good: { city: 1, age: 1, created_at: -1 }
// - Queries on city ✅
// - Queries on city + age ✅
// - Queries on city + age + sort created_at ✅
//
// Bad: { created_at: -1, city: 1, age: 1 }
// - Queries on city alone ❌ (doesn't use index)

// ESR Rule (Equality, Sort, Range):
// 1. Equality filters first (city = 'SF')
// 2. Sort fields second (sort by created_at)
// 3. Range filters last (age >= 25 AND age <= 35)

// ─────────────────────────────────────────────────────────
// 3. Unique Index (Enforce Uniqueness)
// ─────────────────────────────────────────────────────────

// Ensure email uniqueness
await db.collection('users').createIndex(
  { email: 1 },
  { unique: true }
);

// Insert with duplicate email fails
try {
  await db.collection('users').insertOne({
    name: 'Alice',
    email: 'john@example.com'  // Already exists
  });
} catch (error) {
  console.log('Duplicate email error');
}

// Compound unique index (e.g., unique per tenant)
await db.collection('users').createIndex(
  { tenant_id: 1, email: 1 },
  { unique: true }
);
// Now: Same email allowed across different tenants

// ─────────────────────────────────────────────────────────
// 4. Sparse Index (Index Only Documents with Field)
// ─────────────────────────────────────────────────────────

// Index phone_number, but not all users have phone
await db.collection('users').createIndex(
  { phone_number: 1 },
  { sparse: true }
);

// Smaller index size (excludes documents without phone_number)
// Query: Find users with phone_number
const usersWithPhone = await db.collection('users')
  .find({ phone_number: { $exists: true } })
  .toArray();  // Uses sparse index ✅

// ─────────────────────────────────────────────────────────
// 5. TTL Index (Automatic Document Expiration)
// ─────────────────────────────────────────────────────────

// Auto-delete sessions after 30 minutes of inactivity
await db.collection('sessions').createIndex(
  { last_accessed: 1 },
  { expireAfterSeconds: 1800 }  // 30 minutes
);

// Insert session
await db.collection('sessions').insertOne({
  session_id: 'abc123',
  user_id: 1000,
  last_accessed: new Date()
});

// MongoDB automatically deletes document 30 minutes after last_accessed
// Background job runs every 60 seconds

// ─────────────────────────────────────────────────────────
// 6. Partial Index (Index Subset of Documents)
// ─────────────────────────────────────────────────────────

// Index only premium users
await db.collection('users').createIndex(
  { email: 1 },
  {
    partialFilterExpression: { tier: 'premium' }
  }
);

// Smaller index, faster queries on premium users
const premiumUser = await db.collection('users')
  .findOne({ email: 'john@example.com', tier: 'premium' });
// Uses partial index ✅

// Query without tier filter doesn't use index
const anyUser = await db.collection('users')
  .findOne({ email: 'john@example.com' });
// Doesn't use partial index (full collection scan) ❌

// ─────────────────────────────────────────────────────────
// 7. Multikey Index (Index Array Fields)
// ─────────────────────────────────────────────────────────

// Index tags array
await db.collection('posts').createIndex({ tags: 1 });

// Query posts with 'mongodb' tag (uses multikey index)
const posts = await db.collection('posts')
  .find({ tags: 'mongodb' })
  .toArray();

// MongoDB creates index entry for each array element
// Document: { tags: ['mongodb', 'nosql', 'database'] }
// Index entries: 'mongodb' → doc, 'nosql' → doc, 'database' → doc

// ⚠️ Limitation: Only one array field per compound index

// ─────────────────────────────────────────────────────────
// Index Management
// ─────────────────────────────────────────────────────────

// List all indexes
const indexes = await db.collection('users').indexes();
console.log(indexes);

// Drop index
await db.collection('users').dropIndex('email_1');

// Drop all indexes (except _id)
await db.collection('users').dropIndexes();

// Index statistics
const stats = await db.collection('users').aggregate([
  { $indexStats: {} }
]).toArray();
// Shows index usage frequency (optimize unused indexes)
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Content Management System (CMS) for News Website

**Requirements:**
- 10M articles
- 100M monthly active users
- 1B page views/month
- Article size: 50 KB average (text + metadata)
- Comments: 10 comments/article average, 1 KB/comment
- Peak traffic: 5x average (breaking news)
- Read:write ratio: 1000:1 (read-heavy)

**Storage Estimation:**

```
Articles:
= 10M articles × 50 KB
= 500 GB raw article data

Comments:
= 10M articles × 10 comments × 1 KB
= 100 GB comment data

Indexes (estimate 30% of data size):
= (500 GB + 100 GB) × 0.3
= 180 GB indexes

Total storage:
= 500 GB + 100 GB + 180 GB
= 780 GB

With replication (3 copies):
= 780 GB × 3 = 2.34 TB

Growth (1M new articles/year):
= 1M × 50 KB = 50 GB/year
= 150 GB/year with replication

3-year capacity: 2.34 TB + (150 GB × 3) = 2.79 TB
```

**Throughput Estimation:**

```
Monthly page views: 1B
Daily page views: 1B / 30 = 33.3M
Average QPS: 33.3M / 86400 = 385 queries/second

Peak QPS (5x average):
= 385 × 5 = 1,925 queries/second

Article writes (new + updates):
= 10k articles/day + 50k updates/day = 60k/day
= 60k / 86400 = 0.7 writes/second average
= 3.5 writes/second peak

Comment writes:
= 100k comments/day (assuming 1% of page views)
= 100k / 86400 = 1.2 writes/second
= 6 writes/second peak

Total writes: 0.7 + 1.2 = 1.9 writes/second average (~10/sec peak)
Total reads: ~2,000 reads/second peak
```

**MongoDB Cluster Design:**

```
Replica Set Configuration (without sharding):
═════════════════════════════════════════════

1 Primary + 2 Secondary replicas

Server specs (AWS):
- Instance: r6g.2xlarge (8 vCPU, 64 GB RAM)
- Storage: 1 TB gp3 SSD per instance
- Network: 10 Gbps

Memory calculation:
- Working set: Recent articles + popular articles
- Estimate 20% of articles accessed frequently
- Working set size: 780 GB × 0.2 = 156 GB
- Add indexes: 156 GB + 36 GB = 192 GB
- Fits in 64 GB RAM with WiredTiger cache? No
- Need 256 GB RAM or sharding

Revised server: r6g.8xlarge (32 vCPU, 256 GB RAM)
- WiredTiger cache: 128 GB (50% of RAM)
- Working set: 192 GB
- Requires cache miss to disk, but acceptable

Read scaling:
- 2,000 reads/second peak
- MongoDB can handle 10k-50k reads/second with indexes
- Sufficient capacity ✅

Write performance:
- 10 writes/second peak
- MongoDB handles 10k+ writes/second
- Not a bottleneck ✅

Cost (AWS):
- Primary: r6g.8xlarge on-demand = $1.3824/hour
- 2 Replicas: Same instance type
- Total: $1.3824 × 3 = $4.15/hour
- Monthly: $4.15 × 730 = $3,030/month

With sharding (for future growth):
═══════════════════════════════════

If reach 100M articles or need more throughput:

Shard key: article_id (hash-based)
- Even distribution
- No hot partitions

3 shards × 3 servers (1 primary + 2 replicas per shard) = 9 servers
Each shard handles: 10M / 3 = 3.3M articles

Server per shard: r6g.2xlarge (8 vCPU, 64 GB RAM)
Cost: $0.3456/hour × 9 = $3.11/hour = $2,270/month

Config servers: 3 × t3.small = $0.0208 × 3 = minimal
Mongos routers: 3 × t3.medium = $0.0416 × 3 = minimal

Total: ~$2,500/month (cheaper than single large instance)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Document Database Schema Design Patterns

```javascript
// ═══════════════════════════════════════════════════════════
// MongoDB Schema Design Patterns
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// PATTERN 1: Attribute Pattern (Variable Schema)
// ─────────────────────────────────────────────────────────

// Problem: Products have different attributes (laptop vs shirt)

// ❌ Bad: Separate fields (sparse, hard to query)
{
  product_id: "P001",
  name: "Laptop",
  brand: "Dell",
  screen_size: 15.6,   // Only laptops have this
  ram: "16GB",
  cpu: "Intel i7",
  color: null,         // Sparse field
  size: null           // Sparse field
}

// ✅ Good: Attribute array (flexible, queryable)
{
  product_id: "P001",
  name: "Laptop",
  category: "Electronics",
  attributes: [
    { key: "brand", value: "Dell" },
    { key: "screen_size", value: "15.6", unit: "inches" },
    { key: "ram", value: "16GB" },
    { key: "cpu", value: "Intel i7" }
  ]
}

// Index on attributes for fast queries
db.products.createIndex({ "attributes.key": 1, "attributes.value": 1 });

// Query products with specific attribute
db.products.find({
  attributes: {
    $elemMatch: {
      key: "ram",
      value: "16GB"
    }
  }
});

// ─────────────────────────────────────────────────────────
// PATTERN 2: Bucket Pattern (Time-Series Data)
// ─────────────────────────────────────────────────────────

// Problem: Millions of IoT sensor readings (one doc per reading = huge)

// ❌ Bad: One document per reading
{
  sensor_id: "S001",
  timestamp: ISODate("2024-01-15T10:00:00Z"),
  temperature: 22.5
}
// 1M readings/day × 365 days = 365M documents

// ✅ Good: Bucket readings by hour
{
  sensor_id: "S001",
  bucket_start: ISODate("2024-01-15T10:00:00Z"),
  bucket_end: ISODate("2024-01-15T11:00:00Z"),
  reading_count: 60,  // 1 per minute
  readings: [
    { timestamp: ISODate("2024-01-15T10:00:00Z"), temp: 22.5 },
    { timestamp: ISODate("2024-01-15T10:01:00Z"), temp: 22.6 },
    // ... 58 more readings
  ],
  avg_temp: 22.7,
  max_temp: 23.1,
  min_temp: 22.3
}
// 1M readings/day / 60 readings per bucket = 16.7k documents/day

// Reduction: 365M → 6M documents (98% reduction)

// ─────────────────────────────────────────────────────────
// PATTERN 3: Outlier Pattern (Handle Extreme Cases)
// ─────────────────────────────────────────────────────────

// Problem: Most users have 5-10 orders, but some have 10,000+

// ✅ Solution: Embed for typical users, reference for outliers
{
  user_id: 1000,
  name: "John Doe",
  orders: [  // Embedded for typical users
    { order_id: 5001, total: 99.99, date: "2024-01-01" },
    { order_id: 5002, total: 49.99, date: "2024-01-05" }
  ],
  has_many_orders: false
}

// Outlier user (10k+ orders):
{
  user_id: 9999,
  name: "Power User",
  orders: [  // Only recent 100 orders embedded
    { order_id: 50001, total: 99.99, date: "2024-12-01" },
    // ... 99 more
  ],
  has_many_orders: true,
  order_count: 10503
}

// Separate orders collection for outliers:
{
  user_id: 9999,
  order_id: 40001,
  total: 99.99,
  date: "2024-01-01"
}

// Query logic:
function getUserOrders(userId) {
  const user = db.users.findOne({ user_id: userId });
  
  if (user.has_many_orders) {
    // Fetch from separate collection
    return db.user_orders.find({ user_id: userId }).toArray();
  } else {
    // Return embedded orders
    return user.orders;
  }
}

// ─────────────────────────────────────────────────────────
// PATTERN 4: Computed Pattern (Pre-Calculate Aggregates)
// ─────────────────────────────────────────────────────────

// Problem: Calculating statistics on every query is expensive

// ❌ Bad: Calculate on read
db.orders.aggregate([
  { $match: { product_id: "P001" } },
  {
    $group: {
      _id: "$product_id",
      total_sales: { $sum: "$quantity" },
      total_revenue: { $sum: { $multiply: ["$quantity", "$price"] } }
    }
  }
]);
// Runs on every product page load

// ✅ Good: Pre-compute and store
{
  product_id: "P001",
  name: "Laptop",
  price: 999.99,
  stats: {  // Updated periodically or on write
    total_sales: 1523,
    total_revenue: 1523000.77,
    avg_rating: 4.5,
    review_count: 342,
    last_updated: ISODate("2024-01-15T10:00:00Z")
  }
}

// Update stats on new order (application logic):
db.products.updateOne(
  { product_id: "P001" },
  {
    $inc: {
      "stats.total_sales": quantity,
      "stats.total_revenue": quantity * price
    },
    $set: {
      "stats.last_updated": new Date()
    }
  }
);

// Read is instant (no aggregation needed)

// ─────────────────────────────────────────────────────────
// PATTERN 5: Subset Pattern (Limit Working Set Size)
// ─────────────────────────────────────────────────────────

// Problem: User has 1000 reviews, but only show recent 10

// ✅ Solution: Embed only subset
{
  product_id: "P001",
  name: "Laptop",
  recent_reviews: [  // Only last 10 reviews
    { user: "Alice", rating: 5, text: "Great!", date: "2024-01-15" },
    // ... 9 more
  ],
  review_count: 1523,
  avg_rating: 4.5
}

// All reviews in separate collection:
{
  product_id: "P001",
  reviews: [
    { user: "Alice", rating: 5, text: "Great!", date: "2024-01-15" },
    // ... all 1523 reviews
  ]
}

// Or: Paginate reviews from separate collection when user clicks "See all"
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### MongoDB Sharding Deep Dive

```javascript
// ═══════════════════════════════════════════════════════════
// MongoDB Sharding Strategies
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// Shard Key Selection (Most Important Decision)
// ─────────────────────────────────────────────────────────

/*
Good Shard Key Properties:
1. High cardinality (many unique values)
2. Even distribution (no hot partitions)
3. Query isolation (queries target single shard)
4. Monotonically increasing OK if combined with high cardinality

Bad Shard Key Properties:
❌ Low cardinality (e.g., country - only ~200 values)
❌ Monotonically increasing alone (e.g., timestamp)
❌ Random but no query isolation (every query scatters)
*/

// Example: Sharding users collection

// ❌ Bad: Shard by country
sh.shardCollection('mydb.users', { country: 1 });
// Problem: USA users on one shard (hot partition)

// ❌ Bad: Shard by _id (auto-generated ObjectId)
sh.shardCollection('mydb.users', { _id: 1 });
// Problem: Monotonically increasing (all writes to one shard)

// ✅ Good: Shard by hashed user_id
sh.shardCollection('mydb.users', { user_id: 'hashed' });
// Benefits:
// - Even distribution (hash function randomizes)
// - High cardinality (every user unique)
// - Query isolation (query user_id targets one shard)

// ✅ Good: Compound shard key (country + user_id)
sh.shardCollection('mydb.users', { country: 1, user_id: 1 });
// Benefits:
// - Queries by country stay on same shard (query isolation)
// - user_id adds cardinality (even distribution within country)
// - Can query country alone or country + user_id

// ─────────────────────────────────────────────────────────
// Sharding Process
// ─────────────────────────────────────────────────────────

// Step 1: Enable sharding on database
sh.enableSharding('mydb');

// Step 2: Create index on shard key
db.users.createIndex({ user_id: 'hashed' });

// Step 3: Shard collection
sh.shardCollection('mydb.users', { user_id: 'hashed' });

// Step 4: MongoDB automatically distributes data
// - Divides key range into chunks (default 64 MB)
// - Distributes chunks across shards
// - Balancer migrates chunks to maintain balance

// Check shard distribution
db.users.getShardDistribution();
// Output:
// Shard shard0001: 3523 docs, 256 MB
// Shard shard0002: 3498 docs, 254 MB
// Shard shard0003: 3479 docs, 252 MB
// Total: 10500 docs, 762 MB

// ─────────────────────────────────────────────────────────
// Querying Sharded Collections
// ─────────────────────────────────────────────────────────

// Targeted query (includes shard key)
db.users.find({ user_id: 1000 });
// mongos routes to single shard ✅
// Low latency (one network hop)

// Scatter-gather query (no shard key)
db.users.find({ email: 'john@example.com' });
// mongos queries all shards ❌
// Higher latency (multiple network hops + merge results)

// Minimize scatter-gather:
// 1. Include shard key in query when possible
// 2. Create indexes on non-shard-key fields
// 3. Use compound shard keys for common access patterns

// ─────────────────────────────────────────────────────────
// Handling Hot Shards
// ─────────────────────────────────────────────────────────

// Problem: Celebrity users (1M followers) create hot partition

// Solution 1: Choose better shard key (hash prevents hot spots)

// Solution 2: Split chunks manually
sh.splitAt('mydb.users', { user_id: 1000000 });
// Splits chunk at specific key value

// Solution 3: Move chunks manually
sh.moveChunk('mydb.users', { user_id: 1000000 }, 'shard0002');
// Move hot chunk to underutilized shard

// Solution 4: Add more shards
sh.addShard('mongodb://new-shard-host:27017');
// Balancer automatically redistributes

// ─────────────────────────────────────────────────────────
// Shard Key Refining (MongoDB 5.0+)
// ─────────────────────────────────────────────────────────

// Can't change shard key in old versions
// MongoDB 5.0+: Can refine shard key (add suffix)

// Original shard key: { country: 1 }
// Refined shard key: { country: 1, user_id: 1 }

db.adminCommand({
  refineCollectionShardKey: 'mydb.users',
  key: { country: 1, user_id: 1 }
});

// Note: Can only add suffix, can't completely change
```

### High Availability and Disaster Recovery

```javascript
// ═══════════════════════════════════════════════════════════
// MongoDB Replica Set Configuration
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// Read Preferences
// ─────────────────────────────────────────────────────────

const { MongoClient, ReadPreference } = require('mongodb');

const client = new MongoClient('mongodb://replica-set-host:27017', {
  replicaSet: 'rs0',
  readPreference: ReadPreference.SECONDARY_PREFERRED
});

/*
Read Preference Options:

1. primary (default)
   - All reads from primary
   - Strong consistency
   - Use for: Critical reads requiring latest data

2. primaryPreferred
   - Read from primary if available, else secondary
   - Use for: Fallback during primary failure

3. secondary
   - All reads from secondary
   - Eventual consistency (replication lag possible)
   - Use for: Analytics, reports (stale data OK)

4. secondaryPreferred
   - Read from secondary if available, else primary
   - Use for: Offload read traffic from primary

5. nearest
   - Read from lowest-latency member (primary or secondary)
   - Use for: Geographically distributed apps

Read Concern (consistency level):

- local: Return most recent data (no durability guarantee)
- majority: Data acknowledged by majority of replicas
- linearizable: Read own writes + total order
*/

// Example: Strong consistency read
const order = await db.collection('orders')
  .findOne(
    { order_id: 'ORD-001' },
    { readPreference: ReadPreference.PRIMARY, readConcern: { level: 'majority' } }
  );

// Example: Analytics query (stale OK, reduce primary load)
const stats = await db.collection('orders')
  .aggregate([...], { readPreference: ReadPreference.SECONDARY });

// ─────────────────────────────────────────────────────────
// Write Concerns
// ─────────────────────────────────────────────────────────

/*
Write Concern Options:

1. w: 1 (default)
   - Acknowledge when primary writes
   - Fast but no durability guarantee
   - Use for: Non-critical writes (logs, analytics)

2. w: "majority"
   - Acknowledge when majority of replicas write
   - Slower but durable (survives primary failure)
   - Use for: Critical data (orders, payments)

3. w: 0
   - Fire-and-forget (no acknowledgment)
   - Fastest but no confirmation
   - Use for: Fire-and-forget writes

j: true - Wait for journal commit (durability on disk)
*/

// Example: Critical write (durable)
await db.collection('orders').insertOne(
  { order_id: 'ORD-001', total: 99.99 },
  { writeConcern: { w: 'majority', j: true, wtimeout: 5000 } }
);
// Waits for majority + journal commit, 5sec timeout

// Example: Non-critical write (fast)
await db.collection('logs').insertOne(
  { level: 'INFO', message: 'User logged in' },
  { writeConcern: { w: 1 } }
);

// ─────────────────────────────────────────────────────────
// Backup Strategies
// ─────────────────────────────────────────────────────────

// 1. mongodump (logical backup)
// Pros: Portable, human-readable
// Cons: Slow for large datasets

// Backup:
$ mongodump --uri="mongodb://host:27017" --out=/backup/2024-01-15

// Restore:
$ mongorestore --uri="mongodb://host:27017" /backup/2024-01-15

// 2. File system snapshot (physical backup)
// Pros: Fast, consistent
// Cons: Requires filesystem/volume snapshot support

// AWS EBS snapshot:
$ db.fsyncLock();  // Flush writes and lock
$ aws ec2 create-snapshot --volume-id vol-123456
$ db.fsyncUnlock();

// 3. Continuous backup (MongoDB Atlas)
// Pros: Point-in-time recovery, automated
// Cons: Managed service only

// Point-in-time restore to any second in last 7 days
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### MongoDB Security Best Practices

```javascript
// ═══════════════════════════════════════════════════════════
// MongoDB Security Configuration
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────
// 1. Authentication
// ─────────────────────────────────────────────────────────

// Enable authentication in mongod.conf
/*
security:
  authorization: enabled
*/

// Create admin user
use admin
db.createUser({
  user: 'admin',
  pwd: 'secure-password',
  roles: [{ role: 'userAdminAnyDatabase', db: 'admin' }]
});

// Create application user (least privilege)
use mydb
db.createUser({
  user: 'app_user',
  pwd: 'app-password',
  roles: [
    { role: 'readWrite', db: 'mydb' }
  ]
});

// Connect with authentication
const client = new MongoClient(
  'mongodb://app_user:app-password@host:27017/mydb'
);

// ─────────────────────────────────────────────────────────
// 2. Role-Based Access Control (RBAC)
// ─────────────────────────────────────────────────────────

// Built-in roles:
// - read: Read data only
// - readWrite: Read + write data
// - dbAdmin: Database admin (indexes, stats)
// - userAdmin: Manage users
// - clusterAdmin: Cluster management

// Custom role (fine-grained permissions)
db.createRole({
  role: 'orderManager',
  privileges: [
    {
      resource: { db: 'mydb', collection: 'orders' },
      actions: ['find', 'insert', 'update']
      // Note: No 'remove' (can't delete orders)
    },
    {
      resource: { db: 'mydb', collection: 'users' },
      actions: ['find']  // Read-only users
    }
  ],
  roles: []  // No inherited roles
});

// Assign custom role to user
db.grantRolesToUser('order_service', ['orderManager']);

// ─────────────────────────────────────────────────────────
// 3. Encryption
// ─────────────────────────────────────────────────────────

// Encryption at rest (Enterprise only)
/*
security:
  enableEncryption: true
  encryptionKeyFile: /path/to/keyfile
*/

// Encryption in transit (TLS/SSL)
/*
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /path/to/cert.pem
    CAFile: /path/to/ca.pem
*/

// Connect with TLS
const client = new MongoClient(
  'mongodb://host:27017/mydb',
  {
    tls: true,
    tlsCertificateKeyFile: '/path/to/client-cert.pem',
    tlsCAFile: '/path/to/ca.pem'
  }
);

// ─────────────────────────────────────────────────────────
// 4. Field-Level Encryption (Client-Side)
// ─────────────────────────────────────────────────────────

// Encrypt sensitive fields before storing
const { ClientEncryption } = require('mongodb-client-encryption');

const encryption = new ClientEncryption(keyVaultClient, {
  keyVaultNamespace: 'encryption.__keyVault',
  kmsProviders: {
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  }
});

// Encrypt SSN before insert
const encryptedSSN = await encryption.encrypt(
  '123-45-6789',
  {
    algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
    keyId: dataKeyId
  }
);

await db.collection('users').insertOne({
  name: 'John Doe',
  ssn: encryptedSSN  // Stored encrypted
});

// Decrypt on read
const user = await db.collection('users').findOne({ name: 'John Doe' });
const decryptedSSN = await encryption.decrypt(user.ssn);

// ─────────────────────────────────────────────────────────
// 5. Audit Logging (Enterprise only)
// ─────────────────────────────────────────────────────────

/*
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{ "atype": { "$in": ["authenticate", "dropDatabase", "dropCollection"] } }'
*/

// Audit log entry example:
/*
{
  "atype": "dropCollection",
  "ts": { "$date": "2024-01-15T10:00:00.000Z" },
  "local": { "ip": "10.0.1.5", "port": 27017 },
  "remote": { "ip": "192.168.1.100", "port": 54321 },
  "users": [{ "user": "admin", "db": "admin" }],
  "param": { "ns": "mydb.users" },
  "result": 0
}
*/
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Uber - Trip Data Storage

**Challenge:**
- Millions of trips/day
- Complex nested data (pickup, dropoff, waypoints, fare breakdown)
- Flexible schema (new trip types, features added frequently)
- Need geospatial queries (find trips in area)
- Need time-series queries (user trip history)

**Solution: MongoDB Document Database**

**Data Model:**
```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "trip_id": "TRIP-2024-001",
  "status": "completed",
  "rider": {
    "user_id": 1000,
    "name": "John Doe",
    "phone": "+1234567890",
    "rating": 4.8
  },
  "driver": {
    "user_id": 5000,
    "name": "Jane Smith",
    "phone": "+0987654321",
    "rating": 4.9,
    "vehicle": {
      "make": "Toyota",
      "model": "Camry",
      "plate": "ABC-1234"
    }
  },
  "pickup": {
    "location": {
      "type": "Point",
      "coordinates": [-122.4194, 37.7749]  // [lng, lat]
    },
    "address": "123 Main St, San Francisco, CA",
    "timestamp": ISODate("2024-01-15T10:00:00Z")
  },
  "dropoff": {
    "location": {
      "type": "Point",
      "coordinates": [-122.3982, 37.7937]
    },
    "address": "456 Market St, San Francisco, CA",
    "timestamp": ISODate("2024-01-15T10:25:00Z")
  },
  "route": {  // Embedded route details
    "type": "LineString",
    "coordinates": [
      [-122.4194, 37.7749],
      [-122.4150, 37.7800],
      // ... waypoints
      [-122.3982, 37.7937]
    ]
  },
  "fare": {
    "base_fare": 2.50,
    "distance_fare": 15.75,
    "time_fare": 3.25,
    "surge_multiplier": 1.5,
    "subtotal": 32.25,
    "taxes": 2.58,
    "total": 34.83,
    "payment_method": "credit_card"
  },
  "distance_miles": 8.5,
  "duration_minutes": 25,
  "created_at": ISODate("2024-01-15T09:55:00Z"),
  "updated_at": ISODate("2024-01-15T10:25:00Z")
}
```

**Architecture:**
- Sharded MongoDB cluster
- Shard key: `trip_id` (hashed for even distribution)
- Replica sets: 1 primary + 2 secondaries per shard
- Indexes:
  - `{ trip_id: 1 }` - Unique index
  - `{ "rider.user_id": 1, created_at: -1 }` - User trip history
  - `{ "driver.user_id": 1, created_at: -1 }` - Driver trip history
  - `{ "pickup.location": "2dsphere" }` - Geospatial queries
  - `{ status: 1, created_at: -1 }` - Active trips

**Key Queries:**

```javascript
// Find user's trip history (last 50 trips)
const trips = await db.collection('trips')
  .find({ "rider.user_id": 1000 })
  .sort({ created_at: -1 })
  .limit(50)
  .toArray();

// Find trips near location (within 5 km)
const nearbyTrips = await db.collection('trips')
  .find({
    "pickup.location": {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [-122.4, 37.78]
        },
        $maxDistance: 5000  // 5 km
      }
    },
    created_at: {
      $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)  // Last 24 hours
    }
  })
  .toArray();

// Calculate driver earnings for month
const earnings = await db.collection('trips').aggregate([
  {
    $match: {
      "driver.user_id": 5000,
      status: "completed",
      created_at: {
        $gte: new Date("2024-01-01"),
        $lt: new Date("2024-02-01")
      }
    }
  },
  {
    $group: {
      _id: null,
      total_trips: { $sum: 1 },
      total_earnings: { $sum: "$fare.total" },
      total_miles: { $sum: "$distance_miles" }
    }
  }
]).toArray();
```

**Results:**
- Handle millions of trips/day
- Sub-100ms query latency
- Flexible schema allows rapid feature development
- Geospatial indexes enable location-based features
- Horizontal scaling via sharding handles growth

**Key Lessons:**
1. Document model perfect for nested, hierarchical trip data
2. Embedded data (pickup, dropoff, fare) retrieved in single query
3. Geospatial indexes essential for ride-hailing apps
4. Sharding by trip_id provides even distribution
5. Compound indexes optimize common queries (user history, driver earnings)

---

### Example 2: eBay - Product Catalog

**Challenge:**
- 1.3B+ product listings
- Extremely variable schemas (electronics vs clothing vs books)
- Rapid listing creation (thousands/second)
- Complex search requirements
- Need to support new categories without schema migrations

**Solution: MongoDB + Elasticsearch (Hybrid)**

**Data Model (MongoDB):**
```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439050"),
  "listing_id": "ITEM-2024-001",
  "seller": {
    "user_id": 1000,
    "username": "seller123",
    "rating": 4.9,
    "feedback_count": 15234
  },
  "title": "Dell XPS 15 Laptop - Intel i7, 16GB RAM, 512GB SSD",
  "description": "Excellent condition...",
  "category": ["Electronics", "Computers", "Laptops"],
  "condition": "Used - Like New",
  "price": {
    "amount": 899.99,
    "currency": "USD"
  },
  "shipping": {
    "free_shipping": true,
    "domestic": { "cost": 0, "days": "3-5" },
    "international": { "cost": 25.00, "days": "7-14" }
  },
  "specs": {  // Variable schema (Attribute Pattern)
    "brand": "Dell",
    "model": "XPS 15",
    "processor": "Intel Core i7-10750H",
    "ram": "16GB DDR4",
    "storage": "512GB NVMe SSD",
    "screen_size": "15.6 inches",
    "resolution": "1920x1080"
  },
  "images": [
    { "url": "https://cdn.example.com/img1.jpg", "primary": true },
    { "url": "https://cdn.example.com/img2.jpg", "primary": false }
  ],
  "quantity": 1,
  "status": "active",
  "views": 523,
  "watchers": 12,
  "created_at": ISODate("2024-01-15T10:00:00Z"),
  "expires_at": ISODate("2024-02-15T10:00:00Z")
}
```

**Architecture:**
- MongoDB: Source of truth for listings
- Elasticsearch: Search index (synced via change streams)
- Sharded MongoDB: 50+ shards by listing_id (hash-based)
- Elasticsearch: Distributed across 100+ nodes

**Sync MongoDB → Elasticsearch:**
```javascript
// Real-time sync via MongoDB change streams
const changeStream = db.collection('listings').watch();

changeStream.on('change', async (change) => {
  if (change.operationType === 'insert') {
    // Index new listing in Elasticsearch
    await esClient.index({
      index: 'listings',
      id: change.fullDocument.listing_id,
      body: {
        listing_id: change.fullDocument.listing_id,
        title: change.fullDocument.title,
        description: change.fullDocument.description,
        category: change.fullDocument.category,
        price: change.fullDocument.price.amount,
        condition: change.fullDocument.condition,
        seller_rating: change.fullDocument.seller.rating
      }
    });
  } else if (change.operationType === 'update') {
    // Update Elasticsearch
    await esClient.update({
      index: 'listings',
      id: change.documentKey.listing_id,
      body: { doc: change.updateDescription.updatedFields }
    });
  } else if (change.operationType === 'delete') {
    // Remove from Elasticsearch
    await esClient.delete({
      index: 'listings',
      id: change.documentKey.listing_id
    });
  }
});
```

**Results:**
- 1.3B+ listings stored in MongoDB
- Flexible schema supports any product type
- Sub-second listing creation
- Elasticsearch handles complex search (full-text, facets, filters)
- Change streams provide real-time sync (sub-second latency)

**Key Lessons:**
1. MongoDB flexible schema perfect for variable product attributes
2. Hybrid approach: MongoDB for storage, Elasticsearch for search
3. Change streams enable real-time data pipelines
4. Sharding by listing_id provides even distribution and horizontal scaling
5. Attribute pattern handles highly variable schemas without migrations

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Answer: "Explain document databases"

**Answer:**
*"Document databases are NoSQL databases storing data as self-contained documents—typically JSON or BSON format—with flexible schema. Most popular: MongoDB.*

*Core concepts: Each record is a document with nested objects and arrays. No rigid table structure—different documents can have different fields. Related data embedded together vs normalized across tables in relational databases.*

*Example: User document with embedded addresses, orders. Single query retrieves complete user data—no JOINs. Compare to relational: User table, Address table, Order table—requires JOINs to assemble complete data.*

*Benefits: First, developer productivity—schema flexibility eliminates migrations for field additions. Add 'phone_number' field? Just insert new documents with phone_number. No ALTER TABLE, no downtime. Second, natural object mapping—documents map directly to application objects (no ORM impedance mismatch). Third, performance—embedded data retrieved in single query, no JOINs. Fourth, horizontal scaling—sharding distributes data across servers without distributed transactions.*

*Data modeling: Two patterns—embedding vs referencing. Embed when: One-to-few relationship, data accessed together, bounded size. Reference when: One-to-many, unbounded growth, many-to-many. Example: Blog post with 5 comments—embed. Blog post with 10,000 comments—reference.*

*Querying: Rich query language. Find by nested field: `{\"address.city\": \"SF\"}`. Array queries: `{tags: \"mongodb\"}`. Aggregation pipelines for complex analytics: $match, $group, $sort, $lookup (JOIN equivalent).*

*Scaling: Sharding distributes collection across multiple servers. Shard key determines distribution. Good shard key: High cardinality (many unique values), even distribution, query isolation. Example: User collection sharded by hashed user_id. Bad shard key: Low cardinality (country—creates hot partitions), monotonically increasing alone (all writes to one shard).*

*Use cases: Content management systems (variable article schemas), product catalogs (different product types), user profiles (flexible attributes), IoT data (variable sensor readings), mobile apps (offline-first with document sync).*

*Trade-offs: No complex JOINs (must model relationships carefully). Eventual consistency in sharded/replicated setups. No ACID transactions across documents (before MongoDB 4.0—now supported but limited). Document size limit (16 MB in MongoDB). Query flexibility less than relational (no arbitrary JOINs on unindexed fields)."*

---

### Common Follow-Up Questions

**Q: "When would you embed vs reference data in MongoDB?"**

**A:** *"Five decision criteria:*

*First, relationship cardinality. One-to-few (1-10): Embed. One-to-many (100+): Reference. One-to-millions: Always reference. Example: User with 3 addresses—embed. User with 10,000 orders—reference. Reason: Document size limit (16 MB), query performance (retrieving huge arrays slow).*

*Second, data access patterns. Always accessed together: Embed. Queried independently: Reference. Example: Blog post + comments—if always show post with comments, embed. If show comments separately, paginated, reference. Embed benefit: Single query retrieves all data. Reference benefit: Query comments without loading post.*

*Third, update frequency. Rarely updated: Embed. Frequently updated: Reference. Example: Order with line items—order placed once, never changes—embed line items. Product catalog with stock levels—stock updated constantly—reference inventory. Embed issue: Updating embedded data requires rewriting entire document. Reference benefit: Update single field in separate document.*

*Fourth, data duplication. Acceptable duplication: Embed snapshot. Avoid duplication: Reference. Example: Order with product details—embed product name/price at order time (historical snapshot). Product catalog with categories—reference categories (single source of truth). Duplication issue: Update product name requires updating all orders (if embedded). Reference benefit: Update once, reflected everywhere.*

*Fifth, atomicity requirements. Need atomic updates: Embed. No atomicity needed: Reference. Example: Shopping cart with items—add item and update total atomically—embed items in cart document. User and orders—create order doesn't need to update user atomically—reference. MongoDB single-document atomicity: Embedded data updated atomically. Multi-document transactions: Available (MongoDB 4.0+) but slower than embedded.*

*Hybrid approach common: Order document with embedded line items (snapshot at order time: product name, price, quantity) but also product_id reference (link to current product details). Benefits: Order self-contained (fast retrieval), but can look up current product info if needed.*

*Real-world example: Uber trip data—embed pickup/dropoff/fare (belongs to trip, accessed together) but reference driver/rider (separate entities, queried independently). Single query gets complete trip data, but can find all trips for a driver without loading trip details.*

*Interview pattern: Ask about access patterns first, then choose model. 'Are comments always shown with post?' Yes → Embed. 'How many comments per post?' 100+ → Consider reference. 'Need to query top commented posts?' Yes → Reference (easier to count/aggregate)."*

---

**Q: "How does MongoDB sharding work? When would you shard?"**

**A:** *"MongoDB sharding distributes collection across multiple servers (shards) for horizontal scaling.*

*Architecture: Three components—First, shards (each is replica set storing data subset). Second, mongos routers (stateless query routers, direct queries to appropriate shards). Third, config servers (store metadata: shard key ranges, chunk locations).*

*Sharding process: Collection divided into chunks (default 64 MB). Each chunk: Range of shard key values. Chunks distributed across shards. Balancer: Background process migrates chunks to maintain balance. Example: Users collection sharded by user_id. Chunk 1: user_id 1-10000 on Shard A. Chunk 2: user_id 10001-20000 on Shard B.*

*Shard key selection (most critical): Three properties needed—First, high cardinality (many unique values). Low cardinality creates hot partitions. Example: Country (only 200 values)—all USA users on one shard. Second, even distribution. Monotonically increasing keys (ObjectId, timestamp) send all writes to one shard. Solution: Hash shard key or compound key. Third, query isolation. Queries including shard key target single shard. Queries without shard key scatter to all shards (slow).*

*Good shard keys: Hashed user_id (even distribution, high cardinality, query isolation for user lookups). Compound keys: {country: 1, user_id: 1} (query by country stays on shard, user_id adds cardinality). Bad shard keys: ObjectId alone (monotonically increasing). Country alone (hot partitions). Random value with no query isolation (every query scatters).*

*Query routing: Targeted query (includes shard key)—mongos routes to single shard. Fast, low latency. Scatter-gather query (no shard key)—mongos queries all shards, merges results. Slow, high latency. Optimization: Include shard key in queries, create indexes on non-shard-key fields.*

*When to shard: Four indicators—First, storage exceeds single server capacity (>2 TB typical). Second, working set exceeds RAM (frequent cache misses). Third, write throughput exceeds single server (>10k writes/second typical). Fourth, read throughput needs horizontal scaling (add replicas first, shard if replicas insufficient).*

*When NOT to shard: Small datasets (<500 GB). Low traffic (<1k QPS). Can scale with replica sets (add secondaries for read scaling). Sharding adds complexity: More servers, operational overhead, debugging harder. Premature sharding anti-pattern: Start with replica set, shard when actually needed.*

*Real-world: Twitter shards tweets by tweet_id (hash). Even distribution, query tweet by ID targets single shard. eBay shards listings by listing_id (hash). 1.3B+ listings across 50+ shards. Uber shards trips by trip_id. Facebook shards users by user_id (consistent hashing).*

*Interview pattern: Start with capacity planning. 'How much data? What QPS?' If exceeds single server, discuss sharding. Choose shard key based on access patterns. Explain query routing. Discuss monitoring and rebalancing."*

---

**Q: "Compare MongoDB vs PostgreSQL for a product catalog. Which would you choose?"**

**A:** *"Decision depends on five factors:*

*First, schema flexibility. MongoDB advantage: Products have variable attributes (laptop: CPU, RAM, screen size; shirt: size, color, material). MongoDB flexible schema—no migrations for new product types. PostgreSQL disadvantage: ALTER TABLE for new columns, or JSONB column (loses some SQL benefits). If product types highly variable, frequent additions—MongoDB wins. If product schema stable—PostgreSQL fine.*

*Second, query complexity. PostgreSQL advantage: Complex queries, multi-table JOINs, aggregations, window functions. Example: 'Find products in Electronics category, price <$500, supplier rating >4.0, in stock, sorted by discount'. PostgreSQL: SQL with JOINs across product, category, supplier, inventory tables. MongoDB disadvantage: Requires $lookup (less efficient), or denormalize (data duplication). If complex analytical queries—PostgreSQL wins. If simple CRUD, key-based lookups—MongoDB fine.*

*Third, transaction requirements. PostgreSQL advantage: Strong ACID transactions, complex multi-table updates. Example: Order placement updates inventory, creates order, logs transaction atomically. PostgreSQL: Transaction wraps all updates. MongoDB: Multi-document transactions (4.0+) but slower, single-shard preferred. If many multi-entity transactions—PostgreSQL safer. If mostly single-document writes—MongoDB fine.*

*Fourth, scaling needs. MongoDB advantage: Built-in sharding, horizontal scaling. Add shards increases capacity linearly. PostgreSQL disadvantage: Sharding requires external tools (Citus, pg_shard), complex setup. If anticipate >10TB data, need horizontal scaling—MongoDB easier. If <2TB, vertical scaling sufficient—PostgreSQL simpler.*

*Fifth, team expertise and ecosystem. PostgreSQL advantage: Mature ecosystem, more ORMs, SQL familiarity. MongoDB disadvantage: Requires learning document model, aggregation pipelines. If team SQL experts, many SQL tools needed—PostgreSQL. If team comfortable with JSON, document model—MongoDB.*

*Real-world examples: eBay uses MongoDB for product listings—1.3B+ products, highly variable schemas, rapid listing creation. Amazon uses PostgreSQL for inventory management—complex queries, strong consistency, relational data. Zalando (fashion e-commerce) uses MongoDB for product catalog—variable fashion attributes (size, color, material) across millions of products. Walmart uses PostgreSQL for core transactional data—strong ACID, complex queries.*

*Hybrid approach common: MongoDB for product catalog (flexible schema, fast reads). PostgreSQL for orders/inventory (strong consistency, complex queries). Elasticsearch for search. Redis for caching. Each database optimized for use case.*

*Interview recommendation: Ask clarifying questions—'How many product types? Schema stability? Query complexity? Transaction requirements? Scale expectations?' Then choose based on answers. Avoid dogmatic 'always use X'. Trade-offs matter more than choice."*

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why Document Databases Matter

**Business Impact:**
- **Time to market**: 30-50% faster development (no schema migrations, rapid iterations)
- **Scalability**: Handle millions of users, billions of documents via horizontal sharding
- **Cost efficiency**: Fewer JOINs = less compute, cheaper infrastructure
- **Flexibility**: Adapt to changing requirements without downtime
- **Developer productivity**: Work with native objects (no ORM complexity)

**Technical Impact:**
- **Schema flexibility**: Different documents can have different fields (polymorphic data)
- **Performance**: Embedded data retrieved in single query (no JOINs)
- **Horizontal scaling**: Sharding distributes load across servers
- **Real-time features**: Change streams enable event-driven architectures
- **Object mapping**: Documents map directly to application objects

### How Document Databases Work

**Core Architecture:**
1. **Document storage**: Self-contained JSON/BSON documents with nested objects, arrays
2. **Flexible schema**: No enforced schema, documents vary within collection
3. **Indexing**: B-tree indexes on any field (including nested fields, arrays)
4. **Replication**: Replica sets (primary + secondaries) for high availability
5. **Sharding**: Distribute collection across servers via shard key

**MongoDB Specifics:**
- **WiredTiger storage engine**: MVCC (Multi-Version Concurrency Control), compression
- **Aggregation pipelines**: Complex analytics via stages ($match, $group, $lookup, $unwind)
- **Change streams**: Real-time notifications on data changes
- **Transactions**: Multi-document ACID (since 4.0)
- **Geospatial**: Native support for location-based queries

### Key Design Patterns

**1. Embed vs Reference:**
- **Embed**: One-to-few, accessed together, bounded size
- **Reference**: One-to-many, independent access, unbounded
- **Hybrid**: Embed snapshot + reference for current data

**2. Schema Patterns:**
- **Attribute**: Variable schemas (product attributes)
- **Bucket**: Time-series data (aggregate readings into buckets)
- **Outlier**: Handle extreme cases (most users 10 orders, some 10k+)
- **Computed**: Pre-calculate aggregates (total sales, avg rating)
- **Subset**: Limit working set (recent 10 reviews embedded, all in separate collection)

### Trade-Offs to Remember

```
Flexibility ←→ Structure
- Document DB: Flexible schema, rapid development
- Relational DB: Rigid schema, data integrity enforcement

Performance ←→ Query Complexity
- Document DB: Fast single-document reads (embedded data)
- Relational DB: Complex queries, arbitrary JOINs, aggregations

Horizontal Scaling ←→ Transactions
- Document DB: Built-in sharding, eventual consistency
- Relational DB: Vertical scaling, strong ACID transactions

Development Speed ←→ Data Consistency
- Document DB: No migrations, denormalization, faster development
- Relational DB: Normalization, referential integrity, consistent data
```

### Interview Red Flags

🚫 "Document databases always faster than relational"
✅ "Document databases optimize for single-document reads with embedded data. Complex JOINs, analytical queries still favor relational databases."

🚫 "MongoDB doesn't support transactions"
✅ "MongoDB 4.0+ supports multi-document ACID transactions. However, single-document atomicity often sufficient—design around it when possible."

🚫 "Always embed related data"
✅ "Embed for one-to-few, bounded, accessed together. Reference for one-to-many, unbounded, independent access. Consider access patterns, update frequency, data duplication."

### Final Sound Bite

*"Document databases: NoSQL databases storing self-contained JSON/BSON documents with flexible schema—optimized for rapid development, object mapping, and horizontal scaling.*

*Core concepts: Documents with nested objects, arrays. No rigid schema—different documents, different fields. Embed related data (one-to-few) vs reference (one-to-many). Single query retrieves complete document (no JOINs).*

*MongoDB architecture: Collections (groups of documents), replica sets (primary + secondaries for HA), sharded clusters (horizontal scaling). WiredTiger storage engine (MVCC, compression). Aggregation pipelines (complex analytics). Change streams (real-time events).*

*Data modeling: Embed when: One-to-few relationship, data accessed together, bounded size. Reference when: One-to-many, unbounded growth, independent queries. Hybrid common: Embed snapshot + reference current data. Example: Order with embedded line items (product name, price at order time) + product_id reference.*

*Querying: Rich query language. Nested fields: `{\"address.city\": \"SF\"}`. Arrays: `{tags: \"mongodb\"}`. Aggregation: $match → $group → $sort → $lookup (JOIN). Indexes on any field (single, compound, multikey, geospatial, text).*

*Sharding: Distribute collection across servers. Shard key determines distribution. Good shard key: High cardinality, even distribution, query isolation. Example: Hashed user_id. Bad: Low cardinality (country), monotonically increasing (ObjectId alone). Queries with shard key target single shard (fast). Without shard key scatter to all shards (slow).*

*Scaling: Horizontal via sharding. Add shards increases capacity linearly. Replica sets for read scaling (add secondaries). Replication: Async by default (eventual consistency). Read preferences: Primary (strong consistency), secondary (stale OK, reduce load). Write concerns: w:1 (fast), w:\"majority\" (durable).*

*Use cases: Content management (variable article schemas), product catalogs (different product types), user profiles (flexible attributes), IoT (sensor readings), mobile apps (offline-first with document sync). Real-world: Uber (trip data), eBay (product listings), Craigslist (classified ads), Bosch (IoT sensor data).*

*Trade-offs: Schema flexibility vs data integrity enforcement. Fast embedded reads vs complex analytical queries. Horizontal scaling vs strong consistency. Development speed vs normalized data. Choose based on: Schema stability, query complexity, transaction needs, scale requirements."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
