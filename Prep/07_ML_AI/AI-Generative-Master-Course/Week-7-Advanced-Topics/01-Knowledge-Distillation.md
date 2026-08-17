# 🎓 Knowledge Distillation

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [Types of Distillation](#-types-of-distillation)
5. [Mathematical Formulation](#-mathematical-formulation)
6. [Implementation](#-implementation)
7. [Advanced Techniques](#-advanced-techniques)
8. [Real-World Use Cases](#-real-world-use-cases)
9. [Hands-On Project](#-hands-on-project)
10. [Common Mistakes](#-common-mistakes)
11. [Interview Questions](#-interview-questions)
12. [Homework](#-homework)

---

## 🎯 Introduction

**Knowledge Distillation** is a model compression technique where a smaller "student" model learns to mimic a larger "teacher" model. This allows deploying powerful AI capabilities on resource-constrained devices.

### Why Distillation Matters

| Metric | Teacher (BERT-Large) | Student (DistilBERT) |
|--------|---------------------|----------------------|
| Parameters | 340M | 66M |
| Size | 1.3GB | 250MB |
| Inference Speed | 1x | 2.5x |
| Accuracy | 100% | 97% |
| Deployable on Phone? | ❌ | ✅ |

### Key Insight

```
┌─────────────────────────────────────────────────────────────┐
│                 THE DISTILLATION INSIGHT                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Hard Labels (traditional):                                  │
│  Image of cat → [0, 0, 1, 0, 0] (one-hot: "cat")            │
│                                                              │
│  Soft Labels (teacher):                                      │
│  Image of cat → [0.01, 0.02, 0.85, 0.10, 0.02]              │
│                  dog   bird  cat   tiger  lion              │
│                                                              │
│  The soft labels contain RICH INFORMATION:                  │
│  - "This cat looks a bit like a tiger" (0.10)               │
│  - "Definitely not a bird" (0.02)                           │
│  - This is "DARK KNOWLEDGE" - learned relationships!        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧒 Beginner Explanation

### The "Expert Teacher" Analogy

Imagine you're learning to be a doctor:

**Option 1: Study textbooks alone**
```
Textbook says: "Symptom X = Disease Y"
Just memorize facts (hard labels)
Limited understanding
```

**Option 2: Learn from expert doctor**
```
Expert says: "When you see symptom X, it's usually Y,
but notice the slight variation - that could indicate Z.
Also, rule out W because of this subtle sign..."

You learn:
- The main answer (Y)
- Why other answers are wrong
- Subtle patterns
- Expert intuition
```

**Knowledge Distillation = Option 2 for AI!**

### Visual: Teacher-Student Learning

```
┌─────────────────────────────────────────────────────────────┐
│                 KNOWLEDGE DISTILLATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│     ┌──────────────────────┐                                │
│     │   TEACHER MODEL      │                                │
│     │   (Large, Accurate)  │                                │
│     │   340M parameters    │                                │
│     └──────────┬───────────┘                                │
│                │                                             │
│                ▼ Soft Predictions                           │
│     ┌──────────────────────┐                                │
│     │ [0.01, 0.85, 0.10,   │ ← "Dark Knowledge"             │
│     │  0.02, 0.02]         │   (relationships between      │
│     └──────────┬───────────┘    classes)                    │
│                │                                             │
│         Learn from                                          │
│                │                                             │
│                ▼                                             │
│     ┌──────────────────────┐                                │
│     │   STUDENT MODEL      │                                │
│     │   (Small, Fast)      │                                │
│     │   66M parameters     │                                │
│     └──────────────────────┘                                │
│                                                              │
│  Result: Student achieves ~97% of teacher's performance     │
│          with 5x fewer parameters!                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Deep Technical Breakdown

### The Core Idea

Traditional training uses **hard labels** (one-hot encoded):
```
Cat image → Target: [0, 0, 1, 0, 0]  (only "cat" is 1)
```

Distillation uses **soft labels** from teacher:
```
Cat image → Teacher output: [0.01, 0.02, 0.85, 0.10, 0.02]
```

The soft labels contain **dark knowledge**:
- Relationships between classes
- Similarity information
- Teacher's learned patterns

### Temperature Scaling

To extract more information from soft labels, we use **temperature**:

**Standard Softmax:**
$$p_i = \frac{e^{z_i}}{\sum_j e^{z_j}}$$

**Softmax with Temperature:**
$$p_i = \frac{e^{z_i/T}}{\sum_j e^{z_j/T}}$$

Where:
- $z_i$ = logit (pre-softmax output)
- $T$ = temperature (typically 2-20)
- Higher $T$ → softer distribution → more information

```
Example with logits [5, 2, 1]:

T=1 (standard):  [0.94, 0.04, 0.02]  ← Sharp, little info
T=5 (soft):      [0.55, 0.25, 0.20]  ← Softer, more info
T=20 (very soft):[0.38, 0.32, 0.30]  ← Almost uniform
```

### Why Temperature Works

```
┌─────────────────────────────────────────────────────────────┐
│                 TEMPERATURE EFFECT                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Logits: [10, 2, 1]                                         │
│                                                              │
│  T=1:  ████████████████████ 0.9998  (cat)                   │
│        █                    0.0001  (dog)                   │
│        █                    0.0001  (bird)                  │
│        → Almost no information about relationships          │
│                                                              │
│  T=10: ████████████         0.57    (cat)                   │
│        ████                 0.24    (dog)                   │
│        ███                  0.19    (bird)                  │
│        → Rich information: "dog more similar than bird"     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Types of Distillation

### 1. Response-Based Distillation

Student learns from teacher's **final outputs**:

```python
# Simplest form
teacher_output = teacher(x)  # Soft labels
student_output = student(x)
loss = KL_divergence(student_output, teacher_output)
```

### 2. Feature-Based Distillation

Student learns from teacher's **intermediate representations**:

```
Teacher:  Input → [Layer1] → [Layer2] → [Layer3] → Output
                     ↓           ↓           ↓
Student:  Input → [Layer1] → [Layer2] → Output
                     ↑           ↑
              Match these features!
```

### 3. Relation-Based Distillation

Student learns **relationships between samples**:

```
Teacher sees samples A, B, C:
- A and B are similar (distance = 0.2)
- A and C are different (distance = 0.9)

Student must learn same relationships!
```

### Comparison Table

| Type | What's Transferred | Complexity | Use Case |
|------|-------------------|------------|----------|
| Response | Final predictions | Low | Quick compression |
| Feature | Hidden activations | Medium | Better accuracy |
| Relation | Sample relationships | High | Few-shot learning |

---

## 📐 Mathematical Formulation

### Hinton's Original Distillation Loss

The total loss combines two components:

$$\mathcal{L} = \alpha \cdot \mathcal{L}_{hard} + (1-\alpha) \cdot T^2 \cdot \mathcal{L}_{soft}$$

Where:

**Hard Loss** (standard cross-entropy with true labels):
$$\mathcal{L}_{hard} = -\sum_i y_i \log(p_i^S)$$

**Soft Loss** (KL divergence with teacher):
$$\mathcal{L}_{soft} = \sum_i p_i^T \log\left(\frac{p_i^T}{p_i^S}\right)$$

Where:
- $y_i$ = true one-hot label
- $p_i^S$ = student prediction
- $p_i^T$ = teacher prediction (with temperature)
- $T$ = temperature
- $\alpha$ = balancing weight (typically 0.1-0.5)

**Why $T^2$?** Gradients from soft labels scale as $1/T^2$, so we multiply by $T^2$ to maintain gradient magnitude.

### Feature Distillation Loss

For intermediate layer matching:

$$\mathcal{L}_{feature} = \sum_l \|f_l^T(x) - \phi(f_l^S(x))\|^2$$

Where:
- $f_l^T$ = teacher's feature at layer $l$
- $f_l^S$ = student's feature at layer $l$
- $\phi$ = transformation to match dimensions

### Attention Transfer

Transfer attention maps from teacher:

$$\mathcal{L}_{AT} = \sum_l \left\| \frac{A_l^T}{\|A_l^T\|_2} - \frac{A_l^S}{\|A_l^S\|_2} \right\|_2$$

Where attention map:
$$A = \sum_c |F_c|^2$$

(Sum of squared feature map activations across channels)

---

## 💻 Implementation

### Basic Knowledge Distillation

```python
"""
Knowledge Distillation Implementation
From scratch with PyTorch
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt

# ============================================
# DISTILLATION LOSS
# ============================================

class DistillationLoss(nn.Module):
    """
    Combined loss for knowledge distillation:
    L = α * L_hard + (1-α) * T² * L_soft
    """
    def __init__(
        self,
        temperature: float = 4.0,
        alpha: float = 0.3
    ):
        super().__init__()
        self.temperature = temperature
        self.alpha = alpha
        self.hard_loss = nn.CrossEntropyLoss()
    
    def forward(
        self,
        student_logits: torch.Tensor,
        teacher_logits: torch.Tensor,
        labels: torch.Tensor
    ) -> torch.Tensor:
        """
        Args:
            student_logits: [batch, num_classes]
            teacher_logits: [batch, num_classes]
            labels: [batch] ground truth
        """
        # Hard loss (with true labels)
        hard_loss = self.hard_loss(student_logits, labels)
        
        # Soft loss (with teacher's soft targets)
        # Apply temperature scaling
        soft_student = F.log_softmax(student_logits / self.temperature, dim=1)
        soft_teacher = F.softmax(teacher_logits / self.temperature, dim=1)
        
        # KL divergence
        soft_loss = F.kl_div(
            soft_student,
            soft_teacher,
            reduction='batchmean'
        )
        
        # Combined loss (note T² scaling)
        total_loss = (
            self.alpha * hard_loss + 
            (1 - self.alpha) * (self.temperature ** 2) * soft_loss
        )
        
        return total_loss, hard_loss, soft_loss


# ============================================
# MODEL DEFINITIONS
# ============================================

class TeacherModel(nn.Module):
    """Large teacher model (e.g., ResNet-like)"""
    def __init__(self, num_classes: int = 10):
        super().__init__()
        self.features = nn.Sequential(
            # Block 1
            nn.Conv2d(1, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            # Block 2
            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.Conv2d(128, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            # Block 3
            nn.Conv2d(128, 256, 3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.Conv2d(256, 256, 3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256 * 3 * 3, 512),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x


class StudentModel(nn.Module):
    """Small student model"""
    def __init__(self, num_classes: int = 10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(16, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(32 * 7 * 7, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes)
        )
    
    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x


# ============================================
# TRAINING FUNCTIONS
# ============================================

def train_teacher(model, train_loader, epochs=10, device='cuda'):
    """Train the teacher model normally"""
    model = model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()
    
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        correct = 0
        total = 0
        
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(device), target.to(device)
            
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            pred = output.argmax(dim=1)
            correct += pred.eq(target).sum().item()
            total += target.size(0)
        
        acc = 100. * correct / total
        print(f'Teacher Epoch {epoch+1}: Loss={total_loss/len(train_loader):.4f}, Acc={acc:.2f}%')
    
    return model


def train_student_with_distillation(
    student,
    teacher,
    train_loader,
    temperature=4.0,
    alpha=0.3,
    epochs=10,
    device='cuda'
):
    """Train student using knowledge distillation"""
    student = student.to(device)
    teacher = teacher.to(device)
    teacher.eval()  # Teacher in eval mode
    
    optimizer = torch.optim.Adam(student.parameters(), lr=1e-3)
    criterion = DistillationLoss(temperature=temperature, alpha=alpha)
    
    history = {'loss': [], 'hard_loss': [], 'soft_loss': [], 'acc': []}
    
    for epoch in range(epochs):
        student.train()
        total_loss = 0
        total_hard = 0
        total_soft = 0
        correct = 0
        total = 0
        
        for data, target in train_loader:
            data, target = data.to(device), target.to(device)
            
            # Get teacher predictions (no gradient needed)
            with torch.no_grad():
                teacher_logits = teacher(data)
            
            # Student forward
            student_logits = student(data)
            
            # Distillation loss
            loss, hard_loss, soft_loss = criterion(
                student_logits, teacher_logits, target
            )
            
            # Backward
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            total_hard += hard_loss.item()
            total_soft += soft_loss.item()
            
            pred = student_logits.argmax(dim=1)
            correct += pred.eq(target).sum().item()
            total += target.size(0)
        
        acc = 100. * correct / total
        avg_loss = total_loss / len(train_loader)
        
        history['loss'].append(avg_loss)
        history['hard_loss'].append(total_hard / len(train_loader))
        history['soft_loss'].append(total_soft / len(train_loader))
        history['acc'].append(acc)
        
        print(f'Student Epoch {epoch+1}: Loss={avg_loss:.4f}, '
              f'Hard={total_hard/len(train_loader):.4f}, '
              f'Soft={total_soft/len(train_loader):.4f}, Acc={acc:.2f}%')
    
    return student, history


def train_student_baseline(student, train_loader, epochs=10, device='cuda'):
    """Train student WITHOUT distillation (baseline)"""
    student = student.to(device)
    optimizer = torch.optim.Adam(student.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()
    
    for epoch in range(epochs):
        student.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for data, target in train_loader:
            data, target = data.to(device), target.to(device)
            
            optimizer.zero_grad()
            output = student(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            pred = output.argmax(dim=1)
            correct += pred.eq(target).sum().item()
            total += target.size(0)
        
        acc = 100. * correct / total
        print(f'Baseline Epoch {epoch+1}: Loss={total_loss/len(train_loader):.4f}, Acc={acc:.2f}%')
    
    return student


def evaluate(model, test_loader, device='cuda'):
    """Evaluate model accuracy"""
    model = model.to(device)
    model.eval()
    
    correct = 0
    total = 0
    
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            pred = output.argmax(dim=1)
            correct += pred.eq(target).sum().item()
            total += target.size(0)
    
    return 100. * correct / total


def count_parameters(model):
    """Count trainable parameters"""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


# ============================================
# MAIN EXPERIMENT
# ============================================

def run_distillation_experiment():
    """Compare distilled vs baseline student"""
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Data
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    train_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
    test_dataset = datasets.MNIST('./data', train=False, transform=transform)
    
    train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=128)
    
    # Models
    teacher = TeacherModel()
    student_distilled = StudentModel()
    student_baseline = StudentModel()
    
    print("\n" + "="*60)
    print("MODEL SIZES")
    print("="*60)
    print(f"Teacher parameters: {count_parameters(teacher):,}")
    print(f"Student parameters: {count_parameters(student_distilled):,}")
    print(f"Compression ratio: {count_parameters(teacher)/count_parameters(student_distilled):.1f}x")
    
    # Train teacher
    print("\n" + "="*60)
    print("TRAINING TEACHER")
    print("="*60)
    teacher = train_teacher(teacher, train_loader, epochs=5, device=device)
    teacher_acc = evaluate(teacher, test_loader, device)
    print(f"Teacher test accuracy: {teacher_acc:.2f}%")
    
    # Train baseline student (no distillation)
    print("\n" + "="*60)
    print("TRAINING BASELINE STUDENT (no distillation)")
    print("="*60)
    student_baseline = train_student_baseline(
        student_baseline, train_loader, epochs=5, device=device
    )
    baseline_acc = evaluate(student_baseline, test_loader, device)
    print(f"Baseline student test accuracy: {baseline_acc:.2f}%")
    
    # Train distilled student
    print("\n" + "="*60)
    print("TRAINING DISTILLED STUDENT")
    print("="*60)
    student_distilled, history = train_student_with_distillation(
        student_distilled, teacher, train_loader,
        temperature=4.0, alpha=0.3, epochs=5, device=device
    )
    distilled_acc = evaluate(student_distilled, test_loader, device)
    print(f"Distilled student test accuracy: {distilled_acc:.2f}%")
    
    # Summary
    print("\n" + "="*60)
    print("RESULTS SUMMARY")
    print("="*60)
    print(f"{'Model':<25} {'Parameters':<15} {'Accuracy':<10}")
    print("-"*50)
    print(f"{'Teacher':<25} {count_parameters(teacher):,<15} {teacher_acc:.2f}%")
    print(f"{'Student (baseline)':<25} {count_parameters(student_baseline):,<15} {baseline_acc:.2f}%")
    print(f"{'Student (distilled)':<25} {count_parameters(student_distilled):,<15} {distilled_acc:.2f}%")
    print("-"*50)
    print(f"Distillation improvement: +{distilled_acc - baseline_acc:.2f}%")
    print(f"Accuracy retained: {distilled_acc/teacher_acc*100:.1f}% of teacher")
    
    return teacher, student_distilled, history


if __name__ == "__main__":
    run_distillation_experiment()
```

---

## 🚀 Advanced Techniques

### 1. Self-Distillation

Model teaches itself (no separate teacher):

```python
class SelfDistillation(nn.Module):
    """
    Model with multiple exit points
    Later exits teach earlier exits
    """
    def __init__(self, num_classes=10):
        super().__init__()
        
        # Shared backbone
        self.layer1 = nn.Sequential(...)
        self.layer2 = nn.Sequential(...)
        self.layer3 = nn.Sequential(...)
        
        # Multiple classifiers (exit points)
        self.exit1 = nn.Linear(64, num_classes)   # Early exit
        self.exit2 = nn.Linear(128, num_classes)  # Middle exit
        self.exit3 = nn.Linear(256, num_classes)  # Final exit
    
    def forward(self, x):
        f1 = self.layer1(x)
        f2 = self.layer2(f1)
        f3 = self.layer3(f2)
        
        out1 = self.exit1(f1.flatten(1))
        out2 = self.exit2(f2.flatten(1))
        out3 = self.exit3(f3.flatten(1))
        
        return out1, out2, out3
    
    def distillation_loss(self, outputs, labels, temperature=3.0):
        out1, out2, out3 = outputs
        
        # Hard losses
        hard_loss = sum(F.cross_entropy(out, labels) for out in outputs)
        
        # Soft losses (later exits teach earlier)
        soft_teacher = F.softmax(out3.detach() / temperature, dim=1)
        
        soft_loss = 0
        for out in [out1, out2]:
            soft_student = F.log_softmax(out / temperature, dim=1)
            soft_loss += F.kl_div(soft_student, soft_teacher, reduction='batchmean')
        
        return hard_loss + temperature**2 * soft_loss
```

### 2. Progressive Distillation

Gradually reduce model size:

```
Teacher (1B) → Student 1 (500M) → Student 2 (250M) → Student 3 (100M)

Each step:
- Previous student becomes teacher
- New, smaller student learns from it
- Better than direct 1B → 100M distillation!
```

### 3. Data-Free Distillation

When original training data isn't available:

```python
class DataFreeDistillation:
    """
    Generate synthetic data using teacher's knowledge
    """
    def __init__(self, teacher, student, generator):
        self.teacher = teacher
        self.student = student
        self.generator = generator  # Generates synthetic inputs
    
    def train_step(self):
        # Generate synthetic data
        z = torch.randn(batch_size, latent_dim)
        synthetic_x = self.generator(z)
        
        # Get teacher's response
        with torch.no_grad():
            teacher_out = self.teacher(synthetic_x)
        
        # Train student to match
        student_out = self.student(synthetic_x)
        loss = kl_divergence(student_out, teacher_out)
        
        # Also train generator to create hard examples
        # (where teacher is confident but student struggles)
        ...
```

### 4. Multi-Teacher Distillation

Learn from multiple experts:

```python
def multi_teacher_loss(student_out, teacher_outputs, weights=None):
    """
    Combine knowledge from multiple teachers
    """
    if weights is None:
        weights = [1.0 / len(teacher_outputs)] * len(teacher_outputs)
    
    total_loss = 0
    for teacher_out, weight in zip(teacher_outputs, weights):
        loss = kl_divergence(student_out, teacher_out)
        total_loss += weight * loss
    
    return total_loss

# Example: Ensemble of specialized teachers
teacher_math = load_teacher("math_expert")
teacher_code = load_teacher("code_expert")
teacher_writing = load_teacher("writing_expert")

loss = multi_teacher_loss(
    student(x),
    [teacher_math(x), teacher_code(x), teacher_writing(x)],
    weights=[0.4, 0.4, 0.2]  # Weighted by importance
)
```

---

## 🌍 Real-World Use Cases

### 1. Mobile Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                 MOBILE DEPLOYMENT                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Server: BERT-Large (340M params)                           │
│          - High accuracy                                     │
│          - 4GB memory                                        │
│          - 500ms latency                                     │
│                                                              │
│            │ Distillation                                   │
│            ▼                                                 │
│                                                              │
│  Mobile: DistilBERT (66M params)                            │
│          - 97% accuracy retained                            │
│          - 200MB memory                                      │
│          - 50ms latency                                      │
│          - Works offline!                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. LLM Compression

| Model | Teacher | Student | Performance |
|-------|---------|---------|-------------|
| GPT-4 → GPT-4-Turbo | 1.8T | ~200B | 95%+ |
| Llama-70B → Llama-8B | 70B | 8B | 90%+ |
| BERT → DistilBERT | 340M | 66M | 97% |
| T5-XXL → T5-Small | 11B | 60M | 85% |

### 3. Edge AI

```python
# Example: On-device image classification
# Original: ResNet-152 (60M params, 232MB)
# Distilled: MobileNetV3-Small (2.5M params, 10MB)

# Works on:
# - Smartphones
# - IoT devices
# - Embedded systems
# - Drones
```

---

## 🛠️ Hands-On Project

### Project: Distill BERT for Sentiment Analysis

```python
"""
Project: Distill BERT into a Tiny Classifier
Real-world sentiment analysis with 10x compression
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import (
    BertForSequenceClassification,
    BertTokenizer,
    DistilBertForSequenceClassification,
    DistilBertTokenizer
)
from torch.utils.data import DataLoader, Dataset
from datasets import load_dataset
from tqdm import tqdm

# ============================================
# DATA PREPARATION
# ============================================

class SentimentDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=128):
        self.encodings = tokenizer(
            texts,
            truncation=True,
            padding='max_length',
            max_length=max_length,
            return_tensors='pt'
        )
        self.labels = torch.tensor(labels)
    
    def __len__(self):
        return len(self.labels)
    
    def __getitem__(self, idx):
        return {
            'input_ids': self.encodings['input_ids'][idx],
            'attention_mask': self.encodings['attention_mask'][idx],
            'labels': self.labels[idx]
        }


def load_imdb_data(tokenizer, max_samples=5000):
    """Load IMDB sentiment dataset"""
    dataset = load_dataset('imdb')
    
    train_texts = dataset['train']['text'][:max_samples]
    train_labels = dataset['train']['label'][:max_samples]
    test_texts = dataset['test']['text'][:1000]
    test_labels = dataset['test']['label'][:1000]
    
    train_dataset = SentimentDataset(train_texts, train_labels, tokenizer)
    test_dataset = SentimentDataset(test_texts, test_labels, tokenizer)
    
    return train_dataset, test_dataset


# ============================================
# TINY STUDENT MODEL
# ============================================

class TinyBERT(nn.Module):
    """
    Very small student model
    Only 2M parameters vs BERT's 110M
    """
    def __init__(self, vocab_size=30522, hidden_size=128, num_layers=2, num_classes=2):
        super().__init__()
        
        self.embedding = nn.Embedding(vocab_size, hidden_size)
        self.position_embedding = nn.Embedding(512, hidden_size)
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_size,
            nhead=4,
            dim_feedforward=hidden_size * 4,
            dropout=0.1,
            batch_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_size, num_classes)
        )
    
    def forward(self, input_ids, attention_mask=None):
        batch_size, seq_len = input_ids.shape
        
        # Embeddings
        positions = torch.arange(seq_len, device=input_ids.device).unsqueeze(0)
        x = self.embedding(input_ids) + self.position_embedding(positions)
        
        # Create attention mask for transformer
        if attention_mask is not None:
            # Convert to boolean mask (True = ignore)
            src_key_padding_mask = (attention_mask == 0)
        else:
            src_key_padding_mask = None
        
        # Encode
        x = self.encoder(x, src_key_padding_mask=src_key_padding_mask)
        
        # Pool (use [CLS] token, i.e., first token)
        pooled = x[:, 0]
        
        # Classify
        logits = self.classifier(pooled)
        
        return logits


# ============================================
# DISTILLATION TRAINER
# ============================================

class DistillationTrainer:
    def __init__(
        self,
        teacher_model,
        student_model,
        train_loader,
        test_loader,
        temperature=4.0,
        alpha=0.5,
        device='cuda'
    ):
        self.teacher = teacher_model.to(device)
        self.student = student_model.to(device)
        self.train_loader = train_loader
        self.test_loader = test_loader
        self.temperature = temperature
        self.alpha = alpha
        self.device = device
        
        self.teacher.eval()  # Freeze teacher
        
        self.optimizer = torch.optim.AdamW(
            self.student.parameters(),
            lr=2e-4,
            weight_decay=0.01
        )
    
    def distillation_loss(self, student_logits, teacher_logits, labels):
        # Hard loss
        hard_loss = F.cross_entropy(student_logits, labels)
        
        # Soft loss
        soft_student = F.log_softmax(student_logits / self.temperature, dim=1)
        soft_teacher = F.softmax(teacher_logits / self.temperature, dim=1)
        soft_loss = F.kl_div(soft_student, soft_teacher, reduction='batchmean')
        
        # Combined
        loss = self.alpha * hard_loss + (1 - self.alpha) * (self.temperature ** 2) * soft_loss
        
        return loss, hard_loss.item(), soft_loss.item()
    
    def train_epoch(self):
        self.student.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for batch in tqdm(self.train_loader, desc='Training'):
            input_ids = batch['input_ids'].to(self.device)
            attention_mask = batch['attention_mask'].to(self.device)
            labels = batch['labels'].to(self.device)
            
            # Teacher forward (no grad)
            with torch.no_grad():
                teacher_outputs = self.teacher(
                    input_ids=input_ids,
                    attention_mask=attention_mask
                )
                teacher_logits = teacher_outputs.logits
            
            # Student forward
            student_logits = self.student(input_ids, attention_mask)
            
            # Loss
            loss, hard_loss, soft_loss = self.distillation_loss(
                student_logits, teacher_logits, labels
            )
            
            # Backward
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.student.parameters(), 1.0)
            self.optimizer.step()
            
            total_loss += loss.item()
            pred = student_logits.argmax(dim=1)
            correct += (pred == labels).sum().item()
            total += labels.size(0)
        
        return total_loss / len(self.train_loader), correct / total
    
    def evaluate(self, model, name="Model"):
        model.eval()
        correct = 0
        total = 0
        
        with torch.no_grad():
            for batch in self.test_loader:
                input_ids = batch['input_ids'].to(self.device)
                attention_mask = batch['attention_mask'].to(self.device)
                labels = batch['labels'].to(self.device)
                
                if hasattr(model, 'logits'):
                    # HuggingFace model
                    outputs = model(input_ids=input_ids, attention_mask=attention_mask)
                    logits = outputs.logits
                else:
                    # Our custom model
                    logits = model(input_ids, attention_mask)
                
                pred = logits.argmax(dim=1)
                correct += (pred == labels).sum().item()
                total += labels.size(0)
        
        acc = correct / total
        print(f"{name} Accuracy: {acc*100:.2f}%")
        return acc
    
    def train(self, epochs=3):
        print("="*60)
        print("BERT DISTILLATION FOR SENTIMENT ANALYSIS")
        print("="*60)
        
        # Count parameters
        teacher_params = sum(p.numel() for p in self.teacher.parameters())
        student_params = sum(p.numel() for p in self.student.parameters())
        
        print(f"\nTeacher (BERT): {teacher_params:,} parameters")
        print(f"Student (Tiny): {student_params:,} parameters")
        print(f"Compression: {teacher_params/student_params:.1f}x")
        
        # Evaluate teacher
        print("\n--- Teacher Performance ---")
        self.evaluate(self.teacher, "Teacher (BERT)")
        
        # Train student
        print("\n--- Training Student ---")
        for epoch in range(epochs):
            loss, train_acc = self.train_epoch()
            print(f"Epoch {epoch+1}: Loss={loss:.4f}, Train Acc={train_acc*100:.2f}%")
            self.evaluate(self.student, f"Student (Epoch {epoch+1})")
        
        print("\n--- Final Results ---")
        teacher_acc = self.evaluate(self.teacher, "Teacher (BERT)")
        student_acc = self.evaluate(self.student, "Student (Tiny)")
        print(f"\nAccuracy retained: {student_acc/teacher_acc*100:.1f}%")


# ============================================
# MAIN
# ============================================

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Load tokenizer and teacher
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    teacher = BertForSequenceClassification.from_pretrained(
        'textattack/bert-base-uncased-imdb'
    )
    
    # Load data
    train_dataset, test_dataset = load_imdb_data(tokenizer)
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32)
    
    # Create student
    student = TinyBERT(num_classes=2)
    
    # Train
    trainer = DistillationTrainer(
        teacher_model=teacher,
        student_model=student,
        train_loader=train_loader,
        test_loader=test_loader,
        temperature=4.0,
        alpha=0.5,
        device=device
    )
    
    trainer.train(epochs=3)


if __name__ == "__main__":
    main()
```

---

## ⚠️ Common Mistakes

### 1. Wrong Temperature

```python
# ❌ Bad - Temperature too low
loss = distill_loss(student, teacher, T=1.0)  # Soft labels are sharp

# ❌ Bad - Temperature too high
loss = distill_loss(student, teacher, T=100)  # Soft labels are uniform

# ✅ Good - Temperature in sweet spot
loss = distill_loss(student, teacher, T=4.0)  # Good soft label info
```

### 2. Forgetting T² Scaling

```python
# ❌ Bad - No T² scaling (gradients too small)
loss = alpha * hard_loss + (1-alpha) * soft_loss

# ✅ Good - Proper scaling
loss = alpha * hard_loss + (1-alpha) * T**2 * soft_loss
```

### 3. Teacher Not in Eval Mode

```python
# ❌ Bad - Teacher in training mode
teacher.train()  # BatchNorm/Dropout active!

# ✅ Good - Teacher in eval mode
teacher.eval()
with torch.no_grad():
    teacher_output = teacher(x)
```

### 4. Student Too Different from Teacher

```python
# ❌ Bad - Completely different architecture
teacher = ResNet152()  # CNN
student = LSTM()  # RNN - can't transfer well!

# ✅ Good - Similar but smaller
teacher = ResNet152()  # CNN
student = ResNet18()  # Smaller CNN - similar inductive bias
```

---

## 🎯 Interview Questions

### Q1: What is knowledge distillation and why does it work?

**Answer:**
Knowledge distillation transfers knowledge from a large "teacher" model to a small "student" model.

**Why it works:**
1. **Soft labels contain dark knowledge** - The teacher's probability distribution reveals relationships between classes
2. **Richer training signal** - Instead of just "this is a cat", student learns "this is a cat that looks like a tiger"
3. **Regularization effect** - Soft targets prevent overconfident predictions

**Key formula:**
$$\mathcal{L} = \alpha \cdot \mathcal{L}_{hard} + (1-\alpha) \cdot T^2 \cdot \mathcal{L}_{soft}$$

---

### Q2: What is the role of temperature in distillation?

**Answer:**
Temperature ($T$) controls the "softness" of probability distributions:

$$p_i = \frac{e^{z_i/T}}{\sum_j e^{z_j/T}}$$

| T Value | Effect | Information |
|---------|--------|-------------|
| T=1 | Sharp (standard softmax) | Low |
| T=2-10 | Soft | High (recommended) |
| T→∞ | Uniform | None |

**Why we multiply by T²:** Gradients scale as $1/T^2$, so we compensate to maintain gradient magnitude.

---

### Q3: Compare response-based vs feature-based distillation.

**Answer:**

| Aspect | Response-Based | Feature-Based |
|--------|---------------|---------------|
| **What's transferred** | Final outputs | Hidden activations |
| **Complexity** | Simple | More complex |
| **Information** | End behavior | Internal representations |
| **Architecture** | Any | Need matched layers |
| **Performance** | Good | Better |

**When to use:**
- Response-based: Quick experiments, different architectures
- Feature-based: Maximum performance, similar architectures

---

### Q4: How would you distill a 70B LLM to a 7B model?

**Answer:**

```python
# 1. Choose distillation strategy
strategy = "progressive"  # Not direct 70B → 7B

# 2. Progressive distillation
stages = [
    ("70B", "35B"),
    ("35B", "15B"),
    ("15B", "7B")
]

# 3. For each stage
for teacher_size, student_size in stages:
    # Use previous student as new teacher
    teacher = load_model(teacher_size)
    student = initialize_model(student_size)
    
    # Distill with:
    # - Response distillation (logits)
    # - Feature distillation (hidden states)
    # - Attention transfer
    
    # Use large temperature (T=4-10) for LLMs
```

**Key considerations:**
- Progressive is better than direct compression
- Match vocabulary and tokenizer
- Use sequence-level distillation for generation
- Consider data augmentation

---

### Q5: What is self-distillation?

**Answer:**
A model teaches itself without a separate teacher.

**Methods:**
1. **Born-Again Networks:** Train identical architecture multiple times
2. **Multi-Exit:** Later layers teach earlier layers
3. **Past Self:** Current model learns from its own earlier checkpoints

**Benefits:**
- No need for separate teacher
- Improves even without compression
- Acts as regularization

```python
# Multi-exit example
early_exit, mid_exit, final_exit = model(x)
loss = CE(final_exit, labels) + \
       KL(early_exit, final_exit.detach()) + \
       KL(mid_exit, final_exit.detach())
```

---

## 📝 Homework

### Level 1: Basic
1. Explain temperature scaling in your own words
2. Calculate soft labels for logits [5, 2, 1] with T=1, 5, 10
3. List 3 use cases for distillation

### Level 2: Intermediate
1. Implement basic distillation loss function
2. Compare student with/without distillation on MNIST
3. Experiment with different temperatures

### Level 3: Advanced
1. Implement feature-based distillation
2. Add attention transfer to your implementation
3. Distill a BERT model for text classification

### Level 4: Expert
1. Implement progressive distillation
2. Build data-free distillation system
3. Distill a vision model AND deploy on mobile

---

## 🔗 Resources

- [Hinton's Original Paper](https://arxiv.org/abs/1503.02531)
- [DistilBERT Paper](https://arxiv.org/abs/1910.01108)
- [TinyBERT Paper](https://arxiv.org/abs/1909.10351)
- [Knowledge Distillation Survey](https://arxiv.org/abs/2006.05525)
- [HuggingFace Distillation Guide](https://huggingface.co/docs/transformers/distillation)

---

**Next:** [02-Diffusion-Models.md](./02-Diffusion-Models.md) - Diffusion Models and Stable Diffusion
