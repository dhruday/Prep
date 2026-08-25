# 442 – Asset Loading and Document Metadata APIs

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
React 19 introduces **built-in support for `<title>`, `<meta>`, `<link>`** inside components — automatically hoisted to `<head>`. **Asset preloading APIs**: `preload()`, `preinit()`, `prefetchDNS()`, `preconnect()` for fonts, scripts, stylesheets. No more `react-helmet`.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── DOCUMENT METADATA (React 19) ────
// Title, meta, link tags hoisted to <head> automatically
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title}</title>  {/* hoisted to <head> */}
      <meta name="description" content={post.excerpt} />
      <meta property="og:title" content={post.title} />
      <link rel="canonical" href={`https://blog.com/${post.slug}`} />
      
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}

// Multiple components can set metadata — React deduplicates
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <title>My Blog</title>
      <meta name="author" content="Hruday" />
      {children} {/* child <title> overrides parent */}
    </>
  );
}

// ──── ASSET PRELOADING APIs ────
import { preload, preinit, prefetchDNS, preconnect } from 'react-dom';

function App() {
  // Preload a font (hint — browser decides when to load)
  preload('/fonts/inter.woff2', { as: 'font', type: 'font/woff2' });
  
  // Preinit a stylesheet (eagerly inserted into document)
  preinit('/styles/critical.css', { as: 'style' });
  
  // Preinit a script (eagerly loaded and executed)
  preinit('/analytics.js', { as: 'script' });
  
  // DNS prefetch for external domains
  prefetchDNS('https://api.example.com');
  
  // Preconnect (DNS + TCP + TLS)
  preconnect('https://cdn.example.com');
  
  return <MainContent />;
}

// ──── STYLESHEET INTEGRATION ────
// React 19: stylesheets with precedence
function Component() {
  return (
    <>
      {/* React manages loading order based on precedence */}
      <link rel="stylesheet" href="/base.css" precedence="default" />
      <link rel="stylesheet" href="/theme.css" precedence="high" />
      
      {/* Component renders only after stylesheets load */}
      <div className="themed-content">Content</div>
    </>
  );
}

// ──── ASYNC SCRIPTS ────
// React 19: deduplicates async scripts
function Widget() {
  return (
    <>
      <script async src="/widget.js" />
      {/* Even if rendered multiple times, script loads once */}
      <div>Widget Content</div>
    </>
  );
}

// ──── BEFORE vs AFTER ────
// Before: react-helmet, next/head, manual <Helmet>
// After:  native <title>, <meta>, <link> in any component
```

### API Summary
| API | Purpose | Type |
|---|---|---|
| `<title>` | Set page title | Component tag |
| `<meta>` | Set metadata | Component tag |
| `<link>` | Stylesheets, canonical | Component tag |
| `preload()` | Hint to load resource | Imperative |
| `preinit()` | Eagerly load resource | Imperative |
| `prefetchDNS()` | DNS lookup early | Imperative |
| `preconnect()` | Full connection early | Imperative |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"React 19: title, meta, link tags in any component — auto-hoisted to head, deduplicated. preload/preinit APIs for fonts and scripts. Stylesheets with 'precedence' control loading order. Async scripts auto-deduplicated. Eliminates need for react-helmet."*

## 4. 🧠 MEMORY AID
**"React 19 metadata: <title>/<meta>/<link> anywhere → hoisted to <head>. preload (hint) vs preinit (eager). prefetchDNS → preconnect → preload → preinit."**
