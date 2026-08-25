# Ola — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design — didn't cover offline-capable map tile caching

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Real-Time Ride Tracking Map UI**
   - Show driver location moving on map
   - ETA countdown with dynamic updates
   - Route polyline that updates as driver progresses
   - Status bar: searching → matched → en route → arrived → trip started

### 💡 Interview-Ready Answer

```jsx
function RideTracker({ rideId }) {
  const [ride, setRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const animationRef = useRef(null);
  
  // WebSocket for real-time driver location
  useEffect(() => {
    const ws = new WebSocket(`wss://tracking.ola.com/rides/${rideId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'LOCATION_UPDATE':
          // Smooth animation from current to new position
          animateMarker(driverLocation, data.location);
          setDriverLocation(data.location);
          setEta(data.eta);
          break;
        case 'STATUS_CHANGE':
          setRide(prev => ({ ...prev, status: data.status }));
          break;
        case 'ROUTE_UPDATE':
          updateRoutePolyline(data.route);
          break;
      }
    };
    
    ws.onerror = () => {
      // Fallback to polling if WebSocket fails
      const interval = setInterval(async () => {
        const res = await fetch(`/api/rides/${rideId}/location`);
        const data = await res.json();
        setDriverLocation(data.location);
        setEta(data.eta);
      }, 3000);
      
      return () => clearInterval(interval);
    };
    
    return () => ws.close();
  }, [rideId]);
  
  // Smooth marker animation using requestAnimationFrame
  const animateMarker = (from, to) => {
    if (!from || !to || !markerRef.current) return;
    
    const duration = 1000; // 1 second transition
    const startTime = performance.now();
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const lat = from.lat + (to.lat - from.lat) * eased;
      const lng = from.lng + (to.lng - from.lng) * eased;
      
      markerRef.current.setPosition({ lat, lng });
      
      // Rotate marker to face direction of travel
      const bearing = calculateBearing(from, to);
      markerRef.current.setRotation(bearing);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };
  
  const calculateBearing = (from, to) => {
    const dLon = (to.lng - from.lng) * Math.PI / 180;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };
  
  // Format ETA
  const formatEta = (seconds) => {
    if (seconds < 60) return 'Arriving now';
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min${minutes > 1 ? 's' : ''} away`;
  };
  
  const statusSteps = ['SEARCHING', 'MATCHED', 'EN_ROUTE', 'ARRIVED', 'TRIP_STARTED', 'COMPLETED'];
  const currentStepIndex = statusSteps.indexOf(ride?.status);
  
  return (
    <div className="ride-tracker">
      {/* Status Bar */}
      <div className="status-bar" role="progressbar"
           aria-valuenow={currentStepIndex + 1}
           aria-valuemin={1}
           aria-valuemax={statusSteps.length}
           aria-label={`Ride status: ${ride?.status}`}>
        <div className="status-steps">
          {statusSteps.slice(0, 4).map((step, i) => (
            <div key={step}
                 className={`step ${i <= currentStepIndex ? 'active' : ''} ${i === currentStepIndex ? 'current' : ''}`}>
              <div className="step-dot" />
              <span className="step-label">{step.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Map Container */}
      <div className="map-container" ref={mapRef} aria-label="Ride tracking map">
        {/* Map renders here via Mapbox GL / Google Maps */}
      </div>
      
      {/* Bottom Sheet: Driver Info + ETA */}
      <div className="bottom-sheet" role="region" aria-label="Driver information">
        {ride?.status === 'SEARCHING' ? (
          <div className="searching">
            <div className="pulse-animation" />
            <p>Looking for nearby drivers...</p>
          </div>
        ) : (
          <>
            <div className="driver-info">
              <img src={ride?.driver?.photo} alt={ride?.driver?.name} className="driver-photo" />
              <div>
                <h3>{ride?.driver?.name}</h3>
                <p>{ride?.driver?.vehicle} · {ride?.driver?.plateNumber}</p>
                <div className="rating" aria-label={`Rating: ${ride?.driver?.rating}`}>
                  ⭐ {ride?.driver?.rating}
                </div>
              </div>
            </div>
            
            {eta && (
              <div className="eta" aria-live="polite">
                <span className="eta-time">{formatEta(eta)}</span>
              </div>
            )}
            
            <div className="actions">
              <button className="action-btn" aria-label="Call driver">📞 Call</button>
              <button className="action-btn" aria-label="Message driver">💬 Chat</button>
              <button className="action-btn danger" aria-label="Cancel ride">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## Round 2: JavaScript Theory
**Duration:** 45 minutes

### Questions Asked
1. **Implement `setInterval` using `setTimeout`** (with drift correction)
2. **Explain and implement debounce with leading/trailing options**

### 💡 setInterval via setTimeout (drift-corrected)

```javascript
function preciseSetInterval(callback, interval) {
  let expectedTime = Date.now() + interval;
  let timeoutId = null;
  let stopped = false;
  
  function step() {
    if (stopped) return;
    
    const drift = Date.now() - expectedTime;
    callback();
    
    expectedTime += interval;
    
    // Adjust next timeout to account for drift
    const nextDelay = Math.max(0, interval - drift);
    timeoutId = setTimeout(step, nextDelay);
  }
  
  timeoutId = setTimeout(step, interval);
  
  return {
    clear() {
      stopped = true;
      clearTimeout(timeoutId);
    }
  };
}

// Debounce with leading/trailing
function debounce(fn, delay, options = {}) {
  const { leading = false, trailing = true } = options;
  let timeoutId = null;
  let lastCallTime = 0;
  
  function debounced(...args) {
    const now = Date.now();
    const isFirstCall = !timeoutId;
    
    clearTimeout(timeoutId);
    
    // Leading edge: fire immediately on first call
    if (leading && isFirstCall) {
      fn.apply(this, args);
    }
    
    if (trailing) {
      timeoutId = setTimeout(() => {
        if (!leading || !isFirstCall) {
          fn.apply(this, args);
        }
        timeoutId = null;
      }, delay);
    } else {
      timeoutId = setTimeout(() => {
        timeoutId = null;
      }, delay);
    }
  }
  
  debounced.cancel = () => {
    clearTimeout(timeoutId);
    timeoutId = null;
  };
  
  debounced.flush = (...args) => {
    debounced.cancel();
    fn.apply(this, args);
  };
  
  return debounced;
}
```

---

## 🎯 Key Takeaways
- Ola FE = **real-time map tracking UI** is the core challenge
- **Smooth marker animation**: requestAnimationFrame with eased interpolation
- **Bearing calculation**: atan2 formula for marker rotation (direction of travel)
- **WebSocket → polling fallback**: critical for reliability
- **Drift-corrected setInterval**: adjust delay based on actual vs expected time
- Ola rejected on **offline map tile caching** — should know Service Worker + Cache API + tile pyramid (z/x/y) for map tile caching strategy
- Status bar progress = clean UX pattern for ride lifecycle

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Map Tracking, WebSocket, Animation |
| JavaScript | Medium-Hard | setInterval, Debounce, Drift |
| System Design | Hard | Offline Maps, Tile Caching |
| HM | Medium | Behavioral |
