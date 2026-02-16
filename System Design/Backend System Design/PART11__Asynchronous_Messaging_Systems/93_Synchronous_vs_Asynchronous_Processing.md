# 93. Synchronous vs Asynchronous Processing

## 📌 Overview

**Synchronous** processing blocks until operation completes. **Asynchronous** processing returns immediately, operation completes later.

---

## 🎯 The Core Difference

### **Synchronous (Blocking)**
```
Client → Request → Server (processing...) → Response → Client continues
         ↓                                     ↑
         └─────────────── Wait ────────────────┘
         (Blocked until server responds)
```

### **Asynchronous (Non-Blocking)**
```
Client → Request → Server (queue job) → Immediate ACK → Client continues
                            ↓
                    Background Worker (processing...)
                            ↓
                    Callback/Notification (optional)
```

---

## 🔄 Synchronous Processing

### Characteristics
```python
# Synchronous HTTP request
import requests

response = requests.get('https://api.example.com/data')
# ← Blocks here until server responds (1-5 seconds)

print(response.json())  # Only executes after response received
```

**Properties**:
- **Blocking**: Caller waits for response
- **Immediate result**: Get result right away
- **Simple**: Linear code flow (easy to reason about)
- **Resource-intensive**: Thread/connection held during wait

### Example: E-commerce Order
```python
def place_order_sync(order_data):
    """Synchronous order processing"""
    
    # Step 1: Validate inventory (blocking)
    inventory = validate_inventory(order_data)  # 100ms
    if not inventory:
        return {"error": "Out of stock"}
    
    # Step 2: Process payment (blocking)
    payment = process_payment(order_data)  # 2000ms
    if not payment.success:
        return {"error": "Payment failed"}
    
    # Step 3: Send confirmation email (blocking)
    send_email(order_data['email'])  # 500ms
    
    # Total time: 2600ms
    return {"status": "success", "order_id": order.id}

# Client waits 2600ms for response
```

**Use Case**:
- ✅ Critical path (must complete before continuing)
- ✅ Simple workflows
- ✅ Low latency acceptable

---

## ⚡ Asynchronous Processing

### Characteristics
```python
# Asynchronous job queue
import celery

@celery.task
def process_video_async(video_id):
    # Runs in background worker
    transcode_video(video_id)
    generate_thumbnail(video_id)
    notify_user(video_id)

# Client code (non-blocking)
task = process_video_async.delay(video_id)  # Returns immediately
# Client continues without waiting
return {"status": "processing", "task_id": task.id}
```

**Properties**:
- **Non-blocking**: Caller continues immediately
- **Eventual result**: Get result later (callback/polling)
- **Complex**: Requires queue, workers, callbacks
- **Resource-efficient**: No thread waiting

### Example: E-commerce Order (Async)
```python
def place_order_async(order_data):
    """Asynchronous order processing"""
    
    # Step 1: Quick validation (synchronous)
    if not basic_validation(order_data):  # 10ms
        return {"error": "Invalid data"}
    
    # Step 2: Queue order processing (non-blocking)
    task_id = queue.enqueue('process_order', order_data)
    
    # Return immediately (total time: 10ms)
    return {
        "status": "accepted",
        "task_id": task_id,
        "message": "Order processing, we'll email confirmation"
    }

# Background worker processes order later
@worker.task
def process_order(order_data):
    validate_inventory(order_data)  # 100ms
    process_payment(order_data)  # 2000ms
    send_email(order_data['email'])  # 500ms
    # Total time: 2600ms (but client already responded!)
```

**Use Case**:
- ✅ Long-running tasks (video transcoding, reports)
- ✅ High throughput needed
- ✅ User doesn't need immediate result

---

## 📊 Comparison

| Aspect | Synchronous | Asynchronous |
|--------|-------------|--------------|
| **Response Time** | Slow (wait for completion) | Fast (immediate ACK) |
| **Throughput** | Low (blocked threads) | High (queue + workers) |
| **Complexity** | Simple | Complex (queue, workers) |
| **Error Handling** | Immediate | Delayed (need retry logic) |
| **Use Case** | Critical path, simple | Long tasks, high scale |

---

## 🏗️ Real-World Examples

### **YouTube Video Upload**

#### Synchronous (Bad)
```python
# User uploads 1GB video
def upload_video_sync(video_file):
    upload_to_storage(video_file)  # 60 seconds
    transcode_to_1080p(video_file)  # 300 seconds
    transcode_to_720p(video_file)  # 200 seconds
    generate_thumbnail(video_file)  # 10 seconds
    
    return {"status": "success"}  # User waits 570 seconds! ❌
```

#### Asynchronous (Good)
```python
# User uploads video
def upload_video_async(video_file):
    # Quick upload to storage
    video_id = upload_to_storage(video_file)  # 60 seconds
    
    # Queue background processing
    queue.enqueue('transcode_video', video_id)
    
    return {
        "status": "processing",
        "video_id": video_id,
        "message": "Video uploaded, processing in background"
    }  # User waits only 60 seconds ✓

# Background worker
@worker.task
def transcode_video(video_id):
    transcode_to_1080p(video_id)  # 300 seconds
    transcode_to_720p(video_id)  # 200 seconds
    generate_thumbnail(video_id)  # 10 seconds
    notify_user(video_id, "Video ready!")
```

---

### **Payment Processing**

#### Hybrid Approach (Sync Payment + Async Notification)
```python
def process_payment(payment_data):
    # Critical: Payment must complete synchronously
    result = charge_credit_card(payment_data)  # 2000ms (blocking)
    
    if result.success:
        # Non-critical: Send email asynchronously
        queue.enqueue('send_receipt_email', payment_data)  # Non-blocking
        
        return {
            "status": "paid",
            "transaction_id": result.tx_id
        }  # Returns after 2000ms (don't wait for email)
    else:
        return {"error": "Payment failed"}

# Background worker sends email later
@worker.task
def send_receipt_email(payment_data):
    send_email(payment_data['email'], "Receipt")  # 500ms
```

---

## 🛠️ Implementation Patterns

### **Async with Callbacks**
```python
# Node.js callback pattern
function processOrder(orderId, callback) {
    validateInventory(orderId, (err, inventory) => {
        if (err) return callback(err);
        
        processPayment(orderId, (err, payment) => {
            if (err) return callback(err);
            
            sendEmail(orderId, (err) => {
                if (err) return callback(err);
                callback(null, { status: 'success' });
            });
        });
    });
}

// Callback hell! (Pyramid of doom)
```

### **Async with Promises**
```javascript
// JavaScript Promise pattern
function processOrder(orderId) {
    return validateInventory(orderId)
        .then(inventory => processPayment(orderId))
        .then(payment => sendEmail(orderId))
        .then(() => ({ status: 'success' }))
        .catch(err => ({ error: err.message }));
}

// Cleaner than callbacks
```

### **Async with Async/Await**
```javascript
// Modern JavaScript async/await
async function processOrder(orderId) {
    try {
        const inventory = await validateInventory(orderId);
        const payment = await processPayment(orderId);
        await sendEmail(orderId);
        
        return { status: 'success' };
    } catch (err) {
        return { error: err.message };
    }
}

// Looks like synchronous code!
```

### **Python asyncio**
```python
import asyncio

async def process_order(order_id):
    inventory = await validate_inventory(order_id)
    payment = await process_payment(order_id)
    await send_email(order_id)
    
    return {"status": "success"}

# Run async function
asyncio.run(process_order(123))
```

---

## ✅ When to Use What?

### Use Synchronous When:
✅ **Critical path**: Must complete before continuing (payment)
✅ **Simple workflow**: Linear steps, no parallelism
✅ **Immediate result needed**: User waiting for response
✅ **Low latency**: <100ms response time
✅ **Transactional**: ACID guarantees required

### Use Asynchronous When:
✅ **Long-running**: >1 second operations (video transcode)
✅ **High throughput**: 1000+ requests/second
✅ **Non-critical**: Email, notifications, analytics
✅ **Parallelizable**: Independent tasks (resize image + upload)
✅ **Resource-constrained**: Limited threads/connections

---

## 🎓 Interview Tips

**Q: "When would you use async vs sync?"**

A: "Use async for:
- Long-running tasks (video processing, reports)
- High throughput (1000+ req/sec)
- Non-critical paths (emails, notifications)

Use sync for:
- Critical operations (payments, bookings)
- Simple workflows
- Immediate results needed

Often use **hybrid**: Sync for critical path, async for non-critical."

**Q: "How do you handle errors in async processing?"**

A: "Strategies:
1. **Retry with exponential backoff**: Retry failed jobs 3 times with delays
2. **Dead letter queue**: Move permanently failed jobs to DLQ for manual review
3. **Alerting**: Monitor job failures, alert on high failure rate
4. **Idempotency**: Ensure retries don't cause duplicates
5. **Timeout**: Set max processing time, fail if exceeded"

---

## 🔗 Related Topics
- **94. Message Queues** - Async processing infrastructure
- **99. At-Most-Once vs At-Least-Once** - Delivery guarantees
- **101. Idempotency** - Safe retries
- **102. Dead Letter Queues** - Error handling

---

## 📚 Summary

**Synchronous**:
- Blocking, immediate result
- Simple, low throughput
- Use for: Payments, critical paths

**Asynchronous**:
- Non-blocking, eventual result
- Complex, high throughput
- Use for: Video processing, emails, analytics

**Hybrid**: Sync critical path + async non-critical = best of both worlds! 🎯
