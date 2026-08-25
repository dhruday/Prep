# 🔢 Linear Algebra for AI

> **Prerequisite:** Basic arithmetic (addition, multiplication)
> **Time:** 2-3 hours
> **Difficulty:** ⭐⭐ (Beginner-friendly)

---

## 📚 Table of Contents

1. [Learning Objectives](#-learning-objectives)
2. [Why Linear Algebra for AI?](#-why-linear-algebra-for-ai)
3. [Part 1: Scalars, Vectors, and Matrices](#-part-1-scalars-vectors-and-matrices)
4. [Part 2: Matrices](#-part-2-matrices)
5. [Part 3: Special Matrix Types](#-part-3-special-matrix-types)
6. [Part 4: Vector Norms](#-part-4-vector-norms)
7. [Hands-On Project: Build Neural Layer from Scratch](#️-hands-on-project-build-neural-layer-from-scratch)
8. [Quick Reference Card](#-quick-reference-card)
9. [Common Mistakes](#️-common-mistakes)
10. [Interview Questions](#-interview-questions)
11. [Key Takeaways](#-key-takeaways)
12. [Next Up](#-next-up)

---

## 🎯 Learning Objectives

By the end of this module, you will:
- [ ] Understand what vectors and matrices are
- [ ] Perform vector operations (addition, dot product)
- [ ] Understand matrix multiplication and why it matters
- [ ] See how neural networks are just matrix operations

---

## 🤔 Why Linear Algebra for AI?

**The shocking truth:** Neural networks are just **matrix multiplication machines**.

```
Input (vector) → [Matrix × ] → [Matrix × ] → Output (vector)
                  Layer 1        Layer 2

That's it. Every "smart" AI model is multiplying matrices.
```

### Real-World Analogy

Think of a spreadsheet:
- **Vector** = one row of data (e.g., `[age, income, credit_score]`)
- **Matrix** = the entire spreadsheet
- **Matrix multiplication** = transforming data through formulas

---

## 📐 Part 1: Scalars, Vectors, and Matrices

### 1.1 Scalars

A **scalar** is just a single number.

```python
# Scalars
age = 25
temperature = 98.6
learning_rate = 0.01
```

**In AI:** Learning rate, batch size, number of epochs are all scalars.

---

### 1.2 Vectors

A **vector** is an ordered list of numbers.

```python
# Vectors - just lists of numbers!
person = [25, 50000, 720]  # [age, income, credit_score]

# In AI contexts:
word_embedding = [0.2, -0.5, 0.8, 0.1, 0.3]  # How "happy" is represented
pixel_row = [255, 128, 0, 64, 255]           # One row of an image
audio_sample = [0.1, 0.3, -0.2, 0.5, -0.1]   # Sound wave amplitude
```

#### Visual Understanding

```
               ┌───┐
Scalar:    5   │   │  (just a number)
               └───┘

           ┌───┐
           │ 1 │
Vector:    │ 2 │     (list of numbers arranged vertically)
           │ 3 │
           │ 4 │
           └───┘
           
           ↑ This is a 4-dimensional vector (4 elements)
```

#### Python with NumPy

```python
import numpy as np

# Creating vectors
v1 = np.array([1, 2, 3, 4])
v2 = np.array([5, 6, 7, 8])

# Vector properties
print(f"Shape: {v1.shape}")      # (4,) - 4 elements
print(f"Length: {len(v1)}")      # 4
print(f"Sum: {v1.sum()}")        # 10
print(f"Mean: {v1.mean()}")      # 2.5
```

---

### 1.3 Vector Operations

#### Addition (Element-wise)

```
a = [1, 2, 3]
b = [4, 5, 6]
─────────────
a + b = [5, 7, 9]   ← Add corresponding elements
```

```python
import numpy as np

a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Addition
c = a + b  # array([5, 7, 9])

# Subtraction
d = b - a  # array([3, 3, 3])
```

#### Scalar Multiplication

Multiply every element by a number:

```
a = [1, 2, 3]
2 × a = [2, 4, 6]
```

```python
a = np.array([1, 2, 3])
scaled = 2 * a  # array([2, 4, 6])
```

**AI Application:** Scaling features to similar ranges.

---

### 1.4 The Dot Product ⭐ (Most Important!)

The **dot product** is the single most important operation in AI.

#### What It Does

Multiply corresponding elements, then sum:

```
a = [1, 2, 3]
b = [4, 5, 6]

a · b = (1×4) + (2×5) + (3×6)
      = 4 + 10 + 18
      = 32
```

#### Code

```python
import numpy as np

a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Three ways to compute dot product
dot1 = np.dot(a, b)        # 32
dot2 = a @ b               # 32 (modern Python syntax)
dot3 = (a * b).sum()       # 32 (manual way)
```

#### Why It Matters SO Much

**Every single neuron computes a dot product!**

```
        ┌──────────────────────────────────────┐
        │           SINGLE NEURON              │
        │                                      │
        │   Inputs:  x = [x₁, x₂, x₃]         │
        │   Weights: w = [w₁, w₂, w₃]         │
        │                                      │
        │   Output = dot(x, w) + bias         │
        │          = x₁w₁ + x₂w₂ + x₃w₃ + b   │
        │                                      │
        │   That's a DOT PRODUCT!             │
        └──────────────────────────────────────┘
```

#### Geometric Meaning: Similarity

Dot product measures how similar two vectors are:

```
Same direction:     [1, 0] · [1, 0] = 1   (maximum)
Opposite direction: [1, 0] · [-1, 0] = -1 (minimum)
Perpendicular:      [1, 0] · [0, 1] = 0   (no similarity)
```

**AI Application:** Attention mechanisms use dot products to measure word similarity!

```python
# Simple similarity example
query = np.array([1, 0, 1])
key1 = np.array([1, 0, 1])    # Same as query
key2 = np.array([0, 1, 0])    # Different from query

similarity1 = np.dot(query, key1)  # 2 (high similarity)
similarity2 = np.dot(query, key2)  # 0 (no similarity)
```

---

### 🧪 Checkpoint 1: Vectors

Try these yourself before looking at answers:

```python
import numpy as np

# Exercise 1: Create a vector and calculate its sum
v = np.array([10, 20, 30, 40])
# What is v.sum()? ____

# Exercise 2: Calculate dot product
a = np.array([2, 3])
b = np.array([4, 5])
# What is np.dot(a, b)? ____

# Exercise 3: Scale a vector
v = np.array([1, 2, 3])
# What is 3 * v? ____
```

<details>
<summary>Click for answers</summary>

```python
# Exercise 1
v.sum()  # 100

# Exercise 2
np.dot(a, b)  # 2*4 + 3*5 = 8 + 15 = 23

# Exercise 3
3 * v  # array([3, 6, 9])
```

</details>

---

## 📊 Part 2: Matrices

### 2.1 What is a Matrix?

A **matrix** is a 2D grid of numbers (rows × columns).

```
     Column 0  Column 1  Column 2
        ↓         ↓         ↓
      ┌───────────────────────┐
Row 0 │    1         2      3 │
Row 1 │    4         5      6 │
      └───────────────────────┘
      
This is a 2×3 matrix (2 rows, 3 columns)
```

```python
import numpy as np

# Creating matrices
M = np.array([[1, 2, 3],
              [4, 5, 6]])

print(f"Shape: {M.shape}")  # (2, 3) = 2 rows, 3 columns
```

### What Matrices Represent in AI

| Context | Rows | Columns |
|---------|------|---------|
| Dataset | Samples | Features |
| Image (grayscale) | Height | Width |
| Word embeddings | Vocabulary size | Embedding dimension |
| Neural network layer | Input size | Output size |

```python
# Dataset: 100 samples, 5 features each
dataset = np.random.randn(100, 5)

# Image: 28x28 pixels
image = np.random.randn(28, 28)

# Word embeddings: 10,000 words, 300 dimensions each
embeddings = np.random.randn(10000, 300)
```

---

### 2.2 Matrix Operations

#### Transpose

Flip rows and columns:

```
Original A (2×3):         Transpose Aᵀ (3×2):
┌─────────────┐           ┌─────────┐
│ 1   2   3   │           │ 1   4   │
│ 4   5   6   │    →      │ 2   5   │
└─────────────┘           │ 3   6   │
                          └─────────┘
```

```python
A = np.array([[1, 2, 3],
              [4, 5, 6]])

A_T = A.T  # Transpose

print(A.shape)    # (2, 3)
print(A_T.shape)  # (3, 2)
```

**Why it matters:** Attention mechanism uses `QKᵀ` (Q times K-transpose).

---

### 2.3 Matrix Multiplication ⭐⭐

This is THE fundamental operation of neural networks.

#### The Rule

```
Matrix A (m×n) × Matrix B (n×p) = Result (m×p)

The INNER dimensions must match!
        ↓         ↓
      (m×n)  ×  (n×p)
        └────┬────┘
           match!

Result has the OUTER dimensions: (m×p)
```

#### Step-by-Step Example

```
A = │1  2│     B = │5  6│
    │3  4│         │7  8│

A is (2×2), B is (2×2) → Result is (2×2)

Result[0,0] = Row 0 of A · Column 0 of B
            = [1, 2] · [5, 7]
            = 1×5 + 2×7 = 5 + 14 = 19

Result[0,1] = Row 0 of A · Column 1 of B
            = [1, 2] · [6, 8]
            = 1×6 + 2×8 = 6 + 16 = 22

Result[1,0] = Row 1 of A · Column 0 of B
            = [3, 4] · [5, 7]
            = 3×5 + 4×7 = 15 + 28 = 43

Result[1,1] = Row 1 of A · Column 1 of B
            = [3, 4] · [6, 8]
            = 3×6 + 4×8 = 18 + 32 = 50

Result = │19  22│
         │43  50│
```

#### Code

```python
import numpy as np

A = np.array([[1, 2],
              [3, 4]])

B = np.array([[5, 6],
              [7, 8]])

# Matrix multiplication
C = np.dot(A, B)  # or A @ B (preferred)

print(C)
# [[19 22]
#  [43 50]]
```

---

### 2.4 Matrix Multiplication in Neural Networks

#### A Single Layer

```
┌──────────────────────────────────────────────────────┐
│               NEURAL NETWORK LAYER                    │
│                                                       │
│  Input:   x  (1 × input_size)                        │
│  Weights: W  (input_size × output_size)              │
│  Bias:    b  (1 × output_size)                       │
│                                                       │
│  Output:  y = x @ W + b                              │
│                                                       │
│  Example:                                            │
│  x = [1, 2]           shape: (1, 2)                  │
│  W = [[0.5, 0.3, 0.1],                               │
│       [0.2, 0.4, 0.6]] shape: (2, 3)                 │
│                                                       │
│  y = x @ W                                           │
│    = [1*0.5+2*0.2, 1*0.3+2*0.4, 1*0.1+2*0.6]        │
│    = [0.9, 1.1, 1.3]   shape: (1, 3)                │
│                                                       │
│  2 inputs → 3 outputs! (transformation)              │
└──────────────────────────────────────────────────────┘
```

```python
import numpy as np

# Input: 1 sample, 2 features
x = np.array([[1, 2]])  # Shape: (1, 2)

# Weights: 2 inputs -> 3 outputs
W = np.array([[0.5, 0.3, 0.1],
              [0.2, 0.4, 0.6]])  # Shape: (2, 3)

# Forward pass
y = x @ W  # Shape: (1, 3)
print(y)   # [[0.9 1.1 1.3]]
```

#### Batch Processing: Many Samples at Once

```python
# Process 32 samples at once!
batch_size = 32
input_size = 100
output_size = 10

X = np.random.randn(batch_size, input_size)   # (32, 100)
W = np.random.randn(input_size, output_size)  # (100, 10)

# Forward pass - ALL 32 samples simultaneously!
Y = X @ W  # (32, 10)

# This is why GPUs are fast - they're designed for matrix operations!
```

---

### 🧪 Checkpoint 2: Matrices

```python
import numpy as np

# Exercise 1: What's the shape of A @ B?
A = np.random.randn(3, 4)  # Shape: (3, 4)
B = np.random.randn(4, 2)  # Shape: (4, 2)
# What is (A @ B).shape? ____

# Exercise 2: Will this work?
C = np.random.randn(3, 5)  # Shape: (3, 5)
D = np.random.randn(4, 6)  # Shape: (4, 6)
# Can we compute C @ D? ____

# Exercise 3: Manual matrix multiply
E = np.array([[1, 2],
              [3, 4]])
F = np.array([[1, 0],
              [0, 1]])  # Identity matrix
# What is E @ F? ____
```

<details>
<summary>Click for answers</summary>

```python
# Exercise 1
(A @ B).shape  # (3, 2) - outer dimensions

# Exercise 2
# NO! Inner dimensions don't match (5 ≠ 4)

# Exercise 3
E @ F  # [[1, 2], [3, 4]] - identity matrix doesn't change anything!
```

</details>

---

## 🔍 Part 3: Special Matrix Types

### 3.1 Identity Matrix

The "1" of matrices - multiplying by it changes nothing:

```
I = │1  0  0│
    │0  1  0│
    │0  0  1│

A @ I = A  (always)
```

```python
I = np.eye(3)  # 3x3 identity matrix
```

### 3.2 Zero Matrix

All zeros - like multiplying by 0:

```python
Z = np.zeros((3, 3))
```

### 3.3 Random Initialization

Neural network weights start random:

```python
# Xavier/Glorot initialization (common)
W = np.random.randn(input_size, output_size) * np.sqrt(2.0 / input_size)

# Simple random
W = np.random.randn(100, 50) * 0.01  # Small random values
```

---

## 📊 Part 4: Vector Norms

### What's a Norm?

A norm measures the "size" or "length" of a vector.

### L2 Norm (Euclidean Distance)

```
‖v‖₂ = √(v₁² + v₂² + ... + vₙ²)

Example:
v = [3, 4]
‖v‖₂ = √(3² + 4²) = √(9 + 16) = √25 = 5
```

```python
v = np.array([3, 4])
norm = np.linalg.norm(v)  # 5.0
```

### L1 Norm (Manhattan Distance)

```
‖v‖₁ = |v₁| + |v₂| + ... + |vₙ|

Example:
v = [3, -4]
‖v‖₁ = |3| + |-4| = 3 + 4 = 7
```

```python
v = np.array([3, -4])
l1_norm = np.abs(v).sum()  # 7
```

**Why norms matter:**
- Normalization (make vectors unit length)
- Regularization in training (L1, L2 regularization)
- Measuring distance between vectors

---

## 🛠️ Hands-On Project: Build Neural Layer from Scratch

```python
import numpy as np

class LinearLayer:
    """A single neural network layer using just matrix operations."""
    
    def __init__(self, input_size, output_size):
        # Random weight initialization
        self.W = np.random.randn(input_size, output_size) * 0.01
        self.b = np.zeros((1, output_size))
    
    def forward(self, X):
        """
        Forward pass: Y = X @ W + b
        
        X shape: (batch_size, input_size)
        W shape: (input_size, output_size)
        b shape: (1, output_size)
        Y shape: (batch_size, output_size)
        """
        self.X = X  # Save for backprop
        return X @ self.W + self.b
    
    def backward(self, dY, learning_rate=0.01):
        """
        Backward pass: compute gradients and update weights.
        
        dY: gradient of loss w.r.t. output
        """
        # Gradients
        dW = self.X.T @ dY
        db = dY.sum(axis=0, keepdims=True)
        dX = dY @ self.W.T
        
        # Update weights
        self.W -= learning_rate * dW
        self.b -= learning_rate * db
        
        return dX

# Test it
layer = LinearLayer(4, 3)  # 4 inputs -> 3 outputs

X = np.array([[1, 2, 3, 4],
              [5, 6, 7, 8]])  # 2 samples, 4 features each

Y = layer.forward(X)
print(f"Input shape: {X.shape}")   # (2, 4)
print(f"Output shape: {Y.shape}")  # (2, 3)
print(f"Output:\n{Y}")
```

---

## 📋 Quick Reference Card

| Operation | Formula | NumPy | Use Case |
|-----------|---------|-------|----------|
| Dot Product | a·b = Σaᵢbᵢ | `np.dot(a, b)` or `a @ b` | Neurons, similarity |
| Matrix Multiply | C = AB | `A @ B` | Neural network layers |
| Transpose | Aᵀ | `A.T` | Attention, gradients |
| Element-wise | C = A ⊙ B | `A * B` | Activations, masks |
| L2 Norm | ‖x‖₂ = √Σxᵢ² | `np.linalg.norm(x)` | Normalization |
| Shape | (rows, cols) | `A.shape` | Debugging |
| Identity | I | `np.eye(n)` | Testing |

---

## ⚠️ Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| `A * B` instead of `A @ B` | Element-wise ≠ matrix multiply | Use `@` for matrix multiply |
| Shape mismatch `(3,4) @ (5,2)` | Inner dimensions don't match | Check shapes: need `(3,4) @ (4,?)` |
| Forgetting batch dimension | Code breaks on batches | Always design for `(batch, features)` |
| Wrong transpose | Dimensions don't match | Draw out shapes on paper |

---

## 🎤 Interview Questions

### Beginner

**Q1: What is a dot product and why is it important for AI?**
> Multiply corresponding elements and sum. It's important because every neuron computes a dot product of inputs and weights. It also measures similarity between vectors, which is used in attention mechanisms.

**Q2: What's the difference between `A * B` and `A @ B` in NumPy?**
> `A * B` is element-wise multiplication (same shapes required). `A @ B` is matrix multiplication (inner dimensions must match). Neural networks use matrix multiplication (`@`).

### Intermediate

**Q3: Given matrices A (3×4) and B (4×5), what's the shape of A @ B? Why?**
> Shape is (3×5). Inner dimensions (4) must match and get "consumed". Outer dimensions (3 and 5) become the result shape.

**Q4: How are matrix operations used in a neural network layer?**
> Forward pass: `output = input @ weights + bias`. This transforms inputs through learned weights. For a batch of N samples: (N × input_size) @ (input_size × output_size) = (N × output_size).

---

## ✅ Key Takeaways

1. **Vectors** = lists of numbers (features, embeddings)
2. **Matrices** = 2D grids (datasets, weight matrices)
3. **Dot product** = similarity measure, every neuron uses it
4. **Matrix multiply** = the core operation of neural networks
5. **Shape rules:** (m×n) @ (n×p) = (m×p)

---

## 🔜 Next Up

Continue to → [02b-Calculus-for-ML.md](./02b-Calculus-for-ML.md)

Now that you understand how neural networks compute forward passes, you'll learn how they LEARN - using calculus to update weights!

*Vectors ✓ → Matrices ✓ → Next: Derivatives & Gradients!* 📈
