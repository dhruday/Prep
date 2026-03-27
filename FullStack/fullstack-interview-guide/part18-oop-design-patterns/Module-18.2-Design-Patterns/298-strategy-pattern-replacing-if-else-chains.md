# Strategy Pattern — Replacing if-else Chains
> Part 18 — OOP, SOLID & Design Patterns · 🔥 High Frequency
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Strategy pattern**: defines a family of algorithms (strategies), encapsulates each as a class, makes them interchangeable; the context holds a reference to a strategy interface and delegates the algorithm to it at runtime — without knowing which concrete strategy is executing
- **The core trade**: a long `if/else` or `switch` that selects and inlines algorithms → each algorithm extracted to its own class implementing a common interface → selected at runtime via injection, map lookup, or polymorphism; OCP achieved — new strategy = new class, no edit to existing code
- **Spring Map injection pattern**: annotate each strategy with the same interface + `@Component("strategyName")`; Spring autowires `Map<String, StrategyInterface>` keyed by bean name; the context selects by key; adding a new strategy = zero changes to existing code
- **Strategy vs Template Method**: Strategy = behaviour composed at runtime via INTERFACE (different classes); Template Method = behaviour defined at compile time via INHERITANCE (subclass overrides hook); Strategy is more flexible; Template Method is simpler; prefer Strategy when the algorithm family grows
- **Strategy vs if/else performance**: at scale, a `Map.get()` lookup is O(1) vs O(n) for linear if/else chains with many branches; also: each strategy is testable in isolation vs all branches tested through one class
- **Frontend Strategy**: pricing display, form validation rules, sort comparators, chart rendering — all natural Strategy candidates in React/Angular

---

## 1. One-Line Definition
Strategy defines a family of interchangeable algorithms behind a common interface, allowing the concrete algorithm to be selected at runtime based on context — replacing conditionals that select algorithms with polymorphism.

---

## 2. The Problem It Solves

```java
// ❌ BEFORE Strategy: big if/else that must be edited for every new requirement

public BigDecimal calculateShipping(Order order, String method) {
    if ("STANDARD".equals(method)) {
        return order.getWeight().multiply(new BigDecimal("0.5"))
               .add(new BigDecimal("5.00"));
    } else if ("EXPRESS".equals(method)) {
        return order.getWeight().multiply(new BigDecimal("1.2"))
               .add(new BigDecimal("15.00"));
    } else if ("OVERNIGHT".equals(method)) {
        return new BigDecimal("25.00")
               .add(order.getWeight().multiply(new BigDecimal("2.0")));
    } else if ("FREE".equals(method)) {
        return BigDecimal.ZERO;
    } else if ("STORE_PICKUP".equals(method)) {
        return BigDecimal.ZERO;
    }
    // Adding "DRONE" shipping: ADD ANOTHER BRANCH HERE — modifies existing tested method
    throw new IllegalArgumentException("Unknown method: " + method);
}
// 5 branches: 5 test cases in ONE method. Any change risks all 5.
// Adding branch 6 risks branches 1-5.
```

```java
// ✅ AFTER Strategy: each algorithm is its own class; adding new = new class, no edit

interface ShippingStrategy {
    BigDecimal calculate(Order order);
}
// New method: new class. Total code change: +1 class, 0 edits to existing code.
```

---

## 3. How It Works Internally

```
Context (ShippingCalculator)
  - field: ShippingStrategy strategy
  - method: calculate(order) → delegates to strategy.calculate(order)

Strategy (ShippingStrategy interface)
  + calculate(Order order): BigDecimal

ConcreteStrategies:
  StandardShippingStrategy → implements ShippingStrategy
  ExpressShippingStrategy  → implements ShippingStrategy
  FreeShippingStrategy     → implements ShippingStrategy

Runtime selection:
  Map<String, ShippingStrategy> strategies (Spring-injected)
  strategies.get("EXPRESS") → ExpressShippingStrategy instance
  context.calculate(order) → calls ExpressShippingStrategy.calculate(order)
```

---

## 4. The Code

### Wrong Way — if/else Chain Growing Every Sprint

```java
// ❌ NO STRATEGY: notification channel selection via if/else

@Service
public class NotificationService {
    
    public void notify(User user, String message, String channel) {
        // ❌ Every new channel = edit here; risks existing channels
        if ("EMAIL".equals(channel)) {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true);
            helper.setTo(user.getEmail());
            helper.setText(message, true);
            mailSender.send(msg);
            
        } else if ("SMS".equals(channel)) {
            PhoneNumberUtil parser = PhoneNumberUtil.getInstance();
            PhoneNumber number = parser.parse(user.getPhone(), "IN");
            Message.creator(
                new PhoneNumber(number.toString()),
                new PhoneNumber("+14155552671"),
                message
            ).create();
            
        } else if ("PUSH".equals(channel)) {
            Message fcmMessage = Message.builder()
                .setToken(user.getFcmToken())
                .setNotification(Notification.builder().setBody(message).build())
                .build();
            FirebaseMessaging.getInstance().send(fcmMessage);
            
        } else if ("WHATSAPP".equals(channel)) {
            // 20 more lines of WhatsApp Business API calls
        }
        // Sprint 8: add "SLACK" channel → edit this method again
        // Sprint 12: add "IN_APP" channel → edit this method again
        // Regression risk grows with every sprint
    }
}
```

```java
// ✅ STRATEGY PATTERN with Spring Map injection

// 1. Strategy interface
public interface NotificationStrategy {
    void send(User user, String message);
    String channel();  // or use @Component bean name as the key
}

// 2. Concrete strategies — each in its own class, independently testable

@Component("EMAIL")
public class EmailNotificationStrategy implements NotificationStrategy {
    private final JavaMailSender mailSender;
    
    public EmailNotificationStrategy(JavaMailSender mailSender) { this.mailSender = mailSender; }
    
    @Override
    public void send(User user, String message) {
        MimeMessage msg = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(msg, true);
            helper.setTo(user.getEmail());
            helper.setSubject("Notification");
            helper.setText(message, true);
            mailSender.send(msg);
        } catch (MessagingException e) {
            throw new NotificationException("EMAIL send failed for " + user.getId(), e);
        }
    }
    
    @Override public String channel() { return "EMAIL"; }
}

@Component("SMS")
public class SmsNotificationStrategy implements NotificationStrategy {
    @Override
    public void send(User user, String message) { /* Twilio SDK — 10 lines, isolated */ }
    @Override public String channel() { return "SMS"; }
}

@Component("PUSH")
public class PushNotificationStrategy implements NotificationStrategy {
    @Override
    public void send(User user, String message) { /* Firebase FCM — 10 lines, isolated */ }
    @Override public String channel() { return "PUSH"; }
}

// ✅ Adding WHATSAPP in Sprint 8: new file, zero changes to existing code
@Component("WHATSAPP")
public class WhatsAppNotificationStrategy implements NotificationStrategy {
    @Override
    public void send(User user, String message) { /* WhatsApp Business API */ }
    @Override public String channel() { return "WHATSAPP"; }
}

// 3. Context — uses Map injection; zero knowledge of concrete strategies
@Service
public class NotificationService {
    // Spring injects: key = @Component("EMAIL") etc, value = the bean
    private final Map<String, NotificationStrategy> strategies;
    
    public NotificationService(Map<String, NotificationStrategy> strategies) {
        this.strategies = strategies;
    }
    
    public void notify(User user, String message, String channel) {
        NotificationStrategy strategy = strategies.get(channel.toUpperCase());
        if (strategy == null) {
            throw new IllegalArgumentException("No strategy for channel: " + channel);
        }
        strategy.send(user, message);
    }
    
    // Optionally: multi-channel notification
    public void notifyAll(User user, String message, List<String> channels) {
        channels.stream()
                .map(String::toUpperCase)
                .filter(strategies::containsKey)
                .forEach(ch -> strategies.get(ch).send(user, message));
    }
}
```

```java
// ✅ Strategy for multi-tier pricing with user context

public interface PricingStrategy {
    BigDecimal calculatePrice(Product product, User user);
}

@Component("STANDARD")
class StandardPricingStrategy implements PricingStrategy {
    @Override
    public BigDecimal calculatePrice(Product product, User user) {
        return product.getBasePrice();
    }
}

@Component("PREMIUM")
class PremiumPricingStrategy implements PricingStrategy {
    @Override
    public BigDecimal calculatePrice(Product product, User user) {
        return product.getBasePrice().multiply(new BigDecimal("0.90")); // 10% off
    }
}

@Component("ENTERPRISE")
class EnterprisePricingStrategy implements PricingStrategy {
    private final ContractRepository contracts;
    
    public EnterprisePricingStrategy(ContractRepository contracts) { this.contracts = contracts; }
    
    @Override
    public BigDecimal calculatePrice(Product product, User user) {
        return contracts.findContractPrice(user.getOrganizationId(), product.getId())
                        .orElse(product.getBasePrice().multiply(new BigDecimal("0.80")));
    }
}

// Context selects strategy based on user tier
@Service
public class PricingService {
    private final Map<String, PricingStrategy> strategies;
    
    public PricingService(Map<String, PricingStrategy> strategies) {
        this.strategies = strategies;
    }
    
    public BigDecimal getPrice(Product product, User user) {
        String tier = user.getTier().toUpperCase();  // "STANDARD", "PREMIUM", "ENTERPRISE"
        PricingStrategy strategy = strategies.getOrDefault(tier,
                                        strategies.get("STANDARD"));
        return strategy.calculatePrice(product, user);
    }
}
```

```typescript
// ✅ TypeScript — Strategy for sort order in React table

type SortStrategy<T> = (a: T, b: T) => number;

const sortStrategies: Record<string, SortStrategy<Product>> = {
    'PRICE_LOW_HIGH': (a, b) => a.price - b.price,
    'PRICE_HIGH_LOW': (a, b) => b.price - a.price,
    'NAME_A_Z':       (a, b) => a.name.localeCompare(b.name),
    'NAME_Z_A':       (a, b) => b.name.localeCompare(a.name),
    'NEWEST_FIRST':   (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    'RATING':         (a, b) => b.averageRating - a.averageRating,
};

function ProductList({ products, sortKey }: { products: Product[], sortKey: string }) {
    const sortFn = sortStrategies[sortKey] ?? sortStrategies['NEWEST_FIRST'];
    const sorted = [...products].sort(sortFn);  // ← strategy selected by key; no if/else
    
    return <ul>{sorted.map(p => <ProductCard key={p.id} product={p} />)}</ul>;
}
// Adding a new sort: add one entry to sortStrategies — zero changes to ProductList
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How would you refactor a large if/else block that selects between different algorithms?"

**Hruday's answer:**
> I'd apply the Strategy pattern. The steps:
>
> 1. Extract a common interface from the shared signature of all branches — the method the branches are all doing (even if the branch code is different, they're all doing the same THING: calculate shipping, send notification, format a report).
>
> 2. Extract each branch into its own class implementing that interface. Each class is now independently testable — no need to construct the full object with the branch condition to test one branch.
>
> 3. Register implementations in Spring with `@Component("key")`. Inject `Map<String, Interface>` into the context class. Look up by key at runtime.
>
> 4. The `if/else` becomes a one-line map lookup. Adding a new algorithm = new class, zero modification to the context.
>
> The result: each algorithm is isolated, independently testable, follows SRP. Adding or changing one algorithm can't break any other. The context class becomes stable — it barely needs to change between sprints.

---

### Q2 — Deep Dive
**Interviewer asks:** "How is Strategy different from Template Method?"

**Hruday's answer:**
> Both define a family of algorithms. The difference is the mechanism.
>
> Template Method uses INHERITANCE: a base class defines the algorithm skeleton — the sequence of steps — and leaves abstract hook methods for subclasses to fill in. The relationship is compile-time: you choose the algorithm by choosing which subclass to instantiate. You can't change the algorithm at runtime.
>
> Strategy uses INTERFACE COMPOSITION: you define the algorithm family as a set of classes implementing a common interface. The context holds a strategy REFERENCE that can be changed at runtime. The context and strategy are loosely coupled — they're separate classes.
>
> When to choose:
> - Template Method: the algorithm skeleton is fixed; only specific steps vary; few variations; relationship between variations is stable. Good for report generation where structure is fixed (header, data, footer) but each section's formatting varies.
> - Strategy: the entire algorithm can vary; variations are many or growing; need to swap at runtime; need each variation independently testable. Good for pricing, notifications, sorting, export formats.
>
> General preference: Strategy — it composes better, grows better, and doesn't couple you to an inheritance hierarchy.

---

### Q3 — Application
**Interviewer asks:** "Can you combine Factory and Strategy patterns? Why would you?"

**Hruday's answer:**
> Yes, and it's common. The Factory creates the right Strategy for the context; the Strategy executes the algorithm.
>
> A clean combination: `PaymentStrategyFactory.create(country, cartTotal)` returns the right `PaymentStrategy` — maybe `RazorpayStrategy` for India with small carts, `StripeStrategy` for international orders. The factory hides the selection logic (which can be complex: country, amount, user tier, available payment methods). The strategy executes the payment.
>
> The alternative to a factory is direct Map lookup in the context — simpler, works when selection is based on a single string key. The factory is worth adding when the selection logic involves multiple factors or domain rules that would be messy in a single key lookup.
>
> In Spring, the Map injection pattern is basically a factory built into the IoC container: `Map<String, Strategy>` IS the factory — Spring assembled it; the context's get() call IS the factory's create() call. For more complex selection, extract a `StrategySelector` class that holds the map and applies selection rules — that IS the Factory, even if not named so.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Strategy for every if/else | "Whenever I see an if/else, I should use Strategy" | Not every conditional warrants a Strategy; simple one-off conditionals (error code check, feature flag boolean) don't justify the extra classes; Strategy is justified when: (a) multiple algorithms exist or are growing, (b) each algorithm is non-trivial, (c) algorithms need to be independently testable, (d) algorithms change frequently; for 2-3 very simple cases that won't change, an enum or static method in a utility is fine |
| Strategy mutates the context | "The strategy can modify the context's state directly" | Strategies should be STATELESS — they compute and return results; a strategy that stores state or modifies the context creates shared mutable state problems (especially in Spring singleton strategies); if a strategy needs state, it should return a result that the context stores; stateless strategies are singleton-safe and thread-safe |
| New strategy always needs the context's source | "I have to edit the NotificationService to register each new strategy" | With Spring Map injection, you DON'T edit the context for new strategies; the new strategy registers itself by implementing the interface and adding `@Component("name")` — Spring automatically adds it to the injected Map; the context's source code is never touched; this is OCP in the most literal sense |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, the SAP Analytics Cloud export service grew an if/else chain over 2 years to 14 branches — PDF, XLSX, CSV, HTML, JSON, XML, PowerPoint, Google Sheets (via API), SAP BW cube format, SAP Hana format, live data format, embed HTML, print preview, and thumbnail. The method was 300+ lines.
>
> Every new format required a developer to read through all 14 existing formats to understand what came before, then add a new branch. Code review took hours because reviewers had to verify 14 paths weren't affected. A bug in one format's branch had caused a regression in another format's branch twice (developers accidentally modified the wrong variable scope).
>
> We refactored to 14 Strategy classes, one per format. The selector became a 20-line class with a Map lookup. Adding Google Sheets format was a 1-hour PR — one new strategy class. Code review for format additions was now 20 minutes — reviewers only read the new class.
>
> When we had a regression in PDF generation 6 months later, the debug session was isolated entirely to `PdfExportStrategy` — 80 lines instead of searching through a 300-line method with 14 branches. Fix time: 30 minutes vs a previous similar bug that took 2 days."

---

## 8. Scale Evolution

**1,000 users →** Strategy replaces if/else for notification channels, pricing tiers, export formats. Each strategy independently testable. Adding new variants with zero code change to context.

**100,000 users →** A/B testing via Strategy: `PricingStrategy` can be swapped per user segment; feature flags inject different strategy implementations; the context never changes, only the strategy wired by the feature flag service changes; strategies are all Spring singletons — zero per-request allocation.

**10 million users →** Strategy for rate-limiting algorithms (fixed window vs sliding window vs token bucket) — different algorithms for different API endpoints injected via configuration, no code changes for algorithm switches; performance-critical strategies profiled in isolation; Map.get() O(1) lookup vs n=20 if/else chain is measurably different at millions of requests/second.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | `PaymentStrategy` per payment method (UPI/card/netbanking/wallet); each strategy handles flow variations; strategy selection by user's preferred method and order amount | Runtime strategy selection; stateless singleton strategies |
| Swiggy / Meesho | `DeliveryPricingStrategy` per city/zone; `SortStrategy` for search results (relevance/price/rating/distance); `PromoCodeStrategy` per promotion type (flat/percent/BOGO) | Multi-strategy chains; A/B testing via strategy swap |
| Adobe / Microsoft | "Refactor this if/else to use Strategy" is a classic live coding question; Template Method vs Strategy comparison | Whiteboard refactor from if/else to Strategy; pattern comparison |
| SAP Labs | 14-format if/else → 14 Strategy classes story (300-line method → 20-line selector; format addition 1h vs multi-hour; regression isolated in 80 lines vs 300-line search) | Concrete refactor metrics; regression isolation benefit |

---

## 10. Related Topics — What to Study Next

- **Topic 292 — Factory and Abstract Factory** — Strategy and Factory pair naturally: the Factory selects which Strategy to return based on runtime context; `StrategyFactory.create(discriminator)` = a factory whose product is a strategy; knowing this combination pattern is an architectural design signal
- **Topic 299 — Observer Pattern** — Observer solves a similar "open for extension" goal but for NOTIFICATIONS rather than algorithms; when you see "observers" (listeners/subscribers) and "strategies" in the same system, they're often used together (a notification strategy that dispatches to multiple observers)
- **Topic 286 — SOLID — All 5 Principles** — Strategy is the most direct implementation of Open-Closed Principle: the context is closed for modification, open for extension via new strategy implementations; Dependency Inversion is also applied (context depends on strategy interface, not concrete); being able to articulate SOLID principles THROUGH the Strategy pattern shows deep understanding

---

*Part 18 · Strategy Pattern — Replacing if-else Chains · Full Stack Interview Guide · Hruday D · 2026*
