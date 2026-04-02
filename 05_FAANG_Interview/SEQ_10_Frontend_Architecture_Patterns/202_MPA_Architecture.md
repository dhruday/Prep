# 202. MPA Architecture
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"MPA — Multi-Page Application — returns a full HTML page from the server for every navigation. It's the traditional web model: user clicks a link, server generates HTML, browser renders it fresh. MPAs are still relevant for content-heavy public sites where SEO is critical and first-load speed matters most. My experience is primarily with SPAs, but I understand when an MPA or hybrid approach is the right call — for example, a public-facing marketing site should use MPA or SSR, not a client-heavy SPA."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists
A Multi-Page Application consists of multiple distinct HTML pages, each served by the server on navigation. Every link click triggers a full server round-trip: request → server generates HTML → browser renders the new page.

Before JavaScript frameworks dominated, every web app was an MPA. PHP, Rails, Django, and server-side Java apps were all MPAs. They're still used for:
- Public content sites (news, e-commerce, blogs)
- SEO-critical pages
- Sites where users visit briefly and leave (not session-based)

### How It Works Internally

**Full page navigation flow:**
```
1. User clicks "Products" link
2. Browser sends HTTP GET /products to server
3. Server fetches data from database
4. Server renders complete HTML (including data)
5. Server sends HTML response
6. Browser parses and renders HTML
7. CSS and JS files load separately
8. Page is interactive
```

**No JavaScript routing needed** — the browser's native link behavior handles everything. Each page is a separate URL with its own HTML, CSS, and JS.

### Architecture & Component Boundaries

```
MPA Architecture (e.g., Next.js Pages Router / PHP / Django):

/                → index.html (homepage)
/products        → products.html (product list)  
/products/123    → product-detail.html (product detail)
/cart            → cart.html (shopping cart)

Each page:
  ├── Has its own HTML response
  ├── Can share CSS via CDN links
  ├── Can share JS (jQuery / small widgets) via CDN
  └── No shared JavaScript state across pages
```

### Data Flow & State Flow
```
Server-side (Django/Rails/PHP):
  Request: GET /products?category=shoes
    → Server queries database
    → Server renders HTML template with data
    → Returns <html>...<li>Nike Air Max</li>...</html>
  
Client-side (NO state persists across pages):
  Each page reload = fresh state
  Cart persistence: cookies / localStorage
  Auth persistence: HttpOnly cookies
```

### Performance Implications

**Advantages:**
- **Excellent FCP/LCP:** Server returns real HTML with content — browser renders content immediately without waiting for JS
- **No JavaScript bundle required:** Browser shows content before any JS downloads
- **Perfect for CDN caching:** Static HTML pages cached at edge globally

**Disadvantages:**
- **Full reload on every navigation:** White flash between pages, slower UX
- **Repeated asset loads:** CSS, fonts, shared JS re-download on every page (mitigated with browser caching)
- **Server must generate every page:** More server load vs SPA where browser handles routing

### Scalability Considerations
- MPAs scale extremely well because HTML pages are static and cacheable at CDN
- Modern MPAs use static generation (SSG) — generate every page HTML at build time, serve from CDN — near-zero server cost
- For dynamic MPAs, database query optimization is the bottleneck, not the browser

### Trade-offs
| MPA | SPA | When to Choose MPA |
|---|---|---|
| Excellent SEO | SEO requires extra work | Content-first public sites |
| Fast first load | Heavy first load | Users visit briefly |
| No persistent JS state | Rich app-like state | Separate sessions per page is fine |
| Simple server-side rendering | Complex client-side routing | Server-side frameworks (Rails, Django) make sense |
| Full reload on navigation | Instant navigation | Navigation frequency is low |

### ⚠️ Anti-Patterns & Pitfalls
- **Forcing MPA model on app-like products:** A dashboard that reloads on every action loses state (active filters, scroll position) — use SPA for this
- **No browser caching strategy:** Each navigation re-downloading the same CSS/fonts — set proper `Cache-Control` headers
- **No partial updates:** Some MPAs re-render the entire page for a small change — use HTMX or fetch + innerHTML for partial updates while keeping MPA model
- **Heavy JavaScript on every page:** Loading React/Angular on an MPA is unusual — contradicts the simplicity of MPA. Use vanilla JS or small focused libraries

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At Capgemini working on enterprise apps, the legacy systems were MPAs — classic Java Spring MVC apps generating Thymeleaf HTML templates. The challenge was always maintaining session state (e.g., a multi-step form) across page reloads. Moving to Angular SPA at later projects resolved that entirely.

**At FAANG scale:**
- **Google Search:** Classic MPA — every search result page is a server-rendered HTML response. The speed comes from server-side efficiency and CDN edge caching, not client-side JS
- **Amazon product pages:** MPA with SSR — server renders full HTML for SEO + fast first load, small JS enhances the experience (add to cart, image gallery)
- **Microsoft Docs:** Static site (SSG) — MPA where each documentation page is pre-rendered HTML at build time
- **Adobe Help Center:** Static MPA — SEO-optimized help articles served as pre-rendered HTML

**How it evolves with scale:**
- Small scale: Server-rendered MPA (PHP/Rails) — simple, fast, predictable
- Medium scale: Static generation (Next.js/Gatsby SSG) — pre-render all pages at build time
- Large scale: CDN-edge-cached HTML + API calls for dynamic parts (ISR) — millions of pages served globally with minimal server cost

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "MPA is the right choice for content-heavy public sites where SEO and first-load performance are more important than session-based interactivity. Every page is a full server HTML response — the browser renders it fast because content is immediately in the HTML, not loaded by JavaScript. Google Search is a perfect example — complete HTML per result, instantly crawlable, blazing fast. For an enterprise dashboard where users are authenticated and stay for hours, I'd use SPA. For a public product catalog with thousands of SKUs that need to rank in Google, I'd use MPA with SSG. Hybrid is often the answer: Next.js lets you choose SSG vs SSR vs SPA per route."

### Likely Follow-up Questions
1. "How does MPA handle state across pages?" → Cookies, localStorage, server-side sessions — no shared JavaScript state
2. "How does MPA differ from SSR?" → SSR (Server-Side Rendering) is a technique; MPA is an architecture. An SSR SPA renders the first page on the server, then handles navigation client-side. A pure MPA does server-rendering on EVERY navigation.
3. "Is Next.js MPA or SPA?" → Hybrid — Pages router can be configured per-page. App router defaults to server components with client components mixed in.

### vs Alternatives
| MPA | SPA | Hybrid (Next.js) |
|---|---|---|
| SEO-first | Interaction-first | Best of both |
| Full reloads | Instant navigation | Configurable per route |
| Simple mental model | Complex client state | Requires Next.js knowledge |
| Public sites, e-commerce | Dashboards, tools | Most modern production apps |

### How to Signal Senior Thinking
> "The choice between MPA and SPA isn't contentious anymore — modern frameworks like Next.js give you both. The senior decision is: which rendering model does each route in my application need? Public landing page → SSG/MPA. Auth dashboard → SPA. Product detail → SSR/ISR for SEO. This granularity is what separates architects from framework users."

---

## 💻 5. Code Example

```typescript
// Next.js: Mix MPA and SPA behavior per route
// This is how modern apps use the best of both

// pages/product/[id].tsx — MPA-style (SSR per request — for SEO)
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { id } = context.params!;
  const product = await fetchProductById(id as string);
  // Server fetches and returns full HTML with data — MPA behavior
  return { props: { product } };
}

export default function ProductPage({ product }: { product: Product }) {
  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      {/* Page rendered with full data — crawlable, fast FCP */}
    </main>
  );
}

// pages/dashboard.tsx — SPA-style (client-side only — for auth app)
// No getServerSideProps → renders fully on client
export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetchDashboardData().then(setData);
  }, []);
  return <DashboardView data={data} />;
}

// The key insight: route-level rendering model choice
// /product/[id]  → Server-rendered HTML per request (MPA) — for SEO
// /dashboard     → Client-rendered (SPA) — auth-gated, no SEO needed
```

**Interview vs Production difference:**
In an interview, make the trade-off visible in code/architecture. In production, add ISR (`revalidate:60`) to product pages so they re-generate automatically without full SSR cost on every request.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "One URL = one server HTML response. Like ordering from a restaurant: every order is freshly prepared."
**If you go blank:** "MPA = server generates HTML on every navigation. Great for SEO and first load. Bad for persistent state and interactive apps."
**Mnemonic:** **MPA** = **M**ultiple pages, **P**age from server, **A**ll SEO-friendly

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Excellent first-load experience — content is in the HTML, no JavaScript needed to see it
→ Performance: FCP/LCP are best in class because HTML arrives with data
→ Business: SEO drives organic traffic — MPA/SSR pages rank better than SPA empty shells

**How it works (3 sentences):**
Every navigation in an MPA triggers a full server roundtrip: the browser requests a URL, the server returns a complete HTML page with content, and the browser renders it from scratch. No client-side routing or shared JavaScript state exists between pages. Modern MPAs use static generation to pre-render HTML at build time and serve it from CDN for near-zero server cost.

**Company relevance:**
- Microsoft: Microsoft.com and Docs use SSG/MPA — expects engineers to understand content site architecture
- Adobe: Adobe.com and Help Center are MPA/SSG — performance and SEO are primary concerns
- Salesforce: Public Trailhead and developer docs use MPA patterns — SEO-critical content
- Cisco: Cisco.com product pages use MPA/SSR — content discoverability is essential

---
**✅ Topic 202/486 complete → continuing to Topic 203: Hybrid Rendering Architecture**
