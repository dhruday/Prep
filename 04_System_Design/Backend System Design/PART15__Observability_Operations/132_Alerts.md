# 132. Alerts

## 📌 Overview

**Alerts** notify you when something goes wrong.

**Problem**: Issues undetected until users complain ❌

```
Server crashes → No alert → Users see errors → Bad experience
```

**Solution**: Automated alerts ✓

```
CPU > 80% → Alert → Page on-call engineer → Fix before users affected
```

---

## 🎯 Core Concepts

### **1. Alert Definition**

**Alert**: Notification triggered when condition met

**Example**:

```yaml
alert: HighErrorRate
condition: error_rate > 5%
duration: 5 minutes
severity: critical
notify:
  - pagerduty: oncall-team
  - slack: #alerts
```

**When triggered**: Error rate stays >5% for 5 minutes continuously

---

### **2. Alert Severity**

**Critical**: Page on-call immediately (phone call, SMS)
- Service down
- Data loss
- Security breach

**Warning**: Notify (Slack, email), no page
- High latency (p95 > 500ms)
- Disk space low (>70%)
- Cache hit rate low (<80%)

**Info**: Log only, no notification
- Deployment started
- Auto-scaling triggered

---

### **3. Alert States**

**Pending**: Condition met, waiting for duration

```
Error rate: 6% (above threshold)
Duration: 2 minutes (need 5 minutes)
State: PENDING ⏳
```

**Firing**: Alert triggered, notification sent

```
Error rate: 6%
Duration: 5 minutes ✓
State: FIRING 🔥
Notification: Sent to PagerDuty ✓
```

**Resolved**: Condition no longer met

```
Error rate: 2% (below threshold)
State: RESOLVED ✅
Notification: Incident closed
```

---

## 🎯 Alert Rules (Prometheus)

**Prometheus AlertManager**: Handles alerts

### **Basic Alert Rule**

```yaml
# prometheus-rules.yml
groups:
  - name: backend_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          rate(requests_total{status=~"5.."}[5m])
          /
          rate(requests_total[5m])
          > 0.05
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
```

**Explanation**:
- `expr`: PromQL query (error rate)
- `for: 5m`: Must be true for 5 minutes (avoid flapping)
- `labels`: Metadata (route alerts)
- `annotations`: Alert message

---

### **Multiple Alert Rules**

```yaml
groups:
  - name: backend_alerts
    rules:
      # 1. High error rate
      - alert: HighErrorRate
        expr: rate(requests_total{status=~"5.."}[5m]) / rate(requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate: {{ $value | humanizePercentage }}"

      # 2. High latency
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency: {{ $value }}s (threshold: 1s)"

      # 3. High CPU usage
      - alert: HighCPU
        expr: cpu_usage_percent > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU usage: {{ $value }}% (threshold: 80%)"

      # 4. Database connection pool exhausted
      - alert: DatabasePoolExhausted
        expr: database_connections_active / database_connections_max > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "DB pool utilization: {{ $value | humanizePercentage }}"

      # 5. Disk space low
      - alert: DiskSpaceLow
        expr: disk_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk usage: {{ $value }}% (threshold: 80%)"
```

---

## 🎯 AlertManager (Routing & Notifications)

**AlertManager**: Receives alerts from Prometheus, routes to receivers

### **Configuration**

```yaml
# alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/XXX'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

# Routing tree
route:
  receiver: 'default'
  group_by: ['alertname', 'severity']
  group_wait: 30s        # Wait before sending (batch alerts)
  group_interval: 5m     # Wait before sending new alerts in group
  repeat_interval: 4h    # Re-send alert every 4h if still firing

  routes:
    # Critical alerts → PagerDuty (page on-call)
    - match:
        severity: critical
      receiver: pagerduty
      continue: true  # Also send to Slack

    # Critical alerts → Slack
    - match:
        severity: critical
      receiver: slack-critical

    # Warning alerts → Slack only
    - match:
        severity: warning
      receiver: slack-warnings

# Receivers
receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#incidents'
        color: 'danger'
        title: '🔥 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts'
        color: 'warning'
        title: '⚠️ WARNING: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

### **Alert Flow**

```
Prometheus detects condition
  → Sends alert to AlertManager
    → AlertManager groups alerts (by severity)
      → Routes to receiver
        → Critical → PagerDuty (page) + Slack
        → Warning → Slack only
```

---

## 🎯 Notification Channels

### **1. PagerDuty** (On-call paging)

**Use case**: Critical alerts (page on-call engineer)

**Features**:
- Phone call, SMS, push notification
- Escalation policy (if no response in 5 min, escalate to manager)
- On-call schedule (who's on-call this week?)
- Incident management (acknowledge, resolve)

**Example flow**:

```
Alert: HighErrorRate (critical)
  → PagerDuty creates incident
    → Calls on-call engineer (John)
      → John acknowledges (working on it)
        → John resolves (fixed)
          → PagerDuty closes incident
```

---

### **2. Slack** (Team notifications)

**Use case**: Warnings, informational alerts

**Features**:
- Channel routing (#incidents, #alerts)
- Color coding (red = critical, yellow = warning)
- Buttons (acknowledge, resolve, view logs)

**Example message**:

```
🔥 CRITICAL: HighErrorRate
Error rate: 7.2% (threshold: 5%)
Service: orders-service
Duration: 5 minutes

[View Grafana] [View Logs] [Acknowledge]
```

---

### **3. Email**

**Use case**: Non-urgent alerts, digest

**Example**:

```
Subject: [WARNING] HighLatency - orders-service

Alert: HighLatency
Severity: warning
Service: orders-service
p95 latency: 1.2s (threshold: 1.0s)
Duration: 5 minutes

View dashboard: https://grafana/d/orders
```

---

### **4. Webhooks** (Custom integrations)

**Use case**: Integrate with internal tools

**Example**: Send to internal incident management system

```yaml
receivers:
  - name: 'webhook'
    webhook_configs:
      - url: 'https://internal-tool.com/api/alerts'
        send_resolved: true
```

**Webhook payload**:

```json
{
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighErrorRate",
        "severity": "critical",
        "service": "orders"
      },
      "annotations": {
        "summary": "Error rate: 7.2%"
      },
      "startsAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## 🎯 Alert Best Practices

### **1. Avoid Alert Fatigue**

**Problem**: Too many alerts → Ignored ❌

```
Every hour:
- HighCPU (warning)
- SlowQuery (warning)
- CacheMissRate (info)
- DeploymentStarted (info)

Result: 100 alerts/day → Ignored → Miss critical alerts
```

**Solution**: Only alert on actionable issues ✓

**Rules**:
- **Critical**: Service down, data loss (page immediately)
- **Warning**: Degraded performance (Slack, investigate within 1 hour)
- **Info**: Log only (no notification)

**Before**:

```yaml
- alert: HighCPU
  expr: cpu_usage > 70  # Too sensitive ❌
  severity: warning
```

**After**:

```yaml
- alert: HighCPU
  expr: cpu_usage > 85  # Higher threshold ✓
  for: 10m              # Sustained for 10 minutes ✓
  severity: warning
```

---

### **2. Set Appropriate Thresholds**

**Too low**: False positives (alert fatigue)

```yaml
- alert: HighErrorRate
  expr: error_rate > 0.001  # 0.1% ❌ Too sensitive
```

**Too high**: Miss real issues

```yaml
- alert: HighErrorRate
  expr: error_rate > 0.5  # 50% ❌ Too late (users already affected)
```

**Optimal**: Based on SLOs

```yaml
- alert: HighErrorRate
  expr: error_rate > 0.05  # 5% ✓ (SLO: 95% success rate)
  for: 5m
```

---

### **3. Use `for` Duration**

**Problem**: Flapping alerts (spike for 10 seconds → resolved)

```yaml
# Without duration ❌
- alert: HighLatency
  expr: p95_latency > 1s  # Triggers on every spike

# With duration ✓
- alert: HighLatency
  expr: p95_latency > 1s
  for: 5m  # Must be sustained for 5 minutes
```

---

### **4. Group Alerts**

**Problem**: 10 servers down → 10 separate alerts

```
Alert: ServerDown (server-1)
Alert: ServerDown (server-2)
...
Alert: ServerDown (server-10)
```

**Solution**: Group by cluster

```yaml
# AlertManager
route:
  group_by: ['alertname', 'cluster']
  group_wait: 30s
```

**Result**: Single alert

```
Alert: ServerDown
Affected servers: 10 (cluster: us-east-1)
```

---

### **5. Provide Context**

**Bad annotation**:

```yaml
annotations:
  summary: "Alert triggered"  # Not helpful ❌
```

**Good annotation**:

```yaml
annotations:
  summary: "Error rate: {{ $value | humanizePercentage }} (threshold: 5%)"
  description: |
    Service: {{ $labels.service }}
    Error rate: {{ $value | humanizePercentage }}
    Threshold: 5%
    Runbook: https://wiki.com/runbooks/high-error-rate
    Dashboard: https://grafana.com/d/{{ $labels.service }}
```

---

## 🎯 Runbooks

**Runbook**: Step-by-step guide to resolve alert

**Example**:

```markdown
# Runbook: HighErrorRate

## Symptoms
- Error rate > 5%
- Users seeing 500 errors

## Investigation
1. Check Grafana dashboard: https://grafana/d/orders
2. Check logs: `kubectl logs -f deployment/orders-service --tail=100`
3. Check recent deployments: `kubectl rollout history deployment/orders-service`

## Common Causes
1. **Recent deployment** → Rollback: `kubectl rollout undo deployment/orders-service`
2. **Database down** → Check database health: `mysql -e "SELECT 1"`
3. **Third-party API down** → Check status page: https://status.stripe.com

## Escalation
If not resolved in 15 minutes, escalate to:
- Slack: @backend-team
- Phone: On-call manager (555-1234)
```

---

## 🎯 Real-World Examples

### **1. Netflix**

**Alert strategy**: Prioritize alerts by impact

**Tiers**:
- **Tier 0** (critical): Streaming broken → Page immediately
- **Tier 1** (high): Recommendations slow → Slack, fix within 1 hour
- **Tier 2** (medium): Cache miss rate high → Log, fix next business day

**Example alert**:

```yaml
- alert: StreamingDown
  expr: stream_start_success_rate < 0.95  # <95% success
  for: 2m
  labels:
    severity: critical
    tier: 0
  annotations:
    summary: "Streaming success rate: {{ $value | humanizePercentage }}"
    runbook: "https://wiki.netflix.com/streaming-down"
```

---

### **2. Uber**

**Alert strategy**: Automated mitigation

**Example**: High error rate → Auto-rollback deployment

```yaml
- alert: HighErrorRate
  expr: error_rate > 0.05
  for: 5m
  labels:
    severity: critical
    automate: rollback
  annotations:
    summary: "Error rate: {{ $value | humanizePercentage }}"
    action: "Auto-rollback deployment"
```

**Webhook** triggers rollback script:

```python
# Receives alert webhook
@app.route('/webhook/alert', methods=['POST'])
def handle_alert():
    alert = request.json['alerts'][0]
    
    if alert['labels'].get('automate') == 'rollback':
        # Auto-rollback last deployment
        subprocess.run(['kubectl', 'rollout', 'undo', 'deployment/orders-service'])
        
        # Notify team
        slack.send_message('#incidents', 'Auto-rollback triggered for orders-service')
    
    return '', 200
```

---

### **3. AWS**

**CloudWatch Alarms**:

```python
import boto3

cloudwatch = boto3.client('cloudwatch')

# Create alarm: High CPU
cloudwatch.put_metric_alarm(
    AlarmName='HighCPU',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=2,  # 2 consecutive periods
    MetricName='CPUUtilization',
    Namespace='AWS/EC2',
    Period=300,  # 5 minutes
    Statistic='Average',
    Threshold=80.0,
    ActionsEnabled=True,
    AlarmActions=[
        'arn:aws:sns:us-east-1:123456789:alert-topic'  # SNS topic → Email, SMS
    ],
    AlarmDescription='Alert if CPU > 80% for 10 minutes',
    Dimensions=[
        {'Name': 'InstanceId', 'Value': 'i-1234567890abcdef'}
    ]
)
```

---

## 🎯 Alert vs Log vs Metric

**Metric**: Numerical measurement (CPU = 75%)

**Log**: Discrete event (User 123 logged in)

**Alert**: Notification when condition met (CPU > 80% for 10 min → Alert)

**Example**:

```
Metric: cpu_usage_percent = 85
↓
Alert rule: IF cpu_usage > 80 FOR 10 minutes
↓
Alert: HighCPU (severity: warning)
↓
Notification: Slack #alerts
↓
Log: "Alert HighCPU fired at 2024-01-15T10:00:00Z"
```

---

## 🎯 Alerting on SLOs

**SLO**: Service Level Objective (target: 99.9% uptime)

**Error budget**: Allowed downtime (0.1% = 43 minutes/month)

### **Error Budget Alert**

```yaml
- alert: ErrorBudgetExhausted
  expr: |
    # Error budget remaining (percentage)
    (1 - (sum(rate(requests_total{status=~"5.."}[30d])) / sum(rate(requests_total[30d])))) 
    < 0.001  # <0.1% remaining
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Error budget almost exhausted: {{ $value | humanizePercentage }} remaining"
    description: "Stop all deployments, focus on stability"
```

**Action**: Stop feature development, focus on reliability

---

### **Burn Rate Alert** (Google SRE)

**Burn rate**: How fast error budget is consumed

**Fast burn** (1 hour): Exhausts 5% of monthly budget

```yaml
- alert: FastBurnRate
  expr: |
    # Error rate in last 1 hour vs SLO
    rate(requests_total{status=~"5.."}[1h]) / rate(requests_total[1h])
    > 14.4 * 0.001  # 14.4x SLO (fast burn)
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Fast burn rate detected (exhausts 5% budget in 1 hour)"
```

**Slow burn** (6 hours): Exhausts 10% of monthly budget

```yaml
- alert: SlowBurnRate
  expr: |
    rate(requests_total{status=~"5.."}[6h]) / rate(requests_total[6h])
    > 6 * 0.001  # 6x SLO (slow burn)
  for: 30m
  labels:
    severity: warning
```

---

## ✅ Summary Checklist

**Alert Definition**:
- [ ] Clear condition (error_rate > 5%)
- [ ] Appropriate duration (for: 5m)
- [ ] Correct severity (critical vs warning)
- [ ] Actionable (can fix)

**Alert Routing**:
- [ ] Critical → PagerDuty (page on-call)
- [ ] Warning → Slack (notify team)
- [ ] Grouped (avoid 100 alerts for same issue)

**Alert Message**:
- [ ] Context (service, metric value, threshold)
- [ ] Runbook link (how to fix)
- [ ] Dashboard link (investigate)

**Alert Tuning**:
- [ ] Avoid alert fatigue (only actionable alerts)
- [ ] Set appropriate thresholds (based on SLOs)
- [ ] Prevent flapping (use `for` duration)

---

## 🎓 Interview Tips

**Q: "How do you prevent alert fatigue?"**

A: "Alert fatigue happens when too many alerts are triggered, causing teams to ignore them.

**Strategies**:

1. **Only alert on actionable issues**:
- Critical: Page immediately (service down)
- Warning: Slack, fix within 1 hour (high latency)
- Info: Log only (deployment started)

2. **Set appropriate thresholds** (based on SLOs):
```yaml
# Bad: Too sensitive ❌
- alert: HighErrorRate
  expr: error_rate > 0.001  # 0.1%

# Good: Based on SLO ✓
- alert: HighErrorRate
  expr: error_rate > 0.05  # 5% (SLO: 95% success)
```

3. **Use duration** (avoid flapping):
```yaml
for: 5m  # Must be sustained for 5 minutes
```

4. **Group alerts** (avoid duplicates):
```yaml
group_by: ['alertname', 'cluster']
# 10 servers down → 1 grouped alert
```

5. **Provide context** (runbook, dashboard):
```yaml
annotations:
  summary: 'Error rate: 7%'
  runbook: 'https://wiki.com/high-error-rate'
  dashboard: 'https://grafana.com/d/orders'
```

Real-world: Netflix prioritizes alerts by impact (Tier 0 = streaming down, page immediately; Tier 2 = cache miss rate, fix next day)"

**Q: "What's the difference between a critical and warning alert?"**

A: "
**Critical** (page on-call immediately):
- Service completely down (all requests failing)
- Data loss (database corruption)
- Security breach (unauthorized access)
- SLO breach imminent (error budget exhausted)

Notification: PagerDuty phone call + SMS + Slack
Response time: Immediate (drop everything)

**Warning** (notify team, no page):
- Degraded performance (p95 latency high but not failing)
- Resource usage high (CPU 85% but not 100%)
- Dependency slow (third-party API latency high)
- Approaching threshold (error budget 50% consumed)

Notification: Slack only
Response time: Within 1 hour (business hours)

**Example**:

Critical:
```yaml
- alert: ServiceDown
  expr: up == 0  # Service completely down
  severity: critical
  notify: pagerduty  # Page on-call
```

Warning:
```yaml
- alert: HighLatency
  expr: p95_latency > 1s  # Slow but working
  severity: warning
  notify: slack  # Team notification
```

Real-world: Uber has 3 tiers (critical = page, high = Slack + fix in 1h, medium = log + fix next day)"

**Q: "How do you design an effective runbook?"**

A: "A runbook is a step-by-step guide to resolve an alert.

**Structure**:

1. **Symptoms** (what users see):
- Error rate > 5%
- Users seeing 500 errors

2. **Investigation** (how to debug):
- Check dashboard: [link]
- Check logs: `kubectl logs -f deployment/orders`
- Check recent deployments: `kubectl rollout history`

3. **Common causes** (likely root causes):
- Recent deployment → Rollback
- Database down → Check DB health
- Third-party API down → Check status page

4. **Resolution steps**:
- If recent deployment: `kubectl rollout undo`
- If database down: Restart DB, check connections
- If API down: Enable circuit breaker, use fallback

5. **Escalation** (if can't resolve):
- If not fixed in 15 min: Slack @backend-team
- If not fixed in 30 min: Call on-call manager

**Example runbook**:
```markdown
# HighErrorRate

## Symptoms
- Error rate: 7% (threshold: 5%)
- Users seeing 'Service Unavailable'

## Investigation
1. Dashboard: https://grafana.com/d/orders
2. Logs: `grep 'ERROR' /var/log/app.log | tail -100`
3. Recent deploys: Check last 1 hour

## Common Causes
1. Bad deployment → Rollback
2. Database overloaded → Check connections (should be <80%)
3. Stripe API down → Check https://status.stripe.com

## Resolution
If deployment: `kubectl rollout undo deployment/orders`
If database: Increase connection pool or add read replica
If Stripe down: Enable circuit breaker (stops retries)

## Escalation
15 min: @backend-team
30 min: Call manager (555-1234)
```

Real-world: Netflix has automated runbooks (scripts triggered by alerts, auto-remediation)"

---

## 📚 Summary

**Alerts**: Notify when condition met (error_rate > 5% for 5 min)

**Severity**: Critical (page), Warning (Slack), Info (log)

**Notification**: PagerDuty (on-call), Slack (team), Email (digest)

**Best Practices**: Avoid alert fatigue (only actionable), set thresholds (SLO-based), group alerts, provide context

**Tools**: Prometheus AlertManager, PagerDuty, Slack

**Runbooks**: Step-by-step guide to resolve alerts 🚀

