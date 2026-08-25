# Apple — SDE-2 FullStack Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | ICT3 Software Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Siri / ML Infrastructure |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite: 2 Coding + System Design + Behavioral)

---

## Round 3: Coding — Design a Thread-Safe Lazy-Initialized Singleton Registry
**Duration:** 45 minutes

### Question: Build a thread-safe registry where singletons are lazily created, with support for dependency injection and lifecycle management (shutdown hooks).

```java
import java.util.concurrent.*;
import java.util.*;

/**
 * Thread-Safe Lazy Singleton Registry:
 * 
 * Requirements:
 * 1. Lazy init: objects created on first access
 * 2. Thread-safe: no double creation, no data races
 * 3. Dependencies: a service can depend on others
 * 4. Lifecycle: ordered shutdown in reverse-dependency order
 * 5. Circular dependency detection
 * 
 * Approach: ConcurrentHashMap + computeIfAbsent for lock-free lazy init.
 * Dependency graph: topological sort for shutdown ordering.
 */

interface Service {
    void start();
    void stop();
}

class ServiceRegistry {
    
    private final ConcurrentHashMap<Class<?>, Object> instances = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Class<?>, ServiceFactory<?>> factories = new ConcurrentHashMap<>();
    
    // Dependency graph: service → set of dependencies
    private final ConcurrentHashMap<Class<?>, Set<Class<?>>> dependencies = new ConcurrentHashMap<>();
    
    // Track creation order for shutdown
    private final List<Class<?>> creationOrder = Collections.synchronizedList(new ArrayList<>());
    
    // Detect circular dependencies during creation
    private final ThreadLocal<Set<Class<?>>> creationStack = ThreadLocal.withInitial(HashSet::new);
    
    @FunctionalInterface
    interface ServiceFactory<T> {
        T create(ServiceRegistry registry);
    }
    
    /**
     * Register a factory for a service type with declared dependencies.
     */
    public <T> void register(Class<T> type, ServiceFactory<T> factory, Class<?>... deps) {
        factories.put(type, factory);
        if (deps.length > 0) {
            dependencies.put(type, ConcurrentHashMap.newKeySet());
            dependencies.get(type).addAll(Arrays.asList(deps));
        }
    }
    
    /**
     * Get or create a singleton instance.
     * 
     * Thread-safety: ConcurrentHashMap guarantees that computeIfAbsent
     * runs the factory at most once per key. BUT we can't use computeIfAbsent
     * for recursive lookups (would deadlock on same segment in Java 8).
     * 
     * Solution: Double-check locking with explicit synchronization.
     */
    @SuppressWarnings("unchecked")
    public <T> T get(Class<T> type) {
        // Fast path: already created
        Object existing = instances.get(type);
        if (existing != null) return (T) existing;
        
        // Slow path: create with circular dependency detection
        Set<Class<?>> stack = creationStack.get();
        if (stack.contains(type)) {
            throw new IllegalStateException(
                "Circular dependency detected: " + stack + " → " + type.getSimpleName());
        }
        
        stack.add(type);
        try {
            // DCL: synchronized on the type's Class object
            synchronized (type) {
                existing = instances.get(type);
                if (existing != null) return (T) existing;
                
                ServiceFactory<?> factory = factories.get(type);
                if (factory == null) {
                    throw new IllegalArgumentException("No factory registered for " + type.getSimpleName());
                }
                
                T instance = (T) factory.create(this);
                instances.put(type, instance);
                creationOrder.add(type);
                
                // Start if it's a Service
                if (instance instanceof Service) {
                    ((Service) instance).start();
                }
                
                return instance;
            }
        } finally {
            stack.remove(type);
        }
    }
    
    /**
     * Shutdown all services in reverse-dependency order.
     * Services that no one depends on shut down first.
     * Uses topological sort (reverse).
     */
    public void shutdown() {
        // Build reverse topo order using Kahn's algorithm
        Map<Class<?>, Integer> inDegree = new HashMap<>();
        Map<Class<?>, Set<Class<?>>> reverseDeps = new HashMap<>(); // dependency → dependents
        
        for (Class<?> type : creationOrder) {
            inDegree.putIfAbsent(type, 0);
            Set<Class<?>> deps = dependencies.getOrDefault(type, Collections.emptySet());
            for (Class<?> dep : deps) {
                reverseDeps.computeIfAbsent(dep, k -> new HashSet<>()).add(type);
                inDegree.merge(type, 1, Integer::sum);
            }
        }
        
        // Kahn's — start with nodes that have no dependencies
        Queue<Class<?>> queue = new LinkedList<>();
        for (var entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) queue.add(entry.getKey());
        }
        
        List<Class<?>> shutdownOrder = new ArrayList<>();
        while (!queue.isEmpty()) {
            Class<?> type = queue.poll();
            shutdownOrder.add(type);
            
            for (Class<?> dependent : reverseDeps.getOrDefault(type, Collections.emptySet())) {
                int newDegree = inDegree.merge(dependent, -1, Integer::sum);
                if (newDegree == 0) queue.add(dependent);
            }
        }
        
        // Reverse: shut down dependents first, then dependencies
        Collections.reverse(shutdownOrder);
        
        for (Class<?> type : shutdownOrder) {
            Object instance = instances.get(type);
            if (instance instanceof Service) {
                try {
                    ((Service) instance).stop();
                } catch (Exception e) {
                    System.err.println("Error stopping " + type.getSimpleName() + ": " + e.getMessage());
                }
            }
        }
        
        instances.clear();
        creationOrder.clear();
    }
    
    public int size() { return instances.size(); }
    
    public boolean isCreated(Class<?> type) { return instances.containsKey(type); }
}
```

---

## 🎯 Key Takeaways
- Apple ICT3 = **Thread-safe singleton registry with dependency injection and lifecycle**
- **Why not `computeIfAbsent`?** Java 8 ConcurrentHashMap deadlocks if factory calls `computeIfAbsent` on same map (recursive lookup)
- **DCL pattern**: double-checked locking — fast path unlocked, slow path `synchronized(type)` — uses Class object as lock (globally unique)
- **ThreadLocal creation stack**: detects circular dependencies per-thread — no global lock needed
- **Topological shutdown**: Kahn's algorithm → reverse for proper shutdown order (dependents stop before dependencies)
- **Error isolation in shutdown**: catch per-service, continue shutting down others
- Apple = **infrastructure + systems** — expect concurrency, lifecycle management, clean API design

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Coding |
| Coding 1 | Hard | Trees |
| Coding 2 (this) | Very Hard | Concurrency, DI, Lifecycle |
| System Design | Very Hard | ML Feature Store |
| Behavioral | Medium | Apple Culture |
