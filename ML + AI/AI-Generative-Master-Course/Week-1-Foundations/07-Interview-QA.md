# 📘 Week 1 Interview Questions & Answers

## 🎯 Overview

This comprehensive guide covers **60+ interview questions** from beginner to FAANG level for all Week 1 topics:

- Introduction to AI
- Mathematical Foundations
- Neural Networks
- Gradient Descent & Optimization
- Network Architectures (FNN, CNN, RNN)

---

## 📚 Section 1: Introduction to AI (10 Questions)

### Beginner Level

**Q1: What is the difference between AI, Machine Learning, and Deep Learning?**

**A:** 
- **AI (Artificial Intelligence):** Broadest term - any technique enabling computers to mimic human intelligence (includes rule-based systems, ML, etc.)
- **Machine Learning (ML):** Subset of AI where systems learn patterns from data without explicit programming
- **Deep Learning (DL):** Subset of ML using neural networks with multiple layers to learn hierarchical representations

```
AI ⊃ ML ⊃ DL

Example:
- AI: Chess program using hard-coded rules
- ML: Spam filter learning from labeled emails
- DL: Image recognition using CNNs
```

---

**Q2: What are the three types of machine learning?**

**A:**
| Type | Description | Label Required | Example |
|------|-------------|----------------|---------|
| **Supervised** | Learn from labeled data | Yes | Spam detection, image classification |
| **Unsupervised** | Find patterns in unlabeled data | No | Clustering, dimensionality reduction |
| **Reinforcement** | Learn through rewards/penalties | No (rewards) | Game AI, robotics |

---

**Q3: What is Generative AI?**

**A:** A subset of deep learning that **creates new content** rather than just classifying or predicting. It learns the distribution of training data and can generate new samples.

**Examples:**
- Text: GPT-4, Claude, LLaMA
- Images: DALL-E, Midjourney, Stable Diffusion
- Audio: Suno, ElevenLabs
- Code: GitHub Copilot

---

### Intermediate Level

**Q4: Explain the bias-variance tradeoff.**

**A:**
- **Bias:** Error from oversimplified model (underfitting) - model can't capture complexity
- **Variance:** Error from over-complex model (overfitting) - model captures noise

**Tradeoff:**
```
High Bias, Low Variance: Consistently wrong (underfit)
Low Bias, High Variance: Sometimes right, sometimes very wrong (overfit)

Goal: Find sweet spot where both are balanced
      Total Error = Bias² + Variance + Irreducible Noise
```

**In practice:**
- Start with simple model (high bias)
- Add complexity until validation error stops improving
- Use regularization to control variance

---

**Q5: What makes deep learning different from traditional machine learning?**

**A:**
| Aspect | Traditional ML | Deep Learning |
|--------|---------------|---------------|
| **Feature Engineering** | Manual, domain expertise required | Automatic feature learning |
| **Data Requirements** | Works with less data | Needs large datasets |
| **Compute** | CPU sufficient | GPU/TPU required |
| **Interpretability** | Often interpretable | Often "black box" |
| **Performance** | Saturates with more data | Scales with data |

**Key insight:** DL automatically learns hierarchical features from raw data.

---

### Advanced/FAANG Level

**Q6: Explain the concept of representation learning.**

**A:** Representation learning is about discovering useful features/representations from raw data automatically.

**Why it matters:**
- Traditional ML requires manual feature engineering
- Deep networks learn features at multiple levels of abstraction
- Good representations make downstream tasks easier

**Example in CNN:**
```
Raw pixels → Edges → Textures → Parts → Objects
   Layer 1    Layer 2  Layer 3   Layer 4

Each layer learns increasingly abstract representations
```

**Transfer learning works because learned representations generalize!**

---

**Q7: What is the No Free Lunch theorem?**

**A:** States that no single learning algorithm is universally best for all problems. Averaged over all possible problems, all algorithms perform equally.

**Implications:**
1. Algorithm choice matters for specific problems
2. Domain knowledge is valuable
3. Always benchmark multiple approaches
4. There's no "one-size-fits-all" model

**In practice:** This doesn't mean all algorithms are equal for YOUR problem - it means you need to choose based on your specific data and constraints.

---

## 📚 Section 2: Mathematical Foundations (10 Questions)

### Beginner Level

**Q8: What is a dot product and why is it important for neural networks?**

**A:** Dot product multiplies corresponding elements and sums them:

```
a · b = Σ(aᵢ × bᵢ)

[1, 2, 3] · [4, 5, 6] = 1×4 + 2×5 + 3×6 = 32
```

**Why important:**
- Every neuron computes a dot product: output = activation(weights · inputs + bias)
- Attention mechanism uses dot products to compute similarity
- Efficient to compute on GPUs (matrix multiplication)

---

**Q9: What is the gradient of a function?**

**A:** The gradient is a vector of partial derivatives pointing in the direction of steepest increase:

```
For f(x, y) = x² + y²:
∇f = [∂f/∂x, ∂f/∂y] = [2x, 2y]

At point (3, 4): ∇f = [6, 8]
This points toward steepest increase
```

**For neural networks:** We compute the gradient of loss with respect to each weight, then move in the opposite direction (gradient descent).

---

**Q10: Explain the chain rule and its importance for backpropagation.**

**A:** The chain rule computes derivatives of composed functions:

```
If y = f(g(x)), then dy/dx = df/dg × dg/dx
```

**In neural networks:**
```
Input → Layer1 → Layer2 → Layer3 → Loss
  x  →   h1   →   h2   →   h3   →   L

∂L/∂W1 = ∂L/∂h3 × ∂h3/∂h2 × ∂h2/∂h1 × ∂h1/∂W1

Backpropagation = chain rule applied backwards through layers
```

---

### Intermediate Level

**Q11: Why is softmax used for multi-class classification?**

**A:** Softmax converts raw scores to probabilities:

```
softmax(zᵢ) = e^zᵢ / Σⱼe^zⱼ

Properties:
1. Output in range (0, 1)
2. All outputs sum to 1
3. Preserves relative ordering
4. Differentiable (has gradients)
```

**Example:**
```
Scores: [2.0, 1.0, 0.1]
e^scores: [7.39, 2.72, 1.11]
Sum: 11.22
Softmax: [0.66, 0.24, 0.10] → Sum = 1.0 ✓
```

---

**Q12: What is cross-entropy loss and why is it used?**

**A:** Cross-entropy measures the difference between two probability distributions:

```
CE = -Σ yᵢ log(ŷᵢ)

For one-hot y and softmax ŷ:
CE = -log(ŷ_correct_class)
```

**Why use it:**
1. **Strong gradients for wrong predictions:** -log(0.1) = 2.3 (large gradient)
2. **Small gradients for correct predictions:** -log(0.9) = 0.1 (small gradient)
3. **Mathematically equivalent to maximum likelihood estimation**

**Compared to MSE:** Cross-entropy provides stronger learning signals when predictions are very wrong.

---

### Advanced/FAANG Level

**Q13: Derive the gradient of softmax cross-entropy loss.**

**A:** This is a famous result with an elegant answer.

**Setup:**
```
z = logits (raw scores)
ŷ = softmax(z)
L = -Σ yᵢ log(ŷᵢ)  (cross-entropy)
```

**Derivation:**
```
∂L/∂zⱼ = -Σᵢ yᵢ × (∂log(ŷᵢ)/∂zⱼ)

For softmax: ∂ŷᵢ/∂zⱼ = ŷᵢ(δᵢⱼ - ŷⱼ)

After algebra: ∂L/∂zⱼ = ŷⱼ - yⱼ

This is why softmax + cross-entropy is used together!
Gradient is simply: prediction - target
```

**This elegant result makes implementation simple and efficient.**

---

**Q14: Explain numerical stability issues in deep learning.**

**A:**

**1. Softmax overflow:**
```python
# BAD: exp(1000) = inf
softmax([1000, 1001, 1002])

# GOOD: subtract max first
z = z - max(z)
softmax([-2, -1, 0])  # Same probabilities, no overflow
```

**2. Log underflow:**
```python
# BAD: log(0) = -inf
loss = -log(1e-50)

# GOOD: clip values
y_pred = np.clip(y_pred, 1e-15, 1 - 1e-15)
```

**3. Gradient explosion/vanishing:**
```python
# Multiply many small numbers → 0 (vanishing)
0.5^100 ≈ 0

# Multiply many large numbers → inf (exploding)
2^100 ≈ 10^30
```

**Solutions:** Gradient clipping, careful initialization, batch normalization, residual connections.

---

## 📚 Section 3: Neural Networks (15 Questions)

### Beginner Level

**Q15: What is a perceptron?**

**A:** The simplest neural network - a single artificial neuron:

```
Inputs: x₁, x₂, ..., xₙ
Weights: w₁, w₂, ..., wₙ
Bias: b

Output = activation(Σwᵢxᵢ + b)
       = activation(w·x + b)
```

For original perceptron: activation = step function (0 or 1)

**Limitation:** Can only learn linearly separable patterns (can't learn XOR).

---

**Q16: Why do we need activation functions?**

**A:** Without activation functions, multiple layers collapse to a single linear transformation:

```
Without activation:
h₁ = xW₁
h₂ = h₁W₂ = xW₁W₂ = xW₃

Two layers = one layer!
Can only learn linear patterns.
```

**With activation:**
```
h₁ = activation(xW₁)
h₂ = activation(h₁W₂)

Now can learn non-linear patterns!
```

---

**Q17: Compare ReLU, Sigmoid, and Tanh activation functions.**

**A:**

| Activation | Formula | Range | Pros | Cons |
|------------|---------|-------|------|------|
| **Sigmoid** | 1/(1+e⁻ᶻ) | (0, 1) | Smooth, probability interpretation | Vanishing gradients, not zero-centered |
| **Tanh** | (eᶻ-e⁻ᶻ)/(eᶻ+e⁻ᶻ) | (-1, 1) | Zero-centered | Still has vanishing gradients |
| **ReLU** | max(0, z) | [0, ∞) | No vanishing gradients (for z>0), computationally efficient | Dead neurons (when z<0) |

**Modern default:** ReLU for hidden layers, Softmax for output (classification).

---

### Intermediate Level

**Q18: Explain the vanishing gradient problem and how it's solved.**

**A:**

**Problem:**
```
In deep networks, gradients are multiplied at each layer:
∂L/∂W₁ = (∂h₂/∂h₁) × (∂h₃/∂h₂) × ... × (∂L/∂hₙ)

If each term < 1: (0.5)^100 ≈ 0 → gradient vanishes
Early layers don't learn!
```

**Solutions:**
1. **ReLU activation:** Gradient = 1 for positive inputs
2. **Residual connections:** Skip connections allow gradient flow
3. **LSTM/GRU:** Gates control gradient flow in RNNs
4. **Batch normalization:** Keeps activations in good range
5. **Careful initialization:** Xavier, He initialization

---

**Q19: What is Xavier (Glorot) initialization?**

**A:** Weight initialization scheme that maintains variance of activations across layers:

```
For tanh/sigmoid activations:
W ~ Uniform(-√(6/(n_in + n_out)), √(6/(n_in + n_out)))
or
W ~ Normal(0, √(2/(n_in + n_out)))

For ReLU (He initialization):
W ~ Normal(0, √(2/n_in))
```

**Why it matters:**
- Too small weights → signal shrinks, vanishing gradients
- Too large weights → signal explodes, unstable training
- Proper initialization → stable signal and gradients

---

**Q20: Explain forward propagation step by step.**

**A:**

For a 3-layer network: Input → Hidden1 → Hidden2 → Output

```python
# Input: X (batch_size, input_dim)

# Layer 1
z1 = X @ W1 + b1          # Linear transformation
a1 = relu(z1)             # Activation

# Layer 2  
z2 = a1 @ W2 + b2         # Linear transformation
a2 = relu(z2)             # Activation

# Output Layer
z3 = a2 @ W3 + b3         # Linear transformation
output = softmax(z3)      # Output activation

# Loss
loss = cross_entropy(y_true, output)
```

Key: Each layer applies linear transformation then non-linearity.

---

### Advanced Level

**Q21: Derive the backpropagation equations for a 2-layer network.**

**A:**

**Network:** x → h = relu(xW₁ + b₁) → y = softmax(hW₂ + b₂) → L

**Forward:**
```
z₁ = xW₁ + b₁
h = relu(z₁)
z₂ = hW₂ + b₂
ŷ = softmax(z₂)
L = -Σ yᵢlog(ŷᵢ)
```

**Backward:**
```
# Output layer gradient (softmax + CE)
∂L/∂z₂ = ŷ - y                    # (batch, output_dim)

# Gradients for W₂, b₂
∂L/∂W₂ = hᵀ @ (∂L/∂z₂)           # (hidden_dim, output_dim)
∂L/∂b₂ = sum(∂L/∂z₂, axis=0)      # (output_dim,)

# Backprop through W₂
∂L/∂h = (∂L/∂z₂) @ W₂ᵀ           # (batch, hidden_dim)

# Backprop through ReLU
∂L/∂z₁ = ∂L/∂h ⊙ (z₁ > 0)        # element-wise

# Gradients for W₁, b₁
∂L/∂W₁ = xᵀ @ (∂L/∂z₁)           # (input_dim, hidden_dim)
∂L/∂b₁ = sum(∂L/∂z₁, axis=0)      # (hidden_dim,)
```

---

**Q22: Explain batch normalization and why it helps training.**

**A:**

**What it does:**
```
# During training:
μ = mean(x, axis=batch)           # batch mean
σ² = var(x, axis=batch)           # batch variance
x̂ = (x - μ) / √(σ² + ε)          # normalize
y = γ * x̂ + β                     # scale and shift (learnable)

# During inference:
Use running averages of μ and σ computed during training
```

**Why it helps:**
1. **Internal covariate shift:** Stabilizes distribution of layer inputs
2. **Smoother optimization landscape:** Easier to optimize
3. **Regularization effect:** Adds noise through batch statistics
4. **Allows higher learning rates:** Training is more stable

**Where to place:** After linear layer, before or after activation (both work).

---

### FAANG Level

**Q23: Design a neural network architecture for a specific problem.**

**Scenario:** You need to classify 224×224 RGB images into 1000 categories.

**A:**

```
Input: (batch, 3, 224, 224)

# Feature extraction (CNN backbone)
Conv Block 1: 3 → 64 channels, 2 conv layers, maxpool → (batch, 64, 112, 112)
Conv Block 2: 64 → 128 channels, 2 conv layers, maxpool → (batch, 128, 56, 56)
Conv Block 3: 128 → 256 channels, 3 conv layers, maxpool → (batch, 256, 28, 28)
Conv Block 4: 256 → 512 channels, 3 conv layers, maxpool → (batch, 512, 14, 14)
Conv Block 5: 512 → 512 channels, 3 conv layers, maxpool → (batch, 512, 7, 7)

# Classification head
Global Average Pooling → (batch, 512)
FC: 512 → 1000
Softmax → (batch, 1000)

# Additional considerations:
- Batch normalization after each conv
- ReLU activation
- Dropout (0.5) before final FC
- Skip connections if deep (ResNet style)
- Weight decay (L2 regularization)
```

**Total parameters:** ~50-100M for VGG-style, ~25M for ResNet-50

---

**Q24: How would you debug a neural network that's not learning?**

**A:**

**Systematic debugging checklist:**

1. **Data issues:**
   - Visualize samples - are they correct?
   - Check labels - any misalignment?
   - Verify normalization/preprocessing

2. **Sanity checks:**
   - Can model overfit 1 batch? (Should get ~100% accuracy)
   - Is loss decreasing at all?
   - Are gradients non-zero? Non-NaN?

3. **Architecture issues:**
   - Too deep without skip connections?
   - Missing activation functions?
   - Wrong output activation (sigmoid vs softmax)?

4. **Training issues:**
   - Learning rate too high/low?
   - Batch size too small?
   - Not enough epochs?

5. **Debugging tools:**
```python
# Check gradient magnitudes
for name, param in model.named_parameters():
    if param.grad is not None:
        print(f"{name}: {param.grad.norm()}")

# Check activation distributions
# Should be roughly mean=0, std=1 after batch norm

# Visualize loss curve
# Should decrease, not oscillate or plateau immediately
```

---

## 📚 Section 4: Gradient Descent & Optimization (10 Questions)

### Beginner Level

**Q25: What is gradient descent?**

**A:** An iterative optimization algorithm to find the minimum of a function:

```
Repeat until convergence:
    1. Compute gradient: ∇L(θ)
    2. Update parameters: θ = θ - α × ∇L(θ)

Where:
- θ = model parameters
- α = learning rate
- ∇L = gradient of loss
```

**Intuition:** Gradient points uphill, so we go opposite direction (downhill) toward minimum loss.

---

**Q26: What is the difference between batch, stochastic, and mini-batch gradient descent?**

**A:**

| Method | Data per update | Updates per epoch | Trade-off |
|--------|-----------------|-------------------|-----------|
| **Batch GD** | All N samples | 1 | Stable but slow |
| **Stochastic (SGD)** | 1 sample | N | Fast but noisy |
| **Mini-batch GD** | B samples | N/B | Balance of both |

**Mini-batch (B = 32-256) is standard** because:
- Utilizes GPU parallelism
- Enough updates for fast learning
- Stable enough gradients

---

### Intermediate Level

**Q27: Explain momentum in gradient descent.**

**A:** Momentum accelerates convergence by accumulating past gradients:

```
v = β × v + ∇L(θ)          # Accumulate gradient
θ = θ - α × v              # Update with velocity

β (momentum) typically = 0.9
```

**Benefits:**
- Faster convergence in consistent gradient directions
- Dampens oscillations in narrow valleys
- Can escape shallow local minima

**Analogy:** Ball rolling downhill - builds up speed, doesn't stop immediately.

---

**Q28: How does Adam optimizer work?**

**A:** Adam combines momentum + adaptive learning rates:

```python
# First moment (like momentum)
m = β₁ × m + (1 - β₁) × g

# Second moment (like RMSprop)
v = β₂ × v + (1 - β₂) × g²

# Bias correction
m̂ = m / (1 - β₁ᵗ)
v̂ = v / (1 - β₂ᵗ)

# Update
θ = θ - α × m̂ / (√v̂ + ε)

Typical values: β₁=0.9, β₂=0.999, ε=1e-8
```

**Why it works well:**
- Momentum → faster convergence
- Adaptive LR → per-parameter adjustment
- Bias correction → accurate at start of training

---

### Advanced Level

**Q29: Compare SGD vs Adam - when would you use each?**

**A:**

**Adam:**
- ✅ Faster convergence
- ✅ Less hyperparameter tuning
- ✅ Works well out-of-box
- ❌ Can generalize worse
- ❌ More memory (stores m and v)

**SGD + Momentum:**
- ✅ Often better generalization
- ✅ Less memory
- ❌ Needs careful LR tuning
- ❌ Slower to converge

**Best practice:**
- **Quick experiments:** Adam
- **Final training for best performance:** SGD with tuned LR
- **Large models (BERT, GPT):** AdamW (Adam with weight decay)

---

**Q30: What is learning rate warmup and why is it used?**

**A:**

```
LR Schedule with Warmup:

LR
│     ╭────────────────╮
│    ╱                  ╲
│   ╱                    ╲
│  ╱                      ╲
│ ╱                        ╲
└───────────────────────────────
   Warmup    Peak    Decay
   Phase    LR      Phase
```

**Why warmup:**
1. At start, weights are random, gradients are large/noisy
2. Large LR + random weights = unstable updates
3. Small LR initially stabilizes early training
4. Then increase to peak for fast learning

**When required:**
- Large batch training
- Transformer models (essential)
- Very deep networks

```python
def lr_with_warmup(step, warmup_steps, total_steps, peak_lr):
    if step < warmup_steps:
        return peak_lr * step / warmup_steps
    else:
        progress = (step - warmup_steps) / (total_steps - warmup_steps)
        return peak_lr * 0.5 * (1 + math.cos(math.pi * progress))
```

---

### FAANG Level

**Q31: Explain gradient clipping and when it's necessary.**

**A:**

**Problem:** Gradients can explode, especially in RNNs:
```
∂L/∂W = product of many gradients
If any > 1: (1.1)^100 = 13,781 → explosion!
```

**Solutions:**

**1. Clip by value:**
```python
grad = torch.clamp(grad, -max_val, max_val)
```

**2. Clip by norm (preferred):**
```python
# If gradient norm > max_norm, scale it down
total_norm = sum(g.norm()**2 for g in gradients)**0.5
clip_coef = max_norm / (total_norm + 1e-6)
if clip_coef < 1:
    for g in gradients:
        g.mul_(clip_coef)

# PyTorch:
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
```

**When necessary:**
- RNN/LSTM training
- Very deep networks
- Large learning rates
- Transformers (often use max_norm=1.0)

---

**Q32: How would you implement a custom learning rate scheduler?**

**A:**

```python
class CustomScheduler:
    """
    Warmup + Cosine Decay with Restarts
    """
    
    def __init__(self, optimizer, warmup_steps, total_steps, 
                 num_cycles=1, min_lr_ratio=0.1):
        self.optimizer = optimizer
        self.warmup_steps = warmup_steps
        self.total_steps = total_steps
        self.num_cycles = num_cycles
        self.min_lr_ratio = min_lr_ratio
        self.base_lrs = [pg['lr'] for pg in optimizer.param_groups]
        self.current_step = 0
    
    def step(self):
        self.current_step += 1
        lr = self.get_lr()
        for pg, base_lr in zip(self.optimizer.param_groups, self.base_lrs):
            pg['lr'] = lr * base_lr
    
    def get_lr(self):
        if self.current_step < self.warmup_steps:
            # Linear warmup
            return self.current_step / self.warmup_steps
        else:
            # Cosine decay with restarts
            progress = (self.current_step - self.warmup_steps) 
            progress = progress / (self.total_steps - self.warmup_steps)
            
            # Restart logic
            progress = (progress * self.num_cycles) % 1.0
            
            # Cosine decay
            return self.min_lr_ratio + (1 - self.min_lr_ratio) * \
                   0.5 * (1 + math.cos(math.pi * progress))

# Usage
scheduler = CustomScheduler(optimizer, warmup_steps=1000, total_steps=100000)
for step in range(100000):
    loss.backward()
    optimizer.step()
    scheduler.step()
```

---

## 📚 Section 5: Network Architectures (15 Questions)

### Beginner Level

**Q33: What is the difference between CNN and FNN?**

**A:**

| Aspect | FNN | CNN |
|--------|-----|-----|
| **Connections** | Full (every neuron to every neuron) | Local (filter region only) |
| **Parameter sharing** | None | Same filter across image |
| **Input** | Fixed-size vector | Grid (image) |
| **Good for** | Tabular data | Spatial patterns (images) |
| **Parameters** | Many (784×1000 = 784K) | Few (3×3×32 = 288) |

**Key insight:** CNNs exploit spatial structure with convolution + pooling.

---

**Q34: What is a convolution operation?**

**A:** Sliding a small filter across an image, computing dot products:

```
Image patch (3×3)    Filter (3×3)
┌───┬───┬───┐       ┌───┬───┬───┐
│ 1 │ 2 │ 3 │       │ 1 │ 0 │-1 │
├───┼───┼───┤   ×   ├───┼───┼───┤   =  Σ = 1×1 + 2×0 + ... = result
│ 4 │ 5 │ 6 │       │ 1 │ 0 │-1 │
├───┼───┼───┤       ├───┼───┼───┤
│ 7 │ 8 │ 9 │       │ 1 │ 0 │-1 │
└───┴───┴───┘       └───┴───┴───┘
```

**Benefits:**
- Parameter sharing (same filter everywhere)
- Translation invariance (cat anywhere = same filter activates)
- Local connectivity (each output depends on local region)

---

**Q35: What is pooling and why is it used?**

**A:** Pooling reduces spatial dimensions by summarizing regions:

```
Max Pooling (2×2):
┌───┬───┬───┬───┐     ┌───┬───┐
│ 1 │ 3 │ 2 │ 1 │     │ 4 │ 6 │  Takes MAX of each 2×2 region
├───┼───┼───┼───┤ →   ├───┼───┤
│ 4 │ 2 │ 6 │ 4 │     │ 8 │ 7 │  4×4 → 2×2
├───┼───┼───┼───┤     └───┴───┘
│ 8 │ 5 │ 1 │ 2 │
├───┼───┼───┼───┤
│ 3 │ 7 │ 2 │ 4 │
└───┴───┴───┴───┘
```

**Benefits:**
1. Reduces computation/memory
2. Adds translation invariance
3. Increases receptive field
4. Reduces overfitting

---

### Intermediate Level

**Q36: Explain the concept of receptive field.**

**A:** The region of input that affects a particular output neuron.

```
With 3×3 convolutions:
- After layer 1: 3×3 receptive field
- After layer 2: 5×5 receptive field (each 3×3 sees a 3×3)
- After layer 3: 7×7 receptive field

Deeper layers have larger receptive fields!
```

**Why it matters:**
- Early layers see local patterns (edges)
- Deep layers see global patterns (objects)
- Receptive field should cover relevant structure

**Increasing receptive field:**
- More layers
- Larger kernels
- Dilated convolutions
- Pooling

---

**Q37: What is the hidden state in an RNN?**

**A:** A vector that carries information from previous time steps:

```
h_t = f(W_xh × x_t + W_hh × h_{t-1} + b)

h_t = hidden state at time t
    = "memory" of what network has seen so far
```

**Key properties:**
- Updated at each time step
- Passed to next time step
- Summarizes all previous inputs
- Can also be used as output

**Problem:** Long-range dependencies are hard (vanishing gradients).
**Solution:** LSTM/GRU with gates.

---

**Q38: Compare 1×1 convolutions and their uses.**

**A:** 1×1 convolution applies per-pixel transformation:

```
Input: (H, W, C_in)
1×1 Conv: (1, 1, C_in, C_out)
Output: (H, W, C_out)
```

**Uses:**
1. **Dimensionality reduction:** 256 → 64 channels (cheaper than 3×3)
2. **Adding non-linearity:** Like a per-pixel FC layer
3. **Channel mixing:** Combine information across channels
4. **Bottleneck in ResNet:** Reduce → 3×3 → Expand

**Example in Inception:**
```
Input (256 channels)
    ↓
1×1 conv (64 channels) ← Reduce
    ↓
3×3 conv (64 channels) ← Process
    ↓
1×1 conv (256 channels) ← Expand
```

---

### Advanced Level

**Q39: Explain residual connections and why they enable very deep networks.**

**A:**

**Standard layer:**
```
y = F(x)  # Hope this learns something useful
```

**Residual layer:**
```
y = F(x) + x  # Learn the difference from input
```

**Why it works:**

1. **Gradient flow:**
   - Without residual: ∂y/∂x = ∂F/∂x (can vanish)
   - With residual: ∂y/∂x = ∂F/∂x + 1 (always has gradient of 1)

2. **Easy to learn identity:**
   - If F should be identity, just learn F(x) = 0
   - Easier than learning F(x) = x directly

3. **Ensemble interpretation:**
   - Deep ResNet = ensemble of many shallow networks
   - Different paths through the network

**Results:** Enables training 100+ layer networks (ResNet-152, ResNet-1001).

---

**Q40: Design a CNN architecture for 32×32 RGB images with 10 classes.**

**A:**

```python
class CIFAR10Net(nn.Module):
    def __init__(self):
        super().__init__()
        
        self.features = nn.Sequential(
            # Block 1: 32×32×3 → 32×32×32 → 16×16×32
            nn.Conv2d(3, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.25),
            
            # Block 2: 16×16×32 → 16×16×64 → 8×8×64
            nn.Conv2d(32, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.25),
            
            # Block 3: 8×8×64 → 8×8×128 → 4×4×128
            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.Conv2d(128, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.25),
        )
        
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 4 * 4, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 10)
        )
    
    def forward(self, x):
        return self.classifier(self.features(x))

# Parameters: ~500K (good for small dataset)
```

**Design decisions:**
- 3×3 convolutions (standard)
- Double channels after each pooling
- BatchNorm for stable training
- Dropout for regularization
- Global patterns before classification

---

### FAANG Level

**Q41: Explain different normalization techniques and when to use each.**

**A:**

```
Given activation tensor: (Batch, Channels, Height, Width)

BATCH NORM: normalize over (B, H, W) for each channel
    μ, σ computed across batch for each channel
    ✅ Good for CNNs
    ❌ Depends on batch size

LAYER NORM: normalize over (C, H, W) for each sample
    μ, σ computed per sample across all features
    ✅ Good for RNNs, Transformers
    ✅ Independent of batch size

INSTANCE NORM: normalize over (H, W) for each channel, each sample
    μ, σ computed per sample, per channel
    ✅ Good for style transfer

GROUP NORM: normalize over groups of channels
    Split C into G groups, normalize within groups
    ✅ Good when batch size must be small
```

**When to use:**
- **CNNs:** Batch Norm (or Group Norm for small batches)
- **RNNs:** Layer Norm
- **Transformers:** Layer Norm
- **Style transfer:** Instance Norm

---

**Q42: How would you handle variable-length sequences in RNN?**

**A:**

**1. Padding + Masking:**
```python
# Pad all sequences to max length
padded = pad_sequence(sequences, batch_first=True, padding_value=0)

# Create mask
mask = (padded != 0).float()

# Apply mask to loss
loss = criterion(output, target)
masked_loss = (loss * mask).sum() / mask.sum()
```

**2. Pack Sequences (efficient):**
```python
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence

# Sort by length (descending)
lengths, sort_idx = lengths.sort(descending=True)
sequences = sequences[sort_idx]

# Pack
packed = pack_padded_sequence(sequences, lengths, batch_first=True)

# RNN
packed_output, hidden = rnn(packed)

# Unpack
output, _ = pad_packed_sequence(packed_output, batch_first=True)

# Unsort
_, unsort_idx = sort_idx.sort()
output = output[unsort_idx]
```

**3. Bucketing:**
- Group similar-length sequences in batches
- Minimizes padding waste
- More efficient training

---

## 📚 Quick Reference: Must-Know Formulas

### Neural Network

```
Forward: aˡ = activation(aˡ⁻¹ @ Wˡ + bˡ)

Loss (CE): L = -Σ y log(ŷ)

Gradient Descent: θ = θ - α × ∂L/∂θ

Adam:
    m = β₁m + (1-β₁)g
    v = β₂v + (1-β₂)g²
    θ = θ - α × m̂ / (√v̂ + ε)
```

### Activations

```
Sigmoid: σ(z) = 1 / (1 + e⁻ᶻ)
Tanh: tanh(z) = (eᶻ - e⁻ᶻ) / (eᶻ + e⁻ᶻ)
ReLU: max(0, z)
Softmax: eᶻⁱ / Σeᶻʲ
```

### CNN

```
Output size = (Input - Kernel + 2×Padding) / Stride + 1
Receptive field grows linearly with depth
```

### RNN

```
hₜ = tanh(Wₓₕxₜ + Wₕₕhₜ₋₁ + b)
```

---

## ✅ Summary: Key Takeaways by Topic

| Topic | Key Concept |
|-------|-------------|
| AI vs ML vs DL | DL ⊂ ML ⊂ AI; DL learns features automatically |
| Math | Dot products, chain rule, gradients |
| Activation | Non-linearity enables complex patterns |
| Backprop | Chain rule applied backwards |
| Optimization | Adam for convenience, SGD for best results |
| CNN | Local connectivity, parameter sharing |
| RNN | Hidden state carries sequential memory |

---

## 🎯 Interview Tips

1. **Start simple:** Give intuitive explanation first
2. **Add depth:** Show you understand the math
3. **Be practical:** Mention real implementations
4. **Discuss tradeoffs:** Every choice has pros/cons
5. **Know debugging:** How would you fix problems?

---

## ✅ Week 1 Complete!

You now have comprehensive knowledge of:
- AI fundamentals and history
- Mathematical foundations
- Neural network architecture and training
- Optimization techniques
- FNN, CNN, and RNN architectures

**You're ready for Week 2: Generative Models!** 🚀
