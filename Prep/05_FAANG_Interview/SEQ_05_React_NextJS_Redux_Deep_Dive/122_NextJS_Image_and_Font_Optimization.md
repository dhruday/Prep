# 122. Next.js Image and Font Optimization
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Next.js provides `next/image` and `next/font` as built-in optimization primitives. `next/image` automatically handles lazy loading, modern format conversion (AVIF/WebP), responsive sizing via `srcset`, and prevents Cumulative Layout Shift (CLS) by requiring explicit `width`/`height` or `fill` — it also uses an image optimization API endpoint to resize and transcode images on demand, with a persistent cache. `next/font` loads fonts at build time, generates optimized CSS with font-display settings, injects them as CSS variables, and ensures zero Cumulative Layout Shift from font swaps — all fonts are served from the same origin (no external Google Fonts requests at runtime), eliminating the extra DNS lookup and render-blocking behavior. Together, these two components address the most common sources of poor Core Web Vitals: LCP (image load time) and CLS (layout shifts from images and fonts).

---

## 🔍 2. Deep Dive — Senior/Staff Level

### next/image — The Optimization Pipeline

```
Request for <Image src="/hero.jpg" width={800} height={400} />
  ↓
Next.js image optimization endpoint: /_next/image?url=/hero.jpg&w=800&q=75
  ↓
Server: check Accept header → supports AVIF? → serve AVIF
                            → supports WebP? → serve WebP
                            → fallback:        serve JPEG
  ↓
Server: resize to requested width (w=800)
  ↓
Server: compress at requested quality (q=75)
  ↓
Write to persistent disk cache (TTL from Cache-Control of original image)
  ↓
Serve from disk cache on subsequent requests
```

### Core Props and Their Impact

```typescript
// ====== LCP Image (above-fold hero) ======
import Image from 'next/image';
import heroImg from '@/public/hero.jpg';  // static import: auto width/height + blur placeholder

export function Hero() {
  return (
    <Image
      src={heroImg}          // static import → TypeScript-checked + auto blur placeholder data
      alt="Product hero"     // REQUIRED for accessibility
      priority               // ← CRITICAL for LCP: disables lazy load, adds <link rel="preload">
      sizes="100vw"          // tells browser: image always fills viewport width
      placeholder="blur"     // static import: uses blurDataURL automatically
      quality={85}           // default: 75; increase for hero images
    />
  );
}

// ====== Below-fold image (lazy loaded) ======
export function ProductCard({ product }: { product: Product }) {
  return (
    <Image
      src={product.imageUrl}   // external URL (requires config)
      alt={product.name}
      width={400}              // layout dimensions
      height={300}
      // NO priority — lazy loads by default
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
      // ↑ sizes is CRITICAL for srcset effectiveness:
      //   mobile:  fill 100% of viewport → browser picks ~mobile-width src
      //   tablet:  fill 50% of viewport → browser picks ~tablet-width src
      //   desktop: always 400px → browser picks 400px src
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQS..."  // tiny inline base64
    />
  );
}

// ====== Fill layout (image fills parent container) ======
export function BannerImage() {
  return (
    <div style={{ position: 'relative', height: '400px' }}>
      {/* Parent MUST be position: relative/absolute/fixed */}
      <Image
        src="/banner.jpg"
        alt="Banner"
        fill              // positions absolutely, fills parent
        style={{ objectFit: 'cover' }}   // or objectFit: 'contain'
        sizes="100vw"
      />
    </div>
  );
}
```

### Configuring Remote Images (Security)

```typescript
// next.config.js — REQUIRED for external image URLs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // ✅ Recommended: remotePatterns (explicit — not wildcards)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',           // empty string = any port
        pathname: '/images/**',  // scope to known path
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',  // subdomain wildcard OK
      },
    ],
    // ❌ AVOID: domains (deprecated, less secure — no path scoping)
    // domains: ['cdn.example.com'],

    // Additional config
    formats: ['image/avif', 'image/webp'],  // default: ['image/webp']
    minimumCacheTTL: 60 * 60 * 24,          // 24h minimum cache for optimized images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],  // srcset breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

// ⚠️ Security: use remotePatterns with specific hostnames and paths
// Open hostname with /** path = SSRF risk (attacker can request any URL on that domain)
```

### `sizes` Attribute — Why It's Critical for Performance

```typescript
// Without sizes — browser assumes image fills 100vw:
// → Serves 1920px image even on mobile (massive waste)

// With correct sizes — browser calculates actual render size and picks optimal src:
<Image
  src="/product.jpg"
  width={400}
  height={400}
  sizes="
    (max-width: 640px) calc(100vw - 32px),
    (max-width: 1024px) calc(50vw - 24px),
    400px
  "
/>
// → Mobile (375px screen): serves ~343px image (375 - 32)
// → Tablet (768px screen): serves ~372px image (50% of 768 - 24)
// → Desktop: serves exactly 400px image
// Net result: up to 60% less bandwidth on mobile devices
```

### next/font — Zero-CLS Font Loading

```typescript
// app/layout.tsx — Global font setup
import { Inter, Roboto_Mono } from 'next/font/google';
import localFont from 'next/font/local';

// Google Font — downloaded at build time, self-hosted
const inter = Inter({
  subsets: ['latin'],        // only include latin characters (reduces file size)
  display: 'swap',           // font-display: swap (text visible during load)
  variable: '--font-inter',  // expose as CSS variable
  preload: true,             // default: true for primary font
  fallback: ['system-ui', 'arial'],  // fallback font stack
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'optional',  // code font: don't cause layout shift if slow
});

// Local font (custom branding font, not on Google Fonts)
const brandFont = localFont({
  src: [
    { path: './fonts/Brand-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Brand-Bold.woff2',    weight: '700', style: 'normal' },
  ],
  variable: '--font-brand',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Apply font classes to html element — makes CSS vars available everywhere
    <html
      lang="en"
      className={`${inter.variable} ${robotoMono.variable} ${brandFont.variable}`}
    >
      <body className={inter.className}>  {/* inter.className sets font-family directly */}
        {children}
      </body>
    </html>
  );
}
```

```css
/* globals.css — use CSS variables for component-level font switching */
body {
  font-family: var(--font-inter), system-ui, sans-serif;
}

code, pre {
  font-family: var(--font-roboto-mono), monospace;
}

.brand-heading {
  font-family: var(--font-brand), sans-serif;
}
```

### Why next/font Eliminates CLS

```
Traditional Google Fonts approach:
  1. HTML parsed → <link href="https://fonts.googleapis.com/...">
  2. DNS lookup for fonts.googleapis.com (extra RTT)
  3. CSS downloaded → contains reference to fonts.gstatic.com
  4. DNS lookup for fonts.gstatic.com (another RTT)
  5. Font file downloaded
  6. Font applied → layout shifts (CLS += 0.1-0.3)

next/font approach:
  BUILD TIME:
  1. next/font downloads Google Font during `next build`
  2. Generates optimized CSS with @font-face at correct paths
  3. Injects size-adjust property to make fallback font match custom font metrics
     (so when font swaps in, no layout shift — same glyph metrics)
  
  RUNTIME:
  1. Font served from same origin (/_next/static/media/)
  2. No external DNS lookups
  3. font-display: swap BUT size-adjust compensates → CLS ≈ 0
```

### Generating Blur Placeholders

```typescript
// For dynamic images from CMS/DB — generate blurDataURL server-side
import { getPlaiceholder } from 'plaiceholder';

async function ProductImages({ imageUrl }: { imageUrl: string }) {
  // Generate tiny base64 blur at build/render time
  const { base64 } = await getPlaiceholder(imageUrl, { size: 10 });

  return (
    <Image
      src={imageUrl}
      alt="Product"
      width={600}
      height={400}
      placeholder="blur"
      blurDataURL={base64}
    />
  );
}

// Or: store blurDataURL in your database/CMS alongside image URL
// Generate once at upload time, not on every page render
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the product listing page had LCP of 4.2s — the hero product image was loading as a 1920×1080 JPEG at ~450KB on mobile. Migrating to `next/image` with proper `sizes` and `priority` reduced the LCP image to ~35KB AVIF at mobile widths — LCP dropped to 1.8s. The font migration from Google Fonts link tags to `next/font` eliminated two sequential DNS lookups and reduced CLS from 0.15 to 0.0 (size-adjust made the system font fallback match Inter's metrics exactly). Total Core Web Vitals improvement on the product listing page: LCP 4.2s→1.8s, CLS 0.15→0.0.

**At FAANG scale:**
- **Microsoft:** Documentation site — `next/image` fill layout for feature screenshots with `priority` on first visible image; `next/font` using Inter with `display: 'optional'` to avoid any CLS in the critical documentation reading UI
- **Adobe:** Creative asset gallery — `sizes` attribute tuned per breakpoint, blur placeholders generated at upload time and stored in CMS, AVIF enabled for 40-60% size reduction on photographic content
- **Salesforce:** Dashboard cards with user avatars — remote patterns scoped to company CDN hostname + `/avatars/**` path; avatar images lazily loaded below fold
- **Cisco:** Network diagram documentation — custom equipment diagram font (`localFont`) for technical symbols, fallback carefully specified to prevent layout shift on diagram-heavy pages

---

## 💬 4. Interview Execution

### Sample Answer

> "`next/image` gives you three things automatically: lazy loading with intersection observer (so off-screen images don't block the page), automatic AVIF/WebP conversion and resizing via an optimization endpoint, and CLS prevention by reserving space before the image loads. The key prop I always get asked about is `priority` — add it to any image that's going to be your LCP element (typically the hero image); it disables lazy loading and injects a `<link rel="preload">` so the browser fetches it in the critical path.
>
> The `sizes` attribute is where most teams leave performance on the table. Without it, the browser assumes the image is 100vw wide and downloads a large source on mobile. With correct sizes — like `(max-width: 768px) 100vw, 400px` — the browser picks an appropriately sized source from the generated srcset, cutting mobile bandwidth by 50-60%.
>
> For fonts, `next/font` downloads the font at build time and self-hosts it. Two problems solved: no external DNS lookup to Google's servers (which can add 100-200ms on slow connections), and it uses CSS `size-adjust` to make the fallback font metrics match the intended font — so when the web font loads, there's zero layout shift even with `font-display: swap`. I expose fonts as CSS variables so any component can use them, and I apply the primary font class to the `<html>` element in the root layout."

---

## 💻 5. Code Example

```typescript
// Production-ready image component with all optimizations
// app/components/OptimizedImage.tsx
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  // Responsive config: tells Image what size to render at each breakpoint
  sizes?: string;
  width: number;
  height: number;
  className?: string;
  blurDataURL?: string;
}

export function OptimizedImage({
  src,
  alt,
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  width,
  height,
  className,
  blurDataURL,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      className={className}
      placeholder={blurDataURL ? 'blur' : 'empty'}
      blurDataURL={blurDataURL}
      style={{ objectFit: 'cover' }}
    />
  );
}

// ---- Font setup ----
// app/layout.tsx
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const brandFont = localFont({
  src: './fonts/Brand-Regular.woff2',
  variable: '--font-brand',
  display: 'swap',
  preload: true,
});

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${brandFont.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

// ---- next.config.js ----
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.company.com', pathname: '/assets/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
```

---

## 🧠 6. Memory Aid

**PALS — what next/image provides:**
- **P**riority: `priority` prop on LCP images → preload + no lazy load
- **A**VIF/WebP: automatic format conversion → 40-60% smaller files
- **L**ayout shift prevention: `width`/`height` or `fill` → CLS = 0
- **S**izes: `sizes` attribute → browsers pick correct srcset source → less bandwidth

**SDZO — what next/font provides:**
- **S**elf-hosted: downloaded at build, served from same origin
- **D**NS-free: no external requests to Google Fonts at runtime
- **Z**ero CLS: `size-adjust` makes fallback font metrics match web font
- **O**ne variable: exposed as CSS `--font-name` variable, one class on `<html>`

**Mnemonic:** **PALS + SDZO** — keep images PALS with users (fast, stable); fonts in a SDZO (zero-drama delivery).

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ LCP and CLS are Core Web Vitals that directly affect Google search ranking and user retention — `next/image` and `next/font` together address the two most common causes (image load time + font swap shift); demonstrating you understand `priority` + `sizes` as LCP levers shows metrics-driven performance thinking, not just API knowledge
→ The `sizes` attribute gap is a practical differentiator — most candidates know `next/image` exists but don't know why `sizes` matters; explaining that the browser uses `sizes` + `srcset` together to pick the appropriately dimensioned source shows deep browser/HTTP knowledge
→ Security angle: `remotePatterns` with `pathname` scoping prevents SSRF via the image optimization endpoint — an attacker without proper scoping could abuse the endpoint to make server-side requests to internal services

**How it works (2 sentences):**
`next/image` generates a `srcset` with multiple resized variants (using `deviceSizes` and `imageSizes` from config), and the browser uses the `sizes` attribute to evaluate which source to download at the current viewport width — the actual resizing and format conversion happens lazily on the Next.js image optimization endpoint (`/_next/image`), which transcodes the source image on first request and stores the result in a persistent disk cache, so subsequent requests for the same URL + size + format combination are served from cache with no compute overhead.
`next/font` makes an outbound request to Google Fonts' CSS API at build time (during `next build`), downloads the actual `.woff2` files referenced in the CSS to the local `.next/static/media/` directory, and emits an `@font-face` CSS rule pointing to the local path plus a computed `size-adjust` percentage that scales the fallback font's metrics to match the loaded font's cap height and x-height — this ensures that even before the web font is applied, the page layout uses equivalent space, eliminating CLS when the font eventually swaps in.

---
✅ Topic 122/486 complete → Continuing to Topic 123: Next.js Middleware — Edge Runtime, Auth Guards, A/B Testing
