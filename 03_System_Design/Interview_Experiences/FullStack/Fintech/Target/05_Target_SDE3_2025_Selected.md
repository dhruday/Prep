# Target — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target (Tech India) |
| **Role** | Lead Engineer |
| **Level** | SDE-3 |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/target-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Inventory & Fulfillment |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + LLD + System Design + HM)

---

## Round 3: System Design — Target's Inventory Availability System
**Duration:** 60 minutes

### Challenge: Design a system that shows real-time inventory availability across 1900+ stores for online and BOPIS (Buy Online, Pick Up In Store) orders.

### Architecture:
```
┌──────────────────────────────────────────────────────────────────┐
│         Target Inventory Availability System                     │
│                                                                  │
│  Challenge: Show "Available at Store X: 5 remaining" in <100ms  │
│  Scale: 1900 stores × 200K SKUs = ~380M inventory records       │
│  Updates: ~500K inventory changes per hour (sales, restocks)     │
│                                                                  │
│  Data Sources:                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ POS (Point of Sale):                                       │   │
│  │  - Each sale → Kafka event → decrement inventory           │   │
│  │  - Batch: nightly full reconciliation from POS system      │   │
│  │                                                            │   │
│  │ Warehouse Management System (WMS):                         │   │
│  │  - Receiving → increment                                   │   │
│  │  - Transfers between stores → decrement/increment          │   │
│  │  - Damaged / returned → adjust                             │   │
│  │                                                            │   │
│  │ Online Orders:                                             │   │
│  │  - Reservation (soft lock): hold qty for 30 min            │   │
│  │  - Fulfillment: decrement when picked from shelf           │   │
│  │  - Cancellation: release reservation                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │ Inventory Event Stream (Kafka):                            │   │
│  │                                                            │   │
│  │ Topic: inventory.changes                                   │   │
│  │ Partition key: storeId + SKU (co-locate store-item events) │   │
│  │                                                            │   │
│  │ Event: {                                                   │   │
│  │   storeId, sku, changeType: "sale|restock|transfer|hold",  │   │
│  │   delta: -1, timestamp, orderId (for reservations)         │   │
│  │ }                                                          │   │
│  │                                                            │   │
│  │ Consumer: Flink job that materializes current state         │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │ Inventory Store (Materialized View):                       │   │
│  │                                                            │   │
│  │ Primary: Redis Cluster                                     │   │
│  │   Key: inv:{storeId}:{sku}                                 │   │
│  │   Value: { onHand: 15, reserved: 3, available: 12 }        │   │
│  │   available = onHand - reserved                             │   │
│  │                                                            │   │
│  │   Operations:                                              │   │
│  │   - HINCRBY inv:{store}:{sku} onHand -1  (sale)           │   │
│  │   - HINCRBY inv:{store}:{sku} reserved 1 (hold)            │   │
│  │   - All atomic: Redis single-thread guarantees              │   │
│  │                                                            │   │
│  │ Secondary: PostgreSQL (source of truth for reconciliation) │   │
│  │   - Nightly batch job compares POS totals with Redis        │   │
│  │   - Fix discrepancies (events lost, race conditions)        │   │
│  │                                                            │   │
│  │ Scale:                                                     │   │
│  │   ~380M keys, ~150GB in Redis (sharded across 50 nodes)    │   │
│  │   Read: ~100K lookups/sec peak (product page loads)         │   │
│  │   Write: ~140 updates/sec (sales across all stores)         │   │
│  └────────────────────────┬──────────────────────────────────┘   │
│                           │                                      │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │ Availability API:                                          │   │
│  │                                                            │   │
│  │ GET /availability?sku=ABC&lat=33.7&lng=-84.4&radius=50    │   │
│  │ → Nearby stores with availability                          │   │
│  │                                                            │   │
│  │ 1. Geo lookup: find stores within radius (PostGIS / H3)   │   │
│  │ 2. Redis MGET for each store's inventory                   │   │
│  │ 3. Filter: available > threshold (e.g., > 2 for BOPIS)    │   │
│  │ 4. Sort by distance, return top 10                         │   │
│  │                                                            │   │
│  │ Response: {                                                │   │
│  │   [{ storeId, storeName, distance: "2.3 mi",              │   │
│  │      available: 5, pickupReady: "Today by 6pm" }]          │   │
│  │ }                                                          │   │
│  │                                                            │   │
│  │ Latency: P99 < 80ms                                       │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Reservation System (Soft Lock):                                 │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Problem: User adds BOPIS item to cart → must hold inventory│   │
│  │ Solution: Redis HINCRBY reserved +1, set TTL 30min          │   │
│  │                                                            │   │
│  │ Script (Lua - atomic):                                     │   │
│  │   local avail = redis.call('HGET', key, 'onHand')         │   │
│  │                - redis.call('HGET', key, 'reserved')       │   │
│  │   if avail > 0 then                                        │   │
│  │     redis.call('HINCRBY', key, 'reserved', 1)             │   │
│  │     redis.call('SADD', 'reservations:{orderId}', key)      │   │
│  │     redis.call('EXPIRE', 'reservations:{orderId}', 1800)   │   │
│  │     return 1  -- success                                   │   │
│  │   end                                                      │   │
│  │   return 0  -- out of stock                                │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Safety Buffers:                                                 │
│  - Display threshold: show "Low Stock" when available <= 3      │
│  - Hide exact count when available <= 5 (show "Limited Stock")  │
│  - BOPIS buffer: hold 2 units from available count               │
│  - Why: shelf count may be inaccurate (theft, misplacement)      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Target SDE-3 = **Inventory availability system — Redis materialized view, soft lock, geo query**
- **Key design**: `inv:{storeId}:{sku}` → `{ onHand, reserved, available }` — available = onHand - reserved
- **Atomic operations**: Redis `HINCRBY` for increment/decrement — single-threaded guarantee
- **Lua script for reservation**: check available > 0 AND reserve atomically — prevents overselling
- **Event-driven**: POS sale → Kafka → Flink → Redis — near real-time inventory updates
- **Nightly reconciliation**: compare POS total vs Redis — fix drift from lost events
- **Geo lookup**: PostGIS or H3 for "stores near me" → Redis MGET for all stores' inventory
- **Safety buffers**: hide exact count, BOPIS buffer — account for physical inventory inaccuracy
- **Reservation TTL**: 30 min → auto-release if cart abandoned — `EXPIRE` on reservation set
- Target = **retail tech** at scale — inventory, pricing, fulfillment, BOPIS/Drive Up

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| LLD | Hard | Inventory Manager |
| System Design | Very Hard | Inventory at Scale, Redis |
| HM | Medium | Culture Fit |
