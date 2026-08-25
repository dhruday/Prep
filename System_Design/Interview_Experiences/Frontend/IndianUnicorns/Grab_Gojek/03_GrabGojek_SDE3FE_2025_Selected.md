# Grab/Gojek — Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Grab/Gojek |
| **Role** | Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + SD + HM)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Frontend Machine Coding — Multi-Service Home Screen

### Problem
Build a Grab-like super-app home screen:
1. Top banner carousel (auto-rotate every 4s, manual swipe)
2. Service grid: Ride, Food, Express, Mart, Pay, Rewards — each with icon and label
3. Active orders ticker at top (collapsible)
4. Promotions section: horizontal scroll cards with countdown timers
5. Quick-access addresses bar (Home, Work, custom)
6. Bottom navigation (Home, Activity, Payment, Account)
7. Pull-to-refresh to reload promotions

Build with **vanilla JavaScript** only.

### 💡 Interview-Ready Answer

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Super-App Home</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #f1f5f9; max-width: 420px; margin: 0 auto; height: 100vh; overflow-y: auto; position: relative; }

/* Pull to refresh */
.pull-indicator { text-align: center; padding: 0; height: 0; overflow: hidden; transition: height 0.3s; font-size: 12px; color: #64748b; line-height: 40px; background: #e0f2fe; }
.pull-indicator.visible { height: 40px; }

/* Active Order Ticker */
.ticker { background: #16a34a; color: #fff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s; }
.ticker.collapsed .ticker-details { display: none; }
.ticker-title { font-size: 12px; font-weight: 600; }
.ticker-details { font-size: 11px; opacity: 0.9; margin-top: 4px; }
.ticker-chevron { font-size: 14px; transition: 0.3s; }
.ticker.collapsed .ticker-chevron { transform: rotate(180deg); }

/* Banner Carousel */
.carousel { position: relative; height: 160px; overflow: hidden; background: #fff; }
.carousel-track { display: flex; transition: transform 0.4s ease; height: 100%; }
.carousel-slide { min-width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; color: #fff; }
.carousel-dots { position: absolute; bottom: 8px; width: 100%; display: flex; justify-content: center; gap: 6px; }
.carousel-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.5); cursor: pointer; }
.carousel-dot.active { background: #fff; width: 18px; border-radius: 3px; }

/* Address Bar */
.address-bar { display: flex; gap: 8px; padding: 12px 16px; background: #fff; overflow-x: auto; }
.address-chip { display: flex; align-items: center; gap: 4px; padding: 6px 12px; background: #f1f5f9; border-radius: 20px; font-size: 12px; color: #334155; white-space: nowrap; cursor: pointer; flex-shrink: 0; }
.address-chip:hover { background: #e2e8f0; }

/* Service Grid */
.services { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 16px; background: #fff; margin-top: 8px; }
.service-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; cursor: pointer; border-radius: 10px; transition: 0.2s; }
.service-item:hover { background: #f8fafc; }
.service-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.service-label { font-size: 11px; color: #334155; font-weight: 500; }

/* Promotions */
.promo-section { padding: 16px; margin-top: 8px; background: #fff; }
.promo-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #0f172a; }
.promo-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.promo-scroll::-webkit-scrollbar { display: none; }
.promo-card { min-width: 240px; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.06); flex-shrink: 0; cursor: pointer; }
.promo-img { height: 100px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: 700; padding: 12px; }
.promo-body { padding: 10px 12px; }
.promo-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.promo-desc { font-size: 11px; color: #64748b; margin-top: 2px; }
.promo-countdown { font-size: 10px; color: #dc2626; font-weight: 600; margin-top: 4px; }

/* Bottom Nav */
.bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 420px; background: #fff; display: flex; border-top: 1px solid #e2e8f0; padding: 8px 0 12px; z-index: 100; }
.nav-item { flex: 1; text-align: center; cursor: pointer; }
.nav-icon { font-size: 20px; }
.nav-label { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.nav-item.active .nav-label { color: #16a34a; font-weight: 600; }

/* Spacer for bottom nav */
.nav-spacer { height: 70px; }
</style>
</head>
<body>

<div class="pull-indicator" id="pullInd">↻ Release to refresh</div>
<div class="ticker" id="ticker">
  <div>
    <div class="ticker-title">🛵 Chicken Biryani is on the way!</div>
    <div class="ticker-details">Arriving in ~8 min · Order #GJ9921</div>
  </div>
  <span class="ticker-chevron">▲</span>
</div>
<div class="carousel" id="carousel"></div>
<div class="address-bar" id="addressBar"></div>
<div class="services" id="serviceGrid"></div>
<div class="promo-section" id="promoSection"></div>
<div class="nav-spacer"></div>
<div class="bottom-nav" id="bottomNav"></div>

<script>
// ============================================================
// TICKER
// ============================================================
document.getElementById('ticker').addEventListener('click', function () {
  this.classList.toggle('collapsed');
});

// ============================================================
// CAROUSEL
// ============================================================
const banners = [
  { text: '🎉 50% off on Food!', bg: 'linear-gradient(135deg, #f97316, #ef4444)' },
  { text: '🚗 Free ride this weekend', bg: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
  { text: '🛒 GrabMart: ₹99 deals', bg: 'linear-gradient(135deg, #16a34a, #059669)' },
  { text: '💳 GrabPay Cashback 20%', bg: 'linear-gradient(135deg, #d946ef, #ec4899)' }
];

let slideIdx = 0;
let autoSlide;

function renderCarousel() {
  const el = document.getElementById('carousel');
  el.innerHTML = `
    <div class="carousel-track" id="cTrack">${banners.map(b =>
      `<div class="carousel-slide" style="background:${b.bg}">${b.text}</div>`
    ).join('')}</div>
    <div class="carousel-dots">${banners.map((_, i) =>
      `<div class="carousel-dot${i === 0 ? ' active' : ''}" data-i="${i}"></div>`
    ).join('')}</div>
  `;

  el.querySelectorAll('.carousel-dot').forEach(d => {
    d.addEventListener('click', () => goSlide(parseInt(d.dataset.i)));
  });

  // Touch swipe
  let startX = 0;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; clearInterval(autoSlide); });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -40) goSlide(slideIdx + 1);
    else if (dx > 40) goSlide(slideIdx - 1);
    startAutoSlide();
  });

  startAutoSlide();
}

function goSlide(i) {
  slideIdx = ((i % banners.length) + banners.length) % banners.length;
  document.getElementById('cTrack').style.transform = `translateX(-${slideIdx * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, j) => d.classList.toggle('active', j === slideIdx));
}

function startAutoSlide() {
  clearInterval(autoSlide);
  autoSlide = setInterval(() => goSlide(slideIdx + 1), 4000);
}

// ============================================================
// ADDRESS BAR
// ============================================================
function renderAddressBar() {
  const addresses = [
    { icon: '🏠', label: 'Home' },
    { icon: '🏢', label: 'Work' },
    { icon: '📍', label: 'MG Road Metro' },
    { icon: '➕', label: 'Add' }
  ];
  document.getElementById('addressBar').innerHTML = addresses.map(a =>
    `<div class="address-chip">${a.icon} ${a.label}</div>`
  ).join('');
}

// ============================================================
// SERVICE GRID
// ============================================================
function renderServices() {
  const services = [
    { icon: '🚗', label: 'Ride', color: '#dcfce7' },
    { icon: '🍔', label: 'Food', color: '#fee2e2' },
    { icon: '📦', label: 'Express', color: '#fef3c7' },
    { icon: '🛒', label: 'Mart', color: '#e0f2fe' },
    { icon: '💳', label: 'Pay', color: '#e0e7ff' },
    { icon: '🎁', label: 'Rewards', color: '#fce7f3' },
    { icon: '💊', label: 'Health', color: '#dcfce7' },
    { icon: '•••', label: 'More', color: '#f1f5f9' }
  ];

  document.getElementById('serviceGrid').innerHTML = services.map(s => `
    <div class="service-item">
      <div class="service-icon" style="background:${s.color}">${s.icon}</div>
      <div class="service-label">${s.label}</div>
    </div>
  `).join('');
}

// ============================================================
// PROMOTIONS WITH COUNTDOWN
// ============================================================
const promos = [
  { name: '50% Off Biryani', desc: 'Use code BIRYANI50', bg: '#f97316', endMs: Date.now() + 3600000 },
  { name: 'Free Delivery', desc: 'On orders ₹199+', bg: '#2563eb', endMs: Date.now() + 7200000 },
  { name: '₹100 Cashback', desc: 'GrabPay wallet recharge', bg: '#7c3aed', endMs: Date.now() + 1800000 },
  { name: 'Ride Pass ₹49', desc: 'Unlimited rides today', bg: '#16a34a', endMs: Date.now() + 5400000 }
];

function renderPromos() {
  const section = document.getElementById('promoSection');
  section.innerHTML = `<div class="promo-title">🔥 Deals for You</div><div class="promo-scroll" id="promoScroll"></div>`;
  updateCountdowns();
}

function updateCountdowns() {
  const scroll = document.getElementById('promoScroll');
  scroll.innerHTML = promos.map((p, i) => {
    const remaining = Math.max(0, p.endMs - Date.now());
    const hrs = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `
      <div class="promo-card">
        <div class="promo-img" style="background:${p.bg}">${p.name}</div>
        <div class="promo-body">
          <div class="promo-name">${p.name}</div>
          <div class="promo-desc">${p.desc}</div>
          <div class="promo-countdown">⏰ ${hrs}h ${mins}m ${secs}s left</div>
        </div>
      </div>
    `;
  }).join('');
}

setInterval(updateCountdowns, 1000);

// ============================================================
// BOTTOM NAV
// ============================================================
function renderNav() {
  const items = [
    { icon: '🏠', label: 'Home', active: true },
    { icon: '📋', label: 'Activity', active: false },
    { icon: '💳', label: 'Payment', active: false },
    { icon: '👤', label: 'Account', active: false }
  ];

  document.getElementById('bottomNav').innerHTML = items.map(n => `
    <div class="nav-item${n.active ? ' active' : ''}">
      <div class="nav-icon">${n.icon}</div>
      <div class="nav-label">${n.label}</div>
    </div>
  `).join('');
}

// ============================================================
// PULL TO REFRESH
// ============================================================
let pullStart = 0;
let pulling = false;

document.addEventListener('touchstart', e => {
  if (document.scrollingElement.scrollTop === 0) {
    pullStart = e.touches[0].clientY;
    pulling = true;
  }
});

document.addEventListener('touchmove', e => {
  if (!pulling) return;
  const dy = e.touches[0].clientY - pullStart;
  if (dy > 50) {
    document.getElementById('pullInd').classList.add('visible');
  }
});

document.addEventListener('touchend', () => {
  if (!pulling) return;
  pulling = false;
  const ind = document.getElementById('pullInd');
  if (ind.classList.contains('visible')) {
    ind.textContent = '↻ Refreshing...';
    setTimeout(() => {
      // Regenerate promos with fresh countdowns
      promos.forEach(p => p.endMs = Date.now() + Math.random() * 7200000 + 1800000);
      renderPromos();
      ind.classList.remove('visible');
      ind.textContent = '↻ Release to refresh';
    }, 1000);
  }
});

// ============================================================
// INIT
// ============================================================
renderCarousel();
renderAddressBar();
renderServices();
renderPromos();
renderNav();
</script>
</body>
</html>
```

## 🎯 Key Takeaways
- **Banner carousel**: CSS transform translateX on track, swipe via touchstart/touchend delta
- **Service grid**: 4-column CSS grid with icon + label, hover state
- **Promo countdown**: `setInterval(1000)` recalculating remaining ms → h/m/s display
- **Pull-to-refresh**: touchstart/touchmove/touchend checking scrollTop=0 and dy>50px
- **Active order ticker**: collapsible with CSS class toggle and chevron rotation
- **Address chips**: horizontal scroll with flex-shrink:0

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Logic, Algorithms |
| Technical 1 | Medium | Touch Events, Carousel |
| Technical 2 | Hard | Super-App UI, Countdown, Pull-to-Refresh |
| System Design | Hard | Multi-Service Architecture |
| Hiring Manager | Medium | Super-App Strategy |
