# 474 – Image and Media Optimization

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Images are typically **50-70% of page weight**. Optimization: modern formats (WebP/AVIF), responsive srcset, lazy loading, proper sizing, blur placeholders, CDN delivery. For video: lazy load, poster images, streaming formats. Directly impacts LCP (Largest Contentful Paint).

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── RESPONSIVE IMAGES (native HTML) ────
function ResponsiveImage() {
  return (
    <picture>
      {/* Browser picks best format */}
      <source
        type="image/avif"
        srcSet="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1200.avif 1200w"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <source
        type="image/webp"
        srcSet="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <img
        src="/hero-800.jpg"
        alt="Hero image"
        loading="lazy"
        decoding="async"
        width={1200}
        height={600}
        style={{ aspectRatio: '2/1' }} // prevent CLS
      />
    </picture>
  );
}

// ──── NEXT.JS IMAGE OPTIMIZATION ────
import Image from 'next/image';

function OptimizedGallery({ images }: { images: ImageData[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((img, i) => (
        <div key={img.id} className="relative aspect-square">
          <Image
            src={img.url}
            alt={img.alt}
            fill                          // fills container
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={i < 3}              // preload first 3 (above fold)
            placeholder="blur"
            blurDataURL={img.blurHash}    // tiny base64 placeholder
            quality={75}                  // default 75, adjust per use
            style={{ objectFit: 'cover' }}
          />
        </div>
      ))}
    </div>
  );
}

// ──── BLUR PLACEHOLDER GENERATION ────
// Generate at build time with plaiceholder or sharp
import { getPlaiceholder } from 'plaiceholder';

async function getImageWithBlur(src: string) {
  const { base64 } = await getPlaiceholder(src);
  return { src, blurDataURL: base64 };
}

// ──── LAZY LOADING WITH INTERSECTION OBSERVER ────
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }, // load 200px before visible
    );
    
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef}>
      {isVisible ? (
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <div className="placeholder" style={{ aspectRatio: '16/9' }} />
      )}
    </div>
  );
}

// ──── VIDEO OPTIMIZATION ────
function OptimizedVideo({ src, poster }: { src: string; poster: string }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setShouldLoad(true);
    });
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={videoRef}>
      {shouldLoad ? (
        <video
          poster={poster}           // show image before play
          preload="metadata"        // only load metadata initially
          controls
          playsInline
        >
          <source src={`${src}.webm`} type="video/webm" />
          <source src={`${src}.mp4`} type="video/mp4" />
        </video>
      ) : (
        <img src={poster} alt="Video placeholder" />
      )}
    </div>
  );
}

// ──── IMAGE CDN / TRANSFORMATION ────
// Cloudinary, Imgix, Vercel Image Optimization
function cloudinaryUrl(publicId: string, width: number, format = 'auto') {
  return `https://res.cloudinary.com/mycloud/image/upload/w_${width},f_${format},q_auto/${publicId}`;
}

// ──── PERFORMANCE CHECKLIST ────
// 1. Modern formats: AVIF > WebP > JPEG
// 2. Responsive: srcSet + sizes
// 3. Lazy loading: loading="lazy" (native) or IO
// 4. Dimensions: always set width/height (prevent CLS)
// 5. Priority: preload hero/LCP images
// 6. CDN: serve from edge locations
// 7. Compression: quality 75-85 for photos
// 8. Blur placeholder: LQIP or blur hash
```

### Format Comparison
| Format | Compression | Browser Support | Best For |
|---|---|---|---|
| AVIF | Best (~50% smaller than JPEG) | Chrome, Firefox | Photos |
| WebP | Great (~30% smaller) | All modern | Photos + graphics |
| JPEG | Baseline | Universal | Fallback |
| PNG | Lossless | Universal | Graphics, transparency |
| SVG | Vector | Universal | Icons, logos |

### Impact on Core Web Vitals
| Optimization | Metric Improved |
|---|---|
| Proper sizing | LCP, CLS |
| Lazy loading | FCP, TTI |
| Modern formats | LCP |
| Blur placeholder | CLS |
| Priority preload | LCP |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Images = 50-70% page weight. Key optimizations: AVIF/WebP formats, responsive srcSet+sizes, lazy loading (native or IO), width/height to prevent CLS, priority preload for LCP images, blur placeholders. Next.js Image handles all automatically. Video: lazy load with IO, poster image, preload='metadata'."*

## 4. 🧠 MEMORY AID
**"AVIF > WebP > JPEG. srcSet + sizes. loading='lazy'. width+height (no CLS). priority (LCP). blur placeholder. CDN. quality=75."**
