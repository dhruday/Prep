# Razorpay — Senior Frontend Engineer Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Razorpay |
| **Role** | SDE-2 Frontend |
| **Level** | Senior |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksforGeeks](https://www.geeksforgeeks.org/razorpay-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + Machine Coding + System Design FE + HM)
- **Timeline:** 2 weeks

---

## Round 1: Machine Coding
**Duration:** 90 minutes

### Questions Asked
1. **Build a Payment Dashboard with Charts** (like Razorpay Dashboard)
   - Bar chart for daily transaction volume
   - Line chart for revenue trend
   - Date range picker (7d, 30d, 90d, custom)
   - Data aggregation: group by day/week/month
   - Export chart as PNG

### 💡 Interview-Ready Answer

```jsx
function PaymentDashboard() {
  const [dateRange, setDateRange] = useState('7d');
  const [customRange, setCustomRange] = useState({ from: null, to: null });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aggregation, setAggregation] = useState('daily');
  const chartRef = useRef(null);
  
  // Fetch data based on date range
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams({ range: dateRange, aggregation });
      if (dateRange === 'custom') {
        params.set('from', customRange.from);
        params.set('to', customRange.to);
      }
      const res = await fetch(`/api/dashboard/transactions?${params}`);
      const json = await res.json();
      setData(json);
      setLoading(false);
    };
    
    fetchData();
  }, [dateRange, customRange, aggregation]);
  
  // Export chart as PNG
  const exportChart = () => {
    const canvas = chartRef.current?.querySelector('canvas');
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `payment-report-${dateRange}.png`;
    link.href = url;
    link.click();
  };
  
  // Aggregate data by period
  const aggregateData = useMemo(() => {
    if (!data?.transactions) return [];
    
    const groups = {};
    data.transactions.forEach(txn => {
      let key;
      const date = new Date(txn.date);
      
      switch (aggregation) {
        case 'daily':
          key = txn.date; // YYYY-MM-DD
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      if (!groups[key]) groups[key] = { date: key, count: 0, amount: 0, refunds: 0 };
      groups[key].count += txn.count;
      groups[key].amount += txn.amount;
      groups[key].refunds += txn.refunds;
    });
    
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, aggregation]);
  
  return (
    <main className="dashboard" aria-label="Payment Dashboard">
      {/* Controls */}
      <div className="controls">
        <fieldset>
          <legend>Date Range</legend>
          {['7d', '30d', '90d', 'custom'].map(range => (
            <label key={range}>
              <input type="radio" name="range" value={range}
                checked={dateRange === range}
                onChange={() => setDateRange(range)} />
              {range === 'custom' ? 'Custom' : range}
            </label>
          ))}
        </fieldset>
        
        {dateRange === 'custom' && (
          <div className="custom-date">
            <input type="date" value={customRange.from || ''}
              onChange={e => setCustomRange(prev => ({...prev, from: e.target.value}))} />
            <span>to</span>
            <input type="date" value={customRange.to || ''}
              onChange={e => setCustomRange(prev => ({...prev, to: e.target.value}))} />
          </div>
        )}
        
        <select value={aggregation} onChange={e => setAggregation(e.target.value)}
          aria-label="Group by">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        
        <button onClick={exportChart} aria-label="Export chart as PNG">📥 Export PNG</button>
      </div>
      
      {/* Summary Cards */}
      {data && (
        <div className="summary-cards" role="region" aria-label="Summary metrics">
          <MetricCard
            title="Total Volume"
            value={data.summary.totalCount.toLocaleString('en-IN')}
            change={data.summary.countChange}
          />
          <MetricCard
            title="Total Revenue"
            value={`₹${(data.summary.totalAmount / 100).toLocaleString('en-IN')}`}
            change={data.summary.amountChange}
          />
          <MetricCard
            title="Success Rate"
            value={`${data.summary.successRate}%`}
            change={data.summary.successRateChange}
          />
          <MetricCard
            title="Avg Transaction"
            value={`₹${(data.summary.avgAmount / 100).toLocaleString('en-IN')}`}
            change={data.summary.avgChange}
          />
        </div>
      )}
      
      {/* Charts */}
      <div ref={chartRef} className="charts-container">
        {loading ? (
          <div className="chart-skeleton" aria-hidden="true" />
        ) : (
          <>
            <BarChart
              data={aggregateData}
              xKey="date"
              yKey="count"
              title="Transaction Volume"
              color="#528FF0"
            />
            <LineChart
              data={aggregateData}
              xKey="date"
              yKey="amount"
              title="Revenue Trend"
              color="#12B76A"
              formatY={v => `₹${(v / 100000).toFixed(1)}L`}
            />
          </>
        )}
      </div>
    </main>
  );
}

function MetricCard({ title, value, change }) {
  const isPositive = change >= 0;
  return (
    <div className="metric-card">
      <span className="metric-title">{title}</span>
      <span className="metric-value">{value}</span>
      <span className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}%
      </span>
    </div>
  );
}

// Simple Canvas Bar Chart (no library)
function BarChart({ data, xKey, yKey, title, color }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 40, right: 20, bottom: 60, left: 60 };
    
    ctx.clearRect(0, 0, width, height);
    
    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(title, padding.left, 24);
    
    const maxVal = Math.max(...data.map(d => d[yKey]));
    const barWidth = (width - padding.left - padding.right) / data.length * 0.7;
    const gap = (width - padding.left - padding.right) / data.length * 0.3;
    
    data.forEach((d, i) => {
      const x = padding.left + i * (barWidth + gap) + gap / 2;
      const barHeight = (d[yKey] / maxVal) * (height - padding.top - padding.bottom);
      const y = height - padding.bottom - barHeight;
      
      // Bar
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();
      
      // X label
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.save();
      ctx.translate(x + barWidth / 2, height - padding.bottom + 10);
      ctx.rotate(Math.PI / 4);
      ctx.fillText(d[xKey], 0, 0);
      ctx.restore();
    });
    
    // Y axis labels
    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round(maxVal * (i / 4));
      const y = height - padding.bottom - (i / 4) * (height - padding.top - padding.bottom);
      ctx.fillText(val.toLocaleString(), 5, y + 4);
      
      // Grid line
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
  }, [data, xKey, yKey, title, color]);
  
  return (
    <canvas ref={canvasRef} width={600} height={300}
      role="img" aria-label={`${title} bar chart`} />
  );
}
```

---

## 🎯 Key Takeaways
- Razorpay FE = **payment dashboards + data visualization + embeddable widgets**
- **Canvas chart rendering**: pure Canvas 2D API — shows deep knowledge without library dependency
- **Data aggregation**: group by day/week/month with `Date` arithmetic
- **Export as PNG**: `canvas.toDataURL('image/png')` + download link trick
- **Metric cards with change indicators**: ↑/↓ with percentage — standard dashboard pattern
- **Date range picker**: preset (7d, 30d, 90d) + custom range — common interview requirement
- **Amount in paise**: store amounts as integers (paise/cents) → divide by 100 for display → avoid floating point
- Razorpay FE stack: React + TypeScript + Canvas/SVG for charts

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Array, String, Logic |
| Machine Coding | Hard | Dashboard, Canvas Charts, Aggregation |
| FE System Design | Hard | Payment Widget Architecture |
| HM | Medium | Fintech Domain Knowledge |
