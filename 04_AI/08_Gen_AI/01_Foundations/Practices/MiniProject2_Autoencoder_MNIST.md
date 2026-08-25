# 🚀 Mini Project 2: Autoencoder on MNIST



## 📑 Table of Contents

- [🎯 Project Goal](#project-goal)
- [📚 Prerequisites](#prerequisites)
- [🧠 Conceptual Understanding (JavaScript Analogy)](#conceptual-understanding-javascript-analogy)
- [🛠️ Part 1: Basic Autoencoder](#part-1-basic-autoencoder)
- [🎨 Part 2: Convolutional Autoencoder](#part-2-convolutional-autoencoder)
- [🧪 Part 3: Denoising Autoencoder](#part-3-denoising-autoencoder)
- [🎯 Part 4: Applications](#part-4-applications)
- [📊 Expected Results](#expected-results)
- [🎯 Key Learnings](#key-learnings)
- [🚀 Challenges](#challenges)
- [📝 Challenge Questions](#challenge-questions)
- [✅ Success Checklist](#success-checklist)
- [🎓 Congratulations!](#congratulations)

---

## 🎯 Project Goal

Build an **Autoencoder** to learn compressed representations of handwritten digits and reconstruct them.

**What you'll learn:**
- Unsupervised learning (no labels needed!)
- Dimensionality reduction
- Encoder-Decoder architecture
- Feature learning
- Image denoising and compression

**Time:** 2-3 hours

---

## 📚 Prerequisites

You should have completed:
- ✅ Neural Networks Basics
- ✅ Mini Project 1 (Simple Neural Network)
- ✅ Understanding of forward/backward propagation

---

## 🧠 Conceptual Understanding (JavaScript Analogy)

### What is an Autoencoder?

```javascript
// Autoencoder = Compression + Decompression
const autoencoder = {
  analogy: 'Like .zip files but learned from data!',
  
  process: {
    input: 'Original image (784 pixels = 6,272 bits)',
    encoder: 'Compress to small code (32 numbers = 256 bits)',
    decoder: 'Reconstruct back to 784 pixels',
    goal: 'Reconstructed ≈ Original (despite compression!)'
  },
  
  comparison: {
    traditional_compression: {
      method: 'Hand-designed rules (JPEG, PNG)',
      example: 'JPEG: Use DCT, quantization, Huffman coding',
      limitation: 'Generic - works OK for all images'
    },
    
    autoencoder: {
      method: 'Learn compression from your specific data',
      example: 'Learns: "Digits have edges, curves, loops"',
      advantage: 'Optimized for YOUR data (better compression!)'
    }
  }
};

// JavaScript analogy
class AutoencoderAnalogy {
  constructor() {
    this.compressionRatio = 784 / 32;  // 24.5x compression!
  }
  
  // Encoder = Compression algorithm
  encode(originalImage) {
    // Input: [0, 0, 0, 255, 255, 0, ...]  (784 numbers)
    // Output: [0.5, -0.3, 0.8, ...]       (32 numbers)
    
    const compressed = this.extractEssentialFeatures(originalImage);
    
    // Like JavaScript object destructuring - keep only important parts
    const { hasLoop, hasVerticalLine, hasHorizontalLine, curvature } = compressed;
    
    return compressed;  // Much smaller!
  }
  
  // Decoder = Decompression algorithm
  decode(compressedCode) {
    // Input: [0.5, -0.3, 0.8, ...]       (32 numbers)
    // Output: [0, 0, 0, 255, 255, 0, ...] (784 numbers)
    
    const reconstructed = this.reconstructFromFeatures(compressedCode);
    
    return reconstructed;  // Looks like original!
  }
  
  // Full cycle
  process(image) {
    const compressed = this.encode(image);    // 784 → 32
    const reconstructed = this.decode(compressed);  // 32 → 784
    
    const loss = this.calculateDifference(image, reconstructed);
    
    // Training: Minimize loss = Make reconstruction better
    this.updateWeights(loss);
    
    return reconstructed;
  }
}

// Real-world analogy
const realWorldExample = {
  problem: 'Store 60,000 MNIST images',
  
  without_autoencoder: {
    storage: '60,000 × 784 pixels × 1 byte = 47 MB',
    method: 'Store raw pixels'
  },
  
  with_autoencoder: {
    storage: '60,000 × 32 numbers × 4 bytes = 7.6 MB',
    method: 'Store compressed codes',
    savings: '84% reduction!',
    quality: 'Visually similar to originals'
  }
};
```

### How Autoencoder Learns (No Labels!)

```javascript
// Unlike classification (needs labels)
const classification = {
  training_data: [
    { image: [0, 0, 255, ...], label: 7 },  // "This is a 7"
    { image: [255, 255, 0, ...], label: 3 }, // "This is a 3"
  ],
  
  supervised: 'YES - needs labels'
};

// Autoencoder (no labels needed!)
const autoencoder = {
  training_data: [
    { image: [0, 0, 255, ...] },  // No label!
    { image: [255, 255, 0, ...] }, // No label!
  ],
  
  supervised: 'NO - self-supervised',
  
  learning_process: {
    step1: 'Compress image',
    step2: 'Try to reconstruct',
    step3: 'Compare: Original vs Reconstructed',
    step4: 'Adjust weights to reduce difference',
    step5: 'Repeat until reconstruction is good'
  },
  
  insight: 'Input = Target! (image tries to reconstruct itself)'
};

// Training process
const trainingStep = {
  input_image: [0, 0, 0, 255, 255, ...],  // Original
  
  forward_pass: {
    encoding: [0.5, -0.3, 0.8, ...],      // Compress
    decoding: [0, 5, 2, 250, 248, ...]    // Reconstruct
  },
  
  loss: 'Mean Squared Error between original and reconstructed',
  
  backward_pass: {
    goal: 'Adjust encoder & decoder weights',
    result: 'Better reconstruction next time'
  }
};
```

### The Bottleneck Architecture

```javascript
// Why the bottleneck forces learning
const architectureInsight = {
  input_layer: 784,    // Original image
  hidden1: 256,        // Start compressing
  hidden2: 128,        // More compression
  bottleneck: 32,      // SMALLEST POINT (forced to learn essentials!)
  hidden3: 128,        // Start expanding
  hidden4: 256,        // More expansion
  output: 784,         // Reconstructed image
  
  key_insight: {
    bottleneck: 'Only 32 numbers to represent entire image!',
    forces_learning: 'Network MUST learn most important features',
    
    analogy: 'Like summarizing a book in one paragraph',
    
    what_it_learns: [
      'Digit edges',
      'Curves and loops',
      'Stroke orientations',
      'Symmetries',
      'Common patterns'
    ],
    
    what_it_ignores: [
      'Pixel noise',
      'Irrelevant details',
      'Unique variations',
      'Background'
    ]
  }
};

// Like JavaScript compression
const compressionAnalogy = {
  verbose_code: `
    const result1 = data.filter(x => x > 0).map(x => x * 2);
    const result2 = data.filter(x => x > 0).map(x => x * 3);
    const result3 = data.filter(x => x > 0).map(x => x * 4);
  `,
  
  compressed_code: `
    const positive = data.filter(x => x > 0);
    const result1 = positive.map(x => x * 2);
    const result2 = positive.map(x => x * 3);
    const result3 = positive.map(x => x * 4);
  `,
  
  insight: 'Extract common pattern (positive.filter) once, reuse many times',
  
  autoencoder_equivalent: 'Extract essential features once, use to reconstruct'
};
```

---

## 🛠️ Part 1: Basic Autoencoder

```python
# autoencoder_basic.py
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.datasets import mnist

class BasicAutoencoder:
    """
    Simple Autoencoder for MNIST
    
    Architecture:
    Input (784) → Encoder → Bottleneck (32) → Decoder → Output (784)
    
    Goal: Output ≈ Input (reconstruction)
    """
    
    def __init__(self, encoding_dim=32):
        """
        encoding_dim: Size of compressed representation
        Higher = better reconstruction, less compression
        Lower = worse reconstruction, more compression
        """
        self.encoding_dim = encoding_dim
        self.input_dim = 784
        
        # Build encoder
        self.encoder = self.build_encoder()
        
        # Build decoder
        self.decoder = self.build_decoder()
        
        # Full autoencoder
        self.autoencoder = self.build_autoencoder()
        
        print(f"✅ Autoencoder created!")
        print(f"   Input dimension: {self.input_dim}")
        print(f"   Encoding dimension: {self.encoding_dim}")
        print(f"   Compression ratio: {self.input_dim / self.encoding_dim:.1f}x")
        
    def build_encoder(self):
        """
        Encoder: Compress input to small representation
        
        784 → 256 → 128 → 32
        """
        encoder_input = keras.Input(shape=(self.input_dim,), name='input')
        
        # Gradually compress
        x = layers.Dense(256, activation='relu', name='encoder_dense1')(encoder_input)
        x = layers.Dense(128, activation='relu', name='encoder_dense2')(x)
        
        # Bottleneck (compressed representation)
        encoded = layers.Dense(self.encoding_dim, activation='relu', name='bottleneck')(x)
        
        encoder = Model(encoder_input, encoded, name='encoder')
        return encoder
    
    def build_decoder(self):
        """
        Decoder: Reconstruct from compressed representation
        
        32 → 128 → 256 → 784
        """
        decoder_input = keras.Input(shape=(self.encoding_dim,), name='encoded_input')
        
        # Gradually expand
        x = layers.Dense(128, activation='relu', name='decoder_dense1')(decoder_input)
        x = layers.Dense(256, activation='relu', name='decoder_dense2')(x)
        
        # Reconstruction (same size as input)
        decoded = layers.Dense(self.input_dim, activation='sigmoid', name='output')(x)
        
        decoder = Model(decoder_input, decoded, name='decoder')
        return decoder
    
    def build_autoencoder(self):
        """
        Full autoencoder: Input → Encoder → Decoder → Output
        """
        autoencoder_input = keras.Input(shape=(self.input_dim,), name='input')
        
        # Encode
        encoded = self.encoder(autoencoder_input)
        
        # Decode
        decoded = self.decoder(encoded)
        
        # Full model
        autoencoder = Model(autoencoder_input, decoded, name='autoencoder')
        
        # Compile
        autoencoder.compile(
            optimizer='adam',
            loss='mse',  # Mean Squared Error (pixel-wise difference)
            metrics=['mae']  # Mean Absolute Error
        )
        
        return autoencoder
    
    def train(self, X_train, X_val, epochs=50, batch_size=256):
        """
        Train autoencoder
        
        Key: input = target (unsupervised!)
        """
        print("\n🚀 Training autoencoder...")
        
        history = self.autoencoder.fit(
            X_train, X_train,  # Input = Target!
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(X_val, X_val),  # Input = Target!
            shuffle=True,
            verbose=1
        )
        
        print("✅ Training complete!")
        return history.history
    
    def encode(self, X):
        """Compress images to codes"""
        return self.encoder.predict(X, verbose=0)
    
    def decode(self, codes):
        """Reconstruct images from codes"""
        return self.decoder.predict(codes, verbose=0)
    
    def reconstruct(self, X):
        """Full reconstruction: encode → decode"""
        return self.autoencoder.predict(X, verbose=0)
    
    def summary(self):
        """Print model summaries"""
        print("\n" + "="*60)
        print("ENCODER:")
        print("="*60)
        self.encoder.summary()
        
        print("\n" + "="*60)
        print("DECODER:")
        print("="*60)
        self.decoder.summary()
        
        print("\n" + "="*60)
        print("FULL AUTOENCODER:")
        print("="*60)
        self.autoencoder.summary()


def load_and_prepare_data():
    """Load and preprocess MNIST"""
    print("📥 Loading MNIST dataset...")
    
    (X_train, _), (X_test, _) = mnist.load_data()
    
    # Normalize to [0, 1]
    X_train = X_train.astype('float32') / 255.0
    X_test = X_test.astype('float32') / 255.0
    
    # Flatten
    X_train = X_train.reshape(-1, 784)
    X_test = X_test.reshape(-1, 784)
    
    print(f"✅ Data loaded!")
    print(f"   Training samples: {X_train.shape[0]:,}")
    print(f"   Test samples: {X_test.shape[0]:,}")
    print(f"   Image dimension: {X_train.shape[1]}")
    
    return X_train, X_test


def visualize_reconstructions(autoencoder, X_test, n_images=10):
    """Compare original vs reconstructed images"""
    
    # Select random images
    indices = np.random.choice(X_test.shape[0], n_images, replace=False)
    originals = X_test[indices]
    
    # Reconstruct
    reconstructed = autoencoder.reconstruct(originals)
    
    # Plot
    fig, axes = plt.subplots(2, n_images, figsize=(20, 4))
    
    for i in range(n_images):
        # Original
        axes[0, i].imshow(originals[i].reshape(28, 28), cmap='gray')
        axes[0, i].axis('off')
        if i == 0:
            axes[0, i].set_title('Original', fontsize=12, pad=10)
        
        # Reconstructed
        axes[1, i].imshow(reconstructed[i].reshape(28, 28), cmap='gray')
        axes[1, i].axis('off')
        if i == 0:
            axes[1, i].set_title('Reconstructed', fontsize=12, pad=10)
    
    plt.suptitle('Autoencoder: Original vs Reconstructed', fontsize=16, y=1.02)
    plt.tight_layout()
    plt.savefig('autoencoder_reconstructions.png', dpi=300, bbox_inches='tight')
    print("\n📊 Reconstructions saved: autoencoder_reconstructions.png")
    plt.show()


def visualize_latent_space(autoencoder, X_test, y_test):
    """
    Visualize the learned encoding space
    
    (Only works well if encoding_dim is small, like 2 or 3)
    """
    print("\n📊 Visualizing latent space...")
    
    # Encode test images
    encoded = autoencoder.encode(X_test)
    
    if autoencoder.encoding_dim == 2:
        # 2D plot
        plt.figure(figsize=(10, 8))
        scatter = plt.scatter(encoded[:, 0], encoded[:, 1], 
                            c=y_test, cmap='tab10', alpha=0.6, s=5)
        plt.colorbar(scatter, label='Digit')
        plt.xlabel('Latent Dimension 1')
        plt.ylabel('Latent Dimension 2')
        plt.title('2D Latent Space Visualization')
        plt.savefig('latent_space_2d.png', dpi=300, bbox_inches='tight')
        plt.show()
    
    elif autoencoder.encoding_dim >= 3:
        # 3D plot (first 3 dimensions)
        from mpl_toolkits.mplot3d import Axes3D
        
        fig = plt.figure(figsize=(12, 9))
        ax = fig.add_subplot(111, projection='3d')
        scatter = ax.scatter(encoded[:, 0], encoded[:, 1], encoded[:, 2],
                           c=y_test, cmap='tab10', alpha=0.6, s=5)
        ax.set_xlabel('Latent Dim 1')
        ax.set_ylabel('Latent Dim 2')
        ax.set_zlabel('Latent Dim 3')
        plt.colorbar(scatter, label='Digit')
        plt.title('3D Latent Space Visualization (first 3 dims)')
        plt.savefig('latent_space_3d.png', dpi=300, bbox_inches='tight')
        plt.show()
    
    print("✅ Latent space visualization complete!")


def plot_training_history(history):
    """Plot loss curves"""
    fig, ax = plt.subplots(1, 1, figsize=(10, 6))
    
    ax.plot(history['loss'], label='Training Loss', linewidth=2)
    ax.plot(history['val_loss'], label='Validation Loss', linewidth=2)
    ax.set_xlabel('Epoch', fontsize=12)
    ax.set_ylabel('Loss (MSE)', fontsize=12)
    ax.set_title('Autoencoder Training History', fontsize=14)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('autoencoder_training_history.png', dpi=300, bbox_inches='tight')
    print("\n📊 Training history saved: autoencoder_training_history.png")
    plt.show()


# Main execution
if __name__ == "__main__":
    print("=" * 60)
    print("🧠 BASIC AUTOENCODER ON MNIST")
    print("=" * 60)
    
    # Load data
    X_train, X_test = load_and_prepare_data()
    
    # Load labels for visualization
    (_, y_train), (_, y_test) = mnist.load_data()
    
    # Create autoencoder
    autoencoder = BasicAutoencoder(encoding_dim=32)
    autoencoder.summary()
    
    # Train
    history = autoencoder.train(
        X_train=X_train,
        X_val=X_test,
        epochs=50,
        batch_size=256
    )
    
    # Plot training
    plot_training_history(history)
    
    # Visualize reconstructions
    visualize_reconstructions(autoencoder, X_test, n_images=10)
    
    # Visualize latent space (if encoding_dim is small)
    # visualize_latent_space(autoencoder, X_test[:5000], y_test[:5000])
    
    # Calculate reconstruction error
    reconstructed = autoencoder.reconstruct(X_test)
    mse = np.mean((X_test - reconstructed) ** 2)
    print(f"\n🎯 Test Reconstruction Error (MSE): {mse:.6f}")
    
    print("\n" + "=" * 60)
    print("✅ BASIC AUTOENCODER COMPLETE!")
    print("=" * 60)
```

---

## 🎨 Part 2: Convolutional Autoencoder

**Why CNN?** Better for images - preserves spatial structure!

```python
# autoencoder_convolutional.py
class ConvolutionalAutoencoder:
    """
    Convolutional Autoencoder
    
    Better for images - preserves spatial relationships!
    """
    
    def __init__(self, latent_dim=64):
        self.latent_dim = latent_dim
        self.encoder = self.build_encoder()
        self.decoder = self.build_decoder()
        self.autoencoder = self.build_autoencoder()
        
        print(f"✅ Convolutional Autoencoder created!")
        print(f"   Latent dimension: {self.latent_dim}")
    
    def build_encoder(self):
        """
        Encoder with Conv2D layers
        
        28x28x1 → 14x14x32 → 7x7x64 → Flatten → latent_dim
        """
        encoder_input = keras.Input(shape=(28, 28, 1), name='input')
        
        # Convolution + pooling (downsample)
        x = layers.Conv2D(32, (3, 3), activation='relu', padding='same')(encoder_input)
        x = layers.MaxPooling2D((2, 2), padding='same')(x)  # 28x28 → 14x14
        
        x = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(x)
        x = layers.MaxPooling2D((2, 2), padding='same')(x)  # 14x14 → 7x7
        
        # Flatten and compress to latent space
        x = layers.Flatten()(x)
        encoded = layers.Dense(self.latent_dim, activation='relu', name='latent')(x)
        
        encoder = Model(encoder_input, encoded, name='encoder')
        return encoder
    
    def build_decoder(self):
        """
        Decoder with Conv2DTranspose (upsampling)
        
        latent_dim → 7x7x64 → 14x14x32 → 28x28x1
        """
        decoder_input = keras.Input(shape=(self.latent_dim,), name='latent_input')
        
        # Expand to 7x7x64
        x = layers.Dense(7 * 7 * 64, activation='relu')(decoder_input)
        x = layers.Reshape((7, 7, 64))(x)
        
        # Upsample with transposed convolutions
        x = layers.Conv2DTranspose(64, (3, 3), activation='relu', 
                                   padding='same', strides=2)(x)  # 7x7 → 14x14
        
        x = layers.Conv2DTranspose(32, (3, 3), activation='relu', 
                                   padding='same', strides=2)(x)  # 14x14 → 28x28
        
        # Reconstruct image
        decoded = layers.Conv2D(1, (3, 3), activation='sigmoid', 
                               padding='same', name='output')(x)
        
        decoder = Model(decoder_input, decoded, name='decoder')
        return decoder
    
    def build_autoencoder(self):
        """Full convolutional autoencoder"""
        autoencoder_input = keras.Input(shape=(28, 28, 1))
        encoded = self.encoder(autoencoder_input)
        decoded = self.decoder(encoded)
        
        autoencoder = Model(autoencoder_input, decoded, name='conv_autoencoder')
        
        autoencoder.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        return autoencoder
    
    def train(self, X_train, X_val, epochs=50, batch_size=128):
        """Train convolutional autoencoder"""
        print("\n🚀 Training convolutional autoencoder...")
        
        # Reshape for Conv2D: (N, 28, 28, 1)
        X_train_reshaped = X_train.reshape(-1, 28, 28, 1)
        X_val_reshaped = X_val.reshape(-1, 28, 28, 1)
        
        history = self.autoencoder.fit(
            X_train_reshaped, X_train_reshaped,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(X_val_reshaped, X_val_reshaped),
            verbose=1
        )
        
        print("✅ Training complete!")
        return history.history
    
    def reconstruct(self, X):
        """Reconstruct images"""
        X_reshaped = X.reshape(-1, 28, 28, 1)
        reconstructed = self.autoencoder.predict(X_reshaped, verbose=0)
        return reconstructed.reshape(-1, 784)


# Train convolutional autoencoder
conv_autoencoder = ConvolutionalAutoencoder(latent_dim=64)
conv_autoencoder.autoencoder.summary()

history = conv_autoencoder.train(X_train, X_test, epochs=50, batch_size=128)

visualize_reconstructions(conv_autoencoder, X_test, n_images=10)
```

---

## 🧪 Part 3: Denoising Autoencoder

**Application:** Remove noise from images!

```python
# autoencoder_denoising.py
class DenoisingAutoencoder(BasicAutoencoder):
    """
    Denoising Autoencoder
    
    Train to remove noise from images
    Application: Image restoration, preprocessing
    """
    
    def add_noise(self, X, noise_factor=0.3):
        """Add Gaussian noise to images"""
        noisy = X + noise_factor * np.random.normal(loc=0.0, scale=1.0, size=X.shape)
        noisy = np.clip(noisy, 0.0, 1.0)  # Keep in [0, 1]
        return noisy
    
    def train_denoising(self, X_train, X_val, epochs=50, batch_size=256, noise_factor=0.3):
        """
        Train to denoise
        
        Input: Noisy images
        Target: Clean images
        """
        print(f"\n🚀 Training denoising autoencoder...")
        print(f"   Noise factor: {noise_factor}")
        
        # Add noise to inputs
        X_train_noisy = self.add_noise(X_train, noise_factor)
        X_val_noisy = self.add_noise(X_val, noise_factor)
        
        history = self.autoencoder.fit(
            X_train_noisy, X_train,  # Noisy → Clean
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(X_val_noisy, X_val),
            shuffle=True,
            verbose=1
        )
        
        print("✅ Denoising training complete!")
        return history.history


def demonstrate_denoising():
    """Demonstrate noise removal"""
    print("\n" + "=" * 60)
    print("🔧 DENOISING AUTOENCODER DEMONSTRATION")
    print("=" * 60)
    
    # Load data
    X_train, X_test = load_and_prepare_data()
    
    # Create and train denoising autoencoder
    denoiser = DenoisingAutoencoder(encoding_dim=32)
    history = denoiser.train_denoising(
        X_train, X_test,
        epochs=30,
        noise_factor=0.5
    )
    
    # Test on noisy images
    test_samples = X_test[:10]
    noisy_samples = denoiser.add_noise(test_samples, noise_factor=0.5)
    denoised_samples = denoiser.reconstruct(noisy_samples)
    
    # Visualize: Clean → Noisy → Denoised
    fig, axes = plt.subplots(3, 10, figsize=(20, 6))
    
    for i in range(10):
        # Clean
        axes[0, i].imshow(test_samples[i].reshape(28, 28), cmap='gray')
        axes[0, i].axis('off')
        if i == 0:
            axes[0, i].set_title('Clean', fontsize=12)
        
        # Noisy
        axes[1, i].imshow(noisy_samples[i].reshape(28, 28), cmap='gray')
        axes[1, i].axis('off')
        if i == 0:
            axes[1, i].set_title('Noisy', fontsize=12)
        
        # Denoised
        axes[2, i].imshow(denoised_samples[i].reshape(28, 28), cmap='gray')
        axes[2, i].axis('off')
        if i == 0:
            axes[2, i].set_title('Denoised', fontsize=12)
    
    plt.suptitle('Denoising Autoencoder', fontsize=16, y=0.98)
    plt.tight_layout()
    plt.savefig('denoising_results.png', dpi=300, bbox_inches='tight')
    print("\n📊 Denoising results saved: denoising_results.png")
    plt.show()


if __name__ == "__main__":
    demonstrate_denoising()
```

---

## 🎯 Part 4: Applications

### Application 1: Anomaly Detection

```python
# anomaly_detection.py
def detect_anomalies(autoencoder, X_normal, X_anomalous, threshold_percentile=95):
    """
    Detect anomalies using reconstruction error
    
    Idea: Normal images reconstruct well, anomalies don't!
    """
    print("\n🔍 Detecting anomalies...")
    
    # Reconstruction errors for normal data
    X_normal_reconstructed = autoencoder.reconstruct(X_normal)
    normal_errors = np.mean((X_normal - X_normal_reconstructed) ** 2, axis=1)
    
    # Set threshold (95th percentile of normal errors)
    threshold = np.percentile(normal_errors, threshold_percentile)
    print(f"   Threshold (95th percentile): {threshold:.6f}")
    
    # Check anomalous data
    X_anomalous_reconstructed = autoencoder.reconstruct(X_anomalous)
    anomalous_errors = np.mean((X_anomalous - X_anomalous_reconstructed) ** 2, axis=1)
    
    # Classify
    normal_detected = np.sum(normal_errors < threshold)
    anomalies_detected = np.sum(anomalous_errors >= threshold)
    
    print(f"\n📊 Results:")
    print(f"   Normal samples correctly identified: {normal_detected}/{len(normal_errors)} ({normal_detected/len(normal_errors)*100:.1f}%)")
    print(f"   Anomalies detected: {anomalies_detected}/{len(anomalous_errors)} ({anomalies_detected/len(anomalous_errors)*100:.1f}%)")
    
    # Visualize
    plt.figure(figsize=(10, 6))
    plt.hist(normal_errors, bins=50, alpha=0.7, label='Normal', color='blue')
    plt.hist(anomalous_errors, bins=50, alpha=0.7, label='Anomalous', color='red')
    plt.axvline(threshold, color='black', linestyle='--', linewidth=2, label='Threshold')
    plt.xlabel('Reconstruction Error')
    plt.ylabel('Frequency')
    plt.title('Anomaly Detection via Reconstruction Error')
    plt.legend()
    plt.savefig('anomaly_detection.png', dpi=300, bbox_inches='tight')
    plt.show()


# Example: Train on digits 0-8, test with 9 as anomaly
(X_train, y_train), (X_test, y_test) = mnist.load_data()
X_train = X_train.astype('float32') / 255.0
X_test = X_test.astype('float32') / 255.0
X_train = X_train.reshape(-1, 784)
X_test = X_test.reshape(-1, 784)

# Normal: digits 0-8
X_normal_train = X_train[y_train != 9]
X_normal_test = X_test[y_test != 9]

# Anomaly: digit 9
X_anomalous = X_test[y_test == 9]

# Train on normal data only
autoencoder = BasicAutoencoder(encoding_dim=32)
autoencoder.train(X_normal_train, X_normal_test, epochs=30)

# Detect anomalies
detect_anomalies(autoencoder, X_normal_test[:1000], X_anomalous)
```

### Application 2: Feature Extraction for Classification

```python
# feature_extraction.py
def use_autoencoder_for_classification():
    """
    Use autoencoder's encoded features for classification
    
    Idea: Compressed features might work better than raw pixels!
    """
    print("\n🎯 Using autoencoder features for classification...")
    
    # Load data with labels
    (X_train, y_train), (X_test, y_test) = mnist.load_data()
    X_train = X_train.reshape(-1, 784).astype('float32') / 255.0
    X_test = X_test.reshape(-1, 784).astype('float32') / 255.0
    
    # Train autoencoder
    autoencoder = BasicAutoencoder(encoding_dim=32)
    autoencoder.train(X_train, X_test, epochs=30)
    
    # Extract features (encodings)
    X_train_encoded = autoencoder.encode(X_train)
    X_test_encoded = autoencoder.encode(X_test)
    
    print(f"   Original features: {X_train.shape[1]}")
    print(f"   Encoded features: {X_train_encoded.shape[1]}")
    print(f"   Dimensionality reduction: {X_train.shape[1] / X_train_encoded.shape[1]:.1f}x")
    
    # Train classifier on encoded features
    from sklearn.linear_model import LogisticRegression
    
    classifier = LogisticRegression(max_iter=1000)
    classifier.fit(X_train_encoded, y_train)
    
    accuracy = classifier.score(X_test_encoded, y_test)
    print(f"\n✅ Classification accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    
    # Compare with raw pixels
    classifier_raw = LogisticRegression(max_iter=1000)
    classifier_raw.fit(X_train, y_train)
    accuracy_raw = classifier_raw.score(X_test, y_test)
    
    print(f"   Raw pixels accuracy: {accuracy_raw:.4f} ({accuracy_raw*100:.2f}%)")
    print(f"   Improvement: {(accuracy - accuracy_raw)*100:.2f}%")


if __name__ == "__main__":
    use_autoencoder_for_classification()
```

---

## 📊 Expected Results

**Basic Autoencoder:**
- Reconstruction MSE: ~0.01-0.02
- Training time: ~5-10 minutes
- Visual quality: Good reconstruction

**Convolutional Autoencoder:**
- Reconstruction MSE: ~0.008-0.015 (better!)
- Training time: ~10-15 minutes
- Visual quality: Sharper, better details

**Denoising Autoencoder:**
- Successfully removes noise
- Noise reduction: 60-80%
- Preserves digit features

---

## 🎯 Key Learnings

### What Makes Autoencoders Special:

1. **Unsupervised Learning:**
   - No labels needed!
   - Input = Target
   - Learns from data structure

2. **Dimensionality Reduction:**
   - 784 → 32 → 784
   - Keeps essential information
   - Discards noise

3. **Feature Learning:**
   - Bottleneck forces meaningful features
   - Learns representations automatically
   - Useful for other tasks

### JavaScript Developer Insights:

```javascript
// Autoencoder = Lossy compression learned from data
const compressionComparison = {
  traditional: {
    method: 'Fixed algorithm (JPEG, PNG)',
    pros: 'Universal, standardized',
    cons: 'Not optimized for specific data'
  },
  
  autoencoder: {
    method: 'Learned algorithm (neural network)',
    pros: 'Optimized for YOUR data type',
    cons: 'Requires training, not universal'
  }
};

// Like JavaScript Map/Reduce
const autoencoderAsMapReduce = {
  encode: 'Like .reduce() - compress to essential info',
  decode: 'Like .map() - expand back to full form',
  
  example: {
    original: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    encoded: [5.5, 3.02],  // [mean, std_dev]
    decoded: [2, 4, 5, 6, 7, 8, 9]  // Approximate reconstruction
  }
};
```

---

## 🚀 Challenges

### Challenge 1: Implement Variational Autoencoder (VAE)
```python
# VAE adds probabilistic sampling in bottleneck
# Enables generation of NEW images!
```

### Challenge 2: Sparse Autoencoder
```python
# Add L1 regularization to encourage sparse encodings
# Most encoding values should be near zero
```

### Challenge 3: Image Compression App
```python
# Build web app that compresses/decompresses images
# Compare to JPEG compression
```

### Challenge 4: Style Transfer
```python
# Use autoencoder to separate content from style
# Transfer style between images
```

---

## 📝 Challenge Questions

1. **Why does the bottleneck force learning?**
   - Hint: Information bottleneck principle

2. **When would you use autoencoder vs PCA?**
   - Hint: Non-linear vs linear

3. **How to prevent overfitting in autoencoders?**
   - Hint: Dropout, regularization, denoising

4. **Why sigmoid activation in output layer?**
   - Hint: Output range [0, 1]

5. **What happens if encoding_dim = input_dim?**
   - Hint: Identity function (no compression)

---

## ✅ Success Checklist

- [ ] Understand encoder-decoder architecture
- [ ] Implement basic autoencoder
- [ ] Build convolutional autoencoder
- [ ] Create denoising autoencoder
- [ ] Apply to anomaly detection
- [ ] Use for feature extraction
- [ ] Visualize latent space
- [ ] Experiment with different architectures

---

## 🎓 Congratulations!

You've mastered autoencoders!

**What you've learned:**
- Unsupervised learning
- Dimensionality reduction
- Feature learning
- Image denoising
- Anomaly detection

**Real-world applications:**
- Image compression
- Noise removal
- Feature extraction
- Anomaly detection
- Preprocessing for other models

**Next:** Move to Week 2 (Deep Generative Models) to learn GANs and VAEs! 🚀
