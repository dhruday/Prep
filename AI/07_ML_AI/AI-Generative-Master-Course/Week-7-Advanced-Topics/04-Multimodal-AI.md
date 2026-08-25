# 🌐 Multimodal AI

## 📚 Table of Contents
1. [Introduction](#-introduction)
2. [Beginner Explanation](#-beginner-explanation)
3. [Deep Technical Breakdown](#-deep-technical-breakdown)
4. [CLIP Architecture](#-clip-architecture)
5. [Vision-Language Models](#-vision-language-models)
6. [Implementation](#-implementation)
7. [Advanced Multimodal Systems](#-advanced-multimodal-systems)
8. [Hands-On Project](#-hands-on-project)
9. [Common Mistakes](#-common-mistakes)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🎯 Introduction

**Multimodal AI** refers to models that can understand and generate content across multiple modalities (text, images, audio, video). These models power GPT-4V, Gemini, DALL-E, and modern AI assistants.

### Why Multimodal Matters

```
┌─────────────────────────────────────────────────────────────┐
│              MULTIMODAL AI CAPABILITIES                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  UNDERSTANDING (Input)                                       │
│  ├─ Image + Text → Answer questions about images            │
│  ├─ Video + Text → Describe video content                   │
│  ├─ Audio + Text → Transcribe and analyze speech            │
│  └─ Documents → OCR + understanding                         │
│                                                              │
│  GENERATION (Output)                                         │
│  ├─ Text → Image (DALL-E, Midjourney)                       │
│  ├─ Text → Video (Sora)                                     │
│  ├─ Text → Audio (TTS, music)                               │
│  └─ Any → Any (Gemini, GPT-4o)                              │
│                                                              │
│  WHY IT MATTERS:                                             │
│  • Humans think multimodally                                │
│  • Rich understanding requires multiple senses              │
│  • Next-gen AI must process all modalities                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### The Multimodal Landscape

| Model | Modalities | Company | Key Innovation |
|-------|-----------|---------|----------------|
| CLIP | Image ↔ Text | OpenAI | Contrastive learning |
| DALL-E 3 | Text → Image | OpenAI | Diffusion + CLIP |
| GPT-4V | Image + Text | OpenAI | LLM + Vision |
| Gemini | All modalities | Google | Native multimodal |
| LLaVA | Image + Text | Open source | Visual instruction tuning |
| Whisper | Audio → Text | OpenAI | Robust ASR |
| Sora | Text → Video | OpenAI | Video diffusion |

---

## 🧒 Beginner Explanation

### The "Two Languages" Analogy

Imagine a translator who speaks both Chinese and English:

**Before CLIP:**
```
Image Model: "I only understand images" 🖼️
Text Model: "I only understand text" 📝

They can't communicate!
```

**After CLIP:**
```
CLIP: "I can translate between images and text!"

Image of dog → CLIP → [0.9, 0.3, 0.1, ...]  ← Same space!
Text "a dog" → CLIP → [0.85, 0.35, 0.15, ...] ← Similar!

Now they can compare and match!
```

### Visual: Shared Embedding Space

```
┌─────────────────────────────────────────────────────────────┐
│               SHARED EMBEDDING SPACE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Before CLIP (Separate spaces):                             │
│                                                              │
│  Image Space          Text Space                            │
│  ┌─────────┐          ┌─────────┐                           │
│  │  🐕 •   │          │ "dog" • │                           │
│  │    •🐱  │          │  •"cat" │                           │
│  │  •🚗   │          │ •"car"  │                           │
│  └─────────┘          └─────────┘                           │
│  Can't compare!                                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  After CLIP (Shared space):                                 │
│                                                              │
│  ┌─────────────────────────────────┐                        │
│  │                                  │                        │
│  │   🐕 • • "dog"    ← Close!      │                        │
│  │                                  │                        │
│  │     🐱 • • "cat"  ← Close!      │                        │
│  │                                  │                        │
│  │   🚗 • • "car"    ← Close!      │                        │
│  │                                  │                        │
│  └─────────────────────────────────┘                        │
│  Now we can match images with text!                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Deep Technical Breakdown

### Contrastive Learning (CLIP's Core)

The key idea: Pull matching pairs together, push non-matching pairs apart.

**Training Setup:**
```
Batch of N image-text pairs:
(image_1, text_1) ← matching pair
(image_2, text_2) ← matching pair
...
(image_N, text_N) ← matching pair

Goal: 
- image_1 should be similar to text_1
- image_1 should be different from text_2, text_3, ... text_N
```

**Contrastive Loss:**
$$\mathcal{L} = -\frac{1}{N}\sum_{i=1}^{N} \log \frac{\exp(s(I_i, T_i) / \tau)}{\sum_{j=1}^{N} \exp(s(I_i, T_j) / \tau)}$$

Where:
- $s(I, T) = \frac{I \cdot T}{\|I\| \|T\|}$ (cosine similarity)
- $\tau$ = temperature (typically 0.07)
- $I_i$ = image embedding
- $T_i$ = text embedding

### The Power of Scale

CLIP was trained on **400 million** image-text pairs from the internet:

```
Dataset Scale Comparison:
├─ ImageNet: 1.2M labeled images
├─ COCO: 330K images, 5 captions each
├─ Conceptual Captions: 3.3M
└─ CLIP (WIT-400M): 400M image-text pairs!

Result: CLIP learns incredibly rich representations
```

---

## 🏗️ CLIP Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIP ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│      Image                          Text                    │
│        │                              │                      │
│        ▼                              ▼                      │
│  ┌───────────────┐            ┌───────────────┐             │
│  │ Vision        │            │ Text          │             │
│  │ Transformer   │            │ Transformer   │             │
│  │ (ViT-L/14)    │            │ (GPT-style)   │             │
│  └───────┬───────┘            └───────┬───────┘             │
│          │                            │                      │
│          ▼                            ▼                      │
│    [Image Embedding]           [Text Embedding]             │
│    [1, 768]                    [1, 768]                     │
│          │                            │                      │
│          └──────────┬─────────────────┘                     │
│                     │                                        │
│                     ▼                                        │
│            Cosine Similarity                                │
│            (matching score)                                 │
│                                                              │
│  Training: Maximize similarity for matching pairs           │
│  Inference: Compare any image with any text!                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Image Encoder Options

CLIP supports different vision backbones:

| Model | Architecture | Params | Resolution |
|-------|-------------|--------|------------|
| CLIP ViT-B/32 | ViT-Base, patch 32 | 86M | 224×224 |
| CLIP ViT-B/16 | ViT-Base, patch 16 | 86M | 224×224 |
| CLIP ViT-L/14 | ViT-Large, patch 14 | 307M | 224×224 |
| CLIP ViT-L/14@336 | ViT-Large | 307M | 336×336 |
| CLIP RN50 | ResNet-50 | 38M | 224×224 |

### Text Encoder

CLIP's text encoder:
- GPT-2 style transformer
- 12 layers, 512 width, 8 heads
- Max 77 tokens (BPE)
- Output: Use [EOS] token embedding

```python
# Text encoding
text = "a photo of a dog"
tokens = tokenizer(text)  # [49406, 320, 1125, 539, 320, 1929, 49407]
                          # [SOS] a  photo of  a  dog  [EOS]

# Transformer processes all tokens
# Take embedding at [EOS] position as text representation
```

---

## 🖼️ Vision-Language Models

### Types of Vision-Language Models

```
┌─────────────────────────────────────────────────────────────┐
│          VISION-LANGUAGE MODEL TYPES                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CONTRASTIVE (CLIP, ALIGN, SigLIP)                       │
│     Image + Text → Similarity score                         │
│     Use: Zero-shot classification, retrieval                │
│                                                              │
│  2. GENERATIVE (GPT-4V, Gemini, LLaVA)                      │
│     Image + Text → Generated text                           │
│     Use: VQA, image captioning, reasoning                   │
│                                                              │
│  3. UNIFIED (Flamingo, PaLI)                                │
│     Any input → Any output                                  │
│     Use: Few-shot learning, general tasks                   │
│                                                              │
│  4. ENCODER-DECODER (BLIP, CoCa)                            │
│     Both contrastive and generative                         │
│     Use: Versatile applications                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### LLaVA Architecture (Open Source GPT-4V)

```
┌─────────────────────────────────────────────────────────────┐
│                   LLaVA ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Input Image                    Input Text                  │
│       │                              │                       │
│       ▼                              │                       │
│  ┌───────────┐                       │                       │
│  │ CLIP ViT  │                       │                       │
│  │ (frozen)  │                       │                       │
│  └─────┬─────┘                       │                       │
│        │                             │                       │
│        ▼                             │                       │
│  ┌───────────┐                       │                       │
│  │ Projection│ (MLP)                 │                       │
│  │ Layer     │                       │                       │
│  └─────┬─────┘                       │                       │
│        │                             │                       │
│        └──────┬──────────────────────┘                       │
│               │ Concatenate                                  │
│               ▼                                              │
│  ┌─────────────────────────────────┐                        │
│  │         LLaMA / Vicuna          │                        │
│  │    (Language Model Backbone)    │                        │
│  └─────────────────────────────────┘                        │
│               │                                              │
│               ▼                                              │
│         Generated Text                                       │
│                                                              │
│  Key: Visual tokens + Text tokens → LLM                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Training Stages (LLaVA)

```
Stage 1: Feature Alignment (Pre-training)
├─ Freeze: CLIP encoder + LLM
├─ Train: Projection layer only
├─ Data: 595K image-caption pairs
└─ Goal: Align visual features with LLM space

Stage 2: Visual Instruction Tuning
├─ Freeze: CLIP encoder
├─ Train: Projection layer + LLM
├─ Data: 158K visual instruction data
└─ Goal: Follow visual instructions
```

---

## 💻 Implementation

### CLIP from Scratch

```python
"""
CLIP Implementation from Scratch
Contrastive Language-Image Pre-training
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
from transformers import GPT2Tokenizer
import math

# ============================================
# VISION ENCODER (Simplified ViT)
# ============================================

class VisionTransformer(nn.Module):
    """Vision Transformer for CLIP"""
    
    def __init__(
        self,
        img_size: int = 224,
        patch_size: int = 16,
        in_channels: int = 3,
        embed_dim: int = 768,
        depth: int = 12,
        num_heads: int = 12,
        output_dim: int = 512
    ):
        super().__init__()
        self.embed_dim = embed_dim
        num_patches = (img_size // patch_size) ** 2
        
        # Patch embedding
        self.patch_embed = nn.Conv2d(
            in_channels, embed_dim,
            kernel_size=patch_size, stride=patch_size
        )
        
        # CLS token and position embedding
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))
        
        # Transformer blocks
        self.blocks = nn.ModuleList([
            TransformerBlock(embed_dim, num_heads)
            for _ in range(depth)
        ])
        
        # Final projection
        self.ln_final = nn.LayerNorm(embed_dim)
        self.proj = nn.Linear(embed_dim, output_dim, bias=False)
        
        self._init_weights()
    
    def _init_weights(self):
        nn.init.normal_(self.pos_embed, std=0.02)
        nn.init.normal_(self.cls_token, std=0.02)
    
    def forward(self, x):
        B = x.shape[0]
        
        # Patch embedding
        x = self.patch_embed(x)  # [B, D, H/P, W/P]
        x = x.flatten(2).transpose(1, 2)  # [B, N, D]
        
        # Add CLS token
        cls_tokens = self.cls_token.expand(B, -1, -1)
        x = torch.cat([cls_tokens, x], dim=1)
        
        # Add position embedding
        x = x + self.pos_embed
        
        # Transformer blocks
        for block in self.blocks:
            x = block(x)
        
        # Get CLS token output
        x = self.ln_final(x[:, 0])
        x = self.proj(x)
        
        return x


class TransformerBlock(nn.Module):
    def __init__(self, dim, num_heads, mlp_ratio=4.0):
        super().__init__()
        self.ln1 = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, num_heads, batch_first=True)
        self.ln2 = nn.LayerNorm(dim)
        self.mlp = nn.Sequential(
            nn.Linear(dim, int(dim * mlp_ratio)),
            nn.GELU(),
            nn.Linear(int(dim * mlp_ratio), dim)
        )
    
    def forward(self, x):
        x = x + self.attn(self.ln1(x), self.ln1(x), self.ln1(x))[0]
        x = x + self.mlp(self.ln2(x))
        return x


# ============================================
# TEXT ENCODER (GPT-style)
# ============================================

class TextTransformer(nn.Module):
    """Text Transformer for CLIP"""
    
    def __init__(
        self,
        vocab_size: int = 49408,
        context_length: int = 77,
        embed_dim: int = 512,
        depth: int = 12,
        num_heads: int = 8,
        output_dim: int = 512
    ):
        super().__init__()
        self.context_length = context_length
        
        self.token_embedding = nn.Embedding(vocab_size, embed_dim)
        self.pos_embedding = nn.Parameter(torch.zeros(context_length, embed_dim))
        
        # Transformer blocks
        self.blocks = nn.ModuleList([
            TransformerBlock(embed_dim, num_heads)
            for _ in range(depth)
        ])
        
        self.ln_final = nn.LayerNorm(embed_dim)
        self.proj = nn.Linear(embed_dim, output_dim, bias=False)
        
        # Causal attention mask
        self.register_buffer(
            "attn_mask",
            torch.triu(torch.ones(context_length, context_length) * float('-inf'), diagonal=1)
        )
        
        self._init_weights()
    
    def _init_weights(self):
        nn.init.normal_(self.token_embedding.weight, std=0.02)
        nn.init.normal_(self.pos_embedding, std=0.01)
    
    def forward(self, text):
        # text: [B, L] token indices
        x = self.token_embedding(text)  # [B, L, D]
        x = x + self.pos_embedding[:x.size(1)]
        
        for block in self.blocks:
            x = block(x)
        
        x = self.ln_final(x)
        
        # Get embedding at EOS position
        # EOS is at the end of each sequence
        eos_indices = text.argmax(dim=-1)  # Find EOS token
        x = x[torch.arange(x.size(0)), eos_indices]
        
        x = self.proj(x)
        return x


# ============================================
# CLIP MODEL
# ============================================

class CLIP(nn.Module):
    """
    Complete CLIP model
    """
    def __init__(
        self,
        embed_dim: int = 512,
        vision_config: dict = None,
        text_config: dict = None,
        temperature: float = 0.07
    ):
        super().__init__()
        
        # Default configs
        vision_config = vision_config or {
            'img_size': 224, 'patch_size': 16,
            'embed_dim': 768, 'depth': 12, 'num_heads': 12
        }
        text_config = text_config or {
            'vocab_size': 49408, 'context_length': 77,
            'embed_dim': 512, 'depth': 12, 'num_heads': 8
        }
        
        # Encoders
        self.visual = VisionTransformer(**vision_config, output_dim=embed_dim)
        self.text = TextTransformer(**text_config, output_dim=embed_dim)
        
        # Learnable temperature
        self.logit_scale = nn.Parameter(torch.ones([]) * math.log(1 / temperature))
    
    def encode_image(self, image):
        """Encode images to embeddings"""
        return F.normalize(self.visual(image), dim=-1)
    
    def encode_text(self, text):
        """Encode text to embeddings"""
        return F.normalize(self.text(text), dim=-1)
    
    def forward(self, image, text):
        """
        Forward pass for training
        Returns image features, text features, and logit scale
        """
        image_features = self.encode_image(image)
        text_features = self.encode_text(text)
        
        return image_features, text_features, self.logit_scale.exp()


# ============================================
# CONTRASTIVE LOSS
# ============================================

def clip_loss(image_features, text_features, logit_scale):
    """
    CLIP contrastive loss (symmetric)
    """
    # Cosine similarity as logits
    logits_per_image = logit_scale * image_features @ text_features.T
    logits_per_text = logit_scale * text_features @ image_features.T
    
    # Labels (diagonal is positive)
    batch_size = image_features.shape[0]
    labels = torch.arange(batch_size, device=image_features.device)
    
    # Cross entropy loss (symmetric)
    loss_i2t = F.cross_entropy(logits_per_image, labels)
    loss_t2i = F.cross_entropy(logits_per_text, labels)
    
    return (loss_i2t + loss_t2i) / 2


# ============================================
# ZERO-SHOT CLASSIFICATION
# ============================================

class ZeroShotClassifier:
    """Zero-shot classification using CLIP"""
    
    def __init__(self, model, tokenizer, device='cuda'):
        self.model = model.to(device)
        self.tokenizer = tokenizer
        self.device = device
    
    def create_class_embeddings(self, class_names, templates=None):
        """
        Create text embeddings for class names
        """
        if templates is None:
            templates = [
                "a photo of a {}",
                "a picture of a {}",
                "an image of a {}",
            ]
        
        class_embeddings = []
        
        with torch.no_grad():
            for class_name in class_names:
                texts = [template.format(class_name) for template in templates]
                tokens = self.tokenizer(texts, return_tensors='pt', padding=True)
                tokens = tokens['input_ids'].to(self.device)
                
                embeddings = self.model.encode_text(tokens)
                class_embedding = embeddings.mean(dim=0)
                class_embedding = F.normalize(class_embedding, dim=-1)
                class_embeddings.append(class_embedding)
        
        return torch.stack(class_embeddings)
    
    @torch.no_grad()
    def classify(self, images, class_embeddings):
        """
        Classify images using pre-computed class embeddings
        """
        image_features = self.model.encode_image(images)
        
        # Compute similarity
        similarity = image_features @ class_embeddings.T
        
        # Return predictions
        predictions = similarity.argmax(dim=-1)
        confidences = F.softmax(similarity * 100, dim=-1)
        
        return predictions, confidences


# ============================================
# TRAINING EXAMPLE
# ============================================

def train_clip():
    """Simple CLIP training loop"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Model
    model = CLIP(embed_dim=512)
    model = model.to(device)
    
    # Optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.1)
    
    # Training (pseudo-code - need actual dataset)
    for epoch in range(100):
        for images, texts in dataloader:
            images = images.to(device)
            texts = texts.to(device)
            
            # Forward
            image_features, text_features, logit_scale = model(images, texts)
            
            # Loss
            loss = clip_loss(image_features, text_features, logit_scale)
            
            # Backward
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            # Clamp logit scale
            with torch.no_grad():
                model.logit_scale.clamp_(0, math.log(100))
        
        print(f"Epoch {epoch}: Loss = {loss.item():.4f}")
    
    return model


# ============================================
# USING PRE-TRAINED CLIP
# ============================================

def use_pretrained_clip():
    """Example using OpenAI's pre-trained CLIP"""
    import clip
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = clip.load("ViT-B/32", device=device)
    
    # Zero-shot classification
    from PIL import Image
    
    image = preprocess(Image.open("dog.jpg")).unsqueeze(0).to(device)
    text = clip.tokenize(["a dog", "a cat", "a bird"]).to(device)
    
    with torch.no_grad():
        image_features = model.encode_image(image)
        text_features = model.encode_text(text)
        
        # Normalize
        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)
        
        # Calculate similarity
        similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        
    print("Label probs:", similarity)  # e.g., [0.95, 0.03, 0.02]


if __name__ == "__main__":
    # Demo with random data
    model = CLIP()
    
    # Random inputs
    images = torch.randn(8, 3, 224, 224)
    texts = torch.randint(0, 49408, (8, 77))
    
    # Forward
    img_feat, txt_feat, scale = model(images, texts)
    loss = clip_loss(img_feat, txt_feat, scale)
    
    print(f"Image features shape: {img_feat.shape}")
    print(f"Text features shape: {txt_feat.shape}")
    print(f"Loss: {loss.item():.4f}")
```

---

## 🚀 Advanced Multimodal Systems

### 1. LLaVA-style Visual Chat

```python
"""
LLaVA-style Visual Language Model
"""

import torch
import torch.nn as nn
from transformers import AutoModelForCausalLM, AutoTokenizer
from PIL import Image

class LLaVA(nn.Module):
    """
    Visual instruction-following model
    """
    def __init__(
        self,
        vision_model,  # CLIP ViT
        language_model,  # LLaMA
        projection_dim: int = 4096
    ):
        super().__init__()
        
        self.vision_encoder = vision_model
        self.language_model = language_model
        
        # Projection from vision to language space
        self.mm_projector = nn.Sequential(
            nn.Linear(vision_model.embed_dim, projection_dim),
            nn.GELU(),
            nn.Linear(projection_dim, language_model.config.hidden_size)
        )
        
        # Freeze vision encoder
        for param in self.vision_encoder.parameters():
            param.requires_grad = False
    
    def encode_image(self, images):
        """Encode images to language space"""
        with torch.no_grad():
            # Get patch features (not just CLS)
            visual_features = self.vision_encoder.forward_features(images)
        
        # Project to language space
        visual_tokens = self.mm_projector(visual_features)
        return visual_tokens
    
    def prepare_inputs(self, images, text_tokens, image_positions):
        """
        Insert visual tokens into text token sequence
        """
        batch_size = images.shape[0]
        visual_tokens = self.encode_image(images)
        
        # Get text embeddings
        text_embeds = self.language_model.get_input_embeddings()(text_tokens)
        
        # Insert visual tokens at specified positions
        for i in range(batch_size):
            pos = image_positions[i]
            # Replace <image> token(s) with visual tokens
            text_embeds[i, pos:pos+visual_tokens.shape[1]] = visual_tokens[i]
        
        return text_embeds
    
    def forward(self, images, input_ids, attention_mask, image_positions, labels=None):
        """
        Forward pass for training
        """
        inputs_embeds = self.prepare_inputs(images, input_ids, image_positions)
        
        outputs = self.language_model(
            inputs_embeds=inputs_embeds,
            attention_mask=attention_mask,
            labels=labels
        )
        
        return outputs
    
    @torch.no_grad()
    def generate(self, image, prompt, tokenizer, max_new_tokens=512):
        """
        Generate response given image and prompt
        """
        # Encode image
        visual_tokens = self.encode_image(image.unsqueeze(0))
        
        # Tokenize prompt
        tokens = tokenizer(prompt, return_tensors='pt')
        text_embeds = self.language_model.get_input_embeddings()(tokens.input_ids)
        
        # Prepend visual tokens
        inputs_embeds = torch.cat([visual_tokens, text_embeds], dim=1)
        
        # Generate
        outputs = self.language_model.generate(
            inputs_embeds=inputs_embeds,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7
        )
        
        return tokenizer.decode(outputs[0], skip_special_tokens=True)
```

### 2. Image-Text Retrieval

```python
class ImageTextRetriever:
    """
    Retrieve relevant images given text, or text given images
    """
    def __init__(self, clip_model, device='cuda'):
        self.model = clip_model.to(device)
        self.device = device
        self.image_features = None
        self.text_features = None
    
    def index_images(self, images):
        """Build image index"""
        with torch.no_grad():
            self.image_features = self.model.encode_image(images)
    
    def index_texts(self, texts):
        """Build text index"""
        with torch.no_grad():
            self.text_features = self.model.encode_text(texts)
    
    def retrieve_images(self, query_text, top_k=5):
        """Find images matching text query"""
        with torch.no_grad():
            query_features = self.model.encode_text(query_text)
        
        # Compute similarities
        similarities = query_features @ self.image_features.T
        
        # Get top-k
        values, indices = similarities[0].topk(top_k)
        return indices.tolist(), values.tolist()
    
    def retrieve_texts(self, query_image, top_k=5):
        """Find texts matching image query"""
        with torch.no_grad():
            query_features = self.model.encode_image(query_image)
        
        similarities = query_features @ self.text_features.T
        values, indices = similarities[0].topk(top_k)
        return indices.tolist(), values.tolist()
```

### 3. Visual Grounding

```python
class VisualGrounder:
    """
    Locate objects in images based on text descriptions
    """
    def __init__(self, clip_model, device='cuda'):
        self.model = clip_model.to(device)
        self.device = device
    
    def compute_patch_similarities(self, image, text):
        """
        Compute similarity between text and each image patch
        """
        with torch.no_grad():
            # Get patch features (not just CLS)
            patch_features = self.model.visual.forward_patches(image)  # [B, N, D]
            text_features = self.model.encode_text(text)  # [B, D]
        
        # Normalize
        patch_features = F.normalize(patch_features, dim=-1)
        text_features = F.normalize(text_features, dim=-1)
        
        # Similarity for each patch
        similarities = patch_features @ text_features.T  # [B, N, 1]
        
        return similarities.squeeze(-1)
    
    def localize(self, image, text, threshold=0.3):
        """
        Generate heatmap showing where the text description matches
        """
        similarities = self.compute_patch_similarities(image, text)
        
        # Reshape to spatial
        h = w = int(math.sqrt(similarities.shape[1]))
        heatmap = similarities.reshape(1, h, w)
        
        # Upsample to image size
        heatmap = F.interpolate(
            heatmap.unsqueeze(0), 
            size=image.shape[-2:], 
            mode='bilinear'
        )
        
        return heatmap.squeeze()
```

---

## 🛠️ Hands-On Project

### Project: Build a Visual Question Answering System

```python
"""
Project: Visual Question Answering with CLIP + LLM
"""

import torch
import torch.nn as nn
from transformers import AutoModelForCausalLM, AutoTokenizer
from PIL import Image
import clip

class SimpleVQA:
    """
    Visual Question Answering using CLIP + LLM
    """
    def __init__(self, device='cuda'):
        self.device = device
        
        # Load CLIP
        self.clip_model, self.clip_preprocess = clip.load("ViT-B/32", device)
        
        # Load LLM (using a smaller model for demo)
        self.llm_tokenizer = AutoTokenizer.from_pretrained("gpt2")
        self.llm_model = AutoModelForCausalLM.from_pretrained("gpt2").to(device)
        
        # Projection layer
        self.projector = nn.Linear(512, 768).to(device)  # CLIP dim → GPT2 dim
    
    def describe_image(self, image_path):
        """Generate basic image description using CLIP zero-shot"""
        image = self.clip_preprocess(Image.open(image_path)).unsqueeze(0).to(self.device)
        
        # Candidate descriptions
        candidates = [
            "a photo of a dog",
            "a photo of a cat",
            "a photo of a person",
            "a photo of a car",
            "a photo of a building",
            "a photo of food",
            "a photo of nature",
            "a photo of an animal",
        ]
        
        text = clip.tokenize(candidates).to(self.device)
        
        with torch.no_grad():
            image_features = self.clip_model.encode_image(image)
            text_features = self.clip_model.encode_text(text)
            
            similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        
        # Get top descriptions
        values, indices = similarity[0].topk(3)
        descriptions = [candidates[i] for i in indices]
        
        return descriptions, values.tolist()
    
    def answer_question(self, image_path, question):
        """
        Answer a question about an image
        """
        # Get image understanding
        descriptions, scores = self.describe_image(image_path)
        
        # Create context prompt
        context = f"""Image description: {descriptions[0]} (confidence: {scores[0]:.2f})
Additional context: {descriptions[1]}, {descriptions[2]}

Question: {question}
Answer:"""
        
        # Generate answer with LLM
        inputs = self.llm_tokenizer(context, return_tensors='pt').to(self.device)
        
        with torch.no_grad():
            outputs = self.llm_model.generate(
                inputs.input_ids,
                max_new_tokens=50,
                do_sample=True,
                temperature=0.7,
                pad_token_id=self.llm_tokenizer.eos_token_id
            )
        
        answer = self.llm_tokenizer.decode(outputs[0], skip_special_tokens=True)
        answer = answer.split("Answer:")[-1].strip()
        
        return {
            'question': question,
            'descriptions': descriptions,
            'answer': answer
        }
    
    def visual_comparison(self, image1_path, image2_path):
        """
        Compare two images and describe differences
        """
        img1 = self.clip_preprocess(Image.open(image1_path)).unsqueeze(0).to(self.device)
        img2 = self.clip_preprocess(Image.open(image2_path)).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            feat1 = self.clip_model.encode_image(img1)
            feat2 = self.clip_model.encode_image(img2)
            
            similarity = (feat1 @ feat2.T).item()
        
        return {
            'similarity': similarity,
            'are_similar': similarity > 0.8,
            'description': f"Images are {'similar' if similarity > 0.8 else 'different'} (similarity: {similarity:.2f})"
        }


# Usage example
def demo():
    vqa = SimpleVQA()
    
    # Answer questions about an image
    result = vqa.answer_question(
        "sample_image.jpg",
        "What is in this image?"
    )
    print(f"Q: {result['question']}")
    print(f"Image shows: {result['descriptions']}")
    print(f"A: {result['answer']}")
    
    # Compare two images
    comparison = vqa.visual_comparison("image1.jpg", "image2.jpg")
    print(f"Comparison: {comparison['description']}")


if __name__ == "__main__":
    demo()
```

---

## ⚠️ Common Mistakes

### 1. Not Normalizing Embeddings

```python
# ❌ Bad - Raw embeddings
similarity = image_features @ text_features.T  # Not cosine similarity!

# ✅ Good - Normalize first
image_features = F.normalize(image_features, dim=-1)
text_features = F.normalize(text_features, dim=-1)
similarity = image_features @ text_features.T  # Now it's cosine similarity
```

### 2. Wrong Temperature

```python
# ❌ Bad - Temperature too high (all similarities look same)
logits = similarity * 0.01

# ❌ Bad - Temperature too low (numerical instability)
logits = similarity * 1000

# ✅ Good - Typical temperature
logits = similarity / 0.07  # Or use learnable temperature
```

### 3. Forgetting to Handle Special Tokens

```python
# ❌ Bad - Using wrong token position
text_embedding = text_output[:, 0]  # CLS token (BERT style)

# ✅ Good - CLIP uses EOS token
eos_position = tokens.argmax(dim=-1)
text_embedding = text_output[range(batch_size), eos_position]
```

---

## 🎯 Interview Questions

### Q1: How does CLIP achieve zero-shot classification?

**Answer:**
CLIP achieves zero-shot classification by:

1. **Pre-training:** Learn shared embedding space for images and text using 400M image-text pairs with contrastive loss

2. **Inference:** 
   - Encode image to embedding
   - Encode class names as text (e.g., "a photo of a dog")
   - Compute cosine similarity
   - Predict class with highest similarity

```python
# Zero-shot classification
image_emb = clip.encode_image(image)
text_embs = clip.encode_text(["a photo of a dog", "a photo of a cat"])
similarity = image_emb @ text_embs.T
prediction = similarity.argmax()
```

**Key insight:** No task-specific training needed!

---

### Q2: What is contrastive loss and why is it effective?

**Answer:**
Contrastive loss pulls matching pairs together and pushes non-matching pairs apart in embedding space.

**Formula:**
$$\mathcal{L} = -\log \frac{\exp(sim(I, T^+) / \tau)}{\sum_j \exp(sim(I, T_j) / \tau)}$$

**Why it's effective:**
1. **Self-supervised:** Uses natural pairing (image + caption)
2. **Scalable:** Works with noisy web data
3. **Discriminative:** Forces meaningful representations
4. **Transfer:** Learns general features

---

### Q3: How do vision-language models like GPT-4V handle images?

**Answer:**
Vision-language models process images as follows:

1. **Image Encoding:** Pass image through vision encoder (ViT)
2. **Projection:** Map visual features to language model space
3. **Concatenation:** Combine visual tokens with text tokens
4. **Processing:** LLM processes combined sequence
5. **Generation:** Output text conditioned on both

```
Image → ViT → Projection → [Visual tokens | Text tokens] → LLM → Output
```

**Key architectures:**
- **GPT-4V:** Proprietary vision encoder + GPT-4
- **LLaVA:** CLIP ViT + LLaMA + MLP projector
- **Gemini:** Native multimodal (trained together)

---

### Q4: Compare CLIP to supervised learning for image classification.

**Answer:**

| Aspect | CLIP | Supervised |
|--------|------|-----------|
| **Training Data** | 400M noisy pairs | 1M clean labels |
| **Annotation** | Free (web scraping) | Expensive (human) |
| **Zero-shot** | ✅ Yes | ❌ No |
| **New classes** | Just add text | Need retraining |
| **Accuracy (ImageNet)** | 76% (zero-shot) | 90% (fine-tuned) |
| **Robustness** | High | Varies |
| **Flexibility** | Very high | Task-specific |

**When to use:**
- **CLIP:** Flexible, zero-shot, diverse tasks
- **Supervised:** Maximum accuracy, fixed classes

---

### Q5: What are the limitations of multimodal models?

**Answer:**

1. **Hallucination:** May describe objects not in image
2. **Fine-grained understanding:** Struggle with counting, spatial relations
3. **OCR limitations:** Text recognition can be unreliable
4. **Bias:** Inherit biases from training data
5. **Compute cost:** Large models, expensive inference
6. **Temporal reasoning:** Weak for video understanding

**Mitigation strategies:**
- Better training data curation
- Chain-of-thought prompting
- Specialized modules (OCR, object detection)
- RLHF for alignment

---

## 📝 Homework

### Level 1: Basic
1. Explain CLIP's training objective in simple terms
2. What is a shared embedding space?
3. Calculate cosine similarity between [1,0,0] and [0.7, 0.7, 0]

### Level 2: Intermediate
1. Implement zero-shot classification with CLIP
2. Build image-to-text retrieval system
3. Visualize CLIP embeddings with t-SNE

### Level 3: Advanced
1. Implement CLIP from scratch
2. Fine-tune CLIP on custom dataset
3. Build simple VQA system

### Level 4: Expert
1. Implement LLaVA-style model
2. Add visual grounding capabilities
3. Build multimodal RAG system

---

## 🔗 Resources

- [CLIP Paper](https://arxiv.org/abs/2103.00020)
- [LLaVA Paper](https://arxiv.org/abs/2304.08485)
- [OpenAI CLIP GitHub](https://github.com/openai/CLIP)
- [HuggingFace Transformers](https://huggingface.co/docs/transformers/model_doc/clip)
- [LLaVA GitHub](https://github.com/haotian-liu/LLaVA)

---

**Next:** [05-CLIP-Deep-Dive.md](./05-CLIP-Deep-Dive.md) - CLIP Deep Dive
