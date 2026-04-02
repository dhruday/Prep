# 103. Activity API & View Transitions
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

The **Activity API** (formerly `<Offscreen>`) is an upcoming React primitive that allows components to be hidden while keeping their state alive — similar to how a mobile app's back-stack preserves the state of hidden screens. A component inside `<Activity>` can be made invisible (mode="hidden") without unmounting, then restored to its previous state when made visible again — no re-fetching, no state reset. **View Transitions** are a browser platform API (CSS View Transitions API) that enables animated transitions between different UI states with hardware-accelerated animations using simple CSS snapshot capture. React 19 integrates `startViewTransition` through `startTransition`, and Next.js provides first-class View Transitions support. Together, these APIs enable native-app-quality animated page transitions in web apps.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Activity API — Preserving Component State Without Mount/Unmount

```typescript
// The Problem: tabs unmount/remount, losing state and causing re-fetches
function TabsWithStateLoss() {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'settings'>('editor');

  return (
    <div>
      <TabBar active={activeTab} onChange={setActiveTab} />
      {/* ❌ Each tab switch unmounts old tab, mounts new tab:
          - scroll position resets
          - form data lost
          - data re-fetches
          - animation state lost
          - expensive mount costs repeated */}
      {activeTab === 'editor' && <EditorTab />}
      {activeTab === 'preview' && <PreviewTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

// Activity API solution (React 19+):
import { Activity } from 'react';  // API name subject to change before stable release

function TabsWithStatePreservation() {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'settings'>('editor');

  return (
    <div>
      <TabBar active={activeTab} onChange={setActiveTab} />
      {/* ✅ Activity keeps components mounted but hidden */}
      <Activity mode={activeTab === 'editor' ? 'visible' : 'hidden'}>
        <EditorTab />    {/* state preserved when hidden */}
      </Activity>
      <Activity mode={activeTab === 'preview' ? 'visible' : 'hidden'}>
        <PreviewTab />   {/* state preserved when hidden */}
      </Activity>
      <Activity mode={activeTab === 'settings' ? 'visible' : 'hidden'}>
        <SettingsTab />  {/* state preserved when hidden */}
      </Activity>
    </div>
  );
  // When tab switches from editor → preview:
  // - EditorTab: mode changes to 'hidden' → component stays mounted, state preserved
  //   useEffects with cleanup run (simulating unmount), but state is kept
  // - PreviewTab: mode changes to 'visible' → component appears
  //   useEffects re-run (simulating mount), but state is ALREADY set — instant
}
```

### Activity Lifecycle — How Effects Behave

```typescript
// Activity triggers a "soft unmount/mount" on hide/show:
function EditorTab() {
  const [content, setContent] = useState('');

  useEffect(() => {
    // Runs on genuine mount AND when Activity mode becomes 'visible'
    console.log('Editor became visible');
    window.addEventListener('beforeunload', warnUnsaved);
    return () => {
      // Runs on genuine unmount AND when Activity mode becomes 'hidden'
      console.log('Editor became hidden');
      window.removeEventListener('beforeunload', warnUnsaved);
    };
  }, []);
  // State (content) IS preserved between hide/show cycles
  // Effects are cleaned up/re-run to match the visible lifecycle
}
```

### View Transitions API — The Browser Platform Primitive

```typescript
// Native browser View Transitions API (not React-specific)
document.startViewTransition(async () => {
  // Capture the current state as a screenshot
  // Execute the DOM mutation (this callback)
  await updateDOM();
  // Capture the new state
  // Animate from old snapshot to new snapshot
});

// CSS to control the animations:
// @keyframes slideIn { from { transform: translateX(100%); } to { transform: none; } }
// @keyframes slideOut { from { transform: none; } to { transform: translateX(-100%); } }
//
// ::view-transition-old(root) { animation: slideOut 300ms ease; }
// ::view-transition-new(root) { animation: slideIn 300ms ease; }
//
// Named view transitions for individual elements:
// .product-image { view-transition-name: product-img; }
// → The product image morphs from old position to new position during transition
```

### React + View Transitions

```typescript
// React 18 + document.startViewTransition (manual integration)
import { startTransition } from 'react';

function NavigationLink({ to, children }: { to: string; children: React.ReactNode }) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!document.startViewTransition) {
      // Fallback for browsers without View Transitions support
      startTransition(() => navigate(to));
      return;
    }

    // Wrap navigation in both React transition AND View Transition
    document.startViewTransition(() => {
      startTransition(() => navigate(to));
    });
  };

  return <a href={to} onClick={handleClick}>{children}</a>;
}
```

```typescript
// Next.js 14+ View Transitions integration
// app/layout.tsx
import { useRouter } from 'next/navigation';

// Next.js doesn't have built-in View Transitions API (as of Next.js 14)
// Use next-view-transitions library or implement manually

// Option 1: next-view-transitions library (popular community solution)
// import { Link } from 'next-view-transitions';
// <Link href="/products">Products</Link>  ← auto wraps navigation in startViewTransition

// Option 2: Manual with Next.js App Router
// app/providers.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ViewTransitionsProvider({ children }: { children: React.ReactNode }) {
  // Intercept all navigations to wrap in startViewTransition
  // This is a simplified concept — real implementation patches router.push
  return <>{children}</>;
}
```

### Named View Transitions — Hero Animation Pattern

```typescript
// The "hero" animation: an element morphs from position in list to position in detail view
// This is the native "shared element transition" equivalent for the web

// Product list item:
function ProductListItem({ product }: { product: Product }) {
  return (
    <div>
      <img
        src={product.imageUrl}
        style={{ viewTransitionName: `product-img-${product.id}` }}
        // ↑ gives this element a unique transition name
      />
      <span>{product.name}</span>
    </div>
  );
}

// Product detail page (same item, different position):
function ProductDetailPage({ product }: { product: Product }) {
  return (
    <div>
      <img
        src={product.imageUrl}
        style={{ viewTransitionName: `product-img-${product.id}` }}
        // ↑ same transition name → browser morphs between the two positions
      />
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </div>
  );
}

// When navigating list → detail, the image smoothly animates from
// its position in the list to its position in the detail view
// No JS animation code — pure CSS and browser native capability
```

### Progressive Enhancement for View Transitions

```typescript
// View Transitions are not yet supported in all browsers (Firefox ≤ 125, Safari ≤ 18)
// Feature-detect before using

function safeViewTransition(callback: () => void): void {
  if (!document.startViewTransition) {
    callback();   // fallback: instant update
    return;
  }
  document.startViewTransition(callback);
}

// For SSR (Next.js): View Transitions are browser-only
// Ensure all startViewTransition calls are inside event handlers, not render
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, a multi-tab analytics dashboard had 4 tabs: Overview, Data Table, Filters, Export. Each tab switch unmounted the previous tab, causing the Data Table to re-fetch (500ms data load) on every tab switch. The Activity API would solve this directly — Data Table stays mounted when hidden, its filter state and fetched data preserved, eliminating the re-fetch cost on tab revisit.

View Transitions would enhance the SAP analytics dashboard navigation between overview cards and detail pages — the metric card morphs into the detail header when the user drills down, providing visual continuity that reduces cognitive load.

**At FAANG scale:**
- **Microsoft (Edge browser team):** View Transitions at the browser level for tab strip animations, sidebar transitions; Office Online using View Transitions for document view switches
- **Adobe (Photoshop Web / Firefly):** Activity API for keeping workbench panels alive (layer panel, properties panel) while switching between canvas modes; View Transitions for tool drawer animations
- **Salesforce:** Activity API for side panel widgets (Customer 360, Related Records) — kept alive while switching between record views; avoids expensive re-fetching of related record data
- **Cisco (Catalyst Center):** Tab-based device configuration panels kept alive with Activity API; switching between Interface, BGP, and OSPF tabs preserves unsaved form state

---

## 💬 4. Interview Execution

### Sample Answer

> "These are two separate things addressing different aspects of UI quality.
>
> The Activity API solves state preservation for hidden components. In React today, toggling a component's visibility typically uses conditional rendering — when it hides, it unmounts and loses state. The Activity API adds a 'hidden' mode: the component stays mounted (state preserved, no re-fetch needed) but is invisible and doesn't affect layout. Effects run cleanup on hide and setup on show, mimicking the lifecycle signal without losing state. This is essential for tab-based UIs, wizard steps, back-stack navigation — anywhere you want instant revisits without re-fetching.
>
> View Transitions is a browser platform API — it captures the current DOM as a screenshot, applies your DOM update, captures the new screenshot, then smoothly animates between the two using CSS animations. React 18's `startTransition` can wrap the state update so both React's concurrent scheduling and the browser's transition coordinate. Named view transitions (assigning `view-transition-name` via CSS) give you 'hero' animations where an element morphs between its position in one view and another — native shared element transitions, entirely CSS-driven.
>
> Progressive enhancement is the key for View Transitions: feature-detect `document.startViewTransition` and fall back to an instant update if not available."

---

## 💻 5. Code Example

```typescript
// ========================
// Activity API — tab state preservation
// ========================
import { Activity, useState } from 'react';

type Tab = 'overview' | 'table' | 'settings';

function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div>
      <nav>
        {(['overview', 'table', 'settings'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-selected={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </nav>

      <Activity mode={activeTab === 'overview' ? 'visible' : 'hidden'}>
        <OverviewTab />      {/* state preserved on hide */}
      </Activity>
      <Activity mode={activeTab === 'table' ? 'visible' : 'hidden'}>
        <DataTableTab />     {/* data fetched once, preserved across tab switches */}
      </Activity>
      <Activity mode={activeTab === 'settings' ? 'visible' : 'hidden'}>
        <SettingsTab />      {/* form state preserved */}
      </Activity>
    </div>
  );
}

// ========================
// View Transitions — React router integration
// ========================
'use client';

import { startTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';

function useViewTransitionRouter() {
  const router = useRouter();

  const push = useCallback((href: string) => {
    if (!document.startViewTransition) {
      startTransition(() => router.push(href));
      return;
    }
    document.startViewTransition(() => {
      startTransition(() => router.push(href));
    });
  }, [router]);

  return { push };
}

// Product grid with View Transitions + Hero animation
interface Product { id: string; name: string; imageUrl: string; }

function ProductGrid({ products }: { products: Product[] }) {
  const { push } = useViewTransitionRouter();

  return (
    <ul>
      {products.map(product => (
        <li key={product.id}>
          <button onClick={() => push(`/products/${product.id}`)}>
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ viewTransitionName: `product-img-${product.id}` }}
            />
            <span>{product.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// Product Detail — shared element with same view-transition-name
function ProductDetail({ product }: { product: Product }) {
  return (
    <div>
      <img
        src={product.imageUrl}
        alt={product.name}
        style={{
          viewTransitionName: `product-img-${product.id}`,
          width: '100%',   // different size and position than in the grid
        }}
      />
      <h1>{product.name}</h1>
    </div>
    // When navigating from grid to detail, the image morphs from
    // its grid thumbnail position to this larger hero position
    // Pure browser native animation — no JS animation library needed
  );
}

/* CSS for the page transition (in globals.css):
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; transform: translateY(-8px); }
}

::view-transition-old(root) {
  animation: 200ms ease-in fade-out;
}
::view-transition-new(root) {
  animation: 300ms ease-out fade-in;
}
*/

declare function OverviewTab(): JSX.Element;
declare function DataTableTab(): JSX.Element;
declare function SettingsTab(): JSX.Element;
```

---

## 🧠 6. Memory Aid

**Activity API:** "Hidden ≠ Unmounted. State survives mode switches."
**View Transitions:** "Browser screenshots old state, new state, animates between them. `view-transition-name` = hero animation."

**Quick cheat sheet:**
- Activity: `mode="visible" | "hidden"` — preserves state, fires effects on mode change
- View Transitions: `document.startViewTransition(fn)` — wrap DOM update, CSS handles animation
- Named transition: `style={{ viewTransitionName: 'unique-name' }}` — same name = shared element morph

**Mnemonic:** **HASH** — **H**idden but alive (Activity), **A**nimation via snapshots (View Transitions), **S**hared elements with unique names, **H**ardware accelerated natively.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Activity API addresses the most common UX complaint about tab-based SPAs: the "every tab switch re-fetches everything" problem — instant tab switching feels like a major quality upgrade
→ View Transitions closes the performance perception gap between native apps and web apps — a major reason users perceive native apps as "better" is animated transitions; View Transitions provides this natively without JS animation libraries
→ Both APIs are featured in Google's Modern Web Vitals guidance and are increasingly used in FAANG products — engineers who understand and can implement them stand out

**How each works (2 sentences each):**
Activity: React keeps the component tree for a hidden Activity mounted in memory but skips painting it to the screen and marks its effects as "pending cleanup" — when mode changes to "visible," React replays the effects setup callbacks and restores the component's visibility, with state having been preserved throughout the hidden period in React's fiber tree.
View Transitions: when `document.startViewTransition(fn)` is called, the browser captures a screenshot of the current page as a `::view-transition-old` pseudo-element, executes `fn` to update the DOM, captures the new state as `::view-transition-new`, then composites and animates between the two snapshots using CSS animations — elements with matching `view-transition-name` values are treated as a "shared element" and animated between their positions and sizes rather than fading out/in independently.

**Company relevance:**
- Microsoft: Tab-based Office Online interfaces (Word tabs: Review/Insert/Design) — Activity API preserves panel state between tab switches, avoiding re-rendering document context on every tab
- Adobe: Creative tools with multiple workspace panels — Activity API for tool drawers; View Transitions for workspace mode transitions (edit → preview → share)
- Salesforce: Record page related tabs (Details/Activity/Related Lists) — Activity API eliminates repeated related list fetches on tab revisit
- Cisco: Multi-pane network dashboard with device panels — Activity API preserves filter and state in non-active panes

---
✅ Topic 103/486 complete → Continuing to Topic 104: Compound Component Pattern
