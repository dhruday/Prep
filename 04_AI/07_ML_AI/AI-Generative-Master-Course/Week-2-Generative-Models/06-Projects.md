# 🚀 Week 2 Projects - GAN Digits & VAE Faces

## � Table of Contents

1. [Overview](#-overview)
2. [Project 1: Vanilla GAN for MNIST Digits](#-project-1-vanilla-gan-for-mnist-digits)
3. [Project 2: DCGAN for MNIST](#-project-2-dcgan-for-mnist)
4. [Project 3: VAE for MNIST](#-project-3-vae-for-mnist)
5. [Project 4: VAE for Face Generation](#-project-4-vae-for-face-generation)
6. [Project 5: Interactive Latent Space Explorer](#-project-5-interactive-latent-space-explorer)
7. [Project Checklist](#-project-checklist)
8. [Extension Ideas](#-extension-ideas)

---

## �📌 Overview

This file contains **complete, production-ready projects** for Week 2:

| Project | Model | Dataset | Goal |
|---------|-------|---------|------|
| Project 1 | GAN | MNIST | Generate handwritten digits |
| Project 2 | DCGAN | MNIST | Better quality with convolutions |
| Project 3 | VAE | MNIST | Learn latent representations |
| Project 4 | VAE | CelebA/LFW | Generate faces |
| Project 5 | Latent Space Explorer | Any | Interactive visualization |

---

## 🎯 Project 1: Vanilla GAN for MNIST Digits

### Goal
Generate realistic handwritten digits from random noise.

### Architecture
```
Generator:                    Discriminator:
z (100) → 256 → 512 → 784    784 → 512 → 256 → 1
```

### Complete Code

```python
"""
Project 1: Vanilla GAN for MNIST
================================

Goal: Generate handwritten digits from random noise

Learning objectives:
- Understand the adversarial training process
- Implement basic GAN architecture
- Train and debug a GAN
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torch.utils.tensorboard import SummaryWriter
import torchvision.utils as vutils
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime
import os

# ============================================
# CONFIGURATION
# ============================================
class Config:
    """All hyperparameters in one place"""
    # Model
    LATENT_DIM = 100        # Noise vector size
    HIDDEN_DIM = 256        # Hidden layer size
    IMAGE_DIM = 784         # 28 x 28
    
    # Training
    BATCH_SIZE = 64
    EPOCHS = 200
    LR_G = 0.0002           # Generator learning rate
    LR_D = 0.0002           # Discriminator learning rate
    BETA1 = 0.5             # Adam beta1
    
    # Logging
    LOG_INTERVAL = 100      # Batches between logs
    SAVE_INTERVAL = 10      # Epochs between checkpoints
    
    # Device
    DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

config = Config()
print(f"Using device: {config.DEVICE}")

# ============================================
# DATA LOADING
# ============================================
def get_dataloader():
    """Load and preprocess MNIST data"""
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize([0.5], [0.5])  # Scale to [-1, 1]
    ])
    
    dataset = datasets.MNIST(
        root='./data',
        train=True,
        download=True,
        transform=transform
    )
    
    dataloader = DataLoader(
        dataset,
        batch_size=config.BATCH_SIZE,
        shuffle=True,
        num_workers=2,
        pin_memory=True
    )
    
    return dataloader

# ============================================
# MODEL DEFINITIONS
# ============================================
class Generator(nn.Module):
    """
    Generator Network
    
    Takes random noise z and produces a 28x28 image
    
    Architecture:
        z (100) → Linear → 256 → LeakyReLU
               → Linear → 512 → BN → LeakyReLU
               → Linear → 1024 → BN → LeakyReLU
               → Linear → 784 → Tanh → reshape to (1, 28, 28)
    """
    def __init__(self, latent_dim=config.LATENT_DIM):
        super().__init__()
        
        def block(in_feat, out_feat, normalize=True):
            layers = [nn.Linear(in_feat, out_feat)]
            if normalize:
                layers.append(nn.BatchNorm1d(out_feat))
            layers.append(nn.LeakyReLU(0.2, inplace=True))
            return layers
        
        self.model = nn.Sequential(
            *block(latent_dim, 256, normalize=False),
            *block(256, 512),
            *block(512, 1024),
            nn.Linear(1024, config.IMAGE_DIM),
            nn.Tanh()
        )
    
    def forward(self, z):
        """
        Args:
            z: Noise vector (batch_size, latent_dim)
        Returns:
            img: Generated image (batch_size, 1, 28, 28)
        """
        img = self.model(z)
        return img.view(img.size(0), 1, 28, 28)


class Discriminator(nn.Module):
    """
    Discriminator Network
    
    Takes a 28x28 image and outputs probability of being real
    
    Architecture:
        (1, 28, 28) → Flatten → 784
                   → Linear → 512 → LeakyReLU → Dropout
                   → Linear → 256 → LeakyReLU → Dropout
                   → Linear → 1 → Sigmoid
    """
    def __init__(self):
        super().__init__()
        
        self.model = nn.Sequential(
            nn.Flatten(),
            nn.Linear(config.IMAGE_DIM, 512),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2, inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, img):
        """
        Args:
            img: Image (batch_size, 1, 28, 28)
        Returns:
            validity: Probability of being real (batch_size, 1)
        """
        return self.model(img)

# ============================================
# TRAINING
# ============================================
def train():
    """Main training loop"""
    
    # Setup
    dataloader = get_dataloader()
    
    generator = Generator().to(config.DEVICE)
    discriminator = Discriminator().to(config.DEVICE)
    
    criterion = nn.BCELoss()
    optimizer_G = optim.Adam(generator.parameters(), 
                             lr=config.LR_G, betas=(config.BETA1, 0.999))
    optimizer_D = optim.Adam(discriminator.parameters(), 
                             lr=config.LR_D, betas=(config.BETA1, 0.999))
    
    # TensorBoard
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    writer = SummaryWriter(f'runs/GAN_MNIST_{timestamp}')
    
    # Fixed noise for consistent sample generation
    fixed_noise = torch.randn(64, config.LATENT_DIM, device=config.DEVICE)
    
    # Training history
    G_losses = []
    D_losses = []
    global_step = 0
    
    print("Starting training...")
    print(f"Epochs: {config.EPOCHS}, Batch Size: {config.BATCH_SIZE}")
    print(f"Generator params: {sum(p.numel() for p in generator.parameters()):,}")
    print(f"Discriminator params: {sum(p.numel() for p in discriminator.parameters()):,}")
    print("-" * 60)
    
    for epoch in range(config.EPOCHS):
        for batch_idx, (real_images, _) in enumerate(dataloader):
            batch_size = real_images.size(0)
            real_images = real_images.to(config.DEVICE)
            
            # Labels with smoothing
            real_labels = torch.ones(batch_size, 1, device=config.DEVICE) * 0.9
            fake_labels = torch.zeros(batch_size, 1, device=config.DEVICE) + 0.1
            
            # ----- Train Discriminator -----
            optimizer_D.zero_grad()
            
            # Real images
            output_real = discriminator(real_images)
            loss_real = criterion(output_real, real_labels)
            D_x = output_real.mean().item()
            
            # Fake images
            z = torch.randn(batch_size, config.LATENT_DIM, device=config.DEVICE)
            fake_images = generator(z)
            output_fake = discriminator(fake_images.detach())
            loss_fake = criterion(output_fake, fake_labels)
            D_G_z1 = output_fake.mean().item()
            
            loss_D = loss_real + loss_fake
            loss_D.backward()
            optimizer_D.step()
            
            # ----- Train Generator -----
            optimizer_G.zero_grad()
            
            # Generate new fakes (or reuse)
            output = discriminator(fake_images)
            loss_G = criterion(output, torch.ones(batch_size, 1, device=config.DEVICE))
            D_G_z2 = output.mean().item()
            
            loss_G.backward()
            optimizer_G.step()
            
            # ----- Logging -----
            G_losses.append(loss_G.item())
            D_losses.append(loss_D.item())
            
            # TensorBoard scalars
            writer.add_scalar('Loss/Generator', loss_G.item(), global_step)
            writer.add_scalar('Loss/Discriminator', loss_D.item(), global_step)
            writer.add_scalar('D_output/Real', D_x, global_step)
            writer.add_scalar('D_output/Fake', D_G_z1, global_step)
            
            if batch_idx % config.LOG_INTERVAL == 0:
                print(f'[{epoch+1}/{config.EPOCHS}][{batch_idx:4d}/{len(dataloader)}] '
                      f'Loss_D: {loss_D.item():.4f} Loss_G: {loss_G.item():.4f} '
                      f'D(x): {D_x:.3f} D(G(z)): {D_G_z1:.3f}/{D_G_z2:.3f}')
            
            global_step += 1
        
        # ----- Generate samples each epoch -----
        generator.eval()
        with torch.no_grad():
            fake_samples = generator(fixed_noise)
            fake_samples = (fake_samples + 1) / 2  # Denormalize
            grid = vutils.make_grid(fake_samples, nrow=8, padding=2)
            writer.add_image('Generated_Samples', grid, epoch)
        generator.train()
        
        # ----- Save checkpoint -----
        if (epoch + 1) % config.SAVE_INTERVAL == 0:
            os.makedirs('checkpoints', exist_ok=True)
            torch.save({
                'epoch': epoch,
                'generator_state_dict': generator.state_dict(),
                'discriminator_state_dict': discriminator.state_dict(),
                'optimizer_G_state_dict': optimizer_G.state_dict(),
                'optimizer_D_state_dict': optimizer_D.state_dict(),
            }, f'checkpoints/gan_epoch_{epoch+1}.pt')
            print(f"Saved checkpoint at epoch {epoch+1}")
    
    writer.close()
    print("Training complete!")
    
    return generator, discriminator, G_losses, D_losses


def generate_samples(generator, n_samples=64, save_path='generated_digits.png'):
    """Generate and save sample images"""
    generator.eval()
    with torch.no_grad():
        z = torch.randn(n_samples, config.LATENT_DIM, device=config.DEVICE)
        samples = generator(z)
        samples = (samples + 1) / 2  # Denormalize
    
    # Create grid
    grid = vutils.make_grid(samples, nrow=8, padding=2)
    
    # Save
    plt.figure(figsize=(10, 10))
    plt.imshow(grid.cpu().permute(1, 2, 0).squeeze(), cmap='gray')
    plt.axis('off')
    plt.savefig(save_path, bbox_inches='tight', dpi=150)
    plt.show()
    print(f"Saved samples to {save_path}")


# ============================================
# RUN
# ============================================
if __name__ == '__main__':
    generator, discriminator, G_losses, D_losses = train()
    
    # Generate final samples
    generate_samples(generator)
    
    # Plot losses
    plt.figure(figsize=(12, 5))
    plt.subplot(1, 2, 1)
    plt.plot(G_losses, alpha=0.6, label='Generator')
    plt.xlabel('Iteration')
    plt.ylabel('Loss')
    plt.title('Generator Loss')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(D_losses, alpha=0.6, label='Discriminator')
    plt.xlabel('Iteration')
    plt.ylabel('Loss')
    plt.title('Discriminator Loss')
    plt.legend()
    
    plt.tight_layout()
    plt.savefig('training_losses.png')
    plt.show()
```

---

## 🎯 Project 2: DCGAN for MNIST

### Improvement over Vanilla GAN
- Uses convolutional layers (better for images)
- More stable training
- Higher quality outputs

```python
"""
Project 2: DCGAN for MNIST
==========================

Improvement: Uses convolutional layers for better image quality
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torch.utils.tensorboard import SummaryWriter
import torchvision.utils as vutils
from datetime import datetime

# Configuration
LATENT_DIM = 100
FEATURES_G = 64   # Generator feature map base size
FEATURES_D = 64   # Discriminator feature map base size
CHANNELS = 1      # Grayscale
BATCH_SIZE = 128
EPOCHS = 50
LR = 0.0002
BETA1 = 0.5

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ============================================
# DCGAN Generator
# ============================================
class DCGANGenerator(nn.Module):
    """
    DCGAN Generator using transposed convolutions
    
    Architecture:
        z (100, 1, 1) → ConvT → (512, 4, 4)
                     → ConvT → (256, 7, 7)  # Note: MNIST is 28x28, not 64x64
                     → ConvT → (128, 14, 14)
                     → ConvT → (1, 28, 28)
    """
    def __init__(self, latent_dim=LATENT_DIM, features_g=FEATURES_G, channels=CHANNELS):
        super().__init__()
        
        self.net = nn.Sequential(
            # Input: (batch, latent_dim, 1, 1)
            self._block(latent_dim, features_g * 8, 4, 1, 0),  # (batch, 512, 4, 4)
            self._block(features_g * 8, features_g * 4, 3, 2, 1),  # (batch, 256, 7, 7)
            self._block(features_g * 4, features_g * 2, 4, 2, 1),  # (batch, 128, 14, 14)
            # Output layer
            nn.ConvTranspose2d(features_g * 2, channels, 4, 2, 1),  # (batch, 1, 28, 28)
            nn.Tanh()
        )
    
    def _block(self, in_channels, out_channels, kernel_size, stride, padding):
        return nn.Sequential(
            nn.ConvTranspose2d(in_channels, out_channels, kernel_size, stride, padding, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(True)
        )
    
    def forward(self, z):
        # z shape: (batch, latent_dim)
        z = z.view(z.size(0), -1, 1, 1)  # (batch, latent_dim, 1, 1)
        return self.net(z)

# ============================================
# DCGAN Discriminator
# ============================================
class DCGANDiscriminator(nn.Module):
    """
    DCGAN Discriminator using strided convolutions
    
    Architecture:
        (1, 28, 28) → Conv → (64, 14, 14)
                   → Conv → (128, 7, 7)
                   → Conv → (256, 4, 4)
                   → Conv → (1, 1, 1) → Sigmoid
    """
    def __init__(self, channels=CHANNELS, features_d=FEATURES_D):
        super().__init__()
        
        self.net = nn.Sequential(
            # Input: (batch, 1, 28, 28)
            nn.Conv2d(channels, features_d, 4, 2, 1),  # (batch, 64, 14, 14)
            nn.LeakyReLU(0.2),
            
            self._block(features_d, features_d * 2, 4, 2, 1),  # (batch, 128, 7, 7)
            self._block(features_d * 2, features_d * 4, 3, 2, 1),  # (batch, 256, 4, 4)
            
            # Output
            nn.Conv2d(features_d * 4, 1, 4, 1, 0),  # (batch, 1, 1, 1)
            nn.Sigmoid()
        )
    
    def _block(self, in_channels, out_channels, kernel_size, stride, padding):
        return nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size, stride, padding, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.LeakyReLU(0.2)
        )
    
    def forward(self, x):
        return self.net(x).view(-1, 1)

# ============================================
# Weight Initialization (DCGAN paper)
# ============================================
def weights_init(m):
    """Initialize weights as described in DCGAN paper"""
    classname = m.__class__.__name__
    if classname.find('Conv') != -1:
        nn.init.normal_(m.weight.data, 0.0, 0.02)
    elif classname.find('BatchNorm') != -1:
        nn.init.normal_(m.weight.data, 1.0, 0.02)
        nn.init.constant_(m.bias.data, 0)

# ============================================
# Training
# ============================================
def train_dcgan():
    # Data
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize([0.5], [0.5])
    ])
    dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    # Models
    G = DCGANGenerator().to(device)
    D = DCGANDiscriminator().to(device)
    
    G.apply(weights_init)
    D.apply(weights_init)
    
    print(f"Generator params: {sum(p.numel() for p in G.parameters()):,}")
    print(f"Discriminator params: {sum(p.numel() for p in D.parameters()):,}")
    
    # Training setup
    criterion = nn.BCELoss()
    opt_G = optim.Adam(G.parameters(), lr=LR, betas=(BETA1, 0.999))
    opt_D = optim.Adam(D.parameters(), lr=LR, betas=(BETA1, 0.999))
    
    # TensorBoard
    writer = SummaryWriter(f'runs/DCGAN_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
    fixed_noise = torch.randn(64, LATENT_DIM, device=device)
    
    global_step = 0
    
    for epoch in range(EPOCHS):
        for batch_idx, (real, _) in enumerate(dataloader):
            batch_size = real.size(0)
            real = real.to(device)
            
            real_labels = torch.ones(batch_size, 1, device=device)
            fake_labels = torch.zeros(batch_size, 1, device=device)
            
            # Train D
            opt_D.zero_grad()
            output_real = D(real)
            loss_real = criterion(output_real, real_labels)
            
            z = torch.randn(batch_size, LATENT_DIM, device=device)
            fake = G(z)
            output_fake = D(fake.detach())
            loss_fake = criterion(output_fake, fake_labels)
            
            loss_D = loss_real + loss_fake
            loss_D.backward()
            opt_D.step()
            
            # Train G
            opt_G.zero_grad()
            output = D(fake)
            loss_G = criterion(output, real_labels)
            loss_G.backward()
            opt_G.step()
            
            # Log
            writer.add_scalars('Losses', {'G': loss_G.item(), 'D': loss_D.item()}, global_step)
            global_step += 1
            
            if batch_idx % 100 == 0:
                print(f'[{epoch}/{EPOCHS}][{batch_idx}/{len(dataloader)}] '
                      f'Loss_D: {loss_D:.4f} Loss_G: {loss_G:.4f}')
        
        # Save samples
        G.eval()
        with torch.no_grad():
            samples = G(fixed_noise)
            samples = (samples + 1) / 2
            grid = vutils.make_grid(samples, nrow=8)
            writer.add_image('Samples', grid, epoch)
        G.train()
    
    writer.close()
    return G, D

# Run
if __name__ == '__main__':
    G, D = train_dcgan()
```

---

## 🎯 Project 3: VAE for MNIST

### Complete VAE with Visualization

```python
"""
Project 3: VAE for MNIST
========================

Features:
- Full VAE implementation
- Latent space visualization
- Interpolation between digits
- Reconstruction quality analysis
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torch.utils.tensorboard import SummaryWriter
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime
from sklearn.manifold import TSNE

# Configuration
LATENT_DIM = 20      # 20 for quality, 2 for visualization
HIDDEN_DIM = 400
INPUT_DIM = 784
BATCH_SIZE = 128
EPOCHS = 50
LR = 1e-3
BETA = 1             # β for β-VAE

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ============================================
# VAE Model
# ============================================
class VAE(nn.Module):
    """
    Variational Autoencoder
    
    Encoder: x → h → (μ, σ)
    Reparameterization: z = μ + σ ⊙ ε
    Decoder: z → h → x̂
    """
    def __init__(self, input_dim=INPUT_DIM, hidden_dim=HIDDEN_DIM, latent_dim=LATENT_DIM):
        super().__init__()
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU()
        )
        self.fc_mu = nn.Linear(hidden_dim, latent_dim)
        self.fc_logvar = nn.Linear(hidden_dim, latent_dim)
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
            nn.Sigmoid()
        )
        
        self.latent_dim = latent_dim
    
    def encode(self, x):
        h = self.encoder(x)
        return self.fc_mu(h), self.fc_logvar(h)
    
    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + std * eps
    
    def decode(self, z):
        return self.decoder(z)
    
    def forward(self, x):
        mu, logvar = self.encode(x.view(-1, INPUT_DIM))
        z = self.reparameterize(mu, logvar)
        x_recon = self.decode(z)
        return x_recon, mu, logvar
    
    def sample(self, n_samples):
        """Generate new samples from prior"""
        z = torch.randn(n_samples, self.latent_dim).to(device)
        return self.decode(z)

# ============================================
# Loss Function
# ============================================
def vae_loss(x_recon, x, mu, logvar, beta=BETA):
    """
    VAE Loss = Reconstruction + β × KL
    """
    # Reconstruction (BCE)
    x_flat = x.view(-1, INPUT_DIM)
    recon_loss = F.binary_cross_entropy(x_recon, x_flat, reduction='sum')
    
    # KL Divergence
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    
    return recon_loss + beta * kl_loss, recon_loss, kl_loss

# ============================================
# Training
# ============================================
def train_vae():
    # Data
    transform = transforms.ToTensor()
    train_data = datasets.MNIST('./data', train=True, download=True, transform=transform)
    test_data = datasets.MNIST('./data', train=False, transform=transform)
    
    train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_data, batch_size=BATCH_SIZE)
    
    # Model
    vae = VAE().to(device)
    optimizer = torch.optim.Adam(vae.parameters(), lr=LR)
    
    print(f"VAE params: {sum(p.numel() for p in vae.parameters()):,}")
    
    # TensorBoard
    writer = SummaryWriter(f'runs/VAE_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
    
    # Training
    global_step = 0
    
    for epoch in range(EPOCHS):
        vae.train()
        train_loss = 0
        
        for batch_idx, (data, _) in enumerate(train_loader):
            data = data.to(device)
            optimizer.zero_grad()
            
            x_recon, mu, logvar = vae(data)
            loss, recon, kl = vae_loss(x_recon, data, mu, logvar)
            
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            
            # Log
            writer.add_scalar('Loss/Total', loss.item() / len(data), global_step)
            writer.add_scalar('Loss/Reconstruction', recon.item() / len(data), global_step)
            writer.add_scalar('Loss/KL', kl.item() / len(data), global_step)
            global_step += 1
        
        avg_loss = train_loss / len(train_loader.dataset)
        print(f'Epoch {epoch+1}/{EPOCHS}, Loss: {avg_loss:.4f}')
        
        # Visualizations
        if (epoch + 1) % 5 == 0:
            # Reconstructions
            vae.eval()
            with torch.no_grad():
                test_batch = next(iter(test_loader))[0][:8].to(device)
                recon, _, _ = vae(test_batch)
                recon = recon.view(-1, 1, 28, 28)
                
                comparison = torch.cat([test_batch, recon])
                grid = torchvision.utils.make_grid(comparison, nrow=8)
                writer.add_image('Reconstruction', grid, epoch)
                
                # Samples
                samples = vae.sample(64).view(-1, 1, 28, 28)
                grid = torchvision.utils.make_grid(samples, nrow=8)
                writer.add_image('Samples', grid, epoch)
    
    writer.close()
    return vae, test_loader

# ============================================
# Visualization Functions
# ============================================
def visualize_latent_space(vae, test_loader, method='tsne'):
    """Visualize latent space using t-SNE"""
    vae.eval()
    latents = []
    labels = []
    
    with torch.no_grad():
        for data, label in test_loader:
            data = data.to(device)
            mu, _ = vae.encode(data.view(-1, INPUT_DIM))
            latents.append(mu.cpu().numpy())
            labels.append(label.numpy())
    
    latents = np.concatenate(latents)
    labels = np.concatenate(labels)
    
    # t-SNE if latent_dim > 2
    if LATENT_DIM > 2:
        print("Running t-SNE...")
        tsne = TSNE(n_components=2, random_state=42)
        latents_2d = tsne.fit_transform(latents[:5000])
        labels = labels[:5000]
    else:
        latents_2d = latents
    
    # Plot
    plt.figure(figsize=(12, 10))
    scatter = plt.scatter(latents_2d[:, 0], latents_2d[:, 1], 
                         c=labels, cmap='tab10', alpha=0.6, s=5)
    plt.colorbar(scatter)
    plt.title('VAE Latent Space Visualization')
    plt.xlabel('Dimension 1')
    plt.ylabel('Dimension 2')
    plt.savefig('vae_latent_space.png', dpi=150)
    plt.show()


def interpolate(vae, digit1, digit2, n_steps=10):
    """Interpolate between two digits in latent space"""
    vae.eval()
    
    # Get sample images of each digit
    test_data = datasets.MNIST('./data', train=False, transform=transforms.ToTensor())
    
    img1 = None
    img2 = None
    for img, label in test_data:
        if label == digit1 and img1 is None:
            img1 = img
        if label == digit2 and img2 is None:
            img2 = img
        if img1 is not None and img2 is not None:
            break
    
    with torch.no_grad():
        # Encode
        mu1, _ = vae.encode(img1.view(1, -1).to(device))
        mu2, _ = vae.encode(img2.view(1, -1).to(device))
        
        # Interpolate
        interpolations = []
        for alpha in np.linspace(0, 1, n_steps):
            z = (1 - alpha) * mu1 + alpha * mu2
            decoded = vae.decode(z).view(1, 28, 28)
            interpolations.append(decoded)
        
        # Plot
        fig, axes = plt.subplots(1, n_steps, figsize=(15, 2))
        for i, img in enumerate(interpolations):
            axes[i].imshow(img.cpu().squeeze(), cmap='gray')
            axes[i].axis('off')
        
        plt.suptitle(f'Interpolation: {digit1} → {digit2}')
        plt.tight_layout()
        plt.savefig(f'interpolation_{digit1}_to_{digit2}.png')
        plt.show()


def generate_digit_grid(vae):
    """Generate a grid of digits varying two latent dimensions"""
    if LATENT_DIM < 2:
        print("Need at least 2 latent dimensions")
        return
    
    vae.eval()
    n = 20
    digit_size = 28
    figure = np.zeros((digit_size * n, digit_size * n))
    
    # Sample from grid
    grid_x = np.linspace(-3, 3, n)
    grid_y = np.linspace(-3, 3, n)
    
    with torch.no_grad():
        for i, yi in enumerate(grid_y):
            for j, xi in enumerate(grid_x):
                z = torch.zeros(1, LATENT_DIM).to(device)
                z[0, 0] = xi
                z[0, 1] = yi
                
                decoded = vae.decode(z).view(28, 28)
                figure[i * digit_size: (i + 1) * digit_size,
                       j * digit_size: (j + 1) * digit_size] = decoded.cpu().numpy()
    
    plt.figure(figsize=(10, 10))
    plt.imshow(figure, cmap='gray')
    plt.title('Varying Two Latent Dimensions')
    plt.axis('off')
    plt.savefig('vae_digit_grid.png', dpi=150)
    plt.show()


# ============================================
# Run
# ============================================
if __name__ == '__main__':
    import torchvision
    
    vae, test_loader = train_vae()
    
    # Visualizations
    visualize_latent_space(vae, test_loader)
    interpolate(vae, 3, 8)
    interpolate(vae, 1, 7)
    generate_digit_grid(vae)
```

---

## 🎯 Project 4: VAE for Face Generation

### Using LFW (Labeled Faces in the Wild) Dataset

```python
"""
Project 4: VAE for Faces
========================

Generate and manipulate face images using VAE

Dataset: LFW (Labeled Faces in the Wild) - smaller than CelebA
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torch.utils.tensorboard import SummaryWriter
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

# Configuration
LATENT_DIM = 128
IMAGE_SIZE = 64
CHANNELS = 3
BATCH_SIZE = 64
EPOCHS = 100
LR = 1e-4
BETA = 1

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ============================================
# Convolutional VAE for Faces
# ============================================
class ConvVAE(nn.Module):
    """
    Convolutional VAE for face images
    
    Encoder: Conv layers to compress to latent space
    Decoder: TransConv layers to reconstruct
    """
    def __init__(self, latent_dim=LATENT_DIM):
        super().__init__()
        self.latent_dim = latent_dim
        
        # Encoder
        self.encoder = nn.Sequential(
            # (3, 64, 64) -> (32, 32, 32)
            nn.Conv2d(CHANNELS, 32, 4, 2, 1),
            nn.ReLU(),
            # (32, 32, 32) -> (64, 16, 16)
            nn.Conv2d(32, 64, 4, 2, 1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            # (64, 16, 16) -> (128, 8, 8)
            nn.Conv2d(64, 128, 4, 2, 1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            # (128, 8, 8) -> (256, 4, 4)
            nn.Conv2d(128, 256, 4, 2, 1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.Flatten()  # (256 * 4 * 4) = 4096
        )
        
        self.fc_mu = nn.Linear(4096, latent_dim)
        self.fc_logvar = nn.Linear(4096, latent_dim)
        
        # Decoder
        self.fc_decode = nn.Linear(latent_dim, 4096)
        
        self.decoder = nn.Sequential(
            # (256, 4, 4) -> (128, 8, 8)
            nn.ConvTranspose2d(256, 128, 4, 2, 1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            # (128, 8, 8) -> (64, 16, 16)
            nn.ConvTranspose2d(128, 64, 4, 2, 1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            # (64, 16, 16) -> (32, 32, 32)
            nn.ConvTranspose2d(64, 32, 4, 2, 1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            # (32, 32, 32) -> (3, 64, 64)
            nn.ConvTranspose2d(32, CHANNELS, 4, 2, 1),
            nn.Sigmoid()
        )
    
    def encode(self, x):
        h = self.encoder(x)
        return self.fc_mu(h), self.fc_logvar(h)
    
    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + std * eps
    
    def decode(self, z):
        h = self.fc_decode(z)
        h = h.view(-1, 256, 4, 4)
        return self.decoder(h)
    
    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        return self.decode(z), mu, logvar
    
    def sample(self, n_samples):
        z = torch.randn(n_samples, self.latent_dim).to(device)
        return self.decode(z)

# ============================================
# Data Loading
# ============================================
def get_face_dataloader():
    """Load LFW face dataset"""
    transform = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.CenterCrop(IMAGE_SIZE),
        transforms.ToTensor(),
    ])
    
    # Download LFW dataset
    dataset = datasets.LFWPeople(
        root='./data',
        download=True,
        transform=transform
    )
    
    return DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

# ============================================
# Training
# ============================================
def train_face_vae():
    dataloader = get_face_dataloader()
    
    vae = ConvVAE().to(device)
    optimizer = torch.optim.Adam(vae.parameters(), lr=LR)
    
    print(f"ConvVAE params: {sum(p.numel() for p in vae.parameters()):,}")
    
    writer = SummaryWriter(f'runs/FaceVAE_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
    global_step = 0
    
    for epoch in range(EPOCHS):
        vae.train()
        total_loss = 0
        
        for batch_idx, (data, _) in enumerate(dataloader):
            data = data.to(device)
            
            optimizer.zero_grad()
            
            recon, mu, logvar = vae(data)
            
            # Loss
            recon_loss = F.mse_loss(recon, data, reduction='sum')
            kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
            loss = recon_loss + BETA * kl_loss
            
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
            writer.add_scalar('Loss/Total', loss.item() / len(data), global_step)
            global_step += 1
        
        avg_loss = total_loss / len(dataloader.dataset)
        print(f'Epoch {epoch+1}/{EPOCHS}, Loss: {avg_loss:.4f}')
        
        # Visualize
        if (epoch + 1) % 10 == 0:
            vae.eval()
            with torch.no_grad():
                # Reconstructions
                test_batch = next(iter(dataloader))[0][:8].to(device)
                recon, _, _ = vae(test_batch)
                
                comparison = torch.cat([test_batch, recon])
                grid = torchvision.utils.make_grid(comparison, nrow=8)
                writer.add_image('Reconstructions', grid, epoch)
                
                # Samples
                samples = vae.sample(16)
                grid = torchvision.utils.make_grid(samples, nrow=4)
                writer.add_image('Samples', grid, epoch)
    
    writer.close()
    return vae

# ============================================
# Face Manipulation
# ============================================
def interpolate_faces(vae, dataloader, n_steps=10):
    """Interpolate between two faces"""
    vae.eval()
    
    # Get two different faces
    batch = next(iter(dataloader))[0]
    face1 = batch[0:1].to(device)
    face2 = batch[1:2].to(device)
    
    with torch.no_grad():
        mu1, _ = vae.encode(face1)
        mu2, _ = vae.encode(face2)
        
        interpolations = [face1]
        for alpha in np.linspace(0, 1, n_steps):
            z = (1 - alpha) * mu1 + alpha * mu2
            decoded = vae.decode(z)
            interpolations.append(decoded)
        interpolations.append(face2)
        
        # Plot
        fig, axes = plt.subplots(1, n_steps + 2, figsize=(20, 3))
        for i, img in enumerate(interpolations):
            axes[i].imshow(img.cpu().squeeze().permute(1, 2, 0).numpy())
            axes[i].axis('off')
        
        plt.suptitle('Face Interpolation')
        plt.tight_layout()
        plt.savefig('face_interpolation.png', dpi=150)
        plt.show()

# Run
if __name__ == '__main__':
    import torchvision
    
    vae = train_face_vae()
    dataloader = get_face_dataloader()
    interpolate_faces(vae, dataloader)
```

---

## 🎯 Project 5: Interactive Latent Space Explorer

### Explore What Each Latent Dimension Controls

```python
"""
Project 5: Latent Space Explorer
================================

Interactive tool to explore VAE latent space
"""

import torch
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider
import warnings
warnings.filterwarnings('ignore')

def create_latent_explorer(vae, latent_dim, device='cpu'):
    """
    Create an interactive latent space explorer
    
    Use sliders to modify each latent dimension and see the effect
    """
    vae.eval()
    vae.to(device)
    
    # Initial latent vector
    z = torch.zeros(1, latent_dim).to(device)
    
    # Create figure
    fig, ax = plt.subplots(figsize=(6, 8))
    plt.subplots_adjust(bottom=0.4)
    
    # Initial image
    with torch.no_grad():
        img = vae.decode(z).view(28, 28).cpu().numpy()
    
    im = ax.imshow(img, cmap='gray')
    ax.axis('off')
    ax.set_title('Modify Latent Dimensions')
    
    # Create sliders for first 10 dimensions (or all if less)
    n_sliders = min(10, latent_dim)
    sliders = []
    
    for i in range(n_sliders):
        ax_slider = plt.axes([0.2, 0.3 - i * 0.025, 0.6, 0.02])
        slider = Slider(ax_slider, f'z[{i}]', -3.0, 3.0, valinit=0.0)
        sliders.append(slider)
    
    def update(val):
        # Update latent vector
        for i, slider in enumerate(sliders):
            z[0, i] = slider.val
        
        # Decode
        with torch.no_grad():
            img = vae.decode(z).view(28, 28).cpu().numpy()
        
        im.set_data(img)
        fig.canvas.draw_idle()
    
    for slider in sliders:
        slider.on_changed(update)
    
    plt.show()


def visualize_dimension_effects(vae, latent_dim, n_dims=10, device='cpu'):
    """
    Visualize what each latent dimension controls
    
    Vary one dimension at a time, keep others at 0
    """
    vae.eval()
    vae.to(device)
    
    n_dims = min(n_dims, latent_dim)
    n_samples = 11  # -3 to 3 in 0.6 steps
    
    fig, axes = plt.subplots(n_dims, n_samples, figsize=(15, n_dims * 1.5))
    
    values = np.linspace(-3, 3, n_samples)
    
    for dim in range(n_dims):
        for idx, val in enumerate(values):
            z = torch.zeros(1, latent_dim).to(device)
            z[0, dim] = val
            
            with torch.no_grad():
                img = vae.decode(z).view(28, 28).cpu().numpy()
            
            axes[dim, idx].imshow(img, cmap='gray')
            axes[dim, idx].axis('off')
            
            if idx == 0:
                axes[dim, idx].set_ylabel(f'z[{dim}]', fontsize=12)
            if dim == 0:
                axes[dim, idx].set_title(f'{val:.1f}')
    
    plt.suptitle('Effect of Each Latent Dimension', fontsize=14)
    plt.tight_layout()
    plt.savefig('latent_dimension_effects.png', dpi=150)
    plt.show()


# Example usage:
# vae = ... (trained VAE)
# create_latent_explorer(vae, LATENT_DIM)
# visualize_dimension_effects(vae, LATENT_DIM)
```

---

## ✅ Project Checklist

| Project | What You Learn | Difficulty |
|---------|----------------|------------|
| 1. Vanilla GAN | Basic GAN training | ⭐⭐ |
| 2. DCGAN | Convolutional GANs | ⭐⭐⭐ |
| 3. VAE MNIST | VAE fundamentals | ⭐⭐ |
| 4. VAE Faces | Complex data | ⭐⭐⭐⭐ |
| 5. Latent Explorer | Understanding latent space | ⭐⭐ |

---

## 📝 Extension Ideas

1. **Conditional GAN**: Generate specific digits
2. **WGAN-GP**: More stable training
3. **β-VAE**: Better disentanglement
4. **CycleGAN**: Style transfer
5. **Progressive GAN**: High-resolution images

---

Next: [07-Interview-QA.md](./07-Interview-QA.md) - Prepare for interviews!
