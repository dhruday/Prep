# 📘 Transformers Architecture - The Model That Changed Everything

## 🎯 Beginner Friendly Explanation

### The Revolution

In 2017, Google published a paper titled **"Attention Is All You Need"** that changed AI forever.

**The Big Idea:** What if we removed RNNs/LSTMs entirely and used ONLY attention?

**Result:** Transformers - faster, more parallelizable, and better at understanding language.

### Simple Analogy

**LSTM** = Reading a book one word at a time, trying to remember everything
**Transformer** = Seeing the entire page at once, connecting any word to any other word instantly

```
LSTM:
"The" → "cat" → "sat" → "on" → "the" → "mat"
  ↓       ↓       ↓       ↓       ↓       ↓
  Sequential processing (slow, forgets)

Transformer:
["The", "cat", "sat", "on", "the", "mat"]
    ↕      ↕      ↕      ↕      ↕      ↕
    All words see each other simultaneously!
```

### Why Transformers Win

1. **Parallel Processing:** Process all words at once (GPUs love this!)
2. **No Vanishing Gradient:** Direct connections between all positions
3. **Captures Long-Range Dependencies:** Word 1 can directly attend to word 1000
4. **Scalable:** Adding more layers and parameters works well

---

## 🧠 Deep Technical Breakdown

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TRANSFORMER                             │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │     ENCODER      │         │     DECODER      │         │
│  │                  │         │                  │         │
│  │  Input: Source   │────────→│  Input: Target   │         │
│  │  "Hello world"   │ Context │  "<start> Bonjour"│        │
│  │                  │         │                  │         │
│  │  ┌────────────┐  │         │  ┌────────────┐  │         │
│  │  │ Self-Attn  │  │         │  │Masked Self │  │         │
│  │  └────────────┘  │         │  │  Attention │  │         │
│  │        ↓         │         │  └────────────┘  │         │
│  │  ┌────────────┐  │         │        ↓         │         │
│  │  │ Feed Fwd   │  │         │  ┌────────────┐  │         │
│  │  └────────────┘  │         │  │Cross-Attn  │←─┤         │
│  │                  │         │  └────────────┘  │         │
│  │     × N layers   │         │        ↓         │         │
│  └──────────────────┘         │  ┌────────────┐  │         │
│                               │  │ Feed Fwd   │  │         │
│                               │  └────────────┘  │         │
│                               │                  │         │
│                               │     × N layers   │         │
│                               └──────────────────┘         │
│                                       ↓                     │
│                               Output: "Bonjour monde"       │
└─────────────────────────────────────────────────────────────┘
```

### The Building Blocks

**Four Key Components:**
1. **Multi-Head Self-Attention**
2. **Position-wise Feed-Forward Network**
3. **Positional Encoding**
4. **Layer Normalization + Residual Connections**

---

## 📐 Mathematical Formulas

### 1. Scaled Dot-Product Attention

The core attention mechanism:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

**Where:**
- $Q$ = Query matrix (what am I looking for?)
- $K$ = Key matrix (what do I contain?)
- $V$ = Value matrix (what information do I have?)
- $d_k$ = dimension of keys (for scaling)

**Step by Step:**

```
1. Compute similarity: QK^T
   Result: (seq_len × seq_len) matrix of scores

2. Scale: divide by √d_k
   Prevents softmax saturation for large d_k

3. Softmax: convert to probabilities
   Each row sums to 1

4. Multiply by V: get weighted values
   Final output same shape as input
```

### 2. Multi-Head Attention

Run attention multiple times in parallel:

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h)W^O$$

Where each head:
$$\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

**Dimensions:**
```
Input: d_model = 512
Heads: h = 8
Per head: d_k = d_v = d_model / h = 64

Each head projects to 64 dimensions
8 heads × 64 = 512 (original dimension restored)
```

**Why Multiple Heads?**
```
Head 1: "Subject-verb agreement"
        "The cat... meows" (cat → meows)

Head 2: "Adjective-noun relationship"
        "The fluffy cat" (fluffy → cat)

Head 3: "Positional patterns"
        "not good" (negation pattern)

... each head learns different relationships!
```

### 3. Position-wise Feed-Forward Network

Two linear layers with ReLU:

$$\text{FFN}(x) = \text{max}(0, xW_1 + b_1)W_2 + b_2$$

Or with GELU (modern):
$$\text{FFN}(x) = \text{GELU}(xW_1 + b_1)W_2 + b_2$$

**Dimensions:**
```
Input:  d_model = 512
Hidden: d_ff = 2048 (4× expansion)
Output: d_model = 512

FFN acts like a "memory bank" that stores patterns
```

### 4. Positional Encoding

Since Transformers have no recurrence, we add position information:

$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$

$$PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$

**Where:**
- $pos$ = position in sequence (0, 1, 2, ...)
- $i$ = dimension index
- $d_{model}$ = model dimension

**Why Sine/Cosine?**
```
1. Unique encoding for each position
2. Can extrapolate to longer sequences
3. Relative positions are linear transformations
   PE(pos+k) can be expressed as linear function of PE(pos)
```

### 5. Layer Normalization

Normalize across features:

$$\text{LayerNorm}(x) = \gamma \cdot \frac{x - \mu}{\sqrt{\sigma^2 + \epsilon}} + \beta$$

**Where:**
- $\mu$ = mean across features
- $\sigma^2$ = variance across features
- $\gamma, \beta$ = learnable parameters

### 6. Residual Connections

Skip connections around each sub-layer:

$$\text{output} = \text{LayerNorm}(x + \text{Sublayer}(x))$$

**Benefits:**
- Helps gradient flow
- Allows deeper networks
- Makes training more stable

---

## 🎨 Visual Mental Model

### Complete Encoder Layer

```
                    Input (batch, seq_len, d_model)
                              │
                              ↓
         ┌────────────────────┴────────────────────┐
         │                                          │
         ↓                                          │
  ┌──────────────┐                                 │
  │  Multi-Head  │                                 │
  │  Self-Attn   │                                 │ Residual
  └──────────────┘                                 │ Connection
         │                                          │
         ↓                                          │
    Add & Norm  ←──────────────────────────────────┘
         │
         ↓
         ┌────────────────────┴────────────────────┐
         │                                          │
         ↓                                          │
  ┌──────────────┐                                 │
  │  Feed-Forward │                                │ Residual
  │   Network     │                                │ Connection
  └──────────────┘                                 │
         │                                          │
         ↓                                          │
    Add & Norm  ←──────────────────────────────────┘
         │
         ↓
                    Output (batch, seq_len, d_model)
```

### Decoder Layer (Additional Cross-Attention)

```
         Target Input
              │
              ↓
       ┌──────────────┐
       │ Masked Self  │←── Can only see previous tokens
       │  Attention   │
       └──────────────┘
              │
         Add & Norm
              │
              ↓
       ┌──────────────┐
       │   Cross      │←── Query from decoder
       │  Attention   │←── Key, Value from encoder
       └──────────────┘
              │
         Add & Norm
              │
              ↓
       ┌──────────────┐
       │ Feed-Forward │
       └──────────────┘
              │
         Add & Norm
              │
              ↓
         Decoder Output
```

### Self-Attention Visualization

```
Input: "The cat sat on the mat"

            The   cat   sat   on   the   mat
         ┌─────────────────────────────────────┐
The      │ 0.3   0.2   0.1  0.1   0.2   0.1   │
cat      │ 0.1   0.4   0.2  0.1   0.1   0.1   │
sat      │ 0.1   0.3   0.3  0.1   0.1   0.1   │ ← Attention Matrix
on       │ 0.1   0.1   0.2  0.3   0.2   0.1   │
the      │ 0.1   0.1   0.1  0.2   0.3   0.2   │
mat      │ 0.1   0.2   0.2  0.2   0.1   0.2   │
         └─────────────────────────────────────┘

Each row sums to 1.0
Each row = how much each word attends to other words
```

---

## 🌍 Real World Use Cases

### 1. **Machine Translation (Original Use)**
```
Encoder: "How are you?" → [contextual representations]
                              ↓ (cross-attention)
Decoder: "<start>" → "Comment" → "allez" → "-vous" → "?"
```

### 2. **Text Generation (GPT)**
```
Decoder-only architecture
Input:  "Once upon a time"
Output: "Once upon a time, in a faraway kingdom..."
```

### 3. **Text Understanding (BERT)**
```
Encoder-only architecture
Input:  "The bank by the river was muddy"
Output: Contextual embeddings where "bank" = riverbank (not financial)
```

### 4. **Code Generation (Codex, Copilot)**
```
Input:  "def fibonacci(n):"
Output: Complete function implementation
```

### 5. **Image Recognition (Vision Transformer)**
```
Split image into patches
Treat patches like words
Self-attention across patches
```

### 6. **Speech Recognition (Whisper)**
```
Audio spectrogram → Transformer → Text transcription
```

---

## 💻 Sample Mini Project: Transformer from Scratch

### Building Block by Block

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
import math

# ============================================
# 1. SCALED DOT-PRODUCT ATTENTION
# ============================================
def scaled_dot_product_attention(Q, K, V, mask=None):
    """
    Args:
        Q: (batch, heads, seq_len, d_k)
        K: (batch, heads, seq_len, d_k)
        V: (batch, heads, seq_len, d_v)
        mask: Optional mask for padding or causal attention
    Returns:
        output: (batch, heads, seq_len, d_v)
        attention_weights: (batch, heads, seq_len, seq_len)
    """
    d_k = Q.size(-1)
    
    # Step 1: QK^T / sqrt(d_k)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    # Shape: (batch, heads, seq_len, seq_len)
    
    # Step 2: Apply mask (if provided)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))
    
    # Step 3: Softmax
    attention_weights = F.softmax(scores, dim=-1)
    
    # Step 4: Multiply by V
    output = torch.matmul(attention_weights, V)
    
    return output, attention_weights


# ============================================
# 2. MULTI-HEAD ATTENTION
# ============================================
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        assert d_model % num_heads == 0, "d_model must be divisible by num_heads"
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        # Linear projections
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
    
    def split_heads(self, x, batch_size):
        """
        Split the last dimension into (num_heads, d_k)
        Input:  (batch, seq_len, d_model)
        Output: (batch, num_heads, seq_len, d_k)
        """
        x = x.view(batch_size, -1, self.num_heads, self.d_k)
        return x.transpose(1, 2)
    
    def forward(self, query, key, value, mask=None):
        batch_size = query.size(0)
        
        # Step 1: Linear projections
        Q = self.W_q(query)  # (batch, seq_len, d_model)
        K = self.W_k(key)
        V = self.W_v(value)
        
        # Step 2: Split into multiple heads
        Q = self.split_heads(Q, batch_size)  # (batch, heads, seq_len, d_k)
        K = self.split_heads(K, batch_size)
        V = self.split_heads(V, batch_size)
        
        # Step 3: Scaled dot-product attention
        attn_output, attn_weights = scaled_dot_product_attention(Q, K, V, mask)
        
        # Step 4: Concatenate heads
        # (batch, heads, seq_len, d_k) → (batch, seq_len, d_model)
        attn_output = attn_output.transpose(1, 2).contiguous()
        attn_output = attn_output.view(batch_size, -1, self.d_model)
        
        # Step 5: Final linear projection
        output = self.W_o(attn_output)
        
        return output, attn_weights


# ============================================
# 3. POSITION-WISE FEED-FORWARD NETWORK
# ============================================
class FeedForward(nn.Module):
    def __init__(self, d_model, d_ff, dropout=0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x):
        # x: (batch, seq_len, d_model)
        x = self.linear1(x)       # (batch, seq_len, d_ff)
        x = F.gelu(x)             # GELU activation
        x = self.dropout(x)
        x = self.linear2(x)       # (batch, seq_len, d_model)
        return x


# ============================================
# 4. POSITIONAL ENCODING
# ============================================
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000, dropout=0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)
        
        # Create positional encoding matrix
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        
        pe[:, 0::2] = torch.sin(position * div_term)  # Even indices
        pe[:, 1::2] = torch.cos(position * div_term)  # Odd indices
        
        pe = pe.unsqueeze(0)  # (1, max_len, d_model)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        # x: (batch, seq_len, d_model)
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


# ============================================
# 5. ENCODER LAYER
# ============================================
class EncoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        
        self.self_attention = MultiHeadAttention(d_model, num_heads)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x, mask=None):
        # Self-attention with residual connection
        attn_output, _ = self.self_attention(x, x, x, mask)
        x = self.norm1(x + self.dropout(attn_output))
        
        # Feed-forward with residual connection
        ff_output = self.feed_forward(x)
        x = self.norm2(x + self.dropout(ff_output))
        
        return x


# ============================================
# 6. DECODER LAYER
# ============================================
class DecoderLayer(nn.Module):
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        
        self.masked_self_attention = MultiHeadAttention(d_model, num_heads)
        self.cross_attention = MultiHeadAttention(d_model, num_heads)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.norm3 = nn.LayerNorm(d_model)
        
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x, encoder_output, src_mask=None, tgt_mask=None):
        # Masked self-attention (causal)
        attn_output, _ = self.masked_self_attention(x, x, x, tgt_mask)
        x = self.norm1(x + self.dropout(attn_output))
        
        # Cross-attention (attend to encoder)
        attn_output, _ = self.cross_attention(x, encoder_output, encoder_output, src_mask)
        x = self.norm2(x + self.dropout(attn_output))
        
        # Feed-forward
        ff_output = self.feed_forward(x)
        x = self.norm3(x + self.dropout(ff_output))
        
        return x


# ============================================
# 7. COMPLETE TRANSFORMER
# ============================================
class Transformer(nn.Module):
    def __init__(
        self,
        src_vocab_size,
        tgt_vocab_size,
        d_model=512,
        num_heads=8,
        num_encoder_layers=6,
        num_decoder_layers=6,
        d_ff=2048,
        max_len=5000,
        dropout=0.1
    ):
        super().__init__()
        
        # Embeddings
        self.src_embedding = nn.Embedding(src_vocab_size, d_model)
        self.tgt_embedding = nn.Embedding(tgt_vocab_size, d_model)
        
        # Positional encoding
        self.positional_encoding = PositionalEncoding(d_model, max_len, dropout)
        
        # Encoder layers
        self.encoder_layers = nn.ModuleList([
            EncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_encoder_layers)
        ])
        
        # Decoder layers
        self.decoder_layers = nn.ModuleList([
            DecoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_decoder_layers)
        ])
        
        # Output projection
        self.output_projection = nn.Linear(d_model, tgt_vocab_size)
        
        # Scale embeddings
        self.d_model = d_model
    
    def generate_causal_mask(self, size):
        """Generate causal (look-ahead) mask"""
        mask = torch.triu(torch.ones(size, size), diagonal=1).bool()
        return ~mask  # Invert: True = attend, False = don't attend
    
    def encode(self, src, src_mask=None):
        # Embed and add positional encoding
        x = self.src_embedding(src) * math.sqrt(self.d_model)
        x = self.positional_encoding(x)
        
        # Pass through encoder layers
        for layer in self.encoder_layers:
            x = layer(x, src_mask)
        
        return x
    
    def decode(self, tgt, encoder_output, src_mask=None, tgt_mask=None):
        # Embed and add positional encoding
        x = self.tgt_embedding(tgt) * math.sqrt(self.d_model)
        x = self.positional_encoding(x)
        
        # Pass through decoder layers
        for layer in self.decoder_layers:
            x = layer(x, encoder_output, src_mask, tgt_mask)
        
        return x
    
    def forward(self, src, tgt, src_mask=None, tgt_mask=None):
        # Generate causal mask for decoder if not provided
        if tgt_mask is None:
            tgt_mask = self.generate_causal_mask(tgt.size(1)).to(tgt.device)
        
        # Encode source
        encoder_output = self.encode(src, src_mask)
        
        # Decode target
        decoder_output = self.decode(tgt, encoder_output, src_mask, tgt_mask)
        
        # Project to vocabulary
        logits = self.output_projection(decoder_output)
        
        return logits


# ============================================
# 8. TEST THE MODEL
# ============================================
if __name__ == "__main__":
    # Hyperparameters
    src_vocab_size = 10000
    tgt_vocab_size = 10000
    d_model = 512
    num_heads = 8
    num_layers = 6
    d_ff = 2048
    
    # Create model
    model = Transformer(
        src_vocab_size=src_vocab_size,
        tgt_vocab_size=tgt_vocab_size,
        d_model=d_model,
        num_heads=num_heads,
        num_encoder_layers=num_layers,
        num_decoder_layers=num_layers,
        d_ff=d_ff
    )
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Total parameters: {total_params:,}")
    
    # Test forward pass
    batch_size = 4
    src_seq_len = 20
    tgt_seq_len = 15
    
    src = torch.randint(0, src_vocab_size, (batch_size, src_seq_len))
    tgt = torch.randint(0, tgt_vocab_size, (batch_size, tgt_seq_len))
    
    output = model(src, tgt)
    print(f"Input shape: src={src.shape}, tgt={tgt.shape}")
    print(f"Output shape: {output.shape}")
    # Expected: (4, 15, 10000) - probabilities over vocab for each position
```

---

## 📝 Homework

### Easy:
1. **Explain:** Why do we scale attention scores by √d_k?
2. **Code:** Implement positional encoding and visualize the patterns
3. **Experiment:** What happens if you remove positional encoding?

### Intermediate:
4. **Build:** Add dropout and layer normalization properly
5. **Analyze:** Visualize attention patterns for different layers
6. **Compare:** Train with 2, 4, 8 heads - what changes?

### Advanced:
7. **Implement:** Add label smoothing for better generalization
8. **Project:** Train a Transformer for simple arithmetic (e.g., "12+34" → "46")
9. **Research:** Implement Pre-LN Transformer (layer norm before instead of after)

---

## ⚠️ Common Mistakes

### 1. **Wrong Mask Dimensions**
```python
# ❌ Wrong - mask doesn't match attention dimensions
mask = torch.ones(seq_len)

# ✅ Correct - broadcast-compatible mask
mask = torch.ones(1, 1, seq_len, seq_len)  # (batch, heads, q_len, k_len)
```

### 2. **Forgetting to Scale Embeddings**
```python
# ❌ Wrong
x = self.embedding(input_ids)

# ✅ Correct (as per original paper)
x = self.embedding(input_ids) * math.sqrt(d_model)
```

### 3. **Not Using Causal Mask for Decoder**
```python
# ❌ Wrong - decoder can see future tokens!
output = self.decoder(tgt, memory)

# ✅ Correct - mask future positions
causal_mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
output = self.decoder(tgt, memory, tgt_mask=~causal_mask)
```

### 4. **Pre-LN vs Post-LN Confusion**
```python
# Post-LN (Original Transformer)
x = self.norm(x + self.sublayer(x))

# Pre-LN (More stable, often better)
x = x + self.sublayer(self.norm(x))
```

### 5. **Not Handling Padding Properly**
```python
# ❌ Wrong - attention includes padding
attn = attention(Q, K, V)

# ✅ Correct - mask out padding
padding_mask = (input_ids != PAD_TOKEN).unsqueeze(1).unsqueeze(2)
attn = attention(Q, K, V, mask=padding_mask)
```

---

## 🎤 Interview Questions + Answers

### Beginner Level:

**Q1: What are the main components of a Transformer?**

**A:**
1. **Multi-Head Self-Attention** - Allows each position to attend to all other positions
2. **Position-wise Feed-Forward Network** - Two linear layers with activation
3. **Positional Encoding** - Injects position information
4. **Layer Normalization** - Normalizes activations
5. **Residual Connections** - Helps gradient flow

**Q2: Why do Transformers need positional encoding?**

**A:** Unlike RNNs, Transformers process all positions in parallel and have no inherent notion of order. Positional encoding adds position information so the model knows the relative and absolute positions of tokens.

```
Without positional encoding:
"dog bites man" = "man bites dog" (same attention!)

With positional encoding:
"dog bites man" ≠ "man bites dog" (different representations)
```

---

### Intermediate Level:

**Q3: Explain the difference between self-attention and cross-attention.**

**A:**

**Self-Attention:**
- Query, Key, Value all come from SAME sequence
- Used in both encoder and decoder (masked in decoder)
- Each token attends to all tokens in its own sequence

**Cross-Attention:**
- Query from one sequence, Key/Value from another
- Used in decoder to attend to encoder output
- Decoder tokens attend to encoder tokens

```python
# Self-attention (encoder)
attn = attention(x, x, x)  # Q=K=V=x

# Cross-attention (decoder)
attn = attention(decoder_state, encoder_output, encoder_output)
# Q=decoder, K=V=encoder
```

**Q4: Why use multiple attention heads?**

**A:**
1. **Different representation subspaces:** Each head can learn different relationships
2. **Parallel computation:** More efficient than sequential attention
3. **Richer representations:** Captures syntax, semantics, position, etc.

```
Head 1: Subject-verb relationships
Head 2: Adjective-noun relationships  
Head 3: Coreference (pronouns → nouns)
Head 4: Semantic similarity
...
```

The output combines insights from all heads.

**Q5: Compare Pre-LN and Post-LN Transformers.**

**A:**

**Post-LN (Original):**
```python
x = self.norm(x + self.sublayer(x))
```
- Layer norm after residual
- Requires careful learning rate warmup
- Can be unstable for deep networks

**Pre-LN (Modern):**
```python
x = x + self.sublayer(self.norm(x))
```
- Layer norm before sublayer
- More stable training
- No warmup needed
- Used in GPT-2, GPT-3

---

### Advanced Level:

**Q6: How does Transformer complexity scale with sequence length?**

**A:**

**Attention Complexity:** $O(n^2 \cdot d)$
- $n$ = sequence length
- $d$ = model dimension
- Each position attends to all other positions

**Memory Complexity:** $O(n^2)$
- Attention matrix: (seq_len × seq_len)

**For very long sequences (>10K tokens):**
- Sparse attention (Longformer, BigBird)
- Linear attention (Performers)
- Flash Attention (IO-optimized)

**Q7: Design a Transformer for code generation.**

**A:**

```python
class CodeTransformer(nn.Module):
    def __init__(self, vocab_size, d_model=768, num_layers=12, num_heads=12):
        super().__init__()
        
        # Token + position embeddings
        self.token_embedding = nn.Embedding(vocab_size, d_model)
        self.position_embedding = nn.Embedding(2048, d_model)  # Max 2048 tokens
        
        # Decoder-only (like GPT) - autoregressive
        self.layers = nn.ModuleList([
            DecoderLayer(d_model, num_heads, d_model * 4)
            for _ in range(num_layers)
        ])
        
        self.norm = nn.LayerNorm(d_model)
        self.output = nn.Linear(d_model, vocab_size)
        
    def forward(self, input_ids, attention_mask=None):
        seq_len = input_ids.size(1)
        positions = torch.arange(seq_len, device=input_ids.device)
        
        # Embeddings
        x = self.token_embedding(input_ids) + self.position_embedding(positions)
        
        # Causal mask
        causal_mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
        causal_mask = ~causal_mask.to(input_ids.device)
        
        # Layers
        for layer in self.layers:
            x = layer(x, tgt_mask=causal_mask)
        
        x = self.norm(x)
        logits = self.output(x)
        
        return logits
```

**Key Design Decisions:**
- Decoder-only (autoregressive generation)
- Larger context window for code
- Special tokenization (BPE with code-specific handling)
- Consider syntax-aware attention or indentation encoding

**Q8: How would you optimize Transformer inference for production?**

**A:**

**1. Quantization:**
```python
# INT8 quantization
model = torch.quantization.quantize_dynamic(
    model, {nn.Linear}, dtype=torch.qint8
)
```

**2. KV-Cache for autoregressive generation:**
```python
# Don't recompute attention for previous tokens
# Store Key and Value for all previous positions
# Only compute Query for new token
```

**3. Flash Attention:**
- IO-aware implementation
- Reduces memory reads/writes
- 2-4x speedup

**4. Model Pruning:**
- Remove less important attention heads
- Structured pruning of layers

**5. Knowledge Distillation:**
- Train smaller "student" model
- Match larger "teacher" model outputs

**Q9: Explain attention sinks and why they matter.**

**A:**

**Observation:** In trained Transformers, the first token often receives high attention regardless of content.

**Why:**
1. Softmax requires attention to sum to 1
2. Model uses first position as "garbage collector"
3. When nothing is relevant, attend to first token

**Implications:**
1. Don't remove first token during inference
2. Can cause issues in streaming scenarios
3. Mitigations: attention bias, special [SINK] token

**Q10: Compare Transformer variants: Encoder-only, Decoder-only, Encoder-Decoder.**

**A:**

| Type | Architecture | Use Case | Examples |
|------|--------------|----------|----------|
| Encoder-only | Bidirectional self-attention | Understanding, classification | BERT, RoBERTa |
| Decoder-only | Causal self-attention | Generation | GPT, LLaMA |
| Encoder-Decoder | Both | Translation, summarization | T5, BART |

**When to use each:**
- **Encoder-only:** NLU tasks (classification, NER, QA)
- **Decoder-only:** Open-ended generation, completion
- **Encoder-Decoder:** Conditioned generation (translation, summarization)

---

## 🚀 Next Steps

Now that you understand the Transformer architecture, you're ready for:
1. **GPT** - Decoder-only Transformer for generation
2. **BERT** - Encoder-only Transformer for understanding
3. **Building Transformer from Scratch** - Complete implementation with training

**Key Takeaway:** The Transformer is the foundation of ALL modern language models. Understanding it deeply is essential for working with GPT, BERT, LLaMA, and any future models!

---

## 📚 Additional Resources

**Papers:**
- "Attention Is All You Need" (Vaswani et al., 2017) - Original Transformer
- "On Layer Normalization in the Transformer Architecture" (Xiong et al., 2020)
- "FlashAttention: Fast and Memory-Efficient Attention" (Dao et al., 2022)

**Visualizations:**
- Jay Alammar's "The Illustrated Transformer"
- Harvard NLP's "The Annotated Transformer"

**Code:**
- HuggingFace Transformers library
- PyTorch nn.Transformer module

---

**Remember:** The Transformer architecture is elegant in its simplicity - just attention and feed-forward layers, repeated. But this simplicity enables incredible scalability and performance!
