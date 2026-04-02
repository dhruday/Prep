# 🔥 PyTorch Fundamentals

## 📚 Table of Contents
1. [What is PyTorch?](#-what-is-pytorch)
2. [Tensors](#-tensors)
3. [Tensor Operations](#-tensor-operations)
4. [Autograd (Automatic Differentiation)](#-autograd-automatic-differentiation)
5. [GPU Acceleration](#-gpu-acceleration)
6. [Common Patterns](#-common-patterns)
7. [Building a Simple Neural Network](#-building-a-simple-neural-network)
8. [Mini Project](#-mini-project)
9. [Exercises](#-exercises)

---

## 🎯 What is PyTorch?

```
PyTorch = NumPy + GPU Support + Automatic Differentiation

NumPy:
├── Fast array operations
├── CPU only
├── No automatic gradients
└── Great for general computation

PyTorch:
├── Fast tensor operations (like NumPy)
├── GPU acceleration (NVIDIA CUDA)
├── Automatic differentiation (autograd)
├── Neural network building blocks
└── Industry standard for AI research & production

Why PyTorch over TensorFlow?
├── More Pythonic (feels natural)
├── Dynamic computation graphs
├── Easier debugging
├── Preferred by researchers
├── Growing in industry adoption
└── This course uses PyTorch!
```

### Installation

```bash
# CPU only (smaller, works everywhere)
pip install torch torchvision

# With CUDA (for NVIDIA GPUs)
# Check your CUDA version first: nvidia-smi
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

```python
import torch
print(torch.__version__)
print(f"CUDA available: {torch.cuda.is_available()}")
```

---

## 📦 Tensors

### What is a Tensor?

```
Tensor = Multi-dimensional array (like NumPy array)

Dimension Names:
0D tensor = Scalar      (single number)
1D tensor = Vector      (list of numbers)
2D tensor = Matrix      (table of numbers)
3D tensor = 3D array    (cube of numbers)
nD tensor = n-dimensional array

Examples:
Scalar:   42                    shape: ()
Vector:   [1, 2, 3]             shape: (3,)
Matrix:   [[1,2], [3,4]]        shape: (2, 2)
Image:    [[[R,G,B]...]]        shape: (H, W, 3)
Batch:    [[[[...]...]...]...]  shape: (N, C, H, W)
```

### Creating Tensors

```python
import torch

# From Python data
t1 = torch.tensor([1, 2, 3])
t2 = torch.tensor([[1, 2], [3, 4]])
t3 = torch.tensor([[1.0, 2.0], [3.0, 4.0]])  # Float

print(t1)        # tensor([1, 2, 3])
print(t1.shape)  # torch.Size([3])
print(t1.dtype)  # torch.int64

# From NumPy (shares memory by default!)
import numpy as np
np_arr = np.array([1, 2, 3])
t_from_np = torch.from_numpy(np_arr)
t_copy = torch.tensor(np_arr)  # Makes a copy

# To NumPy
back_to_np = t1.numpy()  # CPU tensor only!

# Creation functions (like NumPy)
zeros = torch.zeros(3, 4)         # 3x4 zeros
ones = torch.ones(2, 3)           # 2x3 ones
rand = torch.rand(2, 3)           # Uniform [0, 1)
randn = torch.randn(2, 3)         # Normal (0, 1)
arange = torch.arange(10)         # [0, 1, ..., 9]
linspace = torch.linspace(0, 1, 5)  # 5 values 0 to 1
eye = torch.eye(3)                # 3x3 identity
full = torch.full((2, 3), 7)      # 2x3 filled with 7

# Specify dtype
t = torch.tensor([1, 2, 3], dtype=torch.float32)
t = torch.zeros(3, 4, dtype=torch.float64)

# Common dtypes:
# torch.float32 (default for neural networks)
# torch.float64 (more precision, slower)
# torch.int64 (integers)
# torch.bool (True/False)
```

### Tensor Properties

```python
t = torch.randn(3, 4, 5)

print(t.shape)      # torch.Size([3, 4, 5])
print(t.size())     # Same as shape
print(t.ndim)       # 3 (number of dimensions)
print(t.numel())    # 60 (total elements: 3*4*5)
print(t.dtype)      # torch.float32
print(t.device)     # cpu (or cuda:0)
print(t.requires_grad)  # False (for autograd)
```

---

## ➕ Tensor Operations

### Basic Operations (Same as NumPy!)

```python
a = torch.tensor([1.0, 2.0, 3.0])
b = torch.tensor([4.0, 5.0, 6.0])

# Arithmetic (element-wise)
a + b      # tensor([5., 7., 9.])
a - b
a * b      # tensor([4., 10., 18.])
a / b
a ** 2     # tensor([1., 4., 9.])

# Functions
torch.sqrt(a)
torch.exp(a)
torch.log(a)
torch.abs(a)
torch.sin(a)

# In-place operations (underscore suffix)
a.add_(b)  # Modifies a directly
a.mul_(2)  # a = a * 2
# Use with caution! Can break autograd.
```

### Matrix Operations

```python
A = torch.tensor([[1, 2], [3, 4]], dtype=torch.float32)
B = torch.tensor([[5, 6], [7, 8]], dtype=torch.float32)

# Element-wise
A * B  # [[5, 12], [21, 32]]

# Matrix multiplication
A @ B           # Preferred
torch.mm(A, B)  # Same for 2D
torch.matmul(A, B)  # Works for any dims

# Result:
# [[19, 22],
#  [43, 50]]

# Batch matrix multiplication
batch_A = torch.randn(10, 3, 4)  # 10 matrices of 3x4
batch_B = torch.randn(10, 4, 5)  # 10 matrices of 4x5
batch_C = torch.bmm(batch_A, batch_B)  # 10 matrices of 3x5
# or: batch_C = batch_A @ batch_B

# Transpose
A.T              # For 2D
A.transpose(0, 1)  # Explicit
A.permute(1, 0)    # Same
```

### Indexing & Slicing (Same as NumPy!)

```python
t = torch.arange(12).reshape(3, 4)
# tensor([[ 0,  1,  2,  3],
#         [ 4,  5,  6,  7],
#         [ 8,  9, 10, 11]])

t[0]         # tensor([0, 1, 2, 3])
t[0, 0]      # tensor(0)
t[:, 0]      # tensor([0, 4, 8])
t[1:3, 1:3]  # tensor([[5, 6], [9, 10]])
t[t > 5]     # tensor([6, 7, 8, 9, 10, 11])
```

### Reshaping

```python
t = torch.arange(12)

# Reshape
t.reshape(3, 4)
t.reshape(3, -1)  # -1 = infer

# View (shares memory, must be contiguous)
t.view(3, 4)
t.view(-1, 4)

# Flatten
t.reshape(3, 4).flatten()

# Add dimension
t.unsqueeze(0)  # (12,) → (1, 12)
t.unsqueeze(1)  # (12,) → (12, 1)
t[None, :]      # Same as unsqueeze(0)

# Remove dimension
t2 = torch.zeros(1, 3, 1, 4)
t2.squeeze()      # (3, 4) - removes all size-1 dims
t2.squeeze(0)     # (3, 1, 4) - removes dim 0 only
```

### Aggregations

```python
t = torch.tensor([[1, 2, 3], [4, 5, 6]], dtype=torch.float32)

# Global
t.sum()     # 21
t.mean()    # 3.5
t.std()     # Standard deviation
t.min()     # 1
t.max()     # 6

# Along axis
t.sum(dim=0)   # tensor([5, 7, 9]) - sum down
t.sum(dim=1)   # tensor([6, 15]) - sum across
t.mean(dim=0)  # tensor([2.5, 3.5, 4.5])

# Keep dimensions
t.sum(dim=1, keepdim=True)  # tensor([[6], [15]])

# Argmax/Argmin
t.argmax()      # 5 (index of max)
t.argmax(dim=1) # tensor([2, 2]) (index per row)
```

---

## 🔥 Autograd (Automatic Differentiation)

**This is the KEY feature that makes PyTorch perfect for deep learning!**

### What is Autograd?

```
Autograd = Automatic computation of gradients

In neural networks:
1. Forward pass: compute output
2. Compute loss
3. Backward pass: compute gradients (∂Loss/∂weights)
4. Update weights

Without autograd: You manually derive and code all gradients (nightmare!)
With autograd: PyTorch does it automatically!
```

### Basic Example

```python
import torch

# Create tensor with gradient tracking
x = torch.tensor([2.0, 3.0], requires_grad=True)

# Perform operations (PyTorch builds computation graph)
y = x ** 2      # y = x²
z = y.sum()     # z = y₀ + y₁ = x₀² + x₁² = 4 + 9 = 13

print(z)  # tensor(13., grad_fn=<SumBackward0>)
# Notice: grad_fn shows how z was computed

# Compute gradients
z.backward()

# Access gradients
print(x.grad)  # tensor([4., 6.])
# ∂z/∂x₀ = 2*x₀ = 2*2 = 4
# ∂z/∂x₁ = 2*x₁ = 2*3 = 6
```

### Computation Graph

```
Autograd builds a graph of operations:

    x = [2, 3]
        │
        ▼
    y = x²  ────── grad_fn: PowBackward
        │
        ▼
    z = sum(y) ─── grad_fn: SumBackward

backward() traverses this graph in reverse to compute gradients.
```

### Gradient Example: Linear Regression

```python
import torch

# Data
X = torch.tensor([[1.0], [2.0], [3.0], [4.0]])
y = torch.tensor([[2.0], [4.0], [6.0], [8.0]])

# Parameters (with gradient tracking)
W = torch.tensor([[0.0]], requires_grad=True)
b = torch.tensor([[0.0]], requires_grad=True)

# Forward pass
predictions = X @ W + b  # y_hat = X*W + b

# Loss (Mean Squared Error)
loss = ((predictions - y) ** 2).mean()

print(f"Initial loss: {loss.item():.4f}")

# Backward pass
loss.backward()

# Gradients are now computed!
print(f"W gradient: {W.grad}")
print(f"b gradient: {b.grad}")

# Update weights (gradient descent step)
learning_rate = 0.01
with torch.no_grad():  # Don't track these operations
    W -= learning_rate * W.grad
    b -= learning_rate * b.grad

# Clear gradients for next iteration
W.grad.zero_()
b.grad.zero_()
```

### Important Autograd Patterns

```python
# 1. requires_grad - Enable gradient tracking
x = torch.randn(3, requires_grad=True)
y = torch.randn(3)  # No gradient by default
y.requires_grad_(True)  # Enable in-place

# 2. .detach() - Stop gradient tracking
x = torch.randn(3, requires_grad=True)
y = x.detach()  # y has no gradient history
# Use when you need tensor values but not gradients

# 3. torch.no_grad() - Disable gradient computation
x = torch.randn(3, requires_grad=True)
with torch.no_grad():
    y = x * 2  # No gradient tracked
# Use for inference (faster, less memory)

# 4. .grad.zero_() - Clear gradients
# Gradients ACCUMULATE by default!
x = torch.randn(3, requires_grad=True)
y = (x ** 2).sum()
y.backward()
print(x.grad)  # First gradients

y = (x ** 2).sum()
y.backward()
print(x.grad)  # Gradients DOUBLED! (accumulated)

# Always zero gradients before next backward:
x.grad.zero_()

# 5. .item() - Get Python scalar
loss = torch.tensor(3.14)
print(loss.item())  # 3.14 (Python float)
```

### Common Mistake: In-place Operations

```python
# This can break autograd!
x = torch.randn(3, requires_grad=True)

# BAD: In-place operation on leaf tensor
# x.add_(1)  # RuntimeError!

# GOOD: Create new tensor
x = x + 1  # OK!

# Or use no_grad context
with torch.no_grad():
    x.add_(1)  # OK, but loses gradient
```

---

## 🚀 GPU Acceleration

### Checking GPU Availability

```python
import torch

# Check if CUDA is available
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
print(f"Number of GPUs: {torch.cuda.device_count()}")

if torch.cuda.is_available():
    print(f"GPU name: {torch.cuda.get_device_name(0)}")
    print(f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
```

### Moving Tensors to GPU

```python
# Create tensor on CPU
cpu_tensor = torch.randn(3, 3)
print(cpu_tensor.device)  # cpu

# Move to GPU
if torch.cuda.is_available():
    gpu_tensor = cpu_tensor.to('cuda')
    # or: gpu_tensor = cpu_tensor.cuda()
    print(gpu_tensor.device)  # cuda:0
    
    # Create directly on GPU
    gpu_tensor2 = torch.randn(3, 3, device='cuda')
    
    # Move back to CPU
    back_to_cpu = gpu_tensor.to('cpu')
    # or: back_to_cpu = gpu_tensor.cpu()

# Device-agnostic code (recommended!)
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

tensor = torch.randn(3, 3).to(device)
```

### GPU Memory Management

```python
# Check GPU memory
print(f"Allocated: {torch.cuda.memory_allocated() / 1e6:.2f} MB")
print(f"Cached: {torch.cuda.memory_reserved() / 1e6:.2f} MB")

# Clear cache
torch.cuda.empty_cache()

# Common error: "CUDA out of memory"
# Solutions:
# 1. Reduce batch size
# 2. Use gradient checkpointing
# 3. Use mixed precision (fp16)
# 4. Delete tensors: del tensor; torch.cuda.empty_cache()
```

### Speed Comparison

```python
import torch
import time

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
size = 10000

# CPU
A_cpu = torch.randn(size, size)
B_cpu = torch.randn(size, size)

start = time.time()
C_cpu = A_cpu @ B_cpu
cpu_time = time.time() - start

# GPU
if torch.cuda.is_available():
    A_gpu = A_cpu.to('cuda')
    B_gpu = B_cpu.to('cuda')
    
    # Warm up (first operation is slower)
    _ = A_gpu @ B_gpu
    torch.cuda.synchronize()  # Wait for GPU to finish
    
    start = time.time()
    C_gpu = A_gpu @ B_gpu
    torch.cuda.synchronize()
    gpu_time = time.time() - start
    
    print(f"CPU time: {cpu_time:.4f}s")
    print(f"GPU time: {gpu_time:.4f}s")
    print(f"Speedup: {cpu_time / gpu_time:.1f}x")
```

---

## 🔧 Common Patterns

### Pattern 1: Device-Agnostic Code

```python
import torch

# Always use this pattern!
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Create tensors on device
X = torch.randn(100, 10).to(device)
W = torch.randn(10, 5, requires_grad=True, device=device)

# Operations happen on same device
y = X @ W
```

### Pattern 2: Seed for Reproducibility

```python
import torch
import numpy as np
import random

def set_seed(seed=42):
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)
    random.seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

set_seed(42)
```

### Pattern 3: Efficient Data Type

```python
# Use float32 for most ML (faster on GPU)
x = torch.randn(100, 100, dtype=torch.float32)

# Use float16 for large models (saves memory)
x_half = x.half()  # or x.to(torch.float16)

# Automatic mixed precision (best of both)
# (Covered in later weeks)
```

### Pattern 4: Gradient Clipping

```python
# Prevent exploding gradients
loss.backward()

# Clip gradients
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

optimizer.step()
```

---

## 🧠 Building a Simple Neural Network

```python
import torch
import torch.nn as nn

# ============================================
# METHOD 1: Using nn.Module (Recommended!)
# ============================================

class SimpleNN(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super().__init__()
        self.layer1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.layer2 = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        return x

# Create model
model = SimpleNN(input_size=784, hidden_size=128, output_size=10)

# Move to GPU if available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)

# Forward pass
x = torch.randn(32, 784).to(device)  # Batch of 32
output = model(x)
print(f"Output shape: {output.shape}")  # (32, 10)

# ============================================
# METHOD 2: Using nn.Sequential (Quick & Simple)
# ============================================

model = nn.Sequential(
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Linear(128, 64),
    nn.ReLU(),
    nn.Linear(64, 10)
).to(device)

output = model(x)
print(f"Output shape: {output.shape}")  # (32, 10)

# ============================================
# TRAINING LOOP PREVIEW
# ============================================

# Loss function and optimizer
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# Fake data
X = torch.randn(100, 784).to(device)
y = torch.randint(0, 10, (100,)).to(device)

# Training step
model.train()
optimizer.zero_grad()        # Clear gradients
output = model(X)            # Forward pass
loss = criterion(output, y)  # Compute loss
loss.backward()              # Backward pass
optimizer.step()             # Update weights

print(f"Loss: {loss.item():.4f}")
```

---

## 🎯 Mini Project: Complete Training Pipeline

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# ============================================
# CONFIGURATION
# ============================================

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

BATCH_SIZE = 32
EPOCHS = 10
LEARNING_RATE = 0.001

# ============================================
# CREATE SYNTHETIC DATA
# ============================================

# Binary classification: x1 + x2 > 0 → class 1
torch.manual_seed(42)

n_samples = 1000
X = torch.randn(n_samples, 2)
y = ((X[:, 0] + X[:, 1]) > 0).long()

# Split into train/test
split = int(0.8 * n_samples)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

# Create DataLoaders
train_dataset = TensorDataset(X_train, y_train)
test_dataset = TensorDataset(X_test, y_test)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE)

print(f"Train samples: {len(train_dataset)}")
print(f"Test samples: {len(test_dataset)}")

# ============================================
# DEFINE MODEL
# ============================================

class BinaryClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(2, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 2)
        )
    
    def forward(self, x):
        return self.layers(x)

model = BinaryClassifier().to(device)
print(model)

# Count parameters
total_params = sum(p.numel() for p in model.parameters())
print(f"Total parameters: {total_params}")

# ============================================
# TRAINING
# ============================================

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0
    correct = 0
    total = 0
    
    for X_batch, y_batch in loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)
        
        optimizer.zero_grad()
        outputs = model(X_batch)
        loss = criterion(outputs, y_batch)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        _, predicted = torch.max(outputs, 1)
        correct += (predicted == y_batch).sum().item()
        total += y_batch.size(0)
    
    return total_loss / len(loader), correct / total

def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for X_batch, y_batch in loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            
            total_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == y_batch).sum().item()
            total += y_batch.size(0)
    
    return total_loss / len(loader), correct / total

# Training loop
print("\n" + "="*50)
print("TRAINING")
print("="*50)

for epoch in range(EPOCHS):
    train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
    test_loss, test_acc = evaluate(model, test_loader, criterion, device)
    
    print(f"Epoch {epoch+1:2d}/{EPOCHS} | "
          f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} | "
          f"Test Loss: {test_loss:.4f}, Test Acc: {test_acc:.4f}")

# ============================================
# SAVE & LOAD MODEL
# ============================================

# Save
torch.save(model.state_dict(), 'model.pth')
print("\n✅ Model saved to 'model.pth'")

# Load
loaded_model = BinaryClassifier().to(device)
loaded_model.load_state_dict(torch.load('model.pth'))
loaded_model.eval()
print("✅ Model loaded")

# ============================================
# INFERENCE
# ============================================

print("\n" + "="*50)
print("INFERENCE")
print("="*50)

# Test on new data
test_points = torch.tensor([
    [1.0, 1.0],   # Clearly positive (1+1 > 0)
    [-1.0, -1.0], # Clearly negative (-1-1 < 0)
    [0.5, -0.3],  # Edge case
]).to(device)

with torch.no_grad():
    outputs = loaded_model(test_points)
    probabilities = torch.softmax(outputs, dim=1)
    predictions = torch.argmax(outputs, dim=1)

for i, (point, pred, prob) in enumerate(zip(test_points, predictions, probabilities)):
    print(f"Point {point.cpu().numpy()} → Class {pred.item()} (prob: {prob[pred].item():.4f})")

print("\n✅ Mini project complete!")
```

---

## 📝 Exercises

### Exercise 1: Tensor Basics
```python
# Create these tensors:
# 1. 3x3 tensor of random floats in [0, 1)
# 2. 4x4 tensor filled with 5.0
# 3. 2x3 tensor from numpy array [[1,2,3], [4,5,6]]
# 4. Tensor [0, 0.25, 0.5, 0.75, 1.0] using linspace
```

### Exercise 2: Autograd
```python
# Compute gradients for:
# 1. f(x) = x³ at x=3 (expected: 27)
# 2. f(x,y) = x²y + y³ at x=2, y=3 (expected: ∂f/∂x=12, ∂f/∂y=31)
# 3. f(x) = sin(x) at x=π/4
```

### Exercise 3: GPU Practice
```python
# 1. Check if CUDA is available
# 2. Create a 1000x1000 random tensor on GPU
# 3. Perform matrix multiplication
# 4. Move result back to CPU and convert to NumPy
# 5. Print execution time for CPU vs GPU
```

### Exercise 4: Neural Network
```python
# Build a neural network that:
# 1. Takes 10-dimensional input
# 2. Has 2 hidden layers (64 and 32 units)
# 3. Uses ReLU activation
# 4. Outputs 3 classes
# 5. Count total parameters
```

### Exercise 5: Training Loop
```python
# Modify the mini project to:
# 1. Add a learning rate scheduler
# 2. Add early stopping (stop if val loss doesn't improve for 3 epochs)
# 3. Save the best model (lowest val loss)
# 4. Plot training and validation loss curves
```

---

## ✅ Checkpoint

Before proceeding, ensure you can:

- [ ] Create tensors using various methods
- [ ] Perform element-wise and matrix operations
- [ ] Understand `shape`, `dtype`, `device`
- [ ] Use indexing and slicing
- [ ] Reshape tensors: `reshape()`, `view()`, `squeeze()`, `unsqueeze()`
- [ ] Enable gradient tracking with `requires_grad=True`
- [ ] Compute gradients with `.backward()`
- [ ] Use `torch.no_grad()` for inference
- [ ] Move tensors between CPU and GPU
- [ ] Build simple neural networks with `nn.Module`
- [ ] Write a basic training loop

**Next:** [04-Environment-Setup.md](./04-Environment-Setup.md)
