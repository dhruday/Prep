# 🚀 Day 7: Deployment Projects

## 📚 Table of Contents
1. [Project Overview](#-project-overview)
2. [Project 1: Sentiment Analysis API](#-project-1-sentiment-analysis-api)
3. [Project 2: RAG Chatbot Service](#-project-2-rag-chatbot-service)
4. [Project 3: Full MLOps Pipeline](#-project-3-full-mlops-pipeline)
5. [Project Checklist](#-project-checklist)

---

## 🎯 Project Overview

### What You'll Build

```
PROJECT 1: SENTIMENT ANALYSIS API (Beginner)
├── FastAPI server with ML model
├── Docker containerization
├── Cloud deployment (Cloud Run)
├── Basic monitoring
└── Time: 2-3 hours

PROJECT 2: RAG CHATBOT SERVICE (Intermediate)
├── Document ingestion pipeline
├── Vector database integration
├── LLM-powered chat endpoint
├── Docker Compose stack
├── Experiment tracking
└── Time: 3-4 hours

PROJECT 3: FULL MLOps PIPELINE (Advanced)
├── Training pipeline with DVC
├── MLflow experiment tracking
├── Model registry + versioning
├── CI/CD with GitHub Actions
├── Production monitoring
├── Automated retraining trigger
└── Time: 4-6 hours
```

---

## 📊 Project 1: Sentiment Analysis API

### Goal
Build and deploy a production-ready sentiment analysis API.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SENTIMENT ANALYSIS API                        │
│                                                                  │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐             │
│  │  Client   │────▶│  FastAPI  │────▶│  Model    │             │
│  │           │◀────│  Server   │◀────│ (BERT)    │             │
│  └───────────┘     └───────────┘     └───────────┘             │
│                          │                                       │
│                    ┌─────┴─────┐                                │
│                    │ Prometheus│                                │
│                    │  Metrics  │                                │
│                    └───────────┘                                │
│                                                                  │
│  Deployed on: Google Cloud Run                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1: Project Structure

```bash
sentiment-api/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI application
│   ├── model.py          # Model loading and inference
│   ├── schemas.py        # Pydantic schemas
│   └── monitoring.py     # Metrics collection
├── tests/
│   └── test_api.py
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

### Step 2: Implementation

```python
# app/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional

class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    
class PredictResponse(BaseModel):
    text: str
    label: str
    confidence: float
    
class BatchPredictRequest(BaseModel):
    texts: List[str] = Field(..., max_items=50)
    
class BatchPredictResponse(BaseModel):
    predictions: List[PredictResponse]

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
```

```python
# app/model.py
from transformers import pipeline
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

class SentimentModel:
    def __init__(self):
        self.model = None
        self.model_name = "distilbert-base-uncased-finetuned-sst-2-english"
    
    def load(self):
        logger.info(f"Loading model: {self.model_name}")
        self.model = pipeline("sentiment-analysis", model=self.model_name)
        logger.info("Model loaded successfully")
    
    def predict(self, text: str) -> dict:
        if self.model is None:
            raise RuntimeError("Model not loaded")
        result = self.model(text)[0]
        return {
            "text": text,
            "label": result["label"],
            "confidence": round(result["score"], 4)
        }
    
    def predict_batch(self, texts: list) -> list:
        if self.model is None:
            raise RuntimeError("Model not loaded")
        results = self.model(texts)
        return [
            {
                "text": text,
                "label": result["label"],
                "confidence": round(result["score"], 4)
            }
            for text, result in zip(texts, results)
        ]

# Global model instance
model = SentimentModel()
```

```python
# app/monitoring.py
from prometheus_client import Counter, Histogram, Info
import time

# Metrics
REQUEST_COUNT = Counter(
    'sentiment_requests_total',
    'Total sentiment prediction requests',
    ['endpoint', 'status']
)

PREDICTION_LATENCY = Histogram(
    'sentiment_prediction_seconds',
    'Prediction latency in seconds',
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

PREDICTION_LABELS = Counter(
    'sentiment_predictions_total',
    'Prediction label counts',
    ['label']
)

MODEL_INFO = Info('sentiment_model', 'Model information')

def track_prediction(label: str, latency: float):
    PREDICTION_LATENCY.observe(latency)
    PREDICTION_LABELS.labels(label=label).inc()

def set_model_info(model_name: str, version: str):
    MODEL_INFO.info({
        'model_name': model_name,
        'version': version
    })
```

```python
# app/main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
import time
import logging

from .model import model
from .schemas import (
    PredictRequest, PredictResponse,
    BatchPredictRequest, BatchPredictResponse,
    HealthResponse
)
from .monitoring import (
    REQUEST_COUNT, track_prediction, set_model_info
)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting application...")
    model.load()
    set_model_info(model.model_name, "1.0.0")
    yield
    # Shutdown
    logger.info("Shutting down...")

# App
app = FastAPI(
    title="Sentiment Analysis API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    
    REQUEST_COUNT.labels(
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")
    return response

# Endpoints
@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        model_loaded=model.model is not None,
        version="1.0.0"
    )

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    start = time.time()
    try:
        result = model.predict(request.text)
        latency = time.time() - start
        track_prediction(result["label"], latency)
        return PredictResponse(**result)
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/batch", response_model=BatchPredictResponse)
def predict_batch(request: BatchPredictRequest):
    try:
        results = model.predict_batch(request.texts)
        return BatchPredictResponse(
            predictions=[PredictResponse(**r) for r in results]
        )
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

### Step 3: Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download model during build
RUN python -c "from transformers import pipeline; pipeline('sentiment-analysis', model='distilbert-base-uncased-finetuned-sst-2-english')"

# Copy application
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD curl -f http://localhost:8000/health || exit 1

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 4: Deploy to Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/sentiment-api

# Deploy
gcloud run deploy sentiment-api \
    --image gcr.io/PROJECT_ID/sentiment-api \
    --platform managed \
    --region us-central1 \
    --memory 2Gi \
    --timeout 60 \
    --allow-unauthenticated

# Get URL
gcloud run services describe sentiment-api --format='value(status.url)'
```

### Step 5: Test

```bash
# Health check
curl https://your-service-url/health

# Single prediction
curl -X POST https://your-service-url/predict \
    -H "Content-Type: application/json" \
    -d '{"text": "I love this product!"}'

# Batch prediction
curl -X POST https://your-service-url/predict/batch \
    -H "Content-Type: application/json" \
    -d '{"texts": ["Great!", "Terrible!", "Okay I guess"]}'
```

---

## 💬 Project 2: RAG Chatbot Service

### Goal
Build a document Q&A chatbot with RAG (Retrieval-Augmented Generation).

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RAG CHATBOT SERVICE                         │
│                                                                  │
│  ┌───────────┐     ┌───────────────────────────────────────┐   │
│  │           │     │            FastAPI Server              │   │
│  │  Client   │────▶│  ┌─────────┐  ┌──────┐  ┌─────────┐  │   │
│  │           │◀────│  │ /ingest │  │/chat │  │/search  │  │   │
│  └───────────┘     │  └────┬────┘  └──┬───┘  └────┬────┘  │   │
│                    └───────┼──────────┼───────────┼────────┘   │
│                            │          │           │             │
│                            ▼          ▼           ▼             │
│                    ┌───────────────────────────────────┐       │
│                    │           ChromaDB                │       │
│                    │        (Vector Store)             │       │
│                    └───────────────────────────────────┘       │
│                                    │                            │
│                                    ▼                            │
│                    ┌───────────────────────────────────┐       │
│                    │         OpenAI API                │       │
│                    │    (Embeddings + Chat)            │       │
│                    └───────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Project Structure

```bash
rag-chatbot/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── rag.py            # RAG logic
│   ├── schemas.py
│   └── config.py
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md
```

### Implementation

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str = ""
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    embedding_model: str = "text-embedding-3-small"
    chat_model: str = "gpt-4o-mini"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

```python
# app/rag.py
import chromadb
from openai import OpenAI
from typing import List, Optional
import hashlib

class RAGEngine:
    def __init__(self, settings):
        self.settings = settings
        self.openai = OpenAI(api_key=settings.openai_api_key)
        self.chroma = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port
        )
        self.collection = self.chroma.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )
    
    def _get_embedding(self, text: str) -> List[float]:
        response = self.openai.embeddings.create(
            model=self.settings.embedding_model,
            input=text
        )
        return response.data[0].embedding
    
    def _chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
        return chunks
    
    def ingest_document(self, text: str, metadata: dict = None) -> dict:
        chunks = self._chunk_text(text)
        
        ids = []
        embeddings = []
        documents = []
        metadatas = []
        
        for i, chunk in enumerate(chunks):
            chunk_id = hashlib.md5(f"{text[:50]}_{i}".encode()).hexdigest()
            embedding = self._get_embedding(chunk)
            
            ids.append(chunk_id)
            embeddings.append(embedding)
            documents.append(chunk)
            metadatas.append({**(metadata or {}), "chunk_index": i})
        
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        
        return {"chunks_ingested": len(chunks), "ids": ids}
    
    def search(self, query: str, top_k: int = 5) -> List[dict]:
        query_embedding = self._get_embedding(query)
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"]
        )
        
        return [
            {
                "text": doc,
                "metadata": meta,
                "score": 1 - dist  # Convert distance to similarity
            }
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            )
        ]
    
    def chat(self, query: str, top_k: int = 5) -> dict:
        # Retrieve relevant documents
        search_results = self.search(query, top_k)
        
        # Build context
        context = "\n\n".join([r["text"] for r in search_results])
        
        # Generate response
        messages = [
            {
                "role": "system",
                "content": """You are a helpful assistant that answers questions based on the provided context.
                If the context doesn't contain relevant information, say so.
                Always cite which parts of the context you used."""
            },
            {
                "role": "user",
                "content": f"""Context:
{context}

Question: {query}

Answer based on the context above:"""
            }
        ]
        
        response = self.openai.chat.completions.create(
            model=self.settings.chat_model,
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        return {
            "answer": response.choices[0].message.content,
            "sources": search_results[:3],
            "tokens_used": response.usage.total_tokens
        }
```

```python
# app/main.py
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import logging

from .config import settings
from .rag import RAGEngine
from .schemas import (
    IngestRequest, IngestResponse,
    ChatRequest, ChatResponse,
    SearchRequest, SearchResponse
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

rag_engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_engine
    logger.info("Initializing RAG engine...")
    rag_engine = RAGEngine(settings)
    logger.info("RAG engine ready!")
    yield

app = FastAPI(title="RAG Chatbot API", lifespan=lifespan)

@app.post("/ingest", response_model=IngestResponse)
def ingest_document(request: IngestRequest):
    try:
        result = rag_engine.ingest_document(
            request.text,
            request.metadata
        )
        return IngestResponse(**result)
    except Exception as e:
        logger.error(f"Ingest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest):
    results = rag_engine.search(request.query, request.top_k)
    return SearchResponse(results=results)

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        result = rag_engine.chat(request.query, request.top_k)
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "healthy"}
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CHROMA_HOST=chromadb
      - CHROMA_PORT=8000
    depends_on:
      - chromadb
  
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  chroma_data:
```

### Run and Test

```bash
# Start services
docker-compose up -d

# Ingest a document
curl -X POST http://localhost:8000/ingest \
    -H "Content-Type: application/json" \
    -d '{
        "text": "Python is a programming language. It was created by Guido van Rossum. Python is known for its simplicity and readability.",
        "metadata": {"source": "wikipedia"}
    }'

# Chat
curl -X POST http://localhost:8000/chat \
    -H "Content-Type: application/json" \
    -d '{"query": "Who created Python?"}'
```

---

## 🔄 Project 3: Full MLOps Pipeline

### Goal
Build a complete MLOps pipeline with training, versioning, deployment, and monitoring.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FULL MLOps PIPELINE                          │
│                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │  Data   │───▶│ Train   │───▶│ Registry│───▶│ Deploy  │      │
│  │  (DVC)  │    │ (MLflow)│    │ (MLflow)│    │(CloudRun)│     │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│       │              │              │              │            │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    GitHub Actions                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │  Test   │  │  Train  │  │Register │  │ Deploy  │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Monitoring                            │   │
│  │  Prometheus + Grafana + Drift Detection + Alerts        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Project Structure

```bash
mlops-pipeline/
├── data/
│   └── .gitkeep
├── src/
│   ├── train.py
│   ├── evaluate.py
│   └── preprocess.py
├── app/
│   ├── main.py
│   └── model.py
├── tests/
│   └── test_model.py
├── .github/
│   └── workflows/
│       └── mlops.yml
├── dvc.yaml
├── params.yaml
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

### Key Components

```yaml
# dvc.yaml - Pipeline definition
stages:
  preprocess:
    cmd: python src/preprocess.py
    deps:
      - src/preprocess.py
      - data/raw/
    outs:
      - data/processed/
  
  train:
    cmd: python src/train.py
    deps:
      - src/train.py
      - data/processed/
    params:
      - train
    outs:
      - models/model.pt
    metrics:
      - metrics.json:
          cache: false
```

```yaml
# .github/workflows/mlops.yml
name: MLOps Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest tests/

  train:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Pull data with DVC
        run: dvc pull
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      
      - name: Train model
        run: dvc repro
        env:
          MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_TRACKING_URI }}
      
      - name: Register model
        run: python src/register_model.py
        env:
          MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_TRACKING_URI }}

  deploy:
    needs: train
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Auth to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT }}/ml-api
          gcloud run deploy ml-api \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/ml-api \
            --region us-central1 \
            --allow-unauthenticated
```

---

## ✅ Project Checklist

### Project 1: Sentiment API
- [ ] FastAPI application with predict endpoint
- [ ] Pydantic schemas for validation
- [ ] Docker container built and tested
- [ ] Deployed to Cloud Run
- [ ] Prometheus metrics endpoint
- [ ] Health check endpoint
- [ ] README with usage examples

### Project 2: RAG Chatbot
- [ ] Document ingestion endpoint
- [ ] Vector search working
- [ ] Chat endpoint with context
- [ ] Docker Compose with ChromaDB
- [ ] Error handling
- [ ] Basic logging

### Project 3: MLOps Pipeline
- [ ] DVC for data versioning
- [ ] MLflow for experiment tracking
- [ ] Model registry configured
- [ ] GitHub Actions CI/CD
- [ ] Automated deployment
- [ ] Monitoring dashboard
- [ ] Alerting configured

---

## 🎓 What You've Built

```
CONGRATULATIONS! You now have:

1. PRODUCTION ML API
   └── Serving predictions at scale

2. RAG SYSTEM
   └── Document Q&A with LLMs

3. MLOps PIPELINE
   └── End-to-end automation

SKILLS DEMONSTRATED:
├── FastAPI development
├── Docker containerization
├── Cloud deployment
├── Experiment tracking
├── Model versioning
├── CI/CD for ML
├── Production monitoring
└── System design

YOU ARE NOW A PRODUCTION ML ENGINEER! 🚀
```

---

## 🔜 Next: Day 8

Tomorrow is interview preparation day!

**Continue to**: [08-Interview-QA.md](./08-Interview-QA.md)
