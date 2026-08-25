# 🎯 Fine-Tuning Fundamentals

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
3. [Types of Fine-Tuning](#-types-of-fine-tuning)
4. [Mathematical Foundations](#-mathematical-foundations)
5. [Code Implementation](#-code-implementation)
6. [Real World Use Cases](#-real-world-use-cases)
7. [Mini Project](#-mini-project)
8. [Common Mistakes](#-common-mistakes)
9. [Interview Questions](#-interview-questions)
10. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is Fine-Tuning? (The Restaurant Chef Analogy)

**Imagine you hire a world-famous chef (pretrained model):**

```
Pre-trained Chef (GPT-3, BERT, LLaMA):
├── Knows ALL cooking techniques
├── Trained in thousands of cuisines
├── Can make almost anything
└── But doesn't know YOUR restaurant's style
```

**Fine-tuning = Teaching the chef YOUR recipes:**

```
Fine-Tuning Process:
├── Chef already knows: HOW to cook
├── You teach: YOUR specific dishes
├── Result: Expert in YOUR cuisine
└── Time: Days, not years!
```

### Why Not Train From Scratch?

```
Training from Scratch:
├── Cost: $1,000,000+ (GPT-3 level)
├── Data: Trillions of tokens
├── Time: Months on 1000s of GPUs
├── Expertise: PhD-level team
└── 99% of companies: IMPOSSIBLE

Fine-Tuning:
├── Cost: $100-$1,000
├── Data: 100-100,000 examples
├── Time: Hours on single GPU
├── Expertise: This course!
└── 99% of companies: PERFECT
```

### Real World Analogy

```
Pre-training = Getting a Medical Degree (7+ years)
Fine-tuning = Specializing in Cardiology (1-2 years)

The specialist doesn't re-learn biology!
They BUILD on existing knowledge.
```

---

## 🎯 Deep Technical Breakdown

### The Transfer Learning Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    Transfer Learning Pipeline                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 1: Pre-training (Someone else did this)              │
│  ┌─────────────────────────────────────────────┐            │
│  │  Internet Text (TB of data)                  │            │
│  │  ↓                                           │            │
│  │  Train on: "Predict next token"             │            │
│  │  ↓                                           │            │
│  │  Learn: Grammar, Facts, Reasoning           │            │
│  │  ↓                                           │            │
│  │  Result: BASE MODEL (GPT, BERT, LLaMA)      │            │
│  └─────────────────────────────────────────────┘            │
│                         ↓                                    │
│  PHASE 2: Fine-tuning (YOU do this)                         │
│  ┌─────────────────────────────────────────────┐            │
│  │  Your Data (1K-100K examples)               │            │
│  │  ↓                                           │            │
│  │  Continue training on YOUR task             │            │
│  │  ↓                                           │            │
│  │  Adjust weights for YOUR domain             │            │
│  │  ↓                                           │            │
│  │  Result: SPECIALIZED MODEL                  │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### What Happens During Fine-Tuning?

```
Model Weights Before Fine-Tuning:
┌──────────────────────────────────────┐
│ Layer 1: [0.23, -0.45, 0.67, ...]   │ ← General language
│ Layer 2: [0.12, 0.89, -0.34, ...]   │ ← General patterns
│ Layer 3: [-0.56, 0.21, 0.43, ...]   │ ← General knowledge
│ ...                                  │
│ Layer N: [0.78, -0.12, 0.90, ...]   │ ← General output
└──────────────────────────────────────┘

Fine-Tuning with Medical Data:
┌──────────────────────────────────────┐
│ Layer 1: [0.23, -0.45, 0.67, ...]   │ ← Unchanged (basic patterns)
│ Layer 2: [0.14, 0.87, -0.32, ...]   │ ← Slight adjustment
│ Layer 3: [-0.48, 0.35, 0.51, ...]   │ ← Domain adaptation
│ ...                                  │
│ Layer N: [0.65, 0.22, 0.85, ...]   │ ← Task-specific output
└──────────────────────────────────────┘

Key Insight: Small changes, BIG impact!
```

### The Catastrophic Forgetting Problem

```
Problem: Training too much on new data

Before Fine-Tuning:
├── Knows: English, Math, Science, History, Code...
└── General capability: 100%

After BAD Fine-Tuning (too aggressive):
├── Knows: ONLY your specific task
├── Forgot: Everything else!
└── General capability: 20%

After GOOD Fine-Tuning (balanced):
├── Knows: Your task + General knowledge
├── Maintained: Base capabilities
└── General capability: 95%

Solution: Lower learning rate, fewer epochs, regularization
```

---

## 🔄 Types of Fine-Tuning

### 1. Full Fine-Tuning

```
Full Fine-Tuning:
├── Update: ALL model parameters
├── Memory: HUGE (full model in GPU)
├── Speed: Slow
├── Quality: Highest (if done right)
└── Risk: Catastrophic forgetting

Example:
LLaMA-7B = 7 billion parameters
All 7B updated during training
GPU Memory: 28GB+ (FP32)
```

### 2. Feature Extraction (Frozen Model)

```
Feature Extraction:
├── Freeze: ALL pretrained layers
├── Train: ONLY new classification head
├── Memory: Low
├── Speed: Fast
├── Quality: Good for simple tasks

┌─────────────────────────────────┐
│  Pretrained Model (FROZEN)      │
│  ┌───────────────────────────┐  │
│  │ Layer 1 🔒                │  │
│  │ Layer 2 🔒                │  │
│  │ ...                       │  │
│  │ Layer N 🔒                │  │
│  └───────────────────────────┘  │
│           ↓                      │
│  ┌───────────────────────────┐  │
│  │ New Head (TRAINABLE) ✏️   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 3. Partial Fine-Tuning

```
Partial Fine-Tuning:
├── Freeze: Early layers (general features)
├── Train: Later layers (task-specific)
├── Memory: Medium
├── Speed: Medium
├── Quality: Good balance

┌─────────────────────────────────┐
│  Layer 1-3 🔒 (General)         │
│  Layer 4-6 🔒 (General)         │
│  Layer 7-9  ✏️ (Domain)         │
│  Layer 10-12 ✏️ (Task-specific) │
│  New Head ✏️                    │
└─────────────────────────────────┘
```

### 4. Parameter-Efficient Fine-Tuning (PEFT)

```
PEFT Methods (Week 4 Focus!):
├── LoRA: Add small trainable matrices
├── QLoRA: LoRA + Quantization
├── Prefix Tuning: Learn prompt embeddings
├── Adapters: Insert small networks
└── Prompt Tuning: Learn soft prompts

Memory Comparison (7B model):
┌─────────────────────────────────────┐
│ Full Fine-Tuning:    28 GB         │
│ LoRA:                8 GB          │
│ QLoRA:               4 GB          │ ← Game changer!
└─────────────────────────────────────┘
```

---

## 📐 Mathematical Foundations

### The Fine-Tuning Objective

**Standard Language Model Loss:**

$$\mathcal{L}_{LM} = -\sum_{t=1}^{T} \log P(x_t | x_{<t}; \theta)$$

Where:
- $x_t$ = token at position $t$
- $x_{<t}$ = all previous tokens
- $\theta$ = model parameters

**Fine-Tuning Loss (with regularization):**

$$\mathcal{L}_{FT} = \mathcal{L}_{task} + \lambda \|\theta - \theta_{pretrained}\|^2$$

Where:
- $\mathcal{L}_{task}$ = task-specific loss
- $\lambda$ = regularization strength
- $\theta_{pretrained}$ = original pretrained weights

### Learning Rate Considerations

**Why Lower Learning Rate?**

```
Pre-training:
├── Random initialization
├── Large gradients needed
├── Learning rate: 1e-4 to 1e-3

Fine-tuning:
├── Already good weights
├── Small adjustments needed
├── Learning rate: 1e-5 to 5e-5 (10-100x smaller!)
```

**Gradient Update:**

$$\theta_{new} = \theta_{old} - \eta \cdot \nabla_\theta \mathcal{L}$$

**Fine-tuning rule of thumb:**
$$\eta_{finetune} = \frac{\eta_{pretrain}}{10} \text{ to } \frac{\eta_{pretrain}}{100}$$

### Layer-wise Learning Rate Decay

**Different learning rates for different layers:**

$$\eta_l = \eta_{base} \cdot \alpha^{L-l}$$

Where:
- $l$ = layer number
- $L$ = total layers
- $\alpha$ = decay factor (typically 0.9-0.95)

```
Example (12-layer model, base_lr=1e-4, α=0.9):

Layer 12: 1e-4 × 0.9^0  = 1e-4     (highest)
Layer 11: 1e-4 × 0.9^1  = 9e-5
Layer 10: 1e-4 × 0.9^2  = 8.1e-5
...
Layer 1:  1e-4 × 0.9^11 = 3.1e-5   (lowest)

Intuition: Early layers = general features (change less)
          Later layers = task-specific (change more)
```

### Gradient Accumulation

**When GPU memory is limited:**

```
Effective Batch Size = Micro Batch × Accumulation Steps

Example:
├── GPU can only fit: 4 samples
├── You want batch size: 32
├── Solution: Accumulate for 8 steps
├── 4 × 8 = 32 effective batch size
```

$$\theta_{new} = \theta_{old} - \eta \cdot \frac{1}{K}\sum_{k=1}^{K} \nabla_\theta \mathcal{L}_k$$

Where $K$ = accumulation steps

---

## 💻 Code Implementation

### Basic Fine-Tuning with HuggingFace

```python
"""
Fine-Tuning BERT for Text Classification
Complete implementation from scratch
"""

import torch
from torch.utils.data import DataLoader
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding
)
from datasets import load_dataset
import numpy as np
from sklearn.metrics import accuracy_score, f1_score

# ============================================
# 1. LOAD PRETRAINED MODEL AND TOKENIZER
# ============================================

model_name = "bert-base-uncased"
num_labels = 2  # Binary classification

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Load model with classification head
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=num_labels
)

print(f"Model parameters: {model.num_parameters():,}")
# Output: Model parameters: 109,483,778

# ============================================
# 2. PREPARE DATASET
# ============================================

# Load IMDB dataset (sentiment analysis)
dataset = load_dataset("imdb")

print(f"Train size: {len(dataset['train'])}")
print(f"Test size: {len(dataset['test'])}")

# Tokenization function
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=256
    )

# Apply tokenization
tokenized_datasets = dataset.map(
    tokenize_function,
    batched=True,
    remove_columns=["text"]
)

# Rename label column
tokenized_datasets = tokenized_datasets.rename_column("label", "labels")

# Set format for PyTorch
tokenized_datasets.set_format("torch")

# ============================================
# 3. TRAINING CONFIGURATION
# ============================================

training_args = TrainingArguments(
    # Output
    output_dir="./results",
    
    # Training hyperparameters
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    
    # Learning rate schedule
    learning_rate=2e-5,  # Lower than pre-training!
    weight_decay=0.01,
    warmup_steps=500,
    
    # Logging
    logging_dir="./logs",
    logging_steps=100,
    
    # Evaluation
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    
    # Optimization
    fp16=True,  # Mixed precision
    gradient_accumulation_steps=2,
    
    # Reproducibility
    seed=42,
)

# ============================================
# 4. METRICS COMPUTATION
# ============================================

def compute_metrics(eval_pred):
    """Compute accuracy and F1 score"""
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    
    accuracy = accuracy_score(labels, predictions)
    f1 = f1_score(labels, predictions, average='weighted')
    
    return {
        "accuracy": accuracy,
        "f1": f1
    }

# ============================================
# 5. CREATE TRAINER AND TRAIN
# ============================================

# Data collator for dynamic padding
data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

# Initialize Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_datasets["train"],
    eval_dataset=tokenized_datasets["test"],
    tokenizer=tokenizer,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

# Train!
print("Starting fine-tuning...")
trainer.train()

# ============================================
# 6. EVALUATE
# ============================================

results = trainer.evaluate()
print(f"\nFinal Results:")
print(f"  Accuracy: {results['eval_accuracy']:.4f}")
print(f"  F1 Score: {results['eval_f1']:.4f}")

# ============================================
# 7. SAVE MODEL
# ============================================

trainer.save_model("./fine_tuned_bert")
tokenizer.save_pretrained("./fine_tuned_bert")

print("\nModel saved successfully!")
```

### Manual Fine-Tuning Loop (For Understanding)

```python
"""
Manual Fine-Tuning Loop
Understanding what happens under the hood
"""

import torch
import torch.nn as nn
from torch.optim import AdamW
from transformers import get_linear_schedule_with_warmup
from tqdm import tqdm

class FineTuner:
    def __init__(self, model, tokenizer, device='cuda'):
        self.model = model.to(device)
        self.tokenizer = tokenizer
        self.device = device
        
    def prepare_optimizer(self, learning_rate=2e-5, weight_decay=0.01):
        """
        Prepare optimizer with weight decay
        Key: Don't apply weight decay to bias and LayerNorm
        """
        # Parameters that should NOT have weight decay
        no_decay = ['bias', 'LayerNorm.weight', 'LayerNorm.bias']
        
        optimizer_grouped_parameters = [
            {
                'params': [p for n, p in self.model.named_parameters() 
                          if not any(nd in n for nd in no_decay)],
                'weight_decay': weight_decay
            },
            {
                'params': [p for n, p in self.model.named_parameters() 
                          if any(nd in n for nd in no_decay)],
                'weight_decay': 0.0
            }
        ]
        
        self.optimizer = AdamW(
            optimizer_grouped_parameters,
            lr=learning_rate,
            eps=1e-8
        )
        
        return self.optimizer
    
    def prepare_scheduler(self, num_training_steps, warmup_ratio=0.1):
        """
        Learning rate scheduler with warmup
        """
        num_warmup_steps = int(num_training_steps * warmup_ratio)
        
        self.scheduler = get_linear_schedule_with_warmup(
            self.optimizer,
            num_warmup_steps=num_warmup_steps,
            num_training_steps=num_training_steps
        )
        
        return self.scheduler
    
    def train_epoch(self, dataloader, accumulation_steps=1):
        """
        Train for one epoch with gradient accumulation
        """
        self.model.train()
        total_loss = 0
        
        progress_bar = tqdm(dataloader, desc="Training")
        
        for step, batch in enumerate(progress_bar):
            # Move batch to device
            batch = {k: v.to(self.device) for k, v in batch.items()}
            
            # Forward pass
            outputs = self.model(**batch)
            loss = outputs.loss
            
            # Scale loss for gradient accumulation
            loss = loss / accumulation_steps
            
            # Backward pass
            loss.backward()
            
            # Update weights every accumulation_steps
            if (step + 1) % accumulation_steps == 0:
                # Gradient clipping
                torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(), 
                    max_norm=1.0
                )
                
                # Optimizer step
                self.optimizer.step()
                self.scheduler.step()
                
                # Clear gradients
                self.optimizer.zero_grad()
            
            total_loss += loss.item() * accumulation_steps
            progress_bar.set_postfix({'loss': loss.item() * accumulation_steps})
        
        return total_loss / len(dataloader)
    
    def evaluate(self, dataloader):
        """
        Evaluate the model
        """
        self.model.eval()
        total_loss = 0
        all_preds = []
        all_labels = []
        
        with torch.no_grad():
            for batch in tqdm(dataloader, desc="Evaluating"):
                batch = {k: v.to(self.device) for k, v in batch.items()}
                
                outputs = self.model(**batch)
                loss = outputs.loss
                logits = outputs.logits
                
                total_loss += loss.item()
                
                predictions = torch.argmax(logits, dim=-1)
                all_preds.extend(predictions.cpu().numpy())
                all_labels.extend(batch['labels'].cpu().numpy())
        
        accuracy = sum(p == l for p, l in zip(all_preds, all_labels)) / len(all_preds)
        
        return {
            'loss': total_loss / len(dataloader),
            'accuracy': accuracy
        }
    
    def fine_tune(self, train_loader, eval_loader, epochs=3, 
                  learning_rate=2e-5, accumulation_steps=1):
        """
        Complete fine-tuning loop
        """
        # Calculate total training steps
        num_training_steps = len(train_loader) * epochs // accumulation_steps
        
        # Prepare optimizer and scheduler
        self.prepare_optimizer(learning_rate)
        self.prepare_scheduler(num_training_steps)
        
        best_accuracy = 0
        
        for epoch in range(epochs):
            print(f"\n{'='*50}")
            print(f"Epoch {epoch + 1}/{epochs}")
            print(f"{'='*50}")
            
            # Train
            train_loss = self.train_epoch(train_loader, accumulation_steps)
            print(f"Training Loss: {train_loss:.4f}")
            
            # Evaluate
            eval_results = self.evaluate(eval_loader)
            print(f"Eval Loss: {eval_results['loss']:.4f}")
            print(f"Eval Accuracy: {eval_results['accuracy']:.4f}")
            
            # Save best model
            if eval_results['accuracy'] > best_accuracy:
                best_accuracy = eval_results['accuracy']
                self.save_model(f"best_model_epoch_{epoch+1}")
                print(f"New best model saved!")
        
        print(f"\nBest Accuracy: {best_accuracy:.4f}")
        
    def save_model(self, path):
        """Save model and tokenizer"""
        self.model.save_pretrained(path)
        self.tokenizer.save_pretrained(path)


# Usage
if __name__ == "__main__":
    from transformers import AutoModelForSequenceClassification, AutoTokenizer
    
    # Load model
    model = AutoModelForSequenceClassification.from_pretrained(
        "bert-base-uncased",
        num_labels=2
    )
    tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
    
    # Initialize fine-tuner
    fine_tuner = FineTuner(model, tokenizer)
    
    # Fine-tune (assuming you have dataloaders)
    # fine_tuner.fine_tune(train_loader, eval_loader, epochs=3)
```

### Layer-wise Learning Rate Decay Implementation

```python
"""
Layer-wise Learning Rate Decay
Different learning rates for different layers
"""

def get_layerwise_lr_params(model, base_lr=2e-5, decay_factor=0.9):
    """
    Assign different learning rates to different layers
    Earlier layers get lower learning rates
    """
    
    # Get number of layers
    num_layers = model.config.num_hidden_layers
    
    # Create parameter groups
    param_groups = []
    
    # Embeddings (lowest LR)
    embedding_lr = base_lr * (decay_factor ** num_layers)
    param_groups.append({
        'params': list(model.bert.embeddings.parameters()),
        'lr': embedding_lr,
        'name': 'embeddings'
    })
    
    # Each encoder layer
    for layer_idx in range(num_layers):
        layer_lr = base_lr * (decay_factor ** (num_layers - layer_idx))
        param_groups.append({
            'params': list(model.bert.encoder.layer[layer_idx].parameters()),
            'lr': layer_lr,
            'name': f'layer_{layer_idx}'
        })
    
    # Pooler and classifier (highest LR)
    param_groups.append({
        'params': list(model.bert.pooler.parameters()) + 
                  list(model.classifier.parameters()),
        'lr': base_lr,
        'name': 'classifier'
    })
    
    # Print learning rates
    print("Layer-wise Learning Rates:")
    for group in param_groups:
        print(f"  {group['name']}: {group['lr']:.2e}")
    
    return param_groups


# Usage
param_groups = get_layerwise_lr_params(model, base_lr=2e-5, decay_factor=0.9)
optimizer = AdamW(param_groups)
```

---

## 🌍 Real World Use Cases

### 1. Customer Support Bot

```
Task: Fine-tune model on company's support tickets

Data:
├── Input: Customer questions
├── Output: Agent responses
├── Size: 50,000 ticket pairs

Result:
├── Before: Generic responses
├── After: Company-specific knowledge
├── Improvement: 40% fewer escalations
```

### 2. Medical Diagnosis Assistant

```
Task: Fine-tune on medical literature

Data:
├── Input: Patient symptoms
├── Output: Possible diagnoses
├── Size: 100,000 medical records

Result:
├── Understands medical terminology
├── Follows clinical guidelines
├── Suggests relevant tests
```

### 3. Legal Document Analyzer

```
Task: Fine-tune on legal contracts

Data:
├── Input: Contract clauses
├── Output: Risk assessments
├── Size: 20,000 contracts

Result:
├── Identifies risky clauses
├── Suggests improvements
├── Saves 80% review time
```

### 4. Code Assistant

```
Task: Fine-tune on company codebase

Data:
├── Input: Code context + comments
├── Output: Code completion
├── Size: Company's GitHub repos

Result:
├── Knows internal APIs
├── Follows coding standards
├── Suggests project-specific patterns
```

---

## 🛠️ Mini Project: Sentiment Classifier Fine-Tuning

### Project: Amazon Review Classifier

```python
"""
Mini Project: Fine-tune DistilBERT for Amazon Review Classification
Categories: Electronics, Books, Clothing
Sentiment: Positive, Negative
"""

import torch
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    TrainingArguments,
    Trainer
)
from datasets import load_dataset, Dataset
import pandas as pd

# ============================================
# STEP 1: PREPARE DATA
# ============================================

# Sample data (in practice, load from CSV/JSON)
data = {
    'text': [
        "This laptop is amazing! Fast and reliable.",
        "Terrible quality, stopped working after a week.",
        "Great book, couldn't put it down!",
        "Boring and poorly written. Waste of money.",
        "Perfect fit and comfortable material.",
        "Shrunk after first wash. Very disappointed.",
    ] * 100,  # Repeat for demo
    'label': [1, 0, 1, 0, 1, 0] * 100  # 1=positive, 0=negative
}

# Create dataset
dataset = Dataset.from_pandas(pd.DataFrame(data))
dataset = dataset.train_test_split(test_size=0.2, seed=42)

print(f"Train size: {len(dataset['train'])}")
print(f"Test size: {len(dataset['test'])}")

# ============================================
# STEP 2: LOAD MODEL AND TOKENIZER
# ============================================

model_name = "distilbert-base-uncased"

tokenizer = DistilBertTokenizer.from_pretrained(model_name)
model = DistilBertForSequenceClassification.from_pretrained(
    model_name,
    num_labels=2
)

# ============================================
# STEP 3: TOKENIZE
# ============================================

def tokenize(examples):
    return tokenizer(
        examples['text'],
        padding='max_length',
        truncation=True,
        max_length=128
    )

tokenized = dataset.map(tokenize, batched=True)
tokenized = tokenized.rename_column('label', 'labels')
tokenized.set_format('torch', columns=['input_ids', 'attention_mask', 'labels'])

# ============================================
# STEP 4: TRAINING
# ============================================

training_args = TrainingArguments(
    output_dir='./amazon_classifier',
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    learning_rate=2e-5,
    evaluation_strategy='epoch',
    logging_steps=50,
    save_strategy='epoch',
    load_best_model_at_end=True,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized['train'],
    eval_dataset=tokenized['test'],
)

# Train
trainer.train()

# ============================================
# STEP 5: INFERENCE
# ============================================

def predict(text):
    inputs = tokenizer(text, return_tensors='pt', truncation=True, max_length=128)
    outputs = model(**inputs)
    prediction = torch.argmax(outputs.logits, dim=-1).item()
    confidence = torch.softmax(outputs.logits, dim=-1).max().item()
    
    sentiment = "Positive" if prediction == 1 else "Negative"
    return f"{sentiment} (confidence: {confidence:.2%})"

# Test
print(predict("This product exceeded my expectations!"))
# Output: Positive (confidence: 95.3%)

print(predict("Worst purchase ever. Complete waste of money."))
# Output: Negative (confidence: 97.1%)
```

---

## ⚠️ Common Mistakes

### 1. Learning Rate Too High

```python
# ❌ WRONG: Using pre-training learning rate
training_args = TrainingArguments(
    learning_rate=1e-3  # TOO HIGH! Will destroy pretrained weights
)

# ✅ CORRECT: Use lower learning rate
training_args = TrainingArguments(
    learning_rate=2e-5  # 50x lower than pre-training
)
```

### 2. Not Using Warmup

```python
# ❌ WRONG: No warmup
training_args = TrainingArguments(
    warmup_steps=0
)

# ✅ CORRECT: Use warmup
training_args = TrainingArguments(
    warmup_steps=500  # Or warmup_ratio=0.1
)
```

### 3. Training Too Many Epochs

```python
# ❌ WRONG: Too many epochs = overfitting
training_args = TrainingArguments(
    num_train_epochs=20  # Way too many!
)

# ✅ CORRECT: 2-5 epochs is usually enough
training_args = TrainingArguments(
    num_train_epochs=3
)
```

### 4. Not Evaluating During Training

```python
# ❌ WRONG: No evaluation
training_args = TrainingArguments(
    evaluation_strategy="no"
)

# ✅ CORRECT: Evaluate regularly
training_args = TrainingArguments(
    evaluation_strategy="epoch",
    load_best_model_at_end=True  # Important!
)
```

### 5. Ignoring Class Imbalance

```python
# ❌ WRONG: Ignoring imbalanced classes
# If 95% positive, 5% negative, model just predicts positive

# ✅ CORRECT: Handle imbalance
from torch.nn import CrossEntropyLoss

# Calculate class weights
class_weights = torch.tensor([1.0, 19.0])  # More weight to rare class

# Use weighted loss
loss_fn = CrossEntropyLoss(weight=class_weights)
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is fine-tuning and why is it useful?**

> **A:** Fine-tuning is the process of taking a pre-trained model and further training it on a smaller, task-specific dataset. It's useful because:
> 1. Saves time and compute (don't train from scratch)
> 2. Requires less data (knowledge transfer)
> 3. Often achieves better results than training from scratch
> 4. Accessible to companies without massive resources

**Q2: What's the difference between pre-training and fine-tuning?**

> **A:** 
> - **Pre-training:** Training from scratch on massive datasets (TB of text), learning general language understanding. Done by big labs (OpenAI, Google).
> - **Fine-tuning:** Taking a pre-trained model and continuing training on specific task/domain with smaller datasets (KB-GB). Done by practitioners.

**Q3: Why do we use a lower learning rate for fine-tuning?**

> **A:** Pre-trained weights already encode useful knowledge. A high learning rate would destroy these weights by making large updates. A lower learning rate (typically 10-100x smaller) makes small, careful adjustments that preserve the pre-trained knowledge while adapting to the new task.

### Intermediate Level

**Q4: Explain catastrophic forgetting and how to prevent it.**

> **A:** Catastrophic forgetting occurs when fine-tuning causes the model to forget previously learned knowledge.
>
> Prevention strategies:
> 1. Lower learning rate
> 2. Fewer training epochs
> 3. Regularization (L2, weight decay)
> 4. Elastic Weight Consolidation (EWC)
> 5. Replay buffer (mix old data with new)
> 6. Parameter-efficient methods (LoRA, adapters)

**Q5: What is gradient accumulation and when would you use it?**

> **A:** Gradient accumulation computes gradients over multiple small batches before updating weights. Used when:
> - GPU memory can't fit desired batch size
> - You want larger effective batch size for stability
>
> Formula: Effective batch = micro_batch × accumulation_steps

**Q6: Explain layer-wise learning rate decay.**

> **A:** Different learning rates for different layers:
> - Earlier layers (general features): Lower LR
> - Later layers (task-specific): Higher LR
>
> Formula: $\eta_l = \eta_{base} \times \alpha^{L-l}$
>
> Intuition: Early layers learn general patterns (change less), later layers learn task-specific patterns (change more).

### Advanced Level

**Q7: Compare different fine-tuning strategies for a production system.**

> **A:** 
> 
> | Strategy | Memory | Quality | Speed | Use Case |
> |----------|--------|---------|-------|----------|
> | Full Fine-tuning | High | Highest | Slow | Unlimited resources |
> | Frozen + Head | Low | Good | Fast | Simple classification |
> | Partial Fine-tuning | Medium | Good | Medium | Limited resources |
> | LoRA | Low | High | Fast | Production systems |
> | QLoRA | Very Low | High | Fast | Consumer GPUs |
>
> Recommendation: Start with LoRA/QLoRA for most production cases.

**Q8: How would you handle domain shift in fine-tuning?**

> **A:** Domain shift = difference between pre-training and fine-tuning data distributions.
>
> Strategies:
> 1. **Domain-adaptive pre-training:** Continue pre-training on domain text before fine-tuning
> 2. **Multi-task learning:** Fine-tune on related tasks simultaneously
> 3. **Data augmentation:** Generate more diverse examples
> 4. **Curriculum learning:** Start with easier examples, gradually increase difficulty

### FAANG Level

**Q9: Design a fine-tuning pipeline for a multi-language customer support system.**

> **A:** Architecture:
>
> 1. **Base Model:** mBERT or XLM-RoBERTa (multilingual)
> 2. **Data Strategy:**
>    - Collect tickets in all languages
>    - Handle imbalanced languages (upsampling/downsampling)
>    - Translation augmentation for low-resource languages
>
> 3. **Training:**
>    - LoRA for efficiency
>    - Language-balanced batch sampling
>    - Per-language evaluation metrics
>
> 4. **Deployment:**
>    - Language detection → route to appropriate model
>    - Or single multilingual model with language-conditional generation
>
> 5. **Monitoring:**
>    - Track per-language performance
>    - Detect drift in each language separately

**Q10: Explain the trade-offs between full fine-tuning and PEFT methods in terms of the loss landscape.**

> **A:** Loss landscape perspective:
>
> **Full Fine-tuning:**
> - Explores full parameter space
> - Can reach global optima for task
> - Risk: May leave "good region" of pre-trained weights
>
> **PEFT (LoRA):**
> - Constrained to low-rank subspace
> - Stays close to pre-trained solution
> - Trade-off: May not reach optimal task performance
>
> Mathematical insight:
> - PEFT constrains $\Delta W = AB^T$ where rank(AB^T) << rank(W)
> - This is implicit regularization
> - Empirically: This constraint often helps generalization

---

## 📝 Homework

### Easy

1. **Conceptual Questions:**
   - What is transfer learning?
   - Why is fine-tuning faster than training from scratch?
   - What happens if learning rate is too high?

2. **Code Exercise:**
   - Fine-tune DistilBERT on SST-2 sentiment dataset
   - Compare training with lr=2e-5 vs lr=1e-3

### Medium

3. **Experiment:**
   - Compare full fine-tuning vs frozen backbone
   - Measure accuracy and training time
   - Plot learning curves

4. **Implementation:**
   - Implement layer-wise learning rate decay
   - Compare with uniform learning rate

### Hard

5. **Production Pipeline:**
   - Build a fine-tuning pipeline with:
     - Data validation
     - Hyperparameter tuning
     - Model versioning
     - Evaluation dashboard

6. **Research:**
   - Read "How to Fine-Tune BERT for Text Classification" paper
   - Implement their recommendations
   - Compare with default HuggingFace settings

### Expert

7. **Multi-task Fine-tuning:**
   - Fine-tune one model for 3 different tasks
   - Implement task-specific heads
   - Balance training across tasks

8. **Domain Adaptation:**
   - Take BERT pre-trained on general text
   - Adapt to medical domain
   - Compare: direct fine-tuning vs domain-adaptive pre-training + fine-tuning

---

## 🎯 Key Takeaways

```
Fine-Tuning Essentials:
├── Start with pre-trained model
├── Use LOWER learning rate (2e-5)
├── Train for FEW epochs (2-5)
├── Always use warmup
├── Evaluate during training
├── Save best model
└── Consider PEFT for efficiency

Decision Tree:
┌─────────────────────────────────────┐
│ Do you have unlimited GPU memory?   │
├─────────────────────────────────────┤
│ YES → Full fine-tuning              │
│ NO  → LoRA/QLoRA                    │
└─────────────────────────────────────┘

Remember:
"Fine-tuning is NOT about changing everything.
 It's about carefully adjusting what's already good."
```

---

**Next: [02-LoRA-and-QLoRA.md](./02-LoRA-and-QLoRA.md)** - The game-changing techniques that let you fine-tune billion-parameter models on consumer GPUs! 🚀
