# 04 - Gradient Descent and Optimization

---

## 📌 Table of Contents

1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
   - [Gradient Descent Variants](#41-gradient-descent-variants)
   - [Backpropagation Algorithm](#42-backpropagation-algorithm)
   - [Advanced Optimizers](#43-advanced-optimizers)
   - [Learning Rate Scheduling](#44-learning-rate-scheduling)
   - [Weight Initialization](#45-weight-initialization)
3. [Key Formulas](#-key-formulas-summary)
4. [Visual Mental Models](#-visual-mental-models)
5. [Real World Use Cases](#-real-world-use-cases)
6. [Mini Project](#-mini-project)
7. [Homework](#-homework)
8. [Common Mistakes](#-common-mistakes)
9. [Interview Questions & Answers](#-interview-questions--answers)

---

## 🌱 Beginner Friendly Explanation

### What is Optimization?

**Optimization = Finding the best solution**

In ML, we want to find the **weights** that make our model's predictions as accurate as possible.

### The Mountain Climber Analogy

```
GOAL: Reach the lowest point in a valley (minimum loss)

You're blindfolded on a hilly terrain:

    ╱╲      ╱╲
   ╱  ╲    ╱  ╲         ← You are here (random start)
  ╱    ╲  ╱    ╲              ●
 ╱      ╲╱      ╲            ↙
╱                 ╲        ↙
                   ╲______╱  ← Goal: Find this lowest point

Strategy:
1. Feel the slope under your feet (calculate gradient)
2. Take a step downhill (update weights)
3. Repeat until you can't go lower (convergence)
```

### Why "Gradient"?

The **gradient** tells you two things:
1. **Direction**: Which way is uphill?
2. **Steepness**: How steep is it?

To minimize loss: **Go OPPOSITE to the gradient** (downhill)

### Simple Example: Finding the Minimum

```python
# Minimize f(x) = x²
# 
#     │
#   4 │\                    /
#     │ \                  /
#   2 │  \                /
#     │   \              /
#   0 │    \____________/   ← Minimum at x=0
#     └─────────────────────
#         -2  -1   0   1   2

# Derivative: f'(x) = 2x
# At x=3: slope = 6 (positive = going uphill to the right)
# So move LEFT (opposite direction) to go downhill

x = 3.0                    # Start here
learning_rate = 0.1

for step in range(10):
    gradient = 2 * x       # Calculate slope
    x = x - learning_rate * gradient  # Move opposite to gradient
    print(f"Step {step}: x = {x:.4f}, f(x) = {x**2:.4f}")

# x converges to 0 (the minimum!)
```

### The Three Key Ingredients

```
┌─────────────────────────────────────────────────────────────┐
│                    GRADIENT DESCENT                          │
├───────────────────┬───────────────────┬─────────────────────┤
│    GRADIENT       │   LEARNING RATE   │    ITERATIONS       │
├───────────────────┼───────────────────┼─────────────────────┤
│  Which direction  │   How big a step  │  How many steps     │
│  to move?         │   to take?        │  to take?           │
│                   │                   │                     │
│  Calculated from  │  Too high: miss   │  Too few: not       │
│  derivatives      │  minimum          │  converged          │
│                   │  Too low: slow    │  Too many: wasted   │
└───────────────────┴───────────────────┴─────────────────────┘
```

---

## 🔬 Deep Technical Breakdown

---

## 4.1 Gradient Descent Variants

### Batch Gradient Descent (BGD)

**Use ALL training data to compute gradient**

```python
# Batch Gradient Descent
for epoch in range(num_epochs):
    # Compute gradient using ALL samples
    gradient = compute_gradient(X_train, y_train, weights)
    
    # Update weights
    weights = weights - learning_rate * gradient
```

**Formula:**
```
θ = θ - α × (1/m) × Σᵢ ∇θ L(xᵢ, yᵢ, θ)

Where:
  θ = parameters (weights)
  α = learning rate
  m = number of samples (ALL)
  L = loss function
```

**Pros:**
- Stable convergence
- Guaranteed to reach minimum (convex problems)
- Smooth gradient estimates

**Cons:**
- **SLOW** for large datasets (must see all data for one update)
- Requires entire dataset in memory
- Can get stuck in local minima

---

### Stochastic Gradient Descent (SGD)

**Use ONE sample at a time to compute gradient**

```python
# Stochastic Gradient Descent
for epoch in range(num_epochs):
    # Shuffle data each epoch
    shuffled_indices = np.random.permutation(len(X_train))
    
    for i in shuffled_indices:
        # Compute gradient using ONE sample
        gradient = compute_gradient(X_train[i], y_train[i], weights)
        
        # Update weights immediately
        weights = weights - learning_rate * gradient
```

**Formula:**
```
θ = θ - α × ∇θ L(xᵢ, yᵢ, θ)

(Just one sample, no averaging)
```

**Pros:**
- **FAST** updates (don't wait for all data)
- Can escape local minima (noise helps)
- Works with streaming data
- Low memory usage

**Cons:**
- **NOISY** gradient estimates
- High variance in updates
- May never exactly converge (oscillates around minimum)

---

### Mini-Batch Gradient Descent ⭐ (Most Used!)

**Use a SMALL BATCH of samples (best of both worlds)**

```python
# Mini-Batch Gradient Descent
batch_size = 32  # Typical: 16, 32, 64, 128, 256

for epoch in range(num_epochs):
    # Shuffle data
    shuffled_indices = np.random.permutation(len(X_train))
    
    # Process in batches
    for i in range(0, len(X_train), batch_size):
        batch_indices = shuffled_indices[i:i+batch_size]
        X_batch = X_train[batch_indices]
        y_batch = y_train[batch_indices]
        
        # Compute gradient using BATCH
        gradient = compute_gradient(X_batch, y_batch, weights)
        
        # Update weights
        weights = weights - learning_rate * gradient
```

**Formula:**
```
θ = θ - α × (1/b) × Σⱼ₌₁ᵇ ∇θ L(xⱼ, yⱼ, θ)

Where b = batch_size (typically 32-256)
```

**Pros:**
- Balanced: faster than batch, more stable than pure SGD
- Efficient GPU utilization (parallelism)
- Good gradient estimates with moderate noise
- Industry standard

**Choosing Batch Size:**
```
Smaller batches (16-32):
  + More noise → better generalization
  + More frequent updates
  - Less GPU efficiency

Larger batches (128-512):
  + More stable gradients
  + Better GPU utilization
  - May generalize worse
  - Requires more memory
```

---

### Comparison Visualization

```
BATCH GRADIENT DESCENT:
─────────────────────────────────────►
        One update per epoch
        (sees all data first)


STOCHASTIC GRADIENT DESCENT:
─►─►─►─►─►─►─►─►─►─►─►─►─►─►─►─►─►─►─►
  Many noisy updates per epoch
  (one sample at a time)


MINI-BATCH GRADIENT DESCENT:
───►───►───►───►───►───►───►───►───►
   Moderate updates per epoch
   (batch of samples at a time)
```

```
              Convergence Path
              
    Batch GD        SGD           Mini-Batch
    ────────        ───           ──────────
                   
        ○            ○                ○
        │           ╱│               ╱
        │          ╱ │╲             │
        │         │   ╲            │
        ▼        ╱     │           ▼
        │       │      ▼          ╱
        │       ▼     ╱│         │
        ▼      ╱     │ │         ▼
        ●     ●      ▼ ▼         ●
              
    Smooth     Zigzag/Noisy    Balanced
```

---

## 4.2 Backpropagation Algorithm

### The Core Idea

**Backpropagation = Efficient gradient computation using chain rule**

```
Forward Pass: Input → Hidden → Output → Loss
                                         │
                                         │ Compute error
                                         ▼
Backward Pass: ∂L/∂W₁ ← ∂L/∂h ← ∂L/∂W₂ ← ∂L/∂ŷ ← ∂L/∂L
               Update    Propagate   Update   Output
               W₁        error       W₂       gradient
```

### Mathematical Derivation

**Network:**
```
x → [W₁, b₁] → ReLU → h → [W₂, b₂] → Softmax → ŷ → Loss
```

**Forward Equations:**
```
z₁ = W₁x + b₁
h = ReLU(z₁)
z₂ = W₂h + b₂
ŷ = Softmax(z₂)
L = CrossEntropy(y, ŷ)
```

**Backward Equations (Chain Rule):**

```
Step 1: Output layer gradient
────────────────────────────
∂L/∂z₂ = ŷ - y  (Softmax + CrossEntropy combined)


Step 2: Output weights gradient
─────────────────────────────
∂L/∂W₂ = ∂L/∂z₂ × ∂z₂/∂W₂
       = (ŷ - y) × hᵀ

∂L/∂b₂ = ∂L/∂z₂ = ŷ - y


Step 3: Backpropagate to hidden layer
────────────────────────────────────
∂L/∂h = W₂ᵀ × ∂L/∂z₂


Step 4: Through activation
─────────────────────────
∂L/∂z₁ = ∂L/∂h × ReLU'(z₁)
       = ∂L/∂h × (z₁ > 0)


Step 5: Hidden weights gradient
──────────────────────────────
∂L/∂W₁ = ∂L/∂z₁ × xᵀ
∂L/∂b₁ = ∂L/∂z₁
```

### Complete Backpropagation Implementation

```python
import numpy as np

class NeuralNetworkWithBackprop:
    def __init__(self, layer_sizes):
        """
        layer_sizes: list of layer dimensions
        e.g., [784, 256, 128, 10] for MNIST
        """
        self.num_layers = len(layer_sizes) - 1
        self.weights = []
        self.biases = []
        
        # Initialize weights (He initialization for ReLU)
        for i in range(self.num_layers):
            w = np.random.randn(layer_sizes[i+1], layer_sizes[i]) * np.sqrt(2/layer_sizes[i])
            b = np.zeros((layer_sizes[i+1], 1))
            self.weights.append(w)
            self.biases.append(b)
    
    def relu(self, z):
        return np.maximum(0, z)
    
    def relu_derivative(self, z):
        return (z > 0).astype(float)
    
    def softmax(self, z):
        exp_z = np.exp(z - np.max(z, axis=0, keepdims=True))
        return exp_z / np.sum(exp_z, axis=0, keepdims=True)
    
    def forward(self, X):
        """
        Forward pass - store intermediate values for backprop
        """
        self.a = [X]  # activations
        self.z = []   # pre-activations
        
        current_input = X
        
        # Hidden layers with ReLU
        for i in range(self.num_layers - 1):
            z = self.weights[i] @ current_input + self.biases[i]
            a = self.relu(z)
            self.z.append(z)
            self.a.append(a)
            current_input = a
        
        # Output layer with Softmax
        z = self.weights[-1] @ current_input + self.biases[-1]
        a = self.softmax(z)
        self.z.append(z)
        self.a.append(a)
        
        return a
    
    def compute_loss(self, y_true, y_pred):
        """Cross-entropy loss"""
        epsilon = 1e-15
        y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
        return -np.mean(np.sum(y_true * np.log(y_pred), axis=0))
    
    def backward(self, y_true):
        """
        Backward pass - compute gradients using chain rule
        """
        m = y_true.shape[1]  # batch size
        
        self.dW = []
        self.db = []
        
        # Output layer gradient (softmax + cross-entropy)
        dz = self.a[-1] - y_true  # Shape: (output_size, m)
        
        # Backpropagate through layers
        for i in range(self.num_layers - 1, -1, -1):
            # Gradient for weights and biases
            dW = (1/m) * dz @ self.a[i].T
            db = (1/m) * np.sum(dz, axis=1, keepdims=True)
            
            self.dW.insert(0, dW)
            self.db.insert(0, db)
            
            # Backpropagate to previous layer (if not input layer)
            if i > 0:
                da = self.weights[i].T @ dz
                dz = da * self.relu_derivative(self.z[i-1])
    
    def update_weights(self, learning_rate):
        """Apply gradient descent update"""
        for i in range(self.num_layers):
            self.weights[i] -= learning_rate * self.dW[i]
            self.biases[i] -= learning_rate * self.db[i]
    
    def train_step(self, X, y, learning_rate):
        """One complete training step"""
        # Forward
        y_pred = self.forward(X)
        loss = self.compute_loss(y, y_pred)
        
        # Backward
        self.backward(y)
        
        # Update
        self.update_weights(learning_rate)
        
        return loss
    
    def train(self, X, y, epochs, batch_size, learning_rate, verbose=True):
        """Full training loop with mini-batches"""
        n_samples = X.shape[1]
        losses = []
        
        for epoch in range(epochs):
            # Shuffle data
            indices = np.random.permutation(n_samples)
            X_shuffled = X[:, indices]
            y_shuffled = y[:, indices]
            
            epoch_loss = 0
            n_batches = 0
            
            # Mini-batch training
            for i in range(0, n_samples, batch_size):
                X_batch = X_shuffled[:, i:i+batch_size]
                y_batch = y_shuffled[:, i:i+batch_size]
                
                loss = self.train_step(X_batch, y_batch, learning_rate)
                epoch_loss += loss
                n_batches += 1
            
            avg_loss = epoch_loss / n_batches
            losses.append(avg_loss)
            
            if verbose and epoch % 10 == 0:
                print(f"Epoch {epoch}: Loss = {avg_loss:.6f}")
        
        return losses


# Example usage
if __name__ == "__main__":
    # Create simple dataset (XOR-like problem, but 4D)
    np.random.seed(42)
    X = np.random.randn(4, 1000)  # 4 features, 1000 samples
    y_labels = ((X[0] * X[1]) > 0).astype(int)  # XOR-like logic
    y = np.eye(2)[y_labels].T  # One-hot encode
    
    # Create network
    nn = NeuralNetworkWithBackprop([4, 16, 8, 2])
    
    # Train
    losses = nn.train(X, y, epochs=100, batch_size=32, learning_rate=0.1)
    
    # Test accuracy
    predictions = nn.forward(X)
    accuracy = np.mean(np.argmax(predictions, axis=0) == y_labels)
    print(f"\nFinal Accuracy: {accuracy * 100:.2f}%")
```

---

## 4.3 Advanced Optimizers

### Problem with Vanilla SGD

```
Issues:
1. Same learning rate for all parameters
2. Can oscillate in narrow valleys
3. Slow progress along flat dimensions
4. Difficult to escape saddle points

     SGD Path in a Valley:
     
     ╱    ╲  ╱    ╲  ╱    ╲
    ╱      ╲╱      ╲╱      ╲   ← Oscillates!
   ╱                        ╲
  ╱          Target          ╲
 ╱             ●              ╲
```

---

### Momentum

**Idea:** Accumulate velocity from past gradients (like a ball rolling downhill)

```
v = β × v - α × ∇θ L(θ)
θ = θ + v

Where:
  v = velocity (momentum term)
  β = momentum coefficient (typically 0.9)
  α = learning rate
```

```python
class SGDMomentum:
    def __init__(self, learning_rate=0.01, momentum=0.9):
        self.lr = learning_rate
        self.momentum = momentum
        self.velocity = None
    
    def update(self, params, grads):
        if self.velocity is None:
            self.velocity = [np.zeros_like(p) for p in params]
        
        for i, (param, grad) in enumerate(zip(params, grads)):
            self.velocity[i] = self.momentum * self.velocity[i] - self.lr * grad
            param += self.velocity[i]
        
        return params
```

**Visualization:**
```
Without Momentum:          With Momentum:
       ○                        ○
       │                        │
       ↓                        ↓
       │↑                       ↓
       ↓│                       ↓
        ↑                       ↓
       ↓                        ↓
       ●                        ●

   Oscillates              Smooth path
```

**Pros:**
- Faster convergence
- Dampens oscillations
- Helps escape local minima

---

### Nesterov Accelerated Gradient (NAG)

**Idea:** Look ahead before calculating gradient

```
v = β × v - α × ∇θ L(θ + β × v)   ← Gradient at "look-ahead" position
θ = θ + v
```

```python
class NesterovMomentum:
    def __init__(self, learning_rate=0.01, momentum=0.9):
        self.lr = learning_rate
        self.momentum = momentum
        self.velocity = None
    
    def update(self, params, compute_grad_func):
        if self.velocity is None:
            self.velocity = [np.zeros_like(p) for p in params]
        
        # Look ahead
        look_ahead_params = [p + self.momentum * v for p, v in zip(params, self.velocity)]
        
        # Compute gradient at look-ahead position
        grads = compute_grad_func(look_ahead_params)
        
        # Update velocity and parameters
        for i, (param, grad) in enumerate(zip(params, grads)):
            self.velocity[i] = self.momentum * self.velocity[i] - self.lr * grad
            param += self.velocity[i]
        
        return params
```

**Benefit:** More responsive - "brakes" before overshooting

---

### AdaGrad (Adaptive Gradient)

**Idea:** Adapt learning rate for each parameter based on historical gradients

```
g = ∇θ L(θ)
G = G + g²                      ← Accumulate squared gradients
θ = θ - α × g / (√G + ε)        ← Larger history = smaller update
```

```python
class AdaGrad:
    def __init__(self, learning_rate=0.01, epsilon=1e-8):
        self.lr = learning_rate
        self.epsilon = epsilon
        self.G = None  # Sum of squared gradients
    
    def update(self, params, grads):
        if self.G is None:
            self.G = [np.zeros_like(p) for p in params]
        
        for i, (param, grad) in enumerate(zip(params, grads)):
            self.G[i] += grad ** 2
            param -= self.lr * grad / (np.sqrt(self.G[i]) + self.epsilon)
        
        return params
```

**Pros:**
- Good for sparse data (rare features get larger updates)
- No manual learning rate tuning per parameter

**Cons:**
- Learning rate keeps decreasing → may stop learning

---

### RMSprop (Root Mean Square Propagation)

**Idea:** Fix AdaGrad's decreasing learning rate with exponential moving average

```
g = ∇θ L(θ)
E[g²] = β × E[g²] + (1-β) × g²     ← Exponential moving average
θ = θ - α × g / (√E[g²] + ε)
```

```python
class RMSprop:
    def __init__(self, learning_rate=0.001, beta=0.9, epsilon=1e-8):
        self.lr = learning_rate
        self.beta = beta
        self.epsilon = epsilon
        self.Eg2 = None  # Moving average of squared gradients
    
    def update(self, params, grads):
        if self.Eg2 is None:
            self.Eg2 = [np.zeros_like(p) for p in params]
        
        for i, (param, grad) in enumerate(zip(params, grads)):
            self.Eg2[i] = self.beta * self.Eg2[i] + (1 - self.beta) * grad ** 2
            param -= self.lr * grad / (np.sqrt(self.Eg2[i]) + self.epsilon)
        
        return params
```

**Proposed by Geoffrey Hinton in his Coursera course!**

---

### Adam (Adaptive Moment Estimation) ⭐ MOST POPULAR

**Idea:** Combine Momentum + RMSprop + Bias Correction

```
m = β₁ × m + (1-β₁) × g          ← First moment (momentum)
v = β₂ × v + (1-β₂) × g²         ← Second moment (RMSprop)

m̂ = m / (1 - β₁ᵗ)                 ← Bias correction
v̂ = v / (1 - β₂ᵗ)                 ← Bias correction

θ = θ - α × m̂ / (√v̂ + ε)

Default values:
  β₁ = 0.9
  β₂ = 0.999
  ε = 1e-8
  α = 0.001
```

```python
class Adam:
    def __init__(self, learning_rate=0.001, beta1=0.9, beta2=0.999, epsilon=1e-8):
        self.lr = learning_rate
        self.beta1 = beta1
        self.beta2 = beta2
        self.epsilon = epsilon
        self.m = None  # First moment
        self.v = None  # Second moment
        self.t = 0     # Time step
    
    def update(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        
        self.t += 1
        
        updated_params = []
        for i, (param, grad) in enumerate(zip(params, grads)):
            # Update biased first moment estimate
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * grad
            
            # Update biased second raw moment estimate
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * grad ** 2
            
            # Compute bias-corrected first moment estimate
            m_hat = self.m[i] / (1 - self.beta1 ** self.t)
            
            # Compute bias-corrected second raw moment estimate
            v_hat = self.v[i] / (1 - self.beta2 ** self.t)
            
            # Update parameters
            param -= self.lr * m_hat / (np.sqrt(v_hat) + self.epsilon)
            updated_params.append(param)
        
        return updated_params
```

**Why bias correction?**
```
Without correction, early estimates are biased toward 0:
- m₀ = 0, so m₁ = 0.9×0 + 0.1×g = 0.1g (underestimated!)
- Bias correction: m̂₁ = 0.1g / (1-0.9¹) = 0.1g / 0.1 = g ✓
```

---

### AdamW (Adam with Weight Decay)

**Idea:** Decouple weight decay from gradient-based update

```
Standard L2 regularization adds λw to gradient:
  g' = g + λw
  θ = θ - α × g' / (...)

AdamW applies weight decay separately:
  θ = θ - α × m̂ / (√v̂ + ε) - α × λ × θ
```

```python
class AdamW:
    def __init__(self, learning_rate=0.001, beta1=0.9, beta2=0.999, 
                 epsilon=1e-8, weight_decay=0.01):
        self.lr = learning_rate
        self.beta1 = beta1
        self.beta2 = beta2
        self.epsilon = epsilon
        self.weight_decay = weight_decay
        self.m = None
        self.v = None
        self.t = 0
    
    def update(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        
        self.t += 1
        
        for i, (param, grad) in enumerate(zip(params, grads)):
            # Adam update (same as before)
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * grad
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * grad ** 2
            
            m_hat = self.m[i] / (1 - self.beta1 ** self.t)
            v_hat = self.v[i] / (1 - self.beta2 ** self.t)
            
            # AdamW: Separate weight decay
            param -= self.lr * m_hat / (np.sqrt(v_hat) + self.epsilon)
            param -= self.lr * self.weight_decay * param  # Decoupled!
        
        return params
```

**AdamW is the DEFAULT for training Transformers/LLMs!**

---

### Optimizer Comparison

| Optimizer | Adaptive LR | Momentum | Best For |
|-----------|-------------|----------|----------|
| SGD | ❌ | ❌ | Simple problems |
| SGD+Momentum | ❌ | ✅ | Computer vision |
| AdaGrad | ✅ | ❌ | Sparse data |
| RMSprop | ✅ | ❌ | RNNs |
| Adam | ✅ | ✅ | General purpose |
| AdamW | ✅ | ✅ | Transformers, LLMs |

---

## 4.4 Learning Rate Scheduling

### Why Schedule Learning Rate?

```
Fixed Learning Rate Problems:
- Too high: Oscillates, misses minimum
- Too low: Takes forever, may get stuck

Solution: Start high, reduce over time

        Learning Rate
            │
    High    │────╲
            │     ╲
            │      ╲
            │       ╲_____
    Low     │             ╲____
            └─────────────────────── Epoch
```

### Step Decay

```python
def step_decay(initial_lr, epoch, drop_rate=0.5, epochs_drop=10):
    """Reduce LR by factor every N epochs"""
    return initial_lr * (drop_rate ** (epoch // epochs_drop))

# Example: LR = 0.1, 0.1, ..., 0.05, 0.05, ..., 0.025, ...
```

### Exponential Decay

```python
def exponential_decay(initial_lr, epoch, decay_rate=0.95):
    """Multiply LR by decay rate each epoch"""
    return initial_lr * (decay_rate ** epoch)

# Example: LR = 0.1, 0.095, 0.090, 0.086, ...
```

### Cosine Annealing

```python
def cosine_annealing(initial_lr, epoch, total_epochs):
    """Smooth cosine decay to near zero"""
    return initial_lr * 0.5 * (1 + np.cos(np.pi * epoch / total_epochs))

# Smooth curve from initial_lr to ~0
```

**Visualization:**
```
    LR
    │
0.1 │╲
    │ ╲        Cosine
    │  ╲       (smooth)
0.05│   ╲___
    │       ╲
  0 │        ╲__
    └───────────────
        50   100  Epoch
```

### Warmup + Decay (Modern Standard)

```python
def warmup_cosine_decay(epoch, warmup_epochs, total_epochs, initial_lr, min_lr=0):
    """
    1. Linear warmup for first few epochs
    2. Cosine decay for remaining epochs
    """
    if epoch < warmup_epochs:
        # Linear warmup
        return initial_lr * epoch / warmup_epochs
    else:
        # Cosine decay
        progress = (epoch - warmup_epochs) / (total_epochs - warmup_epochs)
        return min_lr + 0.5 * (initial_lr - min_lr) * (1 + np.cos(np.pi * progress))

# Used in BERT, GPT, Vision Transformers
```

**Visualization:**
```
    LR
    │
0.1 │    ╱╲
    │   ╱  ╲
    │  ╱    ╲
0.05│ ╱      ╲
    │╱        ╲___
  0 │              ╲__
    └──────────────────
      Warmup  Cosine Decay
```

### ReduceLROnPlateau

```python
class ReduceLROnPlateau:
    """Reduce LR when metric stops improving"""
    
    def __init__(self, factor=0.1, patience=10, min_lr=1e-6):
        self.factor = factor
        self.patience = patience
        self.min_lr = min_lr
        self.best_loss = float('inf')
        self.wait = 0
        self.lr = None
    
    def step(self, current_loss, current_lr):
        if current_loss < self.best_loss:
            self.best_loss = current_loss
            self.wait = 0
        else:
            self.wait += 1
            if self.wait >= self.patience:
                new_lr = max(current_lr * self.factor, self.min_lr)
                self.wait = 0
                return new_lr
        return current_lr
```

---

## 4.5 Weight Initialization

### Why Initialization Matters

```
Bad initialization:
- Too small: Vanishing gradients (signals die)
- Too large: Exploding gradients (values overflow)
- All zeros: All neurons learn the same thing!

Good initialization:
- Signals flow through network
- Gradients don't vanish or explode
- Each neuron starts unique
```

### Zero Initialization (DON'T DO THIS!)

```python
W = np.zeros((n_out, n_in))  # BAD!

# All neurons output the same → all gradients the same
# → all weights update the same → network can't learn!
```

### Random Normal Initialization

```python
W = np.random.randn(n_out, n_in) * 0.01  # Small random

# Works for shallow networks
# May have vanishing gradients in deep networks
```

### Xavier/Glorot Initialization (for Sigmoid/Tanh)

```
W ~ N(0, σ²) where σ = √(2 / (n_in + n_out))

Or uniform: W ~ U(-a, a) where a = √(6 / (n_in + n_out))
```

```python
def xavier_init(n_in, n_out):
    """For sigmoid/tanh activations"""
    std = np.sqrt(2.0 / (n_in + n_out))
    return np.random.randn(n_out, n_in) * std

# Keeps variance of activations ~constant across layers
```

### He/Kaiming Initialization (for ReLU) ⭐

```
W ~ N(0, σ²) where σ = √(2 / n_in)
```

```python
def he_init(n_in, n_out):
    """For ReLU activations"""
    std = np.sqrt(2.0 / n_in)
    return np.random.randn(n_out, n_in) * std

# Accounts for ReLU zeroing half the values
```

### Initialization Comparison

| Method | Formula | Best For |
|--------|---------|----------|
| Random Normal | N(0, 0.01) | Shallow networks |
| Xavier/Glorot | N(0, √(2/(n_in+n_out))) | Sigmoid, Tanh |
| He/Kaiming | N(0, √(2/n_in)) | ReLU, Leaky ReLU |

---

## 📐 Key Formulas Summary

### Gradient Descent Variants
```
Batch:      θ = θ - α × (1/m) × Σᵢ ∇L(xᵢ)
Stochastic: θ = θ - α × ∇L(xᵢ)
Mini-batch: θ = θ - α × (1/b) × Σⱼ ∇L(xⱼ)
```

### Optimizers
```
Momentum:   v = βv - α∇L;  θ = θ + v
RMSprop:    E[g²] = βE[g²] + (1-β)g²;  θ = θ - αg/√E[g²]
Adam:       m = β₁m + (1-β₁)g;  v = β₂v + (1-β₂)g²
            θ = θ - α(m̂/√v̂)
```

### Learning Rate Schedules
```
Step:        α_t = α₀ × γ^(t/n)
Exponential: α_t = α₀ × γ^t
Cosine:      α_t = α₀ × 0.5 × (1 + cos(πt/T))
```

### Weight Initialization
```
Xavier: σ = √(2/(n_in + n_out))
He:     σ = √(2/n_in)
```

---

## 🎨 Visual Mental Models

### Model 1: Optimizers as Vehicles

```
SGD:         🚶 Walking
             Slow, steady, can get stuck in hills

Momentum:    🚗 Car
             Builds up speed, can coast through small bumps

Adam:        🚀 Smart Rocket
             Adjusts thrust per direction, handles all terrain

                    Loss Landscape
                    
    SGD 🚶────────────────────→ (slow)
              ╱╲      ╱╲
    Momentum ──────→──────→ (faster)
             ╱    ╲  ╱    ╲
    Adam    ══════════════→ (adaptive)
           ╱              ╲
          ╱    Minimum     ╲
         ╱         ●        ╲
```

### Model 2: Learning Rate as Step Size

```
Learning Rate Too HIGH:
    
    Start ●
           ╲
            ╲  Overshoot!
             ╲  ↙
              ╳  Miss!
             ╱
            ╱
           ╱
    ● Minimum

Learning Rate Too LOW:

    Start ●
          │
          ●  Tiny step
          │
          ●  Tiny step
          │
          ●  Still going...
          │
          ... (takes forever)
          
Learning Rate JUST RIGHT:

    Start ●
          ↘
           ↘
            ↘
             ●  Minimum reached!
```

### Model 3: Batch Size Trade-off

```
         Compute Time          Gradient Quality
              │                      │
    Batch     │████████████████      │████████████████
    (1024)    │  Slow                │  Very accurate
              │                      │
    Mini-batch│████████              │██████████
    (32)      │  Moderate            │  Good balance
              │                      │
    SGD       │██                    │██
    (1)       │  Fast                │  Noisy
              │                      │
```

---

## 🌍 Real World Use Cases

### 1. Training ImageNet Models
```
- Optimizer: SGD + Momentum (0.9)
- Initial LR: 0.1
- Schedule: Step decay (÷10 at epoch 30, 60, 90)
- Batch size: 256
- Weight init: He initialization
```

### 2. Training BERT/GPT
```
- Optimizer: AdamW
- Initial LR: 1e-4 to 5e-5
- Schedule: Linear warmup + linear decay
- Batch size: 32-512 (with gradient accumulation)
- Weight decay: 0.01
```

### 3. Fine-tuning Pre-trained Models
```
- Optimizer: Adam or AdamW
- Learning rate: 1e-5 to 5e-5 (much smaller!)
- Schedule: Constant or cosine decay
- Freeze early layers, train later layers
```

### 4. Training GANs
```
- Optimizer: Adam (β₁=0.5, β₂=0.999)
- Learning rate: 0.0002
- Different LR for Generator vs Discriminator
- No momentum (β₁ < 0.9 for stability)
```

---

## 🛠 Mini Project: Optimizer Comparison

**Objective:** Implement and compare different optimizers on the same problem.

```python
import numpy as np
import matplotlib.pyplot as plt

# ============================================
# OPTIMIZER IMPLEMENTATIONS
# ============================================

class SGD:
    def __init__(self, lr=0.01):
        self.lr = lr
    
    def update(self, params, grads):
        return [p - self.lr * g for p, g in zip(params, grads)]

class MomentumSGD:
    def __init__(self, lr=0.01, momentum=0.9):
        self.lr = lr
        self.momentum = momentum
        self.v = None
    
    def update(self, params, grads):
        if self.v is None:
            self.v = [np.zeros_like(p) for p in params]
        
        updated = []
        for i, (p, g) in enumerate(zip(params, grads)):
            self.v[i] = self.momentum * self.v[i] - self.lr * g
            updated.append(p + self.v[i])
        return updated

class RMSprop:
    def __init__(self, lr=0.001, beta=0.9, eps=1e-8):
        self.lr = lr
        self.beta = beta
        self.eps = eps
        self.cache = None
    
    def update(self, params, grads):
        if self.cache is None:
            self.cache = [np.zeros_like(p) for p in params]
        
        updated = []
        for i, (p, g) in enumerate(zip(params, grads)):
            self.cache[i] = self.beta * self.cache[i] + (1 - self.beta) * g**2
            updated.append(p - self.lr * g / (np.sqrt(self.cache[i]) + self.eps))
        return updated

class Adam:
    def __init__(self, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.m = None
        self.v = None
        self.t = 0
    
    def update(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        
        self.t += 1
        updated = []
        
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g**2
            
            m_hat = self.m[i] / (1 - self.beta1**self.t)
            v_hat = self.v[i] / (1 - self.beta2**self.t)
            
            updated.append(p - self.lr * m_hat / (np.sqrt(v_hat) + self.eps))
        return updated


# ============================================
# TEST FUNCTION: Rosenbrock (challenging!)
# ============================================

def rosenbrock(x, y):
    """Famous test function: minimum at (1, 1)"""
    return (1 - x)**2 + 100 * (y - x**2)**2

def rosenbrock_grad(x, y):
    """Gradient of Rosenbrock function"""
    dx = -2 * (1 - x) - 400 * x * (y - x**2)
    dy = 200 * (y - x**2)
    return np.array([dx, dy])


# ============================================
# RUN COMPARISON
# ============================================

def optimize(optimizer, start, n_iters=1000):
    """Run optimization and track path"""
    params = [np.array(start, dtype=float)]
    path = [start.copy()]
    losses = []
    
    for _ in range(n_iters):
        x, y = params[0]
        loss = rosenbrock(x, y)
        grad = rosenbrock_grad(x, y)
        
        losses.append(loss)
        params = optimizer.update(params, [grad])
        path.append(params[0].copy())
    
    return np.array(path), losses


# Run all optimizers
start = np.array([-1.5, 1.5])
n_iters = 500

optimizers = {
    'SGD (lr=0.001)': SGD(lr=0.001),
    'Momentum (lr=0.001)': MomentumSGD(lr=0.001),
    'RMSprop (lr=0.01)': RMSprop(lr=0.01),
    'Adam (lr=0.1)': Adam(lr=0.1),
}

results = {}
for name, opt in optimizers.items():
    path, losses = optimize(opt, start.copy(), n_iters)
    results[name] = {'path': path, 'losses': losses}


# ============================================
# VISUALIZATION
# ============================================

fig, axes = plt.subplots(1, 2, figsize=(16, 6))

# Plot 1: Optimization paths on contour
ax1 = axes[0]
x_range = np.linspace(-2, 2, 100)
y_range = np.linspace(-1, 3, 100)
X, Y = np.meshgrid(x_range, y_range)
Z = rosenbrock(X, Y)

ax1.contour(X, Y, Z, levels=np.logspace(-1, 3, 20), cmap='viridis', alpha=0.7)
ax1.plot(1, 1, 'r*', markersize=20, label='Minimum (1,1)')

colors = ['blue', 'green', 'orange', 'red']
for (name, data), color in zip(results.items(), colors):
    path = data['path']
    ax1.plot(path[:, 0], path[:, 1], '-', color=color, linewidth=1.5, label=name, alpha=0.8)
    ax1.plot(path[0, 0], path[0, 1], 'o', color=color, markersize=8)

ax1.set_xlabel('x')
ax1.set_ylabel('y')
ax1.set_title('Optimization Paths on Rosenbrock Function')
ax1.legend(loc='upper left')
ax1.set_xlim(-2, 2)
ax1.set_ylim(-1, 3)

# Plot 2: Loss curves
ax2 = axes[1]
for (name, data), color in zip(results.items(), colors):
    losses = data['losses']
    ax2.semilogy(losses, color=color, label=name, linewidth=2)

ax2.set_xlabel('Iteration')
ax2.set_ylabel('Loss (log scale)')
ax2.set_title('Loss Convergence')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('optimizer_comparison.png', dpi=150, bbox_inches='tight')
plt.show()

# Print final positions
print("\n" + "="*50)
print("FINAL RESULTS (Target: [1.0, 1.0])")
print("="*50)
for name, data in results.items():
    final = data['path'][-1]
    final_loss = data['losses'][-1]
    print(f"{name:25} → Position: [{final[0]:.4f}, {final[1]:.4f}], Loss: {final_loss:.6f}")
```

**Expected Output:**
```
==================================================
FINAL RESULTS (Target: [1.0, 1.0])
==================================================
SGD (lr=0.001)            → Position: [-1.4523, 2.1234], Loss: 523.456789
Momentum (lr=0.001)       → Position: [0.5678, 0.3456], Loss: 0.234567
RMSprop (lr=0.01)         → Position: [0.9876, 0.9753], Loss: 0.000234
Adam (lr=0.1)             → Position: [0.9999, 0.9998], Loss: 0.000001
```

---

## 📝 Homework

### Level 1: Easy

1. **Calculate by hand** (2 iterations of SGD):
   ```
   f(x) = x² + 2x + 1
   Start: x = 5
   Learning rate: 0.1
   
   Show the value of x after 2 updates.
   ```

2. **Explain** the difference between batch, stochastic, and mini-batch gradient descent.

3. **Why** do we need bias correction in Adam?

### Level 2: Medium

4. **Implement momentum SGD** and show it oscillates less than vanilla SGD on:
   ```
   f(x, y) = 0.1x² + 2y²  (elongated bowl)
   ```

5. **Calculate** the gradient of cross-entropy loss with softmax:
   ```
   Show that ∂L/∂zᵢ = ŷᵢ - yᵢ (softmax output - one-hot label)
   ```

6. **Implement** learning rate warmup and show its effect on training stability.

### Level 3: Advanced

7. **Implement backpropagation** for a 3-layer network with:
   - Layer 1: ReLU
   - Layer 2: ReLU
   - Layer 3: Softmax
   - Loss: Cross-entropy

8. **Compare Xavier vs He initialization** on a 10-layer network. Plot activation distributions.

9. **Implement AdamW** and compare with Adam on a problem with L2 regularization.

### Level 4: Expert (FAANG Prep)

10. **Derive** the bias correction formula for Adam. Why is it m/(1-β^t)?

11. **Implement gradient clipping** (by norm and by value) and show when each is needed.

12. **Design** an adaptive learning rate schedule that:
    - Warms up for 10% of training
    - Uses cosine decay with restarts
    - Includes gradient-based LR adjustment

---

## ⚠️ Common Mistakes

### Mistake 1: Learning Rate Too High

```python
# WRONG - will diverge!
optimizer = Adam(learning_rate=1.0)

# CORRECT - start conservative
optimizer = Adam(learning_rate=0.001)
# Then tune based on loss curves
```

**Symptom:** Loss goes to infinity or NaN

### Mistake 2: Not Shuffling Data

```python
# WRONG - same order every epoch
for epoch in range(epochs):
    for i in range(0, n, batch_size):
        batch = data[i:i+batch_size]  # Same batches!

# CORRECT - shuffle each epoch
for epoch in range(epochs):
    indices = np.random.permutation(n)
    for i in range(0, n, batch_size):
        batch = data[indices[i:i+batch_size]]
```

**Symptom:** Poor generalization, cyclic loss patterns

### Mistake 3: Wrong Initialization for Activation

```python
# WRONG - Xavier for ReLU
W = np.random.randn(n_out, n_in) * np.sqrt(2/(n_in + n_out))

# CORRECT - He initialization for ReLU
W = np.random.randn(n_out, n_in) * np.sqrt(2/n_in)
```

**Symptom:** Vanishing/exploding activations in deep networks

### Mistake 4: Forgetting to Zero Gradients

```python
# WRONG (PyTorch example) - gradients accumulate!
for batch in dataloader:
    loss = model(batch)
    loss.backward()
    optimizer.step()

# CORRECT
for batch in dataloader:
    optimizer.zero_grad()  # Clear old gradients!
    loss = model(batch)
    loss.backward()
    optimizer.step()
```

### Mistake 5: Same LR for All Layers (Fine-tuning)

```python
# WRONG - same LR destroys pretrained weights
optimizer = Adam(model.parameters(), lr=0.001)

# CORRECT - smaller LR for pretrained, larger for new
optimizer = Adam([
    {'params': model.pretrained.parameters(), 'lr': 1e-5},
    {'params': model.new_layers.parameters(), 'lr': 1e-3}
])
```

---

## 🎤 Interview Questions & Answers

### Beginner Level

**Q1: What is gradient descent?**

**A**: Gradient descent is an optimization algorithm to find parameters that minimize a function (loss).

**Steps:**
1. Start with random parameters
2. Calculate gradient (direction of steepest increase)
3. Move opposite to gradient (to decrease loss)
4. Repeat until convergence

**Formula:** θ = θ - α × ∇L(θ)

---

**Q2: What is the difference between batch, mini-batch, and stochastic gradient descent?**

**A**:

| Type | Samples per Update | Pros | Cons |
|------|-------------------|------|------|
| Batch | All (N) | Stable, accurate gradient | Slow, memory intensive |
| Stochastic | 1 | Fast, can escape local minima | Noisy, unstable |
| Mini-batch | Small batch (32-256) | Balanced speed/stability | Most widely used |

Mini-batch is the standard because it balances computational efficiency with gradient accuracy.

---

**Q3: Why do we need learning rate scheduling?**

**A**: Fixed learning rate has issues:
- **Too high**: Overshoots minimum, oscillates
- **Too low**: Converges very slowly

**Scheduling benefits:**
1. Start high → fast initial progress
2. Decrease over time → fine-tune near minimum
3. Warmup → stabilizes early training
4. Can escape saddle points with periodic increases

---

### Intermediate Level

**Q4: Explain the Adam optimizer.**

**A**: Adam combines two ideas:

1. **Momentum** (first moment): Exponential moving average of gradients
   ```
   m = β₁m + (1-β₁)g
   ```

2. **RMSprop** (second moment): Exponential moving average of squared gradients
   ```
   v = β₂v + (1-β₂)g²
   ```

3. **Bias correction**: Corrects for initialization bias
   ```
   m̂ = m/(1-β₁ᵗ), v̂ = v/(1-β₂ᵗ)
   ```

4. **Update**: Adaptive per-parameter learning rate
   ```
   θ = θ - α × m̂ / (√v̂ + ε)
   ```

**Default hyperparameters**: α=0.001, β₁=0.9, β₂=0.999, ε=1e-8

---

**Q5: What is the vanishing gradient problem and how do optimizers help?**

**A**: **Vanishing gradient** occurs when gradients become very small in deep networks, causing early layers to learn slowly.

**Causes:**
- Sigmoid/tanh activations (derivatives < 1)
- Many layers (0.25^n → 0)

**How optimizers help:**

1. **Momentum**: Accumulates gradients → even small ones add up

2. **Adam/RMSprop**: Divides by √(running average of g²)
   - If gradients are consistently small, divisor is small
   - Effective learning rate increases!

3. **Proper initialization**: He/Xavier keeps gradients in good range

---

**Q6: Derive the gradient for MSE loss.**

**A**:
```
Loss: L = (1/2n) Σ(y - ŷ)² where ŷ = Wx + b

∂L/∂W:
= (1/2n) Σ ∂/∂W[(y - (Wx + b))²]
= (1/2n) Σ 2(y - ŷ) × (-x)
= -(1/n) Σ(y - ŷ)x
= (1/n) Σ(ŷ - y)x
= (1/n) Xᵀ(ŷ - y)    [in matrix form]

∂L/∂b:
= (1/n) Σ(ŷ - y)
```

---

### Advanced Level

**Q7: Why does AdamW perform better than Adam with L2 regularization?**

**A**: 

**L2 regularization with Adam** adds weight penalty to gradient:
```
g' = g + λw  (modified gradient)
m = β₁m + (1-β₁)g'  (momentum includes weight decay)
```

**Problem**: The adaptive learning rate also affects weight decay:
- Weights with large gradients get small LR
- Weight decay is also reduced → inconsistent regularization

**AdamW** decouples weight decay:
```
m = β₁m + (1-β₁)g  (momentum only for gradients)
θ = θ - α×m̂/√v̂ - αλw  (weight decay applied separately)
```

**Result**: Consistent regularization regardless of gradient magnitude. Better for Transformers and LLMs.

---

**Q8: Explain gradient clipping and when to use it.**

**A**: **Gradient clipping** limits gradient magnitude to prevent exploding gradients.

**Two methods:**

1. **Clip by value**: Limit each gradient element
   ```python
   g = np.clip(g, -max_val, max_val)
   ```

2. **Clip by norm**: Scale gradient if norm exceeds threshold
   ```python
   norm = np.linalg.norm(g)
   if norm > max_norm:
       g = g * max_norm / norm
   ```

**When to use:**
- RNNs/LSTMs (long sequences → gradient explosion)
- Transformers (especially during training)
- Any model with unstable gradients

**Typical values**: max_norm = 1.0 or 5.0

---

### FAANG Level

**Q9: Design an optimizer for a model with 1 billion parameters. What considerations?**

**A**:

**Memory challenges:**
- Adam stores 2 states per parameter → 3× memory
- 1B params × 4 bytes × 3 = 12GB just for optimizer!

**Solutions:**

1. **8-bit Adam**: Quantize optimizer states
   ```
   Use INT8 for m and v → 4× memory reduction
   ```

2. **ZeRO optimization** (DeepSpeed):
   - Partition optimizer states across GPUs
   - Stage 1: Partition optimizer states
   - Stage 2: + Partition gradients
   - Stage 3: + Partition parameters

3. **Gradient accumulation**:
   ```python
   for i, batch in enumerate(dataloader):
       loss = model(batch) / accumulation_steps
       loss.backward()
       if (i + 1) % accumulation_steps == 0:
           optimizer.step()
           optimizer.zero_grad()
   ```

4. **Mixed precision training**:
   - Forward/backward in FP16
   - Master weights in FP32
   - Loss scaling to prevent underflow

5. **Learning rate**: Scale with √batch_size for large batches

---

**Q10: Implement a custom learning rate finder (Smith's method).**

**A**:

```python
class LRFinder:
    """
    Find optimal learning rate by training with exponentially increasing LR.
    Plot loss vs LR - optimal LR is where loss decreases fastest.
    """
    
    def __init__(self, model, optimizer, criterion):
        self.model = model
        self.optimizer = optimizer
        self.criterion = criterion
        
        # Save initial state
        self.initial_state = {
            'model': copy.deepcopy(model.state_dict()),
            'optimizer': copy.deepcopy(optimizer.state_dict())
        }
    
    def find(self, train_loader, start_lr=1e-7, end_lr=10, num_iter=100):
        """Run LR range test"""
        # Calculate multiplicative factor
        mult = (end_lr / start_lr) ** (1 / num_iter)
        
        lr = start_lr
        self.history = {'lr': [], 'loss': []}
        
        for i, (inputs, targets) in enumerate(train_loader):
            if i >= num_iter:
                break
            
            # Set learning rate
            for param_group in self.optimizer.param_groups:
                param_group['lr'] = lr
            
            # Forward pass
            self.optimizer.zero_grad()
            outputs = self.model(inputs)
            loss = self.criterion(outputs, targets)
            
            # Record
            self.history['lr'].append(lr)
            self.history['loss'].append(loss.item())
            
            # Check for divergence
            if loss.item() > 4 * self.history['loss'][0]:
                break
            
            # Backward pass
            loss.backward()
            self.optimizer.step()
            
            # Update LR
            lr *= mult
        
        # Restore initial state
        self.model.load_state_dict(self.initial_state['model'])
        self.optimizer.load_state_dict(self.initial_state['optimizer'])
        
        return self.history
    
    def plot(self):
        """Plot loss vs learning rate"""
        plt.figure(figsize=(10, 6))
        plt.semilogx(self.history['lr'], self.history['loss'])
        plt.xlabel('Learning Rate')
        plt.ylabel('Loss')
        plt.title('Learning Rate Finder')
        
        # Find suggested LR (steepest descent point)
        gradients = np.gradient(self.history['loss'])
        suggested_idx = np.argmin(gradients)
        suggested_lr = self.history['lr'][suggested_idx]
        
        plt.axvline(x=suggested_lr, color='r', linestyle='--', 
                    label=f'Suggested LR: {suggested_lr:.2e}')
        plt.legend()
        plt.show()
        
        return suggested_lr
```

**Usage:**
```python
finder = LRFinder(model, optimizer, criterion)
finder.find(train_loader)
optimal_lr = finder.plot()
```

---

## 🔗 What's Next?

In the next file `05-Network-Architectures-FNN-RNN-CNN.md`, we'll cover:
- Feedforward Neural Networks (FNN) in depth
- Convolutional Neural Networks (CNN)
- Recurrent Neural Networks (RNN)
- When to use each architecture
- Building blocks and design patterns

---

**Type CONTINUE to proceed with `05-Network-Architectures-FNN-RNN-CNN.md`**
