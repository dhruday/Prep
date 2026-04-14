# Walmart — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart Global Tech |
| **Role** | Software Engineer 3 |
| **Level** | SDE-3 |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Technical — Implement an Inventory Reservation System
**Duration:** 60 minutes

### Problem
Design an inventory system for a large retailer that:
- Reserves inventory on "Add to Cart" (soft lock with TTL)
- Confirms reservation on checkout
- Releases expired reservations automatically
- Handles concurrent reservations with atomic operations

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.*;

public class InventoryReservationSystem {

    static class Product {
        final String sku;
        volatile int totalStock;
        volatile int reserved;       // Soft-locked quantity
        volatile int confirmed;      // Hard-locked (purchased)

        Product(String sku, int totalStock) {
            this.sku = sku;
            this.totalStock = totalStock;
            this.reserved = 0;
            this.confirmed = 0;
        }

        int available() { return totalStock - reserved - confirmed; }
    }

    static class Reservation {
        final String reservationId;
        final String sku;
        final int quantity;
        final long expiryTime;
        volatile boolean confirmed;
        volatile boolean released;

        Reservation(String id, String sku, int qty, long expiryTime) {
            this.reservationId = id;
            this.sku = sku;
            this.quantity = qty;
            this.expiryTime = expiryTime;
        }
    }

    private final ConcurrentHashMap<String, Product> products = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Reservation> reservations = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ReentrantLock> skuLocks = new ConcurrentHashMap<>();

    // Group reservations by SKU for efficient expiry scans
    private final ConcurrentHashMap<String, Set<String>> skuReservations = new ConcurrentHashMap<>();

    private final ScheduledExecutorService cleanupScheduler;
    private static final long DEFAULT_RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes
    private int reservationCounter = 0;

    public InventoryReservationSystem() {
        cleanupScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "reservation-cleanup");
            t.setDaemon(true);
            return t;
        });
        // Run cleanup every 30 seconds
        cleanupScheduler.scheduleAtFixedRate(
            this::cleanupExpiredReservations, 30, 30, TimeUnit.SECONDS);
    }

    public void addProduct(String sku, int stock) {
        products.put(sku, new Product(sku, stock));
        skuLocks.putIfAbsent(sku, new ReentrantLock());
    }

    public void restockProduct(String sku, int additionalStock) {
        ReentrantLock lock = skuLocks.get(sku);
        if (lock == null) throw new IllegalArgumentException("Unknown SKU: " + sku);

        lock.lock();
        try {
            Product product = products.get(sku);
            product.totalStock += additionalStock;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Reserve inventory (Add to Cart).
     * Returns reservation ID or null if insufficient stock.
     * 
     * Thread-safe via per-SKU lock.
     */
    public String reserve(String sku, int quantity) {
        return reserve(sku, quantity, DEFAULT_RESERVATION_TTL_MS);
    }

    public String reserve(String sku, int quantity, long ttlMs) {
        ReentrantLock lock = skuLocks.get(sku);
        if (lock == null) throw new IllegalArgumentException("Unknown SKU: " + sku);

        lock.lock();
        try {
            Product product = products.get(sku);
            if (product.available() < quantity) {
                return null; // Insufficient stock
            }

            String resId = generateReservationId();
            long expiry = System.currentTimeMillis() + ttlMs;
            Reservation reservation = new Reservation(resId, sku, quantity, expiry);

            product.reserved += quantity;
            reservations.put(resId, reservation);
            skuReservations.computeIfAbsent(sku, k ->
                ConcurrentHashMap.newKeySet()).add(resId);

            return resId;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Confirm reservation (Checkout complete).
     * Converts soft lock to hard lock (confirmed purchase).
     */
    public boolean confirm(String reservationId) {
        Reservation res = reservations.get(reservationId);
        if (res == null || res.confirmed || res.released) return false;

        ReentrantLock lock = skuLocks.get(res.sku);
        lock.lock();
        try {
            // Check if expired
            if (System.currentTimeMillis() > res.expiryTime) {
                releaseInternal(res);
                return false;
            }

            Product product = products.get(res.sku);
            product.reserved -= res.quantity;
            product.confirmed += res.quantity;
            res.confirmed = true;

            return true;
        } finally {
            lock.unlock();
        }
    }

    /**
     * Manually release a reservation (e.g., "Remove from Cart").
     */
    public boolean release(String reservationId) {
        Reservation res = reservations.get(reservationId);
        if (res == null || res.confirmed || res.released) return false;

        ReentrantLock lock = skuLocks.get(res.sku);
        lock.lock();
        try {
            return releaseInternal(res);
        } finally {
            lock.unlock();
        }
    }

    private boolean releaseInternal(Reservation res) {
        if (res.released || res.confirmed) return false;

        Product product = products.get(res.sku);
        product.reserved -= res.quantity;
        res.released = true;

        skuReservations.getOrDefault(res.sku, Collections.emptySet())
            .remove(res.reservationId);

        return true;
    }

    /**
     * Clean up expired reservations — runs periodically.
     */
    private void cleanupExpiredReservations() {
        long now = System.currentTimeMillis();
        int cleaned = 0;

        for (Map.Entry<String, Set<String>> entry : skuReservations.entrySet()) {
            String sku = entry.getKey();
            ReentrantLock lock = skuLocks.get(sku);

            if (lock.tryLock()) {
                try {
                    Iterator<String> it = entry.getValue().iterator();
                    while (it.hasNext()) {
                        String resId = it.next();
                        Reservation res = reservations.get(resId);
                        if (res != null && !res.confirmed && !res.released
                            && now > res.expiryTime) {
                            Product product = products.get(sku);
                            product.reserved -= res.quantity;
                            res.released = true;
                            it.remove();
                            cleaned++;
                        }
                    }
                } finally {
                    lock.unlock();
                }
            }
        }

        if (cleaned > 0) {
            System.out.println("[Cleanup] Released " + cleaned + " expired reservations");
        }
    }

    public Map<String, Object> getStockInfo(String sku) {
        Product p = products.get(sku);
        if (p == null) return null;

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("sku", p.sku);
        info.put("totalStock", p.totalStock);
        info.put("available", p.available());
        info.put("reserved", p.reserved);
        info.put("confirmed", p.confirmed);
        return info;
    }

    private synchronized String generateReservationId() {
        return "RES-" + String.format("%06d", ++reservationCounter);
    }

    public void shutdown() {
        cleanupScheduler.shutdown();
    }

    public static void main(String[] args) throws Exception {
        InventoryReservationSystem system = new InventoryReservationSystem();

        system.addProduct("IPHONE-15", 10);
        system.addProduct("MACBOOK-M3", 5);

        System.out.println("Initial stock: " + system.getStockInfo("IPHONE-15"));

        // User A adds 2 iPhones to cart
        String resA = system.reserve("IPHONE-15", 2);
        System.out.println("User A reserved: " + resA);
        System.out.println("After reserve A: " + system.getStockInfo("IPHONE-15"));

        // User B adds 3 iPhones to cart
        String resB = system.reserve("IPHONE-15", 3);
        System.out.println("User B reserved: " + resB);
        System.out.println("After reserve B: " + system.getStockInfo("IPHONE-15"));

        // User A checks out
        boolean confirmed = system.confirm(resA);
        System.out.println("User A confirmed: " + confirmed);
        System.out.println("After confirm A: " + system.getStockInfo("IPHONE-15"));

        // User B removes from cart
        boolean released = system.release(resB);
        System.out.println("User B released: " + released);
        System.out.println("After release B: " + system.getStockInfo("IPHONE-15"));

        // Simulate concurrent reservations
        ExecutorService exec = Executors.newFixedThreadPool(10);
        List<Future<String>> futures = new ArrayList<>();
        for (int i = 0; i < 15; i++) {
            final int userId = i;
            futures.add(exec.submit(() ->
                system.reserve("IPHONE-15", 1)));
        }

        int successCount = 0;
        for (Future<String> f : futures) {
            if (f.get() != null) successCount++;
        }
        System.out.println("\nConcurrent: " + successCount + "/15 reservations succeeded");
        System.out.println("Final stock: " + system.getStockInfo("IPHONE-15"));

        exec.shutdown();
        system.shutdown();
    }
}
```

## 🎯 Key Takeaways
- Walmart interviews focus on **e-commerce inventory** problems — directly relevant to their business
- Per-SKU locking is more efficient than a global lock
- **Soft lock + TTL** pattern: reserve on add-to-cart, auto-release if not checked out
- `tryLock()` in cleanup avoids blocking the cleanup thread on hot SKUs
- Track reserved vs confirmed quantities separately for accurate availability
- Concurrent stress test is important to validate thread safety

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Hard | Concurrency, Inventory, TTL |
| Technical 2 | Medium | Graph Algorithms |
| HM | Medium | Behavioral |
