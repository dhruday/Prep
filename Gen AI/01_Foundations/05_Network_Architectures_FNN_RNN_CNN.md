# 📘 Section 1: Foundations of Artificial Intelligence

## Chapter 5: Neural Network Architectures (Feedforward, RNN, CNN)

---

## 🎯 Introduction: Different Problems Need Different Architectures

**Why This Topic Exists:**

You now know:
- What neural networks are
- How they learn (backpropagation)
- How to optimize them (gradient descent, Adam, etc.)

But there's a problem: **not all data is the same**.

- **Tabular data** (spreadsheets): rows and columns of numbers
- **Images**: 2D grids of pixels with spatial relationships
- **Text/Speech**: sequences where order matters
- **Time series**: data that changes over time

A single architecture can't handle all these efficiently. We need **specialized architectures** designed for different data types.

**What You'll Learn:**

1. **Feedforward Networks (FNN)** - The basic architecture
2. **Convolutional Networks (CNN)** - For images and spatial data
3. **Recurrent Networks (RNN)** - For sequences and time series
4. When to use each architecture
5. How to implement them

**The Big Picture:**

```
Data Type          → Best Architecture → Use Case
─────────────────────────────────────────────────
Tabular data       → FNN                Regression, simple classification
Images             → CNN                Computer vision, image recognition
Sequences/Text     → RNN/LSTM           NLP, time series prediction
Audio/Video        → CNN + RNN          Speech recognition, video analysis
```

Let's explore each!

---

## 📘 Part 1: Feedforward Neural Networks (FNN)

### The Foundation Architecture

**Purpose (Why this exists):**

Feedforward networks are the **simplest and most general** neural network architecture. They're called "feedforward" because information flows in one direction: input → hidden layers → output (no loops).

**What it is:**

A feedforward neural network consists of:
1. **Input layer**: Receives raw features
2. **Hidden layers**: Process information (can be multiple)
3. **Output layer**: Produces predictions
4. **Fully connected layers**: Every neuron connects to every neuron in the next layer

**Architecture Diagram (described):**

```
Input Layer (3 neurons)
     ○  ○  ○
     │\/│\/│\    ← Fully connected
     │/\│/\│/       (every input connects to every hidden neuron)
     ○  ○  ○  ○
Hidden Layer 1 (4 neurons)
     │\/│\/│\/│\
     │/\│/\│/\│/
     ○  ○  ○
Hidden Layer 2 (3 neurons)
     │\ │ /│
     │ \│/ │
       ○  ○
Output Layer (2 neurons)
```

**How it works (Information Flow):**

```javascript
// Conceptual forward pass
function feedforward(input, weights, biases) {
    let activation = input;
    
    // Pass through each layer
    for (let layer = 0; layer < weights.length; layer++) {
        // Linear transformation: z = W*a + b
        const z = matrixMultiply(weights[layer], activation) 
                  .add(biases[layer]);
        
        // Non-linear activation
        activation = relu(z);  // Or sigmoid, tanh, etc.
    }
    
    return activation;  // Final output
}
```

**Python Implementation:**

```python
import numpy as np

class FeedforwardNetwork:
    def __init__(self, layer_sizes):
        """
        layer_sizes: list of integers defining network structure
        Example: [784, 128, 64, 10] 
                 → Input: 784, Hidden: 128, 64, Output: 10
        """
        self.num_layers = len(layer_sizes)
        self.layer_sizes = layer_sizes
        
        # Initialize weights and biases
        self.weights = []
        self.biases = []
        
        for i in range(len(layer_sizes) - 1):
            # He initialization for ReLU
            w = np.random.randn(layer_sizes[i], layer_sizes[i+1]) * np.sqrt(2.0 / layer_sizes[i])
            b = np.zeros((1, layer_sizes[i+1]))
            
            self.weights.append(w)
            self.biases.append(b)
    
    def relu(self, z):
        return np.maximum(0, z)
    
    def softmax(self, z):
        exp_z = np.exp(z - np.max(z, axis=1, keepdims=True))
        return exp_z / np.sum(exp_z, axis=1, keepdims=True)
    
    def forward(self, X):
        """
        Forward pass through the network
        X: input data (batch_size, input_size)
        """
        self.activations = [X]  # Store for backprop
        self.zs = []  # Store pre-activation values
        
        activation = X
        
        # Pass through all layers
        for i in range(len(self.weights) - 1):
            z = np.dot(activation, self.weights[i]) + self.biases[i]
            self.zs.append(z)
            activation = self.relu(z)
            self.activations.append(activation)
        
        # Output layer (no activation or softmax)
        z = np.dot(activation, self.weights[-1]) + self.biases[-1]
        self.zs.append(z)
        activation = self.softmax(z)  # For classification
        self.activations.append(activation)
        
        return activation
    
    def predict(self, X):
        """Make predictions"""
        output = self.forward(X)
        return np.argmax(output, axis=1)

# Example usage
# Create network for MNIST: 784 inputs → 128 hidden → 64 hidden → 10 outputs
model = FeedforwardNetwork([784, 128, 64, 10])

# Forward pass (dummy data)
X = np.random.randn(32, 784)  # Batch of 32 images
predictions = model.forward(X)
print(f"Output shape: {predictions.shape}")  # (32, 10)
```

**JavaScript Implementation:**

```javascript
class FeedforwardNetwork {
    constructor(layerSizes) {
        this.layerSizes = layerSizes;
        this.weights = [];
        this.biases = [];
        
        // Initialize weights and biases
        for (let i = 0; i < layerSizes.length - 1; i++) {
            const inputSize = layerSizes[i];
            const outputSize = layerSizes[i + 1];
            
            // He initialization
            const w = this.randomMatrix(inputSize, outputSize, 
                                       Math.sqrt(2.0 / inputSize));
            const b = new Array(outputSize).fill(0);
            
            this.weights.push(w);
            this.biases.push(b);
        }
    }
    
    randomMatrix(rows, cols, scale) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                // Box-Muller transform for normal distribution
                const u1 = Math.random();
                const u2 = Math.random();
                const rand = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                row.push(rand * scale);
            }
            matrix.push(row);
        }
        return matrix;
    }
    
    relu(x) {
        return x.map(val => Math.max(0, val));
    }
    
    matrixVectorMultiply(matrix, vector) {
        return matrix.map(row => 
            row.reduce((sum, val, i) => sum + val * vector[i], 0)
        );
    }
    
    addVectors(a, b) {
        return a.map((val, i) => val + b[i]);
    }
    
    forward(input) {
        let activation = input;
        
        // Pass through hidden layers
        for (let i = 0; i < this.weights.length - 1; i++) {
            const z = this.addVectors(
                this.matrixVectorMultiply(this.weights[i], activation),
                this.biases[i]
            );
            activation = this.relu(z);
        }
        
        // Output layer
        const finalZ = this.addVectors(
            this.matrixVectorMultiply(this.weights[this.weights.length - 1], activation),
            this.biases[this.biases.length - 1]
        );
        
        return this.softmax(finalZ);
    }
    
    softmax(z) {
        const max = Math.max(...z);
        const exps = z.map(val => Math.exp(val - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(val => val / sum);
    }
}

// Example usage
const model = new FeedforwardNetwork([10, 8, 4, 2]);
const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const output = model.forward(input);
console.log("Output probabilities:", output);
```

---

### When to Use Feedforward Networks

**Best For:**
- ✅ Tabular data (structured data with fixed features)
- ✅ Simple classification tasks
- ✅ Regression problems
- ✅ When you don't need spatial or temporal understanding

**Examples:**
- Predicting house prices (features: size, location, bedrooms)
- Credit scoring (features: income, credit history, age)
- Medical diagnosis from test results
- Customer churn prediction

**Not Great For:**
- ❌ Images (too many parameters, doesn't exploit spatial structure)
- ❌ Text/sequences (can't handle variable length, no memory)
- ❌ Time series (doesn't model temporal dependencies)

---

### Limitations of Feedforward Networks

**Problem 1: Too Many Parameters for Images**

```
Example: 224×224 RGB image
Pixels: 224 × 224 × 3 = 150,528 input features

If first hidden layer has 1000 neurons:
Parameters: 150,528 × 1000 = 150 million weights (just first layer!)

This is:
- Memory intensive
- Prone to overfitting
- Doesn't exploit spatial structure
```

**Solution:** CNNs (coming next!)

**Problem 2: Can't Handle Variable Length Inputs**

```javascript
// FNN expects fixed input size
const model = new FeedforwardNetwork([100, 50, 10]);  // Expects 100 features

// These won't work:
model.forward([1, 2, 3]);        // Only 3 features!
model.forward([...150 features]) // Too many features!

// Every input must be exactly 100 features
```

**Solution:** RNNs can handle variable length!

**Problem 3: No Memory**

```
FNN processes each input independently:
- Sentence 1: "The cat sat on the mat" → Output
- Sentence 2: "The dog ran" → Output

Each sentence is processed fresh, no context from previous sentences.
Can't understand: "He was happy" (who is "he"?)
```

**Solution:** RNNs have memory!

---

## 📘 Part 2: Convolutional Neural Networks (CNN)

### Designed for Spatial Data

**Purpose (Why this exists):**

Images have special properties:
1. **Spatial structure**: Nearby pixels are related
2. **Local patterns**: Edges, textures, shapes
3. **Translation invariance**: A cat is a cat whether it's in the corner or center
4. **Hierarchical features**: Edges → Textures → Parts → Objects

Feedforward networks ignore all of this! CNNs are specifically designed to exploit these properties.

**What it is:**

CNNs use **convolution operations** instead of full connections. Instead of every neuron connecting to every input, neurons only look at **local regions** (called receptive fields).

**Key Components:**

1. **Convolutional Layers**: Detect local patterns
2. **Pooling Layers**: Reduce spatial size, add translation invariance
3. **Fully Connected Layers**: Final classification

---

### The Convolution Operation

**Intuition:**

Imagine sliding a small window (filter/kernel) across an image. At each position, you compute a weighted sum of the pixels in that window.

**Visual Description:**

```
Input Image (5×5):
┌─────────────┐
│ 1  2  3  0  1│
│ 0  1  2  1  0│
│ 2  1  0  1  2│
│ 1  0  1  2  0│
│ 0  2  1  0  1│
└─────────────┘

Filter/Kernel (3×3):
┌─────────┐
│ 1  0 -1│  ← Detects vertical edges
│ 1  0 -1│
│ 1  0 -1│
└─────────┘

Convolution Process:
1. Place filter on top-left of image
2. Element-wise multiply
3. Sum all results → one output value
4. Slide filter one step to the right
5. Repeat

Output Feature Map (3×3):
┌─────────┐
│ a  b  c│
│ d  e  f│
│ g  h  i│
└─────────┘
```

**Mathematical Formula:**

```
Output[i,j] = Σ Σ Input[i+m, j+n] × Filter[m, n]
              m n

Where:
- (i,j) is the position in output
- (m,n) iterates over filter size
```

**Step-by-Step Example:**

```
Input (top-left 3×3 region):
┌─────────┐
│ 1  2  3│
│ 0  1  2│
│ 2  1  0│
└─────────┘

Filter:
┌─────────┐
│ 1  0 -1│
│ 1  0 -1│
│ 1  0 -1│
└─────────┘

Computation:
(1×1) + (2×0) + (3×-1) +
(0×1) + (1×0) + (2×-1) +
(2×1) + (1×0) + (0×-1)

= 1 + 0 - 3 + 0 + 0 - 2 + 2 + 0 + 0
= -2

This is the first value in the output feature map!
```

**JavaScript Implementation:**

```javascript
class ConvLayer {
    constructor(filterSize, numFilters) {
        this.filterSize = filterSize;
        this.numFilters = numFilters;
        
        // Initialize random filters
        this.filters = [];
        for (let i = 0; i < numFilters; i++) {
            const filter = [];
            for (let r = 0; r < filterSize; r++) {
                const row = [];
                for (let c = 0; c < filterSize; c++) {
                    row.push(Math.random() * 0.2 - 0.1);  // Small random values
                }
                filter.push(row);
            }
            this.filters.push(filter);
        }
    }
    
    convolve2D(input, filter) {
        const inputHeight = input.length;
        const inputWidth = input[0].length;
        const filterSize = filter.length;
        
        const outputHeight = inputHeight - filterSize + 1;
        const outputWidth = inputWidth - filterSize + 1;
        
        const output = [];
        
        // Slide filter across input
        for (let i = 0; i < outputHeight; i++) {
            const outputRow = [];
            for (let j = 0; j < outputWidth; j++) {
                // Compute convolution at position (i, j)
                let sum = 0;
                for (let fi = 0; fi < filterSize; fi++) {
                    for (let fj = 0; fj < filterSize; fj++) {
                        sum += input[i + fi][j + fj] * filter[fi][fj];
                    }
                }
                outputRow.push(sum);
            }
            output.push(outputRow);
        }
        
        return output;
    }
    
    forward(input) {
        // Apply each filter to input
        const featureMaps = [];
        for (let filter of this.filters) {
            const featureMap = this.convolve2D(input, filter);
            featureMaps.push(featureMap);
        }
        return featureMaps;
    }
}

// Example usage
const convLayer = new ConvLayer(3, 2);  // 3×3 filters, 2 filters

const input = [
    [1, 2, 3, 0, 1],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [1, 0, 1, 2, 0],
    [0, 2, 1, 0, 1]
];

const featureMaps = convLayer.forward(input);
console.log("Number of feature maps:", featureMaps.length);
console.log("Feature map size:", featureMaps[0].length, "×", featureMaps[0][0].length);
```

**Python Implementation:**

```python
import numpy as np

class ConvLayer:
    def __init__(self, num_filters, filter_size):
        self.num_filters = num_filters
        self.filter_size = filter_size
        
        # Initialize filters (He initialization)
        self.filters = np.random.randn(num_filters, filter_size, filter_size) * np.sqrt(2.0 / (filter_size * filter_size))
        self.biases = np.zeros(num_filters)
    
    def convolve2d(self, input, filter):
        """
        Perform 2D convolution
        """
        input_h, input_w = input.shape
        filter_h, filter_w = filter.shape
        
        output_h = input_h - filter_h + 1
        output_w = input_w - filter_w + 1
        
        output = np.zeros((output_h, output_w))
        
        for i in range(output_h):
            for j in range(output_w):
                # Extract region
                region = input[i:i+filter_h, j:j+filter_w]
                # Element-wise multiply and sum
                output[i, j] = np.sum(region * filter)
        
        return output
    
    def forward(self, input):
        """
        Forward pass
        input: (height, width) or (height, width, channels)
        """
        if len(input.shape) == 2:
            input = input[:, :, np.newaxis]
        
        h, w, c = input.shape
        
        output = []
        
        # Apply each filter
        for i in range(self.num_filters):
            feature_map = np.zeros((h - self.filter_size + 1, 
                                   w - self.filter_size + 1))
            
            # Convolve across all input channels
            for channel in range(c):
                feature_map += self.convolve2d(input[:, :, channel], 
                                              self.filters[i])
            
            # Add bias
            feature_map += self.biases[i]
            
            # Apply ReLU
            feature_map = np.maximum(0, feature_map)
            
            output.append(feature_map)
        
        return np.stack(output, axis=-1)

# Example usage
conv = ConvLayer(num_filters=8, filter_size=3)

# Input: 28×28 grayscale image
input_image = np.random.randn(28, 28)

# Forward pass
output = conv.forward(input_image)
print(f"Input shape: {input_image.shape}")
print(f"Output shape: {output.shape}")  # (26, 26, 8)
```

---

### Why Convolution Works

**1. Local Connectivity:**

```
Instead of:
Each neuron connected to ALL 784 pixels (MNIST)
→ 784 × num_neurons parameters

With convolution:
Each neuron connected to 3×3 = 9 pixels
→ 9 × num_filters parameters

Massive reduction in parameters!
```

**2. Parameter Sharing:**

```
Traditional: Each neuron has unique weights
Convolution: Same filter slides across entire image

Example:
- 28×28 image
- Without sharing: Need 26×26 = 676 different 3×3 filters
- With sharing: Need just 1 filter, reused 676 times!
```

**3. Translation Invariance:**

```
Same filter detects the same feature anywhere in the image

Example: Edge detector
┌─────┐          ┌─────┐
│  |  │ detects  │  |  │  whether edge is
│  |  │  edges   │  |  │  left, right, or center
└─────┘          └─────┘
```

---

### Pooling Layers

**Purpose (Why this exists):**

After convolution, feature maps are still quite large. Pooling:
1. Reduces spatial dimensions (fewer parameters)
2. Adds translation invariance
3. Captures most important features

**Types of Pooling:**

### Max Pooling (Most Common)

**What it does:**
Take the maximum value in each region.

**Visual:**

```
Input (4×4):
┌────────────┐
│ 1  3  2  4│
│ 5  6  1  2│
│ 3  2  8  7│
│ 1  4  5  9│
└────────────┘

Max Pooling (2×2, stride 2):
┌─────┐
│ 6  4│  ← Top-left: max(1,3,5,6)=6, Top-right: max(2,4,1,2)=4
│ 4  9│  ← Bottom-left: max(3,2,1,4)=4, Bottom-right: max(8,7,5,9)=9
└─────┘

Result: 4×4 → 2×2 (reduced by half in each dimension)
```

**JavaScript Implementation:**

```javascript
class MaxPooling {
    constructor(poolSize = 2, stride = 2) {
        this.poolSize = poolSize;
        this.stride = stride;
    }
    
    forward(input) {
        const height = input.length;
        const width = input[0].length;
        
        const outHeight = Math.floor((height - this.poolSize) / this.stride) + 1;
        const outWidth = Math.floor((width - this.poolSize) / this.stride) + 1;
        
        const output = [];
        
        for (let i = 0; i < outHeight; i++) {
            const row = [];
            for (let j = 0; j < outWidth; j++) {
                // Find max in pooling window
                let max = -Infinity;
                for (let pi = 0; pi < this.poolSize; pi++) {
                    for (let pj = 0; pj < this.poolSize; pj++) {
                        const val = input[i * this.stride + pi][j * this.stride + pj];
                        max = Math.max(max, val);
                    }
                }
                row.push(max);
            }
            output.push(row);
        }
        
        return output;
    }
}

// Example
const pool = new MaxPooling(2, 2);
const input = [
    [1, 3, 2, 4],
    [5, 6, 1, 2],
    [3, 2, 8, 7],
    [1, 4, 5, 9]
];

const output = pool.forward(input);
console.log("Pooled output:", output);
// [[6, 4], [4, 9]]
```

**Python Implementation:**

```python
import numpy as np

class MaxPooling:
    def __init__(self, pool_size=2, stride=2):
        self.pool_size = pool_size
        self.stride = stride
    
    def forward(self, input):
        """
        input: (height, width) or (height, width, channels)
        """
        if len(input.shape) == 2:
            input = input[:, :, np.newaxis]
        
        h, w, c = input.shape
        
        out_h = (h - self.pool_size) // self.stride + 1
        out_w = (w - self.pool_size) // self.stride + 1
        
        output = np.zeros((out_h, out_w, c))
        
        for i in range(out_h):
            for j in range(out_w):
                h_start = i * self.stride
                h_end = h_start + self.pool_size
                w_start = j * self.stride
                w_end = w_start + self.pool_size
                
                # Max over pooling window for each channel
                window = input[h_start:h_end, w_start:w_end, :]
                output[i, j, :] = np.max(window, axis=(0, 1))
        
        if c == 1:
            output = output[:, :, 0]
        
        return output

# Example
pool = MaxPooling(pool_size=2, stride=2)
input = np.array([[1, 3, 2, 4],
                  [5, 6, 1, 2],
                  [3, 2, 8, 7],
                  [1, 4, 5, 9]], dtype=float)

output = pool.forward(input)
print("Pooled output:")
print(output)
```

### Average Pooling

**What it does:**
Take the average value in each region.

```
Input (4×4):
┌────────────┐
│ 1  3  2  4│
│ 5  6  1  2│
│ 3  2  8  7│
│ 1  4  5  9│
└────────────┘

Average Pooling (2×2):
┌─────────┐
│ 3.75 2.25│  ← Top-left: (1+3+5+6)/4=3.75
│ 2.5  7.25│
└─────────┘
```

**When to use:**
- Max pooling: Most common, preserves strongest features
- Average pooling: Sometimes used in later layers

---

### Complete CNN Architecture

**Typical Structure:**

```
Input Image
    ↓
Conv Layer 1 (multiple filters) → ReLU → Max Pool
    ↓
Conv Layer 2 (more filters) → ReLU → Max Pool
    ↓
Conv Layer 3 → ReLU → Max Pool
    ↓
Flatten (convert 2D to 1D)
    ↓
Fully Connected Layer → ReLU
    ↓
Fully Connected Layer → ReLU
    ↓
Output Layer → Softmax
```

**Example: MNIST Classifier**

```python
import torch
import torch.nn as nn

class CNN_MNIST(nn.Module):
    def __init__(self):
        super(CNN_MNIST, self).__init__()
        
        # Convolutional layers
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)  # 28×28×1 → 28×28×32
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1) # 14×14×32 → 14×14×64
        
        # Pooling layer
        self.pool = nn.MaxPool2d(2, 2)  # 2×2 pooling
        
        # Fully connected layers
        self.fc1 = nn.Linear(64 * 7 * 7, 128)  # After 2 poolings: 28→14→7
        self.fc2 = nn.Linear(128, 10)
        
        # Activation
        self.relu = nn.ReLU()
        
    def forward(self, x):
        # Conv block 1: Conv → ReLU → Pool
        x = self.conv1(x)      # (batch, 1, 28, 28) → (batch, 32, 28, 28)
        x = self.relu(x)
        x = self.pool(x)       # (batch, 32, 28, 28) → (batch, 32, 14, 14)
        
        # Conv block 2: Conv → ReLU → Pool
        x = self.conv2(x)      # (batch, 32, 14, 14) → (batch, 64, 14, 14)
        x = self.relu(x)
        x = self.pool(x)       # (batch, 64, 14, 14) → (batch, 64, 7, 7)
        
        # Flatten
        x = x.view(-1, 64 * 7 * 7)  # (batch, 64, 7, 7) → (batch, 3136)
        
        # Fully connected layers
        x = self.fc1(x)        # (batch, 3136) → (batch, 128)
        x = self.relu(x)
        x = self.fc2(x)        # (batch, 128) → (batch, 10)
        
        return x

# Create model
model = CNN_MNIST()
print(model)

# Test with dummy input
dummy_input = torch.randn(1, 1, 28, 28)  # Batch=1, Channels=1, Height=28, Width=28
output = model(dummy_input)
print(f"Output shape: {output.shape}")  # (1, 10)
```

---

### When to Use CNNs

**Best For:**
- ✅ Images (classification, object detection, segmentation)
- ✅ Any data with spatial structure
- ✅ Pattern recognition tasks
- ✅ Video (3D convolutions)

**Examples:**
- Image classification (cat vs dog)
- Face recognition
- Medical image analysis
- Self-driving cars (detecting objects)
- Style transfer
- Image generation

**Not Great For:**
- ❌ Sequences with long-term dependencies (use RNN)
- ❌ Tabular data (use FNN)
- ❌ Variable-length inputs (use RNN)

---

## 📘 Part 3: Recurrent Neural Networks (RNN)

### Networks with Memory

**Purpose (Why this exists):**

Many real-world problems involve **sequences** where:
1. **Order matters**: "dog bites man" ≠ "man bites dog"
2. **Context is needed**: Understanding "it" requires knowing what came before
3. **Variable length**: Sentences have different lengths

Feedforward networks process each input independently. RNNs maintain **memory** of previous inputs.

**What it is:**

An RNN processes sequences **one element at a time**, maintaining a **hidden state** that captures information about previous elements.

**Architecture (Unrolled in Time):**

```
Time step:      t=0        t=1        t=2        t=3
              ┌───┐      ┌───┐      ┌───┐      ┌───┐
Input:        │ x₀│      │ x₁│      │ x₂│      │ x₃│
              └─┬─┘      └─┬─┘      └─┬─┘      └─┬─┘
                │          │          │          │
              ┌─▼─┐      ┌─▼─┐      ┌─▼─┐      ┌─▼─┐
Hidden:       │ h₀│─────→│ h₁│─────→│ h₂│─────→│ h₃│
              └─┬─┘      └─┬─┘      └─┬─┘      └─┬─┘
                │          │          │          │
Output:       │ y₀│      │ y₁│      │ y₂│      │ y₃│
              └───┘      └───┘      └───┘      └───┘

Key: Each hidden state (h) depends on:
     - Current input (x)
     - Previous hidden state (h from t-1)
```

**How it works (Math):**

```
At each time step t:
h_t = tanh(W_hh × h_{t-1} + W_xh × x_t + b_h)
y_t = W_hy × h_t + b_y

Where:
- h_t: hidden state at time t
- x_t: input at time t
- y_t: output at time t
- W_hh: hidden-to-hidden weights (memory)
- W_xh: input-to-hidden weights
- W_hy: hidden-to-output weights
```

**Intuition:**

Think of reading a sentence word by word:
```
Sentence: "The cat sat on the mat"

Read "The"     → Remember: subject coming
Read "cat"     → Remember: cat is the subject
Read "sat"     → Remember: cat performed action
Read "on"      → Remember: location coming
Read "the"     → Remember: specific location
Read "mat"     → Understand: cat is on a mat

At each word, you update your understanding based on:
- Current word
- Everything you've read so far (hidden state)
```

**JavaScript Implementation:**

```javascript
class SimpleRNN {
    constructor(inputSize, hiddenSize, outputSize) {
        this.hiddenSize = hiddenSize;
        
        // Initialize weights (small random values)
        this.Wxh = this.randomMatrix(inputSize, hiddenSize, 0.01);
        this.Whh = this.randomMatrix(hiddenSize, hiddenSize, 0.01);
        this.Why = this.randomMatrix(hiddenSize, outputSize, 0.01);
        
        // Biases
        this.bh = new Array(hiddenSize).fill(0);
        this.by = new Array(outputSize).fill(0);
    }
    
    randomMatrix(rows, cols, scale) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                row.push((Math.random() * 2 - 1) * scale);
            }
            matrix.push(row);
        }
        return matrix;
    }
    
    tanh(x) {
        return x.map(val => Math.tanh(val));
    }
    
    matrixVectorMultiply(matrix, vector) {
        return matrix.map(row => 
            row.reduce((sum, val, i) => sum + val * vector[i], 0)
        );
    }
    
    addVectors(a, b) {
        return a.map((val, i) => val + b[i]);
    }
    
    forward(inputs) {
        // inputs: array of input vectors (sequence)
        const outputs = [];
        const hiddenStates = [];
        
        // Initialize hidden state
        let h = new Array(this.hiddenSize).fill(0);
        
        // Process sequence
        for (let t = 0; t < inputs.length; t++) {
            const x = inputs[t];
            
            // h_t = tanh(W_xh * x_t + W_hh * h_{t-1} + b_h)
            const xh = this.matrixVectorMultiply(this.Wxh, x);
            const hh = this.matrixVectorMultiply(this.Whh, h);
            const hRaw = this.addVectors(this.addVectors(xh, hh), this.bh);
            h = this.tanh(hRaw);
            
            hiddenStates.push([...h]);  // Store copy
            
            // y_t = W_hy * h_t + b_y
            const y = this.addVectors(
                this.matrixVectorMultiply(this.Why, h),
                this.by
            );
            
            outputs.push(y);
        }
        
        return { outputs, hiddenStates };
    }
}

// Example: Simple sequence processing
const rnn = new SimpleRNN(5, 10, 3);  // Input=5, Hidden=10, Output=3

// Sequence of 4 time steps
const sequence = [
    [1, 0, 0, 0, 0],  // Time step 0
    [0, 1, 0, 0, 0],  // Time step 1
    [0, 0, 1, 0, 0],  // Time step 2
    [0, 0, 0, 1, 0]   // Time step 3
];

const result = rnn.forward(sequence);
console.log("Number of outputs:", result.outputs.length);
console.log("Output at t=3:", result.outputs[3]);
```

**Python Implementation:**

```python
import numpy as np

class SimpleRNN:
    def __init__(self, input_size, hidden_size, output_size):
        self.hidden_size = hidden_size
        
        # Initialize weights (Xavier initialization)
        self.Wxh = np.random.randn(input_size, hidden_size) * np.sqrt(1.0 / input_size)
        self.Whh = np.random.randn(hidden_size, hidden_size) * np.sqrt(1.0 / hidden_size)
        self.Why = np.random.randn(hidden_size, output_size) * np.sqrt(1.0 / hidden_size)
        
        # Biases
        self.bh = np.zeros(hidden_size)
        self.by = np.zeros(output_size)
    
    def forward(self, inputs):
        """
        inputs: list of input vectors (sequence)
        Returns: outputs and hidden states for each time step
        """
        outputs = []
        hidden_states = []
        
        # Initialize hidden state
        h = np.zeros(self.hidden_size)
        
        # Process sequence
        for x in inputs:
            # h_t = tanh(W_xh * x + W_hh * h_{t-1} + b_h)
            h = np.tanh(np.dot(x, self.Wxh) + np.dot(h, self.Whh) + self.bh)
            hidden_states.append(h.copy())
            
            # y_t = W_hy * h_t + b_y
            y = np.dot(h, self.Why) + self.by
            outputs.append(y)
        
        return outputs, hidden_states

# Example usage
rnn = SimpleRNN(input_size=10, hidden_size=20, output_size=5)

# Sequence of length 7
sequence = [np.random.randn(10) for _ in range(7)]

outputs, hidden_states = rnn.forward(sequence)
print(f"Sequence length: {len(sequence)}")
print(f"Number of outputs: {len(outputs)}")
print(f"Output shape: {outputs[0].shape}")
print(f"Hidden state shape: {hidden_states[0].shape}")
```

---

### PyTorch RNN Example

```python
import torch
import torch.nn as nn

class RNNModel(nn.Module):
    def __init__(self, input_size, hidden_size, output_size, num_layers=1):
        super(RNNModel, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # RNN layer
        self.rnn = nn.RNN(input_size, hidden_size, num_layers, batch_first=True)
        
        # Fully connected output layer
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x, hidden=None):
        """
        x: (batch_size, sequence_length, input_size)
        """
        # Initialize hidden state if not provided
        if hidden is None:
            hidden = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        
        # Forward through RNN
        # out: (batch, seq_len, hidden_size)
        # hidden: (num_layers, batch, hidden_size)
        out, hidden = self.rnn(x, hidden)
        
        # Use output from last time step
        out = self.fc(out[:, -1, :])
        
        return out, hidden

# Example usage
model = RNNModel(input_size=10, hidden_size=20, output_size=5)

# Batch of 4 sequences, each length 7, with 10 features
input_seq = torch.randn(4, 7, 10)

output, hidden = model(input_seq)
print(f"Input shape: {input_seq.shape}")
print(f"Output shape: {output.shape}")  # (4, 5) - one output per sequence
print(f"Hidden shape: {hidden.shape}")  # (1, 4, 20)
```

---

### Problems with Vanilla RNN

**1. Vanishing Gradients**

**The Problem:**

When training with backpropagation through time (BPTT), gradients get multiplied many times:

```
Gradient at t=0 depends on:
gradient_t=10 × W × W × W × W × W × W × W × W × W × W

If W < 1: gradient shrinks exponentially (vanishes)
If W > 1: gradient explodes
```

**Effect:**

```
Sentence: "The cat, which was very fluffy and loved to sleep, ate"

RNN struggles to connect:
- "cat" (t=1) with "ate" (t=12)

Because gradient from "ate" has vanished by the time it reaches "cat"
```

**2. Short-Term Memory**

Vanilla RNNs can only remember recent context (typically 7-10 steps back).

```
Can handle:  "The cat ate" (short dependency)
Struggles:   "The cat that I saw yesterday ate" (medium dependency)
Fails:       Very long sentences with distant dependencies
```

**Solution:** LSTM and GRU (next section!)

---

### LSTM (Long Short-Term Memory)

**Purpose (Why this exists):**

LSTM is designed to solve the vanishing gradient problem and remember long-term dependencies.

**Key Innovation:**

Instead of a simple hidden state, LSTM has:
1. **Cell state** (C): Long-term memory (highway for information)
2. **Hidden state** (h): Short-term memory
3. **Gates**: Control what to remember, forget, and output

**The Three Gates:**

```
1. Forget Gate: What to throw away from cell state
   f_t = σ(W_f × [h_{t-1}, x_t] + b_f)
   
2. Input Gate: What new information to store
   i_t = σ(W_i × [h_{t-1}, x_t] + b_i)
   C̃_t = tanh(W_C × [h_{t-1}, x_t] + b_C)
   
3. Output Gate: What to output
   o_t = σ(W_o × [h_{t-1}, x_t] + b_o)
```

**Visual Intuition:**

```
Previous Cell State (C_{t-1})
        │
        ↓
    ┌───────┐
    │Forget │ ← Forget irrelevant information
    │ Gate  │
    └───┬───┘
        │
    ┌───▼───┐
    │ Input │ ← Add new information
    │ Gate  │
    └───┬───┘
        │
    New Cell State (C_t)
        │
    ┌───▼───┐
    │Output │ ← Decide what to output
    │ Gate  │
    └───┬───┘
        │
    Hidden State (h_t)
```

**PyTorch Implementation:**

```python
import torch
import torch.nn as nn

class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size, output_size, num_layers=1):
        super(LSTMModel, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM layer
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        
        # Output layer
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x, hidden=None):
        """
        x: (batch_size, sequence_length, input_size)
        """
        # Initialize hidden and cell states if not provided
        if hidden is None:
            h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
            c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
            hidden = (h0, c0)
        
        # Forward through LSTM
        # out: (batch, seq_len, hidden_size)
        # hidden: tuple of (h_n, c_n)
        out, hidden = self.lstm(x, hidden)
        
        # Use output from last time step
        out = self.fc(out[:, -1, :])
        
        return out, hidden

# Example: Sentiment analysis
vocab_size = 10000
embedding_dim = 100
hidden_size = 128
output_size = 2  # Positive/Negative

class SentimentLSTM(nn.Module):
    def __init__(self, vocab_size, embedding_dim, hidden_size, output_size):
        super(SentimentLSTM, self).__init__()
        
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        # x: (batch, sequence_length) - word indices
        
        # Embed words
        embedded = self.embedding(x)  # (batch, seq_len, embedding_dim)
        
        # LSTM
        lstm_out, (hidden, cell) = self.lstm(embedded)
        
        # Use final hidden state
        out = self.fc(hidden[-1])  # (batch, output_size)
        
        return out

# Create model
model = SentimentLSTM(vocab_size, embedding_dim, hidden_size, output_size)

# Example input (batch of 4 sentences, each 20 words)
input_sentences = torch.randint(0, vocab_size, (4, 20))

output = model(input_sentences)
print(f"Input shape: {input_sentences.shape}")  # (4, 20)
print(f"Output shape: {output.shape}")  # (4, 2)
```

---

### GRU (Gated Recurrent Unit)

**Purpose (Why this exists):**

GRU is a simpler version of LSTM with fewer parameters, often performs similarly.

**Key Differences from LSTM:**

- Only 2 gates (instead of 3): Update gate and Reset gate
- No separate cell state (combines hidden and cell)
- Fewer parameters → Faster training

**PyTorch Example:**

```python
class GRUModel(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(GRUModel, self).__init__()
        
        self.gru = nn.GRU(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        out, hidden = self.gru(x)
        out = self.fc(out[:, -1, :])  # Use last output
        return out

model = GRUModel(input_size=10, hidden_size=20, output_size=5)
```

**LSTM vs GRU:**

| Aspect | LSTM | GRU |
|--------|------|-----|
| **Gates** | 3 (forget, input, output) | 2 (update, reset) |
| **Parameters** | More | Fewer |
| **Speed** | Slower | Faster |
| **Performance** | Slightly better on complex tasks | Similar on most tasks |
| **When to use** | Complex sequences, when you have lots of data | Faster training, smaller datasets |

---

### When to Use RNNs/LSTMs

**Best For:**
- ✅ Natural Language Processing (text classification, translation)
- ✅ Time series prediction (stock prices, weather)
- ✅ Speech recognition
- ✅ Music generation
- ✅ Video analysis
- ✅ Any sequential data where order matters

**Examples:**
- Sentiment analysis: "This movie is great!" → Positive
- Machine translation: "Hello" → "Hola"
- Stock price prediction based on history
- Generate text character by character
- Speech to text

**Not Great For:**
- ❌ Images (use CNN)
- ❌ Tabular data (use FNN)
- ❌ Very long sequences (>1000 steps, consider Transformers)

---

## 📘 Part 4: Architecture Comparison

### Choosing the Right Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Decision Tree                             │
└─────────────────────────────────────────────────────────────┘

What type of data?
│
├─ Tabular (structured, fixed features)
│  → Use: Feedforward Network (FNN)
│  → Example: Customer churn, house prices
│
├─ Images (2D/3D spatial data)
│  → Use: Convolutional Network (CNN)
│  → Example: Image classification, object detection
│
├─ Sequences (order matters, variable length)
│  │
│  ├─ Short sequences (<50 steps)
│  │  → Use: Simple RNN or LSTM
│  │  → Example: Sentiment analysis
│  │
│  ├─ Long sequences (50-1000 steps)
│  │  → Use: LSTM or GRU
│  │  → Example: Machine translation, long documents
│  │
│  └─ Very long sequences (>1000 steps)
│     → Use: Transformer (Week 3!)
│     → Example: Long documents, GPT
│
└─ Mixed (images over time, etc.)
   → Combine: CNN + RNN
   → Example: Video classification, action recognition
```

---

### Comparison Table

| Architecture | Input Type | Key Feature | Parameters | Speed | Use Case |
|--------------|------------|-------------|------------|-------|----------|
| **FNN** | Fixed-size vectors | Fully connected | High | Fast | Tabular data, simple tasks |
| **CNN** | Grids (images) | Local connectivity, shared weights | Medium | Fast (GPU) | Computer vision |
| **RNN** | Sequences | Temporal dependencies | Low | Slow (sequential) | Short sequences |
| **LSTM/GRU** | Sequences | Long-term memory | Medium | Slow | NLP, time series |

---

### Hybrid Architectures

**CNN + RNN:** Video Analysis

```python
class CNNRNNModel(nn.Module):
    def __init__(self):
        super(CNNRNNModel, self).__init__()
        
        # CNN for spatial features (per frame)
        self.cnn = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Flatten()
        )
        
        # RNN for temporal dependencies (across frames)
        self.lstm = nn.LSTM(64 * 8 * 8, 128, batch_first=True)
        
        # Classifier
        self.fc = nn.Linear(128, 10)
    
    def forward(self, x):
        # x: (batch, num_frames, channels, height, width)
        batch_size, num_frames, c, h, w = x.size()
        
        # Process each frame through CNN
        cnn_features = []
        for t in range(num_frames):
            frame = x[:, t, :, :, :]  # (batch, c, h, w)
            features = self.cnn(frame)  # (batch, features)
            cnn_features.append(features)
        
        # Stack features
        cnn_features = torch.stack(cnn_features, dim=1)  # (batch, num_frames, features)
        
        # Process through LSTM
        lstm_out, _ = self.lstm(cnn_features)
        
        # Use last output
        out = self.fc(lstm_out[:, -1, :])
        
        return out

# Example: Classify 10-frame video clips
model = CNNRNNModel()
video_input = torch.randn(2, 10, 3, 32, 32)  # 2 videos, 10 frames each, 32×32 RGB
output = model(video_input)
print(f"Output shape: {output.shape}")  # (2, 10) - 10 classes
```

---

## ✅ Review Questions

1. **What's the main difference between FNN and CNN?**
   <details>
   <summary>Answer</summary>
   FNN uses fully connected layers (every neuron connects to all inputs). CNN uses local connectivity with shared weights (convolution), making it more efficient for spatial data.
   </details>

2. **Why do CNNs use convolution instead of full connections?**
   <details>
   <summary>Answer</summary>
   Three reasons: (1) Parameter reduction through weight sharing, (2) Exploits spatial locality, (3) Translation invariance - same feature detected anywhere in image
   </details>

3. **What problem do RNNs solve that FNNs can't?**
   <details>
   <summary>Answer</summary>
   RNNs can process variable-length sequences and maintain memory of previous inputs, essential for tasks where order and context matter.
   </details>

4. **What's the vanishing gradient problem in RNNs?**
   <details>
   <summary>Answer</summary>
   During backpropagation through time, gradients get multiplied many times and shrink exponentially, making it hard to learn long-term dependencies.
   </details>

5. **How does LSTM solve the vanishing gradient problem?**
   <details>
   <summary>Answer</summary>
   LSTM uses gates (forget, input, output) and a cell state that acts as a highway for gradients, allowing information to flow across many time steps without vanishing.
   </details>

6. **When would you use GRU instead of LSTM?**
   <details>
   <summary>Answer</summary>
   When you need faster training, have limited data, or don't need the extra complexity of LSTM. GRU has fewer parameters but often performs similarly.
   </details>

---

## 🧩 Practice Problems

1. **Architecture Design**: Design a network for each task:
   - Classify MNIST digits (28×28 grayscale images)
   - Predict next word in a sentence
   - Classify customer churn (20 numerical features)
   - Classify actions in video clips

2. **Parameter Counting**: Calculate number of parameters:
   - FNN: [784, 128, 10]
   - CNN: Conv(3×3, 32 filters) → Conv(3×3, 64 filters) → FC(100) → FC(10)
   - LSTM: input=50, hidden=100, output=10

3. **Code Challenge**: Implement max pooling from scratch in JavaScript (no libraries)

4. **Debugging**: This CNN isn't learning. What could be wrong?
   ```python
   model = nn.Sequential(
       nn.Conv2d(3, 64, kernel_size=3),  # No padding!
       nn.MaxPool2d(2),
       nn.Conv2d(64, 128, kernel_size=3),
       nn.MaxPool2d(2),
       nn.Linear(128, 10)  # Wrong input size!
   )
   ```

---

## 🚀 Mini Project Ideas

### Project 1: CNN for MNIST
Build a CNN to classify handwritten digits:
- Conv(32, 3×3) → ReLU → MaxPool
- Conv(64, 3×3) → ReLU → MaxPool
- Flatten → FC(128) → ReLU → FC(10)
- Target: >98% accuracy

### Project 2: LSTM Sentiment Analysis
Build an LSTM for movie review sentiment:
- Embedding layer
- LSTM (128 units)
- Dense output (positive/negative)
- Use IMDB dataset

### Project 3: Compare Architectures
Train FNN, CNN, and RNN on MNIST:
- FNN: Flatten image, fully connected
- CNN: Proper 2D convolutions
- RNN: Treat rows as sequence
- Compare: accuracy, training time, parameters

---

## 🎯 Key Takeaways

1. **Different architectures for different data types** - FNN (tabular), CNN (images), RNN (sequences)

2. **CNNs exploit spatial structure** - Local connectivity, weight sharing, translation invariance

3. **Convolution is a sliding window operation** - Detects local patterns with shared filters

4. **Pooling reduces spatial size** - Max pooling preserves important features, adds robustness

5. **RNNs have memory** - Hidden state captures information from previous time steps

6. **Vanilla RNNs have vanishing gradients** - Can't learn long-term dependencies

7. **LSTM/GRU solve vanishing gradients** - Gates control information flow

8. **Choose architecture based on data structure** - Not problem complexity

9. **Can combine architectures** - CNN+RNN for videos, etc.

10. **Modern deep learning often uses Transformers** - But understanding CNN/RNN is essential

---

## 📚 What's Next?

You've completed the foundational neural network architectures! Next up:

**Week 1 Final Projects:**
- Mini Project: Simple Neural Network (TensorFlow/PyTorch)
- Mini Project: Autoencoder on MNIST

**Week 2: Deep Generative Models**
- Discriminative vs Generative models
- GANs (Generative Adversarial Networks)
- VAEs (Variational Autoencoders)

But first, make sure you:
- ✅ Understand when to use FNN vs CNN vs RNN
- ✅ Can implement basic convolution
- ✅ Know how RNN maintains memory
- ✅ Understand LSTM gates
- ✅ Can design architectures for different tasks

---

**Congratulations!** 🎉 You now understand the three fundamental neural network architectures!

Next: **Week 1 Mini Projects** - Let's build something!
