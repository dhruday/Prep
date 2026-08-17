# 02 - Mathematical Foundations for AI/ML

---

## 📌 Table of Contents

1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
   - [Linear Algebra](#part-1-linear-algebra)
   - [Calculus](#part-2-calculus)
   - [Probability & Statistics](#part-3-probability--statistics)
3. [Key Formulas](#-key-formulas-summary)
4. [Visual Mental Models](#-visual-mental-models)
5. [Real World Use Cases](#-real-world-use-cases)
6. [Mini Project](#-mini-project)
7. [Homework](#-homework)
8. [Common Mistakes](#-common-mistakes)
9. [Interview Questions & Answers](#-interview-questions--answers)

---

## 🌱 Beginner Friendly Explanation

### Why Math for AI?

**Don't panic!** You don't need a PhD in mathematics. You need to understand:
- **What** the math does (intuition)
- **Why** it's used (purpose)
- **When** to apply it (context)

The actual calculations? Computers do that. Your job is to understand the concepts.

### The Three Pillars of ML Math

```
┌─────────────────────────────────────────────────────────────┐
│                    ML MATHEMATICS                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│  LINEAR ALGEBRA │    CALCULUS     │  PROBABILITY/STATISTICS │
├─────────────────┼─────────────────┼─────────────────────────┤
│  • Data storage │  • Optimization │  • Uncertainty          │
│  • Transforming │  • Learning     │  • Predictions          │
│  • Computations │  • Gradients    │  • Distributions        │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Simple Analogies

**Linear Algebra = The Language of Data**
```
Think of it like Excel on steroids:
- A single cell = Scalar (one number)
- A row/column = Vector (list of numbers)
- A spreadsheet = Matrix (table of numbers)
- Multiple spreadsheets = Tensor (multi-dimensional)
```

**Calculus = The Art of Small Changes**
```
Think of it like a fitness tracker:
- You want to lose weight (minimize loss)
- You track small daily changes
- You adjust your diet based on changes
- Calculus helps find: "Which direction should I change to improve fastest?"
```

**Probability = The Science of Uncertainty**
```
Think of it like weather forecasting:
- "70% chance of rain tomorrow"
- We can't be 100% sure, but we can quantify confidence
- ML models give predictions WITH confidence levels
```

---

## 🔬 Deep Technical Breakdown

---

# PART 1: LINEAR ALGEBRA

## 1.1 Scalars, Vectors, Matrices, and Tensors

### Scalar
A single number.

```python
# Scalar
x = 5
temperature = 72.5
learning_rate = 0.001
```

### Vector
An ordered list of numbers (1D array).

```python
import numpy as np

# Vector - represents a point or direction in space
v = np.array([1, 2, 3])

# Real-world examples:
rgb_color = np.array([255, 128, 0])        # Orange color
house_features = np.array([1500, 3, 2])    # sqft, bedrooms, bathrooms
word_embedding = np.array([0.2, -0.5, 0.8, 0.1])  # Word as numbers
```

**Visual representation:**
```
Vector v = [1, 2, 3]

    3 │        • (1,2,3)
      │       /
    2 │      /
      │     /
    1 │    /
      │   /
    0 └──────────
      0  1  2  3
```

### Matrix
A 2D array of numbers (rows × columns).

```python
# Matrix - 2D array
M = np.array([
    [1, 2, 3],
    [4, 5, 6]
])
# Shape: 2 rows × 3 columns = (2, 3)

# Real-world examples:
# Grayscale image (height × width)
image = np.array([
    [0, 50, 100],
    [150, 200, 250],
    [75, 125, 175]
])

# Dataset (samples × features)
dataset = np.array([
    [1500, 3, 2, 300000],  # House 1: sqft, beds, baths, price
    [2000, 4, 3, 450000],  # House 2
    [1200, 2, 1, 200000],  # House 3
])
```

**Visual representation:**
```
Matrix M (2×3):

        Col 0  Col 1  Col 2
       ┌─────┬─────┬─────┐
Row 0  │  1  │  2  │  3  │
       ├─────┼─────┼─────┤
Row 1  │  4  │  5  │  6  │
       └─────┴─────┴─────┘
```

### Tensor
A multi-dimensional array (generalization of matrices).

```python
# Tensor - n-dimensional array
# 3D Tensor: Color image (height × width × channels)
color_image = np.zeros((224, 224, 3))  # RGB image

# 4D Tensor: Batch of images (batch × height × width × channels)
batch_of_images = np.zeros((32, 224, 224, 3))  # 32 images

# In Deep Learning:
# - Input data is usually a tensor
# - Weights are tensors
# - Outputs are tensors
```

**Visual representation:**
```
Scalar:     5                    (0D - just a point)
Vector:     [1, 2, 3]            (1D - a line)
Matrix:     [[1,2], [3,4]]       (2D - a plane)
3D Tensor:  [[[1,2], [3,4]],     (3D - a cube)
             [[5,6], [7,8]]]
```

---

## 1.2 Vector Operations

### Vector Addition
```python
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

c = a + b  # [5, 7, 9]
```

**Visual:**
```
    a = [1, 2]      b = [4, 5]      a + b = [5, 7]
    
         ↗              ↗                  ↗
        /              /                  /
       /              /                  / (longer arrow)
      •              •                  •
```

### Scalar Multiplication
```python
v = np.array([1, 2, 3])
scaled = 2 * v  # [2, 4, 6]
```

### Dot Product (Inner Product)
**The most important operation in ML!**

```python
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Dot product
dot = np.dot(a, b)  # 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32

# Alternative notation
dot = a @ b  # Same result: 32
```

**Formula:**
```
a · b = Σ(aᵢ × bᵢ) = a₁b₁ + a₂b₂ + ... + aₙbₙ
```

**Why is dot product important?**
```
Neural Network Prediction:
    
    inputs = [x₁, x₂, x₃]
    weights = [w₁, w₂, w₃]
    
    output = x₁w₁ + x₂w₂ + x₃w₃ = inputs · weights
    
This IS a dot product!
```

### Vector Norm (Length/Magnitude)
```python
v = np.array([3, 4])

# L2 Norm (Euclidean distance)
norm = np.linalg.norm(v)  # √(3² + 4²) = √25 = 5

# Manual calculation
norm_manual = np.sqrt(np.sum(v ** 2))  # 5.0
```

**Formula:**
```
||v||₂ = √(v₁² + v₂² + ... + vₙ²)
```

---

## 1.3 Matrix Operations

### Matrix Addition
```python
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

C = A + B  # [[6, 8], [10, 12]]
```

### Matrix Multiplication
**Critical for neural networks!**

```python
A = np.array([[1, 2],      # Shape: (2, 3)
              [3, 4],
              [5, 6]])

B = np.array([[7, 8, 9],   # Shape: (3, 2)
              [10, 11, 12]])

# Matrix multiplication: (2,3) × (3,2) = (2,2)
# Inner dimensions must match!

C = A @ B  # or np.matmul(A, B)
```

**How it works:**
```
A (2×3)          B (3×2)           C (2×2)
┌─────────┐     ┌───────┐        ┌─────────┐
│ 1  2  3 │  ×  │ 7   8 │   =    │ 58   64 │
│ 4  5  6 │     │ 9  10 │        │139  154 │
└─────────┘     │11  12 │        └─────────┘
                └───────┘

C[0,0] = 1×7 + 2×9 + 3×11 = 7 + 18 + 33 = 58
C[0,1] = 1×8 + 2×10 + 3×12 = 8 + 20 + 36 = 64
...
```

**Rule:** To multiply A(m×n) × B(n×p), inner dimensions must match → Result is (m×p)

### Transpose
Swap rows and columns.

```python
A = np.array([[1, 2, 3],
              [4, 5, 6]])  # Shape: (2, 3)

A_T = A.T  # Shape: (3, 2)
# [[1, 4],
#  [2, 5],
#  [3, 6]]
```

### Identity Matrix
A square matrix with 1s on diagonal, 0s elsewhere.

```python
I = np.eye(3)
# [[1, 0, 0],
#  [0, 1, 0],
#  [0, 0, 1]]

# Property: A × I = A (like multiplying by 1)
```

### Inverse Matrix
```python
A = np.array([[1, 2],
              [3, 4]])

A_inv = np.linalg.inv(A)

# Property: A × A⁻¹ = I (Identity)
result = A @ A_inv  # ≈ [[1, 0], [0, 1]]
```

---

## 1.4 Eigenvalues and Eigenvectors

**Intuition:** When you multiply a matrix by a vector, the vector usually changes direction. But some special vectors only get stretched (not rotated). These are eigenvectors.

```
A × v = λ × v

Where:
  A = Matrix
  v = Eigenvector (direction doesn't change)
  λ = Eigenvalue (how much it stretches)
```

```python
A = np.array([[4, 2],
              [1, 3]])

eigenvalues, eigenvectors = np.linalg.eig(A)
# eigenvalues: [5, 2]
# eigenvectors: columns are the vectors
```

**Use in ML:**
- **PCA (Dimensionality Reduction)**: Find principal components
- **PageRank**: Google's algorithm uses eigenvectors
- **Covariance analysis**: Understanding data spread

---

# PART 2: CALCULUS

## 2.1 Derivatives - The Rate of Change

### Intuition
A derivative tells you: **How fast is something changing?**

```
Speed = Change in Distance / Change in Time

If you drove 60 miles in 1 hour:
    Speed = 60 miles / 1 hour = 60 mph
    
This IS a derivative! (rate of change of position)
```

### Mathematical Definition
```
f'(x) = lim(h→0) [f(x+h) - f(x)] / h

Read as: "How does f change as x changes by a tiny amount?"
```

### Basic Derivative Rules

```
Function f(x)     │  Derivative f'(x)
─────────────────┼──────────────────
c (constant)     │  0
x                │  1
x²               │  2x
x³               │  3x²
xⁿ               │  n × xⁿ⁻¹
eˣ               │  eˣ
ln(x)            │  1/x
sin(x)           │  cos(x)
cos(x)           │  -sin(x)
```

### Examples

```python
# f(x) = x²
# f'(x) = 2x

# At x = 3:
# f(3) = 9
# f'(3) = 6  (slope at x=3)

# This means: At x=3, for every 1 unit increase in x,
#             f(x) increases by approximately 6 units
```

**Visual:**
```
f(x) = x²

    │     •
    │    /│
    │   / │ slope = 6 at x=3
    │  •  │
    │ /   │
    │•    │
    └─────┴───────
         3
```

### Chain Rule (Most Important for Neural Networks!)

When functions are nested: f(g(x))

```
d/dx [f(g(x))] = f'(g(x)) × g'(x)

"Derivative of outer × Derivative of inner"
```

**Example:**
```
h(x) = (3x + 2)²

Let g(x) = 3x + 2, so h(x) = g(x)²

h'(x) = 2×g(x) × g'(x)
      = 2×(3x + 2) × 3
      = 6(3x + 2)
      = 18x + 12
```

**Why Chain Rule matters in ML:**
```
Neural Network:
    output = activation(weights × input + bias)
    
To update weights, we need:
    d(loss)/d(weights) = d(loss)/d(output) × d(output)/d(weights)
    
This IS the chain rule! (Backpropagation)
```

---

## 2.2 Partial Derivatives

When a function has multiple variables, we take the derivative with respect to ONE variable, treating others as constants.

```
f(x, y) = x² + 3xy + y²

∂f/∂x = 2x + 3y    (treating y as constant)
∂f/∂y = 3x + 2y    (treating x as constant)
```

**In ML context:**
```
Loss = f(w₁, w₂, w₃, ...)  (function of all weights)

To update w₁, we need: ∂Loss/∂w₁
To update w₂, we need: ∂Loss/∂w₂
...
```

---

## 2.3 Gradients

The gradient is a **vector of all partial derivatives**.

```
∇f = [∂f/∂x₁, ∂f/∂x₂, ..., ∂f/∂xₙ]
```

**Key Property:** The gradient points in the direction of steepest INCREASE.

```python
# Example
def f(x, y):
    return x**2 + y**2

# Gradient: ∇f = [2x, 2y]
# At point (3, 4): ∇f = [6, 8]

# This means:
# - To INCREASE f fastest: move in direction [6, 8]
# - To DECREASE f fastest: move in direction [-6, -8]
```

**Visual:**
```
        Contour plot of f(x,y) = x² + y²
        
              Gradient points UPHILL
                    ↑
           ╭───────────────╮
          ╱                 ╲
         │    ∇f = [6,8]     │
         │        ↗          │
         │       •(3,4)      │
          ╲                 ╱
           ╰───────────────╯
           
    To minimize: Go OPPOSITE to gradient!
```

---

## 2.4 Gradient Descent (The Core of ML Training)

**Goal:** Find the values that MINIMIZE a function (loss).

**Algorithm:**
```
1. Start with random values
2. Calculate gradient (direction of steepest increase)
3. Move in OPPOSITE direction (to decrease)
4. Repeat until you reach minimum

Formula:
    θ_new = θ_old - α × ∇f(θ)
    
Where:
    θ = parameters (weights)
    α = learning rate (step size)
    ∇f(θ) = gradient
```

```python
# Gradient Descent Example
def gradient_descent(f, df, x_start, learning_rate=0.1, iterations=100):
    x = x_start
    history = [x]
    
    for _ in range(iterations):
        gradient = df(x)
        x = x - learning_rate * gradient  # Move opposite to gradient
        history.append(x)
    
    return x, history

# Minimize f(x) = x²
f = lambda x: x**2
df = lambda x: 2*x  # derivative

minimum, history = gradient_descent(f, df, x_start=10)
print(f"Minimum found at x = {minimum}")  # Close to 0
```

**Visual Journey:**
```
Loss
  │
  │\                                   
  │ \                                  
  │  \     Start here (x=10)          
  │   \        ↓                      
  │    \      •                       
  │     \    ↙                        
  │      \  •   Step 1               
  │       \↙                          
  │        •  Step 2                  
  │         ↘                         
  │          •→• Minimum! (x≈0)      
  └────────────────────────────── x
```

---

# PART 3: PROBABILITY & STATISTICS

## 3.1 Basic Probability

### Probability Fundamentals

```
P(event) = Number of favorable outcomes / Total outcomes

Example: Rolling a die
P(getting 6) = 1/6 ≈ 0.167 (16.7%)
```

### Rules

```
# Addition Rule (OR)
P(A or B) = P(A) + P(B) - P(A and B)

# For mutually exclusive events:
P(A or B) = P(A) + P(B)

# Multiplication Rule (AND)
P(A and B) = P(A) × P(B|A)

# For independent events:
P(A and B) = P(A) × P(B)
```

### Conditional Probability

```
P(A|B) = "Probability of A given B has occurred"
       = P(A and B) / P(B)

Example:
    Given a patient has a cough (B),
    What's the probability they have COVID (A)?
    
    P(COVID | Cough) = P(COVID and Cough) / P(Cough)
```

---

## 3.2 Bayes' Theorem

**The foundation of many ML algorithms!**

```
P(A|B) = P(B|A) × P(A) / P(B)

In ML terms:
P(hypothesis | data) = P(data | hypothesis) × P(hypothesis) / P(data)

Or:
Posterior = (Likelihood × Prior) / Evidence
```

**Example: Medical Test**
```
- Disease affects 1% of population: P(Disease) = 0.01
- Test is 90% accurate for sick people: P(Positive | Disease) = 0.90
- Test is 95% accurate for healthy: P(Negative | Healthy) = 0.95

If you test positive, what's P(Disease | Positive)?

Using Bayes:
P(Disease | Positive) = P(Positive | Disease) × P(Disease) / P(Positive)

P(Positive) = P(Pos|Disease)×P(Disease) + P(Pos|Healthy)×P(Healthy)
            = 0.90 × 0.01 + 0.05 × 0.99
            = 0.009 + 0.0495 = 0.0585

P(Disease | Positive) = (0.90 × 0.01) / 0.0585 ≈ 0.154 (15.4%)

Surprising! Even with a positive test, only 15.4% chance of disease!
(Because the disease is rare - base rate matters)
```

---

## 3.3 Probability Distributions

### Discrete Distributions

**Bernoulli Distribution** (Single binary outcome)
```
P(X=1) = p       (success)
P(X=0) = 1-p     (failure)

Example: Coin flip (p=0.5)
```

**Binomial Distribution** (Multiple binary trials)
```
P(X=k) = C(n,k) × p^k × (1-p)^(n-k)

Example: Flip coin 10 times, probability of exactly 6 heads?
```

```python
from scipy import stats

# Binomial: 10 flips, p=0.5, probability of 6 heads
prob = stats.binom.pmf(k=6, n=10, p=0.5)
print(f"P(6 heads in 10 flips) = {prob:.4f}")  # ≈ 0.2051
```

### Continuous Distributions

**Normal (Gaussian) Distribution** - The most important!

```
           1              (x-μ)²
f(x) = ─────────── × exp(- ────── )
       σ√(2π)              2σ²

Where:
  μ = mean (center)
  σ = standard deviation (spread)
```

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

# Normal distribution
mu = 0      # mean
sigma = 1   # standard deviation

x = np.linspace(-4, 4, 100)
y = stats.norm.pdf(x, mu, sigma)

plt.plot(x, y)
plt.title('Normal Distribution (μ=0, σ=1)')
plt.xlabel('x')
plt.ylabel('Probability Density')
```

**Visual:**
```
                    Normal Distribution
                         
                          │
                         ╱│╲
                        ╱ │ ╲      68% within 1σ
                       ╱  │  ╲     95% within 2σ
                      ╱   │   ╲    99.7% within 3σ
                     ╱    │    ╲
              ──────╱─────┼─────╲──────
                   -2σ   -σ  μ  σ   2σ
```

**Why Normal Distribution matters in ML:**
- Weight initialization (random normal)
- Noise in data often follows normal
- Central Limit Theorem: averages tend to be normal
- Many loss functions assume normal errors

---

## 3.4 Expected Value and Variance

### Expected Value (Mean)
```
E[X] = Σ xᵢ × P(xᵢ)      (discrete)
E[X] = ∫ x × f(x) dx     (continuous)

"Average outcome if you repeated the experiment many times"
```

```python
# Expected value of a fair die roll
outcomes = [1, 2, 3, 4, 5, 6]
probabilities = [1/6] * 6

expected = sum(x * p for x, p in zip(outcomes, probabilities))
print(f"E[die roll] = {expected}")  # 3.5
```

### Variance (Spread)
```
Var(X) = E[(X - μ)²] = E[X²] - (E[X])²

"How spread out are the values from the mean?"
```

### Standard Deviation
```
σ = √Var(X)

Same units as the original data (variance is squared units)
```

```python
import numpy as np

data = [2, 4, 4, 4, 5, 5, 7, 9]

mean = np.mean(data)           # 5.0
variance = np.var(data)        # 4.0
std_dev = np.std(data)         # 2.0
```

---

## 3.5 Maximum Likelihood Estimation (MLE)

**The foundation of training ML models!**

**Idea:** Find parameters that make the observed data most likely.

```
Given data D and model with parameters θ:

Likelihood: L(θ) = P(D | θ)

MLE: Find θ that maximizes L(θ)

In practice, we maximize log-likelihood:
    log L(θ) = log P(D | θ)
    
(Easier to work with sums than products)
```

**Example: Estimating coin bias**
```python
# Flipped coin 100 times: 60 heads, 40 tails
# What's the most likely bias (p)?

# Likelihood: L(p) = p^60 × (1-p)^40
# Log-likelihood: log L(p) = 60×log(p) + 40×log(1-p)

# Take derivative, set to 0:
# d/dp [60×log(p) + 40×log(1-p)] = 60/p - 40/(1-p) = 0
# Solving: p = 60/100 = 0.6

# MLE estimate: p = 0.6 (which makes sense!)
```

**Connection to ML:**
```
Training a model = Finding parameters that maximize likelihood
                 = Finding parameters that minimize negative log-likelihood
                 = Finding parameters that minimize LOSS

Cross-entropy loss IS negative log-likelihood!
```

---

## 📐 Key Formulas Summary

### Linear Algebra

| Operation | Formula | Python |
|-----------|---------|--------|
| Dot Product | a·b = Σaᵢbᵢ | `np.dot(a, b)` or `a @ b` |
| L2 Norm | \|\|v\|\| = √(Σvᵢ²) | `np.linalg.norm(v)` |
| Matrix Multiply | (m×n)×(n×p) = (m×p) | `A @ B` |
| Transpose | Aᵀ[i,j] = A[j,i] | `A.T` |
| Inverse | A × A⁻¹ = I | `np.linalg.inv(A)` |

### Calculus

| Concept | Formula |
|---------|---------|
| Derivative | f'(x) = lim[f(x+h)-f(x)]/h |
| Power Rule | d/dx[xⁿ] = n×xⁿ⁻¹ |
| Chain Rule | d/dx[f(g(x))] = f'(g(x))×g'(x) |
| Gradient | ∇f = [∂f/∂x₁, ∂f/∂x₂, ...] |
| Gradient Descent | θ = θ - α×∇f(θ) |

### Probability & Statistics

| Concept | Formula |
|---------|---------|
| Conditional Probability | P(A\|B) = P(A∩B)/P(B) |
| Bayes' Theorem | P(A\|B) = P(B\|A)×P(A)/P(B) |
| Expected Value | E[X] = Σxᵢ×P(xᵢ) |
| Variance | Var(X) = E[(X-μ)²] |
| Normal PDF | f(x) = (1/σ√2π)×exp(-(x-μ)²/2σ²) |

---

## 🎨 Visual Mental Models

### Model 1: Vectors as Arrows

```
Feature Space for Houses:

    Price ($)
        │
   500k │              • Mansion
        │
   300k │      • Nice house
        │
   100k │  • Small house
        │
        └─────────────────────── Size (sqft)
             1000   2000   3000

Each house is a POINT (vector) in this space!
ML learns BOUNDARIES between categories.
```

### Model 2: Gradient Descent as a Ball Rolling

```
Loss Landscape (imagine a 3D bowl):

        ╭─────────────────────╮
       ╱                       ╲
      ╱    Ball starts here     ╲
     │           ●               │
     │            ╲              │
     │             ╲             │
     │              ╲            │
      ╲              ●          ╱
       ╲         Minimum!      ╱
        ╰─────────────────────╯

The ball naturally rolls to the lowest point.
Gradient descent does the same mathematically!
```

### Model 3: Probability as Area

```
Normal Distribution:

    │        ╱╲
    │       ╱  ╲
    │      ╱    ╲
    │     ╱██████╲    ← Shaded area = P(a < X < b)
    │    ╱████████╲
    │   ╱██████████╲
    └───────────────────
           a    b

Total area under curve = 1 (100% probability)
```

---

## 🌍 Real World Use Cases

### Linear Algebra in Action

| Application | How Linear Algebra is Used |
|-------------|---------------------------|
| **Image Processing** | Images are matrices; filters are matrix operations |
| **Recommendations** | User-item interactions as matrices; matrix factorization |
| **NLP/Transformers** | Word embeddings, attention matrices |
| **Computer Graphics** | 3D transformations use matrix multiplication |
| **Google PageRank** | Eigenvectors of link matrix |

### Calculus in Action

| Application | How Calculus is Used |
|-------------|---------------------|
| **Neural Network Training** | Backpropagation uses chain rule |
| **Optimization** | Finding minimum loss via gradient descent |
| **Physics Simulations** | Rates of change, motion equations |
| **Economics** | Marginal cost/revenue analysis |

### Probability in Action

| Application | How Probability is Used |
|-------------|------------------------|
| **Spam Filters** | Naive Bayes classifier |
| **Medical Diagnosis** | Bayesian inference |
| **A/B Testing** | Statistical significance |
| **Language Models** | Predicting next word probability |
| **Reinforcement Learning** | Expected rewards |

---

## 🛠 Mini Project: Linear Regression from Scratch

**Objective:** Implement linear regression using gradient descent, applying all three math pillars.

```python
import numpy as np
import matplotlib.pyplot as plt

# ============================================
# LINEAR REGRESSION FROM SCRATCH
# ============================================

# 1. Generate synthetic data
np.random.seed(42)
X = 2 * np.random.rand(100, 1)  # 100 samples, 1 feature
y = 4 + 3 * X + np.random.randn(100, 1)  # y = 4 + 3x + noise

# True relationship: y = 4 + 3x

# 2. Initialize parameters
w = np.random.randn(1, 1)  # weight
b = np.zeros((1, 1))       # bias
learning_rate = 0.1
iterations = 1000

# 3. Gradient Descent
m = len(X)  # number of samples
losses = []

for i in range(iterations):
    # Forward pass (Linear Algebra: matrix multiplication)
    y_pred = X @ w + b  # predictions
    
    # Calculate loss (Statistics: mean squared error)
    loss = np.mean((y_pred - y) ** 2)
    losses.append(loss)
    
    # Calculate gradients (Calculus: partial derivatives)
    # Loss = (1/m) * Σ(y_pred - y)²
    # ∂Loss/∂w = (2/m) * Σ(y_pred - y) * x
    # ∂Loss/∂b = (2/m) * Σ(y_pred - y)
    
    dw = (2/m) * X.T @ (y_pred - y)
    db = (2/m) * np.sum(y_pred - y)
    
    # Update parameters (Gradient Descent)
    w = w - learning_rate * dw
    b = b - learning_rate * db
    
    if i % 100 == 0:
        print(f"Iteration {i}: Loss = {loss:.4f}, w = {w[0,0]:.4f}, b = {b[0,0]:.4f}")

print(f"\nFinal: w = {w[0,0]:.4f} (true: 3), b = {b[0,0]:.4f} (true: 4)")

# 4. Visualize results
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Plot 1: Data and fitted line
axes[0].scatter(X, y, alpha=0.5, label='Data')
axes[0].plot(X, X @ w + b, 'r-', linewidth=2, label=f'Fitted: y = {w[0,0]:.2f}x + {b[0,0]:.2f}')
axes[0].set_xlabel('X')
axes[0].set_ylabel('y')
axes[0].set_title('Linear Regression')
axes[0].legend()

# Plot 2: Loss over iterations
axes[1].plot(losses)
axes[1].set_xlabel('Iteration')
axes[1].set_ylabel('Loss (MSE)')
axes[1].set_title('Training Loss Over Time')

plt.tight_layout()
plt.show()
```

**Expected Output:**
```
Iteration 0: Loss = 18.2341, w = 0.1234, b = 0.0000
Iteration 100: Loss = 1.0521, w = 2.8765, b = 3.9123
Iteration 200: Loss = 0.9876, w = 2.9654, b = 4.0234
...
Final: w = 2.9876 (true: 3), b = 4.0123 (true: 4)
```

**What You Learned:**
- **Linear Algebra**: Matrix multiplication for predictions
- **Calculus**: Computing gradients, gradient descent
- **Statistics**: MSE loss function, handling noisy data

---

## 📝 Homework

### Level 1: Easy

1. **Vector Operations**
   ```
   Given a = [1, 2, 3] and b = [4, 5, 6]
   Calculate:
   a) a + b
   b) 2 * a
   c) a · b (dot product)
   d) ||a|| (norm)
   ```

2. **Derivatives**
   ```
   Find the derivatives:
   a) f(x) = 3x² + 2x - 5
   b) f(x) = (2x + 1)³
   c) f(x) = e^(2x)
   ```

3. **Probability**
   ```
   A bag has 5 red and 3 blue balls.
   a) P(red)?
   b) P(red then blue) without replacement?
   ```

### Level 2: Medium

4. **Matrix Operations**
   ```
   A = [[1, 2], [3, 4]]
   B = [[5, 6], [7, 8]]
   
   Calculate:
   a) A + B
   b) A × B
   c) A^T (transpose)
   d) det(A) (determinant)
   ```

5. **Gradient Calculation**
   ```
   f(x, y) = x² + 2xy + y³
   
   Calculate:
   a) ∂f/∂x
   b) ∂f/∂y
   c) ∇f at point (1, 2)
   ```

6. **Bayes' Theorem**
   ```
   Email spam filter:
   - 30% of emails are spam
   - P("free" | spam) = 0.8
   - P("free" | not spam) = 0.1
   
   An email contains "free". What's P(spam | "free")?
   ```

### Level 3: Advanced

7. **Implement Matrix Multiplication from Scratch**
   ```python
   def matrix_multiply(A, B):
       # Your code here
       pass
   
   # Test with:
   A = [[1, 2], [3, 4]]
   B = [[5, 6], [7, 8]]
   ```

8. **Implement Gradient Descent for Quadratic Function**
   ```python
   # Minimize f(x, y) = x² + y² + xy
   # Start at (10, 10)
   # Find minimum using gradient descent
   ```

### Level 4: Expert (FAANG Prep)

9. **Prove that for MSE loss, the gradient is:**
   ```
   ∂L/∂w = (2/m) × Xᵀ(Xw - y)
   ```

10. **Implement Softmax from scratch and prove its gradient:**
    ```python
    def softmax(x):
        # Your code
        pass
    
    def softmax_gradient(x):
        # Your code
        pass
    ```

---

## ⚠️ Common Mistakes

### Mistake 1: Confusing Dot Product with Element-wise Multiplication
```python
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Dot product (scalar result)
dot = a @ b  # 1*4 + 2*5 + 3*6 = 32

# Element-wise (vector result)
elem = a * b  # [4, 10, 18]

# These are DIFFERENT!
```

### Mistake 2: Matrix Dimension Mismatch
```python
A = np.array([[1, 2, 3]])      # Shape: (1, 3)
B = np.array([[4, 5, 6]])      # Shape: (1, 3)

# This will ERROR:
# A @ B  ← (1,3) × (1,3) - inner dimensions don't match!

# Fix: Transpose B
A @ B.T  # (1,3) × (3,1) = (1,1) ✓
```

### Mistake 3: Forgetting Learning Rate Importance
```
Learning rate too HIGH:
    - Overshoots minimum
    - May diverge (loss goes to infinity)

Learning rate too LOW:
    - Takes forever to converge
    - May get stuck in local minima

Start with 0.01 or 0.001, then tune.
```

### Mistake 4: Ignoring Numerical Stability
```python
# BAD: Can cause overflow
def softmax_bad(x):
    return np.exp(x) / np.sum(np.exp(x))

# GOOD: Numerically stable
def softmax_good(x):
    x_shifted = x - np.max(x)  # Shift for stability
    return np.exp(x_shifted) / np.sum(np.exp(x_shifted))
```

### Mistake 5: Confusing Covariance and Correlation
```
Covariance: How two variables change together (has units)
    Cov(X,Y) = E[(X-μx)(Y-μy)]

Correlation: Normalized covariance (unitless, -1 to 1)
    Corr(X,Y) = Cov(X,Y) / (σx × σy)

Correlation is easier to interpret!
```

---

## 🎤 Interview Questions & Answers

### Beginner Level

**Q1: What is a dot product and why is it important in ML?**

**A**: A dot product is the sum of element-wise multiplications of two vectors:
```
a·b = a₁b₁ + a₂b₂ + ... + aₙbₙ
```

It's crucial in ML because:
1. **Neural network forward pass**: output = weights · inputs
2. **Similarity measure**: cosine similarity uses dot product
3. **Attention mechanism**: query · key in transformers
4. **Efficient computation**: GPUs are optimized for dot products

---

**Q2: Explain gradient descent in simple terms.**

**A**: Gradient descent is an optimization algorithm to find the minimum of a function.

**Analogy**: Imagine you're blindfolded on a hilly terrain, trying to reach the lowest point.
1. Feel the slope around you (calculate gradient)
2. Take a step downhill (move opposite to gradient)
3. Repeat until you can't go lower (convergence)

**Formula**: `θ_new = θ_old - learning_rate × gradient`

The learning rate controls step size—too big and you might overshoot, too small and you'll take forever.

---

**Q3: What is the difference between variance and standard deviation?**

**A**: 
- **Variance**: Average squared deviation from the mean
  - `Var(X) = E[(X - μ)²]`
  - Units are squared (e.g., dollars²)

- **Standard Deviation**: Square root of variance
  - `σ = √Var(X)`
  - Same units as original data (e.g., dollars)

Standard deviation is more interpretable because it's in the same units as your data.

---

### Intermediate Level

**Q4: Explain the chain rule and its importance in neural networks.**

**A**: The chain rule calculates derivatives of composite functions:
```
d/dx[f(g(x))] = f'(g(x)) × g'(x)
```

In neural networks, we have nested functions:
```
loss = L(activation(W × x + b))
```

To update weights, we need `∂loss/∂W`, which requires chain rule:
```
∂loss/∂W = ∂loss/∂activation × ∂activation/∂(Wx+b) × ∂(Wx+b)/∂W
```

This is exactly what **backpropagation** does—it applies the chain rule backwards through the network to compute all gradients efficiently.

---

**Q5: What is eigendecomposition and where is it used in ML?**

**A**: Eigendecomposition breaks a matrix into:
```
A = V × Λ × V⁻¹
```
Where V contains eigenvectors and Λ is diagonal with eigenvalues.

**ML Applications**:
1. **PCA**: Principal components are eigenvectors of covariance matrix
2. **PageRank**: Dominant eigenvector gives page importance
3. **Spectral Clustering**: Uses eigenvectors of graph Laplacian
4. **Stability Analysis**: Eigenvalues indicate system stability

---

**Q6: Derive the gradient of Mean Squared Error loss.**

**A**:
```
Loss L = (1/m) × Σ(yᵢ - ŷᵢ)²

Where ŷ = Wx + b

∂L/∂W:
= (1/m) × Σ ∂/∂W[(yᵢ - (Wxᵢ + b))²]
= (1/m) × Σ 2(yᵢ - ŷᵢ) × (-xᵢ)
= -(2/m) × Σ(yᵢ - ŷᵢ) × xᵢ
= (2/m) × Σ(ŷᵢ - yᵢ) × xᵢ
= (2/m) × Xᵀ(ŷ - y)

∂L/∂b:
= (2/m) × Σ(ŷᵢ - yᵢ)
```

---

### Advanced Level

**Q7: Explain the relationship between Maximum Likelihood Estimation and Cross-Entropy Loss.**

**A**: Cross-entropy loss IS negative log-likelihood!

For classification with softmax:
```
P(y|x) = softmax(Wx)

Log-likelihood:
    log L = Σ log P(yᵢ|xᵢ)

Negative log-likelihood (what we minimize):
    NLL = -Σ log P(yᵢ|xᵢ)
    
For one-hot encoded labels:
    NLL = -Σ yᵢ × log(ŷᵢ)  ← This IS cross-entropy!
```

So minimizing cross-entropy = maximizing likelihood = finding the most probable parameters given data.

---

**Q8: Why do we use log probabilities instead of raw probabilities in ML?**

**A**: Several reasons:

1. **Numerical stability**: Probabilities can be very small (10⁻¹⁰⁰⁰), causing underflow. Logs turn these into manageable negative numbers.

2. **Multiplication → Addition**: 
   ```
   P(A,B,C) = P(A) × P(B) × P(C)
   log P(A,B,C) = log P(A) + log P(B) + log P(C)
   ```
   Addition is faster and more stable.

3. **Convex optimization**: Log transforms make many optimization problems convex.

4. **Gradient computation**: Derivatives of log functions are simpler.

---

### FAANG Level

**Q9: Explain the mathematics behind attention mechanism in transformers.**

**A**:

```
Attention(Q, K, V) = softmax(QKᵀ/√dₖ) × V
```

**Step by step**:

1. **Q, K, V matrices** (Linear Algebra):
   - Query Q: what am I looking for?
   - Key K: what do I contain?
   - Value V: what do I return?
   
2. **QKᵀ** (Dot Product):
   - Computes similarity between all query-key pairs
   - Result is attention scores matrix

3. **Scaling by √dₖ** (Statistics):
   - Prevents dot products from getting too large
   - Keeps softmax from saturating (gradients dying)

4. **Softmax** (Probability):
   - Converts scores to probabilities (sum to 1)
   - Higher scores get more weight

5. **× V** (Weighted Sum):
   - Each output is weighted combination of values
   - Weights determined by attention probabilities

**Why it works**: Allows each position to "attend" to all other positions, learning which are relevant.

---

**Q10: How would you implement batch normalization and explain its gradient computation?**

**A**:

**Forward Pass**:
```python
def batch_norm_forward(x, gamma, beta, eps=1e-5):
    # x: (batch_size, features)
    
    # Step 1: Compute mean
    mu = np.mean(x, axis=0)
    
    # Step 2: Compute variance
    var = np.var(x, axis=0)
    
    # Step 3: Normalize
    x_norm = (x - mu) / np.sqrt(var + eps)
    
    # Step 4: Scale and shift
    out = gamma * x_norm + beta
    
    # Cache for backward pass
    cache = (x, x_norm, mu, var, gamma, eps)
    return out, cache
```

**Backward Pass** (using chain rule):
```python
def batch_norm_backward(dout, cache):
    x, x_norm, mu, var, gamma, eps = cache
    m = x.shape[0]
    
    # Gradients of learnable parameters
    dgamma = np.sum(dout * x_norm, axis=0)
    dbeta = np.sum(dout, axis=0)
    
    # Gradient of input (complex due to dependencies)
    dx_norm = dout * gamma
    
    dvar = np.sum(dx_norm * (x - mu) * -0.5 * (var + eps)**(-1.5), axis=0)
    dmu = np.sum(dx_norm * -1/np.sqrt(var + eps), axis=0) + dvar * np.mean(-2 * (x - mu), axis=0)
    
    dx = dx_norm / np.sqrt(var + eps) + dvar * 2 * (x - mu) / m + dmu / m
    
    return dx, dgamma, dbeta
```

**Key insight**: The gradient is complex because mean and variance depend on ALL inputs, creating inter-sample dependencies.

---

## 🔗 What's Next?

In the next file `03-Neural-Networks-Basics.md`, we'll cover:
- Perceptrons and biological inspiration
- Multi-layer perceptrons (MLP)
- Activation functions (ReLU, Sigmoid, Tanh)
- Forward propagation step-by-step
- Building your first neural network

---

**Type CONTINUE to proceed with `03-Neural-Networks-Basics.md`**
