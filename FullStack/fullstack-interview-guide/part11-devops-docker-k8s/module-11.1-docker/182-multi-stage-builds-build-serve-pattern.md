# Multi-Stage Builds — Build + Serve Pattern
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The problem**: a Dockerfile that builds the app (needs Maven + JDK + source code) produces an image with all of those — you end up shipping 600 MB when your app is 60 MB; build tools have their own vulnerabilities and waste registry space
- **Multi-stage solution**: use two (or more) `FROM` instructions in one Dockerfile; the first stage builds (uses a full JDK + Maven); the second stage serves (uses JRE only); only files explicitly `COPY --from=builder` carry over — the build stage is discarded
- **Result for Spring Boot**: Stage 1 (builder) — JDK 21 + Maven + source → compiled JAR; Stage 2 (runtime) — JRE only + JAR only → final image 150-280 MB instead of 600 MB; Maven, source files, test classes — gone
- **Spring Boot layer tool**: `java -Djarmode=layertools -jar app.jar extract` splits the JAR into 4 sub-layers: dependencies (rarely change), spring-boot-loader (rarely changes), snapshot-dependencies (occasionally changes), application classes (changes on every commit); separate layers = faster CI rebuilds
- **React/Angular pattern**: Stage 1 (node:20) — `npm ci && npm run build`; Stage 2 (nginx:alpine) — copy `dist/` folder only; no node_modules, no source, no TypeScript in production image → 25 MB vs 500 MB
- 🆕 **Gap topic for Hruday**: "I've used multi-stage builds at SAP for our React frontend containers. I've extended that knowledge to the Spring Boot layer extraction pattern after studying it — the pattern that gives 10-second CI rebuilds instead of 60-second ones"

---

## 1. One-Line Definition
Multi-stage builds use multiple `FROM` statements in one Dockerfile to separate the build environment (with all its tools and dependencies) from the final runtime image — so only the compiled artefact makes it into the image that gets deployed.

---

## 2. The Problem It Solves

Without multi-stage builds, you face a choice. Option A: build the application inside the Dockerfile. The Dockerfile becomes a self-contained build system but the final image includes the build tools. A Spring Boot project needs Maven, the JDK, and the source code to compile. After compilation you have a JAR. But the Maven local repository, the JDK compiler tools, and the source code are all still in the image — they don't get removed. Final image: 600-700 MB.

Option B: build outside Docker, copy the JAR in. The Dockerfile is small and clean, the image is small, but now the build step is out of the Dockerfile and depends on having the right version of Maven and Java on the CI server. You've reintroduced the environment inconsistency that Docker was supposed to solve.

Multi-stage builds resolve this tension. You write one Dockerfile. Stage 1 has Maven + JDK — it compiles. Stage 2 has only the JRE — it copies the compiled JAR from Stage 1. Stage 1 is never saved to any registry. The final image (`docker build` output) is only Stage 2. You get build reproducibility AND a small, clean production image.

The number matters: a 150 MB production image vs a 650 MB one means: 30% faster pod startup times during scaling events, 60% lower registry storage costs, and a smaller attack surface (Maven, unused JDK tools, and source code all removed from what attackers can examine if they get into the container).

---

## 3. How It Works Internally

### The Build Stage Graph

```
Single-stage (the old way):
┌────────────────────────────────────────────────────────┐
│ FROM openjdk:21                                        │
│ COPY . /app                                            │
│ RUN mvn clean package (downloads deps, compiles)       │
│ ENTRYPOINT ["java", "-jar", "target/app.jar"]          │
│                                                        │
│ Final image contains:                                  │
│   JDK (compiler + tools)   ~380 MB                     │
│   Maven binary             ~10 MB                      │
│   Maven .m2 cache          ~400 MB  ← WASTED           │
│   Source code              ~10 MB   ← UNNECESSARY      │
│   Compiled JAR             ~60 MB   ← what we NEED     │
│   ─────────────────────────────────                   │
│   TOTAL:                   ~860 MB                     │
└────────────────────────────────────────────────────────┘

Multi-stage:
┌─────────────────────────────────┐
│ STAGE 1: builder                │  → EXISTS ONLY DURING BUILD
│ FROM maven:3.9-eclipse-temurin-21│     (never saved to registry)
│ COPY pom.xml .                  │
│ RUN mvn dependency:resolve      │     Cached layer
│ COPY src/ src/                  │
│ RUN mvn package -DskipTests     │
│                                 │
│ Contains: JDK + Maven + source  │
│           + .m2 cache + JAR     │
└──────────────┬──────────────────┘
               │  COPY --from=builder target/app.jar  ./app.jar
               ▼  (only the JAR crosses the stage boundary)
┌─────────────────────────────────┐
│ STAGE 2: runtime               │  → THE FINAL IMAGE (saved to registry)
│ FROM eclipse-temurin:21-jre-jammy
│ COPY --from=builder /app.jar . │
│ ENTRYPOINT ["java", "-jar",    │
│             "app.jar"]         │
│                                 │
│ Contains: JRE + JAR only        │
│ SIZE: ~280 MB                   │
└─────────────────────────────────┘
```

### Spring Boot Layer Extraction — The Real Production Pattern

Spring Boot's JAR is a "fat JAR" — it contains the app's classes + all Spring Boot framework JARs + all third-party dependency JARs zipped together. If you copy the JAR as a single unit into each Docker layer, then every code change requires copying the full 60 MB JAR.

Spring Boot provides `layertools` to split the fat JAR into separate layers by change frequency:

```
Spring Boot fat JAR layers (after extraction):
  dependencies/         ~40 MB  → your pom.xml dependencies
                                   Changes only when you add/remove dependencies
                                   Cached for most commits
  
  spring-boot-loader/   ~0.3 MB → Spring Boot's JAR launcher
                                   Changes only when Spring Boot version upgrades
                                   Almost always cached

  snapshot-dependencies/ ~2 MB  → SNAPSHOT version deps (dev builds)
                                   Changes occasionally

  application/          ~2-5 MB → YOUR code (controllers, services, etc.)
                                   Changes on EVERY commit

Without layer extraction:
  Code change → entire 60 MB JAR layer is recreated and re-pushed to registry
  CI: 60 seconds to push the 60 MB JAR layer each time

With layer extraction:
  Code change → only application/ layer (~2-5 MB) is new
  CI: 5 seconds to push the tiny application layer
  dependencies/ layer (40 MB): cached → pulled from registry → instant
```

### React/Angular Multi-Stage

```
React multi-stage (same pattern, different tools):

Stage 1: node:20-alpine
  → npm ci (installs all dev dependencies)
  → npm run build (TypeScript compile, webpack bundle → dist/)
  
Stage 2: nginx:alpine
  → copy dist/ folder from Stage 1
  → nginx serves the static files
  
Final image:
  NO TypeScript, NO node_modules, NO webpack, NO ts-loader
  Just dist/ (HTML, JS bundles, CSS) + nginx
  SIZE: ~25 MB vs ~550 MB for the node-only approach
```

---

## 4. The Code

### Wrong Way — Single Stage (Build Tools in Production Image)
```dockerfile
# Single-stage — build tools end up in the production image
FROM maven:3.9-eclipse-temurin-21    
# This image has Maven + JDK == 650 MB base

WORKDIR /app

COPY . .
# Copies source code, pom.xml, tests, everything

RUN mvn clean package -DskipTests
# Compiles, downloads dependencies into /root/.m2 — all of this sits in the image

EXPOSE 8080

# The final image contains:
# Maven binary: ~10 MB
# Maven .m2 cache: ~400 MB  (all your dependencies cached here)
# Source code: ~10 MB
# Your JAR: ~60 MB
# TOTAL: 650+ MB that goes into the container registry on every build
ENTRYPOINT ["java", "-jar", "target/payment-service.jar"]
```

> **Why this fails in production:** The Maven repository cache (~400 MB) is stored inside the image. Every developer or pod that pulls this image downloads 400 MB of JARs they'll never use — they're already compiled into the application JAR. The build JDK is included, which has higher CVE counts than the JRE-only image. The source code is inside the production container — any attacker who gets into the container can read your source.

### Right Way — Multi-Stage Build (Production Grade)

**Standard two-stage for Spring Boot:**
```dockerfile
# ======= STAGE 1: Build stage =======
# Full Maven + JDK image — only exists during build, never in the registry
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Step 1: Copy ONLY pom.xml first
# This layer changes only when dependencies change (rarely)
# Docker caches it — subsequent builds skip maven dependency download
COPY pom.xml .

# Download all dependencies using the pom.xml
# This layer is cached as long as pom.xml doesn't change
RUN mvn dependency:resolve --no-transfer-progress -q

# Step 2: Copy source code (changes on every commit)
COPY src/ src/

# Compile and package — use the cached dependency layer
# -DskipTests: tests run in a separate CI step, not inside docker build
RUN mvn package -DskipTests --no-transfer-progress

# ======= STAGE 2: Runtime stage =======
# Only JRE — no Maven, no JDK, no source, no .m2 cache
FROM eclipse-temurin:21-jre-jammy AS runtime

RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --no-create-home appuser

WORKDIR /app

# COPY --from=builder: pull ONLY the JAR from Stage 1
# Everything else in Stage 1 is discarded
COPY --from=builder /app/target/payment-service.jar app.jar

RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", "app.jar"]
```

**Advanced: Spring Boot layer extraction (fastest CI builds):**
```dockerfile
# ======= STAGE 1: Build stage =======
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve --no-transfer-progress -q
COPY src/ src/
RUN mvn package -DskipTests --no-transfer-progress

# ======= STAGE 2: Layer extraction stage =======
# Use Spring Boot's layertools to split the fat JAR into separate layers
FROM eclipse-temurin:21-jre-jammy AS layer-extractor

WORKDIR /app
COPY --from=builder /app/target/payment-service.jar app.jar

# Extract the JAR into separate directories by change frequency
# This creates: dependencies/, spring-boot-loader/, snapshot-dependencies/, application/
RUN java -Djarmode=layertools -jar app.jar extract

# ======= STAGE 3: Final runtime stage =======
FROM eclipse-temurin:21-jre-jammy AS runtime

RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --no-create-home appuser

WORKDIR /app

# Copy each layer separately — Docker caches them independently
# Order: most stable → least stable
# (stable layers are almost always cache hits; only the last layer changes often)

# 1. Spring Boot launcher classes — changes only on Spring Boot version upgrade
COPY --from=layer-extractor /app/spring-boot-loader/ ./

# 2. Third-party dependencies — changes when pom.xml changes
COPY --from=layer-extractor /app/dependencies/ ./

# 3. SNAPSHOT dependencies — changes on dev builds
COPY --from=layer-extractor /app/snapshot-dependencies/ ./

# 4. Application classes — changes on every commit (the "hot" layer)
COPY --from=layer-extractor /app/application/ ./

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8080

# Use the Spring Boot launcher class directly (not -jar)
# This is how Spring Boot recommends launching from layered JARs
ENTRYPOINT ["java", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "org.springframework.boot.loader.launch.JarLauncher"]
```

**React/Angular multi-stage:**
```dockerfile
# ======= STAGE 1: Build =======
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first — cached as long as package.json doesn't change
COPY package.json package-lock.json ./

# npm ci: uses lock file exactly — more reproducible than npm install
# --frozen-lockfile ensures lock file isn't updated (fail if lock file outdated)
RUN npm ci

# Copy source (changes on every commit)
COPY . .

# Build for production — optimised bundle, tree-shaken, minified
RUN npm run build
# Output: /app/dist/ (or /app/build/ for CRA)

# ======= STAGE 2: Serve =======
FROM nginx:1.27-alpine AS runtime

# Remove the default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add custom nginx config optimised for SPA routing
COPY nginx.conf /etc/nginx/conf.d/

# Copy only the compiled dist/ from Stage 1
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# No TypeScript, no node_modules, no webpack configs in the final image
# Final image size: ~25 MB

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf — for SPA routing (React Router / Angular Router deep links)
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Serve static files directly
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # For any route not matching a static file, return index.html
    # This lets React Router / Angular Router handle the URL client-side
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Build and verify:**
```bash
# Build with layer extraction
docker build -t payment-service:1.0.0 .

# Compare sizes
docker images | grep payment-service
# payment-service    1.0.0    abc123    152MB  ← with layer extraction
# vs old single-stage image: 860MB

# Verify what's in the final image (should only show JRE + app layers)
docker history payment-service:1.0.0

# Run a code-only change rebuild (simulates normal CI):
# Change one Java file, rebuild
time docker build -t payment-service:1.0.1 .
# With layer caching: ~8 seconds (only application/ layer rebuilds)
# Without layer extraction: ~65 seconds (entire JAR re-copied)
```

> **Key decisions here:**
> - Three-stage build (builder → extractor → runtime) separates concerns cleanly; the extractor stage could be merged into the builder stage but keeping it separate makes the intent explicit
> - `mvn dependency:resolve` before `COPY src/` — this is the critical ordering that caches the 400 MB dependency download; without this, any code change invalidates the dependency download layer
> - `--no-transfer-progress` on Maven commands — suppresses the download progress bars that bloat CI logs; irrelevant to functionality but improves CI readability
> - `JarLauncher` instead of `-jar` for the layered JAR — Spring Boot's layered extraction puts classes in a non-standard layout; `JarLauncher` (Spring's own launcher class) knows how to find them; `-jar` would fail

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a multi-stage Docker build and why would you use it for a Spring Boot service?"

**Hruday's answer:**
> A multi-stage build uses multiple `FROM` statements in a single Dockerfile. Each stage is a separate build environment. You can copy files between stages with `COPY --from=stagename`. Only the final stage becomes the image that gets pushed to the registry.
>
> For a Spring Boot service, I use two stages. Stage 1 is the builder — it uses a `maven:3.9-eclipse-temurin-21` image which has both Maven and the full JDK. I copy in the pom.xml, resolve dependencies, then copy the source and compile to produce a JAR. Stage 2 is the runtime — it uses `eclipse-temurin:21-jre-jammy`, which is just the JRE with no compiler. I copy only the compiled JAR from Stage 1 into Stage 2. Stage 1 is discarded after the build.
>
> The result: a production image of about 280 MB versus 650-900 MB for a single-stage build. Maven, the JDK, all cached .m2 dependency JARs, and the source code are all absent from the production image. Smaller means faster to pull, less attack surface, lower registry costs. At SAP, switching our main service from single to multi-stage saved about 400 MB per image across 5 environments.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is Spring Boot's layer extraction and how does it speed up CI builds?"

**Hruday's answer:**
> A standard Spring Boot fat JAR bundles everything together — your application classes plus all 40-50 MB of Spring Boot and third-party JARs in one file. Every time you change a single Java class, the entire 60 MB JAR is treated as a new Docker layer, re-uploaded to the registry, and re-pulled on deployments.
>
> Spring Boot 2.3+ includes a feature called `layertools`. When you run `java -Djarmode=layertools -jar app.jar extract`, it splits the fat JAR into four directories sorted by change frequency: `dependencies` (third-party JARs — 40 MB, changes only when pom.xml changes), `spring-boot-loader` (Spring's launcher — 0.3 MB, almost never changes), `snapshot-dependencies` (SNAPSHOT jars — small, changes occasionally), and `application` (your code — 2-5 MB, changes on every commit).
>
> In the Dockerfile, I copy each directory as a separate layer in that order — most stable first. Docker caches each layer independently. When a developer commits a code change, Docker checks: has `dependencies/` changed? No — cache hit, skip the 40 MB re-push. Has `spring-boot-loader/` changed? No — cache hit. Has `application/` changed? Yes — push the 2-5 MB application layer.
>
> Without layer extraction: 60-second push of the full JAR on every commit.
> With layer extraction: 5-second push of only the application layer on code-only changes.
> The dependencies layer is pushed only when pom.xml changes — maybe once a week.

---

### Q3 — Scenario
**Interviewer asks:** "How would you structure a multi-stage Dockerfile for a React frontend that gets served by nginx?"

**Hruday's answer:**
> Two stages. Stage 1 is the build stage using `node:20-alpine`. I copy `package.json` and `package-lock.json` first, run `npm ci` to install dependencies — this layer gets cached until the lock file changes. Then I copy the source code and run `npm run build`. This produces the optimised production bundle in `dist/`.
>
> Stage 2 is the runtime using `nginx:1.27-alpine`. I copy only the `dist/` folder from Stage 1. I also include a custom nginx config that handles SPA deep-link routing — `try_files $uri $uri/ /index.html` — so that React Router or Angular Router can handle paths like `/dashboard/users/123` without nginx returning a 404.
>
> The final image is about 25 MB versus ~550 MB for a node-only image. No TypeScript source code, no node_modules, no webpack config — nothing survives to the nginx stage except the compiled HTML, JavaScript bundles, and CSS.
>
> One practical addition: set `Cache-Control: public, max-age=31536000, immutable` on static assets in the nginx config. Vite and Webpack fingerprint bundle filenames with content hashes, so the same filename means the same content — browsers can cache them forever. This makes the frontend load nearly instant on return visits.

---

### Q4 — Trade-Off
**Interviewer asks:** "Are there any disadvantages to multi-stage builds?"

**Hruday's answer:**
> A few real trade-offs worth knowing.
>
> First, debugging is harder. If the build fails inside Stage 1, you can't easily exec into a running Stage 1 container — the stage doesn't produce a running container unless you explicitly target it with `docker build --target builder`. This means debugging a failing Maven compile step can be clunky compared to a single-stage Dockerfile where you'd just exec in and run the failing command interactively.
>
> Second, build caching across stages is less efficient than caching within a single stage. If Stage 1 and Stage 2 use completely different base images, they share no layers. For a team where most CI time goes to pulling base images, you might consider pre-pulling base images or using a base image that serves both purposes (rare but possible for Java services where the JDK image is used for build and JRE for runtime — the JRE is a subset of the JDK so you can't share layers between them directly).
>
> Third, the Dockerfile becomes longer and more complex. For a simple single-service project, a 60-line Dockerfile with three stages might feel like over-engineering compared to a 15-line single-stage file. For teams that don't already have Docker fluency, this can be a barrier to onboarding.
>
> These trade-offs are real but small compared to the benefits for any service that goes to production. The security and size benefits justify the complexity in a production environment.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Multi-stage = just two stages | "multi-stage means a builder stage and a runtime stage" | You can have as many stages as needed; Spring Boot's three-stage pattern (builder → extractor → runtime) is a real production pattern; test stages can also be separate from build stages |
| COPY without `--from` | "I copy the JAR into Stage 2 with COPY target/app.jar" | Without `--from=builder`, COPY reads from the build context (your disk), not from another stage; `COPY --from=builder /app/target/app.jar app.jar` is the correct syntax; forgetting `--from` is a common early mistake |
| Layer order for extraction | "I copy application/ first then dependencies/" | Wrong order — the most stable layer must be FIRST so it gets cached; cache invalidation is top-to-bottom; if dependencies/ changes (rare), you want to rebuild only from that point; if application/ changes (common), only that last layer needs rebuilding |
| Debugging multi-stage | "I can't debug my multi-stage build" | `docker build --target builder -t debug-image .` builds only up to the named stage; you can then exec into the debug-image and investigate; all stages are reachable |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I introduced multi-stage builds for our React frontend container. The original Dockerfile used a single node-based image and shipped with all of node_modules — the image was 540 MB. I added a second nginx stage, copying only the dist/ folder across, and the image dropped to 22 MB. The impact was immediate: the ECR pull time during auto-scaling events went from 45 seconds (pulling 540 MB) to 4 seconds (pulling 22 MB). I extended this learning to plan a similar optimisation for our Spring Boot service — switching to a multi-stage build with Maven in Stage 1 and JRE-only in Stage 2, plus Spring Boot layer extraction to make only the 3-4 MB application layer hot in CI, rather than the full 60 MB JAR."

---

## 8. Scale Evolution

**1,000 users/day →** Two-stage build for all containerised services — builder + runtime. The 70% image size reduction and cleaner security posture justifies the slightly more complex Dockerfile even for small services. A simple Dockerfile template with two stages is the standard starting point.

**100,000 users/day →** Spring Boot layer extraction for all Java services — the 5-second CI push vs 60-second push multiplied across many deployments per day saves significant pipeline time. React/Angular SPAs use the node + nginx pattern as standard. CI pipelines explicitly build and push intermediate stage images to a registry cache to enable cross-machine layer reuse (not just local caching).

**10 million users/day →** Four or more stages in some Dockerfiles — test stage, security-scan stage, build stage, runtime stage; each stage is independently verifiable. Base images are pulled and promoted through an internal registry (never pulled directly from Docker Hub in production CI) — prevents supply chain attacks where upstream images are compromised. BuildKit `--mount=type=cache` enables persistent Maven/npm caches across builds for maximum pipeline speed even with no layer-reuse opportunity.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every service in the payment platform lives in a container; large multi-service deployments mean any inefficiency multiplies; multi-stage is the baseline Dockerfile standard expected from senior engineers | Know layer extraction; explain the CI time and registry cost reduction concretely |
| Swiggy / Meesho | Large frontend codebases (React-heavy) + large backend surface; the node + nginx pattern for frontend delivery is standard; backend image sizes directly affect auto-scaling startup time during peak loads | Know the React multi-stage pattern; articulate the size difference (540 MB → 22 MB) |
| Adobe / Microsoft | Enterprise engineering standards require minimal attack surface in images; multi-stage is listed in their container security policies; they also run large internal service fleets where CI efficiency matters | Know the security rationale; explain what's absent from the runtime image |
| SAP Labs | SAP BTP (Business Technology Platform) mandates multi-stage builds for all production images; image size is a compliance concern; engineers are expected to know the pattern | Direct experience from SAP React frontend; connect to Spring Boot layer extraction knowledge |

---

## 10. Related Topics — What to Study Next

- **Topic 181 — Dockerfile instructions** — the foundation for understanding multi-stage builds; the `.dockerignore`, `COPY --from`, ENTRYPOINT exec form, and HEALTHCHECK concepts covered there complement this topic directly
- **Topic 183 — Docker Compose** — how multi-stage built images are used in a local development setup; Compose files reference the same Dockerfile and can target specific stages for different environments
- **Topic 191 — GitHub Actions** — the CI pipeline that runs `docker build`, uses build caches, and pushes images to ECR; the layer caching discussion in this topic directly maps to GitHub Actions `cache-from` and `cache-to` configuration
- **Topic 185 — Kubernetes architecture** — where these production images actually run; understanding pods pulling images from a registry and layer pull times motivates the size optimisation here
- **Practice**: take an existing Spring Boot project, write a three-stage Dockerfile with layer extraction, measure the rebuild time after a code-only change, and verify the image size; compare to a single-stage build

---

*Part 11 · Multi-Stage Builds — Build + Serve Pattern · Full Stack Interview Guide · Hruday D · 2026*
