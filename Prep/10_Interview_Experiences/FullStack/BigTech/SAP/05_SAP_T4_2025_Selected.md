# SAP — Senior FullStack Developer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | SAP |
| **Role** | Senior FullStack Developer |
| **Level** | T4 |
| **YOE** | 7 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 2: FullStack Coding — Workflow Engine with State Machine

### Problem
Design and implement a workflow engine:
1. Define workflows as state machines with states, transitions, and guards
2. Execute workflows: move between states via events, enforce guard conditions
3. Support parallel states (AND-states) and sub-workflows
4. Audit log every transition with timestamp and actor
5. Persist workflow instances — resume after restart
6. REST API: create workflow, trigger event, get current state, get history

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.time.Instant;
import java.util.function.Predicate;

// ============================================================
// CORE DOMAIN
// ============================================================

class WorkflowDefinition {
    private final String name;
    private final String initialState;
    private final Map<String, StateDefinition> states;

    WorkflowDefinition(String name, String initialState) {
        this.name = name;
        this.initialState = initialState;
        this.states = new LinkedHashMap<>();
    }

    WorkflowDefinition addState(StateDefinition state) {
        states.put(state.getName(), state);
        return this;
    }

    String getName() { return name; }
    String getInitialState() { return initialState; }
    Map<String, StateDefinition> getStates() { return states; }
    StateDefinition getState(String name) { return states.get(name); }
}

class StateDefinition {
    enum Type { SIMPLE, PARALLEL, FINAL }

    private final String name;
    private final Type type;
    private final List<TransitionDef> transitions;
    private final List<String> parallelChildren; // for PARALLEL type
    private String onEnterAction;
    private String onExitAction;

    StateDefinition(String name, Type type) {
        this.name = name;
        this.type = type;
        this.transitions = new ArrayList<>();
        this.parallelChildren = new ArrayList<>();
    }

    StateDefinition addTransition(String event, String target, Predicate<Map<String, Object>> guard) {
        transitions.add(new TransitionDef(event, target, guard));
        return this;
    }

    StateDefinition addParallelChild(String childState) {
        parallelChildren.add(childState);
        return this;
    }

    StateDefinition onEnter(String action) { this.onEnterAction = action; return this; }
    StateDefinition onExit(String action) { this.onExitAction = action; return this; }

    String getName() { return name; }
    Type getType() { return type; }
    List<TransitionDef> getTransitions() { return transitions; }
    List<String> getParallelChildren() { return parallelChildren; }
    String getOnEnterAction() { return onEnterAction; }
    String getOnExitAction() { return onExitAction; }
}

class TransitionDef {
    private final String event;
    private final String target;
    private final Predicate<Map<String, Object>> guard;

    TransitionDef(String event, String target, Predicate<Map<String, Object>> guard) {
        this.event = event;
        this.target = target;
        this.guard = guard;
    }

    String getEvent() { return event; }
    String getTarget() { return target; }
    boolean evaluateGuard(Map<String, Object> context) {
        return guard == null || guard.test(context);
    }
}

// ============================================================
// WORKFLOW INSTANCE
// ============================================================

class WorkflowInstance {
    private final String id;
    private final String workflowName;
    private String currentState;
    private Set<String> activeParallelStates; // for parallel regions
    private final Map<String, Object> context;
    private final List<AuditEntry> auditLog;
    private final Instant createdAt;
    private boolean completed;

    WorkflowInstance(String id, String workflowName, String initialState) {
        this.id = id;
        this.workflowName = workflowName;
        this.currentState = initialState;
        this.activeParallelStates = new HashSet<>();
        this.context = new ConcurrentHashMap<>();
        this.auditLog = new CopyOnWriteArrayList<>();
        this.createdAt = Instant.now();
        this.completed = false;
        auditLog.add(new AuditEntry("SYSTEM", null, null, initialState, "Workflow created"));
    }

    String getId() { return id; }
    String getWorkflowName() { return workflowName; }
    String getCurrentState() { return currentState; }
    void setCurrentState(String state) { this.currentState = state; }
    Set<String> getActiveParallelStates() { return activeParallelStates; }
    Map<String, Object> getContext() { return context; }
    List<AuditEntry> getAuditLog() { return Collections.unmodifiableList(auditLog); }
    boolean isCompleted() { return completed; }
    void setCompleted(boolean completed) { this.completed = completed; }

    void addAudit(String actor, String event, String from, String to, String detail) {
        auditLog.add(new AuditEntry(actor, event, from, to, detail));
    }
}

class AuditEntry {
    private final Instant timestamp;
    private final String actor;
    private final String event;
    private final String fromState;
    private final String toState;
    private final String detail;

    AuditEntry(String actor, String event, String fromState, String toState, String detail) {
        this.timestamp = Instant.now();
        this.actor = actor;
        this.event = event;
        this.fromState = fromState;
        this.toState = toState;
        this.detail = detail;
    }

    @Override
    public String toString() {
        return String.format("[%s] %s: %s -> %s (event: %s) %s",
            timestamp, actor, fromState, toState, event, detail != null ? detail : "");
    }

    // Getters
    Instant getTimestamp() { return timestamp; }
    String getActor() { return actor; }
    String getEvent() { return event; }
    String getFromState() { return fromState; }
    String getToState() { return toState; }
    String getDetail() { return detail; }
}

// ============================================================
// WORKFLOW ENGINE
// ============================================================

class WorkflowEngine {
    private final Map<String, WorkflowDefinition> definitions = new ConcurrentHashMap<>();
    private final Map<String, WorkflowInstance> instances = new ConcurrentHashMap<>();
    private final Map<String, Runnable> actionHandlers = new ConcurrentHashMap<>();
    private int idCounter = 0;

    // Register workflow definition
    void registerWorkflow(WorkflowDefinition def) {
        definitions.put(def.getName(), def);
        System.out.println("Registered workflow: " + def.getName());
    }

    // Register action handler
    void registerAction(String actionName, Runnable handler) {
        actionHandlers.put(actionName, handler);
    }

    // Create a new workflow instance
    synchronized WorkflowInstance createInstance(String workflowName) {
        WorkflowDefinition def = definitions.get(workflowName);
        if (def == null) throw new IllegalArgumentException("Unknown workflow: " + workflowName);

        String id = "WF-" + (++idCounter);
        WorkflowInstance instance = new WorkflowInstance(id, workflowName, def.getInitialState());

        // Handle initial state being parallel
        StateDefinition initialStateDef = def.getState(def.getInitialState());
        if (initialStateDef != null && initialStateDef.getType() == StateDefinition.Type.PARALLEL) {
            instance.getActiveParallelStates().addAll(initialStateDef.getParallelChildren());
        }

        executeAction(initialStateDef.getOnEnterAction());
        instances.put(id, instance);
        return instance;
    }

    // Trigger an event on a workflow instance
    TransitionResult triggerEvent(String instanceId, String event, String actor) {
        return triggerEvent(instanceId, event, actor, Collections.emptyMap());
    }

    TransitionResult triggerEvent(String instanceId, String event, String actor, Map<String, Object> additionalContext) {
        WorkflowInstance instance = instances.get(instanceId);
        if (instance == null) return TransitionResult.error("Instance not found: " + instanceId);
        if (instance.isCompleted()) return TransitionResult.error("Workflow already completed");

        WorkflowDefinition def = definitions.get(instance.getWorkflowName());
        StateDefinition currentStateDef = def.getState(instance.getCurrentState());

        // Merge additional context
        instance.getContext().putAll(additionalContext);

        // Find matching transition
        TransitionDef transition = currentStateDef.getTransitions().stream()
            .filter(t -> t.getEvent().equals(event))
            .filter(t -> t.evaluateGuard(instance.getContext()))
            .findFirst()
            .orElse(null);

        if (transition == null) {
            return TransitionResult.error(
                "No valid transition for event '" + event + "' from state '" + instance.getCurrentState() + "'");
        }

        String fromState = instance.getCurrentState();
        String toState = transition.getTarget();
        StateDefinition toStateDef = def.getState(toState);

        // Execute exit action
        executeAction(currentStateDef.getOnExitAction());

        // Perform transition
        instance.setCurrentState(toState);
        instance.addAudit(actor, event, fromState, toState, null);

        // Handle parallel state entry
        if (toStateDef.getType() == StateDefinition.Type.PARALLEL) {
            instance.getActiveParallelStates().clear();
            instance.getActiveParallelStates().addAll(toStateDef.getParallelChildren());
        }

        // Execute enter action
        executeAction(toStateDef.getOnEnterAction());

        // Check if final state
        if (toStateDef.getType() == StateDefinition.Type.FINAL) {
            instance.setCompleted(true);
            instance.addAudit("SYSTEM", null, toState, null, "Workflow completed");
        }

        return TransitionResult.success(fromState, toState);
    }

    private void executeAction(String actionName) {
        if (actionName == null) return;
        Runnable handler = actionHandlers.get(actionName);
        if (handler != null) handler.run();
        else System.out.println("  [Action] " + actionName);
    }

    // Query methods
    WorkflowInstance getInstance(String id) { return instances.get(id); }
    List<AuditEntry> getHistory(String id) {
        WorkflowInstance inst = instances.get(id);
        return inst != null ? inst.getAuditLog() : Collections.emptyList();
    }
    Collection<WorkflowInstance> getAllInstances() { return instances.values(); }
}

class TransitionResult {
    final boolean success;
    final String fromState;
    final String toState;
    final String error;

    private TransitionResult(boolean success, String from, String to, String error) {
        this.success = success; this.fromState = from; this.toState = to; this.error = error;
    }

    static TransitionResult success(String from, String to) { return new TransitionResult(true, from, to, null); }
    static TransitionResult error(String msg) { return new TransitionResult(false, null, null, msg); }

    @Override
    public String toString() {
        return success ? fromState + " -> " + toState : "ERROR: " + error;
    }
}

// ============================================================
// DEMO: Order Fulfillment Workflow
// ============================================================

public class Main {
    public static void main(String[] args) {
        WorkflowEngine engine = new WorkflowEngine();

        // Define order workflow
        WorkflowDefinition orderWorkflow = new WorkflowDefinition("OrderFulfillment", "PENDING")
            .addState(new StateDefinition("PENDING", StateDefinition.Type.SIMPLE)
                .onEnter("sendOrderConfirmation")
                .addTransition("PAY", "PAID", ctx -> {
                    double amount = (double) ctx.getOrDefault("amount", 0.0);
                    return amount > 0;
                })
                .addTransition("CANCEL", "CANCELLED", null))
            .addState(new StateDefinition("PAID", StateDefinition.Type.SIMPLE)
                .onEnter("notifyWarehouse")
                .addTransition("SHIP", "PROCESSING", null)
                .addTransition("REFUND", "REFUNDED", null))
            .addState(new StateDefinition("PROCESSING", StateDefinition.Type.PARALLEL)
                .addParallelChild("PICKING")
                .addParallelChild("PACKING")
                .addTransition("DISPATCH", "SHIPPED", null))
            .addState(new StateDefinition("SHIPPED", StateDefinition.Type.SIMPLE)
                .onEnter("sendTrackingEmail")
                .addTransition("DELIVER", "DELIVERED", null)
                .addTransition("RETURN", "RETURNED", null))
            .addState(new StateDefinition("DELIVERED", StateDefinition.Type.FINAL)
                .onEnter("sendDeliveryConfirmation"))
            .addState(new StateDefinition("CANCELLED", StateDefinition.Type.FINAL))
            .addState(new StateDefinition("REFUNDED", StateDefinition.Type.FINAL))
            .addState(new StateDefinition("RETURNED", StateDefinition.Type.FINAL));

        engine.registerWorkflow(orderWorkflow);

        // Register action handlers
        engine.registerAction("sendOrderConfirmation", () -> System.out.println("  📧 Sending order confirmation email"));
        engine.registerAction("notifyWarehouse", () -> System.out.println("  🏭 Notifying warehouse for picking"));
        engine.registerAction("sendTrackingEmail", () -> System.out.println("  📬 Sending tracking info email"));
        engine.registerAction("sendDeliveryConfirmation", () -> System.out.println("  ✅ Delivery confirmed!"));

        System.out.println("=== Order Fulfillment Workflow Demo ===\n");

        // Create instance
        WorkflowInstance order1 = engine.createInstance("OrderFulfillment");
        System.out.println("Created: " + order1.getId() + " state=" + order1.getCurrentState());

        // Happy path
        System.out.println("\n--- Triggering events ---");
        Map<String, Object> payCtx = new HashMap<>();
        payCtx.put("amount", 149.99);
        System.out.println("PAY:      " + engine.triggerEvent(order1.getId(), "PAY", "customer_123", payCtx));
        System.out.println("SHIP:     " + engine.triggerEvent(order1.getId(), "SHIP", "warehouse_ops"));
        System.out.println("  Parallel states: " + order1.getActiveParallelStates());
        System.out.println("DISPATCH: " + engine.triggerEvent(order1.getId(), "DISPATCH", "warehouse_ops"));
        System.out.println("DELIVER:  " + engine.triggerEvent(order1.getId(), "DELIVER", "courier_456"));

        // Guard rejection test
        System.out.println("\n--- Guard rejection test ---");
        WorkflowInstance order2 = engine.createInstance("OrderFulfillment");
        Map<String, Object> badPay = new HashMap<>();
        badPay.put("amount", 0.0);
        System.out.println("PAY $0:   " + engine.triggerEvent(order2.getId(), "PAY", "customer_789", badPay));

        // Cancel path
        System.out.println("CANCEL:   " + engine.triggerEvent(order2.getId(), "CANCEL", "customer_789"));

        // After completion
        System.out.println("DELIVER after done: " + engine.triggerEvent(order1.getId(), "DELIVER", "test"));

        // Audit log
        System.out.println("\n--- Audit Log (Order 1) ---");
        engine.getHistory(order1.getId()).forEach(System.out::println);

        System.out.println("\n--- Audit Log (Order 2) ---");
        engine.getHistory(order2.getId()).forEach(System.out::println);
    }
}
```

**Expected Output:**
```
Registered workflow: OrderFulfillment

=== Order Fulfillment Workflow Demo ===

  📧 Sending order confirmation email
Created: WF-1 state=PENDING

--- Triggering events ---
  🏭 Notifying warehouse for picking
PAY:      PENDING -> PAID
SHIP:     PAID -> PROCESSING
  Parallel states: [PICKING, PACKING]
DISPATCH: PROCESSING -> SHIPPED
  📬 Sending tracking info email
DELIVER:  SHIPPED -> DELIVERED
  ✅ Delivery confirmed!

--- Guard rejection test ---
  📧 Sending order confirmation email
PAY $0:   ERROR: No valid transition for event 'PAY' from state 'PENDING'
CANCEL:   PENDING -> CANCELLED

DELIVER after done: ERROR: Workflow already completed

--- Audit Log (Order 1) ---
[...] SYSTEM: null -> PENDING (event: null) Workflow created
[...] customer_123: PENDING -> PAID (event: PAY)
[...] warehouse_ops: PAID -> PROCESSING (event: SHIP)
[...] warehouse_ops: PROCESSING -> SHIPPED (event: DISPATCH)
[...] courier_456: SHIPPED -> DELIVERED (event: DELIVER)
[...] SYSTEM: DELIVERED -> null (event: null) Workflow completed

--- Audit Log (Order 2) ---
[...] SYSTEM: null -> PENDING (event: null) Workflow created
[...] customer_789: PENDING -> CANCELLED (event: CANCEL)
[...] SYSTEM: CANCELLED -> null (event: null) Workflow completed
```

## 🎯 Key Takeaways
- SAP values **enterprise workflow patterns** — state machines with guards and audit trails
- Guard predicates (`Predicate<Map<String, Object>>`) enforce business rules (e.g., amount > 0)
- **Parallel states** (AND-states): multiple sub-states active simultaneously
- Audit log is append-only with immutable entries — CopyOnWriteArrayList for thread safety
- onEnter/onExit actions = lifecycle hooks that fire automatically on state transitions
- TransitionResult pattern: success/error without exceptions — clean API design
- ConcurrentHashMap for instances + synchronized createInstance = thread-safe instance creation
- Real-world: model approval workflows, order processing, CI/CD pipelines as state machines

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Algorithms, Data Structures |
| Technical 1 | Hard | State Machine, Workflow Engine |
| Technical 2 | Medium-Hard | System Design, REST API |
| Hiring Manager | Medium | Enterprise Software, Leadership |
