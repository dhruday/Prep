# 🐳 Day 2: Docker for ML

## 📚 Table of Contents
1. [Why Docker for ML?](#-why-docker-for-ml)
2. [Docker Fundamentals](#-docker-fundamentals)
3. [Writing Dockerfiles for ML](#-writing-dockerfiles-for-ml)
4. [Optimizing Docker Images](#-optimizing-docker-images)
5. [GPU Support with Docker](#-gpu-support-with-docker)
6. [Docker Compose for ML](#-docker-compose-for-ml)
7. [Common Patterns](#-common-patterns)
8. [Debugging Docker](#-debugging-docker)
9. [Exercises](#-exercises)

---

## 🎯 Why Docker for ML?

### The "Works on My Machine" Problem

```
WITHOUT DOCKER:

Developer Machine          Production Server
┌─────────────────┐       ┌─────────────────┐
│ Python 3.11     │       │ Python 3.9      │  ❌ Different version
│ PyTorch 2.1     │       │ PyTorch 1.13    │  ❌ Different version  
│ CUDA 12.1       │       │ CUDA 11.7       │  ❌ Incompatible
│ Ubuntu 22.04    │       │ CentOS 7        │  ❌ Different OS
│ Works! ✓        │       │ Crashes! ✗      │
└─────────────────┘       └─────────────────┘

WITH DOCKER:

Developer Machine          Production Server
┌─────────────────┐       ┌─────────────────┐
│ ┌─────────────┐ │       │ ┌─────────────┐ │
│ │ Container   │ │       │ │ Container   │ │
│ │ Python 3.11 │ │  ===  │ │ Python 3.11 │ │  ✅ Identical!
│ │ PyTorch 2.1 │ │       │ │ PyTorch 2.1 │ │
│ │ CUDA 12.1   │ │       │ │ CUDA 12.1   │ │
│ └─────────────┘ │       │ └─────────────┘ │
└─────────────────┘       └─────────────────┘
```

### Key Benefits for ML

| Benefit | Description |
|---------|-------------|
| **Reproducibility** | Same environment everywhere |
| **Isolation** | Dependencies don't conflict |
| **Portability** | Run anywhere Docker runs |
| **Scalability** | Easy to spin up multiple instances |
| **Version Control** | Track environment changes |
| **GPU Support** | NVIDIA Container Toolkit |

---

## 🏗️ Docker Fundamentals

### Core Concepts

```
DOCKER CONCEPTS:

┌──────────────┐
│  Dockerfile  │ ──── Build instructions (recipe)
└──────┬───────┘
       │ docker build
       ▼
┌──────────────┐
│    Image     │ ──── Read-only template (snapshot)
└──────┬───────┘
       │ docker run
       ▼
┌──────────────┐
│  Container   │ ──── Running instance (process)
└──────────────┘

KEY TERMS:
├── Image: Blueprint for containers (like a class)
├── Container: Running instance of an image (like an object)
├── Dockerfile: Script to build an image
├── Registry: Storage for images (Docker Hub, ECR, GCR)
└── Volume: Persistent storage that survives container restarts
```

### Essential Commands

```bash
# Building images
docker build -t my-ml-app:1.0 .           # Build image
docker build -t my-ml-app:1.0 -f custom.Dockerfile .  # Custom file

# Running containers
docker run my-ml-app:1.0                   # Run container
docker run -d my-ml-app:1.0                # Run in background
docker run -p 8000:8000 my-ml-app:1.0      # Map ports
docker run -v /data:/app/data my-ml-app   # Mount volume
docker run -e API_KEY=xxx my-ml-app       # Set env variable

# Managing containers
docker ps                                  # List running containers
docker ps -a                               # List all containers
docker stop <container_id>                 # Stop container
docker rm <container_id>                   # Remove container
docker logs <container_id>                 # View logs
docker exec -it <container_id> bash        # Shell into container

# Managing images
docker images                              # List images
docker rmi <image_id>                      # Remove image
docker pull nvidia/cuda:12.1-base          # Pull from registry
docker push myuser/my-ml-app:1.0          # Push to registry

# Cleanup
docker system prune                        # Remove unused data
docker system prune -a                     # Remove everything unused
```

---

## 📝 Writing Dockerfiles for ML

### Basic ML Dockerfile

```dockerfile
# Dockerfile
# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### requirements.txt

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
transformers==4.37.0
torch==2.1.2
sentence-transformers==2.2.2
pydantic==2.5.3
python-multipart==0.0.6
```

### Build and Run

```bash
# Build the image
docker build -t ml-api:1.0 .

# Run the container
docker run -p 8000:8000 ml-api:1.0

# Test it
curl http://localhost:8000/health
```

### Dockerfile for Hugging Face Models

```dockerfile
# Dockerfile.hf
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download model (cache in image)
RUN python -c "from transformers import pipeline; pipeline('sentiment-analysis')"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## ⚡ Optimizing Docker Images

### Multi-Stage Builds

```dockerfile
# Dockerfile.multistage
# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

# Result: Smaller image without build tools!
```

### Layer Caching Strategy

```dockerfile
# GOOD: Optimized layer caching
FROM python:3.11-slim

WORKDIR /app

# Layer 1: System deps (rarely changes)
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Layer 2: Python deps (changes sometimes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Layer 3: Model download (changes rarely)
RUN python -c "from transformers import AutoModel; AutoModel.from_pretrained('bert-base-uncased')"

# Layer 4: App code (changes often)
COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

# BAD: Invalidates cache unnecessarily
# COPY . .  <-- Don't copy everything first!
# RUN pip install -r requirements.txt
```

### .dockerignore

```
# .dockerignore
.git
.gitignore
.env
__pycache__
*.pyc
*.pyo
*.egg-info
.pytest_cache
.mypy_cache
venv
.venv
notebooks/
tests/
docs/
*.md
!README.md
Dockerfile*
docker-compose*
.dockerignore
models/  # If models are large and downloaded at runtime
```

### Size Comparison

```
IMAGE SIZE COMPARISON:

Base Image               │ Typical Size │ Use Case
─────────────────────────┼──────────────┼──────────────────
python:3.11              │ ~1.0 GB      │ Development
python:3.11-slim         │ ~150 MB      │ Production (no GPU)
python:3.11-alpine       │ ~50 MB       │ Minimal (issues with ML)
nvidia/cuda:12.1-base    │ ~250 MB      │ GPU base
nvidia/cuda:12.1-devel   │ ~4.0 GB      │ GPU with CUDA tools

WITH ML DEPENDENCIES:

python:3.11-slim + PyTorch    │ ~3.0 GB
python:3.11-slim + TF         │ ~2.5 GB
+ Transformers models         │ +500MB - 20GB per model
```

---

## 🎮 GPU Support with Docker

### Prerequisites

```bash
# 1. NVIDIA drivers installed on host
nvidia-smi  # Should show GPU info

# 2. Install NVIDIA Container Toolkit
# Ubuntu/Debian:
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### GPU Dockerfile

```dockerfile
# Dockerfile.gpu
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install Python
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install PyTorch with CUDA support
COPY requirements-gpu.txt .
RUN pip install --no-cache-dir -r requirements-gpu.txt

COPY . .

EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### requirements-gpu.txt

```txt
torch==2.1.2+cu121
--extra-index-url https://download.pytorch.org/whl/cu121
transformers==4.37.0
fastapi==0.109.0
uvicorn[standard]==0.27.0
```

### Running with GPU

```bash
# Build GPU image
docker build -f Dockerfile.gpu -t ml-api-gpu:1.0 .

# Run with GPU access
docker run --gpus all -p 8000:8000 ml-api-gpu:1.0

# Run with specific GPU
docker run --gpus '"device=0"' -p 8000:8000 ml-api-gpu:1.0

# Run with multiple GPUs
docker run --gpus '"device=0,1"' -p 8000:8000 ml-api-gpu:1.0

# Verify GPU in container
docker run --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

---

## 🐙 Docker Compose for ML

### Basic Compose File

```yaml
# docker-compose.yml
version: '3.8'

services:
  ml-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MODEL_NAME=distilbert-base-uncased
    volumes:
      - ./models:/app/models  # Persist downloaded models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Full ML Stack

```yaml
# docker-compose.full.yml
version: '3.8'

services:
  # ML API Service
  ml-api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CHROMA_HOST=chromadb
      - REDIS_HOST=redis
    depends_on:
      - chromadb
      - redis
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    
  # Vector Database
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma
    
  # Cache
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  # Experiment Tracking
  mlflow:
    image: ghcr.io/mlflow/mlflow:latest
    ports:
      - "5000:5000"
    volumes:
      - mlflow_data:/mlflow
    command: mlflow server --host 0.0.0.0

volumes:
  chroma_data:
  redis_data:
  mlflow_data:
```

### Running Compose

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Start specific service
docker-compose up ml-api

# Rebuild and start
docker-compose up --build

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f ml-api

# Scale service
docker-compose up -d --scale ml-api=3
```

---

## 📦 Common Patterns

### Pattern 1: Model Caching

```dockerfile
# Cache models in image (faster startup, larger image)
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download model during build
ENV TRANSFORMERS_CACHE=/app/models
RUN python -c "from transformers import AutoModel, AutoTokenizer; \
    AutoModel.from_pretrained('bert-base-uncased'); \
    AutoTokenizer.from_pretrained('bert-base-uncased')"

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# OR: Mount model cache volume (slower startup, smaller image)
services:
  ml-api:
    build: .
    volumes:
      - model_cache:/root/.cache/huggingface
```

### Pattern 2: Secrets Management

```yaml
# docker-compose.yml with secrets
version: '3.8'

services:
  ml-api:
    build: .
    secrets:
      - openai_key
    environment:
      - OPENAI_API_KEY_FILE=/run/secrets/openai_key

secrets:
  openai_key:
    file: ./secrets/openai_key.txt
```

```python
# app.py - Read secret from file
import os

def get_api_key():
    key_file = os.getenv('OPENAI_API_KEY_FILE')
    if key_file and os.path.exists(key_file):
        with open(key_file) as f:
            return f.read().strip()
    return os.getenv('OPENAI_API_KEY')
```

### Pattern 3: Health Checks

```dockerfile
# Add curl for health checks
FROM python:3.11-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# ... rest of Dockerfile

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1
```

### Pattern 4: Non-Root User

```dockerfile
FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 🔧 Debugging Docker

### Common Issues

```bash
# Issue: Port already in use
# Solution: Use different port or stop existing container
docker ps  # Find container using port
docker stop <container_id>

# Issue: Module not found
# Solution: Check requirements.txt and rebuild
docker build --no-cache -t ml-api:1.0 .

# Issue: Permission denied
# Solution: Use non-root user or fix permissions
docker exec -it <container_id> ls -la /app

# Issue: Out of memory (OOM)
# Solution: Increase memory limit
docker run -m 4g ml-api:1.0  # Limit to 4GB

# Issue: GPU not available
# Solution: Check nvidia-docker setup
docker run --gpus all nvidia/cuda:12.1.0-base nvidia-smi
```

### Debugging Commands

```bash
# Shell into running container
docker exec -it <container_id> bash

# Shell into new container (doesn't start CMD)
docker run -it ml-api:1.0 bash

# Check container logs
docker logs <container_id>
docker logs -f <container_id>  # Follow logs

# Inspect container
docker inspect <container_id>

# Check resource usage
docker stats

# View build history
docker history ml-api:1.0

# Check image layers
docker inspect ml-api:1.0
```

### Testing Locally

```bash
# Build and test interactively
docker build -t ml-api:test .

# Run with shell to debug
docker run -it --rm ml-api:test bash

# Inside container:
python -c "import torch; print(torch.cuda.is_available())"
python -c "from transformers import pipeline; print('OK')"
uvicorn app:app --host 0.0.0.0 --port 8000
```

---

## ✏️ Exercises

### Exercise 1: Basic Containerization
Containerize the FastAPI ML app from Day 1:
- Write a Dockerfile
- Build and run locally
- Test all endpoints

### Exercise 2: Optimize Image Size
Start with a basic Dockerfile and optimize:
- Use multi-stage build
- Implement proper .dockerignore
- Compare image sizes before/after

### Exercise 3: GPU Container
Create a GPU-enabled container:
- Use nvidia/cuda base image
- Install PyTorch with CUDA
- Verify GPU access inside container

### Exercise 4: Docker Compose Stack
Build a complete ML stack:
- ML API service
- ChromaDB for vectors
- Redis for caching
- Health checks for all services

---

## 📝 Quick Reference

```dockerfile
# DOCKERFILE TEMPLATE FOR ML

# Base image
FROM python:3.11-slim

# Metadata
LABEL maintainer="your@email.com"
LABEL version="1.0"

# Environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Working directory
WORKDIR /app

# Python deps (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Non-root user
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s \
    CMD curl -f http://localhost:8000/health || exit 1

# Port
EXPOSE 8000

# Command
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## ✅ Day 2 Checklist

By the end of today, you should:
- [ ] Understand Docker concepts (images, containers, volumes)
- [ ] Write Dockerfiles for ML applications
- [ ] Optimize images with multi-stage builds
- [ ] Use Docker Compose for multi-service stacks
- [ ] Run containers with GPU access
- [ ] Debug common Docker issues

---

## 🔜 Next: Day 3

Tomorrow we'll deploy our containerized ML app to the cloud!

**Continue to**: [03-Cloud-Deployment.md](./03-Cloud-Deployment.md)
