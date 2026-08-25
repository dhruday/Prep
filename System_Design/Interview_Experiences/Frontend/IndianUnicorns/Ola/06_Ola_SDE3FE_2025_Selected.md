# Ola — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Hiring Manager)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 2: Frontend Machine Coding — Ride Booking Interface

### Problem
Build a ride-hailing booking interface with:
1. Pickup and drop-off location inputs with suggestion dropdown (mock data)
2. Ride type selection cards (Auto, Mini, Sedan, SUV) with pricing
3. Estimated fare calculation based on distance (mock formula)
4. Driver matching animation (searching → matched)
5. Ride status tracker: Searching → Driver Assigned → En Route → Arrived → Trip Started → Completed
6. Cancel ride with confirmation modal
7. Rating screen after trip completion (star rating)

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ola Ride Booking</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 20px; }

.app { width: 400px; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }

/* Map Placeholder */
.map { height: 200px; background: linear-gradient(135deg, #4ade80, #22d3ee); display: flex; align-items: center; justify-content: center; font-size: 60px; position: relative; }
.map-label { position: absolute; bottom: 8px; left: 12px; background: rgba(0,0,0,0.5); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; }

/* Content */
.content { padding: 20px; }

/* Location Inputs */
.location-group { position: relative; margin-bottom: 16px; }
.loc-indicator { position: absolute; left: 12px; top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; z-index: 1; }
.loc-dot { width: 10px; height: 10px; border-radius: 50%; }
.loc-dot.green { background: #22c55e; }
.loc-dot.red { background: #ef4444; }
.loc-line { width: 2px; height: 16px; background: #d1d5db; }
.loc-input { width: 100%; padding: 10px 12px 10px 32px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; margin-bottom: 6px; }
.loc-input:focus { border-color: #22c55e; }
.suggestions { position: absolute; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; width: calc(100% - 32px); left: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; display: none; }
.suggestions.visible { display: block; }
.suggestion-item { padding: 8px 12px; cursor: pointer; font-size: 13px; }
.suggestion-item:hover { background: #f3f4f6; }

/* Ride Types */
.ride-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.ride-card { border: 2px solid #e5e7eb; border-radius: 10px; padding: 10px 6px; text-align: center; cursor: pointer; transition: all 0.15s; }
.ride-card:hover { border-color: #22c55e; }
.ride-card.selected { border-color: #22c55e; background: #f0fdf4; }
.ride-emoji { font-size: 28px; }
.ride-name { font-size: 12px; font-weight: 600; margin: 4px 0 2px; }
.ride-price { font-size: 13px; color: #22c55e; font-weight: 700; }
.ride-eta { font-size: 11px; color: #9ca3af; }

/* Fare Summary */
.fare-summary { background: #f9fafb; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 14px; }
.fare-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
.fare-row.total { font-weight: 700; font-size: 16px; border-top: 1px solid #e5e7eb; padding-top: 6px; margin-top: 6px; }

/* Book Button */
.book-btn { width: 100%; padding: 14px; background: #22c55e; color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; }
.book-btn:hover { background: #16a34a; }
.book-btn:disabled { background: #d1d5db; cursor: not-allowed; }

/* Searching Animation */
.searching { text-align: center; padding: 40px 20px; }
.searching-dots { font-size: 32px; animation: bounce 1s infinite; }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.searching-text { font-size: 16px; color: #374151; margin-top: 12px; }
.searching-sub { font-size: 13px; color: #9ca3af; margin-top: 4px; }

/* Driver Card */
.driver-card { background: #f0fdf4; border-radius: 10px; padding: 14px; margin-bottom: 16px; display: flex; gap: 12px; align-items: center; }
.driver-avatar { width: 48px; height: 48px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; }
.driver-info { flex: 1; }
.driver-name { font-weight: 600; font-size: 15px; }
.driver-vehicle { font-size: 13px; color: #6b7280; }
.driver-rating { font-size: 13px; color: #f59e0b; }

/* Status Timeline */
.ride-status { margin-bottom: 16px; }
.status-step { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 14px; color: #9ca3af; }
.status-step.done { color: #22c55e; }
.status-step.active { color: #1f2937; font-weight: 600; }
.status-icon { width: 20px; text-align: center; }

/* Cancel */
.cancel-btn { width: 100%; padding: 12px; background: #fff; color: #ef4444; border: 1px solid #ef4444; border-radius: 10px; font-size: 14px; cursor: pointer; }
.cancel-btn:hover { background: #fef2f2; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 340px; text-align: center; }
.modal h3 { font-size: 18px; margin-bottom: 8px; }
.modal p { font-size: 14px; color: #6b7280; margin-bottom: 16px; }
.modal-actions { display: flex; gap: 8px; }
.modal-actions button { flex: 1; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.modal-cancel { background: #ef4444; color: #fff; border: none; }
.modal-keep { background: #f3f4f6; color: #374151; border: none; }

/* Rating */
.rating-screen { text-align: center; padding: 30px 20px; }
.rating-screen h3 { font-size: 18px; margin-bottom: 16px; }
.stars { display: flex; justify-content: center; gap: 8px; margin-bottom: 16px; }
.star { font-size: 36px; cursor: pointer; transition: transform 0.15s; }
.star:hover { transform: scale(1.2); }
.done-btn { padding: 12px 40px; background: #22c55e; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }

.hidden { display: none; }
</style>
</head>
<body>
<div class="app">
  <div class="map">🗺️<span class="map-label">Map View</span></div>
  <div class="content" id="content"></div>
</div>

<script>
// ============================================================
// DATA
// ============================================================
const LOCATIONS = [
  'Koramangala 5th Block', 'Indiranagar 100ft Road', 'HSR Layout Sector 7',
  'Whitefield Main Road', 'MG Road Metro', 'Electronic City Phase 1',
  'Marathahalli Bridge', 'JP Nagar 6th Phase', 'Hebbal Flyover',
  'Bellandur Gate', 'Sarjapur Road', 'BTM Layout 2nd Stage'
];

const RIDE_TYPES = [
  { type: 'auto', name: 'Auto', emoji: '🛺', baseFare: 30, perKm: 12, eta: '2 min' },
  { type: 'mini', name: 'Mini', emoji: '🚗', baseFare: 50, perKm: 15, eta: '4 min' },
  { type: 'sedan', name: 'Sedan', emoji: '🚙', baseFare: 80, perKm: 18, eta: '5 min' },
  { type: 'suv', name: 'SUV', emoji: '🚐', baseFare: 120, perKm: 22, eta: '7 min' }
];

const STATUSES = [
  { key: 'searching', label: 'Finding your driver...', icon: '🔍' },
  { key: 'assigned', label: 'Driver assigned', icon: '✅' },
  { key: 'enroute', label: 'Driver en route', icon: '🚗' },
  { key: 'arrived', label: 'Driver arrived', icon: '📍' },
  { key: 'trip', label: 'Trip in progress', icon: '🛣️' },
  { key: 'completed', label: 'Trip completed', icon: '🏁' }
];

// ============================================================
// STATE
// ============================================================
let pickup = '';
let dropoff = '';
let selectedRide = null;
let rideState = 'booking'; // booking | searching | active | completed
let statusIndex = -1;
let distance = 0;
let progressTimer = null;

// ============================================================
// SCREENS
// ============================================================
function renderBookingScreen() {
  const content = document.getElementById('content');
  distance = pickup && dropoff ? (5 + Math.random() * 15).toFixed(1) : 0;

  content.innerHTML = `
    <div class="location-group">
      <div class="loc-indicator">
        <div class="loc-dot green"></div>
        <div class="loc-line"></div>
        <div class="loc-dot red"></div>
      </div>
      <input class="loc-input" id="pickupInput" placeholder="Pickup location" value="${pickup}" autocomplete="off">
      <div class="suggestions" id="pickupSuggestions"></div>
      <input class="loc-input" id="dropoffInput" placeholder="Drop-off location" value="${dropoff}" autocomplete="off">
      <div class="suggestions" id="dropoffSuggestions"></div>
    </div>

    ${pickup && dropoff ? `
      <div class="ride-types">
        ${RIDE_TYPES.map(r => `
          <div class="ride-card ${selectedRide && selectedRide.type === r.type ? 'selected' : ''}" data-type="${r.type}">
            <div class="ride-emoji">${r.emoji}</div>
            <div class="ride-name">${r.name}</div>
            <div class="ride-price">₹${Math.round(r.baseFare + r.perKm * distance)}</div>
            <div class="ride-eta">${r.eta}</div>
          </div>
        `).join('')}
      </div>

      ${selectedRide ? `
        <div class="fare-summary">
          <div class="fare-row"><span>Base fare</span><span>₹${selectedRide.baseFare}</span></div>
          <div class="fare-row"><span>Distance (${distance} km)</span><span>₹${Math.round(selectedRide.perKm * distance)}</span></div>
          <div class="fare-row"><span>Platform fee</span><span>₹5</span></div>
          <div class="fare-row total"><span>Estimated Fare</span><span>₹${Math.round(selectedRide.baseFare + selectedRide.perKm * distance + 5)}</span></div>
        </div>
        <button class="book-btn" id="bookBtn">Book ${selectedRide.name}</button>
      ` : '<button class="book-btn" disabled>Select a ride type</button>'}
    ` : '<button class="book-btn" disabled>Enter pickup & drop-off</button>'}
  `;

  // Suggestion listeners
  setupSuggestions('pickupInput', 'pickupSuggestions', val => { pickup = val; renderBookingScreen(); });
  setupSuggestions('dropoffInput', 'dropoffSuggestions', val => { dropoff = val; renderBookingScreen(); });

  // Ride type selection
  content.querySelectorAll('.ride-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedRide = RIDE_TYPES.find(r => r.type === card.dataset.type);
      renderBookingScreen();
    });
  });

  // Book
  const bookBtn = document.getElementById('bookBtn');
  if (bookBtn && selectedRide) {
    bookBtn.addEventListener('click', startSearching);
  }
}

function setupSuggestions(inputId, suggestionsId, onSelect) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(suggestionsId);
  if (!input || !box) return;

  input.addEventListener('input', () => {
    const val = input.value.toLowerCase();
    if (val.length < 2) { box.classList.remove('visible'); return; }
    const matches = LOCATIONS.filter(l => l.toLowerCase().includes(val)).slice(0, 5);
    if (matches.length === 0) { box.classList.remove('visible'); return; }
    box.innerHTML = matches.map(l => `<div class="suggestion-item">${l}</div>`).join('');
    box.classList.add('visible');
    box.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item.textContent;
        box.classList.remove('visible');
        onSelect(item.textContent);
      });
    });
  });
  input.addEventListener('blur', () => setTimeout(() => box.classList.remove('visible'), 150));
}

function startSearching() {
  rideState = 'searching';
  statusIndex = 0;
  renderSearchingScreen();

  // Simulate driver match after 3 seconds
  setTimeout(() => {
    rideState = 'active';
    statusIndex = 1;
    renderActiveScreen();
    startProgressTimer();
  }, 3000);
}

function renderSearchingScreen() {
  document.getElementById('content').innerHTML = `
    <div class="searching">
      <div class="searching-dots">🛺</div>
      <div class="searching-text">Finding your best ${selectedRide.name}...</div>
      <div class="searching-sub">Usually takes less than a minute</div>
    </div>
    <button class="cancel-btn" id="cancelSearch">Cancel</button>
  `;
  document.getElementById('cancelSearch').addEventListener('click', () => showCancelModal());
}

function renderActiveScreen() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="driver-card">
      <div class="driver-avatar">👤</div>
      <div class="driver-info">
        <div class="driver-name">Rajesh Kumar</div>
        <div class="driver-vehicle">KA-01-AB-1234 • White ${selectedRide.name}</div>
        <div class="driver-rating">★ 4.8 (2.1K trips)</div>
      </div>
    </div>
    <div class="ride-status">
      ${STATUSES.map((s, i) => {
        let state = i < statusIndex ? 'done' : i === statusIndex ? 'active' : '';
        return `<div class="status-step ${state}">
          <span class="status-icon">${i <= statusIndex ? '✓' : '○'}</span>
          <span>${s.label}</span>
        </div>`;
      }).join('')}
    </div>
    <button class="cancel-btn" id="cancelRide">Cancel Ride</button>
  `;
  document.getElementById('cancelRide').addEventListener('click', () => showCancelModal());
}

function startProgressTimer() {
  progressTimer = setInterval(() => {
    if (statusIndex < STATUSES.length - 1) {
      statusIndex++;
      if (statusIndex === STATUSES.length - 1) {
        clearInterval(progressTimer);
        rideState = 'completed';
        setTimeout(renderRatingScreen, 500);
        return;
      }
      renderActiveScreen();
    }
  }, 4000);
}

function renderRatingScreen() {
  let selectedStars = 0;
  const content = document.getElementById('content');

  function render() {
    content.innerHTML = `
      <div class="rating-screen">
        <h3>Rate your trip</h3>
        <div class="stars">
          ${[1,2,3,4,5].map(n => `<span class="star" data-val="${n}">${n <= selectedStars ? '⭐' : '☆'}</span>`).join('')}
        </div>
        <p style="font-size:13px;color:#6b7280;">${selectedStars > 0 ? ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][selectedStars] : 'Tap a star to rate'}</p>
        <button class="done-btn" ${selectedStars === 0 ? 'disabled' : ''} id="doneBtn">Submit Rating</button>
      </div>
    `;

    content.querySelectorAll('.star').forEach(star => {
      star.addEventListener('click', () => {
        selectedStars = parseInt(star.dataset.val);
        render();
      });
    });

    const doneBtn = document.getElementById('doneBtn');
    if (doneBtn && selectedStars > 0) {
      doneBtn.addEventListener('click', () => {
        rideState = 'booking';
        selectedRide = null;
        pickup = '';
        dropoff = '';
        renderBookingScreen();
      });
    }
  }

  render();
}

function showCancelModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Cancel Ride?</h3>
      <p>Are you sure you want to cancel? ${statusIndex > 1 ? 'A cancellation fee of ₹50 may apply.' : ''}</p>
      <div class="modal-actions">
        <button class="modal-cancel" id="confirmCancel">Yes, Cancel</button>
        <button class="modal-keep" id="keepRide">Keep Ride</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('confirmCancel').addEventListener('click', () => {
    clearInterval(progressTimer);
    rideState = 'booking';
    statusIndex = -1;
    overlay.remove();
    renderBookingScreen();
  });
  document.getElementById('keepRide').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// Initial render
renderBookingScreen();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- Ola FE interviews focus on **ride-hailing UX flow**: booking → searching → active → completed → rating
- **State machine approach**: `rideState` drives which screen renders — clean separation of concerns
- Location suggestions: filter on input, `mousedown` (not click) to prevent blur race condition
- Fare calculation: `baseFare + perKm × distance + platformFee` — domain-specific formula
- Driver matching animation: 3-second timeout simulates real search behavior
- Status progression: `setInterval(4000)` advances through statuses — simulates trip progress
- Cancel modal with overlay: click outside closes, conditional cancellation fee based on trip status
- Star rating: re-render stars on click with label text — stateful within closure

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| Technical 1 | Medium | DOM, Event Handling |
| Technical 2 | Hard | State Machine, Multi-Screen Flow |
| Hiring Manager | Medium | Product Thinking, Mobility |
