# 241 – Live Dashboard

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

A Live Dashboard displays real-time metrics, charts, and status indicators that update continuously without user interaction. It tests **real-time data delivery** (WebSocket/SSE), **efficient chart rendering** (Canvas vs SVG, throttled updates), **dashboard layout** (grid system, draggable/resizable widgets), **data aggregation** (time-series bucketing, moving averages), and **graceful degradation** (handling partial data, connection drops). The key architectural challenge is updating potentially dozens of chart widgets with streaming data while maintaining 60fps performance.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
Data Sources → WebSocket/SSE → Data Layer → Widget Renderers
                                    │
                              ┌─────┴──────┐
                              │ Data Store   │ ← normalized time-series
                              │ (buffered)   │ ← max N points per metric
                              └─────┬──────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              ▼                     ▼                      ▼
        ┌──────────┐         ┌──────────┐           ┌──────────┐
        │ Line Chart│         │ Gauge    │           │ Table    │
        │ Widget    │         │ Widget   │           │ Widget   │
        └──────────┘         └──────────┘           └──────────┘
```

### Data Layer: Buffered Time-Series

```typescript
interface MetricBuffer {
  metricId: string;
  points: Array<{ timestamp: number; value: number }>;
  maxPoints: number;      // ring buffer — oldest dropped
  aggregation: 'latest' | 'avg' | 'sum' | 'max';
}

class TimeSeriesBuffer {
  private buffer: Map<string, MetricBuffer> = new Map();

  push(metricId: string, value: number, timestamp: number) {
    const metric = this.buffer.get(metricId);
    if (!metric) return;
    metric.points.push({ timestamp, value });
    if (metric.points.length > metric.maxPoints) {
      metric.points.shift(); // ring buffer
    }
  }
}
```

### Update Throttling

Raw data may arrive every 100ms, but rendering 10 chart updates/second causes jank:

```typescript
// Throttle renders to 1-2 per second using requestAnimationFrame
class DashboardUpdater {
  private dirty = new Set<string>();   // widget IDs that need re-render
  private rafId: number | null = null;

  markDirty(widgetId: string) {
    this.dirty.add(widgetId);
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  private flush() {
    for (const widgetId of this.dirty) {
      renderWidget(widgetId); // only re-render dirty widgets
    }
    this.dirty.clear();
    this.rafId = null;
  }
}
```

### Chart Rendering: SVG vs Canvas

| Approach | Best For | Why |
|----------|----------|-----|
| **SVG** (D3, Recharts) | < 500 data points | DOM-based, interactive (hover, click), accessible |
| **Canvas** (Chart.js, Canvas API) | > 1000 data points | Pixel-based, no DOM overhead, fast for streaming |
| **WebGL** (deck.gl) | > 100K data points | GPU-accelerated, but complex setup |

### Dashboard Layout: CSS Grid + Drag/Resize

```typescript
// react-grid-layout for draggable/resizable widgets
import GridLayout from 'react-grid-layout';

const layout = [
  { i: 'cpu-chart', x: 0, y: 0, w: 6, h: 4 },
  { i: 'memory-gauge', x: 6, y: 0, w: 3, h: 2 },
  { i: 'error-table', x: 6, y: 2, w: 3, h: 2 },
  { i: 'network-chart', x: 0, y: 4, w: 9, h: 4 },
];
```

### Connection Resilience

```typescript
// WebSocket with auto-reconnect + stale data indicator
class DashboardConnection {
  private lastDataTimestamp = Date.now();
  
  connect() {
    const ws = new WebSocket('wss://api.example.com/metrics');
    ws.onmessage = (e) => {
      this.lastDataTimestamp = Date.now();
      this.handleData(JSON.parse(e.data));
    };
    ws.onclose = () => {
      setTimeout(() => this.connect(), 2000); // reconnect
      this.showStaleIndicator(); // "Data may be stale"
    };
    
    // Stale data detection
    setInterval(() => {
      if (Date.now() - this.lastDataTimestamp > 10000) {
        this.showStaleIndicator();
      }
    }, 5000);
  }
}
```

### Anti-Patterns

- ❌ Re-rendering all widgets on every data point — only update dirty widgets
- ❌ Unbounded data buffers — keep fixed-size ring buffer per metric
- ❌ SVG for high-frequency streaming data — use Canvas for > 1000 points
- ❌ No stale data indicator — user can't tell if data is current after disconnect
- ❌ Synchronous chart calculations blocking main thread — use Web Workers for aggregation

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG: Grafana
Grafana uses a plugin-based widget system. Each panel is independent, subscribes to data sources, and renders via Canvas or SVG. Data is streamed via WebSocket with configurable refresh intervals. The layout uses a responsive grid with drag-and-resize.

### Hruday @ Bosch
At Bosch, I built a real-time IoT dashboard displaying sensor data from industrial equipment. We used WebSocket for streaming, Chart.js for Canvas-based charts, and a custom widget grid. Data was buffered in ring buffers (last 500 points per sensor), with aggregation done on the backend for historical views.

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd structure the dashboard as a grid of independent widget components, each subscribing to specific metrics from a centralized data layer.*

*Data delivery: WebSocket connection streams metric updates. A data layer buffers incoming data in ring buffers (fixed-size arrays per metric, dropping oldest). Widgets subscribe to specific metrics via a pub-sub pattern within the data layer.*

*Rendering: I throttle widget re-renders to one per animation frame using `requestAnimationFrame`. A `dirty set` tracks which widgets have new data. For charts with < 500 points, I use SVG (Recharts) for interactivity. For streaming data > 1000 points, I use Canvas (Chart.js) for performance.*

*Layout: `react-grid-layout` provides a 12-column grid with draggable/resizable widgets. Layout is persisted to the user's profile.*

*Resilience: WebSocket auto-reconnects with exponential backoff. If no data received for 10 seconds, I show a 'Data may be stale' indicator. At Bosch, I built an IoT dashboard with exactly this architecture — WebSocket streaming, Canvas charts, ring buffers, and auto-reconnection."*

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// Dashboard Widget with metric subscription
function MetricWidget({ metricId, type }: { metricId: string; type: 'line' | 'gauge' }) {
  const [data, setData] = useState<{ timestamp: number; value: number }[]>([]);

  useEffect(() => {
    const unsubscribe = metricStore.subscribe(metricId, (newPoint) => {
      setData(prev => {
        const updated = [...prev, newPoint];
        return updated.length > 500 ? updated.slice(-500) : updated; // ring buffer
      });
    });
    return unsubscribe;
  }, [metricId]);

  if (type === 'gauge') {
    const latest = data[data.length - 1]?.value ?? 0;
    return <GaugeWidget value={latest} max={100} label={metricId} />;
  }

  return (
    <canvas ref={(el) => {
      if (el) renderLineChart(el, data); // Canvas-based for performance
    }} />
  );
}

// Dashboard Grid
function Dashboard({ widgets }: { widgets: WidgetConfig[] }) {
  return (
    <GridLayout cols={12} rowHeight={80} width={1200}
                layout={widgets.map(w => w.gridPosition)}>
      {widgets.map(w => (
        <div key={w.id}>
          <MetricWidget metricId={w.metricId} type={w.chartType} />
        </div>
      ))}
    </GridLayout>
  );
}
```

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"Dashboard = WebSocket + Ring Buffer + Dirty Render + Grid Layout."** Stream data via WebSocket. Buffer in ring buffers (fixed size, drop oldest). Mark dirty widgets, flush on rAF. Canvas for high-frequency charts, SVG for interactive/smaller datasets. Grid layout with drag/resize. Stale data indicator on connection loss. Web Workers for heavy aggregation.

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why:** Tests real-time data handling, rendering performance (Canvas vs SVG), state management at scale, and responsive layout — directly relevant to monitoring tools at every target company.
**How:** WebSocket streams metrics to a data layer with ring buffers. Widgets subscribe via pub-sub. requestAnimationFrame throttles re-renders. react-grid-layout for widget positioning. Auto-reconnect with stale indicators.
**Companies:** Microsoft (Azure Monitor), Adobe (Analytics dashboards), Salesforce (Einstein Analytics), Cisco (Meraki dashboard — core product, this is THE interview topic for Cisco).
