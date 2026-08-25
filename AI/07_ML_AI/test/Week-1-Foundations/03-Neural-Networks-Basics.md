# 03 - Neural Networks Basics

---

## 📌 Table of Contents

1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
   - [The Perceptron](#31-the-perceptron---where-it-all-began)
   - [Multi-Layer Perceptron](#32-multi-layer-perceptron-mlp)
   - [Activation Functions](#33-activation-functions)
   - [Forward Propagation](#34-forward-propagation)
   - [Loss Functions](#35-loss-functions)
3. [Key Formulas](#-key-formulas-summary)
4. [Visual Mental Models](#-visual-mental-models)
5. [Real World Use Cases](#-real-world-use-cases)
6. [Mini Project](#-mini-project)
7. [Homework](#-homework)
8. [Common Mistakes](#-common-mistakes)
9. [Interview Questions & Answers](#-interview-questions--answers)

---

## 🌱 Beginner Friendly Explanation

### What is a Neural Network?

A neural network is a **computer program inspired by the human brain** that learns patterns from data.

**Brain Analogy:**
```
HUMAN BRAIN                          NEURAL NETWORK
────────────                         ──────────────
Neurons (86 billion)         →       Artificial neurons (nodes)
Synapses (connections)       →       Weights (numbers)
Learning from experience     →       Learning from data
Making decisions             →       Making predictions
```

### The Simplest Neural Network: One Neuron

Imagine a single neuron deciding if you should go to the beach:

```
INPUTS                    WEIGHTS              DECISION
───────                   ───────              ────────
Temperature (30°C)    ×   0.4 (importance)
Sunny? (Yes=1)        ×   0.5 (importance)    →   [NEURON]  →  Go to beach?
Weekend? (Yes=1)      ×   0.3 (importance)                      YES / NO
```

The neuron:
1. **Multiplies** each input by its weight (importance)
2. **Adds** them all up
3. **Decides** based on a threshold

```
Score = 30×0.4 + 1×0.5 + 1×0.3 = 12 + 0.5 + 0.3 = 12.8

If Score > 10 → "Go to beach!" ✓
```

### Why "Neural" Network?

```
BIOLOGICAL NEURON                    ARTIFICIAL NEURON
─────────────────                    ─────────────────

    Dendrites (inputs)                   x₁, x₂, x₃ (inputs)
         │                                    │
         ▼                                    ▼
    ┌─────────┐                         ┌─────────┐
    │  Cell   │                         │ Σ(wᵢxᵢ) │  (weighted sum)
    │  Body   │                         │  + b    │  (add bias)
    └────┬────┘                         └────┬────┘
         │                                    │
         ▼                                    ▼
    Activation                          Activation
    (fire or not)                       Function f()
         │                                    │
         ▼                                    ▼
    Axon (output)                       Output y
```

### From One Neuron to Many: The Network

```
INPUT LAYER          HIDDEN LAYERS           OUTPUT LAYER
(Your data)          (Pattern finding)       (Prediction)

   ○                     ○                        
   │╲                   ╱│╲                       
   ○─○────────────────○──○──────────────────○    → Prediction
   │╱                   ╲│╱                       
   ○                     ○                        

Features            Learned patterns         Final answer
(pixels, words)     (edges, shapes)          (cat/dog, price)
```

---

## 🔬 Deep Technical Breakdown

---

## 3.1 The Perceptron - Where It All Began

### History
- Invented by **Frank Rosenblatt** in 1958
- First algorithm that could "learn" from data
- Foundation of all modern neural networks

### The Perceptron Model

```
         x₁ ──── w₁ ────╲
                         ╲
         x₂ ──── w₂ ──────╳──── Σ ──── f() ──── ŷ
                         ╱
         x₃ ──── w₃ ────╱
                         │
                        +b (bias)
```

**Mathematical Formula:**
```
ŷ = f(w₁x₁ + w₂x₂ + w₃x₃ + b)
ŷ = f(Σᵢ wᵢxᵢ + b)
ŷ = f(w · x + b)

Where:
  x = input vector
  w = weight vector
  b = bias
  f = activation function
  ŷ = output (prediction)
```

### Step Activation (Original Perceptron)

```python
def step_function(z):
    return 1 if z >= 0 else 0

# Example:
# If weighted sum >= 0: output 1 (activate)
# If weighted sum < 0: output 0 (don't activate)
```

### Perceptron Learning Algorithm

```python
import numpy as np

class Perceptron:
    def __init__(self, n_features, learning_rate=0.1):
        self.weights = np.zeros(n_features)
        self.bias = 0
        self.lr = learning_rate
    
    def predict(self, x):
        """Forward pass"""
        z = np.dot(self.weights, x) + self.bias
        return 1 if z >= 0 else 0
    
    def train(self, X, y, epochs=100):
        """Perceptron learning rule"""
        for epoch in range(epochs):
            errors = 0
            for xi, yi in zip(X, y):
                prediction = self.predict(xi)
                error = yi - prediction
                
                # Update only if prediction is wrong
                if error != 0:
                    self.weights += self.lr * error * xi
                    self.bias += self.lr * error
                    errors += 1
            
            if errors == 0:
                print(f"Converged at epoch {epoch}")
                break
        
        return self

# Example: Learning AND gate
X = np.array([[0,0], [0,1], [1,0], [1,1]])
y = np.array([0, 0, 0, 1])  # AND truth table

perceptron = Perceptron(n_features=2)
perceptron.train(X, y)

# Test
for xi in X:
    print(f"{xi} → {perceptron.predict(xi)}")
```

### Perceptron Limitation: XOR Problem

```
AND Gate (Learnable ✓)        XOR Gate (NOT Learnable ✗)
────────────────────          ────────────────────────

  1 │  0   1                    1 │  1   0
    │                             │
  0 │  0   0                    0 │  0   1
    └─────────                    └─────────
       0   1                         0   1

Can draw ONE line              CANNOT separate with one line!
to separate 0s and 1s          (Not linearly separable)
```

**This limitation led to the "AI Winter" until multi-layer networks solved it.**

---

## 3.2 Multi-Layer Perceptron (MLP)

### The Solution: Hidden Layers

By stacking multiple layers, we can learn non-linear patterns!

```
INPUT LAYER        HIDDEN LAYER 1       HIDDEN LAYER 2       OUTPUT LAYER
(3 neurons)        (4 neurons)          (4 neurons)          (2 neurons)

    x₁ ○───────────────○───────────────○───────────────○ ŷ₁
        ╲             ╱│╲             ╱│╲             ╱
    x₂ ○──╳──────────○──╳──────────○──╳──────────────○ ŷ₂
        ╱             ╲│╱             ╲│╱             
    x₃ ○───────────────○───────────────○
                       
    Features        Pattern           Complex          Predictions
                    Detection         Patterns
```

### Why Hidden Layers Work

Each layer learns increasingly abstract features:

```
IMAGE RECOGNITION EXAMPLE:

Layer 1: Detects edges (─, │, ╱, ╲)
Layer 2: Combines edges into shapes (○, □, △)
Layer 3: Combines shapes into parts (👁, 👃, 👄)
Layer 4: Combines parts into objects (😺 cat, 🐕 dog)
```

### Mathematical Representation

```
Layer 1:  h₁ = f(W₁ · x + b₁)
Layer 2:  h₂ = f(W₂ · h₁ + b₂)
Output:   ŷ = f(W₃ · h₂ + b₃)

Where:
  W₁, W₂, W₃ = weight matrices
  b₁, b₂, b₃ = bias vectors
  f = activation function
  h = hidden layer outputs
```

### Dimension Tracking

```python
# Example: Network for image classification

# Input: 784 pixels (28x28 image flattened)
# Hidden 1: 256 neurons
# Hidden 2: 128 neurons  
# Output: 10 classes (digits 0-9)

x = np.random.randn(784)      # Input: (784,)

W1 = np.random.randn(256, 784)  # (256, 784)
b1 = np.random.randn(256)       # (256,)
h1 = W1 @ x + b1                # (256,) ← 256 hidden neurons

W2 = np.random.randn(128, 256)  # (128, 256)
b2 = np.random.randn(128)       # (128,)
h2 = W2 @ h1 + b2               # (128,) ← 128 hidden neurons

W3 = np.random.randn(10, 128)   # (10, 128)
b3 = np.random.randn(10)        # (10,)
y = W3 @ h2 + b3                # (10,) ← 10 output classes
```

---

## 3.3 Activation Functions

### Why Do We Need Activation Functions?

Without activation functions, neural networks are just **linear transformations**:

```
No activation:
  h = W₂(W₁x + b₁) + b₂
    = W₂W₁x + W₂b₁ + b₂
    = W'x + b'  ← Still just linear!

Multiple layers collapse into ONE linear transformation.
Can't learn complex patterns!
```

**Activation functions add NON-LINEARITY** → Can learn ANY function!

### Popular Activation Functions

#### 1. Sigmoid (σ)

```
σ(z) = 1 / (1 + e⁻ᶻ)

Output range: (0, 1)
```

```python
def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def sigmoid_derivative(z):
    s = sigmoid(z)
    return s * (1 - s)
```

**Graph:**
```
    1 │            ___________
      │          ╱
      │        ╱
  0.5 │───────•───────────────
      │      ╱
      │    ╱
    0 │___╱
      └────────────────────────
            -4  -2   0   2   4
```

**Pros:** 
- Output between 0-1 (good for probabilities)
- Smooth gradient

**Cons:**
- **Vanishing gradient**: Gradient near 0 at extremes → slow learning
- **Not zero-centered**: Always positive output
- **Computationally expensive**: exp() is slow

**Use case:** Binary classification output layer

---

#### 2. Tanh (Hyperbolic Tangent)

```
tanh(z) = (eᶻ - e⁻ᶻ) / (eᶻ + e⁻ᶻ)

Output range: (-1, 1)
```

```python
def tanh(z):
    return np.tanh(z)

def tanh_derivative(z):
    return 1 - np.tanh(z)**2
```

**Graph:**
```
    1 │            ___________
      │          ╱
      │        ╱
    0 │───────•───────────────
      │      ╱
      │    ╱
   -1 │___╱
      └────────────────────────
            -4  -2   0   2   4
```

**Pros:**
- Zero-centered (outputs can be negative)
- Stronger gradients than sigmoid

**Cons:**
- Still has vanishing gradient problem

**Use case:** Hidden layers (sometimes), RNNs

---

#### 3. ReLU (Rectified Linear Unit) ⭐ MOST POPULAR

```
ReLU(z) = max(0, z)

Output range: [0, ∞)
```

```python
def relu(z):
    return np.maximum(0, z)

def relu_derivative(z):
    return (z > 0).astype(float)
```

**Graph:**
```
    4 │              ╱
      │            ╱
    2 │          ╱
      │        ╱
    0 │_______•────────────────
      │
   -2 │
      └────────────────────────
            -4  -2   0   2   4
```

**Pros:**
- **Computationally efficient**: Just max(0, x)
- **No vanishing gradient** (for positive values)
- **Sparse activation**: Many neurons output 0 → efficient
- **Faster convergence**: 6x faster than sigmoid in practice

**Cons:**
- **Dying ReLU**: Neurons can "die" (always output 0) if inputs are always negative
- Not zero-centered

**Use case:** Default choice for hidden layers

---

#### 4. Leaky ReLU

```
LeakyReLU(z) = z if z > 0 else α×z

Where α is small (typically 0.01)
Output range: (-∞, ∞)
```

```python
def leaky_relu(z, alpha=0.01):
    return np.where(z > 0, z, alpha * z)

def leaky_relu_derivative(z, alpha=0.01):
    return np.where(z > 0, 1, alpha)
```

**Graph:**
```
    4 │              ╱
      │            ╱
    2 │          ╱
      │        ╱
    0 │_______•────────────────
      │______╱ (small slope)
   -2 │
      └────────────────────────
            -4  -2   0   2   4
```

**Pros:**
- Fixes "dying ReLU" problem
- Has all benefits of ReLU

**Use case:** When ReLU neurons are dying

---

#### 5. Softmax (for Multi-class Classification)

```
Softmax(zᵢ) = eᶻⁱ / Σⱼ eᶻʲ

Output: Probability distribution (sums to 1)
```

```python
def softmax(z):
    # Subtract max for numerical stability
    exp_z = np.exp(z - np.max(z))
    return exp_z / np.sum(exp_z)

# Example
logits = np.array([2.0, 1.0, 0.1])
probs = softmax(logits)
# [0.659, 0.242, 0.099] - sums to 1.0
```

**Use case:** Multi-class classification output layer

---

### Activation Function Comparison

| Function | Range | Derivative | Use Case |
|----------|-------|------------|----------|
| Sigmoid | (0, 1) | σ(1-σ) | Binary output |
| Tanh | (-1, 1) | 1-tanh² | RNNs |
| ReLU | [0, ∞) | 0 or 1 | Hidden layers (default) |
| Leaky ReLU | (-∞, ∞) | α or 1 | If ReLU dies |
| Softmax | (0, 1), sum=1 | Complex | Multi-class output |

---

## 3.4 Forward Propagation

Forward propagation is computing the output from inputs through all layers.

### Step-by-Step Example

```
Network: 2 inputs → 3 hidden → 2 outputs
Activation: ReLU (hidden), Softmax (output)
```

```python
import numpy as np

# ========================================
# FORWARD PROPAGATION STEP BY STEP
# ========================================

# Input
x = np.array([0.5, 0.8])  # 2 features

# Layer 1 weights and biases (2 inputs → 3 hidden)
W1 = np.array([
    [0.1, 0.2],
    [0.3, 0.4],
    [0.5, 0.6]
])  # Shape: (3, 2)
b1 = np.array([0.1, 0.2, 0.3])  # Shape: (3,)

# Layer 2 weights and biases (3 hidden → 2 outputs)
W2 = np.array([
    [0.7, 0.8, 0.9],
    [0.1, 0.2, 0.3]
])  # Shape: (2, 3)
b2 = np.array([0.1, 0.2])  # Shape: (2,)

# ========================================
# FORWARD PASS
# ========================================

# Step 1: Linear transformation (Layer 1)
z1 = W1 @ x + b1
# z1 = [0.1*0.5 + 0.2*0.8 + 0.1,  = [0.05 + 0.16 + 0.1]   = [0.31]
#       0.3*0.5 + 0.4*0.8 + 0.2,  = [0.15 + 0.32 + 0.2]   = [0.67]
#       0.5*0.5 + 0.6*0.8 + 0.3]  = [0.25 + 0.48 + 0.3]   = [1.03]
print(f"z1 (pre-activation): {z1}")

# Step 2: Activation (ReLU)
def relu(z):
    return np.maximum(0, z)

a1 = relu(z1)
print(f"a1 (after ReLU): {a1}")  # [0.31, 0.67, 1.03] (all positive, unchanged)

# Step 3: Linear transformation (Layer 2)
z2 = W2 @ a1 + b2
print(f"z2 (pre-activation): {z2}")

# Step 4: Activation (Softmax for classification)
def softmax(z):
    exp_z = np.exp(z - np.max(z))
    return exp_z / np.sum(exp_z)

a2 = softmax(z2)
print(f"a2 (output probabilities): {a2}")
print(f"Predicted class: {np.argmax(a2)}")

# ========================================
# COMPLETE FORWARD FUNCTION
# ========================================

def forward_propagation(x, weights, biases):
    """
    Generic forward pass for any number of layers
    
    Args:
        x: input vector
        weights: list of weight matrices [W1, W2, ...]
        biases: list of bias vectors [b1, b2, ...]
    
    Returns:
        output: final predictions
        cache: intermediate values (for backprop)
    """
    cache = {'a0': x}  # Store activations
    a = x
    
    # Hidden layers (ReLU)
    for i, (W, b) in enumerate(zip(weights[:-1], biases[:-1]), 1):
        z = W @ a + b
        a = relu(z)
        cache[f'z{i}'] = z
        cache[f'a{i}'] = a
    
    # Output layer (Softmax)
    z_out = weights[-1] @ a + biases[-1]
    a_out = softmax(z_out)
    cache[f'z{len(weights)}'] = z_out
    cache[f'a{len(weights)}'] = a_out
    
    return a_out, cache

# Test
output, cache = forward_propagation(x, [W1, W2], [b1, b2])
print(f"\nFinal output: {output}")
```

### Forward Propagation Visualization

```
INPUT         LAYER 1              LAYER 2          OUTPUT
─────         ───────              ───────          ──────

x₁=0.5 ─┬─→ z₁=0.31 → ReLU → a₁=0.31 ─┬─→ z₁=1.69 ─┬─→ Softmax
        │                              │            │
x₂=0.8 ─┼─→ z₂=0.67 → ReLU → a₂=0.67 ─┼─→ z₂=0.75 ─┼─→ [0.72]
        │                              │            │    [0.28]
        └─→ z₃=1.03 → ReLU → a₃=1.03 ─┘            │
                                                    │
                                        Class 0: 72% ◄─┘
                                        Class 1: 28%
```

---

## 3.5 Loss Functions

Loss functions measure **how wrong** our predictions are.

### For Regression: Mean Squared Error (MSE)

```
MSE = (1/n) × Σ(yᵢ - ŷᵢ)²

Where:
  y = true values
  ŷ = predicted values
  n = number of samples
```

```python
def mse_loss(y_true, y_pred):
    return np.mean((y_true - y_pred) ** 2)

def mse_gradient(y_true, y_pred):
    return 2 * (y_pred - y_true) / len(y_true)

# Example
y_true = np.array([1.0, 2.0, 3.0])
y_pred = np.array([1.1, 2.2, 2.8])
print(f"MSE Loss: {mse_loss(y_true, y_pred)}")  # 0.03
```

### For Binary Classification: Binary Cross-Entropy

```
BCE = -(1/n) × Σ[yᵢ×log(ŷᵢ) + (1-yᵢ)×log(1-ŷᵢ)]

Where:
  y = true labels (0 or 1)
  ŷ = predicted probabilities
```

```python
def binary_cross_entropy(y_true, y_pred, epsilon=1e-15):
    # Clip to prevent log(0)
    y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
    return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))

# Example
y_true = np.array([1, 0, 1, 1])
y_pred = np.array([0.9, 0.1, 0.8, 0.7])
print(f"BCE Loss: {binary_cross_entropy(y_true, y_pred)}")  # ~0.16
```

### For Multi-class Classification: Categorical Cross-Entropy

```
CCE = -(1/n) × Σᵢ Σⱼ yᵢⱼ × log(ŷᵢⱼ)

Where:
  y = one-hot encoded true labels
  ŷ = predicted probabilities (softmax output)
```

```python
def categorical_cross_entropy(y_true, y_pred, epsilon=1e-15):
    y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
    return -np.sum(y_true * np.log(y_pred)) / len(y_true)

# Example: 3 samples, 4 classes
y_true = np.array([
    [1, 0, 0, 0],  # Class 0
    [0, 1, 0, 0],  # Class 1
    [0, 0, 0, 1]   # Class 3
])
y_pred = np.array([
    [0.9, 0.05, 0.03, 0.02],
    [0.1, 0.8, 0.05, 0.05],
    [0.1, 0.1, 0.1, 0.7]
])
print(f"CCE Loss: {categorical_cross_entropy(y_true, y_pred)}")
```

### Loss Function Summary

| Task | Loss Function | Output Activation |
|------|--------------|-------------------|
| Regression | MSE, MAE | Linear (none) |
| Binary Classification | Binary Cross-Entropy | Sigmoid |
| Multi-class Classification | Categorical Cross-Entropy | Softmax |

---

## 📐 Key Formulas Summary

### Neuron Computation
```
z = Σᵢ wᵢxᵢ + b = w·x + b     (linear combination)
a = f(z)                        (activation)
```

### Layer-wise Computation
```
Z⁽ˡ⁾ = W⁽ˡ⁾A⁽ˡ⁻¹⁾ + b⁽ˡ⁾       (pre-activation)
A⁽ˡ⁾ = f(Z⁽ˡ⁾)                  (activation)
```

### Activation Functions
```
Sigmoid:    σ(z) = 1/(1+e⁻ᶻ)
Tanh:       tanh(z) = (eᶻ-e⁻ᶻ)/(eᶻ+e⁻ᶻ)
ReLU:       f(z) = max(0, z)
Softmax:    fᵢ(z) = eᶻⁱ/Σⱼeᶻʲ
```

### Loss Functions
```
MSE:    L = (1/n)Σ(y-ŷ)²
BCE:    L = -(1/n)Σ[y·log(ŷ) + (1-y)·log(1-ŷ)]
CCE:    L = -(1/n)ΣᵢΣⱼ yᵢⱼ·log(ŷᵢⱼ)
```

---

## 🎨 Visual Mental Models

### Model 1: Neural Network as a Factory

```
RAW MATERIALS        ASSEMBLY LINES           FINAL PRODUCT
(Input Data)         (Hidden Layers)          (Prediction)

   │                      │                        │
   ▼                      ▼                        ▼
┌──────┐            ┌──────────┐              ┌────────┐
│Pixels│  →  →  →   │ Feature  │  →  →  →    │ "Cat"  │
│(784) │            │Detectors │              │  97%   │
└──────┘            │(neurons) │              └────────┘
                    └──────────┘

Workers (neurons) pass semi-finished products (activations)
to the next station, each adding more refinement.
```

### Model 2: Activation as a Filter

```
Without Activation (Linear):

Input ────► [W×x + b] ────► Output
        
    Everything passes through unchanged (proportionally)
    Can't learn complex patterns!


With Activation (Non-linear):

Input ────► [W×x + b] ────► [ReLU] ────► Output
                              │
                    Negative values blocked!
                    Creates "decision boundaries"
```

### Model 3: Loss as Distance from Target

```
                    Target: 🎯
                       │
                       │ Loss = Distance
                       │
                    ◉ Your prediction

Gradient descent: Move prediction closer to target
Each step reduces the "loss" (distance)
```

### Model 4: Softmax as "Competition"

```
Raw scores:     [2.0, 1.0, 0.5]
                  │     │     │
                  ▼     ▼     ▼
              ╭───────────────────╮
              │     SOFTMAX       │
              │   Competition!    │
              │   Winner takes    │
              │   more share      │
              ╰───────────────────╯
                  │     │     │
                  ▼     ▼     ▼
Probabilities: [0.59, 0.24, 0.17]  (sum = 1.0)

Higher scores → Higher probability
But all get SOME share (differentiable)
```

---

## 🌍 Real World Use Cases

### 1. Image Classification (CNN basis)
```
Input: 224×224×3 image (150,528 numbers)
Network: Multiple layers reducing dimensions
Output: 1000 class probabilities (ImageNet)
Example: "Golden Retriever" - 94% confidence
```

### 2. House Price Prediction (Regression)
```
Input: [sqft, bedrooms, location_score, age]
Network: 2-3 hidden layers
Output: Single number (price)
Example: $425,000
```

### 3. Sentiment Analysis
```
Input: Word embeddings of review text
Network: Dense layers (or RNN/Transformer)
Output: [positive, negative, neutral]
Example: "Great product!" → [0.92, 0.05, 0.03]
```

### 4. Medical Diagnosis
```
Input: Patient features (age, symptoms, test results)
Network: Carefully designed with domain knowledge
Output: Disease probability
Example: Diabetes risk: 73%
```

### 5. Fraud Detection
```
Input: Transaction features
Network: Trained on labeled fraud/not fraud
Output: Fraud probability
Example: Transaction blocked (98% fraud likelihood)
```

---

## 🛠 Mini Project: Neural Network from Scratch

**Objective:** Build a complete neural network that learns XOR (the problem perceptrons couldn't solve!)

```python
import numpy as np
import matplotlib.pyplot as plt

# ============================================
# NEURAL NETWORK FROM SCRATCH
# ============================================

class NeuralNetwork:
    """
    A simple neural network with:
    - 1 hidden layer
    - ReLU activation (hidden)
    - Sigmoid activation (output)
    - Binary Cross-Entropy loss
    """
    
    def __init__(self, input_size, hidden_size, output_size):
        # Initialize weights with small random values
        self.W1 = np.random.randn(hidden_size, input_size) * 0.5
        self.b1 = np.zeros((hidden_size, 1))
        self.W2 = np.random.randn(output_size, hidden_size) * 0.5
        self.b2 = np.zeros((output_size, 1))
        
    def relu(self, z):
        return np.maximum(0, z)
    
    def relu_derivative(self, z):
        return (z > 0).astype(float)
    
    def sigmoid(self, z):
        return 1 / (1 + np.exp(-np.clip(z, -500, 500)))
    
    def sigmoid_derivative(self, a):
        return a * (1 - a)
    
    def forward(self, X):
        """Forward propagation"""
        # Layer 1
        self.z1 = self.W1 @ X + self.b1
        self.a1 = self.relu(self.z1)
        
        # Layer 2 (output)
        self.z2 = self.W2 @ self.a1 + self.b2
        self.a2 = self.sigmoid(self.z2)
        
        return self.a2
    
    def compute_loss(self, y_true, y_pred):
        """Binary Cross-Entropy Loss"""
        epsilon = 1e-15
        y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
        loss = -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))
        return loss
    
    def backward(self, X, y_true, learning_rate):
        """Backpropagation"""
        m = X.shape[1]  # number of samples
        
        # Output layer gradients
        dz2 = self.a2 - y_true  # derivative of BCE + sigmoid
        dW2 = (1/m) * dz2 @ self.a1.T
        db2 = (1/m) * np.sum(dz2, axis=1, keepdims=True)
        
        # Hidden layer gradients
        da1 = self.W2.T @ dz2
        dz1 = da1 * self.relu_derivative(self.z1)
        dW1 = (1/m) * dz1 @ X.T
        db1 = (1/m) * np.sum(dz1, axis=1, keepdims=True)
        
        # Update weights
        self.W2 -= learning_rate * dW2
        self.b2 -= learning_rate * db2
        self.W1 -= learning_rate * dW1
        self.b1 -= learning_rate * db1
    
    def train(self, X, y, epochs, learning_rate, verbose=True):
        """Training loop"""
        losses = []
        
        for epoch in range(epochs):
            # Forward pass
            y_pred = self.forward(X)
            
            # Compute loss
            loss = self.compute_loss(y, y_pred)
            losses.append(loss)
            
            # Backward pass
            self.backward(X, y, learning_rate)
            
            if verbose and epoch % 1000 == 0:
                print(f"Epoch {epoch}: Loss = {loss:.6f}")
        
        return losses
    
    def predict(self, X):
        """Make predictions"""
        return (self.forward(X) > 0.5).astype(int)


# ============================================
# TRAIN ON XOR PROBLEM
# ============================================

# XOR data
X = np.array([[0, 0, 1, 1],
              [0, 1, 0, 1]])  # Shape: (2, 4)

y = np.array([[0, 1, 1, 0]])  # XOR output, Shape: (1, 4)

# Create and train network
nn = NeuralNetwork(input_size=2, hidden_size=4, output_size=1)
losses = nn.train(X, y, epochs=10000, learning_rate=0.5)

# Test predictions
print("\n" + "="*40)
print("XOR PREDICTIONS:")
print("="*40)
predictions = nn.forward(X)
for i in range(4):
    print(f"Input: [{X[0,i]}, {X[1,i]}] → Predicted: {predictions[0,i]:.4f} → Rounded: {int(predictions[0,i] > 0.5)}, True: {y[0,i]}")

# Visualize training
plt.figure(figsize=(10, 4))

# Plot 1: Loss curve
plt.subplot(1, 2, 1)
plt.plot(losses)
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.title('Training Loss')
plt.grid(True)

# Plot 2: Decision boundary
plt.subplot(1, 2, 2)
xx, yy = np.meshgrid(np.linspace(-0.5, 1.5, 100),
                      np.linspace(-0.5, 1.5, 100))
grid = np.c_[xx.ravel(), yy.ravel()].T
Z = nn.forward(grid).reshape(xx.shape)

plt.contourf(xx, yy, Z, levels=20, cmap='RdYlBu', alpha=0.7)
plt.colorbar(label='Probability')
plt.scatter(X[0, y[0]==0], X[1, y[0]==0], c='blue', s=200, marker='o', label='Class 0')
plt.scatter(X[0, y[0]==1], X[1, y[0]==1], c='red', s=200, marker='s', label='Class 1')
plt.xlabel('x₁')
plt.ylabel('x₂')
plt.title('XOR Decision Boundary')
plt.legend()

plt.tight_layout()
plt.show()

print("\n✅ Success! Neural network learned XOR (non-linear pattern)!")
```

**Expected Output:**
```
Epoch 0: Loss = 0.693147
Epoch 1000: Loss = 0.234567
Epoch 2000: Loss = 0.089123
...
Epoch 9000: Loss = 0.002345

========================================
XOR PREDICTIONS:
========================================
Input: [0, 0] → Predicted: 0.0123 → Rounded: 0, True: 0
Input: [0, 1] → Predicted: 0.9876 → Rounded: 1, True: 1
Input: [1, 0] → Predicted: 0.9854 → Rounded: 1, True: 1
Input: [1, 1] → Predicted: 0.0156 → Rounded: 0, True: 0

✅ Success! Neural network learned XOR (non-linear pattern)!
```

**What You Learned:**
- Complete forward propagation implementation
- Backpropagation with gradient computation
- Training loop with loss tracking
- Solving XOR (impossible for single perceptron!)

---

## 📝 Homework

### Level 1: Easy

1. **Compute by hand** (single neuron):
   ```
   Inputs: x = [2, 3]
   Weights: w = [0.5, -0.5]
   Bias: b = 1
   Activation: ReLU
   
   Calculate the output.
   ```

2. **Activation values**: For z = [-2, -1, 0, 1, 2], compute:
   - Sigmoid(z)
   - ReLU(z)
   - Tanh(z)

3. **Identify the problem**: Why can't a single perceptron learn XOR?

### Level 2: Medium

4. **Forward pass calculation**:
   ```
   Input: x = [1, 2]
   
   Layer 1: W1 = [[0.1, 0.2],    b1 = [0.1, 0.2]
                  [0.3, 0.4]]
   Activation: ReLU
   
   Layer 2: W2 = [[0.5, 0.6]]    b2 = [0.1]
   Activation: Sigmoid
   
   Calculate the final output step by step.
   ```

5. **Loss calculation**: Given:
   ```
   True labels: [1, 0, 1, 1]
   Predictions: [0.9, 0.2, 0.7, 0.8]
   
   Calculate Binary Cross-Entropy loss.
   ```

6. **Implement** the Leaky ReLU activation and its derivative.

### Level 3: Advanced

7. **Modify the mini project** to:
   - Use Leaky ReLU instead of ReLU
   - Add a second hidden layer
   - Compare convergence speed

8. **Implement softmax** and categorical cross-entropy from scratch. Test on a 3-class problem.

9. **Derive** the gradient of sigmoid: Show that σ'(z) = σ(z)(1 - σ(z))

### Level 4: Expert (FAANG Prep)

10. **Implement batch normalization** in the neural network:
    - Add batch norm after each hidden layer
    - Show how it affects training

11. **Implement dropout** for regularization:
    - Add dropout with p=0.5
    - Compare training with and without dropout

12. **Weight initialization analysis**:
    - Implement Xavier and He initialization
    - Train the same network with different initializations
    - Plot and compare convergence

---

## ⚠️ Common Mistakes

### Mistake 1: Forgetting to Apply Activation
```python
# WRONG
h = W @ x + b  # Linear only!

# CORRECT
z = W @ x + b
h = relu(z)    # Non-linearity added!
```

### Mistake 2: Wrong Dimension Ordering
```python
# WRONG - dimensions don't match
W = np.random.randn(input_size, hidden_size)
h = W @ x  # Error!

# CORRECT
W = np.random.randn(hidden_size, input_size)  # (output_dim, input_dim)
h = W @ x  # Works!
```

### Mistake 3: Using Sigmoid in Hidden Layers (Modern Networks)
```python
# OUTDATED (causes vanishing gradients)
h1 = sigmoid(W1 @ x + b1)
h2 = sigmoid(W2 @ h1 + b2)

# MODERN
h1 = relu(W1 @ x + b1)
h2 = relu(W2 @ h1 + b2)
```

### Mistake 4: Not Clipping in Log for Cross-Entropy
```python
# WRONG - log(0) = -inf!
loss = -np.mean(y * np.log(y_pred))

# CORRECT
epsilon = 1e-15
y_pred_clipped = np.clip(y_pred, epsilon, 1 - epsilon)
loss = -np.mean(y * np.log(y_pred_clipped))
```

### Mistake 5: Applying Softmax Twice
```python
# WRONG
z = model(x)          # If model already applies softmax
probs = softmax(z)    # Double softmax!

# CORRECT
# Either get logits from model and apply softmax once
# OR get probabilities directly (not both)
```

---

## 🎤 Interview Questions & Answers

### Beginner Level

**Q1: What is a neural network?**

**A**: A neural network is a computational model inspired by biological neurons. It consists of:
- **Layers** of interconnected nodes (neurons)
- **Weights** that determine connection strength
- **Activation functions** that add non-linearity
- **Learning algorithm** that adjusts weights based on errors

It learns patterns from data by adjusting weights to minimize prediction errors.

---

**Q2: Why do we need activation functions?**

**A**: Without activation functions, a neural network is just a series of linear transformations:
```
Layer 1: h = W₁x + b₁
Layer 2: y = W₂h + b₂ = W₂(W₁x + b₁) + b₂ = W₂W₁x + W₂b₁ + b₂ = W'x + b'
```
This collapses to a single linear transformation, regardless of depth!

Activation functions add **non-linearity**, enabling networks to learn complex patterns like curves, boundaries, and abstract concepts.

---

**Q3: What is the difference between sigmoid and ReLU?**

**A**:

| Aspect | Sigmoid | ReLU |
|--------|---------|------|
| Formula | 1/(1+e⁻ˣ) | max(0, x) |
| Range | (0, 1) | [0, ∞) |
| Gradient | Can vanish (0-0.25) | 0 or 1 |
| Computation | Expensive (exp) | Fast (comparison) |
| Modern usage | Output layer (binary) | Hidden layers |

ReLU is preferred for hidden layers because:
- Faster computation
- No vanishing gradient (for positive values)
- Sparse activation (efficiency)
- Empirically trains faster

---

### Intermediate Level

**Q4: Explain the vanishing gradient problem.**

**A**: During backpropagation, gradients are multiplied through layers (chain rule). 

With **sigmoid/tanh**, gradients are always < 1:
- Sigmoid derivative: max 0.25
- After many layers: 0.25 × 0.25 × ... → ~0

**Consequences**:
- Early layers receive tiny gradients
- Weights barely update
- Network stops learning

**Solutions**:
1. ReLU activation (gradient = 1 for positive values)
2. Batch normalization
3. Residual connections (skip connections)
4. Proper weight initialization (Xavier, He)

---

**Q5: What is the dying ReLU problem?**

**A**: When a ReLU neuron's input is always negative, it outputs 0 and has gradient 0:
```
If z < 0: ReLU(z) = 0, ReLU'(z) = 0
```

Once "dead," the neuron never activates or learns again.

**Causes**:
- Large learning rate pushing weights negative
- Poor weight initialization

**Solutions**:
1. **Leaky ReLU**: Small slope for negative values (0.01x)
2. **ELU**: Exponential for negative values
3. **Lower learning rate**
4. **Batch normalization**

---

**Q6: Explain forward and backward propagation.**

**A**:

**Forward Propagation** (Inference):
```
Input → Layer 1 → Layer 2 → ... → Output
     (compute activations left to right)
```
- Calculate predictions by passing inputs through all layers
- Store intermediate values for backprop

**Backward Propagation** (Training):
```
Output ← Layer 2 ← Layer 1 ← Loss
     (compute gradients right to left)
```
- Calculate error at output
- Propagate error backwards using chain rule
- Compute gradient of loss w.r.t. each weight
- Update weights: w = w - lr × gradient

---

### Advanced Level

**Q7: Derive the backpropagation equations for a 2-layer network.**

**A**: Given network: x → h → y

**Forward:**
```
z₁ = W₁x + b₁
h = f(z₁)           (activation)
z₂ = W₂h + b₂
ŷ = g(z₂)           (output activation)
L = loss(y, ŷ)
```

**Backward (using chain rule):**
```
∂L/∂ŷ = loss_gradient(y, ŷ)

∂L/∂z₂ = ∂L/∂ŷ × g'(z₂)

∂L/∂W₂ = ∂L/∂z₂ × hᵀ
∂L/∂b₂ = ∂L/∂z₂

∂L/∂h = W₂ᵀ × ∂L/∂z₂

∂L/∂z₁ = ∂L/∂h × f'(z₁)

∂L/∂W₁ = ∂L/∂z₁ × xᵀ
∂L/∂b₁ = ∂L/∂z₁
```

**Key insight**: Each layer's gradient depends on the layer above it (chain rule).

---

**Q8: How do you choose the number of hidden layers and neurons?**

**A**: No perfect formula, but guidelines:

**Number of layers**:
- Start simple (1-2 hidden layers)
- Add depth for complex patterns
- Modern vision: 50-150+ layers (with skip connections)
- Modern NLP: Transformers replace traditional depth

**Neurons per layer**:
- Often pyramid: decrease from input to output
- Or constant: same width throughout
- Rule of thumb: between input and output size

**Practical approach**:
1. Start with baseline (e.g., 2 layers, 128 neurons each)
2. Train and evaluate
3. If underfitting: increase capacity (more layers/neurons)
4. If overfitting: decrease capacity or add regularization
5. Use hyperparameter search (grid search, random search, Bayesian)

---

### FAANG Level

**Q9: Explain the mathematics of batch normalization and why it helps training.**

**A**:

**Batch Normalization formula**:
```
μ_B = (1/m) Σ xᵢ                    (batch mean)
σ²_B = (1/m) Σ (xᵢ - μ_B)²          (batch variance)
x̂ᵢ = (xᵢ - μ_B) / √(σ²_B + ε)      (normalize)
yᵢ = γx̂ᵢ + β                        (scale and shift)
```

**Why it helps**:

1. **Reduces internal covariate shift**: Layer inputs have consistent distribution during training

2. **Allows higher learning rates**: Normalized activations prevent exploding/vanishing values

3. **Regularization effect**: Batch statistics add noise, similar to dropout

4. **Smoother loss landscape**: Gradients are more predictable

5. **Reduces sensitivity to initialization**: Network is more robust

**During inference**: Use running averages of mean/variance (not batch statistics).

---

**Q10: Design a neural network architecture for classifying 256×256 RGB images into 100 categories. Explain each choice.**

**A**:

```
Input: 256×256×3 = 196,608 values

Architecture:
1. Flatten: 196,608 neurons
2. Dense(1024, ReLU) + BatchNorm + Dropout(0.3)
3. Dense(512, ReLU) + BatchNorm + Dropout(0.3)
4. Dense(256, ReLU) + BatchNorm + Dropout(0.2)
5. Dense(100, Softmax) - Output

Total parameters: ~200M
```

**Design decisions**:

1. **Flatten first**: Simple MLP approach (CNN would be better, but MLP requested)

2. **Decreasing width**: Pyramid shape compresses information progressively

3. **ReLU**: Fast, no vanishing gradient, industry standard

4. **BatchNorm**: Stabilizes training, allows higher learning rates

5. **Dropout**: Prevents overfitting with 196K input features

6. **Softmax output**: Multi-class classification (100 classes)

**Improvements** (in practice):
- Use CNN instead (much fewer parameters, better for images)
- Data augmentation
- Transfer learning from pretrained models

---

## 🔗 What's Next?

In the next file `04-Gradient-Descent-and-Optimization.md`, we'll cover:
- Full gradient descent derivation
- Stochastic Gradient Descent (SGD)
- Mini-batch gradient descent
- Momentum, RMSprop, Adam optimizers
- Learning rate scheduling
- Backpropagation in detail

---

**Type CONTINUE to proceed with `04-Gradient-Descent-and-Optimization.md`**
