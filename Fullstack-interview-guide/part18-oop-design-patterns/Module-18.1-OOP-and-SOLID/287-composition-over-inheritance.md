# Composition Over Inheritance
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Inheritance = "is-a" relationship**: `Dog extends Animal` means a Dog IS-A Animal; a `PremiumOrder extends Order` means it IS-A Order; inheritance couples the subclass directly to the parent's implementation; changing the parent can break all subclasses
- **Composition = "has-a" relationship**: `Order HAS-A PaymentStrategy`, `Order HAS-A DiscountCalculator`; behaviour is injected, not inherited; swapping a payment strategy doesn't require a new subclass
- **The inheritance problem**: you inherit everything — even methods you didn't want; if the parent changes a method for another purpose, all subclasses are affected; the "fragile base class" problem; leads to class hierarchies that grow to 5+ levels and become unreadable
- **Favour composition when**: you need to mix and match behaviours (a user can be both an admin AND a subscriber — multiple roles can't be modelled cleanly with single inheritance); you want to change behaviours at runtime (swap payment method without creating a new Order subclass); different combinations of behaviours are needed (a `NotificationService` can use email + SMS + push — any combination)
- **Use inheritance when**: there is a genuine IS-A relationship that won't change; the child extends (enriches) the parent's behaviour without overriding core methods; the hierarchy is shallow (max 2 levels in practice); think carefully at 3+ levels deep — that's a code smell
- **React applies this principle**: React components are composed (a `Button` is used inside `Modal`), not extended; there's no `SpecialButton extends Button` in idiomatic React; props and children are DI at the component level = composition

---

## 1. One-Line Definition
Composition over inheritance means building complex behaviour by combining simple objects (each with a single responsibility) rather than creating deep inheritance hierarchies, because composition is more flexible, less coupled, and easier to change at runtime.

---

## 2. The Problem It Solves

### The Inheritance Explosion Problem

```
Scenario: Duck simulator game

Early design:
  Duck (base)
    - quack()
    - swim()
    - display()

Requirements grow:
  Some ducks fly, some don't
  Some quack, some squeak, some are silent
  Some are real ducks, some are rubber ducks, some are decoys

Inheritance attempt:
  Duck
    FlyingDuck (adds fly())
      QuackingFlyingDuck
        MallardDuck (flies + quacks)
        Decoy (flies but display is different)
      SqueakingFlyingDuck
        ToyDuck
    NonFlyingDuck
      RubberDuck (squeaks, doesn't fly)
      WoodenDuck (silent, doesn't fly)

Result: 8 classes for 3 ducks. Adding a "sometimes flies" duck requires MORE classes.
Every new combination = new class. The hierarchy is wrong.
```

### Composition Solution

```
Behaviours as injectable interfaces:
  FlyBehaviour: FlyWithWings | NoFly | FlyWithRocket (runtime swappable!)
  QuackBehaviour: Quack | Squeak | MuteQuack

Duck has-a FlyBehaviour and QuackBehaviour:
  Duck { FlyBehaviour flyB; QuackBehaviour quackB; }

Classes needed: 1 Duck class (or 3 concrete duck types) + 3 + 3 behaviour classes = 7
But: ANY combination works without new classes. Rubber duck gets NoFly + Squeak injected.
A decoy duck can have its FlyBehaviour switched at runtime to FlyWithRocket.
```

---

## 3. How It Works Internally

### Before — Deep Inheritance

```java
// ❌ Deep inheritance: UserAccount → PremiumUser → PremiumUserWithTrial → ...

class UserAccount {
    protected String email;
    public void sendWelcomeEmail() { /* SMTP */ }
    public boolean canAccess(Feature f) { return false; }
}

class PremiumUser extends UserAccount {
    @Override
    public boolean canAccess(Feature f) { return f.tier() <= Tier.PREMIUM; }
    public void generateInvoice() { /* billing logic */ }
}

class PremiumUserWithTrial extends PremiumUser {
    private LocalDate trialEnd;
    @Override
    public boolean canAccess(Feature f) {
        if (LocalDate.now().isBefore(trialEnd)) return true;
        return super.canAccess(f);  // ← depends on parent's implementation detail
    }
}
// 3 levels deep and already fragile. Adding "trial for basic users" requires ANOTHER branch.
```

### After — Composition

```java
// ✅ Compose behaviours instead

interface AccessPolicy { boolean canAccess(Feature f); }
interface BillingPolicy { Invoice generateInvoice(UserAccount user); }

// Behaviour implementations
record TrialAccessPolicy(LocalDate trialEnd) implements AccessPolicy {
    public boolean canAccess(Feature f) { return LocalDate.now().isBefore(trialEnd); }
}
record TierAccessPolicy(Tier tier) implements AccessPolicy {
    public boolean canAccess(Feature f) { return f.tier().ordinal() <= tier.ordinal(); }
}
record FallbackAccessPolicy(AccessPolicy primary, AccessPolicy fallback) implements AccessPolicy {
    public boolean canAccess(Feature f) {
        return primary.canAccess(f) || fallback.canAccess(f);
    }
}

// ✅ One UserAccount class; behaviour is composed
record UserAccount(String email, AccessPolicy access, BillingPolicy billing) {
    public boolean canAccess(Feature f) { return access.canAccess(f); }
    public Invoice generateInvoice()    { return billing.generateInvoice(this); }
}

// Usage: trial user with premium fallback
UserAccount trialUser = new UserAccount(
    "user@example.com",
    new FallbackAccessPolicy(
        new TrialAccessPolicy(LocalDate.now().plusDays(30)),
        new TierAccessPolicy(Tier.PREMIUM)
    ),
    new MonthlyBillingPolicy()
);

// Runtime swap: trial expired, downgrade to basic
// trialUser = new UserAccount(email, new TierAccessPolicy(Tier.BASIC), billing);
// No subclass created. Just new object with different injected policy.
```

---

## 4. The Code

### Wrong Way — Inheritance Creating a Fragile Hierarchy

```java
// ❌ Connection to SAP enterprise reporting — inheritance explosion

class Report {
    protected ReportData data;
    public String render() { return "plain text"; }
    public void save() { /* save to DB */ }
    public void email(String recipient) { /* send email */ }
}

class PdfReport extends Report {
    @Override public String render() { return "PDF bytes"; }
}

class CsvReport extends Report {
    @Override public String render() { return "CSV string"; }
}

// New requirement: reports that can be both emailed AND uploaded to S3
class S3PdfReport extends PdfReport {  // ❌ Are we inheriting S3 + PDF + Report?
    public void uploadToS3() { /* S3 logic */ }
    // ❌ Now inherits Report.email() even though we only want S3 delivery
    // ❌ 4 classes: Report, PdfReport, CsvReport, S3PdfReport
    //    Next: S3CsvReport? FtpPdfReport? 2^N explosion
}
```

### Right Way — Composition

```java
// ✅ Compose: format + delivery separately

interface ReportFormat { byte[] render(ReportData data); }
interface ReportDelivery { void deliver(byte[] content, String destination); }

// Formats — independent, composable
class PdfFormat  implements ReportFormat  { public byte[] render(ReportData d) { ... } }
class CsvFormat  implements ReportFormat  { public byte[] render(ReportData d) { ... } }
class ExcelFormat implements ReportFormat { public byte[] render(ReportData d) { ... } }

// Delivery channels — independent, composable
class EmailDelivery implements ReportDelivery { public void deliver(byte[] c, String dest) { ... } }
class S3Delivery   implements ReportDelivery  { public void deliver(byte[] c, String dest) { ... } }
class FtpDelivery  implements ReportDelivery  { public void deliver(byte[] c, String dest) { ... } }

// ✅ One ReportService; ANY combination works without new classes
@Service
class ReportService {
    public void generateAndDeliver(ReportData data, ReportFormat format, ReportDelivery delivery,
                                   String destination) {
        byte[] rendered = format.render(data);
        delivery.deliver(rendered, destination);
    }
}

// Caller:
// reportService.generateAndDeliver(data, new PdfFormat(), new S3Delivery(), "s3://bucket/path");
// reportService.generateAndDeliver(data, new CsvFormat(), new EmailDelivery(), "admin@sap.com");
// 3 formats × 3 delivery channels = 9 combinations, zero new classes
```

```typescript
// ✅ TypeScript — React composition vs "inheritance" via props

// ❌ Conceptual "inheritance" thinking in React
// class SpecialButton extends Button { ... }  ← this is not idiomatic React

// ✅ Composition: children prop + render props
interface ButtonProps {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ onClick, disabled, children }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
);

// Composed from Button — no inheritance
const PrimaryButton: React.FC<Omit<ButtonProps, 'className'>> = (props) => (
    <Button {...props} />
);

// A modal composed from simpler parts — not inherited from a BaseModal
const ConfirmModal: React.FC<{ onConfirm: () => void; onCancel: () => void; title: string }> = 
    ({ onConfirm, onCancel, title }) => (
    <Modal>
        <Modal.Header>{title}</Modal.Header>
        <Modal.Footer>
            <Button onClick={onCancel}>Cancel</Button>
            <PrimaryButton onClick={onConfirm}>Confirm</PrimaryButton>
        </Modal.Footer>
    </Modal>
);
// Each component has ONE responsibility; composed together to form complex UI
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you still use inheritance over composition?"

**Hruday's answer:**
> When there's a genuine IS-A relationship where the child truly specializes the parent without overriding its core contract. For example, `ArrayList extends AbstractList` — an ArrayList IS a List, and AbstractList provides default implementations for methods that ArrayList customizes. The hierarchy is shallow (one or two levels), and the relationship is stable — ArrayList will always be a List.
>
> In domain code, I'm very cautious: `AdminUser extends User` is tempting but often wrong — admin users also have trial periods, premium subscriptions, etc., and the role changes at runtime. Composition handles these cases.
>
> My rule of thumb: use inheritance for framework extension points and stable "is-a" hierarchies (max 2 levels). Use composition for domain behaviour that varies, combines, or changes at runtime.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the fragile base class problem?"

**Hruday's answer:**
> When a base class is widely subclassed, any change to the base class can break subclasses in unexpected ways — even if the change looks safe and well-intentioned.
>
> Example: `UserAccount.sendEmail()` works with an SMTP client. A subclass `TrialUser` overrides it to also log the event. A developer optimises `UserAccount.sendEmail()` by switching to an async email queue. Now `TrialUser.sendEmail()` inherits the async change but the logging in the override assumes the email was synchronous. The log message now appears before the email is actually sent.
>
> The base class changed for performance reasons. The subclass broke for unrelated reasons. This is the fragility: subclasses depend not just on what the parent declares (the interface) but on HOW it implements things (the implementation detail).
>
> Composition avoids this: `NotificationService` is injected, not inherited. Changing `NotificationService` doesn't change `UserAccount` because they're separate objects communicating through an interface.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Composition always beats inheritance" | "Use composition everywhere" | Composition is not universally superior; template method pattern and abstract classes are legitimate uses of inheritance where the superclass defines the algorithm skeleton and subclasses fill in specific steps — removing inheritance here makes the code more complex with unnecessary injection; the principle is "FAVOUR" composition, not "ALWAYS"; Java collections, Spring framework code, JPA entities with mapped superclasses — all use inheritance appropriately where the hierarchy is shallow, stable, and represents a genuine IS-A relationship |
| Runtime behaviour swapping sounds impractical | "Swapping strategies at runtime is rare" | It's common in real products: a/b testing (swap the recommendation algorithm for 50% of users at runtime); feature flags (swap the payment gateway when the primary is down); user preferences (user switches their notification preference from email to SMS — swap NotificationPolicy without creating a new account object); all of these represent runtime composition, and inheritance simply cannot model them without creating exponentially more classes |
| Confusing composition with aggregation | "Composition means the composed objects are destroyed together" | UML makes a distinction (in composition the child cannot exist without the parent; in aggregation it can), but in interviews and daily engineering discussions "composition" means "has-a relationship with injected dependencies" — the GoF Design Patterns book, "Head First Design Patterns", and SOLID literature all use composition to mean injecting behaviour objects; the UML lifecycle distinction is interesting but rarely relevant in an OOP design discussion |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, our export pipeline had grown to 11 classes in a 4-level inheritance tree: `ExportJob → ScheduledExportJob → FilteredScheduledExportJob → ...`. Adding a new format (Parquet) required adding a class at every affected level — four new classes for one new format.
>
> I rewrote the pipeline with composition: `ExportJob` had an injected `FormatStrategy`, `FilterSpec`, and `DeliveryTarget`. Adding Parquet = one `ParquetFormatStrategy` class. The existing `ExportJob` class, unchanged, gained Parquet support via the new injection.
>
> More importantly: a stakeholder asked if we could preview (render without delivering) and then deliver separately. With the old inheritance tree, 'preview' would require another parallel hierarchy. With composition: `ExportPreviewService` reuses `FormatStrategy` without any `DeliveryTarget`. Same behaviour objects, composed differently."

---

## 8. Scale Evolution

**1,000 users →** Composition in class design. Spring bean injection. Flexible enough for most feature changes.

**100,000 users →** Composition at the service level — instead of a "UserMonolith" service that handles profiles, billing, and authentication, separate services each responsible for one concern. Service-level composition via API calls. Same principle, larger grain.

**10 million users →** Platform thinking: a plugin architecture (like VS Code extensions or Kafka connectors) is the composition principle at scale — new behaviour is added by writing a new plugin (a new implementation) that plugs into a stable host interface. The host never changes for new plugins. This is exactly OCP + composition working together.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment methods as composed policies (not subclassed OrderTypes); runtime swapping of payment gateway on failure; modular fee calculation composing base + surcharge + discount policies | Runtime composition; avoid subclass explosion |
| Swiggy / Meesho | Discount system: compose base price + category discount + coupon + loyalty in any combination; restaurant menu items with variant behaviours (veg vs non-veg addons, portion sizes) — composition vs inheritance in item hierarchy | Discount composition; compare n subclasses vs n policy objects |
| Adobe / Microsoft | Senior rounds probe understanding of "why not inheritance?"; candidates expected to articulate fragile base class problem; React composition model is a frontend version of the same principle | Fragile base class articulation; React as composition example |
| SAP Labs | Export pipeline inheritance → composition refactor (4-level tree → injected strategies); Parquet format story; preview vs deliver reuse of same FormatStrategy | Concrete refactor story; class count reduction; new requirement handled clean |

---

## 10. Related Topics — What to Study Next

- **Topic 286 — SOLID** — composition aligns with the Open/Closed and Dependency Inversion principles; understanding SOLID makes the motivation for composition explicit: OCP says new behaviour should come via new classes (extension), which is what composition enables — new behaviour objects injected without changing the host class
- **Topic 298 — Strategy Pattern** — the Strategy pattern is "composition of interchangeable algorithms made formal"; `SortStrategy`, `DiscountStrategy`, `PaymentStrategy` — all named patterns that implement composition over inheritance for swappable behaviour
- **Topic 296 — Proxy Pattern** — Spring AOP (transactions, caching, security) uses the Proxy pattern to add behaviour to existing classes without modifying them; the proxy wraps the target (composition!), delegating calls and adding cross-cutting concerns; understanding composition makes the proxy pattern immediately intuitive

---

*Part 18 · Composition Over Inheritance · Full Stack Interview Guide · Hruday D · 2026*
