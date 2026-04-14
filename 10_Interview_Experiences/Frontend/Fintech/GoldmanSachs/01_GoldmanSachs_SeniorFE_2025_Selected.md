# Goldman Sachs — Senior Frontend Engineer Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Vice President — Frontend |
| **Level** | VP |
| **YOE** | 8 years |
| **Date** | January 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [Glassdoor](https://www.glassdoor.co.in/Interview/Goldman-Sachs-Interview-Questions) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 3 Technical + HM)
- **Timeline:** 3 weeks
- **Format:** Hybrid (OA remote + on-site)
- **Note:** Goldman Sachs VP = 8+ YOE, expects deep expertise + leadership

---

## Round 1: HackerRank Online Assessment
**Duration:** 90 minutes

### Questions Asked
1. **Merge K Sorted Linked Lists** — min-heap approach
2. **Implement a Throttle with trailing invocation**
3. **CSS: Build a responsive dashboard layout** (Grid + media queries)

### 💡 Throttle with Trailing

```javascript
function throttle(fn, delay) {
  let lastCallTime = 0;
  let timer = null;
  let lastArgs = null;
  let lastThis = null;
  
  return function(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastCallTime);
    
    lastArgs = args;
    lastThis = this;
    
    if (remaining <= 0) {
      // Enough time passed → execute immediately
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastCallTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      // Schedule trailing call
      timer = setTimeout(() => {
        lastCallTime = Date.now();
        timer = null;
        fn.apply(lastThis, lastArgs);
      }, remaining);
    }
  };
}

// Test - scrolling at 60fps, throttle to 100ms:
// Without trailing: last scroll event might be missed
// With trailing: ensures final position is always captured
```

---

## Round 2: JavaScript + React
**Duration:** 60 minutes

### Questions Asked
1. **Build a Real-Time Stock Ticker Component** (WebSocket-connected)
2. **Render optimization: handle 5000 stock updates/second without jank**

### 💡 Interview-Ready Answer

```javascript
import { useState, useRef, useEffect, useCallback, memo } from 'react';

// 1. Efficient state management — don't setState per update
function useStockData(wsUrl) {
  const [stocks, setStocks] = useState(new Map());
  const bufferRef = useRef(new Map()); // Buffer updates
  const rafRef = useRef(null);
  
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const updates = JSON.parse(event.data); // Array of { symbol, price, change }
      
      // Buffer ALL updates — don't trigger re-render per message
      for (const update of updates) {
        bufferRef.current.set(update.symbol, {
          ...update,
          timestamp: Date.now(),
          prevPrice: bufferRef.current.get(update.symbol)?.price,
        });
      }
      
      // Batch flush at 60fps using requestAnimationFrame
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setStocks(new Map(bufferRef.current)); // Single re-render
          rafRef.current = null;
        });
      }
    };
    
    return () => {
      ws.close();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [wsUrl]);
  
  return stocks;
}

// 2. Memoized row component — only re-renders if its data changed
const StockRow = memo(function StockRow({ symbol, price, change, prevPrice }) {
  const direction = price > prevPrice ? 'up' : price < prevPrice ? 'down' : 'neutral';
  
  return (
    <tr className={`stock-row flash-${direction}`} role="row">
      <td className="symbol">{symbol}</td>
      <td className="price">${price.toFixed(2)}</td>
      <td className={`change ${change >= 0 ? 'positive' : 'negative'}`}>
        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
      </td>
      <td className="timestamp">
        {new Date().toLocaleTimeString()}
      </td>
    </tr>
  );
});

// 3. Main component with virtualization for large lists
function StockTicker({ wsUrl, symbols }) {
  const stocks = useStockData(wsUrl);
  
  // Only render visible rows (simple windowing)
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const ROW_HEIGHT = 40;
  const VISIBLE_ROWS = 20;
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  const sortedSymbols = symbols.sort();
  const startIdx = Math.floor(scrollTop / ROW_HEIGHT);
  const endIdx = Math.min(startIdx + VISIBLE_ROWS + 2, sortedSymbols.length);
  const visibleSymbols = sortedSymbols.slice(startIdx, endIdx);
  
  return (
    <div className="stock-ticker" 
         ref={containerRef}
         onScroll={handleScroll}
         style={{ height: VISIBLE_ROWS * ROW_HEIGHT, overflow: 'auto' }}
         role="grid" aria-label="Stock prices">
      <table>
        <thead>
          <tr>
            <th scope="col">Symbol</th>
            <th scope="col">Price</th>
            <th scope="col">Change</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody style={{ 
          height: sortedSymbols.length * ROW_HEIGHT,
          position: 'relative' 
        }}>
          <tr style={{ height: startIdx * ROW_HEIGHT }} aria-hidden="true"><td></td></tr>
          {visibleSymbols.map(symbol => {
            const data = stocks.get(symbol);
            if (!data) return null;
            return <StockRow key={symbol} {...data} />;
          })}
        </tbody>
      </table>
    </div>
  );
}
```

```css
/* Flash animation for price changes */
@keyframes flash-green { 0% { background: #c6efce; } 100% { background: transparent; } }
@keyframes flash-red { 0% { background: #ffc7ce; } 100% { background: transparent; } }

.stock-row.flash-up { animation: flash-green 0.5s ease-out; }
.stock-row.flash-down { animation: flash-red 0.5s ease-out; }
.positive { color: #006100; }
.negative { color: #9c0006; }
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design a Trading Dashboard** (like Bloomberg Terminal web version)
   - Real-time charts, order book, watchlist, order placement, P&L

### 💡 Interview-Ready Answer

```
Trading Dashboard Architecture:
┌──────────────────────────────────────────────────────────────┐
│  Layout: Multi-Panel Dock Layout (user-customizable)         │
│  - Like Bloomberg Terminal: panels can be resized, docked,   │
│    undocked, rearranged                                      │
│  - Framework: golden-layout or react-mosaic                  │
│  - Layout persisted per user in localStorage + server-synced │
│                                                                │
│  Panels:                                                      │
│  ┌────────────────┬──────────────────┬──────────────────┐    │
│  │  Watchlist      │  Price Chart     │  Order Book      │    │
│  │  50 symbols     │  TradingView     │  Depth ladder    │    │
│  │  Real-time      │  Canvas-based    │  Bid/Ask spread  │    │
│  ├────────────────┴──────────────────┼──────────────────┤    │
│  │  Order Entry                       │  P&L Summary     │    │
│  │  Buy/Sell → validation → confirm  │  Real-time mark  │    │
│  └───────────────────────────────────┴──────────────────┘    │
│                                                                │
│  Real-Time Data:                                              │
│  - WebSocket (not SSE — bidirectional needed for orders)     │
│  - Market data: 10,000+ updates/sec for active symbols       │
│  - Rendering: requestAnimationFrame batching (as above)      │
│  - Chart: Canvas2D / WebGL (not SVG — too slow for finance)  │
│                                                                │
│  Chart (TradingView Lightweight Charts or custom Canvas):    │
│  - Candlestick chart: 1m, 5m, 15m, 1h, 1D timeframes       │
│  - Technical indicators: SMA, EMA, RSI, MACD (computed FE)  │
│  - Crosshair with tooltip on hover                           │
│  - Drawing tools: trend lines, horizontal lines              │
│  - Canvas rendering: O(visible_candles) per frame            │
│  - Zoom: mouse wheel → change visible range                  │
│                                                                │
│  Order Placement Security:                                    │
│  - Double-submit prevention: disable button + idempotency key│
│  - Confirmation modal for orders > threshold                 │
│  - Real-time validation: price bounds, position limits       │
│  - Optimistic UI: show "Pending" immediately → confirm via WS│
│  - WebSocket response: ORDER_ACCEPTED / ORDER_REJECTED       │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 4: Behavioral (VP Level)
**Duration:** 45 minutes

### Questions Asked
1. **How do you drive engineering culture in your team?**
2. **Tell me about a production incident you managed**
3. **How do you prioritize technical debt vs features?**

---

## 🎯 Key Takeaways
- Goldman Sachs VP FE = **deep performance optimization + financial domain knowledge**
- **Stock ticker**: requestAnimationFrame batching is the key technique (not debounce)
- **5000 updates/sec** → buffer in ref, flush at screen refresh rate (16ms)
- **Canvas for charts**, not SVG — SVG DOM manipulation is too slow for real-time finance
- **WebSocket** (not SSE) for trading — bidirectional needed for order status
- **Trailing throttle** is different from leading throttle — know both + when to use which
- Goldman VP expects **production incident management** stories + culture/team building

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Linked List, Throttle, CSS Grid |
| JS + React | Hard | WebSocket, rAF Batching, Virtualization |
| System Design | Very Hard | Trading Dashboard, Canvas, Finance |
| HM | Medium-Hard | Leadership, Incident Management |
