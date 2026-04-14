# Target — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target Corporation |
| **Role** | Lead Frontend Engineer |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/target-corporation-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Machine Coding + JavaScript + System Design + HM)
- **Rejection Reason:** System Design — didn't address inventory sync between online and in-store

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Store Locator with Map Integration**
   - Current location detection (Geolocation API)
   - Search by zip code or city
   - Filter: store type (SuperTarget, small format), open now, services (pharmacy, Starbucks)
   - Sort by distance
   - Store details panel with hours, address, phone

### 💡 Interview-Ready Answer

```jsx
function StoreLocator() {
  const [stores, setStores] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ type: 'all', openNow: false, services: [] });
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  
  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation denied:', error.message);
          // Default to a central location
          setUserLocation({ lat: 12.9716, lng: 77.5946 }); // Bangalore
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);
  
  // Fetch stores
  useEffect(() => {
    if (!userLocation) return;
    
    const fetchStores = async () => {
      setLoading(true);
      const params = new URLSearchParams({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius: 50, // 50 km radius
      });
      
      const res = await fetch(`/api/stores?${params}`);
      const data = await res.json();
      setStores(data.stores);
      setLoading(false);
    };
    
    fetchStores();
  }, [userLocation]);
  
  // Haversine distance calculation
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  // Filter and sort stores
  const filteredStores = useMemo(() => {
    let result = stores;
    
    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.zipCode.includes(query) ||
        s.city.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    if (filters.type !== 'all') {
      result = result.filter(s => s.storeType === filters.type);
    }
    
    // Open now filter
    if (filters.openNow) {
      result = result.filter(s => isStoreOpen(s));
    }
    
    // Services filter
    if (filters.services.length > 0) {
      result = result.filter(s =>
        filters.services.every(service => s.services.includes(service))
      );
    }
    
    // Sort by distance from user
    if (userLocation) {
      result = [...result].sort((a, b) => {
        const distA = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const distB = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return distA - distB;
      });
    }
    
    return result;
  }, [stores, searchQuery, filters, userLocation]);
  
  const isStoreOpen = (store) => {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = store.hours[day];
    if (!hours || hours === 'closed') return false;
    
    const [openTime, closeTime] = hours.split('-');
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    return currentMinutes >= openH * 60 + openM && currentMinutes <= closeH * 60 + closeM;
  };
  
  return (
    <div className="store-locator">
      {/* Search & Filters */}
      <div className="search-panel">
        <div className="search-input">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by city, zip code, or store name"
            aria-label="Store search"
          />
          <button onClick={() => {/* Geocode search query */}}>Search</button>
        </div>
        
        <div className="filters" role="group" aria-label="Store filters">
          <select value={filters.type} onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  aria-label="Store type">
            <option value="all">All Stores</option>
            <option value="super">SuperTarget</option>
            <option value="small">Small Format</option>
            <option value="express">Target Express</option>
          </select>
          
          <label className="filter-toggle">
            <input type="checkbox" checked={filters.openNow}
                   onChange={e => setFilters(prev => ({ ...prev, openNow: e.target.checked }))} />
            Open Now
          </label>
          
          <div className="service-filters" role="group" aria-label="Store services">
            {['Pharmacy', 'Starbucks', 'Optical', 'CVS', 'Drive Up'].map(service => (
              <label key={service} className="service-chip">
                <input
                  type="checkbox"
                  checked={filters.services.includes(service)}
                  onChange={e => {
                    setFilters(prev => ({
                      ...prev,
                      services: e.target.checked
                        ? [...prev.services, service]
                        : prev.services.filter(s => s !== service),
                    }));
                  }}
                />
                {service}
              </label>
            ))}
          </div>
        </div>
        
        {/* Store List */}
        <div className="store-list" role="list" aria-label={`${filteredStores.length} stores found`}>
          {filteredStores.map(store => (
            <div
              key={store.id}
              className={`store-card ${selectedStore?.id === store.id ? 'selected' : ''}`}
              onClick={() => setSelectedStore(store)}
              role="listitem"
              aria-current={selectedStore?.id === store.id}
            >
              <div className="store-header">
                <h3>{store.name}</h3>
                <span className={`open-status ${isStoreOpen(store) ? 'open' : 'closed'}`}>
                  {isStoreOpen(store) ? 'Open' : 'Closed'}
                </span>
              </div>
              
              <p className="store-address">{store.address}</p>
              
              <div className="store-meta">
                {userLocation && (
                  <span className="distance">
                    📍 {getDistance(userLocation.lat, userLocation.lng, store.lat, store.lng).toFixed(1)} km
                  </span>
                )}
                <span className="store-type">{store.storeType}</span>
              </div>
              
              <div className="store-services">
                {store.services.slice(0, 3).map(s => (
                  <span key={s} className="service-badge">{s}</span>
                ))}
                {store.services.length > 3 && <span>+{store.services.length - 3} more</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Map */}
      <div className="map-container" ref={mapRef} aria-label="Store locations map">
        {/* Mapbox/Google Maps renders here */}
      </div>
    </div>
  );
}
```

---

## 🎯 Key Takeaways
- Target FE = **e-commerce + store locator + inventory UI**
- **Haversine formula**: Earth distance calculation — memorize the formula
- **Geolocation API**: `navigator.geolocation.getCurrentPosition` with permission handling
- **Store hours parsing**: day-of-week lookup, time range comparison
- **Filter services with `every`**: all selected services must be present (AND logic)
- Target rejected on **omnichannel inventory sync**: online ↔ in-store inventory updates in real-time
- Know **Target's tech stack**: React, Node.js, Kubernetes, significant investment in frontend
- Target values: **practical e-commerce skills**, accessibility, performance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Hard | Store Locator, Geolocation, Map, Filters |
| JavaScript | Medium | Deep Equal, Closures, Event Loop |
| System Design | Very Hard | Omnichannel Inventory, BOPIS |
| HM | Medium | Behavioral, Target Values |
