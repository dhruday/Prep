# 🔧 Common Errors & Solutions

## 📚 Table of Contents
1. [Installation Errors](#-installation-errors)
2. [Import Errors](#-import-errors)
3. [CUDA/GPU Errors](#-cudagpu-errors)
4. [Memory Errors](#-memory-errors)
5. [Training Errors](#-training-errors)
6. [Data Errors](#-data-errors)
7. [Jupyter/Colab Errors](#-jupytercolab-errors)
8. [Quick Reference Table](#-quick-reference-table)

---

## 📦 Installation Errors

### Error: "pip is not recognized"

```
'pip' is not recognized as an internal or external command
```

**Cause:** Python/pip not in system PATH

**Solutions:**

```bash
# Solution 1: Use python -m pip
python -m pip install numpy

# Solution 2: Add to PATH (Windows)
# Search "Environment Variables" > Edit PATH > Add:
# C:\Users\YourName\AppData\Local\Programs\Python\Python311\
# C:\Users\YourName\AppData\Local\Programs\Python\Python311\Scripts\

# Solution 3: Reinstall Python with "Add to PATH" checked
```

---

### Error: "Microsoft Visual C++ required"

```
error: Microsoft Visual C++ 14.0 or greater is required
```

**Cause:** Some packages need C++ compiler on Windows

**Solution:**

```bash
# Install Visual C++ Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Install "Desktop development with C++"

# Or install pre-built wheel
pip install --only-binary :all: package_name
```

---

### Error: "No matching distribution found"

```
ERROR: Could not find a version that satisfies the requirement torch==2.5.0
ERROR: No matching distribution found for torch==2.5.0
```

**Cause:** Package version doesn't exist or wrong Python version

**Solutions:**

```bash
# Check Python version
python --version

# Check available versions
pip index versions torch

# Install without specific version
pip install torch

# Use correct PyTorch install command
# Get from: https://pytorch.org/get-started/locally/
```

---

### Error: "Permission denied"

```
PermissionError: [Errno 13] Permission denied
```

**Cause:** Need admin privileges or file is in use

**Solutions:**

```bash
# Solution 1: Use --user flag
pip install --user package_name

# Solution 2: Use virtual environment (recommended)
python -m venv myenv
source myenv/bin/activate  # or myenv\Scripts\activate on Windows
pip install package_name

# Solution 3: Run as admin (not recommended)
# Windows: Right-click terminal > Run as administrator
# Linux/Mac: sudo pip install (avoid this!)
```

---

## 🔌 Import Errors

### Error: "No module named 'torch'"

```python
ModuleNotFoundError: No module named 'torch'
```

**Cause:** Package not installed or wrong environment

**Solutions:**

```bash
# Install the package
pip install torch

# Check if installed
pip list | grep torch

# Make sure you're in the right environment
which python  # Linux/Mac
where python  # Windows

# Verify installation in Python
python -c "import torch; print(torch.__version__)"
```

---

### Error: "Cannot import name 'X' from 'Y'"

```python
ImportError: cannot import name 'AutoModel' from 'transformers'
```

**Cause:** Wrong package version or incorrect import

**Solutions:**

```python
# Check version
import transformers
print(transformers.__version__)

# Upgrade package
# !pip install --upgrade transformers

# Check correct import path
# Read documentation for your version
```

---

### Error: "DLL load failed" (Windows)

```
ImportError: DLL load failed while importing _C: The specified module could not be found
```

**Cause:** Missing Visual C++ runtime or incompatible versions

**Solutions:**

```bash
# Solution 1: Install Visual C++ Redistributable
# Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe

# Solution 2: Reinstall PyTorch
pip uninstall torch torchvision
pip install torch torchvision

# Solution 3: Use conda (handles DLLs better)
conda install pytorch torchvision -c pytorch
```

---

## 🎮 CUDA/GPU Errors

### Error: "CUDA out of memory"

```python
RuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB
```

**This is the MOST COMMON GPU error!**

**Cause:** Not enough GPU memory for operation

**Solutions:**

```python
# Solution 1: Reduce batch size
batch_size = 8  # Instead of 32

# Solution 2: Clear cache
import torch
torch.cuda.empty_cache()

# Solution 3: Delete unused tensors
del large_tensor
del model_output
torch.cuda.empty_cache()

# Solution 4: Use gradient checkpointing
model.gradient_checkpointing_enable()

# Solution 5: Use mixed precision (fp16)
from torch.cuda.amp import autocast
with autocast():
    output = model(input)

# Solution 6: Move to CPU for inference
model = model.cpu()
input = input.cpu()

# Check memory usage
print(f"Allocated: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
print(f"Reserved: {torch.cuda.memory_reserved() / 1e9:.2f} GB")
```

---

### Error: "CUDA driver version is insufficient"

```
RuntimeError: CUDA driver version is insufficient for CUDA runtime version
```

**Cause:** Mismatch between PyTorch CUDA version and system CUDA driver

**Solutions:**

```bash
# Check your CUDA driver version
nvidia-smi  # Look at "CUDA Version" in top right

# Install PyTorch matching your CUDA version
# If nvidia-smi shows CUDA 11.8:
pip install torch --index-url https://download.pytorch.org/whl/cu118

# If nvidia-smi shows CUDA 12.1:
pip install torch --index-url https://download.pytorch.org/whl/cu121

# Or update NVIDIA drivers
# Download from: https://www.nvidia.com/download/index.aspx
```

---

### Error: "torch.cuda.is_available() returns False"

**Causes & Solutions:**

```python
import torch

# Check 1: Do you have NVIDIA GPU?
# Run in terminal: nvidia-smi
# If command not found → No NVIDIA GPU → Use CPU or Colab

# Check 2: Correct PyTorch version?
print(torch.__version__)
# Should include +cu118 or +cu121 for CUDA support
# If it says +cpu, reinstall with CUDA:
# pip install torch --index-url https://download.pytorch.org/whl/cu118

# Check 3: CUDA toolkit version match?
print(torch.version.cuda)  # Should show CUDA version

# Check 4: WSL2 without GPU passthrough?
# Enable GPU in WSL: 
# https://docs.microsoft.com/en-us/windows/wsl/tutorials/gpu-compute
```

---

### Error: "CUBLAS_STATUS_NOT_INITIALIZED"

```python
RuntimeError: CUBLAS_STATUS_NOT_INITIALIZED
```

**Cause:** CUDA context issue, often after forking processes

**Solutions:**

```python
# Solution 1: Set multiprocessing start method
import torch.multiprocessing as mp
mp.set_start_method('spawn', force=True)

# Solution 2: Initialize CUDA before multiprocessing
torch.cuda.init()

# Solution 3: Set environment variable
import os
os.environ['CUDA_LAUNCH_BLOCKING'] = '1'
```

---

## 💾 Memory Errors

### Error: "Killed" (Linux) or process terminates suddenly

**Cause:** System ran out of RAM (not GPU RAM!)

**Solutions:**

```python
# Check available RAM
import psutil
print(f"Available RAM: {psutil.virtual_memory().available / 1e9:.2f} GB")

# Solution 1: Process data in chunks
chunk_size = 1000
for i in range(0, len(data), chunk_size):
    chunk = data[i:i+chunk_size]
    process(chunk)

# Solution 2: Use generators instead of lists
def data_generator(file_path):
    with open(file_path) as f:
        for line in f:
            yield process_line(line)

# Solution 3: Delete unused variables
del large_dataframe
import gc
gc.collect()

# Solution 4: Use memory-efficient data types
import numpy as np
arr = np.array(data, dtype=np.float32)  # Instead of float64
```

---

### Error: "Unable to allocate X GiB for array"

```python
MemoryError: Unable to allocate 8.00 GiB for an array with shape (1000000000,)
```

**Cause:** Trying to create array larger than available RAM

**Solutions:**

```python
# Solution 1: Use smaller data type
arr = np.zeros(1000000, dtype=np.float32)  # 4 bytes instead of 8

# Solution 2: Use memory-mapped arrays
arr = np.memmap('data.dat', dtype='float32', mode='w+', shape=(1000000,))

# Solution 3: Process in batches
for batch in data_loader:
    process(batch)
    
# Solution 4: Use pandas with chunks
for chunk in pd.read_csv('large_file.csv', chunksize=10000):
    process(chunk)
```

---

## 🏋️ Training Errors

### Error: "Loss is NaN"

```python
# Loss suddenly becomes nan
Epoch 1: Loss = 2.3456
Epoch 2: Loss = nan
```

**Causes & Solutions:**

```python
# Cause 1: Learning rate too high
optimizer = torch.optim.Adam(model.parameters(), lr=1e-5)  # Lower LR

# Cause 2: Division by zero / log(0)
output = torch.log(probs + 1e-8)  # Add small epsilon

# Cause 3: Exploding gradients
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

# Cause 4: Bad input data
# Check for NaN in data:
assert not torch.isnan(input).any(), "Input contains NaN!"
assert not torch.isinf(input).any(), "Input contains Inf!"

# Cause 5: Numerical instability in softmax
# Use LogSoftmax + NLLLoss instead of Softmax + CrossEntropy
# Or use combined CrossEntropyLoss (more stable)

# Debug: Check gradients
for name, param in model.named_parameters():
    if param.grad is not None:
        if torch.isnan(param.grad).any():
            print(f"NaN gradient in {name}")
```

---

### Error: "Loss not decreasing"

**Causes & Solutions:**

```python
# Cause 1: Learning rate too low or too high
# Try different learning rates:
for lr in [1e-2, 1e-3, 1e-4, 1e-5]:
    # Train and observe

# Cause 2: Model not in training mode
model.train()  # Don't forget this!

# Cause 3: Forgetting to zero gradients
optimizer.zero_grad()  # Required before each backward()

# Cause 4: Using wrong loss function
# Classification: CrossEntropyLoss
# Regression: MSELoss, L1Loss

# Cause 5: Data not shuffled
train_loader = DataLoader(dataset, shuffle=True)

# Cause 6: Bug in forward pass
# Add debug prints:
def forward(self, x):
    print(f"Input: {x.shape}, {x.mean():.4f}")
    x = self.layer1(x)
    print(f"After layer1: {x.shape}, {x.mean():.4f}")
    # ...
```

---

### Error: "Expected X dimensions but got Y"

```python
RuntimeError: Expected 4-dimensional input for 4-dimensional weight [64, 3, 3, 3],
but got 3-dimensional input of size [3, 32, 32] instead
```

**Cause:** Missing batch dimension

**Solutions:**

```python
# Add batch dimension
input = input.unsqueeze(0)  # [3, 32, 32] → [1, 3, 32, 32]

# Or check your data shape
print(f"Input shape: {input.shape}")
# Should be [batch, channels, height, width] for CNN
# Should be [batch, sequence, features] for RNN
```

---

### Error: "Sizes of tensors must match"

```python
RuntimeError: The size of tensor a (10) must match the size of tensor b (5)
```

**Cause:** Trying to operate on incompatible tensor shapes

**Solutions:**

```python
# Debug: Print shapes
print(f"Tensor A: {a.shape}")
print(f"Tensor B: {b.shape}")

# Solution 1: Reshape to match
b = b.expand_as(a)
b = b.repeat(2)

# Solution 2: Check model architecture
# Ensure layer output dimensions match next layer input

# Solution 3: Check target shape
# For CrossEntropyLoss:
# predictions: [batch_size, num_classes]
# targets: [batch_size] (class indices, not one-hot!)
```

---

### Error: "Gradients are None"

```python
# After backward(), some param.grad is None
```

**Causes & Solutions:**

```python
# Cause 1: Tensor not connected to computation graph
x = torch.tensor([1.0], requires_grad=True)
y = x.detach() * 2  # detach() breaks the graph!
y.backward()  # x.grad will be None

# Cause 2: Using operations that don't track gradients
with torch.no_grad():
    y = x * 2  # Gradients not tracked here

# Cause 3: Leaf tensor was modified in-place
x = torch.tensor([1.0], requires_grad=True)
x.add_(1)  # In-place modification breaks graph!

# Cause 4: Parameter not used in forward pass
# Check if all model parameters are used
for name, param in model.named_parameters():
    if param.grad is None:
        print(f"No gradient for: {name}")
```

---

## 📊 Data Errors

### Error: "Index out of bounds"

```python
IndexError: index 10 is out of bounds for axis 0 with size 10
```

**Solutions:**

```python
# Check array/tensor shape first
print(f"Shape: {array.shape}")
print(f"Trying to access index: {index}")

# Remember: indexing is 0-based!
# Array of size 10 has indices 0-9, not 1-10

# For DataLoader issues, check dataset length
print(f"Dataset length: {len(dataset)}")
```

---

### Error: "Can't convert CUDA tensor to numpy"

```python
TypeError: can't convert cuda:0 device type tensor to numpy
```

**Solution:**

```python
# Move to CPU first, then convert
tensor_cpu = tensor.cpu()
array = tensor_cpu.numpy()

# Or in one line:
array = tensor.cpu().numpy()

# If tensor requires grad:
array = tensor.detach().cpu().numpy()
```

---

### Error: "Expected input batch_size to match target batch_size"

```python
ValueError: Expected input batch_size (32) to match target batch_size (64)
```

**Cause:** Mismatch between input and target batches

**Solution:**

```python
# Check your data loading
for inputs, targets in data_loader:
    print(f"Inputs: {inputs.shape}, Targets: {targets.shape}")
    assert inputs.shape[0] == targets.shape[0], "Batch size mismatch!"
```

---

## 📓 Jupyter/Colab Errors

### Error: "Kernel died"

**Causes & Solutions:**

```python
# Cause 1: Out of memory
# Reduce batch size, clear variables

# Cause 2: Infinite loop
# Add break conditions, use tqdm for progress

# Cause 3: Segmentation fault in native code
# Usually a package version issue - try upgrading/downgrading

# Cause 4: Too much output
from IPython.display import clear_output
clear_output(wait=True)  # Clear output periodically
```

---

### Error: "Notebook not trusted"

**Solution:**

```
File → Trust notebook
Or run: jupyter trust notebook.ipynb
```

---

### Error: "Module not found" after pip install in Jupyter

**Cause:** Jupyter using different Python than pip

**Solutions:**

```python
# Use %pip instead of !pip
%pip install package_name

# Or restart kernel after install
# Kernel → Restart
```

---

## 📋 Quick Reference Table

| Error | Quick Fix |
|-------|-----------|
| `pip not recognized` | `python -m pip install` |
| `No module named X` | `pip install X` |
| `CUDA out of memory` | Reduce batch size, `torch.cuda.empty_cache()` |
| `CUDA not available` | Check PyTorch install: `pip install torch --index-url .../cu118` |
| `Loss is NaN` | Lower learning rate, clip gradients |
| `Loss not decreasing` | Check `model.train()`, `optimizer.zero_grad()` |
| `Shape mismatch` | Print shapes, add `unsqueeze(0)` for batch dim |
| `Can't convert to numpy` | Use `.cpu().numpy()` or `.detach().cpu().numpy()` |
| `Kernel died` | Reduce memory usage, check for infinite loops |
| `Permission denied` | Use `pip install --user` or virtual environment |

---

## 🆘 General Debugging Tips

### 1. Read the Error Message Carefully

```python
# The error message usually tells you:
# - What went wrong
# - Where it happened (file and line number)
# - What values caused the issue

# Example:
RuntimeError: Expected all tensors to be on the same device, 
but found at least two devices, cuda:0 and cpu!
# ↑ This tells you exactly what to fix: move tensors to same device
```

### 2. Print Shapes and Values

```python
# Add debug prints
print(f"Input shape: {x.shape}")
print(f"Input dtype: {x.dtype}")
print(f"Input device: {x.device}")
print(f"Input min/max: {x.min():.4f} / {x.max():.4f}")
print(f"Contains NaN: {torch.isnan(x).any()}")
```

### 3. Simplify and Isolate

```python
# Test with minimal example
x = torch.randn(2, 3)  # Simple input
output = model(x)  # Does this work?

# If yes, gradually add complexity
# If no, the problem is in the model
```

### 4. Check Version Compatibility

```python
import torch
import transformers
import numpy as np

print(f"PyTorch: {torch.__version__}")
print(f"Transformers: {transformers.__version__}")
print(f"NumPy: {np.__version__}")
print(f"Python: {sys.version}")
```

### 5. Search the Error

```
Best resources:
1. Stack Overflow (exact error message)
2. GitHub Issues (package name + error)
3. PyTorch Forums (for PyTorch-specific)
4. HuggingFace Forums (for transformers)
```

---

## ✅ Checkpoint

You now have a reference for common errors. When you encounter an error:

1. [ ] Read the full error message
2. [ ] Check this guide for quick fix
3. [ ] Print shapes and values to debug
4. [ ] Search online with exact error message
5. [ ] Try minimal reproducible example

**Ready for:** [Week-1-Foundations](../Week-1-Foundations/README.md) 🚀
