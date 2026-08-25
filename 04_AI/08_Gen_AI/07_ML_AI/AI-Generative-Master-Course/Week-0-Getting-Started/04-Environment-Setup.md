# 🛠️ Environment Setup Guide

## 📚 Table of Contents
1. [Overview](#-overview)
2. [Option A: Google Colab (Recommended Start)](#-option-a-google-colab-recommended-start)
3. [Option B: Local Setup (Windows)](#-option-b-local-setup-windows)
4. [Option C: Local Setup (Mac/Linux)](#-option-c-local-setup-maclinux)
5. [GPU Setup (CUDA)](#-gpu-setup-cuda)
6. [IDE Setup](#-ide-setup)
7. [Virtual Environments](#-virtual-environments)
8. [Package Management](#-package-management)
9. [Verification](#-verification)
10. [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

```
Which Setup Should I Use?

┌─────────────────────────────────────────────────────────────┐
│                DECISION FLOWCHART                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Do you have an NVIDIA GPU?                                 │
│       │                                                      │
│       ├── NO ───► Google Colab (free GPU!)                  │
│       │                                                      │
│       └── YES ──► Do you want to install CUDA?              │
│                       │                                      │
│                       ├── NO ───► Google Colab              │
│                       │                                      │
│                       └── YES ──► Local Setup + CUDA        │
│                                                              │
│  RECOMMENDATION FOR BEGINNERS:                               │
│  Start with Google Colab, move to local later.              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### What You'll Need

| Component | Purpose | Required? |
|-----------|---------|-----------|
| Python 3.10+ | Programming language | Yes |
| pip | Package installer | Yes |
| Virtual environment | Isolated packages | Recommended |
| PyTorch | ML framework | Yes |
| CUDA | GPU acceleration | Optional |
| VS Code / PyCharm | Code editor | Recommended |
| Google Colab | Cloud notebooks | Alternative |

---

## ☁️ Option A: Google Colab (Recommended Start)

### Why Colab?
- ✅ **Free GPU access** (NVIDIA T4, sometimes V100)
- ✅ **Zero setup** (runs in browser)
- ✅ **Pre-installed packages** (PyTorch, NumPy, etc.)
- ✅ **Easy file sharing**
- ⚠️ Session time limits (12 hours max)
- ⚠️ Slower disk I/O

### Getting Started with Colab

1. **Go to:** https://colab.research.google.com
2. **Sign in** with Google account
3. **Create new notebook:** File → New Notebook
4. **Enable GPU:** Runtime → Change runtime type → GPU

### Colab Basics

```python
# Check GPU availability
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
```

### Install Additional Packages

```python
# In Colab cells, use ! for shell commands
!pip install transformers
!pip install langchain
!pip install chromadb

# Or use %pip (better for notebooks)
%pip install transformers
```

### Mount Google Drive

```python
from google.colab import drive
drive.mount('/content/drive')

# Access files
!ls /content/drive/MyDrive/
```

### Download Files

```python
# Download from URL
!wget https://example.com/data.csv

# Upload from computer
from google.colab import files
uploaded = files.upload()
```

---

## 💻 Option B: Local Setup (Windows)

### Step 1: Install Python

```powershell
# Option 1: Download from python.org
# Go to https://www.python.org/downloads/
# Download Python 3.10 or 3.11
# IMPORTANT: Check "Add Python to PATH" during installation!

# Option 2: Using winget
winget install Python.Python.3.11

# Verify installation
python --version
pip --version
```

### Step 2: Create Virtual Environment

```powershell
# Navigate to your project folder
cd C:\Users\YourName\Desktop\AI-Course

# Create virtual environment
python -m venv ai-course

# Activate it (Windows CMD)
ai-course\Scripts\activate

# Activate it (Windows PowerShell)
.\ai-course\Scripts\Activate.ps1

# If PowerShell gives error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# You should see (ai-course) in your terminal prompt
```

### Step 3: Install Packages

```powershell
# Upgrade pip first
python -m pip install --upgrade pip

# Install core packages
pip install numpy pandas matplotlib

# Install PyTorch (CPU only)
pip install torch torchvision torchaudio

# Install PyTorch (with CUDA - see GPU section)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install Jupyter
pip install jupyter notebook

# Install course requirements
pip install transformers datasets
pip install langchain langchain-openai
pip install chromadb faiss-cpu
pip install streamlit
```

### Step 4: Verify Installation

```powershell
# Run Python
python

>>> import torch
>>> print(torch.__version__)
>>> print(torch.cuda.is_available())
>>> exit()
```

---

## 🍎 Option C: Local Setup (Mac/Linux)

### Step 1: Install Python

```bash
# Mac (using Homebrew)
brew install python@3.11

# Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip

# Verify
python3 --version
pip3 --version
```

### Step 2: Create Virtual Environment

```bash
# Navigate to project folder
cd ~/Desktop/AI-Course

# Create virtual environment
python3 -m venv ai-course

# Activate it
source ai-course/bin/activate

# You should see (ai-course) in your terminal prompt
```

### Step 3: Install Packages

```bash
# Upgrade pip
pip install --upgrade pip

# Install core packages
pip install numpy pandas matplotlib

# Install PyTorch
# Mac (MPS acceleration for M1/M2/M3)
pip install torch torchvision torchaudio

# Linux (CPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Linux (CUDA)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install other packages
pip install jupyter transformers datasets langchain chromadb streamlit
```

### Step 4: Mac M1/M2/M3 GPU (MPS)

```python
import torch

# Check MPS (Metal Performance Shaders) availability
print(f"MPS available: {torch.backends.mps.is_available()}")

# Use MPS device
device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
tensor = torch.randn(3, 3).to(device)
print(f"Tensor on: {tensor.device}")
```

---

## 🎮 GPU Setup (CUDA)

### Check Your GPU

```powershell
# Windows
nvidia-smi

# This shows:
# - GPU model
# - Driver version
# - CUDA version
# - Memory usage
```

### Install CUDA Toolkit (Optional)

```
For PyTorch, you usually DON'T need to install CUDA separately!
PyTorch comes with its own CUDA libraries.

Only install CUDA Toolkit if:
- You need nvcc compiler
- You're building custom CUDA extensions
- You want system-wide CUDA

Otherwise, just use the PyTorch CUDA wheel.
```

### Install PyTorch with CUDA

```bash
# Check your CUDA version: nvidia-smi (look at CUDA Version)
# Then pick matching PyTorch:

# CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# CUDA 12.1
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# CPU only (no GPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Verify GPU Setup

```python
import torch

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
print(f"cuDNN version: {torch.backends.cudnn.version()}")

if torch.cuda.is_available():
    print(f"GPU count: {torch.cuda.device_count()}")
    print(f"GPU name: {torch.cuda.get_device_name(0)}")
    print(f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    
    # Test GPU
    x = torch.randn(1000, 1000).cuda()
    y = x @ x.T
    print("✅ GPU test passed!")
```

---

## 📝 IDE Setup

### VS Code (Recommended)

1. **Download:** https://code.visualstudio.com/

2. **Install Extensions:**
   - Python (Microsoft)
   - Pylance
   - Jupyter
   - Python Debugger

3. **Configure Python Interpreter:**
   - `Ctrl+Shift+P` → "Python: Select Interpreter"
   - Choose your virtual environment

4. **Settings (settings.json):**
```json
{
    "python.analysis.typeCheckingMode": "basic",
    "python.formatting.provider": "black",
    "editor.formatOnSave": true,
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true
}
```

### PyCharm

1. **Download:** https://www.jetbrains.com/pycharm/download/ (Community Edition is free)

2. **Configure Interpreter:**
   - File → Settings → Project → Python Interpreter
   - Add your virtual environment

### Jupyter Notebooks (Local)

```bash
# Install
pip install jupyter notebook

# Start
jupyter notebook

# Or use JupyterLab (more features)
pip install jupyterlab
jupyter lab
```

---

## 🔒 Virtual Environments

### Why Virtual Environments?

```
WITHOUT virtual environment:
┌──────────────────────────────────────────────┐
│ System Python                                │
│ ├── Project A needs torch 1.13              │
│ ├── Project B needs torch 2.0               │
│ └── CONFLICT! Only one version can exist!   │
└──────────────────────────────────────────────┘

WITH virtual environments:
┌──────────────────────────────────────────────┐
│ System Python                                │
│                                              │
│ ├── venv-projectA/                           │
│ │   └── torch 1.13 ✅                        │
│ │                                            │
│ └── venv-projectB/                           │
│     └── torch 2.0 ✅                         │
│                                              │
│ No conflict! Each project is isolated.      │
└──────────────────────────────────────────────┘
```

### Managing Virtual Environments

```bash
# Create
python -m venv myenv

# Activate (Windows)
myenv\Scripts\activate

# Activate (Mac/Linux)
source myenv/bin/activate

# Deactivate
deactivate

# Delete (just delete the folder)
rm -rf myenv  # Mac/Linux
rmdir /s myenv  # Windows
```

### Conda Alternative

```bash
# Install Miniconda: https://docs.conda.io/en/latest/miniconda.html

# Create environment
conda create -n ai-course python=3.11

# Activate
conda activate ai-course

# Install packages
conda install pytorch torchvision -c pytorch
pip install transformers  # Can mix pip and conda

# Deactivate
conda deactivate
```

---

## 📦 Package Management

### requirements.txt

```bash
# Create requirements file
pip freeze > requirements.txt

# Install from requirements
pip install -r requirements.txt
```

### Course Requirements File

Create `requirements.txt`:

```txt
# Core
numpy>=1.24.0
pandas>=2.0.0
matplotlib>=3.7.0
jupyter>=1.0.0

# PyTorch (specify your CUDA version)
torch>=2.0.0
torchvision>=0.15.0

# Transformers & NLP
transformers>=4.30.0
datasets>=2.14.0
tokenizers>=0.13.0
sentencepiece>=0.1.99

# LangChain & Agents
langchain>=0.1.0
langchain-openai>=0.0.5
langchain-community>=0.0.10
langgraph>=0.0.10

# Vector DBs
chromadb>=0.4.0
faiss-cpu>=1.7.4

# Web & UI
streamlit>=1.28.0
fastapi>=0.104.0
uvicorn>=0.24.0

# Utilities
python-dotenv>=1.0.0
tqdm>=4.66.0
pillow>=10.0.0
```

### Useful pip Commands

```bash
# Install package
pip install package_name
pip install package_name==1.0.0  # Specific version
pip install package_name>=1.0.0  # Minimum version

# Upgrade package
pip install --upgrade package_name

# Uninstall
pip uninstall package_name

# List installed
pip list

# Show package info
pip show package_name

# Check for outdated
pip list --outdated

# Install from git
pip install git+https://github.com/user/repo.git
```

---

## ✅ Verification

### Complete Verification Script

```python
"""
Run this script to verify your environment is set up correctly.
Save as verify_setup.py and run: python verify_setup.py
"""

import sys

def check_python():
    print(f"Python version: {sys.version}")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 10:
        print("✅ Python version OK")
    else:
        print("⚠️ Python 3.10+ recommended")

def check_packages():
    packages = [
        ("numpy", "np"),
        ("pandas", "pd"),
        ("matplotlib", "plt"),
        ("torch", "torch"),
        ("transformers", "transformers"),
    ]
    
    for package, alias in packages:
        try:
            module = __import__(package)
            version = getattr(module, "__version__", "unknown")
            print(f"✅ {package}: {version}")
        except ImportError:
            print(f"❌ {package}: NOT INSTALLED")

def check_pytorch():
    try:
        import torch
        print(f"\n--- PyTorch Info ---")
        print(f"PyTorch version: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"CUDA version: {torch.version.cuda}")
            print(f"GPU: {torch.cuda.get_device_name(0)}")
            
            # Quick GPU test
            x = torch.randn(100, 100).cuda()
            y = x @ x.T
            print("✅ GPU computation test passed")
        else:
            # Check for MPS (Mac)
            if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                print("✅ MPS (Apple Silicon) available")
            else:
                print("ℹ️ Running on CPU only")
                
    except Exception as e:
        print(f"❌ PyTorch error: {e}")

def check_jupyter():
    try:
        import jupyter
        print("✅ Jupyter installed")
    except ImportError:
        print("⚠️ Jupyter not installed (optional)")

def main():
    print("=" * 50)
    print("ENVIRONMENT VERIFICATION")
    print("=" * 50)
    
    print("\n--- Python ---")
    check_python()
    
    print("\n--- Packages ---")
    check_packages()
    
    check_pytorch()
    
    print("\n--- Jupyter ---")
    check_jupyter()
    
    print("\n" + "=" * 50)
    print("Verification complete!")
    print("=" * 50)

if __name__ == "__main__":
    main()
```

---

## 🔧 Troubleshooting

### Common Errors & Solutions

#### 1. "python is not recognized"

```
Cause: Python not in PATH

Fix (Windows):
1. Search "Environment Variables" in Start menu
2. Edit PATH
3. Add: C:\Users\YourName\AppData\Local\Programs\Python\Python311\
4. Add: C:\Users\YourName\AppData\Local\Programs\Python\Python311\Scripts\
5. Restart terminal
```

#### 2. "pip is not recognized"

```bash
# Use python -m pip instead
python -m pip install numpy

# Or reinstall pip
python -m ensurepip --upgrade
```

#### 3. "CUDA out of memory"

```python
# Solutions:
# 1. Reduce batch size
batch_size = 16  # Instead of 32

# 2. Clear cache
torch.cuda.empty_cache()

# 3. Delete unused tensors
del tensor
torch.cuda.empty_cache()

# 4. Use gradient checkpointing
# (covered in later weeks)
```

#### 4. "No module named 'torch'"

```bash
# Install PyTorch
pip install torch torchvision

# If in Jupyter, restart kernel after install
```

#### 5. "torch.cuda.is_available() returns False"

```
Possible causes:
1. No NVIDIA GPU → Use CPU or Colab
2. Wrong PyTorch version → Reinstall with CUDA
3. Driver issues → Update NVIDIA drivers
4. WSL without GPU passthrough → Enable it

Check:
nvidia-smi  # Should show your GPU
```

#### 6. Permission Errors (Linux/Mac)

```bash
# Don't use sudo pip!
# Instead, use virtual environment or --user

pip install --user package_name

# Or use virtual environment (recommended)
python -m venv myenv
source myenv/bin/activate
pip install package_name
```

#### 7. SSL Certificate Errors

```bash
# If behind corporate proxy
pip install --trusted-host pypi.org --trusted-host pypi.python.org package_name

# Or set environment variable
export PIP_CERT=/path/to/cert.pem
```

#### 8. Version Conflicts

```bash
# See what's conflicting
pip check

# Create fresh environment
python -m venv fresh_env
source fresh_env/bin/activate
pip install -r requirements.txt
```

---

## 📋 Quick Reference

### Daily Workflow

```bash
# Start of session
cd /path/to/project
source ai-course/bin/activate  # Mac/Linux
# or: ai-course\Scripts\activate  # Windows

# Work on code...

# End of session
deactivate
```

### Environment Cheatsheet

| Task | Command |
|------|---------|
| Create venv | `python -m venv myenv` |
| Activate (Win) | `myenv\Scripts\activate` |
| Activate (Mac/Linux) | `source myenv/bin/activate` |
| Deactivate | `deactivate` |
| Install package | `pip install package` |
| Save requirements | `pip freeze > requirements.txt` |
| Install requirements | `pip install -r requirements.txt` |
| Check GPU | `python -c "import torch; print(torch.cuda.is_available())"` |

---

## ✅ Checkpoint

Before proceeding, ensure:

- [ ] Python 3.10+ installed
- [ ] Virtual environment created and activated
- [ ] Core packages installed (numpy, torch, etc.)
- [ ] Verification script runs without errors
- [ ] You can import torch and check cuda availability
- [ ] IDE configured with correct interpreter

**Next:** [05-Google-Colab-Guide.md](./05-Google-Colab-Guide.md)
