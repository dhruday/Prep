# Ola — SDE-3 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | SDE-3 Frontend |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | February 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Ola Electric |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design + HM)

---

## Round 2: Machine Coding — Build a Ride Booking Flow with Real-Time Fare Estimation
**Duration:** 75 minutes

### Challenge: Build a ride booking UI: pickup/dropoff selection with autocomplete, vehicle type selection (Auto, Mini, Prime, SUV), dynamic fare estimation with surge indicator, ride status flow (searching → confirmed → arriving → in-ride → completed), and driver assignment card.

```javascript
/**
 * Ola Ride Booking Flow:
 * 
 * State Machine: IDLE → SEARCHING → CONFIRMED → ARRIVING → IN_RIDE → COMPLETED
 * - Fare = base_fare + (distance × rate) + (time × per_min_rate) × surge
 * - Vehicle types with different base fares, rates
 * - Simulated driver assignment after search
 * - ETA countdown during ARRIVING state
 */
class RideBooking {
  constructor(container) {
    this.container = container;
    this.state = 'IDLE'; // IDLE | SEARCHING | CONFIRMED | ARRIVING | IN_RIDE | COMPLETED
    
    this.pickup = '';
    this.dropoff = '';
    this.selectedVehicle = 'mini';
    this.distance = 0; // km
    this.duration = 0; // minutes
    this.surgeMultiplier = 1.0;
    
    this.driver = null;
    this.eta = 0; // seconds
    this.etaTimer = null;
    
    // Vehicle configs
    this.vehicles = {
      auto:  { label: 'Auto',  icon: '🛺', baseFare: 30,  perKm: 9,  perMin: 1,   maxSeats: 3 },
      mini:  { label: 'Mini',  icon: '🚗', baseFare: 50,  perKm: 12, perMin: 1.5, maxSeats: 4 },
      prime: { label: 'Prime', icon: '🚙', baseFare: 80,  perKm: 16, perMin: 2,   maxSeats: 4 },
      suv:   { label: 'SUV',   icon: '🚐', baseFare: 120, perKm: 20, perMin: 2.5, maxSeats: 6 },
    };
    
    // Sample locations for autocomplete
    this.locations = [
      'Koramangala, Bangalore', 'Indiranagar, Bangalore', 'HSR Layout, Bangalore',
      'Whitefield, Bangalore', 'Electronic City, Bangalore', 'MG Road, Bangalore',
      'Marathahalli, Bangalore', 'JP Nagar, Bangalore', 'Jayanagar, Bangalore',
      'Rajajinagar, Bangalore', 'Hebbal, Bangalore', 'Yelahanka, Bangalore',
    ];
    
    this.render();
  }
  
  calculateFare(vehicleKey) {
    const v = this.vehicles[vehicleKey];
    if (!v || this.distance === 0) return 0;
    
    const baseFare = v.baseFare;
    const distanceFare = this.distance * v.perKm;
    const timeFare = this.duration * v.perMin;
    const subtotal = baseFare + distanceFare + timeFare;
    const surged = Math.round(subtotal * this.surgeMultiplier);
    
    return surged;
  }
  
  estimateTrip() {
    // Simulated distance/duration based on location "distance"
    this.distance = 3 + Math.round(Math.random() * 15 * 10) / 10;
    this.duration = Math.round(this.distance * 3 + Math.random() * 10);
    this.surgeMultiplier = Math.random() > 0.6 ? 
      Math.round((1.2 + Math.random() * 0.8) * 10) / 10 : 1.0;
  }
  
  render() {
    this.container.innerHTML = `
      <style>
        .rb-app { max-width:420px; margin:0 auto; font-family:-apple-system,sans-serif; background:#fff; border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.12); overflow:hidden; }
        .rb-header { background:#1a1a2e; color:#fff; padding:16px 20px; display:flex; align-items:center; gap:12px; }
        .rb-logo { font-size:20px; font-weight:700; }
        .rb-body { padding:20px; }
        .rb-input-group { position:relative; margin-bottom:12px; }
        .rb-input { width:100%; padding:12px 16px; border:1px solid #e5e7eb; border-radius:10px; font-size:14px; outline:none; box-sizing:border-box; }
        .rb-input:focus { border-color:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,0.1); }
        .rb-dot { position:absolute; left:-20px; top:50%; transform:translateY(-50%); width:10px; height:10px; border-radius:50%; }
        .rb-autocomplete { position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1); z-index:10; max-height:180px; overflow-y:auto; display:none; }
        .rb-ac-item { padding:10px 16px; cursor:pointer; font-size:13px; }
        .rb-ac-item:hover { background:#f3f4f6; }
        .rb-vehicle-list { display:flex; gap:8px; margin:16px 0; }
        .rb-vehicle { flex:1; padding:12px 8px; border:2px solid #e5e7eb; border-radius:12px; text-align:center; cursor:pointer; transition:all 0.15s; }
        .rb-vehicle:hover { border-color:#ccc; }
        .rb-vehicle.selected { border-color:#22c55e; background:#f0fdf4; }
        .rb-vehicle-icon { font-size:24px; }
        .rb-vehicle-name { font-size:12px; font-weight:600; margin-top:4px; }
        .rb-vehicle-fare { font-size:14px; font-weight:700; margin-top:2px; }
        .rb-vehicle-info { font-size:10px; color:#888; }
        .rb-surge { display:inline-block; background:#fef3c7; color:#d97706; font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px; margin-left:4px; }
        .rb-btn { width:100%; padding:14px; border:none; border-radius:12px; font-size:16px; font-weight:600; cursor:pointer; transition:all 0.15s; }
        .rb-btn-primary { background:#22c55e; color:#fff; }
        .rb-btn-primary:hover { background:#16a34a; }
        .rb-btn-danger { background:#ef4444; color:#fff; }
        .rb-btn-danger:hover { background:#dc2626; }
        .rb-btn:disabled { background:#d1d5db; cursor:not-allowed; }
        .rb-divider { height:1px; background:#f3f4f6; margin:16px 0; }
        .rb-fare-breakdown { font-size:13px; color:#666; }
        .rb-fare-row { display:flex; justify-content:space-between; padding:4px 0; }
        .rb-fare-total { font-weight:700; font-size:16px; color:#111; border-top:1px solid #e5e7eb; padding-top:6px; margin-top:4px; }
        .rb-driver-card { background:#f8fafc; border-radius:12px; padding:16px; margin-bottom:16px; }
        .rb-driver-info { display:flex; align-items:center; gap:12px; }
        .rb-driver-avatar { width:48px; height:48px; border-radius:50%; background:#e5e7eb; display:flex; align-items:center; justify-content:center; font-size:24px; }
        .rb-driver-name { font-weight:600; font-size:15px; }
        .rb-driver-rating { font-size:13px; color:#666; }
        .rb-driver-vehicle { font-size:12px; color:#888; margin-top:2px; }
        .rb-status { text-align:center; padding:16px; }
        .rb-status-text { font-size:18px; font-weight:600; margin:8px 0; }
        .rb-status-sub { font-size:13px; color:#666; }
        .rb-eta { font-size:32px; font-weight:700; color:#22c55e; }
        .rb-searching { text-align:center; padding:24px; }
        .rb-spinner { width:40px; height:40px; border:3px solid #e5e7eb; border-top-color:#22c55e; border-radius:50%; animation:rb-spin 0.8s linear infinite; margin:0 auto 12px; }
        @keyframes rb-spin { to { transform:rotate(360deg); } }
        .rb-trip-line { display:flex; flex-direction:column; gap:0; margin-left:20px; padding-left:20px; border-left:2px dashed #d1d5db; position:relative; }
        .rb-trip-line::before { content:''; position:absolute; left:-6px; top:0; width:10px; height:10px; background:#22c55e; border-radius:50%; }
        .rb-trip-line::after { content:''; position:absolute; left:-6px; bottom:0; width:10px; height:10px; background:#ef4444; border-radius:50%; }
      </style>
      <div class="rb-app">
        <div class="rb-header">
          <div class="rb-logo">Ola</div>
          <span style="font-size:13px;opacity:0.7">${this.getStatusLabel()}</span>
        </div>
        <div class="rb-body">
          ${this.renderStateContent()}
        </div>
      </div>
    `;
    
    this.attachListeners();
  }
  
  getStatusLabel() {
    const labels = {
      IDLE: 'Where to?', SEARCHING: 'Finding your ride...',
      CONFIRMED: 'Ride confirmed!', ARRIVING: 'Driver on the way',
      IN_RIDE: 'In ride', COMPLETED: 'Trip completed'
    };
    return labels[this.state] || '';
  }
  
  renderStateContent() {
    switch (this.state) {
      case 'IDLE': return this.renderBookingForm();
      case 'SEARCHING': return this.renderSearching();
      case 'CONFIRMED':
      case 'ARRIVING': return this.renderDriverCard();
      case 'IN_RIDE': return this.renderInRide();
      case 'COMPLETED': return this.renderCompleted();
    }
  }
  
  renderBookingForm() {
    const canBook = this.pickup && this.dropoff;
    
    return `
      <div class="rb-input-group">
        <input class="rb-input" id="pickup-input" placeholder="Pickup location" value="${this.esc(this.pickup)}">
        <div class="rb-autocomplete" id="pickup-ac"></div>
      </div>
      <div class="rb-input-group">
        <input class="rb-input" id="dropoff-input" placeholder="Where to?" value="${this.esc(this.dropoff)}">
        <div class="rb-autocomplete" id="dropoff-ac"></div>
      </div>
      
      ${canBook ? `
        <div class="rb-divider"></div>
        <div style="font-size:13px;color:#888;margin-bottom:8px">
          ${this.distance} km · ~${this.duration} min
          ${this.surgeMultiplier > 1 ? `<span class="rb-surge">⚡ ${this.surgeMultiplier}× surge</span>` : ''}
        </div>
        
        <div class="rb-vehicle-list">
          ${Object.entries(this.vehicles).map(([key, v]) => `
            <div class="rb-vehicle ${this.selectedVehicle === key ? 'selected' : ''}" data-vehicle="${key}">
              <div class="rb-vehicle-icon">${v.icon}</div>
              <div class="rb-vehicle-name">${v.label}</div>
              <div class="rb-vehicle-fare">₹${this.calculateFare(key)}</div>
              <div class="rb-vehicle-info">${v.maxSeats} seats</div>
            </div>
          `).join('')}
        </div>
        
        <div class="rb-fare-breakdown">
          <div class="rb-fare-row"><span>Base fare</span><span>₹${this.vehicles[this.selectedVehicle].baseFare}</span></div>
          <div class="rb-fare-row"><span>Distance (${this.distance} km)</span><span>₹${Math.round(this.distance * this.vehicles[this.selectedVehicle].perKm)}</span></div>
          <div class="rb-fare-row"><span>Time (${this.duration} min)</span><span>₹${Math.round(this.duration * this.vehicles[this.selectedVehicle].perMin)}</span></div>
          ${this.surgeMultiplier > 1 ? `<div class="rb-fare-row" style="color:#d97706"><span>Surge (${this.surgeMultiplier}×)</span><span>+₹${this.calculateFare(this.selectedVehicle) - Math.round((this.vehicles[this.selectedVehicle].baseFare + this.distance * this.vehicles[this.selectedVehicle].perKm + this.duration * this.vehicles[this.selectedVehicle].perMin))}</span></div>` : ''}
          <div class="rb-fare-row rb-fare-total"><span>Total</span><span>₹${this.calculateFare(this.selectedVehicle)}</span></div>
        </div>
        
        <div style="margin-top:16px">
          <button class="rb-btn rb-btn-primary" id="book-btn">Book ${this.vehicles[this.selectedVehicle].label}</button>
        </div>
      ` : ''}
    `;
  }
  
  renderSearching() {
    return `
      <div class="rb-searching">
        <div class="rb-spinner"></div>
        <div class="rb-status-text">Finding your ride...</div>
        <div class="rb-status-sub">${this.vehicles[this.selectedVehicle].label} · ₹${this.calculateFare(this.selectedVehicle)}</div>
        <div style="margin-top:16px">
          <button class="rb-btn rb-btn-danger" id="cancel-btn">Cancel</button>
        </div>
      </div>
    `;
  }
  
  renderDriverCard() {
    if (!this.driver) return '';
    return `
      <div class="rb-driver-card">
        <div class="rb-driver-info">
          <div class="rb-driver-avatar">👤</div>
          <div>
            <div class="rb-driver-name">${this.esc(this.driver.name)}</div>
            <div class="rb-driver-rating">⭐ ${this.driver.rating} · ${this.driver.trips} trips</div>
            <div class="rb-driver-vehicle">${this.esc(this.driver.vehicleModel)} · ${this.esc(this.driver.plate)}</div>
          </div>
        </div>
      </div>
      <div class="rb-status">
        ${this.state === 'ARRIVING' ? `
          <div class="rb-eta">${Math.ceil(this.eta / 60)} min</div>
          <div class="rb-status-text">Driver is on the way</div>
          <div class="rb-status-sub">Arriving at your pickup point</div>
        ` : `
          <div class="rb-status-text">Ride Confirmed!</div>
          <div class="rb-status-sub">Driver will arrive shortly</div>
        `}
      </div>
      <div class="rb-fare-row rb-fare-total"><span>Total Fare</span><span>₹${this.calculateFare(this.selectedVehicle)}</span></div>
      <div style="margin-top:12px">
        <button class="rb-btn rb-btn-danger" id="cancel-btn">Cancel Ride</button>
      </div>
    `;
  }
  
  renderInRide() {
    return `
      <div class="rb-driver-card">
        <div class="rb-driver-info">
          <div class="rb-driver-avatar">👤</div>
          <div>
            <div class="rb-driver-name">${this.esc(this.driver?.name)}</div>
            <div class="rb-driver-vehicle">${this.esc(this.driver?.vehicleModel)}</div>
          </div>
        </div>
      </div>
      <div class="rb-status">
        <div class="rb-status-text">In Ride</div>
        <div class="rb-status-sub">${this.esc(this.pickup)} → ${this.esc(this.dropoff)}</div>
      </div>
      <div style="margin-top:12px">
        <button class="rb-btn rb-btn-primary" id="complete-btn">Complete Ride (Demo)</button>
      </div>
    `;
  }
  
  renderCompleted() {
    const fare = this.calculateFare(this.selectedVehicle);
    return `
      <div class="rb-status">
        <div style="font-size:40px">✅</div>
        <div class="rb-status-text">Trip Completed</div>
        <div class="rb-status-sub">${this.esc(this.pickup)} → ${this.esc(this.dropoff)}</div>
        <div style="font-size:28px;font-weight:700;margin:12px 0">₹${fare}</div>
        <div style="font-size:13px;color:#888">${this.distance} km · ${this.duration} min</div>
      </div>
      <div style="margin-top:16px">
        <button class="rb-btn rb-btn-primary" id="new-ride-btn">Book Another Ride</button>
      </div>
    `;
  }
  
  attachListeners() {
    // Autocomplete
    ['pickup', 'dropoff'].forEach(field => {
      const input = this.container.querySelector(`#${field}-input`);
      const ac = this.container.querySelector(`#${field}-ac`);
      if (!input || !ac) return;
      
      input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        if (!query) { ac.style.display = 'none'; return; }
        
        const matches = this.locations.filter(l => l.toLowerCase().includes(query));
        if (matches.length === 0) { ac.style.display = 'none'; return; }
        
        ac.innerHTML = matches.map(l => 
          `<div class="rb-ac-item" data-loc="${this.esc(l)}">${this.esc(l)}</div>`
        ).join('');
        ac.style.display = 'block';
        
        ac.querySelectorAll('.rb-ac-item').forEach(item => {
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            input.value = item.dataset.loc;
            if (field === 'pickup') this.pickup = item.dataset.loc;
            else this.dropoff = item.dataset.loc;
            ac.style.display = 'none';
            
            if (this.pickup && this.dropoff) this.estimateTrip();
            this.render();
          });
        });
      });
      
      input.addEventListener('blur', () => { setTimeout(() => { ac.style.display = 'none'; }, 150); });
    });
    
    // Vehicle selection
    this.container.querySelectorAll('.rb-vehicle').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedVehicle = el.dataset.vehicle;
        this.render();
      });
    });
    
    // Book button
    this.container.querySelector('#book-btn')?.addEventListener('click', () => this.bookRide());
    
    // Cancel button
    this.container.querySelector('#cancel-btn')?.addEventListener('click', () => this.cancelRide());
    
    // Complete button (demo)
    this.container.querySelector('#complete-btn')?.addEventListener('click', () => {
      this.state = 'COMPLETED';
      this.render();
    });
    
    // New ride button
    this.container.querySelector('#new-ride-btn')?.addEventListener('click', () => {
      this.state = 'IDLE';
      this.pickup = ''; this.dropoff = '';
      this.driver = null;
      this.render();
    });
  }
  
  bookRide() {
    this.state = 'SEARCHING';
    this.render();
    
    // Simulate driver found after 2-4 seconds
    setTimeout(() => {
      this.driver = {
        name: ['Rajesh Kumar', 'Deepak Singh', 'Arun Sharma', 'Manoj Yadav'][Math.floor(Math.random() * 4)],
        rating: (4.2 + Math.random() * 0.7).toFixed(1),
        trips: 500 + Math.floor(Math.random() * 3000),
        vehicleModel: this.selectedVehicle === 'auto' ? 'Bajaj RE' : 
                       ['Swift Dzire', 'WagonR', 'Innova', 'Ertiga'][Math.floor(Math.random() * 4)],
        plate: `KA ${String(Math.floor(1 + Math.random() * 99)).padStart(2, '0')} ${String.fromCharCode(65 + Math.random() * 26)}${String.fromCharCode(65 + Math.random() * 26)} ${String(Math.floor(1000 + Math.random() * 9000))}`
      };
      
      this.state = 'ARRIVING';
      this.eta = 120 + Math.floor(Math.random() * 300); // 2-7 minutes
      this.render();
      
      // ETA countdown
      this.etaTimer = setInterval(() => {
        this.eta -= 1;
        if (this.eta <= 0) {
          clearInterval(this.etaTimer);
          this.state = 'IN_RIDE';
          this.render();
        } else {
          const etaEl = this.container.querySelector('.rb-eta');
          if (etaEl) etaEl.textContent = `${Math.ceil(this.eta / 60)} min`;
        }
      }, 1000);
      
    }, 2000 + Math.random() * 2000);
  }
  
  cancelRide() {
    clearInterval(this.etaTimer);
    this.state = 'IDLE';
    this.driver = null;
    this.render();
  }
  
  esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
```

---

## 🎯 Key Takeaways
- Ola SDE-3 FE = **Ride booking flow with state machine, fare estimation, real-time ETA**
- **State machine**: IDLE → SEARCHING → CONFIRMED → ARRIVING → IN_RIDE → COMPLETED — clean transitions
- **Fare formula**: `(baseFare + distance×perKm + time×perMin) × surgeMultiplier` — per vehicle type
- **Surge pricing**: random > 0.6 → 1.2×–2.0× multiplier — shown with amber badge
- **Autocomplete**: filter on input, mousedown (not click) to prevent blur race condition
- **ETA countdown**: `setInterval` 1-second decrement — transitions to IN_RIDE when ETA reaches 0
- **Vehicle type selection**: Auto ₹9/km → Mini ₹12 → Prime ₹16 → SUV ₹20 — realistic Ola pricing
- **Driver card**: name, rating, trips, vehicle model, license plate — standard ride-hailing UX

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding (this) | Hard | State Machine, Fare Calculation, UI Flow |
| System Design | Very Hard | Ride Matching at Scale |
| HM | Medium | Culture |
