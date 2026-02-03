# 📘 TensorBoard Visualization

---

## **Purpose (Why this exists):**

**The Problem with "Blind" Training:**

Imagine driving a car with no dashboard — no speedometer, no fuel gauge, no warning lights. You wouldn't know:
- How fast you're going
- If something's wrong
- When to stop
- If you're improving

**Training deep learning models is similar:**

```javascript
// Without visualization
for (let epoch = 0; epoch < 1000; epoch++) {
  train();
  console.log(`Epoch ${epoch} done`); // ❌ Blind!
}

// With TensorBoard
for (let epoch = 0; epoch < 1000; epoch++) {
  const metrics = train();
  tensorboard.log({
    loss: metrics.loss,
    accuracy: metrics.accuracy,
    learningRate: optimizer.lr,
    images: generatedSamples
  });
  // ✅ Full visibility!
}
```

**Why TensorBoard is Essential:**

1. **Monitor Training in Real-Time**
   - Is loss decreasing?
   - Is the model learning or stuck?
   - Should you stop early?

2. **Debug Issues Quickly**
   - Spot overfitting
   - Detect vanishing/exploding gradients
   - Find learning rate problems

3. **Compare Experiments**
   - Which hyperparameters work best?
   - Model A vs Model B
   - Different architectures side-by-side

4. **Visualize Complex Data**
   - Generated images over time
   - Latent space embeddings
   - Model architecture graphs

5. **Share Results**
   - Show progress to team
   - Document experiments
   - Create presentations

**Created by Google** for TensorFlow, now works with PyTorch, JavaScript (TensorFlow.js), and more!

---

## **What it is:**

### **High-Level Definition:**

**TensorBoard** is a web-based visualization toolkit for:
- Tracking metrics (loss, accuracy, custom metrics)
- Visualizing data (images, audio, text, embeddings)
- Profiling performance
- Debugging models

**Architecture:**

```
Your Training Code
      ↓
  Write logs → Event files (.tfevents)
      ↓
  TensorBoard reads logs
      ↓
  Web Dashboard (http://localhost:6006)
      ↓
  Interactive visualizations
```

### **Key Features:**

```javascript
const tensorBoardFeatures = {
  scalars: {
    what: 'Plot metrics over time',
    examples: ['Loss', 'Accuracy', 'Learning rate'],
    visualization: 'Line charts'
  },
  
  images: {
    what: 'Display images at different steps',
    examples: ['Generated images', 'Input samples', 'Attention maps'],
    visualization: 'Image grid'
  },
  
  histograms: {
    what: 'Distribution of tensors',
    examples: ['Weights', 'Gradients', 'Activations'],
    visualization: '3D histogram over time'
  },
  
  graphs: {
    what: 'Model architecture',
    examples: ['Computation graph', 'Network structure'],
    visualization: 'Interactive node graph'
  },
  
  embeddings: {
    what: 'High-dimensional data in 2D/3D',
    examples: ['Latent codes', 'Word embeddings'],
    visualization: 't-SNE / PCA projection'
  },
  
  distributions: {
    what: 'Statistical summaries',
    examples: ['Weight distribution', 'Activation ranges'],
    visualization: 'Box plots over time'
  },
  
  text: {
    what: 'Text outputs',
    examples: ['Generated text', 'Predictions'],
    visualization: 'Text display'
  },
  
  hyperparameters: {
    what: 'Compare experiment configurations',
    examples: ['Learning rate', 'Batch size', 'Architecture'],
    visualization: 'Parallel coordinates, table view'
  }
};
```

---

## **How it works (Intuition):**

### **The "Flight Recorder" Analogy:**

Think of TensorBoard as a flight recorder (black box) for your model:

```
During Flight (Training):
├─ Record airspeed (loss)
├─ Record altitude (accuracy)
├─ Record engine temperature (learning rate)
├─ Take cockpit photos (generated images)
├─ Log instrument readings (weights, gradients)
└─ Save everything to black box (event files)

After Flight:
├─ Connect black box to computer (TensorBoard)
├─ Replay entire flight (visualize logs)
├─ Analyze what happened (debug)
└─ Plan next flight (adjust hyperparameters)
```

### **The Workflow:**

```
Step 1: SETUP
└─ Create a logging directory
   mkdir runs/experiment_001

Step 2: LOG during training
├─ After each step/epoch:
│  ├─ Write loss value
│  ├─ Write accuracy
│  └─ Save generated images
└─ Files accumulate in runs/

Step 3: VISUALIZE
├─ Start TensorBoard: tensorboard --logdir=runs
├─ Open browser: http://localhost:6006
└─ Explore dashboards

Step 4: ANALYZE
├─ Spot trends
├─ Compare experiments
├─ Make decisions
└─ Adjust and re-run
```

---

## **How it works (Implementation):**

### **Python/TensorFlow Example:**

```python
import tensorflow as tf
from tensorflow import keras
import datetime

# 1. Create a log directory
log_dir = "logs/fit/" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
tensorboard_callback = keras.callbacks.TensorBoard(
    log_dir=log_dir, 
    histogram_freq=1,  # Log weights every epoch
    write_images=True   # Log model graph
)

# 2. Build model
model = keras.Sequential([
    keras.layers.Dense(128, activation='relu', input_shape=(784,)),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(10, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

# 3. Train with TensorBoard callback
model.fit(
    x_train, y_train,
    epochs=10,
    validation_data=(x_val, y_val),
    callbacks=[tensorboard_callback]  # ← Magic happens here!
)

# 4. Start TensorBoard (in terminal)
# tensorboard --logdir=logs/fit
```

### **PyTorch Example:**

```python
import torch
import torch.nn as nn
from torch.utils.tensorboard import SummaryWriter
import torchvision

# 1. Create SummaryWriter
writer = SummaryWriter('runs/experiment_1')

# 2. Define model
model = nn.Sequential(
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Dropout(0.2),
    nn.Linear(128, 10)
)

optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

# 3. Training loop with logging
for epoch in range(10):
    for batch_idx, (data, target) in enumerate(train_loader):
        # Forward pass
        output = model(data)
        loss = criterion(output, target)
        
        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        # LOG TO TENSORBOARD
        global_step = epoch * len(train_loader) + batch_idx
        
        # Log scalar
        writer.add_scalar('Loss/train', loss.item(), global_step)
        
        # Log learning rate
        writer.add_scalar('Learning_Rate', optimizer.param_groups[0]['lr'], global_step)
        
        # Log images (every 100 batches)
        if batch_idx % 100 == 0:
            img_grid = torchvision.utils.make_grid(data[:8])
            writer.add_image('Input_Images', img_grid, global_step)
        
        # Log histograms (every epoch)
        if batch_idx == 0:
            for name, param in model.named_parameters():
                writer.add_histogram(f'Parameters/{name}', param, epoch)
                if param.grad is not None:
                    writer.add_histogram(f'Gradients/{name}', param.grad, epoch)

# Close writer
writer.close()

# 4. Start TensorBoard
# tensorboard --logdir=runs
```

### **JavaScript (TensorFlow.js) Example:**

```javascript
const tf = require('@tensorflow/tfjs-node');
const { TensorBoardCallback } = require('@tensorflow/tfjs-node');

// 1. Create model
const model = tf.sequential({
  layers: [
    tf.layers.dense({ units: 128, activation: 'relu', inputShape: [784] }),
    tf.layers.dropout({ rate: 0.2 }),
    tf.layers.dense({ units: 10, activation: 'softmax' })
  ]
});

model.compile({
  optimizer: 'adam',
  loss: 'sparseCategoricalCrossentropy',
  metrics: ['accuracy']
});

// 2. Create TensorBoard callback
const tensorboardCallback = tf.node.tensorBoard('./logs', {
  updateFreq: 'batch'  // Log every batch
});

// 3. Train with callback
await model.fit(xTrain, yTrain, {
  epochs: 10,
  validationData: [xVal, yVal],
  callbacks: [tensorboardCallback]
});

// 4. Start TensorBoard
// tensorboard --logdir=./logs
```

### **Manual Logging (More Control):**

```python
from torch.utils.tensorboard import SummaryWriter
import numpy as np

writer = SummaryWriter('runs/gan_experiment')

for epoch in range(100):
    # Train GAN
    d_loss, g_loss = train_gan_step()
    
    # Log scalars
    writer.add_scalar('Losses/Discriminator', d_loss, epoch)
    writer.add_scalar('Losses/Generator', g_loss, epoch)
    
    # Generate and log images
    if epoch % 10 == 0:
        with torch.no_grad():
            fake_images = generator(fixed_noise)
            img_grid = torchvision.utils.make_grid(fake_images, normalize=True)
            writer.add_image('Generated_Images', img_grid, epoch)
    
    # Log embeddings
    if epoch % 50 == 0:
        latent_codes = encoder(real_images)
        writer.add_embedding(
            latent_codes,
            metadata=labels,
            label_img=real_images,
            global_step=epoch,
            tag='latent_space'
        )
    
    # Log text
    writer.add_text('Status', f'Epoch {epoch}: D_loss={d_loss:.4f}, G_loss={g_loss:.4f}', epoch)
    
    # Log custom matplotlib figure
    if epoch % 25 == 0:
        fig = plot_latent_space(latent_codes, labels)
        writer.add_figure('Latent_Space_Plot', fig, epoch)

writer.close()
```

---

## **Real-World Applications:**

### **1. GAN Training Monitoring:**

```python
class GANTensorBoard:
    def __init__(self, log_dir):
        self.writer = SummaryWriter(log_dir)
        self.fixed_noise = torch.randn(64, 100)  # For consistent visualization
    
    def log_gan_metrics(self, epoch, d_loss_real, d_loss_fake, g_loss):
        # Discriminator losses
        self.writer.add_scalar('Discriminator/Real_Loss', d_loss_real, epoch)
        self.writer.add_scalar('Discriminator/Fake_Loss', d_loss_fake, epoch)
        self.writer.add_scalar('Discriminator/Total_Loss', d_loss_real + d_loss_fake, epoch)
        
        # Generator loss
        self.writer.add_scalar('Generator/Loss', g_loss, epoch)
        
        # Discriminator accuracy
        self.writer.add_scalar('Discriminator/Accuracy', d_accuracy, epoch)
    
    def log_generated_images(self, generator, epoch):
        with torch.no_grad():
            fake_images = generator(self.fixed_noise)
            img_grid = torchvision.utils.make_grid(fake_images, normalize=True, nrow=8)
            self.writer.add_image('Generated_Images/Progress', img_grid, epoch)
    
    def log_gradient_norms(self, model, tag, epoch):
        total_norm = 0
        for p in model.parameters():
            if p.grad is not None:
                param_norm = p.grad.data.norm(2)
                total_norm += param_norm.item() ** 2
        total_norm = total_norm ** 0.5
        self.writer.add_scalar(f'{tag}/Gradient_Norm', total_norm, epoch)

# Usage
tb = GANTensorBoard('runs/gan_experiment')

for epoch in range(1000):
    d_loss_real, d_loss_fake, g_loss = train_gan()
    
    tb.log_gan_metrics(epoch, d_loss_real, d_loss_fake, g_loss)
    tb.log_gradient_norms(discriminator, 'Discriminator', epoch)
    tb.log_gradient_norms(generator, 'Generator', epoch)
    
    if epoch % 10 == 0:
        tb.log_generated_images(generator, epoch)
```

### **2. VAE Latent Space Visualization:**

```python
class VAETensorBoard:
    def __init__(self, log_dir):
        self.writer = SummaryWriter(log_dir)
    
    def log_vae_metrics(self, epoch, recon_loss, kl_loss, beta):
        self.writer.add_scalar('VAE/Reconstruction_Loss', recon_loss, epoch)
        self.writer.add_scalar('VAE/KL_Divergence', kl_loss, epoch)
        self.writer.add_scalar('VAE/Total_Loss', recon_loss + beta * kl_loss, epoch)
        self.writer.add_scalar('VAE/Beta', beta, epoch)
    
    def log_reconstructions(self, original, reconstructed, epoch):
        # Show original and reconstructed side by side
        comparison = torch.cat([original[:8], reconstructed[:8]])
        img_grid = torchvision.utils.make_grid(comparison, nrow=8, normalize=True)
        self.writer.add_image('VAE/Reconstructions', img_grid, epoch)
    
    def log_latent_space(self, vae, dataloader, epoch):
        latent_codes = []
        labels = []
        images = []
        
        with torch.no_grad():
            for data, label in dataloader:
                mu, logvar = vae.encode(data)
                latent_codes.append(mu)
                labels.append(label)
                images.append(data)
                
                if len(latent_codes) * data.size(0) >= 1000:
                    break
        
        latent_codes = torch.cat(latent_codes)
        labels = torch.cat(labels)
        images = torch.cat(images)
        
        # Log embeddings with images
        self.writer.add_embedding(
            latent_codes,
            metadata=labels,
            label_img=images,
            global_step=epoch,
            tag='Latent_Space'
        )
    
    def log_generated_samples(self, vae, num_samples, epoch):
        with torch.no_grad():
            z = torch.randn(num_samples, vae.latent_dim)
            generated = vae.decode(z)
            img_grid = torchvision.utils.make_grid(generated, nrow=8, normalize=True)
            self.writer.add_image('VAE/Generated_Samples', img_grid, epoch)
    
    def log_latent_traversal(self, vae, epoch):
        # Walk through latent dimensions
        with torch.no_grad():
            base_z = torch.zeros(1, vae.latent_dim)
            traversals = []
            
            for dim in range(min(10, vae.latent_dim)):
                z_range = torch.linspace(-3, 3, 10)
                for val in z_range:
                    z = base_z.clone()
                    z[0, dim] = val
                    img = vae.decode(z)
                    traversals.append(img)
            
            img_grid = torchvision.utils.make_grid(traversals, nrow=10, normalize=True)
            self.writer.add_image('VAE/Latent_Traversal', img_grid, epoch)
```

### **3. Hyperparameter Tuning:**

```python
from torch.utils.tensorboard import SummaryWriter

def train_with_hyperparams(lr, batch_size, hidden_dim, run_name):
    writer = SummaryWriter(f'runs/{run_name}')
    
    # Log hyperparameters
    hparams = {
        'lr': lr,
        'batch_size': batch_size,
        'hidden_dim': hidden_dim
    }
    
    # Train model
    final_loss, final_accuracy = train_model(lr, batch_size, hidden_dim, writer)
    
    # Log final metrics
    metrics = {
        'final_loss': final_loss,
        'final_accuracy': final_accuracy
    }
    
    writer.add_hparams(hparams, metrics)
    writer.close()

# Run multiple experiments
experiments = [
    (0.001, 32, 128, 'exp_1'),
    (0.01, 32, 128, 'exp_2'),
    (0.001, 64, 128, 'exp_3'),
    (0.001, 32, 256, 'exp_4'),
]

for lr, bs, hd, name in experiments:
    train_with_hyperparams(lr, bs, hd, name)

# TensorBoard will show comparison table!
```

---

## **Best Practices:**

### **Organization:**

```python
# Good structure
runs/
├── gan_experiment_1/
│   └── events.out.tfevents...
├── gan_experiment_2/
│   └── events.out.tfevents...
├── vae_beta_0.5/
│   └── events.out.tfevents...
└── vae_beta_1.0/
    └── events.out.tfevents...

# Use descriptive names
log_dir = f'runs/{model_name}_{timestamp}_{hyperparams}'

# Example
log_dir = 'runs/GAN_20240203_143000_lr0.001_bs64'
```

### **Logging Frequency:**

```python
class SmartLogger:
    def __init__(self, writer):
        self.writer = writer
        self.global_step = 0
    
    def should_log_scalar(self):
        # Log every step
        return True
    
    def should_log_image(self):
        # Log every 100 steps
        return self.global_step % 100 == 0
    
    def should_log_histogram(self):
        # Log every 500 steps
        return self.global_step % 500 == 0
    
    def should_log_embedding(self):
        # Log every 1000 steps
        return self.global_step % 1000 == 0
    
    def log(self, scalars=None, images=None, histograms=None):
        # Scalars (cheap)
        if scalars and self.should_log_scalar():
            for name, value in scalars.items():
                self.writer.add_scalar(name, value, self.global_step)
        
        # Images (expensive)
        if images and self.should_log_image():
            for name, value in images.items():
                self.writer.add_image(name, value, self.global_step)
        
        # Histograms (very expensive)
        if histograms and self.should_log_histogram():
            for name, value in histograms.items():
                self.writer.add_histogram(name, value, self.global_step)
        
        self.global_step += 1
```

### **Memory Management:**

```python
# Flush periodically
writer.flush()  # Write to disk

# Close when done
writer.close()

# Or use context manager
with SummaryWriter('runs/experiment') as writer:
    for epoch in range(100):
        train()
        writer.add_scalar('loss', loss, epoch)
# Automatically closes

# Clear old logs
import shutil
shutil.rmtree('runs/old_experiment')
```

### **Useful Patterns:**

```python
# 1. Compare multiple runs
tensorboard --logdir=runs/  # All experiments

# 2. Filter by regex
tensorboard --logdir=runs/ --log_filter="gan_.*"

# 3. Different port
tensorboard --logdir=runs/ --port=6007

# 4. Share over network
tensorboard --logdir=runs/ --host=0.0.0.0

# 5. Reload automatically
tensorboard --logdir=runs/ --reload_interval=5
```

---

## **Key Takeaways:**

### **Essential Patterns:**

```python
# Minimal setup
writer = SummaryWriter('runs/my_experiment')

# During training
writer.add_scalar('Loss/train', loss, step)
writer.add_image('Samples', image_grid, step)

# Cleanup
writer.close()

# Start TensorBoard
# tensorboard --logdir=runs
```

### **Common Visualizations:**

```javascript
const visualizations = {
  training: [
    'Loss curves (training & validation)',
    'Accuracy over time',
    'Learning rate schedule'
  ],
  
  generativeModels: [
    'Generated samples over epochs',
    'Reconstruction quality',
    'Latent space embeddings',
    'Gradient norms'
  ],
  
  debugging: [
    'Weight histograms',
    'Activation distributions',
    'Gradient flow',
    'Learning rate'
  ]
};
```

### **Pro Tips:**

1. **Always log to TensorBoard** — it's free insight
2. **Use descriptive names** — future you will thank you
3. **Log early, log often** — better too much than too little
4. **Compare experiments** — use consistent naming
5. **Share TensorBoard links** — great for collaboration

---

**🎉 TensorBoard mastered!** Now you can monitor, debug, and visualize your generative models effectively!

**Next:** Let's build complete projects with GANs & VAEs!

