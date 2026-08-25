# Uber — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | SDE-2 Frontend |
| **Level** | 5a |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Timeline:** 2 weeks

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Fare Estimator Widget** (like Uber's ride picker)
   - Select ride type (UberGo, Premier, UberXL, Auto)
   - Show fare range for each (₹120-₹150)
   - Surge multiplier indicator (1.5x, 2x)
   - ETA for nearest driver
   - Responsive: works on mobile

### 💡 Interview-Ready Answer

```jsx
function FareEstimator({ pickup, destination }) {
  const [rideOptions, setRideOptions] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!pickup || !destination) return;
    
    const fetchEstimates = async () => {
      setLoading(true);
      const res = await fetch('/api/fare-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, destination }),
      });
      const data = await res.json();
      setRideOptions(data.options);
      setSelectedRide(data.options[0]?.id); // Auto-select cheapest
      setLoading(false);
    };
    
    fetchEstimates();
    
    // Refresh every 30s (surge/ETA can change)
    const interval = setInterval(fetchEstimates, 30000);
    return () => clearInterval(interval);
  }, [pickup, destination]);
  
  const SkeletonLoader = () => (
    <div className="ride-skeleton" aria-hidden="true">
      {[1,2,3,4].map(i => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-icon" />
          <div className="skeleton-lines">
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-line" style={{ width: '40%' }} />
          </div>
          <div className="skeleton-price" />
        </div>
      ))}
    </div>
  );
  
  if (loading) return <SkeletonLoader />;
  
  return (
    <div className="fare-estimator" role="radiogroup" aria-label="Choose a ride">
      <h2 className="section-title">Choose a ride</h2>
      
      <div className="ride-list">
        {rideOptions.map(ride => (
          <button
            key={ride.id}
            className={`ride-option ${selectedRide === ride.id ? 'selected' : ''} ${!ride.available ? 'unavailable' : ''}`}
            onClick={() => ride.available && setSelectedRide(ride.id)}
            role="radio"
            aria-checked={selectedRide === ride.id}
            aria-label={`${ride.name}: ${ride.fareRange.min} to ${ride.fareRange.max} rupees, ${ride.eta} minutes away${ride.surgeMultiplier > 1 ? `, surge pricing ${ride.surgeMultiplier}x` : ''}`}
            disabled={!ride.available}
          >
            <div className="ride-icon">
              <img src={ride.iconUrl} alt="" width="60" height="36" />
            </div>
            
            <div className="ride-info">
              <div className="ride-header">
                <span className="ride-name">{ride.name}</span>
                {ride.surgeMultiplier > 1 && (
                  <span className="surge-badge" title={`${ride.surgeMultiplier}x surge pricing`}>
                    ⚡ {ride.surgeMultiplier}x
                  </span>
                )}
                {ride.promo && <span className="promo-badge">🎉 {ride.promo}</span>}
              </div>
              
              <div className="ride-meta">
                <span className="ride-eta">
                  {ride.available ? `${ride.eta} min away` : 'Unavailable'}
                </span>
                <span className="ride-capacity">{ride.capacity} seats</span>
              </div>
              
              <span className="ride-description">{ride.description}</span>
            </div>
            
            <div className="ride-fare">
              {ride.surgeMultiplier > 1 ? (
                <>
                  <span className="fare-current">
                    ₹{ride.fareRange.min.toLocaleString('en-IN')}-{ride.fareRange.max.toLocaleString('en-IN')}
                  </span>
                  <span className="fare-original">
                    ₹{Math.round(ride.fareRange.min / ride.surgeMultiplier)}-{Math.round(ride.fareRange.max / ride.surgeMultiplier)}
                  </span>
                </>
              ) : (
                <span className="fare-range">
                  ₹{ride.fareRange.min.toLocaleString('en-IN')}-{ride.fareRange.max.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Surge explanation */}
      {selectedRide && rideOptions.find(r => r.id === selectedRide)?.surgeMultiplier > 1 && (
        <div className="surge-notice" role="alert">
          <p>⚡ Fares are higher due to increased demand in your area.</p>
          <p className="surge-tip">Tip: Wait a few minutes for prices to drop, or try UberGo instead.</p>
        </div>
      )}
      
      {/* Confirm Button */}
      <button
        className="confirm-btn"
        disabled={!selectedRide}
        onClick={() => {/* Navigate to booking */}}
      >
        {selectedRide ? `Choose ${rideOptions.find(r => r.id === selectedRide)?.name}` : 'Select a ride'}
      </button>
    </div>
  );
}
```

---

## Round 2: JavaScript Theory
**Duration:** 45 minutes

### Questions Asked
1. **Implement debounce with cancel and flush**
2. **Implement a PubSub system with wildcard subscriptions** (`user.*` matches `user.login`, `user.logout`)

### 💡 PubSub with Wildcards

```javascript
class PubSub {
  #subscribers = new Map(); // topic → Set<{callback, once}>
  
  subscribe(topic, callback, { once = false } = {}) {
    if (!this.#subscribers.has(topic)) {
      this.#subscribers.set(topic, new Set());
    }
    
    const entry = { callback, once };
    this.#subscribers.get(topic).add(entry);
    
    // Return unsubscribe function
    return () => {
      this.#subscribers.get(topic)?.delete(entry);
    };
  }
  
  publish(topic, data) {
    const toNotify = [];
    
    for (const [pattern, subs] of this.#subscribers) {
      if (this.#matchTopic(pattern, topic)) {
        for (const entry of subs) {
          toNotify.push(entry);
          if (entry.once) subs.delete(entry);
        }
      }
    }
    
    // Notify all matching subscribers
    toNotify.forEach(entry => entry.callback(topic, data));
  }
  
  // Wildcard matching: * matches one segment, # matches all remaining
  #matchTopic(pattern, topic) {
    const patternParts = pattern.split('.');
    const topicParts = topic.split('.');
    
    let pi = 0, ti = 0;
    
    while (pi < patternParts.length && ti < topicParts.length) {
      if (patternParts[pi] === '#') return true; // # matches everything remaining
      if (patternParts[pi] === '*' || patternParts[pi] === topicParts[ti]) {
        pi++;
        ti++;
      } else {
        return false;
      }
    }
    
    return pi === patternParts.length && ti === topicParts.length;
  }
}

// Usage:
const bus = new PubSub();

bus.subscribe('user.*', (topic, data) => {
  console.log(`User event: ${topic}`, data);
});

bus.subscribe('user.login', (topic, data) => {
  console.log('Login specific handler', data);
});

bus.subscribe('order.#', (topic, data) => {
  console.log(`Order event: ${topic}`, data);
});

bus.publish('user.login', { userId: 123 });
// Both handlers fire: wildcard user.* AND specific user.login

bus.publish('order.payment.success', { orderId: 456 });
// order.# fires (# matches any depth)
```

---

## 🎯 Key Takeaways
- Uber FE = **ride-hailing UI + map integration + real-time updates**
- **Fare estimator**: radio group pattern, auto-refresh every 30s for surge/ETA changes
- **Surge indicator**: badge + strikethrough original price + explanation notice
- **PubSub wildcards**: `*` matches one level, `#` matches all remaining (MQTT convention)
- **Once subscriptions**: `{ once: true }` → auto-unsubscribe after first delivery
- Know Uber's **frontend stack**: React, Web Components, Base Web (Uber's design system)
- **Auto-refresh patterns**: interval + cleanup on unmount — critical for real-time data

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Fare Widget, Radio Group, Real-Time |
| JavaScript | Medium-Hard | PubSub, Wildcards, Debounce |
| System Design | Hard | Ride Matching, Surge, Maps |
| HM | Medium | Behavioral |
