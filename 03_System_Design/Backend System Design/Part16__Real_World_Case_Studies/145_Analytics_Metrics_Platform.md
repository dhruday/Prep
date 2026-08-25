# 145. Analytics / Metrics Platform (like Google Analytics, Mixpanel)

## 📌 Problem Statement

**Design an analytics platform** that tracks user events and generates reports in real-time.

**Example**:
```
User clicks "Buy" button
→ Event: {"event": "button_click", "button_id": "buy", "user_id": 123, "timestamp": 1704000000}
→ Store in database
→ Dashboard shows: "Buy button clicked 10,000 times today"
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Track events**: Page views, clicks, purchases, custom events
2. **Real-time dashboard**: Show metrics with < 1 min delay
3. **Reports**: Daily/weekly/monthly aggregations (e.g., DAU, conversion rate)
4. **Segmentation**: Filter by user properties (country, device, etc.)
5. **Funnels**: Track user journey (e.g., Home → Product → Checkout → Purchase)

### **Non-Functional Requirements**

1. **High throughput**: 1 million events/sec
2. **Low latency**: Query results in < 1 second
3. **Scalability**: 1 billion events/day
4. **Data retention**: 90 days (hot), 2 years (cold)

---

## 🎯 Step 2: Capacity Estimation

### **Events**

```
Events per day: 1 billion (1B)
Events per second: 1B / 86400 = 11.5k events/sec
Peak traffic: 5x = 57.5k events/sec
```

### **Event Size**

```
Event size: 1 KB average (JSON)
Storage per day: 1B × 1 KB = 1 TB/day
Storage per year: 1 TB × 365 = 365 TB/year
```

### **Queries**

```
Dashboard queries per day: 10 million
Queries per second: 10M / 86400 = 115 QPS
```

---

## 🎯 Step 3: API Design

### **1. Track Event**

```http
POST /api/events
Content-Type: application/json

{
  "event": "page_view",
  "user_id": 123,
  "properties": {
    "page": "/products/123",
    "referrer": "google.com",
    "device": "mobile"
  },
  "timestamp": 1704000000000
}

Response:
{
  "status": "ok"
}
```

---

### **2. Query Metrics**

```http
GET /api/metrics?event=page_view&start_date=2024-01-01&end_date=2024-01-31&group_by=date

Response:
{
  "data": [
    {"date": "2024-01-01", "count": 100000},
    {"date": "2024-01-02", "count": 120000},
    ...
  ]
}
```

---

### **3. Get Funnel**

```http
POST /api/funnels
{
  "events": ["page_view", "add_to_cart", "checkout", "purchase"],
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}

Response:
{
  "funnel": [
    {"event": "page_view", "count": 1000000, "conversion_rate": 100.0},
    {"event": "add_to_cart", "count": 500000, "conversion_rate": 50.0},
    {"event": "checkout", "count": 200000, "conversion_rate": 20.0},
    {"event": "purchase", "count": 50000, "conversion_rate": 5.0}
  ]
}
```

---

## 🎯 Step 4: Database Schema

### **Raw Events (Time-Series)**

**Problem**: 1 billion events/day → 365 TB/year (too large for traditional database)

**Solution**: Use time-series database (ClickHouse, Druid, TimescaleDB)

```sql
-- ClickHouse schema
CREATE TABLE events (
    event_id UUID,
    event String,
    user_id UInt64,
    session_id String,
    timestamp DateTime,
    properties String,  -- JSON (ClickHouse supports nested JSON)
    country String,
    device String,
    browser String
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (event, user_id, timestamp);
```

**Why ClickHouse?**
- **Columnar storage**: Fast aggregations (SUM, COUNT, AVG)
- **Compression**: 10x smaller than row-based databases
- **Partitioning**: Query only relevant partitions (e.g., last 7 days)

---

### **Aggregated Metrics (Pre-computed)**

**Problem**: Querying 1 billion events slow (even with ClickHouse)

**Solution**: Pre-aggregate metrics (materialized views)

```sql
-- Daily metrics (pre-aggregated)
CREATE TABLE daily_metrics (
    event String,
    date Date,
    country String,
    count UInt64,
    unique_users UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (event, date, country);

-- Materialized view (auto-updates on insert)
CREATE MATERIALIZED VIEW daily_metrics_mv TO daily_metrics AS
SELECT
    event,
    toDate(timestamp) AS date,
    country,
    count() AS count,
    uniqExact(user_id) AS unique_users
FROM events
GROUP BY event, date, country;
```

**Query** (fast):

```sql
SELECT date, SUM(count) AS total_events
FROM daily_metrics
WHERE event = 'page_view' AND date BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY date
ORDER BY date;
```

---

## 🎯 Step 5: High-Level Architecture

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Track event (page_view)
       ▼
┌─────────────────────────────────────┐
│      JavaScript SDK                 │
│  analytics.track('page_view')       │
└──────────────┬──────────────────────┘
               │
               │ 2. POST /api/events
               ▼
┌─────────────────────────────────────┐
│      API Gateway                    │
│  - Rate limiting                    │
│  - Batching (10 events/request)     │
└──────────────┬──────────────────────┘
               │
               │ 3. Publish to Kafka
               ▼
┌─────────────────────────────────────┐
│      Kafka (Message Queue)          │
│  Topic: events (partitioned)        │
└──────────────┬──────────────────────┘
               │
               │ 4. Consume events
               ▼
┌─────────────────────────────────────┐
│      Stream Processor (Flink)       │
│  - Real-time aggregation            │
│  - Windowing (5-minute windows)     │
└──────────────┬──────────────────────┘
               │
               │ 5. Write to ClickHouse
               ▼
┌─────────────────────────────────────┐
│      ClickHouse (OLAP Database)     │
│  - Raw events (365 TB/year)         │
│  - Aggregated metrics (pre-computed)│
└──────────────┬──────────────────────┘
               │
               │ 6. Query metrics
               ▼
┌─────────────────────────────────────┐
│      Query Service                  │
│  - Fetch from ClickHouse            │
│  - Cache in Redis                   │
└──────────────┬──────────────────────┘
               │
               │ 7. Display dashboard
               ▼
┌─────────────┐
│  Dashboard  │
└─────────────┘
```

---

## 🎯 Step 6: Event Ingestion (Kafka + Flink)

### **Why Kafka?**

**Problem**: 57.5k events/sec → API servers can't handle burst traffic

**Solution**: Kafka queue decouples ingestion from processing

**Benefits**:
- **Buffering**: Handle bursts (e.g., Black Friday traffic spike)
- **Replay**: Reprocess events if needed
- **Parallel processing**: Multiple consumers

---

### **Implementation**

**Client SDK** (JavaScript):

```javascript
// analytics.js
class Analytics {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.buffer = [];
    this.flushInterval = 5000;  // Flush every 5 seconds
    
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  track(event, properties = {}) {
    this.buffer.push({
      event: event,
      user_id: this.getUserId(),
      properties: properties,
      timestamp: Date.now()
    });
    
    // Flush if buffer full
    if (this.buffer.length >= 10) {
      this.flush();
    }
  }
  
  flush() {
    if (this.buffer.length === 0) return;
    
    fetch('https://api.example.com/api/events/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({events: this.buffer})
    });
    
    this.buffer = [];
  }
  
  getUserId() {
    // Get from cookie or generate
    return localStorage.getItem('user_id') || this.generateUserId();
  }
  
  generateUserId() {
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_id', userId);
    return userId;
  }
}

// Usage
const analytics = new Analytics('api_key_123');
analytics.track('page_view', {page: '/products/123'});
analytics.track('button_click', {button_id: 'buy'});
```

---

**API Server** (Flask):

```python
from flask import Flask, request, jsonify
from kafka import KafkaProducer
import json

app = Flask(__name__)
producer = KafkaProducer(bootstrap_servers=['localhost:9092'])

@app.route('/api/events/batch', methods=['POST'])
def track_events():
    data = request.json
    events = data['events']
    
    # Validate events
    for event in events:
        if 'event' not in event or 'timestamp' not in event:
            return jsonify({'error': 'Invalid event'}), 400
    
    # Publish to Kafka (batched)
    for event in events:
        producer.send('events', json.dumps(event).encode())
    
    producer.flush()
    
    return jsonify({'status': 'ok', 'count': len(events)})
```

---

### **Stream Processing (Flink)**

**Real-time aggregation** (5-minute windows):

```python
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment
from pyflink.table.window import Tumble

# Setup
env = StreamExecutionEnvironment.get_execution_environment()
t_env = StreamTableEnvironment.create(env)

# Kafka source
t_env.execute_sql("""
    CREATE TABLE events_source (
        event STRING,
        user_id BIGINT,
        timestamp BIGINT,
        properties STRING
    ) WITH (
        'connector' = 'kafka',
        'topic' = 'events',
        'properties.bootstrap.servers' = 'localhost:9092',
        'format' = 'json'
    )
""")

# Real-time aggregation (5-minute tumbling window)
t_env.execute_sql("""
    CREATE TABLE metrics_sink (
        event STRING,
        window_start TIMESTAMP(3),
        count BIGINT,
        unique_users BIGINT
    ) WITH (
        'connector' = 'clickhouse',
        'url' = 'clickhouse://localhost:8123',
        'database-name' = 'analytics',
        'table-name' = 'realtime_metrics'
    )
""")

# Query: Count events per 5-minute window
t_env.execute_sql("""
    INSERT INTO metrics_sink
    SELECT
        event,
        TUMBLE_START(TO_TIMESTAMP(FROM_UNIXTIME(timestamp / 1000)), INTERVAL '5' MINUTE) AS window_start,
        COUNT(*) AS count,
        COUNT(DISTINCT user_id) AS unique_users
    FROM events_source
    GROUP BY event, TUMBLE(TO_TIMESTAMP(FROM_UNIXTIME(timestamp / 1000)), INTERVAL '5' MINUTE)
""")
```

---

## 🎯 Step 7: Query Optimization

### **1. Partitioning**

**Problem**: Query scans entire table (365 TB)

**Solution**: Partition by date (query only relevant partitions)

```sql
-- ClickHouse (partitioned by month)
CREATE TABLE events (
    ...
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)  -- Partition: 202401, 202402, ...
ORDER BY (event, user_id, timestamp);

-- Query (scans only 1 partition)
SELECT COUNT(*) FROM events
WHERE event = 'page_view' AND timestamp BETWEEN '2024-01-01' AND '2024-01-31';
-- Scans partition 202401 only (1/12 of data)
```

---

### **2. Materialized Views (Pre-aggregation)**

**Problem**: Aggregating 1 billion events slow (even with ClickHouse)

**Solution**: Pre-compute aggregations (materialized views)

```sql
-- Hourly aggregation
CREATE MATERIALIZED VIEW hourly_metrics_mv TO hourly_metrics AS
SELECT
    event,
    toStartOfHour(timestamp) AS hour,
    count() AS count
FROM events
GROUP BY event, hour;

-- Query (fast, 24 rows instead of 1B)
SELECT hour, SUM(count) AS total
FROM hourly_metrics
WHERE event = 'page_view' AND hour BETWEEN '2024-01-01 00:00:00' AND '2024-01-01 23:00:00'
GROUP BY hour
ORDER BY hour;
```

---

### **3. Caching (Redis)**

**Problem**: Dashboard queries same metric repeatedly

**Solution**: Cache results in Redis (TTL = 5 minutes)

```python
import redis
import hashlib
import json

redis_client = redis.Redis(host='localhost', port=6379)

def query_metrics(event, start_date, end_date):
    # Generate cache key
    cache_key = hashlib.md5(f"{event}:{start_date}:{end_date}".encode()).hexdigest()
    
    # Check cache
    cached = redis_client.get(f'metrics:{cache_key}')
    if cached:
        print("Cache hit")
        return json.loads(cached)
    
    # Cache miss → Query ClickHouse
    query = f"""
        SELECT toDate(timestamp) AS date, COUNT(*) AS count
        FROM events
        WHERE event = '{event}' AND timestamp BETWEEN '{start_date}' AND '{end_date}'
        GROUP BY date
        ORDER BY date
    """
    
    result = clickhouse_client.execute(query)
    
    # Cache result (TTL = 5 minutes)
    redis_client.setex(f'metrics:{cache_key}', 300, json.dumps(result))
    
    return result
```

---

## 🎯 Step 8: Funnel Analysis

**Problem**: Track user journey (Page View → Add to Cart → Checkout → Purchase)

**Algorithm**: Count users who completed each step

```sql
-- Funnel query (ClickHouse)
SELECT
    step,
    COUNT(DISTINCT user_id) AS users,
    users / (SELECT COUNT(DISTINCT user_id) FROM events WHERE event = 'page_view') * 100 AS conversion_rate
FROM (
    SELECT user_id, 1 AS step FROM events WHERE event = 'page_view'
    UNION ALL
    SELECT user_id, 2 AS step FROM events WHERE event = 'add_to_cart'
    UNION ALL
    SELECT user_id, 3 AS step FROM events WHERE event = 'checkout'
    UNION ALL
    SELECT user_id, 4 AS step FROM events WHERE event = 'purchase'
)
GROUP BY step
ORDER BY step;
```

**Result**:

```
| step | users   | conversion_rate |
|------|---------|-----------------|
| 1    | 1000000 | 100%            |
| 2    | 500000  | 50%             |
| 3    | 200000  | 20%             |
| 4    | 50000   | 5%              |
```

---

## 🎯 Step 9: Real-Time Dashboard

**WebSocket** for real-time updates:

```python
from flask import Flask
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*')

# Background task: Push metrics every 5 seconds
def push_metrics():
    while True:
        # Query latest metrics
        metrics = query_metrics('page_view', datetime.now() - timedelta(minutes=5), datetime.now())
        
        # Broadcast to all clients
        socketio.emit('metrics_update', {'data': metrics})
        
        time.sleep(5)

# Start background task
socketio.start_background_task(push_metrics)

if __name__ == '__main__':
    socketio.run(app, port=5000)
```

**Client** (JavaScript):

```javascript
const socket = io('http://localhost:5000');

socket.on('metrics_update', (data) => {
  console.log('New metrics:', data);
  updateChart(data);
});
```

---

## 🎯 Step 10: Data Retention

**Problem**: 365 TB/year → Expensive to store forever

**Solution**: Tiered storage (hot/cold)

**Strategy**:

```
Hot data (last 90 days): ClickHouse (fast queries)
Cold data (90 days - 2 years): S3 (cheap, slow queries)
Old data (> 2 years): Delete
```

**Implementation**:

```python
# Daily job: Move old data to S3
def archive_old_data():
    cutoff_date = datetime.now() - timedelta(days=90)
    
    # Export to Parquet (compressed)
    query = f"""
        SELECT * FROM events
        WHERE timestamp < '{cutoff_date}'
        INTO OUTFILE 's3://my-bucket/events-{cutoff_date}.parquet'
        FORMAT Parquet
    """
    
    clickhouse_client.execute(query)
    
    # Delete from ClickHouse
    clickhouse_client.execute(f"ALTER TABLE events DROP PARTITION '{cutoff_date.strftime('%Y%m%d')}'")
    
    print(f"Archived data older than {cutoff_date}")
```

---

## 🎯 Step 11: Real-World Examples

### **1. Google Analytics**

**Scale**: 30+ million websites, billions of events/day

**Features**:
- Page views, sessions, bounce rate
- Real-time dashboard (< 1 min delay)
- Custom events

**Architecture**: Google infrastructure (BigQuery, Bigtable)

---

### **2. Mixpanel**

**Scale**: 8,000+ customers, 50+ billion events/month

**Features**:
- Event tracking
- Funnels (conversion analysis)
- Cohorts (user segmentation)

**Architecture**: AWS (ClickHouse, Kafka, Flink)

---

### **3. Amplitude**

**Scale**: 2,000+ customers, 1+ trillion events/year

**Features**:
- Product analytics
- User journeys
- Retention analysis

**Architecture**: AWS (ClickHouse, Kafka, S3)

---

## 🎓 Interview Tips

**Q: "Design an analytics platform like Google Analytics"**

A: "I'll use **Kafka + Flink + ClickHouse**:

**Core components**:
1. **Event ingestion**: JavaScript SDK batches events → API → Kafka queue
2. **Stream processing**: Flink consumes Kafka → Real-time aggregation (5-min windows)
3. **Storage**: ClickHouse (columnar OLAP database, 10x compression)
4. **Query**: Pre-aggregated metrics (materialized views) + Redis cache (5-min TTL)

**Architecture flow**:
```
Browser SDK → API Gateway → Kafka → Flink (real-time agg) → ClickHouse → Query Service → Redis cache → Dashboard
```

**Optimizations**:
- **Batching**: SDK batches 10 events/request (reduce network overhead)
- **Partitioning**: ClickHouse partitioned by month (query only relevant partitions)
- **Materialized views**: Pre-aggregate hourly/daily metrics (fast queries)
- **Caching**: Redis cache (5-min TTL, reduce ClickHouse load)
- **Tiered storage**: Hot data (90 days ClickHouse), Cold data (S3 Parquet)

**Capacity**:
- 1 billion events/day (57.5k events/sec peak)
- 1 TB/day raw (365 TB/year)
- Query latency < 1 second

**Real-world**: Google Analytics (BigQuery), Mixpanel (ClickHouse/Kafka), Amplitude (ClickHouse/S3)"

---

## 📚 Summary

**Core**: Kafka ingestion → Flink real-time aggregation → ClickHouse storage (columnar OLAP) → Redis cache

**Event flow**: Browser SDK batches events → API → Kafka → Flink (5-min windows) → ClickHouse

**Query optimization**: Partitioning (by month), Materialized views (pre-aggregation), Redis cache (5-min TTL)

**Funnel analysis**: COUNT DISTINCT users per step, calculate conversion rate

**Data retention**: Hot (90 days ClickHouse), Cold (S3 Parquet), Delete (> 2 years)

**Real-world**: Google Analytics (BigQuery Bigtable), Mixpanel (ClickHouse Kafka Flink), Amplitude (ClickHouse S3) 🚀

