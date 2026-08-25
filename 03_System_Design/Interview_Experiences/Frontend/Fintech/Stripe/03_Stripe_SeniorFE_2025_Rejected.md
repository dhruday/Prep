# Stripe — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Stripe |
| **Role** | Senior Frontend Engineer |
| **Level** | L3 |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Remote (US) |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Stripe-Interview-Questions-E671932.htm) |
| **Author** | Anonymous |
| **Rejection Reason** | Integration exercise — race condition in payment form submission |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Bug Squash + Integration + System Design + Values)
- **Timeline:** 2 weeks

---

## Round 1: Bug Squash
**Duration:** 60 minutes (4 bugs to fix)

### Bug 1: Double Submit
```javascript
// BUGGY: Payment form submits twice on fast double-click
async function handleSubmit() {
  const response = await createPaymentIntent();
  await confirmPayment(response.clientSecret);
}

// FIX: Disable during submission + idempotency key
let isSubmitting = false;
async function handleSubmit() {
  if (isSubmitting) return;
  isSubmitting = true;
  
  try {
    const idempotencyKey = crypto.randomUUID();
    const response = await createPaymentIntent({ idempotencyKey });
    await confirmPayment(response.clientSecret);
  } finally {
    isSubmitting = false;
  }
}
```

### Bug 2: Memory Leak in Element Mount
```javascript
// BUGGY: Stripe Elements listener not cleaned up
useEffect(() => {
  const element = stripe.elements().create('card');
  element.mount('#card-element');
  element.on('change', handleChange);
  // Missing cleanup!
}, []);

// FIX: Unmount + remove listener
useEffect(() => {
  const elements = stripe.elements();
  const cardElement = elements.create('card');
  cardElement.mount('#card-element');
  cardElement.on('change', handleChange);
  
  return () => {
    cardElement.off('change', handleChange);
    cardElement.unmount();
    cardElement.destroy();
  };
}, []);
```

### Bug 3: XSS in Error Display
```javascript
// BUGGY: Error message rendered as HTML
function ErrorDisplay({ error }) {
  return <div dangerouslySetInnerHTML={{ __html: error.message }} />;
}

// FIX: Render as text, never use dangerouslySetInnerHTML with untrusted data
function ErrorDisplay({ error }) {
  return <div role="alert">{error.message}</div>;
}
```

### Bug 4: Race Condition in Amount Update
```javascript
// BUGGY: Network responses arrive out of order when user types fast
function AmountInput() {
  const [amount, setAmount] = useState(0);
  const [preview, setPreview] = useState(null);
  
  useEffect(() => {
    fetch(`/api/preview?amount=${amount}`).then(r => r.json()).then(setPreview);
  }, [amount]);
}

// FIX: Use AbortController to cancel stale requests
function AmountInput() {
  const [amount, setAmount] = useState(0);
  const [preview, setPreview] = useState(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    fetch(`/api/preview?amount=${amount}`, { signal: controller.signal })
      .then(r => r.json())
      .then(setPreview)
      .catch(err => {
        if (err.name !== 'AbortError') console.error(err);
      });
    
    return () => controller.abort();
  }, [amount]);
}
```

---

## Round 2: Integration Exercise
**Duration:** 90 minutes

### Challenge
**Build a Multi-Step Payment Flow with Stripe.js**
- Step 1: Enter amount + currency
- Step 2: Card details (Stripe Elements)
- Step 3: 3D Secure authentication (if required)
- Step 4: Confirmation with receipt

### 💡 Key Implementation

```jsx
function PaymentFlow() {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState('usd');
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);
  const stripe = useStripe();
  const elements = useElements();
  
  // Step 1: Create PaymentIntent on server
  const handleAmountSubmit = async () => {
    setError(null);
    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create payment');
      const { client_secret } = await res.json();
      setClientSecret(client_secret);
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Step 2: Confirm payment (handles 3DS automatically)
  const handlePayment = async () => {
    if (!stripe || !elements) return;
    setError(null);
    
    const cardElement = elements.getElement(CardElement);
    
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: { card: cardElement },
      }
    );
    
    if (stripeError) {
      if (stripeError.type === 'card_error') {
        setError(stripeError.message); // User-facing error
      } else {
        setError('An unexpected error occurred.');
      }
      return;
    }
    
    // Handle 3DS flow
    if (paymentIntent.status === 'requires_action') {
      // Stripe.js handles 3DS modal automatically
      const { error: actionError, paymentIntent: confirmed } =
        await stripe.confirmCardPayment(clientSecret);
      
      if (actionError) {
        setError('Authentication failed. Please try again.');
        return;
      }
      
      setPaymentStatus(confirmed.status);
    } else {
      setPaymentStatus(paymentIntent.status);
    }
    
    setStep(paymentIntent.status === 'succeeded' ? 4 : 3);
  };
  
  return (
    <div className="payment-flow">
      {/* Progress indicator */}
      <nav aria-label="Payment progress">
        <ol className="steps">
          {['Amount', 'Card Details', 'Verify', 'Confirmation'].map((label, i) => (
            <li key={i} className={step > i + 1 ? 'completed' : step === i + 1 ? 'current' : ''}>
              <span aria-current={step === i + 1 ? 'step' : undefined}>{label}</span>
            </li>
          ))}
        </ol>
      </nav>
      
      {error && <div className="error" role="alert">{error}</div>}
      
      {step === 1 && (
        <form onSubmit={e => { e.preventDefault(); handleAmountSubmit(); }}>
          <label>
            Amount
            <input type="number" min="0.50" step="0.01" value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              required aria-describedby="amount-help" />
          </label>
          <small id="amount-help">Minimum $0.50</small>
          
          <label>
            Currency
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="usd">USD</option>
              <option value="eur">EUR</option>
              <option value="inr">INR</option>
            </select>
          </label>
          
          <button type="submit">Continue to Payment</button>
        </form>
      )}
      
      {step === 2 && (
        <form onSubmit={e => { e.preventDefault(); handlePayment(); }}>
          <CardElement options={{
            style: {
              base: { fontSize: '16px', color: '#32325d' },
              invalid: { color: '#fa755a' },
            },
            hidePostalCode: true,
          }} />
          <button type="submit" disabled={!stripe}>
            Pay {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)}
          </button>
        </form>
      )}
      
      {step === 4 && (
        <div className="confirmation" role="status">
          <h2>✓ Payment Successful</h2>
          <p>Amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)}</p>
          <p>Status: {paymentStatus}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- Stripe Bug Squash = **find & fix 4 bugs in 60 min** — security, memory, race conditions, UX
- **Double submit prevention**: boolean guard + `finally` block + idempotency key on server
- **Memory leak**: always unmount + destroy Stripe Elements on cleanup
- **XSS**: never use `dangerouslySetInnerHTML` with user/server data
- **Race condition**: AbortController to cancel stale fetch requests
- **3DS flow**: `stripe.confirmCardPayment` handles 3DS modal automatically
- **Amount handling**: always convert to smallest unit (cents) → `Math.round(amount * 100)`
- **Intl.NumberFormat**: use for currency formatting — respects locale and currency code
- Stripe values: **correctness > speed**, attention to edge cases, PCI compliance awareness

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Bug Squash | Medium-Hard | XSS, Memory Leak, Race Condition |
| Integration | Hard | Stripe.js, 3DS, Multi-Step Form |
| System Design | Hard | Payment Infrastructure |
| Values | Medium | Stripe Culture, Rigor |
