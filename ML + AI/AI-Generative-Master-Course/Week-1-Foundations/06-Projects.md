# 🚀 Week 1 Projects - Hands-On Implementation

## 📚 Table of Contents

1. [Overview](#-overview)
2. [Project 1: Neural Network from Scratch](#-project-1-neural-network-from-scratch)
3. [Project 2: MNIST Classifier with PyTorch](#-project-2-mnist-classifier-with-pytorch)
4. [Project 3: Autoencoder for MNIST](#-project-3-autoencoder-for-mnist)
5. [Project Extensions](#-project-extensions)
6. [Week 1 Projects Complete!](#-week-1-projects-complete)
7. [Next Up](#-next-up)

---

## 🎯 Overview

This chapter contains complete, working projects that apply everything from Week 1:

| Project | Concepts Applied | Difficulty |
|---------|------------------|------------|
| 1. Neural Network from Scratch | Math, backprop, optimization | ⭐⭐ |
| 2. MNIST Classifier (PyTorch) | CNN, training loops, evaluation | ⭐⭐ |
| 3. Autoencoder for MNIST | Unsupervised learning, compression | ⭐⭐⭐ |

---

## 🔧 Project 1: Neural Network from Scratch

### Goal
Build a complete neural network using ONLY NumPy - no deep learning frameworks.

### Concepts Applied
- Matrix multiplication
- Forward propagation
- Backpropagation
- Gradient descent
- Activation functions

### Complete Implementation

```python
"""
Neural Network from Scratch
============================
A complete implementation using only NumPy.
No PyTorch, TensorFlow, or any ML libraries.
"""

import numpy as np
import matplotlib.pyplot as plt

# ==================== ACTIVATION FUNCTIONS ====================

class Activations:
    @staticmethod
    def relu(z):
        return np.maximum(0, z)
    
    @staticmethod
    def relu_derivative(z):
        return (z > 0).astype(float)
    
    @staticmethod
    def sigmoid(z):
        z = np.clip(z, -500, 500)  # Prevent overflow
        return 1 / (1 + np.exp(-z))
    
    @staticmethod
    def sigmoid_derivative(a):
        return a * (1 - a)
    
    @staticmethod
    def softmax(z):
        exp_z = np.exp(z - np.max(z, axis=1, keepdims=True))
        return exp_z / np.sum(exp_z, axis=1, keepdims=True)


# ==================== LOSS FUNCTIONS ====================

class Losses:
    @staticmethod
    def binary_cross_entropy(y_true, y_pred):
        epsilon = 1e-15
        y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
        return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))
    
    @staticmethod
    def categorical_cross_entropy(y_true, y_pred):
        epsilon = 1e-15
        y_pred = np.clip(y_pred, epsilon, 1 - epsilon)
        return -np.mean(np.sum(y_true * np.log(y_pred), axis=1))
    
    @staticmethod
    def mse(y_true, y_pred):
        return np.mean((y_true - y_pred) ** 2)


# ==================== NEURAL NETWORK ====================

class NeuralNetwork:
    """
    A flexible neural network implementation from scratch.
    
    Example usage:
        nn = NeuralNetwork([784, 128, 64, 10], activation='relu', output='softmax')
        nn.train(X_train, y_train, epochs=100, lr=0.01, batch_size=32)
        predictions = nn.predict(X_test)
    """
    
    def __init__(self, layer_sizes, activation='relu', output='softmax'):
        """
        Parameters:
        -----------
        layer_sizes : list
            Number of neurons in each layer, e.g., [784, 128, 64, 10]
        activation : str
            Activation for hidden layers: 'relu', 'sigmoid', 'tanh'
        output : str
            Output activation: 'softmax', 'sigmoid', 'linear'
        """
        self.layer_sizes = layer_sizes
        self.n_layers = len(layer_sizes)
        self.activation_name = activation
        self.output_name = output
        
        # Initialize weights using He initialization
        self.weights = []
        self.biases = []
        
        for i in range(self.n_layers - 1):
            # He initialization for ReLU
            scale = np.sqrt(2.0 / layer_sizes[i])
            w = np.random.randn(layer_sizes[i], layer_sizes[i + 1]) * scale
            b = np.zeros((1, layer_sizes[i + 1]))
            
            self.weights.append(w)
            self.biases.append(b)
        
        # Set activation functions
        if activation == 'relu':
            self.activation = Activations.relu
            self.activation_derivative = Activations.relu_derivative
        elif activation == 'sigmoid':
            self.activation = Activations.sigmoid
            self.activation_derivative = lambda z: Activations.sigmoid_derivative(Activations.sigmoid(z))
        
        if output == 'softmax':
            self.output_activation = Activations.softmax
        elif output == 'sigmoid':
            self.output_activation = Activations.sigmoid
        else:
            self.output_activation = lambda x: x  # Linear
    
    def forward(self, X):
        """Forward propagation"""
        self.activations = [X]
        self.z_values = []
        
        current = X
        
        # Hidden layers
        for i in range(self.n_layers - 2):
            z = current @ self.weights[i] + self.biases[i]
            self.z_values.append(z)
            current = self.activation(z)
            self.activations.append(current)
        
        # Output layer
        z = current @ self.weights[-1] + self.biases[-1]
        self.z_values.append(z)
        output = self.output_activation(z)
        self.activations.append(output)
        
        return output
    
    def backward(self, y_true):
        """Backpropagation - compute gradients"""
        m = y_true.shape[0]
        
        self.d_weights = [None] * len(self.weights)
        self.d_biases = [None] * len(self.biases)
        
        # Output layer gradient (for softmax + cross-entropy or sigmoid + BCE)
        delta = self.activations[-1] - y_true
        
        # Compute gradients from output to input
        for i in range(self.n_layers - 2, -1, -1):
            # Gradient for weights and biases
            self.d_weights[i] = self.activations[i].T @ delta / m
            self.d_biases[i] = np.mean(delta, axis=0, keepdims=True)
            
            # Backpropagate to previous layer
            if i > 0:
                delta = delta @ self.weights[i].T
                delta = delta * self.activation_derivative(self.z_values[i - 1])
    
    def update(self, lr):
        """Update weights using computed gradients"""
        for i in range(len(self.weights)):
            self.weights[i] -= lr * self.d_weights[i]
            self.biases[i] -= lr * self.d_biases[i]
    
    def train(self, X, y, epochs=100, lr=0.01, batch_size=32, 
              validation_data=None, print_every=10):
        """
        Train the neural network.
        
        Parameters:
        -----------
        X : ndarray
            Training features, shape (n_samples, n_features)
        y : ndarray
            Training labels, shape (n_samples, n_classes) for classification
        epochs : int
            Number of training epochs
        lr : float
            Learning rate
        batch_size : int
            Mini-batch size
        validation_data : tuple
            (X_val, y_val) for validation
        print_every : int
            Print progress every N epochs
        """
        n_samples = X.shape[0]
        history = {'loss': [], 'accuracy': [], 'val_loss': [], 'val_accuracy': []}
        
        for epoch in range(epochs):
            # Shuffle data
            indices = np.random.permutation(n_samples)
            X_shuffled = X[indices]
            y_shuffled = y[indices]
            
            epoch_loss = 0
            n_batches = 0
            
            # Mini-batch training
            for start in range(0, n_samples, batch_size):
                end = min(start + batch_size, n_samples)
                X_batch = X_shuffled[start:end]
                y_batch = y_shuffled[start:end]
                
                # Forward pass
                output = self.forward(X_batch)
                
                # Compute loss
                if self.output_name == 'softmax':
                    loss = Losses.categorical_cross_entropy(y_batch, output)
                else:
                    loss = Losses.binary_cross_entropy(y_batch, output)
                
                epoch_loss += loss
                n_batches += 1
                
                # Backward pass
                self.backward(y_batch)
                
                # Update weights
                self.update(lr)
            
            # Compute metrics
            avg_loss = epoch_loss / n_batches
            train_acc = self.evaluate(X, y)
            
            history['loss'].append(avg_loss)
            history['accuracy'].append(train_acc)
            
            # Validation
            if validation_data is not None:
                X_val, y_val = validation_data
                val_output = self.forward(X_val)
                if self.output_name == 'softmax':
                    val_loss = Losses.categorical_cross_entropy(y_val, val_output)
                else:
                    val_loss = Losses.binary_cross_entropy(y_val, val_output)
                val_acc = self.evaluate(X_val, y_val)
                history['val_loss'].append(val_loss)
                history['val_accuracy'].append(val_acc)
            
            # Print progress
            if epoch % print_every == 0:
                msg = f"Epoch {epoch}/{epochs} - Loss: {avg_loss:.4f}, Acc: {train_acc:.2f}%"
                if validation_data is not None:
                    msg += f", Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%"
                print(msg)
        
        return history
    
    def predict(self, X):
        """Make predictions"""
        output = self.forward(X)
        if self.output_name in ['softmax', 'sigmoid']:
            return np.argmax(output, axis=1)
        return output
    
    def predict_proba(self, X):
        """Get probability predictions"""
        return self.forward(X)
    
    def evaluate(self, X, y):
        """Evaluate accuracy"""
        predictions = self.predict(X)
        if len(y.shape) > 1:
            y_labels = np.argmax(y, axis=1)
        else:
            y_labels = y
        accuracy = np.mean(predictions == y_labels) * 100
        return accuracy


# ==================== DEMO: MNIST Classification ====================

def load_mnist_subset():
    """Load a small subset of MNIST for demo"""
    # Create synthetic MNIST-like data for demo
    # In practice, use sklearn.datasets.load_digits() or actual MNIST
    
    np.random.seed(42)
    
    # 1000 samples, 64 features (8x8 digits)
    n_samples = 1000
    n_features = 64
    n_classes = 10
    
    X = np.random.randn(n_samples, n_features)
    y = np.random.randint(0, n_classes, n_samples)
    
    # One-hot encode
    y_onehot = np.zeros((n_samples, n_classes))
    y_onehot[np.arange(n_samples), y] = 1
    
    # Split
    split = int(0.8 * n_samples)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y_onehot[:split], y_onehot[split:]
    
    return X_train, y_train, X_test, y_test


def demo_neural_network():
    """Demo the neural network on a classification task"""
    
    print("=" * 60)
    print("NEURAL NETWORK FROM SCRATCH - DEMO")
    print("=" * 60)
    
    # Load data
    X_train, y_train, X_test, y_test = load_mnist_subset()
    print(f"\nData shapes:")
    print(f"  X_train: {X_train.shape}")
    print(f"  y_train: {y_train.shape}")
    print(f"  X_test: {X_test.shape}")
    print(f"  y_test: {y_test.shape}")
    
    # Create model
    model = NeuralNetwork(
        layer_sizes=[64, 128, 64, 10],
        activation='relu',
        output='softmax'
    )
    
    print(f"\nModel architecture: {model.layer_sizes}")
    print(f"Activation: {model.activation_name}")
    print(f"Output: {model.output_name}")
    
    # Train
    print("\nTraining...")
    history = model.train(
        X_train, y_train,
        epochs=100,
        lr=0.01,
        batch_size=32,
        validation_data=(X_test, y_test),
        print_every=20
    )
    
    # Final evaluation
    final_acc = model.evaluate(X_test, y_test)
    print(f"\nFinal Test Accuracy: {final_acc:.2f}%")
    
    # Plot training history
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    
    axes[0].plot(history['loss'], label='Train')
    if history['val_loss']:
        axes[0].plot(history['val_loss'], label='Validation')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].set_title('Loss over Training')
    axes[0].legend()
    
    axes[1].plot(history['accuracy'], label='Train')
    if history['val_accuracy']:
        axes[1].plot(history['val_accuracy'], label='Validation')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy (%)')
    axes[1].set_title('Accuracy over Training')
    axes[1].legend()
    
    plt.tight_layout()
    plt.savefig('training_history.png')
    plt.show()
    
    return model


# Run demo
if __name__ == "__main__":
    model = demo_neural_network()
```

### What You Learned
- Implementing matrix operations for neural networks
- Forward and backward propagation from scratch
- Gradient descent optimization
- Training loops with mini-batches

---

## 📸 Project 2: MNIST Classifier with PyTorch

### Goal
Build a production-quality image classifier using PyTorch.

### Complete Implementation

```python
"""
MNIST Classifier with PyTorch
==============================
Complete training pipeline with best practices.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt
import numpy as np
from tqdm import tqdm

# ==================== CONFIGURATION ====================

class Config:
    # Data
    batch_size = 64
    num_workers = 2
    
    # Model
    model_type = 'cnn'  # 'fnn' or 'cnn'
    
    # Training
    epochs = 10
    learning_rate = 0.001
    weight_decay = 1e-5
    
    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


# ==================== DATA LOADING ====================

def get_data_loaders(config):
    """Create train and test data loaders"""
    
    # Data augmentation for training
    train_transform = transforms.Compose([
        transforms.RandomRotation(10),
        transforms.RandomAffine(0, translate=(0.1, 0.1)),
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    # Only normalization for testing
    test_transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    # Load datasets
    train_dataset = datasets.MNIST(
        root='./data',
        train=True,
        download=True,
        transform=train_transform
    )
    
    test_dataset = datasets.MNIST(
        root='./data',
        train=False,
        download=True,
        transform=test_transform
    )
    
    # Create data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=config.batch_size,
        shuffle=True,
        num_workers=config.num_workers,
        pin_memory=True
    )
    
    test_loader = DataLoader(
        test_dataset,
        batch_size=config.batch_size,
        shuffle=False,
        num_workers=config.num_workers,
        pin_memory=True
    )
    
    return train_loader, test_loader


# ==================== MODELS ====================

class FNN(nn.Module):
    """Feedforward Neural Network for MNIST"""
    
    def __init__(self):
        super().__init__()
        
        self.network = nn.Sequential(
            nn.Flatten(),
            nn.Linear(784, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.3),
            
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            
            nn.Linear(128, 10)
        )
    
    def forward(self, x):
        return self.network(x)


class CNN(nn.Module):
    """Convolutional Neural Network for MNIST"""
    
    def __init__(self):
        super().__init__()
        
        self.features = nn.Sequential(
            # Block 1: 28x28x1 -> 14x14x32
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.25),
            
            # Block 2: 14x14x32 -> 7x7x64
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.25),
        )
        
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 7 * 7, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 10)
        )
    
    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x


# ==================== TRAINING ====================

def train_epoch(model, train_loader, criterion, optimizer, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0
    correct = 0
    total = 0
    
    for images, labels in tqdm(train_loader, desc='Training', leave=False):
        images, labels = images.to(device), labels.to(device)
        
        # Forward pass
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        
        # Backward pass
        loss.backward()
        optimizer.step()
        
        # Statistics
        total_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
    
    return total_loss / len(train_loader), 100 * correct / total


def evaluate(model, test_loader, criterion, device):
    """Evaluate the model"""
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for images, labels in tqdm(test_loader, desc='Evaluating', leave=False):
            images, labels = images.to(device), labels.to(device)
            
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
    
    return total_loss / len(test_loader), 100 * correct / total


def train(config):
    """Complete training pipeline"""
    
    print("=" * 60)
    print("MNIST CLASSIFIER - PYTORCH")
    print("=" * 60)
    print(f"Device: {config.device}")
    print(f"Model: {config.model_type.upper()}")
    
    # Data
    train_loader, test_loader = get_data_loaders(config)
    print(f"Training samples: {len(train_loader.dataset)}")
    print(f"Test samples: {len(test_loader.dataset)}")
    
    # Model
    if config.model_type == 'cnn':
        model = CNN().to(config.device)
    else:
        model = FNN().to(config.device)
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Total parameters: {total_params:,}")
    print(f"Trainable parameters: {trainable_params:,}")
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(
        model.parameters(),
        lr=config.learning_rate,
        weight_decay=config.weight_decay
    )
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', factor=0.5, patience=2
    )
    
    # Training loop
    history = {'train_loss': [], 'train_acc': [], 'test_loss': [], 'test_acc': []}
    best_acc = 0
    
    print("\nTraining...")
    print("-" * 60)
    
    for epoch in range(config.epochs):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, config.device)
        test_loss, test_acc = evaluate(model, test_loader, criterion, config.device)
        
        # Update scheduler
        scheduler.step(test_acc)
        
        # Save history
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc)
        history['test_loss'].append(test_loss)
        history['test_acc'].append(test_acc)
        
        # Save best model
        if test_acc > best_acc:
            best_acc = test_acc
            torch.save(model.state_dict(), 'best_model.pth')
        
        print(f"Epoch {epoch+1}/{config.epochs} | "
              f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Test Loss: {test_loss:.4f} | Test Acc: {test_acc:.2f}%")
    
    print("-" * 60)
    print(f"Best Test Accuracy: {best_acc:.2f}%")
    
    # Plot results
    plot_history(history)
    
    # Visualize predictions
    visualize_predictions(model, test_loader, config.device)
    
    return model, history


def plot_history(history):
    """Plot training history"""
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    
    # Loss
    axes[0].plot(history['train_loss'], label='Train')
    axes[0].plot(history['test_loss'], label='Test')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].set_title('Loss over Training')
    axes[0].legend()
    
    # Accuracy
    axes[1].plot(history['train_acc'], label='Train')
    axes[1].plot(history['test_acc'], label='Test')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy (%)')
    axes[1].set_title('Accuracy over Training')
    axes[1].legend()
    
    plt.tight_layout()
    plt.savefig('mnist_training_history.png')
    plt.show()


def visualize_predictions(model, test_loader, device):
    """Visualize model predictions"""
    model.eval()
    
    # Get a batch of test images
    images, labels = next(iter(test_loader))
    images, labels = images.to(device), labels.to(device)
    
    with torch.no_grad():
        outputs = model(images)
        _, predictions = outputs.max(1)
    
    # Plot
    fig, axes = plt.subplots(3, 6, figsize=(12, 6))
    
    for i, ax in enumerate(axes.flat):
        if i >= len(images):
            break
        
        img = images[i].cpu().squeeze().numpy()
        pred = predictions[i].item()
        true = labels[i].item()
        
        ax.imshow(img, cmap='gray')
        color = 'green' if pred == true else 'red'
        ax.set_title(f'Pred: {pred}\nTrue: {true}', color=color, fontsize=10)
        ax.axis('off')
    
    plt.suptitle('Model Predictions (Green=Correct, Red=Wrong)')
    plt.tight_layout()
    plt.savefig('mnist_predictions.png')
    plt.show()


# ==================== MAIN ====================

if __name__ == "__main__":
    config = Config()
    model, history = train(config)
```

### What You Learned
- PyTorch training pipeline
- Data augmentation
- Learning rate scheduling
- Model checkpointing
- Visualization

---

## 🔄 Project 3: Autoencoder for MNIST

### Goal
Build an autoencoder that learns to compress and reconstruct images.

### What is an Autoencoder?

```
Input → ENCODER → Bottleneck (compressed) → DECODER → Reconstruction
[784] → [256] → [64] → [32] → [64] → [256] → [784]
                       ↑
                 Latent space
                 (learned features)
```

### Complete Implementation

```python
"""
Autoencoder for MNIST
======================
Unsupervised learning for compression and feature learning.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import matplotlib.pyplot as plt
import numpy as np

# ==================== AUTOENCODER MODELS ====================

class LinearAutoencoder(nn.Module):
    """Simple fully-connected autoencoder"""
    
    def __init__(self, input_dim=784, latent_dim=32):
        super().__init__()
        
        # Encoder: compress input to latent space
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, latent_dim),
        )
        
        # Decoder: reconstruct from latent space
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 128),
            nn.ReLU(),
            nn.Linear(128, 256),
            nn.ReLU(),
            nn.Linear(256, input_dim),
            nn.Sigmoid()  # Output in [0, 1]
        )
    
    def encode(self, x):
        return self.encoder(x)
    
    def decode(self, z):
        return self.decoder(z)
    
    def forward(self, x):
        z = self.encode(x)
        return self.decode(z)


class ConvAutoencoder(nn.Module):
    """Convolutional autoencoder for better image reconstruction"""
    
    def __init__(self, latent_dim=32):
        super().__init__()
        
        # Encoder
        self.encoder = nn.Sequential(
            # 28x28x1 -> 14x14x32
            nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            
            # 14x14x32 -> 7x7x64
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            
            # 7x7x64 -> 4x4x128
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            
            # Flatten and project to latent
            nn.Flatten(),
            nn.Linear(128 * 4 * 4, latent_dim)
        )
        
        # Decoder
        self.decoder_linear = nn.Linear(latent_dim, 128 * 4 * 4)
        
        self.decoder = nn.Sequential(
            # 4x4x128 -> 7x7x64
            nn.ConvTranspose2d(128, 64, kernel_size=3, stride=2, padding=1, output_padding=0),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            
            # 7x7x64 -> 14x14x32
            nn.ConvTranspose2d(64, 32, kernel_size=3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            
            # 14x14x32 -> 28x28x1
            nn.ConvTranspose2d(32, 1, kernel_size=3, stride=2, padding=1, output_padding=1),
            nn.Sigmoid()
        )
    
    def encode(self, x):
        return self.encoder(x)
    
    def decode(self, z):
        x = self.decoder_linear(z)
        x = x.view(-1, 128, 4, 4)
        return self.decoder(x)
    
    def forward(self, x):
        z = self.encode(x)
        return self.decode(z)


# ==================== TRAINING ====================

def train_autoencoder(model, train_loader, test_loader, epochs=20, lr=0.001, device='cpu'):
    """Train the autoencoder"""
    
    model = model.to(device)
    criterion = nn.MSELoss()  # Reconstruction loss
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    history = {'train_loss': [], 'test_loss': []}
    
    print("Training Autoencoder...")
    print("-" * 50)
    
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0
        
        for images, _ in train_loader:  # Ignore labels - unsupervised!
            images = images.to(device)
            
            # For linear model, flatten images
            if isinstance(model, LinearAutoencoder):
                images_flat = images.view(images.size(0), -1)
                reconstruction = model(images_flat)
                loss = criterion(reconstruction, images_flat)
            else:
                reconstruction = model(images)
                loss = criterion(reconstruction, images)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
        
        train_loss /= len(train_loader)
        
        # Testing
        model.eval()
        test_loss = 0
        
        with torch.no_grad():
            for images, _ in test_loader:
                images = images.to(device)
                
                if isinstance(model, LinearAutoencoder):
                    images_flat = images.view(images.size(0), -1)
                    reconstruction = model(images_flat)
                    loss = criterion(reconstruction, images_flat)
                else:
                    reconstruction = model(images)
                    loss = criterion(reconstruction, images)
                
                test_loss += loss.item()
        
        test_loss /= len(test_loader)
        
        history['train_loss'].append(train_loss)
        history['test_loss'].append(test_loss)
        
        print(f"Epoch {epoch+1}/{epochs} | "
              f"Train Loss: {train_loss:.6f} | Test Loss: {test_loss:.6f}")
    
    return model, history


def visualize_reconstructions(model, test_loader, device, n_images=10):
    """Show original vs reconstructed images"""
    
    model.eval()
    images, _ = next(iter(test_loader))
    images = images[:n_images].to(device)
    
    with torch.no_grad():
        if isinstance(model, LinearAutoencoder):
            images_flat = images.view(images.size(0), -1)
            reconstructions = model(images_flat).view(-1, 1, 28, 28)
        else:
            reconstructions = model(images)
    
    # Plot
    fig, axes = plt.subplots(2, n_images, figsize=(15, 3))
    
    for i in range(n_images):
        # Original
        axes[0, i].imshow(images[i].cpu().squeeze(), cmap='gray')
        axes[0, i].axis('off')
        if i == 0:
            axes[0, i].set_title('Original', fontsize=10)
        
        # Reconstruction
        axes[1, i].imshow(reconstructions[i].cpu().squeeze(), cmap='gray')
        axes[1, i].axis('off')
        if i == 0:
            axes[1, i].set_title('Reconstructed', fontsize=10)
    
    plt.suptitle('Autoencoder Reconstructions')
    plt.tight_layout()
    plt.savefig('autoencoder_reconstructions.png')
    plt.show()


def visualize_latent_space(model, test_loader, device):
    """Visualize the learned latent space"""
    
    model.eval()
    latent_vectors = []
    labels = []
    
    with torch.no_grad():
        for images, targets in test_loader:
            images = images.to(device)
            
            if isinstance(model, LinearAutoencoder):
                images = images.view(images.size(0), -1)
            
            z = model.encode(images)
            latent_vectors.append(z.cpu().numpy())
            labels.append(targets.numpy())
    
    latent_vectors = np.concatenate(latent_vectors, axis=0)
    labels = np.concatenate(labels, axis=0)
    
    # If latent dim > 2, use PCA or t-SNE
    if latent_vectors.shape[1] > 2:
        from sklearn.decomposition import PCA
        pca = PCA(n_components=2)
        latent_2d = pca.fit_transform(latent_vectors)
    else:
        latent_2d = latent_vectors
    
    # Plot
    plt.figure(figsize=(10, 8))
    scatter = plt.scatter(latent_2d[:, 0], latent_2d[:, 1], 
                         c=labels, cmap='tab10', alpha=0.6, s=10)
    plt.colorbar(scatter, label='Digit')
    plt.xlabel('Latent Dimension 1')
    plt.ylabel('Latent Dimension 2')
    plt.title('Latent Space Visualization')
    plt.savefig('latent_space.png')
    plt.show()


def interpolate_latent(model, test_loader, device, n_steps=10):
    """Interpolate between two images in latent space"""
    
    model.eval()
    
    # Get two random images
    images, labels = next(iter(test_loader))
    idx1, idx2 = 0, 1  # First two images
    
    img1 = images[idx1:idx1+1].to(device)
    img2 = images[idx2:idx2+1].to(device)
    
    with torch.no_grad():
        if isinstance(model, LinearAutoencoder):
            z1 = model.encode(img1.view(1, -1))
            z2 = model.encode(img2.view(1, -1))
        else:
            z1 = model.encode(img1)
            z2 = model.encode(img2)
        
        # Interpolate
        interpolations = []
        for alpha in np.linspace(0, 1, n_steps):
            z = (1 - alpha) * z1 + alpha * z2
            img = model.decode(z)
            if isinstance(model, LinearAutoencoder):
                img = img.view(1, 1, 28, 28)
            interpolations.append(img.cpu().squeeze())
    
    # Plot
    fig, axes = plt.subplots(1, n_steps, figsize=(15, 2))
    for i, img in enumerate(interpolations):
        axes[i].imshow(img, cmap='gray')
        axes[i].axis('off')
    
    plt.suptitle(f'Interpolation: {labels[idx1].item()} → {labels[idx2].item()}')
    plt.tight_layout()
    plt.savefig('latent_interpolation.png')
    plt.show()


# ==================== MAIN ====================

def main():
    print("=" * 60)
    print("AUTOENCODER FOR MNIST")
    print("=" * 60)
    
    # Settings
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")
    
    # Data
    transform = transforms.Compose([
        transforms.ToTensor(),
    ])
    
    train_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
    test_dataset = datasets.MNIST('./data', train=False, transform=transform)
    
    train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=128, shuffle=False)
    
    # Train Linear Autoencoder
    print("\n--- Linear Autoencoder ---")
    linear_ae = LinearAutoencoder(latent_dim=32)
    linear_ae, history1 = train_autoencoder(linear_ae, train_loader, test_loader, 
                                            epochs=20, device=device)
    
    visualize_reconstructions(linear_ae, test_loader, device)
    
    # Train Convolutional Autoencoder
    print("\n--- Convolutional Autoencoder ---")
    conv_ae = ConvAutoencoder(latent_dim=32)
    conv_ae, history2 = train_autoencoder(conv_ae, train_loader, test_loader,
                                          epochs=20, device=device)
    
    visualize_reconstructions(conv_ae, test_loader, device)
    visualize_latent_space(conv_ae, test_loader, device)
    interpolate_latent(conv_ae, test_loader, device)
    
    # Compare
    plt.figure(figsize=(10, 4))
    plt.plot(history1['test_loss'], label='Linear AE')
    plt.plot(history2['test_loss'], label='Conv AE')
    plt.xlabel('Epoch')
    plt.ylabel('Test Loss')
    plt.title('Autoencoder Comparison')
    plt.legend()
    plt.savefig('autoencoder_comparison.png')
    plt.show()


if __name__ == "__main__":
    main()
```

### What You Learned
- Unsupervised learning (no labels needed!)
- Encoder-decoder architecture
- Latent space representations
- Image reconstruction
- Interpolation in latent space

---

## 📝 Project Extensions

### Ideas to Practice More

1. **Add regularization** to the autoencoder (VAE)
2. **Denoise images** by training on noisy inputs
3. **Transfer learning** - use pretrained models
4. **Data augmentation** - experiment with different transforms
5. **Hyperparameter tuning** - grid search for best settings

---

## ✅ Week 1 Projects Complete!

You've now built:
1. ✅ Neural network from scratch (understanding internals)
2. ✅ CNN classifier with PyTorch (production practices)
3. ✅ Autoencoder (unsupervised learning)

**You're ready for Week 2: Generative Models!** 🚀

---

## 🔜 Next Up

Continue to → [07-Interview-QA.md](./07-Interview-QA.md)

Review interview questions covering all Week 1 topics!
