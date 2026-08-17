# Image Optimization — AVIF, WebP, Responsive, Lazy Loading
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Images are the #1 cause of poor LCP** on most real-world pages; image optimization is the single highest-ROI performance investment because the gains are large (50-80% file size reduction) and the changes don't break functionality
- **Format hierarchy**: AVIF (best compression, 50%+ smaller than JPEG, supported Chrome/Firefox/Safari) → WebP (30-40% smaller than JPEG, older caniuse support) → JPEG (photos, best compatibility) → PNG (transparency, diagrams); use `<picture>` element with multiple `<source>` for progressive enhancement
- **Responsive images**: every image should have a `srcset` attribute listing available sizes and a `sizes` attribute declaring how wide the image will be at different viewport widths; the browser picks the best-fitting source automatically; serving a 1440px image on a 375px mobile screen sends 15x more bytes than needed
- **Lazy loading**: `loading="lazy"` on every image that is NOT in the initial viewport; the LCP image (hero, first product card) must have `loading="eager"` and `fetchpriority="high"` — never lazy-load the LCP element
- **CLS prevention**: ALL `<img>` elements must have explicit `width` and `height` attributes; the browser uses these to reserve space before the image loads, preventing layout shift; alternatively, use `aspect-ratio` in CSS; the most common CLS cause in product catalogs is image cards without dimensions
- ✅ **Hruday's anchor**: SAP Labs — product catalog image optimization contributed ~15 Lighthouse points; switched all product card images to WebP with JPEG fallback in `<picture>` elements; added explicit `width`/`height` to all `<img>` tags in the design system card component (fixing CLS from 0.34 → 0.04); hero image preload + WebP conversion dropped LCP from 4.2s → 1.3s on catalog page

---

## 1. One-Line Definition
Image optimization is the practice of delivering the smallest possible image file that looks correct on the user's device — using modern formats (AVIF, WebP), responsive sizing (`srcset`), deferred loading for off-screen images (`loading="lazy"`), and correct dimension declarations to prevent layout shifts.

---

## 2. The Problem It Solves

Images are typically 60-80% of a webpage's total download size. Most unoptimized pages send the same 2MB JPEG hero image to a phone with a 375px screen as they do to a 4K monitor. The phone user downloads 14x more image data than they can display — and LCP suffers for it.

Three distinct problems:

**Too large (bytes)**: PNG instead of WebP saves 30-50% with identical visual quality. AVIF instead of JPEG saves 50-60%. A 450KB product hero image is 90KB as AVIF. That 360KB difference is about 3 seconds on a 3G connection (typical in India, Indonesia, Brazil — large e-commerce markets).

**Too large (dimensions)**: A 2400×1600 original image served on a 400px-wide mobile product card. The browser downloads all 2400 pixels and discards 83% of them. `srcset` solves this — provide a 400w version for mobile, an 800w version for tablets, the original for desktops.

**Wrong loading order**: The LCP hero image hidden behind render-blocking CSS and not preloaded. Images below the fold eagerly downloaded even though the user may never scroll there. `loading="lazy"` and `fetchpriority="high"` fix the priority ordering.

**No reserved dimensions**: Dynamic image grids without `width`/`height` attributes. As images load asynchronously, previously-rendered text jumps down. CLS score becomes 0.3+ ("Poor"). Adding `width="400" height="300"` to every `<img>` tag reserves the exact space before load, eliminating the shift.

At SAP, the product catalog had all four of these problems simultaneously. Solving them contributed 15 Lighthouse points and (with the hero image preload) moved us from 60 to 95+.

---

## 3. How It Works Internally

### How the Browser Picks a Source

```
<picture> element — format negotiation:

  <picture>
    <source srcset="/hero.avif" type="image/avif">   ← Browser checks AVIF support first
    <source srcset="/hero.webp" type="image/webp">   ← Falls back to WebP if no AVIF
    <img src="/hero.jpg" alt="Hero" width="1440" height="800">  ← Final fallback: JPEG
  </picture>

Browser algorithm:
1. Does the browser support AVIF? → Yes (Chrome 85+, Firefox 93+, Safari 16+) → Use hero.avif
2. Does it support WebP? → Yes (almost all modern browsers) → Use hero.webp
3. Fallback: use hero.jpg (always supported)

Result: modern browsers get AVIF (smallest), older browsers get JPEG (compatible)
No JS required — pure HTML capability negotiation
```

### How `srcset` + `sizes` Works

```
<img
  srcset="product-400.webp 400w,
          product-800.webp 800w,
          product-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw,    ← On mobile: image fills 100% viewport width
         (max-width: 1200px) 50vw,    ← On tablet: image fills 50% viewport width  
         400px"                       ← On desktop: image is always 400px wide
  src="product-800.webp"
  alt="Product"
  width="800" height="600"
>

Browser algorithm when viewport = 375px (mobile):
1. Evaluate sizes: viewport 375px ≤ 768px → image will be 100vw = 375px
2. Look in srcset for the best fit for 375px:
   - 400w: 400px ≥ 375px ✅ (close enough, minimal wasted pixels)
   - 800w: 800px ≥ 375px ✅ (would work but 2x bigger than needed)
3. Browser picks 400w version → downloads 400px wide product-400.webp
   Saves: downloading 800px image (4x more pixels = much larger file) instead

Browser algorithm when viewport = 1440px (desktop):
1. sizes: all rules fail → use default 400px
2. srcset: best fit for 400px = 400w version
3. Downloads product-400.webp regardless of screen size
```

### LCP Image Priority

```
Page load waterfall:

  ← Network request starts →
  HTML arrives
  │
  ├── Browser starts parsing HTML
  │
  ├── Discovers <link rel="stylesheet"> → BLOCKS painting until CSS downloads
  │   CSS downloading...
  │
  │   WITHOUT preload: hero image discovery happens AFTER CSS finishes
  │   ┌──────────────────────────────────────────────────────────────┐
  │   │ CSS (blocking): ████████████████████ 800ms wait             │
  │   │                                      └→ img discovered       │
  │   │ Hero img download:                       ████████ 600ms      │
  │   │ LCP: CSS + image = 1400ms total                              │
  │   └──────────────────────────────────────────────────────────────┘
  │
  │   WITH preload: hero image started IMMEDIATELY via <link rel="preload">
  │   ┌──────────────────────────────────────────────────────────────┐
  │   │ CSS (blocking):  ████████████████████ 800ms wait             │
  │   │ Hero img preload:████████ 600ms (runs PARALLEL to CSS)       │
  │   │ LCP: max(CSS, img) = 800ms — the CSS becomes the bottleneck  │
  │   └──────────────────────────────────────────────────────────────┘
  │
  Result: preload saves 600ms = the entire image download time
```

---

## 4. The Code

### Wrong Way — Every Image Antipattern

```html
<!-- ❌ WRONG — Complete image antipattern showcase: -->

<!-- ❌ No explicit width/height: browser can't reserve space → CLS when image loads -->
<img src="/product.jpg" alt="Product" />

<!-- ❌ Hero image not preloaded: browser discovers it only after CSS finishes → slow LCP -->
<head>
  <link rel="stylesheet" href="/styles.css" />
  <!-- No <link rel="preload"> for hero image -->
</head>

<!-- ❌ Hero image with loading="lazy": browser DELAYS loading the most important image! -->
<img src="/hero.jpg" alt="Hero" loading="lazy" />

<!-- ❌ Same large image for all viewports: mobile user downloads 2400px image shown at 400px -->
<img src="/product-original-2400.jpg" alt="Product" width="400" height="300" />

<!-- ❌ PNG format for a photograph: PNG is lossless, photos are 5-10x larger than JPEG/WebP -->
<img src="/product-photo.png" alt="Product photo" />

<!-- ❌ Every image eager-loaded: ALL images download immediately, competing with LCP image -->
<img src="/below-fold-1.jpg" alt="Below fold" />
<img src="/below-fold-2.jpg" alt="Below fold" />
<img src="/below-fold-3.jpg" alt="Below fold" />
```

### Right Way — Fully Optimized Images

```html
<!-- ✅ RIGHT — All image optimizations applied: -->

<!-- ✅ In <head>: preload the LCP image with high priority -->
<!-- Browser fetches this IMMEDIATELY, parallel to CSS download -->
<link
  rel="preload"
  href="/hero-1440.avif"
  as="image"
  type="image/avif"
  imagesrcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1440.avif 1440w"
  imagesizes="100vw"
  fetchpriority="high"
/>

<!-- ✅ Hero image: explicit dimensions + fetchpriority="high" + eager loading -->
<!-- fetchpriority="high": browser uses this image's fetch as high priority in the request queue -->
<!-- loading="eager": explicit (it's the default, but documents intent) -->
<!-- width + height: browser reserves space → zero CLS -->
<picture>
  <!-- ✅ AVIF first: 50-60% smaller than JPEG for photos -->
  <source
    type="image/avif"
    srcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1440.avif 1440w"
    sizes="100vw"
  />
  <!-- ✅ WebP fallback: 30-40% smaller than JPEG, wide support -->
  <source
    type="image/webp"
    srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1440.webp 1440w"
    sizes="100vw"
  />
  <!-- ✅ JPEG final fallback: universal support -->
  <img
    src="/hero-1440.jpg"
    alt="Product catalog hero"
    width="1440"
    height="800"
    fetchpriority="high"
    loading="eager"
    decoding="async"
  />
</picture>

<!-- ✅ Below-fold product cards: lazy loading + explicit dimensions + responsive srcset -->
<article class="product-card">
  <picture>
    <source
      type="image/avif"
      srcset="/product-200.avif 200w, /product-400.avif 400w"
      sizes="(max-width: 768px) calc(50vw - 16px), 200px"
    />
    <source
      type="image/webp"
      srcset="/product-200.webp 200w, /product-400.webp 400w"
      sizes="(max-width: 768px) calc(50vw - 16px), 200px"
    />
    <img
      src="/product-400.jpg"
      alt="Blue running shoes"
      width="400"
      height="400"
      loading="lazy"       <!-- ✅ Lazy: only load when near viewport, saves bandwidth -->
      decoding="async"     <!-- ✅ Decode off main thread: doesn't block rendering -->
    />
  </picture>
  <h3>Running Shoes</h3>
  <p>₹2,999</p>
</article>
```

### React Components — Next.js Image and Custom Implementations

```tsx
// ✅ RIGHT — Next.js <Image> component: optimal images with zero configuration

import Image from 'next/image';

// Next.js Image handles automatically:
// - AVIF/WebP format selection based on browser support
// - Automatic srcset generation for responsive images
// - Explicit dimensions → CLS prevention
// - loading="lazy" by default (except priority images)
// - CDN delivery via Next.js image optimization API

const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
  <article>
    {/* ✅ Below-fold product images: lazy by default in Next.js Image */}
    <Image
      src={product.imageUrl}
      alt={product.name}
      width={400}
      height={400}
      // ✅ sizes tells Next.js which widths to generate in the srcset
      sizes="(max-width: 768px) calc(50vw - 16px), 400px"
      style={{ objectFit: 'cover' }}      // ← CSS, not width/height override
    />
    <h3>{product.name}</h3>
  </article>
);

const HeroSection: React.FC = () => (
  <section>
    {/* ✅ Hero / LCP image: priority=true adds preload + fetchpriority="high" + eager */}
    <Image
      src="/hero.jpg"
      alt="Product catalog"
      width={1440}
      height={800}
      priority={true}    // ← Critical: tells Next.js this is the LCP image
      sizes="100vw"
      style={{ width: '100%', height: 'auto' }}
    />
  </section>
);
```

```tsx
// ✅ RIGHT — Custom React image component (when NOT using Next.js)

interface OptimizedImageProps {
  src: string;          // Base URL without extension: "/images/product"
  alt: string;
  width: number;
  height: number;
  sizes?: string;       // Responsive sizes hint for browser
  priority?: boolean;   // If true: eager + fetchpriority="high" (LCP images)
  className?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  sizes = '100vw',
  priority = false,
  className,
}) => {
  // ✅ Generate srcset for multiple widths
  const widths = [400, 800, 1200, 1600].filter(w => w <= width * 2);
  
  const avifSrcset = widths
    .map(w => `${src}-${w}.avif ${w}w`)
    .join(', ');
  
  const webpSrcset = widths
    .map(w => `${src}-${w}.webp ${w}w`)
    .join(', ');

  return (
    <picture>
      <source type="image/avif" srcSet={avifSrcset} sizes={sizes} />
      <source type="image/webp" srcSet={webpSrcset} sizes={sizes} />
      <img
        src={`${src}-${width}.jpg`}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={className}
      />
    </picture>
  );
};

// Usage in hero:
// <OptimizedImage src="/images/hero" alt="Hero" width={1440} height={800} priority sizes="100vw" />

// Usage in product card:
// <OptimizedImage src="/images/product-123" alt="Product" width={400} height={400}
//   sizes="(max-width: 768px) calc(50vw - 16px), 400px" />
```

### CSS Aspect-Ratio for CLS Prevention Without Fixed Dimensions

```css
/* ✅ RIGHT — When you don't know the exact dimensions at build time */
/* Use aspect-ratio to reserve correct space for dynamic content */

.product-card-image {
  /* Reserve 1:1 ratio: browser allocates equivalent space before image loads */
  aspect-ratio: 1 / 1;
  width: 100%;
  /* object-fit ensures the image fills the reserved space correctly */
  object-fit: cover;
  /* Prevents content reflow as long as the placeholder has the same aspect ratio */
  background-color: #f0f0f0; /* Subtle placeholder color while loading */
}

/* For hero image with 16:9 ratio */
.hero-image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
}

.hero-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you use AVIF vs WebP vs JPEG?"

**Hruday's answer:**
> The decision is a trade-off between file size, browser support, and encoding time.
>
> AVIF is the best-compression format for photographs and graphics with gradients. It typically produces files 50-60% smaller than JPEG at equivalent visual quality, and 20-30% smaller than WebP. Its support is now mainstream — Chrome 85+, Firefox 93+, Safari 16+ — so it covers the vast majority of users. The downside: encoding is slow (server-side generation for on-the-fly transformations is CPU-intensive) and some very old browsers don't support it.
>
> WebP is the safe choice for broad compatibility with good compression. It's 30-40% smaller than JPEG and is supported by every modern browser including older Chrome, Firefox, and Edge versions. For a production catalog today, WebP is the practical default with AVIF as an enhancement via `<picture>` source stacking.
>
> JPEG stays as the universal fallback for browsers that support neither. It's also still the right choice for very complex, high-frequency photographs where WebP encoding artifacts might be visible to a trained eye — though this is uncommon in practice.
>
> PNG is for images that need lossless quality or transparency: logos, icons, diagrams, screenshots. Never use PNG for product photography — the files are enormous.
>
> My implementation pattern: serve AVIF first, WebP second, JPEG as fallback, all in a `<picture>` element. The browser picks the best format it supports. CDN image transformation services (Cloudinary, imgix) handle on-the-fly format conversion so you upload one JPEG and they serve AVIF or WebP based on the `Accept` header automatically.

---

### Q2 — Experience Deep Dive
**Interviewer asks:** "Tell me about an image optimization you implemented that made a measurable difference."

**Hruday's answer:**
> The SAP product catalog image optimization was one of the highest-impact performance changes I've made. The catalog page had three image problems.
>
> First, the hero image was a 450KB JPEG served to all users regardless of screen size. On mobile, this was displaying at 375px wide but downloading 1440px of image data — about 15x more pixels than needed. The fix was converting to AVIF (reduced to 90KB) and adding srcset for responsive sizing: a 400px AVIF for mobile, an 800px version for tablet, the full 1440px for desktop. Total: 450KB JPEG became 90KB AVIF on desktop, ~25KB on mobile.
>
> Second, none of the product card images had explicit `width` and `height` attributes. The product grid loaded 24 cards simultaneously, and as each image loaded, the card below it shifted down. CLS was 0.34 — in the "Poor" range. The fix was adding `width="400" height="400"` to every `<img>` tag in the product card component. The browser then reserved a 400×400 square for each card before any image loaded. CLS dropped to 0.04 immediately.
>
> Third, the hero image wasn't preloaded. It was discovered only after render-blocking CSS finished. Adding `<link rel="preload" fetchpriority="high">` in the `<head>` made the hero download start immediately on page load, in parallel with CSS. This alone saved about 800ms of LCP time.
>
> Combined result: LCP 4.2s → 1.3s. Lighthouse score contribution from image changes: about 15 points of the 60→95 improvement.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Should you always lazy-load images? What are the exceptions?"

**Hruday's answer:**
> Lazy loading should be the default for any image not in the initial viewport — but the most common mistake I see is lazy-loading the LCP image.
>
> The LCP image — typically the hero image, the first product in a catalog grid, the avatar in a profile page — MUST be loaded as early as possible. Adding `loading="lazy"` to it tells the browser to delay the download until the element is near the viewport, which would HURT LCP because the element IS in the viewport from the start. The LCP image should have `loading="eager"` (or just omit the attribute, since eager is the default) plus `fetchpriority="high"` to signal it's the most important resource on the page.
>
> In a product grid that has 3 rows visible above the fold, the first row's images should be eager (they're the LCP candidates), the second row can be lazy, and everything below should be lazy.
>
> Another exception: images in a `<picture>` inside a carousel. If the carousel auto-advances, the next slide's image should be loaded proactively, not lazily — otherwise the slide transition shows a blank space while the image downloads.
>
> A third nuance: for very fast connections (like Fiber), lazy loading adds latency for images just below the fold because the browser waits to start the download. This is a minor issue on fast connections but meaningful on 3G where you actually WANT to defer below-fold images. Lazy loading is a clear win for mobile/slow networks and neutral-to-slightly-negative for fast desktop connections.

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the image delivery system for a high-traffic e-commerce platform with user-uploaded product photos."

**Hruday's answer:**
> I'd design this with four layers.
>
> Upload processing: when a seller uploads a product image, a backend worker (triggered via Kafka event) generates multiple sizes: 200×200, 400×400, 800×800, and 1600×1600. For each size, it generates AVIF, WebP, and JPEG formats. These get stored in S3 or Azure Blob under a structured path: `/products/{product-id}/{size}/{format}.{ext}`. This gives us 12 files per uploaded image but keeps serving simple.
>
> CDN delivery: all image files are served via a CDN (CloudFront, Akamai). The CDN edge caches images globally. First request to an edge node fetches from S3 origin; subsequent requests from the same region serve from edge cache (sub-millisecond). Cache TTL is long (1 year) because image filenames include a content hash — if the seller updates their photo, it's a new filename, not an invalidation.
>
> HTML serving: the frontend template generates correct `<picture>` elements with `srcset` for all available sizes and formats. The browser negotiates AVIF/WebP vs JPEG based on the `Accept` header. Responsive `sizes` attribute tells the browser the correct display width at each breakpoint.
>
> Alternative for smaller teams: use a CDN image transformation service (Cloudinary, imgix, or Cloudflare Images). Upload the original once; the CDN handles all format conversion and resizing via URL parameters (`/image.jpg?w=400&fmt=avif`). The service reads the `Accept` header and returns the best format automatically. This eliminates the backend worker entirely at the cost of per-transformation CDN pricing.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "WebP is always best" | "Just convert everything to WebP for best compression" | AVIF is significantly better than WebP for most photographic content — typically 20-30% smaller at same quality; WebP was the best option 2018-2022 but AVIF has broad browser support now (Chrome 85+ / 2020, Firefox 93+ / 2021, Safari 16+ / 2022 — covers 96%+ of users); the right strategy is AVIF with WebP fallback in `<picture>` elements; serving WebP when AVIF is available leaves compression savings on the table; always stack AVIF → WebP → JPEG |
| "lazy loading all images improves performance" | "`loading='lazy'` on all images is best practice" | The LCP image is often IN the viewport and MUST be eagerly loaded; `loading="lazy"` on the hero image delays the browser from downloading it until it's "near viewport" — but since it IS in the viewport from the start, the browser behaviour is inconsistent across implementations and can significantly hurt LCP; the production rule: identify your LCP element, give it `fetchpriority="high"` and `loading="eager"` (or omit loading attribute); lazy-load everything else; never guess — validate with Chrome DevTools' LCP indicator in the Performance tab |
| "Image dimensions prevent layout shift" | "Set width and height in CSS to prevent CLS" | CSS width/height (or max-width: 100%) does NOT reserve aspect-ratio-correct space for images; an `<img style="width:100%; height:auto">` without HTML attributes still causes CLS because the browser doesn't know the height until the image loads; the fix is EITHER HTML attributes (`width="400" height="300"`) which let the browser compute the aspect ratio, OR CSS `aspect-ratio: 4/3` on the img element; the HTML attribute approach is preferred because it works without CSS loading and doesn't require knowing the exact display size — just the source image's aspect ratio |

---

## 7. Hruday's Real Experience Hook
> "The CLS fix from adding `width` and `height` attributes was remarkable for how simple it was and how visible the improvement was. Before the fix, you could literally watch the product catalog page load and see all the product names jump down as images loaded in from async requests. After the fix, the entire grid layout was stable from the first render — every card had the correct reserved space, and images appeared in place without any movement.
>
> The reason we hadn't done this earlier was that the card component was in a shared design system library maintained by a different team. The assumption was that image sizes would vary — which is true — but the card component always displayed images at a fixed aspect ratio (1:1). Adding `aspect-ratio: 1` in the card CSS and `width="400" height="400"` to the `<img>` tag was a two-line change. CLS on the product catalog page went from 0.34 (Poor) to 0.04 (Good) instantly.
>
> This is a pattern I've seen repeatedly: high-impact performance fixes are often structurally simple. The difficulty is finding them — not implementing them. The `<picture>` element with multiple sources looks verbose but is mechanical to write once you know the pattern."

---

## 8. Scale Evolution

**Small site →** Convert hero + top images to WebP manually; add explicit `width`/`height` to all `<img>` tags; use `loading="lazy"` on below-fold images; use `fetchpriority="high"` on hero.

**Medium site →** CDN image transformation (Cloudinary free tier / Cloudflare Images) for automatic AVIF/WebP serving; responsive srcset via CDN URL parameters; automated alt-text checking in CI (accessibility + SEO); Next.js `<Image>` component if using Next.js.

**Large e-commerce platform (SAP/Swiggy scale) →** Upload processing pipeline generating all sizes/formats at upload time; CDN delivery with long TTL + content-hash filenames; design system `<OptimizedImage>` component enforces width/height/srcset at the component boundary; Lighthouse CI budget for CLS < 0.05 and image transfer size per route; real-user monitoring tracking LCP per page type (PLP, PDP, homepage) separately.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction history page with merchant logos and bank icons; payment portal LCP is directly correlated with checkout initiation rate; India mobile audience on variable 4G/3G connections makes image byte savings critical; brand trust requires high-quality images that load fast | LCP hero image optimization; responsive images for Indian mobile audience; CDN delivery strategy |
| Swiggy / Meesho | Food photography is the core conversion element — images must look good AND load fast; product catalog with thousands of images from seller-uploaded photos; mobile-first with large portion of users on midrange Android devices; AVIF/WebP adoption directly reduces data costs for users | User-generated image pipeline design; responsive images at catalog scale; seller photo processing system |
| Adobe / Microsoft | Adobe's Creative Cloud portfolio pages showcase high-res visual content; Teams uses avatar images at large scale; Microsoft 365 deals with user profile images + content thumbnails; both companies have worked on image optimization at CDN scale | CDN image optimization strategy; format negotiation; large-scale image processing pipeline |
| SAP Labs | Direct experience: AVIF/WebP for product catalog; CLS fix from 0.34 to 0.04 by adding explicit dimensions to card component; hero image preload reducing LCP from 4.2s to 1.3s; ~15 Lighthouse points from image changes; `<picture>` element pattern standardized in design system | Specific CLS + LCP improvements; design system integration; quantified results (0.34 → 0.04 CLS) |

---

## 10. Related Topics — What to Study Next

- **Topic 234 — Core Web Vitals** — understanding WHY image optimization matters; LCP is the loading metric that images most directly affect; CLS is the visual stability metric that unoptimized images most commonly break; this topic gives the measurement framework for validating image optimization impact
- **Topic 238 — Lighthouse CI Pipeline** — how to automate image optimization compliance checking in CI; `largest-contentful-paint` budget assertions catch slow hero images; `uses-optimized-images`, `uses-webp-images`, and `uses-responsive-images` Lighthouse audits can be run automatically on every PR
- **Topic 235 — Code Splitting and Lazy Loading** — the JavaScript equivalent of image lazy loading; just as images below the fold are deferred, JavaScript for below-fold features is deferred; both techniques work on the same principle: only download what you immediately need
- **Topic 241 — Virtual Scrolling** — for infinite scroll product lists with hundreds of product images; virtual scrolling and image lazy loading work together: virtual scrolling ensures only visible DOM nodes exist, and `loading="lazy"` on their images ensures images outside the viewport don't download even when nodes are rendered

---

*Part 14 · Image Optimization · Full Stack Interview Guide · Hruday D · 2026*
