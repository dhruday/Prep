# 📊 Day 5: Experiment Tracking

## 📚 Table of Contents
1. [Why Track Experiments?](#-why-track-experiments)
2. [MLflow Deep Dive](#-mlflow-deep-dive)
3. [Weights & Biases (W&B)](#-weights--biases-wb)
4. [Comparing Tools](#-comparing-tools)
5. [Best Practices](#-best-practices)
6. [Integration Patterns](#-integration-patterns)
7. [Exercises](#-exercises)

---

## 🎯 Why Track Experiments?

### The Problem

```
WITHOUT EXPERIMENT TRACKING:

Week 1: "I think learning rate 0.001 worked best..."
Week 2: "Wait, was it 0.001 or 0.0001?"
Week 3: "I can't remember which data version I used"
Week 4: "My notebook got corrupted, everything is lost"

COMMON DISASTERS:
├── Forgot hyperparameters that worked
├── Can't reproduce best results  
├── Lost track of what you tried
├── No comparison between runs
├── Colleagues can't see your work
└── Manager asks "how did you improve by 5%?" 🤷
```

### What to Track

```
EXPERIMENT TRACKING CHECKLIST:

1. HYPERPARAMETERS
   ├── Learning rate, batch size, epochs
   ├── Model architecture choices
   ├── Optimizer settings
   └── Regularization (dropout, weight decay)

2. METRICS (over time)
   ├── Training loss
   ├── Validation loss
   ├── Accuracy, F1, precision, recall
   └── Custom business metrics

3. ARTIFACTS
   ├── Model checkpoints
   ├── Config files
   ├── Sample predictions
   └── Confusion matrices, plots

4. ENVIRONMENT
   ├── Python version
   ├── Package versions
   ├── Hardware (GPU, RAM)
   └── Random seeds

5. DATA
   ├── Dataset version/hash
   ├── Train/val/test split
   ├── Preprocessing steps
   └── Data augmentation
```

---

## 📈 MLflow Deep Dive

### Setup

```bash
# Install MLflow
pip install mlflow

# Start tracking server
mlflow server \
    --backend-store-uri sqlite:///mlflow.db \
    --default-artifact-root ./mlartifacts \
    --host 0.0.0.0 \
    --port 5000

# Or use file-based tracking (simplest)
# MLflow will create ./mlruns directory
```

### Basic Tracking

```python
import mlflow

# Set tracking URI (optional - defaults to ./mlruns)
mlflow.set_tracking_uri("http://localhost:5000")

# Set experiment
mlflow.set_experiment("sentiment-analysis")

# Start a run
with mlflow.start_run(run_name="bert-baseline"):
    # Log parameters
    mlflow.log_params({
        "model_name": "bert-base-uncased",
        "learning_rate": 2e-5,
        "batch_size": 16,
        "epochs": 3,
        "max_length": 128
    })
    
    # Training loop
    for epoch in range(3):
        train_loss = train_one_epoch(model, train_loader)
        val_loss, val_acc = evaluate(model, val_loader)
        
        # Log metrics (with step)
        mlflow.log_metrics({
            "train_loss": train_loss,
            "val_loss": val_loss,
            "val_accuracy": val_acc
        }, step=epoch)
    
    # Log final metrics
    mlflow.log_metrics({
        "final_accuracy": 0.88,
        "final_f1": 0.87
    })
    
    # Log artifacts
    mlflow.log_artifact("confusion_matrix.png")
    mlflow.log_artifact("config.yaml")
    
    # Log model
    mlflow.pytorch.log_model(model, "model")
    
    # Add tags
    mlflow.set_tags({
        "team": "nlp",
        "priority": "high"
    })
```

### PyTorch Integration

```python
import mlflow.pytorch
from torch.utils.data import DataLoader
import torch

mlflow.set_experiment("pytorch-training")

def train_with_mlflow():
    with mlflow.start_run():
        # Log hyperparameters
        config = {
            "lr": 0.001,
            "epochs": 10,
            "batch_size": 32,
            "hidden_size": 256
        }
        mlflow.log_params(config)
        
        # Create model
        model = MyModel(config["hidden_size"])
        optimizer = torch.optim.Adam(model.parameters(), lr=config["lr"])
        
        # Training loop
        for epoch in range(config["epochs"]):
            model.train()
            train_loss = 0
            for batch in train_loader:
                loss = train_step(model, batch, optimizer)
                train_loss += loss.item()
            
            # Validation
            model.eval()
            val_loss, val_acc = validate(model, val_loader)
            
            # Log metrics
            mlflow.log_metrics({
                "train_loss": train_loss / len(train_loader),
                "val_loss": val_loss,
                "val_accuracy": val_acc
            }, step=epoch)
            
            # Log checkpoint every 5 epochs
            if (epoch + 1) % 5 == 0:
                torch.save(model.state_dict(), f"checkpoint_epoch_{epoch}.pt")
                mlflow.log_artifact(f"checkpoint_epoch_{epoch}.pt")
        
        # Log final model
        mlflow.pytorch.log_model(model, "model")
        
        # Log additional artifacts
        save_confusion_matrix(model, val_loader, "confusion_matrix.png")
        mlflow.log_artifact("confusion_matrix.png")

train_with_mlflow()
```

### Hugging Face Transformers Integration

```python
import mlflow
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    TrainingArguments,
    Trainer
)
from datasets import load_dataset

mlflow.set_experiment("transformers-finetuning")

def train_transformer():
    with mlflow.start_run():
        # Load model and tokenizer
        model_name = "bert-base-uncased"
        model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # Log model info
        mlflow.log_params({
            "model_name": model_name,
            "num_parameters": model.num_parameters()
        })
        
        # Load and tokenize dataset
        dataset = load_dataset("imdb")
        
        def tokenize(examples):
            return tokenizer(examples["text"], truncation=True, padding=True, max_length=512)
        
        tokenized = dataset.map(tokenize, batched=True)
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir="./results",
            num_train_epochs=3,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=64,
            learning_rate=2e-5,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
        )
        
        # Log training args
        mlflow.log_params({
            "epochs": training_args.num_train_epochs,
            "batch_size": training_args.per_device_train_batch_size,
            "learning_rate": training_args.learning_rate,
        })
        
        # Custom callback for MLflow logging
        class MLflowCallback(TrainerCallback):
            def on_log(self, args, state, control, logs=None, **kwargs):
                if logs:
                    mlflow.log_metrics(logs, step=state.global_step)
        
        # Train
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized["train"],
            eval_dataset=tokenized["test"],
            callbacks=[MLflowCallback()]
        )
        
        trainer.train()
        
        # Log final model
        mlflow.transformers.log_model(
            transformers_model={"model": model, "tokenizer": tokenizer},
            artifact_path="model"
        )

train_transformer()
```

### Querying Experiments

```python
import mlflow
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Get experiment
experiment = client.get_experiment_by_name("sentiment-analysis")

# Search runs
runs = mlflow.search_runs(
    experiment_ids=[experiment.experiment_id],
    filter_string="metrics.val_accuracy > 0.85",
    order_by=["metrics.val_accuracy DESC"],
    max_results=10
)

print(runs[["run_id", "params.learning_rate", "metrics.val_accuracy"]])

# Get best run
best_run = runs.iloc[0]
print(f"Best run: {best_run.run_id}")
print(f"Accuracy: {best_run['metrics.val_accuracy']}")

# Load model from best run
best_model = mlflow.pytorch.load_model(f"runs:/{best_run.run_id}/model")
```

---

## 🎨 Weights & Biases (W&B)

### Setup

```bash
pip install wandb

# Login (get API key from wandb.ai)
wandb login
```

### Basic Usage

```python
import wandb

# Initialize run
wandb.init(
    project="sentiment-analysis",
    name="bert-baseline",
    config={
        "model_name": "bert-base-uncased",
        "learning_rate": 2e-5,
        "batch_size": 16,
        "epochs": 3
    }
)

# Access config
config = wandb.config

# Training loop
for epoch in range(config.epochs):
    train_loss = train_one_epoch(model, train_loader)
    val_loss, val_acc = evaluate(model, val_loader)
    
    # Log metrics
    wandb.log({
        "epoch": epoch,
        "train_loss": train_loss,
        "val_loss": val_loss,
        "val_accuracy": val_acc
    })

# Log final metrics
wandb.summary["final_accuracy"] = 0.88
wandb.summary["final_f1"] = 0.87

# Finish run
wandb.finish()
```

### Advanced Features

```python
import wandb
import numpy as np
from sklearn.metrics import confusion_matrix
import matplotlib.pyplot as plt

wandb.init(project="ml-demo")

# 1. Log images
images = get_sample_images()
wandb.log({
    "examples": [wandb.Image(img, caption=f"Sample {i}") for i, img in enumerate(images)]
})

# 2. Log confusion matrix
y_true = [0, 1, 0, 1, 1, 0]
y_pred = [0, 1, 1, 1, 1, 0]
cm = confusion_matrix(y_true, y_pred)

wandb.log({
    "confusion_matrix": wandb.plot.confusion_matrix(
        y_true=y_true,
        preds=y_pred,
        class_names=["Negative", "Positive"]
    )
})

# 3. Log plots
fig, ax = plt.subplots()
ax.plot([1, 2, 3], [1, 4, 9])
wandb.log({"custom_plot": wandb.Image(fig)})
plt.close()

# 4. Log tables
table = wandb.Table(
    columns=["text", "true_label", "pred_label", "confidence"],
    data=[
        ["I love this!", "positive", "positive", 0.95],
        ["This is bad", "negative", "negative", 0.87],
    ]
)
wandb.log({"predictions": table})

# 5. Log histograms
wandb.log({"gradients": wandb.Histogram(np.random.randn(1000))})

# 6. Log model
wandb.save("model.pt")

wandb.finish()
```

### Sweeps (Hyperparameter Tuning)

```python
import wandb

# Define sweep config
sweep_config = {
    "method": "bayes",  # or "grid", "random"
    "metric": {
        "name": "val_accuracy",
        "goal": "maximize"
    },
    "parameters": {
        "learning_rate": {
            "min": 1e-5,
            "max": 1e-3,
            "distribution": "log_uniform_values"
        },
        "batch_size": {
            "values": [16, 32, 64]
        },
        "epochs": {
            "values": [3, 5, 10]
        },
        "dropout": {
            "min": 0.1,
            "max": 0.5
        }
    }
}

# Create sweep
sweep_id = wandb.sweep(sweep_config, project="sentiment-sweep")

def train():
    # Initialize run (config comes from sweep)
    wandb.init()
    config = wandb.config
    
    # Train with config
    model = create_model(
        learning_rate=config.learning_rate,
        dropout=config.dropout
    )
    
    for epoch in range(config.epochs):
        train_loss = train_epoch(model, config.batch_size)
        val_acc = evaluate(model)
        
        wandb.log({
            "train_loss": train_loss,
            "val_accuracy": val_acc
        })
    
    wandb.finish()

# Run sweep
wandb.agent(sweep_id, function=train, count=20)  # Run 20 trials
```

### W&B + PyTorch Lightning

```python
import pytorch_lightning as pl
from pytorch_lightning.loggers import WandbLogger

# Create W&B logger
wandb_logger = WandbLogger(
    project="lightning-demo",
    name="experiment-1",
    log_model=True
)

# Create trainer with logger
trainer = pl.Trainer(
    max_epochs=10,
    logger=wandb_logger,
    callbacks=[
        pl.callbacks.ModelCheckpoint(monitor="val_loss"),
        pl.callbacks.EarlyStopping(monitor="val_loss", patience=3)
    ]
)

# Train
trainer.fit(model, train_dataloader, val_dataloader)
```

### W&B Artifacts

```python
import wandb

wandb.init(project="artifact-demo")

# Create and log artifact
artifact = wandb.Artifact(
    name="sentiment-model",
    type="model",
    description="Fine-tuned BERT for sentiment",
    metadata={
        "accuracy": 0.88,
        "framework": "pytorch"
    }
)

# Add files
artifact.add_file("model.pt")
artifact.add_dir("tokenizer/")

# Log artifact
wandb.log_artifact(artifact)

# Use artifact in another run
run = wandb.init(project="artifact-demo")
artifact = run.use_artifact("sentiment-model:latest")
artifact_dir = artifact.download()

wandb.finish()
```

---

## ⚖️ Comparing Tools

### MLflow vs W&B

```
┌────────────────────┬─────────────────┬─────────────────┐
│     Feature        │     MLflow      │     W&B         │
├────────────────────┼─────────────────┼─────────────────┤
│ Hosting            │ Self-hosted     │ Cloud (free tier)│
│ Setup              │ Medium          │ Easy            │
│ UI                 │ Basic           │ Beautiful       │
│ Collaboration      │ Basic           │ Excellent       │
│ Cost               │ Free (self-host)│ Free tier, paid │
│ Sweeps/HP Tuning   │ Basic           │ Built-in        │
│ Model Registry     │ Built-in        │ Via Artifacts   │
│ Privacy            │ Full control    │ Cloud (or self) │
│ Enterprise         │ Databricks      │ W&B Teams       │
│ Learning Curve     │ Medium          │ Easy            │
└────────────────────┴─────────────────┴─────────────────┘

RECOMMENDATIONS:
├── Self-hosted/privacy needed → MLflow
├── Best UI/collaboration → W&B
├── Databricks ecosystem → MLflow
├── Quick start → W&B
└── Budget constrained → MLflow (self-host)
```

### Other Tools

```
TOOL COMPARISON:

TensorBoard
├── Best for: PyTorch/TensorFlow training visualization
├── Pro: Built-in, no setup
├── Con: Limited to single machine

Neptune.ai
├── Best for: Teams, enterprise
├── Pro: Great collaboration
├── Con: Paid

Comet ML
├── Best for: Similar to W&B
├── Pro: Good features
├── Con: Less popular

ClearML
├── Best for: End-to-end MLOps
├── Pro: Open source, many features
├── Con: Complex
```

---

## 💡 Best Practices

### 1. Consistent Naming

```python
# Bad: Random names
wandb.init(name="run1")
wandb.init(name="test")
wandb.init(name="final_final")

# Good: Systematic naming
wandb.init(name=f"bert-lr{lr}-bs{batch_size}-{timestamp}")
wandb.init(name="bert-baseline-v1")
wandb.init(name="bert-augmented-v1")
```

### 2. Log Everything Relevant

```python
# Comprehensive logging template
def setup_run(config: dict):
    wandb.init(
        project="my-project",
        config=config
    )
    
    # System info
    wandb.config.update({
        "python_version": sys.version,
        "torch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "random_seed": config.get("seed", 42)
    })
    
    # Data info
    wandb.config.update({
        "train_samples": len(train_dataset),
        "val_samples": len(val_dataset),
        "num_classes": num_classes
    })
```

### 3. Use Config Files

```yaml
# config.yaml
model:
  name: bert-base-uncased
  num_labels: 2

training:
  learning_rate: 2e-5
  batch_size: 16
  epochs: 3
  warmup_steps: 100

data:
  max_length: 512
  train_split: 0.8

wandb:
  project: sentiment-analysis
  entity: my-team
```

```python
import yaml
import wandb

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

# Initialize with config
wandb.init(
    project=config["wandb"]["project"],
    entity=config["wandb"]["entity"],
    config=config
)
```

### 4. Compare Experiments

```python
# MLflow comparison
import mlflow

runs = mlflow.search_runs(
    filter_string="metrics.val_accuracy > 0.85",
    order_by=["metrics.val_accuracy DESC"]
)

# Compare top runs
comparison = runs[["params.learning_rate", "params.batch_size", "metrics.val_accuracy"]].head(10)
print(comparison)

# W&B comparison
# Use the UI: wandb.ai → Project → Runs → Compare
```

### 5. Reproducibility

```python
import random
import numpy as np
import torch

def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

# Log seed
wandb.config.seed = 42
set_seed(wandb.config.seed)
```

---

## 🔗 Integration Patterns

### Pattern 1: Callback-Based

```python
# Training callback that logs to both MLflow and W&B
class ExperimentCallback:
    def __init__(self, use_mlflow=True, use_wandb=True):
        self.use_mlflow = use_mlflow
        self.use_wandb = use_wandb
    
    def on_train_start(self, config):
        if self.use_mlflow:
            mlflow.start_run()
            mlflow.log_params(config)
        if self.use_wandb:
            wandb.init(config=config)
    
    def on_epoch_end(self, epoch, metrics):
        if self.use_mlflow:
            mlflow.log_metrics(metrics, step=epoch)
        if self.use_wandb:
            wandb.log(metrics)
    
    def on_train_end(self, model):
        if self.use_mlflow:
            mlflow.pytorch.log_model(model, "model")
            mlflow.end_run()
        if self.use_wandb:
            wandb.save("model.pt")
            wandb.finish()
```

### Pattern 2: Context Manager

```python
from contextlib import contextmanager

@contextmanager
def experiment_tracker(name: str, config: dict, backend: str = "wandb"):
    if backend == "wandb":
        wandb.init(name=name, config=config)
        try:
            yield wandb
        finally:
            wandb.finish()
    elif backend == "mlflow":
        with mlflow.start_run(run_name=name):
            mlflow.log_params(config)
            yield mlflow

# Usage
with experiment_tracker("my-run", config, backend="wandb") as tracker:
    for epoch in range(epochs):
        loss = train_epoch()
        if hasattr(tracker, 'log'):  # wandb
            tracker.log({"loss": loss})
        else:  # mlflow
            tracker.log_metric("loss", loss, step=epoch)
```

---

## ✏️ Exercises

### Exercise 1: MLflow Basics
1. Set up MLflow tracking server
2. Log a training run with parameters, metrics, artifacts
3. Compare 3 runs with different hyperparameters
4. Query runs programmatically

### Exercise 2: W&B Sweeps
1. Set up a W&B account
2. Create a sweep configuration
3. Run 10 hyperparameter trials
4. Analyze results and find best config

### Exercise 3: Unified Logging
1. Create a logging wrapper that works with both MLflow and W&B
2. Support: params, metrics, artifacts
3. Test with a simple training script

### Exercise 4: Production Pipeline
1. Train model with experiment tracking
2. Register best model in MLflow registry
3. Create deployment that loads from registry
4. Log inference metrics to W&B

---

## ✅ Day 5 Checklist

By the end of today, you should:
- [ ] Understand why experiment tracking is essential
- [ ] Use MLflow for tracking and model registry
- [ ] Use W&B for tracking and visualization
- [ ] Compare experiments and find best configurations
- [ ] Implement hyperparameter sweeps
- [ ] Follow best practices for reproducibility

---

## 🔜 Next: Day 6

Tomorrow we'll learn about monitoring models in production!

**Continue to**: [06-Monitoring-Production.md](./06-Monitoring-Production.md)
