# 137. Frontend Logging

## 1. High-Level Explanation (Frontend Interview Level)

**Frontend Logging** is the systematic practice of capturing, structuring, and transmitting runtime events, errors, warnings, and debug information from the client-side application to centralized logging systems for monitoring, debugging, and analysis.

- **What**: Structured event tracking, error logging, debug traces, user actions, performance metrics—sent from browser to logging infrastructure (Datadog, Sentry, LogRocket)
- **Why**: Debug production issues, understand user behavior, detect errors before users report, measure performance, meet compliance requirements
- **When**: Essential for production apps, critical for debugging distributed systems, required for SLA monitoring, compliance auditing
- **Role**: Core observability practice enabling proactive issue detection and rapid incident resolution

**Key Principle**: "If you can't measure it, you can't debug it"—comprehensive logging is foundation of production reliability.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Logging Levels & Structure

**1. Log Level Hierarchy**:
```typescript
enum LogLevel {
  DEBUG = 0,   // Verbose debugging info
  INFO = 1,    // General informational messages
  WARN = 2,    // Warning conditions
  ERROR = 3,   // Error events
  FATAL = 4    // Critical failures requiring immediate attention
}

interface LogEntry {
  level: LogLevel;
  timestamp: string;        // ISO 8601
  message: string;
  context: Record<string, any>;
  
  // Correlation
  traceId: string;          // Distributed trace ID
  sessionId: string;        // User session
  userId?: string;          // Authenticated user
  
  // Environment
  environment: 'dev' | 'staging' | 'production';
  version: string;          // App version
  
  // Client info
  userAgent: string;
  platform: string;         // 'web' | 'mobile-web'
  url: string;              // Current page
  
  // Performance
  timestamp_ms: number;     // High-precision timestamp
  duration?: number;        // For timed operations
  
  // Stack trace (for errors)
  stack?: string;
  componentStack?: string;  // React component stack
}
```

**2. Logger Implementation**:
```typescript
class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private queue: LogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5s
  
  private constructor() {
    // Batch flushing
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
    
    // Flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  setLevel(level: LogLevel) {
    this.logLevel = level;
  }
  
  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
  
  fatal(message: string, error?: Error, context?: Record<string, any>) {
    this.log(LogLevel.FATAL, message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
    
    // Flush immediately for fatal errors
    this.flush();
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    // Filter by log level
    if (level < this.logLevel) {
      return;
    }
    
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      timestamp_ms: performance.now(),
      message,
      context: context || {},
      
      // Correlation IDs
      traceId: this.getTraceId(),
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      
      // Environment
      environment: this.getEnvironment(),
      version: this.getVersion(),
      
      // Client info
      userAgent: navigator.userAgent,
      platform: this.getPlatform(),
      url: window.location.href,
      
      // Stack trace
      stack: level >= LogLevel.ERROR ? new Error().stack : undefined
    };
    
    // Console output (dev only)
    if (this.getEnvironment() === 'dev') {
      this.logToConsole(entry);
    }
    
    // Add to queue
    this.queue.push(entry);
    
    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  private logToConsole(entry: LogEntry) {
    const style = this.getConsoleStyle(entry.level);
    const levelName = LogLevel[entry.level];
    
    console.log(
      `%c[${levelName}] ${entry.message}`,
      style,
      entry.context
    );
  }
  
  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      [LogLevel.DEBUG]: 'color: gray',
      [LogLevel.INFO]: 'color: blue',
      [LogLevel.WARN]: 'color: orange',
      [LogLevel.ERROR]: 'color: red; font-weight: bold',
      [LogLevel.FATAL]: 'color: white; background: red; font-weight: bold'
    };
    
    return styles[level] || '';
  }
  
  private async flush() {
    if (this.queue.length === 0) {
      return;
    }
    
    const logs = [...this.queue];
    this.queue = [];
    
    try {
      // Send to logging service
      await this.sendLogs(logs);
    } catch (error) {
      console.error('Failed to send logs:', error);
      // Re-queue failed logs (with limit)
      if (this.queue.length < 100) {
        this.queue.push(...logs);
      }
    }
  }
  
  private async sendLogs(logs: LogEntry[]) {
    const endpoint = '/api/logs';
    
    // Use sendBeacon for reliability (survives page unload)
    if (navigator.sendBeacon && document.hidden) {
      const blob = new Blob([JSON.stringify({ logs })], {
        type: 'application/json'
      });
      
      navigator.sendBeacon(endpoint, blob);
      return;
    }
    
    // Regular fetch
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs }),
      keepalive: true // Survive page unload
    });
  }
  
  // Helper methods
  private getTraceId(): string {
    // Get or generate trace ID
    return window.__TRACE_ID__ || this.generateId();
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem('sessionId', sessionId);
    }
    
    return sessionId;
  }
  
  private getUserId(): string | undefined {
    return window.__USER_ID__;
  }
  
  private getEnvironment(): 'dev' | 'staging' | 'production' {
    return process.env.NODE_ENV === 'production' ? 'production' : 'dev';
  }
  
  private getVersion(): string {
    return process.env.REACT_APP_VERSION || 'unknown';
  }
  
  private getPlatform(): string {
    if (/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      return 'mobile-web';
    }
    return 'web';
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton
export const logger = Logger.getInstance();
```

**Usage**:
```typescript
// Basic logging
logger.info('User logged in', { userId: '12345' });
logger.warn('API slow response', { endpoint: '/api/products', duration: 3500 });
logger.error('Payment failed', new Error('Card declined'), { 
  orderId: 'ORD-123',
  amount: 99.99 
});

// Contextual logging
function processCheckout(order: Order) {
  logger.info('Processing checkout', { orderId: order.id });
  
  try {
    const result = processPayment(order);
    logger.info('Checkout completed', { 
      orderId: order.id,
      transactionId: result.id 
    });
  } catch (error) {
    logger.error('Checkout failed', error as Error, { 
      orderId: order.id 
    });
    throw error;
  }
}
```

### Structured Logging Best Practices

**1. Context Enrichment**:
```typescript
// Global context provider
class LogContext {
  private context: Record<string, any> = {};
  
  set(key: string, value: any) {
    this.context[key] = value;
  }
  
  get(): Record<string, any> {
    return { ...this.context };
  }
  
  clear() {
    this.context = {};
  }
}

export const logContext = new LogContext();

// Set context at app level
logContext.set('userId', user.id);
logContext.set('tenantId', tenant.id);
logContext.set('feature', 'checkout');

// Logger automatically includes context
class Logger {
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      // ...
      context: {
        ...logContext.get(),  // Global context
        ...context            // Local context
      }
    };
  }
}
```

**2. Performance Logging**:
```typescript
// Measure operation duration
class PerformanceLogger {
  private timings = new Map<string, number>();
  
  start(operation: string) {
    this.timings.set(operation, performance.now());
  }
  
  end(operation: string, context?: Record<string, any>) {
    const startTime = this.timings.get(operation);
    
    if (!startTime) {
      logger.warn('Performance timing not found', { operation });
      return;
    }
    
    const duration = performance.now() - startTime;
    this.timings.delete(operation);
    
    logger.info(`${operation} completed`, {
      ...context,
      duration,
      slow: duration > 1000 // Flag slow operations
    });
    
    // Warn on slow operations
    if (duration > 3000) {
      logger.warn(`${operation} slow`, { duration, ...context });
    }
  }
}

export const perfLogger = new PerformanceLogger();

// Usage
perfLogger.start('api-fetch');
const data = await fetch('/api/products');
perfLogger.end('api-fetch', { endpoint: '/api/products' });
```

**3. User Action Logging**:
```typescript
// Track user interactions
function trackUserAction(action: string, target: string, metadata?: Record<string, any>) {
  logger.info(`User action: ${action}`, {
    action,
    target,
    ...metadata,
    
    // Capture interaction context
    currentPage: window.location.pathname,
    referrer: document.referrer,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });
}

// React hook for action logging
function useActionLogger() {
  return useCallback((action: string, metadata?: Record<string, any>) => {
    trackUserAction(action, 'component', metadata);
  }, []);
}

// Usage
function ProductCard({ product }: Props) {
  const logAction = useActionLogger();
  
  const handleClick = () => {
    logAction('product-clicked', {
      productId: product.id,
      productName: product.name,
      price: product.price
    });
  };
  
  return <div onClick={handleClick}>{product.name}</div>;
}
```

### React Error Boundary Logging

**Error Boundary with Logging**:
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log React component error
    logger.error('React component error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'root',
      
      // Capture component props (sanitized)
      props: this.sanitizeProps(this.props)
    });
    
    // Send to error tracking service
    if (typeof Sentry !== 'undefined') {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }
  
  sanitizeProps(props: any): any {
    // Remove sensitive data before logging
    const sanitized = { ...props };
    delete sanitized.password;
    delete sanitized.creditCard;
    delete sanitized.ssn;
    return sanitized;
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    
    return this.props.children;
  }
}
```

### Log Sampling & Rate Limiting

**Prevent Log Flooding**:
```typescript
class SamplingLogger {
  private counters = new Map<string, number>();
  private lastReset = Date.now();
  private resetInterval = 60000; // 1 minute
  
  shouldLog(key: string, sampleRate: number = 1.0, maxPerMinute: number = 100): boolean {
    // Reset counters every minute
    if (Date.now() - this.lastReset > this.resetInterval) {
      this.counters.clear();
      this.lastReset = Date.now();
    }
    
    // Check rate limit
    const count = this.counters.get(key) || 0;
    
    if (count >= maxPerMinute) {
      return false; // Rate limited
    }
    
    // Check sample rate
    if (Math.random() > sampleRate) {
      return false; // Not sampled
    }
    
    // Increment counter
    this.counters.set(key, count + 1);
    
    return true;
  }
}

const sampler = new SamplingLogger();

// Sample 10% of API logs, max 100/min
function logApiCall(endpoint: string, duration: number) {
  if (sampler.shouldLog(`api:${endpoint}`, 0.1, 100)) {
    logger.info('API call', { endpoint, duration });
  }
}
```

### Log Redaction & Security

**Sanitize Sensitive Data**:
```typescript
class SecureLogger {
  private sensitivePatterns = [
    /password/i,
    /creditCard/i,
    /ssn/i,
    /apiKey/i,
    /token/i,
    /secret/i
  ];
  
  private redactValue(key: string, value: any): any {
    // Check if key is sensitive
    if (this.isSensitiveKey(key)) {
      return '[REDACTED]';
    }
    
    // Redact credit card patterns
    if (typeof value === 'string') {
      // Credit card: 1234-5678-9012-3456 → 1234-****-****-3456
      value = value.replace(/\d{4}-\d{4}-\d{4}-(\d{4})/, '****-****-****-$1');
      
      // Email: user@example.com → u***@example.com
      value = value.replace(/^(\w)[\w.]*(@.+)$/, '$1***$2');
    }
    
    return value;
  }
  
  private isSensitiveKey(key: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(key));
  }
  
  sanitize(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = this.redactValue(key, value);
      }
    }
    
    return sanitized;
  }
}

const secureLogger = new SecureLogger();

// Usage
logger.info('User registered', secureLogger.sanitize({
  email: 'user@example.com',      // → u***@example.com
  password: 'secret123',           // → [REDACTED]
  creditCard: '1234-5678-9012-3456' // → ****-****-****-3456
}));
```

### What NOT to Do

- ❌ **Log sensitive data** (passwords, tokens, PII without consent)
- ❌ **Synchronous logging** (blocks main thread)
- ❌ **No sampling** (floods logs, expensive)
- ❌ **Console.log in production** (insecure, unstructured)
- ❌ **No log levels** (can't filter debug vs error)

---

## 3. Clear Real-World Examples

### Example 1: Datadog Frontend Logging

**Integration**:
```typescript
import { datadogLogs } from '@datadog/browser-logs';

// Initialize
datadogLogs.init({
  clientToken: process.env.DATADOG_CLIENT_TOKEN,
  site: 'datadoghq.com',
  forwardErrorsToLogs: true,
  sampleRate: 100, // 100% in prod
  
  // Add global context
  beforeSend: (log) => {
    log.userId = getCurrentUserId();
    log.tenantId = getCurrentTenantId();
    return true;
  }
});

// Usage
datadogLogs.logger.info('Checkout completed', {
  orderId: 'ORD-123',
  amount: 99.99,
  duration: 1234
});
```

**Scale**: Datadog handles billions of logs/day from web apps.

### Example 2: Sentry Integration

**Error Logging**:
```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance monitoring
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.1, // 10% sampling
  
  // Release tracking
  release: process.env.REACT_APP_VERSION,
  
  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request) {
      delete event.request.headers['Authorization'];
    }
    
    return event;
  }
});

// Usage
Sentry.captureException(new Error('Payment failed'), {
  tags: { feature: 'checkout' },
  extra: { orderId: 'ORD-123' }
});
```

### Example 3: Custom Logging Service

**Backend**:
```typescript
// Express endpoint for log ingestion
app.post('/api/logs', async (req, res) => {
  const { logs } = req.body;
  
  // Batch insert to database
  await LogModel.insertMany(logs.map(log => ({
    ...log,
    receivedAt: new Date(),
    serverTimestamp: Date.now()
  })));
  
  // Send critical errors to Slack
  const criticalLogs = logs.filter(l => l.level >= LogLevel.FATAL);
  
  for (const log of criticalLogs) {
    await sendSlackAlert({
      channel: '#frontend-alerts',
      text: `🔥 FATAL ERROR: ${log.message}`,
      details: log
    });
  }
  
  res.sendStatus(204);
});
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How would you implement frontend logging for a large-scale application?"

**Answer**:

"I'd build a **structured logging system** with batching and correlation:

**1. Logger Singleton**:

Centralized logger with log levels (DEBUG/INFO/WARN/ERROR/FATAL):
```typescript
logger.info('User checkout', { orderId, amount });
logger.error('API failed', error, { endpoint });
```

**2. Structured Format**:

Each log entry includes:
- **Correlation IDs**: traceId (distributed), sessionId, userId
- **Context**: URL, component, user action
- **Environment**: version, platform, browser
- **Timing**: timestamp, duration

**3. Batching**:

Queue logs, flush every 5s or 10 logs (whichever first). Use **sendBeacon** on page unload for reliability.

**4. Sampling**:

Sample 100% of errors, 10% of info logs (reduces cost). Rate limit: max 100 logs/min per category to prevent flooding.

**5. Security**:

**Redact sensitive data**: passwords, tokens, credit cards. Never log PII without user consent.

**6. Integration**:

Send to **Datadog** or **Sentry**:
```typescript
await fetch('/api/logs', {
  method: 'POST',
  body: JSON.stringify({ logs }),
  keepalive: true
});
```

**7. React Error Boundary**:

Catch component errors:
```typescript
componentDidCatch(error, errorInfo) {
  logger.error('React error', error, {
    componentStack: errorInfo.componentStack
  });
}
```

**8. Performance Logging**:

Track slow operations:
```typescript
perfLogger.start('api-fetch');
await fetch('/api/products');
perfLogger.end('api-fetch'); // Logs duration
```

**9. Alerting**:

Critical errors (FATAL level) trigger Slack/PagerDuty alerts.

**Trade-offs**:

Verbose logging expensive (bandwidth, storage). Sample info logs, keep all errors. Batching reduces requests but delays visibility—flush immediately for critical errors.

**Real-World**: Facebook logs billions of events/day. Netflix uses structured logs for debugging. Sentry powers error tracking for 100K+ companies."

---

## 6. Why & How Summary

### Why It Matters

**Debugging**: Essential for troubleshooting production issues  
**Monitoring**: Detect errors before users report them  
**Compliance**: Audit trails for GDPR, SOC2

### How It Works

**1. Capture**: Log events with context (user, session, trace)  
**2. Structure**: JSON format with consistent fields  
**3. Batch**: Queue logs, flush every 5s or 10 entries  
**4. Send**: POST to logging service (Datadog, Sentry)  
**5. Sanitize**: Redact sensitive data (passwords, tokens)  
**6. Sample**: 100% errors, 10% info (cost optimization)

**FAANG**: Structured logs, correlation IDs, batching, sampling, real-time alerting, < 1s from event to dashboard
