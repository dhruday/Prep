# 74. Directory-Based Sharding

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Directory-Based Sharding?

**Directory-based sharding** uses a lookup table (directory) to map keys to shards, providing flexible routing without fixed hash functions or ranges.

**Example: Users Table with Directory Lookup**

```
┌────────────────────────────────────────┐
│        DIRECTORY (Lookup Table)        │
├────────────┬───────────────────────────┤
│ user_id    │ shard_id                  │
├────────────┼───────────────────────────┤
│ 1-100000   │ shard_0                   │
│ 100001-... │ shard_1                   │
│ 500000-... │ shard_0 (rebalanced)      │
│ celebrity  │ shard_dedicated           │
└────────────┴───────────────────────────┘
          ↓
Query user_id 123456
  1. Lookup: directory[123456] → shard_1
  2. Route: Query shard_1

┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐
│ Shard 0 │  │ Shard 1 │  │ Shard 2 │  │ Shard Celeb   │
│ 2.5M    │  │ 2.5M    │  │ 2.5M    │  │ 100K celebrity│
│ users   │  │ users   │  │ users   │  │ users (hot)   │
└─────────┘  └─────────┘  └─────────┘  └───────────────┘
```

### Directory vs Hash vs Range

| Aspect | Directory | Hash | Range |
|--------|-----------|------|-------|
| **Flexibility** | ✅ High (custom rules) | ❌ Fixed hash | ⚠️ Fixed ranges |
| **Rebalancing** | ✅ Easy (update directory) | ❌ Hard (rehash) | ⚠️ Medium (split) |
| **Lookup overhead** | ❌ Extra hop (directory) | ✅ Direct | ✅ Direct |
| **Single point of failure** | ❌ Directory is SPOF | ✅ No SPOF | ✅ No SPOF |
| **Complexity** | ❌ High | ✅ Low | ✅ Low |
| **Use case** | Multi-tenant SaaS | Users, sessions | Logs, time-series |

**Routing comparison**:
```python
# Hash-based (direct, no lookup)
shard_id = hash(user_id) % num_shards  # 1 operation

# Directory-based (extra lookup)
shard_id = directory.lookup(user_id)   # 2 operations (lookup + route)
```

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Directory Structure and Storage

**Directory Table** (maps keys to shards):

```sql
-- Simple directory (key → shard mapping)
CREATE TABLE shard_directory (
    user_id BIGINT PRIMARY KEY,
    shard_id VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_user_shard ON shard_directory(user_id);

-- Example entries:
INSERT INTO shard_directory VALUES
(123456, 'shard_1', NOW(), NOW()),
(789012, 'shard_2', NOW(), NOW()),
(345678, 'shard_dedicated', NOW(), NOW());  -- Celebrity user on dedicated shard

-- Query directory (O(log N) with index):
SELECT shard_id FROM shard_directory WHERE user_id = 123456;
-- Returns: 'shard_1'
```

**Range-Based Directory** (more efficient for sequential keys):

```sql
-- Directory stores ranges instead of individual keys
CREATE TABLE shard_range_directory (
    range_id SERIAL PRIMARY KEY,
    min_user_id BIGINT,
    max_user_id BIGINT,
    shard_id VARCHAR(50),
    status ENUM('active', 'migrating', 'archived'),
    created_at TIMESTAMP
);

-- Example entries:
INSERT INTO shard_range_directory VALUES
(1, 1, 1000000, 'shard_0', 'active', NOW()),
(2, 1000001, 2000000, 'shard_1', 'active', NOW()),
(3, 2000001, 3000000, 'shard_2', 'active', NOW()),
(4, 3000001, 9999999, 'shard_3', 'active', NOW());

-- Lookup (find range containing user_id):
SELECT shard_id FROM shard_range_directory
WHERE min_user_id <= 123456 AND max_user_id >= 123456
  AND status = 'active';

-- Complexity: O(log N) with B-tree index on (min_user_id, max_user_id)
```

**Python Implementation**:

```python
import redis
import json

class ShardDirectory:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.cache_ttl = 3600  # 1 hour cache
    
    def get_shard(self, user_id):
        """Lookup shard for user_id (with caching)"""
        
        # Step 1: Check cache (Redis)
        cache_key = f"shard:{user_id}"
        cached_shard = self.redis.get(cache_key)
        if cached_shard:
            return cached_shard.decode('utf-8')
        
        # Step 2: Query directory database
        shard_id = self.db_lookup(user_id)
        
        # Step 3: Cache result
        self.redis.setex(cache_key, self.cache_ttl, shard_id)
        
        return shard_id
    
    def db_lookup(self, user_id):
        """Query directory database"""
        query = """
            SELECT shard_id FROM shard_range_directory
            WHERE min_user_id <= %s AND max_user_id >= %s
              AND status = 'active'
            LIMIT 1
        """
        result = self.directory_db.execute(query, (user_id, user_id))
        if not result:
            raise ValueError(f"No shard found for user_id {user_id}")
        return result[0]['shard_id']
    
    def update_mapping(self, user_id, new_shard_id):
        """Update directory and invalidate cache"""
        # Update database
        self.directory_db.execute("""
            UPDATE shard_directory
            SET shard_id = %s, updated_at = NOW()
            WHERE user_id = %s
        """, (new_shard_id, user_id))
        
        # Invalidate cache
        cache_key = f"shard:{user_id}"
        self.redis.delete(cache_key)

# Usage:
directory = ShardDirectory(redis_client)

# Lookup (first time: cache miss, queries DB)
shard = directory.get_shard(123456)  # → 'shard_1' (10ms: DB query)

# Lookup (second time: cache hit)
shard = directory.get_shard(123456)  # → 'shard_1' (1ms: Redis cache)

# Update mapping (e.g., move celebrity user to dedicated shard)
directory.update_mapping(celebrity_user_id, 'shard_dedicated')
```

---

### 2. Flexible Rebalancing (Custom Logic)

**Benefit: Move Individual Users/Ranges Without Rehashing**

**Scenario 1: Move Celebrity User to Dedicated Shard**

```python
# Problem: Celebrity user (10M followers) causes hot shard
celebrity_user_id = 12345678
current_shard = directory.get_shard(celebrity_user_id)  # → 'shard_2' (overloaded)

# Solution: Move to dedicated high-capacity shard
def move_celebrity_user(user_id, dedicated_shard):
    # Step 1: Copy data from old shard to new shard
    old_shard = directory.get_shard(user_id)
    user_data = old_shard.query("SELECT * FROM users WHERE user_id = %s", user_id)
    dedicated_shard.execute("INSERT INTO users VALUES (%s, ...)", user_data)
    
    # Step 2: Update directory (atomic)
    directory.update_mapping(user_id, 'shard_dedicated')
    
    # Step 3: Delete from old shard
    old_shard.execute("DELETE FROM users WHERE user_id = %s", user_id)
    
    print(f"Moved user {user_id} from {old_shard} to {dedicated_shard}")

# Execute migration
move_celebrity_user(celebrity_user_id, 'shard_dedicated')

# Result:
# - Celebrity user now on dedicated shard (no noisy neighbors)
# - Old shard load reduced (500 QPS → 100 QPS)
# - No impact on other users (directory updated, queries route correctly)

# Downtime: 0 seconds (online migration with double-read during transition)
```

**Scenario 2: Rebalance Tenant Across Shards**

```python
# Multi-tenant SaaS: Tenant 'company_A' grows too large (hot tenant)
# Original: All company_A data on shard_1 (10 GB, overloaded)
# Solution: Split company_A across multiple shards

def rebalance_tenant(tenant_id, new_shards):
    # Step 1: Get all user_ids for tenant
    user_ids = get_tenant_users(tenant_id)  # 10M users
    
    # Step 2: Distribute users across new shards (round-robin)
    for i, user_id in enumerate(user_ids):
        new_shard = new_shards[i % len(new_shards)]
        
        # Copy user data to new shard
        old_shard = directory.get_shard(user_id)
        user_data = old_shard.query("SELECT * FROM users WHERE user_id = %s", user_id)
        new_shard.execute("INSERT INTO users VALUES (%s, ...)", user_data)
        
        # Update directory
        directory.update_mapping(user_id, new_shard.name)
        
        # Delete from old shard
        old_shard.execute("DELETE FROM users WHERE user_id = %s", user_id)

# Execute rebalancing
rebalance_tenant('company_A', [shard_4, shard_5, shard_6])

# Result:
# - Tenant 'company_A' now split across 3 shards
# - Shard 1 load reduced (1000 QPS → 300 QPS)
# - New shards handle remaining load (350 QPS each)
```

**Scenario 3: Geographic Data Migration**

```python
# GDPR compliance: Move EU users to EU-region shard
def migrate_to_region(user_ids, target_shard_region):
    for user_id in user_ids:
        # Determine target shard in region
        target_shard = f"shard_eu_{hash(user_id) % 10}"
        
        # Migrate
        old_shard = directory.get_shard(user_id)
        migrate_user(user_id, old_shard, target_shard)
        
        # Update directory
        directory.update_mapping(user_id, target_shard)

# Migrate all EU users
eu_user_ids = get_users_by_region('EU')  # 50M users
migrate_to_region(eu_user_ids, 'EU')

# Result:
# - EU users now on EU shards (data residency compliance)
# - No downtime (online migration)
```

---

### 3. Directory as Single Point of Failure (SPOF)

**Problem**: Directory unavailable → All queries fail

**Solution 1: Replicated Directory (High Availability)**

```python
# PostgreSQL directory with streaming replication
class HAShardDirectory:
    def __init__(self):
        self.master = connect('directory-master.db.com')
        self.replicas = [
            connect('directory-replica1.db.com'),
            connect('directory-replica2.db.com'),
            connect('directory-replica3.db.com')
        ]
    
    def get_shard(self, user_id):
        # Read from replica (distribute load)
        replica = random.choice(self.replicas)
        try:
            return replica.query("SELECT shard_id FROM ... WHERE user_id = %s", user_id)
        except Exception as e:
            # Fallback to master if replica fails
            return self.master.query("SELECT shard_id FROM ... WHERE user_id = %s", user_id)
    
    def update_mapping(self, user_id, shard_id):
        # Write to master (replicates to replicas automatically)
        self.master.execute("UPDATE shard_directory SET shard_id = %s ...", shard_id)

# High availability:
# - Reads from replicas (3 replicas handle 10K reads/sec)
# - Writes to master (100 writes/sec, low volume)
# - Replica failure → Fallback to master
# - Master failure → Promote replica (Patroni auto-failover)
```

**Solution 2: Cached Directory (Reduce Dependency)**

```python
# Cache directory in application memory + Redis
class CachedShardDirectory:
    def __init__(self):
        self.redis = redis.StrictRedis()
        self.local_cache = {}  # In-memory LRU cache
        self.cache_ttl = 3600  # 1 hour
    
    def get_shard(self, user_id):
        # Layer 1: Local memory cache (fastest, 0.1ms)
        if user_id in self.local_cache:
            return self.local_cache[user_id]
        
        # Layer 2: Redis cache (fast, 1ms)
        redis_key = f"shard:{user_id}"
        cached = self.redis.get(redis_key)
        if cached:
            shard_id = cached.decode('utf-8')
            self.local_cache[user_id] = shard_id
            return shard_id
        
        # Layer 3: Database (slow, 10ms, rare)
        try:
            shard_id = self.db_lookup(user_id)
            # Cache in Redis + local memory
            self.redis.setex(redis_key, self.cache_ttl, shard_id)
            self.local_cache[user_id] = shard_id
            return shard_id
        except Exception as e:
            # Layer 4: Fallback to hash-based routing (directory unavailable)
            print(f"Directory unavailable, fallback to hash: {e}")
            return f"shard_{hash(user_id) % 10}"  # Emergency fallback

# Cache hit rates:
# - Local memory: 80% (0.1ms latency)
# - Redis: 15% (1ms latency)
# - Database: 5% (10ms latency)
# - Average latency: 0.8×0.1ms + 0.15×1ms + 0.05×10ms = 0.73ms

# Directory failure impact:
# - With cache: 95% requests served from cache (0-1ms latency)
# - Without cache: 100% requests fail (directory down)
```

**Solution 3: Gossip Protocol (Decentralized Directory)**

```python
# Each application node maintains local directory copy
# Updates propagated via gossip protocol

class GossipShardDirectory:
    def __init__(self, node_id, cluster_nodes):
        self.node_id = node_id
        self.cluster_nodes = cluster_nodes
        self.local_directory = {}  # Local copy
        
        # Start gossip thread
        self.start_gossip_protocol()
    
    def get_shard(self, user_id):
        # Read from local directory (no network call)
        return self.local_directory.get(user_id, 'shard_default')
    
    def update_mapping(self, user_id, shard_id):
        # Update local directory
        self.local_directory[user_id] = shard_id
        
        # Gossip update to cluster (eventually consistent)
        self.gossip_update(user_id, shard_id)
    
    def gossip_update(self, user_id, shard_id):
        # Send update to 3 random nodes
        targets = random.sample(self.cluster_nodes, 3)
        for node in targets:
            node.receive_gossip({'user_id': user_id, 'shard_id': shard_id})
    
    def receive_gossip(self, update):
        # Merge update into local directory
        user_id = update['user_id']
        shard_id = update['shard_id']
        self.local_directory[user_id] = shard_id
        
        # Propagate to more nodes (exponential spread)
        self.gossip_update(user_id, shard_id)

# Benefits:
# - No SPOF (each node self-sufficient)
# - Fast reads (local memory, 0.1ms)
# - Eventually consistent (updates propagate in seconds)

# Drawbacks:
# - Eventual consistency (stale reads possible)
# - Memory overhead (each node stores full directory)
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Directory Size Estimation

**Example: 100M Users**

```
Assumptions:
- 100M users
- Directory entry: user_id (8 bytes) + shard_id (50 bytes) = 58 bytes
- Index overhead: 2x (B-tree index)

Directory size:
- Data: 100M × 58 bytes = 5.8 GB
- Index: 5.8 GB × 2 = 11.6 GB
- Total: 17.4 GB (fits in memory of single server)

Directory server capacity:
- RAM: 32 GB (stores entire directory + indexes)
- Read QPS: 100K reads/sec (in-memory lookups)
- Write QPS: 1K writes/sec (low volume, directory updates rare)

Cache hit rate (Redis):
- 80% cache hit (Redis)
- 20% cache miss (query directory)
- Effective directory QPS: 100K × 0.2 = 20K QPS (well within capacity)

Directory unavailability impact:
- Without cache: 100% requests fail (directory is SPOF)
- With cache (80% hit rate): 80% requests succeed (cached), 20% fail
- Mitigation: Cache TTL 1 hour → Directory can be down 1 hour with 80% availability
```

---

## 4. Data & Storage Design

### Multi-Tenant Directory (Tenant Isolation)

**Use Case**: SaaS application (Salesforce, Slack, Shopify)

```sql
-- Directory maps tenant_id + resource_id → shard_id
CREATE TABLE tenant_shard_directory (
    tenant_id VARCHAR(100),
    resource_type VARCHAR(50),  -- 'users', 'orders', 'invoices'
    resource_id_range_min BIGINT,
    resource_id_range_max BIGINT,
    shard_id VARCHAR(50),
    PRIMARY KEY (tenant_id, resource_type, resource_id_range_min)
);

-- Example: Tenant 'company_A' with 10M users
INSERT INTO tenant_shard_directory VALUES
('company_A', 'users', 1, 5000000, 'shard_tenant_A_1'),
('company_A', 'users', 5000001, 10000000, 'shard_tenant_A_2'),
('company_A', 'orders', 1, 9999999, 'shard_tenant_A_orders');

-- Tenant 'company_B' (small tenant, shares shard with others)
INSERT INTO tenant_shard_directory VALUES
('company_B', 'users', 1, 9999999, 'shard_shared_small_tenants');

-- Query: Get shard for company_A user 123456
SELECT shard_id FROM tenant_shard_directory
WHERE tenant_id = 'company_A'
  AND resource_type = 'users'
  AND resource_id_range_min <= 123456
  AND resource_id_range_max >= 123456;
-- Returns: 'shard_tenant_A_1'
```

**Python Implementation**:

```python
class TenantShardDirectory:
    def get_shard(self, tenant_id, resource_type, resource_id):
        query = """
            SELECT shard_id FROM tenant_shard_directory
            WHERE tenant_id = %s
              AND resource_type = %s
              AND resource_id_range_min <= %s
              AND resource_id_range_max >= %s
        """
        result = self.db.query(query, (tenant_id, resource_type, resource_id, resource_id))
        return result[0]['shard_id']
    
    def assign_tenant_shards(self, tenant_id, num_shards):
        """Assign dedicated shards to large tenant"""
        for i in range(num_shards):
            shard_id = f"shard_tenant_{tenant_id}_{i}"
            self.db.execute("""
                INSERT INTO tenant_shard_directory
                VALUES (%s, 'users', %s, %s, %s)
            """, (tenant_id, i * 1000000, (i+1) * 1000000 - 1, shard_id))

# Usage:
directory = TenantShardDirectory()

# Large tenant: Dedicated shards
directory.assign_tenant_shards('company_A', num_shards=5)

# Small tenants: Shared shard
directory.db.execute("""
    INSERT INTO tenant_shard_directory
    VALUES (%s, 'users', 1, 9999999, 'shard_shared')
""", 'company_B')

# Query routing
shard = directory.get_shard('company_A', 'users', 123456)
# → 'shard_tenant_A_0'

shard = directory.get_shard('company_B', 'users', 789)
# → 'shard_shared'
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Handling Directory Failures

**Strategy 1: Fallback to Default Sharding**

```python
class FaultTolerantDirectory:
    def get_shard(self, user_id):
        try:
            # Primary: Directory lookup
            return self.directory.get_shard(user_id)
        except DirectoryUnavailable:
            # Fallback: Hash-based routing
            return f"shard_{hash(user_id) % 10}"
        except Exception as e:
            # Last resort: Default shard
            logging.error(f"All routing failed: {e}")
            return "shard_default"

# Graceful degradation:
# - Directory available → Custom routing (optimal)
# - Directory down → Hash-based routing (acceptable)
# - All systems down → Default shard (degraded but functional)
```

**Strategy 2: Pre-Load Directory on App Startup**

```python
class PreloadedDirectory:
    def __init__(self):
        # Load entire directory into memory on startup
        self.directory_cache = self.load_full_directory()
        
        # Refresh every 5 minutes
        self.start_refresh_thread()
    
    def load_full_directory(self):
        """Load all mappings from DB (17 GB for 100M users)"""
        query = "SELECT user_id, shard_id FROM shard_directory"
        results = self.db.query(query)
        return {row['user_id']: row['shard_id'] for row in results}
    
    def get_shard(self, user_id):
        # No network call, pure memory lookup (0.1ms)
        return self.directory_cache.get(user_id, 'shard_default')
    
    def refresh_directory(self):
        """Background thread refreshes directory every 5min"""
        while True:
            time.sleep(300)  # 5 minutes
            try:
                new_directory = self.load_full_directory()
                self.directory_cache = new_directory
                logging.info("Directory refreshed successfully")
            except Exception as e:
                logging.error(f"Directory refresh failed: {e}")
                # Keep using stale cache

# Benefits:
# - Zero dependency on directory after startup (no SPOF)
# - Fast lookups (0.1ms memory access)
# - Eventual consistency (5min stale at most)

# Drawbacks:
# - Memory overhead (17 GB per app server)
# - Stale data (5min lag for directory updates)
```

---

## 6. Security, APIs & Governance

### Audit Trail for Shard Movements

**Compliance**: Track all data movements (GDPR, HIPAA)

```sql
-- Audit log for directory changes
CREATE TABLE shard_audit_log (
    log_id SERIAL PRIMARY KEY,
    user_id BIGINT,
    old_shard_id VARCHAR(50),
    new_shard_id VARCHAR(50),
    reason VARCHAR(255),  -- 'rebalancing', 'gdpr_migration', 'tenant_growth'
    changed_by VARCHAR(100),  -- Admin user or system
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Log every directory update
CREATE TRIGGER shard_directory_audit
AFTER UPDATE ON shard_directory
FOR EACH ROW
EXECUTE FUNCTION log_shard_change();

-- Audit function
CREATE FUNCTION log_shard_change() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO shard_audit_log (user_id, old_shard_id, new_shard_id, reason)
    VALUES (NEW.user_id, OLD.shard_id, NEW.shard_id, 'Updated via directory');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Query audit trail
SELECT * FROM shard_audit_log
WHERE user_id = 123456
ORDER BY changed_at DESC;

-- Example output:
-- | user_id | old_shard   | new_shard        | reason          | changed_at          |
-- |---------|-------------|------------------|-----------------|---------------------|
-- | 123456  | shard_2     | shard_dedicated  | hot_user        | 2024-03-15 10:30:00 |
-- | 123456  | shard_1     | shard_2          | rebalancing     | 2023-12-01 14:20:00 |
```

---

## 7. Real-World Examples & Case Studies

### Salesforce: Multi-Tenant Directory Sharding

**Problem**: 150K+ tenants (customers), varies from 10 users to 100K+ users per tenant

**Solution**: Directory-based sharding with tenant isolation

```python
# Salesforce shard directory (simplified)
def get_tenant_shard(tenant_id):
    # Lookup tenant's dedicated shard(s)
    query = "SELECT shard_id FROM tenant_shard_directory WHERE tenant_id = %s"
    result = directory_db.query(query, tenant_id)
    
    if not result:
        # Small tenant, assign to shared shard
        return assign_shared_shard(tenant_id)
    
    return result[0]['shard_id']

def assign_shared_shard(tenant_id):
    # Find shared shard with capacity
    query = """
        SELECT shard_id FROM shard_capacity
        WHERE tenant_count < 1000 AND storage_gb < 500
        ORDER BY tenant_count ASC
        LIMIT 1
    """
    shard = directory_db.query(query)[0]['shard_id']
    
    # Assign tenant to shard
    directory_db.execute("""
        INSERT INTO tenant_shard_directory (tenant_id, shard_id)
        VALUES (%s, %s)
    """, (tenant_id, shard))
    
    return shard

# Example:
tenant_big = 'walmart'       # 100K users → Dedicated shards (shard_walmart_1, shard_walmart_2)
tenant_small = 'acme_corp'   # 50 users → Shared shard (shard_shared_42)
```

**Benefits**:
- Large tenants isolated (dedicated shards, no noisy neighbors)
- Small tenants cost-effective (shared shards, 1000 tenants per shard)
- Flexible rebalancing (move tenant to bigger/dedicated shard as they grow)

**Rebalancing**: Tenant grows from 1K to 50K users → Move to dedicated shard
```python
def promote_tenant_to_dedicated(tenant_id):
    # Create new dedicated shard
    new_shard = f"shard_tenant_{tenant_id}"
    provision_shard(new_shard)
    
    # Migrate tenant data
    old_shard = get_tenant_shard(tenant_id)
    migrate_tenant_data(tenant_id, old_shard, new_shard)
    
    # Update directory
    directory_db.execute("""
        UPDATE tenant_shard_directory
        SET shard_id = %s
        WHERE tenant_id = %s
    """, (new_shard, tenant_id))

# Downtime: 0 seconds (online migration with double-write)
```

---

### Google Cloud Spanner: Placement Policies (Directory-Like)

**Problem**: Multi-region deployment, need to place data near users (low latency)

**Solution**: Placement policies (directory maps table → region)

```sql
-- Create placement policy (directory-like)
CREATE PLACEMENT POLICY eu_policy
  INSTANCE_PLACEMENT = 'europe-west1';

CREATE PLACEMENT POLICY us_policy
  INSTANCE_PLACEMENT = 'us-central1';

-- Apply policy to table (directory maps table → placement)
CREATE TABLE eu_users (
  user_id INT64,
  name STRING(100)
) PLACEMENT_POLICY eu_policy;

CREATE TABLE us_users (
  user_id INT64,
  name STRING(100)
) PLACEMENT_POLICY us_policy;

-- Query routing:
-- EU user → Query eu_users table → Placed in europe-west1 (low latency)
-- US user → Query us_users table → Placed in us-central1 (low latency)
```

**Directory** (maps user → region → table):
```python
def get_user_table(user_id):
    # Lookup user's region from directory
    region = directory.get_region(user_id)
    
    if region == 'EU':
        return 'eu_users'  # Placed in Europe
    elif region == 'US':
        return 'us_users'  # Placed in US
    else:
        return 'global_users'  # Multi-region

# Query:
table = get_user_table(123456)  # → 'eu_users'
query = f"SELECT * FROM {table} WHERE user_id = 123456"
```

---

### LinkedIn: Directory for Feed Sharding

**Problem**: User feeds (timeline) require complex sharding (followers graph)

**Solution**: Directory maps user_id → feed_shard

```python
# Directory: user_id → feed_shard
# feed_shard contains all followers' posts for fast feed assembly

class FeedShardDirectory:
    def assign_feed_shard(self, user_id):
        # Determine shard based on followers count (load balancing)
        followers_count = get_followers_count(user_id)
        
        if followers_count > 1_000_000:
            # Celebrity: Dedicated shard (fan-out expensive)
            shard = f"feed_shard_celebrity_{user_id}"
        elif followers_count > 100_000:
            # High-follower user: Dedicated shared shard
            shard = "feed_shard_high_follow"
        else:
            # Normal user: Hash-based shared shard
            shard = f"feed_shard_{hash(user_id) % 100}"
        
        # Update directory
        directory_db.execute("""
            INSERT INTO feed_shard_directory (user_id, shard_id, followers_count)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET shard_id = EXCLUDED.shard_id
        """, (user_id, shard, followers_count))
        
        return shard

# Benefits:
# - Custom sharding logic (celebrities isolated)
# - Dynamic rebalancing (user gains followers → move to dedicated shard)
# - Directory tracks shard mapping (flexible routing)
```

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "What is directory-based sharding and when would you use it?"

**Structured Answer**:

**"Directory-based sharding uses a lookup table (directory) to map keys to shards, providing flexible routing and easy rebalancing. Use it for multi-tenant SaaS or when you need custom sharding logic (e.g., move celebrity users to dedicated shards)."**

**Definition**:
```python
# Directory lookup (extra hop)
shard_id = directory.lookup(user_id)  # Query directory table/service
connection = connect_to_shard(shard_id)

# Compare to hash-based (direct)
shard_id = hash(user_id) % num_shards  # No lookup needed
```

**When to Use**:
```
1. Multi-tenant SaaS (Salesforce, Slack, Shopify)
   - Large tenants: Dedicated shards (isolation)
   - Small tenants: Shared shards (cost-effective)
   - Directory maps tenant_id → shard_id

2. Need flexible rebalancing (move specific users/tenants)
   - Celebrity user: Move to dedicated shard (without rehashing all users)
   - Tenant grows: Upgrade to dedicated shard
   - Directory: Update single entry (no data movement needed yet)

3. Custom sharding logic (beyond hash/range)
   - Geographic: EU users → EU shards (GDPR)
   - Customer tier: Premium → High-performance shards
   - Load-based: Hot users → Dedicated shards
```

**Benefits**:
- Flexible rebalancing (update directory, move specific keys)
- Custom logic (not limited to hash/range formulas)
- Easy migrations (update directory, no code changes)

**Drawbacks**:
- Extra lookup (10ms directory query + 10ms shard query = 20ms total)
  - Mitigation: Cache directory (Redis, 1ms lookup)
- Single point of failure (directory unavailable → all queries fail)
  - Mitigation: Replicated directory + fallback to hash-based
- Complexity (additional system to maintain)

**Real-world example: Salesforce uses directory-based sharding for 150K+ tenants. Large enterprises (Walmart, Amazon) get dedicated shards (100K users, isolated performance). Small businesses (10-100 users) share shards (1000 tenants per shard, cost-effective). Directory enables flexible rebalancing: Tenant grows from 1K to 50K users → Update directory entry (tenant_id → new_dedicated_shard), migrate data in background (2 hours), zero downtime. Without directory: Would need to rehash all 150K tenants (expensive)."**

---

### Follow-Up 1: "How do you handle the directory being a single point of failure?"

**Answer**:

**"Mitigate directory SPOF with 3 layers: (1) Replicated directory (master + replicas for HA), (2) Multi-tier caching (Redis + local memory, 95% cache hit rate reduces dependency), (3) Fallback routing (if directory fails, fall back to hash-based routing for degraded but functional service)."**

**Layer 1: Replicated Directory (HA)**
```python
class HADirectory:
    def __init__(self):
        self.master = connect('directory-master')
        self.replicas = [
            connect('directory-replica1'),
            connect('directory-replica2'),
            connect('directory-replica3')
        ]
    
    def get_shard(self, user_id):
        # Read from replica (load distribution)
        replica = random.choice(self.replicas)
        try:
            return replica.query("SELECT shard_id FROM ... WHERE user_id = ?", user_id)
        except Exception:
            # Fallback to master if replica fails
            return self.master.query("...")
    
    def update(self, user_id, shard_id):
        # Write to master (auto-replicates to replicas)
        self.master.execute("UPDATE shard_directory SET shard_id = ? ...", shard_id)

# HA setup:
# - Master: Handles writes (100 writes/sec, low volume)
# - 3 Replicas: Handle reads (10K reads/sec per replica = 30K total)
# - Auto-failover: Patroni promotes replica if master fails (30sec downtime)
```

**Layer 2: Multi-Tier Caching** (reduce directory dependency)
```python
class CachedDirectory:
    def get_shard(self, user_id):
        # Tier 1: Local memory (0.1ms, 80% hit rate)
        if user_id in self.local_cache:
            return self.local_cache[user_id]
        
        # Tier 2: Redis (1ms, 15% hit rate)
        cached = self.redis.get(f"shard:{user_id}")
        if cached:
            shard = cached.decode()
            self.local_cache[user_id] = shard
            return shard
        
        # Tier 3: Directory DB (10ms, 5% hit rate)
        try:
            shard = self.directory.get_shard(user_id)
            # Cache result
            self.redis.setex(f"shard:{user_id}", 3600, shard)
            self.local_cache[user_id] = shard
            return shard
        except DirectoryUnavailable:
            # Tier 4: Fallback (see below)
            return self.fallback_routing(user_id)

# Cache effectiveness:
# - 95% requests served from cache (0-1ms latency)
# - Only 5% hit directory (reduced dependency)
# - Directory can be down 1 hour (cache TTL) with minimal impact
```

**Layer 3: Fallback Routing** (graceful degradation)
```python
class FaultTolerantDirectory:
    def fallback_routing(self, user_id):
        # Fallback 1: Use stale cache (even if expired)
        stale = self.redis.get(f"shard:{user_id}")
        if stale:
            logging.warn("Using stale cache (directory unavailable)")
            return stale.decode()
        
        # Fallback 2: Hash-based routing
        logging.error("Directory unavailable, using hash-based fallback")
        return f"shard_{hash(user_id) % 10}"
        
        # Fallback 3: Default shard (last resort)
        # return "shard_default"

# Graceful degradation:
# 1. Directory available → Custom routing (optimal)
# 2. Directory slow → Serve from cache (1-10ms acceptable)
# 3. Directory down → Use stale cache (5-95% freshness)
# 4. Cache empty → Hash-based fallback (acceptable, not optimal)
# 5. Last resort → Default shard (degraded but functional)
```

**Real-world: LinkedIn uses replicated directory (3 replicas) + Redis cache (95% hit rate). Directory downtime: 2 times/year for 5-10 minutes. Impact: 5% of requests query directory (fail during outage), 95% served from cache (unaffected). Fallback: Hash-based routing (acceptable performance for 5min). Result: 99.95% availability even with directory failures."**

---

### Follow-Up 2: "What's the latency overhead of directory-based sharding compared to hash-based?"

**Answer**:

**"Without caching: Directory-based is 2x slower (20ms: 10ms directory lookup + 10ms shard query vs 10ms hash-based direct query). With caching: Directory overhead is negligible (1ms Redis cache lookup vs 0ms hash calculation = 1ms overhead, but within acceptable 10ms SLA)."**

**Latency Breakdown**:

**Hash-Based (No Directory)**:
```
1. Hash calculation: 0.001ms (in-memory, fast)
2. Connect to shard: 1ms (connection pool)
3. Query shard: 10ms (database query)
Total: 11ms
```

**Directory-Based (No Cache)**:
```
1. Query directory: 10ms (network + DB query)
2. Connect to shard: 1ms (connection pool)
3. Query shard: 10ms (database query)
Total: 21ms (2x slower)
```

**Directory-Based (With Redis Cache, 95% hit rate)**:
```
Cache hit (95% of requests):
1. Query Redis: 1ms (cache lookup)
2. Connect to shard: 1ms (connection pool)
3. Query shard: 10ms (database query)
Total: 12ms (only 1ms overhead)

Cache miss (5% of requests):
1. Query directory: 10ms (database)
2. Cache result: 1ms (write to Redis)
3. Connect to shard: 1ms
4. Query shard: 10ms
Total: 22ms (2x slower, but only 5% of traffic)

Weighted average:
0.95 × 12ms + 0.05 × 22ms = 12.5ms
vs hash-based: 11ms
Overhead: 1.5ms (13.6% slower, acceptable)
```

**Directory-Based (With Local Memory Cache, 80% hit rate)**:
```
Layer 1: Local memory (80%):
1. Memory lookup: 0.1ms (fastest)
2. Connect to shard: 1ms
3. Query shard: 10ms
Total: 11.1ms (negligible overhead)

Layer 2: Redis (15%):
1. Redis lookup: 1ms
2. Connect + query: 11ms
Total: 12ms

Layer 3: Directory DB (5%):
1. Directory query: 10ms
2. Connect + query: 11ms
Total: 21ms

Weighted average:
0.80 × 11.1ms + 0.15 × 12ms + 0.05 × 21ms = 11.9ms
vs hash-based: 11ms
Overhead: 0.9ms (8% slower, negligible)
```

**Optimization: Preload Directory**
```python
# Load entire directory into memory on startup (0 network calls)
class PreloadedDirectory:
    def __init__(self):
        # Load 100M mappings (17 GB) into memory
        self.directory = self.load_full_directory()  # Takes 30 seconds at startup
    
    def get_shard(self, user_id):
        # Pure memory lookup (no network)
        return self.directory.get(user_id, 'shard_default')  # 0.1ms

# Latency:
1. Memory lookup: 0.1ms (same as hash calculation)
2. Connect + query: 11ms
Total: 11.1ms (equivalent to hash-based)

# Drawback: 17 GB memory per app server (acceptable for 64 GB servers)
```

**Real-world: Salesforce uses 3-tier cache (local memory 80%, Redis 15%, DB 5%). Average directory lookup: 0.8×0.1ms + 0.15×1ms + 0.05×10ms = 0.73ms overhead. Total query latency: 11.73ms vs hash-based 11ms = 6.6% overhead. Well within 50ms SLA. Trade-off accepted for flexibility benefits (custom routing, easy rebalancing)."**

---

### Follow-Up 3: "When would you choose directory-based over hash-based or range-based sharding?"

**Answer**:

**"Choose directory-based when you need flexibility (multi-tenant isolation, custom routing rules, easy rebalancing of specific keys) and can accept extra latency overhead (1-10ms directory lookup). Choose hash-based for even distribution with minimal latency. Choose range-based for time-series with fast range queries."**

**Directory-Based Sharding**:

**When to Use**:
```
1. Multi-tenant SaaS (different tenants need different shards)
   - Large tenant: Dedicated shard (isolation, performance)
   - Small tenants: Shared shard (cost-effective)
   - Directory: Flexible tenant → shard mapping

2. Need to move specific keys (not all keys)
   - Celebrity user: Move to dedicated shard (without affecting others)
   - Hot tenant: Upgrade to bigger shard
   - GDPR: Move EU users to EU region

3. Custom sharding logic (complex rules)
   - Geographic: User location → Closest region shard
   - Tier-based: Premium customers → High-performance shards
   - Load-based: Hot keys → Dedicated shards (dynamic)

4. Frequent rebalancing (tenants grow/shrink)
   - Startup tenant (10 users) → Enterprise (100K users)
   - Update directory: tenant_id → new_shard (easy)
   - vs hash-based: Must rehash all keys (expensive)
```

**Pros**:
- Maximum flexibility (any custom logic)
- Easy rebalancing (update directory entry, no rehashing)
- Tenant isolation (large tenants dedicated shards)

**Cons**:
- Extra latency (10ms directory lookup, mitigated with cache)
- SPOF (directory failure impacts all queries, need HA + cache)
- Complexity (additional system to maintain)

---

**Hash-Based Sharding**:

**When to Use**:
```
1. User data with even distribution
   - No hot users (or hot users acceptable on shared shard)
   - Point queries: WHERE user_id = ?

2. Minimal latency (no extra lookups)
   - Hash calculation: 0.001ms (in-memory)
   - Direct routing (no directory dependency)

3. Stable workload (infrequent rebalancing)
   - Resharding expensive (consistent hashing helps but still 20% data moves)
```

**Pros**: Even distribution, minimal latency, simple
**Cons**: Hard to rebalance, no custom logic, range queries slow

---

**Range-Based Sharding**:

**When to Use**:
```
1. Time-series data (logs, events, metrics)
   - Query: "Logs from February" → Single shard
   - Archival: Drop old shard (easy)

2. Sequential data (auto-increment IDs, Snowflake IDs)
   - Range queries: user_id 100K-200K → Single shard
```

**Pros**: Fast range queries, easy archival
**Cons**: Hot shard problem (newest data overloaded)

---

**Decision Matrix**:

| Aspect | Directory | Hash | Range |
|--------|-----------|------|-------|
| **Flexibility** | ✅ High | ❌ Low | ⚠️ Medium |
| **Latency** | ⚠️ +10ms | ✅ Minimal | ✅ Minimal |
| **Even distribution** | ⚠️ Custom | ✅ Automatic | ❌ Uneven |
| **Rebalancing** | ✅ Easy | ❌ Hard | ⚠️ Medium |
| **Range queries** | ⚠️ Custom | ❌ Slow | ✅ Fast |
| **Use case** | Multi-tenant SaaS | User data | Logs, time-series |
| **Complexity** | ❌ High | ✅ Low | ✅ Low |

**Hybrid Approach**: Combine multiple strategies
```python
# Example: Directory + Hash
# Directory maps tenant → shard_group (custom logic)
# Within shard_group, hash user_id (even distribution)

def get_shard(tenant_id, user_id):
    # Step 1: Directory lookup (tenant → shard_group)
    shard_group = directory.lookup(tenant_id)  # 'tenant_A_group', 'shared_small'
    
    # Step 2: Hash within group (even distribution)
    shard_id = hash(user_id) % shard_group.num_shards
    
    return f"{shard_group}_{shard_id}"

# Benefits:
# - Tenant isolation (directory assigns tenant to group)
# - Even distribution within group (hash ensures balance)
# - Flexible + predictable
```

**Real-world: Salesforce uses directory-based (tenant isolation, flexible rebalancing). Instagram uses hash-based (1B users, even distribution, point queries). Twitter uses range-based (tweets by time, fast range queries). Choose based on workload: Multi-tenant → Directory, User data → Hash, Time-series → Range."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Directory-Based Sharding Architecture

```
┌────────────────────────────────────────────────────────────┐
│        DIRECTORY-BASED SHARDING ARCHITECTURE               │
└────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Application    │
│  (Directory      │
│   Lookup)        │
└────────┬─────────┘
         │
    Query directory: user_id → shard_id
         │
         ↓
┌────────────────────────────────────────┐
│  DIRECTORY (Lookup Table)              │
│  ┌────────────┬───────────────────┐   │
│  │ user_id    │ shard_id          │   │
│  ├────────────┼───────────────────┤   │
│  │ 1-100K     │ shard_0           │   │
│  │ 100K-200K  │ shard_1           │   │
│  │ 200K-300K  │ shard_2           │   │
│  │ celebrity  │ shard_dedicated   │   │
│  └────────────┴───────────────────┘   │
│  ┌────────────────────────────────┐   │
│  │  Cache: Redis (95% hit rate)   │   │
│  │  Memory: Local (80% hit rate)  │   │
│  └────────────────────────────────┘   │
└────────────────────────────────────────┘
         │
    Route to shard_id
         │
    ┌────┴────────┬────────┬────────────────┐
    ↓             ↓        ↓                ↓
┌─────────┐  ┌─────────┐ ┌─────────┐  ┌──────────────┐
│ Shard 0 │  │ Shard 1 │ │ Shard 2 │  │ Dedicated    │
│ 2M      │  │ 2.5M    │ │ 3M      │  │ 100K celeb   │
│ users   │  │ users   │ │ users   │  │ users        │
└─────────┘  └─────────┘ └─────────┘  └──────────────┘


FLEXIBLE REBALANCING:
═══════════════════════════════════════════════════════════

Before (Celebrity on shared shard):
┌─────────────────────────────────┐
│ Shard 2 (Overloaded)            │
│ - Normal users: 3M (100 QPS)    │
│ - Celebrity user: 1 (500 QPS) 🔥│
│ Total: 600 QPS (HOT)            │
└─────────────────────────────────┘

Step 1: Update Directory
┌────────────────────────────────────┐
│  DIRECTORY                         │
│  user_id=celebrity → shard_2  ❌   │
│  UPDATE:                           │
│  user_id=celebrity → shard_dedicated ✅
└────────────────────────────────────┘

Step 2: Migrate Data
┌─────────────────┐      ┌──────────────────┐
│ Shard 2         │ ───→ │ Shard Dedicated  │
│ Copy celebrity  │      │ Receive celebrity│
│ user data       │      │ user data        │
└─────────────────┘      └──────────────────┘

After (Celebrity isolated):
┌─────────────────┐  ┌──────────────────┐
│ Shard 2         │  │ Shard Dedicated  │
│ - Normal: 3M    │  │ - Celebrity: 1   │
│ - 100 QPS ✅    │  │ - 500 QPS ✅     │
└─────────────────┘  └──────────────────┘

Downtime: 0 seconds (directory updated atomically)


MULTI-TENANT DIRECTORY:
═══════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────┐
│  TENANT SHARD DIRECTORY                             │
├──────────────┬──────────────────┬──────────────────┤
│ tenant_id    │ resource_type    │ shard_id         │
├──────────────┼──────────────────┼──────────────────┤
│ company_A    │ users            │ shard_A_1        │
│ company_A    │ users            │ shard_A_2        │
│ company_A    │ orders           │ shard_A_orders   │
│ company_B    │ users            │ shard_shared     │
│ company_C    │ users            │ shard_shared     │
└──────────────┴──────────────────┴──────────────────┘
          ↓
Large Tenant (company_A): Dedicated Shards
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Shard A-1    │  │ Shard A-2    │  │ Shard A-Ord  │
│ Users 1-5M   │  │ Users 5-10M  │  │ Orders       │
│ 5M users     │  │ 5M users     │  │ 50M orders   │
└──────────────┘  └──────────────┘  └──────────────┘

Small Tenants (company_B, company_C): Shared Shard
┌──────────────────────────────────────────┐
│ Shard Shared                             │
│ - company_B: 100 users                   │
│ - company_C: 50 users                    │
│ - company_D, E, F, ... (1000 tenants)    │
└──────────────────────────────────────────┘


CACHING LAYERS (Reduce SPOF Risk):
═══════════════════════════════════════════════════════════

Query Flow:
┌──────────────────┐
│  Application     │
└────────┬─────────┘
         │ Lookup user_id=123456
         ↓
┌─────────────────────────────────────────┐
│ Layer 1: Local Memory Cache (80% hit)   │
│ Latency: 0.1ms                          │
│ [user_id=123456 → shard_1] ✅ FOUND     │
└─────────────────────────────────────────┘
         │ Cache miss (20%)
         ↓
┌─────────────────────────────────────────┐
│ Layer 2: Redis Cache (15% hit)          │
│ Latency: 1ms                            │
│ GET shard:123456 → "shard_1" ✅ FOUND   │
└─────────────────────────────────────────┘
         │ Cache miss (5%)
         ↓
┌─────────────────────────────────────────┐
│ Layer 3: Directory DB (5% hit)          │
│ Latency: 10ms                           │
│ SELECT shard_id FROM ... → "shard_1" ✅ │
└─────────────────────────────────────────┘
         │ DB unavailable (0.1%)
         ↓
┌─────────────────────────────────────────┐
│ Layer 4: Fallback Hash (0.1% hit)       │
│ Latency: 0.001ms                        │
│ hash(123456) % 10 → shard_6 (fallback)  │
└─────────────────────────────────────────┘

Weighted Average Latency:
0.80 × 0.1ms + 0.15 × 1ms + 0.05 × 10ms + 0.001 × 0.001ms
= 0.08 + 0.15 + 0.5 + 0.000001
= 0.73ms (negligible overhead)


FAILOVER SCENARIOS:
═══════════════════════════════════════════════════════════

Normal Operation:
┌──────────────┐      ┌─────────────┐
│ Application  │ ───→ │ Directory   │ ───→ Shard
│              │      │ (Available) │
└──────────────┘      └─────────────┘
Latency: 10ms directory + 10ms shard = 20ms

With Cache (95% hit):
┌──────────────┐      ┌─────────────┐
│ Application  │ ───→ │ Redis Cache │ ───→ Shard
│              │  ↗   │ (95% hit)   │
│              │ ─    └─────────────┘
│              │  ↘   ┌─────────────┐
│              │ ───→ │ Directory   │
└──────────────┘      │ (5% miss)   │
                      └─────────────┘
Latency: 1ms cache + 10ms shard = 11ms (most requests)

Directory Failure (with cache):
┌──────────────┐      ┌─────────────┐
│ Application  │ ───→ │ Redis Cache │ ───→ Shard
│              │  ✅  │ (95% hit)   │
│              │      └─────────────┘
│              │      ┌─────────────┐
│              │ ───X │ Directory   │
│              │  ❌  │ (DOWN)      │
│              │      └─────────────┘
│              │  ↘   ┌─────────────┐
│              │ ───→ │ Hash Fallbk │ ───→ Shard (Wrong)
└──────────────┘  5%  └─────────────┘
Impact: 95% requests succeed (cache), 5% use fallback (may route to wrong shard)

Complete Failure (no cache):
┌──────────────┐      ┌─────────────┐
│ Application  │ ───X │ Redis       │
│              │  ❌  │ (DOWN)      │
│              │      └─────────────┘
│              │      ┌─────────────┐
│              │ ───X │ Directory   │
│              │  ❌  │ (DOWN)      │
│              │      └─────────────┘
│              │  ↘   ┌─────────────┐
│              │ ───→ │ Hash Fallbk │ ───→ Shard (Wrong)
└──────────────┘ 100% └─────────────┘
Impact: 100% use fallback (degraded, wrong routing)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Directory-Based Sharding Matters

**Use Cases**:
- Multi-tenant SaaS (Salesforce, Slack, Shopify): 80% of B2B SaaS
- Need flexible rebalancing (move specific tenants/users)
- Custom sharding logic (geographic, tier-based, load-based)

**Without Directory-Based Sharding**:
- Hash-based: Can't move specific users (must rehash all, expensive)
- Range-based: Hot shard problem (newest data overloaded)
- Limited flexibility (stuck with hash/range formula)

**With Directory-Based Sharding**:
- Flexible rebalancing (move celebrity user to dedicated shard, 0 downtime)
- Custom logic (large tenants dedicated, small tenants shared)
- Easy migrations (update directory, no code changes)

### Key Strategies

**1. Multi-Tier Caching** (reduce SPOF risk):
```python
# Layer 1: Local memory (80% hit, 0.1ms)
# Layer 2: Redis (15% hit, 1ms)
# Layer 3: Directory DB (5% hit, 10ms)
# Layer 4: Fallback hash (0.1% hit, degraded)
Average: 0.73ms overhead (acceptable)
```

**2. Replicated Directory** (HA):
```python
# 1 master + 3 replicas (read load distributed)
# Auto-failover: Patroni promotes replica (30sec downtime)
# 99.95% availability
```

**3. Audit Trail** (compliance):
```sql
CREATE TABLE shard_audit_log (
    user_id, old_shard, new_shard, reason, changed_at
);
-- Track all data movements (GDPR, HIPAA compliance)
```

**4. Flexible Rebalancing**:
```python
# Move celebrity user to dedicated shard
directory.update(celebrity_user_id, 'shard_dedicated')
# Migrate data in background (0 downtime)
# Update directory (atomic, instant routing change)
```

### Production Checklist

- [ ] **Implement multi-tier caching**: Local memory + Redis (95% hit rate target)
- [ ] **Replicate directory**: 1 master + 3 replicas (HA, load distribution)
- [ ] **Monitor cache hit rate**: Alert if < 90% (directory becoming bottleneck)
- [ ] **Fallback routing**: Hash-based emergency fallback (graceful degradation)
- [ ] **Audit trail**: Log all directory changes (compliance)
- [ ] **Test directory failure**: Verify fallback works (chaos engineering)
- [ ] **Document shard mapping**: Keep directory schema up-to-date
- [ ] **Automate rebalancing**: Scripts for moving tenants/users
- [ ] **Benchmark latency**: Measure directory overhead (target < 10ms P95)
- [ ] **Plan growth**: Directory size estimate (17 GB for 100M users fits in memory)

### Bottom Line

**Directory-based sharding provides maximum flexibility for multi-tenant SaaS and custom routing needs. For FAANG interviews: Explain directory-based (lookup table maps keys to shards), when to use (multi-tenant isolation, need flexible rebalancing), SPOF mitigation (replicated directory + multi-tier caching 95% hit rate + fallback hash routing), and latency overhead (10ms without cache, 1ms with cache = acceptable). Real-world example from Salesforce: 150K+ tenants, directory maps tenant_id → shard_id. Large enterprises (Walmart 100K users) get dedicated shards (isolation, performance). Small businesses (10-100 users) share shards (1000 tenants per shard, cost-effective). Flexible rebalancing: Tenant grows → Update directory entry (instant), migrate data background (2 hours), zero downtime. Cache: 95% hit rate (Redis + local memory), directory overhead 1ms. Fallback: Hash-based routing if directory fails (degraded but functional). Trade-off: Accept 1ms overhead and SPOF risk for flexibility benefits (custom routing, easy tenant isolation, simple migrations).**

