# ☁️ Google Colab Guide

## 📚 Table of Contents
1. [What is Google Colab?](#-what-is-google-colab)
2. [Getting Started](#-getting-started)
3. [GPU/TPU Access](#-gputpu-access)
4. [Working with Files](#-working-with-files)
5. [Installing Packages](#-installing-packages)
6. [Keyboard Shortcuts](#-keyboard-shortcuts)
7. [Best Practices](#-best-practices)
8. [Limitations & Solutions](#-limitations--solutions)

---

## 🎯 What is Google Colab?

```
Google Colab = Free Jupyter Notebooks in the Cloud with GPU!

┌──────────────────────────────────────────────────────────────┐
│                    WHY USE COLAB?                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ✅ FREE GPU access (NVIDIA T4, sometimes V100/A100)         │
│  ✅ No setup required (runs in browser)                      │
│  ✅ Pre-installed packages (PyTorch, TensorFlow, etc.)       │
│  ✅ Google Drive integration                                  │
│  ✅ Easy sharing & collaboration                              │
│  ✅ Works on any computer with a browser                     │
│                                                               │
│  ⚠️ Session limits (disconnect after ~12 hours)              │
│  ⚠️ GPU may not always be available (shared resource)        │
│  ⚠️ Limited disk space (~80 GB, resets on disconnect)        │
│  ⚠️ Can be slow for large file operations                    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Colab vs Local vs Cloud

| Feature | Google Colab | Local (CPU) | Local (GPU) | Cloud GPU |
|---------|--------------|-------------|-------------|-----------|
| Cost | Free | Free | $500-2000+ | $0.50-3/hr |
| GPU | T4/V100 | ❌ | RTX 3090/4090 | V100/A100 |
| Setup | None | Medium | Hard | Medium |
| Storage | 80 GB (temp) | Unlimited | Unlimited | Pay/GB |
| Session | 12 hrs max | Unlimited | Unlimited | Pay/time |
| Best for | Learning, experiments | Small tasks | Serious training | Production |

---

## 🚀 Getting Started

### Step 1: Access Colab

1. Go to: **https://colab.research.google.com**
2. Sign in with your Google account
3. You'll see the welcome page or recent notebooks

### Step 2: Create New Notebook

- **File → New Notebook**
- Or click: **+ New Notebook**

### Step 3: Understanding the Interface

```
┌────────────────────────────────────────────────────────────────┐
│  File  Edit  View  Insert  Runtime  Tools  Help                │
├────────────────────────────────────────────────────────────────┤
│  📁  +Code  +Text  🔗  ⚙️                      RAM █▓░░ Disk █░░│
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [ ] Code Cell                                    ▶ (Run)       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ import torch                                             │   │
│  │ print("Hello from Colab!")                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Output:                                                        │
│  Hello from Colab!                                             │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  📝 Text Cell (Markdown)                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ # My Notebook                                            │   │
│  │ This is a **markdown** cell.                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Step 4: Run Your First Code

```python
# Cell 1: Check environment
import sys
print(f"Python version: {sys.version}")

import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
```

**Run cell:** Click ▶ button or press `Shift+Enter`

---

## 🎮 GPU/TPU Access

### Enable GPU

1. **Runtime → Change runtime type**
2. **Hardware accelerator:** Select **GPU**
3. Click **Save**
4. The runtime will restart

### Verify GPU Access

```python
import torch

# Check GPU
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    
    # Quick test
    x = torch.randn(1000, 1000).cuda()
    y = x @ x.T
    print("✅ GPU working!")
else:
    print("❌ No GPU - go to Runtime > Change runtime type > GPU")
```

### GPU Types You Might Get

```
┌────────────────────────────────────────────────────────────┐
│                    COLAB GPU TYPES                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  FREE Tier:                                                 │
│  ├── NVIDIA T4 (15 GB) - Most common                       │
│  ├── NVIDIA P100 (16 GB) - Older, less common              │
│  └── NVIDIA K80 (12 GB) - Rarely, older GPU                │
│                                                             │
│  Colab Pro ($10/month):                                     │
│  ├── Priority access to V100 (16 GB)                       │
│  └── Longer session times                                  │
│                                                             │
│  Colab Pro+ ($50/month):                                    │
│  ├── A100 (40 GB) - Top tier!                              │
│  └── Background execution                                  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Using TPU (Tensor Processing Unit)

```python
# Enable TPU: Runtime > Change runtime type > TPU

import torch

# Check TPU
try:
    import torch_xla
    import torch_xla.core.xla_model as xm
    device = xm.xla_device()
    print(f"TPU device: {device}")
except ImportError:
    print("TPU not available or torch_xla not installed")
    print("For most users, GPU is sufficient!")
```

---

## 📁 Working with Files

### Mount Google Drive

```python
from google.colab import drive

# Mount drive (prompts for authorization)
drive.mount('/content/drive')

# Your files are now at:
# /content/drive/MyDrive/

# List files
import os
os.listdir('/content/drive/MyDrive/')
```

### Upload Files from Computer

```python
from google.colab import files

# Upload
uploaded = files.upload()

# Access uploaded file
for filename, content in uploaded.items():
    print(f"Uploaded: {filename}, Size: {len(content)} bytes")
```

### Download Files to Computer

```python
from google.colab import files

# Save a file first
with open('output.txt', 'w') as f:
    f.write("Hello from Colab!")

# Download it
files.download('output.txt')
```

### Download from URL

```python
# Using wget
!wget https://example.com/data.csv

# Using curl
!curl -O https://example.com/data.csv

# Using Python
import urllib.request
urllib.request.urlretrieve('https://example.com/data.csv', 'data.csv')
```

### Working with Kaggle Datasets

```python
# 1. Upload your kaggle.json (from Kaggle account settings)
from google.colab import files
files.upload()  # Upload kaggle.json

# 2. Setup Kaggle
!mkdir -p ~/.kaggle
!mv kaggle.json ~/.kaggle/
!chmod 600 ~/.kaggle/kaggle.json

# 3. Download dataset
!kaggle datasets download -d username/dataset-name

# 4. Unzip
!unzip dataset-name.zip
```

### Saving/Loading PyTorch Models

```python
import torch

# Save model
model = YourModel()
torch.save(model.state_dict(), '/content/drive/MyDrive/model.pth')

# Load model
model = YourModel()
model.load_state_dict(torch.load('/content/drive/MyDrive/model.pth'))
```

---

## 📦 Installing Packages

### Basic Installation

```python
# Use ! for shell commands in code cells
!pip install transformers

# Or use %pip (better for notebooks)
%pip install transformers

# Install specific version
!pip install transformers==4.30.0

# Install from git
!pip install git+https://github.com/user/repo.git
```

### Install Multiple Packages

```python
# Create requirements in cell
%%writefile requirements.txt
transformers>=4.30.0
datasets>=2.14.0
langchain>=0.1.0
chromadb>=0.4.0

# Install from requirements
!pip install -r requirements.txt
```

### Common Packages for This Course

```python
# Run this cell to install course packages
!pip install -q transformers datasets tokenizers
!pip install -q langchain langchain-openai langchain-community
!pip install -q chromadb faiss-cpu
!pip install -q accelerate bitsandbytes
!pip install -q sentencepiece protobuf

print("✅ Packages installed!")
```

### Check Installed Packages

```python
!pip list | grep torch
!pip show transformers
```

---

## ⌨️ Keyboard Shortcuts

### Essential Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Run cell | `Shift+Enter` | `Shift+Enter` |
| Run cell, stay | `Ctrl+Enter` | `Cmd+Enter` |
| Insert cell above | `Ctrl+M A` | `Cmd+M A` |
| Insert cell below | `Ctrl+M B` | `Cmd+M B` |
| Delete cell | `Ctrl+M D` | `Cmd+M D` |
| Convert to code | `Ctrl+M Y` | `Cmd+M Y` |
| Convert to text | `Ctrl+M M` | `Cmd+M M` |
| Undo in cell | `Ctrl+Z` | `Cmd+Z` |
| Find/Replace | `Ctrl+H` | `Cmd+H` |
| Comment line | `Ctrl+/` | `Cmd+/` |

### View All Shortcuts

- **Tools → Keyboard shortcuts**
- Or press `Ctrl+M H`

---

## 💡 Best Practices

### 1. Save Your Work to Drive

```python
# Always mount Drive at the start
from google.colab import drive
drive.mount('/content/drive')

# Save checkpoints there
checkpoint_path = '/content/drive/MyDrive/AI-Course/checkpoints/'
```

### 2. Use Form Fields for Parameters

```python
#@title Training Configuration
learning_rate = 0.001  #@param {type:"number"}
batch_size = 32  #@param {type:"integer"}
epochs = 10  #@param {type:"slider", min:1, max:100}
model_name = "bert-base-uncased"  #@param ["bert-base-uncased", "roberta-base", "distilbert-base-uncased"]

print(f"LR: {learning_rate}, Batch: {batch_size}, Epochs: {epochs}")
```

### 3. Monitor GPU Usage

```python
# Check GPU memory
!nvidia-smi

# In Python
import torch
print(f"Allocated: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
print(f"Cached: {torch.cuda.memory_reserved() / 1e9:.2f} GB")
```

### 4. Prevent Disconnection

```javascript
// Run this in browser console (F12 > Console)
// Clicks "connect" button periodically
function ClickConnect(){
    console.log("Staying connected...");
    document.querySelector("colab-connect-button").click()
}
setInterval(ClickConnect, 60000)
```

### 5. Use Secrets for API Keys

```python
# Don't hardcode API keys!
# Use Colab Secrets (left sidebar, key icon)

from google.colab import userdata

# After adding secret in sidebar:
api_key = userdata.get('OPENAI_API_KEY')
```

### 6. Clear Output to Save Memory

```python
from IPython.display import clear_output

# In training loop
for epoch in range(100):
    # ... training code ...
    clear_output(wait=True)
    print(f"Epoch {epoch}: Loss = {loss}")
```

---

## ⚠️ Limitations & Solutions

### Limitation 1: Session Disconnects

```
Problem: Colab disconnects after ~12 hours or ~30 min idle

Solutions:
1. Save checkpoints frequently to Google Drive
2. Use the anti-disconnect script
3. Run critical training on local GPU or cloud services
```

### Limitation 2: Limited GPU Availability

```
Problem: "Cannot connect to GPU runtime"

Solutions:
1. Try again later (GPUs are shared)
2. Use Colab Pro for priority access
3. Clear other active sessions: Runtime > Manage sessions
4. Train smaller models or use CPU for testing
```

### Limitation 3: Slow File Operations

```
Problem: Reading/writing files is slow

Solutions:
1. Copy data to local Colab storage first:
   !cp -r /content/drive/MyDrive/data /content/data

2. Use smaller datasets for prototyping

3. Download pre-processed data directly:
   !wget preprocessed_data.zip
```

### Limitation 4: Package Installation Time

```
Problem: Installing packages every session

Solution: Create setup cell at top of notebook

# Setup cell (run first)
!pip install -q transformers datasets langchain chromadb
```

### Limitation 5: Memory Limits

```
Problem: "CUDA out of memory" or "RAM exceeded"

Solutions:
1. Reduce batch size
2. Use gradient accumulation
3. Clear unused variables: del variable
4. Restart runtime: Runtime > Restart runtime
5. Use mixed precision: torch.cuda.amp
```

---

## 📋 Colab Notebook Template

Use this template to start new projects:

```python
# Cell 1: Setup and Imports
#@title ⚙️ Setup
#@markdown Run this cell first to set up the environment

# Mount Drive
from google.colab import drive
drive.mount('/content/drive')

# Install packages
!pip install -q transformers datasets langchain chromadb

# Imports
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Device
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")

print("✅ Setup complete!")
```

```python
# Cell 2: Configuration
#@title 🎛️ Configuration
#@markdown Adjust these parameters

PROJECT_NAME = "my-project"  #@param {type:"string"}
LEARNING_RATE = 0.001  #@param {type:"number"}
BATCH_SIZE = 32  #@param {type:"integer"}
EPOCHS = 10  #@param {type:"slider", min:1, max:50}

# Paths
BASE_PATH = f'/content/drive/MyDrive/AI-Course/{PROJECT_NAME}/'
!mkdir -p {BASE_PATH}

print(f"Project: {PROJECT_NAME}")
print(f"Save path: {BASE_PATH}")
```

```python
# Cell 3: Load Data
#@title 📊 Load Data

# Your data loading code here
pass
```

```python
# Cell 4: Model Definition
#@title 🧠 Model

# Your model code here
pass
```

```python
# Cell 5: Training
#@title 🏋️ Training

# Your training code here
pass
```

```python
# Cell 6: Evaluation
#@title 📈 Evaluation

# Your evaluation code here
pass
```

```python
# Cell 7: Save Model
#@title 💾 Save Model

# Save to Drive
model_path = f'{BASE_PATH}/model.pth'
torch.save(model.state_dict(), model_path)
print(f"✅ Model saved to {model_path}")
```

---

## ✅ Checkpoint

Before proceeding, ensure you can:

- [ ] Create a new Colab notebook
- [ ] Enable GPU runtime
- [ ] Verify GPU is working with torch.cuda
- [ ] Mount Google Drive
- [ ] Upload and download files
- [ ] Install packages with pip
- [ ] Use keyboard shortcuts effectively

**Next:** [06-Common-Errors-Solutions.md](./06-Common-Errors-Solutions.md)
