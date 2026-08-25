# Story 6 — Bosch Real-Time Dashboards: Full Stack Delivery
> Part 20 — Behavioural & Leadership · Hruday's Core Stories · ✅
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Story type**: Full stack end-to-end delivery, real-time systems, cross-layer ownership, delivering under ambiguity
- **When to use**: "Tell me about a complex full-stack feature you owned end to end" · "Describe building a real-time system" · "When did you deliver a technically challenging project on a deadline?" · "Tell me about ownership across backend and frontend"
- **The headline numbers**: Dashboard went from 10-second polling to 2-second WebSocket push; data staleness reduced from 10s to under 2s; 3 concurrent dashboard views with independent real-time streams; timeseries data retention 90 days queryable
- **The key full-stack signal**: I owned the full path — Kafka Streams aggregation, Spring Boot WebSocket endpoint, TimescaleDB historical storage, and the Angular frontend; no handoffs; I made decisions across all layers
- **Growth layer**: "I'd include the data retention and query performance requirements in the initial design doc — we added timeseries historical queries in sprint 2 as a scope extension; the original schema didn't have the right index for range queries and we had a full-table-scan on the first historical query attempt"
- **Story length**: ~2.5 minutes

---

## 1. One-Line Definition
A 2.5-minute STAR story about building a full-stack real-time monitoring dashboard for Bosch production line metrics — full ownership from Kafka Streams aggregations through Spring Boot WebSocket to Angular frontend — reducing staleness from 10 seconds (polling) to under 2 seconds (push).

---

## 2. Story Summary

| | Detail |
|---|---|
| **Company** | SAP Labs (partner project with Bosch) |
| **Product** | Real-time monitoring dashboard for Bosch factory production line metrics |
| **Starting state** | Bosch's existing dashboard polled every 10 seconds; operators missed rapid fault conditions that resolved before the poll captured them; alerts were delayed |
| **Technical challenge** | Kafka Streams aggregation pipeline, WebSocket push to browser, TimescaleDB for historical queries, Angular real-time chart rendering |
| **My role** | Sole engineer for the full stack; no dedicated backend or frontend split |
| **Result** | Dashboard staleness: 10s → <2s; 3 live stream types; 90-day queryable history; operator reported fault-detection response time "significantly faster than before" |

---

## 3. Full STAR Script (2.5 minutes)

### Situation (12 seconds)
"At SAP Labs on a Bosch integration project, the factory monitoring dashboard was polling the backend every 10 seconds for production line metrics. Bosch operators were missing rapid fault conditions — a machine fault that lasted 3 seconds might be invisible between polls, or the alert would arrive 8 seconds late."

### Task (10 seconds)
"I owned the redesign of the data pipeline and the dashboard frontend, end to end — from the Kafka events that captured production metrics to the Angular charts that displayed them."

### Action (105 seconds)
"I mapped the full flow: raw machine events arrived in a Kafka topic at roughly 200 events per second. The existing system consumed these in a batch job every 10 seconds and stored aggregates in a relational database.

My redesign: I replaced the batch job with a Kafka Streams application using a 2-second tumbling window. Every 2 seconds, it emitted current aggregates — line speed, defect count, throughput — into an output topic. This was the live-state layer.

For persistence, I introduced TimescaleDB. Every aggregated window was also written to a TimescaleDB hypertable, partitioned by timestamp. That gave us full 90-day queryable history for the trend analysis tab without the query performance problems of a regular Postgres table at scale.

For delivery to the browser, I built a Spring Boot WebSocket endpoint using STOMP. When a new aggregation arrived in the output Kafka topic, a Kafka listener in Spring Boot pushed it to the STOMP topic. Angular's STOMP client received the push and updated the chart in real time — no polling, no cache, no delay beyond the 2-second window.

On the frontend, I used ngx-charts with an Observable-driven data source. The WebSocket messages arrived as a stream; I map them into the chart's data structure in a RxJS pipe. The chart updates smoothly without a full re-render.

One challenge: three different operators needed independent dashboard views with different metric selections. I parameterised the WebSocket subscription by dashboard ID so each client subscribes only to the metrics relevant to their station."

### Result (18 seconds)
"Dashboard staleness dropped from 10 seconds to under 2 seconds. Three concurrent operator views run independently. Bosch's operations lead reported that fault detection response time improved — they were seeing and responding to conditions that previously fell between polls entirely. Historical query performance on TimescaleDB was sub-300ms for the 90-day range queries they needed."

---

## 4. Follow-Up Questions & Answers

### Q1 — Technical Trade-Off
**"Why TimescaleDB for historical data instead of just keeping everything in Kafka or a regular Postgres table?"**

> Kafka isn't a query layer — it's a message log. Kafka's strength is real-time streaming and playback; asking "show me average throughput by hour for the last 90 days" requires replaying events and aggregating ad-hoc, which is slow and complex.
>
> Regular Postgres at 90-day timeseries scale: even with an index on timestamp, a query like "select hour, avg(defect_count) where timestamp > 90 days ago" will scan millions of rows. TimescaleDB's hypertable partitions data into automated time-based "chunks" — typically one chunk per day or week. Queries that filter by a time range only scan the relevant chunks. The 90-day range query that would take 3-4 seconds on regular Postgres took 280ms on TimescaleDB because only the chunks within the date range were touched.
>
> The architecture is: Kafka for the real-time last-mile delivery (live metrics, sub-second); TimescaleDB for queryable historical storage; both populated from the same Kafka Streams output topic.

### Q2 — Full Stack Ownership
**"What was the hardest part of owning both the backend and frontend for this system?"**

> The hardest part is integration testing across the layers when you're the only person who owns all of them. On a split team, a backend PR would go through backend code review; a frontend PR through frontend review. When you own both, it's easy to convince yourself that a thing works without properly testing the integration.
>
> I addressed this by writing an integration test that spun up a real Kafka container (using Testcontainers), produced synthetic machine event messages, ran the Kafka Streams processor, and verified the WebSocket message arrived on the Spring Boot endpoint with the correct aggregated values. End-to-end, no mocks. When the frontend subscription was connected to the same WebSocket in a browser test, the integration was genuinely verified — not assumed.

### Q3 — Growth Layer
**"What would you do differently?"**

> I'd include the historical query requirements in the initial sprint scope, not scope them in during sprint 2. The first design covered real-time delivery. Historical queries were added as a sprint 2 extension when Bosch's ops lead asked "can we see last week's trend?"
>
> The problem: my initial schema didn't have a TimescaleDB composite index on `(metric_name, timestamp)`. The first historical query hit a sequential scan across 6 weeks of data — 4.2 seconds. I added the index that day and it dropped to 280ms, but it would have been in the schema from the start if I'd designed for the historical query requirement upfront.
>
> Lesson: for monitoring systems, historical query is almost always a requirement — not a nice-to-have that gets scoped later. Build the time-series schema right from sprint 1: TimescaleDB hypertable + composite index on the query dimensions.

---

## 5. Question Map — Where to Use This Story

| Behavioural Question | Angle from This Story |
|----------------------|-----------------------|
| "Tell me about a complex full-stack project you owned" | Full pipeline: Kafka Streams → Spring Boot WS → Angular |
| "Describe building a real-time system" | WebSocket push replacing polling; 2-second tumbling window |
| "When did you make backend architecture decisions?" | Kafka Streams choice; TimescaleDB hypertable design |
| "Tell me about delivering for a specific customer" | Bosch operators' fault detection requirement |
| "Describe a time you handled ambiguity in requirements" | Historical queries added mid-project; schema adaptation |
| "Give an example of technical ownership across layers" | Spring Boot + Kafka + TimescaleDB + Angular — all me |

---

## 6. Numbers Reference Card

| Metric | Before | After |
|--------|--------|-------|
| Dashboard data staleness | 10 seconds (polling) | <2 seconds (WebSocket push) |
| Concurrent operator views | 1 shared | 3 independent parameterised |
| Historical data queryable | None | 90 days |
| TimescaleDB 90-day range query time | N/A (first attempt 4.2s w/o index) | 280ms with composite index |
| Kafka aggregation window | 10-second batch | 2-second tumbling window |

---

## 7. Related Topics — What to Study Next
- **Topic 307 — Real-time Dashboard** — the technical deep dive behind this story; Kafka Streams, TimescaleDB, WebSocket STOMP, and the Angular chart integration all in full detail
- **Topic 328 — How to Talk About Backend Decisions** — the Kafka Streams and TimescaleDB choices are backend decisions narrated in a behavioural context; this topic coaches the framing
- **Topic 325 — Story 7 (Oracle REST APIs)** — another end-to-end backend-heavy story; prepare both to demonstrate range

---

*Part 20 · Story 6: Bosch Real-Time Dashboards · Full Stack Interview Guide · Hruday D · 2026*
