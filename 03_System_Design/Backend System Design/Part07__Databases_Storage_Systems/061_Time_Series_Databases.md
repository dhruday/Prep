# 61. Time-Series Databases

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Time-Series Databases**: Specialized databases optimized for storing and querying time-stamped data—metrics, events, sensor readings—with efficient compression, retention policies, and aggregations over time ranges.

### Core Concept

**What it is:**
- **Time-series data**: Data points indexed by timestamp (metrics, logs, events, sensor readings)
- **Append-only**: Data written once, rarely updated (immutable past)
- **Time-based queries**: Range queries (last hour, last 30 days), aggregations (avg, max, rate)
- **High write throughput**: Millions of data points per second
- **Automatic retention**: Delete old data based on TTL policies

**Why it exists:**
- **Monitoring**: Infrastructure metrics (CPU, memory, disk), application metrics (latency, error rate)
- **IoT**: Sensor readings (temperature, pressure, vibration) from millions of devices
- **Financial**: Stock prices, trading volumes, tick data
- **Analytics**: User events, page views, click streams
- **Observability**: Logs, traces, metrics (OpenTelemetry)

**Simple analogy:**
- **Traditional database** (SQL): Like a filing cabinet with folders
  - Store current state: `users` table with latest data
  - Update in place: `UPDATE users SET balance = 100`
  - Query: "What is Alice's balance NOW?"
  
- **Time-series database**: Like a ledger with timestamped entries
  - Store history: Every data point with timestamp
  - Append-only: Never update, only insert new points
  - Query: "What was Alice's balance at 2pm yesterday? Show hourly trend for last week."

### Key Components

**1. Data Model (InfluxDB Example)**

```
Measurement (like table): cpu_usage
Tags (indexed dimensions): host=server1, region=us-west
Fields (actual values): usage_percent=75.5, cores_used=3
Timestamp: 2024-01-15T10:30:00Z

Complete data point:
cpu_usage,host=server1,region=us-west usage_percent=75.5,cores_used=3 1705318200000000000
└─────────┘ └──────────────────────────┘ └────────────────────────┘ └──────────────────┘
Measurement        Tags                      Fields                    Timestamp (nanos)
```

**2. Time-Based Aggregations**

```sql
-- Average CPU usage per hour (last 24 hours)
SELECT 
  time_bucket('1 hour', time) AS hour,
  host,
  AVG(usage_percent) AS avg_cpu
FROM cpu_usage
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY hour, host
ORDER BY hour DESC;

-- Rate of HTTP requests per second
SELECT 
  time_bucket('1 minute', time) AS minute,
  (MAX(request_count) - MIN(request_count)) / 60 AS requests_per_second
FROM http_metrics
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY minute;
```

**3. Retention Policies**

```
Policy: Keep raw data for 7 days, then delete
Policy: Keep 1-minute averages for 30 days
Policy: Keep 1-hour averages for 1 year
Policy: Keep daily averages forever

Automatic downsampling:
Raw data (10s interval) → 1-min avg → 1-hour avg → 1-day avg
   7 days                  30 days      1 year       Forever
```

### Popular Time-Series Databases

**InfluxDB:**
- Most popular TSDB
- Custom query language (InfluxQL, Flux)
- Built-in compression (10-20x storage reduction)
- Retention policies and downsampling
- Use cases: Monitoring, IoT, real-time analytics

**TimescaleDB:**
- PostgreSQL extension (SQL interface)
- Automatic partitioning (time-based chunks)
- Full SQL support (JOINs, CTEs, window functions)
- Continuous aggregates (materialized views)
- Use cases: Hybrid workloads (time-series + relational)

**Prometheus:**
- Pull-based monitoring system
- PromQL query language
- Multi-dimensional data model (labels)
- Service discovery and alerting
- Use cases: Kubernetes monitoring, microservices observability

**OpenTSDB:**
- Built on HBase/Bigtable
- Distributed, horizontally scalable
- Billions of metrics
- Use cases: Large-scale infrastructure monitoring

**Graphite:**
- Simple, whisper file format
- Carbon daemon for ingestion
- Graphite-web for visualization
- Use cases: Application metrics, dashboards

### Why Time-Series Databases Matter

**Business Impact:**
- **Observability**: Detect incidents before users complain (latency spike, error rate increase)
- **Cost optimization**: Identify waste (idle servers, over-provisioned resources)
- **Capacity planning**: Forecast growth based on historical trends
- **SLA monitoring**: Track 99.9% availability, P99 latency targets
- **IoT insights**: Predictive maintenance (equipment failure prediction)

**Role in interviews:**
- FAANG asks: "Design a metrics monitoring system"
- Scale questions: "Store 1 billion metrics per minute with sub-second query latency"
- Storage: "How would you compress time-series data?"
- Retention: "Design retention policies for metrics (raw, aggregated, archived)"

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔶 InfluxDB Architecture Deep Dive

#### Storage Engine (TSM - Time-Structured Merge Tree)

```
┌─────────────────────────────────────────────────────────────┐
│          INFLUXDB ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  WRITE PATH (Line Protocol)                        │    │
│  │  cpu,host=server1 value=75.5 1705318200000000000   │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  PARSER & VALIDATOR                                 │    │
│  │  - Parse measurement, tags, fields, timestamp       │    │
│  │  - Validate schema (field types consistent)         │    │
│  │  - Create series key: measurement + tags            │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  WAL (Write-Ahead Log)                              │    │
│  │  - Append to log file (durability)                  │    │
│  │  - Fsync to disk                                    │    │
│  │  - Segments: 10 MB each                             │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CACHE (In-Memory)                                  │    │
│  │  - Sorted map: series key → time-ordered values     │    │
│  │  - Max size: 25 MB (default, configurable)          │    │
│  │  - Write batches to cache                           │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │ When cache full                     │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TSM FILE (Time-Structured Merge Tree)              │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ INDEX                                     │      │    │
│  │  │ - Series keys (measurement + tags)       │      │    │
│  │  │ - Field names                             │      │    │
│  │  │ - Time range per block                    │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ DATA BLOCKS (Compressed)                  │      │    │
│  │  │ ┌────────────────────────────────┐        │      │    │
│  │  │ │ Block 1: 10:00-10:05 (1000 pts)│        │      │    │
│  │  │ │ Compression: Delta + Gorilla   │        │      │    │
│  │  │ │ Size: 5 KB (from 16 KB raw)    │        │      │    │
│  │  │ └────────────────────────────────┘        │      │    │
│  │  │ ┌────────────────────────────────┐        │      │    │
│  │  │ │ Block 2: 10:05-10:10 (1000 pts)│        │      │    │
│  │  │ │ Compression: Delta + Gorilla   │        │      │    │
│  │  │ │ Size: 5 KB                     │        │      │    │
│  │  │ └────────────────────────────────┘        │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │  Properties:                                         │    │
│  │  - Immutable (never modified after write)           │    │
│  │  - Sorted by time within series                     │    │
│  │  - Typical compression: 10-20x                      │    │
│  └────────────────────────────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  COMPACTION (Background)                            │    │
│  │  - Merge multiple TSM files                         │    │
│  │  - Remove expired data (retention policy)           │    │
│  │  - Re-compress for better compression ratio         │    │
│  │  - Levels: L1 (hot), L2 (warm), L3 (cold)          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

READ PATH:
═════════

┌─────────────────────────────────────────────────────────────┐
│  QUERY: SELECT mean(value) FROM cpu WHERE time > now() - 1h │
│                        ↓                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  QUERY PLANNER                                      │    │
│  │  - Parse InfluxQL/Flux                              │    │
│  │  - Identify series (measurement + tag filters)      │    │
│  │  - Determine time range                             │    │
│  │  - Plan execution (scan cache + TSM files)          │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  INDEX LOOKUP                                       │    │
│  │  - Find series matching tags (inverted index)       │    │
│  │  - Example: host=server1 → series_id_123           │    │
│  │  - Filter by time range (skip files outside range)  │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  READ FROM CACHE (Hot Data)                         │    │
│  │  - In-memory data (last 25 MB)                      │    │
│  │  - O(log n) lookup in sorted map                    │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  READ FROM TSM FILES (Cold Data)                    │    │
│  │  - Read index to find blocks in time range          │    │
│  │  - Load blocks from disk (mmap or read)             │    │
│  │  - Decompress blocks (Gorilla, Snappy)              │    │
│  │  - Merge results (cache + TSM files)                │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AGGREGATION ENGINE                                 │    │
│  │  - Apply function (mean, sum, max, percentile)      │    │
│  │  - Group by time (time_bucket)                      │    │
│  │  - Return results                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

COMPRESSION TECHNIQUES:
═══════════════════════

1. Delta Encoding (Timestamps)
   Timestamps: [1705318200, 1705318210, 1705318220, 1705318230]
   Deltas:     [1705318200, +10, +10, +10]  ← Store base + deltas
   Compression: 64 bits → 8 bits per delta (8x compression)

2. Gorilla Compression (Float Values)
   Values: [75.5, 75.6, 75.4, 75.7, 75.5]
   - XOR consecutive values (similar values = few bits change)
   - Run-length encoding for repeated XOR patterns
   - Compression: 64 bits → 1-10 bits per value (average 12 bits)
   - Invented by Facebook for time-series data

3. Run-Length Encoding (Repeated Values)
   Values: [1, 1, 1, 1, 1, 2, 2, 2, 3, 3]
   Encoded: [(1, count=5), (2, count=3), (3, count=2)]

4. Dictionary Encoding (String Tags)
   Tags: ["server1", "server2", "server1", "server1", "server2"]
   Dictionary: {0: "server1", 1: "server2"}
   Encoded: [0, 1, 0, 0, 1]  ← Store integers, not strings

Typical Compression Ratios:
- Timestamps: 8-10x (delta encoding)
- Float metrics: 5-15x (Gorilla)
- Integer counters: 10-50x (delta + RLE)
- String tags: 3-5x (dictionary)
- Overall: 10-20x reduction (100 GB → 5-10 GB)
```

#### InfluxDB Data Model and Queries

```sql
-- ═══════════════════════════════════════════════════════════
-- InfluxDB Line Protocol (Write Format)
-- ═══════════════════════════════════════════════════════════

-- Format: measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp
-- Example:
cpu,host=server1,region=us-west usage_percent=75.5,cores_used=3 1705318200000000000

-- Breakdown:
-- Measurement: cpu (like table name)
-- Tags: host=server1, region=us-west (indexed, used for filtering)
-- Fields: usage_percent=75.5, cores_used=3 (actual values, not indexed)
-- Timestamp: 1705318200000000000 (nanoseconds since epoch)

-- Writing data (InfluxDB HTTP API)
POST /api/v2/write?org=myorg&bucket=metrics
Content-Type: text/plain

cpu,host=server1,region=us-west usage_percent=75.5,cores_used=3 1705318200000000000
mem,host=server1,region=us-west used_gb=24.3,available_gb=7.7 1705318200000000000
disk,host=server1,region=us-west,mount=/data used_percent=68.2 1705318200000000000

-- Batch writes (recommended for performance)
-- Write 1000-5000 points per batch

-- ═══════════════════════════════════════════════════════════
-- InfluxQL Queries (SQL-Like)
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. Basic Queries
-- ─────────────────────────────────────────────────────────

-- Select recent data
SELECT * FROM cpu
WHERE time > now() - 1h;

-- Filter by tags
SELECT usage_percent FROM cpu
WHERE host = 'server1' AND time > now() - 1h;

-- Multiple conditions
SELECT usage_percent FROM cpu
WHERE region = 'us-west' 
  AND (host = 'server1' OR host = 'server2')
  AND time > now() - 24h;

-- ─────────────────────────────────────────────────────────
-- 2. Aggregations
-- ─────────────────────────────────────────────────────────

-- Average CPU usage (last hour)
SELECT MEAN(usage_percent) FROM cpu
WHERE time > now() - 1h;

-- Max, min, percentiles
SELECT 
  MAX(usage_percent) AS max_cpu,
  MIN(usage_percent) AS min_cpu,
  PERCENTILE(usage_percent, 95) AS p95_cpu,
  PERCENTILE(usage_percent, 99) AS p99_cpu
FROM cpu
WHERE time > now() - 1h;

-- Count data points
SELECT COUNT(usage_percent) FROM cpu
WHERE time > now() - 1h;

-- ─────────────────────────────────────────────────────────
-- 3. Group By Time (Time Bucketing)
-- ─────────────────────────────────────────────────────────

-- Average CPU per 5 minutes (last hour)
SELECT MEAN(usage_percent) FROM cpu
WHERE time > now() - 1h
GROUP BY time(5m);

-- Per host, per 10 minutes
SELECT MEAN(usage_percent) FROM cpu
WHERE time > now() - 1h
GROUP BY time(10m), host;

-- Fill missing values (gaps in data)
SELECT MEAN(usage_percent) FROM cpu
WHERE time > now() - 1h
GROUP BY time(5m) fill(previous);  -- Options: null, none, linear, previous

-- ─────────────────────────────────────────────────────────
-- 4. Rate and Derivative (For Counters)
-- ─────────────────────────────────────────────────────────

-- Rate of requests per second (from cumulative counter)
SELECT DERIVATIVE(MEAN(request_count), 1s) AS requests_per_second
FROM http_metrics
WHERE time > now() - 1h
GROUP BY time(1m);

-- Non-negative derivative (handle counter resets)
SELECT NON_NEGATIVE_DERIVATIVE(MEAN(request_count), 1s) AS rps
FROM http_metrics
WHERE time > now() - 1h
GROUP BY time(1m);

-- Difference between consecutive points
SELECT DIFFERENCE(request_count) FROM http_metrics
WHERE time > now() - 1h;

-- ─────────────────────────────────────────────────────────
-- 5. Continuous Queries (Automated Downsampling)
-- ─────────────────────────────────────────────────────────

-- Create continuous query (runs automatically)
CREATE CONTINUOUS QUERY "cpu_1h_mean" ON "metrics"
BEGIN
  SELECT MEAN(usage_percent) AS usage_percent
  INTO "metrics"."one_year"."cpu_1h"
  FROM "metrics"."one_week"."cpu"
  GROUP BY time(1h), *
END;

-- Explanation:
-- - Runs every 1 hour
-- - Reads from "cpu" measurement in "one_week" retention policy
-- - Writes 1-hour averages to "cpu_1h" in "one_year" retention policy
-- - GROUP BY * preserves all tags

-- ─────────────────────────────────────────────────────────
-- 6. Retention Policies
-- ─────────────────────────────────────────────────────────

-- Create retention policy (auto-delete old data)
CREATE RETENTION POLICY "one_week" ON "metrics" 
  DURATION 7d 
  REPLICATION 1 
  DEFAULT;

CREATE RETENTION POLICY "one_year" ON "metrics"
  DURATION 365d
  REPLICATION 1;

-- Use specific retention policy in query
SELECT MEAN(usage_percent) FROM "one_year"."cpu_1h"
WHERE time > now() - 30d;

-- Downsampling strategy:
-- Raw data: 10-second interval, keep 7 days
-- 1-minute avg: keep 30 days
-- 1-hour avg: keep 1 year
-- 1-day avg: keep forever

-- ═══════════════════════════════════════════════════════════
-- Flux Queries (New Query Language, More Powerful)
-- ═══════════════════════════════════════════════════════════

-- Basic query
from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r.host == "server1")
  |> filter(fn: (r) => r._field == "usage_percent")

-- Aggregation with window
from(bucket: "metrics")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> aggregateWindow(every: 5m, fn: mean)

-- Join multiple measurements
cpu = from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_percent")

mem = from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "mem")
  |> filter(fn: (r) => r._field == "used_percent")

join(tables: {cpu: cpu, mem: mem}, on: ["_time", "host"])

-- Percentile calculation
from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_percent")
  |> aggregateWindow(every: 5m, fn: (column, tables=<-) => 
      tables |> quantile(q: 0.95, column: column)
    )
```

---

### 🔶 TimescaleDB Architecture Deep Dive

```
┌─────────────────────────────────────────────────────────────┐
│          TIMESCALEDB ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TimescaleDB = PostgreSQL + Time-Series Optimizations        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  HYPERTABLE (Virtual Table)                         │    │
│  │  "cpu_usage" - Appears as single table to user      │    │
│  │                                                      │    │
│  │  CREATE TABLE cpu_usage (                           │    │
│  │    time TIMESTAMPTZ NOT NULL,                       │    │
│  │    host TEXT,                                       │    │
│  │    usage_percent NUMERIC                            │    │
│  │  );                                                  │    │
│  │                                                      │    │
│  │  SELECT create_hypertable('cpu_usage', 'time');     │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │ Automatically partitions into...    │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CHUNKS (Time-Based Partitions)                     │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ Chunk 1: 2024-01-15 00:00 - 23:59       │      │    │
│  │  │ Table: _hyper_1_1_chunk                  │      │    │
│  │  │ Size: 500 MB                             │      │    │
│  │  │ Indexes: (time), (time, host)            │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ Chunk 2: 2024-01-16 00:00 - 23:59       │      │    │
│  │  │ Table: _hyper_1_2_chunk                  │      │    │
│  │  │ Size: 520 MB                             │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ Chunk 3: 2024-01-17 00:00 - 23:59       │      │    │
│  │  │ Table: _hyper_1_3_chunk                  │      │    │
│  │  │ Size: 495 MB                             │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │  Properties:                                         │    │
│  │  - Chunk interval: 1 day (default, configurable)    │    │
│  │  - Each chunk is separate PostgreSQL table          │    │
│  │  - Queries span relevant chunks only (pruning)      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CONTINUOUS AGGREGATES (Materialized Views)         │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ CREATE MATERIALIZED VIEW cpu_1h AS       │      │    │
│  │  │   SELECT                                  │      │    │
│  │  │     time_bucket('1 hour', time) AS hour, │      │    │
│  │  │     host,                                 │      │    │
│  │  │     AVG(usage_percent) AS avg_cpu        │      │    │
│  │  │   FROM cpu_usage                          │      │    │
│  │  │   GROUP BY hour, host;                    │      │    │
│  │  │                                           │      │    │
│  │  │ SELECT add_continuous_aggregate_policy(   │      │    │
│  │  │   'cpu_1h',                               │      │    │
│  │  │   start_offset => INTERVAL '2 hours',     │      │    │
│  │  │   end_offset => INTERVAL '1 hour',        │      │    │
│  │  │   schedule_interval => INTERVAL '1 hour'  │      │    │
│  │  │ );                                        │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │  Benefits:                                           │    │
│  │  - Pre-computed aggregates (instant queries)        │    │
│  │  - Automatic refresh (scheduled)                    │    │
│  │  - Real-time aggregation (combines materialized +   │    │
│  │    recent raw data)                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  COMPRESSION (Native Columnar)                      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │ ALTER TABLE cpu_usage SET (                │      │    │
│  │  │   timescaledb.compress,                    │      │    │
│  │  │   timescaledb.compress_segmentby = 'host', │      │    │
│  │  │   timescaledb.compress_orderby = 'time'    │      │    │
│  │  │ );                                         │      │    │
│  │  │                                            │      │    │
│  │  │ SELECT add_compression_policy(             │      │    │
│  │  │   'cpu_usage',                             │      │    │
│  │  │   INTERVAL '7 days'                        │      │    │
│  │  │ );                                         │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │  Compression techniques:                             │    │
│  │  - Delta encoding (timestamps)                      │    │
│  │  - Gorilla compression (floats)                     │    │
│  │  - Dictionary encoding (repeated values)            │    │
│  │  - Typical ratio: 10-20x compression                │    │
│  │  - Query compressed chunks directly (no decompress) │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  RETENTION POLICY (Auto-Delete Old Data)            │    │
│  │  SELECT add_retention_policy(                       │    │
│  │    'cpu_usage',                                     │    │
│  │    INTERVAL '30 days'                               │    │
│  │  );                                                 │    │
│  │  - Automatically drops chunks older than 30 days    │    │
│  │  - Runs in background (scheduled job)               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### TimescaleDB Queries (Full PostgreSQL SQL)

```sql
-- ═══════════════════════════════════════════════════════════
-- TimescaleDB SQL Queries (Full PostgreSQL Support)
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. Create Hypertable
-- ─────────────────────────────────────────────────────────

-- Create regular table
CREATE TABLE cpu_usage (
  time TIMESTAMPTZ NOT NULL,
  host TEXT NOT NULL,
  region TEXT,
  usage_percent NUMERIC,
  cores_used INTEGER
);

-- Convert to hypertable (auto-partition by time)
SELECT create_hypertable('cpu_usage', 'time');

-- Create indexes (applied to all chunks automatically)
CREATE INDEX ON cpu_usage (host, time DESC);
CREATE INDEX ON cpu_usage (region, time DESC);

-- ─────────────────────────────────────────────────────────
-- 2. Insert Data
-- ─────────────────────────────────────────────────────────

-- Single insert
INSERT INTO cpu_usage (time, host, region, usage_percent, cores_used)
VALUES (NOW(), 'server1', 'us-west', 75.5, 3);

-- Batch insert (recommended)
INSERT INTO cpu_usage (time, host, region, usage_percent, cores_used)
VALUES 
  (NOW(), 'server1', 'us-west', 75.5, 3),
  (NOW(), 'server2', 'us-east', 68.2, 2),
  (NOW(), 'server3', 'eu-central', 82.1, 4);

-- ─────────────────────────────────────────────────────────
-- 3. Time-Bucketing Queries
-- ─────────────────────────────────────────────────────────

-- Average CPU per hour (last 24 hours)
SELECT 
  time_bucket('1 hour', time) AS hour,
  host,
  AVG(usage_percent) AS avg_cpu,
  MAX(usage_percent) AS max_cpu,
  MIN(usage_percent) AS min_cpu
FROM cpu_usage
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY hour, host
ORDER BY hour DESC, host;

-- Per 5 minutes (last hour)
SELECT 
  time_bucket('5 minutes', time) AS bucket,
  AVG(usage_percent) AS avg_cpu
FROM cpu_usage
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY bucket
ORDER BY bucket DESC;

-- Gap filling (insert NULL for missing intervals)
SELECT 
  time_bucket_gapfill('5 minutes', time) AS bucket,
  host,
  AVG(usage_percent) AS avg_cpu
FROM cpu_usage
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY bucket, host
ORDER BY bucket DESC, host;

-- Interpolate missing values (linear interpolation)
SELECT 
  time_bucket_gapfill('5 minutes', time) AS bucket,
  host,
  interpolate(AVG(usage_percent)) AS avg_cpu
FROM cpu_usage
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY bucket, host
ORDER BY bucket DESC, host;

-- ─────────────────────────────────────────────────────────
-- 4. Window Functions (PostgreSQL Native)
-- ─────────────────────────────────────────────────────────

-- Moving average (5-point window)
SELECT 
  time,
  host,
  usage_percent,
  AVG(usage_percent) OVER (
    PARTITION BY host 
    ORDER BY time 
    ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
  ) AS moving_avg
FROM cpu_usage
WHERE time > NOW() - INTERVAL '1 hour'
ORDER BY host, time;

-- Rank hosts by CPU usage (per time bucket)
SELECT 
  time_bucket('1 hour', time) AS hour,
  host,
  AVG(usage_percent) AS avg_cpu,
  RANK() OVER (PARTITION BY time_bucket('1 hour', time) ORDER BY AVG(usage_percent) DESC) AS rank
FROM cpu_usage
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY hour, host
ORDER BY hour DESC, rank;

-- Lag function (compare with previous value)
SELECT 
  time,
  host,
  usage_percent,
  LAG(usage_percent) OVER (PARTITION BY host ORDER BY time) AS previous_value,
  usage_percent - LAG(usage_percent) OVER (PARTITION BY host ORDER BY time) AS delta
FROM cpu_usage
WHERE time > NOW() - INTERVAL '1 hour'
ORDER BY host, time;

-- ─────────────────────────────────────────────────────────
-- 5. Continuous Aggregates (Materialized Views)
-- ─────────────────────────────────────────────────────────

-- Create continuous aggregate (hourly averages)
CREATE MATERIALIZED VIEW cpu_usage_hourly
WITH (timescaledb.continuous) AS
SELECT 
  time_bucket('1 hour', time) AS hour,
  host,
  AVG(usage_percent) AS avg_cpu,
  MAX(usage_percent) AS max_cpu,
  MIN(usage_percent) AS min_cpu,
  COUNT(*) AS sample_count
FROM cpu_usage
GROUP BY hour, host;

-- Add refresh policy (automatic updates)
SELECT add_continuous_aggregate_policy('cpu_usage_hourly',
  start_offset => INTERVAL '2 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);

-- Query continuous aggregate (instant, pre-computed)
SELECT * FROM cpu_usage_hourly
WHERE hour > NOW() - INTERVAL '7 days'
ORDER BY hour DESC, host;

-- Real-time aggregation (combine materialized + recent raw data)
SELECT * FROM cpu_usage_hourly
WHERE hour > NOW() - INTERVAL '1 day'
WITH DATA;  -- Includes non-materialized recent data

-- ─────────────────────────────────────────────────────────
-- 6. Compression
-- ─────────────────────────────────────────────────────────

-- Enable compression
ALTER TABLE cpu_usage SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'host',  -- Group by host
  timescaledb.compress_orderby = 'time DESC'  -- Sort by time
);

-- Add compression policy (compress chunks older than 7 days)
SELECT add_compression_policy('cpu_usage', INTERVAL '7 days');

-- Manually compress specific chunk
SELECT compress_chunk('_timescaledb_internal._hyper_1_5_chunk');

-- Decompress chunk (rare, for updates)
SELECT decompress_chunk('_timescaledb_internal._hyper_1_5_chunk');

-- Check compression stats
SELECT 
  pg_size_pretty(before_compression_total_bytes) AS before,
  pg_size_pretty(after_compression_total_bytes) AS after,
  (before_compression_total_bytes::NUMERIC / after_compression_total_bytes::NUMERIC)::INT AS compression_ratio
FROM timescaledb_information.compressed_chunk_stats;

-- ─────────────────────────────────────────────────────────
-- 7. Retention Policy (Auto-Delete)
-- ─────────────────────────────────────────────────────────

-- Drop chunks older than 30 days
SELECT add_retention_policy('cpu_usage', INTERVAL '30 days');

-- Remove retention policy
SELECT remove_retention_policy('cpu_usage');

-- Manually drop old chunks
SELECT drop_chunks('cpu_usage', INTERVAL '90 days');

-- ─────────────────────────────────────────────────────────
-- 8. JOINs with Relational Data (Hybrid Queries)
-- ─────────────────────────────────────────────────────────

-- Join time-series data with relational table
CREATE TABLE servers (
  hostname TEXT PRIMARY KEY,
  datacenter TEXT,
  instance_type TEXT,
  cost_per_hour NUMERIC
);

INSERT INTO servers VALUES
  ('server1', 'us-west-1a', 'c5.2xlarge', 0.34),
  ('server2', 'us-east-1b', 'c5.4xlarge', 0.68),
  ('server3', 'eu-central-1c', 'c5.xlarge', 0.17);

-- Query: Average CPU + server metadata
SELECT 
  time_bucket('1 hour', cpu.time) AS hour,
  cpu.host,
  s.datacenter,
  s.instance_type,
  AVG(cpu.usage_percent) AS avg_cpu,
  s.cost_per_hour
FROM cpu_usage cpu
JOIN servers s ON cpu.host = s.hostname
WHERE cpu.time > NOW() - INTERVAL '24 hours'
GROUP BY hour, cpu.host, s.datacenter, s.instance_type, s.cost_per_hour
ORDER BY hour DESC, cpu.host;

-- Cost analysis (CPU utilization × cost)
SELECT 
  s.datacenter,
  SUM(AVG(cpu.usage_percent) / 100 * s.cost_per_hour) AS estimated_cost
FROM cpu_usage cpu
JOIN servers s ON cpu.host = s.hostname
WHERE cpu.time > NOW() - INTERVAL '24 hours'
GROUP BY s.datacenter
ORDER BY estimated_cost DESC;
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Infrastructure Monitoring System (Prometheus + InfluxDB)

**Requirements:**
- 10,000 servers (VMs, containers)
- 50 metrics per server (CPU, memory, disk, network, processes)
- Scrape interval: 15 seconds
- Retention: Raw data 7 days, 1-minute aggregates 30 days, 1-hour aggregates 1 year
- Query load: 1,000 queries/minute (dashboards, alerts)
- High availability: 3x replication

**Capacity Estimation:**

```
Data Points per Second:
= 10,000 servers × 50 metrics × (1 scrape / 15 seconds)
= 10,000 × 50 / 15
= 33,333 data points/second

Data Points per Day:
= 33,333 points/sec × 86,400 seconds/day
= 2.88 billion points/day

Storage per Data Point (Uncompressed):
= 8 bytes (timestamp, int64) + 8 bytes (value, float64) + 50 bytes (tags, strings)
= 66 bytes per point

Raw Storage per Day:
= 2.88 billion × 66 bytes
= 190 GB/day

With Compression (10x typical):
= 190 GB / 10 = 19 GB/day

Raw Data Retention (7 days):
= 19 GB/day × 7 = 133 GB

1-Minute Aggregates (30 days):
= 10,000 servers × 50 metrics × (1 point / 60 sec) × 86,400 sec/day
= 720 million points/day
= 720M × 66 bytes / 10 compression = 4.7 GB/day
= 4.7 GB × 30 days = 141 GB

1-Hour Aggregates (365 days):
= 10,000 servers × 50 metrics × 24 hours/day
= 12 million points/day
= 12M × 66 bytes / 10 = 79 MB/day
= 79 MB × 365 days = 29 GB

Total Storage (Single Instance):
= 133 GB (raw) + 141 GB (1-min) + 29 GB (1-hour)
= 303 GB

With 3x Replication:
= 303 GB × 3 = 909 GB ≈ 1 TB

With Growth Buffer (20%):
= 1 TB × 1.2 = 1.2 TB

Write Throughput:
= 33,333 writes/second

Peak Write Throughput (2x average, bursts):
= 33,333 × 2 = 66,667 writes/second

Read Throughput (Query Load):
= 1,000 queries/minute = 16.7 queries/second
= Average query scans 1 hour of data (216,000 points)
= 16.7 queries × 216,000 points = 3.6M points/second read
```

**InfluxDB Cluster Configuration:**

```
Option 1: Single Node (Small Scale)
- Instance: AWS r5.2xlarge (8 vCPU, 64 GB RAM)
- Storage: 2 TB SSD (EBS gp3)
- Cost: $0.504/hour + $200/month storage = $569/month
- Capacity: 50k writes/sec, 1k queries/sec
- Limitation: No high availability (single point of failure)

Option 2: Clustered (InfluxDB Enterprise)
- 3 data nodes (write/query)
  - Instance: r5.2xlarge (8 vCPU, 64 GB RAM) each
  - Storage: 500 GB SSD each (with 3x replication = 1.5 TB total)
  - Cost: $0.504/hour × 3 = $1.512/hour = $1,104/month
  - Storage: $150/month × 3 = $450/month
  - Total: $1,554/month

- 2 meta nodes (cluster coordination, consensus)
  - Instance: t3.medium (2 vCPU, 4 GB RAM) each
  - Cost: $0.0416/hour × 2 = $61/month

Total Cluster Cost: $1,615/month

Capacity:
- Write throughput: 150k writes/sec (50k per node × 3)
- Read throughput: 3k queries/sec (1k per node × 3)
- Availability: 99.9% (survives 1 node failure)

Option 3: InfluxDB Cloud (Managed)
- Usage-based pricing:
  - Writes: $0.25 per 1M writes
  - Storage: $0.25/GB/month
  - Queries: $0.002 per query execution second

Monthly cost:
= (33k writes/sec × 86,400 sec/day × 30 days) / 1M × $0.25
= 86 billion writes × $0.25 / 1M = $21,500/month (writes)
= 1 TB × $0.25 = $250/month (storage)
= Total: ~$21,750/month (expensive for high-volume!)

Recommendation: Self-hosted cluster ($1,615/month) for cost efficiency
```

**Prometheus Configuration (Scraping):**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s  # Scrape targets every 15 seconds
  evaluation_interval: 15s  # Evaluate alerting rules every 15 seconds
  external_labels:
    cluster: 'prod'
    region: 'us-west'

# Remote write to InfluxDB (long-term storage)
remote_write:
  - url: "http://influxdb-cluster:8086/api/v1/prom/write?db=metrics"
    queue_config:
      capacity: 10000
      max_shards: 50
      max_samples_per_send: 5000

# Scrape configs
scrape_configs:
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['server1:9100', 'server2:9100', ...]  # 10,000 servers
    scrape_timeout: 10s

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

# Storage (local, short-term)
storage:
  tsdb:
    path: /prometheus/data
    retention.time: 15d  # Keep 15 days locally
    retention.size: 500GB  # Max 500 GB
```

**Performance Benchmarks:**

```
InfluxDB Write Performance:
- Single node: 50,000-100,000 points/second (batch size 5,000)
- Clustered: 150,000-300,000 points/second (3 nodes)
- Bottleneck: Disk I/O (use fast SSDs, NVMe preferred)

InfluxDB Read Performance:
- Simple query (1 series, 1 hour): 10-50 ms
- Complex aggregation (100 series, 24 hours): 100-500 ms
- Depends on: Cache hit rate (page cache), compression ratio, query complexity

TimescaleDB Write Performance:
- Single node: 100,000-200,000 rows/second (batch size 1,000)
- Hypertable chunking overhead: ~5% (vs plain PostgreSQL)
- With compression: 50,000-100,000 rows/second (compress on write)

TimescaleDB Read Performance:
- Time-range query (1 day, indexed): 50-200 ms
- Aggregation query (1 week, continuous aggregate): 10-50 ms (pre-computed)
- Full table scan (no index): Seconds to minutes (avoid!)

Prometheus Query Performance:
- Instant query (current value): 10-100 ms
- Range query (1 hour): 100-500 ms
- Complex PromQL (rate + aggregation): 500-2000 ms
- Bottleneck: Decompression, aggregation (CPU-bound)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Time-Series Database Comparison

```
┌─────────────────────────────────────────────────────────────┐
│          TIME-SERIES DATABASE COMPARISON                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┬──────────┬──────────┬──────────┬────────┐│
│  │ Feature      │ InfluxDB │TimescaleDB│Prometheus│Graphite││
│  ├──────────────┼──────────┼──────────┼──────────┼────────┤│
│  │ Data Model   │ Metrics  │ Relational│ Metrics  │ Metrics││
│  │              │ (measure,│ (SQL table│ (labels) │ (paths)││
│  │              │tags,field│           │          │        ││
│  │ Query Lang   │ InfluxQL,│ SQL       │ PromQL   │ Simple ││
│  │              │ Flux     │ (full PG) │          │ API    ││
│  │ Compression  │ 10-20x   │ 10-20x    │ 10x      │ 3-5x   ││
│  │ Retention    │ Built-in │ Built-in  │ Manual   │ Manual ││
│  │ Downsampling │ CQ auto  │ CQ auto   │ Manual   │ Manual ││
│  │ HA/Cluster   │Enterprise│PostgreSQL │Federation│Manual  ││
│  │              │ ($$$)    │ HA        │          │        ││
│  │ Horizontal   │ Limited  │ Limited   │ Yes      │ No     ││
│  │ Scaling      │          │           │(sharding)│        ││
│  │ SQL Support  │ No       │ Yes (full)│ No       │ No     ││
│  │ JOINs        │ No       │ Yes       │ No       │ No     ││
│  │ Use Case     │ General  │ Hybrid    │ Monitoring│ Legacy││
│  │              │ TSDB     │ TSDB+RDBMS│ (K8s)    │ metrics││
│  └──────────────┴──────────┴──────────┴──────────┴────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘

WHEN TO USE EACH:
═════════════════

InfluxDB:
✅ Pure time-series workload (metrics, IoT, events)
✅ High write throughput (millions of points/second)
✅ Built-in downsampling and retention (continuous queries)
✅ Custom query language acceptable (InfluxQL/Flux)
✅ Cloud-native, easy to operate
❌ No SQL (can't JOIN with other data)
❌ Limited horizontal scaling (Enterprise only)
❌ Clustering expensive (Enterprise license)

TimescaleDB:
✅ Hybrid workload (time-series + relational data)
✅ SQL required (existing tools, BI dashboards)
✅ JOINs needed (correlate metrics with metadata)
✅ PostgreSQL ecosystem (extensions, tools, expertise)
✅ Advanced analytics (window functions, CTEs)
❌ More complex operations (PostgreSQL tuning)
❌ Slower writes than specialized TSDB (still fast)

Prometheus:
✅ Kubernetes/microservices monitoring
✅ Pull-based scraping (service discovery)
✅ Built-in alerting (Alertmanager)
✅ Horizontal scaling (federation, sharding)
✅ Open-source, no licensing costs
❌ Short retention (days to weeks, not months/years)
❌ Limited query language (PromQL, no JOINs)
❌ No long-term storage (use remote write to InfluxDB/Thanos)

Graphite:
✅ Legacy systems (already deployed)
✅ Simple metric paths (app.server.cpu.usage)
✅ Lightweight, minimal resource usage
❌ Outdated (limited features vs modern TSDBs)
❌ Manual retention management (storage-schemas.conf)
❌ Poor compression (3-5x vs 10-20x)
❌ No clustering (single node or manual sharding)

Hybrid Architecture (Production Pattern):
- Prometheus: Scrape metrics, short-term storage (15 days), alerting
- InfluxDB/Thanos: Long-term storage (1 year+), downsampling, queries
- TimescaleDB: Business metrics (JOINs with orders, users, products)
- Grafana: Visualization (queries all three backends)
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### High Availability Patterns for Time-Series Data

```javascript
// ═══════════════════════════════════════════════════════════
// HA Pattern 1: Prometheus Federation (Hierarchical)
// ═══════════════════════════════════════════════════════════

/*
Architecture:
- Leaf Prometheus servers: Scrape local targets (region/cluster)
- Global Prometheus: Federate (pull) from leaf servers

┌─────────────────────────────────────────────────────────────┐
│  PROMETHEUS FEDERATION                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  GLOBAL PROMETHEUS                   │                   │
│  │  - Federates from regional servers   │                   │
│  │  - Stores aggregated metrics         │                   │
│  │  - Long-term queries                 │                   │
│  └────────────┬────────────┬────────────┘                   │
│               │            │                                 │
│      ┌────────┴────┐   ┌───┴─────────┐                      │
│      ↓             ↓   ↓             ↓                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Regional │ │ Regional │ │ Regional │                    │
│  │ Prom     │ │ Prom     │ │ Prom     │                    │
│  │ (US-West)│ │ (US-East)│ │ (EU)     │                    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                    │
│       │            │            │                           │
│       ↓            ↓            ↓                           │
│  [Targets]    [Targets]    [Targets]                        │
│  1000 servers 1000 servers 1000 servers                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
*/

// prometheus.yml (Global Prometheus)
const federationConfig = {
  scrape_configs: [
    {
      job_name: 'federate-us-west',
      scrape_interval: '30s',
      honor_labels: true,
      metrics_path: '/federate',
      params: {
        'match[]': [
          '{job="node-exporter"}',  // Federate specific jobs
          '{__name__=~"job:.*"}',   // Federate aggregated metrics
        ]
      },
      static_configs: [
        { targets: ['prometheus-us-west:9090'] }
      ]
    },
    {
      job_name: 'federate-us-east',
      scrape_interval: '30s',
      honor_labels: true,
      metrics_path: '/federate',
      params: {
        'match[]': ['{job="node-exporter"}', '{__name__=~"job:.*"}']
      },
      static_configs: [
        { targets: ['prometheus-us-east:9090'] }
      ]
    }
  ]
};

// Recording rules (Regional Prometheus - pre-aggregate)
const recordingRules = `
groups:
  - name: aggregation
    interval: 30s
    rules:
      # Per-cluster CPU average (reduce cardinality)
      - record: job:node_cpu_usage:avg
        expr: avg by (cluster, job) (node_cpu_usage)
      
      # Per-datacenter request rate
      - record: job:http_requests:rate5m
        expr: sum by (datacenter, job) (rate(http_requests_total[5m]))
`;

// Benefits:
// - Scalability: Each regional Prometheus handles subset of targets
// - Reduced cardinality: Global Prometheus stores aggregates only
// - Regional autonomy: Each region operates independently

// Drawbacks:
// - Increased latency: Global queries must fetch from regional servers
// - Single point of failure: Global Prometheus (mitigate with HA pair)

// ═══════════════════════════════════════════════════════════
// HA Pattern 2: InfluxDB Enterprise Cluster
// ═══════════════════════════════════════════════════════════

/*
Architecture:
- Meta nodes: Cluster coordination, consensus (Raft)
- Data nodes: Store time-series data, handle queries
- Hinted handoff: Buffer writes during node failures

┌─────────────────────────────────────────────────────────────┐
│  INFLUXDB ENTERPRISE CLUSTER                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  META NODES (Raft Consensus)         │                   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐│                   │
│  │  │ Meta 1  │ │ Meta 2  │ │ Meta 3  ││                   │
│  │  │ (Leader)│ │(Follower)│(Follower)││                   │
│  │  └─────────┘ └─────────┘ └─────────┘│                   │
│  │  - Cluster state, shard mappings     │                   │
│  │  - User/database management          │                   │
│  └──────────────────────────────────────┘                   │
│                       │                                      │
│                       ↓                                      │
│  ┌──────────────────────────────────────┐                   │
│  │  DATA NODES                           │                   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐│                   │
│  │  │ Data 1  │ │ Data 2  │ │ Data 3  ││                   │
│  │  │ Shard 1A│ │ Shard 1B│ │ Shard 1C││                   │
│  │  │ Shard 2A│ │ Shard 2B│ │ Shard 2C││                   │
│  │  └─────────┘ └─────────┘ └─────────┘│                   │
│  │  - Replication factor: 3             │                   │
│  │  - Each shard replicated to 3 nodes  │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
*/

// Write flow (with replication)
async function writeToInfluxDBCluster(point) {
  // Client connects to any data node (load balanced)
  const response = await fetch('http://influxdb-lb:8086/write?db=metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: `cpu,host=server1 value=75.5 ${Date.now() * 1000000}`
  });
  
  /*
  Behind the scenes:
  1. Data node receives write
  2. Determines shard owner (hash partition key)
  3. Writes to 3 replicas (RF=3)
  4. Returns success when majority (2/3) acknowledge
  5. If replica unavailable: Hinted handoff (buffer write, replay later)
  */
  
  return response.ok;
}

// Query flow (with load balancing)
async function queryInfluxDBCluster(query) {
  // Query any data node (load balanced)
  const response = await fetch(
    'http://influxdb-lb:8086/query?db=metrics&q=' + encodeURIComponent(query)
  );
  
  /*
  Behind the scenes:
  1. Data node receives query
  2. Determines which shards contain data (time range + series)
  3. Scatters query to shard owners (parallel)
  4. Each node executes query on local shards
  5. Coordinator merges results
  6. Returns to client
  */
  
  return await response.json();
}

// ═══════════════════════════════════════════════════════════
// HA Pattern 3: TimescaleDB PostgreSQL HA (Patroni + PgBouncer)
// ═══════════════════════════════════════════════════════════

/*
Architecture:
- Patroni: Manages PostgreSQL replication and failover
- PgBouncer: Connection pooling and load balancing
- etcd/Consul: Distributed configuration store

┌─────────────────────────────────────────────────────────────┐
│  TIMESCALEDB HA ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  CLIENTS                              │                   │
│  └────────────┬─────────────────────────┘                   │
│               ↓                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  HAProxy / PgBouncer                  │                   │
│  │  - Connection pooling                 │                   │
│  │  - Read/write split                   │                   │
│  └────────────┬─────────────────────────┘                   │
│               │                                              │
│       ┌───────┴────────┐                                     │
│       ↓                ↓                                     │
│  ┌─────────┐      ┌─────────┐                               │
│  │ Primary │      │ Standby │                               │
│  │ (Write) │ ───→ │ (Read)  │                               │
│  │ Patroni │  WAL │ Patroni │                               │
│  │TimescaleDB stream│TimescaleDB                               │
│  └────┬────┘      └─────────┘                               │
│       │                                                      │
│       ↓                                                      │
│  ┌─────────┐                                                 │
│  │  etcd   │ (Cluster state, leader election)               │
│  └─────────┘                                                 │
│                                                              │
│  Failover Process:                                           │
│  1. Primary fails (health check timeout)                     │
│  2. Patroni detects failure (via etcd heartbeat)             │
│  3. Standby promoted to primary (30-60 seconds)              │
│  4. HAProxy routes traffic to new primary                    │
│  5. Old primary recovers → Becomes standby                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
*/

// Connection example (Node.js with connection pooling)
const { Pool } = require('pg');

const pool = new Pool({
  host: 'timescaledb-haproxy',  // HAProxy endpoint
  port: 5432,
  database: 'metrics',
  user: 'app_user',
  password: process.env.DB_PASSWORD,
  max: 20,  // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Write (automatically routed to primary)
async function writeMetric(host, value) {
  await pool.query(
    'INSERT INTO cpu_usage (time, host, usage_percent) VALUES ($1, $2, $3)',
    [new Date(), host, value]
  );
}

// Read (can be routed to standby with read-only connection)
async function queryMetrics(host, interval) {
  const result = await pool.query(`
    SELECT 
      time_bucket($1, time) AS bucket,
      AVG(usage_percent) AS avg_cpu
    FROM cpu_usage
    WHERE host = $2 AND time > NOW() - $1 * 24
    GROUP BY bucket
    ORDER BY bucket DESC
  `, [interval, host]);
  
  return result.rows;
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Authentication and Authorization

```yaml
# ═══════════════════════════════════════════════════════════
# InfluxDB 2.x Authentication (Token-Based)
# ═══════════════════════════════════════════════════════════

# Create organization and bucket
influx org create --name myorg
influx bucket create --name metrics --org myorg --retention 7d

# Create user
influx user create --name app_user --org myorg

# Create token with limited permissions
influx auth create \
  --org myorg \
  --user app_user \
  --read-bucket 00000000deadbeef \  # Bucket ID
  --write-bucket 00000000deadbeef \
  --description "App metrics token"

# Token example: gZo4hs1K8Qm9hFjV3c2w...
# Use in API calls:
# Authorization: Token gZo4hs1K8Qm9hFjV3c2w...

# ═══════════════════════════════════════════════════════════
# TimescaleDB Authentication (PostgreSQL RBAC)
# ═══════════════════════════════════════════════════════════

# Create roles with limited permissions
CREATE ROLE metrics_writer WITH LOGIN PASSWORD 'secure_password';
CREATE ROLE metrics_reader WITH LOGIN PASSWORD 'secure_password';

# Grant write permissions
GRANT INSERT ON cpu_usage TO metrics_writer;
GRANT USAGE ON SCHEMA public TO metrics_writer;

# Grant read permissions
GRANT SELECT ON cpu_usage TO metrics_reader;
GRANT SELECT ON cpu_usage_hourly TO metrics_reader;  # Continuous aggregate

# Row-level security (limit data access by tag)
ALTER TABLE cpu_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY region_isolation ON cpu_usage
  FOR SELECT
  TO metrics_reader
  USING (region = current_setting('app.region'));

# Set session variable (application enforces region)
SET app.region = 'us-west';
SELECT * FROM cpu_usage;  -- Only sees us-west data

# ═══════════════════════════════════════════════════════════
# Prometheus Security (Basic Auth + TLS)
# ═══════════════════════════════════════════════════════════

# prometheus.yml
global:
  external_labels:
    cluster: 'prod'

# Enable basic authentication
# (Use nginx/Envoy reverse proxy for auth)
# Or use Prometheus with --web.config.file=

# web-config.yml
tls_server_config:
  cert_file: /etc/prometheus/cert.pem
  key_file: /etc/prometheus/key.pem

basic_auth_users:
  admin: $2y$10$... # bcrypt hash of password
  grafana: $2y$10$...

# Start Prometheus with auth
# ./prometheus --web.config.file=web-config.yml

# Grafana data source config
datasources:
  - name: Prometheus
    type: prometheus
    url: https://prometheus:9090
    basicAuth: true
    basicAuthUser: grafana
    secureJsonData:
      basicAuthPassword: secure_password
    jsonData:
      tlsSkipVerify: false
```

```javascript
// ═══════════════════════════════════════════════════════════
// Secure API Client (Node.js Example)
// ═══════════════════════════════════════════════════════════

const axios = require('axios');

// InfluxDB 2.x client (token-based)
class InfluxDBClient {
  constructor(url, token, org, bucket) {
    this.url = url;
    this.token = token;
    this.org = org;
    this.bucket = bucket;
  }
  
  async write(measurement, tags, fields, timestamp) {
    const tagStr = Object.entries(tags)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    const fieldStr = Object.entries(fields)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    const line = `${measurement},${tagStr} ${fieldStr} ${timestamp}`;
    
    await axios.post(
      `${this.url}/api/v2/write?org=${this.org}&bucket=${this.bucket}`,
      line,
      {
        headers: {
          'Authorization': `Token ${this.token}`,
          'Content-Type': 'text/plain'
        }
      }
    );
  }
  
  async query(fluxQuery) {
    const response = await axios.post(
      `${this.url}/api/v2/query?org=${this.org}`,
      {
        query: fluxQuery,
        type: 'flux'
      },
      {
        headers: {
          'Authorization': `Token ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/csv'
        }
      }
    );
    
    return response.data;
  }
}

// Usage
const client = new InfluxDBClient(
  'https://influxdb.example.com:8086',
  process.env.INFLUXDB_TOKEN,
  'myorg',
  'metrics'
);

await client.write(
  'cpu',
  { host: 'server1', region: 'us-west' },
  { usage_percent: 75.5, cores_used: 3 },
  Date.now() * 1000000  // Nanoseconds
);

// Input validation (prevent injection)
function validateMeasurementName(name) {
  // Only allow alphanumeric, underscore, hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Invalid measurement name');
  }
  return name;
}

function validateTagValue(value) {
  // Escape special characters
  return value.replace(/[,=\s]/g, '\\$&');
}

// Rate limiting (application-level)
const rateLimit = require('express-rate-limit');

const writeRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 1000,  // Max 1000 writes per minute per IP
  message: 'Too many write requests, please try again later'
});

app.post('/api/metrics', writeRateLimiter, async (req, res) => {
  // Handle write request
});
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Uber - Real-Time Metrics with M3DB

**Challenge:**
- 10M+ active trips/day
- Real-time driver/rider ETA calculations
- Track metrics: GPS locations, ETAs, trip status
- Sub-second query latency (dashboards, alerts)
- Billions of metrics per day
- Multi-datacenter deployment

**Solution: M3DB (Custom Time-Series Database)**

M3DB: Uber's open-source TSDB (distributed, Cassandra-like architecture)

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│  UBER M3 ARCHITECTURE                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  APPLICATION SERVICES                 │                   │
│  │  - Driver app (GPS updates)           │                   │
│  │  - Rider app (ETA requests)           │                   │
│  │  - Routing service                    │                   │
│  └────────────┬─────────────────────────┘                   │
│               │ Emit metrics                                 │
│               ↓                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  M3 COORDINATOR (Aggregator)          │                   │
│  │  - Receive metrics from apps          │                   │
│  │  - Local aggregation (reduce volume)  │                   │
│  │  - Forward to M3DB                    │                   │
│  └────────────┬─────────────────────────┘                   │
│               │                                              │
│               ↓                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  M3DB CLUSTER (Storage Nodes)         │                   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐│                   │
│  │  │ Node 1  │ │ Node 2  │ │ Node 3  ││                   │
│  │  │ RF=3    │ │ RF=3    │ │ RF=3    ││                   │
│  │  └─────────┘ └─────────┘ └─────────┘│                   │
│  │  - Sharded by metric ID (consistent hashing│             │
│  │  - Replication factor: 3                   │             │
│  │  - Compression: ~12x (Gorilla algorithm)   │             │
│  └──────────────────────────────────────┘                   │
│                       │                                      │
│                       ↓                                      │
│  ┌──────────────────────────────────────┐                   │
│  │  M3 QUERY ENGINE                      │                   │
│  │  - PromQL-compatible                  │                   │
│  │  - Distributed queries                │                   │
│  │  - Downsampling on read               │                   │
│  └──────────────────────────────────────┘                   │
│                       │                                      │
│                       ↓                                      │
│  ┌──────────────────────────────────────┐                   │
│  │  GRAFANA DASHBOARDS                   │                   │
│  │  - Driver availability                │                   │
│  │  - ETAs (P50, P95, P99)               │                   │
│  │  - Trip volumes                       │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Metrics Tracked:**

```javascript
// Driver metrics (emitted every 5 seconds)
const driverMetrics = {
  measurement: 'driver_status',
  tags: {
    driver_id: 'drv_123',
    city: 'san_francisco',
    vehicle_type: 'uberx'
  },
  fields: {
    latitude: 37.7749,
    longitude: -122.4194,
    status: 'available',  // available, on_trip, offline
    speed_mph: 35,
    battery_percent: 78
  },
  timestamp: Date.now() * 1000000  // Nanoseconds
};

// ETA metrics (computed per trip request)
const etaMetrics = {
  measurement: 'eta_calculation',
  tags: {
    trip_id: 'trip_456',
    city: 'san_francisco',
    surge_multiplier: '1.5x'
  },
  fields: {
    eta_seconds: 420,  // 7 minutes
    distance_miles: 3.2,
    computation_time_ms: 45
  },
  timestamp: Date.now() * 1000000
};

// Trip metrics (start, end, events)
const tripMetrics = {
  measurement: 'trip_events',
  tags: {
    trip_id: 'trip_456',
    driver_id: 'drv_123',
    rider_id: 'usr_789',
    city: 'san_francisco'
  },
  fields: {
    event: 'trip_completed',
    duration_seconds: 1200,  // 20 minutes
    distance_miles: 8.5,
    fare_usd: 28.50,
    rating: 5
  },
  timestamp: Date.now() * 1000000
};
```

**Key Queries:**

```promql
# PromQL queries (M3 Query Engine)

# Average ETA by city (last hour)
avg by (city) (eta_calculation_eta_seconds{city="san_francisco"}) [1h]

# P95 ETA (95th percentile)
histogram_quantile(0.95, rate(eta_calculation_eta_seconds_bucket[5m]))

# Active drivers per city (count unique driver_ids with recent status)
count by (city) (
  driver_status{status="available"} 
  offset 5m  # Last 5 minutes
)

# Trip completion rate (trips completed / trips started)
sum(rate(trip_events{event="trip_completed"}[5m])) 
/ 
sum(rate(trip_events{event="trip_started"}[5m]))

# Surge pricing trigger (when available drivers < threshold)
count by (city) (driver_status{status="available"}) < 100
```

**Results:**
- **Scale**: 2 billion+ metrics per minute
- **Latency**: P99 query latency <100ms (real-time dashboards)
- **Compression**: 12x (60 GB raw → 5 GB compressed per day per namespace)
- **Retention**: 48 hours raw, 30 days aggregated (1-minute), 1 year (1-hour)
- **Availability**: 99.99% uptime (multi-DC replication)

**Key Lessons:**
1. Local aggregation (M3 Coordinator) reduces write volume 10x (aggregate before writing to DB)
2. Sharding by metric ID (not time) enables horizontal scaling
3. Gorilla compression critical for cost (12x reduction)
4. Downsampling essential (raw 48h, 1-min 30d, 1-hour 1yr)
5. PromQL compatibility enables standard tooling (Grafana)

---

### Example 2: Netflix - Monitoring with Atlas (Custom TSDB)

**Challenge:**
- 200M+ subscribers worldwide
- 100k+ microservices instances
- 2 billion metrics per minute
- Real-time alerting (video playback errors, API latency)
- Multi-region (AWS us-east-1, eu-west-1, ap-southeast-1)

**Solution: Netflix Atlas (In-Memory Time-Series Database)**

**Architecture:**

```
Atlas Design Principles:
1. In-memory first (fast queries, no disk I/O)
2. Dimensional tags (query by any dimension combination)
3. Stack language (powerful aggregations)
4. Near real-time (sub-second query latency)

┌─────────────────────────────────────────────────────────────┐
│  NETFLIX ATLAS ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  MICROSERVICES (100k instances)       │                   │
│  │  - Video streaming service            │                   │
│  │  - API gateway                        │                   │
│  │  - Recommendation engine              │                   │
│  └────────────┬─────────────────────────┘                   │
│               │ Emit metrics (Spectator library)             │
│               ↓                                              │
│  ┌──────────────────────────────────────┐                   │
│  │  ATLAS BACKENDS (Clustered)           │                   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐│                   │
│  │  │Backend 1│ │Backend 2│ │Backend 3││                   │
│  │  │(in-mem) │ │(in-mem) │ │(in-mem) ││                   │
│  │  └─────────┘ └─────────┘ └─────────┘│                   │
│  │  - Each backend stores subset of metrics│                │
│  │  - Hash sharding by metric name         │                │
│  │  - Aggregation pushed to backends        │                │
│  └──────────────────────────────────────┘                   │
│                       │                                      │
│                       ↓                                      │
│  ┌──────────────────────────────────────┐                   │
│  │  ATLAS QUERY LAYER                    │                   │
│  │  - Stack-based query language         │                   │
│  │  - Scatter-gather to backends         │                   │
│  │  - Real-time aggregation              │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Atlas Stack Language (Querying):**

```
# Atlas Stack Language (postfix notation)

# Example: Average video playback errors per region

# Query string:
name,playback.errors,:eq,    # Filter: metric name = playback.errors
region,:by,                  # Group by region
:sum,                        # Sum per group
:rate,                       # Convert to rate (per second)

# Equivalent SQL:
SELECT region, SUM(RATE(playback.errors)) 
FROM metrics 
WHERE name = 'playback.errors'
GROUP BY region;

# Complex query: P99 API latency, filtered by endpoint

name,api.latency,:eq,
endpoint,/api/recommendations,:eq,
:and,
0.99,:percentile

# Alert: API latency > 500ms

name,api.latency,:eq,
0.99,:percentile,
500,:gt,
:alert
```

**Metrics Example:**

```javascript
// Spectator (Netflix metric library)
const { Registry, Timer } = require('netflix-spectator');

const registry = new Registry();

// Measure API latency
class APIService {
  constructor() {
    this.latencyTimer = registry.timer('api.latency', {
      endpoint: '/api/recommendations',
      region: 'us-east-1',
      instance: process.env.HOSTNAME
    });
  }
  
  async getRecommendations(userId) {
    const start = Date.now();
    try {
      const recommendations = await this.fetchRecommendations(userId);
      this.latencyTimer.record(Date.now() - start);
      return recommendations;
    } catch (error) {
      // Record error metric
      registry.counter('api.errors', {
        endpoint: '/api/recommendations',
        error_type: error.name
      }).increment();
      throw error;
    }
  }
}

// Playback quality metrics
class VideoPlayer {
  recordPlaybackError(errorType) {
    registry.counter('playback.errors', {
      error_type: errorType,
      device_type: 'smart_tv',
      region: 'us-west',
      content_type: 'movie'
    }).increment();
  }
  
  recordBuffering(durationMs) {
    registry.timer('playback.buffering', {
      device_type: 'smart_tv',
      connection_type: 'wifi',
      video_quality: '4k'
    }).record(durationMs);
  }
}

// System metrics (memory, CPU)
setInterval(() => {
  registry.gauge('system.memory.used', {
    instance: process.env.HOSTNAME
  }).set(process.memoryUsage().heapUsed);
  
  registry.gauge('system.cpu.usage', {
    instance: process.env.HOSTNAME
  }).set(process.cpuUsage().user / 1000000);  // Convert to seconds
}, 10000);  // Every 10 seconds
```

**Results:**
- **Scale**: 2 billion metrics/minute across 3 AWS regions
- **Latency**: P99 query latency <500ms (in-memory aggregation)
- **Retention**: 3 hours in-memory (sufficient for real-time dashboards, alerts)
- **Cardinality**: Millions of unique time series (dimensional tags enable explosion)
- **Cost**: In-memory expensive but worth it (critical for video streaming quality)

**Key Lessons:**
1. In-memory acceptable for short retention (3 hours) with high value (real-time alerting)
2. Dimensional tags enable flexible queries (any tag combination)
3. Push aggregation to backends (reduce network transfer)
4. Stack language powerful but complex (learning curve)
5. Hybrid: Atlas (real-time) + long-term storage (S3 via Druid for historical queries)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Answer: "Explain time-series databases and when to use them"

**Answer:**
*"Time-series databases: Specialized databases optimized for time-stamped data—metrics, events, sensor readings—with efficient compression, retention policies, and time-based aggregations.*

*Data model: Each data point has timestamp (primary index), tags (dimensions for filtering), and fields (actual values). Example InfluxDB: cpu,host=server1,region=us-west usage=75.5 1705318200. Tags indexed (fast filtering by host/region), fields not indexed (store values only).*

*Storage engine (InfluxDB TSM): Write-ahead log (WAL) for durability, in-memory cache (25 MB sorted map), flush to immutable TSM files (Time-Structured Merge tree). Compression: Delta encoding timestamps (8-10x), Gorilla algorithm floats (5-15x, invented by Facebook), dictionary encoding strings. Typical: 10-20x compression (100 GB → 5-10 GB).*

*Append-only writes: Time-series data immutable past—never update old data, only insert new points. Enables sequential writes (fast), simplifies compaction (merge files, no in-place updates). Write throughput: InfluxDB 50-100k points/sec single node, TimescaleDB 100-200k rows/sec.*

*Time-based queries: Range queries (last hour, last 30 days), aggregations (avg, max, rate). InfluxDB: GROUP BY time(5m) creates 5-minute buckets. TimescaleDB: time_bucket('1 hour', time) PostgreSQL function. Prometheus: rate(http_requests[5m]) calculates request rate.*

*Retention policies: Auto-delete old data based on age. InfluxDB: CREATE RETENTION POLICY one_week DURATION 7d. TimescaleDB: add_retention_policy('table', INTERVAL '30 days'). Downsampling: Keep raw data 7 days, 1-minute averages 30 days, 1-hour averages 1 year. Reduces storage 100x while preserving trends.*

*Continuous aggregates: Pre-compute aggregations automatically. InfluxDB continuous queries: Run every hour, compute hourly averages, store in separate retention policy. TimescaleDB continuous aggregates: Materialized views with automatic refresh, real-time aggregation (combines materialized + recent raw data).*

*Use cases: Infrastructure monitoring (CPU, memory, disk, network), IoT (sensor readings from millions of devices), financial (stock prices, tick data), analytics (user events, page views), observability (logs, traces, metrics in OpenTelemetry).*

*When to use: High write throughput (millions points/sec), time-based queries (ranges, aggregations over time), automatic retention (delete old data), compression critical (storage costs). When NOT: General-purpose data (use RDBMS), complex JOINs across entities (use RDBMS), document data (use MongoDB), key-value lookups (use Redis).*

*Comparison: InfluxDB (custom query language InfluxQL/Flux, built-in downsampling, 10-20x compression, Enterprise clustering $$). TimescaleDB (PostgreSQL extension, full SQL support, JOINs with relational tables, automatic partitioning chunks). Prometheus (pull-based monitoring, PromQL, service discovery, built-in alerting, short retention push to remote storage).*

*Production pattern: Prometheus scrape metrics short-term (15 days) + alerting, InfluxDB/Thanos long-term storage (1 year+) + downsampling, TimescaleDB business metrics (JOINs with orders, users), Grafana visualization (queries all backends).*

*Real-world: Uber M3DB (2B metrics/minute, 12x compression Gorilla, 48h raw + 30d 1-min + 1yr 1-hour, P99 <100ms). Netflix Atlas (2B metrics/minute, in-memory 3h, dimensional tags, stack language, real-time alerting <500ms)."*

---

### Common Follow-Up Questions

**Q: "How do time-series databases achieve 10-20x compression?"**

**A:** *"Combination of four specialized compression techniques optimized for time-series patterns:*

*Technique 1: Delta encoding for timestamps. Timestamps monotonically increasing with regular intervals. Instead of storing absolute values, store base timestamp + deltas. Example: [1705318200, 1705318210, 1705318220, 1705318230] (4 × 64 bits = 256 bits) → [1705318200 (base), +10, +10, +10] (64 bits base + 3 × 8 bits deltas = 88 bits). Compression: 256/88 = 2.9x. With variable-byte encoding (smaller deltas = fewer bits), achieve 8-10x.*

*Technique 2: Gorilla compression for floating-point values. Invented by Facebook for time-series. Key insight: Consecutive values similar (e.g., CPU usage 75.5%, 75.6%, 75.4%). XOR consecutive values—similar values have few bits changed. Run-length encode XOR patterns (many zeros). Example: [75.5, 75.6, 75.4, 75.7] (4 × 64 bits = 256 bits) → XOR deltas (average 12 bits per value = 48 bits). Compression: 256/48 = 5.3x. With control bits and RLE, achieve 5-15x typical.*

*Technique 3: Run-length encoding for repeated values. Common in IoT (sensor offline → repeated zeros), counters (no activity → same value). Example: [1, 1, 1, 1, 1, 2, 2, 2, 3, 3] (10 × 64 bits = 640 bits) → [(value:1, count:5), (2, 3), (3, 2)] (3 × 72 bits = 216 bits). Compression: 640/216 = 3x. Real-world: 10-50x for sparse data.*

*Technique 4: Dictionary encoding for tags/strings. Tags repeated across many data points (host=server1 appears millions of times). Store dictionary {0: "server1", 1: "us-west", 2: "production"}, reference by integer. Example: ["server1", "us-west", "server1", "server1"] (4 × 64 bytes = 256 bytes) → Dictionary (64 bytes) + Integers [0, 1, 0, 0] (4 × 2 bytes = 8 bytes) = 72 bytes. Compression: 256/72 = 3.6x.*

*Combined compression: Multiply individual ratios. Example: Timestamps 8x × Values 10x × Tags 3x = 240x theoretical. Practice: ~10-20x (overhead from block headers, indexes, metadata).*

*InfluxDB TSM blocks: 1000 points typical per block. Block header (8 bytes), timestamps (compressed 1000 × 8 bits = 1 KB from 8 KB raw = 8x), values (compressed 1000 × 12 bits = 1.5 KB from 8 KB raw = 5.3x), tags (dictionary, ~300 bytes from 10 KB = 33x). Total: ~2.8 KB compressed from 26 KB raw = 9.3x. Add index overhead → 10-20x overall.*

*TimescaleDB compression: Native columnar (compress entire columns, not rows). Gorilla for floats, delta for integers/timestamps, dictionary for text, LZ4 for remaining. Typical: 10-20x. Advantage: Query compressed chunks directly (SIMD vectorized decompression, no decompress entire chunk).*

*Production impact: 100 GB/day raw → 5-10 GB compressed. 1 year = 36.5 TB raw → 1.8-3.6 TB compressed (fits on single server with compression). Without compression: 36.5 TB requires distributed cluster (10+ nodes, complex operations, higher cost). Compression reduces hardware 10x.*

*Interview pattern: Explain each technique (delta, Gorilla, RLE, dictionary) with numeric example showing compression ratio, multiply ratios for combined compression, mention production impact (10x hardware reduction)."*

---

**Q: "Design a monitoring system for 10,000 servers with sub-second dashboards"**

**A:** *"Multi-tier architecture: Prometheus scraping + InfluxDB long-term + Grafana visualization.*

*Requirements clarification:*
*- 10,000 servers (VMs, containers)*
*- Metrics: CPU, memory, disk, network (50 metrics/server)*
*- Scrape interval: 15 seconds (balance freshness vs overhead)*
*- Retention: Raw 7 days, 1-min aggregates 30 days, 1-hour 1 year*
*- Dashboards: Sub-second query latency (real-time)*
*- Alerts: Sub-minute detection (latency spike, high error rate)*

*Capacity estimation:*
*Write rate: 10k servers × 50 metrics / 15 sec = 33k points/sec*
*Daily points: 33k × 86,400 = 2.88 billion*
*Storage: 2.88B × 66 bytes / 10 compression = 19 GB/day*
*7-day retention: 133 GB raw + 141 GB 1-min + 29 GB 1-hour = 303 GB (1 TB with replication)*

*Architecture:*

*Tier 1: Prometheus (scraping + short-term + alerting)*
*- Deploy: Regional Prometheus servers (one per 1000 servers, 10 total)*
*- Each scrapes 1000 servers every 15 seconds*
*- Retention: 15 days local (recent data for alerts, fast queries)*
*- Storage: 1.9 GB/day × 15 days × 10 servers / 10 = ~28 GB per Prometheus*
*- Instance: AWS r5.xlarge (4 vCPU, 32 GB RAM), 100 GB SSD*
*- Cost: $0.252/hour × 10 = $1,840/month*

*Tier 2: InfluxDB (long-term storage + downsampling)*
*- Prometheus remote_write to InfluxDB cluster*
*- 3-node InfluxDB Enterprise cluster (HA, replication)*
*- Retention: 7 days raw, 30 days 1-min, 1 year 1-hour*
*- Storage: 303 GB × 3 replication = 909 GB*
*- Instance: AWS r5.2xlarge (8 vCPU, 64 GB RAM), 500 GB SSD each*
*- Cost: $0.504/hour × 3 = $1,104/month + $150/month storage × 3 = $1,554/month*

*Tier 3: Grafana (visualization)*
*- Single Grafana instance (stateless, scales horizontally if needed)*
*- Queries: Prometheus (recent data <15 days), InfluxDB (historical >15 days)*
*- Instance: AWS t3.large (2 vCPU, 8 GB RAM)*
*- Cost: $0.0832/hour = $61/month*

*Total cost: $3,455/month*

*Data flow:*
*1. Node exporters (agents on servers) expose metrics on :9100*
*2. Regional Prometheus scrapes exporters every 15 seconds*
*3. Prometheus evaluates alert rules every 15 seconds*
*4. Prometheus remote_write to InfluxDB (batch 5k points)*
*5. InfluxDB continuous queries compute 1-min, 1-hour aggregates*
*6. Grafana queries Prometheus (recent) or InfluxDB (historical)*

*Query optimization (sub-second dashboards):*
*1. Pre-aggregate in Prometheus: Recording rules compute common queries every 30s. Example: avg CPU per datacenter = avg by(datacenter)(node_cpu). Dashboard queries recording rules (instant), not raw metrics (scan millions points).*
*2. InfluxDB continuous aggregates: Pre-compute hourly averages. Dashboard shows 30-day trend → Query 720 pre-computed points (30 days × 24 hours), not 172.8M raw points.*
*3. Grafana query caching: Cache query results 10 seconds. 100 users view same dashboard → 1 query, 99 cache hits.*
*4. Downsampling on read: InfluxDB GROUP BY time(5m) returns 288 points per day (5-min buckets), not 5,760 raw points (15-sec interval). Reduces data transfer 20x.*
*5. Indexing: Prometheus labels indexed (fast filtering by host, datacenter). InfluxDB tags indexed (fast WHERE host='server1').*

*Alerting (sub-minute detection):*
*1. Prometheus alert rules: Evaluate every 15 seconds*
*2. Example: CPU >90% for 1 minute → alert.rule: expr: avg(node_cpu) > 90 for: 1m (fires after 1 minute)*
*3. Alertmanager: Deduplicates, groups, routes alerts (PagerDuty, Slack)*
*4. Latency: 15 sec (scrape) + 15 sec (evaluation) + 60 sec (for duration) = 90 sec typical*

*Scalability (grow to 100k servers):*
*1. Horizontal: 10x Prometheus (100 regional), 5x InfluxDB nodes*
*2. Sharding: Prometheus federation (global aggregates from regionals)*
*3. InfluxDB sharding: Shard by measurement or tag (host, datacenter)*
*4. Query load: Scale Grafana horizontally (stateless, load balance)*

*Failure scenarios:*
*1. Prometheus fails: Metrics buffered on exporters (up to 1 hour), scrape resumes when Prometheus recovers. Alert detection delayed but no data loss.*
*2. InfluxDB node fails: Cluster serves from remaining nodes (RF=3, quorum read). Writes continue (hinted handoff). Repair on recovery.*
*3. Grafana fails: Deploy second instance behind load balancer. Stateless (no data loss).*

*Interview pattern: Clarify requirements (scale, retention, latency), estimate capacity (write rate, storage), design multi-tier (scraping, storage, visualization), optimize queries (pre-aggregation, caching, downsampling), discuss scalability and failures."*

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why Time-Series Databases Matter

**Business Impact:**
- **Observability**: Detect incidents before users complain (latency spike, error rate increase)
- **Cost optimization**: Identify waste (idle servers 60% savings, over-provisioned resources)
- **Capacity planning**: Forecast growth (traffic trends, storage needs, infrastructure scaling)
- **SLA compliance**: Track 99.9% uptime, P99 latency targets
- **IoT insights**: Predictive maintenance (equipment failure prediction saves millions)

**Technical Impact:**
- **10-20x compression**: 100 GB/day → 5-10 GB (storage cost reduction)
- **High write throughput**: 100k-200k points/sec (millions of metrics)
- **Fast queries**: Sub-second time-range aggregations (real-time dashboards)
- **Automatic retention**: Delete old data (manage storage costs)
- **Downsampling**: Keep trends while reducing storage 100x

### How Time-Series Databases Work

**Core Architecture:**
1. **Append-only writes**: WAL (durability) → In-memory cache (speed) → Immutable files (compression)
2. **Time-based partitioning**: Chunks by time range (efficient range queries, easy deletion)
3. **Specialized compression**: Delta encoding (timestamps), Gorilla (floats), RLE (repeated), dictionary (strings)
4. **Automatic retention**: Background jobs drop old chunks (no manual cleanup)
5. **Continuous aggregates**: Pre-compute common queries (instant dashboard loads)

**Data Model:**
- **InfluxDB**: Measurement (table) + Tags (indexed dimensions) + Fields (values) + Timestamp
- **TimescaleDB**: Hypertable (virtual table) → Chunks (time partitions) → Compression (columnar)
- **Prometheus**: Metric name + Labels (dimensions) + Sample (timestamp, value)

**Query Patterns:**
- Range queries: `WHERE time > NOW() - 1h` (scan recent chunks only)
- Time bucketing: `GROUP BY time_bucket('5m', time)` (aggregate into intervals)
- Rate calculations: `rate(metric[5m])` (derivative for counters)
- Aggregations: `AVG`, `MAX`, `PERCENTILE` (statistical functions)

### Key Design Patterns

**1. Monitoring Stack:**
- Prometheus: Scrape metrics, short-term, alerting
- InfluxDB/Thanos: Long-term storage, downsampling
- Grafana: Visualization (multi-backend)

**2. Retention Tiers:**
- Raw data: 7 days (detailed debugging)
- 1-minute aggregates: 30 days (recent trends)
- 1-hour aggregates: 1 year (capacity planning)
- Daily aggregates: Forever (business reporting)

**3. Downsampling Pipeline:**
- Continuous queries: Auto-compute aggregates
- Write to separate retention policies/tables
- Query appropriate resolution (dashboard time range → select tier)

**4. High Availability:**
- InfluxDB Enterprise: 3+ data nodes, replication
- TimescaleDB: PostgreSQL HA (Patroni, streaming replication)
- Prometheus: Federation (regional → global)

### Trade-Offs to Remember

```
Compression ←→ Query Performance
- High compression (Gorilla): CPU cost on decompression
- Low compression: Faster queries, 10x storage cost
- Sweet spot: 10-20x compression (good balance)

Write Speed ←→ Durability
- WAL + fsync: Slower writes, durable (no data loss)
- Memory buffer only: Fast writes, lose data on crash
- Production: Always enable WAL (durability critical)

Retention ←→ Storage Cost
- Long retention (1 year raw): 365x storage cost
- Downsampling (1-hour aggregates): 100x cost reduction
- Trade-off: Lose detailed data, keep trends

In-Memory ←→ Cost
- Atlas (Netflix): 3h in-memory, $$$, <500ms queries
- InfluxDB: Disk-based, $, 10-100ms queries
- Use case: Real-time alerting worth cost?
```

### Interview Red Flags

🚫 "Time-series databases always faster than relational"
✅ "Time-series databases optimize for append-only writes, time-range queries, and compression. Relational databases better for ad-hoc queries, complex JOINs, transactions. Use TSDB for metrics/events, RDBMS for business data."

🚫 "Store all data forever without downsampling"
✅ "Downsample aggressively: Raw 7 days, 1-min 30 days, 1-hour 1 year, daily forever. Reduces storage 100x while preserving trends for capacity planning."

🚫 "Prometheus sufficient for long-term storage"
✅ "Prometheus optimized for short retention (days to weeks). For long-term (months, years), use remote_write to InfluxDB, Thanos, or Cortex. Prometheus local storage limited capacity."

### Final Sound Bite

*"Time-series databases: Specialized for time-stamped data—metrics, events, sensors—with efficient compression, retention policies, and time-based aggregations.*

*Architecture: Append-only writes (WAL → cache → immutable files). Time-based partitioning (chunks by day/week). Specialized compression (delta timestamps 8-10x, Gorilla floats 5-15x, RLE repeated, dictionary strings). Typical: 10-20x overall compression (100 GB → 5-10 GB).*

*Data model: InfluxDB (measurement + tags + fields + timestamp). TimescaleDB (hypertable → chunks → compression). Prometheus (metric + labels + sample). Tags indexed (fast filtering), fields not indexed (store values only).*

*Queries: Range queries (last hour WHERE time > NOW() - 1h). Time bucketing (GROUP BY time_bucket('5m', time) aggregates into 5-min intervals). Rate calculations (rate(metric[5m]) derivative for counters). Aggregations (AVG, MAX, PERCENTILE).*

*Retention tiers: Raw 7 days (debugging), 1-min aggregates 30 days (recent trends), 1-hour 1 year (capacity planning), daily forever (reporting). Downsampling: Continuous queries auto-compute, reduce storage 100x.*

*Write throughput: InfluxDB 50-100k points/sec single node, TimescaleDB 100-200k rows/sec. Query performance: Simple range 10-50ms, aggregations 100-500ms. Depends on: Cache hit rate, compression ratio, pre-aggregation.*

*Use cases: Infrastructure monitoring (CPU, memory, disk, network), IoT (sensor readings millions/sec), financial (stock prices, tick data), analytics (user events, page views), observability (logs, traces, metrics OpenTelemetry).*

*Production pattern: Prometheus scrape metrics short-term (15 days) + alerting, InfluxDB/Thanos long-term storage (1 year+) + downsampling, TimescaleDB business metrics (JOINs with orders, users, products), Grafana visualization (queries all backends).*

*Real-world: Uber M3DB (2B metrics/minute, Gorilla compression 12x, retention 48h raw + 30d 1-min + 1yr 1-hour, P99 query <100ms). Netflix Atlas (2B metrics/minute, in-memory 3h, dimensional tags, real-time alerting <500ms, hybrid with S3/Druid for historical).*

*Comparison: InfluxDB (custom language InfluxQL/Flux, built-in downsampling, 10-20x compression, Enterprise cluster). TimescaleDB (PostgreSQL, full SQL, JOINs with relational, automatic chunking). Prometheus (pull-based, PromQL, service discovery, alerting, short retention remote_write for long-term)."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
