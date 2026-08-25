# Flipkart — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-3 |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/flipkart-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 DS/Algo + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Machine Coding — Implement a Flash Sale System
**Duration:** 90 minutes

### Problem
Design and implement a Flash Sale system that:
- Handles millions of concurrent requests for limited stock
- Ensures no overselling
- First-come-first-served fairness
- Request deduplication per user
- Rate limiting to prevent bot abuse

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class FlashSaleSystem {

    enum OrderStatus { QUEUED, CONFIRMED, REJECTED, EXPIRED }

    static class FlashSale {
        final String saleId;
        final String productId;
        final AtomicInteger remainingStock;
        final long startTime;
        final long endTime;
        final int maxPerUser;

        FlashSale(String saleId, String productId, int stock,
                  long startTime, long endTime, int maxPerUser) {
            this.saleId = saleId;
            this.productId = productId;
            this.remainingStock = new AtomicInteger(stock);
            this.startTime = startTime;
            this.endTime = endTime;
            this.maxPerUser = maxPerUser;
        }

        boolean isActive() {
            long now = System.currentTimeMillis();
            return now >= startTime && now <= endTime && remainingStock.get() > 0;
        }
    }

    static class PurchaseRequest {
        final String requestId;
        final String userId;
        final String saleId;
        final int quantity;
        final long timestamp;
        volatile OrderStatus status;

        PurchaseRequest(String requestId, String userId, String saleId, int quantity) {
            this.requestId = requestId;
            this.userId = userId;
            this.saleId = saleId;
            this.quantity = quantity;
            this.timestamp = System.currentTimeMillis();
            this.status = OrderStatus.QUEUED;
        }
    }

    private final ConcurrentHashMap<String, FlashSale> sales = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, PurchaseRequest> orders = new ConcurrentHashMap<>();

    // Deduplication: userId:saleId -> total purchased
    private final ConcurrentHashMap<String, AtomicInteger> userPurchases = new ConcurrentHashMap<>();

    // Rate limiting: userId -> sliding window timestamps
    private final ConcurrentHashMap<String, Deque<Long>> rateLimitWindows = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_SECOND = 5;

    // Request dedup: requestId -> already processed
    private final ConcurrentHashMap<String, Boolean> processedRequests = new ConcurrentHashMap<>();

    public void createSale(String saleId, String productId, int stock,
                           long startTime, long endTime, int maxPerUser) {
        sales.put(saleId, new FlashSale(saleId, productId, stock,
            startTime, endTime, maxPerUser));
    }

    /**
     * Process a purchase request.
     * Returns order status synchronously for simplicity.
     * In production, this would be async via a message queue.
     */
    public PurchaseRequest purchase(String requestId, String userId,
                                     String saleId, int quantity) {
        PurchaseRequest request = new PurchaseRequest(requestId, userId, saleId, quantity);

        // 1. Idempotency check (request dedup)
        if (processedRequests.putIfAbsent(requestId, true) != null) {
            PurchaseRequest existing = orders.get(requestId);
            return existing != null ? existing : request;
        }

        // 2. Rate limiting
        if (!checkRateLimit(userId)) {
            request.status = OrderStatus.REJECTED;
            orders.put(requestId, request);
            return request;
        }

        // 3. Validate sale
        FlashSale sale = sales.get(saleId);
        if (sale == null || !sale.isActive()) {
            request.status = OrderStatus.REJECTED;
            orders.put(requestId, request);
            return request;
        }

        // 4. Per-user limit check
        String userKey = userId + ":" + saleId;
        AtomicInteger userTotal = userPurchases.computeIfAbsent(
            userKey, k -> new AtomicInteger(0));
        int currentUserTotal = userTotal.get();
        if (currentUserTotal + quantity > sale.maxPerUser) {
            request.status = OrderStatus.REJECTED;
            orders.put(requestId, request);
            return request;
        }

        // 5. Atomic stock decrement (CAS loop)
        while (true) {
            int current = sale.remainingStock.get();
            if (current < quantity) {
                request.status = OrderStatus.REJECTED;
                break;
            }

            if (sale.remainingStock.compareAndSet(current, current - quantity)) {
                // Stock reserved! Update user purchase count
                userTotal.addAndGet(quantity);
                request.status = OrderStatus.CONFIRMED;
                break;
            }
            // CAS failed — another thread modified stock, retry
        }

        orders.put(requestId, request);
        return request;
    }

    /**
     * Sliding window rate limiter.
     * Allows MAX_REQUESTS_PER_SECOND per user.
     */
    private boolean checkRateLimit(String userId) {
        long now = System.currentTimeMillis();
        long windowStart = now - 1000;

        Deque<Long> window = rateLimitWindows.computeIfAbsent(
            userId, k -> new ConcurrentLinkedDeque<>());

        // Remove timestamps outside window
        while (!window.isEmpty() && window.peekFirst() < windowStart) {
            window.pollFirst();
        }

        if (window.size() >= MAX_REQUESTS_PER_SECOND) {
            return false;
        }

        window.addLast(now);
        return true;
    }

    public Map<String, Object> getSaleStatus(String saleId) {
        FlashSale sale = sales.get(saleId);
        if (sale == null) return null;

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("saleId", sale.saleId);
        status.put("remainingStock", sale.remainingStock.get());
        status.put("isActive", sale.isActive());
        return status;
    }

    public static void main(String[] args) throws Exception {
        FlashSaleSystem system = new FlashSaleSystem();

        long now = System.currentTimeMillis();
        system.createSale("SALE001", "IPHONE16", 100,
            now, now + 3600000, 2); // 100 units, 1hr, max 2/user

        System.out.println("Sale created: " + system.getSaleStatus("SALE001"));

        // Simulate concurrent purchases
        ExecutorService exec = Executors.newFixedThreadPool(50);
        AtomicInteger confirmedCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);
        CountDownLatch latch = new CountDownLatch(200);

        for (int i = 0; i < 200; i++) {
            final int idx = i;
            exec.submit(() -> {
                try {
                    String userId = "user_" + (idx % 80); // 80 unique users
                    String reqId = "REQ-" + UUID.randomUUID().toString().substring(0, 8);
                    PurchaseRequest result = system.purchase(reqId, userId, "SALE001", 1);

                    if (result.status == OrderStatus.CONFIRMED) {
                        confirmedCount.incrementAndGet();
                    } else {
                        rejectedCount.incrementAndGet();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();

        System.out.println("\nResults:");
        System.out.println("Confirmed: " + confirmedCount.get());
        System.out.println("Rejected: " + rejectedCount.get());
        System.out.println("Remaining stock: " + system.getSaleStatus("SALE001"));

        // Test idempotency — same request ID
        PurchaseRequest r1 = system.purchase("REQ-SAME", "user_1", "SALE001", 1);
        PurchaseRequest r2 = system.purchase("REQ-SAME", "user_1", "SALE001", 1);
        System.out.println("\nIdempotency: r1=" + r1.status + ", r2=" + r2.status);
        System.out.println("Same result: " + (r1.status == r2.status));

        exec.shutdown();
    }
}
```

## 🎯 Key Takeaways
- Flipkart **loves** machine coding rounds — flash sale is a classic
- `AtomicInteger.compareAndSet` (CAS) for lock-free stock decrement
- 5-layer validation: idempotency → rate limit → sale validity → user limit → stock check
- Request deduplication via requestId prevents double charging
- Sliding window rate limiter per user prevents bot abuse
- Per-user purchase limit tracked via AtomicInteger

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Concurrency, Atomic Operations, Rate Limiting |
| DS/Algo 1 | Hard | Graph Algorithms |
| DS/Algo 2 | Medium-Hard | DP, Trees |
| HM | Medium | Behavioral |
