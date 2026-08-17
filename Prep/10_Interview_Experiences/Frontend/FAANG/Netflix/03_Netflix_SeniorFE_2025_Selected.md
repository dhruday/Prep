# Netflix — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Netflix |
| **Role** | Senior UI Engineer |
| **Level** | L5 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Los Gatos, CA (Remote) |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Browse (Home Feed) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)
- **Timeline:** 3 weeks including team match
- **Netflix offers top of market comp**: no negotiation needed

---

## Round 1: JavaScript & Performance
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Carousel with Infinite Scroll, Keyboard Nav, and Prefetching**
   - Like Netflix's horizontal title rows
   - Show 6 items, peek the 7th
   - Arrow keys + swipe on mobile
   - Prefetch next page of items when approaching end

### 💡 Netflix-Style Row Carousel

```jsx
function TitleRow({ rowTitle, fetchTitles }) {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef(null);
  const VISIBLE_COUNT = 6;
  const ITEMS_PER_PAGE = 20;
  
  // Initial fetch
  useEffect(() => {
    fetchTitles(1, ITEMS_PER_PAGE).then(data => {
      setItems(data.titles);
      setHasMore(data.hasMore);
    });
  }, [fetchTitles]);
  
  // Prefetch next page when approaching end
  useEffect(() => {
    const remainingItems = items.length - offset - VISIBLE_COUNT;
    if (remainingItems <= VISIBLE_COUNT && hasMore && !isAnimating) {
      fetchTitles(page + 1, ITEMS_PER_PAGE).then(data => {
        setItems(prev => [...prev, ...data.titles]);
        setHasMore(data.hasMore);
        setPage(prev => prev + 1);
      });
    }
  }, [offset, items.length, hasMore, page]);
  
  const canScrollLeft = offset > 0;
  const canScrollRight = offset + VISIBLE_COUNT < items.length;
  
  const scroll = (direction) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const step = Math.min(VISIBLE_COUNT, direction === 'right' ? items.length - offset - VISIBLE_COUNT : offset);
    
    if (direction === 'right' && canScrollRight) {
      setOffset(prev => prev + step);
    } else if (direction === 'left' && canScrollLeft) {
      setOffset(prev => Math.max(0, prev - step));
    }
    
    setTimeout(() => setIsAnimating(false), 750); // Match CSS transition
  };
  
  // Keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (focusedIndex < items.length - 1) {
          setFocusedIndex(prev => prev + 1);
          if (focusedIndex >= offset + VISIBLE_COUNT - 1) scroll('right');
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (focusedIndex > 0) {
          setFocusedIndex(prev => prev - 1);
          if (focusedIndex <= offset) scroll('left');
        }
        break;
      case 'Enter':
        // Navigate to title detail
        window.location.href = `/title/${items[focusedIndex].id}`;
        break;
    }
  };
  
  // Prefetch images for upcoming items
  useEffect(() => {
    const upcoming = items.slice(offset + VISIBLE_COUNT, offset + VISIBLE_COUNT * 2);
    upcoming.forEach(item => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = item.thumbnailUrl;
      link.as = 'image';
      document.head.appendChild(link);
    });
  }, [offset, items]);
  
  return (
    <section className="title-row" aria-label={rowTitle}>
      <h2 className="row-title">{rowTitle}</h2>
      
      <div className="row-container" ref={containerRef} onKeyDown={handleKeyDown}>
        {/* Left Arrow */}
        {canScrollLeft && (
          <button className="scroll-btn scroll-left" onClick={() => scroll('left')}
                  aria-label="Scroll left" tabIndex={-1}>
            ‹
          </button>
        )}
        
        {/* Items Track */}
        <div className="items-track"
             style={{ transform: `translateX(-${offset * (100 / VISIBLE_COUNT)}%)` }}
             role="list">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`title-card ${index === focusedIndex ? 'focused' : ''}`}
              style={{ flex: `0 0 ${100 / VISIBLE_COUNT}%` }}
              role="listitem"
              tabIndex={index === focusedIndex ? 0 : -1}
              onFocus={() => setFocusedIndex(index)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <div className="card-media">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  loading={index < offset + VISIBLE_COUNT * 2 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                
                {/* Hover expansion with metadata */}
                <div className="card-hover-info">
                  <div className="hover-controls">
                    <button aria-label="Play">▶</button>
                    <button aria-label="Add to My List">+</button>
                    <button aria-label="Like">👍</button>
                    <button aria-label="More info">ⓘ</button>
                  </div>
                  <div className="hover-meta">
                    <span className="match">{item.matchPercent}% Match</span>
                    <span className="rating">{item.maturityRating}</span>
                    <span className="duration">{item.duration}</span>
                  </div>
                  <div className="genres">{item.genres.join(' • ')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Right Arrow */}
        {canScrollRight && (
          <button className="scroll-btn scroll-right" onClick={() => scroll('right')}
                  aria-label="Scroll right" tabIndex={-1}>
            ›
          </button>
        )}
      </div>
    </section>
  );
}
```

```css
.title-row {
  position: relative;
  padding: 0 60px;
  margin-bottom: 40px;
}

.items-track {
  display: flex;
  transition: transform 0.75s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.title-card {
  padding: 0 4px;
  transition: transform 0.3s ease, z-index 0s 0.3s;
}

.title-card.focused,
.title-card:hover {
  transform: scale(1.3);
  z-index: 10;
  transition: transform 0.3s ease 0.3s, z-index 0s; /* Delay scale up */
}

/* First visible card expands right, last expands left */
.title-card:first-child:hover { transform-origin: left center; }
.title-card:last-child:hover { transform-origin: right center; }

.card-hover-info {
  opacity: 0;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, #141414);
  padding: 12px;
  transition: opacity 0.3s ease 0.3s;
}

.title-card.focused .card-hover-info,
.title-card:hover .card-hover-info {
  opacity: 1;
}

.scroll-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 60px;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 40px;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.title-row:hover .scroll-btn { opacity: 1; }
.scroll-left { left: 0; }
.scroll-right { right: 0; }
```

---

## 🎯 Key Takeaways
- Netflix FE = **performance-obsessed** — carousel is the core UI pattern
- **Horizontal scroll**: CSS `translateX` with smooth cubic-bezier transition (0.75s)
- **Hover expansion**: scale(1.3) with delayed transition (0.3s delay) — prevents flicker on quick mouse movement
- **transform-origin**: first item expands right, last expands left — prevents overflow
- **Prefetch**: `<link rel="prefetch" as="image">` for upcoming carousel items
- **Infinite scroll horizontally**: fetch next page when approaching end
- **Roving tabindex** for keyboard navigation — Arrow keys move focus
- Netflix values: **freedom & responsibility**, judgment, impact — behavioral questions are about these
- Know **Netflix's AB testing** culture: every UI change is tested

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| JavaScript | Hard | Carousel, Prefetch, Performance |
| System Design | Very Hard | Home Feed, Personalization |
| Behavioral | Hard | Netflix Culture, Candor, Judgment |
| Team Match | Medium | Team Fit, Project Discussion |
