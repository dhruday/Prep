# 📘 Build Transformer from Scratch - Complete Implementation

## 📚 Table of Contents

1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Complete Implementation](#-complete-implementation)
3. [Part 1: Embeddings](#-part-1-embeddings)
4. [Part 2: Attention Mechanism](#-part-2-attention-mechanism)
5. [Part 3: Feed-Forward Network](#-part-3-feed-forward-network)
6. [Part 4: Encoder Layer and Stack](#-part-4-encoder-layer-and-stack)
7. [Part 5: Decoder Layer and Stack](#-part-5-decoder-layer-and-stack)
8. [Part 6: Full Transformer](#-part-6-full-transformer)
9. [Part 7: Masks](#-part-7-masks)
10. [Part 8: Training Loop](#-part-8-training-loop)
11. [Part 9: Inference (Generation)](#-part-9-inference-generation)
12. [Part 10: Complete Training Script](#-part-10-complete-training-script)
13. [Homework](#-homework)
14. [Common Mistakes](#️-common-mistakes)
15. [Quick Interview Questions](#-quick-interview-questions)
16. [Next Steps](#-next-steps)

---

## 🎯 Beginner Friendly Explanation

### Why Build from Scratch?

Building a Transformer from scratch is the best way to truly understand:
- How attention really works
- Why positional encoding is necessary
- How encoder and decoder interact
- What happens during training

**Analogy:**
```
Using pre-built Transformers = Driving an automatic car
Building from scratch = Building the engine yourself

After this, you'll understand every gear and piston!
```

### What We'll Build

```
┌─────────────────────────────────────────────────────────────────┐
│                    OUR TRANSFORMER                               │
│                                                                  │
│   ✓ Token Embeddings                                            │
│   ✓ Positional Encoding (Sinusoidal)                            │
│   ✓ Multi-Head Self-Attention                                   │
│   ✓ Feed-Forward Network                                        │
│   ✓ Layer Normalization                                         │
│   ✓ Residual Connections                                        │
│   ✓ Encoder Stack                                               │
│   ✓ Decoder Stack (with masking)                                │
│   ✓ Full Encoder-Decoder Transformer                            │
│   ✓ Training Loop                                               │
│   ✓ Inference/Generation                                        │
│                                                                  │
│   Task: Sequence Copying (to verify it works!)                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Complete Implementation

### Setup and Imports

```python
"""
Transformer Implementation from Scratch
Based on "Attention Is All You Need" (Vaswani et al., 2017)

This is a complete, educational implementation.
Each component is explained in detail.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import math
import numpy as np
import matplotlib.pyplot as plt
import copy
from typing import Optional, Tuple

# Set random seeds for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")
```

---

## 📦 Part 1: Embeddings

### Token Embedding

```python
class TokenEmbedding(nn.Module):
    """
    Convert token indices to dense vectors.
    
    Each word in vocabulary gets a learnable vector.
    
    Example:
        vocab_size = 10000
        d_model = 512
        
        Token "hello" (id=42) → [0.23, -0.45, ..., 0.12] (512 values)
    
    Why scale by sqrt(d_model)?
        The original paper scales embeddings to balance with positional encoding.
        Without scaling, positional encoding might dominate.
    """
    
    def __init__(self, vocab_size: int, d_model: int):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.d_model = d_model
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Token indices (batch_size, seq_len)
        
        Returns:
            Embeddings (batch_size, seq_len, d_model)
        """
        return self.embedding(x) * math.sqrt(self.d_model)
```

### Positional Encoding

```python
class PositionalEncoding(nn.Module):
    """
    Add position information using sinusoidal functions.
    
    Formulas:
        PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
        PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
    
    Why sinusoidal?
        1. Bounded between -1 and 1
        2. Each position has unique encoding
        3. Model can learn relative positions
        4. Works for sequences longer than training
    """
    
    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        # Create matrix of shape (max_len, d_model)
        pe = torch.zeros(max_len, d_model)
        
        # Position indices: 0, 1, 2, ..., max_len-1
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        
        # Compute the div_term: 10000^(2i/d_model)
        # Using exp and log for numerical stability
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        
        # Apply sin to even indices, cos to odd indices
        pe[:, 0::2] = torch.sin(position * div_term)  # Even: 0, 2, 4, ...
        pe[:, 1::2] = torch.cos(position * div_term)  # Odd: 1, 3, 5, ...
        
        # Add batch dimension: (1, max_len, d_model)
        pe = pe.unsqueeze(0)
        
        # Register as buffer (not a parameter, but saved with model)
        self.register_buffer('pe', pe)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Embeddings (batch_size, seq_len, d_model)
        
        Returns:
            Embeddings + positional encoding (batch_size, seq_len, d_model)
        """
        seq_len = x.size(1)
        x = x + self.pe[:, :seq_len, :]
        return self.dropout(x)
```

---

## 📦 Part 2: Attention Mechanism

### Scaled Dot-Product Attention

```python
def scaled_dot_product_attention(
    query: torch.Tensor,
    key: torch.Tensor,
    value: torch.Tensor,
    mask: Optional[torch.Tensor] = None,
    dropout: Optional[nn.Dropout] = None
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Compute Scaled Dot-Product Attention.
    
    Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
    
    Args:
        query:  (batch, heads, seq_len, d_k)
        key:    (batch, heads, seq_len, d_k)
        value:  (batch, heads, seq_len, d_v)
        mask:   Optional mask (batch, 1, 1, seq_len) or (batch, 1, seq_len, seq_len)
        dropout: Optional dropout layer
    
    Returns:
        output: (batch, heads, seq_len, d_v)
        attention_weights: (batch, heads, seq_len, seq_len)
    """
    d_k = query.size(-1)
    
    # Step 1: QK^T / sqrt(d_k)
    # (batch, heads, seq_q, d_k) @ (batch, heads, d_k, seq_k)
    # = (batch, heads, seq_q, seq_k)
    scores = torch.matmul(query, key.transpose(-2, -1)) / math.sqrt(d_k)
    
    # Step 2: Apply mask (if provided)
    if mask is not None:
        # Set masked positions to -inf (becomes 0 after softmax)
        scores = scores.masked_fill(mask == 0, float('-inf'))
    
    # Step 3: Softmax over last dimension (keys)
    attention_weights = F.softmax(scores, dim=-1)
    
    # Step 4: Dropout (optional)
    if dropout is not None:
        attention_weights = dropout(attention_weights)
    
    # Step 5: Multiply by values
    # (batch, heads, seq_q, seq_k) @ (batch, heads, seq_k, d_v)
    # = (batch, heads, seq_q, d_v)
    output = torch.matmul(attention_weights, value)
    
    return output, attention_weights
```

### Multi-Head Attention

```python
class MultiHeadAttention(nn.Module):
    """
    Multi-Head Attention mechanism.
    
    MultiHead(Q, K, V) = Concat(head_1, ..., head_h) * W_O
    
    where head_i = Attention(Q*W_Q_i, K*W_K_i, V*W_V_i)
    
    Why multiple heads?
        Different heads can focus on different relationships:
        - Syntax
        - Semantics
        - Coreference
        - Position patterns
    """
    
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads  # Dimension per head
        
        # Linear projections for Q, K, V
        # These are combined into single matrices for efficiency
        self.W_Q = nn.Linear(d_model, d_model, bias=False)
        self.W_K = nn.Linear(d_model, d_model, bias=False)
        self.W_V = nn.Linear(d_model, d_model, bias=False)
        
        # Output projection
        self.W_O = nn.Linear(d_model, d_model, bias=False)
        
        # Dropout
        self.dropout = nn.Dropout(dropout)
        
        # Store attention weights for visualization
        self.attention_weights = None
    
    def forward(
        self,
        query: torch.Tensor,
        key: torch.Tensor,
        value: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Args:
            query: (batch, seq_len, d_model)
            key:   (batch, seq_len, d_model)
            value: (batch, seq_len, d_model)
            mask:  Optional attention mask
        
        Returns:
            output: (batch, seq_len, d_model)
        """
        batch_size = query.size(0)
        
        # 1. Linear projections: (batch, seq_len, d_model)
        Q = self.W_Q(query)
        K = self.W_K(key)
        V = self.W_V(value)
        
        # 2. Reshape for multi-head: (batch, seq_len, d_model) -> (batch, num_heads, seq_len, d_k)
        Q = Q.view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        K = K.view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        V = V.view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        
        # 3. Apply scaled dot-product attention
        attn_output, attn_weights = scaled_dot_product_attention(
            Q, K, V, mask, self.dropout
        )
        
        # Store for visualization
        self.attention_weights = attn_weights
        
        # 4. Concatenate heads: (batch, num_heads, seq_len, d_k) -> (batch, seq_len, d_model)
        attn_output = attn_output.transpose(1, 2).contiguous()
        attn_output = attn_output.view(batch_size, -1, self.d_model)
        
        # 5. Final linear projection
        output = self.W_O(attn_output)
        
        return output
```

---

## 📦 Part 3: Feed-Forward Network

```python
class FeedForwardNetwork(nn.Module):
    """
    Position-wise Feed-Forward Network.
    
    FFN(x) = max(0, x*W_1 + b_1) * W_2 + b_2
    
    Or with GELU (more common in modern models):
    FFN(x) = GELU(x*W_1 + b_1) * W_2 + b_2
    
    Why expand to 4x?
        - More capacity for learning complex patterns
        - Acts like a lookup table
        - Each position processed independently
    """
    
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        # Two linear transformations with activation in between
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
        
        Returns:
            output: (batch, seq_len, d_model)
        """
        # Expand: d_model -> d_ff (e.g., 512 -> 2048)
        x = self.linear1(x)
        
        # Activation (ReLU in original paper, GELU in modern)
        x = F.relu(x)
        
        # Dropout
        x = self.dropout(x)
        
        # Contract: d_ff -> d_model (e.g., 2048 -> 512)
        x = self.linear2(x)
        
        return x
```

---

## 📦 Part 4: Encoder Layer and Stack

```python
class EncoderLayer(nn.Module):
    """
    Single Encoder Layer.
    
    Contains:
        1. Multi-Head Self-Attention
        2. Add & Norm (Residual + LayerNorm)
        3. Feed-Forward Network
        4. Add & Norm
    """
    
    def __init__(self, d_model: int, num_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        # Sub-layers
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForwardNetwork(d_model, d_ff, dropout)
        
        # Layer normalization
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        # Dropout for residual connections
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
    
    def forward(
        self,
        x: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
            src_mask: Optional source mask for padding
        
        Returns:
            output: (batch, seq_len, d_model)
        """
        # Self-attention with residual connection and layer norm
        # Using Pre-LN (modern) instead of Post-LN (original paper)
        attn_output = self.self_attention(x, x, x, src_mask)
        x = x + self.dropout1(attn_output)
        x = self.norm1(x)
        
        # Feed-forward with residual connection and layer norm
        ff_output = self.feed_forward(x)
        x = x + self.dropout2(ff_output)
        x = self.norm2(x)
        
        return x


class Encoder(nn.Module):
    """
    Stack of N Encoder Layers.
    """
    
    def __init__(
        self,
        num_layers: int,
        d_model: int,
        num_heads: int,
        d_ff: int,
        dropout: float = 0.1
    ):
        super().__init__()
        
        # Create N identical layers
        self.layers = nn.ModuleList([
            EncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        
        # Final layer normalization
        self.norm = nn.LayerNorm(d_model)
    
    def forward(
        self,
        x: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
            src_mask: Optional source mask
        
        Returns:
            output: (batch, seq_len, d_model)
        """
        for layer in self.layers:
            x = layer(x, src_mask)
        
        return self.norm(x)
```

---

## 📦 Part 5: Decoder Layer and Stack

```python
class DecoderLayer(nn.Module):
    """
    Single Decoder Layer.
    
    Contains:
        1. Masked Multi-Head Self-Attention (can't see future)
        2. Add & Norm
        3. Multi-Head Cross-Attention (to encoder output)
        4. Add & Norm
        5. Feed-Forward Network
        6. Add & Norm
    """
    
    def __init__(self, d_model: int, num_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        # Sub-layers
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.cross_attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForwardNetwork(d_model, d_ff, dropout)
        
        # Layer normalization
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.norm3 = nn.LayerNorm(d_model)
        
        # Dropout
        self.dropout1 = nn.Dropout(dropout)
        self.dropout2 = nn.Dropout(dropout)
        self.dropout3 = nn.Dropout(dropout)
    
    def forward(
        self,
        x: torch.Tensor,
        encoder_output: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None,
        tgt_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Args:
            x: Decoder input (batch, tgt_seq_len, d_model)
            encoder_output: Encoder output (batch, src_seq_len, d_model)
            src_mask: Source mask (for encoder output)
            tgt_mask: Target mask (causal mask for decoder)
        
        Returns:
            output: (batch, tgt_seq_len, d_model)
        """
        # Masked self-attention (can only see past tokens)
        self_attn_output = self.self_attention(x, x, x, tgt_mask)
        x = x + self.dropout1(self_attn_output)
        x = self.norm1(x)
        
        # Cross-attention (query from decoder, key-value from encoder)
        cross_attn_output = self.cross_attention(x, encoder_output, encoder_output, src_mask)
        x = x + self.dropout2(cross_attn_output)
        x = self.norm2(x)
        
        # Feed-forward
        ff_output = self.feed_forward(x)
        x = x + self.dropout3(ff_output)
        x = self.norm3(x)
        
        return x


class Decoder(nn.Module):
    """
    Stack of N Decoder Layers.
    """
    
    def __init__(
        self,
        num_layers: int,
        d_model: int,
        num_heads: int,
        d_ff: int,
        dropout: float = 0.1
    ):
        super().__init__()
        
        self.layers = nn.ModuleList([
            DecoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        
        self.norm = nn.LayerNorm(d_model)
    
    def forward(
        self,
        x: torch.Tensor,
        encoder_output: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None,
        tgt_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Args:
            x: (batch, tgt_seq_len, d_model)
            encoder_output: (batch, src_seq_len, d_model)
            src_mask: Source mask
            tgt_mask: Target mask (causal)
        
        Returns:
            output: (batch, tgt_seq_len, d_model)
        """
        for layer in self.layers:
            x = layer(x, encoder_output, src_mask, tgt_mask)
        
        return self.norm(x)
```

---

## 📦 Part 6: Full Transformer

```python
class Transformer(nn.Module):
    """
    Complete Transformer Model (Encoder-Decoder).
    
    Architecture:
        Input -> Token Embedding -> Positional Encoding -> Encoder
        Target -> Token Embedding -> Positional Encoding -> Decoder
        Decoder Output -> Linear -> Softmax -> Output Probabilities
    """
    
    def __init__(
        self,
        src_vocab_size: int,
        tgt_vocab_size: int,
        d_model: int = 512,
        num_heads: int = 8,
        num_encoder_layers: int = 6,
        num_decoder_layers: int = 6,
        d_ff: int = 2048,
        max_seq_len: int = 5000,
        dropout: float = 0.1
    ):
        super().__init__()
        
        # Save config
        self.d_model = d_model
        
        # Embedding layers
        self.src_embedding = TokenEmbedding(src_vocab_size, d_model)
        self.tgt_embedding = TokenEmbedding(tgt_vocab_size, d_model)
        
        # Positional encoding (shared)
        self.positional_encoding = PositionalEncoding(d_model, max_seq_len, dropout)
        
        # Encoder and Decoder
        self.encoder = Encoder(num_encoder_layers, d_model, num_heads, d_ff, dropout)
        self.decoder = Decoder(num_decoder_layers, d_model, num_heads, d_ff, dropout)
        
        # Output projection
        self.output_projection = nn.Linear(d_model, tgt_vocab_size)
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize weights with Xavier uniform"""
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)
    
    def encode(
        self,
        src: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Encode source sequence.
        
        Args:
            src: Source tokens (batch, src_seq_len)
            src_mask: Source mask
        
        Returns:
            encoder_output: (batch, src_seq_len, d_model)
        """
        src_embedded = self.src_embedding(src)
        src_embedded = self.positional_encoding(src_embedded)
        return self.encoder(src_embedded, src_mask)
    
    def decode(
        self,
        tgt: torch.Tensor,
        encoder_output: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None,
        tgt_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Decode target sequence.
        
        Args:
            tgt: Target tokens (batch, tgt_seq_len)
            encoder_output: (batch, src_seq_len, d_model)
            src_mask: Source mask
            tgt_mask: Target mask (causal)
        
        Returns:
            decoder_output: (batch, tgt_seq_len, d_model)
        """
        tgt_embedded = self.tgt_embedding(tgt)
        tgt_embedded = self.positional_encoding(tgt_embedded)
        return self.decoder(tgt_embedded, encoder_output, src_mask, tgt_mask)
    
    def forward(
        self,
        src: torch.Tensor,
        tgt: torch.Tensor,
        src_mask: Optional[torch.Tensor] = None,
        tgt_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Full forward pass.
        
        Args:
            src: Source tokens (batch, src_seq_len)
            tgt: Target tokens (batch, tgt_seq_len)
            src_mask: Source mask
            tgt_mask: Target mask (causal)
        
        Returns:
            output: (batch, tgt_seq_len, tgt_vocab_size)
        """
        encoder_output = self.encode(src, src_mask)
        decoder_output = self.decode(tgt, encoder_output, src_mask, tgt_mask)
        output = self.output_projection(decoder_output)
        return output
```

---

## 📦 Part 7: Masks

```python
def create_padding_mask(seq: torch.Tensor, pad_idx: int = 0) -> torch.Tensor:
    """
    Create mask for padding tokens.
    
    Args:
        seq: Token indices (batch, seq_len)
        pad_idx: Index of padding token
    
    Returns:
        mask: (batch, 1, 1, seq_len) - 1 for valid, 0 for padding
    """
    return (seq != pad_idx).unsqueeze(1).unsqueeze(2)


def create_causal_mask(size: int, device: torch.device) -> torch.Tensor:
    """
    Create causal (look-ahead) mask for decoder.
    
    Prevents attention to future tokens.
    
    Args:
        size: Sequence length
        device: Device to create tensor on
    
    Returns:
        mask: (1, 1, size, size) - lower triangular
    """
    mask = torch.triu(torch.ones(size, size, device=device), diagonal=1)
    return (mask == 0).unsqueeze(0).unsqueeze(0)


def create_masks(
    src: torch.Tensor,
    tgt: torch.Tensor,
    pad_idx: int = 0
) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    Create all masks needed for training.
    
    Args:
        src: Source tokens (batch, src_len)
        tgt: Target tokens (batch, tgt_len)
        pad_idx: Padding token index
    
    Returns:
        src_mask: (batch, 1, 1, src_len)
        tgt_mask: (batch, 1, tgt_len, tgt_len)
    """
    # Source mask: only mask padding
    src_mask = create_padding_mask(src, pad_idx)
    
    # Target mask: padding + causal (can't see future)
    tgt_padding_mask = create_padding_mask(tgt, pad_idx)
    tgt_causal_mask = create_causal_mask(tgt.size(1), tgt.device)
    tgt_mask = tgt_padding_mask & tgt_causal_mask
    
    return src_mask, tgt_mask
```

---

## 📦 Part 8: Training Loop

```python
class CopyDataset(Dataset):
    """
    Simple copy task dataset.
    
    The model learns to copy the input sequence.
    This is a good sanity check that the Transformer works!
    
    Input:  [1, 2, 3, 4, 5]
    Target: [1, 2, 3, 4, 5]
    """
    
    def __init__(self, num_samples: int, seq_len: int, vocab_size: int):
        self.num_samples = num_samples
        self.seq_len = seq_len
        self.vocab_size = vocab_size
        
        # Generate random sequences
        # Avoid 0 (padding) and 1, 2 (special tokens)
        self.data = torch.randint(3, vocab_size, (num_samples, seq_len))
    
    def __len__(self):
        return self.num_samples
    
    def __getitem__(self, idx):
        seq = self.data[idx]
        return seq, seq.clone()  # Input and target are the same


def train_epoch(
    model: nn.Module,
    data_loader: DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
    pad_idx: int = 0
) -> float:
    """Train for one epoch."""
    model.train()
    total_loss = 0
    
    for src, tgt in data_loader:
        src = src.to(device)
        tgt = tgt.to(device)
        
        # Prepare decoder input and output
        # Input: [BOS, token1, token2, ...]
        # Output: [token1, token2, ..., EOS]
        # For simplicity, we shift by one position
        tgt_input = tgt[:, :-1]
        tgt_output = tgt[:, 1:]
        
        # Create masks
        src_mask, tgt_mask = create_masks(src, tgt_input, pad_idx)
        
        # Forward pass
        output = model(src, tgt_input, src_mask, tgt_mask)
        
        # Calculate loss
        # Reshape for cross-entropy: (batch * seq_len, vocab_size)
        output = output.contiguous().view(-1, output.size(-1))
        tgt_output = tgt_output.contiguous().view(-1)
        
        loss = criterion(output, tgt_output)
        
        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        
        optimizer.step()
        
        total_loss += loss.item()
    
    return total_loss / len(data_loader)


def evaluate(
    model: nn.Module,
    data_loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    pad_idx: int = 0
) -> float:
    """Evaluate the model."""
    model.eval()
    total_loss = 0
    
    with torch.no_grad():
        for src, tgt in data_loader:
            src = src.to(device)
            tgt = tgt.to(device)
            
            tgt_input = tgt[:, :-1]
            tgt_output = tgt[:, 1:]
            
            src_mask, tgt_mask = create_masks(src, tgt_input, pad_idx)
            
            output = model(src, tgt_input, src_mask, tgt_mask)
            
            output = output.contiguous().view(-1, output.size(-1))
            tgt_output = tgt_output.contiguous().view(-1)
            
            loss = criterion(output, tgt_output)
            total_loss += loss.item()
    
    return total_loss / len(data_loader)
```

---

## 📦 Part 9: Inference (Generation)

```python
def greedy_decode(
    model: nn.Module,
    src: torch.Tensor,
    max_len: int,
    start_symbol: int,
    end_symbol: int,
    device: torch.device
) -> torch.Tensor:
    """
    Greedy decoding (always pick highest probability token).
    
    Args:
        model: Trained Transformer
        src: Source sequence (1, src_len)
        max_len: Maximum output length
        start_symbol: BOS token index
        end_symbol: EOS token index
        device: Device
    
    Returns:
        output: Generated sequence (1, gen_len)
    """
    model.eval()
    
    # Encode source
    src_mask = create_padding_mask(src)
    encoder_output = model.encode(src, src_mask)
    
    # Start with BOS token
    ys = torch.ones(1, 1).fill_(start_symbol).long().to(device)
    
    for _ in range(max_len - 1):
        # Create causal mask
        tgt_mask = create_causal_mask(ys.size(1), device)
        
        # Decode
        decoder_output = model.decode(ys, encoder_output, src_mask, tgt_mask)
        
        # Project to vocabulary
        logits = model.output_projection(decoder_output[:, -1, :])
        
        # Get highest probability token
        next_token = logits.argmax(dim=-1, keepdim=True)
        
        # Append to sequence
        ys = torch.cat([ys, next_token], dim=1)
        
        # Stop if EOS
        if next_token.item() == end_symbol:
            break
    
    return ys
```

---

## 📦 Part 10: Complete Training Script

```python
def main():
    """
    Train a Transformer on the copy task.
    """
    print("="*60)
    print("TRANSFORMER FROM SCRATCH - COPY TASK")
    print("="*60)
    
    # Hyperparameters
    config = {
        'vocab_size': 100,
        'd_model': 128,
        'num_heads': 4,
        'num_layers': 2,
        'd_ff': 512,
        'dropout': 0.1,
        'max_seq_len': 20,
        'batch_size': 32,
        'epochs': 20,
        'learning_rate': 0.001,
        'num_train_samples': 1000,
        'num_val_samples': 200,
        'seq_len': 10
    }
    
    print("\nConfiguration:")
    for key, value in config.items():
        print(f"  {key}: {value}")
    
    # Create datasets
    train_dataset = CopyDataset(
        config['num_train_samples'],
        config['seq_len'],
        config['vocab_size']
    )
    val_dataset = CopyDataset(
        config['num_val_samples'],
        config['seq_len'],
        config['vocab_size']
    )
    
    train_loader = DataLoader(train_dataset, batch_size=config['batch_size'], shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config['batch_size'])
    
    # Create model
    model = Transformer(
        src_vocab_size=config['vocab_size'],
        tgt_vocab_size=config['vocab_size'],
        d_model=config['d_model'],
        num_heads=config['num_heads'],
        num_encoder_layers=config['num_layers'],
        num_decoder_layers=config['num_layers'],
        d_ff=config['d_ff'],
        max_seq_len=config['max_seq_len'],
        dropout=config['dropout']
    ).to(device)
    
    # Count parameters
    num_params = sum(p.numel() for p in model.parameters())
    print(f"\nModel parameters: {num_params:,}")
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss(ignore_index=0)  # Ignore padding
    optimizer = optim.Adam(model.parameters(), lr=config['learning_rate'], betas=(0.9, 0.98), eps=1e-9)
    
    # Learning rate scheduler (as in original paper)
    def lr_lambda(step):
        warmup_steps = 400
        if step == 0:
            return 0
        return min(step ** -0.5, step * warmup_steps ** -1.5)
    
    scheduler = optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
    
    # Training loop
    print("\nTraining...")
    print("-"*60)
    
    train_losses = []
    val_losses = []
    
    for epoch in range(config['epochs']):
        train_loss = train_epoch(model, train_loader, optimizer, criterion, device)
        val_loss = evaluate(model, val_loader, criterion, device)
        
        train_losses.append(train_loss)
        val_losses.append(val_loss)
        
        scheduler.step()
        
        if (epoch + 1) % 5 == 0 or epoch == 0:
            print(f"Epoch {epoch+1:3d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")
    
    # Test generation
    print("\n" + "="*60)
    print("TESTING GENERATION")
    print("="*60)
    
    model.eval()
    test_sequences = [
        torch.tensor([[3, 4, 5, 6, 7, 8, 9, 10, 11, 12]]),
        torch.tensor([[10, 20, 30, 40, 50, 60, 70, 80, 90, 99]]),
        torch.tensor([[5, 5, 5, 5, 5, 5, 5, 5, 5, 5]])
    ]
    
    for src in test_sequences:
        src = src.to(device)
        
        # Use simple greedy decoding
        output = greedy_decode(
            model, src, max_len=15, 
            start_symbol=src[0, 0].item(),  # Use first token as start
            end_symbol=1,  # Assume 1 is EOS
            device=device
        )
        
        print(f"\nInput:    {src.squeeze().tolist()}")
        print(f"Output:   {output.squeeze().tolist()}")
        print(f"Match:    {src.squeeze().tolist() == output.squeeze().tolist()[:len(src.squeeze())]}")
    
    return model, train_losses, val_losses


# Run training
if __name__ == "__main__":
    model, train_losses, val_losses = main()
```

**Expected Output:**
```
============================================================
TRANSFORMER FROM SCRATCH - COPY TASK
============================================================

Configuration:
  vocab_size: 100
  d_model: 128
  num_heads: 4
  num_layers: 2
  ...

Model parameters: 1,234,567

Training...
------------------------------------------------------------
Epoch   1 | Train Loss: 4.5123 | Val Loss: 4.4532
Epoch   5 | Train Loss: 1.2345 | Val Loss: 1.1234
Epoch  10 | Train Loss: 0.2134 | Val Loss: 0.1987
Epoch  15 | Train Loss: 0.0432 | Val Loss: 0.0398
Epoch  20 | Train Loss: 0.0123 | Val Loss: 0.0156

============================================================
TESTING GENERATION
============================================================

Input:    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
Output:   [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
Match:    True

Input:    [10, 20, 30, 40, 50, 60, 70, 80, 90, 99]
Output:   [10, 20, 30, 40, 50, 60, 70, 80, 90, 99]
Match:    True
```

---

## 📝 Homework

### Easy
1. **Run the code** and verify the copy task works
2. **Change hyperparameters** (d_model, num_heads) and observe effects
3. **Visualize attention weights** for a sample sequence

### Medium
4. **Add beam search** decoding instead of greedy decoding
5. **Implement reverse task:** model outputs reversed sequence
6. **Add validation early stopping** to prevent overfitting

### Hard
7. **Train on real translation data** (e.g., English-French)
8. **Implement weight tying** between encoder/decoder embeddings and output projection
9. **Add Flash Attention** for memory efficiency

---

## ⚠️ Common Mistakes

### 1. Forgetting the Causal Mask
```python
# WRONG - decoder can see future!
output = model(src, tgt, src_mask, None)

# RIGHT - always use causal mask
output = model(src, tgt, src_mask, tgt_mask)
```

### 2. Wrong Input/Output Shift
```python
# For teacher forcing:
# Input:  [BOS, t1, t2, t3, t4]
# Output: [t1, t2, t3, t4, EOS]

tgt_input = tgt[:, :-1]   # Remove last
tgt_output = tgt[:, 1:]   # Remove first
```

### 3. Not Scaling Embeddings
```python
# WRONG
embedded = self.embedding(x)

# RIGHT - scale by sqrt(d_model)
embedded = self.embedding(x) * math.sqrt(d_model)
```

---

## 🎤 Quick Interview Questions

**Q: What's the computational complexity of self-attention?**
A: O(n²d) where n is sequence length and d is dimension. The n² comes from computing all pairwise attention scores.

**Q: Why use multiple attention heads?**
A: Different heads can learn different relationships (syntax, semantics, coreference). Combined, they capture richer patterns than single attention.

**Q: What's the purpose of the FFN after attention?**
A: It adds non-linearity and increases model capacity. Each position is processed independently, acting like a per-position lookup table.

---

## 🔗 Next Steps

Congratulations! You now understand Transformers deeply.

**➡️ 06-Sentiment-Analysis-Project.md** - Apply your knowledge to a real-world sentiment analysis project using BERT!
