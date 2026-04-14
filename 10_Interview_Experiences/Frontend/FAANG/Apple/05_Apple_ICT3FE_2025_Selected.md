# Apple — ICT3 Frontend Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Frontend Engineer ICT3 |
| **Level** | ICT3 (Senior) |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Cupertino, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Apple Music Web |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Virtual Scrolling List with Dynamic Heights**
2. **Follow-up: Support sticky headers for grouped items**

### 💡 Virtual Scroll with Dynamic Heights + Sticky Headers

```javascript
/**
 * Virtual scroll for dynamic-height items with grouped sticky headers.
 * 
 * Challenge: can't pre-compute positions without knowing heights.
 * Solution: estimate initially → measure actual heights → re-position.
 * 
 * Key: maintain a "position cache" that maps item index → { top, height }.
 * Use binary search to find visible range from scroll position.
 */
class VirtualScrollDynamic {
  constructor(container, options = {}) {
    this.container = container;
    this.items = options.items || [];
    this.groups = options.groups || []; // [{ label, startIndex }]
    this.renderItem = options.renderItem;
    this.estimatedHeight = options.estimatedHeight || 60;
    this.overscan = options.overscan || 5;
    this.headerHeight = options.headerHeight || 40;
    
    // Position cache: index → { top, height, measured }
    this.positions = [];
    this.initPositions();
    
    this.scrollTop = 0;
    this.viewportHeight = 0;
    
    this.setup();
  }
  
  initPositions() {
    let top = 0;
    let groupIdx = 0;
    
    for (let i = 0; i < this.items.length; i++) {
      // Check if this index starts a new group
      if (groupIdx < this.groups.length && this.groups[groupIdx].startIndex === i) {
        this.positions.push({
          top,
          height: this.headerHeight,
          measured: true,
          isHeader: true,
          groupLabel: this.groups[groupIdx].label
        });
        top += this.headerHeight;
        groupIdx++;
      }
      
      this.positions.push({
        top,
        height: this.estimatedHeight,
        measured: false,
        isHeader: false,
        itemIndex: i
      });
      top += this.estimatedHeight;
    }
    
    this.totalHeight = top;
  }
  
  setup() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    
    this.container.innerHTML = `
      <div class="virtual-scroll-viewport" role="list" aria-label="Scrollable list">
        <div class="virtual-scroll-spacer" style="height: ${this.totalHeight}px; position: relative;">
        </div>
        <div class="virtual-scroll-sticky" style="position: sticky; top: 0; z-index: 1;">
        </div>
      </div>
    `;
    
    this.spacer = this.container.querySelector('.virtual-scroll-spacer');
    this.stickyEl = this.container.querySelector('.virtual-scroll-sticky');
    this.viewportHeight = this.container.clientHeight;
    
    this.container.addEventListener('scroll', () => {
      this.scrollTop = this.container.scrollTop;
      this.renderVisible();
    });
    
    // ResizeObserver for viewport changes
    new ResizeObserver(() => {
      this.viewportHeight = this.container.clientHeight;
      this.renderVisible();
    }).observe(this.container);
    
    this.renderVisible();
  }
  
  // Binary search: find first position with top >= scrollTop
  findStartIndex(scrollTop) {
    let lo = 0, hi = this.positions.length - 1;
    
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const pos = this.positions[mid];
      
      if (pos.top + pos.height <= scrollTop) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    
    return Math.max(0, lo - this.overscan);
  }
  
  findEndIndex(scrollBottom) {
    let lo = 0, hi = this.positions.length - 1;
    
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      
      if (this.positions[mid].top < scrollBottom) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    
    return Math.min(this.positions.length - 1, lo + this.overscan);
  }
  
  renderVisible() {
    const scrollTop = this.scrollTop;
    const scrollBottom = scrollTop + this.viewportHeight;
    
    const startIdx = this.findStartIndex(scrollTop);
    const endIdx = this.findEndIndex(scrollBottom);
    
    // Find current sticky header
    let stickyHeader = null;
    for (let i = startIdx; i >= 0; i--) {
      if (this.positions[i].isHeader) {
        stickyHeader = this.positions[i];
        break;
      }
    }
    
    // Render sticky header
    if (stickyHeader) {
      this.stickyEl.innerHTML = `
        <div class="group-header sticky" role="heading" aria-level="2">
          ${this._sanitize(stickyHeader.groupLabel)}
        </div>
      `;
      this.stickyEl.style.display = 'block';
    } else {
      this.stickyEl.style.display = 'none';
    }
    
    // Render visible items
    const fragment = document.createDocumentFragment();
    
    for (let i = startIdx; i <= endIdx; i++) {
      const pos = this.positions[i];
      
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.top = `${pos.top}px`;
      el.style.width = '100%';
      el.setAttribute('role', pos.isHeader ? 'heading' : 'listitem');
      
      if (pos.isHeader) {
        el.className = 'group-header';
        el.setAttribute('aria-level', '2');
        el.textContent = pos.groupLabel;
      } else {
        el.className = 'virtual-item';
        el.dataset.index = i;
        this.renderItem(el, this.items[pos.itemIndex], pos.itemIndex);
      }
      
      fragment.appendChild(el);
    }
    
    // Replace content (clear old nodes)
    const oldItems = this.spacer.querySelectorAll('.virtual-item, .group-header');
    oldItems.forEach(el => el.remove());
    this.spacer.appendChild(fragment);
    
    // Measure actual heights and update positions
    requestAnimationFrame(() => this.measureRendered(startIdx, endIdx));
  }
  
  measureRendered(startIdx, endIdx) {
    let needsRecalc = false;
    
    const items = this.spacer.querySelectorAll('.virtual-item');
    items.forEach(el => {
      const i = parseInt(el.dataset.index);
      const actualHeight = el.getBoundingClientRect().height;
      
      if (!this.positions[i].measured || 
          Math.abs(this.positions[i].height - actualHeight) > 1) {
        this.positions[i].height = actualHeight;
        this.positions[i].measured = true;
        needsRecalc = true;
      }
    });
    
    if (needsRecalc) {
      // Recalculate positions from first changed item
      let top = this.positions[0].top;
      for (let i = 0; i < this.positions.length; i++) {
        this.positions[i].top = top;
        top += this.positions[i].height;
      }
      this.totalHeight = top;
      this.spacer.style.height = `${this.totalHeight}px`;
    }
  }
  
  // Programmatic scroll to item
  scrollToItem(itemIndex) {
    // Find position entry for this item
    const pos = this.positions.find(p => p.itemIndex === itemIndex);
    if (pos) {
      this.container.scrollTop = pos.top;
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
- Apple FE = **Virtual scroll with dynamic heights + sticky headers**
- **Estimated → measured heights**: start with estimate, measure after render, recalculate positions
- **Binary search for visible range**: O(log n) — essential for performance with 10K+ items
- **Position cache**: array of `{ top, height, measured }` — recalculate chain on height change
- **Sticky headers**: CSS `position: sticky` for current group header — find by walking positions backward
- **requestAnimationFrame for measurement**: batch DOM reads after render to avoid forced reflows
- **Overscan**: render extra items above/below viewport — prevents blank flashing during fast scroll
- Apple FE: **60fps performance is non-negotiable** — smooth scrolling, no jank, no layout thrashing

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Very Hard | Virtual Scroll, Binary Search, DOM |
| FE Design | Hard | Music Player UI Design |
| Technical 2 | Medium-Hard | CSS, Performance |
| Behavioral | Medium | Craftsmanship |
| Manager | Medium | Career Goals |
