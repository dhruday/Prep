# 🚀 Week 0: Getting Started

## 📌 Overview

Welcome to **Week 0** – your essential bridge into AI/ML! This week is designed specifically for developers coming from **Java, JavaScript, or other programming backgrounds** who have little to no Python or AI experience.

**By the end of Week 0, you will:**
- ✅ Write Python confidently (coming from Java/JS)
- ✅ Understand NumPy arrays and operations
- ✅ Know PyTorch basics (tensors, autograd)
- ✅ Have a working environment (local or Colab)
- ✅ Know how to troubleshoot common setup issues

---

## 🎯 Why Week 0 Exists

```
WITHOUT Week 0:
┌─────────────────────────────────────────────────────────┐
│ Week 1: "Let's use NumPy broadcasting!"                │
│                                                         │
│ You: "What's NumPy? What's broadcasting? Why is my    │
│       code slow? Why is torch.tensor different from   │
│       np.array? Help!"                                 │
│                                                         │
│ Result: Frustrated, confused, overwhelmed              │
└─────────────────────────────────────────────────────────┘

WITH Week 0:
┌─────────────────────────────────────────────────────────┐
│ Week 0: Python syntax, NumPy, PyTorch, environment     │
│                                                         │
│ Week 1: "Let's use NumPy broadcasting!"                │
│                                                         │
│ You: "Got it! I know what that means and how it works" │
│                                                         │
│ Result: Confident, ready, building                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Week 0 Contents

| # | File | Topics | Time |
|---|------|--------|------|
| 1 | [01-Python-for-Java-JS-Developers.md](./01-Python-for-Java-JS-Developers.md) | Syntax mapping, Pythonic patterns, type hints | 2-3 hrs |
| 2 | [02-NumPy-Crash-Course.md](./02-NumPy-Crash-Course.md) | Arrays, operations, broadcasting, indexing | 2-3 hrs |
| 3 | [03-PyTorch-Fundamentals.md](./03-PyTorch-Fundamentals.md) | Tensors, autograd, GPU basics | 2-3 hrs |
| 4 | [04-Environment-Setup.md](./04-Environment-Setup.md) | Python, pip, venv, CUDA, IDE | 1-2 hrs |
| 5 | [05-Google-Colab-Guide.md](./05-Google-Colab-Guide.md) | Free GPU, notebooks, Drive integration | 1 hr |
| 6 | [06-Common-Errors-Solutions.md](./06-Common-Errors-Solutions.md) | ModuleNotFound, CUDA errors, version conflicts | Reference |
| 7 | [07-Pandas-for-ML.md](./07-Pandas-for-ML.md) | DataFrames, data loading, cleaning, transformation | 3-4 hrs |
| 8 | [08-Matplotlib-Seaborn.md](./08-Matplotlib-Seaborn.md) | Visualization, plots, ML-specific charts | 2-3 hrs |
| 9 | [09-Data-Preprocessing-Patterns.md](./09-Data-Preprocessing-Patterns.md) | Scaling, encoding, missing data, pipelines | 3-4 hrs |
| 10 | [10-Scikit-Learn-Essentials.md](./10-Scikit-Learn-Essentials.md) | ML workflow, algorithms, evaluation, tuning | 3-4 hrs |

**Total Time:** ~22-28 hours

---

## 🗓️ Suggested Learning Path

```
Day 1-2: Python & Core Tools
├── 01-Python-for-Java-JS-Developers.md
├── 02-NumPy-Crash-Course.md
├── Practice: Rewrite a small Java program in Python
└── Checkpoint: Can you write list comprehensions & use NumPy?

Day 3-4: Deep Learning Foundations
├── 03-PyTorch-Fundamentals.md
├── Practice: Create tensors, compute gradients
└── Checkpoint: Can you move tensors to GPU?

Day 5-6: Environment & Data Science Tools
├── 04-Environment-Setup.md
├── 05-Google-Colab-Guide.md
├── 07-Pandas-for-ML.md
├── Practice: Run code locally AND on Colab, load datasets
└── Checkpoint: Both environments working? Can manipulate DataFrames?

Day 7-8: Data Visualization & Preprocessing
├── 08-Matplotlib-Seaborn.md
├── 09-Data-Preprocessing-Patterns.md
├── Practice: Visualize datasets, build preprocessing pipelines
└── Checkpoint: Can you clean messy data and create plots?

Day 9-10: Classical ML with Scikit-Learn
├── 10-Scikit-Learn-Essentials.md
├── Practice: Train models, tune hyperparameters, evaluate
└── Checkpoint: Can you build an end-to-end ML workflow?

Day 11: Troubleshooting + Review
├── 06-Common-Errors-Solutions.md
├── Review: Go back to weak areas
└── Checkpoint: Ready for Week 1!
```

---

## 🔑 Key Concepts Preview

### Python vs Java/JS Quick Reference

```
JAVA/JAVASCRIPT              PYTHON
==============              ======
int x = 5;                  x = 5
int[] arr = {1, 2, 3};      arr = [1, 2, 3]
for(int i=0; i<10; i++)     for i in range(10):
arr.length                  len(arr)
public static void main     if __name__ == "__main__":
System.out.println()        print()
null                        None
true / false                True / False
this                        self
```

### NumPy Core Idea

```
Python Lists (Slow):
[1, 2, 3] + [4, 5, 6] = [1, 2, 3, 4, 5, 6]  # Concatenation

NumPy Arrays (Fast):
np.array([1,2,3]) + np.array([4,5,6]) = array([5, 7, 9])  # Element-wise!
```

### PyTorch Core Idea

```
NumPy:  Great for math, no GPU, no gradients
PyTorch: Great for math, HAS GPU, HAS gradients (autograd)

tensor = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
# Now PyTorch tracks all operations for backpropagation!
```

---

## 💻 Environment Options

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **Google Colab** | Free GPU, no setup | Session limits, slow storage | Beginners, quick experiments |
| **Local (CPU)** | Full control | No GPU acceleration | Learning basics |
| **Local (GPU)** | Fast training | Expensive hardware | Serious training |
| **Cloud GPU** | Scalable | Costs money | Production, large models |

**Recommendation:** Start with Colab, move to local when comfortable.

---

## ✅ Week 0 Completion Checklist

Before moving to Week 1, ensure you can:

### Python Foundations
- [ ] Write a Python function with type hints
- [ ] Use list comprehensions and f-strings
- [ ] Understand Python classes and decorators

### NumPy & PyTorch
- [ ] Create and manipulate NumPy arrays
- [ ] Understand broadcasting and vectorization
- [ ] Create PyTorch tensors and compute gradients
- [ ] Move tensors between CPU and GPU

### Data Science Tools
- [ ] Load and explore data with Pandas
- [ ] Clean missing data and handle outliers
- [ ] Create visualizations with Matplotlib/Seaborn
- [ ] Understand when to use different plot types

### Machine Learning Workflow
- [ ] Split data into train/validation/test sets
- [ ] Preprocess data (scaling, encoding, imputation)
- [ ] Build and use sklearn pipelines
- [ ] Train a model and evaluate performance
- [ ] Save and load trained models

### Environment
- [ ] Have a working Python environment (local or Colab)
- [ ] Can install packages with pip
- [ ] Know how to debug common errors

---

## 🎓 Success Test: Can You Build This?

**The Ultimate Week 0 Test:**

Create a complete ML pipeline that:
1. Loads the Titanic dataset using Pandas
2. Explores the data with Matplotlib visualizations
3. Preprocesses features (handles missing data, scales numerical features, encodes categorical)
4. Splits into train/test sets
5. Trains a Random Forest classifier using sklearn
6. Evaluates with confusion matrix and classification report
7. Saves the trained pipeline with joblib

**If you can do this without looking things up → You're ready for Week 1!** ✅

---

## 🛠️ Quick Setup (If You're Impatient)

### Option A: Google Colab (Recommended Start)
```
1. Go to colab.research.google.com
2. Sign in with Google account
3. New notebook
4. Runtime → Change runtime type → GPU
5. Done! Start coding.
```

### Option B: Local Setup (Quick Version)
```bash
# Windows
python -m venv ai-course
ai-course\Scripts\activate
pip install torch torchvision numpy pandas matplotlib seaborn scikit-learn jupyter

# Mac/Linux
python3 -m venv ai-course
source ai-course/bin/activate
pip install torch torchvision numpy pandas matplotlib seaborn scikit-learn jupyter
```

---

## 📖 How This Week Connects

```
Week 0: Python + NumPy + PyTorch + Environment
    │
    ├──► Week 1: Neural Networks (uses NumPy, PyTorch)
    │
    ├──► Week 2: GANs/VAEs (uses PyTorch)
    │
    └──► ALL WEEKS: Everything builds on Week 0 foundations!
```

---

## 🆘 If You're Stuck

1. **Check 06-Common-Errors-Solutions.md** first
2. **Google the exact error message**
3. **Stack Overflow** (99% of errors are answered there)
4. **PyTorch forums** for PyTorch-specific issues
5. **Don't spend more than 30 minutes on setup issues** – use Colab as fallback

---

## 🎯 Success Criteria

You're ready for Week 1 when you can run this without errors:

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import torch
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

# NumPy basics
arr = np.array([[1, 2, 3], [4, 5, 6]])
print(f"Shape: {arr.shape}, Mean: {arr.mean()}")

# Pandas basics
df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})
print(df.describe())

# Matplotlib basics
plt.plot([1, 2, 3], [1, 4, 9])
plt.title('Test Plot')
plt.savefig('test.png')
print("Plot saved!")

# PyTorch basics
tensor = torch.tensor([[1.0, 2.0], [3.0, 4.0]], requires_grad=True)
result = (tensor ** 2).sum()
result.backward()
print(f"Gradients: {tensor.grad}")

# Sklearn basics
X, y = [[1], [2], [3], [4]], [0, 0, 1, 1]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5)
scaler = StandardScaler().fit(X_train)
model = RandomForestClassifier().fit(scaler.transform(X_train), y_train)
print(f"Model accuracy: {model.score(scaler.transform(X_test), y_test)}")

# GPU check (optional but good to know)
print(f"CUDA available: {torch.cuda.is_available()}")
```

If this runs successfully, **proceed to Week 1!** 🚀
