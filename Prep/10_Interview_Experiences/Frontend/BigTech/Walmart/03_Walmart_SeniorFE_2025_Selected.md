# Walmart — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Walmart |
| **Role** | Senior Frontend Engineer |
| **Level** | Senior SWE |
| **YOE** | 5 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/walmart-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Walmart Grocery |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build a Grocery Store Locator with Map** (Walmart's actual question)
- Search by city/zip/store name
- Display stores on a map (Leaflet/OpenStreetMap — no Google Maps)
- Store details: address, hours, phone, services (pharmacy, pickup, delivery)
- Filter by services
- Sort by distance from user
- Responsive: list view on mobile, split map+list on desktop

### 💡 Store Locator

```javascript
class StoreLocator {
  constructor(container, stores) {
    this.container = container;
    this.stores = stores;
    this.filteredStores = [...stores];
    this.userLocation = null;
    this.activeFilters = new Set();
    this.selectedStore = null;
    
    this.render();
    this.getUserLocation();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="locator" role="main">
        <div class="locator-sidebar">
          <div class="search-box">
            <label for="store-search" class="sr-only">Search stores</label>
            <input id="store-search" type="search" placeholder="Search by city, zip, or store name"
                   aria-label="Search stores" autocomplete="off">
            <button class="btn-locate" aria-label="Use my location" title="Use my location">📍</button>
          </div>
          
          <div class="filters" role="group" aria-label="Filter by services">
            ${['Pharmacy', 'Grocery Pickup', 'Delivery', 'Gas Station', 'Vision Center']
              .map(service => `
                <label class="filter-chip">
                  <input type="checkbox" value="${service}" aria-label="Filter: ${service}">
                  <span>${service}</span>
                </label>
              `).join('')}
          </div>
          
          <div class="sort-controls">
            <label for="sort-by">Sort by:</label>
            <select id="sort-by">
              <option value="distance">Distance</option>
              <option value="name">Name (A-Z)</option>
              <option value="rating">Rating</option>
            </select>
          </div>
          
          <div class="store-list" role="list" aria-label="Store results">
            <!-- Populated dynamically -->
          </div>
        </div>
        
        <div class="locator-map" id="map-container" role="img" aria-label="Store locations map">
          <!-- Map rendered here -->
        </div>
      </div>
    `;
    
    this.setupEventListeners();
    this.renderStoreList();
    this.initMap();
  }
  
  setupEventListeners() {
    // Search with debounce
    let searchTimer;
    this.container.querySelector('#store-search').addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => this.search(e.target.value), 300);
    });
    
    // Location button
    this.container.querySelector('.btn-locate').addEventListener('click', () => this.getUserLocation());
    
    // Filters
    this.container.querySelectorAll('.filter-chip input').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) this.activeFilters.add(e.target.value);
        else this.activeFilters.delete(e.target.value);
        this.applyFilters();
      });
    });
    
    // Sort
    this.container.querySelector('#sort-by').addEventListener('change', (e) => {
      this.sortStores(e.target.value);
    });
  }
  
  search(query) {
    const q = query.toLowerCase().trim();
    
    if (!q) {
      this.filteredStores = [...this.stores];
    } else {
      this.filteredStores = this.stores.filter(store =>
        store.name.toLowerCase().includes(q) ||
        store.city.toLowerCase().includes(q) ||
        store.zip.includes(q) ||
        store.address.toLowerCase().includes(q)
      );
    }
    
    this.applyFilters();
  }
  
  applyFilters() {
    let result = [...this.filteredStores];
    
    if (this.activeFilters.size > 0) {
      result = result.filter(store =>
        [...this.activeFilters].every(filter => store.services.includes(filter))
      );
    }
    
    this.filteredStores = result;
    this.renderStoreList();
    this.updateMapMarkers();
  }
  
  sortStores(sortBy) {
    switch (sortBy) {
      case 'distance':
        if (this.userLocation) {
          this.filteredStores.sort((a, b) => {
            const distA = this.haversineDistance(this.userLocation, { lat: a.lat, lng: a.lng });
            const distB = this.haversineDistance(this.userLocation, { lat: b.lat, lng: b.lng });
            return distA - distB;
          });
        }
        break;
      case 'name':
        this.filteredStores.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rating':
        this.filteredStores.sort((a, b) => b.rating - a.rating);
        break;
    }
    
    this.renderStoreList();
  }
  
  renderStoreList() {
    const listEl = this.container.querySelector('.store-list');
    
    if (this.filteredStores.length === 0) {
      listEl.innerHTML = '<p class="no-results">No stores found. Try adjusting your search or filters.</p>';
      return;
    }
    
    listEl.innerHTML = this.filteredStores.map((store, i) => {
      const distance = this.userLocation
        ? this.haversineDistance(this.userLocation, { lat: store.lat, lng: store.lng }).toFixed(1)
        : null;
      
      const isOpen = this.isStoreOpen(store);
      
      return `
        <div class="store-card ${this.selectedStore === store.id ? 'selected' : ''}" 
             role="listitem" tabindex="0" data-id="${store.id}" data-index="${i}">
          <div class="store-header">
            <h3 class="store-name">${this._sanitize(store.name)}</h3>
            ${distance ? `<span class="store-distance">${distance} km</span>` : ''}
          </div>
          <p class="store-address">${this._sanitize(store.address)}, ${this._sanitize(store.city)} ${store.zip}</p>
          <p class="store-hours ${isOpen ? 'open' : 'closed'}">
            ${isOpen ? '🟢 Open' : '🔴 Closed'} · ${store.hours}
          </p>
          <div class="store-services">
            ${store.services.map(s => `<span class="service-badge">${s}</span>`).join('')}
          </div>
          <div class="store-actions">
            <a href="tel:${store.phone}" class="btn-call">📞 ${store.phone}</a>
            <button class="btn-directions" data-lat="${store.lat}" data-lng="${store.lng}">
              🗺 Directions
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Click handlers
    listEl.querySelectorAll('.store-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.selectStore(id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.selectStore(card.dataset.id);
      });
    });
    
    listEl.querySelectorAll('.btn-directions').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lat = btn.dataset.lat;
        const lng = btn.dataset.lng;
        window.open(`https://www.openstreetmap.org/directions?from=&to=${lat}%2C${lng}`, '_blank', 'noopener');
      });
    });
  }
  
  getUserLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          this.sortStores('distance');
          if (this.map) {
            this.map.setView([this.userLocation.lat, this.userLocation.lng], 12);
          }
        },
        (err) => console.warn('Geolocation error:', err.message)
      );
    }
  }
  
  haversineDistance(p1, p2) {
    const R = 6371; // Earth radius in km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  
  isStoreOpen(store) {
    const now = new Date();
    const hour = now.getHours();
    return hour >= store.openHour && hour < store.closeHour;
  }
  
  initMap() {
    // Using Leaflet.js with OpenStreetMap tiles
    // this.map = L.map('map-container').setView([37.7749, -122.4194], 10);
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    // this.updateMapMarkers();
  }
  
  selectStore(storeId) {
    this.selectedStore = storeId;
    const store = this.stores.find(s => s.id === storeId);
    if (store && this.map) {
      this.map.setView([store.lat, store.lng], 15);
    }
    this.renderStoreList();
  }
  
  _sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
```

---

## 🎯 Key Takeaways
- Walmart FE = **Store Locator + Geolocation + Leaflet Map + Search/Filter**
- **Haversine formula**: calculate great-circle distance between two lat/lng points
- **Debounced search**: 300ms delay to avoid excessive filtering during typing
- **Service filter**: `every()` — store must have ALL selected services (AND logic)
- **Open/Closed status**: compare current hour with store hours — show visual indicator
- **Responsive**: CSS grid — sidebar + map on desktop, stack on mobile
- **Leaflet over Google Maps**: no API key required, open-source, free tiles from OpenStreetMap
- Walmart interviews: grocery/retail domain knowledge is a plus, focus on **practical UI solutions**

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Store Locator, Maps, Geolocation |
| Technical | Medium-Hard | React, Performance |
| HM | Medium | Culture Fit |
