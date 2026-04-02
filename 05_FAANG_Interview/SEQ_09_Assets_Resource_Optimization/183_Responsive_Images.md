# 183. Responsive Images
**Phase:** Performance & Architecture | **Sequence:** SEQ 09 | **Company:** Adobe, Microsoft, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Responsive images ensure the browser downloads the minimum image bytes needed for the current device — not a 2000px master file for a 320px mobile screen. The HTML mechanism is `srcset` with width descriptors listing available image sizes, and `sizes` telling the browser how wide the image will render in the layout at each breakpoint. The browser multiplies the rendered CSS width by the device pixel ratio (DPR) to get required pixel count, then picks the smallest `srcset` candidate that satisfies it. On mobile 3G, this can be the difference between downloading 2MB and 80KB for the same image slot. The most common mistake I see is writing `sizes="100vw"` on everything — that tells the browser the image always fills the full screen, so it always picks the largest candidate even in a three-column grid.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

A single image source cannot be optimal for all devices. A 1440px hero image is correct for a 4K desktop; serving the same file to a 390px iPhone wastes 90% of the bytes. CSS can resize the image visually but **cannot reduce bytes downloaded** — `max-width: 100%` still transfers the full 3MB file. Responsive images exist to give the browser the information it needs to download exactly the right file before CSS is parsed.

### How It Works Internally

**`srcset` with width descriptors (`w`) — resolution switching:**
```html
<img
  srcset="image-320.webp 320w,
          image-640.webp 640w,
          image-1024.webp 1024w,
          image-1440.webp 1440w"
  sizes="(max-width: 768px) 100vw,
         (max-width: 1200px) 50vw,
         33vw"
  src="image-1024.webp"
  alt="Product photo"
  width="400"
  height="300"
/>
```

**Browser selection algorithm:**
1. Evaluate `sizes` media conditions top-to-bottom → determines the image's rendered width in CSS pixels (e.g., viewport is 1200px wide, image is in a 3-col grid → `33vw` → ~400 CSS pixels)
2. Multiply by device pixel ratio (DPR): 400px × DPR 2 = 800 required physical pixels
3. Select the smallest `srcset` candidate ≥ 800w → picks `image-1024.webp`
4. On slow connections, browser may intentionally pick a smaller candidate to prioritise speed

**Why `sizes` is evaluated before CSS:**
The browser's preload scanner fires during HTML parsing — before stylesheets are downloaded and applied. The CSSOM doesn't exist yet. The `sizes` attribute is the developer's explicit contract telling the browser what the CSS will eventually dictate. If `sizes` is wrong, the browser makes wrong download decisions that cannot be undone.

**`srcset` with pixel density descriptors (`x`) — for fixed-size elements:**
```html
<img
  srcset="logo.webp 1x, logo@2x.webp 2x, logo@3x.webp 3x"
  src="logo.webp"
  alt="Company logo"
  width="120"
  height="32"
/>
```
`x` descriptors are simpler but the browser has no concept of layout width. Use for fixed-size images: logos, avatars, icons. Use `w` descriptors for all fluid/responsive images.

**`<picture>` for art direction — compositional changes at breakpoints:**
```html
<picture>
  <!-- Mobile: portrait crop, subject fills frame -->
  <source media="(max-width: 768px)" srcset="hero-portrait-640.webp" type="image/webp" />
  <!-- Desktop: wide landscape composition -->
  <source media="(min-width: 769px)" srcset="hero-landscape-1440.webp" type="image/webp" />
  <img src="hero-landscape-1440.jpg" alt="Hero banner" width="1440" height="600" />
</picture>
```
Art direction changes the image's crop/composition at breakpoints. This is different from resolution switching — you cannot achieve art direction with `srcset` alone.

**Combining format negotiation + resolution switching:**
```html
<picture>
  <!-- AVIF — best compression, modern browsers -->
  <source
    srcset="hero-320.avif 320w, hero-640.avif 640w, hero-1024.avif 1024w"
    sizes="(max-width: 768px) 100vw, 50vw"
    type="image/avif"
  />
  <!-- WebP — broad support fallback -->
  <source
    srcset="hero-320.webp 320w, hero-640.webp 640w, hero-1024.webp 1024w"
    sizes="(max-width: 768px) 100vw, 50vw"
    type="image/webp"
  />
  <!-- JPEG — universal fallback -->
  <img src="hero-1024.jpg" alt="Hero" width="1440" height="600" loading="lazy" decoding="async" />
</picture>
```

### Architecture & Component Boundaries

```
[Image Processing Pipeline — Sharp / Cloudinary]
    → [320w] [640w] [1024w] [1440w]  ×  [.avif .webp .jpg]  =  12 files per image
         → [CDN: content-addressed filenames — hero-abc123-640.webp]
              → [<picture> with <source type="image/avif"> + <source type="image/webp"> + <img>]
                   → [Browser: evaluates sizes → calculates DPR-adjusted requirement → picks smallest viable candidate]
```

### Data Flow & State Flow

The `sizes` attribute is a **static string evaluated at parse time**. The browser cannot re-evaluate it later if layout changes (e.g., window resize after initial paint). This means `sizes` should describe the image's rendered width at the time of first paint, typically matching the CSS grid breakpoints from your design system.

For dynamic layouts where image size changes based on runtime state (e.g., expandable sidebars), JavaScript can update `img.sizes` after layout stabilises — but this is an edge case.

### Performance Implications

| Scenario | Impact |
|---|---|
| `sizes="100vw"` on all images | Browser always picks largest candidate — on desktop 33vw grid, downloads 3× too much |
| No `sizes` attribute | Browser defaults to `100vw` assumption — same as above |
| Missing `width`/`height` on `<img>` | Layout shift (CLS) — browser allocates zero space, reflows on load |
| Correct `srcset` + `sizes` + DPR | 60–90% bandwidth saving on mobile vs single-source approach |
| Wrong DPR consideration | Retina displays show blurry images if only 1× variants are provided |

### Scalability Considerations

- **< 10K users:** 3 manually generated sizes, `sizes="100vw"` acceptable for simple single-column layouts
- **100K users:** Automated 5-breakpoint variant generation in build pipeline; `sizes` computed from design token grid widths
- **10M+ users:** CDN dynamic resizing (Imgix/Cloudinary) where `srcset` URLs contain transform params (`?w=640&fmt=webp`); `sizes` generated server-side from layout metadata; automated visual regression tests to catch blurry image regressions

### Trade-offs

| `srcset` + `sizes` (resolution switching) | `<picture>` (art direction) | CSS `max-width: 100%` only |
|---|---|---|
| Bandwidth-optimal; browser picks best | Full composition control at each breakpoint | Simplest markup; zero bandwidth saving |
| Browser can go smaller on slow connections | Developer controls exactly which image shows | Only acceptable for very small images (< 5KB) |
| Correct for same image at different sizes | Required when crop changes between breakpoints | No responsive benefit |

### ⚠️ Anti-Patterns & Pitfalls

- **`sizes="100vw"` on everything** — the browser picks the largest variant for every desktop use-case; you get zero bandwidth savings on any layout where the image is smaller than full viewport width
- **Using `srcset` without `sizes`** — browser defaults to assuming `100vw`; same over-downloading problem; always pair `w` descriptors with explicit `sizes`
- **Art direction via `srcset` only** — `srcset` performs resolution switching only; if you need a portrait crop on mobile and landscape on desktop you must use `<picture>` with separate `<source media="...">` elements
- **Not preloading responsive LCP images correctly** — a `<link rel="preload">` for a responsive image must include `imagesrcset` and `imagesizes` attributes, not just `href`; otherwise the preloaded asset won't match what `<img srcset>` requests
- **Forgetting DPR in manually computed sizes** — a 300px CSS column on a DPR 3 iPhone requires a 900px physical pixel image; if you only generate up to 640px variants, retina displays show blurry images

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
The SAP BI Launchpad dashboard displayed a grid of tile thumbnails, each rendering at ~240px wide on desktop and full-width on mobile. The original implementation served a single 1200px JPEG (~350KB) to all devices. After migrating to `srcset` variants at 240/480/720px with `sizes="(max-width: 768px) calc(100vw - 32px), 240px"`, mobile users received the 240px WebP (~18KB) instead of the 1200px JPEG. Grid image payload on mobile dropped from ~4.2MB to ~216KB across 12 tiles visible above fold. LCP improved significantly for 4G mobile users who represented ~40% of internal SAP traffic.

**At FAANG scale:**
Adobe Stock search results display responsive image grids that adapt from 2 columns on mobile to 6 on desktop. Adobe's shared `<ImageCard>` component in their design system accepts `gridColumns={3}` as a prop and internally computes `sizes` as `(max-width: 768px) 100vw, (max-width: 1200px) ${100/3}vw, ${100/4}vw`. This ensures `sizes` accuracy across 50+ products using the same component. All `srcset` URLs resolve to Cloudinary transformations with content-hash cache busting.

**How it evolves with scale:**
- Small scale (< 10K users): 3 static sizes, `sizes="100vw"` close enough for simple layouts
- Medium scale (100K users): Component library computes `sizes` from layout props; 5-breakpoint variants generated in CI with Sharp
- Large scale (10M+ users): `sizes` strings generated server-side from template metadata; A/B tested quality thresholds; edge-generated variants cached permanently

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Responsive images are about making sure the browser downloads the minimum bytes needed for the current device. The mechanism is `srcset` with width descriptors and a `sizes` attribute. `srcset` gives the browser a menu of available variants; `sizes` tells it how wide the image will render in my layout at different viewport widths. The browser evaluates `sizes` before CSS is even parsed — during the preload scan — multiplies the result by the device pixel ratio, and picks the smallest srcset candidate that satisfies the requirement. The subtle bug I've seen most often is writing `sizes='100vw'` on every image. On desktop, if your image is in a three-column grid, it's actually only 33vw — writing 100vw causes the browser to download the 1440px version when it only needed the 480px version. At SAP, fixing this on our dashboard tile grid alone reduced mobile image payload by about 90%. For art direction — where the image composition actually changes at a breakpoint, not just the resolution — I use `<picture>` with separate `<source media>` elements, because `srcset` alone can't handle different crops."

### Likely Follow-up Questions
1. What's the difference between `w` and `x` descriptors in `srcset`? → `w` descriptors: layout-aware resolution switching via `sizes`; `x` descriptors: pure DPR switching for fixed-size images like logos and avatars
2. When do you use `<picture>` vs just `srcset`? → `<picture>` for art direction (different crops at breakpoints) or explicit format fallback chains; `srcset`+`sizes` for resolution switching of the same composition
3. How do you preload a responsive LCP image? → `<link rel="preload" as="image" imagesrcset="..." imagesizes="..." fetchpriority="high">` — must include `imagesrcset` and `imagesizes` to match the srcset request
4. How does the browser pick between srcset candidates? → Evaluates `sizes` to get CSS width → multiplies by DPR → picks smallest candidate ≥ requirement; may pick smaller on slow connections

### vs Alternatives

| `srcset` + `sizes` | CSS responsive only | Dynamic CDN URL params |
|---|---|---|
| Declarative, browser-controlled | Simplest; downloads largest always | Fully flexible, single source URL |
| Browser adapts to network conditions | Unacceptable for images > 5KB | Same browser selection logic applies |
| Static variants required | No image generation needed | Pay-per-transform cost model |

### How to Signal Senior Thinking
> "I treat `sizes` as a typed contract between the design system and the image component rather than something individual developers write. In the component library, I expose props like `gridColumns={3}` or `layout='full-bleed'`, and the component internally computes the correct `sizes` string from the design token grid. This way the `sizes` math is correct once, everywhere — no chance of a developer writing `100vw` in a three-column grid. That one change cuts mobile image bandwidth by up to 3× across every product using the component."

---

## 💻 5. Code Example

```typescript
// Typed responsive image component — `sizes` computed from layout props
// Prevents the `sizes="100vw"` mistake at the type level

type GridColumns = 1 | 2 | 3 | 4 | 6;

interface ResponsiveImageProps {
  src: string;           // base URL (CDN handles format via Accept header)
  alt: string;
  layout: 'full-bleed' | { grid: GridColumns } | { fixedPx: number };
  isLCP?: boolean;
  intrinsicWidth: number;   // enforced: prevents missing width/height (CLS)
  intrinsicHeight: number;
}

function computeSizes(layout: ResponsiveImageProps['layout']): string {
  if (layout === 'full-bleed') return '100vw';
  if (typeof layout === 'object' && 'grid' in layout) {
    const colVw = Math.floor(100 / layout.grid);
    return `(max-width: 768px) 100vw, ${colVw}vw`;
  }
  if (typeof layout === 'object' && 'fixedPx' in layout) {
    return `${layout.fixedPx}px`;
  }
  return '100vw';
}

const BREAKPOINTS = [320, 480, 768, 1024, 1440];

function buildSrcSet(src: string, format: 'webp' | 'avif' | 'jpg'): string {
  return BREAKPOINTS
    .map(w => `${src}?w=${w}&fmt=${format} ${w}w`)
    .join(', ');
}

export function ResponsiveImage({
  src,
  alt,
  layout,
  isLCP = false,
  intrinsicWidth,
  intrinsicHeight,
}: ResponsiveImageProps) {
  const sizes = computeSizes(layout);

  return (
    <picture>
      {/* AVIF — best compression for modern browsers */}
      <source srcSet={buildSrcSet(src, 'avif')} sizes={sizes} type="image/avif" />
      {/* WebP — broad support fallback */}
      <source srcSet={buildSrcSet(src, 'webp')} sizes={sizes} type="image/webp" />
      {/* JPEG — universal fallback */}
      <img
        src={`${src}?w=1024&fmt=jpg`}
        srcSet={buildSrcSet(src, 'jpg')}
        sizes={sizes}
        alt={alt}
        width={intrinsicWidth}        // prevents CLS — allocates space before load
        height={intrinsicHeight}
        loading={isLCP ? 'eager' : 'lazy'}
        decoding={isLCP ? 'sync' : 'async'}
        fetchPriority={isLCP ? 'high' : 'auto'}
        style={{ width: '100%', height: 'auto' }}
      />
    </picture>
  );
}

// Usage — sizes computed automatically, no manual strings:
// <ResponsiveImage src="/product" layout={{ grid: 3 }} alt="Product" intrinsicWidth={400} intrinsicHeight={300} />
// <ResponsiveImage src="/hero" layout="full-bleed" alt="Hero" intrinsicWidth={1440} intrinsicHeight={600} isLCP />
```

**Interview vs Production difference:**
In an interview, demonstrate `srcset` + `sizes` and explain how the browser selection algorithm works — that's what's being tested. In production, add: typed layout props so developers can't write wrong `sizes` strings, CDN transform URL abstraction behind a helper function, automated visual regression tests to catch blurry image variants, and content-hash filenames for immutable CDN caching.

---

## 🧠 6. Memory Aid

**Mental Model:** `srcset` = the menu of available dishes. `sizes` = "I'll have the medium-sized one, please." The browser picks the cheapest dish on the menu that satisfies your order — accounting for DPR delivery demand.

**If you go blank:** "The browser needs two things from me: a list of available image variants (`srcset`) and the width the image will render at in my layout (`sizes`). Without `sizes`, it assumes full viewport width and always picks the biggest. I always match `sizes` to my actual grid column width."

**Mnemonic:** **srcset = Supply** the options. **sizes = Signal** the layout width. Supply without Signal = always downloads the biggest.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: On mobile 3G, a 2000px image at a 400px slot takes ~5s; the 400px version takes ~0.5s — 10× perceived speed difference
→ Performance: Responsive images are the most reliable fix for mobile LCP — routinely the difference between LCP passing and failing the "Good" threshold
→ Business: Core Web Vitals are Google ranking signals; mobile LCP improvements directly increase mobile organic search traffic

**How it works (3 sentences):**
The `srcset` attribute lists available image variants with their intrinsic widths in CSS pixels; the `sizes` attribute tells the browser how wide the image will render at each viewport breakpoint, expressed as the same set of media conditions the CSS would use. The browser's preload scanner evaluates `sizes` before CSS is parsed, multiplies the resulting CSS width by the device's pixel ratio, and selects the smallest `srcset` candidate that meets the required physical pixel resolution. On slow connections, the browser may intentionally choose a smaller variant than the calculation suggests to prioritise time-to-first-byte over pixel density.

**Company relevance:**
- Microsoft: SharePoint and Teams have image-heavy document previews and user photos in meeting grids — responsive images directly impact perceived load speed on mobile clients
- Adobe: Adobe Stock, Behance, and Creative Cloud have the highest image density of any web products imaginable — responsive images are a core architectural primitive, not an enhancement
- Salesforce: Mobile-first users accessing CRM on phones — record page attachments and Marketing Cloud creative assets must load quickly on mobile data connections
- Cisco: Network topology diagrams and device photography in product pages; more relevant in Webex and consumer-facing Cisco products than internal dashboard tools

---
**✅ Topic 183/486 complete.**
**→ Continuing to Topic 184: Font Optimization**
