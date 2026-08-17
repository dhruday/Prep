# Paytm — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm (One97 Communications) |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Noida, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/paytm-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 1 week

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a UPI Payment Flow UI (Enter VPA → Enter Amount → Enter PIN → Confirmation)**
   - Multi-step form with back navigation
   - VPA validation (regex + async check)
   - PIN entry: 6 dots that fill as user types (no visible digits)
   - Timer: 30s timeout on PIN screen

### 💡 Interview-Ready Answer

```jsx
function UPIPaymentFlow() {
  const [step, setStep] = useState(0); // 0=VPA, 1=Amount, 2=PIN, 3=Confirmation
  const [vpa, setVpa] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [status, setStatus] = useState('idle'); // idle, validating, processing, success, failed
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const pinInputRef = useRef(null);
  
  // VPA validation
  const validateVPA = async (value) => {
    // Local regex check first
    const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/;
    if (!vpaRegex.test(value)) {
      return { valid: false, error: 'Invalid VPA format (e.g., user@paytm)' };
    }
    
    // Async server validation
    setStatus('validating');
    try {
      const res = await fetch(`/api/upi/validate-vpa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vpa: value }),
      });
      const data = await res.json();
      setStatus('idle');
      return { valid: data.valid, name: data.payeeName, error: data.valid ? '' : 'VPA not found' };
    } catch {
      setStatus('idle');
      return { valid: false, error: 'Unable to verify VPA. Try again.' };
    }
  };
  
  const handleVPASubmit = async () => {
    const result = await validateVPA(vpa);
    if (result.valid) {
      setPayeeName(result.name);
      setError('');
      setStep(1);
    } else {
      setError(result.error);
    }
  };
  
  // PIN entry timer (30 seconds timeout)
  useEffect(() => {
    if (step !== 2) return;
    
    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setError('PIN entry timed out');
          setStep(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [step]);
  
  // PIN input: hidden input + visual dots
  const handlePinChange = (value) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 6);
    setPin(sanitized);
    
    if (sanitized.length === 6) {
      processPayment(sanitized);
    }
  };
  
  const processPayment = async (enteredPin) => {
    setStatus('processing');
    try {
      const res = await fetch('/api/upi/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vpa, amount: parseFloat(amount), pin: enteredPin }),
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus('success');
        setStep(3);
      } else {
        setStatus('failed');
        setError(data.message || 'Payment failed');
        setPin('');
      }
    } catch {
      setStatus('failed');
      setError('Network error. Please try again.');
      setPin('');
    }
  };
  
  const steps = [
    // Step 0: VPA Entry
    <div key="vpa" className="step-vpa">
      <h2>Pay to</h2>
      <div className="input-group">
        <input
          type="text"
          value={vpa}
          onChange={e => { setVpa(e.target.value); setError(''); }}
          placeholder="Enter UPI ID (e.g., name@paytm)"
          aria-label="UPI ID"
          aria-describedby={error ? 'vpa-error' : undefined}
          autoComplete="off"
        />
        {status === 'validating' && <span className="spinner" aria-label="Validating..." />}
      </div>
      {payeeName && <div className="payee-name" aria-live="polite">Paying to: {payeeName}</div>}
      {error && <div id="vpa-error" className="error" role="alert">{error}</div>}
      <button onClick={handleVPASubmit} disabled={!vpa || status === 'validating'}>
        Next
      </button>
    </div>,
    
    // Step 1: Amount Entry
    <div key="amount" className="step-amount">
      <h2>Enter Amount</h2>
      <p>Paying to {payeeName} ({vpa})</p>
      <div className="amount-input">
        <span className="currency">₹</span>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          max="100000"
          aria-label="Amount in rupees"
          inputMode="decimal"
          autoFocus
        />
      </div>
      {/* Quick amount buttons */}
      <div className="quick-amounts" role="group" aria-label="Quick amount selection">
        {[100, 200, 500, 1000, 2000, 5000].map(amt => (
          <button key={amt} onClick={() => setAmount(String(amt))} className="quick-btn">
            ₹{amt.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
      <div className="step-buttons">
        <button onClick={() => setStep(0)} className="back">Back</button>
        <button onClick={() => setStep(2)} disabled={!amount || parseFloat(amount) <= 0}>
          Pay ₹{amount ? parseFloat(amount).toLocaleString('en-IN') : '0'}
        </button>
      </div>
    </div>,
    
    // Step 2: PIN Entry
    <div key="pin" className="step-pin">
      <h2>Enter UPI PIN</h2>
      <p className="timer" aria-live="polite" role="timer">
        Time remaining: {timeLeft}s
      </p>
      
      {/* Hidden actual input */}
      <input
        ref={pinInputRef}
        type="password"
        value={pin}
        onChange={e => handlePinChange(e.target.value)}
        className="hidden-pin-input"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus
        aria-label="Enter 6-digit UPI PIN"
      />
      
      {/* Visual PIN dots */}
      <div className="pin-dots" onClick={() => pinInputRef.current?.focus()} role="presentation">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
        ))}
      </div>
      
      {error && <div className="error" role="alert">{error}</div>}
      {status === 'processing' && <div className="processing" aria-live="polite">Processing payment...</div>}
    </div>,
    
    // Step 3: Confirmation
    <div key="confirm" className="step-confirm">
      <div className="success-animation" aria-hidden="true">✓</div>
      <h2 role="status">Payment Successful!</h2>
      <p>₹{parseFloat(amount).toLocaleString('en-IN')} sent to {payeeName}</p>
      <p className="txn-id">Transaction ID: UPI{Date.now()}</p>
      <button onClick={() => { setStep(0); setVpa(''); setAmount(''); setPin(''); }}>
        New Payment
      </button>
    </div>,
  ];
  
  return (
    <div className="upi-flow" role="form" aria-label="UPI Payment">
      {/* Step indicator */}
      <div className="step-indicator" role="navigation" aria-label="Payment steps">
        {['VPA', 'Amount', 'PIN', 'Done'].map((label, i) => (
          <div key={i} className={`indicator ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}`}>
            <span className="indicator-number">{i < step ? '✓' : i + 1}</span>
            <span className="indicator-label">{label}</span>
          </div>
        ))}
      </div>
      
      {steps[step]}
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- Paytm FE = **UPI payment flow UI** is the signature question
- **PIN entry**: hidden input + visual dots — never show actual digits
- **30-second timeout** on PIN screen (UPI requirement)
- **VPA validation**: regex first (`user@bank`), then async server check
- **Quick amount buttons**: ₹100, ₹200, ₹500 — common UX pattern
- **Multi-step form**: step indicator with back navigation
- **inputMode="numeric"**: brings up numeric keyboard on mobile
- Know **UPI flow**: PSP → NPCI → Beneficiary Bank → Response
- Paytm values **practical fintech UX** + mobile-first design

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | UPI Flow, Multi-Step Form, PIN Entry |
| JavaScript | Medium | Closures, Promises, Event Loop |
| System Design | Hard | Payment Gateway UI, Micro-Frontends |
| HM | Medium | Behavioral |
