# 87. Read-After-Write Consistency

## 📌 Overview

**Read-After-Write Consistency** (also called **Read-Your-Writes Consistency**) guarantees that **a user always sees their own updates immediately**, even though other users may see stale data temporarily.

This is a middle ground between strong consistency (expensive) and eventual consistency (confusing for users).

---

## 🎯 The Problem

```
Time →
User Alice writes: profile.name = "Alice Updated"
                   ↓
Alice reads immediately: profile.name = "Alice Old" ❌

User sees their own stale data!
Confusing and broken UX!
```

### Real-World Scenario
```python
# User updates profile
POST /api/profile
{
  "name": "Alice Smith",
  "bio": "Software Engineer"
}
# Response: 200 OK

# User immediately navigates to profile page
GET /api/profile
# Returns: {"name": "Alice", "bio": "Student"} ❌

# User sees old data! Thinks update failed!
```

---

## 🔒 Read-After-Write Guarantee

```
User writes data → System guarantees user sees their write
Other users → May see stale data (eventual consistency)

┌─────────────────────────────────────────┐
│ Alice writes: profile = "Updated"       │
│ Alice reads:  profile = "Updated" ✓     │
│ Bob reads:    profile = "Old" (OK)      │
│ (Bob eventually sees "Updated")         │
└─────────────────────────────────────────┘
```

---

## 🛠️ Implementation Strategies

### 1️⃣ **Read from Master (Simple)**

Always read from the master/primary for the user who wrote the data.

```python
class ReadYourWrites:
    def __init__(self, master, replicas):
        self.master = master
        self.replicas = replicas
        self.user_last_write = {}  # user_id → timestamp
    
    def write(self, user_id, key, value):
        # Write to master
        self.master.write(key, value)
        
        # Track write timestamp
        self.user_last_write[user_id] = time.time()
        
        return {"status": "success"}
    
    def read(self, user_id, key):
        # Did user write recently? (within 5 seconds)
        last_write = self.user_last_write.get(user_id, 0)
        
        if time.time() - last_write < 5:
            # Read from master (strong consistency)
            return self.master.read(key)
        else:
            # Read from replica (eventual consistency)
            return random.choice(self.replicas).read(key)

# Usage
cache = ReadYourWrites(master_db, [replica1, replica2, replica3])

# Alice writes
cache.write(user_id='alice', key='profile', value='Updated')

# Alice reads immediately (within 5 sec)
cache.read(user_id='alice', key='profile')  # Reads from master ✓

# Bob reads (different user)
cache.read(user_id='bob', key='profile')  # Reads from replica (faster)
```

**Pros**: Simple, guarantees consistency for writes
**Cons**: Master becomes bottleneck for recent writes

---

### 2️⃣ **Session-Based Routing (Sticky Sessions)**

Route user to the same replica for the duration of their session.

```python
class StickySessionConsistency:
    def __init__(self, replicas):
        self.replicas = replicas
        self.session_to_replica = {}  # session_id → replica
    
    def get_replica_for_session(self, session_id):
        if session_id not in self.session_to_replica:
            # Assign replica using consistent hashing
            replica_index = hash(session_id) % len(self.replicas)
            self.session_to_replica[session_id] = self.replicas[replica_index]
        
        return self.session_to_replica[session_id]
    
    def write(self, session_id, key, value):
        replica = self.get_replica_for_session(session_id)
        replica.write(key, value)
    
    def read(self, session_id, key):
        replica = self.get_replica_for_session(session_id)
        return replica.read(key)

# Usage
sticky = StickySessionConsistency([replica1, replica2, replica3])

# All operations for session 'abc' go to same replica
sticky.write('session_abc', 'profile', 'Updated')
sticky.read('session_abc', 'profile')  # Reads from same replica ✓

# Different session may go to different replica
sticky.read('session_xyz', 'profile')  # May see stale data (OK)
```

**Pros**: Scalable, distributes load
**Cons**: Session loss on replica failure

**Load Balancer Configuration**:
```nginx
# Nginx sticky sessions
upstream backend {
    ip_hash;  # Route same IP to same backend
    server replica1.example.com;
    server replica2.example.com;
    server replica3.example.com;
}
```

---

### 3️⃣ **Version-Based Tracking**

Track version of user's last write, only read from replicas with >= that version.

```python
class VersionedConsistency:
    def __init__(self, replicas):
        self.replicas = replicas
        self.user_version = {}  # user_id → last_seen_version
        self.global_version = 0
    
    def write(self, user_id, key, value):
        # Increment global version
        self.global_version += 1
        version = self.global_version
        
        # Write to all replicas with version
        for replica in self.replicas:
            replica.write_async(key, value, version)
        
        # Track user's last write version
        self.user_version[user_id] = version
        
        return {"status": "success", "version": version}
    
    def read(self, user_id, key):
        required_version = self.user_version.get(user_id, 0)
        
        # Find replica with version >= required
        for replica in self.replicas:
            value, replica_version = replica.read_with_version(key)
            
            if replica_version >= required_version:
                return value
        
        # Fallback: Read from master if no replica up-to-date
        return self.replicas[0].read(key)

# Usage
versioned = VersionedConsistency([replica1, replica2, replica3])

# Alice writes (version 100)
versioned.write('alice', 'profile', 'Updated')

# Alice reads (requires version >= 100)
versioned.read('alice', 'profile')  # Finds replica with version 100+ ✓
```

**Pros**: Precise version tracking
**Cons**: Requires version metadata in all reads

---

### 4️⃣ **Client-Side Caching**

Cache user's own writes on the client, serve from cache until replicated.

```python
class ClientSideCache:
    def __init__(self, server):
        self.server = server
        self.local_cache = {}  # In-memory client cache
        self.pending_writes = {}  # user_id → {key: value}
    
    def write(self, user_id, key, value):
        # Write to server
        self.server.write(key, value)
        
        # Cache locally
        self.local_cache[key] = value
        self.pending_writes.setdefault(user_id, {})[key] = value
        
        # Clear pending after 5 seconds
        threading.Timer(5.0, lambda: self._clear_pending(user_id, key)).start()
    
    def read(self, user_id, key):
        # Check if user wrote recently
        if user_id in self.pending_writes and key in self.pending_writes[user_id]:
            # Serve from local cache
            return self.local_cache[key]
        
        # Otherwise fetch from server
        return self.server.read(key)
    
    def _clear_pending(self, user_id, key):
        if user_id in self.pending_writes:
            self.pending_writes[user_id].pop(key, None)

# Usage (in mobile app or web frontend)
cache = ClientSideCache(api_client)

# User updates profile
cache.write('alice', 'profile', 'Updated')

# User immediately views profile
cache.read('alice', 'profile')  # Served from local cache ✓
```

**Pros**: Zero network latency for recent writes
**Cons**: Only works for same client instance

---

## 🏗️ Real-World Examples

### **Facebook - Read-Your-Writes for Profile Updates**

```python
# Facebook ensures users see their own posts immediately
class FacebookFeed:
    def post_status(self, user_id, status_text):
        # Write to database
        post_id = db.write('posts', {
            'user_id': user_id,
            'text': status_text,
            'timestamp': time.time()
        })
        
        # Add to user's local timeline cache
        cache.lpush(f'timeline:{user_id}', post_id)
        
        # Asynchronously fanout to followers
        fanout_async(user_id, post_id)
        
        return post_id
    
    def get_timeline(self, user_id):
        # Check local cache first (recent posts)
        cached_posts = cache.lrange(f'timeline:{user_id}', 0, 10)
        
        if cached_posts:
            return cached_posts
        
        # Otherwise fetch from database
        return db.query('posts', {'user_id': user_id})

# User posts → Immediately sees in own timeline
# Followers see post after fanout (eventual consistency)
```

---

### **Twitter - Session-Based Consistency**

```python
# Twitter routes user session to same datacenter
class TwitterConsistency:
    def __init__(self, datacenters):
        self.datacenters = datacenters
    
    def get_datacenter_for_user(self, user_id):
        # Consistent hashing to assign datacenter
        return self.datacenters[hash(user_id) % len(self.datacenters)]
    
    def tweet(self, user_id, tweet_text):
        dc = self.get_datacenter_for_user(user_id)
        tweet_id = dc.write_tweet(user_id, tweet_text)
        return tweet_id
    
    def get_timeline(self, user_id):
        dc = self.get_datacenter_for_user(user_id)
        return dc.read_timeline(user_id)

# User always routed to same datacenter
# Sees own tweets immediately
```

---

### **Amazon S3 - Read-After-Write for New Objects**

```
S3 Consistency Model:
✓ Read-after-write for PUT of NEW objects
  (Create new object → Immediately visible)

✗ Eventual consistency for PUT of EXISTING objects
  (Update existing object → May see old version briefly)

✗ Eventual consistency for DELETE
  (Delete object → May still be readable briefly)
```

```python
# S3 guarantees immediate visibility for NEW objects
s3.put_object(Bucket='my-bucket', Key='new-file.txt', Body='data')
# Immediately visible:
obj = s3.get_object(Bucket='my-bucket', Key='new-file.txt')  # ✓

# But UPDATES are eventually consistent
s3.put_object(Bucket='my-bucket', Key='existing-file.txt', Body='updated')
# May still see old version briefly:
obj = s3.get_object(Bucket='my-bucket', Key='existing-file.txt')  # May be old
```

---

### **DynamoDB - Read-Your-Writes with ConsistentRead**

```python
import boto3

table = boto3.resource('dynamodb').Table('Users')

# Write profile update
table.put_item(Item={
    'user_id': 'alice',
    'name': 'Alice Smith',
    'bio': 'Engineer'
})

# Option 1: Eventual consistency (may see old data)
response = table.get_item(Key={'user_id': 'alice'})

# Option 2: Strong consistency (always sees latest)
response = table.get_item(
    Key={'user_id': 'alice'},
    ConsistentRead=True  # ← Force read-your-writes
)
```

---

## 📊 Comparison of Approaches

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Read from Master** | Simple, guaranteed | Master bottleneck | Low-traffic apps |
| **Sticky Sessions** | Scalable, distributed | Session loss on failure | Web apps with sessions |
| **Version Tracking** | Precise, flexible | Metadata overhead | Multi-datacenter |
| **Client Caching** | Zero latency | Only same client | Mobile/web apps |

---

## ✅ Best Practices

1. **Apply selectively** - Only for user-facing data (profile, posts), not for shared data (likes, views)
2. **Combine with eventual consistency** - Other users can see eventual consistency
3. **Set timeout** - After N seconds, fall back to replica reads (5-10 sec typical)
4. **Monitor replication lag** - Ensure replicas catch up quickly (<1 second)
5. **Provide force-refresh** - Let users manually refresh to see latest

---

## 🎓 Interview Tips

**Q: "How would you implement read-your-writes consistency?"**

A: "4 approaches:
1. **Read from master** - Simple but master bottleneck
2. **Sticky sessions** - Route user to same replica
3. **Version tracking** - Only read replicas with version >= user's last write
4. **Client caching** - Cache user's writes locally

Choice depends on:
- **Scale**: Small app → read from master; Large app → sticky sessions or versions
- **Infrastructure**: Single DC → sticky sessions; Multi-DC → version tracking
- **Latency**: Need <10ms → client caching"

**Q: "What's the difference between read-your-writes and strong consistency?"**

A: "Read-your-writes: **Only the user** who wrote sees latest data. Other users may see stale.
Strong consistency: **All users** see latest data immediately.

Read-your-writes is cheaper (don't need global coordination) while still providing good UX."

---

## 🔗 Related Topics
- **85. Data Consistency Models** - Full spectrum
- **86. Strong vs Eventual Consistency** - Trade-offs
- **88. Replication Lag** - Why consistency is hard
- **83. Cache Consistency** - Similar challenges

---

## 📚 Summary

**Read-After-Write Consistency** = User always sees their own updates

**Implementation**:
- Read from master (for recent writes)
- Sticky sessions (route to same replica)
- Version tracking (read replicas with version >= last write)
- Client caching (cache own writes locally)

**Use When**: User-facing updates (profile, posts, settings), not shared data (likes, views)

**Best Practice**: Combine with eventual consistency for other users = scalability + good UX! 🎯
