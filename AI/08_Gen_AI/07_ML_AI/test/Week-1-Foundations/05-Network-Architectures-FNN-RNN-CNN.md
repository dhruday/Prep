# 05 - Network Architectures: FNN, RNN, CNN

---

## 📌 Table of Contents

1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
   - [Feedforward Neural Networks (FNN)](#51-feedforward-neural-networks-fnn)
   - [Convolutional Neural Networks (CNN)](#52-convolutional-neural-networks-cnn)
   - [Recurrent Neural Networks (RNN)](#53-recurrent-neural-networks-rnn)
3. [Key Formulas](#-key-formulas-summary)
4. [Visual Mental Models](#-visual-mental-models)
5. [Real World Use Cases](#-real-world-use-cases)
6. [Mini Projects](#-mini-projects)
7. [Homework](#-homework)
8. [Common Mistakes](#-common-mistakes)
9. [Interview Questions & Answers](#-interview-questions--answers)

---

## 🌱 Beginner Friendly Explanation

### The Three Musketeers of Deep Learning

Think of neural network architectures as specialized tools:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEURAL NETWORK ARCHITECTURES                  │
├─────────────────┬─────────────────────┬─────────────────────────┤
│       FNN       │        CNN          │          RNN            │
│   (Feedforward) │   (Convolutional)   │      (Recurrent)        │
├─────────────────┼─────────────────────┼─────────────────────────┤
│   📊 Tables     │    🖼️ Images        │    📝 Sequences         │
│   General ML    │    Vision           │    Text, Time Series    │
├─────────────────┼─────────────────────┼─────────────────────────┤
│  "I process     │  "I see patterns    │  "I remember what       │
│   data points"  │   in space"         │   came before"          │
└─────────────────┴─────────────────────┴─────────────────────────┘
```

### Simple Analogies

**FNN (Feedforward)** = Assembly Line
```
Raw Material → Station 1 → Station 2 → Station 3 → Finished Product
    Input    →  Layer 1  →  Layer 2  →  Layer 3  →    Output

Information flows ONE direction only. No looking back.
```

**CNN (Convolutional)** = Detective with Magnifying Glass
```
🔍 Scans image piece by piece
   ┌───┐
   │ 🔍│ → "I see an edge here"
   └───┘
   
   Combines small patterns into bigger patterns:
   Edges → Shapes → Parts → Objects
   
   "This collection of edges forms an eye... 
    two eyes + nose + mouth = FACE!"
```

**RNN (Recurrent)** = Person Reading a Book
```
📖 Reading word by word, remembering context

   "The cat sat on the ___"
                         ↑
   Based on memory of previous words,
   I predict: "mat" or "chair"
   
   Each word depends on what came before.
```

### When to Use Each?

```
DATA TYPE                     BEST ARCHITECTURE
─────────────────────────────────────────────────
Tabular data (spreadsheets)   → FNN
Images, videos                → CNN
Text, speech, time series     → RNN (or Transformer)
Structured data               → FNN
Spatial patterns              → CNN
Sequential patterns           → RNN
```

---

## 🔬 Deep Technical Breakdown

---

# 5.1 Feedforward Neural Networks (FNN)

## What is an FNN?

The **simplest** and most fundamental neural network architecture. Information flows in ONE direction: input → hidden layers → output.

```
INPUT          HIDDEN LAYER 1      HIDDEN LAYER 2      OUTPUT
  ○                  ○                   ○                ○
  │╲               ╱│╲                 ╱│╲              ╱│
  ○─○─────────────○──○─────────────────○──○────────────○─○
  │╱               ╲│╱                 ╲│╱              ╲│
  ○                  ○                   ○                ○

Features        Pattern Detection    Combinations      Prediction
```

**Also called:**
- Multi-Layer Perceptron (MLP)
- Dense Neural Network
- Fully Connected Network

## Architecture Components

### Fully Connected (Dense) Layers

Every neuron connects to EVERY neuron in the next layer.

```python
import numpy as np

class DenseLayer:
    def __init__(self, input_size, output_size, activation='relu'):
        # He initialization
        self.W = np.random.randn(output_size, input_size) * np.sqrt(2/input_size)
        self.b = np.zeros((output_size, 1))
        self.activation = activation
    
    def forward(self, X):
        """X shape: (input_size, batch_size)"""
        self.X = X
        self.Z = self.W @ X + self.b
        
        if self.activation == 'relu':
            self.A = np.maximum(0, self.Z)
        elif self.activation == 'sigmoid':
            self.A = 1 / (1 + np.exp(-self.Z))
        elif self.activation == 'softmax':
            exp_Z = np.exp(self.Z - np.max(self.Z, axis=0, keepdims=True))
            self.A = exp_Z / np.sum(exp_Z, axis=0, keepdims=True)
        else:  # linear
            self.A = self.Z
        
        return self.A
    
    def backward(self, dA, learning_rate):
        """Backpropagation"""
        m = self.X.shape[1]
        
        # Activation gradient
        if self.activation == 'relu':
            dZ = dA * (self.Z > 0)
        elif self.activation == 'sigmoid':
            dZ = dA * self.A * (1 - self.A)
        else:
            dZ = dA
        
        # Parameter gradients
        dW = (1/m) * dZ @ self.X.T
        db = (1/m) * np.sum(dZ, axis=1, keepdims=True)
        dX = self.W.T @ dZ
        
        # Update
        self.W -= learning_rate * dW
        self.b -= learning_rate * db
        
        return dX
```

### Complete FNN Implementation

```python
class FeedforwardNetwork:
    def __init__(self, layer_sizes, activations=None):
        """
        layer_sizes: [input, hidden1, hidden2, ..., output]
        activations: ['relu', 'relu', ..., 'softmax']
        """
        self.layers = []
        
        if activations is None:
            activations = ['relu'] * (len(layer_sizes) - 2) + ['softmax']
        
        for i in range(len(layer_sizes) - 1):
            self.layers.append(
                DenseLayer(layer_sizes[i], layer_sizes[i+1], activations[i])
            )
    
    def forward(self, X):
        """Forward pass through all layers"""
        current = X
        for layer in self.layers:
            current = layer.forward(current)
        return current
    
    def backward(self, y_true, learning_rate):
        """Backward pass (assuming softmax + cross-entropy)"""
        # Output layer gradient (softmax + CE combined)
        dA = self.layers[-1].A - y_true
        
        # Backpropagate
        for layer in reversed(self.layers):
            dA = layer.backward(dA, learning_rate)
    
    def train(self, X, y, epochs, batch_size, learning_rate):
        """Training loop"""
        n_samples = X.shape[1]
        
        for epoch in range(epochs):
            # Shuffle
            indices = np.random.permutation(n_samples)
            X_shuffled = X[:, indices]
            y_shuffled = y[:, indices]
            
            epoch_loss = 0
            for i in range(0, n_samples, batch_size):
                X_batch = X_shuffled[:, i:i+batch_size]
                y_batch = y_shuffled[:, i:i+batch_size]
                
                # Forward
                y_pred = self.forward(X_batch)
                
                # Loss
                loss = -np.mean(np.sum(y_batch * np.log(y_pred + 1e-15), axis=0))
                epoch_loss += loss
                
                # Backward
                self.backward(y_batch, learning_rate)
            
            if epoch % 100 == 0:
                print(f"Epoch {epoch}: Loss = {epoch_loss / (n_samples // batch_size):.4f}")


# Example: MNIST-like classification
np.random.seed(42)

# Create synthetic data (1000 samples, 784 features, 10 classes)
X = np.random.randn(784, 1000)
y_labels = np.random.randint(0, 10, 1000)
y = np.eye(10)[y_labels].T  # One-hot encode

# Create and train network
fnn = FeedforwardNetwork([784, 256, 128, 10])
fnn.train(X, y, epochs=500, batch_size=32, learning_rate=0.01)
```

## FNN Design Patterns

### Width vs Depth

```
WIDE NETWORK:                    DEEP NETWORK:
───────────────                  ────────────────
○───────────○                    ○──○
│ ○○○○○○○○○ │                    │  │
│ ○○○○○○○○○ │                    │  ○──○
○───────────○                    │     │
                                 │     ○──○
Fewer layers, more neurons       │        │
Good for simpler patterns        ○────────○
                                 
                                 More layers, fewer neurons
                                 Good for complex hierarchies
```

### Common Architectures

```python
# Classification (MNIST)
fnn_mnist = FeedforwardNetwork([784, 512, 256, 10])

# Binary classification
fnn_binary = FeedforwardNetwork([100, 64, 32, 1], 
                                 activations=['relu', 'relu', 'sigmoid'])

# Regression
fnn_regression = FeedforwardNetwork([50, 128, 64, 1],
                                     activations=['relu', 'relu', 'linear'])

# Deep network with dropout (conceptual)
# Input(100) → Dense(256) → Dropout(0.3) → Dense(128) → Dropout(0.3) → Output(10)
```

---

# 5.2 Convolutional Neural Networks (CNN)

## The Problem with FNNs for Images

```
Image: 224 × 224 × 3 = 150,528 pixels

FNN approach:
- Flatten to 150,528 inputs
- First layer (1000 neurons): 150,528 × 1000 = 150 MILLION weights!
- Loses spatial structure (neighbor relationships)
- No translation invariance (cat in corner ≠ cat in center)

PROBLEMS:
❌ Too many parameters (overfitting)
❌ Loses spatial information
❌ Not translation invariant
```

## How CNNs Solve This

```
CNN PHILOSOPHY:
1. LOCAL CONNECTIVITY: Each neuron only sees a small region (receptive field)
2. WEIGHT SHARING: Same filter used across entire image
3. HIERARCHY: Build complex patterns from simple ones

    Image        Edges       Shapes      Parts       Objects
    ┌───┐       ┌───┐       ┌───┐       ┌───┐       ┌───┐
    │   │  →    │ / │  →    │ ◠ │  →    │ 👁 │  →    │ 😺│
    │   │       │ \ │       │ ◡ │       │ 👃 │       │   │
    └───┘       └───┘       └───┘       └───┘       └───┘
```

## Convolution Operation

### What is Convolution?

```
INPUT IMAGE (5×5)          FILTER/KERNEL (3×3)         OUTPUT (3×3)
┌───┬───┬───┬───┬───┐      ┌───┬───┬───┐              ┌───┬───┬───┐
│ 1 │ 2 │ 3 │ 0 │ 1 │      │ 1 │ 0 │ 1 │              │ 8 │ 6 │ 4 │
├───┼───┼───┼───┼───┤      ├───┼───┼───┤       →      ├───┼───┼───┤
│ 0 │ 1 │ 2 │ 3 │ 0 │      │ 0 │ 1 │ 0 │              │ 5 │ 7 │ 6 │
├───┼───┼───┼───┼───┤      ├───┼───┼───┤              ├───┼───┼───┤
│ 1 │ 0 │ 1 │ 2 │ 1 │  ✱   │ 1 │ 0 │ 1 │              │ 3 │ 5 │ 6 │
├───┼───┼───┼───┼───┤      └───┴───┴───┘              └───┴───┴───┘
│ 2 │ 1 │ 0 │ 1 │ 0 │
├───┼───┼───┼───┼───┤      
│ 0 │ 1 │ 2 │ 0 │ 1 │
└───┴───┴───┴───┴───┘

First output: 1×1 + 2×0 + 3×1 + 0×0 + 1×1 + 2×0 + 1×1 + 0×0 + 1×1 = 8
```

### Convolution Implementation

```python
import numpy as np

def convolve2d(image, kernel, stride=1, padding=0):
    """
    2D Convolution operation
    
    image: (H, W) or (H, W, C)
    kernel: (kH, kW)
    """
    # Add padding
    if padding > 0:
        image = np.pad(image, ((padding, padding), (padding, padding)), mode='constant')
    
    H, W = image.shape[:2]
    kH, kW = kernel.shape
    
    # Output dimensions
    out_H = (H - kH) // stride + 1
    out_W = (W - kW) // stride + 1
    
    output = np.zeros((out_H, out_W))
    
    for i in range(out_H):
        for j in range(out_W):
            # Extract patch
            patch = image[i*stride:i*stride+kH, j*stride:j*stride+kW]
            # Element-wise multiply and sum
            output[i, j] = np.sum(patch * kernel)
    
    return output


# Example: Edge detection
image = np.array([
    [10, 10, 10, 0, 0, 0],
    [10, 10, 10, 0, 0, 0],
    [10, 10, 10, 0, 0, 0],
    [10, 10, 10, 0, 0, 0],
    [10, 10, 10, 0, 0, 0],
    [10, 10, 10, 0, 0, 0],
])

# Vertical edge detector
vertical_edge_kernel = np.array([
    [-1, 0, 1],
    [-1, 0, 1],
    [-1, 0, 1]
])

edges = convolve2d(image, vertical_edge_kernel)
print("Detected edges:\n", edges)
```

### Common Filters

```
VERTICAL EDGE:        HORIZONTAL EDGE:      SOBEL (Vertical):
┌────┬────┬────┐      ┌────┬────┬────┐      ┌────┬────┬────┐
│ -1 │  0 │  1 │      │ -1 │ -1 │ -1 │      │ -1 │  0 │  1 │
├────┼────┼────┤      ├────┼────┼────┤      ├────┼────┼────┤
│ -1 │  0 │  1 │      │  0 │  0 │  0 │      │ -2 │  0 │  2 │
├────┼────┼────┤      ├────┼────┼────┤      ├────┼────┼────┤
│ -1 │  0 │  1 │      │  1 │  1 │  1 │      │ -1 │  0 │  1 │
└────┴────┴────┘      └────┴────┴────┘      └────┴────┴────┘

SHARPEN:              BLUR (Average):       GAUSSIAN BLUR:
┌────┬────┬────┐      ┌────┬────┬────┐      ┌────┬────┬────┐
│  0 │ -1 │  0 │      │1/9 │1/9 │1/9 │      │1/16│2/16│1/16│
├────┼────┼────┤      ├────┼────┼────┤      ├────┼────┼────┤
│ -1 │  5 │ -1 │      │1/9 │1/9 │1/9 │      │2/16│4/16│2/16│
├────┼────┼────┤      ├────┼────┼────┤      ├────┼────┼────┤
│  0 │ -1 │  0 │      │1/9 │1/9 │1/9 │      │1/16│2/16│1/16│
└────┴────┴────┘      └────┴────┴────┘      └────┴────┴────┘
```

## CNN Building Blocks

### 1. Convolutional Layer

```python
class Conv2D:
    def __init__(self, in_channels, out_channels, kernel_size, stride=1, padding=0):
        self.stride = stride
        self.padding = padding
        
        # Initialize filters (out_channels filters, each in_channels × kernel × kernel)
        self.W = np.random.randn(out_channels, in_channels, kernel_size, kernel_size) * 0.1
        self.b = np.zeros((out_channels, 1, 1))
    
    def forward(self, X):
        """
        X: (batch, in_channels, H, W)
        Output: (batch, out_channels, H', W')
        """
        self.X = X
        batch_size, in_ch, H, W = X.shape
        out_ch, _, kH, kW = self.W.shape
        
        # Add padding
        if self.padding > 0:
            X = np.pad(X, ((0,0), (0,0), (self.padding, self.padding), 
                          (self.padding, self.padding)), mode='constant')
        
        # Output dimensions
        H_out = (H + 2*self.padding - kH) // self.stride + 1
        W_out = (W + 2*self.padding - kW) // self.stride + 1
        
        output = np.zeros((batch_size, out_ch, H_out, W_out))
        
        # Convolution (naive implementation)
        for b in range(batch_size):
            for oc in range(out_ch):
                for i in range(H_out):
                    for j in range(W_out):
                        h_start = i * self.stride
                        w_start = j * self.stride
                        patch = X[b, :, h_start:h_start+kH, w_start:w_start+kW]
                        output[b, oc, i, j] = np.sum(patch * self.W[oc]) + self.b[oc]
        
        return output
```

### 2. Pooling Layer

**Reduces spatial dimensions while keeping important features**

```
MAX POOLING (2×2, stride 2):

┌───┬───┬───┬───┐         ┌───┬───┐
│ 1 │ 3 │ 2 │ 1 │         │ 4 │ 6 │
├───┼───┼───┼───┤    →    ├───┼───┤
│ 4 │ 2 │ 6 │ 5 │         │ 8 │ 9 │
├───┼───┼───┼───┤         └───┴───┘
│ 5 │ 1 │ 8 │ 3 │
├───┼───┼───┼───┤         Takes MAX from each 2×2 region
│ 2 │ 8 │ 3 │ 9 │
└───┴───┴───┴───┘

AVERAGE POOLING: Takes AVERAGE instead of MAX
```

```python
class MaxPool2D:
    def __init__(self, pool_size=2, stride=2):
        self.pool_size = pool_size
        self.stride = stride
    
    def forward(self, X):
        """X: (batch, channels, H, W)"""
        batch, channels, H, W = X.shape
        
        H_out = (H - self.pool_size) // self.stride + 1
        W_out = (W - self.pool_size) // self.stride + 1
        
        output = np.zeros((batch, channels, H_out, W_out))
        
        for i in range(H_out):
            for j in range(W_out):
                h_start = i * self.stride
                w_start = j * self.stride
                patch = X[:, :, h_start:h_start+self.pool_size, 
                          w_start:w_start+self.pool_size]
                output[:, :, i, j] = np.max(patch, axis=(2, 3))
        
        return output
```

### 3. Flatten Layer

```python
class Flatten:
    def forward(self, X):
        """(batch, channels, H, W) → (batch, channels*H*W)"""
        self.original_shape = X.shape
        return X.reshape(X.shape[0], -1)
    
    def backward(self, dout):
        return dout.reshape(self.original_shape)
```

## Classic CNN Architectures

### LeNet-5 (1998)

```
INPUT: 32×32×1 (grayscale)

Conv(6, 5×5) → Pool(2×2) → Conv(16, 5×5) → Pool(2×2) → FC(120) → FC(84) → FC(10)
  28×28×6       14×14×6      10×10×16       5×5×16       120       84      10

Total params: ~60K
```

### VGGNet (2014)

```
Philosophy: Small filters (3×3), deep network

INPUT: 224×224×3

Block 1: Conv(64)×2 → MaxPool
Block 2: Conv(128)×2 → MaxPool
Block 3: Conv(256)×3 → MaxPool
Block 4: Conv(512)×3 → MaxPool
Block 5: Conv(512)×3 → MaxPool
FC(4096) → FC(4096) → FC(1000)

Total params: ~138M
```

### ResNet (2015) - Skip Connections

```
PROBLEM: Very deep networks are hard to train (vanishing gradients)

SOLUTION: Skip connections (residual connections)

    x ────────────────┐
    │                 │
    ▼                 │
┌─────────┐          │
│ Conv    │          │
│ BatchNorm│          │
│ ReLU    │          │    Identity shortcut
├─────────┤          │
│ Conv    │          │
│ BatchNorm│          │
└────┬────┘          │
     │               │
     ▼               │
    (+) ◄────────────┘
     │
     ▼
   ReLU

Output = F(x) + x    (learn the residual)
```

```python
class ResidualBlock:
    def __init__(self, in_channels, out_channels):
        self.conv1 = Conv2D(in_channels, out_channels, 3, padding=1)
        self.bn1 = BatchNorm2D(out_channels)
        self.conv2 = Conv2D(out_channels, out_channels, 3, padding=1)
        self.bn2 = BatchNorm2D(out_channels)
        
        # Skip connection (if dimensions change)
        self.shortcut = None
        if in_channels != out_channels:
            self.shortcut = Conv2D(in_channels, out_channels, 1)
    
    def forward(self, x):
        identity = x
        
        out = self.conv1.forward(x)
        out = self.bn1.forward(out)
        out = np.maximum(0, out)  # ReLU
        
        out = self.conv2.forward(out)
        out = self.bn2.forward(out)
        
        # Skip connection
        if self.shortcut:
            identity = self.shortcut.forward(x)
        
        out = out + identity  # ADD the skip connection
        out = np.maximum(0, out)  # ReLU
        
        return out
```

---

# 5.3 Recurrent Neural Networks (RNN)

## The Problem with FNN/CNN for Sequences

```
Sequence data has VARIABLE length and ORDER matters:

Text:    "The cat sat on the mat"  (6 words)
         "I love machine learning" (4 words)

Time series: Stock prices over 100 days, 50 days, 200 days...

FNN Problem:
- Fixed input size (can't handle variable length)
- Treats inputs independently (ignores order)
- "cat sat" vs "sat cat" would be the same!
```

## How RNNs Solve This

```
RNN PHILOSOPHY:
1. Process ONE element at a time
2. Maintain "memory" (hidden state) of what came before
3. Use SAME weights at each time step (weight sharing)

    "The"        "cat"        "sat"        "on"
      │            │            │            │
      ▼            ▼            ▼            ▼
   ┌─────┐     ┌─────┐      ┌─────┐      ┌─────┐
   │ RNN │────▶│ RNN │────▶ │ RNN │────▶ │ RNN │────▶ ...
   └─────┘     └─────┘      └─────┘      └─────┘
      │            │            │            │
      ▼            ▼            ▼            ▼
     h₀           h₁           h₂           h₃
   (initial)   (remembers    (remembers   (remembers
               "The")       "The cat")   "The cat sat")
```

## Basic RNN Cell

### Mathematics

```
At each time step t:

hₜ = tanh(Wₕₕ × hₜ₋₁ + Wₓₕ × xₜ + bₕ)

yₜ = Wₕᵧ × hₜ + bᵧ

Where:
  xₜ = input at time t
  hₜ = hidden state at time t
  yₜ = output at time t
  Wₕₕ = hidden-to-hidden weights
  Wₓₕ = input-to-hidden weights
  Wₕᵧ = hidden-to-output weights
```

### Implementation

```python
class RNNCell:
    def __init__(self, input_size, hidden_size):
        self.hidden_size = hidden_size
        
        # Initialize weights
        self.Wxh = np.random.randn(hidden_size, input_size) * 0.01
        self.Whh = np.random.randn(hidden_size, hidden_size) * 0.01
        self.bh = np.zeros((hidden_size, 1))
    
    def forward(self, x, h_prev):
        """
        x: (input_size, 1) - input at current timestep
        h_prev: (hidden_size, 1) - previous hidden state
        """
        # Compute new hidden state
        h_new = np.tanh(self.Wxh @ x + self.Whh @ h_prev + self.bh)
        return h_new


class RNN:
    def __init__(self, input_size, hidden_size, output_size):
        self.hidden_size = hidden_size
        self.cell = RNNCell(input_size, hidden_size)
        
        # Output layer
        self.Why = np.random.randn(output_size, hidden_size) * 0.01
        self.by = np.zeros((output_size, 1))
    
    def forward(self, X, h0=None):
        """
        X: (seq_len, input_size, batch_size)
        Returns: outputs at each timestep, final hidden state
        """
        seq_len = X.shape[0]
        batch_size = X.shape[2] if len(X.shape) > 2 else 1
        
        if h0 is None:
            h = np.zeros((self.hidden_size, batch_size))
        else:
            h = h0
        
        outputs = []
        hidden_states = [h]
        
        for t in range(seq_len):
            x_t = X[t]
            h = self.cell.forward(x_t, h)
            hidden_states.append(h)
            
            # Output
            y_t = self.Why @ h + self.by
            outputs.append(y_t)
        
        return np.array(outputs), hidden_states


# Example: Character-level language model
vocab_size = 26  # a-z
hidden_size = 128
seq_length = 10

rnn = RNN(vocab_size, hidden_size, vocab_size)

# Forward pass with random input
X = np.random.randn(seq_length, vocab_size, 1)  # 10 timesteps
outputs, hidden = rnn.forward(X)
print(f"Output shape: {outputs.shape}")  # (10, 26, 1)
```

## The Vanishing/Exploding Gradient Problem

```
RNN backpropagation through time:

Gradient at t=0 depends on:
  ∂L/∂h₀ = ∂L/∂hₜ × ∂hₜ/∂hₜ₋₁ × ... × ∂h₁/∂h₀
         = ∂L/∂hₜ × (Wₕₕ × tanh')^T

If T is large and |Wₕₕ × tanh'| < 1:
  Gradient → 0 (VANISHING)

If |Wₕₕ × tanh'| > 1:
  Gradient → ∞ (EXPLODING)

PROBLEM: Can't learn long-term dependencies!
```

## LSTM (Long Short-Term Memory)

### The Solution: Gates

```
LSTM has THREE gates that control information flow:

┌─────────────────────────────────────────────────────────────┐
│                         LSTM Cell                            │
│                                                              │
│   cₜ₋₁ ──────────────────(×)────────(+)─────────────▶ cₜ    │
│                           ↑          ↑                       │
│                    [Forget Gate] [Input Gate × Candidate]    │
│                           │          │                       │
│   hₜ₋₁ ──┬───────────────┼──────────┼───────────────▶       │
│          │               │          │                        │
│          │    ┌──────────┴──────────┴──────────┐            │
│          └───▶│    fₜ        iₜ        g̃ₜ      │            │
│               │  (forget)  (input)  (candidate) │            │
│               │            │                    │            │
│          xₜ ──┴────────────┴────────────────────┘            │
│                                                              │
│   Output:  hₜ = oₜ × tanh(cₜ)                               │
│                  ↑                                           │
│            [Output Gate]                                     │
└─────────────────────────────────────────────────────────────┘

FORGET GATE (fₜ): What to forget from cell state
INPUT GATE (iₜ): What new info to add
OUTPUT GATE (oₜ): What to output from cell state
```

### LSTM Equations

```
Forget gate:    fₜ = σ(Wf × [hₜ₋₁, xₜ] + bf)
Input gate:     iₜ = σ(Wi × [hₜ₋₁, xₜ] + bi)
Candidate:      g̃ₜ = tanh(Wg × [hₜ₋₁, xₜ] + bg)
Output gate:    oₜ = σ(Wo × [hₜ₋₁, xₜ] + bo)

Cell state:     cₜ = fₜ ⊙ cₜ₋₁ + iₜ ⊙ g̃ₜ
Hidden state:   hₜ = oₜ ⊙ tanh(cₜ)

Where ⊙ = element-wise multiplication
```

### LSTM Implementation

```python
class LSTMCell:
    def __init__(self, input_size, hidden_size):
        self.hidden_size = hidden_size
        combined_size = input_size + hidden_size
        
        # Gates weights (all gates use same input [h, x])
        self.Wf = np.random.randn(hidden_size, combined_size) * 0.01  # Forget
        self.Wi = np.random.randn(hidden_size, combined_size) * 0.01  # Input
        self.Wg = np.random.randn(hidden_size, combined_size) * 0.01  # Candidate
        self.Wo = np.random.randn(hidden_size, combined_size) * 0.01  # Output
        
        self.bf = np.zeros((hidden_size, 1))
        self.bi = np.zeros((hidden_size, 1))
        self.bg = np.zeros((hidden_size, 1))
        self.bo = np.zeros((hidden_size, 1))
    
    def sigmoid(self, x):
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))
    
    def forward(self, x, h_prev, c_prev):
        """
        x: (input_size, batch)
        h_prev: (hidden_size, batch)
        c_prev: (hidden_size, batch)
        """
        # Concatenate input and previous hidden state
        combined = np.vstack([h_prev, x])  # (input+hidden, batch)
        
        # Gates
        f = self.sigmoid(self.Wf @ combined + self.bf)  # Forget gate
        i = self.sigmoid(self.Wi @ combined + self.bi)  # Input gate
        g = np.tanh(self.Wg @ combined + self.bg)       # Candidate
        o = self.sigmoid(self.Wo @ combined + self.bo)  # Output gate
        
        # Cell state update
        c_new = f * c_prev + i * g
        
        # Hidden state
        h_new = o * np.tanh(c_new)
        
        return h_new, c_new


class LSTM:
    def __init__(self, input_size, hidden_size, output_size):
        self.hidden_size = hidden_size
        self.cell = LSTMCell(input_size, hidden_size)
        
        # Output layer
        self.Wy = np.random.randn(output_size, hidden_size) * 0.01
        self.by = np.zeros((output_size, 1))
    
    def forward(self, X, h0=None, c0=None):
        """Process sequence"""
        seq_len = X.shape[0]
        batch_size = X.shape[2] if len(X.shape) > 2 else 1
        
        h = h0 if h0 is not None else np.zeros((self.hidden_size, batch_size))
        c = c0 if c0 is not None else np.zeros((self.hidden_size, batch_size))
        
        outputs = []
        
        for t in range(seq_len):
            x_t = X[t]
            h, c = self.cell.forward(x_t, h, c)
            y_t = self.Wy @ h + self.by
            outputs.append(y_t)
        
        return np.array(outputs), h, c
```

## GRU (Gated Recurrent Unit)

**Simpler than LSTM (fewer parameters), often similar performance**

```
GRU has TWO gates:

Reset gate (rₜ):  How much past info to forget
Update gate (zₜ): How much to update hidden state

Equations:
  rₜ = σ(Wr × [hₜ₋₁, xₜ])
  zₜ = σ(Wz × [hₜ₋₁, xₜ])
  h̃ₜ = tanh(W × [rₜ ⊙ hₜ₋₁, xₜ])
  hₜ = (1 - zₜ) ⊙ hₜ₋₁ + zₜ ⊙ h̃ₜ
```

```python
class GRUCell:
    def __init__(self, input_size, hidden_size):
        self.hidden_size = hidden_size
        combined_size = input_size + hidden_size
        
        self.Wz = np.random.randn(hidden_size, combined_size) * 0.01  # Update
        self.Wr = np.random.randn(hidden_size, combined_size) * 0.01  # Reset
        self.Wh = np.random.randn(hidden_size, combined_size) * 0.01  # Candidate
        
        self.bz = np.zeros((hidden_size, 1))
        self.br = np.zeros((hidden_size, 1))
        self.bh = np.zeros((hidden_size, 1))
    
    def sigmoid(self, x):
        return 1 / (1 + np.exp(-np.clip(x, -500, 500)))
    
    def forward(self, x, h_prev):
        combined = np.vstack([h_prev, x])
        
        z = self.sigmoid(self.Wz @ combined + self.bz)  # Update gate
        r = self.sigmoid(self.Wr @ combined + self.br)  # Reset gate
        
        combined_reset = np.vstack([r * h_prev, x])
        h_candidate = np.tanh(self.Wh @ combined_reset + self.bh)
        
        h_new = (1 - z) * h_prev + z * h_candidate
        
        return h_new
```

## Bidirectional RNN

```
Process sequence in BOTH directions:

Forward:  "The" → "cat" → "sat" → "on"
                                    ↓
                              Combine
                                    ↑
Backward: "The" ← "cat" ← "sat" ← "on"

Useful when you have access to entire sequence (not real-time)
```

---

## 📐 Key Formulas Summary

### FNN
```
Layer output: a = f(Wx + b)
```

### CNN
```
Convolution: (I * K)[i,j] = ΣₘΣₙ I[i+m, j+n] × K[m,n]
Output size: (W - K + 2P)/S + 1
```

### RNN
```
Basic RNN: hₜ = tanh(Wₓₕxₜ + Wₕₕhₜ₋₁ + b)

LSTM:
  fₜ = σ(Wf[hₜ₋₁, xₜ] + bf)
  iₜ = σ(Wi[hₜ₋₁, xₜ] + bi)
  cₜ = fₜ⊙cₜ₋₁ + iₜ⊙tanh(Wc[hₜ₋₁, xₜ] + bc)
  hₜ = σ(Wo[hₜ₋₁, xₜ] + bo) ⊙ tanh(cₜ)
```

---

## 🎨 Visual Mental Models

### Model 1: Architecture Selection Flowchart

```
                    What's your data?
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
     📊 Tabular      🖼️ Spatial       📝 Sequential
    (spreadsheet)    (images)         (text/time)
          │               │               │
          ▼               ▼               ▼
        FNN            CNN              RNN
    (Dense layers)  (Conv layers)   (Recurrent)
                                         │
                                    ┌────┴────┐
                                    │         │
                                   LSTM      GRU
                                (complex)  (simpler)
```

### Model 2: CNN as Feature Hierarchy

```
Layer 1:  Edges           ─ │ ╱ ╲
             ↓
Layer 2:  Textures        ╔═╗ ░░░ ▒▒▒
             ↓
Layer 3:  Parts           👁 👃 👂
             ↓
Layer 4:  Objects         😺 🐕 🚗
             ↓
Output:   Classification  "Cat"
```

### Model 3: RNN Memory Types

```
BASIC RNN:   Short-term memory (forgets quickly)
             ●───●───●───●───●  ... (info fades)
             
LSTM:        Long AND short-term memory
             ═══════════════════  Cell state (highway)
             ●───●───●───●───●  Hidden state (local)
             
             Can remember across 100s of timesteps!
```

---

## 🌍 Real World Use Cases

| Architecture | Use Cases |
|--------------|-----------|
| **FNN** | Tabular data, recommendation systems, simple classification |
| **CNN** | Image classification, object detection, medical imaging, video analysis |
| **RNN/LSTM** | Language modeling, translation, speech recognition, time series |
| **CNN + RNN** | Image captioning, video understanding, lip reading |

---

## 🛠 Mini Projects

### Project 1: CNN for MNIST

```python
import numpy as np

# Simplified CNN for MNIST (conceptual)
class SimpleCNN:
    def __init__(self):
        # Conv layer: 1 input channel, 8 output channels, 3x3 kernel
        self.conv1 = Conv2D(1, 8, 3, padding=1)
        self.pool1 = MaxPool2D(2, 2)
        
        # Conv layer: 8 input channels, 16 output channels
        self.conv2 = Conv2D(8, 16, 3, padding=1)
        self.pool2 = MaxPool2D(2, 2)
        
        # After 28x28 → 14x14 → 7x7 with 16 channels = 784 features
        self.fc1 = DenseLayer(7*7*16, 128, 'relu')
        self.fc2 = DenseLayer(128, 10, 'softmax')
    
    def forward(self, x):
        # x: (batch, 1, 28, 28)
        x = self.conv1.forward(x)
        x = np.maximum(0, x)  # ReLU
        x = self.pool1.forward(x)
        
        x = self.conv2.forward(x)
        x = np.maximum(0, x)  # ReLU
        x = self.pool2.forward(x)
        
        # Flatten: (batch, 16, 7, 7) → (batch, 784)
        x = x.reshape(x.shape[0], -1).T
        
        x = self.fc1.forward(x)
        x = self.fc2.forward(x)
        
        return x

# Usage
cnn = SimpleCNN()
# X: (batch, 1, 28, 28) - MNIST images
# output = cnn.forward(X)
```

### Project 2: Character-Level RNN

```python
class CharRNN:
    """Character-level language model"""
    
    def __init__(self, vocab_size, hidden_size):
        self.vocab_size = vocab_size
        self.hidden_size = hidden_size
        
        # RNN layers
        self.lstm = LSTM(vocab_size, hidden_size, vocab_size)
    
    def forward(self, X, h=None, c=None):
        return self.lstm.forward(X, h, c)
    
    def generate(self, seed_char, length, char_to_idx, idx_to_char, temperature=1.0):
        """Generate text character by character"""
        h = np.zeros((self.hidden_size, 1))
        c = np.zeros((self.hidden_size, 1))
        
        generated = seed_char
        current_char = seed_char
        
        for _ in range(length):
            # One-hot encode current character
            x = np.zeros((self.vocab_size, 1))
            x[char_to_idx[current_char]] = 1
            
            # Forward pass
            output, h, c = self.forward(x.reshape(1, -1, 1), h, c)
            
            # Sample from output distribution
            probs = self.softmax(output[0, :, 0] / temperature)
            idx = np.random.choice(len(probs), p=probs)
            
            current_char = idx_to_char[idx]
            generated += current_char
        
        return generated
    
    def softmax(self, x):
        exp_x = np.exp(x - np.max(x))
        return exp_x / np.sum(exp_x)


# Example usage
text = "hello world"
chars = sorted(list(set(text)))
char_to_idx = {c: i for i, c in enumerate(chars)}
idx_to_char = {i: c for i, c in enumerate(chars)}

rnn = CharRNN(len(chars), 64)
# Train on text sequences...
# Then generate:
# generated = rnn.generate('h', 50, char_to_idx, idx_to_char)
```

---

## 📝 Homework

### Level 1: Easy

1. **Explain** when you would use FNN vs CNN vs RNN.

2. **Calculate** the output size of a convolution:
   - Input: 32×32
   - Kernel: 5×5
   - Stride: 1
   - Padding: 2

3. **What problem** does LSTM solve that basic RNN can't?

### Level 2: Medium

4. **Implement** a simple convolution operation (without using libraries).

5. **Calculate** the number of parameters in:
   - Conv2D(3, 64, kernel_size=3)
   - Dense(1024, 512)

6. **Implement** basic RNN forward pass for sequence classification.

### Level 3: Advanced

7. **Implement** max pooling with backpropagation.

8. **Build** a CNN from scratch for MNIST (achieve >95% accuracy).

9. **Implement** LSTM cell with backpropagation through time.

### Level 4: Expert

10. **Implement** a ResNet block with skip connections.

11. **Build** a bidirectional LSTM for sentiment analysis.

12. **Compare** LSTM vs GRU on a sequence task (implement both).

---

## ⚠️ Common Mistakes

### Mistake 1: Wrong Input Shape for CNN

```python
# WRONG - missing channel dimension
X = np.array([28, 28])  # Just height, width

# CORRECT - (batch, channels, height, width)
X = np.zeros((32, 1, 28, 28))  # 32 grayscale 28×28 images
```

### Mistake 2: Forgetting to Reset RNN State

```python
# WRONG - hidden state carries over between batches
for batch in batches:
    output, h = rnn.forward(batch, h)  # h not reset!

# CORRECT - reset for each sequence
for batch in batches:
    h = np.zeros((hidden_size, batch_size))
    output, h = rnn.forward(batch, h)
```

### Mistake 3: Using RNN for Image Data

```python
# WRONG - RNN for images
image_rnn = RNN(784, 128, 10)  # Flattened image

# CORRECT - CNN for images
image_cnn = CNN([1, 32, 64], [784, 128, 10])
```

### Mistake 4: Too Many Pooling Layers

```python
# WRONG - aggressive pooling destroys spatial info
x = pool(pool(pool(pool(x))))  # 224→112→56→28→14

# CORRECT - balance pooling with convolutions
x = conv(pool(conv(pool(conv(x)))))
```

---

## 🎤 Interview Questions & Answers

### Beginner Level

**Q1: What is the difference between FNN, CNN, and RNN?**

**A**:
- **FNN**: Data flows one direction, no memory, good for tabular data
- **CNN**: Uses convolutions for spatial patterns, weight sharing, good for images
- **RNN**: Has loops/memory, processes sequences, good for text/time series

**Key differences**:
| Aspect | FNN | CNN | RNN |
|--------|-----|-----|-----|
| Input | Fixed size | Grid (images) | Sequences |
| Memory | No | No | Yes |
| Weight sharing | No | Yes (filters) | Yes (time) |

---

**Q2: What is convolution in CNNs?**

**A**: Convolution is sliding a small filter (kernel) over an image, computing element-wise multiplication and sum at each position.

**Key properties**:
1. **Local connectivity**: Each output only depends on a small region
2. **Weight sharing**: Same filter used everywhere
3. **Translation invariance**: Detects features regardless of position

This reduces parameters dramatically compared to fully connected layers.

---

**Q3: Why do RNNs have vanishing gradients?**

**A**: During backpropagation through time, gradients are multiplied by the same weight matrix repeatedly:

```
∂L/∂h₀ = ∂L/∂hₜ × (Wₕₕ)ᵗ
```

If eigenvalues of Wₕₕ < 1: gradients → 0 (vanishing)
If eigenvalues of Wₕₕ > 1: gradients → ∞ (exploding)

**Solutions**: LSTM/GRU gates, gradient clipping, proper initialization.

---

### Intermediate Level

**Q4: Explain the purpose of each gate in LSTM.**

**A**:

1. **Forget Gate (fₜ)**: Decides what to remove from cell state
   - "Should I forget that the subject was singular?"
   - σ(Wf[h, x]) → values 0-1

2. **Input Gate (iₜ)**: Decides what new info to add
   - "Should I add that we're now talking about plural?"
   - σ(Wi[h, x]) → values 0-1

3. **Output Gate (oₜ)**: Decides what to output
   - "What's relevant for the next word prediction?"
   - σ(Wo[h, x]) → values 0-1

The **cell state** acts as a "highway" carrying information across timesteps with minimal transformation.

---

**Q5: What are skip connections and why are they important?**

**A**: Skip connections add the input of a block directly to its output:

```
output = F(x) + x
```

**Benefits**:
1. **Gradient flow**: Gradients can flow directly through skip connections
2. **Easier optimization**: Network can learn identity mapping if needed
3. **Enables very deep networks**: ResNet has 152+ layers!

**Why it works**: Instead of learning H(x), learn residual F(x) = H(x) - x. If optimal is close to identity, F(x) ≈ 0 is easier to learn.

---

**Q6: How do you choose CNN architecture hyperparameters?**

**A**:

**Filter size**:
- 3×3 is standard (VGG showed small is better)
- 1×1 for channel reduction (bottleneck)
- Larger (5×5, 7×7) only for first layer

**Number of filters**:
- Start small (32-64), double after each pooling
- Pattern: 64 → 128 → 256 → 512

**Pooling**:
- 2×2 with stride 2 is standard
- Reduces spatial dimensions by half
- Max pooling more common than average

**Depth**:
- Deeper = more capacity but harder to train
- Use skip connections for >20 layers

---

### Advanced Level

**Q7: Derive the backpropagation equations for a basic RNN.**

**A**:

Forward: hₜ = tanh(Wxh·xₜ + Whh·hₜ₋₁ + bh)

**Backward (BPTT)**:

For single timestep:
```
∂L/∂Whh = Σₜ ∂L/∂hₜ × ∂hₜ/∂Whh

∂hₜ/∂Whh = (1 - hₜ²) × hₜ₋₁ᵀ  (tanh derivative)

∂L/∂hₜ₋₁ = Whhᵀ × (1 - hₜ²) × ∂L/∂hₜ  (backprop to previous)
```

For full sequence:
```
∂L/∂h₀ = Πₜ [Whhᵀ × diag(1 - hₜ²)] × ∂L/∂hₜ
```

This product of matrices causes vanishing/exploding gradients.

---

**Q8: Compare the computational complexity of CNN vs RNN.**

**A**:

**CNN**:
- Forward: O(K² × C_in × C_out × H × W) per layer
- Highly parallelizable (all positions computed simultaneously)
- GPU-friendly

**RNN**:
- Forward: O(H² × T) where H=hidden size, T=sequence length
- Sequential (each step depends on previous)
- Harder to parallelize

**Practical implications**:
- CNNs scale well with GPUs
- RNNs are bottlenecked by sequence length
- This led to Transformers (parallel attention over sequences)

---

### FAANG Level

**Q9: Design a neural network for video classification.**

**A**: Video = sequence of images = combines CNN + RNN concepts

**Architecture options**:

1. **CNN + LSTM**:
   ```
   Video frames → CNN (per frame) → Frame features → LSTM → Classification
   ```
   - Extract spatial features with CNN
   - Model temporal dynamics with LSTM

2. **3D CNN**:
   ```
   Video (T×H×W×C) → 3D Conv layers → Classification
   ```
   - Convolve in space AND time
   - Captures motion directly

3. **Two-Stream**:
   ```
   RGB frames → CNN (spatial) ─┐
                               ├→ Fusion → Classification
   Optical flow → CNN (motion)─┘
   ```
   - Separate processing for appearance and motion

4. **Transformer-based** (modern):
   ```
   Frames → Patches → Linear embedding → Transformer → Classification
   ```
   - ViT adapted for video (ViViT, TimeSformer)

**Considerations**:
- Memory constraints (videos are large)
- Temporal resolution (how many frames?)
- Real-time requirements

---

**Q10: Implement attention mechanism for sequence-to-sequence models.**

**A**:

```python
class Attention:
    """Bahdanau (additive) attention mechanism"""
    
    def __init__(self, hidden_size):
        self.hidden_size = hidden_size
        
        # Attention weights
        self.Wa = np.random.randn(hidden_size, hidden_size) * 0.01
        self.Ua = np.random.randn(hidden_size, hidden_size) * 0.01
        self.va = np.random.randn(hidden_size, 1) * 0.01
    
    def forward(self, decoder_hidden, encoder_outputs):
        """
        decoder_hidden: (hidden_size, 1) - current decoder state
        encoder_outputs: (seq_len, hidden_size) - all encoder states
        
        Returns:
        context: (hidden_size, 1) - weighted sum of encoder outputs
        attention_weights: (seq_len, 1) - attention distribution
        """
        seq_len = encoder_outputs.shape[0]
        
        # Score each encoder output
        scores = np.zeros((seq_len, 1))
        for i in range(seq_len):
            encoder_state = encoder_outputs[i:i+1].T  # (hidden_size, 1)
            
            # Additive attention score
            # score = vᵀ × tanh(Wa×decoder + Ua×encoder)
            combined = np.tanh(self.Wa @ decoder_hidden + self.Ua @ encoder_state)
            scores[i] = self.va.T @ combined
        
        # Softmax to get attention weights
        attention_weights = self.softmax(scores)
        
        # Context vector = weighted sum
        context = np.zeros((self.hidden_size, 1))
        for i in range(seq_len):
            context += attention_weights[i] * encoder_outputs[i:i+1].T
        
        return context, attention_weights
    
    def softmax(self, x):
        exp_x = np.exp(x - np.max(x))
        return exp_x / np.sum(exp_x)


class Seq2SeqWithAttention:
    """Sequence-to-sequence model with attention"""
    
    def __init__(self, input_vocab_size, output_vocab_size, hidden_size):
        self.encoder = LSTM(input_vocab_size, hidden_size, hidden_size)
        self.decoder = LSTM(output_vocab_size + hidden_size, hidden_size, output_vocab_size)
        self.attention = Attention(hidden_size)
        self.hidden_size = hidden_size
    
    def forward(self, source, target):
        """
        source: (src_len, input_vocab_size, 1) - source sequence
        target: (tgt_len, output_vocab_size, 1) - target sequence (for training)
        """
        # Encode source sequence
        encoder_outputs, h_enc, c_enc = self.encoder.forward(source)
        encoder_outputs = encoder_outputs[:, :, 0].T  # (seq_len, hidden)
        
        # Decode with attention
        h_dec, c_dec = h_enc, c_enc
        outputs = []
        
        for t in range(target.shape[0]):
            # Attention
            context, attn_weights = self.attention.forward(h_dec, encoder_outputs)
            
            # Concatenate context with input
            decoder_input = np.vstack([target[t], context])
            
            # Decoder step
            output, h_dec, c_dec = self.decoder.forward(
                decoder_input.reshape(1, -1, 1), h_dec, c_dec
            )
            outputs.append(output[0])
        
        return np.array(outputs)
```

**Key insights**:
- Attention allows decoder to "look back" at encoder outputs
- Solves information bottleneck of fixed-size context vector
- Foundation for Transformer architecture (self-attention)

---

## 🔗 What's Next?

**Congratulations! You've completed Week 1: Foundations!** 🎉

In **Week 2: Deep Generative Models**, we'll cover:
- Discriminative vs Generative models
- Autoencoders and Variational Autoencoders (VAE)
- Generative Adversarial Networks (GAN)
- Image generation projects

---

### Week 1 Summary

| File | Topics |
|------|--------|
| 01-Introduction-to-AI | AI/ML/DL overview, types of learning |
| 02-Mathematical-Foundations | Linear algebra, calculus, probability |
| 03-Neural-Networks-Basics | Perceptrons, MLP, activations, loss functions |
| 04-Gradient-Descent-and-Optimization | SGD variants, Adam, backpropagation |
| 05-Network-Architectures | FNN, CNN, RNN, LSTM |

---

**Type CONTINUE to proceed with Week 2: `Week-2-Generative-Models/01-Discriminative-vs-Generative-Models.md`**
