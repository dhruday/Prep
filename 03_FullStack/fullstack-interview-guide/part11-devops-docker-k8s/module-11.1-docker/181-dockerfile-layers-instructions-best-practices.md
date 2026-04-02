# Dockerfile — Layers, Instructions, Best Practices
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Every instruction that writes to disk creates a layer** — `FROM`, `RUN`, `COPY`, `ADD`; layers are cached and reused; put things that change rarely at the top, things that change often (your app code) at the bottom — this keeps rebuilds fast
- **`.dockerignore` is mandatory** — like `.gitignore` for Docker; without it, `COPY . .` copies your local `node_modules/`, Maven `.m2/` cache, `.git/`, `.env` files, IDE config into the image — bloating it and potentially leaking secrets
- **`RUN` vs `CMD` vs `ENTRYPOINT`**: `RUN` executes at build time (installs packages, compiles); `CMD` is the default command when a container starts — can be overridden; `ENTRYPOINT` is the fixed command — `CMD` becomes arguments to it; use `ENTRYPOINT ["java", "-jar", "app.jar"]` for a Spring Boot service
- **`ENV` vs `ARG`**: `ARG` is build-time only (setting image versions for caching); `ENV` persists into the running container; never put secrets in either — they appear in `docker inspect` and image history
- **User security**: always `RUN adduser` and `USER appuser` before `ENTRYPOINT` — running the JVM as root inside the container is a security risk
- **Health check**: `HEALTHCHECK CMD curl -f http://localhost:8080/actuator/health || exit 1` — tells Docker (and Kubernetes) the container is ready to receive traffic
- 🆕 **Gap topic for Hruday**: "I've written Dockerfiles at SAP for local dev. I've deep-dived Dockerfile optimisation — layer caching, .dockerignore, ENTRYPOINT vs CMD, health checks — to write production-grade images"

---

## 1. One-Line Definition
A Dockerfile is a text file with sequential instructions that tells Docker how to build a container image — starting from a base image, adding files, running setup commands, and declaring how the container should start.

---

## 2. The Problem It Solves

Without a Dockerfile, you cannot reproduce an environment consistently. You might manually set up a server once — install Java, copy the JAR, set ENV vars — but that setup lives only in your head and on that server. When you need to run a second instance, deploy to staging, or hand off to another team, the entire setup is a mystery.

The Dockerfile solves this by making your environment setup code. It's version-controlled alongside your application. It's the single authoritative definition of what your application needs to run. A new developer on the team doesn't read a 20-page runbook — they run `docker build` and get an identical environment.

The practical problem most engineers run into: naive Dockerfiles that work but produce bloated images (1 GB+), slow builds (5+ minutes), and security vulnerabilities. A Spring Boot image that bakes in the Maven build tool, the entire JDK, and the local source code alongside the compiled JAR is 10× larger than it needs to be. A Dockerfile that invokes `npm install` or `mvn dependency:resolve` on every build ignores layer caching and wastes CI minutes. A Dockerfile that runs as root creates security risk.

This topic covers how to write a Dockerfile that's fast to build, small in output, and secure to run.

---

## 3. How It Works Internally

### The Build Context — What Docker Actually Sends

When you run `docker build .`, Docker sends the entire current directory to the Docker daemon as a "build context." This is a tar archive of every file in the directory. Docker then uses the Dockerfile to build the image FROM this context.

```
Without .dockerignore — what gets sent to Docker daemon:
  . (entire project directory)
  ├── src/                         (10 MB source code — ok)
  ├── target/                      (200 MB compiled output including test classes — OK-ish)
  ├── node_modules/                (500 MB if it's a frontend project — WASTE)
  ├── .git/                        (100 MB git history — WASTE, never needed in image)
  ├── .m2/                         (400 MB Maven cache — WASTE, never needed in image)
  ├── .env                         (contains DB_PASSWORD=... — LEAK)
  └── .idea/                       (IDE config — WASTE)
  
  TOTAL BUILD CONTEXT: ~1.2 GB
  Docker sends this over a local socket to daemon before building even starts
  Slow. Every build.

With .dockerignore — only what's needed is sent:
  . (filtered)
  ├── src/                         (10 MB — needed if building IN Docker)
  └── target/payment-service.jar  (60 MB — the only thing actually needed for the image)
  
  TOTAL BUILD CONTEXT: ~70 MB
  Fast. Secure. Nothing leaks.
```

### Dockerfile Instructions — What Each One Does

```
FROM image:tag
  → Sets the base image — the starting point
  → Every Dockerfile must begin with FROM (except ARG before FROM)
  → Use specific tags (eclipse-temurin:21-jre-jammy) never "latest"
    "latest" means the image can silently change — breaking your build

ARG VERSION=1.0.0
  → Build-time variable — exists ONLY during docker build
  → Can be passed with --build-arg VERSION=2.0.0 at build time
  → Does NOT persist into the running container
  → SAFE for build-time config (not for secrets — still visible in image metadata)

ENV JAVA_OPTS="-Xmx512m"
  → Runtime environment variable — persists into the running container
  → Accessible by your Spring Boot app via System.getenv() or ${ENV_VAR}
  → DO NOT use for secrets — visible in docker inspect and image history
  → Use for non-sensitive config: APP_ENV=production, LOG_LEVEL=info

RUN command
  → Executes at BUILD time — creates a layer in the image
  → Used for: package installation, cache busting, user creation, chmod
  → Best practice: chain multiple apt-get commands in one RUN with &&
    to avoid creating extra layers for each command
  → Always clean apt/yum caches at the end of an apt RUN layer

COPY source destination
  → Copies files from the build context INTO the image
  → Preferred over ADD (COPY is explicit — ADD has magic: auto-extracts tarballs)
  → Respects .dockerignore

ADD source destination
  → Like COPY but with magic: auto-extracts .tar.gz files
  → Prefer COPY — only use ADD when you specifically need the extraction feature

WORKDIR /app
  → Sets the working directory for all following RUN, COPY, CMD, ENTRYPOINT
  → Creates the directory if it doesn't exist
  → Prefer over RUN cd /app — WORKDIR is declarative and clearer

USER username
  → Switches from root to the specified user for all following commands
  → Always set before ENTRYPOINT or CMD

EXPOSE port
  → Documents which port the container listens on — does NOT publish it
  → Container still needs -p flag at docker run to map to host port
  → Important for documentation and for tools like Docker Compose

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1
  → Docker runs this command every 30s to check if the container is healthy
  → Exit 0 = healthy; Exit 1 = unhealthy
  → Docker marks container unhealthy after 3 consecutive failures
  → Kubernetes IGNORES Docker health checks (uses liveness/readiness probes instead)
  → Still useful for docker run/docker-compose environments

CMD ["java", "-jar", "app.jar"]
  → Default command run when container starts
  → CAN be overridden: docker run myimage java -jar different.jar
  → If ENTRYPOINT is set, CMD becomes default ARGUMENTS to ENTRYPOINT

ENTRYPOINT ["java", "-jar", "app.jar"]
  → Fixed command that always runs when container starts
  → CANNOT be overridden (without --entrypoint flag)
  → docker run myimage extra-arg → ENTRYPOINT runs with extra-arg appended
  → Use [exec form] (JSON array) not shell form for Signal handling:
    exec form: container PID 1 = java process → receives SIGTERM directly
    shell form: container PID 1 = /bin/sh → java is a child process → 
                SIGTERM goes to shell, java never gets graceful shutdown signal
```

### Layer Caching — Why Order Is Everything

```
SLOW Dockerfile (ignores caching):
FROM eclipse-temurin:21-jre-jammy
COPY . /app                           ← any file change = this layer gets busted
WORKDIR /app
RUN mvn clean package                 ← re-downloads ALL dependencies every time
ENTRYPOINT ["java", "-jar", "target/app.jar"]

FAST Dockerfile (dependencies cached):
FROM eclipse-temurin:21-jre-jammy    ← Layer 1: base (cached after first build)
WORKDIR /app
COPY pom.xml .                        ← Layer 2: pom.xml only (changes rarely)
RUN mvn dependency:resolve -q         ← Layer 3: downloads dependencies ONCE (cached until pom.xml changes)
COPY src/ src/                        ← Layer 4: source code (changes on every commit)
RUN mvn package -DskipTests           ← Layer 5: compile (runs only when src/ changes)
COPY target/app.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]

With this order:
→ Only src/ changes on most commits → only Layers 4 and 5 rebuild
→ Dependency download (Layer 3) is cached → saves 3-5 minutes
→ Build goes from 5 minutes → 30 seconds after first run
```

---

## 4. The Code

### Wrong Way — The Five Most Common Dockerfile Mistakes
```dockerfile
# Bad Dockerfile — multiple problems
FROM openjdk:21                        # Full JDK 600 MB — includes compiler you don't need
                                       # "latest" implied if no tag — unpredictable

WORKDIR /app

COPY . .                               # Copies EVERYTHING — .git, .m2, node_modules, .env
                                       # No .dockerignore = bloated context, possible secrets leak

RUN mvn clean package                  # Will fail: Maven not installed in the openjdk image
                                       # But even if it worked: downloads all deps every build

EXPOSE 8080

RUN useradd appuser                    # TOO LATE — RUN commands already ran as root
                                       # Should set up user earlier

# No USER instruction — container runs as root

ENTRYPOINT java -jar target/app.jar   # Shell form — java process is NOT PID 1
                                       # SIGTERM from docker stop goes to shell, not JVM
                                       # JVM doesn't do graceful shutdown
```

> **Why this fails in production:** Running java as shell form means `docker stop` and Kubernetes pod termination send SIGTERM to the shell, not the JVM. The JVM gets a SIGKILL after the grace period, cutting active requests. At SAP, this caused in-flight requests to be dropped during deployments — user sessions were lost. The fix is exec form ENTRYPOINT.

### Right Way — Production-Grade Dockerfile for Spring Boot
```dockerfile
# .dockerignore — create this file in same directory as Dockerfile
# (file contents, not Dockerfile syntax)
```

```
# .dockerignore
.git
.gitignore
.idea
*.iml
*.iws
target/
.mvn/wrapper/maven-wrapper.jar
Dockerfile*
docker-compose*
README.md
.env
.env.*
# Keep: src/, pom.xml — needed for build inside container
# OR if building outside (CI builds the JAR first):
# Keep only: target/*.jar
```

```dockerfile
# Production-grade Dockerfile for Spring Boot (non-multi-stage version)
# Multi-stage version in Topic 182

# IMPORTANT: Pin to a specific tag — never use "latest"
# eclipse-temurin is the actively maintained AdoptOpenJDK successor
# jre = only the runtime, no compiler (reduces image size by ~200 MB vs jdk)
# jammy = Ubuntu 22.04 LTS base (security patches available, widely supported)
FROM eclipse-temurin:21-jre-jammy

# Build argument for the JAR filename — allows CI to pass the version dynamically
# docker build --build-arg JAR_FILE=payment-service-2.1.0.jar .
ARG JAR_FILE=target/payment-service.jar

# Document the maintainer
LABEL maintainer="hruday.d@company.com"
LABEL version="1.0"
LABEL description="Payment Service"

# Create a non-root system user and group
# --system: gives lower UID range (no login shell, suitable for service accounts)
# --ingroup: assigns the user to a named group we create simultaneously
RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --no-create-home appuser

# Set working directory — all subsequent commands work from here
WORKDIR /app

# Copy the JAR from CI's build output into the image
# The JAR is already built outside this container in the CI pipeline
COPY ${JAR_FILE} app.jar

# Fix ownership — the JAR needs to be readable by appuser
RUN chown appuser:appgroup app.jar

# Switch from root to the application user — BEFORE ENTRYPOINT
USER appuser

# Document the port this service listens on
# Note: this does NOT publish the port — use -p at docker run time
EXPOSE 8080

# Health check used by docker-compose and docker run environments
# (Kubernetes ignores this and uses its own probes — Topic 188)
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=60s \
            --retries=3 \
            CMD curl -sf http://localhost:8080/actuator/health || exit 1

# EXEC form (JSON array) — CRITICAL for proper signal handling
# PID 1 inside the container will be the JVM process directly
# SIGTERM from "docker stop" → goes to JVM → Spring Boot runs shutdown hooks
# → active requests complete (up to 30s default), connections close cleanly
ENTRYPOINT ["java", \
            # Respect Docker cgroup memory limits (default true in Java 11+)
            "-XX:+UseContainerSupport", \
            # Use up to 75% of container memory limit for JVM heap
            # Remaining 25%: OS buffer, thread stacks, metaspace, native memory
            "-XX:MaxRAMPercentage=75.0", \
            # Log GC to stdout so it's visible in docker logs
            "-Xlog:gc*:stdout:time,level,tags", \
            # The JAR to run
            "-jar", "app.jar"]
```

**Verification commands:**
```bash
# Build the image
docker build -t payment-service:1.0.0 .

# Check image size
docker images payment-service
# REPOSITORY         TAG     SIZE
# payment-service    1.0.0   286MB  ← JRE-only slim base = much smaller than JDK image

# Verify the process runs as non-root
docker run --rm payment-service:1.0.0 whoami
# appuser   ← not root

# Check what process is PID 1 (should be Java, not sh)
docker run -d --name test-container payment-service:1.0.0
docker exec test-container cat /proc/1/comm
# java   ← SIGTERM will be received by the JVM directly

# Scan image for vulnerabilities before pushing to registry
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image payment-service:1.0.0
# Reports all CVEs found in the base image and dependencies

# View image layer history — understand what each layer added
docker history payment-service:1.0.0
```

**Handling Spring profiles (runtime, not baked into the image):**
```bash
# Pass Spring profiles at runtime — never bake them into the image
# The same image runs in dev, staging, and production — only ENV vars differ
docker run -d \
  --name payment-service-prod \
  -p 8080:8080 \
  --memory="512m" \
  --cpus="0.5" \
  -e SPRING_PROFILES_ACTIVE=production \
  -e DB_HOST=prod-rds.internal \
  -e DB_PASSWORD=${DB_PASSWORD} \      # Secret from the deployment environment
  payment-service:1.0.0

# One image — configured at runtime by environment variables
# This avoids: separate Dockerfiles for dev/staging/prod
```

> **Key decisions here:**
> - Specific image tag (`eclipse-temurin:21-jre-jammy`) — `latest` tags change silently; pinning prevents surprise breakage when the upstream updates; add a bot like Dependabot or Renovate to notify you when the pinned image gets a security patch
> - `--start-period=60s` in HEALTHCHECK — Spring Boot applications take 10-30 seconds to start; without `start-period`, Docker marks the container unhealthy before it's even finished starting and may restart it in a restart loop
> - `exec form` ENTRYPOINT — the most important correctness concern; shell form ENTRYPOINT causes silent graceful shutdown failures that manifest as dropped requests in rolling deployments; always use JSON array form

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between ENTRYPOINT and CMD in a Dockerfile?"

**Hruday's answer:**
> Both define what runs when the container starts, but they have different levels of override-ability.
>
> `CMD` is the default command. You can completely override it at runtime: `docker run myimage different-command`. It's meant for "the default behaviour when no command is specified."
>
> `ENTRYPOINT` is the fixed executable that always runs. You can't override it without the `--entrypoint` flag. Any extra arguments at `docker run` are appended to the ENTRYPOINT command.
>
> In practice for Spring Boot services I always use `ENTRYPOINT`. The container's purpose is to run this Java service — there's no ambiguity. The format matters as much as the instruction itself. `ENTRYPOINT ["java", "-jar", "app.jar"]` is exec form — JSON array. This makes the JVM PID 1 directly. `ENTRYPOINT java -jar app.jar` is shell form — it runs as `/bin/sh -c "java ..."`. The JVM becomes a child of the shell. When Kubernetes sends SIGTERM during a rolling deployment, shell form means the JVM never receives the signal — it gets a SIGKILL after the grace period, killing in-flight requests. Exec form ensures the JVM receives SIGTERM and runs Spring Boot's shutdown hooks, completing active requests gracefully.

---

### Q2 — Deep Dive
**Interviewer asks:** "A colleague's Docker builds take 8 minutes even for small code changes. How do you identify and fix the issue?"

**Hruday's answer:**
> The first thing I'd do is run `docker history <image>` to see the layer sizes and which layers are being rebuilt. Docker prints a `<missing>` for cached layers and shows the actual time/size for layers that rebuilt. If every layer shows a fresh build time, caching isn't working at all.
>
> The most common cause: a COPY instruction too early in the Dockerfile, or a COPY that includes too many files. `COPY . .` copies everything — including source code. On every code change, this layer cache is busted, and every layer below it (dependency resolution, compilation) must rebuild.
>
> The fix is to reorder the Dockerfile so that stable things come first, changing things come last. For a Maven Spring Boot project:
> COPY pom.xml first, then RUN mvn dependency:resolve. This layer is only rebuilt when you change pom.xml — not when you change Java source files. Then COPY src/, then RUN mvn package. Now only the compile step rebuilds on code changes, which takes seconds instead of minutes.
>
> I'd also check the .dockerignore. If there's no .dockerignore, the build context includes the entire project: .git history, Maven .m2 cache, IDE configuration. Just sending this context to the Docker daemon can take 30-60 seconds. Adding a .dockerignore that excludes .git, target/, .m2/ immediately cuts the build context from 1 GB to 10 MB.

---

### Q3 — Trade-Off
**Interviewer asks:** "Should you always use the lightest possible base image?"

**Hruday's answer:**
> Not always — there are real trade-offs. The lightest base images (Alpine variations, distroless) give the smallest attack surface and fastest pulls, but they lack debugging tools. When something goes wrong in production and you need to exec into a container, `ps`, `curl`, `netstat`, and `cat /proc/net/tcp` are not available. You can't easily investigate network connectivity or process state.
>
> My pragmatic approach: `eclipse-temurin:21-jre-jammy` (Ubuntu 22.04 JRE) for most production services — it's reasonably slim (~180 MB base), has common debugging tools available, and is a full Debian/Ubuntu environment so package installation works when you need to diagnose something urgently. The image comes out to about 280 MB total with a typical Spring Boot JAR — that's fine.
>
> Distroless images (Google's `gcr.io/distroless/java21`) produce ~150 MB images and include nothing except the JVM and the CA certificates. Best security posture. But when there's a production incident, you can't exec into the container for any diagnostics — you're dependent entirely on logs and metrics. Only use distroless when you have excellent observability coverage (structured logging, tracing) and a mature debugging workflow that doesn't rely on shell access to containers.

---

### Q4 — Scenario
**Interviewer asks:** "How do you prevent secrets from leaking into a Docker image?"

**Hruday's answer:**
> There are three places secrets can accidentally end up in a Docker image.
>
> First, in the build context. If you have a `.env` file with database passwords in your project directory, and you run `docker build .` without .dockerignore, Docker sends that `.env` file to the daemon and it's visible in the build context history. Fix: always add `.env` and `.env.*` to `.dockerignore`.
>
> Second, in `ENV` or `ARG` instructions. `ENV DB_PASSWORD=secret123` bakes the password into the image metadata. Anyone who runs `docker inspect` or `docker history` on the image can read it. Never put secrets in ENV or ARG. Secrets must be injected at runtime via `docker run -e DB_PASSWORD=...` or, better, through Kubernetes Secrets mounted as environment variables (Topic 187). The image itself should be completely clean of secrets.
>
> Third, in RUN layers. If you run `RUN npm install --registry https://user:password@private-registry.com`, the URL with the password is stored in the layer. Even if you delete the registry URL in a later RUN step, the earlier layer still contains it — Docker layers are immutable. The fix for this is to use Docker BuildKit's `--mount=type=secret` to inject secrets into a RUN step without storing them in any layer:
> `RUN --mount=type=secret,id=npmrc cat /run/secrets/npmrc > ~/.npmrc && npm install`.
> The secret is available only during that build step and is never persisted to any layer.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| `FROM openjdk:21` | "I use the official openjdk image" | `openjdk:21` is the full JDK — 600 MB including the compiler; production containers only need the JRE; use `eclipse-temurin:21-jre-jammy` (~280 MB); `eclipse-temurin` is the actively maintained successor to AdoptOpenJDK |
| Forgetting `.dockerignore` | "Builds are slow but they work" | Without `.dockerignore`, `COPY . .` copies `.git` (100 MB), `.m2` cache (400 MB), `node_modules` (500 MB) into the build context; this causes slow builds AND potential secret leaks; `.dockerignore` is mandatory |
| Shell form ENTRYPOINT | `ENTRYPOINT java -jar app.jar` | Shell form makes the shell PID 1 — the JVM never receives SIGTERM; graceful shutdown doesn't happen; in-flight requests are killed; always use exec form: `ENTRYPOINT ["java", "-jar", "app.jar"]` |
| Tags on base images | `FROM node:latest` | `latest` is a moving target — it can change when the upstream releases a new version, breaking your build silently; always pin to explicit tags like `FROM node:20-alpine3.18` |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I improved the Dockerfile for our main Spring Boot service. The initial version used `openjdk:21` (full JDK, 600 MB) and had no `.dockerignore`, which meant CI was sending 800 MB of build context over the Docker socket on every build — taking 45 seconds before a single instruction ran. I switched the base to `eclipse-temurin:21-jre-jammy`, added `.dockerignore` to exclude `.git`, `.m2`, and `target/`, and reordered the COPY instructions to put `pom.xml` first to get dependency caching. The combined result: image size dropped from 635 MB to 280 MB, and CI image build time dropped from 8 minutes to 90 seconds. I also fixed the ENTRYPOINT from shell form to exec form after reading about graceful shutdown failures — the old shell form was silently causing dropped requests during rolling deployments without anyone noticing."

---

## 8. Scale Evolution

**1,000 users/day →** One Dockerfile per service, built manually or in a basic CI job. The key practices that matter at this scale: correct base image, `.dockerignore`, exec form ENTRYPOINT, non-root user. These give you a secure, reasonably efficient image.

**100,000 users/day →** Images are built automatically in CI on every merge. Layer caching is critical — a slow build breaks developer flow. Dependency layer separation (pom.xml separate from src/) is mandatory. Image vulnerability scanning (Trivy) added to the CI pipeline — CVE-critical images block the deployment. Image size matters because 50 Kubernetes pods pulling a 600 MB image on startup is 30 GB of network — versus 14 GB for a 280 MB image.

**10 million users/day →** Base images are managed centrally — a single updated `eclipse-temurin:21-jre-jammy` base image digest is distributed quarterly to all team Dockerfiles via automation. Distroless images are considered for security-critical services. BuildKit is mandatory for all builds (parallelisation, secret mounts, SSH mounts). Every image is signed with Cosign — Kubernetes admission webhooks reject unsigned images. Image provenance is tracked: every image has labels referencing the exact Git commit, branch, and pipeline run that produced it.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment compliance requires signed, scanned images; large microservice estate means Dockerfile quality directly affects CI/CD velocity for all teams; standard Dockerfile templates are enforced | Know image signing; know vulnerability scanning; explain exec form graceful shutdown |
| Swiggy / Meesho | 100+ services means multiply any inefficiency by 100; a 200 MB savings per image × 100 images = 20 GB less storage in the registry plus faster pod startups during scaling events | Know layer caching optimisation; explain dependency separation in Dockerfiles |
| Adobe / Microsoft | Enterprise product containers are security-scanned by customer security teams; Dockerfile security practices (non-root, minimal base, no embedded secrets) are baseline requirements for enterprise software | Know Dockerfile security best practices; know BuildKit secret mounts |
| SAP Labs | SAP services run in Kubernetes on BTP; every team owns their Dockerfile; image size and build time are direct operational costs; SAP's internal security baseline includes running containers as non-root | Know the practical optimisations (layer order, .dockerignore, base image choice); connect to real SAP experience |

---

## 10. Related Topics — What to Study Next

- **Topic 182 — Multi-stage builds** — the advanced Dockerfile pattern that removes build tools entirely from the final image; takes a 600 MB Maven + JDK + compiled image down to a 150 MB JRE-only image; the production standard for Spring Boot containerisation
- **Topic 183 — Docker Compose** — how multiple Dockerfiles work together for a local development environment; postgres, redis, kafka, and your Spring Boot service all start with one command
- **Topic 180 — Why Docker** — if you want to review the conceptual foundation covering containers vs VMs and image layers; complements the practical Dockerfile knowledge in this topic
- **Topic 188 — Liveness and readiness probes** — Kubernetes ignores the Dockerfile HEALTHCHECK; the analogous production-grade health check for Kubernetes environments uses liveness and readiness probes configured in the K8s manifest
- **Practice**: take any Spring Boot project, write a Dockerfile, then run `docker history <image>` — look at which layers are large and which are frequently rebuilt; optimise until the second build (after a source-only change) takes under 30 seconds

---

*Part 11 · Dockerfile — Layers, Instructions, Best Practices · Full Stack Interview Guide · Hruday D · 2026*
