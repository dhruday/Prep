# PhonePe — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/phonpe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design — didn't address offline-first UPI payment flow

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a UPI Payment History with Infinite Scroll & Filters**
   - Transaction list with pull-to-refresh, date filters, search, amount grouping

### 💡 Interview-Ready Answer

```javascript
function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({ type: 'ALL', dateRange: null, search: '' });
  const sentinelRef = useRef(null);
  const containerRef = useRef(null);
  const pullStartY = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!hasMore || loading) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' } // Preload 200px before reaching bottom
    );
    
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page]);
  
  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        type: filters.type,
        search: filters.search,
      });
      
      if (filters.dateRange) {
        params.set('from', filters.dateRange.from);
        params.set('to', filters.dateRange.to);
      }
      
      const response = await fetch(`/api/transactions?${params}`);
      const data = await response.json();
      
      setTransactions(prev => [...prev, ...data.transactions]);
      setHasMore(data.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Pull-to-refresh (touch events)
  const handleTouchStart = (e) => {
    if (containerRef.current.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  };
  
  const handleTouchEnd = async (e) => {
    const pullDistance = e.changedTouches[0].clientY - pullStartY.current;
    
    if (pullDistance > 80 && containerRef.current.scrollTop === 0) {
      setRefreshing(true);
      try {
        const response = await fetch('/api/transactions?page=1&limit=20');
        const data = await response.json();
        setTransactions(data.transactions);
        setPage(2);
        setHasMore(data.hasMore);
      } finally {
        setRefreshing(false);
      }
    }
    
    pullStartY.current = 0;
  };
  
  // Group transactions by date
  const grouped = useMemo(() => {
    const groups = {};
    for (const txn of transactions) {
      const dateKey = formatDateGroup(txn.timestamp);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(txn);
    }
    return groups;
  }, [transactions]);
  
  return (
    <div
      ref={containerRef}
      className="txn-history"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="feed"
      aria-label="Transaction history"
    >
      {/* Filters */}
      <div className="filters" role="group" aria-label="Transaction filters">
        <select
          value={filters.type}
          onChange={e => {
            setFilters(prev => ({ ...prev, type: e.target.value }));
            setTransactions([]); setPage(1); setHasMore(true);
          }}
          aria-label="Transaction type"
        >
          <option value="ALL">All</option>
          <option value="SENT">Sent</option>
          <option value="RECEIVED">Received</option>
          <option value="FAILED">Failed</option>
        </select>
        
        <input
          type="search"
          placeholder="Search by name or UPI ID"
          value={filters.search}
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
          aria-label="Search transactions"
        />
      </div>
      
      {/* Pull-to-refresh indicator */}
      {refreshing && <div className="refresh-spinner" aria-live="polite">Refreshing...</div>}
      
      {/* Grouped transactions */}
      {Object.entries(grouped).map(([date, txns]) => (
        <section key={date} aria-label={`Transactions on ${date}`}>
          <h3 className="date-header">{date}</h3>
          
          {txns.map(txn => (
            <TransactionItem key={txn.id} transaction={txn} />
          ))}
        </section>
      ))}
      
      {/* Loading / sentinel */}
      {loading && <div className="loading-skeleton" aria-busy="true">Loading...</div>}
      {hasMore && <div ref={sentinelRef} className="sentinel" aria-hidden="true" />}
      {!hasMore && transactions.length > 0 && (
        <div className="end-message">No more transactions</div>
      )}
    </div>
  );
}

function TransactionItem({ transaction: txn }) {
  const isCredit = txn.type === 'RECEIVED';
  
  return (
    <article className={`txn-item ${txn.status.toLowerCase()}`} aria-label={`${txn.type} ₹${txn.amount}`}>
      <div className="txn-avatar">
        {txn.contactName?.[0]?.toUpperCase() || '?'}
      </div>
      
      <div className="txn-details">
        <div className="txn-name">{txn.contactName || txn.upiId}</div>
        <div className="txn-time">{formatTime(txn.timestamp)}</div>
        {txn.note && <div className="txn-note">{txn.note}</div>}
      </div>
      
      <div className={`txn-amount ${isCredit ? 'credit' : 'debit'}`}>
        {isCredit ? '+' : '-'} ₹{txn.amount.toLocaleString('en-IN')}
      </div>
      
      {txn.status === 'FAILED' && (
        <span className="txn-status failed" aria-label="Failed transaction">Failed</span>
      )}
      {txn.status === 'PENDING' && (
        <span className="txn-status pending" aria-label="Pending transaction">Pending</span>
      )}
    </article>
  );
}

function formatDateGroup(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement Function.prototype.bind polyfill**
2. **Explain prototypal inheritance with example**
3. **Output: Promise.resolve().then() vs setTimeout ordering**

### 💡 bind Polyfill

```javascript
Function.prototype.myBind = function(context, ...boundArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('bind must be called on a function');
  }
  
  const originalFn = this;
  
  function BoundFunction(...callArgs) {
    // If called with new: 'this' should be the new instance, not context
    const isNewCall = this instanceof BoundFunction;
    const finalContext = isNewCall ? this : context;
    
    return originalFn.apply(finalContext, [...boundArgs, ...callArgs]);
  }
  
  // Maintain prototype chain for new
  if (originalFn.prototype) {
    BoundFunction.prototype = Object.create(originalFn.prototype);
  }
  
  return BoundFunction;
};

// Prototypal Inheritance:
function Animal(name) { this.name = name; }
Animal.prototype.speak = function() { return `${this.name} makes a sound`; };

function Dog(name, breed) {
  Animal.call(this, name); // Call parent constructor
  this.breed = breed;
}

// Set up prototype chain
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.bark = function() { return `${this.name} barks!`; };

// Lookup chain: dog instance → Dog.prototype → Animal.prototype → Object.prototype → null

// Promise vs setTimeout:
console.log('1');
setTimeout(() => console.log('2'), 0);      // Macrotask
Promise.resolve().then(() => console.log('3')); // Microtask
console.log('4');
// Output: 1, 4, 3, 2
// Microtasks (Promise.then) execute before macrotasks (setTimeout)
```

---

## 🎯 Key Takeaways
- PhonePe FE = **UPI-specific UI patterns** (transaction history, payment flow)
- **Infinite scroll**: IntersectionObserver + sentinel element + deduplication
- **Pull-to-refresh**: touch events + scroll position check (scrollTop === 0)
- **Date grouping**: Today/Yesterday/formatted date — standard for transaction UIs
- **Indian currency format**: `toLocaleString('en-IN')` → 1,00,000 (lakhs, not thousands)
- **bind polyfill** with `new` support = check `this instanceof BoundFunction`
- PhonePe **rejected me** because I didn't discuss offline-first: "What if user initiates payment but phone goes offline?" → need to cache pending transactions in IndexedDB and sync

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Infinite Scroll, Pull-to-Refresh, Grouping |
| JavaScript | Medium | bind, Prototypal Inheritance, Event Loop |
| System Design | Hard | Offline-First UPI, Service Worker |
| HM | Medium | Behavioral |
