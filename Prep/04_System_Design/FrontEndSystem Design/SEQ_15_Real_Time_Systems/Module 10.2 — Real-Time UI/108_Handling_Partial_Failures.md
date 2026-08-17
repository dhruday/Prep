# 108. Handling Partial Failures

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**Handling Partial Failures** refers to strategies for dealing with situations where some parts of a real-time system fail while others continue working. Instead of failing completely, the application **gracefully degrades** to provide the best possible experience with available resources.

### **What It Is:**
- **Partial connectivity**: Some API endpoints work, others don't
- **Degraded service**: Core features work, non-essential features disabled
- **Fallback mechanisms**: Switch to alternative data sources
- **Isolated failures**: One component fails without cascading
- **User transparency**: Communicate what's working and what's not

### **Why It Matters:**
- **Availability**: Keep app usable even during partial outages
- **UX**: Better than complete failure or blank page
- **Reliability**: Isolated failures don't bring down entire system
- **Business continuity**: Critical features remain accessible

### **When and Where Used:**
- Multi-service architectures (microservices)
- Real-time dashboards (some widgets fail)
- Chat apps (messages work, presence doesn't)
- E-commerce (catalog works, recommendations don't)
- Social media (timeline works, notifications don't)

### **Role in Large-Scale Applications:**
At FAANG scale:
- **Service dependencies**: 100+ services, some always failing
- **Bulkheads**: Isolate failures to prevent cascade
- **Fallbacks**: Cached data, default values, degraded modes
- **Monitoring**: Track partial failure rate, user impact
- **Graceful degradation**: Core features prioritized over extras

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### **A. Isolation Patterns**

#### **1. Bulkhead Pattern (Error Boundaries)**
```javascript
// React Error Boundary to isolate failures
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
    
    // Log to monitoring service
    logError(error, {
      componentStack: errorInfo.componentStack,
      component: this.props.name
    });
  }
  
  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback || (
        <div className="error-state">
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage: Isolate each widget
function Dashboard() {
  return (
    <div className="dashboard">
      <ErrorBoundary name="sales-chart" fallback={<ChartFallback />}>
        <SalesChart />
      </ErrorBoundary>
      
      <ErrorBoundary name="user-stats" fallback={<StatsFallback />}>
        <UserStats />
      </ErrorBoundary>
      
      <ErrorBoundary name="activity-feed" fallback={<FeedFallback />}>
        <ActivityFeed />
      </ErrorBoundary>
    </div>
  );
}

// If SalesChart fails, other widgets continue working
```

#### **2. Promise.allSettled (Don't Fail Fast)**
```javascript
// ❌ Bad: Promise.all fails if any request fails
async function loadDashboard() {
  try {
    const [sales, users, activity] = await Promise.all([
      fetchSalesData(),
      fetchUserStats(),
      fetchActivity()
    ]);
    
    // If any fails, all fail
    return { sales, users, activity };
  } catch (error) {
    // Dashboard completely broken
    throw error;
  }
}

// ✅ Good: Promise.allSettled handles partial failures
async function loadDashboardResilient() {
  const results = await Promise.allSettled([
    fetchSalesData(),
    fetchUserStats(),
    fetchActivity()
  ]);
  
  const data = {
    sales: results[0].status === 'fulfilled' ? results[0].value : null,
    users: results[1].status === 'fulfilled' ? results[1].value : null,
    activity: results[2].status === 'fulfilled' ? results[2].value : null,
    errors: results
      .filter(r => r.status === 'rejected')
      .map((r, i) => ({ index: i, reason: r.reason }))
  };
  
  return data;
}

// Dashboard shows what loaded, displays errors for what didn't
```

#### **3. Independent Data Fetching**
```javascript
function DashboardWidget({ fetchData, fallback, name }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let cancelled = false;
    
    fetchData()
      .then(result => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          console.error(`${name} failed:`, err);
          
          // Try fallback
          if (fallback) {
            fallback().then(setData).catch(console.error);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    
    return () => {
      cancelled = true;
    };
  }, [fetchData, fallback, name]);
  
  if (loading) return <Skeleton />;
  if (error && !data) return <ErrorState error={error} />;
  if (!data) return <EmptyState />;
  
  return <WidgetContent data={data} hasError={!!error} />;
}

// Usage
function Dashboard() {
  return (
    <>
      <DashboardWidget
        name="Sales"
        fetchData={fetchSalesData}
        fallback={fetchCachedSalesData}
      />
      
      <DashboardWidget
        name="Users"
        fetchData={fetchUserStats}
        fallback={fetchCachedUserStats}
      />
      
      <DashboardWidget
        name="Activity"
        fetchData={fetchActivity}
      />
    </>
  );
}
```

---

### **B. Fallback Strategies**

#### **1. Cached Data Fallback**
```javascript
class CachedAPIClient {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }
  
  async fetch(url, options = {}) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    
    try {
      // Try live request
      const response = await fetch(url, options);
      const data = await response.json();
      
      // Cache successful response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return { data, cached: false };
      
    } catch (error) {
      console.error('Live request failed:', error);
      
      // Try cache
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        
        if (age < this.cacheTTL || options.staleOk) {
          console.log('Using cached data');
          return {
            data: cached.data,
            cached: true,
            age
          };
        } else {
          console.log('Cache too old');
        }
      }
      
      // No cache, rethrow error
      throw error;
    }
  }
}

// Usage
const api = new CachedAPIClient();

async function loadUserProfile(userId) {
  try {
    const { data, cached, age } = await api.fetch(`/api/users/${userId}`, {
      staleOk: true // Accept stale cache on error
    });
    
    if (cached) {
      showWarning(`Using cached data (${Math.round(age / 1000)}s old)`);
    }
    
    return data;
  } catch (error) {
    showError('Failed to load profile and no cached data available');
    throw error;
  }
}
```

#### **2. Default Values Fallback**
```javascript
async function loadDashboardData() {
  const defaults = {
    sales: { total: 0, trend: 'unknown' },
    users: { count: 0, active: 0 },
    notifications: []
  };
  
  try {
    const data = await fetchDashboardData();
    return { ...defaults, ...data, partial: false };
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    
    // Return defaults with warning
    return {
      ...defaults,
      partial: true,
      error: error.message
    };
  }
}

// UI handles partial data
function Dashboard({ data }) {
  return (
    <div className="dashboard">
      {data.partial && (
        <Alert type="warning">
          Some data couldn't be loaded. Showing partial information.
        </Alert>
      )}
      
      <SalesWidget data={data.sales} />
      <UserWidget data={data.users} />
      <NotificationWidget data={data.notifications} />
    </div>
  );
}
```

#### **3. Degraded Mode**
```javascript
class FeatureToggle {
  constructor() {
    this.features = {
      realTimeUpdates: true,
      notifications: true,
      recommendations: true,
      analytics: true
    };
    
    this.degradedMode = false;
  }
  
  isEnabled(feature) {
    if (this.degradedMode) {
      // In degraded mode, only core features enabled
      const coreFeatures = ['realTimeUpdates'];
      return coreFeatures.includes(feature) && this.features[feature];
    }
    
    return this.features[feature];
  }
  
  enterDegradedMode() {
    console.log('Entering degraded mode');
    this.degradedMode = true;
    
    // Disable non-essential features
    this.features.notifications = false;
    this.features.recommendations = false;
    this.features.analytics = false;
  }
  
  exitDegradedMode() {
    console.log('Exiting degraded mode');
    this.degradedMode = false;
    
    // Re-enable all features
    Object.keys(this.features).forEach(key => {
      this.features[key] = true;
    });
  }
}

const featureToggle = new FeatureToggle();

// Monitor failures and enter degraded mode if needed
let consecutiveFailures = 0;

socket.on('error', () => {
  consecutiveFailures++;
  
  if (consecutiveFailures >= 3) {
    featureToggle.enterDegradedMode();
    showNotification('Running in limited mode due to connectivity issues');
  }
});

socket.on('connect', () => {
  consecutiveFailures = 0;
  featureToggle.exitDegradedMode();
});

// Usage
function App() {
  return (
    <>
      <ChatMessages /> {/* Always enabled */}
      
      {featureToggle.isEnabled('notifications') && (
        <NotificationBell />
      )}
      
      {featureToggle.isEnabled('recommendations') && (
        <RecommendedContent />
      )}
    </>
  );
}
```

---

### **C. Timeout & Retry**

#### **1. Per-Request Timeouts**
```javascript
async function fetchWithTimeout(url, options = {}) {
  const timeout = options.timeout || 5000;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

// Usage with fallback
async function loadCriticalData() {
  try {
    // Try primary source with 3s timeout
    const data = await fetchWithTimeout('/api/data', { timeout: 3000 });
    return await data.json();
  } catch (error) {
    console.error('Primary source failed:', error);
    
    try {
      // Try fallback source with 5s timeout
      const data = await fetchWithTimeout('/api/data/cached', { timeout: 5000 });
      return await data.json();
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw new Error('All data sources unavailable');
    }
  }
}
```

#### **2. Retry with Circuit Breaker**
```javascript
class ResilientFetcher {
  constructor() {
    this.circuits = new Map(); // URL -> circuit state
  }
  
  async fetch(url, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    // Check circuit breaker
    const circuit = this.circuits.get(url);
    if (circuit && circuit.state === 'OPEN' && Date.now() < circuit.nextAttempt) {
      throw new Error(`Circuit breaker OPEN for ${url}`);
    }
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, options);
        
        // Success - close circuit
        this.circuits.delete(url);
        
        return response;
        
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        
        if (attempt === maxRetries - 1) {
          // All retries failed - open circuit
          this.circuits.set(url, {
            state: 'OPEN',
            nextAttempt: Date.now() + 60000 // Try again in 1 minute
          });
          
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }
}

const fetcher = new ResilientFetcher();

// Usage
async function loadData() {
  try {
    const response = await fetcher.fetch('/api/data', {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 5000
    });
    return await response.json();
  } catch (error) {
    // Show fallback UI
    return null;
  }
}
```

---

### **D. User Communication**

#### **1. Granular Error Messages**
```javascript
function Dashboard() {
  const { data, errors } = useDashboardData();
  
  return (
    <div className="dashboard">
      {errors.length > 0 && (
        <Alert type="warning">
          <h4>Some data couldn't be loaded:</h4>
          <ul>
            {errors.map((err, i) => (
              <li key={i}>
                <strong>{err.component}</strong>: {err.message}
              </li>
            ))}
          </ul>
          <button onClick={retryFailedComponents}>Retry</button>
        </Alert>
      )}
      
      <SalesChart data={data.sales} error={errors.find(e => e.component === 'sales')} />
      <UserStats data={data.users} error={errors.find(e => e.component === 'users')} />
      <ActivityFeed data={data.activity} error={errors.find(e => e.component === 'activity')} />
    </div>
  );
}

function SalesChart({ data, error }) {
  if (error) {
    return (
      <div className="chart-error">
        <Icon name="warning" />
        <p>Sales data unavailable</p>
        <small>{error.message}</small>
      </div>
    );
  }
  
  if (!data) {
    return <Skeleton />;
  }
  
  return <Chart data={data} />;
}
```

#### **2. Status Indicators**
```javascript
function ConnectionStatus() {
  const [status, setStatus] = useState({
    websocket: 'connected',
    api: 'connected',
    cache: 'available'
  });
  
  useEffect(() => {
    socket.on('connect', () => {
      setStatus(prev => ({ ...prev, websocket: 'connected' }));
    });
    
    socket.on('disconnect', () => {
      setStatus(prev => ({ ...prev, websocket: 'disconnected' }));
    });
    
    // Monitor API health
    const healthCheck = setInterval(async () => {
      try {
        await fetch('/api/health', { timeout: 2000 });
        setStatus(prev => ({ ...prev, api: 'connected' }));
      } catch {
        setStatus(prev => ({ ...prev, api: 'degraded' }));
      }
    }, 30000);
    
    return () => clearInterval(healthCheck);
  }, []);
  
  const overallStatus = Object.values(status).some(s => s === 'disconnected')
    ? 'offline'
    : Object.values(status).some(s => s === 'degraded')
    ? 'degraded'
    : 'online';
  
  return (
    <div className={`status status-${overallStatus}`}>
      <StatusIcon status={overallStatus} />
      
      {overallStatus === 'degraded' && (
        <Tooltip>
          <h4>Limited connectivity</h4>
          <ul>
            {Object.entries(status).map(([key, value]) => (
              <li key={key}>
                {key}: <StatusBadge status={value} />
              </li>
            ))}
          </ul>
        </Tooltip>
      )}
    </div>
  );
}
```

---

### **E. Monitoring & Alerting**

#### **1. Track Partial Failure Rate**
```javascript
class PartialFailureMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      partialFailures: 0,
      completeFailures: 0,
      componentFailures: {}
    };
  }
  
  recordRequest(components) {
    this.metrics.totalRequests++;
    
    const failed = components.filter(c => c.error);
    
    if (failed.length === 0) {
      this.metrics.successfulRequests++;
    } else if (failed.length === components.length) {
      this.metrics.completeFailures++;
    } else {
      this.metrics.partialFailures++;
      
      // Track which components failed
      failed.forEach(c => {
        this.metrics.componentFailures[c.name] = 
          (this.metrics.componentFailures[c.name] || 0) + 1;
      });
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      partialFailureRate: this.metrics.totalRequests > 0
        ? this.metrics.partialFailures / this.metrics.totalRequests
        : 0
    };
  }
}

const metrics = new PartialFailureMetrics();

// Send to monitoring
setInterval(() => {
  const data = metrics.getMetrics();
  
  if (data.partialFailureRate > 0.1) {
    // Alert: >10% partial failure rate
    sendAlert('High partial failure rate', data);
  }
  
  analytics.track('partial_failures', data);
}, 60000);
```

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### **Example 1: Netflix**
- Video playback continues even if recommendations fail
- Shows "Some features unavailable" banner
- Falls back to cached thumbnails if CDN slow
- Degrades video quality rather than buffering
- Each UI widget isolated with error boundaries

### **Example 2: Amazon**
- Product page loads even if reviews service down
- Shows "Reviews unavailable" instead of failing page
- Recommendations fall back to popular items
- Cached prices if pricing service slow
- Checkout always prioritized over other features

### **Example 3: Gmail**
- Inbox works even if labels service fails
- Search falls back to client-side filter if slow
- Compose available even if contacts down
- Shows warning banner for degraded features
- 3-second timeout per component

### **Example 4: Slack**
- Messages work even if presence service down
- Shows "Last seen: unavailable" instead of hiding users
- File uploads queue if CDN temporarily unavailable
- Emoji reactions work even if emoji service slow
- Each workspace channel isolated (failure doesn't cascade)

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### **Sample Answer**

> *"For partial failures, the key is isolation—don't let one component's failure bring down the entire app. I'd use React Error Boundaries to isolate each dashboard widget, so if one fails, others continue working."*
>
> *"For data fetching, use Promise.allSettled instead of Promise.all—this way, some requests can fail while others succeed. The UI shows successfully loaded data and displays error states for failed components."*
>
> *"Implement fallbacks at multiple levels: first try live API, if that fails try cached data (up to 5 minutes old), if no cache use default values. This ensures the UI always has something to show, even if degraded."*
>
> *"For critical features like checkout, implement aggressive retries with circuit breakers—retry up to 3 times with exponential backoff, but if all fail, open circuit breaker for 1 minute to prevent overwhelming the service. Show user a clear error message with retry option."*
>
> *"Communicate status transparently—show banner saying 'Some features unavailable due to connectivity issues' with details on what's affected. Users appreciate knowing what's wrong rather than silent failures."*

────────────────────────────────────
## 5. Code Examples
────────────────────────────────────

See Deep-Dive section for comprehensive implementations.

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### **Why It Matters**
- **Availability**: Keep app usable during partial outages
- **UX**: Better than complete failure
- **Business**: Revenue continues even with some services down
- **Reliability**: Isolated failures prevent cascades

### **How It Works**
1. **Isolation**: Error boundaries, independent data fetching
2. **Fallbacks**: Cached data, default values, degraded mode
3. **Timeouts**: Fail fast, don't wait forever
4. **Retries**: Exponential backoff with circuit breakers
5. **Communication**: Show what's working, what's not
6. **Monitoring**: Track partial failure rate

### **Key Patterns**
- Error Boundaries (React)
- Promise.allSettled (don't fail fast)
- Circuit Breaker (prevent overwhelming)
- Cached fallbacks (stale data better than no data)
- Degraded mode (disable non-essential features)
