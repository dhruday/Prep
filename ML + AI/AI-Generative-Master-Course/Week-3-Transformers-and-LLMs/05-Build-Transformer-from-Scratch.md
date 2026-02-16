# 📘 Build Transformer from Scratch - Complete Implementation Guide

## 🎯 Beginner Friendly Explanation

### Why Build from Scratch?

Building a Transformer from scratch is like learning to drive a manual car before using automatic:
- You understand what's happening "under the hood"
- You can debug problems better
- You can customize and optimize
- You truly OWN the knowledge

**What we'll build:**
```
A complete encoder-decoder Transformer for:
- Machine Translation (English → French)
- With attention visualization
- Training loop included
- Inference/Generation code
```

### The Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUILDING BLOCKS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Embedding Layer            ← Convert tokens to vectors      │
│  2. Positional Encoding        ← Add position information       │
│  3. Multi-Head Attention       ← The heart of Transformer      │
│  4. Feed-Forward Network       ← Process each position          │
│  5. Encoder Layer              ← Combine attention + FFN        │
│  6. Decoder Layer              ← Add cross-attention            │
│  7. Full Transformer           ← Stack everything together      │
│  8. Training Loop              ← Make it learn                  │
│  9. Inference                  ← Generate translations          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 Complete Implementation

### Setup and Imports

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import math
import numpy as np
import matplotlib.pyplot as plt
from collections import Counter
import time

# Set random seed for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")
```

---

## 📦 Part 1: Token Embeddings

```python
class TokenEmbedding(nn.Module):
    """
    Convert token indices to dense vectors.
    
    Each token in vocabulary gets a learnable vector representation.
    
    Example:
        vocab_size = 10000 (10K unique tokens)
        d_model = 512 (each token becomes 512-dim vector)
        
        "hello" (idx=42) → [0.23, -0.45, 0.87, ..., 0.12] (512 values)
    """
    
    def __init__(self, vocab_size: int, d_model: int):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.d_model = d_model
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Token indices, shape (batch_size, seq_len)
        Returns:
            Embeddings, shape (batch_size, seq_len, d_model)
        """
        # Scale embeddings by sqrt(d_model) as per original paper
        # This helps with residual connections and training stability
        return self.embedding(x) * math.sqrt(self.d_model)


# Test
print("=" * 50)
print("Testing TokenEmbedding")
print("=" * 50)

vocab_size = 10000
d_model = 512
embedding = TokenEmbedding(vocab_size, d_model)

# Batch of 2 sentences, each 10 tokens
x = torch.randint(0, vocab_size, (2, 10))
output = embedding(x)

print(f"Input shape: {x.shape}")
print(f"Output shape: {output.shape}")
print(f"Expected: (2, 10, 512)")
```

---

## 📦 Part 2: Positional Encoding

```python
class PositionalEncoding(nn.Module):
    """
    Add position information to embeddings.
    
    Since Transformers process all positions in parallel (no recurrence),
    we need to explicitly add position information.
    
    Uses sinusoidal functions:
    - PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
    - PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
    
    Why sine/cosine?
    - Unique encoding for each position
    - Bounded values (-1 to 1)
    - Can extrapolate to longer sequences
    - Relative positions are linear transformations
    """
    
    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        # Create positional encoding matrix
        pe = torch.zeros(max_len, d_model)
        
        # Position indices (0, 1, 2, ..., max_len-1)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        
        # Division term: 10000^(2i/d_model)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        
        # Apply sin to even indices, cos to odd indices
        pe[:, 0::2] = torch.sin(position * div_term)  # Even dimensions
        pe[:, 1::2] = torch.cos(position * div_term)  # Odd dimensions
        
        # Add batch dimension: (1, max_len, d_model)
        pe = pe.unsqueeze(0)
        
        # Register as buffer (not a parameter, but should be saved/loaded)
        self.register_buffer('pe', pe)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Embeddings, shape (batch_size, seq_len, d_model)
        Returns:
            Embeddings + positional encoding, same shape
        """
        # Add positional encoding (broadcasts across batch)
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


# Test
print("\n" + "=" * 50)
print("Testing PositionalEncoding")
print("=" * 50)

pos_encoder = PositionalEncoding(d_model=512, max_len=1000)

# Visualize positional encoding
def visualize_positional_encoding(pe_module, d_model=512, positions=100):
    """Visualize the positional encoding patterns"""
    pe = pe_module.pe[0, :positions, :].detach().numpy()
    
    plt.figure(figsize=(12, 6))
    
    # Heatmap
    plt.subplot(1, 2, 1)
    plt.imshow(pe, cmap='RdBu', aspect='auto')
    plt.xlabel('Embedding Dimension')
    plt.ylabel('Position')
    plt.title('Positional Encoding Heatmap')
    plt.colorbar()
    
    # Line plot for specific dimensions
    plt.subplot(1, 2, 2)
    for dim in [0, 1, 10, 11, 50, 51]:
        plt.plot(pe[:, dim], label=f'dim {dim}')
    plt.xlabel('Position')
    plt.ylabel('Value')
    plt.title('Positional Encoding by Dimension')
    plt.legend()
    
    plt.tight_layout()
    plt.savefig('positional_encoding.png', dpi=150)
    plt.close()
    print("Saved positional_encoding.png")

# Uncomment to visualize:
# visualize_positional_encoding(pos_encoder)

x = torch.randn(2, 10, 512)  # Batch of 2, seq_len 10
output = pos_encoder(x)
print(f"Input shape: {x.shape}")
print(f"Output shape: {output.shape}")
```

---

## 📦 Part 3: Scaled Dot-Product Attention

```python
def scaled_dot_product_attention(
    query: torch.Tensor,
    key: torch.Tensor,
    value: torch.Tensor,
    mask: torch.Tensor = None,
    dropout: nn.Dropout = None
) -> tuple:
    """
    Compute Scaled Dot-Product Attention.
    
    Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V
    
    Args:
        query: (batch, heads, seq_len, d_k)
        key: (batch, heads, seq_len, d_k)
        value: (batch, heads, seq_len, d_v)
        mask: Optional mask (0 = attend, -inf = don't attend)
        dropout: Optional dropout layer
    
    Returns:
        output: (batch, heads, seq_len, d_v)
        attention_weights: (batch, heads, seq_len, seq_len)
    """
    d_k = query.size(-1)
    
    # Step 1: Compute attention scores
    # (batch, heads, seq_len, d_k) @ (batch, heads, d_k, seq_len)
    # = (batch, heads, seq_len, seq_len)
    scores = torch.matmul(query, key.transpose(-2, -1))
    
    # Step 2: Scale by sqrt(d_k)
    # Prevents softmax from becoming too peaked for large d_k
    scores = scores / math.sqrt(d_k)
    
    # Step 3: Apply mask (if provided)
    # Set masked positions to -infinity so softmax gives 0
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))
    
    # Step 4: Apply softmax to get attention weights
    # Each row sums to 1.0
    attention_weights = F.softmax(scores, dim=-1)
    
    # Step 5: Apply dropout (if provided)
    if dropout is not None:
        attention_weights = dropout(attention_weights)
    
    # Step 6: Multiply by values
    # (batch, heads, seq_len, seq_len) @ (batch, heads, seq_len, d_v)
    # = (batch, heads, seq_len, d_v)
    output = torch.matmul(attention_weights, value)
    
    return output, attention_weights


# Test
print("\n" + "=" * 50)
print("Testing Scaled Dot-Product Attention")
print("=" * 50)

batch_size, num_heads, seq_len, d_k = 2, 8, 10, 64
Q = torch.randn(batch_size, num_heads, seq_len, d_k)
K = torch.randn(batch_size, num_heads, seq_len, d_k)
V = torch.randn(batch_size, num_heads, seq_len, d_k)

output, attn_weights = scaled_dot_product_attention(Q, K, V)

print(f"Q, K, V shape: {Q.shape}")
print(f"Output shape: {output.shape}")
print(f"Attention weights shape: {attn_weights.shape}")
print(f"Attention weights sum (should be 1.0): {attn_weights[0, 0, 0].sum().item():.4f}")
```

---

## 📦 Part 4: Multi-Head Attention

```python
class MultiHeadAttention(nn.Module):
    """
    Multi-Head Attention mechanism.
    
    Instead of one attention function:
    - Split Q, K, V into multiple heads
    - Apply attention in parallel
    - Concatenate results
    
    This allows attending to information from different representation subspaces.
    
    Example with d_model=512, num_heads=8:
    - Each head has d_k = d_v = 512 / 8 = 64
    - 8 different attention patterns learned in parallel
    """
    
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads  # Dimension per head
        
        # Linear projections for Q, K, V
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        
        # Output projection
        self.W_o = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        
        # Store attention weights for visualization
        self.attention_weights = None
    
    def split_heads(self, x: torch.Tensor, batch_size: int) -> torch.Tensor:
        """
        Split the last dimension into (num_heads, d_k).
        Then transpose for attention computation.
        
        Input:  (batch, seq_len, d_model)
        Output: (batch, num_heads, seq_len, d_k)
        """
        x = x.view(batch_size, -1, self.num_heads, self.d_k)
        return x.transpose(1, 2)
    
    def combine_heads(self, x: torch.Tensor, batch_size: int) -> torch.Tensor:
        """
        Reverse of split_heads.
        
        Input:  (batch, num_heads, seq_len, d_k)
        Output: (batch, seq_len, d_model)
        """
        x = x.transpose(1, 2).contiguous()
        return x.view(batch_size, -1, self.d_model)
    
    def forward(
        self,
        query: torch.Tensor,
        key: torch.Tensor,
        value: torch.Tensor,
        mask: torch.Tensor = None
    ) -> torch.Tensor:
        """
        Args:
            query: (batch, seq_len, d_model)
            key: (batch, seq_len, d_model)
            value: (batch, seq_len, d_model)
            mask: Optional attention mask
        
        Returns:
            output: (batch, seq_len, d_model)
        """
        batch_size = query.size(0)
        
        # Step 1: Linear projections
        Q = self.W_q(query)  # (batch, seq_len, d_model)
        K = self.W_k(key)
        V = self.W_v(value)
        
        # Step 2: Split into multiple heads
        Q = self.split_heads(Q, batch_size)  # (batch, num_heads, seq_len, d_k)
        K = self.split_heads(K, batch_size)
        V = self.split_heads(V, batch_size)
        
        # Step 3: Apply scaled dot-product attention
        attn_output, self.attention_weights = scaled_dot_product_attention(
            Q, K, V, mask, self.dropout
        )
        
        # Step 4: Concatenate heads
        attn_output = self.combine_heads(attn_output, batch_size)
        
        # Step 5: Final linear projection
        output = self.W_o(attn_output)
        
        return output


# Test
print("\n" + "=" * 50)
print("Testing Multi-Head Attention")
print("=" * 50)

mha = MultiHeadAttention(d_model=512, num_heads=8)

x = torch.randn(2, 10, 512)  # (batch, seq_len, d_model)
output = mha(x, x, x)  # Self-attention (Q=K=V)

print(f"Input shape: {x.shape}")
print(f"Output shape: {output.shape}")
print(f"Attention weights shape: {mha.attention_weights.shape}")
```

---

## 📦 Part 5: Position-wise Feed-Forward Network

```python
class PositionwiseFeedForward(nn.Module):
    """
    Position-wise Feed-Forward Network.
    
    FFN(x) = max(0, xW₁ + b₁)W₂ + b₂
    
    Or with GELU (modern):
    FFN(x) = GELU(xW₁ + b₁)W₂ + b₂
    
    Applied to each position independently and identically.
    Think of it as a 1x1 convolution - processes each position with same weights.
    
    Typical dimensions:
    - d_model = 512
    - d_ff = 2048 (4x expansion, then compression)
    """
    
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
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
        # Expand: d_model → d_ff
        x = self.linear1(x)
        
        # Activation (GELU is smoother than ReLU)
        x = F.gelu(x)
        
        # Dropout
        x = self.dropout(x)
        
        # Compress: d_ff → d_model
        x = self.linear2(x)
        
        return x


# Test
print("\n" + "=" * 50)
print("Testing Position-wise Feed-Forward")
print("=" * 50)

ffn = PositionwiseFeedForward(d_model=512, d_ff=2048)
x = torch.randn(2, 10, 512)
output = ffn(x)

print(f"Input shape: {x.shape}")
print(f"Output shape: {output.shape}")
```

---

## 📦 Part 6: Encoder Layer

```python
class EncoderLayer(nn.Module):
    """
    Single Transformer Encoder Layer.
    
    Components:
    1. Multi-Head Self-Attention
    2. Add & Norm (residual connection + layer norm)
    3. Position-wise Feed-Forward
    4. Add & Norm
    
    Architecture:
    
    Input
      │
      ├───────────────────────┐
      │                       │
      ▼                       │
    Multi-Head                │ Residual
    Self-Attention            │ Connection
      │                       │
      ▼                       │
    Dropout                   │
      │                       │
      └──────── + ←───────────┘
               │
               ▼
           LayerNorm
               │
               ├───────────────────────┐
               │                       │
               ▼                       │
           Feed-Forward               │ Residual
               │                       │ Connection
               ▼                       │
            Dropout                   │
               │                       │
               └──────── + ←───────────┘
                        │
                        ▼
                    LayerNorm
                        │
                        ▼
                     Output
    """
    
    def __init__(
        self,
        d_model: int,
        num_heads: int,
        d_ff: int,
        dropout: float = 0.1
    ):
        super().__init__()
        
        # Multi-Head Self-Attention
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        
        # Feed-Forward Network
        self.feed_forward = PositionwiseFeedForward(d_model, d_ff, dropout)
        
        # Layer Normalization
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        # Dropout
        self.dropout = nn.Dropout(dropout)
    
    def forward(
        self,
        x: torch.Tensor,
        src_mask: torch.Tensor = None
    ) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
            src_mask: Optional source mask for padding
        
        Returns:
            output: (batch, seq_len, d_model)
        """
        # Self-Attention with residual connection
        attn_output = self.self_attention(x, x, x, src_mask)
        x = self.norm1(x + self.dropout(attn_output))
        
        # Feed-Forward with residual connection
        ff_output = self.feed_forward(x)
        x = self.norm2(x + self.dropout(ff_output))
        
        return x


# Test
print("\n" + "=" * 50)
print("Testing Encoder Layer")
print("=" * 50)

encoder_layer = EncoderLayer(d_model=512, num_heads=8, d_ff=2048)
x = torch.randn(2, 10, 512)
output = encoder_layer(x)

print(f"Input shape: {x.shape}")
print(f"Output shape: {output.shape}")
```

---

## 📦 Part 7: Decoder Layer

```python
class DecoderLayer(nn.Module):
    """
    Single Transformer Decoder Layer.
    
    Components:
    1. Masked Multi-Head Self-Attention (causal - can't see future)
    2. Add & Norm
    3. Multi-Head Cross-Attention (attends to encoder output)
    4. Add & Norm
    5. Position-wise Feed-Forward
    6. Add & Norm
    
    Key difference from Encoder:
    - Self-attention is MASKED (causal)
    - Has additional CROSS-ATTENTION to encoder
    """
    
    def __init__(
        self,
        d_model: int,
        num_heads: int,
        d_ff: int,
        dropout: float = 0.1
    ):
        super().__init__()
        
        # Masked Self-Attention (for decoder input)
        self.self_attention = MultiHeadAttention(d_model, num_heads, dropout)
        
        # Cross-Attention (decoder attends to encoder)
        self.cross_attention = MultiHeadAttention(d_model, num_heads, dropout)
        
        # Feed-Forward Network
        self.feed_forward = PositionwiseFeedForward(d_model, d_ff, dropout)
        
        # Layer Normalization
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.norm3 = nn.LayerNorm(d_model)
        
        # Dropout
        self.dropout = nn.Dropout(dropout)
    
    def forward(
        self,
        x: torch.Tensor,
        encoder_output: torch.Tensor,
        src_mask: torch.Tensor = None,
        tgt_mask: torch.Tensor = None
    ) -> torch.Tensor:
        """
        Args:
            x: Decoder input (batch, tgt_seq_len, d_model)
            encoder_output: From encoder (batch, src_seq_len, d_model)
            src_mask: Mask for encoder output (padding)
            tgt_mask: Mask for decoder input (causal + padding)
        
        Returns:
            output: (batch, tgt_seq_len, d_model)
        """
        # Masked Self-Attention
        # Q=K=V=x, can only attend to previous positions
        self_attn_output = self.self_attention(x, x, x, tgt_mask)
        x = self.norm1(x + self.dropout(self_attn_output))
        
        # Cross-Attention
        # Q=x (decoder), K=V=encoder_output
        cross_attn_output = self.cross_attention(
            x, encoder_output, encoder_output, src_mask
        )
        x = self.norm2(x + self.dropout(cross_attn_output))
        
        # Feed-Forward
        ff_output = self.feed_forward(x)
        x = self.norm3(x + self.dropout(ff_output))
        
        return x


# Test
print("\n" + "=" * 50)
print("Testing Decoder Layer")
print("=" * 50)

decoder_layer = DecoderLayer(d_model=512, num_heads=8, d_ff=2048)
decoder_input = torch.randn(2, 8, 512)  # Target sequence
encoder_output = torch.randn(2, 10, 512)  # Source sequence

output = decoder_layer(decoder_input, encoder_output)
print(f"Decoder input shape: {decoder_input.shape}")
print(f"Encoder output shape: {encoder_output.shape}")
print(f"Output shape: {output.shape}")
```

---

## 📦 Part 8: Complete Transformer

```python
class Transformer(nn.Module):
    """
    Complete Transformer Model for Sequence-to-Sequence tasks.
    
    Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                         TRANSFORMER                             │
    │                                                                 │
    │  Source Tokens                      Target Tokens               │
    │       ↓                                  ↓                      │
    │  [Embedding]                        [Embedding]                 │
    │       ↓                                  ↓                      │
    │  [Positional Encoding]              [Positional Encoding]       │
    │       ↓                                  ↓                      │
    │  ┌─────────────┐                    ┌─────────────┐             │
    │  │   Encoder   │                    │   Decoder   │             │
    │  │    × N      │ ──────────────────→│    × N      │             │
    │  └─────────────┘   Cross-Attention  └─────────────┘             │
    │                                          ↓                      │
    │                                    [Linear + Softmax]           │
    │                                          ↓                      │
    │                                   Output Probabilities          │
    └─────────────────────────────────────────────────────────────────┘
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
        
        self.d_model = d_model
        
        # Embeddings
        self.src_embedding = TokenEmbedding(src_vocab_size, d_model)
        self.tgt_embedding = TokenEmbedding(tgt_vocab_size, d_model)
        
        # Positional Encoding (shared)
        self.positional_encoding = PositionalEncoding(d_model, max_seq_len, dropout)
        
        # Encoder
        self.encoder_layers = nn.ModuleList([
            EncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_encoder_layers)
        ])
        
        # Decoder
        self.decoder_layers = nn.ModuleList([
            DecoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_decoder_layers)
        ])
        
        # Output Projection
        self.output_projection = nn.Linear(d_model, tgt_vocab_size)
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize parameters with Xavier uniform"""
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)
    
    def make_src_mask(self, src: torch.Tensor, pad_idx: int = 0) -> torch.Tensor:
        """
        Create mask for source sequence (padding mask).
        
        Args:
            src: (batch, src_seq_len)
            pad_idx: Index of padding token
        
        Returns:
            mask: (batch, 1, 1, src_seq_len)
        """
        # True for non-padding tokens
        src_mask = (src != pad_idx).unsqueeze(1).unsqueeze(2)
        return src_mask
    
    def make_tgt_mask(self, tgt: torch.Tensor, pad_idx: int = 0) -> torch.Tensor:
        """
        Create mask for target sequence (causal + padding).
        
        Args:
            tgt: (batch, tgt_seq_len)
            pad_idx: Index of padding token
        
        Returns:
            mask: (batch, 1, tgt_seq_len, tgt_seq_len)
        """
        batch_size, tgt_len = tgt.shape
        
        # Padding mask: (batch, 1, 1, tgt_len)
        tgt_pad_mask = (tgt != pad_idx).unsqueeze(1).unsqueeze(2)
        
        # Causal mask: (1, 1, tgt_len, tgt_len)
        # Lower triangular matrix (can only attend to past and present)
        tgt_causal_mask = torch.tril(
            torch.ones(tgt_len, tgt_len, device=tgt.device)
        ).unsqueeze(0).unsqueeze(0)
        
        # Combine masks
        tgt_mask = tgt_pad_mask & tgt_causal_mask.bool()
        
        return tgt_mask
    
    def encode(
        self,
        src: torch.Tensor,
        src_mask: torch.Tensor = None
    ) -> torch.Tensor:
        """
        Encode source sequence.
        
        Args:
            src: Source tokens (batch, src_seq_len)
            src_mask: Source mask
        
        Returns:
            encoder_output: (batch, src_seq_len, d_model)
        """
        # Embed and add positional encoding
        x = self.src_embedding(src)
        x = self.positional_encoding(x)
        
        # Pass through encoder layers
        for layer in self.encoder_layers:
            x = layer(x, src_mask)
        
        return x
    
    def decode(
        self,
        tgt: torch.Tensor,
        encoder_output: torch.Tensor,
        src_mask: torch.Tensor = None,
        tgt_mask: torch.Tensor = None
    ) -> torch.Tensor:
        """
        Decode target sequence.
        
        Args:
            tgt: Target tokens (batch, tgt_seq_len)
            encoder_output: From encoder (batch, src_seq_len, d_model)
            src_mask: Source mask
            tgt_mask: Target mask (causal)
        
        Returns:
            decoder_output: (batch, tgt_seq_len, d_model)
        """
        # Embed and add positional encoding
        x = self.tgt_embedding(tgt)
        x = self.positional_encoding(x)
        
        # Pass through decoder layers
        for layer in self.decoder_layers:
            x = layer(x, encoder_output, src_mask, tgt_mask)
        
        return x
    
    def forward(
        self,
        src: torch.Tensor,
        tgt: torch.Tensor,
        src_mask: torch.Tensor = None,
        tgt_mask: torch.Tensor = None
    ) -> torch.Tensor:
        """
        Forward pass through the Transformer.
        
        Args:
            src: Source tokens (batch, src_seq_len)
            tgt: Target tokens (batch, tgt_seq_len)
            src_mask: Source padding mask
            tgt_mask: Target causal mask
        
        Returns:
            logits: (batch, tgt_seq_len, tgt_vocab_size)
        """
        # Create masks if not provided
        if src_mask is None:
            src_mask = self.make_src_mask(src)
        if tgt_mask is None:
            tgt_mask = self.make_tgt_mask(tgt)
        
        # Encode
        encoder_output = self.encode(src, src_mask)
        
        # Decode
        decoder_output = self.decode(tgt, encoder_output, src_mask, tgt_mask)
        
        # Project to vocabulary
        logits = self.output_projection(decoder_output)
        
        return logits


# Test
print("\n" + "=" * 50)
print("Testing Complete Transformer")
print("=" * 50)

# Configuration
src_vocab_size = 10000
tgt_vocab_size = 10000
d_model = 512
num_heads = 8
num_layers = 6
d_ff = 2048

# Create model
transformer = Transformer(
    src_vocab_size=src_vocab_size,
    tgt_vocab_size=tgt_vocab_size,
    d_model=d_model,
    num_heads=num_heads,
    num_encoder_layers=num_layers,
    num_decoder_layers=num_layers,
    d_ff=d_ff
)

# Count parameters
total_params = sum(p.numel() for p in transformer.parameters())
trainable_params = sum(p.numel() for p in transformer.parameters() if p.requires_grad)
print(f"Total parameters: {total_params:,}")
print(f"Trainable parameters: {trainable_params:,}")

# Test forward pass
src = torch.randint(0, src_vocab_size, (2, 20))  # Batch of 2, seq_len 20
tgt = torch.randint(0, tgt_vocab_size, (2, 15))  # Batch of 2, seq_len 15

output = transformer(src, tgt)
print(f"\nSource shape: {src.shape}")
print(f"Target shape: {tgt.shape}")
print(f"Output shape: {output.shape}")
print(f"Expected: (2, 15, {tgt_vocab_size})")
```

---

## 📦 Part 9: Training Setup

```python
# ============================================
# DATA PREPARATION
# ============================================

class TranslationDataset(Dataset):
    """Simple dataset for translation"""
    
    def __init__(self, src_sentences, tgt_sentences, src_vocab, tgt_vocab, max_len=50):
        self.src_sentences = src_sentences
        self.tgt_sentences = tgt_sentences
        self.src_vocab = src_vocab
        self.tgt_vocab = tgt_vocab
        self.max_len = max_len
    
    def __len__(self):
        return len(self.src_sentences)
    
    def __getitem__(self, idx):
        src = self.encode(self.src_sentences[idx], self.src_vocab)
        tgt = self.encode(self.tgt_sentences[idx], self.tgt_vocab, add_special=True)
        return torch.tensor(src), torch.tensor(tgt)
    
    def encode(self, sentence, vocab, add_special=False):
        tokens = sentence.lower().split()
        if add_special:
            tokens = ['<sos>'] + tokens + ['<eos>']
        
        indices = [vocab.get(t, vocab['<unk>']) for t in tokens]
        
        # Pad or truncate
        if len(indices) < self.max_len:
            indices += [vocab['<pad>']] * (self.max_len - len(indices))
        else:
            indices = indices[:self.max_len]
        
        return indices


def build_vocab(sentences, min_freq=1):
    """Build vocabulary from sentences"""
    counter = Counter()
    for sent in sentences:
        counter.update(sent.lower().split())
    
    vocab = {'<pad>': 0, '<unk>': 1, '<sos>': 2, '<eos>': 3}
    for word, count in counter.items():
        if count >= min_freq:
            vocab[word] = len(vocab)
    
    return vocab


# Sample data (English → French)
english_sentences = [
    "hello how are you",
    "i am fine thank you",
    "what is your name",
    "my name is john",
    "nice to meet you",
    "where are you from",
    "i am from america",
    "the weather is nice today",
    "i love learning languages",
    "this is a test sentence"
]

french_sentences = [
    "bonjour comment allez vous",
    "je vais bien merci",
    "quel est votre nom",
    "je m appelle john",
    "enchante de vous rencontrer",
    "d ou venez vous",
    "je viens d amerique",
    "le temps est beau aujourd hui",
    "j aime apprendre les langues",
    "c est une phrase de test"
]

# Build vocabularies
src_vocab = build_vocab(english_sentences)
tgt_vocab = build_vocab(french_sentences)

print(f"\nSource vocabulary size: {len(src_vocab)}")
print(f"Target vocabulary size: {len(tgt_vocab)}")

# Create inverse vocab for decoding
idx_to_tgt = {v: k for k, v in tgt_vocab.items()}


# ============================================
# TRAINING LOOP
# ============================================

def train_transformer(
    model,
    train_loader,
    optimizer,
    criterion,
    device,
    epochs=100,
    clip_grad=1.0
):
    """Train the Transformer model"""
    
    model.train()
    history = []
    
    for epoch in range(epochs):
        total_loss = 0
        
        for src, tgt in train_loader:
            src = src.to(device)
            tgt = tgt.to(device)
            
            # Prepare decoder input (shift right, remove last token)
            # Teacher forcing: use ground truth as decoder input
            tgt_input = tgt[:, :-1]
            tgt_output = tgt[:, 1:]  # Target for loss (shifted)
            
            # Forward pass
            optimizer.zero_grad()
            logits = model(src, tgt_input)
            
            # Calculate loss
            # Reshape for cross entropy: (batch * seq_len, vocab_size)
            logits = logits.reshape(-1, logits.size(-1))
            tgt_output = tgt_output.reshape(-1)
            
            loss = criterion(logits, tgt_output)
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), clip_grad)
            
            optimizer.step()
            
            total_loss += loss.item()
        
        avg_loss = total_loss / len(train_loader)
        history.append(avg_loss)
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs}, Loss: {avg_loss:.4f}")
    
    return history


# ============================================
# INFERENCE (GREEDY DECODING)
# ============================================

def translate(model, src_sentence, src_vocab, tgt_vocab, idx_to_tgt, max_len=50, device='cpu'):
    """Translate a source sentence"""
    model.eval()
    
    # Encode source sentence
    tokens = src_sentence.lower().split()
    src_indices = [src_vocab.get(t, src_vocab['<unk>']) for t in tokens]
    src_tensor = torch.tensor(src_indices).unsqueeze(0).to(device)
    
    # Create source mask
    src_mask = model.make_src_mask(src_tensor)
    
    # Encode source
    with torch.no_grad():
        encoder_output = model.encode(src_tensor, src_mask)
    
    # Start with <sos> token
    tgt_indices = [tgt_vocab['<sos>']]
    
    for _ in range(max_len):
        tgt_tensor = torch.tensor(tgt_indices).unsqueeze(0).to(device)
        tgt_mask = model.make_tgt_mask(tgt_tensor)
        
        with torch.no_grad():
            decoder_output = model.decode(tgt_tensor, encoder_output, src_mask, tgt_mask)
            logits = model.output_projection(decoder_output)
        
        # Get next token (greedy)
        next_token = logits[0, -1, :].argmax().item()
        
        # Stop if <eos>
        if next_token == tgt_vocab['<eos>']:
            break
        
        tgt_indices.append(next_token)
    
    # Decode to words
    translation = ' '.join([idx_to_tgt[idx] for idx in tgt_indices[1:]])  # Skip <sos>
    
    return translation


# ============================================
# RUN TRAINING
# ============================================

print("\n" + "=" * 50)
print("Training Transformer")
print("=" * 50)

# Create dataset and dataloader
dataset = TranslationDataset(
    english_sentences, french_sentences,
    src_vocab, tgt_vocab, max_len=20
)
train_loader = DataLoader(dataset, batch_size=4, shuffle=True)

# Create smaller model for demo
small_transformer = Transformer(
    src_vocab_size=len(src_vocab),
    tgt_vocab_size=len(tgt_vocab),
    d_model=128,
    num_heads=4,
    num_encoder_layers=2,
    num_decoder_layers=2,
    d_ff=256,
    dropout=0.1
).to(device)

# Optimizer and loss
optimizer = optim.Adam(small_transformer.parameters(), lr=0.001, betas=(0.9, 0.98), eps=1e-9)
criterion = nn.CrossEntropyLoss(ignore_index=tgt_vocab['<pad>'])

# Train
history = train_transformer(
    small_transformer,
    train_loader,
    optimizer,
    criterion,
    device,
    epochs=100
)

# ============================================
# TEST TRANSLATION
# ============================================

print("\n" + "=" * 50)
print("Testing Translation")
print("=" * 50)

test_sentences = [
    "hello how are you",
    "what is your name",
    "i am fine thank you"
]

for sent in test_sentences:
    translation = translate(
        small_transformer, sent,
        src_vocab, tgt_vocab, idx_to_tgt,
        device=device
    )
    print(f"English: {sent}")
    print(f"French:  {translation}")
    print()
```

---

## 📝 Homework

### Easy:
1. **Modify:** Change the number of attention heads and observe effects
2. **Visualize:** Plot attention weights for a sample translation
3. **Experiment:** Try different learning rates and observe convergence

### Intermediate:
4. **Implement:** Add beam search for better translations
5. **Add:** Learning rate warmup scheduler
6. **Build:** Label smoothing for regularization

### Advanced:
7. **Implement:** Relative positional encoding
8. **Create:** Multi-task Transformer (translation + summarization)
9. **Optimize:** Add KV-caching for faster inference

---

## ⚠️ Common Mistakes

### 1. **Wrong Mask Shape**
```python
# ❌ Wrong
mask = torch.ones(seq_len)

# ✅ Correct - needs proper broadcasting
mask = torch.ones(1, 1, seq_len, seq_len)
```

### 2. **Forgetting Teacher Forcing Shift**
```python
# ❌ Wrong - predicting same token as input
loss = criterion(model(src, tgt), tgt)

# ✅ Correct - shift target by one
tgt_input = tgt[:, :-1]  # Input: <sos> w1 w2 w3
tgt_output = tgt[:, 1:]  # Target: w1 w2 w3 <eos>
loss = criterion(model(src, tgt_input), tgt_output)
```

### 3. **Not Scaling Embeddings**
```python
# ❌ Wrong
x = self.embedding(tokens)

# ✅ Correct (as per original paper)
x = self.embedding(tokens) * math.sqrt(d_model)
```

### 4. **Causal Mask During Training Only**
```python
# Remember: Causal mask needed during BOTH training and inference
tgt_mask = torch.tril(torch.ones(seq_len, seq_len))
```

---

## 🎤 Interview Questions

**Q1: Walk me through the forward pass of a Transformer.**

**A:** 
1. Source tokens → Embedding → Positional Encoding → Encoder stack → Encoder output
2. Target tokens → Embedding → Positional Encoding → Decoder stack (with cross-attention to encoder) → Output projection → Logits

**Q2: Why is the Feed-Forward network important?**

**A:** Attention is a weighted average (linear operation). FFN adds non-linearity and acts as a "memory bank" that processes each position independently.

**Q3: How do you handle variable-length sequences?**

**A:** Pad to max length, create attention masks to ignore padding tokens.

---

## 🚀 Next Steps

Congratulations! You've built a Transformer from scratch. Next:
1. **Sentiment Analysis Project** - Apply to real task
2. **Fine-tuning Techniques** - LoRA, adapters
3. **Advanced Architectures** - GPT-style decoder-only

**Key Takeaway:** Building from scratch gives you deep understanding. Now you can debug, optimize, and customize any Transformer-based model!
