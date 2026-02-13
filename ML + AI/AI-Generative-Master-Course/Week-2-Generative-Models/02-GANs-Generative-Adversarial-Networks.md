# 02 - GANs: Generative Adversarial Networks

---

## Table of Contents

1. [Beginner Explanation](#beginner-explanation)
2. [Deep Technical Breakdown](#deep-technical-breakdown)
   - [The Adversarial Game](#the-adversarial-game)
   - [Generator Network](#generator-network)
   - [Discriminator Network](#discriminator-network)
   - [GAN Loss Functions](#gan-loss-functions)
   - [Training Dynamics](#training-dynamics)
   - [Mode Collapse Problem](#mode-collapse-problem)
   - [Training Instabilities](#training-instabilities)
3. [GAN Variants](#gan-variants)
   - [DCGAN (Deep Convolutional GAN)](#dcgan-deep-convolutional-gan)
   - [WGAN (Wasserstein GAN)](#wgan-wasserstein-gan)
   - [Conditional GAN (cGAN)](#conditional-gan-cgan)
   - [StyleGAN](#stylegan)
4. [Key Formulas](#key-formulas)
5. [Visual Mental Models](#visual-mental-models)
6. [Real World Use Cases](#real-world-use-cases)
7. [Complete GAN Implementation](#complete-gan-implementation)
8. [Mini Project: Face Generation](#mini-project-face-generation)
9. [Homework](#homework)
10. [Common Mistakes](#common-mistakes)
11. [Interview Questions & Answers](#interview-questions--answers)

---

## Beginner Explanation

### The Art Forger Analogy

Imagine a brilliant **art forger** (Generator) trying to create fake Picasso paintings, and an **art detective** (Discriminator) trying to catch the fakes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE GAN GAME                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐          ┌──────────────┐                        │
│   │   FORGER     │          │  DETECTIVE   │                        │
│   │ (Generator)  │          │(Discriminator)│                       │
│   │              │          │              │                        │
│   │  Creates     │──Fake──▶│  Examines    │                        │
│   │  fake art    │  Art    │  artwork     │                        │
│   │              │          │              │                        │
│   └──────────────┘          └───────┬──────┘                        │
│          ▲                          │                               │
│          │                          ▼                               │
│          │                   ┌──────────────┐                       │
│          │                   │   VERDICT    │                       │
│          │                   │  Real/Fake?  │                       │
│          │                   └──────────────┘                       │
│          │                          │                               │
│          └──────────────────────────┘                               │
│               Feedback Loop                                          │
│                                                                      │
│   🎯 Goal: Forger gets so good that Detective can't tell            │
│           the difference (50/50 guess)                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Day 1: The Forger is Terrible
```
Forger's "Picasso":    ┌─────┐
                       │ :-) │   Detective: "LOL, obviously fake"
                       └─────┘   Confidence: 99% fake
```

### Day 100: Forger is Improving
```
Forger's "Picasso":    ┌─────────┐
                       │ 👤 🎨   │   Detective: "Hmm, getting better..."
                       │ abstract│   Confidence: 70% fake
                       └─────────┘
```

### Day 1000: Master Forger
```
Forger's "Picasso":    ┌─────────────┐
                       │ ◇ ◈ ◆ ◇    │   Detective: "I... can't tell"
                       │   👁 👁      │   Confidence: 50% (random guess)
                       │  authentic  │
                       │   style!    │
                       └─────────────┘
```

### The Key Insight

Both networks improve **together** through competition:
- Generator gets **feedback** on how to improve
- Discriminator gets **better** at detecting fakes
- Until Generator produces **indistinguishable** samples

---

## Deep Technical Breakdown

### The Adversarial Game

GANs frame generation as a **two-player minimax game**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GAN ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Random Noise                                                       │
│      z ~ N(0,1)                                                      │
│         │                                                            │
│         ▼                                                            │
│   ┌───────────────┐                                                  │
│   │   GENERATOR   │                                                  │
│   │    G(z; θg)   │                                                  │
│   │               │                                                  │
│   │ z ──▶ x_fake  │                                                  │
│   └───────┬───────┘                                                  │
│           │                                                          │
│           ▼                                                          │
│       x_fake ─────────┐                                              │
│                       │                                              │
│                       ▼                                              │
│                 ┌───────────────┐                                    │
│   x_real ─────▶│ DISCRIMINATOR │──▶ D(x) ∈ [0,1]                    │
│   (data)       │   D(x; θd)    │                                    │
│                │               │    1 = Real                        │
│                │ x ──▶ prob    │    0 = Fake                        │
│                └───────────────┘                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Minimax Objective

$$\min_G \max_D V(D, G) = \mathbb{E}_{x \sim p_{data}}[\log D(x)] + \mathbb{E}_{z \sim p_z}[\log(1 - D(G(z)))]$$

**Breaking it down:**

| Term | Meaning | Who Optimizes |
|------|---------|---------------|
| $\log D(x)$ | Log probability of real data being real | D maximizes (wants D(x) → 1) |
| $\log(1 - D(G(z)))$ | Log probability of fake data being fake | D maximizes, G minimizes |

```
┌─────────────────────────────────────────────────────────────────────┐
│                   THE MINIMAX GAME                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   DISCRIMINATOR wants to MAXIMIZE:                                   │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                                                          │      │
│   │   log D(x_real) + log(1 - D(x_fake))                    │      │
│   │       ↑                    ↑                            │      │
│   │   Want = 1             Want = 0                         │      │
│   │   (high confidence     (low confidence                  │      │
│   │    real is real)        fake is real)                   │      │
│   │                                                          │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│   GENERATOR wants to MINIMIZE (or equivalently MAXIMIZE):            │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                                                          │      │
│   │   log(1 - D(G(z)))  ←→  -log(D(G(z)))                   │      │
│   │       ↑                      ↑                          │      │
│   │   Minimize this         Maximize this                   │      │
│   │   (saturates early)     (non-saturating)                │      │
│   │                                                          │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Generator Network

The Generator transforms random noise into realistic data:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GENERATOR ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Latent Vector z                                                    │
│   [z₁, z₂, ..., z₁₀₀]  ← Random noise ~ N(0, 1)                     │
│          │                                                           │
│          ▼                                                           │
│   ┌────────────────────┐                                            │
│   │ Linear: 100 → 256  │                                            │
│   │ BatchNorm + ReLU   │                                            │
│   └─────────┬──────────┘                                            │
│             │                                                        │
│             ▼                                                        │
│   ┌────────────────────┐                                            │
│   │ Linear: 256 → 512  │                                            │
│   │ BatchNorm + ReLU   │                                            │
│   └─────────┬──────────┘                                            │
│             │                                                        │
│             ▼                                                        │
│   ┌────────────────────┐                                            │
│   │ Linear: 512 → 1024 │                                            │
│   │ BatchNorm + ReLU   │                                            │
│   └─────────┬──────────┘                                            │
│             │                                                        │
│             ▼                                                        │
│   ┌────────────────────┐                                            │
│   │ Linear: 1024 → 784 │                                            │
│   │ Tanh activation    │  ← Output in range [-1, 1]                 │
│   └─────────┬──────────┘                                            │
│             │                                                        │
│             ▼                                                        │
│   Reshape to 28 × 28 image                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Discriminator Network

The Discriminator is a binary classifier:

```
┌─────────────────────────────────────────────────────────────────────┐
│                  DISCRIMINATOR ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Input Image (28 × 28)                                              │
│   Flatten to 784                                                     │
│          │                                                           │
│          ▼                                                           │
│   ┌────────────────────┐                                            │
│   │ Linear: 784 → 512  │                                            │
│   │ LeakyReLU(0.2)     │  ← Leaky, not ReLU!                        │
│   └─────────┬──────────┘                                            │
│             │                                                        │
│             ▼                                                        │
│   ┌────────────────────┐                                            │
│   │ Linear: 512 → 256  │                                            │
│   │ LeakyReLU(0.2)     │                                            │
│   └─────────┬──────────┘                                            │
│             │                                                        │
│             ▼                                                        │
│   ┌────────────────────┐                                            │
│   │ Linear: 256 → 1    │                                            │
│   │ Sigmoid            │  ← Output probability [0, 1]               │
│   └─────────┬──────────┘                                            │
│             │                                                        │
│             ▼                                                        │
│   P(real | x) ∈ [0, 1]                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### GAN Loss Functions

#### Original GAN Loss (Saturating)

```python
# Discriminator Loss
D_loss = -torch.mean(torch.log(D(real)) + torch.log(1 - D(G(z))))

# Generator Loss (saturating - problematic!)
G_loss = torch.mean(torch.log(1 - D(G(z))))
```

**Problem with saturating loss:**

```
┌─────────────────────────────────────────────────────────────────────┐
│            GRADIENT SATURATION PROBLEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Loss: log(1 - D(G(z)))                                            │
│                                                                      │
│   When D(G(z)) ≈ 0 (D easily detects fake):                         │
│                                                                      │
│        │                                                             │
│   Loss │ ▄▄▄▄▄▄▄▄▄▄                                                 │
│        │          ▀▀▀▄▄▄▄                                           │
│        │                 ▀▀▀▀▄▄                                     │
│        │                      ▀▀▀▄▄                                 │
│        │                          ▀▀▀▄                              │
│        │──────────────────────────────▀▀──▶                         │
│        0                                   1   D(G(z))              │
│                                                                      │
│   Problem: Flat gradient when D(G(z)) ≈ 0                           │
│            G learns VERY slowly at the start!                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Non-Saturating GAN Loss (Preferred)

```python
# Generator Loss (non-saturating - better!)
G_loss = -torch.mean(torch.log(D(G(z))))
```

```
┌─────────────────────────────────────────────────────────────────────┐
│            NON-SATURATING LOSS                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Loss: -log(D(G(z)))                                               │
│                                                                      │
│        │                                                             │
│   Loss │▀▀▀▄                                                        │
│        │    ▀▀▄                                                     │
│        │      ▀▀▄▄                                                  │
│        │          ▀▀▄▄                                              │
│        │              ▀▀▄▄▄▄                                        │
│        │──────────────────────▀▀▀▀▀──▶                              │
│        0                              1   D(G(z))                   │
│                                                                      │
│   Better: Strong gradient when D(G(z)) ≈ 0                          │
│           G learns quickly from the start!                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Training Dynamics

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GAN TRAINING LOOP                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   for each batch:                                                    │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ STEP 1: Train Discriminator (k steps, often k=1)        │       │
│   │                                                         │       │
│   │   1. Sample real data: x ~ p_data                       │       │
│   │   2. Sample noise: z ~ N(0, I)                          │       │
│   │   3. Generate fake: x_fake = G(z)                       │       │
│   │   4. Compute D loss:                                    │       │
│   │      L_D = -[log D(x) + log(1 - D(x_fake))]            │       │
│   │   5. Update D: θ_d ← θ_d - α∇L_D                       │       │
│   │                                                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                          │                                           │
│                          ▼                                           │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ STEP 2: Train Generator (1 step)                        │       │
│   │                                                         │       │
│   │   1. Sample noise: z ~ N(0, I)                          │       │
│   │   2. Generate fake: x_fake = G(z)                       │       │
│   │   3. Compute G loss:                                    │       │
│   │      L_G = -log D(x_fake)   (non-saturating)           │       │
│   │   4. Update G: θ_g ← θ_g - α∇L_G                       │       │
│   │                                                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│   Note: D is frozen when training G (no gradient to D)              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Mode Collapse Problem

**The biggest challenge in GAN training:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MODE COLLAPSE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   EXPECTED: Generator covers all modes of data distribution         │
│                                                                      │
│   Data Distribution:       Generated Distribution:                   │
│                                                                      │
│        ▄▄▄▄                      ▄▄▄▄                               │
│       ▐████▌  ▄▄▄▄              ▐████▌  ▄▄▄▄                        │
│       █████▌ ▐████▌             █████▌ ▐████▌                       │
│      ▐█████▌ █████▌            ▐█████▌ █████▌                       │
│   ──────────────────        ──────────────────                       │
│     Mode1   Mode2             Mode1   Mode2   ✓ Good!               │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   MODE COLLAPSE: Generator only covers one mode                      │
│                                                                      │
│   Data Distribution:       Generated Distribution:                   │
│                                                                      │
│        ▄▄▄▄                      ▄▄▄▄                               │
│       ▐████▌  ▄▄▄▄              ▐████▌                               │
│       █████▌ ▐████▌             ████████                            │
│      ▐█████▌ █████▌            ▐████████▌                           │
│   ──────────────────        ──────────────────                       │
│     Mode1   Mode2             Mode1 only!   ✗ Bad!                  │
│                                                                      │
│   Example: Training on MNIST, but G only outputs "1"s               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Why does mode collapse happen?**

```
┌─────────────────────────────────────────────────────────────────────┐
│               MODE COLLAPSE DYNAMICS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   1. G finds one sample that "fools" D                              │
│                                                                      │
│   2. G keeps producing variations of that sample                    │
│                                                                      │
│   3. D learns to reject that specific sample                        │
│                                                                      │
│   4. G "jumps" to another single mode that fools D                  │
│                                                                      │
│   5. Cycle repeats - never converges to full distribution          │
│                                                                      │
│         G outputs        D rejects         G jumps                  │
│            │                │                  │                    │
│            ▼                ▼                  ▼                    │
│         [1,1,1] ───▶ learns "1" ───▶ [7,7,7] ───▶ ...              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Training Instabilities

```
┌─────────────────────────────────────────────────────────────────────┐
│                  GAN TRAINING PROBLEMS                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   1. VANISHING GRADIENTS                                            │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ If D is too good → D(G(z)) ≈ 0 → log(1-0) ≈ 0          │       │
│   │ Gradient to G vanishes, G can't learn                   │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│   2. DISCRIMINATOR OVERPOWERING                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ D becomes perfect classifier before G improves          │       │
│   │ No useful gradient signal for G                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│   3. OSCILLATION / NON-CONVERGENCE                                   │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                                                         │       │
│   │   Loss │    ╭─╮   ╭─╮   ╭─╮                            │       │
│   │        │   ╱   ╲ ╱   ╲ ╱   ╲                           │       │
│   │        │──╱─────╳─────╳─────╲──▶ Epochs                │       │
│   │        │ ╱     ╲ ╱   ╲ ╱                               │       │
│   │        │╱       ╰─╯   ╰─╯                              │       │
│   │                                                         │       │
│   │   G and D keep "chasing" each other                    │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│   4. NO MEANINGFUL LOSS METRIC                                       │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │ D loss ≈ 0.5 doesn't mean good samples!                │       │
│   │ Must visually inspect generated samples                 │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## GAN Variants

### DCGAN (Deep Convolutional GAN)

**Key innovations:**
- Use **transposed convolutions** instead of dense layers in G
- Use **strided convolutions** instead of pooling in D
- **Batch normalization** in both networks
- No fully connected layers (except input/output)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DCGAN ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   GENERATOR (Transposed Convolutions):                               │
│                                                                      │
│   z (100,)                                                           │
│      │                                                               │
│      ▼ Reshape                                                       │
│   (100, 1, 1)                                                        │
│      │                                                               │
│      ▼ ConvTranspose2d(100, 512, 4, 1, 0)                           │
│   (512, 4, 4)                                                        │
│      │ + BatchNorm + ReLU                                           │
│      ▼ ConvTranspose2d(512, 256, 4, 2, 1)                           │
│   (256, 8, 8)                                                        │
│      │ + BatchNorm + ReLU                                           │
│      ▼ ConvTranspose2d(256, 128, 4, 2, 1)                           │
│   (128, 16, 16)                                                      │
│      │ + BatchNorm + ReLU                                           │
│      ▼ ConvTranspose2d(128, 64, 4, 2, 1)                            │
│   (64, 32, 32)                                                       │
│      │ + BatchNorm + ReLU                                           │
│      ▼ ConvTranspose2d(64, 3, 4, 2, 1)                              │
│   (3, 64, 64) + Tanh                                                │
│                                                                      │
│                                                                      │
│   DISCRIMINATOR (Strided Convolutions):                              │
│                                                                      │
│   (3, 64, 64) Image                                                  │
│      │                                                               │
│      ▼ Conv2d(3, 64, 4, 2, 1) + LeakyReLU                           │
│   (64, 32, 32)                                                       │
│      │                                                               │
│      ▼ Conv2d(64, 128, 4, 2, 1) + BN + LeakyReLU                    │
│   (128, 16, 16)                                                      │
│      │                                                               │
│      ▼ Conv2d(128, 256, 4, 2, 1) + BN + LeakyReLU                   │
│   (256, 8, 8)                                                        │
│      │                                                               │
│      ▼ Conv2d(256, 512, 4, 2, 1) + BN + LeakyReLU                   │
│   (512, 4, 4)                                                        │
│      │                                                               │
│      ▼ Conv2d(512, 1, 4, 1, 0) + Sigmoid                            │
│   (1,) probability                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### WGAN (Wasserstein GAN)

**Key Innovation:** Replace JS divergence with **Wasserstein Distance** (Earth Mover's Distance)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WGAN KEY DIFFERENCES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ORIGINAL GAN              vs           WGAN                        │
│   ───────────────────────────────────────────────────               │
│   Discriminator                          Critic                      │
│   Output: [0, 1] (sigmoid)               Output: ℝ (no sigmoid)     │
│   Loss: BCE                              Loss: Wasserstein           │
│   Training: Balanced                     Critic trains more (5×)     │
│   Weight clipping: No                    Weight clipping: Yes        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   WASSERSTEIN DISTANCE (Earth Mover's Distance):                     │
│                                                                      │
│   W(P_r, P_g) = inf  E[||x - y||]                                   │
│                γ∈Π                                                   │
│                                                                      │
│   "Minimum cost to transform one distribution into another"         │
│                                                                      │
│   Real distribution:    ▄▄▄▄▄▄▄▄                                    │
│                        █████████                                    │
│                                                                      │
│   Generated:                        ▄▄▄▄▄▄                          │
│                                    ██████                           │
│                                                                      │
│   W = "cost" to move mass ─────────────▶                            │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   WGAN LOSS:                                                         │
│                                                                      │
│   Critic: max E[C(x_real)] - E[C(x_fake)]                           │
│                                                                      │
│   Generator: max E[C(G(z))]                                         │
│              (equivalently min -E[C(G(z))])                         │
│                                                                      │
│   WHERE C is the Critic (not Discriminator)                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**WGAN-GP (Gradient Penalty):**

Instead of weight clipping, add gradient penalty:

$$L_{GP} = \lambda \mathbb{E}_{\hat{x}}[(||\nabla_{\hat{x}} D(\hat{x})||_2 - 1)^2]$$

Where $\hat{x} = \epsilon x_{real} + (1-\epsilon) x_{fake}$ (interpolated samples)

### Conditional GAN (cGAN)

**Key Idea:** Condition generation on **class labels** or other information

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CONDITIONAL GAN                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Standard GAN:                                                      │
│   z ──▶ G ──▶ x_fake         (no control over what is generated)   │
│                                                                      │
│   Conditional GAN:                                                   │
│   [z, y] ──▶ G ──▶ x_fake    (y controls the class!)               │
│                                                                      │
│                                                                      │
│   ┌──────────────┐     ┌──────────────┐                             │
│   │   z (noise)  │     │  y (label)   │                             │
│   │   [100,]     │     │  one-hot [10]│                             │
│   └──────┬───────┘     └──────┬───────┘                             │
│          │                    │                                      │
│          └────────┬───────────┘                                      │
│                   │ Concatenate                                      │
│                   ▼                                                  │
│            ┌─────────────┐                                          │
│            │  GENERATOR  │                                          │
│            │ G(z, y)     │                                          │
│            └──────┬──────┘                                          │
│                   │                                                  │
│                   ▼                                                  │
│              x_fake                                                  │
│                                                                      │
│   Example: y = [0,0,0,1,0,0,0,0,0,0] → Generate digit "3"           │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   DISCRIMINATOR also receives y:                                     │
│                                                                      │
│   D(x, y) → Real/Fake given class y                                 │
│                                                                      │
│   "Is this a real '3' or a fake '3'?"                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### StyleGAN

**Key Innovations:**
1. **Mapping Network**: z → w (intermediate latent space)
2. **Adaptive Instance Normalization (AdaIN)**: Style injection at each layer
3. **Progressive Growing**: Train at increasing resolutions
4. **Style Mixing**: Combine styles from different latent codes

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STYLEGAN ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   z ~ N(0, I)                                                        │
│      │                                                               │
│      ▼                                                               │
│   ┌─────────────────┐                                               │
│   │ MAPPING NETWORK │  8 FC layers                                  │
│   │    f: Z → W     │  z ∈ Z → w ∈ W                               │
│   └────────┬────────┘                                               │
│            │                                                         │
│            ▼                                                         │
│         w (512,)  ← "Style" vector                                  │
│            │                                                         │
│            │ Affine transforms (learned A)                          │
│            │                                                         │
│            ├──────────────┬──────────────┬─────────▶                │
│            ▼              ▼              ▼                          │
│   ┌─────────────────────────────────────────────────────┐           │
│   │                                                     │           │
│   │   Constant ──▶ Conv ──▶ AdaIN ──▶ Conv ──▶ AdaIN   │ 4×4       │
│   │      4×4         │        ▲         │        ▲     │           │
│   │                  │        │         │        │     │           │
│   │                  │     w──┘         │     w──┘     │           │
│   │                  │                  │              │           │
│   │              ┌───┴──────────────────┴───┐          │           │
│   │              │     + Noise injection   │          │           │
│   │              └─────────────────────────┘          │           │
│   │                                                     │           │
│   │   ──▶ Upsample ──▶ Conv ──▶ AdaIN ──▶ ...        │ 8×8→1024  │
│   │                                                     │           │
│   └─────────────────────────────────────────────────────┘           │
│                                                                      │
│   AdaIN: Adaptive Instance Normalization                            │
│   AdaIN(x, y) = y_s * (x - μ(x))/σ(x) + y_b                        │
│                                                                      │
│   Style at different layers controls different features:            │
│   - Early layers (4×4, 8×8): Pose, face shape                       │
│   - Middle layers (16×16, 32×32): Facial features                   │
│   - Late layers (64×64+): Color, micro-features                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Formulas

### Core GAN Formulas

| Formula | Description |
|---------|-------------|
| $\min_G \max_D V(D,G) = \mathbb{E}_{x \sim p_{data}}[\log D(x)] + \mathbb{E}_{z \sim p_z}[\log(1-D(G(z)))]$ | GAN Minimax Objective |
| $L_D = -\mathbb{E}[\log D(x)] - \mathbb{E}[\log(1-D(G(z)))]$ | Discriminator Loss |
| $L_G = -\mathbb{E}[\log D(G(z))]$ | Generator Loss (Non-saturating) |
| $L_G = \mathbb{E}[\log(1-D(G(z)))]$ | Generator Loss (Original, saturating) |

### Optimal Discriminator

For fixed G, the optimal discriminator is:

$$D^*_G(x) = \frac{p_{data}(x)}{p_{data}(x) + p_g(x)}$$

### Nash Equilibrium

At the **Nash equilibrium** (optimal solution):
- $p_g = p_{data}$ (generated distribution equals data distribution)
- $D(x) = 0.5$ for all x (discriminator can't distinguish)

### JS Divergence Connection

When D is optimal, the GAN objective becomes:

$$C(G) = -\log 4 + 2 \cdot JSD(p_{data} || p_g)$$

Where JSD is Jensen-Shannon Divergence.

### WGAN Formulas

| Formula | Description |
|---------|-------------|
| $W(P_r, P_g) = \sup_{||f||_L \leq 1} \mathbb{E}_{x \sim P_r}[f(x)] - \mathbb{E}_{x \sim P_g}[f(x)]$ | Wasserstein Distance (Kantorovich-Rubinstein) |
| $L_C = -\mathbb{E}[C(x)] + \mathbb{E}[C(G(z))]$ | Critic Loss |
| $L_G = -\mathbb{E}[C(G(z))]$ | WGAN Generator Loss |
| $L_{GP} = \lambda \mathbb{E}_{\hat{x}}[(||\nabla_{\hat{x}} C(\hat{x})||_2 - 1)^2]$ | Gradient Penalty |

---

## Visual Mental Models

### GAN Training Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                  GAN LEARNING PROGRESSION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   EPOCH 0: Random Noise                                              │
│   ┌─────────────────────────────────────────┐                       │
│   │  ░░▒▒░░▓▓░░▒▒  ░░▓▓▒▒░░  ▒▒░░▓▓░░    │                       │
│   │  ▓▓░░▒▒▓▓░░▒▒  ░░▒▒▓▓░░  ░░▒▒░░▓▓    │ D: 99% Fake            │
│   │  ░░▓▓░░▒▒▓▓░░  ▒▒░░▒▒▓▓  ▓▓░░▒▒░░    │                       │
│   └─────────────────────────────────────────┘                       │
│                                                                      │
│   EPOCH 50: Vague Shapes                                             │
│   ┌─────────────────────────────────────────┐                       │
│   │    ╭──╮         ╭──╮        ╭──╮      │                       │
│   │   (    )       (    )      (    )     │ D: 80% Fake            │
│   │    ╰──╯         ╰──╯        ╰──╯      │                       │
│   └─────────────────────────────────────────┘                       │
│                                                                      │
│   EPOCH 200: Recognizable Digits                                     │
│   ┌─────────────────────────────────────────┐                       │
│   │    ██          ███          ██         │                       │
│   │   █  █           █         █  █        │ D: 60% Fake            │
│   │    ██          ███          ██         │                       │
│   └─────────────────────────────────────────┘                       │
│                                                                      │
│   EPOCH 500: Clear Digits                                            │
│   ┌─────────────────────────────────────────┐                       │
│   │    ███         ████         ███        │                       │
│   │   █   █           █        █   █       │ D: 52% Fake            │
│   │    ███         ████        █████       │                       │
│   └─────────────────────────────────────────┘                       │
│                                                                      │
│   EPOCH 1000: Indistinguishable                                      │
│   ┌─────────────────────────────────────────┐                       │
│   │     ▄█▄         ▄█▄          ▄█▄       │                       │
│   │    █▀ ▀█       ▄▄█▀▀        █▀ ▀█      │ D: 50% (Guessing)     │
│   │     ▀█▀         ▀▀▀▀▀        ▀█▀       │                       │
│   └─────────────────────────────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Latent Space Interpolation

```
┌─────────────────────────────────────────────────────────────────────┐
│              LATENT SPACE INTERPOLATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   z₁ ────────────────────────────────────────────▶ z₂               │
│                                                                      │
│   G(z₁)    G(0.8z₁+0.2z₂)    G(0.5z₁+0.5z₂)    G(0.2z₁+0.8z₂)    G(z₂)
│                                                                      │
│   ┌───┐      ┌───┐           ┌───┐           ┌───┐      ┌───┐      │
│   │ 3 │  →   │ 3 │    →      │ 8 │    →      │ 8 │  →   │ 8 │      │
│   │   │      │ 8 │           │   │           │   │      │   │      │
│   └───┘      └───┘           └───┘           └───┘      └───┘      │
│                                                                      │
│   "3"     "3 morphing        "Mix"      "8 forming"    "8"         │
│            into 8"                                                   │
│                                                                      │
│   ✓ Smooth transitions = good latent space structure                │
│   ✗ Sudden jumps = poor latent space                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Distribution Matching

```
┌─────────────────────────────────────────────────────────────────────┐
│                DISTRIBUTION MATCHING                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Z-Space (Noise)          Transformation           X-Space (Data)  │
│                                 G                                    │
│                                                                      │
│        │                                              │              │
│   P(z) │   ▄▄▄▄▄▄▄▄                         P_g(x)   │              │
│        │  ▐████████▌                                 │   ▄▄▄▄       │
│        │  ██████████      ────────▶                  │  ▐████▌      │
│        │  ██████████                                 │ ▐██████▌     │
│        │  ▐████████▌                                 │  ████████    │
│        │   ▀▀▀▀▀▀▀▀                                  │   ▀████▀     │
│        └────────────                                 └──────────    │
│         Gaussian N(0,1)                               Generated     │
│                                                                      │
│                                                    vs               │
│                                                                      │
│                                               P_data(x) │           │
│                                                         │   ▄▄▄▄   │
│                                                         │  ▐████▌  │
│                                                         │ ▐██████▌ │
│                                                         │  ████████│
│                                                         │   ▀████▀ │
│                                                         └──────────│
│                                                         Real Data  │
│                                                                      │
│   Goal: P_g(x) → P_data(x)                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Real World Use Cases

| Application | Description | GAN Type |
|-------------|-------------|----------|
| **Face Generation** | Create photorealistic human faces | StyleGAN, ProGAN |
| **Image Super-Resolution** | Upscale low-res images | SRGAN, ESRGAN |
| **Style Transfer** | Apply artistic styles to photos | CycleGAN, Neural Style |
| **Image-to-Image Translation** | Convert sketches to photos | Pix2Pix, CycleGAN |
| **Data Augmentation** | Generate synthetic training data | cGAN, DCGAN |
| **Video Synthesis** | Generate realistic videos | Vid2Vid, DVD-GAN |
| **3D Object Generation** | Create 3D models | 3D-GAN, PrGAN |
| **Text-to-Image** | Generate images from text descriptions | StackGAN, AttnGAN |
| **Deepfakes** | Face swapping in videos | FaceSwap GAN |
| **Medical Imaging** | Synthetic medical scans | MedGAN |
| **Drug Discovery** | Generate molecular structures | MolGAN |
| **Music Generation** | Create music samples | WaveGAN, GANSynth |

---

## Complete GAN Implementation

### Basic GAN from Scratch (NumPy)

```python
import numpy as np
import matplotlib.pyplot as plt

class BasicGAN:
    """
    Complete GAN implementation from scratch using NumPy
    For educational purposes - demonstrates core concepts
    """
    
    def __init__(self, latent_dim=100, data_dim=784, hidden_dim=256):
        self.latent_dim = latent_dim
        self.data_dim = data_dim
        self.hidden_dim = hidden_dim
        
        # Initialize Generator weights
        self.G_W1 = np.random.randn(latent_dim, hidden_dim) * 0.02
        self.G_b1 = np.zeros((1, hidden_dim))
        self.G_W2 = np.random.randn(hidden_dim, hidden_dim) * 0.02
        self.G_b2 = np.zeros((1, hidden_dim))
        self.G_W3 = np.random.randn(hidden_dim, data_dim) * 0.02
        self.G_b3 = np.zeros((1, data_dim))
        
        # Initialize Discriminator weights
        self.D_W1 = np.random.randn(data_dim, hidden_dim) * 0.02
        self.D_b1 = np.zeros((1, hidden_dim))
        self.D_W2 = np.random.randn(hidden_dim, hidden_dim) * 0.02
        self.D_b2 = np.zeros((1, hidden_dim))
        self.D_W3 = np.random.randn(hidden_dim, 1) * 0.02
        self.D_b3 = np.zeros((1, 1))
        
    def leaky_relu(self, x, alpha=0.2):
        """LeakyReLU activation"""
        return np.where(x > 0, x, alpha * x)
    
    def leaky_relu_derivative(self, x, alpha=0.2):
        """Derivative of LeakyReLU"""
        return np.where(x > 0, 1, alpha)
    
    def sigmoid(self, x):
        """Sigmoid activation"""
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))
    
    def tanh(self, x):
        """Tanh activation"""
        return np.tanh(x)
    
    def tanh_derivative(self, x):
        """Derivative of tanh"""
        return 1 - np.tanh(x) ** 2
    
    def generator_forward(self, z):
        """
        Generator forward pass
        z -> hidden1 -> hidden2 -> output
        """
        # Layer 1
        self.G_z1 = z @ self.G_W1 + self.G_b1
        self.G_a1 = self.leaky_relu(self.G_z1)
        
        # Layer 2
        self.G_z2 = self.G_a1 @ self.G_W2 + self.G_b2
        self.G_a2 = self.leaky_relu(self.G_z2)
        
        # Output layer (tanh for [-1, 1] output)
        self.G_z3 = self.G_a2 @ self.G_W3 + self.G_b3
        self.G_output = self.tanh(self.G_z3)
        
        return self.G_output
    
    def discriminator_forward(self, x):
        """
        Discriminator forward pass
        x -> hidden1 -> hidden2 -> probability
        """
        # Layer 1
        self.D_z1 = x @ self.D_W1 + self.D_b1
        self.D_a1 = self.leaky_relu(self.D_z1)
        
        # Layer 2
        self.D_z2 = self.D_a1 @ self.D_W2 + self.D_b2
        self.D_a2 = self.leaky_relu(self.D_z2)
        
        # Output layer (sigmoid for probability)
        self.D_z3 = self.D_a2 @ self.D_W3 + self.D_b3
        self.D_output = self.sigmoid(self.D_z3)
        
        return self.D_output
    
    def discriminator_backward(self, x, real_or_fake, d_output_grad):
        """
        Discriminator backward pass
        """
        batch_size = x.shape[0]
        
        # Output layer gradients
        d_z3 = d_output_grad * self.D_output * (1 - self.D_output)  # sigmoid derivative
        d_W3 = self.D_a2.T @ d_z3 / batch_size
        d_b3 = np.mean(d_z3, axis=0, keepdims=True)
        
        # Layer 2 gradients
        d_a2 = d_z3 @ self.D_W3.T
        d_z2 = d_a2 * self.leaky_relu_derivative(self.D_z2)
        d_W2 = self.D_a1.T @ d_z2 / batch_size
        d_b2 = np.mean(d_z2, axis=0, keepdims=True)
        
        # Layer 1 gradients
        d_a1 = d_z2 @ self.D_W2.T
        d_z1 = d_a1 * self.leaky_relu_derivative(self.D_z1)
        d_W1 = x.T @ d_z1 / batch_size
        d_b1 = np.mean(d_z1, axis=0, keepdims=True)
        
        return {
            'W1': d_W1, 'b1': d_b1,
            'W2': d_W2, 'b2': d_b2,
            'W3': d_W3, 'b3': d_b3
        }
    
    def generator_backward(self, z, d_fake_output):
        """
        Generator backward pass (gradients flow through D)
        """
        batch_size = z.shape[0]
        
        # Gradient from D output through D layers to G output
        d_G_output = d_fake_output @ self.D_W3.T
        d_G_output = d_G_output * self.leaky_relu_derivative(self.D_z2)
        d_G_output = d_G_output @ self.D_W2.T
        d_G_output = d_G_output * self.leaky_relu_derivative(self.D_z1)
        d_G_output = d_G_output @ self.D_W1.T
        
        # G output layer gradients
        d_z3 = d_G_output * self.tanh_derivative(self.G_z3)
        d_W3 = self.G_a2.T @ d_z3 / batch_size
        d_b3 = np.mean(d_z3, axis=0, keepdims=True)
        
        # G layer 2 gradients
        d_a2 = d_z3 @ self.G_W3.T
        d_z2 = d_a2 * self.leaky_relu_derivative(self.G_z2)
        d_W2 = self.G_a1.T @ d_z2 / batch_size
        d_b2 = np.mean(d_z2, axis=0, keepdims=True)
        
        # G layer 1 gradients
        d_a1 = d_z2 @ self.G_W2.T
        d_z1 = d_a1 * self.leaky_relu_derivative(self.G_z1)
        d_W1 = z.T @ d_z1 / batch_size
        d_b1 = np.mean(d_z1, axis=0, keepdims=True)
        
        return {
            'W1': d_W1, 'b1': d_b1,
            'W2': d_W2, 'b2': d_b2,
            'W3': d_W3, 'b3': d_b3
        }
    
    def train_step(self, real_data, learning_rate=0.0002):
        """
        One training step: train D then train G
        """
        batch_size = real_data.shape[0]
        
        # ============ Train Discriminator ============
        
        # Sample noise
        z = np.random.randn(batch_size, self.latent_dim)
        
        # Generate fake data
        fake_data = self.generator_forward(z)
        
        # Forward pass on real data
        real_pred = self.discriminator_forward(real_data)
        
        # Store D activations for real data
        D_a1_real, D_a2_real = self.D_a1.copy(), self.D_a2.copy()
        D_z1_real, D_z2_real = self.D_z1.copy(), self.D_z2.copy()
        
        # Forward pass on fake data
        fake_pred = self.discriminator_forward(fake_data)
        
        # D loss gradients
        # For real: want D(x) = 1, loss = -log(D(x)), grad = -1/D(x)
        d_real_grad = -1 / (real_pred + 1e-8)
        
        # For fake: want D(G(z)) = 0, loss = -log(1-D(G(z))), grad = 1/(1-D(G(z)))
        d_fake_grad = 1 / (1 - fake_pred + 1e-8)
        
        # Backward pass for D on real data
        self.D_a1, self.D_a2 = D_a1_real, D_a2_real
        self.D_z1, self.D_z2 = D_z1_real, D_z2_real
        d_grads_real = self.discriminator_backward(real_data, 'real', d_real_grad)
        
        # Backward pass for D on fake data
        self.discriminator_forward(fake_data)  # Recompute activations
        d_grads_fake = self.discriminator_backward(fake_data, 'fake', d_fake_grad)
        
        # Update D weights
        self.D_W1 -= learning_rate * (d_grads_real['W1'] + d_grads_fake['W1'])
        self.D_b1 -= learning_rate * (d_grads_real['b1'] + d_grads_fake['b1'])
        self.D_W2 -= learning_rate * (d_grads_real['W2'] + d_grads_fake['W2'])
        self.D_b2 -= learning_rate * (d_grads_real['b2'] + d_grads_fake['b2'])
        self.D_W3 -= learning_rate * (d_grads_real['W3'] + d_grads_fake['W3'])
        self.D_b3 -= learning_rate * (d_grads_real['b3'] + d_grads_fake['b3'])
        
        # ============ Train Generator ============
        
        # Generate new fake data
        z = np.random.randn(batch_size, self.latent_dim)
        fake_data = self.generator_forward(z)
        fake_pred = self.discriminator_forward(fake_data)
        
        # G loss gradient (non-saturating: maximize log(D(G(z))))
        # loss = -log(D(G(z))), grad w.r.t D output = -1/D(G(z))
        g_grad = -1 / (fake_pred + 1e-8)
        
        # Backward through D (but don't update D)
        d_z3 = g_grad * self.D_output * (1 - self.D_output)
        d_a2 = d_z3 @ self.D_W3.T
        d_z2 = d_a2 * self.leaky_relu_derivative(self.D_z2)
        d_a1 = d_z2 @ self.D_W2.T
        d_z1 = d_a1 * self.leaky_relu_derivative(self.D_z1)
        d_G_output = d_z1 @ self.D_W1.T
        
        # Backward through G
        d_z3_g = d_G_output * self.tanh_derivative(self.G_z3)
        g_W3 = self.G_a2.T @ d_z3_g / batch_size
        g_b3 = np.mean(d_z3_g, axis=0, keepdims=True)
        
        d_a2_g = d_z3_g @ self.G_W3.T
        d_z2_g = d_a2_g * self.leaky_relu_derivative(self.G_z2)
        g_W2 = self.G_a1.T @ d_z2_g / batch_size
        g_b2 = np.mean(d_z2_g, axis=0, keepdims=True)
        
        d_a1_g = d_z2_g @ self.G_W2.T
        d_z1_g = d_a1_g * self.leaky_relu_derivative(self.G_z1)
        g_W1 = z.T @ d_z1_g / batch_size
        g_b1 = np.mean(d_z1_g, axis=0, keepdims=True)
        
        # Update G weights
        self.G_W1 -= learning_rate * g_W1
        self.G_b1 -= learning_rate * g_b1
        self.G_W2 -= learning_rate * g_W2
        self.G_b2 -= learning_rate * g_b2
        self.G_W3 -= learning_rate * g_W3
        self.G_b3 -= learning_rate * g_b3
        
        # Compute losses for logging
        d_loss = -np.mean(np.log(real_pred + 1e-8) + np.log(1 - fake_pred + 1e-8))
        g_loss = -np.mean(np.log(fake_pred + 1e-8))
        
        return d_loss, g_loss
    
    def generate(self, num_samples=1):
        """Generate samples"""
        z = np.random.randn(num_samples, self.latent_dim)
        return self.generator_forward(z)


# ============ PyTorch Implementation ============

import torch
import torch.nn as nn
import torch.optim as optim

class Generator(nn.Module):
    """PyTorch Generator Network"""
    
    def __init__(self, latent_dim=100, hidden_dim=256, output_dim=784):
        super().__init__()
        
        self.model = nn.Sequential(
            # Layer 1
            nn.Linear(latent_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.LeakyReLU(0.2),
            
            # Layer 2
            nn.Linear(hidden_dim, hidden_dim * 2),
            nn.BatchNorm1d(hidden_dim * 2),
            nn.LeakyReLU(0.2),
            
            # Layer 3
            nn.Linear(hidden_dim * 2, hidden_dim * 4),
            nn.BatchNorm1d(hidden_dim * 4),
            nn.LeakyReLU(0.2),
            
            # Output
            nn.Linear(hidden_dim * 4, output_dim),
            nn.Tanh()  # Output in [-1, 1]
        )
        
        self._initialize_weights()
    
    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.02)
                nn.init.zeros_(m.bias)
    
    def forward(self, z):
        return self.model(z)


class Discriminator(nn.Module):
    """PyTorch Discriminator Network"""
    
    def __init__(self, input_dim=784, hidden_dim=256):
        super().__init__()
        
        self.model = nn.Sequential(
            # Layer 1 (no BatchNorm in first D layer)
            nn.Linear(input_dim, hidden_dim * 4),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            # Layer 2
            nn.Linear(hidden_dim * 4, hidden_dim * 2),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            # Layer 3
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            # Output
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
        
        self._initialize_weights()
    
    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.02)
                nn.init.zeros_(m.bias)
    
    def forward(self, x):
        return self.model(x)


class GAN:
    """Complete GAN training wrapper"""
    
    def __init__(self, latent_dim=100, data_dim=784, hidden_dim=256, 
                 lr=0.0002, betas=(0.5, 0.999), device='cpu'):
        self.latent_dim = latent_dim
        self.device = device
        
        # Initialize networks
        self.G = Generator(latent_dim, hidden_dim, data_dim).to(device)
        self.D = Discriminator(data_dim, hidden_dim).to(device)
        
        # Optimizers
        self.G_optimizer = optim.Adam(self.G.parameters(), lr=lr, betas=betas)
        self.D_optimizer = optim.Adam(self.D.parameters(), lr=lr, betas=betas)
        
        # Loss function
        self.criterion = nn.BCELoss()
        
        # For logging
        self.G_losses = []
        self.D_losses = []
    
    def train_step(self, real_data):
        """One training iteration"""
        batch_size = real_data.size(0)
        real_data = real_data.to(self.device)
        
        # Labels
        real_labels = torch.ones(batch_size, 1).to(self.device)
        fake_labels = torch.zeros(batch_size, 1).to(self.device)
        
        # ============ Train Discriminator ============
        self.D_optimizer.zero_grad()
        
        # Real data
        real_pred = self.D(real_data)
        d_loss_real = self.criterion(real_pred, real_labels)
        
        # Fake data
        z = torch.randn(batch_size, self.latent_dim).to(self.device)
        fake_data = self.G(z)
        fake_pred = self.D(fake_data.detach())  # detach to not train G
        d_loss_fake = self.criterion(fake_pred, fake_labels)
        
        # Combined D loss
        d_loss = d_loss_real + d_loss_fake
        d_loss.backward()
        self.D_optimizer.step()
        
        # ============ Train Generator ============
        self.G_optimizer.zero_grad()
        
        # Generate fake data
        z = torch.randn(batch_size, self.latent_dim).to(self.device)
        fake_data = self.G(z)
        fake_pred = self.D(fake_data)
        
        # G wants D to think fake is real
        g_loss = self.criterion(fake_pred, real_labels)
        g_loss.backward()
        self.G_optimizer.step()
        
        # Store losses
        self.D_losses.append(d_loss.item())
        self.G_losses.append(g_loss.item())
        
        return d_loss.item(), g_loss.item()
    
    def generate(self, num_samples=16):
        """Generate samples"""
        self.G.eval()
        with torch.no_grad():
            z = torch.randn(num_samples, self.latent_dim).to(self.device)
            samples = self.G(z)
        self.G.train()
        return samples.cpu().numpy()
    
    def train(self, dataloader, epochs=100, print_every=10):
        """Full training loop"""
        for epoch in range(epochs):
            epoch_d_loss = 0
            epoch_g_loss = 0
            num_batches = 0
            
            for batch_data in dataloader:
                if isinstance(batch_data, (list, tuple)):
                    real_data = batch_data[0]
                else:
                    real_data = batch_data
                
                real_data = real_data.view(real_data.size(0), -1)
                d_loss, g_loss = self.train_step(real_data)
                
                epoch_d_loss += d_loss
                epoch_g_loss += g_loss
                num_batches += 1
            
            if (epoch + 1) % print_every == 0:
                avg_d = epoch_d_loss / num_batches
                avg_g = epoch_g_loss / num_batches
                print(f"Epoch [{epoch+1}/{epochs}] D_loss: {avg_d:.4f} G_loss: {avg_g:.4f}")


# ============ DCGAN Implementation ============

class DCGANGenerator(nn.Module):
    """DCGAN Generator with transposed convolutions"""
    
    def __init__(self, latent_dim=100, feature_maps=64, channels=1):
        super().__init__()
        
        self.latent_dim = latent_dim
        
        self.model = nn.Sequential(
            # Input: latent_dim x 1 x 1
            nn.ConvTranspose2d(latent_dim, feature_maps * 8, 4, 1, 0, bias=False),
            nn.BatchNorm2d(feature_maps * 8),
            nn.ReLU(True),
            # State: (feature_maps*8) x 4 x 4
            
            nn.ConvTranspose2d(feature_maps * 8, feature_maps * 4, 4, 2, 1, bias=False),
            nn.BatchNorm2d(feature_maps * 4),
            nn.ReLU(True),
            # State: (feature_maps*4) x 8 x 8
            
            nn.ConvTranspose2d(feature_maps * 4, feature_maps * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(feature_maps * 2),
            nn.ReLU(True),
            # State: (feature_maps*2) x 16 x 16
            
            nn.ConvTranspose2d(feature_maps * 2, feature_maps, 4, 2, 1, bias=False),
            nn.BatchNorm2d(feature_maps),
            nn.ReLU(True),
            # State: (feature_maps) x 32 x 32
            
            nn.ConvTranspose2d(feature_maps, channels, 4, 2, 1, bias=False),
            nn.Tanh()
            # Output: channels x 64 x 64
        )
        
        self._initialize_weights()
    
    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, (nn.Conv2d, nn.ConvTranspose2d)):
                nn.init.normal_(m.weight, 0.0, 0.02)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.normal_(m.weight, 1.0, 0.02)
                nn.init.zeros_(m.bias)
    
    def forward(self, z):
        # Reshape z to (batch, latent_dim, 1, 1)
        z = z.view(z.size(0), self.latent_dim, 1, 1)
        return self.model(z)


class DCGANDiscriminator(nn.Module):
    """DCGAN Discriminator with strided convolutions"""
    
    def __init__(self, feature_maps=64, channels=1):
        super().__init__()
        
        self.model = nn.Sequential(
            # Input: channels x 64 x 64
            nn.Conv2d(channels, feature_maps, 4, 2, 1, bias=False),
            nn.LeakyReLU(0.2, inplace=True),
            # State: feature_maps x 32 x 32
            
            nn.Conv2d(feature_maps, feature_maps * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(feature_maps * 2),
            nn.LeakyReLU(0.2, inplace=True),
            # State: (feature_maps*2) x 16 x 16
            
            nn.Conv2d(feature_maps * 2, feature_maps * 4, 4, 2, 1, bias=False),
            nn.BatchNorm2d(feature_maps * 4),
            nn.LeakyReLU(0.2, inplace=True),
            # State: (feature_maps*4) x 8 x 8
            
            nn.Conv2d(feature_maps * 4, feature_maps * 8, 4, 2, 1, bias=False),
            nn.BatchNorm2d(feature_maps * 8),
            nn.LeakyReLU(0.2, inplace=True),
            # State: (feature_maps*8) x 4 x 4
            
            nn.Conv2d(feature_maps * 8, 1, 4, 1, 0, bias=False),
            nn.Sigmoid()
            # Output: 1 x 1 x 1
        )
        
        self._initialize_weights()
    
    def _initialize_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, 0.0, 0.02)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.normal_(m.weight, 1.0, 0.02)
                nn.init.zeros_(m.bias)
    
    def forward(self, x):
        return self.model(x).view(-1, 1)


# ============ WGAN with Gradient Penalty ============

class WGANCritic(nn.Module):
    """WGAN Critic (no sigmoid at output)"""
    
    def __init__(self, input_dim=784, hidden_dim=256):
        super().__init__()
        
        self.model = nn.Sequential(
            nn.Linear(input_dim, hidden_dim * 4),
            nn.LeakyReLU(0.2),
            
            nn.Linear(hidden_dim * 4, hidden_dim * 2),
            nn.LeakyReLU(0.2),
            
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LeakyReLU(0.2),
            
            nn.Linear(hidden_dim, 1)  # No sigmoid!
        )
    
    def forward(self, x):
        return self.model(x)


class WGAN_GP:
    """Wasserstein GAN with Gradient Penalty"""
    
    def __init__(self, latent_dim=100, data_dim=784, hidden_dim=256,
                 lr=0.0001, betas=(0.0, 0.9), lambda_gp=10, n_critic=5,
                 device='cpu'):
        self.latent_dim = latent_dim
        self.lambda_gp = lambda_gp
        self.n_critic = n_critic  # Train critic n times per generator step
        self.device = device
        
        self.G = Generator(latent_dim, hidden_dim, data_dim).to(device)
        self.C = WGANCritic(data_dim, hidden_dim).to(device)
        
        self.G_optimizer = optim.Adam(self.G.parameters(), lr=lr, betas=betas)
        self.C_optimizer = optim.Adam(self.C.parameters(), lr=lr, betas=betas)
    
    def gradient_penalty(self, real_data, fake_data):
        """Compute gradient penalty"""
        batch_size = real_data.size(0)
        
        # Random interpolation coefficient
        epsilon = torch.rand(batch_size, 1).to(self.device)
        
        # Interpolate between real and fake
        interpolated = epsilon * real_data + (1 - epsilon) * fake_data
        interpolated.requires_grad_(True)
        
        # Critic output on interpolated
        critic_interpolated = self.C(interpolated)
        
        # Compute gradients
        gradients = torch.autograd.grad(
            outputs=critic_interpolated,
            inputs=interpolated,
            grad_outputs=torch.ones_like(critic_interpolated),
            create_graph=True,
            retain_graph=True
        )[0]
        
        # Gradient penalty
        gradients = gradients.view(batch_size, -1)
        gradient_norm = gradients.norm(2, dim=1)
        penalty = ((gradient_norm - 1) ** 2).mean()
        
        return penalty
    
    def train_step(self, real_data):
        """One training iteration"""
        batch_size = real_data.size(0)
        real_data = real_data.to(self.device)
        
        # ============ Train Critic (n_critic times) ============
        for _ in range(self.n_critic):
            self.C_optimizer.zero_grad()
            
            # Critic on real
            c_real = self.C(real_data).mean()
            
            # Generate fake
            z = torch.randn(batch_size, self.latent_dim).to(self.device)
            fake_data = self.G(z).detach()
            
            # Critic on fake
            c_fake = self.C(fake_data).mean()
            
            # Gradient penalty
            gp = self.gradient_penalty(real_data, fake_data)
            
            # Critic loss: maximize E[C(real)] - E[C(fake)] - λ*GP
            # Equivalent to minimize -E[C(real)] + E[C(fake)] + λ*GP
            c_loss = -c_real + c_fake + self.lambda_gp * gp
            c_loss.backward()
            self.C_optimizer.step()
        
        # ============ Train Generator ============
        self.G_optimizer.zero_grad()
        
        z = torch.randn(batch_size, self.latent_dim).to(self.device)
        fake_data = self.G(z)
        
        # Generator loss: maximize E[C(G(z))] = minimize -E[C(G(z))]
        g_loss = -self.C(fake_data).mean()
        g_loss.backward()
        self.G_optimizer.step()
        
        return c_loss.item(), g_loss.item()


# ============ Conditional GAN ============

class ConditionalGenerator(nn.Module):
    """Conditional Generator that takes noise + class label"""
    
    def __init__(self, latent_dim=100, num_classes=10, hidden_dim=256, output_dim=784):
        super().__init__()
        
        self.label_embedding = nn.Embedding(num_classes, num_classes)
        
        self.model = nn.Sequential(
            nn.Linear(latent_dim + num_classes, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.LeakyReLU(0.2),
            
            nn.Linear(hidden_dim, hidden_dim * 2),
            nn.BatchNorm1d(hidden_dim * 2),
            nn.LeakyReLU(0.2),
            
            nn.Linear(hidden_dim * 2, hidden_dim * 4),
            nn.BatchNorm1d(hidden_dim * 4),
            nn.LeakyReLU(0.2),
            
            nn.Linear(hidden_dim * 4, output_dim),
            nn.Tanh()
        )
    
    def forward(self, z, labels):
        # Embed labels
        label_embed = self.label_embedding(labels)
        # Concatenate noise and label embedding
        x = torch.cat([z, label_embed], dim=1)
        return self.model(x)


class ConditionalDiscriminator(nn.Module):
    """Conditional Discriminator that takes image + class label"""
    
    def __init__(self, input_dim=784, num_classes=10, hidden_dim=256):
        super().__init__()
        
        self.label_embedding = nn.Embedding(num_classes, num_classes)
        
        self.model = nn.Sequential(
            nn.Linear(input_dim + num_classes, hidden_dim * 4),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(hidden_dim * 4, hidden_dim * 2),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(hidden_dim, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x, labels):
        label_embed = self.label_embedding(labels)
        x = torch.cat([x, label_embed], dim=1)
        return self.model(x)


class ConditionalGAN:
    """Conditional GAN training wrapper"""
    
    def __init__(self, latent_dim=100, num_classes=10, data_dim=784,
                 hidden_dim=256, lr=0.0002, device='cpu'):
        self.latent_dim = latent_dim
        self.num_classes = num_classes
        self.device = device
        
        self.G = ConditionalGenerator(latent_dim, num_classes, hidden_dim, data_dim).to(device)
        self.D = ConditionalDiscriminator(data_dim, num_classes, hidden_dim).to(device)
        
        self.G_optimizer = optim.Adam(self.G.parameters(), lr=lr, betas=(0.5, 0.999))
        self.D_optimizer = optim.Adam(self.D.parameters(), lr=lr, betas=(0.5, 0.999))
        
        self.criterion = nn.BCELoss()
    
    def train_step(self, real_data, labels):
        """One training iteration with labels"""
        batch_size = real_data.size(0)
        real_data = real_data.to(self.device)
        labels = labels.to(self.device)
        
        real_labels = torch.ones(batch_size, 1).to(self.device)
        fake_labels = torch.zeros(batch_size, 1).to(self.device)
        
        # Train Discriminator
        self.D_optimizer.zero_grad()
        
        real_pred = self.D(real_data, labels)
        d_loss_real = self.criterion(real_pred, real_labels)
        
        z = torch.randn(batch_size, self.latent_dim).to(self.device)
        fake_data = self.G(z, labels)
        fake_pred = self.D(fake_data.detach(), labels)
        d_loss_fake = self.criterion(fake_pred, fake_labels)
        
        d_loss = d_loss_real + d_loss_fake
        d_loss.backward()
        self.D_optimizer.step()
        
        # Train Generator
        self.G_optimizer.zero_grad()
        
        z = torch.randn(batch_size, self.latent_dim).to(self.device)
        fake_data = self.G(z, labels)
        fake_pred = self.D(fake_data, labels)
        
        g_loss = self.criterion(fake_pred, real_labels)
        g_loss.backward()
        self.G_optimizer.step()
        
        return d_loss.item(), g_loss.item()
    
    def generate(self, labels):
        """Generate samples for specific classes"""
        self.G.eval()
        with torch.no_grad():
            labels = torch.tensor(labels).to(self.device)
            z = torch.randn(len(labels), self.latent_dim).to(self.device)
            samples = self.G(z, labels)
        self.G.train()
        return samples.cpu().numpy()


# ============ Utility Functions ============

def visualize_samples(samples, nrow=4, title="Generated Samples"):
    """Visualize generated samples"""
    num_samples = min(len(samples), nrow * nrow)
    fig, axes = plt.subplots(nrow, nrow, figsize=(8, 8))
    
    for i, ax in enumerate(axes.flat):
        if i < num_samples:
            img = samples[i].reshape(28, 28)
            ax.imshow(img, cmap='gray')
        ax.axis('off')
    
    plt.suptitle(title)
    plt.tight_layout()
    plt.show()


def interpolate_latent(gan, z1, z2, steps=10):
    """Interpolate between two latent vectors"""
    interpolations = []
    for alpha in np.linspace(0, 1, steps):
        z = (1 - alpha) * z1 + alpha * z2
        sample = gan.generate_from_z(z)
        interpolations.append(sample)
    return np.array(interpolations)


# Example usage
if __name__ == "__main__":
    # Create simple GAN
    gan = GAN(latent_dim=100, data_dim=784, hidden_dim=256)
    
    # Generate random "fake" data for demonstration
    fake_real_data = torch.randn(64, 784)
    
    # Training step
    d_loss, g_loss = gan.train_step(fake_real_data)
    print(f"D Loss: {d_loss:.4f}, G Loss: {g_loss:.4f}")
    
    # Generate samples
    samples = gan.generate(16)
    print(f"Generated samples shape: {samples.shape}")
```

---

## Mini Project: Face Generation

### Project: Train DCGAN on CelebA Dataset

```python
"""
Mini Project: Face Generation with DCGAN
==========================================
Train a DCGAN on celebrity faces dataset
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt
import numpy as np
from tqdm import tqdm

# ============ Configuration ============
class Config:
    # Data
    image_size = 64
    channels = 3
    
    # Model
    latent_dim = 100
    feature_maps_g = 64
    feature_maps_d = 64
    
    # Training
    batch_size = 128
    epochs = 25
    lr = 0.0002
    betas = (0.5, 0.999)
    
    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

config = Config()


# ============ Data Loading ============
def get_dataloader(data_path='./data'):
    """Create dataloader for CelebA or other face dataset"""
    
    transform = transforms.Compose([
        transforms.Resize(config.image_size),
        transforms.CenterCrop(config.image_size),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])  # [-1, 1]
    ])
    
    # Use CelebA dataset
    # For demo, you can use any image folder
    try:
        dataset = datasets.CelebA(
            root=data_path,
            split='train',
            transform=transform,
            download=True
        )
    except:
        # Fallback to ImageFolder for custom dataset
        print("Using ImageFolder dataset")
        dataset = datasets.ImageFolder(
            root=data_path,
            transform=transform
        )
    
    dataloader = DataLoader(
        dataset,
        batch_size=config.batch_size,
        shuffle=True,
        num_workers=2,
        drop_last=True
    )
    
    return dataloader


# ============ Model Definitions ============
class FaceGenerator(nn.Module):
    """Generator for 64x64 RGB images"""
    
    def __init__(self):
        super().__init__()
        
        ngf = config.feature_maps_g
        
        self.main = nn.Sequential(
            # Input: latent_dim x 1 x 1
            nn.ConvTranspose2d(config.latent_dim, ngf * 8, 4, 1, 0, bias=False),
            nn.BatchNorm2d(ngf * 8),
            nn.ReLU(True),
            # (ngf*8) x 4 x 4
            
            nn.ConvTranspose2d(ngf * 8, ngf * 4, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ngf * 4),
            nn.ReLU(True),
            # (ngf*4) x 8 x 8
            
            nn.ConvTranspose2d(ngf * 4, ngf * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ngf * 2),
            nn.ReLU(True),
            # (ngf*2) x 16 x 16
            
            nn.ConvTranspose2d(ngf * 2, ngf, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ngf),
            nn.ReLU(True),
            # ngf x 32 x 32
            
            nn.ConvTranspose2d(ngf, config.channels, 4, 2, 1, bias=False),
            nn.Tanh()
            # channels x 64 x 64
        )
        
        self._init_weights()
    
    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, (nn.Conv2d, nn.ConvTranspose2d)):
                nn.init.normal_(m.weight, 0.0, 0.02)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.normal_(m.weight, 1.0, 0.02)
                nn.init.zeros_(m.bias)
    
    def forward(self, z):
        return self.main(z.view(-1, config.latent_dim, 1, 1))


class FaceDiscriminator(nn.Module):
    """Discriminator for 64x64 RGB images"""
    
    def __init__(self):
        super().__init__()
        
        ndf = config.feature_maps_d
        
        self.main = nn.Sequential(
            # channels x 64 x 64
            nn.Conv2d(config.channels, ndf, 4, 2, 1, bias=False),
            nn.LeakyReLU(0.2, inplace=True),
            # ndf x 32 x 32
            
            nn.Conv2d(ndf, ndf * 2, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ndf * 2),
            nn.LeakyReLU(0.2, inplace=True),
            # (ndf*2) x 16 x 16
            
            nn.Conv2d(ndf * 2, ndf * 4, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ndf * 4),
            nn.LeakyReLU(0.2, inplace=True),
            # (ndf*4) x 8 x 8
            
            nn.Conv2d(ndf * 4, ndf * 8, 4, 2, 1, bias=False),
            nn.BatchNorm2d(ndf * 8),
            nn.LeakyReLU(0.2, inplace=True),
            # (ndf*8) x 4 x 4
            
            nn.Conv2d(ndf * 8, 1, 4, 1, 0, bias=False),
            nn.Sigmoid()
            # 1 x 1 x 1
        )
        
        self._init_weights()
    
    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.normal_(m.weight, 0.0, 0.02)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.normal_(m.weight, 1.0, 0.02)
                nn.init.zeros_(m.bias)
    
    def forward(self, x):
        return self.main(x).view(-1, 1)


# ============ Training ============
class FaceGANTrainer:
    """DCGAN trainer for face generation"""
    
    def __init__(self, dataloader):
        self.dataloader = dataloader
        
        # Models
        self.G = FaceGenerator().to(config.device)
        self.D = FaceDiscriminator().to(config.device)
        
        # Optimizers
        self.G_opt = optim.Adam(self.G.parameters(), lr=config.lr, betas=config.betas)
        self.D_opt = optim.Adam(self.D.parameters(), lr=config.lr, betas=config.betas)
        
        # Loss
        self.criterion = nn.BCELoss()
        
        # Fixed noise for visualization
        self.fixed_noise = torch.randn(64, config.latent_dim, 1, 1, device=config.device)
        
        # Logging
        self.G_losses = []
        self.D_losses = []
        self.generated_images = []
    
    def train_epoch(self, epoch):
        """Train one epoch"""
        self.G.train()
        self.D.train()
        
        pbar = tqdm(self.dataloader, desc=f'Epoch {epoch+1}')
        
        for batch_idx, (real_images, _) in enumerate(pbar):
            batch_size = real_images.size(0)
            real_images = real_images.to(config.device)
            
            # Labels
            real_labels = torch.ones(batch_size, 1, device=config.device)
            fake_labels = torch.zeros(batch_size, 1, device=config.device)
            
            # -------- Train Discriminator --------
            self.D_opt.zero_grad()
            
            # Real images
            real_pred = self.D(real_images)
            d_loss_real = self.criterion(real_pred, real_labels)
            
            # Fake images
            noise = torch.randn(batch_size, config.latent_dim, 1, 1, device=config.device)
            fake_images = self.G(noise)
            fake_pred = self.D(fake_images.detach())
            d_loss_fake = self.criterion(fake_pred, fake_labels)
            
            d_loss = d_loss_real + d_loss_fake
            d_loss.backward()
            self.D_opt.step()
            
            # -------- Train Generator --------
            self.G_opt.zero_grad()
            
            fake_pred = self.D(fake_images)
            g_loss = self.criterion(fake_pred, real_labels)
            
            g_loss.backward()
            self.G_opt.step()
            
            # Logging
            self.D_losses.append(d_loss.item())
            self.G_losses.append(g_loss.item())
            
            pbar.set_postfix({
                'D_loss': f'{d_loss.item():.4f}',
                'G_loss': f'{g_loss.item():.4f}'
            })
    
    def generate_samples(self):
        """Generate samples using fixed noise"""
        self.G.eval()
        with torch.no_grad():
            fake_images = self.G(self.fixed_noise)
        self.G.train()
        return fake_images.cpu()
    
    def visualize_progress(self, epoch):
        """Visualize generated faces"""
        samples = self.generate_samples()
        
        # Denormalize
        samples = samples * 0.5 + 0.5
        
        fig, axes = plt.subplots(8, 8, figsize=(10, 10))
        for i, ax in enumerate(axes.flat):
            img = samples[i].permute(1, 2, 0).numpy()
            img = np.clip(img, 0, 1)
            ax.imshow(img)
            ax.axis('off')
        
        plt.suptitle(f'Generated Faces - Epoch {epoch+1}')
        plt.tight_layout()
        plt.savefig(f'faces_epoch_{epoch+1}.png')
        plt.close()
    
    def train(self):
        """Full training loop"""
        print(f"Training on {config.device}")
        print(f"Generator params: {sum(p.numel() for p in self.G.parameters()):,}")
        print(f"Discriminator params: {sum(p.numel() for p in self.D.parameters()):,}")
        
        for epoch in range(config.epochs):
            self.train_epoch(epoch)
            
            # Visualize every 5 epochs
            if (epoch + 1) % 5 == 0:
                self.visualize_progress(epoch)
        
        # Save final model
        torch.save({
            'G_state': self.G.state_dict(),
            'D_state': self.D.state_dict(),
            'G_opt_state': self.G_opt.state_dict(),
            'D_opt_state': self.D_opt.state_dict(),
        }, 'face_gan.pth')
        
        print("Training complete!")
    
    def plot_losses(self):
        """Plot training losses"""
        plt.figure(figsize=(10, 5))
        plt.plot(self.G_losses, label='Generator', alpha=0.7)
        plt.plot(self.D_losses, label='Discriminator', alpha=0.7)
        plt.xlabel('Iteration')
        plt.ylabel('Loss')
        plt.title('GAN Training Losses')
        plt.legend()
        plt.savefig('training_losses.png')
        plt.show()


# ============ Inference ============
def generate_faces(model_path, num_samples=16):
    """Generate faces from trained model"""
    
    # Load model
    G = FaceGenerator().to(config.device)
    checkpoint = torch.load(model_path, map_location=config.device)
    G.load_state_dict(checkpoint['G_state'])
    G.eval()
    
    # Generate
    with torch.no_grad():
        noise = torch.randn(num_samples, config.latent_dim, 1, 1, device=config.device)
        faces = G(noise)
    
    # Denormalize and visualize
    faces = faces.cpu() * 0.5 + 0.5
    
    nrow = int(np.sqrt(num_samples))
    fig, axes = plt.subplots(nrow, nrow, figsize=(8, 8))
    
    for i, ax in enumerate(axes.flat):
        img = faces[i].permute(1, 2, 0).numpy()
        ax.imshow(np.clip(img, 0, 1))
        ax.axis('off')
    
    plt.suptitle('Generated Faces')
    plt.tight_layout()
    plt.show()
    
    return faces


def interpolate_faces(model_path, steps=10):
    """Interpolate between two random faces"""
    
    G = FaceGenerator().to(config.device)
    checkpoint = torch.load(model_path, map_location=config.device)
    G.load_state_dict(checkpoint['G_state'])
    G.eval()
    
    # Two random latent vectors
    z1 = torch.randn(1, config.latent_dim, 1, 1, device=config.device)
    z2 = torch.randn(1, config.latent_dim, 1, 1, device=config.device)
    
    # Interpolate
    with torch.no_grad():
        interpolated = []
        for alpha in np.linspace(0, 1, steps):
            z = (1 - alpha) * z1 + alpha * z2
            face = G(z)
            interpolated.append(face)
    
    interpolated = torch.cat(interpolated, dim=0).cpu() * 0.5 + 0.5
    
    # Visualize
    fig, axes = plt.subplots(1, steps, figsize=(20, 2))
    for i, ax in enumerate(axes):
        img = interpolated[i].permute(1, 2, 0).numpy()
        ax.imshow(np.clip(img, 0, 1))
        ax.axis('off')
    
    plt.suptitle('Face Interpolation')
    plt.tight_layout()
    plt.show()


# Example usage
if __name__ == "__main__":
    # For demo, create dummy dataloader
    print("Face GAN Mini Project")
    print("=" * 50)
    print(f"Image size: {config.image_size}x{config.image_size}")
    print(f"Latent dim: {config.latent_dim}")
    print(f"Device: {config.device}")
    
    # To train:
    # dataloader = get_dataloader('./celeba_data')
    # trainer = FaceGANTrainer(dataloader)
    # trainer.train()
    
    # To generate:
    # generate_faces('face_gan.pth', 16)
    # interpolate_faces('face_gan.pth', 10)
```

---

## Homework

### Level 1: Fundamentals (Beginner)

1. **Implement sigmoid and binary cross-entropy loss from scratch**
   - Write functions without using library implementations
   - Test on sample data

2. **Trace the gradient flow in a GAN**
   - Draw the computational graph for G and D
   - Show which gradients flow where

3. **Explain in your own words why we use LeakyReLU in D but ReLU in G**

### Level 2: Intermediate Implementation

4. **Implement label smoothing for GAN training**
   - Use 0.9 instead of 1 for real labels
   - Use 0.1 instead of 0 for fake labels
   - Compare training stability

5. **Add feature matching loss to your GAN**
   - Match intermediate layer features between real and fake
   - $L_{FM} = ||E[f(x)] - E[f(G(z))]||^2$

6. **Implement spectral normalization for the discriminator**
   - Normalize weights by their spectral norm
   - Compare with standard GAN

### Level 3: Advanced Challenges

7. **Implement minibatch discrimination**
   - Add minibatch features to discriminator
   - Helps prevent mode collapse

8. **Build a Progressive GAN training loop**
   - Start training at 4×4, progressively add layers
   - Handle smooth transitions between resolutions

9. **Implement WGAN-GP from scratch**
   - Use gradient penalty instead of weight clipping
   - Compare with standard GAN on MNIST

### Level 4: Research-Level

10. **Implement StyleGAN's mapping network and AdaIN**
    - Create the 8-layer MLP mapping network
    - Implement adaptive instance normalization

11. **Evaluate GAN quality with FID and IS scores**
    - Implement Fréchet Inception Distance
    - Implement Inception Score
    - Compare different GAN variants

12. **Build a CycleGAN for unpaired image translation**
    - Two generators: G_AB and G_BA
    - Cycle consistency loss: $||G_{BA}(G_{AB}(x)) - x||$

---

## Common Mistakes

### ❌ Mistake 1: Training D Too Well

```python
# BAD: D becomes perfect, G gets no gradient
for _ in range(10):  # Too many D steps
    train_discriminator()
train_generator()

# GOOD: Balance D and G training
train_discriminator()  # 1 step
train_generator()      # 1 step
```

### ❌ Mistake 2: Wrong Loss Function

```python
# BAD: Using saturating loss for G
g_loss = torch.log(1 - D(G(z)))  # Gradients vanish when D(G(z)) ≈ 0

# GOOD: Non-saturating loss
g_loss = -torch.log(D(G(z)))  # Strong gradient signal
```

### ❌ Mistake 3: Not Detaching Fake Data for D

```python
# BAD: Gradients flow to G when training D
fake_pred = D(G(z))  # This also updates G!
d_loss.backward()

# GOOD: Detach fake data
fake_pred = D(G(z).detach())  # Only updates D
d_loss.backward()
```

### ❌ Mistake 4: Forgetting BatchNorm in Eval Mode

```python
# BAD: BatchNorm uses running stats during training
generated = G(z)  # During inference

# GOOD: Set to eval mode
G.eval()
with torch.no_grad():
    generated = G(z)
G.train()
```

### ❌ Mistake 5: Using BatchNorm in D's First Layer

```python
# BAD: BatchNorm in first D layer
nn.Sequential(
    nn.Conv2d(3, 64, 4, 2, 1),
    nn.BatchNorm2d(64),  # Don't do this!
    nn.LeakyReLU(0.2)
)

# GOOD: No BatchNorm in first layer
nn.Sequential(
    nn.Conv2d(3, 64, 4, 2, 1),
    nn.LeakyReLU(0.2)  # No BatchNorm
)
```

### ❌ Mistake 6: Same Learning Rate for G and D

```python
# Sometimes BAD: Same LR might not work
G_opt = Adam(G.parameters(), lr=0.0002)
D_opt = Adam(D.parameters(), lr=0.0002)

# Often BETTER: Different LRs
G_opt = Adam(G.parameters(), lr=0.0001)  # Slower G
D_opt = Adam(D.parameters(), lr=0.0004)  # Faster D
```

### ❌ Mistake 7: Not Normalizing Input Data

```python
# BAD: Data in [0, 255] range
real_images = load_images()  # [0, 255]

# GOOD: Normalize to [-1, 1] (match G's tanh output)
real_images = (real_images / 127.5) - 1  # [-1, 1]
```

---

## Interview Questions & Answers

### Q1: What is a GAN and how does it work? (Beginner)

**Answer:**
A GAN (Generative Adversarial Network) consists of two neural networks competing against each other:

1. **Generator (G)**: Creates fake data from random noise
2. **Discriminator (D)**: Tries to distinguish real data from fake

The training is adversarial:
- G tries to fool D by generating realistic samples
- D tries to correctly classify real vs fake

They improve together until G produces indistinguishable samples (D outputs 0.5 for all inputs).

**Key analogy**: An art forger (G) trying to create fake paintings, while a detective (D) tries to identify fakes. Both get better over time.

---

### Q2: What is mode collapse and how do you prevent it? (Intermediate)

**Answer:**
**Mode collapse** occurs when the generator only produces a limited variety of outputs, ignoring many modes in the data distribution.

**Example**: Training on MNIST, but G only outputs "7"s, ignoring other digits.

**Prevention strategies**:

1. **Minibatch discrimination**: D looks at multiple samples together
2. **Feature matching**: Match statistics of intermediate D layers
3. **Unrolled GANs**: G considers D's future updates
4. **WGAN**: Uses Wasserstein distance instead of JS divergence
5. **Diverse training**: Add noise, use dropout
6. **Progressive training**: Start simple, gradually increase complexity

```python
# Feature matching loss
def feature_matching_loss(real, fake, discriminator):
    real_features = discriminator.get_features(real)
    fake_features = discriminator.get_features(fake)
    return torch.mean((real_features.mean(0) - fake_features.mean(0))**2)
```

---

### Q3: Explain the GAN minimax objective mathematically. (Intermediate)

**Answer:**

$$\min_G \max_D V(D, G) = \mathbb{E}_{x \sim p_{data}}[\log D(x)] + \mathbb{E}_{z \sim p_z}[\log(1 - D(G(z)))]$$

**Breaking it down**:

| Component | D's Goal | G's Goal |
|-----------|----------|----------|
| $\log D(x)$ | Maximize (D(real) → 1) | N/A |
| $\log(1-D(G(z)))$ | Maximize (D(fake) → 0) | Minimize (D(fake) → 1) |

**Optimal D** (for fixed G):
$$D^*(x) = \frac{p_{data}(x)}{p_{data}(x) + p_g(x)}$$

**At equilibrium**: $p_g = p_{data}$, so $D^*(x) = 0.5$ for all x.

---

### Q4: Why do we use non-saturating loss for the generator? (Intermediate)

**Answer:**

**Original (saturating) loss**: $L_G = \log(1 - D(G(z)))$

**Problem**: When D easily detects fakes (D(G(z)) ≈ 0):
- $\log(1 - 0) = \log(1) = 0$
- Gradient ≈ 0 → G doesn't learn!

**Non-saturating loss**: $L_G = -\log(D(G(z)))$

**Advantage**: When D(G(z)) ≈ 0:
- $-\log(0) → ∞$
- Strong gradient → G learns quickly!

```
Saturating:        Non-saturating:
Loss               Loss
│▄▄▄▄▄▄▄▄          │▀▀▄
│        ▀▀▀▄      │    ▀▀▄
│            ▀▀    │      ▀▀▄▄
└──────────────▶   └──────────────▶
0          D(G(z))  0          D(G(z))
  ↑ Flat!              ↑ Strong gradient!
```

---

### Q5: What are the key differences between WGAN and vanilla GAN? (Advanced)

**Answer:**

| Aspect | Vanilla GAN | WGAN |
|--------|-------------|------|
| **Output layer** | Discriminator with sigmoid | Critic with no activation |
| **Loss** | Binary cross-entropy | Wasserstein distance |
| **Distance metric** | JS divergence | Earth Mover's distance |
| **Training balance** | Very sensitive | More stable |
| **Mode collapse** | Common | Less common |
| **Constraint** | None | Lipschitz (via clipping/GP) |

**WGAN advantages**:
1. **Meaningful loss**: Correlates with sample quality
2. **No mode collapse**: EMD provides gradients everywhere
3. **Training stability**: Can train critic to optimality

**WGAN-GP formula**:
$$L_C = \mathbb{E}[C(G(z))] - \mathbb{E}[C(x)] + \lambda \mathbb{E}[(||\nabla_{\hat{x}} C(\hat{x})||_2 - 1)^2]$$

---

### Q6: Explain how StyleGAN achieves controllable generation. (Advanced)

**Answer:**

**Key innovations**:

1. **Mapping Network (f)**: z → w
   - 8 fully connected layers
   - Transforms latent z to intermediate w
   - w is more disentangled

2. **Adaptive Instance Normalization (AdaIN)**:
   - Style w controls generation at each layer
   - $AdaIN(x, y) = y_s \cdot \frac{x - \mu(x)}{\sigma(x)} + y_b$

3. **Style at different resolutions controls different features**:
   - Early layers (4×4): Pose, face shape
   - Middle layers (8×32): Facial features, hair
   - Late layers (64×1024): Color, texture, micro-details

4. **Style mixing**: Use different w at different layers
   - Source A's w for early layers → coarse features
   - Source B's w for late layers → fine features

```
z₁ ──┬──▶ Mapping ──▶ w₁ ──▶ Layers 1-3  ╲
     │                                     ╲
     │                                      ──▶ Mixed face
z₂ ──┴──▶ Mapping ──▶ w₂ ──▶ Layers 4-8  ╱
```

---

### Q7: How would you evaluate GAN quality without labels? (Advanced)

**Answer:**

**Quantitative metrics**:

1. **Inception Score (IS)**:
   - Uses pretrained Inception network
   - Measures: quality (confident predictions) + diversity (uniform class distribution)
   - $IS = \exp(\mathbb{E}_x [KL(p(y|x) || p(y))])$
   - Higher is better

2. **Fréchet Inception Distance (FID)**:
   - Compares feature statistics of real and generated
   - $FID = ||\mu_r - \mu_g||^2 + Tr(\Sigma_r + \Sigma_g - 2(\Sigma_r \Sigma_g)^{1/2})$
   - Lower is better

3. **Precision and Recall**:
   - Precision: quality (generated in real distribution)
   - Recall: diversity (covers real distribution)

**Qualitative**:
- Visual inspection of samples
- Latent space interpolation smoothness
- Attribute manipulation consistency

---

### Q8: Debug this GAN training code. What's wrong? (Senior/Debugging)

```python
def train_step(real_data):
    # Train D
    fake = G(z)
    d_loss = bce(D(real_data), ones) + bce(D(fake), zeros)
    d_loss.backward()
    D_opt.step()
    
    # Train G
    g_loss = bce(D(fake), ones)
    g_loss.backward()
    G_opt.step()
```

**Answer:**

**Issues**:

1. **Missing `zero_grad()`**: Gradients accumulate
2. **No `detach()` on fake for D**: G gets gradients when training D
3. **Reusing `fake`**: Graph already consumed by D backward
4. **Wrong order**: Need to zero_grad before backward

**Corrected**:
```python
def train_step(real_data):
    # Train D
    D_opt.zero_grad()
    z = torch.randn(batch_size, latent_dim)
    fake = G(z)
    d_loss = bce(D(real_data), ones) + bce(D(fake.detach()), zeros)
    d_loss.backward()
    D_opt.step()
    
    # Train G
    G_opt.zero_grad()
    z = torch.randn(batch_size, latent_dim)  # New noise!
    fake = G(z)
    g_loss = bce(D(fake), ones)
    g_loss.backward()
    G_opt.step()
```

---

### Q9: How would you add class conditioning to a GAN? (Senior)

**Answer:**

**Conditional GAN approach**:

1. **Generator**: Concatenate class embedding with noise
```python
class ConditionalG(nn.Module):
    def __init__(self, num_classes):
        self.embed = nn.Embedding(num_classes, embed_dim)
        self.fc = nn.Linear(latent_dim + embed_dim, hidden_dim)
    
    def forward(self, z, label):
        c = self.embed(label)
        x = torch.cat([z, c], dim=1)
        return self.main(x)
```

2. **Discriminator**: Also receives class information
```python
class ConditionalD(nn.Module):
    def __init__(self, num_classes):
        self.embed = nn.Embedding(num_classes, embed_dim)
        self.fc = nn.Linear(data_dim + embed_dim, hidden_dim)
    
    def forward(self, x, label):
        c = self.embed(label)
        x = torch.cat([x, c], dim=1)
        return self.main(x)
```

3. **Training**: Pass labels to both G and D
```python
fake = G(z, labels)
d_real = D(real_data, labels)
d_fake = D(fake, labels)
```

**Alternative**: Projection discriminator (more effective for images)
- Project class embedding and features
- $y^T V h + \psi(h)$ where h is features, y is class

---

### Q10: Design a GAN system for generating 1024×1024 faces. What architecture and training strategies would you use? (FAANG System Design)

**Answer:**

**Architecture: StyleGAN2**

1. **Mapping Network**:
   - 8 FC layers: z (512) → w (512)
   - Disentangles latent space

2. **Synthesis Network**:
   - Progressive growth: 4×4 → 8×8 → ... → 1024×1024
   - Skip connections (MSG-GAN style)
   - Modulated convolutions (replace AdaIN)

3. **Discriminator**:
   - Residual blocks
   - Minibatch std dev layer
   - Equalized learning rate

**Training Strategies**:

1. **Progressive Training**:
   - Start at 4×4, train until stable
   - Gradually add layers with smooth blending
   - α parameter controls transition

2. **Regularization**:
   - R1 gradient penalty: $\gamma \mathbb{E}[||\nabla D(x)||^2]$
   - Path length regularization for G
   - Lazy regularization (every 16 steps)

3. **Data Augmentation**:
   - Differentiable augmentation (ADA)
   - Helps with limited data

4. **Infrastructure**:
   - Multi-GPU training (8+ GPUs)
   - Mixed precision (FP16)
   - Exponential moving average of G weights

**Training Time**: ~1-2 weeks on 8 V100 GPUs

**Evaluation**:
- FID < 5 for high quality
- PPL (Perceptual Path Length) for smoothness
- Manual inspection of edge cases

---

## Summary

### Key Takeaways

1. **GANs are a two-player game**: Generator creates, Discriminator judges
2. **Non-saturating loss is critical**: Prevents vanishing gradients for G
3. **Training is unstable**: Mode collapse, oscillation are common
4. **WGAN improves stability**: Wasserstein distance provides better gradients
5. **Architecture matters**: DCGAN guidelines (no pooling, BatchNorm, LeakyReLU)
6. **StyleGAN enables control**: Disentangled latent space, style injection
7. **Evaluation is tricky**: FID, IS scores, but visual inspection still needed

### Quick Reference

| Concept | Description |
|---------|-------------|
| Generator | Maps noise z to data x |
| Discriminator | Classifies real vs fake |
| Mode Collapse | G only produces limited outputs |
| Non-saturating Loss | $-\log D(G(z))$ instead of $\log(1-D(G(z)))$ |
| WGAN | Uses Wasserstein distance, Critic instead of D |
| Gradient Penalty | Enforces Lipschitz constraint |
| StyleGAN | Mapping network + AdaIN for controllable generation |

---

**Next Up**: `03-VAEs-Variational-Autoencoders.md` - Understanding probabilistic generation with VAEs, the reparameterization trick, and comparing VAEs with GANs.

Type `CONTINUE` to proceed.
