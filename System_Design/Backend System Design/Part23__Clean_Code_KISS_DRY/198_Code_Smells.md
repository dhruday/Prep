# 198. Code Smells

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Code Smells** are surface indicators that something may be wrong in the design of the code. The term was coined by Kent Beck and popularized by Martin Fowler in *Refactoring: Improving the Design of Existing Code*. Smells are not bugs — the code may work — but they signal the code will become harder to maintain, extend, or test.

**What they are:**
- Patterns in code that indicate deeper structural problems
- Red flags during code review that suggest a refactoring opportunity
- Symptoms of design decisions that create tech debt

**Why they matter:**
- Left untreated, smells compound into large-scale technical debt
- Smelly code is harder to test — leading to lower coverage and more production bugs
- They slow teams down, making every feature more expensive over time

**Where and when to look:**
- Code reviews: call out smells with refactoring suggestions
- Before adding a feature: does this code require fixing first?
- Tech debt sprints: systematically reduce smell density
- Onboarding: smelly code is the #1 cause of slow onboarding

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Category 1: Bloaters

Code that has grown too large to work with comfortably.

#### Long Method
```java
// ❌ 150-line method handling validation, pricing, payment, email, events
public void checkout(Cart cart, User user) { ... }

// ✅ Decomposed into single-purpose methods
public void checkout(Cart cart, User user) {
    checkoutValidator.validate(cart, user);
    Price price = pricingEngine.calculate(cart, user);
    paymentService.charge(user, price);
    Order order = orderService.create(cart, user, price);
    notificationService.sendConfirmation(order);
}
```

#### Large Class (God Object)
A class that knows too much and does too much.
```java
// ❌ UserManager: 2000 lines, 180 methods, handles 15 different concerns
```
**Signal:** If you can't describe what the class does in one sentence, it's a Large Class.

#### Long Parameter List
```java
// ❌ 7 parameters — call sites are unreadable
createOrder(userId, productId, quantity, discountCode, shippingAddress, billingAddress, paymentMethod);

// ✅ Parameter Object
createOrder(new OrderRequest(userId, productId, quantity, ...));
```

#### Primitive Obsession
```java
// ❌ Raw primitives — no domain semantics
int price;       // Cents or dollars? Which currency?
String status;   // Any string? What are valid values?

// ✅ Rich value types
Money price = Money.ofCents(1499, Currency.USD);
OrderStatus status = OrderStatus.PENDING;
```

#### Data Clumps
Groups of data that always appear together should become their own class.
```java
// ❌ street, city, country always passed together
void ship(String street, String city, String country, int zip) { ... }

// ✅ Address object
void ship(Address destination) { ... }
```

---

### Category 2: Object-Orientation Abusers

#### Switch Statements / Long If-Else Chains
```java
// ❌ Switch on type — add a new type → modify this method
public double calculateDiscount(User user) {
    switch (user.getType()) {
        case PREMIUM: return 0.20;
        case VIP:     return 0.30;
        case ADMIN:   return 0.50;
        default:      return 0.0;
    }
}

// ✅ Polymorphism — each UserType knows its own discount
public interface UserType {
    double getDiscountRate();
}
```

#### Refused Bequest
A subclass that inherits from a parent but doesn't use most of its methods.
```java
// ❌ ReadOnlySqlDao extends SqlDao but overrides insert/update/delete to throw exceptions
// ✅ Use composition or a read-only interface, not inheritance
```

#### Temporary Field
An instance variable that is only set in some circumstances.
```java
// ❌ processingContext is only non-null during bulk processing
class OrderService {
    private ProcessingContext processingContext; // often null
}
// ✅ Pass the context explicitly as a method parameter when needed
```

---

### Category 3: Change Preventers

#### Divergent Change
One class is changed for different reasons.
- "I need to add a new report type AND change the DB schema" → both changes in the same class
- **Signal:** This class has more than one reason to change → violates SRP

#### Shotgun Surgery
One small change requires many edits across many different classes.
```
Add a new user field?
  → UserEntity.java, UserDTO.java, UserMapper.java,
    UserRepository.java, UserService.java, UserController.java
```
**Signal:** The concept of "user" is not well-encapsulated.

#### Parallel Inheritance Hierarchies
Every time you add a subclass to one hierarchy, you must add one to another.

---

### Category 4: Dispensables

Code that should not exist.

#### Dead Code
```java
// ❌
if (false) { doLegacyProcessing(); }     // dead branch
// public void oldMethod() { ... }       // commented out — use git
```

#### Speculative Generality
Abstractions built "just in case" — YAGNI violation.

#### Lazy Class
A class that does so little it shouldn't exist.
```java
// ❌ A class wrapping one trivial line
public class StringTrimmer {
    public String trim(String s) { return s.trim(); }
}
```

#### Duplicate Code
DRY violation — see topic 195.

---

### Category 5: Couplers

Excessive coupling between classes.

#### Feature Envy
A method more interested in another class's data than its own.
```java
// ❌ OrderPrinter constantly accesses Order internals
class OrderPrinter {
    void print(Order order) {
        System.out.println(order.getUser().getEmail());
        System.out.println(order.getItems().stream()
            .mapToDouble(i -> i.getProduct().getPrice() * i.getQuantity()).sum());
    }
}
// ✅ Move the logic to Order: order.getTotalPrice(), order.getUserEmail()
```

#### Inappropriate Intimacy
Two classes that know too much about each other's internals.

#### Message Chains (Law of Demeter Violation)
```java
// ❌
double tax = order.getUser().getShippingAddress().getCountry().getTaxRate();

// ✅ Ask the order for what you need
double tax = taxService.calculateFor(order);
```

#### Middle Man
A class that delegates everything and does nothing itself.
```java
// ❌ OrderFacade just calls OrderService for every method — no additional logic
// ✅ Remove the façade; call the service directly
```

---

### Smell Detection Tools (Java)

| Tool | Detects |
|---|---|
| SonarQube | Duplications, complexity, code smells |
| PMD | Long methods, God classes, unused code |
| Checkstyle | Naming, method length, complexity |
| SpotBugs | Null dereference, resource leaks, concurrency bugs |
| IntelliJ IDEA | Built-in inspection warnings |

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

- **N+1 smell:** Loading 100 users and making 100 individual order queries = 100× DB load vs. 1 join query
- **Feature Envy across service boundaries:** Can lead to 20 API calls where 1 query would suffice
- Both translate directly into capacity and latency problems at scale

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

Database-level smells:
- **God Table:** 100+ columns for many unrelated concerns
- **Missing foreign keys:** Implicit relationships not enforced by the database
- **Primitive obsession in schema:** Storing `status` as raw INT without a lookup/enum
- **Denormalization without documentation:** Extra columns that exist for performance but aren't labeled as such

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- **Tight coupling → cascading failures:** A god class that owns too much means one bug can break 10 features
- **N+1 in ORMs:** Works under normal load; collapses the DB at peak QPS
- **Long methods with hidden side effects:** Hard to test → low coverage → production surprises during high traffic
- **Duplicate config:** Out-of-sync config leads to inconsistent behavior under load

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- **Inappropriate Intimacy with security objects:** Services reaching into `AuthContext` internals
- **Dead code in security paths:** Old auth code paths never cleaned up can become vulnerabilities
- **Primitive obsession for tokens:** Treating auth tokens as plain strings risks accidental logging
- **God class for permissions:** A 3,000-line permission checker that can't be tested → high risk of auth bypass

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### N+1 at Scale: Twitter (2012)
- ORM lazy-loading caused N+1 queries in the feed loading path
- At 100 followers per user: 1 query to get list + 100 queries for each follower's last tweet
- Fix: Eager loading with explicit joins; cache the hot read path

### God Class: The "Order" Service at E-Commerce
- A single `OrderService` grew to 5,000 lines over 4 years
- Every new feature required understanding the entire class
- Fix: Domain-driven decomposition into `OrderFulfillmentService`, `OrderPaymentService`, `OrderNotificationService`

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Code smells are design indicators — surface-level symptoms of deeper structural problems. I categorize them into: Bloaters (god classes, long methods), OO abusers (switch statements instead of polymorphism), change preventers (shotgun surgery), dispensables (dead code, duplicate code), and couplers (feature envy, message chains). In code reviews I actively look for these patterns and suggest refactoring. The most insidious at scale are bloaters and couplers — a god class or tight coupling can cause cascading failures in production."

### Common Follow-Up Questions

1. **"What's the most dangerous code smell in production?"** → Feature Envy across service boundaries — leads to N API calls where 1 should suffice. Under load, this becomes a major reliability issue.
2. **"How do you prioritize which smells to fix?"** → Fix smells in frequently-changed code first (high developer cost), then smells in high-traffic paths (reliability risk).
3. **"Can automated tools catch all smells?"** → No. Tools catch structural smells. Semantic smells (wrong abstraction, feature envy) require human judgment in code review.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Smell → Refactoring Map
```
Long Method          → Extract Method
Large Class          → Extract Class / Move Method
Long Parameter List  → Introduce Parameter Object
Switch on type       → Replace Conditional with Polymorphism
Duplicate Code       → Extract Method (DRY)
Feature Envy         → Move Method to the class it envies
Message Chain        → Hide Delegate / Law of Demeter
Primitive Obsession  → Introduce Value Object
```

### Code Review Checklist for Smells
```
□ Method length > 30 lines?             → Long Method smell
□ Class > 300 lines?                    → Large Class candidate
□ Method has > 3 parameters?            → Long Parameter List
□ Switch on type?                       → Replace with polymorphism
□ Same 3+ lines appear elsewhere?       → DRY violation
□ a.getB().getC().getD()?              → Message Chain / LOD violation
□ Method uses another class's data more than its own? → Feature Envy
□ Changing one thing requires 5+ file edits? → Shotgun Surgery
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why code smells matter:**
- They are the early warning system for tech debt accumulation
- Ignored smells compound into unmaintainable systems that cause production incidents
- Senior engineers proactively identify and address smells

**How to address them:**
- Learn the smell catalog — recognition is the first step
- Fix incrementally (Boy Scout Rule: leave code cleaner than you found it)
- Prioritize by frequency of change and production impact
- Use automated tools for structural smells; human review for semantic smells

**Key trade-offs:**
- Fix now vs. ship feature — fix smells in frequently-changed code first
- Perfect code vs. working system — don't refactor for its own sake
- Automation vs. human judgment — tools catch structure; reviews catch semantics
