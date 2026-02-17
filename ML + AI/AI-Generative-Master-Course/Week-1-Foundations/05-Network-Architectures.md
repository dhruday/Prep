# 🏗️ Network Architectures - FNN, CNN, RNN

## 🎯 What You'll Learn

This chapter covers the three foundational neural network architectures:
- **FNN:** Feedforward Networks (general purpose)
- **CNN:** Convolutional Networks (images, spatial data)
- **RNN:** Recurrent Networks (sequences, time series)

You'll understand WHEN and WHY to use each.

---

## 🧠 Section 1: Feedforward Neural Networks (FNN)

### What is an FNN?

The simplest neural network - information flows in ONE direction:

```
Input → Hidden Layer(s) → Output
        (no loops)
```

**Also called:** Multi-Layer Perceptron (MLP), Dense Network, Fully Connected Network

### Architecture

```
         INPUT           HIDDEN           HIDDEN          OUTPUT
         LAYER           LAYER 1          LAYER 2         LAYER
         
        ┌───┐           ┌───┐            ┌───┐           ┌───┐
        │ x₁├───────────┤ h₁├────────────┤ h₄├───────────┤ y₁│
        └───┘           └───┘            └───┘           └───┘
        ┌───┐           ┌───┐            ┌───┐           ┌───┐
        │ x₂├───────────┤ h₂├────────────┤ h₅├───────────┤ y₂│
        └───┘           └───┘            └───┘           └───┘
        ┌───┐           ┌───┐            ┌───┐
        │ x₃├───────────┤ h₃├────────────┤ h₆│
        └───┘           └───┘            └───┘
        
        EVERY node connects to EVERY node in next layer
        That's why it's called "Fully Connected"
```

### The Math

```
Layer l forward pass:
    z⁽ˡ⁾ = a⁽ˡ⁻¹⁾W⁽ˡ⁾ + b⁽ˡ⁾
    a⁽ˡ⁾ = activation(z⁽ˡ⁾)

Where:
    a⁽⁰⁾ = x (input)
    W⁽ˡ⁾ = weights of layer l
    b⁽ˡ⁾ = biases of layer l
```

### PyTorch Implementation

```python
import torch
import torch.nn as nn

class FNN(nn.Module):
    def __init__(self, input_size, hidden_sizes, output_size):
        super(FNN, self).__init__()
        
        layers = []
        prev_size = input_size
        
        # Hidden layers
        for hidden_size in hidden_sizes:
            layers.append(nn.Linear(prev_size, hidden_size))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(0.2))  # Regularization
            prev_size = hidden_size
        
        # Output layer
        layers.append(nn.Linear(prev_size, output_size))
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)

# Example: Classification with 784 inputs, 10 outputs
model = FNN(
    input_size=784,      # 28x28 image flattened
    hidden_sizes=[256, 128, 64],
    output_size=10       # 10 classes
)

# Forward pass
x = torch.randn(32, 784)  # Batch of 32 samples
output = model(x)          # Shape: (32, 10)
```

### When to Use FNN

✅ **Good for:**
- Tabular data (features as columns)
- Simple classification/regression
- When no spatial/temporal structure

❌ **Not good for:**
- Images (doesn't capture spatial patterns)
- Text/sequences (doesn't capture order)
- Very high-dimensional data

---

## 🖼️ Section 2: Convolutional Neural Networks (CNN)

### Why Not FNN for Images?

```
28×28 image = 784 pixels
         ↓
FNN Layer (784 → 1000) = 784,000 weights!

Problems:
1. Too many parameters → overfitting
2. Ignores spatial structure (nearby pixels are related)
3. No translation invariance (cat in corner ≠ cat in center)
```

### The Key Insight: Convolution

Instead of connecting every pixel to every neuron, use a **filter** that slides across the image:

```
Image (5×5):                Filter (3×3):
┌───┬───┬───┬───┬───┐       ┌───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │ 5 │       │ 1 │ 0 │-1 │
├───┼───┼───┼───┼───┤       ├───┼───┼───┤
│ 6 │ 7 │ 8 │ 9 │10 │       │ 1 │ 0 │-1 │
├───┼───┼───┼───┼───┤       ├───┼───┼───┤
│11 │12 │13 │14 │15 │       │ 1 │ 0 │-1 │
├───┼───┼───┼───┼───┤       └───┴───┴───┘
│16 │17 │18 │19 │20 │
├───┼───┼───┼───┼───┤
│21 │22 │23 │24 │25 │
└───┴───┴───┴───┴───┘

Output[0,0] = sum of element-wise multiplication:
= 1×1 + 2×0 + 3×(-1) + 6×1 + 7×0 + 8×(-1) + 11×1 + 12×0 + 13×(-1)
= 1 - 3 + 6 - 8 + 11 - 13 = -6
```

### Visual: Convolution Operation

```
Input Image          Filter          Slide across...      Output
                                     
┌─────────┐         ┌───┐            ┌─────────┐         ┌───────┐
│■■■░░░░░░│         │■■■│            │░░░■■■░░░│         │ -6│ 4 │
│■■■░░░░░░│    *    │■■■│     →→→    │░░░■■■░░░│    =    │  2│-1 │
│■■■░░░░░░│         │■■■│            │░░░■■■░░░│         │... ...│
│░░░░░░░░░│                          
└─────────┘                          
                                     
Each position produces ONE number (feature map value)
```

### Why Convolution Works

```
1. PARAMETER SHARING
   Same filter used everywhere → fewer parameters
   3×3 filter = 9 parameters (vs millions in FNN)

2. TRANSLATION INVARIANCE
   Cat detected anywhere → same filter activates
   
3. LOCAL CONNECTIVITY
   Each output only depends on local region
   Captures spatial patterns (edges, textures)
```

---

### CNN Architecture Components

#### 1. Convolutional Layer

```python
# Conv2D: 2D convolution
nn.Conv2d(
    in_channels=3,    # RGB image
    out_channels=32,  # Number of filters
    kernel_size=3,    # 3×3 filter
    stride=1,         # Move 1 pixel at a time
    padding=1         # Add zeros around edges
)
```

#### 2. Pooling Layer

Reduces spatial dimensions (downsampling):

```
Max Pooling (2×2):

┌───┬───┬───┬───┐         ┌───┬───┐
│ 1 │ 3 │ 2 │ 1 │         │ 4 │ 6 │
├───┼───┼───┼───┤    →    ├───┼───┤
│ 4 │ 2 │ 6 │ 4 │         │ 8 │ 7 │
├───┼───┼───┼───┤         └───┴───┘
│ 8 │ 5 │ 1 │ 2 │
├───┼───┼───┼───┤    Takes MAX of each 2×2 region
│ 3 │ 7 │ 2 │ 4 │
└───┴───┴───┴───┘

4×4 → 2×2 (halves dimensions)
```

```python
nn.MaxPool2d(kernel_size=2, stride=2)
```

#### 3. Flatten + Fully Connected

After convolutions, flatten to 1D and use FNN for classification:

```
Feature Maps → Flatten → Dense → Output

(32, 7, 7) → 1568 → 128 → 10 classes
```

---

### Complete CNN Example

```python
import torch
import torch.nn as nn

class CNN(nn.Module):
    def __init__(self, num_classes=10):
        super(CNN, self).__init__()
        
        # Convolutional layers
        self.conv_layers = nn.Sequential(
            # Conv block 1: 1×28×28 → 32×14×14
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            
            # Conv block 2: 32×14×14 → 64×7×7
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            
            # Conv block 3: 64×7×7 → 128×3×3
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
        )
        
        # Fully connected layers
        self.fc_layers = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 3 * 3, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        x = self.conv_layers(x)
        x = self.fc_layers(x)
        return x

# Example usage
model = CNN(num_classes=10)
x = torch.randn(32, 1, 28, 28)  # Batch of 32 grayscale 28×28 images
output = model(x)               # Shape: (32, 10)
print(f"Output shape: {output.shape}")
```

---

### What CNNs Learn

```
LAYER 1: Simple patterns
    ┌───┐  ┌───┐  ┌───┐
    │ / │  │ \ │  │ ─ │  Edges at different angles
    └───┘  └───┘  └───┘

LAYER 2: Combinations of edges
    ┌─────┐  ┌─────┐
    │ ╭─╮ │  │ ╲ ╱ │  Corners, curves
    └─────┘  └─────┘

LAYER 3: Parts of objects
    ┌───────┐  ┌───────┐
    │  👁️   │  │  👂   │  Eyes, ears, wheels
    └───────┘  └───────┘

LAYER 4+: Whole objects
    ┌─────────┐
    │  😺     │  Complete faces, cars, etc.
    └─────────┘
```

---

### Famous CNN Architectures

| Model | Year | Key Innovation |
|-------|------|----------------|
| LeNet-5 | 1998 | First successful CNN (digits) |
| AlexNet | 2012 | Deep CNN + GPU, won ImageNet |
| VGG | 2014 | Very deep (16-19 layers), 3×3 filters |
| GoogLeNet | 2014 | Inception modules (parallel filters) |
| ResNet | 2015 | Skip connections, 152 layers |
| EfficientNet | 2019 | Compound scaling |

---

## 🔄 Section 3: Recurrent Neural Networks (RNN)

### Why Not FNN/CNN for Sequences?

```
Text: "The cat sat on the mat"

Problems with FNN:
1. Variable length input (sentences have different lengths)
2. Order matters ("cat sat" ≠ "sat cat")
3. Context matters (word meaning depends on context)
```

### The Key Insight: Hidden State

RNNs maintain a **hidden state** that gets updated at each time step:

```
      x₁        x₂        x₃        x₄
       │         │         │         │
       ▼         ▼         ▼         ▼
    ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐
h₀→ │ RNN │─→ │ RNN │─→ │ RNN │─→ │ RNN │─→ h₄
    └─────┘   └─────┘   └─────┘   └─────┘
       │         │         │         │
       ▼         ▼         ▼         ▼
      y₁        y₂        y₃        y₄
      
Hidden state carries information from previous steps
```

### The Math

```
At each time step t:

hₜ = tanh(Wₓₕ × xₜ + Wₕₕ × hₜ₋₁ + b)
yₜ = Wₕᵧ × hₜ + bᵧ

Where:
- xₜ = input at time t
- hₜ = hidden state at time t
- yₜ = output at time t
- Wₓₕ, Wₕₕ, Wₕᵧ = weight matrices (SHARED across all time steps)
```

### Simple RNN Implementation

```python
import torch
import torch.nn as nn

class SimpleRNN(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(SimpleRNN, self).__init__()
        
        self.hidden_size = hidden_size
        
        # RNN weights
        self.W_xh = nn.Linear(input_size, hidden_size)
        self.W_hh = nn.Linear(hidden_size, hidden_size)
        self.W_hy = nn.Linear(hidden_size, output_size)
    
    def forward(self, x, hidden=None):
        """
        x: (batch_size, seq_len, input_size)
        """
        batch_size, seq_len, _ = x.shape
        
        # Initialize hidden state
        if hidden is None:
            hidden = torch.zeros(batch_size, self.hidden_size)
        
        outputs = []
        
        # Process each time step
        for t in range(seq_len):
            # Combine input and previous hidden state
            hidden = torch.tanh(self.W_xh(x[:, t, :]) + self.W_hh(hidden))
            output = self.W_hy(hidden)
            outputs.append(output)
        
        # Stack outputs
        outputs = torch.stack(outputs, dim=1)
        
        return outputs, hidden

# Example
model = SimpleRNN(input_size=10, hidden_size=20, output_size=5)
x = torch.randn(32, 15, 10)  # Batch=32, Seq_len=15, Features=10
outputs, final_hidden = model(x)
print(f"Outputs: {outputs.shape}")  # (32, 15, 5)
print(f"Final hidden: {final_hidden.shape}")  # (32, 20)
```

---

### The Vanishing Gradient Problem

```
Long sequence backpropagation:

∂L/∂h₁ = ∂L/∂h₁₀₀ × ∂h₁₀₀/∂h₉₉ × ... × ∂h₂/∂h₁

Each term ∂hₜ/∂hₜ₋₁ involves tanh derivative (max ≈ 1)
and weight matrix multiplication.

If these are < 1: (0.9)¹⁰⁰ ≈ 0.00003 → VANISHES
If these are > 1: (1.1)¹⁰⁰ ≈ 13,781 → EXPLODES
```

**Solution:** LSTM and GRU (covered in Week 3!)

---

### Using PyTorch's Built-in RNN

```python
import torch.nn as nn

class RNNClassifier(nn.Module):
    def __init__(self, vocab_size, embedding_dim, hidden_dim, output_dim, n_layers=2):
        super(RNNClassifier, self).__init__()
        
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        
        self.rnn = nn.RNN(
            input_size=embedding_dim,
            hidden_size=hidden_dim,
            num_layers=n_layers,
            batch_first=True,
            dropout=0.3
        )
        
        self.fc = nn.Linear(hidden_dim, output_dim)
    
    def forward(self, x):
        # x: (batch, seq_len) - token indices
        
        # Embed tokens
        embedded = self.embedding(x)  # (batch, seq_len, embed_dim)
        
        # RNN
        output, hidden = self.rnn(embedded)
        # output: (batch, seq_len, hidden_dim)
        # hidden: (n_layers, batch, hidden_dim)
        
        # Use last hidden state for classification
        last_hidden = hidden[-1]  # (batch, hidden_dim)
        
        # Classify
        logits = self.fc(last_hidden)  # (batch, output_dim)
        
        return logits

# Example: Sentiment classification
model = RNNClassifier(
    vocab_size=10000,
    embedding_dim=100,
    hidden_dim=256,
    output_dim=2  # Positive/Negative
)

# Input: batch of sentences (tokenized)
x = torch.randint(0, 10000, (32, 50))  # 32 sentences, 50 tokens each
output = model(x)  # (32, 2)
```

---

### RNN Variants

| Variant | Key Feature | Use Case |
|---------|-------------|----------|
| Vanilla RNN | Simple, fast | Short sequences |
| LSTM | Long-term memory | Most sequence tasks |
| GRU | Simpler LSTM | When LSTM is overkill |
| Bidirectional | Sees future too | When full context available |
| Stacked | Multiple layers | Complex patterns |

---

## 📊 Section 4: Architecture Comparison

### When to Use What

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA TYPE DECISION TREE                       │
│                                                                  │
│  What kind of data do you have?                                  │
│                                                                  │
│  TABULAR (rows & columns)                                        │
│  ├── Structured data → FNN                                       │
│  └── Examples: sales data, user features                        │
│                                                                  │
│  IMAGES (spatial data)                                           │
│  ├── Need spatial understanding → CNN                           │
│  └── Examples: photos, X-rays, satellite imagery                │
│                                                                  │
│  SEQUENCES (ordered data)                                        │
│  ├── Variable length, order matters → RNN/LSTM                  │
│  └── Examples: text, time series, audio                         │
│                                                                  │
│  HYBRID                                                          │
│  ├── Video: CNN (frames) + RNN (time) or 3D CNN                │
│  └── Text + Images: Multimodal (CNN + RNN)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Side-by-Side Comparison

| Aspect | FNN | CNN | RNN |
|--------|-----|-----|-----|
| **Input** | Fixed-size vector | Grid (image) | Sequence |
| **Key Operation** | Matrix multiply | Convolution | Recurrence |
| **Parameter Sharing** | No | Spatial (filters) | Temporal (across time) |
| **Captures** | General patterns | Local spatial patterns | Temporal dependencies |
| **Memory** | None | None | Hidden state |
| **Parallelization** | Full | Full | Limited (sequential) |

---

## 🛠️ Section 5: Mini Project - MNIST Classification

### Compare All Three Architectures

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

# Data loading
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,))
])

train_data = datasets.MNIST('./data', train=True, download=True, transform=transform)
test_data = datasets.MNIST('./data', train=False, transform=transform)

train_loader = DataLoader(train_data, batch_size=64, shuffle=True)
test_loader = DataLoader(test_data, batch_size=1000)


# ========== Model 1: FNN ==========
class FNNModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.network = nn.Sequential(
            nn.Flatten(),
            nn.Linear(784, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 10)
        )
    
    def forward(self, x):
        return self.network(x)


# ========== Model 2: CNN ==========
class CNNModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 7 * 7, 128),
            nn.ReLU(),
            nn.Linear(128, 10)
        )
    
    def forward(self, x):
        x = self.conv(x)
        return self.fc(x)


# ========== Model 3: RNN ==========
class RNNModel(nn.Module):
    def __init__(self):
        super().__init__()
        # Treat image as sequence of 28 rows
        self.rnn = nn.LSTM(28, 128, batch_first=True)
        self.fc = nn.Linear(128, 10)
    
    def forward(self, x):
        # x: (batch, 1, 28, 28) → (batch, 28, 28)
        x = x.squeeze(1)  # Remove channel dimension
        
        # RNN expects (batch, seq_len, features)
        # Treat 28 rows as sequence, 28 pixels as features
        output, (hidden, cell) = self.rnn(x)
        
        # Use last hidden state
        return self.fc(hidden[-1])


# ========== Training Function ==========
def train_model(model, name, epochs=5):
    print(f"\n{'='*50}")
    print(f"Training {name}")
    print(f"{'='*50}")
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(device), target.to(device)
            
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            pred = output.argmax(dim=1)
            correct += (pred == target).sum().item()
            total += target.size(0)
        
        # Evaluate
        model.eval()
        test_correct = 0
        test_total = 0
        
        with torch.no_grad():
            for data, target in test_loader:
                data, target = data.to(device), target.to(device)
                output = model(data)
                pred = output.argmax(dim=1)
                test_correct += (pred == target).sum().item()
                test_total += target.size(0)
        
        train_acc = 100 * correct / total
        test_acc = 100 * test_correct / test_total
        
        print(f"Epoch {epoch+1}: Train Acc: {train_acc:.2f}%, Test Acc: {test_acc:.2f}%")
    
    return test_acc


# Train all models
results = {}
results['FNN'] = train_model(FNNModel(), 'FNN')
results['CNN'] = train_model(CNNModel(), 'CNN')
results['RNN'] = train_model(RNNModel(), 'RNN (LSTM)')

print(f"\n{'='*50}")
print("FINAL RESULTS")
print(f"{'='*50}")
for name, acc in results.items():
    print(f"{name}: {acc:.2f}%")
```

**Expected Results:**
```
FINAL RESULTS
==================================================
FNN: ~97.5%
CNN: ~99.0%
RNN: ~98.0%

CNN wins for images! (as expected)
```

---

## 📝 Homework

### Easy
1. What does "fully connected" mean in FNN?
2. Why do CNNs use pooling layers?
3. What is the hidden state in an RNN?

### Medium
4. Implement a CNN for CIFAR-10 (32×32 RGB images, 10 classes)
5. Add batch normalization to the CNN model
6. Compare training time of CNN vs FNN on MNIST

### Advanced
7. Implement attention mechanism for RNN
8. Build a bidirectional LSTM for sequence classification
9. Implement ResNet skip connections

---

## ⚠️ Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Wrong input shape for CNN | Expects (B, C, H, W) | Check tensor dimensions |
| Not flattening before FC | Shape mismatch error | Add nn.Flatten() |
| RNN with very long sequences | Slow, gradient issues | Use LSTM, truncate sequences |
| Too many FC layers in CNN | Overfitting | Use more conv layers instead |
| Not using dropout | Overfitting | Add dropout (0.2-0.5) |

---

## 🎤 Interview Questions

### Beginner

**Q1: What is the main difference between CNN and FNN?**
> CNN uses convolution (local connectivity, parameter sharing), FNN uses full connections. CNN captures spatial patterns efficiently, FNN treats all inputs equally.

**Q2: What is pooling and why is it used?**
> Pooling reduces spatial dimensions by taking max/avg of regions. Benefits: reduces parameters, adds translation invariance, prevents overfitting.

**Q3: What does RNN hidden state represent?**
> The hidden state is the network's "memory" - a compressed representation of all previous inputs in the sequence.

### Intermediate

**Q4: Explain receptive field in CNNs.**
> The region of input that affects a particular output value. Deeper layers have larger receptive fields. With 3×3 convolutions, receptive field grows linearly with depth.

**Q5: Why do modern architectures use 3×3 convolutions instead of larger ones?**
> Two 3×3 convolutions have same receptive field as one 5×5 but fewer parameters (18 vs 25). More non-linearities make network more expressive.

**Q6: What is the vanishing gradient problem in RNNs?**
> During backpropagation through time, gradients are multiplied at each step. If < 1, they shrink exponentially, making early time steps unlearnable. LSTM/GRU solve this with gating.

### Advanced/FAANG

**Q7: Design a CNN architecture for classifying 224×224 images into 1000 classes.**
> Start with conv layers (32→64→128→256→512 channels), each followed by ReLU and pooling. Use batch norm for stability. Global average pooling before final linear layer. Consider ResNet skip connections for depth. Total ~50M parameters typical.

**Q8: How would you handle variable-length sequences in RNN?**
> Options: (1) Padding + masking (pad shorter sequences, mask in loss), (2) Bucketing (group similar lengths), (3) Pack sequences (PyTorch pack_padded_sequence for efficiency).

---

## ✅ Chapter Summary

| Architecture | Best For | Key Feature |
|--------------|----------|-------------|
| FNN | Tabular data | Simple, general purpose |
| CNN | Images, spatial data | Convolution, pooling |
| RNN | Sequences, time series | Hidden state, temporal |

---

## 🔜 Next Up

Continue to → [06-Projects.md](./06-Projects.md)

Time to put everything together with hands-on projects:
- Simple Neural Network from scratch
- MNIST Classifier
- Autoencoder for dimensionality reduction

*Theory → Code → Projects!* 🚀
