# 🎨 Week 2: Deep Generative Models

## 📌 Overview

Welcome to the **creative side of AI**! This week, you'll learn how neural networks can **generate** new content - images, data, and more. By the end, you'll understand the foundations behind technologies like DALL-E, Stable Diffusion, and other generative AI systems.

---

## 🎯 Learning Objectives

After completing Week 2, you will:

| Objective | Outcome |
|-----------|---------|
| Understand generative vs discriminative | Know when and why to use each |
| Master GANs | Build generators that create realistic images |
| Master VAEs | Understand latent spaces and probabilistic generation |
| Use TensorBoard | Visualize training and debug models |
| Build real projects | GAN for digits, VAE for faces |

---

## 📚 Week 2 Contents

| # | File | Topics Covered |
|---|------|----------------|
| 1 | [01-Discriminative-vs-Generative.md](./01-Discriminative-vs-Generative.md) | Model types, probability distributions, use cases |
| 2 | [02-GANs.md](./02-GANs.md) | GAN architecture, training dynamics, loss functions |
| 3 | [03-GAN-Variants.md](./03-GAN-Variants.md) | DCGAN, WGAN, StyleGAN, conditional GANs |
| 4 | [04-VAEs.md](./04-VAEs.md) | Variational inference, reparameterization, ELBO |
| 5 | [05-TensorBoard.md](./05-TensorBoard.md) | Logging, visualization, debugging |
| 6 | [06-Projects.md](./06-Projects.md) | GAN digits, VAE faces, latent space exploration |
| 7 | [07-Interview-QA.md](./07-Interview-QA.md) | 50+ interview questions with answers |

---

## 🗓️ Suggested Learning Path

```
Day 1-2: Generative Models Foundation
         ├── Discriminative vs Generative
         ├── Probability distributions
         └── Why generation is hard

Day 3-4: GANs Deep Dive
         ├── Vanilla GAN
         ├── Training challenges
         └── DCGAN implementation

Day 5-6: VAEs + TensorBoard
         ├── Variational inference
         ├── Reparameterization trick
         └── Visualization tools

Day 7:   Projects + Interview Prep
         ├── Build GAN for MNIST
         ├── Build VAE for faces
         └── Practice questions
```

---

## 🔗 Prerequisites

**Required (from Week 1):**
- Neural network fundamentals
- Backpropagation
- PyTorch basics
- CNN architecture

**Helpful:**
- Probability distributions
- KL divergence (we'll cover it)

---

## 💡 Why This Week Matters

```
Week 2 Generative Models
       │
       ├── Week 3: Transformers (language generation)
       │           ↑ Uses generation concepts
       │
       ├── Week 5: RAG (retrieval + generation)
       │           ↑ Combines retrieval with generation
       │
       ├── Week 7: Diffusion Models
       │           ↑ Modern image generation
       │
       └── Foundation for ALL generative AI!
```

**Generative AI is the hottest field in AI right now!**

---

## 🛠️ Setup Required

### Additional Packages

```bash
# Activate your environment
ai-course\Scripts\activate  # Windows

# Install additional packages
pip install tensorboard
pip install torchvision
pip install matplotlib seaborn
pip install tqdm
pip install pillow
```

### Verify Installation

```python
import torch
import torchvision
from torch.utils.tensorboard import SummaryWriter

print(f"PyTorch: {torch.__version__}")
print(f"Torchvision: {torchvision.__version__}")

# Test TensorBoard
writer = SummaryWriter('runs/test')
writer.add_scalar('test', 1.0, 0)
writer.close()
print("TensorBoard: Working!")
```

---

## 🎨 What You'll Build This Week

### Project 1: GAN for MNIST Digits
```
Random Noise → Generator → Fake Digit Images
                              ↓
                         Discriminator
                              ↓
                         Real or Fake?
                         
Result: Generator learns to create realistic handwritten digits!
```

### Project 2: VAE for Face Generation
```
Face Image → Encoder → Latent Space → Decoder → Reconstructed Face
                           ↓
                    Can sample new faces!
                    Can interpolate between faces!
```

---

## 📖 Key Concepts Preview

### Discriminative Models (Week 1)
```
Input X → Model → Label Y
"Given an image, what digit is it?"

Models P(Y|X) - probability of label given input
```

### Generative Models (Week 2)
```
Random Noise Z → Model → Output X
"Generate a new image of digit 7"

Models P(X) or P(X|Z) - probability of data
```

---

## ✅ Week 2 Checklist

- [ ] Understand discriminative vs generative models
- [ ] Know what GANs are and how they work
- [ ] Understand the min-max game in GANs
- [ ] Can explain mode collapse and how to fix it
- [ ] Understand VAEs and the ELBO
- [ ] Know the reparameterization trick
- [ ] Can use TensorBoard for visualization
- [ ] Complete GAN project
- [ ] Complete VAE project
- [ ] Can answer interview questions

---

## 🚀 Let's Begin!

Start with → [01-Discriminative-vs-Generative.md](./01-Discriminative-vs-Generative.md)

---

*"The true sign of intelligence is not knowledge but imagination."*
*— Albert Einstein*

This week, we teach machines to imagine! 🎨
