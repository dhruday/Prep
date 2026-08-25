# Container Networking and Volumes
> Part 11 — DevOps, Docker & Kubernetes
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Container networking problem**: containers are isolated by default, each with their own network namespace; for containers to talk to each other, they must be on the same Docker network; port mapping (`-p 8080:8080`) exposes a container port to the host; service discovery works via container name DNS within a Docker network
- **Network types**: `bridge` (default — each container gets its own virtual NIC on a private subnet; containers communicate with each other via container name); `host` (container shares the host's network stack directly — no isolation); `none` (no network at all — maximum isolation)
- **Volume problem**: containers are ephemeral — when a container is removed, anything written to its filesystem is lost; volumes solve this by mounting a directory from the host (or a managed Docker volume) into the container filesystem
- **Two storage types**: **bind mount** (`/path/on/host:/path/in/container`) — mounts an exact host path; used for sharing source code in dev; **named volume** (`volume-name:/path/in/container`) — Docker manages the storage location; portable across machines; best for databases
- **Port mapping**: `-p 8080:8080` means "host port 8080 → container port 8080"; multiple containers can use the same internal port (each container has its own namespace); they map to different host ports; no conflict
- **Overlay networks** — for Kubernetes/Docker Swarm: cross-host virtual networks that make containers on different physical machines addressable by IP within the cluster
- 🆕 **Gap topic for Hruday**: "I've used Docker networks and volumes in Compose setups at SAP. I've studied the bridge/host/none types and the named volume vs bind mount distinction to understand what happens when I configure these patterns"

---

## 1. One-Line Definition
Docker networking allows containers to communicate with each other and with the outside world by assigning each container a virtual network interface within a software-defined network; Docker volumes decouple container data from container lifecycle so that data persists when containers are removed or replaced.

---

## 2. The Problem It Solves

**The networking problem:**

Two containers start on the same Docker host. Container A is a Spring Boot service. Container B is PostgreSQL. By default, they are completely isolated — Container A cannot reach Container B at all. If you try to connect with `localhost:5432` from inside the Spring Boot container, you're talking to the container's own loopback interface, not to the PostgreSQL container.

The solution is Docker networks. When both containers join the same network, Docker's built-in DNS service makes them addressable by name. The Spring Boot container can connect to `jdbc:postgresql://postgres:5432/mydb` — where "postgres" is the container name or Compose service name. Docker DNS resolves "postgres" to the PostgreSQL container's IP on that network automatically.

**The volume problem:**

Containers are designed to be ephemeral. The "write layer" — the filesystem changes made inside a running container — exists only as long as the container exists. When you remove a container and start a new one from the same image, the write layer is gone. For databases, this means all your data disappears every time you recreate the database container. For a development environment, this means every `docker compose down` wipes your database.

Docker volumes solve this by storing data outside the container's lifecycle. The volume lives on the Docker host independently of any container. When the same volume is mounted into a new container, the data is there. PostgreSQL stores its data in `/var/lib/postgresql/data` — mount a named volume there, and your data survives any number of container recreations.

---

## 3. How It Works Internally

### Bridge Network — The Default

```
Single Docker host with three containers:

Host machine (Linux)
  Physical NIC: eth0 (IP: 192.168.1.100)
  
  Docker bridge: docker0 (IP: 172.17.0.1)
                 Acts as a virtual switch for all containers on the default bridge
  
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ Container A      │  │ Container B      │  │ Container C      │
  │ payment-service  │  │ postgres         │  │ redis            │
  │                  │  │                  │  │                  │
  │ veth0: 172.17.0.2│  │ veth0: 172.17.0.3│  │ veth0: 172.17.0.4│
  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
           │                     │                      │
           └─────────────────────┴──────────────────────┘
                                 │
                            Docker bridge (docker0): 172.17.0.1
                                 │
                            Host Network Stack (eth0)
                                 │
                            Internet / external traffic

Container A can reach Container B at 172.17.0.3:5432    (IP-based)
OR at postgres:5432 (name-based DNS — if using a named bridge network, not the default)

Default bridge limitation:
  NAME-BASED DNS does NOT work on the default bridge network
  You must use a named bridge network (custom network) for hostname resolution
  Docker Compose creates a named bridge network automatically — that's why Compose DNS works

Named bridge network (what Compose creates):
  docker network create backend-net
  → Both containers on backend-net can reach each other by CONTAINER NAME or SERVICE NAME
  → postgres container is reachable as "postgres" from any container on backend-net
```

### Port Mapping — Host to Container

```
Port mapping: -p <host-port>:<container-port>

Example:
  Container A: Spring Boot listening on port 8080 (container's port 8080)
  Container B: PostgreSQL listening on port 5432 (container's port 5432)
  
  From OUTSIDE Docker (your browser, API client, psql on laptop):
    You can't connect to container-internal ports directly
    You need port mapping to "punch a hole" from the host to the container
    
  docker run -p 8080:8080 payment-service
    → Host's port 8080 → Container's port 8080
    → curl http://localhost:8080 from your laptop works
    
  docker run -p 5433:5432 postgres   (map host 5433 to container 5432)
    → psql -h localhost -p 5433 from your laptop works
    → Within Docker: other containers still connect on postgres:5432 (internal port)
    → Host-facing port can be different — internal port is always 5432

Multiple containers, same internal port:
  Container A: Spring Boot on 8080 → mapped to host 8080
  Container B: Another Spring Boot → mapped to host 8081
  Both use port 8080 internally — no conflict — each has its own network namespace
  Different host ports avoid collision on the host machine
  
No port mapping needed for service-to-service:
  Spring Boot container communicating with Postgres container on the same network:
  jdbc:postgresql://postgres:5432/db → Container-to-container, no host port involved
  Port mapping is ONLY needed for access FROM OUTSIDE Docker
```

### Volume Types — When to Use Which

```
Three storage types:

1. BIND MOUNT — host path mapped into container
   docker run -v /home/hruday/code:/app payment-service
   OR in Compose: volumes: - ./code:/app
   
   What it is: a real directory on the host mounted into the container
   
   Use case:
   ├── Local development: mount source code so container sees your edits live
   ├── Config files: mount nginx.conf from the host without rebuilding the image
   └── Log collection: container writes logs to a mounted path you can read from host
   
   Risk: the container can read/write the host filesystem at that path
         If the container is compromised, it can modify host files (use :ro for read-only)
   Portability: the path must exist on the host — breaks on other machines if the path differs

2. NAMED VOLUME — Docker-managed storage
   docker run -v postgres-data:/var/lib/postgresql/data postgres
   OR in Compose: 
     volumes:
       postgres-data: (top-level)
     service:
       volumes: - postgres-data:/var/lib/postgresql/data
   
   What it is: Docker creates and manages a directory on the host (usually /var/lib/docker/volumes/)
   
   Use case:
   ├── Databases: PostgreSQL, MySQL, Redis data — survives container rereplacement
   ├── File uploads: user files that must persist across deployments
   └── Any data that outlives the container lifecycle
   
   Portable: the volume name is consistent; data location varies by OS but Docker manages it
   Can be backed up: docker run --volumes-from data-container busybox tar cvf /backup.tar /data

3. TMPFS MOUNT — in-memory only (Linux)
   docker run --tmpfs /tmp payment-service
   
   What it is: a filesystem backed by RAM — nothing written to disk
   
   Use case: temporary files that are sensitive (don't want on disk) or must be fast
   Ephemeral: gone when container stops; can't be shared between containers
```

### Network Types

```
bridge (custom named bridge — use this):
  Creates a virtual network; containers communicate by name via Docker DNS
  Isolated from other networks; routing handled by Docker
  The right choice for multi-container setups (Compose, single-host)

host:
  Container uses the HOST machine's network stack directly
  Container listens on 0.0.0.0:8080 → same as if the process ran directly on the host
  No port mapping needed: -p flag is ignored with --network=host
  
  Use case: performance-critical scenarios where container network overhead matters
  Risk: no network isolation — container can see and bind ANY host port
  Not available on macOS/Windows Docker Desktop (these run Linux in a VM — 'host' is the VM)
  NOT recommended for production containers — violates isolation principle

none:
  Container has only the loopback interface (127.0.0.1)
  Cannot communicate with anything outside itself
  
  Use case: batch jobs that don't need network access; maximum security isolation;
  data processing containers that take input from stdin and write to stdout

overlay (Swarm / Kubernetes):
  Cross-host virtual network — containers on different physical machines can communicate
  Used by Docker Swarm and Kubernetes
  A pod on Node A can reach a pod on Node B by pod IP or service DNS
```

---

## 4. The Code

### Wrong Way — Container Isolation Mistakes
```bash
# WRONG: Trying to connect to another container via localhost
docker run -d --name postgres -p 5432:5432 postgres:16-alpine
docker run -d --name spring-app \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/db \   # WRONG!
  payment-service

# 'localhost' inside the spring-app container = the container's own loopback (127.0.0.1)
# The postgres container is NOT at localhost from inside spring-app
# This will throw: Connection refused — Host 127.0.0.1 — Port 5432
```

```bash
# WRONG: Using the default bridge network (no DNS hostname support)
docker run -d --name postgres postgres:16-alpine
docker run -d --name spring-app \
  --link postgres:postgres \                    # LEGACY — --link is deprecated
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/db \
  payment-service

# --link is deprecated and will be removed; use custom networks instead
# --link is a one-way, hardcoded relationship with no service discovery features
```

```bash
# WRONG: Using bind mount for database data
docker run -d --name postgres \
  -v /tmp/postgres-data:/var/lib/postgresql/data \   # Bind mount to /tmp
  postgres:16-alpine

# /tmp is cleared on host restart — data is lost
# Path is specific to this machine — docker-compose.yml with this mount fails on other machines
```

> **Why this fails in production:** The `localhost` mistake causes the most Spring Boot + Docker startup failures. The intent is right but the networking model is wrong. Containers are isolated processes, not processes on the same machine — `localhost` is local to EACH container. The named network pattern with DNS is the only correct way.

### Right Way — Production-Correct Networking and Volumes

**Creating and using a custom network:**
```bash
# Create a named bridge network
docker network create --driver bridge payment-network

# Run postgres on this network
docker run -d \
  --name postgres \
  --network payment-network \
  -e POSTGRES_DB=paymentdb \
  -e POSTGRES_USER=payuser \
  -e POSTGRES_PASSWORD=devpassword \
  -v postgres-data:/var/lib/postgresql/data \   # Named volume for data persistence
  -p 5432:5432 \                               # Expose to host for DBeaver/psql on laptop
  postgres:16-alpine

# Run Spring Boot on the same network
docker run -d \
  --name payment-service \
  --network payment-network \
  # Connect to "postgres" by SERVICE/CONTAINER NAME — Docker DNS resolves it
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/paymentdb \
  -e SPRING_DATASOURCE_USERNAME=payuser \
  -e SPRING_DATASOURCE_PASSWORD=devpassword \
  -p 8080:8080 \
  payment-service:1.0.0

# Verify connectivity
docker exec payment-service ping postgres   # Should resolve and respond
docker exec payment-service \
  curl -s http://localhost:8080/actuator/health  # Spring Boot health check
```

**Named volume management:**
```bash
# List all named volumes
docker volume ls

# Inspect a volume — see where Docker stores the data on the host
docker volume inspect postgres-data
# [
#   {
#     "Name": "postgres-data",
#     "Mountpoint": "/var/lib/docker/volumes/postgres-data/_data",  ← actual location on host
#     "Driver": "local"
#   }
# ]

# Backup a named volume (copy data out while container is running)
docker run --rm \
  -v postgres-data:/source:ro \             # Mount the volume (read-only)
  -v $(pwd)/backups:/backup \               # Bind mount for the backup output
  busybox \
  tar czf /backup/postgres-backup.tar.gz -C /source .
# Creates: ./backups/postgres-backup.tar.gz — a full database file backup

# Restore from backup
docker run --rm \
  -v postgres-data:/target \
  -v $(pwd)/backups:/backup:ro \
  busybox \
  tar xzf /backup/postgres-backup.tar.gz -C /target
```

**Docker Compose with proper networking and volumes:**
```yaml
# docker-compose.yml — correct network and volume configuration
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    networks:
      - backend-net              # All services on the same named network
    volumes:
      - postgres-data:/var/lib/postgresql/data   # Named volume — survives restarts
    environment:
      POSTGRES_DB: paymentdb
      POSTGRES_USER: payuser
      POSTGRES_PASSWORD: devpassword

  app:
    build: .
    networks:
      - backend-net              # Same network as postgres — can resolve by service name
    environment:
      # "postgres" resolves to the postgres container IP via Docker DNS
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/paymentdb
    volumes:
      # Bind mount only for development — hot-reload the JAR without rebuilding
      - ./target/payment-service.jar:/app/app.jar:ro
    ports:
      - "8080:8080"              # Expose to host — allows curl from localhost

  # Service with NO network access — batch processing job
  data-processor:
    image: data-processor:1.0.0
    network_mode: "none"         # No networking — reads from /data volume only
    volumes:
      - ./input-data:/data:ro    # Read-only bind mount for input data

volumes:
  postgres-data:                 # Docker manages the storage location

networks:
  backend-net:
    driver: bridge
```

**Read-only bind mounts for security:**
```bash
# Mount configuration files as read-only — container can't accidentally modify them
docker run -d \
  --name payment-service \
  -v $(pwd)/config/application-prod.yml:/app/config/application-prod.yml:ro \
  payment-service:1.0.0

# Read-only source code mount for development (hot-reload, can't accidentally delete files)
docker run -d \
  --name payment-service-dev \
  -v $(pwd)/target:/app/target:ro \   # :ro prevents container from modifying your build output
  payment-service:dev
```

> **Key decisions here:**
> - Custom named network not the default bridge — the default bridge network does not support DNS-based hostname resolution; custom networks always do; Compose creates a custom network automatically, which is why Compose DNS works without any extra configuration
> - Named volumes not bind mounts for databases — bind mounts tie the data location to a specific host path; named volumes are portable and Docker handles the underlying path; this is why `postgres-data:/var/lib/postgresql/data` is the correct pattern
> - `:ro` (read-only) on volume mounts where the container doesn't need write access — defence in depth; a compromised container can't exfiltrate data by overwriting files it can only read

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do two containers on the same Docker host communicate with each other?"

**Hruday's answer:**
> Containers are isolated by default — they can't reach each other just because they're on the same host. For container-to-container communication, both containers must join the same Docker network.
>
> The standard way to do this is with a custom bridge network. You create a named network — for example, `docker network create backend-net` — and start both containers with `--network backend-net`. Docker's embedded DNS then automatically resolves the container's name or hostname to its IP address within that network. Container A can reach Container B at `http://container-b:8080` without knowing or caring about any IP addresses.
>
> This is how Docker Compose works — it creates a custom bridge network for all services defined in the `docker-compose.yml`, and that's why a Spring Boot service can use `postgres` as the hostname for the PostgreSQL container. The service name becomes a DNS hostname on that network.
>
> For access from outside Docker — your browser, your API testing tool — you use port mapping: `-p 8080:8080` maps the host's port 8080 to the container's port 8080. Container-to-container communication doesn't use port mapping; it uses the container network directly.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you use a bind mount vs a named volume in Docker?"

**Hruday's answer:**
> The short answer: bind mounts for configuration and development workflows; named volumes for any data you need to persist long-term.
>
> A bind mount mounts an exact path from the host filesystem into the container. I use bind mounts in two situations. First, for development hot-reload: mounting `./target/app.jar:/app/app.jar:ro` lets me rebuild the JAR on my machine and restart the Spring Boot container without rebuilding the image — much faster iteration. Second, for configuration files: mounting `./config/application-dev.yml:/app/config/application-dev.yml:ro` so I can tweak config without a full rebuild.
>
> A named volume is Docker-managed storage. Docker decides where the data actually lives on the host, typically under `/var/lib/docker/volumes/`. For databases, this is the correct choice: `postgres-data:/var/lib/postgresql/data`. The volume persists across container restarts and removal. Docker Compose's `down` command removes containers but leaves named volumes — the data is there when you run `up` again. Only `down -v` removes volumes.
>
> The rule of thumb I follow: if the data's lifecycle should match the host filesystem and be directly accessible from the host, use a bind mount. If the data should persist independently of containers and be managed by Docker, use a named volume.

---

### Q3 — Scenario
**Interviewer asks:** "A Spring Boot service in Docker can't connect to a PostgreSQL container. How do you debug it?"

**Hruday's answer:**
> I'd work through four checks in order.
>
> First, are both containers on the same network? `docker inspect postgres` — look at the NetworkSettings section for the network name. `docker inspect spring-app` — same network? If they're on different networks or the default bridge, DNS resolution by name won't work. Fix: create a custom named network, attach both containers to it.
>
> Second, is the connection string using the correct hostname? The Spring Boot container can't use `localhost` to reach PostgreSQL — `localhost` is local to the Spring Boot container. The hostname must be the PostgreSQL container's name or Compose service name: `jdbc:postgresql://postgres:5432/db`. Check the environment variable: `docker exec spring-app env | grep DATASOURCE`.
>
> Third, can the Spring Boot container resolve the postgres hostname? `docker exec spring-app ping postgres` or `docker exec spring-app nslookup postgres`. If this fails, it's a network configuration issue. If it resolves, the container can reach the network address.
>
> Fourth, is PostgreSQL actually ready? Even after the container starts, Postgres takes 5-10 seconds to initialise the data directory. If Spring Boot tries to connect during that window, it gets a connection refused. The fix is healthcheck-based `depends_on` in Compose, or adding Spring's application event retry logic in `application.yml`: `spring.datasource.hikari.connection-timeout=30000` and spring.sql.init.mode with retry configuration.

---

### Q4 — Trade-Off
**Interviewer asks:** "What is the `host` network mode and when would you use it?"

**Hruday's answer:**
> Host network mode removes all network isolation between the container and the host. The container's processes bind directly to the host's network interfaces. A Spring Boot service in host mode listening on 8080 is equivalent to running that service directly on the server — it's accessible at `localhost:8080` without any port mapping.
>
> The performance benefit: the virtual bridge network in normal Docker mode has overhead for the port translation, the virtual NIC, the bridging. Host mode eliminates this — useful for network-intensive applications where every millisecond of latency matters, like monitoring agents that need to see all host network traffic.
>
> The cost: zero isolation. The container can see and potentially bind any port on the host. Port conflicts with host services are possible. Multiple containers using the same port (which works fine with normal bridge mode) is impossible in host mode. A compromised container has much easier access to the host.
>
> In practice I'd use host mode for: eBPF-based observability tools (like Cilium or Pixie) that need to instrument the host's kernel; network performance testing tools; monitoring agents where that extra latency matters at high throughput. For application services — Spring Boot APIs, databases — normal bridge mode with named networks is always the right choice. The isolation and safety benefits far outweigh the minor performance overhead.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| `localhost` between containers | "I use localhost to connect containers" | Every container has its own loopback interface; localhost is local to each container; use container name or service name on a shared custom network; this is the most common Docker networking mistake |
| Default bridge DNS | "I just put both on the default network" | The default bridge network (`docker0`) does NOT support DNS hostname resolution — containers must know each other's IP addresses; only custom named networks support DNS by name; Compose always creates a custom network, which is why it works |
| Data in container filesystem | "Database data is inside the container" | Without a volume, database data is in the container's write layer; removing the container removes all data; always use named volumes for database containers |
| Bind mount vs named volume confusion | "Same thing — both are volumes" | Bind mount = specific host path; named volume = Docker-managed; named volumes are portable and don't depend on specific host paths; databases need named volumes, not bind mounts |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I debugged a classic container networking issue when setting up the local dev environment. A developer had the Spring Boot service connecting to `localhost:5432` for PostgreSQL — which worked fine when running both directly on the host but failed inside Docker because `localhost` inside the container meant the container's own loopback, not the postgres container. I replaced it with the postgres service name in the connection string and put both on a shared Compose network. I also fixed the data persistence issue — the PostgreSQL container was using a bind mount to a path that didn't exist consistently across developer machines. Switching to a named volume made the setup portable and made data survive the `docker compose down` that developers ran at end of day. The result: all developers had a working environment with no data loss across restarts."

---

## 8. Scale Evolution

**1,000 users/day →** Custom named networks and named volumes in Compose cover all local and simple single-host scenarios. Every developer understands container-to-container DNS by service name. PostgreSQL and Redis data persists via named volumes.

**100,000 users/day →** Network security policies within Kubernetes namespaces restrict which services can talk to which (`NetworkPolicy`). Persistent volumes in Kubernetes (backed by EBS, NFS, or cloud storage) replace named Docker volumes for stateful services. Volume snapshots for database backup are automated.

**10 million users/day →** Container Network Interface (CNI) plugins (Calico, Cilium) provide network policy enforcement, observability, and sometimes encryption for all pod-to-pod traffic. Volume access modes, storage classes, and PVC (PersistentVolumeClaim) lifecycle management are handled by platform teams. Data encryption at rest is enforced at the storage layer (EBS encryption, GCP persistent disk encryption). Network egress is controlled — containers can't make arbitrary outbound calls to the internet.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment microservices have strict network isolation requirements — service A should not be able to directly talk to service B's database; Kubernetes NetworkPolicies restrict this at the container networking level | Know that custom bridge networks provide isolation; mention NetworkPolicy as the K8s production control |
| Swiggy / Meesho | Large volumes of data (order history, user profiles) stored in containerised databases in development environments; volume persistence means developer databases don't wipe on every restart | Know named volumes; know the backup/restore pattern |
| Adobe / Microsoft | Enterprise products often run in secure network zones; container network segmentation is an audit requirement; the concept of "only these services can talk to the DB" is enforced by network configuration | Know network isolation; explain custom networks vs default bridge |
| SAP Labs | SAP BTP services require network isolation between tenant workloads; Kubernetes NetworkPolicies enforce this; understanding Docker networking foundations makes K8s networking intuitive | Connect to direct SAP experience; explain the DNS resolution mechanism |

---

## 10. Related Topics — What to Study Next

- **Topic 183 — Docker Compose** — this topic provides the Docker networking and volume mechanics; Compose uses these concepts directly; understanding both together makes docker-compose.yml configuration entirely clear
- **Topic 186 — Kubernetes Deployments, ReplicaSets, Services** — Kubernetes Services are the production-grade version of Docker's port mapping and service discovery; ClusterIP, NodePort, LoadBalancer service types build on the same networking concepts
- **Topic 187 — Kubernetes ConfigMaps and Secrets** — the production-grade version of Docker's `-e ENV_VAR` and volume-mounted config files; same problem (injecting config into containers) solved at cluster scale
- **Topic 177 — Encryption at rest and in transit** — Docker volumes are NOT encrypted by default; EBS-backed Kubernetes PersistentVolumes can be encrypted with KMS; this is the security layer on top of the volume concepts here
- **Practice**: run `docker network ls` and `docker volume ls` on any machine with Docker; run `docker inspect` on a running container and read the NetworkSettings section; this builds the mental model for how the pieces connect

---

*Part 11 · Container Networking and Volumes · Full Stack Interview Guide · Hruday D · 2026*
