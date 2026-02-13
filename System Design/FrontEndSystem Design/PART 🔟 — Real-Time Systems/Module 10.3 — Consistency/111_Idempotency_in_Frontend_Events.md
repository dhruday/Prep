# 111. Idempotency in Frontend Events

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Idempotency** means that performing the same operation multiple times produces the same result as performing it once. In frontend systems, idempotent event handling ensures that **duplicate events**, **retries**, or **race conditions** don't cause incorrect state or side effects.

### **What It Is:**
- **Same result**: Multiple identical requests produce same outcome
- **Safe retries**: Can retry failed operations without side effects
- **State-based**: Check current state before applying changes
- **Idempotency keys**: Unique identifiers to track operations
- **Defensive programming**: Assume duplicates will happen

### **Why It Matters:**
- **Correctness**: Prevents double-processing errors
- **Reliability**: Enables safe retries after failures
- **User experience**: "Submit" button can be clicked multiple times safely
- **Data integrity**: Maintains consistent state

### **When and Where Used:**
- Form submissions (prevent double-submit)
- API calls (safe retries)
- State updates (toggle, increment)
- Event handlers (button clicks)
- Payment processing (critical!)
- File uploads

### **Role in Large-Scale Applications:**
At FAANG scale:
- **Millions of retries** daily due to network issues
- **Race conditions**: Concurrent requests from same user
- **Distributed systems**: Same request routed to multiple servers
- **At-least-once delivery**: Message queues may duplicate
- **Idempotency guarantees**: Core requirement for APIs

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Idempotent State Updates**

#### **1. Set vs Increment (Idempotent vs Non-Idempotent)**
```javascript
// ❌ Non-idempotent: Calling twice adds 2
function incrementCounter() {
  const current = getCounter();
  setCounter(current + 1);
}

// If called twice (e.g., double-click), counter increases by 2

// ✅ Idempotent: Set to specific value
function setCounterTo(value) {
  setCounter(value);
}

// If called twice with same value, result is same

// ✅ Idempotent increment with state check
function idempotentIncrement(expectedCurrent) {
  const current = getCounter();
  
  if (current === expectedCurrent) {
    setCounter(current + 1);
    return true;
  }
  
  // Already incremented by another request
  return false;
}
```

#### **2. Toggle Operations**
```javascript
// ❌ Non-idempotent: Toggle flips state
function toggleLike() {
  setLiked(!liked);
}

// If called twice quickly, ends up in original state

// ✅ Idempotent: Set to specific state
function setLikeState(shouldLike) {
  setLiked(shouldLike);
}

// Usage
function LikeButton({ postId, initialLiked }) {
  const [liked, setLiked] = useState(initialLiked);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleLike = async () => {
    if (isUpdating) return; // Prevent concurrent clicks
    
    const newLikedState = !liked;
    
    // Optimistic update
    setLiked(newLikedState);
    setIsUpdating(true);
    
    try {
      // Send desired state, not "toggle"
      await fetch(`/api/posts/${postId}/like`, {
        method: 'PUT',
        body: JSON.stringify({ liked: newLikedState })
      });
    } catch (error) {
      // Rollback on error
      setLiked(!newLikedState);
      console.error('Failed to update like:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <button 
      onClick={handleLike} 
      disabled={isUpdating}
      className={liked ? 'liked' : ''}
    >
      {liked ? '❤️' : '🤍'} Like
    </button>
  );
}
```

---

### **B. Idempotent API Requests**

#### **1. Idempotency Keys**
```javascript
function generateIdempotencyKey() {
  // Unique key per operation attempt
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class IdempotentAPIClient {
  constructor() {
    this.pendingRequests = new Map(); // key -> promise
  }
  
  async request(endpoint, options = {}) {
    // Generate or use provided idempotency key
    const idempotencyKey = options.idempotencyKey || generateIdempotencyKey();
    
    // Check if request already in flight
    if (this.pendingRequests.has(idempotencyKey)) {
      console.log('Request already in flight, returning existing promise');
      return this.pendingRequests.get(idempotencyKey);
    }
    
    // Make request
    const promise = fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Idempotency-Key': idempotencyKey
      }
    }).then(async (response) => {
      const data = await response.json();
      this.pendingRequests.delete(idempotencyKey);
      return data;
    }).catch((error) => {
      this.pendingRequests.delete(idempotencyKey);
      throw error;
    });
    
    this.pendingRequests.set(idempotencyKey, promise);
    return promise;
  }
}

const api = new IdempotentAPIClient();

// Usage
async function submitPayment(amount) {
  // Generate stable key based on operation
  const idempotencyKey = `payment-${userId}-${amount}-${Date.now()}`;
  
  try {
    const result = await api.request('/api/payment', {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify({ amount, userId })
    });
    
    return result;
  } catch (error) {
    // Safe to retry with same idempotency key
    console.log('Payment failed, retrying...');
    return api.request('/api/payment', {
      method: 'POST',
      idempotencyKey, // Same key!
      body: JSON.stringify({ amount, userId })
    });
  }
}
```

#### **2. Request De-duplication**
```javascript
class RequestDeduplicator {
  constructor() {
    this.cache = new Map(); // key -> { promise, timestamp }
    this.cacheExpiry = 60000; // 1 minute
  }
  
  async execute(key, fn) {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    // Return cached promise if still valid
    if (cached && now - cached.timestamp < this.cacheExpiry) {
      console.log('Returning cached promise for:', key);
      return cached.promise;
    }
    
    // Execute function and cache promise
    const promise = fn();
    this.cache.set(key, { promise, timestamp: now });
    
    try {
      const result = await promise;
      return result;
    } catch (error) {
      // Remove from cache on error (allow retry)
      this.cache.delete(key);
      throw error;
    }
  }
  
  clear() {
    this.cache.clear();
  }
}

const dedup = new RequestDeduplicator();

// Usage
async function loadUserProfile(userId) {
  // Multiple calls within 1 minute return same promise
  return dedup.execute(`user-${userId}`, async () => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  });
}

// These will only make 1 actual API call
Promise.all([
  loadUserProfile(123),
  loadUserProfile(123),
  loadUserProfile(123)
]).then(([user1, user2, user3]) => {
  console.log('All return same data');
});
```

---

### **C. Form Submission**

#### **1. Prevent Double-Submit**
```javascript
function SubmitButton({ onSubmit, children }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false);
  
  const handleClick = async () => {
    // Prevent concurrent submissions
    if (isSubmitting || submittedRef.current) {
      console.log('Submission already in progress or completed');
      return;
    }
    
    setIsSubmitting(true);
    submittedRef.current = true;
    
    try {
      await onSubmit();
      console.log('Submission successful');
    } catch (error) {
      console.error('Submission failed:', error);
      // Allow retry on error
      submittedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={isSubmitting}
      className={isSubmitting ? 'submitting' : ''}
    >
      {isSubmitting ? 'Submitting...' : children}
    </button>
  );
}

// Usage
function PaymentForm() {
  const handleSubmit = async () => {
    const idempotencyKey = generateIdempotencyKey();
    
    await fetch('/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({ amount: 100, currency: 'USD' })
    });
  };
  
  return (
    <form>
      <input type="number" name="amount" />
      <SubmitButton onSubmit={handleSubmit}>
        Pay Now
      </SubmitButton>
    </form>
  );
}
```

#### **2. Form-Level Idempotency**
```javascript
function useIdempotentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const submissionIdRef = useRef(null);
  
  const submit = useCallback(async (submitFn) => {
    if (isSubmitting || isSubmitted) {
      console.log('Form already submitted');
      return { success: false, reason: 'already_submitted' };
    }
    
    // Generate submission ID
    const submissionId = generateIdempotencyKey();
    submissionIdRef.current = submissionId;
    
    setIsSubmitting(true);
    
    try {
      const result = await submitFn(submissionId);
      setIsSubmitted(true);
      return { success: true, data: result };
    } catch (error) {
      console.error('Submission failed:', error);
      return { success: false, error };
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, isSubmitted]);
  
  const reset = useCallback(() => {
    setIsSubmitting(false);
    setIsSubmitted(false);
    submissionIdRef.current = null;
  }, []);
  
  return { submit, isSubmitting, isSubmitted, reset };
}

// Usage
function ContactForm() {
  const { submit, isSubmitting, isSubmitted, reset } = useIdempotentForm();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await submit(async (submissionId) => {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': submissionId
        },
        body: JSON.stringify(formData)
      });
      
      return response.json();
    });
    
    if (result.success) {
      alert('Message sent successfully!');
    } else if (result.reason === 'already_submitted') {
      alert('This form has already been submitted.');
    } else {
      alert('Failed to send message. Please try again.');
    }
  };
  
  if (isSubmitted) {
    return (
      <div>
        <p>Thank you! Your message has been sent.</p>
        <button onClick={reset}>Send Another Message</button>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <textarea
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        placeholder="Message"
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

---

### **D. Server-Side Idempotency**

#### **1. Idempotency Key Validation**
```javascript
// Express middleware for idempotency
const idempotencyCache = new Map(); // In production, use Redis

function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header required' });
  }
  
  // Check if request was already processed
  const cached = idempotencyCache.get(idempotencyKey);
  
  if (cached) {
    console.log(`Returning cached response for key: ${idempotencyKey}`);
    return res.status(cached.status).json(cached.body);
  }
  
  // Store original res.json to cache response
  const originalJson = res.json.bind(res);
  
  res.json = function(body) {
    // Cache response for 24 hours
    idempotencyCache.set(idempotencyKey, {
      status: res.statusCode,
      body,
      timestamp: Date.now()
    });
    
    // Clean up old entries
    setTimeout(() => {
      idempotencyCache.delete(idempotencyKey);
    }, 24 * 60 * 60 * 1000);
    
    return originalJson(body);
  };
  
  next();
}

// Apply to routes
app.post('/api/payment', idempotencyMiddleware, async (req, res) => {
  const { amount, userId } = req.body;
  
  try {
    const result = await processPayment({ amount, userId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### **2. Database-Level Idempotency**
```javascript
// Postgres example with unique constraint
app.post('/api/order', async (req, res) => {
  const { idempotencyKey, items, userId } = req.body;
  
  try {
    // Insert with unique constraint on idempotencyKey
    const result = await db.query(`
      INSERT INTO orders (idempotency_key, user_id, items, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *;
    `, [idempotencyKey, userId, JSON.stringify(items)]);
    
    if (result.rows.length === 0) {
      // Idempotency key already exists - fetch existing order
      const existing = await db.query(`
        SELECT * FROM orders WHERE idempotency_key = $1
      `, [idempotencyKey]);
      
      return res.json({ order: existing.rows[0], duplicate: true });
    }
    
    // New order created
    const order = result.rows[0];
    
    // Process order (queue job, send email, etc.)
    await processOrder(order.id);
    
    res.json({ order, duplicate: false });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### **E. Event Handler Idempotency**

#### **1. Debounced Handlers**
```javascript
import { debounce } from 'lodash';

function SearchInput() {
  const [query, setQuery] = useState('');
  
  // Debounce ensures only one call per 300ms
  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery) => {
      const results = await fetch(`/api/search?q=${searchQuery}`);
      updateResults(await results.json());
    }, 300),
    []
  );
  
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };
  
  return <input value={query} onChange={handleChange} />;
}
```

#### **2. Single-Flight Operations**
```javascript
function useSingleFlight(fn) {
  const inFlightRef = useRef(null);
  
  return useCallback(async (...args) => {
    // If already in flight, return existing promise
    if (inFlightRef.current) {
      console.log('Operation already in flight');
      return inFlightRef.current;
    }
    
    // Start new operation
    const promise = fn(...args);
    inFlightRef.current = promise;
    
    try {
      const result = await promise;
      return result;
    } finally {
      inFlightRef.current = null;
    }
  }, [fn]);
}

// Usage
function DataLoader() {
  const [data, setData] = useState(null);
  
  const loadData = useSingleFlight(async () => {
    const response = await fetch('/api/data');
    const result = await response.json();
    setData(result);
    return result;
  });
  
  // Multiple rapid clicks only trigger one API call
  return (
    <div>
      <button onClick={loadData}>Load Data</button>
      {data && <DataDisplay data={data} />}
    </div>
  );
}
```

---

### **F. Testing Idempotency**

#### **1. Test Double Execution**
```javascript
describe('Idempotent operations', () => {
  test('Like button is idempotent', async () => {
    const { getByRole } = render(<LikeButton postId="123" initialLiked={false} />);
    const button = getByRole('button');
    
    // Click twice rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    
    // Wait for both to settle
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    
    // Should have made only 1 API call
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Final state should be "liked"
    expect(button).toHaveClass('liked');
  });
  
  test('Payment submission is idempotent', async () => {
    const mockSubmit = jest.fn().mockResolvedValue({ success: true });
    const { getByText } = render(<PaymentForm onSubmit={mockSubmit} />);
    
    const submitButton = getByText('Submit Payment');
    
    // Click 3 times
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
```

---

### **G. Monitoring**

#### **1. Track Idempotency Key Usage**
```javascript
class IdempotencyMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      uniqueKeys: 0,
      duplicateKeys: 0,
      duplicateRate: 0
    };
    this.keys = new Set();
  }
  
  recordRequest(idempotencyKey, isDuplicate) {
    this.metrics.totalRequests++;
    
    if (isDuplicate) {
      this.metrics.duplicateKeys++;
    } else {
      this.metrics.uniqueKeys++;
      this.keys.add(idempotencyKey);
    }
    
    this.metrics.duplicateRate = this.metrics.totalRequests > 0
      ? this.metrics.duplicateKeys / this.metrics.totalRequests
      : 0;
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
}

const metrics = new IdempotencyMetrics();

// Send to monitoring
setInterval(() => {
  const data = metrics.getMetrics();
  
  if (data.duplicateRate > 0.05) {
    console.warn('High idempotency key reuse rate:', data);
  }
  
  analytics.track('idempotency_metrics', data);
}, 60000);
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Stripe**
- All API requests require idempotency keys
- Stores responses for 24 hours
- Same key returns cached response (status + body)
- Critical for payment processing
- Documentation: https://stripe.com/docs/api/idempotent_requests

### **Example 2: AWS**
- Many APIs support idempotency tokens
- EC2 instance creation with ClientToken
- S3 operations are naturally idempotent (PUT)
- DynamoDB conditional writes
- Lambda function retries with same event ID

### **Example 3: Shopify**
- Order creation with idempotency keys
- Webhook deliveries are idempotent
- Inventory updates use compare-and-swap
- Cart operations set absolute state
- Admin API requires idempotency for mutations

### **Example 4: GitHub**
- Pull request creation with unique branch names
- Issue comments are idempotent (update by ID)
- Status checks update by context (not append)
- Branch protection rules set absolute state
- GraphQL mutations with idempotency IDs

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"Idempotency means performing the same operation multiple times produces the same result as doing it once. This is critical for reliability—network failures, retries, and race conditions mean duplicate requests will happen."*
>
> *"For API requests, I'd use idempotency keys. The client generates a unique key per operation attempt (e.g., `payment-${userId}-${timestamp}`) and sends it in a header. The server caches the response for this key for 24 hours. If the same key arrives again, return the cached response instead of re-processing."*
>
> *"For state updates, use absolute values instead of relative changes. Instead of 'increment counter', use 'set counter to 5'. Instead of 'toggle like', use 'set liked to true'. This way, duplicate requests produce the same state."*
>
> *"For form submissions, disable the submit button immediately on first click and track submission state. Even if the button is double-clicked, only one submission occurs. The button stays disabled until success or error, preventing concurrent submissions."*
>
> *"On the backend, implement idempotency at the database level—use unique constraints on idempotency keys. If a duplicate key is inserted, the database constraint prevents it. This works even with multiple servers or processes."*
>
> *"Monitor idempotency key reuse rate—if >5%, indicates client-side bugs or aggressive retries. Track cache hit rate to measure how often idempotency prevents duplicate processing."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive implementations.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Correctness**: Prevents double-processing (double-charges, duplicate records)
- **Reliability**: Enables safe retries after failures
- **UX**: Users can click "Submit" multiple times safely
- **Data integrity**: Maintains consistent state

### **How It Works**
1. **Idempotency keys**: Unique IDs for each operation
2. **Cache responses**: Store result, return cached on duplicate
3. **Absolute state**: Set values, don't increment/toggle
4. **Request de-duplication**: In-flight tracking
5. **Database constraints**: Unique keys prevent duplicates
6. **Disable UI**: Prevent concurrent submissions

### **Best Practices**
- Use idempotency keys for all mutations (POST, PUT, DELETE)
- Cache responses for 24 hours minimum
- Generate keys on client (not server)
- Use absolute state changes, not relative
- Disable submit buttons during processing
- Monitor duplicate rate (<5% is healthy)
- Test with rapid double-clicks
