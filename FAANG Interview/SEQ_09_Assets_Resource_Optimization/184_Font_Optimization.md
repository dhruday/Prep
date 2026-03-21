# 184. Font Optimization
**Phase:** Performance & Architecture | **Sequence:** SEQ 09 | **Company:** Adobe (typography-focused), Microsoft (Fluent UI fonts), Salesforce (SLDS Lightning Sans), Cisco

---

## 🎯 1. Interview Opening Answer

Font optimization prevents two of the most visible performance problems: invisible text during load (FOIT — Flash of Invisible Text) and layout shifts when custom fonts swap in (FOUT — Flash of Unstyled Text). My strategy has four parts: use `font-display: swap` or `optional` to ensure text is always visible; preload critical font variants (typically the regular weight); subset fonts to remove unused Unicode ranges; and self-host using WOFF2 to eliminate third-party DNS lookups. At SAP, switching the UI5 app from four dynamically loaded Google Fonts imports to self-hosted, subsetted WOFF2 files reduced font payload from ~480KB to ~62KB and eliminated render-blocking FOIT on slower corporate VPNs. Font optimization directly impacts FCP and CLS — two of the three Core Web Vitals.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Web fonts enhance brand consistency and readability — but they are render-blocking resources. The browser needs the font to paint text; if the font hasn't loaded, the browser either shows nothing (FOIT) or falls back to a system font that causes layout shift on swap (FOUT). Both hurt user experience and Core Web Vitals. Font optimization is about loading the minimum font data, as early as possible, with the best loading behaviour for the use case.

### How It Works Internally

**Font loading lifecycle:**
1. Browser parses CSS and discovers `@font-face` declarations
2. For each font family: browser only **requests** the font file when it encounters an element that uses that font-family in the render tree
3. Font file is downloaded (often 50–300KB per variant)
4. `font-display` property controls rendering behaviour during the load gap:

```
Timeline:
0ms ────── [Block period] ──── [Swap period] ──── [Failure period]
              FOIT if loading        FOUT if loaded       back to fallback
```

**`font-display` values:**
| Value | Block period | Swap period | Behaviour |
|---|---|---|---|
| `auto` | Browser default (3s) | Infinite | Typically same as `block` |
| `block` | ~3s | Infinite | 3s of invisible text, then custom font forever |
| `swap` | 0ms | Infinite | System font immediately, custom font swaps in (CLS risk) |
| `fallback` | ~100ms | 3s | Brief invisible text — if font loads fast, no swap; if slow, stays on system font |
| `optional` | ~100ms | 0ms | Browser decides based on connection; cached font used, otherwise system font forever |

**Best practices per use case:**
- Body text: `font-display: swap` — always readable; CLS is acceptable for body text swap
- Large headings (LCP candidate): `font-display: optional` — prevents CLS in the element most likely to cause it; font loads from cache on next visit
- Critical brand text: `font-display: fallback` — brief FOIT acceptable, prevents permanent FOUT

**WOFF2 format:**
WOFF2 uses Brotli compression delivering 30–40% smaller files than WOFF, which itself is 40% smaller than TTF/OTF. WOFF2 has 97%+ browser support. Always serve WOFF2 with WOFF as fallback for very old browsers.

**Font subsetting:**
Most fonts include 2,000–4,000 glyphs. A typical English-language SaaS app uses ~200–400. `unicode-range` in `@font-face` lets the browser download only the subset that contains characters actually on the page:
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF; /* Latin Basic */
}
```
Tools like `glyphhanger`, `fonttools`, and Google Fonts API `text=` parameter generate subsets.

**Preloading fonts:**
```html
<!-- In <head> — starts download before CSS is parsed -->
<link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin />
```
`crossorigin` is required even for same-origin fonts because font requests use CORS mode.

### Architecture & Component Boundaries

```
[Design System: Font selection — Inter, Roboto, custom brand font]
    → [Font pipeline: fonttools subset → WOFF2 generation → content-hash filename]
         → [self-hosted on CDN with Cache-Control: immutable]
              → [@font-face declarations in global CSS]
                   → [<link rel="preload"> for regular + bold weights]
                        → [font-display strategy per context]
                             → [CSS font stack: custom font + matching system fallback]
```

### Data Flow & State Flow

**The critical path problem:**
Google Fonts (loaded via `<link href="https://fonts.googleapis.com">`) causes two additional round trips before font bytes arrive:
1. DNS lookup for `fonts.googleapis.com`
2. Download the CSS file containing `@font-face` rules
3. DNS lookup for `fonts.gstatic.com`
4. Download the actual font file

This adds 200–600ms on a cold connection. Self-hosting eliminates all DNS and redirect steps — font bytes arrive in one request from your own CDN.

### Performance Implications

| Metric | Font Impact |
|---|---|
| **FCP** | FOIT delays text paint — if the LCP element contains text, FOIT directly delays FCP and LCP |
| **CLS** | Font swap changes character widths → line wraps change → surrounding content shifts → CLS |
| **Bandwidth** | Full font file: 200–400KB. Subsetted WOFF2 for Latin: 15–50KB. 8–10× difference |
| **Render-blocking** | `@import` in CSS for fonts is render-blocking; `<link rel="stylesheet">` in `<head>` blocks paint |

**Size-adjust to prevent CLS during swap:**
CSS `size-adjust` lets you scale the fallback font to match the custom font's metrics, zeroing out CLS during the FOUT period:
```css
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');          /* use system font */
  size-adjust: 107%;            /* scale to match Inter's character widths */
  ascent-override: 90%;         /* match vertical metrics */
  descent-override: 22%;
  line-gap-override: 0%;
}
```
Next.js `next/font` does this automatically — one of its key performance benefits.

### Scalability Considerations

- **< 10K users:** Google Fonts CDN is fine; add `rel="preconnect"` to reduce DNS latency
- **100K users:** Self-host WOFF2, subset to used Unicode ranges, preload critical weights, use `size-adjust` fallback
- **10M+ users:** Design system owns the font library; WOFF2 variant per locale (CJK subsetting for Asian markets — CJK fonts are 2–5MB without subsetting); font loading tracked in RUM to detect slow font loads by geography

### Trade-offs

| Google Fonts CDN | Self-hosted | System font stack |
|---|---|---|
| Zero infra, automatic WOFF2, caching across sites | Full control, no DNS lookups, GDPR-safe | Zero download, zero FOIT/FOUT |
| Third-party DNS latency (~200ms cold start) | Build pipeline required, manual updates | Limited to OS fonts, no brand font |
| Privacy concerns (GDPR: IP sent to Google) | Best performance ceiling | Fastest possible; Netflix, GitHub use this |

### ⚠️ Anti-Patterns & Pitfalls

- **Loading four font-weight variants without subsetting** — a full variable-weight font family (Thin/Regular/Medium/Bold/Black) can exceed 1MB; load only the weights actually used in the UI
- **Using `@import` in CSS for Google Fonts** — `@import` is render-blocking: the browser cannot proceed with CSS parsing until the imported stylesheet is downloaded; always use `<link>` in HTML with `rel="preconnect"` instead
- **Forgetting `crossorigin` on font preload** — font requests use CORS mode even for same-origin; a preload `<link>` without `crossorigin="anonymous"` will trigger a second request instead of using the preloaded resource
- **No fallback system font in the font stack** — if the custom font fails to load (CDN outage, slow connection) users see browser default serif; always include a matching system font: `font-family: 'Inter', system-ui, -apple-system, sans-serif`
- **Not accounting for CLS in font swap** — `font-display: swap` on a large heading font causes visible layout shift; use `font-display: fallback` or `optional` for above-fold headings, and use `size-adjust` for the fallback font

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
SAP UI5 applications consumed the "72" brand font via Google Fonts CSS import — four weights loaded dynamically on each page load. On corporate VPNs with high latency, this caused 800ms+ FOIT because the Google Fonts CSS import was render-blocking. After migrating to self-hosted `72-Regular.woff2` and `72-Bold.woff2` (subsetted to Latin + Latin Extended only, stripping CJK/Arabic/Hebrew ranges unused in the SAP BI Launchpad), font payload dropped from ~480KB to ~62KB. Adding `<link rel="preload" crossorigin>` for both files in `<head>` ensured fonts arrived before first paint. FOIT was eliminated and FCP improved by ~320ms on corporate VPN testing.

**At FAANG scale:**
Adobe's Typekit (now Adobe Fonts) is a CDN-hosted font delivery service for 20,000+ typefaces. Internally for adobe.com, the design system uses a dedicated font CDN with per-locale subsets — a Japanese page loads only the Kanji subset used on that page (dynamically computed via a font linter at build time). Adobe Fonts' JavaScript loader includes font-swap coordination to prevent FOUT on first visit. Microsoft Fluent UI ships with Segoe UI Variable as the primary font — a variable font covering all weights in a single file — with system-ui fallback on non-Windows platforms.

**How it evolves with scale:**
- Small scale (< 10K users): Google Fonts with `rel="preconnect"` and `font-display: swap`
- Medium scale (100K users): Self-hosted WOFF2, Latin subset only, preloaded, with `size-adjust` fallback matching
- Large scale (10M+ users): Per-locale font subsetting automated at build time, variable fonts to reduce file count, font loading tracked in RUM by geo, graceful degradation strategy documented per brand font

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Font optimization targets two specific problems. FOIT — Flash of Invisible Text — where the browser hides text until the custom font loads. And CLS from font swap, where the custom font has different character widths than the fallback system font, causing text to reflow and pushing other content around. I address both with a four-part strategy. First, `font-display: swap` or `optional` — swap ensures text is always visible immediately using a system font; optional goes further and tells the browser to use the cached font on repeat visits only, preventing CLS entirely. Second, preloading critical font variants in the document `<head>` with `<link rel='preload' as='font' crossorigin>` — the crossorigin attribute is required even for same-origin fonts because of how CORS works for fonts. Third, subsetting — stripping Unicode ranges the app doesn't use; a subsetted Latin WOFF2 is typically 15–50KB versus 500KB+ for a full CJK-capable font. Fourth, self-hosting — Google Fonts adds two extra DNS lookups and a CSS download before font bytes even start; self-hosting eliminates that. At SAP, those four changes combined eliminated visible FOIT on corporate VPNs and improved FCP by over 300ms."

### Likely Follow-up Questions
1. What is `font-display: optional` and when would you use it? → Font loads within a very short block period; if not loaded, browser commits to system font — no swap; cached on repeat visits. Ideal for above-fold headings where CLS is most impactful.
2. Why does `crossorigin` matter for font preload? → Font requests use CORS mode by default; a preload without `crossorigin` creates a different cache key — the preloaded asset is ignored and the font fetched again as a separate request
3. How do you prevent CLS during font swap? → CSS `size-adjust`, `ascent-override`, `descent-override` on the fallback `@font-face` declaration to match the custom font's vertical and horizontal metrics; Next.js `next/font` does this automatically
4. Variable fonts vs static fonts — trade-off? → Variable font: single file covering all weights/widths (50–150KB); static: one file per variant (25–60KB each). Variable wins when 3+ variants are used; static wins for 1–2 variants

### vs Alternatives

| Self-hosted WOFF2 | Google Fonts / Adobe Fonts CDN | System font stack |
|---|---|---|
| Best performance ceiling | Easy setup, maintained by vendor | Zero load time, zero FOIT/FOUT |
| GDPR-safe (no IP sent to Google) | Privacy concerns (GDPR gray area) | No brand font — trade-off teams must consciously accept |
| Requires build pipeline for updates | Automatic new font versions | GitHub, Netflix, Vercel use system fonts intentionally |
| Full `unicode-range` subsetting control | Google does subsetting automatically | |

### How to Signal Senior Thinking
> "Font optimization is one of the few places where CLS and FCP are both at stake simultaneously. The most sophisticated approach uses `font-display: optional` for above-fold headings — which are LCP candidates — and pairs it with a fallback font that uses `size-adjust` to match the custom font's metrics. On first visit the user sees the system font; on second visit they see the brand font instantly from cache with zero layout shift. Next.js `next/font` automates all of this — choosing it over manual `@font-face` at scale is an architectural decision worth stating explicitly."

---

## 💻 5. Code Example

```typescript
// Option A: Next.js next/font — automated subsetting, preloading, size-adjust
// Best choice for Next.js apps — handles everything automatically
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],             // downloads only Latin subset
  display: 'swap',                // FOUT acceptable, always readable
  variable: '--font-inter',       // exposes as CSS variable for Tailwind etc.
  preload: true,                  // auto-adds <link rel="preload"> to <head>
  // next/font also auto-generates size-adjust fallback CSS to prevent CLS
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}

// ─────────────────────────────────────────────────
// Option B: Manual self-hosted fonts — full control
// ─────────────────────────────────────────────────

/* global.css */
/*
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-regular.woff2') format('woff2'),
       url('/fonts/inter-regular.woff')  format('woff');  /* fallback for very old browsers */
/*  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
                 U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193,
                 U+2212, U+2215, U+FEFF, U+FFFD; /* Latin + commonly used symbols */
}

/* Fallback font with size-adjust to prevent CLS during swap */
/*
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  size-adjust: 107%;        /* scale Arial to match Inter character widths */
/*  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: 'Inter', 'Inter Fallback', system-ui, -apple-system, sans-serif;
}
*/

// HTML <head> — preload critical font variant
// In Next.js this goes in app/layout.tsx or pages/_document.tsx:
/*
<link
  rel="preload"
  href="/fonts/inter-regular.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"   // required — font requests use CORS mode
/>
*/

// ─────────────────────────────────────────────────
// Build-time font subsetting with glyphhanger (Node script):
// ─────────────────────────────────────────────────
// npx glyphhanger http://localhost:3000 --subset=inter.woff2 --formats=woff2
// Crawls the page, discovers all characters used, outputs a minimal subset

// Or using Python fonttools:
// pyftsubset inter.ttf --unicodes="U+0000-00FF" --flavor=woff2 --output-file=inter-latin.woff2
```

**Interview vs Production difference:**
In an interview, explain `font-display` values and why `crossorigin` is required on font preload — these signal deep awareness. In production, add: automated subsetting in the build pipeline, `size-adjust` fallback to eliminate CLS, RUM tracking for font load times by geography, and a performance budget gate that fails CI if any font variant exceeds 50KB.

---

## 🧠 6. Memory Aid

**Mental Model:** Fonts are like late-arriving dinner guests — `block` keeps the table empty until they arrive (FOIT), `swap` serves the meal with a stranger sitting there first (FOUT/CLS), `optional` decides if they're in the building already or eats without them.

**If you go blank:** "Font optimization is about three things: load fast (WOFF2 + preload + self-host), show something immediately (`font-display: swap`), and prevent layout shift (matching fallback font with `size-adjust`). The `crossorigin` attribute on font preload is the sneaky gotcha most people forget."

**Mnemonic:** **FOIT = Invisible** (font blocking), **FOUT = Ugly swap** (layout shift). Fix both with **font-display + size-adjust**.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: FOIT makes pages appear broken for 1–3 seconds; FOUT causes jarring content jumps that break reading flow
→ Performance: Font swap causes CLS (Core Web Vital); FOIT during LCP element delays FCP and LCP scores directly
→ Business: Google's ranking signals include CLS — a poorly loaded custom font can hurt organic search ranking across the entire domain

**How it works (3 sentences):**
The browser discovers font files through `@font-face` declarations in CSS, but only requests a font file when an element using that font family appears in the render tree, creating a potential gap between render tree construction and font availability. `font-display` controls rendering during this gap: `swap` immediately uses the fallback system font and replaces it when the custom font loads; `optional` commits to whichever font is available at the end of a very brief block period. Preloading critical font variants eliminates most of the gap by starting the font download before CSS is even parsed, while WOFF2 with subsetting and self-hosting minimises the download itself.

**Company relevance:**
- Microsoft: Fluent UI design system ships Segoe UI Variable — a variable font covering all weights in a single file; typography performance is a first-class concern given Windows brand consistency across web products
- Adobe: Typography is Adobe's domain — Adobe Fonts (Typekit) is a product itself; font loading performance and FOIT/FOUT elimination are battle-hardened engineering concerns inside Adobe
- Salesforce: Lightning Design System uses "Salesforce Sans" (self-hosted); CLS from font swap in Salesforce CRM would be highly visible given data-dense record pages
- Cisco: Internal dashboards often run on constrained network environments (corporate VPNs, factory floors) — eliminating Google Fonts DNS lookups and reducing font payload is directly impactful

---
**✅ Topic 184/486 complete.**
**→ Continuing to Topic 185: AVIF vs WebP vs JPEG XL — Modern Image Formats ★**
