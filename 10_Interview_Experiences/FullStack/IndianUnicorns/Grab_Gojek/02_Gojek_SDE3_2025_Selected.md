# Gojek — SDE-3 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Gojek |
| **Role** | Senior Software Development Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Medium](https://medium.com/tag/interview-experience) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Take-home + 2 Technical + System Design + Bar Raiser)
- **Timeline:** 4 weeks
- **Format:** Virtual

## Round 1: Take-Home Assignment
**Duration:** 48 hours

### Questions Asked
1. **Build a Food Delivery Order Orchestrator**
   - Implement an order state machine with event-driven transitions
   - Handle concurrent order updates, retries, and compensating transactions

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;

public class OrderOrchestrator {

    // ============================================
    // Order State Machine
    // ============================================
    enum OrderState {
        CREATED, PAYMENT_PENDING, PAYMENT_CONFIRMED, RESTAURANT_ACCEPTED,
        PREPARING, READY_FOR_PICKUP, DRIVER_ASSIGNED, PICKED_UP,
        EN_ROUTE, DELIVERED, CANCELLED, REFUND_INITIATED, REFUNDED
    }

    enum OrderEvent {
        INITIATE_PAYMENT, PAYMENT_SUCCESS, PAYMENT_FAILURE,
        RESTAURANT_ACCEPT, RESTAURANT_REJECT, FOOD_PREPARED,
        ASSIGN_DRIVER, DRIVER_PICKUP, DRIVER_EN_ROUTE, DRIVER_DELIVER,
        CANCEL_ORDER, INITIATE_REFUND, REFUND_COMPLETE
    }

    static class Transition {
        OrderState from;
        OrderEvent event;
        OrderState to;
        Consumer<Order> action; // side effect on transition

        Transition(OrderState from, OrderEvent event, OrderState to, Consumer<Order> action) {
            this.from = from;
            this.event = event;
            this.to = to;
            this.action = action;
        }
    }

    static class Order {
        String orderId;
        OrderState state;
        double amount;
        String restaurantId;
        String driverId;
        List<String> auditLog = new ArrayList<>();
        long lastUpdated;

        Order(String orderId, double amount, String restaurantId) {
            this.orderId = orderId;
            this.amount = amount;
            this.restaurantId = restaurantId;
            this.state = OrderState.CREATED;
            this.lastUpdated = System.currentTimeMillis();
        }

        void log(String message) {
            auditLog.add(String.format("[%d] %s", System.currentTimeMillis(), message));
        }
    }

    // State machine definition
    private final Map<String, Transition> transitionTable = new HashMap<>();
    private final ConcurrentHashMap<String, Order> orders = new ConcurrentHashMap<>();
    private final ExecutorService eventProcessor = Executors.newFixedThreadPool(4);

    // Compensation actions for rollback (Saga pattern)
    private final Map<OrderState, Consumer<Order>> compensations = new HashMap<>();

    public OrderOrchestrator() {
        defineTransitions();
        defineCompensations();
    }

    private void defineTransitions() {
        addTransition(OrderState.CREATED, OrderEvent.INITIATE_PAYMENT,
            OrderState.PAYMENT_PENDING, o -> o.log("Payment initiated for $" + o.amount));

        addTransition(OrderState.PAYMENT_PENDING, OrderEvent.PAYMENT_SUCCESS,
            OrderState.PAYMENT_CONFIRMED, o -> o.log("Payment confirmed"));

        addTransition(OrderState.PAYMENT_PENDING, OrderEvent.PAYMENT_FAILURE,
            OrderState.CANCELLED, o -> o.log("Payment failed — order cancelled"));

        addTransition(OrderState.PAYMENT_CONFIRMED, OrderEvent.RESTAURANT_ACCEPT,
            OrderState.RESTAURANT_ACCEPTED, o -> o.log("Restaurant accepted order"));

        addTransition(OrderState.PAYMENT_CONFIRMED, OrderEvent.RESTAURANT_REJECT,
            OrderState.REFUND_INITIATED, o -> o.log("Restaurant rejected — initiating refund"));

        addTransition(OrderState.RESTAURANT_ACCEPTED, OrderEvent.FOOD_PREPARED,
            OrderState.READY_FOR_PICKUP, o -> o.log("Food prepared, ready for pickup"));

        addTransition(OrderState.READY_FOR_PICKUP, OrderEvent.ASSIGN_DRIVER,
            OrderState.DRIVER_ASSIGNED, o -> o.log("Driver " + o.driverId + " assigned"));

        addTransition(OrderState.DRIVER_ASSIGNED, OrderEvent.DRIVER_PICKUP,
            OrderState.PICKED_UP, o -> o.log("Driver picked up order"));

        addTransition(OrderState.PICKED_UP, OrderEvent.DRIVER_EN_ROUTE,
            OrderState.EN_ROUTE, o -> o.log("Driver en route to customer"));

        addTransition(OrderState.EN_ROUTE, OrderEvent.DRIVER_DELIVER,
            OrderState.DELIVERED, o -> o.log("Order delivered successfully"));

        addTransition(OrderState.REFUND_INITIATED, OrderEvent.REFUND_COMPLETE,
            OrderState.REFUNDED, o -> o.log("Refund of $" + o.amount + " completed"));

        // Cancellation from multiple states
        for (OrderState cancelable : EnumSet.of(
            OrderState.CREATED, OrderState.PAYMENT_CONFIRMED,
            OrderState.RESTAURANT_ACCEPTED, OrderState.PREPARING
        )) {
            addTransition(cancelable, OrderEvent.CANCEL_ORDER,
                OrderState.REFUND_INITIATED, o -> o.log("Cancelled from " + cancelable));
        }
    }

    private void defineCompensations() {
        compensations.put(OrderState.PAYMENT_CONFIRMED, o -> {
            o.log("COMPENSATE: Refunding payment");
            // In reality: call payment service to refund
        });
        compensations.put(OrderState.RESTAURANT_ACCEPTED, o -> {
            o.log("COMPENSATE: Notifying restaurant of cancellation");
        });
        compensations.put(OrderState.DRIVER_ASSIGNED, o -> {
            o.log("COMPENSATE: Releasing driver assignment");
        });
    }

    private void addTransition(OrderState from, OrderEvent event, OrderState to, Consumer<Order> action) {
        String key = from.name() + ":" + event.name();
        transitionTable.put(key, new Transition(from, event, to, action));
    }

    /**
     * Process event with optimistic locking via CAS.
     * Returns true if transition was successful.
     */
    public CompletableFuture<Boolean> processEvent(String orderId, OrderEvent event) {
        return CompletableFuture.supplyAsync(() -> {
            Order order = orders.get(orderId);
            if (order == null) {
                throw new IllegalArgumentException("Order not found: " + orderId);
            }

            synchronized (order) {
                String key = order.state.name() + ":" + event.name();
                Transition transition = transitionTable.get(key);

                if (transition == null) {
                    order.log("REJECTED: Event " + event + " not valid in state " + order.state);
                    return false;
                }

                OrderState previousState = order.state;
                order.state = transition.to;
                order.lastUpdated = System.currentTimeMillis();

                try {
                    transition.action.accept(order);
                } catch (Exception e) {
                    // Rollback on failure
                    order.state = previousState;
                    order.log("ROLLBACK: Transition failed — " + e.getMessage());
                    return false;
                }

                return true;
            }
        }, eventProcessor);
    }

    public Order createOrder(String orderId, double amount, String restaurantId) {
        Order order = new Order(orderId, amount, restaurantId);
        order.log("Order created");
        orders.put(orderId, order);
        return order;
    }

    public void printOrderHistory(String orderId) {
        Order order = orders.get(orderId);
        if (order == null) return;
        System.out.println("Order " + orderId + " [" + order.state + "]:");
        order.auditLog.forEach(log -> System.out.println("  " + log));
    }

    public void shutdown() {
        eventProcessor.shutdown();
    }

    public static void main(String[] args) throws Exception {
        OrderOrchestrator orchestrator = new OrderOrchestrator();

        // Happy path
        orchestrator.createOrder("ORD-001", 250.0, "REST-42");
        orchestrator.processEvent("ORD-001", OrderEvent.INITIATE_PAYMENT).get();
        orchestrator.processEvent("ORD-001", OrderEvent.PAYMENT_SUCCESS).get();
        orchestrator.processEvent("ORD-001", OrderEvent.RESTAURANT_ACCEPT).get();
        orchestrator.processEvent("ORD-001", OrderEvent.FOOD_PREPARED).get();

        Order order = orchestrator.orders.get("ORD-001");
        order.driverId = "DRV-007";
        orchestrator.processEvent("ORD-001", OrderEvent.ASSIGN_DRIVER).get();
        orchestrator.processEvent("ORD-001", OrderEvent.DRIVER_PICKUP).get();
        orchestrator.processEvent("ORD-001", OrderEvent.DRIVER_EN_ROUTE).get();
        orchestrator.processEvent("ORD-001", OrderEvent.DRIVER_DELIVER).get();

        orchestrator.printOrderHistory("ORD-001");

        // Cancellation path
        orchestrator.createOrder("ORD-002", 180.0, "REST-15");
        orchestrator.processEvent("ORD-002", OrderEvent.INITIATE_PAYMENT).get();
        orchestrator.processEvent("ORD-002", OrderEvent.PAYMENT_SUCCESS).get();
        orchestrator.processEvent("ORD-002", OrderEvent.CANCEL_ORDER).get();
        orchestrator.processEvent("ORD-002", OrderEvent.REFUND_COMPLETE).get();

        System.out.println();
        orchestrator.printOrderHistory("ORD-002");

        orchestrator.shutdown();
    }
}
```

**Key Design Decisions:**
- **State Machine Pattern:** Explicit transition table prevents invalid state changes
- **Saga Compensations:** Each state has a rollback action for distributed failure handling
- **Audit Log:** Every transition is logged for debugging and compliance
- **Async Processing:** CompletableFuture for non-blocking event handling

## Round 2: Technical Deep-Dive
**Duration:** 60 minutes | **Interviewer:** Staff Engineer

### Questions Asked
- Walked through take-home code, discussed design choices
- Follow-up: "How would you handle duplicate events (idempotency)?"
- Follow-up: "How would you shard orders across services?"

## Round 3: DSA
**Duration:** 60 minutes

### Questions Asked
1. **Minimum Cost to Connect All Cities** (variation of MST with existing connections)

## Round 4: System Design
**Duration:** 75 minutes

### Questions Asked
1. **Design Gojek's Multi-Service Super App Backend**
   - Support ride-hailing, food delivery, and payments in a single platform
   - Service mesh architecture with independent scaling

## Round 5: Bar Raiser
**Duration:** 45 minutes
- Deep dive on ownership, conflict resolution, and mentoring juniors

## 🎯 Key Takeaways
- Gojek values **take-home quality** — clean code, tests, README matter
- State machine + Saga pattern is the go-to for order orchestration
- Super app architecture requires strong **service mesh** and **API gateway** knowledge
- Interview process is thorough but respectful — 4 weeks but well-organized

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Take-Home | Hard | State Machine, Saga, Event-Driven |
| Technical Deep-Dive | Medium | Code Review, Idempotency |
| DSA | Medium | MST, Union-Find |
| System Design | Hard | Microservices, Service Mesh |
| Bar Raiser | Medium | Behavioral, Leadership |
