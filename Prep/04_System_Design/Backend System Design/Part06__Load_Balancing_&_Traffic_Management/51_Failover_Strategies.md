# 51. Failover Strategies

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Failover?

**Failover** is the process of automatically switching to a redundant or standby system when the primary system fails, ensuring continuous service availability.

**Without Failover**:
```
Primary Server crashes → Service down → Users see errors → Revenue loss
Manual intervention required (wake up engineer, restart server)
Downtime: 10 minutes to 2 hours
```

**With Failover**:
```
Primary Server crashes → Automated failover to Secondary Server → Service continues
Users don't notice (< 5 seconds interruption)
Downtime: 5-30 seconds
```

### Key Concepts

**Components**:
- **Primary (Active)**: Handles all traffic normally
- **Secondary (Standby)**: Backup system, ready to take over
- **Heartbeat**: Periodic signal from Primary to prove it's alive
- **Takeover**: Secondary becomes Primary when failure detected

**Types of Failover**:

| Type | Cost | Downtime | Complexity | Use Case |
|------|------|----------|------------|----------|
| **Cold Standby** | $ | 10-60 min | Simple | Non-critical systems |
| **Warm Standby** | $$ | 1-5 min | Medium | Business applications |
| **Hot Standby** | $$$ | 1-30 sec | Complex | Critical systems |
| **Active-Active** | $$$$ | 0 sec | Very Complex | Mission-critical |

### Real-World Analogy

Imagine a pilot and co-pilot:

- **Cold Standby**: Co-pilot at home. Pilot crashes → Call co-pilot → Wait 30 minutes for them to arrive → Resume flight
- **Warm Standby**: Co-pilot in cabin but asleep. Pilot crashes → Wake co-pilot → 5 minutes to take controls
- **Hot Standby**: Co-pilot sitting next to pilot, monitoring instruments. Pilot crashes → Co-pilot takes over immediately (< 5 seconds)
- **Active-Active**: Both pilots flying together. Pilot crashes → Other pilot already in control (0 seconds)

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Cold Standby

**Setup**: Secondary server powered off or not provisioned. Data replicated periodically (daily/weekly backups).

**Architecture**:
```
Primary Server (Active)
   ↓ (Daily Backup)
Backup Storage (S3, tapes)
   ↑ (Manual Restore)
Secondary Server (Offline, provision when needed)
```

**Failover Process**:
```
1. Primary fails (detected manually or via monitoring)
2. Provision new server (5-15 minutes)
3. Restore latest backup to new server (10-60 minutes)
4. Update DNS to point to new server (5 minutes)
5. Service restored (Total: 20-80 minutes)
```

**Implementation**:
```python
def cold_standby_failover():
    """Manual failover process for cold standby"""
    
    # Step 1: Detect failure (manual or monitoring alert)
    if not is_primary_responding():
        alert_team("Primary server down!")
        
        # Step 2: Provision secondary server
        secondary = provision_ec2_instance(instance_type='t3.large')
        wait_for_instance_ready(secondary, timeout=300)  # 5 minutes
        
        # Step 3: Restore latest backup
        latest_backup = get_latest_backup_from_s3()
        restore_backup(secondary, latest_backup)  # 10-60 minutes
        
        # Step 4: Update DNS
        update_route53_record(
            name='api.example.com',
            old_ip=primary.ip,
            new_ip=secondary.ip
        )
        
        # Wait for DNS propagation (5-60 minutes)
        print("Failover complete. Monitor DNS propagation.")
```

**Characteristics**:
- **RTO (Recovery Time Objective)**: 20-80 minutes
- **RPO (Recovery Point Objective)**: 24 hours (last backup)
- **Cost**: $ (only pay for storage, not running server)
- **Data Loss**: Yes (all data since last backup lost)

**When to Use**:
- Non-critical systems (internal tools, dev environments)
- Budget-constrained projects
- Infrequently accessed applications

---

### 2. Warm Standby

**Setup**: Secondary server running but idle. Data replicated regularly (hourly/real-time). Secondary not receiving traffic.

**Architecture**:
```
Primary Server (Active, handling traffic)
   ↓ (Continuous Replication)
Secondary Server (Running, idle, synchronized)
   ↑ (Heartbeat monitoring)
Load Balancer (routes to Primary)
```

**Failover Process**:
```
1. Heartbeat monitor detects Primary failure (10-30 seconds)
2. Secondary promoted to Primary (immediate)
3. Load balancer updated to route to Secondary (10 seconds)
4. Service restored (Total: 20-40 seconds)
```

**Database Replication Setup**:
```sql
-- PostgreSQL streaming replication (Primary → Secondary)

-- On Primary:
-- postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64MB

-- On Secondary:
-- recovery.conf
standby_mode = 'on'
primary_conninfo = 'host=primary.example.com port=5432 user=replicator'
trigger_file = '/tmp/postgresql.trigger.5432'

-- Failover: Create trigger file to promote Secondary
touch /tmp/postgresql.trigger.5432
```

**Application-Level Warm Standby**:
```python
import time
import requests

class WarmStandbyController:
    def __init__(self, primary_url, secondary_url):
        self.primary_url = primary_url
        self.secondary_url = secondary_url
        self.current_primary = primary_url
        self.heartbeat_interval = 10  # seconds
    
    def start_heartbeat_monitor(self):
        """Monitor primary server health"""
        consecutive_failures = 0
        
        while True:
            if self.check_primary_health():
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                print(f"Primary failure {consecutive_failures}/3")
                
                if consecutive_failures >= 3:
                    print("❌ Primary failed 3 times, initiating failover")
                    self.failover_to_secondary()
                    break
            
            time.sleep(self.heartbeat_interval)
    
    def check_primary_health(self):
        """Check if primary server is responsive"""
        try:
            response = requests.get(
                f"{self.primary_url}/health",
                timeout=5
            )
            return response.status_code == 200
        except:
            return False
    
    def failover_to_secondary(self):
        """Promote secondary to primary"""
        print("🔄 Failing over to secondary...")
        
        # Step 1: Promote secondary (if database)
        self.promote_secondary_database()
        
        # Step 2: Update load balancer
        self.update_load_balancer(self.secondary_url)
        
        # Step 3: Update DNS (optional, for external access)
        self.update_dns(self.secondary_url)
        
        self.current_primary = self.secondary_url
        print("✅ Failover complete")
    
    def promote_secondary_database(self):
        """Promote secondary database to primary"""
        # PostgreSQL: Create trigger file
        requests.post(f"{self.secondary_url}/promote")
    
    def update_load_balancer(self, new_primary_url):
        """Update load balancer to route to new primary"""
        # Implementation depends on LB (NGINX, HAProxy, AWS ALB)
        pass
    
    def update_dns(self, new_primary_url):
        """Update DNS A record to point to new primary"""
        # AWS Route 53 example
        import boto3
        route53 = boto3.client('route53')
        route53.change_resource_record_sets(
            HostedZoneId='Z123456',
            ChangeBatch={
                'Changes': [{
                    'Action': 'UPSERT',
                    'ResourceRecordSet': {
                        'Name': 'api.example.com',
                        'Type': 'A',
                        'TTL': 60,
                        'ResourceRecords': [{'Value': get_ip(new_primary_url)}]
                    }
                }]
            }
        )

# Usage
controller = WarmStandbyController(
    primary_url='http://10.0.1.10:8080',
    secondary_url='http://10.0.1.11:8080'
)
controller.start_heartbeat_monitor()
```

**Characteristics**:
- **RTO**: 20-40 seconds
- **RPO**: Minutes (replication lag)
- **Cost**: $$ (two running servers, one idle)
- **Data Loss**: Minimal (replication lag)

**When to Use**:
- Business-critical applications
- Can tolerate 30-second downtime
- Acceptable to pay for idle secondary server

---

### 3. Hot Standby (Active-Passive)

**Setup**: Secondary server running and fully synchronized. Health checks every few seconds. Automatic failover < 10 seconds.

**Architecture**:
```
                Virtual IP (VIP): 203.0.113.10
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
Primary Server (Active)         Secondary Server (Standby)
- Handles all traffic           - Monitors Primary (heartbeat)
- Sends heartbeat every 5s      - Ready to take over VIP
- Owns VIP (203.0.113.10)       - Has replicated data
        ↓                               ↑
Database (Streaming replication)────────┘
```

**VRRP (Virtual Router Redundancy Protocol)**:
```bash
# keepalived configuration (Primary)
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100              # Higher priority = Primary
    advert_int 1              # Send heartbeat every 1 second
    
    authentication {
        auth_type PASS
        auth_pass secret123
    }
    
    virtual_ipaddress {
        203.0.113.10/24       # Virtual IP (VIP)
    }
    
    # Health check script
    track_script {
        chk_health
    }
}

vrrp_script chk_health {
    script "/usr/local/bin/check_health.sh"
    interval 5                # Check every 5 seconds
    fall 3                    # 3 failures = unhealthy
    rise 2                    # 2 successes = healthy
}

# keepalived configuration (Secondary)
vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 90               # Lower priority = Standby
    advert_int 1
    
    authentication {
        auth_type PASS
        auth_pass secret123
    }
    
    virtual_ipaddress {
        203.0.113.10/24       # Same VIP
    }
}
```

**Failover Timeline**:
```
T=0s:  Primary sends heartbeat
T=1s:  Primary sends heartbeat
T=2s:  Primary sends heartbeat
T=3s:  Primary CRASHES (no heartbeat)
T=4s:  Secondary detects missing heartbeat (1st failure)
T=5s:  Secondary detects missing heartbeat (2nd failure)
T=6s:  Secondary detects missing heartbeat (3rd failure)
T=7s:  Secondary assumes VIP (203.0.113.10)
T=8s:  ARP announcement (notify network of new IP owner)
T=9s:  Traffic starts routing to Secondary
Total Downtime: 6 seconds (3 missed heartbeats × 2 seconds)
```

**Implementation**:
```python
import socket
import time
import subprocess

class HotStandbyFailover:
    def __init__(self, vip, primary_ip, secondary_ip, is_primary=True):
        self.vip = vip
        self.primary_ip = primary_ip
        self.secondary_ip = secondary_ip
        self.is_primary = is_primary
        self.owns_vip = is_primary
        self.heartbeat_interval = 1  # second
        self.missed_heartbeats = 0
        self.max_missed_heartbeats = 3
    
    def start(self):
        """Start failover controller"""
        if self.is_primary:
            self.start_primary()
        else:
            self.start_secondary()
    
    def start_primary(self):
        """Primary mode: Send heartbeats, handle traffic"""
        print(f"Starting as PRIMARY (VIP: {self.vip})")
        self.assign_vip()
        
        while True:
            self.send_heartbeat()
            time.sleep(self.heartbeat_interval)
    
    def start_secondary(self):
        """Secondary mode: Monitor heartbeats, takeover if needed"""
        print(f"Starting as SECONDARY (monitoring {self.primary_ip})")
        
        while True:
            if self.receive_heartbeat():
                self.missed_heartbeats = 0
            else:
                self.missed_heartbeats += 1
                print(f"⚠️ Missed heartbeat {self.missed_heartbeats}/{self.max_missed_heartbeats}")
                
                if self.missed_heartbeats >= self.max_missed_heartbeats:
                    print("❌ Primary failed, taking over!")
                    self.takeover_vip()
                    self.become_primary()
                    break
            
            time.sleep(self.heartbeat_interval)
    
    def send_heartbeat(self):
        """Send heartbeat to secondary"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            message = f"HEARTBEAT:{time.time()}"
            sock.sendto(message.encode(), (self.secondary_ip, 9999))
            sock.close()
        except Exception as e:
            print(f"Failed to send heartbeat: {e}")
    
    def receive_heartbeat(self):
        """Listen for heartbeat from primary (with timeout)"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.bind(('0.0.0.0', 9999))
            sock.settimeout(self.heartbeat_interval * 2)  # 2 seconds
            
            data, addr = sock.recvfrom(1024)
            sock.close()
            
            return data.decode().startswith("HEARTBEAT:")
        except socket.timeout:
            return False
        except Exception as e:
            print(f"Error receiving heartbeat: {e}")
            return False
    
    def assign_vip(self):
        """Assign Virtual IP to this server"""
        print(f"🔹 Assigning VIP {self.vip}")
        subprocess.run([
            'ip', 'addr', 'add', f'{self.vip}/24', 'dev', 'eth0'
        ])
        self.send_arp_announcement()
        self.owns_vip = True
    
    def takeover_vip(self):
        """Take over Virtual IP from failed primary"""
        print(f"🔄 Taking over VIP {self.vip}")
        self.assign_vip()
    
    def send_arp_announcement(self):
        """Announce new VIP owner to network (gratuitous ARP)"""
        subprocess.run([
            'arping', '-c', '3', '-I', 'eth0', '-s', self.vip, self.vip
        ])
    
    def become_primary(self):
        """Promote to primary after takeover"""
        self.is_primary = True
        print("✅ Now PRIMARY, starting to send heartbeats")
        self.start_primary()

# Usage
# On Primary server:
failover = HotStandbyFailover(
    vip='203.0.113.10',
    primary_ip='10.0.1.10',
    secondary_ip='10.0.1.11',
    is_primary=True
)
failover.start()

# On Secondary server:
failover = HotStandbyFailover(
    vip='203.0.113.10',
    primary_ip='10.0.1.10',
    secondary_ip='10.0.1.11',
    is_primary=False
)
failover.start()
```

**Characteristics**:
- **RTO**: 5-10 seconds (heartbeat detection + VIP takeover)
- **RPO**: Seconds (streaming replication)
- **Cost**: $$$ (two servers, both running, one idle)
- **Data Loss**: Minimal (seconds of replication lag)

**When to Use**:
- Mission-critical applications (payment, healthcare)
- Can't tolerate > 10 seconds downtime
- Budget allows for redundant infrastructure

---

### 4. Active-Active (Multi-Master)

**Setup**: Both servers active, handling traffic simultaneously. No failover needed (traffic automatically balanced).

**Architecture**:
```
                Load Balancer
                  ↓       ↓
            ┌─────┘       └─────┐
            ↓                   ↓
      Server1 (Active)    Server2 (Active)
      - Handles 50%       - Handles 50%
      - Database writes   - Database writes
            ↓                   ↓
        Multi-Master Database Replication
            ↓ ←─────────────────↑
```

**Database Setup** (PostgreSQL BDR - Bi-Directional Replication):
```sql
-- Node 1
CREATE EXTENSION bdr;

SELECT bdr.bdr_group_create(
    local_node_name := 'node1',
    node_external_dsn := 'host=10.0.1.10 dbname=mydb'
);

-- Node 2
SELECT bdr.bdr_group_join(
    local_node_name := 'node2',
    node_external_dsn := 'host=10.0.1.11 dbname=mydb',
    join_using_dsn := 'host=10.0.1.10 dbname=mydb'
);

-- Both nodes can handle reads AND writes
-- Changes replicated bidirectionally
```

**Conflict Resolution**:
```python
# When both nodes write to same record simultaneously
# Example: User updates profile on Node1, also updates on Node2

# Conflict strategies:
# 1. Last Write Wins (LWW)
def resolve_conflict_lww(version1, version2):
    return version1 if version1.timestamp > version2.timestamp else version2

# 2. Custom Business Logic
def resolve_conflict_custom(version1, version2):
    # E.g., Merge email change from v1, name change from v2
    return {
        "email": version1.email,
        "name": version2.name,
        "timestamp": max(version1.timestamp, version2.timestamp)
    }

# 3. Application-Level Conflict Prevention
def update_user(user_id, changes):
    # Use distributed lock (Redis) to prevent simultaneous writes
    lock_key = f"lock:user:{user_id}"
    if redis.set(lock_key, "locked", nx=True, ex=10):
        try:
            db.update(user_id, changes)
        finally:
            redis.delete(lock_key)
    else:
        raise ConflictError("User being updated elsewhere")
```

**Characteristics**:
- **RTO**: 0 seconds (no failover needed, traffic already distributed)
- **RPO**: 0 (no data loss, both nodes accepting writes)
- **Cost**: $$$$ (complex setup, conflict resolution logic)
- **Data Loss**: None (but potential conflicts)

**When to Use**:
- Global applications (users in multiple regions)
- Need zero downtime (can't tolerate any interruption)
- High write volume (single master bottleneck)

**When to Avoid**:
- Complex conflict resolution required
- Strong consistency needed (active-active is eventually consistent)
- Budget-constrained (expensive setup)

---

## 3. Capacity Planning & Estimation (When Applicable)

### Cost Comparison

**Scenario**: E-commerce platform, 99.9% uptime SLA

**Cold Standby**:
```
Primary: 1 × t3.large ($0.0832/hour × 730 hours) = $60.74/month
Backup storage: 100 GB × $0.023/GB = $2.30/month
Secondary: $0 (provisioned only during failure)
Total: $63.04/month
Downtime: 8.76 hours/year (99.9%)
```

**Warm Standby**:
```
Primary: 1 × t3.large = $60.74/month
Secondary: 1 × t3.large (idle) = $60.74/month
Replication bandwidth: 10 GB/day × $0.01/GB = $3/month
Total: $124.48/month (1.97x vs cold)
Downtime: 52.6 minutes/year (99.99%)
```

**Hot Standby**:
```
Primary: 1 × t3.large = $60.74/month
Secondary: 1 × t3.large (hot, monitoring) = $60.74/month
Network: VIP, heartbeats = $5/month
Total: $126.48/month (2x vs cold)
Downtime: 5.26 minutes/year (99.999%)
```

**Active-Active**:
```
Node1: 1 × t3.large = $60.74/month
Node2: 1 × t3.large = $60.74/month
Load Balancer: $16/month
Conflict resolution overhead: $10/month
Total: $147.48/month (2.34x vs cold)
Downtime: 0 minutes (100%* - both nodes must fail simultaneously)
```

**Which to Choose?**:
```
Budget < $100/month → Cold Standby (99.9%)
Need 99.99% → Warm Standby
Need 99.999% → Hot Standby
Need 100% → Active-Active
```

---

## 4. Data & Storage Design

### Data Synchronization

**Synchronous Replication** (Hot Standby, Active-Active):
```
Client → Write to Primary
Primary → Replicate to Secondary (wait for ACK)
Secondary → Acknowledge
Primary → Return success to Client

Latency: +10-50ms (replication overhead)
Guarantee: No data loss (write confirmed on both nodes)
```

**Asynchronous Replication** (Warm Standby):
```
Client → Write to Primary
Primary → Return success to Client immediately
Primary → Replicate to Secondary (background)

Latency: +0ms (no overhead)
Risk: Data loss if Primary fails before replication
```

**Implementation** (PostgreSQL):
```sql
-- Synchronous replication (Hot Standby)
-- postgresql.conf on Primary
synchronous_commit = on
synchronous_standby_names = 'standby1'

-- Writes wait for standby acknowledgment
-- Slower but guaranteed no data loss

-- Asynchronous replication (Warm Standby)
synchronous_commit = off

-- Writes don't wait for standby
-- Faster but potential data loss
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Split-Brain Problem

**Problem**: Network partition causes both servers to think they're primary

```
Primary <----- Network Partition -----> Secondary

Primary: "Secondary is dead, I'm the only primary"
Secondary: "Primary is dead, I become primary"

Both now primary! ← Split-brain
Users connect to Primary: Update record A
Users connect to Secondary: Update record A differently
When partition heals: Data conflict!
```

**Solution 1: Quorum (Majority Vote)**:
```python
def can_become_primary(node_id, cluster_nodes):
    """
    Only become primary if can reach majority of nodes
    """
    reachable_nodes = [node for node in cluster_nodes if ping(node)]
    
    if len(reachable_nodes) > len(cluster_nodes) / 2:
        return True  # Have quorum, safe to become primary
    else:
        return False  # No quorum, stay secondary

# With 3 nodes:
# Node1 can reach Node2 (2/3 = majority) → Become primary ✅
# Node3 isolated (1/3 = minority) → Stay secondary ✅

# Prevents split-brain: Only one side has quorum
```

**Solution 2: Fencing (STONITH - Shoot The Other Node In The Head)**:
```python
def fence_node(node_id):
    """
    Forcefully power off or disconnect failed node
    """
    # Option 1: Power off via IPMI
    subprocess.run(['ipmitool', '-H', node_id, 'power', 'off'])
    
    # Option 2: Disconnect from network via switch API
    switch.disable_port(node_port)
    
    # Option 3: Revoke storage access
    san.revoke_access(node_id)

# Before becoming primary, fence the old primary
# Ensures old primary can't cause split-brain
```

**Solution 3: Witness Node (Tie-Breaker)**:
```
Primary <----- Network Partition -----> Secondary
   ↓                                        ↓
   └────────────→ Witness ←────────────────┘
                (3rd node, votes but doesn't handle traffic)

Primary can reach Witness: 2/3 votes → Remain primary
Secondary can't reach Witness: 1/3 votes → Stay secondary
```

### Cascading Failover

**Problem**: Primary fails → Secondary becomes Primary → Secondary (now Primary) also fails → No more failover

**Solution**: Chain of failover (Primary → Secondary → Tertiary)

```
Primary (Active)
  ↓ (failover 1)
Secondary (Hot Standby)
  ↓ (failover 2)
Tertiary (Warm Standby)
  ↓ (failover 3)
Disaster Recovery Site (Cold Standby)
```

---

## 6. Security, APIs & Governance

### Secure Failover

**Authentication**:
```bash
# VRRP authentication (prevent rogue servers from taking VIP)
vrrp_instance VI_1 {
    authentication {
        auth_type AH          # Authentication Header (IPsec)
        auth_pass secret123   # Shared secret
    }
}
```

**Encryption**:
```python
# Encrypt heartbeat messages
import hmac
import hashlib

def send_secure_heartbeat(shared_secret):
    timestamp = time.time()
    message = f"HEARTBEAT:{timestamp}"
    
    # Generate HMAC signature
    signature = hmac.new(
        shared_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Send message + signature
    secure_message = f"{message}:{signature}"
    sock.sendto(secure_message.encode(), (secondary_ip, 9999))

def verify_heartbeat(message, shared_secret):
    parts = message.split(':')
    received_signature = parts[2]
    
    # Recompute signature
    expected_signature = hmac.new(
        shared_secret.encode(),
        f"{parts[0]}:{parts[1]}".encode(),
        hashlib.sha256
    ).hexdigest()
    
    return received_signature == expected_signature
```

---

## 7. Real-World Examples & Case Studies

### AWS RDS Multi-AZ (Hot Standby)

**Setup**:
```
Primary DB (us-east-1a)
  ↓ (Synchronous replication)
Standby DB (us-east-1b)

RDS endpoint: mydb.abc123.us-east-1.rds.amazonaws.com
  ↓ (DNS points to Primary)
```

**Failover**:
```
1. Primary fails (AZ outage, instance failure)
2. RDS detects failure (30-120 seconds)
3. Promotes Standby to Primary
4. Updates DNS to point to new Primary
5. Applications reconnect (automatic)
Total Downtime: 60-120 seconds
```

**Characteristics**:
- Automatic failover (no manual intervention)
- Synchronous replication (no data loss)
- Cost: 2x single-AZ (pay for both instances)
- 99.95% SLA (vs 99.9% for single-AZ)

### Netflix: Region Failover

**Setup**:
```
US-East Region (Primary)
  ↓ (Active replication)
US-West Region (Hot Standby)
  ↓ (Active replication)
EU Region (Hot Standby)
```

**Failover**:
```
Route 53 health checks each region
If US-East fails:
  1. Route 53 detects (60 seconds, 3 failed health checks)
  2. Updates DNS to route to US-West
  3. Traffic shifts to US-West
Total Downtime: 60-90 seconds (DNS TTL + propagation)
```

**Chaos Engineering**:
```
# Chaos Monkey randomly kills instances (test failover)
# Chaos Kong kills entire AWS region (test region failover)

Result: Failover tested continuously in production
  → Confidence in failover procedures
  → Issues discovered and fixed before real outage
```

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain failover strategies and when to use each"

**Structured Answer**:

**"Failover is automatic switching to backup system when primary fails. Four main strategies:**

**1. Cold Standby:**
- Secondary offline, provision when needed
- RTO: 20-80 minutes, RPO: 24 hours
- Cost: $ (no secondary server running)
- Use: Non-critical systems

**2. Warm Standby:**
- Secondary running but idle, data replicated
- RTO: 30 seconds, RPO: minutes
- Cost: $$ (two servers, one idle)
- Use: Business applications

**3. Hot Standby (Active-Passive):**
- Secondary fully synced, automatic failover
- RTO: 5-10 seconds, RPO: seconds
- Cost: $$$ (two servers, hot failover)
- Use: Mission-critical (payments, healthcare)

**4. Active-Active:**
- Both servers handling traffic simultaneously
- RTO: 0 (no failover needed), RPO: 0
- Cost: $$$$ (complex, conflict resolution)
- Use: Global apps, zero downtime requirement

**Real-world: AWS RDS Multi-AZ uses Hot Standby (synchronous replication, 60-second failover). Netflix uses Active-Active across regions (Route 53 health checks, 90-second DNS failover)."**

---

### Follow-Up 1: "What's split-brain and how do you prevent it?"

**Answer**:

**"Split-brain occurs when network partition causes both servers to think they're primary:**

**Scenario:**
```
Primary <----- Network Partition -----> Secondary

Both can't communicate but each thinks the other is dead
Both become primary simultaneously
Users write to Primary: Update A
Users write to Secondary: Update A differently
When network heals: Data conflict!
```

**Prevention:**

**1. Quorum (Majority Vote):**
```
3-node cluster: Node1, Node2, Node3

Network partition:
- Node1 + Node2: Can reach each other (2/3 = majority) → Elect primary
- Node3: Isolated (1/3 = minority) → Remain standby

Only one side has quorum → Prevents split-brain
```

**2. Fencing (STONITH):**
```
Before Secondary becomes Primary:
1. Power off Primary (via IPMI)
2. Or disconnect Primary from network
3. Or revoke Primary's storage access

Ensures old Primary can't cause split-brain
```

**3. Witness Node (Tie-Breaker):**
```
Primary ← → Witness ← → Secondary

If Primary can reach Witness: 2/3 votes → Stay primary
If Secondary can reach Witness: 2/3 votes → Become primary

Witness doesn't handle traffic, just votes
```

**Real-world: Kubernetes uses etcd (distributed consensus with quorum). Requires 3+ nodes, majority must agree before leader election. Prevents split-brain automatically."**

---

### Follow-Up 2: "How do you test failover without causing downtime?"

**Answer**:

**"Testing failover in production without disrupting users:**

**1. Chaos Engineering (Netflix approach):**
```
Chaos Monkey: Randomly kills instances
Chaos Kong: Kills entire AWS region
Run continuously in production → Test failover daily

Result: Discover issues before real outage
Example: DNS TTL too long (5 min) → Reduced to 60s
```

**2. Blue-Green Deployment:**
```
Blue Environment (Current production)
Green Environment (Failover target)

1. Deploy to Green
2. Route 10% traffic to Green (canary)
3. If Green healthy, route 100% to Green
4. Blue becomes new failover target

Tests failover path without downtime
```

**3. Scheduled Maintenance Windows:**
```
1. Announce maintenance window (e.g., Sunday 2am)
2. Trigger manual failover: Primary → Secondary
3. Verify failover successful
4. After 1 hour, failback: Secondary → Primary
5. Verify failback successful

Tests both directions (forward + backward)
```

**4. Continuous Drills:**
```
# Every week, automated script:
def test_failover():
    # 1. Save state (which is primary)
    original_primary = get_current_primary()
    
    # 2. Trigger failover
    trigger_failover()
    
    # 3. Verify traffic routing to secondary
    assert get_current_primary() == secondary
    
    # 4. Wait 5 minutes (observe)
    time.sleep(300)
    
    # 5. Failback to original
    trigger_failback()
    assert get_current_primary() == original_primary

Run in staging environment weekly
Run in production environment monthly (with announcement)
```

**Best practice: Netflix runs Chaos Monkey continuously. Every instance has 10% chance of being killed each day. Forces teams to build resilient systems, not just rely on failover."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Complete Failover System

```python
import time
import threading
from enum import Enum
from dataclasses import dataclass

class NodeState(Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    FAILED = "failed"

@dataclass
class ClusterNode:
    node_id: str
    ip: str
    state: NodeState
    last_heartbeat: float

class FailoverController:
    def __init__(self, node_id, nodes, vip):
        self.node_id = node_id
        self.nodes = {n.node_id: n for n in nodes}
        self.vip = vip
        self.state = NodeState.SECONDARY
        self.heartbeat_interval = 1  # second
        self.heartbeat_timeout = 3  # seconds
        self.owns_vip = False
    
    def start(self):
        """Start failover controller"""
        # Determine initial state
        if self.is_highest_priority():
            self.become_primary()
        else:
            self.become_secondary()
    
    def is_highest_priority(self):
        """Check if this node has highest priority (for initial election)"""
        # Simple: Lowest IP becomes primary
        return self.nodes[self.node_id].ip == min(n.ip for n in self.nodes.values())
    
    def become_primary(self):
        """Transition to primary state"""
        print(f"🔵 Node {self.node_id} becoming PRIMARY")
        
        self.state = NodeState.PRIMARY
        self.assign_vip()
        
        # Start heartbeat thread
        threading.Thread(target=self.send_heartbeats, daemon=True).start()
        
        # Start main service
        self.start_application_service()
    
    def become_secondary(self):
        """Transition to secondary state"""
        print(f"🟢 Node {self.node_id} becoming SECONDARY")
        
        self.state = NodeState.SECONDARY
        
        # Monitor primary
        threading.Thread(target=self.monitor_primary, daemon=True).start()
        
        # Start replication receiver
        self.start_replication_receiver()
    
    def send_heartbeats(self):
        """Send periodic heartbeats to all secondaries"""
        while self.state == NodeState.PRIMARY:
            for node_id, node in self.nodes.items():
                if node_id != self.node_id:
                    self.send_heartbeat_to(node)
            
            time.sleep(self.heartbeat_interval)
    
    def send_heartbeat_to(self, node):
        """Send heartbeat to specific node"""
        try:
            message = {
                "type": "heartbeat",
                "from": self.node_id,
                "timestamp": time.time(),
                "state": self.state.value
            }
            # Send via UDP or TCP
            send_message(node.ip, 9999, message)
        except Exception as e:
            print(f"Failed to send heartbeat to {node.node_id}: {e}")
    
    def monitor_primary(self):
        """Monitor primary node health"""
        while self.state == NodeState.SECONDARY:
            primary = self.get_primary_node()
            
            if not primary:
                # No primary, maybe we should become primary
                if self.should_take_over():
                    self.initiate_failover()
                continue
            
            # Check if primary is alive
            if not self.is_node_alive(primary):
                print(f"⚠️ Primary {primary.node_id} appears dead")
                
                if self.should_take_over():
                    self.initiate_failover()
            
            time.sleep(self.heartbeat_interval)
    
    def get_primary_node(self):
        """Get current primary node"""
        for node in self.nodes.values():
            if node.state == NodeState.PRIMARY:
                return node
        return None
    
    def is_node_alive(self, node):
        """Check if node is responsive"""
        if node.last_heartbeat == 0:
            return False
        
        time_since_heartbeat = time.time() - node.last_heartbeat
        return time_since_heartbeat < self.heartbeat_timeout
    
    def should_take_over(self):
        """Determine if this node should become primary"""
        # Check quorum (can reach majority of nodes)
        alive_nodes = [
            n for n in self.nodes.values()
            if n.node_id == self.node_id or self.is_node_alive(n)
        ]
        
        has_quorum = len(alive_nodes) > len(self.nodes) / 2
        
        if not has_quorum:
            print(f"❌ No quorum ({len(alive_nodes)}/{len(self.nodes)}), cannot take over")
            return False
        
        # Among nodes with quorum, highest priority takes over
        is_highest_priority = self.nodes[self.node_id].ip == min(
            n.ip for n in alive_nodes
        )
        
        return has_quorum and is_highest_priority
    
    def initiate_failover(self):
        """Initiate failover to this node"""
        print(f"🔄 Initiating failover to Node {self.node_id}")
        
        # Step 1: Fence old primary (optional but recommended)
        old_primary = self.get_primary_node()
        if old_primary:
            self.fence_node(old_primary)
        
        # Step 2: Promote self to primary
        self.become_primary()
        
        # Step 3: Notify other nodes
        self.broadcast_new_primary()
    
    def fence_node(self, node):
        """Fence (forcefully isolate) failed node"""
        print(f"🔒 Fencing node {node.node_id}")
        
        # Option 1: Power off via IPMI
        # ipmitool -H {node.ip} power off
        
        # Option 2: Disconnect from network
        # switch.disable_port(node.port)
        
        # Option 3: Revoke storage access
        # san.revoke_access(node.node_id)
        
        node.state = NodeState.FAILED
    
    def assign_vip(self):
        """Assign Virtual IP to this node"""
        if self.owns_vip:
            return
        
        print(f"🌐 Assigning VIP {self.vip}")
        
        # Linux: ip addr add
        import subprocess
        subprocess.run([
            'ip', 'addr', 'add', f'{self.vip}/24', 'dev', 'eth0'
        ])
        
        # Send gratuitous ARP
        subprocess.run([
            'arping', '-c', '3', '-I', 'eth0', '-s', self.vip, self.vip
        ])
        
        self.owns_vip = True
    
    def release_vip(self):
        """Release Virtual IP"""
        if not self.owns_vip:
            return
        
        print(f"🌐 Releasing VIP {self.vip}")
        
        import subprocess
        subprocess.run([
            'ip', 'addr', 'del', f'{self.vip}/24', 'dev', 'eth0'
        ])
        
        self.owns_vip = False
    
    def broadcast_new_primary(self):
        """Notify all nodes that this is new primary"""
        for node_id, node in self.nodes.items():
            if node_id != self.node_id:
                message = {
                    "type": "new_primary",
                    "new_primary_id": self.node_id,
                    "timestamp": time.time()
                }
                send_message(node.ip, 9999, message)
    
    def start_application_service(self):
        """Start main application (e.g., database, web server)"""
        print("🚀 Starting application service")
        # Start your application here
    
    def start_replication_receiver(self):
        """Start receiving replication from primary"""
        print("📥 Starting replication receiver")
        # Start replication receiver here

# Usage
nodes = [
    ClusterNode(node_id='node1', ip='10.0.1.10', state=NodeState.SECONDARY, last_heartbeat=0),
    ClusterNode(node_id='node2', ip='10.0.1.11', state=NodeState.SECONDARY, last_heartbeat=0),
    ClusterNode(node_id='node3', ip='10.0.1.12', state=NodeState.SECONDARY, last_heartbeat=0)
]

# On each node, run:
controller = FailoverController(
    node_id='node1',  # Change for each node
    nodes=nodes,
    vip='203.0.113.10'
)
controller.start()
```

### Failover State Diagram

```
┌────────────────────────────────────────────────────────────┐
│                  FAILOVER STATE MACHINE                     │
└────────────────────────────────────────────────────────────┘

                Initial State
                     │
                     ↓
              ┌─────────────┐
              │   UNKNOWN   │
              └──────┬──────┘
                     │
       ┌─────────────┴─────────────┐
       │                           │
   Highest Priority?           Not Highest?
       │                           │
       ↓                           ↓
 ┌─────────────┐            ┌─────────────┐
 │   PRIMARY   │            │  SECONDARY  │
 │ (Active)    │            │ (Standby)   │
 │             │            │             │
 │ - Send      │            │ - Monitor   │
 │   heartbeat │            │   heartbeat │
 │ - Handle    │            │ - Replicate │
 │   traffic   │            │   data      │
 │ - Own VIP   │            │             │
 └──────┬──────┘            └──────┬──────┘
        │                          │
        │ Failure                  │ Primary failed
        │ (crash, network)         │ (3 missed heartbeats)
        │                          │
        ↓                          ↓
 ┌─────────────┐            Has Quorum?
 │   FAILED    │                  │
 │             │            ┌─────┴─────┐
 │ - No VIP    │            │           │
 │ - No traffic│           Yes          No
 └─────────────┘            │           │
                            ↓           ↓
                     ┌─────────────┐  Stay SECONDARY
                     │  FAILOVER   │  (wait for quorum)
                     │  (Transition)│
                     │             │
                     │ 1. Fence old│
                     │    primary  │
                     │ 2. Assign   │
                     │    VIP      │
                     │ 3. Promote  │
                     │    to       │
                     │    PRIMARY  │
                     └──────┬──────┘
                            │
                            ↓
                     ┌─────────────┐
                     │   PRIMARY   │
                     │ (New Active)│
                     └─────────────┘


TIMELINE EXAMPLE:
T=0s:  Primary sends heartbeat
T=1s:  Primary sends heartbeat
T=2s:  Primary sends heartbeat
T=3s:  Primary CRASHES
T=4s:  Secondary: Missed heartbeat (1/3)
T=5s:  Secondary: Missed heartbeat (2/3)
T=6s:  Secondary: Missed heartbeat (3/3) → Initiate failover
T=7s:  Secondary: Check quorum → Yes (2/3 nodes reachable)
T=8s:  Secondary: Fence old Primary
T=9s:  Secondary: Assign VIP
T=10s: Secondary: Become PRIMARY
T=11s: New Primary starts handling traffic

Total Downtime: 7 seconds (3 missed heartbeats + failover)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Failover Strategies Matter

**Without Failover**:
```
Primary server crashes → Service down → Manual intervention required
Downtime: Hours → Lost revenue, damaged reputation
```

**With Failover**:
```
Primary crashes → Automatic switch to Secondary → Service continues
Downtime: Seconds → Users don't notice
```

### How to Choose Failover Strategy

**Decision Matrix**:

| Requirement | Strategy | RTO | RPO | Cost |
|-------------|----------|-----|-----|------|
| Can tolerate hours of downtime | **Cold Standby** | 20-80 min | 24 hrs | $ |
| Need 99.9% uptime (8.76 hrs/year) | **Warm Standby** | 30 sec | Minutes | $$ |
| Need 99.99% uptime (52.6 min/year) | **Hot Standby** | 5-10 sec | Seconds | $$$ |
| Need 99.999% uptime (5.26 min/year) | **Active-Active** | 0 sec | 0 | $$$$ |

### When to Implement

**Cold Standby**:
- Internal tools, dev environments
- Budget < $100/month
- Manual recovery acceptable

**Warm Standby**:
- Business applications (CRM, ERP)
- 30-second downtime acceptable
- Budget $100-200/month

**Hot Standby**:
- E-commerce, SaaS platforms
- 10-second downtime acceptable
- Budget $200-500/month

**Active-Active**:
- Payments, healthcare, financial systems
- Zero downtime requirement
- Budget $500+ /month

### Trade-offs

| Factor | Cold | Warm | Hot | Active-Active |
|--------|------|------|-----|---------------|
| **Complexity** | ⭐ Simple | ⭐⭐ Medium | ⭐⭐⭐ Complex | ⭐⭐⭐⭐⭐ Very Complex |
| **Cost** | ⭐⭐⭐⭐⭐ Cheap | ⭐⭐⭐ Medium | ⭐⭐ Expensive | ⭐ Very Expensive |
| **Recovery Time** | ⭐ Hours | ⭐⭐⭐ Seconds | ⭐⭐⭐⭐ Seconds | ⭐⭐⭐⭐⭐ None |
| **Data Loss** | ⭐ 24 hours | ⭐⭐⭐ Minutes | ⭐⭐⭐⭐ Seconds | ⭐⭐⭐⭐⭐ None |

### Production Checklist

- [ ] **Define SLA**: 99.9% vs 99.99% vs 99.999%?
- [ ] **Calculate downtime cost**: Revenue lost per minute of outage?
- [ ] **Choose strategy**: Based on SLA and budget
- [ ] **Implement monitoring**: Heartbeats, health checks
- [ ] **Prevent split-brain**: Quorum, fencing, witness node
- [ ] **Test regularly**: Chaos engineering, scheduled drills
- [ ] **Document procedures**: Runbooks for manual failover (if needed)
- [ ] **Alert on failures**: PagerDuty, Slack, email
- [ ] **Capacity planning**: Ensure secondary can handle full load

### Bottom Line

**Start with Warm Standby for most business applications (good balance of cost vs availability). Upgrade to Hot Standby only if downtime cost justifies 2x infrastructure cost. Reserve Active-Active for mission-critical systems where even 10 seconds of downtime is unacceptable.**

**Real-world lesson from Amazon**: "We use different strategies for different services. DynamoDB uses Active-Active (multi-region). RDS uses Hot Standby (Multi-AZ). S3 uses Active-Active (automatically replicated). Not everything needs five-nines—match failover strategy to business criticality."

