# Interface vs Abstract Class — When to Use Which
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Use an **interface** when you want to define a contract — a set of methods that any class can promise to fulfil, regardless of what that class is.
- Use an **abstract class** when you want to share common code between related classes — some methods fully implemented, some left for subclasses to fill in.
- Key difference: a class can implement many interfaces but can only extend one abstract class. That's why interfaces are preferred for defining capability.
- Java 8+ added default and static methods to interfaces — so interfaces can now have working code too. The distinction is smaller, but the intent is still different.
- The interview answer: "Interface = contract for what something can do. Abstract class = base with shared code for related things."

---

## 1. One-Line Definition
An interface defines a contract — a list of methods any class can promised to implement. An abstract class defines a partial blueprint — shared code that related subclasses build on.

---

## 2. The Problem It Solves

A team is building a payment service. They have three payment methods: Credit Card, UPI, NetBanking. All three need to process a payment, validate details, and refund. The processing logic differs for each. The refund logic is identical.

Approach 1: Copy-paste the refund logic into all three classes. Three copies. When the refund logic changes — three places to update. One of them will be missed. A bug is born.

Approach 2: Create an abstract class `BasePayment` with the shared refund logic fully implemented. Declare `processPayment()` and `validateDetails()` as abstract — each subclass fills them in. No duplication. Shared behaviour in one place.

Now a second requirement: the same three payment classes must also work as a `Loggable` thing (write to an audit log) and as a `Retryable` thing (retry on failure). These are capabilities that could apply to any class — not just payment classes. A `NotificationService` could also be Loggable and Retryable.

You can't use abstract class for this — a class can only extend one abstract class. You'd have to choose: extend `BasePayment` or extend `BaseLoggable`. You can't do both.

Interface solves this: define `Loggable` and `Retryable` as interfaces. Any class can implement both. `CreditCardPayment` can extend `BasePayment` AND implement `Loggable` AND implement `Retryable`. No conflict.

This is the exact scenario that makes the interface vs abstract class choice matter in production.

---

## 3. How It Works Internally

### The Mental Model
An **interface** is a job description. It says: "Anyone who takes this job must be able to do these things." The job description doesn't tell you HOW to do them. It just guarantees that whoever holds the role can do them.

An **abstract class** is a starter kit for a specific family of things. It says: "These things are similar enough that they share this setup — but each one still needs to fill in its own specifics." The starter kit includes working code (the shared parts) and blank lines (the abstract methods each subclass must complete).

The deep difference: interfaces are about *capability*. Abstract classes are about *shared ancestry*.

### The Mechanism — Rules Side by Side

```
                    INTERFACE              ABSTRACT CLASS
────────────────────────────────────────────────────────────────
Instance variables  Constants only         Yes, regular fields
                    (public static final)

Method types        Abstract (default)     Abstract + concrete
                    Default (Java 8+)      (fully implemented)
                    Static (Java 8+)
                    Private (Java 9+)

Constructors        No                     Yes

How to use          implements (a class     extends (a class can
                    can implement many)     only extend ONE)

When to choose it   Defining capability    Sharing code between
                    across unrelated        related classes
                    classes

Real examples       Comparable,            HttpServlet,
                    Serializable,          AbstractList,
                    Runnable, Callable,    JdbcTemplate,
                    Repository (Spring)    AbstractAuthenticationProvider
────────────────────────────────────────────────────────────────
```

### Java 8+ Changes That Matter

Before Java 8: interfaces had zero implementation. After Java 8: interfaces can have `default` and `static` methods with full implementation. This blurred the line, but the intent is different:

- `default` methods in interfaces: used to add new methods to an interface without breaking all existing implementations. Not for sharing complex logic between related classes.
- Abstract classes still win when you need instance fields, constructors, or complex shared state.

### ASCII Diagram

```
INTERFACE: CAPABILITY CONTRACT
───────────────────────────────────────────────────────────────
  <<interface>>          <<interface>>        <<interface>>
  Payable                Loggable             Retryable
  + process()            + log()              + retry()
      ▲                      ▲                    ▲
      │implements             │implements           │implements
      └──────────────────────┬───────────────────┘
                    CreditCardPayment
                    (can fulfil ALL THREE capabilities)


ABSTRACT CLASS: SHARED BASE FOR A FAMILY
───────────────────────────────────────────────────────────────
  abstract class BasePayment
  + refund()          ← Concrete: shared, works as-is
  + abstract process()  ← Each subclass MUST implement
  + abstract validate() ← Each subclass MUST implement
      ▲                ▲                ▲
   extends           extends          extends
  CreditCard          UPI           NetBanking
  + process()       + process()     + process()
  + validate()      + validate()    + validate()
───────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — When People Abuse Abstract Class as an Interface
```java
// WRONG: Using abstract class when you need multiple capability contracts

// Try to give CreditCardPayment both capabilities:
public abstract class BasePayment {
    public abstract void processPayment();
    public abstract void log();     // ← Doesn't belong here
    public abstract void retry();   // ← Doesn't belong here
}

// Problem: NotificationService also needs to log and retry
// But NotificationService is NOT a payment — it shouldn't extend BasePayment
// Java's single inheritance means you can't extend both BasePayment AND BaseNotification

public class NotificationService extends BasePayment {  // WRONG — forced into a bad hierarchy
    // Now NotificationService has processPayment() ← makes no sense
}

// The design is broken. Single inheritance creates a ceiling.
```

### Right Way — Interface for Capability, Abstract Class for Shared Code
```java
// RIGHT: Interface for cross-cutting capabilities

public interface Payable {
    PaymentResult process(Order order);
    boolean validate(PaymentDetails details);
}

public interface Auditable {
    void audit(String action, Object payload);
}

public interface Retryable {
    default int maxRetries() { return 3; }    // Default method — shared default behaviour
    boolean shouldRetry(Exception e);
}

// Abstract class for shared payment logic only
public abstract class BasePayment implements Payable, Auditable {
    // Shared concrete method — no duplication across subclasses
    public PaymentResult refund(String transactionId, double amount) {
        audit("REFUND_INITIATED", Map.of("txnId", transactionId, "amount", amount));
        // shared refund logic here
        return new PaymentResult("REFUNDED", transactionId);
    }

    // These MUST be implemented by each subclass — no shared logic possible
    @Override
    public abstract PaymentResult process(Order order);

    @Override
    public abstract boolean validate(PaymentDetails details);
}

// Subclasses extend the base (for shared code) AND can implement more interfaces
public class CreditCardPayment extends BasePayment implements Retryable {

    @Override
    public PaymentResult process(Order order) {
        // Credit card-specific processing — Visa/Mastercard gateway call
        validate(order.getPaymentDetails());
        PaymentResult result = callCreditCardGateway(order);
        audit("CREDIT_CARD_PROCESSED", result);
        return result;
    }

    @Override
    public boolean validate(PaymentDetails details) {
        // Validate card number using Luhn algorithm
        return details.getCardNumber() != null && luhnCheck(details.getCardNumber());
    }

    // From Retryable interface
    @Override
    public boolean shouldRetry(Exception e) {
        return e instanceof GatewayTimeoutException;  // Retry on timeout only
    }

    private PaymentResult callCreditCardGateway(Order order) { /* ... */ return null; }
    private boolean luhnCheck(String cardNumber) { return true; /* Luhn algorithm */ }
}

// NotificationService also needs Auditable — no inheritance conflict
@Service
public class NotificationService implements Auditable {
    @Override
    public void audit(String action, Object payload) {
        // Log to audit trail
    }
}
```

> **Spring Boot context:** Spring's `JpaRepository`, `CrudRepository`, and `PagingAndSortingRepository` are all **interfaces**. You implement them with `extends JpaRepository<User, Long>`. Spring injects the implementation at runtime. This is the most common real-world use of interfaces in Spring Boot apps — you never write the implementation directly.

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you choose an interface over an abstract class?"

**Hruday's answer:**
> There's a simple decision rule I follow.
>
> I use an interface when I want to define a **capability** — something that many different, unrelated classes can do. `Comparable`, `Serializable`, `Runnable` in the JDK are interfaces because any class — a String, a Date, a custom domain object — might need to be comparable or runnable. They're not related by inheritance; they're related by capability.
>
> I use an abstract class when I want to share **code** between a family of related classes. If `CreditCard`, `UPI`, and `NetBanking` all have an identical `refund()` implementation and some shared validation logic — that shared code belongs in an abstract parent. Each subclass still overrides what's unique to it.
>
> The practical test: if multiple unrelated classes need the same behaviour → interface. If a group of related classes share common code → abstract class.
>
> In Spring Boot apps: almost everything is an interface. `UserRepository`, `PaymentService`, `NotificationClient` — all defined as interfaces. Spring injects the implementation. The interface is the contract. The Spring bean is the implementation. That's the pattern everywhere.

---

### Q2 — Deep Dive
**Interviewer asks:** "Java 8 added default methods to interfaces. Doesn't that make abstract classes redundant?"

**Hruday's answer:**
> Not redundant — but the gap is smaller. Here's what `default` methods in interfaces do: they let you add new methods to an existing interface without breaking all the classes that already implement it. That was the original reason — backward compatibility when evolving APIs.
>
> But interfaces with default methods still can't do some things that abstract classes can:
>
> First: **instance fields.** Interfaces can't have instance variables — only `public static final` constants. If you need shared mutable state across methods (like a logger instance, or a connection pool, or any configuration object), you need a class, not an interface.
>
> Second: **constructors.** Interfaces have no constructors. If your shared setup involves constructor logic — reading a config value, initialising a cache, setting up a resource — you need an abstract class.
>
> Third: **access modifiers.** Interface fields are always public. Abstract class fields can be `protected` or `private`. If you want to share a field with subclasses but hide it from the outside world, abstract class is the right tool.
>
> The design intent also remains different. Interfaces say "you can do this." Abstract classes say "you are this, with this shared setup." Default methods don't change that intent — they just make interfaces more capable in limited ways.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What's the downside of using interfaces everywhere?"

**Hruday's answer:**
> Over-using interfaces creates two problems.
>
> First: **indirection without purpose.** If a class has only one implementation and never will have more — wrapping it in an interface just adds a layer to navigate when reading the code. Every time someone calls `userService.getUser(id)`, they see the interface method signature, not the implementation. They have to jump twice to understand what happens. For small, single-implementation services, the interface adds noise without adding value.
>
> Second: **default method complexity.** When multiple interfaces both define a default method with the same signature, and a class implements both, Java throws a compile error — it doesn't know which default to use. You have to explicitly override. This "diamond problem" is manageable but tricky when you have deep interface hierarchies.
>
> My personal rule at SAP: if a class will have multiple implementations (or you're writing a library for others), define an interface. If it's an internal service with one implementation, skip the interface unless the framework (like Spring) specifically benefits from it (for proxy-based AOP to work, Spring prefers interfaces).

---

### Q4 — Code / Design Question
**Interviewer asks:** "Design a notification system that supports Email, SMS, and Slack. Use interfaces and abstract classes correctly."

**Hruday's answer:**
> Here's the structure I'd use:
>
> ```java
> // Interface — the capability contract. Any class can be a Notifier.
> public interface Notifier {
>     void send(Notification notification);
>     boolean canSend(Notification notification);
> }
>
> // Abstract class — shared code for all notification types that have delivery retries
> public abstract class RetryableNotifier implements Notifier {
>     protected final int maxRetries = 3;
>
>     // Shared retry logic — concrete, not abstract
>     public void sendWithRetry(Notification notification) {
>         int attempts = 0;
>         while (attempts < maxRetries) {
>             try {
>                 send(notification); // polymorphic — calls the subclass implementation
>                 return;
>             } catch (DeliveryException e) {
>                 attempts++;
>                 if (attempts == maxRetries) throw new NotificationFailedException(e);
>             }
>         }
>     }
>     // send() and canSend() are still abstract — each channel implements them
> }
>
> // SMS and Email both retry — extend RetryableNotifier
> @Service
> public class EmailNotifier extends RetryableNotifier {
>     @Override
>     public void send(Notification n) { /* SMTP call */ }
>
>     @Override
>     public boolean canSend(Notification n) {
>         return n.getRecipient().getEmail() != null;
>     }
> }
>
> // Slack doesn't retry (webhooks are idempotent) — implements interface directly
> @Service
> public class SlackNotifier implements Notifier {
>     @Override
>     public void send(Notification n) { /* Slack webhook call */ }
>
>     @Override
>     public boolean canSend(Notification n) {
>         return n.getRecipient().getSlackId() != null;
>     }
> }
> ```
>
> The decision: Email and SMS need retry logic → they extend `RetryableNotifier` (abstract class, shared code). Slack doesn't → it just implements the interface directly. The calling code only sees `List<Notifier>` — doesn't know if something is retryable or not. That's polymorphism and abstraction working together.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Just always use interfaces" | "Interfaces are more flexible, so I use them everywhere." | "Abstract class is the right tool when you need shared fields, constructors, or complex shared code." |
| "Abstract class is old-fashioned" | "Java 8 default methods make abstract classes obsolete." | "Default methods help with backward compatibility. Abstract classes still own shared state and constructors." |
| Diamond problem ignorance | Doesn't know implementing two interfaces with same default method causes compiler error | "If two interfaces have the same default method name, the implementing class must override it explicitly." |
| Wrong tool for Spring boot | "I'd create an abstract class for my service." | "Spring services are nearly always interfaces. Spring's AOP proxy system works better with interfaces." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, we built a notification system for enterprise customers — some customers had email only, some had an internal corporate messaging system, some had SMS gateways. I defined a `NotificationChannel` interface with `send()` and `supports()`. All three implementations lived in the same Spring context. A `NotificationRouter` got all the channel beans injected as `List<NotificationChannel>` and called the first one where `supports()` returned true for the recipient type. No if-else for channel selection. When a fourth channel was needed — WhatsApp integration for a pilot — we added one new class, one Bean annotation, zero changes to the router. That's the real payoff of getting interface design right."

---

## 8. Scale Evolution

**Junior engineer →** Knows the syntax difference. Uses abstract classes and interfaces somewhat interchangeably. Doesn't understand why one is chosen over the other.

**Mid-level engineer →** Uses interfaces for Spring services by habit. Understands single inheritance limitation.

**Senior engineer →** Knows when to reach for each one. Designs interface hierarchies carefully. Avoids overly deep abstract class hierarchies.

**Staff engineer →** Defines the team's interface design conventions. Reviews that shared behaviour doesn't drift into inappropriate inheritance. Knows when a functional style (functions, lambdas) is cleaner than both.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Complex payment flows — multiple payment types, retry logic, audit hooks | "You used abstract class for retry but kept the public contract as an interface. Correct." |
| Swiggy / Meesho | Multiple delivery partners, vendor integrations — each is a different implementation of the same interface | "You showed how to add a new vendor without changing the routing logic. Open-Closed principle in action." |
| Adobe / SAP | Enterprise Java — Spring AOP, proxy-based security and transaction management depend on interface design | "You knew why Spring prefers interfaces for transactional beans. AOP proxy generation requires it." |
| Google / Amazon | SDE-2 Java rounds — interface design is expected, and SOLID principles tie directly back to this choice | "You correctly applied Dependency Inversion — high-level code depends on the interface, not the implementation." |

---

## 10. Related Topics — What to Study Next

- **OOP Pillars (Topic 16)** — Abstraction (which interfaces implement) and polymorphism (which interfaces enable) — the foundational context.
- **Java Collections (Topic 18)** — `List`, `Map`, `Set` are interfaces. `ArrayList`, `HashMap`, `HashSet` are implementations. This is the most-used example of interface vs implementation in Java.
- **Design Patterns (Part 18)** — Strategy, Observer, Factory, Template Method — all built on the interface and abstract class distinction.
- **Spring DI (Topic 36)** — Spring's entire bean injection system is built on coding-to-interface. Understanding interface vs abstract class is prerequisite for understanding Spring DI.

---

*Part 2 · Interface vs Abstract Class · Full Stack Interview Guide · Hruday D · 2026*
