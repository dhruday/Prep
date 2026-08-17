# Adobe — MTS-2 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Adobe |
| **Role** | Member of Technical Staff 2 |
| **Level** | MTS-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/adobe-interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Technical — Implement Event Bus with Namespaces and Wildcards
**Duration:** 45 minutes

### Problem
Build an in-memory event bus supporting:
- Namespaced events (`user.login`, `user.logout`)
- Wildcard subscriptions (`user.*`)
- Once listeners (fire once, then auto-remove)
- Priority ordering for listeners
- Async event emission

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;

public class EventBus {

    static class Listener implements Comparable<Listener> {
        final String id;
        final String pattern;    // Event pattern (can include *)
        final Consumer<Object> handler;
        final int priority;      // Higher = runs first
        final boolean once;

        Listener(String id, String pattern, Consumer<Object> handler, int priority, boolean once) {
            this.id = id;
            this.pattern = pattern;
            this.handler = handler;
            this.priority = priority;
            this.once = once;
        }

        @Override
        public int compareTo(Listener other) {
            return Integer.compare(other.priority, this.priority); // Higher first
        }
    }

    private final Map<String, PriorityQueue<Listener>> exactListeners = new ConcurrentHashMap<>();
    private final List<Listener> wildcardListeners = new CopyOnWriteArrayList<>();
    private final ExecutorService asyncExecutor;
    private int nextListenerId = 0;

    public EventBus() {
        this.asyncExecutor = Executors.newFixedThreadPool(
            Runtime.getRuntime().availableProcessors(),
            r -> {
                Thread t = new Thread(r, "eventbus-async");
                t.setDaemon(true);
                return t;
            }
        );
    }

    /**
     * Subscribe to events matching a pattern.
     * Pattern: "user.login" (exact), "user.*" (wildcard), "*" (all events)
     *
     * @return Subscription ID for unsubscribe
     */
    public String on(String eventPattern, Consumer<Object> handler) {
        return subscribe(eventPattern, handler, 0, false);
    }

    public String on(String eventPattern, Consumer<Object> handler, int priority) {
        return subscribe(eventPattern, handler, priority, false);
    }

    /**
     * Subscribe for a single event only.
     */
    public String once(String eventPattern, Consumer<Object> handler) {
        return subscribe(eventPattern, handler, 0, true);
    }

    private synchronized String subscribe(String pattern, Consumer<Object> handler,
                                           int priority, boolean once) {
        String id = "sub_" + (nextListenerId++);
        Listener listener = new Listener(id, pattern, handler, priority, once);

        if (pattern.contains("*")) {
            wildcardListeners.add(listener);
        } else {
            exactListeners.computeIfAbsent(pattern, k -> new PriorityQueue<>()).add(listener);
        }

        return id;
    }

    /**
     * Unsubscribe by subscription ID.
     */
    public void off(String subscriptionId) {
        // Remove from exact listeners
        for (PriorityQueue<Listener> queue : exactListeners.values()) {
            queue.removeIf(l -> l.id.equals(subscriptionId));
        }
        // Remove from wildcard listeners
        wildcardListeners.removeIf(l -> l.id.equals(subscriptionId));
    }

    /**
     * Emit event synchronously. All matching listeners are called in priority order.
     */
    public void emit(String event, Object data) {
        List<Listener> matched = getMatchingListeners(event);
        List<Listener> toRemove = new ArrayList<>();

        // Sort by priority (already sorted in PQ, but wildcards aren't)
        matched.sort(Comparator.comparingInt(l -> -l.priority));

        for (Listener listener : matched) {
            try {
                listener.handler.accept(data);
            } catch (Exception e) {
                System.err.println("Event handler error for " + event + ": " + e.getMessage());
            }

            if (listener.once) {
                toRemove.add(listener);
            }
        }

        // Remove once-listeners
        for (Listener l : toRemove) {
            off(l.id);
        }
    }

    /**
     * Emit event asynchronously. Returns a Future for completion tracking.
     */
    public CompletableFuture<Void> emitAsync(String event, Object data) {
        return CompletableFuture.runAsync(() -> emit(event, data), asyncExecutor);
    }

    /**
     * Get all listeners matching an event name.
     * Supports exact match and wildcard patterns.
     */
    private List<Listener> getMatchingListeners(String event) {
        List<Listener> matched = new ArrayList<>();

        // Exact listeners
        PriorityQueue<Listener> exact = exactListeners.get(event);
        if (exact != null) {
            matched.addAll(exact);
        }

        // Wildcard listeners
        for (Listener wl : wildcardListeners) {
            if (matchesWildcard(wl.pattern, event)) {
                matched.add(wl);
            }
        }

        return matched;
    }

    /**
     * Match wildcard patterns against event names.
     * "user.*" matches "user.login", "user.logout" but NOT "user.auth.token"
     * "user.**" matches "user.login" AND "user.auth.token" (deep wildcard)
     * "*" matches any single-segment event
     */
    private boolean matchesWildcard(String pattern, String event) {
        if ("**".equals(pattern) || "*".equals(pattern)) return true;

        String[] patternParts = pattern.split("\\.");
        String[] eventParts = event.split("\\.");

        int pi = 0, ei = 0;
        while (pi < patternParts.length && ei < eventParts.length) {
            String pp = patternParts[pi];

            if ("**".equals(pp)) {
                // Match remaining
                return true;
            } else if ("*".equals(pp)) {
                // Match exactly one segment
                pi++;
                ei++;
            } else if (pp.equals(eventParts[ei])) {
                pi++;
                ei++;
            } else {
                return false;
            }
        }

        return pi == patternParts.length && ei == eventParts.length;
    }

    /**
     * Get count of listeners for a specific event.
     */
    public int listenerCount(String event) {
        return getMatchingListeners(event).size();
    }

    public void shutdown() {
        asyncExecutor.shutdown();
    }

    public static void main(String[] args) throws Exception {
        EventBus bus = new EventBus();

        // Exact subscription
        bus.on("user.login", data -> {
            System.out.println("[Auth] User logged in: " + data);
        });

        // Wildcard subscription — all user events
        bus.on("user.*", data -> {
            System.out.println("[Audit] User event: " + data);
        }, 10); // Higher priority

        // Once listener
        bus.once("user.signup", data -> {
            System.out.println("[Welcome] First-time signup: " + data);
        });

        // Deep wildcard
        bus.on("order.**", data -> {
            System.out.println("[Monitor] Order activity: " + data);
        });

        System.out.println("--- Emitting user.login ---");
        bus.emit("user.login", Map.of("userId", 42, "ip", "192.168.1.1"));

        System.out.println("\n--- Emitting user.signup ---");
        bus.emit("user.signup", Map.of("userId", 99));

        System.out.println("\n--- Emitting user.signup again (once removed) ---");
        bus.emit("user.signup", Map.of("userId", 100));

        System.out.println("\n--- Emitting order.created ---");
        bus.emit("order.created", Map.of("orderId", "ORD-001"));

        System.out.println("\n--- Async emit ---");
        bus.emitAsync("user.logout", Map.of("userId", 42)).get();

        System.out.println("\nListener count for user.login: " + bus.listenerCount("user.login"));

        bus.shutdown();
    }
}
```

## 🎯 Key Takeaways
- Adobe asks **design pattern** problems — Event Bus / Pub-Sub is common
- Wildcard matching with segments (`user.*` vs `user.**`) tests string processing skills
- Priority queue ensures high-priority listeners fire first
- `once` listeners must be auto-removed after first invocation
- ConcurrentHashMap + CopyOnWriteArrayList for thread safety
- Always catch exceptions in handlers to prevent one bad listener from breaking others

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Technical 1 | Medium-Hard | Event Bus, Pub/Sub, Wildcards |
| Technical 2 | Hard | DP, Graph Algorithms |
| HM | Medium | Behavioral, Adobe Values |
