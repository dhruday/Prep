# 458 – Server Components vs Client Components in Next.js

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
In Next.js App Router: **Server Components** (default) run on the server — zero JS sent to client, direct DB/API access. **Client Components** (`'use client'`) run on client — state, events, browser APIs. Key: push `'use client'` boundary as low as possible for minimal client JS.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── SERVER COMPONENT (default) ────
// app/products/page.tsx — no 'use client' directive
import { db } from '@/lib/db';

export default async function ProductsPage() {
  const products = await db.product.findMany(); // direct DB query — zero client JS!
  
  return (
    <div>
      <h1>Products ({products.length})</h1>
      {products.map(p => (
        <div key={p.id}>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          <AddToCartButton productId={p.id} /> {/* client boundary */}
        </div>
      ))}
    </div>
  );
}

// ──── CLIENT COMPONENT ────
// components/AddToCartButton.tsx
'use client';
import { useState } from 'react';

export function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  
  return (
    <button onClick={() => setAdded(true)}>
      {added ? '✓ Added' : 'Add to Cart'}
    </button>
  );
}

// ──── COMPOSITION PATTERNS ────

// Pattern 1: Server wraps Client (push 'use client' down)
// ✅ GOOD — minimal client JS
async function SearchPage() {
  const categories = await db.category.findMany(); // server
  return (
    <div>
      <h1>Search</h1> {/* server — no JS */}
      <SearchBar categories={categories} /> {/* client boundary */}
      <ServerRenderedResults /> {/* server — no JS */}
    </div>
  );
}

// Pattern 2: Server as children of Client
// ✅ GOOD — Server Component passed as children
'use client';
function InteractiveLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && children} {/* server-rendered content */}
    </div>
  );
}

// Server file
async function Page() {
  return (
    <InteractiveLayout>
      <ServerContent /> {/* still renders on server! */}
    </InteractiveLayout>
  );
}

// ──── COMMON MISTAKES ────
// ❌ BAD: 'use client' at the top level — everything becomes client
'use client';
export default function Page() { /* entire page is client-rendered */ }

// ❌ BAD: importing Server Component inside Client Component
'use client';
import ServerComponent from './ServerComponent'; // breaks! becomes client

// ✅ GOOD: pass as children or props
'use client';
function ClientWrapper({ serverContent }: { serverContent: React.ReactNode }) {
  return <div>{serverContent}</div>;
}

// ──── WHAT GOES WHERE ────
// Server Components:
//   ✅ Data fetching, DB queries
//   ✅ Access backend resources
//   ✅ Keep sensitive info (API keys, tokens)
//   ✅ Large dependencies (keep off client)

// Client Components:
//   ✅ onClick, onChange (event handlers)
//   ✅ useState, useEffect (state, effects)
//   ✅ Browser APIs (window, localStorage)
//   ✅ Custom hooks with state/effects
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Server Components (default): zero client JS, async, direct DB access. Client Components ('use client'): state, events, browser APIs. Push 'use client' boundary as low as possible. Server can import Client ✅. Client can receive Server as children ✅ but can't import Server ❌."*

## 4. 🧠 MEMORY AID
**"Default = Server (zero JS, async, DB). 'use client' = Client (state, events). Push boundary DOWN. Pass Server as children to Client."**
