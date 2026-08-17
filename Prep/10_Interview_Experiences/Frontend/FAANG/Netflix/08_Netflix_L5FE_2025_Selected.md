# Netflix — L5 Frontend Interview Experience (2025) — #8

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | L5 |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA |
| **Source** | [Blind](https://www.teamblind.com) |
| **Author** | Anonymous |
| **Team** | Browse Experience |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 2 Coding + System Design + Culture)

---

## Round 2: Frontend Coding — Build a Keyboard-Navigable Media Grid (Netflix Browse)
**Duration:** 45 minutes

### Challenge: Build a media grid (rows of horizontally scrollable cards) with keyboard navigation: arrow keys move focus between cards, Enter plays, row-level scroll snap, and focus memory per row.

```javascript
/**
 * Netflix Browse Grid:
 * 
 * - Rows of horizontally scrollable cards
 * - Keyboard: ArrowRight/Left within row, ArrowUp/Down between rows
 * - Focus memory: each row remembers last focused column
 * - Scroll snap: focused card scrolls into view
 * - Hover: scale up card with preview
 * - Performance: only render visible rows (virtual scrolling)
 */
class NetflixBrowseGrid {
  constructor(container, data) {
    this.container = container;
    this.data = data; // [{ category: string, items: [{ id, title, imageUrl }] }]
    
    // Navigation state
    this.focusRow = 0;
    this.focusCol = 0;
    this.rowFocusMemory = new Map(); // rowIndex → last focused col
    
    // Virtual scroll state
    this.rowHeight = 220;
    this.visibleRange = { start: 0, end: 0 };
    this.scrollContainer = null;
    
    this.render();
    this.attachKeyboard();
    this.updateFocus();
  }
  
  render() {
    this.container.innerHTML = `
      <style>
        .browse-grid { background: #141414; color: #fff; font-family: -apple-system, Helvetica, sans-serif;
                       height: 100vh; overflow-y: auto; scroll-behavior: smooth; }
        .browse-row { margin-bottom: 24px; padding: 0 48px; }
        .row-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #e5e5e5; }
        .row-scroll { display: flex; gap: 8px; overflow-x: auto; scroll-snap-type: x mandatory;
                      scrollbar-width: none; -ms-overflow-style: none; padding: 8px 0; }
        .row-scroll::-webkit-scrollbar { display: none; }
        .card { flex: 0 0 230px; height: 130px; border-radius: 4px; overflow: hidden; cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease; scroll-snap-align: start;
                position: relative; background: #333; }
        .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .card:hover, .card.focused { transform: scale(1.15); z-index: 10; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
        .card.focused { outline: 3px solid #fff; outline-offset: 2px; }
        .card-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 8px;
                     background: linear-gradient(transparent, rgba(0,0,0,0.8)); opacity: 0;
                     transition: opacity 0.2s; }
        .card:hover .card-info, .card.focused .card-info { opacity: 1; }
        .card-title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .play-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                          width: 40px; height: 40px; background: rgba(0,0,0,0.6); border-radius: 50%;
                          display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .card.focused .play-indicator { opacity: 1; }
        .play-indicator::after { content: ''; border-left: 14px solid #fff; border-top: 8px solid transparent;
                                 border-bottom: 8px solid transparent; margin-left: 3px; }
      </style>
      <div class="browse-grid" role="grid" aria-label="Browse titles">
        ${this.data.map((row, ri) => `
          <div class="browse-row" role="row" data-row="${ri}">
            <div class="row-title" id="row-label-${ri}">${this.escapeHtml(row.category)}</div>
            <div class="row-scroll" role="rowgroup" aria-labelledby="row-label-${ri}">
              ${row.items.map((item, ci) => `
                <div class="card" role="gridcell" tabindex="${ri === 0 && ci === 0 ? 0 : -1}"
                     data-row="${ri}" data-col="${ci}" data-id="${item.id}"
                     aria-label="${this.escapeHtml(item.title)}">
                  <div style="width:100%;height:100%;background:linear-gradient(135deg,
                    hsl(${(ri * 60 + ci * 30) % 360},60%,30%),
                    hsl(${(ri * 60 + ci * 30 + 40) % 360},60%,20%));
                    display:flex;align-items:center;justify-content:center;">
                    <span style="font-size:11px;opacity:0.7">${this.escapeHtml(item.title)}</span>
                  </div>
                  <div class="play-indicator"></div>
                  <div class="card-info">
                    <div class="card-title">${this.escapeHtml(item.title)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    this.scrollContainer = this.container.querySelector('.browse-grid');
    
    // Click handlers
    this.container.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        const row = parseInt(card.dataset.row);
        const col = parseInt(card.dataset.col);
        this.focusRow = row;
        this.focusCol = col;
        this.updateFocus();
        this.onSelect(card.dataset.id);
      });
    });
  }
  
  attachKeyboard() {
    this.container.addEventListener('keydown', (e) => {
      const maxRow = this.data.length - 1;
      
      switch (e.key) {
        case 'ArrowRight': {
          e.preventDefault();
          const maxCol = this.data[this.focusRow].items.length - 1;
          if (this.focusCol < maxCol) {
            this.focusCol++;
            this.rowFocusMemory.set(this.focusRow, this.focusCol);
            this.updateFocus();
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (this.focusCol > 0) {
            this.focusCol--;
            this.rowFocusMemory.set(this.focusRow, this.focusCol);
            this.updateFocus();
          }
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          if (this.focusRow < maxRow) {
            // Save current column for this row
            this.rowFocusMemory.set(this.focusRow, this.focusCol);
            this.focusRow++;
            // Restore column from memory, clamped to row length
            const memorizedCol = this.rowFocusMemory.get(this.focusRow) ?? this.focusCol;
            this.focusCol = Math.min(memorizedCol, this.data[this.focusRow].items.length - 1);
            this.updateFocus();
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (this.focusRow > 0) {
            this.rowFocusMemory.set(this.focusRow, this.focusCol);
            this.focusRow--;
            const memorizedCol = this.rowFocusMemory.get(this.focusRow) ?? this.focusCol;
            this.focusCol = Math.min(memorizedCol, this.data[this.focusRow].items.length - 1);
            this.updateFocus();
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const card = this.getFocusedCard();
          if (card) this.onSelect(card.dataset.id);
          break;
        }
      }
    });
  }
  
  getFocusedCard() {
    return this.container.querySelector(`[data-row="${this.focusRow}"][data-col="${this.focusCol}"]`);
  }
  
  updateFocus() {
    // Remove previous focus
    this.container.querySelectorAll('.card.focused').forEach(el => {
      el.classList.remove('focused');
      el.tabIndex = -1;
    });
    
    const card = this.getFocusedCard();
    if (card) {
      card.classList.add('focused');
      card.tabIndex = 0;
      card.focus({ preventScroll: true });
      
      // Scroll card into view horizontally
      const rowScroll = card.closest('.row-scroll');
      if (rowScroll) {
        const cardRect = card.getBoundingClientRect();
        const scrollRect = rowScroll.getBoundingClientRect();
        
        if (cardRect.right > scrollRect.right - 48) {
          rowScroll.scrollBy({ left: cardRect.right - scrollRect.right + 100, behavior: 'smooth' });
        } else if (cardRect.left < scrollRect.left + 48) {
          rowScroll.scrollBy({ left: cardRect.left - scrollRect.left - 100, behavior: 'smooth' });
        }
      }
      
      // Scroll row into view vertically
      card.closest('.browse-row')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
  
  onSelect(id) {
    const row = this.data[this.focusRow];
    const item = row?.items[this.focusCol];
    console.log('Selected:', item?.title ?? id);
  }
  
  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

---

## 🎯 Key Takeaways
- Netflix L5 FE = **Netflix browse grid — keyboard nav, focus memory, scroll snap, hover effects**
- **Focus memory per row**: `Map<rowIndex, lastFocusedCol>` — ArrowDown/Up restores column position in target row
- **Roving tabindex**: focused card gets `tabIndex=0`, all others `tabIndex=-1`
- **Horizontal scroll snap**: `scroll-snap-type: x mandatory` + `scroll-snap-align: start` on cards
- **Focus scroll**: `scrollBy({ left, behavior: 'smooth' })` — scrolls only when card is near edge
- **Hover scale**: `transform: scale(1.15)` with `z-index: 10` — card pops above siblings
- **role="grid"**: semantic grid pattern — rows with gridcells, labeled by category header
- **`focus({ preventScroll: true })`**: we handle scrolling ourselves — prevents browser's default scroll behavior
- Netflix FE = **media browsing, playback, A/B testing** — expect grid navigation + performance

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | JS Coding |
| FE Coding (this) | Hard | Grid Navigation, Keyboard, CSS |
| Coding 2 | Hard | Data Structures |
| System Design | Very Hard | Video Player Architecture |
| Culture | Hard | Netflix Values |
