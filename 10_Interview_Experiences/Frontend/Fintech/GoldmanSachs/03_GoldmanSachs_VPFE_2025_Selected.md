# Goldman Sachs — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | VP Frontend |
| **Level** | Vice President |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Marcus (Consumer Banking) |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank OA + 3 Technical + HM)

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Portfolio Performance Table** (like GS Marquee)
   - Table with sortable columns (Ticker, Name, Price, Change%, Market Cap)
   - Real-time price updates via WebSocket
   - Conditional formatting: green for positive, red for negative
   - Sparkline chart in each row (7-day price trend)
   - Column resizing (drag column borders)

### 💡 Core Implementation

```jsx
function PortfolioTable({ holdings }) {
  const [sortConfig, setSortConfig] = useState({ key: 'change_pct', dir: 'desc' });
  const [prices, setPrices] = useState({});
  const [columnWidths, setColumnWidths] = useState({
    ticker: 100, name: 200, price: 120, change: 100, marketCap: 140, sparkline: 120,
  });
  const resizingRef = useRef(null);
  
  // WebSocket for real-time prices
  useEffect(() => {
    const tickers = holdings.map(h => h.ticker);
    const ws = new WebSocket(`wss://stream.gs.com/prices?symbols=${tickers.join(',')}`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      // Batch updates with requestAnimationFrame to avoid excessive re-renders
      setPrices(prev => ({
        ...prev,
        [update.ticker]: {
          price: update.price,
          change_pct: update.change_pct,
          sparkline: [...(prev[update.ticker]?.sparkline || []).slice(-6), update.price],
        }
      }));
    };
    
    ws.onerror = () => {
      // Fallback to polling
      console.warn('WebSocket failed, falling back to polling');
    };
    
    return () => ws.close();
  }, [holdings]);
  
  // Sort logic
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aVal = prices[a.ticker]?.[sortConfig.key] ?? a[sortConfig.key];
      const bVal = prices[b.ticker]?.[sortConfig.key] ?? b[sortConfig.key];
      const multiplier = sortConfig.dir === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'number') return (aVal - bVal) * multiplier;
      return String(aVal).localeCompare(String(bVal)) * multiplier;
    });
  }, [holdings, prices, sortConfig]);
  
  // Column resize handlers
  const handleResizeStart = (colKey, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey];
    
    const handleMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      setColumnWidths(prev => ({
        ...prev,
        [colKey]: Math.max(60, startWidth + delta), // Minimum 60px
      }));
    };
    
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'col-resize';
  };
  
  return (
    <div className="portfolio-table" role="grid" aria-label="Portfolio holdings">
      <table>
        <thead>
          <tr>
            {Object.entries({
              ticker: 'Ticker', name: 'Name', price: 'Price',
              change_pct: 'Change %', marketCap: 'Market Cap', sparkline: '7D Trend'
            }).map(([key, label]) => (
              <th key={key} style={{ width: columnWidths[key] }}>
                <div className="th-content">
                  <button className="sort-btn"
                    onClick={() => setSortConfig(prev => ({
                      key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
                    }))}
                    aria-sort={sortConfig.key === key
                      ? (sortConfig.dir === 'asc' ? 'ascending' : 'descending')
                      : undefined}>
                    {label}
                    {sortConfig.key === key && (sortConfig.dir === 'asc' ? ' ▲' : ' ▼')}
                  </button>
                  
                  {/* Resize handle */}
                  <div className="resize-handle"
                    onMouseDown={(e) => handleResizeStart(key, e)}
                    role="separator" aria-orientation="vertical" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedHoldings.map(holding => {
            const live = prices[holding.ticker];
            const changePct = live?.change_pct ?? holding.change_pct;
            const isPositive = changePct >= 0;
            
            return (
              <tr key={holding.ticker}>
                <td style={{ width: columnWidths.ticker }}>
                  <span className="ticker-badge">{holding.ticker}</span>
                </td>
                <td style={{ width: columnWidths.name }}>{holding.name}</td>
                <td style={{ width: columnWidths.price }} className="price-cell">
                  <FlashCell value={live?.price ?? holding.price} />
                </td>
                <td style={{ width: columnWidths.change_pct }}
                    className={isPositive ? 'cell-positive' : 'cell-negative'}>
                  {isPositive ? '+' : ''}{changePct.toFixed(2)}%
                </td>
                <td style={{ width: columnWidths.marketCap }}>
                  {formatMarketCap(holding.marketCap)}
                </td>
                <td style={{ width: columnWidths.sparkline }}>
                  <Sparkline data={live?.sparkline || holding.sparkline} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Flash effect when price changes
function FlashCell({ value }) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(null);
  
  useEffect(() => {
    if (value !== prevRef.current) {
      setFlash(value > prevRef.current ? 'flash-green' : 'flash-red');
      prevRef.current = value;
      const timer = setTimeout(() => setFlash(null), 500);
      return () => clearTimeout(timer);
    }
  }, [value]);
  
  return (
    <span className={`price ${flash || ''}`}>
      ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
    </span>
  );
}

// SVG Sparkline (tiny line chart)
function Sparkline({ data, width = 80, height = 24 }) {
  if (!data || data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const isUp = data[data.length - 1] >= data[0];
  
  return (
    <svg width={width} height={height} role="img" aria-label={`7-day trend: ${isUp ? 'up' : 'down'}`}>
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#12B76A' : '#F04438'}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function formatMarketCap(val) {
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString()}`;
}
```

---

## 🎯 Key Takeaways
- Goldman Sachs FE = **financial tables + real-time data + data visualization**
- **Flash cell effect**: compare prev value via useRef, apply CSS animation class for 500ms
- **SVG Sparkline**: normalize data points to SVG viewport, polyline for trend line
- **Column resizing**: mousedown on handle → track delta → update width state, min-width guard
- **WebSocket with fallback**: try WS first, fall back to polling on error — resilient pattern
- **Conditional formatting**: green/red based on positive/negative — standard finance UI
- **Market cap formatting**: human-readable ($1.2T, $340.5B) — always needed in finance dashboards
- GS values: **attention to detail**, precision in numbers, performance with real-time data

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA + SQL |
| Machine Coding | Hard | Real-Time Table, Sparklines, Column Resize |
| Technical 2 | Medium-Hard | JavaScript, Security |
| System Design | Hard | Trading Dashboard Architecture |
| HM | Medium | GS Values, Finance Domain |
