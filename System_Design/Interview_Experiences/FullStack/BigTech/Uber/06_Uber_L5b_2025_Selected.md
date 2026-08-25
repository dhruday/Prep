# Uber — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | Staff Software Engineer |
| **Level** | L5b |
| **YOE** | 10 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | San Francisco, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Rides Marketplace |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding — Design a Geo-Spatial Index (S2 Cell-based)
**Duration:** 45 minutes

### Question: Implement a spatial index that can efficiently find all points within a given radius of a query point. Optimize for the use case of finding nearby drivers.

```java
import java.util.*;

/**
 * Geo-Spatial Index using Grid-Based Spatial Hashing.
 * 
 * Uber uses S2 Geometry (Google) or H3 (Uber) in production.
 * For interview: grid-based spatial hashing is sufficient.
 * 
 * Idea: Divide the earth into grid cells of fixed size.
 * Each cell stores a list of points (drivers).
 * To find nearby: check the target cell + adjacent cells.
 * 
 * Cell size = slightly larger than typical search radius
 * 
 * Time: insert O(1), radius query O(K) where K = points in nearby cells
 * Space: O(N) for all points
 */
class GeoSpatialIndex {
    
    // Grid cell size in degrees (approximately 1km at equator)
    private static final double CELL_SIZE = 0.01; // ~1.1 km
    
    // Map: cellKey → list of points in that cell
    private Map<Long, List<GeoPoint>> grid;
    
    // All points by ID for quick lookup
    private Map<String, GeoPoint> pointsById;
    
    static class GeoPoint {
        String id;
        double lat;
        double lng;
        Map<String, Object> metadata; // driver info, vehicle type, etc.
        
        GeoPoint(String id, double lat, double lng) {
            this.id = id; this.lat = lat; this.lng = lng;
            this.metadata = new HashMap<>();
        }
    }
    
    public GeoSpatialIndex() {
        grid = new HashMap<>();
        pointsById = new HashMap<>();
    }
    
    /**
     * Convert lat/lng to grid cell key.
     * Pack (cellX, cellY) into a single long for HashMap key.
     */
    private long cellKey(double lat, double lng) {
        int cellX = (int) Math.floor(lat / CELL_SIZE);
        int cellY = (int) Math.floor(lng / CELL_SIZE);
        return ((long) cellX << 32) | (cellY & 0xFFFFFFFFL);
    }
    
    /**
     * Insert or update a point (e.g., driver location update).
     */
    public void upsert(String id, double lat, double lng) {
        // Remove from old cell if exists
        GeoPoint existing = pointsById.get(id);
        if (existing != null) {
            long oldKey = cellKey(existing.lat, existing.lng);
            List<GeoPoint> oldCell = grid.get(oldKey);
            if (oldCell != null) {
                oldCell.removeIf(p -> p.id.equals(id));
                if (oldCell.isEmpty()) grid.remove(oldKey);
            }
        }
        
        // Insert into new cell
        GeoPoint point = new GeoPoint(id, lat, lng);
        if (existing != null) point.metadata = existing.metadata;
        
        long key = cellKey(lat, lng);
        grid.computeIfAbsent(key, k -> new ArrayList<>()).add(point);
        pointsById.put(id, point);
    }
    
    public void remove(String id) {
        GeoPoint point = pointsById.remove(id);
        if (point != null) {
            long key = cellKey(point.lat, point.lng);
            List<GeoPoint> cell = grid.get(key);
            if (cell != null) {
                cell.removeIf(p -> p.id.equals(id));
                if (cell.isEmpty()) grid.remove(key);
            }
        }
    }
    
    /**
     * Find all points within radiusKm of the query point.
     * Strategy: determine which grid cells could contain nearby points,
     * then check Haversine distance for candidates.
     */
    public List<GeoPoint> findNearby(double lat, double lng, double radiusKm) {
        // How many cells to check in each direction
        double radiusDegrees = radiusKm / 111.32; // ~111.32 km per degree latitude
        int cellRadius = (int) Math.ceil(radiusDegrees / CELL_SIZE);
        
        int centerCellX = (int) Math.floor(lat / CELL_SIZE);
        int centerCellY = (int) Math.floor(lng / CELL_SIZE);
        
        List<GeoPoint> results = new ArrayList<>();
        
        // Check all cells in the bounding square
        for (int dx = -cellRadius; dx <= cellRadius; dx++) {
            for (int dy = -cellRadius; dy <= cellRadius; dy++) {
                long key = ((long) (centerCellX + dx) << 32) | ((centerCellY + dy) & 0xFFFFFFFFL);
                
                List<GeoPoint> cell = grid.get(key);
                if (cell == null) continue;
                
                for (GeoPoint point : cell) {
                    double dist = haversineKm(lat, lng, point.lat, point.lng);
                    if (dist <= radiusKm) {
                        results.add(point);
                    }
                }
            }
        }
        
        // Sort by distance
        results.sort(Comparator.comparingDouble(
            p -> haversineKm(lat, lng, p.lat, p.lng)
        ));
        
        return results;
    }
    
    /**
     * Find K nearest points (for "find 5 nearest drivers").
     * Start with small radius, expand until we have K results.
     */
    public List<GeoPoint> findKNearest(double lat, double lng, int k) {
        double radius = 1.0; // Start with 1km
        
        while (radius <= 50) { // Max 50km search
            List<GeoPoint> candidates = findNearby(lat, lng, radius);
            if (candidates.size() >= k) {
                return candidates.subList(0, Math.min(k, candidates.size()));
            }
            radius *= 2; // Double the radius
        }
        
        return findNearby(lat, lng, 50);
    }
    
    /**
     * Haversine formula: great-circle distance between two points.
     */
    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371.0; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    
    public int size() { return pointsById.size(); }
}
```

---

## Round 2: System Design — Uber Surge Pricing Engine
**Duration:** 60 minutes

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│               Uber Surge Pricing Engine                         │
│                                                                 │
│  Input Signals (Real-Time):                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Supply: available drivers per H3 hex cell             │   │
│  │    - Driver location from GPS stream (Kafka topic)        │   │
│  │    - Filtered by: online, available, matching vehicle type│   │
│  │                                                           │   │
│  │ 2. Demand: ride requests per H3 hex cell                 │   │
│  │    - Current unfulfilled requests                         │   │
│  │    - Predicted demand (ML model: time, weather, events)   │   │
│  │                                                           │   │
│  │ 3. Context:                                               │   │
│  │    - Weather (rain → 2x demand, supply drops)             │   │
│  │    - Events (concert ending → localized spike)            │   │
│  │    - Historical patterns (rush hour, weekday/weekend)     │   │
│  │    - ETA (if ETAs rising → congestion → lower supply)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │ Surge Calculation Engine                                  │   │
│  │                                                           │   │
│  │ Per H3 cell (resolution 7, ~5.16 km²):                   │   │
│  │                                                           │   │
│  │ base_surge = demand / supply                              │   │
│  │                                                           │   │
│  │ Adjustments:                                              │   │
│  │   weather_factor: rain=1.3, snow=1.5, clear=1.0          │   │
│  │   event_factor: nearby event ending within 30min=1.5     │   │
│  │   historical_factor: ML prediction confidence weight      │   │
│  │                                                           │   │
│  │ raw_surge = base_surge × weather × event × historical    │   │
│  │                                                           │   │
│  │ Smoothing (prevent spikes):                               │   │
│  │   smoothed = 0.7 × raw_surge + 0.3 × previous_surge     │   │
│  │   Max step: ±0.5x per 5-minute window                    │   │
│  │   Spatial smoothing: average with adjacent hex cells      │   │
│  │                                                           │   │
│  │ Final:                                                    │   │
│  │   surge_multiplier = clamp(smoothed, 1.0, 5.0)           │   │
│  │   price = base_fare + (distance × per_mile × surge)      │   │
│  │         + (time × per_min × surge) + booking_fee          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │ Surge Map Service                                         │   │
│  │                                                           │   │
│  │ - Redis: H3_cell_id → surge_multiplier (TTL 5 min)       │   │
│  │ - API: GET /surge?lat=x&lng=y → { multiplier, eta }      │   │
│  │ - Push updates to rider app via WebSocket                 │   │
│  │ - Driver app shows "surge zone" overlay on map            │   │
│  │                                                           │   │
│  │ Recalculation frequency: every 2 minutes                  │   │
│  │ Latency: < 100ms for surge lookup                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Anti-Gaming Measures:                                          │
│  - Drivers can't see exact surge boundaries → prevents gaming   │
│  - Min surge duration: 5 min (prevent flash-cancel-rerequest)  │
│  - Price lock: shown price is guaranteed for 5 minutes          │
│  - Audit: flag suspiciously correlated cancel/surge patterns    │
│                                                                 │
│  Ethics / Regulation:                                           │
│  - Emergency cap: max 1.5x during declared emergencies          │
│  - Upfront pricing: rider sees price BEFORE requesting          │
│  - Transparency: "Prices are higher due to high demand"         │
│  - A/B testing: measure price sensitivity with long-term LTV    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Uber L5b = **Geo-spatial index (grid hashing) + Surge pricing system design**
- **Grid-based spatial hashing**: `cellKey = (floor(lat/cellSize) << 32) | floor(lng/cellSize)` — O(1) insert, O(K) query
- **KNN search**: start with small radius, double until K results found — geometric expansion
- **Haversine distance**: great-circle distance for final filtering after cell-based candidate selection
- **Surge formula**: `demand/supply × weather × event × historical` — clamped [1.0, 5.0]
- **Temporal smoothing**: `0.7 × new + 0.3 × old` — prevents wild oscillation
- **Spatial smoothing**: average with adjacent H3 cells — prevents sharp surge boundaries
- **Anti-gaming**: drivers can't see exact boundaries, minimum surge duration 5min
- Uber = **geo-spatial algorithms + marketplace economics** — pricing, matching, ETAs

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | DSA |
| Coding | Very Hard | Geo-Spatial Index, Hashing |
| System Design | Very Hard | Surge Pricing, Marketplace |
| Behavioral | Hard | Leadership, Conflict Resolution |
| Architecture | Hard | System Redesign |
