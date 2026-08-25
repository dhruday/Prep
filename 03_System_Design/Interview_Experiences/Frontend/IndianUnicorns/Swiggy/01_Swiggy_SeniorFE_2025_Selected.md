# Swiggy — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JS Deep Dive + FE System Design + HM)
- **Timeline:** 10 days
- **Format:** Virtual

---

## Round 1: Machine Coding (React)
**Duration:** 90 minutes

### Questions Asked
1. **Build a Real-Time Order Tracking Dashboard**
   - Show list of active orders, each with status (Placed → Preparing → Out for Delivery → Delivered)
   - Filter by status, live timer showing time since order placed, polling for updates

### 💡 Interview-Ready Answer

```jsx
import { useState, useEffect, useCallback, useMemo } from 'react';

const ORDER_STATUSES = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

function useOrders(pollInterval = 5000) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/active');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, pollInterval);
    return () => clearInterval(interval);
  }, [fetchOrders, pollInterval]);
  
  return { orders, loading };
}

function useTimer(startTime) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const start = new Date(startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function OrderCard({ order }) {
  const timer = useTimer(order.placedAt);
  const statusIndex = ORDER_STATUSES.indexOf(order.status);
  
  return (
    <div className="order-card" role="article" aria-label={`Order ${order.id}`}>
      <div className="order-header">
        <span className="order-id">#{order.id}</span>
        <span className="order-timer" aria-live="polite">{timer}</span>
      </div>
      
      <div className="order-details">
        <p className="restaurant">{order.restaurant}</p>
        <p className="items">{order.items.join(', ')}</p>
        <p className="total">₹{order.total}</p>
      </div>
      
      {/* Progress bar */}
      <div className="status-track" role="progressbar" 
           aria-valuenow={statusIndex + 1} aria-valuemax={4}>
        {ORDER_STATUSES.map((status, i) => (
          <div key={status} className={`status-step ${i <= statusIndex ? 'active' : ''}`}>
            <div className="step-dot" />
            <span className="step-label">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderDashboard() {
  const { orders, loading } = useOrders(5000);
  const [filter, setFilter] = useState('All');
  
  const filteredOrders = useMemo(() => {
    if (filter === 'All') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);
  
  const statusCounts = useMemo(() => {
    const counts = { All: orders.length };
    ORDER_STATUSES.forEach(s => { counts[s] = orders.filter(o => o.status === s).length; });
    return counts;
  }, [orders]);
  
  if (loading) return <div className="skeleton-grid">{/* skeleton cards */}</div>;
  
  return (
    <div className="dashboard">
      <h1>Active Orders ({orders.length})</h1>
      
      <div className="filters" role="tablist">
        {['All', ...ORDER_STATUSES].map(status => (
          <button key={status} role="tab" 
                  aria-selected={filter === status}
                  className={filter === status ? 'active' : ''}
                  onClick={() => setFilter(status)}>
            {status} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>
      
      <div className="orders-grid" role="feed">
        {filteredOrders.map(order => (
          <OrderCard key={order.id} order={order} />
        ))}
        {filteredOrders.length === 0 && <p>No orders matching filter</p>}
      </div>
    </div>
  );
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 60 minutes

### Questions Asked
1. **Implement Promise.any from scratch**
2. **Explain closures with 3 practical examples**
3. **What is the Temporal Dead Zone?**

### 💡 Interview-Ready Answer — Promise.any

```javascript
function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let rejectedCount = 0;
    const promisesArray = Array.from(promises);
    
    if (promisesArray.length === 0) {
      reject(new AggregateError([], 'All promises were rejected'));
      return;
    }
    
    promisesArray.forEach((promise, index) => {
      Promise.resolve(promise).then(
        (value) => resolve(value), // First to resolve wins
        (error) => {
          errors[index] = error;
          rejectedCount++;
          if (rejectedCount === promisesArray.length) {
            reject(new AggregateError(errors, 'All promises were rejected'));
          }
        }
      );
    });
  });
}

// Also implement Promise.allSettled for completeness
function promiseAllSettled(promises) {
  return Promise.all(
    Array.from(promises).map(p =>
      Promise.resolve(p)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason }))
    )
  );
}
```

### 💡 Closures — 3 Practical Examples

```javascript
// 1. Private state (Module Pattern)
function createCounter() {
  let count = 0; // closed over by inner functions
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
}
const counter = createCounter();
counter.increment(); counter.increment();
counter.getCount(); // 2
// 'count' is private — no external access

// 2. Function factory (Partial Application)
function createMultiplier(factor) {
  return function (number) {
    return number * factor; // 'factor' closed over
  };
}
const double = createMultiplier(2);
const triple = createMultiplier(3);
double(5);  // 10
triple(5);  // 15

// 3. Event handler with state (avoiding global variables)
function setupClickTracker(buttonId) {
  let clickCount = 0;
  
  document.getElementById(buttonId).addEventListener('click', () => {
    clickCount++; // closed over — persists across clicks
    console.log(`Button clicked ${clickCount} times`);
  });
}

// Classic closure gotcha (for loop + var):
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 3, 3, 3 (not 0, 1, 2!)
}
// Fix 1: let instead of var
// Fix 2: IIFE — (function(i) { setTimeout(() => console.log(i), 100); })(i);
```

### 💡 Temporal Dead Zone

```javascript
// TDZ: period between entering scope and declaration being initialized
// let and const have TDZ; var does not (var is hoisted + initialized to undefined)

console.log(a); // undefined (var hoisted + initialized)
console.log(b); // ReferenceError: Cannot access 'b' before initialization (TDZ!)

var a = 1;
let b = 2;

// Even typeof is not safe in TDZ:
console.log(typeof undeclared); // "undefined" (no error)
console.log(typeof tdzVar);    // ReferenceError! (TDZ)
let tdzVar = 3;

// TDZ in function parameters:
function foo(x = y, y = 1) {} // ReferenceError: y is in TDZ when x defaults execute
function bar(x = 1, y = x) {} // OK: x is already initialized when y defaults execute
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Swiggy's Restaurant Listing Page**
   - Location-based search, filters, infinite scroll, restaurant cards with ETA, real-time availability

### 💡 Interview-Ready Answer

```
Swiggy Restaurant Listing:
┌──────────────────────────────────────────────────────────────┐
│  Data Fetching Architecture:                                  │
│                                                                │
│  Initial Load:                                                │
│  GET /api/restaurants?lat=12.97&lng=77.59&page=1             │
│  Response: {                                                  │
│    restaurants: [...],                                        │
│    filters: { cuisines: [...], ratings: [...] },             │
│    nextCursor: "abc123",                                     │
│    totalCount: 250                                           │
│  }                                                            │
│                                                                │
│  Strategy: SWR (Stale-While-Revalidate)                      │
│  - Show cached data immediately                              │
│  - Revalidate in background                                  │
│  - User always sees something (not spinner)                  │
│                                                                │
│  Infinite Scroll:                                             │
│  - Intersection Observer on sentinel element                 │
│  - Prefetch next page when 2 cards from bottom              │
│  - Cursor-based pagination (not offset)                      │
└──────────────────────────────────────────────────────────────┘

Performance:
┌──────────────────────────────────────────────────────────────┐
│  Image Optimization (critical for Swiggy):                   │
│  - Restaurant images: 300x200 WebP, LQIP blur placeholder  │
│  - srcset: 150w (mobile), 300w (tablet), 450w (desktop)    │
│  - loading="lazy" for below-fold                             │
│  - CDN: Cloudfront with PoP in Indian cities                │
│                                                                │
│  Filter State Management:                                     │
│  - URL-first: filters synced to URL searchParams            │
│  - /restaurants?cuisine=biryani&rating=4&sort=delivery_time │
│  - Benefits: shareable URL, back button works, SEO          │
│  - React: useSearchParams() hook                             │
│                                                                │
│  Skeleton Loading:                                            │
│  - Show 6 skeleton cards immediately (same dimensions)       │
│  - CLS = 0 (no layout shift when data loads)                 │
│  - Animate with CSS @keyframes shimmer                       │
│                                                                │
│  ETA Calculation:                                             │
│  - Displayed per restaurant card                             │
│  - Factors: food prep time + delivery distance + traffic    │
│  - Updated every 2 minutes (background polling)             │
│  - Stale ETA (>5 min old) shown with "~" prefix            │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 4: Hiring Manager
**Duration:** 30 minutes

---

## 🎯 Key Takeaways
- Swiggy FE interviews = **React Machine Coding + JS fundamentals + FE System Design**
- **Order Tracking Dashboard** with polling + timer is Swiggy's signature question
- **Promise.any** + other promise combinators from scratch — must-know
- **Closures** with practical examples (not just definition) — show depth
- **Temporal Dead Zone** is frequently asked at Indian companies
- **Restaurant listing design** = infinite scroll + image optimization + filter-in-URL + SWR caching
- **Swiggy-specific:** low-bandwidth optimization, WebP images, skeleton loading for Tier-2 users

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | React, Polling, Timer, Filters |
| JS Deep Dive | Medium-Hard | Promises, Closures, TDZ |
| FE System Design | Hard | Restaurant Listing, Performance |
| HM | Medium | Behavioral |
