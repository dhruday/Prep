# 📘 Vision Transformers (ViT) - Transformers Conquer Computer Vision

## 🎯 Purpose (Why Vision Transformers Exist)

Imagine the **computer vision landscape before 2020**:

```javascript
const traditionalComputerVision = {
  dominant_architecture: 'Convolutional Neural Networks (CNNs)',
  launched: 2012,  // AlexNet revolution
  
  CNNs: {
    strengths: [
      'Excellent for images',
      'Translation invariance',
      'Local pattern recognition',
      'Efficient (fewer parameters)'
    ],
    
    limitations: [
      'Fixed receptive field',
      'Difficulty modeling long-range dependencies',
      'Hand-crafted inductive biases',
      'Separate architectures for vision vs NLP'
    ]
  },
  
  status: 'CNN reigned supreme for 8 years (2012-2020)'
};

// Then Vision Transformers happened (2020)...
```

**Vision Transformers' Revolution (2020-present):**

```javascript
const visionTransformerRevolution = {
  breakthrough: 'An Image is Worth 16x16 Words (Google, 2020)',
  
  radical_idea: {
    traditional: 'Images need convolutions',
    ViT: 'Images are just sequences of patches!',
    insight: 'Use same Transformer as NLP, but on image patches'
  },
  
  results: {
    imagenet_accuracy: {
      resnet: '76.5%',  // CNN baseline
      efficientnet: '84.3%',  // Best CNN (2019)
      vit_large: '87.8%',  // ViT beats CNNs!
      vit_huge: '88.5%'   // New state-of-the-art
    },
    
    scaling: {
      cnns: 'Performance plateaus with size',
      vit: 'Keeps improving with more data/compute',
      advantage: 'Better scaling laws than CNNs'
    },
    
    transfer_learning: {
      cnns: 'Good but limited',
      vit: 'Excellent, learns more general features',
      benefit: 'Better for downstream tasks'
    }
  },
  
  impact: {
    unified: 'Same architecture for vision + NLP',
    foundation_models: 'Enabled multimodal models (CLIP, GPT-4V)',
    industry_adoption: 'Google, Meta, Microsoft all switched to ViT'
  }
};

// ViT proved: Transformers work for EVERYTHING, not just text!
```

**The Core Problems ViT Solved:**

### 1. **Architectural Fragmentation**
```javascript
// Pre-ViT: Different architectures for different tasks
const fragmentedLandscape = {
  nlp: {
    architecture: 'Transformer',
    mechanism: 'Self-attention on tokens',
    scaling: 'Works great, scales to billions of parameters'
  },
  
  vision: {
    architecture: 'CNN (ResNet, EfficientNet)',
    mechanism: 'Convolutions on pixels',
    scaling: 'Good but plateaus'
  },
  
  problem: [
    'Can\'t share knowledge between vision and language',
    'Two separate codebases to maintain',
    'Different training recipes',
    'Difficult to build multimodal systems'
  ]
};

// ViT: Unified architecture
const unifiedVision = {
  architecture: 'Transformer (same as NLP)',
  mechanism: 'Self-attention on image patches',
  scaling: 'Excellent, same scaling laws as NLP',
  
  benefits: [
    'One architecture for all modalities',
    'Easy multimodal fusion (vision + language)',
    'Shared infrastructure and knowledge',
    'Pretrained transformers transfer to vision'
  ]
};

// Result: Foundation models like GPT-4V, CLIP, Flamingo
```

### 2. **Limited Global Context**
```javascript
// CNNs: Limited receptive field
const cnnLimitations = {
  architecture: 'Stacked convolutions',
  
  problem: {
    layer1: 'Sees 3x3 pixels',
    layer5: 'Sees 15x15 pixels',
    layer50: 'Sees ~200x200 pixels (finally!)',
    
    issue: 'Need many layers to see whole image',
    consequence: 'Deep networks required for global context'
  },
  
  example_failure: {
    task: 'Classify "person riding horse"',
    cnn_sees: 'Person in top-left, horse in bottom-right',
    problem: 'Early layers can\'t relate distant objects',
    needs: '50+ layers to connect them'
  }
};

// ViT: Global attention from layer 1
const vitGlobalContext = {
  architecture: 'Self-attention',
  
  advantage: {
    layer1: 'Every patch attends to ALL other patches',
    result: 'Global context immediately',
    benefit: 'Fewer layers needed'
  },
  
  example_success: {
    task: 'Classify "person riding horse"',
    vit_sees: 'All patches relate to each other in first layer',
    result: 'Immediately understands spatial relationships',
    efficiency: 'Better with fewer parameters'
  }
};

// ViT: See the whole picture from the start
```

### 3. **Data Efficiency vs Scale**
```javascript
// CNNs: Good with small data, plateau with more
const cnnScaling = {
  small_data: {
    samples: '1M images (ImageNet)',
    cnn_performance: 'Excellent (inductive bias helps)',
    vit_performance: 'Worse (needs more data)'
  },
  
  large_data: {
    samples: '300M+ images (JFT-300M)',
    cnn_performance: 'Good but plateaus',
    vit_performance: 'Excellent (keeps improving!)',
    
    advantage_vit: 'Scales better with more data and compute'
  }
};

// ViT: Initially needs more data, but scales better
// Modern solution: Pretrain ViT on huge datasets, fine-tune everywhere
```

---

## 📚 What Vision Transformers Actually Are

**Definition:**
A **Vision Transformer (ViT)** is an architecture that applies the Transformer model (originally designed for NLP) directly to images by dividing images into patches, treating patches as "tokens", and processing them with self-attention layers.

**The Core Insight:**

```javascript
// NLP Transformer (2017)
const nlpTransformer = {
  input: "The cat sat on the mat",
  tokenization: ['The', 'cat', 'sat', 'on', 'the', 'mat'],
  processing: 'Self-attention relates words to each other',
  output: 'Text representation'
};

// Vision Transformer (2020) - Same idea!
const visionTransformer = {
  input: '224x224 image',
  tokenization: 'Split into 14x14 = 196 patches (16x16 each)',
  processing: 'Self-attention relates patches to each other',
  output: 'Image representation',
  
  insight: 'Patches are like words, images are like sentences!'
};

// Breakthrough: No convolutions needed, just attention!
```

**Image Patching Visualization:**

```
Original Image (224x224 pixels):
┌─────────────────────────────────────┐
│                                     │
│         🐱                          │
│      [Cat Photo]                    │
│                                     │
└─────────────────────────────────────┘

Split into Patches (16x16 each):
┌────┬────┬────┬────┬────┬─...─┬────┐
│ P1 │ P2 │ P3 │ P4 │ P5 │ ... │P196│  14x14 = 196 patches
├────┼────┼────┼────┼────┼─...─┼────┤
│P15 │P16 │P17 │P18 │P19 │ ... │    │
├────┼────┼────┼────┼────┼─...─┼────┤
│P29 │P30 │ 🐱 │P32 │P33 │ ... │    │  Each patch = 16x16 pixels
├────┼────┼────┼────┼────┼─...─┼────┤
│... │... │... │... │... │ ... │    │
└────┴────┴────┴────┴────┴─...─┴────┘

Each patch becomes a "token":
[P1, P2, P3, ..., P196] → Transformer → Classification

Just like text:
[The, cat, sat, ..., mat] → Transformer → Sentiment
```

---

## 🔧 How Vision Transformers Work (Intuition)

**Think of ViT Like Reading a Comic Book:**

```
CNNs (Traditional):
┌─────────────────────────────────────┐
│  Look at image with magnifying glass│
│                                     │
│  Step 1: Examine tiny details      │
│  Step 2: Combine into small regions│
│  Step 3: Combine into larger areas │
│  Step 4: Finally see whole image   │
│                                     │
│  Problem: Takes many steps to see  │
│           relationships between     │
│           distant parts             │
└─────────────────────────────────────┘

Vision Transformer:
┌─────────────────────────────────────┐
│  Break image into panels (patches)  │
│                                     │
│  ┌──┐┌──┐┌──┐┌──┐                 │
│  │P1││P2││P3││P4│ ...              │
│  └──┘└──┘└──┘└──┘                 │
│                                     │
│  Step 1: Look at ALL panels at once│
│  Step 2: Each panel relates to all │
│          others via attention       │
│  Step 3: Understand whole story    │
│                                     │
│  Advantage: Global context from    │
│             the very first layer!   │
└─────────────────────────────────────┘

Analogy: CNN = reading word-by-word
         ViT = reading whole page at once
```

**The ViT Pipeline:**

```javascript
// Step-by-step ViT process
const vitPipeline = {
  step1_patchify: {
    input: 'Image [224, 224, 3]',
    operation: 'Split into patches',
    patch_size: '16x16',
    num_patches: '(224/16)² = 196 patches',
    output: '[196, 16, 16, 3]'
  },
  
  step2_flatten: {
    input: '[196, 16, 16, 3]',
    operation: 'Flatten each patch',
    output: '[196, 768]',  // 16*16*3 = 768
    analogy: 'Like turning image into sentence of 196 words'
  },
  
  step3_linear_projection: {
    input: '[196, 768]',
    operation: 'Linear layer (learnable embedding)',
    output: '[196, 512]',  // Project to model dimension
    purpose: 'Convert patch pixels to embeddings'
  },
  
  step4_add_position: {
    input: '[196, 512]',
    operation: 'Add positional embeddings',
    output: '[196, 512]',
    purpose: 'Tell model where each patch is located',
    why: 'Attention is position-agnostic, need to encode location'
  },
  
  step5_add_class_token: {
    input: '[196, 512]',
    operation: 'Prepend learnable [CLS] token',
    output: '[197, 512]',  // 196 patches + 1 CLS token
    purpose: 'Classification token aggregates information'
  },
  
  step6_transformer: {
    input: '[197, 512]',
    operation: 'Self-attention layers (12 layers)',
    process: {
      attention: 'Each token attends to all others',
      mlp: 'Feed-forward network',
      residual: 'Skip connections',
      norm: 'Layer normalization'
    },
    output: '[197, 512]'
  },
  
  step7_classify: {
    input: '[197, 512]',
    operation: 'Take [CLS] token, pass through MLP head',
    cls_token: '[1, 512]',
    output: 'Class probabilities [1, 1000]'
  }
};

// Result: Image → Patches → Transformer → Classification
```

---

## 🧮 How Vision Transformers Work (Technical)

### Complete ViT Implementation

**1. Patch Embedding:**

```python
import torch
import torch.nn as nn

class PatchEmbedding(nn.Module):
    """
    Convert image into sequence of patch embeddings
    
    Image [B, C, H, W] → Patches [B, num_patches, embed_dim]
    """
    
    def __init__(self, img_size=224, patch_size=16, in_channels=3, embed_dim=768):
        super().__init__()
        self.img_size = img_size
        self.patch_size = patch_size
        self.num_patches = (img_size // patch_size) ** 2  # 196 for 224/16
        
        # Option 1: Convolution (efficient implementation)
        # A 16x16 conv with stride 16 is equivalent to splitting into patches
        self.projection = nn.Conv2d(
            in_channels,
            embed_dim,
            kernel_size=patch_size,
            stride=patch_size
        )
        
    def forward(self, x):
        """
        x: [B, C, H, W] - Batch of images
        Returns: [B, num_patches, embed_dim]
        """
        B, C, H, W = x.shape
        
        # Ensure image size is correct
        assert H == self.img_size and W == self.img_size, \
            f"Input image size ({H}x{W}) doesn't match model ({self.img_size}x{self.img_size})"
        
        # Project patches to embedding dimension
        # [B, C, H, W] → [B, embed_dim, H/P, W/P]
        x = self.projection(x)
        
        # Flatten spatial dimensions
        # [B, embed_dim, H/P, W/P] → [B, embed_dim, num_patches]
        x = x.flatten(2)
        
        # Transpose to get [B, num_patches, embed_dim]
        x = x.transpose(1, 2)
        
        return x

# Example
patch_embed = PatchEmbedding(img_size=224, patch_size=16, embed_dim=768)
image = torch.randn(1, 3, 224, 224)
patches = patch_embed(image)
print(f"Image shape: {image.shape}")  # [1, 3, 224, 224]
print(f"Patches shape: {patches.shape}")  # [1, 196, 768]
```

**2. Positional Embeddings:**

```python
class PositionalEmbedding(nn.Module):
    """
    Add positional information to patch embeddings
    
    Without this, model doesn't know patch locations!
    """
    
    def __init__(self, num_patches=196, embed_dim=768, dropout=0.1):
        super().__init__()
        
        # Learnable positional embeddings
        # Each patch position gets its own learned embedding
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))
        self.dropout = nn.Dropout(dropout)
        
        # Initialize with truncated normal
        nn.init.trunc_normal_(self.pos_embed, std=0.02)
    
    def forward(self, x):
        """
        x: [B, num_patches, embed_dim]
        Returns: [B, num_patches, embed_dim] with position info
        """
        # Add positional embeddings
        x = x + self.pos_embed
        x = self.dropout(x)
        return x

# Visualization of what positional embeddings capture
print("Positional Embeddings capture spatial structure:")
print("Nearby patches have similar position embeddings")
print("Distant patches have different position embeddings")
print("Model learns: patch location matters!")
```

**3. Transformer Encoder Block:**

```python
class TransformerEncoderBlock(nn.Module):
    """
    Standard Transformer encoder block with multi-head self-attention
    """
    
    def __init__(self, embed_dim=768, num_heads=12, mlp_ratio=4.0, dropout=0.1):
        super().__init__()
        
        # Layer normalization
        self.norm1 = nn.LayerNorm(embed_dim)
        self.norm2 = nn.LayerNorm(embed_dim)
        
        # Multi-head self-attention
        self.attn = nn.MultiheadAttention(
            embed_dim,
            num_heads,
            dropout=dropout,
            batch_first=True
        )
        
        # MLP (Feed-forward network)
        mlp_hidden_dim = int(embed_dim * mlp_ratio)
        self.mlp = nn.Sequential(
            nn.Linear(embed_dim, mlp_hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(mlp_hidden_dim, embed_dim),
            nn.Dropout(dropout)
        )
    
    def forward(self, x):
        """
        x: [B, num_patches, embed_dim]
        Returns: [B, num_patches, embed_dim]
        """
        # Multi-head self-attention with residual
        attn_output, _ = self.attn(
            self.norm1(x),  # Pre-norm
            self.norm1(x),
            self.norm1(x)
        )
        x = x + attn_output  # Residual connection
        
        # MLP with residual
        x = x + self.mlp(self.norm2(x))
        
        return x
```

**4. Complete Vision Transformer:**

```python
class VisionTransformer(nn.Module):
    """
    Complete Vision Transformer (ViT) model
    
    Based on "An Image is Worth 16x16 Words" (Google, 2020)
    """
    
    def __init__(
        self,
        img_size=224,
        patch_size=16,
        in_channels=3,
        num_classes=1000,
        embed_dim=768,
        depth=12,
        num_heads=12,
        mlp_ratio=4.0,
        dropout=0.1
    ):
        super().__init__()
        
        # Patch embedding
        self.patch_embed = PatchEmbedding(
            img_size, patch_size, in_channels, embed_dim
        )
        num_patches = self.patch_embed.num_patches
        
        # Class token (like [CLS] in BERT)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        
        # Positional embeddings (num_patches + 1 for cls token)
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))
        self.pos_drop = nn.Dropout(dropout)
        
        # Transformer encoder blocks
        self.blocks = nn.ModuleList([
            TransformerEncoderBlock(embed_dim, num_heads, mlp_ratio, dropout)
            for _ in range(depth)
        ])
        
        # Final layer norm
        self.norm = nn.LayerNorm(embed_dim)
        
        # Classification head
        self.head = nn.Linear(embed_dim, num_classes)
        
        # Initialize weights
        nn.init.trunc_normal_(self.cls_token, std=0.02)
        nn.init.trunc_normal_(self.pos_embed, std=0.02)
        self.apply(self._init_weights)
    
    def _init_weights(self, m):
        """Initialize weights"""
        if isinstance(m, nn.Linear):
            nn.init.trunc_normal_(m.weight, std=0.02)
            if m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.LayerNorm):
            nn.init.constant_(m.bias, 0)
            nn.init.constant_(m.weight, 1.0)
    
    def forward(self, x):
        """
        x: [B, 3, 224, 224] - Batch of images
        Returns: [B, num_classes] - Class logits
        """
        B = x.shape[0]
        
        # Step 1: Patch embedding
        # [B, 3, 224, 224] → [B, 196, 768]
        x = self.patch_embed(x)
        
        # Step 2: Add class token
        # Expand cls_token to batch size and concatenate
        cls_tokens = self.cls_token.expand(B, -1, -1)  # [B, 1, 768]
        x = torch.cat([cls_tokens, x], dim=1)  # [B, 197, 768]
        
        # Step 3: Add positional embeddings
        x = x + self.pos_embed
        x = self.pos_drop(x)
        
        # Step 4: Transformer encoder blocks
        for block in self.blocks:
            x = block(x)
        
        # Step 5: Layer norm
        x = self.norm(x)
        
        # Step 6: Classification (use cls token)
        cls_output = x[:, 0]  # Take first token [B, 768]
        logits = self.head(cls_output)  # [B, num_classes]
        
        return logits
    
    def get_attention_maps(self, x):
        """
        Extract attention maps for visualization
        
        Shows which patches the model focuses on
        """
        B = x.shape[0]
        
        # Forward through patch embedding and add position
        x = self.patch_embed(x)
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat([cls_tokens, x], dim=1)
        x = x + self.pos_embed
        x = self.pos_drop(x)
        
        # Collect attention maps from each layer
        attention_maps = []
        for block in self.blocks:
            # Get attention weights (modify block to return these)
            # attention_maps.append(block.attn.get_attention_weights(x))
            x = block(x)
        
        return attention_maps

# Create ViT model
model = VisionTransformer(
    img_size=224,
    patch_size=16,
    num_classes=1000,
    embed_dim=768,
    depth=12,
    num_heads=12
)

# Model statistics
total_params = sum(p.numel() for p in model.parameters())
print(f"ViT-Base Parameters: {total_params/1e6:.1f}M")  # ~86M parameters

# Example inference
image = torch.randn(1, 3, 224, 224)
output = model(image)
print(f"Input: {image.shape}")  # [1, 3, 224, 224]
print(f"Output: {output.shape}")  # [1, 1000]
```

**5. Training ViT:**

```python
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

class ViTTrainer:
    """Train Vision Transformer"""
    
    def __init__(self, model, device='cuda'):
        self.model = model.to(device)
        self.device = device
    
    def train_epoch(self, train_loader, optimizer, criterion):
        """Train for one epoch"""
        self.model.train()
        
        total_loss = 0
        correct = 0
        total = 0
        
        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(self.device), labels.to(self.device)
            
            # Forward pass
            outputs = self.model(images)
            loss = criterion(outputs, labels)
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            # Statistics
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            if (batch_idx + 1) % 100 == 0:
                print(f'Batch {batch_idx+1}: Loss={loss.item():.4f}, Acc={100.*correct/total:.2f}%')
        
        return total_loss / len(train_loader), 100. * correct / total
    
    def train(self, train_loader, val_loader, epochs=100, lr=3e-4):
        """Full training loop"""
        
        # Optimizer (AdamW with weight decay)
        optimizer = optim.AdamW(self.model.parameters(), lr=lr, weight_decay=0.05)
        
        # Learning rate scheduler (cosine annealing)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, epochs)
        
        # Loss function
        criterion = nn.CrossEntropyLoss()
        
        print("Starting ViT training...")
        print(f"Model: ViT-Base")
        print(f"Parameters: {sum(p.numel() for p in self.model.parameters())/1e6:.1f}M")
        print(f"Epochs: {epochs}")
        print()
        
        best_acc = 0
        
        for epoch in range(epochs):
            print(f"Epoch {epoch+1}/{epochs}")
            
            # Train
            train_loss, train_acc = self.train_epoch(train_loader, optimizer, criterion)
            
            # Validate
            val_acc = self.evaluate(val_loader)
            
            print(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
            print(f"Val Acc: {val_acc:.2f}%")
            print()
            
            # Save best model
            if val_acc > best_acc:
                best_acc = val_acc
                torch.save(self.model.state_dict(), 'vit_best.pth')
                print(f"✓ New best model saved! (Acc: {best_acc:.2f}%)")
            
            scheduler.step()
        
        print(f"Training complete! Best accuracy: {best_acc:.2f}%")
    
    @torch.no_grad()
    def evaluate(self, test_loader):
        """Evaluate model"""
        self.model.eval()
        
        correct = 0
        total = 0
        
        for images, labels in test_loader:
            images, labels = images.to(self.device), labels.to(self.device)
            
            outputs = self.model(images)
            _, predicted = outputs.max(1)
            
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
        
        return 100. * correct / total

# Prepare dataset
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

train_dataset = datasets.ImageFolder('path/to/train', transform=transform)
train_loader = DataLoader(train_dataset, batch_size=256, shuffle=True, num_workers=4)

# Create and train model
model = VisionTransformer(num_classes=1000)
trainer = ViTTrainer(model)
# trainer.train(train_loader, val_loader, epochs=300)
```

**6. Using Pretrained ViT:**

```python
from transformers import ViTForImageClassification, ViTFeatureExtractor
from PIL import Image

# Load pretrained ViT
model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224')
feature_extractor = ViTFeatureExtractor.from_pretrained('google/vit-base-patch16-224')

# Load and preprocess image
image = Image.open('cat.jpg')
inputs = feature_extractor(images=image, return_tensors="pt")

# Predict
outputs = model(**inputs)
logits = outputs.logits
predicted_class = logits.argmax(-1).item()

print(f"Predicted class: {model.config.id2label[predicted_class]}")
```

---

## 🎨 Visual Explanation

**ViT Architecture Diagram:**

```
Input Image (224x224x3)
         │
         ▼
┌─────────────────────────────────┐
│   Patch Embedding (16x16)       │
│   Split image into 196 patches  │
└─────────────────────────────────┘
         │
         ▼
    [P1, P2, P3, ..., P196]
    Each patch = 768-dim vector
         │
         ▼
┌─────────────────────────────────┐
│   Prepend [CLS] Token           │
│   [CLS, P1, P2, ..., P196]      │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Add Positional Embeddings     │
│   Tell model where patches are  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Transformer Encoder Layer 1   │
│   • Multi-head Self-Attention   │
│   • MLP                         │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Transformer Encoder Layer 2   │
│   (Repeat 12 times)             │
└─────────────────────────────────┘
         │
        ...
         │
         ▼
┌─────────────────────────────────┐
│   Transformer Encoder Layer 12  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Extract [CLS] Token           │
│   Contains aggregated info      │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Classification Head (MLP)     │
│   [CLS] → Class Probabilities   │
└─────────────────────────────────┘
         │
         ▼
    Output: [Cat, 0.95]
```

**Attention Visualization:**

```
What does ViT "see"?

Layer 1 Attention:
┌────┬────┬────┬────┐
│ 🐱 │ 🐱 │    │    │  Early layers focus on
├────┼────┼────┼────┤  local patterns
│ 🐱 │ 🐱 │    │    │  (similar to CNNs)
├────┼────┼────┼────┤
│    │    │    │    │
├────┼────┼────┼────┤
│    │    │    │    │
└────┴────┴────┴────┘

Layer 6 Attention:
┌────┬────┬────┬────┐
│ ↔  │ ↔  │ ↔  │    │  Middle layers start
├────┼────┼────┼────┤  connecting distant
│ ↕  │ 🐱 │ ↕  │    │  patches
├────┼────┼────┼────┤
│ ↔  │ ↔  │ ↔  │    │
├────┼────┼────┼────┤
│    │    │    │    │
└────┴────┴────┴────┘

Layer 12 Attention:
┌────┬────┬────┬────┐
│ ⟷  │ ⟷  │ ⟷  │ ⟷  │  Final layers have
├────┼────┼────┼────┤  global context
│ ⟷  │ 🐱 │ ⟷  │ ⟷  │  All patches connected
├────┼────┼────┼────┤
│ ⟷  │ ⟷  │ ⟷  │ ⟷  │
├────┼────┼────┼────┤
│ ⟷  │ ⟷  │ ⟷  │ ⟷  │
└────┴────┴────┴────┘

ViT learns hierarchical representations like CNNs,
but with attention instead of convolutions!
```

---

## 💡 Simple Examples

**Example 1: ViT Image Classification:**

```python
from transformers import ViTForImageClassification, ViTImageProcessor
import torch
from PIL import Image

# Load pretrained ViT
processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224')

# Load image
image = Image.open('dog.jpg')

# Preprocess
inputs = processor(images=image, return_tensors="pt")

# Predict
with torch.no_grad():
    outputs = model(**inputs)
    logits = outputs.logits

# Get prediction
predicted_idx = logits.argmax(-1).item()
predicted_class = model.config.id2label[predicted_idx]
confidence = torch.softmax(logits, dim=-1)[0, predicted_idx].item()

print(f"Predicted: {predicted_class}")
print(f"Confidence: {confidence:.2%}")
```

**Example 2: Fine-tune ViT on Custom Dataset:**

```python
from transformers import ViTForImageClassification, Trainer, TrainingArguments

# Load pretrained ViT
model = ViTForImageClassification.from_pretrained(
    'google/vit-base-patch16-224',
    num_labels=10,  # Your number of classes
    ignore_mismatched_sizes=True
)

# Training arguments
training_args = TrainingArguments(
    output_dir='./vit_finetuned',
    num_train_epochs=10,
    per_device_train_batch_size=32,
    learning_rate=2e-5,
    warmup_steps=500,
    weight_decay=0.01,
    logging_steps=100,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True
)

# Create trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    compute_metrics=compute_metrics
)

# Fine-tune
trainer.train()

print("Fine-tuning complete!")
```

**Example 3: Extract ViT Features:**

```python
from transformers import ViTModel

# Load ViT as feature extractor (no classification head)
model = ViTModel.from_pretrained('google/vit-base-patch16-224')
processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')

# Process image
image = Image.open('image.jpg')
inputs = processor(images=image, return_tensors="pt")

# Extract features
with torch.no_grad():
    outputs = model(**inputs)
    
    # Get [CLS] token representation (image embedding)
    cls_embedding = outputs.last_hidden_state[:, 0]  # [1, 768]
    
    # Get all patch embeddings
    patch_embeddings = outputs.last_hidden_state[:, 1:]  # [1, 196, 768]

print(f"Image embedding shape: {cls_embedding.shape}")
print(f"Patch embeddings shape: {patch_embeddings.shape}")

# Use embeddings for:
# • Image similarity search
# • Clustering
# • Retrieval
# • Few-shot learning
```

---

## 🌍 Real-World Applications

### 1. **Foundation Models**
```python
# ViT enables multimodal AI
multimodal_applications = {
    'clip': {
        'what': 'Vision + Language model',
        'architecture': 'ViT (vision) + Transformer (text)',
        'capability': 'Zero-shot image classification',
        'usage': 'Stable Diffusion, DALL-E guidance'
    },
    
    'gpt4_vision': {
        'what': 'GPT-4 with vision understanding',
        'architecture': 'ViT → GPT-4',
        'capability': 'Understand and reason about images',
        'usage': 'ChatGPT image analysis'
    },
    
    'flamingo': {
        'what': 'Few-shot visual question answering',
        'architecture': 'ViT + cross-attention + LLM',
        'capability': 'Answer questions about images',
        'usage': 'Visual reasoning tasks'
    }
}
```

### 2. **Medical Imaging**
```python
# ViT for medical diagnosis
class MedicalViT:
    """ViT fine-tuned for medical imaging"""
    
    def __init__(self):
        # Load ViT pretrained on ImageNet
        # Fine-tune on medical images
        self.model = load_finetuned_vit('medical_vit.pth')
    
    def diagnose(self, xray_image):
        """Analyze X-ray for abnormalities"""
        
        # ViT advantages for medical:
        # • Global context (see whole organ)
        # • Attention maps (explainability)
        # • Transfer learning (limited medical data)
        
        prediction = self.model(xray_image)
        attention = self.model.get_attention_maps(xray_image)
        
        return {
            'diagnosis': prediction,
            'attention_regions': attention,  # Show what model focused on
            'confidence': get_confidence(prediction)
        }

# Real usage:
# • Chest X-ray analysis
# • CT scan interpretation
# • Pathology slide classification
```

### 3. **Self-Driving Cars**
```python
# ViT for autonomous vehicles
class AutonomousVisionSystem:
    """ViT-based perception for self-driving"""
    
    def __init__(self):
        self.vit_backbone = ViTModel.from_pretrained('vit-large')
        self.detection_head = ObjectDetectionHead()
        self.segmentation_head = SegmentationHead()
    
    def process_frame(self, camera_image):
        """Understand driving scene"""
        
        # ViT features
        features = self.vit_backbone(camera_image)
        
        # Detect objects
        objects = self.detection_head(features)
        # Cars, pedestrians, signs, etc.
        
        # Segment scene
        segmentation = self.segmentation_head(features)
        # Road, sidewalk, buildings, etc.
        
        return {
            'objects': objects,
            'segmentation': segmentation,
            'attention': features  # What the car "sees"
        }

# Used by: Tesla, Waymo, Cruise
```

---

## ❌ Common Misconceptions

### ❌ "ViT always beats CNNs"
**Reality:** It depends on data and task:

```python
vit_vs_cnn = {
    'small_data': {
        'samples': '<100K images',
        'winner': 'CNN',
        'reason': 'CNN inductive bias helps with limited data',
        'vit_performance': 'Underfits, needs more data'
    },
    
    'medium_data': {
        'samples': '100K-1M images',
        'winner': 'Tie',
        'reason': 'Both work well',
        'recommendation': 'Use pretrained ViT or CNN'
    },
    
    'large_data': {
        'samples': '10M+ images',
        'winner': 'ViT',
        'reason': 'Scales better, learns more general features',
        'advantage': 'Better transfer learning'
    }
}

# Practical: Always start with pretrained ViT (trained on 300M images)
# Then fine-tune on your data → Best of both worlds!
```

### ❌ "ViT needs special GPUs"
**Reality:** Efficient variants exist:

```python
vit_variants = {
    'vit_huge': {
        'params': '632M',
        'hardware': '8x A100 GPUs',
        'use_case': 'Research, large-scale pretraining'
    },
    
    'vit_base': {
        'params': '86M',
        'hardware': '1x RTX 3090',
        'use_case': 'Standard, most common'
    },
    
    'vit_small': {
        'params': '22M',
        'hardware': '1x RTX 3060',
        'use_case': 'Resource-constrained'
    },
    
    'mobile_vit': {
        'params': '5M',
        'hardware': 'Smartphone',
        'use_case': 'Edge deployment',
        'speed': 'Real-time on mobile'
    }
}

# ViT can run anywhere, from phones to supercomputers!
```

---

## ✅ Best Practices

### 1. **Choosing ViT Variant**

```python
def choose_vit_model(use_case):
    """Select appropriate ViT model"""
    
    recommendations = {
        'high_accuracy': {
            'model': 'ViT-Large or ViT-Huge',
            'when': 'Accuracy is critical, have compute',
            'examples': ['Medical diagnosis', 'Research']
        },
        
        'balanced': {
            'model': 'ViT-Base',
            'when': 'Standard use case, good compute',
            'examples': ['Most applications']
        },
        
        'fast_inference': {
            'model': 'ViT-Small or DeiT-Tiny',
            'when': 'Speed matters, limited compute',
            'examples': ['Real-time apps', 'Edge devices']
        },
        
        'mobile': {
            'model': 'MobileViT',
            'when': 'Deploy on smartphones/IoT',
            'examples': ['Mobile apps', 'Embedded systems']
        }
    }
    
    return recommendations
```

### 2. **Training Strategy**

```python
vit_training_strategy = {
    'pretraining': {
        'dataset': 'ImageNet-21K or JFT-300M',
        'duration': '300 epochs',
        'augmentation': 'RandAugment, Mixup, CutMix',
        'optimizer': 'AdamW',
        'lr_schedule': 'Linear warmup + cosine decay',
        'note': 'Usually done once, use pretrained'
    },
    
    'fine_tuning': {
        'start': 'Load pretrained ViT',
        'freeze': 'First few layers (optional)',
        'epochs': '10-50',
        'learning_rate': '1e-5 to 1e-4 (lower than pretraining)',
        'batch_size': '32-256',
        'augmentation': 'Moderate (same as pretraining)',
        'note': 'This is what you typically do'
    },
    
    'data_augmentation': {
        'essential': ['Random crop', 'Random flip'],
        'recommended': ['RandAugment', 'Mixup', 'CutMix'],
        'why': 'ViT has less inductive bias, needs augmentation'
    }
}
```

### 3. **Optimization Tips**

```python
optimization_tips = {
    'patch_size': {
        'smaller_16x16': 'Better accuracy, more compute',
        'larger_32x32': 'Faster, less compute',
        'recommendation': '16x16 for most tasks'
    },
    
    'resolution': {
        'training': '224x224 standard',
        'fine_tuning': 'Can increase to 384x384 or 512x512',
        'benefit': 'Higher resolution = better accuracy (but slower)'
    },
    
    'mixed_precision': {
        'use': 'torch.cuda.amp.autocast()',
        'benefit': '2x faster training, same accuracy',
        'requirement': 'GPU with Tensor Cores (V100+)'
    }
}
```

---

## 🎯 Key Takeaways

1. **ViT = Transformer for images**
   - Treats image patches as tokens
   - Pure attention, no convolutions
   - Same architecture as NLP transformers

2. **Why ViT works:**
   - Global context from layer 1
   - Scales better than CNNs
   - Enables multimodal models

3. **Key components:**
   - Patch embedding (image → tokens)
   - Positional embeddings (location info)
   - Transformer encoder (self-attention)
   - [CLS] token (classification)

4. **Best practices:**
   - Use pretrained models (ImageNet-21K)
   - Fine-tune on your data
   - Apply data augmentation
   - Start with ViT-Base

5. **Real-world impact:**
   - Enabled GPT-4V, CLIP, multimodal AI
   - State-of-the-art on ImageNet
   - Foundation for modern computer vision

---

## ✅ Review Questions

1. How does ViT convert images into sequences?
2. Why are positional embeddings necessary in ViT?
3. What is the role of the [CLS] token?
4. How does ViT achieve global context differently from CNNs?
5. When should you use ViT vs CNN?

---

## 🧩 Practice Problems

### Beginner
1. Implement patch embedding from scratch
2. Visualize image patches (16x16 grid)
3. Fine-tune ViT on CIFAR-10

### Intermediate
4. Implement complete ViT model
5. Visualize attention maps
6. Compare ViT vs ResNet on same dataset

### Advanced
7. Implement DeiT (distillation for ViT)
8. Build hybrid CNN-ViT model
9. Implement ViT for object detection
10. Create MobileViT for edge deployment

---

## 🚀 Mini Project: Build ViT-Based Image Classifier

**Goal:** Fine-tune Vision Transformer on custom image dataset.

**Requirements:**

1. **Dataset:**
   - Collect 1K+ images per class
   - Minimum 5 classes
   - Split: 80% train, 20% test

2. **Model:**
   - Load pretrained ViT-Base
   - Add classification head
   - Fine-tune on your data

3. **Training:**
   - Data augmentation (flip, crop, color jitter)
   - Learning rate: 1e-4
   - Epochs: 20-50
   - Track accuracy and loss

4. **Evaluation:**
   - Test accuracy
   - Confusion matrix
   - Attention visualization
   - Compare with ResNet

5. **Deployment:**
   - Export to ONNX
   - Build simple web demo
   - Inference time <100ms

**Success Metrics:**
- >90% test accuracy
- Fast inference (<100ms)
- Interpretable attention maps
- Production-ready model

---

**Next: Multimodal Models - Combining Vision and Language** 🌐
