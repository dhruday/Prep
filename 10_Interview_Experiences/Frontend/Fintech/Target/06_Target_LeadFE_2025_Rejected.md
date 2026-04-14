# Target — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Senior Frontend Engineer |
| **Level** | Lead |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + FE Coding + System Design + HM)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 2: FE Coding — Build a Store Locator with Map and List View

### Problem
Build a retail store locator component:
- Search by city/zip, or use current location
- Split view: map (canvas) + list of stores
- Distance-sorted results with store hours, inventory status
- Map pins with click-to-select interaction
- Filter by services (pickup, drive-up, pharmacy)
- Store detail panel on selection

### 💡 Interview-Ready Answer

```javascript
class StoreLocator {
  constructor(container, stores) {
    this.container = container;
    this.allStores = stores; // [{ id, name, lat, lng, address, phone, hours, services, inventoryStatus }]
    this.filteredStores = [...stores];
    this.selectedStore = null;
    this.userLocation = null;
    this.activeFilters = new Set();
    this.searchQuery = '';

    this.serviceOptions = ['Pickup', 'Drive-up', 'Pharmacy', 'Optical', 'Starbucks'];

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'store-locator';
    this.container.style.cssText = 'display:flex;flex-direction:column;height:600px;font-family:system-ui;border:1px solid #eee;border-radius:12px;overflow:hidden;';

    this.renderSearchBar();

    const body = document.createElement('div');
    body.style.cssText = 'display:flex;flex:1;overflow:hidden;';

    this.renderList(body);
    this.renderMap(body);

    this.container.appendChild(body);
  }

  renderSearchBar() {
    const bar = document.createElement('div');
    bar.style.cssText = 'padding:12px;background:#cc0000;';

    // Search row
    const searchRow = document.createElement('div');
    searchRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'City, state, or ZIP';
    input.value = this.searchQuery;
    input.setAttribute('aria-label', 'Search stores');
    input.style.cssText = 'flex:1;padding:10px;border:none;border-radius:6px;font-size:14px;';
    input.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.applyFilters();
    });
    searchRow.appendChild(input);

    // Use location button
    const locBtn = document.createElement('button');
    locBtn.textContent = '📍 Near Me';
    locBtn.style.cssText = 'padding:10px 16px;border:none;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;font-weight:500;';
    locBtn.addEventListener('click', () => this.useCurrentLocation());
    searchRow.appendChild(locBtn);

    bar.appendChild(searchRow);

    // Service filters
    const filters = document.createElement('div');
    filters.style.cssText = 'display:flex;gap:6px;overflow-x:auto;';

    this.serviceOptions.forEach(svc => {
      const chip = document.createElement('button');
      const active = this.activeFilters.has(svc);
      chip.textContent = svc;
      chip.style.cssText = `
        padding:4px 12px;border-radius:16px;font-size:12px;cursor:pointer;
        border:1px solid ${active ? '#fff' : 'rgba(255,255,255,0.4)'};
        background:${active ? '#fff' : 'transparent'};
        color:${active ? '#cc0000' : '#fff'};white-space:nowrap;
      `;
      chip.addEventListener('click', () => {
        if (this.activeFilters.has(svc)) this.activeFilters.delete(svc);
        else this.activeFilters.add(svc);
        this.applyFilters();
      });
      filters.appendChild(chip);
    });

    bar.appendChild(filters);
    this.container.appendChild(bar);
  }

  renderList(parent) {
    const list = document.createElement('div');
    list.className = 'store-list';
    list.style.cssText = 'width:360px;overflow-y:auto;border-right:1px solid #eee;';

    // Result count
    const count = document.createElement('div');
    count.style.cssText = 'padding:10px 12px;font-size:13px;color:#666;border-bottom:1px solid #f0f0f0;';
    count.textContent = `${this.filteredStores.length} stores found`;
    list.appendChild(count);

    this.filteredStores.forEach(store => {
      const card = document.createElement('div');
      const isSelected = this.selectedStore?.id === store.id;
      card.style.cssText = `
        padding:12px;border-bottom:1px solid #f0f0f0;cursor:pointer;
        background:${isSelected ? '#fef2f2' : '#fff'};
        border-left:3px solid ${isSelected ? '#cc0000' : 'transparent'};
      `;
      card.addEventListener('mouseenter', () => card.style.background = isSelected ? '#fef2f2' : '#fafafa');
      card.addEventListener('mouseleave', () => card.style.background = isSelected ? '#fef2f2' : '#fff');

      const distance = this.userLocation
        ? this.haversineKm(this.userLocation.lat, this.userLocation.lng, store.lat, store.lng)
        : null;

      const isOpen = this.isStoreOpen(store.hours);

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-weight:600;font-size:14px;">${this.escapeHtml(store.name)}</div>
            <div style="font-size:13px;color:#666;margin-top:2px;">${this.escapeHtml(store.address)}</div>
          </div>
          ${distance !== null ? `<span style="font-size:12px;color:#999;white-space:nowrap;">${distance.toFixed(1)} km</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">
          <span style="font-size:11px;padding:2px 6px;border-radius:4px;background:${isOpen ? '#dcfce7' : '#fef2f2'};color:${isOpen ? '#15803d' : '#dc2626'};">
            ${isOpen ? 'Open' : 'Closed'}
          </span>
          ${store.services.slice(0, 3).map(s =>
            `<span style="font-size:11px;padding:2px 6px;border-radius:4px;background:#f0f0f0;">${this.escapeHtml(s)}</span>`
          ).join('')}
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedStore = store;
        this.render();
      });

      list.appendChild(card);
    });

    // Store detail panel (if selected)
    if (this.selectedStore) {
      list.appendChild(this.renderStoreDetail(this.selectedStore));
    }

    parent.appendChild(list);
  }

  renderStoreDetail(store) {
    const detail = document.createElement('div');
    detail.style.cssText = 'padding:16px;background:#fef2f2;border-top:2px solid #cc0000;';

    detail.innerHTML = `
      <h3 style="margin:0 0 8px;">${this.escapeHtml(store.name)}</h3>
      <p style="font-size:13px;color:#666;margin:0 0 4px;">${this.escapeHtml(store.address)}</p>
      <p style="font-size:13px;margin:0 0 12px;">📞 ${store.phone}</p>
      <div style="font-size:13px;margin-bottom:8px;"><strong>Store Hours:</strong> ${this.escapeHtml(store.hours)}</div>
      <div style="font-size:13px;"><strong>Services:</strong> ${store.services.map(s => this.escapeHtml(s)).join(' • ')}</div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button style="flex:1;padding:8px;background:#cc0000;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">Get Directions</button>
        <button style="flex:1;padding:8px;background:#fff;border:1px solid #ddd;border-radius:6px;cursor:pointer;font-size:13px;">Call Store</button>
      </div>
    `;

    return detail;
  }

  renderMap(parent) {
    const mapContainer = document.createElement('div');
    mapContainer.style.cssText = 'flex:1;position:relative;background:#e8f5e9;';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;';
    mapContainer.appendChild(canvas);

    // Set canvas size after mount
    requestAnimationFrame(() => {
      const rect = mapContainer.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      this.drawMap(ctx, rect.width, rect.height);
    });

    // Pin click detection
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleMapClick(x, y, rect.width, rect.height);
    });

    parent.appendChild(mapContainer);
  }

  drawMap(ctx, w, h) {
    // Background
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#c8e6c9';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    if (this.filteredStores.length === 0) return;

    // Find bounds
    const lats = this.filteredStores.map(s => s.lat);
    const lngs = this.filteredStores.map(s => s.lng);
    const bounds = {
      minLat: Math.min(...lats) - 0.02,
      maxLat: Math.max(...lats) + 0.02,
      minLng: Math.min(...lngs) - 0.02,
      maxLng: Math.max(...lngs) + 0.02
    };

    // Draw pins
    this.pinPositions = [];
    this.filteredStores.forEach(store => {
      const px = ((store.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (w - 40) + 20;
      const py = ((bounds.maxLat - store.lat) / (bounds.maxLat - bounds.minLat)) * (h - 40) + 20;

      const isSelected = this.selectedStore?.id === store.id;
      this.pinPositions.push({ store, x: px, y: py });

      // Pin
      ctx.fillStyle = isSelected ? '#cc0000' : '#333';
      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 10 : 7, 0, Math.PI * 2);
      ctx.fill();

      // White dot center
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label for selected
      if (isSelected) {
        ctx.fillStyle = '#cc0000';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(store.name, px, py - 16);
      }
    });
  }

  handleMapClick(x, y, w, h) {
    if (!this.pinPositions) return;
    for (const pin of this.pinPositions) {
      const dx = x - pin.x, dy = y - pin.y;
      if (dx * dx + dy * dy < 225) { // 15px radius
        this.selectedStore = pin.store;
        this.render();
        return;
      }
    }
  }

  applyFilters() {
    this.filteredStores = this.allStores.filter(store => {
      // Text search
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        if (!store.name.toLowerCase().includes(q) &&
            !store.address.toLowerCase().includes(q)) {
          return false;
        }
      }
      // Service filters
      if (this.activeFilters.size > 0) {
        for (const svc of this.activeFilters) {
          if (!store.services.includes(svc)) return false;
        }
      }
      return true;
    });

    // Sort by distance if user location known
    if (this.userLocation) {
      this.filteredStores.sort((a, b) =>
        this.haversineKm(this.userLocation.lat, this.userLocation.lng, a.lat, a.lng) -
        this.haversineKm(this.userLocation.lat, this.userLocation.lng, b.lat, b.lng)
      );
    }

    this.render();
  }

  useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.applyFilters();
      },
      () => { /* silently fail */ },
      { timeout: 5000 }
    );
  }

  isStoreOpen(hoursStr) {
    // Simplified: parse "8AM-10PM"
    const hour = new Date().getHours();
    return hour >= 8 && hour < 22;
  }

  haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Usage:
// const stores = [
//   { id: 1, name: 'Target Koramangala', lat: 12.93, lng: 77.62, address: '80 Feet Rd, Koramangala',
//     phone: '080-1234-5678', hours: '8AM-10PM', services: ['Pickup', 'Drive-up', 'Starbucks'],
//     inventoryStatus: 'In Stock' },
//   // ...
// ];
// new StoreLocator(document.getElementById('app'), stores);
```

## 🎯 Key Takeaways
- Target FE interviews involve **retail/e-commerce UX** — store locator, product pages, checkout
- Split view (list + map) with synchronized selection is a classic pattern
- Canvas map with auto-fit bounds based on store coordinates
- Service filter chips with visual feedback (AND logic — must have all selected)
- Distance sorting with haversine when user location available
- Open/closed status with color-coded badges
- Pin hit detection via Euclidean distance from click point

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, Strings |
| FE Coding | Medium-Hard | Canvas, Geolocation, State |
| System Design | Hard | Store Inventory System |
| HM | Medium | Behavioral, Retail Domain |
