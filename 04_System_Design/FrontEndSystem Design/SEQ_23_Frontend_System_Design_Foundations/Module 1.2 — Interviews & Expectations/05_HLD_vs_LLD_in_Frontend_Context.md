# HLD vs LLD in Frontend Context

## 1. High-Level Explanation (Frontend Interview Level)

In frontend system design interviews, you'll encounter two types of design questions:

**HLD (High-Level Design)** and **LLD (Low-Level Design)**

These aren't just backend concepts—they apply to frontend architecture too, but with different focus areas.

### High-Level Design (HLD) - Architecture & Strategy

**Focus:** The big picture—how the system works as a whole

**Questions HLD Answers:**
- What are the major components and how do they interact?
- How does data flow through the system?
- What rendering strategy (CSR, SSR, SSG) should we use?
- How do we handle state management at scale?
- How does the system scale to millions of users?
- What are the critical performance bottlenecks?
- How do we ensure reliability and monitoring?

**Example HLD Question:**
> "Design the frontend architecture for Netflix's homepage"

**Expected Response:**
- Component hierarchy diagram
- Data fetching strategy
- State management approach
- CDN and caching strategy
- Performance optimization techniques
- Rendering strategy (SSR for SEO, CSR for interactivity)
- Edge case handling

### Low-Level Design (LLD) - Implementation Details

**Focus:** The specific implementation of a component or feature

**Questions LLD Answers:**
- How exactly does this component work internally?
- What are the specific APIs and interfaces?
- How do we handle edge cases in the implementation?
- What are the exact data structures used?
- How do we ensure this component is performant?
- What are the lifecycle hooks and side effects?
- How is error handling implemented?

**Example LLD Question:**
> "Implement an autocomplete component with debouncing and keyboard navigation"

**Expected Response:**
- Working code implementation
- State management within the component
- Event handlers and callbacks
- Edge case handling (empty state, errors, loading)
- Accessibility features (ARIA, keyboard support)
- Performance optimizations (debouncing, memoization)
- Test cases

### Key Differences

| Aspect | HLD | LLD |
|--------|-----|-----|
| **Scope** | Entire system or application | Single component or feature |
| **Focus** | Architecture, patterns, flow | Implementation, code, APIs |
| **Output** | Diagrams, boxes and arrows | Code, interfaces, algorithms |
| **Abstraction** | High (conceptual) | Low (concrete) |
| **Time** | 30-45 mins discussion | 45-60 mins coding |
| **Deliverable** | Architecture document | Working prototype |
| **Questions** | "How would you architect X?" | "Implement component Y" |
| **Depth** | Breadth across system | Depth in one area |
| **Trade-offs** | Technology choices | Implementation patterns |

### When Each is Used

**HLD in Interviews:**
- Senior/Staff level positions
- Assessing architectural thinking
- Evaluating system design knowledge
- Testing communication skills
- Checking trade-off analysis

**LLD in Interviews:**
- All levels (adjusted for seniority)
- Assessing coding ability
- Evaluating problem-solving
- Testing attention to detail
- Checking production awareness

**In Practice:**
Both are needed! HLD informs LLD:
1. Start with HLD (what to build)
2. Dive into LLD (how to build it)
3. Iterate between both levels

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### The Frontend Design Spectrum

Frontend design exists on a continuum from high-level to low-level:

```
HIGH-LEVEL (Strategic)
├─ Application Architecture
│  ├─ Micro-frontends vs Monolith
│  ├─ Rendering strategy (CSR/SSR/SSG)
│  └─ Deployment architecture
│
├─ System Components
│  ├─ Page-level routing
│  ├─ State management strategy
│  └─ Data fetching patterns
│
├─ Feature Design
│  ├─ Component hierarchy
│  ├─ Props and API design
│  └─ State flow
│
├─ Component Design
│  ├─ Internal state management
│  ├─ Event handling
│  └─ Rendering optimization
│
└─ LOW-LEVEL (Tactical)
   ├─ Algorithm implementation
   ├─ Data structure choices
   └─ Performance micro-optimizations
```

### HLD: Frontend Architecture Patterns

#### Example 1: Designing a Dashboard Application

**HLD Approach (45 minutes):**

```
Phase 1: Requirements Gathering (5 mins)
─────────────────────────────────────────
"Before we start, let me clarify:

**Functional Requirements:**
- What data are we displaying? (metrics, charts, tables)
- Real-time updates or static?
- User interactions? (filters, drill-downs)
- Multiple dashboards or single view?

**Non-Functional Requirements:**
- Scale: How many concurrent users?
- Performance: What's acceptable load time?
- Data volume: How many data points per chart?
- Devices: Mobile, desktop, or both?

**Assumptions:**
- 10K concurrent users
- Real-time data (1-5 second updates)
- 20+ charts per dashboard
- Desktop-first, mobile-friendly
- Data from REST API
- Target: LCP < 2.5s, updates < 1s"


Phase 2: High-Level Architecture (15 mins)
───────────────────────────────────────────

┌────────────────────────────────────────────────────┐
│                  User's Browser                    │
│  ┌──────────────────────────────────────────────┐  │
│  │         React Application (SPA)              │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────────┐ │  │
│  │  │  Dashboard Container                   │ │  │
│  │  │  ├─ Header (filters, date range)       │ │  │
│  │  │  ├─ Grid Layout (responsive)           │ │  │
│  │  │  │  ├─ Chart Widget (lazy loaded)      │ │  │
│  │  │  │  ├─ Table Widget (virtualized)      │ │  │
│  │  │  │  └─ Metric Widget                   │ │  │
│  │  │  └─ Real-time Status Indicator         │ │  │
│  │  └────────────────────────────────────────┘ │  │
│  │                                              │  │
│  │  State Management:                           │  │
│  │  ├─ React Query (server state, caching)     │  │
│  │  ├─ Zustand (UI state, filters)             │  │
│  │  └─ WebSocket (real-time updates)           │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
         ↓                    ↓                ↓
┌──────────────┐    ┌──────────────┐   ┌──────────────┐
│ CDN          │    │ API Gateway  │   │ WebSocket    │
│ (Static      │    │ - Auth       │   │ Server       │
│  Assets)     │    │ - Metrics    │   │ (Real-time)  │
└──────────────┘    └──────────────┘   └──────────────┘


Phase 3: Key Design Decisions (15 mins)
────────────────────────────────────────

1. **Rendering Strategy: Client-Side Rendering (CSR)**
   
   Why:
   ✅ Highly interactive dashboard
   ✅ Real-time updates (WebSocket)
   ✅ Authenticated users (no SEO needed)
   ✅ Fast navigation between dashboards
   
   Trade-off:
   ❌ Slower initial load (mitigated with code splitting)
   ❌ No SEO (not needed for internal dashboard)
   
   Alternative considered: SSR
   - Would add server complexity
   - No SEO benefit (authenticated app)
   - Real-time updates easier with CSR

2. **State Management: React Query + Zustand**
   
   Why:
   ✅ React Query for server data (automatic caching, revalidation)
   ✅ Zustand for UI state (filters, selected date range)
   ✅ Clear separation of concerns
   ✅ Minimal boilerplate
   
   Trade-off:
   ❌ Two libraries instead of one
   ✅ But each optimized for its use case
   
   Alternative considered: Redux
   - More boilerplate
   - Unnecessary for this use case
   - React Query already handles most state

3. **Real-time Updates: WebSocket**
   
   Why:
   ✅ Low latency (< 1s updates)
   ✅ Efficient (server pushes, no polling)
   ✅ Scalable (one connection per user)
   
   Trade-off:
   ❌ Connection management complexity
   ❌ Reconnection logic needed
   
   Alternative considered: Polling
   - Simpler implementation
   - Higher latency
   - More server load
   
   Alternative considered: Server-Sent Events
   - Good for one-way updates
   - Less support than WebSocket

4. **Chart Rendering: Canvas-based (recharts/Chart.js)**
   
   Why:
   ✅ Performance (1000+ data points)
   ✅ Smooth animations
   ✅ GPU-accelerated
   
   Trade-off:
   ❌ Less accessible than SVG
   ✅ But we'll add ARIA labels
   
   Alternative considered: SVG
   - More accessible
   - Better for simple charts
   - Slow with many data points

5. **Data Fetching: Stale-While-Revalidate**
   
   ```typescript
   const { data } = useQuery('metrics', fetchMetrics, {
     staleTime: 30000,       // Fresh for 30s
     cacheTime: 300000,      // Keep in memory 5 mins
     refetchOnWindowFocus: true,
     refetchInterval: 60000, // Background refresh every 60s
   });
   ```
   
   Why:
   ✅ Shows cached data immediately
   ✅ Updates in background
   ✅ Balance freshness vs server load
   
   Trade-off:
   ❌ Users might see slightly stale data
   ✅ But acceptable for metrics (not financial)


Phase 4: Performance Strategy (10 mins)
────────────────────────────────────────

1. **Initial Load Optimization:**
   - Code splitting by route (dashboard pages)
   - Lazy load chart library (only when needed)
   - Inline critical CSS
   - Preconnect to API domain
   
   Target: LCP < 2.5s

2. **Runtime Performance:**
   - Virtual scrolling for tables (1000+ rows)
   - Debounce filter inputs (reduce re-renders)
   - Memoize chart components
   - Web Workers for data processing
   
   Target: 60 FPS scrolling

3. **Network Optimization:**
   - Batch API requests
   - Cache responses (React Query)
   - Compress data (gzip/brotli)
   - CDN for static assets
   
   Target: < 500ms API response time

4. **Real-time Optimization:**
   - Throttle WebSocket updates (max 1 update/sec per chart)
   - Batch updates (update all charts at once)
   - Only update visible charts (Intersection Observer)
   
   Target: < 1s latency


Phase 5: Edge Cases & Scalability (5 mins)
───────────────────────────────────────────

Edge Cases:
1. **WebSocket disconnection:**
   - Exponential backoff reconnection
   - Show "Connecting..." indicator
   - Fall back to polling if WebSocket fails
   
2. **Slow API:**
   - Show skeleton loaders
   - Timeout after 10s
   - Retry with exponential backoff
   
3. **Large datasets:**
   - Pagination on server
   - Virtual scrolling on client
   - Data aggregation (show hourly instead of per-second)
   
4. **No data:**
   - Empty states with helpful messages
   - Suggestions for next steps

Scalability:
- 10K concurrent users → 100K concurrent users:
  - API: Add rate limiting, caching layer
  - WebSocket: Use pub/sub (Redis) for horizontal scaling
  - Frontend: No change needed (client-side rendering)
  
- 20 charts → 100 charts:
  - Virtualize dashboard grid (only render visible)
  - Lazy load widgets on scroll
  - Paginate dashboard (tabs or sections)

Monitoring:
- Track: Page load time, chart render time, WebSocket latency
- Alert: If LCP > 3s or WebSocket disconnects > 1%
- Dashboard: Real-time monitoring of user metrics
```

**What Makes This HLD:**
- ✅ Focuses on architecture, not implementation
- ✅ Multiple components and their interactions
- ✅ Technology choices with justification
- ✅ Performance strategy at system level
- ✅ Scalability and edge case considerations
- ✅ Trade-off analysis
- ✅ Diagrams and visual representation

---

### LLD: Component Implementation

#### Example 1: Implementing the Chart Widget

**LLD Approach (45 minutes):**

```typescript
/**
 * LLD: Chart Widget Component
 * 
 * Requirements:
 * - Display time-series data
 * - Real-time updates (WebSocket)
 * - Configurable (line, bar, area charts)
 * - Responsive (resize with container)
 * - Interactive (tooltips, zoom)
 * - Accessible (ARIA labels, keyboard navigation)
 * - Performant (1000+ data points)
 */

// ─────────────────────────────────────────────────────
// 1. Type Definitions
// ─────────────────────────────────────────────────────

interface DataPoint {
  timestamp: number;
  value: number;
}

interface ChartWidgetProps {
  /** Unique identifier for the chart */
  id: string;
  
  /** Chart title */
  title: string;
  
  /** Initial data to display */
  initialData: DataPoint[];
  
  /** Chart type */
  type: 'line' | 'bar' | 'area';
  
  /** Color scheme */
  color?: string;
  
  /** Enable real-time updates */
  realTime?: boolean;
  
  /** Update interval for real-time (ms) */
  updateInterval?: number;
  
  /** Maximum data points to display */
  maxDataPoints?: number;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Error state */
  error?: Error;
  
  /** Height of the chart */
  height?: number;
  
  /** Callback when data point is clicked */
  onDataPointClick?: (point: DataPoint) => void;
}

// ─────────────────────────────────────────────────────
// 2. Implementation
// ─────────────────────────────────────────────────────

import { useEffect, useRef, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';

export function ChartWidget({
  id,
  title,
  initialData,
  type = 'line',
  color = '#3b82f6',
  realTime = false,
  updateInterval = 5000,
  maxDataPoints = 100,
  isLoading = false,
  error,
  height = 300,
  onDataPointClick,
}: ChartWidgetProps) {
  // ───────────────────────────────────────────────────
  // State Management
  // ───────────────────────────────────────────────────
  
  const [data, setData] = useState<DataPoint[]>(initialData);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // ───────────────────────────────────────────────────
  // Intersection Observer (only render when visible)
  // ───────────────────────────────────────────────────
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    observer.observe(chartRef.current);
    
    return () => observer.disconnect();
  }, []);
  
  // ───────────────────────────────────────────────────
  // Real-time Updates (WebSocket)
  // ───────────────────────────────────────────────────
  
  const { data: liveData } = useWebSocket<DataPoint>(
    realTime ? `ws://api.example.com/metrics/${id}` : null,
    {
      reconnect: true,
      reconnectInterval: 3000,
      onError: (error) => {
        console.error(`WebSocket error for chart ${id}:`, error);
      },
    }
  );
  
  // Update chart data when new data arrives
  useEffect(() => {
    if (!liveData) return;
    
    setData((prevData) => {
      const newData = [...prevData, liveData];
      
      // Keep only last N data points (sliding window)
      if (newData.length > maxDataPoints) {
        return newData.slice(-maxDataPoints);
      }
      
      return newData;
    });
  }, [liveData, maxDataPoints]);
  
  // ───────────────────────────────────────────────────
  // Data Processing (memoized for performance)
  // ───────────────────────────────────────────────────
  
  const processedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      // Format timestamp for display
      time: new Date(point.timestamp).toLocaleTimeString(),
      // Format value to 2 decimal places
      displayValue: point.value.toFixed(2),
    }));
  }, [data]);
  
  // Calculate statistics (memoized)
  const stats = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0, avg: 0 };
    
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    return { min, max, avg: avg.toFixed(2) };
  }, [data]);
  
  // ───────────────────────────────────────────────────
  // Error Handling
  // ───────────────────────────────────────────────────
  
  if (error) {
    return (
      <div
        className="chart-widget chart-widget--error"
        role="alert"
        aria-live="polite"
      >
        <h3>{title}</h3>
        <div className="error-message">
          <span>⚠️ Failed to load chart data</span>
          <p>{error.message}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // ───────────────────────────────────────────────────
  // Loading State
  // ───────────────────────────────────────────────────
  
  if (isLoading) {
    return (
      <div className="chart-widget chart-widget--loading">
        <h3>{title}</h3>
        <div className="skeleton-chart" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading chart data...</span>
          {/* Skeleton loader */}
          <div className="skeleton-bars">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-bar"
                style={{ height: `${Math.random() * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // ───────────────────────────────────────────────────
  // Empty State
  // ───────────────────────────────────────────────────
  
  if (data.length === 0) {
    return (
      <div className="chart-widget chart-widget--empty">
        <h3>{title}</h3>
        <div className="empty-state">
          <p>No data available</p>
          <span>Data will appear here when available</span>
        </div>
      </div>
    );
  }
  
  // ───────────────────────────────────────────────────
  // Main Render
  // ───────────────────────────────────────────────────
  
  return (
    <div
      ref={chartRef}
      className="chart-widget"
      role="region"
      aria-label={`${title} chart`}
    >
      {/* Header */}
      <div className="chart-widget__header">
        <h3>{title}</h3>
        
        {/* Real-time indicator */}
        {realTime && (
          <span
            className="realtime-indicator"
            aria-label="Real-time updates enabled"
          >
            🔴 Live
          </span>
        )}
        
        {/* Statistics */}
        <div className="chart-stats" aria-label="Chart statistics">
          <span>Min: {stats.min}</span>
          <span>Max: {stats.max}</span>
          <span>Avg: {stats.avg}</span>
        </div>
      </div>
      
      {/* Chart (only render if visible) */}
      {isVisible && (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={processedData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [value.toFixed(2), 'Value']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              animationDuration={300}
              onClick={(data) => {
                if (onDataPointClick && data) {
                  onDataPointClick({
                    timestamp: data.timestamp,
                    value: data.value,
                  });
                }
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
      
      {/* Accessibility: Data table for screen readers */}
      <table className="sr-only" aria-label={`${title} data table`}>
        <caption>{title} - Detailed data</caption>
        <thead>
          <tr>
            <th>Time</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {processedData.slice(-10).map((point, i) => (
            <tr key={i}>
              <td>{point.time}</td>
              <td>{point.displayValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// 3. Custom Hook: useWebSocket (for real-time updates)
// ─────────────────────────────────────────────────────

function useWebSocket<T>(
  url: string | null,
  options: {
    reconnect?: boolean;
    reconnectInterval?: number;
    onError?: (error: Event) => void;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  useEffect(() => {
    if (!url) return;
    
    const connect = () => {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as T;
          setData(parsed);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        options.onError?.(error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Reconnect with exponential backoff
        if (options.reconnect && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(
            1000 * 2 ** reconnectAttemptsRef.current,
            30000
          );
          
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectAttemptsRef.current++;
          
          setTimeout(connect, delay);
        }
      };
    };
    
    connect();
    
    return () => {
      wsRef.current?.close();
    };
  }, [url, options.reconnect, options.reconnectInterval]);
  
  return { data, isConnected };
}

// ─────────────────────────────────────────────────────
// 4. Tests
// ─────────────────────────────────────────────────────

describe('ChartWidget', () => {
  const mockData: DataPoint[] = [
    { timestamp: 1609459200000, value: 100 },
    { timestamp: 1609459260000, value: 150 },
    { timestamp: 1609459320000, value: 120 },
  ];
  
  it('renders chart with data', () => {
    render(
      <ChartWidget
        id="test-chart"
        title="Test Chart"
        initialData={mockData}
        type="line"
      />
    );
    
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      'Test Chart chart'
    );
  });
  
  it('shows loading state', () => {
    render(
      <ChartWidget
        id="test-chart"
        title="Test Chart"
        initialData={[]}
        isLoading
      />
    );
    
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  });
  
  it('shows error state', () => {
    render(
      <ChartWidget
        id="test-chart"
        title="Test Chart"
        initialData={[]}
        error={new Error('Failed to fetch')}
      />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });
  
  it('shows empty state when no data', () => {
    render(
      <ChartWidget
        id="test-chart"
        title="Test Chart"
        initialData={[]}
      />
    );
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
  
  it('limits data points to maxDataPoints', () => {
    const largeDataset = Array.from({ length: 200 }, (_, i) => ({
      timestamp: Date.now() + i * 1000,
      value: Math.random() * 100,
    }));
    
    const { rerender } = render(
      <ChartWidget
        id="test-chart"
        title="Test Chart"
        initialData={largeDataset}
        maxDataPoints={100}
      />
    );
    
    // Internal state should only keep 100 points
    // (Would need to test internal state or expose it)
  });
  
  it('calls onDataPointClick when point is clicked', async () => {
    const handleClick = jest.fn();
    
    render(
      <ChartWidget
        id="test-chart"
        title="Test Chart"
        initialData={mockData}
        onDataPointClick={handleClick}
      />
    );
    
    // Simulate clicking a data point
    // (Implementation depends on chart library)
  });
  
  it('updates data in real-time', async () => {
    // Mock WebSocket
    const mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
    };
    
    global.WebSocket = jest.fn(() => mockWebSocket) as any;
    
    render(
      <ChartWidget
        id="test-chart"
        title="Test Chart"
        initialData={mockData}
        realTime
      />
    );
    
    expect(screen.getByText('🔴 Live')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────
// 5. Usage Example
// ─────────────────────────────────────────────────────

function DashboardPage() {
  const { data: initialData, isLoading, error } = useQuery(
    ['metrics', 'cpu'],
    fetchCPUMetrics
  );
  
  return (
    <div className="dashboard">
      <ChartWidget
        id="cpu-usage"
        title="CPU Usage"
        initialData={initialData || []}
        type="line"
        color="#3b82f6"
        realTime
        updateInterval={5000}
        maxDataPoints={100}
        isLoading={isLoading}
        error={error}
        height={300}
        onDataPointClick={(point) => {
          console.log('Clicked:', point);
          // Show detailed view
        }}
      />
    </div>
  );
}
```

**What Makes This LLD:**
- ✅ Complete working implementation
- ✅ Detailed state management
- ✅ Event handlers and lifecycle
- ✅ Error handling and edge cases
- ✅ Accessibility features
- ✅ Performance optimizations (memoization, intersection observer)
- ✅ Test cases
- ✅ Type definitions
- ✅ Usage examples

---

### Key Differences in Interview Context

#### HLD Interview Flow

```
Interviewer: "Design Instagram feed"

You:
1. Clarify requirements (5 mins)
   - "What content types? Photos, videos, stories?"
   - "Scale? How many followers per user?"
   - "Performance targets?"

2. Draw architecture (10 mins)
   - Component hierarchy
   - Data flow diagram
   - State management

3. Discuss key decisions (15 mins)
   - "I'd use virtual scrolling because..."
   - "For real-time, WebSocket vs polling..."
   - "Trade-off: CSR vs SSR..."

4. Deep dive on one component (10 mins)
   - Pick interesting component (e.g., Post)
   - Explain internal structure
   - Discuss optimizations

5. Scale and edge cases (10 mins)
   - "At 100M users, we'd need..."
   - "Edge case: Slow network..."
   - "Monitoring: Track LCP, engagement..."

NO CODE REQUIRED (unless asked)
```

#### LLD Interview Flow

```
Interviewer: "Implement an autocomplete component"

You:
1. Clarify requirements (5 mins)
   - "Debouncing? Keyboard navigation?"
   - "Source of data? Local or API?"
   - "Accessibility requirements?"

2. Design component API (5 mins)
   - Props interface
   - Event callbacks
   - State structure

3. Implement (30 mins)
   - Write working code
   - Handle edge cases
   - Add comments

4. Test (5 mins)
   - Walk through test cases
   - Demonstrate edge cases

5. Optimize (5 mins)
   - "We could add virtualization..."
   - "Memoization would help here..."

CODE IS REQUIRED
```

---

## 3. Clear Real-World Examples

### Example 1: E-Commerce Product Page

#### HLD Version (30 minutes)

```markdown
# HLD: E-Commerce Product Page

## Requirements
- Display product details (name, price, images, description)
- Show reviews and ratings
- Related products recommendations
- Add to cart functionality
- Mobile and desktop responsive
- SEO-friendly
- Fast load time (LCP < 2.5s)

## Architecture

┌─────────────────────────────────────────────┐
│        Product Page (Next.js)               │
│  ┌───────────────────────────────────────┐  │
│  │  SSG: Static Generation at Build      │  │
│  │  ├─ Product Details (above fold)      │  │
│  │  │  ├─ Image Gallery                  │  │
│  │  │  ├─ Title, Price, Rating           │  │
│  │  │  └─ Add to Cart Button             │  │
│  │  │                                     │  │
│  │  └─ CSR: Client-Side Below Fold       │  │
│  │     ├─ Reviews (lazy loaded)          │  │
│  │     ├─ Q&A Section                    │  │
│  │     └─ Recommendations                │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

## Key Decisions

### 1. Rendering: SSG + Incremental Static Regeneration (ISR)

**Why:**
✅ SEO-critical (product pages need Google indexing)
✅ Fast initial load (pre-rendered HTML)
✅ CDN-friendly (static HTML cached globally)
✅ Fresh data (ISR revalidates every 60s)

**How:**
```typescript
// pages/product/[id].tsx
export async function getStaticProps({ params }) {
  const product = await fetchProduct(params.id);
  
  return {
    props: { product },
    revalidate: 60, // ISR: Revalidate every 60s
  };
}

export async function getStaticPaths() {
  // Pre-render top 10K products at build
  const topProducts = await fetchTopProducts(10000);
  
  return {
    paths: topProducts.map(p => ({ params: { id: p.id } })),
    fallback: 'blocking', // Other products rendered on-demand
  };
}
```

**Trade-offs:**
- Pro: SEO + Performance
- Con: Build time increases (mitigated with incremental build)
- Alternative: SSR (slower, but always fresh)

### 2. State: React Query for Server Data + Context for Cart

**Why:**
✅ React Query caches product data
✅ Context shares cart across components
✅ No Redux overhead for simple cart

**How:**
```typescript
// Cart state (Context)
const CartContext = createContext();

function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  
  const addToCart = (product) => {
    setCart([...cart, product]);
    // Persist to localStorage
    localStorage.setItem('cart', JSON.stringify([...cart, product]));
  };
  
  return (
    <CartContext.Provider value={{ cart, addToCart }}>
      {children}
    </CartContext.Provider>
  );
}

// Product data (React Query)
function useProduct(id) {
  return useQuery(['product', id], () => fetchProduct(id), {
    staleTime: 300000, // Fresh for 5 minutes
  });
}
```

### 3. Performance: Code Splitting + Lazy Loading

**Optimizations:**
1. Above-the-fold: Load immediately (SSG)
2. Below-the-fold: Lazy load components
3. Images: Progressive loading + WebP
4. Third-party scripts: Defer (analytics, chat)

**Implementation:**
```typescript
const Reviews = lazy(() => import('./Reviews'));
const Recommendations = lazy(() => import('./Recommendations'));

function ProductPage({ product }) {
  return (
    <div>
      {/* Above the fold: Immediate */}
      <ImageGallery images={product.images} />
      <ProductInfo product={product} />
      <AddToCartButton product={product} />
      
      {/* Below the fold: Lazy */}
      <Suspense fallback={<Skeleton />}>
        <Reviews productId={product.id} />
      </Suspense>
      
      <Suspense fallback={<Skeleton />}>
        <Recommendations categoryId={product.categoryId} />
      </Suspense>
    </div>
  );
}
```

## Scale Considerations

**1M products → 10M products:**
- Incremental builds (only changed products)
- On-demand ISR (generate page on first request)
- CDN caching (reduce origin load)

**1K users → 1M users:**
- No frontend changes needed (static pages)
- Backend: Scale API servers, add caching

## Monitoring
- LCP for product pages
- Add-to-cart conversion rate
- Image load time
- API response times
```

#### LLD Version (45 minutes)

```typescript
/**
 * LLD: AddToCartButton Component
 * 
 * Requirements:
 * - Add product to cart
 * - Show loading state during API call
 * - Optimistic UI update
 * - Show success feedback
 * - Handle errors gracefully
 * - Prevent duplicate additions
 * - Accessible
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/hooks/useCart';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
}

interface AddToCartButtonProps {
  product: Product;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function AddToCartButton({
  product,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onSuccess,
  onError,
}: AddToCartButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const { addToCart, isInCart } = useCart();
  const queryClient = useQueryClient();
  
  // Check if product is already in cart
  const inCart = isInCart(product.id);
  
  // Check if product is out of stock
  const outOfStock = product.stock === 0;
  
  // Mutation for adding to cart
  const mutation = useMutation(
    async () => {
      // API call to add to cart
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }
      
      return response.json();
    },
    {
      // Optimistic update
      onMutate: async () => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['cart']);
        
        // Snapshot previous cart
        const previousCart = queryClient.getQueryData(['cart']);
        
        // Optimistically update cart
        queryClient.setQueryData(['cart'], (old: any) => ({
          ...old,
          items: [...(old?.items || []), product],
        }));
        
        // Update local state
        addToCart(product);
        
        return { previousCart };
      },
      
      // On error, rollback
      onError: (error, variables, context) => {
        queryClient.setQueryData(['cart'], context?.previousCart);
        onError?.(error as Error);
      },
      
      // On success
      onSuccess: () => {
        // Show success feedback
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        
        // Track analytics
        trackEvent('add_to_cart', {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
        });
        
        onSuccess?.();
      },
      
      // Always refetch to ensure consistency
      onSettled: () => {
        queryClient.invalidateQueries(['cart']);
      },
    }
  );
  
  const handleClick = () => {
    if (disabled || outOfStock || inCart || mutation.isLoading) {
      return;
    }
    
    mutation.mutate();
  };
  
  // Determine button text
  const getButtonText = () => {
    if (mutation.isLoading) return 'Adding...';
    if (showSuccess) return '✓ Added!';
    if (outOfStock) return 'Out of Stock';
    if (inCart) return 'Already in Cart';
    return 'Add to Cart';
  };
  
  // Determine if button should be disabled
  const isDisabled = disabled || outOfStock || inCart || mutation.isLoading;
  
  return (
    <button
      className={`add-to-cart-button add-to-cart-button--${variant} add-to-cart-button--${size}`}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={`Add ${product.name} to cart`}
      aria-live="polite"
      aria-busy={mutation.isLoading}
    >
      {getButtonText()}
      
      {/* Error message (accessible) */}
      {mutation.isError && (
        <span role="alert" className="sr-only">
          Failed to add to cart. Please try again.
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────
// Custom Hook: useCart
// ─────────────────────────────────────────────────────

function useCart() {
  const queryClient = useQueryClient();
  
  const { data: cart } = useQuery(['cart'], fetchCart, {
    staleTime: 300000, // 5 minutes
  });
  
  const addToCart = (product: Product) => {
    // Optimistic update handled in mutation
  };
  
  const isInCart = (productId: string) => {
    return cart?.items.some((item: any) => item.id === productId) || false;
  };
  
  return {
    cart,
    addToCart,
    isInCart,
  };
}

// ─────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────

describe('AddToCartButton', () => {
  const mockProduct: Product = {
    id: '123',
    name: 'Test Product',
    price: 29.99,
    image: '/test.jpg',
    stock: 10,
  };
  
  it('adds product to cart on click', async () => {
    const { user } = render(<AddToCartButton product={mockProduct} />);
    
    const button = screen.getByRole('button', { name: /add test product to cart/i });
    await user.click(button);
    
    expect(button).toHaveTextContent('Adding...');
    
    await waitFor(() => {
      expect(button).toHaveTextContent('✓ Added!');
    });
  });
  
  it('shows error message on failure', async () => {
    server.use(
      rest.post('/api/cart', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const { user } = render(<AddToCartButton product={mockProduct} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /failed to add to cart/i
      );
    });
  });
  
  it('disables button when out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    
    render(<AddToCartButton product={outOfStockProduct} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Out of Stock');
  });
  
  it('disables button when already in cart', () => {
    // Mock cart with product already added
    const mockCart = { items: [mockProduct] };
    queryClient.setQueryData(['cart'], mockCart);
    
    render(<AddToCartButton product={mockProduct} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Already in Cart');
  });
});
```

**Key Differences:**
- **HLD:** Architecture, patterns, trade-offs
- **LLD:** Implementation, state management, edge cases, tests

---

### Example 2: Search Feature

#### HLD: Search System Architecture

```markdown
# HLD: Search System

## Components
1. Search Bar (input component)
2. Autocomplete Dropdown (suggestions)
3. Search Results Page (full results)
4. Filters (category, price, rating)
5. Search History (recent searches)

## Data Flow

User Input → Debounce → API Call → Cache → Display

## State Management
- Search query: URL state (shareable)
- Autocomplete: React Query (cached)
- Filters: URL params (bookmarkable)
- History: LocalStorage (persisted)

## Performance
- Debounce: 300ms
- Cache: 5 minutes
- Prefetch on hover
- Virtualize results (1000+ items)

## Scale
- Elasticsearch for search backend
- Redis for autocomplete caching
- CDN for static result pages
```

#### LLD: SearchBar Component

```typescript
// Complete implementation with:
// - Debouncing
// - Keyboard navigation
// - Accessibility
// - Error handling
// - Loading states
// - Tests

function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  
  const { data, isLoading } = useQuery(
    ['autocomplete', debouncedQuery],
    () => fetchSuggestions(debouncedQuery),
    { enabled: debouncedQuery.length >= 2 }
  );
  
  // ... full implementation
}
```

---

## 4. Interview-Oriented Explanation

### Sample Interview Answer (7+ Years Experience)

**Question:** "What's the difference between HLD and LLD in frontend interviews?"

**Your Answer:**

> "HLD and LLD are different lenses for looking at the same system.
>
> **High-Level Design is about the forest**—how components fit together, what technology choices make sense, how the system scales. When I'm doing HLD, I'm thinking:
> - What's the component hierarchy?
> - How does data flow through the system?
> - What rendering strategy (CSR, SSR, SSG)?
> - What state management approach?
> - How do we handle 1M users vs 100M users?
>
> I'm drawing boxes and arrows, discussing trade-offs, making architectural decisions. The deliverable is a diagram and rationale, not code.
>
> **Low-Level Design is about the trees**—how a specific component works internally. When I'm doing LLD, I'm thinking:
> - What's the exact implementation?
> - How do I handle this edge case?
> - What data structures do I use?
> - How do I make this performant?
> - What tests do I write?
>
> I'm writing actual code, defining interfaces, implementing algorithms.
>
> **Real example:** At [Company], we needed a dashboard:
>
> **HLD level:** I designed the architecture—React SPA with React Query for data fetching, WebSocket for real-time updates, virtualized scrolling for large datasets. I drew component diagrams, chose state management, planned performance strategy.
>
> **LLD level:** Then I implemented the Chart component—wrote the code with lifecycle hooks, handled WebSocket reconnection, added Intersection Observer for lazy loading, wrote unit tests.
>
> **In interviews:**
> - HLD questions: 'Design Instagram' → 30-45 mins, mostly discussion
> - LLD questions: 'Implement autocomplete' → 45-60 mins, mostly coding
>
> **Both are important.** HLD shows you can architect systems. LLD shows you can build them. Senior/staff engineers need both—the vision to design the right system and the skills to implement it correctly."

---

### When to Use Each in Interviews

**Interviewer asks: "Design a news feed"**
→ This is HLD
- Draw architecture
- Discuss components
- Explain data flow
- Justify technology choices

**Interviewer asks: "Implement a post component"**
→ This is LLD
- Write code
- Handle edge cases
- Add tests
- Optimize performance

**Interviewer asks: "Design and implement autocomplete"**
→ This is BOTH
- Start with HLD (component API, data flow)
- Then LLD (implementation)
- Time management is critical

---

## 5. Code Examples

### Example: Converting HLD to LLD

**HLD: Infinite Scroll Feed**

```markdown
# Architecture

Components:
- Feed Container (manages data fetching)
- Post List (renders posts)
- Post Item (individual post)
- Infinite Scroll Trigger (loads more)

Data Flow:
User scrolls → Trigger visible → Fetch next page → Append to list

Performance:
- Virtual scrolling (only render visible)
- Intersection Observer (trigger loading)
- React Query (caching, deduplication)
```

**LLD: Implementation**

```typescript
// Complete working code
function InfiniteScrollFeed() {
  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery(
    'feed',
    fetchFeed,
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
  
  const posts = data?.pages.flatMap(page => page.posts) ?? [];
  
  const observerRef = useRef();
  const lastPostRef = useCallback((node) => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoading, hasNextPage, fetchNextPage]);
  
  return (
    <VirtualList
      items={posts}
      renderItem={(post, index) => (
        <Post
          key={post.id}
          post={post}
          ref={index === posts.length - 1 ? lastPostRef : null}
        />
      )}
    />
  );
}
```

---

## 6. Why & How Summary

### Why Both Matter

**HLD:**
- Sets direction for the team
- Prevents architectural mistakes
- Ensures system can scale
- Communicates vision to stakeholders

**LLD:**
- Translates vision to reality
- Ensures quality implementation
- Handles real-world edge cases
- Produces maintainable code

**Together:**
- HLD without LLD = Ideas that never ship
- LLD without HLD = Code that doesn't scale

### How to Excel at Both

**For HLD:**
1. Study system design patterns
2. Read engineering blogs (FAANG companies)
3. Practice drawing architectures
4. Learn to explain trade-offs

**For LLD:**
1. Build real projects end-to-end
2. Write production-quality code
3. Practice coding interviews
4. Study data structures and algorithms

**For Interviews:**
1. Clarify which level interviewer wants
2. Start broad (HLD), then dive deep (LLD)
3. Manage time (don't get stuck in details)
4. Think out loud (show your process)

---

## Interview Confidence Boosters

### Quick Reference

**HLD Questions Start With:**
- "Design..."
- "How would you architect..."
- "What would the system look like for..."

**LLD Questions Start With:**
- "Implement..."
- "Write a component that..."
- "Code a function to..."

### Time Management

**HLD Interview (45 mins):**
- 5 mins: Clarify requirements
- 10 mins: Draw architecture
- 15 mins: Discuss key decisions
- 10 mins: Deep dive on one component
- 5 mins: Scale and trade-offs

**LLD Interview (45 mins):**
- 5 mins: Clarify requirements, design API
- 30 mins: Implement with edge cases
- 5 mins: Test
- 5 mins: Optimize and discuss

**Combined (60 mins):**
- 10 mins: HLD (architecture)
- 40 mins: LLD (implementation)
- 10 mins: Scale, test, optimize

### Red Flags

**HLD:**
- ❌ Jumping to code without architecture
- ❌ No justification for choices
- ❌ Ignoring scale considerations

**LLD:**
- ❌ Messy, buggy code
- ❌ No edge case handling
- ❌ Poor naming and structure

**Both:**
- ❌ Not asking clarifying questions
- ❌ Can't explain trade-offs
- ❌ Defensive when questioned

---

**Next Topic:** Functional vs Non-Functional Requirements (Frontend)
