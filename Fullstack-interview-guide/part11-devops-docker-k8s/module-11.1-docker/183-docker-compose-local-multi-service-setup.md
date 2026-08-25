# Docker Compose — Local Multi-Service Setup
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What it is**: Docker Compose is a tool that lets you define and run multiple containers as one application using a single `docker-compose.yml` file; `docker compose up` starts all your services in the right order; `docker compose down` tears everything down
- **The problem it solves**: a Spring Boot microservice needs PostgreSQL, Redis, Kafka, and itself — running 4 manual `docker run` commands with the right ports, networks, and env vars every time you start working is error-prone; Compose is the one-command equivalent and it's checked into the repo
- **Services, networks, volumes**: each entry under `services:` is one container; Compose automatically creates a shared network so services can reach each other by service name (e.g., `http://payment-service:8080`); `volumes:` persist data between restarts (your Postgres data survives `docker compose restart`)
- **Health-based dependency ordering**: `depends_on: condition: service_healthy` waits for a service's healthcheck to pass before starting a dependent service; prevents Spring Boot from crashing on startup because Postgres isn't ready yet
- **Environment variable files**: `.env` file in the same directory as `docker-compose.yml` — variables defined there are automatically available in the Compose file as `${VARIABLE_NAME}`; never commit real secrets to `.env` — add `.env` to `.gitignore`
- **Override files**: `docker-compose.override.yml` merges with the base file automatically; use this to add development-only settings (port mappings, debug JVM flags) without modifying the base file
- 🆕 **Gap topic for Hruday**: "I used Docker Compose at SAP to set up local development environments. I know service definitions, healthcheck-based startup ordering, and volume persistence for databases — the patterns used daily in microservice local dev"

---

## 1. One-Line Definition
Docker Compose is a CLI tool that reads a `docker-compose.yml` file and orchestrates starting, stopping, and networking multiple containers as a single logical application — making a multi-service development environment start with one command.

---

## 2. The Problem It Solves

A new developer joins the team working on a Spring Boot payments service. The service needs: PostgreSQL 16 (specific version, with some initial schema), Redis 7 (for session caching), Kafka 3.6 (for payment events), and Zookeeper (which Kafka needs). Plus the Spring Boot service itself.

Before Docker Compose, onboarding meant a document like this:
1. Install PostgreSQL 16 (not 15, not 14 — the app uses JSONB functions added in 16)
2. Create a database, create a user, run 3 migration scripts
3. Install Redis, configure a specific `maxmemory-policy`
4. Install Kafka and Zookeeper, create these specific topics
5. Set 12 environment variables on your machine
6. Run the Spring Boot app with these specific VM flags

That document was usually out of date. Someone added a new dependency last month but forgot to update the doc. The new developer spends a day troubleshooting why the app crashes — turns out there's a new required environment variable nobody documented.

With Docker Compose, all of this is in a file in the repository. `docker compose up` starts everything with the right versions, the right configuration, and the right startup order. That same `docker-compose.yml` works on every developer's machine — macOS, Linux, Windows with WSL. First-day setup becomes 5 minutes.

The second problem Compose solves is **startup ordering with health checks**. Services crash if their dependencies aren't ready. Spring Boot on startup tries to connect to PostgreSQL — if Postgres container is still initialising, Spring Boot crashes. `depends_on: condition: service_healthy` makes Compose wait for Postgres's health check to pass before starting Spring Boot. The health checks are part of the YAML — they're maintained alongside the app code.

---

## 3. How It Works Internally

### The Core Concepts

```
docker-compose.yml structure:
┌───────────────────────────────────────────────────────────┐
│ version: "3.9"                                             │
│                                                            │
│ services:                                                  │
│   service-a: ──→ Container; runs an image; has env vars   │
│   service-b: ──→ Container; depends on service-a          │
│   service-c: ──→ Container; has volume mounts             │
│                                                            │
│ networks:                                                  │
│   backend-net: ──→ Docker network all services join       │
│                   Services reach each other by name       │
│                   (service-a calls http://service-b:8080) │
│                                                            │
│ volumes:                                                   │
│   postgres-data: ──→ Named Docker volume               │
│                      Data persists across restarts        │
│                      (not inside the container)           │
└───────────────────────────────────────────────────────────┘
```

### How Service Discovery Works

When Compose creates a network and adds services to it, Docker's embedded DNS automatically resolves service names to container IPs:

```
Service names act as DNS hostnames inside the Compose network:

  Spring Boot app connects to PostgreSQL:
    SPRING_DATASOURCE_URL = jdbc:postgresql://postgres:5432/paymentdb
                                              ^^^^
                                              This is the service name in docker-compose.yml
                                              Docker DNS resolves it to the postgres container's IP
                                              
  Spring Boot connects to Redis:
    SPRING_REDIS_HOST = redis
                        ^^^^^
                        Service name — automatically resolvable
  
  Spring Boot connects to Kafka:
    SPRING_KAFKA_BOOTSTRAP_SERVERS = kafka:9092
                                     ^^^^^
                                     Service name
                                     
All of this works WITHOUT knowing or hardcoding IP addresses
Services communicate by name, not by port on the host machine
```

### Lifecycle Commands

```
docker compose up              → start all services in foreground; Ctrl+C stops
docker compose up -d           → start in background (detached/daemon mode)
docker compose up --build      → rebuild images before starting (if Dockerfile changed)
docker compose down            → stop and remove containers, networks (NOT volumes)
docker compose down -v         → stop + remove containers, networks, AND named volumes (wipes data)
docker compose stop            → stop containers (don't remove them)
docker compose start           → start stopped containers
docker compose restart         → stop then start

docker compose logs            → all service logs
docker compose logs -f         → follow (stream) all logs
docker compose logs -f app     → follow only the "app" service logs

docker compose ps              → list running containers with their ports
docker compose exec app bash   → open a bash shell inside the "app" container
docker compose run app mvn test → run a command in a NEW container from the "app" service definition
```

---

## 4. The Code

### Wrong Way — Manual Multi-Container Setup (No Compose)
```bash
# Manual startup — what you do without Compose
# Must type this every time you start working

# Start PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_DB=paymentdb \
  -e POSTGRES_USER=payuser \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 \
  postgres:16-alpine

# Start Redis
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine

# Start the app — but postgres and redis are NOT on the same Docker network
# The app can't reach "postgres" by name — it has to use "localhost"
# But "localhost" inside the container means the container itself, not the host
# This setup fails unless you use --network=host or hardcode IP addresses

docker run -d \
  --name payment-app \
  -e DB_HOST=localhost \          # WRONG — 'localhost' inside the container = the container itself
  -e DB_PASSWORD=devpassword \
  -p 8080:8080 \
  payment-service:latest
```

> **Why this fails in production dev setup:** Three containers on three separate default bridge networks can't address each other by service name. IP addresses change every restart. `--network=host` works but exposes all container ports on the host and creates security issues. There's no startup ordering — the app crashes if you start it before Postgres finishes initialising. Every team member has to remember these exact commands.

### Right Way — Docker Compose for Spring Boot + PostgreSQL + Redis + Kafka
```yaml
# docker-compose.yml — commit this to the repository
# All developers run: docker compose up -d
# Everything starts in the right order

version: "3.9"

services:

  # ===== PostgreSQL =====
  postgres:
    image: postgres:16-alpine
    container_name: payment-postgres
    environment:
      POSTGRES_DB: paymentdb
      POSTGRES_USER: payuser
      POSTGRES_PASSWORD: devpassword    # Dev only — never use this in prod
    ports:
      - "5432:5432"                     # host:container — access from host with psql or DBeaver
    volumes:
      - postgres-data:/var/lib/postgresql/data   # Named volume — data persists across restarts
      - ./infra/db/init.sql:/docker-entrypoint-initdb.d/init.sql  # Run on first startup
    healthcheck:
      # pg_isready -U: check if postgres is accepting connections for user "payuser"
      test: ["CMD-SHELL", "pg_isready -U payuser -d paymentdb"]
      interval: 10s       # Check every 10 seconds
      timeout: 5s         # Fail if no response in 5 seconds
      retries: 5          # Mark healthy after 5 consecutive successes
      start_period: 30s   # Give PostgreSQL 30s to start before counting failures
    networks:
      - backend-net

  # ===== Redis =====
  redis:
    image: redis:7-alpine
    container_name: payment-redis
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - backend-net

  # ===== Zookeeper (required by Kafka) =====
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: payment-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    healthcheck:
      test: ["CMD-SHELL", "echo ruok | nc localhost 2181 | grep imok"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend-net

  # ===== Kafka =====
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: payment-kafka
    depends_on:
      zookeeper:
        condition: service_healthy    # Wait for Zookeeper to be healthy first
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181          # Reaches Zookeeper by service name
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    ports:
      - "29092:29092"     # External access from your laptop (for Kafka clients outside Docker)
      # Don't expose 9092 to host — services within Docker use kafka:9092
    healthcheck:
      test: ["CMD-SHELL", "kafka-broker-api-versions --bootstrap-server localhost:9092"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s
    networks:
      - backend-net

  # ===== Spring Boot Application =====
  app:
    build:
      context: .             # Build from Dockerfile in current directory
      dockerfile: Dockerfile
    container_name: payment-service
    depends_on:
      postgres:
        condition: service_healthy   # Wait for Postgres health check to pass
      redis:
        condition: service_healthy   # Wait for Redis health check to pass
      kafka:
        condition: service_healthy   # Wait for Kafka health check to pass
    environment:
      SPRING_PROFILES_ACTIVE: development
      # Spring Boot connects to "postgres" by service name — Docker DNS resolves it
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/paymentdb
      SPRING_DATASOURCE_USERNAME: payuser
      SPRING_DATASOURCE_PASSWORD: devpassword
      SPRING_DATA_REDIS_HOST: redis               # Service name — resolved by Docker DNS
      SPRING_DATA_REDIS_PORT: 6379
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092  # Service name — inside Docker network
    ports:
      - "8080:8080"
    volumes:
      # Mount local target/ directory so you can update JAR without rebuild
      # Useful for rapid iteration during development
      - ./target:/app/target:ro
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8080/actuator/health | grep UP || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s     # Spring Boot needs up to 60s to start
    networks:
      - backend-net

# ===== Named Volumes =====
volumes:
  postgres-data:            # Persists PostgreSQL data across docker compose down + up
  # Note: docker compose down -v will delete this volume and all data

# ===== Networks =====
networks:
  backend-net:
    driver: bridge          # Default network type — services on same network talk by name
```

**`.env` file for local development (add to `.gitignore`):**
```bash
# .env — loaded automatically by docker compose
# Never commit real secrets — this is dev-only
POSTGRES_PASSWORD=devpassword
REDIS_PASSWORD=
KAFKA_GUI_PORT=8090

# Use ${VARIABLE} syntax in docker-compose.yml to reference these
```

**`docker-compose.override.yml` — dev-specific additions:**
```yaml
# docker-compose.override.yml — automatically merged by docker compose
# Add development-specific settings here without modifying the base file

version: "3.9"

services:
  app:
    # Extra JVM debug flags for local development
    environment:
      JAVA_TOOL_OPTIONS: "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
      # Enables remote debugging on port 5005 — connect IntelliJ's debugger to localhost:5005
    ports:
      - "5005:5005"    # Expose debug port to localhost

  # Add Kafka UI for local development — not in production
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports:
      - "8090:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    networks:
      - backend-net
    depends_on:
      - kafka
```

**Workflow:**
```bash
# First time setup (5 minutes):
git clone https://github.com/company/payment-service
cd payment-service
mvn package -DskipTests          # Build the JAR
docker compose up -d             # Start everything

# Check startup order and health:
docker compose ps
# NAME                  COMMAND   SERVICE   STATUS    PORTS
# payment-kafka         ...       kafka     healthy   0.0.0.0:29092->29092/tcp
# payment-postgres      ...       postgres  healthy   0.0.0.0:5432->5432/tcp
# payment-redis         ...       redis     healthy   0.0.0.0:6379->6379/tcp
# payment-service       ...       app       healthy   0.0.0.0:8080->8080/tcp

# Daily development:
docker compose logs -f app       # Watch app logs
docker compose exec postgres psql -U payuser paymentdb  # Connect to DB

# After making code changes:
mvn package -DskipTests
docker compose restart app       # Or: docker compose up --build if Dockerfile changed

# Clean teardown (preserves DB data):
docker compose down

# Nuclear option (wipes everything including DB data):
docker compose down -v
```

> **Key decisions here:**
> - `service_healthy` condition in `depends_on` — the most important change from naive `depends_on` which only waits for the container to START (not to be READY); Spring Boot crashes if it tries to connect before Postgres finishes its startup; service_healthy waits for the healthcheck to pass
> - Named volume `postgres-data` — without a named volume, database data is stored inside the container; when the container is removed (`docker compose down`), data is lost; named volumes persist on the Docker host filesystem and survive container restarts
> - Separate `KAFKA_ADVERTISED_LISTENERS` for inside-Docker (`kafka:9092`) and outside-Docker (`localhost:29092`); this allows services inside Docker to connect via service name, and tools on your laptop (Kafka UI, Offset Explorer) to connect via localhost

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Docker Compose and when would you use it?"

**Hruday's answer:**
> Docker Compose is a tool for running multiple containers as a coordinated group. You define all the services — Spring Boot app, PostgreSQL, Redis, Kafka — in a single `docker-compose.yml` file. One command, `docker compose up`, starts all of them in the right order with the right configuration.
>
> I use it for local development environments. When I'm working on a Spring Boot microservice, I need a real PostgreSQL database, a Redis cache, and sometimes Kafka for message testing. Before Compose, this was multiple separate docker run commands with different ports and ENV vars — error-prone and hard to share with the team. With Compose, the file lives in the repository. Every developer gets the same setup, same versions, same configuration.
>
> Compose is NOT a replacement for Kubernetes in production. It lacks health-based load balancing, auto-scaling, rolling deployments, and the other production runtime features Kubernetes provides. Compose is the right tool for local development and for integration tests in CI. At SAP, Compose was standard in every project — new developers were productive on day one because of it.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you make a Spring Boot service in Compose wait for PostgreSQL to be fully ready before starting?"

**Hruday's answer:**
> The naive `depends_on` just waits for the PostgreSQL container to start, not for the database process to be ready to accept connections. The PostgreSQL container starts fast, but the actual postgres process inside takes a few more seconds to initialise data directories and start accepting connections. Spring Boot's DataSource initialises on startup — if it tries to connect during those few seconds, it throws a connection refused exception and sometimes fails to start.
>
> The correct solution is to add a health check to the postgres service definition and then use `depends_on: condition: service_healthy` for the app service.
>
> The health check uses `pg_isready`, which is a PostgreSQL utility that checks if the server is accepting connections: `test: ["CMD-SHELL", "pg_isready -U payuser -d paymentdb"]`. I set `interval: 10s, retries: 5, start_period: 30s` — this gives PostgreSQL 30 seconds to start before the first health check counts, then checks every 10 seconds.
>
> The app service then has: `depends_on: postgres: condition: service_healthy`. Compose waits until PostgreSQL's health check returns healthy before even starting the app container. This eliminates the race condition entirely. Same pattern for Redis using `redis-cli ping`, and for Kafka using the broker API version check.

---

### Q3 — Scenario
**Interviewer asks:** "Your PostgreSQL data gets wiped every time you run `docker compose down`. How do you fix it?"

**Hruday's answer:**
> The problem is that the PostgreSQL data is stored inside the container's ephemeral filesystem. When you run `docker compose down`, Docker removes the containers. When you run `docker compose up` again, a fresh container starts from the unchanged `postgres:16-alpine` image — all your data is gone.
>
> The fix is a named volume. In the `docker-compose.yml`, in the postgres service definition, I add a `volumes` entry that maps a named volume to `/var/lib/postgresql/data` — which is where PostgreSQL stores all its data files. I also declare the named volume at the top level of the Compose file.
>
> Named volumes are managed by Docker, stored on the host filesystem at `/var/lib/docker/volumes/`. They're not part of any container. When you remove the container, the volume persists. When a new postgres container starts and mounts the same named volume, it finds the existing data files and picks up exactly where it left off.
>
> One gotcha: `docker compose down -v` removes volumes too — it's the way to get a fresh database for clean integration tests. I use `docker compose down` for normal restarts (preserves data) and `docker compose down -v` only when I need to reset the database to a clean state.

---

### Q4 — Trade-Off
**Interviewer asks:** "What are the limitations of Docker Compose compared to Kubernetes?"

**Hruday's answer:**
> Compose is designed for local development and simple single-host deployments. It doesn't have the production runtime capabilities that Kubernetes provides.
>
> First, no automatic recovery across host failure. If the server running your Compose setup fails, nothing brings it back. Kubernetes runs across multiple nodes — if a node fails, the scheduler moves pods to healthy nodes.
>
> Second, no horizontal scaling built in. `docker compose up --scale app=3` creates three app containers, but there's no built-in load balancer to distribute traffic across them — you'd need to add nginx manually. In Kubernetes, a Service fronting 3 replicas handles load balancing automatically.
>
> Third, no rolling deployments. To update a Compose service, there's a restart window — downtime. Kubernetes Deployments do rolling updates: start new pods, wait for them to be ready, then terminate old ones — zero downtime.
>
> Fourth, Compose has no concept of resource limits per service enforced at the scheduler level, no concept of namespaces for isolation, and no RBAC.
>
> The right tool for the right job: Compose for local dev and integration testing in CI where you need a full local environment fast; Kubernetes for anything that needs to run reliably in production at scale.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| `depends_on` without healthcheck | "Use depends_on to make app wait for postgres" | `depends_on` without `condition: service_healthy` only waits for the container to start, not for the service inside to be ready; Spring Boot still crashes on connection refused; add a healthcheck to postgres and use `condition: service_healthy` |
| Data loss on `docker compose down` | "I have to re-seed the database every time" | Named volumes persist data across restarts; `/var/lib/postgresql/data` mapped to a named volume means postgres data survives `docker compose down` (but not `docker compose down -v`) |
| Compose for production | "We use Docker Compose in production" | Compose is for local dev and CI; it runs on a single host, has no auto-failover, no rolling deployments, no cross-node scheduling; use Kubernetes for production multi-service deployments |
| Hardcoding passwords in Compose | `POSTGRES_PASSWORD: mypassword` in committed yaml | Dev-only credentials belong in `.env` files that are in `.gitignore`; the Compose file should reference them as `${POSTGRES_PASSWORD}`; never commit even dev credentials to source control — they tend to get reused |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I set up Docker Compose for our local development environment, which had been requiring a 2-hour manual setup process before. The Compose file included PostgreSQL 16, Redis 7, and our Spring Boot service with health-check-based startup ordering. Adding `condition: service_healthy` was a specific fix I made after developers on the team kept reporting Spring Boot crashes on startup — the race condition between Spring Boot initialisation and Postgres readiness. After the fix, `docker compose up -d` reliably brought the full stack up in about 90 seconds with no crashes. I also added a `docker-compose.override.yml` for the JDWP remote debug port so developers could attach IntelliJ's debugger without modifying the base file that everyone shares."

---

## 8. Scale Evolution

**1,000 users/day →** Docker Compose is fine for local development and single-server deployments of internal tools. All developers use the same Compose file — onboarding is self-service. For the actual production server, Compose with a simple restart policy (`restart: unless-stopped`) handles basic uptime needs.

**100,000 users/day →** Compose is still used for local dev but production moves to Kubernetes. The Compose file is maintained in sync with the K8s manifests — when a new ENV var is added to the K8s deployment, it's added to the Compose file too. CI integration tests use `docker compose up` to spin up real dependencies (TestContainers is an alternative for unit tests, but Compose integration tests more closely mirror production).

**10 million users/day →** Compose is developed-tool only. Production is Kubernetes (EKS or GKE). The CI-used Compose file might have a "test" profile with lightweight mock services instead of the full Kafka — to keep CI fast. The local Compose file is maintained by the platform team and distributed as a project template — individual services extend it rather than writing their own from scratch.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Microservice dev environments need local orchestration; developers working on payment flows must test against real Kafka and Postgres locally — Compose enables this; interview often asks about local dev setup | Know healthcheck-based startup ordering; know volume persistence |
| Swiggy / Meesho | Large developer teams; onboarding speed matters; standardised Compose files mean new engineers are productive in hours; the CI pipeline uses Compose for integration tests | Know the CI integration test pattern; explain the difference from Kubernetes |
| Adobe / Microsoft | Enterprise development teams with many services; Compose is standard in polyglot stacks; some teams run Compose in CI for end-to-end tests against all dependencies including message queues | Know the override file pattern; explain how Compose complements Kubernetes |
| SAP Labs | SAP's internal developer experience mandates reproducible local environments; Compose is the standard way teams achieve this; SAP uses it for BTP service development and integration testing | Direct experience; connect to the race condition fix and the onboarding improvement |

---

## 10. Related Topics — What to Study Next

- **Topic 180 — Why Docker** — the conceptual foundation; Compose is a layer on top of Docker; understanding Docker images, containers, and networking makes Compose configuration intuitive rather than magic
- **Topic 184 — Container networking and volumes** — Docker Compose networks are Docker bridge networks managed for you; the named volumes concept is Docker volumes; understanding the underlying mechanics helps diagnose Compose networking issues
- **Topic 185 — Kubernetes architecture** — the production counterpart to Compose; if Compose is local dev, Kubernetes is production; understanding both and the difference between them is expected at senior level
- **Topic 191 — GitHub Actions** — how CI pipelines use Compose to spin up integration test environments; `docker compose up -d; run tests; docker compose down` is a common CI pattern worth knowing end-to-end
- **Topic 260 — TestContainers** — an alternative to Compose for integration tests in Java; spins up real containers (Postgres, Redis, Kafka) as part of the JUnit test lifecycle; complements Compose rather than replacing it

---

*Part 11 · Docker Compose — Local Multi-Service Setup · Full Stack Interview Guide · Hruday D · 2026*
