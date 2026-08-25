# 350 – Multi-Stage Builds – Build + Nginx Serve

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
Multi-stage Docker builds use multiple FROM statements to separate build-time dependencies from runtime. Stage 1: Node + all devDependencies to build. Stage 2: Nginx (or minimal Node) with only production artifacts. Result: tiny images (20-30MB vs 1GB+).

## 2. 🔬 DEEP-DIVE EXPLANATION

```dockerfile
# ──── STAGE 1: Build ────
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# At this point /app/dist contains static files
# Node, node_modules, source code = ~1GB

# ──── STAGE 2: Serve ────
FROM nginx:1.25-alpine AS production
# Only copy the built output — no Node, no source code
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security: run as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# Final image: ~25MB (nginx:alpine + static files)
```

### Image Size Comparison
```
Single stage (node:20 + all deps):     ~1.2 GB
Single stage (node:20-alpine):         ~400 MB
Multi-stage (nginx:alpine + dist):     ~25 MB   ← 50x smaller!
```

### Three-Stage Build (with testing)
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Test + Build
FROM deps AS build
COPY . .
RUN npm run lint && npm run type-check && npm test
RUN npm run build

# Stage 3: Production
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Benefits
| Benefit | Explanation |
|---|---|
| **Smaller images** | No Node.js, devDeps, source in production |
| **Faster deploys** | 25MB pulls in seconds vs minutes |
| **Security** | No build tools, no source code exposed |
| **Layer caching** | Dependencies stage cached separately |
| **CI/CD** | Tests run in build stage, fail early |

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"Multi-stage builds are essential: build with Node (full toolchain), serve with Nginx (just static files). The final image is ~25MB — 50x smaller than a single-stage build. I add a test stage in between for CI: deps → test → build → serve."*

## 4. 🧠 MEMORY AID
**"Stage 1: Node builds. Stage 2: Nginx serves. COPY --from=build only the dist/. Final image: tiny, secure, fast."**

## 5. 🎯 KEY INSIGHT
Multi-stage builds also improve security — the production image contains no source code, no node_modules, no build tools. Attack surface is minimal.
