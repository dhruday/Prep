# Problem 06 — Design Uber / Ride-Sharing + Google Maps

> Frequency: ⭐⭐⭐⭐⭐ | Asked at: Uber, Google, Lyft, Amazon | Difficulty: 🔴 Senior

---

## PART 1 — Problem Statement

### Uber Functional Requirements
- Riders request rides (pickup + destination)
- Drivers accept/reject ride requests
- Real-time driver location tracking
- Match riders to nearest available driver
- Trip pricing (surge pricing)
- Payment processing
- Trip history, ratings

### Google Maps Functional Requirements
- Find routes between two locations (walking, driving, transit)
- Real-time traffic data
- ETA calculation
- Turn-by-turn navigation
- Search for places (POI)
- Map tile rendering

### Non-Functional Requirements (Uber)
- **Scale:** 5M rides/day, 2M concurrent drivers
- **Latency:** Match driver in < 5 seconds
- **Location update:** Every 5 seconds from each driver
- **Availability:** 99.99% (no rides = no revenue)
- **Consistency:** No double booking a driver

---

## PART 3 — Capacity Estimation (Uber)

```
=== LOCATION UPDATES ===
Active drivers during peak: 2M concurrent
Location update every 5 seconds:
  2M / 5 = 400,000 location updates/sec
  Peak: 400K × 2 = 800K updates/sec

Each update payload: ~100 bytes (lat, lng, timestamp, driver_id)
Bandwidth: 800K × 100 bytes = 80 MB/sec inbound

=== RIDE MATCHING ===
Rides/day:    5M
Peak QPS:     5M / (8 peak hours × 3600) ≈ 175 ride requests/sec

=== STORAGE ===
Location history: 2M drivers × 1 update/5sec × 86400 sec = 34.5B updates/day
At 100 bytes: 3.45 TB/day location data (only cache recent; don't store all history)

Trip records: 5M trips × 2 KB/trip = 10 GB/day
User/driver profiles: 50M users × 1 KB = 50 GB (small)
```

---

## PART 4 — Uber High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Rider App / Driver App                   │
└────────────────────────────────────────────────────────────────┘
          │ HTTPS / WebSocket                │ Location updates (UDP/WebSocket)
          ▼                                  ▼
┌─────────────────────┐          ┌──────────────────────────┐
│   API Gateway /      │          │   Location Ingestion      │
│   Load Balancer      │          │   Service                 │
└──────┬──────────────┘          └──────────┬───────────────┘
       │                                     │
   ┌───┴────────────────────────────┐        │
   │              Services          │        ▼
   │  ┌──────────┐ ┌─────────────┐ │  ┌─────────────────────┐
   │  │ Ride Svc │ │ Driver Svc  │ │  │  Location Store      │
   │  │          │ │             │ │  │  (Redis GeoSpatial)  │
   │  └────┬─────┘ └──────┬──────┘ │  │  + Cassandra history │
   │       │              │        │  └─────────────────────┘
   │  ┌────▼──────────────▼──────┐ │        │
   │  │    Matching Service       │◀────────┘
   │  │    (finds nearest driver) │
   │  └────────────┬─────────────┘
   │               │
   │  ┌────────────▼─────────────┐
   │  │    Dispatch Service       │
   │  │ (assigns driver to rider) │
   │  └────────────┬─────────────┘
   └───────────────┼────────────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
  ┌─────────┐ ┌────────┐ ┌──────────┐
  │ Trip DB │ │Kafka   │ │ Payment  │
  │(Postgres│ │(Events)│ │ Service  │
  └─────────┘ └────────┘ └──────────┘
```

---

## PART 5 — Data Model (Uber)

### Drivers Table
```sql
CREATE TABLE drivers (
    driver_id       BIGINT PRIMARY KEY,
    user_id         BIGINT UNIQUE,
    vehicle_type    VARCHAR(20),        -- 'UberX', 'UberXL', 'Black'
    plate_number    VARCHAR(20),
    status          VARCHAR(20),        -- 'available', 'on_trip', 'offline'
    rating          DECIMAL(3,2),
    total_trips     INT,
    created_at      TIMESTAMP
);
```

### Trips Table
```sql
CREATE TABLE trips (
    trip_id         BIGINT PRIMARY KEY,     -- Snowflake ID
    rider_id        BIGINT NOT NULL,
    driver_id       BIGINT,
    status          VARCHAR(20),            -- 'requested','accepted','in_progress','completed','cancelled'
    pickup_lat      DOUBLE PRECISION,
    pickup_lng      DOUBLE PRECISION,
    pickup_address  TEXT,
    dest_lat        DOUBLE PRECISION,
    dest_lng        DOUBLE PRECISION,
    dest_address    TEXT,
    fare_estimate   DECIMAL(10,2),
    fare_actual     DECIMAL(10,2),
    surge_multiplier DECIMAL(4,2) DEFAULT 1.0,
    requested_at    TIMESTAMP,
    accepted_at     TIMESTAMP,
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    distance_km     DECIMAL(8,2),
    duration_sec    INT
);

CREATE INDEX idx_rider_trips ON trips(rider_id, requested_at DESC);
CREATE INDEX idx_driver_trips ON trips(driver_id, requested_at DESC);
CREATE INDEX idx_status ON trips(status) WHERE status IN ('requested', 'accepted', 'in_progress');
```

### Driver Location (Redis Geospatial)
```
Redis GEO commands for spatial indexing:
  GEOADD drivers:available lng lat driver_id
  GEODIST drivers:available driver1 driver2 km
  GEORADIUS drivers:available lng lat 2 km ASC COUNT 10
  GEOREM drivers:available driver_id  (on status change)

Key structure:
  "drivers:available"     → sorted set of available drivers
  "driver:loc:{driver_id}" → latest location + timestamp
  "driver:status:{driver_id}" → current status
```

---

## PART 7 — Deep Dive: Driver Matching

### Location Tracking Flow
```
Driver App sends GPS update every 5 seconds:
  POST /location
  { "driver_id": 123, "lat": 37.7749, "lng": -122.4194, "timestamp": T }

Location Service:
  1. Update Redis: GEOADD drivers:available lng lat driver_id
  2. Update Redis key: driver:loc:123 = {lat, lng, timestamp}
  3. Async: publish to Kafka for history storage
  4. Async: Cassandra write for trip analytics
```

### Geospatial Indexing: Geohash

```
Geohash encodes lat/lng as string:
  (37.77, -122.42) → "9q8yy" (San Francisco ~1km precision)

Properties:
  - Characters = precision (more chars = smaller area)
  - Adjacent cells share prefix (mostly)
  - Fast range queries: LIKE '9q8yy%'

Precision table:
  5 chars: ~5 km × 5 km
  6 chars: ~1.2 km × 0.6 km  (good for city blocks)
  7 chars: ~150 m × 150 m

Driver search using Geohash:
  Rider at geohash "9q8yy"
  Search drivers in: "9q8yy" + 8 adjacent geohashes
  If not enough: expand to prefix "9q8y" (larger area)

Redis approach (simpler):
  GEORADIUS command handles all of this natively
```

### Driver Matching Algorithm

```python
def find_nearest_driver(pickup_lat, pickup_lng, vehicle_type):
    # Search radius: 2km, up to 10 candidates
    candidates = redis.georadius(
        f"drivers:available:{vehicle_type}",
        longitude=pickup_lng,
        latitude=pickup_lat,
        radius=2,
        unit='km',
        sort='ASC',
        count=10,
        withcoord=True,
        withdist=True
    )
    
    # Filter: last location update < 30 seconds (stale GPS)
    fresh_candidates = [
        d for d in candidates
        if is_fresh(d.driver_id, max_age_sec=30)
    ]
    
    if not fresh_candidates:
        # Expand radius to 5km
        return find_nearest_driver(pickup_lat, pickup_lng, vehicle_type, radius=5)
    
    # Dispatch to nearest available
    return fresh_candidates[0]

def dispatch_driver(driver_id, trip_id):
    # Atomic operation: claim driver (prevent double booking)
    # Use Redis atomic compare-and-set
    success = redis.atomic_claim(
        f"driver:status:{driver_id}",
        expected="available",
        new_value=f"dispatched:{trip_id}"
    )
    
    if success:
        # Remove from available pool
        redis.georemove(f"drivers:available", driver_id)
        # Update DB
        db.update_driver_status(driver_id, "dispatched", trip_id)
        # Notify driver via WebSocket/push
        notify_driver(driver_id, trip_id)
        return True
    else:
        # Driver was claimed by another request (race condition handled)
        return False
```

### Preventing Double Booking (Race Condition)

```
Problem: Two riders simultaneously matched with same driver

Solution 1: Redis SETNX (distributed lock)
  SETNX "dispatch:{driver_id}" trip_id NX EX 10
  → Only one succeeds; other gets next available driver

Solution 2: Optimistic locking in DB
  UPDATE drivers SET status='dispatched', trip_id=X
  WHERE driver_id=D AND status='available'
  → Check rows_affected = 1

Solution 3: Single-threaded dispatch worker per region
  All dispatch decisions for a region handled serially
  No race conditions by design
  Kafka topic per region → single consumer does dispatching
```

---

## PART 7B — Surge Pricing

```
Supply-demand imbalance → surge multiplier on fare

Calculation:
  supply_demand_ratio = available_drivers / ride_requests
  
  Ratio 1.0 → 1.0x (no surge)
  Ratio 0.5 → 1.5x
  Ratio 0.25 → 2.0x
  
Implementation:
  Kafka: real-time events → Flink window aggregation (1-minute windows)
  Per geohash cell: count available drivers, count pending requests
  Compute ratio → store surge multiplier in Redis
  
  On fare estimate: lookup surge for rider's geohash cell
  Update every 30 seconds
```

---

## PART 4B — Google Maps Architecture

```
Components:
┌────────────────────────────────────────────────────────────────┐
│                     Google Maps Services                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Map Tile Svc │  │ Routing Svc  │  │  Search / POI Svc  │   │
│  │              │  │              │  │  (Elasticsearch)    │   │
│  │ Renders map  │  │ Dijkstra /   │  │                    │   │
│  │ tiles (PNG/  │  │ A* on road   │  │                    │   │
│  │ vector)      │  │ graph        │  │                    │   │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────┘   │
│         │                 │                                      │
│         ▼                 ▼                                      │
│  ┌──────────────┐  ┌──────────────────────────────────────┐    │
│  │ CDN (tile    │  │  Road Graph Database                  │    │
│  │ caching)     │  │  (Custom graph engine)                │    │
│  └──────────────┘  │  Nodes: intersections (~1B globally)  │    │
│                     │  Edges: roads with distance, speed    │    │
│                     └──────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Traffic Service                                          │   │
│  │  Real-time speed data → road graph edge weights           │   │
│  │  Sources: user GPS traces, sensors, partnerships          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Map Tiles

```
World divided into tiles at different zoom levels:
  Zoom 0:  1 tile covers entire world (256×256 px)
  Zoom 10: 1M+ tiles (neighborhood level)
  Zoom 20: 1T+ tiles (building level)

Total tiles: ~4.4 trillion at all zoom levels

Storage: Vector tiles (protobuf) much smaller than raster (PNG)
  Raster: ~1-5 KB per tile
  Vector: ~100-500 bytes per tile
  
CDN: Nearly all tile requests served from edge CDN
  Popular tiles (city centers, tourist spots): always cached
  Rural/zoom-20 tiles: served from origin on demand

Generation: Offline pipeline processes OSM/satellite data → tiles
  Stored in: Bigtable/Colossus at Google
```

### Routing: A* Algorithm

```
Road network as weighted directed graph:
  Nodes:  intersections (1B+ globally)
  Edges:  road segments (direction, distance, speed limit)

Dijkstra: finds shortest path (distance)
A*:       faster, uses heuristic (straight-line distance to goal)

For real-time routing with traffic:
  Edge weights = time (not distance) = length / current_speed
  Current speed from: traffic service (crowdsourced GPS data)
  
Hierarchical routing (for long distances):
  Contraction Hierarchies (CH) or Highway Node Routing
  Pre-process graph: "shortcuts" for highways
  Query: zoom out to highway level for long routes
  Much faster than running A* on full 1B-node graph
  
Update frequency:
  Traffic weights: every 5 minutes (from live data)
  Road network: continuous updates from mapping team
```

### ETA Calculation

```
ETA = routing_time + real-time_traffic_adjustment + historical_patterns

Sources:
  1. Current GPS traces from users (anonymized)
     → Compute current speed per road segment
  2. Historical patterns: "This road is slow on Fridays at 5pm"
  3. Reported incidents (accidents, construction)
  4. Weather data (slow in rain)

ML Model:
  Features: route, time of day, day of week, weather, incidents
  Output: predicted ETA + confidence interval
  
Accuracy: Google Maps ETA ~94% accurate within 5 minutes
```

---

## PART 8 — Uber Scalability

### Region-Based Architecture
```
Each city/region = logical shard
  - Separate dispatch worker per region
  - Local Redis for driver locations
  - Cross-region queries rare (only at borders)

City isolation:
  NYC cluster: handles all NYC matching
  SF cluster:  handles all SF matching
  
Benefits:
  - Low latency (local processing)
  - Fault isolation (NYC issue doesn't affect SF)
  - Easy to scale per city demand
```

---

## PART 20 — Interview Summary

### Uber 5-Minute Answer
> "Uber has three core flows: location tracking, matching, and dispatch. Drivers send GPS every 5 seconds → Redis GEOADD stores their location. When rider requests: GEORADIUS finds nearest available drivers within 2km, dispatching uses atomic Redis claim to prevent double booking. Trip data stored in PostgreSQL. Surge pricing: Kafka streams real-time supply/demand per geohash cell → multiplier stored in Redis, updated every 30 seconds."

### Uber 15-Minute Answer
Add:
> "Location service handles 400K updates/sec at peak. Redis GEO commands are key: GEOADD on driver connect, GEORADIUS on ride request, GEOREM when driver is dispatched. Matching service expands radius if no drivers found (2km → 5km → 10km). For preventing double booking: SETNX on driver_id in Redis with 10s TTL — only one request wins. Separate dispatch worker per city region handles all matching serially (no concurrent dispatch conflicts). Driver status machine: offline → available → dispatched → on_trip → available."

### Google Maps 5-Minute Answer
> "Google Maps has two main components: tiles and routing. Map tiles: world divided into 4.4T tiles at all zoom levels. Static tiles served from CDN (99%+ cache hit for popular areas). Routing: road network as weighted directed graph (1B nodes, edges = roads with current travel time). A* algorithm finds fastest path using real-time traffic as edge weights. Traffic data: crowdsourced from user GPS traces, processed in near-real-time (5-min refresh). ETA: ML model combining routing time, historical patterns, weather, incidents."

---

*Next: `07_dropbox_google_drive.md`*
