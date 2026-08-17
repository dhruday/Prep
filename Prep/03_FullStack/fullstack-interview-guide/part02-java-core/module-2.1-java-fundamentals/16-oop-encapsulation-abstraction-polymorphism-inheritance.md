# OOP — Encapsulation, Abstraction, Polymorphism, Inheritance
> Part 2 — Java Core & JVM Internals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- OOP has four pillars: Encapsulation (hide internal data), Abstraction (show only what matters), Inheritance (reuse through parent-child), Polymorphism (same method name, different behaviour).
- Encapsulation = private fields + public getters/setters. The point is protecting data from bad external writes.
- Abstraction = hiding how something works so callers only need to know what it does. Interfaces are the main tool.
- Polymorphism = the same method name does different things based on the type. Override at runtime (dynamic), overload at compile time (static).
- The most-asked interview trap: "What's the difference between abstraction and encapsulation?" — Encapsulation hides the data. Abstraction hides the implementation. Related but different.

---

## 1. One-Line Definition
OOP is a way to organise code around objects — things that bundle together data and the behaviour that acts on that data — using four principles: encapsulation, abstraction, inheritance, and polymorphism.

---

## 2. The Problem It Solves

Without OOP, a large codebase is a collection of disconnected procedures and data structures. There's no clear owner for any piece of data. Any function can modify any variable. When something breaks, you don't know where to look. When you want to change behaviour, you have to trace through a tangle of shared state.

Imagine building a payment system without OOP. You have a `HashMap` of payment data fields — `amount`, `currency`, `userId`, `status`. Any part of the system can set `status = "approved"` without checking if the amount is valid, if the user exists, or if the currency is supported. Two different services apply a discount differently. The data model diverges. Bugs appear when one service forgets to validate what another service assumed was always validated.

OOP solves this by saying: data and the rules that govern it live in the same place. A `Payment` object owns its data and exposes only the operations that are valid. You can't set `status = "approved"` from outside — you call `payment.approve()`, which enforces all the validation inside. The behaviour is owned by the object. No other module can corrupt the data because no other module has direct access.

This is why Java, at its core, is built around objects. Every class you write at SAP — every `OrderService`, every `UserDTO`, every `EventPublisher` — is applying these four principles whether you name them or not.

---

## 3. How It Works Internally

### The Mental Model

Think of a bank account at a real bank. You can't walk into the vault and change the number in your own ledger. You can only do what the bank allows you to do: deposit, withdraw, check balance. The bank's internal process for recording transactions is hidden from you. You don't need to know which database table gets updated. You just call the operation and get the result.

That bank account is an object. Your balance is private data. Deposit and withdraw are public methods. The internal bookkeeping is implementation detail you never see. The operations you're allowed to call are the public API. That's all four pillars in one analogy.

### The Four Pillars — Step by Step

**1. Encapsulation — Hiding data behind controlled access**

The goal: protect the internal state of an object so it can only be changed through defined, validated operations.

How it works:
- Declare fields as `private`
- Expose them through `public` getter and setter methods
- Add validation inside the setter — so bad data can never get in

```
Without encapsulation:
  account.balance = -9999;  // Anyone can set anything. No guard.

With encapsulation:
  account.withdraw(9999);
  // Inside withdraw():
  //   if (amount > balance) throw new InsufficientFundsException();
  // Bad state impossible.
```

**2. Abstraction — Hiding how something works**

The goal: callers should know *what* to do, not *how* it's done internally.

How it works:
- Define interfaces or abstract classes with method signatures
- Implement the details in concrete classes
- Callers work against the interface — they never see the implementation

```
Interface: NotificationService.send(message)
Implementation A: EmailNotificationService.send() → calls SMTP
Implementation B: SlackNotificationService.send() → calls Slack API
Implementation C: SMSNotificationService.send() → calls Twilio API

Caller does: notificationService.send(message)
Caller never knows or cares which service ran.
```

**3. Inheritance — Reusing behaviour through a parent-child hierarchy**

The goal: avoid repeating code by letting a child class inherit fields and methods from a parent.

How it works:
- Parent class (`BaseController`) defines common logic
- Child class (`UserController extends BaseController`) inherits it and adds or overrides specific behaviour
- Java supports single inheritance for classes, multiple for interfaces

```
BaseEntity has: createdAt, updatedAt, id, equals(), hashCode()
UserEntity extends BaseEntity → gets all those fields for free
OrderEntity extends BaseEntity → same, plus its own fields
```

**Rule to know cold:** "Inherit for IS-A, not for HAS-A."
- A `Dog` IS-A `Animal` → extend Animal. Correct.
- A `Car` HAS-A `Engine` → don't extend Engine, use a field. Correct.

**4. Polymorphism — Same method name, different behaviour**

The goal: write code that works on a type and automatically does the right thing for any subtype.

Two types:
- **Runtime polymorphism (method overriding):** A child class overrides a parent method. At runtime, Java calls the right implementation based on the actual object type.
- **Compile-time polymorphism (method overloading):** Same method name, different parameter signatures. Java picks the right one at compile time.

```
// Runtime polymorphism (override):
Animal a = new Dog();
a.makeSound();  // Calls Dog's implementation: "Woof"

Animal b = new Cat();
b.makeSound();  // Calls Cat's implementation: "Meow"

// The variable type (Animal) doesn't determine the call — the object type does.
// This is dynamic dispatch. This is what makes polymorphism powerful.
```

### ASCII Diagram

```
OOP FOUR PILLARS:
────────────────────────────────────────────────────────────────────
                      ┌─────────────────────────┐
                      │      OBJECT              │
                      │  ┌───────────────────┐  │
  ENCAPSULATION ───── │  │  private fields   │  │
   (hide data)        │  │  balance = 1000   │  │
                      │  └───────────────────┘  │
                      │  ┌───────────────────┐  │
  ABSTRACTION ──────  │  │  public methods   │  │
   (hide how)         │  │  + deposit()      │  │
                      │  │  + withdraw()     │  │
                      │  │  + getBalance()   │  │
                      │  └───────────────────┘  │
                      └─────────────────────────┘
                                  ▲
                                  │  INHERITANCE
                                  │  (reuse)
                        ┌─────────┘
               ┌────────┴───────┐
               │  BankAccount   │
               └────────────────┘
                    extends
               ┌────────────────┐
               │ SavingsAccount │  Inherits deposit/withdraw
               │ + earnInterest()│  Adds its own behaviour
               └────────────────┘

  POLYMORPHISM:
  BankAccount acc = new SavingsAccount();
  acc.withdraw(500); → calls SavingsAccount's override, not base
────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — The OOP Trap (violating all four at once)
```java
// WRONG: Public fields, no validation, no abstraction, no polymorphism used

public class Order {
    public String status;      // Public field — anyone can write anything
    public double total;       // No validation possible
    public String userId;
}

// Calling code:
Order order = new Order();
order.status = "APPROVED";    // Sets approved without checking total > 0
order.total = -500;           // Negative total, accepted silently
order.status = "SHIPPED";     // Skipped PAID state entirely — invalid transition

// Problem: any caller can corrupt the Order's state.
// No enforcement of valid state transitions.
// Bugs appear at runtime — nowhere to add guards.
```

### Right Way — All Four Pillars Applied Together
```java
// RIGHT: Encapsulated state, abstracted interface, inheritance for base fields,
//        polymorphism for notification

// ABSTRACTION: Define the interface callers depend on
public interface OrderNotifier {
    void notify(Order order, String event);
}

// ENCAPSULATION: All fields private, all state changes go through methods
public class Order {
    private final String orderId;
    private final String userId;
    private double total;
    private OrderStatus status;               // Enum, not raw String
    private final LocalDateTime createdAt;

    public Order(String orderId, String userId, double total) {
        if (total <= 0) throw new IllegalArgumentException("Total must be positive");
        this.orderId = orderId;
        this.userId = userId;
        this.total = total;
        this.status = OrderStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    // No raw setters for status — only controlled transitions
    public void pay() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException("Can only pay a PENDING order");
        }
        this.status = OrderStatus.PAID;
    }

    public void ship() {
        if (status != OrderStatus.PAID) {
            throw new IllegalStateException("Can only ship a PAID order");
        }
        this.status = OrderStatus.SHIPPED;
    }

    // Getters only — no setters for orderId or createdAt
    public String getOrderId() { return orderId; }
    public OrderStatus getStatus() { return status; }
    public double getTotal() { return total; }
}

// INHERITANCE: Base entity for common fields
public abstract class BaseEntity {
    protected final String id;
    protected final LocalDateTime createdAt;

    protected BaseEntity(String id) {
        this.id = id;
        this.createdAt = LocalDateTime.now();
    }
}

// Order extends BaseEntity — inherits id and createdAt
public class Order extends BaseEntity {
    // ... inherits id and createdAt, adds its own fields and behaviour
}

// POLYMORPHISM: Same notify() call — different implementations at runtime
@Service
public class EmailOrderNotifier implements OrderNotifier {
    @Override
    public void notify(Order order, String event) {
        // Sends email with SMTP
        System.out.println("Email: Order " + order.getOrderId() + " - " + event);
    }
}

@Service
public class SlackOrderNotifier implements OrderNotifier {
    @Override
    public void notify(Order order, String event) {
        // Posts to Slack webhook
        System.out.println("Slack: Order " + order.getOrderId() + " - " + event);
    }
}

// OrderService depends on the abstraction (interface), not the implementation
@Service
public class OrderService {
    private final OrderNotifier notifier;   // Injected — Email or Slack at runtime

    public OrderService(OrderNotifier notifier) {
        this.notifier = notifier;
    }

    public void processPayment(Order order) {
        order.pay();
        notifier.notify(order, "PAYMENT_RECEIVED");  // Polymorphic call
    }
}
```

> **Production note:** This is exactly the shape Spring Boot apps take. Spring's DI gives you polymorphism by injecting the right `OrderNotifier` bean. The `Order` entity enforces encapsulation. The `OrderNotifier` interface provides abstraction. `Order extends BaseEntity` is inheritance. All four pillars are live in every Java Spring Boot project.

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain the four pillars of OOP."

**Hruday's answer:**
> I'll explain each one with a real example from the same system.
>
> **Encapsulation** is hiding data behind controlled methods. In an `Order` class, the `status` field is private. You can't just set `order.status = "APPROVED"`. You call `order.pay()`, which validates the state transition and sets the status only if valid. The data is protected.
>
> **Abstraction** is hiding implementation details behind an interface. Our `OrderNotifier` interface has one method: `notify(order, event)`. The `OrderService` calls it. Whether the underlying code sends an email, posts to Slack, or sends an SMS — the `OrderService` doesn't know and doesn't need to know. It works against the abstraction.
>
> **Inheritance** is reusing code through a parent-child relationship. Our `Order`, `User`, and `Product` entities all extend a `BaseEntity` that provides `id`, `createdAt`, and common `equals()` and `hashCode()` logic. They inherit without repeating that code.
>
> **Polymorphism** is the ability to call the same method on different types and get different behaviour. `orderService.notify(order, "PAID")` runs different code depending on whether the injected `OrderNotifier` is `EmailOrderNotifier` or `SlackOrderNotifier`. The method signature is the same. The behaviour is different. Java picks the right one at runtime.

---

### Q2 — Deep Dive
**Interviewer asks:** "What's the difference between abstraction and encapsulation? They sound similar."

**Hruday's answer:**
> They're related but they solve different problems.
>
> **Encapsulation** is about protecting data. The problem it solves: uncontrolled mutation. If `balance` is public, anything can set it to any value. Making it private with a `withdraw()` method that validates the input is encapsulation. It's about who can read or change the data.
>
> **Abstraction** is about hiding complexity. The problem it solves: callers knowing too much about how something works. If `OrderService` calls `EmailSender.sendSMTPMessage(host, port, username, password, message)` directly — the `OrderService` is coupled to SMTP. If the team switches to SendGrid, every caller changes. Defining a `NotificationService.send(message)` interface and hiding the SMTP details behind it is abstraction. Callers don't know or care how the email is sent.
>
> Memory trick: **Encapsulation = protect state. Abstraction = hide complexity.**
>
> They often appear together — a class both hides its fields (encapsulation) and exposes a simple interface (abstraction) — but they're not the same thing.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Are there downsides to heavy inheritance hierarchies?"

**Hruday's answer:**
> Yes — and this is why "prefer composition over inheritance" is one of the most repeated principles in Java design.
>
> Deep inheritance hierarchies create fragile code. If `BaseEntity` changes its `equals()` implementation, every class that extends it might break in subtle ways. The parent's change propagates down to all children silently.
>
> The other problem: method resolution becomes hard to trace. In a four-level hierarchy — `BaseEntity` → `AbstractPersistable` → `AuditedEntity` → `Order` — when you call `order.equals()`, which implementation runs? You need to trace four classes to be sure. That's a debugging nightmare.
>
> The rule of thumb: use inheritance for genuine IS-A relationships where shared behaviour is stable. Use composition (hold a reference to an object rather than inheriting from it) when you want to reuse behaviour without the coupling. A `Car` HAS-A `Engine`, it doesn't extend `Engine`.
>
> At SAP, our micro-frontend shared component library had shallow inheritance — one level deep at most. Everything else was composition — components holding references to services, not extending them.

---

### Q4 — Scenario / Code Question
**Interviewer asks:** "How would you use polymorphism to avoid a large if-else block?"

**Hruday's answer:**
> This is one of the most practical uses of polymorphism. The pattern is called Strategy.
>
> Before polymorphism:
> ```java
> if (paymentMethod.equals("CREDIT_CARD")) {
>     processCreditCard(order);
> } else if (paymentMethod.equals("UPI")) {
>     processUPI(order);
> } else if (paymentMethod.equals("NET_BANKING")) {
>     processNetBanking(order);
> }
> // Add a new payment type → add another else-if. Fragile.
> ```
>
> With polymorphism (Strategy pattern):
> ```java
> public interface PaymentStrategy {
>     PaymentResult process(Order order);
> }
>
> @Service("CREDIT_CARD")
> public class CreditCardPayment implements PaymentStrategy { ... }
>
> @Service("UPI")
> public class UPIPayment implements PaymentStrategy { ... }
>
> // In PaymentService — no if-else anywhere:
> Map<String, PaymentStrategy> strategies;  // Injected by Spring
>
> public PaymentResult pay(Order order, String method) {
>     PaymentStrategy strategy = strategies.get(method);
>     if (strategy == null) throw new UnsupportedPaymentMethod(method);
>     return strategy.process(order);
> }
> // Add a new payment type → add a new class. Zero changes to PaymentService.
> ```
>
> This is exactly how I'd build the payment routing at Razorpay. The if-else block is replaced by a map of polymorphic implementations. New payment types are added without touching existing code — that's the Open-Closed Principle, which comes directly from OOP's polymorphism capability.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Confusing abstraction and encapsulation | "They're basically the same — both hide things." | "Encapsulation hides data. Abstraction hides implementation. Different problems." |
| Overusing inheritance | "I always extend the base class to reuse code." | "Inherit for IS-A only. For HAS-A, use composition — hold a reference. Deep hierarchies break easily." |
| Forgetting polymorphism replaces if-else | "I'd add a condition for each new type." | "Strategy pattern — each type is its own class implementing the same interface. No if-else needed." |
| Static methods everywhere | "I make helper methods static for reuse." | "Static methods can't be polymorphic (can't be overridden). Heavy static usage kills testability and OOP design." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, we built an Angular component library and a Java Spring Boot API layer together. The Java side used OOP very deliberately. The `BaseEntity` gave us audit fields on every table with zero repetition. The `NotificationService` interface let us swap between email and internal notification providers for different enterprise deployments — the business had customers who didn't allow external email calls. We injected the right implementation based on the customer config. Polymorphism handled what would have been 40 lines of if-else, invisibly. By the time I joined SAP, I'd deeply internalised that OOP isn't academic — it's the difference between a codebase that survives configuration changes and one that requires surgery every time a new client has a new rule."

---

## 8. Scale Evolution

**Junior engineer →** Knows the names. Can define each pillar. Struggles to connect them to real design decisions.

**Mid-level engineer →** Applies all four naturally in day-to-day code. Might still overuse inheritance or miss the encapsulation value of preventing invalid state.

**Senior engineer →** Designs systems around interfaces (abstraction), protects domain invariants (encapsulation), avoids deep hierarchies (composition over inheritance), and uses polymorphism to remove conditional logic (Strategy, Factory patterns).

**Staff engineer →** Tells the team WHEN OOP is the wrong tool. Knows when a module should be procedural, when functional is cleaner, and when OOP adds unnecessary ceremony. OOP is one tool, not the only tool.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment domain objects — `Transaction`, `Wallet`, `Ledger` — must enforce strict state invariants | "You showed how encapsulation prevents invalid payment state transitions. Exactly right." |
| Swiggy / Meesho | Multiple delivery types, payment methods, item types — polymorphism avoids an if-else explosion | "You replaced the payment conditional block with a strategy map. That's how we do it." |
| Adobe / SAP | Enterprise Java — OOP principles embedded in every JPA entity, Spring service, and API controller | "You explained inheritance vs composition correctly and named the fragility of deep hierarchies." |
| Google / Amazon / Microsoft | SDE-2 level — OOP is expected knowledge, but they ask about design implications, not just definitions | "Walk me through how you'd use polymorphism to add a new notification type without changing existing code." |

---

## 10. Related Topics — What to Study Next

- **Interface vs Abstract Class (Topic 17)** — The two main tools for abstraction in Java. When to use each one.
- **Design Patterns — Strategy, Factory, Template Method (Part 18)** — OOP principles applied to solve recurring structural problems. Polymorphism is the engine behind most patterns.
- **Spring Dependency Injection (Topic 36)** — Spring's DI system is essentially polymorphism automated. The container injects the right implementation of your interface at runtime.
- **SOLID Principles (Part 2 — mentioned in context)** — The canonical OOP design rules: Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. Each principle is an application of one or more of the four OOP pillars.

---

*Part 2 · OOP — Encapsulation, Abstraction, Polymorphism, Inheritance · Full Stack Interview Guide · Hruday D · 2026*
