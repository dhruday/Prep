# Streams API — filter, map, reduce, collectors
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- The Streams API (Java 8) processes sequences of data declaratively — you describe WHAT to do, not HOW to iterate.
- **Three phases:** source → intermediate operations → terminal operation. No work happens until the terminal operation is called (lazy evaluation).
- **Key intermediate ops:** `filter()` (keep matching), `map()` (transform each), `flatMap()` (one element → many), `sorted()`, `distinct()`, `limit()`, `peek()`.
- **Key terminal ops:** `collect()`, `forEach()`, `reduce()`, `count()`, `findFirst()`, `anyMatch()`, `allMatch()`, `toList()` (Java 16+).
- **Collectors:** `toList()`, `toSet()`, `toMap()`, `groupingBy()`, `partitioningBy()`, `joining()`, `counting()`, `summingInt()`, `summarizingInt()`.
- Streams are **single-use** — cannot be reused after a terminal operation is called.
- `parallelStream()` uses `ForkJoinPool.commonPool()` — same risks as CompletableFuture without a custom executor. Good for CPU-bound large datasets, bad for IO-bound work.

---

## 1. One-Line Definition
The Streams API is a pipeline-based abstraction for processing sequences of elements — filter, transform, aggregate — using a declarative, composable, lazily-evaluated chain of operations that eliminates explicit iteration loops.

---

## 2. The Problem It Solves

Before Java 8, processing a list of orders to find the top 5 highest-value orders for a specific user required verbose loop-and-if code:

```java
// Pre-Java 8:
List<Order> result = new ArrayList<>();
for (Order order : orders) {
    if (order.getUserId().equals(userId) && order.isActive()) {
        result.add(order);
    }
}
Collections.sort(result, (a, b) -> b.getValue().compareTo(a.getValue()));
List<Order> top5 = result.subList(0, Math.min(5, result.size()));
```

This is five lines of boilerplate that obscures the intent. The Streams API makes the intent clear in one expression:

```java
orders.stream()
    .filter(o -> o.getUserId().equals(userId) && o.isActive())
    .sorted(Comparator.comparingDouble(Order::getValue).reversed())
    .limit(5)
    .collect(Collectors.toList());
```

Beyond readability, Streams solve three additional problems:
1. **Lazy evaluation** — intermediate operations don't execute until a terminal operation is called. If `limit(5)` stops the pipeline after finding 5 matches, the rest of the source is never processed.
2. **Parallel processing** — swap `stream()` to `parallelStream()` and the work is split across CPU cores via ForkJoinPool. Zero code change.
3. **Composable data transformations** — groupings, aggregations, statistics — all expressible without nested loops and temporary lists.

---

## 3. How It Works Internally

### The Mental Model
A factory production line. Raw materials (source) enter on a conveyor belt. Each station on the belt either filters items (removes ones that don't pass), transforms them, or sorts them. At the end of the belt, a collection bin (terminal operation) gathers the final output. The belt doesn't move until the bin is ready to receive. That's lazy evaluation.

### The Mechanism

```
STREAM PIPELINE:

  Source → [Intermediate Ops] → Terminal Op
                                     │
                          Pipeline executes here
                           (lazy — not before)

Sources:
  collection.stream()
  collection.parallelStream()
  Stream.of(a, b, c)
  IntStream.range(0, 100)
  Files.lines(path)
  Stream.generate(() -> value)

Intermediate operations (lazy — return a new Stream):
  filter(Predicate<T>)        → keep elements matching predicate
  map(Function<T,R>)          → transform each element T → R
  flatMap(Function<T,Stream<R>>) → one element → zero/many elements, then flatten
  sorted(Comparator<T>)       → sort (stateful — buffers full stream to sort)
  distinct()                  → deduplicate (stateful)
  limit(n)                    → stop after n elements (short-circuit)
  skip(n)                     → skip first n elements
  peek(Consumer<T>)           → observe without transforming (debugging)

Terminal operations (eager — trigger pipeline execution):
  collect(Collector<T,A,R>)   → accumulate into a collection or value
  forEach(Consumer<T>)        → consume each element (no return)
  reduce(identity, BinaryOp)  → fold to a single value
  count()                     → count elements
  findFirst()                 → first element as Optional<T> (short-circuit)
  anyMatch(Predicate<T>)      → true if any match (short-circuit)
  allMatch(Predicate<T>)      → true if all match
  noneMatch(Predicate<T>)     → true if none match
  toList()                    → Java 16+ shorthand for collect(Collectors.toList())
  min(Comparator<T>)          → Optional<T>
  max(Comparator<T>)          → Optional<T>

Lazy evaluation — what actually happens:
  No intermediate operation creates a new list.
  Instead: each element from the source travels down the pipeline one by one.
  filter allows or blocks it. map transforms it. limit counts and stops.
  Memory: O(1) for pipeline traversal (not O(n) for each stage).
  Exception: stateful ops (sorted, distinct) must buffer — O(n) memory.
```

### Key Collectors

```java
Collectors.toList()               // mutable List
Collectors.toUnmodifiableList()   // unmodifiable List
Collectors.toSet()
Collectors.toMap(keyFn, valueFn)
Collectors.toMap(keyFn, valueFn, mergeFunction)  // handle duplicate keys

Collectors.groupingBy(classifier)         // Map<K, List<T>>
Collectors.groupingBy(classifier, downstream)  // Map<K, R> with downstream collector
Collectors.partitioningBy(predicate)      // Map<Boolean, List<T>>

Collectors.joining(delimiter)             // String
Collectors.joining(delimiter, prefix, suffix)

Collectors.counting()             // Long
Collectors.summingInt(fn)         // int sum
Collectors.averagingInt(fn)       // Double
Collectors.summarizingInt(fn)     // IntSummaryStatistics (count + sum + min + max + avg)

Collectors.collectingAndThen(downstream, finisher)  // transform result of another collector
```

### ASCII Diagram

```
LAZY STREAM PIPELINE — element travels through:

  Source: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  Pipeline: .filter(x > 3) .map(x * 2) .limit(3) .collect(toList())

  Element 1: filter(1 > 3) → REJECTED (never reaches map)
  Element 2: filter(2 > 3) → REJECTED
  Element 3: filter(3 > 3) → REJECTED
  Element 4: filter(4 > 3) → PASS → map(4*2=8) → count=1 → collect [8]
  Element 5: filter(5 > 3) → PASS → map(5*2=10) → count=2 → collect [8,10]
  Element 6: filter(6 > 3) → PASS → map(6*2=12) → count=3 → collect [8,10,12]
  limit(3) reached → STOP. Elements 7-10 never evaluated.

  Result: [8, 10, 12]

KEY INSIGHT: The source has 10 elements, but only 6 were evaluated.
limit() causes early termination — elements 7-10 were never processed.
This is why lazy evaluation + short-circuit operations can be significantly
more efficient than eager evaluation with intermediate lists.
```

---

## 4. The Code

### Wrong Way — Common Stream Mistakes
```java
// WRONG 1: Reusing a stream after terminal operation
Stream<Order> stream = orders.stream().filter(Order::isActive);
long count = stream.count();       // terminal op — stream is now "consumed"
List<Order> list = stream.collect(Collectors.toList());  // IllegalStateException: stream already operated upon

// WRONG 2: Using peek() for business logic instead of debugging
// peek() is for debugging/logging only — not guaranteed to execute for all elements
// (short-circuit operations can skip it)
orders.stream()
    .peek(order -> order.setStatus("PROCESSED"))   // WRONG: side-effectful peek
    .filter(Order::isActive)
    .collect(Collectors.toList());
// Use forEach() if you need side effects at the end. Or map() to transform.

// WRONG 3: Calling collect() to check size when count() is enough
int count = orders.stream()
    .filter(Order::isActive)
    .collect(Collectors.toList())   // materialises a full list
    .size();                         // discards the list immediately
// Use .count() instead — no materialisation needed.

// WRONG 4: toMap() with duplicate keys → unchecked IllegalStateException
Map<String, Order> orderMap = orders.stream()
    .collect(Collectors.toMap(Order::getUserId, o -> o));
// If two orders have the same userId → IllegalStateException: Duplicate key
// Fix: provide a merge function for duplicates.

// WRONG 5: Using parallelStream() on small collections or IO-bound work
IntStream.range(0, 100).parallel()
    .map(i -> httpClient.get("http://api/" + i))   // HTTP call inside parallel stream
    .collect(Collectors.toList());
// parallelStream uses ForkJoinPool.commonPool (limited threads, shared JVM-wide).
// IO-bound work blocks those threads. Worse than sequential for IO.
// parallelStream is good ONLY for CPU-bound work on LARGE datasets.
```

### Right Way — Production-Quality Stream Usage
```java
// CORRECT 1: Basic filter + map + collect
List<String> activeUserNames = users.stream()
    .filter(User::isActive)
    .filter(user -> user.getRole() == Role.CUSTOMER)
    .map(User::getFullName)
    .sorted()
    .collect(Collectors.toList());   // or .toList() in Java 16+

// CORRECT 2: groupingBy — group orders by status
Map<OrderStatus, List<Order>> byStatus = orders.stream()
    .collect(Collectors.groupingBy(Order::getStatus));
// Result: { PENDING=[...], SHIPPED=[...], DELIVERED=[...] }

// groupingBy with downstream collector — count per status:
Map<OrderStatus, Long> countByStatus = orders.stream()
    .collect(Collectors.groupingBy(Order::getStatus, Collectors.counting()));
// Result: { PENDING=45, SHIPPED=12, DELIVERED=200 }

// CORRECT 3: toMap with merge function for duplicates
Map<String, Order> latestOrderByUser = orders.stream()
    .collect(Collectors.toMap(
        Order::getUserId,
        order -> order,
        (existing, replacement) ->           // merge: keep latest by createdAt
            existing.getCreatedAt().isAfter(replacement.getCreatedAt()) ? existing : replacement
    ));

// CORRECT 4: flatMap — orders have multiple items; get all item IDs
List<String> allItemIds = orders.stream()
    .flatMap(order -> order.getItems().stream())    // Order → Stream<Item>
    .map(Item::getId)
    .distinct()
    .collect(Collectors.toList());

// CORRECT 5: reduce — compute total order value
BigDecimal total = orders.stream()
    .filter(Order::isActive)
    .map(Order::getValue)
    .reduce(BigDecimal.ZERO, BigDecimal::add);

// CORRECT 6: partitioningBy — split active/inactive
Map<Boolean, List<User>> partitioned = users.stream()
    .collect(Collectors.partitioningBy(User::isActive));
List<User> active   = partitioned.get(true);
List<User> inactive = partitioned.get(false);

// CORRECT 7: joining — CSV output
String csv = users.stream()
    .map(User::getEmail)
    .collect(Collectors.joining(", ", "[", "]"));
// "[alice@x.com, bob@y.com, carol@z.com]"

// CORRECT 8: summarizingInt — multiple stats in one pass
IntSummaryStatistics stats = orders.stream()
    .collect(Collectors.summarizingInt(order -> order.getItemCount()));
// stats.getCount(), stats.getSum(), stats.getMin(), stats.getMax(), stats.getAverage()

// CORRECT 9: Proper parallel stream — CPU-bound, large dataset
long primeCount = LongStream.rangeClosed(2, 1_000_000)
    .parallel()                              // uses all CPU cores
    .filter(FullStackService::isPrime)       // CPU-bound computation, not IO
    .count();

// CORRECT 10: Avoiding method reference vs lambda confusion
// These are equivalent, but method references are preferred for clarity:
.map(user -> user.getName())    // lambda
.map(User::getName)              // method reference — preferred
.filter(user -> user.isActive()) // lambda
.filter(User::isActive)          // method reference — preferred
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is lazy evaluation in Java streams and why does it matter?"

**Hruday's answer:**
> Lazy evaluation means intermediate operations in a stream pipeline — `filter`, `map`, `sorted` — don't execute until a terminal operation is called. When you write:
> ```java
> stream.filter(x -> x > 3).map(x -> x * 2).limit(3)
> ```
> Nothing happens yet. You've built a pipeline description. When you call `collect()` or `count()` or any terminal operation, that's when the engine starts pulling elements through the pipeline.
>
> Why it matters: **short-circuit operations** can stop processing early. `limit(3)` stops the pipeline after collecting 3 elements — elements beyond that are never evaluated by `filter` or `map`. `findFirst()` stops as soon as it finds the first match. On a stream of 10 million records where you want the first match, this is the difference between 10 million operations and 1 operation (in the best case).
>
> Lazy evaluation also means **no intermediate materialisation** — no temporary `ArrayList` is created between `filter` and `map`. Each element travels through the pipeline individually. Memory stays bounded.
>
> One gotcha: stateful operations like `sorted()` and `distinct()` break this because they must see ALL elements before they can produce the first output. If your pipeline ends in `collect()` after a `sorted()`, the sorted stage buffers the entire stream.

---

### Q2 — Code Challenge
**Interviewer asks:** "Given a list of orders, write stream code to group them by userId and compute the total value per user."

**Hruday's answer:**
> ```java
> Map<String, BigDecimal> totalValuePerUser = orders.stream()
>     .collect(Collectors.groupingBy(
>         Order::getUserId,                          // group by user ID
>         Collectors.mapping(Order::getValue,        // downstream: extract value
>             Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))  // then sum
>     ));
> ```
>
> Or more readably using toMap if ordering isn't required:
> ```java
> Map<String, BigDecimal> totalValuePerUser = orders.stream()
>     .collect(Collectors.toMap(
>         Order::getUserId,
>         Order::getValue,
>         BigDecimal::add                            // merge: sum values for same user
>     ));
> ```
>
> The second approach is cleaner for simple sum-per-key scenarios. The `groupingBy` + `reducing` approach is more flexible — you can use any downstream collector.
>
> In a production scenario I'd also handle null userId:
> ```java
> .filter(order -> order.getUserId() != null)
> .collect(...)
> ```

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When should you NOT use parallel streams?"

**Hruday's answer:**
> Parallel streams should be avoided in several situations:
>
> **Small collections** — the overhead of splitting the work, coordinating threads, and merging results is often larger than doing the work sequentially. Below roughly 10,000 elements, sequential streams are usually faster.
>
> **IO-bound operations** — database queries, HTTP calls, file reads inside a parallel stream — these block the ForkJoinPool.commonPool threads. With 7 threads (8-core machine) waiting on IO, you've saturated the pool, hurt system-wide parallel stream performance, and gained nothing. For IO-bound parallel work, use `CompletableFuture` with a dedicated executor instead.
>
> **Non-thread-safe operations** — if the intermediate operations have side effects or depend on non-thread-safe state, parallel streams cause race conditions. Accumulators like `ArrayList.add()` inside a parallel `forEach` are not thread-safe.
>
> **Order-sensitive operations** — `findFirst()` in a parallel stream might not return the actual first element of the original sequence. Use `findAny()` if order doesn't matter. `forEachOrdered()` restores order guarantee but removes parallelism benefits.
>
> **When ForkJoinPool.commonPool is shared** — in a web server, parallel streams compete with CompletableFuture async tasks and other framework code for the same commonPool threads. A burst of parallel stream usage can starve other work.
>
> Rule: use parallel streams only for CPU-bound processing of large datasets (>10k elements) where thread-safety is guaranteed and order doesn't matter.

---

### Q4 — Common Pitfall
**Interviewer asks:** "What happens if you call collect(Collectors.toMap()) and there are duplicate keys?"

**Hruday's answer:**
> It throws `IllegalStateException: Duplicate key [value]`. The default `toMap` collector doesn't know what to do when two elements produce the same key — should it keep the first, the second, or merge them? Rather than silently picking one, it throws.
>
> The fix: provide a merge function as the third argument:
> ```java
> // Keep first occurrence:
> .collect(Collectors.toMap(User::getId, u -> u, (first, second) -> first))
>
> // Keep last occurrence:
> .collect(Collectors.toMap(User::getId, u -> u, (first, second) -> second))
>
> // Merge them (e.g., collect all emails per ID — but return type changes):
> .collect(Collectors.toMap(
>     User::getId,
>     user -> new ArrayList<>(List.of(user.getEmail())),
>     (emails1, emails2) -> { emails1.addAll(emails2); return emails1; }
> ))
> ```
>
> Or restructure: if duplicates are possible and you want all of them, use `groupingBy` instead of `toMap`. `groupingBy` always produces `Map<Key, List<Value>>` and handles duplicates gracefully.
>
> In production code: I always ask "can this key be duplicated?" before using `toMap`. If yes, always provide a merge function. If unsure, use `groupingBy` and let the caller handle the list.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Streams as lazy lists | "Streams are like functional lists." | "Streams are pipelines, not containers. They don't hold data. They process it. Once consumed (terminal operation called), they're gone. You can't reuse a Stream." |
| peek() for side effects | "I use peek() to log and modify elements." | "peek() is for debugging only. It's not guaranteed to run for all elements when short-circuit ops are present. Use map() to transform or forEach() at the end for side effects." |
| parallelStream() is always faster | "parallelStream() uses all cores, so it's better." | "Parallel = better only for CPU-bound large datasets. For IO-bound or small data: sequential is often faster due to fork-join overhead. Measure before switching." |
| Collecting to check emptiness | "stream.collect(toList()).isEmpty()" | "stream.findAny().isEmpty() is correct. collect(toList()) materialises the whole stream. findAny() short-circuits on the first element. For presence check: always use findAny() or anyMatch()." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, I was asked to add a report feature to our product catalog API. The request: given a list of 50,000 products, group them by category, compute average price per category, and return the top 10 categories by average price. My first instinct was nested loops and multiple passes. My senior suggested streams.
>
> The one-pass stream solution:
> ```java
> products.stream()
>   .collect(Collectors.groupingBy(Product::getCategory,
>       Collectors.averagingDouble(Product::getPrice)))
>   .entrySet().stream()
>   .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
>   .limit(10)
>   .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue,
>       (a, b) -> a, LinkedHashMap::new));  // preserve insertion order
> ```
>
> What struck me: the intermediate `groupingBy + averagingDouble` was a single-pass aggregation over 50,000 elements. No intermediate `ArrayList`. My loop implementation had three lists and two nested iterations — 3x the memory and 2x the iterations.
>
> The lesson: Collectors.groupingBy with downstream collectors is powerful for aggregation. Most reporting use cases — group, count, sum, average — can be expressed as a single stream pipeline with the right collector combination."

---

## 8. Scale Evolution

**Junior engineer →** Knows `stream().filter().collect(toList())`. Writes loops when unsure. Doesn't know `reduce`, `groupingBy`, or parallel streams.

**Mid-level engineer →** Comfortable with all standard intermediate ops. Uses `groupingBy`, `toMap`. Understands lazy evaluation. Knows when not to use `parallelStream`.

**Senior engineer →** Writes multi-level groupingBy with downstream collectors. Uses `collectingAndThen` for post-processing. Understands the tradeoff between stream readability and performance for very large datasets.

**Staff engineer →** Knows when the Streams API is NOT the right choice: extremely large datasets (>100M elements) where Apache Spark or SQL is better; streaming data (Kafka) where reactive streams (Project Reactor, RxJava) give backpressure control; domain-specific aggregations where a plain loop is more readable than a complex collector chain.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction reporting — group by user, sum by category, filter by date range | "You used groupingBy with averagingDouble in one pass. No intermediate list. Shows you understand streams beyond filter+map." |
| Swiggy / Meesho | Order analytics — top items, delivery time percentiles, status distributions | "You explained why collect(toList()).isEmpty() is wrong. findAny() is the right pattern." |
| Adobe / SAP | Large document/product catalogs — batch processing, transformation pipelines | "You identified when parallelStream hurts (IO-bound). That's the mistake most engineers make." |
| Google / Amazon | Java coding rounds — almost always involve a stream/collection manipulation problem | "Implement groupingBy manually without using Collectors.groupingBy." |

---

## 10. Related Topics — What to Study Next

- **Optional (Topic 32)** — Next topic. `findFirst()`, `stream().filter().findFirst()` return `Optional<T>`. Understanding streams and Optional together is essential.
- **Lambda expressions (Topic 33)** — The function arguments you pass to `filter()`, `map()`, `reduce()` are lambdas. They rely on functional interfaces.
- **CompletableFuture (Topic 29)** — When streams need async processing per element, CompletableFuture + stream pipeline is the pattern.
- **Collections (Topic 18)** — Streams terminate into collections. Understanding `List`, `Set`, `Map` behaviour matters for choosing the right collector.

---

*Part 2 · Streams API — filter, map, reduce, collectors · Full Stack Interview Guide · Hruday D · 2026*
