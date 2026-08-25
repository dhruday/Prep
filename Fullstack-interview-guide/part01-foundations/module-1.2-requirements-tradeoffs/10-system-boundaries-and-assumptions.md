# System Boundaries and Assumptions
> Part 1 — Full Stack Mindset & Interview Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- A system boundary defines what is inside your system (you own it) and what is outside (someone else owns it, you call it via API or event).
- Assumptions are the decisions you make about unknowns — state them explicitly so the interviewer knows your context.
- The interview trap: designing a system with unclear system boundaries and then arguing about who handles edge cases that were never scoped.
- Always draw what is inside your box and what is outside: external services (email providers, payment gateways, push notification services) live outside.
- Your SAP micro-frontend experience gives you real system boundary thinking — each team's app was a boundary.

---

## 1. One-Line Definition
A system boundary defines where your system ends and another system begins. Assumptions are explicit statements of what you believe to be true when information is missing — stated upfront so your design hangs together logically.

---

## 2. The Problem It Solves

An interviewer asks: "Design a ride-sharing app." A candidate starts designing. 10 minutes in, the interviewer asks: "How does the app send the driver's location to the rider?" The candidate says: "I'd use SMS." The interviewer asks: "What if the rider's phone has no signal?" The candidate is confused — they hadn't decided if SMS is inside their system or an external dependency.

Another candidate designs the same system but handles 30 minutes of the interview before the interviewer asks: "Does your matching service handle payment?" The candidate says: "Yes, I added a payment module." The interviewer says: "We already have a payment system — you didn't need to design that." Half the candidate's work was wasted on a component that was out of scope.

Both candidates failed because they never drew clear system boundaries at the start.

Setting system boundaries in the first 5 minutes stops you from designing components you don't need and saves you from gaps in components you do need.

---

## 3. How It Works Internally

### The Mental Model
Think of a system boundary like a company's departments. HR handles hiring, payroll, and people management. Finance handles budgets and accounting. IT handles infrastructure. Each department has a clear boundary — HR doesn't manage servers, IT doesn't write salary cheques. And each department talks to the others through defined interfaces.

Your system is one department. You define what it does. Everything outside it is another department — you call them, but you don't own them.

In system design: your system has a clear input (what requests come in) and a clear output (what responses go out or what events are published). External services like SendGrid for email, Twilio for SMS, Stripe for payments, and Firebase for push notifications live outside your system boundary. You call them, but you don't design them.

### The Mechanism — Step by Step

**Step 1: Define what is in scope.**
Ask explicitly: "Which features am I designing?" State them. "I'll design the user authentication, ride request, driver matching, and real-time tracking. Out of scope: payment processing (existing system), customer support, and admin tooling."

**Step 2: Draw the external boundaries.**
List every external system your system calls or receives data from:
- Push notification → Firebase/FCM (external).
- Payment processing → Stripe or internal payment team (external).
- Maps and routing → Google Maps API (external).
- Email → SendGrid (external).
- Your system calls all of these but does not own them.

**Step 3: State your assumptions.**
Any unknown becomes an assumption. State it out loud. "I'm assuming:
- All users have smartphones with internet access.
- Payment is handled by a separate internal service, I only need to call their API.
- The matching algorithm needs to respond within 3 seconds.
- Drivers are online and active — I don't design the driver availability tracking."

**Step 4: Draw the boundary box.**
On the whiteboard, literally draw a box. Inside: your system's components. Outside: external services and systems. Arrows show which direction data flows across the boundary.

**Step 5: Validate your scope.**
Ask the interviewer: "Does this scope match your expectations? I want to make sure I'm designing the right parts before I go deeper."

### ASCII Diagram

```
SYSTEM BOUNDARY EXAMPLE — Ride Sharing App:
──────────────────────────────────────────────────────────────────────────

OUTSIDE YOUR SYSTEM (external dependencies):
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Google Maps API │   │ Firebase/FCM     │   │  Payment Service │
│  (routing, ETAs) │   │ (push notifs)    │   │  (internal team) │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │ called by            │ called by             │ called by
─────────────────── YOUR SYSTEM BOUNDARY ──────────────────────────────
         ↓                      ↓                       ↓
┌──────────────────────────────────────────────────────────────────┐
│  YOUR SYSTEM (you design everything inside this box)             │
│                                                                  │
│   ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│   │ Auth Service│    │ Ride Service  │    │ Matching Service   │  │
│   │ JWT + OAuth │    │ request/status│    │ driver assignment  │  │
│   └─────────────┘    └──────────────┘    └────────────────────┘  │
│                                                                  │
│   ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│   │ Location    │    │ Notification │    │ API Gateway        │  │
│   │ Service     │    │ Service      │    │ (entry point)       │  │
│   └─────────────┘    └──────────────┘    └────────────────────┘  │
│                                                                  │
│   Databases owned by this system: Rides DB, Users DB,           │
│   Location DB (Redis), Notifications log DB                     │
└──────────────────────────────────────────────────────────────────┘
         ↑
   Boundary established upfront → no scope creep, no gaps
──────────────────────────────────────────────────────────────────────────

COMMON ASSUMPTIONS TO STATE EXPLICITLY:
──────────────────────────────────────────────────────────────────────────
  √ "I'm assuming payment is out of scope — handled by another team."
  √ "I'm assuming users are in a single country/timezone for simplicity."
  √ "I'm assuming peak is 3x average based on typical app traffic patterns."
  √ "I'm assuming drivers and riders are authenticated via existing OAuth."
  √ "I'm assuming eventual consistency is acceptable for non-critical reads."
  ✗ Don't assume in silence — state assumptions out loud.
──────────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Trying to handle everything inside one system — no clear boundary

@Service
public class RideService {

    // This service is doing too much — no system boundary thinking
    // It's handling ride logic AND payment AND email AND SMS AND mapping
    // This is not the "ride service" — it's the "whole app" service

    public RideConfirmation createRide(RideRequest request) {
        // Ride logic
        Ride ride = new Ride(request);
        rideRepository.save(ride);

        // Calculating route — should this be an external Maps API call?
        // Or a separate internal routing service? Not decided.
        Route route = calculateRoute(request.getPickup(), request.getDropoff());

        // Charging payment — should this be synchronous? What if it fails?
        // Is this the payment team's responsibility or ours?
        chargePayment(request.getUserId(), request.getEstimatedFare());

        // Sending email — are we using SendGrid? Internal email service?
        // The boundary is unclear.
        emailService.sendConfirmation(request.getEmail(), ride);

        return new RideConfirmation(ride, route);
    }
}
```
> **Why this fails in production:** No system boundary = one service that owns too many concerns. When payment fails, does the ride cancel? Who owns that? When email fails, does the ride fail? These questions are unanswerable without clear boundaries.

### Right Way — Production Quality (explicit system boundaries)
```java
// Clean system boundaries — each service has one responsibility
// External services are called through explicit adapters

@Service
public class RideService {

    // Internal service — we own this
    private final RideRepository rideRepository;
    // Internal service — we own this
    private final MatchingService matchingService;
    // Internal service — we own this (publishes Kafka events)
    private final EventPublisher eventPublisher;

    // External service adapter — we CALL this but don't own it
    // Payment is the payment team's business boundary
    // We only trigger it, not own it.
    private final PaymentServiceClient paymentClient;

    public RideConfirmation requestRide(RideRequest request) {
        // 1. Create and persist ride (our boundary)
        Ride ride = Ride.builder()
            .riderId(request.getRiderId())
            .pickup(request.getPickup())
            .dropoff(request.getDropoff())
            .status(RideStatus.REQUESTED)
            .build();
        rideRepository.save(ride);

        // 2. Find driver (our boundary — matching algorithm)
        Driver driver = matchingService.findNearestAvailableDriver(
            request.getPickup(),
            5 // km radius — assumption: drivers within 5km are reachable
        );

        if (driver == null) {
            ride.setStatus(RideStatus.NO_DRIVER_FOUND);
            rideRepository.save(ride);
            return RideConfirmation.noDriver(ride);
        }

        // 3. Assign driver and update status (our boundary)
        ride.setDriverId(driver.getId());
        ride.setStatus(RideStatus.DRIVER_ASSIGNED);
        rideRepository.save(ride);

        // 4. Publish event for downstream services (publish, don't call directly)
        // Push notification is handled by notification service (separate boundary).
        // Email is handled by notification service (separate boundary).
        // Route calculation is handled by location service (separate boundary).
        // We just publish the event — others consume it.
        // This is why event-driven architectures give clean boundaries.
        eventPublisher.publish(new RideAssignedEvent(
            ride.getId(), driver.getId(), request.getRiderId()
        ));

        // 5. Pre-authorise payment (external boundary — payment team owns this)
        // We only pre-auth to ensure the rider has funds.
        // Actual charge happens at ride completion (payment service event consumer).
        // ASSUMPTION: payment service is reliable enough that a failed pre-auth
        // here is a valid reason to cancel the ride. We don't retry silently.
        try {
            String authCode = paymentClient.preAuthorise(
                request.getRiderId(),
                ride.getEstimatedFare()
            );
            ride.setPaymentAuthCode(authCode);
            rideRepository.save(ride);
        } catch (PaymentException e) {
            ride.setStatus(RideStatus.PAYMENT_FAILED);
            rideRepository.save(ride);
            return RideConfirmation.paymentFailed(ride);
        }

        return RideConfirmation.success(ride, driver);
    }
}
```

> **Key decisions here:**
> - Push notifications, email, SMS are all handled by a separate Notification Service — called via Kafka event, not directly
> - Payment client is an explicit external boundary — a named adapter, not an inline call to Stripe
> - Route calculation is delegated to a Location Service — not inline in the Ride Service
> - The assumptions in comments tell the next engineer exactly what was decided and why

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you scope a system design problem before starting to design?"

**Hruday's answer:**
> The first thing I do is define what I'm building and what I'm not building. I ask: what are the three or four core user-facing features? Those are in scope. Anything else is out of scope unless explicitly required.
>
> Then I identify the external systems — the services or APIs that already exist and that mine will call. Payment providers, email services, push notification platforms, maps APIs. These are not mine to design. I draw a line around my system and they sit outside that line.
>
> Finally I state my assumptions. "I'm assuming mobile clients are the primary interface. I'm assuming a separate auth service already exists. I'm assuming payments are handled by your existing payment team — I'll integrate with their API, not build payment processing." I say this out loud so the interviewer can correct me immediately if I've got it wrong.
>
> This scoping takes 3–4 minutes and prevents 20 minutes of designing the wrong thing. At SAP, every new module in the micro-frontend architecture had an explicit boundary — which teams owned which apps, which APIs were shared, which were private. That same discipline maps directly into system design interviews.

---

### Q2 — Deep Dive
**Interviewer asks:** "Design the boundary between your ride-matching service and the mapping service. What exactly does each own?"

**Hruday's answer:**
> The ride-matching service owns: the algorithm for selecting which driver to assign to which ride, the state of each ride (requested, assigned, in-progress, completed), and the assignment record (driver + ride + timestamp).
>
> The mapping service owns: calculating ETAs, drawing routes, resolving addresses to coordinates, and serving map tiles to the client.
>
> The boundary is clear: matching calls into mapping when it needs an ETA estimate to rank nearby drivers. The matching service says "I have a driver at location A and a rider at location B — how many minutes?" The mapping service responds. Matching uses that number to prioritise the closest driver. Matching never calculates a route itself.
>
> The contract between them: matching calls a Maps API or an internal routing service with two coordinates and gets back an ETA in seconds. That's the full interface — two points in, one number out. Matching doesn't know if it's Google Maps, OpenStreetMap, or an internal algorithm. It just knows the contract.
>
> The failure mode: if mapping is slow or down, matching falls back to straight-line distance as a rough ETA estimate. Driver assignment doesn't block on mapping — it degrades gracefully.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When should you call an external service synchronously vs asynchronously? How does that affect your system boundaries?"

**Hruday's answer:**
> Call it synchronously when the user is waiting for the result in that same request and you need the answer right now to continue. Payment pre-authorisation during checkout — you can't confirm the order without knowing the payment is approved. You call it synchronously and you wait.
>
> Call it asynchronously when the user doesn't need the result in that request, or when the external service is slow and unreliable. Sending a confirmation email after an order — the user doesn't need to wait for SendGrid to accept the email before you show them "order confirmed." Publish a Kafka event, let the email worker consume it, the user gets a response in 100ms instead of 800ms.
>
> The system boundary implication: synchronous calls couple your system's latency and availability to the external service. If payment pre-auth takes 2 seconds, your checkout API takes 2 seconds. If payment service is down, your checkout is down. This is the cost of synchronous cross-boundary calls.
>
> Asynchronous calls decouple your availability from the external service. If the email service is down, your order still completes — the email just gets delivered late once the service recovers. The boundary is looser — both sides can evolve independently.
>
> Rule of thumb: synchronous for critical decisions (auth, payment auth, inventory reservation). Asynchronous for notifications, analytics, secondary workflows.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You're designing a food order system. What's in your system boundary and what's outside it?"

**Hruday's answer:**
> In scope for my order system:
> - Order creation and management (cart to placed to confirmed to ready to picked up to delivered)
> - Delivery agent assignment (similar to ride matching)
> - Order status tracking and push to the customer
> - Real-time order state machine (ordered → preparing → ready → picked up → delivered)
>
> Out of scope, handled externally:
> - Restaurant menu management → the restaurant service owns menus. I call their API to get current menu and prices.
> - Payment processing → the payment service owns charging. I call their pre-auth API at checkout and charge API at confirmation.
> - Push notifications → the notification service owns delivery. I publish events, they send push/SMS/email.
> - Maps and ETAs → the location service. I ask for driver-to-restaurant ETA and restaurant-to-customer ETA.
> - User authentication → the auth service. I validate JWTs but I don't issue them.
>
> Assumptions I'd state:
> - Payment service is synchronous and available — no order confirmed without payment auth.
> - Restaurant confirms orders manually within 2 minutes — my system polls or waits for a confirm event.
> - Real-time location updates from delivery agent arrive every 5 seconds — from the location service.
>
> Drawing these boundaries first means I spend the interview designing what matters — the order state machine, the database schema, and the delivery matching logic — not re-designing a payment system that already exists.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Designing everything | Builds payment, email, maps API inside their system | "Payment is a separate team/service — I'll integrate with their API, not design it here." |
| Silent assumptions | Designs for single-region, single-currency without saying so | "I'm assuming this is India-only, single currency, for now. Multi-region would change the consistency model." |
| No scope exclusion | Doesn't say what is out of scope | "Out of scope: admin panel, analytics dashboard, fraud detection — these are separate concerns I won't design today unless you want me to." |
| Boundary drift | Starts adding features mid-design without noting the scope change | "This would extend my scope — should I include it? Let me note it and come back if we have time." |

---

## 7. Hruday's Real Experience Hook

> "At SAP, the micro-frontend architecture I designed was fundamentally about system boundaries. Each team's application was a bounded domain — the Shopping team owned their product listing and cart MFE, the Account team owned profile and settings, the Shell team owned navigation and routing. The boundaries were explicit in the Module Federation configuration. When a team needed to call into another team's domain, they did it through a shared API, not by importing components directly. That same thinking — explicit ownership, defined interfaces, no cross-boundary leakage — is exactly what system boundary setting in interviews is about."

---

## 8. Scale Evolution

**1-person project →** System boundaries don't matter much — you own everything. The value is in knowing which external services you're calling (payment, email, maps) so you can mock them in tests.

**5-person team →** System boundaries prevent stepping on each other's toes. "You own auth, I own orders, they own payment" — each boundary is a team's ownership zone.

**50-person engineering org →** System boundaries are enforced architecture. No team imports code from another team's database directly. Everything goes through APIs and events. Violations break on-call schedules and release independence.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment is a strict domain boundary — crossing it incorrectly causes compliance and audit failures | "Where does your system stop and the payment authorization system start? What's the exact API contract?" |
| Swiggy / Meesho | Order management, restaurant service, delivery, and catalog are separate domains | "Who owns the restaurant menu data? If the menu service is down, what does your order service do?" |
| Adobe / Microsoft | Platform products have SDK boundaries — what is the host system and what is the plugin/extension? | "How does your design handle third-party integrations? What can they see, what is private?" |
| Remote / Global roles | Design documents need explicit boundary definitions — async teams need this in writing | "In your RFC, how do you describe what your service owns vs what it depends on?" |

---

## 10. Related Topics — What to Study Next

- **Requirement Clarification Framework (Topic 12)** — The full 5-minute opening of a system design interview — boundaries and assumptions are part of this framework.
- **Microservices Service Decomposition (Part 4)** — How to split a system into services — each service is a system boundary by definition.
- **Domain-Driven Design Basics (Part 4)** — DDD's bounded context is the formal vocabulary for system boundaries. "Bounded context" = one team's system boundary.
- **API Gateway Pattern (Part 4)** — The API gateway sits at your system's outer boundary — all external calls enter here.
- **Outbox Pattern (Part 4)** — How to reliably publish events across system boundaries without losing messages.

---

*Part 1 · System Boundaries and Assumptions · Full Stack Interview Guide · Hruday D · 2026*
