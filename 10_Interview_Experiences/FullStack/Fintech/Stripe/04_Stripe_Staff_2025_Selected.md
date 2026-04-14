# Stripe — Staff Engineer FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Staff Software Engineer |
| **Level** | L6 (Staff) |
| **YOE** | 9 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | San Francisco, CA (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Stripe Connect |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 6 (Phone Screen + Bug Squash + Integration + System Design + Architecture + HM)

---

## Round 1: Bug Squash
**Duration:** 60 minutes

### Stripe's Signature Bug Squash Round
Given a codebase with multiple bugs. Fix them under time pressure while explaining your reasoning.

### Bug 1: Double-Charging Race Condition

```python
# BUGGY: Race condition — two concurrent requests can both pass the
# "not yet charged" check before either marks it as charged.
class PaymentProcessor:
    def __init__(self, db):
        self.db = db
    
    def charge(self, payment_id, amount):
        payment = self.db.get_payment(payment_id)
        
        # BUG: TOCTOU race condition
        if payment.status == 'pending':
            result = self._process_charge(payment, amount)
            if result.success:
                payment.status = 'charged'   # Both threads reach here
                self.db.save(payment)
            return result
        
        return ChargeResult(success=False, error='Already charged')
```

### Fix: Optimistic Locking with Version Column

```python
class PaymentProcessor:
    def __init__(self, db):
        self.db = db
    
    def charge(self, payment_id, amount):
        # Atomic compare-and-swap using version column
        # SQL: UPDATE payments SET status='processing', version=version+1
        #      WHERE id=? AND status='pending' AND version=?
        
        payment = self.db.get_payment(payment_id)
        
        # Atomic transition: pending → processing
        rows_affected = self.db.execute(
            """UPDATE payments 
               SET status = 'processing', version = version + 1 
               WHERE id = %s AND status = 'pending' AND version = %s""",
            (payment_id, payment.version)
        )
        
        if rows_affected == 0:
            # Another thread already moved it out of 'pending'
            return ChargeResult(success=False, error='Already processing or charged')
        
        try:
            result = self._process_charge(payment, amount)
            
            if result.success:
                self.db.execute(
                    "UPDATE payments SET status = 'charged' WHERE id = %s",
                    (payment_id,)
                )
            else:
                # Rollback to pending
                self.db.execute(
                    "UPDATE payments SET status = 'pending' WHERE id = %s",
                    (payment_id,)
                )
            
            return result
        except Exception as e:
            # Rollback on error
            self.db.execute(
                "UPDATE payments SET status = 'failed' WHERE id = %s",
                (payment_id,)
            )
            raise
```

### Bug 2: Floating Point Money Calculation

```python
# BUGGY: Floating point arithmetic for money
def calculate_fee(amount, rate=0.029, fixed_fee=0.30):
    # BUG: 100.00 * 0.029 = 2.8999999999999995 in floating point
    fee = amount * rate + fixed_fee
    return round(fee, 2)  # round helps but is NOT reliable for all cases

# FIX: Use integer cents (or Decimal)
from decimal import Decimal, ROUND_HALF_UP

def calculate_fee(amount_cents: int, rate_bps: int = 290, fixed_fee_cents: int = 30) -> int:
    """
    Calculate fee in cents using integer arithmetic.
    rate_bps: 290 = 2.90% (basis points)
    """
    # amount_cents * rate_bps / 10000 + fixed_fee_cents
    # Use Decimal for the division to avoid truncation issues
    variable_fee = Decimal(amount_cents * rate_bps) / Decimal(10000)
    total_fee = variable_fee + Decimal(fixed_fee_cents)
    
    # Round up (payment processors always round fees up)
    return int(total_fee.to_integral_value(rounding=ROUND_HALF_UP))
```

### Bug 3: Webhook Retry Missing Idempotency

```python
# BUGGY: Webhook handler processes duplicate deliveries
class WebhookHandler:
    def handle_payment_succeeded(self, event):
        payment_id = event['data']['payment_id']
        # BUG: If webhook delivered twice, order is fulfilled twice
        self.fulfill_order(payment_id)
        self.send_receipt(payment_id)

# FIX: Idempotency via processed event tracking
class WebhookHandler:
    def __init__(self, db, cache):
        self.db = db
        self.cache = cache  # Redis
    
    def handle_payment_succeeded(self, event):
        event_id = event['id']
        
        # Idempotency: check if already processed
        # Use Redis SETNX with TTL for distributed lock
        lock_key = f"webhook:processed:{event_id}"
        acquired = self.cache.set(lock_key, "1", nx=True, ex=86400)  # 24h TTL
        
        if not acquired:
            return {'status': 'already_processed'}
        
        try:
            payment_id = event['data']['payment_id']
            
            # Also check DB for long-term idempotency
            if self.db.is_event_processed(event_id):
                return {'status': 'already_processed'}
            
            self.fulfill_order(payment_id)
            self.send_receipt(payment_id)
            
            # Record in DB
            self.db.mark_event_processed(event_id)
            
            return {'status': 'processed'}
        except Exception:
            # Release lock so retry can succeed
            self.cache.delete(lock_key)
            raise
```

---

## Round 2: System Design — Multi-Party Payment Splitting (Stripe Connect)

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│           Stripe Connect: Multi-Party Payment Splitting         │
│                                                                 │
│  Customer pays $100 to a Marketplace                            │
│  ┌─────────┐                                                    │
│  │ Customer│──PaymentIntent──→ Stripe API                       │
│  │ (buyer) │                                                    │
│  └─────────┘                                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Payment Split Engine                    │        │
│  │                                                     │        │
│  │  PaymentIntent: $100                                │        │
│  │  ├─ Transfer to Seller A: $60                       │        │
│  │  ├─ Transfer to Seller B: $25                       │        │
│  │  ├─ Platform fee: $12 (→ platform's Stripe balance) │        │
│  │  └─ Stripe processing fee: $3                       │        │
│  │                                                     │        │
│  │  Split Strategies:                                  │        │
│  │  1. Destination charges (simple):                   │        │
│  │     - Single transfer to connected account          │        │
│  │     - Platform keeps `application_fee_amount`       │        │
│  │                                                     │        │
│  │  2. Separate charges + transfers (flexible):        │        │
│  │     - Charge on platform's account                  │        │
│  │     - Multiple transfers to connected accounts      │        │
│  │     - Platform controls timing                      │        │
│  │                                                     │        │
│  │  3. Direct charges (connected-first):               │        │
│  │     - Charge on connected account                   │        │
│  │     - Refund handled by connected account           │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Ledger System (Double-Entry)                      │           │
│  │                                                   │           │
│  │ On payment capture:                               │           │
│  │ DR: customer_receivable    $100                   │           │
│  │ CR: seller_a_payable        $60                   │           │
│  │ CR: seller_b_payable        $25                   │           │
│  │ CR: platform_revenue        $12                   │           │
│  │ CR: stripe_fee_payable       $3                   │           │
│  │                                                   │           │
│  │ On settlement to Seller A:                        │           │
│  │ DR: seller_a_payable        $60                   │           │
│  │ CR: bank_account            $60                   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Challenges at Scale:                                           │
│  - Partial refunds: proportional split reversal                │
│  - Cross-border: currency conversion at transfer time          │
│  - Regulatory: KYC per connected account, 1099-K reporting    │
│  - Eventual consistency: payment capture → transfer is async   │
│  - Dispute/chargeback: who bears the cost? (configurable)      │
│                                                                 │
│  Scale: 100K merchants, 10M payments/day,                      │
│         average 2.3 splits per payment                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Stripe Staff = **Bug squash (race conditions, fp math, idempotency) + payment splitting design**
- **TOCTOU race condition**: optimistic locking with version column — `WHERE version = ?` in UPDATE
- **Integer cents for money**: never floating point — `290 bps` not `0.029` — Decimal for division
- **Webhook idempotency**: `SETNX` Redis lock + DB check — dual layer for reliability
- **Double-entry for splits**: every split creates balanced journal entries — `sum(DR) == sum(CR)` always
- **Partial refund**: proportional reversal — refund $30 splits as $18/$7.50/$3.60/$0.90 proportionally
- **Stripe Connect patterns**: destination charges vs separate charges+transfers vs direct charges
- Stripe = **correctness over speed** — they value debugging skills, precise money handling, idempotent systems

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bug Squash | Hard | Race Conditions, FP Math, Idempotency |
| Integration | Hard | API Design, Ruby/Python |
| System Design | Very Hard | Payment Splitting, Ledger |
| Architecture | Very Hard | Distributed Payments at Scale |
| Behavioral | Medium | Values |
| HM | Medium | Staff scope |
