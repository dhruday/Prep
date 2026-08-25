# HLD vs LLD — Knowing Which One the Interviewer Wants
> Part 1 — Full Stack Mindset & Interview Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- HLD (High Level Design) = the boxes and arrows — what the major components are and how they connect.
- LLD (Low Level Design) = the code structure — class diagrams, method signatures, data models, algorithms.
- Ask the interviewer which one they want in the first 2 minutes. Don't assume.
- If they say "design a URL shortener" without context → default to HLD first, then offer LLD.
- The trap: drawing a detailed class diagram when they wanted a system architecture, or drawing boxes when they wanted a database schema.

---

## 1. One-Line Definition
HLD shows how a system is divided into major services and how they talk to each other. LLD shows how each service is built internally — its classes, methods, data models, and algorithms.

---

## 2. The Problem It Solves

Two candidates both receive: "Design a ride-sharing system like Ola."

Candidate A draws boxes. Driver service, rider service, matching service, location service, database, Kafka. Arrows showing API calls and events. Clean, clear. The interviewer wanted a class diagram for the matching algorithm. Time is up.

Candidate B starts drawing UML class diagrams. `DriverRepository`, `RideRequest`, `MatchingStrategy` interface with two implementations. The interviewer wanted a system architecture. "Where's the database? What about the messaging layer?" Time is up.

Both studied hard. Neither asked the right question at the start.

The fix is simple: spend the first 2 minutes understanding what level of design the interviewer wants. Then deliver exactly that. HLD and LLD are not interchangeable. Knowing which one to produce — and when to transition between them — is a senior skill that most candidates skip.

---

## 3. How It Works Internally

### The Mental Model
HLD is like an architect's blueprint of a building — it shows the floors, the rooms, the entrance, the structure. LLD is like the plumber's schematic — it shows exactly where each pipe runs, what diameter they are, how the valves work. Both are needed to build the building. But if you ask for the floor plan and you get the plumbing diagram instead, you can't use it.

HLD = the floor plan. LLD = the plumbing schematic.

### The Mechanism — Step by Step
Here is how to detect and handle HLD vs LLD in any interview:

**To detect which one they want:**
1. Listen for the question type:
   - "Design a system for..." → almost always HLD.
   - "Design the class structure for..." → LLD.
   - "How would you implement..." → LLD.
   - "How would you architect..." → HLD.
2. Ask directly: "Before I start — would you prefer a high-level system architecture or a more detailed component design?"
3. Read the role: senior/staff interviews tend to start with HLD. Coding rounds or mid-level interviews often start with LLD.

**HLD contains:**
- Services / components (boxes)
- Communication between them (arrows — REST, Kafka, gRPC)
- Databases and what each service owns
- Caching layers
- CDN, load balancers, API gateway
- Scale considerations (horizontal scaling, sharding)

**LLD contains:**
- Class diagrams — what classes exist and how they relate
- Method signatures — what each method accepts and returns
- Data models — the exact database schema (column names, types, indexes)
- Design patterns used (Strategy, Observer, Factory, etc.)
- Algorithm details (pagination, search, matching logic)
- Error handling and edge cases

**When to switch from HLD to LLD:**
- After the interviewer says "let's zoom into the matching service" → switch to LLD for that service.
- After drawing the architecture, offer: "Should I go deeper on any specific component?"

### ASCII Diagram

```
HLD — HIGH LEVEL DESIGN:
─────────────────────────────────────────────────────────────
  Client (Mobile/Web)
       ↓ HTTPS
  [API Gateway / Load Balancer]
       ↓
  ┌────────────┐   REST   ┌─────────────────┐
  │ Ride       │ ──────→  │ Matching        │
  │ Service    │          │ Service         │
  └────────────┘          └─────────────────┘
        ↓ Kafka event              ↓ reads
  [ride-requested topic]   [Driver Location DB]
        ↓                         (Redis GeoSearch)
  [Driver Service]
        ↓ WebSocket
  [Driver Mobile App]

HLD focus: what services exist, how they talk, what data store each owns.
─────────────────────────────────────────────────────────────

LLD — LOW LEVEL DESIGN (zooming into Matching Service):
─────────────────────────────────────────────────────────────
  Class: MatchingService
  ├── findNearbyDrivers(lat, lng, radiusKm): List<Driver>
  │     → calls Redis GEORADIUS command
  │     → returns max 10 drivers within 5km radius
  │     → sorted by distance ascending
  ├── scoreDriver(driver, rideRequest): double
  │     → distance weight: 0.6
  │     → rating weight: 0.3
  │     → acceptance rate weight: 0.1
  └── assignDriver(driverId, rideId): Assignment
        → writes to assignments table
        → publishes driver-assigned Kafka event

  Database schema (LLD):
  assignments:
    id            BIGSERIAL PRIMARY KEY
    ride_id       BIGINT NOT NULL REFERENCES rides(id)
    driver_id     BIGINT NOT NULL REFERENCES drivers(id)
    assigned_at   TIMESTAMPTZ DEFAULT now()
    status        VARCHAR(20) DEFAULT 'accepted'
    INDEX (ride_id)
    INDEX (driver_id, status)
─────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```
// Candidate misreads the question and delivers the wrong level

// QUESTION: "Design a notification system for a fintech app."
// WHAT THEY DELIVER (HLD when LLD was wanted, or vice versa):

// Wrong: Goes straight to class hierarchy when interviewer
// wanted a system architecture

class Notification { ... }
class PushNotification extends Notification { ... }
class EmailNotification extends Notification { ... }
class SMSNotification extends Notification { ... }
class NotificationFactory { ... }

// The interviewer is staring at this thinking:
// "But where does Kafka fit? How does this service scale?
//  What database stores notifications? What is the API?"
// → Wrong level delivered → time wasted → bad signal
```
> **Why this fails in production:** No one builds systems this way — they start with the architecture, then drill into implementation. Jumping to code/classes without the system picture signals you only think at the component level.

### Right Way — Production Quality
```
// STEP 1: Clarify level in the first 2 minutes (spoken, not written)
// "Before I start — are you looking for the system architecture
//  with the major services and data flow, or do you want me to design
//  the class structure and database schema for a specific component?"

// STEP 2: If HLD is requested, draw this:

/*
  HLD: Notification System

  [API Gateway]
       ↓
  [Notification Service] → Kafka topic: notification-events
       ↓                              ↓
  [notifications DB]         [Delivery Workers]
  (stores metadata,          ├── Push Worker (FCM/APNs)
   delivery status)          ├── Email Worker (SendGrid)
                             └── SMS Worker (Twilio)

  Each worker:
  - Consumes from Kafka
  - Delivers to external provider
  - Updates delivery status in DB
  - Retries on failure with exponential backoff
*/
```

```java
// STEP 3: If they say "go deeper on the Delivery Worker" → now switch to LLD

// LLD: NotificationDeliveryWorker (Spring Boot + Kafka Consumer)
@Service
public class PushNotificationWorker {

    private final FirebaseMessaging firebase;
    private final NotificationRepository repo;

    @KafkaListener(topics = "notification-events", groupId = "push-workers")
    public void process(NotificationEvent event) {
        // Only handle PUSH type — other workers handle EMAIL, SMS
        if (event.getType() != NotificationType.PUSH) return;

        try {
            // Build the FCM message — LLD detail
            Message message = Message.builder()
                .setToken(event.getDeviceToken())
                .setNotification(Notification.builder()
                    .setTitle(event.getTitle())
                    .setBody(event.getBody())
                    .build())
                .build();

            firebase.send(message);

            // Update status to DELIVERED
            repo.updateStatus(event.getId(), DeliveryStatus.DELIVERED);

        } catch (FirebaseMessagingException e) {
            // LLD edge case: failed delivery — mark for retry
            repo.updateStatus(event.getId(), DeliveryStatus.FAILED);
            // Dead letter queue handles persistent failures (LLD detail)
            throw new RetryableException("FCM delivery failed", e);
        }
    }
}
```

> **Key decisions here:**
> - HLD drawn first — all services, their relationships, and the Kafka flow
> - LLD only produced after the interviewer zooms in on a specific component
> - The transition from HLD to LLD is explicit — "Want me to go deeper on the delivery worker?"
> - LLD includes: method logic, error handling, status updates, Kafka consumer setup

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between HLD and LLD in system design?"

**Hruday's answer:**
> HLD is the system map — what services exist, how they communicate, what databases they use, and how the system handles scale. It's the answer to "what are the moving parts and how do they connect?"
>
> LLD is the implementation detail — the class structure, method signatures, database schema, and algorithms. It's the answer to "how exactly is this component built?"
>
> In practice, I always start HLD. Everyone needs to agree on the system structure before drilling into any single component. If I start with a class diagram before showing the system architecture, I might design the wrong abstraction — because I haven't yet decided if this is one service or two.
>
> In interviews, I clarify which one they want at the start. "Are you looking for the system architecture or a component-level design?" That question alone saves 15 minutes of going in the wrong direction.

---

### Q2 — Deep Dive
**Interviewer asks:** "When does a system design interview require both HLD and LLD, and how do you manage the time split?"

**Hruday's answer:**
> Most senior interview rounds want HLD first, then LLD for one component. The typical structure is: 10 minutes of HLD covering all services, then 15 minutes of LLD on the component the interviewer selects.
>
> The way I manage this: I deliberately keep the HLD phase quick. I name all the services, draw the data flow, and pick the databases — but I don't explain every component in detail. I'm building a map, not a manual.
>
> Then I explicitly offer: "I've covered the architecture at a high level. Should I go deeper on any specific component? I can detail the database schema, the matching algorithm, or the Kafka consumer logic." The interviewer picks, and I go deep.
>
> The mistake is spending 25 minutes on HLD and leaving no time for LLD. The other mistake is doing LLD immediately on the first component mentioned before the full architecture is visible. I've seen both kill good candidates.
>
> Time rule I follow: HLD takes max 40% of the design time, LLD takes the rest.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Do some companies care more about HLD and others more about LLD?"

**Hruday's answer:**
> Yes, absolutely. Company culture and role level strongly influence this.
>
> Startups and product companies like Razorpay, Swiggy, and Meesho tend to care more about HLD — they want to see you think about scale, reliability, and system boundaries. They're building distributed systems and want engineers who think end-to-end.
>
> Enterprise companies and organisations with large legacy codebases — think banking software or SAP-style ERP — often spend more time on LLD because they have strict design review processes. They want to see data models, class hierarchies, and interface contracts.
>
> Platform engineering and infrastructure roles lean HLD — you're designing systems other engineers build on, so the architecture matters more than implementation details.
>
> FAANG-style companies test both — but senior and staff interviews lean HLD, and they pick one area for deep LLD.
>
> My approach: lead with HLD, be ready to go LLD on demand. That works across all company types.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design a shopping cart for an e-commerce app. What level would you design it at?"

**Hruday's answer:**
> I'd start by clarifying: "Are you thinking about the system architecture — services, storage, and cart persistence — or the class/data model for the cart itself?"
>
> If they want HLD: Cart service is a lightweight microservice. Storage is Redis for active carts (fast reads, TTL-based expiry for abandoned carts) with a fallback to PostgreSQL for persisted cart state for logged-in users. The API has three endpoints: GET /cart, PUT /cart/item, DELETE /cart/item. Cart changes publish events to Kafka for inventory reservation downstream.
>
> If they want LLD: the cart data model is a JSONB column in Postgres — cart_id, user_id, items (array of {product_id, quantity, price_at_add_time}), created_at, updated_at. I'd choose JSONB because cart structure is flexible and doesn't need relational joins within the cart itself. The `price_at_add_time` field is key — prices change, the cart should show the price when the item was added, not the live price.
>
> That last detail — `price_at_add_time` — only comes from LLD thinking. HLD would never surface it. That's why both levels matter.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Not clarifying the level | Starts drawing immediately | "Quick question — are you looking for the system architecture or a component-level design? That shapes where I start." |
| HLD = just boxes | Draws vague boxes with arrows, no details | HLD must name specific technologies: "Kafka not just 'message queue', Redis not 'cache'." |
| LLD = UML for its own sake | Draws inheritance hierachies with no practical purpose | LLD should show decisions: "I'm using Strategy pattern here because the delivery type changes at runtime." |
| Forgetting to transition | Stays at HLD the whole interview | "I've covered the system view — want me to zoom into a specific component? The matching algorithm or the database schema?" |

---

## 7. Hruday's Real Experience Hook

> "At SAP, every new feature started with an HLD review — I'd draw the component diagram showing how the micro-frontend module connected to the backend APIs and the shared state store. Only after that did we move to LLD: the Redux slice shape, the API contract, the component interface. That same discipline is what I bring into interviews. Lead with the system, then drill into the component."

---

## 8. Scale Evolution

**Prototype stage →** Only LLD matters. One service, one database, one team. Architecture is irrelevant.

**Product-market fit stage →** HLD becomes critical. Teams split, services split, you need a system map so nobody builds in circles.

**Scale stage (millions of users) →** HLD governs every architectural decision. LLD is delegated — team leads design components, engineers implement. Staff engineers spend most of their time in HLD.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | System design rounds test HLD first — payments require service boundaries around auth, ledger, compliance, and notification | Can you draw the full payment system before touching any component detail? |
| Swiggy / Meesho | Order management systems require HLD across discovery, cart, ordering, delivery — full system view required before LLD | Do you understand which services own which data? |
| Adobe / Microsoft | LLD matters in API design and SDK design — they care about clean class contracts | Can you design a clean SDK or plugin API with good abstractions? |
| Remote / Global roles | Design documents matter — teams work async and need both HLD (for alignment) and LLD (for implementation) written down | Can you produce a design doc that covers both levels clearly? |

---

## 10. Related Topics — What to Study Next

- **Requirement Clarification Framework (Topic 12)** — HLD starts after requirements are clear — this topic shows how to get there fast.
- **System Design Case Studies (Part 19)** — Practise HLD on real systems: URL shortener, notification system, chat, feed.
- **Deep vs Wide in Interviews (Topic 4)** — HLD = wide. Moving to LLD = going deep. The same framework, different vocabulary.
- **Microservices Foundations (Part 4)** — HLD for microservices — how to draw service boundaries correctly instead of just drawing boxes.
- **Database Schema Design (Part 5)** — LLD's most important artefact — schema design is often where LLD interviews go deep.

---

*Part 1 · HLD vs LLD · Full Stack Interview Guide · Hruday D · 2026*
