# 🔗 CLIP Deep Dive

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [CLIP Fundamentals](#-clip-fundamentals)
3. [Architecture Details](#-architecture-details)
4. [Training at Scale](#-training-at-scale)
5. [CLIP Capabilities](#-clip-capabilities)
6. [Advanced CLIP Techniques](#-advanced-clip-techniques)
7. [CLIP Variants](#-clip-variants)
8. [Implementation](#-implementation)
9. [Hands-On Project](#-hands-on-project)
10. [Common Mistakes](#-common-mistakes)
11. [Interview Questions](#-interview-questions)
12. [Homework](#-homework)

---

## 🎯 Introduction

**CLIP (Contrastive Language-Image Pre-training)** is a foundational model that learns visual concepts from natural language supervision. It's the backbone of DALL-E, Stable Diffusion, and countless vision applications.

### CLIP's Impact

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIP'S INFLUENCE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Direct Applications:                                        │
│  ├─ Zero-shot image classification                          │
│  ├─ Image-text retrieval                                    │
│  ├─ Image search engines                                    │
│  └─ Content moderation                                      │
│                                                              │
│  As Component:                                               │
│  ├─ DALL-E 2/3: Text encoder for image generation          │
│  ├─ Stable Diffusion: Conditioning signal                  │
│  ├─ LLaVA/GPT-4V: Visual encoder                           │
│  └─ Segment Anything: Feature extraction                   │
│                                                              │
│  Research:                                                   │
│  ├─ Transfer learning standard                              │
│  ├─ Robustness benchmark                                    │
│  └─ Multimodal foundation                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Numbers

| Metric | Value |
|--------|-------|
| Training Data | 400M image-text pairs |
| Training Compute | 256 V100 GPUs × 12 days |
| ImageNet Zero-shot | 76.2% (ViT-L/14@336) |
| Model Variants | ResNet, ViT (B/32, B/16, L/14) |
| Downloads (monthly) | 10M+ |

---

## 🔬 CLIP Fundamentals

### The Core Insight

Traditional computer vision:
```
1. Collect labeled data (expensive)
2. Train on fixed labels
3. Model knows only those labels
```

CLIP's approach:
```
1. Use internet's image-text pairs (free, unlimited)
2. Learn general visual-language alignment
3. Model understands ANY text description!
```

### Contrastive Pre-training

```
┌─────────────────────────────────────────────────────────────┐
│                CONTRASTIVE TRAINING                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Batch of N image-text pairs:                               │
│                                                              │
│  Images:  [I₁, I₂, I₃, I₄]                                  │
│  Texts:   [T₁, T₂, T₃, T₄]                                  │
│                                                              │
│  Similarity Matrix:                                          │
│                                                              │
│           T₁    T₂    T₃    T₄                              │
│     I₁  [0.9   0.1   0.2   0.1]  ← Want [1,0,0,0]           │
│     I₂  [0.1   0.85  0.15  0.1]  ← Want [0,1,0,0]           │
│     I₃  [0.2   0.1   0.88  0.2]  ← Want [0,0,1,0]           │
│     I₄  [0.1   0.15  0.1   0.92] ← Want [0,0,0,1]           │
│                                                              │
│  Loss: Cross-entropy on each row and column                 │
│  Goal: Maximize diagonal (matching pairs)                   │
│        Minimize off-diagonal (non-matching)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Mathematical Formulation

**Embeddings:**
$$\mathbf{I}_i = \text{normalize}(f_{image}(image_i))$$
$$\mathbf{T}_j = \text{normalize}(f_{text}(text_j))$$

**Similarity:**
$$s_{ij} = \tau \cdot \mathbf{I}_i^T \mathbf{T}_j$$

Where $\tau$ is learnable temperature (logit scale).

**Image-to-Text Loss:**
$$\mathcal{L}_{i2t} = -\frac{1}{N}\sum_{i=1}^{N} \log \frac{\exp(s_{ii})}{\sum_{j=1}^{N} \exp(s_{ij})}$$

**Text-to-Image Loss:**
$$\mathcal{L}_{t2i} = -\frac{1}{N}\sum_{j=1}^{N} \log \frac{\exp(s_{jj})}{\sum_{i=1}^{N} \exp(s_{ij})}$$

**Total Loss:**
$$\mathcal{L} = \frac{1}{2}(\mathcal{L}_{i2t} + \mathcal{L}_{t2i})$$

---

## 🏗️ Architecture Details

### Vision Encoder Options

```
┌─────────────────────────────────────────────────────────────┐
│                 CLIP VISION ENCODERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ResNet Family:                                              │
│  ├─ RN50: ResNet-50, attention pooling                      │
│  ├─ RN101: ResNet-101                                       │
│  ├─ RN50x4: 4× width                                        │
│  ├─ RN50x16: 16× width                                      │
│  └─ RN50x64: 64× width (1.2B params!)                       │
│                                                              │
│  Vision Transformer Family:                                 │
│  ├─ ViT-B/32: Base, patch 32 (fastest)                     │
│  ├─ ViT-B/16: Base, patch 16                               │
│  ├─ ViT-L/14: Large, patch 14 (best general)               │
│  └─ ViT-L/14@336: Large at 336×336 resolution              │
│                                                              │
│  Trade-offs:                                                 │
│  ├─ Speed: B/32 > B/16 > L/14                              │
│  ├─ Quality: L/14 > B/16 > B/32                            │
│  └─ Memory: B/32 < B/16 < L/14                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Text Encoder

CLIP's text encoder is a GPT-2 style transformer:

```python
class CLIPTextEncoder(nn.Module):
    def __init__(
        self,
        vocab_size: int = 49408,  # BPE vocabulary
        context_length: int = 77,
        embed_dim: int = 512,
        num_layers: int = 12,
        num_heads: int = 8,
        width: int = 512
    ):
        super().__init__()
        
        self.token_embedding = nn.Embedding(vocab_size, width)
        self.positional_embedding = nn.Parameter(
            torch.zeros(context_length, width)
        )
        
        self.transformer = nn.TransformerEncoder(
            nn.TransformerEncoderLayer(
                d_model=width,
                nhead=num_heads,
                dim_feedforward=width * 4,
                activation='gelu'
            ),
            num_layers=num_layers
        )
        
        self.ln_final = nn.LayerNorm(width)
        self.projection = nn.Linear(width, embed_dim, bias=False)
    
    def forward(self, text):
        # text: [batch, seq_len] token indices
        x = self.token_embedding(text)
        x = x + self.positional_embedding[:text.size(1)]
        
        # Causal attention mask
        x = self.transformer(x)
        
        x = self.ln_final(x)
        
        # Take features at EOS token position
        # EOS is the argmax of each sequence (highest token)
        x = x[torch.arange(x.size(0)), text.argmax(dim=-1)]
        
        x = self.projection(x)
        return x
```

### Attention Pooling (for ResNet)

ResNet doesn't have a CLS token, so CLIP uses attention pooling:

```python
class AttentionPool2d(nn.Module):
    """
    Attention pooling for ResNet backbone
    """
    def __init__(self, spatial_dim, embed_dim, num_heads, output_dim):
        super().__init__()
        
        self.positional_embedding = nn.Parameter(
            torch.randn(spatial_dim ** 2 + 1, embed_dim) / embed_dim ** 0.5
        )
        
        # Query comes from learnable "CLS" token
        self.q_proj = nn.Linear(embed_dim, embed_dim)
        self.k_proj = nn.Linear(embed_dim, embed_dim)
        self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.c_proj = nn.Linear(embed_dim, output_dim)
        
        self.num_heads = num_heads
    
    def forward(self, x):
        # x: [B, C, H, W]
        x = x.flatten(2).permute(2, 0, 1)  # [HW, B, C]
        
        # Add learnable query token
        query = x.mean(dim=0, keepdim=True)  # Global average as query
        x = torch.cat([query, x], dim=0)  # [HW+1, B, C]
        
        # Add positional embedding
        x = x + self.positional_embedding[:, None, :]
        
        # Cross-attention (query attends to spatial features)
        q = self.q_proj(x[:1])  # Only query token
        k = self.k_proj(x)
        v = self.v_proj(x)
        
        # Multi-head attention
        attn = torch.softmax(q @ k.transpose(-2, -1) / (q.size(-1) ** 0.5), dim=-1)
        out = attn @ v
        
        return self.c_proj(out.squeeze(0))
```

---

## 📈 Training at Scale

### Dataset: WebImageText (WIT)

```
┌─────────────────────────────────────────────────────────────┐
│                    WIT DATASET                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Collection:                                                 │
│  ├─ Scraped from public internet                            │
│  ├─ Alt-text as image descriptions                          │
│  ├─ Minimal filtering (no ImageNet overlap)                 │
│  └─ 400 million image-text pairs                            │
│                                                              │
│  Comparison:                                                 │
│  ├─ ImageNet: 1.2M images, 1K classes                       │
│  ├─ COCO: 330K images, captions                            │
│  ├─ CC3M: 3M pairs                                          │
│  ├─ CC12M: 12M pairs                                        │
│  └─ WIT: 400M pairs (33× larger than previous!)            │
│                                                              │
│  Quality vs Quantity:                                       │
│  ├─ Noisy labels but massive scale                          │
│  └─ Scale wins! (with contrastive learning)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Training Configuration

```python
training_config = {
    # Hardware
    'gpus': 256,  # V100 32GB
    'batch_size_per_gpu': 32768 // 256,  # Total batch: 32768
    
    # Optimization
    'optimizer': 'AdamW',
    'learning_rate': 5e-4,
    'weight_decay': 0.2,
    'warmup_steps': 2000,
    'total_steps': 400_000,  # ~12 days
    
    # Scheduler
    'lr_schedule': 'cosine',
    
    # Mixed precision
    'fp16': True,
    
    # Temperature
    'initial_temperature': 0.07,
    'learnable_temperature': True,
    'max_temperature': 100.0,  # Clipped
}
```

### Large Batch Training

Why large batches matter for CLIP:

```
Small batch (N=64):
- Only 64 negative pairs per positive
- Easy to distinguish (not much learning)

Large batch (N=32768):
- 32767 negative pairs per positive
- Harder task → Better representations!

The larger the batch, the better the learned features!
```

**Gradient accumulation for large batches:**

```python
def train_step_with_accumulation(model, dataloader, accumulation_steps=64):
    """
    Simulate large batch with gradient accumulation
    """
    optimizer.zero_grad()
    total_loss = 0
    
    # Accumulate gradients
    for step in range(accumulation_steps):
        images, texts = next(dataloader)
        image_feat, text_feat, logit_scale = model(images, texts)
        loss = clip_loss(image_feat, text_feat, logit_scale)
        loss = loss / accumulation_steps  # Scale loss
        loss.backward()
        total_loss += loss.item()
    
    optimizer.step()
    return total_loss
```

---

## 🎯 CLIP Capabilities

### 1. Zero-Shot Classification

```python
def zero_shot_classify(image, class_names, model, preprocess, device):
    """
    Classify image without any training on these classes
    """
    # Prepare image
    image_input = preprocess(image).unsqueeze(0).to(device)
    
    # Prepare class prompts
    prompts = [f"a photo of a {c}" for c in class_names]
    text_input = clip.tokenize(prompts).to(device)
    
    with torch.no_grad():
        image_features = model.encode_image(image_input)
        text_features = model.encode_text(text_input)
        
        # Normalize
        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)
        
        # Compute similarity
        similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
    
    # Get prediction
    probs = similarity[0].cpu().numpy()
    predicted_class = class_names[probs.argmax()]
    confidence = probs.max()
    
    return predicted_class, confidence, probs
```

### 2. Image-Text Retrieval

```python
class CLIPRetriever:
    """
    Retrieve images given text or text given images
    """
    def __init__(self, model, preprocess, device='cuda'):
        self.model = model.to(device)
        self.preprocess = preprocess
        self.device = device
        self.image_embeddings = None
        self.text_embeddings = None
    
    def build_image_index(self, images):
        """Precompute image embeddings"""
        embeddings = []
        with torch.no_grad():
            for img in images:
                img_input = self.preprocess(img).unsqueeze(0).to(self.device)
                emb = self.model.encode_image(img_input)
                emb /= emb.norm(dim=-1, keepdim=True)
                embeddings.append(emb)
        
        self.image_embeddings = torch.cat(embeddings)
    
    def search_images(self, query_text, top_k=5):
        """Find images matching text query"""
        text_input = clip.tokenize([query_text]).to(self.device)
        
        with torch.no_grad():
            text_emb = self.model.encode_text(text_input)
            text_emb /= text_emb.norm(dim=-1, keepdim=True)
        
        similarities = (text_emb @ self.image_embeddings.T).squeeze()
        top_indices = similarities.argsort(descending=True)[:top_k]
        
        return top_indices.tolist(), similarities[top_indices].tolist()
```

### 3. Prompt Engineering for CLIP

Different prompts work better for different tasks:

```python
PROMPT_TEMPLATES = {
    # General classification
    'general': [
        "a photo of a {}",
        "a picture of a {}",
        "an image of a {}",
    ],
    
    # Fine-grained (pets, flowers)
    'fine_grained': [
        "a photo of a {}, a type of pet",
        "a good photo of a {}",
        "a photo of the small {}",
    ],
    
    # Textures
    'texture': [
        "a {} texture",
        "a photo of a {} surface",
        "a close-up of {}",
    ],
    
    # Scenes
    'scene': [
        "a photo of a {}",
        "a {} scene",
        "a photograph of a {}",
    ],
}

def ensemble_predictions(image, class_names, templates, model, preprocess, device):
    """
    Ensemble multiple prompt templates for better accuracy
    """
    image_input = preprocess(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        image_features = model.encode_image(image_input)
        image_features /= image_features.norm(dim=-1, keepdim=True)
        
        all_probs = []
        for template in templates:
            prompts = [template.format(c) for c in class_names]
            text_input = clip.tokenize(prompts).to(device)
            
            text_features = model.encode_text(text_input)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            
            similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
            all_probs.append(similarity)
        
        # Average predictions
        avg_probs = torch.stack(all_probs).mean(dim=0)
    
    return avg_probs
```

### 4. Linear Probe (Fine-tuning)

```python
class CLIPLinearProbe(nn.Module):
    """
    Fine-tune only a linear classifier on top of CLIP features
    """
    def __init__(self, clip_model, num_classes, feature_dim=512):
        super().__init__()
        self.clip = clip_model
        self.classifier = nn.Linear(feature_dim, num_classes)
        
        # Freeze CLIP
        for param in self.clip.parameters():
            param.requires_grad = False
    
    def forward(self, images):
        with torch.no_grad():
            features = self.clip.encode_image(images)
            features = features / features.norm(dim=-1, keepdim=True)
        
        return self.classifier(features)

# Training linear probe
def train_linear_probe(model, train_loader, epochs=10, lr=1e-3):
    optimizer = torch.optim.Adam(model.classifier.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()
    
    for epoch in range(epochs):
        for images, labels in train_loader:
            logits = model(images)
            loss = criterion(logits, labels)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
```

---

## 🚀 Advanced CLIP Techniques

### 1. CLIP-guided Image Generation

Used in DALL-E 2, VQGAN-CLIP:

```python
def clip_guided_generation(generator, target_text, clip_model, steps=500):
    """
    Generate images that maximize CLIP similarity to target text
    """
    # Start with random latent
    latent = torch.randn(1, 512, requires_grad=True)
    optimizer = torch.optim.Adam([latent], lr=0.1)
    
    # Encode target text
    with torch.no_grad():
        text_features = clip_model.encode_text(clip.tokenize([target_text]))
        text_features /= text_features.norm(dim=-1, keepdim=True)
    
    for step in range(steps):
        # Generate image
        image = generator(latent)
        
        # Get CLIP embedding
        image_features = clip_model.encode_image(image)
        image_features /= image_features.norm(dim=-1, keepdim=True)
        
        # Maximize similarity
        similarity = (image_features @ text_features.T).squeeze()
        loss = -similarity  # Negative because we maximize
        
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    
    return generator(latent.detach())
```

### 2. CLIP for Object Detection

```python
class CLIPObjectDetector:
    """
    Use CLIP for open-vocabulary object detection
    """
    def __init__(self, clip_model, preprocess, device='cuda'):
        self.clip = clip_model.to(device)
        self.preprocess = preprocess
        self.device = device
    
    def sliding_window_detection(self, image, classes, window_sizes=[64, 128, 256]):
        """
        Simple sliding window detection using CLIP
        """
        detections = []
        
        # Encode class names
        prompts = [f"a photo of a {c}" for c in classes]
        text_features = self.encode_texts(prompts)
        
        for win_size in window_sizes:
            stride = win_size // 2
            
            for y in range(0, image.height - win_size, stride):
                for x in range(0, image.width - win_size, stride):
                    # Crop window
                    crop = image.crop((x, y, x + win_size, y + win_size))
                    
                    # Get CLIP features
                    crop_features = self.encode_image(crop)
                    
                    # Check similarity to each class
                    similarities = crop_features @ text_features.T
                    
                    max_sim, max_class = similarities.max(dim=-1)
                    if max_sim > 0.25:  # Threshold
                        detections.append({
                            'box': (x, y, x + win_size, y + win_size),
                            'class': classes[max_class],
                            'confidence': max_sim.item()
                        })
        
        return self.nms(detections)
```

### 3. CLIP Attention Visualization

```python
def visualize_clip_attention(model, image, text, device='cuda'):
    """
    Visualize what CLIP attends to for given text
    """
    # Get patch-level features (modify ViT to return all tokens)
    image_input = preprocess(image).unsqueeze(0).to(device)
    text_input = clip.tokenize([text]).to(device)
    
    # Get attention maps from last layer
    with torch.no_grad():
        # Hook to capture attention
        attention_maps = []
        
        def hook_fn(module, input, output):
            # output[1] is attention weights
            attention_maps.append(output[1])
        
        # Register hook on last attention layer
        hook = model.visual.transformer.resblocks[-1].attn.register_forward_hook(hook_fn)
        
        image_features = model.encode_image(image_input)
        text_features = model.encode_text(text_input)
        
        hook.remove()
    
    # Process attention map
    attn = attention_maps[0]  # [1, heads, tokens, tokens]
    
    # Average over heads, get CLS attention to patches
    attn = attn.mean(dim=1)  # [1, tokens, tokens]
    cls_attn = attn[0, 0, 1:]  # CLS attention to patches
    
    # Reshape to image grid
    grid_size = int(cls_attn.shape[0] ** 0.5)
    attn_map = cls_attn.reshape(grid_size, grid_size)
    
    # Upsample to image size
    attn_map = F.interpolate(
        attn_map.unsqueeze(0).unsqueeze(0),
        size=image.size[::-1],
        mode='bilinear'
    ).squeeze()
    
    return attn_map.cpu().numpy()
```

---

## 🔄 CLIP Variants

### 1. OpenCLIP

Open-source CLIP implementations with more models:

```python
import open_clip

# List available models
print(open_clip.list_pretrained())

# Load model
model, preprocess_train, preprocess_val = open_clip.create_model_and_transforms(
    'ViT-B-32',
    pretrained='laion2b_s34b_b79k'  # Trained on LAION-2B!
)
tokenizer = open_clip.get_tokenizer('ViT-B-32')

# Use like regular CLIP
image = preprocess_val(Image.open("image.jpg")).unsqueeze(0)
text = tokenizer(["a dog", "a cat"])

with torch.no_grad():
    image_features = model.encode_image(image)
    text_features = model.encode_text(text)
```

### 2. SigLIP (Sigmoid Loss)

Uses sigmoid loss instead of softmax:

```python
def siglip_loss(image_features, text_features, logit_scale, logit_bias):
    """
    SigLIP loss: Sigmoid instead of softmax
    More efficient, works with smaller batches
    """
    logits = logit_scale * image_features @ text_features.T + logit_bias
    
    # Create labels: 1 for diagonal, -1 for off-diagonal
    batch_size = image_features.shape[0]
    labels = 2 * torch.eye(batch_size, device=logits.device) - 1
    
    # Sigmoid loss
    loss = -F.logsigmoid(labels * logits).mean()
    
    return loss
```

### 3. EVA-CLIP

Improved CLIP with better ViT backbone:

- Masked Image Modeling pre-training
- Better initialization
- State-of-the-art zero-shot performance

### Comparison Table

| Model | Training Data | ImageNet Zero-shot | Key Feature |
|-------|--------------|-------------------|-------------|
| CLIP ViT-L/14 | WIT-400M | 75.5% | Original |
| OpenCLIP ViT-G/14 | LAION-2B | 80.1% | Larger data |
| SigLIP | WebLI | 83.1% | Efficient loss |
| EVA-CLIP | Various | 82.0% | Better backbone |
| MetaCLIP | CC + filtered | 79.2% | Better curation |

---

## 💻 Implementation

### Complete CLIP Training Pipeline

```python
"""
Complete CLIP Training from Scratch
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import json
from tqdm import tqdm

# ============================================
# DATASET
# ============================================

class ImageTextDataset(Dataset):
    """Dataset for image-text pairs"""
    
    def __init__(self, data_path, transform=None, tokenizer=None, max_length=77):
        with open(data_path, 'r') as f:
            self.data = json.load(f)
        
        self.transform = transform or transforms.Compose([
            transforms.Resize(224),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.48145466, 0.4578275, 0.40821073],
                std=[0.26862954, 0.26130258, 0.27577711]
            )
        ])
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        
        # Load and transform image
        image = Image.open(item['image_path']).convert('RGB')
        image = self.transform(image)
        
        # Tokenize text
        text = self.tokenizer(
            item['caption'],
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )['input_ids'].squeeze(0)
        
        return image, text


# ============================================
# FULL CLIP MODEL
# ============================================

class CLIP(nn.Module):
    """Full CLIP implementation"""
    
    def __init__(
        self,
        embed_dim=512,
        vision_width=768,
        vision_layers=12,
        vision_heads=12,
        vision_patch_size=16,
        image_resolution=224,
        text_width=512,
        text_layers=12,
        text_heads=8,
        vocab_size=49408,
        context_length=77
    ):
        super().__init__()
        
        # Vision encoder
        self.visual = VisionTransformer(
            input_resolution=image_resolution,
            patch_size=vision_patch_size,
            width=vision_width,
            layers=vision_layers,
            heads=vision_heads,
            output_dim=embed_dim
        )
        
        # Text encoder
        self.transformer = TextTransformer(
            width=text_width,
            layers=text_layers,
            heads=text_heads,
            vocab_size=vocab_size,
            context_length=context_length,
            output_dim=embed_dim
        )
        
        # Learnable temperature
        self.logit_scale = nn.Parameter(torch.ones([]) * np.log(1 / 0.07))
    
    def encode_image(self, image):
        return self.visual(image)
    
    def encode_text(self, text):
        return self.transformer(text)
    
    def forward(self, image, text):
        image_features = self.encode_image(image)
        text_features = self.encode_text(text)
        
        # Normalize features
        image_features = image_features / image_features.norm(dim=1, keepdim=True)
        text_features = text_features / text_features.norm(dim=1, keepdim=True)
        
        # Cosine similarity as logits
        logit_scale = self.logit_scale.exp()
        logits_per_image = logit_scale * image_features @ text_features.t()
        logits_per_text = logits_per_image.t()
        
        return logits_per_image, logits_per_text


# ============================================
# TRAINING
# ============================================

class CLIPTrainer:
    """CLIP training with all best practices"""
    
    def __init__(
        self,
        model,
        train_loader,
        val_loader=None,
        lr=5e-4,
        weight_decay=0.2,
        warmup_steps=2000,
        total_steps=100000,
        device='cuda'
    ):
        self.model = model.to(device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        self.total_steps = total_steps
        
        # Optimizer
        self.optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=lr,
            betas=(0.9, 0.98),
            eps=1e-6,
            weight_decay=weight_decay
        )
        
        # Scheduler
        self.scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            self.optimizer,
            T_max=total_steps,
            eta_min=0
        )
        
        self.warmup_steps = warmup_steps
        self.step = 0
    
    def contrastive_loss(self, logits_per_image, logits_per_text):
        """Symmetric contrastive loss"""
        batch_size = logits_per_image.shape[0]
        labels = torch.arange(batch_size, device=self.device)
        
        loss_i = F.cross_entropy(logits_per_image, labels)
        loss_t = F.cross_entropy(logits_per_text, labels)
        
        return (loss_i + loss_t) / 2
    
    def train_step(self, images, texts):
        """Single training step"""
        self.model.train()
        
        # Forward
        logits_per_image, logits_per_text = self.model(images, texts)
        loss = self.contrastive_loss(logits_per_image, logits_per_text)
        
        # Backward
        self.optimizer.zero_grad()
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
        
        self.optimizer.step()
        
        # Learning rate warmup
        if self.step < self.warmup_steps:
            lr_scale = min(1.0, float(self.step + 1) / self.warmup_steps)
            for pg in self.optimizer.param_groups:
                pg['lr'] = pg['lr'] * lr_scale
        else:
            self.scheduler.step()
        
        # Clamp logit scale
        with torch.no_grad():
            self.model.logit_scale.clamp_(0, np.log(100))
        
        self.step += 1
        
        return loss.item()
    
    @torch.no_grad()
    def evaluate(self):
        """Evaluate on validation set"""
        self.model.eval()
        total_loss = 0
        total_correct = 0
        total_samples = 0
        
        for images, texts in self.val_loader:
            images, texts = images.to(self.device), texts.to(self.device)
            
            logits_per_image, logits_per_text = self.model(images, texts)
            loss = self.contrastive_loss(logits_per_image, logits_per_text)
            
            total_loss += loss.item() * images.size(0)
            
            # Image-to-text retrieval accuracy
            preds = logits_per_image.argmax(dim=1)
            labels = torch.arange(images.size(0), device=self.device)
            total_correct += (preds == labels).sum().item()
            total_samples += images.size(0)
        
        return {
            'loss': total_loss / total_samples,
            'accuracy': total_correct / total_samples
        }
    
    def train(self, epochs):
        """Full training loop"""
        for epoch in range(epochs):
            epoch_loss = 0
            
            pbar = tqdm(self.train_loader, desc=f'Epoch {epoch+1}')
            for images, texts in pbar:
                images = images.to(self.device)
                texts = texts.to(self.device)
                
                loss = self.train_step(images, texts)
                epoch_loss += loss
                
                pbar.set_postfix({'loss': f'{loss:.4f}'})
            
            avg_loss = epoch_loss / len(self.train_loader)
            print(f'Epoch {epoch+1}: Average Loss = {avg_loss:.4f}')
            
            if self.val_loader:
                metrics = self.evaluate()
                print(f'Validation: Loss = {metrics["loss"]:.4f}, '
                      f'Accuracy = {metrics["accuracy"]*100:.2f}%')


# ============================================
# USAGE
# ============================================

def main():
    # Create model
    model = CLIP(
        embed_dim=512,
        vision_width=768,
        vision_layers=12,
        vision_heads=12,
        text_width=512,
        text_layers=12,
        text_heads=8
    )
    
    print(f'Total parameters: {sum(p.numel() for p in model.parameters()):,}')
    
    # Create dataloaders
    train_loader = DataLoader(
        ImageTextDataset('train.json'),
        batch_size=256,
        shuffle=True,
        num_workers=8,
        pin_memory=True
    )
    
    val_loader = DataLoader(
        ImageTextDataset('val.json'),
        batch_size=256,
        num_workers=8
    )
    
    # Train
    trainer = CLIPTrainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        lr=5e-4,
        warmup_steps=2000
    )
    
    trainer.train(epochs=30)


if __name__ == '__main__':
    main()
```

---

## 🛠️ Hands-On Project

### Project: Build a Visual Search Engine

```python
"""
Project: Visual Search Engine using CLIP
Search images by text or find similar images
"""

import torch
import clip
from PIL import Image
import numpy as np
from pathlib import Path
import faiss
from tqdm import tqdm

class VisualSearchEngine:
    """
    A visual search engine powered by CLIP
    """
    def __init__(self, model_name='ViT-B/32', device='cuda'):
        self.device = device
        self.model, self.preprocess = clip.load(model_name, device)
        self.model.eval()
        
        # Index storage
        self.image_embeddings = None
        self.image_paths = []
        self.faiss_index = None
    
    def add_images(self, image_dir):
        """Index all images in a directory"""
        image_dir = Path(image_dir)
        image_files = list(image_dir.glob('**/*.jpg')) + \
                     list(image_dir.glob('**/*.png'))
        
        embeddings = []
        
        print(f"Indexing {len(image_files)} images...")
        for img_path in tqdm(image_files):
            try:
                image = Image.open(img_path).convert('RGB')
                image_input = self.preprocess(image).unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    embedding = self.model.encode_image(image_input)
                    embedding = embedding / embedding.norm(dim=-1, keepdim=True)
                    embeddings.append(embedding.cpu().numpy())
                
                self.image_paths.append(str(img_path))
            except Exception as e:
                print(f"Error processing {img_path}: {e}")
        
        self.image_embeddings = np.vstack(embeddings).astype('float32')
        self._build_faiss_index()
        
        print(f"Indexed {len(self.image_paths)} images")
    
    def _build_faiss_index(self):
        """Build FAISS index for fast similarity search"""
        dim = self.image_embeddings.shape[1]
        self.faiss_index = faiss.IndexFlatIP(dim)  # Inner product (cosine sim)
        self.faiss_index.add(self.image_embeddings)
    
    def search_by_text(self, query, top_k=10):
        """Search images using text query"""
        text_input = clip.tokenize([query]).to(self.device)
        
        with torch.no_grad():
            text_embedding = self.model.encode_text(text_input)
            text_embedding = text_embedding / text_embedding.norm(dim=-1, keepdim=True)
        
        query_vec = text_embedding.cpu().numpy().astype('float32')
        
        # Search
        scores, indices = self.faiss_index.search(query_vec, top_k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            results.append({
                'path': self.image_paths[idx],
                'score': float(score)
            })
        
        return results
    
    def search_by_image(self, image_path, top_k=10):
        """Find similar images"""
        image = Image.open(image_path).convert('RGB')
        image_input = self.preprocess(image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            image_embedding = self.model.encode_image(image_input)
            image_embedding = image_embedding / image_embedding.norm(dim=-1, keepdim=True)
        
        query_vec = image_embedding.cpu().numpy().astype('float32')
        
        scores, indices = self.faiss_index.search(query_vec, top_k + 1)
        
        # Skip first result if it's the query image itself
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if self.image_paths[idx] != str(image_path):
                results.append({
                    'path': self.image_paths[idx],
                    'score': float(score)
                })
        
        return results[:top_k]
    
    def search_by_combination(self, text_query, reference_image, text_weight=0.5):
        """
        Search using combination of text and image
        Useful for "find images like this but with X"
        """
        # Get text embedding
        text_input = clip.tokenize([text_query]).to(self.device)
        with torch.no_grad():
            text_emb = self.model.encode_text(text_input)
            text_emb = text_emb / text_emb.norm(dim=-1, keepdim=True)
        
        # Get image embedding
        image = Image.open(reference_image).convert('RGB')
        image_input = self.preprocess(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            image_emb = self.model.encode_image(image_input)
            image_emb = image_emb / image_emb.norm(dim=-1, keepdim=True)
        
        # Combine embeddings
        combined = text_weight * text_emb + (1 - text_weight) * image_emb
        combined = combined / combined.norm(dim=-1, keepdim=True)
        
        query_vec = combined.cpu().numpy().astype('float32')
        scores, indices = self.faiss_index.search(query_vec, 10)
        
        return [{'path': self.image_paths[i], 'score': float(s)} 
                for s, i in zip(scores[0], indices[0])]
    
    def save_index(self, path):
        """Save index to disk"""
        np.save(f'{path}_embeddings.npy', self.image_embeddings)
        with open(f'{path}_paths.txt', 'w') as f:
            f.write('\n'.join(self.image_paths))
    
    def load_index(self, path):
        """Load index from disk"""
        self.image_embeddings = np.load(f'{path}_embeddings.npy')
        with open(f'{path}_paths.txt', 'r') as f:
            self.image_paths = f.read().strip().split('\n')
        self._build_faiss_index()


# Demo
def demo():
    # Create search engine
    engine = VisualSearchEngine()
    
    # Index images
    engine.add_images('./my_photos')
    
    # Search by text
    results = engine.search_by_text("a sunset at the beach")
    print("Text search results:")
    for r in results[:5]:
        print(f"  {r['path']} (score: {r['score']:.3f})")
    
    # Search by image
    results = engine.search_by_image("query_image.jpg")
    print("\nSimilar images:")
    for r in results[:5]:
        print(f"  {r['path']} (score: {r['score']:.3f})")
    
    # Combined search
    results = engine.search_by_combination(
        "but at sunset",  # Modification
        "beach_photo.jpg",  # Reference
        text_weight=0.3
    )
    print("\nCombined search:")
    for r in results[:5]:
        print(f"  {r['path']} (score: {r['score']:.3f})")


if __name__ == "__main__":
    demo()
```

---

## ⚠️ Common Mistakes

### 1. Not Normalizing Embeddings

```python
# ❌ Wrong
similarity = image_emb @ text_emb.T  # Not cosine similarity

# ✅ Correct
image_emb = image_emb / image_emb.norm(dim=-1, keepdim=True)
text_emb = text_emb / text_emb.norm(dim=-1, keepdim=True)
similarity = image_emb @ text_emb.T
```

### 2. Using Wrong Preprocessing

```python
# ❌ Wrong - Custom transform
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.ToTensor()
])

# ✅ Correct - Use CLIP's preprocessing
model, preprocess = clip.load("ViT-B/32")
image_input = preprocess(image)  # Uses CLIP's normalization
```

### 3. Batch Size Too Small

```python
# ❌ Wrong - Small batch hurts contrastive learning
batch_size = 32  # Only 31 negatives!

# ✅ Correct - Large batch
batch_size = 32768  # 32767 negatives per positive
```

---

## 🎯 Interview Questions

### Q1: Explain CLIP's training objective.

**Answer:**
CLIP uses **symmetric contrastive loss** on image-text pairs:

1. Encode batch of N images and N texts
2. Compute N×N similarity matrix
3. Diagonal entries are positive pairs
4. Apply cross-entropy loss for each row AND column
5. Average the two losses

**Loss formula:**
$$\mathcal{L} = \frac{1}{2}[\text{CE}(S, I) + \text{CE}(S^T, I)]$$

Where S is similarity matrix and I is identity (diagonal labels).

---

### Q2: Why does CLIP need large batch sizes?

**Answer:**
Large batches provide more **hard negatives**:

- Small batch (64): Model only learns "this is more similar than 63 random samples"
- Large batch (32768): Model must distinguish from 32767 diverse samples

More negatives → Harder task → Better representations

**Practical solutions:**
- Gradient accumulation
- Distributed training
- Memory-efficient implementations (chunked computation)

---

### Q3: How does CLIP enable Stable Diffusion?

**Answer:**
Stable Diffusion uses CLIP in two ways:

1. **Text Encoder:** CLIP's text encoder converts prompts to embeddings
2. **Conditioning:** These embeddings guide the U-Net denoiser via cross-attention

```
"A cat on a beach" → CLIP Text → [77, 768] embedding
                                      ↓
                              Cross-attention in U-Net
                                      ↓
                              Conditioned denoising
```

The CLIP embedding tells the diffusion model WHAT to generate.

---

### Q4: What are CLIP's limitations?

**Answer:**

1. **Fine-grained understanding:** Struggles with counting, spatial relations
2. **OCR:** Not trained on text recognition
3. **Abstract concepts:** Better with concrete objects
4. **Out-of-distribution:** Can fail on unusual image styles
5. **Biases:** Inherits web data biases
6. **Compositionality:** "Red cube and blue sphere" vs "Blue cube and red sphere"

**Research directions:**
- CLIP + specialized modules
- Better training data
- Compositional reasoning augmentation

---

## 📝 Homework

### Level 1: Basic
1. Use pre-trained CLIP for zero-shot classification
2. Compare different prompt templates
3. Visualize embedding space with t-SNE

### Level 2: Intermediate
1. Build image search engine with CLIP
2. Implement linear probe fine-tuning
3. Compare CLIP variants (B/32, B/16, L/14)

### Level 3: Advanced
1. Train CLIP on small dataset from scratch
2. Implement CLIP-guided image generation
3. Build visual grounding system

### Level 4: Expert
1. Implement SigLIP loss variant
2. Distributed training with large batches
3. Build multimodal RAG with CLIP

---

## 🔗 Resources

- [CLIP Paper](https://arxiv.org/abs/2103.00020)
- [OpenAI CLIP GitHub](https://github.com/openai/CLIP)
- [OpenCLIP](https://github.com/mlfoundations/open_clip)
- [CLIP Interrogator](https://github.com/pharmapsychotic/clip-interrogator)
- [LAION Datasets](https://laion.ai/)

---

**Next:** [06-Prompt-Engineering.md](./06-Prompt-Engineering.md) - Advanced Prompt Engineering
