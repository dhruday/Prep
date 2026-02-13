# 03 - VAEs: Variational Autoencoders

---

## Table of Contents

1. [Beginner Explanation](#beginner-explanation)
2. [Deep Technical Breakdown](#deep-technical-breakdown)
   - [Autoencoders Recap](#autoencoders-recap)
   - [The Problem with Regular Autoencoders](#the-problem-with-regular-autoencoders)
   - [Variational Autoencoders](#variational-autoencoders)
   - [The Reparameterization Trick](#the-reparameterization-trick)
   - [ELBO: Evidence Lower Bound](#elbo-evidence-lower-bound)
   - [KL Divergence Explained](#kl-divergence-explained)
   - [β-VAE and Disentanglement](#β-vae-and-disentanglement)
3. [VAE Variants](#vae-variants)
   - [Conditional VAE (CVAE)](#conditional-vae-cvae)
   - [VQ-VAE](#vq-vae)
   - [VAE-GAN](#vae-gan)
4. [Key Formulas](#key-formulas)
5. [Visual Mental Models](#visual-mental-models)
6. [VAE vs GAN Comparison](#vae-vs-gan-comparison)
7. [Complete VAE Implementation](#complete-vae-implementation)
8. [Mini Project: Image Generation](#mini-project-image-generation)
9. [Homework](#homework)
10. [Common Mistakes](#common-mistakes)
11. [Interview Questions & Answers](#interview-questions--answers)

---

## Beginner Explanation

### The Compression Analogy

Imagine you're a **sketch artist** who needs to describe faces over a phone:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE VAE STORY                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   SCENARIO: Describe a face using only 10 numbers                   │
│                                                                      │
│   ┌──────────────┐                    ┌──────────────┐              │
│   │   ORIGINAL   │   ───────────▶     │  10 NUMBERS  │              │
│   │     FACE     │    ENCODER         │   (Latent)   │              │
│   │    👤 📸     │                    │ [2.1, -0.5,  │              │
│   │              │                    │  1.3, 0.8,...│              │
│   └──────────────┘                    └──────┬───────┘              │
│                                              │                       │
│                                              │ DECODER               │
│                                              ▼                       │
│                                       ┌──────────────┐              │
│                                       │ RECONSTRUCTED│              │
│                                       │     FACE     │              │
│                                       │    👤 🎨     │              │
│                                       └──────────────┘              │
│                                                                      │
│   The 10 numbers capture the ESSENCE:                               │
│   - Number 1: Face roundness                                         │
│   - Number 2: Nose size                                              │
│   - Number 3: Eye spacing                                            │
│   - ... and so on                                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Regular Autoencoder vs VAE

**Regular Autoencoder**: "Face A is exactly [2.1, -0.5, 1.3, ...]"
- Problem: What does [2.0, -0.4, 1.2, ...] look like? Maybe garbage!

**VAE**: "Face A is AROUND [2.1, -0.5, 1.3, ...] with some uncertainty"
- Benefit: Nearby points produce similar faces!

```
┌─────────────────────────────────────────────────────────────────────┐
│              REGULAR AE vs VAE LATENT SPACE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   REGULAR AUTOENCODER:              VAE:                            │
│   (Scattered, gaps)                 (Smooth, continuous)            │
│                                                                      │
│        •                                 ░░░░░░                     │
│     •     •                            ░░░░░░░░░░                   │
│        •    •                         ░░░░░░░░░░░░                  │
│   •           •                       ░░░░░░░░░░░░                  │
│        •                               ░░░░░░░░░░                   │
│     •     •                              ░░░░░░                     │
│                                                                      │
│   ✗ Gaps = undefined regions         ✓ Smooth = can sample anywhere│
│   ✗ Can't generate new faces         ✓ Generate by sampling!       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Key Insight

VAE doesn't just learn a single point for each input—it learns a **probability distribution**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                   VAE ENCODING                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Input Image                                                        │
│       │                                                              │
│       ▼                                                              │
│   ┌─────────────┐                                                   │
│   │   ENCODER   │                                                   │
│   └──────┬──────┘                                                   │
│          │                                                           │
│          ├───────────────┬───────────────┐                          │
│          ▼               ▼               │                          │
│       μ (mean)      σ² (variance)        │                          │
│      [2.1, -0.5]    [0.1, 0.2]          │                          │
│          │               │               │                          │
│          └───────┬───────┘               │                          │
│                  ▼                       │                          │
│          ┌─────────────┐                 │                          │
│          │  N(μ, σ²)   │  ← Gaussian    │                          │
│          │  SAMPLE z   │    Distribution │                          │
│          └──────┬──────┘                 │                          │
│                 │                        │                          │
│                 ▼                        │                          │
│          z = [2.05, -0.6]  (sampled)    │                          │
│                 │                        │                          │
│                 ▼                        │                          │
│          ┌─────────────┐                 │                          │
│          │   DECODER   │                 │                          │
│          └─────────────┘                 │                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deep Technical Breakdown

### Autoencoders Recap

Standard autoencoder architecture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTOENCODER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Input x          Latent z          Reconstruction x̂              │
│   [784]            [20]              [784]                          │
│                                                                      │
│   ████████         ██                ████████                       │
│   ████████    ──▶  ██    ──▶         ████████                       │
│   ████████         ██                ████████                       │
│   ████████                           ████████                       │
│                                                                      │
│   ENCODER: x → z (compress)                                         │
│   DECODER: z → x̂ (decompress)                                      │
│                                                                      │
│   Loss = ||x - x̂||²  (reconstruction loss)                         │
│                                                                      │
│   z is a DETERMINISTIC vector                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Problem with Regular Autoencoders

```
┌─────────────────────────────────────────────────────────────────────┐
│               WHY CAN'T WE GENERATE FROM AE?                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PROBLEM 1: Latent space has "holes"                               │
│                                                                      │
│   Latent Space:                                                      │
│        ▲ z₂                                                         │
│        │      • face_1                                              │
│        │              • face_2                                      │
│        │   ?                                                        │
│        │      ?    ?       • face_3                                 │
│        │              ?                                             │
│        │   • face_4                                                 │
│        └────────────────────▶ z₁                                    │
│                                                                      │
│   If we sample from "?" regions, we get GARBAGE                     │
│                                                                      │
│   PROBLEM 2: No regularization                                       │
│                                                                      │
│   - AE can put face_1 at [1000, 2000]                               │
│   - And face_2 at [-5000, 3000]                                     │
│   - No pressure to organize the space                               │
│                                                                      │
│   PROBLEM 3: Overfitting to training data                           │
│                                                                      │
│   - Each input gets memorized to specific point                     │
│   - No interpolation possible                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Variational Autoencoders

VAE solves this by:
1. Encoding to a **distribution** (not a point)
2. Adding **KL divergence** regularization
3. Forcing latent space to be **smooth and continuous**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      VAE ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Input x                                                            │
│      │                                                               │
│      ▼                                                               │
│   ┌──────────────────────────────┐                                  │
│   │         ENCODER              │                                  │
│   │    q_φ(z|x) ≈ N(μ, σ²)      │                                  │
│   └──────────────┬───────────────┘                                  │
│                  │                                                   │
│         ┌────────┴────────┐                                         │
│         ▼                 ▼                                         │
│       μ_φ(x)           σ_φ(x)                                       │
│      [mean]          [std dev]                                      │
│         │                 │                                         │
│         └────────┬────────┘                                         │
│                  │                                                   │
│                  ▼                                                   │
│   ┌──────────────────────────────┐                                  │
│   │   z = μ + σ ⊙ ε             │  ← Reparameterization!           │
│   │   where ε ~ N(0, I)         │                                  │
│   └──────────────┬───────────────┘                                  │
│                  │                                                   │
│                  ▼                                                   │
│   ┌──────────────────────────────┐                                  │
│   │         DECODER              │                                  │
│   │       p_θ(x|z)               │                                  │
│   └──────────────┬───────────────┘                                  │
│                  │                                                   │
│                  ▼                                                   │
│              x̂ (reconstruction)                                     │
│                                                                      │
│   LOSS = Reconstruction + KL Divergence                             │
│        = ||x - x̂||² + KL(q(z|x) || p(z))                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Reparameterization Trick

**Problem**: We can't backpropagate through random sampling!

```
┌─────────────────────────────────────────────────────────────────────┐
│              THE REPARAMETERIZATION TRICK                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PROBLEM: How to backprop through z ~ N(μ, σ²)?                    │
│                                                                      │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐                       │
│   │ Encoder │ ──▶ │ SAMPLE  │ ──▶ │ Decoder │                       │
│   │  (μ,σ)  │     │  z~N()  │     │         │                       │
│   └─────────┘     └────┬────┘     └─────────┘                       │
│                        │                                             │
│                   RANDOM! ✗                                          │
│              Can't compute gradients                                 │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   SOLUTION: Move randomness OUTSIDE the gradient path               │
│                                                                      │
│   Instead of:  z ~ N(μ, σ²)                                         │
│   Write as:    z = μ + σ ⊙ ε,  where ε ~ N(0, I)                   │
│                                                                      │
│   ┌─────────┐                                                       │
│   │ Encoder │──▶ μ ─────────┐                                       │
│   │         │               │                                       │
│   │         │──▶ σ ─────┐   │                                       │
│   └─────────┘           │   │                                       │
│                         │   │                                       │
│   ε ~ N(0,I) ─────────▶ ⊙ ──┼──▶ z = μ + σ⊙ε ──▶ Decoder          │
│   (external)            │   │                                       │
│                         │   │                                       │
│                         └───┘                                       │
│                                                                      │
│   Now gradients can flow through μ and σ!                           │
│   ∂L/∂μ and ∂L/∂σ are well-defined                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Code implementation:**

```python
def reparameterize(mu, log_var):
    """
    Reparameterization trick: z = mu + std * epsilon
    
    Args:
        mu: Mean of the latent distribution [batch, latent_dim]
        log_var: Log variance (we predict log_var for numerical stability)
    
    Returns:
        z: Sampled latent vector
    """
    std = torch.exp(0.5 * log_var)  # σ = exp(0.5 * log(σ²))
    epsilon = torch.randn_like(std)  # ε ~ N(0, I)
    z = mu + std * epsilon           # z = μ + σ ⊙ ε
    return z
```

### ELBO: Evidence Lower Bound

VAE maximizes the **Evidence Lower Bound (ELBO)**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ELBO DERIVATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Goal: Maximize log p(x) (log likelihood of data)                  │
│                                                                      │
│   Problem: p(x) = ∫ p(x|z)p(z) dz  is INTRACTABLE                  │
│                                                                      │
│   Solution: Use variational inference                                │
│                                                                      │
│   log p(x) = log ∫ p(x|z)p(z) dz                                    │
│                                                                      │
│            = log ∫ p(x|z)p(z) · q(z|x)/q(z|x) dz                    │
│                                                                      │
│            ≥ ∫ q(z|x) log [p(x|z)p(z)/q(z|x)] dz                    │
│              (Jensen's inequality)                                   │
│                                                                      │
│            = E_q[log p(x|z)] - KL(q(z|x) || p(z))                   │
│                   ↑                    ↑                            │
│            Reconstruction        Regularization                      │
│                                                                      │
│   ELBO = E_q[log p(x|z)] - KL(q(z|x) || p(z))                       │
│                                                                      │
│   Maximize ELBO = Maximize lower bound on log p(x)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**The two terms:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ELBO COMPONENTS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ELBO = E_q[log p(x|z)]    -    KL(q(z|x) || p(z))                │
│              │                         │                            │
│              ▼                         ▼                            │
│   ┌─────────────────────┐    ┌─────────────────────┐               │
│   │   RECONSTRUCTION    │    │   REGULARIZATION    │               │
│   │                     │    │                     │               │
│   │ "How well can we    │    │ "How close is our  │               │
│   │  reconstruct x      │    │  q(z|x) to the     │               │
│   │  from sampled z?"   │    │  prior p(z)?"      │               │
│   │                     │    │                     │               │
│   │ Implemented as:     │    │ Prior: p(z) = N(0,I)│               │
│   │ -||x - x̂||² (MSE)  │    │ Forces latent to   │               │
│   │ or BCE for images   │    │ be standard normal │               │
│   └─────────────────────┘    └─────────────────────┘               │
│                                                                      │
│   LOSS = -ELBO = Reconstruction Loss + KL Loss                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### KL Divergence Explained

**KL Divergence** measures how different two distributions are:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KL DIVERGENCE                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   KL(P || Q) = ∫ P(x) log(P(x)/Q(x)) dx                             │
│                                                                      │
│   "How many extra bits needed to encode P using Q"                  │
│                                                                      │
│   Properties:                                                        │
│   - KL ≥ 0 always                                                   │
│   - KL = 0 only when P = Q                                          │
│   - NOT symmetric: KL(P||Q) ≠ KL(Q||P)                              │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   For VAE: KL(q(z|x) || p(z)) where:                                │
│   - q(z|x) = N(μ, σ²)  (encoder output)                             │
│   - p(z) = N(0, I)      (prior)                                     │
│                                                                      │
│   Closed-form solution for Gaussians:                               │
│                                                                      │
│   KL = -0.5 × Σ(1 + log(σ²) - μ² - σ²)                              │
│                                                                      │
│   In code:                                                           │
│   kl_loss = -0.5 * torch.sum(1 + log_var - mu.pow(2) - log_var.exp())│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Visualizing KL divergence:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                KL DIVERGENCE VISUALIZATION                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CASE 1: q(z|x) far from p(z) → HIGH KL                            │
│                                                                      │
│         p(z)=N(0,1)     q(z|x)=N(3, 0.5)                            │
│             │               │                                        │
│        ▄▄▄▄▄│▄▄▄▄▄          │    ▄▄▄                                │
│       █████████████         │   █████                               │
│     ▄███████████████▄       │  ███████                              │
│   ──────────────────────────┼──────────────▶                        │
│           0                 │     3                                 │
│                                                                      │
│   KL is HIGH → penalty pushes q toward N(0,1)                       │
│                                                                      │
│   CASE 2: q(z|x) close to p(z) → LOW KL                             │
│                                                                      │
│         p(z)=N(0,1)   q(z|x)=N(0.1, 0.9)                            │
│             │          │                                             │
│        ▄▄▄▄▄│▄▄▄▄▄    ▄│▄▄▄▄                                        │
│       █████████████  ██████████                                     │
│     ▄███████████████▄████████████▄                                  │
│   ──────────────────────────────────▶                               │
│           0                                                          │
│                                                                      │
│   KL is LOW → distributions are similar                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### β-VAE and Disentanglement

**β-VAE** adds a weight to the KL term:

$$\mathcal{L} = \mathbb{E}[\log p(x|z)] - \beta \cdot KL(q(z|x) || p(z))$$

```
┌─────────────────────────────────────────────────────────────────────┐
│                        β-VAE                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Loss = Reconstruction - β × KL                                    │
│                                                                      │
│   β = 1: Standard VAE                                               │
│   β > 1: Stronger regularization → more disentanglement             │
│   β < 1: Weaker regularization → better reconstruction              │
│                                                                      │
│   DISENTANGLEMENT:                                                   │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                                                         │       │
│   │   Entangled:           Disentangled:                   │       │
│   │                                                         │       │
│   │   z₁ = face + hair     z₁ = face shape only            │       │
│   │   z₂ = eyes + nose     z₂ = hair color only            │       │
│   │   z₃ = ???             z₃ = eye color only             │       │
│   │                                                         │       │
│   │   Changing z₁ changes  Changing z₁ ONLY changes        │       │
│   │   multiple features    face shape                       │       │
│   │                                                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│   Higher β → each z dimension captures independent feature          │
│                                                                      │
│   Trade-off: β↑ → disentanglement↑ but reconstruction↓             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## VAE Variants

### Conditional VAE (CVAE)

**Conditional VAE** conditions generation on labels:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONDITIONAL VAE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Standard VAE:                                                      │
│   p(x) = ∫ p(x|z) p(z) dz                                           │
│                                                                      │
│   Conditional VAE:                                                   │
│   p(x|y) = ∫ p(x|z,y) p(z|y) dz                                     │
│                                                                      │
│   Where y is the condition (class label, attribute, etc.)           │
│                                                                      │
│   ┌──────────────┐          ┌──────────────┐                        │
│   │     x        │          │     y        │                        │
│   │   (image)    │          │   (label)    │                        │
│   └──────┬───────┘          └──────┬───────┘                        │
│          │                         │                                 │
│          └─────────┬───────────────┘                                │
│                    │ Concatenate                                     │
│                    ▼                                                 │
│             ┌─────────────┐                                         │
│             │   ENCODER   │                                         │
│             │  q(z|x,y)   │                                         │
│             └──────┬──────┘                                         │
│                    │                                                 │
│                    ▼                                                 │
│                 μ, σ² ──▶ z (sampled)                               │
│                    │                                                 │
│                    │         ┌──────────────┐                       │
│                    └─────────┤     y        │                       │
│                              │   (label)    │                       │
│                              └──────┬───────┘                       │
│                                     │ Concatenate                   │
│                                     ▼                               │
│                              ┌─────────────┐                        │
│                              │   DECODER   │                        │
│                              │  p(x|z,y)   │                        │
│                              └─────────────┘                        │
│                                                                      │
│   Generation: Sample z~N(0,I), provide y → generate x of class y   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### VQ-VAE (Vector Quantized VAE)

**VQ-VAE** uses **discrete** latent codes instead of continuous:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VQ-VAE                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   KEY IDEA: Replace continuous z with discrete codebook vectors     │
│                                                                      │
│   CODEBOOK: K vectors (embeddings)                                   │
│   ┌────┬────┬────┬────┬────┬────┬────┬────┐                        │
│   │ e₁ │ e₂ │ e₃ │ e₄ │ e₅ │ e₆ │ ... │ eₖ│                        │
│   └────┴────┴────┴────┴────┴────┴────┴────┘                        │
│                                                                      │
│   PROCESS:                                                           │
│                                                                      │
│   1. Encoder outputs z_e                                             │
│   2. Find nearest codebook vector:                                   │
│      k = argmin ||z_e - eₖ||²                                       │
│   3. Replace z_e with e_k (quantize)                                │
│   4. Decoder uses e_k                                               │
│                                                                      │
│   ┌─────────┐     ┌─────────────┐     ┌─────────┐                   │
│   │ Encoder │──▶  │  QUANTIZE   │──▶  │ Decoder │                   │
│   │   z_e   │     │  z_e → e_k  │     │         │                   │
│   └─────────┘     └─────────────┘     └─────────┘                   │
│                                                                      │
│   LOSSES:                                                            │
│   1. Reconstruction: ||x - x̂||²                                    │
│   2. Codebook: ||sg[z_e] - e_k||² (move codebook to encoder output) │
│   3. Commitment: ||z_e - sg[e_k]||² (commit encoder to codebook)    │
│                                                                      │
│   sg[] = stop gradient                                               │
│                                                                      │
│   BENEFITS:                                                          │
│   - Avoids posterior collapse                                        │
│   - Discrete = can use autoregressive models on top                 │
│   - Used in DALL-E, AudioLM, etc.                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### VAE-GAN

**VAE-GAN** combines VAE with GAN discriminator:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VAE-GAN                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   MOTIVATION: VAE produces blurry images, GAN produces sharp ones   │
│               Combine the best of both!                              │
│                                                                      │
│                                                                      │
│            ┌───────────────────────────────────┐                    │
│            │              VAE                  │                    │
│   x ──────▶│  Encoder ──▶ z ──▶ Decoder ──▶ x̂ │                    │
│            │                                   │                    │
│            └───────────────┬───────────────────┘                    │
│                            │                                         │
│                            ▼ x̂                                      │
│                     ┌─────────────┐                                 │
│   x (real) ────────▶│DISCRIMINATOR│──▶ Real/Fake                    │
│                     └─────────────┘                                 │
│                                                                      │
│   LOSSES:                                                            │
│                                                                      │
│   VAE Loss:                                                          │
│   - Reconstruction (but using D's features, not pixel-wise!)        │
│   - KL divergence                                                    │
│                                                                      │
│   GAN Loss:                                                          │
│   - D tries to distinguish real from reconstructed                  │
│   - Decoder (as G) tries to fool D                                  │
│                                                                      │
│   Feature Matching:                                                  │
│   - Match intermediate D features of x and x̂                       │
│   - Better than pixel MSE for perceptual quality                    │
│                                                                      │
│   Result: Sharp images + meaningful latent space                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Formulas

### Core VAE Formulas

| Formula | Description |
|---------|-------------|
| $\mathcal{L} = \mathbb{E}_{q(z\|x)}[\log p(x\|z)] - D_{KL}(q(z\|x) \|\| p(z))$ | VAE Loss (negative ELBO) |
| $q(z\|x) = \mathcal{N}(\mu_\phi(x), \sigma^2_\phi(x))$ | Encoder distribution |
| $p(z) = \mathcal{N}(0, I)$ | Prior distribution |
| $z = \mu + \sigma \odot \epsilon, \quad \epsilon \sim \mathcal{N}(0, I)$ | Reparameterization trick |

### KL Divergence (Gaussian)

$$D_{KL}(q(z|x) || p(z)) = -\frac{1}{2} \sum_{j=1}^{J} \left(1 + \log(\sigma_j^2) - \mu_j^2 - \sigma_j^2\right)$$

Where J is the latent dimension.

### β-VAE Loss

$$\mathcal{L}_{\beta} = \mathbb{E}_{q(z|x)}[\log p(x|z)] - \beta \cdot D_{KL}(q(z|x) || p(z))$$

### Reconstruction Loss Options

| Type | Formula | Use Case |
|------|---------|----------|
| MSE | $\|x - \hat{x}\|^2$ | Continuous values |
| BCE | $-\sum[x \log \hat{x} + (1-x)\log(1-\hat{x})]$ | Binary/normalized images |
| Gaussian | $\frac{1}{2\sigma^2}\|x - \hat{x}\|^2 + \log\sigma$ | With learned variance |

---

## Visual Mental Models

### VAE Training Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VAE TRAINING FLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   FORWARD PASS:                                                      │
│                                                                      │
│   Input x ──▶ Encoder ──▶ (μ, log σ²)                               │
│                              │                                       │
│                              ▼                                       │
│                    ε ~ N(0,I) ──▶ z = μ + σ⊙ε                       │
│                                      │                               │
│                                      ▼                               │
│                              Decoder ──▶ x̂                          │
│                                                                      │
│   LOSS COMPUTATION:                                                  │
│                                                                      │
│   ┌────────────────────────────────────────────────┐                │
│   │                                                │                │
│   │   L_recon = BCE(x, x̂) or MSE(x, x̂)           │                │
│   │                                                │                │
│   │   L_KL = -0.5 × Σ(1 + log σ² - μ² - σ²)       │                │
│   │                                                │                │
│   │   L_total = L_recon + L_KL                    │                │
│   │                                                │                │
│   └────────────────────────────────────────────────┘                │
│                                                                      │
│   BACKWARD PASS:                                                     │
│                                                                      │
│   ∂L/∂θ_decoder ←─── L_recon                                        │
│   ∂L/∂μ, ∂L/∂σ ←──── L_recon + L_KL                                │
│   ∂L/∂θ_encoder ←─── through (μ, σ)                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Latent Space Organization

```
┌─────────────────────────────────────────────────────────────────────┐
│              VAE LATENT SPACE ORGANIZATION                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   WITHOUT KL REGULARIZATION:         WITH KL REGULARIZATION:        │
│                                                                      │
│   ▲ z₂                               ▲ z₂                           │
│   │     •3                           │    ░░3░░                     │
│   │         •7                       │  ░░░░░░░7░                   │
│   │                                  │ ░░░░░░░░░░░░                 │
│   │  •1          •9                  │░░1░░░░░░░9░░                 │
│   │                                  │ ░░░░░░░░░░░░                 │
│   │      •5                          │  ░░░5░░░░░                   │
│   │                                  │    ░░░░░                     │
│   └────────────────▶ z₁              └────────────────▶ z₁          │
│                                                                      │
│   Isolated points                    Overlapping distributions      │
│   Gaps = garbage                     Smooth interpolation           │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   KL DIVERGENCE EFFECT:                                              │
│                                                                      │
│   Each q(z|x) is pushed toward N(0,I)                               │
│                                                                      │
│   Before KL:              After KL:                                 │
│                                                                      │
│       ▄▄▄                     ░░░░░░░░░░░░                          │
│      █████  (narrow,         ░░░░░░░░░░░░░░                         │
│       ▀▀▀   far from 0)     ░░░░░░░░░░░░░░░░                        │
│   ──────────────            ───────────────────                      │
│           3  (mean)                 0  (mean)                        │
│                                                                      │
│   Pulled to center          Widened (more uncertainty)              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Generation Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                  VAE GENERATION PROCESS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   STEP 1: Sample from prior                                          │
│                                                                      │
│   z ~ N(0, I)                                                        │
│   ┌─────────────────────────────────┐                               │
│   │          ▄▄▄▄▄▄▄▄               │                               │
│   │        ▄██████████▄             │                               │
│   │       ████████████████          │                               │
│   │      ██████████████████         │  Sample random z              │
│   │       ████████████████          │  e.g., z = [0.3, -1.2, ...]   │
│   │        ▀██████████▀             │                               │
│   │          ▀▀▀▀▀▀▀▀               │                               │
│   └─────────────────────────────────┘                               │
│                                                                      │
│   STEP 2: Decode to image                                            │
│                                                                      │
│   z ──▶ Decoder ──▶ x                                               │
│                                                                      │
│   [0.3, -1.2, ...] ──▶ ┌───────┐ ──▶ ┌─────────┐                   │
│                        │Decoder│     │ Generated│                   │
│                        │       │     │  Image   │                   │
│                        └───────┘     │  🖼️     │                   │
│                                      └─────────┘                    │
│                                                                      │
│   WHY THIS WORKS:                                                    │
│   - Training pushed all q(z|x) toward N(0,I)                        │
│   - Sampling from N(0,I) gives z in the "meaningful" region         │
│   - Decoder learned to map this region to realistic images          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## VAE vs GAN Comparison

```
┌─────────────────────────────────────────────────────────────────────┐
│                      VAE vs GAN                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ASPECT              VAE                     GAN                   │
│   ─────────────────────────────────────────────────────────────     │
│   Training            Stable                  Unstable              │
│   Loss                Interpretable (ELBO)    Minimax game          │
│   Mode coverage       Good (all modes)        May miss modes        │
│   Sample quality      Blurry                  Sharp                 │
│   Latent space        Structured              Less structured       │
│   Inference           Has encoder             No encoder            │
│   Generation          Sample z, decode        Sample z, generate    │
│   Likelihood          Approximate (ELBO)      No likelihood         │
│   Interpolation       Smooth                  Can be jumpy          │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   WHEN TO USE VAE:                                                   │
│   ✓ Need latent representations                                     │
│   ✓ Want stable training                                            │
│   ✓ Need to encode new data                                         │
│   ✓ Care about coverage of all modes                                │
│   ✓ Want interpretable training objective                           │
│                                                                      │
│   WHEN TO USE GAN:                                                   │
│   ✓ Want highest quality images                                     │
│   ✓ Don't need encoder                                              │
│   ✓ Can handle training instability                                 │
│   ✓ Have enough data for stable training                            │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   WHY VAE OUTPUTS ARE BLURRY:                                        │
│                                                                      │
│   VAE minimizes E[||x - x̂||²]                                      │
│                                                                      │
│   For uncertain regions, VAE outputs the MEAN:                      │
│                                                                      │
│   Possible outputs:    VAE output:                                  │
│   ┌───┐ ┌───┐         ┌───┐                                         │
│   │ A │ │ B │   ──▶   │A+B│ = blurry average                        │
│   └───┘ └───┘    MSE  │ /2│                                         │
│                       └───┘                                         │
│                                                                      │
│   GAN doesn't average - picks one sharp option                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete VAE Implementation

### Basic VAE (NumPy)

```python
import numpy as np
import matplotlib.pyplot as plt

class VAE_NumPy:
    """
    Complete VAE implementation from scratch using NumPy
    For educational purposes
    """
    
    def __init__(self, input_dim=784, hidden_dim=256, latent_dim=20):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.latent_dim = latent_dim
        
        # Initialize encoder weights
        # Encoder: input -> hidden -> (mu, log_var)
        self.W1_enc = np.random.randn(input_dim, hidden_dim) * 0.01
        self.b1_enc = np.zeros((1, hidden_dim))
        
        self.W_mu = np.random.randn(hidden_dim, latent_dim) * 0.01
        self.b_mu = np.zeros((1, latent_dim))
        
        self.W_logvar = np.random.randn(hidden_dim, latent_dim) * 0.01
        self.b_logvar = np.zeros((1, latent_dim))
        
        # Initialize decoder weights
        # Decoder: latent -> hidden -> output
        self.W1_dec = np.random.randn(latent_dim, hidden_dim) * 0.01
        self.b1_dec = np.zeros((1, hidden_dim))
        
        self.W2_dec = np.random.randn(hidden_dim, input_dim) * 0.01
        self.b2_dec = np.zeros((1, input_dim))
    
    def relu(self, x):
        return np.maximum(0, x)
    
    def relu_derivative(self, x):
        return (x > 0).astype(float)
    
    def sigmoid(self, x):
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))
    
    def encode(self, x):
        """
        Encode input to latent distribution parameters
        Returns: mu, log_var
        """
        # Hidden layer
        self.h_enc = x @ self.W1_enc + self.b1_enc
        self.h_enc_act = self.relu(self.h_enc)
        
        # Mean
        mu = self.h_enc_act @ self.W_mu + self.b_mu
        
        # Log variance (log for numerical stability)
        log_var = self.h_enc_act @ self.W_logvar + self.b_logvar
        
        return mu, log_var
    
    def reparameterize(self, mu, log_var):
        """
        Reparameterization trick: z = mu + std * epsilon
        """
        std = np.exp(0.5 * log_var)
        epsilon = np.random.randn(*mu.shape)
        z = mu + std * epsilon
        
        # Store for backward pass
        self.epsilon = epsilon
        self.std = std
        
        return z
    
    def decode(self, z):
        """
        Decode latent vector to reconstruction
        """
        # Hidden layer
        self.h_dec = z @ self.W1_dec + self.b1_dec
        self.h_dec_act = self.relu(self.h_dec)
        
        # Output layer (sigmoid for [0, 1] output)
        output = self.h_dec_act @ self.W2_dec + self.b2_dec
        reconstruction = self.sigmoid(output)
        
        return reconstruction
    
    def forward(self, x):
        """
        Full forward pass
        """
        # Encode
        self.mu, self.log_var = self.encode(x)
        
        # Sample
        self.z = self.reparameterize(self.mu, self.log_var)
        
        # Decode
        self.reconstruction = self.decode(self.z)
        
        return self.reconstruction, self.mu, self.log_var
    
    def compute_loss(self, x, reconstruction, mu, log_var):
        """
        Compute VAE loss = Reconstruction loss + KL divergence
        """
        batch_size = x.shape[0]
        
        # Reconstruction loss (Binary Cross Entropy)
        epsilon = 1e-8
        recon_loss = -np.sum(
            x * np.log(reconstruction + epsilon) + 
            (1 - x) * np.log(1 - reconstruction + epsilon)
        ) / batch_size
        
        # KL divergence: -0.5 * sum(1 + log_var - mu^2 - exp(log_var))
        kl_loss = -0.5 * np.sum(
            1 + log_var - mu**2 - np.exp(log_var)
        ) / batch_size
        
        total_loss = recon_loss + kl_loss
        
        return total_loss, recon_loss, kl_loss
    
    def backward(self, x, learning_rate=0.001):
        """
        Backward pass and parameter updates
        """
        batch_size = x.shape[0]
        
        # Gradient of reconstruction loss w.r.t. reconstruction
        # For BCE: d_loss/d_reconstruction = (reconstruction - x) / (reconstruction * (1 - reconstruction))
        d_recon = (self.reconstruction - x) / (
            self.reconstruction * (1 - self.reconstruction) + 1e-8
        ) / batch_size
        
        # Gradient through sigmoid
        d_output = d_recon * self.reconstruction * (1 - self.reconstruction)
        
        # Decoder gradients
        d_W2_dec = self.h_dec_act.T @ d_output
        d_b2_dec = np.sum(d_output, axis=0, keepdims=True)
        
        d_h_dec_act = d_output @ self.W2_dec.T
        d_h_dec = d_h_dec_act * self.relu_derivative(self.h_dec)
        
        d_W1_dec = self.z.T @ d_h_dec
        d_b1_dec = np.sum(d_h_dec, axis=0, keepdims=True)
        
        # Gradient w.r.t. z (from reconstruction)
        d_z = d_h_dec @ self.W1_dec.T
        
        # Gradients from KL divergence
        # d_KL/d_mu = mu
        # d_KL/d_log_var = 0.5 * (exp(log_var) - 1)
        d_mu_kl = self.mu / batch_size
        d_logvar_kl = 0.5 * (np.exp(self.log_var) - 1) / batch_size
        
        # Gradient w.r.t. mu and log_var (from reparameterization)
        # z = mu + std * epsilon
        # d_z/d_mu = 1
        # d_z/d_std = epsilon
        # d_std/d_log_var = 0.5 * std
        d_mu = d_z + d_mu_kl
        d_logvar = d_z * self.epsilon * 0.5 * self.std + d_logvar_kl
        
        # Encoder gradients
        d_W_mu = self.h_enc_act.T @ d_mu
        d_b_mu = np.sum(d_mu, axis=0, keepdims=True)
        
        d_W_logvar = self.h_enc_act.T @ d_logvar
        d_b_logvar = np.sum(d_logvar, axis=0, keepdims=True)
        
        d_h_enc_act = d_mu @ self.W_mu.T + d_logvar @ self.W_logvar.T
        d_h_enc = d_h_enc_act * self.relu_derivative(self.h_enc)
        
        d_W1_enc = x.T @ d_h_enc
        d_b1_enc = np.sum(d_h_enc, axis=0, keepdims=True)
        
        # Update weights
        self.W2_dec -= learning_rate * d_W2_dec
        self.b2_dec -= learning_rate * d_b2_dec
        self.W1_dec -= learning_rate * d_W1_dec
        self.b1_dec -= learning_rate * d_b1_dec
        
        self.W_mu -= learning_rate * d_W_mu
        self.b_mu -= learning_rate * d_b_mu
        self.W_logvar -= learning_rate * d_W_logvar
        self.b_logvar -= learning_rate * d_b_logvar
        
        self.W1_enc -= learning_rate * d_W1_enc
        self.b1_enc -= learning_rate * d_b1_enc
    
    def train_step(self, x, learning_rate=0.001):
        """
        One training step
        """
        # Forward pass
        reconstruction, mu, log_var = self.forward(x)
        
        # Compute loss
        loss, recon_loss, kl_loss = self.compute_loss(x, reconstruction, mu, log_var)
        
        # Backward pass
        self.backward(x, learning_rate)
        
        return loss, recon_loss, kl_loss
    
    def generate(self, num_samples=1):
        """
        Generate new samples by sampling from prior
        """
        z = np.random.randn(num_samples, self.latent_dim)
        return self.decode(z)
    
    def reconstruct(self, x):
        """
        Reconstruct input images
        """
        reconstruction, _, _ = self.forward(x)
        return reconstruction


# ============ PyTorch Implementation ============

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import DataLoader


class Encoder(nn.Module):
    """VAE Encoder network"""
    
    def __init__(self, input_dim=784, hidden_dim=256, latent_dim=20):
        super().__init__()
        
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        
        # Output mu and log_var
        self.fc_mu = nn.Linear(hidden_dim, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim, latent_dim)
    
    def forward(self, x):
        h = F.relu(self.fc1(x))
        h = F.relu(self.fc2(h))
        
        mu = self.fc_mu(h)
        log_var = self.fc_logvar(h)
        
        return mu, log_var


class Decoder(nn.Module):
    """VAE Decoder network"""
    
    def __init__(self, latent_dim=20, hidden_dim=256, output_dim=784):
        super().__init__()
        
        self.fc1 = nn.Linear(latent_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc3 = nn.Linear(hidden_dim, output_dim)
    
    def forward(self, z):
        h = F.relu(self.fc1(z))
        h = F.relu(self.fc2(h))
        reconstruction = torch.sigmoid(self.fc3(h))
        return reconstruction


class VAE(nn.Module):
    """Complete VAE model"""
    
    def __init__(self, input_dim=784, hidden_dim=256, latent_dim=20):
        super().__init__()
        
        self.latent_dim = latent_dim
        
        self.encoder = Encoder(input_dim, hidden_dim, latent_dim)
        self.decoder = Decoder(latent_dim, hidden_dim, input_dim)
    
    def reparameterize(self, mu, log_var):
        """
        Reparameterization trick
        z = mu + std * epsilon
        """
        std = torch.exp(0.5 * log_var)
        epsilon = torch.randn_like(std)
        z = mu + std * epsilon
        return z
    
    def forward(self, x):
        # Encode
        mu, log_var = self.encoder(x)
        
        # Reparameterize
        z = self.reparameterize(mu, log_var)
        
        # Decode
        reconstruction = self.decoder(z)
        
        return reconstruction, mu, log_var
    
    def generate(self, num_samples=1, device='cpu'):
        """Generate new samples"""
        z = torch.randn(num_samples, self.latent_dim).to(device)
        return self.decoder(z)
    
    def reconstruct(self, x):
        """Reconstruct input"""
        reconstruction, _, _ = self.forward(x)
        return reconstruction


def vae_loss(reconstruction, x, mu, log_var, beta=1.0):
    """
    VAE loss function
    
    Args:
        reconstruction: Decoder output
        x: Original input
        mu: Mean from encoder
        log_var: Log variance from encoder
        beta: Weight for KL divergence (β-VAE)
    
    Returns:
        total_loss, recon_loss, kl_loss
    """
    # Reconstruction loss (Binary Cross Entropy)
    recon_loss = F.binary_cross_entropy(reconstruction, x, reduction='sum')
    
    # KL divergence
    # -0.5 * sum(1 + log(sigma^2) - mu^2 - sigma^2)
    kl_loss = -0.5 * torch.sum(1 + log_var - mu.pow(2) - log_var.exp())
    
    # Total loss
    total_loss = recon_loss + beta * kl_loss
    
    return total_loss, recon_loss, kl_loss


class VAETrainer:
    """VAE training wrapper"""
    
    def __init__(self, input_dim=784, hidden_dim=256, latent_dim=20,
                 lr=1e-3, beta=1.0, device='cpu'):
        self.device = device
        self.beta = beta
        
        self.model = VAE(input_dim, hidden_dim, latent_dim).to(device)
        self.optimizer = optim.Adam(self.model.parameters(), lr=lr)
        
        # Logging
        self.train_losses = []
        self.recon_losses = []
        self.kl_losses = []
    
    def train_epoch(self, dataloader):
        """Train for one epoch"""
        self.model.train()
        total_loss = 0
        total_recon = 0
        total_kl = 0
        
        for batch in dataloader:
            if isinstance(batch, (list, tuple)):
                x = batch[0]
            else:
                x = batch
            
            x = x.view(x.size(0), -1).to(self.device)
            
            # Forward pass
            reconstruction, mu, log_var = self.model(x)
            
            # Compute loss
            loss, recon_loss, kl_loss = vae_loss(
                reconstruction, x, mu, log_var, self.beta
            )
            
            # Backward pass
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            total_recon += recon_loss.item()
            total_kl += kl_loss.item()
        
        num_samples = len(dataloader.dataset)
        avg_loss = total_loss / num_samples
        avg_recon = total_recon / num_samples
        avg_kl = total_kl / num_samples
        
        self.train_losses.append(avg_loss)
        self.recon_losses.append(avg_recon)
        self.kl_losses.append(avg_kl)
        
        return avg_loss, avg_recon, avg_kl
    
    def train(self, dataloader, epochs=20, print_every=5):
        """Full training loop"""
        for epoch in range(epochs):
            loss, recon, kl = self.train_epoch(dataloader)
            
            if (epoch + 1) % print_every == 0:
                print(f"Epoch [{epoch+1}/{epochs}] "
                      f"Loss: {loss:.4f} | Recon: {recon:.4f} | KL: {kl:.4f}")
    
    def generate(self, num_samples=16):
        """Generate new samples"""
        self.model.eval()
        with torch.no_grad():
            samples = self.model.generate(num_samples, self.device)
        return samples.cpu().numpy()
    
    def reconstruct(self, x):
        """Reconstruct input"""
        self.model.eval()
        with torch.no_grad():
            x = x.view(x.size(0), -1).to(self.device)
            reconstruction = self.model.reconstruct(x)
        return reconstruction.cpu().numpy()
    
    def interpolate(self, x1, x2, steps=10):
        """Interpolate between two inputs in latent space"""
        self.model.eval()
        with torch.no_grad():
            x1 = x1.view(1, -1).to(self.device)
            x2 = x2.view(1, -1).to(self.device)
            
            # Encode both
            mu1, _ = self.model.encoder(x1)
            mu2, _ = self.model.encoder(x2)
            
            # Interpolate in latent space
            interpolations = []
            for alpha in np.linspace(0, 1, steps):
                z = (1 - alpha) * mu1 + alpha * mu2
                reconstruction = self.model.decoder(z)
                interpolations.append(reconstruction.cpu().numpy())
        
        return np.concatenate(interpolations, axis=0)


# ============ Convolutional VAE ============

class ConvEncoder(nn.Module):
    """Convolutional encoder for images"""
    
    def __init__(self, in_channels=1, latent_dim=20):
        super().__init__()
        
        self.conv1 = nn.Conv2d(in_channels, 32, 3, stride=2, padding=1)
        self.conv2 = nn.Conv2d(32, 64, 3, stride=2, padding=1)
        self.conv3 = nn.Conv2d(64, 128, 3, stride=2, padding=1)
        
        # For 28x28 input: after 3 conv layers -> 4x4
        self.fc_mu = nn.Linear(128 * 4 * 4, latent_dim)
        self.fc_logvar = nn.Linear(128 * 4 * 4, latent_dim)
    
    def forward(self, x):
        h = F.relu(self.conv1(x))  # [B, 32, 14, 14]
        h = F.relu(self.conv2(h))  # [B, 64, 7, 7]
        h = F.relu(self.conv3(h))  # [B, 128, 4, 4]
        h = h.view(h.size(0), -1)  # [B, 128*4*4]
        
        mu = self.fc_mu(h)
        log_var = self.fc_logvar(h)
        
        return mu, log_var


class ConvDecoder(nn.Module):
    """Convolutional decoder for images"""
    
    def __init__(self, latent_dim=20, out_channels=1):
        super().__init__()
        
        self.fc = nn.Linear(latent_dim, 128 * 4 * 4)
        
        self.deconv1 = nn.ConvTranspose2d(128, 64, 3, stride=2, padding=1, output_padding=0)
        self.deconv2 = nn.ConvTranspose2d(64, 32, 3, stride=2, padding=1, output_padding=1)
        self.deconv3 = nn.ConvTranspose2d(32, out_channels, 3, stride=2, padding=1, output_padding=1)
    
    def forward(self, z):
        h = F.relu(self.fc(z))
        h = h.view(h.size(0), 128, 4, 4)
        
        h = F.relu(self.deconv1(h))  # [B, 64, 7, 7]
        h = F.relu(self.deconv2(h))  # [B, 32, 14, 14]
        h = torch.sigmoid(self.deconv3(h))  # [B, 1, 28, 28]
        
        return h


class ConvVAE(nn.Module):
    """Convolutional VAE for images"""
    
    def __init__(self, in_channels=1, latent_dim=20):
        super().__init__()
        
        self.latent_dim = latent_dim
        self.encoder = ConvEncoder(in_channels, latent_dim)
        self.decoder = ConvDecoder(latent_dim, in_channels)
    
    def reparameterize(self, mu, log_var):
        std = torch.exp(0.5 * log_var)
        epsilon = torch.randn_like(std)
        return mu + std * epsilon
    
    def forward(self, x):
        mu, log_var = self.encoder(x)
        z = self.reparameterize(mu, log_var)
        reconstruction = self.decoder(z)
        return reconstruction, mu, log_var
    
    def generate(self, num_samples, device):
        z = torch.randn(num_samples, self.latent_dim).to(device)
        return self.decoder(z)


# ============ β-VAE ============

class BetaVAE(VAE):
    """β-VAE with adjustable β parameter"""
    
    def __init__(self, input_dim=784, hidden_dim=256, latent_dim=20, beta=4.0):
        super().__init__(input_dim, hidden_dim, latent_dim)
        self.beta = beta


def beta_vae_loss(reconstruction, x, mu, log_var, beta=4.0):
    """β-VAE loss with higher weight on KL divergence"""
    recon_loss = F.binary_cross_entropy(reconstruction, x, reduction='sum')
    kl_loss = -0.5 * torch.sum(1 + log_var - mu.pow(2) - log_var.exp())
    return recon_loss + beta * kl_loss


# ============ Conditional VAE ============

class CVAE(nn.Module):
    """Conditional VAE"""
    
    def __init__(self, input_dim=784, hidden_dim=256, latent_dim=20, num_classes=10):
        super().__init__()
        
        self.latent_dim = latent_dim
        self.num_classes = num_classes
        
        # Encoder takes input + one-hot class
        self.fc1_enc = nn.Linear(input_dim + num_classes, hidden_dim)
        self.fc2_enc = nn.Linear(hidden_dim, hidden_dim)
        self.fc_mu = nn.Linear(hidden_dim, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim, latent_dim)
        
        # Decoder takes latent + one-hot class
        self.fc1_dec = nn.Linear(latent_dim + num_classes, hidden_dim)
        self.fc2_dec = nn.Linear(hidden_dim, hidden_dim)
        self.fc3_dec = nn.Linear(hidden_dim, input_dim)
    
    def encode(self, x, c):
        """Encode with condition c"""
        xc = torch.cat([x, c], dim=1)
        h = F.relu(self.fc1_enc(xc))
        h = F.relu(self.fc2_enc(h))
        return self.fc_mu(h), self.fc_logvar(h)
    
    def decode(self, z, c):
        """Decode with condition c"""
        zc = torch.cat([z, c], dim=1)
        h = F.relu(self.fc1_dec(zc))
        h = F.relu(self.fc2_dec(h))
        return torch.sigmoid(self.fc3_dec(h))
    
    def reparameterize(self, mu, log_var):
        std = torch.exp(0.5 * log_var)
        epsilon = torch.randn_like(std)
        return mu + std * epsilon
    
    def forward(self, x, c):
        mu, log_var = self.encode(x, c)
        z = self.reparameterize(mu, log_var)
        reconstruction = self.decode(z, c)
        return reconstruction, mu, log_var
    
    def generate(self, c, num_samples=1, device='cpu'):
        """Generate samples for given class"""
        z = torch.randn(num_samples, self.latent_dim).to(device)
        c = F.one_hot(torch.tensor([c] * num_samples), self.num_classes).float().to(device)
        return self.decode(z, c)


# ============ VQ-VAE ============

class VectorQuantizer(nn.Module):
    """Vector Quantization layer for VQ-VAE"""
    
    def __init__(self, num_embeddings=512, embedding_dim=64, commitment_cost=0.25):
        super().__init__()
        
        self.num_embeddings = num_embeddings
        self.embedding_dim = embedding_dim
        self.commitment_cost = commitment_cost
        
        # Codebook
        self.embeddings = nn.Embedding(num_embeddings, embedding_dim)
        self.embeddings.weight.data.uniform_(-1/num_embeddings, 1/num_embeddings)
    
    def forward(self, z_e):
        """
        Args:
            z_e: Encoder output [B, C, H, W] or [B, D]
        
        Returns:
            z_q: Quantized output
            loss: VQ loss
            encoding_indices: Indices of chosen embeddings
        """
        # Flatten to [B*H*W, C] for images or keep [B, D] for flat
        if z_e.dim() == 4:
            B, C, H, W = z_e.shape
            z_e_flat = z_e.permute(0, 2, 3, 1).contiguous().view(-1, C)
            is_image = True
        else:
            z_e_flat = z_e
            is_image = False
        
        # Compute distances to all embeddings
        # ||z_e - e||^2 = ||z_e||^2 + ||e||^2 - 2*z_e*e
        distances = (
            z_e_flat.pow(2).sum(dim=1, keepdim=True)
            + self.embeddings.weight.pow(2).sum(dim=1)
            - 2 * z_e_flat @ self.embeddings.weight.T
        )
        
        # Find nearest embedding
        encoding_indices = distances.argmin(dim=1)
        
        # Quantize
        z_q_flat = self.embeddings(encoding_indices)
        
        # Compute losses
        # Codebook loss: move embeddings toward encoder outputs
        codebook_loss = F.mse_loss(z_q_flat, z_e_flat.detach())
        
        # Commitment loss: commit encoder to current embeddings
        commitment_loss = F.mse_loss(z_e_flat, z_q_flat.detach())
        
        vq_loss = codebook_loss + self.commitment_cost * commitment_loss
        
        # Straight-through estimator
        z_q_flat = z_e_flat + (z_q_flat - z_e_flat).detach()
        
        # Reshape back
        if is_image:
            z_q = z_q_flat.view(B, H, W, C).permute(0, 3, 1, 2)
            encoding_indices = encoding_indices.view(B, H, W)
        else:
            z_q = z_q_flat
        
        return z_q, vq_loss, encoding_indices


class VQVAE(nn.Module):
    """VQ-VAE implementation"""
    
    def __init__(self, in_channels=1, hidden_dim=128, num_embeddings=512, 
                 embedding_dim=64, commitment_cost=0.25):
        super().__init__()
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Conv2d(in_channels, hidden_dim, 4, stride=2, padding=1),
            nn.ReLU(),
            nn.Conv2d(hidden_dim, hidden_dim, 4, stride=2, padding=1),
            nn.ReLU(),
            nn.Conv2d(hidden_dim, embedding_dim, 3, stride=1, padding=1),
        )
        
        # Vector Quantizer
        self.vq = VectorQuantizer(num_embeddings, embedding_dim, commitment_cost)
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.Conv2d(embedding_dim, hidden_dim, 3, stride=1, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(hidden_dim, hidden_dim, 4, stride=2, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(hidden_dim, in_channels, 4, stride=2, padding=1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        z_e = self.encoder(x)
        z_q, vq_loss, indices = self.vq(z_e)
        reconstruction = self.decoder(z_q)
        return reconstruction, vq_loss, indices
    
    def encode(self, x):
        z_e = self.encoder(x)
        _, _, indices = self.vq(z_e)
        return indices
    
    def decode_from_indices(self, indices):
        z_q = self.vq.embeddings(indices)
        if indices.dim() == 3:  # [B, H, W]
            z_q = z_q.permute(0, 3, 1, 2)  # [B, C, H, W]
        return self.decoder(z_q)


# ============ Visualization Utilities ============

def visualize_reconstructions(model, data, num_samples=8, device='cpu'):
    """Visualize original and reconstructed images"""
    model.eval()
    
    with torch.no_grad():
        x = data[:num_samples].view(num_samples, -1).to(device)
        recon, _, _ = model(x)
    
    fig, axes = plt.subplots(2, num_samples, figsize=(num_samples * 2, 4))
    
    for i in range(num_samples):
        # Original
        axes[0, i].imshow(x[i].cpu().view(28, 28), cmap='gray')
        axes[0, i].axis('off')
        axes[0, i].set_title('Original')
        
        # Reconstruction
        axes[1, i].imshow(recon[i].cpu().view(28, 28), cmap='gray')
        axes[1, i].axis('off')
        axes[1, i].set_title('Recon')
    
    plt.tight_layout()
    plt.show()


def visualize_latent_space(model, data, labels, device='cpu'):
    """Visualize 2D latent space (requires latent_dim=2)"""
    model.eval()
    
    with torch.no_grad():
        x = data.view(data.size(0), -1).to(device)
        mu, _ = model.encoder(x)
    
    mu = mu.cpu().numpy()
    
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(mu[:, 0], mu[:, 1], c=labels, cmap='tab10', alpha=0.7)
    plt.colorbar(scatter)
    plt.xlabel('z[0]')
    plt.ylabel('z[1]')
    plt.title('VAE Latent Space')
    plt.show()


def visualize_generation(model, num_samples=16, device='cpu'):
    """Visualize generated samples"""
    model.eval()
    
    with torch.no_grad():
        samples = model.generate(num_samples, device)
    
    nrow = int(np.sqrt(num_samples))
    fig, axes = plt.subplots(nrow, nrow, figsize=(8, 8))
    
    for i, ax in enumerate(axes.flat):
        ax.imshow(samples[i].cpu().view(28, 28), cmap='gray')
        ax.axis('off')
    
    plt.suptitle('Generated Samples')
    plt.tight_layout()
    plt.show()


# Example usage
if __name__ == "__main__":
    print("VAE Implementation Demo")
    print("=" * 50)
    
    # Create model
    vae = VAE(input_dim=784, hidden_dim=256, latent_dim=20)
    print(f"Model parameters: {sum(p.numel() for p in vae.parameters()):,}")
    
    # Dummy data
    x = torch.randn(32, 784).sigmoid()  # Fake "images"
    
    # Forward pass
    recon, mu, log_var = vae(x)
    print(f"Input shape: {x.shape}")
    print(f"Reconstruction shape: {recon.shape}")
    print(f"Mu shape: {mu.shape}")
    print(f"Log_var shape: {log_var.shape}")
    
    # Compute loss
    loss, recon_loss, kl_loss = vae_loss(recon, x, mu, log_var)
    print(f"Total loss: {loss.item():.4f}")
    print(f"Recon loss: {recon_loss.item():.4f}")
    print(f"KL loss: {kl_loss.item():.4f}")
    
    # Generate
    samples = vae.generate(4)
    print(f"Generated samples shape: {samples.shape}")
```

---

## Mini Project: Image Generation

### Project: Train VAE on Fashion-MNIST

```python
"""
Mini Project: Fashion-MNIST Generation with VAE
================================================
Train a VAE to generate fashion items
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt
import numpy as np
from tqdm import tqdm


# ============ Configuration ============
class Config:
    # Data
    batch_size = 128
    
    # Model
    input_dim = 784
    hidden_dim = 512
    latent_dim = 20
    
    # Training
    epochs = 30
    lr = 1e-3
    beta = 1.0  # Standard VAE (β=1)
    
    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

config = Config()


# ============ Model ============
class FashionVAE(nn.Module):
    """VAE for Fashion-MNIST"""
    
    def __init__(self, config):
        super().__init__()
        
        self.latent_dim = config.latent_dim
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(config.input_dim, config.hidden_dim),
            nn.ReLU(),
            nn.Linear(config.hidden_dim, config.hidden_dim // 2),
            nn.ReLU(),
        )
        
        self.fc_mu = nn.Linear(config.hidden_dim // 2, config.latent_dim)
        self.fc_logvar = nn.Linear(config.hidden_dim // 2, config.latent_dim)
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(config.latent_dim, config.hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(config.hidden_dim // 2, config.hidden_dim),
            nn.ReLU(),
            nn.Linear(config.hidden_dim, config.input_dim),
            nn.Sigmoid()
        )
    
    def encode(self, x):
        h = self.encoder(x)
        return self.fc_mu(h), self.fc_logvar(h)
    
    def reparameterize(self, mu, log_var):
        std = torch.exp(0.5 * log_var)
        eps = torch.randn_like(std)
        return mu + std * eps
    
    def decode(self, z):
        return self.decoder(z)
    
    def forward(self, x):
        mu, log_var = self.encode(x)
        z = self.reparameterize(mu, log_var)
        return self.decode(z), mu, log_var
    
    def generate(self, num_samples, device):
        z = torch.randn(num_samples, self.latent_dim).to(device)
        return self.decode(z)


# ============ Training ============
class Trainer:
    def __init__(self, model, config):
        self.model = model
        self.config = config
        self.optimizer = optim.Adam(model.parameters(), lr=config.lr)
        
        self.train_losses = []
        self.recon_losses = []
        self.kl_losses = []
    
    def loss_function(self, recon, x, mu, log_var):
        recon_loss = F.binary_cross_entropy(recon, x, reduction='sum')
        kl_loss = -0.5 * torch.sum(1 + log_var - mu.pow(2) - log_var.exp())
        return recon_loss + self.config.beta * kl_loss, recon_loss, kl_loss
    
    def train_epoch(self, dataloader):
        self.model.train()
        total_loss = 0
        total_recon = 0
        total_kl = 0
        
        for x, _ in tqdm(dataloader, desc='Training'):
            x = x.view(x.size(0), -1).to(self.config.device)
            
            recon, mu, log_var = self.model(x)
            loss, recon_loss, kl_loss = self.loss_function(recon, x, mu, log_var)
            
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            total_recon += recon_loss.item()
            total_kl += kl_loss.item()
        
        n = len(dataloader.dataset)
        return total_loss/n, total_recon/n, total_kl/n
    
    def train(self, train_loader, test_loader=None):
        for epoch in range(self.config.epochs):
            loss, recon, kl = self.train_epoch(train_loader)
            
            self.train_losses.append(loss)
            self.recon_losses.append(recon)
            self.kl_losses.append(kl)
            
            print(f"Epoch {epoch+1}/{self.config.epochs} | "
                  f"Loss: {loss:.4f} | Recon: {recon:.4f} | KL: {kl:.4f}")
            
            # Generate samples every 10 epochs
            if (epoch + 1) % 10 == 0:
                self.visualize_samples(epoch + 1)
    
    def visualize_samples(self, epoch):
        self.model.eval()
        with torch.no_grad():
            samples = self.model.generate(16, self.config.device)
        
        fig, axes = plt.subplots(4, 4, figsize=(8, 8))
        for i, ax in enumerate(axes.flat):
            ax.imshow(samples[i].cpu().view(28, 28), cmap='gray')
            ax.axis('off')
        
        plt.suptitle(f'Generated Samples - Epoch {epoch}')
        plt.tight_layout()
        plt.savefig(f'fashion_vae_epoch_{epoch}.png')
        plt.close()
    
    def visualize_reconstructions(self, dataloader):
        self.model.eval()
        x, _ = next(iter(dataloader))
        x = x[:8].view(8, -1).to(self.config.device)
        
        with torch.no_grad():
            recon, _, _ = self.model(x)
        
        fig, axes = plt.subplots(2, 8, figsize=(16, 4))
        for i in range(8):
            axes[0, i].imshow(x[i].cpu().view(28, 28), cmap='gray')
            axes[0, i].axis('off')
            axes[0, i].set_title('Original')
            
            axes[1, i].imshow(recon[i].cpu().view(28, 28), cmap='gray')
            axes[1, i].axis('off')
            axes[1, i].set_title('Recon')
        
        plt.tight_layout()
        plt.savefig('fashion_vae_reconstructions.png')
        plt.show()
    
    def visualize_latent_interpolation(self):
        """Interpolate between two random points in latent space"""
        self.model.eval()
        
        z1 = torch.randn(1, self.config.latent_dim).to(self.config.device)
        z2 = torch.randn(1, self.config.latent_dim).to(self.config.device)
        
        with torch.no_grad():
            interpolations = []
            for alpha in np.linspace(0, 1, 10):
                z = (1 - alpha) * z1 + alpha * z2
                sample = self.model.decode(z)
                interpolations.append(sample)
        
        fig, axes = plt.subplots(1, 10, figsize=(20, 2))
        for i, ax in enumerate(axes):
            ax.imshow(interpolations[i].cpu().view(28, 28), cmap='gray')
            ax.axis('off')
        
        plt.suptitle('Latent Space Interpolation')
        plt.tight_layout()
        plt.savefig('fashion_vae_interpolation.png')
        plt.show()
    
    def visualize_latent_space_2d(self, dataloader, num_samples=3000):
        """Visualize 2D slice of latent space"""
        self.model.eval()
        
        mus = []
        labels = []
        
        with torch.no_grad():
            for x, y in dataloader:
                if len(mus) * x.size(0) >= num_samples:
                    break
                x = x.view(x.size(0), -1).to(self.config.device)
                mu, _ = self.model.encode(x)
                mus.append(mu.cpu())
                labels.append(y)
        
        mus = torch.cat(mus, dim=0).numpy()[:num_samples]
        labels = torch.cat(labels, dim=0).numpy()[:num_samples]
        
        # Use first 2 dimensions
        plt.figure(figsize=(10, 8))
        scatter = plt.scatter(mus[:, 0], mus[:, 1], c=labels, cmap='tab10', alpha=0.5)
        plt.colorbar(scatter)
        plt.xlabel('z[0]')
        plt.ylabel('z[1]')
        plt.title('VAE Latent Space (First 2 Dimensions)')
        plt.savefig('fashion_vae_latent_space.png')
        plt.show()
    
    def plot_losses(self):
        fig, axes = plt.subplots(1, 3, figsize=(15, 4))
        
        axes[0].plot(self.train_losses)
        axes[0].set_title('Total Loss')
        axes[0].set_xlabel('Epoch')
        
        axes[1].plot(self.recon_losses)
        axes[1].set_title('Reconstruction Loss')
        axes[1].set_xlabel('Epoch')
        
        axes[2].plot(self.kl_losses)
        axes[2].set_title('KL Loss')
        axes[2].set_xlabel('Epoch')
        
        plt.tight_layout()
        plt.savefig('fashion_vae_losses.png')
        plt.show()


# ============ Main ============
def main():
    print(f"Training on {config.device}")
    
    # Data
    transform = transforms.Compose([
        transforms.ToTensor(),
    ])
    
    train_dataset = datasets.FashionMNIST(
        root='./data', train=True, download=True, transform=transform
    )
    test_dataset = datasets.FashionMNIST(
        root='./data', train=False, download=True, transform=transform
    )
    
    train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=config.batch_size, shuffle=False)
    
    # Fashion-MNIST classes
    classes = ['T-shirt/top', 'Trouser', 'Pullover', 'Dress', 'Coat',
               'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot']
    
    # Model
    model = FashionVAE(config).to(config.device)
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Train
    trainer = Trainer(model, config)
    trainer.train(train_loader, test_loader)
    
    # Visualizations
    trainer.plot_losses()
    trainer.visualize_reconstructions(test_loader)
    trainer.visualize_latent_interpolation()
    trainer.visualize_latent_space_2d(test_loader)
    
    # Save model
    torch.save(model.state_dict(), 'fashion_vae.pth')
    print("Model saved!")


if __name__ == "__main__":
    main()
```

---

## Homework

### Level 1: Fundamentals (Beginner)

1. **Implement the reparameterization trick manually**
   - Show that gradients flow through z = μ + σε
   - Explain why sampling directly from N(μ, σ²) blocks gradients

2. **Derive the KL divergence formula for two Gaussians**
   - Start from KL(N(μ₁, σ₁²) || N(μ₂, σ₂²))
   - Simplify for the VAE case: KL(N(μ, σ²) || N(0, 1))

3. **Explain why VAE outputs tend to be blurry compared to GANs**

### Level 2: Intermediate Implementation

4. **Implement KL annealing (warm-up)**
   - Start with β=0, gradually increase to β=1
   - Compare training stability with sudden β=1

5. **Add batch normalization to your VAE**
   - Compare reconstruction quality with and without BatchNorm
   - Note any training differences

6. **Implement a Conditional VAE (CVAE)**
   - Train on MNIST with digit labels
   - Generate specific digits by conditioning

### Level 3: Advanced Challenges

7. **Implement the evidence lower bound (ELBO) computation**
   - Compute ELBO on held-out test data
   - Compare ELBO values for different β values

8. **Build a VQ-VAE**
   - Implement the vector quantization layer
   - Train on MNIST and visualize the codebook usage

9. **Implement importance-weighted autoencoder (IWAE)**
   - Use multiple samples for tighter ELBO bound
   - Compare with standard VAE

### Level 4: Research-Level

10. **Implement β-VAE with capacity constraint**
    - Use the objective: L = Recon + γ|KL - C|
    - Gradually increase C during training

11. **Build a Ladder VAE with hierarchical latents**
    - Multiple levels of latent variables
    - Top-down and bottom-up paths

12. **Implement VAE-GAN hybrid**
    - Use discriminator for reconstruction loss
    - Compare sample quality with pure VAE

---

## Common Mistakes

### ❌ Mistake 1: Wrong KL Implementation

```python
# BAD: Missing the sum reduction
kl_loss = -0.5 * (1 + log_var - mu**2 - log_var.exp())  # Shape: [batch, latent_dim]

# GOOD: Sum over latent dimension
kl_loss = -0.5 * torch.sum(1 + log_var - mu**2 - log_var.exp())
```

### ❌ Mistake 2: Predicting σ Instead of log(σ²)

```python
# BAD: Predicting std directly (can be negative!)
self.fc_std = nn.Linear(hidden, latent)
std = self.fc_std(h)  # Could be negative!

# GOOD: Predict log variance
self.fc_logvar = nn.Linear(hidden, latent)
log_var = self.fc_logvar(h)
std = torch.exp(0.5 * log_var)  # Always positive!
```

### ❌ Mistake 3: Forgetting Sigmoid in Decoder

```python
# BAD: Output can be negative or > 1
reconstruction = self.fc_out(h)  # Range: (-∞, +∞)
loss = F.binary_cross_entropy(reconstruction, x)  # Error!

# GOOD: Constrain to [0, 1]
reconstruction = torch.sigmoid(self.fc_out(h))
loss = F.binary_cross_entropy(reconstruction, x)
```

### ❌ Mistake 4: Using BCE with Non-Normalized Input

```python
# BAD: Input in [0, 255]
x = load_image()  # [0, 255]
loss = F.binary_cross_entropy(recon, x)  # Wrong!

# GOOD: Normalize input to [0, 1]
x = load_image() / 255.0  # [0, 1]
loss = F.binary_cross_entropy(recon, x)
```

### ❌ Mistake 5: Same Scale for Recon and KL Loss

```python
# BAD: KL dominates when using sum reduction
recon_loss = F.mse_loss(recon, x, reduction='mean')  # Per-pixel average
kl_loss = -0.5 * torch.sum(...)  # Total sum (much larger!)

# GOOD: Consistent reduction
recon_loss = F.mse_loss(recon, x, reduction='sum')
kl_loss = -0.5 * torch.sum(...)
# OR normalize both by batch size
```

### ❌ Mistake 6: Posterior Collapse

```python
# SYMPTOM: KL loss → 0, decoder ignores z

# SOLUTION 1: KL annealing
beta = min(1.0, epoch / warmup_epochs)
loss = recon_loss + beta * kl_loss

# SOLUTION 2: Free bits (minimum KL)
kl_loss = torch.max(kl_loss, torch.tensor(free_bits))

# SOLUTION 3: Use VQ-VAE (discrete latents)
```

### ❌ Mistake 7: Not Setting Model to Eval Mode

```python
# BAD: Dropout and BatchNorm in training mode during generation
samples = model.generate(16, device)

# GOOD: Set to eval mode
model.eval()
with torch.no_grad():
    samples = model.generate(16, device)
model.train()
```

---

## Interview Questions & Answers

### Q1: What is a VAE and how is it different from a regular autoencoder? (Beginner)

**Answer:**

**Regular Autoencoder:**
- Encoder maps input to a **single point** in latent space
- Decoder reconstructs from that point
- Loss: only reconstruction loss
- Problem: latent space has gaps, can't generate new samples

**VAE (Variational Autoencoder):**
- Encoder maps input to a **probability distribution** (μ, σ²)
- Sample z from this distribution
- Loss: reconstruction + KL divergence
- Benefit: smooth latent space, can generate by sampling from prior

```
AE:  x → z (point) → x̂
VAE: x → (μ, σ²) → z ~ N(μ, σ²) → x̂
```

The KL divergence term forces all distributions toward N(0, I), creating a continuous, organized latent space.

---

### Q2: Explain the reparameterization trick and why it's necessary. (Intermediate)

**Answer:**

**Problem:** We need to sample z ~ N(μ, σ²), but sampling is a **stochastic operation** with no gradient.

```
x → Encoder → μ, σ² → SAMPLE z → Decoder → x̂
                         ↑
                    No gradient!
```

**Solution:** Reparameterize the sampling:
- Instead of: z ~ N(μ, σ²)
- Write as: z = μ + σ · ε, where ε ~ N(0, I)

```
x → Encoder → μ, σ² → z = μ + σ·ε → Decoder → x̂
                 ↓         ↑
              Gradients   ε is external
              can flow!   (no gradient needed)
```

Now:
- ∂z/∂μ = 1 ✓
- ∂z/∂σ = ε ✓

The randomness (ε) is moved outside the computational graph, allowing backpropagation through μ and σ.

---

### Q3: Derive the ELBO and explain each term. (Intermediate)

**Answer:**

**Goal:** Maximize log p(x) (log-likelihood of data)

**Problem:** p(x) = ∫ p(x|z)p(z)dz is intractable

**Solution:** Use variational inference with approximate posterior q(z|x)

**Derivation:**
```
log p(x) = log ∫ p(x|z)p(z) dz
         = log ∫ p(x|z)p(z) · q(z|x)/q(z|x) dz
         ≥ ∫ q(z|x) log[p(x|z)p(z)/q(z|x)] dz   (Jensen's inequality)
         = E_q[log p(x|z)] - KL(q(z|x) || p(z))
         = ELBO
```

**ELBO = E_q[log p(x|z)] - KL(q(z|x) || p(z))**

| Term | Meaning |
|------|---------|
| E_q[log p(x|z)] | Reconstruction: how well can we reconstruct x from sampled z |
| KL(q(z|x) \|\| p(z)) | Regularization: push q(z|x) toward prior p(z) = N(0,I) |

Maximizing ELBO ≈ Maximizing log p(x) (lower bound)

---

### Q4: What is posterior collapse and how do you prevent it? (Advanced)

**Answer:**

**Posterior collapse:** The encoder learns to output q(z|x) = N(0, I) for all inputs, ignoring the input completely. KL loss → 0, but z carries no information.

**Why it happens:**
- Powerful decoder (RNN, Transformer) can model p(x) without z
- Optimizer finds it easier to minimize KL by collapsing q to prior
- Reconstruction loss can still be reasonable

**Prevention strategies:**

1. **KL Annealing (Warm-up):**
```python
beta = min(1.0, epoch / warmup_epochs)
loss = recon_loss + beta * kl_loss
```

2. **Free Bits:**
```python
# Ensure minimum KL per dimension
kl_per_dim = -0.5 * (1 + log_var - mu**2 - log_var.exp())
kl_loss = torch.sum(torch.max(kl_per_dim, free_bits))
```

3. **Weaker Decoder:** Use simpler decoder architecture

4. **VQ-VAE:** Use discrete latents (no KL collapse possible)

5. **δ-VAE:** Add noise to decoder input

---

### Q5: Compare VAE and GAN. When would you use each? (Advanced)

**Answer:**

| Aspect | VAE | GAN |
|--------|-----|-----|
| **Training** | Stable (single objective) | Unstable (minimax game) |
| **Sample Quality** | Blurry | Sharp |
| **Mode Coverage** | Good (covers all modes) | May miss modes |
| **Latent Space** | Structured, interpretable | Less organized |
| **Inference** | Has encoder (can get z from x) | No encoder by default |
| **Likelihood** | Provides ELBO | No likelihood estimate |

**Use VAE when:**
- Need latent representations for downstream tasks
- Want stable training
- Need to encode new data points
- Care about mode coverage
- Want interpretable training loss

**Use GAN when:**
- Want highest quality images
- Don't need encoder
- Have resources for careful training
- Sample quality > mode coverage

**Hybrid:** VAE-GAN combines both—VAE structure with GAN discriminator for sharper images.

---

### Q6: Explain β-VAE and disentanglement. (Advanced)

**Answer:**

**β-VAE Loss:** L = E[log p(x|z)] - **β** · KL(q(z|x) || p(z))

Where β > 1 (typically 4-10)

**Effect of higher β:**
- Stronger pressure for q(z|x) → N(0, I)
- Each latent dimension becomes more independent
- Each dimension captures a single factor of variation

**Disentanglement:**
```
Entangled (β=1):           Disentangled (β=4):
z₁ = face + hair + eyes    z₁ = face shape
z₂ = nose + color + age    z₂ = hair color
                           z₃ = eye color
                           z₄ = age
```

With disentangled z, changing one dimension only changes one feature.

**Trade-off:**
- β↑ → More disentanglement, worse reconstruction
- β↓ → Better reconstruction, more entanglement

**Measuring disentanglement:** Use metrics like Factor-VAE metric, DCI, or MIG

---

### Q7: How does VQ-VAE differ from standard VAE? (Advanced)

**Answer:**

**Standard VAE:**
- Continuous latent space: z ∈ ℝ^d
- Reparameterization: z = μ + σε
- KL divergence to N(0, I)

**VQ-VAE:**
- Discrete latent codes: z ∈ {e₁, e₂, ..., eₖ} (codebook)
- Vector quantization: find nearest embedding
- No KL divergence (no probabilistic encoder)

**VQ-VAE Process:**
```
1. Encoder outputs z_e (continuous)
2. Find nearest codebook vector: k = argmin ||z_e - eₖ||²
3. Replace z_e with e_k (quantize)
4. Decoder uses e_k
```

**VQ-VAE Losses:**
```python
# Reconstruction
L_recon = ||x - x̂||²

# Codebook: move embeddings toward encoder outputs
L_codebook = ||sg[z_e] - e_k||²  # sg = stop gradient

# Commitment: encoder commits to embeddings
L_commit = ||z_e - sg[e_k]||²
```

**Advantages of VQ-VAE:**
- No posterior collapse (discrete can't collapse)
- Can use autoregressive models on discrete codes
- Better for audio, video (used in DALL-E, AudioLM)

---

### Q8: Debug this VAE code. What's wrong? (Senior/Debugging)

```python
class BrokenVAE(nn.Module):
    def forward(self, x):
        h = self.encoder(x)
        mu = self.fc_mu(h)
        std = self.fc_std(h)  # Issue 1
        
        z = mu + std * torch.randn_like(std)  # Issue 2
        
        recon = self.decoder(z)
        return recon, mu, std
    
def loss(recon, x, mu, std):
    recon_loss = F.mse_loss(recon, x)
    kl = -0.5 * (1 + torch.log(std**2) - mu**2 - std**2)  # Issue 3
    return recon_loss + kl
```

**Answer:**

**Issue 1:** Predicting std directly can produce negative values
```python
# Fix: Predict log_var instead
log_var = self.fc_logvar(h)
std = torch.exp(0.5 * log_var)
```

**Issue 2:** Using `torch.randn_like` creates new random tensor each call (OK, but mention)
```python
# Actually OK, but could be cleaner:
epsilon = torch.randn_like(std)
z = mu + std * epsilon
```

**Issue 3:** KL not summed properly
```python
# Fix: Sum over dimensions
kl = -0.5 * torch.sum(1 + log_var - mu**2 - log_var.exp())
```

**Complete fix:**
```python
class FixedVAE(nn.Module):
    def forward(self, x):
        h = self.encoder(x)
        mu = self.fc_mu(h)
        log_var = self.fc_logvar(h)  # Fixed
        
        std = torch.exp(0.5 * log_var)
        z = mu + std * torch.randn_like(std)
        
        recon = torch.sigmoid(self.decoder(z))  # Add sigmoid
        return recon, mu, log_var

def loss(recon, x, mu, log_var):
    recon_loss = F.binary_cross_entropy(recon, x, reduction='sum')
    kl = -0.5 * torch.sum(1 + log_var - mu**2 - log_var.exp())
    return recon_loss + kl
```

---

### Q9: How would you implement importance weighted VAE (IWAE)? (Senior)

**Answer:**

**IWAE** uses multiple samples for a tighter lower bound on log p(x).

**Standard VAE ELBO (1 sample):**
$$\mathcal{L}_{VAE} = \mathbb{E}_{z \sim q}[\log p(x|z) - \log q(z|x) + \log p(z)]$$

**IWAE (k samples):**
$$\mathcal{L}_{IWAE}^k = \mathbb{E}_{z_1,...,z_k \sim q}\left[\log \frac{1}{k} \sum_{i=1}^k \frac{p(x|z_i)p(z_i)}{q(z_i|x)}\right]$$

**Implementation:**
```python
def iwae_loss(model, x, k=5):
    batch_size = x.size(0)
    
    # Encode once
    mu, log_var = model.encode(x)
    
    # Sample k times
    log_weights = []
    for _ in range(k):
        z = model.reparameterize(mu, log_var)
        recon = model.decode(z)
        
        # log p(x|z)
        log_p_x_z = -F.binary_cross_entropy(recon, x, reduction='none').sum(dim=1)
        
        # log p(z) = log N(0, I)
        log_p_z = -0.5 * z.pow(2).sum(dim=1)
        
        # log q(z|x)
        log_q_z_x = -0.5 * ((z - mu)**2 / log_var.exp() + log_var).sum(dim=1)
        
        log_weight = log_p_x_z + log_p_z - log_q_z_x
        log_weights.append(log_weight)
    
    # Stack: [k, batch_size]
    log_weights = torch.stack(log_weights, dim=0)
    
    # Log-sum-exp trick for numerical stability
    iwae_elbo = torch.logsumexp(log_weights, dim=0) - np.log(k)
    
    return -iwae_elbo.mean()  # Negative for loss
```

**Property:** As k → ∞, IWAE bound → log p(x) (exact likelihood)

---

### Q10: Design a VAE system for generating high-resolution faces. What architecture and training strategies would you use? (FAANG System Design)

**Answer:**

**Architecture: Hierarchical VAE (like NVAE)**

1. **Hierarchical Latent Structure:**
```
z_L (coarsest) → z_{L-1} → ... → z_1 (finest) → x
```
Each level captures different scale of features.

2. **Encoder (Bottom-Up):**
- Residual blocks with squeeze-excitation
- Multiple latent groups at different resolutions
- Spectral normalization for stability

3. **Decoder (Top-Down):**
- Start from coarsest z_L
- Progressively refine with finer z levels
- Skip connections from encoder

4. **Architecture Details for 1024×1024:**
```
Encoder:
  1024×1024 → 512×512 → ... → 8×8 (feature extraction)
  Multiple latent groups at 64×64, 32×32, 16×16, 8×8

Decoder:
  z_8×8 → z_16×16 → z_32×32 → z_64×64 → ... → 1024×1024
```

**Training Strategies:**

1. **KL Balancing:**
   - Different β for different latent groups
   - Warm-up KL gradually

2. **Residual Normal Distributions:**
```python
# Relative parameterization
mu = mu_prior + delta_mu
log_var = log_var_prior + delta_log_var
```

3. **Spectral Regularization:**
   - Prevent exploding activations
   - Stabilize training at high resolution

4. **Mixed Precision Training:**
   - FP16 for memory efficiency
   - Important for 1024×1024 images

5. **Progressive Training:**
   - Start at low resolution (64×64)
   - Gradually add higher resolution layers

**Loss Function:**
```python
loss = recon_loss + sum(beta_l * kl_loss_l for l in layers) + spectral_reg
```

**Infrastructure:**
- Multi-GPU training (8+ GPUs)
- Gradient checkpointing for memory
- Large batch size (64+)

**Expected Results:**
- FID: 10-20 (worse than StyleGAN but meaningful latent)
- Can encode and reconstruct real images
- Smooth latent space for interpolation

---

## Summary

### Key Takeaways

1. **VAE = Autoencoder + Probabilistic Latent Space**
   - Encode to distribution, not point
   - Sample using reparameterization trick

2. **Loss = Reconstruction + KL Divergence**
   - Reconstruction: quality of output
   - KL: smoothness of latent space

3. **Reparameterization Trick enables backprop**
   - z = μ + σε moves randomness outside gradient path

4. **β-VAE increases disentanglement**
   - Higher β = more independent latent dimensions
   - Trade-off with reconstruction quality

5. **VAE vs GAN trade-offs**
   - VAE: stable, encoder, blurry
   - GAN: unstable, no encoder, sharp

6. **VQ-VAE uses discrete codes**
   - No KL collapse
   - Enables autoregressive modeling

### Quick Reference

| Concept | Formula/Description |
|---------|---------------------|
| Encoder Output | q(z\|x) = N(μ_φ(x), σ²_φ(x)) |
| Reparameterization | z = μ + σ ⊙ ε, ε ~ N(0, I) |
| ELBO | E[log p(x\|z)] - KL(q(z\|x) \|\| p(z)) |
| KL (Gaussian) | -0.5 Σ(1 + log σ² - μ² - σ²) |
| β-VAE | Recon + β · KL (β > 1) |
| Generation | z ~ N(0, I) → Decoder → x |

---

**Next Up**: `04-Diffusion-Models-Fundamentals.md` - Understanding denoising diffusion probabilistic models, the forward/reverse process, and the mathematics behind modern image generation.

Type `CONTINUE` to proceed.
