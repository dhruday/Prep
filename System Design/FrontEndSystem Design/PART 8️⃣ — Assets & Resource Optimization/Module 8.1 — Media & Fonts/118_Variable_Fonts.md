# 118. Variable Fonts ★

────────────────────────────────────────────────────────────
## 1. HIGH-LEVEL EXPLANATION (Interview Opening Answer)
────────────────────────────────────────────────────────────

**Variable fonts** are a single font file that contains an entire type family — multiple weights, widths, italics, and custom axes — instead of requiring separate font files for each variant. A traditional font stack might require 6 separate files (Regular 400, Bold 700, Light 300, SemiBold 600, Italic, Bold Italic), each requiring a separate HTTP request and download. A variable font replaces all of them with one file that is often 30-50% smaller than the combined static files. For performance, this means fewer network round trips and less bytes transferred. For design, it means infinite stylistic flexibility — smooth `font-weight` transitions (400.5, 500 in CSS) that were impossible with static fonts. For a design-system-heavy company like Adobe, Salesforce, or SAP, variable fonts are standard practice to maintain typographic consistency without performance trade-offs.

────────────────────────────────────────────────────────────
## 2. DEEP-DIVE EXPLANATION (Senior/Staff Level)
────────────────────────────────────────────────────────────

### Variable Font Axes

```
Font Variation Axes:
─────────────────────────────────────────
wght  → font-weight       (100–900)
wdth  → font-stretch      (75%–125%)
ital  → font-style italic (0 or 1)
slnt  → font-style oblique angle (-90deg to 90deg)
opsz  → optical size      (6–72 — adjusts letterforms for small/large sizes)

Custom axes (font-specific, UPPERCASE):
GRAD  → grade (weight without changing width — used by Google Fonts)
CASL  → casual (Recursive font: 0=linear, 1=casual)
WONK  → wonky (Recursive font)
```

### CSS Usage

```css
/* ─────────────────────────────────────────────────────────
   @font-face declaration for variable font
──────────────────────────────────────────────────────── */
@font-face {
  font-family: 'Inter';
  src:
    url('/fonts/Inter.woff2') format('woff2 supports variations'),
    url('/fonts/Inter.woff2') format('woff2');
  font-weight: 100 900;       /* Range supported — required for variable fonts */
  font-display: swap;          /* Critical: prevents FOIT */
  font-style: normal;
}

/* Italic variable font (separate file for oblique if provided) */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Italic.woff2') format('woff2 supports variations');
  font-weight: 100 900;
  font-display: swap;
  font-style: italic;
}

/* ─────────────────────────────────────────────────────────
   Using variable font axes in CSS
──────────────────────────────────────────────────────── */
body {
  font-family: 'Inter', system-ui, sans-serif;
}

/* Any weight value (not just multiples of 100!) */
h1 { font-weight: 750; }    /* Between Bold and ExtraBold */
h2 { font-weight: 650; }
p  { font-weight: 420; }    /* Slightly heavier than Regular */

/* Animation: smooth weight transition (impossible with static fonts) */
button {
  font-weight: 450;
  transition: font-weight 0.2s ease;
}
button:hover {
  font-weight: 650;  /* Heavier on hover — no FOUT, smooth CSS transition */
}

/* Using font-variation-settings directly for custom axes */
.display-headline {
  font-variation-settings:
    'wght' 800,      /* weight */
    'wdth' 90,       /* slightly condensed */
    'opsz' 48;       /* optical size tuned for 48px headlines */
}
```

### Performance: Variable vs Static Comparison

```
Design System Font Requirements:
Regular (400), SemiBold (600), Bold (700), ExtraBold (800), Italic (400)

Static font approach:
─────────────────────────────────────────────
Inter-Regular.woff2        → 92KB
Inter-SemiBold.woff2       → 94KB
Inter-Bold.woff2           → 95KB
Inter-ExtraBold.woff2      → 96KB
Inter-Italic.woff2         → 91KB
─────────────────────────────────────────────
Total: 5 files × 5 HTTP requests = 468KB

Variable font approach:
─────────────────────────────────────────────
Inter[slnt,wght].woff2     → 290KB  (all weights + slant in one file)
─────────────────────────────────────────────
Total: 1 file × 1 HTTP request = 290KB

Savings: 37% fewer bytes, 4 fewer HTTP requests
```

### Font Loading Optimization

```html
<!-- Preload the variable font — critical path optimization -->
<!-- Must be in <head>, before CSS that uses the font -->
<link
  rel="preload"
  href="/fonts/Inter.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous"
/>
<!-- crossorigin is REQUIRED even for same-origin fonts -->
```

```css
/* font-display strategies: */

/* swap: FOUT (Flash of Unstyled Text) — text shows immediately in fallback,
         swaps when font loads. Best for body text. Better for LCP. */
font-display: swap;

/* optional: Font loads if available in browser cache; otherwise skips.
             No FOUT, no layout shift. Best for non-critical decorative fonts. */
font-display: optional;

/* fallback: 100ms block period, then 3s swap period.
             Good balance for important UI fonts. */
font-display: fallback;

/* block: Full FOIT (Flash of Invisible Text) — text invisible until font loads.
          Only for critical icon fonts where fallback text is meaningless. */
font-display: block;
```

### Subsetting Variable Fonts

```bash
# Subsetting removes unused characters = smaller files
# For a Latin-only web app, you don't need Cyrillic, Arabic, CJK glyphs

# Install fonttools
pip install fonttools

# Subset to Latin Extended + common symbols
pyftsubset Inter.woff2 \
  --output-file=Inter-subset.woff2 \
  --flavor=woff2 \
  --layout-features='kern,liga,calt,subs,sups,frac,numr,dnom' \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"

# Result for Inter: 290KB → 95KB (67% reduction!) with full Latin coverage
```

```typescript
// Google Fonts API — variable font with subset
// Add ?display=swap for font-display:swap + text= for subsetting
const FONT_URL = 
  'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap&subset=latin';

// Modern approach — use font-face declaration with self-hosted for:
// 1. No third-party DNS lookup (performance)
// 2. No GDPR concerns (privacy)
// 3. Consistent serving of specific version
```

### CSS Custom Properties + Variable Fonts (Design System Pattern)

```css
/* Design token + variable font integration */
:root {
  /* Semantic weight tokens that map to specific axis values */
  --font-weight-regular: 400;
  --font-weight-medium:  500;
  --font-weight-semibold: 600;
  --font-weight-bold:    700;
  
  /* Optical size tokens */
  --font-opsz-caption:  12;
  --font-opsz-body:     16;
  --font-opsz-display:  48;
}

/* Component uses tokens — implementation detail hidden */
.card-headline {
  font-weight: var(--font-weight-semibold);
  font-variation-settings: 'opsz' var(--font-opsz-body);
}

/* Dark mode + font weight adjustment (lighter weight for dark backgrounds) */
@media (prefers-color-scheme: dark) {
  :root {
    --font-weight-regular: 350;   /* Slightly lighter — optically same on dark bg */
    --font-weight-bold:    650;
  }
}
```

### ReactNative / TypeScript Font Type Definitions

```typescript
// Design system: TypeScript font weight type that matches variable font range
type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | number;

interface TypographyProps {
  weight?: FontWeight;
  stretch?: number;  // font-stretch: 75-125
  opticalSize?: number;
}

// Variable font enables this component API:
function Text({ weight = 400, stretch = 100, opticalSize, children }: TypographyProps) {
  const style: React.CSSProperties = {
    fontWeight: weight,
    fontStretch: `${stretch}%`,
    ...(opticalSize && {
      fontVariationSettings: `'opsz' ${opticalSize}`,
    }),
  };
  return <span style={style}>{children}</span>;
}
```

### Anti-Patterns

- **Not subsetting variable fonts**: A full variable font can be 500KB+ — subset to Latin-only for Western apps
- **Forgetting `crossorigin` on `<link rel="preload">`**: Without it, the preloaded font is not reused — the browser downloads it twice
- **Using `font-display: block` for body text**: Invisible text during load (FOIT) is worse UX than fallback text (FOUT) for readable content
- **Not specifying weight range in @font-face**: `font-weight: 400 900` is required for the browser to understand this is a variable font; without it, only weight 400 is served
- **Loading both static + variable fonts**: If a browser supports variable fonts but you also defined static @font-face declarations, it may load both — remove static @font-face entries when switching to variable

────────────────────────────────────────────────────────────
## 3. REAL-WORLD EXAMPLES
────────────────────────────────────────────────────────────

**Google Fonts:**
Adopted variable font serving by default. Inter variable font served by Google Fonts is subsetted by language, so English users get only ~95KB instead of the full 290KB. The API auto-detects the client's language via `Accept-Language` header for subsetting.

**Adobe:**
Adobe Source Sans, Source Code Pro, and Source Serif are all available as variable fonts. The Adobe Fonts platform serves variable fonts by default, replacing multiple static weight files. Design tools in Creative Cloud use CSS variable font axes for real-time weight/width preview.

**SAP (Hruday's context):**
SAP uses "72" typeface (their custom brand font) as a variable font in SAP Fiori. A single `72-Regular.woff2` variable file replaced 8 static weight files, reducing font-related network requests from 8 to 1.

**Scaling:**
- Simple landing page: system fonts = zero font loading. Variable fonts = overkill.
- Design-system-driven app: variable font is the standard — 1 font request vs 4-6
- Multilingual app (Japanese, Chinese): CJK variable fonts are 5-10MB — use on-demand subsetting or segment loading

────────────────────────────────────────────────────────────
## 4. INTERVIEW-ORIENTED ANSWER
────────────────────────────────────────────────────────────

**Sample Answer (7+ years level):**
> "Variable fonts replaced our 6-file font stack with a single woff2 file at SAP. The performance gain was twofold: fewer HTTP requests (from 6 to 1) and smaller total bytes (37% reduction). But the bigger win was design flexibility — our design system could now specify `font-weight: 650` in the middle of two traditional weight values, enabling the design lead to fine-tune typography for specific contexts like emphasis in data tables. I implement variable fonts with three optimizations: `<link rel="preload">` in `<head>` for the critical font file, `font-display: swap` to prevent FOIT on body text, and subsetting via pyftsubset to strip non-Latin glyphs from the woft2 file. For a Latin-only UI, subsetting reduces the font from 290KB to 95KB. The only gotcha is the `crossorigin='anonymous'` attribute on the preload link — miss that and the browser loads the font twice."

**Likely Follow-up Questions:**
1. *What's the difference between `font-display: swap` and `font-display: optional`?* → `swap`: always shows text (FOUT), best for content fonts; `optional`: skips font if not cached, best for non-critical decorative fonts — no layout shift
2. *How do you handle CLS from font loading?* → Font subsetting (faster load), `font-display: optional` for non-critical fonts, or `size-adjust` and `ascent-override` in the fallback @font-face to match metrics
3. *What is font subsetting?* → Removing unused character ranges from the font file — tool: pyftsubset (Python). Latin-only subset: 290KB → 95KB
4. *Can you animate font-weight?* → Yes — variable fonts support smooth `font-weight` transitions via CSS `transition`. Impossible with static fonts (they'd swap).
5. *When would you NOT use variable fonts?* → When only using 1-2 weights — static files for exactly those 2 weights may be smaller than a full variable font

────────────────────────────────────────────────────────────
## 5. CODE EXAMPLE (Subsetting + Loading in Next.js)
────────────────────────────────────────────────────────────

```typescript
// app/layout.tsx — Next.js 14 App Router
// next/font automatically handles: subsetting, self-hosting, font-display, preload

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],           // Auto-subset to Latin characters
  weight: ['400', '500', '700', 'variable'],  // Or specify 'variable' for full range
  display: 'swap',              // font-display: swap
  variable: '--font-inter',     // Expose as CSS custom property
  preload: true,                // Generates <link rel="preload"> automatically
});

// Usage in root layout:
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

// In CSS:
// body { font-family: var(--font-inter), system-ui, sans-serif; }
```

**Why `next/font` is the correct answer for Next.js:**
- Zero FOUC: fonts preloaded before page render
- Privacy: Google Fonts requests are proxied through Next.js — no Google DNS request from user's browser
- Zero config subsetting: `subsets: ['latin']` handles it
- Immutable caching: font files served with 1-year cache headers

────────────────────────────────────────────────────────────
## 6. MEMORY AID (Quick Recall for Interview)
────────────────────────────────────────────────────────────

**"One font file, infinite weights."**

Key numbers:
- Variable font: **1 file** vs **6 static files**
- Subset savings: **290KB → 95KB** (Latin only)
- Use `font-display: swap` for body text, `optional` for decorative

**The three optimization steps:**
1. `<link rel="preload" crossorigin>` — critical path
2. `font-display: swap` — prevent FOIT
3. Subset with pyftsubset — strip unused scripts

**If you go blank:** "Variable fonts are one file replacing multiple weights. Wins: fewer requests, smaller bytes, CSS animations on font-weight. Must subset for non-Latin scripts."

────────────────────────────────────────────────────────────
## 7. WHY & HOW SUMMARY
────────────────────────────────────────────────────────────

**Why it matters:**
→ **FCP/LCP**: Render-blocking fonts delay first paint; preloaded, optimized variable fonts minimize this
→ **CLS**: FOUT from font swapping causes CLS; proper `font-display` strategy minimizes shifts
→ **Design system maintainability**: One font file managed vs six = simpler versioning, CDN caching, CORS config

**How it works:**
→ Variable fonts embed continuous interpolation data (called "variation axes" defined in the font's `fvar` table). When CSS requests `font-weight: 650`, the renderer interpolates between the nearest masters (600 and 700) at the glyph level using TrueType or CFF2 outlines. This is done by the OS font renderer, with zero JS cost.

**Company relevance:**
→ **Microsoft**: Segoe UI Variable is Microsoft's variable font — used across Windows 11 and all Microsoft web properties since 2021
→ **Adobe**: Adobe Fonts serves variable fonts by default; Creative Cloud uses them in design tools for real-time previews
→ **Salesforce**: Salesforce Sans is a variable font used in Lightning Design System — 1 font file per brand
→ **Cisco**: Cisco Sans is used across Webex and DevNet properties — variable font serving reduces font-related network costs for Cisco's CDN
