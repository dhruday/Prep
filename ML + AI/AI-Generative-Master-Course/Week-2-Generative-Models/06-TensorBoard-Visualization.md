# 06 - TensorBoard: Visualization & Debugging

---

## Table of Contents

1. [Beginner Explanation](#beginner-explanation)
2. [Why TensorBoard?](#why-tensorboard)
3. [Installation & Setup](#installation--setup)
4. [Core Features](#core-features)
   - [Scalars](#scalars)
   - [Images](#images)
   - [Histograms](#histograms)
   - [Graphs](#graphs)
   - [Embeddings](#embeddings)
   - [Hyperparameters](#hyperparameters)
5. [TensorBoard with PyTorch](#tensorboard-with-pytorch)
6. [TensorBoard with TensorFlow/Keras](#tensorboard-with-tensorflowkeras)
7. [Advanced Features](#advanced-features)
8. [Mini Project: GAN Training Dashboard](#mini-project-gan-training-dashboard)
9. [Homework](#homework)
10. [Common Mistakes](#common-mistakes)
11. [Interview Questions & Answers](#interview-questions--answers)

---

## Beginner Explanation

### The Airplane Dashboard Analogy

Imagine you're flying an airplane **blindfolded**:

```
┌─────────────────────────────────────────────────────────────────────┐
│              TRAINING ML WITHOUT TENSORBOARD                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   You: "Train the model!"                                           │
│                                                                      │
│   Model: *training...*                                              │
│                                                                      │
│   You: "How's it going?"                                            │
│                                                                      │
│   Model: "Loss = 0.342"                                             │
│                                                                      │
│   You: "Is that... good? Bad? Getting better?"                      │
│                                                                      │
│   Model: "¯\_(ツ)_/¯"                                               │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  Epoch 1: Loss = 2.341                                     │    │
│   │  Epoch 2: Loss = 1.892                                     │    │
│   │  Epoch 3: Loss = 1.456                                     │    │
│   │  Epoch 4: Loss = 1.203                                     │    │
│   │  Epoch 5: Loss = 0.987                                     │    │
│   │  Epoch 6: Loss = 0.876                                     │    │
│   │  Epoch 7: Loss = 0.812                                     │    │
│   │  Epoch 8: Loss = 0.799     ← Is this a plateau?           │    │
│   │  Epoch 9: Loss = 0.792     ← Or just slow progress?       │    │
│   │  ...                                                       │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   IMPOSSIBLE to debug from text!                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              TRAINING ML WITH TENSORBOARD                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   📊 REAL-TIME DASHBOARD                                            │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │   Loss                                                      │   │
│   │   ▲                                                         │   │
│   │   │ ●                                                       │   │
│   │ 2 │  ●                                                      │   │
│   │   │   ●                                                     │   │
│   │   │    ●                                                    │   │
│   │ 1 │     ●●                                                  │   │
│   │   │       ●●●●●●●●●●● ← Clear plateau!                     │   │
│   │   │                    Need to adjust learning rate!        │   │
│   │ 0 └─────────────────────────────────────────────────▶       │   │
│   │     0         50        100       150       Epoch           │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   + See model architecture                                          │
│   + Watch generated images evolve                                   │
│   + Compare different experiments                                   │
│   + Profile performance bottlenecks                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### What TensorBoard Shows

```
┌─────────────────────────────────────────────────────────────────────┐
│              TENSORBOARD TABS                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┬──────────┬──────────┬──────────┬──────────┐         │
│   │ SCALARS  │  IMAGES  │  GRAPHS  │  HISTO   │  EMBED   │         │
│   └──────────┴──────────┴──────────┴──────────┴──────────┘         │
│                                                                      │
│   SCALARS:    Loss, accuracy, learning rate over time              │
│   IMAGES:     Generated images, input samples, attention maps      │
│   GRAPHS:     Model architecture visualization                     │
│   HISTOGRAMS: Weight/gradient distributions over training          │
│   EMBEDDINGS: 3D visualization of learned representations          │
│   HPARAMS:    Compare experiments with different settings          │
│   PROFILER:   Find performance bottlenecks                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why TensorBoard?

### Problems It Solves

| Problem | Without TensorBoard | With TensorBoard |
|---------|---------------------|------------------|
| Is training working? | Print loss numbers | See visual trend |
| Overfitting? | Compare train/val manually | See gap visually |
| Model architecture | Read code | Interactive graph |
| Generated quality | Save files, open manually | Real-time gallery |
| Which experiment best? | Compare logs | Side-by-side charts |
| Vanishing gradients? | No idea | Histogram of gradients |
| Learning rate? | Guess | See effect immediately |

### Real-World Importance

```
┌─────────────────────────────────────────────────────────────────────┐
│              WHY PROFESSIONALS USE TENSORBOARD                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   1. DEBUGGING                                                       │
│      - Loss going up? See exactly when it started                   │
│      - NaN values? Check gradient histograms                        │
│      - Mode collapse in GANs? Watch generated images                │
│                                                                      │
│   2. EXPERIMENTATION                                                 │
│      - Compare 50 hyperparameter combinations                       │
│      - Find best learning rate, batch size, architecture           │
│      - Document what worked and what didn't                        │
│                                                                      │
│   3. COMMUNICATION                                                   │
│      - Show stakeholders training progress                          │
│      - Prove model is improving                                     │
│      - Export beautiful charts for reports                          │
│                                                                      │
│   4. PRODUCTION MONITORING                                           │
│      - Track model drift                                            │
│      - Monitor inference latency                                    │
│      - Alert on anomalies                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Installation & Setup

### Installation

```bash
# For PyTorch users
pip install tensorboard torch

# For TensorFlow users
pip install tensorboard tensorflow

# Standalone
pip install tensorboard
```

### Starting TensorBoard

```bash
# Basic usage
tensorboard --logdir=runs

# Specify port
tensorboard --logdir=runs --port=6007

# Bind to all interfaces (for remote access)
tensorboard --logdir=runs --host=0.0.0.0

# Multiple experiment directories
tensorboard --logdir=exp1:./runs/exp1,exp2:./runs/exp2
```

### Project Structure

```
my_project/
├── train.py
├── model.py
├── runs/                          # TensorBoard logs
│   ├── experiment_1/
│   │   └── events.out.tfevents.1234567890.hostname
│   ├── experiment_2/
│   │   └── events.out.tfevents.1234567891.hostname
│   └── gan_training_2024_01_15/
│       ├── Generator/
│       ├── Discriminator/
│       └── events.out.tfevents...
```

---

## Core Features

### Scalars

Track numerical values over time:

```python
from torch.utils.tensorboard import SummaryWriter

# Create writer
writer = SummaryWriter('runs/experiment_1')

# Log scalars during training
for epoch in range(100):
    train_loss = train_one_epoch()
    val_loss = validate()
    accuracy = compute_accuracy()
    
    # Log multiple scalars
    writer.add_scalar('Loss/train', train_loss, epoch)
    writer.add_scalar('Loss/validation', val_loss, epoch)
    writer.add_scalar('Accuracy/train', accuracy, epoch)
    
    # Log learning rate
    writer.add_scalar('Learning Rate', optimizer.param_groups[0]['lr'], epoch)

writer.close()
```

**Visual Result:**
```
┌──────────────────────────────────────────────────────────────┐
│  Loss/train ─────  Loss/validation ─────                     │
│                                                              │
│  ▲                                                           │
│  │ ●                                                         │
│  │  ●●                                                       │
│2 │    ●●              ← Training loss decreasing            │
│  │      ●●●                                                  │
│  │         ●●●●●                                             │
│1 │              ●●●●●●●●●        ← Validation plateaus      │
│  │                      ●────────── (overfitting starts!)    │
│  │                                                           │
│0 └─────────────────────────────────────────────▶ Epoch      │
│   0         25        50        75       100                 │
└──────────────────────────────────────────────────────────────┘
```

### Images

Log images to see what your model is producing:

```python
import torchvision
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter('runs/gan_training')

# Log single image
# image shape: [C, H, W] with values in [0, 1]
writer.add_image('Generated/sample', generated_image, step)

# Log multiple images as grid
# images shape: [N, C, H, W]
grid = torchvision.utils.make_grid(generated_images, nrow=8, normalize=True)
writer.add_image('Generated/grid', grid, step)

# Log with different formats
writer.add_image('Input/original', input_image, step, dataformats='CHW')
writer.add_image('Heatmap', attention_map, step, dataformats='HW')

# For GAN training - log both real and fake
writer.add_images('Real Images', real_batch, step)
writer.add_images('Fake Images', fake_batch, step)
```

**Visual Result:**
```
┌──────────────────────────────────────────────────────────────┐
│  Generated/grid                                              │
│                                                              │
│  Step 0:        Step 1000:      Step 5000:     Step 10000:  │
│  ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐    │
│  │░░░░░░░░│     │▓▓░░▓▓░░│     │▓█▓░▓█▓░│     │ 🎨 🖼️ │    │
│  │░░░░░░░░│     │░░▓▓░░▓▓│     │░▓█▓░▓█▓│     │  Real  │    │
│  │░░░░░░░░│     │▓▓░░▓▓░░│     │▓█▓░▓█▓░│     │ Images │    │
│  │░░░░░░░░│     │░░▓▓░░▓▓│     │░▓█▓░▓█▓│     │  Now!  │    │
│  └────────┘     └────────┘     └────────┘     └────────┘    │
│   (noise)       (patterns)     (structures)   (realistic!)  │
│                                                              │
│  ← Drag slider to see evolution over training →             │
└──────────────────────────────────────────────────────────────┘
```

### Histograms

Visualize distributions of weights and gradients:

```python
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter('runs/training')

for epoch in range(100):
    # ... training code ...
    
    # Log weight distributions
    for name, param in model.named_parameters():
        writer.add_histogram(f'Weights/{name}', param.data, epoch)
        
        if param.grad is not None:
            writer.add_histogram(f'Gradients/{name}', param.grad, epoch)
    
    # Log activations
    writer.add_histogram('Activations/layer1', activations['layer1'], epoch)
```

**Visual Result:**
```
┌──────────────────────────────────────────────────────────────┐
│  Weights/layer1.weight                                       │
│                                                              │
│  Epoch 0:        Epoch 50:        Epoch 100:                │
│       ▲               ▲                ▲                     │
│       │               │               ╱ ╲                    │
│       │              ╱╲             ╱   ╲                   │
│      ╱╲            ╱  ╲           ╱     ╲                  │
│    ╱    ╲        ╱    ╲         ╱       ╲                 │
│  ──────────    ──────────     ──────────                    │
│  -0.1  0  0.1  -0.2  0  0.2   -0.3  0  0.3                 │
│                                                              │
│  ← Weights spread out as training progresses →              │
│                                                              │
│  🚨 WARNING SIGNS:                                          │
│  - Weights going to 0 = vanishing gradients                 │
│  - Weights exploding = need gradient clipping               │
│  - Bimodal distribution = might be dying ReLU               │
└──────────────────────────────────────────────────────────────┘
```

### Graphs

Visualize your model architecture:

```python
import torch
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter('runs/model_viz')

# Create dummy input matching your model's expected shape
model = MyModel()
dummy_input = torch.randn(1, 3, 224, 224)

# Log the graph
writer.add_graph(model, dummy_input)
writer.close()
```

**Visual Result:**
```
┌──────────────────────────────────────────────────────────────┐
│  Model Graph                                                 │
│                                                              │
│         ┌─────────────┐                                     │
│         │   Input     │                                     │
│         │ [1,3,224,224]│                                     │
│         └──────┬──────┘                                     │
│                │                                             │
│                ▼                                             │
│         ┌─────────────┐                                     │
│         │   Conv2d    │                                     │
│         │ 3→64, 7×7   │                                     │
│         └──────┬──────┘                                     │
│                │                                             │
│         ┌──────┴──────┐                                     │
│         ▼             ▼                                     │
│   ┌──────────┐  ┌──────────┐                               │
│   │ BatchNorm│  │ Skip Conn│                               │
│   └────┬─────┘  └────┬─────┘                               │
│        └──────┬──────┘                                      │
│               ▼                                              │
│         ┌─────────────┐                                     │
│         │    ReLU     │                                     │
│         └─────────────┘                                     │
│              ...                                             │
│                                                              │
│  Click nodes to expand details!                             │
└──────────────────────────────────────────────────────────────┘
```

### Embeddings

Visualize high-dimensional data in 3D:

```python
import torch
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter('runs/embeddings')

# Get embeddings from your model
# embeddings: [N, D] where D is embedding dimension
embeddings = model.get_embeddings(data)

# Labels for coloring
labels = ['cat', 'dog', 'bird', ...]  # or class indices

# Images for visualization (optional)
label_images = dataset.images[:100]

# Log embeddings
writer.add_embedding(
    embeddings,
    metadata=labels,
    label_img=label_images,  # Optional: show images on points
    global_step=epoch,
    tag='Image Embeddings'
)
```

**Visual Result:**
```
┌──────────────────────────────────────────────────────────────┐
│  Embeddings (3D Projection)                                  │
│                                                              │
│              ● ●                                             │
│            ●     ●         ▲▲▲                              │
│          ●   CAT   ●     ▲ DOG ▲                            │
│            ●     ●         ▲▲▲                              │
│              ● ●                     ■ ■                     │
│                                    ■ BIRD ■                  │
│                                      ■ ■                     │
│                                                              │
│  - Similar items cluster together                           │
│  - Different classes separate                               │
│  - Use PCA, t-SNE, or UMAP for projection                  │
│  - Rotate, zoom, search for specific points                 │
└──────────────────────────────────────────────────────────────┘
```

### Hyperparameters

Compare experiments with different settings:

```python
from torch.utils.tensorboard import SummaryWriter
from torch.utils.tensorboard.summary import hparams

# Define hyperparameters for this run
hparams_dict = {
    'learning_rate': 0.001,
    'batch_size': 32,
    'optimizer': 'Adam',
    'hidden_size': 256,
    'dropout': 0.5
}

# Define metrics to track
metrics_dict = {
    'hparam/accuracy': best_accuracy,
    'hparam/loss': final_loss,
    'hparam/f1_score': f1_score
}

# Log hyperparameters
writer = SummaryWriter('runs/hparam_exp_1')
writer.add_hparams(hparams_dict, metrics_dict)
writer.close()
```

**Visual Result:**
```
┌──────────────────────────────────────────────────────────────┐
│  HParams Comparison                                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Experiment   │ LR     │ Batch │ Hidden │ Accuracy │ F1  ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ exp_1        │ 0.001  │ 32    │ 256    │ 0.92    │ 0.89││
│  │ exp_2        │ 0.01   │ 32    │ 256    │ 0.85    │ 0.82││
│  │ exp_3        │ 0.001  │ 64    │ 256    │ 0.94 ✓  │ 0.91││
│  │ exp_4        │ 0.001  │ 64    │ 512    │ 0.93    │ 0.90││
│  │ exp_5        │ 0.0001 │ 64    │ 512    │ 0.88    │ 0.85││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Parallel Coordinates View:                                 │
│                                                              │
│  LR        Batch      Hidden     Accuracy                   │
│  ─────     ─────      ──────     ────────                   │
│  0.01  ─╲            ╱── 512 ──╲                            │
│        ──╳──── 64 ──╳          ──── 0.94                    │
│  0.001 ─╱            ╲── 256 ──╱                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## TensorBoard with PyTorch

### Complete Training Example

```python
"""
Complete PyTorch + TensorBoard Integration
==========================================
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
import torchvision
import torchvision.transforms as transforms
from datetime import datetime


# ============ Model ============

class CNN(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 7 * 7, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, num_classes)
        )
    
    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x


# ============ TensorBoard Logger ============

class TensorBoardLogger:
    """Wrapper for all TensorBoard logging"""
    
    def __init__(self, log_dir=None, comment=''):
        if log_dir is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            log_dir = f'runs/{timestamp}_{comment}'
        
        self.writer = SummaryWriter(log_dir)
        self.step = 0
    
    def log_scalars(self, scalars_dict, step=None):
        """Log multiple scalars at once"""
        step = step if step is not None else self.step
        for name, value in scalars_dict.items():
            self.writer.add_scalar(name, value, step)
    
    def log_images(self, images, tag, step=None, nrow=8):
        """Log a batch of images as grid"""
        step = step if step is not None else self.step
        grid = torchvision.utils.make_grid(images, nrow=nrow, normalize=True)
        self.writer.add_image(tag, grid, step)
    
    def log_histogram(self, model, step=None):
        """Log all weight and gradient histograms"""
        step = step if step is not None else self.step
        for name, param in model.named_parameters():
            self.writer.add_histogram(f'Weights/{name}', param.data, step)
            if param.grad is not None:
                self.writer.add_histogram(f'Gradients/{name}', param.grad, step)
    
    def log_model_graph(self, model, input_shape):
        """Log model architecture"""
        dummy_input = torch.randn(input_shape)
        self.writer.add_graph(model, dummy_input)
    
    def log_embeddings(self, embeddings, labels=None, images=None, tag='embeddings'):
        """Log embeddings for visualization"""
        self.writer.add_embedding(
            embeddings,
            metadata=labels,
            label_img=images,
            tag=tag
        )
    
    def log_hparams(self, hparams, metrics):
        """Log hyperparameters and final metrics"""
        self.writer.add_hparams(hparams, metrics)
    
    def log_text(self, tag, text, step=None):
        """Log text (for notes, configs, etc.)"""
        step = step if step is not None else self.step
        self.writer.add_text(tag, text, step)
    
    def increment_step(self):
        self.step += 1
    
    def close(self):
        self.writer.close()


# ============ Training Loop ============

def train_with_tensorboard():
    # Hyperparameters
    hparams = {
        'learning_rate': 0.001,
        'batch_size': 64,
        'epochs': 10,
        'optimizer': 'Adam'
    }
    
    # Setup
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Data
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    train_dataset = torchvision.datasets.MNIST(
        './data', train=True, download=True, transform=transform
    )
    test_dataset = torchvision.datasets.MNIST(
        './data', train=False, transform=transform
    )
    
    train_loader = DataLoader(
        train_dataset, batch_size=hparams['batch_size'], shuffle=True
    )
    test_loader = DataLoader(
        test_dataset, batch_size=hparams['batch_size']
    )
    
    # Model
    model = CNN().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=hparams['learning_rate'])
    
    # TensorBoard
    logger = TensorBoardLogger(comment='mnist_cnn')
    
    # Log model architecture
    logger.log_model_graph(model, (1, 1, 28, 28))
    
    # Log hyperparameters as text
    hparams_str = '\n'.join([f'{k}: {v}' for k, v in hparams.items()])
    logger.log_text('Hyperparameters', hparams_str, 0)
    
    # Log sample training images
    sample_images, _ = next(iter(train_loader))
    logger.log_images(sample_images[:32], 'Training Samples', 0)
    
    # Training loop
    best_accuracy = 0
    global_step = 0
    
    for epoch in range(hparams['epochs']):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(device), target.to(device)
            
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            
            # Metrics
            running_loss += loss.item()
            _, predicted = output.max(1)
            total += target.size(0)
            correct += predicted.eq(target).sum().item()
            
            # Log every 100 batches
            if batch_idx % 100 == 0:
                logger.log_scalars({
                    'Loss/train_batch': loss.item(),
                    'Accuracy/train_batch': 100. * correct / total
                }, global_step)
                global_step += 1
        
        # Epoch metrics
        train_loss = running_loss / len(train_loader)
        train_acc = 100. * correct / total
        
        # Validation
        model.eval()
        val_loss = 0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for data, target in test_loader:
                data, target = data.to(device), target.to(device)
                output = model(data)
                val_loss += criterion(output, target).item()
                _, predicted = output.max(1)
                val_total += target.size(0)
                val_correct += predicted.eq(target).sum().item()
        
        val_loss /= len(test_loader)
        val_acc = 100. * val_correct / val_total
        best_accuracy = max(best_accuracy, val_acc)
        
        # Log epoch metrics
        logger.log_scalars({
            'Loss/train': train_loss,
            'Loss/validation': val_loss,
            'Accuracy/train': train_acc,
            'Accuracy/validation': val_acc,
            'Learning_Rate': optimizer.param_groups[0]['lr']
        }, epoch)
        
        # Log weight histograms
        logger.log_histogram(model, epoch)
        
        print(f'Epoch {epoch+1}/{hparams["epochs"]} | '
              f'Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | '
              f'Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%')
    
    # Log final hyperparameters comparison
    logger.log_hparams(hparams, {
        'hparam/accuracy': best_accuracy,
        'hparam/final_loss': val_loss
    })
    
    logger.close()
    print(f'\nTensorBoard logs saved. Run: tensorboard --logdir=runs')
    
    return model, best_accuracy


if __name__ == '__main__':
    model, accuracy = train_with_tensorboard()
    print(f'Best accuracy: {accuracy:.2f}%')
```

---

## TensorBoard with TensorFlow/Keras

### Keras Callback

```python
"""
TensorFlow/Keras + TensorBoard Integration
==========================================
"""

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import datetime


# ============ Model ============

def create_model():
    model = keras.Sequential([
        layers.Conv2D(32, 3, activation='relu', input_shape=(28, 28, 1)),
        layers.MaxPooling2D(),
        layers.Conv2D(64, 3, activation='relu'),
        layers.MaxPooling2D(),
        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(10, activation='softmax')
    ])
    return model


# ============ Training with Callbacks ============

def train_with_tensorboard():
    # Load data
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
    x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255
    x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255
    
    # Model
    model = create_model()
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # TensorBoard callback
    log_dir = f"runs/keras_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    tensorboard_callback = keras.callbacks.TensorBoard(
        log_dir=log_dir,
        histogram_freq=1,        # Log weight histograms every epoch
        write_graph=True,        # Log model architecture
        write_images=True,       # Log weight images
        update_freq='epoch',     # Log metrics every epoch
        profile_batch='500,520'  # Profile batches 500-520
    )
    
    # Additional callbacks
    callbacks = [
        tensorboard_callback,
        keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True),
        keras.callbacks.ReduceLROnPlateau(factor=0.5, patience=2)
    ]
    
    # Train
    history = model.fit(
        x_train, y_train,
        epochs=10,
        batch_size=64,
        validation_data=(x_test, y_test),
        callbacks=callbacks
    )
    
    print(f'\nTensorBoard logs saved to: {log_dir}')
    print('Run: tensorboard --logdir=runs')
    
    return model, history


# ============ Custom Metrics with tf.summary ============

def train_with_custom_logging():
    """More control with tf.summary"""
    
    # Setup
    log_dir = f"runs/custom_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    train_summary_writer = tf.summary.create_file_writer(f'{log_dir}/train')
    val_summary_writer = tf.summary.create_file_writer(f'{log_dir}/validation')
    
    # Load data
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
    x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255
    x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255
    
    train_ds = tf.data.Dataset.from_tensor_slices((x_train, y_train)).batch(64)
    test_ds = tf.data.Dataset.from_tensor_slices((x_test, y_test)).batch(64)
    
    # Model
    model = create_model()
    optimizer = keras.optimizers.Adam(0.001)
    loss_fn = keras.losses.SparseCategoricalCrossentropy()
    
    # Metrics
    train_loss = keras.metrics.Mean()
    train_acc = keras.metrics.SparseCategoricalAccuracy()
    val_loss = keras.metrics.Mean()
    val_acc = keras.metrics.SparseCategoricalAccuracy()
    
    # Log model graph
    @tf.function
    def trace_model(x):
        return model(x)
    
    tf.summary.trace_on(graph=True, profiler=True)
    trace_model(tf.zeros((1, 28, 28, 1)))
    with train_summary_writer.as_default():
        tf.summary.trace_export(name="model_trace", step=0)
    
    # Training loop
    for epoch in range(10):
        train_loss.reset_states()
        train_acc.reset_states()
        
        for step, (x_batch, y_batch) in enumerate(train_ds):
            with tf.GradientTape() as tape:
                logits = model(x_batch, training=True)
                loss = loss_fn(y_batch, logits)
            
            gradients = tape.gradient(loss, model.trainable_variables)
            optimizer.apply_gradients(zip(gradients, model.trainable_variables))
            
            train_loss.update_state(loss)
            train_acc.update_state(y_batch, logits)
            
            # Log every 100 steps
            if step % 100 == 0:
                with train_summary_writer.as_default():
                    tf.summary.scalar('batch_loss', loss, step=epoch * 1000 + step)
        
        # Log epoch metrics
        with train_summary_writer.as_default():
            tf.summary.scalar('loss', train_loss.result(), step=epoch)
            tf.summary.scalar('accuracy', train_acc.result(), step=epoch)
            
            # Log weight histograms
            for var in model.trainable_variables:
                tf.summary.histogram(var.name, var, step=epoch)
        
        # Validation
        val_loss.reset_states()
        val_acc.reset_states()
        
        for x_batch, y_batch in test_ds:
            logits = model(x_batch, training=False)
            val_loss.update_state(loss_fn(y_batch, logits))
            val_acc.update_state(y_batch, logits)
        
        with val_summary_writer.as_default():
            tf.summary.scalar('loss', val_loss.result(), step=epoch)
            tf.summary.scalar('accuracy', val_acc.result(), step=epoch)
        
        print(f'Epoch {epoch+1} | '
              f'Train Loss: {train_loss.result():.4f} | '
              f'Train Acc: {train_acc.result():.4f} | '
              f'Val Loss: {val_loss.result():.4f} | '
              f'Val Acc: {val_acc.result():.4f}')
    
    print(f'\nRun: tensorboard --logdir={log_dir}')


if __name__ == '__main__':
    # Option 1: Simple callback
    model, history = train_with_tensorboard()
    
    # Option 2: Custom logging
    # train_with_custom_logging()
```

---

## Advanced Features

### Profiler

Find performance bottlenecks:

```python
import torch
from torch.profiler import profile, ProfilerActivity, tensorboard_trace_handler

# Profile training
with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    schedule=torch.profiler.schedule(
        wait=1,    # Skip first batch
        warmup=1,  # Warmup batch
        active=3   # Profile 3 batches
    ),
    on_trace_ready=tensorboard_trace_handler('./runs/profiler'),
    record_shapes=True,
    profile_memory=True,
    with_stack=True
) as prof:
    for step, (data, target) in enumerate(train_loader):
        if step >= 5:
            break
        
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
        
        prof.step()  # Mark step boundary

# View in TensorBoard: tensorboard --logdir=runs/profiler
```

### Custom Scalars Layout

```python
from torch.utils.tensorboard import SummaryWriter
from tensorboard.plugins.custom_scalars import layout_pb2

writer = SummaryWriter('runs/custom_layout')

# Define custom layout
layout = layout_pb2.Layout(
    category=[
        layout_pb2.Category(
            title='Losses',
            chart=[
                layout_pb2.Chart(
                    title='Training vs Validation',
                    multiline=layout_pb2.MultilineChartContent(
                        tag=[r'Loss/train', r'Loss/validation']
                    )
                ),
            ]
        ),
        layout_pb2.Category(
            title='Accuracy',
            chart=[
                layout_pb2.Chart(
                    title='Training vs Validation',
                    multiline=layout_pb2.MultilineChartContent(
                        tag=[r'Accuracy/.*']  # Regex matching
                    )
                ),
            ]
        ),
    ]
)

writer.add_custom_scalars(layout)
```

### Comparing Multiple Runs

```python
from torch.utils.tensorboard import SummaryWriter

# Run multiple experiments with different settings
experiments = [
    {'lr': 0.001, 'batch_size': 32},
    {'lr': 0.01, 'batch_size': 32},
    {'lr': 0.001, 'batch_size': 64},
    {'lr': 0.001, 'batch_size': 128},
]

for exp in experiments:
    # Create unique run name
    run_name = f"lr{exp['lr']}_bs{exp['batch_size']}"
    writer = SummaryWriter(f'runs/comparison/{run_name}')
    
    # Train with these settings
    model = create_model()
    optimizer = optim.Adam(model.parameters(), lr=exp['lr'])
    train_loader = DataLoader(dataset, batch_size=exp['batch_size'])
    
    for epoch in range(10):
        train_loss, train_acc = train_epoch(model, train_loader, optimizer)
        val_loss, val_acc = validate(model, val_loader)
        
        writer.add_scalar('Loss/train', train_loss, epoch)
        writer.add_scalar('Loss/val', val_loss, epoch)
        writer.add_scalar('Accuracy/train', train_acc, epoch)
        writer.add_scalar('Accuracy/val', val_acc, epoch)
    
    writer.close()

# Now in TensorBoard, you can compare all runs!
```

### Remote TensorBoard

```bash
# On remote server
tensorboard --logdir=runs --host=0.0.0.0 --port=6006

# SSH tunnel from local machine
ssh -L 6006:localhost:6006 user@remote-server

# Access at http://localhost:6006
```

---

## Mini Project: GAN Training Dashboard

```python
"""
Mini Project: Complete GAN Training Dashboard
==============================================
Visualize every aspect of GAN training in TensorBoard
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
import torchvision
import torchvision.transforms as transforms
from datetime import datetime
import numpy as np


# ============ Generator ============

class Generator(nn.Module):
    def __init__(self, latent_dim=100, img_channels=1, features=64):
        super().__init__()
        self.net = nn.Sequential(
            # Input: [B, latent_dim, 1, 1]
            nn.ConvTranspose2d(latent_dim, features * 8, 4, 1, 0, bias=False),
            nn.BatchNorm2d(features * 8),
            nn.ReLU(True),
            # [B, features*8, 4, 4]
            nn.ConvTranspose2d(features * 8, features * 4, 4, 2, 1, bias=False),
            nn.BatchNorm2d(features * 4),
            nn.ReLU(True),
            # [B, features*4, 8, 8]
            nn.ConvTranspose2d(features * 4, features * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(features * 2),
            nn.ReLU(True),
            # [B, features*2, 16, 16]
            nn.ConvTranspose2d(features * 2, features, 4, 2, 1, bias=False),
            nn.BatchNorm2d(features),
            nn.ReLU(True),
            # [B, features, 32, 32]
            nn.ConvTranspose2d(features, img_channels, 4, 2, 1, bias=False),
            nn.Tanh()
            # [B, img_channels, 64, 64]
        )
    
    def forward(self, z):
        return self.net(z)


# ============ Discriminator ============

class Discriminator(nn.Module):
    def __init__(self, img_channels=1, features=64):
        super().__init__()
        self.net = nn.Sequential(
            # Input: [B, img_channels, 64, 64]
            nn.Conv2d(img_channels, features, 4, 2, 1, bias=False),
            nn.LeakyReLU(0.2, inplace=True),
            # [B, features, 32, 32]
            nn.Conv2d(features, features * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(features * 2),
            nn.LeakyReLU(0.2, inplace=True),
            # [B, features*2, 16, 16]
            nn.Conv2d(features * 2, features * 4, 4, 2, 1, bias=False),
            nn.BatchNorm2d(features * 4),
            nn.LeakyReLU(0.2, inplace=True),
            # [B, features*4, 8, 8]
            nn.Conv2d(features * 4, features * 8, 4, 2, 1, bias=False),
            nn.BatchNorm2d(features * 8),
            nn.LeakyReLU(0.2, inplace=True),
            # [B, features*8, 4, 4]
            nn.Conv2d(features * 8, 1, 4, 1, 0, bias=False),
            nn.Sigmoid()
            # [B, 1, 1, 1]
        )
    
    def forward(self, x):
        return self.net(x).view(-1)


# ============ GAN TensorBoard Logger ============

class GANTensorBoardLogger:
    """Specialized logger for GAN training"""
    
    def __init__(self, log_dir=None):
        if log_dir is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            log_dir = f'runs/gan_{timestamp}'
        
        self.writer = SummaryWriter(log_dir)
        self.fixed_noise = None
        self.step = 0
    
    def log_losses(self, d_loss, g_loss, d_real, d_fake, step=None):
        """Log GAN-specific losses"""
        step = step if step is not None else self.step
        
        self.writer.add_scalars('Losses', {
            'Generator': g_loss,
            'Discriminator': d_loss
        }, step)
        
        self.writer.add_scalars('Discriminator Outputs', {
            'Real': d_real,
            'Fake': d_fake
        }, step)
        
        # Mode collapse indicator
        d_ratio = d_fake / (d_real + 1e-8)
        self.writer.add_scalar('D_fake/D_real Ratio', d_ratio, step)
    
    def log_images(self, generator, num_images=64, step=None):
        """Generate and log images"""
        step = step if step is not None else self.step
        
        # Use fixed noise for consistent comparison
        if self.fixed_noise is None:
            device = next(generator.parameters()).device
            self.fixed_noise = torch.randn(num_images, 100, 1, 1, device=device)
        
        generator.eval()
        with torch.no_grad():
            fake_images = generator(self.fixed_noise)
        generator.train()
        
        # Denormalize from [-1, 1] to [0, 1]
        fake_images = (fake_images + 1) / 2
        
        grid = torchvision.utils.make_grid(fake_images, nrow=8, normalize=False)
        self.writer.add_image('Generated Images', grid, step)
    
    def log_real_images(self, real_images, step=0):
        """Log real images for comparison"""
        real_images = (real_images + 1) / 2  # Denormalize
        grid = torchvision.utils.make_grid(real_images[:64], nrow=8)
        self.writer.add_image('Real Images', grid, step)
    
    def log_gradients(self, generator, discriminator, step=None):
        """Log gradient statistics for debugging"""
        step = step if step is not None else self.step
        
        # Generator gradients
        g_grad_norm = 0
        for p in generator.parameters():
            if p.grad is not None:
                g_grad_norm += p.grad.data.norm(2).item() ** 2
        g_grad_norm = g_grad_norm ** 0.5
        
        # Discriminator gradients
        d_grad_norm = 0
        for p in discriminator.parameters():
            if p.grad is not None:
                d_grad_norm += p.grad.data.norm(2).item() ** 2
        d_grad_norm = d_grad_norm ** 0.5
        
        self.writer.add_scalars('Gradient Norms', {
            'Generator': g_grad_norm,
            'Discriminator': d_grad_norm
        }, step)
    
    def log_weight_histograms(self, generator, discriminator, step=None):
        """Log weight distributions"""
        step = step if step is not None else self.step
        
        for name, param in generator.named_parameters():
            self.writer.add_histogram(f'Generator/{name}', param.data, step)
        
        for name, param in discriminator.named_parameters():
            self.writer.add_histogram(f'Discriminator/{name}', param.data, step)
    
    def log_diversity_score(self, generator, num_samples=100, step=None):
        """Log image diversity (mode collapse detection)"""
        step = step if step is not None else self.step
        
        device = next(generator.parameters()).device
        generator.eval()
        
        with torch.no_grad():
            # Generate multiple images
            noise = torch.randn(num_samples, 100, 1, 1, device=device)
            fake_images = generator(noise)
            
            # Compute pairwise distances
            flat = fake_images.view(num_samples, -1)
            distances = torch.cdist(flat, flat)
            
            # Mean pairwise distance (higher = more diverse)
            diversity = distances.mean().item()
        
        generator.train()
        self.writer.add_scalar('Diversity Score', diversity, step)
    
    def log_hparams(self, hparams, final_metrics):
        """Log hyperparameters for comparison"""
        self.writer.add_hparams(hparams, final_metrics)
    
    def close(self):
        self.writer.close()


# ============ Training ============

def train_gan_with_tensorboard():
    # Hyperparameters
    hparams = {
        'latent_dim': 100,
        'lr_g': 0.0002,
        'lr_d': 0.0002,
        'beta1': 0.5,
        'batch_size': 128,
        'epochs': 50,
        'image_size': 64
    }
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Using device: {device}')
    
    # Data (MNIST resized to 64x64)
    transform = transforms.Compose([
        transforms.Resize(hparams['image_size']),
        transforms.ToTensor(),
        transforms.Normalize([0.5], [0.5])  # [-1, 1]
    ])
    
    dataset = torchvision.datasets.MNIST(
        './data', train=True, download=True, transform=transform
    )
    dataloader = DataLoader(
        dataset, batch_size=hparams['batch_size'], shuffle=True, num_workers=2
    )
    
    # Models
    generator = Generator(latent_dim=hparams['latent_dim']).to(device)
    discriminator = Discriminator().to(device)
    
    # Optimizers
    optimizer_g = optim.Adam(
        generator.parameters(), 
        lr=hparams['lr_g'], 
        betas=(hparams['beta1'], 0.999)
    )
    optimizer_d = optim.Adam(
        discriminator.parameters(), 
        lr=hparams['lr_d'], 
        betas=(hparams['beta1'], 0.999)
    )
    
    criterion = nn.BCELoss()
    
    # TensorBoard Logger
    logger = GANTensorBoardLogger()
    
    # Log model architectures
    dummy_noise = torch.randn(1, 100, 1, 1).to(device)
    dummy_img = torch.randn(1, 1, 64, 64).to(device)
    logger.writer.add_graph(generator, dummy_noise)
    logger.writer.add_graph(discriminator, dummy_img)
    
    # Log real images once
    real_batch, _ = next(iter(dataloader))
    logger.log_real_images(real_batch, 0)
    
    # Training loop
    global_step = 0
    
    for epoch in range(hparams['epochs']):
        for batch_idx, (real_images, _) in enumerate(dataloader):
            batch_size = real_images.size(0)
            real_images = real_images.to(device)
            
            # Labels
            real_labels = torch.ones(batch_size, device=device)
            fake_labels = torch.zeros(batch_size, device=device)
            
            # ============ Train Discriminator ============
            discriminator.zero_grad()
            
            # Real images
            d_real_output = discriminator(real_images)
            d_real_loss = criterion(d_real_output, real_labels)
            
            # Fake images
            noise = torch.randn(batch_size, 100, 1, 1, device=device)
            fake_images = generator(noise)
            d_fake_output = discriminator(fake_images.detach())
            d_fake_loss = criterion(d_fake_output, fake_labels)
            
            d_loss = d_real_loss + d_fake_loss
            d_loss.backward()
            optimizer_d.step()
            
            # ============ Train Generator ============
            generator.zero_grad()
            
            g_output = discriminator(fake_images)
            g_loss = criterion(g_output, real_labels)  # Fool discriminator
            
            g_loss.backward()
            optimizer_g.step()
            
            # ============ Logging ============
            if batch_idx % 100 == 0:
                # Log losses
                logger.log_losses(
                    d_loss=d_loss.item(),
                    g_loss=g_loss.item(),
                    d_real=d_real_output.mean().item(),
                    d_fake=d_fake_output.mean().item(),
                    step=global_step
                )
                
                # Log gradients
                logger.log_gradients(generator, discriminator, global_step)
                
                global_step += 1
        
        # End of epoch logging
        logger.log_images(generator, step=epoch)
        logger.log_weight_histograms(generator, discriminator, epoch)
        logger.log_diversity_score(generator, step=epoch)
        
        print(f'Epoch [{epoch+1}/{hparams["epochs"]}] | '
              f'D Loss: {d_loss.item():.4f} | '
              f'G Loss: {g_loss.item():.4f} | '
              f'D(real): {d_real_output.mean().item():.4f} | '
              f'D(fake): {d_fake_output.mean().item():.4f}')
    
    # Log final hyperparameters
    logger.log_hparams(hparams, {
        'hparam/final_d_loss': d_loss.item(),
        'hparam/final_g_loss': g_loss.item()
    })
    
    logger.close()
    
    print('\n' + '='*50)
    print('Training complete!')
    print('Run TensorBoard with: tensorboard --logdir=runs')
    print('='*50)
    
    return generator, discriminator


if __name__ == '__main__':
    generator, discriminator = train_gan_with_tensorboard()
```

**Dashboard Output:**
```
┌──────────────────────────────────────────────────────────────────────┐
│  TensorBoard GAN Dashboard                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ LOSSES                                                       │    │
│  │ ▲                                                            │    │
│  │ │ ╲ Generator                                                │    │
│  │ │  ╲                                                         │    │
│  │ │   ╲╱╲╱╲  ───────── ← Converging                           │    │
│  │ │        ╲╱                                                  │    │
│  │ │ ────────────────── ← Discriminator stable                  │    │
│  │ └─────────────────────────────────────────────────▶ Step    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ GENERATED IMAGES                                             │    │
│  │                                                              │    │
│  │  Epoch 0      Epoch 10     Epoch 30     Epoch 50            │    │
│  │  ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐              │    │
│  │  │░░░░░░│    │▓░▓░▓░│    │ 0 1  │    │ 0 1  │              │    │
│  │  │░░░░░░│ → │░▓░▓░▓│ → │ 2 3  │ → │ 2 3  │ Clear!        │    │
│  │  │░░░░░░│    │▓░▓░▓░│    │ 4 5  │    │ 4 5  │              │    │
│  │  └──────┘    └──────┘    └──────┘    └──────┘              │    │
│  │   noise       shapes     digits      perfect!               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ DIVERSITY SCORE (Mode Collapse Detection)                   │    │
│  │ ▲                                                            │    │
│  │ │       ────────────────────── Good diversity               │    │
│  │ │                                                            │    │
│  │ │                                                            │    │
│  │ │                              ╲─── Mode collapse!          │    │
│  │ └─────────────────────────────────────────────────▶         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Homework

### Level 1: Fundamentals (Beginner)

1. **Setup TensorBoard**
   - Install TensorBoard
   - Create a simple training loop that logs loss
   - View the results in TensorBoard

2. **Log multiple scalars**
   - Training loss, validation loss, accuracy
   - Compare them on the same graph

3. **Log images from a dataset**
   - Show sample training images
   - Create an image grid

### Level 2: Intermediate Implementation

4. **Complete CNN training dashboard**
   - Log all metrics (loss, accuracy, lr)
   - Weight histograms
   - Model graph

5. **Compare multiple experiments**
   - Run 3 experiments with different learning rates
   - Compare them side by side

6. **Implement embedding visualization**
   - Extract features from a trained CNN
   - Visualize with t-SNE/PCA in TensorBoard

### Level 3: Advanced Challenges

7. **Build a custom GAN dashboard**
   - Log G and D losses
   - Generated images every epoch
   - Diversity score for mode collapse detection

8. **Profile a training loop**
   - Use torch.profiler
   - Identify bottlenecks
   - Optimize and compare

9. **Remote TensorBoard**
   - Set up TensorBoard on a remote server
   - Access via SSH tunnel

### Level 4: Production-Level

10. **Hyperparameter sweep dashboard**
    - Run 20+ experiments
    - Log all with HParams
    - Find best configuration

11. **Real-time monitoring system**
    - Log from distributed training
    - Monitor multiple GPUs

12. **Custom plugin**
    - Create a custom TensorBoard plugin
    - Display additional metrics

---

## Common Mistakes

### ❌ Mistake 1: Forgetting to Close Writer

```python
# BAD: Writer not closed, may lose data
writer = SummaryWriter('runs/exp')
for epoch in range(100):
    writer.add_scalar('loss', loss, epoch)
# Missing writer.close()!

# GOOD: Always close the writer
writer = SummaryWriter('runs/exp')
try:
    for epoch in range(100):
        writer.add_scalar('loss', loss, epoch)
finally:
    writer.close()

# BETTER: Use context manager
with SummaryWriter('runs/exp') as writer:
    for epoch in range(100):
        writer.add_scalar('loss', loss, epoch)
```

### ❌ Mistake 2: Wrong Image Format

```python
# BAD: Wrong shape for add_image
image = np.random.rand(224, 224, 3)  # HWC format
writer.add_image('img', image, 0)  # Expects CHW!

# GOOD: Use correct format
image = np.random.rand(3, 224, 224)  # CHW format
writer.add_image('img', image, 0)

# OR specify dataformats
image = np.random.rand(224, 224, 3)  # HWC
writer.add_image('img', image, 0, dataformats='HWC')
```

### ❌ Mistake 3: Image Values Out of Range

```python
# BAD: Values not in [0, 1]
image = torch.randn(3, 64, 64)  # Values in [-3, 3]
writer.add_image('img', image, 0)  # Will look wrong!

# GOOD: Normalize to [0, 1]
image = (image - image.min()) / (image.max() - image.min())
writer.add_image('img', image, 0)

# OR for [-1, 1] range
image = (image + 1) / 2
```

### ❌ Mistake 4: Overwriting Runs

```python
# BAD: Same directory, overwrites previous run
writer = SummaryWriter('runs/experiment')  # Always same name!

# GOOD: Unique directories
from datetime import datetime
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
writer = SummaryWriter(f'runs/experiment_{timestamp}')
```

### ❌ Mistake 5: Too Much Logging

```python
# BAD: Log every single batch (slow!)
for batch_idx, (data, target) in enumerate(dataloader):
    loss = train_step(data, target)
    writer.add_scalar('loss', loss, batch_idx)  # 10000 writes per epoch!

# GOOD: Log periodically
for batch_idx, (data, target) in enumerate(dataloader):
    loss = train_step(data, target)
    if batch_idx % 100 == 0:  # Every 100 batches
        writer.add_scalar('loss', loss, global_step)
        global_step += 1
```

### ❌ Mistake 6: Not Using Flush

```python
# BAD: Long-running training, data not visible immediately
for epoch in range(1000):
    writer.add_scalar('loss', loss, epoch)
    # Data buffers, may not appear for a while

# GOOD: Flush periodically for real-time viewing
for epoch in range(1000):
    writer.add_scalar('loss', loss, epoch)
    if epoch % 10 == 0:
        writer.flush()
```

---

## Interview Questions & Answers

### Q1: What is TensorBoard and why is it important? (Beginner)

**Answer:**

**TensorBoard** is a visualization toolkit for machine learning experimentation.

**Key Features:**
1. **Scalars**: Track metrics (loss, accuracy) over time
2. **Images**: Visualize generated images, attention maps
3. **Graphs**: Model architecture visualization
4. **Histograms**: Weight/gradient distributions
5. **Embeddings**: 3D visualization of high-dimensional data
6. **Profiler**: Performance bottleneck analysis

**Importance:**
- Debug training issues visually
- Compare experiments
- Detect overfitting/underfitting
- Monitor GANs for mode collapse
- Document and share results

---

### Q2: How would you detect overfitting using TensorBoard? (Intermediate)

**Answer:**

**Signs of overfitting in TensorBoard:**

```
Loss/train vs Loss/validation:

▲
│  ●                Training loss keeps dropping
│   ●●
│     ●●●
│        ●●●●●●●●●●●●●●●●●●●●●  ← Training
│          ╲
│           ╲
│            ╲─────────────── ← Validation stops improving
│                 ╱
│                ╱ ← Then starts INCREASING
└─────────────────────────────────────▶ Epoch
```

**What to look for:**
1. Training loss decreasing, validation loss increasing
2. Training accuracy improving, validation accuracy plateauing
3. Large gap between training and validation metrics

**Code to log:**
```python
writer.add_scalars('Loss', {
    'train': train_loss,
    'validation': val_loss
}, epoch)

# Gap metric
writer.add_scalar('Overfitting Gap', train_loss - val_loss, epoch)
```

---

### Q3: How do you use TensorBoard to debug vanishing gradients? (Advanced)

**Answer:**

**Use histogram logging:**

```python
for name, param in model.named_parameters():
    if param.grad is not None:
        writer.add_histogram(f'Gradients/{name}', param.grad, epoch)
        
        # Also log gradient statistics
        writer.add_scalar(f'Grad_mean/{name}', param.grad.mean(), epoch)
        writer.add_scalar(f'Grad_std/{name}', param.grad.std(), epoch)
```

**What to look for:**
1. **Vanishing gradients**: Histogram collapses to 0
2. **Exploding gradients**: Values become huge
3. **Dead neurons**: Gradients stuck at 0

**Healthy vs Unhealthy:**
```
Healthy gradients:         Vanishing gradients:
       ▲                         ▲
      ╱╲                         │
     ╱  ╲                        │
    ╱    ╲                       ████  ← All near 0
───────────────           ───────────────
-0.1  0   0.1              -0.001 0 0.001
```

**Fix indicators:**
- Use BatchNorm (gradients should spread out)
- Try different initialization
- Use residual connections

---

### Q4: How would you detect mode collapse in GANs using TensorBoard? (Advanced)

**Answer:**

**Multiple indicators:**

1. **Visual inspection** - Log generated images:
```python
# Same image repeated = mode collapse
grid = make_grid(generated_images)
writer.add_image('Generated', grid, step)
```

2. **Diversity score** - Pairwise image distance:
```python
def compute_diversity(images):
    flat = images.view(len(images), -1)
    distances = torch.cdist(flat, flat)
    return distances.mean()

diversity = compute_diversity(fake_images)
writer.add_scalar('Diversity', diversity, step)
# If diversity drops → mode collapse
```

3. **D(fake)/D(real) ratio**:
```python
ratio = d_fake.mean() / d_real.mean()
writer.add_scalar('D_ratio', ratio, step)
# If ratio → 1 too quickly, generator might be stuck
```

4. **Loss patterns**:
```
Normal training:           Mode collapse:
G ╲                        G ────────── (flat)
   ╲╱╲╱╲                   
D ─────────                D ─────────
```

---

### Q5: How do you compare hyperparameter experiments? (Intermediate)

**Answer:**

```python
# Run multiple experiments
for lr in [0.001, 0.01, 0.1]:
    for batch_size in [32, 64, 128]:
        run_name = f'lr{lr}_bs{batch_size}'
        writer = SummaryWriter(f'runs/hparam_search/{run_name}')
        
        # Train and get final metrics
        model = train(lr=lr, batch_size=batch_size)
        accuracy = evaluate(model)
        
        # Log hyperparameters
        writer.add_hparams(
            {'lr': lr, 'batch_size': batch_size},
            {'hparam/accuracy': accuracy}
        )
        writer.close()
```

**In TensorBoard:**
- Go to HPARAMS tab
- See table with all experiments
- Parallel coordinates view
- Sort by any metric

---

### Q6: How would you set up TensorBoard for distributed training? (Senior)

**Answer:**

```python
import torch.distributed as dist
from torch.utils.tensorboard import SummaryWriter

def setup_tensorboard_distributed():
    rank = dist.get_rank()
    world_size = dist.get_world_size()
    
    # Only rank 0 logs to avoid conflicts
    if rank == 0:
        writer = SummaryWriter('runs/distributed_training')
    else:
        writer = None
    
    return writer

def log_metrics(writer, metrics, step):
    if writer is not None:
        for name, value in metrics.items():
            # Aggregate across all processes
            tensor = torch.tensor(value).cuda()
            dist.all_reduce(tensor, op=dist.ReduceOp.SUM)
            avg_value = tensor.item() / dist.get_world_size()
            
            writer.add_scalar(name, avg_value, step)

# Usage
writer = setup_tensorboard_distributed()
for epoch in range(100):
    loss = train_epoch()
    log_metrics(writer, {'Loss/train': loss}, epoch)
```

**Best practices:**
- Only rank 0 writes to avoid file conflicts
- Aggregate metrics across ranks
- Use unique run directories per experiment

---

### Q7: How do you profile a training loop with TensorBoard? (Senior)

**Answer:**

```python
from torch.profiler import profile, ProfilerActivity, tensorboard_trace_handler

# Profile setup
profiler = profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    schedule=torch.profiler.schedule(
        wait=1,      # Skip first step
        warmup=1,    # Warmup step
        active=3,    # Profile 3 steps
        repeat=2     # Repeat the cycle
    ),
    on_trace_ready=tensorboard_trace_handler('./runs/profile'),
    record_shapes=True,
    profile_memory=True,
    with_stack=True
)

# Training with profiling
profiler.start()
for step, (data, target) in enumerate(train_loader):
    if step >= 10:
        break
    
    # Training step
    output = model(data)
    loss = criterion(output, target)
    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
    
    profiler.step()  # Signal step boundary

profiler.stop()
```

**What the profiler shows:**
- GPU/CPU utilization timeline
- Memory allocation
- Kernel execution times
- Bottleneck identification

---

### Q8: Debug this TensorBoard code. What's wrong? (Debugging)

```python
writer = SummaryWriter('runs/exp')

for epoch in range(100):
    images = generate_images()  # Returns [B, H, W, C] numpy array
    writer.add_image('generated', images[0], epoch)
    
    loss = compute_loss()
    writer.add_scalars('loss', loss, epoch)
```

**Answer:**

**Issues:**

1. **Wrong image format**: NumPy array in HWC, needs CHW
2. **add_scalars expects a dict**, not single value
3. **Writer not closed**

**Fixed:**
```python
writer = SummaryWriter('runs/exp')

try:
    for epoch in range(100):
        images = generate_images()  # [B, H, W, C]
        
        # Fix 1: Correct format
        img = images[0]  # [H, W, C]
        writer.add_image('generated', img, epoch, dataformats='HWC')
        # OR: img = np.transpose(images[0], (2, 0, 1))  # CHW
        
        loss = compute_loss()
        
        # Fix 2: add_scalar for single value
        writer.add_scalar('loss', loss, epoch)
        # OR for multiple: writer.add_scalars('losses', {'train': loss}, epoch)
        
finally:
    # Fix 3: Always close
    writer.close()
```

---

### Q9: How would you build a real-time training monitor? (FAANG System Design)

**Answer:**

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Training Jobs (GPU Cluster)                                  │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                         │
│   │ Job 1   │ │ Job 2   │ │ Job 3   │                         │
│   │ (A100)  │ │ (A100)  │ │ (A100)  │                         │
│   └────┬────┘ └────┬────┘ └────┬────┘                         │
│        │           │           │                               │
│        └───────────┼───────────┘                               │
│                    │                                           │
│                    ▼                                           │
│   ┌──────────────────────────────┐                            │
│   │   Shared Storage (S3/NFS)    │                            │
│   │   - TensorBoard event files  │                            │
│   │   - Checkpoints              │                            │
│   └──────────────┬───────────────┘                            │
│                  │                                             │
│                  ▼                                             │
│   ┌──────────────────────────────┐                            │
│   │   TensorBoard Server         │                            │
│   │   - Reads from shared storage│                            │
│   │   - Serves web UI            │                            │
│   └──────────────┬───────────────┘                            │
│                  │                                             │
│                  ▼                                             │
│   ┌──────────────────────────────┐                            │
│   │   Alert System               │                            │
│   │   - Loss spike detection     │                            │
│   │   - Training stuck alerts    │                            │
│   │   - Slack/PagerDuty         │                            │
│   └──────────────────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
```python
# Training job logs to shared storage
writer = SummaryWriter(f's3://ml-logs/job_{job_id}')

# Alert system monitors metrics
class AlertMonitor:
    def check_alerts(self, metrics, step):
        if metrics['loss'] > self.loss_threshold:
            self.send_alert(f'Loss spike at step {step}')
        
        if step > 0 and self.last_update > 600:  # 10 min
            self.send_alert('Training may be stuck')
```

---

### Q10: What are alternatives to TensorBoard? (Knowledge)

**Answer:**

| Tool | Pros | Cons |
|------|------|------|
| **TensorBoard** | Free, integrated with TF/PyTorch | Limited collaboration |
| **Weights & Biases** | Cloud, collaboration, sweeps | Paid for teams |
| **MLflow** | Full MLOps, model registry | More complex setup |
| **Neptune** | Team features, integrations | Paid |
| **Comet ML** | Experiment comparison | Paid |
| **Aim** | Open source, fast | Less mature |

**When to use what:**
- **Solo/Learning**: TensorBoard
- **Team/Production**: W&B or MLflow
- **Full MLOps**: MLflow + TensorBoard
- **Open source only**: Aim

---

## Summary

### Key Takeaways

1. **TensorBoard is essential** for ML development
   - Visual debugging beats print statements
   - Compare experiments easily
   - Document and share results

2. **Core features:**
   - Scalars → Metrics over time
   - Images → Visual output
   - Histograms → Weight/gradient distributions
   - Graphs → Model architecture
   - Embeddings → High-D visualization

3. **Best practices:**
   - Always close writers
   - Use unique run directories
   - Log periodically, not every step
   - Flush for real-time viewing

4. **For GANs specifically:**
   - Log both G and D losses
   - Monitor generated images
   - Track diversity score
   - Watch D(real) vs D(fake)

### Quick Reference

```python
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter('runs/experiment')

# Scalars
writer.add_scalar('Loss', loss, step)

# Images
writer.add_image('Sample', image, step)  # [C, H, W]

# Histograms
writer.add_histogram('Weights', weights, step)

# Graph
writer.add_graph(model, input_tensor)

# Hyperparameters
writer.add_hparams(hparams_dict, metrics_dict)

writer.close()
```

---

**Next Up**: `07-Projects-Week2.md` - Complete projects integrating GANs, VAEs, Diffusion Models, and TensorBoard.

Type `CONTINUE` to proceed.
