# 469 – Code Splitting — React.lazy, dynamic()

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
**Code splitting** breaks the bundle into smaller chunks loaded on demand. **React.lazy()** + **Suspense** for component-level splitting. **Next.js dynamic()** adds SSR options. **Route-based splitting** (default in Next.js). Split heavy components, modals, charts, editors — anything not immediately visible.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── React.lazy + Suspense ────
import { lazy, Suspense } from 'react';

// Lazy load heavy component
const HeavyChart = lazy(() => import('./HeavyChart'));
const MarkdownEditor = lazy(() => import('./MarkdownEditor'));
const PDFViewer = lazy(() => import('./PDFViewer'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      
      {showChart && (
        <Suspense fallback={<Spinner />}>
          <HeavyChart data={data} /> {/* loads chunk on demand */}
        </Suspense>
      )}
    </div>
  );
}

// ──── Named exports with lazy ────
// React.lazy only supports default exports
// Workaround for named exports:
const MyComponent = lazy(() =>
  import('./MyModule').then(module => ({ default: module.MyComponent }))
);

// ──── Next.js dynamic() ────
import dynamic from 'next/dynamic';

// With loading state
const DynamicChart = dynamic(() => import('./Chart'), {
  loading: () => <Spinner />,
});

// Disable SSR (browser-only component)
const MapView = dynamic(() => import('./MapView'), {
  ssr: false, // only load on client (e.g., uses window)
  loading: () => <MapSkeleton />,
});

// Named export
const SpecificComponent = dynamic(
  () => import('./module').then(mod => mod.SpecificComponent),
);

// ──── ROUTE-BASED SPLITTING (automatic in Next.js) ────
// Each page.tsx is automatically a separate chunk
// app/dashboard/page.tsx → dashboard chunk
// app/settings/page.tsx  → settings chunk
// Navigation: only loads chunk for target route

// ──── PRELOADING ────
// Preload component before user needs it
const HeavyModal = lazy(() => import('./HeavyModal'));

function App() {
  // Preload on hover
  const handleMouseEnter = () => {
    import('./HeavyModal'); // starts loading the chunk
  };
  
  return (
    <button onMouseEnter={handleMouseEnter} onClick={() => setShowModal(true)}>
      Open Settings
    </button>
  );
}

// ──── PATTERN: Split by feature ────
const AdminPanel = lazy(() => import('./admin/AdminPanel'));
const UserSettings = lazy(() => import('./settings/UserSettings'));
const Analytics = lazy(() => import('./analytics/AnalyticsDashboard'));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/settings" element={<UserSettings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}

// ──── WEBPACK MAGIC COMMENTS ────
const MyComponent = lazy(() =>
  import(/* webpackChunkName: "my-feature" */ './MyFeature')
);
// Creates my-feature.[hash].js chunk

const PrefetchedComponent = lazy(() =>
  import(/* webpackPrefetch: true */ './PrefetchedFeature')
);
// Adds <link rel="prefetch"> — loads during browser idle

const PreloadedComponent = lazy(() =>
  import(/* webpackPreload: true */ './PreloadedFeature')
);
// Adds <link rel="preload"> — loads in parallel with current chunk
```

### What to Split
| Split Target | Why | How |
|---|---|---|
| Routes/Pages | Automatic in Next.js | File-based |
| Heavy components | Chart, editor, map | React.lazy/dynamic |
| Modals/dialogs | Not immediately visible | lazy + user interaction |
| Admin features | Most users don't need | lazy + route |
| Third-party libs | Large bundle impact | dynamic import |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Code splitting: React.lazy() + Suspense for component-level, dynamic() in Next.js with ssr:false for browser-only. Route-based splitting is automatic. Preload on hover with import(). webpackPrefetch loads during idle. Split: modals, charts, admin panels, heavy libs."*

## 4. 🧠 MEMORY AID
**"lazy(() => import('./X')) + Suspense. Next.js: dynamic(import, { ssr: false }). Routes auto-split. Preload on hover. webpackPrefetch for idle load."**
