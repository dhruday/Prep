# 📋 Project Templates & Patterns

## Reusable Templates for AI/ML Projects

This file contains templates, checklists, and patterns you can copy-paste to accelerate your project development.

---

## 📁 Project Structure Templates

### Template 1: ML Classification Project

```
project-name/
├── README.md
├── requirements.txt
├── setup.py
├── .gitignore
├── .env.example
│
├── data/
│   ├── raw/                    # Original data
│   ├── processed/              # Cleaned data
│   ├── features/               # Feature engineered data
│   └── external/               # External data sources
│
├── notebooks/
│   ├── 01_eda.ipynb            # Exploratory analysis
│   ├── 02_preprocessing.ipynb   # Data cleaning
│   ├── 03_modeling.ipynb        # Model experiments
│   └── 04_evaluation.ipynb      # Final evaluation
│
├── src/
│   ├── __init__.py
│   ├── data/
│   │   ├── __init__.py
│   │   ├── load.py             # Data loading
│   │   ├── preprocess.py       # Preprocessing
│   │   └── features.py         # Feature engineering
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── train.py            # Training logic
│   │   ├── predict.py          # Inference
│   │   └── evaluate.py         # Metrics
│   │
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
│
├── models/
│   └── saved/                  # Saved model artifacts
│
├── tests/
│   ├── test_data.py
│   ├── test_model.py
│   └── conftest.py
│
├── configs/
│   ├── config.yaml             # Main config
│   └── hyperparams.yaml        # Hyperparameters
│
└── scripts/
    ├── train.py                # Training script
    ├── evaluate.py             # Evaluation script
    └── predict.py              # Batch prediction
```

### Template 2: LLM/RAG Project

```
llm-project/
├── README.md
├── requirements.txt
├── docker-compose.yml
├── Dockerfile
│
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py           # API endpoints
│   │   └── schemas.py          # Pydantic models
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Settings
│   │   └── security.py         # Auth
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm.py              # LLM integration
│   │   ├── rag.py              # RAG pipeline
│   │   ├── embeddings.py       # Embedding service
│   │   └── vector_store.py     # Vector DB
│   │
│   └── utils/
│       ├── __init__.py
│       ├── prompts.py          # Prompt templates
│       └── chunking.py         # Document chunking
│
├── data/
│   ├── documents/              # Source documents
│   └── chroma_db/              # Vector DB storage
│
├── tests/
│   ├── test_api.py
│   ├── test_rag.py
│   └── test_prompts.py
│
├── scripts/
│   ├── ingest.py               # Document ingestion
│   └── evaluate_rag.py         # RAG evaluation
│
└── configs/
    ├── prompts.yaml            # Prompt configs
    └── models.yaml             # Model configs
```

### Template 3: Computer Vision Project

```
cv-project/
├── README.md
├── requirements.txt
├── docker-compose.yml
│
├── data/
│   ├── raw/
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   ├── processed/
│   └── annotations/
│
├── src/
│   ├── __init__.py
│   ├── data/
│   │   ├── dataset.py          # PyTorch Dataset
│   │   ├── transforms.py       # Augmentations
│   │   └── dataloader.py       # DataLoader config
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── backbone.py         # Feature extractor
│   │   ├── detector.py         # Detection head
│   │   └── losses.py           # Custom losses
│   │
│   ├── training/
│   │   ├── trainer.py          # Training loop
│   │   ├── callbacks.py        # Training callbacks
│   │   └── schedulers.py       # LR schedulers
│   │
│   └── inference/
│       ├── predictor.py        # Single image
│       └── batch_predictor.py  # Batch processing
│
├── configs/
│   ├── train_config.yaml
│   └── model_config.yaml
│
├── scripts/
│   ├── train.py
│   ├── evaluate.py
│   └── export_onnx.py
│
└── deployment/
    ├── Dockerfile
    ├── triton/                 # Triton config
    └── kubernetes/             # K8s manifests
```

---

## 📝 README Template

```markdown
# Project Name

Brief description of what this project does.

## 🎯 Problem Statement

Describe the business problem this solves.

## 📊 Dataset

| Source | Size | Description |
|--------|------|-------------|
| [Dataset Name](link) | X samples | What's in it |

## 🏗️ Architecture

```
Input → Processing → Model → Output
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- CUDA 11.8+ (for GPU)

### Installation

```bash
git clone <repo>
cd project
pip install -r requirements.txt
```

### Usage

```python
from project import Model
model = Model.load("path/to/model")
result = model.predict(input_data)
```

## 📈 Results

| Model | Metric | Score |
|-------|--------|-------|
| Baseline | F1 | 0.75 |
| Final | F1 | 0.92 |

## 📁 Project Structure

```
project/
├── src/
├── data/
└── ...
```

## 🧪 Testing

```bash
pytest tests/
```

## 📄 License

MIT
```

---

## 🔧 Configuration Templates

### Hydra Config (config.yaml)

```yaml
# @package _global_

defaults:
  - _self_
  - model: default
  - data: default
  - training: default
  - override hydra/job_logging: custom

project:
  name: "my-ml-project"
  seed: 42
  device: "cuda"

paths:
  data_dir: ${hydra:runtime.cwd}/data
  output_dir: ${hydra:runtime.cwd}/outputs
  model_dir: ${hydra:runtime.cwd}/models

model:
  name: "resnet50"
  pretrained: true
  num_classes: 10

data:
  batch_size: 32
  num_workers: 4
  train_split: 0.8

training:
  epochs: 100
  learning_rate: 0.001
  optimizer: "adamw"
  scheduler: "cosine"
  early_stopping:
    patience: 10
    metric: "val_loss"
    mode: "min"

logging:
  wandb:
    project: ${project.name}
    entity: "your-entity"
    log_model: true
```

### Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=postgresql://user:pass@db:5432/app
    volumes:
      - ./data:/app/data
    depends_on:
      - db
      - redis
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  db:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  chromadb:
    image: chromadb/chroma
    ports:
      - "8001:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  postgres_data:
  chroma_data:
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: pytest tests/ --cov=src --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run linting
        uses: py-actions/flake8@v2
      
      - name: Run type checking
        run: |
          pip install mypy
          mypy src/

  deploy:
    needs: [test, lint]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          # Deployment commands
          echo "Deploying..."
```

---

## 📊 Code Patterns

### Pattern 1: Data Pipeline

```python
"""
Reusable data pipeline pattern
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, TypeVar, Iterator
import pandas as pd

T = TypeVar('T')
U = TypeVar('U')

@dataclass
class PipelineConfig:
    batch_size: int = 1000
    num_workers: int = 4
    cache_enabled: bool = True


class DataSource(ABC, Generic[T]):
    """Abstract data source"""
    
    @abstractmethod
    def read(self) -> Iterator[T]:
        pass
    
    @abstractmethod
    def count(self) -> int:
        pass


class Transform(ABC, Generic[T, U]):
    """Abstract transformation"""
    
    @abstractmethod
    def apply(self, data: T) -> U:
        pass


class DataSink(ABC, Generic[T]):
    """Abstract data sink"""
    
    @abstractmethod
    def write(self, data: T) -> None:
        pass


class Pipeline(Generic[T, U]):
    """Composable data pipeline"""
    
    def __init__(self, source: DataSource[T], config: PipelineConfig = None):
        self.source = source
        self.config = config or PipelineConfig()
        self.transforms: list[Transform] = []
        self.sink: DataSink = None
    
    def add_transform(self, transform: Transform) -> 'Pipeline':
        self.transforms.append(transform)
        return self
    
    def set_sink(self, sink: DataSink) -> 'Pipeline':
        self.sink = sink
        return self
    
    def run(self) -> None:
        """Execute the pipeline"""
        for batch in self._batch_iterator():
            # Apply transforms
            data = batch
            for transform in self.transforms:
                data = transform.apply(data)
            
            # Write to sink
            if self.sink:
                self.sink.write(data)
    
    def _batch_iterator(self) -> Iterator:
        batch = []
        for item in self.source.read():
            batch.append(item)
            if len(batch) >= self.config.batch_size:
                yield batch
                batch = []
        if batch:
            yield batch


# Usage
class CSVSource(DataSource[pd.DataFrame]):
    def __init__(self, path: str):
        self.path = path
    
    def read(self) -> Iterator[pd.DataFrame]:
        for chunk in pd.read_csv(self.path, chunksize=1000):
            yield chunk
    
    def count(self) -> int:
        return sum(1 for _ in pd.read_csv(self.path, chunksize=1000))


class CleanTransform(Transform[pd.DataFrame, pd.DataFrame]):
    def apply(self, data: pd.DataFrame) -> pd.DataFrame:
        return data.dropna().reset_index(drop=True)


class ParquetSink(DataSink[pd.DataFrame]):
    def __init__(self, path: str):
        self.path = path
        self.part_num = 0
    
    def write(self, data: pd.DataFrame) -> None:
        data.to_parquet(f"{self.path}/part_{self.part_num}.parquet")
        self.part_num += 1


# Run pipeline
pipeline = Pipeline(CSVSource("data.csv"))
pipeline.add_transform(CleanTransform())
pipeline.set_sink(ParquetSink("output/"))
pipeline.run()
```

### Pattern 2: Model Registry

```python
"""
Simple model registry pattern
"""
from typing import Dict, Type, Any
from abc import ABC, abstractmethod

class BaseModel(ABC):
    @abstractmethod
    def train(self, X, y) -> None:
        pass
    
    @abstractmethod
    def predict(self, X) -> Any:
        pass
    
    @abstractmethod
    def save(self, path: str) -> None:
        pass
    
    @classmethod
    @abstractmethod
    def load(cls, path: str) -> 'BaseModel':
        pass


class ModelRegistry:
    """Registry for model classes"""
    
    _registry: Dict[str, Type[BaseModel]] = {}
    
    @classmethod
    def register(cls, name: str):
        """Decorator to register a model"""
        def decorator(model_class: Type[BaseModel]):
            cls._registry[name] = model_class
            return model_class
        return decorator
    
    @classmethod
    def get(cls, name: str) -> Type[BaseModel]:
        """Get model class by name"""
        if name not in cls._registry:
            raise ValueError(f"Model '{name}' not found. Available: {list(cls._registry.keys())}")
        return cls._registry[name]
    
    @classmethod
    def create(cls, name: str, **kwargs) -> BaseModel:
        """Create model instance"""
        model_class = cls.get(name)
        return model_class(**kwargs)
    
    @classmethod
    def list_models(cls) -> list:
        """List all registered models"""
        return list(cls._registry.keys())


# Usage
@ModelRegistry.register("random_forest")
class RandomForestModel(BaseModel):
    def __init__(self, n_estimators=100):
        from sklearn.ensemble import RandomForestClassifier
        self.model = RandomForestClassifier(n_estimators=n_estimators)
    
    def train(self, X, y):
        self.model.fit(X, y)
    
    def predict(self, X):
        return self.model.predict(X)
    
    def save(self, path):
        import joblib
        joblib.dump(self.model, path)
    
    @classmethod
    def load(cls, path):
        import joblib
        instance = cls()
        instance.model = joblib.load(path)
        return instance


@ModelRegistry.register("xgboost")
class XGBoostModel(BaseModel):
    def __init__(self, **params):
        import xgboost as xgb
        self.params = params
        self.model = None
    
    def train(self, X, y):
        import xgboost as xgb
        dtrain = xgb.DMatrix(X, label=y)
        self.model = xgb.train(self.params, dtrain)
    
    def predict(self, X):
        import xgboost as xgb
        dtest = xgb.DMatrix(X)
        return self.model.predict(dtest)
    
    def save(self, path):
        self.model.save_model(path)
    
    @classmethod
    def load(cls, path):
        import xgboost as xgb
        instance = cls()
        instance.model = xgb.Booster()
        instance.model.load_model(path)
        return instance


# Create model by name
model = ModelRegistry.create("xgboost", max_depth=5, learning_rate=0.1)
model.train(X_train, y_train)
```

### Pattern 3: Experiment Tracking

```python
"""
Experiment tracking wrapper
"""
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from datetime import datetime
import json
import hashlib

@dataclass
class ExperimentConfig:
    model_name: str
    model_params: Dict[str, Any]
    data_params: Dict[str, Any]
    training_params: Dict[str, Any]
    
    def to_dict(self) -> Dict:
        return {
            'model_name': self.model_name,
            'model_params': self.model_params,
            'data_params': self.data_params,
            'training_params': self.training_params
        }
    
    def hash(self) -> str:
        """Generate unique hash for this config"""
        config_str = json.dumps(self.to_dict(), sort_keys=True)
        return hashlib.md5(config_str.encode()).hexdigest()[:8]


@dataclass
class ExperimentResult:
    config: ExperimentConfig
    metrics: Dict[str, float]
    artifacts: Dict[str, str] = field(default_factory=dict)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    
    @property
    def duration_seconds(self) -> float:
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return 0


class ExperimentTracker:
    """Track ML experiments"""
    
    def __init__(self, project_name: str, backend: str = "local"):
        self.project_name = project_name
        self.backend = backend
        self.current_run: Optional[ExperimentResult] = None
        
        # Initialize backend
        if backend == "wandb":
            import wandb
            wandb.init(project=project_name)
        elif backend == "mlflow":
            import mlflow
            mlflow.set_experiment(project_name)
    
    def start_run(self, config: ExperimentConfig) -> str:
        """Start a new experiment run"""
        self.current_run = ExperimentResult(config=config, metrics={})
        run_id = f"{config.model_name}_{config.hash()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if self.backend == "wandb":
            import wandb
            wandb.config.update(config.to_dict())
        elif self.backend == "mlflow":
            import mlflow
            mlflow.start_run(run_name=run_id)
            mlflow.log_params(self._flatten_dict(config.to_dict()))
        
        return run_id
    
    def log_metric(self, name: str, value: float, step: Optional[int] = None):
        """Log a metric"""
        if self.current_run:
            self.current_run.metrics[name] = value
        
        if self.backend == "wandb":
            import wandb
            wandb.log({name: value}, step=step)
        elif self.backend == "mlflow":
            import mlflow
            mlflow.log_metric(name, value, step=step)
    
    def log_artifact(self, name: str, path: str):
        """Log an artifact (model, plot, etc.)"""
        if self.current_run:
            self.current_run.artifacts[name] = path
        
        if self.backend == "wandb":
            import wandb
            wandb.save(path)
        elif self.backend == "mlflow":
            import mlflow
            mlflow.log_artifact(path)
    
    def end_run(self) -> ExperimentResult:
        """End the current run"""
        if self.current_run:
            self.current_run.end_time = datetime.now()
        
        if self.backend == "wandb":
            import wandb
            wandb.finish()
        elif self.backend == "mlflow":
            import mlflow
            mlflow.end_run()
        
        return self.current_run
    
    def _flatten_dict(self, d: Dict, parent_key: str = '') -> Dict:
        """Flatten nested dict for logging"""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key).items())
            else:
                items.append((new_key, v))
        return dict(items)


# Usage
config = ExperimentConfig(
    model_name="xgboost",
    model_params={"max_depth": 5, "learning_rate": 0.1},
    data_params={"train_size": 0.8, "augmentation": True},
    training_params={"epochs": 100, "batch_size": 32}
)

tracker = ExperimentTracker("my-project", backend="wandb")
run_id = tracker.start_run(config)

# Training loop
for epoch in range(100):
    loss = train_epoch()
    val_acc = evaluate()
    
    tracker.log_metric("train_loss", loss, step=epoch)
    tracker.log_metric("val_accuracy", val_acc, step=epoch)

tracker.log_artifact("model", "models/best_model.pt")
result = tracker.end_run()
```

### Pattern 4: API Service Pattern

```python
"""
FastAPI service pattern for ML
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import asyncio
from datetime import datetime
import uuid

app = FastAPI(
    title="ML Service",
    description="Production ML API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Models
# ============================================

class PredictionRequest(BaseModel):
    data: List[float] = Field(..., description="Input features")
    model_version: Optional[str] = "latest"

class PredictionResponse(BaseModel):
    prediction: float
    confidence: float
    model_version: str
    latency_ms: float
    request_id: str

class BatchPredictionRequest(BaseModel):
    data: List[List[float]]
    callback_url: Optional[str] = None

class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    created_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[dict] = None


# ============================================
# Dependencies
# ============================================

class ModelManager:
    """Manage model loading and versioning"""
    
    def __init__(self):
        self.models = {}
        self.current_version = "v1.0"
    
    def load_model(self, version: str):
        if version not in self.models:
            # Load model from storage
            self.models[version] = self._load_from_storage(version)
        return self.models[version]
    
    def _load_from_storage(self, version):
        # Implement actual loading
        pass
    
    def predict(self, data, version="latest"):
        if version == "latest":
            version = self.current_version
        model = self.load_model(version)
        return model.predict([data])[0]


model_manager = ModelManager()

def get_model_manager():
    return model_manager


# ============================================
# Background Jobs
# ============================================

jobs = {}

async def process_batch_job(job_id: str, data: List[List[float]], callback_url: str = None):
    """Background batch processing"""
    jobs[job_id]["status"] = "processing"
    
    try:
        results = []
        for item in data:
            result = model_manager.predict(item)
            results.append(result)
            await asyncio.sleep(0.01)  # Prevent blocking
        
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["completed_at"] = datetime.now()
        jobs[job_id]["result"] = {"predictions": results}
        
        # Optional callback
        if callback_url:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.post(callback_url, json=jobs[job_id])
    
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["result"] = {"error": str(e)}


# ============================================
# Endpoints
# ============================================

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/predict", response_model=PredictionResponse)
async def predict(
    request: PredictionRequest,
    manager: ModelManager = Depends(get_model_manager)
):
    import time
    start = time.time()
    request_id = str(uuid.uuid4())
    
    try:
        prediction = manager.predict(request.data, request.model_version)
        latency = (time.time() - start) * 1000
        
        return PredictionResponse(
            prediction=prediction,
            confidence=0.95,  # Implement actual confidence
            model_version=request.model_version,
            latency_ms=latency,
            request_id=request_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch")
async def predict_batch(
    request: BatchPredictionRequest,
    background_tasks: BackgroundTasks
):
    job_id = str(uuid.uuid4())
    
    jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "created_at": datetime.now(),
        "completed_at": None,
        "result": None
    }
    
    background_tasks.add_task(
        process_batch_job,
        job_id,
        request.data,
        request.callback_url
    )
    
    return {"job_id": job_id, "status": "pending"}


@app.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@app.get("/models")
async def list_models(manager: ModelManager = Depends(get_model_manager)):
    return {
        "current_version": manager.current_version,
        "available_versions": list(manager.models.keys())
    }


# Run with: uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 📋 Checklists

### Pre-Project Checklist

- [ ] Problem clearly defined
- [ ] Success metrics identified
- [ ] Dataset available and understood
- [ ] Baseline approach planned
- [ ] Git repository initialized
- [ ] Environment set up
- [ ] README drafted

### Data Checklist

- [ ] Data loaded successfully
- [ ] EDA completed
- [ ] Missing values handled
- [ ] Outliers identified
- [ ] Feature types correct
- [ ] Train/val/test split done
- [ ] No data leakage

### Model Checklist

- [ ] Baseline model trained
- [ ] Multiple models compared
- [ ] Hyperparameters tuned
- [ ] Cross-validation done
- [ ] Feature importance analyzed
- [ ] Model saved properly

### Evaluation Checklist

- [ ] Right metrics chosen
- [ ] Test set evaluated
- [ ] Error analysis done
- [ ] Bias/fairness checked
- [ ] Performance documented

### Deployment Checklist

- [ ] API developed
- [ ] Tests written
- [ ] Docker image built
- [ ] Load testing done
- [ ] Monitoring set up
- [ ] Documentation complete

---

## 🔗 Quick Reference Links

### Datasets
- [Kaggle Datasets](https://www.kaggle.com/datasets)
- [Hugging Face Datasets](https://huggingface.co/datasets)
- [UCI ML Repository](https://archive.ics.uci.edu/ml/index.php)
- [Google Dataset Search](https://datasetsearch.research.google.com/)

### Tools
- [Scikit-learn](https://scikit-learn.org/)
- [PyTorch](https://pytorch.org/)
- [Hugging Face](https://huggingface.co/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [MLflow](https://mlflow.org/)
- [Weights & Biases](https://wandb.ai/)

### Cloud
- [AWS SageMaker](https://aws.amazon.com/sagemaker/)
- [Google Vertex AI](https://cloud.google.com/vertex-ai)
- [Azure ML](https://azure.microsoft.com/en-us/services/machine-learning/)

---

**Use these templates to accelerate your project development!** 🚀
