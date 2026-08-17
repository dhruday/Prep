# How Different Frameworks Coexist in One Browser Tab
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.1: The Big Picture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Three frameworks in one tab**: SAP UI5 (Team A), React 18 (Teams B and D), Next.js (Team C) — all running simultaneously, none crashing the others; Module Federation isolates each module's code; the browser DOM is the integration point
- **CSS isolation is the critical piece**: without it, a CSS class named `.button` in SAP UI5 styles all buttons in the shell too; solution is CSS Modules (scoped class names like `button_x7k2l`) or Shadow DOM per module; SAP UI5 uses its own theme layer; React modules use CSS Modules
- **State isolation**: each module has its own Redux store (or no global store at all); they never share Redux state; only the shell's Redux store is shared (via the useAuth hook exported from shell); this prevents one module's state mutation from breaking another module
- **No global variable conflicts**: each module's JavaScript runs in its own closure (because each is a separate bundle); there's no `window.React` that could clash; the singleton config in Federation handles shared deps — one React instance, but each module accesses it through its own import, not `window.React`
- **The one thing that can leak across modules**: global CSS without scoping (`:root` variables, `*` selectors, unscoped element selectors like `h1 { font-family: ... }`); always use scoped CSS; never apply styles to bare HTML elements in module CSS
- **Interview signal**: "Each module is a completely isolated JavaScript bundle running its own framework; they only share the DOM and the two Foundation hooks: the shell event bus and the shell auth context"

---

## 1. One-Line Definition
Different frameworks coexist in one browser tab when each micro-frontend module is a fully isolated JavaScript bundle with scoped CSS and its own module-specific state — sharing only the DOM mount point, auth context, and the shell event bus.

---

## 2. The Problem It Solves

When four teams work in four different frameworks, you have two options: force everyone onto one framework, or find a way to let each framework run independently. Forcing migration wastes months of work and team knowledge. Module Federation makes the second option safe.

The main risks when mixing frameworks are:

1. **CSS bleed**: Team A's `.modal` class styles Team B's modal by accident
2. **State bleed**: Team A mutates a global variable that Team B reads
3. **Library conflicts**: Two different versions of lodash both attached to `window._`
4. **Event listener leaks**: A module adds a global `window.addEventListener` and never removes it on unmount; the listener fires when another module is active

Each risk has a specific solution.

---

## 3. The Isolation Model

```
WHAT IS ISOLATED PER MODULE                WHAT IS SHARED (intentionally)

✓ JavaScript bundle (closure)              ✓ DOM (each module mounts into a div)
✓ CSS (scoped with CSS Modules)            ✓ React instance (singleton)
✓ Component tree (separate React root)     ✓ React-DOM instance (singleton)
✓ Module-level Redux store (if used)       ✓ Shell's auth context (useAuth hook)
✓ Framework runtime (SAP UI5 owns its own  ✓ Shell event bus (typed events)
  DOM subtree)                             ✓ Design tokens (CSS custom properties)
✓ Error boundary (module errors don't      ✓ Global fonts (loaded by shell)
  crash shell)
✓ WebWorkers (if used)
```

---

## 4. CSS Isolation in Practice

```
CSS MODULE — BEFORE (builds)

Team A writes:
  .button { background: blue }      → scoped to .button_a4k2m { background: blue }

Team B writes:  
  .button { background: green }     → scoped to .button_x9p3q { background: green }

In the DOM:
  <button class="button_a4k2m">Team A button</button>  → blue
  <button class="button_x9p3q">Team B button</button>  → green

They coexist. No conflict.
```

```typescript
// ✅ CSS Modules in use — scoped class names auto-generated at build time

// reportModule/src/components/ReportList.module.css
.container { padding: 1rem; }
.title { font-size: 1.2rem; font-weight: bold; }
.button { background: var(--shell-primary-color); } // uses shell design token

// reportModule/src/components/ReportList.tsx
import styles from './ReportList.module.css';

export function ReportList() {
  return (
    <div className={styles.container}>
      {/* className is auto-generated: "container_abc123" — never conflicts */}
      <h2 className={styles.title}>Reports</h2>
    </div>
  );
}
```

```css
/* ❌ Global CSS leak — NEVER do this in a module */
/* This styles ALL h2 elements in the browser, including the shell's h2 */
h2 { color: blue; }
* { box-sizing: border-box; } /* shell may already set this; double-applying can cause issues */
.modal-overlay { position: fixed; top: 0; left: 0; } /* generic class name leaks to all modules */

/* ✅ Only design token variables are shared globally — everything else is scoped */
:root {
  /* Shell sets these; modules read them */
  --shell-primary-color: #0070f3;
  --shell-font-family: 'SAP 72', sans-serif;
}
```

---

## 5. How SAP UI5 Runs Inside a React Shell

SAP UI5 is not React. It has its own rendering engine, its own component lifecycle, its own theming system. Module Federation doesn't care — it just treats the UI5 module as a JavaScript bundle that exports a mount function.

```typescript
// reportModule/src/bootstrap.ts (Team A — SAP UI5 module)
// Team A's module is SAP UI5 but it looks like a React component to the shell

// The trick: wrap the UI5 app in a React component that controls the mount lifecycle
import React, { useRef, useEffect } from 'react';
import { renderUi5App, destroyUi5App } from './ui5App'; // UI5 internal

export default function ReportModuleRoot({ basePath }: { basePath: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!mountRef.current) return;
    // Mount the SAP UI5 component tree into this div
    renderUi5App(mountRef.current, { basePath });
    
    // Clean up UI5 resources when the React component unmounts
    // (user navigated away from /reports)
    return () => destroyUi5App(mountRef.current!);
  }, [basePath]);
  
  // The div is the only thing React renders — UI5 owns everything inside it
  return <div ref={mountRef} id="ui5-report-root" style={{ width: '100%', height: '100%' }} />;
}

// This pattern works for ANY non-React framework:
// Vue, Angular, SAP UI5, Web Components, vanilla JS
// React owns a div; the framework owns what's inside
```

---

## 6. Preventing Global Variable Conflicts

```typescript
// ❌ Storing module state on window — any other module can read or overwrite it
window.reportState = { currentReport: null };
window._ = require('lodash'); // Two modules doing this = one overwrites the other

// ✅ Module-scoped state — no global leak

// Each module's variables are in its own closure (IIFE via bundler)
// This is automatic — you don't need to do anything special
// Each module's import of lodash is a separate instance in its bundle
// (unless you add lodash to the shared config, which you should for common libs)
const moduleState = {
  currentReport: null  // Only this module can access this
};

// If modules need to share data → use the shell event bus
// Don't share data through window
```

---

## 7. Error Isolation — One Module Crashes, Others Survive

```typescript
// shell/src/routes/ReportRoute.tsx
import React, { Suspense } from 'react';

// Custom error boundary class component (React requires class for error boundaries)
class ModuleErrorBoundary extends React.Component<
  { moduleName: string; children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error) {
    // Log to error monitoring (Sentry / Datadog)
    errorMonitor.capture(error, { module: this.props.moduleName });
  }
  
  render() {
    if (this.state.hasError) {
      // Module error shows here — shell nav bar still works
      // User can still use other modules
      return (
        <div className={styles.moduleError}>
          <p>The {this.props.moduleName} module is temporarily unavailable.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Use it for every remote module
const RemoteReportModule = React.lazy(() => import('reportModule/ReportModule'));

export function ReportRoute() {
  return (
    <ModuleErrorBoundary moduleName="Reports">
      <Suspense fallback={<ModuleLoadingSpinner />}>
        <RemoteReportModule basePath="/reports" />
      </Suspense>
    </ModuleErrorBoundary>
  );
}
// Result: if Team A's code throws an unhandled error, the shell catches it here
// Navigation bar, other modules, shell state — all unaffected
```

---

## 8. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you make sure that CSS from one micro-frontend doesn't affect another?"

**Hruday's answer:**
> "CSS Modules. Every React component in every module uses CSS Modules, which adds a unique hash suffix to every class name at build time. So Team A's `.button` becomes `.button_a4k2m` in the compiled output, and Team B's `.button` becomes `.button_x9p3q`. They can't collide because the names are different. For SAP UI5 modules, UI5 has its own Shadow DOM-like scoping mechanism for its components. The only truly global CSS we allow is design tokens — CSS custom properties on `:root` like `--shell-primary-color`. Those are intentionally shared so all modules use the same brand colors. Any module that sets raw element styles like `h2 { color: blue; }` would fail our CSS lint check in CI."

---

### Q2 — Deep Dive
**Interviewer asks:** "SAP UI5 is not React. How did you actually run it inside a React shell?"

**Hruday's answer:**
> "SAP UI5 has its own rendering engine and component lifecycle — it's completely independent of React. The trick is to wrap the entire UI5 application in a thin React component that acts as a lifecycle adapter. The React component renders a single empty `div` with a ref. In `useEffect`, it calls UI5's own render function, passing that div as the mount target. UI5 takes ownership of everything inside that div — React never touches it. On component unmount (when the user navigates away from `/reports`), the cleanup function in `useEffect` calls UI5's destroy function to unregister event listeners and clean up UI5 resources. From the shell's perspective, it just sees a React component. From UI5's perspective, it has a div in the DOM to render into. Neither knows how the other works. This same wrapper pattern works for Angular, Vue, or any other framework you need to host inside a React shell."

---

## 9. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "CSS just works" | Global CSS classes are fine | Without CSS Modules, class names collide across modules — we enforce CSS Modules in ESLint |
| "State is isolated automatically" | Assumes no state leaks | Explicitly: "No module stores anything on `window`; all cross-module state flows through the shell event bus" |
| "Non-React frameworks can't work" | Mixed framework = impossible | "Non-React frameworks mount into a div ref — React owns the div, the framework owns the inside" |
| Miss the error boundary | No failure isolation | "Each module is wrapped in an ErrorBoundary; one module crashing never crashes the shell" |

---

## 10. Hruday's Real Experience Hook

> "The CSS isolation question came up when we first integrated the SAP UI5 module. UI5 applies some global styles for its rendering engine — specifically some font-face declarations and box-sizing rules. These initially bled into the React modules. We fixed it by wrapping the UI5 mount div in a CSS containment block and auditing the UI5 config for any global style side effects. It was a good reminder that CSS is always global unless you explicitly scope it."

---

## 11. Scale Evolution

**Prototype →** Two modules with CSS Modules. Verify no class name conflicts in the DOM inspector.

**Production →** Four frameworks, CSS Modules enforced via ESLint lint-rule in all module repos. ErrorBoundary on all Federation lazy imports. Shell design tokens as the only shared CSS.

**High scale →** Shadow DOM for stronger CSS isolation (full isolation including inherited styles). Module health check: shell pings each module's CDN URL at startup and shows a degraded banner for modules that don't respond before they're lazily loaded.

---

## 12. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Legacy parts of the product may use older frameworks (jQuery, Backbone era); framework coexistence enables gradual migration | Wrapper pattern for legacy code inside modern shell |
| Swiggy / Meesho | Seller tools built on different stacks by different teams | CSS Modules enforcement in CI; ErrorBoundary per module |
| Adobe / Microsoft | Creative Cloud hosts apps built in different eras with different frameworks | Same wrapper pattern at scale; Shadow DOM for stronger isolation |
| SAP Labs | You did this — SAP UI5 + React + Next.js in one tab | Live proof: describe the UI5 wrapper, the CSS Modules enforcement, the ErrorBoundary pattern |

---

*Part 23 · Different Frameworks Coexist in One Tab · Full Stack Interview Guide · Hruday D · 2026*
