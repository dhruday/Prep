# 📉 Gradient Descent & Optimization

## 📚 Table of Contents

1. [What You'll Learn](#-what-youll-learn)
2. [Section 1: Loss Functions](#-section-1-loss-functions)
3. [Section 2: Gradient Descent](#-section-2-gradient-descent)
4. [Section 3: Backpropagation In-Depth](#-section-3-backpropagation-in-depth)
5. [Section 4: Modern Optimizers](#-section-4-modern-optimizers)
6. [Section 5: Learning Rate Schedules](#️-section-5-learning-rate-schedules)
7. [Section 6: Practical Training Tips](#️-section-6-practical-training-tips)
8. [Homework](#-homework)
9. [Common Mistakes](#️-common-mistakes)
10. [Interview Questions](#-interview-questions)
11. [Chapter Summary](#-chapter-summary)
12. [Next Up](#-next-up)

---

## 🎯 What You'll Learn

This chapter covers the **learning** part of neural networks:
- Loss functions (measuring how wrong we are)
- Gradient descent (how to improve)
- Backpropagation (how gradients flow)
- Modern optimizers (Adam, SGD, etc.)
- Practical training tips

---

## 🎯 Section 1: Loss Functions

### Why We Need Loss Functions

A loss function measures **how wrong** our predictions are:

```
Perfect prediction → Loss = 0
Terrible prediction → Loss = Large

Goal: Minimize loss by adjusting weights
```

---

### 1.1 Mean Squared Error (MSE)

**Used for:** Regression (predicting continuous values)

```
MSE = (1/n) × Σ(yᵢ - ŷᵢ)²

Where:
- y = true values
- ŷ = predicted values
- n = number of samples
```

**Example:**
```
True prices:    [100, 150, 200]
Predicted:      [110, 140, 190]
Errors:         [-10, 10, 10]
Squared:        [100, 100, 100]
MSE = 300/3 = 100
```

**Visual:**
```
Loss
  │
  │      ╲         ╱
  │       ╲       ╱
  │        ╲     ╱
  │         ╲   ╱
  │          ╲ ╱
  └───────────●─────── prediction
           (target)
           
Parabola: loss increases quadratically with error
```

```python
def mse_loss(y_true, y_pred):
    return np.mean((y_true - y_pred) ** 2)

def mse_gradient(y_true, y_pred):
    return 2 * (y_pred - y_true) / len(y_true)
```

---

### 1.2 Binary Cross-Entropy (BCE)

**Used for:** Binary classification (yes/no, 0/1)

```
BCE = -(1/n) × Σ[yᵢ log(ŷᵢ) + (1-yᵢ) log(1-ŷᵢ)]

Where:
- y ∈ {0, 1}
- ŷ ∈ (0, 1) = probability
```

**Why logarithm?**
```
If y = 1 (true class is 1):
    Loss = -log(ŷ)
    ŷ = 0.9 → Loss = 0.1  (good prediction, low loss)
    ŷ = 0.1 → Loss = 2.3  (bad prediction, high loss)
    ŷ = 0.01 → Loss = 4.6 (very bad, very high loss)

The log penalizes confident wrong predictions heavily!
```

```python
def binary_cross_entropy(y_true, y_pred):
    epsilon = 1e-15
    y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
    return -np.mean(
        y_true * np.log(y_pred) + 
        (1 - y_true) * np.log(1 - y_pred)
    )

def bce_gradient(y_true, y_pred):
    epsilon = 1e-15
    y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
    return (y_pred - y_true) / (y_pred * (1 - y_pred)) / len(y_true)
```

---

### 1.3 Categorical Cross-Entropy

**Used for:** Multi-class classification (cat/dog/bird)

```
CCE = -Σᵢ Σⱼ yᵢⱼ log(ŷᵢⱼ)

Where:
- y is one-hot encoded: [0, 1, 0]
- ŷ is softmax output: [0.1, 0.7, 0.2]
```

**Example:**
```
True class: 2 (one-hot: [0, 0, 1])
Prediction: softmax([1.0, 2.0, 0.5]) = [0.21, 0.57, 0.22]

Loss = -log(0.22) = 1.51

If prediction was [0.1, 0.1, 0.8]:
Loss = -log(0.8) = 0.22 (much better!)
```

```python
def categorical_cross_entropy(y_true, y_pred):
    epsilon = 1e-15
    y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
    return -np.sum(y_true * np.log(y_pred)) / len(y_true)

def softmax(z):
    exp_z = np.exp(z - np.max(z, axis=-1, keepdims=True))
    return exp_z / np.sum(exp_z, axis=-1, keepdims=True)
```

---

### Loss Function Summary

| Loss | Formula | Use Case | Output Activation |
|------|---------|----------|-------------------|
| MSE | Σ(y-ŷ)²/n | Regression | None (linear) |
| BCE | -Σ[y log ŷ + (1-y) log(1-ŷ)] | Binary classification | Sigmoid |
| CCE | -Σ y log ŷ | Multi-class | Softmax |
| Huber | MSE if small, MAE if large | Robust regression | None |

---

## 📉 Section 2: Gradient Descent

### The Core Idea

```
1. Start with random weights
2. Make predictions
3. Calculate loss
4. Calculate gradients (how to change weights to reduce loss)
5. Update weights: w = w - lr × gradient
6. Repeat until loss is small
```

**Visual:**
```
Loss Surface (imagine a bowl):

        ╲         ╱
         ╲       ╱
          ╲     ╱
           ╲   ╱    ← We're here (random start)
            ╲ ╱     
             ●      ← We want to be here (minimum)
             
Gradient points uphill → we go opposite direction (downhill)
```

---

### 2.1 Vanilla Gradient Descent

```python
# Pseudocode
for epoch in range(epochs):
    # Forward pass
    predictions = model(X)
    
    # Calculate loss
    loss = loss_function(y, predictions)
    
    # Calculate gradients
    gradients = calculate_gradients(loss, model.parameters)
    
    # Update parameters
    for param, grad in zip(model.parameters, gradients):
        param = param - learning_rate * grad
```

**Full Example:**

```python
import numpy as np

# Simple linear regression: y = wx + b
np.random.seed(42)

# Generate data
X = np.random.randn(100, 1)
y_true = 3 * X + 2 + np.random.randn(100, 1) * 0.1  # y = 3x + 2 + noise

# Initialize parameters
w = np.random.randn(1)
b = np.zeros(1)

# Training settings
lr = 0.1
epochs = 100

print("Learning y = 3x + 2")
print("-" * 40)

for epoch in range(epochs):
    # Forward pass
    y_pred = X * w + b
    
    # Loss (MSE)
    loss = np.mean((y_true - y_pred) ** 2)
    
    # Gradients
    dw = -2 * np.mean(X * (y_true - y_pred))
    db = -2 * np.mean(y_true - y_pred)
    
    # Update
    w = w - lr * dw
    b = b - lr * db
    
    if epoch % 20 == 0:
        print(f"Epoch {epoch}: w={w[0]:.4f}, b={b[0]:.4f}, loss={loss:.6f}")

print("-" * 40)
print(f"Learned: y = {w[0]:.2f}x + {b[0]:.2f}")
print(f"Actual:  y = 3.00x + 2.00")
```

---

### 2.2 Stochastic Gradient Descent (SGD)

**Problem with vanilla GD:** Uses ALL data to compute one gradient update

**Solution:** Update after each sample (or small batch)

```
Variants:
- Batch GD: Use all data → 1 update per epoch
- Stochastic GD: Use 1 sample → N updates per epoch
- Mini-batch GD: Use B samples → N/B updates per epoch
```

```python
def sgd_update(X, y, w, b, lr, batch_size=32):
    n = len(X)
    indices = np.random.permutation(n)
    
    for start in range(0, n, batch_size):
        end = start + batch_size
        batch_indices = indices[start:end]
        
        X_batch = X[batch_indices]
        y_batch = y[batch_indices]
        
        # Forward
        y_pred = X_batch @ w + b
        
        # Gradients
        error = y_pred - y_batch
        dw = X_batch.T @ error / len(X_batch)
        db = np.mean(error)
        
        # Update
        w = w - lr * dw
        b = b - lr * db
    
    return w, b
```

**Why mini-batch?**
```
Batch size:    Memory    Noise    Parallelism    Updates/epoch
────────────────────────────────────────────────────────────────
1 (SGD)        Low       High     None           N
32 (typical)   Medium    Medium   Good           N/32
N (batch)      High      Low      Max            1

Sweet spot: 32-256 (fits GPU, good gradients, enough updates)
```

---

### 2.3 Learning Rate

The most important hyperparameter!

```
Too small: Training is slow
           w = w - 0.0001 × grad  → tiny steps
           
Too large: Training is unstable (may diverge)
           w = w - 10 × grad  → overshoots minimum
           
Just right: Fast and stable convergence
```

**Visual:**
```
Learning Rate Effects:

Too Small:          Just Right:         Too Large:
●→→→→→→→→●         ●→→→●               ●→←→←→←→
(slow)              (efficient)         (oscillates/diverges)
```

---

## 🔄 Section 3: Backpropagation In-Depth

### The Chain Rule Revisited

For a neural network:
```
Input x → Layer1(W1) → h1 → Layer2(W2) → h2 → Loss L

To update W1, we need ∂L/∂W1:

∂L/∂W1 = ∂L/∂h2 × ∂h2/∂h1 × ∂h1/∂W1
         ↑          ↑          ↑
    from output  through   local
                 layer2    gradient
```

### Step-by-Step Backprop

```python
# 2-layer network: x → h1 = relu(xW1 + b1) → y = sigmoid(h1W2 + b2)

class TwoLayerNet:
    def __init__(self, input_size, hidden_size, output_size):
        self.W1 = np.random.randn(input_size, hidden_size) * 0.01
        self.b1 = np.zeros((1, hidden_size))
        self.W2 = np.random.randn(hidden_size, output_size) * 0.01
        self.b2 = np.zeros((1, output_size))
    
    def forward(self, X):
        # Layer 1
        self.z1 = X @ self.W1 + self.b1
        self.h1 = np.maximum(0, self.z1)  # ReLU
        
        # Layer 2
        self.z2 = self.h1 @ self.W2 + self.b2
        self.y = 1 / (1 + np.exp(-self.z2))  # Sigmoid
        
        self.X = X  # Save for backprop
        return self.y
    
    def backward(self, y_true, lr=0.01):
        m = y_true.shape[0]
        
        # Output layer gradient
        # For sigmoid + BCE: dL/dz2 = y_pred - y_true
        dz2 = self.y - y_true
        
        # Gradients for W2, b2
        dW2 = self.h1.T @ dz2 / m
        db2 = np.sum(dz2, axis=0, keepdims=True) / m
        
        # Backprop to hidden layer
        dh1 = dz2 @ self.W2.T
        
        # ReLU gradient
        dz1 = dh1 * (self.z1 > 0)
        
        # Gradients for W1, b1
        dW1 = self.X.T @ dz1 / m
        db1 = np.sum(dz1, axis=0, keepdims=True) / m
        
        # Update weights
        self.W2 -= lr * dW2
        self.b2 -= lr * db2
        self.W1 -= lr * dW1
        self.b1 -= lr * db1
        
        return {'W1': dW1, 'W2': dW2}  # Return for inspection


# Demo
net = TwoLayerNet(2, 4, 1)

# XOR data
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y = np.array([[0], [1], [1], [0]])

# Training
for epoch in range(10000):
    # Forward
    y_pred = net.forward(X)
    
    # Loss
    loss = -np.mean(y * np.log(y_pred + 1e-8) + (1-y) * np.log(1-y_pred + 1e-8))
    
    # Backward
    net.backward(y, lr=1.0)
    
    if epoch % 2000 == 0:
        print(f"Epoch {epoch}: Loss = {loss:.4f}")

# Test
print("\nResults:")
for xi, yi in zip(X, y):
    pred = net.forward(xi.reshape(1, -1))[0, 0]
    print(f"{xi} → {pred:.4f} (actual: {yi[0]})")
```

---

## ⚡ Section 4: Modern Optimizers

### 4.1 Momentum

**Problem:** SGD oscillates in narrow valleys

**Solution:** Add "momentum" - remember past gradients

```
velocity = β × velocity + gradient
w = w - lr × velocity

β (momentum) typically = 0.9
```

**Visual:**
```
Without momentum:          With momentum:
  ↗                         ↗
 ↙                          →→→→→●
  ↗                        (builds up speed
 ↙                          in consistent direction)
(oscillates)
```

```python
class SGDMomentum:
    def __init__(self, lr=0.01, momentum=0.9):
        self.lr = lr
        self.momentum = momentum
        self.velocity = {}
    
    def update(self, params, grads):
        for key in params:
            if key not in self.velocity:
                self.velocity[key] = np.zeros_like(params[key])
            
            self.velocity[key] = self.momentum * self.velocity[key] + grads[key]
            params[key] -= self.lr * self.velocity[key]
```

---

### 4.2 AdaGrad

**Idea:** Adapt learning rate per parameter

```
cache = cache + gradient²
w = w - (lr / √(cache + ε)) × gradient

Parameters with large gradients → smaller effective lr
Parameters with small gradients → larger effective lr
```

**Problem:** Learning rate keeps decreasing, eventually stops learning

---

### 4.3 RMSprop

**Fixes AdaGrad:** Use exponential moving average of squared gradients

```
cache = β × cache + (1-β) × gradient²
w = w - (lr / √(cache + ε)) × gradient
```

```python
class RMSprop:
    def __init__(self, lr=0.001, beta=0.9, eps=1e-8):
        self.lr = lr
        self.beta = beta
        self.eps = eps
        self.cache = {}
    
    def update(self, params, grads):
        for key in params:
            if key not in self.cache:
                self.cache[key] = np.zeros_like(params[key])
            
            self.cache[key] = self.beta * self.cache[key] + (1 - self.beta) * grads[key]**2
            params[key] -= self.lr * grads[key] / (np.sqrt(self.cache[key]) + self.eps)
```

---

### 4.4 Adam (Adaptive Moment Estimation)

**The default optimizer.** Combines momentum + RMSprop.

```
# First moment (mean of gradients) - like momentum
m = β₁ × m + (1-β₁) × gradient

# Second moment (variance of gradients) - like RMSprop
v = β₂ × v + (1-β₂) × gradient²

# Bias correction (important at start)
m_hat = m / (1 - β₁ᵗ)
v_hat = v / (1 - β₂ᵗ)

# Update
w = w - lr × m_hat / (√v_hat + ε)

Typical values: β₁=0.9, β₂=0.999, ε=1e-8
```

```python
class Adam:
    def __init__(self, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.m = {}  # First moment
        self.v = {}  # Second moment
        self.t = 0   # Timestep
    
    def update(self, params, grads):
        self.t += 1
        
        for key in params:
            if key not in self.m:
                self.m[key] = np.zeros_like(params[key])
                self.v[key] = np.zeros_like(params[key])
            
            # Update moments
            self.m[key] = self.beta1 * self.m[key] + (1 - self.beta1) * grads[key]
            self.v[key] = self.beta2 * self.v[key] + (1 - self.beta2) * grads[key]**2
            
            # Bias correction
            m_hat = self.m[key] / (1 - self.beta1**self.t)
            v_hat = self.v[key] / (1 - self.beta2**self.t)
            
            # Update parameters
            params[key] -= self.lr * m_hat / (np.sqrt(v_hat) + self.eps)
```

---

### 4.5 AdamW (Adam with Weight Decay)

**Fix for Adam:** Proper L2 regularization

```
# Regular Adam adds L2 to gradient (problematic)
gradient = gradient + λ × w

# AdamW decouples weight decay
w = w - lr × adam_update - lr × λ × w
```

**Used in:** Most modern deep learning (BERT, GPT, etc.)

---

### Optimizer Comparison

| Optimizer | Advantages | Disadvantages | When to use |
|-----------|------------|---------------|-------------|
| SGD | Simple, generalizes well | Slow, needs tuning | Final training for best accuracy |
| SGD+Momentum | Faster than SGD | Still needs tuning | When SGD is too slow |
| Adam | Fast, works out-of-box | May generalize worse | Default choice, quick experiments |
| AdamW | Adam + proper regularization | Slightly more complex | Production, large models |

---

## 🎛️ Section 5: Learning Rate Schedules

### Why Schedule Learning Rate?

```
High LR at start → Fast progress
Low LR at end → Fine-tune to minimum

         Loss
           │
           │╲
           │ ╲_____ ← high LR gets here fast
           │      ╲_____ ← low LR fine-tunes
           │            ╲___● minimum
           └─────────────────────
                    Epochs
```

---

### 5.1 Step Decay

```python
def step_decay(epoch, initial_lr=0.1, drop=0.5, epochs_drop=10):
    """Reduce LR by factor every N epochs"""
    return initial_lr * (drop ** (epoch // epochs_drop))

# LR: 0.1 → 0.05 → 0.025 → ...
```

---

### 5.2 Cosine Annealing

```python
import math

def cosine_annealing(epoch, total_epochs, initial_lr=0.1, min_lr=0):
    """Smooth cosine decay"""
    return min_lr + (initial_lr - min_lr) * (1 + math.cos(math.pi * epoch / total_epochs)) / 2
```

---

### 5.3 Warmup + Decay

```python
def warmup_cosine(epoch, total_epochs, warmup_epochs=5, initial_lr=0.1):
    """Linear warmup then cosine decay"""
    if epoch < warmup_epochs:
        return initial_lr * epoch / warmup_epochs
    else:
        progress = (epoch - warmup_epochs) / (total_epochs - warmup_epochs)
        return initial_lr * (1 + math.cos(math.pi * progress)) / 2

# Used in Transformers: prevents early instability
```

---

## 🛠️ Section 6: Practical Training Tips

### Debugging Checklist

```
□ Data is correct (visualize samples)
□ Model can overfit 1 batch (proves learning works)
□ Loss is decreasing
□ Gradients are not NaN or 0
□ Learning rate is appropriate
□ Batch size fits in memory
```

### Common Issues

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Loss = NaN | LR too high, division by 0 | Lower LR, add epsilon |
| Loss doesn't decrease | LR too low, bug in code | Increase LR, check gradients |
| Loss decreases then increases | Overfitting | Add regularization, early stopping |
| Loss oscillates wildly | LR too high | Reduce LR |
| Training slow | LR too low | Increase LR |

### Hyperparameter Starting Points

```python
# Good defaults
learning_rate = 0.001  # For Adam
learning_rate = 0.01   # For SGD
batch_size = 32        # Good balance
epochs = 100           # Start here, add early stopping

# Scale LR with batch size
# If batch_size doubles, can increase LR by √2
```

---

## 📝 Homework

### Easy
1. What is the gradient of MSE loss with respect to predictions?
2. Compare SGD and Adam - list 2 advantages of each
3. What learning rate would you try first for Adam?

### Medium
4. Implement momentum from scratch
5. Why does Adam have bias correction?
6. Train a network with different LR schedules, compare results

### Advanced
7. Implement AdamW with gradient clipping
8. Derive the gradient of softmax cross-entropy loss
9. Implement learning rate finder (increase LR until loss explodes)

---

## ⚠️ Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---------|----------------|------------------|
| Same LR for all layers | Different layers need different LR | Use layer-wise LR or Adam |
| No gradient clipping | Gradients can explode | Clip gradients (max norm ~1.0) |
| Huge batch size | Doesn't fit GPU, poor generalization | 32-256 typical |
| Training too long | Overfitting | Use early stopping |
| Ignoring validation loss | Only looking at train loss | Monitor both |

---

## 🎤 Interview Questions

### Beginner

**Q1: What is gradient descent?**
> Iterative optimization: compute gradient of loss w.r.t. parameters, update parameters in opposite direction of gradient. Repeat until convergence.

**Q2: What is the purpose of a learning rate?**
> Controls step size of updates. Too high = unstable/diverge. Too low = slow convergence. Must be tuned.

**Q3: What is mini-batch gradient descent?**
> Instead of using all data (batch GD) or one sample (SGD), use small batches (typically 32-256). Balances gradient quality with computational efficiency.

### Intermediate

**Q4: Explain Adam optimizer.**
> Adam combines momentum (exponential moving average of gradients) with RMSprop (adaptive per-parameter learning rates). Maintains first moment (mean) and second moment (variance) of gradients, with bias correction for early steps.

**Q5: Why use learning rate warmup?**
> At start of training, parameters are random and gradients can be large/noisy. Warmup starts with small LR to stabilize, then increases. Essential for large batch training and Transformers.

**Q6: What is gradient clipping?**
> Limiting gradient magnitude to prevent exploding gradients. Two types: clip by value (each element) or clip by norm (scale vector if norm exceeds threshold).

### Advanced/FAANG

**Q7: Compare SGD and Adam for training neural networks.**
> **SGD:** Simpler, often generalizes better, but needs careful LR tuning and is slower to converge.
> **Adam:** Faster convergence, adaptive LR, less tuning, but can generalize worse and has memory overhead.
> **Practice:** Adam for quick experiments, SGD+momentum for final training when maximum performance needed.

**Q8: Derive backpropagation for a 2-layer network.**
> For y = σ(ReLU(xW₁ + b₁)W₂ + b₂):
> 
> Forward: z₁ = xW₁ + b₁, h₁ = ReLU(z₁), z₂ = h₁W₂ + b₂, ŷ = σ(z₂)
> 
> Backward (using chain rule):
> - dL/dz₂ = ŷ - y (for BCE+sigmoid)
> - dL/dW₂ = h₁ᵀ @ dL/dz₂
> - dL/dh₁ = dL/dz₂ @ W₂ᵀ
> - dL/dz₁ = dL/dh₁ ⊙ (z₁ > 0)
> - dL/dW₁ = xᵀ @ dL/dz₁

---

## ✅ Chapter Summary

| Concept | Key Takeaway |
|---------|--------------|
| Loss Functions | MSE for regression, BCE for binary, CCE for multi-class |
| Gradient Descent | w = w - lr × ∂L/∂w |
| Backpropagation | Chain rule applied layer by layer |
| Adam | Default optimizer: momentum + adaptive LR |
| Learning Rate | Most important hyperparameter |
| LR Schedule | High at start, low at end |

---

## 🔜 Next Up

Continue to → [05-Network-Architectures.md](./05-Network-Architectures.md)

Now that you understand how networks learn, we'll explore different architectures:
- Feedforward Networks (FNN)
- Convolutional Networks (CNN) for images
- Recurrent Networks (RNN) for sequences

*Same learning principles, different structures for different data!* 🏗️
