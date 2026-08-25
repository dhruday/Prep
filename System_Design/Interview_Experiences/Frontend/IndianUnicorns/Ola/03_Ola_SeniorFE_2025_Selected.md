# Ola — Senior Frontend Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Ola |
| **Role** | Senior Frontend Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/ola-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Challenge
**Build an Autocomplete Search Input** (like Ola's destination search)
- Debounced API call as user types (300ms)
- Keyboard navigation (ArrowUp/Down to select, Enter to confirm)
- Highlight matching text in results
- Recent searches (persist in localStorage)
- Loading state + error handling
- Accessible: ARIA roles, screen reader friendly

### 💡 Autocomplete Search

```javascript
class Autocomplete {
  constructor(container, options = {}) {
    this.container = container;
    this.fetchSuggestions = options.fetchSuggestions; // async (query) => results[]
    this.onSelect = options.onSelect || (() => {});
    this.debounceMs = options.debounce || 300;
    this.maxRecent = options.maxRecent || 5;
    
    this.suggestions = [];
    this.selectedIndex = -1;
    this.isOpen = false;
    this.abortController = null;
    this.debounceTimer = null;
    
    this.recentSearches = this.loadRecent();
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="autocomplete" role="combobox" aria-expanded="false" aria-haspopup="listbox">
        <div class="search-input-wrapper">
          <input type="text" class="search-input" 
                 placeholder="Where are you going?"
                 role="searchbox"
                 aria-autocomplete="list"
                 aria-controls="suggestion-list"
                 aria-activedescendant=""
                 autocomplete="off">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <button class="clear-btn" aria-label="Clear search" hidden>&times;</button>
        </div>
        <div class="suggestion-dropdown" hidden>
          <div class="loading-indicator" hidden>
            <span class="spinner" aria-hidden="true"></span> Searching...
          </div>
          <div class="error-message" role="alert" hidden></div>
          <ul id="suggestion-list" class="suggestion-list" role="listbox" aria-label="Suggestions">
          </ul>
        </div>
      </div>
    `;
    
    this.input = this.container.querySelector('.search-input');
    this.dropdown = this.container.querySelector('.suggestion-dropdown');
    this.listEl = this.container.querySelector('#suggestion-list');
    this.loadingEl = this.container.querySelector('.loading-indicator');
    this.errorEl = this.container.querySelector('.error-message');
    this.clearBtn = this.container.querySelector('.clear-btn');
    this.combobox = this.container.querySelector('[role="combobox"]');
    
    this.attachListeners();
  }
  
  attachListeners() {
    // Input with debounce
    this.input.addEventListener('input', () => {
      const query = this.input.value.trim();
      
      this.clearBtn.hidden = query.length === 0;
      
      clearTimeout(this.debounceTimer);
      
      if (query.length === 0) {
        this.showRecent();
        return;
      }
      
      if (query.length < 2) return; // Minimum 2 chars
      
      this.debounceTimer = setTimeout(() => this.search(query), this.debounceMs);
    });
    
    // Keyboard navigation
    this.input.addEventListener('keydown', (e) => {
      if (!this.isOpen) {
        if (e.key === 'ArrowDown') {
          this.showRecent();
          return;
        }
        return;
      }
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
          this.highlightSelected();
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
          this.highlightSelected();
          break;
          
        case 'Enter':
          e.preventDefault();
          if (this.selectedIndex >= 0) {
            this.selectSuggestion(this.suggestions[this.selectedIndex]);
          }
          break;
          
        case 'Escape':
          this.close();
          break;
      }
    });
    
    // Focus: show recent searches
    this.input.addEventListener('focus', () => {
      if (!this.input.value.trim()) this.showRecent();
    });
    
    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) this.close();
    });
    
    // Clear button
    this.clearBtn.addEventListener('click', () => {
      this.input.value = '';
      this.clearBtn.hidden = true;
      this.close();
      this.input.focus();
    });
  }
  
  async search(query) {
    // Cancel previous request
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    
    this.showLoading(true);
    this.errorEl.hidden = true;
    
    try {
      const results = await this.fetchSuggestions(query, this.abortController.signal);
      
      this.suggestions = results;
      this.selectedIndex = -1;
      this.renderSuggestions(query);
      
    } catch (error) {
      if (error.name === 'AbortError') return; // Ignored: superseded by new request
      
      this.errorEl.textContent = 'Failed to load suggestions. Please try again.';
      this.errorEl.hidden = false;
      this.suggestions = [];
      this.renderSuggestions(query);
      
    } finally {
      this.showLoading(false);
    }
  }
  
  renderSuggestions(query) {
    this.open();
    
    if (this.suggestions.length === 0 && query) {
      this.listEl.innerHTML = '<li class="no-results" role="option">No results found</li>';
      return;
    }
    
    this.listEl.innerHTML = this.suggestions.map((item, i) => `
      <li class="suggestion-item" role="option" id="suggestion-${i}" data-index="${i}"
          aria-selected="${i === this.selectedIndex}">
        <span class="suggestion-icon" aria-hidden="true">📍</span>
        <div class="suggestion-text">
          <span class="suggestion-main">${this.highlightMatch(item.name, query)}</span>
          ${item.address ? `<span class="suggestion-secondary">${this._sanitize(item.address)}</span>` : ''}
        </div>
      </li>
    `).join('');
    
    // Click to select
    this.listEl.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectSuggestion(this.suggestions[parseInt(item.dataset.index)]);
      });
    });
  }
  
  highlightMatch(text, query) {
    const sanitized = this._sanitize(text);
    const queryEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${queryEscaped})`, 'gi');
    return sanitized.replace(regex, '<mark>$1</mark>');
  }
  
  showRecent() {
    if (this.recentSearches.length === 0) return;
    
    this.suggestions = this.recentSearches.map(r => ({ ...r, isRecent: true }));
    this.selectedIndex = -1;
    this.open();
    
    this.listEl.innerHTML = `
      <li class="section-header" aria-hidden="true">Recent Searches</li>
      ${this.recentSearches.map((item, i) => `
        <li class="suggestion-item recent" role="option" id="suggestion-${i}" data-index="${i}">
          <span class="suggestion-icon" aria-hidden="true">🕐</span>
          <span class="suggestion-main">${this._sanitize(item.name)}</span>
        </li>
      `).join('')}
    `;
    
    this.listEl.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectSuggestion(this.suggestions[parseInt(item.dataset.index)]);
      });
    });
  }
  
  selectSuggestion(item) {
    this.input.value = item.name;
    this.close();
    this.saveRecent(item);
    this.onSelect(item);
  }
  
  highlightSelected() {
    this.listEl.querySelectorAll('.suggestion-item').forEach((item, i) => {
      const isSelected = i === this.selectedIndex;
      item.classList.toggle('highlighted', isSelected);
      item.setAttribute('aria-selected', isSelected);
    });
    
    // Update active descendant for screen readers
    if (this.selectedIndex >= 0) {
      this.input.setAttribute('aria-activedescendant', `suggestion-${this.selectedIndex}`);
      
      // Scroll into view
      const selected = this.listEl.querySelector('.highlighted');
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
  }
  
  open() {
    this.isOpen = true;
    this.dropdown.hidden = false;
    this.combobox.setAttribute('aria-expanded', 'true');
  }
  
  close() {
    this.isOpen = false;
    this.dropdown.hidden = true;
    this.combobox.setAttribute('aria-expanded', 'false');
    this.selectedIndex = -1;
  }
  
  showLoading(show) {
    this.loadingEl.hidden = !show;
  }
  
  saveRecent(item) {
    this.recentSearches = this.recentSearches.filter(r => r.name !== item.name);
    this.recentSearches.unshift({ name: item.name, address: item.address });
    this.recentSearches = this.recentSearches.slice(0, this.maxRecent);
    
    try {
      localStorage.setItem('recent-searches', JSON.stringify(this.recentSearches));
    } catch (e) {}
  }
  
  loadRecent() {
    try {
      return JSON.parse(localStorage.getItem('recent-searches')) || [];
    } catch (e) {
      return [];
    }
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
- Ola FE = **Autocomplete + debounce + keyboard nav + AbortController + recent searches**
- **AbortController**: cancel previous request when new keystroke arrives — prevents race conditions
- **Debounce 300ms**: don't fire API until user pauses typing — reduces unnecessary requests
- **Highlight matching**: regex replace with `<mark>` — escape regex special chars in query
- **ARIA combobox pattern**: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"`
- **Recent searches**: localStorage-backed, shown on focus when input is empty, max 5 entries
- **Scroll into view**: `scrollIntoView({ block: 'nearest' })` keeps keyboard-selected item visible
- Ola interviews: **location/map features are core** — autocomplete, geocoding, map markers

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| Machine Coding | Hard | Autocomplete, Debounce, ARIA |
| Technical | Medium-Hard | React, Performance |
| HM | Medium | Culture Fit |
