# 349 – Dockerfile for Node/Frontend Apps

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION
A Dockerfile defines how to containerize a frontend app. For static apps: build with Node → serve with Nginx. For SSR (Next.js): build and run with Node. Key principles: small images, layer caching, non-root user, minimal dependencies.

## 2. 🔬 DEEP-DIVE EXPLANATION

```dockerfile
# ──── SIMPLE: Static React/Vite App ────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ──── SSR: Next.js App ────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

```nginx
# nginx.conf for SPA routing
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    
    # SPA: serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### Best Practices
| Practice | Why |
|---|---|
| Use `alpine` images | 5MB vs 100MB+ |
| Multi-stage builds | Separate build from runtime |
| `npm ci` not `npm install` | Deterministic, faster |
| Non-root user | Security |
| `.dockerignore` | Exclude node_modules, .git |
| Copy package*.json first | Layer caching for deps |

```
# .dockerignore
node_modules
.git
.env
dist
coverage
```

## 3. 🎯 INTERVIEW-ORIENTED ANSWER
*"I use multi-stage Dockerfiles: build stage with Node (install deps, build), runtime stage with Nginx/Alpine (serve static files). This produces ~25MB images vs 1GB+. For Next.js SSR, I use standalone output mode with a non-root user."*

## 4. 🧠 MEMORY AID
**"Multi-stage: Node builds → Nginx serves. Alpine for small images. Copy package.json first for layer caching. Non-root user for security."**

## 5. 🎯 KEY INSIGHT
Copy `package*.json` before `COPY . .` — Docker caches layers, so dependency install only reruns when lockfile changes, not on every code change.
