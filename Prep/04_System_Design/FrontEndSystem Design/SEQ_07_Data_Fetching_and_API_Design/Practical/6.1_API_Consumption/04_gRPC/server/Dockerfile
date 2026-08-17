# ─── Stage 1: Build TypeScript ───────────────────────────────────────────────
# Build context is the 04_gRPC/ directory (set in docker-compose.yml).
# All COPY paths are relative to that context root.
FROM node:20-alpine AS builder

WORKDIR /app

# ── Install deps first (Docker layer-cache optimisation) ─────────────────────
COPY server/package*.json ./
RUN npm install

# ── Copy source + proto ───────────────────────────────────────────────────────
COPY server/tsconfig.json ./
COPY server/src            ./src
COPY proto                 ./proto

# ── Compile TypeScript → dist/ ────────────────────────────────────────────────
RUN npx tsc

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Only production deps
COPY server/package*.json ./
RUN npm install --omit=dev

# Compiled JS and proto definition
COPY --from=builder /app/dist  ./dist
COPY --from=builder /app/proto ./proto

EXPOSE 50051

CMD ["node", "dist/server.js"]
