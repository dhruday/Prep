# 466 – Deployment — Vercel, Self-Hosted, Edge

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Next.js deployment options: **Vercel** (zero-config, full feature support), **Self-hosted** (Node.js server, Docker), **Static export** (fully static site), **Edge** (Cloudflare Workers, Deno Deploy). Trade-offs: Vercel = easiest, self-hosted = full control, Edge = lowest latency, static = simplest infrastructure.

## 2. 🔬 DEEP-DIVE EXPLANATION

```tsx
// ──── VERCEL (recommended) ────
// Zero config — push to Git, auto-deploy
// Supports ALL Next.js features:
// - ISR, On-demand revalidation
// - Edge Middleware
// - Image Optimization
// - Analytics, Speed Insights
// - Preview Deployments (per PR)

// vercel.json (optional customization)
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"], // deploy to specific regions
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        { "key": "Cache-Control", "value": "s-maxage=60, stale-while-revalidate" }
      ]
    }
  ]
}

// ──── SELF-HOSTED (Node.js) ────
// Build and run
// $ next build
// $ next start -p 3000

// Docker deployment
// Dockerfile
/*
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
*/

// next.config.js — standalone output for Docker
const nextConfig = {
  output: 'standalone', // minimal production bundle
};

// ──── STATIC EXPORT ────
// next.config.js
const nextConfig = {
  output: 'export', // generates static HTML in /out
};

// Limitations:
// ❌ No Server Components (runtime)
// ❌ No API Routes
// ❌ No ISR/revalidation
// ❌ No Middleware
// ❌ No Image Optimization (use external)
// ✅ Deploy to any static host (S3, Netlify, GitHub Pages)

// ──── EDGE RUNTIME ────
// app/api/hello/route.ts
export const runtime = 'edge'; // run on Edge (not Node.js)

export async function GET() {
  return new Response('Hello from the Edge!');
}

// Page-level edge runtime
// app/fast-page/page.tsx
export const runtime = 'edge';

export default function FastPage() {
  return <h1>Rendered at the Edge</h1>;
}

// ──── ENVIRONMENT VARIABLES ────
// .env.local (not committed)
// DATABASE_URL=postgresql://...
// NEXT_PUBLIC_API_URL=https://api.example.com

// Server-only: process.env.DATABASE_URL
// Client-exposed: process.env.NEXT_PUBLIC_API_URL (NEXT_PUBLIC_ prefix)

// ──── HEALTH CHECK & MONITORING ────
// app/api/health/route.ts
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`; // check DB
    return NextResponse.json({ status: 'healthy', timestamp: new Date() });
  } catch {
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  }
}

// ──── CI/CD PIPELINE ────
// GitHub Actions example
/*
name: Deploy
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
*/
```

### Deployment Comparison
| Feature | Vercel | Self-Hosted | Static Export | Edge |
|---|---|---|---|---|
| Setup | Zero-config | Manual | Simple | Medium |
| Server Components | ✅ | ✅ | ❌ | ✅ |
| ISR | ✅ | ✅ | ❌ | Partial |
| Image Optimization | ✅ | ✅ (self) | ❌ | ❌ |
| Cost | Per usage | Fixed | Cheapest | Per invocation |
| Latency | Low (CDN) | Depends | Low (CDN) | Lowest |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Vercel: zero-config, all features. Self-hosted: output:'standalone' + Docker for control. Static export: output:'export' for simple hosting (no SSR/ISR). Edge runtime: runtime='edge' for lowest latency. NEXT_PUBLIC_ prefix for client env vars. Health checks + CI/CD for production."*

## 4. 🧠 MEMORY AID
**"Vercel = zero-config. Self-hosted = output:'standalone' + Docker. Static = output:'export' (no SSR). Edge = runtime:'edge'. NEXT_PUBLIC_ for client vars."**
