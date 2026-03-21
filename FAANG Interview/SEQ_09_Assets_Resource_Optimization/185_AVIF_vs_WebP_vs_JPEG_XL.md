# 185. AVIF vs WebP vs JPEG XL — Modern Image Formats ★
**Phase:** Performance & Architecture | **Sequence:** SEQ 09 | **Company:** Adobe (image tooling core), Microsoft, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

The three modern image formats each offer substantial improvements over JPEG/PNG, but serve different niches. WebP is the safe production choice today — 97%+ browser support, 25–35% better compression than JPEG, and fast decode. AVIF offers 40–55% better compression than JPEG — the best file sizes available — at the cost of slower encoding and higher CPU decode cost on low-end devices, but with 93%+ support as of 2026. JPEG XL is the most technically capable format — lossless JPEG transcoding, superior compression, and HDR support — but browser support is still limited after Chrome removed it, making it premature for general production use. My decision framework: AVIF with WebP fallback via `<picture>` for all new image delivery. JPEG XL to monitor and prepare for when browser support stabilises.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

JPEG was designed in 1992 and PNG in 1996. Despite decades of improvements, JPEG compression at the same quality level consumes 2–3× the bytes of modern codecs. Modern image formats exist to deliver the same perceptual quality at dramatically lower file sizes — directly impacting LCP, bandwidth costs, and user experience on slow connections. The proliferation of multiple competing formats is driven by different companies pushing different codec strategies (Google → WebP/AVIF via AV1, ISO/IEC consortium → JPEG XL).

### How It Works Internally

**WebP:**
- Developed by Google (2010), based on VP8 video codec's intra-frame prediction
- Two modes: lossy (transforms DCT predictions like JPEG, but with better entropy coding) and lossless (palette + back-reference compression, better than PNG)
- Supports alpha transparency in both lossy and lossless modes — replaces both JPEG and PNG
- Animated WebP replaces GIF — similar concept, much smaller
- Encode speed: fast (~2× JPEG). Decode speed: comparable to JPEG. CPU cost: low.

**AVIF:**
- Based on AV1 video codec's intra-frame encoding (first frame of a video, essentially)
- Developed by Alliance for Open Media (Google, Netflix, Apple, Microsoft)
- A mathematical transform more complex than WebP's — tile-based encoding, better frequency decomposition
- Supports: lossy, lossless, alpha, animation, HDR (10-bit/12-bit color depth), wide color gamut
- Compression advantage: 40–55% better than JPEG at equivalent perceptual quality; 20–30% better than WebP
- Encode speed: **slow** — 5–20× slower than JPEG encoding. Decode speed: **higher CPU cost** than WebP on low-end devices.
- Browser support (2026): Chrome 85+, Firefox 93+, Safari 16+, Edge 121+. ~93% global.

**JPEG XL:**
- Designed by the JPEG committee — intended as the universal successor to JPEG
- Two killer features AVIF lacks: **lossless JPEG transcoding** (re-encode existing JPEG library to JXL at identical quality but ~20% smaller, without any re-decoding) and **progressive decode** (render a full-image preview with 10–20% of the file, then refine)
- Best theoretical compression (better than AVIF at high quality settings)
- HDR, wide color gamut, high bit depth, animation
- **Browser support problem:** Chrome added JXL in v91 and **removed it in v110** (2023). Firefox support behind a flag. Safari 17+ supports it. As of 2026: ~60% global support at best — not production-safe without server-side detection.

### Format Comparison Table

| Feature | JPEG | PNG | WebP | AVIF | JPEG XL |
|---|---|---|---|---|---|
| Lossy compression | ✅ | ❌ | ✅ | ✅ | ✅ |
| Lossless | ❌ | ✅ | ✅ | ✅ | ✅ |
| Alpha/transparency | ❌ | ✅ | ✅ | ✅ | ✅ |
| Animation | ❌ | ❌\* | ✅ | ✅ | ✅ |
| HDR / wide gamut | ❌ | ❌ | ❌ | ✅ | ✅ |
| Lossless JPEG transcode | ❌ | ❌ | ❌ | ❌ | ✅ |
| Progressive decode | ✅ | ❌ | ❌ | ❌ | ✅ |
| Browser support (2026) | ~100% | ~100% | ~97% | ~93% | ~60% |
| Encoding speed (relative) | 1× | 1× | 1.5× | 10–20× | 5–15× |
| Decode CPU cost | Low | Low | Low | Medium | Low–Medium |
| File size vs JPEG | 0% | +30–50% | -25–35% | -40–55% | -35–60% |

### Architecture & Component Boundaries

**Production delivery pattern — AVIF with graceful degradation:**
```html
<picture>
  <source srcset="image.avif" type="image/avif" />  <!-- Best compression -->
  <source srcset="image.webp" type="image/webp" />  <!-- Broad support fallback -->
  <img src="image.jpg" alt="..." />                  <!-- Universal fallback -->
</picture>
```
CDN can also handle this transparently via `Accept` header inspection:
```
Accept: image/avif,image/webp,*/*;q=0.8
```
CDN serves `.avif` if `image/avif` is in Accept, `.webp` if only `image/webp`, original JPEG otherwise.

### Data Flow & State Flow

**Encode-once, serve appropriately:**
```
[Source master image — RAW / TIFF / high-quality JPEG]
    → [Build pipeline or CDN image service]
         → [AVIF (q=65)] [WebP (q=80)] [JPEG (q=85, progressive)]
              → [CDN cache per format variant]
                   → [Accept-header routing → client receives optimal format]
```

### Performance Implications

| Scenario | Impact |
|---|---|
| AVIF on slow Android (low-end phone) | Decode can cause 100–400ms main thread block; use WebP for mobile-first markets with low-end device penetration |
| AVIF on desktop Chrome | Negligible decode cost difference; use AVIF for maximum bandwidth saving |
| WebP everywhere | Safe. 25–35% smaller than JPEG, fast decode, works for 97% of users |
| JPEG XL for existing JPEG library | Compelling — lossless transcode shrinks JPEG library by 20% with zero quality loss; only viable when server-side detection can serve JXL to Safari 17+ users |

### Scalability Considerations

- **< 10K users:** WebP with JPEG fallback is sufficient; complexity of AVIF pipeline not worth it at this scale
- **100K users:** AVIF + WebP + JPEG triple format pipeline via Sharp; serve via `<picture>` or CDN Accept-header routing; AVIF encoding runs at build time in CI (slow encode is not a runtime cost)
- **10M+ users:** CDN image service (Cloudflare Images, Cloudinary) handles all variants on-demand; AVIF served to all modern browsers by default; monitor decode-time CrUX data for low-end mobile markets; JPEG XL evaluated per market based on Safari prevalence

### Trade-offs

| Format | Best for | Avoid when |
|---|---|---|
| JPEG | Compatibility fallback only | Never choose as primary for new content |
| WebP | Safe production default — high support, fast, good compression | Never — always a sensible choice |
| AVIF | Maximum compression, photography, gradients | Low-end mobile-first markets (decode cost), real-time encoding pipelines (slow encode) |
| JPEG XL | Migrating existing JPEG archives (lossless transcode); HDR content | Any use requiring Chrome support currently |

### ⚠️ Anti-Patterns & Pitfalls

- **Serving AVIF without a fallback** — 7% of users don't support AVIF; always wrap in `<picture>` with WebP and JPEG fallbacks or use CDN Accept-header negotiation
- **Using AVIF for real-time encoding** — AVIF encoding is 10–20× slower than JPEG; if users upload images that must be processed immediately, use WebP for near-real-time encoding and AVIF for batch post-processing
- **Ignoring decode cost on mobile** — AVIF has a more complex decoder; on low-end Android phones (widespread in India, Southeast Asia), AVIF decode can cause visible jank during scroll; measure CrUX data for your actual user device distribution before deploying AVIF universally
- **Assuming JPEG XL is production-ready** — Chrome removed native JXL support in 2023; relying on JXL without server-side detection and per-browser serving is a compatibility regression
- **Setting the same quality parameter for AVIF and WebP** — AVIF at quality 80 produces a noticeably better-looking image than WebP at quality 80 because the quality scale is not equivalent; AVIF q=65 typically matches WebP q=80 in perceptual quality

---

## 🏭 3. Real-World Examples

**At Hruday's level (SAP):**
In the SAP BI Launchpad image optimization project, the initial migration went JPEG → WebP (the safe step). For the second iteration, AVIF encoding was added to the Sharp build pipeline for all static dashboard thumbnail images — these were batch-processed at build time so the slow AVIF encode speed was irrelevant. Desktop users (the majority of SAP internal users) received AVIF files; the Sharp-generated AVIF variants at q=65 were 30% smaller than WebP at q=80 for the same perceptual quality. The `<picture>` element served AVIF to Chrome/Firefox users and WebP to Safari users. Combined saving: JPEG baseline was 350KB average; WebP was 95KB; AVIF reached 65KB.

**At FAANG scale:**
Netflix is a key member of the Alliance for Open Media and was among the first to ship AVIF in production (2020). Their still image frames for movie thumbnails and artwork served to Chrome and Firefox users in AVIF; Safari users received JPEG at the time. Netflix measured a 20–30% bandwidth reduction on image delivery CDN costs at scale — translating to millions of dollars in CDN savings monthly. Adobe's image export pipelines inside Lightroom and Photoshop now support AVIF export natively, reflecting the format's mainstream status in creative workflows.

**How it evolves with scale:**
- Small scale (< 10K users): WebP + JPEG via `<picture>`. Simple, safe.
- Medium scale (100K users): AVIF + WebP + JPEG triple format in build pipeline via Sharp; served via `<picture>` or CDN routing
- Large scale (10M+ users): CDN handles all format variants on-demand; real user monitoring tracks decode performance by device class; JPEG XL evaluated for Safari-heavy demographic segments; perceptual quality scoring (SSIM/Butteraugli) used to auto-select optimal quality parameter per image content

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "The three modern formats fill different niches. WebP is the safe production choice today — 97% support, 25–35% better than JPEG, fast encode and decode. I default to WebP for everything and use JPEG as a fallback. AVIF is the next step up — 40–55% better compression than JPEG, so meaningfully smaller files. The two trade-offs are encoding speed — AVIF is 10 to 20 times slower to encode than JPEG, which matters for real-time upload processing but not for build-time batch processing — and decode CPU cost, which is higher than WebP on low-end mobile. I use AVIF for photography and content images served from a CDN build pipeline, with WebP as fallback via `<picture>`. JPEG XL I find technically the most impressive — it adds lossless JPEG transcoding, which means you can shrink an existing JPEG library by 20% with no quality loss, and it has real progressive decode. But Chrome removed native support in 2023, and until browser support stabilises above 90% I wouldn't ship it without server-side Accept-header detection. At SAP, implementing AVIF + WebP + JPEG triple-format delivery took our average thumbnail from 95KB WebP down to 65KB AVIF for desktop users — another 30% gain on top of the JPEG→WebP saving."

### Likely Follow-up Questions
1. Why did Chrome remove JPEG XL support? → Google cited insufficient developer interest and prioritisation of AVIF investment — controversial decision; Apple's Safari team still ships it; long-term outlook uncertain
2. When would you choose WebP over AVIF? → Low-end mobile markets with budget Android devices where AVIF decode cost causes jank; real-time image processing pipelines where encode speed matters
3. How do you measure perceptual quality equivalence between formats? → SSIM (Structural Similarity Index), DSSIM, or Butteraugli score — compare encoded files at different quality settings to find the parameters that produce equivalent visual quality at minimum file size
4. Does AVIF support animation? → Yes, animated AVIF (AVIS) — like animated WebP but better compression; replaces both GIF and animated PNG

### vs Alternatives

| WebP | AVIF | JPEG XL |
|---|---|---|
| 97%+ support — safest choice | 40–55% better than JPEG | Best theoretical compression + lossless JPEG transcode |
| Fast encode and decode | Slow encode; higher decode CPU | ~60% support — not production-ready without detection |
| Good first step from JPEG | Best for static batch pipelines | Best for: existing JPEG library migration on Safari-heavy apps |

### How to Signal Senior Thinking
> "The format decision should be automated and never per-developer. I'd configure the image CDN to deliver AVIF to any client with `image/avif` in their Accept header, WebP to clients with `image/webp`, and JPEG as the universal fallback — all from a single source upload. The developer uploads one master image; format selection, quality optimisation, and `srcset` generation are entirely infrastructure concerns. No React component, no engineer build step. The performance contract is in the CDN configuration."

---

## 💻 5. Code Example

```typescript
// Sharp multi-format pipeline — build-time generation
// Runs in CI; slow AVIF encode is not a user-facing cost
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

interface FormatConfig {
  ext: 'avif' | 'webp' | 'jpeg';
  options: sharp.AvifOptions | sharp.WebpOptions | sharp.JpegOptions;
}

const FORMAT_CONFIGS: FormatConfig[] = [
  { ext: 'avif', options: { quality: 65, effort: 7 } },  // effort 7 = better compression, slower encode
  { ext: 'webp', options: { quality: 80, effort: 6 } },
  { ext: 'jpeg', options: { quality: 85, progressive: true, mozjpeg: true } },
];

const BREAKPOINTS = [320, 480, 768, 1024, 1440];

async function processImage(inputPath: string, outputDir: string): Promise<void> {
  const name = path.basename(inputPath, path.extname(inputPath));
  await fs.mkdir(outputDir, { recursive: true });

  for (const width of BREAKPOINTS) {
    const resized = sharp(inputPath).resize(width, null, { withoutEnlargement: true });

    await Promise.all(
      FORMAT_CONFIGS.map(({ ext, options }) =>
        (resized.clone() as any)[ext](options).toFile(`${outputDir}/${name}-${width}.${ext}`)
      )
    );
  }
  console.log(`Processed: ${name} → ${BREAKPOINTS.length * FORMAT_CONFIGS.length} variants`);
}

// ─────────────────────────────────────────────────
// HTML delivery — <picture> with 3-format fallback chain
// ─────────────────────────────────────────────────

interface OptimizedPictureProps {
  baseName: string;     // e.g., "hero"
  alt: string;
  sizes: string;
  isLCP?: boolean;
}

function OptimizedPicture({ baseName, alt, sizes, isLCP = false }: OptimizedPictureProps) {
  const srcsetFor = (ext: string) =>
    BREAKPOINTS.map(w => `/images/${baseName}-${w}.${ext} ${w}w`).join(', ');

  return (
    <picture>
      {/* AVIF — best compression, 93% support */}
      <source srcSet={srcsetFor('avif')} sizes={sizes} type="image/avif" />
      {/* WebP — 97% support fallback */}
      <source srcSet={srcsetFor('webp')} sizes={sizes} type="image/webp" />
      {/* Progressive JPEG — universal fallback */}
      <img
        src={`/images/${baseName}-1024.jpeg`}
        srcSet={srcsetFor('jpeg')}
        sizes={sizes}
        alt={alt}
        loading={isLCP ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={isLCP ? 'high' : 'auto'}
      />
    </picture>
  );
}

// CDN Accept-header negotiation (Cloudflare Worker or Edge Function)
// This handles format selection transparently — no HTML changes needed:
export async function onRequest({ request }: { request: Request }): Promise<Response> {
  const accept = request.headers.get('Accept') ?? '';
  const url = new URL(request.url);
  const basePath = url.pathname.replace(/\.(jpg|jpeg|png)$/, '');

  if (accept.includes('image/avif')) {
    url.pathname = `${basePath}.avif`;
  } else if (accept.includes('image/webp')) {
    url.pathname = `${basePath}.webp`;
  }
  // else serve original
  return fetch(url.toString());
}
```

**Interview vs Production difference:**
In an interview, explain the compression rationale for each format and demonstrate the `<picture>` fallback chain — that's the core knowledge being tested. In production, add: CDN Accept-header routing to serve format transparently from a single URL, perceptual quality scoring (Butteraugli) to find optimal quality parameters per image rather than using fixed quality numbers, and RUM tracking of image decode times by device class to catch AVIF performance regression on low-end devices.

---

## 🧠 6. Memory Aid

**Mental Model:** Quality ladder — JPEG (floor) → WebP (+1 floor, safe now) → AVIF (+2 floors, best today) → JPEG XL (+3 floors, not accessible yet)

**If you go blank:** "WebP is 30% better than JPEG with 97% support — always the safe default. AVIF is 50% better than JPEG with 93% support — use it where encoding speed and decode CPU cost don't matter, with WebP fallback. JPEG XL is technically best but Chrome dropped support — not yet production-ready."

**Mnemonic:** **W**ebP = **W**orking now. **A**VIF = **A**mazing but careful on mobile. **J**PEG XL = **J**ust wait.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: A 50% reduction in image bytes = roughly 50% faster LCP on image-heavy pages for mobile users
→ Performance: AVIF over JPEG can reduce CDN data transfer by 40–55% — directly translates to cost savings at scale
→ Business: At 10M+ image requests/day, format selection is a multi-million-dollar infrastructure cost decision; Google uses LCP (which images drive) as a ranking signal

**How it works (3 sentences):**
Modern image formats (WebP, AVIF, JPEG XL) use more sophisticated mathematical transforms and entropy coders than JPEG's 30-year-old DCT algorithm, achieving 25–55% better compression at the same perceptual quality as measured by metrics like SSIM or Butteraugli. The `<picture>` element with multiple `<source type="image/format">` entries lets the browser select the best supported format, processing sources top-to-bottom and falling back to the `<img src>` JPEG for universal compatibility. CDN Accept-header routing automates this transparently without any HTML changes — the CDN inspects the `Accept` request header and serves the optimal pre-generated variant from its edge cache.

**Company relevance:**
- Microsoft: Edge browser was an early WebP adopter; Microsoft Azure CDN supports AVIF delivery with Accept-header routing for Azure Static Web Apps
- Adobe: Lightroom and Photoshop added AVIF export in 2021; Adobe Stock and Creative Cloud deliver AVIF to compatible clients; Adobe is deeply invested in modern image codec standards
- Salesforce: CRM attachment previews and Marketing Cloud image assets — format selection directly impacts load times for image-heavy record pages and campaign creation workflows
- Cisco: Less image-critical; topology diagrams and hardware photos in product documentation are the primary image use cases — AVIF/WebP still applicable for reducing page weight

---
**✅ Topic 185/486 complete.**
**→ Continuing to Topic 186: Variable Fonts ★**
