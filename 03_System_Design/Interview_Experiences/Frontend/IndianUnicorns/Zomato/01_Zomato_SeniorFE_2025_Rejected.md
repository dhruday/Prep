# Zomato — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Gurugram, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 3 (Machine Coding + JS/React + Frontend System Design)
- **Timeline:** 1 week
- **Format:** Virtual
- **Rejection Reason:** Machine coding round — couldn't complete real-time features (live order tracking) in time

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Food Ordering Interface with Live Order Tracking**
   - Restaurant menu, cart, order placement, order status updates (WebSocket simulation)

### 💡 Interview-Ready Answer — Order Tracking Component

```jsx
const ORDER_STATES = [
  { key: 'PLACED', label: 'Order Placed', icon: '📋', description: 'Your order has been confirmed' },
  { key: 'PREPARING', label: 'Preparing', icon: '👨‍🍳', description: 'Restaurant is preparing your food' },
  { key: 'PICKED_UP', label: 'Picked Up', icon: '🛵', description: 'Delivery partner picked up your order' },
  { key: 'ON_THE_WAY', label: 'On the Way', icon: '📍', description: 'Your delivery partner is on the way' },
  { key: 'DELIVERED', label: 'Delivered', icon: '✅', description: 'Enjoy your meal!' },
];

function OrderTracker({ orderId }) {
  const [orderState, setOrderState] = useState({ status: 'PLACED', eta: 35 });
  
  useEffect(() => {
    // Simulate WebSocket
    const eventSource = new EventSource(`/api/orders/${orderId}/track`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setOrderState(data);
    };
    
    eventSource.onerror = () => {
      // Fallback: polling every 10 seconds
      const interval = setInterval(async () => {
        const res = await fetch(`/api/orders/${orderId}/status`);
        const data = await res.json();
        setOrderState(data);
      }, 10000);
      
      eventSource.close();
      return () => clearInterval(interval);
    };
    
    return () => eventSource.close();
  }, [orderId]);
  
  const currentStepIdx = ORDER_STATES.findIndex(s => s.key === orderState.status);
  
  return (
    <div className="order-tracker" role="progressbar" 
         aria-valuenow={currentStepIdx + 1} 
         aria-valuemin={1} 
         aria-valuemax={ORDER_STATES.length}>
      
      <div className="eta-banner" aria-live="polite">
        {orderState.status !== 'DELIVERED' 
          ? `Arriving in ${orderState.eta} minutes`
          : 'Order Delivered!'
        }
      </div>
      
      <div className="progress-steps">
        {ORDER_STATES.map((step, idx) => {
          const isCompleted = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          
          return (
            <div key={step.key} className={`step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="step-icon">
                {isCompleted ? '✓' : step.icon}
              </div>
              <div className="step-connector" />
              <div className="step-label">
                <strong>{step.label}</strong>
                {isCurrent && <p>{step.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

```css
.progress-steps { display: flex; justify-content: space-between; padding: 20px; }
.step { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; }
.step-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #eee; font-size: 20px; z-index: 1; }
.step.completed .step-icon { background: #4caf50; color: white; }
.step.current .step-icon { background: #ff6b00; color: white; animation: pulse 1.5s infinite; }
.step-connector { position: absolute; top: 20px; left: 50%; width: 100%; height: 3px; background: #eee; z-index: 0; }
.step.completed .step-connector { background: #4caf50; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
```

---

## Round 2: JavaScript + React
**Duration:** 60 minutes

### Questions Asked
1. **Implement a custom useLocalStorage hook**
2. **Explain React reconciliation algorithm**
3. **Build a countdown timer that's accurate (not setTimeout drift)**

### 💡 Interview-Ready Answer — useLocalStorage

```javascript
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function (like useState)
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Sync across tabs
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);
  
  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === key && e.newValue !== null) {
        setStoredValue(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);
  
  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    window.localStorage.removeItem(key);
  }, [key, initialValue]);
  
  return [storedValue, setValue, removeValue];
}
```

### 💡 Accurate Countdown Timer (Self-Correcting)

```javascript
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));
  
  useEffect(() => {
    // Self-correcting timer: use Date.now() instead of relying on setInterval accuracy
    const intervalId = setInterval(() => {
      const remaining = calculateTimeLeft(targetDate);
      
      if (remaining.total <= 0) {
        clearInterval(intervalId);
        setTimeLeft({ total: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setTimeLeft(remaining);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [targetDate]);
  
  return timeLeft;
}

function calculateTimeLeft(targetDate) {
  const total = targetDate.getTime() - Date.now(); // Always uses real time
  
  return {
    total,
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60)
  };
}

// Why this is better than naive approach:
// Naive: let count = 300; setInterval(() => count--, 1000);
//   Problem: setInterval drifts 15-30ms per call. After 5 min = 75-150ms late
//   Also: tab backgrounding pauses timers → shows wrong time on tab resume
//
// Self-correcting: always reads Date.now(), so even if interval fires late,
//   the displayed time is correct. Tab resume shows correct value instantly.
```

---

## Round 3: Frontend System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Zomato's Search & Discovery Page**
   - Trending, recent searches, cuisine cards, nearby restaurants, voice search

### 💡 Interview-Ready Answer

```
Zomato Discovery Page Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Page Sections (Priority Order):                              │
│  1. Search bar (sticky, always visible)                      │
│  2. Quick Filters: Delivery/Dine-In/Pro                      │
│  3. Cuisine Cards (horizontal scroll)                        │
│  4. Trending Now (based on location)                         │
│  5. Recent Orders (personalized)                             │
│  6. Restaurant Grid (infinite scroll)                        │
└──────────────────────────────────────────────────────────────┘

Search Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Search UX Flow:                                              │
│  1. Tap search bar → show recent searches + trending         │
│     (from localStorage + API)                                │
│  2. Start typing → debounce 200ms → fetch suggestions        │
│     GET /api/search/suggest?q=pizza&lat=&lon=                │
│     Response: {                                               │
│       restaurants: [{ name, cuisine, rating, distance }],    │
│       dishes: [{ name, restaurant, price }],                 │
│       cuisines: ["Pizza", "Italian"]                         │
│     }                                                         │
│  3. Show results in categorized dropdown:                    │
│     - Restaurants (top 3)                                    │
│     - Dishes (top 3)                                         │
│     - Cuisines (top 2)                                       │
│  4. On select → navigate to results page with full list      │
│                                                                │
│  Voice Search (Web Speech API):                               │
│  const recognition = new webkitSpeechRecognition();          │
│  recognition.lang = 'en-IN'; // Indian English               │
│  recognition.continuous = false;                              │
│  recognition.onresult = (e) => {                             │
│    const query = e.results[0][0].transcript;                 │
│    searchInput.value = query;                                │
│    performSearch(query);                                      │
│  };                                                           │
└──────────────────────────────────────────────────────────────┘

Recent Searches (Client-Side):
┌──────────────────────────────────────────────────────────────┐
│  Storage: localStorage (last 20 searches)                    │
│  Format: [{ query, timestamp, type: 'restaurant'|'dish' }]  │
│                                                                │
│  Privacy: Clear all option, individual delete                │
│  Dedup: Don't add same query twice (update timestamp)        │
│  Display: Most recent first, max 5 shown initially          │
└──────────────────────────────────────────────────────────────┘

Cuisine Cards (Horizontal Scroll):
- CSS scroll-snap for snapping behavior
- Intersection Observer to track which cuisines user sees
- Low-res blurred thumbnails → sharp on load
- Touch-friendly: 44px minimum tap target (WCAG)
- Swipe gestures on mobile (CSS overscroll-behavior)
```

---

## 🎯 Key Takeaways
- Zomato FE interviews test **product sense + engineering** balance
- **Order Tracking** with SSE/WebSocket + progress stepper is the key machine coding question
- **useLocalStorage** with cross-tab sync is a commonly asked custom hook
- **Self-correcting countdown timer** — never use a decrement counter, always use Date.now()
- **Voice Search** with Web Speech API is a unique Zomato feature — mention it in design
- **Discovery pages** need: recent searches, trending, cuisine cards, personalization
- **Rejection lesson:** In machine coding, complete core features first, then add real-time. Don't start with WebSocket implementation if cart isn't done.

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Order Tracking, SSE, Cart, CSS Animations |
| JS/React | Medium-Hard | Custom Hooks, Reconciliation, Timers |
| System Design | Hard | Search, Discovery, Voice, Personalization |
