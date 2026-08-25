# Factory and Abstract Factory
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Factory Method**: a method (or class) responsible for CREATING objects; the caller asks for an object by type/params, the factory decides WHICH concrete class to instantiate; caller is decoupled from `new ConcreteClass()`
- **Abstract Factory**: a factory OF factories; creates FAMILIES of related objects; all objects in the family are compatible with each other; caller gets a full product family without knowing which concrete family was chosen
- **Factory Method use case**: `NotificationFactory.create("EMAIL")` returns `EmailNotification`, `"SMS"` returns `SmsNotification` — the caller doesn't import either concrete class
- **Abstract Factory use case**: `UIComponentFactory` — `DarkThemeFactory` returns `DarkButton + DarkModal + DarkDropdown`; `LightThemeFactory` returns `LightButton + LightModal + LightDropdown`; all from one factory, guaranteed compatible
- **Spring `@Bean` methods ARE factories**: a `@Configuration` class with `@Bean` methods is the Abstract Factory pattern applied — it creates a family of beans that work together for an environment (profiles, feature flags)
- **Key interview signal**: Factory = encapsulates `new`; Abstract Factory = ensures consistency of a FAMILY; know which problem requires which
- **When to choose**: single product type with variants → Factory Method; multiple related products that must be consistent → Abstract Factory

---

## 1. One-Line Definition
Factory Method delegates object creation to a factory, hiding which concrete class is instantiated; Abstract Factory extends this to create families of related objects where all members are guaranteed to be compatible with each other.

---

## 2. The Problem It Solves

**Without factories:**
```java
// Business logic knows about every payment provider
public void processPayment(String provider, Order order) {
    if ("STRIPE".equals(provider)) {
        new StripeClient(System.getenv("STRIPE_KEY")).charge(order.getAmount());
    } else if ("RAZORPAY".equals(provider)) {
        new RazorpayClient(System.getenv("RAZORPAY_KEY")).createOrder(order);
    } else if ("PAYPAL".equals(provider)) {
        new PayPalClient(System.getenv("PAYPAL_ID"), System.getenv("PAYPAL_SECRET")).execute(order);
    }
    // Adding a new provider requires editing this method
    // Testing: must mock 3 concrete clients
    // Adding test-mode client: another branch
}
```

**With Factory Method**: `PaymentGateway gateway = PaymentGatewayFactory.create(provider)`. Add providers by adding to the factory only. Business logic doesn't change.

---

## 3. How It Works Internally

```
Factory Method:
  Client → PaymentGatewayFactory.create("STRIPE")
                   ↓
           switch/map lookup → new StripeGateway()
                   ↓
           returns PaymentGateway (interface)
  Client uses PaymentGateway interface — never imports StripeGateway

Abstract Factory:
  Client → UIComponentFactory (interface)
              ↓               ↓
  DarkThemeFactory         LightThemeFactory
   createButton()           createButton()
   createModal()            createModal()
   createDropdown()         createDropdown()

  Client holds UIComponentFactory; calls createButton() etc.
  Gets a CONSISTENT set of components (all Dark or all Light)
  DarkButton + LightModal can never happen
```

---

## 4. The Code

### Wrong Way — Scattered `new` with Long if/else

```java
// ❌ NO FACTORY: notification sending scattered with if/else

@Service
public class NotificationService {
    
    public void send(String type, String recipient, String message) {
        // ❌ Every new notification type = edit this class
        // ❌ Business logic imports all concrete providers
        // ❌ Testing requires mocking each provider separately
        if ("EMAIL".equalsIgnoreCase(type)) {
            new JavaMailSenderImpl()
                .createMimeMessage();
            // ... 20 lines of JavaMail setup
            
        } else if ("SMS".equalsIgnoreCase(type)) {
            TwilioRestClient twilio = new TwilioRestClient.Builder(
                System.getenv("TWILIO_SID"), System.getenv("TWILIO_TOKEN")).build();
            Message.creator(...).create();
            
        } else if ("PUSH".equalsIgnoreCase(type)) {
            FirebaseMessaging.getInstance().send(...);
            
        } else {
            throw new IllegalArgumentException("Unknown type: " + type);
        }
    }
}
```

```java
// ✅ FACTORY METHOD — encapsulates creation; business logic is clean

// 1. Common interface
interface NotificationSender {
    void send(String recipient, String message);
}

// 2. Concrete implementations
@Component("EMAIL")
class EmailSender implements NotificationSender {
    public void send(String recipient, String message) { /* JavaMail setup */ }
}

@Component("SMS")
class SmsSender implements NotificationSender {
    public void send(String recipient, String message) { /* Twilio */ }
}

@Component("PUSH")
class PushSender implements NotificationSender {
    public void send(String recipient, String message) { /* Firebase */ }
}

// 3. Factory — Spring makes this clean: inject all implementations as a Map
@Component
public class NotificationFactory {
    private final Map<String, NotificationSender> senders;
    
    // Spring injects: Map key = bean name (= @Component("EMAIL") etc.), value = bean instance
    public NotificationFactory(Map<String, NotificationSender> senders) {
        this.senders = senders;
    }
    
    public NotificationSender create(String type) {
        NotificationSender sender = senders.get(type.toUpperCase());
        if (sender == null) throw new IllegalArgumentException("Unknown type: " + type);
        return sender;
    }
}

// 4. Service — knows nothing about concrete providers
@Service
public class NotificationService {
    private final NotificationFactory factory;
    
    public NotificationService(NotificationFactory factory) { this.factory = factory; }
    
    public void send(String type, String recipient, String message) {
        factory.create(type).send(recipient, message);
        // ✅ Adding WhatsApp: add @Component("WHATSAPP") class; this method unchanged
    }
}
```

```java
// ✅ ABSTRACT FACTORY — family of related objects

// Problem: Database access layer needs to create Query + Connection + Transaction
// that ALL must work together for the same database vendor

// 1. Abstract product interfaces
interface DbQuery { ResultSet execute(String sql); }
interface DbConnection { void open(); void close(); }
interface DbTransaction { void begin(); void commit(); void rollback(); }

// 2. Abstract factory
interface DbComponentFactory {
    DbQuery createQuery();
    DbConnection createConnection();
    DbTransaction createTransaction();
}

// 3. Concrete families
class PostgresDbFactory implements DbComponentFactory {
    public DbQuery createQuery()           { return new PostgresQuery();       }
    public DbConnection createConnection() { return new PostgresConnection();  }
    public DbTransaction createTransaction(){ return new PostgresTransaction(); }
    // All three work together — PostgresQuery uses PostgresConnection internally
}

class H2TestDbFactory implements DbComponentFactory {
    public DbQuery createQuery()            { return new H2Query();       }
    public DbConnection createConnection()  { return new H2Connection();  }
    public DbTransaction createTransaction(){ return new H2Transaction(); }
    // All three work together for in-memory testing — H2Query uses H2Connection
}

// 4. Client — uses the family without knowing which vendor
class DataAccessLayer {
    private final DbComponentFactory factory;
    
    public DataAccessLayer(DbComponentFactory factory) { this.factory = factory; }
    
    public List<Row> runQuery(String sql) {
        DbConnection conn = factory.createConnection();  // ← always a compatible connection
        DbTransaction tx  = factory.createTransaction(); // ← always compatible with conn
        DbQuery query     = factory.createQuery();        // ← always compatible with conn+tx
        
        conn.open();
        tx.begin();
        ResultSet rs = query.execute(sql);
        tx.commit();
        conn.close();
        return mapResults(rs);
    }
}

// Spring wires the right factory via @Profile
@Configuration
@Profile("test")
class TestDbConfig {
    @Bean DbComponentFactory dbFactory() { return new H2TestDbFactory(); }
}

@Configuration
@Profile("production")
class ProdDbConfig {
    @Bean DbComponentFactory dbFactory() { return new PostgresDbFactory(); }
}
```

```typescript
// ✅ TypeScript — Abstract Factory for UI theming in React

// Abstract product interfaces
interface Button { render(): JSX.Element; }
interface Modal  { render(children: React.ReactNode): JSX.Element; }

// Abstract factory
interface UIComponentFactory {
    createButton(props: ButtonProps): Button;
    createModal(props: ModalProps): Modal;
}

// Concrete families
class MaterialUIFactory implements UIComponentFactory {
    createButton(props: ButtonProps): Button {
        return { render: () => <MuiButton {...props} /> };
    }
    createModal(props: ModalProps): Modal {
        return { render: (children) => <MuiDialog {...props}>{children}</MuiDialog> };
    }
}

class AntDesignFactory implements UIComponentFactory {
    createButton(props: ButtonProps): Button {
        return { render: () => <AntButton {...props} /> };
    }
    createModal(props: ModalProps): Modal {
        return { render: (children) => <AntModal {...props}>{children}</AntModal> };
    }
}

// Context provides the factory — component never imports concrete library
const UIFactoryContext = React.createContext<UIComponentFactory>(new MaterialUIFactory());

function CheckoutForm() {
    const factory = useContext(UIFactoryContext);
    const submitButton = factory.createButton({ label: 'Pay Now', variant: 'primary' });
    const errorModal = factory.createModal({ title: 'Payment Failed' });
    
    return (
        <form>
            {submitButton.render()}
            {errorModal.render(<p>Card declined.</p>)}
        </form>
    );
    // Switching from Material UI to Ant Design: swap the factory in the Context provider
    // CheckoutForm is unchanged
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you choose Factory Method over just using Spring's @Bean injection?"

**Hruday's answer:**
> `@Bean` injection works when the concrete type is known at application startup — you configure which implementation to use once and Spring wires it everywhere. That's fine for most dependencies.
>
> Factory Method is needed when the concrete type is determined AT RUNTIME based on data — not at startup. A payment provider selection (`"STRIPE"` vs `"RAZORPAY"`) depends on the customer's country or cart configuration, which varies per request. You can't wire that at startup — the factory looks at the runtime value and returns the right instance.
>
> In practice, I use both together: Spring constructs and manages all the implementations as singleton beans, and a factory component (itself injected via Spring) selects the right one at runtime based on request data. The factory doesn't use `new` — it selects from the set of beans Spring already created. This is the `Map<String, NotificationSender>` injection pattern: Spring creates all `NotificationSender` implementations and injects them keyed by bean name; the factory is just a type-safe selector.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain the difference between Factory Method and Abstract Factory with a real scenario."

**Hruday's answer:**
> Factory Method: I have one type of product — a `PaymentGateway` — and different variants (Stripe, Razorpay, PayPal). The factory takes a discriminator and returns the right variant. One product family member.
>
> Abstract Factory: I have multiple related products that must all be consistent. Theme example: a `UIThemeFactory` creates `Button`, `Modal`, `Tooltip`, and `Dropdown`. If I mix `DarkButton` with `LightModal`, the UI looks broken. The Abstract Factory guarantees that all components come from the same theme: `DarkThemeFactory.createButton()` + `DarkThemeFactory.createModal()` are always compatible.
>
> The test is: "can I mix and match products from different factories?" If yes, use Factory Method for each. If no — mixing would break correctness or consistency — use Abstract Factory to enforce that you always get a complete, compatible set.
>
> In SAP's SAP Analytics Cloud, we had a report renderer that needed a query engine, a cell formatter, and a chart engine — all three had to be consistent for the same data source (HANA SQL vs Live Data Connection). Abstract Factory: `HanaFactory.createQueryEngine()` + `HanaFactory.createFormatter()` + `HanaFactory.createChartEngine()` were guaranteed compatible. Mixing HANA query engine with Live Data formatter produced incorrect aggregations.

---

### Q3 — Application
**Interviewer asks:** "Is Spring's @Configuration class an example of Abstract Factory?"

**Hruday's answer:**
> Yes, exactly. A `@Configuration` class with multiple `@Bean` methods is the Abstract Factory pattern applied to application wiring.
>
> Consider a `@Configuration @Profile("production")` class with beans for `DataSource`, `CacheManager`, `StorageClient` — all wired for the production environment (RDS, Redis, S3). A `@Configuration @Profile("test")` class provides the same set of bean types but wired for testing (H2, in-memory cache, local filesystem).
>
> The client code (`OrderService`, `ProductService`) depends on `DataSource`, `CacheManager`, `StorageClient` — the interfaces. At startup, Spring selects the right configuration class for the active profile and creates the complete family of beans. The service classes never know which family they got — the Abstract Factory (Configuration class) guarantees they're all production-compatible or all test-compatible. Mixing a production DataSource with a test CacheManager is impossible because only one configuration class is active.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| New provider = edit factory | "I'd add the new payment provider to the factory's switch statement" | Adding to a switch/if-else in the factory violates Open-Closed Principle; instead, use the Map-injection approach — each new provider is a new class annotated `@Component("PROVIDER_NAME")`, and Spring automatically includes it in the injected Map; the factory code is unchanged; OCP preserved; the factory's create() method is purely a lookup, never an if/else chain |
| Abstract Factory is just a fancy factory | "Abstract Factory is the same as Factory if you put multiple create methods on it" | The critical constraint of Abstract Factory is FAMILY CONSISTENCY — all objects created by the same factory instance are guaranteed to work together; a factory that just has multiple create methods without the consistency guarantee is just a utility, not Abstract Factory; the interview signal is naming the consistency guarantee as the defining property |
| Factory vs Builder | "I'd use Factory to build complex objects" | Factory creates an object and returns it immediately — it's responsible for SELECTING which type to create; Builder constructs a complex object step by step (`OrderBuilder.withItem(x).withPromo(y).build()`) — it's responsible for assembling a complex configuration; if the creation is simple but the TYPE is variable, use Factory; if the creation involves multiple optional steps, use Builder |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, the export service originally had a 200-line method that checked the output format ('PDF', 'XLSX', 'CSV', 'HTML') and instantiated the right renderer inline. Every new format required a senior developer to read the whole file and add another branch — it was a classic modification magnet.
>
> We refactored to a Factory with Map injection. Each `ExportRenderer` implementation was a Spring component annotated with the format name. The `ExportRendererFactory` was 15 lines — just a lookup on the injected Map.
>
> Three months later, the product team requested a new 'PPTX' export format. The developer working on it added a single class (`@Component("PPTX")`) and wrote the rendering logic. The factory code was not touched. The service code was not touched. The PR had zero changes outside the new class.
>
> Code review time for format additions dropped from ~2 hours (understanding the 200-line method) to ~20 minutes (review the single new class). This was OCP in practice — the factory was closed for modification, open for extension."

---

## 8. Scale Evolution

**1,000 users →** Factory per feature variant. Spring Map injection for runtime selection. OCP for adding new variants.

**100,000 users →** Factory-managed singleton beans shared across all requests (no per-request `new`); factory's `create()` is just a Map lookup — O(1), no lock contention; all implementations created once at startup.

**10 million users →** Abstract Factory for multi-region configuration families (AWS vs Azure, HANA vs PostgreSQL); `@Profile`-driven configuration as Abstract Factory makes multi-cloud deployment a profile switch, not a code change; factory-managed object pooling (connection pools, thread pools) created by the Abstract Factory ensures pool configuration is consistent across the family.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multi-provider payment gateway Factory (Razorpay/Stripe/PayPal) selected at runtime by currency/country; Abstract Factory for payment + notification + fraud check as a consistent family per payment method | Runtime provider selection; family consistency for payment flow |
| Swiggy / Meesho | Notification factory (SMS/Push/WhatsApp) added without editing existing code; OCP Factory for delivery partner selection (Dunzo/Porter/self-delivery based on city) | Map injection factory; zero-change provider addition |
| Adobe / Microsoft | "Implement a factory for document formats" (PDF/DOCX/XLSX) is a classic whiteboard question; Abstract Factory for cross-platform UI rendering (Windows/Mac/Web) — family consistency theme | Implementation on whiteboard; consistency guarantee articulation |
| SAP Labs | Export renderer factory story (200-line method → 15-line lookup; PPTX addition with zero changes to existing code; PR review time 2h → 20min) | Measurable OCP benefit from factory refactor |

---

## 10. Related Topics — What to Study Next

- **Topic 293 — Builder Pattern** — Builder is the complement to Factory: Factory decides WHICH type to create; Builder decides HOW to configure a complex object; knowing when to use each is the interview nuance; Spring's `WebClient.Builder`, `RestClient.Builder`, and `HttpSecurity.http().authorizeHttpRequests()` chains are all Builder pattern
- **Topic 298 — Strategy Pattern** — Strategy is often used inside factories: the factory selects which strategy to return; understanding both patterns together — "a factory creates the appropriate strategy for runtime conditions" — shows architectural thinking
- **Topic 286 — SOLID — All 5 Principles** — Factory Method directly embodies Open-Closed Principle (adding a payment provider is extending, not modifying); Dependency Inversion (calling code depends on `PaymentGateway` interface, not `StripeGateway` concrete); connecting Factory to SOLID shows depth

---

*Part 18 · Factory and Abstract Factory · Full Stack Interview Guide · Hruday D · 2026*
