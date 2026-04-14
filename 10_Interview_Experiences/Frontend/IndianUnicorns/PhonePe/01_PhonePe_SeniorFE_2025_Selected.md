# PhonePe — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | PhonePe |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4.5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/phonepe-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + 2 Technical + HM)
- **Timeline:** 1 week
- **Format:** On-site
- **Note:** PhonePe is fintech — expect payment/transaction-related questions

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a UPI Transaction History Page with filters and search**
   - Date range filter, transaction type (sent/received), search by name/UPI ID
   - Infinite scroll, pull-to-refresh simulation, amount formatting

### 💡 Interview-Ready Answer

```javascript
class TransactionHistory {
  constructor(rootEl) {
    this.root = rootEl;
    this.allTransactions = [];
    this.filtered = [];
    this.page = 0;
    this.pageSize = 20;
    this.isLoading = false;
    this.hasMore = true;
    
    this.filters = {
      type: 'all', // 'all' | 'sent' | 'received'
      search: '',
      dateFrom: null,
      dateTo: null,
    };
    
    this.init();
  }
  
  async init() {
    await this.fetchTransactions();
    this.applyFilters();
    this.render();
    this.setupInfiniteScroll();
  }
  
  async fetchTransactions() {
    // Mock API
    this.allTransactions = Array.from({ length: 200 }, (_, i) => ({
      id: `txn_${i}`,
      type: Math.random() > 0.5 ? 'sent' : 'received',
      amount: Math.floor(Math.random() * 10000) + 10,
      name: ['Rahul', 'Priya', 'Swiggy', 'Amazon', 'Flipkart', 'Rent'][i % 6],
      upiId: `user${i}@ybl`,
      date: new Date(Date.now() - i * 86400000 * Math.random()),
      status: Math.random() > 0.1 ? 'success' : 'failed',
    }));
  }
  
  applyFilters() {
    this.filtered = this.allTransactions.filter(txn => {
      if (this.filters.type !== 'all' && txn.type !== this.filters.type) return false;
      
      if (this.filters.search) {
        const q = this.filters.search.toLowerCase();
        if (!txn.name.toLowerCase().includes(q) && !txn.upiId.toLowerCase().includes(q)) return false;
      }
      
      if (this.filters.dateFrom && txn.date < this.filters.dateFrom) return false;
      if (this.filters.dateTo && txn.date > this.filters.dateTo) return false;
      
      return true;
    });
    
    this.page = 0;
    this.hasMore = true;
  }
  
  getPageData() {
    return this.filtered.slice(0, (this.page + 1) * this.pageSize);
  }
  
  formatAmount(amount, type) {
    const prefix = type === 'sent' ? '- ' : '+ ';
    return `${prefix}₹${amount.toLocaleString('en-IN')}`;
  }
  
  formatDate(date) {
    const today = new Date();
    const diff = Math.floor((today - date) / 86400000);
    
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  // Group transactions by date
  groupByDate(transactions) {
    return transactions.reduce((groups, txn) => {
      const dateKey = txn.date.toDateString();
      (groups[dateKey] = groups[dateKey] || []).push(txn);
      return groups;
    }, {});
  }
  
  render() {
    const pageData = this.getPageData();
    const grouped = this.groupByDate(pageData);
    
    this.root.innerHTML = `
      <div class="txn-history">
        <header class="txn-header">
          <h2>Transaction History</h2>
          <div class="balance">Balance: ₹12,450</div>
        </header>
        
        <div class="filters">
          <div class="search-bar">
            <input type="search" id="search" placeholder="Search by name or UPI ID" 
                   value="${this.filters.search}" />
          </div>
          
          <div class="filter-chips" role="radiogroup" aria-label="Transaction type">
            ${['all', 'sent', 'received'].map(type => `
              <button class="chip ${this.filters.type === type ? 'active' : ''}" 
                      data-type="${type}" role="radio" 
                      aria-checked="${this.filters.type === type}">
                ${type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            `).join('')}
          </div>
          
          <div class="date-range">
            <input type="date" id="dateFrom" />
            <span>to</span>
            <input type="date" id="dateTo" />
          </div>
        </div>
        
        <div class="txn-list" id="txn-list">
          ${Object.entries(grouped).map(([date, txns]) => `
            <div class="date-group">
              <div class="date-header">${this.formatDate(new Date(date))}</div>
              ${txns.map(txn => `
                <div class="txn-item ${txn.type}" data-id="${txn.id}">
                  <div class="txn-icon ${txn.type}">
                    ${txn.type === 'sent' ? '↑' : '↓'}
                  </div>
                  <div class="txn-details">
                    <div class="txn-name">${txn.name}</div>
                    <div class="txn-upi">${txn.upiId}</div>
                  </div>
                  <div class="txn-amount ${txn.type}">
                    ${this.formatAmount(txn.amount, txn.type)}
                  </div>
                  ${txn.status === 'failed' ? '<span class="status-failed">Failed</span>' : ''}
                </div>
              `).join('')}
            </div>
          `).join('')}
          
          ${this.isLoading ? '<div class="loader">Loading...</div>' : ''}
          ${!this.hasMore ? '<div class="end-msg">No more transactions</div>' : ''}
          <div id="sentinel"></div>
        </div>
      </div>
    `;
    
    this.attachEvents();
  }
  
  setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.hasMore && !this.isLoading) {
        this.loadMore();
      }
    }, { rootMargin: '100px' });
    
    const sentinel = this.root.querySelector('#sentinel');
    if (sentinel) observer.observe(sentinel);
  }
  
  loadMore() {
    this.page++;
    const data = this.getPageData();
    
    if (data.length >= this.filtered.length) {
      this.hasMore = false;
    }
    
    this.render();
    this.setupInfiniteScroll();
  }
  
  attachEvents() {
    // Search with debounce
    let debounceTimer;
    this.root.querySelector('#search')?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filters.search = e.target.value;
        this.applyFilters();
        this.render();
        this.setupInfiniteScroll();
      }, 300);
    });
    
    // Type filter chips
    this.root.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.filters.type = chip.dataset.type;
        this.applyFilters();
        this.render();
        this.setupInfiniteScroll();
      });
    });
    
    // Date range
    this.root.querySelector('#dateFrom')?.addEventListener('change', (e) => {
      this.filters.dateFrom = e.target.value ? new Date(e.target.value) : null;
      this.applyFilters();
      this.render();
      this.setupInfiniteScroll();
    });
    
    this.root.querySelector('#dateTo')?.addEventListener('change', (e) => {
      this.filters.dateTo = e.target.value ? new Date(e.target.value) : null;
      this.applyFilters();
      this.render();
      this.setupInfiniteScroll();
    });
  }
}
```

---

## Round 2: JavaScript Core
**Duration:** 45 minutes

### Questions Asked
1. **Implement Function.prototype.bind polyfill**
2. **Implement a retry function with exponential backoff**

### 💡 bind Polyfill

```javascript
Function.prototype.myBind = function(context, ...boundArgs) {
  if (typeof this !== 'function') throw new TypeError('Bind must be called on a function');
  
  const fn = this;
  
  const bound = function(...callArgs) {
    // Handle `new` keyword — when bound function is used as constructor
    const isNew = this instanceof bound;
    const thisArg = isNew ? this : context;
    
    return fn.apply(thisArg, [...boundArgs, ...callArgs]);
  };
  
  // Maintain prototype chain for `new`
  if (fn.prototype) {
    bound.prototype = Object.create(fn.prototype);
  }
  
  return bound;
};

// Test:
function greet(greeting, punct) { return `${greeting}, ${this.name}${punct}`; }
const boundGreet = greet.myBind({ name: 'Alice' }, 'Hello');
boundGreet('!'); // "Hello, Alice!"

// With new:
function Person(name) { this.name = name; }
const BoundPerson = Person.myBind({ name: 'ignored' });
const p = new BoundPerson('Bob');
p.name; // "Bob" (new overrides bind's context)
p instanceof Person; // true
```

### 💡 Retry with Exponential Backoff

```javascript
async function retry(fn, { maxRetries = 3, baseDelay = 1000, maxDelay = 30000, factor = 2 } = {}) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) break;
      
      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(factor, attempt) + Math.random() * 1000, // jitter
        maxDelay
      );
      
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage:
const data = await retry(
  () => fetch('/api/transactions').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }),
  { maxRetries: 3, baseDelay: 500 }
);
```

---

## Round 3: Frontend System Design
**Duration:** 45 minutes

### Questions Asked
1. **Design PhonePe's Payment Flow UI**
   - UPI payment: enter amount → select bank → enter PIN → success/failure
   - Handle network failures, timeouts, pending states
   - Real-time transaction status polling

### 💡 Interview-Ready Answer

```
Payment Flow State Machine:
┌──────────────────────────────────────────────────────────────┐
│  States: IDLE → AMOUNT_ENTRY → SELECT_BANK → PROCESSING     │
│          → WAITING_FOR_PIN → CHECKING_STATUS → SUCCESS/FAIL  │
│                                                                │
│  IDLE ──[tap pay]──▶ AMOUNT_ENTRY                            │
│  AMOUNT_ENTRY ──[submit]──▶ SELECT_BANK                      │
│  SELECT_BANK ──[choose]──▶ PROCESSING                        │
│  PROCESSING ──[API call initiated]──▶ WAITING_FOR_PIN        │
│  WAITING_FOR_PIN ──[30s timeout/response]──▶ CHECKING_STATUS │
│  CHECKING_STATUS ──[poll every 3s, max 5 attempts]──▶        │
│    SUCCESS ──[show receipt]──▶ IDLE                           │
│    FAILURE ──[show error + retry option]──▶ IDLE             │
│    PENDING ──[show pending + check later option]──▶ IDLE     │
│                                                                │
│  Error Handling:                                              │
│  - Network failure during PROCESSING → show "Checking..."    │
│    + poll status endpoint (DON'T show failure immediately)   │
│  - UPI PIN timeout (30s) → poll status, might still succeed  │
│  - Bank timeout → "Transaction pending. Money safe."         │
│  - NEVER show "Failed" without confirming with server        │
│    (user might be debited, bank might be slow)               │
└──────────────────────────────────────────────────────────────┘

Status Polling:
- After payment initiation → poll GET /api/txn/{id}/status
- 3-second intervals, max 10 attempts (30 seconds)
- Responses: INITIATED → PROCESSING → SUCCESS/FAILED/PENDING
- if final status = PENDING after max attempts → show "Check later"
- Use AbortController to cancel polling on page exit

Security (Critical for Fintech):
- UPI PIN input: custom keyboard (prevent screenshot/keylogger)
- No amount/account numbers in console.log
- CSP headers: prevent XSS
- Certificate pinning on native app (not applicable to web)
- Session timeout: auto-logout after 5 min inactivity
```

---

## 🎯 Key Takeaways
- PhonePe machine coding = **Vanilla JS** (no React) — practice functional UI without frameworks
- **Transaction history with filters** = common fintech question — nail the grouping + infinite scroll
- **bind polyfill** — handle `new` case (constructor invocation overrides bind's context)
- **Retry with exponential backoff** + jitter — production pattern for API calls
- **Payment UPI flow** = state machine — NEVER show failure without server confirmation
- **"Money safe" messaging** when uncertain — fintech-specific UX pattern
- Fintech interviews prioritize **error handling, security, and edge cases** over features

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Vanilla JS, Filters, Infinite Scroll |
| JS Core | Medium | bind Polyfill, Retry, Backoff |
| System Design | Hard | Payment Flow, State Machine, Error Handling |
| HM | Medium | Behavioral |
