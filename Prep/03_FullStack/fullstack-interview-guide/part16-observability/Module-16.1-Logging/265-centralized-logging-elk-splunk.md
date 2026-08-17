# Centralized Logging — ELK Stack and Splunk
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card

- **ELK** = Elasticsearch (search/storage) + Logstash (pipeline/transform) + Kibana (dashboards/search); often extended to EFK (Filebeat instead of Logstash direct) or Elastic Stack (includes APM, security modules)
- **Log pipeline**: Application → writes JSON to console/file → **Filebeat** picks up and ships → **Logstash** transforms/enriches (geoIP, parse fields, filter fields) → **Elasticsearch** indexes → **Kibana** for search + dashboards + alerts
- **Elasticsearch is a search engine, not a database**: logs are documents indexed for full-text and field-based search; `GET /logs-*/_search?q=traceId:abc123` is fast (inverted index); but scrolling millions of records for reporting is slow; use aggregation queries for metrics
- **Kibana KQL query examples**: `level:ERROR AND service:order-service`, `traceId:"a7b4c1d2"`, `responseTimeMs > 2000 AND level:INFO`, `userId:usr-001 AND @timestamp:[now-1h TO now]`
- **Index lifecycle management (ILM)**: hot phase (today's logs — fastest SSD, full replicas) → warm phase (7-day logs — cheaper storage) → cold phase (30-90 days — minimal replicas) → delete phase; reduces Elasticsearch storage cost by 60-80% vs. keeping all logs in hot tier
- **Splunk** = commercial alternative; Splunk Processing Language (SPL) is more powerful for security/compliance use cases; proprietary and expensive; used heavily in enterprise (SAP, Adobe, Bosch environments); Splunk Universal Forwarder = Filebeat equivalent
- **When to use Splunk over ELK**: SOC/security teams with complex correlation rules across firewalls + apps + endpoints; enterprise compliance; Splunk's ML-based anomaly detection; when budget allows

---

## 1. One-Line Definition
Centralized logging aggregates logs from all services and servers into a single searchable platform (ELK or Splunk), eliminating the need to SSH into individual servers to grep log files — the foundation of operational visibility in distributed systems.

---

## 2. The Problem It Solves

In a pre-centralized-logging world with 20 microservices on 40 pods:
- Order fails → engineer SSHes into the order-service pod → `grep "orderId=99"` → finds nothing → SSHes into payment-service pod → `grep "orderId=99"` → finds error → SSHes into notification-service → exhausting
- The pod that had the error got killed by Kubernetes and the logs are gone
- Two engineers debugging in parallel have no shared view of what's happening

With ELK:
- Query `traceId:"a7b4c1d2"` in Kibana → all logs from all services for that trace in chronological order
- Kubernetes pod restarts don't lose logs — Filebeat shipped them before the pod died
- Dashboards show ERROR rate by service in real time — everyone sees the same view
- Historical analysis: "Did we have more errors last Tuesday at peak load?" → Kibana time filter on last 7 days

---

## 3. How It Works Internally

### Log Pipeline Architecture

```
[Service A (Spring Boot)]
   │  writes JSON to stdout
   ▼
[Filebeat (as DaemonSet in K8s)]
   │  reads from /var/log/containers/*.log (Docker log files)
   │  adds metadata: pod name, namespace, node, container name
   │  buffers and ships with backpressure
   ▼
[Kafka (optional, for high-volume buffering)]
   │  decouples: if Logstash is slow, Filebeat doesn't block
   │  required at > 10,000 log events/sec
   ▼
[Logstash]
   │  filter: parse multiline stack traces into single documents
   │  filter: add geoIP from clientIp field
   │  filter: drop DEBUG logs older than 1 minute (reduces noise)
   │  output: index into Elasticsearch
   ▼
[Elasticsearch Cluster]
   │  hot nodes: NVMe SSD, logs-YYYY.MM-hot index
   │  warm nodes: HDD, logs-YYYY.MM-warm index
   │  cold nodes: S3-backed, logs-YYYY.MM-cold index
   │  ILM policy: auto-transitions based on age/size
   ▼
[Kibana]
   │  KQL search: level:ERROR AND service:payment-service
   │  Dashboards: ERROR rate per service, P95 latency trends
   │  Alerts: error rate > threshold → Slack/webhook
```

### Elasticsearch Index Mapping for Logs

```json
// Elasticsearch automatically infers types, but explicit mappings prevent issues:
{
  "mappings": {
    "properties": {
      "@timestamp":   { "type": "date" },
      "level":        { "type": "keyword" },
      "service":      { "type": "keyword" },
      "traceId":      { "type": "keyword" },
      "userId":       { "type": "keyword" },
      "message":      { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "responseTimeMs": { "type": "long" },
      "stackTrace":   { "type": "text" }
    }
  }
}
// "keyword" = exact match, aggregatable (use for level, service, traceId)
// "text" = full-text search (use for message, stackTrace)
```

---

## 4. The Code

### Wrong Way — Log Pipeline Without Buffering or Backpressure

```yaml
# ❌ WRONG 1: Direct Filebeat → Elasticsearch without buffering
# If Elasticsearch is slow or down, Filebeat's in-memory queue fills up,
# Filebeat applies backpressure, disk I/O spikes, service performance degrades

# filebeat.yml (bad):
output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  # ❌ No queue, no Kafka buffer
  # ❌ At high volume: disk write + Elasticsearch ingest simultaneously → I/O contention
```

```yaml
# ❌ WRONG 2: No ILM policy — all logs in hot tier forever
# Elasticsearch disk usage grows forever
# Hot tier SSDs fill up → cluster goes red → all log ingestion stops
# Common production disaster for teams that set up ELK and forget it

# No index template = no ILM = all indices live in hot tier
# After 6 months: 2TB of logs, Elasticsearch cluster degraded, 
# engineers can't search recent logs because cluster is under load
```

```java
// ❌ WRONG 3: Sending logs directly from application to Elasticsearch
// Application couples to Elasticsearch — if ES is slow, log writes slow the application
// If ES is down, application may throw exceptions on log writes
// No buffering, no retry, no batching

@Service
public class DirectElasticsearchLogger {
    private final ElasticsearchClient esClient;
    
    // ❌ Application code directly calling Elasticsearch for logging
    // This makes Elasticsearch a hard dependency of every service
    // A 500ms Elasticsearch response time adds 500ms to every request
    public void log(LogEvent event) {
        esClient.index(i -> i.index("logs").document(event));  // ❌
    }
}
```

### Right Way — Production-Ready ELK Pipeline

```yaml
# ✅ RIGHT — logback-spring.xml: write structured JSON to stdout
# Kubernetes/Docker captures stdout and writes to /var/log/containers/
# Filebeat reads from there — application is decoupled from the pipeline

# Application only responsibility: emit clean JSON to stdout
# The pipeline handles everything else
```

```yaml
# ✅ RIGHT — Filebeat DaemonSet for Kubernetes

# filebeat.yml:
filebeat.autodiscover:
  providers:
    - type: kubernetes
      node: ${NODE_NAME}
      hints.enabled: true              # uses Kubernetes pod annotations for config
      templates:
        - condition:
            contains:
              kubernetes.labels.app: "shop"   # ← only our services
          config:
            - type: container
              paths:
                - /var/log/containers/*${data.kubernetes.container.id}*.log
              processors:
                - add_kubernetes_metadata:
                    host: ${NODE_NAME}
                    matchers:
                      - logs_path:
                          logs_path: "/var/log/containers/"

# ✅ Add Kubernetes metadata to every event:
# pod.name, namespace, node.name, container.name, labels.app
# This means in Kibana: kubernetes.labels.app:order-service gives service-specific logs

processors:
  - add_fields:
      target: ""
      fields:
        environment: "${ENVIRONMENT}"  # production / staging

# ✅ Buffer before Kafka (for reliability)
queue.mem:
  events: 4096
  flush.min_events: 512
  flush.timeout: 5s

output.kafka:
  hosts: ["kafka:9092"]
  topic: "logs-%{[kubernetes.labels.environment]}"  # logs-production, logs-staging
  partition.round_robin:
    reachable_only: false
  required_acks: 1
  compression: gzip         # ← reduces network bandwidth by ~70% for text-heavy JSON
  max_message_bytes: 1000000
```

```yaml
# ✅ RIGHT — Logstash pipeline

# logstash.conf:
input {
  kafka {
    bootstrap_servers => "kafka:9092"
    topics => ["logs-production"]
    codec => json
    consumer_threads => 4     # ✅ parallel consumers for throughput
    group_id => "logstash-production"
  }
}

filter {
  # ✅ Multiline stack trace handling: Spring stack traces span many lines
  # Filebeat has already reassembled them if configured with multiline
  # Here we parse any remaining structure

  # ✅ Parse the message field if it's nested JSON (some libraries wrap)
  if [message] =~ /^\{/ {
    json {
      source => "message"
      target => "parsed"
    }
    mutate {
      rename => { "[parsed][level]" => "level" }
      rename => { "[parsed][traceId]" => "traceId" }
      rename => { "[parsed][userId]" => "userId" }
      rename => { "[parsed][service]" => "service" }
      rename => { "[parsed][message]" => "log_message" }
      rename => { "[parsed][responseTimeMs]" => "responseTimeMs" }
    }
  }

  # ✅ Normalize log level to uppercase for consistent KQL queries
  mutate {
    uppercase => ["level"]
  }

  # ✅ Drop DEBUG logs after processing (don't store in Elasticsearch -- cost saving)
  # Keep DEBUG for 10 minutes after the fact (in Kafka) for live debugging windows
  if [level] == "DEBUG" and [timestamp] < (NOW - 10 minutes) {
    drop { }
  }

  # ✅ Add geo-IP for client IP (if applicable)
  if [clientIp] {
    geoip {
      source => "clientIp"
      target => "geo"
      fields => ["country_code2", "city_name"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logs-%{[kubernetes.labels.environment]}-%{+YYYY.MM.dd}"
    # ✅ Index per day: enables ILM to easily transition entire days between tiers
    template_name => "logs-template"
    template_overwrite => false
  }
}
```

```json
// ✅ RIGHT — ILM Policy to manage storage costs

// PUT /_ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50gb",        
            "max_age": "1d"            // ← new index every day
          },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "3d",               // ← move to warm after 3 days
        "actions": {
          "shrink": { "number_of_shards": 1 },   // ← reduce shard count
          "forcemerge": { "max_num_segments": 1 }, // ← optimize for read
          "set_priority": { "priority": 50 }
        }
      },
      "cold": {
        "min_age": "14d",              // ← move to cold after 14 days
        "actions": {
          "freeze": {},                 // ← minimize memory footprint
          "set_priority": { "priority": 0 }
        }
      },
      "delete": {
        "min_age": "90d",              // ← delete logs older than 90 days
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

```typescript
// ✅ RIGHT — Kibana saved searches for team (KQL examples)

// All errors for a specific trace:
// KQL: traceId:"a7b4c1d2-e3f4-5678" AND level:ERROR

// All errors in the payment service in the last hour:
// KQL: service:payment-service AND level:ERROR
// Time filter: Last 1 hour

// Slow requests (over 2 seconds):
// KQL: responseTimeMs > 2000 AND level:INFO

// A specific user's activity today:
// KQL: userId:"usr-001" AND @timestamp > now-24h

// All events for an outage window:
// KQL: @timestamp >= "2024-01-15T10:00:00" AND @timestamp <= "2024-01-15T11:00:00"
//       AND level:(ERROR OR WARN)

// Finding a specific exception type:
// KQL: level:ERROR AND message:*NullPointerException*

// Splunk equivalent (SPL):
// index=prod-logs level=ERROR service=payment-service | timechart count span=5m
// index=prod-logs traceId="a7b4c1d2" | sort _time | table _time, service, message
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain the ELK stack and what each component does."

**Hruday's answer:**
> ELK is three components designed to work together for centralized logging.
>
> Elasticsearch is the heart — it's a distributed search engine built on Apache Lucene, optimized for document search at scale. Logs are stored as JSON documents, indexed for fast full-text and field-based search. In practice, you'd have a cluster of 3-6 nodes for high availability, with shards distributed across nodes.
>
> Logstash is the ETL pipeline for logs. It receives events from sources (Filebeat, applications), applies transformation filters (parsing, enriching, normalizing), and outputs to Elasticsearch. At high volume, Logstash is replaced or supplemented with Kafka to decouple ingestion rate from processing rate.
>
> Kibana is the UI layer — search, dashboards, and alerts. Teams use Kibana's KQL (Kibana Query Language) to search logs. Dashboard panels show things like "error rate per service over time" or "slowest API endpoints by P95 latency".
>
> In production setups, you usually add Filebeat (a lightweight shipper that runs on every server/pod and tails log files) and Kafka (as a buffer between Filebeat and Logstash). The full acronym then becomes "Elastic Stack" informally, but the core three — Elasticsearch, Logstash, Kibana — are what "ELK" refers to.

---

### Q2 — Deep Dive
**Interviewer asks:** "How would you handle log spikes — 10x normal volume during a Flash Sale?"

**Hruday's answer:**
> The answer is buffering and backpressure, handled at each layer.
>
> First, Kafka between Filebeat and Logstash. During a 10x spike, log volume can go from 1,000 events/second to 10,000/second. Kafka absorbs this burst — Filebeat writes to Kafka at 10,000/sec, and Logstash reads from Kafka at a sustainable pace (say 2,000/sec). The lag builds up during the spike, then drains when load returns to normal. Without Kafka, Logstash would be overwhelmed or Filebeat would backpressure the application.
>
> Second, Elasticsearch capacity. Hot tier nodes need to handle the peak ingestion rate. For a Flash Sale we know about in advance, we pre-scale Elasticsearch horizontally (add data nodes) before the event. Elasticsearch supports dynamic addition of data nodes without cluster downtime.
>
> Third, log sampling. During the spike, we can enable sampling — log 10% of INFO events for healthy requests, 100% of WARN and ERROR. This reduces volume while preserving visibility for failures. Spring Boot's structured logging config supports this with Logback's `SamplingTurboFilter`.
>
> Fourth, index lifecycle management. pre-defined ILM policies ensure that after the Flash Sale, the extra hot-tier data gets moved to warm and cold storage automatically, reclaiming SSD space without manual cleanup.
>
> The result: the logging pipeline handles the spike gracefully, all ERROR-level events are captured at 100%, and peak load engineering is a pre-planned operational exercise rather than an incident.

---

### Q3 — Comparison
**Interviewer asks:** "ELK or Splunk? When would you choose one over the other?"

**Hruday's answer:**
> Both solve centralized logging, but they optimize for different use cases.
>
> ELK is open-source with paid enterprise features. The total cost of ownership is primarily operational — you're running and maintaining the cluster. Your team needs Elasticsearch expertise to tune shard sizing, ILM policies, and query performance. For engineering teams that want control, customization, and are comfortable with the operational overhead, ELK is preferred. In cloud environments, managed AWS OpenSearch or Elastic Cloud reduces the operational burden significantly.
>
> Splunk is commercial — expensive (per GB ingested), but it comes with managed infrastructure, a very powerful query language (SPL), and strong enterprise features for security and compliance use cases. Splunk's Machine Learning Toolkit, the Splunk Security Suite, and compliance-specific apps (for PCI-DSS, HIPAA) are genuinely better than ELK's equivalents. Security operations centers typically choose Splunk because of these strengths. Its Universal Forwarder is also operationally simpler to deploy than the Filebeat + Logstash stack.
>
> My answer: for a typical product engineering team with DevOps capability, ELK (or hosted Elastic Cloud) on AWS/GCP is the right choice — cost-effective, flexible, and integrates well with the rest of the observability stack (Prometheus, Grafana). For an enterprise with a security operations center, compliance requirements, or a team that doesn't want to manage the pipeline, Splunk is worth the cost.
>
> At SAP Labs, we use Splunk for security and compliance log streams, and ELK for application performance and debugging. Both serve different stakeholders.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We just ship logs directly from the app to Elasticsearch" | "Our services send logs to Elasticsearch using the Elasticsearch REST client" | Coupling application code to Elasticsearch is a significant operational mistake; if Elasticsearch is slow or temporarily unavailable, every log write adds latency to request processing or throws exceptions; the correct pattern is for applications to write only to stdout (or a fast local file); Filebeat, a lightweight agent, ships logs asynchronously without touching the application's request path; the application has zero dependency on Elasticsearch being available; this also means you can change your log pipeline (Elasticsearch → Datadog, for example) without touching any application code |
| "We keep all logs forever in Elasticsearch for compliance" | "We retain all logs in hot tier Elasticsearch for 1 year" | Hot tier Elasticsearch (NVMe SSD) costs roughly $0.50-1.00/GB/month; 1 year of logs for a medium-traffic system can easily reach 500GB-5TB; that's $250-$5,000/month just for log storage; the correct approach is ILM (Index Lifecycle Management): active logs in hot tier for 3-7 days, recent logs in warm tier for 30-90 days, compliance-required logs in cold tier (S3-backed, Elastic's searchable snapshots feature) for 1-7 years at a fraction of the cost; most teams need fast search for the last 7 days, slower search is acceptable for older data |
| ELK and Splunk are equivalent | "Splunk is just commercial ELK" | Splunk's search language (SPL) is genuinely more powerful for complex multi-source correlation and statistical analysis than Kibana's KQL; Splunk handles non-log data (metrics, events, firewall feeds, endpoint telemetry) in ways ELK requires more configuration for; the enterprise-grade apps (Splunk ES for security, ITSI for IT operations) have no direct ELK equivalents at the same maturity level; choosing between them is a genuine engineering/business decision based on team skills, use case requirements, and budget — not one is simply "better" |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we migrated from server-level text log files to ELK over one quarter. Before migration, debugging a P1 required two senior engineers SSH-ing into multiple pods, collecting log snippets, and assembling them manually — typically a 30-45 minute effort before we even knew what the bug was.
>
> The first week after ELK was live, a P1 came in: checkout flow failing for a subset of users during peak load. I opened Kibana, filtered `level:ERROR AND service:order-service AND @timestamp:[last 30 mins]`, found the traceId of a failed request, filtered on that traceId's all services. Timeline: order-service logged at 10:23:01, payment-service logged 'charge timeout' at 10:23:03 (2 seconds), order-service then logged 'payment timeout' at 10:23:04, no notification event. Root cause identified: payment gateway's circuit breaker fallback wasn't logging the real timeout duration, but Logstash's field parsing made the `responseTimeMs` field visible — it was 2001ms, one millisecond over our 2000ms Resilience4j timeout threshold.
>
> Total: 9 minutes from alert to root cause. Previous process: 45 minutes minimum. The time saved in that one incident justified the entire migration project."

---

## 8. Scale Evolution

**1,000 users →** Single Elasticsearch node (5GB RAM), Filebeat on each server shipping directly to Elasticsearch, Kibana on the same node. Works, but no Kafka buffer. Sufficient for development teams starting observability.

**100,000 users →** 3-node Elasticsearch cluster (HA), Logstash for pipeline processing, Filebeat → Logstash → Elasticsearch, ILM with 7-day hot / 30-day warm / 90-day delete. Kibana with saved dashboards. Basic alerting via Kibana Watcher.

**10 million users →** Kafka between Filebeat and Logstash (absorbs spikes), 6+ node Elasticsearch with dedicated hot/warm/cold tiers, `searchable_snapshots` for cold tier on S3, horizontal Logstash scaling (3+ pipeline workers), Kibana with per-team dashboards, log sampling in Logstash (drop 90% of DEBUG/INFO for healthy paths), cost monitoring per service using Elasticsearch index size metrics.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment audit logs must be retained for 5+ years (RBI compliance); Splunk or ELK cold tier needed; real-time WARN/ERROR dashboards for ops; sub-second Kibana KQL queries for transaction investigation | Compliance log retention; audit trail design; pipeline at financial scale |
| Swiggy / Meesho | Order lifecycle visibility across 10+ microservices; real-time ERROR dashboard for ops team; ELK Flash Sale readiness (pre-scale before events); geographic log analysis (Geoip from Logstash) | Spike handling with Kafka buffer; ILM cost management; ops dashboard design |
| Adobe / Microsoft | Document processing job tracking; Splunk Enterprise for security log correlation; Azure Log Analytics as ELK alternative on Azure-native stack; compliance log pipelines for enterprise customers | Cloud-native alternatives; Splunk vs ELK decision; long-term log archive strategy |
| SAP Labs | Direct migration story (SSH grepping → ELK); P1 resolved in 9 min vs 45 min; traceId-based search saving two senior engineers' time; SAP's enterprise customers use Splunk — compatibility requirement | Before/after productivity data; migration approach; enterprise compliance |

---

## 10. Related Topics — What to Study Next

- **Topic 263 — Structured Logging** — ELK is only as powerful as the data fed into it; without structured JSON logs with consistent field names (`traceId`, `userId`, `level`, `service`), Kibana queries must use regex (`message:*Order created*`) which is slower and fragile; structured logging is the prerequisite for ELK to deliver value
- **Topic 266 — Distributed Tracing** — ELK with correlation IDs provides log-level correlation; distributed tracing (Jaeger, Zipkin, OpenTelemetry) goes further by providing a span tree showing WHICH service called WHICH service, timing at each hop, and parent-child causality; the two complement each other — ELK for detailed log data, distributed tracing for the call graph
- **Topic 267 — Micrometer and Prometheus** — ELK tells you WHAT happened (event logs); Prometheus tells you HOW YOUR SYSTEM IS DOING RIGHT NOW (metrics); you need both: Kibana to debug a specific failure, Grafana/Prometheus to see the overall health trend that tells you a failure is happening

---

*Part 16 · Centralized Logging — ELK Stack and Splunk · Full Stack Interview Guide · Hruday D · 2026*
