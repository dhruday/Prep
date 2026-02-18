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

**Total Time:** ~10-12 hours

---

## 🗓️ Suggested Learning Path

```
Day 1: Python Bridge
├── 01-Python-for-Java-JS-Developers.md
├── Practice: Rewrite a small Java program in Python
└── Checkpoint: Can you write list comprehensions?

Day 2: NumPy Mastery
├── 02-NumPy-Crash-Course.md
├── Practice: Array manipulation exercises
└── Checkpoint: Can you explain broadcasting?

Day 3: PyTorch Basics
├── 03-PyTorch-Fundamentals.md
├── Practice: Create tensors, compute gradients
└── Checkpoint: Can you move tensors to GPU?

Day 4: Environment Setup
├── 04-Environment-Setup.md
├── 05-Google-Colab-Guide.md
├── Practice: Run code locally AND on Colab
└── Checkpoint: Both environments working?

Day 5: Troubleshooting + Review
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

- [ ] Write a Python function with type hints
- [ ] Use list comprehensions and f-strings
- [ ] Create and manipulate NumPy arrays
- [ ] Explain what broadcasting is
- [ ] Create PyTorch tensors
- [ ] Move tensors between CPU and GPU
- [ ] Compute gradients using autograd
- [ ] Run code in Google Colab
- [ ] Install packages with pip

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
pip install torch torchvision numpy matplotlib jupyter

# Mac/Linux
python3 -m venv ai-course
source ai-course/bin/activate
pip install torch torchvision numpy matplotlib jupyter
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
import torch

# NumPy basics
arr = np.array([[1, 2, 3], [4, 5, 6]])
print(f"Shape: {arr.shape}, Mean: {arr.mean()}")

# PyTorch basics
tensor = torch.tensor([[1.0, 2.0], [3.0, 4.0]], requires_grad=True)
result = (tensor ** 2).sum()
result.backward()
print(f"Gradients: {tensor.grad}")

# GPU check (optional but good to know)
print(f"CUDA available: {torch.cuda.is_available()}")
```

If this runs successfully, **proceed to Week 1!** 🚀
