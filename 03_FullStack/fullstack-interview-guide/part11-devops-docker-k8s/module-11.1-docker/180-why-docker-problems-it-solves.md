# Why Docker — The Problems It Solves
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The core problem Docker solves**: "works on my machine" — the dependency, OS, and runtime mismatch between developer laptop, CI server, and production environment; Docker packages the application AND its entire runtime into one portable unit
- **What a container is**: a lightweight, isolated process on the host OS — not a separate OS (unlike a VM); shares the host kernel; starts in milliseconds; a Ubuntu container on your Mac uses the Mac kernel, not a real Ubuntu kernel
- **Image vs Container**: image = read-only blueprint (like a class); container = running instance of an image (like an object); you can run 10 containers from the same image
- **Why it's better than a VM**: a VM includes a full guest OS (2-4 GB); a Docker image is just your app + its direct dependencies (50-200 MB); 100 containers on one server vs 5-10 VMs
- **Docker Hub / registry**: shared store of pre-built images — `openjdk:21-jre-slim`, `postgres:16`, `redis:7-alpine`; your CI pipeline builds and pushes your app's image to a private registry; production pulls that exact image
- **Key commands you will be asked about**: `docker build`, `docker run`, `docker ps`, `docker exec`, `docker logs`, `docker-compose up`
- 🆕 **Gap topic for Hruday**: "I've used Docker for local development environments at SAP. I've studied container internals, image layering, and Docker Compose setup for multi-service Spring Boot projects to round out production knowledge"

---

## 1. One-Line Definition
Docker is a platform that packages an application and everything it needs to run — code, runtime, libraries, configs — into a single portable container, so the application runs identically on any machine that has Docker installed.

---

## 2. The Problem It Solves

A Java developer finishes building a Spring Boot service on their MacBook. It works perfectly. They push to GitHub. The CI server runs the tests — they pass. The ops team deploys to a Linux production server. The app crashes at startup.

Why? The dev machine has Java 21. The CI server has Java 17. The production server has Java 11 — or maybe a different version of `libssl`. Or the ENV variables are set differently. Or there's a dependency that resolves to a different minor version. Or the file system paths differ between macOS and Linux.

Before Docker, the solution was a long document called "Deployment Runbook" — a set of manual steps to set up the server, install the right Java version, set the right ENV vars, place config files in the right directories. Every time you onboarded a new service you wrote a new runbook. Runbooks got out of date. Servers drifted — one prod server had slightly different library versions than another. You'd have a "works in staging, breaks in production" crisis at the worst possible moment.

Docker solves this with one idea: **you don't deploy code, you deploy a container image**. The image contains your compiled Spring Boot JAR, the exact Java 21 JRE it was tested with, the exact version of every OS library it needs. You build it once, on the CI server. You run it identically on any server that has Docker, regardless of what else is installed on that server.

The second big problem Docker solves is **dependency isolation**. Before Docker, two applications on the same server shared the same Java installation, same Python, same `libpq`. If service A needs Python 3.9 and service B needs Python 3.11, you had a problem. Docker gives each service its own isolated environment — they don't interfere with each other even when running on the same physical box.

---

## 3. How It Works Internally

### The Mental Model — A Shipping Container

Before shipping containers, loading a ship required coordinating every cargo type: furniture, machinery, food, chemicals — each had different size, shape, handling requirements. Dockworkers had to know how to handle each type. Ports had to have specialised equipment for each cargo type. It took weeks.

The standard shipping container changed everything. You don't care what's inside the container. You just stack them. Every port, every ship, every truck has the same standard interface to handle any container. The carrier and receiver don't need to know about the cargo's specifics.

Docker is the same. Your application — whether it's a Java service, a Node.js API, a Python script, or a React app — gets packaged into a standard container. Any machine with Docker installed can run it. The ops team doesn't need to know whether it's Java or Node. The CI pipeline handles any app the same way: build image → push to registry → pull image → run container.

### Containers vs VMs — The Key Technical Difference

```
VIRTUAL MACHINES:
┌─────────────────────────────────────────────────────────┐
│  Host Machine: Linux server                             │
│                                                         │
│  Hypervisor (VMware / VirtualBox / KVM)                 │
│                                                         │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐      │
│  │ Guest OS   │   │ Guest OS   │   │ Guest OS   │      │
│  │ (Ubuntu)   │   │ (Windows)  │   │ (CentOS)   │      │
│  │ 2GB RAM    │   │ 4GB RAM    │   │ 2GB RAM    │      │
│  │            │   │            │   │            │      │
│  │ App A      │   │ App B      │   │ App C      │      │
│  └────────────┘   └────────────┘   └────────────┘      │
│                                                         │
│  TOTAL OVERHEAD: 3 full OS kernels = 8+ GB just for OS  │
└─────────────────────────────────────────────────────────┘

DOCKER CONTAINERS:
┌─────────────────────────────────────────────────────────┐
│  Host Machine: Linux server                             │
│                                                         │
│  Host OS Kernel (shared by all containers)              │
│                                                         │
│  Docker Engine                                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │Container │  │Container │  │Container │  │Contain.│ │
│  │(libs +   │  │(libs +   │  │(libs +   │  │(libs + │ │
│  │ App A)   │  │ App B)   │  │ App C)   │  │ App D) │ │
│  │ 50 MB    │  │ 80 MB    │  │ 60 MB    │  │ 40 MB  │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│                                                         │
│  TOTAL OVERHEAD: shared kernel, just the app's libs     │
└─────────────────────────────────────────────────────────┘
```

### How Docker Images Work — Layers

A Docker image is not one big file. It is a stack of read-only layers. Each line in your Dockerfile creates one layer.

```
Dockerfile for Spring Boot app:

FROM openjdk:21-jre-slim                    → Layer 1: base JRE (~180 MB)
COPY target/app.jar /app/app.jar            → Layer 2: your JAR (~60 MB)
EXPOSE 8080                                 → metadata (no new layer)
ENTRYPOINT ["java", "-jar", "/app/app.jar"] → metadata (no new layer)

Final image layers (stacked):
┌─────────────────────────────────────────┐
│ Layer 2: your app.jar (60 MB)           │ ← YOUR layer
├─────────────────────────────────────────┤
│ Layer 1: openjdk:21-jre-slim (180 MB)   │ ← base image layer
└─────────────────────────────────────────┘

Why layers matter:
→ Layer 1 gets CACHED after the first build
→ If you only change Layer 2 (your code), Docker rebuilds ONLY Layer 2
→ Build time: 2 minutes first time → 10 seconds after code changes
→ Registry: pushes only changed layers — saves bandwidth
→ Two services using the same base image: only ONE copy stored on the server
```

### Container Isolation Mechanisms

Docker containers appear isolated but actually share the host kernel. Isolation comes from two Linux kernel features:

```
Namespaces — what the container CAN SEE:
  pid namespace:    container process thinks it's PID 1 (init process)
                    can't see or kill processes from other containers or the host
  net namespace:    container has its own virtual network interface
                    its own IP address (172.17.0.x by default)
                    its own open ports — completely separate from host ports
  mnt namespace:    container has its own filesystem view
                    can't see the host filesystem
  
cgroups — how much the container CAN USE:
  cpu:     limit container to 0.5 CPUs
  memory:  limit container to 512 MB RAM
  
  docker run --cpus="0.5" --memory="512m" my-app
  → Spring Boot container can't consume more than these limits
  → Prevents one container from starving all others
```

---

## 4. The Code

### Wrong Way — Deploying a Spring Boot App Without Docker
```bash
# Old deployment script — manual, fragile, environment-dependent
ssh ubuntu@prod-server-1.company.com

# Hope Java 21 is installed
java -version  # What if it's Java 11?

# Copy JAR (but what version of libssl, what ENV vars?)
scp target/payment-service.jar ubuntu@prod-server-1.company.com:/home/ubuntu/

# Hope the application.yml is already there with the right config
java -jar /home/ubuntu/payment-service.jar

# If it fails: good luck debugging whether it's a Java version issue,
# missing ENV var, wrong config file path, or OS library mismatch
```

> **Why this fails in production:** Servers drift — manual changes pile up; Java gets upgraded for another service; a library gets patched; ENV vars get changed and nobody documents it. The "runbook" approach breaks as soon as the person who wrote it leaves the team. There's no reproducibility: two prod servers might behave differently if their manual setup history diverged.

### Right Way — Dockerized Spring Boot Application

**Step 1: Build the JAR (Maven):**
```bash
# Build the deployable JAR
mvn clean package -DskipTests
# Output: target/payment-service-1.0.0.jar
```

**Step 2: Write the Dockerfile:**
```dockerfile
# This is the WRONG Dockerfile (the naive version — shown for contrast)
FROM openjdk:21                              # Full JDK — 600 MB! 
COPY target/payment-service-1.0.0.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
# Problem: includes the compiler, dev tools, everything — huge image
# Problem: fat JAR copied every rebuild — no layer caching benefit
# See Topic 182 for the multi-stage build approach
```

```dockerfile
# BETTER Dockerfile (without multi-stage — see Topic 182 for the best version)
# Use the slim JRE — no compiler, no Maven, just the runtime we need
FROM eclipse-temurin:21-jre-jammy

# Create a non-root user — running as root is a security risk
# Even inside a container, root can do more damage if there's a container escape
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Set working directory inside the container
WORKDIR /app

# Copy the JAR built outside this container (by Maven in CI)
COPY target/payment-service-1.0.0.jar app.jar

# Change ownership so our non-root user can read the JAR
RUN chown appuser:appgroup app.jar

# Switch to non-root user before running
USER appuser

# Document which port the app listens on — doesn't actually open the port
# The -p flag in docker run does the actual port mapping
EXPOSE 8080

# JVM flags for containers:
# -XX:+UseContainerSupport — respects Docker's memory/CPU limits (Java 8u191+ default)
# -XX:MaxRAMPercentage=75.0 — use up to 75% of container's memory limit for the JVM heap
# Remaining 25% is for OS overhead, off-heap memory, etc.
ENTRYPOINT ["java", \
            "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", \
            "-jar", \
            "app.jar"]
```

**Step 3: Build and run the container:**
```bash
# Build the image — tag it with "payment-service" and version "1.0.0"
docker build -t payment-service:1.0.0 .

# List images on this machine
docker images
# REPOSITORY         TAG     IMAGE ID       SIZE
# payment-service    1.0.0   abc123def456   280MB

# Run the container:
# -d: run in background (detached)
# --name: give it a human-readable name
# -p 8080:8080: map host port 8080 to container port 8080
# --memory="512m": container can't use more than 512 MB RAM
# --cpus="0.5": container gets half a CPU
# -e: pass environment variable into the container
docker run -d \
  --name payment-service \
  -p 8080:8080 \
  --memory="512m" \
  --cpus="0.5" \
  -e SPRING_PROFILES_ACTIVE=production \
  -e DB_PASSWORD=${DB_PASSWORD} \
  payment-service:1.0.0

# Check running containers
docker ps
# CONTAINER ID   IMAGE                   STATUS    PORTS
# abc123         payment-service:1.0.0   Up 30s    0.0.0.0:8080->8080/tcp

# View application logs
docker logs -f payment-service

# Execute a command inside the running container (debugging)
docker exec -it payment-service /bin/sh
# > ls /app
# > cat /proc/1/status  # PID 1 is our Java process
```

**Pushing to a container registry (CI/CD context):**
```bash
# Login to AWS ECR (Elastic Container Registry)
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.ap-south-1.amazonaws.com

# Tag with the registry URL
docker tag payment-service:1.0.0 \
  123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:1.0.0

# Push — only changed layers are transmitted
docker push 123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:1.0.0

# On the production server — pull and run the exact image
docker pull 123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:1.0.0
docker run -d -p 8080:8080 \
  123456789.dkr.ecr.ap-south-1.amazonaws.com/payment-service:1.0.0
```

> **Key decisions here:**
> - `eclipse-temurin:21-jre-jammy` not `openjdk:21` — JRE only (no compiler) → 280 MB vs 600 MB image; `eclipse-temurin` is the actively maintained AdoptOpenJDK successor; `jammy` pins to Ubuntu 22.04 LTS for security
> - Non-root user — security: if a vulnerability allows container escape, a non-root user has fewer privileges on the host
> - `-XX:MaxRAMPercentage=75.0` — critical for containers; without this, the JVM calculates its heap based on the VM's total memory, not the container's limit; the JVM then tries to allocate more memory than the container allows and gets OOM killed by the kernel
> - Environment variables for secrets — never bake passwords into the image; pass them at runtime via `-e` or Kubernetes Secrets (Topic 187)

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What problem does Docker solve and how is it different from a virtual machine?"

**Hruday's answer:**
> Docker solves the "works on my machine" problem and the environment inconsistency that causes deployments to fail. By packaging the application with its entire runtime into a container image, you get a unit you can build once and run identically on any machine: developer laptop, CI server, staging, production.
>
> The key difference from a VM is how isolation works. A VM runs a complete guest operating system on top of a hypervisor. Each VM needs its own kernel, its own OS userland — that's 2-4 GB of overhead per VM. You can run maybe 10 VMs on a server before you're resource-constrained.
>
> A Docker container doesn't have its own OS. It shares the host kernel but gets isolated views of processes, networking, and the filesystem through Linux kernel features called namespaces and cgroups. The container just carries the application and its direct dependencies. A Spring Boot container might be 200-300 MB where a VM would be 3-4 GB. You can run 50-100 containers on a server where you'd run 5-10 VMs.
>
> At SAP, we used Docker for consistent local development environments — every developer ran `docker-compose up` to get a local PostgreSQL, Redis, and the Spring Boot service running with a single command, no manual setup. This was the practical payoff I saw first-hand.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do Docker image layers work, and why does layer order matter in a Dockerfile?"

**Hruday's answer:**
> A Docker image is a stack of read-only layers. Each instruction in the Dockerfile that modifies the filesystem creates a new layer. The FROM instruction creates the base layer. COPY, RUN, ADD — each of these adds a layer on top.
>
> Docker caches each layer by its content hash. When you rebuild an image, Docker checks: has this layer changed since the last build? If not, it reuses the cached layer. The rebuilding starts only from the first changed layer downward.
>
> Layer order matters because of this caching. In a Spring Boot project, the worst order is: COPY the JAR last, before the ENTRYPOINT. That's actually fine. But the naive mistake people make is copying the entire project in one go — source code and all. Then any source code change invalidates the single large layer.
>
> The smarter approach is to copy the dependency layers first — the things that change rarely — before copying the application code. In a Spring Boot app, the JAR dependencies (all the Spring Boot starter clauses in pom.xml) change far less often than the application classes. The multi-stage build in Topic 182 takes this further: it extracts the JARs into separate layers — Spring Boot framework jars, dependency jars, and application classes — so only the application classes layer gets rebuilt on a code change. The result goes from 60-second builds to 10-second builds.

---

### Q3 — Scenario
**Interviewer asks:** "A containerized Spring Boot service runs fine locally but crashes in production with Out of Memory errors. What do you investigate?"

**Hruday's answer:**
> This is one of the most common container gotchas. My first suspect is the JVM heap sizing.
>
> By default, the JVM calculates its default heap size as a fraction of the total available memory it can see. Before Java 11, the JVM wasn't container-aware — it saw the host machine's 64 GB of RAM and set its heap to 16 GB. The container's memory limit is, say, 512 MB. The JVM tries to allocate a 16 GB heap, the container's memory limit is hit, the kernel sends SIGKILL, the container crashes.
>
> Modern JDK (8u191+) has `-XX:+UseContainerSupport` enabled by default — it reads the cgroup memory limits correctly. But you still need `-XX:MaxRAMPercentage=75.0` to tell the JVM to cap its heap at 75% of the container's cgroup limit, leaving headroom for off-heap memory: the metaspace, thread stacks, native libraries, and the OS overhead inside the container.
>
> In production I'd check: `docker inspect <container>` for the memory limit. I'd `docker exec` in and run `java -XX:+PrintFlagsFinal -version | grep MaxHeapSize` — if it shows a value larger than 75% of the container limit, that's the bug. The fix: add `-XX:MaxRAMPercentage=75.0` to the ENTRYPOINT in the Dockerfile and redeploy.
>
> If the heap flags look right, I'd go to `docker stats` for the memory usage trend — it might be a genuine memory leak in the application.

---

### Q4 — Trade-Off
**Interviewer asks:** "When would you NOT use Docker or containers?"

**Hruday's answer:**
> There are a few real cases where containers add friction without proportional benefit.
>
> First, very simple single-server deployments where the "dependency mismatch" problem doesn't exist — a small script or a single internal tool where the server will never be shared and the setup is done once and never changes. Here, containers add Dockerfile complexity without solving a real pain point.
>
> Second, applications that need direct hardware access are harder to containerise — GPU workloads, certain network security tools, or applications that need specific kernel modules. It's possible, but you lose the clean abstraction.
>
> Third, stateful applications — databases — are technically containerisable but you need to be careful with volumes, backup strategies, and data persistence. Running your primary production PostgreSQL in Docker is fine if you have the operational expertise, but it adds layers of complexity that a managed RDS instance avoids.
>
> For the application layer — microservices, APIs, background workers, everything Hruday works on — containers are the clear choice for anything that runs in a team environment or gets deployed to multiple environments.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Containers are VMs | "Containers are lightweight VMs" | Containers share the host kernel — they're isolated processes, not separate operating systems; this is why startup is milliseconds not minutes |
| Image size doesn't matter | "The image is just a deployment artefact" | Image size directly affects CI pipeline time, registry storage cost, and how fast pods start in Kubernetes; prefer JRE-slim base images over full JDK images; multi-stage builds eliminate build tools from the final image |
| Running as root | "Running as root inside a container is fine because it's isolated" | Container isolation is good but not perfect — container escape vulnerabilities have been found; running as non-root limits the blast radius; it's also a required practice for SOC 2 / PCI-DSS compliance |
| Forgetting JVM container flags | "Our Java service runs fine in Docker" | Without `-XX:MaxRAMPercentage`, the JVM can plan to use more heap than the container limit allows; this causes silent OOM kills in production that look like random crashes; always set container-aware JVM flags |

---

## 7. Hruday's Real Experience Hook
> "At SAP, the team used Docker to standardise local development environments. Before Docker, onboarding a new developer took 2 days of manual setup — installing the right version of Node, Java, PostgreSQL, setting ENV vars, running database migrations manually. After we added Docker Compose files to the repository, it became `docker-compose up` and the entire local stack — Spring Boot service, React dev server, PostgreSQL, and Redis — was running in 3 minutes. I improved the Dockerfile for our Spring Boot service by switching from the fat JDK base image to `eclipse-temurin:21-jre-jammy`, which reduced the image size from 580 MB to 280 MB and cut our CI build time by about 40 seconds. Adding the JVM container-aware flags after reading about OOM kill incidents on similar services was a proactive improvement I made before we experienced the issue."

---

## 8. Scale Evolution

**1,000 users/day →** A single Dockerfile per service, built in CI, pushed to a container registry. `docker run -d` on a single server. Docker gets rid of environment inconsistency and makes deployments repeatable. This is the minimum viable Docker setup — enormous value even without orchestration.

**100,000 users/day →** Multiple instances of each service are needed. Running Docker manually on servers doesn't scale — someone has to decide which server to run each container on, restart failed containers, route traffic. This is where Kubernetes comes in (Topics 185-189). Images are stored in a private registry (AWS ECR, Google Artifact Registry); CI pipeline automatically builds, tags, and pushes on every merge to main.

**10 million users/day →** Images are security scanned by tools like Trivy or Snyk before being allowed into production — images with critical CVE vulnerabilities are rejected by the CI pipeline. Base images are pinned to specific digest hashes (not just tags) to prevent supply chain attacks. Image vulnerability management is automated — a policy says "no base image older than 30 days" — the pipeline pulls the latest `eclipse-temurin:21-jre-jammy` digest weekly and rebuilds all images. Container image signing (Cosign) ensures only images built by your CI pipeline can run in production.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | All microservices at payment companies run in containers on Kubernetes; Docker fundamentals are expected knowledge; every engineer is expected to write and maintain Dockerfiles | Know multi-stage builds; know JVM container flags; explain layer caching |
| Swiggy / Meesho | Large microservice estate (100+ services) — container standardisation is the operational foundation; image size and build speed directly affect developer velocity at this scale | Know slim base images; explain the CI pipeline impact of image size |
| Adobe / Microsoft | Enterprise software products ship as containers; Docker is a listed requirement on 90% of senior backend job descriptions; container security (non-root, image scanning) matters for enterprise customers | Know container security practices; know image scanning tools |
| SAP Labs | SAP BTP (Business Technology Platform) services run in Kubernetes; internal services are containerised; SAP's cloud strategy is 100% container-based; Dockerfile skills are a production requirement | Know the local Docker Compose developer experience; explain JVM heap sizing in containers |

---

## 10. Related Topics — What to Study Next

- **Topic 181 — Dockerfile best practices** — the detailed Dockerfile deep dive: `.dockerignore`, build arg vs ENV, label conventions, health check instruction; what you need to write a production-grade Dockerfile
- **Topic 182 — Multi-stage builds** — the pattern that eliminates the Maven/npm build tools from your production image; the critical optimisation that takes a 600 MB image down to 150 MB
- **Topic 183 — Docker Compose** — running multiple services together locally (Spring Boot + PostgreSQL + Kafka + Redis); the direct practical use of Docker for Spring Boot development teams
- **Topic 185 — Kubernetes architecture** — the next step after Docker: what runs when you need 50 containers on 10 servers and need them to self-heal, auto-scale, and load-balance automatically
- **Security note**: run `trivy image eclipse-temurin:21-jre-jammy` on any base image before using it — see the CVE count; this habit distinguishes a security-conscious engineer from one who just makes things work

---

*Part 11 · Why Docker — The Problems It Solves · Full Stack Interview Guide · Hruday D · 2026*
