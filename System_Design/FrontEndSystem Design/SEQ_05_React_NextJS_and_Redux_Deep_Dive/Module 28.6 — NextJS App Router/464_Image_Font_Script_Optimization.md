# 464 – Image, Font, and Script Optimization

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Next.js built-in optimization: **next/image** (automatic resize, format conversion, lazy loading), **next/font** (zero-layout-shift fonts, self-hosted Google Fonts), **next/script** (strategy-based script loading). All work with App Router and avoid common performance pitfalls.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── next/image — automatic optimization ────
import Image from 'next/image';

// Local image (auto width/height from import)
import heroImage from '@/public/hero.jpg';

function Hero() {
  return (
    <Image
      src={heroImage}           // local import → auto dimensions
      alt="Hero banner"
      priority                  // preload (above the fold)
      placeholder="blur"        // blur-up placeholder (auto for local images)
    />
  );
}

// Remote image
function Avatar({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt="User avatar"
      width={80}                // required for remote
      height={80}               // required for remote
      sizes="80px"              // responsive hint
      className="rounded-full"
    />
  );
}

// Responsive image
function ProductImage({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt="Product"
      fill                      // fills parent container
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      style={{ objectFit: 'cover' }}
      loading="lazy"            // default (use priority for above-fold)
    />
  );
}

// next.config.js — remote image domains
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
    ],
    formats: ['image/avif', 'image/webp'], // default
  },
};

// ──── next/font — zero layout shift fonts ────
import { Inter, Roboto_Mono } from 'next/font/google';
import localFont from 'next/font/local';

// Google Font — self-hosted at build time (no network request)
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',           // font-display: swap
  variable: '--font-inter',  // CSS variable
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
});

// Local font
const myFont = localFont({
  src: './fonts/MyFont.woff2',
  display: 'swap',
  variable: '--font-custom',
});

// Apply in layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

// Use in Tailwind
// tailwind.config.ts
// fontFamily: { sans: ['var(--font-inter)'], mono: ['var(--font-roboto-mono)'] }

// ──── next/script — strategy-based loading ────
import Script from 'next/script';

function Layout() {
  return (
    <>
      {/* beforeInteractive: load before page hydration (critical) */}
      <Script
        src="/polyfill.js"
        strategy="beforeInteractive"
      />
      
      {/* afterInteractive: load after hydration (default — analytics) */}
      <Script
        src="https://analytics.example.com/script.js"
        strategy="afterInteractive"
        onLoad={() => console.log('Analytics loaded')}
      />
      
      {/* lazyOnload: load during browser idle (non-critical) */}
      <Script
        src="https://chat-widget.example.com/widget.js"
        strategy="lazyOnload"
      />
      
      {/* worker: run in web worker (experimental) */}
      <Script
        src="https://heavy-computation.js"
        strategy="worker"
      />
      
      {/* Inline script */}
      <Script id="structured-data" type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'My Site',
        })}
      </Script>
    </>
  );
}
```

### Optimization Summary
| Feature | What It Does | Impact |
|---|---|---|
| next/image | Auto resize, WebP/AVIF, lazy load | ~40% smaller images |
| next/font | Self-host fonts, preload, no CLS | Zero layout shift |
| next/script | Strategy-based loading | Reduced blocking |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"next/image: auto WebP/AVIF, responsive srcset, lazy loading, blur placeholder. next/font: self-hosts Google Fonts at build (zero external requests), CSS variables, zero CLS. next/script: beforeInteractive (critical), afterInteractive (analytics), lazyOnload (non-essential). All built-in, no extra config."*

## 4. 🧠 MEMORY AID
**"Image: auto format + sizes + priority/lazy. Font: self-hosted Google, --font-var, zero CLS. Script: beforeInteractive < afterInteractive < lazyOnload < worker."**
