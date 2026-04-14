# Cred — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | CRED |
| **Role** | SDE-3 Frontend |
| **Level** | Lead |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/cred-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + Founder)
- **Rejection Reason:** Founder round — couldn't articulate product-market fit for CRED's rewards model

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Credit Card Bill Payment Flow with Amount Selection UI**
   - Show outstanding amount, minimum due, last date
   - Slider to select custom amount (min due ↔ outstanding)
   - Number pad for exact amount entry
   - Payment confirmation with UPI/Net Banking/Card options

### 💡 Interview-Ready Answer

```jsx
function BillPaymentFlow({ card }) {
  const [amount, setAmount] = useState(card.outstandingAmount);
  const [inputMode, setInputMode] = useState('slider'); // slider | numpad
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [step, setStep] = useState('amount'); // amount | method | confirm
  
  const MIN_AMOUNT = card.minimumDue;
  const MAX_AMOUNT = card.outstandingAmount;
  
  // Slider with custom track fill
  const sliderPercent = ((amount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT)) * 100;
  
  // Quick select amounts
  const quickAmounts = [
    { label: 'Minimum Due', value: card.minimumDue },
    { label: 'Total Due', value: card.totalDue },
    { label: 'Outstanding', value: card.outstandingAmount },
  ];
  
  // Number pad for manual entry
  const handleNumpadPress = (key) => {
    if (key === 'backspace') {
      setAmount(prev => Math.floor(prev / 10));
    } else if (key === 'clear') {
      setAmount(0);
    } else {
      const digit = parseInt(key);
      setAmount(prev => {
        const newAmount = prev * 10 + digit;
        return Math.min(newAmount, MAX_AMOUNT);
      });
    }
  };
  
  // Savings calculation
  const interestSaved = useMemo(() => {
    if (amount >= card.outstandingAmount) return card.interestPerMonth;
    if (amount >= card.totalDue) return card.interestPerMonth * 0.7;
    // Paying more than minimum saves proportionally
    const ratio = (amount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT);
    return card.interestPerMonth * ratio;
  }, [amount, card]);
  
  return (
    <div className="bill-payment">
      {step === 'amount' && (
        <div className="amount-step">
          {/* Card Summary */}
          <div className="card-summary" role="region" aria-label="Card summary">
            <div className="card-visual" style={{ background: `linear-gradient(135deg, ${card.color1}, ${card.color2})` }}>
              <span className="card-name">{card.bankName}</span>
              <span className="card-number">•••• {card.lastFour}</span>
            </div>
            
            <div className="bill-info">
              <div className="info-item">
                <span className="label">Outstanding</span>
                <span className="value">₹{card.outstandingAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="info-item">
                <span className="label">Minimum Due</span>
                <span className="value">₹{card.minimumDue.toLocaleString('en-IN')}</span>
              </div>
              <div className="info-item">
                <span className="label">Due Date</span>
                <span className={`value ${card.daysUntilDue <= 3 ? 'urgent' : ''}`}>
                  {card.dueDate} ({card.daysUntilDue} days left)
                </span>
              </div>
            </div>
          </div>
          
          {/* Amount Selection */}
          <div className="amount-selection">
            <h2>Pay Amount</h2>
            
            {/* Quick select chips */}
            <div className="quick-chips" role="group" aria-label="Quick amount selection">
              {quickAmounts.map(qa => (
                <button
                  key={qa.label}
                  className={`chip ${amount === qa.value ? 'active' : ''}`}
                  onClick={() => setAmount(qa.value)}
                  aria-pressed={amount === qa.value}
                >
                  {qa.label}
                  <span className="chip-amount">₹{qa.value.toLocaleString('en-IN')}</span>
                </button>
              ))}
            </div>
            
            {/* Amount display */}
            <div className="amount-display" aria-live="polite">
              <span className="currency">₹</span>
              <span className="amount-value">{amount.toLocaleString('en-IN')}</span>
            </div>
            
            {/* Slider */}
            {inputMode === 'slider' && (
              <div className="slider-container">
                <input
                  type="range"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="amount-slider"
                  aria-label="Payment amount"
                  style={{ '--fill': `${sliderPercent}%` }}
                />
                <div className="slider-labels">
                  <span>Min ₹{MIN_AMOUNT.toLocaleString('en-IN')}</span>
                  <span>Max ₹{MAX_AMOUNT.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
            
            {/* Number Pad */}
            {inputMode === 'numpad' && (
              <div className="numpad" role="group" aria-label="Number pad">
                {['1','2','3','4','5','6','7','8','9','clear','0','backspace'].map(key => (
                  <button
                    key={key}
                    onClick={() => handleNumpadPress(key)}
                    className={`numpad-key ${key === 'backspace' || key === 'clear' ? 'action' : ''}`}
                    aria-label={key === 'backspace' ? 'Delete' : key}
                  >
                    {key === 'backspace' ? '⌫' : key === 'clear' ? 'C' : key}
                  </button>
                ))}
              </div>
            )}
            
            {/* Toggle input mode */}
            <button className="toggle-input" onClick={() => setInputMode(prev => prev === 'slider' ? 'numpad' : 'slider')}>
              {inputMode === 'slider' ? 'Enter exact amount' : 'Use slider'}
            </button>
            
            {/* Interest savings info */}
            {interestSaved > 0 && (
              <div className="savings-info" role="status">
                💰 You'll save ₹{interestSaved.toLocaleString('en-IN')} in interest this month
              </div>
            )}
            
            {amount < MIN_AMOUNT && (
              <div className="warning" role="alert">
                ⚠️ Amount must be at least ₹{MIN_AMOUNT.toLocaleString('en-IN')} (minimum due)
              </div>
            )}
          </div>
          
          <button
            className="pay-btn"
            onClick={() => setStep('method')}
            disabled={amount < MIN_AMOUNT}
          >
            Pay ₹{amount.toLocaleString('en-IN')}
          </button>
        </div>
      )}
      
      {step === 'method' && (
        <div className="method-step">
          <h2>Select Payment Method</h2>
          {['UPI', 'Net Banking', 'Debit Card', 'CRED Pay'].map(method => (
            <button
              key={method}
              className={`method-option ${paymentMethod === method ? 'selected' : ''}`}
              onClick={() => setPaymentMethod(method)}
              role="radio"
              aria-checked={paymentMethod === method}
            >
              {method}
              {method === 'CRED Pay' && <span className="badge">Earn CRED Coins</span>}
            </button>
          ))}
          <button onClick={() => setStep('confirm')} disabled={!paymentMethod}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement a deep object comparison function** (handle Date, RegExp, Map, Set, circular refs)
2. **What is the difference between `requestAnimationFrame`, `setTimeout(0)`, and `queueMicrotask`?**

### 💡 Deep Equal with Circular Reference Detection

```javascript
function deepEqual(a, b, seen = new WeakMap()) {
  // Primitive comparison
  if (a === b) return true;
  
  // NaN check
  if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) return true;
  
  // Null/undefined or different types
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  
  // Circular reference detection
  if (seen.has(a)) return seen.get(a) === b;
  seen.set(a, b);
  
  // Constructor must match
  if (a.constructor !== b.constructor) return false;
  
  // Date
  if (a instanceof Date) return a.getTime() === b.getTime();
  
  // RegExp
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  
  // Map
  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key) || !deepEqual(val, b.get(key), seen)) return false;
    }
    return true;
  }
  
  // Set
  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    for (const val of a) {
      // For objects in Set, need to find a matching element
      let found = false;
      for (const bVal of b) {
        if (deepEqual(val, bVal, seen)) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  }
  
  // Array
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i], seen));
  }
  
  // Plain object
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key =>
    Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key], seen)
  );
}
```

**Execution timing:**
```
// queueMicrotask → requestAnimationFrame → setTimeout(0)
// 
// Microtask (queueMicrotask, Promise.then):
//   Runs AFTER current task, BEFORE rendering. Drains completely.
//   ~0ms delay.
//
// requestAnimationFrame:
//   Runs BEFORE next paint. Aligned to display refresh (~16.67ms for 60fps).
//   Good for visual updates.
//
// setTimeout(0):
//   Macrotask. Runs AFTER any pending microtasks AND rendering.
//   Minimum 4ms delay in browsers (after nesting threshold).
//   Can be delayed by other macrotasks in queue.
```

---

## 🎯 Key Takeaways
- CRED FE = **premium fintech UI** — bill payment flow with polished UX
- **Amount slider with fill**: CSS variable `--fill` for dynamic track color
- **Number pad**: mobile-friendly exact amount entry
- **Interest savings calculator**: motivate paying more than minimum
- **Quick select chips**: Minimum Due / Total Due / Outstanding
- **Deep equal**: handle Date, RegExp, Map, Set, circular refs with WeakMap
- CRED Founder round: understand **CRED's business model** (trust scores, rewards, merchant ecosystem)
- **requestAnimationFrame vs setTimeout**: rAF aligns with paint cycle (~16.67ms), setTimeout is macrotask (min 4ms)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Bill Payment UI, Slider, Number Pad |
| JavaScript | Hard | Deep Equal, Circular Refs, Event Loop |
| System Design | Hard | Payment Gateway, Credit Score |
| Founder | Very Hard | Product Thinking, Business Model |
