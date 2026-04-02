# 56. Non-Relational Databases (NoSQL)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Non-Relational Databases (NoSQL)**: Distributed storage systems that prioritize horizontal scalability, flexible schemas, and high availability over ACID transactions and JOIN operations—designed for web-scale applications handling massive data volumes and traffic.

### Core Concept

**What it is:**
- **Schema-flexible storage**: No predefined schema, adapt structure per record
- **Horizontal scaling**: Add nodes to handle more data and traffic
- **BASE properties**: Basically Available, Soft state, Eventually consistent
- **Specialized data models**: Key-value, document, columnar, graph (not just tables)
- **Distributed by design**: Multi-node clusters, data replication, partition tolerance

**Why it exists:**
- **Scale limitations of RDBMS**: Single primary write bottleneck
- **Schema rigidity**: Frequent schema changes expensive in relational databases
- **Global distribution**: Low-latency access across geographic regions
- **Varied data models**: Not all data fits relational model
- **Cost efficiency**: Scale with commodity hardware vs expensive vertical scaling

**Simple analogy:**
- **Relational database**: Like a filing cabinet with strict folder structure
  - Every folder same structure (schema)
  - All folders in one cabinet (single server)
  - Need bigger cabinet to grow (vertical scaling)
- **NoSQL database**: Like a warehouse with flexible storage
  - Each box can have different contents (flexible schema)
  - Add more warehouse space as needed (horizontal scaling)
  - Boxes replicated across locations (high availability)

### Four Main Types

**1. Key-Value Stores**
- **Model**: Simple hash table, key → value
- **Examples**: Redis, DynamoDB, Riak
- **Use cases**: Session storage, caching, real-time analytics
- **Scale**: Billions of keys, millions of operations/second

**2. Document Databases**
- **Model**: JSON/BSON documents, nested structures
- **Examples**: MongoDB, Couchbase, DocumentDB
- **Use cases**: Content management, catalogs, user profiles
- **Scale**: Petabytes of documents, flexible schema

**3. Columnar Databases**
- **Model**: Column-family storage, wide rows
- **Examples**: Cassandra, HBase, ScyllaDB
- **Use cases**: Time-series data, event logging, IoT
- **Scale**: Write-optimized, linear scalability

**4. Graph Databases**
- **Model**: Nodes and edges (relationships)
- **Examples**: Neo4j, Amazon Neptune, JanusGraph
- **Use cases**: Social networks, recommendation engines, fraud detection
- **Scale**: Billions of relationships, complex traversals

### Key Characteristics

**BASE vs ACID:**
- **Basically Available**: System available even during partial failures
- **Soft state**: State may change over time (without input)
- **Eventually consistent**: Data becomes consistent given enough time
- Trade-off: Availability and partition tolerance over strong consistency

**CAP Theorem:**
- **Consistency**: All nodes see same data at same time
- **Availability**: Every request gets response (success/failure)
- **Partition Tolerance**: System continues despite network partitions
- **Reality**: Choose 2 of 3 (usually AP or CP, not CA in distributed systems)

**Horizontal Scaling:**
- **Partitioning/Sharding**: Data split across multiple nodes
- **Replication**: Data copied to multiple nodes
- **Consistent hashing**: Distribute data evenly, minimize reshuffling
- **Linear scalability**: 2x nodes = 2x throughput

### Why NoSQL Matters

**Business Impact:**
- **Scale**: Support billions of users (Facebook, Netflix, Uber)
- **Global reach**: Low latency worldwide (edge locations, multi-region)
- **Cost**: Scale with commodity hardware (vs expensive enterprise servers)
- **Agility**: Rapid schema evolution (no downtime migrations)
- **Availability**: 99.999% uptime (five nines, 5 minutes/year downtime)

**Role in interviews:**
- FAANG asks: "Design database for WhatsApp messages" (billions of writes/day)
- Trade-off questions: "When would you choose NoSQL over SQL?"
- Scale questions: "How does Cassandra achieve linear scalability?"
- Consistency questions: "What does eventual consistency mean in practice?"

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🗄️ Type 1: Key-Value Stores

#### Architecture and Data Model

```
┌─────────────────────────────────────────────────────────────┐
│          KEY-VALUE STORE ARCHITECTURE (Redis)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CLIENT APPLICATIONS                                │    │
│  │  - Web servers                                      │    │
│  │  - Application servers                              │    │
│  │  - Background workers                               │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  REDIS CLUSTER                                      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  Master Nodes (Shards)                   │      │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐│      │    │
│  │  │  │ Master 1 │  │ Master 2 │  │ Master 3 ││      │    │
│  │  │  │ Slots    │  │ Slots    │  │ Slots    ││      │    │
│  │  │  │ 0-5460   │  │ 5461-    │  │ 10923-   ││      │    │
│  │  │  │          │  │ 10922    │  │ 16383    ││      │    │
│  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘│      │    │
│  │  │       │             │             │       │      │    │
│  │  │       │ Replication │             │       │      │    │
│  │  │       ▼             ▼             ▼       │      │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐│      │    │
│  │  │  │ Replica  │  │ Replica  │  │ Replica  ││      │    │
│  │  │  │ 1        │  │ 2        │  │ 3        ││      │    │
│  │  │  └──────────┘  └──────────┘  └──────────┘│      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  Consistent Hashing:                                │    │
│  │  - Hash key to determine slot (0-16383)             │    │
│  │  - Route to master owning that slot                 │    │
│  │  - CRC16(key) % 16384                               │    │
│  │                                                      │    │
│  │  Data Structures:                                   │    │
│  │  - String: Simple key-value                         │    │
│  │  - Hash: Field-value pairs (like object)            │    │
│  │  - List: Ordered collection (queue, stack)          │    │
│  │  - Set: Unordered unique values                     │    │
│  │  - Sorted Set: Ordered by score                     │    │
│  │  - Bitmap, HyperLogLog, Streams                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

DynamoDB Architecture:
═══════════════════════

┌─────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────┐    │
│  │  DynamoDB Table                                     │    │
│  │  - Partition key: Hash key (required)               │    │
│  │  - Sort key: Range key (optional)                   │    │
│  │  - Attributes: Flexible schema                      │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Partitions (Automatic Sharding)                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │  │Partition │  │Partition │  │Partition │         │    │
│  │  │ 1        │  │ 2        │  │ 3        │         │    │
│  │  │10GB max  │  │10GB max  │  │10GB max  │         │    │
│  │  │3k read   │  │3k read   │  │3k read   │         │    │
│  │  │1k write  │  │1k write  │  │1k write  │         │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘         │    │
│  │       │             │             │                │    │
│  │       └─────────────┴─────────────┘                │    │
│  │                     │                              │    │
│  │              3-way replication                     │    │
│  │                     │                              │    │
│  │       ┌─────────────┼─────────────┐                │    │
│  │       ▼             ▼             ▼                │    │
│  │    [AZ-1]        [AZ-2]        [AZ-3]              │    │
│  │                                                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Redis Examples

```python
# ═══════════════════════════════════════════════════════════
# Redis: In-memory key-value store
# ═══════════════════════════════════════════════════════════

import redis

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0)

# ─────────────────────────────────────────────────────────
# 1. String operations (simplest key-value)
# ─────────────────────────────────────────────────────────

# Set key-value
r.set('user:1000:name', 'John Doe')
r.set('user:1000:email', 'john@example.com')

# Get value
name = r.get('user:1000:name')  # b'John Doe'

# Set with expiration (TTL)
r.setex('session:abc123', 3600, 'user_id=1000')  # Expires in 1 hour

# Atomic increment (counter)
r.incr('page:views:home')  # Increment by 1
r.incrby('page:views:home', 10)  # Increment by 10

# ─────────────────────────────────────────────────────────
# 2. Hash operations (object storage)
# ─────────────────────────────────────────────────────────

# Store user object as hash
r.hset('user:1000', mapping={
    'name': 'John Doe',
    'email': 'john@example.com',
    'age': '30',
    'city': 'San Francisco'
})

# Get single field
email = r.hget('user:1000', 'email')  # b'john@example.com'

# Get all fields
user = r.hgetall('user:1000')
# {b'name': b'John Doe', b'email': b'john@example.com', ...}

# Increment numeric field
r.hincrby('user:1000', 'login_count', 1)

# ─────────────────────────────────────────────────────────
# 3. List operations (queue, timeline)
# ─────────────────────────────────────────────────────────

# Push to list (timeline, feed)
r.lpush('user:1000:feed', 'post:5001')  # Left push (newest first)
r.lpush('user:1000:feed', 'post:5002')
r.lpush('user:1000:feed', 'post:5003')

# Get range (pagination)
recent_posts = r.lrange('user:1000:feed', 0, 9)  # Get 10 most recent
# [b'post:5003', b'post:5002', b'post:5001']

# Queue implementation
r.rpush('job:queue', 'job:1')  # Right push (enqueue)
job = r.lpop('job:queue')  # Left pop (dequeue)

# Blocking pop (wait for item)
job = r.blpop('job:queue', timeout=30)  # Wait up to 30 seconds

# ─────────────────────────────────────────────────────────
# 4. Set operations (unique items, tags)
# ─────────────────────────────────────────────────────────

# Add tags to post
r.sadd('post:1000:tags', 'python', 'redis', 'nosql')

# Check membership
is_tagged = r.sismember('post:1000:tags', 'python')  # True

# Get all members
tags = r.smembers('post:1000:tags')
# {b'python', b'redis', b'nosql'}

# Set operations (union, intersection, difference)
r.sadd('user:1000:skills', 'python', 'java', 'sql')
r.sadd('user:2000:skills', 'python', 'javascript', 'react')

# Common skills (intersection)
common = r.sinter('user:1000:skills', 'user:2000:skills')
# {b'python'}

# ─────────────────────────────────────────────────────────
# 5. Sorted Set operations (leaderboard, ranking)
# ─────────────────────────────────────────────────────────

# Add players with scores
r.zadd('leaderboard', {
    'player:1': 1000,
    'player:2': 1500,
    'player:3': 2000,
    'player:4': 1200
})

# Get top 10 players (highest score)
top_players = r.zrevrange('leaderboard', 0, 9, withscores=True)
# [(b'player:3', 2000.0), (b'player:2', 1500.0), ...]

# Get player rank (0-indexed)
rank = r.zrevrank('leaderboard', 'player:2')  # 1 (second place)

# Get score
score = r.zscore('leaderboard', 'player:2')  # 1500.0

# Increment score
r.zincrby('leaderboard', 100, 'player:2')  # Add 100 points

# Get players in score range
players = r.zrangebyscore('leaderboard', 1000, 1500)

# ─────────────────────────────────────────────────────────
# 6. Pub/Sub (real-time messaging)
# ─────────────────────────────────────────────────────────

# Publisher
r.publish('chat:room:1', 'Hello everyone!')

# Subscriber
pubsub = r.pubsub()
pubsub.subscribe('chat:room:1')

for message in pubsub.listen():
    if message['type'] == 'message':
        print(message['data'])  # b'Hello everyone!'

# ─────────────────────────────────────────────────────────
# 7. Transactions (MULTI/EXEC)
# ─────────────────────────────────────────────────────────

# Atomic transfer of points between users
pipe = r.pipeline()
pipe.hincrby('user:1000', 'points', -100)
pipe.hincrby('user:2000', 'points', 100)
pipe.execute()  # Both operations execute atomically

# ═══════════════════════════════════════════════════════════
# DynamoDB: Managed key-value and document store
# ═══════════════════════════════════════════════════════════

import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('Users')

# ─────────────────────────────────────────────────────────
# Put item (create/update)
# ─────────────────────────────────────────────────────────

table.put_item(
    Item={
        'user_id': '1000',  # Partition key
        'email': 'john@example.com',
        'name': 'John Doe',
        'age': 30,
        'created_at': '2024-01-01T00:00:00Z'
    }
)

# ─────────────────────────────────────────────────────────
# Get item (point lookup)
# ─────────────────────────────────────────────────────────

response = table.get_item(
    Key={
        'user_id': '1000'
    }
)
user = response['Item']

# ─────────────────────────────────────────────────────────
# Update item (atomic operations)
# ─────────────────────────────────────────────────────────

table.update_item(
    Key={'user_id': '1000'},
    UpdateExpression='SET age = :age, updated_at = :timestamp',
    ExpressionAttributeValues={
        ':age': 31,
        ':timestamp': '2024-06-01T00:00:00Z'
    }
)

# Atomic increment
table.update_item(
    Key={'user_id': '1000'},
    UpdateExpression='ADD login_count :inc',
    ExpressionAttributeValues={':inc': 1}
)

# ─────────────────────────────────────────────────────────
# Query (requires partition key)
# ─────────────────────────────────────────────────────────

# Table with composite key: user_id (partition) + timestamp (sort)
orders_table = dynamodb.Table('Orders')

response = orders_table.query(
    KeyConditionExpression='user_id = :uid AND created_at > :date',
    ExpressionAttributeValues={
        ':uid': '1000',
        ':date': '2024-01-01T00:00:00Z'
    }
)
orders = response['Items']

# ─────────────────────────────────────────────────────────
# Scan (full table scan, expensive)
# ─────────────────────────────────────────────────────────

response = table.scan(
    FilterExpression='age > :age',
    ExpressionAttributeValues={':age': 25}
)
users = response['Items']

# ⚠️ Scan reads entire table, expensive for large tables
# Use Query with indexes instead

# ─────────────────────────────────────────────────────────
# Batch operations
# ─────────────────────────────────────────────────────────

# Batch write (up to 25 items)
with table.batch_writer() as batch:
    for i in range(100):
        batch.put_item(Item={
            'user_id': f'{1000 + i}',
            'email': f'user{i}@example.com'
        })

# Batch get (up to 100 items)
response = dynamodb.batch_get_item(
    RequestItems={
        'Users': {
            'Keys': [
                {'user_id': '1000'},
                {'user_id': '1001'},
                {'user_id': '1002'}
            ]
        }
    }
)
```

---

### 📄 Type 2: Document Databases

#### MongoDB Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          MONGODB REPLICA SET & SHARDING                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  APPLICATION SERVERS                                │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  MONGOS (Query Router)                              │    │
│  │  - Routes queries to appropriate shard              │    │
│  │  - Aggregates results                               │    │
│  │  - Stateless (can run multiple instances)           │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CONFIG SERVERS (Replica Set)                       │    │
│  │  - Store cluster metadata                           │    │
│  │  - Shard key ranges                                 │    │
│  │  - Chunk distribution                               │    │
│  │  [Config 1] [Config 2] [Config 3]                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SHARDS (Replica Sets)                              │    │
│  │                                                      │    │
│  │  Shard 1: user_id 0 - 1000000                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ Primary  │  │Secondary │  │Secondary │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  │       │              │              │               │    │
│  │       └──────────────┴──────────────┘               │    │
│  │              Replication                            │    │
│  │                                                      │    │
│  │  Shard 2: user_id 1000001 - 2000000                 │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ Primary  │  │Secondary │  │Secondary │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  │                                                      │    │
│  │  Shard N: user_id ... - ...                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ Primary  │  │Secondary │  │Secondary │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Document Structure:                                         │
│  {                                                           │
│    "_id": ObjectId("..."),         // Auto-generated        │
│    "user_id": 1000,                                          │
│    "email": "john@example.com",                              │
│    "profile": {                    // Nested document        │
│      "first_name": "John",                                   │
│      "last_name": "Doe",                                     │
│      "age": 30                                               │
│    },                                                        │
│    "orders": [                     // Array of subdocs       │
│      {                                                       │
│        "order_id": 5001,                                     │
│        "total": 99.99,                                       │
│        "items": [...]                                        │
│      }                                                       │
│    ],                                                        │
│    "tags": ["vip", "premium"]     // Array                   │
│  }                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### MongoDB Examples

```javascript
// ═══════════════════════════════════════════════════════════
// MongoDB: Document database with flexible schema
// ═══════════════════════════════════════════════════════════

const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('ecommerce');
const users = db.collection('users');
const orders = db.collection('orders');

// ─────────────────────────────────────────────────────────
// 1. Insert documents
// ─────────────────────────────────────────────────────────

// Single insert
await users.insertOne({
    user_id: 1000,
    email: 'john@example.com',
    profile: {
        first_name: 'John',
        last_name: 'Doe',
        age: 30,
        city: 'San Francisco'
    },
    preferences: {
        newsletter: true,
        notifications: {
            email: true,
            sms: false
        }
    },
    tags: ['vip', 'premium'],
    created_at: new Date()
});

// Multiple insert
await users.insertMany([
    { user_id: 1001, email: 'jane@example.com', ... },
    { user_id: 1002, email: 'bob@example.com', ... }
]);

// ─────────────────────────────────────────────────────────
// 2. Query documents
// ─────────────────────────────────────────────────────────

// Find one
const user = await users.findOne({ user_id: 1000 });

// Find many with filter
const vipUsers = await users.find({
    tags: 'vip',  // Array contains 'vip'
    'profile.age': { $gte: 25 }  // Nested field query
}).toArray();

// Find with projection (select specific fields)
const emails = await users.find(
    { tags: 'premium' },
    { projection: { email: 1, 'profile.first_name': 1 } }
).toArray();

// ─────────────────────────────────────────────────────────
// 3. Update documents
// ─────────────────────────────────────────────────────────

// Update single document
await users.updateOne(
    { user_id: 1000 },
    {
        $set: { 'profile.age': 31 },  // Set nested field
        $push: { tags: 'loyalty' },   // Add to array
        $inc: { 'stats.login_count': 1 }  // Increment
    }
);

// Update multiple documents
await users.updateMany(
    { 'profile.city': 'San Francisco' },
    { $set: { 'preferences.timezone': 'PST' } }
);

// Upsert (update or insert)
await users.updateOne(
    { user_id: 1003 },
    { $set: { email: 'new@example.com', created_at: new Date() } },
    { upsert: true }  // Insert if not exists
);

// ─────────────────────────────────────────────────────────
// 4. Embedded documents (denormalization)
// ─────────────────────────────────────────────────────────

// Order with embedded customer and items
await orders.insertOne({
    order_id: 5001,
    customer: {  // Embedded customer info (denormalized)
        user_id: 1000,
        email: 'john@example.com',
        name: 'John Doe'
    },
    items: [  // Embedded order items
        {
            product_id: 101,
            sku: 'LAPTOP-XYZ',
            name: 'Laptop',
            quantity: 1,
            price: 999.99
        },
        {
            product_id: 102,
            sku: 'MOUSE-ABC',
            name: 'Mouse',
            quantity: 2,
            price: 29.99
        }
    ],
    total: 1059.97,
    status: 'paid',
    created_at: new Date()
});

// Benefits:
// ✅ Single query to get all order data (no JOINs)
// ✅ Fast reads
// ⚠️ Data duplication (customer info in every order)
// ⚠️ Update complexity (change customer name → update all orders?)

// ─────────────────────────────────────────────────────────
// 5. Aggregation pipeline
// ─────────────────────────────────────────────────────────

// Calculate total sales by product
const salesByProduct = await orders.aggregate([
    // Stage 1: Unwind items array (one doc per item)
    { $unwind: '$items' },
    
    // Stage 2: Group by product, sum quantities
    {
        $group: {
            _id: '$items.product_id',
            product_name: { $first: '$items.name' },
            total_quantity: { $sum: '$items.quantity' },
            total_revenue: { $sum: {
                $multiply: ['$items.quantity', '$items.price']
            }}
        }
    },
    
    // Stage 3: Sort by revenue descending
    { $sort: { total_revenue: -1 } },
    
    // Stage 4: Limit to top 10
    { $limit: 10 }
]).toArray();

// Result:
// [
//   { _id: 101, product_name: 'Laptop', total_quantity: 50, total_revenue: 49999.50 },
//   { _id: 102, product_name: 'Mouse', total_quantity: 200, total_revenue: 5998.00 },
//   ...
// ]

// ─────────────────────────────────────────────────────────
// 6. Indexes
// ─────────────────────────────────────────────────────────

// Single field index
await users.createIndex({ user_id: 1 });

// Compound index
await users.createIndex({ 'profile.city': 1, 'profile.age': -1 });

// Text index (full-text search)
await users.createIndex({ email: 'text', 'profile.first_name': 'text' });

// Search with text index
const results = await users.find({
    $text: { $search: 'john' }
}).toArray();

// Unique index
await users.createIndex({ email: 1 }, { unique: true });

// TTL index (auto-delete after expiration)
await db.collection('sessions').createIndex(
    { created_at: 1 },
    { expireAfterSeconds: 3600 }  // Delete after 1 hour
);

// ─────────────────────────────────────────────────────────
// 7. Transactions (multi-document ACID)
// ─────────────────────────────────────────────────────────

const session = client.startSession();

try {
    await session.withTransaction(async () => {
        // Deduct inventory
        await db.collection('products').updateOne(
            { product_id: 101 },
            { $inc: { stock: -5 } },
            { session }
        );
        
        // Create order
        await orders.insertOne({
            order_id: 5002,
            customer_id: 1000,
            items: [...],
            total: 999.99
        }, { session });
        
        // Update customer stats
        await users.updateOne(
            { user_id: 1000 },
            { $inc: { 'stats.order_count': 1 } },
            { session }
        );
    });
    
    console.log('Transaction committed');
} catch (error) {
    console.log('Transaction aborted:', error);
} finally {
    await session.endSession();
}
```

---

### 🗂️ Type 3: Columnar Databases

#### Cassandra Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          CASSANDRA CLUSTER ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CASSANDRA RING (Peer-to-Peer, No Master)          │    │
│  │                                                      │    │
│  │         Node 1                 Node 2               │    │
│  │         Token: 0               Token: 85            │    │
│  │         ●─────────────────────────●                 │    │
│  │        /│                           │\               │    │
│  │       / │                           │ \              │    │
│  │      /  │                           │  \             │    │
│  │     /   │                           │   \            │    │
│  │    /    │                           │    \           │    │
│  │   /     │                           │     \          │    │
│  │  /      │                           │      \         │    │
│  │ ●       │                           │       ●        │    │
│  │Node 6   │                           │      Node 3    │    │
│  │Token:255│                           │      Token:170 │    │
│  │  \      │                           │      /         │    │
│  │   \     │                           │     /          │    │
│  │    \    │                           │    /           │    │
│  │     \   │                           │   /            │    │
│  │      \  │                           │  /             │    │
│  │       \ │                           │ /              │    │
│  │        \│                           │/               │    │
│  │         ●─────────────────────────●                 │    │
│  │         Node 5               Node 4                 │    │
│  │         Token: 213           Token: 128             │    │
│  │                                                      │    │
│  │  Consistent Hashing:                                │    │
│  │  - Partition key hashed to token (0-255)            │    │
│  │  - Token determines node ownership                  │    │
│  │  - Clockwise traversal to find replicas             │    │
│  │  - Replication factor = 3 (data on 3 nodes)         │    │
│  │                                                      │    │
│  │  Example: user_id = 1000                            │    │
│  │  - Hash(1000) = 42                                  │    │
│  │  - Primary: Node 2 (token 85, next after 42)        │    │
│  │  - Replica 1: Node 3 (token 170)                    │    │
│  │  - Replica 2: Node 4 (token 128)                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  WRITES (Always Available)                          │    │
│  │                                                      │    │
│  │  Client ──[Write user_id=1000]──> Any Node          │    │
│  │     │                                  │             │    │
│  │     │                                  │             │    │
│  │     │    Coordinator determines nodes │             │    │
│  │     │                                  │             │    │
│  │     │      ┌───────────────────────────┤             │    │
│  │     │      │       │               │                 │    │
│  │     │      ▼       ▼               ▼                 │    │
│  │     │   Node 2   Node 3          Node 4              │    │
│  │     │   (Primary)(Replica 1)     (Replica 2)         │    │
│  │     │      │       │               │                 │    │
│  │     │      └───────┴───────────────┘                 │    │
│  │     │              │                                 │    │
│  │     │   SUCCESS when quorum reached (2/3 nodes)      │    │
│  │     │              │                                 │    │
│  │     └──────────────┘                                 │    │
│  │                                                      │    │
│  │  Write path per node:                               │    │
│  │  1. Write to CommitLog (append-only, sequential)    │    │
│  │  2. Write to MemTable (in-memory sorted structure)   │    │
│  │  3. Flush MemTable to SSTable (immutable on disk)    │    │
│  │  4. Compact SSTables periodically                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  READS (Tunable Consistency)                        │    │
│  │                                                      │    │
│  │  Client ──[Read user_id=1000]──> Any Node           │    │
│  │     │                                │               │    │
│  │     │     Coordinator queries replicas               │    │
│  │     │                                │               │    │
│  │     │      ┌─────────────────────────┤               │    │
│  │     │      │         │           │                   │    │
│  │     │      ▼         ▼           ▼                   │    │
│  │     │   Node 2    Node 3       Node 4                │    │
│  │     │      │         │           │                   │    │
│  │     │      └─────────┴───────────┘                   │    │
│  │     │              │                                 │    │
│  │     │   Return when quorum responds (2/3)            │    │
│  │     │   Compare timestamps, return latest            │    │
│  │     │              │                                 │    │
│  │     └──────────────┘                                 │    │
│  │                                                      │    │
│  │  Read repair: Async update stale replicas           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Column Family Structure:
════════════════════════

Partition Key: user_id (determines node placement)
Clustering Key: timestamp (sorts within partition)

Row Key: user_id=1000, timestamp=2024-01-01T10:00:00Z
┌───────────┬────────────┬──────────┬───────┬─────────┐
│ user_id   │ timestamp  │ event    │ data  │ ttl     │
├───────────┼────────────┼──────────┼───────┼─────────┤
│ 1000      │ 10:00:00   │ login    │ {...} │ null    │
│ 1000      │ 10:05:00   │ purchase │ {...} │ null    │
│ 1000      │ 10:10:00   │ logout   │ {...} │ null    │
└───────────┴────────────┴──────────┴───────┴─────────┘

All rows with same partition key stored together (locality)
Clustering key determines sort order within partition
Efficient range queries within partition
```

#### Cassandra Examples

```sql
-- ═══════════════════════════════════════════════════════════
-- Cassandra Query Language (CQL)
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. Create keyspace (like database)
-- ─────────────────────────────────────────────────────────

CREATE KEYSPACE ecommerce
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'us-east': 3,  -- 3 replicas in us-east datacenter
    'us-west': 3   -- 3 replicas in us-west datacenter
};

USE ecommerce;

-- ─────────────────────────────────────────────────────────
-- 2. Create table (column family)
-- ─────────────────────────────────────────────────────────

-- User events (time-series data)
CREATE TABLE user_events (
    user_id BIGINT,           -- Partition key (determines node)
    event_time TIMESTAMP,     -- Clustering key (sorts within partition)
    event_type TEXT,
    event_data TEXT,
    ip_address TEXT,
    user_agent TEXT,
    PRIMARY KEY (user_id, event_time)  -- Composite primary key
) WITH CLUSTERING ORDER BY (event_time DESC);  -- Newest first

-- Product views
CREATE TABLE product_views (
    product_id BIGINT,        -- Partition key
    view_time TIMESTAMP,      -- Clustering key
    user_id BIGINT,
    session_id TEXT,
    PRIMARY KEY (product_id, view_time)
) WITH CLUSTERING ORDER BY (view_time DESC)
AND default_time_to_live = 2592000;  -- Auto-delete after 30 days

-- ─────────────────────────────────────────────────────────
-- 3. Insert data
-- ─────────────────────────────────────────────────────────

-- Single insert
INSERT INTO user_events (user_id, event_time, event_type, event_data)
VALUES (1000, toTimestamp(now()), 'login', '{"ip": "1.2.3.4"}');

-- Insert with TTL (expires after 24 hours)
INSERT INTO user_events (user_id, event_time, event_type, event_data)
VALUES (1000, toTimestamp(now()), 'view_page', '{"page": "/home"}')
USING TTL 86400;

-- Batch insert (atomic within same partition)
BEGIN BATCH
    INSERT INTO user_events (user_id, event_time, event_type)
    VALUES (1000, '2024-01-01 10:00:00', 'login');
    
    INSERT INTO user_events (user_id, event_time, event_type)
    VALUES (1000, '2024-01-01 10:05:00', 'purchase');
    
    INSERT INTO user_events (user_id, event_time, event_type)
    VALUES (1000, '2024-01-01 10:10:00', 'logout');
APPLY BATCH;

-- ─────────────────────────────────────────────────────────
-- 4. Query data
-- ─────────────────────────────────────────────────────────

-- Query by partition key (efficient, single node)
SELECT * FROM user_events
WHERE user_id = 1000;

-- Query by partition key + clustering key range (efficient)
SELECT * FROM user_events
WHERE user_id = 1000
AND event_time >= '2024-01-01 00:00:00'
AND event_time < '2024-01-02 00:00:00';

-- Query recent events (uses clustering order)
SELECT * FROM user_events
WHERE user_id = 1000
LIMIT 100;  -- Last 100 events (DESC order)

-- ⚠️ Query without partition key (SLOW, scans all nodes)
SELECT * FROM user_events
WHERE event_type = 'login';  -- ERROR: Partition key required
-- Use ALLOW FILTERING (very slow, avoid in production)

-- ─────────────────────────────────────────────────────────
-- 5. Materialized views (denormalization)
-- ─────────────────────────────────────────────────────────

-- Create view with different partition key
CREATE MATERIALIZED VIEW events_by_type AS
SELECT user_id, event_time, event_type, event_data
FROM user_events
WHERE event_type IS NOT NULL AND user_id IS NOT NULL AND event_time IS NOT NULL
PRIMARY KEY (event_type, event_time, user_id);  -- Different partitioning

-- Now can query by event_type efficiently
SELECT * FROM events_by_type
WHERE event_type = 'login'
AND event_time >= '2024-01-01 00:00:00';

-- ─────────────────────────────────────────────────────────
-- 6. Counters (distributed counter)
-- ─────────────────────────────────────────────────────────

CREATE TABLE page_views (
    page_url TEXT PRIMARY KEY,
    view_count COUNTER
);

-- Increment counter (atomic)
UPDATE page_views
SET view_count = view_count + 1
WHERE page_url = '/home';

-- Read counter
SELECT view_count FROM page_views WHERE page_url = '/home';

-- ─────────────────────────────────────────────────────────
-- 7. Consistency levels (tunable)
-- ─────────────────────────────────────────────────────────

-- ONE: Wait for 1 replica (fastest, least consistent)
CONSISTENCY ONE;
SELECT * FROM user_events WHERE user_id = 1000;

-- QUORUM: Wait for majority (balanced)
CONSISTENCY QUORUM;
SELECT * FROM user_events WHERE user_id = 1000;

-- ALL: Wait for all replicas (slowest, most consistent)
CONSISTENCY ALL;
SELECT * FROM user_events WHERE user_id = 1000;

-- LOCAL_QUORUM: Quorum in local datacenter (low latency)
CONSISTENCY LOCAL_QUORUM;
SELECT * FROM user_events WHERE user_id = 1000;
```

```java
// ═══════════════════════════════════════════════════════════
// Cassandra Java Driver
// ═══════════════════════════════════════════════════════════

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.*;

public class CassandraExample {
    
    public static void main(String[] args) {
        // Connect to Cassandra cluster
        try (CqlSession session = CqlSession.builder()
                .addContactPoint(new InetSocketAddress("localhost", 9042))
                .withLocalDatacenter("datacenter1")
                .withKeyspace("ecommerce")
                .build()) {
            
            // ─────────────────────────────────────────────
            // Prepared statements (best practice)
            // ─────────────────────────────────────────────
            
            PreparedStatement insertStmt = session.prepare(
                "INSERT INTO user_events (user_id, event_time, event_type, event_data) " +
                "VALUES (?, ?, ?, ?)"
            );
            
            // Execute prepared statement
            session.execute(insertStmt.bind(
                1000L,
                Instant.now(),
                "login",
                "{\"ip\": \"1.2.3.4\"}"
            ));
            
            // ─────────────────────────────────────────────
            // Query with binding
            // ─────────────────────────────────────────────
            
            PreparedStatement selectStmt = session.prepare(
                "SELECT * FROM user_events WHERE user_id = ? LIMIT ?"
            );
            
            ResultSet rs = session.execute(selectStmt.bind(1000L, 100));
            
            for (Row row : rs) {
                long userId = row.getLong("user_id");
                Instant eventTime = row.getInstant("event_time");
                String eventType = row.getString("event_type");
                
                System.out.printf("User %d: %s at %s%n", 
                    userId, eventType, eventTime);
            }
            
            // ─────────────────────────────────────────────
            // Async execution
            // ─────────────────────────────────────────────
            
            CompletionStage<AsyncResultSet> future = 
                session.executeAsync(selectStmt.bind(1000L, 100));
            
            future.thenAccept(asyncRs -> {
                for (Row row : asyncRs.currentPage()) {
                    // Process row
                }
            });
        }
    }
}
```

---

### 🕸️ Type 4: Graph Databases

#### Neo4j Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          GRAPH DATABASE MODEL (Neo4j)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Social Network Example:                                     │
│                                                              │
│         (Alice)                    (Bob)                     │
│         Person                     Person                    │
│      ┌───────────┐              ┌───────────┐               │
│      │ name: Alice│              │ name: Bob │               │
│      │ age: 30   │              │ age: 35   │               │
│      └─────┬─────┘              └─────┬─────┘               │
│            │                          │                      │
│            │ [:FRIEND                 │ [:FRIEND             │
│            │  {since: 2020}]          │  {since: 2019}]      │
│            │                          │                      │
│            ▼                          ▼                      │
│         (Charlie)                  (David)                   │
│         Person                     Person                    │
│      ┌───────────┐              ┌───────────┐               │
│      │name:Charlie│              │name: David│               │
│      │ age: 28   │              │ age: 32   │               │
│      └─────┬─────┘              └─────┬─────┘               │
│            │                          │                      │
│            │ [:WORKS_AT               │ [:WORKS_AT           │
│            │  {since: 2021}]          │  {since: 2018}]      │
│            │                          │                      │
│            ▼                          ▼                      │
│       (Acme Corp)                (Acme Corp)                 │
│       Company                    Company                     │
│    ┌───────────────┐          ┌───────────────┐             │
│    │ name: Acme    │          │ name: Acme    │             │
│    │ industry: Tech│  (same)  │ industry: Tech│             │
│    └───────────────┘          └───────────────┘             │
│                                                              │
│  Nodes: Entities (Person, Company, Product)                  │
│  Relationships: Edges with properties (FRIEND, WORKS_AT)     │
│  Properties: Key-value pairs on nodes/relationships          │
│                                                              │
│  Advantages:                                                 │
│  ✅ Native relationship traversal (pointer-based)            │
│  ✅ Flexible schema (add nodes/relationships dynamically)    │
│  ✅ Complex queries (multi-hop relationships)                │
│  ✅ Pattern matching (Cypher query language)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Neo4j Examples

```cypher
-- ═══════════════════════════════════════════════════════════
-- Cypher Query Language (Neo4j)
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. Create nodes
-- ─────────────────────────────────────────────────────────

-- Create person nodes
CREATE (alice:Person {name: 'Alice', age: 30, city: 'SF'});
CREATE (bob:Person {name: 'Bob', age: 35, city: 'NYC'});
CREATE (charlie:Person {name: 'Charlie', age: 28, city: 'SF'});

-- Create company node
CREATE (acme:Company {name: 'Acme Corp', industry: 'Tech'});

-- ─────────────────────────────────────────────────────────
-- 2. Create relationships
-- ─────────────────────────────────────────────────────────

-- Alice and Bob are friends
MATCH (alice:Person {name: 'Alice'}), (bob:Person {name: 'Bob'})
CREATE (alice)-[:FRIEND {since: 2020}]->(bob);

-- Bidirectional friendship
MATCH (alice:Person {name: 'Alice'}), (bob:Person {name: 'Bob'})
CREATE (alice)-[:FRIEND {since: 2020}]->(bob),
       (bob)-[:FRIEND {since: 2020}]->(alice);

-- Charlie works at Acme
MATCH (charlie:Person {name: 'Charlie'}), (acme:Company {name: 'Acme Corp'})
CREATE (charlie)-[:WORKS_AT {since: 2021, role: 'Engineer'}]->(acme);

-- ─────────────────────────────────────────────────────────
-- 3. Query nodes and relationships
-- ─────────────────────────────────────────────────────────

-- Find all friends of Alice
MATCH (alice:Person {name: 'Alice'})-[:FRIEND]->(friend)
RETURN friend.name, friend.age;

-- Find Alice's friends who live in SF
MATCH (alice:Person {name: 'Alice'})-[:FRIEND]->(friend)
WHERE friend.city = 'SF'
RETURN friend.name;

-- Find where Charlie works
MATCH (charlie:Person {name: 'Charlie'})-[rel:WORKS_AT]->(company)
RETURN company.name, rel.role, rel.since;

-- ─────────────────────────────────────────────────────────
-- 4. Multi-hop traversals
-- ─────────────────────────────────────────────────────────

-- Friends of friends (2 hops)
MATCH (alice:Person {name: 'Alice'})-[:FRIEND]->()-[:FRIEND]->(fof)
WHERE fof.name <> 'Alice'  -- Exclude Alice herself
RETURN DISTINCT fof.name;

-- Friends of friends up to 3 hops
MATCH (alice:Person {name: 'Alice'})-[:FRIEND*1..3]->(friend)
RETURN DISTINCT friend.name;

-- Shortest path between two people
MATCH path = shortestPath(
    (alice:Person {name: 'Alice'})-[:FRIEND*]-(david:Person {name: 'David'})
)
RETURN path, length(path);

-- ─────────────────────────────────────────────────────────
-- 5. Recommendations (collaborative filtering)
-- ─────────────────────────────────────────────────────────

-- Products bought by Alice's friends but not by Alice
MATCH (alice:Person {name: 'Alice'})-[:FRIEND]->(friend)-[:BOUGHT]->(product)
WHERE NOT (alice)-[:BOUGHT]->(product)
RETURN product.name, COUNT(*) AS friend_count
ORDER BY friend_count DESC
LIMIT 10;

-- People Alice might know (friends of friends, not already friends)
MATCH (alice:Person {name: 'Alice'})-[:FRIEND]->()-[:FRIEND]->(suggestion)
WHERE NOT (alice)-[:FRIEND]->(suggestion)
AND alice <> suggestion
RETURN suggestion.name, COUNT(*) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10;

-- ─────────────────────────────────────────────────────────
-- 6. Aggregate and group
-- ─────────────────────────────────────────────────────────

-- Count employees per company
MATCH (person:Person)-[:WORKS_AT]->(company:Company)
RETURN company.name, COUNT(person) AS employee_count
ORDER BY employee_count DESC;

-- Average age of friends
MATCH (alice:Person {name: 'Alice'})-[:FRIEND]->(friend)
RETURN AVG(friend.age) AS avg_friend_age;

-- ─────────────────────────────────────────────────────────
-- 7. Update nodes and relationships
-- ─────────────────────────────────────────────────────────

-- Update node property
MATCH (alice:Person {name: 'Alice'})
SET alice.age = 31, alice.updated_at = timestamp();

-- Update relationship property
MATCH (alice:Person {name: 'Alice'})-[rel:FRIEND]->(bob:Person {name: 'Bob'})
SET rel.strength = 'strong';

-- Delete relationship
MATCH (alice:Person {name: 'Alice'})-[rel:FRIEND]->(bob:Person {name: 'Bob'})
DELETE rel;

-- Delete node and all relationships
MATCH (alice:Person {name: 'Alice'})
DETACH DELETE alice;  -- DETACH deletes relationships too

-- ─────────────────────────────────────────────────────────
-- 8. Indexes and constraints
-- ─────────────────────────────────────────────────────────

-- Create index on property
CREATE INDEX person_name_index FOR (p:Person) ON (p.name);

-- Create unique constraint
CREATE CONSTRAINT person_email_unique
FOR (p:Person) REQUIRE p.email IS UNIQUE;

-- Full-text index
CALL db.index.fulltext.createNodeIndex(
    'personFulltext',
    ['Person'],
    ['name', 'bio']
);

-- Search full-text index
CALL db.index.fulltext.queryNodes('personFulltext', 'software engineer')
YIELD node, score
RETURN node.name, score;
```

```java
// ═══════════════════════════════════════════════════════════
// Neo4j Java Driver
// ═══════════════════════════════════════════════════════════

import org.neo4j.driver.*;
import static org.neo4j.driver.Values.parameters;

public class Neo4jExample {
    
    public static void main(String[] args) {
        // Connect to Neo4j
        Driver driver = GraphDatabase.driver(
            "bolt://localhost:7687",
            AuthTokens.basic("neo4j", "password")
        );
        
        try (Session session = driver.session()) {
            
            // ─────────────────────────────────────────────
            // Create nodes and relationships
            // ─────────────────────────────────────────────
            
            session.writeTransaction(tx -> {
                tx.run("CREATE (alice:Person {name: $name, age: $age})",
                    parameters("name", "Alice", "age", 30));
                
                tx.run("CREATE (bob:Person {name: $name, age: $age})",
                    parameters("name", "Bob", "age", 35));
                
                tx.run("""
                    MATCH (alice:Person {name: $name1}), 
                          (bob:Person {name: $name2})
                    CREATE (alice)-[:FRIEND {since: $since}]->(bob)
                    """,
                    parameters("name1", "Alice", "name2", "Bob", "since", 2020));
                
                return null;
            });
            
            // ─────────────────────────────────────────────
            // Query and process results
            // ─────────────────────────────────────────────
            
            Result result = session.readTransaction(tx -> {
                return tx.run("""
                    MATCH (alice:Person {name: $name})-[:FRIEND]->(friend)
                    RETURN friend.name AS name, friend.age AS age
                    """,
                    parameters("name", "Alice"));
            });
            
            while (result.hasNext()) {
                Record record = result.next();
                String name = record.get("name").asString();
                int age = record.get("age").asInt();
                System.out.printf("Friend: %s, Age: %d%n", name, age);
            }
            
            // ─────────────────────────────────────────────
            // Recommendation query
            // ─────────────────────────────────────────────
            
            Result recommendations = session.readTransaction(tx -> {
                return tx.run("""
                    MATCH (alice:Person {name: $name})-[:FRIEND]->()
                          -[:FRIEND]->(suggestion)
                    WHERE NOT (alice)-[:FRIEND]->(suggestion)
                    AND alice <> suggestion
                    RETURN suggestion.name AS name, 
                           COUNT(*) AS mutual_friends
                    ORDER BY mutual_friends DESC
                    LIMIT 10
                    """,
                    parameters("name", "Alice"));
            });
            
            System.out.println("People Alice might know:");
            while (recommendations.hasNext()) {
                Record record = recommendations.next();
                System.out.printf("%s (%d mutual friends)%n",
                    record.get("name").asString(),
                    record.get("mutual_friends").asInt());
            }
        }
        
        driver.close();
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### WhatsApp-like Messaging System (Cassandra)

**Requirements:**
- 2 billion users
- 100 billion messages/day
- 1.16 million messages/second average
- 5 million messages/second peak
- Store messages for 30 days

**Storage Estimation:**

```
Message size:
= Sender ID (8 bytes) + Recipient ID (8 bytes) + Timestamp (8 bytes)
  + Message text (avg 200 bytes) + Metadata (50 bytes)
= 274 bytes per message

Daily storage:
= 100 billion messages × 274 bytes
= 27.4 TB/day

30-day storage:
= 27.4 TB × 30 days
= 822 TB raw data

With replication factor 3:
= 822 TB × 3 = 2,466 TB = 2.5 PB

With compression (50% reduction):
= 2.5 PB × 0.5 = 1.25 PB total storage needed
```

**Throughput Estimation:**

```
Average writes:
= 100 billion messages / 86,400 seconds
= 1.16 million writes/second

Peak writes (5x average):
= 5.8 million writes/second

Reads (assume 2x writes, people read more than send):
= 2.32 million reads/second average
= 11.6 million reads/second peak
```

**Cassandra Cluster Sizing:**

```
Node capacity:
= 1 TB storage per node (recommended)
= 10k writes/second per node
= 30k reads/second per node

Nodes needed (storage):
= 1.25 PB / 1 TB per node
= 1,250 nodes

Nodes needed (write throughput):
= 5.8M writes/sec / 10k per node
= 580 nodes

Nodes needed (read throughput):
= 11.6M reads/sec / 30k per node
= 387 nodes

Total nodes: 1,250 (storage is bottleneck)

With replication factor 3:
= Effective capacity per node = 1 TB / 3 = 333 GB unique data
= Still need 1,250 nodes

Cost (AWS i3.2xlarge: 8 vCPU, 61 GB RAM, 1.9 TB NVMe):
= $0.624/hour × 1,250 nodes
= $780/hour = $561,600/month
```

**Optimization:**

```
Use TTL (30-day expiration):
= Auto-delete old messages
= Steady-state storage (not growing)
= No manual cleanup needed

Compression:
= LZ4 compression (2x-3x)
= Reduce storage by 50-66%

Data model:
= Partition key: user_id
= Clustering key: conversation_id, timestamp
= All messages for user stored together (locality)
= Efficient queries: "Get my recent messages"
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Choosing the Right NoSQL Database

```
┌─────────────────────────────────────────────────────────────┐
│          NOSQL DATABASE DECISION TREE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  What's your primary use case?                               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Simple key-value lookups? (session, cache)         │    │
│  │ ✓ Key-Value Store: Redis, DynamoDB                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Flexible documents? (JSON, nested data)            │    │
│  │ ✓ Document Store: MongoDB, Couchbase              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Time-series data? (logs, events, IoT)              │    │
│  │ ✓ Columnar Store: Cassandra, HBase, ScyllaDB      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Complex relationships? (social, fraud detection)    │    │
│  │ ✓ Graph Store: Neo4j, Neptune, JanusGraph         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Use Case Comparison:
═══════════════════

┌──────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Feature      │ Key-Value   │ Document    │ Columnar    │ Graph       │
├──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Data Model   │ Simple      │ Flexible    │ Wide-column │ Nodes+Edges │
│              │ key→value   │ JSON/BSON   │ Time-series │ Relationships│
├──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Query        │ Get/Set     │ Rich queries│ Range scans │ Traversals  │
│ Complexity   │ Simple      │ Medium      │ Simple      │ Complex     │
├──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Scale        │ Millions    │ Billions    │ Petabytes   │ Billions    │
│              │ ops/sec     │ documents   │ (writes)    │ relationships│
├──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Consistency  │ Eventual    │ Tunable     │ Eventual    │ ACID        │
│              │ (Redis)     │ (MongoDB)   │ (Cassandra) │ (Neo4j)     │
│              │ Strong      │             │             │             │
│              │ (DynamoDB)  │             │             │             │
├──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Use Cases    │ Cache       │ CMS         │ Logs        │ Social      │
│              │ Session     │ Catalog     │ Events      │ Fraud       │
│              │ Leaderboard │ Profile     │ IoT         │ Recommend   │
├──────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Examples     │ Redis       │ MongoDB     │ Cassandra   │ Neo4j       │
│              │ DynamoDB    │ Couchbase   │ HBase       │ Neptune     │
│              │ Riak        │ DocumentDB  │ ScyllaDB    │ JanusGraph  │
└──────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### Data Modeling Examples

```javascript
// ═══════════════════════════════════════════════════════════
// Data modeling: Same data, different databases
// ═══════════════════════════════════════════════════════════

// Scenario: E-commerce order system

// ─────────────────────────────────────────────────────────
// 1. Relational (PostgreSQL) - Normalized
// ─────────────────────────────────────────────────────────

/*
Table: customers
┌──────────────┬───────────────────┬──────────────┐
│ customer_id  │ email             │ name         │
├──────────────┼───────────────────┼──────────────┤
│ 1000         │ john@example.com  │ John Doe     │
└──────────────┴───────────────────┴──────────────┘

Table: orders
┌──────────┬──────────────┬───────────┬────────┐
│ order_id │ customer_id  │ order_date│ total  │
├──────────┼──────────────┼───────────┼────────┤
│ 5001     │ 1000         │ 2024-01-01│ 999.99 │
└──────────┴──────────────┴───────────┴────────┘

Table: order_items
┌───────────────┬──────────┬────────────┬──────────┬───────┐
│ order_item_id │ order_id │ product_id │ quantity │ price │
├───────────────┼──────────┼────────────┼──────────┼───────┤
│ 1             │ 5001     │ 101        │ 1        │999.99 │
└───────────────┴──────────┴────────────┴──────────┴───────┘

Query (requires JOINs):
SELECT c.name, o.order_id, o.total, p.name, oi.quantity
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE c.customer_id = 1000;
*/

// ─────────────────────────────────────────────────────────
// 2. Document (MongoDB) - Denormalized
// ─────────────────────────────────────────────────────────

{
    "_id": ObjectId("..."),
    "order_id": 5001,
    "customer": {  // Embedded customer info
        "customer_id": 1000,
        "email": "john@example.com",
        "name": "John Doe"
    },
    "items": [  // Embedded order items
        {
            "product_id": 101,
            "sku": "LAPTOP-XYZ",
            "name": "Laptop",
            "quantity": 1,
            "price": 999.99
        }
    ],
    "order_date": ISODate("2024-01-01T00:00:00Z"),
    "total": 999.99,
    "status": "paid"
}

// Query (single document lookup, no JOINs):
db.orders.findOne({ order_id: 5001 });

// Trade-offs:
// ✅ Fast reads (single query)
// ✅ All data together (no JOINs)
// ⚠️ Data duplication (customer info in every order)
// ⚠️ Update complexity (change name → update all orders?)

// ─────────────────────────────────────────────────────────
// 3. Key-Value (DynamoDB) - Simple lookups
// ─────────────────────────────────────────────────────────

// Partition key: order_id
{
    "order_id": "5001",  // Partition key
    "customer_id": "1000",
    "customer_email": "john@example.com",
    "customer_name": "John Doe",
    "items": [
        {
            "product_id": "101",
            "name": "Laptop",
            "quantity": 1,
            "price": 999.99
        }
    ],
    "order_date": "2024-01-01T00:00:00Z",
    "total": 999.99
}

// Query by partition key (fast):
table.get_item(Key={'order_id': '5001'})

// Query by customer_id (requires GSI - Global Secondary Index):
// Create GSI: customer_id (partition key) + order_date (sort key)
table.query(
    IndexName='customer_id-index',
    KeyConditionExpression='customer_id = :cid',
    ExpressionAttributeValues={':cid': '1000'}
)

// Trade-offs:
// ✅ Extremely fast point lookups (< 10ms)
// ✅ Auto-scaling, managed service
// ⚠️ Limited query patterns (need GSI for non-key queries)
// ⚠️ Cost increases with GSIs

// ─────────────────────────────────────────────────────────
// 4. Columnar (Cassandra) - Time-series queries
// ─────────────────────────────────────────────────────────

/*
Table: orders_by_customer
PRIMARY KEY (customer_id, order_date, order_id)

Row:
┌──────────────┬────────────┬──────────┬────────┬────────┐
│ customer_id  │ order_date │ order_id │ total  │ status │
├──────────────┼────────────┼──────────┼────────┼────────┤
│ 1000         │ 2024-01-01 │ 5001     │ 999.99 │ paid   │
│ 1000         │ 2024-01-15 │ 5002     │ 49.99  │ paid   │
│ 1000         │ 2024-02-01 │ 5003     │ 199.99 │ pending│
└──────────────┴────────────┴──────────┴────────┴────────┘

Query (efficient range scan within partition):
SELECT * FROM orders_by_customer
WHERE customer_id = 1000
AND order_date >= '2024-01-01'
AND order_date < '2024-02-01';
*/

// All customer's orders stored together on same node
// Efficient time-range queries
// Linear scalability (add more nodes)

// Trade-offs:
// ✅ Write-optimized (append-only)
// ✅ Time-range queries within partition
// ⚠️ Limited query flexibility (partition key required)
// ⚠️ No JOINs, no aggregations across partitions

// ─────────────────────────────────────────────────────────
// 5. Graph (Neo4j) - Relationship-focused
// ─────────────────────────────────────────────────────────

/*
(Customer:Person {customer_id: 1000, name: "John Doe"})
    -[:PLACED {date: "2024-01-01"}]->
(Order {order_id: 5001, total: 999.99})
    -[:CONTAINS {quantity: 1, price: 999.99}]->
(Product {product_id: 101, name: "Laptop"})
    <-[:BOUGHT]-
(OtherCustomer:Person {customer_id: 2000})

Query (find products bought by similar customers):
MATCH (customer:Person {customer_id: 1000})-[:PLACED]->(:Order)
      -[:CONTAINS]->(product:Product)<-[:CONTAINS]-(:Order)
      <-[:PLACED]-(similar:Person)
WHERE customer <> similar
RETURN similar.name, COUNT(DISTINCT product) AS common_products
ORDER BY common_products DESC;
*/

// Trade-offs:
// ✅ Natural relationship modeling
// ✅ Complex traversals (friends, recommendations)
// ⚠️ Different mental model
// ⚠️ Horizontal scaling more complex than other NoSQL
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Cassandra Scalability Model

```
Linear Scalability:
═══════════════════

3 nodes:         9 nodes:              30 nodes:
10k writes/sec   30k writes/sec        100k writes/sec
30k reads/sec    90k reads/sec         300k reads/sec
3 TB storage     9 TB storage          30 TB storage

Perfect linear scaling: 3x nodes = 3x throughput

Implementation:
───────────────

1. Consistent hashing:
   - Data evenly distributed across nodes
   - Adding node: Only neighbor nodes affected
   - Minimal data movement

2. No master node:
   - All nodes equal (peer-to-peer)
   - No single point of failure
   - Client can connect to any node

3. Replication:
   - Data replicated to N nodes (RF=3 typical)
   - Node failure: Data still available on replicas
   - Replica auto-repairs from other replicas

4. Tunable consistency:
   - Write: Wait for 1 node (fast) or quorum (consistent)
   - Read: Query 1 node (fast) or quorum (consistent)
   - Consistency level chosen per query
```

### MongoDB Sharding Strategy

```
┌─────────────────────────────────────────────────────────────┐
│          MONGODB SHARD KEY STRATEGIES                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Hash-based sharding (even distribution):                 │
│                                                              │
│  Shard key: Hashed(user_id)                                 │
│                                                              │
│  user_id=1000 → Hash → 42 → Shard 1                         │
│  user_id=1001 → Hash → 187 → Shard 3                        │
│  user_id=1002 → Hash → 93 → Shard 2                         │
│                                                              │
│  ✅ Even distribution (no hot shards)                        │
│  ⚠️ Range queries inefficient (scatter-gather)              │
│  ⚠️ Can't target specific shard                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  2. Range-based sharding (efficient range queries):          │
│                                                              │
│  Shard key: user_id (not hashed)                            │
│                                                              │
│  Shard 1: user_id 0 - 1,000,000                             │
│  Shard 2: user_id 1,000,001 - 2,000,000                     │
│  Shard 3: user_id 2,000,001 - 3,000,000                     │
│                                                              │
│  ✅ Range queries efficient (single shard)                   │
│  ⚠️ Risk of hot shards (sequential IDs → all writes to last)│
│  ⚠️ Uneven distribution if IDs not uniform                  │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  3. Compound shard key (balance both):                       │
│                                                              │
│  Shard key: {region: 1, user_id: 1}                         │
│                                                              │
│  Shard 1: region=US, user_id 0-1M                           │
│  Shard 2: region=US, user_id 1M-2M                          │
│  Shard 3: region=EU, user_id 0-1M                           │
│  Shard 4: region=EU, user_id 1M-2M                          │
│                                                              │
│  ✅ Even distribution within region                          │
│  ✅ Efficient queries by region                              │
│  ⚠️ More complex to manage                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Chunk Migration (Balancing):
════════════════════════════

Shard 1: 80% full → Shard 3: 20% full

Balancer: Migrate chunks from Shard 1 to Shard 3

Process:
1. Identify imbalanced shards (threshold: 10% difference)
2. Select chunk to migrate (largest chunk from heavy shard)
3. Copy chunk to destination shard (background process)
4. Update metadata (chunk now on destination)
5. Delete chunk from source shard
6. Clients automatically route to new shard

Zero downtime: Chunk accessible during migration
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### DynamoDB Security Best Practices

```java
// ═══════════════════════════════════════════════════════════
// IAM-based access control (AWS DynamoDB)
// ═══════════════════════════════════════════════════════════

// IAM policy: Least privilege
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/Orders",
            "Condition": {
                "ForAllValues:StringEquals": {
                    "dynamodb:LeadingKeys": ["${aws:username}"]
                }
            }
        }
    ]
}
// User can only access their own data (partition key = username)

// ═══════════════════════════════════════════════════════════
// Encryption
// ═══════════════════════════════════════════════════════════

// Encryption at rest (enabled by default in DynamoDB)
// - AWS-managed keys or customer-managed keys (KMS)
// - Transparent encryption/decryption

// Encryption in transit (HTTPS)
AmazonDynamoDB client = AmazonDynamoDBClientBuilder.standard()
    .withRegion("us-east-1")
    .withClientConfiguration(
        new ClientConfiguration().withProtocol(Protocol.HTTPS)
    )
    .build();

// ═══════════════════════════════════════════════════════════
// Audit logging (AWS CloudTrail)
// ═══════════════════════════════════════════════════════════

// CloudTrail logs all DynamoDB API calls:
// - Who (IAM user/role)
// - What (GetItem, PutItem, DeleteTable)
// - When (timestamp)
// - Source IP
// - Success/failure

// Query CloudTrail logs:
// aws cloudtrail lookup-events \
//   --lookup-attributes AttributeKey=ResourceName,AttributeValue=Orders \
//   --max-items 10
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Netflix - Cassandra for Viewing History

**Challenge:**
- 200M+ subscribers
- Billions of viewing events daily
- Need fast writes (record every play/pause/stop)
- Need fast reads (resume playback from exact position)
- Global distribution (low latency worldwide)

**Solution: Cassandra**

**Data Model:**
```sql
CREATE TABLE viewing_history (
    user_id BIGINT,           -- Partition key
    content_id BIGINT,        -- Clustering key
    last_watched_at TIMESTAMP,
    position_seconds INT,
    device_id TEXT,
    PRIMARY KEY (user_id, content_id)
);
```

**Architecture:**
- Multi-region Cassandra clusters
- 3-way replication per region
- LOCAL_QUORUM consistency (fast, consistent within region)
- TTL for old viewing history (auto-cleanup)

**Results:**
- Millions of writes/second
- Sub-10ms p99 latency
- 99.99% availability
- Linear scalability (add nodes as subscribers grow)

**Key Lessons:**
1. Choose Cassandra for write-heavy, globally distributed data
2. Partition key = user_id ensures locality (all user's data together)
3. LOCAL_QUORUM balances consistency and latency
4. TTL reduces storage costs (old data auto-deleted)

---

### Example 2: Uber - MongoDB for Trip Data

**Challenge:**
- Millions of trips/day
- Complex data (driver, rider, route, fare breakdown)
- Schema evolves frequently (new ride types, pricing models)
- Need flexible queries (by rider, by driver, by region)

**Solution: MongoDB**

**Data Model:**
```javascript
{
    "_id": ObjectId("..."),
    "trip_id": "ABC123",
    "rider": {
        "user_id": 1000,
        "name": "John Doe",
        "rating": 4.8,
        "pickup_location": {
            "lat": 37.7749,
            "lon": -122.4194,
            "address": "123 Market St, SF"
        }
    },
    "driver": {
        "user_id": 2000,
        "name": "Jane Smith",
        "rating": 4.9,
        "vehicle": "Toyota Camry 2020"
    },
    "route": [
        {"lat": 37.7749, "lon": -122.4194, "timestamp": "..."},
        {"lat": 37.7750, "lon": -122.4195, "timestamp": "..."},
        // ... hundreds of GPS points
    ],
    "fare": {
        "base": 2.50,
        "distance": 15.75,
        "time": 8.50,
        "surge": 5.00,
        "total": 31.75
    },
    "status": "completed",
    "created_at": ISODate("2024-01-01T10:00:00Z"),
    "completed_at": ISODate("2024-01-01T10:30:00Z")
}
```

**Sharding Strategy:**
- Shard by trip_id (hash-based, even distribution)
- Secondary indexes on rider.user_id, driver.user_id
- Geospatial indexes for location-based queries

**Results:**
- Flexible schema (add new fields without migration)
- Rich queries (by rider, driver, location, date range)
- Fast reads (single document contains all trip data)
- Horizontal scalability (1000+ nodes)

**Key Lessons:**
1. MongoDB fits complex, evolving schemas
2. Embedded documents reduce JOINs
3. Geospatial indexes enable location queries
4. Sharding by trip_id prevents hot shards

---

### Example 3: LinkedIn - Graph Database for Connections

**Challenge:**
- 900M+ members
- Billions of connections
- Complex queries ("2nd degree connections", "shortest path")
- Recommendation engine (people you may know)
- Real-time updates

**Solution: Neo4j (Graph Database)**

**Data Model:**
```cypher
(Person {id: 1000, name: "John Doe"})-[:CONNECTED_TO {since: 2020}]->(Person {id: 2000})
(Person {id: 1000})-[:WORKS_AT]->(Company {id: 100, name: "Acme"})
(Person {id: 1000})-[:STUDIED_AT]->(University {id: 200, name: "Stanford"})
```

**Key Queries:**
```cypher
// 2nd degree connections (friends of friends)
MATCH (me:Person {id: 1000})-[:CONNECTED_TO]->()-[:CONNECTED_TO]->(suggestion)
WHERE NOT (me)-[:CONNECTED_TO]->(suggestion)
RETURN suggestion
LIMIT 10;

// People at my company
MATCH (me:Person {id: 1000})-[:WORKS_AT]->(company)<-[:WORKS_AT]-(colleague)
RETURN colleague;

// Shortest path to someone
MATCH path = shortestPath(
    (me:Person {id: 1000})-[:CONNECTED_TO*]-(them:Person {id: 5000})
)
RETURN path;
```

**Results:**
- Sub-second queries for multi-hop traversals
- Natural modeling of relationships
- Real-time recommendations
- Complex queries simple to express (Cypher)

**Key Lessons:**
1. Graph databases excel at relationship-heavy data
2. Multi-hop traversals fast (native graph storage)
3. Cypher query language intuitive for relationships
4. Use for social networks, fraud detection, recommendations

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Answer: "Explain NoSQL databases"

**Answer:**
*"NoSQL databases are distributed storage systems optimized for horizontal scalability, flexible schemas, and high availability over ACID transactions. Four main types:*

*First, key-value stores like Redis and DynamoDB—simplest model, key maps to value. Use for session storage, caching, leaderboards. Fast: millions of operations/second. Trade-off: Simple queries only, no JOINs.*

*Second, document databases like MongoDB—store JSON/BSON documents with flexible schema. Nested structures, rich queries, no rigid schema. Use for content management, catalogs, user profiles. Scale to billions of documents. Trade-off: Eventual consistency by default, need denormalization for performance.*

*Third, columnar databases like Cassandra—optimized for write-heavy workloads, time-series data. Append-only, linear scalability. Use for logs, events, IoT. Write millions/second across thousands of nodes. Trade-off: Limited query patterns, partition key required.*

*Fourth, graph databases like Neo4j—model relationships explicitly. Nodes and edges with properties. Use for social networks, fraud detection, recommendations. Complex multi-hop traversals efficient. Trade-off: Different mental model, horizontal scaling more complex.*

*Key characteristics: BASE not ACID—Basically Available, Soft state, Eventually consistent. CAP theorem: Choose availability and partition tolerance over strong consistency. Horizontal scaling via sharding and replication. Schema flexibility.*

*Choose NoSQL when: Need massive scale (billions of records), flexible schema (rapid iteration), global distribution (low latency worldwide), specific use case (time-series, relationships, documents). Use relational when need ACID transactions, complex JOINs, strong consistency."*

---

### Common Follow-Up Questions

**Q: "How does Cassandra achieve linear scalability?"**

**A:** *"Cassandra achieves linear scalability through five mechanisms:*

*First, peer-to-peer architecture—no master node, all nodes equal. Client can connect to any node. No single bottleneck. Adding node immediately increases capacity.*

*Second, consistent hashing for data distribution. Hash partition key to token (0-2^64). Token ring assigns ranges to nodes. Example: 6 nodes, each owns 1/6 of token space. Adding 7th node: Takes 1/7 from each neighbor. Only ~14% data moves (1/6 old nodes → 1/7 new total). Minimal redistribution.*

*Third, replication for fault tolerance. Replication factor 3: Data stored on 3 nodes. Primary node plus 2 replicas (clockwise in ring). Node failure: Replicas serve data. No downtime.*

*Fourth, tunable consistency. Write: Coordinator sends to all replicas, waits for quorum (2/3) before acknowledging. Read: Query quorum, compare timestamps, return latest. Balance consistency and latency per query.*

*Fifth, write-optimized storage engine. Write path: Append to commit log (sequential, fast), update memtable (in-memory), flush to SSTable (immutable). No read-before-write. No locks. Pure append operations.*

*Scalability proof: 3 nodes handle 10k writes/sec. Add 3 nodes → 6 total → 20k writes/sec (linear). Add 24 more → 30 total → 100k writes/sec. Each node independently serves 3.3k writes/sec. No coordination overhead.*

*Real example: Netflix runs 30,000+ node Cassandra clusters. Petabytes of data. Millions of writes/second. Adding 1,000 nodes increases throughput by 1,000x. Perfect linear scaling verified in production.*

*Trade-off: Complexity. Need monitoring, capacity planning, token distribution understanding. But gains: Unlimited horizontal scale, no rewrites when growing 10x, 100x, 1000x."*

---

**Q: "When would you choose MongoDB over Cassandra?"**

**A:** *"Four decision criteria:*

*First, data model complexity. MongoDB if: Nested documents (orders with items), flexible schema (product attributes vary by category), rich queries (filter on multiple fields, aggregations). Example: E-commerce catalog—products have category-specific attributes, need full-text search, aggregation pipelines for analytics. MongoDB excels here.*

*Cassandra if: Simple data model (key-value pairs, time-series), fixed query patterns (always query by partition key), write-heavy (logs, events, metrics). Example: IoT sensor data—device_id + timestamp primary key, append-only writes, range queries by time. Cassandra optimized for this.*

*Second, query patterns. MongoDB if: Ad-hoc queries (exploratory analysis), complex filters (multiple conditions, OR logic), aggregation pipelines (GROUP BY, JOIN-like operations). MongoDB query planner handles varied queries.*

*Cassandra if: Predictable queries (known partition key), time-range queries within partition, no cross-partition queries. Cassandra requires partition key—design tables per query pattern.*

*Third, consistency requirements. MongoDB if: Need strong consistency (default), single-document ACID transactions (4.0+), multi-document transactions (4.2+). Example: Financial transactions, inventory management.*

*Cassandra if: Eventual consistency acceptable, AP system (availability + partition tolerance), tunable consistency per query. Example: Social media feeds, activity streams—stale data tolerable for seconds.*

*Fourth, write vs read ratio. MongoDB if: Read-heavy (10:1 reads:writes), complex reads justify denormalization, secondary indexes helpful.*

*Cassandra if: Write-heavy (1:1 or 1:10 reads:writes), append-only pattern, time-series data. Cassandra write throughput 3-5x MongoDB.*

*Real example: Uber uses both—MongoDB for trip data (complex, flexible schema, moderate writes), Cassandra for GPS traces (billions of writes, simple model, time-range queries).*

*Choose MongoDB: Complex documents, flexible queries, strong consistency, moderate scale (< 1 billion records). Choose Cassandra: Massive write throughput, time-series, predictable queries, extreme scale (petabytes)."*

---

**Q: "Explain eventual consistency with a real-world example"**

**A:** *"Eventual consistency: System guarantees all replicas converge to same value given enough time, but allows temporary inconsistency.*

*Real example: Facebook Like Counter*

*Scenario: Post has 100 likes. Three replicas: US-East, US-West, EU.*

*Time T0: User in US-East likes post*
- Write arrives US-East replica: 101 likes
- US-East immediately returns success to user
- Asynchronously replicates to US-West and EU
- Replication takes 100-500ms

*Time T1 (100ms later): User in EU views post*
- Reads from EU replica: Still shows 100 likes (stale)
- Replication not yet reached EU
- Temporary inconsistency: US-East sees 101, EU sees 100

*Time T2 (500ms later): Replication complete*
- All replicas converge: 101 likes
- Eventually consistent: All users now see 101

*Trade-offs:*
- ✅ High availability: US-East write succeeded even if EU offline
- ✅ Low latency: US-East user got instant response (no cross-region sync)
- ✅ Partition tolerance: Network split between US and EU? Both sides continue operating
- ⚠️ Temporary inconsistency: EU users saw stale count for 500ms

*Acceptable for: Social feeds, view counts, recommendations, analytics*

*NOT acceptable for: Bank balance, inventory (can't sell same item twice), seat reservations*

*Implementation in DynamoDB:*
- Write: Primary receives write, returns success, async replicates
- Read: Query single replica (may be stale) or quorum (more consistent)
- Conflict resolution: Last write wins (timestamp-based)

*Contrast with strong consistency (PostgreSQL):*
- Write blocks until all replicas acknowledge (200-500ms cross-region latency)
- Read always sees latest value
- Lower availability if replica offline
- Required for financial transactions

*Interview key point: Eventual consistency trades instant consistency for availability and latency. Choose based on business requirements, not technical preference."*

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why Non-Relational Databases Matter

**Business Impact:**
- **Scale**: Support billions of users (Facebook, Netflix, Uber)
- **Global reach**: Low-latency access worldwide (multi-region replication)
- **Cost efficiency**: Scale horizontally with commodity hardware (vs expensive vertical scaling)
- **Agility**: Flexible schemas enable rapid feature iteration
- **Availability**: 99.99%+ uptime (five nines, < 5 minutes downtime/year)

**Technical Impact:**
- **Horizontal scalability**: Linear growth (2x nodes = 2x throughput)
- **Schema flexibility**: Adapt to changing requirements without downtime
- **Specialized models**: Optimize for specific use cases (time-series, graphs, documents)
- **High availability**: Multi-replica, multi-region, partition tolerance
- **Performance**: Millions of operations/second, sub-millisecond latency

### How Non-Relational Databases Work

**Core Architecture:**
1. **Distributed by design**: Data partitioned across multiple nodes (sharding)
2. **Replication**: Multiple copies for fault tolerance and read scaling
3. **Consistent hashing**: Evenly distribute data, minimize data movement on scaling
4. **No master**: Peer-to-peer (Cassandra) or replica sets (MongoDB)
5. **Tunable consistency**: Trade consistency for availability/latency per operation

**Four Types:**
- **Key-Value** (Redis, DynamoDB): Simple lookups, session storage, caching
- **Document** (MongoDB, Couchbase): JSON documents, flexible schema, rich queries
- **Columnar** (Cassandra, HBase): Time-series, write-heavy, log data
- **Graph** (Neo4j, Neptune): Relationships, social networks, recommendations

### Trade-Offs to Remember

```
Strong Consistency ←→ High Availability
- SQL: Strong consistency (CP in CAP)
- NoSQL: Eventual consistency (AP in CAP)

Flexible Queries ←→ Performance
- SQL: JOINs, complex queries (slower at scale)
- NoSQL: Denormalized, simple queries (faster, limited flexibility)

Schema Enforcement ←→ Schema Flexibility
- SQL: Fixed schema (catch bugs, migration overhead)
- NoSQL: Flexible schema (rapid iteration, application validation needed)

ACID Transactions ←→ Scalability
- SQL: ACID guarantees (limited horizontal scale)
- NoSQL: BASE properties (unlimited horizontal scale)
```

### Interview Red Flags

🚫 "NoSQL is faster than SQL"
✅ "NoSQL optimized for different use cases—write-heavy, flexible schema, horizontal scale. SQL faster for complex queries, JOINs, analytics."

🚫 "Always use eventual consistency"
✅ "Eventual consistency trades consistency for availability. Choose based on requirements: social feeds (yes), bank balance (no)."

🚫 "MongoDB is schemaless"
✅ "MongoDB has flexible schema—documents can have different fields. Still validate in application code. Schema flexibility != no schema."

### Final Sound Bite

*"Non-relational databases: Distributed storage systems optimized for horizontal scalability, flexible schemas, and high availability. Four types: Key-value (Redis, DynamoDB), Document (MongoDB), Columnar (Cassandra), Graph (Neo4j).*

*Core concepts: BASE properties (Basically Available, Soft state, Eventually consistent), CAP theorem (choose 2 of 3: Consistency, Availability, Partition tolerance), consistent hashing (even data distribution), tunable consistency (balance per operation).*

*Scalability: Horizontal via sharding and replication. Linear growth: 2x nodes = 2x throughput. No single master bottleneck. Cassandra: Peer-to-peer, add 1000 nodes = 1000x throughput.*

*Use when: Massive scale (billions of records), flexible schema (rapid iteration), global distribution (multi-region), specialized model (time-series, graphs). Not when: Need ACID transactions, complex JOINs, strong consistency.*

*Real-world: Netflix uses Cassandra (billions of viewing events), Uber uses MongoDB (trip data), LinkedIn uses Neo4j (social connections). Facebook, Google, Amazon all polyglot persistence (multiple database types).*

*Trade-offs: Availability vs consistency, performance vs query flexibility, schema flexibility vs enforcement, horizontal scalability vs transaction guarantees. Choose based on requirements, measure, iterate."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
