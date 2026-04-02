# 99. React Server Components (RSC) — Server vs Client Boundary
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

React Server Components (RSC) are components that render exclusively on the server and never ship their JavaScript to the browser. They can directly access databases, filesystems, and backend APIs without an HTTP round trip — no fetching required. The key architectural boundary is the `"use client"` directive: any component file marked with it, and all its imports, become client components that run in the browser. Everything else is a server component by default in the App Router. RSC reduces JavaScript bundle sizes dramatically (server components send only HTML/React tree, not component code), eliminates client–server data-fetching waterfalls, and enables co-locating data access with rendering. The constraint: server components cannot use browser APIs, React state (`useState`/`useReducer`), effects (`useEffect`), or Context. These are client-only APIs.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Server Components vs Client Components — The Boundary

```
SERVER SIDE                    │          BROWSER
─────────────────────────────  │  ─────────────────────────────
Server Components              │  Client Components
- Default in App Router        │  - Requires "use client" directive
- Can access DB directly       │  - Can use useState, useEffect, etc.
- Cannot use hooks             │  - Can use browser APIs (window, etc.)
- Cannot use browser APIs      │  - Sends JS bundle to browser
- Zero JS to the browser       │  - Hydrates and runs in browser
- Renders to RSC Payload       │  - Renders after hydration
```

```typescript
// app/users/page.tsx — Server Component (default, no directive)
import { db } from '@/lib/db';  // direct DB access — NOT possible in client components

export default async function UsersPage() {
  // Fetch directly from DB — no useEffect, no fetch(), no isLoading state
  const users = await db.user.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1>Users</h1>
      {users.map(user => (
        <UserCard key={user.id} user={user} />   // rendering markup only
      ))}
    </div>
  );
  // NEVER ships to the browser as JavaScript
  // Browser receives: HTML + React tree description (RSC Payload)
  // db import and query code never visible to client
}

// app/users/UserCard.tsx — can stay as Server Component
export function UserCard({ user }: { user: User }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      {/* No interactivity needed → Server Component */}
    </div>
  );
}
```

```typescript
// app/users/AddUserButton.tsx — CLIENT Component (needs state/interactivity)
'use client';  // ← marks this file and all its imports as client-side

import { useState } from 'react';

export function AddUserButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Add User</button>
      {isOpen && <AddUserModal onClose={() => setIsOpen(false)} />}
    </>
  );
  // This component ships to the browser as JS
  // Hydrates on the client and responds to events
}
```

### The Serialization Constraint

Server components render to a serializable **RSC Payload** (a JSON-like format). This means they can only pass serializable props to client components:

```typescript
// ✅ Serializable: strings, numbers, booleans, arrays, plain objects, Date
<ClientComponent name="Hruday" score={95} tags={['react', 'ts']} />

// ❌ Not serializable: functions, classes, Dates-with-methods, Symbol, Promises (in most contexts)
// Server components CANNOT pass callbacks (event handlers) to client components via props
const handleClick = () => console.log('clicked');
<ClientComponent onClick={handleClick} />   // ❌ ERROR: functions are not serializable

// ✅ Solution: the client component defines its own handlers
// 'use client'
// function ClientButton() {
//   return <button onClick={() => console.log('clicked')}>Click</button>;
// }
```

### Component Composition Pattern: Server Wrapping Client

```typescript
// Server Component can render Client Components
// Client Components CANNOT render Server Components directly after the boundary

// ✅ Correct: Server → Client
// app/page.tsx (Server Component)
import { InteractiveWidget } from './InteractiveWidget';  // client component
import { db } from '@/lib/db';

export default async function Page() {
  const config = await db.config.findFirst();          // server-side data access

  return (
    <InteractiveWidget                                 // client component below
      initialConfig={config}                           // pass serializable data
    />
  );
}

// ✅ Pattern: "children" slot — passing server-rendered JSX into client component
// The server component renders the children, client component receives rendered JSX
// app/layout.tsx (Server Component)
import { Sidebar } from './Sidebar';  // CLIENT component

export default async function Layout({ children }: { children: React.ReactNode }) {
  const nav = await db.navigation.findMany();

  return (
    <div>
      <Sidebar navItems={nav} />   {/* client component */}
      <main>{children}</main>      {/* children rendered by server — passed as JSX */}
    </div>
  );
}
```

### The RSC Payload Format

When a server component renders, it produces an **RSC Payload** — a special React format:
- HTML for the initial page (from SSR)
- A React tree description that includes: rendered output of server components, placeholders for client component boundaries, and the serialized props at each client boundary

On the browser:
1. Initial HTML loads (from SSR) — page is immediately visible
2. Browser receives RSC Payload (streaming, as server components render)
3. Client component JS bundles load
4. React hydrates client components in place using the RSC Payload to know where they are

```
Server Component Tree:                RSC Payload (simplified JSON):
─────────────────────                 ────────────────────────────
Page (server)                         {
  ├─ Header (server)                    "type": "div",
  │   └─ NavMenu (CLIENT)              "children": [
  ├─ Content (server)                    {type: "Header"},
  │   └─ LikeButton (CLIENT)             {"clientRef": "NavMenu", props: {...}},
  └─ Footer (server)                     {type: "Content"},
                                          {"clientRef": "LikeButton", props: {...}},
                                          {type: "Footer"}
                                        ]
                                      }
                                      // NavMenu and LikeButton code ships to browser
                                      // Header, Content, Footer do NOT ship
```

### What Cannot Cross the Server/Client Boundary

```typescript
// Running an RSC-compatible component audit:

// ❌ Server components CANNOT use:
import { useState } from 'react';       // ERROR: useState is client-only
import { useEffect } from 'react';      // ERROR: useEffect is client-only
import { useRouter } from 'next/navigation'; // hook — client-only
window.localStorage;                    // browser API — not available on server
document.querySelector('.btn');         // browser API — not available on server

// ❌ Cannot import server-only modules in client components:
import { db } from '@/lib/db';          // server-only module
// If db is ever imported in client code: potential security exposure (+bundle bloat)

// ✅ 'server-only' package prevents accidental client import of server secrets
// lib/db.ts:
import 'server-only';   // throws at build time if imported from a client component
export const db = new PrismaClient();

// ✅ 'client-only' package — for client code that shouldn't run on server
import 'client-only';   // throws at build time if somehow imported server-side
```

### Data Security — The Critical Concern

```typescript
// ❌ SECURITY RISK: never pass full DB records to client if they contain sensitive fields
export default async function AdminPage() {
  const users = await db.user.findMany();  // includes hashed password, PII fields

  // ❌ This exposes ALL user fields to the client (via RSC payload / HTML)
  return <UserList users={users} />;

  // ✅ Select only what the client needs
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true }
    // NOT password, apiKey, ssn, etc.
  });
}
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, migrating a product catalog to Next.js App Router: the catalog listing page (browse, filter, paginate) was converted to a Server Component chain — product data fetched directly from the database, markdown descriptions rendered server-side (no client-side markdown parser to bundle!), and only the "Add to Cart" button and product image gallery kept as client components. Bundle size for the catalog page reduced by ~65% (markdown parser, date formatter, and lodash were no longer shipped to the browser).

**At FAANG scale:**
- **Microsoft (Next.js on internal tools):** Documentation viewer: entire document tree renders as Server Components (fetching from CMS directly, no API layer); only the search bar and bookmark buttons are client components — document content never ships as JS
- **Adobe (Adobe.com):** Product pages: pricing, specs, and feature comparison rendered as Server Components; only interactive configurators and buy-flow are client components
- **Salesforce:** Org-specific admin dashboards rendered as Server Components pulling from Salesforce Data Cloud; interactive widgets (charts, export) are client components
- **Cisco:** DevNet documentation portal uses RSC for static content rendering; interactive code editors and API explorers are client components

---

## 💬 4. Interview Execution

### Sample Answer

> "React Server Components are React components that run and render exclusively on the server. They can access databases and APIs directly without an HTTP round-trip. Their output — HTML and a React tree description called the RSC Payload — streams to the browser. Critically, server component code never ships to the browser as JavaScript.
>
> The `'use client'` directive marks a file as a client component boundary. Everything in that file and its imports becomes client-side code. The boundary is explicit — by default, all components in Next.js App Router are server components.
>
> The key constraint is serialization: server components can only pass serializable values (strings, numbers, plain objects, arrays) as props to client components. Functions and class instances can't cross the boundary. This is why you can't pass event callbacks from server to client — the client component defines its own handlers.
>
> For security: never pass unsanitized database records to client components. Use `select` to choose only the fields the client actually needs — sensitive fields (passwords, API keys) should never appear in the RSC Payload or HTML.
>
> The performance wins: smaller bundles (server component code stays on server), fewer round trips (data fetching happens on the server, co-located with rendering), and faster Time to First Byte since HTML is streamed as soon as server components resolve."

---

## 💻 5. Code Example

```typescript
// A realistic App Router data flow

// ========================
// lib/data.ts — Server-only data access
// ========================
import 'server-only';
import { db } from './db';

export async function getProductsForCatalog(category: string) {
  return db.product.findMany({
    where: { category, published: true },
    select: {
      id: true,
      name: true,
      price: true,
      imageUrl: true,
      slug: true,
      // NOT: costPrice, supplierCode, internalNotes
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ========================
// app/catalog/[category]/page.tsx — Server Component
// ========================
import { getProductsForCatalog } from '@/lib/data';
import { ProductGrid } from './ProductGrid';          // server component
import { FilterBar } from './FilterBar';              // CLIENT component
import { Suspense } from 'react';

interface PageProps {
  params: { category: string };
  searchParams: { sort?: string };
}

export default async function CatalogPage({ params, searchParams }: PageProps) {
  const products = await getProductsForCatalog(params.category);
  // Direct DB access — no fetch(), no useEffect, no loading state

  return (
    <div className="catalog">
      <FilterBar
        category={params.category}
        currentSort={searchParams.sort}
        // Cannot pass DB results here if they need to trigger re-fetches
        // FilterBar is a client component — handles URL changes itself
      />
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid products={products} />
      </Suspense>
    </div>
  );
}

// ========================
// app/catalog/[category]/ProductGrid.tsx — Server Component
// ========================
import { ProductCard } from './ProductCard';     // server component
import { AddToCartButton } from './AddToCartButton';  // CLIENT component

interface Product { id: string; name: string; price: number; imageUrl: string; slug: string; }

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid">
      {products.map(product => (
        <li key={product.id}>
          <ProductCard product={product} />        {/* server component: renders HTML */}
          <AddToCartButton productId={product.id} price={product.price} />
          {/* CLIENT: onClick → useState → cart context — cannot be server component */}
        </li>
      ))}
    </ul>
  );
}

// ========================
// app/catalog/[category]/AddToCartButton.tsx — Client Component
// ========================
'use client';

import { useCartDispatch } from '@/context/cart';  // client-side context

interface Props { productId: string; price: number; }

export function AddToCartButton({ productId, price }: Props) {
  const dispatch = useCartDispatch();

  return (
    <button
      onClick={() => dispatch({
        type: 'ADD_ITEM',
        item: { id: productId, price, quantity: 1 }
      })}
    >
      Add to Cart
    </button>
  );
}

// ========================
// app/catalog/[category]/FilterBar.tsx — Client Component  
// ========================
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Props { category: string; currentSort?: string; }

export function FilterBar({ category, currentSort }: Props) {
  const router = useRouter();

  const changeSort = (sort: string) => {
    router.push(`/catalog/${category}?sort=${sort}`);
    // URL change triggers Server Component re-render with new searchParams
  };

  return (
    <div>
      <select value={currentSort} onChange={e => changeSort(e.target.value)}>
        <option value="name">Name</option>
        <option value="price">Price</option>
        <option value="newest">Newest</option>
      </select>
    </div>
  );
}

declare function ProductGridSkeleton(): JSX.Element;
```

---

## 🧠 6. Memory Aid

**The three constraints of Server Components:**
1. No hooks (useState, useEffect, etc.)
2. No browser APIs (window, document)
3. Props must be serializable (no functions)

**The one directive:** `'use client'` — marks the file as the start of a client boundary.

**Mental model:** Server Components are like server-side template rendering (Handlebars, Jinja) — they produce HTML from data. Client Components are traditional React — they ship code and run in the browser. App Router lets you mix both: server for data-heavy content, client for interactive parts.

**Mnemonic:** **SAND** — **S**erver Components have no browser **A**PIs, **N**o hooks, and send no **D**ownloaded JS.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Bundle size: server components never ship code to the browser — dependencies like database clients, markdown parsers, date formatting libraries can be used server-side with zero client bundle impact
→ Data fetching: co-locating data fetching with rendering eliminates an entire client/server round trip for each page's data requirements
→ Security: sensitive operations (DB queries, secret access) stay on the server; the boundary makes data exposure explicit

**How it works (3 sentences):**
Server components render during the HTTP request on the server Node.js process, producing a serializable **RSC Payload** — a format that contains the rendered HTML output for server components and placeholder entries ("client references") for client component boundaries with the serialized props that cross the boundary.
The browser receives the initial HTML for fast First Contentful Paint, then receives the RSC Payload (streamed progressively as server components complete), and uses it to hydrate client components — the React runtime on the browser reconstructs the component tree, attaching event listeners and state to the exact HTML positions described by the RSC Payload.
Client components are identified by the `'use client'` directive and are bundled into JavaScript that ships to the browser; everything without this directive is a server component by default and its code stays on the server.

**Company relevance:**
- Microsoft: App Router documentation and internal tooling; server component rendering reduces time-to-interactive for large document pages
- Adobe: adobe.com product pages migrated to RSC; product spec data renders server-side while checkout/configurator stays client-side
- Salesforce: Admin and reporting pages; data-heavy views render as server components, interactive data grids stay client components
- Cisco: DevNet developer portal; API reference documentation renders server-side with zero client JS for static content

---
✅ Topic 99/486 complete → Continuing to Topic 100: The `use()` Hook — Reading Promises and Context
