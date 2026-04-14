# Apple — ICT4 Frontend Interview Experience (2025) — #7

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Apple |
| **Role** | Senior Frontend Engineer |
| **Level** | ICT4 |
| **YOE** | 8 years |
| **Date** | March 2025 |
| **Result** | ❌ Rejected |
| **Location** | Cupertino, CA |
| **Source** | [Blind](https://www.teamblind.com) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 4 Onsite)

---

## Round 3: Frontend Coding — Build a Gesture Recognizer for Touch Events
**Duration:** 45 minutes

### Challenge: Build a gesture recognizer that detects: tap, double-tap, long press, swipe (4 directions), pinch, and rotation — using raw touch events.

```javascript
/**
 * Gesture Recognizer:
 * 
 * Detects from touchstart/touchmove/touchend:
 * - tap: touch < 200ms, movement < 10px
 * - doubleTap: two taps within 300ms
 * - longPress: hold > 500ms without movement > 10px
 * - swipe: movement > 50px in < 300ms, dominant axis > 3× minor axis
 * - pinch: two fingers, distance change
 * - rotate: two fingers, angle change
 */
class GestureRecognizer {
  constructor(element) {
    this.element = element;
    this.listeners = {};
    
    // Tracking state
    this.startTime = 0;
    this.startTouches = [];
    this.lastTapTime = 0;
    this.longPressTimer = null;
    this.isDragging = false;
    
    // Thresholds
    this.TAP_MAX_DURATION = 200;   // ms
    this.TAP_MAX_DISTANCE = 10;    // px
    this.DOUBLE_TAP_MAX_GAP = 300; // ms
    this.LONG_PRESS_DURATION = 500; // ms
    this.SWIPE_MIN_DISTANCE = 50;   // px
    this.SWIPE_MAX_DURATION = 300;  // ms
    this.SWIPE_RATIO = 3;           // dominant axis must be 3× minor axis
    
    this.attachTouchListeners();
  }
  
  on(gesture, callback) {
    if (!this.listeners[gesture]) this.listeners[gesture] = [];
    this.listeners[gesture].push(callback);
    return this; // chainable
  }
  
  emit(gesture, data) {
    for (const cb of this.listeners[gesture] || []) cb(data);
  }
  
  getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getAngle(t1, t2) {
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
  }
  
  getMidpoint(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }
  
  attachTouchListeners() {
    let initialPinchDist = 0;
    let initialRotation = 0;
    let lastScale = 1;
    let lastRotation = 0;
    
    this.element.addEventListener('touchstart', (e) => {
      this.startTime = Date.now();
      this.startTouches = Array.from(e.touches).map(t => ({
        id: t.identifier,
        clientX: t.clientX,
        clientY: t.clientY
      }));
      this.isDragging = false;
      
      // Start long press timer (single finger only)
      if (e.touches.length === 1) {
        this.longPressTimer = setTimeout(() => {
          if (!this.isDragging) {
            this.emit('longPress', {
              x: this.startTouches[0].clientX,
              y: this.startTouches[0].clientY
            });
          }
        }, this.LONG_PRESS_DURATION);
      }
      
      // Two-finger gestures: record initial distance and angle
      if (e.touches.length === 2) {
        clearTimeout(this.longPressTimer);
        initialPinchDist = this.getDistance(e.touches[0], e.touches[1]);
        initialRotation = this.getAngle(e.touches[0], e.touches[1]);
        lastScale = 1;
        lastRotation = 0;
      }
    }, { passive: true });
    
    this.element.addEventListener('touchmove', (e) => {
      // Single finger: check if dragging threshold exceeded
      if (e.touches.length === 1 && this.startTouches.length >= 1) {
        const dx = e.touches[0].clientX - this.startTouches[0].clientX;
        const dy = e.touches[0].clientY - this.startTouches[0].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > this.TAP_MAX_DISTANCE) {
          this.isDragging = true;
          clearTimeout(this.longPressTimer);
        }
      }
      
      // Two-finger: pinch and rotation
      if (e.touches.length === 2 && initialPinchDist > 0) {
        const currentDist = this.getDistance(e.touches[0], e.touches[1]);
        const currentAngle = this.getAngle(e.touches[0], e.touches[1]);
        const center = this.getMidpoint(e.touches[0], e.touches[1]);
        
        const scale = currentDist / initialPinchDist;
        const rotation = currentAngle - initialRotation;
        
        // Emit pinch if scale changed significantly
        if (Math.abs(scale - lastScale) > 0.01) {
          this.emit('pinch', {
            scale,
            center,
            direction: scale > lastScale ? 'out' : 'in'
          });
          lastScale = scale;
        }
        
        // Emit rotation if angle changed significantly (> 2 degrees)
        if (Math.abs(rotation - lastRotation) > 2) {
          this.emit('rotate', {
            angle: rotation,
            center,
            direction: rotation > lastRotation ? 'clockwise' : 'counterclockwise'
          });
          lastRotation = rotation;
        }
      }
    }, { passive: true });
    
    this.element.addEventListener('touchend', (e) => {
      clearTimeout(this.longPressTimer);
      
      if (e.touches.length > 0) return; // Still fingers on screen
      
      const duration = Date.now() - this.startTime;
      const endTouch = e.changedTouches[0];
      
      // Single finger gestures
      if (this.startTouches.length === 1) {
        const dx = endTouch.clientX - this.startTouches[0].clientX;
        const dy = endTouch.clientY - this.startTouches[0].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Tap detection
        if (dist < this.TAP_MAX_DISTANCE && duration < this.TAP_MAX_DURATION) {
          const now = Date.now();
          
          if (now - this.lastTapTime < this.DOUBLE_TAP_MAX_GAP) {
            this.emit('doubleTap', { x: endTouch.clientX, y: endTouch.clientY });
            this.lastTapTime = 0; // Reset to prevent triple-tap = double + single
          } else {
            this.lastTapTime = now;
            // Delay tap emission to check for double-tap
            setTimeout(() => {
              if (this.lastTapTime === now) {
                this.emit('tap', { x: endTouch.clientX, y: endTouch.clientY });
              }
            }, this.DOUBLE_TAP_MAX_GAP);
          }
          return;
        }
        
        // Swipe detection
        if (dist > this.SWIPE_MIN_DISTANCE && duration < this.SWIPE_MAX_DURATION) {
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          
          let direction;
          if (absDx > absDy * this.SWIPE_RATIO) {
            direction = dx > 0 ? 'right' : 'left';
          } else if (absDy > absDx * this.SWIPE_RATIO) {
            direction = dy > 0 ? 'down' : 'up';
          } else {
            return; // Diagonal — ambiguous
          }
          
          this.emit('swipe', {
            direction,
            distance: dist,
            velocity: dist / duration, // px/ms
            startX: this.startTouches[0].clientX,
            startY: this.startTouches[0].clientY,
            endX: endTouch.clientX,
            endY: endTouch.clientY
          });
        }
      }
      
      // Reset
      initialPinchDist = 0;
    }, { passive: true });
  }
  
  destroy() {
    clearTimeout(this.longPressTimer);
    this.listeners = {};
  }
}

// Usage:
// const gestures = new GestureRecognizer(document.getElementById('canvas'));
// gestures
//   .on('tap', ({ x, y }) => console.log('Tap at', x, y))
//   .on('doubleTap', ({ x, y }) => console.log('Double tap at', x, y))
//   .on('longPress', ({ x, y }) => console.log('Long press at', x, y))
//   .on('swipe', ({ direction, velocity }) => console.log('Swipe', direction, velocity))
//   .on('pinch', ({ scale, direction }) => console.log('Pinch', direction, scale))
//   .on('rotate', ({ angle }) => console.log('Rotate', angle));
```

---

## 🎯 Key Takeaways
- Apple ICT4 FE = **Touch gesture recognizer — tap/swipe/pinch/rotate from raw touch events**
- **Tap vs drag disambiguation**: movement < 10px + duration < 200ms = tap
- **Double-tap**: delay single-tap emission by 300ms — if second tap arrives, emit doubleTap instead
- **Long press**: `setTimeout(500ms)` on touchstart — cancel if movement exceeds threshold
- **Swipe**: dominant axis must be 3× minor axis — prevents diagonal false positives
- **Pinch**: track distance between two fingers — scale = currentDist / initialDist
- **Rotation**: `atan2` angle between two fingers — track delta from initial angle
- **`{ passive: true }`**: tells browser we won't call `preventDefault()` — better scroll performance
- **Rejection reason**: system design round on Apple Maps tile rendering — didn't discuss vector tile optimization
- Apple FE = **precision touch interactions** — gesture recognition is core to iOS/macOS web experiences

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Hard | JS Coding |
| FE Coding | Hard | DOM Manipulation |
| FE Coding 2 (this) | Very Hard | Touch Gestures |
| System Design | Very Hard | Apple Maps |
| Behavioral | Medium | Apple Culture |
