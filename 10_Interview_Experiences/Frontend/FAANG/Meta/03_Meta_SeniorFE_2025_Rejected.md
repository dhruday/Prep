# Meta — E5 Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Meta |
| **Role** | Frontend Engineer (E5) |
| **Level** | Senior |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Menlo Park, CA |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + FE Technical + System Design + Behavioral)
- **Rejection Reason:** FE System Design — didn't address offline capability for Instagram

---

## Round 1: Coding 1
**Duration:** 40 minutes

### Questions Asked
1. **Implement a CSS selector engine (simplified)**
   - Match: `div`, `.class`, `#id`, `div.class#id`, descendant combinator `div .class`

### 💡 CSS Selector Engine

```javascript
function querySelector(root, selector) {
  const parts = parseSelectorChain(selector); // "div .active" → ["div", ".active"]
  
  if (parts.length === 1) {
    return findMatching(root, parts[0]);
  }
  
  // Descendant combinator: find first match, then search descendants for next part
  return findDescendant(root, parts, 0);
}

function findDescendant(node, parts, partIndex) {
  if (partIndex >= parts.length) return node;
  
  const matches = findAllMatching(node, parts[partIndex]);
  
  for (const match of matches) {
    if (partIndex === parts.length - 1) return match;
    
    const result = findDescendant(match, parts, partIndex + 1);
    if (result) return result;
  }
  
  return null;
}

function findMatching(node, selectorPart) {
  // DFS to find first element matching selector
  const stack = [...(node.children || [])];
  
  while (stack.length > 0) {
    const child = stack.shift(); // BFS for document order
    if (matchesSingle(child, selectorPart)) return child;
    if (child.children) stack.push(...child.children);
  }
  
  return null;
}

function findAllMatching(node, selectorPart) {
  const results = [];
  const queue = [...(node.children || [])];
  
  while (queue.length > 0) {
    const child = queue.shift();
    if (matchesSingle(child, selectorPart)) results.push(child);
    if (child.children) queue.push(...child.children);
  }
  
  return results;
}

function matchesSingle(element, selector) {
  // Parse: "div.active#main" → tag=div, classes=[active], id=main
  let remaining = selector;
  let tag = null, id = null, classes = [];
  
  // Extract ID
  const idMatch = remaining.match(/#([\w-]+)/);
  if (idMatch) { id = idMatch[1]; remaining = remaining.replace(idMatch[0], ''); }
  
  // Extract classes
  for (const match of remaining.matchAll(/\.([\w-]+)/g)) {
    classes.push(match[1]);
    remaining = remaining.replace(match[0], '');
  }
  
  // Remaining is tag
  remaining = remaining.trim();
  if (remaining) tag = remaining;
  
  // Match
  if (tag && element.tagName?.toLowerCase() !== tag.toLowerCase()) return false;
  if (id && element.id !== id) return false;
  if (classes.length > 0) {
    const elClasses = new Set((element.className || '').split(/\s+/));
    if (!classes.every(c => elClasses.has(c))) return false;
  }
  
  return true;
}

function parseSelectorChain(selector) {
  // Split by spaces (descendant combinator), but not spaces within compound selectors
  return selector.trim().split(/\s+/);
}
```

---

## Round 2: Frontend Technical
**Duration:** 45 minutes

### Questions Asked
1. **Build a Like/Reaction system like Facebook's**
   - Long-press to open reactions, hover to preview, optimistic update, undo

### 💡 Reaction System

```javascript
function ReactionButton({ postId, currentReaction, onReact }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState(null);
  const [optimisticReaction, setOptimisticReaction] = useState(currentReaction);
  const longPressTimerRef = useRef(null);
  const containerRef = useRef(null);
  
  const reactions = [
    { type: 'like', emoji: '👍', label: 'Like', color: '#2078F4' },
    { type: 'love', emoji: '❤️', label: 'Love', color: '#F33E58' },
    { type: 'haha', emoji: '😂', label: 'Haha', color: '#F7B125' },
    { type: 'wow', emoji: '😮', label: 'Wow', color: '#F7B125' },
    { type: 'sad', emoji: '😢', label: 'Sad', color: '#F7B125' },
    { type: 'angry', emoji: '😡', label: 'Angry', color: '#E9710F' },
  ];
  
  // Long press: open reaction picker (300ms)
  const handlePointerDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 300);
  };
  
  const handlePointerUp = () => {
    clearTimeout(longPressTimerRef.current);
    
    if (!isOpen) {
      // Quick tap: toggle like
      const newReaction = optimisticReaction === 'like' ? null : 'like';
      handleReact(newReaction);
    }
  };
  
  const handleReact = async (reactionType) => {
    const previousReaction = optimisticReaction;
    
    // Optimistic update
    setOptimisticReaction(reactionType);
    setIsOpen(false);
    
    try {
      await onReact(postId, reactionType);
    } catch (error) {
      // Rollback on failure
      setOptimisticReaction(previousReaction);
    }
  };
  
  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleOutside = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [isOpen]);
  
  const activeReaction = reactions.find(r => r.type === optimisticReaction);
  
  return (
    <div ref={containerRef} className="reaction-container">
      <button
        className={`reaction-btn ${optimisticReaction ? 'active' : ''}`}
        style={{ color: activeReaction?.color }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => clearTimeout(longPressTimerRef.current)}
        aria-label={activeReaction ? `You reacted ${activeReaction.label}. Long press to change.` : 'React to this post'}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {activeReaction ? activeReaction.emoji : '👍'} {activeReaction?.label || 'Like'}
      </button>
      
      {/* Reaction Picker Popup */}
      {isOpen && (
        <div className="reaction-picker" role="radiogroup" aria-label="Choose a reaction">
          {reactions.map((reaction, idx) => (
            <button
              key={reaction.type}
              className={`reaction-option ${hoveredReaction === reaction.type ? 'hovered' : ''}`}
              onClick={() => handleReact(reaction.type)}
              onMouseEnter={() => setHoveredReaction(reaction.type)}
              onMouseLeave={() => setHoveredReaction(null)}
              role="radio"
              aria-checked={optimisticReaction === reaction.type}
              aria-label={reaction.label}
              style={{
                animationDelay: `${idx * 50}ms`,
                transform: hoveredReaction === reaction.type ? 'scale(1.4) translateY(-8px)' : 'scale(1)',
              }}
            >
              <span className="reaction-emoji">{reaction.emoji}</span>
              {hoveredReaction === reaction.type && (
                <span className="reaction-tooltip">{reaction.label}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Round 3: FE System Design (Where I Failed)
**Duration:** 45 minutes

### Questions Asked
1. **Design Instagram's Explore Tab (Frontend Architecture)**

### What I should have covered:
```
Instagram Explore FE Architecture:
- Grid layout: masonry or fixed aspect-ratio grid
- Infinite scroll with intersection observer
- Image lazy loading: blur-up with tiny inline base64 placeholder
- Tap to expand: modal with swipe-to-close (gesture handler)
- Content types: photos, videos (HLS), Reels, carousels
- Video auto-play: IntersectionObserver with threshold 0.7
  Only one video plays at a time (singleton pattern)
- OFFLINE CAPABILITY (what I missed):
  Service Worker + Cache API for previously viewed content
  IndexedDB for explore feed state
  "You are offline" banner with cached content
  Background sync: queue interactions (likes, saves)
- Personalization: ML-ranked content, track scroll depth + dwell time
- Performance: skeleton screens, image CDN with responsive srcset,
  <2s initial load, Core Web Vitals (LCP < 2.5s, CLS < 0.1)
```

---

## 🎯 Key Takeaways
- Meta FE E5 = **CSS selector implementation + social UI patterns + offline-first**
- **CSS selector engine** — compound selectors + descendant combinator + DFS matching
- **Reaction system**: long-press to open, quick-tap for like, optimistic update with rollback
- **Optimistic UI**: update immediately, rollback on API failure — Meta's core pattern
- I failed on **offline capability** for Instagram — Service Worker + IndexedDB is expected at E5
- Meta FE values: **social interactions UX, optimistic updates, animation polish**
- `pointerDown/pointerUp` instead of mouse/touch — unified pointer events

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Hard | CSS Selector Engine, DOM Traversal |
| Frontend | Medium-Hard | Reaction UI, Optimistic Update, Animations |
| System Design | Very Hard | Instagram Explore, Offline-First, Performance |
| Behavioral | Medium | Meta Values |
