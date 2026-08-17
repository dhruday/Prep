# 457 – App Router vs Pages Router

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Pages Router** (Next.js 12-): file-based routing in `/pages`, `getServerSideProps`/`getStaticProps` for data fetching, all components are client. **App Router** (Next.js 13+): file-based routing in `/app`, React Server Components by default, `layout.tsx`/`loading.tsx`/`error.tsx` conventions, nested layouts, streaming. App Router is the recommended approach.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── PAGES ROUTER (/pages) ────
// pages/posts/[id].tsx
export default function PostPage({ post }: { post: Post }) {
  return <h1>{post.title}</h1>;
}

// Data fetching at page level only
export async function getServerSideProps({ params }: GetServerSidePropsContext) {
  const post = await fetchPost(params.id);
  return { props: { post } };
}

// OR static generation
export async function getStaticProps({ params }: GetStaticPropsContext) {
  const post = await fetchPost(params.id);
  return { props: { post }, revalidate: 60 };
}

export async function getStaticPaths() {
  const ids = await getPostIds();
  return { paths: ids.map(id => ({ params: { id } })), fallback: 'blocking' };
}

// ──── APP ROUTER (/app) — recommended ────
// app/posts/[id]/page.tsx
// Server Component by default — no 'use client' needed
export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await fetchPost(params.id); // direct async/await!
  return <h1>{post.title}</h1>;
}

// ──── FILE CONVENTIONS (App Router) ────
// app/
//   layout.tsx     → root layout (wraps all pages)
//   page.tsx       → root page (/)
//   loading.tsx    → Suspense fallback
//   error.tsx      → Error boundary
//   not-found.tsx  → 404 page
//   posts/
//     layout.tsx   → nested layout for /posts/*
//     page.tsx     → /posts
//     [id]/
//       page.tsx   → /posts/:id
//       loading.tsx → loading state for /posts/:id

// ──── LAYOUTS (persistent, don't re-render on navigation) ────
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children} {/* page content swaps here */}
        <Footer />
      </body>
    </html>
  );
}

// app/dashboard/layout.tsx (nested)
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard">
      <DashboardSidebar />
      <main>{children}</main>
    </div>
  );
}

// ──── DATA FETCHING COMPARISON ────
// Pages Router: getServerSideProps / getStaticProps (page-level only)
// App Router: fetch() in any Server Component + built-in caching

// App Router caching
async function PostList() {
  // Cached by default (static)
  const posts = await fetch('https://api.example.com/posts');
  
  // Revalidate every 60 seconds
  const posts2 = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 },
  });
  
  // No cache (dynamic, like getServerSideProps)
  const posts3 = await fetch('https://api.example.com/posts', {
    cache: 'no-store',
  });
}
```

### Comparison Table
| Feature | Pages Router | App Router |
|---|---|---|
| Directory | `/pages` | `/app` |
| Default rendering | Client components | Server Components |
| Data fetching | getServerSideProps/getStaticProps | async components + fetch |
| Layouts | \_app.tsx (single) | Nested layout.tsx |
| Loading states | Manual | loading.tsx |
| Error handling | Manual | error.tsx |
| Streaming | Limited | Built-in |
| Metadata | next/head | metadata export |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"App Router: Server Components default, nested layouts (persistent across navigation), file conventions (loading.tsx, error.tsx), async fetch in any component. Pages Router: client components, getServerSideProps/getStaticProps at page level only, single \_app layout. App Router is recommended — better performance, streaming, granular caching."*

## 4. 🧠 MEMORY AID
**"Pages Router = /pages, getSSP/getStaticProps, client default. App Router = /app, Server Components, nested layouts, loading.tsx/error.tsx, async fetch anywhere."**
