# PhonePe — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | SDE-3 Frontend |
| **Level** | Lead |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/phonpe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 1.5 weeks

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Bill Split Calculator (like PhonePe Split Bill)**
   - Add members, add expenses
   - Split types: Equal, Exact amounts, Percentage, Shares
   - Show final settlement: "A pays B ₹200"
   - Minimize transactions in settlement

### 💡 Interview-Ready Answer

```jsx
function BillSplitter() {
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [newMember, setNewMember] = useState('');
  const [showSettlement, setShowSettlement] = useState(false);
  
  const addMember = () => {
    if (!newMember.trim() || members.includes(newMember.trim())) return;
    setMembers(prev => [...prev, newMember.trim()]);
    setNewMember('');
  };
  
  const addExpense = (expense) => {
    // expense: { description, amount, paidBy, splitType, splits }
    // splits depends on splitType:
    //   EQUAL: auto-calculated
    //   EXACT: { member: amount }
    //   PERCENTAGE: { member: percent }
    //   SHARES: { member: shareCount }
    
    let resolvedSplits = {};
    
    switch (expense.splitType) {
      case 'EQUAL': {
        const perPerson = expense.amount / expense.splitWith.length;
        expense.splitWith.forEach(m => { resolvedSplits[m] = perPerson; });
        break;
      }
      case 'EXACT': {
        resolvedSplits = expense.splits;
        // Validate: sum of splits = total
        const sum = Object.values(resolvedSplits).reduce((a, b) => a + b, 0);
        if (Math.abs(sum - expense.amount) > 0.01) {
          alert('Split amounts must equal total');
          return;
        }
        break;
      }
      case 'PERCENTAGE': {
        const totalPercent = Object.values(expense.splits).reduce((a, b) => a + b, 0);
        if (Math.abs(totalPercent - 100) > 0.01) {
          alert('Percentages must add up to 100%');
          return;
        }
        for (const [member, percent] of Object.entries(expense.splits)) {
          resolvedSplits[member] = expense.amount * (percent / 100);
        }
        break;
      }
      case 'SHARES': {
        const totalShares = Object.values(expense.splits).reduce((a, b) => a + b, 0);
        const perShare = expense.amount / totalShares;
        for (const [member, shares] of Object.entries(expense.splits)) {
          resolvedSplits[member] = perShare * shares;
        }
        break;
      }
    }
    
    setExpenses(prev => [...prev, { ...expense, resolvedSplits, id: crypto.randomUUID() }]);
  };
  
  // Calculate net balances
  const calculateBalances = () => {
    const balances = {};
    members.forEach(m => { balances[m] = 0; });
    
    for (const expense of expenses) {
      // Payer gets credit
      balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;
      
      // Each person who owes gets debited
      for (const [member, amount] of Object.entries(expense.resolvedSplits)) {
        balances[member] = (balances[member] || 0) - amount;
      }
    }
    
    return balances; // Positive = owed money, Negative = owes money
  };
  
  // Minimize transactions using greedy algorithm
  // Sort creditors (positive) and debtors (negative)
  // Greedily match largest creditor with largest debtor
  const minimizeTransactions = () => {
    const balances = calculateBalances();
    
    const creditors = []; // People who are owed money
    const debtors = [];   // People who owe money
    
    for (const [member, balance] of Object.entries(balances)) {
      if (balance > 0.01) creditors.push({ member, amount: balance });
      else if (balance < -0.01) debtors.push({ member, amount: -balance });
    }
    
    // Sort both descending by amount
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    
    const settlements = [];
    let i = 0, j = 0;
    
    while (i < debtors.length && j < creditors.length) {
      const transferAmount = Math.min(debtors[i].amount, creditors[j].amount);
      
      settlements.push({
        from: debtors[i].member,
        to: creditors[j].member,
        amount: Math.round(transferAmount * 100) / 100, // Round to 2 decimal places
      });
      
      debtors[i].amount -= transferAmount;
      creditors[j].amount -= transferAmount;
      
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }
    
    return settlements;
  };
  
  const settlements = minimizeTransactions();
  const balances = calculateBalances();
  
  return (
    <div className="bill-splitter">
      <h1>Split Bill</h1>
      
      {/* Members Section */}
      <section aria-label="Members">
        <h2>Members ({members.length})</h2>
        <div className="add-member">
          <input
            value={newMember}
            onChange={e => setNewMember(e.target.value)}
            placeholder="Add member name"
            onKeyDown={e => e.key === 'Enter' && addMember()}
            aria-label="Member name"
          />
          <button onClick={addMember}>Add</button>
        </div>
        <div className="member-chips">
          {members.map(m => (
            <span key={m} className="chip">
              {m}
              <span className={`balance ${balances[m] > 0 ? 'positive' : balances[m] < 0 ? 'negative' : ''}`}>
                {balances[m] > 0 ? `gets ₹${balances[m].toFixed(0)}` :
                 balances[m] < 0 ? `owes ₹${(-balances[m]).toFixed(0)}` : 'settled'}
              </span>
            </span>
          ))}
        </div>
      </section>
      
      {/* Expenses List */}
      <section aria-label="Expenses">
        <h2>Expenses</h2>
        {expenses.map(exp => (
          <div key={exp.id} className="expense-card">
            <h3>{exp.description}</h3>
            <p>₹{exp.amount.toLocaleString('en-IN')} paid by <strong>{exp.paidBy}</strong></p>
            <p className="split-info">{exp.splitType} split</p>
          </div>
        ))}
      </section>
      
      {/* Settlements */}
      <section aria-label="Settlements">
        <h2>Settlements ({settlements.length} transactions)</h2>
        {settlements.length === 0 ? (
          <p>All settled! 🎉</p>
        ) : (
          <ul className="settlement-list" role="list">
            {settlements.map((s, i) => (
              <li key={i} className="settlement-item">
                <span className="from">{s.from}</span>
                <span className="arrow">→ pays →</span>
                <span className="to">{s.to}</span>
                <span className="amount">₹{s.amount.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

---

## Round 2: JavaScript Theory
**Duration:** 45 minutes

### Questions Asked
1. **Implement `Promise.all` from scratch**
2. **Explain microtask vs macrotask queue with examples**

### 💡 Promise.all Polyfill

```javascript
Promise.myAll = function(promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) {
      return reject(new TypeError('Argument must be iterable'));
    }
    
    if (promises.length === 0) {
      return resolve([]);
    }
    
    const results = new Array(promises.length);
    let resolvedCount = 0;
    
    for (let i = 0; i < promises.length; i++) {
      Promise.resolve(promises[i]).then(
        (value) => {
          results[i] = value; // Maintain order
          resolvedCount++;
          
          if (resolvedCount === promises.length) {
            resolve(results);
          }
        },
        (error) => {
          reject(error); // First rejection wins
        }
      );
    }
  });
};

// Microtask vs Macrotask:
console.log('1');                          // Sync
setTimeout(() => console.log('2'), 0);     // Macrotask
Promise.resolve().then(() => console.log('3')); // Microtask
queueMicrotask(() => console.log('4'));    // Microtask
setTimeout(() => console.log('5'), 0);     // Macrotask
console.log('6');                          // Sync

// Output: 1, 6, 3, 4, 2, 5
// Sync first → microtask queue drains completely → next macrotask → repeat
```

---

## 🎯 Key Takeaways
- PhonePe FE = **fintech UI** — bill splitting is a signature question
- **Minimize transactions** algorithm: greedy two-pointer on sorted creditors/debtors — O(n log n)
- **4 split types**: Equal, Exact, Percentage, Shares — validate that splits sum to total
- **Rounding**: `Math.round(amount * 100) / 100` for currency — avoid floating point weirdness
- **Promise.all**: maintain order using index, first rejection short-circuits
- **Microtask queue drains completely** before next macrotask — key event loop concept
- PhonePe values: **fintech domain** + clean code + system design

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Bill Split, Minimize Transactions, Multiple Split Types |
| JavaScript | Medium | Promise.all, Event Loop, Microtask |
| System Design | Hard | UPI Payment Flow, Split Bill at Scale |
| HM | Medium | Behavioral |
