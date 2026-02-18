# 📊 TensorBoard - Visualization & Debugging

## � Table of Contents

1. [Learning Goals](#-learning-goals)
2. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
3. [TensorBoard Basics](#-tensorboard-basics)
4. [Setup and Installation](#️-setup-and-installation)
5. [Logging Scalars](#-logging-scalars)
6. [Logging Images](#️-logging-images)
7. [Logging Histograms](#-logging-histograms)
8. [Logging Computation Graphs](#-logging-computation-graphs)
9. [Embedding Projector](#-embedding-projector)
10. [Complete Integration Example](#-complete-integration-example)
11. [Debugging with TensorBoard](#-debugging-with-tensorboard)
12. [Homework](#-homework)
13. [Interview Questions & Answers](#-interview-questions--answers)
14. [Next Steps](#-next-steps)

---

## �📌 Learning Goals

By the end of this file, you will:
- Understand why visualization is crucial for ML training
- Master TensorBoard for logging and visualization
- Log scalars, images, histograms, and graphs
- Debug training issues using TensorBoard
- Integrate TensorBoard with GAN and VAE training

---

## 🎯 Beginner Friendly Explanation

### Why Visualization Matters 🔍

```
WITHOUT VISUALIZATION:
═══════════════════════════════════════════════════════

Training Neural Network...
Epoch 1: Loss = 2.345
Epoch 2: Loss = 2.301
Epoch 3: Loss = 2.289
...
Epoch 100: Loss = 0.234

Questions you can't answer:
❓ Is the loss decreasing smoothly?
❓ Are there any spikes or anomalies?
❓ Are gradients healthy?
❓ What do generated samples look like?
❓ Is the model overfitting?


WITH TENSORBOARD:
═══════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────┐
│ 📈 Loss Curves         │ 🖼️ Generated Images        │
│                        │                           │
│  \                     │  ┌───┐ ┌───┐ ┌───┐       │
│   \___                 │  │ 8 │ │ 3 │ │ 5 │       │
│       \____            │  └───┘ └───┘ └───┘       │
│            ‾‾‾         │  Epoch 50                 │
├─────────────────────────────────────────────────────┤
│ 📊 Weight Histograms   │ 🔄 Computation Graph      │
│                        │                           │
│ Layer 1: ▓▓▓▓░░░░░    │  Input → Conv → ReLU     │
│ Layer 2: ▓▓▓░░░░░░    │    ↓                      │
│ Layer 3: ▓▓░░░░░░░    │  Pool → Dense → Output   │
└─────────────────────────────────────────────────────┘

Now you can see EVERYTHING happening during training!
```

---

## 🧠 TensorBoard Basics

### What is TensorBoard?

```
TENSORBOARD:
═══════════════════════════════════════════════════════

A visualization toolkit for machine learning experiments

Features:
├── 📈 Scalars      - Track metrics over time
├── 🖼️ Images       - Visualize samples and generations
├── 📊 Histograms   - Weight and gradient distributions
├── 🔄 Graphs       - Model architecture
├── 🎯 Projector    - High-dimensional data visualization
├── 📝 Text         - Log text data
└── 🔊 Audio        - For audio models

Originally for TensorFlow, now works with PyTorch!
```

### How It Works

```
YOUR TRAINING SCRIPT                    TENSORBOARD SERVER
═══════════════════                    ═══════════════════

┌─────────────────────┐                ┌─────────────────────┐
│                     │    Writes      │                     │
│   Training Loop     │ ──────────────▶│   Log Directory     │
│                     │   (events)     │   (runs/exp1/)      │
│   writer.add_xxx()  │                │                     │
│                     │                └─────────────────────┘
└─────────────────────┘                         │
                                               │ Reads
                                               ▼
                                    ┌─────────────────────┐
                                    │                     │
                                    │   TensorBoard UI    │
                                    │   localhost:6006    │
                                    │                     │
                                    └─────────────────────┘
```

---

## 🛠️ Setup and Installation

### Installation

```bash
# Install TensorBoard
pip install tensorboard

# Verify installation
tensorboard --version
```

### Basic Usage

```python
from torch.utils.tensorboard import SummaryWriter

# Create a writer (logs go to 'runs/' by default)
writer = SummaryWriter('runs/experiment_1')

# Log something
writer.add_scalar('loss', 0.5, global_step=0)

# Always close when done!
writer.close()
```

### Launching TensorBoard

```bash
# In terminal (run from project directory)
tensorboard --logdir=runs

# Or specify port
tensorboard --logdir=runs --port=6007

# Output:
# TensorBoard 2.x at http://localhost:6006/
```

---

## 📈 Logging Scalars

### Basic Scalar Logging

```python
from torch.utils.tensorboard import SummaryWriter
import numpy as np

writer = SummaryWriter('runs/scalar_demo')

# Log training loss over time
for step in range(100):
    # Simulated loss that decreases
    loss = 1.0 / (step + 1) + 0.1 * np.random.randn()
    
    writer.add_scalar('Training/Loss', loss, step)
    
    # Log multiple metrics
    accuracy = 1 - loss + 0.05 * np.random.randn()
    writer.add_scalar('Training/Accuracy', accuracy, step)

writer.close()
```

### GAN-Specific Logging

```python
def train_gan_with_logging(generator, discriminator, dataloader, epochs):
    """GAN training with TensorBoard logging"""
    writer = SummaryWriter(f'runs/GAN_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
    
    global_step = 0
    
    for epoch in range(epochs):
        for batch_idx, (real_images, _) in enumerate(dataloader):
            # ... training code ...
            
            # Log losses
            writer.add_scalar('GAN/Discriminator_Loss', loss_D.item(), global_step)
            writer.add_scalar('GAN/Generator_Loss', loss_G.item(), global_step)
            
            # Log discriminator's predictions
            writer.add_scalar('GAN/D_real_mean', D_x.mean().item(), global_step)
            writer.add_scalar('GAN/D_fake_mean', D_G_z.mean().item(), global_step)
            
            global_step += 1
        
        # Log epoch-level metrics
        writer.add_scalar('GAN/Epoch', epoch, global_step)
    
    writer.close()
```

### VAE-Specific Logging

```python
def train_vae_with_logging(vae, dataloader, epochs):
    """VAE training with TensorBoard logging"""
    writer = SummaryWriter(f'runs/VAE_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
    
    global_step = 0
    
    for epoch in range(epochs):
        epoch_loss = 0
        epoch_recon = 0
        epoch_kl = 0
        
        for batch_idx, (data, _) in enumerate(dataloader):
            # ... training code ...
            
            # Log batch-level losses
            writer.add_scalar('VAE/Total_Loss', loss.item(), global_step)
            writer.add_scalar('VAE/Reconstruction_Loss', recon_loss.item(), global_step)
            writer.add_scalar('VAE/KL_Divergence', kl_loss.item(), global_step)
            
            global_step += 1
            epoch_loss += loss.item()
            epoch_recon += recon_loss.item()
            epoch_kl += kl_loss.item()
        
        # Log epoch averages
        n_batches = len(dataloader)
        writer.add_scalars('VAE/Epoch_Losses', {
            'Total': epoch_loss / n_batches,
            'Reconstruction': epoch_recon / n_batches,
            'KL': epoch_kl / n_batches
        }, epoch)
    
    writer.close()
```

---

## 🖼️ Logging Images

### Basic Image Logging

```python
import torch
import torchvision

def log_images(writer, images, tag, step, nrow=8):
    """
    Log a batch of images to TensorBoard
    
    Args:
        writer: SummaryWriter instance
        images: Tensor of shape (N, C, H, W)
        tag: Name for the image grid
        step: Global step
        nrow: Number of images per row
    """
    # Create grid of images
    grid = torchvision.utils.make_grid(images, nrow=nrow, normalize=True)
    
    # Log to TensorBoard
    writer.add_image(tag, grid, step)
```

### GAN Image Logging

```python
def log_gan_samples(writer, generator, fixed_noise, step):
    """Log generated samples during GAN training"""
    generator.eval()
    with torch.no_grad():
        fake_images = generator(fixed_noise)
    generator.train()
    
    # Denormalize from [-1, 1] to [0, 1]
    fake_images = (fake_images + 1) / 2
    
    # Create grid and log
    grid = torchvision.utils.make_grid(fake_images, nrow=8, normalize=False)
    writer.add_image('GAN/Generated_Samples', grid, step)


# In training loop:
fixed_noise = torch.randn(64, LATENT_DIM, device=device)

for epoch in range(epochs):
    # ... training ...
    
    # Log samples every N epochs
    if (epoch + 1) % 10 == 0:
        log_gan_samples(writer, generator, fixed_noise, epoch)
```

### VAE Reconstruction Logging

```python
def log_vae_reconstructions(writer, vae, test_batch, step):
    """Log original vs reconstructed images"""
    vae.eval()
    with torch.no_grad():
        x_recon, _, _ = vae(test_batch)
    vae.train()
    
    # Stack original and reconstruction
    comparison = torch.cat([
        test_batch[:8],
        x_recon[:8].view(-1, 1, 28, 28)
    ])
    
    grid = torchvision.utils.make_grid(comparison, nrow=8)
    writer.add_image('VAE/Reconstruction_Comparison', grid, step)


def log_vae_samples(writer, vae, step, n_samples=64):
    """Log randomly generated samples"""
    vae.eval()
    with torch.no_grad():
        samples = vae.sample(n_samples, device)
        samples = samples.view(-1, 1, 28, 28)
    vae.train()
    
    grid = torchvision.utils.make_grid(samples, nrow=8)
    writer.add_image('VAE/Generated_Samples', grid, step)
```

---

## 📊 Logging Histograms

### Why Histograms Matter

```
WEIGHT HISTOGRAMS TELL YOU:
═══════════════════════════════════════════════════════

HEALTHY TRAINING:
─────────────────
Early:     │▓▓▓▓▓▓▓▓▓▓│  (narrow, centered)
           └──────────┘
Mid:       │  ▓▓▓▓▓▓  │  (slightly wider)
           └──────────┘
Late:      │ ▓▓▓▓▓▓▓▓ │  (spreads out appropriately)
           └──────────┘


EXPLODING GRADIENTS:
────────────────────
│                  ▓│  (weights moving to extremes)
└──────────────────┘
PROBLEM! Weights becoming very large.


VANISHING GRADIENTS:
────────────────────
│         ▓         │  (weights stuck near zero)
└──────────────────┘
PROBLEM! Network not learning.


DEAD NEURONS (ReLU):
────────────────────
│▓▓▓▓▓              │  (all weights negative → ReLU outputs 0)
└──────────────────┘
PROBLEM! Neurons producing no output.
```

### Logging Weights and Gradients

```python
def log_model_histograms(writer, model, step):
    """Log weight and gradient histograms for all layers"""
    for name, param in model.named_parameters():
        if param.requires_grad:
            # Log weights
            writer.add_histogram(f'Weights/{name}', param.data, step)
            
            # Log gradients (if available)
            if param.grad is not None:
                writer.add_histogram(f'Gradients/{name}', param.grad, step)


# In training loop:
for epoch in range(epochs):
    for batch_idx, (data, _) in enumerate(dataloader):
        # Forward, backward, step...
        loss.backward()
        
        # Log histograms periodically
        if batch_idx % 100 == 0:
            log_model_histograms(writer, model, global_step)
        
        optimizer.step()
```

### Logging Latent Space (VAE)

```python
def log_latent_histogram(writer, vae, dataloader, step, device):
    """Log distribution of latent codes"""
    vae.eval()
    all_mu = []
    all_logvar = []
    
    with torch.no_grad():
        for data, _ in dataloader:
            data = data.view(-1, 784).to(device)
            mu, logvar = vae.encode(data)
            all_mu.append(mu.cpu())
            all_logvar.append(logvar.cpu())
    
    vae.train()
    
    all_mu = torch.cat(all_mu, dim=0)
    all_logvar = torch.cat(all_logvar, dim=0)
    
    # Log histograms for each latent dimension
    for i in range(all_mu.shape[1]):
        writer.add_histogram(f'Latent/mu_dim_{i}', all_mu[:, i], step)
        writer.add_histogram(f'Latent/logvar_dim_{i}', all_logvar[:, i], step)
```

---

## 🔄 Logging Computation Graphs

### Visualize Model Architecture

```python
def log_model_graph(writer, model, sample_input):
    """Log model computation graph"""
    writer.add_graph(model, sample_input)


# Usage for GAN
dummy_noise = torch.randn(1, 100)
writer.add_graph(generator, dummy_noise)

dummy_image = torch.randn(1, 1, 28, 28)
writer.add_graph(discriminator, dummy_image)


# Usage for VAE
dummy_input = torch.randn(1, 784)
writer.add_graph(vae, dummy_input)
```

---

## 🎯 Embedding Projector

### Visualize Latent Space in 3D

```python
def log_latent_embeddings(writer, vae, dataloader, device, n_samples=1000):
    """
    Log latent embeddings for visualization in TensorBoard Projector
    
    Shows how different classes cluster in latent space
    """
    vae.eval()
    embeddings = []
    labels = []
    images = []
    
    with torch.no_grad():
        count = 0
        for data, label in dataloader:
            if count >= n_samples:
                break
            
            data_flat = data.view(-1, 784).to(device)
            mu, _ = vae.encode(data_flat)
            
            embeddings.append(mu.cpu())
            labels.append(label)
            images.append(data)
            count += data.size(0)
    
    vae.train()
    
    embeddings = torch.cat(embeddings, dim=0)[:n_samples]
    labels = torch.cat(labels, dim=0)[:n_samples]
    images = torch.cat(images, dim=0)[:n_samples]
    
    # Create label images for visualization
    label_images = images.view(-1, 1, 28, 28)
    
    # Log embeddings
    writer.add_embedding(
        embeddings,
        metadata=labels.tolist(),
        label_img=label_images,
        tag='Latent_Space'
    )


# Call at end of training
log_latent_embeddings(writer, vae, test_loader, device)
```

---

## 🔧 Complete Integration Example

### Full GAN Training with TensorBoard

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torch.utils.tensorboard import SummaryWriter
import torchvision.utils as vutils
from datetime import datetime
import os

# ============================================
# CONFIGURATION
# ============================================
LATENT_DIM = 100
BATCH_SIZE = 64
EPOCHS = 100
LR = 0.0002
BETA1 = 0.5

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ============================================
# TENSORBOARD SETUP
# ============================================
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
log_dir = f'runs/GAN_MNIST_{timestamp}'
writer = SummaryWriter(log_dir)

print(f"TensorBoard logs: {log_dir}")
print(f"Run: tensorboard --logdir={os.path.dirname(log_dir)}")

# ============================================
# DATA LOADING
# ============================================
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5])
])

dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

# Log sample real images
real_batch = next(iter(dataloader))[0][:64]
grid = vutils.make_grid(real_batch, nrow=8, normalize=True)
writer.add_image('Real_Images', grid, 0)

# ============================================
# MODELS (simplified)
# ============================================
class Generator(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = nn.Sequential(
            nn.Linear(LATENT_DIM, 256),
            nn.LeakyReLU(0.2),
            nn.Linear(256, 512),
            nn.BatchNorm1d(512),
            nn.LeakyReLU(0.2),
            nn.Linear(512, 1024),
            nn.BatchNorm1d(1024),
            nn.LeakyReLU(0.2),
            nn.Linear(1024, 784),
            nn.Tanh()
        )
    
    def forward(self, z):
        return self.model(z).view(-1, 1, 28, 28)

class Discriminator(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = nn.Sequential(
            nn.Flatten(),
            nn.Linear(784, 512),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        return self.model(x)

G = Generator().to(device)
D = Discriminator().to(device)

# Log model graphs
dummy_z = torch.randn(1, LATENT_DIM).to(device)
dummy_img = torch.randn(1, 1, 28, 28).to(device)
writer.add_graph(G, dummy_z)
writer.add_graph(D, dummy_img)

# ============================================
# TRAINING
# ============================================
criterion = nn.BCELoss()
optimizer_G = optim.Adam(G.parameters(), lr=LR, betas=(BETA1, 0.999))
optimizer_D = optim.Adam(D.parameters(), lr=LR, betas=(BETA1, 0.999))

fixed_noise = torch.randn(64, LATENT_DIM, device=device)
global_step = 0

print("Starting training...")

for epoch in range(EPOCHS):
    for batch_idx, (real_images, _) in enumerate(dataloader):
        batch_size = real_images.size(0)
        real_images = real_images.to(device)
        
        real_labels = torch.ones(batch_size, 1, device=device)
        fake_labels = torch.zeros(batch_size, 1, device=device)
        
        # ========== Train Discriminator ==========
        optimizer_D.zero_grad()
        
        # Real images
        output_real = D(real_images)
        loss_real = criterion(output_real, real_labels)
        D_x = output_real.mean().item()
        
        # Fake images
        z = torch.randn(batch_size, LATENT_DIM, device=device)
        fake_images = G(z)
        output_fake = D(fake_images.detach())
        loss_fake = criterion(output_fake, fake_labels)
        D_G_z1 = output_fake.mean().item()
        
        loss_D = loss_real + loss_fake
        loss_D.backward()
        optimizer_D.step()
        
        # ========== Train Generator ==========
        optimizer_G.zero_grad()
        
        output = D(fake_images)
        loss_G = criterion(output, real_labels)
        D_G_z2 = output.mean().item()
        
        loss_G.backward()
        optimizer_G.step()
        
        # ========== TensorBoard Logging ==========
        writer.add_scalar('Loss/Discriminator', loss_D.item(), global_step)
        writer.add_scalar('Loss/Generator', loss_G.item(), global_step)
        writer.add_scalar('Discriminator/Real', D_x, global_step)
        writer.add_scalar('Discriminator/Fake_Before', D_G_z1, global_step)
        writer.add_scalar('Discriminator/Fake_After', D_G_z2, global_step)
        
        # Log histograms periodically
        if global_step % 500 == 0:
            for name, param in G.named_parameters():
                writer.add_histogram(f'Generator/{name}', param.data, global_step)
            for name, param in D.named_parameters():
                writer.add_histogram(f'Discriminator/{name}', param.data, global_step)
        
        global_step += 1
    
    # Log generated images every epoch
    G.eval()
    with torch.no_grad():
        fake_grid = G(fixed_noise)
        fake_grid = (fake_grid + 1) / 2  # Denormalize
        grid = vutils.make_grid(fake_grid, nrow=8)
        writer.add_image('Generated_Images', grid, epoch)
    G.train()
    
    print(f'Epoch [{epoch+1}/{EPOCHS}] | '
          f'D Loss: {loss_D.item():.4f} | G Loss: {loss_G.item():.4f} | '
          f'D(x): {D_x:.2f} | D(G(z)): {D_G_z1:.2f}/{D_G_z2:.2f}')

# ============================================
# HYPERPARAMETER LOGGING
# ============================================
writer.add_hparams(
    {'latent_dim': LATENT_DIM, 'batch_size': BATCH_SIZE, 
     'learning_rate': LR, 'epochs': EPOCHS},
    {'final_G_loss': loss_G.item(), 'final_D_loss': loss_D.item()}
)

writer.close()
print(f"\nTraining complete! View logs with:")
print(f"tensorboard --logdir={os.path.dirname(log_dir)}")
```

---

## 🔍 Debugging with TensorBoard

### Common Issues and What to Look For

```
ISSUE 1: LOSS NOT DECREASING
═══════════════════════════════════════════════════════

What to check in TensorBoard:
┌─────────────────────────────────────────────────────┐
│ 📈 Loss curve is flat or increasing                 │
│    → Learning rate too high or too low              │
│                                                     │
│ 📊 Gradient histograms show zeros                   │
│    → Vanishing gradients                            │
│                                                     │
│ 📊 Gradient histograms show very large values       │
│    → Exploding gradients                            │
└─────────────────────────────────────────────────────┘


ISSUE 2: GAN MODE COLLAPSE
═══════════════════════════════════════════════════════

What to check:
┌─────────────────────────────────────────────────────┐
│ 🖼️ Generated images look the same                   │
│    → Mode collapse confirmed                        │
│                                                     │
│ 📈 G loss fluctuates, D loss → 0                    │
│    → D too strong                                   │
│                                                     │
│ 📊 D output for fakes consistently ~0               │
│    → G not learning                                 │
└─────────────────────────────────────────────────────┘


ISSUE 3: VAE POSTERIOR COLLAPSE
═══════════════════════════════════════════════════════

What to check:
┌─────────────────────────────────────────────────────┐
│ 📈 KL loss → 0 early in training                    │
│    → Posterior collapsing to prior                  │
│                                                     │
│ 📊 Latent mu histogram centered at 0                │
│    → All inputs encoded the same                    │
│                                                     │
│ 🖼️ Reconstructions look averaged/blurry             │
│    → Decoder ignoring z                             │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Homework

### Easy
1. Set up TensorBoard and log a simple training loop
2. Log training and validation loss curves
3. Visualize generated images from your GAN

### Medium
4. Add histogram logging to your GAN or VAE
5. Use hyperparameter logging to compare different configurations
6. Log the model computation graph

### Hard
7. Create a custom TensorBoard plugin for GAN metrics
8. Implement real-time latent space visualization
9. Build a callback system for automatic TensorBoard logging

---

## 🎯 Interview Questions & Answers

### Q1: Why is visualization important in deep learning?
**A**: Visualization helps:
1. Monitor training progress in real-time
2. Detect issues early (vanishing gradients, mode collapse)
3. Compare experiments and hyperparameters
4. Debug model architecture
5. Communicate results to stakeholders

### Q2: What metrics would you log for GAN training?
**A**: 
- Discriminator loss (real and fake separately)
- Generator loss
- D(x) - discriminator output on real images
- D(G(z)) - discriminator output on fake images
- Generated image samples
- Weight histograms for both networks

### Q3: How can you detect mode collapse from TensorBoard?
**A**: Look for:
1. Generated images showing limited variety
2. Generator loss oscillating while not improving
3. Discriminator loss approaching zero
4. D(G(z)) consistently near 0 or 1

### Q4: What's the advantage of logging histograms?
**A**: Histograms reveal:
- Weight distributions (healthy vs stuck)
- Gradient flow (vanishing vs exploding)
- Activation patterns
- Layer-by-layer health of the network

---

## 🔗 Next Steps

```
TensorBoard Mastered!
        │
        └─→ 06-Projects.md
            ├── Build GAN for MNIST with full logging
            └── Build VAE for faces with visualization
```

---

Next: [06-Projects.md](./06-Projects.md) - Build complete projects!
