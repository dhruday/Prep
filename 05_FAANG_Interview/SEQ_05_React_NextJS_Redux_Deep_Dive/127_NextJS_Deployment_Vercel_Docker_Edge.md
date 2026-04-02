# 127. Next.js Deployment — Vercel, Self-Hosting, Docker, Edge
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Next.js supports three deployment targets: **Vercel** (zero-config, native integration — ISR on CDN edge, serverless functions, Edge Middleware, analytics built-in), **self-hosted Node.js** (`next start` after `next build`, runs as a Node.js process — full Next.js feature support but requires your own infrastructure), and **static export** (`output: 'export'` in `next.config.js` — pure HTML/CSS/JS, deploys to any CDN or object storage, but no Server Components, no Route Handlers, no ISR). For containerized deployment, `output: 'standalone'` mode generates a minimal self-contained output with only production dependencies, ideal for Docker images. Enterprise environments (SAP, Cisco) typically self-host for data residency compliance; startups default to Vercel for zero ops. Understanding all three — including their trade-offs — is what separates senior engineers who design deployment architecture from those who just ship code.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Deployment Mode Comparison

```
Mode              | command               | Supports SSR/ISR | Supports Server Components | Ops overhead
------------------|---------------------- |-----------------|----------------------------|-------------
Vercel            | git push              | ✅ Native        | ✅                         | Zero
Node.js server    | next start            | ✅ Full          | ✅                         | Medium
Docker/standalone | Docker + next start   | ✅ Full          | ✅                         | Medium
Static export     | next build + export   | ❌               | ❌ (client only)           | Zero
```

### Vercel Deployment — How It Works

```
git push → Vercel CI:
  next build runs
  ├── Static pages (SSG/ISR) → Vercel Edge Network CDN
  ├── Dynamic pages (SSR) → Vercel Serverless Functions (per-request Lambda)
  ├── Route Handlers → Vercel Serverless Functions
  ├── Middleware → Vercel Edge Functions (V8 isolate, global PoP)
  └── Static assets → Vercel CDN

ISR on Vercel:
  - Stale page cached at CDN edge
  - On expiry: Vercel has persistent cache storage per region
  - Background regeneration: Next.js SSG function runs, updates CDN cache
  - On-demand: revalidateTag() calls Vercel cache purge API

Special Vercel features:
  - Preview deployments: every PR = production-like URL
  - Edge Config: ultra-low-latency key-value store (read in middleware < 1ms)
  - Vercel KV (Redis): distributed, durable KV
  - Vercel Postgres (Neon): serverless Postgres with HTTP driver (works in Edge)
  - Analytics: automatic Core Web Vitals per page without JS added
```

### Self-Hosted Node.js

```bash
# Production build and start
npm run build    # next build → .next/ directory
npm start        # next start — requires Node.js process manager

# Use PM2 for process management:
npm install -g pm2
pm2 start "npm start" --name nextjs
pm2 startup       # configure auto-restart on server reboot
pm2 save

# Or using ecosystem file:
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nextjs-app',
    script: 'node_modules/.bin/next',
    args: 'start',
    instances: 'max',          // scale to CPU count (cluster mode)
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
};
```

```nginx
# nginx reverse proxy config (SSL termination + forwarding)
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve Next.js static assets from CDN or let nginx cache them:
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### Docker — Standalone Output

```dockerfile
# next.config.js — enable standalone output
# module.exports = { output: 'standalone' }

# Standalone output: .next/standalone/ contains:
#  - Minimal Node.js server (server.js)
#  - Only production node_modules (no devDependencies)
#  - All required code, no unnecessary files
# Result: Docker image ~200MB vs standard approach ~1GB

# Dockerfile — multi-stage build
FROM node:20-alpine AS base

# ---- Stage 1: Install dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# ---- Stage 2: Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (baked into static pages)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---- Stage 3: Production runner (minimal image) ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Don't run as root — security requirement
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what's needed from standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone mode provides server.js directly
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml — local development / testing
version: '3.8'
services:
  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_API_URL: https://api.example.com
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/myapp
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: http://localhost:3000
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Static Export — Pure Static Sites

```typescript
// next.config.js — configure static export
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Static export requires explicit base path if not at root
  // basePath: '/docs',
  // distDir: 'out',  // default: 'out'

  // Required for static export: images cannot use Next.js optimization endpoint
  images: {
    unoptimized: true,  // or use a third-party image optimization service
  },
};

// Deploy 'out/' directory to:
// - AWS S3 + CloudFront
// - GitHub Pages
// - Netlify
// - Any CDN/object storage

// Static export CANNOT use:
// ❌ Server Components that fetch on the server
// ❌ Route Handlers (API routes)
// ❌ Middleware
// ❌ ISR
// ❌ cookies() / headers()
// ✅ Client Components, static SSG, generateStaticParams
```

### Environment Variables — Critical Patterns

```typescript
// next.config.js — Security: never expose server secrets to client
// NEXT_PUBLIC_* → exposed to browser (in JS bundle)
// Everything else → server-only

// .env.local (never commit to git)
DATABASE_URL=postgresql://...         // Server only — never expose
AUTH_SECRET=...                       // Server only
STRIPE_SECRET_KEY=...                 // Server only
STRIPE_WEBHOOK_SECRET=...             // Server only

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...   // Safe: publishable key for client
NEXT_PUBLIC_API_URL=https://api.example.com // Safe: public URL for client

// Accessing in code:
// Server Component / Route Handler / Server Action:
const dbUrl = process.env.DATABASE_URL;  // ✅ available server-side only

// Client Component:
const apiUrl = process.env.NEXT_PUBLIC_API_URL;  // ✅ inlined at build time
const dbUrl = process.env.DATABASE_URL;           // ❌ undefined in browser — intentional

// Runtime validation (prevent startup with missing config):
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
// If any required env var is missing: throws at startup with a clear error message
// Much better than cryptic runtime failures later
```

### ISR Cache Handlers (Self-Hosted)

```typescript
// For self-hosted deployments, Next.js by default caches ISR to disk
// For multi-replica deployments, use a distributed cache:

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheHandler: require.resolve('./cache-handler.js'),
  cacheMaxMemorySize: 0,  // disable in-memory cache (use Redis only)
};

// cache-handler.js  (implements Next.js cache handler interface)
const { Redis } = require('@upstash/redis');

const client = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

module.exports = class CacheHandler {
  async get(key) {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }
  async set(key, data, ctx) {
    const ttl = ctx.revalidate;  // use ISR revalidate time as Redis TTL
    await client.set(key, JSON.stringify(data), ttl ? { ex: ttl } : undefined);
  }
  async revalidateTag(tag) {
    // Purge by tag — requires storing tag→key relationships
    const keys = await client.smembers(`tag:${tag}`);
    if (keys.length) await client.del(...keys);
  }
};
// This allows multi-instance deployments (Kubernetes, ECS) to share ISR cache
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the application deployed on SAP BTP (Business Technology Platform) — no Vercel. Multi-stage Docker build with standalone output reduced the container image from 1.2GB (naive build) to 185MB (standalone + non-root user). ISR cache was shared across 3 replicas via an Upstash Redis cache handler, otherwise each replica had its own cache and users got inconsistent page versions depending on which replica served them. The non-root user in Docker (security requirement for SAP compliance) required explicit `chown` on the `.next/` directory in the Dockerfile.

**At FAANG scale:**
- **Microsoft:** Azure Kubernetes Service — Next.js in Docker (`output: 'standalone'`), 10 replicas, shared Redis cache handler for ISR, Azure CDN in front for static assets; `output: 'export'` for purely static documentation sites served from Azure Blob Storage + CDN
- **Adobe:** Docker on AWS ECS Fargate — auto-scaling by request count; ISR via Redis ElastiCache; CloudFront CDN distributing static assets with 1-year cache headers on `/_next/static/**`
- **Salesforce:** Self-hosted on Salesforce Hyperforce (private cloud) — data residency compliance mandates; standalone Docker image; no external CDN for compliance, in-house CDN layer
- **Cisco:** Kubernetes with Helm charts — rolling deployments, readiness probe on `/_next/health` Route Handler, shared distributed cache across pods

---

## 💬 4. Interview Execution

### Sample Answer

> "Next.js has three deployment shapes: Vercel (native integration, zero-ops), self-hosted Node.js process, and static export for fully static sites.
>
> For enterprise deployments, I use Docker with `output: 'standalone'` — Next.js generates a minimal self-contained server.js with only production dependencies, which cuts the Docker image from over 1GB to around 180-200MB. Multi-stage Dockerfile: dependency install stage, build stage (needs env vars as ARG for build-time baking), and a minimal runner that copies only `.next/standalone/` and runs as a non-root user for security.
>
> The tricky part of self-hosted is ISR across multiple replicas — by default each instance caches to disk, so you get inconsistent responses if you have load balancing. The fix is a custom cache handler that uses Redis as the shared cache backend. Next.js has a stable cache handler interface where you implement `get`, `set`, and `revalidateTag` methods.
>
> For environment variables: the rule is `NEXT_PUBLIC_*` is inlined into the client bundle at build time — everything else is server-only. I always add Zod validation on `process.env` at startup so missing required config fails fast with a useful error message instead of crashing mysteriously at runtime."

---

## 💻 5. Code Example

```dockerfile
# Production Dockerfile for Next.js standalone
# next.config.js: output: 'standalone'

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

```typescript
// Env validation — lib/env.ts
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

// Throws at startup if any required var is missing
export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
```

---

## 🧠 6. Memory Aid

**VSDS — four deployment options:**
- **V**ercel: zero-ops, ISR on CDN, best for startups/rapid iteration
- **S**tatic export: CDN-only, no server runtime, no SSR, `output: 'export'`
- **D**ocker standalone: `output: 'standalone'` — minimal image, non-root, multi-stage
- **S**elf-hosted Node: `next start`, nginx reverse proxy, PM2, Redis ISR cache

**Environment variable rule:**
- `NEXT_PUBLIC_*` → inlined at build time → in browser JS bundle
- Everything else → server-only → undefined in browser (by design)

**ISR multi-replica:** always use shared Redis cache handler — disk cache = inconsistent responses per replica.

**Mnemonic:** **VSDS** — Vercel, Static, Docker, Self-host — choose by ops capacity and data residency requirements.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ "How do you deploy Next.js in an enterprise environment that can't use Vercel?" is a real question at Microsoft, Cisco, and SAP — Docker standalone + nginx + Redis ISR cache is the correct answer, and most candidates only know Vercel
→ The ISR multi-replica cache consistency problem is a subtle gotcha that candidates who've only deployed single-instance apps don't know about — knowing the cache handler interface and Redis solution shows production-grade engineering experience
→ Non-root Docker user is a specific security hardening step required by most enterprise container security policies (SOC 2, ISO 27001 controls) — mentioning it proactively in a security-conscious company like Cisco or Microsoft differentiates you

**How it works (2 sentences):**
`output: 'standalone'` tells Next.js's webpack build to perform a static analysis of the dependency tree and emit only the files actually imported by server-side code (using Node.js module tracing), plus a minimal `server.js` that replaces the full Next.js CLI — the resulting `.next/standalone/` directory contains everything needed to run `node server.js` without installing `node_modules`, because all dependencies are included as flattened files.
Vercel's ISR implementation works differently from self-hosted: Vercel maintains a distributed edge cache across all its PoPs where pre-rendered pages are stored, and when `revalidateTag()` is called (from a Server Action or Route Handler), Next.js makes an API call to Vercel's cache purge endpoint that invalidates the tagged cache entries across all regions simultaneously — meaning on-demand revalidation is globally consistent within ~100ms, whereas self-hosted ISR with Redis achieves the same by having the custom cache handler delete Redis keys with the matching tag.

---
✅ Topic 127/486 complete → Continuing to Topic 128: React Performance — Profiler, DevTools, Metrics
