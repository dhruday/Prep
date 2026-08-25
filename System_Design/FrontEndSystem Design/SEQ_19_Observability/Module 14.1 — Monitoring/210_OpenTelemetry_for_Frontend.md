# 210 – OpenTelemetry for Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

OpenTelemetry (OTel) is a vendor-neutral, open-source observability framework that provides a unified API for collecting **traces**, **metrics**, and **logs** from frontend applications. Unlike proprietary SDKs (Datadog RUM, Sentry, New Relic Browser), OTel gives you a single instrumentation layer that can export to any backend — Jaeger, Zipkin, Grafana Tempo, Datadog, or your own collector. For frontend, this means you can trace a user interaction from the browser click → through your JavaScript → across the network → into your backend services, with a single correlation ID (traceId) linking the entire journey. This is the future of frontend observability — Microsoft, Google, and Cisco are all investing heavily in OTel adoption.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture & Component Boundaries

**OTel in the Browser Stack:**

```
User Interaction (click, navigation, API call)
        ↓
OTel Web SDK (auto-instrumentation + manual spans)
        ↓
OTel Exporters (OTLP/HTTP, Console, Zipkin)
        ↓
OTel Collector (aggregation, sampling, routing)
        ↓
Backend (Jaeger, Tempo, Datadog, Elastic APM)
```

**Key OTel Concepts for Frontend:**

| Concept | Frontend Application |
|---------|---------------------|
| **Trace** | End-to-end journey: button click → API call → response → DOM update |
| **Span** | A single unit of work: `fetch('/api/orders')` is one span |
| **Context Propagation** | `traceparent` header sent with every fetch — backend continues the trace |
| **Resource** | Metadata: app version, environment, browser, user segment |
| **Exporter** | How telemetry leaves the browser — OTLP over HTTP to your collector |

### Browser Internals

**What OTel Auto-Instruments in the Browser:**
- `XMLHttpRequest` and `fetch()` calls — creates spans with HTTP method, status, duration
- `document` load events — `navigationStart`, `domContentLoaded`, `loadEventEnd`
- User interactions — click, input (via `@opentelemetry/instrumentation-user-interaction`)
- Long tasks — tasks blocking the main thread > 50ms
- Resource timings — every script, image, font load via Performance API

**Context Propagation (The Critical Part):**
When OTel instruments a `fetch()` call, it automatically injects a `traceparent` header:
```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```
This header contains `version-traceId-parentSpanId-traceFlags`. The backend OTel SDK reads this header and continues the trace — this is how you get full end-to-end visibility from browser to database.

### Data Flow & State Flow

```
Browser Click
    ↓ (OTel creates root span)
JavaScript Handler
    ↓ (OTel creates child span)
fetch('/api/data', { headers: { traceparent: '...' } })
    ↓ (Auto-injected by OTel)
Backend receives traceparent → continues trace
    ↓
Backend responds
    ↓ (OTel ends fetch span, records duration + status)
DOM Update
    ↓ (OTel ends root span)
Span batch exported via OTLP/HTTP to Collector
    ↓
Collector → Jaeger/Tempo/Datadog
```

### Performance Implications

- **Bundle size**: `@opentelemetry/sdk-trace-web` + auto-instrumentations ≈ 30-50KB gzipped
- **Runtime overhead**: Each span creation is ~0.1ms — negligible for most apps
- **Network cost**: Spans are batched (default: every 5 seconds or 512 spans) and sent via OTLP/HTTP
- **Main thread impact**: Span processing is synchronous but lightweight; export is async
- **Sampling**: Use `TraceIdRatioBasedSampler` to sample 10% of traces in production — reduces cost by 90%

### Scalability Considerations

- At 10M users, even 1% sampling = 100K traces/minute — significant collector load
- Use **tail-based sampling** at the collector: keep all error traces, sample 1% of success traces
- Deploy OTel Collector as a sidecar or gateway — never send OTLP directly from browser to Jaeger
- Use **baggage** to propagate user segment, A/B test variant — enables filtering in the backend

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| OTel (vendor-neutral) | Portable, future-proof, full-stack tracing | Higher setup complexity, community-driven pace |
| Datadog RUM | Polished UX, auto dashboards, alerting | Vendor lock-in, expensive at scale |
| Sentry | Excellent error tracking, session replay | Weaker distributed tracing |
| Custom logging | Full control, minimal bundle | No standardization, no distributed tracing |

### Anti-Patterns & Pitfalls

- ❌ **Sending OTLP directly to Jaeger from the browser** — exposes your collector endpoint, no sampling control
- ❌ **Instrumenting everything** — creates noise; instrument critical user journeys only
- ❌ **No sampling in production** — 100% trace collection = storage cost explosion
- ❌ **Ignoring context propagation** — without `traceparent` headers, frontend traces are isolated islands
- ❌ **Blocking the main thread with sync exports** — always use `BatchSpanProcessor`

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### FAANG-Scale: Microsoft Azure Monitor + OTel

Azure Monitor now accepts OTLP natively. Microsoft Teams uses OTel-compatible instrumentation to trace message send flows: compose → API call → SignalR push → recipient render. Each step is a span with the same traceId, visible in Azure Application Insights.

### FAANG-Scale: Google Cloud Trace + OTel

Google Cloud Trace is built on OTel. Google's web apps (Docs, Gmail) use OTel-compatible instrumentation internally, exporting to Cloud Trace for distributed tracing across their microservice backends.

### Hruday @ SAP Labs — OTel for Micro-Frontend Observability

At SAP, with a micro-frontend architecture, each micro-app was independently deployed. We used OpenTelemetry's Web SDK to create traces that spanned across micro-frontends — when a user navigated from the Launchpad to a specific Fiori app, the traceId propagated via a shared OTel context. This gave us end-to-end visibility: Launchpad render → shell navigation → micro-app bootstrap → OData API call → backend response. Without OTel, each micro-frontend was a visibility silo.

### Hruday @ Bosch — Tracing WebSocket Flows

At Bosch, the real-time dashboard used WebSockets. We instrumented the WebSocket message handler with manual OTel spans — each incoming message created a span with the message type and processing duration. This revealed that certain message types were taking 200ms+ to process, causing frame drops.

### Scaling:

- **1K users**: Console exporter during development, 100% sampling
- **100K users**: OTLP/HTTP to OTel Collector, 10% sampling, tail-based for errors
- **10M users**: OTel Collector gateway with load balancing, 1% head-based + 100% error sampling, export to Grafana Tempo with S3 backend

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer (7+ years experience)

*"OpenTelemetry is a vendor-neutral observability framework that I use to get end-to-end distributed tracing from the browser to the backend. The key value is context propagation — when the browser makes a fetch call, OTel automatically injects a `traceparent` header containing a traceId. The backend OTel SDK reads that header and continues the trace. This means I can see the full journey: user click → JavaScript processing → API call → backend service → database query, all linked by one traceId.*

*In the browser, I use `@opentelemetry/sdk-trace-web` with auto-instrumentations for fetch, document load, and user interactions. Spans are batched and exported via OTLP/HTTP to an OTel Collector — never directly to Jaeger or Tempo, because the collector handles sampling, batching, and routing. In production, I use 10% head-based sampling plus 100% sampling for errors, which keeps costs manageable while ensuring I never miss an error trace.*

*At SAP, this was critical for our micro-frontend architecture. Each micro-app was independently deployed, so without OTel's context propagation, we had no way to trace a user journey across micro-frontend boundaries. OTel gave us that cross-boundary visibility."*

### Likely Follow-up Questions

1. **"How does context propagation work across fetch calls?"** — OTel wraps the global `fetch` and injects `traceparent` / `tracestate` headers. The W3C Trace Context spec defines the format.
2. **"What's the performance overhead?"** — Span creation is ~0.1ms. Bundle adds ~40KB gzipped. Use `BatchSpanProcessor` to batch exports every 5s.
3. **"How do you handle sampling?"** — Head-based (TraceIdRatioBasedSampler at 10%) + tail-based at the collector (keep all errors).
4. **"OTel vs Datadog RUM?"** — OTel is vendor-neutral and free; Datadog has better out-of-box dashboards but costs $15+/host/month and creates lock-in.
5. **"How do you trace across micro-frontends?"** — Share OTel context via a global TracerProvider. Each micro-app creates spans under the same trace.

### Comparison With Alternatives

| Feature | OpenTelemetry | Datadog RUM | Sentry |
|---------|---------------|-------------|--------|
| Vendor lock-in | None | High | Medium |
| Distributed tracing | Full (W3C Trace Context) | Full | Limited |
| Auto-instrumentation | Good (fetch, document load) | Excellent | Good |
| Session replay | No (add separately) | Yes | Yes |
| Cost | Free (self-hosted backend) | $$$$ at scale | $$ |
| Setup complexity | High | Low | Low |

────────────────────────────────────────────────────────────

## 5. 💻 CODE EXAMPLE

```typescript
// OpenTelemetry Browser Setup — production-ready configuration
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// 1. Define resource (app metadata)
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'sap-fiori-launchpad',
  [SemanticResourceAttributes.SERVICE_VERSION]: '2.4.1',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
  'app.micro_frontend': 'shell',
});

// 2. Create provider with sampling
const provider = new WebTracerProvider({
  resource,
  sampler: new TraceIdRatioBasedSampler(0.1), // 10% in production
});

// 3. Configure OTLP exporter (to OTel Collector, NOT directly to Jaeger)
const exporter = new OTLPTraceExporter({
  url: '/api/otel/v1/traces', // Proxied through your backend — never expose collector
});

// 4. Batch processor — batches spans, exports every 5s
provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 512,
  scheduledDelayMillis: 5000,
}));

// 5. Register provider with zone context manager (Angular/Zone.js compatibility)
provider.register({
  contextManager: new ZoneContextManager(), // Use W3CTraceContextPropagator by default
});

// 6. Auto-instrument fetch, document load, user interactions
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [/api\.yourcompany\.com/], // CORS-safe domains
      clearTimingResources: true,
    }),
    new DocumentLoadInstrumentation(),
    new UserInteractionInstrumentation({
      eventNames: ['click', 'submit'],
    }),
  ],
});

// 7. Manual span for custom business logic
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('invoice-module');

async function approveInvoice(invoiceId: string): Promise<void> {
  const span = tracer.startSpan('invoice.approve', {
    attributes: {
      'invoice.id': invoiceId,
      'user.action': 'approve',
    },
  });

  try {
    const response = await fetch(`/api/invoices/${invoiceId}/approve`, {
      method: 'POST',
      // traceparent header auto-injected by FetchInstrumentation
    });

    if (!response.ok) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` });
    }

    span.setAttribute('http.status_code', response.status);
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}
```

**Why this structure:**
- `BatchSpanProcessor` prevents main thread blocking — spans queued and flushed async
- OTLP exporter points to `/api/otel/v1/traces` (proxied) — never expose collector URL to browser
- `TraceIdRatioBasedSampler(0.1)` = 10% sampling — cost-effective in production
- `ZoneContextManager` ensures context propagation works with Angular's zone.js
- Manual span shows how to add business-specific attributes for debugging

────────────────────────────────────────────────────────────

## 6. 🧠 MEMORY AID

**"OTel = One trace, every layer."** The traceparent header is the thread that stitches browser → API → backend into one trace. Three things to remember: **(1)** Use `BatchSpanProcessor` (never sync export), **(2)** Sample in production (10% head-based, 100% errors), **(3)** Proxy OTLP through your backend (never expose collector to the browser). The killer interview phrase: "I use OTel for vendor-neutral distributed tracing with W3C Trace Context propagation."

────────────────────────────────────────────────────────────

## 7. 🎯 WHY & HOW SUMMARY

**Why it matters:**
→ Without distributed tracing, frontend teams can only see "the API was slow" — not WHY. OTel's context propagation reveals the exact backend service, database query, or third-party call causing the latency. It turns "my page is slow" into "the /api/orders endpoint's PostgreSQL query takes 800ms because of a missing index."

**How it works:**
→ OTel's Web SDK auto-instruments fetch/XHR and injects `traceparent` headers. Each browser interaction creates a trace with spans for network calls, DOM events, and custom business logic. Spans are batched and exported via OTLP/HTTP to an OTel Collector, which handles sampling, transformation, and routing to your observability backend (Jaeger, Tempo, Datadog).

**Company relevance:**
→ **Microsoft**: Azure Monitor now supports OTLP natively — OTel is Microsoft's recommended approach for distributed tracing. Expect interviewers to ask about Application Insights + OTel integration.
→ **Cisco**: Cisco AppDynamics and ThousandEyes both support OTel ingestion — Cisco is moving toward OTel as the standard telemetry format across their observability products.
→ **Adobe**: Adobe Experience Platform uses distributed tracing internally — OTel knowledge shows you can debug performance issues across Adobe's microservice architecture.
→ **Salesforce**: Salesforce's Heroku and MuleSoft platforms support OTel — understanding OTel context propagation is valuable for full-stack Salesforce development.
