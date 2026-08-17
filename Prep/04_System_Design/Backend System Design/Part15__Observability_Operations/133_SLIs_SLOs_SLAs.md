# 133. SLIs, SLOs & SLAs

## 📌 Overview

**SLI** (Service Level Indicator): Measurable metric

**SLO** (Service Level Objective): Target for SLI

**SLA** (Service Level Agreement): Contract with customers (legal)

**Example**:

```
SLI: Availability = 99.95% (measured)
SLO: Availability ≥ 99.9% (internal target)
SLA: Availability ≥ 99.5% (contract with customers, penalty if missed)
```

---

## 🎯 SLI (Service Level Indicator)

**Definition**: Quantitative measure of service level

### **Common SLIs**

**1. Availability** (uptime)

```
Availability = (Successful requests / Total requests) × 100%

Example:
Total requests: 1,000,000
Failed requests: 100 (5xx errors)
Availability: (999,900 / 1,000,000) × 100% = 99.99%
```

**2. Latency** (response time)

```
Latency (p95) = 95th percentile response time

Example:
p50 (median): 50ms
p95: 200ms  ← 95% of requests faster than 200ms
p99: 500ms
```

**3. Error Rate**

```
Error Rate = (Failed requests / Total requests) × 100%

Example:
Total: 1,000,000
Errors: 5,000 (5xx)
Error Rate: (5,000 / 1,000,000) × 100% = 0.5%
```

**4. Throughput** (requests per second)

```
Throughput = Total requests / Time period

Example:
Requests in 1 hour: 3,600,000
Throughput: 3,600,000 / 3600 = 1,000 req/sec
```

**5. Durability** (data retention)

```
Durability = (Data retained / Total data) × 100%

Example (S3):
Objects stored: 1,000,000,000
Objects lost: 10
Durability: 99.9999999% (11 nines)
```

---

## 🎯 SLO (Service Level Objective)

**Definition**: Internal target for SLI

**Example**:

```
SLI: Availability
SLO: ≥ 99.9% availability per month

Translation:
99.9% = 0.999
Downtime allowed: (1 - 0.999) = 0.001 = 0.1%
0.1% of 30 days = 0.1% × 30 × 24 × 60 = 43.2 minutes/month
```

### **Common SLOs**

**1. Availability SLO**

```
SLO: 99.9% availability per month
= 43.2 minutes downtime allowed per month
```

**2. Latency SLO**

```
SLO: p95 latency < 200ms
= 95% of requests must complete in <200ms
```

**3. Error Rate SLO**

```
SLO: Error rate < 1%
= 99% of requests must succeed
```

**4. Multiple SLOs** (typical service)

```
Service: Orders API
SLOs:
- Availability: ≥ 99.9% (43 min downtime/month)
- Latency: p95 < 200ms (95% requests fast)
- Error rate: < 1% (99% success)
- Throughput: ≥ 10,000 req/sec (capacity)
```

---

## 🎯 Error Budget

**Definition**: Allowed downtime before SLO breach

**Formula**:

```
Error Budget = 100% - SLO

Example:
SLO: 99.9% availability
Error Budget: 100% - 99.9% = 0.1%
= 43.2 minutes downtime per month
```

### **Using Error Budget**

**Scenario**: Service has 99.9% SLO (43.2 min/month budget)

**Week 1**: 10 minutes downtime (23% budget consumed)

**Week 2**: 20 minutes downtime (46% budget consumed, 69% total)

**Week 3**: 15 minutes downtime (35% budget consumed, **104% total ❌**)

**Result**: SLO breached, **stop deployments** until next month

---

### **Error Budget Policy**

**Budget remaining > 50%**: Aggressive (deploy frequently)

```
Error budget: 43 min/month
Used: 10 min (23%)
Remaining: 33 min (77%)

Policy: Deploy 10x/day ✓
       Try risky features ✓
       Experiment with new architecture ✓
```

**Budget remaining < 50%**: Conservative (slow down)

```
Error budget: 43 min/month
Used: 30 min (70%)
Remaining: 13 min (30%)

Policy: Deploy 1x/day
       Only critical fixes
       Increase testing
```

**Budget exhausted**: Freeze (stop all deployments)

```
Error budget: 43 min/month
Used: 50 min (116%) ❌
Remaining: -7 min

Policy: FREEZE all deployments ❌
       Fix reliability issues ✓
       Improve monitoring ✓
       Wait until next month to resume
```

---

## 🎯 SLA (Service Level Agreement)

**Definition**: Legal contract with customers (penalties if missed)

**Difference from SLO**:

```
SLO: Internal target (99.9% availability)
     No penalty, but team focuses on reliability

SLA: Customer contract (99.5% availability)
     Penalty if missed (refund, credits)
```

**Example SLA** (AWS EC2):

```
SLA: 99.99% availability per region per month

Availability    Penalty (Service Credit)
-----------     ------------------------
< 99.99%        10% of monthly bill
< 99.0%         25% of monthly bill
< 95.0%         100% of monthly bill (full refund)

Example:
Monthly bill: $10,000
Availability: 99.0% (below 99.99%)
Penalty: 10% × $10,000 = $1,000 credit
```

---

### **Why SLA < SLO?**

**SLO is stricter** (buffer to avoid SLA penalties)

```
SLO: 99.9% availability (internal target)
SLA: 99.5% availability (customer contract)

Buffer: 99.9% - 99.5% = 0.4% = 2.8 hours/month

Reason:
- If SLO breached (99.8%), still meet SLA (99.5%) ✓
- No customer penalty
- Team has time to fix before SLA breach
```

**Example**:

```
Month 1:
Availability: 99.7%
SLO (99.9%): Breached ❌ (internal alarm, team fixes)
SLA (99.5%): Met ✓ (no customer penalty)

Month 2:
Availability: 99.95%
SLO (99.9%): Met ✓
SLA (99.5%): Met ✓
```

---

## 🎯 Measuring SLIs

### **Availability** (Prometheus)

```promql
# Availability (successful requests / total requests)
sum(rate(requests_total{status!~"5.."}[30d]))
/
sum(rate(requests_total[30d]))

# Example result: 0.9995 = 99.95% availability
```

**Over 30 days**:

```
Total requests: 100,000,000
Failed requests (5xx): 50,000
Availability: (100,000,000 - 50,000) / 100,000,000 = 0.9995 = 99.95% ✓
```

---

### **Latency** (Prometheus)

```promql
# p95 latency (95th percentile)
histogram_quantile(0.95,
  rate(request_duration_seconds_bucket[5m])
)

# Example result: 0.18 = 180ms (p95)
```

**SLO check**: p95 latency < 200ms

```
p95: 180ms < 200ms ✓ (SLO met)
```

---

### **Error Rate** (Prometheus)

```promql
# Error rate (5xx errors / total requests)
sum(rate(requests_total{status=~"5.."}[30d]))
/
sum(rate(requests_total[30d]))

# Example result: 0.005 = 0.5% error rate
```

**SLO check**: Error rate < 1%

```
Error rate: 0.5% < 1% ✓ (SLO met)
```

---

## 🎯 Alerting on SLOs

### **Burn Rate** (Google SRE)

**Problem**: SLO measured over 30 days, but want early warning

**Solution**: Burn rate alerts

**Burn rate**: How fast error budget is consumed

**Fast burn** (1 hour): Consumes 5% of monthly budget

```promql
# Fast burn alert (1 hour window)
(
  1 - (
    sum(rate(requests_total{status!~"5.."}[1h]))
    /
    sum(rate(requests_total[1h]))
  )
)
> (1 - 0.999) * 14.4  # 14.4x SLO

# If triggered: Error rate so high, exhausts 5% of monthly budget in 1 hour
```

**Action**: Page on-call immediately (critical)

---

**Slow burn** (6 hours): Consumes 10% of monthly budget

```promql
# Slow burn alert (6 hour window)
(
  1 - (
    sum(rate(requests_total{status!~"5.."}[6h]))
    /
    sum(rate(requests_total[6h]))
  )
)
> (1 - 0.999) * 6  # 6x SLO
```

**Action**: Notify team (warning), investigate

---

### **Error Budget Alert**

```promql
# Alert when 80% of error budget consumed
(
  1 - (
    sum(rate(requests_total{status!~"5.."}[30d]))
    /
    sum(rate(requests_total[30d]))
  )
)
> (1 - 0.999) * 0.8  # 80% of error budget

# Example:
# SLO: 99.9% (0.1% budget)
# Current: 99.92% (0.08% errors)
# Budget consumed: 0.08% / 0.1% = 80% ⚠️
```

**Action**: Slow down deployments, focus on stability

---

## 🎯 Real-World Examples

### **1. Google (SRE Book)**

**Service**: Search

**SLOs**:
- Availability: 99.99% (52 minutes downtime/year)
- Latency: p99 < 100ms (99% searches fast)

**Error budget**: 52 minutes/year

**Policy**:
- Budget remaining > 50%: Deploy 100x/day
- Budget remaining < 50%: Deploy 10x/day
- Budget exhausted: Freeze all changes

**Result**: Balances innovation (new features) vs reliability (uptime)

---

### **2. AWS (SLA)**

**Service**: EC2

**SLA**: 99.99% availability per region per month

**Penalty** (service credits):
- 99.99% - 99.0%: 10% credit
- < 99.0% - 95.0%: 25% credit
- < 95.0%: 100% credit (full refund)

**Example**:
```
Customer bill: $50,000/month
Availability: 99.5% (below 99.99%)
Credit: 10% × $50,000 = $5,000
```

**Why SLA < SLO**:
- SLO (internal): 99.995% (higher target)
- SLA (customer): 99.99% (buffer)
- If SLO missed but SLA met: No penalty, team fixes internally

---

### **3. Stripe (API SLA)**

**Service**: Payments API

**SLOs** (internal):
- Availability: 99.99% (52 min downtime/year)
- Latency: p99 < 500ms
- Error rate: < 0.1%

**SLA** (customer contract):
- Availability: 99.95% (4 hours downtime/year)
- No latency SLA (internal SLO only)

**Penalty**: If availability < 99.95%, customers get credits

**Dashboard**: https://status.stripe.com
- Real-time availability (99.98%)
- Incident history (last 90 days)

---

### **4. Netflix**

**Service**: Video Streaming

**SLIs**:
- Stream start success rate (% of plays that start successfully)
- Buffering rate (% of playback time spent buffering)
- Video quality (% of time in HD)

**SLOs**:
- Stream start: 99.5% success (995 out of 1000 plays start)
- Buffering: < 0.1% of playback time
- Video quality: > 90% time in HD

**Error budget**:
- Stream start: 0.5% = 5 failures per 1000 plays
- If exceeded: Stop risky experiments, focus on reliability

**Real-time monitoring**: Every play tracked, alerts if SLO at risk

---

## 🎯 Choosing SLOs

### **Step 1: Identify SLIs**

**Question**: What do users care about?

**Example** (E-commerce API):
- Users care about: Fast checkout, no errors
- SLIs: Latency, error rate, availability

---

### **Step 2: Measure Current Performance**

```promql
# Current p95 latency
histogram_quantile(0.95, rate(request_duration_seconds_bucket[30d]))
# Result: 150ms

# Current error rate
sum(rate(requests_total{status=~"5.."}[30d])) / sum(rate(requests_total[30d]))
# Result: 0.002 = 0.2%

# Current availability
sum(rate(requests_total{status!~"5.."}[30d])) / sum(rate(requests_total[30d]))
# Result: 0.998 = 99.8%
```

---

### **Step 3: Set Achievable SLOs**

**Don't set too high** (unrealistic, expensive)

```
Current: 99.8% availability
SLO: 99.99% ❌ (requires 5x improvement, very expensive)
```

**Don't set too low** (poor user experience)

```
Current: 99.8% availability
SLO: 90% ❌ (73 hours downtime/month, users unhappy)
```

**Optimal**: Slightly above current (achievable, improves over time)

```
Current: 99.8% availability
SLO: 99.9% ✓ (achievable with effort)
```

---

### **Step 4: Communicate SLOs**

**Internal** (engineering team):
- Dashboard: Real-time SLO compliance
- Alerts: Warn when SLO at risk
- Review: Monthly SLO review (met or missed?)

**External** (customers):
- SLA (contract): Lower than SLO (buffer)
- Status page: Real-time availability
- Incident reports: Explain SLA breaches

---

## 🎯 SLO Dashboard (Grafana)

```json
{
  "dashboard": {
    "title": "SLO Dashboard - Orders API",
    "panels": [
      {
        "title": "Availability (SLO: 99.9%)",
        "targets": [
          {
            "expr": "sum(rate(requests_total{status!~\"5..\"}[30d])) / sum(rate(requests_total[30d])) * 100",
            "legendFormat": "Current: {{ value }}%"
          }
        ],
        "thresholds": [
          {"value": 99.9, "color": "green"},  // Above SLO
          {"value": 99.5, "color": "yellow"}, // Below SLO, above SLA
          {"value": 0, "color": "red"}        // Below SLA
        ]
      },
      {
        "title": "Error Budget Remaining (SLO: 99.9% = 0.1% budget)",
        "targets": [
          {
            "expr": "(1 - (sum(rate(requests_total{status=~\"5..\"}[30d])) / sum(rate(requests_total[30d])))) / (1 - 0.999) * 100",
            "legendFormat": "Budget Remaining: {{ value }}%"
          }
        ],
        "thresholds": [
          {"value": 50, "color": "green"},   // >50% remaining
          {"value": 20, "color": "yellow"},  // 20-50% remaining
          {"value": 0, "color": "red"}       // <20% remaining
        ]
      },
      {
        "title": "p95 Latency (SLO: <200ms)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m])) * 1000",
            "legendFormat": "p95: {{ value }}ms"
          }
        ],
        "thresholds": [
          {"value": 200, "color": "red"},    // Above SLO
          {"value": 0, "color": "green"}     // Below SLO
        ]
      }
    ]
  }
}
```

---

## ✅ Best Practices

1. **SLOs based on user experience** (what users care about)
2. **Measure over time** (30 days, not 5 minutes)
3. **Set achievable SLOs** (slightly above current performance)
4. **Use error budgets** (balance innovation vs reliability)
5. **SLA < SLO** (buffer to avoid penalties)
6. **Alert on burn rate** (early warning before SLO breach)
7. **Review monthly** (did we meet SLOs? Adjust if needed)
8. **Communicate SLOs** (dashboard, status page, incident reports)

---

## 🎓 Interview Tips

**Q: "What's the difference between SLI, SLO, and SLA?"**

A: "
**SLI (Service Level Indicator)**: Measurable metric
- Example: Availability = 99.95% (measured)

**SLO (Service Level Objective)**: Internal target
- Example: Availability ≥ 99.9% (team goal)
- No penalty if missed, but team focuses on reliability

**SLA (Service Level Agreement)**: Customer contract
- Example: Availability ≥ 99.5% (legal contract)
- Penalty if missed (refund, credits)

**Relationship**:
```
SLI (measured) ≥ SLO (internal target) ≥ SLA (customer contract)
99.95%            99.9%                   99.5%
```

**Why SLA < SLO?**
- Buffer to avoid penalties
- If SLO missed but SLA met: No penalty, team fixes internally

**Real-world**:
- AWS EC2 SLA: 99.99% (penalty: 10-100% credit)
- Google Search SLO: 99.99% (internal target, stricter than SLA)"

**Q: "What is an error budget and how do you use it?"**

A: "Error budget is the allowed downtime before SLO breach.

**Formula**:
```
Error Budget = 100% - SLO

Example:
SLO: 99.9% availability
Error Budget: 100% - 99.9% = 0.1% = 43.2 minutes/month
```

**Usage**:

1. **Track budget consumption**:
```
Week 1: 10 min downtime (23% consumed)
Week 2: 20 min downtime (46% consumed, 69% total)
Week 3: 15 min downtime (104% total ❌ SLO breached)
```

2. **Policy based on remaining budget**:
```
Budget > 50%:   Deploy 10x/day, try risky features ✓
Budget < 50%:   Deploy 1x/day, only critical fixes
Budget exhausted: FREEZE all deployments ❌
```

3. **Balances innovation vs reliability**:
- More budget remaining → More experimentation (new features)
- Less budget remaining → More caution (stability)

**Real-world**:
- Google: If error budget exhausted, stop all feature development, focus on reliability until next month
- Netflix: Error budget drives deployment frequency (more budget = more deploys)"

**Q: "How do you choose SLOs for a service?"**

A: "

**Step 1: Identify SLIs** (what users care about):
- E-commerce: Latency, error rate, availability
- Video streaming: Stream start success, buffering rate
- Payments: Transaction success, latency

**Step 2: Measure current performance**:
```promql
# Current p95 latency
histogram_quantile(0.95, rate(request_duration_seconds_bucket[30d]))
Result: 150ms

# Current availability
sum(rate(requests_total{status!~\"5..\"}[30d])) / sum(rate(requests_total[30d]))
Result: 99.8%
```

**Step 3: Set achievable SLOs** (slightly above current):
```
Current: 99.8% availability
SLO: 99.9% ✓ (achievable)
NOT: 99.99% ❌ (too expensive, 5x improvement needed)
NOT: 95% ❌ (too low, poor user experience)
```

**Step 4: Define multiple SLOs**:
```
Service: Orders API
- Availability: ≥ 99.9% (43 min downtime/month)
- Latency: p95 < 200ms (95% requests fast)
- Error rate: < 1% (99% success)
```

**Step 5: Set SLA** (lower than SLO, buffer):
```
SLO: 99.9% (internal)
SLA: 99.5% (customer contract)
Buffer: 0.4% = 2.8 hours/month (avoid penalties)
```

**Step 6: Review monthly** (adjust if needed):
- Met SLO consistently? Raise it (99.9% → 99.95%)
- Missed SLO frequently? Lower it or improve system

Real-world: Stripe API SLO 99.99%, SLA 99.95% (buffer)"

---

## 📚 Summary

**SLI**: Measurable metric (availability, latency, error rate)

**SLO**: Internal target (99.9% availability, p95 < 200ms)

**SLA**: Customer contract (99.5% availability, penalty if missed)

**Error Budget**: Allowed downtime (100% - SLO = 0.1% = 43 min/month)

**Policy**: Budget remaining > 50% → Deploy often; Budget exhausted → Freeze

**Burn Rate**: Alert early (fast burn = 1 hour window, slow burn = 6 hour window)

**Real-world**: Google SRE (error budget drives deployment frequency), AWS SLA (99.99% EC2), Stripe (99.95% SLA) 🚀

