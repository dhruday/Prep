# 489 — Shimmer UI / Skeleton Screens

────────────────────────────────────────────────────────────────

## High-Level Overview

────────────────────────────────────────────────────────────────

### What Are Skeleton Screens?

Skeleton screens are placeholder UI elements that mimic the shape and layout of real content before data has loaded. Instead of showing a blank page or a spinner, users see a "wireframe" preview of the final interface — grey boxes, shimmering gradients, and content-shaped placeholders that transition smoothly into real content once available.

### Why They Matter

| Metric | Spinner | Skeleton Screen | Nothing (Blank) |
|--------|---------|-----------------|-----------------|
| Perceived load time | Baseline | **20–30% faster** | 30–40% slower |
| User abandonment | Moderate | Low | High |
| Layout stability (CLS) | Good (if sized) | Excellent | Poor |
| Accessibility | Needs aria-live | aria-busy + structure | No affordance |
| Cognitive load | "System working" | "Content coming" | "Is it broken?" |

Research from Microsoft and Google confirms skeleton screens reduce **perceived wait time by 20–30%** compared to spinners. Users interpret structured placeholders as partial content rather than absence of content — a psychological distinction that dramatically improves engagement.

### Core Principle: Perceived Performance

```
Real Performance:    Network → Parse → Render → Interactive
Perceived Perf:     Skeleton → Progressive Fill → Interactive
                    ↑
                    User feels "fast" here
```

The skeleton bridges the gap between navigation and data arrival. The human visual system interprets structured shapes as "almost loaded" rather than "empty."

────────────────────────────────────────────────────────────────

## Deep-Dive

────────────────────────────────────────────────────────────────

### 1. CSS Shimmer Animation

The signature shimmer effect uses a moving linear gradient animated via `@keyframes`:

```css
/* ── Core shimmer animation ────────────────────────── */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #e0e0e0 25%,
    #f0f0f0 50%,
    #e0e0e0 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}
```

**How it works:**
1. A `linear-gradient` creates three colour stops — dark, light, dark
2. `background-size: 200%` makes the gradient wider than the element
3. `background-position` animates from `-200%` to `200%`, sliding the highlight band across
4. `ease-in-out` prevents a robotic, linear feel

### 2. Skeleton Types

```
┌─────────────────────────────────────────────┐
│  TEXT SKELETON                               │
│  ████████████████████████████░░░░░           │
│  ██████████████████░░░░░░░░░░░░░░           │
│  ████████████░░░░░░░░░░░░░░░░░░░           │
├─────────────────────────────────────────────┤
│  IMAGE SKELETON                              │
│  ┌───────────────────┐                       │
│  │   ░░░░░░░░░░░░░   │ 16:9 aspect-ratio    │
│  │   ░░░░░░░░░░░░░   │ placeholder           │
│  └───────────────────┘                       │
├─────────────────────────────────────────────┤
│  CIRCLE SKELETON (Avatar)                    │
│       ┌───┐                                  │
│       │ ○ │  Fixed width/height              │
│       └───┘  border-radius: 50%             │
├─────────────────────────────────────────────┤
│  CARD SKELETON (Composite)                   │
│  ┌───────────────────┐                       │
│  │  [Image Skel]     │                       │
│  │  [Text Skel]      │                       │
│  │  [Text Skel short]│                       │
│  └───────────────────┘                       │
└─────────────────────────────────────────────┘
```

### 3. React Skeleton Primitive Architecture

```
<SkeletonProvider>          ← Controls loading state globally
  ├── <SkeletonText />      ← Lines of text placeholders
  ├── <SkeletonCircle />    ← Avatar / icon placeholders
  ├── <SkeletonRect />      ← Image / card placeholders
  └── <SkeletonCard />      ← Composite: image + text lines
```

Each primitive:
- Accepts `width`, `height`, `borderRadius` props
- Inherits shimmer animation from shared CSS
- Supports `aria-busy` and `aria-label` for accessibility
- Respects `prefers-reduced-motion` to disable animation

### 4. Transition Strategy: Skeleton → Real Content

```
Phase 1: SSR HTML includes skeleton markup (zero-JS render)
Phase 2: Client hydrates, data fetch begins
Phase 3: Data arrives → skeleton fades out, content fades in
Phase 4: Images lazy-load → individual skeletons replaced

Timeline:
0ms        200ms       800ms        1500ms
│──SSR─────│──Hydrate──│──Data───────│──Images──│
│ Skeleton  │ Skeleton  │ Content     │ Full UI  │
│ (static)  │ (shimmer) │ (fade-in)  │          │
```

### 5. Avoiding CLS (Cumulative Layout Shift)

Skeleton screens are **the primary defense against CLS** when loading dynamic content:

| Technique | CLS Impact |
|-----------|-----------|
| No placeholder → inject content | **Bad** (0.15+) |
| Spinner → inject content | **Bad** (content pushes spinner) |
| Skeleton matching final layout | **Good** (0.0) |
| Skeleton with wrong dimensions | **Bad** (shift on replacement) |

**Critical rule:** The skeleton MUST match the exact dimensions of the final content. If a card is 340×200px when loaded, the skeleton must be 340×200px.

### 6. SSR Skeletons for Zero-JS Initial Render

Server-rendered skeletons ensure users see structure immediately — even before JavaScript downloads, parses, and executes:

```
Server HTML:
<div class="skeleton-card" aria-busy="true">
  <div class="skeleton skeleton-rect" style="height:200px"></div>
  <div class="skeleton skeleton-text" style="width:80%"></div>
  <div class="skeleton skeleton-text" style="width:60%"></div>
</div>

CSS (inline in <head> or critical CSS):
.skeleton { /* shimmer animation — no JS needed */ }

Result: User sees animated skeleton on first paint,
        before any JS has loaded.
```

### 7. Next.js `loading.tsx` Integration

Next.js App Router has first-class skeleton support via `loading.tsx`:

```
app/
  dashboard/
    page.tsx          ← Async data fetching
    loading.tsx       ← Skeleton shown during fetch
    layout.tsx        ← Wraps both, stays mounted
```

When navigating to `/dashboard`, Next.js:
1. Immediately renders `loading.tsx` inside the `layout.tsx`
2. Streams `page.tsx` content once the server component resolves
3. Replaces the skeleton with real content — no client-side state needed

### 8. Accessibility Deep-Dive

| Requirement | Implementation |
|-------------|---------------|
| Screen reader announcement | `aria-busy="true"` on skeleton container |
| Loading semantics | `role="status"` or `role="progressbar"` |
| Content replacement | `aria-busy="false"` when content loads |
| Reduced motion | `prefers-reduced-motion: reduce` → static grey |
| Colour contrast | Skeleton grey must meet 3:1 against background |
| Focus management | Don't trap focus on skeleton elements |

### 9. Comparison Matrix: Spinner vs Skeleton vs Nothing

```
                    Spinner          Skeleton         Nothing
                    ───────          ────────         ───────
Perceived speed     Moderate         Fast             Slow
Layout stability    If sized         Excellent        Poor
Implementation      Simple           Moderate         None
Maintenance         Low              Must match UI    None
A11y built-in       ❌               ✅ (aria-busy)   ❌
SSR compatible      ❌ (needs JS)    ✅               N/A
Progressive         ❌ (all/nothing) ✅ (per section) ❌
Cognitive load      "Waiting"        "Almost there"   "Broken?"
Best for            Short waits      Page loads        Never
                    (<500ms)         (500ms–3s)
```

### 10. Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Skeleton doesn't match layout | CLS when real content replaces it | Mirror exact dimensions |
| No timeout / infinite skeleton | User stuck if fetch fails | Add timeout → error state after 10s |
| Ignoring `prefers-reduced-motion` | Motion-sensitive users get nauseous | Disable shimmer animation |
| Skeleton on cached data | Unnecessary flash of skeleton | Check cache before showing skeleton |
| Same skeleton for all pages | Doesn't match actual content layout | Per-page skeleton components |
| Skeleton with spinner inside | Contradictory loading signals | Pick one pattern |
| No `aria-busy` | Screen readers don't announce loading | Always add `aria-busy="true"` |

────────────────────────────────────────────────────────────────

## Real-World Examples

────────────────────────────────────────────────────────────────

### Example 1: YouTube / Google

YouTube uses skeleton screens for video cards:
- Grey rectangle (16:9) for thumbnail
- Two lines of text skeleton for title
- Circle + short line for channel info
- Skeleton is SSR-rendered → visible before JS loads

### Example 2: LinkedIn Feed

LinkedIn renders skeleton cards matching the exact feed post layout:
- Avatar circle + name lines
- Body text lines (3 varying widths)
- Image placeholder (if post type includes media)
- Engagement row skeleton (like/comment/share)

### Example 3: Hruday @ SAP Labs — Lighthouse 60 → 95

At SAP Labs, Hruday tackled a dashboard that scored **Lighthouse 60** primarily due to:
- **LCP 4.2s** — blank screen until API responded
- **CLS 0.28** — content injection shifted layout
- **TBT 900ms** — heavy JS parsing before any visual

**Solution implemented:**
1. **SSR skeleton screens** — server-rendered HTML with inline critical CSS for shimmer animation → FCP dropped from 3.1s to 0.8s
2. **Per-component skeletons** matching exact final dimensions → CLS dropped from 0.28 to 0.02
3. **`prefers-reduced-motion` support** → static grey fallback for accessible users, meeting **WCAG AA**
4. **Progressive skeleton replacement** — header skeleton replaced first, then sidebar, then main content grid
5. **Skeleton timeout with error boundary** — 10s timeout → graceful error state instead of infinite shimmer
6. **Critical CSS inlined in `<head>`** — shimmer animation works before any JS bundle loads

**Results:**
```
Before → After
─────────────────────────────
LCP:        4.2s  →  1.1s
CLS:        0.28  →  0.02
FCP:        3.1s  →  0.8s
TBT:        900ms →  180ms
Lighthouse: 60    →  95
WCAG:       Fail  →  AA compliant
```

### Example 4: Facebook (Meta)

Facebook pioneered skeleton screens at scale:
- Each feed story type has its own skeleton shape
- Skeletons are embedded in the initial HTML payload
- Transition uses a subtle fade (opacity 0→1 over 200ms)
- React Suspense boundaries control skeleton visibility

────────────────────────────────────────────────────────────────

## Interview Answer

────────────────────────────────────────────────────────────────

> **"Explain skeleton screens and how you've used them to improve perceived performance."**
>
> Skeleton screens are placeholder UI elements shaped like real content — grey boxes, lines, and circles — shown while data loads. They reduce perceived wait time by 20–30% compared to spinners because users interpret structured placeholders as partially loaded content rather than an empty state.
>
> At SAP Labs, I improved a dashboard from Lighthouse 60 to 95 using skeleton screens. The key was SSR-rendering skeletons with inline critical CSS so users saw animated placeholders on first paint — before any JavaScript loaded. Each skeleton matched the exact dimensions of its final content, which eliminated CLS (dropped from 0.28 to 0.02). I built React primitives — `SkeletonText`, `SkeletonCircle`, `SkeletonRect` — that composed into page-level skeletons. For accessibility (WCAG AA), I added `aria-busy="true"` on skeleton containers and disabled the shimmer animation for users with `prefers-reduced-motion` enabled. I also added a 10-second timeout that transitions to an error state instead of showing an infinite shimmer. In Next.js projects, I use the `loading.tsx` convention to get automatic skeleton rendering during route transitions with zero client-side state management.
>
> The CSS shimmer itself is a moving linear gradient — three colour stops animated via `background-position` from `-200%` to `200%` with `ease-in-out` timing. The gradient is wider than the element (`background-size: 200%`), creating the sweeping highlight effect. This is pure CSS — no JavaScript needed for the animation.

────────────────────────────────────────────────────────────────

## Code

────────────────────────────────────────────────────────────────

### 1. Core CSS — Shimmer Animation

```css
/* ── skeleton-shimmer.css ─────────────────────────── */

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--skeleton-base, #e0e0e0) 25%,
    var(--skeleton-highlight, #f5f5f5) 50%,
    var(--skeleton-base, #e0e0e0) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
  color: transparent;         /* Hide any text content */
  user-select: none;          /* Prevent accidental selection */
  pointer-events: none;       /* Non-interactive */
}

/* ── Accessibility: Reduced Motion ────────────────── */
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: var(--skeleton-base, #e0e0e0);
  }
}

/* ── Dark Mode Support ────────────────────────────── */
@media (prefers-color-scheme: dark) {
  .skeleton {
    --skeleton-base: #2a2a2a;
    --skeleton-highlight: #3a3a3a;
  }
}

/* ── Skeleton Element Types ───────────────────────── */
.skeleton-text {
  height: 1em;
  margin-bottom: 0.5em;
}

.skeleton-text:last-child {
  width: 60%;  /* Last line shorter for realism */
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-rect {
  border-radius: 8px;
}
```

### 2. React Skeleton Primitives (TypeScript)

```tsx
// ── skeleton-primitives.tsx ──────────────────────────

import React from "react";
import "./skeleton-shimmer.css";

// ── Types ────────────────────────────────────────────
interface SkeletonBaseProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

// ── SkeletonText ─────────────────────────────────────
interface SkeletonTextProps extends SkeletonBaseProps {
  lines?: number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  width = "100%",
  height = "1em",
  className = "",
  style,
}) => (
  <div aria-hidden="true" className={className} style={style}>
    {Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className="skeleton skeleton-text"
        style={{
          width: i === lines - 1 ? "60%" : width,
          height,
        }}
      />
    ))}
  </div>
);

// ── SkeletonCircle ───────────────────────────────────
interface SkeletonCircleProps extends SkeletonBaseProps {
  size?: string | number;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  className = "",
  style,
}) => (
  <div
    aria-hidden="true"
    className={`skeleton skeleton-circle ${className}`}
    style={{
      width: size,
      height: size,
      ...style,
    }}
  />
);

// ── SkeletonRect ─────────────────────────────────────
export const SkeletonRect: React.FC<SkeletonBaseProps> = ({
  width = "100%",
  height = 200,
  borderRadius = 8,
  className = "",
  style,
}) => (
  <div
    aria-hidden="true"
    className={`skeleton skeleton-rect ${className}`}
    style={{
      width,
      height,
      borderRadius,
      ...style,
    }}
  />
);
```

### 3. Composite Skeleton Card

```tsx
// ── skeleton-card.tsx ────────────────────────────────

import React from "react";
import { SkeletonText, SkeletonCircle, SkeletonRect } from "./skeleton-primitives";

interface SkeletonCardProps {
  showImage?: boolean;
  showAvatar?: boolean;
  textLines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  showAvatar = true,
  textLines = 3,
}) => (
  <div
    className="skeleton-card"
    role="status"
    aria-busy="true"
    aria-label="Loading content"
  >
    {showImage && (
      <SkeletonRect
        width="100%"
        height={200}
        style={{ marginBottom: 16 }}
      />
    )}

    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      {showAvatar && <SkeletonCircle size={40} />}
      <div style={{ flex: 1 }}>
        <SkeletonText lines={1} width="50%" />
      </div>
    </div>

    <SkeletonText lines={textLines} />
  </div>
);
```

### 4. Page-Level Skeleton Composition

```tsx
// ── dashboard-skeleton.tsx ───────────────────────────

import React from "react";
import { SkeletonCard } from "./skeleton-card";
import { SkeletonText, SkeletonRect } from "./skeleton-primitives";

export const DashboardSkeleton: React.FC = () => (
  <div
    className="dashboard-skeleton"
    role="status"
    aria-busy="true"
    aria-label="Loading dashboard"
  >
    {/* ── Header Skeleton ─────────────────────────── */}
    <header style={{ display: "flex", justifyContent: "space-between", padding: 16 }}>
      <SkeletonRect width={120} height={32} />
      <div style={{ display: "flex", gap: 8 }}>
        <SkeletonRect width={80} height={32} />
        <SkeletonRect width={80} height={32} />
      </div>
    </header>

    {/* ── Stats Row Skeleton ──────────────────────── */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: 16 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <SkeletonText lines={1} width="40%" />
          <SkeletonRect width="60%" height={32} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>

    {/* ── Content Grid Skeleton ───────────────────── */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: 16 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);
```

### 5. Skeleton Wrapper with Timeout & Transition

```tsx
// ── skeleton-wrapper.tsx ─────────────────────────────

import React, { useState, useEffect, useRef } from "react";

interface SkeletonWrapperProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  timeout?: number;          // ms before error state
  onTimeout?: () => void;
  fadeDuration?: number;     // ms for crossfade
}

export const SkeletonWrapper: React.FC<SkeletonWrapperProps> = ({
  isLoading,
  skeleton,
  children,
  timeout = 10_000,
  onTimeout,
  fadeDuration = 200,
}) => {
  const [timedOut, setTimedOut] = useState(false);
  const [shouldFade, setShouldFade] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Timeout guard ──────────────────────────────────
  useEffect(() => {
    if (isLoading) {
      timeoutRef.current = setTimeout(() => {
        setTimedOut(true);
        onTimeout?.();
      }, timeout);
    } else {
      clearTimeout(timeoutRef.current);
      setTimedOut(false);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [isLoading, timeout, onTimeout]);

  // ── Fade transition ────────────────────────────────
  useEffect(() => {
    if (!isLoading) {
      setShouldFade(true);
      const timer = setTimeout(() => setShouldFade(false), fadeDuration);
      return () => clearTimeout(timer);
    }
  }, [isLoading, fadeDuration]);

  if (timedOut) {
    return (
      <div role="alert" className="skeleton-error">
        <p>Content failed to load. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return <>{skeleton}</>;
  }

  return (
    <div
      style={{
        opacity: shouldFade ? 0 : 1,
        transition: `opacity ${fadeDuration}ms ease-in`,
      }}
      aria-busy="false"
    >
      {children}
    </div>
  );
};
```

### 6. Next.js `loading.tsx` — Automatic Skeleton

```tsx
// ── app/dashboard/loading.tsx ────────────────────────

import { DashboardSkeleton } from "@/components/dashboard-skeleton";

export default function Loading() {
  return <DashboardSkeleton />;
}
```

```tsx
// ── app/dashboard/page.tsx ───────────────────────────

import { Suspense } from "react";

async function fetchDashboardData() {
  const res = await fetch("https://api.example.com/dashboard", {
    next: { revalidate: 60 },
  });
  return res.json();
}

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  return (
    <div className="dashboard" aria-busy="false">
      {/* Real content rendered by Next.js after data resolves */}
      <h1>{data.title}</h1>
      {/* ... */}
    </div>
  );
}
```

### 7. SSR Skeleton — Zero-JS Initial Render

```html
<!-- ── Inline in server-rendered HTML ──────────────── -->
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    /* Critical CSS — inlined for zero-JS skeleton render */
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .skeleton {
      background: linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: 4px;
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton { animation: none; background: #e0e0e0; }
    }
    .sr-only {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); border: 0;
    }
  </style>
</head>
<body>
  <main role="status" aria-busy="true">
    <span class="sr-only">Loading dashboard content</span>
    <!-- Skeleton matches final layout exactly -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px">
      <div class="skeleton" style="height:200px"></div>
      <div class="skeleton" style="height:200px"></div>
      <div class="skeleton" style="height:200px"></div>
    </div>
    <div style="padding:0 16px">
      <div class="skeleton" style="height:1em;width:80%;margin-bottom:8px"></div>
      <div class="skeleton" style="height:1em;width:60%;margin-bottom:8px"></div>
      <div class="skeleton" style="height:1em;width:70%"></div>
    </div>
  </main>
  <!-- JS bundle loads later — skeleton already visible -->
  <script src="/bundle.js" defer></script>
</body>
</html>
```

### 8. Custom Hook: `useSkeletonDelay`

```tsx
// ── use-skeleton-delay.ts ────────────────────────────
// Prevents skeleton flash for fast responses (<200ms)

import { useState, useEffect } from "react";

export function useSkeletonDelay(
  isLoading: boolean,
  delay: number = 200
): boolean {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSkeleton(true), delay);
      return () => clearTimeout(timer);
    }
    setShowSkeleton(false);
  }, [isLoading, delay]);

  return showSkeleton;
}

// ── Usage ────────────────────────────────────────────
// const { data, isLoading } = useFetch("/api/dashboard");
// const showSkeleton = useSkeletonDelay(isLoading, 200);
//
// return showSkeleton
//   ? <DashboardSkeleton />
//   : <Dashboard data={data} />;
```

### 9. Skeleton with React Suspense

```tsx
// ── suspense-skeleton.tsx ────────────────────────────

import React, { Suspense, lazy } from "react";
import { SkeletonCard } from "./skeleton-card";

const ProductList = lazy(() => import("./product-list"));

export const ProductPage: React.FC = () => (
  <Suspense
    fallback={
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading products"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    }
  >
    <ProductList />
  </Suspense>
);
```

### 10. Testing Skeleton Accessibility

```tsx
// ── skeleton.test.tsx ────────────────────────────────

import { render, screen } from "@testing-library/react";
import { SkeletonCard } from "./skeleton-card";
import { SkeletonWrapper } from "./skeleton-wrapper";

describe("SkeletonCard", () => {
  it("has aria-busy=true when loading", () => {
    const { container } = render(<SkeletonCard />);
    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).toHaveAttribute("aria-busy", "true");
  });

  it("has accessible label", () => {
    const { container } = render(<SkeletonCard />);
    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).toHaveAttribute("aria-label", "Loading content");
  });
});

describe("SkeletonWrapper", () => {
  it("sets aria-busy=false when loaded", () => {
    const { container } = render(
      <SkeletonWrapper isLoading={false} skeleton={<div />}>
        <p>Real content</p>
      </SkeletonWrapper>
    );
    expect(container.querySelector('[aria-busy="false"]')).toBeInTheDocument();
  });

  it("shows error after timeout", async () => {
    jest.useFakeTimers();
    render(
      <SkeletonWrapper isLoading={true} skeleton={<div />} timeout={5000}>
        <p>Content</p>
      </SkeletonWrapper>
    );
    jest.advanceTimersByTime(5000);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    jest.useRealTimers();
  });
});
```

────────────────────────────────────────────────────────────────

## Why & How Summary

────────────────────────────────────────────────────────────────

### WHY Skeleton Screens

| Why | Detail |
|-----|--------|
| **Perceived performance** | 20–30% faster perception than spinners — users see structure, not emptiness |
| **CLS elimination** | Skeleton matches final layout → zero layout shift on content arrival |
| **SSR compatibility** | Pure CSS animation works before JS loads → better FCP, LCP |
| **Accessibility** | `aria-busy`, `role="status"`, `prefers-reduced-motion` → WCAG AA |
| **Progressive loading** | Replace skeletons per-section rather than all-or-nothing |
| **Framework integration** | Next.js `loading.tsx`, React Suspense `fallback` — first-class support |

### HOW to Implement

| Step | How |
|------|-----|
| **1. CSS shimmer** | `linear-gradient` + `@keyframes` animating `background-position` |
| **2. Build primitives** | `SkeletonText`, `SkeletonCircle`, `SkeletonRect` — composable blocks |
| **3. Compose per-page** | Mirror exact layout of real content with skeleton primitives |
| **4. SSR render** | Inline critical CSS in `<head>`, skeleton HTML in initial payload |
| **5. Accessibility** | `aria-busy="true"`, `role="status"`, `@media (prefers-reduced-motion)` |
| **6. Transition** | Fade crossfade (200ms opacity transition) skeleton → content |
| **7. Guard with timeout** | 10s timeout → error state, never infinite shimmer |
| **8. Delay for fast loads** | `useSkeletonDelay(200ms)` — avoid skeleton flash on cached data |
| **9. Test** | Assert `aria-busy`, `role`, timeout behaviour, reduced motion |
| **10. Measure** | Lighthouse: FCP, LCP, CLS, TBT — target 90+ score |

### Decision Flowchart

```
User navigates to page
        │
        ▼
  Is data cached?
  ├── YES → Render content immediately (no skeleton)
  └── NO
        │
        ▼
  Will load take > 200ms?
  ├── NO → Show nothing (avoid skeleton flash)
  └── YES
        │
        ▼
  Show skeleton (SSR if possible)
        │
        ▼
  Data arrives within 10s?
  ├── YES → Fade skeleton → content
  └── NO → Show error state with retry
```

### Key Metrics Impact (Hruday @ SAP Labs)

```
Metric          Before    After     Improvement
──────────────────────────────────────────────
FCP             3.1s      0.8s      74% faster
LCP             4.2s      1.1s      74% faster
CLS             0.28      0.02      93% reduction
TBT             900ms     180ms     80% reduction
Lighthouse      60        95        +35 points
Accessibility   Fail      WCAG AA   Compliant
```

────────────────────────────────────────────────────────────────

*Skeleton screens transform "waiting" into "previewing" — a psychological shift that makes applications feel faster, more stable, and more accessible. The combination of SSR skeletons, CSS-only shimmer animation, composable React primitives, and proper aria attributes is the gold standard for modern loading UX.*

────────────────────────────────────────────────────────────────
