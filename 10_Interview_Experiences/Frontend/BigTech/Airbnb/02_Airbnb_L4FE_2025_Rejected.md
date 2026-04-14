# Airbnb — Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Airbnb |
| **Role** | Frontend Engineer |
| **Level** | L4 / IC4 |
| **YOE** | 4 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Remote (US) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone Screen + 2 Coding + Architecture)
- **Timeline:** 2 weeks
- **Format:** Virtual

## Round 1: Phone Screen
**Duration:** 45 minutes

### Questions Asked
1. **Build a Star Rating Component with Half-Star Support**
   - Render N stars (default 5)
   - Support half-star selections via mouse position
   - Hover preview, click to set, read-only mode
   - Accessible with keyboard navigation

### 💡 Interview-Ready Answer

```javascript
class StarRating {
  constructor(container, options = {}) {
    this.container = container;
    this.maxStars = options.maxStars || 5;
    this.value = options.initialValue || 0;
    this.halfStars = options.halfStars !== false;
    this.readOnly = options.readOnly || false;
    this.size = options.size || 32;
    this.onChange = options.onChange || (() => {});

    this.hoverValue = -1;
    this.stars = [];

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      display: inline-flex; gap: 2px; cursor: ${this.readOnly ? 'default' : 'pointer'};
      -webkit-user-select: none; user-select: none;
    `;
    this.container.setAttribute('role', 'radiogroup');
    this.container.setAttribute('aria-label', `Rating: ${this.value} out of ${this.maxStars} stars`);

    if (!this.readOnly) {
      this.container.setAttribute('tabindex', '0');
    }

    for (let i = 0; i < this.maxStars; i++) {
      const star = document.createElement('span');
      star.setAttribute('role', 'radio');
      star.setAttribute('aria-checked', Math.ceil(this.value) === i + 1 ? 'true' : 'false');
      star.setAttribute('aria-label', `${i + 1} star${i > 0 ? 's' : ''}`);
      star.style.cssText = `
        position: relative; display: inline-block;
        width: ${this.size}px; height: ${this.size}px;
        font-size: ${this.size}px; line-height: 1;
      `;

      if (!this.readOnly) {
        star.addEventListener('mousemove', (e) => this.handleHover(e, i));
        star.addEventListener('click', (e) => this.handleClick(e, i));
      }

      this.stars.push(star);
      this.container.appendChild(star);
    }

    if (!this.readOnly) {
      this.container.addEventListener('mouseleave', () => {
        this.hoverValue = -1;
        this.updateDisplay();
      });

      this.container.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    this.updateDisplay();
  }

  handleHover(event, starIndex) {
    if (this.readOnly) return;

    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;

    if (this.halfStars && isLeftHalf) {
      this.hoverValue = starIndex + 0.5;
    } else {
      this.hoverValue = starIndex + 1;
    }

    this.updateDisplay();
  }

  handleClick(event, starIndex) {
    if (this.readOnly) return;

    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;

    const newValue = this.halfStars && isLeftHalf
      ? starIndex + 0.5
      : starIndex + 1;

    // Toggle off if clicking the same value
    this.value = this.value === newValue ? 0 : newValue;
    this.onChange(this.value);
    this.updateDisplay();
    this.updateAria();
  }

  handleKeyboard(event) {
    const step = this.halfStars ? 0.5 : 1;
    let handled = true;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        this.value = Math.min(this.maxStars, this.value + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        this.value = Math.max(0, this.value - step);
        break;
      case 'Home':
        this.value = 0;
        break;
      case 'End':
        this.value = this.maxStars;
        break;
      default:
        handled = false;
    }

    if (handled) {
      event.preventDefault();
      this.onChange(this.value);
      this.updateDisplay();
      this.updateAria();
    }
  }

  updateDisplay() {
    const displayValue = this.hoverValue >= 0 ? this.hoverValue : this.value;

    this.stars.forEach((star, i) => {
      const starNumber = i + 1;
      const fillPercentage = this.getFillPercentage(displayValue, starNumber);
      star.innerHTML = this.renderStarSVG(fillPercentage, this.hoverValue >= 0);
    });
  }

  getFillPercentage(value, starNumber) {
    if (value >= starNumber) return 100;
    if (value >= starNumber - 0.5) return 50;
    return 0;
  }

  renderStarSVG(fillPercent, isHovering) {
    const fillColor = isHovering ? '#FFB800' : '#FF5A5F'; // Airbnb red when set, gold on hover
    const emptyColor = '#E0E0E0';
    const id = `star-${Math.random().toString(36).substr(2, 5)}`;

    return `
      <svg width="${this.size}" height="${this.size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${id}">
            <stop offset="${fillPercent}%" stop-color="${fillColor}" />
            <stop offset="${fillPercent}%" stop-color="${emptyColor}" />
          </linearGradient>
        </defs>
        <path fill="url(#${id})" d="M12 2l3.09 6.26L22 9.27l-5 4.87
          1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `;
  }

  updateAria() {
    this.container.setAttribute('aria-label',
      `Rating: ${this.value} out of ${this.maxStars} stars`);
    this.stars.forEach((star, i) => {
      star.setAttribute('aria-checked',
        Math.ceil(this.value) === i + 1 ? 'true' : 'false');
    });
  }

  // Programmatic API
  setValue(value) {
    this.value = Math.max(0, Math.min(this.maxStars, value));
    this.updateDisplay();
    this.updateAria();
  }

  getValue() {
    return this.value;
  }

  setReadOnly(readOnly) {
    this.readOnly = readOnly;
    this.render();
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

// Usage
const container = document.getElementById('rating');
const rating = new StarRating(container, {
  maxStars: 5,
  initialValue: 3.5,
  halfStars: true,
  onChange: (value) => console.log('Rating:', value),
});
```

**Key Features:**
- **Half-star detection:** Mouse position relative to star midpoint
- **SVG gradient fill:** linearGradient for smooth partial fills
- **Keyboard:** Arrow keys for increment/decrement, Home/End for min/max
- **A11y:** `role="radiogroup"`, `aria-checked`, `aria-label`
- **Toggle off:** Clicking same value clears rating

## Round 2: Coding Round 2
**Duration:** 60 minutes

### Questions Asked
1. **Build a Typeahead/Autocomplete with Debounce and Caching**
   - Fetch suggestions from an API
   - 300ms debounce on keystrokes
   - Cache previous queries
   - Keyboard navigation (up/down/enter/escape)
   - Highlight matching text in suggestions

### Key Approach
- Debounce with `setTimeout`/`clearTimeout`
- LRU cache (Map maintains insertion order, delete + re-set for access)
- AbortController to cancel stale API requests
- `<mark>` tags for highlighting matches

## Round 3: Frontend Architecture
**Duration:** 60 minutes

### Questions Asked
1. **Design the Frontend for Airbnb's Listing Creation Flow**
   - Multi-step wizard (photos, description, pricing, amenities, availability)
   - Auto-save drafts
   - Image upload with preview, crop, reorder
   - Responsive (desktop + mobile)

### Result
- Rejected — the architecture discussion was considered too shallow on error recovery and offline support
- Feedback: Strong on coding, needed more depth on complex state management patterns for the architecture round

## 🎯 Key Takeaways
- Airbnb's **star rating** is an iconic component — expect it in frontend interviews
- SVG with linearGradient is the best approach for partial-star fills (vs. clip-path or overlapping elements)
- Half-star detection via mouse position is a common follow-up
- **Architecture rounds at Airbnb go deep** — offline support, error recovery, auto-save patterns are important
- Typeahead with cache + abort controller is a high-frequency frontend pattern

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium | Star Rating, SVG, Events |
| Coding Round 2 | Medium | Typeahead, Debounce, Caching |
| Frontend Architecture | Hard | Multi-step Wizard, Auto-save, Image Upload |
