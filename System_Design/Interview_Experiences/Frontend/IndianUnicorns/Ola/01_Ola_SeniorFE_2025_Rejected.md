# Ola — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 4 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System design round — didn't handle offline mode for ride booking

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build an Interactive Map Component** (Ride booking UI)
   - Display map with draggable pickup pin, search autocomplete for destination, ETA display

### 💡 Interview-Ready Answer

```javascript
class RideBookingUI {
  constructor(container) {
    this.container = container;
    this.pickup = { lat: 12.9716, lng: 77.5946, address: '' }; // Bangalore default
    this.destination = null;
    this.eta = null;
    this.debounceTimer = null;
    
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="ride-booking">
        <div class="map-container" id="map" 
             style="height: 60vh; background: #e5e3df; position: relative;">
          <!-- Map placeholder (would use Mapbox/Leaflet in production) -->
          <div class="map-content">
            <div class="pickup-pin" id="pickup-pin" draggable="true" 
                 style="position: absolute; top: 50%; left: 50%; 
                        transform: translate(-50%, -100%);"
                 role="button" aria-label="Drag to set pickup location">
              📍
            </div>
            <div class="center-dot" style="position: absolute; top: 50%; left: 50%; 
                 width: 8px; height: 8px; background: blue; border-radius: 50%;
                 transform: translate(-50%, -50%);"></div>
          </div>
        </div>
        
        <div class="booking-panel">
          <div class="location-inputs">
            <div class="input-group">
              <label for="pickup-input">Pickup</label>
              <input type="text" id="pickup-input" placeholder="Your location"
                     value="${this.pickup.address}" autocomplete="off" />
              <button class="gps-btn" id="use-gps" aria-label="Use current location">📍</button>
            </div>
            
            <div class="input-group">
              <label for="dest-input">Destination</label>
              <input type="text" id="dest-input" placeholder="Where to?" 
                     autocomplete="off" role="combobox" 
                     aria-expanded="false" aria-controls="suggestions-list" />
              <ul id="suggestions-list" class="suggestions" role="listbox" hidden></ul>
            </div>
          </div>
          
          ${this.eta ? `
            <div class="eta-display" role="status" aria-live="polite">
              <div class="eta-time">${this.eta.minutes} min</div>
              <div class="eta-distance">${this.eta.distance} km</div>
            </div>
            
            <div class="ride-options">
              ${this.renderRideOptions()}
            </div>
            
            <button class="book-btn" id="book-ride">
              Book ${this.selectedRide?.name || 'Ride'} — ₹${this.selectedRide?.price || ''}
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    this.attachEvents();
  }
  
  renderRideOptions() {
    const options = [
      { id: 'mini', name: 'Mini', price: Math.round(this.eta.distance * 12), eta: this.eta.minutes },
      { id: 'sedan', name: 'Sedan', price: Math.round(this.eta.distance * 18), eta: this.eta.minutes + 2 },
      { id: 'suv', name: 'SUV', price: Math.round(this.eta.distance * 25), eta: this.eta.minutes + 5 },
    ];
    
    return options.map(opt => `
      <div class="ride-option ${this.selectedRide?.id === opt.id ? 'selected' : ''}" 
           data-ride="${opt.id}" role="radio" tabindex="0"
           aria-checked="${this.selectedRide?.id === opt.id}">
        <span class="ride-name">${opt.name}</span>
        <span class="ride-eta">${opt.eta} min</span>
        <span class="ride-price">₹${opt.price}</span>
      </div>
    `).join('');
  }
  
  attachEvents() {
    // Destination autocomplete
    const destInput = this.container.querySelector('#dest-input');
    destInput?.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.searchPlaces(e.target.value), 300);
    });
    
    // GPS button
    this.container.querySelector('#use-gps')?.addEventListener('click', () => {
      this.getCurrentLocation();
    });
    
    // Ride option selection
    this.container.querySelectorAll('.ride-option').forEach(el => {
      el.addEventListener('click', () => {
        const rideId = el.dataset.ride;
        this.selectedRide = { id: rideId, name: el.querySelector('.ride-name').textContent,
                             price: el.querySelector('.ride-price').textContent.replace('₹', '') };
        this.render();
      });
    });
    
    // Draggable pickup pin
    this.setupDraggablePin();
  }
  
  async searchPlaces(query) {
    if (query.length < 3) {
      this.hideSuggestions();
      return;
    }
    
    // Mock API call (would use Google Places / Mapbox Geocoding)
    const suggestions = [
      { id: 1, name: 'Koramangala, Bangalore', lat: 12.9352, lng: 77.6245 },
      { id: 2, name: 'MG Road, Bangalore', lat: 12.9758, lng: 77.6060 },
      { id: 3, name: 'Whitefield, Bangalore', lat: 12.9698, lng: 77.7499 },
    ].filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
    
    this.showSuggestions(suggestions);
  }
  
  showSuggestions(suggestions) {
    const list = this.container.querySelector('#suggestions-list');
    const input = this.container.querySelector('#dest-input');
    
    list.innerHTML = suggestions.map(s => `
      <li role="option" data-id="${s.id}" data-lat="${s.lat}" data-lng="${s.lng}" 
          class="suggestion-item">${s.name}</li>
    `).join('');
    
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    
    list.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        this.destination = {
          lat: parseFloat(item.dataset.lat),
          lng: parseFloat(item.dataset.lng),
          address: item.textContent
        };
        input.value = item.textContent;
        this.hideSuggestions();
        this.calculateRoute();
      });
    });
  }
  
  hideSuggestions() {
    const list = this.container.querySelector('#suggestions-list');
    if (list) {
      list.hidden = true;
      this.container.querySelector('#dest-input')?.setAttribute('aria-expanded', 'false');
    }
  }
  
  getCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.pickup = { lat: pos.coords.latitude, lng: pos.coords.longitude, address: 'Current Location' };
        this.container.querySelector('#pickup-input').value = 'Current Location';
        if (this.destination) this.calculateRoute();
      },
      (err) => {
        console.error('GPS error:', err.message);
        alert('Unable to get location. Please enter manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  
  calculateRoute() {
    if (!this.pickup || !this.destination) return;
    
    // Haversine distance (simplified — real app uses routing API)
    const R = 6371;
    const dLat = (this.destination.lat - this.pickup.lat) * Math.PI / 180;
    const dLng = (this.destination.lng - this.pickup.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(this.pickup.lat * Math.PI / 180) * 
              Math.cos(this.destination.lat * Math.PI / 180) * Math.sin(dLng/2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    this.eta = {
      minutes: Math.round(distance * 3), // ~20 km/h avg in city
      distance: distance.toFixed(1)
    };
    
    this.selectedRide = { id: 'mini', name: 'Mini', price: Math.round(distance * 12) };
    this.render();
  }
  
  setupDraggablePin() {
    const pin = this.container.querySelector('#pickup-pin');
    const map = this.container.querySelector('#map');
    if (!pin || !map) return;
    
    let isDragging = false;
    
    pin.addEventListener('mousedown', () => isDragging = true);
    
    map.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = map.getBoundingClientRect();
      pin.style.left = `${e.clientX - rect.left}px`;
      pin.style.top = `${e.clientY - rect.top}px`;
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        // Convert pixel position to lat/lng (simplified)
        // In real app: map.unproject(pixelCoords)
        this.container.querySelector('#pickup-input').value = 'Dropped pin location';
        if (this.destination) this.calculateRoute();
      }
    });
  }
}
```

---

## Round 2: JavaScript Deep Dive
**Duration:** 45 minutes

### Questions Asked
1. **Implement setInterval using setTimeout** (and vice versa)
2. **Explain microtask queue vs macrotask queue with examples**
3. **Implement curry function with arbitrary arity**

### 💡 setInterval using setTimeout

```javascript
function mySetInterval(fn, delay) {
  let id = { cancelled: false };
  
  function repeat() {
    if (id.cancelled) return;
    fn();
    id.timerId = setTimeout(repeat, delay);
  }
  
  id.timerId = setTimeout(repeat, delay);
  
  return {
    clear() {
      id.cancelled = true;
      clearTimeout(id.timerId);
    }
  };
}

// Why use setTimeout over setInterval?
// setInterval: if fn takes longer than delay, calls stack up
// setTimeout recursion: guaranteed delay BETWEEN calls (not from start)
```

### 💡 Curry with Arbitrary Arity

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function(...moreArgs) {
      return curried.apply(this, [...args, ...moreArgs]);
    };
  };
}

// Test:
const add = curry((a, b, c) => a + b + c);
add(1)(2)(3);    // 6
add(1, 2)(3);    // 6
add(1)(2, 3);    // 6
add(1, 2, 3);    // 6

// Infinite curry (no fixed arity — uses valueOf for evaluation):
function infiniteCurry(fn) {
  return function curried(...args) {
    const next = (...moreArgs) => curried(...args, ...moreArgs);
    next.valueOf = () => args.reduce(fn, 0);
    next[Symbol.toPrimitive] = () => args.reduce(fn, 0);
    return next;
  };
}

const sum = infiniteCurry((a, b) => a + b);
+sum(1)(2)(3)(4); // 10 (uses valueOf)
```

---

## 🎯 Key Takeaways
- Ola FE = **map interaction + geospatial UI** — know drag-and-drop, geocoding, Haversine
- **Ride booking UI** with autocomplete + draggable pin = Ola's signature question
- I got **rejected because I didn't discuss offline mode** — what happens when network drops mid-booking?
- **setInterval vs setTimeout** — setTimeout recursion is safer (no call stacking)
- **Curry** with fixed arity (fn.length) vs infinite curry (valueOf trick) — know both
- **Geolocation API** best practices: enableHighAccuracy, timeout, error handling
- For map interviews: mention **Mapbox GL / Leaflet**, not just Google Maps

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Map UI, Drag-Drop, Geolocation |
| JavaScript | Medium-Hard | setTimeout/setInterval, Curry, Microtasks |
| System Design | Hard | Ride Booking, Offline Mode |
| HM | Medium | Behavioral |
