# 🚀 GAN Variants - DCGAN, WGAN, StyleGAN & More

## 📌 Learning Goals

By the end of this file, you will:
- Understand DCGAN and why convolutions matter for images
- Know WGAN and how it solves training instability
- Understand conditional GANs (cGAN) for controlled generation
- Know about StyleGAN and state-of-the-art face generation
- Be able to choose the right GAN variant for your problem

---

## 🎯 Evolution of GANs

```
2014: Vanilla GAN (Goodfellow)
      │
      ├── 2015: DCGAN (Deep Convolutional GAN)
      │         └── Made GANs work for images!
      │
      ├── 2016: cGAN (Conditional GAN)
      │         └── Control what to generate
      │
      ├── 2017: WGAN / WGAN-GP
      │         └── Stable training!
      │
      ├── 2018: Progressive GAN
      │         └── High resolution images
      │
      ├── 2019: StyleGAN / StyleGAN2
      │         └── Photorealistic faces
      │
      └── 2020+: StyleGAN3, etc.
                 └── Continuous improvements
```

---

## 🔷 DCGAN (Deep Convolutional GAN)

### The Problem with Vanilla GAN

```
VANILLA GAN ISSUES:
───────────────────
1. Used fully connected layers
   └── Loses spatial information
   
2. Worked poorly on images
   └── Blurry, low quality
   
3. Hard to scale
   └── Too many parameters

SOLUTION: Use convolutions!
```

### DCGAN Architecture

```
GENERATOR (uses Transposed Convolutions):
═══════════════════════════════════════════════════════════

z (100,)
    │
    ▼ Reshape + Project
(100,) → (512, 4, 4)
    │
    ▼ ConvTranspose2d (512 → 256)
(256, 8, 8)    ← Size doubles!
    │
    ▼ BatchNorm + ReLU
    │
    ▼ ConvTranspose2d (256 → 128)
(128, 16, 16)  ← Size doubles again!
    │
    ▼ BatchNorm + ReLU
    │
    ▼ ConvTranspose2d (128 → 64)
(64, 32, 32)
    │
    ▼ ConvTranspose2d (64 → 3)
(3, 64, 64)    ← Final RGB image
    │
    ▼ Tanh


DISCRIMINATOR (uses Strided Convolutions):
═══════════════════════════════════════════════════════════

Image (3, 64, 64)
    │
    ▼ Conv2d (3 → 64, stride=2)
(64, 32, 32)   ← Size halves!
    │
    ▼ LeakyReLU(0.2)
    │
    ▼ Conv2d (64 → 128, stride=2)
(128, 16, 16)
    │
    ▼ BatchNorm + LeakyReLU
    │
    ▼ Conv2d (128 → 256, stride=2)
(256, 8, 8)
    │
    ▼ BatchNorm + LeakyReLU
    │
    ▼ Conv2d (256 → 512, stride=2)
(512, 4, 4)
    │
    ▼ Flatten + Linear → 1
    │
    ▼ Sigmoid → P(real)
```

### DCGAN Guidelines (The "DCGAN Recipe")

```
✅ DO:
─────
• Replace pooling with strided convolutions (D)
• Replace pooling with transposed convolutions (G)
• Use BatchNorm in both G and D
• Use ReLU in G (except output: Tanh)
• Use LeakyReLU in D (slope 0.2)

❌ DON'T:
─────────
• Use pooling layers
• Use fully connected layers (except I/O)
• Use BatchNorm in D's first layer
• Use BatchNorm in G's output layer
```

### DCGAN Implementation

```python
import torch
import torch.nn as nn

class DCGANGenerator(nn.Module):
    """
    DCGAN Generator: z → 64x64 image
    
    Uses transposed convolutions to upsample
    """
    def __init__(self, latent_dim=100, channels=3, features_g=64):
        super().__init__()
        
        self.net = nn.Sequential(
            # Input: latent_dim x 1 x 1
            self._block(latent_dim, features_g * 16, 4, 1, 0),  # 4x4
            self._block(features_g * 16, features_g * 8, 4, 2, 1),  # 8x8
            self._block(features_g * 8, features_g * 4, 4, 2, 1),   # 16x16
            self._block(features_g * 4, features_g * 2, 4, 2, 1),   # 32x32
            # Output layer
            nn.ConvTranspose2d(features_g * 2, channels, 4, 2, 1),  # 64x64
            nn.Tanh()
        )
    
    def _block(self, in_channels, out_channels, kernel_size, stride, padding):
        return nn.Sequential(
            nn.ConvTranspose2d(in_channels, out_channels, kernel_size, 
                              stride, padding, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(True)
        )
    
    def forward(self, x):
        # x shape: (batch, latent_dim)
        x = x.view(x.size(0), -1, 1, 1)  # (batch, latent_dim, 1, 1)
        return self.net(x)


class DCGANDiscriminator(nn.Module):
    """
    DCGAN Discriminator: 64x64 image → P(real)
    
    Uses strided convolutions to downsample
    """
    def __init__(self, channels=3, features_d=64):
        super().__init__()
        
        self.net = nn.Sequential(
            # Input: channels x 64 x 64
            nn.Conv2d(channels, features_d, 4, 2, 1),  # 32x32
            nn.LeakyReLU(0.2),
            
            self._block(features_d, features_d * 2, 4, 2, 1),      # 16x16
            self._block(features_d * 2, features_d * 4, 4, 2, 1),  # 8x8
            self._block(features_d * 4, features_d * 8, 4, 2, 1),  # 4x4
            
            # Output layer
            nn.Conv2d(features_d * 8, 1, 4, 1, 0),  # 1x1
            nn.Sigmoid()
        )
    
    def _block(self, in_channels, out_channels, kernel_size, stride, padding):
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size, 
                     stride, padding, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.LeakyReLU(0.2)
        )
    
    def forward(self, x):
        return self.net(x).view(-1, 1)


# Test the networks
z = torch.randn(4, 100)  # Batch of 4 noise vectors
G = DCGANGenerator()
D = DCGANDiscriminator()

fake_images = G(z)
print(f"Generated shape: {fake_images.shape}")  # (4, 3, 64, 64)

validity = D(fake_images)
print(f"Validity shape: {validity.shape}")  # (4, 1)
```

---

## 🔶 WGAN (Wasserstein GAN)

### The Problem with Vanilla GAN Loss

```
VANILLA GAN LOSS ISSUES:
════════════════════════

1. JS Divergence doesn't work when distributions don't overlap
   ┌─────────────────────────────────────────────┐
   │                                             │
   │  Real Data          Fake Data (early)       │
   │     ●●●                ○○○                  │
   │     ●●●                ○○○                  │
   │                                             │
   │  No overlap → JS Divergence = constant!     │
   │  No useful gradients for G!                 │
   └─────────────────────────────────────────────┘

2. Vanishing gradients when D is too good
   D(real) = 1, D(fake) = 0
   log(1-0) = 0 → No gradient for G!

3. Mode collapse
   G finds one mode that works, ignores others
```

### WGAN Solution: Wasserstein Distance

```
WASSERSTEIN DISTANCE (Earth Mover's Distance):
═══════════════════════════════════════════════

"Minimum cost to transform one distribution into another"

Visual:
─────────
Real distribution:  ████
                    ████
                    ████

Fake distribution:      ████
                        ████
                        ████

Wasserstein = How much "dirt" to move × distance

Unlike JS divergence:
• Always provides useful gradients
• Correlates with image quality
• Works even when distributions don't overlap
```

### WGAN Mathematical Formulation

```
WGAN OBJECTIVE:
═══════════════

min max 𝔼ₓ~p_data[D(x)] - 𝔼ᵤ~p_z[D(G(z))]
 G   D∈𝒟

Where 𝒟 = set of 1-Lipschitz functions

Key differences from vanilla GAN:
──────────────────────────────────
1. No log in the loss function
2. No sigmoid in D's output (D outputs a score, not probability)
3. D must be Lipschitz constrained

D is called "Critic" not "Discriminator"
(because it doesn't classify, it scores)
```

### Lipschitz Constraint

```
LIPSCHITZ CONSTRAINT:
═════════════════════

A function f is K-Lipschitz if:
|f(x₁) - f(x₂)| ≤ K × |x₁ - x₂|

In words: "Output can't change too fast"

Why needed?
───────────
Without constraint, D can blow up to infinity!
max [D(x) - D(G(z))] → ∞

WGAN enforces 1-Lipschitz (K=1)


HOW TO ENFORCE?
───────────────
Method 1: Weight Clipping (WGAN)
           Clip weights to [-c, c] after each step
           c ≈ 0.01
           Problem: Can hurt capacity

Method 2: Gradient Penalty (WGAN-GP)
           Add penalty term to loss
           Much better in practice!
```

### WGAN-GP (Gradient Penalty)

```
GRADIENT PENALTY LOSS:
═════════════════════════════════════════════════════

L = 𝔼ᵤ~p_z[D(G(z))] - 𝔼ₓ~p_data[D(x)] + λ × GP

Where:
GP = 𝔼ₓ̂[(||∇ₓ̂D(x̂)||₂ - 1)²]

x̂ = interpolation between real and fake
x̂ = ε × x_real + (1-ε) × x_fake
ε ~ Uniform(0, 1)

λ = 10 (typically)


WHY THIS WORKS:
───────────────
Forces ||∇D|| = 1 everywhere
This ensures 1-Lipschitz constraint
More stable than weight clipping!
```

### WGAN-GP Implementation

```python
import torch
import torch.nn as nn
import torch.autograd as autograd

class WGANCritic(nn.Module):
    """
    WGAN Critic (not Discriminator!)
    
    Key differences:
    - No sigmoid at output
    - No BatchNorm (or use LayerNorm/InstanceNorm)
    """
    def __init__(self, channels=3, features=64):
        super().__init__()
        
        self.net = nn.Sequential(
            nn.Conv2d(channels, features, 4, 2, 1),
            nn.LeakyReLU(0.2),
            
            nn.Conv2d(features, features * 2, 4, 2, 1),
            nn.InstanceNorm2d(features * 2),  # Not BatchNorm!
            nn.LeakyReLU(0.2),
            
            nn.Conv2d(features * 2, features * 4, 4, 2, 1),
            nn.InstanceNorm2d(features * 4),
            nn.LeakyReLU(0.2),
            
            nn.Conv2d(features * 4, features * 8, 4, 2, 1),
            nn.InstanceNorm2d(features * 8),
            nn.LeakyReLU(0.2),
            
            nn.Conv2d(features * 8, 1, 4, 1, 0),
            # NO SIGMOID!
        )
    
    def forward(self, x):
        return self.net(x).view(-1)


def compute_gradient_penalty(critic, real_images, fake_images, device):
    """
    Compute WGAN-GP gradient penalty
    
    1. Create interpolated images
    2. Compute critic output
    3. Compute gradients w.r.t. interpolated images
    4. Penalize if gradient norm != 1
    """
    batch_size = real_images.size(0)
    
    # Random interpolation weight
    epsilon = torch.rand(batch_size, 1, 1, 1, device=device)
    
    # Interpolate between real and fake
    interpolated = epsilon * real_images + (1 - epsilon) * fake_images
    interpolated.requires_grad_(True)
    
    # Critic output for interpolated images
    critic_output = critic(interpolated)
    
    # Compute gradients
    gradients = autograd.grad(
        outputs=critic_output,
        inputs=interpolated,
        grad_outputs=torch.ones_like(critic_output),
        create_graph=True,
        retain_graph=True
    )[0]
    
    # Flatten gradients
    gradients = gradients.view(batch_size, -1)
    
    # Compute L2 norm
    gradient_norm = gradients.norm(2, dim=1)
    
    # Penalty: (||grad|| - 1)²
    gradient_penalty = ((gradient_norm - 1) ** 2).mean()
    
    return gradient_penalty


# WGAN-GP Training Loop
def train_wgan_gp(generator, critic, dataloader, epochs=100, 
                  n_critic=5, lambda_gp=10, device='cuda'):
    """
    WGAN-GP Training
    
    Key differences from vanilla GAN:
    1. Train critic n_critic times per generator step
    2. Use Wasserstein loss (no BCE)
    3. Add gradient penalty
    4. Use RMSprop or Adam with low lr
    """
    opt_G = torch.optim.Adam(generator.parameters(), lr=1e-4, betas=(0, 0.9))
    opt_C = torch.optim.Adam(critic.parameters(), lr=1e-4, betas=(0, 0.9))
    
    for epoch in range(epochs):
        for batch_idx, (real_images, _) in enumerate(dataloader):
            real_images = real_images.to(device)
            batch_size = real_images.size(0)
            
            # ========================================
            # TRAIN CRITIC (n_critic times)
            # ========================================
            for _ in range(n_critic):
                opt_C.zero_grad()
                
                # Generate fake images
                z = torch.randn(batch_size, 100, device=device)
                fake_images = generator(z)
                
                # Critic scores
                critic_real = critic(real_images).mean()
                critic_fake = critic(fake_images.detach()).mean()
                
                # Gradient penalty
                gp = compute_gradient_penalty(critic, real_images, 
                                             fake_images.detach(), device)
                
                # WGAN-GP Loss
                # Critic wants: high score for real, low for fake
                loss_C = critic_fake - critic_real + lambda_gp * gp
                
                loss_C.backward()
                opt_C.step()
            
            # ========================================
            # TRAIN GENERATOR
            # ========================================
            opt_G.zero_grad()
            
            z = torch.randn(batch_size, 100, device=device)
            fake_images = generator(z)
            
            # Generator wants: high critic score for fakes
            loss_G = -critic(fake_images).mean()
            
            loss_G.backward()
            opt_G.step()
            
        print(f"Epoch {epoch}: C_loss={loss_C.item():.4f}, G_loss={loss_G.item():.4f}")
```

---

## 🔷 Conditional GAN (cGAN)

### The Problem

```
VANILLA GAN:
────────────
z (noise) → G → Random image

"I got an image of digit 7, but I wanted a 3!"

No control over what's generated.


CONDITIONAL GAN:
────────────────
z (noise) + c (condition) → G → Image matching condition

"Generate a 3" → G → Image of digit 3 ✓
"Generate a cat" → G → Image of cat ✓
```

### cGAN Architecture

```
CONDITIONAL GAN ARCHITECTURE:
════════════════════════════════════════════════════════

GENERATOR:
──────────
Input: z (noise) + c (condition)

  z ─────┐
         ├──→ Concat ──→ G ──→ Image
  c ─────┘
  
Example (MNIST):
  z = 100-dim noise
  c = one-hot label (10-dim for digits 0-9)
  Input to G = 110-dim vector


DISCRIMINATOR:
──────────────
Input: image + c (condition)

  Image ──┐
          ├──→ Concat ──→ D ──→ Real/Fake
  c ──────┘
  
D now answers: "Is this a REAL image of class c?"
Not just: "Is this a real image?"
```

### cGAN Implementation

```python
import torch
import torch.nn as nn

class ConditionalGenerator(nn.Module):
    """
    Conditional Generator for MNIST
    
    Input: noise z + label c
    Output: 28x28 image of digit c
    """
    def __init__(self, latent_dim=100, n_classes=10, img_shape=(1, 28, 28)):
        super().__init__()
        self.img_shape = img_shape
        
        # Label embedding
        self.label_embedding = nn.Embedding(n_classes, n_classes)
        
        self.model = nn.Sequential(
            nn.Linear(latent_dim + n_classes, 256),
            nn.LeakyReLU(0.2),
            nn.Linear(256, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            nn.Linear(512, 1024),
            nn.BatchNorm1d(1024),
            nn.LeakyReLU(0.2),
            nn.Linear(1024, int(torch.prod(torch.tensor(img_shape)))),
            nn.Tanh()
        )
    
    def forward(self, z, labels):
        # Embed labels
        label_emb = self.label_embedding(labels)
        
        # Concatenate noise and label
        gen_input = torch.cat([z, label_emb], dim=1)
        
        # Generate
        img = self.model(gen_input)
        return img.view(img.size(0), *self.img_shape)


class ConditionalDiscriminator(nn.Module):
    """
    Conditional Discriminator for MNIST
    
    Input: image + label
    Output: P(real | label)
    """
    def __init__(self, n_classes=10, img_shape=(1, 28, 28)):
        super().__init__()
        
        # Label embedding
        self.label_embedding = nn.Embedding(n_classes, n_classes)
        
        self.model = nn.Sequential(
            nn.Linear(int(torch.prod(torch.tensor(img_shape))) + n_classes, 512),
            nn.LeakyReLU(0.2),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, img, labels):
        # Flatten image
        img_flat = img.view(img.size(0), -1)
        
        # Embed labels
        label_emb = self.label_embedding(labels)
        
        # Concatenate image and label
        d_input = torch.cat([img_flat, label_emb], dim=1)
        
        # Classify
        return self.model(d_input)


# Usage
G = ConditionalGenerator()
D = ConditionalDiscriminator()

# Generate specific digits
z = torch.randn(10, 100)
labels = torch.arange(10)  # Generate 0, 1, 2, ..., 9

fake_images = G(z, labels)  # Each image is the digit we specified!
validity = D(fake_images, labels)

print(f"Generated images shape: {fake_images.shape}")
print(f"Validity shape: {validity.shape}")
```

---

## 🌟 StyleGAN

### Why StyleGAN is Special

```
STYLEGAN INNOVATIONS:
═══════════════════════════════════════════════════════

1. MAPPING NETWORK
   z ──→ [MLP] ──→ w (intermediate latent)
   
   Why? z space is tangled, w space is disentangled!
   
2. STYLE INJECTION
   w ──→ Affine ──→ [AdaIN] ←── Feature maps
   
   Inject style at each layer of G!
   
3. PROGRESSIVE GROWING
   Start at 4x4, gradually add layers for 8x8, 16x16, ..., 1024x1024
   
4. NOISE INJECTION
   Add random noise at each layer for fine details
```

### StyleGAN Architecture Overview

```
                    STYLEGAN GENERATOR
═══════════════════════════════════════════════════════════

z (512)
    │
    ▼ Mapping Network (8 FC layers)
w (512)     ← Intermediate latent space
    │
    ├───────────────────────────────────────┐
    │                                       │
    ▼                                       ▼
[Affine]                               [Affine]
    │                                       │
    ▼                                       ▼
┌───────────────────┐               ┌───────────────────┐
│   Const 4×4       │               │                   │
│       ↓           │               │                   │
│   AdaIN ←─────────┼───────────────┤                   │
│       ↓           │               │                   │
│   Conv           │               │                   │
│       ↓           │               │                   │
│   AdaIN ←─────────┼───────────────┤   (repeat)        │
│       ↓           │               │                   │
│   Upsample → 8×8  │               │                   │
└───────────────────┘               └───────────────────┘
        │
        ▼
   Continue to 1024×1024...


KEY INSIGHT:
────────────
Different layers control different features!

Early layers (4×4, 8×8):     Pose, face shape
Middle layers (16×16, 32×32): Hair, eyes, nose
Late layers (256×256+):       Color, fine texture
```

### Style Mixing

```
STYLE MIXING:
═══════════════════════════════════════════════════════

Use w₁ for early layers, w₂ for late layers!

Person A (w₁): Face shape, pose
Person B (w₂): Hair color, texture

Result: Person with A's face and B's hair!

┌──────────┐    ┌──────────┐    ┌──────────┐
│    😊    │ +  │    😎    │ =  │   😊👱   │
│ Source A │    │ Source B │    │ A+B Mix  │
│(coarse)  │    │ (fine)   │    │          │
└──────────┘    └──────────┘    └──────────┘
```

---

## 📊 Comparison Table

| Variant | Key Innovation | Pros | Cons | Use Case |
|---------|---------------|------|------|----------|
| **DCGAN** | Convolutions | Better images | Mode collapse | General images |
| **WGAN** | Wasserstein loss | Stable training | Weight clipping issues | Stable training needed |
| **WGAN-GP** | Gradient penalty | Very stable | Slower training | Best stability |
| **cGAN** | Conditional input | Controlled generation | Needs labels | Label-specific generation |
| **StyleGAN** | Style injection | Highest quality | Complex, slow | Photorealistic faces |
| **StyleGAN2** | Path length reg | Less artifacts | Very complex | State-of-the-art |

---

## 🎯 Choosing the Right GAN

```
DECISION FLOWCHART:
═══════════════════════════════════════════════════════════

Start
  │
  ├── Need conditional generation?
  │   └── YES → cGAN or StyleGAN
  │
  ├── Training is unstable?
  │   └── YES → WGAN-GP
  │
  ├── Working with images?
  │   └── YES → DCGAN at minimum
  │
  ├── Need highest quality faces?
  │   └── YES → StyleGAN2
  │
  └── Starting fresh?
      └── Start with DCGAN + WGAN-GP loss
```

---

## 📝 Homework

### Easy
1. What's the main difference between DCGAN and vanilla GAN?
2. Why doesn't WGAN use sigmoid in the discriminator?
3. What does "conditional" mean in cGAN?

### Medium
4. Implement DCGAN for CIFAR-10 dataset
5. Explain why gradient penalty is better than weight clipping
6. Add conditional labels to your MNIST GAN

### Hard
7. Implement WGAN-GP from scratch and compare training curves with vanilla GAN
8. Research and explain the key differences between StyleGAN and StyleGAN2
9. Implement style mixing with a pre-trained StyleGAN

---

## 🎯 Interview Questions & Answers

### Q1: What's the key innovation in DCGAN?
**A**: DCGAN introduced architectural guidelines for stable GAN training with convolutions:
- Transposed convolutions for upsampling (G)
- Strided convolutions for downsampling (D)
- BatchNorm (except D's first and G's last layer)
- ReLU in G, LeakyReLU in D

### Q2: What is Wasserstein distance and why use it?
**A**: Wasserstein distance (Earth Mover's Distance) measures the minimum "work" to transform one distribution into another. Unlike JS divergence:
- Always provides gradients
- Works when distributions don't overlap
- Value correlates with image quality

### Q3: Why does WGAN use a "critic" instead of "discriminator"?
**A**: The critic outputs a score (real number), not a probability. It measures "how real" an image is, not classifying real/fake. This unbounded output is needed for Wasserstein distance estimation.

### Q4: What's the gradient penalty in WGAN-GP?
**A**: It penalizes the critic when ||∇D|| ≠ 1 on interpolated points between real and fake samples. This enforces the 1-Lipschitz constraint required for Wasserstein distance, and is better than weight clipping.

### Q5: How does StyleGAN achieve disentanglement?
**A**: StyleGAN uses a mapping network to transform z→w, where w space is more disentangled. Different layers of the generator control different attributes (pose, hair, texture), allowing independent manipulation.

---

## 🔗 Next Steps

```
GAN Variants ────→ VAEs (different approach)
    │                   │
    │                   └── Probabilistic generation
    │                   └── Explicit likelihood
    │
    └────→ Projects: Implement DCGAN + WGAN-GP!
```

---

Next: [04-VAEs.md](./04-VAEs.md) - A probabilistic approach to generation!
