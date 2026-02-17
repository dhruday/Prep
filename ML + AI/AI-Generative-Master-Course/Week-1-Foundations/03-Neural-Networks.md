# 🧠 Neural Networks - From Scratch to Understanding

## 🎯 What You'll Learn

This chapter takes you from zero to building neural networks:
- What a neural network actually is
- The perceptron - the simplest neural network
- Activation functions and why they matter
- Forward propagation step by step
- Building your first neural network from scratch

---

## 🌟 Section 1: What is a Neural Network?

### Beginner-Friendly Explanation

A **neural network** is a system that learns patterns from examples.

**Analogy:** Teaching a child to recognize dogs

```
Traditional Programming:
"A dog has 4 legs, fur, a tail, barks..."
(You specify every rule)

Neural Network:
Show 1000 pictures of dogs
Show 1000 pictures of not-dogs
"Figure out the pattern yourself"
(It learns the rules)
```

### Visual Mental Model

```
                    NEURAL NETWORK
                    
     INPUT              HIDDEN              OUTPUT
     LAYER              LAYERS              LAYER
     
    ┌───┐              ┌───┐
    │ x₁├──────────────┤ h₁├────────┐
    └───┘              └───┘        │      ┌───┐
                                    ├──────┤ y │
    ┌───┐              ┌───┐        │      └───┘
    │ x₂├──────────────┤ h₂├────────┘
    └───┘              └───┘
                       
   Features          Learning          Prediction
   (pixels,          happens           (cat/dog,
   words...)         here!             price...)
```

Every line has a **weight** - a number the network learns.

---

## 🔬 Section 2: The Perceptron

### The Simplest Neural Network

The perceptron (invented 1958) is a single "neuron":

```
                    PERCEPTRON
                    
        x₁ ──w₁──┐
                 │
        x₂ ──w₂──┼──► Σ ──► activation ──► output
                 │
        x₃ ──w₃──┘
             │
           + b (bias)
```

### The Math

```
Step 1: Weighted sum
        z = w₁x₁ + w₂x₂ + w₃x₃ + b
        z = Σ(wᵢxᵢ) + b
        z = w · x + b

Step 2: Activation function
        output = activation(z)
        
For original perceptron:
        output = 1 if z > 0 else 0
```

### Code Implementation

```python
import numpy as np

class Perceptron:
    def __init__(self, n_inputs):
        # Initialize weights randomly
        self.weights = np.random.randn(n_inputs)
        self.bias = 0.0
    
    def forward(self, x):
        """Forward pass: compute output"""
        z = np.dot(self.weights, x) + self.bias
        return 1 if z > 0 else 0
    
    def train(self, X, y, lr=0.1, epochs=100):
        """Train using perceptron learning rule"""
        for epoch in range(epochs):
            errors = 0
            for xi, yi in zip(X, y):
                prediction = self.forward(xi)
                error = yi - prediction
                
                if error != 0:
                    # Update rule
                    self.weights += lr * error * xi
                    self.bias += lr * error
                    errors += 1
            
            if errors == 0:
                print(f"Converged at epoch {epoch}")
                break

# Example: AND gate
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y = np.array([0, 0, 0, 1])  # AND logic

p = Perceptron(n_inputs=2)
p.train(X, y)

# Test
for xi in X:
    print(f"{xi} -> {p.forward(xi)}")
```

### Limitation: XOR Problem

```
AND gate (learnable):          XOR gate (NOT learnable by perceptron):
    x₁  x₂  output                 x₁  x₂  output
    0   0   0                      0   0   0
    0   1   0                      0   1   1
    1   0   0                      1   0   1
    1   1   1                      1   1   0

XOR is not linearly separable!
We can't draw a single line to separate 0s from 1s.

Solution: Multiple layers (multilayer perceptron)
```

---

## ⚡ Section 3: Activation Functions

### Why We Need Non-linearity

Without activation functions, a neural network is just linear:

```
Layer 1: h = xW₁
Layer 2: y = hW₂ = xW₁W₂ = xW₃

Multiple linear layers = One linear layer!
No matter how many layers, we can only learn linear patterns.
```

**Activation functions add non-linearity**, allowing networks to learn complex patterns.

---

### 3.1 Sigmoid

```
σ(z) = 1 / (1 + e⁻ᶻ)

Output range: (0, 1)

Graph:
    1 ─────────────────────────╭────
                             ╱
                           ╱
    0.5 ─────────────────╱─────────
                       ╱
                     ╱
    0 ────────────╯─────────────────
           -6  -4  -2   0   2   4   6
```

**Pros:**
- Smooth, differentiable
- Output interpretable as probability

**Cons:**
- Vanishing gradients (derivative near 0 for large |z|)
- Not zero-centered (outputs always positive)

```python
def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def sigmoid_derivative(z):
    s = sigmoid(z)
    return s * (1 - s)
```

---

### 3.2 Tanh

```
tanh(z) = (eᶻ - e⁻ᶻ) / (eᶻ + e⁻ᶻ)

Output range: (-1, 1)

Graph:
    1 ─────────────────────────╭────
                             ╱
                           ╱
    0 ─────────────────────────────
                       ╱
                     ╱
   -1 ────────────╯─────────────────
```

**Pros:**
- Zero-centered (better for optimization)
- Stronger gradients than sigmoid

**Cons:**
- Still has vanishing gradient problem

```python
def tanh(z):
    return np.tanh(z)

def tanh_derivative(z):
    return 1 - np.tanh(z)**2
```

---

### 3.3 ReLU (Rectified Linear Unit)

```
ReLU(z) = max(0, z)

Output range: [0, ∞)

Graph:
    │           ╱
    │         ╱
    │       ╱
    │     ╱
    ├───────────── 0
    │
    ├────────────────────
   -2  -1   0   1   2   3
```

**Pros:**
- Computationally efficient
- No vanishing gradient for positive values
- Sparse activation (many zeros)

**Cons:**
- "Dying ReLU" - neurons can get stuck at 0

```python
def relu(z):
    return np.maximum(0, z)

def relu_derivative(z):
    return (z > 0).astype(float)
```

---

### 3.4 Leaky ReLU

```
LeakyReLU(z) = z if z > 0 else αz  (typically α = 0.01)

Graph:
    │           ╱
    │         ╱
    │       ╱
    │     ╱
    ├──_──────── 0  (slight slope for negative)
    │╱
    ├────────────────────
```

**Pros:**
- Fixes dying ReLU problem
- Non-zero gradient for negative inputs

```python
def leaky_relu(z, alpha=0.01):
    return np.where(z > 0, z, alpha * z)
```

---

### 3.5 GELU (Gaussian Error Linear Unit)

```
GELU(z) = z × Φ(z)

Where Φ(z) is the CDF of standard normal distribution.

Approximation: 
GELU(z) ≈ 0.5z(1 + tanh(√(2/π)(z + 0.044715z³)))
```

**Used in:** BERT, GPT, modern transformers

**Why:**
- Smooth approximation to ReLU
- Non-zero gradients everywhere
- Works better empirically for transformers

```python
def gelu(z):
    return 0.5 * z * (1 + np.tanh(np.sqrt(2/np.pi) * (z + 0.044715 * z**3)))
```

---

### Activation Function Comparison

| Activation | Formula | Range | Use Case |
|------------|---------|-------|----------|
| Sigmoid | 1/(1+e⁻ᶻ) | (0,1) | Binary output, probabilities |
| Tanh | (eᶻ-e⁻ᶻ)/(eᶻ+e⁻ᶻ) | (-1,1) | Hidden layers (older) |
| ReLU | max(0,z) | [0,∞) | Hidden layers (standard) |
| LeakyReLU | max(αz,z) | (-∞,∞) | Hidden layers (alternative) |
| GELU | z×Φ(z) | (-∞,∞) | Transformers |
| Softmax | eᶻⁱ/Σeᶻʲ | (0,1) | Multi-class output |

---

## 🔄 Section 4: Forward Propagation

### What is Forward Propagation?

The process of passing inputs through the network to get outputs.

```
INPUT → Layer 1 → Layer 2 → ... → OUTPUT
         ↓         ↓
        (weights, activation, weights, activation)
```

### Step-by-Step Example

```
Network: 2 inputs → 3 hidden → 1 output

Inputs: x = [0.5, 0.8]

Layer 1 (2→3):
    W₁ = [[0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6]]    # (2, 3)
    b₁ = [0.1, 0.1, 0.1]      # (3,)
    
    z₁ = x @ W₁ + b₁
       = [0.5, 0.8] @ [[0.1, 0.2, 0.3],
                       [0.4, 0.5, 0.6]] + [0.1, 0.1, 0.1]
       = [0.37, 0.5, 0.63] + [0.1, 0.1, 0.1]
       = [0.47, 0.6, 0.73]
    
    h₁ = relu(z₁) = [0.47, 0.6, 0.73]  # All positive, unchanged

Layer 2 (3→1):
    W₂ = [[0.7], [0.8], [0.9]]  # (3, 1)
    b₂ = [0.1]                   # (1,)
    
    z₂ = h₁ @ W₂ + b₂
       = [0.47, 0.6, 0.73] @ [[0.7], [0.8], [0.9]] + [0.1]
       = [0.329 + 0.48 + 0.657] + [0.1]
       = [1.566]
    
    output = sigmoid(z₂) = sigmoid(1.566) = 0.827
```

### Code Implementation

```python
import numpy as np

class NeuralNetwork:
    def __init__(self, layer_sizes):
        """
        layer_sizes: list of layer dimensions
        e.g., [2, 3, 1] means 2 inputs, 3 hidden, 1 output
        """
        self.weights = []
        self.biases = []
        
        # Initialize weights for each layer
        for i in range(len(layer_sizes) - 1):
            w = np.random.randn(layer_sizes[i], layer_sizes[i+1]) * 0.5
            b = np.zeros(layer_sizes[i+1])
            self.weights.append(w)
            self.biases.append(b)
    
    def relu(self, z):
        return np.maximum(0, z)
    
    def sigmoid(self, z):
        return 1 / (1 + np.exp(-np.clip(z, -500, 500)))
    
    def forward(self, X):
        """Forward propagation"""
        self.activations = [X]  # Store for backprop
        self.z_values = []
        
        current = X
        
        # Hidden layers use ReLU
        for i in range(len(self.weights) - 1):
            z = current @ self.weights[i] + self.biases[i]
            self.z_values.append(z)
            current = self.relu(z)
            self.activations.append(current)
        
        # Output layer uses sigmoid
        z = current @ self.weights[-1] + self.biases[-1]
        self.z_values.append(z)
        output = self.sigmoid(z)
        self.activations.append(output)
        
        return output

# Test
nn = NeuralNetwork([2, 3, 1])
X = np.array([[0.5, 0.8]])
output = nn.forward(X)
print(f"Input: {X}")
print(f"Output: {output}")
```

---

## 🏗️ Section 5: Building a Complete Neural Network

### Full Implementation with Training

```python
import numpy as np

class NeuralNetworkComplete:
    def __init__(self, layer_sizes):
        self.layer_sizes = layer_sizes
        self.n_layers = len(layer_sizes)
        
        # Xavier initialization
        self.weights = []
        self.biases = []
        
        for i in range(self.n_layers - 1):
            scale = np.sqrt(2.0 / layer_sizes[i])
            w = np.random.randn(layer_sizes[i], layer_sizes[i+1]) * scale
            b = np.zeros((1, layer_sizes[i+1]))
            self.weights.append(w)
            self.biases.append(b)
    
    def relu(self, z):
        return np.maximum(0, z)
    
    def relu_derivative(self, z):
        return (z > 0).astype(float)
    
    def sigmoid(self, z):
        z = np.clip(z, -500, 500)
        return 1 / (1 + np.exp(-z))
    
    def sigmoid_derivative(self, a):
        return a * (1 - a)
    
    def forward(self, X):
        """Forward propagation"""
        self.activations = [X]
        self.z_values = []
        
        current = X
        
        # All layers except last use ReLU
        for i in range(self.n_layers - 2):
            z = current @ self.weights[i] + self.biases[i]
            self.z_values.append(z)
            current = self.relu(z)
            self.activations.append(current)
        
        # Last layer uses sigmoid
        z = current @ self.weights[-1] + self.biases[-1]
        self.z_values.append(z)
        current = self.sigmoid(z)
        self.activations.append(current)
        
        return current
    
    def compute_loss(self, y_pred, y_true):
        """Binary cross-entropy loss"""
        epsilon = 1e-15
        y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
        loss = -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))
        return loss
    
    def backward(self, y_true):
        """Backpropagation"""
        m = y_true.shape[0]
        
        self.d_weights = []
        self.d_biases = []
        
        # Output layer gradient
        delta = self.activations[-1] - y_true  # For BCE with sigmoid
        
        # Store gradients (going backwards)
        for i in range(self.n_layers - 2, -1, -1):
            dw = self.activations[i].T @ delta / m
            db = np.mean(delta, axis=0, keepdims=True)
            
            self.d_weights.insert(0, dw)
            self.d_biases.insert(0, db)
            
            if i > 0:
                # Backpropagate through previous layer
                delta = delta @ self.weights[i].T
                delta = delta * self.relu_derivative(self.z_values[i-1])
    
    def update(self, learning_rate):
        """Update weights using gradients"""
        for i in range(len(self.weights)):
            self.weights[i] -= learning_rate * self.d_weights[i]
            self.biases[i] -= learning_rate * self.d_biases[i]
    
    def train(self, X, y, epochs=1000, lr=0.1, print_every=100):
        """Full training loop"""
        history = []
        
        for epoch in range(epochs):
            # Forward pass
            y_pred = self.forward(X)
            
            # Compute loss
            loss = self.compute_loss(y_pred, y)
            history.append(loss)
            
            # Backward pass
            self.backward(y)
            
            # Update weights
            self.update(lr)
            
            if epoch % print_every == 0:
                accuracy = np.mean((y_pred > 0.5) == y) * 100
                print(f"Epoch {epoch}: Loss = {loss:.4f}, Accuracy = {accuracy:.1f}%")
        
        return history
    
    def predict(self, X):
        """Make predictions"""
        return (self.forward(X) > 0.5).astype(int)


# ========== DEMO: XOR Problem ==========

print("=" * 50)
print("Training Neural Network on XOR Problem")
print("=" * 50)

# XOR data
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y = np.array([[0], [1], [1], [0]])

# Create network: 2 inputs → 4 hidden → 1 output
nn = NeuralNetworkComplete([2, 4, 1])

# Train
history = nn.train(X, y, epochs=5000, lr=0.5, print_every=1000)

# Test
print("\nResults:")
for xi, yi in zip(X, y):
    pred = nn.forward(xi.reshape(1, -1))[0, 0]
    print(f"Input: {xi} → Predicted: {pred:.4f}, Actual: {yi[0]}")
```

**Output:**
```
==================================================
Training Neural Network on XOR Problem
==================================================
Epoch 0: Loss = 0.7145, Accuracy = 50.0%
Epoch 1000: Loss = 0.0156, Accuracy = 100.0%
Epoch 2000: Loss = 0.0059, Accuracy = 100.0%
Epoch 3000: Loss = 0.0034, Accuracy = 100.0%
Epoch 4000: Loss = 0.0023, Accuracy = 100.0%

Results:
Input: [0 0] → Predicted: 0.0032, Actual: 0
Input: [0 1] → Predicted: 0.9954, Actual: 1
Input: [1 0] → Predicted: 0.9953, Actual: 1
Input: [1 1] → Predicted: 0.0047, Actual: 0
```

**🎉 The network learned XOR - something a single perceptron cannot do!**

---

## 🎯 Section 6: Understanding What's Happening

### Layer-by-Layer Visualization

```
XOR Problem:

Input Space:           After Hidden Layer:        Output:
    │                      │                        
(0,1) ●━━━━● (1,1)        ●━━━━━━●  (linearly      ● 0
    │      │               │      │   separable!)    │
    │      │               │      │                  │
(0,0) ●━━━━● (1,0)        ●━━━━━━●                 ● 1
    └──────────            └──────────              └───

First hidden layer transforms the space
so that XOR becomes linearly separable!
```

### What Each Layer Learns

```
Layer 1 (Input → Hidden):
    - Learns to create "features" from raw inputs
    - Different neurons respond to different patterns
    - Creates a new representation of the data

Layer 2 (Hidden → Output):
    - Combines features from Layer 1
    - Makes final decision
    - Simple linear classifier in the transformed space
```

### Visualization of Learned Decision Boundary

```python
import matplotlib.pyplot as plt

def visualize_decision_boundary(nn, X, y):
    """Plot the decision boundary learned by the network"""
    # Create grid
    xx, yy = np.meshgrid(np.linspace(-0.5, 1.5, 100),
                         np.linspace(-0.5, 1.5, 100))
    grid = np.c_[xx.ravel(), yy.ravel()]
    
    # Get predictions
    Z = nn.forward(grid).reshape(xx.shape)
    
    # Plot
    plt.figure(figsize=(8, 6))
    plt.contourf(xx, yy, Z, levels=20, cmap='RdBu', alpha=0.7)
    plt.colorbar(label='Prediction')
    
    # Plot data points
    for i in range(len(X)):
        color = 'red' if y[i] == 0 else 'blue'
        plt.scatter(X[i, 0], X[i, 1], c=color, s=200, edgecolors='black')
        plt.annotate(f'({X[i,0]},{X[i,1]})→{y[i,0]}', 
                    (X[i, 0] + 0.05, X[i, 1] + 0.1))
    
    plt.xlabel('x₁')
    plt.ylabel('x₂')
    plt.title('XOR Decision Boundary')
    plt.savefig('xor_decision_boundary.png')
    plt.show()

# After training
visualize_decision_boundary(nn, X, y)
```

---

## 📝 Section 7: Homework

### Easy
1. Implement AND and OR gates using a perceptron
2. What happens if you use no activation function?
3. Calculate the output of sigmoid(2) and relu(-3)

### Medium
4. Implement tanh activation and its derivative
5. Build a network with 3 hidden layers for XOR
6. Explain why XOR needs at least one hidden layer

### Advanced
7. Implement batch normalization from scratch
8. Add momentum to the training loop
9. Implement L2 regularization

---

## ⚠️ Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Wrong matrix shapes | Crashes | Print shapes at each step |
| No activation function | Can't learn non-linear patterns | Add ReLU/sigmoid |
| Learning rate too high | Loss explodes | Start with 0.001, increase gradually |
| Learning rate too low | Training too slow | Increase or use adaptive optimizer |
| Not normalizing inputs | Slow/unstable training | Scale inputs to ~[0,1] or standardize |
| Forgetting bias | Limited expressiveness | Always include bias terms |

---

## 🎤 Interview Questions

### Beginner

**Q1: What is the purpose of a hidden layer?**
> Hidden layers transform the input data into new representations that make the problem easier to solve. They learn features automatically.

**Q2: Why do we need activation functions?**
> Without activation functions, multiple layers collapse into a single linear transformation. Non-linear activations allow networks to learn complex patterns.

**Q3: What is ReLU and why is it popular?**
> ReLU(z) = max(0, z). It's computationally efficient, reduces vanishing gradient problem, and leads to sparse activations.

### Intermediate

**Q4: Explain the vanishing gradient problem.**
> In deep networks with sigmoid/tanh, gradients become very small when propagated through many layers (each multiplication by derivative < 1). This makes early layers learn very slowly.

**Q5: What is Xavier/He initialization?**
> Initialization schemes that scale weights based on layer size:
> - Xavier: Var(w) = 1/n_in (for tanh/sigmoid)
> - He: Var(w) = 2/n_in (for ReLU)
> Prevents gradients from exploding/vanishing at initialization.

### Advanced/FAANG

**Q6: Compare batch norm, layer norm, and instance norm.**
> - **Batch Norm:** Normalize across batch dimension. Good for CNNs, depends on batch size.
> - **Layer Norm:** Normalize across feature dimension. Good for RNNs/Transformers, batch-independent.
> - **Instance Norm:** Normalize each sample's each channel. Good for style transfer.

**Q7: How would you debug a neural network that's not learning?**
> 1. Check data: Is it correctly loaded? Labels correct?
> 2. Check gradients: Are they flowing? Print gradient magnitudes.
> 3. Simplify: Can it overfit one batch?
> 4. Reduce learning rate: Start very small.
> 5. Check architecture: Too deep? Wrong activation?
> 6. Visualize: Plot loss curve, predictions, activations.

---

## ✅ Chapter Summary

| Concept | Key Takeaway |
|---------|--------------|
| Perceptron | Single neuron: z = w·x + b, then activation |
| Activation | Adds non-linearity (ReLU is default) |
| Forward Prop | Input → (weight × input + bias → activation) × n → output |
| Hidden Layers | Transform data into learnable representations |
| XOR Problem | Shows why we need hidden layers |

---

## 🔜 Next Up

Continue to → [04-Gradient-Descent-Optimization.md](./04-Gradient-Descent-Optimization.md)

We'll learn HOW networks learn:
- Loss functions
- Backpropagation in detail
- Gradient descent variants
- Modern optimizers (Adam, SGD)

*Forward propagation makes predictions. Backpropagation makes them better!* 📈
