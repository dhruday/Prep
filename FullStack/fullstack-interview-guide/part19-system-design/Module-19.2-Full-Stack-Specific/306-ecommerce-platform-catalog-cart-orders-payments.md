# E-commerce Platform — Product Catalog, Cart, Orders, Payments
> Part 19 — System Design Case Studies · High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Domain decomposition**: Product Catalog serves reads (products, search, filters); Cart is ephemeral session state; Order management is the transactional core; Payment is the most critical (money flows); separate services, separate databases, separate SLAs
- **Product catalog**: read-heavy (100:1 read/write ratio); cache aggressively in Redis; Elasticsearch for full-text search + faceted filters; CDN for product images; event-driven update to Elasticsearch when product changes in the source DB
- **Cart**: no SQL needed — Redis Hash per user (`cart:{userId}` → `{productId: quantity}`); TTL = 30 days; cart is advisory — final price/stock check happens at checkout, not when adding to cart
- **Inventory**: add to cart ≠ reserve stock; stock counts in Redis (fast decrement); actual reservation happens at order placement with a transactional DB check; avoid oversell with optimistic locking or Redis atomic DECR with floor check
- **Order placement**: the most complex step — validate cart, check stock, create order, initiate payment, all in a distributed transaction (Saga pattern instead of 2PC); if payment fails → compensate by releasing stock
- **Payment**: never call payment gateway synchronously from your DB transaction; create order with status PENDING, redirect to payment, handle callback async; idempotency key on every payment API call
- **Oversell prevention**: Redis `DECR` is atomic — set stock count per SKU, use Lua script to check > 0 and decrement atomically; at order confirmation sync to DB; if DB and Redis diverge, DB is source of truth for reconciliation
- **Flash sale pattern**: pre-warm Redis stock counts; rate limit checkout requests; accept orders to queue, process async — better to tell users "order received" than to crash

---

## 1. One-Line Definition
An e-commerce platform separates product browsing, cart management, order orchestration, and payment into independent services, using Redis for cart and inventory speed, Elasticsearch for catalog search, Saga pattern for distributed order transactions, and async payment handling to avoid coupling checkout to gateway latency.

---

## 2. The Problem It Solves

A naive e-commerce site uses one monolithic database for everything. During a festive sale:
1. Product catalog reads slow down because inventory update writes are locking tables
2. 10,000 users add the same limited-edition sneaker to cart, all 10,000 try to checkout simultaneously
3. Only 100 pairs are in stock — the system processes all 10,000 orders while the payment gateway is slow, then realises it oversold by 9,900
4. Cancelling 9,900 orders after charging customers creates a customer service crisis

The solution: separate concerns, pre-reserve stock atomically before charging, use async Saga to handle failures gracefully, and decouple product browsing (always available) from the checkout flow (can be rate-limited during flash sales).

---

## 3. How It Works Internally

### Domain Services

```
Client (Browser / Mobile)
       │
       ▼
   API Gateway
  ┌────┴──────────────────────────────────────────────┐
  │                  │              │                   │
  ▼                  ▼              ▼                   ▼
Product            Cart           Order             Payment
Service            Service        Service           Service
  │                  │              │                   │
  │ PostgreSQL +      │ Redis         │ PostgreSQL        │ Razorpay /
  │ Elasticsearch     │ Hash          │ (orders, saga)    │ Stripe API
  │ (catalog, search) │ TTL=30d       │                   │
  └──────────────────────────────────────────────────────┘
                              │
                           Kafka
                      (domain events)
```

### Order Placement Saga

```
SAGA: PlaceOrder
─────────────────────────────────────────────────────────────
Step 1: ValidateCart     → CartService.validateAndPrice()
  compensate: nothing (read-only)

Step 2: ReserveStock     → InventoryService.reserve(orderId, items)
  → Redis atomic DECR per SKU
  → Publish stock.reserved event
  compensate: InventoryService.release(orderId)

Step 3: CreateOrder      → OrderService.create(status=PAYMENT_PENDING)
  compensate: OrderService.cancel(orderId)

Step 4: InitiatePayment  → PaymentService.initiatePayment(orderId, amount)
  → Calls Razorpay/Stripe; gets payment URL
  → Store paymentId in Order
  compensate: PaymentService.refund(paymentId) if already charged

Step 5: ConfirmOnWebhook → PaymentService receives gateway webhook
  → On success: Order status → CONFIRMED, reduce DB inventory
  → On failure: trigger reverse Saga (release stock, cancel order)
─────────────────────────────────────────────────────────────
If any step fails → compensate all previous steps in reverse order
```

---

## 4. The Code

### Wrong Way — Monolithic Order Placement

```java
// ❌ One big synchronous transaction for everything

@Transactional
@PostMapping("/checkout")
public OrderResponse checkout(@RequestBody CheckoutRequest req) {
    
    // ❌ Stock check + payment call inside same DB transaction
    // ❌ DB transaction held open while payment gateway responds (could be 8s)
    // ❌ DB connection pool exhausted during flash sale
    
    // ❌ Check stock inside transaction — holds row lock
    for (CartItem item : req.getItems()) {
        Product product = productRepository.findByIdWithLock(item.getProductId());  // SELECT FOR UPDATE
        if (product.getStock() < item.getQuantity()) {
            throw new InsufficientStockException(item.getProductId());
        }
        product.setStock(product.getStock() - item.getQuantity());
        productRepository.save(product);  // ❌ Stock decremented before payment confirmed
    }
    
    // ❌ If payment fails here, stock is already decremented — need manual rollback
    // ❌ If server crashes after stock decrement but before payment call — stock lost forever
    PaymentResult payment = paymentGateway.charge(req.getCardToken(), req.getTotal());
    
    Order order = orderRepository.save(new Order(req, payment.getPaymentId()));
    
    // ❌ If save fails, payment already happened — money taken, no order record
    return new OrderResponse(order.getId());
}
```

```java
// ✅ Saga-orchestrated order placement

// Step 1: Customer initiates checkout → create pending order
@RestController
@RequestMapping("/orders")
public class OrderController {
    private final OrderSagaOrchestrator sagaOrchestrator;
    
    @PostMapping("/checkout")
    public ResponseEntity<CheckoutInitResponse> initiateCheckout(
            @AuthenticationPrincipal UserDetails user,
            @RequestBody @Valid CheckoutRequest req) {
        
        CheckoutInitResponse response = sagaOrchestrator.startOrderSaga(
            user.getUsername(), req.getCartId(), req.getShippingAddressId()
        );
        
        // ✅ Return immediately with payment URL — don't wait for payment to complete
        return ResponseEntity.ok(response);
    }
}

@Service
public class OrderSagaOrchestrator {
    private final CartService cartService;
    private final InventoryService inventoryService;
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final SagaLogRepository sagaLogRepository;
    
    @Transactional
    public CheckoutInitResponse startOrderSaga(String userId, String cartId, Long addressId) {
        
        // ✅ Step 1: Validate cart and compute price (no stock reservation yet)
        ValidatedCart cart = cartService.validateAndPrice(userId, cartId);
        
        // ✅ Step 2: Reserve stock atomically in Redis
        String reservationId = inventoryService.reserveStock(cart.getItems());
        // reserveStock internally: Lua script on Redis — atomic check-and-decrement per SKU
        // Throws InsufficientStockException if any SKU can't be reserved
        
        // ✅ Step 3: Create order with PAYMENT_PENDING status
        Order order = orderRepository.save(Order.builder()
            .id(UUID.randomUUID().toString())
            .userId(userId)
            .items(cart.getItems())
            .totalAmount(cart.getTotal())
            .shippingAddressId(addressId)
            .reservationId(reservationId)
            .status(OrderStatus.PAYMENT_PENDING)
            .createdAt(Instant.now())
            .expiresAt(Instant.now().plus(15, MINUTES))   // ✅ reservation expires in 15 min
            .build());
        
        // ✅ Step 4: Create payment intent — get redirect URL (not charged yet)
        PaymentIntent intent = paymentService.createPaymentIntent(
            order.getId(),           // idempotency key = orderId
            cart.getTotal(),
            userId
        );
        
        order.setPaymentIntentId(intent.getId());
        orderRepository.save(order);
        
        return new CheckoutInitResponse(order.getId(), intent.getCheckoutUrl());
    }
}

// ✅ Inventory service: atomic Redis stock reservation
@Service
public class InventoryService {
    private final StringRedisTemplate redis;
    private final InventoryRepository dbInventory;
    
    // ✅ Lua script: atomic multi-SKU check-and-reserve
    // If ANY SKU can't be reserved, rolls back ALL successful decrements
    private static final String RESERVE_SCRIPT =
        """
        local skus = {}
        local n = #KEYS
        -- Check all SKUs first
        for i = 1, n do
            local available = tonumber(redis.call('GET', KEYS[i])) or 0
            local requested = tonumber(ARGV[i])
            if available < requested then
                return {-1, KEYS[i]}    -- insufficient stock for this SKU
            end
            skus[i] = {KEYS[i], requested}
        end
        -- All checks passed — decrement all
        for i = 1, #skus do
            redis.call('DECRBY', skus[i][1], skus[i][2])
        end
        return {1, 'ok'}
        """;
    
    public String reserveStock(List<CartItem> items) {
        List<String> keys = items.stream()
            .map(item -> "inventory:" + item.getSkuId())
            .collect(toList());
        List<String> args = items.stream()
            .map(item -> String.valueOf(item.getQuantity()))
            .collect(toList());
        
        List<Object> result = redis.execute(
            new DefaultRedisScript<>(RESERVE_SCRIPT, List.class), keys, args.toArray());
        
        long status = (Long) result.get(0);
        if (status == -1L) {
            String failedSku = (String) result.get(1);
            throw new InsufficientStockException(failedSku);
        }
        
        return UUID.randomUUID().toString();  // reservation ID
    }
}

// ✅ Payment webhook handler — called by Razorpay/Stripe after payment
@RestController
@RequestMapping("/webhooks")
public class PaymentWebhookController {
    private final OrderConfirmationService orderConfirmationService;
    
    @PostMapping("/payment")
    public ResponseEntity<Void> handlePaymentWebhook(
            @RequestBody String payload,
            @RequestHeader("X-Razorpay-Signature") String signature) {
        
        // ✅ Verify webhook signature before processing
        if (!webhookVerifier.verify(payload, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        PaymentWebhookEvent event = objectMapper.readValue(payload, PaymentWebhookEvent.class);
        
        // ✅ Idempotent processing via webhook event ID
        if (webhookEventRepository.isProcessed(event.getId())) {
            return ResponseEntity.ok().build();
        }
        
        if (event.isSuccess()) {
            orderConfirmationService.confirmOrder(event.getOrderId(), event.getPaymentId());
        } else {
            orderConfirmationService.failOrder(event.getOrderId(), event.getReason());
            // ✅ Compensation: release Redis stock reservation
        }
        
        webhookEventRepository.markProcessed(event.getId());
        return ResponseEntity.ok().build();
    }
}
```

```typescript
// ✅ Frontend React: checkout flow with Razorpay integration

async function handleCheckout(cartId: string, addressId: number) {
    setCheckoutState('initiating');
    
    try {
        // Step 1: Create order intent on our backend
        const { orderId, checkoutUrl } = await api.post<CheckoutInitResponse>('/orders/checkout', {
            cartId, shippingAddressId: addressId
        });
        
        // ✅ Load Razorpay SDK (loaded lazily — not on initial page load)
        const Razorpay = await loadRazorpay();
        
        const rzp = new Razorpay({
            key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            order_id:    orderId,
            name:        'Your Store',
            image:       '/logo.png',
            prefill: {
                name:  user.name,
                email: user.email,
                contact: user.phone
            },
            handler: async (response: RazorpayPaymentResponse) => {
                // ✅ Verify payment on our backend before showing success
                // (Razorpay also calls our webhook — but frontend verification prevents
                //  a crafted response bypassing the success screen)
                await api.post('/orders/verify-payment', {
                    orderId,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature
                });
                
                router.push(`/orders/${orderId}/confirmation`);
            },
            modal: {
                ondismiss: () => {
                    // ✅ User dismissed payment — order stays PAYMENT_PENDING
                    // They can retry payment from order history page
                    setCheckoutState('abandoned');
                }
            }
        });
        
        rzp.open();
        setCheckoutState('payment-modal-open');
        
    } catch (err) {
        if (err instanceof InsufficientStockError) {
            setCheckoutState('out-of-stock');
        } else {
            setCheckoutState('error');
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why shouldn't I decrement stock when a user adds a product to cart?"

**Hruday's answer:**
> Because cart abandonment rates are 70-80%. If you reserve stock when adding to cart, you'd permanently tie up inventory for users who never intend to buy — they're just browsing.
>
> The right model: cart is a wishlist. Stock reservation happens only when the user confirms checkout. At that point they've expressed real intent to buy. We use Redis to atomically reserve stock for a limited window (typically 15 minutes). If they don't complete payment in 15 minutes, the reservation expires and stock is released. This way, reserved stock for active checkouts is minimal.
>
> The only exception: extremely limited items (concert tickets, limited sneakers). For these, you might reserve when initiating checkout — but you still shouldn't reserve when merely adding to cart, because no checkout has been triggered.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you prevent overselling during a flash sale when 50,000 users try to buy a product with 100 units?"

**Hruday's answer:**
> Three-layer defence.
>
> Layer 1: Rate limiting at the API gateway. Limit checkout attempts per user to 1 per second. Most bots and retry storms get rejected at the edge. Legitimate users who try once per click don't notice.
>
> Layer 2: Redis atomic decrement at stock reservation. Redis is single-threaded. A Lua script does: read current stock, check if > requested quantity, if yes decrement, if no return error. This Lua script is atomic — no race condition. 50,000 concurrent requests all queue up behind each other in Redis. The first 100 succeed, the remaining 49,900 get an immediate "out of stock" error. No database involved at this step.
>
> Layer 3: Periodic reconciliation between Redis stock count and DB inventory table. Every 5 minutes, a background job checks for divergence. If a crash during checkout left Redis and DB inconsistent, the reconciliation job detects and corrects it. DB is always the source of truth; Redis is the fast pre-check layer.
>
> For flash sales specifically: pre-warm Redis stock counts 30 minutes before sale start. Use a leaky bucket rate limiter on checkout to protect payment gateway from being overwhelmed. Queue overflow orders to Kafka and process them in order — "order received" is better than "server error."

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Should the product catalog and the order service share a database?"

**Hruday's answer:**
> No. Different data, different access patterns, different SLAs.
>
> Product catalog: 100:1 read/write ratio. Needs full-text search capabilities. Can tolerate eventual consistency — a product description update being visible 30 seconds late is fine. Optimal storage: PostgreSQL for the canonical record, Elasticsearch for search, Redis and CDN for read caching.
>
> Order service: write-heavy (new orders, status updates), strictly consistent, transactional — can't have an order confirmed on one replica and not another. Needs ACID transactions for Saga coordination. Optimal storage: PostgreSQL with strict SERIALIZABLE isolation on inventory checks.
>
> If they share a database: a slow Elasticsearch re-index can consume connections that the order service needs for fast transactions. A badly optimised catalog query can lock tables needed by order placement. And you can't scale them independently — if catalog browsing spikes during a sale, it shouldn't starve order processing capacity.
>
> Separate databases, communicate via domain events over Kafka. The order service subscribes to product price and availability events to maintain a read model it needs for order validation. This is CQRS at service boundary level.

---

### Q4 — System Design Angle
**Interviewer asks:** "Walk me through what happens when a payment succeeds but the webhook never reaches your server."

**Hruday's answer:**
> This is the classic "payment processed but order stuck in PENDING" problem. It happens — network timeouts, deploying mid-sale, webhook endpoint temporarily down.
>
> First line of defence: webhook retry. Razorpay retries webhooks with exponential backoff for up to 24 hours. If our endpoint comes back up within a few minutes, we catch it.
>
> Second line: polling fallback. For orders stuck in PAYMENT_PENDING for more than 5 minutes, a background job calls Razorpay's "fetch payment" API using the paymentIntentId stored on the order. If Razorpay says payment succeeded, we confirm the order. This job runs every 5 minutes and covers the tiny window where both the webhook and the polling interval align unluckily.
>
> Third line: customer-triggered resolution. The order history page shows a "Payment verification pending" state with a "Re-check payment status" button. This calls Razorpay directly and updates the order. Customers who see this and click the button resolve their own order immediately.
>
> Webhook idempotency: if the webhook eventually arrives after the polling job already confirmed the order, the idempotency check (webhook_event_id unique in DB) prevents double-processing. All paths lead to the same outcome safely.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| DB transaction for order + payment | "I'll wrap cart validation, stock decrement, and payment API call in a single DB transaction" | Holding a DB transaction open while calling an external payment gateway (500ms–5s) exhausts the connection pool; under load, all new requests wait for connections; DB transactions can't span external HTTP calls anyway — they have no idea if Razorpay got the request; the correct pattern is Saga: no distributed transaction, compensating actions for each step, payment is always async with webhook confirmation |
| Decrement stock in cart | "When user adds to cart, I reserve the stock so I know how many are left" | Leads to phantom reservation — 1000 items added to carts, 0 sold, 0 stock available to other customers, 900 carts abandoned; stock should only be reserved at checkout initiation, with an expiry TTL; the cart is a wishlist not a reservation; some candidates conflate "showing accurate available count on product page" (which can be approximate/cached) with "preventing oversell at checkout" (which must be exact) |
| Synchronous fan-out from order | "After placing an order, send confirmation email, update analytics, notify warehouse — all in the checkout response" | Each synchronous call adds latency to the checkout response; if the email service is slow, checkout takes 3+ seconds; if warehouse API is down, order fails even though payment succeeded; all post-order actions should be triggered via Kafka events and handled by independent consumers; the checkout endpoint only needs to return an orderId and confirmation page redirect — everything else is async |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we integrated payment workflows with SAP's financial system. One critical issue was idempotency — payment gateway calls were sometimes triggered twice due to network retries, resulting in double charges. We standardised on orderId as the idempotency key for every Razorpay API call. Razorpay's idempotency key header ensured that if the same orderId was sent twice, the gateway returned the same response without processing a second charge. We also added a webhook_events table — every incoming webhook was recorded by its unique event ID before processing, preventing duplicate order confirmations when Razorpay retried a delivery we'd already handled. These two fixes eliminated 100% of double-charge incidents."

---

## 8. Scale Evolution

**1,000 users →** Monolith is fine. Single PostgreSQL. Cart as a `cart_items` table. Synchronous calls to Stripe. Manual inventory count updates. Focus on correct Saga logic and idempotency — those matter at any scale.

**100,000 users →** Separate product and order databases. Redis for cart (Hash) and inventory stock count. Async Saga via Spring Events or lightweight Kafka. Elasticsearch for product search. Redis cache for product catalog pages.

**10 million users →** Full microservices: catalog, cart, inventory, order, payment, notification each independent. Kafka as the event backbone. Redis Cluster for inventory (atomic stock reservation). CDN for all product images. Flash sale queue (Kafka topic with limited consumer concurrency). Eventual consistency accepted for catalog; strict consistency only for order/payment. Separate read replicas for catalog queries vs order writes.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | This is their core domain — payment platform that e-commerce sites integrate; understanding the merchant side (how orders and payments interlock) is essential; oversell prevention for high-volume merchants | Idempotency; webhook handling; payment Saga |
| Swiggy / Meesho | Meesho is literally an e-commerce platform; product catalog search; flash sale inventory management; seller order fulfillment workflow | Inventory at scale; catalog search; order Saga |
| Adobe / Microsoft | Adobe stock marketplace; Microsoft Store; licensing as a product variant; subscription vs one-time purchase models | Product variants; subscription billing; digital inventory |
| SAP Labs | SAP Commerce Cloud; integrating payment workflows with SAP financial system; idempotency story above | Real incident; financial system integration; audit trails |

---

## 10. Related Topics — What to Study Next

- **Topic 302 — Rate Limiter** — flash sale checkout rate limiting is the most concrete use case for rate limiting in e-commerce; token bucket per user, leaky bucket to control payment gateway QPS
- **Topic 309 — Search System** — product catalog search (Elasticsearch, faceted filters, relevance tuning) is a major e-commerce subproblem that deserves its own deep dive
- **Topic 308 — File Upload System** — product image upload (chunked, S3, CDN) is part of the product catalog workflow; sellers uploading 50-image product listings
- **Topic 71 — Circuit Breaker (Resilience4j)** — payment service calls to external gateways need circuit breakers; if Razorpay returns errors for 60 seconds, open the circuit, return graceful error immediately rather than queuing 10,000 timed-out requests

---

*Part 19 · E-commerce Platform — Product Catalog, Cart, Orders, Payments · Full Stack Interview Guide · Hruday D · 2026*
