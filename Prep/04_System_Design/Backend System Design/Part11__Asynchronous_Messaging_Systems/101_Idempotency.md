# 101. Idempotency

## 📌 Overview

**Idempotency** means an operation can be applied multiple times without changing the result beyond the initial application:

```
f(x) = f(f(x)) = f(f(f(x)))

Apply once or many times → same result
```

Critical in distributed systems where retries and duplicates are common.

---

## 🎯 Why Idempotency Matters

### **Problem: Retries Cause Duplicates**
```
Client → Transfer $100 → Server (processing...)
       ↓ (timeout)
Client → Retry transfer $100 → Server

Result: $200 transferred instead of $100 ❌
```

### **Solution: Idempotent Transfer**
```
Client → Transfer $100 (payment_id: abc123) → Server
       ↓ (timeout)
Client → Retry (payment_id: abc123) → Server checks: already processed
       ✓ Returns success without double-charging ✓
```

---

## 🏗️ HTTP Methods Idempotency

| Method | Idempotent? | Example |
|--------|-------------|---------|
| **GET** | ✅ Yes | Read data (no side effects) |
| **PUT** | ✅ Yes | Replace entire resource |
| **DELETE** | ✅ Yes | Delete twice = already deleted |
| **POST** | ❌ No | Create resource (creates multiple) |
| **PATCH** | ⚠️ Depends | Partial update (if designed idempotent) |

### **Examples**

#### GET (Naturally Idempotent)
```python
# Reading data doesn't change anything
response = requests.get('/users/123')
# Call 100 times → same result ✓
```

#### PUT (Idempotent)
```python
# Replace entire resource
requests.put('/users/123', json={
    'name': 'Alice',
    'email': 'alice@example.com'
})
# Call multiple times → same final state ✓
```

#### DELETE (Idempotent)
```python
# Delete resource
requests.delete('/users/123')
# Call again → 404 (already deleted) → same result ✓
```

#### POST (NOT Idempotent)
```python
# Create resource
requests.post('/users', json={'name': 'Alice'})
# Call twice → creates 2 users ❌

# Make idempotent with unique ID
requests.post('/users', json={
    'id': 'uuid-123',  # Idempotency key
    'name': 'Alice'
})
# Call twice → second call detects duplicate → creates 1 user ✓
```

---

## 🛠️ Implementing Idempotency

### **1. Idempotency Keys**

```python
import uuid
from datetime import datetime, timedelta

# Client generates unique ID
idempotency_key = str(uuid.uuid4())

# Server tracks processed requests
idempotency_store = {}

@app.route('/payments', methods=['POST'])
def create_payment():
    idempotency_key = request.headers.get('Idempotency-Key')
    
    if not idempotency_key:
        return {'error': 'Idempotency-Key required'}, 400
    
    # Check if already processed
    if idempotency_key in idempotency_store:
        cached = idempotency_store[idempotency_key]
        
        # Return cached result (don't reprocess)
        return cached['response'], cached['status_code']
    
    # Process payment
    result = charge_credit_card(request.json)
    
    # Store result with expiration
    idempotency_store[idempotency_key] = {
        'response': result,
        'status_code': 200,
        'expires_at': datetime.now() + timedelta(hours=24)
    }
    
    return result, 200

# Client usage
headers = {'Idempotency-Key': idempotency_key}
response = requests.post('/payments', json={...}, headers=headers)
# Retry with same key → same result, no double-charge ✓
```

### **2. Database Unique Constraints**

```sql
-- Prevent duplicate orders
CREATE TABLE orders (
    order_id VARCHAR(255) PRIMARY KEY,  -- Unique constraint
    user_id INT NOT NULL,
    total DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Application code
INSERT INTO orders (order_id, user_id, total)
VALUES ('order-abc-123', 456, 99.99)
ON DUPLICATE KEY UPDATE order_id = order_id;  -- Ignore duplicates
-- Second insert with same order_id → ignored ✓
```

```python
# Python with database constraint
def create_order(order_id, user_id, total):
    try:
        db.execute(
            "INSERT INTO orders (order_id, user_id, total) VALUES (%s, %s, %s)",
            (order_id, user_id, total)
        )
        return {'status': 'created'}
    except IntegrityError:  # Duplicate key
        return {'status': 'already_exists'}  # Idempotent ✓
```

### **3. Deduplication Table**

```python
# Separate table to track processed requests
CREATE TABLE processed_requests (
    request_id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMP DEFAULT NOW(),
    response JSON
);

def process_idempotent(request_id, data):
    # Check if already processed
    result = db.query("SELECT response FROM processed_requests WHERE request_id = %s", request_id)
    
    if result:
        return result['response']  # Return cached result
    
    # Process request
    response = expensive_operation(data)
    
    # Store result
    db.execute(
        "INSERT INTO processed_requests (request_id, response) VALUES (%s, %s)",
        (request_id, json.dumps(response))
    )
    
    return response
```

### **4. Conditional Updates**

```python
# Non-idempotent (dangerous)
def update_balance_bad(account_id, amount):
    balance = db.get_balance(account_id)
    db.set_balance(account_id, balance + amount)  # ❌ Retry = double-add

# Idempotent with version
def update_balance_good(account_id, amount, version):
    success = db.execute(
        "UPDATE accounts SET balance = balance + %s, version = version + 1 "
        "WHERE account_id = %s AND version = %s",
        (amount, account_id, version)
    )
    
    if not success:
        raise ConcurrentModificationError()  # Version mismatch → retry
    
    return {'status': 'success'}

# Retry with same version → fails (already updated) ✓
```

---

## 🎯 Real-World Examples

### **1. Stripe Payment API**
```python
import stripe

stripe.api_key = 'sk_test_...'

# Create payment with idempotency key
stripe.PaymentIntent.create(
    amount=2000,  # $20.00
    currency='usd',
    idempotency_key='payment-abc-123'  # Client-generated UUID
)

# Retry with same key → returns original payment (no double-charge) ✓
```

### **2. AWS API Gateway**
```python
import boto3

client = boto3.client('apigateway')

# Create API with idempotent name
response = client.create_rest_api(
    name='my-api',  # Unique name
    description='My API'
)

# Retry → error (name already exists) or returns existing API ✓
```

### **3. Kafka Exactly-Once**
```python
from kafka import KafkaProducer

# Idempotent producer
producer = KafkaProducer(
    enable_idempotence=True,  # Deduplication at broker
    acks='all'
)

# Send message
producer.send('topic', b'message')
# Retry on failure → broker detects duplicate → stored once ✓
```

---

## ✅ Idempotent Operation Patterns

### **1. Set to Absolute Value**
```python
# Idempotent: Set balance to exact value
db.execute("UPDATE accounts SET balance = %s WHERE id = %s", (1000, 123))
# Retry → still balance = 1000 ✓
```

### **2. Delete**
```python
# Idempotent: Delete if exists
db.execute("DELETE FROM users WHERE id = %s", (123,))
# Retry → already deleted → same result ✓
```

### **3. Insert with Unique Key**
```python
# Idempotent: Insert only if not exists
db.execute("INSERT IGNORE INTO users (id, name) VALUES (%s, %s)", (123, 'Alice'))
# Retry → duplicate key ignored ✓
```

### **4. Conditional Update**
```python
# Idempotent: Update only if condition met
db.execute("UPDATE orders SET status = 'shipped' WHERE id = %s AND status = 'paid'", (123,))
# Retry → condition false (already shipped) → no change ✓
```

---

## ⚠️ Non-Idempotent Operations

### **❌ Increment/Decrement**
```python
# NOT idempotent
db.execute("UPDATE accounts SET balance = balance + 100 WHERE id = %s", (123,))
# Retry → adds 100 again ❌

# Make idempotent with transaction ID
db.execute(
    "INSERT INTO transactions (id, account_id, amount) VALUES (%s, %s, %s) "
    "ON DUPLICATE KEY UPDATE id = id",
    ('txn-123', 123, 100)
)
# Then apply: UPDATE accounts SET balance = balance + 100 WHERE id = 123
# Retry → transaction exists → skip ✓
```

### **❌ Append to List**
```python
# NOT idempotent
list.append(item)  # Retry → duplicates

# Make idempotent with set
set.add(item)  # Retry → still one copy ✓
```

---

## 🎓 Interview Tips

**Q: "What is idempotency and why is it important?"**

A: "Idempotency means an operation can be safely retried without changing the result. Critical in distributed systems because:
- Networks fail → need retries
- At-least-once delivery → duplicates
- Retries without idempotency → bugs (double-charge, duplicate orders)

Example: Transfer $100 with payment_id → retry → check if payment_id exists → return cached result → no double-charge."

**Q: "How do you implement idempotency?"**

A: "Strategies:
1. **Idempotency keys**: Client-generated UUID, server caches results
2. **Database constraints**: UNIQUE constraint prevents duplicates
3. **Conditional updates**: UPDATE WHERE version = X (optimistic locking)
4. **Deduplication table**: Track processed request IDs

Example: Stripe API requires Idempotency-Key header for payment retries."

---

## 🔗 Related Topics
- **99. Delivery Guarantees** - At-least-once requires idempotency
- **93. Async Processing** - Retry logic
- **102. Dead Letter Queues** - Failed retry handling
- **98. Event Streaming** - Event replay

---

## 📚 Summary

**Idempotency**: f(x) = f(f(x)) — safe to retry

**Why**: Networks fail → retries → duplicates

**Implementation**:
- Idempotency keys (UUID)
- Database constraints (UNIQUE)
- Conditional updates (version check)

**Use Cases**: Payments, API calls, message processing

**Best Practice**: Always design for retries 🚀
