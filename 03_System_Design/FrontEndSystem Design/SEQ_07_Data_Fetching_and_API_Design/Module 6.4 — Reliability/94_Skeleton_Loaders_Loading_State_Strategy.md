# 94. Skeleton Loaders & Loading State Strategy

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Skeleton loaders** are placeholder UI elements that mimic the shape and layout of the content being loaded. Unlike spinners, they communicate *what* is loading and *where* it will appear — reducing perceived load time and preventing layout shift. Loading state strategy is broader: it encompasses the full decision tree of when to show spinners vs skeletons vs optimistic content vs nothing. The core principle is that **perceived performance matters as much as actual performance** — Facebook's research showed content-shaped loaders improve user perception of load time by 20% even when raw load time is identical. At senior level, loading states are an architectural decision: they must handle concurrent requests, sequenced loads, stale-while-revalidate, and error recovery without making components complex.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Loading State Taxonomy

```typescript
// Not all loading states are equal
type LoadingState =
  | 'idle'           // Not yet started
  | 'initial-load'   // First load — show skeleton
  | 'refreshing'     // Has data, fetching update — show stale data + indicator
  | 'paginating'     // Loading next page — show existing + bottom loader
  | 'background'     // Silent refresh — no visible indicator
  | 'submitting'     // User action pending — disable UI + spinner on action
  | 'error'
  | 'success';

// The wrong approach: treating all loading the same
// ❌ if (isLoading) return <Spinner /> — loses existing content on refresh
// ✅ Show content with overlay/indicator on refresh, skeleton only on first load
```

### Skeleton Implementation with Shimmer

```typescript
// CSS-in-TS skeleton component with shimmer animation
const skeletonStyles = `
  @keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
  
  .skeleton {
    background: linear-gradient(
      90deg,
      #f0f0f0 25%,
      #e8e8e8 37%,
      #f0f0f0 63%
    );
    background-size: 400px 100%;
    animation: shimmer 1.4s ease infinite;
    border-radius: 4px;
  }
  
  /* Respect prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
      background: #e8e8e8; /* Static placeholder */
    }
  }
`;

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

function Skeleton({
  width = '100%',
  height = '1em',
  borderRadius = '4px',
  className,
}: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className ?? ''}`}
      style={{ display: 'block', width, height, borderRadius }}
      aria-hidden="true"  // Hidden from screen readers — content is absent
    />
  );
}
```

### Content-Shape Skeleton (mirrors actual layout)

```typescript
// UserProfileCard skeleton mirrors real layout precisely
function UserProfileCardSkeleton() {
  return (
    <article aria-label="Loading user profile" aria-busy="true">
      {/* Avatar */}
      <Skeleton width={48} height={48} borderRadius="50%" />
      
      <div style={{ marginLeft: 12, flex: 1 }}>
        {/* Name line */}
        <Skeleton width="60%" height={16} />
        
        {/* Title line — shorter, as real title lines are */}
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </div>
      
      {/* Stats row — exact layout match */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i}>
            <Skeleton width={32} height={20} />
            <Skeleton width={48} height={10} style={{ marginTop: 4 }} />
          </div>
        ))}
      </div>
    </article>
  );
}
```

### Avoiding Cumulative Layout Shift (CLS)

The #1 mistake with skeleton loaders: the skeleton has different dimensions than the real content, causing a layout shift when content loads:

```typescript
// ❌ Bad: different height than real card
function BadSkeleton() {
  return <div className="skeleton" style={{ height: 50 }} />;
}
// RealCard renders at height: 120px → CLS !!

// ✅ Good: reserve exact space
function UserCard({ user }: { user: User | null }) {
  return (
    // Fixed minimum height — matches skeleton height
    <article style={{ minHeight: 120 }}>
      {user ? <UserCardContent user={user} /> : <UserProfileCardSkeleton />}
    </article>
  );
}
```

### Strategic Loading Decisions

```typescript
// Loading decision matrix as a hook
function useLoadingUX<T>(query: {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isPreviousData?: boolean;
}) {
  return {
    // Show skeleton only when we have NO data at all
    showSkeleton: query.isLoading && !query.data,
    
    // Show content + subtle refresh indicator when we have stale data
    showStaleIndicator: query.isFetching && !!query.data,
    
    // Show content normally
    showContent: !!query.data,
    
    // Error only when we have no data to fall back to
    showError: query.isError && !query.data,
    
    // Stale data is still renderable
    data: query.data,
  };
}

// Component uses this cleanly
function ProductList() {
  const { data, isLoading, isFetching, isError } = useProducts();
  const ui = useLoadingUX({ data, isLoading, isFetching, isError });
  
  if (ui.showSkeleton) return <ProductListSkeleton count={8} />;
  if (ui.showError) return <ErrorState />;
  
  return (
    <>
      {ui.showStaleIndicator && <RefreshingBanner />}
      <ProductGrid products={ui.data!} />
    </>
  );
}
```

### Skeleton for Lists with Unknown Count

```typescript
// The "pending count" problem — how many skeletons to show?
interface SkeletonListProps {
  count?: number;        // Known count (from cache headers, previous fetch)
  minCount?: number;     // Show at least N
  maxCount?: number;     // Never show more than N
}

function ProductListSkeleton({ count = 6, minCount = 2, maxCount = 12 }: SkeletonListProps) {
  const itemCount = Math.min(maxCount, Math.max(minCount, count));
  
  return (
    <ul aria-label="Loading products" aria-busy="true">
      {Array.from({ length: itemCount }).map((_, i) => (
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
```

### Delayed Skeleton Appearance (avoid flashing)

For fast connections <200ms, showing a skeleton and immediately replacing it looks worse than showing nothing:

```typescript
function useDelayedPending(isPending: boolean, delay = 200) {
  const [showPending, setShowPending] = useState(false);
  
  useEffect(() => {
    if (!isPending) {
      setShowPending(false);
      return;
    }
    
    const id = setTimeout(() => setShowPending(true), delay);
    return () => clearTimeout(id);
  }, [isPending, delay]);
  
  return showPending;
}

// Skeleton only appears if load takes > 200ms
function Widget() {
  const { data, isLoading } = useQuery(...);
  const showSkeleton = useDelayedPending(isLoading);
  
  if (showSkeleton) return <WidgetSkeleton />;
  if (!data) return null;  // Fast loads: nothing shown at all
  return <WidgetContent data={data} />;
}
```

### Accessibility

```html
<!-- Loading state must be announced to screen readers -->
<div role="status" aria-live="polite" aria-label="Loading product list">
  <!-- Skeleton items have aria-hidden="true" -->
  <!-- Screen reader gets the aria-label from the container -->
</div>

<!-- When content loads -->
<div role="status" aria-live="polite" aria-label="12 products loaded">
  <!-- actual content here -->
</div>
```

### Angular Implementation

```typescript
// Angular skeleton with async pipe
@Component({
  template: `
    <ng-container *ngIf="products$ | async as products; else loadingTpl">
      <app-product-card *ngFor="let p of products" [product]="p" />
    </ng-container>
    
    <ng-template #loadingTpl>
      <app-product-skeleton *ngFor="let i of skeletonItems" />
    </ng-template>
  `
})
export class ProductListComponent {
  products$ = this.productService.getProducts().pipe(
    delay(0)  // Ensure skeleton renders first frame
  );
  
  skeletonItems = Array(6).fill(null); // 6 skeleton cards
}
```

### Performance Implications

- **CLS impact**: Wrong-sized skeletons are the #2 cause of CLS behind images without dimensions
- **Bundle size**: Skeleton components are tiny — no impact
- **Animation cost**: CSS `background-position` animation runs on compositor thread — zero main thread cost (unlike JS animations)
- **Lighthouse CLS score**: Good skeleton strategy can take CLS from 0.3 to 0.02 — CLS threshold for "Good": <0.1

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**LinkedIn Feed:**
- Classic skeleton-first design — grey placeholder cards with shimmer
- Count of skeletons matches viewport height / estimated card height
- On scroll: new skeletons append at bottom, never interrupting existing content

**Facebook:**
- Pioneered content-shape skeletons for feed posts
- Internal research cited: perceived load time ↓20% vs spinner

**Microsoft Teams:**
- Chat history skeleton shows message bubbles at appropriate widths (right/left for sent/received)
- Reduces jarring reflow when messages render

**Adobe Creative Cloud:**
- Asset thumbnails: grey squares matching exact 256×256 thumbnail size
- Zero layout shift when actual thumbnails load

**Scaling:**
- 1,000 users: spinners work fine
- 100,000 users: poor loading UX measurably increases bounce rate
- 10M users: CLS-heavy loading = Google Core Web Vitals downgrade = SEO impact = measurable traffic loss

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "My loading state strategy starts with a decision matrix: is this an initial load, a refresh, a pagination, or a background sync? Each gets a different treatment. For initial loads, I use content-shaped skeletons that precisely mirror the target layout — same dimensions, same grid — to avoid CLS. I never show a skeleton for refreshes when we have existing data; instead I show stale content with a subtle 'refreshing' indicator, which is far less disruptive. I delay skeleton appearance by 200ms to avoid the 'flash of skeleton' on fast connections. I always add `aria-live` and `aria-busy` for accessibility, and I use `prefers-reduced-motion` to stop the shimmer animation for users with vestibular disorders. At SAP, systematic skeleton usage across our Fiori app was part of how we moved our Lighthouse performance score from 60 to 95 — CLS went from 0.28 to 0.04."

**Likely Follow-up Questions:**
1. *How do you handle a skeleton when you don't know how many items will load?* → Use previous fetch count from cache, or a sensible default (e.g., viewport-height ÷ item-height)
2. *What causes CLS in skeleton implementations?* → Skeleton height ≠ content height; fixed-height container wrapping prevents this
3. *Is there a case where a spinner is better?* → Yes: modal dialogs, button-level actions (form submit), and global page loads < 500ms
4. *How does this interact with React Suspense?* → Suspense is React's first-class skeleton mechanism — wrap data-dependent trees, show fallback skeleton
5. *How do you test loading states?* → Storybook stories for each loading state; Chromatic visual regression to catch CLS regressions

**Comparison With Alternatives:**

| Approach | Perceived speed | CLS risk | Accessibility | Best For |
|---|---|---|---|---|
| Full-page spinner | Slow | None | Good | Initial auth pages |
| Skeleton loader | Fast | Low (if sized correctly) | Good with aria | Content-heavy pages |
| Optimistic update | Fastest | Possible on rollback | Complex | Mutations |
| Eager rendering | Instant | None | Good | SSR pages |
| Nothing (blank) | Neutral | None | Poor | Fast CDN-served content |

---

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (React Suspense + Skeleton)
────────────────────────────────────────────────────────────

```typescript
// React 18 Suspense-native approach
import { Suspense } from 'react';

// ProductData is a Suspense-compatible data source (React Query, Relay)
function ProductPage({ productId }: { productId: string }) {
  return (
    // Boundary 1: full page skeleton for critical data
    <Suspense fallback={<ProductPageSkeleton />}>
      <ProductDetails productId={productId} />
      
      {/* Boundary 2: recommendations load independently */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={productId} />
      </Suspense>
      
      {/* Boundary 3: reviews can be completely deferred */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={productId} />
      </Suspense>
    </Suspense>
  );
}
```

**Why this pattern matters:** Nested Suspense boundaries mean product details don't wait for recommendations. Each section loads and reveals as its data arrives — progressive enhancement without any loading state management code in the component.

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**Three rules for skeleton loaders:**
1. **Shape match**: skeleton must have the exact same dimensions as the content (CLS prevention)
2. **Initial only**: show skeleton on first load, not on refresh (preserve existing content)
3. **Delay 200ms**: hide skeleton entirely if content arrives in <200ms (no flash)

**Accessibility**: `aria-busy="true"` on container, `aria-hidden="true"` on skeleton elements, `aria-live="polite"` for announcements.

**If you go blank:** "Skeleton = shape-matched placeholder for first load only. Same size as content = zero CLS. Delay 200ms to prevent flash. On refresh, keep existing content + show subtle 'refreshing' indicator."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **Perceived performance**: content-shaped placeholders reduce perceived wait time by ~20%
→ **Core Web Vitals**: proper skeleton sizing is critical for CLS score (Google ranking factor)
→ **Accessibility**: loading states must be communicated to screen reader users

**How it works:**
→ CSS `background-position` animation creates shimmer on `linear-gradient` background. Skeleton components are styled to match content dimensions exactly. `useDelayedPending` suppresses short flashes. React Suspense provides the declarative mounting point.

**Company relevance:**
→ **Microsoft**: Teams, Office 365 all use content-shaped skeletons — it's a design system standard (Fluent UI has a `Skeleton` component)
→ **Adobe**: Spectrum Design System includes skeleton components with accessibility built in
→ **Salesforce**: Lightning Design System has Skeleton components with exact slot sizing
→ **Cisco**: Network dashboards with many widgets — independent skeleton per widget, load progressively
