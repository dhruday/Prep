# 🎯 Week 2 Interview Questions & Answers

## � Table of Contents

1. [Overview](#-overview)
2. [Section 1: Discriminative vs Generative Models](#-section-1-discriminative-vs-generative-models)
3. [Section 2: GANs - Basics](#-section-2-gans---basics)
4. [Section 3: GANs - Advanced](#-section-3-gans---advanced)
5. [Section 4: VAEs](#-section-4-vaes)
6. [Section 5: TensorBoard & Debugging](#-section-5-tensorboard--debugging)
7. [Section 6: Practical/System Design](#-section-6-practicalsystem-design)
8. [Quick Reference Card](#-quick-reference-card)
9. [Interview Preparation Checklist](#-interview-preparation-checklist)

---

## �📌 Overview

This file contains **70+ interview questions** covering all Week 2 topics:

| Section | Topics | Questions |
|---------|--------|-----------|
| 1 | Discriminative vs Generative | 10 |
| 2 | GANs - Basics | 15 |
| 3 | GANs - Advanced | 15 |
| 4 | VAEs | 15 |
| 5 | TensorBoard & Debugging | 5 |
| 6 | Practical/System Design | 10 |

Difficulty levels: 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced | ⚫ FAANG

---

## 📘 Section 1: Discriminative vs Generative Models

### 🟢 Q1: What is a discriminative model?
**A**: A discriminative model learns the decision boundary between classes. It models P(Y|X) - the probability of label Y given input X. Examples include logistic regression, SVMs, and neural network classifiers.

**Key insight**: Discriminative models answer "Given this input, what's the class?" but cannot generate new samples.

---

### 🟢 Q2: What is a generative model?
**A**: A generative model learns the full data distribution P(X) or the joint distribution P(X,Y). It can:
1. Generate new samples that look like training data
2. Estimate the probability of any input

Examples: GANs, VAEs, Naive Bayes, Hidden Markov Models.

---

### 🟡 Q3: When would you use a generative model for classification?
**A**: Generative models for classification are useful when:
1. **Limited labeled data** - Can leverage unlabeled data
2. **Missing data** - Can impute missing values
3. **Class imbalance** - Can generate synthetic minority samples
4. **Outlier detection** - Can identify low probability samples

Using Bayes theorem: P(Y|X) = P(X|Y)P(Y) / P(X)

---

### 🟡 Q4: What's the mathematical difference between the two approaches?
**A**: 
```
Discriminative:
- Models P(Y|X) directly
- Loss: -Σ log P(yᵢ|xᵢ; θ)
- Examples: Cross-entropy loss

Generative:
- Models P(X) or P(X,Y)  
- Loss: -Σ log P(xᵢ; θ)
- For classification: P(Y|X) = P(X|Y)P(Y) / P(X)
```

---

### 🔴 Q5: Why do discriminative models often outperform generative models for classification?
**A**: According to Vapnik's principle: "Don't solve a more general problem as an intermediate step." 

Discriminative models:
- Focus only on the decision boundary
- Don't waste capacity modeling P(X)
- More efficient use of limited data
- Asymptotically (infinite data), both approaches converge, but discriminative reaches good performance faster

However, generative models may outperform when:
- Data is limited
- Missing features exist
- Prior knowledge about P(X) is available

---

### 🟡 Q6: What's the difference between explicit and implicit density models?
**A**: 
```
Explicit Density:
- Can compute P(X) directly
- Examples: VAE (ELBO), Normalizing Flows, Autoregressive models
- Pros: Can evaluate likelihood
- Cons: Often requires tractability assumptions

Implicit Density:
- Can sample from P(X) but cannot compute it
- Examples: GANs
- Pros: No restrictions on model architecture
- Cons: Cannot evaluate likelihood
```

---

### ⚫ Q7: Explain the relationship between generative models and Bayes' theorem.
**A**: Generative models naturally connect to Bayesian inference:

```
Posterior P(Y|X) = Likelihood P(X|Y) × Prior P(Y)
                   ─────────────────────────────
                         Evidence P(X)

Generative model learns:
- P(X|Y) for each class (class-conditional density)
- P(Y) from class frequencies (prior)
- P(X) = Σ P(X|Y)P(Y) (marginal)

Classification: argmax P(Y|X) = argmax P(X|Y)P(Y)
```

This provides:
1. Principled uncertainty quantification
2. Easy incorporation of prior knowledge
3. Natural handling of missing data

---

### 🟡 Q8: Can GANs be used for classification?
**A**: Yes, through several approaches:

1. **Feature extraction**: Use discriminator features for classification
2. **Semi-supervised GAN**: D outputs class labels + real/fake
3. **BiGAN/ALI**: Learn inverse mapping, use encoder for features
4. **Conditional GAN**: Train with labels, discriminator learns class-relevant features

However, GANs are primarily used for generation, not classification.

---

### 🔴 Q9: What are normalizing flows and how do they relate to other generative models?
**A**: Normalizing flows are generative models that:

```
z ~ N(0, I)  →  x = f(z)  (invertible transform)

Key properties:
1. Invertible: Can compute z = f⁻¹(x)
2. Explicit density: log p(x) = log p(z) - log|det(∂f/∂z)|
3. Exact likelihood: No approximation needed

vs VAE: Flows give exact likelihood, VAE gives lower bound
vs GAN: Flows give likelihood, GAN is implicit

Examples: RealNVP, Glow, NICE
```

---

### ⚫ Q10: Compare GANs, VAEs, and Diffusion models as generative approaches.
**A**: 

| Aspect | GAN | VAE | Diffusion |
|--------|-----|-----|-----------|
| **Density** | Implicit | Explicit (ELBO) | Explicit |
| **Training** | Adversarial | ELBO maximization | Score matching |
| **Stability** | Can be unstable | Stable | Very stable |
| **Sample Quality** | Sharp | Can be blurry | State-of-the-art |
| **Mode Coverage** | Prone to collapse | Good coverage | Excellent |
| **Speed** | Fast sampling | Fast sampling | Slow sampling |
| **Likelihood** | Cannot compute | Lower bound | Can compute |

---

## 📗 Section 2: GANs - Basics

### 🟢 Q11: What is a GAN?
**A**: A Generative Adversarial Network consists of two neural networks competing:

```
Generator (G): Random noise z → Fake images
               Goal: Fool the discriminator

Discriminator (D): Images → Real or Fake probability
                   Goal: Detect fakes

Training: Minimax game
min max V(D,G) = 𝔼[log D(x)] + 𝔼[log(1-D(G(z)))]
 G   D
```

---

### 🟢 Q12: What are the roles of the generator and discriminator?
**A**: 
```
GENERATOR:
- Input: Random noise vector z ~ N(0,1)
- Output: Fake sample G(z) 
- Goal: Maximize D(G(z)) - fool D
- Architecture: Usually upsampling (deconv/transposed conv)

DISCRIMINATOR:
- Input: Image (real or fake)
- Output: P(real) ∈ [0, 1]
- Goal: D(real) → 1, D(fake) → 0
- Architecture: Usually downsampling (strided conv)
```

---

### 🟡 Q13: Explain the GAN loss function in detail.
**A**: 
```
Original GAN objective:
V(D, G) = 𝔼ₓ~p_data[log D(x)] + 𝔼ᵤ~p_z[log(1 - D(G(z)))]

DISCRIMINATOR LOSS (maximize V):
L_D = -𝔼[log D(x)] - 𝔼[log(1 - D(G(z)))]
    = BCE(D(real), 1) + BCE(D(fake), 0)

GENERATOR LOSS (minimize V):
Original: L_G = 𝔼[log(1 - D(G(z)))]
Problem: Saturates when D(G(z)) ≈ 0

Non-saturating (practical):
L_G = -𝔼[log D(G(z))]
    = BCE(D(fake), 1)  # Pretend fakes are real
```

---

### 🟢 Q14: What is the latent space in GANs?
**A**: The latent space is the input space of the generator:

```
z ∈ ℝᵈ (typically d = 100-512)
z ~ N(0, I) or Uniform(-1, 1)

Properties:
- Each z maps to one image G(z)
- Similar z values → similar images (ideally)
- Interpolation: z = αz₁ + (1-α)z₂ creates smooth transitions
- Arithmetic: z_smiling_woman - z_woman + z_man ≈ z_smiling_man
```

---

### 🟡 Q15: Why do we use LeakyReLU instead of ReLU in GANs?
**A**: 
```
ReLU: f(x) = max(0, x)
Problem: Gradient = 0 for x < 0 → "dead neurons"

LeakyReLU: f(x) = x if x > 0 else αx (α ≈ 0.2)
Solution: Small gradient for negative values

Benefits:
1. Maintains gradient flow
2. No dying neurons
3. Better training stability
4. Empirically works better for GANs
```

---

### 🟡 Q16: What is mode collapse?
**A**: Mode collapse occurs when the generator produces limited variety:

```
Dataset has modes: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9}

Mode collapse: G only produces {3, 3, 3, 3, 3, 3, ...}

Why it happens:
1. G finds one output that fools D
2. D learns to detect it
3. G finds another single output
4. Cycle continues without learning diversity

Solutions:
- Mini-batch discrimination
- Feature matching
- Unrolled GANs
- WGAN/WGAN-GP
```

---

### 🟡 Q17: What is the optimal discriminator?
**A**: Given a fixed generator G, the optimal discriminator is:

```
D*_G(x) = p_data(x) / (p_data(x) + p_G(x))

Proof sketch:
V(D, G) = ∫ [p_data(x) log D(x) + p_G(x) log(1-D(x))] dx

Taking derivative and setting to 0:
∂V/∂D(x) = p_data(x)/D(x) - p_G(x)/(1-D(x)) = 0

Solving: D*(x) = p_data(x) / (p_data(x) + p_G(x))

At optimum (p_G = p_data):
D*(x) = 1/2 for all x
```

---

### 🔴 Q18: Derive the global optimum of GAN training.
**A**: 
```
At optimal D*, substitute into V(G, D*):

V(G, D*) = 𝔼ₓ~p_data[log(p_data(x)/(p_data(x)+p_G(x)))]
         + 𝔼ₓ~p_G[log(p_G(x)/(p_data(x)+p_G(x)))]

= 𝔼[log(p_data/(2·½(p_data+p_G)))]
+ 𝔼[log(p_G/(2·½(p_data+p_G)))]

= -log(4) + KL(p_data || (p_data+p_G)/2) + KL(p_G || (p_data+p_G)/2)

= -log(4) + 2·JSD(p_data || p_G)

Where JSD = Jensen-Shannon Divergence

Minimum: When p_G = p_data, JSD = 0, V(G, D*) = -log(4)
```

---

### 🟡 Q19: Why is the non-saturating loss used in practice?
**A**: 
```
Original G loss: L_G = log(1 - D(G(z)))

Problem:
When D is good: D(G(z)) ≈ 0
log(1 - 0) = log(1) = 0
∇L_G ≈ 0 → vanishing gradients!

Non-saturating: L_G = -log(D(G(z)))

When D is good: D(G(z)) ≈ 0
-log(0) → ∞
Strong gradient signal!

Same optimum, but better gradient flow
```

---

### 🟢 Q20: What is DCGAN and its key innovations?
**A**: Deep Convolutional GAN introduced architectural guidelines:

```
DCGAN Guidelines:
1. Replace pooling with strided convolutions
2. Use BatchNorm in both G and D
3. Remove fully connected layers
4. Use ReLU in G (except output: Tanh)
5. Use LeakyReLU in D

Key innovations:
- Made GANs work reliably for images
- Learned interpretable latent representations
- Established best practices still used today
```

---

## 📙 Section 3: GANs - Advanced

### 🟡 Q21: What is Wasserstein distance and why is it better?
**A**: Wasserstein distance (Earth Mover's Distance) measures the minimum "cost" to transform one distribution into another:

```
W(P, Q) = inf E[||x - y||]
          γ∈Π(P,Q)

Where Π(P,Q) = all joint distributions with marginals P and Q

Advantages over JS divergence:
1. Provides gradients even when distributions don't overlap
2. Correlates with sample quality
3. No mode collapse issues
4. More stable training

Example:
P = δ₀ (point mass at 0)
Q = δ_θ (point mass at θ)

JS(P||Q) = log(2) for any θ ≠ 0 (no gradient!)
W(P, Q) = |θ| (smooth gradient!)
```

---

### 🔴 Q22: Explain the WGAN loss and Lipschitz constraint.
**A**: 
```
WGAN objective:
min max 𝔼ₓ~p_data[D(x)] - 𝔼ᵤ~p_z[D(G(z))]
 G  D∈𝒟

Where 𝒟 = set of 1-Lipschitz functions

Lipschitz constraint:
|D(x₁) - D(x₂)| ≤ K·|x₁ - x₂| for all x₁, x₂

Why needed:
Wasserstein distance requires the critic (D) to be Lipschitz
Otherwise D can blow up to infinity

Enforcement methods:
1. Weight clipping: Clip weights to [-c, c]
   Problem: Can hurt capacity
   
2. Gradient penalty (WGAN-GP):
   L = L_critic + λ·𝔼[(||∇D(x̂)||₂ - 1)²]
   Where x̂ = interpolation between real and fake
   Much better in practice!
```

---

### 🔴 Q23: What is spectral normalization?
**A**: Spectral normalization constrains the Lipschitz constant of each layer:

```
For weight matrix W:
W_SN = W / σ(W)

Where σ(W) = largest singular value of W

How to compute σ(W) efficiently:
Use power iteration:
1. Initialize u randomly
2. v = W^T u / ||W^T u||
3. u = W v / ||W v||
4. σ(W) ≈ u^T W v

Benefits:
- Single hyperparameter (none needed)
- Computationally cheap
- Very stable training
- Works for both G and D
```

---

### 🟡 Q24: How does conditional GAN (cGAN) work?
**A**: 
```
Standard GAN:
G(z) → x
D(x) → real/fake

Conditional GAN:
G(z, c) → x
D(x, c) → real/fake given condition c

Implementation:
- c is typically one-hot encoded
- Concatenate c to z for G
- Concatenate c to x (or embed and concat) for D

Loss includes condition matching:
D learns: "Is this a REAL image of class c?"

Applications:
- Class-conditional generation
- Image-to-image translation
- Text-to-image synthesis
```

---

### ⚫ Q25: Explain StyleGAN architecture.
**A**: 
```
StyleGAN innovations:

1. MAPPING NETWORK:
   z (512) → 8 FC layers → w (512)
   w-space is more disentangled than z-space

2. SYNTHESIS NETWORK with AdaIN:
   - Starts from learned constant
   - Style injection at each layer via AdaIN:
     AdaIN(x, y) = y_s · (x - μ(x))/σ(x) + y_b
   - Different layers control different features:
     * Early: pose, face shape
     * Middle: facial features, hair
     * Late: colors, micro-features

3. NOISE INJECTION:
   - Add random noise at each layer
   - Creates stochastic variation (hair strands, pores)

4. PROGRESSIVE GROWING:
   - Start at 4×4, add layers for higher resolution
   - Smoother training for high resolution

Results: Photorealistic faces at 1024×1024
```

---

### 🔴 Q26: What are the common GAN training failure modes?
**A**: 
```
1. MODE COLLAPSE
   Symptom: Limited variety in outputs
   Cause: G finds shortcuts
   Solution: WGAN-GP, mini-batch discrimination

2. TRAINING INSTABILITY
   Symptom: Losses oscillate, quality degrades
   Cause: G and D not balanced
   Solution: Spectral norm, two-timescale update

3. DISCRIMINATOR TOO STRONG
   Symptom: D loss → 0, G doesn't learn
   Cause: D can easily classify
   Solution: Train G more, label smoothing, weaker D

4. VANISHING GRADIENTS
   Symptom: G loss flat, no improvement
   Cause: D perfect at detecting fakes
   Solution: Non-saturating loss, WGAN

5. DIVERGENCE
   Symptom: Losses explode
   Cause: Learning rate too high
   Solution: Lower LR, gradient clipping
```

---

### 🟡 Q27: What is progressive growing in GANs?
**A**: 
```
Progressive GAN training:

Phase 1: Train at 4×4
Phase 2: Add layers, train at 8×8
Phase 3: Add layers, train at 16×16
...continue to target resolution

Key techniques:
1. Smooth fade-in of new layers
2. Pixel-wise normalization
3. Mini-batch std layer in D

Benefits:
- Faster initial training
- More stable
- Better high-resolution results
- Each resolution builds on previous

Used in: ProGAN, StyleGAN, StyleGAN2
```

---

### 🔴 Q28: How do you evaluate GAN quality?
**A**: 
```
1. INCEPTION SCORE (IS)
   IS = exp(𝔼[KL(p(y|x) || p(y))])
   
   Measures: Quality (sharp) and Diversity
   Problem: Doesn't compare to real data

2. FRÉCHET INCEPTION DISTANCE (FID)
   FID = ||μ_r - μ_g||² + Tr(Σ_r + Σ_g - 2(Σ_rΣ_g)^½)
   
   Compares feature statistics (Inception activations)
   Lower is better
   Most widely used

3. KERNEL INCEPTION DISTANCE (KID)
   Similar to FID but unbiased
   Better for small sample sizes

4. PRECISION AND RECALL
   Precision: Quality (fake looks real)
   Recall: Coverage (all modes covered)

5. HUMAN EVALUATION
   Still gold standard
   A/B testing, quality ratings
```

---

### ⚫ Q29: Compare different GAN architectures for face generation.
**A**: 
```
Evolution of face generation:

1. DCGAN (2015)
   - First stable face GAN
   - 64×64 resolution
   - FID: ~50

2. ProGAN (2017)
   - Progressive growing
   - 1024×1024 resolution
   - FID: ~8

3. StyleGAN (2018)
   - Style-based generator
   - Disentangled latent space
   - FID: ~4.4

4. StyleGAN2 (2020)
   - Fixed artifacts
   - Path length regularization
   - FID: ~2.8

5. StyleGAN3 (2021)
   - Alias-free layers
   - Better video consistency
   - FID: ~2.8 (better motion)

Key insight: Major gains from:
1. Progressive training
2. Style injection
3. Regularization techniques
```

---

### 🟡 Q30: How do you handle limited data with GANs?
**A**: 
```
Techniques for limited data:

1. DATA AUGMENTATION
   - Standard: flip, crop, color jitter
   - Differentiable augmentation (DiffAugment)
   - Apply SAME augment to real and fake

2. TRANSFER LEARNING
   - Pretrain on large dataset
   - Fine-tune on small dataset
   - Freeze early layers

3. REGULARIZATION
   - R1 regularization
   - Adaptive discriminator augmentation (ADA)
   - Consistency regularization

4. ARCHITECTURE CHANGES
   - Smaller models
   - Skip connections
   - Self-attention

5. FEW-SHOT METHODS
   - Meta-learning approaches
   - Conditional generation

Example: StyleGAN-ADA achieves good results with just 1,000 images
```

---

## 📕 Section 4: VAEs

### 🟢 Q31: What is a Variational Autoencoder?
**A**: VAE is a generative model combining neural networks with variational inference:

```
Components:
1. Encoder: q(z|x) - approximates posterior
2. Decoder: p(x|z) - generates from latent
3. Prior: p(z) = N(0, I)

Training objective (ELBO):
L = 𝔼_q[log p(x|z)] - KL(q(z|x) || p(z))
  = Reconstruction - KL divergence

Key insight: Instead of encoding to a point,
encode to a DISTRIBUTION (μ, σ)
```

---

### 🟡 Q32: Derive the ELBO (Evidence Lower Bound).
**A**: 
```
Goal: Maximize log p(x)

log p(x) = log ∫ p(x|z)p(z)dz

Introduce q(z|x):
log p(x) = log ∫ p(x|z)p(z) × q(z|x)/q(z|x) dz

         = log 𝔼_q[p(x|z)p(z)/q(z|x)]

By Jensen's inequality (log is concave):
log p(x) ≥ 𝔼_q[log(p(x|z)p(z)/q(z|x))]

         = 𝔼_q[log p(x|z)] + 𝔼_q[log p(z)/q(z|x)]
         
         = 𝔼_q[log p(x|z)] - KL(q(z|x) || p(z))
         
         = ELBO

log p(x) = ELBO + KL(q(z|x) || p(z|x))
                   ↑ always ≥ 0

So ELBO is a lower bound on log-likelihood!
```

---

### 🟡 Q33: Explain the reparameterization trick.
**A**: 
```
Problem:
z ~ q(z|x) = N(μ, σ²)
Cannot backprop through sampling!

Solution - Reparameterization:
ε ~ N(0, 1)                    ← Fixed distribution
z = μ + σ ⊙ ε                  ← Deterministic function

Now gradients flow through μ and σ:
∂z/∂μ = 1
∂z/∂σ = ε

Why it works:
- Randomness moved to ε (not trained)
- z is now a deterministic function of μ, σ, ε
- Can compute ∂L/∂μ and ∂L/∂σ

Alternative: REINFORCE (score function estimator)
- Higher variance
- Reparameterization is preferred when applicable
```

---

### 🔴 Q34: What is the KL divergence term doing in VAE?
**A**: 
```
KL(q(z|x) || p(z)) where p(z) = N(0, I)

Closed form for Gaussians:
KL = -½ Σᵢ(1 + log σᵢ² - μᵢ² - σᵢ²)

What it does:

1. REGULARIZATION
   - Pulls q(z|x) toward N(0, I)
   - Prevents arbitrary latent codes
   - Creates smooth, continuous latent space

2. PREVENTS OVERFITTING
   - Can't just memorize training data
   - Forces shared structure

3. ENABLES GENERATION
   - At generation: sample z ~ N(0, I)
   - Works because q(z|x) ≈ N(0, I)

4. INFORMATION BOTTLENECK
   - Limits how much info z contains about x
   - Forces learning of essential features

Trade-off:
- Low KL: Better reconstruction, worse generation
- High KL: Worse reconstruction, better generation/smoothness
```

---

### 🟡 Q35: Why might VAE produce blurry images?
**A**: 
```
Reasons for blurriness:

1. RECONSTRUCTION LOSS
   MSE/BCE encourages pixel-wise average
   Average of multiple images = blurry

2. LATENT SPACE REGULARIZATION
   KL term forces smooth encoding
   Multiple inputs map to similar z
   Decoder outputs average

3. DECODER UNCERTAINTY
   When uncertain, output mean (blurry)
   vs GAN which outputs sharp (possibly wrong)

4. UNIMODAL DECODER
   p(x|z) assumed Gaussian
   Can't model multi-modal distributions

Solutions:
- Use perceptual loss (feature matching)
- VQ-VAE (discrete latent)
- VAE-GAN hybrid
- Importance weighted VAE
- Hierarchical VAE
```

---

### 🔴 Q36: What is posterior collapse in VAE?
**A**: 
```
Posterior Collapse:
q(z|x) ≈ p(z) for all x

Symptoms:
- KL term → 0 early in training
- Decoder ignores z completely
- All samples look similar

Why it happens:
- Powerful decoder can generate without z
- KL term "wins" during optimization
- Easier to match prior than use z

Solutions:

1. KL ANNEALING
   Start with β=0, gradually increase to 1
   Let reconstruction term dominate initially

2. FREE BITS
   KL per dimension ≥ λ (e.g., 0.125)
   Ensures each dimension carries information

3. WEAKER DECODER
   Less powerful decoder needs z more

4. CYCLICAL SCHEDULING
   Cycle β between 0 and 1 during training

5. δ-VAE
   Explicitly set minimum rate for z
```

---

### 🟡 Q37: What is β-VAE?
**A**: 
```
β-VAE objective:
L = 𝔼[log p(x|z)] - β × KL(q(z|x) || p(z))

When β > 1:
- Stronger constraint on latent space
- Each latent dimension = one factor
- DISENTANGLED representations

Example (faces):
z₁ controls: age
z₂ controls: gender
z₃ controls: azimuth (rotation)
z₄ controls: lighting
...

Benefits:
- Interpretable latent space
- Independent control of factors
- Better for downstream tasks

Trade-off:
β ↑ → Better disentanglement, worse reconstruction
β ↓ → Better reconstruction, entangled latent

Typical values: β ∈ [1, 10]
```

---

### 🔴 Q38: Compare VAE with VQ-VAE.
**A**: 
```
VAE:
- Continuous latent z ~ N(μ, σ²)
- KL divergence regularization
- Can suffer from posterior collapse
- Blurry samples

VQ-VAE (Vector Quantized):
- Discrete latent from codebook
- z_continuous → nearest codebook entry
- No posterior collapse
- Sharper samples

Architecture:
Encoder → z_e → Quantize → z_q → Decoder
          ↓
    Find nearest in codebook

Loss:
L = Reconstruction + ||z_e - sg(z_q)||² + β||sg(z_e) - z_q||²
                     ↑ commitment loss     ↑ codebook loss
sg = stop gradient

Used in:
- DALL-E (image generation)
- Jukebox (music generation)
- Various video models
```

---

### ⚫ Q39: What is the Gumbel-Softmax trick?
**A**: 
```
Problem: Want discrete latent variables
         Sampling from categorical is not differentiable

Solution: Gumbel-Softmax (Concrete) distribution

Standard categorical:
z = one_hot(argmax(log π + g))
where g ~ Gumbel(0, 1)

Gumbel-Softmax relaxation:
y_i = exp((log π_i + g_i)/τ) / Σⱼ exp((log π_j + g_j)/τ)

Properties:
- Continuous relaxation of categorical
- τ → 0: approaches one-hot
- τ → ∞: approaches uniform
- Differentiable!

Training:
- Use annealing: start with high τ, decrease
- Straight-through estimator for hard samples

Applications:
- Discrete VAE
- Neural architecture search
- Reinforcement learning
```

---

### 🟡 Q40: How would you implement conditional VAE (CVAE)?
**A**: 
```
Changes from standard VAE:

Encoder: q(z|x, c) instead of q(z|x)
Decoder: p(x|z, c) instead of p(x|z)

Implementation:

class CVAE(nn.Module):
    def __init__(self):
        # Encoder takes x and c
        self.encoder = nn.Linear(input_dim + n_classes, hidden)
        self.fc_mu = nn.Linear(hidden, latent_dim)
        self.fc_var = nn.Linear(hidden, latent_dim)
        
        # Decoder takes z and c
        self.decoder = nn.Linear(latent_dim + n_classes, hidden)
        self.output = nn.Linear(hidden, input_dim)
    
    def encode(self, x, c):
        h = torch.cat([x, c], dim=1)
        h = self.encoder(h)
        return self.fc_mu(h), self.fc_var(h)
    
    def decode(self, z, c):
        h = torch.cat([z, c], dim=1)
        return self.output(self.decoder(h))

Training: Provide true labels c
Generation: Sample z ~ N(0,I), specify desired c
```

---

### 🔴 Q41: Explain hierarchical VAEs (HVAE).
**A**: 
```
Motivation: Single latent layer limits expressiveness

Hierarchical VAE:
Multiple layers of latent variables

z_L → z_{L-1} → ... → z_1 → x

Generative model:
p(x, z₁, ..., z_L) = p(x|z₁) × ∏ᵢ p(zᵢ|zᵢ₊₁) × p(z_L)

Inference model:
q(z₁, ..., z_L|x) = q(z₁|x) × ∏ᵢ q(zᵢ₊₁|zᵢ, x)

Benefits:
- More expressive latent space
- Different levels capture different features
- Better density estimation

Examples:
- Ladder VAE
- NVAE (Nouveau VAE)
- VDVAE (Very Deep VAE)

NVAE achieves state-of-the-art image likelihood
```

---

### ⚫ Q42: What is the wake-sleep algorithm and how does it relate to VAE?
**A**: 
```
Wake-Sleep Algorithm:
Original method for training Helmholtz machines

WAKE PHASE:
- Data flows bottom-up through recognition network
- Update generative weights to explain data
- Like standard supervised learning

SLEEP PHASE:
- Generate samples top-down from model
- Update recognition weights to infer latent
- Learning to infer without real data

Relation to VAE:
VAE = Wake phase only + reparameterization

VAE advantages:
- End-to-end gradient-based
- Single objective (ELBO)
- Simpler implementation

Wake-sleep advantages:
- Can work with discrete latents
- No reparameterization needed
- Sometimes more stable

Reweighted Wake-Sleep:
- Modern variant
- Importance weighting
- Tighter bound than ELBO
```

---

## 📘 Section 5: TensorBoard & Debugging

### 🟡 Q43: What metrics should you log for GAN training?
**A**: 
```
Essential metrics:
1. Generator loss
2. Discriminator loss
3. D(x) - output on real images
4. D(G(z)) - output on fake images

Important to track:
5. Gradient norms (detect exploding/vanishing)
6. Weight histograms (detect dead neurons)
7. Generated sample images (visual quality)

For evaluation:
8. FID score (periodic)
9. Inception score (optional)

Warning signs in logs:
- D loss → 0: D too strong
- G loss doesn't decrease: G not learning
- D(x) and D(G(z)) both → 0.5 too fast: collapse
```

---

### 🟡 Q44: How do you detect mode collapse from training logs?
**A**: 
```
Indicators of mode collapse:

1. GENERATED SAMPLES
   - All samples look similar
   - Rotating through few modes

2. LOSS PATTERNS
   - G loss fluctuates but doesn't improve
   - D loss stays low (easily detects fakes)

3. DISCRIMINATOR OUTPUT
   - D(G(z)) oscillates without converging
   - Periodic pattern in D outputs

4. DIVERSITY METRICS
   - High inception score but low diversity
   - MS-SSIM between samples very high

Solutions to try:
- Switch to WGAN-GP
- Add mini-batch discrimination
- Feature matching loss
- Unroll discriminator updates
```

---

### 🔴 Q45: How do you debug vanishing gradients in GANs?
**A**: 
```
Diagnosis:
1. Log gradient norms
   - Near zero = vanishing
   
2. Check D output
   - D(G(z)) = 0 → saturated sigmoid
   
3. Weight histograms
   - Not changing = no learning

Solutions:

1. NON-SATURATING LOSS
   Use: -log(D(G(z)))
   Not: log(1 - D(G(z)))

2. ARCHITECTURE
   - Use LeakyReLU
   - Add skip connections
   - BatchNorm (careful in D)

3. WGAN
   - No sigmoid saturation
   - Gradients always present

4. LEARNING RATE
   - Lower LR for D
   - Higher LR for G

5. INITIALIZATION
   - Careful weight initialization
   - Spectral normalization
```

---

## 📗 Section 6: Practical/System Design

### 🔴 Q46: Design a system to generate product images for e-commerce.
**A**: 
```
REQUIREMENTS:
- Generate variations of products
- Different angles, backgrounds
- High quality for website use
- Fast inference

ARCHITECTURE:

1. DATA PIPELINE
   ├── Collect product images
   ├── Segment products (remove background)
   ├── Annotate attributes (color, type, angle)
   └── Augment existing images

2. MODEL SELECTION
   ├── Conditional GAN (StyleGAN2-ADA)
   ├── Conditions: product category, angle, color
   └── Transfer learning from pretrained model

3. TRAINING INFRASTRUCTURE
   ├── GPU cluster (4-8 A100s)
   ├── Mixed precision training
   └── Distributed training if needed

4. INFERENCE PIPELINE
   ├── Model serving (TorchServe/Triton)
   ├── Caching common requests
   └── Batch inference for bulk generation

5. QUALITY CONTROL
   ├── FID monitoring
   ├── Human review for edge cases
   └── A/B testing on website

6. CONSIDERATIONS
   ├── Copyright (train only on owned images)
   ├── Bias (check for representation)
   └── Misuse prevention
```

---

### 🔴 Q47: How would you scale GAN training to multiple GPUs?
**A**: 
```
Multi-GPU GAN Training:

1. DATA PARALLELISM
   - Split batch across GPUs
   - Each GPU: forward, backward
   - Synchronize gradients
   
   # PyTorch
   G = nn.DataParallel(G)
   D = nn.DataParallel(D)

2. MODEL PARALLELISM
   - Split model across GPUs
   - For very large models
   - Pipeline parallelism

3. CHALLENGES
   - BatchNorm sync across GPUs
   - Different z samples per GPU
   - Gradient synchronization timing

4. BEST PRACTICES
   - Use SyncBatchNorm
   - Scale learning rate with batch size
   - Gradient accumulation if needed
   
5. DISTRIBUTED TRAINING
   # PyTorch DDP (preferred)
   G = DistributedDataParallel(G)
   D = DistributedDataParallel(D)
   
   Benefits:
   - Better scaling
   - No GIL issues
   - Bucket gradient sync

6. TYPICAL SETUP
   - 4-8 GPUs for research
   - 32-128 GPUs for large-scale (StyleGAN)
   - Mixed precision (FP16) for memory
```

---

### 🔴 Q48: How do you deploy a GAN model in production?
**A**: 
```
PRODUCTION DEPLOYMENT:

1. MODEL OPTIMIZATION
   ├── Quantization (INT8)
   ├── Pruning
   ├── TorchScript / ONNX export
   └── TensorRT optimization

2. SERVING INFRASTRUCTURE
   ├── TorchServe
   ├── Triton Inference Server
   ├── TensorFlow Serving
   └── FastAPI + custom

3. SCALING
   ├── Horizontal: Multiple replicas
   ├── Auto-scaling based on load
   ├── GPU vs CPU trade-off
   └── Batch requests

4. LATENCY OPTIMIZATION
   ├── Keep model in GPU memory
   ├── Warm-up on startup
   ├── Async inference
   └── Caching common requests

5. MONITORING
   ├── Inference latency
   ├── Throughput
   ├── Error rates
   ├── Quality metrics (periodic)

6. EXAMPLE ARCHITECTURE
   
   Client → Load Balancer → API Gateway
                             ↓
   ┌──────────────────────────────────────┐
   │         Kubernetes Cluster           │
   │                                      │
   │  ┌─────────┐  ┌─────────┐  ┌─────┐  │
   │  │ GPU Pod │  │ GPU Pod │  │ ... │  │
   │  │ TorchS  │  │ TorchS  │  │     │  │
   │  └─────────┘  └─────────┘  └─────┘  │
   │                                      │
   │           Redis Cache                │
   └──────────────────────────────────────┘
```

---

### ⚫ Q49: Compare GAN vs Diffusion models for a image generation task.
**A**: 
```
COMPARISON FOR PRODUCTION:

              │ GAN                │ Diffusion
──────────────┼────────────────────┼──────────────────
Quality       │ High               │ State-of-the-art
Training      │ Tricky, unstable   │ Stable
Mode coverage │ Can miss modes     │ Excellent
Inference     │ Fast (single pass) │ Slow (many steps)
Controllable  │ Requires cGAN      │ Natural via guidance
Interpolation │ Smooth latent      │ Less direct
Likelihood    │ Cannot compute     │ Can compute
Deployment    │ Easy               │ More complex

WHEN TO USE GAN:
- Real-time generation needed
- Lower latency requirements
- Well-studied domain (faces)
- Limited compute budget

WHEN TO USE DIFFUSION:
- Quality is paramount
- Mode coverage important
- Can afford slower inference
- Need controllability (text-to-image)

HYBRID APPROACHES:
- Use diffusion for training data augmentation
- GAN for fast inference with diffusion-like quality
- Distill diffusion model into GAN
```

---

### 🔴 Q50: How would you build a data augmentation system using GANs?
**A**: 
```
GAN-BASED DATA AUGMENTATION:

USE CASE:
Medical imaging with limited samples (e.g., 100 X-rays)

APPROACH:

1. BASELINE MODEL
   Train classifier on original data
   Note: Accuracy = 75%

2. GAN TRAINING
   ├── Use StyleGAN2-ADA for limited data
   ├── Train on 100 real images
   ├── Generate 10,000 synthetic images
   └── Filter by quality (use FID, human review)

3. AUGMENTED TRAINING
   ├── Real: 100 images
   ├── Synthetic: 1,000 high-quality generated
   ├── Mix ratio: Start 50/50, tune
   └── Note: Accuracy improved to 82%

4. FILTERING STRATEGIES
   ├── Discriminator confidence
   ├── Nearest neighbor to real
   ├── Diversity filtering
   └── Task-specific classifier

5. CONSIDERATIONS
   ├── Don't use synthetic for test set!
   ├── Monitor for mode collapse
   ├── Validate generated samples medically
   └── Report synthetic ratio in papers

6. ADVANCED: CONDITIONAL
   ├── cGAN for specific pathologies
   ├── Generate rare classes
   └── Balance dataset distribution
```

---

## 🎯 Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    WEEK 2 QUICK REFERENCE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DISCRIMINATIVE vs GENERATIVE                               │
│  ─────────────────────────────                               │
│  Discriminative: P(Y|X) - classify                          │
│  Generative: P(X) or P(X,Y) - generate                      │
│                                                             │
│  GAN LOSS                                                   │
│  ────────                                                   │
│  D: -[log D(x) + log(1-D(G(z)))]                           │
│  G: -log D(G(z))  [non-saturating]                         │
│                                                             │
│  WGAN LOSS                                                  │
│  ─────────                                                  │
│  D: D(G(z)) - D(x) + λ×GP                                  │
│  G: -D(G(z))                                               │
│                                                             │
│  VAE LOSS                                                   │
│  ────────                                                   │
│  ELBO = Reconstruction - β×KL                               │
│  KL = -½Σ(1 + log σ² - μ² - σ²)                            │
│                                                             │
│  REPARAMETERIZATION                                         │
│  ─────────────────                                          │
│  z = μ + σ ⊙ ε,  where ε ~ N(0,1)                          │
│                                                             │
│  KEY METRICS                                                │
│  ───────────                                                │
│  FID: Compare real vs generated distributions               │
│  IS: Quality × Diversity                                    │
│                                                             │
│  COMMON ISSUES                                              │
│  ─────────────                                              │
│  GAN: Mode collapse, training instability                   │
│  VAE: Posterior collapse, blurry outputs                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Interview Preparation Checklist

- [ ] Can explain discriminative vs generative in simple terms
- [ ] Know the GAN objective and can derive optimal D
- [ ] Understand mode collapse and solutions
- [ ] Can explain WGAN and why Wasserstein distance helps
- [ ] Know DCGAN architecture guidelines
- [ ] Can derive ELBO for VAE
- [ ] Understand reparameterization trick deeply
- [ ] Know difference between VAE and GAN trade-offs
- [ ] Can discuss evaluation metrics (FID, IS)
- [ ] Have built at least one GAN and one VAE project

---

Good luck with your interviews! 🚀
