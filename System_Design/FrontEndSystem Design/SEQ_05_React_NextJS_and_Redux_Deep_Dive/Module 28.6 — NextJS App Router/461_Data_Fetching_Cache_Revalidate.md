# 461 – Data Fetching — fetch, cache, revalidate

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Next.js App Router extends `fetch()` with **caching** and **revalidation**. Three strategies: **Static** (cached forever, like getStaticProps), **ISR** (revalidate after N seconds), **Dynamic** (no cache, like getServerSideProps). Fetch in Server Components directly — no special functions needed.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── STATIC (default — cached at build) ────
async function StaticPage() {
  // Cached at build time, served from CDN
  const data = await fetch('https://api.example.com/data');
  // Equivalent to getStaticProps
  return <div>{JSON.stringify(data)}</div>;
}

// ──── ISR (Incremental Static Regeneration) ────
async function ISRPage() {
  // Cached, but revalidates after 60 seconds
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 }, // seconds
  });
  return <div>{JSON.stringify(data)}</div>;
}

// ──── DYNAMIC (no cache) ────
async function DynamicPage() {
  // Never cached — fresh data on every request
  const data = await fetch('https://api.example.com/data', {
    cache: 'no-store',
  });
  // Equivalent to getServerSideProps
  return <div>{JSON.stringify(data)}</div>;
}

// ──── ROUTE SEGMENT CONFIG ────
// Apply to entire page/layout
export const dynamic = 'force-dynamic'; // always dynamic
// OR
export const dynamic = 'force-static';  // always static
export const revalidate = 60;           // ISR for entire segment

// ──── ON-DEMAND REVALIDATION ────
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  // Revalidate specific path
  revalidatePath('/posts');
  
  // Revalidate by tag
  revalidateTag('posts');
  
  return NextResponse.json({ revalidated: true });
}

// Tag-based cache invalidation
async function PostList() {
  const posts = await fetch('https://api.example.com/posts', {
    next: { tags: ['posts'] }, // tag this fetch
  });
  return posts.map(p => <PostCard key={p.id} post={p} />);
}

// When you mutate: revalidateTag('posts') — all tagged fetches refetch

// ──── SERVER ACTIONS + REVALIDATION ────
async function createPost(formData: FormData) {
  'use server';
  await db.post.create({ data: { title: formData.get('title') } });
  revalidatePath('/posts');    // revalidate the posts page
  revalidateTag('posts');      // OR tag-based
}

// ──── PARALLEL DATA FETCHING ────
async function Dashboard() {
  // Sequential — slow! ❌
  // const user = await fetchUser();
  // const posts = await fetchPosts();
  
  // Parallel — fast! ✅
  const [user, posts, analytics] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchAnalytics(),
  ]);
  
  return (
    <div>
      <UserCard user={user} />
      <PostList posts={posts} />
      <Stats data={analytics} />
    </div>
  );
}

// ──── REQUEST MEMOIZATION ────
// Same fetch URL in multiple components during one request → deduplicated!
async function Layout() {
  const user = await fetchUser(); // fetch #1
  return <div><Page /></div>;
}

async function Page() {
  const user = await fetchUser(); // same URL → deduplicated, uses #1's result
  return <div>{user.name}</div>;
}

// ──── CACHING LAYERS ────
// 1. Request Memoization: deduplicate same fetch in one render
// 2. Data Cache: persist fetch results across requests (revalidate)
// 3. Full Route Cache: cache entire rendered HTML (static routes)
// 4. Router Cache: client-side cache of visited routes
```

### Caching Strategy Cheat Sheet
| Strategy | fetch option | Equivalent |
|---|---|---|
| Static | default (no option) | getStaticProps |
| ISR | `{ next: { revalidate: 60 } }` | getStaticProps + revalidate |
| Dynamic | `{ cache: 'no-store' }` | getServerSideProps |
| On-demand | `revalidatePath/Tag()` | on-demand ISR |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Next.js extends fetch: default cached (static), next.revalidate for ISR, cache:'no-store' for dynamic. Tag-based invalidation: next.tags + revalidateTag(). Parallel fetch with Promise.all. Request memoization deduplicates same fetch across components. Four cache layers: request memo → data cache → route cache → router cache."*

## 4. 🧠 MEMORY AID
**"Static = default. ISR = { next: { revalidate: 60 } }. Dynamic = { cache: 'no-store' }. On-demand = revalidatePath/Tag. Promise.all for parallel."**
