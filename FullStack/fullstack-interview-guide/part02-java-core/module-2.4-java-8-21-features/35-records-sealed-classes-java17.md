# Records, Sealed Classes (Java 17+)
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> **🆕 Active gap — these are increasingly asked at Senior level.** Read this before any interview.

- **Records** (Java 16 stable): immutable data carriers. `record Point(int x, int y) {}` — auto-generates constructor, getters, `equals()`, `hashCode()`, `toString()`. No boilerplate.
- Records are **implicitly final** (can't extend), extend `java.lang.Record`, and fields are `private final`. You cannot add mutable fields, but you CAN add static fields, methods, and implement interfaces.
- **Compact constructor** in a record: `record User(String name, int age) { User { /* validate */ } }` — implicit `this.name = name` assignment happens AFTER the compact body.
- **Sealed classes** (Java 17 stable): restrict which classes can extend/implement them. `sealed class Shape permits Circle, Rectangle, Triangle {}`. Closed hierarchy.
- Permitted subclasses must be in the same package and are implicitly final (or themselves sealed/non-sealed). They can't be subclassed further unless declared `non-sealed`.
- Sealed classes + Records + **Pattern Matching switch** (Java 21) = exhaustive type-safe algebraic types. The compiler enforces you handle every permitted variant.

---

## 1. One-Line Definition

**Records**: a compact, immutable class variant that auto-generates boilerplate (constructor, getters, equals/hashCode/toString) for data-carrier objects.

**Sealed classes**: a class/interface modifier that explicitly restricts which classes can extend it, enabling closed type hierarchies where every possible variant is known at compile time.

---

## 2. The Problem They Solve

### Records — End of Boilerplate Data Classes

Before Java 16, a simple immutable data class required:
```java
public final class Point {
    private final int x;
    private final int y;
    public Point(int x, int y) { this.x = x; this.y = y; }
    public int x() { return x; }
    public int y() { return y; }
    @Override public boolean equals(Object o) { ... }
    @Override public int hashCode() { ... }
    @Override public String toString() { ... }
}
```
20+ lines for two fields. Lombok helped, but added a build dependency. Records built this into the language — zero external dependency.

### Sealed Classes — Safe Closed Hierarchies

Before sealed classes, if you had `Shape` with subclasses `Circle`, `Rectangle`, `Triangle`, someone could always add a 4th subclass in another package. Your switch statement:
```java
if (shape instanceof Circle c) { ... }
else if (shape instanceof Rectangle r) { ... }
// What if a 4th subclass arrives? Silent fall-through. No compiler warning.
```

Sealed classes make the hierarchy explicitly closed. The compiler knows exactly which variants exist. Combined with pattern matching switch (Java 21), it enforces you handle all variants — compiler error if you miss one.

---

## 3. How It Works Internally

### Records — What the Compiler Generates

```java
record User(String name, int age) {}

// Compiler generates exactly this:
final class User extends java.lang.Record {
    private final String name;
    private final int age;

    public User(String name, int age) {        // canonical constructor
        this.name = name;
        this.age = age;
    }

    public String name()  { return name; }     // accessor (NOT "getName()")
    public int age()      { return age; }

    @Override public boolean equals(Object o) {
        // checks class type, then compares all record components
    }
    @Override public int hashCode() {
        // based on all record components
    }
    @Override public String toString() {
        // "User[name=Hruday, age=30]"
    }
}

// Note: accessor is name(), not getName(). This is a convention break from Java Beans.
// Jackson and Spring handle this — @JsonProperty or Jackson 2.12+ with module.
```

**Customising Records:**
```
Canonical constructor allowed (with validation):
  record User(String name, int age) {
      User {                              // compact constructor — no param list
          if (name == null) throw new IllegalArgumentException();
          if (age < 0) throw new IllegalArgumentException();
          name = name.trim();             // can transform parameters here
          // implicit this.name = name; this.age = age; happens AFTER this block
      }
  }

Can add: static fields, static methods, instance methods
Cannot add: mutable instance fields, additional constructors that aren't the canonical,
            extends clause (records always extend Record), setters
Can implement: interfaces

Custom accessor override:
  record Password(String value) {
      @Override public String value() {
          return "***";                   // hide sensitive data in accessor
      }
  }
```

### Sealed Classes — Mechanism

```java
// Sealing the hierarchy:
public abstract sealed class Shape permits Circle, Rectangle, Triangle {}

// Each permitted class must be in the same package (or nest).
// Each must declare one of: final, sealed, non-sealed.

public record Circle(double radius) implements Shape {}   // record + sealed = compact
public record Rectangle(double w, double h) implements Shape {}
public final class Triangle extends Shape {
    private final double base, height;
    // ...
}

// non-sealed: allows FURTHER extension of Rectangle:
// public non-sealed class Rectangle extends Shape {} // removes sealing for this branch

// Shape itself cannot be extended outside: Circle, Rectangle, Triangle.
// Compiler knows the complete set.
```

**Pattern Matching Switch (Java 21 — why sealed matters):**
```java
double area(Shape shape) {
    return switch (shape) {
        case Circle    c -> Math.PI * c.radius() * c.radius();
        case Rectangle r -> r.w() * r.h();
        case Triangle  t -> 0.5 * t.base() * t.height();
        // NO default needed — compiler knows Shape has exactly 3 subtypes
        // If you add a 4th subtype to the sealed hierarchy, THIS SWITCH
        // becomes a compile error until you add a case for it.
    };
}
// This is algebraic data type pattern — closed set + exhaustive matching.
// Same as Haskell/Scala sum types. Java 17-21 brings this to the JVM.
```

### ASCII Diagram

```
RECORD — BEFORE AND AFTER:

  Before (20 lines):                   After (1 line):
  final class Point {                  record Point(int x, int y) {}
    private final int x, y;
    public Point(int x, int y) { ... } Auto-generated:
    public int x() { ... }             ✓ Canonical constructor
    public int y() { ... }             ✓ Accessors: x(), y()
    equals(), hashCode(), toString()   ✓ equals() + hashCode() + toString()
  }                                    ✓ final, extends Record

SEALED CLASS — CLOSED HIERARCHY:

  sealed Shape permits Circle,  ←── compiler knows ALL subtypes
      Rectangle, Triangle

  Circle ──────┐
  Rectangle ───┤ Pattern matching switch: compiler ENFORCES all cases covered
  Triangle ────┘ Add a 4th subtype → all switches become compile errors (good!)

  BEFORE SEALED:                Open hierarchy
  abstract class Shape          Anyone can extend → switch has potential gaps

  AFTER SEALED:                 Closed hierarchy
  sealed class Shape permits    Compiler checks completeness (Java 21+)
```

---

## 4. The Code

### Wrong Way — Common Mistakes
```java
// WRONG 1: Trying to extend a record
record User(String name) {}
class AdminUser extends User { }          // COMPILE ERROR: records are final

// WRONG 2: Jackson ignoring record accessors (pre-module setup)
// Record accessors are name(), age() — NOT getName(), getAge().
// Old Jackson doesn't know these are getters. Solution: register Java 17 module.
ObjectMapper mapper = new ObjectMapper();
// Missing: mapper.registerModule(new JavaRecordModule());
// Without it: User{name='null', age=0} on deserialisation.

// WRONG 3: Using record for mutable data that changes over time
record Order(String id, String status) {}
// Order's status changes (PENDING → PROCESSING → DELIVERED).
// A record is the wrong type — status is a mutable field.
// Use a mutable class or builder-pattern class for entities that mutate.

// WRONG 4: Sealed class without permits clause
sealed class Result {}    // COMPILE ERROR: sealed class needs a permits clause
                          // OR: all subclasses must be in the same compilation unit

// WRONG 5: Using instanceof chain instead of pattern matching with sealed
// Old way — misses completeness guarantee:
if (shape instanceof Circle c) { ... }
else if (shape instanceof Rectangle r) { ... }
// If a Triangle is added to sealed Shape, this compiles fine but silently misses Triangle.
// Use switch with pattern matching instead for the exhaustiveness guarantee.
```

### Right Way — Records and Sealed Classes in Production
```java
// CORRECT 1: Records as API request/response DTOs
public record CreateOrderRequest(
    @NotBlank String userId,
    @NotEmpty List<String> itemIds,
    @NotNull @Positive BigDecimal totalAmount
) {}

public record OrderResponse(
    String orderId,
    String status,
    BigDecimal amount,
    Instant createdAt
) {}

// Spring controller — clean and concise:
@PostMapping("/orders")
public ResponseEntity<OrderResponse> createOrder(
    @Valid @RequestBody CreateOrderRequest request) {
    Order order = orderService.create(request);
    return ResponseEntity.ok(new OrderResponse(
        order.getId(), order.getStatus().name(),
        order.getAmount(), order.getCreatedAt()));
}

// CORRECT 2: Record with compact constructor validation
public record Money(BigDecimal amount, Currency currency) {
    Money {
        Objects.requireNonNull(amount, "amount required");
        Objects.requireNonNull(currency, "currency required");
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("amount must be non-negative");
        }
        amount = amount.setScale(2, RoundingMode.HALF_UP);  // normalise scale
        // After compact constructor: this.amount = amount; this.currency = currency;
    }
}

// CORRECT 3: Records implementing interfaces
public interface Identifiable {
    String getId();
}
public record ProductDTO(String id, String name, BigDecimal price) implements Identifiable {
    @Override
    public String getId() { return id; }  // explicit override — accessor is id()
}

// CORRECT 4: Sealed hierarchy for API result types
public sealed interface ApiResult<T> permits ApiResult.Success, ApiResult.Failure {
    record Success<T>(T data) implements ApiResult<T> {}
    record Failure<T>(String errorCode, String message) implements ApiResult<T> {}
}

// Usage — exhaustive switch, no default needed:
ApiResult<User> result = userService.findUser(id);
String response = switch (result) {
    case ApiResult.Success<User> s -> "User: " + s.data().name();
    case ApiResult.Failure<User> f -> "Error: " + f.errorCode() + " - " + f.message();
};

// CORRECT 5: Sealed hierarchy for domain events
public sealed class OrderEvent permits
    OrderEvent.Created, OrderEvent.Shipped, OrderEvent.Delivered, OrderEvent.Cancelled {}

public record OrderEvent.Created(String orderId, Instant timestamp)   extends OrderEvent {}
public record OrderEvent.Shipped(String orderId, String trackingCode) extends OrderEvent {}
public record OrderEvent.Delivered(String orderId, Instant at)        extends OrderEvent {}
public record OrderEvent.Cancelled(String orderId, String reason)     extends OrderEvent {}

// Kafka consumer — compiler forces all event types handled:
void handleEvent(OrderEvent event) {
    switch (event) {
        case OrderEvent.Created   e -> orderCreatedHandler.handle(e);
        case OrderEvent.Shipped   e -> shipmentHandler.handle(e);
        case OrderEvent.Delivered e -> deliveryHandler.handle(e);
        case OrderEvent.Cancelled e -> cancellationHandler.handle(e);
        // Add a 5th event type → this switch becomes a compile error automatically
    }
}

// CORRECT 6: Jackson with records (Spring Boot 2.7+)
// Spring Boot auto-configures Jackson with record support.
// For custom ObjectMapper, register the module:
@Bean
public ObjectMapper objectMapper() {
    return new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .registerModule(new JavaRecordModule())   // Java 17 record support
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a Java record and what does it auto-generate?"

**Hruday's answer:**
> A Java record (stable since Java 16) is a compact class declaration for immutable data carriers. You declare `record Point(int x, int y) {}` and the compiler auto-generates everything you'd otherwise write by hand: a canonical constructor, accessor methods (`x()` and `y()`, not `getX()` and `getY()`), and proper implementations of `equals()`, `hashCode()`, and `toString()`.
>
> Records are implicitly `final` — you can't extend them. They always extend `java.lang.Record`. All components are `private final`. You can't add mutable fields, but you can add static fields, static methods, and instance methods. You can also implement interfaces.
>
> You can customise a record in a few ways: the compact constructor (validate or transform components on creation), custom accessor overrides (e.g., mask a sensitive field in `value()`), and additional factory methods.
>
> The main use case: DTOs, value objects, request/response types, event payloads — anything that's a structured blob of data that shouldn't mutate. Records replace Lombok's `@Value` without a build tool dependency.

---

### Q2 — Sealed Classes Deep Dive
**Interviewer asks:** "What are sealed classes and why would you use them over a regular abstract class?"

**Hruday's answer:**
> A sealed class restricts which classes can extend it. You declare the permitted subclasses explicitly with the `permits` clause. Only those named classes can extend the sealed class. Everyone else gets a compile error.
>
> The key benefit over a regular abstract class: **exhaustiveness**. When the hierarchy is sealed, the compiler knows exactly which subtypes exist. In a Java 21 `switch` with pattern matching:
> ```java
> switch (shape) {
>     case Circle c    -> ...
>     case Rectangle r -> ...
>     case Triangle t  -> ...
>     // No default needed — sealed class proves these are ALL types.
>     // If you add a 4th type to the sealed hierarchy, this switch is a compile error.
> }
> ```
> With a regular abstract class, the switch would need a `default` case because anyone can add a new subclass. That `default` silently swallows unknown subtypes. With sealed, you get a compile-time completeness guarantee.
>
> I use sealed classes for: domain event hierarchies (every event type is known), API result types (Success/Failure/Partial), state machine states, command variants in CQRS. It's the Java way to model algebraic sum types (like Haskell's `Either` or Rust's `enum`).

---

### Q3 — Practical Use
**Interviewer asks:** "How would you use records and sealed classes together to model an API response?"

**Hruday's answer:**
> This is exactly the `ApiResult<T>` pattern I use in production:
>
> ```java
> sealed interface ApiResult<T> permits ApiResult.Success, ApiResult.Failure {
>     record Success<T>(T data, HttpStatus status) implements ApiResult<T> {}
>     record Failure<T>(String errorCode, String message, HttpStatus status)
>         implements ApiResult<T> {}
> }
> ```
>
> The service returns `ApiResult<User>` instead of throwing exceptions for expected failure conditions. The caller gets a sealed type — the only two possibilities are `Success` or `Failure`. Pattern matching switch makes handling exhaustive:
> ```java
> return switch (userService.find(id)) {
>     case ApiResult.Success<User> ok -> ResponseEntity.status(ok.status()).body(ok.data());
>     case ApiResult.Failure<User> f  -> ResponseEntity.status(f.status())
>                                            .body(Map.of("error", f.errorCode(),
>                                                         "message", f.message()));
> };
> ```
>
> Benefits over throwing exceptions for flow control:
> - The return type makes the failure path explicit in the API contract.
> - The caller cannot ignore the failure case without the compiler complaining.
> - No exception overhead for expected outcomes (not-found, validation failure).
> - Clean for chaining: `result.flatMap(user -> anotherOperation(user))`.
>
> This is the Railway Oriented Programming pattern — errors are values in the type system, not exceptional control flow.

---

### Q4 — Gotcha Question
**Interviewer asks:** "Are Java records completely equivalent to Lombok's @Value? What are the differences?"

**Hruday's answer:**
> Similar in spirit but with key differences:
>
> **What they share**: immutability (final class, final fields), auto-generated equals/hashCode/toString, constructor from all fields, no setters.
>
> **What records have that @Value doesn't**: compiler-enforced — no annotation processing, no build dependency. Records have first-class language semantics, enabling pattern matching in instanceof and switch. Compact constructor with parameter transformation. Part of the sealed class system.
>
> **What @Value has that records don't**:
> - @Value generates getter names as `getName()` following Java Beans convention. Records use `name()`. This matters for JPA entities (Spring Data often expects `getName()`) and older Jackson without record support.
> - @Value can work with `@Builder` from Lombok — records don't have a builder out of the box (you can add a static factory method or a separate `Builder` inner class, but it's manual).
> - @Value works with JPA `@Entity` — records don't. JPA entities need a no-arg constructor and mutable fields. Records can't be JPA entities.
>
> **Practical guidance**: for DTOs, API request/response types, event payloads, value objects — use records. For JPA entities, mutable domain models, anything needing a builder — use regular classes (with or without Lombok @Builder).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Records replace all data classes" | "I'll use records everywhere." | "Records are for immutable data carriers — DTOs, value objects, events. Not for JPA entities (need no-arg constructor, mutable fields), not for objects with complex state transitions." |
| "Record accessors follow JavaBeans" | "record User(String name) {} → getName() accessor." | "Record accessor is name(), not getName(). Jackson needs a module (JavaRecordModule) or explicit @JsonProperty to handle this correctly in older setups." |
| "Sealed class = final class" | "Sealed means nothing can extend it." | "Sealed means only PERMITTED classes can extend it. Those classes can themselves be final, sealed, or non-sealed. non-sealed allows further extension from that point in the hierarchy." |
| "Pattern matching switch needs default" | "I have to add a default case." | "With a sealed type, the compiler knows all subtypes. If your switch covers all permitted subclasses, no default is needed — and the compiler enforces completeness. Add a 4th subtype → compile error until you add the case." |

---

## 7. Hruday's Real Experience Hook

> "At SAP, we had a notification dispatch system that sent messages through multiple channels: email, SMS, push notification, Slack. The original design: abstract `NotificationChannel` with subclasses scattered across packages. When a new WhatsApp channel came in, a developer added it but missed updating a switch statement in the dispatch router. The bug was silent — WhatsApp notifications simply weren't sent. No compile error, no runtime exception. It only surfaced in production monitoring days later.
>
> I refactored using a sealed hierarchy:
> ```java
> sealed abstract class NotificationChannel
>     permits EmailChannel, SmsChannel, PushChannel, SlackChannel {}
> ```
> The dispatch router used a pattern matching switch. When WhatsApp was added as a permitted subclass, the dispatch router immediately became a compile error — forcing the developer to add the WhatsApp dispatch logic. The bug category was eliminated at the language level.
>
> The lesson: sealed classes aren't just about preventing accidental subclassing. They're about making incomplete handling of type variants a compile error, not a runtime bug."

---

## 8. Scale Evolution

**Junior engineer →** Doesn't know records exist. Writes 20-line data classes or uses Lombok everywhere.

**Mid-level engineer →** Uses records for DTOs. Knows they're immutable and auto-generate boilerplate. Hasn't explored sealed classes.

**Senior engineer →** Uses records for DTOs, value objects, event payloads. Uses sealed classes for closed hierarchies (event types, result types, state variants). Knows the Java 21 pattern matching switch with sealed types.

**Staff engineer →** Designs domain models using records + sealed classes + pattern matching as algebraic data types. Evaluates Valhalla project (Java value types, future evolution of records to stack-allocated inline types). Uses `SequencedCollection` (Java 21) and other recent JDK evolution that builds on record + pattern concepts.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment event types (PaymentInitiated, PaymentCompleted, PaymentFailed) — sealed class models domain events exhaustively | "You used sealed + records for the payment event hierarchy. That's exactly the modern Java idiom." |
| Swiggy / Meesho | Order state transitions — sealed class of states + pattern matching switch for state machine logic | "You explained why the sealed class catches missing cases at compile time. Real architectural thinking." |
| Adobe / SAP | API SDK evolution — records as stable API DTOs, sealed for closed type hierarchies in SDKs | "You contrasted records with Lombok @Value and JPA entities. Shows depth beyond basic 'records are like @Value'." |
| Google / Amazon | SDE-2 Java depth — Java 17 features are now standard senior-level knowledge | "Explain the difference between sealed, final, and non-sealed permitted subclass declarations." |

---

## 10. Related Topics — What to Study Next

- **Dependency Injection (Topic 36)** — First topic of Part 3: Spring Boot. Starts the Spring deep dive.
- **Spring Boot REST (Part 3)** — Records are the modern DTO type in Spring Boot 3.x controllers.
- **Kafka Messaging (Part 6)** — Sealed record-based event types make Kafka event handling exhaustive and safe.

---

*Part 2 · Records, Sealed Classes (Java 17+) · Full Stack Interview Guide · Hruday D · 2026*
