# LinkedIn — Senior Frontend Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | LinkedIn |
| **Role** | Senior Frontend Engineer |
| **Level** | Senior SWE |
| **YOE** | 6 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Sunnyvale, CA |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/LinkedIn-Interview-Questions-E34865.htm) |
| **Author** | Anonymous |
| **Team** | LinkedIn Feed |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (Phone + 2 Technical + System Design)

---

## Round 1: JavaScript + DOM
**Duration:** 60 minutes

### Questions Asked
1. **Implement a Tooltip System** (positioning, delay, arrow pointer, multiple triggers)
   - Show on hover with configurable delay
   - Auto-position: flip when near viewport edges
   - Support top/bottom/left/right placement
   - Arrow pointing to trigger element
   - Only one tooltip visible at a time (singleton)

### 💡 Tooltip System

```javascript
class TooltipManager {
  constructor(options = {}) {
    this.delay = options.delay || 300;
    this.activeTooltip = null;
    this.showTimeout = null;
    this.hideTimeout = null;
    
    // Create tooltip container (singleton)
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'tooltip';
    this.tooltipEl.setAttribute('role', 'tooltip');
    this.tooltipEl.hidden = true;
    this.tooltipEl.innerHTML = `
      <div class="tooltip-content"></div>
      <div class="tooltip-arrow"></div>
    `;
    document.body.appendChild(this.tooltipEl);
    
    // Global escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }
  
  register(trigger, content, preferredPlacement = 'top') {
    const tooltipId = 'tooltip-' + Math.random().toString(36).slice(2, 9);
    trigger.setAttribute('aria-describedby', tooltipId);
    this.tooltipEl.id = tooltipId;
    
    const show = () => this.show(trigger, content, preferredPlacement);
    const hide = () => this.scheduleHide();
    
    // Mouse events
    trigger.addEventListener('mouseenter', () => this.scheduleShow(show));
    trigger.addEventListener('mouseleave', hide);
    
    // Focus events (keyboard accessibility)
    trigger.addEventListener('focus', () => this.scheduleShow(show));
    trigger.addEventListener('blur', hide);
    
    // Keep tooltip visible when hovering over it
    this.tooltipEl.addEventListener('mouseenter', () => clearTimeout(this.hideTimeout));
    this.tooltipEl.addEventListener('mouseleave', hide);
  }
  
  scheduleShow(showFn) {
    clearTimeout(this.hideTimeout);
    this.showTimeout = setTimeout(showFn, this.delay);
  }
  
  scheduleHide() {
    clearTimeout(this.showTimeout);
    this.hideTimeout = setTimeout(() => this.hide(), 150); // Small delay for mouse movement
  }
  
  show(trigger, content, preferredPlacement) {
    // Dismiss any existing tooltip
    if (this.activeTooltip) this.hide();
    
    this.activeTooltip = trigger;
    this.tooltipEl.querySelector('.tooltip-content').textContent = content;
    this.tooltipEl.hidden = false;
    
    // Calculate position
    this.position(trigger, preferredPlacement);
  }
  
  position(trigger, preferred) {
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    const ARROW_SIZE = 8;
    const MARGIN = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Auto-flip: check if preferred placement fits in viewport
    const placement = this.getOptimalPlacement(
      triggerRect, tooltipRect, preferred, viewportWidth, viewportHeight, MARGIN
    );
    
    let top, left;
    
    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - ARROW_SIZE + window.scrollY;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + window.scrollX;
        break;
      case 'bottom':
        top = triggerRect.bottom + ARROW_SIZE + window.scrollY;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + window.scrollX;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2 + window.scrollY;
        left = triggerRect.left - tooltipRect.width - ARROW_SIZE + window.scrollX;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2 + window.scrollY;
        left = triggerRect.right + ARROW_SIZE + window.scrollX;
        break;
    }
    
    // Clamp to viewport
    left = Math.max(MARGIN, Math.min(left, viewportWidth - tooltipRect.width - MARGIN + window.scrollX));
    
    this.tooltipEl.style.position = 'absolute';
    this.tooltipEl.style.top = `${top}px`;
    this.tooltipEl.style.left = `${left}px`;
    
    // Update arrow direction
    this.tooltipEl.className = `tooltip tooltip-${placement}`;
  }
  
  getOptimalPlacement(triggerRect, tooltipRect, preferred, vw, vh, margin) {
    const ARROW = 8;
    const fits = {
      top: triggerRect.top - tooltipRect.height - ARROW > margin,
      bottom: triggerRect.bottom + tooltipRect.height + ARROW < vh - margin,
      left: triggerRect.left - tooltipRect.width - ARROW > margin,
      right: triggerRect.right + tooltipRect.width + ARROW < vw - margin
    };
    
    if (fits[preferred]) return preferred;
    
    // Flip to opposite
    const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    if (fits[opposite[preferred]]) return opposite[preferred];
    
    // Try remaining directions
    const fallbacks = ['top', 'bottom', 'left', 'right'];
    return fallbacks.find(d => fits[d]) || preferred; // Fallback to preferred
  }
  
  hide() {
    clearTimeout(this.showTimeout);
    clearTimeout(this.hideTimeout);
    this.tooltipEl.hidden = true;
    this.activeTooltip = null;
  }
}

/* CSS:
.tooltip {
  position: absolute;
  background: #1d2226;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  max-width: 250px;
  z-index: 10000;
  pointer-events: auto;
  animation: tooltip-fade-in 0.15s ease;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 8px solid transparent;
}

.tooltip-top .tooltip-arrow {
  bottom: -16px; left: 50%; transform: translateX(-50%);
  border-top-color: #1d2226;
}

.tooltip-bottom .tooltip-arrow {
  top: -16px; left: 50%; transform: translateX(-50%);
  border-bottom-color: #1d2226;
}

@keyframes tooltip-fade-in { from { opacity: 0; } to { opacity: 1; } }
*/
```

---

## Round 2: System Design (Frontend)
**Duration:** 60 minutes

### Questions Asked
1. **Design LinkedIn Feed Frontend Architecture**
   - Infinite scroll with variable-height posts
   - Post types: text, image, video, article, poll, job
   - Engagement: like, comment, share, save
   - Sponsored content (ads) mixed into feed
   - Feed updates (new posts notification)
   - Impression tracking (viewability metrics)

### 💡 Key Design Points

```
Feed Architecture:
┌─────────────────────────────────────────┐
│ Feed Component Architecture              │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ FeedContainer                        │ │
│ │ ├── NewPostsNotification (sticky)    │ │
│ │ ├── VirtualList                      │ │
│ │ │   ├── FeedItem (variable height)   │ │
│ │ │   │   ├── PostHeader               │ │
│ │ │   │   ├── PostContent (polymorphic)│ │
│ │ │   │   │   ├── TextPost            │ │
│ │ │   │   │   ├── ImagePost           │ │
│ │ │   │   │   ├── VideoPost (lazy)    │ │
│ │ │   │   │   ├── PollPost            │ │
│ │ │   │   │   └── SponsoredPost       │ │
│ │ │   │   ├── EngagementBar           │ │
│ │ │   │   └── CommentSection (lazy)   │ │
│ │ │   └── LoadingSkeletons            │ │
│ │ └── InfiniteScrollSentinel          │ │
│ └──────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Impression Tracking (IntersectionObserver):
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      const postId = entry.target.dataset.postId;
      
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        // ≥50% visible → start counting
        impressionTimers.set(postId, {
          start: Date.now(),
          ratio: entry.intersectionRatio
        });
      } else {
        // No longer visible → report impression if > 1 second
        const timer = impressionTimers.get(postId);
        if (timer) {
          const duration = Date.now() - timer.start;
          if (duration >= 1000) { // 1 second minimum viewability
            beaconQueue.push({
              postId, duration, ratio: timer.ratio,
              timestamp: timer.start
            });
          }
          impressionTimers.delete(postId);
        }
      }
    });
  },
  { threshold: [0, 0.5, 1.0] } // Track 0%, 50%, 100% visibility
);

// Batch beacon sending (every 5 seconds or on page unload)
const sendImpressions = () => {
  if (beaconQueue.length > 0) {
    navigator.sendBeacon('/api/impressions', JSON.stringify(beaconQueue));
    beaconQueue.length = 0;
  }
};
setInterval(sendImpressions, 5000);
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') sendImpressions();
});
```

---

## 🎯 Key Takeaways
- LinkedIn FE = **Tooltip positioning + Feed architecture + Impression tracking**
- **Tooltip auto-flip**: check viewport fit → flip to opposite → try all directions → fallback
- **Singleton tooltip**: only one visible at a time — dismiss previous before showing new
- **Tooltip accessibility**: `aria-describedby`, focus/blur events, Escape to dismiss
- **Feed impressions**: IntersectionObserver with 50% threshold, 1-second minimum viewability
- **`navigator.sendBeacon`**: fire-and-forget HTTP POST — survives page unload
- **New posts notification**: WebSocket push → "3 new posts" sticky banner → scroll to top to load
- LinkedIn interviews: **feed is their core product** — know virtualization, impressions, ad integration

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone | Medium | JS Fundamentals |
| JS + DOM | Hard | Tooltip Positioning, Auto-Flip |
| System Design | Hard | Feed Architecture, Viewability |
| Behavioral | Medium | Collaboration, Impact |
