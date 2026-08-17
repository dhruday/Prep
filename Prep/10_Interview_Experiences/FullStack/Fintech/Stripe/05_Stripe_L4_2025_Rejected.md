# Stripe — Senior FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Staff Engineer |
| **Level** | L4 |
| **YOE** | 9 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Remote (US) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 2: Integration/Debugging Round — Fix a Broken Payment Integration
**Duration:** 60 minutes

### Scenario: A merchant's payment integration has bugs. You're given a partially working codebase. Find and fix all bugs.

```javascript
/**
 * Bug 1: Double Charging — Race Condition
 * 
 * Problem: User clicks "Pay" rapidly → multiple charges created.
 * The idempotency key is generated per-click instead of per-checkout session.
 */

// BUGGY:
function handlePayment_buggy() {
  const idempotencyKey = crypto.randomUUID(); // BUG: new key each click!
  return stripe.charges.create({
    amount: cart.total,
    currency: 'usd',
    source: token,
  }, { idempotencyKey });
}

// FIXED:
class PaymentHandler {
  constructor() {
    this.processing = false;
    this.sessionIdempotencyKey = null;
  }
  
  /**
   * Fix 1: Use session-scoped idempotency key (generated once per checkout session).
   * Fix 2: Disable button / guard with processing flag.
   */
  async handlePayment(cart, token) {
    // Guard: prevent concurrent submissions
    if (this.processing) return;
    this.processing = true;
    
    try {
      // Generate idempotency key ONCE per checkout session
      if (!this.sessionIdempotencyKey) {
        this.sessionIdempotencyKey = `checkout_${cart.sessionId}_${Date.now()}`;
      }
      
      const charge = await stripe.charges.create({
        amount: cart.total,
        currency: 'usd',
        source: token,
        metadata: { cartId: cart.id }
      }, {
        idempotencyKey: this.sessionIdempotencyKey
      });
      
      return charge;
    } catch (err) {
      if (err.type === 'StripeCardError') {
        // Card declined — allow retry with NEW idempotency key
        this.sessionIdempotencyKey = null;
        throw new UserFacingError('Your card was declined. Please try another card.');
      }
      throw err;
    } finally {
      this.processing = false;
    }
  }
}

/**
 * Bug 2: Incorrect Amount Calculation (Floating Point)
 * 
 * Problem: cart total $19.99 → 1998 cents instead of 1999.
 * Cause: 19.99 * 100 = 1998.9999... in floating point → Math.floor = 1998
 */

// BUGGY:
function totalInCents_buggy(items) {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return Math.floor(total * 100); // BUG: FP multiplication error
}

// FIXED:
function totalInCents(items) {
  // Work in cents from the start — avoid floating point multiplication
  return items.reduce((sum, item) => {
    const priceInCents = Math.round(item.price * 100); // Convert once with rounding
    return sum + priceInCents * item.qty; // Integer arithmetic from here
  }, 0);
}

/**
 * Bug 3: Webhook Signature Verification Bypass
 * 
 * Problem: Merchant verifies webhook but doesn't use the raw body.
 * JSON.parse → JSON.stringify changes formatting → signature mismatch → 
 * merchant disables verification entirely. Attacker sends fake webhooks.
 */

// BUGGY (merchant code):
app.post('/webhook', express.json(), (req, res) => {
  // BUG: req.body is PARSED JSON. Signature was computed on RAW bytes.
  const sig = req.headers['stripe-signature'];
  try {
    // This will FAIL because body is parsed, not raw
    stripe.webhooks.constructEvent(JSON.stringify(req.body), sig, endpointSecret);
    // ... so merchant just removes verification entirely 🚨
  } catch (err) {
    // "Verification always fails, let me just skip it"
    // SECURITY VULNERABILITY: accepting unverified webhooks
  }
  
  processWebhook(req.body);
  res.sendStatus(200);
});

// FIXED:
app.post('/webhook', 
  express.raw({ type: 'application/json' }), // RAW body, not parsed
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    let event;
    try {
      // Verify using RAW body bytes — matches Stripe's HMAC computation
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.sendStatus(400); // Reject unverified webhooks
    }
    
    // Only process verified events
    processWebhook(event);
    res.sendStatus(200);
  }
);

/**
 * Bug 4: Missing Currency Validation
 * 
 * Problem: Currency is "usd" in DB but front-end sends "USD".
 * Stripe requires lowercase. No validation → charge created in wrong
 * currency or rejected.
 */

// FIXED:
function createCharge(amount, currency, source) {
  const normalizedCurrency = currency.toLowerCase().trim();
  
  const validCurrencies = new Set(['usd', 'eur', 'gbp', 'inr', 'jpy', 'sgd']);
  if (!validCurrencies.has(normalizedCurrency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }
  
  // JPY is zero-decimal currency (amount in yen, not cents)
  const zeroDecimalCurrencies = new Set(['jpy', 'krw', 'bif', 'clp']);
  const chargeAmount = zeroDecimalCurrencies.has(normalizedCurrency) 
    ? amount 
    : Math.round(amount * 100);
  
  return stripe.charges.create({
    amount: chargeAmount,
    currency: normalizedCurrency,
    source
  });
}
```

---

## 🎯 Key Takeaways
- Stripe integration/debugging = **Find real bugs in payment code — race conditions, FP math, webhook security, currency handling**
- **Idempotency key**: must be PER SESSION not per click — prevents double charges on rapid clicks
- **Floating point money**: `19.99 * 100 ≠ 1999` — work in cents with `Math.round` from the start
- **Webhook raw body**: `express.raw()` not `express.json()` — signature is computed on raw bytes, not parsed JSON
- **Zero-decimal currencies**: JPY, KRW don't use cents — amount is in base units (yen, won)
- **Rejected reason**: strong in debugging round but system design didn't go deep enough on distributed payment processing guarantees (exactly-once, saga patterns)
- Stripe = **payment infrastructure** — idempotency, webhooks, PCI, currency handling, distributed transactions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Coding |
| Integration/Debug | Very Hard | Payment Bugs, Security |
| System Design | Very Hard | Distributed Payments |
| Coding | Hard | DSA |
| Culture | Hard | Stripe Values |
