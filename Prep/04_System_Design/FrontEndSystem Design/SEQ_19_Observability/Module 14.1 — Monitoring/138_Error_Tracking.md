# 138. Error Tracking

## 1. High-Level Explanation (Frontend Interview Level)

**Error Tracking** is the systematic process of capturing, aggregating, and analyzing JavaScript errors, unhandled exceptions, and API failures in production to enable rapid debugging and prevent user-impacting issues.

- **What**: Automated capture of runtime errors, stack traces, user context, environment data—centralized in error monitoring platforms (Sentry, Rollbar, Bugsnag)
- **Why**: Detect errors before users report them, debug with full context, measure error rates, prioritize fixes, prevent cascading failures
- **When**: Essential for all production apps, critical for high-traffic sites, required for SLA monitoring, compliance auditing
- **Role**: Core reliability practice enabling proactive issue detection and rapid incident response

**Key Principle**: "Fail fast, fail visible"—surface errors immediately with full context for rapid resolution.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Error Capture Mechanisms

**1. Global Error Handlers**:
```typescript
// Capture unhandled errors
window.addEventListener('error', (event: ErrorEvent) => {
  const error = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack
  };
  
  trackError(error, {
    type: 'uncaught-error',
    url: window.location.href,
    userAgent: navigator.userAgent
  });
  
  // Prevent default console error (already captured)
  event.preventDefault();
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const error = {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack
  };
  
  trackError(error, {
    type: 'unhandled-rejection',
    url: window.location.href
  });
  
  event.preventDefault();
});
```

**2. Error Tracking Service**:
```typescript
interface ErrorReport {
  // Error details
  message: string;
  stack: string;
  type: string; // 'Error' | 'TypeError' | 'ReferenceError' | etc.
  
  // Context
  url: string;
  userAgent: string;
  platform: string;
  viewport: { width: number; height: number };
  
  // User info
  userId?: string;
  sessionId: string;
  traceId: string;
  
  // Environment
  environment: 'dev' | 'staging' | 'production';
  version: string;
  releaseId: string;
  
  // Timing
  timestamp: string;
  timeSincePageLoad: number;
  
  // State
  breadcrumbs: Breadcrumb[];
  tags: Record<string, string>;
  extra: Record<string, any>;
  
  // Source maps
  originalError?: {
    filename: string;
    lineno: number;
    colno: number;
  };
}

interface Breadcrumb {
  type: 'navigation' | 'http' | 'console' | 'user' | 'error';
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  timestamp: number;
  data?: Record<string, any>;
}

class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private errorQueue: ErrorReport[] = [];
  private isEnabled = true;
  
  constructor(private config: {
    dsn: string;
    environment: string;
    release: string;
    sampleRate?: number;
  }) {
    this.initializeHandlers();
  }
  
  private initializeHandlers() {
    // Global error handler
    window.addEventListener('error', this.handleError.bind(this));
    window.addEventListener('unhandledrejection', this.handleRejection.bind(this));
    
    // Track navigation
    this.addBreadcrumb({
      type: 'navigation',
      category: 'navigation',
      message: `Navigated to ${window.location.pathname}`,
      level: 'info',
      timestamp: Date.now()
    });
    
    // Intercept console errors
    this.interceptConsole();
    
    // Intercept fetch/XHR
    this.interceptNetwork();
  }
  
  private handleError(event: ErrorEvent) {
    const error = event.error || new Error(event.message);
    
    this.captureException(error, {
      type: 'uncaught-error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }
  
  private handleRejection(event: PromiseRejectionEvent) {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.captureException(error, {
      type: 'unhandled-rejection'
    });
  }
  
  captureException(error: Error, context?: Record<string, any>) {
    if (!this.isEnabled) return;
    
    // Sample errors
    if (this.config.sampleRate && Math.random() > this.config.sampleRate) {
      return;
    }
    
    const report: ErrorReport = {
      // Error details
      message: error.message,
      stack: error.stack || new Error().stack || '',
      type: error.name,
      
      // Context
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: this.getPlatform(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      
      // User info
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      traceId: this.getTraceId(),
      
      // Environment
      environment: this.config.environment as any,
      version: this.config.release,
      releaseId: this.config.release,
      
      // Timing
      timestamp: new Date().toISOString(),
      timeSincePageLoad: performance.now(),
      
      // State
      breadcrumbs: [...this.breadcrumbs],
      tags: this.getTags(context),
      extra: context || {},
      
      // Original error location
      originalError: context as any
    };
    
    // Add to queue
    this.errorQueue.push(report);
    
    // Send immediately for critical errors
    if (this.isCriticalError(error)) {
      this.flush();
    } else {
      // Batch send after 5s
      setTimeout(() => this.flush(), 5000);
    }
    
    // Add breadcrumb for this error
    this.addBreadcrumb({
      type: 'error',
      category: 'error',
      message: error.message,
      level: 'error',
      timestamp: Date.now(),
      data: { stack: error.stack }
    });
  }
  
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    // Capture non-error messages
    this.captureException(new Error(message), {
      ...context,
      level,
      type: 'message'
    });
  }
  
  addBreadcrumb(breadcrumb: Breadcrumb) {
    this.breadcrumbs.push(breadcrumb);
    
    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }
  
  private interceptConsole() {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      this.addBreadcrumb({
        type: 'console',
        category: 'console',
        message: args.join(' '),
        level: 'error',
        timestamp: Date.now()
      });
      
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      this.addBreadcrumb({
        type: 'console',
        category: 'console',
        message: args.join(' '),
        level: 'warning',
        timestamp: Date.now()
      });
      
      originalWarn.apply(console, args);
    };
  }
  
  private interceptNetwork() {
    // Intercept fetch
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0] instanceof Request ? args[0].url : String(args[0]);
      
      try {
        const response = await originalFetch(...args);
        
        this.addBreadcrumb({
          type: 'http',
          category: 'fetch',
          message: `${response.status} ${url}`,
          level: response.ok ? 'info' : 'error',
          timestamp: Date.now(),
          data: {
            url,
            status: response.status,
            duration: Date.now() - startTime
          }
        });
        
        // Track failed API calls
        if (!response.ok) {
          this.captureMessage(`API Error: ${response.status} ${url}`, 'error', {
            url,
            status: response.status,
            duration: Date.now() - startTime
          });
        }
        
        return response;
      } catch (error) {
        this.addBreadcrumb({
          type: 'http',
          category: 'fetch',
          message: `Network error: ${url}`,
          level: 'error',
          timestamp: Date.now(),
          data: { url, error: String(error) }
        });
        
        throw error;
      }
    };
  }
  
  private async flush() {
    if (this.errorQueue.length === 0) return;
    
    const errors = [...this.errorQueue];
    this.errorQueue = [];
    
    try {
      await this.sendErrors(errors);
    } catch (error) {
      console.error('Failed to send errors:', error);
    }
  }
  
  private async sendErrors(errors: ErrorReport[]) {
    const endpoint = this.config.dsn;
    
    // Use sendBeacon for reliability
    if (navigator.sendBeacon && document.hidden) {
      const blob = new Blob([JSON.stringify({ errors })], {
        type: 'application/json'
      });
      
      navigator.sendBeacon(endpoint, blob);
      return;
    }
    
    // Regular fetch
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors }),
      keepalive: true
    });
  }
  
  private isCriticalError(error: Error): boolean {
    // Critical error patterns
    const critical = [
      /payment/i,
      /checkout/i,
      /auth/i,
      /security/i
    ];
    
    return critical.some(pattern => pattern.test(error.message));
  }
  
  private getTags(context?: Record<string, any>): Record<string, string> {
    return {
      browser: this.getBrowser(),
      os: this.getOS(),
      ...context
    };
  }
  
  private getPlatform(): string {
    return /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) 
      ? 'mobile-web' 
      : 'web';
  }
  
  private getBrowser(): string {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua)) return 'Safari';
    if (/Edge/i.test(ua)) return 'Edge';
    return 'Unknown';
  }
  
  private getOS(): string {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    if (/Android/i.test(ua)) return 'Android';
    if (/iOS/i.test(ua)) return 'iOS';
    return 'Unknown';
  }
  
  private getUserId(): string | undefined {
    return window.__USER_ID__;
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }
  
  private getTraceId(): string {
    return window.__TRACE_ID__ || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Initialize
export const errorTracker = new ErrorTracker({
  dsn: process.env.REACT_APP_ERROR_DSN!,
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_VERSION!,
  sampleRate: 1.0 // 100% in production
});
```

### React Error Boundaries

**Comprehensive Error Boundary**:
```typescript
interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error with full context
    errorTracker.captureException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'root',
      reactVersion: React.version
    });
    
    // Custom handler
    this.props.onError?.(error, errorInfo);
  }
  
  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error!} reset={this.reset} />;
      }
      
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <button onClick={this.reset}>Try again</button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={ErrorFallback} onError={(error) => console.error(error)}>
  <App />
</ErrorBoundary>
```

### Source Maps

**Enable Source Map Upload**:
```typescript
// webpack.config.js
module.exports = {
  devtool: 'hidden-source-map', // Generate source maps but don't include inline
  
  plugins: [
    // Upload source maps to Sentry
    new SentryWebpackPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'your-org',
      project: 'your-project',
      
      include: './dist',
      urlPrefix: '~/static/js',
      
      // Delete local source maps after upload
      deleteAfterCompile: true
    })
  ]
};
```

**Benefits**: Error stack traces show original source code (not minified).

### Error Grouping & Fingerprinting

**Group Similar Errors**:
```typescript
function generateErrorFingerprint(error: ErrorReport): string {
  // Group by error message + stack trace top 3 frames
  const stackFrames = error.stack.split('\n').slice(0, 3).join('');
  const fingerprint = `${error.message}:${stackFrames}`;
  
  // Hash for consistent grouping
  return hashString(fingerprint);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}
```

### What NOT to Do

- ❌ **Ignore errors silently** (no try-catch with empty catch)
- ❌ **No context** (can't reproduce without breadcrumbs)
- ❌ **Log sensitive data** (tokens, passwords in error context)
- ❌ **No source maps** (can't debug minified code)
- ❌ **No error budgets** (track error rate SLOs)

---

## 3. Clear Real-World Examples

### Example 1: Sentry Production Setup

```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: `my-app@${process.env.REACT_APP_VERSION}`,
  
  // Performance monitoring
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true
    })
  ],
  
  tracesSampleRate: 0.1,      // 10% performance traces
  replaysSessionSampleRate: 0.1, // 10% session replays
  replaysOnErrorSampleRate: 1.0,  // 100% replays on error
  
  // Filter noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured'
  ],
  
  beforeSend(event, hint) {
    // Sanitize sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.['Authorization'];
    }
    
    return event;
  }
});
```

**Scale**: Sentry tracks errors for 100K+ companies including Uber, Microsoft, Disney.

### Example 2: Custom Error Dashboard

**Backend Analytics**:
```typescript
// Aggregate error stats
const errorStats = await ErrorModel.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 86400000) } // Last 24h
    }
  },
  {
    $group: {
      _id: '$fingerprint',
      count: { $sum: 1 },
      message: { $first: '$message' },
      lastSeen: { $max: '$timestamp' },
      affectedUsers: { $addToSet: '$userId' }
    }
  },
  {
    $sort: { count: -1 }
  },
  {
    $limit: 100
  }
]);

// Calculate error rate
const errorRate = (errorCount / totalRequests) * 100;

// Alert if error rate > 1%
if (errorRate > 1.0) {
  await sendSlackAlert({
    channel: '#incidents',
    text: `🚨 Error rate elevated: ${errorRate.toFixed(2)}%`,
    errorStats
  });
}
```

### Example 3: React Query Error Handling

**Global Error Handling**:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        // Track query errors
        errorTracker.captureException(error as Error, {
          type: 'react-query',
          query: 'unknown'
        });
      }
    },
    
    mutations: {
      onError: (error, variables, context) => {
        // Track mutation errors with variables
        errorTracker.captureException(error as Error, {
          type: 'react-query-mutation',
          variables,
          context
        });
      }
    }
  }
});
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you implement error tracking for a production React app?"

**Answer**:

"I'd implement **comprehensive error tracking** with context and grouping:

**1. Global Handlers**:

Capture all errors:
```typescript
window.addEventListener('error', (e) => {
  errorTracker.captureException(e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  errorTracker.captureException(new Error(e.reason));
});
```

**2. React Error Boundaries**:

Wrap app in error boundary:
```tsx
<ErrorBoundary fallback={ErrorFallback}>
  <App />
</ErrorBoundary>
```

Captures component errors with React stack trace.

**3. Breadcrumbs**:

Track user actions before error (last 50 events):
- Navigation: page changes
- HTTP: API calls
- User: clicks, form submissions
- Console: warnings, errors

**4. Context**:

Include in every error report:
- **User**: userId, sessionId, traceId
- **Environment**: version, browser, OS, viewport
- **State**: Redux state snapshot (sanitized)
- **Timing**: time since page load

**5. Error Grouping**:

Generate fingerprint from message + stack:
```typescript
fingerprint = hash(error.message + stack.slice(0, 3))
```

Groups similar errors together (e.g., all "Network timeout" errors).

**6. Source Maps**:

Upload to Sentry during build:
```javascript
SentryWebpackPlugin({
  include: './dist',
  urlPrefix: '~/static/js'
})
```

Errors show original source (not minified).

**7. Sampling**:

100% error tracking, 10% performance traces (cost optimization).

**8. Alerting**:

Critical errors trigger Slack:
- Error rate > 1%
- New error fingerprint
- Errors in checkout/payment flows

**9. Integrations**:

Use **Sentry** or **Rollbar**:
- Session replay (watch user session before error)
- Release tracking (errors by version)
- User feedback (ask user what happened)

**10. Error Budgets**:

Set SLOs:
- Error rate < 0.5%
- Time to detection < 5 min
- Time to resolution < 1 hour (P0)

**Trade-offs**:

Source maps expose code structure (security risk). Upload to private Sentry, not public CDN. Session replay privacy concern—mask PII.

**Real-World**: Sentry handles 1B+ errors/month. Airbnb uses error tracking to detect issues in 10K+ experiments."

---

## 6. Why & How Summary

### Why It Matters

**Reliability**: Detect errors before users report  
**Debugging**: Full context (breadcrumbs, state, stack)  
**Prioritization**: Error frequency guides fixes

### How It Works

**1. Capture**: Global handlers + React boundaries  
**2. Context**: User, session, breadcrumbs, state  
**3. Group**: Fingerprint similar errors  
**4. Source Maps**: Original code in stack traces  
**5. Alert**: Critical errors → Slack/PagerDuty  
**6. Sample**: 100% errors, 10% performance

**FAANG**: < 5 min error detection, source maps, session replay, breadcrumbs, < 0.5% error rate SLO
