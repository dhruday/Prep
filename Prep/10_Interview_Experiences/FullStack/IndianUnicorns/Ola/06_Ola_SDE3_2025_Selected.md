# Ola — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | SDE-3 |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Ola Electric |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Real-Time Fleet Management System
**Duration:** 90 minutes

### Challenge: Build a fleet management system that tracks vehicles in real-time: location updates, geofence alerts, vehicle health monitoring, trip assignment, and fleet analytics.

```java
import java.util.*;
import java.util.concurrent.*;

/**
 * Fleet Management System:
 * 
 * Features:
 * 1. Real-time vehicle location tracking (lat/lon updates)
 * 2. Geofence: alert when vehicle enters/exits defined zones
 * 3. Vehicle health: battery, tire pressure, engine temp
 * 4. Trip assignment: assign nearest available vehicle
 * 5. Fleet analytics: utilization rate, distance traveled, alerts count
 */

class Vehicle {
    String id;
    String model;
    double latitude, longitude;
    double speed; // km/h
    String status; // AVAILABLE, ON_TRIP, MAINTENANCE, OFFLINE
    long lastUpdateTime;
    VehicleHealth health;
    String currentTripId;
    double totalDistanceKm;
    
    Vehicle(String id, String model) {
        this.id = id; this.model = model;
        this.status = "AVAILABLE";
        this.health = new VehicleHealth();
        this.totalDistanceKm = 0;
    }
}

class VehicleHealth {
    double batteryPercent;  // 0-100
    double tirePressure;    // PSI (normal: 30-35)
    double engineTemp;      // °C (normal: 80-100, critical: >110)
    boolean isHealthy;
    
    VehicleHealth() {
        this.batteryPercent = 100;
        this.tirePressure = 32;
        this.engineTemp = 85;
        this.isHealthy = true;
    }
    
    List<String> checkAlerts() {
        List<String> alerts = new ArrayList<>();
        if (batteryPercent < 20) alerts.add("LOW_BATTERY: " + batteryPercent + "%");
        if (tirePressure < 28 || tirePressure > 38) alerts.add("TIRE_PRESSURE: " + tirePressure + " PSI");
        if (engineTemp > 110) alerts.add("ENGINE_OVERHEAT: " + engineTemp + "°C");
        this.isHealthy = alerts.isEmpty();
        return alerts;
    }
}

class Geofence {
    String id;
    String name;
    double centerLat, centerLon;
    double radiusKm;
    String type; // ALLOWED, RESTRICTED
    
    Geofence(String id, String name, double lat, double lon, double radiusKm, String type) {
        this.id = id; this.name = name;
        this.centerLat = lat; this.centerLon = lon;
        this.radiusKm = radiusKm; this.type = type;
    }
    
    boolean contains(double lat, double lon) {
        return haversineKm(centerLat, centerLon, lat, lon) <= radiusKm;
    }
    
    static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

class Trip {
    String id;
    String vehicleId;
    double startLat, startLon;
    double endLat, endLon;
    long startTime;
    long endTime;
    String status; // ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
    double distanceKm;
    
    Trip(String id, double startLat, double startLon, double endLat, double endLon) {
        this.id = id; this.startLat = startLat; this.startLon = startLon;
        this.endLat = endLat; this.endLon = endLon;
        this.status = "ASSIGNED"; this.startTime = System.currentTimeMillis();
    }
}

class GeofenceAlert {
    String vehicleId;
    String geofenceId;
    String type; // ENTERED, EXITED
    long timestamp;
    double lat, lon;
    
    GeofenceAlert(String vehicleId, String geofenceId, String type, double lat, double lon) {
        this.vehicleId = vehicleId; this.geofenceId = geofenceId;
        this.type = type; this.lat = lat; this.lon = lon;
        this.timestamp = System.currentTimeMillis();
    }
}

class FleetAnalytics {
    int totalVehicles;
    int availableVehicles;
    int onTripVehicles;
    int maintenanceVehicles;
    double utilizationRate; // onTrip / total
    double totalDistanceKm;
    int totalAlerts;
    int unhealthyVehicles;
}

class FleetManager {
    
    private final Map<String, Vehicle> vehicles = new ConcurrentHashMap<>();
    private final Map<String, Geofence> geofences = new ConcurrentHashMap<>();
    private final Map<String, Trip> trips = new ConcurrentHashMap<>();
    private final List<GeofenceAlert> alerts = new CopyOnWriteArrayList<>();
    
    // Track which vehicles are inside which geofences (for enter/exit detection)
    private final Map<String, Set<String>> vehicleGeofenceState = new ConcurrentHashMap<>();
    
    private final List<FleetEventListener> listeners = new CopyOnWriteArrayList<>();
    
    interface FleetEventListener {
        void onGeofenceAlert(GeofenceAlert alert);
        void onHealthAlert(String vehicleId, List<String> alerts);
    }
    
    void addListener(FleetEventListener listener) { listeners.add(listener); }
    
    // ---- Vehicle Management ----
    
    void registerVehicle(Vehicle vehicle) {
        vehicles.put(vehicle.id, vehicle);
        vehicleGeofenceState.put(vehicle.id, new HashSet<>());
    }
    
    /**
     * Process a location update from a vehicle.
     * - Update position
     * - Calculate distance traveled
     * - Check geofences
     * - Check vehicle health
     */
    void updateLocation(String vehicleId, double lat, double lon, double speed, VehicleHealth health) {
        Vehicle v = vehicles.get(vehicleId);
        if (v == null) return;
        
        // Calculate distance from last position
        if (v.lastUpdateTime > 0) {
            double dist = Geofence.haversineKm(v.latitude, v.longitude, lat, lon);
            v.totalDistanceKm += dist;
        }
        
        v.latitude = lat;
        v.longitude = lon;
        v.speed = speed;
        v.lastUpdateTime = System.currentTimeMillis();
        
        // Update health
        if (health != null) {
            v.health = health;
            List<String> healthAlerts = health.checkAlerts();
            if (!healthAlerts.isEmpty()) {
                for (FleetEventListener l : listeners) l.onHealthAlert(vehicleId, healthAlerts);
            }
        }
        
        // Check geofences
        checkGeofences(vehicleId, lat, lon);
    }
    
    /**
     * Geofence enter/exit detection:
     * Compare current geofence containment with previous state.
     */
    void checkGeofences(String vehicleId, double lat, double lon) {
        Set<String> previousFences = vehicleGeofenceState.getOrDefault(vehicleId, new HashSet<>());
        Set<String> currentFences = new HashSet<>();
        
        for (Geofence gf : geofences.values()) {
            if (gf.contains(lat, lon)) {
                currentFences.add(gf.id);
                
                // ENTERED
                if (!previousFences.contains(gf.id)) {
                    GeofenceAlert alert = new GeofenceAlert(vehicleId, gf.id, "ENTERED", lat, lon);
                    alerts.add(alert);
                    for (FleetEventListener l : listeners) l.onGeofenceAlert(alert);
                }
            }
        }
        
        // EXITED (was inside, now outside)
        for (String prevFenceId : previousFences) {
            if (!currentFences.contains(prevFenceId)) {
                GeofenceAlert alert = new GeofenceAlert(vehicleId, prevFenceId, "EXITED", lat, lon);
                alerts.add(alert);
                for (FleetEventListener l : listeners) l.onGeofenceAlert(alert);
            }
        }
        
        vehicleGeofenceState.put(vehicleId, currentFences);
    }
    
    // ---- Trip Assignment ----
    
    /**
     * Assign nearest available vehicle to a trip.
     * Only considers AVAILABLE vehicles with healthy status.
     */
    String assignTrip(double pickupLat, double pickupLon, double dropLat, double dropLon) {
        Vehicle nearest = null;
        double minDist = Double.MAX_VALUE;
        
        for (Vehicle v : vehicles.values()) {
            if (!"AVAILABLE".equals(v.status) || !v.health.isHealthy) continue;
            
            double dist = Geofence.haversineKm(v.latitude, v.longitude, pickupLat, pickupLon);
            if (dist < minDist) {
                minDist = dist;
                nearest = v;
            }
        }
        
        if (nearest == null) return null;
        
        String tripId = "trip_" + System.currentTimeMillis();
        Trip trip = new Trip(tripId, pickupLat, pickupLon, dropLat, dropLon);
        trip.vehicleId = nearest.id;
        trips.put(tripId, trip);
        
        nearest.status = "ON_TRIP";
        nearest.currentTripId = tripId;
        
        return tripId;
    }
    
    void completeTrip(String tripId) {
        Trip trip = trips.get(tripId);
        if (trip == null) return;
        
        trip.status = "COMPLETED";
        trip.endTime = System.currentTimeMillis();
        
        Vehicle v = vehicles.get(trip.vehicleId);
        if (v != null) {
            v.status = "AVAILABLE";
            v.currentTripId = null;
        }
    }
    
    // ---- Geofence Management ----
    
    void addGeofence(Geofence geofence) {
        geofences.put(geofence.id, geofence);
    }
    
    // ---- Analytics ----
    
    FleetAnalytics getAnalytics() {
        FleetAnalytics analytics = new FleetAnalytics();
        analytics.totalVehicles = vehicles.size();
        
        for (Vehicle v : vehicles.values()) {
            switch (v.status) {
                case "AVAILABLE": analytics.availableVehicles++; break;
                case "ON_TRIP": analytics.onTripVehicles++; break;
                case "MAINTENANCE": analytics.maintenanceVehicles++; break;
            }
            analytics.totalDistanceKm += v.totalDistanceKm;
            if (!v.health.isHealthy) analytics.unhealthyVehicles++;
        }
        
        analytics.utilizationRate = analytics.totalVehicles > 0 ? 
            (double) analytics.onTripVehicles / analytics.totalVehicles : 0;
        analytics.totalAlerts = alerts.size();
        
        return analytics;
    }
}
```

---

## 🎯 Key Takeaways
- Ola SDE-3 FS = **Fleet management: location tracking, geofence detection, health monitoring, trip assignment**
- **Geofence enter/exit**: diff current containment set vs previous — `ENTERED` = new presence, `EXITED` = disappeared
- **Haversine**: great-circle distance from lat/lon — standard for all geo problems
- **Nearest vehicle**: O(N) scan of available healthy vehicles — for production: use spatial index (R-tree, geohash grid)
- **Vehicle health**: battery + tire pressure + engine temp — thresholds trigger alerts
- **Observer pattern**: `FleetEventListener` for geofence alerts and health alerts — decouples alert processing
- **ConcurrentHashMap + CopyOnWriteArrayList**: thread-safe for concurrent location updates from multiple vehicles
- **Distance tracking**: cumulative Haversine between consecutive updates — updated on each location ping

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Very Hard | Geo, Real-Time, State Management |
| System Design | Very Hard | Fleet Tracking at Scale |
| HM | Medium | Culture |
