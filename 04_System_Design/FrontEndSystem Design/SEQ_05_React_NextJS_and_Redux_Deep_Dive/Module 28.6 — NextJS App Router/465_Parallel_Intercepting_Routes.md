# 465 – Parallel and Intercepting Routes

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Parallel Routes** (`@folder`): render multiple pages in the same layout simultaneously (dashboard panels, split views). **Intercepting Routes** (`(.)folder`): intercept navigation to show a route in a different context (modal on feed, detail preview). Combined: Instagram-like photo modals.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── PARALLEL ROUTES (@slot) ────
// Render multiple independent page segments simultaneously

// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,    // @analytics slot
  team,         // @team slot
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div className="dashboard-grid">
      <div className="main">{children}</div>         {/* app/dashboard/page.tsx */}
      <div className="analytics">{analytics}</div>   {/* app/dashboard/@analytics/page.tsx */}
      <div className="team">{team}</div>              {/* app/dashboard/@team/page.tsx */}
    </div>
  );
}

// File structure:
// app/dashboard/
//   layout.tsx          ← receives slots as props
//   page.tsx            ← default children
//   @analytics/
//     page.tsx          ← analytics panel
//     loading.tsx       ← independent loading
//   @team/
//     page.tsx          ← team panel
//     loading.tsx       ← independent loading

// Each slot:
// - Loads independently (parallel data fetching)
// - Has its own loading.tsx and error.tsx
// - Can have sub-routes

// ──── DEFAULT.TSX (fallback for unmatched slots) ────
// app/dashboard/@analytics/default.tsx
export default function AnalyticsDefault() {
  return null; // render nothing when route doesn't match this slot
}

// ──── CONDITIONAL ROUTES (auth modal) ────
// app/layout.tsx
export default function Layout({
  children,
  auth,
}: {
  children: React.ReactNode;
  auth: React.ReactNode;
}) {
  return (
    <>
      {children}
      {auth} {/* conditionally shows auth modal */}
    </>
  );
}

// app/@auth/login/page.tsx → shows login modal
// app/@auth/default.tsx → returns null (no modal)

// ──── INTERCEPTING ROUTES ────
// Show a route in different context (e.g., modal preview)
// Convention: (.) same level, (..) one level up, (...) root

// File structure for Instagram-like photo modal:
// app/
//   feed/
//     page.tsx                    ← photo grid
//     @modal/
//       (.)photo/[id]/page.tsx    ← intercept: show in modal
//       default.tsx               ← no modal by default
//   photo/[id]/
//     page.tsx                    ← full photo page (direct access)

// Feed page — clicking photo opens modal
// app/feed/page.tsx
function FeedPage() {
  const photos = await getPhotos();
  return (
    <div className="grid">
      {photos.map(photo => (
        <Link key={photo.id} href={`/photo/${photo.id}`}>
          <Image src={photo.thumbnail} alt={photo.title} />
        </Link>
      ))}
    </div>
  );
}

// Modal interceptor — same-level intercept
// app/feed/@modal/(.)photo/[id]/page.tsx
function PhotoModal({ params }: { params: { id: string } }) {
  const photo = await getPhoto(params.id);
  return (
    <Modal>
      <Image src={photo.fullSize} alt={photo.title} />
      <p>{photo.description}</p>
    </Modal>
  );
}

// Full page — direct URL access or hard refresh
// app/photo/[id]/page.tsx
function PhotoPage({ params }: { params: { id: string } }) {
  const photo = await getPhoto(params.id);
  return (
    <div className="photo-full">
      <Image src={photo.fullSize} alt={photo.title} />
      <Comments photoId={params.id} />
    </div>
  );
}

// BEHAVIOR:
// Click photo in feed → modal overlay (intercepted) ✅
// Direct URL /photo/123 → full page ✅
// Refresh on modal → full page ✅
// Share URL → full page (correct!) ✅
```

### Intercept Convention
| Pattern | Matches |
|---|---|
| `(.)` | Same level |
| `(..)` | One level up |
| `(..)(..)` | Two levels up |
| `(...)` | Root |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Parallel routes (@slot): multiple independent pages in one layout — each with own loading/error. Intercepting routes ((.)): show a route in a different context (modal) — clicking from feed shows modal, direct URL shows full page. Combined: Instagram photo modals. default.tsx for unmatched slots."*

## 4. 🧠 MEMORY AID
**"@slot = parallel (layout receives as props). (.) = intercept (modal on navigation, full page on direct URL). default.tsx = fallback."**
