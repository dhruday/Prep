# Razorpay — Senior FullStack Developer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior FullStack Developer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 2: FullStack Coding — Subscription Billing Engine

### Problem
Design and implement a subscription billing engine:
1. Create subscription plans with pricing tiers (monthly, yearly)
2. Subscribe customers to plans with billing cycle management
3. Invoice generation at billing cycle start
4. Payment collection with retry on failure
5. Proration when upgrading/downgrading mid-cycle
6. Trial period support with auto-conversion
7. Webhook notifications for billing events

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

// ============================================================
// DOMAIN
// ============================================================

enum BillingCycle { MONTHLY, YEARLY }

enum SubscriptionStatus { TRIALING, ACTIVE, PAST_DUE, CANCELLED, EXPIRED }

enum InvoiceStatus { DRAFT, OPEN, PAID, FAILED, VOID }

class Plan {
    private final String id;
    private final String name;
    private final Map<BillingCycle, Long> pricing; // amount in paise
    private final int trialDays;

    Plan(String id, String name, int trialDays) {
        this.id = id;
        this.name = name;
        this.pricing = new EnumMap<>(BillingCycle.class);
        this.trialDays = trialDays;
    }

    Plan setPrice(BillingCycle cycle, long paise) { pricing.put(cycle, paise); return this; }
    String getId() { return id; }
    String getName() { return name; }
    long getPrice(BillingCycle cycle) { return pricing.getOrDefault(cycle, 0L); }
    int getTrialDays() { return trialDays; }
}

class Subscription {
    private final String id;
    private final String customerId;
    private String planId;
    private BillingCycle cycle;
    private SubscriptionStatus status;
    private LocalDate startDate;
    private LocalDate currentPeriodStart;
    private LocalDate currentPeriodEnd;
    private LocalDate trialEnd;
    private int failedPaymentCount;

    Subscription(String id, String customerId, String planId, BillingCycle cycle, LocalDate start) {
        this.id = id;
        this.customerId = customerId;
        this.planId = planId;
        this.cycle = cycle;
        this.startDate = start;
        this.failedPaymentCount = 0;
    }

    // Getters & setters
    String getId() { return id; }
    String getCustomerId() { return customerId; }
    String getPlanId() { return planId; }
    void setPlanId(String planId) { this.planId = planId; }
    BillingCycle getCycle() { return cycle; }
    void setCycle(BillingCycle cycle) { this.cycle = cycle; }
    SubscriptionStatus getStatus() { return status; }
    void setStatus(SubscriptionStatus s) { this.status = s; }
    LocalDate getCurrentPeriodStart() { return currentPeriodStart; }
    void setCurrentPeriodStart(LocalDate d) { this.currentPeriodStart = d; }
    LocalDate getCurrentPeriodEnd() { return currentPeriodEnd; }
    void setCurrentPeriodEnd(LocalDate d) { this.currentPeriodEnd = d; }
    LocalDate getTrialEnd() { return trialEnd; }
    void setTrialEnd(LocalDate d) { this.trialEnd = d; }
    int getFailedPaymentCount() { return failedPaymentCount; }
    void incrementFailedPayment() { failedPaymentCount++; }
    void resetFailedPayment() { failedPaymentCount = 0; }

    @Override
    public String toString() {
        return String.format("Sub[%s] customer=%s plan=%s status=%s period=[%s→%s]",
            id, customerId, planId, status, currentPeriodStart, currentPeriodEnd);
    }
}

class Invoice {
    private final String id;
    private final String subscriptionId;
    private final String customerId;
    private final long amountPaise;
    private final String description;
    private InvoiceStatus status;
    private final LocalDate issuedDate;
    private LocalDate paidDate;

    Invoice(String id, String subscriptionId, String customerId, long amountPaise, String description) {
        this.id = id;
        this.subscriptionId = subscriptionId;
        this.customerId = customerId;
        this.amountPaise = amountPaise;
        this.description = description;
        this.status = InvoiceStatus.DRAFT;
        this.issuedDate = LocalDate.now();
    }

    String getId() { return id; }
    long getAmountPaise() { return amountPaise; }
    InvoiceStatus getStatus() { return status; }
    void setStatus(InvoiceStatus s) { this.status = s; }
    void setPaidDate(LocalDate d) { this.paidDate = d; }

    @Override
    public String toString() {
        return String.format("Invoice[%s] sub=%s ₹%.2f %s | %s",
            id, subscriptionId, amountPaise / 100.0, status, description);
    }
}

// ============================================================
// BILLING ENGINE
// ============================================================

class BillingEngine {
    private final Map<String, Plan> plans = new LinkedHashMap<>();
    private final Map<String, Subscription> subscriptions = new LinkedHashMap<>();
    private final Map<String, Invoice> invoices = new LinkedHashMap<>();
    private int subCounter = 0, invCounter = 0;

    static final int MAX_PAYMENT_RETRIES = 3;

    // Register plan
    void registerPlan(Plan plan) {
        plans.put(plan.getId(), plan);
    }

    // Create subscription
    Subscription subscribe(String customerId, String planId, BillingCycle cycle) {
        Plan plan = plans.get(planId);
        if (plan == null) throw new IllegalArgumentException("Plan not found: " + planId);

        String id = "sub_" + String.format("%04d", ++subCounter);
        Subscription sub = new Subscription(id, customerId, planId, cycle, LocalDate.now());

        LocalDate start = LocalDate.now();

        // Trial period
        if (plan.getTrialDays() > 0) {
            sub.setStatus(SubscriptionStatus.TRIALING);
            sub.setTrialEnd(start.plusDays(plan.getTrialDays()));
            sub.setCurrentPeriodStart(start);
            sub.setCurrentPeriodEnd(start.plusDays(plan.getTrialDays()));
            System.out.println("  📅 Trial ends: " + sub.getTrialEnd());
        } else {
            sub.setStatus(SubscriptionStatus.ACTIVE);
            sub.setCurrentPeriodStart(start);
            sub.setCurrentPeriodEnd(getNextBillingDate(start, cycle));
            // Generate first invoice
            generateInvoice(sub);
        }

        subscriptions.put(id, sub);
        System.out.println("  🔔 Webhook: subscription.created | " + id);
        return sub;
    }

    // Generate invoice
    Invoice generateInvoice(Subscription sub) {
        Plan plan = plans.get(sub.getPlanId());
        long amount = plan.getPrice(sub.getCycle());
        String desc = plan.getName() + " (" + sub.getCycle() + ") " + sub.getCurrentPeriodStart() + " → " + sub.getCurrentPeriodEnd();

        String invId = "inv_" + String.format("%04d", ++invCounter);
        Invoice invoice = new Invoice(invId, sub.getId(), sub.getCustomerId(), amount, desc);
        invoice.setStatus(InvoiceStatus.OPEN);
        invoices.put(invId, invoice);

        System.out.println("  📄 Invoice generated: " + invoice);
        return invoice;
    }

    // Collect payment
    boolean collectPayment(String invoiceId) {
        Invoice invoice = invoices.get(invoiceId);
        if (invoice == null) throw new IllegalArgumentException("Invoice not found");

        // Simulate payment (80% success)
        boolean success = Math.random() > 0.2;

        if (success) {
            invoice.setStatus(InvoiceStatus.PAID);
            invoice.setPaidDate(LocalDate.now());
            System.out.println("  ✅ Payment collected: " + invoiceId);
            System.out.println("  🔔 Webhook: invoice.paid | " + invoiceId);
            return true;
        } else {
            invoice.setStatus(InvoiceStatus.FAILED);
            System.out.println("  ❌ Payment failed: " + invoiceId);
            System.out.println("  🔔 Webhook: invoice.payment_failed | " + invoiceId);
            return false;
        }
    }

    // Retry payment with backoff
    boolean retryPayment(String subscriptionId) {
        Subscription sub = subscriptions.get(subscriptionId);
        if (sub == null) throw new IllegalArgumentException("Subscription not found");

        if (sub.getFailedPaymentCount() >= MAX_PAYMENT_RETRIES) {
            sub.setStatus(SubscriptionStatus.PAST_DUE);
            System.out.println("  ⚠ Max retries exceeded, marking PAST_DUE");
            System.out.println("  🔔 Webhook: subscription.past_due | " + subscriptionId);
            return false;
        }

        sub.incrementFailedPayment();
        long backoff = (long) Math.pow(2, sub.getFailedPaymentCount()) * 1000;
        System.out.println("  ⏱ Retry #" + sub.getFailedPaymentCount() + " (backoff " + backoff + "ms)");

        // Generate new invoice for retry
        Invoice retryInvoice = generateInvoice(sub);
        boolean success = collectPayment(retryInvoice.getId());

        if (success) {
            sub.resetFailedPayment();
            sub.setStatus(SubscriptionStatus.ACTIVE);
        }
        return success;
    }

    // Proration on upgrade/downgrade
    Invoice prorate(String subscriptionId, String newPlanId, BillingCycle newCycle) {
        Subscription sub = subscriptions.get(subscriptionId);
        if (sub == null) throw new IllegalArgumentException("Subscription not found");

        Plan oldPlan = plans.get(sub.getPlanId());
        Plan newPlan = plans.get(newPlanId);
        if (newPlan == null) throw new IllegalArgumentException("New plan not found");

        // Calculate proration
        long totalDays = ChronoUnit.DAYS.between(sub.getCurrentPeriodStart(), sub.getCurrentPeriodEnd());
        long usedDays = ChronoUnit.DAYS.between(sub.getCurrentPeriodStart(), LocalDate.now());
        long remainingDays = totalDays - usedDays;

        if (totalDays <= 0) totalDays = 1; // safety

        // Credit for unused portion of old plan
        long oldDailyRate = oldPlan.getPrice(sub.getCycle()) / totalDays;
        long credit = oldDailyRate * remainingDays;

        // Charge for new plan remaining days
        long newTotalDays = totalDays; // keep same period end
        long newDailyRate = newPlan.getPrice(newCycle) / newTotalDays;
        long newCharge = newDailyRate * remainingDays;

        long proratedAmount = Math.max(0, newCharge - credit);

        System.out.printf("  📊 Proration: %d days used, %d remaining. Credit=₹%.2f, NewCharge=₹%.2f%n",
            usedDays, remainingDays, credit / 100.0, newCharge / 100.0);

        // Update subscription
        sub.setPlanId(newPlanId);
        sub.setCycle(newCycle);

        // Generate prorated invoice
        String invId = "inv_" + String.format("%04d", ++invCounter);
        String desc = "Proration: " + oldPlan.getName() + " → " + newPlan.getName();
        Invoice invoice = new Invoice(invId, sub.getId(), sub.getCustomerId(), proratedAmount, desc);
        invoice.setStatus(InvoiceStatus.OPEN);
        invoices.put(invId, invoice);

        System.out.println("  📄 Prorated invoice: " + invoice);
        System.out.println("  🔔 Webhook: subscription.updated | " + subscriptionId);
        return invoice;
    }

    // Cancel subscription
    void cancel(String subscriptionId) {
        Subscription sub = subscriptions.get(subscriptionId);
        if (sub == null) throw new IllegalArgumentException("Subscription not found");
        sub.setStatus(SubscriptionStatus.CANCELLED);
        System.out.println("  🔔 Webhook: subscription.cancelled | " + subscriptionId);
    }

    // Simulate trial conversion
    void convertTrial(String subscriptionId) {
        Subscription sub = subscriptions.get(subscriptionId);
        if (sub.getStatus() != SubscriptionStatus.TRIALING)
            throw new IllegalStateException("Not in trial");

        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setCurrentPeriodStart(LocalDate.now());
        sub.setCurrentPeriodEnd(getNextBillingDate(LocalDate.now(), sub.getCycle()));
        generateInvoice(sub);
        System.out.println("  🔔 Webhook: subscription.trial_converted | " + subscriptionId);
    }

    private LocalDate getNextBillingDate(LocalDate from, BillingCycle cycle) {
        return cycle == BillingCycle.MONTHLY ? from.plusMonths(1) : from.plusYears(1);
    }
}

// ============================================================
// DEMO
// ============================================================

public class Main {
    public static void main(String[] args) {
        BillingEngine engine = new BillingEngine();

        System.out.println("=== Subscription Billing Engine ===\n");

        // Register plans
        Plan basic = new Plan("basic", "Basic", 14)
            .setPrice(BillingCycle.MONTHLY, 49900)    // ₹499
            .setPrice(BillingCycle.YEARLY, 499900);    // ₹4999
        Plan pro = new Plan("pro", "Pro", 0)
            .setPrice(BillingCycle.MONTHLY, 149900)    // ₹1499
            .setPrice(BillingCycle.YEARLY, 1499900);   // ₹14999

        engine.registerPlan(basic);
        engine.registerPlan(pro);

        // 1. Subscribe with trial
        System.out.println("--- Subscribe (with trial) ---");
        Subscription sub1 = engine.subscribe("cust_001", "basic", BillingCycle.MONTHLY);
        System.out.println(sub1);

        // 2. Convert trial
        System.out.println("\n--- Convert Trial ---");
        engine.convertTrial(sub1.getId());
        System.out.println(sub1);

        // 3. Subscribe without trial
        System.out.println("\n--- Subscribe (no trial) ---");
        Subscription sub2 = engine.subscribe("cust_002", "pro", BillingCycle.MONTHLY);
        System.out.println(sub2);

        // 4. Proration (upgrade basic → pro)
        System.out.println("\n--- Upgrade with Proration ---");
        Invoice proratedInv = engine.prorate(sub1.getId(), "pro", BillingCycle.MONTHLY);

        // 5. Cancel subscription
        System.out.println("\n--- Cancel ---");
        engine.cancel(sub2.getId());
        System.out.println(sub2);
    }
}
```

## 🎯 Key Takeaways
- Got rejected — interviewer wanted **coupon/discount support** and **grace period after payment failure**
- **Proration formula**: `(newDailyRate × remainingDays) - (oldDailyRate × remainingDays)` — standard SaaS billing
- Amounts in **paise** (smallest unit) — never use floating point for money
- Trial period: TRIALING status with trial end date, auto-conversion generates first invoice
- Retry with exponential backoff: `2^retryCount * 1000ms`, max 3 retries → PAST_DUE
- Invoice lifecycle: DRAFT → OPEN → PAID/FAILED/VOID — each state has valid transitions
- Subscription status machine: TRIALING → ACTIVE → PAST_DUE → CANCELLED → EXPIRED
- Webhook pattern: fire events on every state change — merchant integration point

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Data Structures |
| Technical 1 | Hard | Billing Engine, Proration |
| Technical 2 | Hard | Payment Retry, State Machine |
| Hiring Manager | Medium | SaaS Billing, Fintech |
