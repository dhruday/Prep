# 144. Payment System (High Level — like Stripe, PayPal)

## 📌 Problem Statement

**Design a payment system** that handles online payments securely with idempotency.

**Example**:
```
User buys product ($100)
→ Payment gateway charges credit card
→ Double-entry ledger: Debit user $100, Credit merchant $100
→ Network error → Retry
→ Idempotency key prevents duplicate charge
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Pay-in**: Accept payments from customers (credit card, PayPal, etc.)
2. **Pay-out**: Transfer money to merchants
3. **Payment methods**: Credit card, debit card, PayPal, bank transfer
4. **Currency support**: USD, EUR, GBP, etc.
5. **Webhooks**: Notify merchants of payment events

### **Non-Functional Requirements**

1. **Consistency**: No double charges, no money loss
2. **Reliability**: 99.99% uptime (payment is critical)
3. **Security**: PCI DSS compliant (credit card data)
4. **Idempotency**: Duplicate requests don't create duplicate charges
5. **Low latency**: Payment confirmation < 5 seconds

---

## 🎯 Step 2: Capacity Estimation

### **Transactions**

```
Transactions per day: 100 million (Stripe scale)
Transactions per second: 100M / 86400 = 1.2k TPS
Peak traffic: 5x = 6k TPS
```

### **Money Flow**

```
Average transaction: $50
Total money processed per day: 100M × $50 = $5 billion/day
Total money processed per year: $5B × 365 = $1.825 trillion/year
```

---

## 🎯 Step 3: API Design

### **1. Create Payment Intent**

```http
POST /api/payment-intents
Authorization: Bearer <api_key>

{
  "amount": 10000,  // $100.00 (in cents)
  "currency": "usd",
  "payment_method": "card",
  "customer_id": "cus_123",
  "metadata": {
    "order_id": "order_456"
  }
}

Response:
{
  "id": "pi_abc123",
  "amount": 10000,
  "currency": "usd",
  "status": "requires_confirmation",
  "client_secret": "pi_abc123_secret_xyz"
}
```

---

### **2. Confirm Payment**

```http
POST /api/payment-intents/{payment_intent_id}/confirm
Authorization: Bearer <api_key>

{
  "payment_method": "pm_card_xyz"
}

Response:
{
  "id": "pi_abc123",
  "status": "succeeded",
  "amount": 10000,
  "currency": "usd"
}
```

---

### **3. Get Payment Status**

```http
GET /api/payment-intents/{payment_intent_id}
Authorization: Bearer <api_key>

Response:
{
  "id": "pi_abc123",
  "status": "succeeded",
  "amount": 10000,
  "currency": "usd",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### **4. Refund**

```http
POST /api/refunds
Authorization: Bearer <api_key>

{
  "payment_intent_id": "pi_abc123",
  "amount": 5000  // Partial refund $50.00
}

Response:
{
  "id": "re_xyz789",
  "payment_intent_id": "pi_abc123",
  "amount": 5000,
  "status": "succeeded"
}
```

---

## 🎯 Step 4: Database Schema

### **1. Payment Intents**

```sql
CREATE TABLE payment_intents (
    id VARCHAR(36) PRIMARY KEY,
    amount BIGINT NOT NULL,  -- in cents
    currency VARCHAR(3) NOT NULL,
    status ENUM('requires_confirmation', 'succeeded', 'failed', 'canceled') DEFAULT 'requires_confirmation',
    customer_id VARCHAR(36),
    merchant_id VARCHAR(36) NOT NULL,
    payment_method_id VARCHAR(36),
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_id (customer_id),
    INDEX idx_merchant_id (merchant_id),
    INDEX idx_status (status),
    INDEX idx_idempotency_key (idempotency_key)
);
```

---

### **2. Ledger (Double-Entry)**

**Why double-entry?** Every transaction has two sides: debit and credit (sum = 0)

**Example**: User pays $100 to merchant
- Debit: User wallet -$100
- Credit: Merchant wallet +$100
- Sum: -$100 + $100 = 0 ✓

```sql
CREATE TABLE ledger_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    account_id VARCHAR(36) NOT NULL,  -- wallet ID
    amount BIGINT NOT NULL,  -- Positive = credit, Negative = debit
    currency VARCHAR(3) NOT NULL,
    type ENUM('debit', 'credit') NOT NULL,
    balance_after BIGINT NOT NULL,  -- Snapshot of balance after transaction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_account_id (account_id),
    INDEX idx_created_at (created_at)
);
```

---

### **3. Wallets (Accounts)**

```sql
CREATE TABLE wallets (
    id VARCHAR(36) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,  -- in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    version INT NOT NULL DEFAULT 0,  -- For optimistic locking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    UNIQUE KEY uk_user_currency (user_id, currency)
);
```

---

## 🎯 Step 5: High-Level Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Create payment intent
       ▼
┌─────────────────────────────────────┐
│      API Gateway                    │
│  - Rate limiting                    │
│  - Authentication                   │
└──────────────┬──────────────────────┘
               │
               │ 2. Process payment
               ▼
┌─────────────────────────────────────┐
│      Payment Service                │
│  - Create payment intent            │
│  - Check idempotency key            │
│  - Call payment gateway             │
└──────────────┬──────────────────────┘
               │
               │ 3. Charge card
               ▼
┌─────────────────────────────────────┐
│      Payment Gateway (Stripe API)   │
│  - Tokenize card (PCI compliant)    │
│  - Charge customer                  │
│  - Return result (success/failure)  │
└──────────────┬──────────────────────┘
               │
               │ 4. Update ledger (double-entry)
               ▼
┌─────────────────────────────────────┐
│      Ledger Service                 │
│  - Debit: User wallet -$100         │
│  - Credit: Merchant wallet +$100    │
│  - Ensure sum = 0                   │
└──────────────┬──────────────────────┘
               │
               │ 5. Save to database
               ▼
┌─────────────────────────────────────┐
│      Database (PostgreSQL)          │
│  - payment_intents                  │
│  - ledger_entries                   │
│  - wallets                          │
└──────────────┬──────────────────────┘
               │
               │ 6. Send webhook
               ▼
┌─────────────────────────────────────┐
│      Webhook Worker                 │
│  - POST https://merchant.com/webhook│
│  - Event: payment.succeeded         │
└─────────────────────────────────────┘
```

---

## 🎯 Step 6: Payment Flow (with Idempotency)

### **Problem: Duplicate Charges**

**Scenario**:
```
1. User clicks "Pay" button
2. Request sent to server
3. Server charges card successfully
4. Network error → Client doesn't receive response
5. User clicks "Pay" again (retry)
6. Server charges card again → DUPLICATE CHARGE ❌
```

---

### **Solution: Idempotency Key**

**Concept**: Each request has a unique key (e.g., `order_id`). If same key received again, return cached response (no duplicate charge).

**Implementation**:

```python
import hashlib
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory cache (use Redis in production)
idempotency_cache = {}

@app.route('/api/payment-intents', methods=['POST'])
def create_payment_intent():
    data = request.json
    
    # 1. Get idempotency key (from header or body)
    idempotency_key = request.headers.get('Idempotency-Key') or data.get('idempotency_key')
    
    if not idempotency_key:
        return jsonify({'error': 'Idempotency-Key required'}), 400
    
    # 2. Check if already processed
    if idempotency_key in idempotency_cache:
        print(f"Idempotency hit: {idempotency_key}, returning cached response")
        return jsonify(idempotency_cache[idempotency_key]), 200
    
    # 3. Check database (in case cache expired)
    existing = db.query("""
        SELECT * FROM payment_intents WHERE idempotency_key = %s
    """, (idempotency_key,))
    
    if existing:
        print(f"Idempotency hit (DB): {idempotency_key}")
        return jsonify(existing), 200
    
    # 4. Process payment (first time)
    payment_intent_id = str(uuid.uuid4())
    
    # Charge card via payment gateway (e.g., Stripe)
    charge_result = charge_card(data['amount'], data['payment_method'])
    
    if charge_result['status'] == 'succeeded':
        status = 'succeeded'
    else:
        status = 'failed'
    
    # 5. Save to database
    db.execute("""
        INSERT INTO payment_intents (id, amount, currency, status, customer_id, merchant_id, idempotency_key, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (payment_intent_id, data['amount'], data['currency'], status, data['customer_id'], data['merchant_id'], idempotency_key, json.dumps(data.get('metadata', {}))))
    
    # 6. Update ledger (double-entry)
    if status == 'succeeded':
        update_ledger(payment_intent_id, data['customer_id'], data['merchant_id'], data['amount'])
    
    response = {
        'id': payment_intent_id,
        'amount': data['amount'],
        'currency': data['currency'],
        'status': status
    }
    
    # 7. Cache response
    idempotency_cache[idempotency_key] = response
    
    return jsonify(response), 201

def charge_card(amount, payment_method):
    # Simulate calling Stripe API
    import stripe
    stripe.api_key = 'sk_test_...'
    
    try:
        charge = stripe.Charge.create(
            amount=amount,
            currency='usd',
            source=payment_method
        )
        return {'status': 'succeeded', 'charge_id': charge.id}
    except stripe.error.CardError as e:
        return {'status': 'failed', 'error': str(e)}
```

---

### **Idempotency Key Example**

**Request 1**:

```http
POST /api/payment-intents
Idempotency-Key: order_456_1234567890

{
  "amount": 10000,
  "currency": "usd",
  "payment_method": "pm_card_xyz",
  "customer_id": "cus_123",
  "merchant_id": "mer_789"
}

Response (201 Created):
{
  "id": "pi_abc123",
  "amount": 10000,
  "currency": "usd",
  "status": "succeeded"
}
```

**Request 2 (Duplicate — Same Idempotency-Key)**:

```http
POST /api/payment-intents
Idempotency-Key: order_456_1234567890

{
  "amount": 10000,
  "currency": "usd",
  "payment_method": "pm_card_xyz",
  "customer_id": "cus_123",
  "merchant_id": "mer_789"
}

Response (200 OK — Cached):
{
  "id": "pi_abc123",
  "amount": 10000,
  "currency": "usd",
  "status": "succeeded"
}
```

**Result**: Card charged only once ✓

---

## 🎯 Step 7: Double-Entry Ledger

### **Why Double-Entry?**

**Single-entry** (bad):

```
User pays $100 to merchant

Transaction 1:
- User balance: $1000 → $900 (deduct $100)

Transaction 2:
- Merchant balance: $500 → $600 (add $100)

Problem: If Transaction 2 fails, money lost! ($100 vanished)
```

---

**Double-entry** (good):

```
User pays $100 to merchant

Ledger entries (atomic):
1. Debit: User wallet -$100
2. Credit: Merchant wallet +$100

Sum: -$100 + $100 = 0 ✓

Constraint: SUM(ledger_entries for transaction_id) MUST = 0
```

---

### **Implementation**

```python
def update_ledger(transaction_id, customer_id, merchant_id, amount):
    # Get wallets
    customer_wallet = db.query("SELECT * FROM wallets WHERE user_id = %s", (customer_id,))
    merchant_wallet = db.query("SELECT * FROM wallets WHERE user_id = %s", (merchant_id,))
    
    # Start transaction (atomic)
    db.begin_transaction()
    
    try:
        # 1. Debit customer wallet
        new_customer_balance = customer_wallet['balance'] - amount
        db.execute("""
            UPDATE wallets SET balance = %s, version = version + 1
            WHERE id = %s AND version = %s
        """, (new_customer_balance, customer_wallet['id'], customer_wallet['version']))
        
        if db.rowcount == 0:
            raise Exception("Optimistic lock failed (customer wallet)")
        
        db.execute("""
            INSERT INTO ledger_entries (transaction_id, account_id, amount, currency, type, balance_after)
            VALUES (%s, %s, %s, %s, 'debit', %s)
        """, (transaction_id, customer_wallet['id'], -amount, 'USD', new_customer_balance))
        
        # 2. Credit merchant wallet
        new_merchant_balance = merchant_wallet['balance'] + amount
        db.execute("""
            UPDATE wallets SET balance = %s, version = version + 1
            WHERE id = %s AND version = %s
        """, (new_merchant_balance, merchant_wallet['id'], merchant_wallet['version']))
        
        if db.rowcount == 0:
            raise Exception("Optimistic lock failed (merchant wallet)")
        
        db.execute("""
            INSERT INTO ledger_entries (transaction_id, account_id, amount, currency, type, balance_after)
            VALUES (%s, %s, %s, %s, 'credit', %s)
        """, (transaction_id, merchant_wallet['id'], amount, 'USD', new_merchant_balance))
        
        # 3. Verify sum = 0
        total = db.query("""
            SELECT SUM(amount) AS total FROM ledger_entries WHERE transaction_id = %s
        """, (transaction_id,))
        
        if total['total'] != 0:
            raise Exception(f"Ledger imbalance: {total['total']} (should be 0)")
        
        # Commit transaction
        db.commit()
        print(f"Ledger updated: {transaction_id}")
        
    except Exception as e:
        db.rollback()
        print(f"Ledger update failed: {e}")
        raise
```

---

## 🎯 Step 8: Webhooks

**Problem**: Merchant needs to know when payment succeeds/fails

**Solution**: Webhook (POST to merchant's URL with event data)

**Flow**:

```
1. Payment succeeds
2. Payment service publishes event to Kafka (topic: payment-events)
3. Webhook worker consumes event
4. POST https://merchant.com/webhook with event data
5. Merchant processes event (e.g., ship product)
```

---

**Implementation**:

```python
from kafka import KafkaProducer, KafkaConsumer
import requests
import json

# Publish event
producer = KafkaProducer(bootstrap_servers=['localhost:9092'])

def publish_payment_event(payment_intent_id, status):
    event = {
        'type': f'payment.{status}',
        'data': {
            'id': payment_intent_id,
            'status': status,
            'timestamp': time.time()
        }
    }
    
    producer.send('payment-events', json.dumps(event).encode())
    print(f"Published event: {event}")

# Webhook worker
consumer = KafkaConsumer('payment-events', bootstrap_servers=['localhost:9092'])

def send_webhook(event, webhook_url):
    try:
        response = requests.post(
            webhook_url,
            json=event,
            headers={'Content-Type': 'application/json'},
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"Webhook delivered: {webhook_url}")
        else:
            print(f"Webhook failed: {response.status_code}")
    except Exception as e:
        print(f"Webhook error: {e}")

for message in consumer:
    event = json.loads(message.value)
    
    # Get merchant's webhook URL
    merchant_id = event['data'].get('merchant_id')
    merchant = db.query("SELECT webhook_url FROM merchants WHERE id = %s", (merchant_id,))
    
    if merchant and merchant['webhook_url']:
        send_webhook(event, merchant['webhook_url'])
```

---

## 🎯 Step 9: Security (PCI DSS Compliance)

### **Problem**: Storing credit card numbers is risky (PCI DSS Level 1 compliance required)

### **Solution**: Tokenization (Never store raw card numbers)

**Flow**:

```
1. User enters card: 4242 4242 4242 4242
2. Frontend sends to payment gateway (Stripe) via HTTPS
3. Stripe tokenizes card → Returns token: tok_abc123
4. Frontend sends token to backend (not raw card)
5. Backend stores token (safe, can't reverse to card number)
```

**Implementation**:

```html
<!-- Frontend (Stripe.js) -->
<form id="payment-form">
  <div id="card-element"></div>
  <button type="submit">Pay</button>
</form>

<script src="https://js.stripe.com/v3/"></script>
<script>
  const stripe = Stripe('pk_test_...');
  const elements = stripe.elements();
  const cardElement = elements.create('card');
  cardElement.mount('#card-element');
  
  const form = document.getElementById('payment-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Tokenize card (sends to Stripe, not your server)
    const {token, error} = await stripe.createToken(cardElement);
    
    if (error) {
      console.error(error);
    } else {
      // Send token to backend
      fetch('/api/payment-intents', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          amount: 10000,
          currency: 'usd',
          payment_method: token.id  // Token, not raw card
        })
      });
    }
  });
</script>
```

---

## 🎯 Step 10: Real-World Examples

### **1. Stripe**

**Scale**: $640+ billion processed annually, 1+ million businesses

**Features**:
- Payment methods: Cards, ACH, Apple Pay, Google Pay
- Idempotency: Idempotency-Key header
- Webhooks: payment.succeeded, payment.failed

**Security**: PCI DSS Level 1, tokenization, 3D Secure

---

### **2. PayPal**

**Scale**: $1.3+ trillion processed annually, 400+ million accounts

**Features**:
- Wallet (store balance)
- Buyer protection (refunds)
- International (200+ countries, 25+ currencies)

**Architecture**: Java, Oracle database, custom infrastructure

---

### **3. Square**

**Scale**: $160+ billion processed annually

**Features**:
- Point-of-sale (POS) hardware (Square Reader)
- Instant payouts (next business day)
- Invoicing

**Use case**: Small businesses, restaurants, retail

---

## 🎓 Interview Tips

**Q: "Design a payment system like Stripe"**

A: "I'll focus on **idempotency + double-entry ledger + webhooks**:

**Core components**:
1. **Payment intent**: Create payment (amount, currency, customer, merchant)
2. **Idempotency**: Use idempotency key (e.g., order_id) to prevent duplicate charges
3. **Double-entry ledger**: Debit customer -$100, Credit merchant +$100 (sum = 0)
4. **Webhooks**: Notify merchant when payment succeeds/fails

**Payment flow**:
```
1. Client sends payment request with Idempotency-Key header
2. Server checks idempotency cache/database
3. If exists → Return cached response (no duplicate charge)
4. If not → Charge card via payment gateway (Stripe API)
5. Update double-entry ledger (atomic transaction)
6. Save payment intent to database
7. Publish event to Kafka (payment.succeeded)
8. Webhook worker sends POST to merchant's URL
```

**Idempotency**:
- Key: order_id_timestamp (unique per request)
- Cache: Redis (TTL 24 hours)
- Database: UNIQUE constraint on idempotency_key

**Ledger**:
- Every transaction has 2 entries (debit + credit)
- SUM(entries for transaction_id) MUST = 0
- Optimistic locking (version field) prevents race conditions

**Security**: Tokenization (never store raw card numbers), PCI DSS compliant

Real-world: Stripe ($640B/year idempotency tokenization), PayPal ($1.3T/year wallet), Square ($160B/year POS)"

---

## 📚 Summary

**Core**: Idempotency key (prevent duplicate charges) + Double-entry ledger (debit + credit = 0) + Webhooks (notify merchant)

**Payment flow**: Create intent → Check idempotency → Charge card → Update ledger (atomic) → Send webhook

**Ledger**: Every transaction has 2 entries (debit customer, credit merchant), SUM = 0

**Security**: Tokenization (Stripe.js), PCI DSS compliant, never store raw cards

**Real-world**: Stripe ($640B/year), PayPal ($1.3T/year), Square ($160B/year) 🚀

