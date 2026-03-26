# React Server Components — Server vs Client Boundary
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **React Server Components (RSC)**: components that run ONLY on the server — they fetch data, access databases/file system directly, and render HTML; they send zero JavaScript to the browser; they cannot use browser APIs (`window`, `localStorage`), hooks (`useState`, `useEffect`), or event handlers
- **Client Components**: the React components you already know — they run in the browser, can use all hooks and browser APIs, handle user interactions; you mark them with `'use client'` at the top of the file; in Next.js App Router, anything without `'use client'` is a Server Component by default
- **The boundary rule**: Server Components CAN import and render Client Components; Client Components CANNOT import Server Components (because the Server Component doesn't exist in the browser); you pass Server Component output as `children` or props to Client Components
- **Why RSC matters for performance**: JavaScript shipped to the browser = only the Client Component code; the Server Component code, its imports (React Query, lodash, date-fns), and all data-fetching logic stay on the server — this can reduce client JavaScript by 60-80% for data-heavy pages
- **Server Actions**: functions marked with `'use server'` that run on the server; callable directly from Client Component event handlers without writing API routes; used for form submissions, mutations, database writes — the server-side "action" half of the RSC model
- **The mental model**: RSC is "PHP-style server rendering powered by React" — your component IS the server handler; it reads data directly without a separate API; but the output is React's virtual DOM, so seamless composition with Client Components is possible

---

## 1. One-Line Definition
React Server Components are components that execute exclusively on the server, rendering HTML with data fetched directly from databases or services, and shipping zero JavaScript to the browser, while Client Components handle interactivity in the browser — and the boundary between them is the architectural decision that drives both performance and capabilities.

---

## 2. The Problem It Solves

Before Server Components, every React app had a fundamental performance cost: ALL component code shipped to the browser, even code that only existed to fetch data and render a static output. A product page using a date formatting library (moment.js: 67KB), a markdown parser (marked.js: 22KB), and a price calculations utility — all of that JavaScript downloaded, parsed, and executed in the user's browser, even though the rendered output was deterministic and never changed interactively.

The second problem: the client-side data fetching waterfall. When a component mounts, it calls `useEffect` to fetch data. But if that component renders a child component that ALSO fetches data in its own `useEffect`, those fetches happen sequentially — parent renders, parent fetches, parent re-renders with data, child renders, child fetches. In a deeply nested component tree, this created 3-4 sequential network round trips before the page had complete data.

The traditional SSR fix (Next.js `getServerSideProps`) moved data fetching to the server, but it was only possible at the PAGE level — a single `getServerSideProps` for the whole page had to fetch ALL the data the page needed, creating a data contract between the page and every nested component. Changing any nested component's data requirements meant changing the top-level fetch. Code organisation and data ownership were decoupled.

React Server Components solve both problems elegantly. The heavy libraries stay on the server. Data fetching lives co-located with the component that needs it, not hoisted to the page root. And the entire server-rendered tree of a complex page generates zero client JavaScript unless specific components opt into interactivity with `'use client'`.

---

## 3. How It Works Internally

### The New Component Model

```
React App Tree (Next.js App Router):

                        Page (Server Component)
                             │
                    ┌────────┴──────────────┐
                    │                       │
              ProductDetails          ReviewsSection
           (Server Component)        (Server Component)
                    │                       │
                    │                       │
              ProductImages            ReviewList
           (Server Component)        (Server Component)
                    │
            AddToCartButton          ← 'use client' directive
           (CLIENT Component)         runs in browser, uses useState
                    │
          QuantitySelector            ← 'use client' — onClick handler
           (CLIENT Component)

What ships to the browser:
  ✅ HTML for ProductDetails, ReviewsSection, all server components
  ✅ JavaScript ONLY for AddToCartButton and QuantitySelector
  ❌ NOT shipped: data fetching logic, date-fns, product utility code,
               review sorting code — all stayed on server

What the browser downloads and executes:
  Before RSC: entire app bundle including ALL component code
  After RSC: only AddToCartButton + QuantitySelector + their direct imports
  
  Real figures: ~45KB JavaScript for the interactive parts vs ~400KB for the full app
```

### Server / Client Boundary Rules

```
ALLOWED:
  Server Component → import Client Component ✅
    Server wraps Client: <AddToCart> is a Client, rendered inside a Server:
    
    // product/page.tsx (Server Component)
    import AddToCartButton from './AddToCartButton';  // Client Component, fine
    const product = await db.products.findById(id);
    return (
      <div>
        <h1>{product.name}</h1>
        <AddToCartButton productId={product.id} />   ✅ passes serializable props
      </div>
    );

  Server Component passed as children to Client Component ✅
    // layout.tsx (Client Component — has useState for theme)
    'use client';
    export function ThemeWrapper({ children }) {
      const [isDark, setIsDark] = useState(false);
      return <div className={isDark ? 'dark' : 'light'}>{children}</div>;
    }
    
    // page.tsx (Server Component)
    // ProductDetails is Server Component, rendered INSIDE ThemeWrapper Client Component:
    <ThemeWrapper>
      <ProductDetails />   ✅ ProductDetails renders on server, its HTML is children
    </ThemeWrapper>

NOT ALLOWED:
  Client Component → import Server Component ❌
    // This makes no sense — the Client Component runs in the browser
    // The Server Component cannot exist in the browser
    
    'use client';
    import ProductFetcher from './ProductFetcher'; // ❌ Server Component
    // Error: Server Component cannot be a child of Client Component directly
    
    // Solution: pass as children from a Server Component above them
```

### Server Actions

```
Server Actions are functions that:
  - Run on the server only
  - Called from Client Components without any API route
  - Marked with 'use server' (can be in a separate file)
  - Receive form data or typed arguments
  - Return serializable values

// app/actions/cart.ts
'use server';

import { db } from '@/db';
import { revalidatePath } from 'next/cache';

export async function addToCart(productId: string, quantity: number): Promise<void> {
  // Runs on server — can directly access DB
  const userId = await getCurrentUserId();   // Auth check on server
  
  await db.cartItems.create({
    data: { userId, productId, quantity }
  });
  
  revalidatePath('/cart');  // Invalidate cached cart page
}

// Client Component calls it directly — no fetch('/api/cart'), no API route
'use client';
export function AddToCartButton({ productId }) {
  const handleClick = async () => {
    await addToCart(productId, 1);  // Direct function call → becomes HTTP POST internally
  };
  return <button onClick={handleClick}>Add to Cart</button>;
}
```

---

## 4. The Code

### Wrong Way — Everything in Client Components (Old Pattern)
```tsx
// ❌ WRONG — entire page as a Client Component, all JavaScript ships to browser
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';          // 67KB — ships to browser
import { marked } from 'marked';            // 22KB — ships to browser
import { calculateDiscount } from '@/utils/pricing';  // All pricing logic — ships to browser

export default function ProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ❌ Sequential waterfall: product loads, THEN reviews fetch begins
  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(r => r.json())
      .then(product => {
        setProduct(product);
        // ❌ Secondary fetch only starts after first resolves
        return fetch(`/api/products/${params.id}/reviews`);
      })
      .then(r => r.json())
      .then(reviews => {
        setReviews(reviews);
        setIsLoading(false);
      });
  }, [params.id]);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <h1>{product?.name}</h1>
      {/* ❌ date-fns, marked, and pricing logic all downloaded by every user's browser */}
      <p>{format(new Date(product!.createdAt), 'dd MMM yyyy')}</p>
      <div dangerouslySetInnerHTML={{ __html: marked(product!.description) }} />
      <p>Discounted: ₹{calculateDiscount(product!.price, product!.discount)}</p>
    </div>
  );
}
```

> **Why this fails:** Date-fns (67KB), marked (22KB), and all pricing utilities ship to every user's browser even though they produce deterministic output from server data. The sequential `useEffect` chain means reviews only start loading after products finish loading — unnecessary latency. Every one of these API calls is an extra browser-to-server round trip when the component could run on the server and access data directly.

### Right Way — RSC with Proper Server/Client Split
```tsx
// ✅ RIGHT — Next.js App Router with Server Components

// app/products/[id]/page.tsx — SERVER COMPONENT (no 'use client')
// date-fns, marked, pricing utilities NEVER SHIP TO BROWSER
import { format } from 'date-fns';       // runs on server only — zero client JS
import { marked } from 'marked';         // runs on server only — zero client JS
import { db } from '@/db';               // direct DB access — impossible in browser

interface PageProps {
  params: { id: string };
}

export default async function ProductPage({ params }: PageProps) {
  // PARALLEL data fetching on server — both requests fire simultaneously
  // No round trips via browser (server → DB is in the same data centre)
  const [product, reviews] = await Promise.all([
    db.products.findUnique({
      where: { id: params.id },
      include: { images: true, seller: true }
    }),
    db.reviews.findMany({
      where: { productId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);
  
  if (!product) notFound();  // Next.js 404
  
  // date-fns formatting ON SERVER — no library shipped to browser
  const formattedDate = format(new Date(product.createdAt), 'dd MMM yyyy');
  
  // Markdown parsing ON SERVER — marked library never in client bundle
  const descriptionHtml = marked(product.description);
  
  return (
    <main>
      <h1>{product.name}</h1>
      <p>Listed on: {formattedDate}</p>
      
      {/* 
        descriptionHtml is a string — safe to render because marked is trusted
        and we control the content. For user-generated content, sanitize with DOMPurify SERVER-SIDE
      */}
      <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
      
      {/* 
        AddToCartButton is a CLIENT COMPONENT — it needs onClick, useState.
        We pass ONLY serializable prop (productId: string).
        Cannot pass the entire product object if it has circular references or functions.
      */}
      <AddToCartButton
        productId={product.id}
        currentStock={product.stock}
      />
      
      {/* ReviewList is a Server Component — renders review data as HTML */}
      <ReviewList reviews={reviews} />
    </main>
  );
}
```

```tsx
// app/products/[id]/add-to-cart-button.tsx — CLIENT COMPONENT
'use client';  // ← explicit opt-in to client rendering

import { useState } from 'react';
import { addToCart } from '@/actions/cart';  // Server Action import

interface AddToCartButtonProps {
  productId: string;
  currentStock: number;
}

export function AddToCartButton({ productId, currentStock }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'adding' | 'added'>('idle');
  
  const handleAddToCart = async () => {
    if (currentStock === 0) return;
    setStatus('adding');
    
    try {
      await addToCart(productId, quantity);   // Server Action — POST to /api/actions
      setStatus('added');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('idle');
    }
  };
  
  return (
    <div>
      <input
        type="number"
        min={1}
        max={currentStock}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        aria-label="Quantity"
      />
      <button
        onClick={handleAddToCart}
        disabled={status === 'adding' || currentStock === 0}
      >
        {status === 'adding' ? 'Adding...' : status === 'added' ? '✓ Added' : 'Add to Cart'}
      </button>
      {currentStock === 0 && <p>Out of stock</p>}
    </div>
  );
}
```

```tsx
// app/actions/cart.ts — SERVER ACTION
'use server';

import { db } from '@/db';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

export async function addToCart(productId: string, quantity: number): Promise<void> {
  // Auth validation on server — Client Component cannot fake this
  const session = await getServerSession();
  if (!session?.user?.id) throw new Error('Authentication required');
  
  // Input validation — never trust client input
  if (quantity < 1 || quantity > 100) throw new Error('Invalid quantity');
  if (!productId || typeof productId !== 'string') throw new Error('Invalid product');
  
  // Verify stock availability before adding
  const product = await db.products.findUnique({ where: { id: productId } });
  if (!product || product.stock < quantity) throw new Error('Insufficient stock');
  
  await db.cartItems.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    create: { userId: session.user.id, productId, quantity },
    update: { quantity: { increment: quantity } }
  });
  
  // Invalidate the cart count shown in the header (Server Component will re-render)
  revalidatePath('/');
  revalidatePath('/cart');
}
```

> **Key decisions here:**
> - `Promise.all([product fetch, reviews fetch])` — parallel fetches on the server; both queries hit the database simultaneously, reducing total data-fetch time from sum to maximum
> - Markdown parsed on server — the 22KB `marked` library never enters the client JavaScript bundle; it runs once on server and returns an HTML string
> - Server Action validates auth AND business rules — a Client Component cannot validate stock or authenticate; all trust boundaries are on the server
> - Only serializable props cross the Server/Client boundary — `productId: string` and `currentStock: number`, not the full product object; the RSC model serializes props to send from server to client

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between a React Server Component and just doing server-side rendering?"

**Hruday's answer:**
> Traditional SSR (like Next.js `getServerSideProps`) meant the entire page's data fetching was hoisted to one function at the page root. The page component received all its data as props, then passed them down to child components. Data ownership was separated from the component that needed it.
>
> React Server Components let EACH COMPONENT fetch its own data, directly, on the server — without any top-level data aggregation. The product detail component fetches the product. The reviews component fetches the reviews. The seller info component fetches seller details. Each is co-located with its data needs, just like client-side components with `useEffect`, but WITHOUT any client-server waterfall.
>
> The second difference is JavaScript delivery. Traditional SSR renders HTML on the server but still ships the entire React component code to the browser for hydration. Server Components ship ZERO JavaScript — they're done after rendering HTML. Only Client Components (the interactive parts) ship their code to the browser.
>
> The result: a page that's partially a Server Component tree and partially Client Components ships minimal JavaScript — only the interactive parts — while getting co-located data fetching that was previously impossible without API routes and `useEffect`.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why can't a Client Component import a Server Component?"

**Hruday's answer:**
> Server Components only exist on the server — they have database connections, server-only secrets, and run in a Node.js environment. None of that exists in the browser where Client Components execute.
>
> If a Client Component imported a Server Component, the bundler would try to include that Server Component in the JavaScript bundle sent to the browser. But the Server Component may import `db` connections, file system (`fs`), or server-only packages — these modules don't exist in browser environments and would cause runtime errors. Even if they could be filtered out, the Server Component code references concepts (direct database access, server session reading) that have no meaning in a browser.
>
> More fundamentally: Server Components are rendered on the server and their rendered output (React element tree, essentially serialised HTML) is what gets sent to the browser. A Client Component running in the browser cannot re-render a Server Component because the server runtime isn't available.
>
> The workaround for passing content from a Server Component "into" a Client Component is the `children` prop pattern. A Client Component can accept `children` (which React treats as ReactNode). A Server Component above it can render the Client Component and pass Server Component output as `children`. The Server Component renders on the server, its output becomes serialised elements that cross the boundary as React's JSON-like data format, and the Client Component receives them as `children` — but never re-renders them on the client.

---

### Q3 — Trade-Off
**Interviewer asks:** "What are the limitations of React Server Components?"

**Hruday's answer:**
> Three real limitations I'd raise in an architecture discussion.
>
> First: no interactivity in Server Components. No `useState`, no `useEffect`, no event handlers — not because of a limitation but by design. If a component needs to respond to user interaction, it must be a Client Component. This forces you to be intentional about the boundary: some developers end up marking too many components as `'use client'` when the actual interactive part is just a button at the bottom. The discipline to identify the minimal Client Component is a skill.
>
> Second: props must be serializable. You can't pass a function, a class instance, or a React component as a prop from a Server Component to a Client Component (because the boundary requires JSON serialization). This limits some advanced patterns — you can't pass a renderProp function from the server to a client. The workaround is composing with `children` or restructuring the component hierarchy.
>
> Third: testing is harder. Server Components are async functions — unit testing them requires mocking the database or service calls. The standard React Testing Library rendering model (which is browser-based) doesn't naturally support Server Components. Testing infrastructure for RSC is still maturing. Currently, integration and E2E tests cover Server Component behavior more reliably than unit tests.
>
> The larger limitation is ecosystem readiness — not all React libraries support RSC. Libraries that use Context or `useState` internally (anything that calls React hooks) cannot be Server Components. Wrapping them in Client Components is required, which adds boundary management overhead.

---

### Q4 — Scenario
**Interviewer asks:** "Design the product detail page for Meesho using React Server Components."

**Hruday's answer:**
> The page has: product images, title, price with discount, seller info, description (markdown), reviews (with pagination), and an "Add to Cart" button. Here's how I'd split the boundary.
>
> Server Components: everything that is static per request — the product details page component (fetches product + initial reviews in parallel using `Promise.all`), `ProductImages` (renders image carousel markup with pre-loaded URLs), `SellerInfo` (fetches seller data from DB), `ReviewList` (renders first 10 reviews as HTML). Description parsing with marked stays on the server — zero bytes of `marked` shipped to the browser.
>
> Client Components: `ImageCarousel` (needs `useState` for the active image index and touch swipe), `AddToCartButton` (needs `useState` for optimistic add, calls Server Action), `ReviewPagination` (needs `useState` for current page, triggers navigation), `PriceDiscountBadge` with countdown timer for sale (needs `useEffect` for the timer).
>
> The boundary: the Server Component page assembles everything and passes serializable props to Client Components — `productId`, `imageUrls[]`, `currentPrice`, `discountedPrice`.
>
> Server Action: `addToCart(productId, quantity)` — validates auth, checks stock, writes to DB, invalidates the cart header count via `revalidatePath`. Client Component calls this directly without any API route or `fetch`.
>
> Net result: most of the 300-line product page ships zero JavaScript. Only the four Client Components (carousel state + add to cart + pagination + countdown timer) ship JavaScript. Meesho's Lighthouse JavaScript budget stays in check even as features are added.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "`'use client'` means client-only" | "Marking a component `'use client'` means it renders ONLY in the browser" | Client Components still render on the server during SSR for the initial page load — `'use client'` means the component also ships its JavaScript to the browser and runs there for interactivity; it renders on BOTH server (for initial HTML) and client (for hydration/updates); only Server Components truly render server-only |
| "All children of Client Components become Client Components" | "Once you add `'use client'`, everything below it is now a Client Component too" | Within the `'use client'`-ed component's FILE's imports — yes, those become client too; but children passed via the `children` prop from a parent Server Component above remain Server Components; the boundary is about import chains, not render tree depth — passing Server Component output as `children` to a Client Component is explicitly supported |
| "Server Actions are just API routes" | "Server Actions are like `fetch('/api/cart')` but with nicer syntax" | Server Actions have type safety (the function signature IS the contract; TypeScript validates caller and implementation together), colocation (action defined next to the component that uses it, not in a separate `/api/` directory), automatic CSRF protection (Next.js validates the origin), and Progressive Enhancement (HTML `<form action={serverAction}>` works without JavaScript) |
| "RSC requires Next.js" | "RSC is a Next.js feature" | RSC is a React core feature — the React team built it; Next.js App Router was the first production-ready implementation; Remix has RSC support in progress; Vite + React has server component support via Waku and other minimal frameworks; the model is in React itself, not Next.js |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our micro-frontend architecture was built before RSC was production-ready. We used a pattern that RSC now formalises: page-level data fetching in the host shell passed data down to remote components via props — our 'proto-RSC' approach. The data fetching was co-located in our route handlers, component code stayed clean.
>
> When I studied RSC while evaluating Next.js App Router for our SAP BTP developer portal, the insight that clicked for me was: RSC solves the problem we were manually solving with page-level data aggregation, but does it at the component level. Each component being its own data owner — with no client-side waterfall — is exactly what the developer portal needed where pages had deeply nested components each with distinct data requirements.
>
> The SAP developer portal is now a strong use case I'd target for RSC: mostly static content (docs, API references) rendered by Server Components, with thin Client Component wrappers for the code sandbox, search, and feedback widgets."

---

## 8. Scale Evolution

**Small app, 1-2 devs →** Next.js App Router with all components as Server Components by default; add `'use client'` only when you genuinely need interactivity; use Server Actions for all mutations; no API routes needed for most operations. Ship faster, less code.

**Medium product, 5-10 devs →** Establish team convention on boundary decisions; co-locate Server Actions with the components that call them; Suspense boundaries around slow data sources (third-party API calls, complex queries) to prevent one slow query from blocking the whole page; streaming SSR with Suspense sends the shell HTML immediately and streams in suspended sections.

**Large scale, data-heavy pages →** Streaming RSC: `<Suspense>` wraps each independently-loadable section; server streams HTML progressively as each section resolves; users see product title and images instantly while reviews and recommendations load independently; React's `startTransition` coordinates UI updates during streaming; component-level data caching with `next/cache` and `unstable_cache` tags for fine-grained invalidation per entity.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Developer portal documentation pages are prime RSC candidates (static content + code samples); payment widget pages with live account data use SSR; understanding Server Actions for form-based payment flows | Know the Server/Client boundary decision; Server Actions for form submissions (payment confirmation forms, KYC submission); streaming for progressive page loading |
| Swiggy / Meesho | Product catalog pages served to millions with minimal JavaScript; social sharing previews with server-rendered Open Graph tags; Server Actions for cart mutations; parallel data fetching in Server Components for product + reviews + recommendations | Parallel `Promise.all` in Server Components; streaming Suspense for sections; RSC + SSG/ISR hybrid |
| Adobe / Microsoft | Adobe is involved in the RSC spec development — deep knowledge expected at senior levels; Microsoft Teams web client may adopt RSC for enterprise app integrations; the React team at Meta/Vercel collaborates with Adobe | Understand the RSC architecture at the React core level, not just Next.js API; know why RSC was designed the way it was |
| SAP Labs | SAP developer portal migration to Next.js App Router; SAP BTP integration docs (heavily SSG suitable); micro-frontend composition with RSC is an active area (Module Federation + RSC has experimental support) | Bridge from classic SSR/SPA experience to RSC mental model; connect to SAP portal use case |

---

## 10. Related Topics — What to Study Next

- **Topic 202 — SPA vs SSR vs SSG** — RSC is the "native React" answer to SSR; it replaces `getServerSideProps` / `getStaticProps` with component-level async; understanding the SSR model first makes RSC easier to position correctly; RSC is SSR at the component granularity, not just the page level
- **Topic 209 — React Fiber and Reconciliation** — React's reconciliation algorithm in Fiber handles RSC differently; Server Components produce a serialised component tree (React's wire format, not HTML) that travels over the network; the client React runtime reconciles this with the existing DOM; understanding Fiber's two-phase (render + commit) explains how RSC streaming works
- **Topic 211 — React 18 Concurrent Mode + Suspense** — RSC streaming depends entirely on React 18's Suspense model; `<Suspense>` boundaries in the RSC tree allow the server to stream HTML progressively; without Concurrent Mode's ability to handle interrupted rendering, RSC streaming would not be possible
- **Topic 212 — React Server Components + Server Actions** (this topic IS 212) — this file covers both; Server Actions are the mutation half of the RSC story; see the code section for the `'use server'` directive, auth validation pattern, and `revalidatePath` for cache invalidation after mutations

---

*Part 12 · React Server Components — Server vs Client Boundary · Full Stack Interview Guide · Hruday D · 2026*
