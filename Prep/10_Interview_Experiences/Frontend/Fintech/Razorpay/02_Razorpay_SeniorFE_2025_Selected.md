# Razorpay — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 10 days

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build an Embeddable Payment Form (like Razorpay Checkout)**
   - Card number with formatting, expiry, CVV, UPI ID, error validation, responsive

### 💡 Interview-Ready Answer

```javascript
function PaymentForm({ merchantKey, amount, currency = 'INR', onSuccess, onError }) {
  const [method, setMethod] = useState('card');
  const [formData, setFormData] = useState({
    cardNumber: '', expiry: '', cvv: '', name: '', upiId: ''
  });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  
  // Card number formatting: 4242 4242 4242 4242
  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };
  
  // Detect card network from BIN (first 6 digits)
  const detectCardNetwork = (number) => {
    const n = number.replace(/\s/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    if (/^6(?:011|5)/.test(n)) return 'discover';
    if (/^35(?:2[89]|[3-8])/.test(n)) return 'jcb';
    if (/^(?:508|60|65|81|82)/.test(n)) return 'rupay';
    return null;
  };
  
  // Luhn algorithm — validate card number
  const isValidLuhn = (number) => {
    const digits = number.replace(/\s/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };
  
  // Expiry formatting: MM/YY
  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) {
      return digits.slice(0, 2) + '/' + digits.slice(2);
    }
    return digits;
  };
  
  const isExpiryValid = (expiry) => {
    const [month, year] = expiry.split('/').map(Number);
    if (!month || !year || month < 1 || month > 12) return false;
    
    const now = new Date();
    const expiryDate = new Date(2000 + year, month); // First day of next month
    return expiryDate > now;
  };
  
  const isValidUPI = (upiId) => {
    // Format: username@bankhandle
    return /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/.test(upiId);
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (method === 'card') {
      if (!isValidLuhn(formData.cardNumber)) {
        newErrors.cardNumber = 'Invalid card number';
      }
      if (!isExpiryValid(formData.expiry)) {
        newErrors.expiry = 'Card expired or invalid';
      }
      const cvvLength = detectCardNetwork(formData.cardNumber) === 'amex' ? 4 : 3;
      if (formData.cvv.length !== cvvLength) {
        newErrors.cvv = `CVV must be ${cvvLength} digits`;
      }
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
      }
    } else if (method === 'upi') {
      if (!isValidUPI(formData.upiId)) {
        newErrors.upiId = 'Invalid UPI ID (e.g., name@oksbi)';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setProcessing(true);
    
    try {
      const payload = {
        key: merchantKey,
        amount: amount * 100, // Razorpay uses paise (smallest currency unit)
        currency,
        method,
        ...(method === 'card' ? {
          card: {
            number: formData.cardNumber.replace(/\s/g, ''),
            expiry_month: formData.expiry.split('/')[0],
            expiry_year: '20' + formData.expiry.split('/')[1],
            cvv: formData.cvv,
            name: formData.name,
          }
        } : {
          vpa: formData.upiId,
        }),
      };
      
      const response = await fetch('https://api.razorpay.com/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (result.razorpay_payment_id) {
        onSuccess?.(result);
      } else {
        onError?.(result.error);
      }
    } catch (error) {
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };
  
  const network = detectCardNetwork(formData.cardNumber);
  const isAmex = network === 'amex';
  
  return (
    <form onSubmit={handleSubmit} className="payment-form" noValidate aria-label="Payment form">
      <div className="amount-display" aria-label="Payment amount">
        ₹{amount.toLocaleString('en-IN')}
      </div>
      
      {/* Payment method tabs */}
      <div role="tablist" aria-label="Payment methods">
        {['card', 'upi', 'netbanking'].map(m => (
          <button key={m} type="button" role="tab"
            aria-selected={method === m} onClick={() => setMethod(m)}>
            {m.toUpperCase()}
          </button>
        ))}
      </div>
      
      {method === 'card' && (
        <div role="tabpanel">
          <div className={`field ${errors.cardNumber ? 'error' : ''}`}>
            <label htmlFor="card-number">Card Number</label>
            <div className="card-input-wrapper">
              <input
                id="card-number"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                value={formData.cardNumber}
                onChange={e => setFormData(prev => ({
                  ...prev, cardNumber: formatCardNumber(e.target.value)
                }))}
                maxLength={19}
                aria-invalid={!!errors.cardNumber}
                aria-describedby={errors.cardNumber ? 'card-error' : undefined}
              />
              {network && <img src={`/icons/${network}.svg`} alt={network} className="card-icon" />}
            </div>
            {errors.cardNumber && <span id="card-error" className="error-msg" role="alert">{errors.cardNumber}</span>}
          </div>
          
          <div className="row">
            <div className={`field ${errors.expiry ? 'error' : ''}`}>
              <label htmlFor="expiry">Expiry</label>
              <input
                id="expiry"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={formData.expiry}
                onChange={e => setFormData(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                maxLength={5}
              />
            </div>
            
            <div className={`field ${errors.cvv ? 'error' : ''}`}>
              <label htmlFor="cvv">CVV</label>
              <input
                id="cvv"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder={isAmex ? '••••' : '•••'}
                value={formData.cvv}
                onChange={e => setFormData(prev => ({
                  ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, isAmex ? 4 : 3)
                }))}
                maxLength={isAmex ? 4 : 3}
              />
            </div>
          </div>
        </div>
      )}
      
      {method === 'upi' && (
        <div role="tabpanel">
          <label htmlFor="upi-id">UPI ID</label>
          <input
            id="upi-id"
            type="text"
            placeholder="username@oksbi"
            value={formData.upiId}
            onChange={e => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
            aria-invalid={!!errors.upiId}
          />
          {errors.upiId && <span role="alert" className="error-msg">{errors.upiId}</span>}
        </div>
      )}
      
      <button type="submit" disabled={processing} className="pay-btn">
        {processing ? 'Processing...' : `Pay ₹${amount.toLocaleString('en-IN')}`}
      </button>
    </form>
  );
}
```

---

## Round 2: JavaScript
**Duration:** 45 minutes

### Questions Asked
1. **Implement a Task Queue with concurrency limit**
2. **Explain `this` binding rules with examples**

### 💡 Task Queue with Concurrency

```javascript
class TaskQueue {
  #concurrency;
  #running = 0;
  #queue = [];
  
  constructor(concurrency) {
    if (concurrency < 1) throw new Error('Concurrency must be >= 1');
    this.#concurrency = concurrency;
  }
  
  add(taskFn) {
    return new Promise((resolve, reject) => {
      this.#queue.push({ taskFn, resolve, reject });
      this.#run();
    });
  }
  
  #run() {
    while (this.#running < this.#concurrency && this.#queue.length > 0) {
      const { taskFn, resolve, reject } = this.#queue.shift();
      this.#running++;
      
      taskFn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.#running--;
          this.#run(); // Process next task
        });
    }
  }
  
  get pending() { return this.#queue.length; }
  get active() { return this.#running; }
}

// Usage:
const queue = new TaskQueue(3); // Max 3 concurrent tasks
queue.add(() => fetch('/api/1'));
queue.add(() => fetch('/api/2'));
queue.add(() => fetch('/api/3'));
queue.add(() => fetch('/api/4')); // Waits for one of first 3 to finish

// `this` binding rules (priority order):
// 1. new binding: function called with new → this = new object
// 2. Explicit: call/apply/bind → this = specified object
// 3. Implicit: obj.method() → this = obj
// 4. Default: standalone call → this = window (sloppy) / undefined (strict)
// Arrow functions: NO own this, inherit from lexical scope
```

---

## 🎯 Key Takeaways
- Razorpay FE = **payment checkout form** is the quintessential machine coding question
- **Luhn algorithm** for card validation — must know this for any fintech FE
- **Card network detection** from BIN (first digits): 4=Visa, 51-55=MC, 34/37=Amex, 508/60/65=RuPay
- **Paise not Rupees**: Razorpay API uses smallest currency unit (₹100 = 10000 paise)
- **CVV**: 3 digits for Visa/MC, 4 digits for Amex
- **Task Queue** with concurrency = classic JavaScript async question
- **`this` rules**: new > explicit > implicit > default (arrow has none)
- Good **accessibility**: aria-invalid, aria-describedby for errors, role="alert", autocomplete

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Payment Form, Luhn, Card Detection, a11y |
| JavaScript | Medium | Task Queue, `this` Binding |
| System Design | Hard | Payment Dashboard, Real-time Analytics |
| HM | Medium | Behavioral |
