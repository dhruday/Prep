# Swiggy — Senior FE Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-3 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (JS + Machine Coding + FE System Design + HM)
- **Timeline:** 2.5 weeks
- **Format:** Virtual

## Round 2: Machine Coding — Address Picker with Map & Autocomplete

### Problem
Build an address selection component for food delivery:
- Text input with debounced autocomplete suggestions (simulated API)
- Selected address shows on a mini-map (canvas-based)
- "Use current location" button with Geolocation API
- Save address with label (Home/Work/Other)
- Recent addresses list
- Address form with fields: flat, landmark, delivery instructions

### 💡 Interview-Ready Answer

```javascript
class AddressPicker {
  constructor(container, config = {}) {
    this.container = container;
    this.onSelect = config.onSelect || (() => {});
    this.savedAddresses = config.saved || [];
    this.recentAddresses = config.recent || [];
    this.searchResults = [];
    this.selectedAddress = null;
    this.debounceTimer = null;
    this.isSearching = false;

    this.labels = ['Home', 'Work', 'Other'];
    this.selectedLabel = 'Home';
    this.additionalInfo = { flat: '', landmark: '', instructions: '' };

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'address-picker';
    this.container.style.cssText = 'max-width:480px;font-family:system-ui;';

    this.renderSearchBar();
    this.renderMap();

    if (this.selectedAddress) {
      this.renderAddressForm();
    } else {
      this.renderSuggestions();
      this.renderSavedAddresses();
    }
  }

  renderSearchBar() {
    const bar = document.createElement('div');
    bar.style.cssText = 'position:relative;margin-bottom:12px;';

    // Search icon
    const icon = document.createElement('span');
    icon.textContent = '📍';
    icon.style.cssText = 'position:absolute;left:12px;top:50%;transform:translateY(-50%);';

    // Input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search for area, street name...';
    this.searchInput.setAttribute('aria-label', 'Search address');
    this.searchInput.style.cssText = 'width:100%;padding:12px 12px 12px 40px;border:1px solid #ddd;border-radius:8px;font-size:15px;box-sizing:border-box;';

    if (this.selectedAddress) {
      this.searchInput.value = this.selectedAddress.displayName;
    }

    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      const query = e.target.value.trim();
      if (query.length < 3) {
        this.searchResults = [];
        this.render();
        return;
      }
      this.isSearching = true;
      this.debounceTimer = setTimeout(() => this.search(query), 400);
    });

    this.searchInput.addEventListener('focus', () => {
      if (this.selectedAddress) {
        this.selectedAddress = null;
        this.render();
      }
    });

    bar.appendChild(icon);
    bar.appendChild(this.searchInput);

    // Current location button
    const locBtn = document.createElement('button');
    locBtn.innerHTML = '◎ Use current location';
    locBtn.style.cssText = 'width:100%;padding:10px;margin-top:8px;border:1px dashed #1a73e8;border-radius:8px;background:#f8f9ff;color:#1a73e8;cursor:pointer;font-size:14px;font-weight:500;';
    locBtn.addEventListener('click', () => this.useCurrentLocation());

    bar.appendChild(locBtn);
    this.container.appendChild(bar);
  }

  renderMap() {
    this.mapContainer = document.createElement('div');
    this.mapContainer.style.cssText = 'height:180px;background:#e8f5e9;border-radius:12px;position:relative;overflow:hidden;margin-bottom:12px;';

    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 180;
    canvas.style.cssText = 'width:100%;height:100%;';
    this.mapContainer.appendChild(canvas);

    // Draw mini-map
    const ctx = canvas.getContext('2d');
    this.drawMiniMap(ctx, canvas.width, canvas.height);

    // Pin
    if (this.selectedAddress) {
      const pin = document.createElement('div');
      pin.style.cssText = 'position:absolute;left:50%;top:40%;transform:translate(-50%,-100%);font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));transition:top 0.3s;';
      pin.textContent = '📍';
      this.mapContainer.appendChild(pin);

      // Address label on map
      const label = document.createElement('div');
      label.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#fff;padding:4px 12px;border-radius:16px;font-size:12px;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis;';
      label.textContent = this.selectedAddress.displayName;
      this.mapContainer.appendChild(label);
    }

    this.container.appendChild(this.mapContainer);
  }

  drawMiniMap(ctx, w, h) {
    // Grid background
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#c8e6c9';
    ctx.lineWidth = 1;

    // Horizontal roads
    for (let y = 30; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Vertical roads
    for (let x = 40; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Buildings (blocks)
    ctx.fillStyle = '#a5d6a7';
    for (let x = 10; x < w; x += 60) {
      for (let y = 10; y < h; y += 40) {
        ctx.fillRect(x, y, 30, 20);
      }
    }
  }

  renderSuggestions() {
    if (this.searchResults.length === 0 && !this.isSearching) return;

    const list = document.createElement('div');
    list.className = 'suggestions-list';
    list.setAttribute('role', 'listbox');
    list.style.cssText = 'border:1px solid #eee;border-radius:8px;overflow:hidden;margin-bottom:12px;';

    if (this.isSearching) {
      const loading = document.createElement('div');
      loading.style.cssText = 'padding:12px;text-align:center;color:#666;font-size:14px;';
      loading.textContent = 'Searching...';
      list.appendChild(loading);
    } else {
      this.searchResults.forEach(result => {
        const item = document.createElement('div');
        item.setAttribute('role', 'option');
        item.style.cssText = 'padding:12px;cursor:pointer;border-bottom:1px solid #f0f0f0;display:flex;align-items:flex-start;gap:10px;';
        item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
        item.addEventListener('mouseleave', () => item.style.background = '#fff');

        item.innerHTML = `
          <span style="color:#e53e3e;font-size:18px;margin-top:2px;">📍</span>
          <div>
            <div style="font-weight:500;">${this.escapeHtml(result.displayName)}</div>
            <div style="font-size:13px;color:#666;">${this.escapeHtml(result.area)}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          this.selectedAddress = result;
          this.render();
        });
        list.appendChild(item);
      });
    }

    this.container.appendChild(list);
  }

  renderSavedAddresses() {
    if (this.savedAddresses.length === 0 && this.recentAddresses.length === 0) return;

    if (this.savedAddresses.length > 0) {
      const section = this.createSection('Saved Addresses');
      this.savedAddresses.forEach(addr => {
        section.appendChild(this.createAddressRow(addr, true));
      });
      this.container.appendChild(section);
    }

    if (this.recentAddresses.length > 0) {
      const section = this.createSection('Recent');
      this.recentAddresses.slice(0, 3).forEach(addr => {
        section.appendChild(this.createAddressRow(addr, false));
      });
      this.container.appendChild(section);
    }
  }

  createSection(title) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:12px;';
    const header = document.createElement('h4');
    header.textContent = title;
    header.style.cssText = 'margin:0 0 8px;font-size:14px;color:#666;';
    section.appendChild(header);
    return section;
  }

  createAddressRow(addr, isSaved) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #eee;border-radius:8px;margin-bottom:6px;cursor:pointer;';
    row.addEventListener('mouseenter', () => row.style.background = '#fafafa');
    row.addEventListener('mouseleave', () => row.style.background = '#fff');

    const icons = { Home: '🏠', Work: '💼', Other: '📍' };
    row.innerHTML = `
      <span style="font-size:20px;">${icons[addr.label] || '📍'}</span>
      <div style="flex:1;">
        ${isSaved ? `<div style="font-weight:600;font-size:14px;">${this.escapeHtml(addr.label)}</div>` : ''}
        <div style="font-size:13px;color:#666;">${this.escapeHtml(addr.displayName)}</div>
      </div>
    `;

    row.addEventListener('click', () => {
      this.selectedAddress = addr;
      this.render();
    });

    return row;
  }

  renderAddressForm() {
    const form = document.createElement('div');
    form.style.cssText = 'border:1px solid #eee;border-radius:12px;padding:16px;';

    // Label selector
    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;';

    this.labels.forEach(lbl => {
      const btn = document.createElement('button');
      btn.textContent = lbl;
      btn.style.cssText = `
        padding:6px 16px;border-radius:20px;border:1px solid ${this.selectedLabel === lbl ? '#ff5722' : '#ddd'};
        background:${this.selectedLabel === lbl ? '#ff5722' : '#fff'};
        color:${this.selectedLabel === lbl ? '#fff' : '#333'};cursor:pointer;font-size:13px;
      `;
      btn.addEventListener('click', () => { this.selectedLabel = lbl; this.render(); });
      labelRow.appendChild(btn);
    });
    form.appendChild(labelRow);

    // Additional fields
    const fields = [
      { key: 'flat', label: 'Flat / House / Floor', placeholder: 'e.g. Flat 42, 3rd Floor' },
      { key: 'landmark', label: 'Landmark', placeholder: 'e.g. Near City Mall' },
      { key: 'instructions', label: 'Delivery Instructions', placeholder: 'e.g. Ring the bell twice' }
    ];

    fields.forEach(field => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin-bottom:12px;';

      const label = document.createElement('label');
      label.textContent = field.label;
      label.style.cssText = 'display:block;font-size:13px;color:#666;margin-bottom:4px;';
      wrapper.appendChild(label);

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = field.placeholder;
      input.value = this.additionalInfo[field.key];
      input.style.cssText = 'width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;';
      input.addEventListener('input', (e) => { this.additionalInfo[field.key] = e.target.value; });
      wrapper.appendChild(input);

      form.appendChild(wrapper);
    });

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Address & Continue';
    saveBtn.style.cssText = 'width:100%;padding:14px;background:#ff5722;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;';
    saveBtn.addEventListener('click', () => {
      const fullAddress = {
        ...this.selectedAddress,
        label: this.selectedLabel,
        ...this.additionalInfo
      };
      this.onSelect(fullAddress);

      saveBtn.textContent = '✓ Address Saved!';
      saveBtn.style.background = '#22c55e';
      saveBtn.disabled = true;
    });
    form.appendChild(saveBtn);

    this.container.appendChild(form);
  }

  async search(query) {
    // Simulated API response
    await new Promise(r => setTimeout(r, 300));

    this.searchResults = [
      { displayName: `${query} Main Road`, area: 'Koramangala, Bangalore', lat: 12.93, lng: 77.62 },
      { displayName: `${query} Cross Street`, area: 'HSR Layout, Bangalore', lat: 12.91, lng: 77.64 },
      { displayName: `${query} Colony`, area: 'Indiranagar, Bangalore', lat: 12.97, lng: 77.64 },
    ];
    this.isSearching = false;
    this.render();
    this.searchInput.focus();
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.selectedAddress = {
          displayName: 'Current Location',
          area: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        this.render();
      },
      (err) => {
        alert('Unable to get location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Usage:
// new AddressPicker(document.getElementById('app'), {
//   saved: [
//     { label: 'Home', displayName: '42, Koramangala 5th Block', area: 'Bangalore' },
//     { label: 'Work', displayName: 'WeWork Galaxy, Residency Road', area: 'Bangalore' }
//   ],
//   recent: [
//     { displayName: 'Phoenix Mall', area: 'Whitefield, Bangalore' }
//   ],
//   onSelect: (addr) => console.log('Selected:', addr)
// });
```

## 🎯 Key Takeaways
- Swiggy FE variant — **address/location picker** is core to delivery UX
- Debounced search (400ms) to avoid hammering the API during typing
- Geolocation API with `enableHighAccuracy` and timeout for "use current location"
- Canvas-based mini-map — simple grid pattern simulates streets and blocks
- Address form with label categories (Home/Work/Other) for quick re-use
- Saved and recent addresses for returning users — reduces friction

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JS Fundamentals | Medium | Async, Closures, this |
| Machine Coding | Medium-Hard | Geolocation API, Canvas, Debounce |
| FE System Design | Hard | Location Service Architecture |
| HM | Medium | Behavioral |
