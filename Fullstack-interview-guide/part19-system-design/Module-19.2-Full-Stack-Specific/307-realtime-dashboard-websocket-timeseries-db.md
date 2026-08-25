# Real-time Dashboard — WebSocket, Time-Series DB
> Part 19 — System Design Case Studies · 🔥 High Frequency · ✅ Hruday's Strength
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What it is**: a live dashboard shows continuously updated metrics (revenue, active users, server CPU) without the user manually refreshing; data updates automatically as events stream in
- **WebSocket for real-time push**: server pushes new data points to all connected dashboard clients as they occur; no polling; 50ms update latency vs 5s polling interval
- **SSE (Server-Sent Events) alternative**: if the dashboard is read-only (server pushes, client never sends back), SSE is simpler — plain HTTP, auto-reconnect, works through HTTP/2; WebSocket for bidirectional (e.g., client sends filter changes that affect what server pushes)
- **Time-series DB**: events arrive continuously; queries are always time-range based ("last 5 minutes," "last 24 hours"); time-series DBs (InfluxDB, TimescaleDB, ClickHouse, Victoria Metrics) store and query timestamped data far more efficiently than relational DBs
- **Write path**: events → Kafka → stream processor (Kafka Streams / Flink) → aggregate into time buckets → write to time-series DB + update Redis for live view
- **Read path for historical**: time-series DB query (e.g., InfluxDB Flux query or TimescaleDB time_bucket() SQL); aggregate in the DB, not in application code
- **Read path for real-time (live view)**: query Redis for the latest N seconds of pre-aggregated data; < 5ms latency; Redis key = `metric:{name}:{bucket}`, value = aggregated count/sum/avg
- **Windowing**: tumbling window = fixed non-overlapping buckets (count events per minute); sliding window = overlapping windows (moving average over last 5 minutes); session window = per user-session aggregation
- **Downsampling**: after 24 hours, compress per-second data to per-minute averages; after 7 days, compress to per-hour; after 90 days, per-day; reduces storage by 99.9% with no loss for long-range trend views
- **Backpressure**: if the stream processor falls behind, Kafka consumer lag increases; alert on this; don't let the dashboard lag because the processor is overwhelmed

---

## 1. One-Line Definition
A real-time dashboard streams continuously updated metrics to connected clients via WebSocket/SSE, writing raw events through Kafka to a stream processor that aggregates them into time buckets stored in Redis (for live view) and a time-series database (for historical queries).

---

## 2. The Problem It Solves

A SaaS product's operations team wants to monitor sign-ups, revenue, and active sessions live. The naive approach: a React page that polls `/api/metrics?range=last5min` every 5 seconds. This works, but:

1. With 200 operations staff watching the dashboard, that's 40 HTTP requests per second for data that changes every second — most returning the same stale answer
2. The backend runs a complex GROUP BY SQL aggregation every 5 seconds per request — 40 grouped scans/second on a production database
3. The "real-time" view is actually 0–5 seconds stale depending on when the last poll happened

The real-time dashboard pattern replaces polling with push, replaces per-request aggregation with pre-computed aggregates, and uses a time-series database designed for this exact workload.

---

## 3. How It Works Internally

### Write Path (Data Ingestion)

```
Events from all services
(user_signup, payment, page_view, api_call)
         │
         ▼
      Kafka topic: 
      analytics.events
         │
         ▼
  ┌─────────────────────────────────┐
  │  Kafka Streams Aggregator       │
  │                                 │
  │  Tumbling window: 10s buckets   │
  │  - count(events) per type       │
  │  - sum(revenue) per type        │
  │  - p99 latency per endpoint     │
  │                                 │
  │  Emit aggregated result every   │
  │  10s per metric type            │
  └───────────┬─────────────────────┘
              │
    ┌─────────┴────────────┐
    ▼                      ▼
Redis                TimescaleDB / InfluxDB
(live view)          (historical queryable
key = metric:{name}: storage; downsampled
last 300 seconds     after 24h)
TTL = 300s
```

### Read Path

```
Dashboard Client
       │
       ▼ (initial load)
HTTP GET /api/metrics/historical?metric=revenue&range=24h
       │
       ▼
TimescaleDB: 
  SELECT time_bucket('5 minutes', time) AS t, SUM(value)
  FROM metrics WHERE name='revenue' AND time > now() - interval '24h'
  GROUP BY t ORDER BY t
       │
       ▼ render chart

       │
       │ (WebSocket connection established)
       ▼
WS /ws/dashboard → subscribe to metrics: [revenue, active_users, api_latency_p99]
       │
       ▼
Server pushes update every 10s:
  { metric: 'revenue', value: 4521.00, timestamp: 1690000060000 }
  { metric: 'active_users', value: 1247, timestamp: 1690000060000 }
  
Chart updates in place — no re-render of full page
```

---

## 4. The Code

### Wrong Way — Polling with Live DB Aggregation

```java
// ❌ Per-request aggregation on production database

@GetMapping("/metrics/current")
public MetricsSnapshot getCurrentMetrics() {
    
    // ❌ Complex aggregation query running on PROD DB every 5 seconds per client
    // ❌ With 200 dashboard viewers: 40 GROUP BY queries/second continuously
    // ❌ Transaction log queries are slow and can interfere with writes
    
    long activeUsers = sessionRepository.countActiveSince(Instant.now().minusSeconds(300));  
    // ❌ Full table scan or index scan on sessions table
    
    BigDecimal revenue = orderRepository.sumRevenueInLastMinute();  
    // ❌ Aggregation query on orders table — CPU intensive at scale
    
    return new MetricsSnapshot(activeUsers, revenue);
    // ❌ 200 clients × 5s interval → 40 concurrent aggregation queries
}
```

```java
// ✅ Kafka Streams aggregation → Redis for live view → WebSocket push

// Kafka Streams aggregation topology
@Bean
public KStream<String, AnalyticsEvent> metricsAggregationStream(StreamsBuilder builder) {
    
    KStream<String, AnalyticsEvent> events = builder.stream("analytics.events",
        Consumed.with(Serdes.String(), JsonSerde.of(AnalyticsEvent.class)));
    
    // ✅ Tumbling window: aggregate events per 10-second buckets
    KTable<Windowed<String>, MetricAggregate> windowedAggregates = events
        .selectKey((k, v) -> v.getMetricName())          // rekey by metric name
        .groupByKey(Grouped.with(Serdes.String(), JsonSerde.of(AnalyticsEvent.class)))
        .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofSeconds(10)))
        .aggregate(
            MetricAggregate::new,                         // initialiser
            (key, event, agg) -> agg.add(event),         // aggregator
            Materialized.with(Serdes.String(), JsonSerde.of(MetricAggregate.class))
        );
    
    // ✅ On each window close, write to Redis and push via WebSocket
    windowedAggregates.toStream()
        .foreach((windowedKey, aggregate) -> {
            String metricName = windowedKey.key();
            long windowEnd = windowedKey.window().endTime().toEpochMilli();
            
            // ✅ Write to Redis with TTL for live view
            metricsCache.updateLiveMetric(metricName, windowEnd, aggregate);
            
            // ✅ Write to TimescaleDB for historical storage (async)
            metricsRepository.save(new MetricPoint(metricName, windowEnd, aggregate));
            
            // ✅ Broadcast to all dashboard WebSocket subscribers
            dashboardBroadcaster.broadcast(metricName, aggregate);
        });
    
    return events;
}

// ✅ WebSocket server: broadcast aggregated metrics to all dashboard viewers
@Service
public class DashboardBroadcaster {
    private final SimpMessagingTemplate messagingTemplate;
    
    // ✅ Called by Kafka Streams every 10 seconds with new aggregate
    public void broadcast(String metricName, MetricAggregate aggregate) {
        DashboardMetricUpdate update = DashboardMetricUpdate.builder()
            .metric(metricName)
            .value(aggregate.getValue())
            .count(aggregate.getCount())
            .timestamp(Instant.now().toEpochMilli())
            .build();
        
        // ✅ Push to all clients subscribed to /topic/metrics.{metricName}
        messagingTemplate.convertAndSend("/topic/metrics." + metricName, update);
    }
}

// ✅ Historical query endpoint using TimescaleDB
@GetMapping("/metrics/historical")
public List<MetricDataPoint> getHistoricalMetrics(
        @RequestParam String metric,
        @RequestParam @DateTimeFormat(iso = ISO.DATE_TIME) Instant from,
        @RequestParam @DateTimeFormat(iso = ISO.DATE_TIME) Instant to,
        @RequestParam(defaultValue = "5m") String granularity) {
    
    // ✅ Let TimescaleDB do the aggregation — it's optimised for this
    return metricsRepository.queryTimeBuckets(metric, from, to, granularity);
    // SQL: SELECT time_bucket($3, time) AS t, SUM(value), COUNT(*) 
    //      FROM metric_points WHERE name=$1 AND time BETWEEN $2 AND $3
    //      GROUP BY t ORDER BY t
}
```

```typescript
// ✅ React dashboard: WebSocket subscription + Chart.js live update

import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface MetricUpdate {
    metric: string;
    value: number;
    timestamp: number;
}

function useRealtimeMetric(metricName: string, historySize = 60) {
    const [dataPoints, setDataPoints] = useState<{ x: number; y: number }[]>([]);
    const stompRef = useRef<Client | null>(null);

    // ✅ Load initial history from REST endpoint
    useEffect(() => {
        const to = new Date();
        const from = new Date(to.getTime() - 5 * 60 * 1000);  // last 5 minutes
        
        fetch(`/api/metrics/historical?metric=${metricName}&from=${from.toISOString()}&to=${to.toISOString()}&granularity=10s`)
            .then(r => r.json())
            .then((points: { timestamp: number; value: number }[]) => {
                setDataPoints(points.map(p => ({ x: p.timestamp, y: p.value })));
            });
    }, [metricName]);
    
    // ✅ Subscribe to WebSocket for live updates
    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS('/ws/dashboard'),
            reconnectDelay: 3000,
        });
        
        client.onConnect = () => {
            client.subscribe(`/topic/metrics.${metricName}`, (frame) => {
                const update: MetricUpdate = JSON.parse(frame.body);
                
                setDataPoints(prev => {
                    const next = [...prev, { x: update.timestamp, y: update.value }];
                    // ✅ Keep only last historySize points in render state
                    return next.slice(-historySize);
                });
            });
        };
        
        client.activate();
        stompRef.current = client;
        return () => { client.deactivate(); };
    }, [metricName, historySize]);
    
    return dataPoints;
}

// ✅ Dashboard metric card component
function LiveMetricChart({ metricName, label }: { metricName: string; label: string }) {
    const dataPoints = useRealtimeMetric(metricName, 60);
    const canvasRef  = useRef<HTMLCanvasElement>(null);
    const chartRef   = useRef<Chart | null>(null);
    
    // ✅ On data change: update chart data without full re-render
    useEffect(() => {
        if (!canvasRef.current) return;
        
        if (!chartRef.current) {
            chartRef.current = new Chart(canvasRef.current, {
                type: 'line',
                data: { datasets: [{ data: dataPoints, borderColor: '#0070f3', tension: 0.3 }] },
                options: {
                    animation: false,    // ✅ Disable animation for real-time charts — avoids visual lag
                    scales: {
                        x: { type: 'time', time: { unit: 'second' } },
                        y: { beginAtZero: true }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        } else {
            // ✅ Mutate existing chart — much cheaper than destroy and recreate
            chartRef.current.data.datasets[0].data = dataPoints;
            chartRef.current.update('none');  // 'none' = no animation
        }
    }, [dataPoints]);
    
    return (
        <div className="metric-card">
            <h3>{label}</h3>
            <div className="current-value">{dataPoints.at(-1)?.y.toLocaleString() ?? '—'}</div>
            <canvas ref={canvasRef} />
        </div>
    );
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why is a time-series database better than PostgreSQL for dashboard metrics?"

**Hruday's answer:**
> Time-series databases are optimised for the specific query pattern of dashboards: "give me all data points for metric X between time T1 and T2, grouped into N-second buckets." Regular PostgreSQL can do this with a GROUP BY and timestamp index, but the storage format, compression, and query execution path are all general-purpose — not optimised for this pattern.
>
> TimescaleDB (PostgreSQL extension) adds automatic partitioning by time intervals — each time chunk is a separate PostgreSQL table. Queries over a time range only scan the relevant partitions. It also adds columnar compression for old data — time-series data compresses by 90-95% because consecutive timestamps and values are similar (delta encoding). A query touching 7 days of data in a regular PostgreSQL table might scan 500GB; in TimescaleDB, the same query might scan 50GB compressed.
>
> InfluxDB and ClickHouse go further — their entire storage engine is purpose-built for time-series. ClickHouse in particular is exceptional for aggregation queries; it uses columnar storage and can aggregate billions of rows per second. For a dashboard with 100 billion data points, InfluxDB or ClickHouse is the right choice; for hundreds of millions, TimescaleDB on existing PostgreSQL infrastructure is pragmatic.

---

### Q2 — Deep Dive
**Interviewer asks:** "Your Kafka consumer is falling behind — the real-time dashboard is showing data from 5 minutes ago. How do you diagnose and fix it?"

**Hruday's answer:**
> Consumer lag is the first metric to look at. Kafka tracks the offset of the last produced message and the last committed offset per consumer group. If produced offset = 1,000,000 and committed offset = 900,000, consumer lag = 100,000 events behind.
>
> Diagnosis: check consumer lag in Kafka metrics (or a tool like Cruise Control / Kafdrop / Confluent Control Center). Check CPU and memory on the stream processor pods. Check if the TimescaleDB write is blocking — if DB writes are slow (maybe disk full, or index rebuild running), the Kafka polling loop blocks waiting for the write to complete.
>
> Common fixes: first, ensure the processing logic (aggregation) is cheap and non-blocking. If DB writes are the bottleneck, decouple: stream processor writes to Redis immediately (fast, non-blocking), and a separate async worker writes to TimescaleDB. The live view recovers immediately; historical DB catches up without blocking the live stream.
>
> If the issue is throughput: increase Kafka partition count for the topic and scale out more stream processor instances (one per partition). With 10 partitions and 10 consumers, throughput scales linearly.
>
> Monitoring: alert when consumer lag > N seconds worth of events. That's the SLA for dashboard freshness — if it's supposed to be < 30s stale, alert when lag represents > 30s.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "WebSocket vs SSE for the real-time dashboard?"

**Hruday's answer:**
> SSE for this specific case — a monitoring dashboard is purely server-to-client data. The server pushes metric updates; the client only renders them. The client never sends data back over the same channel.
>
> SSE advantages for this pattern: simpler backend (Spring SseEmitter or reactive Flux); no STOMP protocol needed; auto-reconnect is built into the EventSource browser API; works cleanly through HTTP/2 multiplexing; no sticky session requirements on load balancer.
>
> Where I'd choose WebSocket instead: if the dashboard is interactive — user sends filter commands ("show only payments > ₹10,000") back to the server, which then changes what metrics are pushed. That bidirectional communication requires WebSocket. Also if the dashboard is embedded in a larger app that already has a WebSocket connection for chat or notifications — reuse the existing connection rather than maintaining two.
>
> In practice at SAP Labs, I used WebSocket with STOMP because the product already had WebSocket infrastructure from a collaboration feature. Adding a new STOMP subscription to the existing connection was 20 lines of code. If starting fresh just for a monitoring dashboard, I'd choose SSE.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design a dashboard that must show metrics within 1 second of an event occurring."

**Hruday's answer:**
> Sub-1-second end-to-end requires eliminating every buffering layer that adds latency.
>
> Write path: services publish events directly to Kafka with linger.ms=0 (no batching delay) and acks=1 (leader acknowledgement only, not all replicas). This gets the event into Kafka in < 50ms. Stream processor uses Kafka Streams or a simple @KafkaListener with no window aggregation — just forward each event to Redis and WebSocket immediately. Window aggregation is skipped at this latency tier; raw events are forwarded.
>
> Storage: write to Redis Sorted Set (ZADD) — 1ms. WebSocket push happens in the same handler, synchronously — 2ms.
>
> Client: WebSocket push arrives at client in < 50ms. React updates chart with new data point — 16ms (one frame at 60fps). Total: < 200ms end-to-end.
>
> The cost: no aggregation at 1-second latency. If 50,000 events/second fire, 50,000 WebSocket messages push to every connected client per second — each browser tab receives 50,000 updates/second. Browser can't render that. The solution: aggregate client-side. Fire the event to the client immediately, but the client batches received events into a 1-second render cycle. The server sends every event; the client renders once per second using the latest state. 1-second display freshness, but handled on the client side.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Polling not mentioned as problem | "I'll build a REST endpoint that returns current metrics and call it every few seconds" | Polling is mentioned as the naive baseline to establish why push is better; key problems with polling: 1) N clients × poll interval = N × 1/interval requests/second regardless of whether data changed; 2) hard to get below 5s staleness without overwhelming the backend; 3) DB aggregation on every poll is expensive; the answer should contrast polling with WebSocket/SSE push and explain why push scales better — O(connections) pushes per update vs O(connections/interval) pulls continuously |
| Relational DB for metric storage | "I'd store metrics in a PostgreSQL events table and run SUM/COUNT aggregations for the chart" | PostgreSQL can work at small scale but is not designed for time-series; at 1M events/minute (common for a busy SaaS), PostgreSQL aggregation queries on hours of data become minutes-long; the correct answer names a time-series DB, explains why (time partitioning, columnar compression, time_bucket() functions), and shows awareness of downsampling for long-range views; missing downsampling is a secondary trap — storing every per-second metric forever at full granularity |
| Infinite data in chart state | "I'll push all new data points to the React state array and Chart.js will render them" | React state grows unbounded — after 24 hours of 1-point-per-second updates, 86,400 data points in state; every re-render processes all of them; the correct pattern: cap state at last N points (e.g., 60 for a 10-minute view); historical data comes from a separate REST call pre-loaded on mount; the live window is a sliding window of fixed size |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I built a monitoring dashboard for our cloud infrastructure team. The initial version polled a metrics API every 10 seconds. During an incident at 2am, the team was watching the dashboard but the 10-second polling meant they were seeing stale data — a CPU spike appeared on the dashboard 10 seconds after it actually happened, which feels like an eternity during an incident.
>
> I replaced the polling with a WebSocket connection. The backend had a Kafka Streams aggregator computing 10-second tumbling windows on our infrastructure metrics (Micrometer → Kafka → Kafka Streams → Redis + WebSocket broadcast). The dashboard went from 10-second stale to < 2-second stale. During the next major incident, the on-call team could see CPU/memory animate in near-real-time. They identified and resolved the root cause 4 minutes faster than in the previous comparable incident."

---

## 8. Scale Evolution

**1,000 users →** REST polling every 5 seconds with in-memory aggregation works. Store metrics in PostgreSQL with a `metric_points` table. Materialised views for pre-aggregated reads. Simple and sufficient.

**100,000 users (per day, 100 concurrent dashboard viewers) →** Switch to WebSocket push. Kafka for event ingestion. Kafka Streams for aggregation. Redis for live metric state. TimescaleDB for historical queries. Downsampling after 24h. Dashboard latency: < 2 seconds.

**10 million events/minute →** ClickHouse as the time-series store (sub-second aggregation on billions of rows). Kafka cluster with 20 partitions on the analytics topic. Kafka Streams scaled to 20 consumer instances. Redis Cluster for live metric distribution. WebSocket fanout through a pub/sub broker relay; server instances broadcast to respective connected clients. Tiered downsampling: raw→minute→hour→day at different retention windows.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction volume dashboards (₹/second processed, approval rates, failure spikes); merchant dashboards showing sales in real-time; fraud detection alerting dashboards | Time-series at financial data scale; < 5s staleness requirement |
| Swiggy / Meesho | Live order volume dashboard (orders/minute by region); delivery partner availability heatmap; logistics ops dashboards during festive peaks | Real-time geospatial metrics; high-volume Kafka ingestion |
| Adobe / Microsoft | Azure Monitor / Application Insights — both real-time metrics products; Adobe Analytics; this is a core product offering for both companies | Enterprise-scale time-series; multi-tenant metric isolation |
| SAP Labs | SAP Cloud monitoring dashboard — the exact story above; infrastructure metrics; incident response real-time view | Real incident + business impact narrative |

---

## 10. Related Topics — What to Study Next

- **Topic 304 — Chat / Messaging System** — both dashboards and chat use WebSocket for server push; dashboard is read-only push (SSE or WebSocket); understanding which to choose based on bidirectionality is a common follow-up
- **Topic 303 — Notification System** — alerting (CPU > 90% for 2 minutes → page the on-call) is the notification counterpart to dashboards; same event infrastructure, different delivery channel (PagerDuty, Slack webhook rather than WebSocket)
- **Topic 99 — Kafka Fundamentals** — Kafka is the event backbone of the write path; Kafka Streams windowing (tumbling vs sliding vs session windows) is directly used in metrics aggregation
- **Topic 313 — Infinite Scroll Feed** — both dashboard and feed handle continuous data streams in the frontend; understanding virtual list rendering and rendering performance is relevant to charts with many data points

---

*Part 19 · Real-time Dashboard — WebSocket, Time-Series DB · Full Stack Interview Guide · Hruday D · 2026*
