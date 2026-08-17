# 118. Chaos Engineering (Intro)

## 📌 Overview

**Chaos Engineering** is the discipline of experimenting on a system to build confidence in its capability to withstand turbulent conditions in production.

**Philosophy**: **Break things on purpose** to find weaknesses before they cause real outages.

```
Traditional: Hope system works under failure
Chaos Engineering: Prove system works under failure ✓
```

---

## 🎯 Why Chaos Engineering?

### **Find Weaknesses Before Production**

```
Scenario: Database failover never tested

Production incident:
- Primary DB crashes
- Attempt failover to replica
- Discovery: Replica 2 days behind (replication broken) ❌
- Result: 2 days of data loss, 4 hours downtime

With Chaos Engineering:
- Monthly test: Kill primary DB
- Discover: Replica lag during test
- Fix: Before production incident ✓
- Result: Real incident handled smoothly
```

### **Build Confidence**

```
Without chaos testing:
Team: "We think failover works..."
Incident: "Failover failed, 4 hour outage" ❌

With chaos testing:
Team: "We test failover monthly, always succeeds"
Incident: "Failover worked, 2 minute outage" ✓
```

---

## 🎯 Chaos Monkey (Netflix)

### **The Original**

**Chaos Monkey**: Netflix tool that randomly terminates EC2 instances in production.

**Philosophy**: If engineers know instances will die randomly, they'll build resilient systems.

```python
import boto3
import random
import time

class ChaosMonkey:
    """Netflix Chaos Monkey - randomly terminate instances"""
    
    def __init__(self, region='us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.excluded_tags = ['chaos-immune']
    
    def get_victims(self):
        """Get instances eligible for termination"""
        response = self.ec2.describe_instances(
            Filters=[
                {'Name': 'instance-state-name', 'Values': ['running']},
            ]
        )
        
        instances = []
        for reservation in response['Reservations']:
            for instance in reservation['Instances']:
                # Exclude tagged instances
                tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
                if 'chaos-immune' not in tags:
                    instances.append(instance['InstanceId'])
        
        return instances
    
    def unleash(self, dry_run=False):
        """Randomly terminate an instance"""
        victims = self.get_victims()
        
        if not victims:
            print("No victims found")
            return
        
        # Choose random victim
        victim = random.choice(victims)
        
        print(f"🐒 Chaos Monkey selecting victim: {victim}")
        
        if dry_run:
            print("  (Dry run - not actually terminating)")
            return
        
        # Terminate instance
        self.ec2.terminate_instances(InstanceIds=[victim])
        print(f"✗ Terminated {victim}")
        
        # Verify auto-scaling recreates instance
        time.sleep(60)
        
        new_instances = self.get_victims()
        if len(new_instances) >= len(victims):
            print("✓ Auto-scaling replaced instance")
        else:
            print("⚠️ Instance not replaced (potential issue)")
    
    def schedule_chaos(self, interval_hours=24):
        """Run Chaos Monkey on schedule"""
        while True:
            print(f"\n🐒 Chaos Monkey waking up...")
            self.unleash()
            print(f"🐒 Sleeping for {interval_hours} hours")
            time.sleep(interval_hours * 3600)

# Usage
monkey = ChaosMonkey()

# Dry run (safe)
monkey.unleash(dry_run=True)

# Real chaos (production)
monkey.unleash()  # Terminates random instance!
```

**Impact at Netflix**:
- Runs daily in production
- Forces engineers to build auto-recovery
- Result: Netflix survives AWS region outages (auto-failover works)

---

## 🎯 Types of Chaos Experiments

### **1. Latency Injection**

```python
import time
import random

class LatencyInjection:
    """Add artificial latency to test timeout handling"""
    
    def __init__(self, probability=0.1, latency_ms=5000):
        self.probability = probability  # 10% of requests
        self.latency_ms = latency_ms    # 5 second delay
    
    def call_service(self, func, *args, **kwargs):
        """Inject latency randomly"""
        if random.random() < self.probability:
            print(f"💥 Injecting {self.latency_ms}ms latency")
            time.sleep(self.latency_ms / 1000)
        
        return func(*args, **kwargs)

# Usage
chaos = LatencyInjection(probability=0.1, latency_ms=5000)

def api_call():
    return requests.get('https://api.example.com')

# 10% of calls delayed by 5s
result = chaos.call_service(api_call)
```

**Tests**:
- Do timeouts work?
- Does retry logic kick in?
- Does circuit breaker open?

### **2. Error Injection**

```python
class ErrorInjection:
    """Inject errors to test error handling"""
    
    def __init__(self, probability=0.1):
        self.probability = probability
    
    def call_service(self, func, *args, **kwargs):
        """Randomly return errors"""
        if random.random() < self.probability:
            print("💥 Injecting 500 error")
            raise requests.HTTPError("500 Internal Server Error")
        
        return func(*args, **kwargs)

# Usage
chaos = ErrorInjection(probability=0.1)

# 10% of calls fail with 500 error
try:
    result = chaos.call_service(api_call)
except requests.HTTPError:
    # Does fallback work?
    result = get_cached_response()
```

**Tests**:
- Does retry work?
- Does fallback trigger?
- Are errors logged?

### **3. Resource Exhaustion**

```python
import psutil

class ResourceExhaustion:
    """Consume CPU/memory to test resource limits"""
    
    def consume_cpu(self, duration_seconds=60):
        """Max out CPU for duration"""
        print(f"💥 Consuming CPU for {duration_seconds}s")
        
        end_time = time.time() + duration_seconds
        while time.time() < end_time:
            # Busy loop
            _ = sum(range(1000000))
    
    def consume_memory(self, size_mb=1024):
        """Allocate large amount of memory"""
        print(f"💥 Consuming {size_mb}MB memory")
        
        # Allocate memory
        data = []
        for _ in range(size_mb):
            data.append(' ' * 1024 * 1024)  # 1MB
        
        time.sleep(60)
        del data

# Usage
chaos = ResourceExhaustion()
chaos.consume_cpu(duration_seconds=30)
chaos.consume_memory(size_mb=2048)
```

**Tests**:
- Do resource limits work?
- Does auto-scaling trigger?
- Does system degrade gracefully?

### **4. Network Partition**

```python
class NetworkPartition:
    """Simulate network split (split-brain)"""
    
    def partition_region(self, region):
        """Block network to region"""
        print(f"💥 Partitioning network to {region}")
        
        # Use iptables to block traffic
        os.system(f"iptables -A OUTPUT -d {region} -j DROP")
        
        time.sleep(300)  # 5 minutes
        
        # Restore network
        print(f"✓ Restoring network to {region}")
        os.system(f"iptables -D OUTPUT -d {region} -j DROP")

# Usage
chaos = NetworkPartition()
chaos.partition_region('us-west-2')
```

**Tests**:
- Does split-brain protection work?
- Does failover to other region work?
- Do distributed locks handle partition?

---

## 🎯 Chaos Testing Principles

### **1. Start Small**

```
Week 1: Non-production environment
Week 2: Production, small blast radius (1 instance)
Week 3: Production, larger blast radius (10% of instances)
Week 4: Production, full chaos (any instance)
```

### **2. Define Abort Criteria**

```python
class ChaosExperiment:
    def __init__(self):
        self.abort_criteria = {
            'error_rate': 0.01,     # >1% error rate → abort
            'latency_p99': 5000,    # >5s latency → abort
            'availability': 0.99    # <99% uptime → abort
        }
    
    def should_abort(self, metrics):
        """Check if experiment should abort"""
        if metrics['error_rate'] > self.abort_criteria['error_rate']:
            print("⚠️ Aborting: Error rate too high")
            return True
        
        if metrics['latency_p99'] > self.abort_criteria['latency_p99']:
            print("⚠️ Aborting: Latency too high")
            return True
        
        if metrics['availability'] < self.abort_criteria['availability']:
            print("⚠️ Aborting: Availability too low")
            return True
        
        return False
```

### **3. Gradual Increase**

```python
class GradualChaos:
    """Gradually increase chaos intensity"""
    
    def run_experiment(self):
        # Week 1: 1% of requests affected
        self.inject_errors(probability=0.01)
        if self.system_stable():
            # Week 2: 5% of requests
            self.inject_errors(probability=0.05)
            if self.system_stable():
                # Week 3: 10% of requests
                self.inject_errors(probability=0.10)
```

---

## 🎯 Chaos Tools

### **1. Gremlin (Commercial)**

```python
import gremlin

# CPU attack
gremlin.attack_cpu(
    target='production',
    percent=80,
    duration=300  # 5 minutes
)

# Network latency attack
gremlin.attack_latency(
    target='production',
    latency_ms=5000,
    percent=10  # Affect 10% of traffic
)

# Container shutdown attack
gremlin.attack_shutdown(
    target='k8s-pod-xyz',
    delay_sec=60
)
```

### **2. Chaos Toolkit (Open Source)**

```yaml
# experiment.yaml
title: "Test API resilience to latency"
description: "Inject 5s latency to 10% of requests"

steady-state-hypothesis:
  title: "API responds within 2s"
  probes:
    - type: probe
      name: check-latency
      provider:
        type: http
        url: https://api.example.com/health
        timeout: 2

method:
  - type: action
    name: inject-latency
    provider:
      type: process
      path: tc
      arguments: qdisc add dev eth0 root netem delay 5000ms 10%
    
  - type: probe
    name: verify-system-stable
    provider:
      type: http
      url: https://api.example.com/metrics
      
rollbacks:
  - type: action
    name: remove-latency
    provider:
      type: process
      path: tc
      arguments: qdisc del dev eth0 root
```

Run:
```bash
chaos run experiment.yaml
```

### **3. AWS Fault Injection Simulator (FIS)**

```python
import boto3

fis = boto3.client('fis')

# Create experiment template
template = fis.create_experiment_template(
    description='Terminate 20% of instances',
    targets={
        'Instances': {
            'resourceType': 'aws:ec2:instance',
            'selectionMode': 'PERCENT',
            'parameters': {'percentage': '20'}
        }
    },
    actions={
        'TerminateInstances': {
            'actionId': 'aws:ec2:terminate-instances',
            'targets': {'Instances': 'Instances'}
        }
    },
    stopConditions=[{
        'source': 'aws:cloudwatch:alarm',
        'value': 'arn:aws:cloudwatch:alarm:high-error-rate'
    }],
    roleArn='arn:aws:iam::123:role/FISRole'
)

# Run experiment
fis.start_experiment(
    experimentTemplateId=template['experimentTemplate']['id']
)
```

---

## 🎯 GameDays

### **Planned Chaos Exercises**

```python
class GameDay:
    """Planned chaos engineering exercise"""
    
    def __init__(self):
        self.scenarios = []
        self.participants = []
    
    def plan_gameday(self):
        """Plan GameDay scenario"""
        scenario = {
            'name': 'Region Failure',
            'date': '2024-01-15',
            'time': '10:00 AM',
            'duration': '2 hours',
            'participants': [
                'Engineering team',
                'On-call team',
                'Management'
            ],
            'scenario': 'Simulate us-east-1 region failure',
            'expected_outcome': 'Failover to us-west-2 within 5 minutes',
            'abort_criteria': 'Customer-facing errors >1%'
        }
        
        self.scenarios.append(scenario)
        print("GameDay planned:")
        print(json.dumps(scenario, indent=2))
    
    def run_gameday(self, scenario):
        """Execute GameDay"""
        print(f"\n🎮 Starting GameDay: {scenario['name']}")
        print(f"Time: {scenario['date']} {scenario['time']}")
        
        # Step 1: Brief team
        print("\n📋 Briefing team...")
        self.brief_team(scenario)
        
        # Step 2: Inject failure
        print("\n💥 Injecting failure...")
        self.inject_failure(scenario)
        
        # Step 3: Monitor response
        print("\n👀 Monitoring team response...")
        metrics = self.monitor_response()
        
        # Step 4: Debrief
        print("\n📊 Debrief...")
        self.debrief(scenario, metrics)
    
    def inject_failure(self, scenario):
        """Inject planned failure"""
        if scenario['scenario'] == 'Simulate us-east-1 region failure':
            # Block traffic to us-east-1
            print("Blocking us-east-1 traffic...")
            time.sleep(2)
    
    def monitor_response(self):
        """Monitor how team responds"""
        return {
            'detection_time': 30,   # 30 seconds
            'failover_time': 180,   # 3 minutes
            'rto_achieved': True,
            'customer_impact': 'Minimal'
        }
    
    def debrief(self, scenario, metrics):
        """Post-GameDay debrief"""
        print("\nGameDay Results:")
        print(f"  Detection: {metrics['detection_time']}s")
        print(f"  Failover: {metrics['failover_time']}s")
        print(f"  RTO met: {metrics['rto_achieved']}")
        print(f"  Customer impact: {metrics['customer_impact']}")
        
        # Identify improvements
        print("\nAction Items:")
        if metrics['detection_time'] > 60:
            print("  - Improve monitoring (detection too slow)")
        if metrics['failover_time'] > 300:
            print("  - Automate failover (manual too slow)")

# Usage
gameday = GameDay()
gameday.plan_gameday()
```

---

## ✅ Best Practices

### **1. Start in Non-Production**

```python
# Bad: First chaos test in production ❌
chaos.unleash(environment='production')

# Good: Test in staging first ✓
chaos.unleash(environment='staging')
# After success → production
```

### **2. Define Blast Radius**

```python
# Bad: Unlimited blast radius
chaos.terminate_instances(limit=None)  # Could kill all! ❌

# Good: Limited blast radius
chaos.terminate_instances(
    limit=1,  # Max 1 instance
    tags={'environment': 'production', 'tier': 'web'}  # Only web tier ✓
)
```

### **3. Monitor During Experiments**

```python
class MonitoredChaos:
    def run_experiment(self):
        # Monitor metrics
        metrics_before = self.get_metrics()
        
        # Run chaos
        self.inject_failure()
        
        # Monitor impact
        metrics_after = self.get_metrics()
        
        # Compare
        if metrics_after['error_rate'] > metrics_before['error_rate'] * 2:
            print("⚠️ Error rate doubled, aborting")
            self.rollback()
```

### **4. Document Findings**

```python
class ExperimentReport:
    def generate_report(self, experiment):
        return {
            'experiment': experiment['name'],
            'date': experiment['date'],
            'hypothesis': 'System handles DB failover within 5 minutes',
            'result': 'FAILED',
            'findings': [
                'Replica lag too high (2 hours)',
                'Monitoring did not alert',
                'Manual intervention required'
            ],
            'action_items': [
                'Fix replication lag monitoring',
                'Add automated failover',
                'Document runbook'
            ]
        }
```

---

## 🎓 Interview Tips

**Q: "What is chaos engineering?"**

A: "Chaos engineering is intentionally breaking things in production to find weaknesses before they cause real outages.

Key principles:
1. **Break on purpose**: Inject failures (kill instances, add latency, inject errors)
2. **In production**: Test real system, not staging
3. **Build confidence**: Prove system handles failures

Example: Netflix Chaos Monkey
- Randomly terminates EC2 instances in production
- Forces engineers to build auto-recovery
- Result: Netflix survives AWS region outages

Benefits:
- Find weaknesses before customers do
- Build confidence in resilience
- Validate DR procedures work

Start small: Staging → Production (1 instance) → Production (many instances)"

**Q: "How would you implement chaos testing?"**

A: "Steps:

1. **Start small**:
   - Week 1: Non-production
   - Week 2: Production, 1 instance
   - Week 3: Increase blast radius

2. **Define experiments**:
   - Latency injection: Add 5s delay to 10% requests
   - Error injection: Return 500 error for 10% requests
   - Instance termination: Kill random instance
   - Network partition: Block region traffic

3. **Set abort criteria**:
   - Error rate >1% → abort
   - Latency >5s → abort
   - Availability <99% → abort

4. **Monitor**:
   - Watch metrics during experiment
   - Alert if abort criteria met
   - Auto-rollback if needed

5. **Learn**:
   - Document findings
   - Fix issues found
   - Re-test to verify fix

Tools: Chaos Monkey (Netflix), Gremlin, AWS FIS, Chaos Toolkit"

**Q: "What are risks of chaos engineering?"**

A: "Risks:

1. **Customer impact**: Chaos causes real outage
   - Mitigation: Small blast radius, abort criteria, off-peak hours

2. **False confidence**: Chaos tests pass, but real failure different
   - Mitigation: Diverse experiments, GameDays, production incidents review

3. **Team burnout**: Constant chaos fatiguing
   - Mitigation: Schedule experiments, not 24/7, rotate responsibilities

4. **Cascading failures**: Chaos triggers unexpected failures
   - Mitigation: Gradual increase, monitor closely, quick rollback

5. **Compliance**: Some industries restrict production testing
   - Mitigation: Test in staging, get approval, document

Best practices:
- Start small (staging first)
- Limit blast radius (1 instance, 10% traffic)
- Define abort criteria (auto-stop if bad)
- Run off-peak (minimize customer impact)
- Get team buy-in (not surprise chaos)"

---

## 📚 Summary

**Chaos Engineering**: Break things on purpose to find weaknesses

**Philosophy**: Prove system handles failures (don't hope)

**Types**: Latency injection, error injection, instance termination, network partition

**Tools**: Chaos Monkey, Gremlin, AWS FIS, Chaos Toolkit

**Best Practice**: Start small, limit blast radius, define abort criteria, monitor, learn 🚀
