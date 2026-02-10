# 📘 Projects with GANs & VAEs


## 📑 Table of Contents

- [**Purpose (Why build projects):**](#purpose-why-build-projects)
- [**Project 1: MNIST GAN - Generate Handwritten Digits**](#project-1-mnist-gan-generate-handwritten-digits)
- [**Project 2: MNIST VAE - Learn Latent Representations**](#project-2-mnist-vae-learn-latent-representations)
- [**Project 3: Conditional GAN - Generate Specific Digits**](#project-3-conditional-gan-generate-specific-digits)
- [**Key Takeaways:**](#key-takeaways)

---

---

## **Purpose (Why build projects):**

**Learning by doing is essential!**

You've learned:
- ✅ Theory of GANs (adversarial training)
- ✅ Theory of VAEs (probabilistic encoding)
- ✅ Probabilistic foundations
- ✅ Visualization with TensorBoard

**Now it's time to BUILD:**
- 🔨 Cement understanding through implementation
- 🔨 Encounter real debugging challenges
- 🔨 Build portfolio-worthy projects
- 🔨 Gain practical experience

---

## **Project 1: MNIST GAN - Generate Handwritten Digits**

### **Objective:**
Build a GAN that generates realistic handwritten digits (0-9).

### **Architecture:**

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torch.utils.tensorboard import SummaryWriter
import torchvision

# Hyperparameters
latent_dim = 100
lr = 0.0002
batch_size = 64
epochs = 50
img_size = 28

# Generator
class Generator(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = nn.Sequential(
            # Input: latent_dim
            nn.Linear(latent_dim, 256),
            nn.LeakyReLU(0.2),
            nn.BatchNorm1d(256),
            
            nn.Linear(256, 512),
            nn.LeakyReLU(0.2),
            nn.BatchNorm1d(512),
            
            nn.Linear(512, 1024),
            nn.LeakyReLU(0.2),
            nn.BatchNorm1d(1024),
            
            nn.Linear(1024, 28 * 28),
            nn.Tanh()  # Output in [-1, 1]
        )
    
    def forward(self, z):
        img = self.model(z)
        return img.view(-1, 1, 28, 28)

# Discriminator
class Discriminator(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = nn.Sequential(
            # Input: 28x28 image
            nn.Flatten(),
            
            nn.Linear(28 * 28, 512),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(256, 1),
            nn.Sigmoid()  # Probability [0, 1]
        )
    
    def forward(self, img):
        return self.model(img)

# Initialize
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
generator = Generator().to(device)
discriminator = Discriminator().to(device)

# Optimizers
opt_g = optim.Adam(generator.parameters(), lr=lr, betas=(0.5, 0.999))
opt_d = optim.Adam(discriminator.parameters(), lr=lr, betas=(0.5, 0.999))

# Loss
criterion = nn.BCELoss()

# Data
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5])  # Normalize to [-1, 1]
])

train_data = datasets.MNIST('./data', train=True, download=True, transform=transform)
train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True)

# TensorBoard
writer = SummaryWriter('runs/mnist_gan')
fixed_noise = torch.randn(64, latent_dim).to(device)  # For visualization

# Training Loop
for epoch in range(epochs):
    for batch_idx, (real_imgs, _) in enumerate(train_loader):
        real_imgs = real_imgs.to(device)
        batch_size_current = real_imgs.size(0)
        
        # Labels
        real_labels = torch.ones(batch_size_current, 1).to(device)
        fake_labels = torch.zeros(batch_size_current, 1).to(device)
        
        # ---------------------
        # Train Discriminator
        # ---------------------
        opt_d.zero_grad()
        
        # Real images
        real_output = discriminator(real_imgs)
        d_loss_real = criterion(real_output, real_labels)
        
        # Fake images
        z = torch.randn(batch_size_current, latent_dim).to(device)
        fake_imgs = generator(z)
        fake_output = discriminator(fake_imgs.detach())  # Detach!
        d_loss_fake = criterion(fake_output, fake_labels)
        
        # Total discriminator loss
        d_loss = d_loss_real + d_loss_fake
        d_loss.backward()
        opt_d.step()
        
        # -----------------
        # Train Generator
        # -----------------
        opt_g.zero_grad()
        
        # Generate fake images
        z = torch.randn(batch_size_current, latent_dim).to(device)
        fake_imgs = generator(z)
        fake_output = discriminator(fake_imgs)
        
        # Generator wants discriminator to think images are real
        g_loss = criterion(fake_output, real_labels)
        g_loss.backward()
        opt_g.step()
        
        # Logging
        global_step = epoch * len(train_loader) + batch_idx
        
        if batch_idx % 100 == 0:
            print(f'Epoch [{epoch}/{epochs}] Batch [{batch_idx}/{len(train_loader)}] '
                  f'D_loss: {d_loss:.4f} G_loss: {g_loss:.4f}')
            
            # Log to TensorBoard
            writer.add_scalar('Loss/Discriminator', d_loss.item(), global_step)
            writer.add_scalar('Loss/Generator', g_loss.item(), global_step)
            writer.add_scalar('Discriminator/Real_Accuracy', (real_output > 0.5).float().mean(), global_step)
            writer.add_scalar('Discriminator/Fake_Accuracy', (fake_output < 0.5).float().mean(), global_step)
    
    # Generate images with fixed noise
    with torch.no_grad():
        fake_imgs = generator(fixed_noise)
        img_grid = torchvision.utils.make_grid(fake_imgs, normalize=True, nrow=8)
        writer.add_image('Generated_Images', img_grid, epoch)

writer.close()
print("Training complete!")
```

### **Running the Project:**

```bash
# 1. Install dependencies
pip install torch torchvision tensorboard

# 2. Run training
python mnist_gan.py

# 3. Start TensorBoard
tensorboard --logdir=runs

# 4. Open browser
# http://localhost:6006
```

### **Expected Results:**

```
Epoch [0/50] Batch [0/938] D_loss: 0.6931 G_loss: 0.6931
Epoch [0/50] Batch [100/938] D_loss: 0.4521 G_loss: 1.2341
...
Epoch [49/50] Batch [900/938] D_loss: 0.3123 G_loss: 0.8234

Training complete!
```

**What you'll see in TensorBoard:**
- Loss curves converging
- Generated digits improving from noise → recognizable digits
- Discriminator accuracy hovering around 50-80%

---

## **Project 2: MNIST VAE - Learn Latent Representations**

### **Objective:**
Build a VAE that learns a structured latent space and can:
- Reconstruct digits
- Generate new digits
- Interpolate between digits
- Manipulate specific features

### **Architecture:**

```python
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torch.utils.tensorboard import SummaryWriter
import torchvision
import matplotlib.pyplot as plt

# Hyperparameters
latent_dim = 20
lr = 0.001
batch_size = 128
epochs = 50
beta = 1.0  # KL weight

# Encoder
class Encoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(28 * 28, 512)
        self.fc2 = nn.Linear(512, 256)
        self.fc_mu = nn.Linear(256, latent_dim)
        self.fc_logvar = nn.Linear(256, latent_dim)
    
    def forward(self, x):
        x = x.view(-1, 28 * 28)
        h = F.relu(self.fc1(x))
        h = F.relu(self.fc2(h))
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar

# Decoder
class Decoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(latent_dim, 256)
        self.fc2 = nn.Linear(256, 512)
        self.fc3 = nn.Linear(512, 28 * 28)
    
    def forward(self, z):
        h = F.relu(self.fc1(z))
        h = F.relu(self.fc2(h))
        x_recon = torch.sigmoid(self.fc3(h))
        return x_recon.view(-1, 1, 28, 28)

# VAE
class VAE(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = Encoder()
        self.decoder = Decoder()
    
    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std
    
    def forward(self, x):
        mu, logvar = self.encoder(x)
        z = self.reparameterize(mu, logvar)
        x_recon = self.decoder(z)
        return x_recon, mu, logvar

# Loss function
def vae_loss(x, x_recon, mu, logvar, beta=1.0):
    # Reconstruction loss
    recon_loss = F.binary_cross_entropy(x_recon, x, reduction='sum')
    
    # KL divergence
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    
    return recon_loss + beta * kl_loss, recon_loss, kl_loss

# Initialize
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
vae = VAE().to(device)
optimizer = optim.Adam(vae.parameters(), lr=lr)

# Data
transform = transforms.Compose([
    transforms.ToTensor()
])

train_data = datasets.MNIST('./data', train=True, download=True, transform=transform)
train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True)

# TensorBoard
writer = SummaryWriter('runs/mnist_vae')

# Training Loop
for epoch in range(epochs):
    vae.train()
    train_loss = 0
    train_recon = 0
    train_kl = 0
    
    for batch_idx, (data, labels) in enumerate(train_loader):
        data = data.to(device)
        
        # Forward pass
        optimizer.zero_grad()
        x_recon, mu, logvar = vae(data)
        
        # Compute loss
        loss, recon, kl = vae_loss(data, x_recon, mu, logvar, beta)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        train_loss += loss.item()
        train_recon += recon.item()
        train_kl += kl.item()
    
    # Log epoch metrics
    avg_loss = train_loss / len(train_data)
    avg_recon = train_recon / len(train_data)
    avg_kl = train_kl / len(train_data)
    
    print(f'Epoch [{epoch}/{epochs}] Loss: {avg_loss:.4f} Recon: {avg_recon:.4f} KL: {avg_kl:.4f}')
    
    writer.add_scalar('Loss/Total', avg_loss, epoch)
    writer.add_scalar('Loss/Reconstruction', avg_recon, epoch)
    writer.add_scalar('Loss/KL', avg_kl, epoch)
    
    # Visualize reconstructions
    with torch.no_grad():
        vae.eval()
        test_imgs = data[:8]
        recon_imgs, _, _ = vae(test_imgs)
        comparison = torch.cat([test_imgs, recon_imgs])
        img_grid = torchvision.utils.make_grid(comparison, nrow=8)
        writer.add_image('Reconstructions', img_grid, epoch)
        
        # Generate new samples
        z = torch.randn(64, latent_dim).to(device)
        generated = vae.decoder(z)
        img_grid = torchvision.utils.make_grid(generated, nrow=8)
        writer.add_image('Generated', img_grid, epoch)

writer.close()
print("Training complete!")

# Save model
torch.save(vae.state_dict(), 'vae_mnist.pth')
```

### **Latent Space Exploration:**

```python
# Load trained model
vae.load_state_dict(torch.load('vae_mnist.pth'))
vae.eval()

# 1. Visualize latent space (2D projection)
def visualize_latent_space():
    latent_codes = []
    labels_list = []
    
    with torch.no_grad():
        for data, labels in train_loader:
            data = data.to(device)
            mu, _ = vae.encoder(data)
            latent_codes.append(mu.cpu())
            labels_list.append(labels)
    
    latent_codes = torch.cat(latent_codes).numpy()
    labels_list = torch.cat(labels_list).numpy()
    
    # PCA to 2D
    from sklearn.decomposition import PCA
    pca = PCA(n_components=2)
    latent_2d = pca.fit_transform(latent_codes)
    
    # Plot
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(latent_2d[:, 0], latent_2d[:, 1], c=labels_list, cmap='tab10', alpha=0.5)
    plt.colorbar(scatter)
    plt.title('VAE Latent Space (2D PCA projection)')
    plt.xlabel('PC1')
    plt.ylabel('PC2')
    plt.savefig('latent_space.png')
    plt.show()

visualize_latent_space()

# 2. Interpolation between digits
def interpolate_digits(digit1_idx, digit2_idx, steps=10):
    # Get two images
    img1 = train_data[digit1_idx][0].unsqueeze(0).to(device)
    img2 = train_data[digit2_idx][0].unsqueeze(0).to(device)
    
    # Encode
    with torch.no_grad():
        mu1, _ = vae.encoder(img1)
        mu2, _ = vae.encoder(img2)
        
        # Interpolate in latent space
        interpolations = []
        for t in torch.linspace(0, 1, steps):
            z = (1 - t) * mu1 + t * mu2
            img = vae.decoder(z)
            interpolations.append(img)
        
        # Visualize
        interpolations = torch.cat(interpolations)
        img_grid = torchvision.utils.make_grid(interpolations, nrow=steps)
        plt.figure(figsize=(20, 4))
        plt.imshow(img_grid.permute(1, 2, 0).cpu())
        plt.title(f'Interpolation from digit {train_data[digit1_idx][1]} to {train_data[digit2_idx][1]}')
        plt.axis('off')
        plt.savefig('interpolation.png')
        plt.show()

# Interpolate from a 3 to an 8
interpolate_digits(5, 10, steps=10)

# 3. Latent space arithmetic
def latent_arithmetic():
    # Find averages for each digit
    digit_latents = {i: [] for i in range(10)}
    
    with torch.no_grad():
        for data, labels in train_loader:
            data = data.to(device)
            mu, _ = vae.encoder(data)
            
            for i, label in enumerate(labels):
                digit_latents[label.item()].append(mu[i])
    
    # Average latent code for each digit
    digit_means = {}
    for digit in range(10):
        digit_means[digit] = torch.stack(digit_latents[digit]).mean(dim=0)
    
    # Arithmetic: 7 - 1 + 3 = ?
    z_7 = digit_means[7]
    z_1 = digit_means[1]
    z_3 = digit_means[3]
    
    z_result = z_7 - z_1 + z_3
    
    with torch.no_grad():
        result = vae.decoder(z_result.unsqueeze(0))
        plt.imshow(result.squeeze().cpu(), cmap='gray')
        plt.title('Latent Arithmetic: 7 - 1 + 3')
        plt.axis('off')
        plt.savefig('latent_arithmetic.png')
        plt.show()

latent_arithmetic()

# 4. Generate specific digits
def generate_digit(digit_class, num_samples=16):
    # Get average latent for this digit
    digit_latents = []
    
    with torch.no_grad():
        for data, labels in train_loader:
            mask = labels == digit_class
            if mask.sum() > 0:
                data_subset = data[mask].to(device)
                mu, logvar = vae.encoder(data_subset)
                digit_latents.append(mu)
                
                if len(digit_latents) * data_subset.size(0) >= num_samples:
                    break
        
        digit_latents = torch.cat(digit_latents)[:num_samples]
        
        # Add noise for variation
        noise = torch.randn_like(digit_latents) * 0.5
        z = digit_latents + noise
        
        # Generate
        generated = vae.decoder(z)
        img_grid = torchvision.utils.make_grid(generated, nrow=4)
        plt.figure(figsize=(8, 8))
        plt.imshow(img_grid.permute(1, 2, 0).cpu())
        plt.title(f'Generated {digit_class}s')
        plt.axis('off')
        plt.savefig(f'generated_{digit_class}.png')
        plt.show()

generate_digit(7, 16)
```

---

## **Project 3: Conditional GAN - Generate Specific Digits**

**Add control to your GAN!**

```python
# Conditional Generator
class ConditionalGenerator(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.label_embedding = nn.Embedding(num_classes, num_classes)
        
        self.model = nn.Sequential(
            nn.Linear(latent_dim + num_classes, 256),
            nn.LeakyReLU(0.2),
            nn.BatchNorm1d(256),
            
            nn.Linear(256, 512),
            nn.LeakyReLU(0.2),
            nn.BatchNorm1d(512),
            
            nn.Linear(512, 1024),
            nn.LeakyReLU(0.2),
            nn.BatchNorm1d(1024),
            
            nn.Linear(1024, 28 * 28),
            nn.Tanh()
        )
    
    def forward(self, z, labels):
        label_embedding = self.label_embedding(labels)
        z_combined = torch.cat([z, label_embedding], dim=1)
        img = self.model(z_combined)
        return img.view(-1, 1, 28, 28)

# Conditional Discriminator
class ConditionalDiscriminator(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.label_embedding = nn.Embedding(num_classes, num_classes)
        
        self.model = nn.Sequential(
            nn.Linear(28 * 28 + num_classes, 512),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, img, labels):
        img_flat = img.view(-1, 28 * 28)
        label_embedding = self.label_embedding(labels)
        x_combined = torch.cat([img_flat, label_embedding], dim=1)
        return self.model(x_combined)

# Training is similar, but pass labels!
# Now you can generate specific digits:

# Generate all digits 0-9
with torch.no_grad():
    z = torch.randn(10, latent_dim).to(device)
    labels = torch.arange(10).to(device)
    generated = generator(z, labels)
    # Will produce: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
```

---

## **Key Takeaways:**

### **What You Built:**

1. **MNIST GAN**
   - Generates realistic handwritten digits
   - Adversarial training from scratch
   - TensorBoard monitoring

2. **MNIST VAE**
   - Structured latent space
   - Reconstruction & generation
   - Latent space exploration

3. **Conditional GAN**
   - Controlled generation
   - Specify which digit to generate

### **Skills Gained:**

- ✅ Implementing GANs and VAEs
- ✅ Training deep generative models
- ✅ Debugging training issues
- ✅ Using TensorBoard effectively
- ✅ Latent space manipulation
- ✅ Model evaluation

### **Next Steps:**

- Try on color images (CIFAR-10, CelebA)
- Implement advanced architectures (DCGAN, StyleGAN)
- Add more conditioning (age, style, etc.)
- Deploy as web app
- Explore other domains (audio, text)

---

**🎉 Congratulations!** You've built complete generative AI projects from scratch! You now have practical experience with:
- GANs generating realistic data
- VAEs learning structured representations
- TensorBoard visualization
- Real debugging and experimentation

**You're ready for Week 3: Transformers & LLMs!** 🚀

