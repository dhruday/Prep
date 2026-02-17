# 🧠 Week 1: Foundations of Generative AI

## 📌 Overview

Welcome to the **foundation of your AI journey**! This week builds the bedrock upon which ALL modern AI systems stand. By the end of this week, you'll understand:

- What AI actually is and isn't
- The mathematics that powers every neural network
- How neural networks learn
- Different network architectures and when to use them
- How to build your first AI models from scratch

---

## 🎯 Learning Objectives

After completing Week 1, you will:

| Objective | Outcome |
|-----------|---------|
| Understand AI fundamentals | Know the difference between AI/ML/DL/GenAI |
| Master essential math | Linear algebra, calculus, probability for AI |
| Build neural networks | Implement from scratch AND with PyTorch |
| Understand learning | Gradient descent, backpropagation internals |
| Know architectures | FNN, CNN, RNN - when and why |
| Complete projects | Working models you can show |

---

## 📚 Week 1 Contents

| # | File | Topics Covered |
|---|------|----------------|
| 1 | [01-Introduction-to-AI.md](./01-Introduction-to-AI.md) | What is AI, ML, DL, GenAI; history; landscape |
| 2 | [02-Mathematical-Foundations.md](./02-Mathematical-Foundations.md) | Linear algebra, calculus, probability for AI |
| 3 | [03-Neural-Networks.md](./03-Neural-Networks.md) | Perceptron, activation functions, forward prop |
| 4 | [04-Gradient-Descent-Optimization.md](./04-Gradient-Descent-Optimization.md) | Loss functions, backprop, optimizers |
| 5 | [05-Network-Architectures.md](./05-Network-Architectures.md) | FNN, CNN, RNN - architectures explained |
| 6 | [06-Projects.md](./06-Projects.md) | Simple NN, Autoencoder on MNIST |
| 7 | [07-Interview-QA.md](./07-Interview-QA.md) | 50+ interview questions with answers |

---

## 🗓️ Suggested Learning Path

```
Day 1-2: Introduction + Math Foundations
         ├── Understand AI landscape
         ├── Linear algebra essentials
         └── Calculus for gradients

Day 3-4: Neural Networks + Optimization
         ├── Build a perceptron
         ├── Understand backpropagation
         └── Implement gradient descent

Day 5-6: Architectures + Projects
         ├── CNN for images
         ├── RNN for sequences
         └── Build projects

Day 7:   Review + Interview Prep
         ├── Revise key concepts
         └── Practice interview questions
```

---

## 🔗 Prerequisites

**Required:**
- Basic programming (Python preferred, but JS/Java background works)
- High school math (we'll build from there)
- Curiosity and patience

**Helpful but not required:**
- Some statistics knowledge
- Linear algebra basics

---

## 💡 Why This Week Matters

```
Week 1 Foundation
       │
       ├── Week 2: Generative Models (GANs, VAEs)
       │           ↑ Uses neural network concepts
       │
       ├── Week 3: Transformers & LLMs
       │           ↑ Uses attention (neural networks)
       │
       ├── Week 4: Fine-Tuning & Agents
       │           ↑ Uses optimization concepts
       │
       ├── Week 5: RAG Systems
       │           ↑ Uses embeddings (neural nets)
       │
       └── Everything in AI builds on Week 1!
```

**Skip Week 1 = struggle with everything else**

---

## 🛠️ Setup Required

### Python Environment

```bash
# Create virtual environment
python -m venv ai-course
ai-course\Scripts\activate  # Windows

# Install packages
pip install numpy pandas matplotlib
pip install torch torchvision
pip install scikit-learn
pip install jupyter notebook
```

### Verify Installation

```python
import numpy as np
import torch
import matplotlib.pyplot as plt

print(f"NumPy: {np.__version__}")
print(f"PyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
```

---

## 📖 How to Use This Material

1. **Read each file in order** - They build on each other
2. **Type out all code** - Don't copy-paste
3. **Do the homework** - Practice solidifies learning
4. **Build the projects** - Real skills come from building
5. **Review interview questions** - Test your understanding

---

## ✅ Week 1 Checklist

- [ ] Understand AI/ML/DL/GenAI differences
- [ ] Can explain what a neural network does
- [ ] Understand matrix multiplication for ML
- [ ] Know what gradients are and why they matter
- [ ] Can implement a simple neural network from scratch
- [ ] Understand CNN architecture (convolutions, pooling)
- [ ] Understand RNN architecture (hidden states)
- [ ] Complete the Simple NN project
- [ ] Complete the Autoencoder project
- [ ] Can answer basic interview questions

---

## 🚀 Let's Begin!

Start with → [01-Introduction-to-AI.md](./01-Introduction-to-AI.md)

---

*"The journey of a thousand miles begins with a single step."*
*This week is that step.* 🎯
