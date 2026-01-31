# Topic 22: MPA Architecture (Multi-Page Application)

> **Context:** Part 3 — Frontend Architecture Patterns  
> **Interview Level:** Senior/Staff Frontend Engineer (7+ years)  
> **FAANG Relevance:** Medium–High — common in CMS, e-commerce, and legacy systems; important to understand trade-offs versus SPA/Hybrid

---

## 1. High-Level Explanation (Frontend Interview Level)

### What is MPA Architecture?

A Multi-Page Application (MPA) is the traditional web architecture in which each distinct URL corresponds to a full page served by the server. Navigation between pages is implemented by the browser requesting a new HTML document from the server, which then responds with rendered HTML (optionally assembled on the server) and associated assets (CSS, JS, images). Each navigation typically results in a full page reload and a fresh render of the UI in the browser.

```
MPA NAVIGATION FLOW
────────────────────
User clicks link → Browser issues HTTP request → Server renders HTML → Browser receives HTML + assets → Browser parses & paints → Page displayed (new document)

State in the browser (JS runtime, memory) is destroyed between navigations unless explicitly persisted (cookies, storage)
```

MPAs are often implemented using server-side frameworks (Rails, Django, Laravel, ASP.NET) that render templates on each request; modern MPAs may also include sprinkle of client-side JavaScript (progressive enhancement) for UX improvements (AJAX, inline widgets).

---

### Why MPAs Exist (Historical & Architectural Rationale)

- Early web (1990s–2005) was almost entirely server-rendered: HTML templates produced on the server for each request.
- MPAs simplify routing: HTTP URLs map naturally to server controllers/actions and templates.
- MPAs excel where SEO, crawling, and initial content delivery speed (without heavy JS) are primary concerns.
- They require no or minimal client-side JavaScript to render content, making them robust on low-end devices and slow networks.

Key drivers:
- Simplicity: server controls rendering and state lifecycle per request.
- SEO friendliness: HTML contains content and meta tags for crawlers.
- Lower initial client complexity: smaller JS payloads, faster first paint on constrained networks.

---

### When and Where MPAs Are Used

✅ Ideal use cases:
- Content-heavy websites: news sites, blogs, documentation sites, marketing pages where SEO is critical.
- E-commerce product pages and category listings where search engine indexing and social sharing matter.
- Legacy enterprise applications built on server frameworks where migration cost is high.
- Applications targeting regions with many low-end devices or slow networks.

⚠️ Not ideal for:
- Highly interactive single-session apps (dashboards, collaborative editors, complex client-side state) where SPAs provide superior user experience.
- Features that require persistent client-state across views unless explicitly engineered (session storage, cookies).

---

### Role in Large-Scale Frontend Applications

At scale, MPAs still play critical roles:

- Marketing sites for major platforms remain MPAs or hybrid: the landing pages are server-rendered for SEO while interactive product areas convert to SPAs or hybrid routes.
- E-commerce platforms may serve product and category pages as MPA routes for SEO and speed, while shopping carts and checkout may be partially client-enhanced or handled as SPA-like flows.
- Enterprise portals (intranet) often use server-rendered pages to simplify access control, auditing, and server-side rendering of complex data.

Examples:
- WordPress, Drupal: archetypal MPA CMSs serving content to millions of users with heavy caching layers.
- Large e-commerce platforms: server-rendered product pages (fast LCP and correct meta tags), with client-side widgets for reviews or image galleries.

Benefits at scale:
- Predictable performance for first render (HTML from CDN/edge)
- Easier SEO and social snippet control
- Simpler caching strategies (full-page caches, surrogate keys)
- Lower browser resource requirements (small JavaScript, minimal memory pressure)

---

### Core MPA Characteristics

1. Server-centric rendering per URL
2. Full document lifecycle per navigation
3. Traditional routing mapped to server controllers
4. Strong default SEO and meta tag control
5. Great fit for progressive enhancement strategies
6. Tends to have smaller JS bundles per page, possibly different per route

```
CORE STACK (typical):
- Web server / CDN
- App server (Rails, Django, PHP, Node SSR)
- Template engine (ERB, Jinja, Blade)
- Static assets (CSS, JS) served from CDN
- Optional client JS for enhancements (AJAX widgets)
```

---

### MPA vs SPA — Executive Comparison

```
┌─────────────────────┬────────────────────┬─────────────────────┐
│ Aspect              │ MPA                │ SPA                 │
├─────────────────────┼────────────────────┼─────────────────────┤
│ Initial FCP         │ Fast (HTML)        │ Slower (JS parse)   │
│ Navigation          │ Full reloads       │ Instant (no reload) │
│ SEO                 │ Native, easy       │ Work required (SSR) │
│ State persistence   │ Short-lived        │ Persistent in memory│
│ Complexity (client) │ Low                │ High                │
│ Bundle size         │ Small per page     │ Larger application  │
│ Offline support     │ Limited            │ Possible (SW)       │
│ Scaling (servers)   │ Server scaling needed│ CDN + statics scalable│
│ Dev speed           │ Fast (server stacks)│ Fast for frontend devs│
└─────────────────────┴────────────────────┴─────────────────────┘
```

*Note:* Hybrid architectures (server-side rendering + hydration, or MPA pages with AJAX widgets) blur these lines and are common in practice.

---

### MPA Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                          BROWSER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  User requests /products/123                              │   │
│  │  ─── HTTP GET /products/123 ──────────────────────────────┘   │
│  │                                                          │   │
│  │  ← index.html (rendered HTML with meta tags, content)    │   │
│  │  ← assets: app.css, page-specific.js                      │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      CDN / Edge Cache                     │   │
│  │  - Serve cached HTML or cached surrogate responses       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      App Server                          │   │
│  │  - Routing: /products/:id → ProductsController#show      │   │
│  │  - Template rendering (server-side template engine)      │   │
│  │  - Server-side composition (partials, includes)          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                        Database                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

### Key Components & Patterns in MPA

1. **Server-Side Templating** — Template engines (ERB, Jinja, Handlebars) render HTML on each request using server data.
2. **Controller/Router** — Server maps URLs to handlers which fetch data and render views.
3. **Full-Page Caching** — Surrogate keys, cache invalidation, Varnish/Edge caches dramatically reduce server load.
4. **Partial/Fragment Caching** — Cache commonly used partials (header, footer, product teaser) and compose them server-side.
5. **Progressive Enhancement** — Render full HTML and layer JS for interactivity (AJAX widgets, inline hydrations).
6. **Form Handling & POST-Redirect-GET** — Traditional form submit patterns for safe resubmissions and predictable navigation.
7. **Edge Rendering & CDNs** — Push pre-rendered HTML to the edge to reduce TTFB and improve FCP.
8. **Security & Session Handling** — Cookies, CSRF tokens, server-managed sessions common in MPA flows.

---

### Interview-Level Explanation (Concise Senior Answer)

**Question:** "When would you choose an MPA over an SPA?"

**Senior Answer:**

"Choose MPA when the primary goals are SEO, predictable first-render performance, and minimum client complexity—especially when you target users on slow networks or low-end devices. MPAs are also the pragmatic choice when maintaining or evolving a large legacy server-rendered codebase: incremental improvements via progressive enhancement and fragment caching deliver big wins without full rewrites. In practice, for marketing pages, product detail pages, or content-heavy sites, I prefer server rendering (MPA-like) or hybrid SSR with edge caching. For authenticated, long-lived interactive applications, SPA or hybrid SSR+CSR is usually better. The real world often uses a hybrid strategy: SSR for public pages and CSR for authenticated app surfaces."

---

**END OF PART 1**

This Part covered Section 1 (High-Level Explanation) with:
- Definition and navigation flow of MPAs
- Historical rationale and why MPAs persist
- Suitable use cases and roles at scale
- Core characteristics and component diagram
- Key server-side patterns (templating, caching, forms)
- A concise interview-level answer for senior engineers

**Type "Continue" to request PART 2: Deep-Dive Explanation (routing internals, caching strategies, fragment caching, form handling, performance, scaling, security, progressive enhancement, example implementations and migration paths).
---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Server Routing Internals

MPAs route at the server level. A URL maps to a controller action (or route handler) that:

1. Authenticates/authorizes the request
2. Fetches data from DB/services
3. Renders templates (possibly composed of fragments)
4. Sets caching headers (Cache-Control, ETag, Surrogate-Key)
5. Returns HTML to client

Key considerations:
- Route table design: explicit mapping (HTTP verbs + path) helps reason about idempotency and caching
- Content negotiation: serve different formats (HTML, JSON, XML) on same route for progressive enhancement
- Middleware pipeline: authentication, CSRF protection, logging, rate-limiting

Example (Express-like):

```javascript
app.get('/products/:id', cacheMiddleware, async (req, res) => {
	const product = await productService.get(req.params.id);
	res.set('Cache-Control', 'public, max-age=60');
	res.render('product/show', { product });
});
```

### Caching Strategies (Edge, Page, Fragment)

1) Full-Page Caching (Edge / CDN)
- Best for truly static or low-change pages (marketing pages, static docs)
- Use cache keys (URL + query normalization)
- Surrogate keys allow targeted purge (e.g., tag product:123 when price changes)

Headers example:

```
Cache-Control: public, max-age=60, stale-while-revalidate=30
Surrogate-Key: product-123 category-phones
```

2) Fragment / Edge Side Includes (ESI) and Partial Caching
- Compose pages from cached fragments: header/footer cached long, personalized fragment (cart, recommendations) fetched dynamically
- Reduces backend work and allows mixing long-lived cache with fresh content

3) Application-Level Fragment Caching
- Use memoization or in-memory cache for rendered partials
- Example: cache rendered product teaser HTML for 15 minutes

4) HTTP Caching and Validation
- ETag/Last-Modified for conditional GETs
- Use 304 Not Modified to save bandwidth

5) Cache Invalidation
- Hard problem: use surrogate keys or event-driven invalidation
- On update: emit event product.updated → cache service purges keys

### Progressive Enhancement & AJAX Islands

MPAs shine when you render the full HTML server-side and enhance only parts with JS:
- AJAX islands: small widgets (comments, reviews, cart) that fetch JSON and hydrate locally
- Inline hydration: server renders HTML and attaches small JS to enhance behavior

Benefits:
- Fast FCP (HTML already contains content)
- Accessible baseline for non-JS clients
- Easier SEO and social shares

Example pattern:

```html
<!-- Server-rendered markup -->
<div id="reviews" data-product-id="123">
	<!-- Static reviews list rendered on server -->
</div>
<script src="/widgets/reviews.js" defer></script>

// reviews.js finds #reviews and attaches client-side handlers (like "load more")
```

### Form Handling & POST-Redirect-GET

Classic pattern for safe submissions:

1. User submits POST /orders
2. Server processes, writes DB, issues 303 Redirect → /orders/123
3. Browser GETs /orders/123 (idempotent)

Advantages:
- Prevents double-submit on refresh
- Bookmarkable result pages

Enhancements:
- Use AJAX submits for better UX but still support progressive enhancement with non-JS fallback
- Apply CSRF tokens in forms and verify server-side

### Performance Considerations (Server & Client)

Server-side:
- Render time: template rendering should be <50-100ms for p95
- DB performance: use denormalized read models or caches for popular pages
- Use background jobs for heavy composition (e.g., computing recommendations)
- Connection pooling and horizontal scaling

Edge/Network:
- Serve HTML from CDN where possible (cacheable pages)
- Use HTTP/2 or HTTP/3 for multiplexing asset requests
- Brotli/gzip compression

Client-side:
- Keep per-page JS small; load only necessary scripts
- Use async/defer on script tags when possible
- Add minimal client JS for interactivity; rely on server for critical rendering

Example: optimize product page
- Cache header/footer at edge 24h
- Cache product HTML for 60s with stale-while-revalidate
- Serve product images via responsive srcset + CDN
- Inline critical CSS for LCP

### Scaling MPAs

1. Frontdoor/Edge: Use CDN + edge cache + WAF
2. App servers: stateless where possible; session store (Redis) for sessions
3. Database: read replicas and caching layer (Redis, Memcached)
4. Background workers: pre-render or warm caches upon updates
5. Autoscaling rules based on CPU, queue length, RPS

Load patterns:
- Cache hit ratio drives backend load: 95% hit means few origin hits
- Design for cache stampede with jittered TTLs or request coalescing

### Security Considerations

- CSRF protection: Synchronizer token pattern or SameSite cookies
- XSS mitigation: server-side escaping, Content-Security-Policy
- Session handling: httpOnly cookies, secure flags, rotate on login
- Input validation and parameterized queries to prevent SQL injection
- Rate limiting per IP or per user on write endpoints

### Observability & Operations

Monitor:
- TTFB, FCP for top routes
- Cache hit ratio, origin RPS
- Request latency distribution (p50/p95/p99)
- Error rates and 5xx spikes

Tools:
- RUM (Real User Monitoring) for client metrics
- Logs + structured events for origin
- Tracing for request flows (edge → app → db)

### Migration Paths (MPA → Hybrid → SPA)

Strategy: Incremental and low-risk

1) Identify candidate routes: which pages are interactive and user-session heavy (dashboard, checkout)
2) Implement AJAX islands on MPA to reduce round-trips
3) Add JSON endpoints to power client widgets
4) Introduce client router only for sub-paths (e.g., /app/*) while leaving marketing as MPA
5) Migrate features incrementally: move one widget/page at a time

Case Study:
- Start: Rails site with server-rendered product pages
- Step 1: Convert cart to AJAX island to improve UX
- Step 2: Add client-side router under /app to host account management (SPA)
- Step 3: Implement hybrid SSR for landing pages (pre-render) while /app is CSR-only

---

**END OF PART 2**

This deep-dive covered:
- Server routing internals and middleware concerns
- Caching strategies (full-page, fragment, surrogate keys)
- Progressive enhancement and AJAX islands
- Form handling and POST-Redirect-GET
- Performance optimizations across server, edge, client
- Scaling architecture and cache-driven load reduction
- Security and observability patterns
- Migration strategy from MPA to hybrid/SPAs

**Type "Continue" for PART 3: Real-World Examples, Code, and Interview Q&A**

---

## 3. Real-World Examples, Code, and Interview Q&A

### Example 1: High-Traffic E-commerce (Server-Rendered MPA)

Problem statement:
- Millions of catalog page views per day
- Frequent price/stock updates for a subset of products
- SEO and social sharing critical

Architecture highlights:
- CDN + full-page caching for product/category pages
- Surrogate keys attached to HTML responses for targeted invalidation
- ESI for small dynamic fragments (cart, recommendations)
- Background job to warm caches after price updates

Nginx + Edge cache example (surrogate key header):

```nginx
location /products/ {
	proxy_pass http://app_servers;
	proxy_set_header Host $host;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_cache my_cache;
	proxy_cache_valid 200 60s;
	proxy_cache_key $scheme$proxy_host$request_uri;
	proxy_ignore_headers Cache-Control;
  
	# Pass-through surrogate key header for edge purging
	proxy_set_header Surrogate-Key $upstream_http_surrogate_key;
}
```

Server-side (Rails-like) controller that sets surrogate key:

```ruby
class ProductsController < ApplicationController
	def show
		@product = Product.find(params[:id])
    
		# Set surrogate key header for CDN invalidation tooling
		response.set_header('Surrogate-Key', "product-#{@product.id} category-#{@product.category_id}")
    
		# Cache control for browsers and CDN
		response.set_header('Cache-Control', 'public, max-age=60, stale-while-revalidate=30')
    
		render :show
	end
end
```

Cache invalidation workflow:
1. Price update event writes DB
2. Background job publishes `product.updated` message to pub/sub
3. Cache invalidation service listens and calls CDN purge for Surrogate-Key `product-123`

Benefits:
- 95% cache hit → origin load reduced significantly
- Fast FCP for product pages
- Targeted invalidation avoids pointless full-cache purges

Trade-offs:
- Slight complexity in orchestration
- Needs eventual consistency guarantees for fresh reads after updates

---

### Example 2: CMS / Blog with Fragment Caching and ESI

Goal:
- Very high read volume
- Personalization only in small widgets ("Welcome back, <name>")

Approach:
- Render main content as static HTML and cache at CDN
- Personalization performed in a small client-side widget or ESI fragment

ESI example (Varnish/Edge Side Includes):

```html
<html>
	<body>
		<main>
			<esi:include src="/fragments/article/123" />
		</main>
    
		<!-- Personalized widget loaded separately -->
		<div id="welcome-widget">
			<esi:include src="/fragments/welcome?user_id=456" />
		</div>
	</body>
</html>
```

Here the article HTML is cached aggressively; the welcome widget can be cached for shorter TTL or be always fetched from the origin since it's tiny.

---

### Example 3: SSR with Interactive Widgets (Progressive Enhancement)

Pattern:
- Server renders full HTML
- Small JS widgets enhance UX (comments, ratings)
- Provide non-JS fallback

Benefits:
- Works for non-JS crawlers and accessibility tools
- Low client JS payload; critical rendering controlled by server

Code sample: Django view with template and JS island

```python
# views.py
from django.shortcuts import render, get_object_or_404

def article_detail(request, slug):
		article = get_object_or_404(Article, slug=slug)
		return render(request, 'article/detail.html', {'article': article})

# article/detail.html
<article>
	<h1>{{ article.title }}</h1>
	<div>{{ article.body|safe }}</div>
  
	<!-- Comments island -->
	<div id="comments" data-article-id="{{ article.id }}">
		{% include 'partials/comments_static.html' %}
	</div>
	<script defer src="/static/js/comments-widget.js"></script>
</article>
```

The `comments-widget.js` fetches `/api/articles/<id>/comments` and wires up client-side interactions (like posting a comment) while the server-rendered static comments keep the page useful before JS loads.

---

### Interview Q&A (Senior / Staff Level)

Q1: "How do you invalidate caches reliably when data changes?"

Senior Answer:
"Cache invalidation is one of the hardest engineering problems. In practice I prefer a hybrid approach:

1. Attach `Surrogate-Key` headers to responses (product-123, category-5).
2. On writes (price update), publish an event `product.updated` containing the affected surrogate keys.
3. A cache-invalidation service (or CDN API integration) receives the event and issues targeted purge requests for the relevant keys.

This avoids indiscriminate purges. For eventual consistency windows, we use `stale-while-revalidate` to serve stale content while revalidating in the background. For critical updates (price correction, takedowns), we run synchronous purges and fallbacks. We monitor purge latencies and mismatches as a health metric."

Q2: "How would you handle personalization on an MPA without breaking cacheability?"

Senior Answer:
"Keep personalization out of the cacheable core. Use one of several patterns:

- ESI fragments for small, dynamic content that must be personalized.
- Client-side JS islands that fetch and render personalized data after the page loads.
- Edge workers that perform A/B experiments or personalization at the CDN edge with short TTL.

The idea is to maximize the cacheability of the heavy, expensive-to-render parts (article HTML) and isolate the few bytes that must be fresh. This keeps cache hit ratio high while still delivering a personalized experience."

Q3: "What are the operational signals you monitor for an MPA?"

Senior Answer:
"Key metrics include: cache hit ratio, origin requests per second, TTFB, FCP/LCP for top pages, purge latency, and 5xx/error rates. For writes-heavy endpoints: queue length and background job lag. For edge performance: CDN regional latencies and missed cache rates. We set SLOs on p95 TTFB and trigger rollbacks if a deployment causes cache invalidation storms."

Q4: "We have a monolithic MPA and want to migrate to SPA. How would you approach it?"

Senior Answer:
"I prefer incremental migrations. The steps I'd take:

1. Identify boundaries: which sections need SPA features (dashboard, checkout). Keep marketing and content pages as MPA/SSR.
2. Add JSON endpoints and small client-side widgets (AJAX islands) to improve UX where needed.
3. Introduce an SPA under a sub-path (e.g., `/app/*`) and route users there for authenticated flows. Keep SSO and cookie/session handling consistent.
4. Gradually move components and features, maintaining parity tests and end-to-end checks.
5. Monitor RUM and error rates closely during each rollout.

This minimizes risk and allows progressive investment. Full rewrites rarely finish faster than incremental improvements."

---

### Practical Code Snippets

1) Purge CDN via API (pseudo-code)

```javascript
// cache-purger.js
async function purgeSurrogateKey(key) {
	await fetch('https://api.cdn.example.com/purge', {
		method: 'POST',
		headers: { 'Authorization': `Bearer ${process.env.CDN_API_TOKEN}` },
		body: JSON.stringify({ key })
	});
}

// Hook into product update pipeline
productService.on('updated', (product) => {
	const key = `product-${product.id}`;
	purgeSurrogateKey(key);
});
```

2) Fragment cache usage in Rails view (erb)

```erb
<% cache ['product', @product.cache_key] do %>
	<div class="product-teaser">
		<%= image_tag @product.image_url %>
		<h3><%= @product.title %></h3>
		<p><%= number_to_currency(@product.price) %></p>
	</div>
<% end %>
```

3) Simple POST-Redirect-GET in Express

```javascript
app.post('/orders', async (req, res) => {
	const order = await Order.create(req.body);
	// Redirect to result page
	res.redirect(303, `/orders/${order.id}`);
});

app.get('/orders/:id', async (req, res) => {
	const order = await Order.find(req.params.id);
	res.render('orders/show', { order });
});
```

---

## 4. Why & How Summary (Short Answers for Interviews)

- Why MPA: Fast first paint, SEO, robust on low-end devices, simple caching model
- How it works: Server maps URL → fetches data → renders template → returns HTML. Client may enhance with JS islands.
- Trade-offs: Simpler client but more server responsibility; harder to achieve app-like persistence without client-side work.

**END OF PART 3**

This part provided practical, production-ready patterns, code samples, and senior-level interview Q&A for MPAs. 

**Type "Continue" for PART 4: Final Interview Summary, Edge Cases, and Checklist**


---

## 7. Final Interview Summary, Edge Cases, and Checklist (Part 4)

### Final Interview Summary (60-90s Senior Answer)

"MPA (Multi-Page Application) is the server-first web architecture where each URL is rendered on the server and returned as a full HTML document. It's the pragmatic choice for content-heavy and SEO-sensitive workloads because it delivers fast first paint, simple meta control, and a straightforward caching model. At scale, MPAs use CDN-level full-page caching, fragment caching (ESI or application-level), and surrogate keys for targeted invalidation. For interactive features, the recommended pattern is progressive enhancement: keep the heavy content cacheable and isolate small JS islands for personalization or interactivity. When migrating to SPA-like experiences, choose an incremental approach—add JSON endpoints and islands, introduce a client router for sub-paths, and monitor RUM and origin load carefully. The key trade-offs are server complexity and harder client-side persistence versus superior initial render performance and SEO."

### Common Edge Cases & How to Handle Them

- Cache stampede (many requests for expired content):
  - Mitigate with request coalescing, jittered TTLs, and stale-while-revalidate or background revalidation.

- Invalidation storms after deploys or bulk updates:
  - Batch purges, rate-limit purge requests, and use targeted surrogate-key invalidation instead of full-cache clear.

- Personalized content leaking into cached pages:
  - Strictly separate cacheable HTML from personalized fragments; avoid user-specific cookies influencing cache keys.

- Bots crawling with query strings causing cache fragmentation:
  - Normalize query strings for cache keys and block or rate-limit aggressive crawlers.

- Large pages with many fragments leading to composition overhead:
  - Pre-compose expensive fragments or use server-side streaming to progressively send content.

- Real-time updates (inventory, live scores):
  - Use short-ttl cache for pages or delegate real-time data to websockets/edge-worker endpoints for small widgets.

- Session affinity and sticky servers complicating horizontal scaling:
  - Use centralized session stores (Redis) or JWT-based stateless sessions.

### Quick Operational Checklist (for interviews or on-call)

- Cache & CDN
  - [ ] Confirm cache hit ratio and origin RPS targets
  - [ ] Verify surrogate-key headers are set on cacheable responses
  - [ ] Ensure purge pipeline (events → purge API) is instrumented and retry-safe

- Performance
  - [ ] P95 render time (server) under threshold (e.g., <100ms)
  - [ ] LCP/FCP p75 within SLO for top pages
  - [ ] Images optimized and served via CDN with responsive sizes

- Security
  - [ ] CSRF protection enabled on write endpoints
  - [ ] CSP and XSS protections in place for templates
  - [ ] Session cookies flagged HttpOnly and Secure

- Reliability & Scaling
  - [ ] Background job queues monitored (cache warmers, invalidators)
  - [ ] Autoscaling on app servers tuned to origin RPS, not just CPU
  - [ ] Circuit breakers for downstream services used in requests

- Observability
  - [ ] RUM installed for core routes
  - [ ] Alert on cache hit ratio drops and purge latencies
  - [ ] Traces for top-level request flows (edge → app → db)

### Short Talking Points (for panel interviews)

- "Prefer MPA for SEO and predictable first-render performance; hybrid for progressive enhancement and SPA flows where necessary." 
- "Surrogate keys + event-driven invalidation is the most practical approach to targeted purges at scale." 
- "Always isolate personalization from cacheable HTML; JS islands or edge workers do personalization without killing cache efficiency." 
- "Migrations should be incremental: add JSON endpoints, islands, then an SPA under a sub-path—avoid big-bang rewrites."

---

## Done — Topic 22: MPA Architecture (All Parts Complete)

This file now contains High-Level, Deep-Dive, Real-World Examples & Code, and Final Interview Summary + Checklist. You're all set to review or ask me to continue to Topic 23.
