# 199. Refactoring Techniques

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Refactoring** is the process of restructuring existing code without changing its external behavior. The goal is to improve internal structure — readability, maintainability, testability — while keeping the system functionally identical. Martin Fowler's *Refactoring: Improving the Design of Existing Code* catalogs 70+ named techniques.

**What it is:**
- A disciplined technique for internal code improvement with no external behavioral change
- A set of small, safe, reversible transformations applied incrementally
- The engineering practice of continuously paying down technical debt

**Why it exists:**
- Code degrades over time as requirements change and features accumulate
- Refactoring is how teams prevent entropy — systems deteriorate without active maintenance
- Tests provide the safety net that makes refactoring safe

**Where and when it is used:**
- Before adding a feature: "Prepare the codebase, then add feature"
- During code review: suggest refactoring as part of the review
- Tech debt sprints: targeted improvement sessions
- Boy Scout Rule: continuously, in small steps

**Role in large-scale distributed systems:**
- Large codebases require systematic refactoring to remain changeable at speed
- Service extraction from monoliths is refactoring at the architectural level
- Poor internal quality slows delivery by 30–50% — refactoring is a business necessity

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Core Principle: Red → Green → Refactor (TDD Cycle)

```
1. Write a failing test (RED)
2. Write minimal code to pass (GREEN)
3. Refactor the code (REFACTOR) — tests still pass
4. Repeat
```

Refactoring without tests is rewriting — no safety net to confirm behavior is preserved.

---

### Technique Group 1: Extract and Move

#### Extract Method
The most common refactoring. Pull a block of code into a well-named method.

```java
// ❌ Before — anonymous logic buried in a long method
public void processOrder(Order order) {
    if (order.getTotal() > 1000 && order.getUser().isPremium()) {
        double discount = order.getTotal() * 0.15;
        order.applyDiscount(discount);
    }
}

// ✅ After — extracted and named
public void processOrder(Order order) {
    applyPremiumLargeOrderDiscount(order);
}

private void applyPremiumLargeOrderDiscount(Order order) {
    if (order.getTotal() > 1000 && order.getUser().isPremium()) {
        order.applyDiscount(order.getTotal() * 0.15);
    }
}
```

#### Extract Class
Extract a cohesive group of fields and methods into a new class.

```java
// ❌ Before — UserService has contact AND authentication concerns
class UserService {
    String email; String phone; String address;        // contact info
    String passwordHash; String[] roles; Date lastLogin; // auth info
}

// ✅ After
class UserContactInfo   { String email; String phone; String address; }
class UserAuthCredentials { String passwordHash; String[] roles; Date lastLogin; }
```

#### Move Method / Move Field
Move a method to the class it is most closely related to.

```java
// ❌ Feature Envy: OrderReport constantly accesses Order internals
class OrderReport {
    double calculateDiscount(Order order) {
        return order.getTotal() * order.getDiscountRate();
    }
}

// ✅ Move to Order — it belongs there
class Order {
    double calculateDiscount() { return total * discountRate; }
}
```

---

### Technique Group 2: Simplification

#### Replace Conditional with Polymorphism
```java
// ❌ Switch on type
double getShippingCost(Order order) {
    switch (order.getShippingMethod()) {
        case STANDARD:  return 5.99;
        case EXPRESS:   return 14.99;
        case OVERNIGHT: return 29.99;
    }
}

// ✅ Each type knows its cost
interface ShippingMethod { double getCost(); }
class StandardShipping  implements ShippingMethod { public double getCost() { return 5.99; } }
class ExpressShipping   implements ShippingMethod { public double getCost() { return 14.99; } }

double cost = order.getShippingMethod().getCost(); // clean call site
```

#### Introduce Parameter Object
```java
// ❌ 5 parameters
public Report generateReport(String startDate, String endDate, String userId,
                              String format, boolean includeArchived) { ... }

// ✅ Single object
public Report generateReport(ReportCriteria criteria) { ... }
```

#### Decompose Conditional
```java
// ❌
if (user.getAge() >= 18 && !account.isSuspended() && account.hasSufficientFunds(amount)) { ... }

// ✅ Named predicate
boolean canProceed = user.isAdult() && account.isActive() && account.canAfford(amount);
if (canProceed) { ... }
```

#### Remove Flag Argument
```java
// ❌
void renderUser(User user, boolean compact) { ... }

// ✅
void renderUserFull(User user) { ... }
void renderUserCompact(User user) { ... }
```

---

### Technique Group 3: Delegation and Composition

#### Replace Inheritance with Delegation
```java
// ❌ Inheriting just to reuse a couple of methods
class OrderEmailSender extends EmailUtils { ... }

// ✅ Compose with the dependency
class OrderEmailSender {
    private final EmailUtils emailUtils;
    OrderEmailSender(EmailUtils emailUtils) { this.emailUtils = emailUtils; }
}
```

#### Hide Delegate (Law of Demeter)
```java
// ❌ Chain
user.getDepartment().getManager().getEmail();

// ✅ Provide a method on User
user.getManagerEmail();
```

---

### Technique Group 4: Data Organization

#### Introduce Value Object (Replace Primitive Obsession)
```java
// ❌
double price;    // cents? dollars? which currency?

// ✅
Money price = Money.of(1499, Currency.USD);
price.isGreaterThan(Money.of(1000, Currency.USD));
```

---

### Safe Refactoring Process

```
1. Ensure test coverage for code to be refactored
   (If no tests exist: write characterization tests first)
2. Make the smallest meaningful semantic change
3. Run all tests — confirm GREEN
4. Commit (atomic, green-state commit)
5. Repeat
```

**Critical rule:** Never refactor AND add features in the same commit. Mix = impossible to debug when tests fail.

---

### Refactoring at Service Level: Strangler Fig Pattern

Incrementally replace a legacy system by gradually routing traffic to new implementations.

```
Phase 1: Legacy handles all requests
Phase 2: Route /auth/* to new Auth Service; legacy handles rest
Phase 3: Route /orders/* to new Order Service; legacy handles rest
Phase N: Legacy has no traffic → decommission
```

Used at FAANG to migrate monoliths to microservices without big-bang rewrites.

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

- **Developer velocity:** Refactored codebase ships features 2–3× faster
- **Bug rate:** Cleaner code has 50–70% fewer defects
- **MTTR:** Clean, readable code reduces incident resolution time (fewer engineer-hours per incident)

**Refactoring effort estimation:**
- Small (extract method, rename): 15 min–1 hour
- Medium (extract class, replace conditional): 2–8 hours
- Large (Strangler Fig service extraction): 2–8 weeks

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

**Expand-Contract Pattern (safe schema migration as refactoring):**

```
Step 1: ADD new column (nullable) — both old and new code work
Step 2: BACKFILL data into the new column
Step 3: MIGRATE application code to read/write the new column
Step 4: DROP old column — only after 100% traffic uses new column
```

Never drop a column when application code still references it — the most dangerous database refactoring mistake.

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- Refactoring improves testability → higher coverage → fewer production bugs
- Service extraction enables independent scaling of hot services
- Strangler Fig ensures zero-downtime migration — reliability maintained throughout
- Expand-contract ensures no schema-driven downtime

**Key reliability rule:** A test failure during refactoring means behavior has changed — stop and investigate.

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- API backward-compatibility: API refactoring must use versioning or expand-contract — never break clients
- Always run security scanning (SAST) after significant refactors to catch introduced vulnerabilities
- Refactoring authentication logic requires extra scrutiny: behavior preservation is critical for security

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### LinkedIn's Monolith to SOA Migration
- Migrated from a Rails monolith using Strangler Fig over 2+ years
- Zero big-bang rewrites; each service extracted was validated before moving on
- Result: teams could deploy and scale services independently

### Shopify's Modular Monolith
- Rather than microservices, aggressively refactored their Rails monolith into modules with explicit public APIs
- Demonstrated that internal refactoring achieves clean separation without distributed system complexity

### Amazon's API Mandate
- Bezos' 2002 mandate triggered a massive refactoring effort
- Teams extracted services one at a time from shared codebases
- Each service had to have a clean, versioned API — discipline from systematic refactoring at scale

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Refactoring is how I keep codebases changeable. My approach: red-green-refactor — I never refactor without tests. The technique I use most is Extract Method — it's the foundational move for everything else. For structural problems, Extract Class separates concerns; Replace Conditional with Polymorphism eliminates type-based branching. At the service level, I use the Strangler Fig pattern to migrate legacy systems incrementally. Critical discipline: refactoring and feature work are separate commits. Mixing them makes rollback impossible and test failures undiagnosable."

### Common Follow-Up Questions

1. **"How do you refactor without breaking production?"** → Tests first. Incremental steps. Atomic commits. Expand-contract for DB. Feature flags for gradual rollout.
2. **"What's the riskiest refactoring operation?"** → Database schema changes. Unlike code, you can't roll back a column that production has written data into. Always use expand-contract.
3. **"How large is too large for a refactoring PR?"** → Any refactoring that can't be reviewed in < 400 lines changed is too large. Split it.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Expand-Contract Database Pattern
```
EXPAND:
  ALTER TABLE users ADD COLUMN display_name VARCHAR(255);  -- nullable initially

BACKFILL:
  UPDATE users SET display_name = first_name || ' ' || last_name
  WHERE display_name IS NULL;  -- batch update, not one transaction

MIGRATE:
  Deploy new code writing to AND reading from display_name

VERIFY:
  100% traffic confirmed using new column

CONTRACT:
  ALTER TABLE users DROP COLUMN first_name;
  ALTER TABLE users DROP COLUMN last_name;
```

### Strangler Fig Flow
```
Phase 1:
Client → [ Legacy Monolith (handles all) ]

Phase 2:
Client → Router → /auth/*    → [ New Auth Service ]
                 → /*         → [ Legacy Monolith ]

Phase N:
Client → Router → All routes → [ New Services ]
         Legacy Monolith decommissioned
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

**Why refactoring matters:**
- Without it, codebases degrade into legacy systems that cost 3–5× more to change
- Incremental refactoring is how engineering teams repay technical debt continuously
- Clean, refactored code is the foundation for testability, reliability, and velocity

**How it works:**
- Tests first — always have a safety net
- Small, atomic steps — each refactoring is one transformation, one commit
- Named techniques provide a shared vocabulary for teams

**Key trade-offs:**
- Refactor now vs. ship feature — prioritize in frequently-changed code; defer in stable code
- Big-bang rewrite vs. incremental — incremental always wins; rewrites have a 90%+ failure rate
- Perfect structure vs. delivery speed — aim for "continuously improving," not "perfectly clean"
