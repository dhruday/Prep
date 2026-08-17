# 110. Redundancy

## 📌 Overview

**Redundancy** means having backup components that can take over when primary components fail. It's the primary technique for eliminating Single Points of Failure (SPOFs).

**Key principle**: Build systems assuming every component will fail.

---

## 🎯 Types of Redundancy

### **1. Active-Passive (Hot Standby)**
```
Normal Operation:
Primary (Active) ──────→ Serving traffic ✓
Backup (Passive) ──────→ Idle (standby)

Primary Fails:
Primary (Down) ────────→ ❌
Backup (Now Active) ───→ Takes over ✓

Characteristics:
- Backup idle until needed
- Failover time: Seconds to minutes
- Cost: ~2x (backup resources unused)
```

**Example: Database Master-Slave**
```python
class ActivePassiveDatabase:
    def __init__(self):
        self.primary = Database('primary-db.example.com')
        self.backup = Database('backup-db.example.com')
        self.using_backup = False
    
    def query(self, sql):
        try:
            if not self.using_backup:
                return self.primary.execute(sql)
            else:
                return self.backup.execute(sql)
        except ConnectionError:
            # Primary failed → failover to backup
            if not self.using_backup:
                print("Primary DB down, failing over to backup")
                self.using_backup = True
                return self.backup.execute(sql)
            else:
                raise  # Backup also failed

# Usage
db = ActivePassiveDatabase()
result = db.query("SELECT * FROM users")
# If primary fails, automatically uses backup
```

---

### **2. Active-Active (Load Balanced)**
```
Normal Operation:
Server 1 (Active) ──────→ Serving 50% traffic ✓
Server 2 (Active) ──────→ Serving 50% traffic ✓

Server 1 Fails:
Server 1 (Down) ────────→ ❌
Server 2 (Active) ──────→ Serving 100% traffic ✓

Characteristics:
- All components active simultaneously
- Failover time: Instant (no downtime)
- Cost: ~2x but better utilization
```

**Example: Load Balanced Web Servers**
```python
class ActiveActiveLoadBalancer:
    def __init__(self):
        self.servers = [
            Server('server1.example.com'),
            Server('server2.example.com'),
            Server('server3.example.com')
        ]
        self.current_index = 0
    
    def route_request(self, request):
        """Round-robin load balancing"""
        attempts = 0
        while attempts < len(self.servers):
            server = self.servers[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.servers)
            
            try:
                return server.handle(request)
            except ServerDownError:
                # Server down → try next one
                attempts += 1
                continue
        
        raise AllServersDownError()

# Usage
lb = ActiveActiveLoadBalancer()
response = lb.route_request(request)
# If server1 fails, automatically routes to server2 or server3
```

---

### **3. N+1 Redundancy**
```
Capacity needed: N servers
Deploy: N+1 servers (one extra)

Example: Need 3 servers for traffic
Deploy: 4 servers

Normal: Each server at 75% capacity (3/4 load)
1 Fails: Remaining 3 servers at 100% capacity

Characteristics:
- One extra component for failover
- Cost-efficient (not full 2x)
- Can handle single failure
```

**Example: Message Queue Cluster**
```python
class MessageQueueCluster:
    def __init__(self, required_nodes=3):
        self.required_nodes = required_nodes
        # Deploy N+1
        self.nodes = [
            QueueNode(f'node-{i}') 
            for i in range(required_nodes + 1)
        ]
    
    def send_message(self, message):
        healthy_nodes = [n for n in self.nodes if n.is_healthy()]
        
        if len(healthy_nodes) < self.required_nodes:
            raise InsufficientNodesError()
        
        # Use quorum (majority)
        quorum = (len(healthy_nodes) // 2) + 1
        acks = 0
        
        for node in healthy_nodes[:quorum]:
            if node.write(message):
                acks += 1
        
        return acks >= quorum

# Usage
cluster = MessageQueueCluster(required_nodes=3)
cluster.send_message({'order_id': 123})
# Can tolerate 1 node failure (3+1=4, lose 1 = 3 remain)
```

---

### **4. N+M Redundancy**
```
Capacity needed: N servers
Deploy: N+M servers (M extra)

Example: Need 10 servers for traffic
Deploy: 12 servers (N+2)

Normal: Each server at 83% capacity (10/12 load)
2 Fail: Remaining 10 servers at 100% capacity

Characteristics:
- M extra components for failover
- Can handle M failures
- Cost: (N+M)/N (e.g., 12/10 = 1.2x)
```

---

## 🎯 Redundancy Strategies by Component

### **1. Database Redundancy**

```
Single Database → Master-Slave (Active-Passive)
┌──────────┐         ┌──────────┐
│  Master  │────────>│  Slave 1 │
│ (Writes) │Replicate│  (Reads) │
└──────────┘         └──────────┘
                            │
                     ┌──────────┐
                     │  Slave 2 │
                     │  (Reads) │
                     └──────────┘

If Master fails:
1. Promote Slave 1 to Master
2. Redirect writes to new Master
3. Slave 2 replicates from new Master
```

**Implementation**:
```python
# PostgreSQL streaming replication
# Master: postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 64

# Slave: recovery.conf
standby_mode = on
primary_conninfo = 'host=master-db port=5432'
```

---

### **2. Load Balancer Redundancy**

```
DNS Round-Robin (Active-Active)
                DNS
                 ↓
        ┌────────┴────────┐
        ▼                 ▼
    LB1 (Active)      LB2 (Active)
        ↓                 ↓
    Backend Servers

If LB1 fails:
- DNS routes to LB2
- No downtime (instant failover)
```

**Implementation**:
```python
# HAProxy configuration (Keepalived for failover)
# /etc/keepalived/keepalived.conf

vrrp_instance VI_1 {
    state MASTER           # Primary LB
    interface eth0
    virtual_router_id 51
    priority 100           # Higher priority = master
    virtual_ipaddress {
        192.168.1.100      # Shared VIP
    }
}

# Backup LB (priority 90)
vrrp_instance VI_1 {
    state BACKUP
    priority 90            # Lower priority
    virtual_ipaddress {
        192.168.1.100      # Same VIP
    }
}
```

---

### **3. Storage Redundancy**

```
RAID (Redundant Array of Independent Disks)

RAID 1 (Mirroring):
┌──────────┐   ┌──────────┐
│  Disk 1  │   │  Disk 2  │
│  (Copy)  │═══│  (Copy)  │
└──────────┘   └──────────┘

Data written to both disks
If Disk 1 fails → Disk 2 continues

RAID 5 (Parity):
┌────┬────┬────┬────┐
│ D1 │ D2 │ D3 │ P  │ (Parity of D1, D2, D3)
└────┴────┴────┴────┘

Can reconstruct any 1 disk from others
```

**Cloud Storage Redundancy**:
```python
# AWS S3 redundancy
# Standard: 99.999999999% durability (11 nines)
# Replicates data across 3+ AZs

s3 = boto3.client('s3')
s3.put_object(
    Bucket='my-bucket',
    Key='important-file.txt',
    Body=data,
    StorageClass='STANDARD'  # Auto-redundant
)

# Cross-region replication (additional redundancy)
s3.put_bucket_replication(
    Bucket='my-bucket',
    ReplicationConfiguration={
        'Rules': [{
            'Destination': {'Bucket': 'arn:aws:s3:::backup-bucket'},
            'Status': 'Enabled'
        }]
    }
)
```

---

### **4. Network Redundancy**

```
Multi-Path Networking

                    Internet
                       ↓
        ┌──────────────┴──────────────┐
        ▼                             ▼
    ISP 1 (Primary)              ISP 2 (Backup)
        ↓                             ↓
        └──────────────┬──────────────┘
                       ▼
                  Data Center

If ISP 1 fails:
- Traffic routes through ISP 2
- BGP (Border Gateway Protocol) handles failover
```

---

## 🎯 Geographic Redundancy

### **Multi-Region Deployment**

```
Region: us-east-1              Region: us-west-2
├─ LB                          ├─ LB
├─ App Servers (3)             ├─ App Servers (3)
├─ Database (Master)           ├─ Database (Replica)
└─ Cache                       └─ Cache

Global Load Balancer (Route 53)
├─ 50% traffic → us-east-1
└─ 50% traffic → us-west-2

If us-east-1 fails:
- 100% traffic → us-west-2
- Promote us-west-2 DB to master
- System continues ✓
```

**Implementation**:
```python
# AWS Route 53 health checks + failover
import boto3

route53 = boto3.client('route53')

# Create health check for primary region
health_check = route53.create_health_check(
    Type='HTTPS',
    ResourcePath='/health',
    FullyQualifiedDomainName='us-east-1.example.com',
    RequestInterval=30,
    FailureThreshold=3
)

# Failover routing
route53.change_resource_record_sets(
    HostedZoneId='Z1234567890ABC',
    ChangeBatch={
        'Changes': [{
            'Action': 'CREATE',
            'ResourceRecordSet': {
                'Name': 'api.example.com',
                'Type': 'A',
                'SetIdentifier': 'Primary',
                'Failover': 'PRIMARY',
                'HealthCheckId': health_check['HealthCheck']['Id'],
                'AliasTarget': {
                    'HostedZoneId': 'Z123',
                    'DNSName': 'us-east-1.example.com'
                }
            }
        }, {
            'Action': 'CREATE',
            'ResourceRecordSet': {
                'Name': 'api.example.com',
                'Type': 'A',
                'SetIdentifier': 'Secondary',
                'Failover': 'SECONDARY',
                'AliasTarget': {
                    'HostedZoneId': 'Z456',
                    'DNSName': 'us-west-2.example.com'
                }
            }
        }]
    }
)
```

---

## ✅ Redundancy Trade-offs

| Type | Failover Time | Utilization | Cost | Complexity |
|------|---------------|-------------|------|------------|
| **Active-Passive** | Seconds-Minutes | 50% (backup idle) | 2x | Low |
| **Active-Active** | Instant | 100% | 2x | Medium |
| **N+1** | Instant | 75-90% | 1.25x | Medium |
| **Multi-Region** | DNS TTL (minutes) | 100% | 2-3x | High |

---

## 🎯 Real-World Examples

### **1. Netflix Multi-Region**
```
Active-Active across 3 AWS regions:
- us-east-1 (33% traffic)
- us-west-2 (33% traffic)
- eu-west-1 (33% traffic)

If entire region fails:
- Traffic redistributes to 2 remaining regions
- Each region scales to handle 50% traffic
- No downtime for users
```

### **2. Google Search Redundancy**
```
Redundancy at every layer:
- Frontend: 100+ datacenters globally
- Index: Replicated across multiple servers
- Storage: 3+ copies of every document
- Network: Multiple fiber routes

Single server failure = invisible to users
```

### **3. AWS S3 Durability**
```
99.999999999% durability (11 nines)

How achieved:
- 3+ copies across 3+ AZs
- Continuous integrity checks
- Automatic repair if corruption detected

Probability of losing object: 0.000000001% per year
```

---

## 🎓 Interview Tips

**Q: "What is redundancy and why is it important?"**

A: "Redundancy means having backup components to handle failures. Essential for high availability.

Types:
- **Active-Passive**: Backup idle until needed (database master-slave)
- **Active-Active**: All components serving traffic (load balanced web servers)
- **N+1**: One extra component for failover (4 servers for 3 needed)

Example: E-commerce database. Without redundancy: DB fails = entire site down. With master-slave: Master fails → promote slave → site continues."

**Q: "What's the difference between active-passive and active-active?"**

A: "Key differences:

**Active-Passive**:
- Primary active, backup idle (standby)
- Failover time: seconds to minutes (need to promote backup)
- Utilization: 50% (backup unused)
- Cost: 2x infrastructure, 50% wasted
- Example: Database master-slave

**Active-Active**:
- All components serving traffic (load balanced)
- Failover time: instant (no promotion needed)
- Utilization: 100% (all components used)
- Cost: 2x infrastructure, fully utilized
- Example: Load balanced web servers

Choose active-active for stateless services (web), active-passive for stateful (database)."

**Q: "How do you decide how much redundancy is needed?"**

A: "Based on:

1. **Business Impact**:
   - Blog: Single server OK (low impact)
   - E-commerce: N+1 minimum (revenue loss)
   - Banking: Multi-region (regulatory + trust)

2. **SLA Requirements**:
   - 99% uptime: Active-passive sufficient
   - 99.9% uptime: Active-active + N+1
   - 99.99% uptime: Multi-region required

3. **Cost**:
   - N+1: 1.25x cost (good balance)
   - Active-Active: 2x cost
   - Multi-Region: 2-3x cost

Start with N+1, increase redundancy based on business growth and requirements."

---

## 🔗 Related Topics
- **109. Single Point of Failure** - Problem redundancy solves
- **70. Replication** - Database redundancy
- **117. Disaster Recovery** - Geographic redundancy
- **14. Availability** - Redundancy increases availability

---

## 📚 Summary

**Redundancy**: Backup components for failover

**Types**: Active-Passive (standby), Active-Active (load balanced), N+1 (one extra), Multi-Region (geographic)

**Where**: Database, load balancer, storage, network, regions

**Trade-off**: Cost (2x infrastructure) vs availability (99% → 99.99%)

**Best Practice**: Start N+1, scale to multi-region as business grows 🚀
