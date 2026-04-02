# 117. Disaster Recovery

## 📌 Overview

**Disaster Recovery (DR)** is the plan and process to restore IT systems after a catastrophic failure.

**Key metrics**:
- **RTO** (Recovery Time Objective): How long to restore service
- **RPO** (Recovery Point Objective): How much data loss acceptable

```
Disaster strikes → Initiate DR → Restore service within RTO
                 → Restore data with <RPO data loss
```

---

## 🎯 RTO vs RPO

### **Definitions**

```
RTO (Recovery Time Objective):
Maximum acceptable downtime
"How long can we be down?"

Example:
- E-commerce: RTO = 1 hour (every hour down = $100K lost)
- Blog: RTO = 24 hours (low business impact)

RPO (Recovery Point Objective):
Maximum acceptable data loss
"How much data can we lose?"

Example:
- Financial transactions: RPO = 0 (zero data loss)
- Analytics logs: RPO = 1 hour (some loss acceptable)
```

### **Visual Timeline**

```
Last Backup             Disaster      System Restored
    |                      |                |
    |<------ RPO --------->|                |
    |                      |<--- RTO ------>|
    |                      |                |
Time: 01:00             02:00            03:00

RPO = 1 hour: Data between 01:00-02:00 lost (1 hour of data)
RTO = 1 hour: Service restored at 03:00 (1 hour downtime)
```

### **RTO vs Cost Trade-off**

```python
class DRStrategy:
    """Disaster recovery strategies with cost/RTO trade-offs"""
    
    STRATEGIES = {
        'cold_standby': {
            'rto': '24-72 hours',
            'rpo': '24 hours',
            'cost_multiplier': 1.1,  # 10% more
            'description': 'Backups only, restore manually'
        },
        'warm_standby': {
            'rto': '1-4 hours',
            'rpo': '1 hour',
            'cost_multiplier': 1.5,  # 50% more
            'description': 'DR site running, scaled down'
        },
        'hot_standby': {
            'rto': '5-30 minutes',
            'rpo': '5 minutes',
            'cost_multiplier': 2.0,  # 100% more (2x)
            'description': 'DR site active, ready for failover'
        },
        'active_active': {
            'rto': 'Instant (0 minutes)',
            'rpo': '0 (no data loss)',
            'cost_multiplier': 2.5,  # 150% more (2.5x)
            'description': 'Both sites active, load balanced'
        }
    }
    
    def recommend_strategy(self, business_type):
        """Recommend DR strategy based on business"""
        recommendations = {
            'banking': 'active_active',      # Zero downtime required
            'ecommerce': 'hot_standby',      # Minutes acceptable
            'saas': 'warm_standby',          # Hours acceptable
            'blog': 'cold_standby'           # Days acceptable
        }
        return recommendations.get(business_type, 'warm_standby')

# Usage
dr = DRStrategy()
strategy = dr.recommend_strategy('ecommerce')
details = dr.STRATEGIES[strategy]
print(f"Recommended: {strategy}")
print(f"RTO: {details['rto']}")
print(f"RPO: {details['rpo']}")
print(f"Cost: {details['cost_multiplier']}x base cost")
```

---

## 🛠️ Backup Strategies

### **1. Full Backup**

```python
import shutil
import datetime

class FullBackup:
    """Complete copy of all data"""
    
    def backup(self, source_db, backup_location):
        """Perform full backup"""
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f"{backup_location}/full_backup_{timestamp}"
        
        print(f"Starting full backup...")
        start = time.time()
        
        # Copy entire database
        shutil.copytree(source_db, backup_path)
        
        elapsed = time.time() - start
        print(f"✓ Full backup completed in {elapsed:.1f}s")
        return backup_path

# Pros: Simple, complete
# Cons: Slow (copies everything), large storage
# Schedule: Weekly
```

### **2. Incremental Backup**

```python
class IncrementalBackup:
    """Only backup changes since last backup"""
    
    def __init__(self):
        self.last_backup_time = None
    
    def backup(self, source_db, backup_location):
        """Backup only changed files"""
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f"{backup_location}/incremental_{timestamp}"
        
        print(f"Starting incremental backup...")
        
        # Only copy files modified since last backup
        changed_files = self.get_changed_files(
            source_db,
            since=self.last_backup_time
        )
        
        for file in changed_files:
            shutil.copy(file, backup_path)
        
        self.last_backup_time = datetime.datetime.now()
        print(f"✓ Incremental backup: {len(changed_files)} files")
        return backup_path
    
    def get_changed_files(self, source, since):
        """Get files modified after timestamp"""
        if not since:
            return []  # First backup, return empty
        
        changed = []
        for file in os.listdir(source):
            mtime = os.path.getmtime(file)
            if mtime > since.timestamp():
                changed.append(file)
        return changed

# Pros: Fast, small storage
# Cons: Complex restore (need chain of backups)
# Schedule: Daily
```

### **3. Differential Backup**

```python
class DifferentialBackup:
    """Backup changes since last FULL backup"""
    
    def __init__(self):
        self.last_full_backup_time = None
    
    def backup(self, source_db, backup_location):
        """Backup changed since last full backup"""
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f"{backup_location}/differential_{timestamp}"
        
        print(f"Starting differential backup...")
        
        # Copy files changed since last FULL backup
        changed_files = self.get_changed_files(
            source_db,
            since=self.last_full_backup_time
        )
        
        for file in changed_files:
            shutil.copy(file, backup_path)
        
        print(f"✓ Differential backup: {len(changed_files)} files")
        return backup_path

# Pros: Faster restore (full + latest differential)
# Cons: Each backup grows over time
# Schedule: Daily (after weekly full)
```

### **4. Continuous Replication**

```python
class ContinuousReplication:
    """Real-time replication to DR site"""
    
    def __init__(self, primary_db, replica_db):
        self.primary = primary_db
        self.replica = replica_db
        self.replication_lag = 0
    
    def replicate_write(self, data):
        """Write to primary, replicate to DR"""
        # Write to primary
        self.primary.write(data)
        
        # Asynchronously replicate to DR
        self.replica.write_async(data)
        
        # Track lag
        self.replication_lag = self.calculate_lag()
    
    def calculate_lag(self):
        """Calculate replication lag"""
        primary_lsn = self.primary.get_lsn()  # Log Sequence Number
        replica_lsn = self.replica.get_lsn()
        return primary_lsn - replica_lsn

# Pros: Near-zero RPO (<1 minute)
# Cons: Expensive, complex
# Use case: Financial systems
```

---

## 🎯 Multi-Region Failover

### **Active-Passive (Hot Standby)**

```python
import boto3

class ActivePassiveDR:
    """Primary active, DR passive (hot standby)"""
    
    def __init__(self):
        self.route53 = boto3.client('route53')
        self.primary_region = 'us-east-1'
        self.dr_region = 'us-west-2'
        self.current_active = self.primary_region
    
    def setup_failover(self):
        """Configure Route 53 health check failover"""
        # Create health check for primary
        health_check = self.route53.create_health_check(
            Type='HTTPS',
            ResourcePath='/health',
            FullyQualifiedDomainName=f'{self.primary_region}.example.com',
            Port=443,
            RequestInterval=30,
            FailureThreshold=3
        )
        
        # Primary record
        self.route53.change_resource_record_sets(
            HostedZoneId='Z123',
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
                            'DNSName': f'{self.primary_region}.elb.amazonaws.com'
                        }
                    }
                }]
            }
        )
        
        # DR record (secondary)
        self.route53.change_resource_record_sets(
            HostedZoneId='Z123',
            ChangeBatch={
                'Changes': [{
                    'Action': 'CREATE',
                    'ResourceRecordSet': {
                        'Name': 'api.example.com',
                        'Type': 'A',
                        'SetIdentifier': 'Secondary',
                        'Failover': 'SECONDARY',
                        'AliasTarget': {
                            'DNSName': f'{self.dr_region}.elb.amazonaws.com'
                        }
                    }
                }]
            }
        )
        
        print("✓ Failover configured:")
        print(f"  Primary: {self.primary_region}")
        print(f"  DR: {self.dr_region}")
        print(f"  Auto-failover if primary unhealthy")
    
    def manual_failover(self):
        """Manually failover to DR region"""
        if self.current_active == self.primary_region:
            print(f"Failing over: {self.primary_region} → {self.dr_region}")
            
            # Promote DR database to primary
            self.promote_dr_database()
            
            # Update DNS to point to DR
            self.update_dns(self.dr_region)
            
            self.current_active = self.dr_region
            print("✓ Failover complete")
    
    def promote_dr_database(self):
        """Promote DR database replica to primary"""
        rds = boto3.client('rds', region_name=self.dr_region)
        
        rds.promote_read_replica(
            DBInstanceIdentifier='mydb-replica'
        )
        
        print("✓ DR database promoted to primary")
    
    def update_dns(self, region):
        """Update DNS to point to active region"""
        # Route 53 automatic with health checks
        pass

# Usage
dr = ActivePassiveDR()
dr.setup_failover()

# Disaster detected
dr.manual_failover()
```

---

## 🎯 DR Testing

### **DR Drill (GameDay)**

```python
import datetime

class DRDrill:
    """Test disaster recovery procedures"""
    
    def __init__(self):
        self.drill_log = []
    
    def run_drill(self):
        """Execute DR drill"""
        print("=" * 60)
        print("DISASTER RECOVERY DRILL")
        print(f"Date: {datetime.datetime.now()}")
        print("=" * 60)
        
        start_time = datetime.datetime.now()
        
        # Step 1: Simulate disaster
        self.log("Simulating primary region failure...")
        self.simulate_disaster()
        
        # Step 2: Detect failure
        self.log("Monitoring detects failure...")
        detection_time = self.detect_failure()
        
        # Step 3: Alert team
        self.log("Alerting on-call team...")
        self.alert_team()
        
        # Step 4: Initiate failover
        self.log("Initiating failover to DR region...")
        failover_time = self.initiate_failover()
        
        # Step 5: Verify DR
        self.log("Verifying DR services...")
        verify_time = self.verify_dr_services()
        
        # Step 6: Calculate metrics
        end_time = datetime.datetime.now()
        total_time = (end_time - start_time).total_seconds()
        
        print("\n" + "=" * 60)
        print("DRILL RESULTS")
        print("=" * 60)
        print(f"Total RTO: {total_time/60:.1f} minutes")
        print(f"  Detection: {detection_time}s")
        print(f"  Failover: {failover_time}s")
        print(f"  Verification: {verify_time}s")
        
        # Check if met target RTO
        target_rto = 300  # 5 minutes
        if total_time <= target_rto:
            print(f"✓ Met RTO target ({target_rto}s)")
        else:
            print(f"✗ Exceeded RTO target by {total_time - target_rto:.0f}s")
        
        return self.drill_log
    
    def simulate_disaster(self):
        """Simulate primary region failure"""
        time.sleep(2)
        self.log("✗ Primary region OFFLINE")
    
    def detect_failure(self):
        """Monitor detects failure"""
        time.sleep(5)  # 5 seconds to detect
        self.log("✓ Failure detected by health checks")
        return 5
    
    def alert_team(self):
        """Alert on-call team"""
        time.sleep(3)  # 3 seconds to alert
        self.log("✓ On-call team alerted via PagerDuty")
    
    def initiate_failover(self):
        """Failover to DR"""
        time.sleep(60)  # 60 seconds to failover
        self.log("✓ DNS updated to DR region")
        self.log("✓ DR database promoted to primary")
        return 60
    
    def verify_dr_services(self):
        """Verify DR services working"""
        time.sleep(10)  # 10 seconds to verify
        services = ['API', 'Database', 'Cache', 'Queue']
        for service in services:
            self.log(f"✓ {service} operational in DR")
        return 10
    
    def log(self, message):
        """Log drill step"""
        timestamp = datetime.datetime.now().strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] {message}"
        self.drill_log.append(log_entry)
        print(log_entry)

# Usage: Run quarterly DR drill
drill = DRDrill()
drill.run_drill()
```

**Output:**
```
============================================================
DISASTER RECOVERY DRILL
Date: 2024-01-15 10:00:00
============================================================
[10:00:00] Simulating primary region failure...
[10:00:02] ✗ Primary region OFFLINE
[10:00:02] Monitoring detects failure...
[10:00:07] ✓ Failure detected by health checks
[10:00:07] Alerting on-call team...
[10:00:10] ✓ On-call team alerted via PagerDuty
[10:00:10] Initiating failover to DR region...
[10:01:10] ✓ DNS updated to DR region
[10:01:10] ✓ DR database promoted to primary
[10:01:10] Verifying DR services...
[10:01:20] ✓ API operational in DR
[10:01:20] ✓ Database operational in DR
[10:01:20] ✓ Cache operational in DR
[10:01:20] ✓ Queue operational in DR

============================================================
DRILL RESULTS
============================================================
Total RTO: 1.3 minutes
  Detection: 5s
  Failover: 60s
  Verification: 10s
✓ Met RTO target (300s)
```

---

## 🎯 Real-World Examples

### **1. AWS: Multi-Region Backup**

```python
import boto3

class AWSDisasterRecovery:
    """AWS multi-region DR setup"""
    
    def __init__(self):
        self.primary_region = 'us-east-1'
        self.dr_region = 'us-west-2'
    
    def setup_rds_dr(self):
        """Setup RDS cross-region replica"""
        rds = boto3.client('rds', region_name=self.primary_region)
        
        # Create read replica in DR region
        rds.create_db_instance_read_replica(
            DBInstanceIdentifier='mydb-dr-replica',
            SourceDBInstanceIdentifier='mydb-primary',
            DBInstanceClass='db.t3.large',
            AvailabilityZone=f'{self.dr_region}a'
        )
        
        print(f"✓ RDS replica created in {self.dr_region}")
    
    def setup_s3_replication(self):
        """Setup S3 cross-region replication"""
        s3 = boto3.client('s3')
        
        replication_config = {
            'Role': 'arn:aws:iam::123:role/s3-replication',
            'Rules': [{
                'Status': 'Enabled',
                'Priority': 1,
                'Destination': {
                    'Bucket': f'arn:aws:s3:::my-bucket-{self.dr_region}',
                    'ReplicationTime': {
                        'Status': 'Enabled',
                        'Time': {'Minutes': 15}  # RTO: 15 minutes
                    }
                }
            }]
        }
        
        s3.put_bucket_replication(
            Bucket='my-bucket',
            ReplicationConfiguration=replication_config
        )
        
        print(f"✓ S3 replication to {self.dr_region}")

# Usage
dr = AWSDisasterRecovery()
dr.setup_rds_dr()
dr.setup_s3_replication()
```

### **2. Netflix: Chaos Testing**

```python
class ChaosMonkey:
    """Netflix Chaos Monkey for DR testing"""
    
    def run_chaos_experiment(self):
        """Randomly terminate instances"""
        instances = self.get_production_instances()
        
        # Randomly select instance
        victim = random.choice(instances)
        
        print(f"🐒 Chaos Monkey: Terminating {victim}")
        self.terminate_instance(victim)
        
        # Verify auto-recovery
        time.sleep(60)
        if self.is_service_healthy():
            print("✓ Service recovered automatically")
        else:
            print("✗ Service failed to recover (DR issue)")
    
    def terminate_instance(self, instance_id):
        ec2 = boto3.client('ec2')
        ec2.terminate_instances(InstanceIds=[instance_id])

# Run daily in production
chaos = ChaosMonkey()
chaos.run_chaos_experiment()
```

---

## ✅ Best Practices

### **1. Test DR Regularly**

```python
# Bad: Never test DR
# Result: DR plan fails when needed ❌

# Good: Quarterly DR drills
schedule_dr_drill(frequency='quarterly')  # ✓
```

### **2. Automate Failover**

```python
# Bad: Manual failover (slow, error-prone)
# RTO: 2 hours (wait for team, manual steps) ❌

# Good: Automated health check failover
# RTO: 5 minutes (automatic) ✓
setup_route53_health_check_failover()
```

### **3. Document Runbooks**

```markdown
# Disaster Recovery Runbook

## Scenario: Primary Region Down

### Step 1: Verify Outage
- Check monitoring: CloudWatch, Datadog
- Confirm: All primary region health checks failing

### Step 2: Initiate Failover
```bash
./scripts/failover-to-dr.sh us-west-2
```

### Step 3: Verify DR Services
- API: https://api-dr.example.com/health
- Database: Check replication lag < 1 minute
- Cache: Verify hit rate > 80%

### Step 4: Update Status Page
- Post: "Failover to DR region complete"

### Step 5: Monitor
- RTO achieved: < 5 minutes?
- RPO: Data loss < 1 minute?
```

### **4. Monitor Replication Lag**

```python
def monitor_replication_lag():
    """Alert if replication lag too high"""
    lag = get_replication_lag()
    
    if lag > 60:  # >1 minute
        send_alert(f"⚠️ Replication lag: {lag}s (RPO at risk)")
    
    return lag
```

---

## 🎓 Interview Tips

**Q: "What is RTO and RPO?"**

A: "Disaster recovery metrics:

**RTO** (Recovery Time Objective):
- How long to restore service after disaster
- Example: RTO = 1 hour → Must restore within 1 hour
- Trade-off: Shorter RTO = more expensive

**RPO** (Recovery Point Objective):
- How much data loss acceptable
- Example: RPO = 5 minutes → Lose max 5 minutes of data
- Trade-off: Lower RPO = more expensive

Example:
- Bank: RTO = 5 minutes, RPO = 0 (zero data loss)
- Blog: RTO = 24 hours, RPO = 1 day (cheap)

Achieve:
- RTO: Hot standby (DR site ready), automated failover
- RPO: Continuous replication, frequent backups"

**Q: "How do you design multi-region DR?"**

A: "Steps:

1. **Data replication**: Primary → DR region
   - Database: Cross-region read replica (RDS)
   - Storage: S3 cross-region replication
   - Cache: Populate DR cache on failover

2. **Health checks**: Monitor primary
   - Route 53 health check every 30s
   - If 3 failures → failover to DR

3. **Automated failover**:
   - DNS update (Route 53 failover routing)
   - Promote DR database to primary
   - Update app config (point to DR region)

4. **Testing**: Quarterly DR drills
   - Simulate primary failure
   - Measure RTO/RPO
   - Fix issues found

Architecture:
- Primary (us-east-1): Active, serving traffic
- DR (us-west-2): Hot standby, replicating
- Failover: 5 minutes (automated)
- RPO: 1 minute (async replication lag)"

**Q: "What are different DR strategies?"**

A: "Four main strategies:

1. **Cold Standby** (Backup/Restore):
   - DR: Backups only, no running infrastructure
   - RTO: 24-72 hours (manual restore)
   - RPO: 24 hours (daily backups)
   - Cost: 1.1x (cheapest)
   - Use: Blogs, non-critical systems

2. **Warm Standby** (Pilot Light):
   - DR: Minimal infrastructure running (DB replica)
   - RTO: 1-4 hours (scale up, deploy app)
   - RPO: 1 hour
   - Cost: 1.5x
   - Use: SaaS products

3. **Hot Standby** (Active-Passive):
   - DR: Full infrastructure running, not serving traffic
   - RTO: 5-30 minutes (DNS failover)
   - RPO: 5 minutes (continuous replication)
   - Cost: 2x
   - Use: E-commerce, critical apps

4. **Active-Active** (Multi-Region):
   - DR: Both regions active, load balanced
   - RTO: Instant (automatic)
   - RPO: 0 (synchronous replication)
   - Cost: 2.5x (most expensive)
   - Use: Banking, healthcare, must have zero downtime"

---

## 📚 Summary

**Disaster Recovery**: Plan to restore systems after catastrophic failure

**Metrics**: RTO (time to restore), RPO (data loss acceptable)

**Strategies**: Cold (24h), Warm (1-4h), Hot (5-30min), Active-Active (instant)

**Key**: Multi-region replication, automated failover, regular testing

**Best Practice**: Automate, test quarterly, document runbooks, monitor replication lag 🚀
