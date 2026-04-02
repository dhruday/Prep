# 351 – Environment Variables in Containerised Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Frontend env vars are tricky in containers because static builds inline env vars at **build time** (not runtime). Solutions: build-time ARGs, runtime injection via `window.__ENV__`, entrypoint scripts that replace placeholders, or server-side rendering that reads env at request time.

## 2. 🔬 DEEP-DIVE EXPLANATION

### The Problem
```dockerfile
# ❌ BAD: Hardcoded at build time — same image can't run in staging AND prod
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
ENV VITE_API_URL=https://api.prod.com  # baked into bundle!
RUN npm run build
```

### Solution 1: Runtime Injection Script
```dockerfile
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY entrypoint.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/entrypoint.sh
```

```bash
#!/bin/sh
# entrypoint.sh — inject env vars at container start
cat > /usr/share/nginx/html/env-config.js << EOF
window.__ENV__ = {
  API_URL: "${API_URL:-https://default.api.com}",
  FEATURE_FLAGS: "${FEATURE_FLAGS:-{}}",
  SENTRY_DSN: "${SENTRY_DSN:-}"
};
EOF
```

```html
<!-- index.html -->
<script src="/env-config.js"></script>
<script type="module" src="/main.js"></script>
```

```typescript
// config.ts — read runtime env
const env = (window as any).__ENV__ || {};
export const config = {
  apiUrl: env.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000',
  sentryDsn: env.SENTRY_DSN || '',
};
```

### Solution 2: Build ARGs (different image per environment)
```dockerfile
FROM node:20-alpine AS build
ARG VITE_API_URL
ARG VITE_SENTRY_DSN
WORKDIR /app
COPY . .
RUN npm ci && npm run build
# Different image per env — simpler but less flexible
```

```yaml
# docker-compose.yml
services:
  frontend:
    build:
      args:
        VITE_API_URL: ${API_URL}
    environment:
      - API_URL=https://api.staging.com
```

### Solution 3: Next.js Runtime Config
```typescript
// next.config.js
module.exports = {
  publicRuntimeConfig: {
    apiUrl: process.env.API_URL, // available at runtime
  },
};
// Usage: import getConfig from 'next/config';
// const { publicRuntimeConfig } = getConfig();
```

### Comparison
| Approach | Same Image? | Complexity | Best For |
|---|---|---|---|
| Build ARGs | No (per-env image) | Simple | Small teams |
| window.__ENV__ | Yes | Medium | Static SPAs |
| SSR runtime config | Yes | Simple | Next.js/Nuxt |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Static frontends bake env vars at build time — problematic for multi-environment deployments. I use an entrypoint script that generates env-config.js from environment variables at container start. Same Docker image runs in staging and production with different env vars."*

## 4. 🧠 MEMORY AID
**"Build time: baked in bundle. Runtime: window.__ENV__ via entrypoint script. Same image, different envs = runtime injection."**

## 5. 🎯 KEY INSIGHT
The 12-factor app principle: config should come from the environment, not the build. For frontend, this means runtime injection, not build-time inlining.
