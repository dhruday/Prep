# 🎲 VAEs - Variational Autoencoders

## � Table of Contents

1. [Learning Goals](#-learning-goals)
2. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [The Math Behind VAE](#-the-math-behind-vae)
5. [The Reparameterization Trick](#-the-reparameterization-trick)
6. [Complete VAE Loss](#-complete-vae-loss)
7. [Complete VAE Implementation](#-complete-vae-implementation)
8. [Advanced VAE Concepts](#-advanced-vae-concepts)
9. [VAE vs GAN Comparison](#-vae-vs-gan-comparison)
10. [Homework](#-homework)
11. [Common Mistakes](#️-common-mistakes)
12. [Interview Questions & Answers](#-interview-questions--answers)
13. [Next Steps](#-next-steps)

---

## �📌 Learning Goals

By the end of this file, you will:
- Understand autoencoders and their limitations
- Master the VAE architecture and intuition
- Know the reparameterization trick and why it's needed
- Understand the ELBO (Evidence Lower Bound)
- Implement a VAE from scratch
- Know when to use VAE vs GAN

---

## 🎯 Beginner Friendly Explanation

### The Compression Analogy 📦

**Regular Autoencoder = Perfect Packer**
```
Original Item (Image)
       │
       ▼
┌─────────────┐
│   ENCODER   │  "Pack it into a small box"
│  (Compress) │
└─────────────┘
       │
       ▼
   Small Box        ← Latent representation (exact coordinates)
   [3.2, -1.5, 0.8]
       │
       ▼
┌─────────────┐
│   DECODER   │  "Unpack from the box"
│ (Decompress)│
└─────────────┘
       │
       ▼
Reconstructed Item (≈ Original)

Problem: Each item has ONE specific box location.
         Can't generate NEW items from random boxes!
```

**VAE = Smart Packer with Flexibility**
```
Original Item (Image)
       │
       ▼
┌─────────────┐
│   ENCODER   │  "Pack it into a REGION of boxes"
│             │
└─────────────┘
       │
       ▼
   Box REGION       ← Latent distribution (mean + spread)
   μ=[3.2, -1.5]    "Around here"
   σ=[0.5, 0.3]     "With this much flexibility"
       │
       ▼
   Sample a Box     ← Pick a point from the region
   z=[3.0, -1.7]
       │
       ▼
┌─────────────┐
│   DECODER   │  "Unpack from the sampled box"
└─────────────┘
       │
       ▼
Reconstructed Item (≈ Original)

BONUS: Sample ANY point in box space → Generate NEW items!
       z=[0.0, 0.0] → New face!
       z=[1.0, 2.0] → Another new face!
```

### Key Insight

```
AUTOENCODER:  Specific location for each image
              ├── Good for: Compression, denoising
              └── Bad for:  Generation (gaps in latent space)

VAE:          Region/distribution for each image
              ├── Good for: Generation!
              ├── Good for: Smooth latent space
              └── Trade-off: Slightly blurrier reconstructions
```

---

## 🧠 Deep Technical Breakdown

### Autoencoder Recap

```
STANDARD AUTOENCODER:
═══════════════════════════════════════════════════════

Input x ──→ [Encoder fθ] ──→ z ──→ [Decoder gφ] ──→ x̂

Where:
• z = fθ(x)     Deterministic encoding
• x̂ = gφ(z)     Reconstruction
• Loss = ||x - x̂||²   Reconstruction error


PROBLEM FOR GENERATION:
───────────────────────
Latent space has "holes"!

┌─────────────────────────────────┐
│     ●          ●                │
│         ●           ●           │
│                                 │
│  ●              ●               │
│        ●                  ●     │
│                                 │
│     ●      ●        ●           │
└─────────────────────────────────┘
         Latent space

Sampling from empty regions → garbage!
```

### VAE Architecture

```
VARIATIONAL AUTOENCODER:
═══════════════════════════════════════════════════════

            ENCODER                          DECODER
        ┌──────────────┐                 ┌──────────────┐
        │              │                 │              │
x ──────│──→ Neural ───│──→ μ, σ         │              │
        │    Network   │     │           │    Neural    │
        │              │     │           │    Network   │──────→ x̂
        └──────────────┘     │           │              │
                             ▼           │              │
                    ┌───────────────┐    └──────────────┘
                    │  Sample z     │          ▲
                    │  z = μ + σ⊙ε  │          │
                    │  ε ~ N(0,1)   │──────────┘
                    └───────────────┘
                    
Key Differences:
────────────────
1. Encoder outputs μ and σ (not z directly)
2. z is SAMPLED from N(μ, σ²)
3. ε ~ N(0,1) enables backpropagation (reparameterization)
4. Loss includes KL divergence term
```

### The Networks in Detail

```
ENCODER q(z|x):
═══════════════════════════════════════════════════════

Input x (e.g., 28×28 image)
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Flatten: 784                                       │
│     │                                               │
│     ▼                                               │
│  Linear(784 → 400) → ReLU                           │
│     │                                               │
│     ├──→ Linear(400 → latent_dim) ──→ μ (mean)     │
│     │                                               │
│     └──→ Linear(400 → latent_dim) ──→ log σ² (var) │
└─────────────────────────────────────────────────────┘

Output: μ ∈ ℝᵈ, log σ² ∈ ℝᵈ (typically d=20)


DECODER p(x|z):
═══════════════════════════════════════════════════════

Input z (sampled latent, e.g., 20-dim)
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Linear(latent_dim → 400) → ReLU                    │
│     │                                               │
│     ▼                                               │
│  Linear(400 → 784) → Sigmoid                        │
│     │                                               │
│     ▼                                               │
│  Reshape: 28×28                                     │
└─────────────────────────────────────────────────────┘

Output: x̂ ∈ [0,1]^784 (reconstructed image)
```

---

## 📐 The Math Behind VAE

### The Goal: Maximize Log-Likelihood

```
GOAL: Maximize p(x) - probability of the data

log p(x) = log ∫ p(x|z)p(z) dz

PROBLEM: This integral is intractable!
         We'd need to integrate over ALL possible z values.

SOLUTION: Instead of computing p(x) directly,
          maximize a lower bound (ELBO)
```

### Deriving the ELBO

```
EVIDENCE LOWER BOUND (ELBO):
═══════════════════════════════════════════════════════

Start with:
log p(x) = log ∫ p(x|z)p(z) dz

Introduce q(z|x) - our encoder's approximation of p(z|x):

log p(x) = log ∫ p(x|z)p(z) × (q(z|x)/q(z|x)) dz

         = log 𝔼_q(z|x)[p(x|z)p(z)/q(z|x)]

By Jensen's inequality (log of expectation ≥ expectation of log):

log p(x) ≥ 𝔼_q(z|x)[log(p(x|z)p(z)/q(z|x))]

         = 𝔼_q(z|x)[log p(x|z)] + 𝔼_q(z|x)[log(p(z)/q(z|x))]

         = 𝔼_q(z|x)[log p(x|z)] - KL(q(z|x) || p(z))
           ─────────────────────   ──────────────────
           Reconstruction term      KL divergence term


ELBO = 𝔼_q(z|x)[log p(x|z)] - KL(q(z|x) || p(z))
```

### Understanding the Two Terms

```
TERM 1: RECONSTRUCTION LOSS
═══════════════════════════════════════════════════════

𝔼_q(z|x)[log p(x|z)]

"How well can we reconstruct x from z?"

In practice:
• For binary/grayscale images: Binary Cross-Entropy
• For continuous values: Mean Squared Error

Recon_Loss = -Σ[xᵢ·log(x̂ᵢ) + (1-xᵢ)·log(1-x̂ᵢ)]  (BCE)
           = Σ(xᵢ - x̂ᵢ)²                           (MSE)


TERM 2: KL DIVERGENCE
═══════════════════════════════════════════════════════

KL(q(z|x) || p(z))

"How different is our learned distribution from the prior?"

q(z|x) = N(μ, σ²)     ← Encoder's output
p(z)   = N(0, I)      ← Prior (standard normal)

Closed-form solution:
KL = -½ Σᵢ(1 + log σᵢ² - μᵢ² - σᵢ²)

This term regularizes the latent space!
Forces encodings toward a standard normal distribution.
```

### Visual Understanding

```
WITHOUT KL TERM:
═══════════════════════════════════════════════════════

Latent space becomes like autoencoder:
┌─────────────────────────────────────┐
│                                     │
│  ●        ●●●●●●                    │
│         (digit 0)                   │
│                                     │
│                    ●●●●●●           │
│                   (digit 1)         │
│         GAP                         │
│ ●●●●●●                   ●●●●       │
│(digit 9)                 (digit 5)  │
│                                     │
└─────────────────────────────────────┘

Clusters are far apart → Gaps → Bad generation


WITH KL TERM:
═══════════════════════════════════════════════════════

Latent space is regularized:
┌─────────────────────────────────────┐
│                                     │
│     ○○○○                            │
│    ○○○○○○    ●●●                    │
│     ○○○○    ●●●●●                   │
│            ●●●●                     │
│    □□□□□□    ●●                     │
│   □□□□□□□□                          │
│    □□□□□□        ▲▲▲▲               │
│                 ▲▲▲▲▲               │
│                  ▲▲▲                │
└─────────────────────────────────────┘

Overlapping distributions → Smooth transitions → Good generation!
```

---

## 🔮 The Reparameterization Trick

### The Problem

```
THE SAMPLING PROBLEM:
═══════════════════════════════════════════════════════

Forward pass:
x → Encoder → μ, σ → Sample z ~ N(μ, σ²) → Decoder → x̂

The sampling step is NOT differentiable!
We can't backpropagate through random sampling.

How do we train this with gradient descent?
```

### The Solution

```
REPARAMETERIZATION TRICK:
═══════════════════════════════════════════════════════

Instead of:
z ~ N(μ, σ²)     (not differentiable)

Do:
ε ~ N(0, 1)      (sample standard normal)
z = μ + σ ⊙ ε    (deterministic transform)

Where ⊙ is element-wise multiplication.


VISUALIZATION:
──────────────

Before (can't backprop through sampling):
                ┌──────────┐
μ, σ ────────→ │ SAMPLE   │ ────→ z
                │(random!) │
                └──────────┘
                     ✗ No gradient!


After (can backprop!):
                ┌──────────┐
  ε ~ N(0,1) ──→│          │
                │ z = μ+σε │ ────→ z
  μ ──────────→│          │
  σ ──────────→│          │
                └──────────┘
                     ✓ Gradients flow through μ and σ!


WHY THIS WORKS:
───────────────
• Randomness is now from ε (fixed, not learned)
• z = μ + σε is a deterministic function of μ, σ
• Gradients can flow through μ and σ!

∂z/∂μ = 1
∂z/∂σ = ε
```

---

## 🔢 Complete VAE Loss

```
VAE LOSS:
═══════════════════════════════════════════════════════

L = Reconstruction_Loss + β × KL_Divergence

L = BCE(x, x̂) + β × KL(q(z|x) || p(z))

  = -Σᵢ[xᵢ·log(x̂ᵢ) + (1-xᵢ)·log(1-x̂ᵢ)]
    + β × (-½)Σⱼ(1 + log σⱼ² - μⱼ² - σⱼ²)

Where:
• i indexes pixels
• j indexes latent dimensions
• β is a hyperparameter (β=1 for standard VAE, β>1 for β-VAE)


TYPICAL VALUES:
───────────────
• Latent dim: 2 (for visualization) to 256 (for complex data)
• β = 1 (standard) or 4-10 (for disentanglement)
```

---

## 🧪 Complete VAE Implementation

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt
import numpy as np

# ============================================
# HYPERPARAMETERS
# ============================================
LATENT_DIM = 20       # Latent space dimension
HIDDEN_DIM = 400      # Hidden layer size
INPUT_DIM = 784       # 28 x 28
BATCH_SIZE = 128
EPOCHS = 50
LR = 1e-3
BETA = 1              # KL weight (1 for standard VAE)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# ============================================
# VAE MODEL
# ============================================
class VAE(nn.Module):
    """
    Variational Autoencoder for MNIST
    
    Encoder: x → μ, σ
    Latent:  z = μ + σ ⊙ ε, where ε ~ N(0, I)
    Decoder: z → x̂
    """
    
    def __init__(self, input_dim=INPUT_DIM, hidden_dim=HIDDEN_DIM, 
                 latent_dim=LATENT_DIM):
        super(VAE, self).__init__()
        
        # ========== ENCODER ==========
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        
        # Separate heads for μ and log(σ²)
        self.fc_mu = nn.Linear(hidden_dim, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim, latent_dim)
        
        # ========== DECODER ==========
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
            nn.Sigmoid()  # Output in [0, 1]
        )
    
    def encode(self, x):
        """
        Encode input to latent distribution parameters
        
        Args:
            x: Input image (batch_size, 784)
        Returns:
            mu: Mean of q(z|x)
            logvar: Log variance of q(z|x)
        """
        h = self.encoder(x)
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar
    
    def reparameterize(self, mu, logvar):
        """
        Reparameterization trick: z = μ + σ ⊙ ε
        
        Args:
            mu: Mean (batch_size, latent_dim)
            logvar: Log variance (batch_size, latent_dim)
        Returns:
            z: Sampled latent vector
        """
        # std = exp(0.5 * log(σ²)) = σ
        std = torch.exp(0.5 * logvar)
        
        # ε ~ N(0, I)
        eps = torch.randn_like(std)
        
        # z = μ + σ ⊙ ε
        z = mu + std * eps
        return z
    
    def decode(self, z):
        """
        Decode latent vector to reconstruction
        
        Args:
            z: Latent vector (batch_size, latent_dim)
        Returns:
            x_recon: Reconstructed image (batch_size, 784)
        """
        return self.decoder(z)
    
    def forward(self, x):
        """
        Full forward pass: x → μ, σ → z → x̂
        
        Returns:
            x_recon: Reconstruction
            mu: Latent mean
            logvar: Latent log variance
        """
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        x_recon = self.decode(z)
        return x_recon, mu, logvar
    
    def sample(self, num_samples, device):
        """
        Generate new samples from the prior
        
        Args:
            num_samples: Number of samples to generate
            device: Device to use
        Returns:
            samples: Generated images
        """
        # Sample from prior p(z) = N(0, I)
        z = torch.randn(num_samples, LATENT_DIM).to(device)
        samples = self.decode(z)
        return samples

# ============================================
# LOSS FUNCTION
# ============================================
def vae_loss(x_recon, x, mu, logvar, beta=BETA):
    """
    VAE Loss = Reconstruction + β × KL Divergence
    
    Args:
        x_recon: Reconstructed images
        x: Original images
        mu: Latent means
        logvar: Latent log variances
        beta: KL divergence weight
    Returns:
        loss: Total loss
        recon_loss: Reconstruction loss component
        kl_loss: KL divergence component
    """
    # Reconstruction loss (Binary Cross Entropy)
    recon_loss = F.binary_cross_entropy(x_recon, x, reduction='sum')
    
    # KL Divergence: KL(N(μ, σ²) || N(0, 1))
    # = -0.5 * Σ(1 + log(σ²) - μ² - σ²)
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    
    # Total loss
    loss = recon_loss + beta * kl_loss
    
    return loss, recon_loss, kl_loss

# ============================================
# DATA LOADING
# ============================================
transform = transforms.Compose([
    transforms.ToTensor()
])

train_dataset = datasets.MNIST(root='./data', train=True, 
                               download=True, transform=transform)
test_dataset = datasets.MNIST(root='./data', train=False, 
                              download=True, transform=transform)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

# ============================================
# TRAINING
# ============================================
model = VAE().to(device)
optimizer = torch.optim.Adam(model.parameters(), lr=LR)

def train_epoch(model, dataloader, optimizer, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    total_recon = 0
    total_kl = 0
    
    for batch_idx, (data, _) in enumerate(dataloader):
        data = data.view(-1, INPUT_DIM).to(device)
        
        optimizer.zero_grad()
        
        # Forward pass
        x_recon, mu, logvar = model(data)
        
        # Compute loss
        loss, recon_loss, kl_loss = vae_loss(x_recon, data, mu, logvar)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        total_recon += recon_loss.item()
        total_kl += kl_loss.item()
    
    n_samples = len(dataloader.dataset)
    return total_loss/n_samples, total_recon/n_samples, total_kl/n_samples

def test_epoch(model, dataloader, device):
    """Evaluate on test set"""
    model.eval()
    total_loss = 0
    
    with torch.no_grad():
        for data, _ in dataloader:
            data = data.view(-1, INPUT_DIM).to(device)
            x_recon, mu, logvar = model(data)
            loss, _, _ = vae_loss(x_recon, data, mu, logvar)
            total_loss += loss.item()
    
    return total_loss / len(dataloader.dataset)

# Training loop
print("Starting VAE training...")
train_losses = []
test_losses = []

for epoch in range(EPOCHS):
    train_loss, recon_loss, kl_loss = train_epoch(model, train_loader, 
                                                   optimizer, device)
    test_loss = test_epoch(model, test_loader, device)
    
    train_losses.append(train_loss)
    test_losses.append(test_loss)
    
    if (epoch + 1) % 5 == 0:
        print(f'Epoch {epoch+1}/{EPOCHS}')
        print(f'  Train Loss: {train_loss:.4f} (Recon: {recon_loss:.4f}, KL: {kl_loss:.4f})')
        print(f'  Test Loss:  {test_loss:.4f}')

# ============================================
# VISUALIZATION
# ============================================
def plot_reconstructions(model, dataloader, device, n=10):
    """Plot original vs reconstructed images"""
    model.eval()
    data, _ = next(iter(dataloader))
    data = data[:n]
    
    with torch.no_grad():
        data_flat = data.view(-1, INPUT_DIM).to(device)
        recon, _, _ = model(data_flat)
        recon = recon.view(-1, 1, 28, 28).cpu()
    
    fig, axes = plt.subplots(2, n, figsize=(15, 3))
    for i in range(n):
        # Original
        axes[0, i].imshow(data[i].squeeze(), cmap='gray')
        axes[0, i].axis('off')
        axes[0, i].set_title('Original')
        
        # Reconstruction
        axes[1, i].imshow(recon[i].squeeze(), cmap='gray')
        axes[1, i].axis('off')
        axes[1, i].set_title('Recon')
    
    plt.tight_layout()
    plt.savefig('vae_reconstructions.png')
    plt.show()

def plot_samples(model, device, n=10):
    """Generate and plot random samples"""
    model.eval()
    with torch.no_grad():
        samples = model.sample(n*n, device)
        samples = samples.view(-1, 1, 28, 28).cpu()
    
    fig, axes = plt.subplots(n, n, figsize=(10, 10))
    for i in range(n):
        for j in range(n):
            axes[i, j].imshow(samples[i*n + j].squeeze(), cmap='gray')
            axes[i, j].axis('off')
    
    plt.suptitle('VAE Generated Samples')
    plt.tight_layout()
    plt.savefig('vae_samples.png')
    plt.show()

def plot_latent_space(model, dataloader, device):
    """Visualize latent space (only for 2D latent)"""
    if LATENT_DIM != 2:
        print("Latent space visualization requires LATENT_DIM=2")
        return
    
    model.eval()
    latents = []
    labels = []
    
    with torch.no_grad():
        for data, label in dataloader:
            data = data.view(-1, INPUT_DIM).to(device)
            mu, _ = model.encode(data)
            latents.append(mu.cpu().numpy())
            labels.append(label.numpy())
    
    latents = np.concatenate(latents)
    labels = np.concatenate(labels)
    
    plt.figure(figsize=(10, 10))
    scatter = plt.scatter(latents[:, 0], latents[:, 1], c=labels, 
                         cmap='tab10', alpha=0.5, s=1)
    plt.colorbar(scatter)
    plt.xlabel('z₁')
    plt.ylabel('z₂')
    plt.title('VAE Latent Space')
    plt.savefig('vae_latent_space.png')
    plt.show()

# Generate visualizations
plot_reconstructions(model, test_loader, device)
plot_samples(model, device)

print("Training complete!")
```

---

## 🌟 Advanced VAE Concepts

### β-VAE (Disentangled VAE)

```
β-VAE:
═══════════════════════════════════════════════════════

L = Recon_Loss + β × KL_Loss

When β > 1:
• Stronger regularization on latent space
• More disentangled representations
• Each latent dimension captures ONE factor

Example (faces):
z₁ → controls rotation
z₂ → controls smile
z₃ → controls glasses
...

Trade-off: Higher β → Better disentanglement
                    → Worse reconstruction quality
```

### Conditional VAE (CVAE)

```
CONDITIONAL VAE:
═══════════════════════════════════════════════════════

Like VAE but conditioned on label c:

Encoder: q(z|x, c)
Decoder: p(x|z, c)

x + c → Encoder → μ, σ → Sample z → z + c → Decoder → x̂

Now you can:
• Generate specific digits: c=3 → Generate "3"
• Control generation with attributes
```

### VQ-VAE (Vector Quantized VAE)

```
VQ-VAE:
═══════════════════════════════════════════════════════

Instead of continuous latent space:
Use discrete codebook!

z_continuous → Find nearest codebook entry → z_quantized

Benefits:
• Discrete representations
• No posterior collapse
• Used in DALL-E (image generation)
```

---

## 📊 VAE vs GAN Comparison

| Aspect | VAE | GAN |
|--------|-----|-----|
| **Training** | Stable | Can be unstable |
| **Density** | Explicit (lower bound) | Implicit |
| **Samples** | Sometimes blurry | Often sharper |
| **Latent Space** | Smooth, continuous | May have gaps |
| **Mode Coverage** | Good | Prone to mode collapse |
| **Likelihood** | Can estimate | Cannot |
| **Best For** | Smooth interpolation, representation learning | High-quality images |

---

## 📝 Homework

### Easy
1. Explain the reparameterization trick in simple terms
2. What are the two terms in the VAE loss and what do they do?
3. Why does VAE produce smoother latent spaces than autoencoders?

### Medium
4. Implement a VAE with 2D latent space and visualize the latent codes
5. Create a function to interpolate between two images in latent space
6. Modify the VAE to use convolutional layers

### Hard
7. Implement β-VAE and compare disentanglement at different β values
8. Implement Conditional VAE for controlled digit generation
9. Derive the KL divergence formula for two Gaussians

---

## ⚠️ Common Mistakes

### Mistake 1: Forgetting to use log variance
```
❌ Wrong: fc_var outputs σ directly
   Problem: σ must be positive, network can output negative

✅ Right: fc_logvar outputs log(σ²)
   Then: σ = exp(0.5 * logvar)
   Always positive!
```

### Mistake 2: Wrong reconstruction loss
```
❌ Wrong: Using MSE when data is normalized to [0,1]
   Can work, but not optimal

✅ Right: Use BCE for [0,1] normalized images
         Use MSE for [-1,1] or unnormalized data
```

### Mistake 3: KL collapse (posterior collapse)
```
❌ Problem: Model ignores z, decoder generates from prior alone

Why: KL term too strong early in training

✅ Solutions:
   • KL annealing: Start β=0, gradually increase to 1
   • Free bits: Allow minimum KL per dimension
   • Use stronger decoder architecture
```

---

## 🎯 Interview Questions & Answers

### Q1: What is the reparameterization trick and why is it needed?
**A**: The reparameterization trick reformulates sampling z ~ N(μ, σ²) as z = μ + σ⊙ε where ε ~ N(0,1). This is needed because we can't backpropagate through random sampling. By moving randomness to ε, z becomes a deterministic function of μ and σ, enabling gradient flow.

### Q2: What is the ELBO and how does it relate to p(x)?
**A**: ELBO (Evidence Lower BOund) is a lower bound on log p(x):
```
log p(x) ≥ ELBO = 𝔼[log p(x|z)] - KL(q(z|x) || p(z))
```
Since we can't compute log p(x) directly, we maximize ELBO instead, which indirectly maximizes log p(x).

### Q3: Why are VAE samples sometimes blurrier than GAN samples?
**A**: VAE optimizes reconstruction loss (like MSE or BCE), which encourages average-looking outputs. GANs use adversarial loss, which encourages realistic samples. The KL term also constrains VAE's latent space, limiting expressiveness.

### Q4: What is the KL divergence term doing?
**A**: The KL term regularizes the latent space by pulling q(z|x) toward the prior p(z)=N(0,I). This creates:
1. A smooth, continuous latent space
2. No holes/gaps between encodings
3. Ability to sample from prior for generation

### Q5: How would you modify VAE for conditional generation?
**A**: Create a Conditional VAE (CVAE):
1. Encoder takes both x and condition c: q(z|x,c)
2. Decoder takes both z and c: p(x|z,c)
3. Concatenate one-hot encoded c to inputs
4. Training: provide true labels
5. Generation: sample z ~ N(0,I) and specify desired c

---

## 🔗 Next Steps

```
VAE Foundation
     │
     ├─→ 05-TensorBoard.md
     │   └── Visualize your training!
     │
     └─→ 06-Projects.md
         ├── GAN for MNIST digits
         └── VAE for face generation
```

---

Next: [05-TensorBoard.md](./05-TensorBoard.md) - Visualize and debug your models!
