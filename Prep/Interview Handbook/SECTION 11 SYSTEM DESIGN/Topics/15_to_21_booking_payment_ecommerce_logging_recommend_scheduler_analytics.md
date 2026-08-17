# Problem 15 — Design Hotel / Ticket Booking System

> Frequency: ⭐⭐⭐⭐ | Asked at: Airbnb, Amazon, Booking.com | Difficulty: 🔴 Senior

---

## PART 1 — Problem Statement

### Functional Requirements (Hotel Booking)
- Search hotels by location, dates, guests
- View room availability and pricing
- Reserve a room (temporary hold)
- Confirm booking (payment)
- Manage bookings (view, cancel, modify)
- Reviews and ratings

### Non-Functional Requirements
- **Scale:** 10M DAU, 1M bookings/day
- **Concurrency:** Handle thousands of simultaneous booking attempts for popular rooms
- **Consistency:** No double-booking (critical!) — Strong consistency for reservations
- **Availability:** 99.99%
- **Search Latency:** < 200ms for availability search

### The Core Challenge: Concurrency Control
```
100 users try to book the last room simultaneously
→ Only one should succeed
→ Others should see "no availability"
→ No double booking ever
```

---

## PART 3 — Capacity Estimation

```
Hotels:         500K hotels worldwide
Rooms per hotel: avg 100 rooms → 50M rooms total
Bookings/day:   1M bookings
Peak booking:   1M / (8 hours × 3600) ≈ 35 bookings/sec
Search QPS:     1M × 10 searches per booking ≈ 350K searches/day
                350K / 86400 ≈ 4 searches/sec (low!)
Peak search:    ~40 searches/sec

Read:Write ≈ 10:1 (search is read)
```

---

## PART 4 — High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Client (Web / Mobile)                      │
└────────────────────────────┬─────────────────────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │    API Gateway       │
                   └──────┬─────────────┘
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                   ▼
┌──────────────┐  ┌────────────────┐  ┌────────────────────┐
│ Search Svc   │  │ Booking Svc    │  │ Payment Svc        │
│              │  │                │  │                    │
│ Elasticsearch│  │ PostgreSQL     │  │ Stripe / PayPal    │
│ (availability│  │ (ACID, strong  │  │                    │
│  + prices)   │  │  consistency)  │  │                    │
└──────┬───────┘  └───────┬────────┘  └────────────────────┘
       │                  │
       │          ┌───────▼──────────┐
       │          │   Inventory DB   │  (room availability)
       │          │   (PostgreSQL    │
       │          │    with row      │
       │          │    locking)      │
       │          └──────────────────┘
       │                  │
       └──────────────────┘
                 │
        ┌────────▼────────┐
        │  Redis Cache    │  (price cache, popular searches)
        └─────────────────┘
```

---

## PART 5 — Data Model

```sql
-- Hotels
CREATE TABLE hotels (
    hotel_id        BIGINT PRIMARY KEY,
    name            VARCHAR(200),
    address         TEXT,
    city            VARCHAR(100),
    country_code    CHAR(2),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    star_rating     DECIMAL(2,1),
    amenities       JSONB,
    total_rooms     INT
);

-- Room Types
CREATE TABLE room_types (
    room_type_id    BIGINT PRIMARY KEY,
    hotel_id        BIGINT REFERENCES hotels(hotel_id),
    name            VARCHAR(100),    -- 'Standard', 'Deluxe', 'Suite'
    capacity        INT,
    base_price      DECIMAL(10,2),
    description     TEXT,
    images          JSONB
);

-- Individual Rooms
CREATE TABLE rooms (
    room_id         BIGINT PRIMARY KEY,
    hotel_id        BIGINT,
    room_type_id    BIGINT,
    room_number     VARCHAR(20),
    floor           INT,
    status          VARCHAR(20) DEFAULT 'available'  -- 'available', 'maintenance'
);

-- CRITICAL: Bookings table with concurrency control
CREATE TABLE bookings (
    booking_id      BIGINT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    room_id         BIGINT NOT NULL,
    hotel_id        BIGINT NOT NULL,
    check_in        DATE NOT NULL,
    check_out       DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'confirmed', 'cancelled'
    total_price     DECIMAL(10,2),
    payment_id      BIGINT,
    created_at      TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP,                       -- 15-min hold expiry
    
    -- PREVENT DOUBLE BOOKING
    UNIQUE (room_id, check_in, check_out),
    CONSTRAINT no_overlap CHECK (
        NOT EXISTS (
            SELECT 1 FROM bookings b2
            WHERE b2.room_id = room_id
            AND b2.status != 'cancelled'
            AND b2.check_in < check_out
            AND b2.check_out > check_in
        )
    )
);

-- Availability Index (denormalized for fast search)
CREATE TABLE room_availability (
    room_type_id    BIGINT,
    date            DATE,
    available_count INT,          -- rooms of this type available on this date
    price           DECIMAL(10,2), -- may vary by date (dynamic pricing)
    PRIMARY KEY (room_type_id, date)
);
```

---

## PART 7 — Deep Dive: Preventing Double Booking

### Approach 1: Pessimistic Locking (SELECT FOR UPDATE)

```sql
-- Transaction: book a room
BEGIN;

-- Lock the room row for this date range (no other transaction can update)
SELECT * FROM rooms
WHERE room_id = 123
  AND status = 'available'
FOR UPDATE;  -- ← LOCKS the row

-- Check no conflicting booking exists
SELECT COUNT(*) FROM bookings
WHERE room_id = 123
  AND status != 'cancelled'
  AND check_in < '2024-03-20'
  AND check_out > '2024-03-15';
-- Must be 0

-- Create booking
INSERT INTO bookings (room_id, user_id, check_in, check_out, status)
VALUES (123, 456, '2024-03-15', '2024-03-20', 'pending');

COMMIT;

Pros: Simple, guaranteed no conflicts
Cons: High lock contention under load, performance bottleneck
```

### Approach 2: Optimistic Locking (version number)

```sql
-- Read room with version
SELECT room_id, version FROM rooms WHERE room_id = 123;

-- Attempt update (only if version unchanged)
UPDATE rooms 
SET version = version + 1
WHERE room_id = 123 AND version = {read_version} AND status = 'available';

IF rows_affected = 0:
    RAISE ConflictException("Room was booked by someone else")

-- Continue with booking creation
INSERT INTO bookings ...

Pros: No blocking, better throughput for low-contention
Cons: Retry logic needed; fails under high contention
```

### Approach 3: Unique Constraint + DB-level enforcement

```sql
-- Idiomatic approach with partial date range uniqueness
-- Use a separate "date inventory" table

CREATE TABLE room_date_inventory (
    room_id     BIGINT,
    date        DATE,
    booking_id  BIGINT,   -- NULL = available
    PRIMARY KEY (room_id, date)
);

-- Booking flow:
-- 1. INSERT all dates for the booking into room_date_inventory
-- 2. If any INSERT conflicts (date already has booking_id) → ROLLBACK
-- 3. DB unique constraint enforces it

BEGIN;
INSERT INTO room_date_inventory VALUES
  (123, '2024-03-15', 456),
  (123, '2024-03-16', 456),
  (123, '2024-03-17', 456),
  ...
ON CONFLICT (room_id, date) DO NOTHING
RETURNING room_id;

-- Check all dates were inserted (none conflicted)
-- If count matches expected → success
-- Else → rollback
COMMIT;
```

### Two-Phase Booking (Recommended Production Approach)

```
Phase 1: Temporary Hold (15 minutes)
  - Lock the room for 15 minutes
  - User proceeds to payment
  - Status: 'pending_payment'
  - Release if payment not completed

Phase 2: Confirm on Payment
  - Payment service processes payment
  - On success: status → 'confirmed'
  - On failure: status → 'cancelled', release room
  - Webhook from payment provider triggers confirmation

Background job: Cancel expired pending bookings
  SELECT * FROM bookings 
  WHERE status = 'pending_payment' AND expires_at < NOW()
  → Update status to 'cancelled'
  → Release inventory
```

---

## PART 7B — Ticket Booking (Concert / Event Tickets)

```
Key differences from hotel booking:
  - Fixed seat inventory (Row A, Seat 1-20)
  - High contention (Taylor Swift tickets: millions in seconds)
  - No date range → single event

Architecture additions:
  - Virtual waiting room (queue system before allowing purchase)
  - Pre-sale access codes (registered users first)
  - Bot detection (rate limiting, CAPTCHA, device fingerprinting)

Seat locking:
  Redis SETNX: "seat:{event_id}:{seat_id}" → user_id
  TTL: 10 minutes to complete purchase
  If TTL expires → seat released to queue
  
Queue system for flash sales:
  - Request → join virtual queue (Redis sorted set, score = timestamp)
  - Dequeue N users at a time to access purchase page
  - Rate-controlled access to prevent thundering herd
```

---

## PART 20 — Booking Summary

### 5-Minute Answer
> "A booking system's hardest challenge is concurrency: preventing double-booking when thousands try to book the last room. Solution: two-phase booking — Phase 1 creates a 15-minute hold with a DB transaction using SELECT FOR UPDATE (pessimistic lock) or unique constraint on room+date rows. Phase 2: payment completes → status confirmed; payment fails → hold released. Availability search hits Elasticsearch or a denormalized availability table (room_type_id, date, count) — not the bookings table directly. Price and availability cached in Redis for read performance."

---

---

# Problem 16 — Design a Payment System

> Frequency: ⭐⭐⭐⭐ | Asked at: Amazon, Stripe, PayPal, Uber | Difficulty: 🔴 Senior

---

## PART 1 — Problem Statement

### Functional Requirements
- Accept payments (credit card, wallet, bank transfer)
- Process refunds and chargebacks
- Support multiple currencies
- Idempotent payment API (retry-safe)
- Payment ledger / audit trail
- Fraud detection
- Reconciliation

### Non-Functional Requirements
- **Exactly-once payment processing** (critical)
- **Strong consistency** (money must not disappear)
- **Availability:** 99.99%
- **Compliance:** PCI-DSS, SOC2
- **Auditability:** Every transaction logged immutably

---

## PART 4 — Architecture

```
Client
  │
  ▼
Payment API (HTTPS, TLS 1.3)
  │
  ├── Idempotency check (Redis: idempotency_key → result)
  │
  ├── Fraud Detection Service (ML model, real-time rules)
  │         │ BLOCKED → reject
  │         │ OK → continue
  │
  ├── Payment Orchestrator
  │         │
  │    ┌────┴─────────────────────┐
  │    │   Saga / Choreography    │
  │    │                          │
  │    │ 1. Reserve funds         │
  │    │ 2. Process with PSP      │ → Stripe / Braintree / Adyen
  │    │ 3. Update ledger         │
  │    │ 4. Release hold          │
  │    │ 5. Notify user           │
  │    └──────────────────────────┘
  │
  ├── Ledger Service (double-entry bookkeeping)
  │         │
  │    PostgreSQL (ACID, append-only ledger)
  │
  └── Notification Service
```

---

## PART 5 — Data Model

```sql
-- Accounts (balance tracking)
CREATE TABLE accounts (
    account_id      BIGINT PRIMARY KEY,
    user_id         BIGINT UNIQUE,
    currency        CHAR(3),          -- 'USD', 'EUR'
    balance         BIGINT NOT NULL,  -- in cents/smallest unit (avoid float!)
    version         INT DEFAULT 0,    -- optimistic locking
    created_at      TIMESTAMP
);

-- Transactions (immutable ledger - NEVER update, only insert)
CREATE TABLE transactions (
    transaction_id  BIGINT PRIMARY KEY,   -- Snowflake ID
    idempotency_key VARCHAR(255) UNIQUE,  -- prevent duplicates
    type            VARCHAR(30),          -- 'payment', 'refund', 'transfer'
    status          VARCHAR(20),          -- 'pending', 'completed', 'failed'
    from_account_id BIGINT,
    to_account_id   BIGINT,
    amount          BIGINT,               -- in cents
    currency        CHAR(3),
    reference_id    VARCHAR(100),         -- PSP transaction ID
    metadata        JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Ledger entries (double-entry bookkeeping)
CREATE TABLE ledger_entries (
    entry_id        BIGINT PRIMARY KEY,
    transaction_id  BIGINT NOT NULL,
    account_id      BIGINT NOT NULL,
    amount          BIGINT,        -- positive = credit, negative = debit
    balance_after   BIGINT,        -- account balance after this entry
    created_at      TIMESTAMP DEFAULT NOW()
);
-- Invariant: SUM of all entries for a transaction = 0 (double-entry)
```

---

## PART 7 — Deep Dive: Idempotency

```python
def process_payment(idempotency_key, amount, from_account, to_account):
    # Step 1: Check if already processed
    cached = redis.get(f"payment:{idempotency_key}")
    if cached:
        return deserialize(cached)  # Return same result as before
    
    # Step 2: Check DB (in case Redis was cleared)
    existing = db.query(
        "SELECT * FROM transactions WHERE idempotency_key = ?",
        idempotency_key
    )
    if existing:
        result = format_response(existing)
        redis.setex(f"payment:{idempotency_key}", 86400, serialize(result))
        return result
    
    # Step 3: Acquire distributed lock (prevent concurrent duplicates)
    lock_key = f"payment_lock:{idempotency_key}"
    if not redis.setnx(lock_key, "1"):
        time.sleep(0.1)
        return process_payment(idempotency_key, amount, from_account, to_account)
    redis.expire(lock_key, 30)
    
    try:
        # Step 4: Process payment
        result = _do_process_payment(amount, from_account, to_account, idempotency_key)
        
        # Step 5: Cache result for future duplicates
        redis.setex(f"payment:{idempotency_key}", 86400, serialize(result))
        return result
    finally:
        redis.delete(lock_key)
```

### Double-Entry Bookkeeping

```
Every payment = two ledger entries that sum to zero:
  Alice pays Bob $100:
  
  DEBIT  Alice's account:  -$100  (balance: $500 → $400)
  CREDIT Bob's account:    +$100  (balance: $200 → $300)
  
  Sum = -$100 + $100 = $0 ✓

Platform fee ($5):
  DEBIT  Alice's account:  -$100  (balance: $500 → $400)
  CREDIT Bob's account:    +$95   (balance: $200 → $295)
  CREDIT Platform account: +$5    (balance: $10K → $10,005)
  
  Sum = -$100 + $95 + $5 = $0 ✓

This invariant detects bugs: if sum ≠ 0, something went wrong
Reconciliation: run daily audit to verify all ledger entries sum to zero
```

---

## PART 20 — Payment Summary

### 5-Minute Answer
> "A payment system's two critical requirements: exactly-once processing and no money loss. Idempotency: client generates idempotency_key (UUID), server checks if already processed before executing. For money: use integer cents (no float!), double-entry bookkeeping (every debit has corresponding credit, sum must be zero). Strong consistency: PostgreSQL with ACID transactions for all balance updates, using optimistic locking (version column) to prevent concurrent modification. Saga pattern for multi-step payments: each step has a compensating action for rollback. Fraud detection: ML model scores each transaction in real-time (<100ms). All transactions append-only in immutable ledger."

---

---

# Problem 17 — Design an E-Commerce Platform

> Frequency: ⭐⭐⭐⭐ | Asked at: Amazon, Alibaba, Shopify | Difficulty: 🔴 Senior

---

## PART 4 — Architecture

```
                      ┌──────────────┐
                      │   Client     │
                      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │  API Gateway  │
                      └──────┬───────┘
                             │
    ┌──────────┬─────────────┼────────────────┬────────────────┐
    ▼          ▼             ▼                ▼                ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────┐
│Product │ │Search  │ │Shopping  │ │ Order        │ │ Payment    │
│Service │ │Service │ │Cart Svc  │ │ Service      │ │ Service    │
│(MySQL) │ │(ES)    │ │(Redis)   │ │ (PostgreSQL) │ │ (Stripe)   │
└────────┘ └────────┘ └──────────┘ └──────┬───────┘ └────────────┘
                                           │
                                    ┌──────▼───────────────┐
                                    │    Kafka Events       │
                                    └──────┬───────────────┘
                                           │
                         ┌─────────────────┼──────────────────┐
                         ▼                 ▼                   ▼
                  ┌─────────────┐  ┌───────────────┐  ┌─────────────┐
                  │ Inventory   │  │ Notification  │  │ Analytics   │
                  │ Service     │  │ Service       │  │ Service     │
                  └─────────────┘  └───────────────┘  └─────────────┘
```

---

## PART 5 — Data Model (Key Tables)

```sql
-- Products
CREATE TABLE products (
    product_id      BIGINT PRIMARY KEY,
    seller_id       BIGINT,
    name            VARCHAR(500),
    description     TEXT,
    category_id     INT,
    price           BIGINT,          -- in cents
    currency        CHAR(3),
    images          JSONB,
    attributes      JSONB,           -- {"color": "red", "size": "M"}
    status          VARCHAR(20),     -- 'active', 'out_of_stock', 'discontinued'
    created_at      TIMESTAMP
);

-- Inventory (separate from products for concurrency)
CREATE TABLE inventory (
    product_id      BIGINT PRIMARY KEY,
    warehouse_id    INT,
    quantity        INT NOT NULL DEFAULT 0,
    reserved        INT NOT NULL DEFAULT 0,  -- held in carts
    version         INT DEFAULT 0,           -- optimistic lock
    CONSTRAINT non_negative CHECK (quantity >= 0 AND reserved >= 0)
);

-- Orders
CREATE TABLE orders (
    order_id        BIGINT PRIMARY KEY,
    user_id         BIGINT,
    status          VARCHAR(30),   -- 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
    subtotal        BIGINT,
    tax             BIGINT,
    shipping        BIGINT,
    total           BIGINT,
    shipping_addr   JSONB,
    created_at      TIMESTAMP
);

CREATE TABLE order_items (
    item_id         BIGINT PRIMARY KEY,
    order_id        BIGINT REFERENCES orders(order_id),
    product_id      BIGINT,
    quantity        INT,
    unit_price      BIGINT,   -- price at time of purchase (not current price!)
    total_price     BIGINT
);
```

### Shopping Cart (Redis)

```
Key: "cart:{user_id}"
Type: Hash
Fields: product_id → {qty, price_snapshot, added_at}
TTL: 30 days

Operations:
  HSET cart:123 product_456 '{"qty":2,"price":2999}'
  HGET cart:123 product_456
  HDEL cart:123 product_456
  HGETALL cart:123  → all items

Why Redis?
  - Carts are temporary (no need for DB durability)
  - Fast access (user adds/removes items frequently)
  - Cross-device sync just by user_id key
  - On order placement: read cart → create order → clear cart
```

---

## PART 7 — Inventory Management

```
Challenge: Flash sale - 1000 users try to buy last item simultaneously

Solution: Redis atomic counter
  DECRBY inventory:{product_id} {quantity}
  If result < 0: INCRBY to undo, return "out of stock"
  
  Periodic sync: Redis count → DB (every second)
  On startup: load DB inventory into Redis

Two-phase reservation:
  Phase 1 (add to cart): Reserve in Redis
    reserve_{product_id}: DECRBY {quantity}
  Phase 2 (order placed): Confirm reservation
    Write to DB, clear Redis reservation
  Phase 3 (abandoned cart): Release reservation
    Background job: release items in carts older than 30 minutes

Saga for order fulfillment:
  1. Reserve inventory
  2. Process payment
  3. Create shipment
  4. Send confirmation
  Compensate: reverse each step if later step fails
```

---

## PART 20 — E-Commerce Summary

### 5-Minute Answer
> "E-commerce has three critical flows: browse/search, cart/checkout, and order/fulfillment. Product catalog in MySQL (reads cached in Redis + CDN for images). Search via Elasticsearch (full-text + facets + relevance). Cart in Redis (ephemeral, fast). Checkout: reserve inventory (Redis DECRBY, atomic), process payment, create order in PostgreSQL. Order events on Kafka → inventory service updates DB, notification service sends confirmation, fulfillment service creates shipment. Inventory: two-phase (reserve on cart-add, confirm on order) with Redis as the fast path."

---

---

# Problem 18 — Design a Logging & Metrics System

> Frequency: ⭐⭐⭐⭐ | Asked at: All companies | Difficulty: 🟡 Mid-Senior

---

## PART 4 — Architecture (ELK / LGTM Stack)

```
┌──────────────────────────────────────────────────────────────────┐
│                    Data Sources                                    │
│  Applications → Structured JSON logs                              │
│  Infrastructure → System metrics (CPU, memory, disk)             │
│  Services → Application metrics (latency, errors, throughput)    │
└──────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │  Fluentd │   │  Filebeat│   │ Prometheus    │
        │  (logs)  │   │  (logs)  │   │ scraper       │
        └────┬─────┘   └────┬─────┘   └──────┬────────┘
             └──────────────┴─────────────────┘
                                  │
                        ┌─────────▼──────────┐
                        │      Kafka          │  (buffer, decouple)
                        └─────────┬──────────┘
                                  │
                   ┌──────────────┼──────────────┐
                   ▼              ▼              ▼
           ┌──────────────┐ ┌──────────┐ ┌──────────────┐
           │ Elasticsearch│ │InfluxDB/ │ │  S3 Archive  │
           │ (log search) │ │Prometheus│ │  (long-term) │
           └──────┬───────┘ │(metrics) │ └──────────────┘
                  │         └────┬─────┘
                  ▼              ▼
           ┌──────────────────────────┐
           │  Grafana / Kibana        │
           │  (visualization + alerts)│
           └──────────────────────────┘
```

### Log Format (Structured JSON)

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "ERROR",
  "service": "payment-service",
  "version": "2.1.4",
  "trace_id": "abc123",
  "span_id": "def456",
  "user_id": "789",
  "message": "Payment processing failed",
  "error": {
    "type": "InsufficientFundsError",
    "message": "Account balance insufficient",
    "stack_trace": "..."
  },
  "request_id": "req-xyz",
  "duration_ms": 245,
  "endpoint": "/api/v1/payments"
}
```

### Metrics (RED Method per Service)

```
Rate:     requests_per_second{service="payment", endpoint="/pay"}
Errors:   error_rate{service="payment", type="InsufficientFunds"}
Duration: request_duration_seconds{service="payment", quantile="0.99"}

Prometheus query examples:
  # 99th percentile latency over 5 minutes
  histogram_quantile(0.99, rate(request_duration_seconds_bucket[5m]))
  
  # Error rate (%)
  rate(http_requests_total{status="5xx"}[5m]) / rate(http_requests_total[5m]) * 100
  
  # Alert: error rate > 1%
  ALERT HighErrorRate
    IF rate(http_errors_total[5m]) / rate(http_requests_total[5m]) > 0.01
    FOR 5m
    LABELS {severity="critical"}
    ANNOTATIONS {summary="Error rate above 1%"}
```

---

## PART 20 — Logging Summary

### 5-Minute Answer
> "A logging system has three layers: collection (Fluentd/Filebeat agents on each host collect logs), transport (Kafka buffers the stream, absorbs peaks), and storage (Elasticsearch for search/query, S3 for cold archive). Metrics: Prometheus scrapes service endpoints, stores time-series data, Grafana visualizes, AlertManager sends alerts. Tracing: OpenTelemetry SDK in each service generates spans with trace_id, sent to Jaeger or Zipkin. Log format: structured JSON with trace_id for correlation. Retention: hot (Elasticsearch, 7 days), warm (30 days), cold (S3, 1 year+)."

---

---

# Problem 19 — Design a Recommendation System

> Frequency: ⭐⭐⭐⭐ | Asked at: Netflix, Amazon, Spotify, YouTube | Difficulty: 🔥 Staff

---

## PART 4 — Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Offline Pipeline (daily)                      │
│                                                                   │
│  Raw Events (Kafka) → Spark → Feature Engineering →              │
│  ML Model Training → Model Store (S3)                            │
└──────────────────────────────────────────────────────────────────┘
                              │ model deployed
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Near-Real-Time Pipeline (hourly)               │
│                                                                   │
│  User actions → Kafka → Flink → Feature Store → Model updates    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Serving Layer (< 100ms)                      │
│                                                                   │
│  User request → Fetch user features from Feature Store            │
│              → Candidate generation (collaborative filtering)     │
│              → Ranking model (neural network scoring)             │
│              → Post-filtering (already watched, blacklist)        │
│              → Return top-N recommendations                       │
└──────────────────────────────────────────────────────────────────┘
```

### Algorithms

```
1. Collaborative Filtering (Matrix Factorization):
   User-item matrix: users × items, value = rating/watch_time
   Factorize: U (users × k) × V (items × k) ≈ original matrix
   User embedding × all item embeddings → similarity scores
   
   "Users similar to you liked X"
   
   Tools: Spark ALS (Alternating Least Squares), TensorFlow

2. Content-Based Filtering:
   Item attributes → item embedding
   User history → user embedding (avg of item embeddings)
   Find items with embedding close to user embedding
   
   "Because you liked A (action movie), here's B (action movie)"

3. Two-Tower Model (YouTube/Google approach):
   User tower: user features → user embedding
   Item tower: item features → item embedding
   Similarity: dot product of user and item embeddings
   
   Offline: train model, compute item embeddings for all items
   Online: compute user embedding, ANN search for similar items

4. Approximate Nearest Neighbor (ANN) for candidate retrieval:
   Index all item embeddings: Faiss, ScaNN, Annoy
   Query: user embedding → find N most similar items in < 10ms
   Much faster than exact search over millions of items
```

---

## PART 20 — Recommendation Summary

### 5-Minute Answer
> "A recommendation system has two phases: candidate generation and ranking. Candidate generation: train a two-tower model (user tower + item tower) to produce embeddings. At serve time, compute user embedding and do approximate nearest neighbor search (Faiss) across all item embeddings to get top 500 candidates in < 10ms. Ranking: a neural network scores each candidate using richer features (user history, context, item attributes) to produce a final ordered top-20. Feature Store holds precomputed user and item features (updated by Flink from event stream). Offline: retrain model daily on Spark using user interaction data."

---

---

# Problem 20 — Design a Distributed Job Scheduler

> Frequency: ⭐⭐⭐ | Asked at: Amazon, Google, LinkedIn | Difficulty: 🔥 Staff

---

## PART 1 — Problem Statement

### Functional Requirements
- Schedule jobs with: run-once, cron (recurring), delayed
- Job types: HTTP callback, function execution, message queue publish
- Retry on failure with backoff
- Job status tracking: pending, running, succeeded, failed
- Distributed workers (scale horizontally)
- No duplicate execution (at-least-once preferred, exactly-once optional)

---

## PART 4 — Architecture

```
Job Submission API
        │
        ▼
┌──────────────────┐
│  Job Store       │  PostgreSQL: jobs, schedules, executions
│  + Scheduler     │  Scheduler: polls for due jobs every second
└────────┬─────────┘
         │ Dispatch due jobs
         ▼
┌──────────────────┐
│   Kafka Queue    │  Topic: "scheduled-jobs" partitioned by job_type
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│        Worker Pool                        │
│  Worker1  Worker2  Worker3  WorkerN       │
│  (each subscribes to Kafka, runs jobs)   │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Result Store    │  Job execution log, status updates
│  + Monitoring    │
└──────────────────┘
```

### Data Model

```sql
CREATE TABLE jobs (
    job_id          BIGINT PRIMARY KEY,
    name            VARCHAR(200),
    job_type        VARCHAR(50),       -- 'http', 'function', 'message'
    schedule        VARCHAR(100),      -- cron expression "0 * * * *" or 'once'
    payload         JSONB,             -- job-specific config
    status          VARCHAR(20),       -- 'active', 'paused', 'deleted'
    retry_max       INT DEFAULT 3,
    retry_backoff   INT DEFAULT 60,    -- seconds between retries
    next_run_at     TIMESTAMP,
    last_run_at     TIMESTAMP,
    created_at      TIMESTAMP
);

CREATE INDEX idx_next_run ON jobs(next_run_at) WHERE status = 'active';

CREATE TABLE job_executions (
    execution_id    BIGINT PRIMARY KEY,
    job_id          BIGINT,
    status          VARCHAR(20),       -- 'running', 'succeeded', 'failed'
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,
    worker_id       VARCHAR(100),
    attempt         INT DEFAULT 1,
    error_message   TEXT,
    output          JSONB
);
```

### Preventing Duplicate Execution

```sql
-- Scheduler picks up due jobs atomically
UPDATE jobs 
SET status = 'running', next_run_at = next_run_at + interval
WHERE job_id IN (
    SELECT job_id FROM jobs
    WHERE status = 'active'
    AND next_run_at <= NOW()
    ORDER BY next_run_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED  -- ← critical: multiple schedulers safe
)
RETURNING job_id, payload;
```

---

## PART 20 — Job Scheduler Summary

### 5-Minute Answer
> "A distributed job scheduler has three parts: a job store (PostgreSQL with jobs and next_run_at), a scheduler (polls every second for due jobs, uses SELECT FOR UPDATE SKIP LOCKED for safe concurrent scheduling), and a worker pool (Kafka consumers execute jobs). Cron scheduling: compute next_run_at from cron expression after each execution. Retry: on failure, update next_run_at = NOW() + backoff, increment attempt count. Duplicate prevention: FOR UPDATE SKIP LOCKED means multiple scheduler instances don't pick the same job. At-least-once delivery via Kafka; idempotent job execution handles potential duplicates."

---

---

# Problem 21 — Design a Real-Time Analytics System

> Frequency: ⭐⭐⭐⭐ | Asked at: Meta, Google, Uber, Twitter | Difficulty: 🔥 Staff

---

## PART 4 — Architecture

```
Event Sources (websites, apps, APIs)
         │ events (clicks, views, purchases)
         ▼
┌──────────────────────────────────────────┐
│              Kafka (Event Bus)            │
│  Partitioned by event type / user_id     │
└──────────────────────────────────────────┘
         │
    ┌────┴──────────────────┐
    ▼                       ▼
┌─────────────────┐   ┌─────────────────────────────────┐
│  Stream Process │   │  Batch Processing               │
│  (Flink)        │   │  (Spark, runs hourly/daily)     │
│                 │   │                                 │
│  Window ops:    │   │  Historical aggregations,       │
│  - Sliding:     │   │  ML feature computation,        │
│    last 5 min   │   │  complex joins                  │
│  - Tumbling:    │   │                                 │
│    per hour     │   │                                 │
└────────┬────────┘   └──────────────┬──────────────────┘
         │                            │
         └────────────────────────────┘
                       │
         ┌─────────────▼─────────────────────────┐
         │              Storage                   │
         │                                       │
         │  Hot:  Redis (real-time counters)     │
         │  Warm: ClickHouse / Druid (recent)    │
         │  Cold: BigQuery / Redshift (archive)  │
         └───────────────────────────────────────┘
                       │
               ┌───────▼──────────┐
               │  Dashboard /     │
               │  Grafana /       │
               │  Custom UI       │
               └──────────────────┘
```

### Real-Time Counter Pattern

```python
# Click event arrives
def handle_event(event):
    user_id = event['user_id']
    product_id = event['product_id']
    
    pipe = redis.pipeline()
    
    # Real-time counters (per minute)
    now = int(time.time() / 60) * 60  # current minute bucket
    pipe.incr(f"clicks:{product_id}:{now}")
    pipe.expire(f"clicks:{product_id}:{now}", 3600)  # keep 1 hour
    
    # Unique visitors (HyperLogLog - O(1) space!)
    pipe.pfadd(f"unique_visitors:{product_id}:{now}", user_id)
    pipe.expire(f"unique_visitors:{product_id}:{now}", 3600)
    
    # Top products (sorted set)
    pipe.zincrby("top_products:today", 1, product_id)
    
    pipe.execute()

# Query: clicks per product in last 15 minutes
def get_clicks_last_15min(product_id):
    now = int(time.time() / 60) * 60
    minutes = [now - (i * 60) for i in range(15)]
    keys = [f"clicks:{product_id}:{m}" for m in minutes]
    counts = redis.mget(*keys)
    return sum(int(c or 0) for c in counts)
```

### Lambda Architecture vs Kappa Architecture

```
Lambda (historical approach):
  Batch layer:   Spark, runs hourly, accurate but slow
  Speed layer:   Flink/Storm, real-time, approximate
  Serving layer: Merges batch + speed results
  
  Problem: Two codebases to maintain, consistency issues

Kappa (modern approach):
  Only stream processing layer (Flink)
  "Reprocess" by replaying Kafka from beginning
  One codebase, simpler operation
  
  Used by: Netflix, LinkedIn, Uber (increasingly)
  Limitation: Full reprocessing can be slow for years of data
```

---

## PART 20 — Real-Time Analytics Summary

### 5-Minute Answer
> "Real-time analytics has two paths: stream (Flink processes events in seconds) and batch (Spark processes historical data hourly/daily). Events flow into Kafka, Flink applies windowed aggregations (count clicks in last 5 minutes using sliding windows, hourly totals using tumbling windows). Results stored in: Redis for real-time counters (Redis INCR, HyperLogLog for unique counts), ClickHouse or Druid for recent history (columnar, fast aggregations), BigQuery for cold storage. Lambda architecture: batch for accuracy + streaming for recency, merge at serving layer. Modern trend: Kappa (streaming only, reprocess via Kafka replay)."

---

*All 21 problems complete. Next: Interview Question Bank*
