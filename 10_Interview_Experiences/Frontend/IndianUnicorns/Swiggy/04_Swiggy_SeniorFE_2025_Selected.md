# Swiggy — Senior Frontend Engineer Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + JS Deep Dive + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Real-Time Order Status Tracker** (like Swiggy live tracking)
   - Timeline: Order Placed → Confirmed → Preparing → Out for Delivery → Delivered
   - Animated progress between steps
   - Live map with delivery partner location (simulated)
   - ETA countdown timer
   - Status updates via polling (fallback from WebSocket)

### 💡 Interview-Ready Answer

```jsx
function OrderTracker({ orderId }) {
  const [order, setOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  
  // Poll for order status (fallback from WebSocket)
  useEffect(() => {
    let isMounted = true;
    let ws = null;
    
    const connectWebSocket = () => {
      ws = new WebSocket(`wss://api.swiggy.com/tracking/${orderId}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!isMounted) return;
        
        if (data.type === 'status_update') {
          setOrder(data.order);
          setEta(data.eta);
        } else if (data.type === 'location_update') {
          setDriverLocation(data.location);
        }
      };
      
      ws.onerror = () => fallbackToPolling();
      ws.onclose = () => { if (isMounted) setTimeout(connectWebSocket, 3000); };
    };
    
    const fallbackToPolling = () => {
      const poll = async () => {
        if (!isMounted) return;
        try {
          const res = await fetch(`/api/orders/${orderId}/status`);
          const data = await res.json();
          setOrder(data.order);
          setEta(data.eta);
          setDriverLocation(data.driverLocation);
        } catch (err) {
          console.error('Polling failed', err);
        }
      };
      
      const interval = setInterval(poll, 5000); // Every 5s
      poll(); // Immediate first fetch
      return () => clearInterval(interval);
    };
    
    connectWebSocket();
    
    return () => {
      isMounted = false;
      ws?.close();
    };
  }, [orderId]);
  
  if (!order) return <OrderTrackerSkeleton />;
  
  const STEPS = [
    { key: 'placed', label: 'Order Placed', icon: '📝' },
    { key: 'confirmed', label: 'Restaurant Confirmed', icon: '✅' },
    { key: 'preparing', label: 'Preparing Your Food', icon: '👨‍🍳' },
    { key: 'picked_up', label: 'Out for Delivery', icon: '🛵' },
    { key: 'delivered', label: 'Delivered', icon: '🎉' },
  ];
  
  const currentStepIndex = STEPS.findIndex(s => s.key === order.status);
  
  return (
    <div className="order-tracker">
      {/* ETA Display */}
      <div className="eta-section" aria-live="polite">
        {order.status !== 'delivered' ? (
          <>
            <h2 className="eta-label">Arriving in</h2>
            <CountdownTimer targetTime={eta} />
          </>
        ) : (
          <h2 className="delivered-label">Order Delivered! 🎉</h2>
        )}
      </div>
      
      {/* Progress Timeline */}
      <div className="timeline" role="progressbar"
        aria-valuenow={currentStepIndex + 1}
        aria-valuemin={1} aria-valuemax={STEPS.length}
        aria-label="Order progress">
        {STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          
          return (
            <div key={step.key}
              className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="step-connector">
                <div className="connector-line"
                  style={{
                    background: isCompleted ? '#10B981' : '#E5E7EB',
                    transition: 'background 0.5s ease'
                  }} />
              </div>
              
              <div className="step-dot">
                {isCompleted ? (
                  <span className="dot completed">{step.icon}</span>
                ) : (
                  <span className="dot pending" />
                )}
                {isCurrent && <span className="pulse-ring" />}
              </div>
              
              <div className="step-label">
                <span className={`label-text ${isCompleted ? 'text-green' : 'text-gray'}`}>
                  {step.label}
                </span>
                {step.key === order.status && order.statusTime && (
                  <span className="status-time">
                    {new Date(order.statusTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Mini Map (when out for delivery) */}
      {order.status === 'picked_up' && driverLocation && (
        <div className="mini-map" aria-label="Delivery partner location">
          <MiniMap
            driverLocation={driverLocation}
            deliveryLocation={order.deliveryAddress.coordinates}
          />
        </div>
      )}
    </div>
  );
}

// ETA Countdown Timer
function CountdownTimer({ targetTime }) {
  const [remaining, setRemaining] = useState('');
  
  useEffect(() => {
    const update = () => {
      const diff = new Date(targetTime) - new Date();
      if (diff <= 0) {
        setRemaining('Any moment now!');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);
  
  return <span className="countdown" aria-live="polite">{remaining}</span>;
}
```

---

## 🎯 Key Takeaways
- Swiggy FE = **real-time tracking + timeline UI + WebSocket with polling fallback**
- **WebSocket + polling fallback**: try WS first, on error/close fall back to 5s polling
- **Timeline with progress**: progressbar ARIA role, pulse animation on current step
- **ETA countdown**: `setInterval(1000)` with target time, show "Any moment now!" at 0
- **Mini map**: show only during "out for delivery" phase — reduce unnecessary rendering
- **isMounted flag**: prevent state updates after unmount (avoid memory leak with async ops)
- **Reconnection strategy**: on WS close, reconnect after 3s delay
- Swiggy FE stack: React + Next.js + GraphQL + Express

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array, String |
| Machine Coding | Hard | Order Tracker, WebSocket, Timeline |
| JS Deep Dive | Medium-Hard | Event Loop, Promises |
| HM | Medium | Behavioral |
