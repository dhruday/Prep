# Grab/Gojek — Senior FullStack Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Senior FullStack Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | May 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + SD + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: System Design + Implementation — Surge Pricing Engine

### Problem
Design and implement a surge pricing engine for a ride-hailing service:
1. Calculate surge multiplier based on real-time supply/demand ratio in a geo-zone
2. Zone management: define geo-zones with boundaries
3. Dynamic pricing: multiplier tiers (1.0x, 1.2x, 1.5x, 2.0x, 3.0x) based on demand-supply ratio
4. Cooldown: surge doesn't drop instantly — gradual decay over 5 minutes
5. Cap maximum surge at 3.0x
6. Audit log: record every surge calculation with timestamp, zone, inputs, result
7. API: `calculatePrice(zoneId, basePrice)` returns surged price

Implement in **Java**.

### 💡 Interview-Ready Answer

```java
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

public class SurgePricingEngine {

    // ============================================================
    // ZONE
    // ============================================================
    static class GeoZone {
        String zoneId;
        String name;
        double latMin, latMax, lonMin, lonMax; // bounding box

        GeoZone(String zoneId, String name, double latMin, double latMax, double lonMin, double lonMax) {
            this.zoneId = zoneId;
            this.name = name;
            this.latMin = latMin;
            this.latMax = latMax;
            this.lonMin = lonMin;
            this.lonMax = lonMax;
        }

        boolean contains(double lat, double lon) {
            return lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax;
        }
    }

    // ============================================================
    // SURGE TIER
    // ============================================================
    static class SurgeTier {
        double minDemandSupplyRatio;
        double multiplier;

        SurgeTier(double minRatio, double multiplier) {
            this.minDemandSupplyRatio = minRatio;
            this.multiplier = multiplier;
        }
    }

    static final List<SurgeTier> SURGE_TIERS = List.of(
        new SurgeTier(3.0, 3.0),
        new SurgeTier(2.5, 2.0),
        new SurgeTier(2.0, 1.5),
        new SurgeTier(1.5, 1.2),
        new SurgeTier(0.0, 1.0)
    );

    static final double MAX_SURGE = 3.0;
    static final long COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

    // ============================================================
    // ZONE STATE
    // ============================================================
    static class ZoneState {
        double currentSurge = 1.0;
        double targetSurge = 1.0;
        long lastUpdateTime = System.currentTimeMillis();
        int demandCount = 0;  // ride requests in last window
        int supplyCount = 0;  // available drivers in zone

        void updateDemandSupply(int demand, int supply) {
            this.demandCount = demand;
            this.supplyCount = Math.max(supply, 1); // prevent division by zero
        }
    }

    // ============================================================
    // AUDIT LOG
    // ============================================================
    static class AuditEntry {
        Instant timestamp;
        String zoneId;
        int demand;
        int supply;
        double dsRatio;
        double targetSurge;
        double appliedSurge;
        double basePrice;
        double finalPrice;

        @Override
        public String toString() {
            return String.format("[%s] Zone=%s D/S=%d/%d(%.2f) target=%.1fx applied=%.2fx base=%.0f final=%.0f",
                timestamp, zoneId, demand, supply, dsRatio, targetSurge, appliedSurge, basePrice, finalPrice);
        }
    }

    // ============================================================
    // ENGINE
    // ============================================================
    private final Map<String, GeoZone> zones = new ConcurrentHashMap<>();
    private final Map<String, ZoneState> zoneStates = new ConcurrentHashMap<>();
    private final List<AuditEntry> auditLog = Collections.synchronizedList(new ArrayList<>());

    public void registerZone(GeoZone zone) {
        zones.put(zone.zoneId, zone);
        zoneStates.put(zone.zoneId, new ZoneState());
    }

    public String findZoneForLocation(double lat, double lon) {
        for (GeoZone zone : zones.values()) {
            if (zone.contains(lat, lon)) return zone.zoneId;
        }
        return null;
    }

    // Update demand-supply for a zone (called periodically by aggregator)
    public void updateDemandSupply(String zoneId, int demand, int supply) {
        ZoneState state = zoneStates.get(zoneId);
        if (state == null) return;

        synchronized (state) {
            state.updateDemandSupply(demand, supply);

            double ratio = (double) state.demandCount / state.supplyCount;
            double newTarget = calculateTargetSurge(ratio);
            state.targetSurge = newTarget;
            state.lastUpdateTime = System.currentTimeMillis();
        }
    }

    private double calculateTargetSurge(double dsRatio) {
        for (SurgeTier tier : SURGE_TIERS) {
            if (dsRatio >= tier.minDemandSupplyRatio) {
                return Math.min(tier.multiplier, MAX_SURGE);
            }
        }
        return 1.0;
    }

    // Gradual cooldown: if target < current, decay gradually
    private double getEffectiveSurge(ZoneState state) {
        long elapsed = System.currentTimeMillis() - state.lastUpdateTime;

        if (state.targetSurge >= state.currentSurge) {
            // Surge UP: apply immediately
            state.currentSurge = state.targetSurge;
        } else {
            // Surge DOWN: gradual decay over COOLDOWN_MS
            double decayProgress = Math.min(1.0, (double) elapsed / COOLDOWN_MS);
            double diff = state.currentSurge - state.targetSurge;
            state.currentSurge = state.targetSurge + diff * (1.0 - decayProgress);
        }

        // Round to 1 decimal
        return Math.round(state.currentSurge * 10.0) / 10.0;
    }

    // ============================================================
    // CALCULATE PRICE (Main API)
    // ============================================================
    public PriceResult calculatePrice(String zoneId, double basePrice) {
        ZoneState state = zoneStates.get(zoneId);
        if (state == null) {
            return new PriceResult(basePrice, 1.0, basePrice);
        }

        double surge;
        synchronized (state) {
            surge = getEffectiveSurge(state);
        }

        double finalPrice = Math.round(basePrice * surge);

        // Audit
        AuditEntry entry = new AuditEntry();
        entry.timestamp = Instant.now();
        entry.zoneId = zoneId;
        entry.demand = state.demandCount;
        entry.supply = state.supplyCount;
        entry.dsRatio = (double) state.demandCount / state.supplyCount;
        entry.targetSurge = state.targetSurge;
        entry.appliedSurge = surge;
        entry.basePrice = basePrice;
        entry.finalPrice = finalPrice;
        auditLog.add(entry);

        return new PriceResult(basePrice, surge, finalPrice);
    }

    static class PriceResult {
        double basePrice;
        double surgeMultiplier;
        double finalPrice;

        PriceResult(double basePrice, double surgeMultiplier, double finalPrice) {
            this.basePrice = basePrice;
            this.surgeMultiplier = surgeMultiplier;
            this.finalPrice = finalPrice;
        }

        @Override
        public String toString() {
            return String.format("Base=₹%.0f, Surge=%.1fx, Final=₹%.0f", basePrice, surgeMultiplier, finalPrice);
        }
    }

    // ============================================================
    // QUERY AUDIT LOG
    // ============================================================
    public List<AuditEntry> getAuditLog(String zoneId, int limit) {
        return auditLog.stream()
            .filter(e -> zoneId == null || e.zoneId.equals(zoneId))
            .sorted((a, b) -> b.timestamp.compareTo(a.timestamp))
            .limit(limit)
            .toList();
    }

    // ============================================================
    // DEMO
    // ============================================================
    public static void main(String[] args) throws InterruptedException {
        SurgePricingEngine engine = new SurgePricingEngine();

        // Register zones
        engine.registerZone(new GeoZone("MG_ROAD", "MG Road", 12.97, 12.98, 77.60, 77.62));
        engine.registerZone(new GeoZone("AIRPORT", "Airport", 13.19, 13.21, 77.70, 77.72));
        engine.registerZone(new GeoZone("WHITEFIELD", "Whitefield", 12.96, 12.98, 77.74, 77.76));

        // Simulate demand-supply updates
        System.out.println("=== Normal Demand ===");
        engine.updateDemandSupply("MG_ROAD", 10, 15);    // ratio 0.67 → 1.0x
        engine.updateDemandSupply("AIRPORT", 50, 20);     // ratio 2.5 → 2.0x
        engine.updateDemandSupply("WHITEFIELD", 30, 10);  // ratio 3.0 → 3.0x

        PriceResult r1 = engine.calculatePrice("MG_ROAD", 150);
        System.out.println("MG Road: " + r1);

        PriceResult r2 = engine.calculatePrice("AIRPORT", 500);
        System.out.println("Airport: " + r2);

        PriceResult r3 = engine.calculatePrice("WHITEFIELD", 200);
        System.out.println("Whitefield: " + r3);

        // Simulate supply increase (surge should decay gradually)
        System.out.println("\n=== Supply Increases at Airport ===");
        engine.updateDemandSupply("AIRPORT", 20, 20); // ratio 1.0 → target 1.0x
        // Immediately check — should still be close to 2.0x (cooldown)
        PriceResult r4 = engine.calculatePrice("AIRPORT", 500);
        System.out.println("Airport (immediate): " + r4);

        // Wait 2.5 min (simulated) — set last update back
        engine.zoneStates.get("AIRPORT").lastUpdateTime = System.currentTimeMillis() - 150_000;
        PriceResult r5 = engine.calculatePrice("AIRPORT", 500);
        System.out.println("Airport (after 2.5min): " + r5);

        // After full cooldown
        engine.zoneStates.get("AIRPORT").lastUpdateTime = System.currentTimeMillis() - 300_000;
        PriceResult r6 = engine.calculatePrice("AIRPORT", 500);
        System.out.println("Airport (after 5min): " + r6);

        // Audit log
        System.out.println("\n=== Audit Log ===");
        engine.getAuditLog(null, 5).forEach(System.out::println);

        // Zone lookup
        System.out.println("\n=== Zone Lookup ===");
        System.out.println("(12.975, 77.61) → " + engine.findZoneForLocation(12.975, 77.61)); // MG_ROAD
        System.out.println("(13.20, 77.71) → " + engine.findZoneForLocation(13.20, 77.71));   // AIRPORT
    }
}
```

### Expected Output
```
=== Normal Demand ===
MG Road: Base=₹150, Surge=1.0x, Final=₹150
Airport: Base=₹500, Surge=2.0x, Final=₹1000
Whitefield: Base=₹200, Surge=3.0x, Final=₹600

=== Supply Increases at Airport ===
Airport (immediate): Base=₹500, Surge=2.0x, Final=₹1000
Airport (after 2.5min): Base=₹500, Surge=1.5x, Final=₹750
Airport (after 5min): Base=₹500, Surge=1.0x, Final=₹500

=== Audit Log ===
[...] Zone=AIRPORT D/S=20/20(1.00) target=1.0x applied=1.0x base=500 final=500
[...] Zone=AIRPORT D/S=20/20(1.00) target=1.0x applied=1.5x base=500 final=750
[...] Zone=AIRPORT D/S=20/20(1.00) target=1.0x applied=2.0x base=500 final=1000
[...] Zone=WHITEFIELD D/S=30/10(3.00) target=3.0x applied=3.0x base=200 final=600
[...] Zone=AIRPORT D/S=50/20(2.50) target=2.0x applied=2.0x base=500 final=1000
```

## 🎯 Key Takeaways
- **Surge tiers**: descending ratio thresholds mapped to multiplier (3.0→3x, 2.5→2x, 2.0→1.5x, 1.5→1.2x)
- **Cooldown decay**: surge up = instant, surge down = linear decay over 5 min to prevent fare drops
- **Geo-zone**: bounding box containment check for zone assignment
- **Thread safety**: `ConcurrentHashMap` for zones, `synchronized` on zone state for D/S update + price calc
- **Audit log**: every price calculation logged with timestamp, inputs, D/S ratio, target, applied surge
- **Cap enforcement**: `Math.min(multiplier, MAX_SURGE)` ensures max 3.0x regardless of demand

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms |
| Technical 1 | Medium | Java, Concurrency |
| Technical 2 | Hard | Pricing Logic, Decay, Geo-zones |
| System Design | Hard | Ride-Hailing Architecture |
| Hiring Manager | Medium | Super-App Strategy |
