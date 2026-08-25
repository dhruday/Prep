# 460 – Layouts, Templates, Loading, Error

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
App Router special files: **layout.tsx** (persistent wrapper, doesn't re-render on navigation), **template.tsx** (re-renders on navigation), **loading.tsx** (Suspense fallback), **error.tsx** (Error Boundary), **not-found.tsx** (404). These compose automatically into a rendering hierarchy.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── LAYOUT (persistent, shared UI) ────
// app/layout.tsx — root layout (required)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header><Navbar /></header>
        <main>{children}</main>
        <footer>© 2024</footer>
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx — nested layout
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-grid">
      <Sidebar /> {/* persists across /dashboard/* navigation */}
      <section>{children}</section>
    </div>
  );
}
// Navigation from /dashboard/analytics → /dashboard/settings:
// Sidebar does NOT re-render. Only {children} swaps.

// ──── TEMPLATE (re-mounts on navigation) ────
// app/dashboard/template.tsx
// Like layout but creates new instance on each navigation
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  // useEffect runs on every navigation (unlike layout)
  useEffect(() => {
    logPageView(); // runs each time user navigates
  }, []);
  
  return <div className="template-wrapper">{children}</div>;
}

// ──── LOADING (Suspense fallback) ────
// app/dashboard/loading.tsx
// Automatically wraps page.tsx in <Suspense>
export default function DashboardLoading() {
  return (
    <div className="loading-skeleton">
      <div className="skeleton-header" />
      <div className="skeleton-grid">
        {[1,2,3,4].map(i => <div key={i} className="skeleton-card" />)}
      </div>
    </div>
  );
}

// Equivalent to:
// <Suspense fallback={<DashboardLoading />}>
//   <DashboardPage />
// </Suspense>

// ──── ERROR (Error Boundary) ────
// app/dashboard/error.tsx — must be 'use client'
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error); // log to error service
  }, [error]);
  
  return (
    <div role="alert">
      <h2>Dashboard Error</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  );
}

// ──── GLOBAL ERROR (catches root layout errors) ────
// app/global-error.tsx — must include <html> and <body>
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h1>Something went wrong!</h1>
        <button onClick={reset}>Retry</button>
      </body>
    </html>
  );
}

// ──── NOT FOUND ────
// app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <Link href="/">Go Home</Link>
    </div>
  );
}

// Trigger programmatically:
import { notFound } from 'next/navigation';

async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  if (!post) notFound(); // shows not-found.tsx
  return <h1>{post.title}</h1>;
}
```

### Rendering Hierarchy
```
<RootLayout>
  <Template>        <!-- optional, re-mounts -->
    <ErrorBoundary fallback={<error.tsx />}>
      <Suspense fallback={<loading.tsx />}>
        <Page />
      </Suspense>
    </ErrorBoundary>
  </Template>
</RootLayout>
```

### When to Use What
| File | Purpose | Re-renders on nav? |
|---|---|---|
| layout.tsx | Shared UI (nav, sidebar) | No (persists) |
| template.tsx | Per-page wrapper | Yes (re-mounts) |
| loading.tsx | Skeleton/spinner | Shown while loading |
| error.tsx | Error fallback | Shown on error |
| not-found.tsx | 404 page | Shown via notFound() |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"layout.tsx persists across navigation (shared navbar/sidebar). template.tsx re-mounts each navigation (analytics). loading.tsx auto-wraps page in Suspense. error.tsx creates Error Boundary (must be 'use client'). global-error.tsx catches root layout errors. Hierarchy: Layout > Template > ErrorBoundary > Suspense > Page."*

## 4. 🧠 MEMORY AID
**"layout = persists. template = re-mounts. loading = Suspense. error = ErrorBoundary. Hierarchy: L > T > E > S > P."**
