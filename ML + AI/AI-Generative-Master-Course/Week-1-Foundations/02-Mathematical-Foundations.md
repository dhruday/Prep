# 📐 Mathematical Foundations for AI

## 🎯 What You'll Learn

This chapter covers ALL the math you need for deep learning:
- Linear Algebra (vectors, matrices, operations)
- Calculus (derivatives, gradients, chain rule)
- Probability & Statistics (distributions, Bayes)

**No prior math beyond high school required!**

---

## 🔢 Part 1: Linear Algebra

### Why Linear Algebra for AI?

Neural networks are essentially **matrix multiplication machines**:

```
Input (vector) → [Matrix multiply] → [Matrix multiply] → Output (vector)
                    Layer 1             Layer 2

Every "layer" is a matrix multiplication!
```

---

### 1.1 Vectors

#### Beginner Explanation

A **vector** is just a list of numbers:

```python
# A vector with 3 elements
v = [1, 2, 3]

# In AI context:
# - Word embedding: [0.2, -0.5, 0.8, 0.1, ...]  (300+ numbers)
# - Image pixel row: [255, 128, 0, 64, ...]
# - Features: [age, income, credit_score]
```

#### Visual Mental Model

```
               ┌───┐
Scalar:    5   │   │  (just a number)
               └───┘

           ┌───┐
           │ 1 │
Vector:    │ 2 │     (list of numbers, has direction)
           │ 3 │
           └───┘

           ┌─────────┐
           │ 1  2  3 │
Matrix:    │ 4  5  6 │   (grid of numbers)
           │ 7  8  9 │
           └─────────┘
```

#### Technical: Vector Operations

```python
import numpy as np

# Creating vectors
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Addition (element-wise)
c = a + b  # [5, 7, 9]

# Scalar multiplication
d = 2 * a  # [2, 4, 6]

# Dot product (VERY important!)
dot = np.dot(a, b)  # 1*4 + 2*5 + 3*6 = 32
```

#### The Dot Product - Your Most Important Operation

```
Dot Product = Σ(aᵢ × bᵢ)

a = [1, 2, 3]
b = [4, 5, 6]

a · b = (1×4) + (2×5) + (3×6) = 4 + 10 + 18 = 32
```

**Why it matters for AI:**
- Measures similarity between vectors
- Every neuron computes a dot product!
- Attention mechanism uses dot products

```
Neuron:
    inputs = [x₁, x₂, x₃]
    weights = [w₁, w₂, w₃]
    
    output = x₁w₁ + x₂w₂ + x₃w₃ = dot(inputs, weights)
```

---

### 1.2 Matrices

#### Beginner Explanation

A **matrix** is a 2D grid of numbers:

```python
# 2x3 matrix (2 rows, 3 columns)
M = [[1, 2, 3],
     [4, 5, 6]]
```

**In AI, matrices represent:**
- Image: Height × Width (or H × W × Channels)
- Dataset: Samples × Features
- Neural network layer: Input_size × Output_size

#### Matrix Multiplication

This is THE fundamental operation of neural networks.

```
Matrix A (2×3) × Matrix B (3×2) = Result (2×2)

A = │1  2  3│     B = │7  10│
    │4  5  6│         │8  11│
                      │9  12│

Result[0,0] = Row 0 of A · Column 0 of B
            = [1,2,3] · [7,8,9]
            = 1×7 + 2×8 + 3×9 = 50

Result = │50   68│
         │122  167│
```

**Rule:** (m×n) × (n×p) = (m×p)
- Inner dimensions must match
- Result has outer dimensions

#### Code Example

```python
import numpy as np

# Matrix creation
A = np.array([[1, 2, 3],
              [4, 5, 6]])  # Shape: (2, 3)

B = np.array([[7, 10],
              [8, 11],
              [9, 12]])    # Shape: (3, 2)

# Matrix multiplication
C = np.dot(A, B)  # or A @ B
# C shape: (2, 2)

print(C)
# [[50  68]
#  [122 167]]
```

---

### 1.3 Matrix Operations in Neural Networks

#### A Single Layer

```
┌─────────────────────────────────────────────────────┐
│                NEURAL NETWORK LAYER                  │
│                                                      │
│  Input: x (1×n vector)                              │
│  Weights: W (n×m matrix)                            │
│  Bias: b (1×m vector)                               │
│                                                      │
│  Forward pass:                                       │
│  z = xW + b       ← Matrix multiply + add           │
│  a = activation(z) ← Apply non-linearity            │
│                                                      │
│  Example:                                            │
│  x = [1, 2]       (2 inputs)                        │
│  W = [[0.5, 0.3, 0.1],                              │
│       [0.2, 0.4, 0.6]]  (2→3 transformation)        │
│  b = [0.1, 0.1, 0.1]                                │
│                                                      │
│  z = [1,2] @ [[0.5,0.3,0.1],                        │
│               [0.2,0.4,0.6]]                         │
│    = [0.9, 1.1, 1.3]                                │
│                                                      │
│  z + b = [1.0, 1.2, 1.4]                            │
│                                                      │
│  Output: 3 values from 2 inputs!                    │
└─────────────────────────────────────────────────────┘
```

#### Batch Processing

```python
# Processing 32 samples at once
batch_size = 32
input_size = 100
output_size = 10

X = np.random.randn(batch_size, input_size)   # (32, 100)
W = np.random.randn(input_size, output_size)  # (100, 10)
b = np.random.randn(output_size)              # (10,)

# Forward pass - ALL 32 samples at once!
Z = X @ W + b  # (32, 10)

# This is why GPUs are fast - they're designed for matrix multiply!
```

---

### 1.4 Transpose

Flipping a matrix along its diagonal:

```
A = │1  2  3│
    │4  5  6│

Aᵀ = │1  4│
     │2  5│
     │3  6│

Shape (2,3) → Shape (3,2)
```

```python
A = np.array([[1, 2, 3], [4, 5, 6]])
A_T = A.T  # Transpose
```

**Why it matters:**
- Gradient calculations require transpose
- Attention: QKᵀ (Q times K-transpose)

---

### 1.5 Key Formulas Summary

| Operation | Formula | Python |
|-----------|---------|--------|
| Dot Product | a·b = Σaᵢbᵢ | `np.dot(a, b)` |
| Matrix Multiply | C = AB | `A @ B` |
| Transpose | Aᵀ | `A.T` |
| Element-wise | C = A ⊙ B | `A * B` |
| Norm (length) | ‖x‖ = √(Σxᵢ²) | `np.linalg.norm(x)` |

---

## 📈 Part 2: Calculus for AI

### Why Calculus for AI?

**Learning = Optimization = Finding minimum loss**

Calculus tells us HOW to adjust weights to reduce loss.

```
Loss
  │
  │   ╲
  │    ╲    We want to find
  │     ╲   the bottom!
  │      ╲
  │       ╲___/
  │
  └────────────────── weights
  
Derivative tells us which direction is "downhill"
```

---

### 2.1 Derivatives - The Core Concept

#### Beginner Explanation

A **derivative** measures "how much output changes when input changes."

```
Function: f(x) = x²

If x = 3: f(3) = 9
If x = 4: f(4) = 16

The function increased by 7 when x increased by 1.
At x=3, the "slope" is about 6 (derivative = 2x = 6)
```

#### Visual Mental Model

```
                y
                │     
                │        __╱
                │      ╱
                │    ╱ ← slope here = derivative
                │  ╱
                │╱
                └──────────── x
                
Derivative = slope of the tangent line at that point
```

#### Key Derivatives for AI

```
Function        Derivative      Why it matters
────────────────────────────────────────────────
f(x) = c        f'(x) = 0       Constant has no slope
f(x) = x        f'(x) = 1       Linear
f(x) = x²       f'(x) = 2x      Quadratic loss
f(x) = xⁿ       f'(x) = nxⁿ⁻¹   Power rule
f(x) = eˣ       f'(x) = eˣ      Softmax uses this
f(x) = ln(x)    f'(x) = 1/x     Cross-entropy loss
f(x) = sigmoid  f'(x) = f(1-f)  Activation function
f(x) = ReLU     f'(x) = {1 if x>0, 0 otherwise}
```

---

### 2.2 Partial Derivatives

When you have multiple inputs:

```
f(x, y) = x² + 3xy + y²

Partial derivative with respect to x (treat y as constant):
∂f/∂x = 2x + 3y

Partial derivative with respect to y (treat x as constant):
∂f/∂y = 3x + 2y
```

**In neural networks:**
- Loss depends on ALL weights
- We need partial derivative with respect to EACH weight

---

### 2.3 The Gradient

The **gradient** is the vector of all partial derivatives:

```
f(x, y, z) = x² + y² + z²

Gradient: ∇f = [∂f/∂x, ∂f/∂y, ∂f/∂z]
             = [2x, 2y, 2z]
```

**Key property:** Gradient points in direction of steepest INCREASE.

To decrease loss, go in **opposite** direction:

```
weights_new = weights_old - learning_rate × gradient
```

---

### 2.4 The Chain Rule - Heart of Backpropagation

#### The Rule

If y = f(g(x)), then:
```
dy/dx = dy/dg × dg/dx
```

**"Derivative of outer × Derivative of inner"**

#### Example

```
y = (3x + 2)²

Let g = 3x + 2  (inner function)
Let y = g²      (outer function)

dy/dg = 2g = 2(3x + 2)
dg/dx = 3

dy/dx = 2(3x + 2) × 3 = 6(3x + 2)
```

#### Why This Matters for Neural Networks

```
Neural network is a CHAIN of functions:

Input → Layer1 → Layer2 → Layer3 → Loss
  x   →   h1   →   h2   →   h3   →   L

To find ∂L/∂W1 (how Layer1 weights affect loss):

∂L/∂W1 = ∂L/∂h3 × ∂h3/∂h2 × ∂h2/∂h1 × ∂h1/∂W1

This is BACKPROPAGATION - chain rule applied backwards!
```

---

### 2.5 Backpropagation Example

```python
# Simple 2-layer network
# Forward: x → h = xW1 → y = hW2 → loss = (y - target)²

import numpy as np

# Setup
x = 2.0
W1 = 0.5
W2 = 0.3
target = 1.0

# Forward pass
h = x * W1           # h = 1.0
y = h * W2           # y = 0.3
loss = (y - target)**2  # loss = 0.49

# Backward pass (chain rule!)
dloss_dy = 2 * (y - target)     # = 2 * (0.3 - 1.0) = -1.4
dy_dh = W2                       # = 0.3
dh_dW1 = x                       # = 2.0
dy_dW2 = h                       # = 1.0

# Gradients
dloss_dW2 = dloss_dy * dy_dW2   # = -1.4 * 1.0 = -1.4
dloss_dW1 = dloss_dy * dy_dh * dh_dW1  # = -1.4 * 0.3 * 2.0 = -0.84

print(f"Gradient for W1: {dloss_dW1}")
print(f"Gradient for W2: {dloss_dW2}")

# Update weights
lr = 0.1
W1 = W1 - lr * dloss_dW1  # W1 increases (negative gradient)
W2 = W2 - lr * dloss_dW2  # W2 increases
```

---

### 2.6 Calculus Formulas Summary

| Concept | Formula | Use in AI |
|---------|---------|-----------|
| Derivative | df/dx = lim(Δf/Δx) | Rate of change |
| Chain Rule | df/dx = df/dg × dg/dx | Backpropagation |
| Gradient | ∇f = [∂f/∂x₁, ∂f/∂x₂, ...] | Direction of steepest ascent |
| Gradient Descent | θ = θ - α∇L | Learning algorithm |

---

## 🎲 Part 3: Probability & Statistics

### Why Probability for AI?

- **Predictions are probabilistic:** "80% likely spam"
- **Loss functions** are based on probability
- **Generation** requires sampling from distributions

---

### 3.1 Basic Probability

#### Core Concepts

```
P(A) = probability of event A
     = (favorable outcomes) / (total outcomes)

Example: Rolling a 6 on a die
P(6) = 1/6 ≈ 0.167 = 16.7%

Properties:
- 0 ≤ P(A) ≤ 1
- P(certain event) = 1
- P(impossible event) = 0
```

#### Joint Probability

```
P(A and B) = P(A ∩ B)

If independent: P(A ∩ B) = P(A) × P(B)

Example: Two coin flips
P(heads AND heads) = 0.5 × 0.5 = 0.25
```

#### Conditional Probability

```
P(A|B) = probability of A given B happened
       = P(A ∩ B) / P(B)

Example: 
P(rain | clouds) = P(rain AND clouds) / P(clouds)
```

---

### 3.2 Bayes' Theorem

#### The Formula

```
P(A|B) = P(B|A) × P(A) / P(B)
```

**In words:**
```
posterior = likelihood × prior / evidence
```

#### AI Application: Naive Bayes Spam Filter

```
P(spam | "free money") = P("free money" | spam) × P(spam)
                         ─────────────────────────────────
                              P("free money")

Given:
- P("free money" | spam) = 0.8    (80% of spam has these words)
- P(spam) = 0.3                    (30% of emails are spam)
- P("free money") = 0.1            (10% of all emails have this)

P(spam | "free money") = (0.8 × 0.3) / 0.1 = 2.4

Wait, > 1? We normalize:
P(spam | "free money") ≈ 0.89 (89% likely spam)
```

---

### 3.3 Common Probability Distributions

#### Normal (Gaussian) Distribution

```
        ┌───────────────┐
        │   ╭─────╮     │
        │  ╱       ╲    │  Most values cluster
        │ ╱         ╲   │  around the mean
        │╱           ╲  │
        ├─────────────────┤
              mean (μ)

Formula: P(x) = (1/√(2πσ²)) × e^(-(x-μ)²/(2σ²))

Parameters:
- μ (mu) = mean (center)
- σ (sigma) = standard deviation (spread)
```

**Why it matters:**
- Weight initialization often uses normal distribution
- Many natural phenomena are normally distributed

```python
import numpy as np

# Initialize weights from normal distribution
weights = np.random.randn(100, 50) * 0.01  # mean=0, std=0.01
```

---

#### Softmax - Turning Scores into Probabilities

```
softmax(z)ᵢ = eᶻⁱ / Σⱼeᶻʲ

Example:
z = [2.0, 1.0, 0.1]

e^z = [7.39, 2.72, 1.11]
sum = 11.22

softmax(z) = [0.66, 0.24, 0.10]  # Now sums to 1!
```

**Why it matters:**
- Last layer of classification networks
- Converts raw scores to probabilities

```python
def softmax(z):
    exp_z = np.exp(z - np.max(z))  # Subtract max for numerical stability
    return exp_z / exp_z.sum()

scores = np.array([2.0, 1.0, 0.1])
probs = softmax(scores)  # [0.66, 0.24, 0.10]
```

---

### 3.4 Expected Value and Variance

#### Expected Value (Mean)

```
E[X] = Σ xᵢP(xᵢ)  (discrete)
     = ∫ x·p(x)dx  (continuous)

Simple case: E[X] = (x₁ + x₂ + ... + xₙ) / n
```

#### Variance (Spread)

```
Var(X) = E[(X - μ)²] = E[X²] - E[X]²

Standard deviation: σ = √Var(X)
```

**Why it matters:**
- Batch normalization uses mean and variance
- Understanding model uncertainty

---

### 3.5 Cross-Entropy Loss

The most common loss function for classification:

```
Cross-Entropy = -Σ yᵢ log(ŷᵢ)

Where:
- y = true distribution (one-hot: [0, 0, 1, 0])
- ŷ = predicted distribution ([0.1, 0.1, 0.7, 0.1])
```

**Why -log?**
```
If prediction is correct (ŷ close to 1):
    -log(0.9) = 0.1  (low loss ✓)

If prediction is wrong (ŷ close to 0):
    -log(0.1) = 2.3  (high loss ✗)
```

```python
def cross_entropy(y_true, y_pred):
    # Clip to avoid log(0)
    y_pred = np.clip(y_pred, 1e-15, 1 - 1e-15)
    return -np.sum(y_true * np.log(y_pred))

# True class is index 2
y_true = np.array([0, 0, 1, 0])
y_pred = np.array([0.1, 0.1, 0.7, 0.1])

loss = cross_entropy(y_true, y_pred)  # ≈ 0.357
```

---

### 3.6 Maximum Likelihood Estimation (MLE)

**Goal:** Find parameters that make observed data most likely.

```
Given data D and model with parameters θ:

L(θ) = P(D|θ) = ∏ P(xᵢ|θ)  (likelihood)

We maximize log-likelihood (easier to work with):
log L(θ) = Σ log P(xᵢ|θ)

Minimizing negative log-likelihood = Minimizing cross-entropy!
```

**Key insight:** Training neural networks = Maximum likelihood estimation

---

## 🛠️ Section 4: Mini Projects

### Project 1: Implementing Matrix Operations

```python
import numpy as np

class MatrixOps:
    @staticmethod
    def dot_product(a, b):
        """Calculate dot product manually"""
        assert len(a) == len(b), "Vectors must be same length"
        result = 0
        for i in range(len(a)):
            result += a[i] * b[i]
        return result
    
    @staticmethod
    def matrix_multiply(A, B):
        """Matrix multiplication from scratch"""
        rows_A, cols_A = len(A), len(A[0])
        rows_B, cols_B = len(B), len(B[0])
        
        assert cols_A == rows_B, f"Cannot multiply {rows_A}x{cols_A} and {rows_B}x{cols_B}"
        
        result = [[0 for _ in range(cols_B)] for _ in range(rows_A)]
        
        for i in range(rows_A):
            for j in range(cols_B):
                for k in range(cols_A):
                    result[i][j] += A[i][k] * B[k][j]
        
        return result
    
    @staticmethod
    def transpose(A):
        """Transpose matrix"""
        rows, cols = len(A), len(A[0])
        return [[A[i][j] for i in range(rows)] for j in range(cols)]

# Test
a = [1, 2, 3]
b = [4, 5, 6]
print(f"Dot product: {MatrixOps.dot_product(a, b)}")  # 32

A = [[1, 2], [3, 4]]
B = [[5, 6], [7, 8]]
print(f"Matrix multiply: {MatrixOps.matrix_multiply(A, B)}")
# [[19, 22], [43, 50]]
```

### Project 2: Gradient Descent Visualization

```python
import numpy as np
import matplotlib.pyplot as plt

def gradient_descent_2d():
    """Visualize gradient descent on f(x,y) = x² + y²"""
    
    # Function and gradient
    def f(x, y):
        return x**2 + y**2
    
    def grad_f(x, y):
        return np.array([2*x, 2*y])
    
    # Starting point
    x, y = 3.0, 4.0
    lr = 0.1
    history = [(x, y, f(x, y))]
    
    # Gradient descent
    for i in range(20):
        grad = grad_f(x, y)
        x = x - lr * grad[0]
        y = y - lr * grad[1]
        history.append((x, y, f(x, y)))
    
    # Visualization
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Contour plot with path
    xx, yy = np.meshgrid(np.linspace(-4, 4, 100), np.linspace(-5, 5, 100))
    zz = f(xx, yy)
    
    axes[0].contour(xx, yy, zz, levels=20)
    path = np.array([(h[0], h[1]) for h in history])
    axes[0].plot(path[:, 0], path[:, 1], 'r.-', markersize=10)
    axes[0].set_xlabel('x')
    axes[0].set_ylabel('y')
    axes[0].set_title('Gradient Descent Path')
    
    # Loss curve
    losses = [h[2] for h in history]
    axes[1].plot(losses, 'b-')
    axes[1].set_xlabel('Iteration')
    axes[1].set_ylabel('Loss (f(x,y))')
    axes[1].set_title('Loss over Time')
    
    plt.tight_layout()
    plt.savefig('gradient_descent.png')
    plt.show()
    
    print(f"Started at: (3.0, 4.0) with loss {f(3.0, 4.0)}")
    print(f"Ended at: ({x:.4f}, {y:.4f}) with loss {f(x, y):.6f}")

gradient_descent_2d()
```

---

## 📝 Homework

### Easy
1. Calculate: [1, 2, 3] · [4, 5, 6]
2. What is the shape of the result when multiplying (3, 4) × (4, 2)?
3. What is the derivative of f(x) = 3x² + 2x + 1?

### Medium
4. Implement softmax from scratch in Python
5. Given f(x, y) = x²y + xy², find ∂f/∂x and ∂f/∂y
6. Calculate cross-entropy loss for y=[0,1,0] and ŷ=[0.1, 0.8, 0.1]

### Advanced
7. Prove that the gradient points in the direction of steepest ascent
8. Implement backpropagation for a 2-layer network from scratch
9. Derive the gradient of softmax cross-entropy loss

---

## ⚠️ Common Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---------|----------------|------------------|
| Matrix multiply order | A×B ≠ B×A | Check dimensions match |
| Forgetting chain rule | Gradients don't flow | Apply chain rule at every step |
| log(0) in cross-entropy | Undefined, -infinity | Clip predictions: max(pred, 1e-15) |
| Wrong gradient sign | Goes uphill instead of down | Subtract gradient, not add |
| Ignoring numerical stability | Overflow in softmax | Subtract max before exp() |

---

## 🎤 Interview Questions

### Beginner

**Q1: What is a dot product?**
> Multiply corresponding elements and sum. For vectors a and b: Σaᵢbᵢ. Measures similarity between vectors.

**Q2: What is a gradient?**
> Vector of partial derivatives. Points in direction of steepest increase. For loss functions, we go in the opposite direction.

**Q3: Why do we use softmax?**
> Converts raw scores to probabilities (0-1, sum to 1). Used for multi-class classification.

### Intermediate

**Q4: Explain the chain rule in context of neural networks.**
> When functions are composed (layers stacked), the derivative of the whole is the product of individual derivatives. This is backpropagation - computing gradients by multiplying local gradients from output to input.

**Q5: Why is cross-entropy used instead of MSE for classification?**
> Cross-entropy provides stronger gradients when predictions are wrong. MSE gradients can be small even when predictions are very wrong, leading to slow learning.

### Advanced/FAANG

**Q6: Derive the gradient of softmax cross-entropy loss.**
> For loss L = -Σyᵢlog(ŷᵢ) where ŷ = softmax(z):
> ∂L/∂zⱼ = ŷⱼ - yⱼ
> 
> This elegant result is why softmax + cross-entropy is used together.

**Q7: Explain numerical stability issues in neural network computations.**
> 1. Softmax overflow: exp(large) = inf. Solution: subtract max.
> 2. Log underflow: log(tiny) = -inf. Solution: clip values.
> 3. Gradient explosion/vanishing: Multiply many values. Solution: careful initialization, batch norm, residual connections.

---

## ✅ Chapter Summary

| Topic | Key Takeaway |
|-------|--------------|
| Vectors | Dot product measures similarity |
| Matrices | Neural network layers = matrix multiplication |
| Derivatives | Measure rate of change |
| Chain Rule | Backpropagation = repeated chain rule |
| Gradient | Points to steepest increase |
| Probability | Predictions as distributions |
| Cross-Entropy | -log(correct class prob) |

---

## 🔜 Next Up

Continue to → [03-Neural-Networks.md](./03-Neural-Networks.md)

Now that you understand the math, we'll build actual neural networks!
- The perceptron
- Activation functions
- Forward propagation
- Building your first network

*Math ➝ Code ➝ Neural Networks!* 🧠
