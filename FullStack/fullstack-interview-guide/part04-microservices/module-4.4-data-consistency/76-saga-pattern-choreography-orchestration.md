# Saga Pattern — Choreography vs Orchestration
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Saga = a sequence of local transactions, each in a separate microservice, where each step publishes an event or calls the next step; if any step fails, compensating transactions undo the previous steps
- Why it exists: ACID transactions across multiple services and databases are impractical (distributed 2PC fails at scale — Topic 77); Saga achieves eventual consistency across services through coordinated steps and rollback
- **Choreography**: no central coordinator — each service reacts to events and publishes new events; OrderService publishes `OrderPlaced` → InventoryService handles it and publishes `StockReserved` → PaymentService handles it → fully decentralised but harder to see the full flow
- **Orchestration**: a central Saga Orchestrator service drives the steps explicitly; "Step 1: reserve stock. Step 2: process payment. Step 3: confirm order." — easier to understand and monitor, but the orchestrator is a central point
- Compensating transaction = the undo of a successfully completed step: if payment fails after stock was reserved, the compensation is to release the stock reservation
- Gap to bridge: Saga is a common senior interview topic, especially at Swiggy/Razorpay/Amazon; knowing both patterns and their trade-offs, with real compensating transaction examples, is the differentiator

---

## 1. One-Line Definition
The Saga pattern manages long-running, multi-step business transactions that span multiple microservices by coordinating a sequence of local service transactions — with each service either publishing events (choreography) or being directed by a central orchestrator — and executing compensating transactions to roll back completed steps if any step fails.

---

## 2. The Problem It Solves

Placing an order in an e-commerce system requires: reserving inventory, processing payment, creating a shipment, and sending confirmation. In a monolith, this is one database transaction — if payment fails, everything rolls back atomically. 

In microservices, these are separate services with separate databases. A single ACID transaction spanning them would require Distributed Two-Phase Commit (2PC) — which has severe performance and availability problems at scale (Topic 77 covers why). So we need another way.

**Without Saga** — what actually happens:
1. OrderService calls InventoryService → inventory reserved ✅
2. OrderService calls PaymentService → payment fails ❌ (insufficient funds)
3. OrderService returns "order failed" to user
4. But inventory is still reserved! Nobody told InventoryService to release it.
5. The item shows as unavailable to other customers who CAN pay
6. Data is inconsistent

**With Saga**:
1. OrderService places order and publishes `OrderCreated` event
2. InventoryService handles it → reserves stock → publishes `StockReserved` event
3. PaymentService handles it → charges card → payment fails
4. PaymentService publishes `PaymentFailed` event
5. **Compensation**: InventoryService handles `PaymentFailed` → releases the stock reservation
6. OrderService handles `PaymentFailed` → cancels order, notifies user
7. System returns to consistent state — no orphaned stock reservations

The Saga achieves **eventual consistency** — the system passes through an inconsistent state momentarily (stock reserved but payment not yet done), but converges to consistency through the event sequence or its compensations.

---

## 3. How It Works Internally

### Choreography — Event-Driven, Decentralised

Each service in the Saga reacts to events and publishes events. No central coordinator. Services "know" their role in the saga implicitly through the events they react to.

```
HAPPY PATH (place order and pay):

OrderService:
  receive: CreateOrder command
  execute: save order (status=PENDING)
  publish: OrderCreated { orderId, userId, items, total }

InventoryService:
  receive: OrderCreated
  execute: reserve stock for all items
  publish: StockReserved { orderId, reservationId }

PaymentService:
  receive: StockReserved
  execute: charge payment method
  publish: PaymentProcessed { orderId, paymentId, amount }

ShipmentService:
  receive: PaymentProcessed
  execute: create shipment request
  publish: ShipmentCreated { orderId, shipmentId }

OrderService:
  receive: ShipmentCreated
  execute: update order status to CONFIRMED
  publish: OrderConfirmed { orderId }

NotificationService:
  receive: OrderConfirmed
  execute: send confirmation email/SMS
```

```
FAILURE PATH (payment fails):

PaymentService:
  receive: StockReserved
  execute: charge payment method → FAILS (card declined)
  publish: PaymentFailed { orderId, reason: "CARD_DECLINED" }

InventoryService:  ← COMPENSATION
  receive: PaymentFailed
  execute: release stock reservation for orderId
  publish: StockReleased { orderId }

OrderService:  ← COMPENSATION
  receive: PaymentFailed
  execute: update order status to CANCELLED
  publish: OrderCancelled { orderId, reason: "PAYMENT_FAILED" }

NotificationService:
  receive: OrderCancelled
  execute: send "payment failed" notification to user
```

**Choreography trade-offs:**
- ✅ Fully decentralised — no single point of failure
- ✅ Services are loosely coupled (they only know about events, not each other)
- ❌ Hard to see the overall saga flow — it's distributed across many services' event handlers
- ❌ Difficult to track saga progress — which step is the saga at?
- ❌ Risk of cyclic events if not carefully designed
- Best for: well-understood business flows with 3-5 steps where the event sequence is stable

### Orchestration — Central Coordinator

A dedicated Saga Orchestrator service controls the saga flow explicitly. It calls each service in sequence, handles the responses, and triggers compensations if needed.

```
OrderSagaOrchestrator (state machine):

State: STARTED
  → call InventoryService.reserveStock(orderId, items)
  
State: STOCK_RESERVED
  → call PaymentService.charge(orderId, amount)
  
  If PAYMENT_SUCCESS:
    State: PAYMENT_PROCESSED
    → call ShipmentService.createShipment(orderId)
    
  If PAYMENT_FAILED:
    State: COMPENSATING
    → call InventoryService.releaseStock(orderId, reservationId)  ← compensation
    State: CANCELLED
    → notify OrderService to cancel the order
    
State: SHIPMENT_CREATED
  State: COMPLETED
  → OrderService marks order as CONFIRMED

Each state transition and compensation is persisted to the orchestrator's own database
→ orchestrator can restart from the last persisted state after a crash
```

**Orchestration trade-offs:**
- ✅ Explicit, visible flow — easy to understand and monitor
- ✅ Clear ownership — orchestrator knows the full saga state
- ✅ Easier to add new steps or change flow
- ❌ Orchestrator is a central service — must be highly available
- ❌ Services can become coupled to the orchestrator's expectations
- Best for: complex flows with 5+ steps, error handling that requires central decision-making, or when visibility into saga progress is critical

### ASCII Diagram — Choreography vs Orchestration

```
CHOREOGRAPHY:
OrderSvc → [event bus] → InvSvc → [event bus] → PaymentSvc → [event bus] → ShipmentSvc
  ↑____________[event bus]________________[failures/completions flow back]____________↑
No central authority. Each service listens and reacts.

ORCHESTRATION:
              ┌─────────────────┐
              │ OrderSagaOrch.  │
              │ (State Machine) │
              └────────┬────────┘
                       │ calls
          ┌────────────┼────────────┐
          ↓            ↓            ↓
      InvSvc      PaymentSvc   ShipmentSvc
      (worker)    (worker)     (worker)
Central authority drives the flow. Workers just do their job when asked.
```

---

## 4. The Code

### Orchestration — Spring State Machine / Explicit State Approach
```java
// Saga Orchestrator for Order Placement
@Service
@Slf4j
public class OrderPlacementSaga {

    private final OrderSagaStateRepository sagaStateRepository;
    private final InventoryServiceClient inventoryClient;
    private final PaymentServiceClient paymentClient;
    private final ShipmentServiceClient shipmentClient;
    private final OrderRepository orderRepository;

    // Called by OrderService to start the saga
    @Transactional
    public void startSaga(String orderId) {
        OrderSagaState sagaState = new OrderSagaState(orderId, SagaStep.RESERVE_STOCK);
        sagaStateRepository.save(sagaState);
        reserveStock(orderId, sagaState);  // First step
    }

    private void reserveStock(String orderId, OrderSagaState state) {
        try {
            ReservationResult result = inventoryClient.reserve(orderId);

            // Record successful step — persist before moving to next step
            state.transitionTo(SagaStep.CHARGE_PAYMENT);
            state.setReservationId(result.getReservationId());
            sagaStateRepository.save(state);

            chargePayment(orderId, state);  // Next step

        } catch (Exception e) {
            log.error("Stock reservation failed for orderId={}: {}", orderId, e.getMessage());
            // No compensation needed — nothing succeeded yet
            failSaga(orderId, state, "STOCK_RESERVATION_FAILED");
        }
    }

    private void chargePayment(String orderId, OrderSagaState state) {
        try {
            PaymentResult result = paymentClient.charge(orderId, state.getIdempotencyKey());

            state.transitionTo(SagaStep.CREATE_SHIPMENT);
            state.setPaymentId(result.getPaymentId());
            sagaStateRepository.save(state);

            createShipment(orderId, state);  // Next step

        } catch (PaymentDeclinedException e) {
            log.warn("Payment declined for orderId={}. Compensating.", orderId);
            state.transitionTo(SagaStep.COMPENSATING);
            sagaStateRepository.save(state);
            compensateStockReservation(orderId, state);  // Undo previous step

        } catch (Exception e) {
            log.error("Payment service error for orderId={}: {}", orderId, e.getMessage());
            compensateStockReservation(orderId, state);
        }
    }

    // COMPENSATION: undo stock reservation
    @Retryable(maxAttempts = 5, backoff = @Backoff(delay = 1000, multiplier = 2))
    private void compensateStockReservation(String orderId, OrderSagaState state) {
        try {
            inventoryClient.releaseReservation(state.getReservationId());
            log.info("Stock compensation successful for orderId={}", orderId);
            failSaga(orderId, state, "PAYMENT_FAILED");
        } catch (Exception e) {
            // Compensation MUST eventually succeed — retry aggressively
            // If compensation keeps failing → alert on-call (data inconsistency risk)
            log.error("CRITICAL: Compensation failed for orderId={}. Manual intervention required.", orderId);
            throw e;  // @Retryable will retry
        }
    }

    private void failSaga(String orderId, OrderSagaState state, String reason) {
        state.transitionTo(SagaStep.FAILED);
        state.setFailureReason(reason);
        sagaStateRepository.save(state);
        orderRepository.updateStatus(orderId, OrderStatus.CANCELLED, reason);
    }
}
```

### Choreography — Kafka-Based Event Handler
```java
// InventoryService handles OrderCreated and StockReserved events
@Component
@Slf4j
public class OrderSagaEventHandler {

    private final StockReservationService reservationService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "order-events", groupId = "inventory-service-saga")
    public void onOrderEvent(OrderEvent event, Acknowledgment ack) {
        try {
            switch (event.getEventType()) {
                case "ORDER_CREATED" -> handleOrderCreated((OrderCreatedEvent) event, ack);
                case "PAYMENT_FAILED" -> handlePaymentFailed((PaymentFailedEvent) event, ack);
                default -> ack.acknowledge();  // Unknown event — skip
            }
        } catch (Exception e) {
            log.error("Saga event handling failed: eventType={} orderId={}",
                       event.getEventType(), event.getOrderId(), e);
            // Do NOT ack — Kafka will redeliver
        }
    }

    private void handleOrderCreated(OrderCreatedEvent event, Acknowledgment ack) {
        log.info("Saga step: reserving stock for orderId={}", event.getOrderId());

        try {
            ReservationResult result = reservationService.reserve(
                event.getOrderId(), event.getItems()
            );

            // Publish success event — PaymentService will pick this up next
            kafkaTemplate.send("inventory-events", event.getOrderId(),
                new StockReservedEvent(event.getOrderId(), result.getReservationId()));

            ack.acknowledge();  // Commit only after publishing success event

        } catch (InsufficientStockException e) {
            // Cannot fulfil — publish failure event
            kafkaTemplate.send("inventory-events", event.getOrderId(),
                new StockReservationFailedEvent(event.getOrderId(), "INSUFFICIENT_STOCK"));
            ack.acknowledge();
        }
    }

    // COMPENSATION: releases reservation when payment fails
    private void handlePaymentFailed(PaymentFailedEvent event, Acknowledgment ack) {
        log.info("Saga compensation: releasing stock reservation for orderId={}", event.getOrderId());
        reservationService.release(event.getOrderId());
        ack.acknowledge();
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a Saga and why do microservices need it?"

**Hruday's answer:**
> A Saga is a pattern for managing long-running transactions that span multiple microservices, each with their own database. In a monolith, you use ACID database transactions — if step 3 fails, steps 1 and 2 are rolled back automatically. In microservices, each service has its own database, so a single ACID transaction spanning all of them requires Distributed Two-Phase Commit, which has severe availability and performance problems.
>
> Saga solves this by breaking the transaction into steps. Each step is a local database transaction within one service. If a later step fails, the Saga executes compensating transactions — the business-logic equivalent of rollback — to undo the completed steps. So if payment fails after stock was reserved, the Saga runs a "release stock reservation" compensation to restore consistency.
>
> The key insight: Saga achieves eventual consistency, not immediate consistency. Between step 2 (stock reserved) and step 3 (payment processed), the system is in a temporarily inconsistent state. That's acceptable if the inconsistency window is short — typically milliseconds to seconds — and the system reliably converges to consistency through the Saga.
>
> There are two implementations: choreography (services communicate via events, no central coordinator) and orchestration (a dedicated orchestrator drives the sequence explicitly). Both achieve the same outcome with different trade-offs.

---

### Q2 — Choreography vs Orchestration
**Interviewer asks:** "When do you choose choreography over orchestration for Sagas?"

**Hruday's answer:**
> I think of it as a visibility-vs-coupling trade-off.
>
> Choreography is simpler to build initially — no extra orchestrator service to create and maintain. Services react to events autonomously. This works well when the saga flow is straightforward with 3-4 steps and when teams are comfortable with event-driven systems. The main problem with choreography is visibility: to understand the complete saga flow, you must trace events across multiple service codebases and Kafka topics. When something goes wrong, debugging requires reconstructing the event sequence from distributed logs. Choreography also makes it harder to add a new step to the saga — you need to change multiple services' event handlers.
>
> Orchestration has explicit flow visibility — the orchestrator IS the documentation of the saga. All the step definitions, compensations, and error paths are in one place. Monitoring the saga state is straightforward: query the orchestrator's state table. Adding steps is a change in one service (the orchestrator) rather than multiple services. The trade-off: the orchestrator is an additional service that must be deployed and kept highly available.
>
> My rule of thumb: use choreography for simple, stable sagas (order → inventory → payment, 3 clear steps where the business flow rarely changes). Use orchestration when the saga has 5+ steps, involves multiple teams' services, requires complex error handling logic, or when audit trail and monitoring of saga progress are required (financial transactions, compliance-sensitive flows).
>
> At Razorpay, I'd use orchestration for the payment saga — it's complex, financial, and requires complete audit visibility. At Swiggy for order placement, choreography works fine — 4 steps, well-understood, monitored via Kafka event tracing.

---

### Q3 — Compensation Design
**Interviewer asks:** "When is it impossible to undo a step with a compensating transaction?"

**Hruday's answer:**
> Not all steps can be undone with a logical inverse. The classic example: sending an email or SMS notification. You cannot unsend a message. If the saga fails after the notification was sent, the user already received it — "Your order is confirmed!" — and the compensating transaction should send a second message — "Sorry, your order was cancelled due to payment failure." The compensation is not an UNDO but a CORRECTIVE action.
>
> Similarly, a payment that was successfully charged to a bank: the compensation is a REFUND, not an undone charge. The charge happened; the refund happens separately. Banks may take 3-7 business days to process the refund. The system is eventually consistent — not instantly consistent.
>
> Other examples where compensation is corrective rather than undoing: any action that triggered a physical-world sequence (shipping a package, dispatching a driver), regulatory reporting (an audit entry once written cannot be deleted — only a corrective journal entry can be added), and external API calls to third parties (if you called a third-party inventory supplier and they started preparing the order, you can't instantly undo that — you issue a cancellation that they process on their timeline).
>
> Designing sagas requires acknowledging these "imperfect" compensations. The system can reach eventual consistency, but the path may include user-visible intermediate states and human-time delays. The key word is "compensate" — not "rollback."

---

### Q4 — Saga State Recovery
**Interviewer asks:** "What happens if the Saga Orchestrator crashes in the middle of a saga?"

**Hruday's answer:**
> This is the key design requirement for orchestration: the orchestrator must persist its state to the database before executing each step. So if it crashes, when it restarts it can recover the saga from exactly where it left off.
>
> The state table records: saga ID, the order it belongs to, the current step, compensating step if in rollback, IDs of completed operations (reservation ID, payment ID), and any failure reasons. Before calling InventoryService, the orchestrator writes "step=RESERVE_STOCK, status=IN_PROGRESS" to the database. After success, it writes "step=RESERVE_STOCK, status=COMPLETE, reservationId=xyz". Then it moves to the next step.
>
> On restart, the orchestrator has a recovery job that finds any sagas with step status "IN_PROGRESS" — these are the ones that were interrupted mid-step. The recovery re-executes from that step. For the downstream service call to be safe to retry (the stock reservation might have succeeded before the crash), the saga state must include an idempotency key. The compensated service checks: "did I already handle this saga step?" If yes, return the already-committed result without doing the work again.
>
> The idempotency key pattern and saga state persistence together guarantee that an orchestrator crash results in at-most-once business effect (no double charges, no double stock reservations) even with at-least-once processing semantics.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Saga = distributed transaction" | "Saga is just a distributed ACID transaction" | "Saga is explicitly NOT a distributed ACID transaction. ACID gives isolation (concurrent transactions don't see each other's intermediate state) and atomicity (all or nothing at the same instant). Saga provides eventual consistency — other systems CAN see the intermediate state (stock reserved but payment not yet done). Saga is a different consistency model, appropriate when ACID is unavailable, not a substitute." |
| "Compensations are free to implement" | "Just add catch blocks with compensating calls" | "Compensations fail too. If payment fails and the stock compensation call also fails (InventoryService is down), you have stock permanently reserved for a failed order. Compensations must be: idempotent (re-runnable if they fail and retry), persisted (the orchestrator must know which compensations are pending), and retried until they succeed. A compensation failure is a critical alert — it may require manual intervention to restore data consistency." |
| "No state needed for choreography" | "In choreography, no state tracking is needed" | "Without any tracking, if a saga in choreography gets stuck (InventoryService processed OrderCreated but the StockReserved event was lost due to a Kafka partition issue), nothing moves forward and nothing rolls back. The order is in limbo. At minimum, each saga participant should record what stage of the saga they have processed for a given orderId. A saga timeout job detects stuck sagas and triggers appropriate remediation." |
| "Sagas handle all consistency needs" | "Use Saga for every cross-service transaction" | "Saga is for cases where eventual consistency is acceptable. If the business requirement is strict consistency — 'the stock and the order MUST be updated atomically or neither' — Saga's eventual consistency model is wrong. In those cases, reconsider whether the affected data really belongs in two separate services (maybe they should be one service with a single transactional database)." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, the procurement workflow crossed five functional modules: supplier selection, purchase order creation, approval routing, goods receipt confirmation, and invoice matching. This was all within one ERP monolith with one Oracle database — ACID transactions handled all of it. Understanding the Saga pattern made me realise that this cross-module workflow was implicitly a Saga — each module completing its step and signalling to the next. The difference in the monolith: if approval failed, the Oracle transaction rolled back purchase order creation automatically. In microservices, I'd need to explicitly design the compensation — 'cancel the purchase order if approval is rejected.' The conceptual workflow I understood from the monolith directly translates to Saga steps. The implementation differs; the business logic is the same."

---

## 8. Scale Evolution

**Low transaction volume →** Orchestration with a simple state table. Compensating transactions in try/catch blocks. Manual monitoring of saga_state table for stuck sagas.

**Medium volume →** Outbox pattern (Topic 79) for reliable event publishing in choreography. Dedicated saga monitoring job that scans for stuck/failed sagas and alerts. Idempotency keys on all saga service calls.

**High volume →** Dedicated orchestration framework (e.g., Temporal.io, Conductor) that handles distributed workflow execution, state persistence, retry, timeout, and monitoring — rather than building all of this manually. Temporal is the modern production choice for complex saga orchestration.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment saga: authorise payment → capture → settle to merchant → issue receipt. Each step potentially across different services. Compensation = refund. Saga design is fundamental to payment architecture. | "Design the payment processing flow with compensation for failed settlement." |
| Swiggy / Meesho | Order placement saga: reserve inventory → charge payment → create delivery task → send confirmation. Classic 4-step saga. Both choreography and orchestration options are valid here. | "What happens to the order if payment fails after inventory is reserved?" |
| Amazon / Flipkart | Fulfillment saga: reserve warehouse stock → plan shipping → generate invoice → dispatch to carrier. Multiple teams, multiple services, requires orchestration for visibility. | "Design Amazon's order fulfillment saga with compensation paths." |
| SAP Labs (current) | SAP's business workflow patterns (approval workflows, purchase-to-pay, order-to-cash) are classic sagas implemented within SAP's transaction manager. Understanding Saga gives vocabulary to modernise these in a microservices architecture. | Relevant for SAP BTP workflow service design. |

---

## 10. Related Topics — What to Study Next

- **Topic 77 — Two-Phase Commit (2PC)** — why Saga exists: 2PC is the ACID alternative for distributed transactions, but it has availability and deadlock problems at scale; knowing why 2PC fails motivates Saga design
- **Topic 79 — Outbox Pattern** — in choreography Saga, the Outbox pattern guarantees that an event is published IFF the local transaction commits — critical for preventing lost saga events that leave sagas stuck
- **Topic 78 — Eventual Consistency** — the consistency model that Saga provides; understanding the trade-offs of eventual vs strong consistency is the theoretical foundation for choosing Saga
- **Topic 64 — Database per Service Pattern** — the design decision that makes Saga necessary; when services have separate databases, distributed ACID is unavailable; Saga fills that gap
- **Topic 67 — Kafka and Asynchronous Communication** — choreography Saga is implemented using Kafka events; deep Kafka knowledge (consumer groups, offset management, at-least-once delivery) is required to implement choreography correctly

---

*Part 4 · Saga Pattern (Choreography vs Orchestration) · Full Stack Interview Guide · Hruday D · 2026*
