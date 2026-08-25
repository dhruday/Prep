# Frontend Monitoring — Sentry, Datadog, and RUM
> Part 16 — Observability & Monitoring
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card

- **Frontend monitoring = three concerns**: (1) JavaScript errors and crashes — Sentry; (2) performance monitoring — Core Web Vitals, page load, API response times — Datadog RUM, New Relic Browser; (3) user session analytics — Google Analytics, Mixpanel (product analytics, not engineering focus)
- **Sentry**: error tracking with full context — stack trace, browser, OS, user ID, release version, breadcrumbs (last 10 user actions before the error); groups duplicate errors into issues; error rate alerts; source maps for readable stack traces in minified production code
- **RUM (Real User Monitoring)**: measures actual user experience from the browser, not synthetic probes; captures LCP, FID/INP, CLS (Core Web Vitals), Time to First Byte (TTFB), Time to Interactive (TTI), API call durations from the browser's perspective; segmented by country, device, browser, route
- **Core Web Vitals (Google's UX metrics)**: LCP (Largest Contentful Paint) < 2.5s = good; INP (Interaction to Next Paint, replaced FID) < 200ms = good; CLS (Cumulative Layout Shift) < 0.1 = good; these directly affect Google Search ranking
- **Source maps**: production JavaScript is minified; `main.js:1:45234` is unreadable; source maps map minified positions to original TypeScript line numbers; upload source maps to Sentry at deploy time; NEVER serve source maps publicly — they expose your full source code to the internet
- **Error boundaries + Sentry**: React and Angular have component error boundaries; integrate Sentry in the error boundary handler so component-level crashes are automatically tracked with React component tree context
- **Session replay** (Sentry Replay, Datadog Session Replay): records user DOM interactions for replaying exactly what a user did before an error; powerful for reproducing hard-to-replicate bugs; must mask PII (credit card fields, passwords) in replay configuration

---

## 1. One-Line Definition
Frontend monitoring captures JavaScript errors, performance metrics, and user experience data from actual browsers in production, providing the observability layer that server-side metrics cannot see — because everything between the API response and the rendered screen is invisible to backend monitoring.

---

## 2. The Problem It Solves

Backend monitoring shows: API response P99 = 180ms, error rate = 0.02%, all healthy. But users are reporting "the app is slow" and "it crashed for me". The backend is fine — the problem is in the frontend:
- A JavaScript TypeError on specific iOS Safari devices crashing the checkout page — visible only in Sentry's browser-segmented error reports
- LCP of 4.2 seconds on mobile because a 1.2MB hero image has no `loading="lazy"` or `srcset` — visible only in RUM's LCP distribution by device type
- CLS score of 0.35 (poor) because a late-loading ad banner shifts the page layout — visible only in Core Web Vitals dashboard
- An API call that takes 180ms server-side grows to 800ms by the time it reaches mobile users in Southeast Asia (network latency) — visible in RUM's API duration distribution by country

Frontend monitoring is the observability for everything the server cannot see.

---

## 3. How It Works Internally

### Sentry Data Flow

```
Browser (User)
  │  Error occurs: TypeError in checkout.js
  │  window.onerror / unhandledrejection fires
  │  Sentry SDK captures:
  │    - error type, message, stack trace (mapped via source maps)
  │    - browser, OS, screen size
  │    - current URL, route
  │    - user ID (if set via Sentry.setUser)
  │    - breadcrumbs: last 10 events (clicks, navigation, API calls)
  │    - release version (set at Sentry init)
  ▼
Sentry Ingest API
  │  Deduplication: groups same error → one "issue" (not thousands of individual events)
  │  Grouping: by stack trace fingerprint
  │  Release tracking: "which deploy introduced this error?"
  │  Alert: if error rate spikes above threshold → Slack/email
  ▼
Sentry Dashboard
  ├── Issues list: "TypeError: Cannot read properties of undefined" — 234 occurrences, 89 users
  ├── Error detail: stack trace (source mapped), breadcrumbs, user session
  └── Release comparison: "v1.2.3 introduced a 3x increase in this error"
```

---

## 4. The Code

### Wrong Way — No Error Boundaries, Raw console.error, Public Source Maps

```typescript
// ❌ WRONG 1: No error boundary — one crashed component crashes the whole app
// React: an unhandled error in render = blank white screen, no user feedback

// App.tsx (no error boundary):
function App() {
    return (
        <Router>
            <ProductList />       {/* ← if this throws, entire app goes blank */}
            <ShoppingCart />
            <Checkout />
        </Router>
    );
}
// ❌ When ProductList throws TypeError, the React tree unmounts
// User sees blank screen with no error message
// Error silently logged to console — NOT reported to Sentry or any monitoring
```

```typescript
// ❌ WRONG 2: console.error instead of Sentry.captureException
// console.error is visible in DevTools (only if the user has DevTools open)
// It is NOT sent anywhere — no aggregation, no alerting, no stack trace

async function submitOrder(order: OrderPayload): Promise<void> {
    try {
        await api.post('/orders', order);
    } catch (error) {
        console.error('Order failed:', error);  // ❌ invisible in production monitoring
        // User may see nothing because the UI doesn't handle the error
    }
}
```

```nginx
# ❌ WRONG 3: Serving source maps publicly via nginx
# Anyone can visit /static/js/main.abc123.js.map and download your full source code
# Violates intellectual property; exposes business logic, API keys in comments, auth flows

# nginx.conf (BAD):
location /static/ {
    root /app/build/;
    # ❌ No restriction — .map files served publicly
}
```

### Right Way — Sentry + Error Boundaries + Source Map Security

```typescript
// ✅ RIGHT — Sentry initialization in React (main.tsx)
// Place BEFORE the React root render call

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/react';

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,           // from environment variable
    environment: import.meta.env.VITE_ENV,            // 'production', 'staging'
    release: import.meta.env.VITE_APP_VERSION,        // 'v1.2.3' (inject at build time via CI)
    
    // ✅ Performance monitoring (traces % of requests)
    integrations: [
        new BrowserTracing({
            tracePropagationTargets: ['api.shop.com', /^\/api\//],
            // ← Only inject trace headers to OUR API, not third-party CDNs
        }),
        new Sentry.Replay({
            maskAllText: false,
            blockAllMedia: false,
            // ✅ ALWAYS block sensitive inputs — security requirement
            // Without this, session replay records keystrokes in password/card fields
            mask: ['input[type="password"]', 'input[name="cardNumber"]', 
                   '[data-sensitive]', 'input[name="cvv"]'],
        }),
    ],
    
    // ✅ Sample 10% of sessions for tracing (100% = too expensive)
    tracesSampleRate: 0.1,
    // ✅ Sample 5% of error sessions for replay
    replaysOnErrorSampleRate: 0.05,
    
    // ✅ Ignore expected errors that are not bugs
    ignoreErrors: [
        'ResizeObserver loop limit exceeded',    // browser behavior, not our code
        'Network Error',                          // offline user — not a bug
        /^TypeError: Load failed/,               // fetch abort by user navigation
    ],
    
    // ✅ Enrich every event with user context
    beforeSend(event) {
        // ✅ Remove PII from error payloads (GDPR)
        if (event.user) {
            delete event.user.email;            // ← don't send user email to Sentry
            delete event.user.ip_address;
        }
        return event;
    },
});
```

```tsx
// ✅ RIGHT — React Error Boundary with Sentry integration

import * as Sentry from '@sentry/react';
import type { FC, ReactNode } from 'react';

// Sentry provides a pre-built ErrorBoundary component
// Use it to wrap sections of the app for isolated error containment

const App: FC = () => (
    // ✅ Wrap the whole app: catches any unhandled render error
    <Sentry.ErrorBoundary
        fallback={({ error, resetError }) => (
            <div role="alert" className="error-screen">
                <h2>Something went wrong</h2>
                <p>Our team has been notified. Please try again.</p>
                <button onClick={resetError}>Try again</button>
                {/* ✅ Include error boundary correlation ID for support tickets */}
            </div>
        )}
        onError={(error, componentStack, eventId) => {
            // eventId = Sentry event ID — include in support ticket UI
            console.error('React ErrorBoundary:', error, 'Sentry event:', eventId);
        }}
    >
        <Router>
            {/* ✅ Nested error boundaries for non-critical sections */}
            <Sentry.ErrorBoundary fallback={<div>Recommendations unavailable</div>}>
                <RecommendationsPanel />
            </Sentry.ErrorBoundary>
            
            {/* ✅ Critical checkout path: catch and show graceful degradation */}
            <Sentry.ErrorBoundary 
                fallback={<div>Checkout temporarily unavailable</div>}
                onError={(error, _, eventId) => {
                    // ✅ Log correlation ID in the UI for user to share with support
                    console.error(`Checkout error. Reference: ${eventId}`);
                }}
            >
                <CheckoutFlow />
            </Sentry.ErrorBoundary>
        </Router>
    </Sentry.ErrorBoundary>
);
```

```typescript
// ✅ RIGHT — Sentry user context and custom breadcrumbs

// Set user context after login (for filtering "show me errors for this user")
export function setUserContext(user: { id: string; plan: string }): void {
    Sentry.setUser({ 
        id: user.id,           // ← ok to send (internal ID)
        // ✅ DO NOT send email, name, or other PII to Sentry (GDPR)
    });
    Sentry.setTag('plan', user.plan);     // ← LOW CARDINALITY: 'free', 'pro', 'enterprise'
    // ✅ Tags appear in Sentry issue grouping — you can filter "show all errors on 'pro' plan"
}

// Custom breadcrumb for key user actions
export function trackOrderAttempt(orderId: string): void {
    Sentry.addBreadcrumb({
        category: 'user-action',
        message: `Order creation attempted`,
        data: { orderId },
        level: 'info',
    });
}

// Manual error capture with extra context
export async function submitOrder(order: OrderPayload): Promise<OrderResult> {
    try {
        const result = await orderApi.create(order);
        return result;
    } catch (error) {
        // ✅ captureException sends to Sentry with full context
        Sentry.captureException(error, {
            tags: {
                operation: 'order_submit',
                paymentMethod: order.paymentMethod,   // low-cardinality: CARD/UPI/NETBANKING
            },
            extra: {
                itemCount: order.items.length,         // context for debugging, not PII
            },
        });
        throw error;  // ✅ re-throw so calling code handles the UI state
    }
}
```

```typescript
// ✅ RIGHT — RUM lightweight custom metrics without Datadog dependency
// For teams not on Datadog, use the browser's built-in Performance API

// Performance monitoring using PerformanceObserver

// Core Web Vitals via the 'web-vitals' library (from Google):
// npm install web-vitals

import { onLCP, onINP, onCLS, onTTFB, onFCP } from 'web-vitals';

function sendVitalToAnalytics(metric: Metric): void {
    // ✅ Send to your own analytics endpoint or Google Analytics
    const body = JSON.stringify({
        name: metric.name,            // 'LCP', 'INP', 'CLS', 'TTFB', 'FCP'
        value: metric.value,
        rating: metric.rating,        // 'good', 'needs-improvement', 'poor'
        id: metric.id,                // unique metric instance ID
        navigationType: metric.navigationType,
    });
    
    // ✅ sendBeacon is non-blocking and survives page unload
    navigator.sendBeacon('/api/vitals', body);
}

// Register all Core Web Vitals reporters
onLCP(sendVitalToAnalytics);   // Largest Contentful Paint
onINP(sendVitalToAnalytics);   // Interaction to Next Paint (replaces FID in 2024)
onCLS(sendVitalToAnalytics);   // Cumulative Layout Shift
onTTFB(sendVitalToAnalytics);  // Time to First Byte
onFCP(sendVitalToAnalytics);   // First Contentful Paint
```

```nginx
# ✅ RIGHT — Block source maps from public access (nginx)

server {
    # ✅ Serve JS assets normally
    location /static/ {
        root /app/build/;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # ✅ Block .map files from external access
    location ~* \.map$ {
        # Internal only: allow Sentry's source map upload (by CI) but not browser download
        deny all;
        return 404;
    }
    
    # Alternative: serve source maps only to authenticated internal users
    # location ~* \.map$ {
    #     allow 10.0.0.0/8;     # internal network only
    #     deny all;
    # }
}
# ✅ Source maps should be uploaded to Sentry directly from CI/CD pipeline
# using Sentry CLI: `sentry-cli releases files $VERSION upload-sourcemaps ./build`
# Then the .map files are deleted from the deployment artifact
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why is backend monitoring not sufficient for a frontend-heavy application?"

**Hruday's answer:**
> Backend monitoring tells you what the server did. Frontend monitoring tells you what the user experienced. For a React application, a large portion of the user experience happens entirely in the browser — and the server has no visibility into it.
>
> Three examples: First, JavaScript errors. A TypeError that crashes the checkout component is 100% client-side. The server never receives an error — from the server's perspective, it correctly returned the product data and checkout form HTML. Only Sentry's client-side error tracking sees this crash.
>
> Second, performance. The backend API might respond in 120ms. But on a mobile device with a slow CPU, parsing and executing the 800KB JavaScript bundle takes 2.4 seconds. LCP (Largest Contentful Paint) might be 4.5 seconds because a hero image isn't lazy-loaded. The user experiences a slow page even though backend metrics are perfect. RUM captures this; backend monitoring doesn't.
>
> Third, third-party failures. If Google Fonts, a payment widget, or an analytics script fails to load and blocks the page, that's invisible to backend monitoring. RUM tools capture all network requests from the browser, including third-party resources.
>
> Backend and frontend monitoring are complementary. A complete observability strategy requires both.

---

### Q2 — Security
**Interviewer asks:** "Why are source maps a security concern and how do you handle them?"

**Hruday's answer:**
> Production JavaScript is minified and bundled. A stack trace from a bug contains things like `TypeError at main.js:1:45234` — completely unreadable. Source maps are files that map those minified positions back to the original TypeScript source file and line number. They're essential for debugging production errors.
>
> The security concern: source maps contain your full original source code. If source maps are served publicly at `yourapp.com/static/js/main.abc123.js.map`, any security researcher, competitor, or attacker can download your complete source code — business logic, API client patterns, configuration patterns, and in poorly written code, maybe hardcoded tokens.
>
> The correct approach: never serve source maps via your public web server. Instead, upload source maps to Sentry directly from your CI/CD pipeline using the Sentry CLI `sentry-cli releases files $VERSION upload-sourcemaps ./build/static/js`. Then delete the source map files from the deployment artifact. Sentry uses them server-side to show you readable stack traces, without those files ever being accessible in the browser.
>
> The build pipeline: `npm run build` generates `.map` files → `sentry-cli releases upload-sourcemaps ./build` → delete all `*.map` files → deploy clean artifact (no source maps) to CDN/server.

---

### Q3 — Comparison
**Interviewer asks:** "Sentry vs Datadog RUM — when do you choose each?"

**Hruday's answer:**
> Sentry and Datadog RUM solve overlapping but different primary concerns.
>
> Sentry specializes in error tracking. It has the best developer experience for debugging — the issue grouping, release comparisons, breadcrumb replay, and session context make it straightforward to reproduce and fix specific JavaScript errors. It's open-source with a generous free tier. For a product engineering team whose primary concern is "catch and fix JavaScript errors in production", Sentry is the right tool.
>
> Datadog RUM is a comprehensive Real User Monitoring platform. Beyond errors, it captures Core Web Vitals, page load timelines, user session recordings, heatmaps, and user flow funnels. Crucially, Datadog RUM integrates with Datadog APM: you can see a user session that had a slow page load, click into the frontend trace, jump to the backend API trace, and see the database query — all in one platform. This end-to-end observability across frontend and backend is Datadog RUM's strongest differentiator.
>
> My answer for a team on a budget or early stage: Sentry for error tracking, `web-vitals` library with a custom analytics endpoint for Core Web Vitals. For a mature engineering org already using Datadog for APM: add Datadog RUM for the integrated full-stack observability. They're not mutually exclusive — many teams run both.

---

## 6. The Traps

| Trap | What most candidates say | What Sentry/RUM experts say |
|------|--------------------------|------------------|
| "We use try-catch everywhere so errors won't reach Sentry" | "We catch all errors and handle them, so no unhandled errors exist" | Catching an error and logging it to console without sending it to Sentry means the error is invisible in production monitoring; `console.error` helps a developer with DevTools open, not the engineering team in front of a Grafana dashboard at 2 AM; every caught error that affects user experience should be sent to Sentry via `Sentry.captureException(error)` with context; the principle: Sentry is for errors that matter to users — if you caught it AND handled it gracefully AND the user was unaffected, don't send it; if you caught it AND showed an error state to the user, send it with context |
| "Source maps are served publicly for easier debugging" | "We serve source maps from the same CDN as our JS so browser DevTools show original code" | Serving source maps publicly exposes full source code to the internet; the readable benefit for one developer's DevTools session is not worth the security risk; upload source maps exclusively to Sentry (or your error monitoring tool) using CI at deploy time; Sentry maps minified stack traces on its servers; developers see readable error details in Sentry without the files ever being publicly downloadable; delete source maps from the deployment artifact after the Sentry upload step |
| "RUM just measures page load time" | "RUM tells you how long pages take to load" | Modern RUM measures far more: Core Web Vitals (LCP, INP, CLS) which directly affect Google Search ranking and user experience quality scores; HTTP API call durations from the browser's perspective (which includes network latency not visible server-side); JavaScript error rates and their impact on conversion funnels; rage clicks (user frustration signals); session recordings showing exactly what a user did before hitting an error; user flow completion rates by segment (mobile vs desktop, country, browser); the page load time is the baseline — RUM's real value is user experience quality and user behavior data |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we launched a major product page redesign. Backend metrics were perfect — API P99 was 140ms, zero server errors. But within 24 hours, support tickets spiked 40% with 'page is slow' complaints.
>
> Sentry showed zero JavaScript errors on the new page. But our Core Web Vitals (we were collecting them via the web-vitals library) showed something different: LCP on mobile had jumped from 1.8 seconds to 4.6 seconds after the redesign. The new 'hero' section had a 1.4MB unoptimized image with no `loading='lazy'` attribute. On fast desktop connections, it was fast. On mobile (Android Chrome, 4G), it was being downloaded before the main content, blocking LCP.
>
> The fix: `loading='lazy'` on below-fold images, `srcset` for responsive images, and WebP format reduced the image to 180KB. LCP went back to 1.9 seconds on mobile. Support tickets returned to baseline.
>
> Backend monitoring saw nothing wrong the entire time. Frontend RUM found the problem in 2 hours. This is why frontend observability is not optional."

---

## 8. Scale Evolution

**1,000 users →** Sentry Free tier (5,000 errors/month), `web-vitals` library sending to a simple analytics table. React ErrorBoundary with Sentry.ErrorBoundary. Source maps uploaded to Sentry via CI, deleted from deployment artifact.

**100,000 users →** Sentry paid plan (volume-based), error rate alerting to Slack, release comparison to catch regressions. Datadog RUM or New Relic Browser for Core Web Vitals dashboard by device/country/browser. Session sampling at 10% for performance monitoring.

**10 million users →** Sentry sampling (not 100% of errors — group and deduplicate first, only alert on NEW error types or error rate spikes). Datadog RUM for full user session funnel analysis. Integration with backend APM for E2E trace correlation. Privacy-preserving session replay (all PII masked). Core Web Vitals integrated into CI/CD performance budget: builds that degrade LCP > 0.5 seconds are blocked.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment widget JavaScript errors are critical (lost revenue per error); source map security is critical (payment code exposure); CLS on checkout page (layout shifts cause accidental wrong-button clicks — security and UX concern); RUM by device for mobile payment UX quality | Payment-specific frontend error strategy; source map security; CLS in payment flows |
| Swiggy / Meesho | App performance on budget Android devices (2GB RAM) — meaningful LCP/INP benchmarks; rage click detection on order placement CTA; Sentry error tracking for React Native if mobile app builds on similar patterns | Mobile-first frontend monitoring; RUM device segmentation; native app considerations |
| Adobe / Microsoft | Document editor JS error tracking; performance monitoring for heavy document rendering; Microsoft Clarity (Microsoft's free RUM tool) as an alternative; session replay for UX research on complex editing workflows | Microsoft Clarity; document editor-specific performance; session replay for UX |
| SAP Labs | Hero image CLS issue found via web-vitals while backend showed green; direct before/after story (1.8s → 4.6s → 1.9s LCP); support ticket correlation; mobile vs desktop performance disparity discovered via RUM segmentation | Specific Core Web Vitals story; backend-healthy-but-user-facing-slow scenario; support ticket correlation |

---

## 10. Related Topics — What to Study Next

- **Topic 266 — Distributed Tracing** — Sentry and Datadog RUM can link frontend errors to backend traces when trace propagation headers are set correctly; a checkout JavaScript error enriched with the `traceId` from the API call lets you jump from the Sentry error to the Jaeger trace and see exactly what the backend did during that failed request — completing the E2E observability story
- **Topic 270 — Alert Strategy** — frontend monitoring generates alerts too; Sentry error rate alerts, Core Web Vitals regression alerts, and conversion funnel drop alerts need the same discipline as backend alerts — topic 270 covers routing, severity, and avoiding front-end alert fatigue
- **Topic 268 — Grafana Dashboards** — Core Web Vitals data sent to a backend endpoint can be aggregated and visualized in Grafana alongside backend metrics; building a "User Experience Scorecard" Grafana dashboard that shows Core Web Vitals, frontend error rate, and API P99 together provides the complete picture of what users experience

---

*Part 16 · Frontend Monitoring — Sentry, Datadog, and RUM · Full Stack Interview Guide · Hruday D · 2026*
