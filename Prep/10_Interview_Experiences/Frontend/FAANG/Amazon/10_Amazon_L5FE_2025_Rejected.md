# Amazon — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | Frontend Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 5 years |
| **Date** | February 2025 |
| **Result** | ❌ Rejected |
| **Location** | Hyderabad, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + Bar Raiser)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Online Assessment — Autocomplete/Typeahead Component
**Duration:** 90 minutes

### Problem
Build a production-quality autocomplete input that:
- Debounces API calls (300ms)
- Shows loading state during fetch
- Handles keyboard navigation (Up/Down/Enter/Escape)
- Highlights matching text in suggestions
- Supports recent search history from localStorage

### 💡 Interview-Ready Answer

```javascript
class Autocomplete {
  constructor(container, options = {}) {
    this.container = container;
    this.fetchSuggestions = options.fetchSuggestions;
    this.debounceMs = options.debounce || 300;
    this.maxResults = options.maxResults || 10;
    this.maxHistory = options.maxHistory || 5;
    this.storageKey = options.storageKey || 'autocomplete_history';
    this.onSelect = options.onSelect || (() => {});
    
    this.activeIndex = -1;
    this.suggestions = [];
    this.isOpen = false;
    this.debounceTimer = null;
    this.abortController = null;

    this._build();
    this._bindEvents();
  }

  _build() {
    this.container.classList.add('autocomplete-wrapper');
    this.container.style.position = 'relative';

    // Input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.setAttribute('role', 'combobox');
    this.input.setAttribute('aria-autocomplete', 'list');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-haspopup', 'listbox');
    this.input.className = 'autocomplete-input';
    this.container.appendChild(this.input);

    // Loading spinner
    this.loader = document.createElement('span');
    this.loader.className = 'autocomplete-loader';
    this.loader.textContent = '⏳';
    this.loader.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);display:none';
    this.container.appendChild(this.loader);

    // Dropdown
    this.dropdown = document.createElement('ul');
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.className = 'autocomplete-dropdown';
    this.dropdown.style.cssText = `
      position:absolute; top:100%; left:0; right:0; 
      max-height:300px; overflow-y:auto; margin:0; padding:0;
      list-style:none; background:#fff; border:1px solid #ddd;
      border-top:none; border-radius:0 0 4px 4px; display:none;
      box-shadow:0 4px 6px rgba(0,0,0,0.1); z-index:1000;
    `;
    this.container.appendChild(this.dropdown);
  }

  _bindEvents() {
    this.input.addEventListener('input', () => this._onInput());
    this.input.addEventListener('focus', () => this._onFocus());
    this.input.addEventListener('keydown', (e) => this._onKeydown(e));

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this._close();
      }
    });
  }

  _onInput() {
    const query = this.input.value.trim();

    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort();
    }

    clearTimeout(this.debounceTimer);

    if (!query) {
      this._showHistory();
      return;
    }

    this.debounceTimer = setTimeout(() => this._fetchAndShow(query), this.debounceMs);
  }

  _onFocus() {
    const query = this.input.value.trim();
    if (!query) {
      this._showHistory();
    } else if (this.suggestions.length > 0) {
      this._open();
    }
  }

  _onKeydown(e) {
    if (!this.isOpen) {
      if (e.key === 'ArrowDown') {
        this._onInput();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._navigate(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._navigate(-1);
        break;
      case 'Enter':
        e.preventDefault();
        if (this.activeIndex >= 0 && this.activeIndex < this.suggestions.length) {
          this._selectItem(this.suggestions[this.activeIndex]);
        }
        break;
      case 'Escape':
        this._close();
        this.input.blur();
        break;
    }
  }

  _navigate(direction) {
    const items = this.dropdown.querySelectorAll('li');
    if (items.length === 0) return;

    // Remove current highlight
    if (this.activeIndex >= 0 && items[this.activeIndex]) {
      items[this.activeIndex].classList.remove('active');
      items[this.activeIndex].setAttribute('aria-selected', 'false');
    }

    this.activeIndex += direction;

    // Wrap around
    if (this.activeIndex < 0) this.activeIndex = items.length - 1;
    if (this.activeIndex >= items.length) this.activeIndex = 0;

    items[this.activeIndex].classList.add('active');
    items[this.activeIndex].setAttribute('aria-selected', 'true');
    items[this.activeIndex].scrollIntoView({ block: 'nearest' });
    this.input.setAttribute('aria-activedescendant', items[this.activeIndex].id);
  }

  async _fetchAndShow(query) {
    this.loader.style.display = 'inline';
    this.abortController = new AbortController();

    try {
      const results = await this.fetchSuggestions(query, {
        signal: this.abortController.signal,
        maxResults: this.maxResults
      });
      this.suggestions = results;
      this._renderSuggestions(query);
      this._open();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Autocomplete fetch error:', err);
        this.suggestions = [];
        this._renderEmpty('Error loading suggestions');
        this._open();
      }
    } finally {
      this.loader.style.display = 'none';
    }
  }

  _renderSuggestions(query) {
    this.dropdown.innerHTML = '';
    this.activeIndex = -1;

    if (this.suggestions.length === 0) {
      this._renderEmpty('No results found');
      return;
    }

    this.suggestions.forEach((item, index) => {
      const li = document.createElement('li');
      li.id = `autocomplete-item-${index}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.style.cssText = 'padding:8px 12px;cursor:pointer;';
      li.innerHTML = this._highlightMatch(item.label || item, query);

      li.addEventListener('mouseenter', () => {
        this.dropdown.querySelectorAll('li').forEach(el => {
          el.classList.remove('active');
          el.setAttribute('aria-selected', 'false');
        });
        li.classList.add('active');
        li.setAttribute('aria-selected', 'true');
        this.activeIndex = index;
      });

      li.addEventListener('click', () => this._selectItem(item));
      this.dropdown.appendChild(li);
    });
  }

  _renderEmpty(message) {
    this.dropdown.innerHTML = '';
    const li = document.createElement('li');
    li.style.cssText = 'padding:8px 12px;color:#999;font-style:italic;';
    li.textContent = message;
    this.dropdown.appendChild(li);
  }

  _highlightMatch(text, query) {
    const label = typeof text === 'string' ? text : text.toString();
    const regex = new RegExp(`(${this._escapeRegex(query)})`, 'gi');
    return label.replace(regex, '<strong style="color:#1a73e8">$1</strong>');
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _selectItem(item) {
    const value = item.label || item;
    this.input.value = value;
    this._saveToHistory(value);
    this._close();
    this.onSelect(item);
  }

  // === History Management ===

  _getHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch {
      return [];
    }
  }

  _saveToHistory(query) {
    let history = this._getHistory();
    history = history.filter(h => h !== query);
    history.unshift(query);
    history = history.slice(0, this.maxHistory);
    localStorage.setItem(this.storageKey, JSON.stringify(history));
  }

  _showHistory() {
    const history = this._getHistory();
    if (history.length === 0) {
      this._close();
      return;
    }

    this.suggestions = history.map(h => ({ label: h, isHistory: true }));
    this.dropdown.innerHTML = '';
    this.activeIndex = -1;

    const header = document.createElement('li');
    header.style.cssText = 'padding:6px 12px;font-size:12px;color:#666;border-bottom:1px solid #eee;';
    header.textContent = 'Recent searches';
    this.dropdown.appendChild(header);

    this.suggestions.forEach((item, index) => {
      const li = document.createElement('li');
      li.id = `autocomplete-item-${index}`;
      li.setAttribute('role', 'option');
      li.style.cssText = 'padding:8px 12px;cursor:pointer;';
      li.textContent = `🕐 ${item.label}`;

      li.addEventListener('click', () => this._selectItem(item));
      li.addEventListener('mouseenter', () => {
        this.activeIndex = index;
        li.classList.add('active');
      });
      this.dropdown.appendChild(li);
    });

    this._open();
  }

  _open() {
    this.isOpen = true;
    this.dropdown.style.display = 'block';
    this.input.setAttribute('aria-expanded', 'true');
  }

  _close() {
    this.isOpen = false;
    this.activeIndex = -1;
    this.dropdown.style.display = 'none';
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
  }

  destroy() {
    clearTimeout(this.debounceTimer);
    if (this.abortController) this.abortController.abort();
    this.container.innerHTML = '';
  }
}

// === Usage ===
/*
const wrapper = document.getElementById('search');

const autocomplete = new Autocomplete(wrapper, {
  debounce: 300,
  maxResults: 8,
  fetchSuggestions: async (query, { signal }) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
    const data = await res.json();
    return data.suggestions; // [{ label: '...', value: '...' }, ...]
  },
  onSelect: (item) => {
    console.log('Selected:', item);
    window.location.href = `/search?q=${encodeURIComponent(item.label)}`;
  }
});
*/
```

## 🎯 Key Takeaways
- Amazon FE loves **autocomplete/typeahead** — directly used in their search bar
- Must-have features: debounce, abort controller, keyboard nav, history
- **ARIA attributes** are critical: `combobox`, `listbox`, `option`, `aria-expanded`, `aria-activedescendant`
- Highlight matching text using regex with proper escaping
- AbortController cancels in-flight requests on new input

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Hard | Autocomplete, Debounce, ARIA, Keyboard Nav |
| Technical | Medium | DOM Manipulation, Event Handling |
| Bar Raiser | Medium-Hard | Leadership Principles |
