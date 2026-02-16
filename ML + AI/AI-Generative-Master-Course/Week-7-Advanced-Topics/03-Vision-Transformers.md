# 👁️ Vision Transformers (ViT)

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [ViT Architecture](#-vit-architecture)
5. [Mathematical Formulation](#-mathematical-formulation)
6. [Training Strategies](#-training-strategies)
7. [ViT Variants](#-vit-variants)
8. [Implementation](#-implementation)
9. [Hands-On Project](#-hands-on-project)
10. [Common Mistakes](#-common-mistakes)
11. [Interview Questions](#-interview-questions)
12. [Homework](#-homework)

---

## 🎯 Introduction

**Vision Transformer (ViT)** applies the Transformer architecture (originally designed for text) directly to images. It achieves state-of-the-art results on image classification and forms the backbone of modern vision models like CLIP, DINO, and Segment Anything.

### Why ViT Matters

| Aspect | CNNs | Vision Transformers |
|--------|------|---------------------|
| Inductive Bias | Strong (locality, translation equivariance) | Minimal (learns everything) |
| Global Context | Limited (grows with depth) | Full (from layer 1) |
| Scalability | Saturates | Keeps improving |
| Data Efficiency | Good | Needs lots of data |
| SOTA 2024 | ❌ | ✅ |

### Historical Context

```
┌─────────────────────────────────────────────────────────────┐
│                    VISION MODELS EVOLUTION                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  2012  AlexNet (CNNs begin)                                 │
│  2014  VGGNet, GoogLeNet                                    │
│  2015  ResNet (skip connections)                            │
│  2017  Transformers for NLP                                 │
│  2019  EfficientNet (CNN peak)                              │
│  2020  ViT: "An Image is Worth 16x16 Words"                 │
│  2021  DeiT, Swin Transformer                               │
│  2022  CLIP, DINO, BEiT                                     │
│  2023  SAM (Segment Anything), DINOv2                       │
│  2024  ViT dominates most vision tasks                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧒 Beginner Explanation

### The "Reading a Book" Analogy

**How CNNs see images (like reading with a magnifying glass):**
```
🔍 CNN reads image piece by piece
   - Looks at small windows (3×3 pixels)
   - Combines into larger patterns
   - Takes many layers to see the whole picture

Problem: Hard to see "the cat is next to the dog" immediately
```

**How ViT sees images (like reading a book):**
```
📖 ViT splits image into "words" (patches)
   - Each 16×16 patch = one "word"
   - All patches can see each other immediately
   - Attention asks "which patches are related?"

Benefit: "Cat" patch can attend to "dog" patch in layer 1!
```

### Visual: Image to Patches

```
┌─────────────────────────────────────────────────────────────┐
│                    IMAGE TO PATCHES                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Original Image (224×224)         Patches (14×14 = 196)     │
│                                                              │
│  ┌──────────────────┐             ┌──┬──┬──┬──┬──┬──┬──┐    │
│  │                  │             │P1│P2│P3│P4│P5│P6│P7│    │
│  │    🐱            │    →        ├──┼──┼──┼──┼──┼──┼──┤    │
│  │                  │   Split     │P8│P9│..│..│..│..│..│    │
│  │       (cat)      │    →        ├──┼──┼──┼──┼──┼──┼──┤    │
│  │                  │   16×16     │..│..│..│🐱│..│..│..│    │
│  │                  │             ├──┼──┼──┼──┼──┼──┼──┤    │
│  └──────────────────┘             │..│..│..│..│..│..│..│    │
│                                   └──┴──┴──┴──┴──┴──┴──┘    │
│                                                              │
│  Each patch (16×16×3 = 768 values) → Embedding vector       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Why Patches Work

```
┌─────────────────────────────────────────────────────────────┐
│                 PATCHES = WORDS FOR VISION                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  NLP:    "The"  "cat"  "sat"  "on"  "mat"                   │
│           ↓      ↓      ↓      ↓      ↓                     │
│          [emb]  [emb]  [emb]  [emb]  [emb]                  │
│                         ↓                                    │
│                   Transformer                                │
│                         ↓                                    │
│                  Classification                              │
│                                                              │
│  Vision: [P1]   [P2]   [P3]   [P4]  ...  [P196]             │
│           ↓      ↓      ↓      ↓           ↓                │
│          [emb]  [emb]  [emb]  [emb]      [emb]              │
│                         ↓                                    │
│               Same Transformer!                              │
│                         ↓                                    │
│                  Classification                              │
│                                                              │
│  Same architecture, different "tokens"!                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Deep Technical Breakdown

### The ViT Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    ViT PIPELINE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PATCH EMBEDDING                                         │
│     Image [224×224×3]                                       │
│        ↓ Split into patches                                 │
│     Patches [196 × (16×16×3)]                               │
│        ↓ Linear projection                                  │
│     Embeddings [196 × 768]                                  │
│                                                              │
│  2. ADD [CLS] TOKEN                                         │
│     [CLS] + Embeddings [197 × 768]                          │
│                                                              │
│  3. ADD POSITION EMBEDDINGS                                 │
│     Embeddings + PosEmb [197 × 768]                         │
│                                                              │
│  4. TRANSFORMER ENCODER (×12 layers)                        │
│     ┌─────────────────────────────┐                         │
│     │  Layer Norm                 │                         │
│     │  Multi-Head Self-Attention  │                         │
│     │  Residual Connection        │                         │
│     │  Layer Norm                 │                         │
│     │  MLP (FFN)                  │                         │
│     │  Residual Connection        │                         │
│     └─────────────────────────────┘                         │
│                                                              │
│  5. CLASSIFICATION HEAD                                     │
│     [CLS] token → MLP → Class logits                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

**1. Patch Embedding:**
- Split image into non-overlapping patches
- Flatten each patch: $P \times P \times C \rightarrow P^2 C$
- Linear projection: $P^2 C \rightarrow D$ (embedding dimension)

**2. [CLS] Token:**
- Learnable embedding prepended to patches
- Aggregates information via attention
- Used for final classification

**3. Position Embeddings:**
- Learnable 1D position embeddings
- Added to patch embeddings
- Enables model to know spatial arrangement

**4. Transformer Encoder:**
- Standard transformer blocks
- Multi-head self-attention + MLP
- Pre-norm (LayerNorm before attention)

---

## 🏗️ ViT Architecture

### Architecture Variants

| Model | Layers | Hidden Size | MLP Size | Heads | Params |
|-------|--------|-------------|----------|-------|--------|
| ViT-Tiny | 12 | 192 | 768 | 3 | 5.7M |
| ViT-Small | 12 | 384 | 1536 | 6 | 22M |
| ViT-Base | 12 | 768 | 3072 | 12 | 86M |
| ViT-Large | 24 | 1024 | 4096 | 16 | 307M |
| ViT-Huge | 32 | 1280 | 5120 | 16 | 632M |

### Detailed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ViT-BASE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input: [3, 224, 224]                                       │
│                                                              │
│  Patch Embedding:                                           │
│    Conv2d(3, 768, kernel=16, stride=16) or                  │
│    Reshape + Linear                                         │
│    → [196, 768]                                             │
│                                                              │
│  Add CLS + Position:                                        │
│    CLS token [1, 768]                                       │
│    Position embeddings [197, 768]                           │
│    → [197, 768]                                             │
│                                                              │
│  Transformer Encoder (×12):                                 │
│    ┌───────────────────────────────┐                        │
│    │ LayerNorm(768)                │                        │
│    │ MHSA(heads=12, dim=64)        │                        │
│    │   Q, K, V projections         │                        │
│    │   Attention: softmax(QK^T/√d)V│                        │
│    │ Residual Add                  │                        │
│    │ LayerNorm(768)                │                        │
│    │ MLP(768 → 3072 → 768)         │                        │
│    │   Linear + GELU + Linear      │                        │
│    │ Residual Add                  │                        │
│    └───────────────────────────────┘                        │
│    → [197, 768]                                             │
│                                                              │
│  Classification Head:                                       │
│    Take CLS token [768]                                     │
│    LayerNorm + Linear(768, num_classes)                     │
│    → [num_classes]                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📐 Mathematical Formulation

### Patch Embedding

Given image $\mathbf{x} \in \mathbb{R}^{H \times W \times C}$ and patch size $P$:

$$\mathbf{x}_p^i = \text{Flatten}(\mathbf{x}[(i \div N_w)P : (i \div N_w + 1)P, (i \mod N_w)P : (i \mod N_w + 1)P])$$

Where $N = HW/P^2$ is the number of patches.

**Linear projection:**
$$\mathbf{z}_0^i = \mathbf{x}_p^i \mathbf{E} + \mathbf{e}_{pos}^i, \quad \mathbf{E} \in \mathbb{R}^{P^2C \times D}$$

### Adding CLS and Position

$$\mathbf{z}_0 = [\mathbf{x}_{cls}; \mathbf{z}_0^1; \mathbf{z}_0^2; ...; \mathbf{z}_0^N] + \mathbf{E}_{pos}$$

Where:
- $\mathbf{x}_{cls} \in \mathbb{R}^D$ is learnable CLS token
- $\mathbf{E}_{pos} \in \mathbb{R}^{(N+1) \times D}$ is learnable position embedding

### Transformer Encoder

For layer $\ell = 1, ..., L$:

$$\mathbf{z}'_\ell = \text{MSA}(\text{LN}(\mathbf{z}_{\ell-1})) + \mathbf{z}_{\ell-1}$$
$$\mathbf{z}_\ell = \text{MLP}(\text{LN}(\mathbf{z}'_\ell)) + \mathbf{z}'_\ell$$

**Multi-head Self-Attention:**
$$\text{MSA}(\mathbf{z}) = \text{Concat}(head_1, ..., head_h)\mathbf{W}^O$$
$$head_i = \text{Attention}(\mathbf{z}\mathbf{W}^Q_i, \mathbf{z}\mathbf{W}^K_i, \mathbf{z}\mathbf{W}^V_i)$$
$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left(\frac{\mathbf{QK}^T}{\sqrt{d_k}}\right)\mathbf{V}$$

**MLP (Feed-Forward Network):**
$$\text{MLP}(\mathbf{z}) = \text{GELU}(\mathbf{z}\mathbf{W}_1 + \mathbf{b}_1)\mathbf{W}_2 + \mathbf{b}_2$$

### Classification

$$\mathbf{y} = \text{LN}(\mathbf{z}_L^0)\mathbf{W}_{cls}$$

Where $\mathbf{z}_L^0$ is the CLS token from the final layer.

---

## 🎓 Training Strategies

### Why ViT Needs Lots of Data

**The Problem:**
- CNNs have strong inductive biases (locality, translation)
- ViT learns everything from scratch
- Without enough data, ViT underfits

**The Solution:**
- Pre-train on huge datasets (ImageNet-21K, JFT-300M)
- Use strong data augmentation
- Apply regularization techniques

### Training Recipe (DeiT)

```python
training_config = {
    # Data Augmentation
    'augmentation': {
        'random_crop': True,
        'random_horizontal_flip': True,
        'rand_augment': {'N': 2, 'M': 9},  # RandAugment
        'random_erasing': 0.25,
        'mixup': 0.8,
        'cutmix': 1.0,
    },
    
    # Regularization
    'regularization': {
        'dropout': 0.0,  # ViT doesn't use dropout
        'attention_dropout': 0.0,
        'drop_path': 0.1,  # Stochastic depth
        'label_smoothing': 0.1,
    },
    
    # Optimization
    'optimization': {
        'optimizer': 'AdamW',
        'learning_rate': 1e-3,
        'weight_decay': 0.05,
        'epochs': 300,
        'warmup_epochs': 5,
        'batch_size': 1024,
        'lr_schedule': 'cosine',
    }
}
```

### Key Training Techniques

**1. Mixup and CutMix:**
```python
def mixup(images, labels, alpha=0.8):
    """Mix two images and their labels"""
    lam = np.random.beta(alpha, alpha)
    index = torch.randperm(images.size(0))
    
    mixed_images = lam * images + (1 - lam) * images[index]
    labels_a, labels_b = labels, labels[index]
    
    return mixed_images, labels_a, labels_b, lam

def mixup_loss(output, labels_a, labels_b, lam):
    return lam * F.cross_entropy(output, labels_a) + \
           (1 - lam) * F.cross_entropy(output, labels_b)
```

**2. Stochastic Depth (Drop Path):**
```python
class DropPath(nn.Module):
    """Randomly drop entire residual path"""
    def __init__(self, drop_prob=0.1):
        super().__init__()
        self.drop_prob = drop_prob
    
    def forward(self, x):
        if not self.training or self.drop_prob == 0:
            return x
        
        keep_prob = 1 - self.drop_prob
        shape = (x.shape[0],) + (1,) * (x.ndim - 1)
        mask = torch.bernoulli(torch.full(shape, keep_prob, device=x.device))
        
        return x * mask / keep_prob
```

**3. RandAugment:**
```python
# Automatically searched augmentation policies
from torchvision.transforms import RandAugment

transform = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    RandAugment(num_ops=2, magnitude=9),  # Key!
    transforms.ToTensor(),
    transforms.Normalize(mean, std),
])
```

---

## 🔄 ViT Variants

### 1. DeiT (Data-efficient Image Transformers)

- Trains on ImageNet-1K (vs ViT's ImageNet-21K)
- Uses distillation token (learns from CNN teacher)
- Strong augmentation and regularization

```python
class DeiT(nn.Module):
    def __init__(self):
        super().__init__()
        # Add distillation token alongside CLS
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.dist_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        
    def forward(self, x):
        # ... patch embedding ...
        x = torch.cat([self.cls_token, self.dist_token, x], dim=1)
        # ... transformer ...
        return x[:, 0], x[:, 1]  # cls output, distillation output
```

### 2. Swin Transformer

- Hierarchical feature maps (like CNN)
- Local attention within windows
- Shifted windows for cross-window connections

```
┌─────────────────────────────────────────────────────────────┐
│                    SWIN TRANSFORMER                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stage 1: [56×56] patches, 96 dim                           │
│           Window attention (7×7 windows)                    │
│                        ↓ Merge                               │
│  Stage 2: [28×28] patches, 192 dim                          │
│           Shifted window attention                          │
│                        ↓ Merge                               │
│  Stage 3: [14×14] patches, 384 dim                          │
│                        ↓ Merge                               │
│  Stage 4: [7×7] patches, 768 dim                            │
│                                                              │
│  Benefits: Linear complexity, hierarchical features         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. BEiT (BERT Pre-training for Images)

- Masked image modeling (like BERT)
- Predict discrete visual tokens
- Self-supervised pre-training

### 4. DINO (Self-Distillation with No Labels)

- Self-supervised learning
- Student-teacher framework (same architecture)
- No labels needed!

```python
# DINO pseudo-code
def dino_loss(student_out, teacher_out, temperature_s=0.1, temperature_t=0.04):
    student_probs = F.softmax(student_out / temperature_s, dim=-1)
    teacher_probs = F.softmax(teacher_out / temperature_t, dim=-1)
    
    # Cross-entropy loss (student learns from teacher)
    loss = -torch.sum(teacher_probs * torch.log(student_probs), dim=-1)
    return loss.mean()
```

---

## 💻 Implementation

### Complete ViT from Scratch

```python
"""
Vision Transformer (ViT) Implementation from Scratch
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import math
from einops import rearrange
from tqdm import tqdm

# ============================================
# PATCH EMBEDDING
# ============================================

class PatchEmbedding(nn.Module):
    """
    Convert image to patch embeddings
    Image [B, C, H, W] → Patches [B, N, D]
    """
    def __init__(
        self,
        img_size: int = 224,
        patch_size: int = 16,
        in_channels: int = 3,
        embed_dim: int = 768
    ):
        super().__init__()
        self.img_size = img_size
        self.patch_size = patch_size
        self.num_patches = (img_size // patch_size) ** 2
        
        # Can use Conv2d as linear projection
        self.proj = nn.Conv2d(
            in_channels, embed_dim,
            kernel_size=patch_size, stride=patch_size
        )
    
    def forward(self, x):
        # x: [B, C, H, W]
        x = self.proj(x)  # [B, D, H/P, W/P]
        x = x.flatten(2)  # [B, D, N]
        x = x.transpose(1, 2)  # [B, N, D]
        return x


# ============================================
# MULTI-HEAD SELF-ATTENTION
# ============================================

class MultiHeadSelfAttention(nn.Module):
    """
    Multi-head self-attention with optional attention dropout
    """
    def __init__(
        self,
        embed_dim: int = 768,
        num_heads: int = 12,
        qkv_bias: bool = True,
        attn_drop: float = 0.0,
        proj_drop: float = 0.0
    ):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        self.scale = self.head_dim ** -0.5
        
        self.qkv = nn.Linear(embed_dim, embed_dim * 3, bias=qkv_bias)
        self.attn_drop = nn.Dropout(attn_drop)
        self.proj = nn.Linear(embed_dim, embed_dim)
        self.proj_drop = nn.Dropout(proj_drop)
    
    def forward(self, x):
        B, N, C = x.shape
        
        # QKV projection
        qkv = self.qkv(x).reshape(B, N, 3, self.num_heads, self.head_dim)
        qkv = qkv.permute(2, 0, 3, 1, 4)  # [3, B, H, N, D]
        q, k, v = qkv[0], qkv[1], qkv[2]
        
        # Attention
        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = attn.softmax(dim=-1)
        attn = self.attn_drop(attn)
        
        # Combine heads
        x = (attn @ v).transpose(1, 2).reshape(B, N, C)
        x = self.proj(x)
        x = self.proj_drop(x)
        
        return x


# ============================================
# MLP (FEED-FORWARD NETWORK)
# ============================================

class MLP(nn.Module):
    """
    MLP with GELU activation
    """
    def __init__(
        self,
        in_features: int,
        hidden_features: int = None,
        out_features: int = None,
        drop: float = 0.0
    ):
        super().__init__()
        hidden_features = hidden_features or in_features * 4
        out_features = out_features or in_features
        
        self.fc1 = nn.Linear(in_features, hidden_features)
        self.act = nn.GELU()
        self.fc2 = nn.Linear(hidden_features, out_features)
        self.drop = nn.Dropout(drop)
    
    def forward(self, x):
        x = self.fc1(x)
        x = self.act(x)
        x = self.drop(x)
        x = self.fc2(x)
        x = self.drop(x)
        return x


# ============================================
# DROP PATH (STOCHASTIC DEPTH)
# ============================================

class DropPath(nn.Module):
    """
    Drop paths (Stochastic Depth) per sample
    """
    def __init__(self, drop_prob: float = 0.0):
        super().__init__()
        self.drop_prob = drop_prob
    
    def forward(self, x):
        if self.drop_prob == 0. or not self.training:
            return x
        
        keep_prob = 1 - self.drop_prob
        shape = (x.shape[0],) + (1,) * (x.ndim - 1)
        random_tensor = keep_prob + torch.rand(shape, dtype=x.dtype, device=x.device)
        random_tensor.floor_()
        
        return x.div(keep_prob) * random_tensor


# ============================================
# TRANSFORMER BLOCK
# ============================================

class TransformerBlock(nn.Module):
    """
    Single transformer block: Attention + MLP with residuals
    """
    def __init__(
        self,
        embed_dim: int = 768,
        num_heads: int = 12,
        mlp_ratio: float = 4.0,
        drop: float = 0.0,
        attn_drop: float = 0.0,
        drop_path: float = 0.0
    ):
        super().__init__()
        self.norm1 = nn.LayerNorm(embed_dim)
        self.attn = MultiHeadSelfAttention(
            embed_dim, num_heads,
            attn_drop=attn_drop, proj_drop=drop
        )
        self.drop_path = DropPath(drop_path) if drop_path > 0 else nn.Identity()
        self.norm2 = nn.LayerNorm(embed_dim)
        self.mlp = MLP(
            embed_dim,
            hidden_features=int(embed_dim * mlp_ratio),
            drop=drop
        )
    
    def forward(self, x):
        # Pre-norm design
        x = x + self.drop_path(self.attn(self.norm1(x)))
        x = x + self.drop_path(self.mlp(self.norm2(x)))
        return x


# ============================================
# VISION TRANSFORMER
# ============================================

class VisionTransformer(nn.Module):
    """
    Complete Vision Transformer (ViT) implementation
    """
    def __init__(
        self,
        img_size: int = 224,
        patch_size: int = 16,
        in_channels: int = 3,
        num_classes: int = 1000,
        embed_dim: int = 768,
        depth: int = 12,
        num_heads: int = 12,
        mlp_ratio: float = 4.0,
        drop_rate: float = 0.0,
        attn_drop_rate: float = 0.0,
        drop_path_rate: float = 0.1
    ):
        super().__init__()
        self.num_classes = num_classes
        self.embed_dim = embed_dim
        
        # Patch embedding
        self.patch_embed = PatchEmbedding(
            img_size, patch_size, in_channels, embed_dim
        )
        num_patches = self.patch_embed.num_patches
        
        # CLS token and position embeddings
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))
        self.pos_drop = nn.Dropout(drop_rate)
        
        # Stochastic depth decay
        dpr = [x.item() for x in torch.linspace(0, drop_path_rate, depth)]
        
        # Transformer blocks
        self.blocks = nn.ModuleList([
            TransformerBlock(
                embed_dim, num_heads, mlp_ratio,
                drop=drop_rate, attn_drop=attn_drop_rate, drop_path=dpr[i]
            )
            for i in range(depth)
        ])
        
        # Classification head
        self.norm = nn.LayerNorm(embed_dim)
        self.head = nn.Linear(embed_dim, num_classes)
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        # Initialize patch embedding
        nn.init.trunc_normal_(self.pos_embed, std=0.02)
        nn.init.trunc_normal_(self.cls_token, std=0.02)
        
        # Initialize other layers
        self.apply(self._init_layer)
    
    def _init_layer(self, m):
        if isinstance(m, nn.Linear):
            nn.init.trunc_normal_(m.weight, std=0.02)
            if m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.LayerNorm):
            nn.init.constant_(m.bias, 0)
            nn.init.constant_(m.weight, 1.0)
    
    def forward_features(self, x):
        """Extract features (without classification head)"""
        B = x.shape[0]
        
        # Patch embedding
        x = self.patch_embed(x)  # [B, N, D]
        
        # Add CLS token
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat([cls_tokens, x], dim=1)  # [B, N+1, D]
        
        # Add position embeddings
        x = x + self.pos_embed
        x = self.pos_drop(x)
        
        # Transformer blocks
        for block in self.blocks:
            x = block(x)
        
        x = self.norm(x)
        
        return x[:, 0]  # Return CLS token
    
    def forward(self, x):
        x = self.forward_features(x)
        x = self.head(x)
        return x


# ============================================
# MODEL VARIANTS
# ============================================

def vit_tiny(num_classes=1000, **kwargs):
    return VisionTransformer(
        embed_dim=192, depth=12, num_heads=3,
        num_classes=num_classes, **kwargs
    )

def vit_small(num_classes=1000, **kwargs):
    return VisionTransformer(
        embed_dim=384, depth=12, num_heads=6,
        num_classes=num_classes, **kwargs
    )

def vit_base(num_classes=1000, **kwargs):
    return VisionTransformer(
        embed_dim=768, depth=12, num_heads=12,
        num_classes=num_classes, **kwargs
    )

def vit_large(num_classes=1000, **kwargs):
    return VisionTransformer(
        embed_dim=1024, depth=24, num_heads=16,
        num_classes=num_classes, **kwargs
    )


# ============================================
# TRAINING EXAMPLE
# ============================================

def train_vit_cifar10():
    """Train ViT on CIFAR-10"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # Data (resize CIFAR-10 to 224×224)
    transform_train = transforms.Compose([
        transforms.Resize(224),
        transforms.RandomHorizontalFlip(),
        transforms.RandAugment(num_ops=2, magnitude=9),
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])
    
    transform_test = transforms.Compose([
        transforms.Resize(224),
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])
    
    train_dataset = datasets.CIFAR10('./data', train=True, download=True, transform=transform_train)
    test_dataset = datasets.CIFAR10('./data', train=False, transform=transform_test)
    
    train_loader = DataLoader(train_dataset, batch_size=128, shuffle=True, num_workers=4)
    test_loader = DataLoader(test_dataset, batch_size=128, num_workers=4)
    
    # Model (tiny ViT for CIFAR-10)
    model = vit_tiny(num_classes=10, img_size=224, patch_size=16)
    model = model.to(device)
    
    print(f"Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.05)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)
    
    # Training
    for epoch in range(100):
        model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for images, labels in tqdm(train_loader, desc=f'Epoch {epoch+1}'):
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = F.cross_entropy(outputs, labels)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
        
        scheduler.step()
        
        train_acc = 100. * correct / total
        
        # Evaluate
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()
        
        test_acc = 100. * correct / total
        print(f'Epoch {epoch+1}: Loss={total_loss/len(train_loader):.4f}, '
              f'Train Acc={train_acc:.2f}%, Test Acc={test_acc:.2f}%')
    
    return model


if __name__ == "__main__":
    model = train_vit_cifar10()
```

---

## 🛠️ Hands-On Project

### Project: Build ViT with Attention Visualization

```python
"""
Project: ViT with Attention Visualization
Understand what the model sees
"""

import torch
import torch.nn as nn
import matplotlib.pyplot as plt
from PIL import Image
import numpy as np

# [Use the ViT implementation from above]

class ViTWithAttention(VisionTransformer):
    """ViT that returns attention maps for visualization"""
    
    def forward_with_attention(self, x):
        B = x.shape[0]
        attention_maps = []
        
        # Patch embedding
        x = self.patch_embed(x)
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat([cls_tokens, x], dim=1)
        x = x + self.pos_embed
        x = self.pos_drop(x)
        
        # Transformer blocks with attention capture
        for block in self.blocks:
            # Manually compute attention for visualization
            residual = x
            x_norm = block.norm1(x)
            
            # Get attention weights
            B, N, C = x_norm.shape
            qkv = block.attn.qkv(x_norm).reshape(B, N, 3, block.attn.num_heads, -1)
            qkv = qkv.permute(2, 0, 3, 1, 4)
            q, k, v = qkv[0], qkv[1], qkv[2]
            
            attn = (q @ k.transpose(-2, -1)) * block.attn.scale
            attn = attn.softmax(dim=-1)
            attention_maps.append(attn.detach())
            
            # Complete forward pass
            x = residual + block.drop_path(block.attn(block.norm1(residual)))
            x = x + block.drop_path(block.mlp(block.norm2(x)))
        
        x = self.norm(x)
        return x[:, 0], attention_maps


def visualize_attention(model, image_tensor, img_size=224, patch_size=16):
    """
    Visualize attention from CLS token to patches
    """
    model.eval()
    
    with torch.no_grad():
        _, attention_maps = model.forward_with_attention(image_tensor.unsqueeze(0))
    
    # Average attention across heads and layers
    # Take attention from CLS token (index 0) to patches
    num_patches = (img_size // patch_size) ** 2
    
    # Last layer, all heads, CLS to patches
    attn = attention_maps[-1][0]  # [heads, N+1, N+1]
    attn = attn.mean(0)  # Average over heads
    attn = attn[0, 1:]  # CLS to patches (exclude CLS-to-CLS)
    
    # Reshape to image
    h = w = int(np.sqrt(num_patches))
    attn = attn.reshape(h, w).cpu().numpy()
    
    # Visualize
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    # Original image
    img = image_tensor.permute(1, 2, 0).cpu().numpy()
    img = (img - img.min()) / (img.max() - img.min())
    axes[0].imshow(img)
    axes[0].set_title('Original Image')
    axes[0].axis('off')
    
    # Attention map
    axes[1].imshow(attn, cmap='hot')
    axes[1].set_title('Attention (CLS → Patches)')
    axes[1].axis('off')
    
    # Overlay
    attn_resized = np.array(Image.fromarray(attn).resize((img_size, img_size)))
    attn_resized = (attn_resized - attn_resized.min()) / (attn_resized.max() - attn_resized.min())
    axes[2].imshow(img)
    axes[2].imshow(attn_resized, cmap='hot', alpha=0.5)
    axes[2].set_title('Attention Overlay')
    axes[2].axis('off')
    
    plt.tight_layout()
    plt.savefig('attention_visualization.png')
    plt.show()
    
    return attn


def attention_rollout(attention_maps):
    """
    Compute attention rollout (accumulated attention flow)
    """
    # Start with identity
    result = torch.eye(attention_maps[0].shape[-1])
    
    for attn in attention_maps:
        # Average over heads
        attn = attn.mean(dim=1)  # [B, N, N]
        
        # Add identity (residual)
        attn = attn + torch.eye(attn.shape[-1], device=attn.device)
        attn = attn / attn.sum(dim=-1, keepdim=True)
        
        # Accumulate
        result = result @ attn[0].cpu()
    
    return result[0, 1:]  # CLS to patches


# Usage
if __name__ == "__main__":
    # Load pre-trained model
    model = ViTWithAttention(num_classes=1000, img_size=224, patch_size=16)
    
    # Load and preprocess image
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])
    
    image = Image.open('sample_image.jpg')
    image_tensor = transform(image)
    
    # Visualize
    visualize_attention(model, image_tensor)
```

---

## ⚠️ Common Mistakes

### 1. Wrong Position Embedding Size

```python
# ❌ Bad - Position embedding doesn't match
self.pos_embed = nn.Parameter(torch.zeros(1, 196, embed_dim))  # 196 patches
# But then using 224×224 with patch=14 gives 256 patches!

# ✅ Good - Calculate correctly
num_patches = (img_size // patch_size) ** 2  # = 256 for 224/14
self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))  # +1 for CLS
```

### 2. Forgetting Pre-norm

```python
# ❌ Bad - Post-norm (like original Transformer)
x = self.attn(x)
x = self.norm1(x)  # Norm after

# ✅ Good - Pre-norm (ViT uses this)
x = x + self.attn(self.norm1(x))  # Norm before
```

### 3. Not Using Enough Augmentation

```python
# ❌ Bad - Minimal augmentation (ViT will overfit)
transform = transforms.Compose([
    transforms.ToTensor(),
])

# ✅ Good - Strong augmentation
transform = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    RandAugment(num_ops=2, magnitude=9),
    transforms.ToTensor(),
    transforms.Normalize(mean, std),
])
```

---

## 🎯 Interview Questions

### Q1: How does ViT process an image differently from CNNs?

**Answer:**

| Aspect | CNN | ViT |
|--------|-----|-----|
| **Input processing** | Convolve over pixels | Split into patches |
| **Receptive field** | Local → global (gradually) | Global (from layer 1) |
| **Inductive bias** | Translation equivariance, locality | Minimal (learns everything) |
| **Architecture** | Conv → Pool → Conv... | Patch embed → Transformer |

**ViT Process:**
1. Split image into 16×16 patches (like words)
2. Linearly embed each patch
3. Add position embeddings
4. Process through Transformer encoder
5. Use CLS token for classification

---

### Q2: Why does ViT need more data than CNNs?

**Answer:**
**CNNs have strong inductive biases:**
- Locality (nearby pixels are related)
- Translation equivariance (features work anywhere)
- These biases give CNNs a "head start"

**ViT must learn everything:**
- No built-in locality assumption
- Must learn that nearby patches matter
- Must learn translation invariance from data

**Solutions:**
- Pre-train on huge datasets (ImageNet-21K, JFT-300M)
- Use strong augmentation (RandAugment, Mixup, CutMix)
- Apply regularization (DropPath, label smoothing)
- Use knowledge distillation (DeiT approach)

---

### Q3: Explain the role of the CLS token.

**Answer:**
The CLS token is a special learnable embedding that:

1. **Aggregates information:** Through self-attention, it can attend to all patches
2. **Provides fixed output:** Regardless of image size, we get one vector
3. **Avoids pooling:** No need for global average pooling

**How it works:**
```
[CLS] → Attention with all patches → Final [CLS] contains global info → Classification
```

**Alternatives:**
- Global Average Pooling of all patch tokens
- Both work similarly, CLS is the original design

---

### Q4: What is stochastic depth and why is it used in ViT?

**Answer:**
**Stochastic depth (DropPath):** Randomly skip entire residual blocks during training.

$$x = x + \text{DropPath}(f(x))$$

**Why use it:**
1. **Regularization:** Prevents overfitting
2. **Implicit ensemble:** Different paths active each forward pass
3. **Training efficiency:** Shorter effective depth → faster convergence

**Implementation:**
```python
# Linear decay: deeper layers dropped more often
drop_rates = [x * (drop_path_rate / depth) for x in range(depth)]
```

---

### Q5: Compare ViT to Swin Transformer.

**Answer:**

| Aspect | ViT | Swin |
|--------|-----|------|
| **Attention** | Global (all patches) | Local (within windows) |
| **Complexity** | O(n²) | O(n) (linear) |
| **Features** | Single resolution | Hierarchical (like CNN) |
| **Cross-window** | N/A | Shifted windows |
| **Dense tasks** | Needs adaptation | Native support |

**When to use:**
- **ViT:** Classification, when compute isn't limiting
- **Swin:** Detection, segmentation, limited compute

---

## 📝 Homework

### Level 1: Basic
1. Explain how images become "tokens" in ViT
2. Why is position embedding necessary?
3. Calculate number of patches for 384×384 image with P=16

### Level 2: Intermediate
1. Implement patch embedding from scratch
2. Train ViT-Tiny on CIFAR-10
3. Visualize attention maps

### Level 3: Advanced
1. Implement full ViT with all components
2. Add Mixup and CutMix augmentation
3. Implement DeiT-style distillation

### Level 4: Expert
1. Implement Swin Transformer
2. Pre-train ViT with masked image modeling
3. Fine-tune for object detection

---

## 🔗 Resources

- [ViT Paper](https://arxiv.org/abs/2010.11929)
- [DeiT Paper](https://arxiv.org/abs/2012.12877)
- [Swin Transformer](https://arxiv.org/abs/2103.14030)
- [HuggingFace ViT](https://huggingface.co/docs/transformers/model_doc/vit)
- [timm Library](https://github.com/huggingface/pytorch-image-models)

---

**Next:** [04-Multimodal-AI.md](./04-Multimodal-AI.md) - Multimodal Models
