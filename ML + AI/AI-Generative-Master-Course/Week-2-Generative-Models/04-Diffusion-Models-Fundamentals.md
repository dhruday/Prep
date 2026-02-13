# 04 - Diffusion Models Fundamentals

---

## Table of Contents

1. [Beginner Explanation](#beginner-explanation)
2. [Deep Technical Breakdown](#deep-technical-breakdown)
   - [The Core Idea](#the-core-idea)
   - [Forward Process (Adding Noise)](#forward-process-adding-noise)
   - [Reverse Process (Removing Noise)](#reverse-process-removing-noise)
   - [Training Objective](#training-objective)
   - [Noise Schedule](#noise-schedule)
   - [Sampling Algorithms](#sampling-algorithms)
3. [Mathematical Framework](#mathematical-framework)
   - [DDPM Mathematics](#ddpm-mathematics)
   - [Score Matching Connection](#score-matching-connection)
   - [DDIM (Deterministic Sampling)](#ddim-deterministic-sampling)
4. [Key Formulas](#key-formulas)
5. [Visual Mental Models](#visual-mental-models)
6. [Diffusion vs GANs vs VAEs](#diffusion-vs-gans-vs-vaes)
7. [Complete Implementation](#complete-implementation)
8. [Mini Project: MNIST Diffusion](#mini-project-mnist-diffusion)
9. [Homework](#homework)
10. [Common Mistakes](#common-mistakes)
11. [Interview Questions & Answers](#interview-questions--answers)

---

## Beginner Explanation

### The Restoration Artist Analogy

Imagine you're a **restoration artist** who specializes in fixing damaged paintings:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    THE DIFFUSION STORY                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   FORWARD PROCESS: Gradually damage a painting                      │
│                                                                      │
│   Original    Add dust    Add more    Even more    Pure noise       │
│   ┌─────┐     ┌─────┐     ┌─────┐     ┌─────┐     ┌─────┐          │
│   │ 🎨  │ ──▶ │ 🎨░ │ ──▶ │ ░▓░ │ ──▶ │ ▒▓▒ │ ──▶ │ ▓▒▓ │          │
│   │Mona │     │     │     │     │     │     │     │noise│          │
│   │Lisa │     │dusty│     │fuzzy│     │messy│     │     │          │
│   └─────┘     └─────┘     └─────┘     └─────┘     └─────┘          │
│   t=0         t=250       t=500       t=750       t=1000           │
│                                                                      │
│   We KNOW how to add noise (easy math)                              │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   REVERSE PROCESS: Restore the painting step by step                │
│                                                                      │
│   Pure noise   Remove      Remove      Remove      Original!        │
│   ┌─────┐      noise       noise       noise       ┌─────┐          │
│   │ ▓▒▓ │ ──▶ ┌─────┐ ──▶ ┌─────┐ ──▶ ┌─────┐ ──▶ │ 🎨  │          │
│   │noise│     │ ▒▓▒ │     │ ░▓░ │     │ 🎨░ │     │Mona │          │
│   │     │     │     │     │     │     │     │     │Lisa │          │
│   └─────┘     └─────┘     └─────┘     └─────┘     └─────┘          │
│   t=1000      t=750       t=500       t=250       t=0              │
│                                                                      │
│   We LEARN how to remove noise (neural network)                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Key Insight

```
┌─────────────────────────────────────────────────────────────────────┐
│                   WHY DIFFUSION WORKS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TRAINING:                                                          │
│   ┌────────────────────────────────────────────────────────┐        │
│   │                                                        │        │
│   │   1. Take a clean image x₀                            │        │
│   │   2. Add known noise ε to get noisy xₜ                │        │
│   │   3. Train network to predict ε from xₜ               │        │
│   │                                                        │        │
│   │   Network learns: "What noise was added?"             │        │
│   │                                                        │        │
│   └────────────────────────────────────────────────────────┘        │
│                                                                      │
│   GENERATION:                                                        │
│   ┌────────────────────────────────────────────────────────┐        │
│   │                                                        │        │
│   │   1. Start with pure noise x_T                        │        │
│   │   2. Predict noise ε at each step                     │        │
│   │   3. Subtract predicted noise: x_{t-1} = xₜ - ε       │        │
│   │   4. Repeat until t=0                                 │        │
│   │                                                        │        │
│   │   Result: Clean image!                                 │        │
│   │                                                        │        │
│   └────────────────────────────────────────────────────────┘        │
│                                                                      │
│   🎯 Simple idea: If you know what noise was added,                 │
│      you can remove it!                                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Is This Better Than GANs/VAEs?

```
┌─────────────────────────────────────────────────────────────────────┐
│              DIFFUSION ADVANTAGES                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   vs GAN:                                                            │
│   ✓ No adversarial training (stable!)                               │
│   ✓ No mode collapse                                                 │
│   ✓ Better mode coverage                                            │
│   ✗ Slower generation (many steps)                                  │
│                                                                      │
│   vs VAE:                                                            │
│   ✓ No blurry outputs                                               │
│   ✓ Higher quality samples                                          │
│   ✓ Better likelihood estimation                                    │
│   ✗ Slower generation                                               │
│                                                                      │
│   The trade-off: Quality vs Speed                                   │
│   Diffusion wins on quality, loses on speed                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deep Technical Breakdown

### The Core Idea

Diffusion models work by:
1. **Forward process**: Gradually add Gaussian noise to data over T steps
2. **Reverse process**: Learn to reverse this, recovering data from noise

```
┌─────────────────────────────────────────────────────────────────────┐
│                DIFFUSION MODEL OVERVIEW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   DATA DISTRIBUTION                 NOISE DISTRIBUTION              │
│        p_data(x)                         N(0, I)                    │
│                                                                      │
│           ▄▄▄▄▄▄                           ▄▄▄▄                     │
│         ▄████████▄                       ▄██████▄                   │
│        ████████████                     ██████████                  │
│       ██████████████                   ████████████                 │
│        ████████████                     ██████████                  │
│         ▀████████▀                       ▀██████▀                   │
│           ▀▀▀▀▀▀                           ▀▀▀▀                     │
│              │                               │                      │
│              │    FORWARD PROCESS            │                      │
│              │    q(x_t | x_{t-1})           │                      │
│              │──────────────────────────────▶│                      │
│              │                               │                      │
│              │    REVERSE PROCESS            │                      │
│              │    p_θ(x_{t-1} | x_t)         │                      │
│              │◀──────────────────────────────│                      │
│              │                               │                      │
│           x_0                              x_T                      │
│        (clean)                           (noise)                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Forward Process (Adding Noise)

The forward process is a **Markov chain** that gradually adds Gaussian noise:

$$q(x_t | x_{t-1}) = \mathcal{N}(x_t; \sqrt{1-\beta_t} x_{t-1}, \beta_t \mathbf{I})$$

Where:
- $\beta_t$ is the noise schedule (small values, e.g., 0.0001 to 0.02)
- At each step, we slightly shrink the image and add noise

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FORWARD PROCESS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Single step: q(x_t | x_{t-1})                                     │
│                                                                      │
│   x_t = √(1-β_t) · x_{t-1} + √β_t · ε                               │
│              ↑                    ↑                                  │
│         Shrink slightly     Add noise                               │
│                                                                      │
│   ┌─────────┐     ┌─────────────────────┐     ┌─────────┐          │
│   │ x_{t-1} │ ──▶ │ √(1-β) · x + √β · ε │ ──▶ │   x_t   │          │
│   │         │     │                     │     │         │          │
│   └─────────┘     └─────────────────────┘     └─────────┘          │
│                                                                      │
│   As t → T:                                                          │
│   - Image gets smaller and smaller (√(1-β) < 1)                     │
│   - Noise accumulates                                                │
│   - Eventually x_T ≈ N(0, I)                                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   KEY PROPERTY: Can jump directly to any timestep!                  │
│                                                                      │
│   Define: α_t = 1 - β_t                                             │
│           ᾱ_t = ∏_{s=1}^{t} α_s  (cumulative product)               │
│                                                                      │
│   Then: q(x_t | x_0) = N(x_t; √ᾱ_t · x_0, (1-ᾱ_t) · I)             │
│                                                                      │
│   x_t = √ᾱ_t · x_0 + √(1-ᾱ_t) · ε                                  │
│                                                                      │
│   This is CRUCIAL for efficient training!                           │
│   No need to iterate through all steps                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Visualization of cumulative noise:**

```
┌─────────────────────────────────────────────────────────────────────┐
│            NOISE ACCUMULATION (ᾱ_t over time)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ᾱ_t                                                               │
│   1.0 │▄▄▄▄▄                                                        │
│       │     ▀▀▄▄                                                    │
│   0.8 │         ▀▀▄▄                                                │
│       │             ▀▀▄▄                                            │
│   0.6 │                 ▀▀▄                                         │
│       │                    ▀▀▄                                      │
│   0.4 │                       ▀▀▄                                   │
│       │                          ▀▀▄                                │
│   0.2 │                             ▀▀▄▄                            │
│       │                                 ▀▀▄▄▄▄                      │
│   0.0 │───────────────────────────────────────▀▀▀▀▀▀▀──────        │
│       └─────────────────────────────────────────────────────▶       │
│       0                  500                  1000      t           │
│                                                                      │
│   At t=0:   ᾱ_t ≈ 1.0  (mostly signal)                             │
│   At t=500: ᾱ_t ≈ 0.3  (mix of signal and noise)                   │
│   At t=1000: ᾱ_t ≈ 0.0 (pure noise)                                │
│                                                                      │
│   Image contribution: √ᾱ_t · x_0                                    │
│   Noise contribution: √(1-ᾱ_t) · ε                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Reverse Process (Removing Noise)

The reverse process learns to denoise:

$$p_\theta(x_{t-1} | x_t) = \mathcal{N}(x_{t-1}; \mu_\theta(x_t, t), \Sigma_\theta(x_t, t))$$

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REVERSE PROCESS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Goal: Learn p_θ(x_{t-1} | x_t) to reverse q(x_t | x_{t-1})       │
│                                                                      │
│   The network predicts:                                              │
│   - μ_θ(x_t, t): mean of the denoised image                        │
│   - Σ_θ(x_t, t): variance (often fixed)                            │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                                                         │       │
│   │        ┌─────────────────────┐                          │       │
│   │   x_t ─┤                     │                          │       │
│   │        │   Neural Network    ├──▶ ε_θ(x_t, t)          │       │
│   │   t ───┤   (e.g., U-Net)     │    (predicted noise)     │       │
│   │        │                     │                          │       │
│   │        └─────────────────────┘                          │       │
│   │                                                         │       │
│   │   Then: μ_θ = 1/√α_t · (x_t - β_t/√(1-ᾱ_t) · ε_θ)     │       │
│   │                                                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│   Sampling step:                                                     │
│                                                                      │
│   x_{t-1} = μ_θ(x_t, t) + σ_t · z,  where z ~ N(0, I)              │
│                                                                      │
│   Iterate from t=T to t=0 to generate image                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Training Objective

The training objective is surprisingly simple:

$$\mathcal{L} = \mathbb{E}_{t, x_0, \epsilon} \left[ \| \epsilon - \epsilon_\theta(x_t, t) \|^2 \right]$$

**"Predict the noise that was added"**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRAINING ALGORITHM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   For each training step:                                            │
│                                                                      │
│   1. Sample x_0 from training data                                  │
│   2. Sample t uniformly from {1, 2, ..., T}                         │
│   3. Sample ε ~ N(0, I)                                             │
│   4. Compute x_t = √ᾱ_t · x_0 + √(1-ᾱ_t) · ε                       │
│   5. Predict ε̂ = ε_θ(x_t, t)                                       │
│   6. Compute loss = ||ε - ε̂||²                                     │
│   7. Update θ via gradient descent                                  │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                                                         │       │
│   │   x_0 ──┬──▶ √ᾱ_t · x_0 ─────┐                         │       │
│   │         │                     │                         │       │
│   │   ε ────┼──▶ √(1-ᾱ_t) · ε ───┼──▶ x_t ──▶ ε_θ(x_t,t)  │       │
│   │         │                     │              │          │       │
│   │   t ────┴─────────────────────┘              │          │       │
│   │                                              ▼          │       │
│   │   ε ─────────────────────────────────────▶ LOSS        │       │
│   │                                        ||ε - ε̂||²      │       │
│   │                                                         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
│   Simple! Just MSE between true and predicted noise                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Noise Schedule

The noise schedule $\{\beta_t\}_{t=1}^T$ controls how fast we add noise:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NOISE SCHEDULES                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   LINEAR SCHEDULE (Original DDPM):                                   │
│                                                                      │
│   β_t                                                               │
│       │                          ▄▄▄▄▄▄▄▄▄                          │
│       │                    ▄▄▄▄▄▀                                   │
│       │              ▄▄▄▄▀▀                                         │
│       │        ▄▄▄▄▀▀                                               │
│       │  ▄▄▄▄▀▀                                                     │
│       └──────────────────────────────────────────▶ t                │
│       β_1 = 0.0001                     β_T = 0.02                   │
│                                                                      │
│   β_t = β_1 + (t-1)/(T-1) · (β_T - β_1)                            │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   COSINE SCHEDULE (Improved):                                        │
│                                                                      │
│   ᾱ_t                                                               │
│   1.0 │▄▄▄▄▄▄▄▄▄                                                    │
│       │         ▀▀▄▄▄                                               │
│       │              ▀▀▄▄                                           │
│       │                  ▀▀▄▄                                       │
│       │                      ▀▀▄▄▄                                  │
│   0.0 │───────────────────────────▀▀▀▀▀▀──────────                  │
│       └──────────────────────────────────────────▶ t                │
│                                                                      │
│   ᾱ_t = cos²(π/2 · (t/T + s)/(1 + s))                              │
│                                                                      │
│   Better for high-resolution images                                 │
│   Preserves more signal in early steps                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Sampling Algorithms

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DDPM SAMPLING                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Algorithm: DDPM Sampling                                           │
│   ─────────────────────────                                         │
│   Input: Trained model ε_θ, noise schedule {β_t, α_t, ᾱ_t}         │
│   Output: Generated sample x_0                                       │
│                                                                      │
│   1. x_T ~ N(0, I)                                                  │
│   2. for t = T, T-1, ..., 1:                                        │
│   3.    z ~ N(0, I) if t > 1 else z = 0                            │
│   4.    ε̂ = ε_θ(x_t, t)                                            │
│   5.    x_{t-1} = 1/√α_t · (x_t - β_t/√(1-ᾱ_t) · ε̂) + σ_t · z     │
│   6. return x_0                                                      │
│                                                                      │
│   Where σ_t = √β_t  (or √((1-ᾱ_{t-1})/(1-ᾱ_t) · β_t))             │
│                                                                      │
│   ⚠️ Requires T steps (e.g., 1000) - SLOW!                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mathematical Framework

### DDPM Mathematics

**Forward Process (Formal):**

The joint distribution of all latents:
$$q(x_{1:T}|x_0) = \prod_{t=1}^{T} q(x_t|x_{t-1})$$

Where:
$$q(x_t|x_{t-1}) = \mathcal{N}(x_t; \sqrt{1-\beta_t}x_{t-1}, \beta_t\mathbf{I})$$

**Closed-form marginal:**
$$q(x_t|x_0) = \mathcal{N}(x_t; \sqrt{\bar{\alpha}_t}x_0, (1-\bar{\alpha}_t)\mathbf{I})$$

**Posterior (for training):**
$$q(x_{t-1}|x_t, x_0) = \mathcal{N}(x_{t-1}; \tilde{\mu}_t(x_t, x_0), \tilde{\beta}_t\mathbf{I})$$

Where:
$$\tilde{\mu}_t = \frac{\sqrt{\bar{\alpha}_{t-1}}\beta_t}{1-\bar{\alpha}_t}x_0 + \frac{\sqrt{\alpha_t}(1-\bar{\alpha}_{t-1})}{1-\bar{\alpha}_t}x_t$$

$$\tilde{\beta}_t = \frac{1-\bar{\alpha}_{t-1}}{1-\bar{\alpha}_t}\beta_t$$

### Score Matching Connection

```
┌─────────────────────────────────────────────────────────────────────┐
│                SCORE-BASED INTERPRETATION                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   SCORE FUNCTION: ∇_x log p(x)                                      │
│                                                                      │
│   "Direction pointing toward higher probability regions"            │
│                                                                      │
│         Low prob                High prob                           │
│            ↓                       ↓                                │
│         ┌─────┐                 ▄▄▄▄▄▄                             │
│         │     │               ▄████████▄                           │
│         │  →  │  ───────────▶████████████                          │
│         │     │              ▀████████▀                            │
│         └─────┘                ▀▀▀▀▀▀                              │
│                                                                      │
│   Score at x = gradient of log density at x                        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   CONNECTION TO DIFFUSION:                                           │
│                                                                      │
│   At noise level t, the score is:                                   │
│                                                                      │
│   ∇_{x_t} log q(x_t) = -ε / √(1-ᾱ_t)                               │
│                                                                      │
│   So predicting noise ε is equivalent to predicting the score!     │
│                                                                      │
│   ε_θ(x_t, t) ≈ -√(1-ᾱ_t) · ∇_{x_t} log q(x_t)                    │
│                                                                      │
│   This is called "Score Matching"                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### DDIM (Deterministic Sampling)

DDIM allows **faster sampling** by skipping steps:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DDIM SAMPLING                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   KEY INSIGHT: Sampling can be deterministic!                       │
│                                                                      │
│   DDPM: x_{t-1} = μ_θ(x_t) + σ_t · z      (stochastic)            │
│   DDIM: x_{t-1} = μ_θ(x_t) + σ_t · 0      (deterministic, η=0)    │
│                                                                      │
│   DDIM formula:                                                      │
│                                                                      │
│   x_{t-1} = √ᾱ_{t-1} · (x_t - √(1-ᾱ_t)·ε_θ)/√ᾱ_t                  │
│           + √(1-ᾱ_{t-1}-σ_t²) · ε_θ                                │
│           + σ_t · z                                                 │
│                                                                      │
│   Where σ_t = η · √((1-ᾱ_{t-1})/(1-ᾱ_t)) · √(1-ᾱ_t/ᾱ_{t-1})       │
│                                                                      │
│   η = 0: Fully deterministic (same x_T → same x_0)                 │
│   η = 1: Equivalent to DDPM                                         │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   SPEED-UP: Skip timesteps!                                          │
│                                                                      │
│   DDPM (1000 steps):                                                │
│   t: 1000 → 999 → 998 → ... → 2 → 1 → 0                            │
│                                                                      │
│   DDIM (50 steps):                                                  │
│   t: 1000 → 980 → 960 → ... → 40 → 20 → 0                          │
│                                                                      │
│   20x faster! Same quality (almost)                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Formulas

### Core DDPM Formulas

| Formula | Description |
|---------|-------------|
| $q(x_t\|x_{t-1}) = \mathcal{N}(\sqrt{1-\beta_t}x_{t-1}, \beta_t\mathbf{I})$ | Forward step |
| $q(x_t\|x_0) = \mathcal{N}(\sqrt{\bar{\alpha}_t}x_0, (1-\bar{\alpha}_t)\mathbf{I})$ | Forward closed-form |
| $x_t = \sqrt{\bar{\alpha}_t}x_0 + \sqrt{1-\bar{\alpha}_t}\epsilon$ | Noise sampling |
| $\mathcal{L} = \mathbb{E}[\|\|\epsilon - \epsilon_\theta(x_t, t)\|\|^2]$ | Training loss |

### Notation Reference

| Symbol | Definition |
|--------|------------|
| $\beta_t$ | Noise variance at step t |
| $\alpha_t$ | $1 - \beta_t$ |
| $\bar{\alpha}_t$ | $\prod_{s=1}^{t} \alpha_s$ (cumulative) |
| $\epsilon$ | Standard Gaussian noise |
| $\epsilon_\theta$ | Neural network predicting noise |
| $T$ | Total number of timesteps (e.g., 1000) |

### Sampling Formulas

| Algorithm | Formula |
|-----------|---------|
| DDPM | $x_{t-1} = \frac{1}{\sqrt{\alpha_t}}(x_t - \frac{\beta_t}{\sqrt{1-\bar{\alpha}_t}}\epsilon_\theta) + \sigma_t z$ |
| DDIM | $x_{t-1} = \sqrt{\bar{\alpha}_{t-1}}\hat{x}_0 + \sqrt{1-\bar{\alpha}_{t-1}-\sigma_t^2}\epsilon_\theta + \sigma_t z$ |
| Predicted $x_0$ | $\hat{x}_0 = \frac{x_t - \sqrt{1-\bar{\alpha}_t}\epsilon_\theta}{\sqrt{\bar{\alpha}_t}}$ |

---

## Visual Mental Models

### The Diffusion Process Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FORWARD + REVERSE PROCESS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   FORWARD (Training data preparation):                               │
│                                                                      │
│   t=0        t=250       t=500       t=750       t=1000             │
│   ┌────┐     ┌────┐      ┌────┐      ┌────┐      ┌────┐            │
│   │ 🎨 │ ──▶ │░░░░│ ──▶  │▒▒▒▒│ ──▶  │▓▓▓▓│ ──▶  │████│            │
│   │    │     │░░░░│      │▒▒▒▒│      │▓▓▓▓│      │████│            │
│   └────┘     └────┘      └────┘      └────┘      └────┘            │
│   Clean      10% noise   50% noise   80% noise   Pure noise        │
│                                                                      │
│   Signal:  100%      90%        50%        20%         0%          │
│   Noise:     0%      10%        50%        80%       100%          │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   REVERSE (Generation):                                              │
│                                                                      │
│   t=1000     t=750       t=500       t=250       t=0                │
│   ┌────┐     ┌────┐      ┌────┐      ┌────┐      ┌────┐            │
│   │████│ ──▶ │▓▓▓▓│ ──▶  │▒▒▒▒│ ──▶  │░░░░│ ──▶  │ 🎨 │            │
│   │████│     │▓▓▓▓│      │▒▒▒▒│      │░░░░│      │    │            │
│   └────┘     └────┘      └────┘      └────┘      └────┘            │
│   Random     Vague       Clearer    Almost      Clean              │
│   noise      shape       details    done        image!             │
│                                                                      │
│   Each step: x_{t-1} = f(x_t, ε_θ(x_t, t))                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Network Architecture (U-Net)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    U-NET ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Input: x_t (noisy image) + t (timestep embedding)                 │
│                                                                      │
│              ┌─────────────────────────────────┐                    │
│              │                                 │                    │
│   x_t ──────▶│          ┌───────┐             │──────▶ ε_θ         │
│              │   ┌──────┤ bottle├──────┐      │      (predicted    │
│   t_emb ────▶│   │      │  neck │      │      │       noise)       │
│              │   │      └───────┘      │      │                    │
│              │   │                     │      │                    │
│              │ ┌─┴─┐               ┌─┴─┐     │                    │
│              │ │   │               │   │      │                    │
│              │ │ E │               │ D │      │                    │
│              │ │ N │   Skip        │ E │      │                    │
│              │ │ C │   Connections │ C │      │                    │
│              │ │ O │ ─────────────▶│ O │      │                    │
│              │ │ D │               │ D │      │                    │
│              │ │ E │               │ E │      │                    │
│              │ │ R │               │ R │      │                    │
│              │ │   │               │   │      │                    │
│              │ └─┬─┘               └─┬─┘     │                    │
│              │   │                   │        │                    │
│              │   └───────────────────┘        │                    │
│              │        Downsampling            │                    │
│              │        then Upsampling         │                    │
│              │                                 │                    │
│              └─────────────────────────────────┘                    │
│                                                                      │
│   Key components:                                                    │
│   - Residual blocks with GroupNorm                                  │
│   - Self-attention at low resolutions                               │
│   - Time embedding added to each block                              │
│   - Skip connections for preserving details                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Time Embedding

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TIME EMBEDDING                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Why? The network needs to know "how noisy" the input is           │
│                                                                      │
│   Sinusoidal embedding (like Transformers):                         │
│                                                                      │
│   t = 500                                                           │
│      │                                                               │
│      ▼                                                               │
│   ┌──────────────────────────────────────┐                          │
│   │ sin(t/10000^(0/d)), cos(t/10000^(0/d)),                        │
│   │ sin(t/10000^(2/d)), cos(t/10000^(2/d)),                        │
│   │ ...                                                             │
│   │ sin(t/10000^((d-2)/d)), cos(t/10000^((d-2)/d))                 │
│   └──────────────────────────────────────┘                          │
│      │                                                               │
│      ▼                                                               │
│   [0.84, -0.54, 0.99, 0.12, ..., -0.23, 0.97]                      │
│   (d-dimensional embedding)                                         │
│                                                                      │
│   Then: MLP → add to each residual block                            │
│                                                                      │
│   Different t → different behavior                                  │
│   t=1000: "remove a lot of noise"                                   │
│   t=1:    "just clean up tiny details"                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Diffusion vs GANs vs VAEs

```
┌─────────────────────────────────────────────────────────────────────┐
│                 COMPARISON TABLE                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Aspect          Diffusion       GAN            VAE                │
│   ─────────────────────────────────────────────────────────────     │
│   Training        Very stable     Unstable       Stable             │
│   Sample quality  Excellent       Excellent      Blurry             │
│   Mode coverage   Excellent       Poor           Good               │
│   Speed (train)   Slow            Fast           Fast               │
│   Speed (sample)  Very slow       Very fast      Fast               │
│   Likelihood      Tractable       None           ELBO               │
│   Architecture    U-Net           G+D            Encoder+Decoder    │
│   Control         Easy (guidance) Hard           Latent space       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   VISUAL COMPARISON:                                                 │
│                                                                      │
│   Sample Quality:    Diffusion ████████████ 10/10                   │
│                      GAN       █████████░░░ 9/10                    │
│                      VAE       ██████░░░░░░ 6/10                    │
│                                                                      │
│   Training Ease:     Diffusion ████████████ 10/10                   │
│                      GAN       ████░░░░░░░░ 4/10                    │
│                      VAE       █████████░░░ 9/10                    │
│                                                                      │
│   Sampling Speed:    Diffusion ██░░░░░░░░░░ 2/10                    │
│                      GAN       ████████████ 10/10                   │
│                      VAE       █████████░░░ 9/10                    │
│                                                                      │
│   Mode Coverage:     Diffusion ████████████ 10/10                   │
│                      GAN       █████░░░░░░░ 5/10                    │
│                      VAE       ████████░░░░ 8/10                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete Implementation

### Basic DDPM (PyTorch)

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import matplotlib.pyplot as plt
from tqdm import tqdm


# ============ Noise Schedule ============

class NoiseSchedule:
    """
    Defines the noise schedule for diffusion
    """
    
    def __init__(self, T=1000, beta_start=1e-4, beta_end=0.02, schedule='linear'):
        self.T = T
        self.beta_start = beta_start
        self.beta_end = beta_end
        
        if schedule == 'linear':
            self.betas = torch.linspace(beta_start, beta_end, T)
        elif schedule == 'cosine':
            self.betas = self._cosine_schedule(T)
        else:
            raise ValueError(f"Unknown schedule: {schedule}")
        
        # Pre-compute useful quantities
        self.alphas = 1 - self.betas
        self.alpha_bars = torch.cumprod(self.alphas, dim=0)
        self.alpha_bars_prev = F.pad(self.alpha_bars[:-1], (1, 0), value=1.0)
        
        # For sampling
        self.sqrt_alpha_bars = torch.sqrt(self.alpha_bars)
        self.sqrt_one_minus_alpha_bars = torch.sqrt(1 - self.alpha_bars)
        
        # For reverse process
        self.sqrt_recip_alphas = torch.sqrt(1.0 / self.alphas)
        
        # Posterior variance
        self.posterior_variance = self.betas * (1 - self.alpha_bars_prev) / (1 - self.alpha_bars)
    
    def _cosine_schedule(self, T, s=0.008):
        """Cosine schedule as proposed in improved DDPM"""
        steps = T + 1
        x = torch.linspace(0, T, steps)
        alphas_cumprod = torch.cos(((x / T) + s) / (1 + s) * np.pi * 0.5) ** 2
        alphas_cumprod = alphas_cumprod / alphas_cumprod[0]
        betas = 1 - (alphas_cumprod[1:] / alphas_cumprod[:-1])
        return torch.clip(betas, 0.0001, 0.9999)
    
    def get_index(self, vals, t, x_shape):
        """Get values at timestep t with proper broadcasting"""
        batch_size = t.shape[0]
        out = vals.gather(-1, t)
        return out.reshape(batch_size, *((1,) * (len(x_shape) - 1)))


# ============ Time Embedding ============

class SinusoidalPositionEmbeddings(nn.Module):
    """Sinusoidal time embeddings"""
    
    def __init__(self, dim):
        super().__init__()
        self.dim = dim
    
    def forward(self, time):
        device = time.device
        half_dim = self.dim // 2
        embeddings = np.log(10000) / (half_dim - 1)
        embeddings = torch.exp(torch.arange(half_dim, device=device) * -embeddings)
        embeddings = time[:, None] * embeddings[None, :]
        embeddings = torch.cat((embeddings.sin(), embeddings.cos()), dim=-1)
        return embeddings


# ============ Building Blocks ============

class Block(nn.Module):
    """Basic convolutional block with GroupNorm"""
    
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
        # First conv
        h = self.norm1(F.relu(self.conv1(x)))
        
        # Time embedding
        time_emb = F.relu(self.time_mlp(t))
        h = h + time_emb[..., None, None]
        
        # Second conv
        h = self.norm2(F.relu(self.conv2(h)))
        
        # Transform (up or down)
        return self.transform(h)


class SelfAttention(nn.Module):
    """Self-attention for spatial features"""
    
    def __init__(self, channels):
        super().__init__()
        self.channels = channels
        self.mha = nn.MultiheadAttention(channels, 4, batch_first=True)
        self.ln = nn.LayerNorm([channels])
        self.ff = nn.Sequential(
            nn.LayerNorm([channels]),
            nn.Linear(channels, channels),
            nn.GELU(),
            nn.Linear(channels, channels)
        )
    
    def forward(self, x):
        size = x.shape[-1]
        x = x.view(-1, self.channels, size * size).swapaxes(1, 2)
        x_ln = self.ln(x)
        attention_value, _ = self.mha(x_ln, x_ln, x_ln)
        attention_value = attention_value + x
        attention_value = self.ff(attention_value) + attention_value
        return attention_value.swapaxes(2, 1).view(-1, self.channels, size, size)


# ============ U-Net Model ============

class SimpleUNet(nn.Module):
    """
    Simplified U-Net for diffusion models
    """
    
    def __init__(self, in_channels=1, out_channels=1, time_emb_dim=256):
        super().__init__()
        
        # Time embedding
        self.time_mlp = nn.Sequential(
            SinusoidalPositionEmbeddings(time_emb_dim),
            nn.Linear(time_emb_dim, time_emb_dim),
            nn.ReLU()
        )
        
        # Initial conv
        self.conv0 = nn.Conv2d(in_channels, 64, 3, padding=1)
        
        # Encoder (downsampling)
        self.down1 = Block(64, 128, time_emb_dim)
        self.down2 = Block(128, 256, time_emb_dim)
        self.down3 = Block(256, 256, time_emb_dim)
        
        # Attention at bottleneck
        self.sa = SelfAttention(256)
        
        # Decoder (upsampling)
        self.up1 = Block(256, 128, time_emb_dim, up=True)
        self.up2 = Block(128, 64, time_emb_dim, up=True)
        self.up3 = Block(64, 64, time_emb_dim, up=True)
        
        # Output
        self.output = nn.Conv2d(64, out_channels, 1)
    
    def forward(self, x, t):
        # Time embedding
        t = self.time_mlp(t)
        
        # Initial conv
        x = self.conv0(x)
        
        # Encoder
        x1 = self.down1(x, t)    # 64 -> 128
        x2 = self.down2(x1, t)   # 128 -> 256
        x3 = self.down3(x2, t)   # 256 -> 256
        
        # Attention
        x3 = self.sa(x3)
        
        # Decoder with skip connections
        x = self.up1(torch.cat([x3, x3], dim=1), t)  # 256 -> 128
        x = self.up2(torch.cat([x, x1], dim=1), t)   # 128 -> 64
        x = self.up3(torch.cat([x, x], dim=1), t)    # 64 -> 64
        
        return self.output(x)


# ============ Full U-Net (More Complete) ============

class FullUNet(nn.Module):
    """More complete U-Net implementation"""
    
    def __init__(self, in_channels=1, model_channels=64, out_channels=1, 
                 num_res_blocks=2, attention_resolutions=(8, 4), 
                 channel_mult=(1, 2, 4, 8), time_emb_dim=256):
        super().__init__()
        
        self.in_channels = in_channels
        self.model_channels = model_channels
        
        # Time embedding
        self.time_embed = nn.Sequential(
            SinusoidalPositionEmbeddings(model_channels),
            nn.Linear(model_channels, time_emb_dim),
            nn.SiLU(),
            nn.Linear(time_emb_dim, time_emb_dim)
        )
        
        # Input
        self.input_blocks = nn.ModuleList([
            nn.Conv2d(in_channels, model_channels, 3, padding=1)
        ])
        
        # Encoder
        input_block_chans = [model_channels]
        ch = model_channels
        ds = 1
        
        for level, mult in enumerate(channel_mult):
            for _ in range(num_res_blocks):
                layers = [ResBlock(ch, mult * model_channels, time_emb_dim)]
                ch = mult * model_channels
                self.input_blocks.append(nn.Sequential(*layers))
                input_block_chans.append(ch)
            
            if level != len(channel_mult) - 1:
                self.input_blocks.append(Downsample(ch))
                input_block_chans.append(ch)
                ds *= 2
        
        # Middle
        self.middle_block = nn.Sequential(
            ResBlock(ch, ch, time_emb_dim),
            ResBlock(ch, ch, time_emb_dim)
        )
        
        # Decoder
        self.output_blocks = nn.ModuleList([])
        
        for level, mult in list(enumerate(channel_mult))[::-1]:
            for i in range(num_res_blocks + 1):
                ich = input_block_chans.pop()
                layers = [ResBlock(ch + ich, model_channels * mult, time_emb_dim)]
                ch = model_channels * mult
                
                if level and i == num_res_blocks:
                    layers.append(Upsample(ch))
                
                self.output_blocks.append(nn.Sequential(*layers))
        
        # Output
        self.out = nn.Sequential(
            nn.GroupNorm(32, ch),
            nn.SiLU(),
            nn.Conv2d(ch, out_channels, 3, padding=1)
        )
    
    def forward(self, x, t):
        emb = self.time_embed(t)
        
        hs = []
        h = x
        for module in self.input_blocks:
            if isinstance(module, ResBlock):
                h = module(h, emb)
            else:
                h = module(h)
            hs.append(h)
        
        h = self.middle_block[0](h, emb)
        h = self.middle_block[1](h, emb)
        
        for module in self.output_blocks:
            h = torch.cat([h, hs.pop()], dim=1)
            for layer in module:
                if isinstance(layer, ResBlock):
                    h = layer(h, emb)
                else:
                    h = layer(h)
        
        return self.out(h)


class ResBlock(nn.Module):
    """Residual block with time embedding"""
    
    def __init__(self, in_ch, out_ch, time_emb_dim):
        super().__init__()
        
        self.norm1 = nn.GroupNorm(32, in_ch)
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, padding=1)
        self.time_emb = nn.Linear(time_emb_dim, out_ch)
        self.norm2 = nn.GroupNorm(32, out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1)
        
        if in_ch != out_ch:
            self.skip = nn.Conv2d(in_ch, out_ch, 1)
        else:
            self.skip = nn.Identity()
    
    def forward(self, x, emb):
        h = F.silu(self.norm1(x))
        h = self.conv1(h)
        h = h + self.time_emb(F.silu(emb))[:, :, None, None]
        h = F.silu(self.norm2(h))
        h = self.conv2(h)
        return h + self.skip(x)


class Downsample(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.conv = nn.Conv2d(ch, ch, 3, stride=2, padding=1)
    
    def forward(self, x):
        return self.conv(x)


class Upsample(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.conv = nn.Conv2d(ch, ch, 3, padding=1)
    
    def forward(self, x):
        x = F.interpolate(x, scale_factor=2, mode='nearest')
        return self.conv(x)


# ============ DDPM Trainer ============

class DDPM:
    """
    Denoising Diffusion Probabilistic Model
    """
    
    def __init__(self, model, noise_schedule, device='cpu'):
        self.model = model.to(device)
        self.noise_schedule = noise_schedule
        self.device = device
        
        # Move schedule tensors to device
        for attr in ['betas', 'alphas', 'alpha_bars', 'alpha_bars_prev',
                     'sqrt_alpha_bars', 'sqrt_one_minus_alpha_bars',
                     'sqrt_recip_alphas', 'posterior_variance']:
            setattr(self.noise_schedule, attr, 
                    getattr(self.noise_schedule, attr).to(device))
    
    def get_noisy_image(self, x_0, t):
        """
        Forward process: add noise to image
        x_t = sqrt(alpha_bar_t) * x_0 + sqrt(1 - alpha_bar_t) * epsilon
        """
        noise = torch.randn_like(x_0)
        
        sqrt_alpha_bar = self.noise_schedule.get_index(
            self.noise_schedule.sqrt_alpha_bars, t, x_0.shape
        )
        sqrt_one_minus_alpha_bar = self.noise_schedule.get_index(
            self.noise_schedule.sqrt_one_minus_alpha_bars, t, x_0.shape
        )
        
        x_t = sqrt_alpha_bar * x_0 + sqrt_one_minus_alpha_bar * noise
        
        return x_t, noise
    
    def train_step(self, x_0, optimizer):
        """
        One training step
        """
        batch_size = x_0.shape[0]
        
        # Sample random timesteps
        t = torch.randint(0, self.noise_schedule.T, (batch_size,), device=self.device)
        
        # Get noisy image and noise
        x_t, noise = self.get_noisy_image(x_0, t)
        
        # Predict noise
        noise_pred = self.model(x_t, t)
        
        # Compute loss
        loss = F.mse_loss(noise_pred, noise)
        
        # Backward
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        return loss.item()
    
    @torch.no_grad()
    def sample_step(self, x_t, t):
        """
        One reverse step: p(x_{t-1} | x_t)
        """
        # Predict noise
        noise_pred = self.model(x_t, t)
        
        # Get schedule values
        alpha = self.noise_schedule.get_index(
            self.noise_schedule.alphas, t, x_t.shape
        )
        alpha_bar = self.noise_schedule.get_index(
            self.noise_schedule.alpha_bars, t, x_t.shape
        )
        beta = self.noise_schedule.get_index(
            self.noise_schedule.betas, t, x_t.shape
        )
        
        # Compute mean
        sqrt_recip_alpha = self.noise_schedule.get_index(
            self.noise_schedule.sqrt_recip_alphas, t, x_t.shape
        )
        sqrt_one_minus_alpha_bar = self.noise_schedule.get_index(
            self.noise_schedule.sqrt_one_minus_alpha_bars, t, x_t.shape
        )
        
        mean = sqrt_recip_alpha * (x_t - beta / sqrt_one_minus_alpha_bar * noise_pred)
        
        # Add noise (except for t=0)
        if t[0] > 0:
            noise = torch.randn_like(x_t)
            posterior_var = self.noise_schedule.get_index(
                self.noise_schedule.posterior_variance, t, x_t.shape
            )
            x_t_minus_1 = mean + torch.sqrt(posterior_var) * noise
        else:
            x_t_minus_1 = mean
        
        return x_t_minus_1
    
    @torch.no_grad()
    def sample(self, batch_size, channels, height, width):
        """
        Generate samples from noise
        """
        self.model.eval()
        
        # Start from pure noise
        x = torch.randn(batch_size, channels, height, width, device=self.device)
        
        # Reverse process
        for t in tqdm(reversed(range(self.noise_schedule.T)), desc='Sampling'):
            t_batch = torch.full((batch_size,), t, device=self.device, dtype=torch.long)
            x = self.sample_step(x, t_batch)
        
        self.model.train()
        return x
    
    @torch.no_grad()
    def sample_ddim(self, batch_size, channels, height, width, steps=50, eta=0.0):
        """
        DDIM sampling (faster, deterministic when eta=0)
        """
        self.model.eval()
        
        # Create step schedule
        step_size = self.noise_schedule.T // steps
        timesteps = list(range(0, self.noise_schedule.T, step_size))[::-1]
        
        # Start from noise
        x = torch.randn(batch_size, channels, height, width, device=self.device)
        
        for i, t in enumerate(tqdm(timesteps, desc='DDIM Sampling')):
            t_batch = torch.full((batch_size,), t, device=self.device, dtype=torch.long)
            
            # Predict noise
            noise_pred = self.model(x, t_batch)
            
            # Get alpha values
            alpha_bar = self.noise_schedule.alpha_bars[t]
            alpha_bar_prev = self.noise_schedule.alpha_bars[timesteps[i+1]] if i < len(timesteps)-1 else torch.tensor(1.0)
            
            # Predict x_0
            sqrt_alpha_bar = torch.sqrt(alpha_bar)
            sqrt_one_minus_alpha_bar = torch.sqrt(1 - alpha_bar)
            x_0_pred = (x - sqrt_one_minus_alpha_bar * noise_pred) / sqrt_alpha_bar
            x_0_pred = torch.clamp(x_0_pred, -1, 1)
            
            # Compute sigma
            sigma = eta * torch.sqrt((1 - alpha_bar_prev) / (1 - alpha_bar)) * torch.sqrt(1 - alpha_bar / alpha_bar_prev)
            
            # Direction pointing to x_t
            dir_xt = torch.sqrt(1 - alpha_bar_prev - sigma**2) * noise_pred
            
            # Noise
            noise = torch.randn_like(x) if i < len(timesteps)-1 else 0
            
            # x_{t-1}
            x = torch.sqrt(alpha_bar_prev) * x_0_pred + dir_xt + sigma * noise
        
        self.model.train()
        return x


# ============ Training Loop ============

def train_ddpm(model, dataloader, epochs, lr=2e-4, device='cpu'):
    """
    Train DDPM model
    """
    noise_schedule = NoiseSchedule(T=1000, schedule='linear')
    ddpm = DDPM(model, noise_schedule, device)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    
    losses = []
    
    for epoch in range(epochs):
        epoch_loss = 0
        num_batches = 0
        
        pbar = tqdm(dataloader, desc=f'Epoch {epoch+1}/{epochs}')
        for batch in pbar:
            if isinstance(batch, (list, tuple)):
                x = batch[0]
            else:
                x = batch
            
            x = x.to(device)
            
            # Normalize to [-1, 1]
            x = x * 2 - 1
            
            loss = ddpm.train_step(x, optimizer)
            epoch_loss += loss
            num_batches += 1
            
            pbar.set_postfix({'loss': loss})
        
        avg_loss = epoch_loss / num_batches
        losses.append(avg_loss)
        print(f'Epoch {epoch+1} | Loss: {avg_loss:.4f}')
        
        # Generate samples
        if (epoch + 1) % 5 == 0:
            samples = ddpm.sample(16, 1, 28, 28)
            visualize_samples(samples, f'samples_epoch_{epoch+1}.png')
    
    return ddpm, losses


def visualize_samples(samples, filename=None):
    """Visualize generated samples"""
    samples = (samples + 1) / 2  # [-1,1] -> [0,1]
    samples = samples.cpu().numpy()
    
    n = int(np.sqrt(len(samples)))
    fig, axes = plt.subplots(n, n, figsize=(8, 8))
    
    for i, ax in enumerate(axes.flat):
        if i < len(samples):
            ax.imshow(samples[i, 0], cmap='gray')
        ax.axis('off')
    
    plt.tight_layout()
    if filename:
        plt.savefig(filename)
    plt.show()


# Example usage
if __name__ == "__main__":
    # Simple test
    model = SimpleUNet(in_channels=1, out_channels=1)
    noise_schedule = NoiseSchedule(T=1000)
    
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Test forward pass
    x = torch.randn(4, 1, 28, 28)
    t = torch.randint(0, 1000, (4,))
    out = model(x, t)
    print(f"Input shape: {x.shape}")
    print(f"Output shape: {out.shape}")
```

---

## Mini Project: MNIST Diffusion

```python
"""
Mini Project: MNIST Generation with DDPM
=========================================
Train a diffusion model to generate handwritten digits
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt
import numpy as np
from tqdm import tqdm


# ============ Configuration ============
class Config:
    # Data
    batch_size = 128
    image_size = 28
    channels = 1
    
    # Model
    model_channels = 64
    time_emb_dim = 256
    
    # Diffusion
    T = 1000
    beta_start = 1e-4
    beta_end = 0.02
    
    # Training
    epochs = 20
    lr = 2e-4
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

config = Config()


# ============ Model ============
class MNISTUNet(nn.Module):
    """U-Net optimized for 28x28 images"""
    
    def __init__(self, config):
        super().__init__()
        
        c = config.model_channels
        t_dim = config.time_emb_dim
        
        # Time embedding
        self.time_embed = nn.Sequential(
            nn.Linear(c, t_dim),
            nn.SiLU(),
            nn.Linear(t_dim, t_dim)
        )
        
        # Encoder
        self.conv_in = nn.Conv2d(config.channels, c, 3, padding=1)
        
        self.down1 = self._make_block(c, c*2, t_dim)      # 28 -> 14
        self.down2 = self._make_block(c*2, c*4, t_dim)    # 14 -> 7
        
        # Middle
        self.mid = self._make_block(c*4, c*4, t_dim, downsample=False)
        
        # Decoder
        self.up1 = self._make_up_block(c*4, c*2, t_dim)   # 7 -> 14
        self.up2 = self._make_up_block(c*2, c, t_dim)     # 14 -> 28
        
        self.conv_out = nn.Sequential(
            nn.GroupNorm(8, c),
            nn.SiLU(),
            nn.Conv2d(c, config.channels, 3, padding=1)
        )
    
    def _make_block(self, in_c, out_c, t_dim, downsample=True):
        layers = nn.ModuleDict({
            'norm1': nn.GroupNorm(8, in_c),
            'conv1': nn.Conv2d(in_c, out_c, 3, padding=1),
            'time': nn.Linear(t_dim, out_c),
            'norm2': nn.GroupNorm(8, out_c),
            'conv2': nn.Conv2d(out_c, out_c, 3, padding=1),
            'skip': nn.Conv2d(in_c, out_c, 1) if in_c != out_c else nn.Identity()
        })
        if downsample:
            layers['down'] = nn.Conv2d(out_c, out_c, 4, 2, 1)
        return layers
    
    def _make_up_block(self, in_c, out_c, t_dim):
        return nn.ModuleDict({
            'up': nn.ConvTranspose2d(in_c, in_c, 4, 2, 1),
            'norm1': nn.GroupNorm(8, in_c * 2),  # *2 for skip connection
            'conv1': nn.Conv2d(in_c * 2, out_c, 3, padding=1),
            'time': nn.Linear(t_dim, out_c),
            'norm2': nn.GroupNorm(8, out_c),
            'conv2': nn.Conv2d(out_c, out_c, 3, padding=1),
            'skip': nn.Conv2d(in_c * 2, out_c, 1)
        })
    
    def _sinusoidal_embedding(self, t, dim):
        half_dim = dim // 2
        emb = np.log(10000) / (half_dim - 1)
        emb = torch.exp(torch.arange(half_dim, device=t.device) * -emb)
        emb = t[:, None] * emb[None, :]
        return torch.cat([emb.sin(), emb.cos()], dim=-1)
    
    def _apply_block(self, block, x, t_emb, skip=None):
        if skip is not None:
            x = block['up'](x)
            x = torch.cat([x, skip], dim=1)
        
        h = F.silu(block['norm1'](x))
        h = block['conv1'](h)
        h = h + block['time'](t_emb)[:, :, None, None]
        h = F.silu(block['norm2'](h))
        h = block['conv2'](h)
        h = h + block['skip'](x)
        
        if 'down' in block:
            h = block['down'](h)
        
        return h
    
    def forward(self, x, t):
        # Time embedding
        t_emb = self._sinusoidal_embedding(t.float(), config.model_channels)
        t_emb = self.time_embed(t_emb)
        
        # Encoder
        x = self.conv_in(x)
        
        h1 = self._apply_block(self.down1, x, t_emb)
        h2 = self._apply_block(self.down2, h1, t_emb)
        
        # Middle
        h = self._apply_block(self.mid, h2, t_emb)
        
        # Decoder with skip connections
        h = self._apply_block(self.up1, h, t_emb, skip=h2)
        h = self._apply_block(self.up2, h, t_emb, skip=h1)
        
        return self.conv_out(h)


# ============ DDPM ============
class MNISTDiffusion:
    """Diffusion model for MNIST"""
    
    def __init__(self, model, config):
        self.model = model.to(config.device)
        self.config = config
        self.device = config.device
        
        # Noise schedule
        self.betas = torch.linspace(
            config.beta_start, config.beta_end, config.T
        ).to(config.device)
        
        self.alphas = 1 - self.betas
        self.alpha_bars = torch.cumprod(self.alphas, dim=0)
        self.sqrt_alpha_bars = torch.sqrt(self.alpha_bars)
        self.sqrt_one_minus_alpha_bars = torch.sqrt(1 - self.alpha_bars)
    
    def q_sample(self, x_0, t, noise=None):
        """Forward process: add noise"""
        if noise is None:
            noise = torch.randn_like(x_0)
        
        sqrt_alpha_bar = self.sqrt_alpha_bars[t].view(-1, 1, 1, 1)
        sqrt_one_minus = self.sqrt_one_minus_alpha_bars[t].view(-1, 1, 1, 1)
        
        return sqrt_alpha_bar * x_0 + sqrt_one_minus * noise, noise
    
    def p_sample(self, x_t, t):
        """Reverse process: remove noise"""
        with torch.no_grad():
            noise_pred = self.model(x_t, t)
            
            alpha = self.alphas[t].view(-1, 1, 1, 1)
            alpha_bar = self.alpha_bars[t].view(-1, 1, 1, 1)
            beta = self.betas[t].view(-1, 1, 1, 1)
            
            # Mean
            mean = (1 / torch.sqrt(alpha)) * (
                x_t - (beta / torch.sqrt(1 - alpha_bar)) * noise_pred
            )
            
            # Variance
            if t[0] > 0:
                noise = torch.randn_like(x_t)
                sigma = torch.sqrt(beta)
                return mean + sigma * noise
            else:
                return mean
    
    @torch.no_grad()
    def sample(self, batch_size):
        """Generate samples"""
        self.model.eval()
        
        x = torch.randn(
            batch_size, self.config.channels, 
            self.config.image_size, self.config.image_size
        ).to(self.device)
        
        for t in tqdm(reversed(range(self.config.T)), desc='Sampling'):
            t_batch = torch.full((batch_size,), t, device=self.device, dtype=torch.long)
            x = self.p_sample(x, t_batch)
        
        self.model.train()
        return x


# ============ Training ============
class Trainer:
    def __init__(self, config):
        self.config = config
        
        # Data
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize([0.5], [0.5])  # [-1, 1]
        ])
        
        dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
        self.dataloader = DataLoader(dataset, batch_size=config.batch_size, shuffle=True)
        
        # Model
        self.model = MNISTUNet(config).to(config.device)
        self.diffusion = MNISTDiffusion(self.model, config)
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=config.lr)
        
        print(f"Model parameters: {sum(p.numel() for p in self.model.parameters()):,}")
    
    def train_epoch(self, epoch):
        self.model.train()
        total_loss = 0
        
        pbar = tqdm(self.dataloader, desc=f'Epoch {epoch+1}')
        for x, _ in pbar:
            x = x.to(self.config.device)
            
            # Random timesteps
            t = torch.randint(0, self.config.T, (x.shape[0],), device=self.config.device)
            
            # Add noise
            x_t, noise = self.diffusion.q_sample(x, t)
            
            # Predict noise
            noise_pred = self.model(x_t, t)
            
            # Loss
            loss = F.mse_loss(noise_pred, noise)
            
            # Backward
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item()
            pbar.set_postfix({'loss': f'{loss.item():.4f}'})
        
        return total_loss / len(self.dataloader)
    
    def train(self):
        losses = []
        
        for epoch in range(self.config.epochs):
            loss = self.train_epoch(epoch)
            losses.append(loss)
            print(f'Epoch {epoch+1}/{self.config.epochs} | Loss: {loss:.4f}')
            
            # Generate samples
            if (epoch + 1) % 5 == 0:
                self.visualize(epoch + 1)
        
        return losses
    
    def visualize(self, epoch):
        samples = self.diffusion.sample(16)
        samples = (samples + 1) / 2  # [-1,1] -> [0,1]
        
        fig, axes = plt.subplots(4, 4, figsize=(8, 8))
        for i, ax in enumerate(axes.flat):
            ax.imshow(samples[i, 0].cpu(), cmap='gray')
            ax.axis('off')
        
        plt.suptitle(f'Generated Samples - Epoch {epoch}')
        plt.tight_layout()
        plt.savefig(f'mnist_diffusion_epoch_{epoch}.png')
        plt.close()
    
    def visualize_process(self):
        """Visualize the denoising process"""
        # Get one sample
        x = torch.randn(1, 1, 28, 28).to(self.config.device)
        
        # Store intermediate steps
        steps = [999, 750, 500, 250, 100, 50, 10, 0]
        images = []
        
        self.model.eval()
        with torch.no_grad():
            current_x = x.clone()
            for t in reversed(range(self.config.T)):
                t_batch = torch.tensor([t], device=self.config.device)
                current_x = self.diffusion.p_sample(current_x, t_batch)
                
                if t in steps:
                    images.append((t, current_x.cpu().clone()))
        
        # Plot
        fig, axes = plt.subplots(1, len(steps), figsize=(16, 2))
        for i, (t, img) in enumerate(images):
            ax = axes[i]
            ax.imshow((img[0, 0] + 1) / 2, cmap='gray')
            ax.set_title(f't={t}')
            ax.axis('off')
        
        plt.suptitle('Denoising Process')
        plt.tight_layout()
        plt.savefig('denoising_process.png')
        plt.show()


# ============ Main ============
if __name__ == "__main__":
    print(f"Using device: {config.device}")
    
    trainer = Trainer(config)
    losses = trainer.train()
    
    # Plot losses
    plt.figure(figsize=(10, 5))
    plt.plot(losses)
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('Training Loss')
    plt.savefig('training_loss.png')
    plt.show()
    
    # Visualize denoising process
    trainer.visualize_process()
    
    # Save model
    torch.save(trainer.model.state_dict(), 'mnist_diffusion.pth')
    print("Model saved!")
```

---

## Homework

### Level 1: Fundamentals (Beginner)

1. **Explain the forward and reverse process in your own words**
   - Why is the forward process easy but reverse is hard?
   - What role does the neural network play?

2. **Implement the linear noise schedule**
   - Compute β_t, α_t, and ᾱ_t
   - Plot ᾱ_t over time

3. **Derive why x_T ≈ N(0, I) when T is large**

### Level 2: Intermediate Implementation

4. **Implement DDIM sampling**
   - Allow configurable number of steps
   - Compare 1000 steps (DDPM) vs 50 steps (DDIM)

5. **Add the cosine noise schedule**
   - Implement the formula
   - Compare with linear schedule on MNIST

6. **Implement classifier-free guidance (basic)**
   - Train with 10% unconditional examples
   - Guide sampling with scale factor

### Level 3: Advanced Challenges

7. **Implement v-prediction instead of ε-prediction**
   - v = √ᾱ_t · ε - √(1-ᾱ_t) · x_0
   - Compare training stability

8. **Add self-attention to your U-Net**
   - Implement multi-head self-attention
   - Add at bottleneck resolution

9. **Implement progressive distillation**
   - Train student to match 2 steps of teacher
   - Halve the number of steps iteratively

### Level 4: Research-Level

10. **Implement latent diffusion (basic)**
    - Train autoencoder to compress images
    - Run diffusion in latent space

11. **Build a conditional diffusion model**
    - Add class conditioning for MNIST
    - Use AdaIN or cross-attention

12. **Implement DDPM loss weighting schemes**
    - Compare uniform vs SNR-weighted vs min-SNR
    - Evaluate on image quality

---

## Common Mistakes

### ❌ Mistake 1: Wrong Normalization

```python
# BAD: Images in [0, 1] when noise is centered at 0
x_t = sqrt_alpha_bar * x + sqrt_one_minus * noise  # x in [0,1], noise in [-∞,∞]

# GOOD: Normalize images to [-1, 1]
x = x * 2 - 1  # [0,1] -> [-1,1]
x_t = sqrt_alpha_bar * x + sqrt_one_minus * noise
```

### ❌ Mistake 2: Forgetting Time Embedding

```python
# BAD: Same network for all timesteps
noise_pred = model(x_t)

# GOOD: Condition on timestep
noise_pred = model(x_t, t)
```

### ❌ Mistake 3: Adding Noise at t=0

```python
# BAD: Adding noise when t=0
x_prev = mean + sigma * torch.randn_like(x)

# GOOD: No noise at final step
if t > 0:
    x_prev = mean + sigma * torch.randn_like(x)
else:
    x_prev = mean  # Deterministic at t=0
```

### ❌ Mistake 4: Wrong Alpha Bar Indexing

```python
# BAD: Off-by-one error
alpha_bar_prev = alpha_bars[t]  # Should be t-1!

# GOOD: Proper indexing
alpha_bar_prev = alpha_bars[t-1] if t > 0 else torch.tensor(1.0)

# OR: Pre-compute padded version
alpha_bars_prev = F.pad(alpha_bars[:-1], (1, 0), value=1.0)
```

### ❌ Mistake 5: Not Clipping Predictions

```python
# BAD: x_0 prediction can be out of range
x_0_pred = (x_t - sqrt_one_minus * eps_pred) / sqrt_alpha_bar

# GOOD: Clip to valid range
x_0_pred = torch.clamp(x_0_pred, -1, 1)
```

### ❌ Mistake 6: Using Wrong Loss Reduction

```python
# BAD: Mean reduction averages over spatial dimensions
loss = F.mse_loss(noise_pred, noise)  # Per-pixel average

# GOOD for pixel-space: This is actually fine for most cases
# But be aware when comparing with papers using sum reduction
```

### ❌ Mistake 7: Ignoring Numerical Stability

```python
# BAD: Division by small number
x_0 = x_t / sqrt_alpha_bar  # sqrt_alpha_bar → 0 as t → T

# GOOD: Add small epsilon or use proper formulation
x_0 = (x_t - sqrt_one_minus * eps) / (sqrt_alpha_bar + 1e-8)
```

---

## Interview Questions & Answers

### Q1: What is a diffusion model and how does it work? (Beginner)

**Answer:**

A diffusion model works by:

1. **Forward process**: Gradually add Gaussian noise to data over T steps until it becomes pure noise
2. **Reverse process**: Learn to reverse this, recovering data from noise step by step

**Training:**
- Take clean image x₀
- Add noise to get x_t = √ᾱ_t · x₀ + √(1-ᾱ_t) · ε
- Train network to predict the noise ε
- Loss: ||ε - ε_θ(x_t, t)||²

**Generation:**
- Start from pure noise x_T ~ N(0, I)
- At each step, predict noise and subtract it
- After T steps, get clean image x₀

Key insight: Predicting and removing noise is easier than generating images directly.

---

### Q2: Explain the reparameterization in the forward process. (Intermediate)

**Answer:**

Instead of applying noise step-by-step:
$$x_t = \sqrt{1-\beta_t} \cdot x_{t-1} + \sqrt{\beta_t} \cdot \epsilon_t$$

We can jump directly to any timestep:
$$x_t = \sqrt{\bar{\alpha}_t} \cdot x_0 + \sqrt{1-\bar{\alpha}_t} \cdot \epsilon$$

Where $\bar{\alpha}_t = \prod_{s=1}^{t} (1-\beta_s)$

**Why this works:**
- Sum of Gaussians is Gaussian
- Variance accumulates: $(1-\bar{\alpha}_t) = \sum$ of individual variances
- Mean shrinks by $\sqrt{\bar{\alpha}_t}$

**Why it matters:**
- Training: Sample any t directly (O(1) vs O(t))
- No need to iterate through all previous steps
- Much faster training!

---

### Q3: What's the difference between DDPM and DDIM? (Intermediate)

**Answer:**

| Aspect | DDPM | DDIM |
|--------|------|------|
| **Sampling** | Stochastic | Deterministic (η=0) |
| **Speed** | T steps (1000) | Any number of steps |
| **Same noise → same output** | No | Yes (when η=0) |
| **Formula** | Adds noise at each step | Uses ODE formulation |

**DDPM step:**
$$x_{t-1} = \mu_\theta(x_t, t) + \sigma_t \cdot z$$

**DDIM step:**
$$x_{t-1} = \sqrt{\bar{\alpha}_{t-1}} \cdot \hat{x}_0 + \sqrt{1-\bar{\alpha}_{t-1}-\sigma^2} \cdot \epsilon_\theta + \sigma \cdot z$$

DDIM key insight: The reverse process can be written as an ODE, not just an SDE. This allows:
- Skipping steps (50 instead of 1000)
- Deterministic mapping (same z_T → same x_0)
- Latent interpolation

---

### Q4: Explain the connection between diffusion and score matching. (Advanced)

**Answer:**

**Score function:** $s(x) = \nabla_x \log p(x)$
- Points toward higher probability regions
- "Which direction increases the likelihood?"

**Connection to diffusion:**

At noise level t, the score of the noisy distribution is:
$$\nabla_{x_t} \log q(x_t) = -\frac{\epsilon}{\sqrt{1-\bar{\alpha}_t}}$$

So:
$$\epsilon_\theta(x_t, t) \approx -\sqrt{1-\bar{\alpha}_t} \cdot \nabla_{x_t} \log q(x_t)$$

**Predicting noise = predicting scaled score!**

This connects to:
- **Score matching**: Train network to estimate score
- **Langevin dynamics**: Sample by following score + noise
- **SDEs**: Continuous-time formulation of diffusion

---

### Q5: Why are diffusion models more stable than GANs? (Advanced)

**Answer:**

**GAN instabilities:**
1. Minimax game → adversarial dynamics
2. Mode collapse → generator ignores modes
3. Vanishing gradients → discriminator too strong
4. No convergence guarantee

**Diffusion stability:**
1. **Simple objective**: Just MSE on noise prediction
2. **No adversarial training**: Single network, single objective
3. **Covers all modes**: Trained on all data points equally
4. **Theoretical guarantees**: Connected to well-studied SDEs

**Why stable:**
- Loss is well-behaved (MSE)
- No competition between networks
- Each training example contributes independently
- Noise schedule provides curriculum (easy → hard)

**Trade-off:** Stability comes at cost of sampling speed.

---

### Q6: How does classifier-free guidance work? (Advanced)

**Answer:**

**Goal:** Control generation quality/diversity trade-off without a separate classifier.

**Training:**
- Randomly drop conditioning (e.g., text) with probability p (e.g., 10%)
- Train both conditional ε_θ(x_t, t, c) and unconditional ε_θ(x_t, t, ∅)

**Sampling with guidance scale w:**
$$\tilde{\epsilon}_\theta = \epsilon_\theta(x_t, t, \emptyset) + w \cdot (\epsilon_\theta(x_t, t, c) - \epsilon_\theta(x_t, t, \emptyset))$$

**Intuition:**
- w=1: Normal conditional generation
- w>1: Amplify the effect of conditioning
- Higher w → more aligned with condition, but less diverse

**Why it works:**
- The difference (εcond - εuncond) points toward the condition
- Scaling amplifies this direction
- Like saying "more cat-like" or "more this text"

---

### Q7: What is the noise schedule and why does it matter? (Senior)

**Answer:**

**Noise schedule** {β_t} controls how fast noise is added.

**Common schedules:**

1. **Linear:** β_t = β_start + t/(T-1) × (β_end - β_start)
   - Simple, works reasonably well
   - Loses information too quickly for high-res

2. **Cosine:** ᾱ_t = cos²(π/2 × (t/T + s)/(1+s))
   - Preserves more signal in early steps
   - Better for high-resolution images

3. **Learned:** Optimize β_t during training
   - Most flexible but harder to train

**Why it matters:**
- Too fast: Lose information before network can learn
- Too slow: Waste compute on easy steps
- Balance: Smooth transition from signal to noise

**Impact:**
- Sample quality (especially high-resolution)
- Training stability
- Number of sampling steps needed

---

### Q8: Debug this diffusion sampling code. (Senior/Debugging)

```python
def sample(model, T, shape):
    x = torch.randn(shape)
    for t in range(T, 0, -1):
        noise_pred = model(x, t)
        x = (x - noise_pred) / sqrt(alpha[t])
    return x
```

**Answer:**

**Issues:**

1. **Wrong formula**: Not using correct reverse step
2. **Missing variance**: DDPM adds noise (except t=0)
3. **Indexing**: t should be tensor, not int
4. **Missing terms**: Need β_t, ᾱ_t, not just α_t

**Fixed:**
```python
def sample(model, T, shape, betas, alphas, alpha_bars, device):
    x = torch.randn(shape).to(device)
    
    for t in range(T-1, -1, -1):
        t_batch = torch.full((shape[0],), t, device=device, dtype=torch.long)
        
        noise_pred = model(x, t_batch)
        
        # Correct reverse formula
        alpha = alphas[t]
        alpha_bar = alpha_bars[t]
        beta = betas[t]
        
        mean = (1 / torch.sqrt(alpha)) * (
            x - (beta / torch.sqrt(1 - alpha_bar)) * noise_pred
        )
        
        # Add noise (except for t=0)
        if t > 0:
            noise = torch.randn_like(x)
            sigma = torch.sqrt(beta)
            x = mean + sigma * noise
        else:
            x = mean
    
    return x
```

---

### Q9: How would you speed up diffusion sampling? (Senior)

**Answer:**

**1. Fewer Steps (DDIM):**
- Use deterministic ODE formulation
- Skip from t=1000 to t=980 directly
- 50 steps instead of 1000 (20× speedup)

**2. Progressive Distillation:**
- Train student to match 2 teacher steps
- Iterate: 1000 → 500 → 250 → ... → 4 steps

**3. Consistency Models:**
- Train model to directly predict x_0 from any x_t
- Single step generation possible

**4. Latent Diffusion:**
- Compress image to smaller latent
- Run diffusion in latent space (8× smaller)
- Decode latent to image

**5. Better Architectures:**
- Efficient attention (linear, sparse)
- Smaller U-Net with better design
- Knowledge distillation

**6. Caching/Parallelism:**
- Cache attention keys/values
- Parallel sampling across timesteps

**Speed comparison:**
```
DDPM (1000 steps):        ~60 seconds
DDIM (50 steps):          ~3 seconds
Latent Diffusion (50):    ~1 second
Consistency (1 step):     ~0.05 seconds
```

---

### Q10: Design a text-to-image diffusion system. What components do you need? (FAANG System Design)

**Answer:**

**Core Components:**

1. **Text Encoder:**
   - CLIP or T5 for text embedding
   - Encode "a cat sitting on a table" → [batch, seq_len, dim]

2. **U-Net with Cross-Attention:**
   - Image features as Q
   - Text features as K, V
   - Allows text to guide generation

3. **Latent Compression (optional but recommended):**
   - VAE encoder: 512×512×3 → 64×64×4
   - Run diffusion in latent space
   - VAE decoder: 64×64×4 → 512×512×3

4. **Noise Schedule:**
   - Cosine or learned schedule
   - T=1000 for training, DDIM 50 for inference

5. **Classifier-Free Guidance:**
   - Train with 10% unconditional
   - Guidance scale 7-15 at inference

**Architecture:**
```
Text ─────▶ CLIP ─────────────────────────────┐
                                               │
Noise ──▶ U-Net (with cross-attention to text) ──▶ Latent ──▶ VAE Dec ──▶ Image
              ▲
              │
        Time Embedding
```

**Training:**
1. Encode image to latent: z = Enc(x)
2. Add noise: z_t = √ᾱ_t · z + √(1-ᾱ_t) · ε
3. Predict noise with text conditioning
4. Loss: ||ε - ε_θ(z_t, t, text)||²

**Inference:**
1. Sample z_T ~ N(0, I)
2. DDIM 50 steps with CFG
3. Decode: x = Dec(z_0)

**Scale:**
- Model: 1-5B parameters
- Training: 256+ GPUs, weeks
- Inference: A100 GPU, ~1 second

---

## Summary

### Key Takeaways

1. **Diffusion = Noise then Denoise**
   - Forward: Gradually add noise (easy, fixed)
   - Reverse: Learn to denoise (neural network)

2. **Simple Training Objective**
   - Just predict the noise that was added
   - MSE loss, no adversarial training

3. **Closed-Form Forward**
   - Jump to any timestep directly
   - x_t = √ᾱ_t · x_0 + √(1-ᾱ_t) · ε

4. **Slow but High Quality**
   - Many steps (1000) needed
   - DDIM speeds up to 50 steps
   - Best image quality among generative models

5. **Connected to Score Matching**
   - Predicting noise ≈ predicting score
   - Well-founded theoretically

### Quick Reference

| Concept | Formula |
|---------|---------|
| Forward | $x_t = \sqrt{\bar{\alpha}_t} x_0 + \sqrt{1-\bar{\alpha}_t} \epsilon$ |
| Loss | $\|\|\epsilon - \epsilon_\theta(x_t, t)\|\|^2$ |
| Reverse | $x_{t-1} = \frac{1}{\sqrt{\alpha_t}}(x_t - \frac{\beta_t}{\sqrt{1-\bar{\alpha}_t}}\epsilon_\theta) + \sigma_t z$ |
| $\bar{\alpha}_t$ | $\prod_{s=1}^{t} (1-\beta_s)$ |

---

**Next Up**: `05-Latent-Diffusion-and-Stable-Diffusion.md` - Understanding how Stable Diffusion works, the VAE latent space, and conditioning mechanisms.

Type `CONTINUE` to proceed.
