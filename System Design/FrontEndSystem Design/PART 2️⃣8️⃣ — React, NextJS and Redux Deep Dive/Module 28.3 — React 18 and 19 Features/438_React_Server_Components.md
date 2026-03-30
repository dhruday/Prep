# 438 – React Server Components (RSC) — Architecture

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**RSC** renders components on the server, sending serialized UI (not HTML) to the client. **Zero client-side JS** for server components. They can access databases, file systems, and APIs directly. Client Components (marked `'use client'`) add interactivity. Default in Next.js 13+ App Router.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── SERVER COMPONENT (default) ────
// No 'use client' → Server Component
// Can be async, access DB/files, zero client JS
async function ProductList() {
  const products = await prisma.product.findMany(); // direct DB!
  
  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>
          <ProductCard product={p} />
          <AddToCartButton productId={p.id} /> {/* client component */}
        </li>
      ))}
    </ul>
  );
}

// ──── CLIENT COMPONENT ────
'use client'; // opt-in to client rendering
import { useState } from 'react';

function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => setAdded(true)}>
      {added ? '✓ Added' : 'Add to Cart'}
    </button>
  );
}

// ──── COMPOSITION RULES ────
// Server can import Client ✅
// Client CANNOT import Server ❌
// Client CAN receive Server as children/props ✅

// ✅ Server passes Server Component as children to Client
function ServerPage() {
  return (
    <ClientLayout>
      <ServerSidebar />  {/* Server Component as children */}
    </ClientLayout>
  );
}

'use client';
function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return <div>{isOpen && children}</div>; // receives server-rendered content
}

// ──── WHAT CAN'T SERVER COMPONENTS DO? ────
// ❌ useState, useEffect, useRef (no client state)
// ❌ onClick, onChange (no event handlers)
// ❌ Browser APIs (window, document, localStorage)
// ❌ Context providers (no useContext)
// ✅ async/await, database, file system, env variables

// ──── SERIALIZATION ────
// RSC sends a special JSON-like format (RSC payload), not HTML
// Client React reconciles this payload into the existing VDOM
// Enables navigation without full page reload
// Preserves client state during server re-renders
```

### Data Flow
```
Server Component → renders on server → RSC payload
  → streamed to client → merged with client VDOM
Client Component → hydrated on client → interactive
```

### Benefits
| Benefit | Why |
|---|---|
| Zero JS for server components | Smaller bundles |
| Direct DB/API access | No API routes needed |
| Streaming | Progressive rendering |
| Preserved client state | Navigation doesn't reset state |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"RSC renders on the server with zero client JS — direct DB access, smaller bundles. Client Components ('use client') add interactivity. Server can import Client, but not vice versa — Client receives Server as children. RSC sends serialized payload, not HTML, enabling SPA-like navigation with server rendering."*

## 4. 🧠 MEMORY AID
**"Server = default, zero JS, async, DB access. Client = 'use client', state, events. Server imports Client ✅. Client imports Server ❌ (but receives as children ✅)."**
