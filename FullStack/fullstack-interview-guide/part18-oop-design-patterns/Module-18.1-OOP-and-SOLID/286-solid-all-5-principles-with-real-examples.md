# SOLID — All 5 Principles with Real Examples
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **S — Single Responsibility**: a class/function has exactly ONE reason to change; if it handles data fetching AND formatting AND logging, adding a new log destination or changing the format both require modifying the same class — violation; split into three
- **O — Open/Closed**: open for EXTENSION, closed for MODIFICATION; add new behaviours by adding new classes (new implementations), not by editing existing classes; `if/else if` chains that grow when new types are added = violation; interface + implementations = correct
- **L — Liskov Substitution**: a subclass can always be used where its superclass is expected WITHOUT breaking the program; if `Bird.fly()` throws for `Penguin extends Bird`, the hierarchy is wrong; don't override methods to throw `UnsupportedOperationException` — that's a Liskov violation
- **I — Interface Segregation**: don't force a class to implement methods it doesn't need; one fat interface with 10 methods → split into 3-4 focused interfaces; clients implement only what they use
- **D — Dependency Inversion**: high-level modules depend on ABSTRACTIONS (interfaces), not on concrete low-level implementations; the `OrderService` depends on `PaymentGateway` interface, not on `StripePaymentGateway` class directly; Spring's `@Autowired` IS dependency inversion via dependency injection
- **SOLID is not dogma**: these are guidelines; small scripts and one-off utilities don't need SOLID; apply it where code changes frequently and multiple developers work together

---

## 1. One-Line Definition
SOLID is a set of five object-oriented design principles that make code more maintainable, extensible, and testable by separating responsibilities, depending on abstractions, and preserving substitutability.

---

## 2. The Problem It Solves

**Without SOLID:** All business logic lives in `OrderService.java`. It fetches the order from the database, applies discount rules, charges the payment gateway, sends a confirmation email, and logs the transaction. Changing the email template requires opening `OrderService`. Adding a new payment gateway requires opening `OrderService`. Each change risks breaking unrelated behaviour. Testing one concern requires setting up the entire class.

**With SOLID:** `OrderService` depends on `PaymentGateway`, `NotificationService`, `DiscountCalculator` (interfaces). Each is a separate class. Testing `OrderService` means mocking the interfaces. Adding PayPal means writing a new `PayPalGateway implements PaymentGateway` without touching `OrderService`. The email template lives entirely in `EmailNotificationService`.

---

## 3. How It Works Internally

### S — Single Responsibility

```java
// ❌ VIOLATES S: One class does data access + business logic + formatting
public class UserReport {
    public List<User> getUsersFromDB() { /* SQL query */ }
    public List<User> filterActiveUsers(List<User> users) { /* filtering logic */ }
    public String formatAsCSV(List<User> users) { /* CSV string building */ }
    public void sendEmail(String csv, String recipient) { /* SMTP call */ }
}
// 4 reasons to change: DB schema, filter criteria, CSV format, email provider

// ✅ CORRECT: Each class has one responsibility
public class UserRepository { public List<User> findAll() { ... } }
public class UserFilterService { public List<User> filterActive(List<User> users) { ... } }
public class CsvFormatter { public String format(List<User> users) { ... } }
public class EmailService { public void send(String body, String recipient) { ... } }
```

### O — Open/Closed

```java
// ❌ VIOLATES O: Must modify this method every time a new shape is added
public double calculateArea(Object shape) {
    if (shape instanceof Circle c) return Math.PI * c.radius * c.radius;
    if (shape instanceof Rectangle r) return r.width * r.height;
    // Adding Triangle requires opening and modifying this method
    return 0;
}

// ✅ CORRECT: Adding Triangle adds only a new class, nothing else changes
interface Shape { double area(); }
record Circle(double radius) implements Shape { public double area() { return Math.PI * radius * radius; } }
record Rectangle(double w, double h) implements Shape { public double area() { return w * h; } }
record Triangle(double b, double h) implements Shape { public double area() { return 0.5 * b * h; } }

public double calculateArea(Shape shape) { return shape.area(); }
```

### L — Liskov Substitution

```java
// ❌ VIOLATES L: Penguin breaks the Bird contract
class Bird { public void fly() { /* flap wings */ } }
class Penguin extends Bird {
    @Override public void fly() { throw new UnsupportedOperationException("Penguins can't fly"); }
    // Any code that calls bird.fly() expecting no exception will crash with a Penguin
}

// ✅ CORRECT: Segregate the hierarchy correctly
interface Bird { void eat(); }
interface FlyingBird extends Bird { void fly(); }
class Sparrow implements FlyingBird { public void fly() { ... } public void eat() { ... } }
class Penguin implements Bird { public void eat() { ... } }
// Code that uses FlyingBird never receives a Penguin — contract upheld
```

### I — Interface Segregation

```java
// ❌ VIOLATES I: PrinterScanner forces all classes to implement both
interface MultiFunctionPrinter {
    void print(Document d);
    void scan(Document d);
    void fax(Document d);     // BasicPrinter doesn't have fax
}
class BasicPrinter implements MultiFunctionPrinter {
    public void print(Document d) { /* OK */ }
    public void scan(Document d) { throw new UnsupportedOperationException(); }  // ❌ forced
    public void fax(Document d)  { throw new UnsupportedOperationException(); }  // ❌ forced
}

// ✅ CORRECT: Split into focused interfaces
interface Printer { void print(Document d); }
interface Scanner { void scan(Document d); }
interface Fax     { void fax(Document d); }
class BasicPrinter implements Printer { public void print(Document d) { ... } }
class AllInOnePrinter implements Printer, Scanner, Fax { /* all three */ }
```

### D — Dependency Inversion

```java
// ❌ VIOLATES D: OrderService directly instantiates StripeGateway (concrete)
class OrderService {
    private StripeGateway payment = new StripeGateway();  // ❌ hardcoded dependency
    public void pay(Order order) { payment.charge(order.total()); }
}
// Switching to PayPal requires opening and modifying OrderService

// ✅ CORRECT: Depend on interface; inject the concrete at runtime
interface PaymentGateway { void charge(double amount); }
class StripeGateway implements PaymentGateway { public void charge(double amount) { ... } }
class PayPalGateway implements PaymentGateway { public void charge(double amount) { ... } }

@Service
class OrderService {
    private final PaymentGateway payment;
    public OrderService(PaymentGateway payment) { this.payment = payment; }  // ← constructor injection
    public void pay(Order order) { payment.charge(order.total()); }
}
// Spring injects whichever PaymentGateway bean is configured — no code change in OrderService
```

---

## 4. The Code

*(See Section 3 for inline examples — the patterns above ARE the implementation.)*

```java
// ✅ COMPLETE EXAMPLE: SOLID-compliant order processing

// I — Segregated interfaces
interface OrderRepository { Order findById(String id); }
interface PaymentGateway   { Receipt charge(String userId, double amount); }
interface NotificationPort { void sendConfirmation(Order order, Receipt receipt); }
interface DiscountPolicy   { double apply(Order order); }

// D — High-level service depends on abstractions
@Service
class OrderService {
    private final OrderRepository orders;
    private final PaymentGateway  payment;
    private final NotificationPort notifier;
    private final DiscountPolicy  discount;
    
    // ✅ Constructor injection — Spring provides concrete implementations
    public OrderService(OrderRepository orders, PaymentGateway payment,
                        NotificationPort notifier, DiscountPolicy discount) {
        this.orders   = orders;
        this.payment  = payment;
        this.notifier = notifier;
        this.discount = discount;
    }
    
    // S — This class only orchestrates; individual responsibilities delegated
    public Receipt placeOrder(String orderId) {
        Order order = orders.findById(orderId);
        double total = order.total() - discount.apply(order);  // O: DiscountPolicy is extensible
        Receipt receipt = payment.charge(order.userId(), total);
        notifier.sendConfirmation(order, receipt);
        return receipt;
    }
}

// O — New payment gateway = new class only
@Component
@ConditionalOnProperty(name = "payment.provider", havingValue = "stripe")
class StripeGateway implements PaymentGateway {
    public Receipt charge(String userId, double amount) { /* Stripe SDK call */ return new Receipt(); }
}

// L — All PaymentGateway implementations are substitutable
@Component
@ConditionalOnProperty(name = "payment.provider", havingValue = "paypal")
class PayPalGateway implements PaymentGateway {
    public Receipt charge(String userId, double amount) { /* PayPal SDK call */ return new Receipt(); }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Give me a real example of the Open/Closed Principle from your work."

**Hruday's answer:**
> At SAP, we had a notification system that initially supported only email alerts. The first version was a classic violation: `if (type == EMAIL) sendEmailAlert(); else if (type == SLACK) sendSlackAlert();` — every new channel required modifying the alerting service.
>
> We refactored to an `AlertChannel` interface with a `send(Alert alert)` method. Each channel was a separate Spring component: `EmailAlertChannel`, `SlackAlertChannel`. When we added PagerDuty for critical incidents, we wrote exactly one new class — `PagerDutyAlertChannel`. The `AlertRouter` remained unchanged.
>
> That's Open/Closed: closed to modification (AlertRouter untouched), open to extension (new channel = new class).

---

### Q2 — Deep Dive
**Interviewer asks:** "Why does Liskov Substitution matter practically?"

**Hruday's answer:**
> Liskov violations break polymorphism — the entire point of inheritance. If I wrote `void processPayment(PaymentGateway gateway)` and someone passes a `MockGateway extends PaymentGateway` that throws `UnsupportedOperationException` for the refund method, my code breaks in tests even though it passed in production with real gateways.
>
> The practical consequence: anywhere you have a list of objects of the parent type and iterate over them calling a method, a Liskov violation introduces a crash for certain subtype instances. It's particularly bad in collections — `List<Shape>` where one `Shape` implementation throws on `area()` breaks any code that computes total area.
>
> The fix is usually to redesign the hierarchy: if the subclass can't fulfil the parent's contract, it shouldn't be a subclass. Use interface segregation — have the parent not declare the method that not all children can support.

---

### Q3 — Application
**Interviewer asks:** "How does Spring's dependency injection relate to the Dependency Inversion Principle?"

**Hruday's answer:**
> DIP says high-level modules should depend on abstractions, and the binding of abstract to concrete should happen externally (not inside the module itself). Spring's IoC container IS that external binding mechanism.
>
> `OrderService` declares it needs a `PaymentGateway` — an interface. It doesn't know and doesn't care whether it gets Stripe or PayPal. Spring reads the application context configuration, finds one bean implementing `PaymentGateway`, and injects it. The `OrderService` was written against the abstraction; Spring resolves the concrete implementation at runtime.
>
> This is why Spring-managed beans are so easily testable: in tests, I inject a mock `PaymentGateway` instead of a real one. `OrderService` works identically with the mock because it only uses the `PaymentGateway` interface — exactly what DIP enables.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Confusing DIP with Dependency Injection | "DIP is when Spring injects dependencies" | Spring's DI is a MECHANISM; DIP is a PRINCIPLE; DIP says "depend on abstractions, not concretions" — you could implement DIP without Spring by manually passing the interface in the constructor; Spring's DI makes DIP easy to implement but the principle is about the direction of dependencies, not which tool creates the objects; you can violate DIP in Spring by injecting a concrete class (no interface) — the DI happens, but the high-level module still depends on a low-level concretion |
| Applying SOLID to everything | "Every class should follow all 5 principles perfectly" | SOLID is most valuable in code that is: (a) shared across a team, (b) expected to change frequently, (c) part of a system with growing requirements; small private helper methods, scripts, and single-use utilities don't benefit from SOLID and applying it rigidly makes them harder to read, not easier; the engineering judgement is knowing when the flexibility SOLID provides is worth the abstractions it introduces |
| Liskov violation with checked exceptions | "My override throws a different checked exception" | In Java, overriding a method and throwing a NEW checked exception (one not declared in the parent) is a compile error — Java enforces this half of Liskov statically; but throwing a RUNTIME exception (unchecked) in an override is allowed syntactically and is still a Liskov violation; the most common real violation is `throw new UnsupportedOperationException()` in an override — perfectly legal Java, completely wrong OO design |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I refactored a product export service that violated 4 of 5 SOLID principles. The `ExportService` class fetched products, applied category filters, formatted into XML and CSV, and emailed the result directly. Changing the email template, adding a JSON export format, or modifying the filter criteria all required modifying the same 1,200-line class.
>
> After the refactor:
> - S: `ExportFormatter` (XML/CSV), `ExportFilter`, `ExportDelivery` (email/S3/SFTP) — separate classes
> - O: Adding JSON export = new `JsonFormatter implements ExportFormatter` — nothing else changed
> - D: `ExportService` injected `ExportFormatter`, `ExportFilter`, `ExportDelivery` as interfaces
>
> In the next sprint a new requirement came in: export to SFTP instead of email. New class `SftpExportDelivery`. Zero changes to any existing class. Product Owner watching the PR review said 'that's it?' That reaction is the measure of SOLID working in practice."

---

## 8. Scale Evolution

**1,000 users →** SOLID principles at the code level — individual class design. Applied by one team. Primarily reduces cycle time for feature changes.

**100,000 users →** SOLID principles at the service level — microservices; each service has a single responsibility (SRP for services); services depend on contracts/APIs (DIP for services); adding a new payment provider = new service (OCP for services); the same conceptual hierarchy applies at a coarser grain.

**10 million users →** Platform architecture — SOLID for frameworks and shared libraries; a shared library that exposes a stable interface (abstraction) that many teams build against is DIP at platform scale; changes to the internal implementation of the library don't break dependent teams if the interface is stable.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | DIP for payment gateway abstraction (core principle of payment platform design); OCP for adding new payment methods (UPI, netbanking, wallets) without changing core routing logic; reviewed in system design + coding rounds | DIP + OCP together with payment gateway story |
| Swiggy / Meesho | SRP for order, delivery, and notification services; OCP for adding new discount policy types (promo codes, loyalty, coupon) without modifying core order pricing | SRP and OCP with discount policy story |
| Adobe / Microsoft | SOLID knowledge is a requirement for SDE-II backend; common pattern is "show me a violation and fix it"; candidates are expected to recognise LSP violations in code review scenarios | Recognize violations quickly; fix with correct abstraction; explain trade-offs |
| SAP Labs | ExportService refactor (SRP + OCP + DIP applied together); PaymentGateway interface story; OpenAPI-driven DIP between services | Full refactor story with before/after; concrete class counts |

---

## 10. Related Topics — What to Study Next

- **Topic 289 — Dependency Injection** — the primary mechanism that makes DIP practially apply in Spring Boot; understanding DIP deeply makes Spring's `@Autowired`, `@Bean`, and qualifier annotations logical rather than magic
- **Topic 298 — Strategy Pattern** — the Strategy pattern is "OCP made concrete for algorithm selection"; having a family of interchangeable algorithms (sort strategies, discount strategies, notification strategies) is the most common implementation of OCP; recognising when SOLID suggests Strategy is a core design skill
- **Topic 299 — Observer Pattern** — the Observer pattern is "OCP + DIP for event systems"; event subscribers know nothing about each other and the event source knows nothing about its subscribers; directly maps to the EventEmitter and Spring's `ApplicationEventPublisher` used throughout the codebase

---

*Part 18 · SOLID Principles with Real Examples · Full Stack Interview Guide · Hruday D · 2026*
