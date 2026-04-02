# PART 8️⃣ — Assets & Resource Optimization

## 📖 Overview

Assets (images, fonts, CSS, JS) often account for **70-90% of page weight**. Optimizing them is critical for performance. This section covers modern image formats, font loading strategies, CSS/JS optimization, and third-party resource management.

## 🎯 Why This Matters

**Business Impact**:
- **Netflix**: Switching to WebP saved 30% bandwidth
- **Shopify**: Lazy loading images improved LCP by 35%
- **Medium**: Font optimization reduced CLS from 0.25 to 0.05

**Interview Reality**:
- "How do you optimize images for web?"
- "Design image delivery for an e-commerce site with 100K products."
- "How do you handle third-party scripts without blocking the page?"

---

## 📚 Module Breakdown

### Module 8.1 — Media & Fonts
**Focus**: Images, video, fonts optimization

**Topics Covered**:

#### **Image Optimization**
```
┌─────────────────────────────────────────────────────────────┐
│                  IMAGE OPTIMIZATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. FORMAT SELECTION                                        │
│     • JPEG: Photos (lossy compression)                      │
│     • PNG: Graphics, transparency (lossless)                │
│     • WebP: Modern, 25-35% smaller than JPEG                │
│     • AVIF: Newest, 50% smaller than JPEG (best)            │
│     • SVG: Icons, logos (vector, scalable)                  │
│                                                              │
│  2. COMPRESSION                                             │
│     • Lossless: No quality loss (large files)               │
│     • Lossy: Quality loss (smaller files)                   │
│     • Tools: ImageOptim, Squoosh, Sharp                     │
│                                                              │
│  3. RESPONSIVE IMAGES                                       │
│     • srcset: Multiple resolutions                          │
│     • sizes: Layout-dependent sizing                        │
│     • <picture>: Art direction, format fallback             │
│                                                              │
│  4. LAZY LOADING                                            │
│     • Native: loading="lazy"                                │
│     • Intersection Observer (custom)                        │
│     • Above-the-fold: eager load                            │
│                                                              │
│  5. CDN & CACHING                                           │
│     • Serve from CDN (closer to users)                      │
│     • Cache-Control headers                                 │
│     • Image CDNs: Cloudinary, Imgix, CloudFlare             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Modern Image Formats**
```html
<!-- Progressive Enhancement: AVIF → WebP → JPEG -->
<picture>
  <source srcset="image.avif" type="image/avif" />
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Fallback JPEG" />
</picture>

<!-- Responsive Images (srcset + sizes) -->
<img
  srcset="
    small.jpg 400w,
    medium.jpg 800w,
    large.jpg 1200w
  "
  sizes="
    (max-width: 600px) 400px,
    (max-width: 1000px) 800px,
    1200px
  "
  src="medium.jpg"
  alt="Responsive image"
/>

<!-- Lazy Loading -->
<img src="image.jpg" loading="lazy" alt="Lazy loaded" />

<!-- Priority Hint (Hero Image) -->
<img src="hero.jpg" fetchpriority="high" alt="Hero" />
```

**Image CDN with Transformations**
```javascript
// Cloudinary example
const imageUrl = cloudinary.url('sample.jpg', {
  width: 800,
  height: 600,
  crop: 'fill',
  quality: 'auto',
  format: 'auto', // Auto-select best format
  fetch_format: 'auto'
});

// Imgix example
const imgixUrl = `https://demo.imgix.net/image.jpg?w=800&h=600&fit=crop&auto=format,compress`;

// Next.js Image Component (built-in optimization)
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={800}
  height={600}
  alt="Optimized image"
  placeholder="blur" // Blur-up effect
/>
```

#### **Video Optimization**
```html
<!-- Multiple formats for compatibility -->
<video controls preload="metadata" poster="thumbnail.jpg">
  <source src="video.webm" type="video/webm" />
  <source src="video.mp4" type="video/mp4" />
</video>

<!-- Lazy load video -->
<video data-src="video.mp4" preload="none"></video>

<script>
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const video = entry.target;
      video.src = video.dataset.src;
      video.load();
      observer.unobserve(video);
    }
  });
});

document.querySelectorAll('video[data-src]').forEach(v => observer.observe(v));
</script>

<!-- Adaptive Bitrate Streaming (HLS/DASH) -->
<video id="player"></video>
<script src="hls.js"></script>
<script>
  const video = document.getElementById('player');
  const hls = new Hls();
  hls.loadSource('video.m3u8');
  hls.attachMedia(video);
</script>
```

#### **Font Optimization**
```css
/* 1. FONT-DISPLAY STRATEGY */

/* Swap: Show fallback immediately, swap when loaded */
@font-face {
  font-family: 'MyFont';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* ✅ Recommended */
}

/* Other strategies:
   - auto: Browser default (usually block)
   - block: Invisible text for 3s (FOIT - Flash of Invisible Text)
   - swap: Show fallback immediately (FOUT - Flash of Unstyled Text)
   - fallback: 100ms block, then swap
   - optional: 100ms block, then fallback forever
*/

/* 2. PRELOAD CRITICAL FONTS */
<link 
  rel="preload" 
  href="font.woff2" 
  as="font" 
  type="font/woff2" 
  crossorigin 
/>

/* 3. VARIABLE FONTS (Smaller file size) */
@font-face {
  font-family: 'Inter';
  src: url('Inter-Variable.woff2') format('woff2');
  font-weight: 100 900; /* Single file for all weights */
}

/* 4. SUBSETTING (Include only needed characters) */
/* Use tools like glyphhanger:
   npx glyphhanger --subset="*.woff2" --formats=woff2
*/

/* 5. SELF-HOSTING (Avoid Google Fonts GDPR issues) */
/* Download fonts, serve from your CDN */
```

**Font Loading Performance**
```javascript
// Detect when font loaded
document.fonts.ready.then(() => {
  console.log('All fonts loaded');
});

// Load font dynamically
const font = new FontFace('MyFont', 'url(font.woff2)');
font.load().then(() => {
  document.fonts.add(font);
  document.body.style.fontFamily = 'MyFont';
});

// React: Font loading with useEffect
import { useEffect, useState } from 'react';

function useFontLoaded(fontFamily) {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    document.fonts.ready.then(() => {
      setLoaded(true);
    });
  }, []);
  
  return loaded;
}
```

**Interview Questions**:
- "How do you optimize images for web?"
- "Explain responsive images (srcset, sizes, picture)."
- "What's the best font-display strategy?"
- "How do you prevent CLS from font loading?"

**Interview Relevance**: 🔥🔥🔥🔥🔥
Media optimization is critical for Core Web Vitals.

---

### Module 8.2 — CSS & JS Assets
**Focus**: Critical CSS, code splitting, minification

**Topics Covered**:

#### **Critical CSS**
```html
<!-- Problem: Render-blocking CSS delays FCP -->
<link rel="stylesheet" href="styles.css" />

<!-- Solution: Inline critical CSS -->
<style>
  /* Critical above-the-fold CSS (< 14KB) */
  .header { ... }
  .hero { ... }
</style>

<!-- Load full CSS asynchronously -->
<link 
  rel="preload" 
  href="styles.css" 
  as="style" 
  onload="this.rel='stylesheet'" 
/>

<!-- Automate with tools:
     - Critical: https://github.com/addyosmani/critical
     - Critters (Next.js built-in)
-->
```

**Extracting Critical CSS**
```javascript
// Using Critical library
const critical = require('critical');

critical.generate({
  inline: true,
  base: 'dist/',
  src: 'index.html',
  dest: 'index-critical.html',
  width: 1300,
  height: 900
});

// Next.js (automatic with Critters)
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true, // Inline critical CSS
  },
};
```

#### **CSS Optimization**
```css
/* 1. REMOVE UNUSED CSS */
/* Use PurgeCSS with Tailwind/Bootstrap */
// tailwind.config.js
module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}'],
};

/* 2. CSS MODULES (Scoped, tree-shakeable) */
/* styles.module.css */
.button {
  background: blue;
}

// Component
import styles from './styles.module.css';
<button className={styles.button}>Click</button>

/* 3. CSS-IN-JS OPTIMIZATION */
// Use compiled CSS-in-JS (no runtime)
// - Linaria
// - Vanilla Extract
// - Compiled (by Atlassian)

/* 4. MINIFICATION */
// Automatically done in production builds

/* 5. AVOID @import IN CSS */
/* ❌ Bad: Multiple round trips */
@import url('fonts.css');
@import url('layout.css');

/* ✅ Good: Bundle or use <link> */
<link rel="stylesheet" href="fonts.css" />
<link rel="stylesheet" href="layout.css" />
```

#### **JavaScript Optimization**
```javascript
// 1. TREE-SHAKING (Remove unused code)
// Use ES modules (not CommonJS)
import { debounce } from 'lodash-es'; // ✅
const _ = require('lodash'); // ❌

// 2. CODE SPLITTING
// Route-based (see Part 7)
const Dashboard = lazy(() => import('./Dashboard'));

// Vendor splitting
// webpack.config.js
optimization: {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
      },
    },
  },
}

// 3. MINIFICATION
// Terser (built into Webpack 5)
// Removes whitespace, shortens variable names, drops console.log

// 4. COMPRESSION
// Gzip (20-30% smaller)
// Brotli (15-25% smaller than gzip)

// 5. DIFFERENTIAL SERVING (Modern + Legacy)
// Vite example
<script type="module" src="app.js"></script> <!-- Modern browsers -->
<script nomodule src="app-legacy.js"></script> <!-- IE11 -->
```

**Interview Questions**:
- "What is critical CSS? How do you extract it?"
- "How do you remove unused CSS?"
- "Explain tree-shaking."

**Interview Relevance**: 🔥🔥🔥🔥
Critical for frontend performance optimization.

---

### Module 8.3 — Delivery & Third-Party
**Focus**: Resource hints, CDN, third-party scripts

**Topics Covered**:

#### **Resource Hints**
```html
<!-- 1. DNS-PREFETCH: Resolve DNS early -->
<link rel="dns-prefetch" href="https://api.example.com" />

<!-- 2. PRECONNECT: DNS + TCP + TLS handshake -->
<link rel="preconnect" href="https://cdn.example.com" />

<!-- 3. PREFETCH: Low priority, for future navigation -->
<link rel="prefetch" href="/next-page.js" />

<!-- 4. PRELOAD: High priority, for current page -->
<link rel="preload" href="hero.jpg" as="image" />
<link rel="preload" href="font.woff2" as="font" crossorigin />
<link rel="preload" href="critical.css" as="style" />

<!-- 5. PRERENDER: Render entire page (experimental) -->
<link rel="prerender" href="/next-page" />

<!-- When to use:
     - dns-prefetch: Third-party domains you'll connect to
     - preconnect: Critical third-party resources
     - prefetch: Next page user likely navigates to
     - preload: Critical resources for current page
-->
```

**Resource Prioritization**
```html
<!-- Priority Hints (fetchpriority) -->
<!-- High priority (LCP image) -->
<img src="hero.jpg" fetchpriority="high" />

<!-- Low priority (below-the-fold) -->
<img src="footer-logo.jpg" fetchpriority="low" />

<!-- Auto (default) -->
<img src="image.jpg" fetchpriority="auto" />
```

#### **CDN Strategies**
```
┌─────────────────────────────────────────────────────────────┐
│                      CDN STRATEGIES                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. STATIC ASSETS CDN                                       │
│     • Images, CSS, JS, fonts                                │
│     • CloudFlare, Fastly, Akamai, CloudFront                │
│     • Cache-Control: max-age=31536000 (1 year)              │
│                                                              │
│  2. EDGE CACHING (HTML)                                     │
│     • Cache HTML at edge                                    │
│     • Stale-while-revalidate                                │
│     • Vercel, Netlify, CloudFlare Workers                   │
│                                                              │
│  3. IMAGE CDN                                               │
│     • On-the-fly transformations                            │
│     • Cloudinary, Imgix, Fastly IO                          │
│     • Automatic format conversion (WebP, AVIF)              │
│                                                              │
│  4. VIDEO CDN                                               │
│     • Adaptive bitrate streaming                            │
│     • Mux, Cloudflare Stream, AWS MediaConvert              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**CDN Configuration**
```javascript
// CloudFront Cache-Control
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

// Stale-while-revalidate
res.setHeader('Cache-Control', 'max-age=60, stale-while-revalidate=86400');

// Vary header (for different versions)
res.setHeader('Vary', 'Accept-Encoding, Accept');

// CDN purge (when updating assets)
// CloudFlare API
await fetch('https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer {api_token}' },
  body: JSON.stringify({ files: ['https://example.com/app.js'] })
});
```

#### **Third-Party Script Management**
```html
<!-- Problem: Third-party scripts block page load -->

<!-- ❌ Bad: Blocking -->
<script src="https://cdn.analytics.com/analytics.js"></script>

<!-- ✅ Good: Async (doesn't block parsing) -->
<script async src="https://cdn.analytics.com/analytics.js"></script>

<!-- ✅ Good: Defer (execute after DOM ready) -->
<script defer src="https://cdn.analytics.com/analytics.js"></script>

<!-- async vs defer:
     - async: Download in parallel, execute immediately
     - defer: Download in parallel, execute after DOM ready
     
     Use async for independent scripts (analytics)
     Use defer for scripts that need DOM (widgets)
-->

<!-- Partytown: Run third-party scripts in Web Worker -->
<script type="text/partytown" src="https://analytics.com/script.js"></script>

<!-- Facade Pattern: Lazy load on interaction -->
<!-- Instead of loading YouTube embed immediately: -->
<lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>
<!-- Loads full iframe only when user clicks -->
```

**Third-Party Performance Budget**
```javascript
// Measure third-party impact
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('third-party.com')) {
      console.log(`Third-party: ${entry.duration}ms`);
    }
  }
});

observer.observe({ entryTypes: ['resource'] });

// Set budget
// webpack.config.js
performance: {
  maxAssetSize: 250000, // 250KB
  maxEntrypointSize: 400000, // 400KB
  hints: 'error', // Fail build if exceeded
}

// CSP to block unauthorized third-parties
Content-Security-Policy: script-src 'self' https://trusted-cdn.com;
```

**Interview Questions**:
- "Explain preload, prefetch, preconnect."
- "How do you optimize third-party scripts?"
- "What's the difference between async and defer?"
- "How do you set up a CDN?"

**Interview Relevance**: 🔥🔥🔥🔥
Critical for understanding page load optimization.

---

## 🎓 Study Plan

### Week 1: Media & Fonts
- **Day 1-2**: Image formats (WebP, AVIF), compression
- **Day 3-4**: Responsive images (srcset, picture)
- **Day 5-6**: Font optimization (font-display, subsetting)
- **Day 7**: Implement image/font optimizations

### Week 2: CSS & JS
- **Day 1-2**: Critical CSS extraction
- **Day 3-4**: CSS optimization (PurgeCSS, modules)
- **Day 5-6**: JS optimization (tree-shaking, minification)
- **Day 7**: Bundle analysis and optimization

### Week 3: Delivery & Third-Party
- **Day 1-2**: Resource hints (preload, prefetch, preconnect)
- **Day 3-4**: CDN setup and configuration
- **Day 5-6**: Third-party script management
- **Day 7**: Full asset optimization audit

---

## 📊 Assessment Checklist

### Module 8.1: Media & Fonts
- [ ] Can choose optimal image format
- [ ] Can implement responsive images
- [ ] Can optimize fonts (font-display, subsetting)
- [ ] Can set up image CDN

### Module 8.2: CSS & JS
- [ ] Can extract and inline critical CSS
- [ ] Can remove unused CSS
- [ ] Can optimize JS bundles
- [ ] Can implement code splitting

### Module 8.3: Delivery & Third-Party
- [ ] Can use resource hints appropriately
- [ ] Can configure CDN caching
- [ ] Can optimize third-party scripts
- [ ] Can set performance budgets

---

## 💡 Key Takeaways

```
┌─────────────────────────────────────────────────────────────┐
│            ASSET OPTIMIZATION PRIORITIES                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. IMAGES (Biggest impact)                                 │
│     • Use modern formats (WebP, AVIF)                       │
│     • Implement responsive images                           │
│     • Lazy load below-the-fold                              │
│     • Use image CDN                                         │
│                                                              │
│  2. FONTS (CLS impact)                                      │
│     • Use font-display: swap                                │
│     • Preload critical fonts                                │
│     • Use variable fonts                                    │
│     • Subset fonts                                          │
│                                                              │
│  3. CSS                                                     │
│     • Inline critical CSS                                   │
│     • Remove unused CSS                                     │
│     • Minify and compress                                   │
│                                                              │
│  4. JAVASCRIPT                                              │
│     • Code splitting                                        │
│     • Tree-shaking                                          │
│     • Defer non-critical                                    │
│                                                              │
│  5. THIRD-PARTY                                             │
│     • Async/defer scripts                                   │
│     • Use facades                                           │
│     • Set performance budgets                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Recommended Resources

### Tools
- **Squoosh**: Image compression
- **ImageOptim**: Mac image optimizer
- **PurgeCSS**: Remove unused CSS
- **webpack-bundle-analyzer**: Bundle analysis

### Documentation
- [web.dev - Images](https://web.dev/fast/#optimize-your-images)
- [MDN - Resource Hints](https://developer.mozilla.org/en-US/docs/Web/Performance/dns-prefetch)

---

## 🎬 Next Steps

**Proceed to**: [PART 9 — Caching & Offline](../PART%209️⃣%20—%20Caching%20&%20Offline/README.md)

---

**Part 8 Status**: Asset Optimization Mastery ✅
**Estimated Study Time**: 3 weeks
**Next Part**: Caching & Offline Strategies

You're now an asset optimization expert! 🖼️
