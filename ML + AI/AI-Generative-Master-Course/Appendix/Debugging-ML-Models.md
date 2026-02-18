# 🔍 Debugging ML Models - Complete Guide

## 📚 Table of Contents
1. [Debugging Mindset](#-debugging-mindset)
2. [Loss Not Decreasing](#-loss-not-decreasing)
3. [Loss is NaN or Inf](#-loss-is-nan-or-inf)
4. [Exploding Gradients](#-exploding-gradients)
5. [Vanishing Gradients](#-vanishing-gradients)
6. [Overfitting](#-overfitting)
7. [Underfitting](#-underfitting)
8. [Model Produces Same Output](#-model-produces-same-output)
9. [Training vs Validation Gap](#-training-vs-validation-gap)
10. [Debugging Checklist](#-debugging-checklist)
11. [Debugging Tools](#-debugging-tools)

---

## 🧠 Debugging Mindset

```
THE ML DEBUGGING PHILOSOPHY:

1. ML bugs are SILENT - code runs but produces bad results
2. Most bugs are DATA bugs, not model bugs
3. Start simple, add complexity gradually
4. Trust the process: Print → Visualize → Test → Fix

Debugging Priority:
┌─────────────────────────────────────────────────────────┐
│  1. DATA (60% of bugs)                                  │
│     - Incorrect preprocessing                           │
│     - Labels mismatch                                   │
│     - Data not shuffled                                 │
│     - Data leakage                                      │
│                                                         │
│  2. TRAINING SETUP (25% of bugs)                        │
│     - Wrong loss function                               │
│     - Learning rate issues                              │
│     - Forgot model.train() / model.eval()               │
│     - Not zeroing gradients                             │
│                                                         │
│  3. MODEL ARCHITECTURE (10% of bugs)                    │
│     - Shape mismatches                                  │
│     - Activation functions                              │
│     - Layer connections                                 │
│                                                         │
│  4. HYPERPARAMETERS (5% of bugs)                        │
│     - Usually last thing to tune                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📉 Loss Not Decreasing

### Symptom

```
Epoch 1: Loss = 2.3456
Epoch 2: Loss = 2.3455
Epoch 3: Loss = 2.3454
...
Epoch 100: Loss = 2.3450  # Barely moved!
```

### Diagnosis Checklist

```python
# ============================================
# CHECK 1: Are you in training mode?
# ============================================
model.train()  # MUST call this before training!

# ============================================
# CHECK 2: Are you zeroing gradients?
# ============================================
optimizer.zero_grad()  # MUST call before backward()
loss.backward()
optimizer.step()

# WRONG ORDER:
# loss.backward()
# optimizer.zero_grad()  # This erases gradients before step!
# optimizer.step()

# ============================================
# CHECK 3: Is learning rate reasonable?
# ============================================
# Try different learning rates
for lr in [1e-1, 1e-2, 1e-3, 1e-4, 1e-5]:
    # Plot loss curve for each
    pass

# Typical starting points:
# Adam: 1e-3 to 1e-4
# SGD: 1e-2 to 1e-1

# ============================================
# CHECK 4: Is data shuffled?
# ============================================
train_loader = DataLoader(dataset, shuffle=True)  # shuffle=True!

# ============================================
# CHECK 5: Is the loss function correct?
# ============================================
# Classification (multi-class):
criterion = nn.CrossEntropyLoss()  
# Input: (batch, num_classes), Target: (batch,) with class indices

# Classification (binary):
criterion = nn.BCEWithLogitsLoss()
# Input: (batch, 1), Target: (batch, 1) with 0/1

# Regression:
criterion = nn.MSELoss()
# Input: (batch, features), Target: (batch, features)

# ============================================
# CHECK 6: Are labels correct?
# ============================================
for inputs, labels in train_loader:
    print(f"Input shape: {inputs.shape}")
    print(f"Label shape: {labels.shape}")
    print(f"Label values: {labels[:5]}")
    print(f"Unique labels: {torch.unique(labels)}")
    break
```

### Quick Fix

```python
def diagnose_training(model, train_loader, criterion, optimizer, device):
    """Run diagnostic checks on training setup."""
    
    model.train()
    batch = next(iter(train_loader))
    inputs, targets = batch[0].to(device), batch[1].to(device)
    
    # Check forward pass
    outputs = model(inputs)
    print(f"✓ Forward pass: Input {inputs.shape} → Output {outputs.shape}")
    
    # Check loss
    loss = criterion(outputs, targets)
    print(f"✓ Loss value: {loss.item():.4f}")
    
    # Check backward pass
    optimizer.zero_grad()
    loss.backward()
    
    # Check gradients exist
    has_grad = False
    for name, param in model.named_parameters():
        if param.grad is not None and param.grad.abs().sum() > 0:
            has_grad = True
            print(f"✓ Gradient for {name}: mean={param.grad.abs().mean():.6f}")
            break
    
    if not has_grad:
        print("✗ No gradients! Check computation graph.")
    
    # Take a step
    optimizer.step()
    
    # Check if parameters changed
    new_outputs = model(inputs)
    new_loss = criterion(new_outputs, targets)
    print(f"✓ Loss after 1 step: {new_loss.item():.4f} (was {loss.item():.4f})")
```

---

## 💥 Loss is NaN or Inf

### Symptom

```
Epoch 1: Loss = 2.3456
Epoch 2: Loss = 1.2345
Epoch 3: Loss = nan
```

### Causes & Solutions

```python
# ============================================
# CAUSE 1: Learning rate too high
# ============================================
# Loss explodes → becomes inf → becomes nan
optimizer = torch.optim.Adam(model.parameters(), lr=1e-5)  # Much lower!

# ============================================
# CAUSE 2: Division by zero
# ============================================
# BAD:
output = x / y  # What if y contains zeros?

# GOOD:
output = x / (y + 1e-8)  # Add small epsilon

# ============================================
# CAUSE 3: Log of zero
# ============================================
# BAD:
log_probs = torch.log(probs)  # What if probs contains zeros?

# GOOD:
log_probs = torch.log(probs + 1e-8)
# Or use log_softmax which is numerically stable
log_probs = F.log_softmax(logits, dim=-1)

# ============================================
# CAUSE 4: Exp of large numbers
# ============================================
# BAD:
probs = torch.exp(large_logits)  # Overflow!

# GOOD:
probs = F.softmax(logits, dim=-1)  # Handles overflow internally

# ============================================
# CAUSE 5: Bad input data
# ============================================
# Check for NaN/Inf in input
def check_data(tensor, name="tensor"):
    if torch.isnan(tensor).any():
        print(f"⚠️ {name} contains NaN!")
    if torch.isinf(tensor).any():
        print(f"⚠️ {name} contains Inf!")
    print(f"✓ {name}: min={tensor.min():.4f}, max={tensor.max():.4f}")

# ============================================
# CAUSE 6: Weight initialization issue
# ============================================
# Reset and use proper initialization
def init_weights(m):
    if isinstance(m, nn.Linear):
        nn.init.xavier_uniform_(m.weight)
        if m.bias is not None:
            nn.init.zeros_(m.bias)
    elif isinstance(m, nn.Conv2d):
        nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')

model.apply(init_weights)
```

### Debug Script

```python
def detect_nan_inf(model, loss, step):
    """Call this in training loop to catch NaN early."""
    
    # Check loss
    if torch.isnan(loss) or torch.isinf(loss):
        print(f"Step {step}: Loss is {loss.item()}")
        
        # Check model parameters
        for name, param in model.named_parameters():
            if torch.isnan(param).any():
                print(f"  NaN in param: {name}")
            if torch.isinf(param).any():
                print(f"  Inf in param: {name}")
            if param.grad is not None:
                if torch.isnan(param.grad).any():
                    print(f"  NaN in grad: {name}")
                if torch.isinf(param.grad).any():
                    print(f"  Inf in grad: {name}")
        
        raise ValueError("NaN/Inf detected!")
```

---

## 📈 Exploding Gradients

### Symptom

```
Gradient magnitudes grow exponentially
Loss becomes very large or NaN
Parameters become very large
```

### Detection

```python
def check_gradient_magnitude(model):
    """Check if gradients are exploding."""
    total_norm = 0
    for p in model.parameters():
        if p.grad is not None:
            param_norm = p.grad.data.norm(2)
            total_norm += param_norm.item() ** 2
    total_norm = total_norm ** 0.5
    print(f"Total gradient norm: {total_norm:.4f}")
    if total_norm > 100:
        print("⚠️ Gradients may be exploding!")
    return total_norm
```

### Solutions

```python
# ============================================
# SOLUTION 1: Gradient Clipping (Most Common)
# ============================================
loss.backward()

# Clip by norm
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

# Or clip by value
torch.nn.utils.clip_grad_value_(model.parameters(), clip_value=1.0)

optimizer.step()

# ============================================
# SOLUTION 2: Lower Learning Rate
# ============================================
optimizer = torch.optim.Adam(model.parameters(), lr=1e-5)

# ============================================
# SOLUTION 3: Better Initialization
# ============================================
# For ReLU layers, use He initialization
nn.init.kaiming_normal_(layer.weight, nonlinearity='relu')

# ============================================
# SOLUTION 4: Batch Normalization
# ============================================
class StableNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(100, 50)
        self.bn1 = nn.BatchNorm1d(50)  # Stabilizes training
        self.fc2 = nn.Linear(50, 10)
    
    def forward(self, x):
        x = self.fc1(x)
        x = self.bn1(x)
        x = F.relu(x)
        return self.fc2(x)

# ============================================
# SOLUTION 5: Residual Connections
# ============================================
class ResidualBlock(nn.Module):
    def forward(self, x):
        return x + self.layers(x)  # Skip connection prevents explosion
```

---

## 📉 Vanishing Gradients

### Symptom

```
Early layers have near-zero gradients
Loss decreases very slowly
Deep networks don't learn
```

### Detection

```python
def check_gradient_flow(model):
    """Visualize gradient flow through layers."""
    ave_grads = []
    layers = []
    
    for name, param in model.named_parameters():
        if param.requires_grad and param.grad is not None:
            layers.append(name)
            ave_grads.append(param.grad.abs().mean().item())
    
    # Print gradient magnitudes
    for layer, grad in zip(layers, ave_grads):
        status = "⚠️" if grad < 1e-6 else "✓"
        print(f"{status} {layer}: {grad:.8f}")
```

### Solutions

```python
# ============================================
# SOLUTION 1: Use ReLU instead of Sigmoid/Tanh
# ============================================
# BAD: Sigmoid squashes gradients to near zero
model = nn.Sequential(
    nn.Linear(100, 50),
    nn.Sigmoid(),  # Gradient vanishes!
    nn.Linear(50, 10)
)

# GOOD: ReLU preserves gradients
model = nn.Sequential(
    nn.Linear(100, 50),
    nn.ReLU(),  # Gradient flows!
    nn.Linear(50, 10)
)

# ============================================
# SOLUTION 2: Proper Initialization
# ============================================
# Xavier for tanh/sigmoid
nn.init.xavier_uniform_(layer.weight)

# He/Kaiming for ReLU
nn.init.kaiming_uniform_(layer.weight, nonlinearity='relu')

# ============================================
# SOLUTION 3: Residual Connections
# ============================================
# Gradients can flow directly through skip connections

# ============================================
# SOLUTION 4: Layer Normalization
# ============================================
class TransformerBlock(nn.Module):
    def forward(self, x):
        x = x + self.attention(self.norm1(x))
        x = x + self.ffn(self.norm2(x))
        return x

# ============================================
# SOLUTION 5: Use LSTM/GRU instead of vanilla RNN
# ============================================
# LSTM has gates that preserve gradient flow
rnn = nn.LSTM(input_size, hidden_size, num_layers)
```

---

## 📊 Overfitting

### Symptom

```
Training loss: Low and still decreasing ✓
Validation loss: Starts increasing after some point ✗
Gap between training and validation widens
```

```
    │
Loss│     Training ─────────────────────
    │                    ╱
    │     Validation ───╱─────────────
    │                  ╱
    │                 ╱  ← Overfitting starts here
    └──────────────────────────────────►
                    Epochs
```

### Detection

```python
def check_overfitting(train_losses, val_losses):
    """Detect overfitting from loss curves."""
    
    if len(train_losses) < 10:
        return "Need more epochs to determine"
    
    # Check if val loss is increasing while train loss decreases
    recent_train = train_losses[-5:]
    recent_val = val_losses[-5:]
    
    train_decreasing = recent_train[-1] < recent_train[0]
    val_increasing = recent_val[-1] > recent_val[0]
    
    if train_decreasing and val_increasing:
        return "⚠️ OVERFITTING DETECTED"
    
    gap = val_losses[-1] - train_losses[-1]
    if gap > 0.5:
        return "⚠️ Large train/val gap - potential overfitting"
    
    return "✓ No overfitting detected"
```

### Solutions

```python
# ============================================
# SOLUTION 1: Data Augmentation
# ============================================
from torchvision import transforms

transform = transforms.Compose([
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.2),
    transforms.ToTensor(),
])

# ============================================
# SOLUTION 2: Dropout
# ============================================
class ModelWithDropout(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(100, 50)
        self.dropout = nn.Dropout(p=0.5)  # 50% dropout
        self.fc2 = nn.Linear(50, 10)
    
    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = self.dropout(x)  # Only active during training!
        return self.fc2(x)

# ============================================
# SOLUTION 3: L2 Regularization (Weight Decay)
# ============================================
optimizer = torch.optim.Adam(
    model.parameters(), 
    lr=0.001, 
    weight_decay=1e-4  # L2 penalty
)

# ============================================
# SOLUTION 4: Early Stopping
# ============================================
class EarlyStopping:
    def __init__(self, patience=5):
        self.patience = patience
        self.counter = 0
        self.best_loss = float('inf')
    
    def __call__(self, val_loss):
        if val_loss < self.best_loss:
            self.best_loss = val_loss
            self.counter = 0
        else:
            self.counter += 1
        
        return self.counter >= self.patience

early_stopping = EarlyStopping(patience=5)
for epoch in range(epochs):
    train_loss = train_one_epoch()
    val_loss = validate()
    
    if early_stopping(val_loss):
        print("Early stopping!")
        break

# ============================================
# SOLUTION 5: Reduce Model Complexity
# ============================================
# Use fewer layers or smaller hidden sizes

# ============================================
# SOLUTION 6: Get More Data
# ============================================
# The best solution if possible!
```

---

## 📉 Underfitting

### Symptom

```
Both training and validation loss are high
Model performs poorly on both train and test
Loss decreases very slowly or not at all
```

### Solutions

```python
# ============================================
# SOLUTION 1: Increase Model Capacity
# ============================================
# More layers
# Larger hidden sizes
# More parameters

# ============================================
# SOLUTION 2: Train Longer
# ============================================
# More epochs
# Check if loss is still decreasing

# ============================================
# SOLUTION 3: Reduce Regularization
# ============================================
# Less dropout
# Less weight decay
# Less data augmentation

# ============================================
# SOLUTION 4: Feature Engineering
# ============================================
# Better input features
# More informative representations

# ============================================
# SOLUTION 5: Check Learning Rate
# ============================================
# Learning rate might be too low
# Try learning rate finder:

def find_lr(model, train_loader, criterion, optimizer, device):
    """Simple learning rate finder."""
    lrs = []
    losses = []
    
    for lr in torch.logspace(-7, 0, 50):
        for param_group in optimizer.param_groups:
            param_group['lr'] = lr.item()
        
        # Train one batch
        inputs, targets = next(iter(train_loader))
        inputs, targets = inputs.to(device), targets.to(device)
        
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()
        
        lrs.append(lr.item())
        losses.append(loss.item())
    
    # Plot lrs vs losses
    # Choose LR where loss decreases fastest
    return lrs, losses
```

---

## 🎯 Model Produces Same Output

### Symptom

```
Model outputs the same value for all inputs
Example: Always predicts class 0
Example: Always outputs 0.5
```

### Causes & Solutions

```python
# ============================================
# CAUSE 1: Dead ReLU
# ============================================
# All neurons output 0 after ReLU
# Solution: Use LeakyReLU or ELU
model = nn.Sequential(
    nn.Linear(100, 50),
    nn.LeakyReLU(0.01),  # Instead of ReLU
    nn.Linear(50, 10)
)

# ============================================
# CAUSE 2: Collapsed Outputs
# ============================================
# Check output variance
outputs = model(inputs)
print(f"Output variance: {outputs.var().item()}")
# If variance ≈ 0, outputs have collapsed

# ============================================
# CAUSE 3: Imbalanced Classes
# ============================================
# Model learns to always predict majority class
# Check class distribution
labels = torch.cat([y for _, y in train_loader])
print(f"Class distribution: {torch.bincount(labels)}")

# Solution: Use class weights
class_weights = torch.tensor([0.1, 0.9])  # Inverse of frequency
criterion = nn.CrossEntropyLoss(weight=class_weights)

# ============================================
# CAUSE 4: Bug in Forward Pass
# ============================================
# Check that input actually affects output
def check_forward(model, input1, input2):
    output1 = model(input1)
    output2 = model(input2)
    
    if torch.allclose(output1, output2):
        print("⚠️ Different inputs → Same output!")
        print("Check forward pass implementation")
    else:
        print("✓ Forward pass responds to input changes")

# ============================================
# CAUSE 5: Zero Gradients
# ============================================
# Check if gradients are flowing
for name, param in model.named_parameters():
    if param.grad is not None:
        print(f"{name}: grad_norm = {param.grad.norm():.6f}")
```

---

## 📊 Training vs Validation Gap

### Diagnosing the Gap

```python
def analyze_gap(train_loss, val_loss, train_acc, val_acc):
    """Analyze the train/val gap."""
    
    loss_gap = val_loss - train_loss
    acc_gap = train_acc - val_acc
    
    print(f"Loss gap: {loss_gap:.4f}")
    print(f"Accuracy gap: {acc_gap:.4f}")
    
    if loss_gap > 0.5 and acc_gap > 0.1:
        print("\n⚠️ OVERFITTING")
        print("Solutions:")
        print("- Add dropout")
        print("- Add data augmentation")
        print("- Reduce model size")
        print("- Add regularization")
        
    elif train_loss > 0.5 and val_loss > 0.5:
        print("\n⚠️ UNDERFITTING")
        print("Solutions:")
        print("- Increase model size")
        print("- Train longer")
        print("- Reduce regularization")
        
    elif loss_gap < 0.1:
        print("\n✓ Good fit!")
        print("Consider training longer or using a larger model")
```

---

## ✅ Debugging Checklist

Use this checklist when your model isn't working:

### Before Training

```
[ ] Data is normalized/standardized
[ ] Labels are correct and match inputs
[ ] Data is shuffled (shuffle=True in DataLoader)
[ ] Train/val/test splits don't overlap
[ ] No data leakage (val data not seen during training)
[ ] Input shapes are correct
[ ] Model architecture makes sense for the task
```

### Training Setup

```
[ ] model.train() is called
[ ] optimizer.zero_grad() before backward()
[ ] loss.backward() before optimizer.step()
[ ] Correct loss function for task
[ ] Learning rate is reasonable
[ ] Device consistency (all tensors on same device)
```

### During Training

```
[ ] Loss is decreasing
[ ] No NaN or Inf in loss
[ ] Gradients are flowing (not zero, not exploding)
[ ] Parameters are changing
[ ] Validation loss is being tracked
```

### After Training

```
[ ] model.eval() is called for inference
[ ] torch.no_grad() context for inference
[ ] Results make sense for the task
[ ] Model generalizes to new data
```

---

## 🛠️ Debugging Tools

### 1. TensorBoard

```python
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter('runs/debug')

# Log scalars
writer.add_scalar('Loss/train', train_loss, epoch)
writer.add_scalar('Loss/val', val_loss, epoch)

# Log histograms
for name, param in model.named_parameters():
    writer.add_histogram(name, param, epoch)
    if param.grad is not None:
        writer.add_histogram(f'{name}.grad', param.grad, epoch)

# View: tensorboard --logdir=runs
```

### 2. Weights & Biases

```python
import wandb

wandb.init(project="debug")

for epoch in range(epochs):
    wandb.log({
        "train_loss": train_loss,
        "val_loss": val_loss,
        "learning_rate": optimizer.param_groups[0]['lr'],
        "gradient_norm": compute_grad_norm(model)
    })
```

### 3. PyTorch Hooks

```python
# Register hooks to inspect intermediate values
activations = {}

def get_activation(name):
    def hook(model, input, output):
        activations[name] = output.detach()
    return hook

model.layer1.register_forward_hook(get_activation('layer1'))

# Forward pass
output = model(input)

# Inspect activations
print(f"Layer1 output: {activations['layer1'].shape}")
print(f"Layer1 mean: {activations['layer1'].mean():.4f}")
```

---

## ✅ Final Tips

```
GOLDEN RULES OF ML DEBUGGING:

1. START SIMPLE
   - Get a tiny model working on tiny data first
   - Then scale up gradually

2. OVERFIT FIRST
   - If you can't overfit 10 samples, something is wrong
   - This validates your training loop

3. PRINT EVERYTHING
   - Shapes, values, gradients, losses
   - You can't fix what you can't see

4. VISUALIZE
   - Loss curves, predictions, attention maps
   - Patterns become obvious visually

5. QUESTION EVERYTHING
   - "Is my data correct?"
   - "Is my loss function correct?"
   - "Is my model actually learning?"

6. KEEP A LOG
   - Document what you tried
   - Document what worked/didn't work
   - Future you will thank you
```

**Remember:** Most ML bugs are DATA bugs. Check your data first!
