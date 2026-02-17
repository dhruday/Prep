# 🎮 GANs - Generative Adversarial Networks

## 📌 Learning Goals

By the end of this file, you will:
- Understand the GAN architecture and training process
- Know the min-max game between generator and discriminator
- Understand GAN loss functions
- Identify and fix common training problems (mode collapse, instability)
- Implement a basic GAN from scratch

---

## 🎯 Beginner Friendly Explanation

### The Counterfeiter vs Detective Analogy 🕵️

Imagine a crime movie scenario:

**The Counterfeiter (Generator)**
```
Goal: Create fake $100 bills that look REAL

Starts: Terrible fakes (obvious)
Learns: From detective's feedback
Ends:   Perfect fakes (undetectable!)
```

**The Detective (Discriminator)**
```
Goal: Catch ALL fake bills

Has: Real $100 bills for reference
Does: Examines each bill
Says: "REAL" or "FAKE"
```

**The Game**
```
Round 1:
─────────
Counterfeiter: Makes obvious fake
Detective:     "Easy! FAKE!" (100% confident)
Counterfeiter: "I need to do better..."

Round 100:
──────────
Counterfeiter: Much better fake
Detective:     "Hmm... 70% sure it's fake"
Counterfeiter: "Getting closer!"

Round 10000:
────────────
Counterfeiter: Near-perfect fake
Detective:     "50/50... could be either!"
Counterfeiter: "YES! I've won!"

RESULT: Counterfeiter creates PERFECT fakes!
```

### Key Insight

```
Generator:     Wants to FOOL the Discriminator
Discriminator: Wants to CATCH the Generator

Both get BETTER by competing!
This is called ADVERSARIAL training.
```

---

## 🧠 Deep Technical Breakdown

### GAN Architecture

```
                    GENERATOR (G)
              ┌─────────────────────┐
              │                     │
   z (noise) ─│→ Neural Network  ───│→ Fake Image (G(z))
              │                     │
              └─────────────────────┘
                         │
                         ↓
              ┌─────────────────────┐
              │   DISCRIMINATOR (D) │
              │                     │
   Real/Fake ←│── Neural Network ←──│─ Real Image (x)
   Prob       │                     │  or Fake Image (G(z))
              └─────────────────────┘
              
              
Training Loop:
═════════════════════════════════════════════════
1. Sample random noise z
2. Generate fake image: fake = G(z)
3. Get real image from dataset: real
4. Train D to output 1 for real, 0 for fake
5. Train G to make D output 1 for fake (fool D!)
6. Repeat until G makes convincing fakes
```

### The Networks in Detail

#### Generator Network

```
INPUT: z ∈ ℝᵈ (random noise vector, typically d=100)
       z ~ N(0, 1) or z ~ Uniform(-1, 1)
       
PROCESS:
┌──────────────────────────────────────────────────┐
│  z (100)                                         │
│    ↓                                             │
│  Linear → 256 → LeakyReLU                        │
│    ↓                                             │
│  Linear → 512 → BatchNorm → LeakyReLU            │
│    ↓                                             │
│  Linear → 1024 → BatchNorm → LeakyReLU           │
│    ↓                                             │
│  Linear → 784 → Tanh                             │
│    ↓                                             │
│  Reshape → (1, 28, 28)                           │
└──────────────────────────────────────────────────┘

OUTPUT: Image with pixels in [-1, 1] (Tanh range)
```

#### Discriminator Network

```
INPUT: x ∈ ℝ^(28×28) (image, real or fake)

PROCESS:
┌──────────────────────────────────────────────────┐
│  Image (1, 28, 28)                               │
│    ↓                                             │
│  Flatten → 784                                   │
│    ↓                                             │
│  Linear → 512 → LeakyReLU(0.2) → Dropout(0.3)    │
│    ↓                                             │
│  Linear → 256 → LeakyReLU(0.2) → Dropout(0.3)    │
│    ↓                                             │
│  Linear → 1 → Sigmoid                            │
└──────────────────────────────────────────────────┘

OUTPUT: Probability that input is REAL ∈ [0, 1]
```

---

## 📐 The Min-Max Game

### GAN Objective Function

The famous min-max game:

```
min max V(D, G) = 𝔼ₓ~p_data[log D(x)] + 𝔼ᵤ~p_z[log(1 - D(G(z)))]
 G   D

Translation:
─────────────────────────────────────────────────────────
Term 1: 𝔼ₓ~p_data[log D(x)]
        ├── x is a REAL image
        ├── D(x) should be close to 1
        ├── log(1) = 0 (best case)
        └── D wants to MAXIMIZE this

Term 2: 𝔼ᵤ~p_z[log(1 - D(G(z)))]
        ├── G(z) is a FAKE image
        ├── D(G(z)) should be close to 0 (D's perspective)
        ├── log(1-0) = log(1) = 0 (D's best case)
        ├── D wants to MAXIMIZE this
        └── G wants to MINIMIZE this (make D(G(z)) → 1)
```

### Understanding Each Player's Goal

```
DISCRIMINATOR'S GOAL: max V
═══════════════════════════════════════
• For real images x: Want D(x) → 1
  So log D(x) → log(1) = 0 (maximized)
  
• For fake images G(z): Want D(G(z)) → 0
  So log(1 - D(G(z))) → log(1) = 0 (maximized)

D's loss function (to MINIMIZE):
L_D = -[log D(x) + log(1 - D(G(z)))]
    = -log D(x) - log(1 - D(G(z)))


GENERATOR'S GOAL: min V (only the second term)
═══════════════════════════════════════
• Want D(G(z)) → 1 (fool D!)
• Original: min log(1 - D(G(z)))
  
Problem: When D(G(z)) → 0 (early training),
         gradient of log(1 - D(G(z))) is very small!
         
Solution: Instead MAXIMIZE log D(G(z))

G's loss function (to MINIMIZE):
L_G = -log D(G(z))

This gives stronger gradients early in training!
```

---

## 🔢 Mathematical Formulas

### Loss Functions

#### Discriminator Loss

```
L_D = -1/m Σᵢ [log D(xᵢ) + log(1 - D(G(zᵢ)))]

Where:
• m = batch size
• xᵢ = real images from dataset
• zᵢ = random noise vectors
• G(zᵢ) = generated fake images
• D(·) = discriminator output (probability)
```

#### Generator Loss (Practical Version)

```
L_G = -1/m Σᵢ log D(G(zᵢ))

Why not the original?
─────────────────────
Original: L_G = 1/m Σᵢ log(1 - D(G(zᵢ)))

Early training: D(G(z)) ≈ 0 (D easily spots fakes)
               log(1 - 0) = 0 → tiny gradient!
               
Practical:    -log D(G(z))
              -log(0) → very large → strong gradient!
              
This is called the "non-saturating" GAN loss
```

### Optimal Discriminator

```
Given a fixed Generator G, the optimal Discriminator is:

D*_G(x) = p_data(x) / (p_data(x) + p_G(x))

Where:
• p_data(x) = true data distribution
• p_G(x) = generator's distribution

When G is perfect (p_G = p_data):
D*(x) = p_data / (p_data + p_data) = 1/2

The discriminator can't tell the difference!
```

### Global Optimum

```
The global minimum of V(G, D) is achieved when:

p_G = p_data

At this point:
V(G*, D*) = -log(4)

And D*(x) = 1/2 for all x
```

---

## 📊 Visual Training Process

### Training Flow

```
Epoch 0 (Untrained):
═══════════════════════════════════════════════════

Generator Output:     Real Images:
┌─────────────┐       ┌─────────────┐
│ ░░░░░░░░░░░ │       │     888     │
│ ░░ NOISE ░░ │       │    8   8    │
│ ░░░░░░░░░░░ │       │     888     │
└─────────────┘       └─────────────┘
Discriminator: "FAKE!"  Discriminator: "REAL!"
Confidence: 99%         Confidence: 99%


Epoch 100:
═══════════════════════════════════════════════════

Generator Output:     Real Images:
┌─────────────┐       ┌─────────────┐
│     ???     │       │     888     │
│    ?   ?    │       │    8   8    │
│     ???     │       │     888     │
└─────────────┘       └─────────────┘
Discriminator: "Fake?"  Discriminator: "REAL!"
Confidence: 70%         Confidence: 90%


Epoch 1000 (Well-trained):
═══════════════════════════════════════════════════

Generator Output:     Real Images:
┌─────────────┐       ┌─────────────┐
│     888     │       │     888     │
│    8   8    │       │    8   8    │
│     888     │       │     888     │
└─────────────┘       └─────────────┘
Discriminator: "???"   Discriminator: "???"
Confidence: 50%        Confidence: 50%

PERFECT! Generator fools discriminator!
```

### Loss Curves

```
Loss vs Training Steps
│
│ D_loss
│  \    ____
│   \  /    \____
│    \/          \___   (should stabilize)
│                    ‾‾‾
│
│ G_loss
│        /\    /\
│       /  \  /  \___
│  ____/    \/       ‾‾‾  (should decrease then stabilize)
│ /
└─────────────────────────→ Steps

Good training: Both losses stabilize
Bad training:  D_loss → 0 (D always wins, G not learning)
```

---

## 🧪 Complete Implementation

### Basic GAN for MNIST

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt
import numpy as np

# ============================================
# HYPERPARAMETERS
# ============================================
LATENT_DIM = 100      # Noise vector dimension
HIDDEN_DIM = 256      # Hidden layer size
IMAGE_DIM = 784       # 28 x 28
BATCH_SIZE = 64
EPOCHS = 200
LR = 0.0002           # Learning rate
BETA1 = 0.5           # Adam beta1

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# ============================================
# GENERATOR NETWORK
# ============================================
class Generator(nn.Module):
    """
    Generator: z (noise) → fake image
    
    Architecture:
    100 → 256 → 512 → 1024 → 784 → reshape to 28x28
    """
    def __init__(self, latent_dim=LATENT_DIM):
        super(Generator, self).__init__()
        
        self.model = nn.Sequential(
            # Input: latent vector z
            nn.Linear(latent_dim, 256),
            nn.LeakyReLU(0.2),
            
            nn.Linear(256, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            
            nn.Linear(512, 1024),
            nn.BatchNorm1d(1024),
            nn.LeakyReLU(0.2),
            
            # Output layer
            nn.Linear(1024, IMAGE_DIM),
            nn.Tanh()  # Output in [-1, 1]
        )
    
    def forward(self, z):
        """Generate fake image from noise z"""
        img = self.model(z)
        return img.view(-1, 1, 28, 28)

# ============================================
# DISCRIMINATOR NETWORK
# ============================================
class Discriminator(nn.Module):
    """
    Discriminator: image → P(real)
    
    Architecture:
    784 → 1024 → 512 → 256 → 1
    """
    def __init__(self):
        super(Discriminator, self).__init__()
        
        self.model = nn.Sequential(
            # Input: flattened image
            nn.Flatten(),
            
            nn.Linear(IMAGE_DIM, 1024),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(1024, 512),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            # Output: probability
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, img):
        """Classify image as real (1) or fake (0)"""
        return self.model(img)

# ============================================
# TRAINING SETUP
# ============================================

# Data loading
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5])  # Scale to [-1, 1]
])

dataset = datasets.MNIST(
    root='./data', 
    train=True, 
    download=True, 
    transform=transform
)
dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

# Initialize networks
generator = Generator(LATENT_DIM).to(device)
discriminator = Discriminator().to(device)

# Loss function
criterion = nn.BCELoss()

# Optimizers
optimizer_G = optim.Adam(generator.parameters(), lr=LR, betas=(BETA1, 0.999))
optimizer_D = optim.Adam(discriminator.parameters(), lr=LR, betas=(BETA1, 0.999))

# Fixed noise for visualization
fixed_noise = torch.randn(64, LATENT_DIM, device=device)

# ============================================
# TRAINING LOOP
# ============================================
def train_gan(epochs=EPOCHS):
    """
    Training procedure:
    1. Train Discriminator: maximize log(D(x)) + log(1 - D(G(z)))
    2. Train Generator: maximize log(D(G(z)))
    """
    G_losses = []
    D_losses = []
    
    for epoch in range(epochs):
        for batch_idx, (real_images, _) in enumerate(dataloader):
            batch_size = real_images.size(0)
            real_images = real_images.to(device)
            
            # Labels
            real_labels = torch.ones(batch_size, 1, device=device)
            fake_labels = torch.zeros(batch_size, 1, device=device)
            
            # ========================================
            # TRAIN DISCRIMINATOR
            # Goal: Correctly classify real vs fake
            # ========================================
            optimizer_D.zero_grad()
            
            # Loss on real images
            outputs_real = discriminator(real_images)
            loss_real = criterion(outputs_real, real_labels)
            
            # Generate fake images
            z = torch.randn(batch_size, LATENT_DIM, device=device)
            fake_images = generator(z)
            
            # Loss on fake images
            outputs_fake = discriminator(fake_images.detach())  # detach to not train G
            loss_fake = criterion(outputs_fake, fake_labels)
            
            # Total discriminator loss
            loss_D = loss_real + loss_fake
            loss_D.backward()
            optimizer_D.step()
            
            # ========================================
            # TRAIN GENERATOR
            # Goal: Fool the discriminator
            # ========================================
            optimizer_G.zero_grad()
            
            # Generate fake images (again, or reuse)
            z = torch.randn(batch_size, LATENT_DIM, device=device)
            fake_images = generator(z)
            
            # We want D to output 1 (real) for our fakes
            outputs = discriminator(fake_images)
            loss_G = criterion(outputs, real_labels)  # Note: real_labels!
            
            loss_G.backward()
            optimizer_G.step()
            
            # ========================================
            # Logging
            # ========================================
            G_losses.append(loss_G.item())
            D_losses.append(loss_D.item())
        
        # Print progress
        if (epoch + 1) % 10 == 0:
            print(f'Epoch [{epoch+1}/{epochs}] | '
                  f'D Loss: {loss_D.item():.4f} | '
                  f'G Loss: {loss_G.item():.4f}')
            
            # Save sample images
            save_samples(epoch + 1)
    
    return G_losses, D_losses

# ============================================
# VISUALIZATION
# ============================================
def save_samples(epoch, n_images=64):
    """Generate and save sample images"""
    generator.eval()
    with torch.no_grad():
        fake_images = generator(fixed_noise)
        fake_images = fake_images.cpu().numpy()
    
    # Create grid
    fig, axes = plt.subplots(8, 8, figsize=(8, 8))
    for i, ax in enumerate(axes.flat):
        if i < n_images:
            img = fake_images[i].squeeze()
            img = (img + 1) / 2  # Scale back to [0, 1]
            ax.imshow(img, cmap='gray')
        ax.axis('off')
    
    plt.suptitle(f'Epoch {epoch}')
    plt.tight_layout()
    plt.savefig(f'gan_epoch_{epoch}.png')
    plt.close()
    generator.train()

# Run training
print("Starting GAN training...")
G_losses, D_losses = train_gan(epochs=100)

# Plot losses
plt.figure(figsize=(10, 5))
plt.plot(G_losses, label='Generator Loss', alpha=0.6)
plt.plot(D_losses, label='Discriminator Loss', alpha=0.6)
plt.xlabel('Iterations')
plt.ylabel('Loss')
plt.legend()
plt.title('GAN Training Losses')
plt.savefig('gan_losses.png')
plt.show()
```

---

## ⚠️ Common Problems & Solutions

### Problem 1: Mode Collapse

```
SYMPTOM:
─────────
Generator produces same image repeatedly
Only generates "one mode" of the data distribution

Example:
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│  8  │ │  8  │ │  8  │ │  8  │  ← Always produces 8!
└─────┘ └─────┘ └─────┘ └─────┘

WHY IT HAPPENS:
───────────────
G finds ONE image that fools D consistently
G "collapses" to producing only that

SOLUTIONS:
──────────
1. Feature Matching: Match statistics of D's features
2. Mini-batch Discrimination: D sees batch, not individual
3. Unrolled GANs: G looks ahead at D's response
4. Use WGAN or WGAN-GP (better loss function)
```

### Problem 2: Training Instability

```
SYMPTOM:
─────────
Losses oscillate wildly
Quality suddenly degrades
Training doesn't converge

WHY IT HAPPENS:
───────────────
G and D are "chasing" each other
Gradients explode or vanish

SOLUTIONS:
──────────
1. Use spectral normalization
2. Two-timescale update rule (train D more)
3. Gradient penalty (WGAN-GP)
4. Careful hyperparameter tuning
5. Use progressive growing
```

### Problem 3: Discriminator Too Strong

```
SYMPTOM:
─────────
D loss → 0 quickly
G loss stays high
G produces noise

WHY IT HAPPENS:
───────────────
D can easily distinguish real from fake
G gets no useful gradients

SOLUTIONS:
──────────
1. Train G more often (2:1 or 3:1 ratio)
2. Add noise to D's inputs
3. Use label smoothing (real = 0.9, not 1.0)
4. Use weaker D architecture
5. Use WGAN (no saturation)
```

### Problem 4: Generator Not Learning

```
SYMPTOM:
─────────
Generated images look like noise
G loss doesn't decrease

WHY IT HAPPENS:
───────────────
G can't learn the data distribution
Architecture too simple or LR too low

SOLUTIONS:
──────────
1. Larger G capacity
2. Higher learning rate for G
3. Use transposed convolutions (DCGAN)
4. Better initialization
5. LeakyReLU instead of ReLU
```

---

## 🔧 GAN Training Tips (Best Practices)

```
1. ARCHITECTURE
   ├── Use BatchNorm in G (not in last layer)
   ├── Use LeakyReLU (slope=0.2) everywhere
   ├── Use Tanh in G's output layer
   ├── Don't use BatchNorm in D's first layer
   └── Use Dropout in D (0.3-0.5)

2. TRAINING
   ├── Use Adam optimizer
   ├── Learning rate: 0.0002 (lower is safer)
   ├── Beta1 = 0.5 (not default 0.9)
   ├── Train D and G same number of times (usually)
   └── Use label smoothing: real=0.9, fake=0.1

3. STABILITY
   ├── Use spectral normalization
   ├── Gradient clipping
   ├── Careful weight initialization
   └── Monitor both losses during training

4. DATA
   ├── Normalize to [-1, 1] (for Tanh)
   ├── Use enough data
   └── Augment if needed
```

---

## 📝 Homework

### Easy
1. Explain the counterfeiter-detective analogy in your own words
2. What happens if the discriminator becomes too strong?
3. Why do we use Tanh activation in the generator's output?

### Medium
4. Derive the optimal discriminator D* given a fixed generator G
5. Why do we use the non-saturating loss `-log(D(G(z)))` instead of `log(1-D(G(z)))`?
6. Modify the code to generate only digits 0-3 (hint: filter dataset)

### Hard
7. Implement label smoothing and compare training stability
8. Add a learning rate scheduler and analyze its effect
9. Explain mathematically why mode collapse happens

---

## 🎯 Interview Questions & Answers

### Q1: What is the GAN objective function?
**A**: The minimax game:
```
min max V(D,G) = 𝔼[log D(x)] + 𝔼[log(1-D(G(z)))]
 G   D
```
D maximizes (classify correctly), G minimizes (fool D).

### Q2: What is mode collapse and how do you fix it?
**A**: Mode collapse is when G produces limited variety (only some modes of the distribution). Solutions:
- Mini-batch discrimination
- Feature matching
- Unrolled GANs
- WGAN with gradient penalty

### Q3: Why use LeakyReLU instead of ReLU?
**A**: ReLU can cause "dead" neurons (gradient=0 for negative values). LeakyReLU maintains small gradient for negative values:
```
LeakyReLU(x) = max(0.2x, x)
```
This helps gradient flow and stabilizes training.

### Q4: What's the difference between GAN and VAE?
**A**: 
- **GAN**: Adversarial training, implicit density, sharp images
- **VAE**: Probabilistic, explicit ELBO, sometimes blurry
- GANs can't compute likelihood; VAEs can (lower bound)

### Q5: Why is GAN training unstable?
**A**: 
1. Zero-sum game - G and D fight each other
2. Gradient vanishing when D is perfect
3. No convergence guarantees
4. Mode collapse possibilities

Solutions: WGAN, spectral normalization, careful hyperparameters.

---

## 🔗 Next Steps

```
This Foundation (Vanilla GAN)
           │
           ├─→ 03-GAN-Variants.md
           │   ├── DCGAN (convolutional)
           │   ├── WGAN (stable training)
           │   ├── cGAN (conditional generation)
           │   └── StyleGAN (SOTA faces)
           │
           └─→ Projects: Generate your own digits!
```

---

Next: [03-GAN-Variants.md](./03-GAN-Variants.md) - DCGAN, WGAN, StyleGAN, and more!
