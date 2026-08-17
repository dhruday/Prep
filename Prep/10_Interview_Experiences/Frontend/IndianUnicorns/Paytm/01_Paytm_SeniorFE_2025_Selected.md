# Paytm — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Paytm |
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
- **Total Rounds:** 3 (Machine Coding + Technical + HM)
- **Timeline:** 1 week
- **Format:** On-site

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Digital Wallet Dashboard** (React)
   - Balance display, transaction list, send money form, QR code scanner placeholder

### 💡 Interview-Ready Answer

```javascript
import { useState, useReducer, useEffect } from 'react';

// Wallet state management
function walletReducer(state, action) {
  switch (action.type) {
    case 'SEND_MONEY': {
      const { to, amount, note } = action;
      if (amount > state.balance) return { ...state, error: 'Insufficient balance' };
      if (amount <= 0) return { ...state, error: 'Invalid amount' };
      
      const txn = {
        id: `txn_${Date.now()}`,
        type: 'debit',
        to,
        amount,
        note,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
      
      return {
        ...state,
        balance: state.balance - amount,
        transactions: [txn, ...state.transactions],
        error: null
      };
    }
    
    case 'RECEIVE_MONEY': {
      const txn = {
        id: `txn_${Date.now()}`,
        type: 'credit',
        from: action.from,
        amount: action.amount,
        note: action.note,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
      
      return {
        ...state,
        balance: state.balance + action.amount,
        transactions: [txn, ...state.transactions]
      };
    }
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

function WalletDashboard() {
  const [state, dispatch] = useReducer(walletReducer, {
    balance: 5000,
    transactions: [
      { id: 'txn_1', type: 'credit', from: 'Salary', amount: 50000, timestamp: '2025-03-01T10:00:00Z', status: 'success' },
      { id: 'txn_2', type: 'debit', to: 'Swiggy', amount: 450, timestamp: '2025-03-02T14:30:00Z', status: 'success' },
      { id: 'txn_3', type: 'debit', to: 'Netflix', amount: 649, timestamp: '2025-03-03T09:00:00Z', status: 'success' },
    ],
    error: null
  });
  
  const [showSendForm, setShowSendForm] = useState(false);
  
  return (
    <div className="wallet-dashboard">
      <header className="wallet-header">
        <h1>Paytm Wallet</h1>
      </header>
      
      {/* Balance Card */}
      <div className="balance-card" role="status" aria-label="Wallet balance">
        <div className="balance-label">Available Balance</div>
        <div className="balance-amount">₹{state.balance.toLocaleString('en-IN')}</div>
        <div className="quick-actions">
          <button onClick={() => setShowSendForm(true)} className="action-btn">
            Send Money
          </button>
          <button className="action-btn">Scan QR</button>
          <button className="action-btn">Add Money</button>
        </div>
      </div>
      
      {/* Error Display */}
      {state.error && (
        <div className="error-banner" role="alert">
          {state.error}
          <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })}>×</button>
        </div>
      )}
      
      {/* Send Money Form */}
      {showSendForm && (
        <SendMoneyForm
          onSend={(data) => {
            dispatch({ type: 'SEND_MONEY', ...data });
            setShowSendForm(false);
          }}
          onCancel={() => setShowSendForm(false)}
          maxAmount={state.balance}
        />
      )}
      
      {/* Transaction List */}
      <section className="transactions" aria-label="Transaction history">
        <h2>Recent Transactions</h2>
        <ul className="txn-list" role="list">
          {state.transactions.map(txn => (
            <TransactionItem key={txn.id} txn={txn} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function SendMoneyForm({ onSend, onCancel, maxAmount }) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (numAmount > maxAmount) return;
    if (!to.trim()) return;
    
    onSend({ to: to.trim(), amount: numAmount, note: note.trim() });
  };
  
  return (
    <form className="send-form" onSubmit={handleSubmit} aria-label="Send money form">
      <h3>Send Money</h3>
      <div className="form-group">
        <label htmlFor="send-to">To (UPI ID / Phone)</label>
        <input id="send-to" type="text" value={to} onChange={e => setTo(e.target.value)}
               placeholder="name@upi or 9876543210" required />
      </div>
      <div className="form-group">
        <label htmlFor="send-amount">Amount (₹)</label>
        <input id="send-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)}
               min="1" max={maxAmount} step="1" required />
      </div>
      <div className="form-group">
        <label htmlFor="send-note">Note (optional)</label>
        <input id="send-note" type="text" value={note} onChange={e => setNote(e.target.value)}
               placeholder="Dinner split" />
      </div>
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">
          Send ₹{amount || '0'}
        </button>
      </div>
    </form>
  );
}

function TransactionItem({ txn }) {
  const isDebit = txn.type === 'debit';
  
  return (
    <li className={`txn-item ${txn.type}`}>
      <div className="txn-icon">{isDebit ? '↑' : '↓'}</div>
      <div className="txn-details">
        <div className="txn-party">{isDebit ? txn.to : txn.from}</div>
        <div className="txn-time">{new Date(txn.timestamp).toLocaleString('en-IN')}</div>
      </div>
      <div className={`txn-amount ${txn.type}`}>
        {isDebit ? '- ' : '+ '}₹{txn.amount.toLocaleString('en-IN')}
      </div>
    </li>
  );
}
```

---

## Round 2: JavaScript + React
**Duration:** 45 minutes

### Questions Asked
1. **Implement a custom hook: useThrottle**
2. **Explain React's key prop — why is index as key bad?**
3. **Implement JSON.stringify (simplified)**

### 💡 useThrottle Hook

```javascript
function useThrottle(value, delay) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return throttledValue;
}

// Usage: Throttle search input
function Search() {
  const [query, setQuery] = useState('');
  const throttledQuery = useThrottle(query, 500);
  
  useEffect(() => {
    if (throttledQuery) fetchResults(throttledQuery);
  }, [throttledQuery]);
  
  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

### 💡 JSON.stringify (simplified)

```javascript
function jsonStringify(value) {
  if (value === null) return 'null';
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'number') {
    if (!isFinite(value)) return 'null'; // Infinity, NaN → null
    return value.toString();
  }
  if (typeof value === 'string') return `"${value.replace(/"/g, '\\"')}"`;
  
  if (Array.isArray(value)) {
    const items = value.map(v => jsonStringify(v) ?? 'null'); // undefined → null in arrays
    return `[${items.join(',')}]`;
  }
  
  if (typeof value === 'object') {
    // Handle toJSON method (like Date)
    if (typeof value.toJSON === 'function') {
      return jsonStringify(value.toJSON());
    }
    
    const pairs = [];
    for (const key of Object.keys(value)) {
      const val = jsonStringify(value[key]);
      if (val !== undefined) { // Skip undefined, functions, symbols
        pairs.push(`"${key}":${val}`);
      }
    }
    return `{${pairs.join(',')}}`;
  }
  
  return undefined;
}
```

---

## 🎯 Key Takeaways
- Paytm = **fintech + React** — expect wallet/payment UI machine coding
- **Wallet Dashboard** with useReducer is a clean state management pattern
- **useThrottle** hook — similar to useDebounce but fires at regular intervals
- **JSON.stringify** implementation — handle all types: null, undefined, NaN, Infinity, toJSON
- **React key prop**: index as key is bad because:
  1. Reordering causes unnecessary re-renders (element remounts instead of moves)
  2. State gets attached to wrong element (input values shift)
  3. Always use stable unique IDs
- Paytm interviews are **less intense** than FAANG but test practical React skills well

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium | React, useReducer, Wallet UI |
| JS + React | Medium-Hard | Throttle Hook, JSON.stringify, Keys |
| HM | Medium | Behavioral |
