# Razorpay — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS Deep Dive + Machine Coding + FE System Design + HM)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Transaction History with Virtual List & Filters

### Problem
Build a transaction history page:
- Render large lists efficiently (10,000+ transactions) with virtual scrolling
- Date range filter, transaction type filter (credit/debit), search by description
- Group by date with sticky headers
- Export filtered data to CSV
- Status badges with color coding

### 💡 Interview-Ready Answer

```javascript
class TransactionHistory {
  constructor(container, transactions) {
    this.container = container;
    this.allTransactions = transactions;
    this.filtered = [...transactions];
    this.itemHeight = 64;
    this.headerHeight = 36;
    this.visibleBuffer = 5;
    this.scrollTop = 0;

    this.filters = {
      search: '',
      type: 'all', // all | credit | debit
      dateFrom: null,
      dateTo: null,
      status: 'all' // all | success | pending | failed
    };

    this.groupedData = [];
    this.flatItems = []; // Flattened list of headers + items with positions

    this.init();
  }

  init() {
    this.container.innerHTML = '';
    this.container.className = 'txn-history';

    this.renderFilters();
    this.renderListContainer();
    this.applyFilters();
  }

  renderFilters() {
    const bar = document.createElement('div');
    bar.className = 'filter-bar';

    // Search
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search transactions...';
    search.className = 'filter-search';
    search.setAttribute('aria-label', 'Search transactions');
    search.addEventListener('input', this.debounce((e) => {
      this.filters.search = e.target.value.toLowerCase();
      this.applyFilters();
    }, 300));
    bar.appendChild(search);

    // Type filter
    const typeSelect = document.createElement('select');
    typeSelect.setAttribute('aria-label', 'Transaction type');
    [['all', 'All Types'], ['credit', 'Credit'], ['debit', 'Debit']].forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener('change', (e) => {
      this.filters.type = e.target.value;
      this.applyFilters();
    });
    bar.appendChild(typeSelect);

    // Status filter
    const statusSelect = document.createElement('select');
    statusSelect.setAttribute('aria-label', 'Transaction status');
    [['all', 'All Status'], ['success', 'Success'], ['pending', 'Pending'], ['failed', 'Failed']].forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.applyFilters();
    });
    bar.appendChild(statusSelect);

    // Date range
    const dateFrom = document.createElement('input');
    dateFrom.type = 'date';
    dateFrom.setAttribute('aria-label', 'From date');
    dateFrom.addEventListener('change', (e) => {
      this.filters.dateFrom = e.target.value ? new Date(e.target.value) : null;
      this.applyFilters();
    });

    const dateTo = document.createElement('input');
    dateTo.type = 'date';
    dateTo.setAttribute('aria-label', 'To date');
    dateTo.addEventListener('change', (e) => {
      this.filters.dateTo = e.target.value ? new Date(e.target.value) : null;
      this.applyFilters();
    });

    bar.appendChild(dateFrom);
    bar.appendChild(dateTo);

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📥 Export CSV';
    exportBtn.className = 'btn-export';
    exportBtn.addEventListener('click', () => this.exportCSV());
    bar.appendChild(exportBtn);

    // Result count
    this.countEl = document.createElement('span');
    this.countEl.className = 'result-count';
    bar.appendChild(this.countEl);

    this.container.appendChild(bar);
  }

  renderListContainer() {
    this.viewport = document.createElement('div');
    this.viewport.className = 'txn-viewport';
    this.viewport.style.height = '500px';
    this.viewport.style.overflow = 'auto';
    this.viewport.setAttribute('role', 'list');

    this.scrollContent = document.createElement('div');
    this.scrollContent.className = 'txn-scroll-content';
    this.scrollContent.style.position = 'relative';
    this.viewport.appendChild(this.scrollContent);

    this.viewport.addEventListener('scroll', () => {
      this.scrollTop = this.viewport.scrollTop;
      this.renderVisibleItems();
    });

    this.container.appendChild(this.viewport);
  }

  applyFilters() {
    this.filtered = this.allTransactions.filter(txn => {
      if (this.filters.search &&
          !txn.description.toLowerCase().includes(this.filters.search) &&
          !txn.id.toLowerCase().includes(this.filters.search)) {
        return false;
      }
      if (this.filters.type !== 'all' && txn.type !== this.filters.type) return false;
      if (this.filters.status !== 'all' && txn.status !== this.filters.status) return false;

      const txnDate = new Date(txn.date);
      if (this.filters.dateFrom && txnDate < this.filters.dateFrom) return false;
      if (this.filters.dateTo && txnDate > this.filters.dateTo) return false;

      return true;
    });

    this.countEl.textContent = `${this.filtered.length} transactions`;
    this.buildFlatList();
    this.renderVisibleItems();
  }

  buildFlatList() {
    // Group by date
    const groups = new Map();
    for (const txn of this.filtered) {
      const dateKey = new Date(txn.date).toLocaleDateString('en-IN', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey).push(txn);
    }

    this.flatItems = [];
    let offset = 0;

    for (const [date, txns] of groups) {
      this.flatItems.push({ type: 'header', date, offset, height: this.headerHeight });
      offset += this.headerHeight;

      for (const txn of txns) {
        this.flatItems.push({ type: 'item', txn, offset, height: this.itemHeight });
        offset += this.itemHeight;
      }
    }

    this.totalHeight = offset;
    this.scrollContent.style.height = this.totalHeight + 'px';
  }

  renderVisibleItems() {
    const viewportHeight = this.viewport.clientHeight;
    const startY = this.scrollTop;
    const endY = startY + viewportHeight;

    // Binary search for first visible item
    let startIdx = this.binarySearch(startY);
    startIdx = Math.max(0, startIdx - this.visibleBuffer);
    let endIdx = this.binarySearch(endY);
    endIdx = Math.min(this.flatItems.length - 1, endIdx + this.visibleBuffer);

    // Clear and render
    this.scrollContent.innerHTML = '';

    for (let i = startIdx; i <= endIdx; i++) {
      const item = this.flatItems[i];
      const el = item.type === 'header'
        ? this.createDateHeader(item.date)
        : this.createTransactionRow(item.txn);

      el.style.position = 'absolute';
      el.style.top = item.offset + 'px';
      el.style.left = '0';
      el.style.right = '0';
      el.style.height = item.height + 'px';

      this.scrollContent.appendChild(el);
    }
  }

  binarySearch(targetOffset) {
    let lo = 0, hi = this.flatItems.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (this.flatItems[mid].offset < targetOffset) lo = mid + 1;
      else hi = mid - 1;
    }
    return Math.max(0, lo - 1);
  }

  createDateHeader(date) {
    const el = document.createElement('div');
    el.className = 'txn-date-header';
    el.setAttribute('role', 'heading');
    el.setAttribute('aria-level', '3');
    el.textContent = date;
    return el;
  }

  createTransactionRow(txn) {
    const el = document.createElement('div');
    el.className = `txn-row txn-${txn.type}`;
    el.setAttribute('role', 'listitem');

    const statusColors = { success: '#22c55e', pending: '#f59e0b', failed: '#ef4444' };
    const sign = txn.type === 'credit' ? '+' : '-';
    const formatted = Number(txn.amount).toLocaleString('en-IN', {
      style: 'currency', currency: 'INR'
    });

    el.innerHTML = `
      <div class="txn-left">
        <span class="txn-desc">${this.escapeHtml(txn.description)}</span>
        <span class="txn-id">${txn.id}</span>
      </div>
      <div class="txn-right">
        <span class="txn-amount txn-amount-${txn.type}">${sign}${formatted}</span>
        <span class="txn-status" style="color:${statusColors[txn.status] || '#666'}">${txn.status}</span>
      </div>
    `;
    return el;
  }

  exportCSV() {
    const headers = ['ID', 'Date', 'Description', 'Type', 'Amount', 'Status'];
    const rows = this.filtered.map(txn => [
      txn.id,
      new Date(txn.date).toLocaleDateString('en-IN'),
      `"${txn.description.replace(/"/g, '""')}"`,
      txn.type,
      txn.amount,
      txn.status
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
}

// Usage: 
// const txns = Array.from({ length: 10000 }, (_, i) => ({
//   id: `TXN-${String(i).padStart(6, '0')}`,
//   date: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
//   description: ['Swiggy Order', 'Salary Credit', 'Amazon Purchase', 'Rent Payment'][i % 4],
//   type: Math.random() > 0.5 ? 'credit' : 'debit',
//   amount: (Math.random() * 10000).toFixed(2),
//   status: ['success', 'pending', 'failed'][Math.floor(Math.random() * 3)]
// }));
// new TransactionHistory(document.getElementById('app'), txns);
```

## 🎯 Key Takeaways
- Razorpay FE R2 often tests **data-heavy UI** — transaction lists, dashboards
- Virtual scrolling with **binary search** for offset lookup is O(log n) per scroll
- Date-grouped flat list: headers and items share same virtual list with different heights
- CSV export with proper escaping (double-quote wrapping, quote escaping)
- Debounced search prevents excessive re-renders
- `escapeHtml` prevents XSS in transaction descriptions

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Deep Dive | Hard | Event Loop, Prototypes, WeakMap |
| Machine Coding | Medium-Hard | Virtual Scroll, Filtering, CSV Export |
| FE System Design | Hard | Dashboard Architecture |
| HM | Medium | Behavioral |
