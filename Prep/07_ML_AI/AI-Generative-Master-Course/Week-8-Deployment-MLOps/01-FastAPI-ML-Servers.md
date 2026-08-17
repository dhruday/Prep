# 🚀 Day 1: FastAPI for ML Servers

## 📚 Table of Contents
1. [Why FastAPI for ML?](#-why-fastapi-for-ml)
2. [FastAPI Fundamentals](#-fastapi-fundamentals)
3. [Building ML Endpoints](#-building-ml-endpoints)
4. [Request/Response Models](#-requestresponse-models)
5. [Async for ML](#-async-for-ml)
6. [Model Loading Best Practices](#-model-loading-best-practices)
7. [Error Handling](#-error-handling)
8. [Testing Your API](#-testing-your-api)
9. [Production Considerations](#-production-considerations)
10. [Exercises](#-exercises)

---

## 🎯 Why FastAPI for ML?

### FastAPI vs Alternatives

```
┌─────────────────────────────────────────────────────────────────┐
│                    ML API FRAMEWORK COMPARISON                   │
├─────────────┬────────────┬────────────┬────────────┬────────────┤
│   Feature   │  FastAPI   │   Flask    │  Django    │  Gradio   │
├─────────────┼────────────┼────────────┼────────────┼────────────┤
│ Speed       │ ⭐⭐⭐⭐⭐  │ ⭐⭐⭐      │ ⭐⭐       │ ⭐⭐⭐     │
│ Async       │ ✅ Native  │ ❌ Add-on  │ ⚠️ Limited │ ❌        │
│ Auto Docs   │ ✅ Swagger │ ❌ Manual  │ ⚠️ Add-on  │ ✅        │
│ Typing      │ ✅ Native  │ ❌         │ ❌         │ ❌        │
│ ML Use      │ ⭐⭐⭐⭐⭐  │ ⭐⭐⭐⭐    │ ⭐⭐       │ ⭐⭐⭐⭐   │
│ Learning    │ Easy       │ Easy       │ Hard       │ Very Easy │
│ Production  │ ⭐⭐⭐⭐⭐  │ ⭐⭐⭐⭐    │ ⭐⭐⭐⭐⭐  │ ⭐⭐       │
└─────────────┴────────────┴────────────┴────────────┴────────────┘

WHEN TO USE WHAT:
├── FastAPI: Production ML APIs (recommended)
├── Flask: Simple prototypes, legacy systems
├── Django: Full web apps with ML features
└── Gradio: Quick demos, internal tools
```

### FastAPI Key Advantages for ML

1. **Async Support**: Handle multiple requests while model loads/infers
2. **Auto Documentation**: Swagger UI generated automatically
3. **Type Validation**: Pydantic validates request/response data
4. **Performance**: One of the fastest Python frameworks
5. **Easy to Learn**: If you know Python, you know FastAPI

---

## 🏗️ FastAPI Fundamentals

### Installation

```bash
pip install fastapi uvicorn[standard] python-multipart
```

### Hello World

```python
# app.py
from fastapi import FastAPI

app = FastAPI(
    title="My ML API",
    description="API for serving ML models",
    version="1.0.0"
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the ML API!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

### Running the Server

```bash
# Development (with auto-reload)
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4
```

### Automatic Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🤖 Building ML Endpoints

### Basic Prediction Endpoint

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="Sentiment Analysis API")

# Load model at startup (not per request!)
print("Loading model...")
classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
print("Model loaded!")

class TextRequest(BaseModel):
    text: str
    
class PredictionResponse(BaseModel):
    label: str
    confidence: float
    
@app.post("/predict", response_model=PredictionResponse)
def predict_sentiment(request: TextRequest):
    """Predict sentiment of input text."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = classifier(request.text)[0]
    
    return PredictionResponse(
        label=result["label"],
        confidence=round(result["score"], 4)
    )
```

### Batch Prediction Endpoint

```python
from typing import List

class BatchTextRequest(BaseModel):
    texts: List[str]
    
class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    
@app.post("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch(request: BatchTextRequest):
    """Predict sentiment for multiple texts."""
    if not request.texts:
        raise HTTPException(status_code=400, detail="Texts list cannot be empty")
    
    if len(request.texts) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 texts per request")
    
    results = classifier(request.texts)
    
    predictions = [
        PredictionResponse(
            label=r["label"],
            confidence=round(r["score"], 4)
        )
        for r in results
    ]
    
    return BatchPredictionResponse(predictions=predictions)
```

### Embedding Endpoint

```python
from sentence_transformers import SentenceTransformer
import numpy as np

# Load embedding model at startup
embed_model = SentenceTransformer('all-MiniLM-L6-v2')

class EmbeddingRequest(BaseModel):
    texts: List[str]
    
class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int
    
@app.post("/embed", response_model=EmbeddingResponse)
def create_embeddings(request: EmbeddingRequest):
    """Generate embeddings for input texts."""
    if not request.texts:
        raise HTTPException(status_code=400, detail="Texts list cannot be empty")
    
    embeddings = embed_model.encode(request.texts)
    
    return EmbeddingResponse(
        embeddings=embeddings.tolist(),
        dimensions=embeddings.shape[1]
    )
```

### Chat/Generation Endpoint

```python
import openai
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    system_prompt: Optional[str] = "You are a helpful assistant."
    max_tokens: Optional[int] = 500
    temperature: Optional[float] = 0.7
    
class ChatResponse(BaseModel):
    response: str
    tokens_used: int
    
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Chat with an LLM."""
    try:
        completion = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.message}
            ],
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        return ChatResponse(
            response=completion.choices[0].message.content,
            tokens_used=completion.usage.total_tokens
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 📝 Request/Response Models

### Pydantic for Validation

```python
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
from enum import Enum

class ModelType(str, Enum):
    SENTIMENT = "sentiment"
    NER = "ner"
    CLASSIFICATION = "classification"

class InferenceRequest(BaseModel):
    """Request model with validation."""
    
    text: str = Field(
        ...,  # Required
        min_length=1,
        max_length=10000,
        description="Input text for inference"
    )
    
    model_type: ModelType = Field(
        default=ModelType.SENTIMENT,
        description="Type of model to use"
    )
    
    return_probabilities: bool = Field(
        default=False,
        description="Whether to return class probabilities"
    )
    
    @validator('text')
    def text_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Text cannot be empty or whitespace only')
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "text": "I love this product!",
                "model_type": "sentiment",
                "return_probabilities": True
            }
        }

class InferenceResponse(BaseModel):
    """Response model with metadata."""
    
    prediction: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    probabilities: Optional[dict] = None
    model_version: str
    inference_time_ms: float
    
    class Config:
        schema_extra = {
            "example": {
                "prediction": "POSITIVE",
                "confidence": 0.9876,
                "probabilities": {"POSITIVE": 0.9876, "NEGATIVE": 0.0124},
                "model_version": "1.0.0",
                "inference_time_ms": 45.2
            }
        }
```

### File Upload for ML

```python
from fastapi import File, UploadFile
import io
from PIL import Image

@app.post("/predict/image")
async def predict_image(file: UploadFile = File(...)):
    """Classify an uploaded image."""
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, 
            detail="File must be an image"
        )
    
    # Read and process image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    
    # Run inference (example with image classifier)
    # result = image_classifier(image)
    
    return {
        "filename": file.filename,
        "size": len(contents),
        "prediction": "cat",  # Example
        "confidence": 0.95
    }
```

---

## ⚡ Async for ML

### When to Use Async

```python
# CPU-bound ML inference: Use sync (default)
@app.post("/predict")
def predict(request: TextRequest):
    # Model inference is CPU-bound
    result = classifier(request.text)
    return result

# I/O-bound operations: Use async
@app.post("/predict-with-logging")
async def predict_async(request: TextRequest):
    # API calls, database, file I/O
    result = classifier(request.text)  # Still sync
    
    # Async database save
    await save_to_database(request, result)
    
    return result

# External API calls: Always async
@app.post("/chat")
async def chat_async(request: ChatRequest):
    # Async OpenAI call
    response = await openai.chat.completions.acreate(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": request.message}]
    )
    return {"response": response.choices[0].message.content}
```

### Background Tasks

```python
from fastapi import BackgroundTasks

def log_prediction(request_id: str, prediction: dict):
    """Background task for logging."""
    # This runs after response is sent
    print(f"Logging prediction {request_id}: {prediction}")
    # Save to database, send to analytics, etc.

@app.post("/predict")
def predict_with_logging(
    request: TextRequest,
    background_tasks: BackgroundTasks
):
    result = classifier(request.text)
    
    # Add background task (doesn't block response)
    background_tasks.add_task(
        log_prediction, 
        request_id="123",
        prediction=result
    )
    
    return result
```

---

## 🏋️ Model Loading Best Practices

### Singleton Pattern for Models

```python
from functools import lru_cache
from contextlib import asynccontextmanager

# Method 1: Global variable (simple)
classifier = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown."""
    global classifier
    print("Loading models...")
    classifier = pipeline("sentiment-analysis")
    print("Models loaded!")
    
    yield  # App runs here
    
    # Cleanup
    print("Shutting down...")
    del classifier

app = FastAPI(lifespan=lifespan)


# Method 2: Dependency injection (cleaner)
class ModelManager:
    def __init__(self):
        self.classifier = None
        self.embedder = None
    
    def load_models(self):
        print("Loading classifier...")
        self.classifier = pipeline("sentiment-analysis")
        print("Loading embedder...")
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        print("All models loaded!")
    
    def predict(self, text: str):
        return self.classifier(text)
    
    def embed(self, texts: list):
        return self.embedder.encode(texts)

model_manager = ModelManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    model_manager.load_models()
    yield

app = FastAPI(lifespan=lifespan)

@app.post("/predict")
def predict(request: TextRequest):
    return model_manager.predict(request.text)
```

### Lazy Loading

```python
class LazyModelLoader:
    """Load models only when first needed."""
    
    def __init__(self):
        self._classifier = None
        self._embedder = None
    
    @property
    def classifier(self):
        if self._classifier is None:
            print("Loading classifier on first use...")
            self._classifier = pipeline("sentiment-analysis")
        return self._classifier
    
    @property
    def embedder(self):
        if self._embedder is None:
            print("Loading embedder on first use...")
            self._embedder = SentenceTransformer('all-MiniLM-L6-v2')
        return self._embedder

models = LazyModelLoader()

@app.post("/predict")
def predict(request: TextRequest):
    # Model loaded on first request
    return models.classifier(request.text)
```

### GPU Memory Management

```python
import torch
import gc

class GPUModelManager:
    def __init__(self, device: str = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
    
    def load_model(self, model_name: str):
        # Clear GPU memory first
        if self.model is not None:
            del self.model
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        # Load new model
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,
            device_map="auto"
        )
    
    def generate(self, prompt: str, max_tokens: int = 100):
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        outputs = self.model.generate(**inputs, max_new_tokens=max_tokens)
        return self.tokenizer.decode(outputs[0])
```

---

## ⚠️ Error Handling

### Comprehensive Error Handling

```python
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import logging
import traceback

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom exceptions
class ModelNotLoadedError(Exception):
    pass

class InferenceError(Exception):
    pass

# Exception handlers
@app.exception_handler(ModelNotLoadedError)
async def model_not_loaded_handler(request: Request, exc: ModelNotLoadedError):
    logger.error(f"Model not loaded: {exc}")
    return JSONResponse(
        status_code=503,
        content={"error": "Model not ready", "detail": str(exc)}
    )

@app.exception_handler(InferenceError)
async def inference_error_handler(request: Request, exc: InferenceError):
    logger.error(f"Inference error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Inference failed", "detail": str(exc)}
    )

# Catch-all handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": "An unexpected error occurred"}
    )

# Using in endpoints
@app.post("/predict")
def predict(request: TextRequest):
    if classifier is None:
        raise ModelNotLoadedError("Classifier model is not loaded")
    
    try:
        result = classifier(request.text)
        return result
    except Exception as e:
        raise InferenceError(f"Failed to process text: {str(e)}")
```

### Input Validation Errors

```python
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "details": errors
        }
    )
```

---

## 🧪 Testing Your API

### Using pytest

```python
# test_app.py
from fastapi.testclient import TestClient
from app import app
import pytest

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_predict_positive():
    response = client.post(
        "/predict",
        json={"text": "I love this product!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "label" in data
    assert "confidence" in data
    assert data["label"] == "POSITIVE"

def test_predict_empty_text():
    response = client.post(
        "/predict",
        json={"text": ""}
    )
    assert response.status_code == 400

def test_predict_batch():
    response = client.post(
        "/predict/batch",
        json={"texts": ["I love this!", "I hate this!"]}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["predictions"]) == 2

# Run with: pytest test_app.py -v
```

### Manual Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Single prediction
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"text": "This is amazing!"}'

# Batch prediction
curl -X POST "http://localhost:8000/predict/batch" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["I love it!", "I hate it!", "It is okay."]}'

# File upload
curl -X POST "http://localhost:8000/predict/image" \
  -F "file=@image.jpg"
```

### Using httpx for async tests

```python
import pytest
import httpx
from app import app

@pytest.mark.asyncio
async def test_async_predict():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/predict",
            json={"text": "Test text"}
        )
        assert response.status_code == 200
```

---

## 🏭 Production Considerations

### Environment Configuration

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "ML API"
    debug: bool = False
    model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"
    max_batch_size: int = 100
    api_key: str = ""  # For authentication
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

# Usage
settings = get_settings()
```

### API Key Authentication

```python
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key

@app.post("/predict")
def predict(
    request: TextRequest,
    api_key: str = Security(verify_api_key)  # Protected!
):
    return classifier(request.text)
```

### Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/predict")
@limiter.limit("10/minute")  # 10 requests per minute per IP
def predict(request: Request, text_request: TextRequest):
    return classifier(text_request.text)
```

### Logging

```python
import logging
import time
from fastapi import Request

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code} - {process_time:.3f}s")
    
    return response
```

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📋 Complete Example: Production ML API

```python
# complete_app.py
from fastapi import FastAPI, HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from contextlib import asynccontextmanager
from typing import List, Optional
import logging
import time
from transformers import pipeline

# Configuration
class Settings(BaseSettings):
    model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"
    api_key: str = "your-secret-key"
    debug: bool = False
    
    class Config:
        env_file = ".env"

settings = Settings()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models storage
class ModelManager:
    classifier = None
    
model_manager = ModelManager()

# Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading models...")
    model_manager.classifier = pipeline("sentiment-analysis", model=settings.model_name)
    logger.info("Models loaded!")
    yield
    logger.info("Shutting down...")

# App
app = FastAPI(
    title="Production ML API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")
    return response

# Schemas
class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)

class PredictionResponse(BaseModel):
    label: str
    confidence: float
    model: str

# Endpoints
@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model_manager.classifier is not None}

@app.post("/predict", response_model=PredictionResponse)
def predict(request: TextRequest, api_key: str = Security(verify_api_key)):
    if model_manager.classifier is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    result = model_manager.classifier(request.text)[0]
    
    return PredictionResponse(
        label=result["label"],
        confidence=round(result["score"], 4),
        model=settings.model_name
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## ✏️ Exercises

### Exercise 1: Basic ML API
Build a FastAPI server with:
- `/health` endpoint
- `/predict` endpoint for text classification
- Proper error handling
- Request/response validation

### Exercise 2: Multi-Model API
Create an API serving multiple models:
- Sentiment analysis
- Named Entity Recognition
- Text embeddings
- Use a single endpoint with model selection

### Exercise 3: Image Classification API
Build an image classification API:
- Accept image uploads
- Validate file types
- Return top-k predictions with confidence scores

### Exercise 4: RAG API
Create a RAG-powered Q&A API:
- `/index` endpoint to add documents
- `/query` endpoint to ask questions
- Use ChromaDB for vector storage

---

## ✅ Day 1 Checklist

By the end of today, you should:
- [ ] Understand why FastAPI is ideal for ML APIs
- [ ] Create basic prediction endpoints
- [ ] Use Pydantic for request/response validation
- [ ] Load models properly at startup
- [ ] Handle errors gracefully
- [ ] Test your API with curl and pytest
- [ ] Know production considerations (auth, logging, CORS)

---

## 🔜 Next: Day 2

Tomorrow we'll containerize our FastAPI ML server with Docker!

**Continue to**: [02-Docker-for-ML.md](./02-Docker-for-ML.md)
