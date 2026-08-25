# Google — L5 Frontend Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Google |
| **Role** | Frontend Software Engineer |
| **Level** | L5 (Senior) |
| **YOE** | 6 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Timeline:** 4 weeks
- **Format:** Virtual Onsite

## Round 1: Phone Screen — Build a Virtual Scroll List
**Duration:** 45 minutes

### Problem
Implement a virtualized/windowed list that efficiently renders only visible items from a dataset of 100,000+ items. Support smooth scrolling, dynamic item heights, and scroll-to-index.

### 💡 Interview-Ready Answer

```javascript
class VirtualScrollList {
  constructor(container, { itemCount, estimatedItemHeight = 40, overscan = 5, renderItem }) {
    this.container = container;
    this.itemCount = itemCount;
    this.estimatedHeight = estimatedItemHeight;
    this.overscan = overscan;
    this.renderItem = renderItem;

    // Cache measured heights
    this.heightCache = new Map(); // index -> actual height
    // Prefix sum of heights for O(log n) position lookup
    this.positionCache = null;

    this.scrollTop = 0;
    this.containerHeight = container.clientHeight;

    this._setup();
    this._render();
  }

  _setup() {
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';

    // Spacer element to maintain total scroll height
    this.spacer = document.createElement('div');
    this.spacer.style.width = '100%';
    this.spacer.style.height = `${this._getTotalHeight()}px`;
    this.container.appendChild(this.spacer);

    // Content container positioned absolutely
    this.content = document.createElement('div');
    this.content.style.position = 'absolute';
    this.content.style.top = '0';
    this.content.style.left = '0';
    this.content.style.right = '0';
    this.container.appendChild(this.content);

    // Throttled scroll handler
    let ticking = false;
    this.container.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.scrollTop = this.container.scrollTop;
          this._render();
          ticking = false;
        });
        ticking = true;
      }
    });

    // Resize observer
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.containerHeight = this.container.clientHeight;
        this._render();
      });
      this.resizeObserver.observe(this.container);
    }
  }

  _getItemHeight(index) {
    return this.heightCache.get(index) || this.estimatedHeight;
  }

  _getTotalHeight() {
    let total = 0;
    for (let i = 0; i < this.itemCount; i++) {
      total += this._getItemHeight(i);
    }
    return total;
  }

  _getItemOffset(index) {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this._getItemHeight(i);
    }
    return offset;
  }

  /**
   * Binary search to find the first visible item index.
   */
  _findStartIndex(scrollTop) {
    let low = 0;
    let high = this.itemCount - 1;
    let offset = 0;

    // Linear scan is fine for overscan-sized jumps
    // But binary search for large jumps
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const midOffset = this._getItemOffset(mid);

      if (midOffset < scrollTop) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return Math.max(0, high);
  }

  _getVisibleRange() {
    const startIndex = this._findStartIndex(this.scrollTop);
    const visibleStart = Math.max(0, startIndex - this.overscan);

    let endIndex = startIndex;
    let heightSum = this._getItemOffset(startIndex) - this.scrollTop;

    while (endIndex < this.itemCount && heightSum < this.containerHeight) {
      heightSum += this._getItemHeight(endIndex);
      endIndex++;
    }

    const visibleEnd = Math.min(this.itemCount - 1, endIndex + this.overscan);

    return { start: visibleStart, end: visibleEnd };
  }

  _render() {
    const { start, end } = this._getVisibleRange();

    // Clear previous items
    this.content.innerHTML = '';

    const offsetY = this._getItemOffset(start);
    this.content.style.transform = `translateY(${offsetY}px)`;

    for (let i = start; i <= end; i++) {
      const itemEl = document.createElement('div');
      itemEl.dataset.index = i;
      itemEl.style.width = '100%';

      this.renderItem(itemEl, i);
      this.content.appendChild(itemEl);

      // Measure and cache actual height after render
      requestAnimationFrame(() => {
        const actualHeight = itemEl.getBoundingClientRect().height;
        if (actualHeight !== this.heightCache.get(i)) {
          this.heightCache.set(i, actualHeight);
          this.spacer.style.height = `${this._getTotalHeight()}px`;
        }
      });
    }
  }

  /**
   * Scroll to a specific item index.
   */
  scrollToIndex(index, align = 'start') {
    const offset = this._getItemOffset(index);
    const itemHeight = this._getItemHeight(index);

    let scrollTo;
    switch (align) {
      case 'center':
        scrollTo = offset - (this.containerHeight - itemHeight) / 2;
        break;
      case 'end':
        scrollTo = offset - this.containerHeight + itemHeight;
        break;
      default: // 'start'
        scrollTo = offset;
    }

    this.container.scrollTop = Math.max(0, scrollTo);
  }

  /**
   * Update item count (e.g., after data load).
   */
  setItemCount(count) {
    this.itemCount = count;
    this.spacer.style.height = `${this._getTotalHeight()}px`;
    this._render();
  }

  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.container.innerHTML = '';
  }
}

// === USAGE EXAMPLE ===
/*
const container = document.getElementById('scroll-container');
container.style.height = '500px';

const data = Array.from({ length: 100000 }, (_, i) => ({
  id: i,
  text: `Item ${i}`,
  height: 30 + Math.floor(Math.random() * 40) // Variable heights
}));

const list = new VirtualScrollList(container, {
  itemCount: data.length,
  estimatedItemHeight: 50,
  overscan: 5,
  renderItem: (el, index) => {
    el.style.height = `${data[index].height}px`;
    el.style.padding = '8px';
    el.style.borderBottom = '1px solid #eee';
    el.textContent = data[index].text;
  }
});

// Scroll to specific item
list.scrollToIndex(50000, 'center');
*/
```

## 🎯 Key Takeaways
- **Virtual scroll** is a Google FE classic — tests DOM performance understanding
- Key optimization: Only render visible items + overscan buffer
- Binary search for start index is important for constant-time scroll handling
- Height caching with fallback to estimated height handles dynamic content
- `requestAnimationFrame` for scroll event throttling prevents layout thrashing
- `transform: translateY()` for positioning avoids reflow (GPU-composited)

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | Virtual Scroll, DOM Virtualization, Performance |
| Coding | Medium | Tree Traversal, DOM |
| System Design | Hard | Google Docs Collaboration |
| Behavioral | Medium | Googliness |
