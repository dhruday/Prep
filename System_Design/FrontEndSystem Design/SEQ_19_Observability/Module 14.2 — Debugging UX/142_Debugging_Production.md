# 142. Debugging Production

## 1. High-Level Explanation (Frontend Interview Level)

**Debugging Production** is the practice of identifying and resolving issues in live production environments without access to source code, debuggers, or local development tools—relying on logs, monitoring, remote debugging tools, and safe experimentation techniques.

- **What**: Diagnose production issues using logs, error tracking, session replay, remote DevTools, feature flags—without breaking production
- **Why**: Production issues differ from local (scale, data, network, browsers), need rapid resolution to minimize user impact and revenue loss
- **When**: Critical for production incidents (P0/P1), deployed code misbehaving, intermittent bugs, user-reported issues
- **Role**: Bridge between monitoring alerts and hotfixes enabling rapid incident response

**Key Principle**: "Debug safely without disrupting production"—use non-invasive techniques (logs, replays, sampling) before risky interventions.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Safe Production Debugging Techniques

**1. Log Aggregation**:
```typescript
// Structured logging for production debugging
class ProductionLogger {
  private context: Record<string, any> = {};
  
  setContext(key: string, value: any) {
    this.context[key] = value;
  }
  
  debug(message: string, data?: Record<string, any>) {
    // Only log in development or if debug flag enabled
    if (this.isDebugEnabled()) {
      this.log('DEBUG', message, data);
    }
  }
  
  info(message: string, data?: Record<string, any>) {
    this.log('INFO', message, data);
  }
  
  warn(message: string, data?: Record<string, any>) {
    this.log('WARN', message, data);
  }
  
  error(message: string, error?: Error, data?: Record<string, any>) {
    this.log('ERROR', message, {
      ...data,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      }
    });
  }
  
  private log(level: string, message: string, data?: Record<string, any>) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      
      // Request context
      traceId: this.context.traceId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      
      // Page context
      url: window.location.href,
      userAgent: navigator.userAgent,
      
      // Custom data
      ...data,
      
      // Global context
      ...this.context
    };
    
    // Send to log aggregation service
    this.sendToBackend(logEntry);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console[level.toLowerCase()](message, logEntry);
    }
  }
  
  private isDebugEnabled(): boolean {
    // Check URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') return true;
    
    // Check localStorage flag
    if (localStorage.getItem('debug') === 'true') return true;
    
    // Check environment
    if (process.env.NODE_ENV === 'development') return true;
    
    return false;
  }
  
  private sendToBackend(logEntry: any) {
    // Batch and send via sendBeacon
    navigator.sendBeacon('/api/logs', JSON.stringify(logEntry));
  }
}

export const logger = new ProductionLogger();
```

**2. Remote Debugging with Feature Flags**:
```typescript
// Enable debug mode for specific users
class DebugManager {
  private isDebugUser(): boolean {
    // Check if user is in debug list
    const debugUsers = this.getDebugUsers();
    const currentUser = this.getCurrentUserId();
    
    return debugUsers.includes(currentUser);
  }
  
  private getDebugUsers(): string[] {
    // Fetch from feature flag service
    return window.__DEBUG_USERS__ || [];
  }
  
  enableDebugForUser(userId: string) {
    // Controlled via admin panel or feature flag
    window.__DEBUG_USERS__ = [...(window.__DEBUG_USERS__ || []), userId];
    
    // Enable verbose logging
    logger.setContext('debugMode', true);
    
    // Enable React DevTools production
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE = () => {};
    }
  }
  
  log(message: string, data?: any) {
    if (this.isDebugUser()) {
      logger.debug(`[DEBUG MODE] ${message}`, data);
    }
  }
}

export const debugManager = new DebugManager();
```

**3. Production Source Maps (Private)**:
```typescript
// webpack.config.js
module.exports = {
  mode: 'production',
  devtool: 'hidden-source-map', // Generate source maps but don't reference them
  
  plugins: [
    // Upload source maps to error tracking service (Sentry)
    new SentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'your-org',
      project: 'your-project',
      include: './dist',
      urlPrefix: '~/static/js',
      
      // Delete source maps after upload (don't deploy to CDN)
      deleteAfterCompile: true
    })
  ]
};

// Sentry will use private source maps to unminify stack traces
```

**4. Network Waterfall Analysis**:
```typescript
// Capture network timing for debugging slow requests
class NetworkDebugger {
  captureNetworkTimings() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const timings = resources.map(resource => ({
      name: resource.name,
      type: this.getResourceType(resource.name),
      duration: resource.duration,
      
      // Breakdown
      dns: resource.domainLookupEnd - resource.domainLookupStart,
      tcp: resource.connectEnd - resource.connectStart,
      ssl: resource.connectEnd - resource.secureConnectionStart,
      ttfb: resource.responseStart - resource.requestStart,
      download: resource.responseEnd - resource.responseStart,
      
      // Status
      transferSize: resource.transferSize,
      cached: resource.transferSize === 0,
      
      // Slow?
      slow: resource.duration > 1000
    }));
    
    // Log slow resources
    const slowResources = timings.filter(t => t.slow);
    if (slowResources.length > 0) {
      logger.warn('Slow network resources detected', { slowResources });
    }
    
    return timings;
  }
  
  private getResourceType(url: string): string {
    if (url.endsWith('.js')) return 'script';
    if (url.endsWith('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }
}
```

### Debugging Production Issues

**1. Cannot Reproduce Locally**:
```typescript
// Capture environment differences
interface EnvironmentSnapshot {
  browser: string;
  version: string;
  os: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  language: string;
  timezone: string;
  connection: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  cookies: boolean;
  localStorage: boolean;
  serviceWorker: boolean;
}

function captureEnvironment(): EnvironmentSnapshot {
  return {
    browser: navigator.userAgent,
    version: navigator.appVersion,
    os: navigator.platform,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    devicePixelRatio: window.devicePixelRatio,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection: {
      effectiveType: (navigator as any).connection?.effectiveType || 'unknown',
      downlink: (navigator as any).connection?.downlink || 0,
      rtt: (navigator as any).connection?.rtt || 0
    },
    cookies: navigator.cookieEnabled,
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return true;
      } catch {
        return false;
      }
    })(),
    serviceWorker: 'serviceWorker' in navigator
  };
}

// Log environment on error
window.addEventListener('error', (event) => {
  logger.error('Uncaught error', event.error, {
    environment: captureEnvironment()
  });
});
```

**2. Intermittent Issues**:
```typescript
// Sampling strategy for intermittent bugs
class IntermittentDebugger {
  private sampleRate = 0.1; // 10% of users
  private shouldSample = Math.random() < this.sampleRate;
  
  trackState(key: string, value: any) {
    if (!this.shouldSample) return;
    
    // Store state snapshots
    const stateLog = this.getStateLog();
    stateLog.push({
      timestamp: Date.now(),
      key,
      value: this.sanitize(value)
    });
    
    // Keep last 100 entries
    if (stateLog.length > 100) {
      stateLog.shift();
    }
    
    sessionStorage.setItem('debug_state_log', JSON.stringify(stateLog));
  }
  
  captureSnapshot() {
    if (!this.shouldSample) return;
    
    return {
      stateLog: this.getStateLog(),
      redux: window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.(),
      localStorageKeys: Object.keys(localStorage),
      sessionStorageKeys: Object.keys(sessionStorage),
      cookies: document.cookie.split(';').map(c => c.split('=')[0].trim())
    };
  }
  
  private getStateLog(): any[] {
    const log = sessionStorage.getItem('debug_state_log');
    return log ? JSON.parse(log) : [];
  }
  
  private sanitize(value: any): any {
    // Remove sensitive data
    if (typeof value === 'object') {
      const sanitized = { ...value };
      delete sanitized.password;
      delete sanitized.creditCard;
      delete sanitized.ssn;
      return sanitized;
    }
    return value;
  }
}

const intermittentDebugger = new IntermittentDebugger();

// Track key state changes
function setState(key: string, value: any) {
  intermittentDebugger.trackState(key, value);
  // ... actual state update
}
```

**3. User-Specific Issues**:
```typescript
// Debug mode for specific user (via URL param or admin panel)
class UserDebugMode {
  private enabled = false;
  
  init() {
    // Check URL param: ?debug_user=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug_user') === 'true') {
      this.enabled = true;
      this.enableDebugTools();
    }
    
    // Check localStorage (set via admin panel)
    if (localStorage.getItem('debug_mode') === 'enabled') {
      this.enabled = true;
      this.enableDebugTools();
    }
  }
  
  private enableDebugTools() {
    // 1. Verbose logging
    logger.setContext('debugMode', true);
    
    // 2. Expose state to window
    if (window.__REDUX_STORE__) {
      window.__DEBUG_STATE__ = window.__REDUX_STORE__.getState();
    }
    
    // 3. Enable React DevTools in production
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE = () => {};
    }
    
    // 4. Log all API calls
    this.interceptFetch();
    
    // 5. Log all state changes
    this.interceptStateChanges();
    
    console.log('[DEBUG MODE ENABLED] Verbose logging activated');
  }
  
  private interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      logger.debug(`[FETCH] ${args[0]}`, { method: (args[1] as any)?.method || 'GET' });
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        logger.debug(`[FETCH COMPLETE] ${args[0]}`, {
          status: response.status,
          duration
        });
        
        return response;
      } catch (error) {
        logger.error(`[FETCH ERROR] ${args[0]}`, error as Error);
        throw error;
      }
    };
  }
  
  private interceptStateChanges() {
    // Redux middleware
    if (window.__REDUX_STORE__) {
      const originalDispatch = window.__REDUX_STORE__.dispatch;
      
      window.__REDUX_STORE__.dispatch = (action: any) => {
        logger.debug('[REDUX ACTION]', { type: action.type, payload: action.payload });
        return originalDispatch(action);
      };
    }
  }
}

const userDebugMode = new UserDebugMode();
userDebugMode.init();
```

### Chrome DevTools Production Debugging

**Remote Debugging**:
```typescript
// Enable remote debugging for production (carefully!)
if (process.env.REACT_APP_REMOTE_DEBUG === 'true') {
  // Load remote debugging tool (e.g., Eruda for mobile)
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/eruda';
  script.onload = () => {
    (window as any).eruda.init();
  };
  document.body.appendChild(script);
}

// Or use Chrome DevTools Protocol for controlled debugging
class RemoteDevTools {
  connect(websocketUrl: string) {
    const ws = new WebSocket(websocketUrl);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // Handle remote debugging commands
      if (message.method === 'Runtime.evaluate') {
        this.evaluateCode(message.params.expression);
      }
    };
  }
  
  private evaluateCode(expression: string) {
    try {
      const result = eval(expression);
      logger.debug('[REMOTE EVAL]', { expression, result });
    } catch (error) {
      logger.error('[REMOTE EVAL ERROR]', error as Error);
    }
  }
}
```

### Performance Profiling in Production

```typescript
// Measure component render times
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  // Only log slow renders in production
  if (actualDuration > 16) { // > 1 frame (60fps)
    logger.warn('Slow render detected', {
      component: id,
      phase,
      actualDuration: Math.round(actualDuration),
      baseDuration: Math.round(baseDuration),
      wasted: Math.round(baseDuration - actualDuration)
    });
  }
};

// Wrap expensive components
function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <ExpensiveComponent />
    </Profiler>
  );
}
```

### What NOT to Do

- ❌ **Use debugger statements** (blocks all users)
- ❌ **Expose source maps publicly** (security risk)
- ❌ **console.log in production** (performance, leaks data)
- ❌ **Debug in production without sampling** (affects all users)
- ❌ **Deploy unminified code** (large bundles, exposed logic)

---

## 3. Clear Real-World Examples

### Example 1: Sentry Session Replay

```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_DSN',
  integrations: [
    new Sentry.Replay({
      // Replay 10% of sessions
      sessionSampleRate: 0.1,
      
      // Replay 100% of sessions with errors
      errorSampleRate: 1.0,
      
      // Mask sensitive data
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: true
    })
  ]
});

// When error occurs, replay is automatically captured
// View in Sentry dashboard: Replays → Watch video of user session
```

### Example 2: LogRocket

```typescript
import LogRocket from 'logrocket';

LogRocket.init('your-app/project');

// Identify user
LogRocket.identify(user.id, {
  name: user.name,
  email: user.email,
  plan: user.plan
});

// When debugging issue, get session URL
LogRocket.getSessionURL((sessionURL) => {
  logger.info('LogRocket session', { sessionURL });
  // Send to support team or attach to bug report
});

// React integration
import setupLogRocketReact from 'logrocket-react';
setupLogRocketReact(LogRocket);
```

### Example 3: Feature Flag Debug Mode

```typescript
import { useFeatureFlag } from './featureFlags';

function Component() {
  const debugMode = useFeatureFlag('debug_mode_enabled');
  
  useEffect(() => {
    if (debugMode) {
      // Enable verbose logging for this user
      logger.setContext('debugEnabled', true);
      console.log('[DEBUG] Component mounted', { props });
    }
  }, [debugMode]);
  
  return <div>...</div>;
}

// Enable via LaunchDarkly/Split.io admin panel for specific user
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How do you debug issues that only happen in production?"

**Answer**:

"I use **non-invasive production debugging**:

**1. Log Aggregation**:

Structured logs with context:
```typescript
logger.error('Payment failed', error, {
  userId: '123',
  traceId: 'abc',
  amount: 99.99
});
```

Centralized in Datadog/ELK. Query: `traceId:abc` → full request flow.

**2. Session Replay**:

Sentry Replay or LogRocket:
- Records DOM snapshots, interactions, network
- Replay user session like video
- Sample 10% normally, 100% on errors

**3. Source Maps (Private)**:

Generate with `hidden-source-map`, upload to Sentry:
```javascript
// webpack: hidden-source-map (don't expose publicly)
// Upload to Sentry via SentryWebpackPlugin
// Delete after upload (deleteAfterCompile: true)
```

Unminified stack traces without exposing source.

**4. Feature Flag Debug**:

Enable debug mode for specific user:
```typescript
if (featureFlags.get('debug_user_123')) {
  enableVerboseLogging();
}
```

Controlled via LaunchDarkly admin panel. Safe (only that user affected).

**5. Environment Snapshot**:

Capture on error:
```typescript
{
  browser: 'Chrome 120',
  os: 'Windows',
  viewport: '1920x1080',
  connection: '4g',
  localStorage: true
}
```

Helps reproduce (many bugs are environment-specific).

**6. Network Waterfall**:

```typescript
performance.getEntriesByType('resource')
```

Identify slow API calls, failed requests, caching issues.

**7. React Profiler**:

```typescript
<Profiler id="App" onRender={onRenderCallback}>
```

Log slow renders (> 16ms). Identify performance regressions.

**8. Sampling**:

Don't debug 100% of traffic:
- 10% session replay (cost)
- 100% errors (critical)
- Feature flag for specific users (targeted)

**Cannot Use**:
- ❌ `debugger` statements (blocks all users)
- ❌ Public source maps (security risk)
- ❌ `console.log` everywhere (performance, data leakage)

**Real-World**:

At my last company, checkout mysteriously failed for Safari users. Used:
1. Sentry → Safari-specific error (localStorage quota exceeded)
2. Session replay → Confirmed Safari Private Mode
3. Fix → Graceful fallback to sessionStorage

**Trade-offs**:

Session replay adds ~50KB bundle + storage cost. Sample 10%, but 100% on errors. Balance detail vs cost."

---

## 6. Why & How Summary

### Why It Matters

**Production Different**: Scale, data, browsers, network conditions  
**Rapid Resolution**: Minimize user impact and revenue loss  
**Safe Debugging**: Don't disrupt production for all users

### How It Works

**1. Logs**: Structured, centralized (Datadog/ELK), contextual (traceId, userId)  
**2. Replay**: Session recording (Sentry/LogRocket), watch user actions  
**3. Source Maps**: Private upload (Sentry), unminified stacks, not public  
**4. Feature Flags**: Debug mode for specific users, safe experimentation  
**5. Sampling**: 10% sessions, 100% errors, targeted debugging

**FAANG**: Session replay, log aggregation, feature flag debug modes, private source maps, sampling strategies, safe production debugging
