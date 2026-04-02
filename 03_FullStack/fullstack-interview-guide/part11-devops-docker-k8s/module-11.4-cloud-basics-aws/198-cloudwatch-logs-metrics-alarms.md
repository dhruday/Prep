# CloudWatch — Logs, Metrics, and Alarms
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **CloudWatch Logs**: managed log ingestion service; logs organised into Log Groups (per service/application) then Log Streams (per pod/instance/execution); no file access to servers needed — all logs visible in the console or queryable via Log Insights; retention policies set per Log Group (default: never expire — costs money; set 30-90 days for most workloads, 1 year for compliance)
- **CloudWatch Metrics**: time-series numerical data points — CPU percentage, request count, error count, latency in milliseconds; AWS services automatically publish metrics (EC2 CPUUtilization, RDS FreeStorageSpace, ALB HTTPCode_ELB_5XX_Count); you publish custom metrics from your application (order processing time, payment queue depth, cache hit rate)
- **CloudWatch Alarms**: watch a single metric over a time window and transition between OK / ALARM / INSUFFICIENT_DATA states; alarm actions: publish to SNS → triggers email, PagerDuty, Slack webhook; invoke Lambda; trigger Auto Scaling policy; Composite Alarms combine multiple alarms with AND/OR logic (alert only when CPU is high AND memory is high simultaneously)
- **CloudWatch Log Insights**: SQL-like query language for your logs; runs across all Log Streams in a Log Group simultaneously; no log aggregation setup needed; query by time range, filter by fields, count, group, sort; essential for production debugging without SSH access to pods
- **Container Insights on EKS**: installs as a DaemonSet (CloudWatch agent + Fluent Bit); collects pod CPU, memory, network I/O, disk I/O per Deployment/namespace; visualised in pre-built CloudWatch dashboards; enables alarms on per-pod metrics
- **EMF (Embedded Metrics Format)**: write metric data as structured JSON log lines; CloudWatch automatically parses and publishes them as proper metrics with dimensions; no separate PutMetricData API calls; free vs PutMetricData which bills per API call
- 🆕 **Gap topic for Hruday**: "I used Azure Monitor at SAP (equivalent service). I'm bridging to CloudWatch specifics — Log Insights queries, Container Insights for EKS, and Spring Boot structured logging to CloudWatch."

---

## 1. One-Line Definition
Amazon CloudWatch is AWS's managed observability platform — logs are stored and queried via Log Groups and Log Insights, metrics track numerical time-series data from AWS services and custom application instrumentation, and Alarms trigger automated responses (notifications, scaling, rollbacks) when metrics cross defined thresholds.

---

## 2. The Problem It Solves

In a containerised microservices architecture, the old debugging approach — SSH to the server, tail the log file — doesn't work. Pods are ephemeral; they can be scheduled on any node, can restart and lose their local filesystem, and there may be 50 pods of the same service spread across a cluster. You need log centralisation: all pod logs flowing to one place, queryable by time range and field, retainable for audit purposes, without managing log aggregation infrastructure (Elasticsearch, Logstash, Kibana stack).

CloudWatch Logs provides that without infrastructure. All pod stdout/stderr flows to CloudWatch via a log shipping agent (Fluent Bit DaemonSet on EKS); you query all instances of the payment service's logs from a single Log Insights query regardless of how many pods exist.

The second problem: **signals for automated action**. You don't want to manually watch dashboards at 3am waiting for the payment API error rate to spike. CloudWatch Alarms watch metrics continuously; when error rate exceeds 5% for 2 consecutive 1-minute evaluation periods, they notify an on-call engineer via PagerDuty and trigger an automatic rollback. Alerts without pages, automatic remediation without human intervention.

The third problem: **correlating infrastructure and application metrics**. AWS services publish CloudWatch metrics automatically — RDS publishes DatabaseConnections, ALB publishes TargetResponseTime and 5xx counts. Your application should publish custom metrics for business events (payment success rate, order placement latency). CloudWatch puts both on the same platform, enabling dashboards that correlate infrastructure saturation with application behaviour.

---

## 3. How It Works Internally

### Log Architecture on EKS

```
Spring Boot pod (stdout/stderr)
     │
     │ Container runtime captures stdout/stderr
     │ Written to node-level JSON log file at:
     │ /var/log/containers/<pod-name>_<namespace>_<container-name><hash>.log
     │
     ▼
Fluent Bit DaemonSet (runs on every EKS node)
     │ Reads from /var/log/containers/*
     │ Parses JSON log format (requires logstash-logback-encoder in Spring Boot)
     │ Optionally enriches with Kubernetes metadata: pod name, namespace, deployment, node
     │ Buffers and batches (efficient API usage)
     │
     ▼
CloudWatch Logs API (PutLogEvents)
     │
     ▼
Log Group: /eks/payment-platform-prod/containers
     ├── Log Stream: payment-service/payment-service-7d9b8f-abc12   (one per pod)
     ├── Log Stream: payment-service/payment-service-7d9b8f-xyz34
     ├── Log Stream: user-service/user-service-abc-111
     └── Log Stream: ...

Query all streams simultaneously with Log Insights:
     fields @timestamp, level, message, traceId, userId
     | filter level = "ERROR"
     | filter @logStream like /payment-service/
     | sort @timestamp desc
     | limit 100
```

### Metrics Architecture

```
AWS native metrics (free, published automatically):
  ├── EC2/EKS nodes: CPUUtilization, NetworkIn/Out, DiskReadBytes
  ├── RDS: CPUUtilization, FreeStorageSpace, DatabaseConnections, ReadLatency
  ├── ALB: RequestCount, HTTPCode_ELB_5XX_Count, TargetResponseTime
  ├── Lambda: Invocations, Errors, Duration, ConcurrentExecutions, InitDuration
  └── SQS: ApproximateNumberOfMessagesVisible (queue depth), NumberOfMessagesSent

Custom application metrics (published by your code):
  Option A — PutMetricData API (1 API call = 1 metric point = $0.01/10,000 calls):
    cloudWatch.putMetricData(PutMetricDataRequest.builder()
      .namespace("PaymentPlatform/Prod")
      .metricData(MetricDatum.builder()
        .metricName("PaymentSuccessRate")
        .value(successRate)
        .unit(StandardUnit.PERCENT)
        .timestamp(Instant.now())
        .build())
      .build());
  
  Option B — EMF (Embedded Metrics Format, preferred — no API call cost):
    Log a structured JSON line following EMF spec:
    {
      "_aws": {
        "Timestamp": 1234567890000,
        "CloudWatchMetrics": [{
          "Namespace": "PaymentPlatform/Prod",
          "Dimensions": [["ServiceName", "Environment"]],
          "Metrics": [{"Name": "PaymentSuccessRate", "Unit": "Percent"}]
        }]
      },
      "ServiceName": "payment-service",
      "Environment": "prod",
      "PaymentSuccessRate": 98.7
    }
    CloudWatch Logs agent detects EMF format → publishes as metric automatically
```

### Alarm State Machine

```
Alarm states:
  OK              : metric within threshold
  ALARM           : metric outside threshold for defined consecutive evaluation periods
  INSUFFICIENT_DATA: not enough data points (just created, or metric not being published)

Alarm transition:
  Metric = ALB 5xx error count
  Threshold = > 10 errors
  Evaluation period = 1 minute
  Consecutive periods = 2
  
  Minute 1: 3 errors → OK
  Minute 2: 12 errors → (1 of 2 breach periods)
  Minute 3: 15 errors → (2 of 2) → transitions to ALARM → SNS notification fired
  Minute 4: 2 errors → (1 breach period; consecutive interrupted) → waiting
  Minute 5: 1 error → consecutive breach broken → transitions back to OK → OK notification fired

Alarm actions on ALARM state:
  SNS topic → Lambda subscription → PagerDuty / Slack webhook
  SNS topic → Email subscription → on-call engineer
  EC2 Auto Scaling → scale out (+2 instances)
  Application Auto Scaling → EKS HPA trigger (via KEDA for custom metrics)
  EC2 action → stop/reboot/terminate instance (for self-healing infra)

Composite Alarm (AND logic example):
  Alarm A: PaymentService_CPU > 80% for 5 minutes
  Alarm B: PaymentService_Memory > 85% for 5 minutes
  
  CompositeAlarm: ALARM when A AND B are both in ALARM state
  Single notification — avoids alert fatigue when only one resource is spiking
```

---

## 4. The Code

### Wrong Way — Unstructured Logging, Manual Parsing
```java
// ❌ WRONG — plain text logging with unstructured format
@Service
public class PaymentService {
    
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    
    public PaymentResult processPayment(PaymentRequest request) {
        // ❌ Unstructured log — cannot be reliably parsed by CloudWatch Log Insights
        log.info("Processing payment for user " + request.getUserId() + 
                 " amount " + request.getAmount());  // String concatenation is inefficient anyway
        
        try {
            PaymentResult result = gateway.charge(request);
            // ❌ Can't filter these by transaction ID, amount, status in Log Insights
            log.info("Payment successful: " + result.getTransactionId());
            return result;
        } catch (Exception e) {
            // ❌ Exception goes to log but no structured fields — hard to alert on
            log.error("Payment failed: " + e.getMessage());
            throw e;
        }
    }
}
```

> **Why this fails:** Log Insights can only filter on exact string matches or regex for plain text logs. "Processing payment for user 12345 amount 5000.00" is impossible to query by amount range, by userId, or by correlation with other service logs via a traceId. When payment errors spike at 3am, you need to query `filter status = "FAILED" | stats count(*) by errorCode` — which requires structured JSON. Structured logging is mandatory for any production CloudWatch setup.

### Right Way — Structured JSON Logging with Correlation
```xml
<!-- pom.xml -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

```xml
<!-- logback-spring.xml — outputs JSON to stdout for CloudWatch (via Fluent Bit) -->
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <springProfile name="production">
        <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <!-- Include MDC context fields in every log line -->
                <includeMdcKeyName>traceId</includeMdcKeyName>
                <includeMdcKeyName>spanId</includeMdcKeyName>
                <includeMdcKeyName>userId</includeMdcKeyName>
                <includeMdcKeyName>requestId</includeMdcKeyName>
                <!-- Custom fields in every log entry -->
                <customFields>{"service":"payment-service","environment":"production"}</customFields>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="STDOUT"/>
        </root>
    </springProfile>
    
    <springProfile name="local,test">
        <!-- Plain text for developer readability locally -->
        <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="DEBUG">
            <appender-ref ref="STDOUT"/>
        </root>
    </springProfile>
</configuration>
```

```java
// Payment service with structured logging:
@Service
@Slf4j
public class PaymentService {
    
    private final CloudWatchClient cloudWatch;
    
    public PaymentResult processPayment(PaymentRequest request) {
        long startTime = System.currentTimeMillis();
        
        // MDC (Mapped Diagnostic Context) — adds fields to EVERY log line in this thread
        MDC.put("userId", request.getUserId());
        MDC.put("paymentMethod", request.getPaymentMethod());
        MDC.put("amount", request.getAmount().toString());
        
        try {
            // This log line in JSON (via logstash-logback-encoder):
            // {"@timestamp":"2025-01-15T10:30:45.123Z","level":"INFO","message":"Payment processing started",
            //  "service":"payment-service","environment":"production",
            //  "userId":"user-123","paymentMethod":"UPI","amount":"5000.00",
            //  "traceId":"abc-123-def","requestId":"req-789"}
            log.info("Payment processing started");
            
            PaymentResult result = gateway.charge(request);
            
            long duration = System.currentTimeMillis() - startTime;
            
            // Structured success log — queryable by all fields in Log Insights
            log.info("Payment completed",
                StructuredArguments.keyValue("transactionId", result.getTransactionId()),
                StructuredArguments.keyValue("durationMs", duration),
                StructuredArguments.keyValue("status", "SUCCESS"),
                StructuredArguments.keyValue("gatewayProvider", result.getProvider())
            );
            
            // Publish custom metric via EMF (structured log → metric; no API call cost)
            publishPaymentMetric("SUCCESS", request.getPaymentMethod(), duration);
            
            return result;
            
        } catch (PaymentGatewayException e) {
            log.error("Payment failed",
                StructuredArguments.keyValue("errorCode", e.getErrorCode()),
                StructuredArguments.keyValue("errorCategory", e.getCategory()),
                StructuredArguments.keyValue("gatewayResponse", e.getGatewayResponse()),
                StructuredArguments.keyValue("status", "FAILED")
            );
            
            publishPaymentMetric("FAILED", request.getPaymentMethod(), -1);
            throw e;
            
        } finally {
            MDC.clear();  // CRITICAL: clear MDC after request to prevent thread pool leakage
        }
    }
    
    private void publishPaymentMetric(String status, String method, long durationMs) {
        // EMF format — logged as structured JSON, CloudWatch agent converts to metric
        // No API call, no per-metric charge, just a log line
        log.info(
            "{\"_aws\":{\"Timestamp\":" + Instant.now().toEpochMilli() + 
            ",\"CloudWatchMetrics\":[{\"Namespace\":\"PaymentPlatform/Prod\"" +
            ",\"Dimensions\":[[\"Status\",\"PaymentMethod\"]]" +
            ",\"Metrics\":[{\"Name\":\"PaymentCount\",\"Unit\":\"Count\"}]}]}" +
            ",\"Status\":\"" + status + "\"" +
            ",\"PaymentMethod\":\"" + method + "\"" +
            ",\"PaymentCount\":1}"
        );
    }
}
```

```hcl
# Terraform — CloudWatch Alarms for payment service (applied as Infrastructure as Code)

# Alarm: high error rate on ALB
resource "aws_cloudwatch_metric_alarm" "payment_api_5xx" {
  alarm_name          = "payment-api-5xx-errors-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2           # Breaches for 2 consecutive 1-minute periods
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60          # 1-minute evaluation window
  statistic           = "Sum"
  threshold           = 10          # More than 10 5xx errors in 1 minute
  alarm_description   = "Payment API returning 5xx errors at high rate"
  
  dimensions = {
    LoadBalancer = aws_lb.payment_alb.arn_suffix
    TargetGroup  = aws_lb_target_group.payment_service.arn_suffix
  }
  
  alarm_actions = [aws_sns_topic.pagerduty_critical.arn]   # → PagerDuty on-call alert
  ok_actions    = [aws_sns_topic.pagerduty_critical.arn]   # → Notify when recovered too
}

# Alarm: high latency p99
resource "aws_cloudwatch_metric_alarm" "payment_latency_p99" {
  alarm_name          = "payment-api-latency-p99-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"        # p99 latency (not average — average hides tail latency)
  threshold           = 2            # 2 seconds p99 is unacceptable for payment API
  
  dimensions = {
    LoadBalancer = aws_lb.payment_alb.arn_suffix
  }
  
  alarm_actions = [aws_sns_topic.slack_warning.arn]
}

# Composite alarm — alert only when both CPU and memory are stressed
resource "aws_cloudwatch_composite_alarm" "payment_resource_saturation" {
  alarm_name        = "payment-service-resource-saturation"
  alarm_description = "Both CPU and memory high on payment service pods"
  
  alarm_rule = "ALARM(${aws_cloudwatch_metric_alarm.payment_cpu.alarm_name}) AND ALARM(${aws_cloudwatch_metric_alarm.payment_memory.alarm_name})"
  
  alarm_actions = [aws_sns_topic.pagerduty_critical.arn]
}
```

```bash
# CloudWatch Log Insights queries — production debugging
# Run in AWS Console > CloudWatch > Log Insights > select log group

# 1. All errors in payment service in last 1 hour, newest first:
fields @timestamp, level, message, errorCode, userId, traceId
| filter level = "ERROR"
| filter service = "payment-service"
| sort @timestamp desc
| limit 50

# 2. Count errors by error code — find the most frequent failure type:
fields errorCode
| filter level = "ERROR"
| filter service = "payment-service"
| stats count(*) as errorCount by errorCode
| sort errorCount desc

# 3. p99 payment processing duration by payment method:
fields durationMs, paymentMethod
| filter status = "SUCCESS"
| stats percentile(durationMs, 99) as p99_ms, avg(durationMs) as avg_ms, count(*) as requests
  by paymentMethod
| sort p99_ms desc

# 4. Find all logs for a specific traceId (distributed trace reconstruction):
fields @timestamp, service, level, message
| filter traceId = "abc-123-trace-id-from-customer-complaint"
| sort @timestamp asc
# This shows the entire request journey across ALL services that logged this traceId
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you ensure your Spring Boot application logs are searchable in CloudWatch?"

**Hruday's answer:**
> Two things are required: structured JSON logging and a log shipping agent.
>
> For structured logging, I add the `logstash-logback-encoder` dependency to Spring Boot and configure `logback-spring.xml` to use `LogstashEncoder` for the production profile. This outputs every log line as a JSON object with `@timestamp`, `level`, `logger`, `message`, and all MDC fields. MDC (Mapped Diagnostic Context) is how I add request-scoped data — I put `traceId`, `userId`, `requestId` into MDC at the start of each request (via a filter/interceptor) so every log line from that request automatically includes those fields. This matters for debugging: you can find all logs for a specific user's failed payment by querying `filter userId = "user-123"`.
>
> For log shipping, on EKS I rely on a Fluent Bit DaemonSet (installed as part of Container Insights) that reads all container stdout/stderr from the node filesystem and ships to CloudWatch. The application writes to stdout; Fluent Bit handles the CloudWatch delivery. No application-level CloudWatch SDK calls needed for basic logging.
>
> With JSON logs in CloudWatch, Log Insights queries can filter and aggregate on any field: count errors by errorCode, find the slowest transactions by durationMs, reconstruct a complete distributed trace by traceId across multiple services' log groups.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the difference between CloudWatch Metrics, Logs, and how do you choose what should be a log vs a metric?"

**Hruday's answer:**
> Logs are text-based event records. Each log line is a discrete event with a timestamp and payload. Logs are queryable but not aggregatable for mathematical operations at scale — you can't say "give me the 99th percentile of this field over the last 30 days" without running a potentially expensive Log Insights query across a large dataset.
>
> Metrics are time-series numerical data. Each data point is a timestamp, value, and dimensions. Metrics support statistical operations natively and efficiently — AWS maintains pre-aggregated statistics (count, sum, min, max, p90, p99) over configurable periods. You can alarm on metrics. You can display them on dashboards with live updates. Storing 30 days of metrics for a single metric with 1-minute resolution is ~43,000 data points — trivially cheap.
>
> The rule: **anything you want to alarm on should be a metric**. Payment success rate, error rate, request latency p99, queue depth, active database connections — all metrics. Individual payment event details (which user, which amount, which error) — logs.
>
> EMF (Embedded Metrics Format) bridges the two: log a structured JSON line that the CloudWatch agent automatically publishes as a metric. You get both the log (queryable for debugging) and the metric (alarmable, dashboardable) from a single operation without a separate API call. I use EMF for all custom application metrics — order processing time, payment success rate, cache hit ratio — so I pay only logging costs, not per-metric-API-call costs.

---

### Q3 — Scenario
**Interviewer asks:** "The payment service had elevated error rates for 12 minutes last night but your alarm didn't fire. What might have gone wrong?"

**Hruday's answer:**
> Several possibilities, each requiring investigation.
>
> First: the alarm threshold or evaluation periods may be misconfigured. If the alarm requires 5 consecutive breach periods but errors only peaked for 3 periods, it wouldn't transition to ALARM. Or the threshold might be too high — set to 50 errors per minute when 12 was the actual peak. I'd check the alarm's history in the CloudWatch console (Alarm > History tab shows every state transition) to see whether it evaluated and decided not to alarm, or didn't evaluate at all.
>
> Second: the metric might not have been published. If the error rate increased because the service was returning errors at the Java exception level (no HTTP response, 500 from Spring Boot before the JSON body was serialised), the ALB would log a 5xx, but if my alarm watched a custom metric published by my application code, and that code path wasn't reached, the metric wouldn't increment. Instead of relying on application-published metrics for error rates, I'd use ALB-native HTTPCode_ELB_5XX_Count — which ALB records regardless of whether my application code published a custom metric.
>
> Third: INSUFFICIENT_DATA state. If the metric hasn't received data points (application was down, Fluent Bit agent crashed, CloudWatch API throttled), the alarm transitions to INSUFFICIENT_DATA rather than ALARM. In some configurations, INSUFFICIENT_DATA doesn't trigger alarm actions. I'd set `treat_missing_data = breaching` so that a lack of data is treated as a problem, not silence.
>
> Fourth: SNS delivery failure. Alarm fired but the notification wasn't delivered (PagerDuty integration down, email bounced, Lambda function that processes the notification crashed). I'd set multiple notification channels and check SNS delivery logs.

---

### Q4 — Trade-off
**Interviewer asks:** "How would you set up observability for a new microservice from day one?"

**Hruday's answer:**
> I follow a structured approach across three signals: logs, metrics, and traces.
>
> For logs: enable JSON structured logging (logstash-logback-encoder), set up MDC injection in a filter to add traceId and requestId to every log line, configure log retention (30 days for production), create a Log Insights saved query for "errors in last 1 hour" and "slowest requests in last 24 hours" — these are the two queries I'll run immediately when something goes wrong.
>
> For metrics: identify the 4 golden signals — latency (p99 of InvocationDuration), traffic (RequestCount), errors (ErrorRate as a percentage), saturation (pod CPU and memory utilisation). Create CloudWatch Alarms for: error rate > 1% (warning), error rate > 5% (critical), p99 latency > 500ms (warning), p99 latency > 2000ms (critical). Alarms go to Slack on warning, PagerDuty on critical. All alarm configurations are in Terraform — not manually configured — so they're repeatable, code-reviewed, and don't get lost.
>
> For traces: Spring Boot Actuator + Micrometer Tracing (Brave/OpenTelemetry) injects traceId into MDC automatically when integrating with Spring Cloud Sleuth or Spring Boot 3.x Micrometer Tracing. Distributed traces across services then correlated by shared traceId in CloudWatch Logs or sent to AWS X-Ray for a visual trace map.
>
> The principle: observability is not an afterthought. It's in the service's definition of done for every feature."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "CloudWatch is expensive" | "CloudWatch costs too much at scale" | CloudWatch cost is manageable with two practices: (1) set log retention policies — default "Never expire" at $0.03/GB/month for stored logs compounds fast; set 30-90 day retention; (2) use EMF instead of PutMetricData — EMF metrics are free (billed as logs), PutMetricData is $0.01 per 10,000 API calls but adds up at high metric cardinality |
| "Alarms on averages are sufficient" | "I'll set an alarm if average latency > 200ms" | Average latency masks tail latency — if 1% of requests take 5 seconds and 99% take 50ms, the average is ~100ms (looks fine); alarm on p99 latency, not average; `extended_statistic = "p99"` in CloudWatch Alarm configuration; p99 > threshold catches the painful tail that users experience even if averages look healthy |
| "Log all request/response bodies" | "I log the full request payload for debugging" | Never log request bodies (or response bodies) that may contain PII (user data), payment card data, passwords, or tokens — OWASP A02 / data regulation violation; log correlation IDs, error codes, and business-level fields like `paymentMethod` and `amount` but NEVER sensitive field values; use MDC for context, not payload dumps |
| "CloudWatch replaces distributed tracing" | "CloudWatch Logs is enough for cross-service debugging" | CloudWatch Log Insights can correlate by traceId across services but only gives you log lines; AWS X-Ray gives you a flame graph of the entire distributed call chain with duration breakdown at each hop; X-Ray + CloudWatch together is the right setup: X-Ray for understanding where time is spent, CloudWatch Logs for the detailed context at each step |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we used Azure Monitor with Application Insights — the equivalent of CloudWatch Logs, Metrics, and X-Ray combined. Our Java Spring Boot services sent structured JSON logs via a Log Analytics workspace, and we built KQL (Kusto Query Language) queries to debug cross-service failures — KQL is conceptually identical to CloudWatch Log Insights for ad-hoc analysis.
>
> The specific lesson I carried forward: we once had an outage where our alarm was set on 'RequestsFailedRate' — a custom metric our application published. During the outage, the pods were OOMKilled (out of memory) and the JVM was restarting — no log lines, no metric published, the alarm stayed in INSUFFICIENT_DATA. We had 8 minutes of complete silence before our on-call engineer noticed the spike in restart count via a dashboard.
>
> After that incident, I always add a second alarm path on infrastructure-level signals (pod restart count via Container Insights, ALB 5xx count which records regardless of application state) alongside application-emitted metrics. Infrastructure signals survive application crashes; application metrics do not.
>
> I also started setting `treat_missing_data = breaching` on all critical alarms. A metric going silent is usually a sign something is wrong — it should alert, not stay green."

---

## 8. Scale Evolution

**Single service, 10 req/s →** Default CloudWatch Logs (Fluent Bit DaemonSet), 3-4 metric alarms for the 4 golden signals, Log Insights saved queries for common debugging scenarios. CloudWatch built-in dashboards. Total cost: negligible.

**10 services, 1,000 req/s →** Log retention policies tuned by environment (7 days dev, 30 days staging, 90 days prod); metric namespaces per team; composite alarms to reduce alert noise; CloudWatch Container Insights for EKS pod-level metrics; X-Ray distributed tracing across services; custom dashboards per domain (payments dashboard, user service dashboard).

**50+ services, 100,000+ req/s →** Third-party observability platforms (Datadog, Dynatrace) often chosen for unified logs + metrics + traces UI; CloudWatch remains the upstream collection layer (agents ship to CloudWatch, CloudWatch Metric Streams forward to Datadog in near-real-time); OpenTelemetry collector as vendor-neutral telemetry pipeline; log sampling for very high-volume debug logs (reduce cost by logging 1% of successful requests; log 100% of errors).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment observability is business-critical; PCI-DSS requires audit logs retained for 1 year; latency alarms protect payment SLA; real-time error rate dashboards during peak transaction periods (festivals, bill payment dates) | Know retention policies for compliance; alarm on p99 latency not average; business metric (payment success rate) monitoring |
| Swiggy / Meesho | Order placement success rate metric; peak order surge observability (evenings); Log Insights query to correlate failed orders with specific restaurant/partner service errors | High-volume log cost management (retention + sampling); composite alarms for order service health |
| Adobe / Microsoft | Large-scale metrics for Creative Cloud document processing; tracing across document transform pipeline from upload to completion; SLI/SLO dashboards for premium customer guarantees | Distributed tracing with X-Ray; SLO-based alerting; CloudWatch Service Lens |
| SAP Labs | SAP BTP integration services require observability for cross-cloud data flows; compliance logging for enterprise audit requirements; AKS equivalent to CloudWatch Container Insights is Azure Monitor for Containers | Map between Azure Monitor (familiar) and CloudWatch specifics; identical concepts, different service names |

---

## 10. Related Topics — What to Study Next

- **Topic 197 — EKS: Kubernetes on AWS** — Container Insights DaemonSet (CloudWatch agent + Fluent Bit) is deployed to every EKS cluster for pod-level metrics; IRSA (IAM Roles for Service Accounts) governs what CloudWatch operations the Fluent Bit agent can perform (PutLogEvents); the entire EKS observability stack runs on CloudWatch
- **Topic 194 — Canary Releases and Rollback Strategy** — CloudWatch Alarms are the trigger for automated rollbacks; AWS CodeDeploy (and Argo Rollouts) can watch CloudWatch Alarms and roll back automatically if error rate or latency alarms fire during a deployment; this closes the loop between CI/CD and observability
- **Topic 199 — VPC, Security Groups, IAM** — the CloudWatch agent on EKS nodes needs IAM permissions to call PutLogEvents and PutMetricData on CloudWatch; the Fluent Bit DaemonSet uses IRSA (its own IAM Service Account) not the node IAM role; CloudWatch endpoints can be accessed via VPC Interface Endpoints to keep log traffic off the public internet
- **Topic 191 — GitHub Actions** — CI/CD pipelines emit deployment events to CloudWatch as custom Events (deployment started, deployment completed, version deployed); correlating log error spikes with deployment events on a CloudWatch dashboard is a key observability pattern for identifying deployment-caused regressions

---

*Part 11 · CloudWatch — Logs, Metrics, and Alarms · Full Stack Interview Guide · Hruday D · 2026*
