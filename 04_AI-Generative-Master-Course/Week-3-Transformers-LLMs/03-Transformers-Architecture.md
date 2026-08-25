# 📘 Transformer Architecture - The Revolution

## 📚 Table of Contents

1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
3. [Part 1: Input Embeddings + Positional Encoding](#-part-1-input-embeddings--positional-encoding)
4. [Part 2: Encoder Architecture](#-part-2-encoder-architecture)
5. [Part 3: Decoder Architecture](#-part-3-decoder-architecture)
6. [Mathematical Formulas](#-mathematical-formulas)
7. [Real World Use Cases](#-real-world-use-cases)
8. [Sample Mini Project: Mini-Transformer Encoder](#-sample-mini-project-mini-transformer-encoder)
9. [Homework](#-homework)
10. [Common Mistakes](#️-common-mistakes)
11. [Interview Questions & Answers](#-interview-questions--answers)
12. [Next Steps](#-next-steps)

---

## 🎯 Beginner Friendly Explanation

### The Breakthrough Moment

In 2017, Google published a paper called **"Attention Is All You Need"** that changed everything.

**The Key Insight:** We don't need RNNs at all! Just use attention.

```
Before Transformers (2017):
┌─────────────────────────────────────────────────────────┐
│  RNN/LSTM + Attention = Sequential + Slow + Limited    │
└─────────────────────────────────────────────────────────┘

After Transformers (2017+):
┌─────────────────────────────────────────────────────────┐
│  Pure Attention = Parallel + Fast + Unlimited Context  │
└─────────────────────────────────────────────────────────┘
```

### Why This Matters

```
LSTM Processing: (Sequential - one word at a time)
"I" → process → "love" → process → "machine" → process → "learning"
      ↓          ↓            ↓              ↓
    100ms     +100ms       +100ms         +100ms = 400ms total

Transformer Processing: (Parallel - all words at once!)
"I"  "love"  "machine"  "learning"
 ↓     ↓        ↓          ↓
 process all simultaneously
         ↓
      100ms total (4x faster!)
```

**And that's just 4 words.** Imagine GPT-4 processing thousands of tokens - parallelization is essential!

### Simple Analogy

```
LSTM = Reading a book page by page, in order
       If you want to reference page 1 on page 100, 
       you must remember through all intermediate pages

Transformer = Reading a book with every page visible at once
              Any page can instantly reference any other page
              Like having the entire book on a giant wall
```

---

## 🧠 Deep Technical Breakdown

### The Transformer Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TRANSFORMER                                      │
│                                                                          │
│   INPUT                                                    OUTPUT        │
│     │                                                        ↑          │
│     ▼                                                        │          │
│  ┌──────────────────┐                    ┌──────────────────┐│          │
│  │ Input Embedding  │                    │ Output Embedding ││          │
│  │ + Positional     │                    │ + Positional     ││          │
│  │   Encoding       │                    │   Encoding       ││          │
│  └────────┬─────────┘                    └────────┬─────────┘│          │
│           │                                       │          │          │
│           ▼                                       ▼          │          │
│  ┌────────────────────┐              ┌────────────────────────┐         │
│  │                    │              │                        │         │
│  │   ENCODER          │              │      DECODER           │         │
│  │                    │─────────────▶│                        │─────────│
│  │   (N layers)       │  Context     │      (N layers)        │         │
│  │                    │              │                        │         │
│  └────────────────────┘              └────────────────────────┘         │
│                                                                          │
│  Original paper: N = 6 layers each                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Purpose | Key Innovation |
|-----------|---------|----------------|
| Input Embedding | Convert tokens to vectors | Standard |
| Positional Encoding | Add position information | Sine/cosine waves |
| Encoder | Build representations | Self-attention |
| Decoder | Generate outputs | Masked + Cross attention |
| Layer Normalization | Stabilize training | Pre/Post-LN |
| Residual Connections | Enable deep networks | Skip connections |

---

## 📦 Part 1: Input Embeddings + Positional Encoding

### Why Positional Encoding?

**The Problem:** Attention is **permutation invariant** - it doesn't know word order!

```
"Dog bites man" vs "Man bites dog"

To pure attention, both look identical because:
- Same words
- Same attention possible between any pair

We NEED position information!
```

### The Solution: Add Position Information

```
Final Input = Token Embedding + Positional Encoding

Example:
"The cat sat"

Token Embeddings:
"The" → [0.2, -0.1, 0.5, ...]  (learned)
"cat" → [0.4, 0.3, -0.2, ...]  (learned)
"sat" → [-0.1, 0.6, 0.1, ...]  (learned)

Positional Encodings:
pos=0 → [0.0, 1.0, 0.0, 1.0, ...]  (computed)
pos=1 → [0.84, 0.54, 0.01, 0.99, ...]  (computed)
pos=2 → [0.91, -0.42, 0.02, 0.98, ...]  (computed)

Final:
"The" at pos 0 → [0.2+0.0, -0.1+1.0, ...]
"cat" at pos 1 → [0.4+0.84, 0.3+0.54, ...]
"sat" at pos 2 → [-0.1+0.91, 0.6-0.42, ...]

Now the model knows position!
```

### Sinusoidal Positional Encoding

**The Formulas:**
```
PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))

Where:
- pos = position in sequence (0, 1, 2, ...)
- i = dimension index
- d_model = embedding dimension (e.g., 512)
```

**Why Sine and Cosine?**
```
1. Bounded: Values always between -1 and 1
2. Unique: Every position has a unique pattern
3. Relative positions: PE(pos+k) can be computed from PE(pos)
   (linear transformation exists!)
4. Extrapolation: Can handle positions longer than training
```

**Visualization:**
```
Position vs Dimension (first 8 dimensions):

pos=0: [0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0]
pos=1: [0.84, 0.54, 0.16, 0.99, 0.03, 1.0, 0.01, 1.0]
pos=2: [0.91, -0.42, 0.31, 0.95, 0.06, 1.0, 0.01, 1.0]
       ↑             ↑            ↑
       Fast          Medium       Slow
       wavelength    wavelength   wavelength
       
Higher dimensions = longer wavelengths = capture longer-range positions
```

---

## 📦 Part 2: Encoder Architecture

### Single Encoder Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                      ENCODER LAYER                               │
│                                                                  │
│   Input x                                                        │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────────────────────┐                               │
│   │   Multi-Head Self-Attention │                               │
│   └──────────────┬──────────────┘                               │
│                  │                                               │
│      ┌───────────┴────────────┐                                 │
│      │                        │                                 │
│      ▼                        │ (Residual Connection)           │
│   ┌──────┐                    │                                 │
│   │ ADD  │◄───────────────────┘                                 │
│   └──┬───┘                                                       │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────┐                                               │
│   │ Layer Norm  │                                               │
│   └──────┬──────┘                                               │
│          │                                                       │
│          ▼                                                       │
│   ┌─────────────────────────────┐                               │
│   │   Feed-Forward Network       │                               │
│   │   FFN(x) = ReLU(xW₁+b₁)W₂+b₂│                               │
│   └──────────────┬──────────────┘                               │
│                  │                                               │
│      ┌───────────┴────────────┐                                 │
│      │                        │                                 │
│      ▼                        │ (Residual Connection)           │
│   ┌──────┐                    │                                 │
│   │ ADD  │◄───────────────────┘                                 │
│   └──┬───┘                                                       │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────┐                                               │
│   │ Layer Norm  │                                               │
│   └──────┬──────┘                                               │
│          │                                                       │
│          ▼                                                       │
│      Output                                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

This is repeated N times (N=6 in original paper)
```

### Self-Attention in Encoder

Every position can attend to every other position:

```
Input: "The cat sat on the mat"

Self-attention allows:
- "sat" to look at "cat" (who sat?)
- "mat" to look at "on" (where?)
- "cat" to look at "The" (which cat?)

Each word builds a representation that includes 
relevant context from ALL other words.
```

### Feed-Forward Network (FFN)

Applied to each position **independently**:

```
FFN(x) = max(0, xW₁ + b₁)W₂ + b₂
         └─────ReLU─────┘

Or with GELU (modern models):
FFN(x) = GELU(xW₁ + b₁)W₂ + b₂

Dimensions:
- Input: d_model (512)
- Hidden: d_ff (2048) - 4x expansion
- Output: d_model (512)

Why 4x expansion?
- More capacity for learning complex transformations
- Acts like a "lookup table" for patterns
```

### Residual Connections & Layer Normalization

**Residual Connections:**
```
output = LayerNorm(x + Sublayer(x))

Why?
1. Gradient highway - gradients flow directly through
2. Enables very deep networks (100+ layers)
3. Each layer learns "delta" - what to add
```

**Layer Normalization:**
```
LayerNorm(x) = γ × (x - μ) / σ + β

Where:
- μ = mean of x across features
- σ = std of x across features  
- γ, β = learned scale and shift

Why LayerNorm (not BatchNorm)?
1. Works with variable sequence lengths
2. Independent of batch size
3. Consistent behavior train/inference
```

---

## 📦 Part 3: Decoder Architecture

### Single Decoder Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                      DECODER LAYER                               │
│                                                                  │
│   Target Input (shifted right)                                   │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────────────────────────────┐                       │
│   │   MASKED Multi-Head Self-Attention  │                       │
│   │   (Can't see future tokens!)        │                       │
│   └──────────────┬──────────────────────┘                       │
│                  │                                               │
│      ┌───────────┴────────────┐                                 │
│      ▼                        │                                 │
│   ┌──────┐                    │                                 │
│   │ ADD  │◄───────────────────┘                                 │
│   └──┬───┘                                                       │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────┐                                               │
│   │ Layer Norm  │                                               │
│   └──────┬──────┘                                               │
│          │                                                       │
│          ▼                                                       │
│   ┌─────────────────────────────────────┐                       │
│   │   Multi-Head Cross-Attention        │ ◄─── Encoder Output   │
│   │   Q from decoder, K,V from encoder  │                       │
│   └──────────────┬──────────────────────┘                       │
│                  │                                               │
│      ┌───────────┴────────────┐                                 │
│      ▼                        │                                 │
│   ┌──────┐                    │                                 │
│   │ ADD  │◄───────────────────┘                                 │
│   └──┬───┘                                                       │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────┐                                               │
│   │ Layer Norm  │                                               │
│   └──────┬──────┘                                               │
│          │                                                       │
│          ▼                                                       │
│   ┌─────────────────────────────┐                               │
│   │   Feed-Forward Network       │                               │
│   └──────────────┬──────────────┘                               │
│                  │                                               │
│      ┌───────────┴────────────┐                                 │
│      ▼                        │                                 │
│   ┌──────┐                    │                                 │
│   │ ADD  │◄───────────────────┘                                 │
│   └──┬───┘                                                       │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────┐                                               │
│   │ Layer Norm  │                                               │
│   └──────┬──────┘                                               │
│          │                                                       │
│          ▼                                                       │
│      Output                                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Masked Self-Attention

**Why Masking?**

During training, we feed the entire target sequence. But the model shouldn't "cheat" by looking at future tokens!

```
Target: "<BOS> I love AI <EOS>"

When predicting "love":
✓ Can see: <BOS>, I
✗ Cannot see: love, AI, <EOS> (future!)

Mask matrix:
        <BOS>   I    love   AI   <EOS>
<BOS>     1     0      0     0     0
I         1     1      0     0     0
love      1     1      1     0     0
AI        1     1      1     1     0
<EOS>     1     1      1     1     1

1 = can attend, 0 = masked (set to -inf before softmax)
```

### Cross-Attention

**How it works:**
```
Query: from decoder (what are we generating?)
Key, Value: from encoder (what was the input?)

Example - Translation "Je t'aime" → "I love you"

When decoder generates "love":
- Q comes from decoder position where we're generating
- K, V come from encoder output of "Je t'aime"
- Attention finds "aime" is most relevant
- Decoder uses that information
```

---

## 📐 Mathematical Formulas

### Complete Transformer Equations

**Positional Encoding:**
```
PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
```

**Encoder Layer:**
```
# Self-attention sub-layer
attn_out = MultiHeadAttention(X, X, X)  # Q=K=V=X
X = LayerNorm(X + attn_out)

# FFN sub-layer
ffn_out = FFN(X)
X = LayerNorm(X + ffn_out)
```

**Decoder Layer:**
```
# Masked self-attention
masked_attn = MaskedMultiHeadAttention(Y, Y, Y, causal_mask)
Y = LayerNorm(Y + masked_attn)

# Cross-attention
cross_attn = MultiHeadAttention(Y, encoder_output, encoder_output)
Y = LayerNorm(Y + cross_attn)

# FFN
ffn_out = FFN(Y)
Y = LayerNorm(Y + ffn_out)
```

**Multi-Head Attention:**
```
MultiHead(Q, K, V) = Concat(head_1, ..., head_h)W^O

head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)

Attention(Q, K, V) = softmax(QK^T / √d_k)V
```

**Feed-Forward Network:**
```
FFN(x) = max(0, xW_1 + b_1)W_2 + b_2

Modern (with GELU):
FFN(x) = GELU(xW_1 + b_1)W_2 + b_2

With GLU (GPT-4, LLaMA):
FFN(x) = (xW_1 ⊙ σ(xW_gate))W_2
```

### Hyperparameters (Original Paper)

| Parameter | Value | Description |
|-----------|-------|-------------|
| d_model | 512 | Embedding/hidden dimension |
| N | 6 | Number of encoder/decoder layers |
| h | 8 | Number of attention heads |
| d_k | 64 | Key/query dimension per head |
| d_v | 64 | Value dimension per head |
| d_ff | 2048 | FFN hidden dimension |
| dropout | 0.1 | Dropout rate |

---

## 🌍 Real World Use Cases

### 1. Machine Translation (Original Use Case)

```
Input (English): "The cat sat on the mat"
                      ↓
                  [ENCODER]
                      ↓
                 Context Vector
                      ↓
                  [DECODER]
                      ↓
Output (French): "Le chat était assis sur le tapis"
```

### 2. Text Summarization

```
Input: [Long article about climate change...]
       ↓
   [Encoder-Decoder Transformer]
       ↓
Output: "Climate change is accelerating. Scientists urge action."
```

### 3. Question Answering

```
Context: "Paris is the capital of France..."
Question: "What is the capital of France?"
          ↓
      [Transformer]
          ↓
Answer: "Paris"
```

### 4. Modern LLMs (GPT, Claude)

```
User: "Write a poem about AI"
          ↓
   [Decoder-only Transformer]
          ↓
Response: "In circuits deep and data wide,
          A new intelligence resides..."
```

---

## 💻 Sample Mini Project: Mini-Transformer Encoder

```python
"""
Implement a mini Transformer encoder from scratch
For educational purposes - see how all pieces fit together!
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ============================================
# COMPONENT 1: POSITIONAL ENCODING
# ============================================

class PositionalEncoding(nn.Module):
    """
    Sinusoidal positional encoding from "Attention Is All You Need"
    """
    
    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        # Create positional encoding matrix
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)  # Even indices
        pe[:, 1::2] = torch.cos(position * div_term)  # Odd indices
        
        pe = pe.unsqueeze(0)  # Add batch dimension: (1, max_len, d_model)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        """
        Args:
            x: (batch_size, seq_len, d_model)
        """
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


# ============================================
# COMPONENT 2: MULTI-HEAD ATTENTION
# ============================================

class MultiHeadAttention(nn.Module):
    """
    Multi-Head Attention mechanism
    """
    
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        # Linear projections
        self.W_Q = nn.Linear(d_model, d_model)
        self.W_K = nn.Linear(d_model, d_model)
        self.W_V = nn.Linear(d_model, d_model)
        self.W_O = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        self.scale = math.sqrt(self.d_k)
    
    def forward(self, Q, K, V, mask=None):
        batch_size = Q.size(0)
        
        # 1. Linear projections and reshape
        # (batch, seq_len, d_model) -> (batch, num_heads, seq_len, d_k)
        Q = self.W_Q(Q).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        K = self.W_K(K).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        V = self.W_V(V).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        
        # 2. Compute attention scores
        # (batch, heads, seq_q, d_k) @ (batch, heads, d_k, seq_k) = (batch, heads, seq_q, seq_k)
        scores = torch.matmul(Q, K.transpose(-2, -1)) / self.scale
        
        # 3. Apply mask if provided
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        
        # 4. Softmax and dropout
        attention_weights = F.softmax(scores, dim=-1)
        attention_weights = self.dropout(attention_weights)
        
        # 5. Apply attention to values
        # (batch, heads, seq_q, seq_k) @ (batch, heads, seq_k, d_k) = (batch, heads, seq_q, d_k)
        context = torch.matmul(attention_weights, V)
        
        # 6. Concatenate heads and project
        # (batch, heads, seq_q, d_k) -> (batch, seq_q, d_model)
        context = context.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        output = self.W_O(context)
        
        return output, attention_weights


# ============================================
# COMPONENT 3: FEED-FORWARD NETWORK
# ============================================

class FeedForward(nn.Module):
    """
    Position-wise Feed-Forward Network
    FFN(x) = max(0, xW1 + b1)W2 + b2
    """
    
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x):
        x = self.linear1(x)
        x = F.relu(x)
        x = self.dropout(x)
        x = self.linear2(x)
        return x


# ============================================
# COMPONENT 4: ENCODER LAYER
# ============================================

class EncoderLayer(nn.Module):
    """
    Single Transformer Encoder Layer
    """
    
    def __init__(self, d_model: int, num_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
    
    def forward(self, x, mask=None):
        # Self-attention with residual connection
        attn_output, attn_weights = self.self_attention(x, x, x, mask)
        x = self.norm1(x + self.dropout1(attn_output))
        
        # Feed-forward with residual connection
        ff_output = self.feed_forward(x)
        x = self.norm2(x + self.dropout2(ff_output))
        
        return x, attn_weights


# ============================================
# COMPONENT 5: FULL ENCODER
# ============================================

class TransformerEncoder(nn.Module):
    """
    Full Transformer Encoder (stack of N layers)
    """
    
    def __init__(
        self,
        vocab_size: int,
        d_model: int = 512,
        num_heads: int = 8,
        num_layers: int = 6,
        d_ff: int = 2048,
        max_len: int = 5000,
        dropout: float = 0.1
    ):
        super().__init__()
        
        self.d_model = d_model
        
        # Embedding and positional encoding
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.positional_encoding = PositionalEncoding(d_model, max_len, dropout)
        
        # Stack of encoder layers
        self.layers = nn.ModuleList([
            EncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x, mask=None):
        """
        Args:
            x: Token indices (batch_size, seq_len)
            mask: Attention mask (batch_size, seq_len)
        
        Returns:
            output: (batch_size, seq_len, d_model)
            attention_weights: List of attention weights per layer
        """
        # Embed and add positional encoding
        x = self.embedding(x) * math.sqrt(self.d_model)
        x = self.positional_encoding(x)
        
        # Pass through encoder layers
        attention_weights = []
        for layer in self.layers:
            x, attn_weights = layer(x, mask)
            attention_weights.append(attn_weights)
        
        return x, attention_weights


# ============================================
# DEMO
# ============================================

def demo():
    """
    Demonstrate the Transformer Encoder
    """
    print("="*60)
    print("TRANSFORMER ENCODER DEMO")
    print("="*60)
    
    # Hyperparameters
    vocab_size = 10000
    d_model = 128
    num_heads = 4
    num_layers = 2
    d_ff = 512
    batch_size = 2
    seq_len = 10
    
    print(f"\nHyperparameters:")
    print(f"  vocab_size: {vocab_size}")
    print(f"  d_model: {d_model}")
    print(f"  num_heads: {num_heads}")
    print(f"  num_layers: {num_layers}")
    print(f"  d_ff: {d_ff}")
    
    # Create encoder
    encoder = TransformerEncoder(
        vocab_size=vocab_size,
        d_model=d_model,
        num_heads=num_heads,
        num_layers=num_layers,
        d_ff=d_ff
    )
    
    # Count parameters
    num_params = sum(p.numel() for p in encoder.parameters())
    print(f"\nTotal parameters: {num_params:,}")
    
    # Random input
    x = torch.randint(0, vocab_size, (batch_size, seq_len))
    print(f"\nInput shape: {x.shape}")
    
    # Forward pass
    output, attention_weights = encoder(x)
    print(f"Output shape: {output.shape}")
    print(f"Number of attention weight matrices: {len(attention_weights)}")
    print(f"Each attention weight shape: {attention_weights[0].shape}")
    
    # Show what each dimension means
    print("\nDimension meanings:")
    print(f"  Output: (batch={batch_size}, seq_len={seq_len}, d_model={d_model})")
    print(f"  Attention: (batch={batch_size}, heads={num_heads}, seq_q={seq_len}, seq_k={seq_len})")


if __name__ == "__main__":
    demo()
```

**Expected Output:**
```
============================================================
TRANSFORMER ENCODER DEMO
============================================================

Hyperparameters:
  vocab_size: 10000
  d_model: 128
  num_heads: 4
  num_layers: 2
  d_ff: 512

Total parameters: 1,575,296

Input shape: torch.Size([2, 10])
Output shape: torch.Size([2, 10, 128])
Number of attention weight matrices: 2
Each attention weight shape: torch.Size([2, 4, 10, 10])

Dimension meanings:
  Output: (batch=2, seq_len=10, d_model=128)
  Attention: (batch=2, heads=4, seq_q=10, seq_k=10)
```

---

## 📝 Homework

### Easy
1. **Draw the Transformer architecture** from memory (encoder-decoder)
2. **Calculate positional encoding** for positions 0-3 with d_model=4
3. **Explain** why we need both residual connections AND layer normalization

### Medium
4. **Implement the decoder layer** following the pattern above
5. **Compare Pre-LN vs Post-LN:** Research and implement both variants
6. **Visualize positional encodings** as heatmap - what patterns do you see?

### Hard
7. **Build full encoder-decoder Transformer** for translation
8. **Implement relative positional encodings** (used in T5)
9. **Add learned positional encodings** and compare with sinusoidal

---

## ⚠️ Common Mistakes

### 1. Forgetting to Scale Embeddings

```python
# WRONG
x = self.embedding(tokens)

# RIGHT - scale by sqrt(d_model) as in original paper
x = self.embedding(tokens) * math.sqrt(d_model)
```

### 2. Wrong Layer Norm Placement

```python
# Post-LN (original paper)
x = self.norm(x + self.sublayer(x))

# Pre-LN (modern, often better)
x = x + self.sublayer(self.norm(x))
```

### 3. Mask Shape Issues

```python
# Attention mask should be broadcastable
# (batch, 1, 1, seq_len) for proper broadcasting with (batch, heads, seq_q, seq_k)
mask = mask.unsqueeze(1).unsqueeze(2)
```

### 4. Not Detaching During Inference

```python
# During inference, detach to save memory
with torch.no_grad():
    output = model(input)
```

### 5. Confusing d_model, d_k, d_ff

```
d_model = 512   # Main hidden dimension (throughout model)
d_k = 64        # Per-head dimension in attention (d_model / num_heads)
d_ff = 2048     # FFN hidden dimension (typically 4 × d_model)
```

---

## 🎤 Interview Questions & Answers

### Beginner Level

**Q1: What is the main advantage of Transformers over RNNs?**

**A:** Parallelization. RNNs process sequences one token at a time (sequential), while Transformers process all tokens simultaneously using attention. This makes training much faster and enables scaling to larger datasets and models.

---

**Q2: What is positional encoding and why is it needed?**

**A:** Positional encoding adds information about token positions to the model. It's needed because self-attention is permutation-invariant - "dog bites man" and "man bites dog" would have the same attention patterns without position information. The original paper uses sinusoidal functions, but learned positional embeddings are also common.

---

### Intermediate Level

**Q3: Explain the difference between self-attention, cross-attention, and masked self-attention.**

**A:**
- **Self-attention:** Q, K, V all come from the same sequence. Each position attends to all positions. Used in encoder.

- **Cross-attention:** Q from one sequence (decoder), K,V from another (encoder output). Used for the decoder to "look at" encoder information.

- **Masked self-attention:** Self-attention with future positions masked. Prevents "cheating" during autoregressive generation. Used in decoder.

---

**Q4: Why does the Transformer use residual connections?**

**A:**
1. **Gradient flow:** Provides direct path for gradients, preventing vanishing gradients in deep networks
2. **Identity mapping:** Network can easily learn identity if that's optimal
3. **Ensemble effect:** Each layer learns what to "add" rather than full transformation
4. **Training stability:** Makes optimization landscape smoother

---

### Advanced Level

**Q5: Explain Pre-LN vs Post-LN and their tradeoffs.**

**A:**
**Post-LN (Original Paper):**
```python
x = LayerNorm(x + Sublayer(x))
```
- Layer norm after residual addition
- Can have gradient issues in very deep networks
- May need learning rate warmup

**Pre-LN (Modern):**
```python
x = x + Sublayer(LayerNorm(x))
```
- Layer norm before sublayer
- More stable gradients
- Easier to train, often no warmup needed
- Slight representational difference at output

Most modern models use Pre-LN for stability.

---

**Q6: How would you modify the Transformer for a very long sequence (100K+ tokens)?**

**A:**
1. **Sparse Attention:** Only attend to local windows + global tokens (Longformer)
2. **Linear Attention:** Approximate softmax(QK^T)V with kernel tricks (Performer)
3. **Chunking:** Process in chunks with recurrence (Transformer-XL)
4. **Hierarchical:** Token → sentence → document level
5. **Memory-efficient implementation:** Flash Attention (same result, less memory)
6. **Mixture of Experts:** Route different tokens through different experts

---

### FAANG Level

**Q7: Design a Transformer architecture for multimodal input (text + images).**

**A:**
```
Design: Vision-Language Transformer

1. INPUT PROCESSING:
   Text:  Tokenize → Token Embeddings
   Image: Patch → Linear Projection → Patch Embeddings
   
   Add modality embeddings to distinguish text vs image tokens

2. COMBINED SEQUENCE:
   [CLS] [IMG_1] ... [IMG_N] [SEP] [TXT_1] ... [TXT_M] [SEP]
   
3. POSITIONAL ENCODING:
   Text:  1D positional encoding
   Image: 2D positional encoding (row + column)
   
4. ARCHITECTURE OPTIONS:
   a) Single-stream: Joint self-attention over all tokens
   b) Dual-stream: Separate encoders with cross-attention
   c) Fusion layers: Early fusion vs late fusion

5. ATTENTION PATTERNS:
   - Image patches attend to each other (spatial)
   - Text tokens attend to each other (sequential)
   - Cross-modal attention (text ↔ image)

6. PRE-TRAINING OBJECTIVES:
   - Masked Language Modeling (text)
   - Masked Patch Prediction (image)
   - Image-Text Matching
   - Contrastive Learning (CLIP-style)
```

---

**Q8: Derive the memory complexity of self-attention and propose a solution for memory-constrained scenarios.**

**A:**
**Memory Analysis:**
```
For sequence length n, batch size b, hidden dimension d, heads h:

1. QKV storage: 3 × b × n × d
2. Attention matrix: b × h × n × n  ← BOTTLENECK
3. Output: b × n × d

Total: O(bn² + bnd)

The n² term dominates for long sequences:
- n=1K: ~4MB per head
- n=10K: ~400MB per head
- n=100K: ~40GB per head ← Impossible!
```

**Solutions:**
```
1. GRADIENT CHECKPOINTING:
   Don't store all activations, recompute during backward pass
   Trade: 2x compute for less memory

2. FLASH ATTENTION:
   Compute attention in blocks, fuse operations
   Never materialize full n×n matrix
   Same result, O(n) memory

3. SPARSE ATTENTION:
   Only compute subset of attention matrix
   Local windows + global tokens
   O(n√n) or O(n) complexity

4. LINEAR ATTENTION:
   Approximate: softmax(QK^T)V ≈ φ(Q)(φ(K)^T V)
   Change order of operations
   O(n) complexity

5. MEMORY-EFFICIENT ATTENTION:
   Process in chunks, accumulate results
   Trade compute for memory
```

---

## 🔗 Next Steps

Now that you understand the Transformer architecture, you're ready for:

**➡️ 04-GPT-and-BERT.md** - See how the Transformer architecture is adapted for different use cases:
- **GPT:** Decoder-only for generation (ChatGPT, Claude)
- **BERT:** Encoder-only for understanding (classification, NER)

These two paradigms power most of modern NLP!
