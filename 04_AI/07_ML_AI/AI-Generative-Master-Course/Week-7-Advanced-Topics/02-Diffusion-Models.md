# 🎨 Diffusion Models

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [Mathematical Foundation](#-mathematical-foundation)
5. [Architecture: U-Net](#-architecture-u-net)
6. [Training & Sampling](#-training--sampling)
7. [Stable Diffusion](#-stable-diffusion)
8. [Implementation](#-implementation)
9. [Advanced Techniques](#-advanced-techniques)
10. [Hands-On Project](#-hands-on-project)
11. [Common Mistakes](#-common-mistakes)
12. [Interview Questions](#-interview-questions)
13. [Homework](#-homework)

---

## 🎯 Introduction

**Diffusion Models** are a class of generative models that create data by learning to reverse a gradual noising process. They power **Stable Diffusion**, **DALL-E 2**, **Midjourney**, and **Imagen** - the state-of-the-art in image generation.

### Why Diffusion Models Matter

| Model Type | Image Quality | Training Stability | Diversity | Mode Coverage |
|------------|--------------|-------------------|-----------|---------------|
| GANs | High | ❌ Unstable | Medium | ❌ Mode collapse |
| VAEs | Medium | ✅ Stable | High | ✅ Good |
| **Diffusion** | **Very High** | ✅ **Stable** | **High** | ✅ **Excellent** |

### Timeline of Diffusion Models

```
┌─────────────────────────────────────────────────────────────┐
│              DIFFUSION MODELS TIMELINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  2015  │ Sohl-Dickstein: First diffusion models             │
│  2020  │ DDPM: Denoising Diffusion Probabilistic Models     │
│  2021  │ DDIM: Fast sampling (10-50 steps)                  │
│  2021  │ Classifier-Free Guidance: Better control           │
│  2022  │ Stable Diffusion: Open-source text-to-image        │
│  2022  │ DALL-E 2: OpenAI's masterpiece                     │
│  2022  │ Midjourney: Artistic generation                    │
│  2023  │ SDXL, SD3: Higher resolution, better quality       │
│  2024  │ Sora: Video generation with diffusion              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧒 Beginner Explanation

### The "Ink in Water" Analogy

Imagine you drop a drop of ink into clear water:

**Forward Process (Adding Noise):**
```
T=0:   🔵 Clear drop of ink (original image)
T=100: 🔵~ Ink starts spreading
T=500: ~~~~ Ink is diffusing...
T=1000: ▒▒▒▒ Completely mixed (pure noise)
```

**Reverse Process (Removing Noise):**
```
T=1000: ▒▒▒▒ Start with noise
T=500:  ~~~~ Model predicts: "Move particles here"
T=100:  🔵~ Ink reconcentrating
T=0:    🔵 Perfect drop of ink (generated image!)
```

**The key insight:** 
- We CAN'T reverse real ink diffusion
- But a neural network CAN learn to reverse image noise!

### Visual: The Diffusion Process

```
┌─────────────────────────────────────────────────────────────┐
│                    DIFFUSION PROCESS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FORWARD (Training - we know this):                         │
│                                                              │
│  [🖼️ Image] → [🖼️+ε] → [🖼️+εε] → [...] → [▒▒▒ Noise]      │
│     x₀         x₁        x₂              x_T                │
│                                                              │
│  Just add Gaussian noise at each step!                      │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  REVERSE (Generation - model learns this):                  │
│                                                              │
│  [▒▒▒ Noise] → [▒▒-ε] → [▒-εε] → [...] → [🖼️ Image]        │
│     x_T          x_{T-1}   x_{T-2}          x₀               │
│                                                              │
│  Neural network predicts noise to subtract!                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Deep Technical Breakdown

### Forward Process (Noising)

Given an image $x_0$, we add noise over $T$ timesteps:

$$q(x_t | x_{t-1}) = \mathcal{N}(x_t; \sqrt{1-\beta_t} x_{t-1}, \beta_t \mathbf{I})$$

Where:
- $\beta_t$ = noise schedule (small values, e.g., 0.0001 to 0.02)
- $\mathcal{N}$ = Gaussian distribution

**Key property:** We can sample $x_t$ directly from $x_0$:

$$x_t = \sqrt{\bar{\alpha}_t} x_0 + \sqrt{1-\bar{\alpha}_t} \epsilon$$

Where:
- $\alpha_t = 1 - \beta_t$
- $\bar{\alpha}_t = \prod_{i=1}^{t} \alpha_i$ (cumulative product)
- $\epsilon \sim \mathcal{N}(0, \mathbf{I})$ (random noise)

### Reverse Process (Denoising)

The model learns to reverse the noising:

$$p_\theta(x_{t-1} | x_t) = \mathcal{N}(x_{t-1}; \mu_\theta(x_t, t), \Sigma_\theta(x_t, t))$$

**What the model predicts:** The noise $\epsilon_\theta(x_t, t)$ that was added.

### The Training Objective

Simplified loss (DDPM):

$$\mathcal{L} = \mathbb{E}_{x_0, \epsilon, t} \left[ \|\epsilon - \epsilon_\theta(x_t, t)\|^2 \right]$$

In plain English:
1. Take a real image $x_0$
2. Add random noise $\epsilon$ to get $x_t$
3. Train model to predict $\epsilon$ from $x_t$
4. Loss = how wrong was the prediction

```
┌─────────────────────────────────────────────────────────────┐
│                    TRAINING STEP                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Sample image x₀ from dataset                            │
│  2. Sample random timestep t ~ Uniform(1, T)                │
│  3. Sample random noise ε ~ N(0, I)                         │
│  4. Create noisy image: x_t = √ᾱ_t·x₀ + √(1-ᾱ_t)·ε          │
│  5. Predict noise: ε̂ = Model(x_t, t)                        │
│  6. Loss = ||ε - ε̂||²                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📐 Mathematical Foundation

### Noise Schedule

Linear schedule (original DDPM):
$$\beta_t = \beta_1 + \frac{t-1}{T-1}(\beta_T - \beta_1)$$

Cosine schedule (better quality):
$$\bar{\alpha}_t = \frac{f(t)}{f(0)}, \quad f(t) = \cos\left(\frac{t/T + s}{1+s} \cdot \frac{\pi}{2}\right)^2$$

### Forward Process (Closed Form)

Given $x_0$ and timestep $t$, we can directly compute:

$$q(x_t | x_0) = \mathcal{N}(x_t; \sqrt{\bar{\alpha}_t} x_0, (1-\bar{\alpha}_t) \mathbf{I})$$

Sampling: 
$$x_t = \sqrt{\bar{\alpha}_t} x_0 + \sqrt{1-\bar{\alpha}_t} \epsilon, \quad \epsilon \sim \mathcal{N}(0, \mathbf{I})$$

### Reverse Process

The true reverse $q(x_{t-1}|x_t, x_0)$ is tractable:

$$q(x_{t-1}|x_t, x_0) = \mathcal{N}(x_{t-1}; \tilde{\mu}_t(x_t, x_0), \tilde{\beta}_t \mathbf{I})$$

Where:
$$\tilde{\mu}_t = \frac{\sqrt{\bar{\alpha}_{t-1}} \beta_t}{1-\bar{\alpha}_t} x_0 + \frac{\sqrt{\alpha_t}(1-\bar{\alpha}_{t-1})}{1-\bar{\alpha}_t} x_t$$

$$\tilde{\beta}_t = \frac{1-\bar{\alpha}_{t-1}}{1-\bar{\alpha}_t} \beta_t$$

### Parameterization Choices

The model can predict different targets:

| Target | Loss | Common In |
|--------|------|-----------|
| $\epsilon$ (noise) | $\|\epsilon - \epsilon_\theta\|^2$ | DDPM |
| $x_0$ (clean image) | $\|x_0 - x_\theta\|^2$ | Some variants |
| $v$ (velocity) | $\|v - v_\theta\|^2$ | Stable Diffusion |

**Velocity parameterization:**
$$v = \sqrt{\bar{\alpha}_t} \epsilon - \sqrt{1-\bar{\alpha}_t} x_0$$

---

## 🏗️ Architecture: U-Net

Diffusion models typically use a **U-Net** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     U-NET ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input: x_t (noisy image) + t (timestep)                    │
│                                                              │
│       Encoder (Downsampling)    Decoder (Upsampling)        │
│                                                              │
│  [64×64×3] ─────────────────────────────────────► [64×64×3] │
│      │                                              ▲       │
│      ▼ Down                                    Up   │       │
│  [32×32×64] ──────────────────────────────► [32×32×64]      │
│      │                    Skip                ▲             │
│      ▼ Down            Connections       Up   │             │
│  [16×16×128] ─────────────────────────► [16×16×128]         │
│      │                                    ▲                  │
│      ▼ Down                          Up   │                  │
│  [8×8×256] ───────────────────────► [8×8×256]               │
│      │                                ▲                      │
│      ▼                                │                      │
│  [4×4×512] ──── Bottleneck ────► [4×4×512]                  │
│                                                              │
│  + Self-Attention at 8×8 and 16×16 resolutions             │
│  + Timestep embedding via sinusoidal + MLP                  │
│  + Cross-attention for text conditioning (Stable Diffusion) │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**1. Timestep Embedding:**
```python
def get_timestep_embedding(t, dim):
    """Sinusoidal timestep embeddings (like transformers)"""
    half = dim // 2
    freqs = torch.exp(-math.log(10000) * torch.arange(half) / half)
    args = t[:, None] * freqs[None]
    return torch.cat([torch.cos(args), torch.sin(args)], dim=-1)
```

**2. ResNet Blocks with Time:**
```python
class ResBlock(nn.Module):
    def forward(self, x, t_emb):
        h = self.norm1(x)
        h = self.act(h)
        h = self.conv1(h)
        
        # Add timestep
        h = h + self.time_mlp(t_emb)[:, :, None, None]
        
        h = self.norm2(h)
        h = self.act(h)
        h = self.conv2(h)
        
        return h + self.skip(x)
```

**3. Self-Attention:**
```python
class SelfAttention(nn.Module):
    def forward(self, x):
        B, C, H, W = x.shape
        x_flat = x.view(B, C, H*W).transpose(1, 2)  # [B, HW, C]
        
        q = self.to_q(x_flat)
        k = self.to_k(x_flat)
        v = self.to_v(x_flat)
        
        attn = F.softmax(q @ k.transpose(-2, -1) / math.sqrt(C), dim=-1)
        out = attn @ v
        
        return out.transpose(1, 2).view(B, C, H, W)
```

---

## 🎓 Training & Sampling

### Training Algorithm (DDPM)

```python
def train_step(model, x_0, noise_schedule):
    """One training step for diffusion model"""
    batch_size = x_0.shape[0]
    
    # 1. Sample random timesteps
    t = torch.randint(0, T, (batch_size,))
    
    # 2. Sample random noise
    epsilon = torch.randn_like(x_0)
    
    # 3. Create noisy image
    alpha_bar_t = noise_schedule.alpha_bar[t]
    x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * epsilon
    
    # 4. Predict noise
    epsilon_pred = model(x_t, t)
    
    # 5. Compute loss
    loss = F.mse_loss(epsilon_pred, epsilon)
    
    return loss
```

### Sampling Algorithm (DDPM)

```python
@torch.no_grad()
def sample_ddpm(model, shape, T=1000):
    """Generate images using DDPM sampling"""
    
    # Start with pure noise
    x_t = torch.randn(shape)
    
    for t in reversed(range(T)):
        t_batch = torch.full((shape[0],), t)
        
        # Predict noise
        epsilon_pred = model(x_t, t_batch)
        
        # Compute mean
        alpha_t = noise_schedule.alpha[t]
        alpha_bar_t = noise_schedule.alpha_bar[t]
        
        mean = (1 / sqrt(alpha_t)) * (
            x_t - (1 - alpha_t) / sqrt(1 - alpha_bar_t) * epsilon_pred
        )
        
        # Add noise (except at t=0)
        if t > 0:
            noise = torch.randn_like(x_t)
            sigma = sqrt(noise_schedule.beta[t])
            x_t = mean + sigma * noise
        else:
            x_t = mean
    
    return x_t
```

### DDIM Sampling (Faster)

DDIM allows skipping timesteps for faster generation:

```python
@torch.no_grad()
def sample_ddim(model, shape, steps=50, eta=0.0):
    """Generate images using DDIM (faster, deterministic if eta=0)"""
    
    # Create timestep subsequence
    timesteps = torch.linspace(T-1, 0, steps).long()
    
    x_t = torch.randn(shape)
    
    for i, t in enumerate(timesteps):
        t_next = timesteps[i+1] if i < len(timesteps)-1 else 0
        
        # Predict noise
        epsilon_pred = model(x_t, t)
        
        # Predict x_0
        alpha_bar_t = noise_schedule.alpha_bar[t]
        x_0_pred = (x_t - sqrt(1 - alpha_bar_t) * epsilon_pred) / sqrt(alpha_bar_t)
        
        # Direction pointing to x_t
        alpha_bar_t_next = noise_schedule.alpha_bar[t_next]
        dir_xt = sqrt(1 - alpha_bar_t_next - eta**2 * ...) * epsilon_pred
        
        # Sample x_{t-1}
        x_t = sqrt(alpha_bar_t_next) * x_0_pred + dir_xt
        
        if eta > 0 and t_next > 0:
            x_t = x_t + eta * torch.randn_like(x_t)
    
    return x_t
```

---

## 🖼️ Stable Diffusion

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 STABLE DIFFUSION ARCHITECTURE                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "A cat in space"                                           │
│        │                                                     │
│        ▼                                                     │
│  ┌──────────────┐                                           │
│  │ CLIP Text    │ → Text embeddings [77, 768]               │
│  │ Encoder      │                                           │
│  └──────────────┘                                           │
│        │                                                     │
│        │ Cross-Attention                                    │
│        ▼                                                     │
│  ┌──────────────┐     ┌──────────────┐                      │
│  │   U-Net      │ ←── │  Noise z_t   │                      │
│  │ (Denoiser)   │     │  [64×64×4]   │ Latent space!        │
│  └──────────────┘     └──────────────┘                      │
│        │                                                     │
│        ▼ (after T iterations)                               │
│  ┌──────────────┐                                           │
│  │ VAE Decoder  │ → Final image [512×512×3]                 │
│  └──────────────┘                                           │
│                                                              │
│  KEY INNOVATION: Work in latent space (64×64) not pixel    │
│  space (512×512) → 64x less computation!                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Components

**1. VAE (Variational Autoencoder):**
- Encodes 512×512 images to 64×64 latents
- Decodes latents back to images
- Compression factor: 8x in each dimension

**2. CLIP Text Encoder:**
- Encodes text prompts to embeddings
- Pre-trained on 400M image-text pairs
- Enables text-to-image generation

**3. U-Net with Cross-Attention:**
- Denoises in latent space
- Cross-attention layers condition on text
- Time embedding for noise level

### Classifier-Free Guidance

To improve prompt adherence:

$$\tilde{\epsilon}_\theta = \epsilon_\theta(x_t, \emptyset) + s \cdot (\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \emptyset))$$

Where:
- $\epsilon_\theta(x_t, c)$ = conditioned prediction (with text)
- $\epsilon_\theta(x_t, \emptyset)$ = unconditioned prediction (no text)
- $s$ = guidance scale (typically 7-15)

Higher $s$ → Stronger prompt following, less diversity

---

## 💻 Implementation

### Simple Diffusion Model from Scratch

```python
"""
Diffusion Model Implementation from Scratch
Train on MNIST for simplicity
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import math
from tqdm import tqdm

# ============================================
# NOISE SCHEDULE
# ============================================

class NoiseSchedule:
    """Linear or cosine noise schedule"""
    
    def __init__(self, T=1000, beta_start=1e-4, beta_end=0.02, schedule='linear'):
        self.T = T
        
        if schedule == 'linear':
            self.beta = torch.linspace(beta_start, beta_end, T)
        elif schedule == 'cosine':
            s = 0.008
            steps = torch.arange(T + 1)
            f = torch.cos((steps / T + s) / (1 + s) * math.pi / 2) ** 2
            alpha_bar = f / f[0]
            self.beta = torch.clip(1 - alpha_bar[1:] / alpha_bar[:-1], 0.0001, 0.9999)
        
        self.alpha = 1 - self.beta
        self.alpha_bar = torch.cumprod(self.alpha, dim=0)
        self.sqrt_alpha_bar = torch.sqrt(self.alpha_bar)
        self.sqrt_one_minus_alpha_bar = torch.sqrt(1 - self.alpha_bar)
    
    def to(self, device):
        self.beta = self.beta.to(device)
        self.alpha = self.alpha.to(device)
        self.alpha_bar = self.alpha_bar.to(device)
        self.sqrt_alpha_bar = self.sqrt_alpha_bar.to(device)
        self.sqrt_one_minus_alpha_bar = self.sqrt_one_minus_alpha_bar.to(device)
        return self


# ============================================
# TIMESTEP EMBEDDING
# ============================================

class SinusoidalPositionEmbeddings(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.dim = dim
    
    def forward(self, t):
        device = t.device
        half_dim = self.dim // 2
        emb = math.log(10000) / (half_dim - 1)
        emb = torch.exp(torch.arange(half_dim, device=device) * -emb)
        emb = t[:, None] * emb[None, :]
        emb = torch.cat([torch.sin(emb), torch.cos(emb)], dim=-1)
        return emb


# ============================================
# U-NET BUILDING BLOCKS
# ============================================

class Block(nn.Module):
    """Basic building block with GroupNorm"""
    def __init__(self, in_ch, out_ch, time_emb_dim, up=False):
        super().__init__()
        if up:
            self.conv1 = nn.Conv2d(2*in_ch, out_ch, 3, padding=1)
            self.transform = nn.ConvTranspose2d(out_ch, out_ch, 4, 2, 1)
        else:
            self.conv1 = nn.Conv2d(in_ch, out_ch, 3, padding=1)
            self.transform = nn.Conv2d(out_ch, out_ch, 4, 2, 1)
        
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1)
        self.time_mlp = nn.Linear(time_emb_dim, out_ch)
        self.norm1 = nn.GroupNorm(8, out_ch)
        self.norm2 = nn.GroupNorm(8, out_ch)
    
    def forward(self, x, t):
        h = self.norm1(F.relu(self.conv1(x)))
        time_emb = self.time_mlp(t)[:, :, None, None]
        h = h + time_emb
        h = self.norm2(F.relu(self.conv2(h)))
        return self.transform(h)


class SimpleUNet(nn.Module):
    """
    Simplified U-Net for diffusion
    Input: [B, 1, 28, 28] (MNIST)
    Output: [B, 1, 28, 28] (predicted noise)
    """
    def __init__(self, in_channels=1, time_emb_dim=32):
        super().__init__()
        
        # Time embedding
        self.time_mlp = nn.Sequential(
            SinusoidalPositionEmbeddings(time_emb_dim),
            nn.Linear(time_emb_dim, time_emb_dim),
            nn.ReLU()
        )
        
        # Encoder (downsampling)
        self.conv0 = nn.Conv2d(in_channels, 64, 3, padding=1)
        self.down1 = Block(64, 128, time_emb_dim)
        self.down2 = Block(128, 256, time_emb_dim)
        
        # Bottleneck
        self.bot1 = nn.Conv2d(256, 256, 3, padding=1)
        self.bot2 = nn.Conv2d(256, 256, 3, padding=1)
        
        # Decoder (upsampling)
        self.up1 = Block(256, 128, time_emb_dim, up=True)
        self.up2 = Block(128, 64, time_emb_dim, up=True)
        
        # Output
        self.out = nn.Conv2d(64, in_channels, 1)
    
    def forward(self, x, t):
        # Time embedding
        t = self.time_mlp(t)
        
        # Encoder
        x1 = F.relu(self.conv0(x))
        x2 = self.down1(x1, t)
        x3 = self.down2(x2, t)
        
        # Bottleneck
        x3 = F.relu(self.bot1(x3))
        x3 = F.relu(self.bot2(x3))
        
        # Decoder with skip connections
        x = self.up1(torch.cat([x3, x3], dim=1), t)
        x = self.up2(torch.cat([x, x2], dim=1), t)
        
        return self.out(x)


# ============================================
# DIFFUSION MODEL
# ============================================

class DiffusionModel:
    def __init__(self, model, schedule, device='cuda'):
        self.model = model.to(device)
        self.schedule = schedule.to(device)
        self.device = device
    
    def q_sample(self, x_0, t, noise=None):
        """Forward process: add noise to image"""
        if noise is None:
            noise = torch.randn_like(x_0)
        
        sqrt_alpha_bar = self.schedule.sqrt_alpha_bar[t][:, None, None, None]
        sqrt_one_minus = self.schedule.sqrt_one_minus_alpha_bar[t][:, None, None, None]
        
        return sqrt_alpha_bar * x_0 + sqrt_one_minus * noise
    
    def p_losses(self, x_0, t):
        """Compute training loss"""
        noise = torch.randn_like(x_0)
        x_t = self.q_sample(x_0, t, noise)
        
        noise_pred = self.model(x_t, t)
        loss = F.mse_loss(noise_pred, noise)
        
        return loss
    
    @torch.no_grad()
    def p_sample(self, x_t, t):
        """Single denoising step"""
        beta_t = self.schedule.beta[t]
        alpha_t = self.schedule.alpha[t]
        alpha_bar_t = self.schedule.alpha_bar[t]
        
        # Predict noise
        t_batch = torch.full((x_t.shape[0],), t, device=self.device, dtype=torch.long)
        noise_pred = self.model(x_t, t_batch)
        
        # Compute mean
        coef1 = 1 / torch.sqrt(alpha_t)
        coef2 = beta_t / torch.sqrt(1 - alpha_bar_t)
        mean = coef1 * (x_t - coef2 * noise_pred)
        
        if t > 0:
            noise = torch.randn_like(x_t)
            sigma = torch.sqrt(beta_t)
            return mean + sigma * noise
        else:
            return mean
    
    @torch.no_grad()
    def sample(self, n_samples, img_size=(1, 28, 28)):
        """Generate new images"""
        self.model.eval()
        
        # Start with pure noise
        x = torch.randn(n_samples, *img_size, device=self.device)
        
        # Iterative denoising
        for t in tqdm(reversed(range(self.schedule.T)), desc='Sampling'):
            x = self.p_sample(x, t)
        
        return x


# ============================================
# TRAINING LOOP
# ============================================

def train_diffusion(epochs=10, batch_size=128, lr=1e-3):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Data
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,))  # Scale to [-1, 1]
    ])
    dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    # Model
    model = SimpleUNet()
    schedule = NoiseSchedule(T=1000, schedule='cosine')
    diffusion = DiffusionModel(model, schedule, device)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    
    # Training
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        
        for batch_idx, (images, _) in enumerate(tqdm(loader, desc=f'Epoch {epoch+1}')):
            images = images.to(device)
            
            # Sample random timesteps
            t = torch.randint(0, schedule.T, (images.shape[0],), device=device)
            
            # Compute loss
            loss = diffusion.p_losses(images, t)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
        
        avg_loss = total_loss / len(loader)
        print(f"Epoch {epoch+1}: Average Loss = {avg_loss:.4f}")
        
        # Generate samples
        if (epoch + 1) % 5 == 0:
            samples = diffusion.sample(16)
            # Save or visualize samples here
    
    return diffusion


# ============================================
# SAMPLING WITH DIFFERENT METHODS
# ============================================

@torch.no_grad()
def sample_ddim(diffusion, n_samples, steps=50, eta=0.0):
    """DDIM sampling for faster generation"""
    device = diffusion.device
    model = diffusion.model
    schedule = diffusion.schedule
    
    model.eval()
    
    # Timestep subsequence
    c = schedule.T // steps
    timesteps = list(range(0, schedule.T, c))
    
    # Start with noise
    x = torch.randn(n_samples, 1, 28, 28, device=device)
    
    for i in tqdm(reversed(range(len(timesteps))), desc='DDIM Sampling'):
        t = timesteps[i]
        t_prev = timesteps[i-1] if i > 0 else 0
        
        t_batch = torch.full((n_samples,), t, device=device, dtype=torch.long)
        
        # Predict noise
        eps = model(x, t_batch)
        
        # Predict x_0
        alpha_bar_t = schedule.alpha_bar[t]
        x_0_pred = (x - torch.sqrt(1 - alpha_bar_t) * eps) / torch.sqrt(alpha_bar_t)
        x_0_pred = torch.clamp(x_0_pred, -1, 1)
        
        # Get next x
        alpha_bar_prev = schedule.alpha_bar[t_prev] if t_prev > 0 else torch.tensor(1.0)
        sigma = eta * torch.sqrt((1 - alpha_bar_prev) / (1 - alpha_bar_t)) * \
                torch.sqrt(1 - alpha_bar_t / alpha_bar_prev)
        
        dir_xt = torch.sqrt(1 - alpha_bar_prev - sigma**2) * eps
        x = torch.sqrt(alpha_bar_prev) * x_0_pred + dir_xt
        
        if eta > 0 and t_prev > 0:
            x = x + sigma * torch.randn_like(x)
    
    return x


if __name__ == "__main__":
    diffusion = train_diffusion(epochs=10)
    
    # Generate with DDPM (slow)
    samples_ddpm = diffusion.sample(16)
    
    # Generate with DDIM (fast)
    samples_ddim = sample_ddim(diffusion, 16, steps=50)
```

---

## 🚀 Advanced Techniques

### 1. Classifier-Free Guidance Implementation

```python
class ConditionalDiffusion(nn.Module):
    """Diffusion with classifier-free guidance"""
    
    def __init__(self, model, num_classes, dropout_prob=0.1):
        super().__init__()
        self.model = model
        self.class_emb = nn.Embedding(num_classes, model.time_emb_dim)
        self.dropout_prob = dropout_prob
    
    def forward(self, x, t, y=None):
        # Time embedding
        t_emb = self.model.time_mlp(t)
        
        # Class embedding (with dropout for unconditional)
        if y is not None:
            # Randomly drop class for training
            if self.training:
                mask = torch.rand(y.shape[0]) > self.dropout_prob
                y = y * mask.to(y.device).long()
            c_emb = self.class_emb(y)
            t_emb = t_emb + c_emb
        
        return self.model.forward_with_emb(x, t_emb)
    
    @torch.no_grad()
    def sample_cfg(self, n_samples, class_label, guidance_scale=7.5):
        """Sample with classifier-free guidance"""
        x = torch.randn(n_samples, 1, 28, 28, device=self.device)
        
        for t in reversed(range(self.T)):
            t_batch = torch.full((n_samples,), t, device=self.device)
            
            # Conditional prediction
            eps_cond = self(x, t_batch, class_label)
            
            # Unconditional prediction
            eps_uncond = self(x, t_batch, torch.zeros_like(class_label))
            
            # Guided prediction
            eps = eps_uncond + guidance_scale * (eps_cond - eps_uncond)
            
            # Denoise step
            x = self.denoise_step(x, eps, t)
        
        return x
```

### 2. Latent Diffusion

```python
class LatentDiffusion(nn.Module):
    """Diffusion in VAE latent space (like Stable Diffusion)"""
    
    def __init__(self, vae, unet, text_encoder):
        super().__init__()
        self.vae = vae  # Pre-trained VAE
        self.unet = unet  # U-Net denoiser
        self.text_encoder = text_encoder  # CLIP
    
    def encode(self, x):
        """Encode image to latent"""
        return self.vae.encode(x).latent_dist.sample()
    
    def decode(self, z):
        """Decode latent to image"""
        return self.vae.decode(z).sample
    
    def forward(self, images, text, t):
        # Encode images to latent
        z = self.encode(images)
        
        # Encode text
        text_emb = self.text_encoder(text)
        
        # Add noise
        noise = torch.randn_like(z)
        z_noisy = self.q_sample(z, t, noise)
        
        # Predict noise (with text conditioning via cross-attention)
        noise_pred = self.unet(z_noisy, t, text_emb)
        
        return F.mse_loss(noise_pred, noise)
    
    @torch.no_grad()
    def generate(self, prompt, guidance_scale=7.5, steps=50):
        """Generate image from text prompt"""
        # Encode prompt
        text_emb = self.text_encoder(prompt)
        null_emb = self.text_encoder("")  # For CFG
        
        # Start with noise in latent space
        z = torch.randn(1, 4, 64, 64)  # Latent dimensions
        
        for t in tqdm(reversed(range(0, 1000, 1000//steps))):
            # Classifier-free guidance
            eps_cond = self.unet(z, t, text_emb)
            eps_uncond = self.unet(z, t, null_emb)
            eps = eps_uncond + guidance_scale * (eps_cond - eps_uncond)
            
            # Denoise
            z = self.denoise_step(z, eps, t)
        
        # Decode to image
        image = self.decode(z)
        return image
```

---

## 🛠️ Hands-On Project

### Project: Build a Conditional MNIST Generator

```python
"""
Project: Conditional Diffusion Model for MNIST
Generate specific digits using class conditioning
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.utils import make_grid, save_image
import matplotlib.pyplot as plt
from tqdm import tqdm

# [Include all the components from above, plus...]

class ConditionalUNet(nn.Module):
    """U-Net with class conditioning"""
    
    def __init__(self, in_channels=1, time_emb_dim=64, num_classes=10):
        super().__init__()
        
        # Embeddings
        self.time_mlp = nn.Sequential(
            SinusoidalPositionEmbeddings(time_emb_dim),
            nn.Linear(time_emb_dim, time_emb_dim * 2),
            nn.GELU(),
            nn.Linear(time_emb_dim * 2, time_emb_dim)
        )
        
        self.class_emb = nn.Embedding(num_classes + 1, time_emb_dim)  # +1 for null class
        
        # U-Net architecture (same as before, but uses combined embedding)
        self.down1 = DownBlock(in_channels, 64, time_emb_dim)
        self.down2 = DownBlock(64, 128, time_emb_dim)
        self.down3 = DownBlock(128, 256, time_emb_dim)
        
        self.bot = MiddleBlock(256, time_emb_dim)
        
        self.up1 = UpBlock(256, 128, time_emb_dim)
        self.up2 = UpBlock(128, 64, time_emb_dim)
        self.up3 = UpBlock(64, 64, time_emb_dim)
        
        self.out = nn.Conv2d(64, in_channels, 1)
    
    def forward(self, x, t, y):
        """
        x: [B, 1, 28, 28] noisy image
        t: [B] timesteps
        y: [B] class labels (0-9 for digits, 10 for unconditional)
        """
        # Combine time and class embeddings
        t_emb = self.time_mlp(t)
        c_emb = self.class_emb(y)
        emb = t_emb + c_emb
        
        # Forward through U-Net
        d1, skip1 = self.down1(x, emb)
        d2, skip2 = self.down2(d1, emb)
        d3, skip3 = self.down3(d2, emb)
        
        b = self.bot(d3, emb)
        
        u1 = self.up1(b, skip3, emb)
        u2 = self.up2(u1, skip2, emb)
        u3 = self.up3(u2, skip1, emb)
        
        return self.out(u3)


class ConditionaLDiffusionTrainer:
    """Train conditional diffusion with classifier-free guidance"""
    
    def __init__(self, model, schedule, cfg_dropout=0.1, device='cuda'):
        self.model = model.to(device)
        self.schedule = schedule.to(device)
        self.cfg_dropout = cfg_dropout
        self.device = device
        self.null_class = 10  # Unconditional class index
    
    def train_step(self, x, y):
        batch_size = x.shape[0]
        
        # Sample timesteps
        t = torch.randint(0, self.schedule.T, (batch_size,), device=self.device)
        
        # Classifier-free guidance: randomly drop class labels
        drop_mask = torch.rand(batch_size, device=self.device) < self.cfg_dropout
        y_train = y.clone()
        y_train[drop_mask] = self.null_class
        
        # Add noise
        noise = torch.randn_like(x)
        x_noisy = self.schedule.q_sample(x, t, noise)
        
        # Predict noise
        noise_pred = self.model(x_noisy, t, y_train)
        
        return F.mse_loss(noise_pred, noise)
    
    @torch.no_grad()
    def sample(self, class_labels, guidance_scale=3.0):
        """Sample with classifier-free guidance"""
        n = len(class_labels)
        
        # Start with noise
        x = torch.randn(n, 1, 28, 28, device=self.device)
        
        class_labels = torch.tensor(class_labels, device=self.device)
        null_labels = torch.full((n,), self.null_class, device=self.device)
        
        for t in tqdm(reversed(range(self.schedule.T)), desc='Sampling'):
            t_batch = torch.full((n,), t, device=self.device, dtype=torch.long)
            
            # Conditional and unconditional predictions
            eps_cond = self.model(x, t_batch, class_labels)
            eps_uncond = self.model(x, t_batch, null_labels)
            
            # Classifier-free guidance
            eps = eps_uncond + guidance_scale * (eps_cond - eps_uncond)
            
            # Denoise step
            x = self.p_sample(x, eps, t)
        
        return x
    
    def p_sample(self, x, eps, t):
        """Single denoising step"""
        beta = self.schedule.beta[t]
        alpha = self.schedule.alpha[t]
        alpha_bar = self.schedule.alpha_bar[t]
        
        mean = (1 / torch.sqrt(alpha)) * (x - (beta / torch.sqrt(1 - alpha_bar)) * eps)
        
        if t > 0:
            noise = torch.randn_like(x)
            return mean + torch.sqrt(beta) * noise
        return mean


def train_and_generate():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Data
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,))
    ])
    dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
    loader = DataLoader(dataset, batch_size=128, shuffle=True)
    
    # Model
    model = ConditionalUNet(num_classes=10)
    schedule = NoiseSchedule(T=1000, schedule='cosine')
    trainer = ConditionaLDiffusionTrainer(model, schedule, device=device)
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    
    # Training
    for epoch in range(20):
        model.train()
        total_loss = 0
        
        for images, labels in tqdm(loader, desc=f'Epoch {epoch+1}'):
            images = images.to(device)
            labels = labels.to(device)
            
            loss = trainer.train_step(images, labels)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
        
        print(f"Epoch {epoch+1}: Loss = {total_loss/len(loader):.4f}")
        
        # Generate samples
        if (epoch + 1) % 5 == 0:
            model.eval()
            
            # Generate each digit
            all_digits = list(range(10)) * 4  # 4 of each
            samples = trainer.sample(all_digits, guidance_scale=3.0)
            
            # Save grid
            grid = make_grid(samples, nrow=10, normalize=True)
            save_image(grid, f'samples_epoch_{epoch+1}.png')
            print(f"Saved samples for epoch {epoch+1}")
    
    return trainer


if __name__ == "__main__":
    trainer = train_and_generate()
```

---

## ⚠️ Common Mistakes

### 1. Wrong Noise Scaling

```python
# ❌ Bad - Forgetting sqrt
x_t = alpha_bar * x_0 + (1 - alpha_bar) * noise

# ✅ Good - Correct scaling
x_t = sqrt(alpha_bar) * x_0 + sqrt(1 - alpha_bar) * noise
```

### 2. Incorrect Loss Target

```python
# ❌ Bad - Predicting wrong target
noise_pred = model(x_t, t)
loss = F.mse_loss(noise_pred, x_0)  # Should predict noise, not x_0!

# ✅ Good - Predict the noise that was added
loss = F.mse_loss(noise_pred, noise)
```

### 3. Missing CFG Training

```python
# ❌ Bad - Only training conditional
y_train = labels  # Always use real labels

# ✅ Good - Randomly drop for CFG
drop_mask = torch.rand(batch_size) < 0.1
y_train = labels.clone()
y_train[drop_mask] = NULL_CLASS  # Enable unconditional generation
```

---

## 🎯 Interview Questions

### Q1: Explain how diffusion models work at a high level.

**Answer:**
Diffusion models work in two processes:

1. **Forward (noising):** Gradually add Gaussian noise to images over T steps until they become pure noise
2. **Reverse (denoising):** Train a neural network to reverse this process, removing noise step by step

**Key equation:**
$$x_t = \sqrt{\bar{\alpha}_t} x_0 + \sqrt{1-\bar{\alpha}_t} \epsilon$$

The model learns to predict $\epsilon$ and uses that to denoise.

---

### Q2: Why are diffusion models better than GANs for image generation?

**Answer:**

| Aspect | GANs | Diffusion |
|--------|------|-----------|
| Training | Unstable (adversarial) | Stable (simple MSE) |
| Mode collapse | Common issue | Doesn't happen |
| Quality | High | Higher |
| Diversity | Limited | Excellent |
| Controllability | Difficult | Easy (guidance) |

Diffusion wins because:
- Training is simple and stable
- Full distribution coverage
- Easy conditioning with classifier-free guidance

---

### Q3: What is classifier-free guidance and why is it important?

**Answer:**
CFG combines conditional and unconditional predictions:

$$\tilde{\epsilon} = \epsilon_{uncond} + s \cdot (\epsilon_{cond} - \epsilon_{uncond})$$

**Why it matters:**
- $s > 1$ amplifies the condition signal
- Better prompt adherence
- Controls quality vs diversity trade-off
- No need for separate classifier

**Training:** Randomly drop conditioning ~10% of the time to enable unconditional generation.

---

### Q4: Why does Stable Diffusion work in latent space?

**Answer:**
Working in latent space (64×64) vs pixel space (512×512):

- **Compression:** 8× smaller in each dimension → 64× less computation
- **Semantic:** Latent space is more semantic, easier to manipulate
- **Speed:** Much faster training and inference
- **Quality:** VAE preserves visual quality well

**Architecture:**
```
Image (512×512) → VAE Encoder → Latent (64×64)
                                    ↓
                           U-Net denoising
                                    ↓
Latent (64×64) → VAE Decoder → Image (512×512)
```

---

### Q5: Compare DDPM and DDIM sampling.

**Answer:**

| Aspect | DDPM | DDIM |
|--------|------|------|
| Steps | 1000 | 10-100 |
| Stochastic | Yes | Optional (η parameter) |
| Speed | Slow | 10-100x faster |
| Quality | Baseline | Similar or better |
| Deterministic | No | Yes (when η=0) |

**DDIM key insight:** Can skip timesteps because the reverse process is deterministic when conditioned on final output.

---

## 📝 Homework

### Level 1: Basic
1. Explain the forward and reverse process in your own words
2. Calculate $x_t$ given $x_0$, $t=500$, and $\alpha_{bar} = 0.5$
3. What role does temperature play in sampling?

### Level 2: Intermediate
1. Implement simple DDPM on MNIST
2. Compare linear vs cosine noise schedules
3. Implement DDIM for faster sampling

### Level 3: Advanced
1. Add class conditioning with CFG
2. Implement latent diffusion with pre-trained VAE
3. Add text conditioning using CLIP

### Level 4: Expert
1. Fine-tune Stable Diffusion on custom dataset
2. Implement ControlNet-style conditioning
3. Build inpainting and image-to-image pipelines

---

## 🔗 Resources

- [DDPM Paper](https://arxiv.org/abs/2006.11239)
- [DDIM Paper](https://arxiv.org/abs/2010.02502)
- [Stable Diffusion Paper](https://arxiv.org/abs/2112.10752)
- [Classifier-Free Guidance](https://arxiv.org/abs/2207.12598)
- [HuggingFace Diffusers](https://huggingface.co/docs/diffusers)

---

**Next:** [03-Vision-Transformers.md](./03-Vision-Transformers.md) - Vision Transformers (ViT)
