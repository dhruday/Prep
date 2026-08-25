# 📦 Day 4: Model Versioning

## 📚 Table of Contents
1. [Why Version Models?](#-why-version-models)
2. [DVC (Data Version Control)](#-dvc-data-version-control)
3. [Model Registry](#-model-registry)
4. [Hugging Face Hub](#-hugging-face-hub)
5. [MLflow Model Registry](#-mlflow-model-registry)
6. [Best Practices](#-best-practices)
7. [Exercises](#-exercises)

---

## 🎯 Why Version Models?

### The Problem

```
WITHOUT MODEL VERSIONING:

Monday:     Train model v1 → 85% accuracy → Deploy ✓
Tuesday:    Train model v2 → 82% accuracy → Deploy ✓  
Wednesday:  Users complain → "Which model was better?"
Thursday:   Need to rollback → "Where is v1?"
Friday:     Chaos → 😱

WITH MODEL VERSIONING:

Monday:     Train model → Tag v1.0.0 → 85% accuracy → Deploy ✓
Tuesday:    Train model → Tag v1.1.0 → 82% accuracy → Deploy ✓
Wednesday:  Compare v1.0.0 vs v1.1.0 → v1.0.0 better
Thursday:   Rollback to v1.0.0 → 2 minutes
Friday:     Everything works → 🎉
```

### What to Version

```
VERSIONING CHECKLIST:

1. MODEL ARTIFACTS
   ├── Model weights (.pt, .h5, .pkl)
   ├── Tokenizers
   ├── Config files
   └── Preprocessing objects

2. TRAINING DATA
   ├── Raw data references
   ├── Processed datasets
   ├── Train/val/test splits
   └── Data transformations

3. CODE
   ├── Training scripts
   ├── Model architecture
   ├── Preprocessing code
   └── Inference code

4. METADATA
   ├── Hyperparameters
   ├── Metrics
   ├── Environment info
   └── Training timestamps
```

---

## 📊 DVC (Data Version Control)

### What is DVC?

```
DVC = Git for Data and Models

┌─────────────────────────────────────────────────────────────────┐
│                         YOUR PROJECT                             │
│                                                                  │
│  ┌─────────────────┐          ┌─────────────────┐               │
│  │      Git        │          │      DVC        │               │
│  │                 │          │                 │               │
│  │  - Code         │          │  - Data         │               │
│  │  - Config       │          │  - Models       │               │
│  │  - .dvc files   │          │  - Large files  │               │
│  └────────┬────────┘          └────────┬────────┘               │
│           │                            │                        │
│           ▼                            ▼                        │
│       GitHub                       S3/GCS/Azure                 │
│       GitLab                       Local storage                │
└─────────────────────────────────────────────────────────────────┘
```

### Installation and Setup

```bash
# Install DVC
pip install dvc
pip install dvc-s3    # For S3 storage
pip install dvc-gdrive  # For Google Drive
pip install dvc-gs     # For GCS

# Initialize in your project
cd your-ml-project
git init
dvc init

# Configure remote storage
dvc remote add -d myremote s3://my-bucket/dvc-store
# Or for local testing:
dvc remote add -d myremote /path/to/local/storage
```

### Tracking Models with DVC

```bash
# Project structure
my-project/
├── data/
│   ├── train.csv          # Large dataset
│   └── test.csv
├── models/
│   └── model.pt           # Trained model
├── src/
│   └── train.py
└── requirements.txt

# Track large files with DVC
dvc add data/train.csv
dvc add data/test.csv
dvc add models/model.pt

# This creates .dvc files (small, tracked by git)
# data/train.csv.dvc
# models/model.pt.dvc

# Add .dvc files to git
git add data/.gitignore data/train.csv.dvc
git add models/.gitignore models/model.pt.dvc
git commit -m "Track data and models with DVC"

# Push data to remote storage
dvc push
```

### Version Control Workflow

```bash
# Version 1.0: Initial model
dvc add models/model.pt
git add models/model.pt.dvc
git commit -m "Model v1.0 - baseline"
git tag v1.0
dvc push

# Train new model...
python train.py  # Creates new models/model.pt

# Version 1.1: Improved model
dvc add models/model.pt
git add models/model.pt.dvc
git commit -m "Model v1.1 - improved hyperparameters"
git tag v1.1
dvc push

# Rollback to v1.0
git checkout v1.0
dvc checkout  # Restores model.pt from v1.0!

# Compare versions
git diff v1.0..v1.1 -- models/model.pt.dvc
```

### DVC Pipeline

```yaml
# dvc.yaml - Define reproducible pipeline
stages:
  prepare:
    cmd: python src/prepare.py
    deps:
      - src/prepare.py
      - data/raw/
    outs:
      - data/processed/
  
  train:
    cmd: python src/train.py
    deps:
      - src/train.py
      - data/processed/
    params:
      - train.epochs
      - train.learning_rate
    outs:
      - models/model.pt
    metrics:
      - metrics.json:
          cache: false
  
  evaluate:
    cmd: python src/evaluate.py
    deps:
      - src/evaluate.py
      - models/model.pt
      - data/test/
    metrics:
      - results/metrics.json:
          cache: false
```

```yaml
# params.yaml - Hyperparameters
train:
  epochs: 10
  learning_rate: 0.001
  batch_size: 32
```

```bash
# Run the pipeline
dvc repro

# Only run changed stages
dvc repro

# Visualize pipeline
dvc dag
```

### DVC Experiments

```bash
# Run experiment with different params
dvc exp run -S train.learning_rate=0.01

# Run multiple experiments
dvc exp run -S train.learning_rate=0.001
dvc exp run -S train.learning_rate=0.005
dvc exp run -S train.learning_rate=0.01

# Show all experiments
dvc exp show

# Compare experiments
dvc exp diff exp-abc123 exp-def456

# Apply best experiment
dvc exp apply exp-abc123
git commit -m "Apply best experiment"
```

---

## 🗃️ Model Registry

### Concept

```
MODEL REGISTRY = Central Hub for Models

┌─────────────────────────────────────────────────────────────────┐
│                       MODEL REGISTRY                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  sentiment-classifier                                    │    │
│  │  ├── Version 1 (Staging)    - 85% accuracy              │    │
│  │  ├── Version 2 (Production) - 88% accuracy              │    │
│  │  └── Version 3 (Archived)   - 82% accuracy              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  text-embedder                                           │    │
│  │  ├── Version 1 (Production) - all-MiniLM-L6-v2          │    │
│  │  └── Version 2 (Staging)    - bge-small-en              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  STAGES: Development → Staging → Production → Archived          │
└─────────────────────────────────────────────────────────────────┘
```

### Simple File-Based Registry

```python
# model_registry.py
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional
import hashlib

class SimpleModelRegistry:
    def __init__(self, registry_path: str = "./model_registry"):
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.registry_path / "registry.json"
        self._load_metadata()
    
    def _load_metadata(self):
        if self.metadata_file.exists():
            with open(self.metadata_file) as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {"models": {}}
    
    def _save_metadata(self):
        with open(self.metadata_file, "w") as f:
            json.dump(self.metadata, f, indent=2)
    
    def register_model(
        self,
        model_name: str,
        model_path: str,
        metrics: dict,
        stage: str = "development",
        description: str = ""
    ) -> str:
        """Register a new model version."""
        
        # Create model directory
        model_dir = self.registry_path / model_name
        model_dir.mkdir(exist_ok=True)
        
        # Determine version
        if model_name not in self.metadata["models"]:
            self.metadata["models"][model_name] = {"versions": []}
        
        version = len(self.metadata["models"][model_name]["versions"]) + 1
        
        # Copy model file
        version_dir = model_dir / f"v{version}"
        version_dir.mkdir(exist_ok=True)
        shutil.copy(model_path, version_dir / "model.pt")
        
        # Calculate checksum
        with open(model_path, "rb") as f:
            checksum = hashlib.md5(f.read()).hexdigest()
        
        # Save version info
        version_info = {
            "version": version,
            "stage": stage,
            "metrics": metrics,
            "description": description,
            "created_at": datetime.now().isoformat(),
            "checksum": checksum,
            "path": str(version_dir / "model.pt")
        }
        
        self.metadata["models"][model_name]["versions"].append(version_info)
        self._save_metadata()
        
        print(f"Registered {model_name} v{version} ({stage})")
        return f"v{version}"
    
    def get_model(
        self, 
        model_name: str, 
        version: Optional[int] = None,
        stage: Optional[str] = None
    ) -> str:
        """Get model path by version or stage."""
        
        if model_name not in self.metadata["models"]:
            raise ValueError(f"Model {model_name} not found")
        
        versions = self.metadata["models"][model_name]["versions"]
        
        if stage:
            # Get latest version in stage
            stage_versions = [v for v in versions if v["stage"] == stage]
            if not stage_versions:
                raise ValueError(f"No {stage} version for {model_name}")
            return stage_versions[-1]["path"]
        
        if version:
            # Get specific version
            for v in versions:
                if v["version"] == version:
                    return v["path"]
            raise ValueError(f"Version {version} not found for {model_name}")
        
        # Return latest
        return versions[-1]["path"]
    
    def transition_stage(
        self, 
        model_name: str, 
        version: int, 
        new_stage: str
    ):
        """Transition model to new stage."""
        versions = self.metadata["models"][model_name]["versions"]
        
        for v in versions:
            if v["version"] == version:
                old_stage = v["stage"]
                v["stage"] = new_stage
                self._save_metadata()
                print(f"{model_name} v{version}: {old_stage} → {new_stage}")
                return
        
        raise ValueError(f"Version {version} not found")
    
    def list_models(self):
        """List all registered models."""
        for model_name, data in self.metadata["models"].items():
            print(f"\n{model_name}:")
            for v in data["versions"]:
                print(f"  v{v['version']} ({v['stage']}): {v['metrics']}")


# Usage example
registry = SimpleModelRegistry()

# Register models
registry.register_model(
    model_name="sentiment-classifier",
    model_path="./models/model_v1.pt",
    metrics={"accuracy": 0.85, "f1": 0.84},
    stage="development",
    description="Baseline BERT model"
)

# Promote to staging
registry.transition_stage("sentiment-classifier", 1, "staging")

# Promote to production
registry.transition_stage("sentiment-classifier", 1, "production")

# Get production model
prod_model_path = registry.get_model("sentiment-classifier", stage="production")
```

---

## 🤗 Hugging Face Hub

### Pushing Models to Hub

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from huggingface_hub import login

# Login to Hugging Face
login(token="hf_xxx")

# Load your trained model
model = AutoModelForSequenceClassification.from_pretrained("./my_trained_model")
tokenizer = AutoTokenizer.from_pretrained("./my_trained_model")

# Push to Hub
model.push_to_hub("my-username/sentiment-classifier-v1")
tokenizer.push_to_hub("my-username/sentiment-classifier-v1")

# With model card
model.push_to_hub(
    "my-username/sentiment-classifier-v1",
    commit_message="Initial model release",
    private=True  # Make private
)
```

### Model Card

```markdown
# README.md (Model Card)

---
language: en
license: mit
tags:
  - sentiment-analysis
  - bert
datasets:
  - imdb
metrics:
  - accuracy
  - f1
model-index:
  - name: sentiment-classifier-v1
    results:
      - task:
          type: text-classification
          name: Sentiment Analysis
        dataset:
          name: IMDB
          type: imdb
        metrics:
          - type: accuracy
            value: 0.88
          - type: f1
            value: 0.87
---

# Sentiment Classifier v1

## Model Description
BERT-based sentiment classifier trained on IMDB dataset.

## Training Data
- Dataset: IMDB Movie Reviews
- Size: 50,000 reviews
- Split: 80/10/10 train/val/test

## Training Procedure
- Base model: bert-base-uncased
- Epochs: 3
- Learning rate: 2e-5
- Batch size: 16

## Evaluation
| Metric | Value |
|--------|-------|
| Accuracy | 0.88 |
| F1 | 0.87 |

## Usage

```python
from transformers import pipeline
classifier = pipeline("sentiment-analysis", model="my-username/sentiment-classifier-v1")
result = classifier("I love this movie!")
```

## Limitations
- English only
- May not work well on very short texts
```

### Versioning on Hub

```python
from huggingface_hub import HfApi

api = HfApi()

# Create different branches for versions
api.create_branch("my-username/sentiment-classifier", branch="v1.0")
api.create_branch("my-username/sentiment-classifier", branch="v1.1")

# Push to specific branch
model.push_to_hub(
    "my-username/sentiment-classifier",
    branch="v1.1"
)

# Load specific version
from transformers import AutoModel
model = AutoModel.from_pretrained(
    "my-username/sentiment-classifier",
    revision="v1.0"
)
```

---

## 📈 MLflow Model Registry

### Setup

```bash
pip install mlflow

# Start MLflow server
mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlartifacts
```

### Registering Models

```python
import mlflow
from mlflow.tracking import MlflowClient

# Set tracking URI
mlflow.set_tracking_uri("http://localhost:5000")

# Log and register model
with mlflow.start_run():
    # Log parameters
    mlflow.log_params({
        "learning_rate": 0.001,
        "epochs": 10,
        "batch_size": 32
    })
    
    # Log metrics
    mlflow.log_metrics({
        "accuracy": 0.88,
        "f1_score": 0.87
    })
    
    # Log model
    mlflow.pytorch.log_model(
        model,
        "model",
        registered_model_name="sentiment-classifier"
    )

# The model is now in the registry!
```

### Managing Versions

```python
from mlflow.tracking import MlflowClient

client = MlflowClient()

# List all versions
versions = client.search_model_versions("name='sentiment-classifier'")
for v in versions:
    print(f"Version {v.version}: {v.current_stage}")

# Transition to staging
client.transition_model_version_stage(
    name="sentiment-classifier",
    version=1,
    stage="Staging"
)

# Transition to production
client.transition_model_version_stage(
    name="sentiment-classifier",
    version=1,
    stage="Production"
)

# Add description
client.update_model_version(
    name="sentiment-classifier",
    version=1,
    description="Baseline BERT model for sentiment classification"
)
```

### Loading from Registry

```python
import mlflow

# Load specific version
model = mlflow.pytorch.load_model("models:/sentiment-classifier/1")

# Load by stage
model = mlflow.pytorch.load_model("models:/sentiment-classifier/Production")
model = mlflow.pytorch.load_model("models:/sentiment-classifier/Staging")

# Use in inference
predictions = model.predict(test_data)
```

### MLflow + FastAPI Integration

```python
# app.py
from fastapi import FastAPI
import mlflow
import os

app = FastAPI()

# Load production model at startup
mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000"))
model = None

@app.on_event("startup")
def load_model():
    global model
    model = mlflow.pytorch.load_model("models:/sentiment-classifier/Production")

@app.post("/predict")
def predict(text: str):
    # Use model for inference
    result = model.predict(text)
    return {"prediction": result}

@app.post("/reload")
def reload_model():
    """Hot reload production model."""
    global model
    model = mlflow.pytorch.load_model("models:/sentiment-classifier/Production")
    return {"status": "Model reloaded"}
```

---

## 📋 Best Practices

### Versioning Strategy

```
SEMANTIC VERSIONING FOR MODELS:

MAJOR.MINOR.PATCH

MAJOR: Breaking changes
├── Different input/output format
├── Different model architecture
└── Incompatible preprocessing

MINOR: New features
├── Improved accuracy
├── New capabilities
└── Backward compatible

PATCH: Bug fixes
├── Training bug fixes
├── Same architecture
└── Minor improvements

Examples:
├── v1.0.0 → v2.0.0: Changed from BERT to LLaMA
├── v1.0.0 → v1.1.0: Improved accuracy by 5%
├── v1.0.0 → v1.0.1: Fixed preprocessing bug
```

### What to Store

```python
# Complete model artifact structure
model_artifact/
├── model.pt                 # Model weights
├── config.json              # Model configuration
├── tokenizer/               # Tokenizer files
│   ├── vocab.txt
│   └── tokenizer_config.json
├── preprocessing/           # Preprocessing artifacts
│   ├── scaler.pkl
│   └── label_encoder.pkl
├── metadata.json            # Training metadata
└── requirements.txt         # Dependencies

# metadata.json
{
    "model_name": "sentiment-classifier",
    "version": "1.2.0",
    "created_at": "2024-01-15T10:30:00Z",
    "framework": "pytorch",
    "framework_version": "2.1.0",
    "python_version": "3.11",
    "training": {
        "dataset": "imdb",
        "samples": 50000,
        "epochs": 3,
        "learning_rate": 2e-5,
        "batch_size": 16
    },
    "metrics": {
        "accuracy": 0.88,
        "f1_score": 0.87,
        "precision": 0.86,
        "recall": 0.88
    },
    "hardware": {
        "gpu": "NVIDIA A100",
        "training_time_hours": 2.5
    }
}
```

### Model Lineage

```
MODEL LINEAGE = Track where models came from

┌──────────────────────────────────────────────────────────────┐
│                     MODEL LINEAGE                            │
│                                                              │
│  Data: imdb_v2.csv (hash: abc123)                           │
│         │                                                    │
│         ▼                                                    │
│  Preprocessing: clean_text.py (commit: def456)              │
│         │                                                    │
│         ▼                                                    │
│  Training: train.py (commit: ghi789)                        │
│         │   params: lr=2e-5, epochs=3                       │
│         │                                                    │
│         ▼                                                    │
│  Model: sentiment-classifier-v1.2.0                         │
│         │   metrics: acc=0.88, f1=0.87                      │
│         │                                                    │
│         ▼                                                    │
│  Deployed: production (2024-01-15)                          │
└──────────────────────────────────────────────────────────────┘
```

---

## ✏️ Exercises

### Exercise 1: DVC Setup
1. Initialize DVC in a project
2. Track a dataset and model
3. Create 3 versions
4. Practice checkout between versions

### Exercise 2: Model Registry
1. Implement the SimpleModelRegistry class
2. Register multiple model versions
3. Implement stage transitions
4. Add model comparison feature

### Exercise 3: MLflow Integration
1. Set up MLflow server
2. Log training runs with parameters and metrics
3. Register models in MLflow registry
4. Create a FastAPI app that loads from registry

### Exercise 4: Hugging Face Hub
1. Create a Hugging Face account
2. Train a simple classifier
3. Push to Hub with model card
4. Load and use the model

---

## ✅ Day 4 Checklist

By the end of today, you should:
- [ ] Understand why model versioning is critical
- [ ] Use DVC to version data and models
- [ ] Implement or use a model registry
- [ ] Push models to Hugging Face Hub
- [ ] Use MLflow for experiment tracking and model registry
- [ ] Know model versioning best practices

---

## 🔜 Next: Day 5

Tomorrow we'll dive deeper into experiment tracking!

**Continue to**: [05-Experiment-Tracking.md](./05-Experiment-Tracking.md)
