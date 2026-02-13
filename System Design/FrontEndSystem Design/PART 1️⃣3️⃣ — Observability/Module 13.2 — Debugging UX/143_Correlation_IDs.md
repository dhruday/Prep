# 143. Correlation IDs

## 1. High-Level Explanation (Frontend Interview Level)

**Correlation IDs** are unique identifiers (traceId, sessionId, requestId) propagated across all layers of a distributed system—from frontend through backend services to databases—enabling end-to-end request tracking, distributed tracing, and unified log aggregation for debugging complex multi-service flows.

- **What**: Generate unique ID in frontend, attach to all API calls, propagate through services, include in logs—creates unified trace
- **Why**: Debug distributed systems (frontend → API gateway → microservices → database), correlate logs across services, measure end-to-end latency
- **When**: Essential for microservices, critical for debugging production issues, required for distributed tracing (OpenTelemetry)
- **Role**: Links all logs/metrics/traces for single user request enabling comprehensive debugging

**Key Principle**: "One ID, end-to-end visibility"—single trace ID from browser click to database query.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Correlation ID Types

**1. Hierarchy**:
```typescript
// Three-level hierarchy
interface CorrelationContext {
  // Session-level (30min - 24hr lifespan)
  sessionId: string;        // Unique per browser session
  
  // Request-level (milliseconds lifespan)
  traceId: string;          // Unique per API request (W3C Trace Context)
  spanId?: string;          // Unique per operation within trace
  parentSpanId?: string;    // Parent operation
  
  // User-level (permanent)
  userId?: string;          // Authenticated user
  anonymousId: string;      // Anonymous tracking
}

// Generation
function generateCorrelationIds(): CorrelationContext {
  return {
    sessionId: getOrCreateSessionId(),
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    anonymousId: getOrCreateAnonymousId(),
    userId: getCurrentUserId()
  };
}

function generateTraceId(): string {
  // W3C Trace Context: 32 hex chars (128-bit)
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function generateSpanId(): string {
  // W3C: 16 hex chars (64-bit)
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem('sessionId');
  
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  
  return sessionId;
}

function getOrCreateAnonymousId(): string {
  let anonymousId = localStorage.getItem('anonymousId');
  
  if (!anonymousId) {
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('anonymousId', anonymousId);
  }
  
  return anonymousId;
}
```

**2. W3C Trace Context Standard**:
```typescript
// https://www.w3.org/TR/trace-context/
interface W3CTraceContext {
  traceparent: string;  // Format: version-traceId-spanId-flags
  tracestate?: string;  // Vendor-specific data
}

function createTraceparent(traceId: string, spanId: string, sampled: boolean): string {
  const version = '00';
  const flags = sampled ? '01' : '00';
  
  return `${version}-${traceId}-${spanId}-${flags}`;
}

// Example: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
```

### Frontend Propagation

**1. HTTP Headers**:
```typescript
// Attach correlation IDs to all API calls
class CorrelationInterceptor {
  private context: CorrelationContext;
  
  constructor() {
    this.context = generateCorrelationIds();
  }
  
  intercept(request: RequestInit): RequestInit {
    const headers = new Headers(request.headers);
    
    // W3C Trace Context
    headers.set('traceparent', this.createTraceparent());
    
    // Custom headers (fallback for legacy systems)
    headers.set('X-Session-Id', this.context.sessionId);
    headers.set('X-Request-Id', this.context.traceId);
    headers.set('X-User-Id', this.context.userId || 'anonymous');
    
    return {
      ...request,
      headers
    };
  }
  
  private createTraceparent(): string {
    return createTraceparent(
      this.context.traceId,
      this.context.spanId!,
      true // sampled
    );
  }
  
  // Generate new traceId for each request
  newTrace() {
    this.context.traceId = generateTraceId();
    this.context.spanId = generateSpanId();
    this.context.parentSpanId = undefined;
  }
  
  // Create child span (within same trace)
  createSpan(parentSpanId: string) {
    this.context.parentSpanId = parentSpanId;
    this.context.spanId = generateSpanId();
  }
}

// Usage
const interceptor = new CorrelationInterceptor();

// Wrap fetch
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo, init?: RequestInit) => {
  // New trace for each request
  interceptor.newTrace();
  
  // Add correlation headers
  const enhancedInit = interceptor.intercept(init || {});
  
  return originalFetch(input, enhancedInit);
};
```

**2. Axios Integration**:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Request interceptor
api.interceptors.request.use((config) => {
  const context = generateCorrelationIds();
  
  config.headers['traceparent'] = createTraceparent(
    context.traceId,
    context.spanId!,
    true
  );
  
  config.headers['X-Session-Id'] = context.sessionId;
  config.headers['X-User-Id'] = context.userId || 'anonymous';
  
  // Store traceId for logging
  (config as any).__traceId__ = context.traceId;
  
  return config;
});

// Response interceptor (for logging)
api.interceptors.response.use(
  (response) => {
    const traceId = (response.config as any).__traceId__;
    logger.info('API success', {
      traceId,
      method: response.config.method,
      url: response.config.url,
      status: response.status,
      duration: Date.now() - (response.config as any).__startTime__
    });
    
    return response;
  },
  (error) => {
    const traceId = (error.config as any).__traceId__;
    logger.error('API error', error, {
      traceId,
      method: error.config?.method,
      url: error.config?.url,
      status: error.response?.status
    });
    
    throw error;
  }
);
```

### Backend Correlation

**1. Node.js Express Middleware**:
```typescript
import { Request, Response, NextFunction } from 'express';

// Extract correlation from headers
function correlationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Parse W3C traceparent header
  const traceparent = req.headers['traceparent'] as string;
  let traceId: string;
  let parentSpanId: string;
  
  if (traceparent) {
    // Parse: '00-traceId-spanId-flags'
    const parts = traceparent.split('-');
    traceId = parts[1];
    parentSpanId = parts[2];
  } else {
    // Fallback to custom header
    traceId = (req.headers['x-request-id'] as string) || generateTraceId();
    parentSpanId = '';
  }
  
  const sessionId = req.headers['x-session-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  
  // Create new span for this service
  const spanId = generateSpanId();
  
  // Attach to request
  (req as any).correlation = {
    traceId,
    spanId,
    parentSpanId,
    sessionId,
    userId
  };
  
  // Set response header (for debugging)
  res.setHeader('X-Trace-Id', traceId);
  
  // Log request with correlation
  logger.info('Incoming request', {
    traceId,
    spanId,
    parentSpanId,
    sessionId,
    userId,
    method: req.method,
    path: req.path
  });
  
  next();
}

// Use in Express app
app.use(correlationMiddleware);
```

**2. Service-to-Service Propagation**:
```typescript
// Backend service calls another service
async function callUserService(userId: string, req: Request) {
  const correlation = (req as any).correlation;
  
  // Create child span
  const childSpanId = generateSpanId();
  
  const response = await fetch('http://user-service/api/users/' + userId, {
    headers: {
      // Propagate W3C trace context
      'traceparent': createTraceparent(
        correlation.traceId,
        childSpanId,
        true
      ),
      
      // Propagate custom headers
      'X-Session-Id': correlation.sessionId,
      'X-User-Id': correlation.userId,
      'X-Parent-Span-Id': correlation.spanId
    }
  });
  
  logger.info('Called user service', {
    traceId: correlation.traceId,
    spanId: childSpanId,
    parentSpanId: correlation.spanId,
    userId,
    status: response.status
  });
  
  return response.json();
}
```

### Log Aggregation with Correlation

**1. Structured Logging**:
```typescript
// Frontend logger with correlation
class CorrelatedLogger {
  private context: CorrelationContext;
  
  constructor() {
    this.context = generateCorrelationIds();
  }
  
  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }
  
  error(message: string, error?: Error, data?: any) {
    this.log('ERROR', message, { ...data, error });
  }
  
  private log(level: string, message: string, data?: any) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      
      // Correlation IDs (critical for distributed tracing)
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      sessionId: this.context.sessionId,
      userId: this.context.userId,
      anonymousId: this.context.anonymousId,
      
      // Additional context
      ...data
    };
    
    // Send to backend
    this.sendLog(logEntry);
  }
  
  private sendLog(logEntry: any) {
    navigator.sendBeacon('/api/logs', JSON.stringify(logEntry));
  }
  
  // Update context for new request
  setTraceId(traceId: string, spanId: string) {
    this.context.traceId = traceId;
    this.context.spanId = spanId;
  }
}

export const logger = new CorrelatedLogger();
```

**2. Query Logs by Trace**:
```javascript
// Datadog query: Get all logs for single trace
traceId:"4bf92f3577b34da6a3ce929d0e0e4736"

// Returns logs from:
// - Frontend (button click)
// - API Gateway (routing)
// - Auth Service (token validation)
// - Order Service (order creation)
// - Payment Service (charge)
// - Database (queries)
// - Email Service (confirmation)

// All linked by single traceId!
```

### OpenTelemetry Integration

**1. Frontend SDK**:
```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

// Initialize OpenTelemetry
const provider = new WebTracerProvider({
  resource: {
    attributes: {
      'service.name': 'frontend-app',
      'service.version': '1.0.0'
    }
  }
});

// Export spans to collector
const exporter = new OTLPTraceExporter({
  url: 'https://otel-collector.example.com/v1/traces'
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// Auto-instrument fetch, XHR, user interactions
registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: [/https:\/\/api\.example\.com\/.*/],
        clearTimingResources: true
      },
      '@opentelemetry/instrumentation-xml-http-request': {
        propagateTraceHeaderCorsUrls: [/https:\/\/api\.example\.com\/.*/]
      }
    })
  ]
});

// Manual span creation
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('frontend-app');

function checkoutFlow() {
  const span = tracer.startSpan('checkout_flow');
  
  span.setAttribute('user.id', userId);
  span.setAttribute('cart.items', cartItems.length);
  
  try {
    // ... checkout logic
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message
    });
    throw error;
  } finally {
    span.end();
  }
}
```

**2. Distributed Trace Visualization**:
```
Trace: 4bf92f3577b34da6a3ce929d0e0e4736
Total Duration: 1,234ms

├─ [Frontend] checkout_button_click (5ms)
│  └─ [Frontend] fetch POST /api/orders (1,200ms)
│     └─ [API Gateway] route_request (1,150ms)
│        ├─ [Auth Service] validate_token (50ms)
│        └─ [Order Service] create_order (1,100ms)
│           ├─ [Database] insert_order (100ms)
│           ├─ [Payment Service] charge (900ms)
│           │  └─ [Stripe API] create_charge (850ms)
│           └─ [Email Service] send_confirmation (100ms)
```

### What NOT to Do

- ❌ **No correlation IDs** (impossible to debug distributed issues)
- ❌ **Inconsistent ID format** (hard to query)
- ❌ **Not propagating** (breaks trace)
- ❌ **Logging without IDs** (isolated logs, no context)
- ❌ **No session tracking** (can't group user actions)

---

## 3. Clear Real-World Examples

### Example 1: Datadog APM

```typescript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'frontend-app',
  version: '1.0.0',
  
  // Enable distributed tracing
  allowedTracingOrigins: ['https://api.example.com'],
  
  // Propagate trace context
  trackInteractions: true
});

// Datadog automatically:
// 1. Generates traceId for each request
// 2. Adds headers: x-datadog-trace-id, x-datadog-parent-id
// 3. Links frontend spans with backend spans
// 4. Visualizes in APM dashboard
```

### Example 2: AWS X-Ray

```typescript
import AWSXRay from 'aws-xray-sdk';

// Express middleware
app.use(AWSXRay.express.openSegment('frontend-api'));

app.get('/api/orders', async (req, res) => {
  const segment = AWSXRay.getSegment();
  const traceId = segment.trace_id;
  
  // Create subsegment for database call
  const subsegment = segment.addNewSubsegment('database-query');
  
  try {
    const orders = await db.query('SELECT * FROM orders');
    subsegment.close();
    
    res.json({ orders, traceId });
  } catch (error) {
    subsegment.close(error);
    throw error;
  }
});

app.use(AWSXRay.express.closeSegment());

// View trace in AWS X-Ray console:
// Browser → API Gateway → Lambda → DynamoDB
```

### Example 3: Google Cloud Trace

```typescript
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';

const exporter = new TraceExporter();
const provider = new WebTracerProvider();

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// Automatic trace context propagation
// View in GCP Console: Trace → Trace List
```

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "How do you trace a request across frontend and multiple backend services?"

**Answer**:

"I use **distributed tracing with correlation IDs**:

**1. Generate Unique IDs**:

Frontend generates:
- `traceId`: Unique per request (W3C: 32 hex chars)
- `spanId`: Unique per operation (16 hex chars)
- `sessionId`: Unique per browser session

**2. Propagate via Headers**:

```typescript
fetch('/api/orders', {
  headers: {
    'traceparent': '00-traceId-spanId-01', // W3C standard
    'X-Session-Id': sessionId
  }
});
```

**3. Backend Propagation**:

Each service:
1. Extracts `traceId` from header
2. Creates new `spanId` for its work
3. Propagates to downstream services

```
Frontend (span1) → API Gateway (span2) → Order Service (span3) → Database (span4)
        ALL share same traceId!
```

**4. Structured Logging**:

Every log includes correlation IDs:
```typescript
logger.info('Order created', {
  traceId: '4bf92f...',
  spanId: 'abc123',
  orderId: '789'
});
```

**5. Query by TraceId**:

Datadog query: `traceId:"4bf92f..."` returns ALL logs:
```
[Frontend] Button clicked (traceId: 4bf92f...)
[API Gateway] Routed to /orders (traceId: 4bf92f...)
[Auth Service] Token validated (traceId: 4bf92f...)
[Order Service] Order created (traceId: 4bf92f...)
[Payment Service] Charged $99 (traceId: 4bf92f...)
[Email Service] Sent confirmation (traceId: 4bf92f...)
```

**6. Distributed Trace Visualization**:

Datadog APM / Jaeger shows waterfall:
```
Checkout: 1,234ms total
├─ Frontend: 5ms
└─ API Gateway: 1,150ms
   ├─ Auth: 50ms
   └─ Order Service: 1,100ms
      ├─ Database: 100ms
      ├─ Payment (Stripe): 900ms ← BOTTLENECK!
      └─ Email: 100ms
```

Immediately see: Payment service is slow (900ms). Optimize or add cache.

**7. Standards**:

Use **W3C Trace Context**:
```
traceparent: version-traceId-spanId-flags
```

Interoperable across vendors (Datadog, AWS X-Ray, GCP Trace).

**8. OpenTelemetry**:

Industry standard for tracing:
```typescript
import { trace } from '@opentelemetry/api';

const span = trace.getTracer('app').startSpan('checkout');
span.setAttribute('userId', '123');
span.end();
```

**Real-World**:

Uber uses distributed tracing for ride requests (frontend → API → driver matching → routing → payment). Single traceId tracks entire flow. Debug latency: "Why did this ride take 2 min to match?" → Trace shows driver-matching service took 1.9 min → Optimize algorithm.

**Trade-offs**:

Trace storage cost (millions of requests/day). Sample: 100% errors, 1% success requests. Balance visibility vs cost."

---

## 6. Why & How Summary

### Why It Matters

**Distributed Systems**: Track requests across multiple services  
**Debugging**: Link frontend error to backend cause  
**Performance**: Identify bottlenecks in multi-service flows

### How It Works

**1. Generate**: Unique traceId per request (frontend)  
**2. Propagate**: HTTP headers (W3C traceparent)  
**3. Log**: Include traceId in every log entry  
**4. Query**: Retrieve all logs for single trace  
**5. Visualize**: Waterfall view of entire request flow

**FAANG**: W3C Trace Context standard, OpenTelemetry, distributed tracing platforms (Datadog APM, Jaeger, Zipkin), correlation ID propagation, trace sampling
