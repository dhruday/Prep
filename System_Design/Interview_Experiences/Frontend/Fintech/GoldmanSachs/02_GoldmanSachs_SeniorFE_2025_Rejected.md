# GoldmanSachs — Senior Frontend Engineer Interview Experience (2025) — #2

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Goldman Sachs |
| **Role** | Associate (Frontend) |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | January 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (HackerRank + 2 Technical + System Design + HM)
- **Rejection Reason:** HM round — couldn't demonstrate leadership in cross-team initiatives

---

## Round 1: HackerRank
**Duration:** 90 minutes

### Questions Asked
1. **Spiral Matrix Traversal** (LeetCode 54)
2. **Implement a debounced search with caching**

### 💡 Spiral Matrix

```javascript
function spiralOrder(matrix) {
  const result = [];
  if (!matrix.length) return result;
  
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;
  
  while (top <= bottom && left <= right) {
    // →  Traverse right along top row
    for (let col = left; col <= right; col++) result.push(matrix[top][col]);
    top++;
    
    // ↓  Traverse down along right column
    for (let row = top; row <= bottom; row++) result.push(matrix[row][right]);
    right--;
    
    // ←  Traverse left along bottom row
    if (top <= bottom) {
      for (let col = right; col >= left; col--) result.push(matrix[bottom][col]);
      bottom--;
    }
    
    // ↑  Traverse up along left column
    if (left <= right) {
      for (let row = bottom; row >= top; row--) result.push(matrix[row][left]);
      left++;
    }
  }
  
  return result;
}
```

---

## Round 2: Technical 1
**Duration:** 60 minutes

### Questions Asked
1. **Build a Real-Time Stock Chart with WebSocket**
   - Candlestick chart, moving averages, volume bars, zoom/pan

### 💡 Interview-Ready Answer

```javascript
function StockChart({ symbol }) {
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState('1D');
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const animFrameRef = useRef(null);
  
  // WebSocket connection with reconnection
  useEffect(() => {
    let reconnectTimeout;
    let reconnectDelay = 1000;
    
    function connect() {
      const ws = new WebSocket(`wss://stream.example.com/stocks/${symbol}`);
      wsRef.current = ws;
      
      ws.onmessage = (event) => {
        const tick = JSON.parse(event.data);
        
        setCandles(prev => {
          const last = prev[prev.length - 1];
          
          if (last && isSameCandle(last.timestamp, tick.timestamp, timeframe)) {
            // Update current candle
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              high: Math.max(last.high, tick.price),
              low: Math.min(last.low, tick.price),
              close: tick.price,
              volume: last.volume + tick.volume,
            };
            return updated;
          }
          
          // New candle
          return [...prev, {
            timestamp: tick.timestamp,
            open: tick.price,
            high: tick.price,
            low: tick.price,
            close: tick.price,
            volume: tick.volume,
          }];
        });
      };
      
      ws.onclose = () => {
        reconnectTimeout = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connect();
        }, reconnectDelay);
      };
      
      ws.onopen = () => { reconnectDelay = 1000; };
    }
    
    connect();
    
    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [symbol, timeframe]);
  
  // Canvas rendering with requestAnimationFrame batching
  useEffect(() => {
    if (!candles.length) return;
    
    // Batch render: only one rAF per frame even with many ticks
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    
    animFrameRef.current = requestAnimationFrame(() => {
      renderChart(canvasRef.current, candles, timeframe);
    });
  }, [candles, timeframe]);
  
  return (
    <div className="stock-chart">
      <div className="chart-header">
        <h2>{symbol}</h2>
        <div className="price" aria-live="polite">
          {candles.length > 0 && (
            <>
              <span className="current-price">
                ${candles[candles.length - 1].close.toFixed(2)}
              </span>
              <span className={`change ${getChangeClass(candles)}`}>
                {getChangePercent(candles)}%
              </span>
            </>
          )}
        </div>
        
        <div className="timeframes" role="group" aria-label="Chart timeframe">
          {['1D', '1W', '1M', '3M', '1Y', '5Y'].map(tf => (
            <button key={tf} className={timeframe === tf ? 'active' : ''}
              onClick={() => setTimeframe(tf)} aria-pressed={timeframe === tf}>
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      <canvas ref={canvasRef} width={800} height={400} aria-label="Stock price chart" />
    </div>
  );
}

function renderChart(canvas, candles, timeframe) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const chartHeight = height * 0.75; // Top 75% for price, bottom 25% for volume
  const volumeHeight = height * 0.2;
  const volumeTop = height * 0.8;
  
  ctx.clearRect(0, 0, width, height);
  
  // Price range
  const prices = candles.flatMap(c => [c.high, c.low]);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const maxVolume = Math.max(...candles.map(c => c.volume));
  
  const candleWidth = Math.max(2, (width / candles.length) * 0.7);
  const gap = (width / candles.length) * 0.3;
  
  // Draw grid lines
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    
    const price = maxPrice - (priceRange / 4) * i;
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText(`$${price.toFixed(2)}`, width - 60, y - 2);
  }
  
  // Draw candles
  candles.forEach((candle, i) => {
    const x = i * (candleWidth + gap) + gap / 2;
    const isGreen = candle.close >= candle.open;
    
    // Candlestick body
    const openY = ((maxPrice - candle.open) / priceRange) * chartHeight;
    const closeY = ((maxPrice - candle.close) / priceRange) * chartHeight;
    const highY = ((maxPrice - candle.high) / priceRange) * chartHeight;
    const lowY = ((maxPrice - candle.low) / priceRange) * chartHeight;
    
    ctx.fillStyle = isGreen ? '#26a69a' : '#ef5350';
    ctx.strokeStyle = isGreen ? '#26a69a' : '#ef5350';
    
    // Wick (high-low line)
    ctx.beginPath();
    ctx.moveTo(x + candleWidth / 2, highY);
    ctx.lineTo(x + candleWidth / 2, lowY);
    ctx.stroke();
    
    // Body (open-close rect)
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(1, Math.abs(openY - closeY));
    ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
    
    // Volume bar
    const volHeight = (candle.volume / maxVolume) * volumeHeight;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x, volumeTop + volumeHeight - volHeight, candleWidth, volHeight);
    ctx.globalAlpha = 1;
  });
  
  // Moving Average (20-period SMA)
  if (candles.length >= 20) {
    ctx.beginPath();
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 1.5;
    
    for (let i = 19; i < candles.length; i++) {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) sum += candles[j].close;
      const sma = sum / 20;
      const y = ((maxPrice - sma) / priceRange) * chartHeight;
      const x = i * (candleWidth + gap) + candleWidth / 2;
      
      if (i === 19) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
  }
}
```

---

## 🎯 Key Takeaways
- Goldman Sachs FE = **financial data visualization** (stock charts, dashboards)
- **Candlestick chart** on Canvas: wick (high/low), body (open/close), color (green/red)
- **WebSocket** with reconnection and exponential backoff — critical for real-time data
- **rAF batching**: cancel previous frame if new data arrives before render
- **20-period SMA** (Simple Moving Average) — know financial indicators
- **Volume bars** below price chart (standard layout) with reduced opacity
- GS values **cross-team leadership** in HM round — prepare stories about driving initiatives
- Spiral Matrix = classic GS HackerRank question

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| HackerRank | Medium | Spiral Matrix, Debounce + Cache |
| Technical | Hard | Canvas, WebSocket, Candlestick Chart |
| System Design | Hard | Trading Dashboard, Real-Time Data |
| HM | Hard | Leadership, Cross-Team Collaboration |
