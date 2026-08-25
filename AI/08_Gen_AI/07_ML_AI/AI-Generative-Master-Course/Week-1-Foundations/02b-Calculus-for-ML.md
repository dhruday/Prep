# 📈 Calculus for Machine Learning

> **Prerequisite:** [02a-Linear-Algebra.md](./02a-Linear-Algebra.md), Basic algebra
> **Time:** 2-3 hours
> **Difficulty:** ⭐⭐⭐ (Moderate - take your time!)

---

## 📚 Table of Contents

1. [Learning Objectives](#-learning-objectives)
2. [Why Calculus for AI?](#-why-calculus-for-ai)
3. [Part 1: Derivatives - The Core Concept](#-part-1-derivatives---the-core-concept)
4. [Part 2: Partial Derivatives](#-part-2-partial-derivatives)
5. [Part 3: The Gradient](#-part-3-the-gradient)
6. [Part 4: The Chain Rule (Heart of Backpropagation)](#️-part-4-the-chain-rule-heart-of-backpropagation)
7. [Part 5: Gradient Descent](#-part-5-gradient-descent)
8. [Quick Reference Card](#-quick-reference-card)
9. [Common Mistakes](#️-common-mistakes)
10. [Interview Questions](#-interview-questions)
11. [Key Takeaways](#-key-takeaways)
12. [Next Up](#-next-up)

---

## 🎯 Learning Objectives

By the end of this module, you will:
- [ ] Understand what a derivative means intuitively
- [ ] Know the key derivatives used in AI
- [ ] Understand partial derivatives and gradients
- [ ] Master the chain rule (heart of backpropagation)
- [ ] See how gradient descent works

---

## 🤔 Why Calculus for AI?

**The fundamental question of AI:** How do we adjust weights to make predictions better?

**Calculus answers:** By measuring how loss changes when we change each weight.

```
             Loss
              │
              │   ╲
              │    ╲    We want to find
              │     ╲   the BOTTOM!
              │      ╲
              │       ╲___/──── minimum loss
              │
              └────────────────── weight value
              
Derivative tells us: "Which direction is downhill?"
```

### The Core Idea

```
┌────────────────────────────────────────────────────────────┐
│                   HOW NEURAL NETWORKS LEARN                 │
│                                                             │
│  1. Forward pass: Make a prediction                        │
│  2. Calculate loss: How wrong were we?                     │
│  3. Backpropagation: How should each weight change?        │
│     └── THIS IS WHERE CALCULUS HAPPENS!                    │
│  4. Update weights: Nudge in the right direction           │
│  5. Repeat                                                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📐 Part 1: Derivatives - The Core Concept

### 1.1 What is a Derivative?

A **derivative** measures how much the output changes when the input changes a tiny bit.

#### Real-World Analogy

```
You're driving a car:
- Position = where you are
- Velocity = derivative of position = how fast position is changing
- Acceleration = derivative of velocity = how fast velocity is changing

If you're at mile 10 and moving at 60 mph:
- Position: 10 miles
- Derivative (velocity): 60 mph ← "position changes by 60 miles per hour"
```

#### Mathematical Definition

```
For function f(x):

Derivative = lim   f(x + Δx) - f(x)
             Δx→0  ─────────────────
                         Δx

            = "output change" / "input change" (as change gets tiny)
```

#### Visual Understanding

```
         y │
           │           ___________
           │         _╱
           │       _╱  ← slope here = derivative at this point
           │     _╱
           │   _╱
           │ _╱
           │╱
           └────────────────── x
           
The derivative at any point = the SLOPE of the curve at that point
```

---

### 1.2 Simple Derivative Examples

#### Constant Function

```
f(x) = 5

The output is always 5, never changes.
Derivative = 0 (flat line, no slope)

f'(x) = 0
```

#### Linear Function

```
f(x) = 3x + 2

Output increases by 3 for every 1 increase in x.
Derivative = 3 (constant slope)

f'(x) = 3
```

#### Quadratic Function

```
f(x) = x²

At x=1: f(1) = 1, slope is gentle
At x=3: f(3) = 9, slope is steep
Derivative = 2x (slope increases with x)

f'(x) = 2x
```

```python
# Verify numerically
def f(x):
    return x ** 2

def numerical_derivative(f, x, delta=0.0001):
    return (f(x + delta) - f(x)) / delta

x = 3
print(f"f(x) = x² at x={x}")
print(f"Numerical derivative: {numerical_derivative(f, x):.4f}")  # ~6.0
print(f"Analytical (2x): {2 * x}")  # 6
```

---

### 1.3 Key Derivatives for AI (Memorize These!)

| Function | Derivative | Used In |
|----------|------------|---------|
| `f(x) = c` | `f'(x) = 0` | Constants |
| `f(x) = x` | `f'(x) = 1` | Linear layers |
| `f(x) = x²` | `f'(x) = 2x` | MSE loss |
| `f(x) = xⁿ` | `f'(x) = n·xⁿ⁻¹` | Power rule |
| `f(x) = eˣ` | `f'(x) = eˣ` | Softmax |
| `f(x) = ln(x)` | `f'(x) = 1/x` | Cross-entropy |
| `f(x) = sigmoid(x)` | `f'(x) = f(x)·(1-f(x))` | Activation |
| `f(x) = ReLU(x)` | `f'(x) = 1 if x>0 else 0` | Activation |

#### Visual: Common Activation Derivatives

```
ReLU:                           Sigmoid:
   y│    /                         y│      ___________
    │   /                           │    /
    │  /                            │   /
────┼─/──────x                  ────┼──/──────────x
    │                               │ /
                                    │/
    
f'(x) = 1 if x>0              f'(x) = f(1-f)
      = 0 if x<0              Maximum at x=0 (0.25)
```

---

### 🧪 Checkpoint 1: Basic Derivatives

```python
# Exercise 1: What is the derivative of f(x) = 5x³?
# Hint: Use the power rule

# Exercise 2: What is the derivative of f(x) = 2x² + 3x + 1?
# Hint: Take derivative of each term

# Exercise 3: If f(x) = x² and x=4, what is f'(4)?
```

<details>
<summary>Click for answers</summary>

```python
# Exercise 1
# f(x) = 5x³
# f'(x) = 5 * 3 * x² = 15x²

# Exercise 2
# f(x) = 2x² + 3x + 1
# f'(x) = 4x + 3 + 0 = 4x + 3

# Exercise 3
# f'(x) = 2x
# f'(4) = 2 * 4 = 8
```

</details>

---

## 🎯 Part 2: Partial Derivatives

### 2.1 Multiple Inputs

When a function has multiple inputs, we take the derivative with respect to **one variable at a time**, treating others as constants.

```
f(x, y) = x² + 3xy + y²

Partial derivative with respect to x (treat y as a constant):
∂f/∂x = 2x + 3y + 0 = 2x + 3y

Partial derivative with respect to y (treat x as a constant):
∂f/∂y = 0 + 3x + 2y = 3x + 2y
```

#### Symbol: ∂ vs d

- `d` = regular derivative (one variable)
- `∂` = partial derivative (multiple variables, focus on one)

#### Example: Loss Function

```
Neural network loss might depend on weights W₁, W₂, W₃...

Loss = L(W₁, W₂, W₃)

To update each weight, we need:
∂L/∂W₁ = How does loss change when W₁ changes?
∂L/∂W₂ = How does loss change when W₂ changes?
∂L/∂W₃ = How does loss change when W₃ changes?
```

---

### 2.2 Computing Partial Derivatives

```python
# Example: f(x, y) = x² + 2xy + y³

# Partial with respect to x (treat y as constant):
# ∂f/∂x = 2x + 2y + 0 = 2x + 2y

# Partial with respect to y (treat x as constant):
# ∂f/∂y = 0 + 2x + 3y² = 2x + 3y²

# Verify numerically
def f(x, y):
    return x**2 + 2*x*y + y**3

def partial_x(x, y, delta=0.0001):
    return (f(x + delta, y) - f(x, y)) / delta

def partial_y(x, y, delta=0.0001):
    return (f(x, y + delta) - f(x, y)) / delta

x, y = 2.0, 3.0
print(f"∂f/∂x at ({x}, {y}):")
print(f"  Numerical: {partial_x(x, y):.4f}")
print(f"  Analytical (2x + 2y): {2*x + 2*y}")

print(f"∂f/∂y at ({x}, {y}):")
print(f"  Numerical: {partial_y(x, y):.4f}")
print(f"  Analytical (2x + 3y²): {2*x + 3*y**2}")
```

---

## 🧭 Part 3: The Gradient

### 3.1 What is a Gradient?

The **gradient** is simply the vector of ALL partial derivatives:

```
f(x, y, z) = x² + y² + z²

Gradient: ∇f = [∂f/∂x, ∂f/∂y, ∂f/∂z]
             = [2x, 2y, 2z]
```

#### The Key Property

**The gradient points in the direction of steepest INCREASE.**

```
        ┌─────────────────────────────────────────┐
        │                                         │
        │   ∇f points UPHILL                      │
        │   -∇f points DOWNHILL                   │
        │                                         │
        │   To minimize loss, go in               │
        │   OPPOSITE direction of gradient!       │
        │                                         │
        │   weights_new = weights - lr × ∇Loss    │
        │                                         │
        └─────────────────────────────────────────┘
```

### 3.2 Gradient in Neural Networks

```
For a neural network with weights W₁, W₂, ..., Wₙ:

Loss = L(W₁, W₂, ..., Wₙ)

Gradient = [∂L/∂W₁, ∂L/∂W₂, ..., ∂L/∂Wₙ]

Update each weight:
W₁ = W₁ - learning_rate × ∂L/∂W₁
W₂ = W₂ - learning_rate × ∂L/∂W₂
...
```

---

## ⛓️ Part 4: The Chain Rule (Heart of Backpropagation)

### 4.1 The Problem

Neural networks are **compositions** of functions:

```
Input → Layer1 → Layer2 → Layer3 → Output → Loss
  x       h₁       h₂       h₃       ŷ       L

Each arrow is a function.
Loss depends on ALL weights through this chain.

How do we find ∂L/∂W₁ (how first layer's weights affect loss)?
```

### 4.2 The Chain Rule

If `y = f(g(x))` (a function inside a function), then:

```
dy/dx = dy/dg × dg/dx

"Derivative of outer" × "Derivative of inner"
```

#### Simple Example

```
y = (3x + 2)²

Let g = 3x + 2  (inner function)
Let y = g²      (outer function)

Step 1: Derivative of outer (treating g as variable)
dy/dg = 2g

Step 2: Derivative of inner
dg/dx = 3

Step 3: Multiply them!
dy/dx = dy/dg × dg/dx = 2g × 3 = 6g = 6(3x + 2)
```

```python
# Verify
def y(x):
    return (3*x + 2)**2

def dy_dx_numerical(x, delta=0.0001):
    return (y(x + delta) - y(x)) / delta

x = 2.0
print(f"Numerical: {dy_dx_numerical(x):.4f}")
print(f"Analytical 6(3x+2): {6 * (3*x + 2)}")  # 6*8 = 48
```

### 4.3 Multi-Step Chain Rule

For longer chains: **multiply all the local derivatives!**

```
z = a(b(c(x)))

dz/dx = dz/db × db/dc × dc/dx
```

#### Neural Network Application

```
Loss L depends on output ŷ
ŷ depends on layer 3 output h₃
h₃ depends on layer 2 output h₂
h₂ depends on layer 1 weights W₁

∂L/∂W₁ = ∂L/∂ŷ × ∂ŷ/∂h₃ × ∂h₃/∂h₂ × ∂h₂/∂W₁

This is BACKPROPAGATION!
We compute these products from output back to input.
```

---

### 4.4 Backpropagation Example (Step by Step)

Let's trace through a simple 2-weight network:

```python
import numpy as np

# Simple network: x → h = x*W1 → y = h*W2 → loss = (y - target)²

# Setup
x = 2.0
W1 = 0.5
W2 = 0.3
target = 1.0

print("=" * 50)
print("FORWARD PASS")
print("=" * 50)

# Forward pass
h = x * W1
print(f"h = x × W1 = {x} × {W1} = {h}")

y = h * W2
print(f"y = h × W2 = {h} × {W2} = {y}")

loss = (y - target) ** 2
print(f"loss = (y - target)² = ({y} - {target})² = {loss}")

print("\n" + "=" * 50)
print("BACKWARD PASS (Chain Rule)")
print("=" * 50)

# Backward pass: compute gradients using chain rule

# Step 1: ∂loss/∂y
# loss = (y - target)²
# ∂loss/∂y = 2(y - target)
dloss_dy = 2 * (y - target)
print(f"∂loss/∂y = 2(y - target) = 2({y} - {target}) = {dloss_dy}")

# Step 2: ∂y/∂h and ∂y/∂W2
# y = h × W2
# ∂y/∂h = W2
# ∂y/∂W2 = h
dy_dh = W2
dy_dW2 = h
print(f"∂y/∂h = W2 = {dy_dh}")
print(f"∂y/∂W2 = h = {dy_dW2}")

# Step 3: ∂h/∂W1
# h = x × W1
# ∂h/∂W1 = x
dh_dW1 = x
print(f"∂h/∂W1 = x = {dh_dW1}")

# Now apply chain rule!
print("\n" + "-" * 50)
print("COMPUTING FINAL GRADIENTS")
print("-" * 50)

# ∂loss/∂W2 = ∂loss/∂y × ∂y/∂W2
dloss_dW2 = dloss_dy * dy_dW2
print(f"∂loss/∂W2 = ∂loss/∂y × ∂y/∂W2 = {dloss_dy} × {dy_dW2} = {dloss_dW2}")

# ∂loss/∂W1 = ∂loss/∂y × ∂y/∂h × ∂h/∂W1
dloss_dW1 = dloss_dy * dy_dh * dh_dW1
print(f"∂loss/∂W1 = ∂loss/∂y × ∂y/∂h × ∂h/∂W1 = {dloss_dy} × {dy_dh} × {dh_dW1} = {dloss_dW1}")

print("\n" + "=" * 50)
print("WEIGHT UPDATE")
print("=" * 50)

lr = 0.1
W1_new = W1 - lr * dloss_dW1
W2_new = W2 - lr * dloss_dW2

print(f"W1_new = W1 - lr × ∂loss/∂W1 = {W1} - {lr} × {dloss_dW1} = {W1_new}")
print(f"W2_new = W2 - lr × ∂loss/∂W2 = {W2} - {lr} × {dloss_dW2} = {W2_new}")

# Verify loss decreases
y_new = x * W1_new * W2_new
loss_new = (y_new - target) ** 2
print(f"\nOld loss: {loss:.6f}")
print(f"New loss: {loss_new:.6f}")
print(f"Loss decreased: {loss_new < loss}")
```

---

### 🧪 Checkpoint 2: Chain Rule

```python
# Exercise 1: Find dy/dx for y = (x² + 1)³
# Hint: Let g = x² + 1

# Exercise 2: In the network x → h=2x → y=3h → loss=(y-5)²
# Find ∂loss/∂x

# Exercise 3: Why do we subtract the gradient instead of adding?
```

<details>
<summary>Click for answers</summary>

```python
# Exercise 1
# g = x² + 1
# y = g³
# dy/dg = 3g²
# dg/dx = 2x
# dy/dx = 3g² × 2x = 6x(x² + 1)²

# Exercise 2
# h = 2x → ∂h/∂x = 2
# y = 3h → ∂y/∂h = 3
# loss = (y-5)² → ∂loss/∂y = 2(y-5) = 2(6x-5)
# ∂loss/∂x = 2(6x-5) × 3 × 2 = 12(6x-5)

# Exercise 3
# The gradient points UPHILL (direction of increase).
# To minimize loss, we go DOWNHILL (opposite direction).
# So we subtract: weights = weights - lr × gradient
```

</details>

---

## 🚀 Part 5: Gradient Descent

### 5.1 The Algorithm

```
┌─────────────────────────────────────────────────────────┐
│              GRADIENT DESCENT ALGORITHM                  │
│                                                          │
│  1. Start with random weights                           │
│  2. Repeat:                                             │
│     a. Compute prediction (forward pass)                │
│     b. Compute loss                                     │
│     c. Compute gradients (backward pass)                │
│     d. Update: weights = weights - lr × gradients       │
│  3. Stop when loss is small enough                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Visualization

```python
import numpy as np
import matplotlib.pyplot as plt

def gradient_descent_1d():
    """Visualize gradient descent on f(x) = x² """
    
    # Function and its derivative
    def f(x):
        return x ** 2
    
    def df(x):
        return 2 * x
    
    # Gradient descent
    x = 4.0  # Starting point
    learning_rate = 0.1
    history = [x]
    
    for i in range(15):
        gradient = df(x)
        x = x - learning_rate * gradient
        history.append(x)
    
    # Visualization
    plt.figure(figsize=(10, 5))
    
    # Plot the function
    x_range = np.linspace(-5, 5, 100)
    plt.plot(x_range, f(x_range), 'b-', label='f(x) = x²')
    
    # Plot the descent path
    history = np.array(history)
    plt.scatter(history, f(history), c=range(len(history)), cmap='Reds', s=100, zorder=5)
    plt.plot(history, f(history), 'r--', alpha=0.5)
    
    # Annotations
    plt.scatter(history[0], f(history[0]), c='green', s=200, marker='*', label='Start', zorder=10)
    plt.scatter(history[-1], f(history[-1]), c='purple', s=200, marker='*', label='End', zorder=10)
    
    plt.xlabel('x (weight)')
    plt.ylabel('f(x) (loss)')
    plt.title('Gradient Descent: Finding Minimum')
    plt.legend()
    plt.grid(True)
    plt.savefig('gradient_descent.png')
    plt.show()
    
    print(f"Started at x = {history[0]}, loss = {f(history[0])}")
    print(f"Ended at x = {history[-1]:.6f}, loss = {f(history[-1]):.6f}")

gradient_descent_1d()
```

### 5.3 Learning Rate Matters!

```
Too small:                    Just right:              Too large:
    │                             │                        │
    │ ●                           │ ●                      │  ●
    │  ●                          │  ●                     │     ●
    │   ●                         │    ●                   │         ●
    │    ●                        │       ●                │   ●
    │     ●                       │          ●_            │         ●
    │      ●                      │                        │
    └────────                     └────────────            └────────────
    
Takes forever              Converges nicely         Overshoots/diverges
```

---

## 📋 Quick Reference Card

| Concept | Formula | Meaning |
|---------|---------|---------|
| Derivative | `df/dx` | Rate of change |
| Partial Derivative | `∂f/∂x` | Rate of change w.r.t. one variable |
| Gradient | `∇f = [∂f/∂x₁, ∂f/∂x₂, ...]` | Vector of all partials |
| Chain Rule | `dy/dx = dy/dg × dg/dx` | Derivative of composition |
| Gradient Descent | `θ = θ - α∇L` | Learning update rule |

### Derivative Rules

| Rule | Formula |
|------|---------|
| Power | `d/dx[xⁿ] = nxⁿ⁻¹` |
| Sum | `d/dx[f + g] = f' + g'` |
| Product | `d/dx[fg] = f'g + fg'` |
| Chain | `d/dx[f(g(x))] = f'(g(x))·g'(x)` |

---

## ⚠️ Common Mistakes

| Mistake | Why It's Wrong | Fix |
|---------|----------------|-----|
| Forgetting chain rule | Gradients won't flow through layers | Apply chain rule at each step |
| Wrong gradient sign | Goes uphill instead of down | Subtract gradient, not add |
| Ignoring learning rate | Updates too big/small | Start with 0.01 or 0.001 |
| Treating partials as total | Missing dependencies | Track all paths gradient flows through |

---

## 🎤 Interview Questions

### Beginner

**Q1: What is a gradient and why do we subtract it?**
> A gradient is the vector of partial derivatives, pointing toward steepest increase. We subtract it because we want to DECREASE loss, so we move in the opposite direction.

**Q2: Explain the chain rule in simple terms.**
> When functions are nested (f composed with g), the total derivative is the product of individual derivatives. Each layer's derivative gets multiplied together.

### Intermediate

**Q3: Walk through backpropagation for a 2-layer network.**
> Forward: compute predictions layer by layer. Backward: starting from loss, compute ∂loss/∂output, then multiply by ∂output/∂hidden, then by ∂hidden/∂weights. Update weights using these gradients.

**Q4: What happens if learning rate is too high or too low?**
> Too high: overshoots the minimum, may diverge. Too low: takes forever to converge. Need to find the sweet spot, often done with learning rate schedulers.

### Advanced

**Q5: Why can gradients vanish or explode in deep networks?**
> Chain rule multiplies many terms. If each term < 1, product → 0 (vanishing). If each term > 1, product → ∞ (exploding). Solutions: proper initialization, batch norm, skip connections, gradient clipping.

---

## ✅ Key Takeaways

1. **Derivatives** measure how output changes with input
2. **Partial derivatives** focus on one variable at a time
3. **Gradients** are vectors pointing "uphill"
4. **Chain rule** lets us backpropagate through layers
5. **Gradient descent** = subtract gradient to minimize loss

---

## 🔜 Next Up

Continue to → [02c-Probability-Statistics.md](./02c-Probability-Statistics.md)

You understand how neural networks LEARN. Now you'll learn why their outputs are PROBABILITIES and how loss functions work!

*Vectors ✓ → Calculus ✓ → Next: Probability & Statistics!* 🎲
