# 📘 Week 3 Interview Questions & Answers - Complete Guide

## 🎯 Overview

This comprehensive guide covers **50+ interview questions** from beginner to FAANG level for all Week 3 topics:

- RNN and LSTM
- Attention Mechanism  
- Transformer Architecture
- GPT and BERT
- Implementation Details
- Production & Deployment

---

## 📚 Section 1: RNN and LSTM (10 Questions)

### Beginner Level

**Q1: What is a Recurrent Neural Network (RNN)?**

**A:** An RNN is a neural network designed for sequential data that maintains a **hidden state** (memory) that gets updated at each time step. Unlike feedforward networks that process each input independently, RNNs can remember information from previous inputs.

```
Key equation: h_t = tanh(W_hh · h_{t-1} + W_xh · x_t + b)

The hidden state h_t combines:
- Previous memory (h_{t-1})
- Current input (x_t)
```

**Use cases:** Language modeling, speech recognition, time series prediction, machine translation.

---

**Q2: What is the vanishing gradient problem in RNNs?**

**A:** During backpropagation through time (BPTT), gradients are **multiplied** at each time step. When these multipliers are small (< 1), gradients shrink exponentially:

```
Example: 0.9^100 ≈ 0.00003 (effectively zero)

Impact:
- Early layers receive tiny gradients
- Model can't learn long-term dependencies
- "Forgets" information from early in sequence
```

**Real example:** In "The cat, which had been sleeping all day, finally meowed", an RNN might forget "cat" by the time it reaches "meowed".

---

**Q3: How does LSTM solve the vanishing gradient problem?**

**A:** LSTM introduces:

1. **Cell State (C_t):** A "highway" for information with **additive** updates (not multiplicative)
2. **Three Gates:**
   - **Forget Gate:** What to remove from memory
   - **Input Gate:** What new information to add
   - **Output Gate:** What to expose as output

**Key insight:**
```
RNN:  h_t = tanh(W × h_{t-1} + ...)        # Multiplicative → vanishes
LSTM: C_t = f_t × C_{t-1} + i_t × C̃_t     # Additive → preserved

When forget gate f_t ≈ 1, gradients flow unchanged!
```

---

### Intermediate Level

**Q4: Explain the three gates in LSTM with their formulas.**

**A:**

**1. Forget Gate (f_t):** Decides what to discard from cell state
```
f_t = σ(W_f · [h_{t-1}, x_t] + b_f)
Output: 0-1 for each element (0 = forget, 1 = keep)
```

**2. Input Gate (i_t) + Candidate (C̃_t):** Decides what new info to store
```
i_t = σ(W_i · [h_{t-1}, x_t] + b_i)
C̃_t = tanh(W_C · [h_{t-1}, x_t] + b_C)
```

**3. Output Gate (o_t):** Decides what to output
```
o_t = σ(W_o · [h_{t-1}, x_t] + b_o)
h_t = o_t ⊙ tanh(C_t)
```

**Cell State Update:**
```
C_t = f_t ⊙ C_{t-1} + i_t ⊙ C̃_t
```

---

**Q5: What's the difference between hidden state (h_t) and cell state (C_t)?**

**A:**
| Aspect | Cell State (C_t) | Hidden State (h_t) |
|--------|------------------|-------------------|
| **Purpose** | Long-term memory | Short-term/working memory |
| **Update** | Additive (preserves gradients) | Derived from C_t via output gate |
| **Flow** | Flows through network with minimal changes | Passed to next step AND used as output |
| **Analogy** | Your complete memory | What you're currently thinking |

The cell state is the "information highway" while hidden state is the "filtered output."

---

**Q6: Compare LSTM vs GRU. When would you choose each?**

**A:**

| Aspect | LSTM | GRU |
|--------|------|-----|
| **Gates** | 3 (forget, input, output) | 2 (reset, update) |
| **States** | 2 (cell + hidden) | 1 (hidden only) |
| **Parameters** | More (~25% more) | Fewer |
| **Training** | Slower | Faster |
| **Performance** | Slightly better on complex tasks | Comparable on most tasks |

**When to use:**
- **LSTM:** Long sequences, complex patterns, when accuracy is priority
- **GRU:** Faster training needed, shorter sequences, limited compute

**Rule of thumb:** Start with GRU (faster experimentation), switch to LSTM if needed.

---

### Advanced Level

**Q7: Derive the backpropagation equations for a simple RNN.**

**A:**

For RNN: `h_t = tanh(W_hh × h_{t-1} + W_xh × x_t + b)`

**Backpropagation through time:**
```
∂L/∂W_hh = Σ_t (∂L/∂h_t × ∂h_t/∂W_hh)

For each term ∂L/∂h_t, we need to propagate back:
∂L/∂h_t = ∂L/∂h_T × Π_{k=t+1}^{T} (∂h_k/∂h_{k-1})

Where:
∂h_t/∂h_{t-1} = diag(1 - tanh²(z_t)) × W_hh

The gradient involves:
- tanh derivative: 1 - tanh²(z) ≤ 1, often << 1
- W_hh: If max singular value < 1, gradients shrink
```

**Vanishing:** Product of many small terms → exponentially small
**Exploding:** Product of many large terms → exponentially large

---

**Q8: How would you handle variable-length sequences in an LSTM?**

**A:**

**1. Padding + Masking:**
```python
# Pad sequences to same length
padded = pad_sequence(sequences, batch_first=True, padding_value=0)

# Create attention mask
mask = (padded != 0)

# Apply mask in loss calculation
loss = criterion(output, target)
loss = (loss * mask).sum() / mask.sum()
```

**2. Pack Padded Sequence (more efficient):**
```python
from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence

# Sort by length (required for packing)
sorted_indices = lengths.argsort(descending=True)
sorted_sequences = sequences[sorted_indices]
sorted_lengths = lengths[sorted_indices]

# Pack
packed = pack_padded_sequence(sorted_sequences, sorted_lengths, batch_first=True)

# Pass through LSTM
packed_output, (h_n, c_n) = lstm(packed)

# Unpack
output, lengths = pad_packed_sequence(packed_output, batch_first=True)
```

**3. Bucketing:**
Group similar-length sequences in batches to minimize padding.

---

### FAANG Level

**Q9: Design a hierarchical LSTM for document classification.**

**A:**

**Architecture:**
```
Document: [Sentence1, Sentence2, ..., SentenceN]

Level 1: Word-level LSTM (per sentence)
┌──────────────────────────────────────────┐
│  Sentence 1: [word1, word2, word3, ...]  │
│       ↓                                   │
│  Word LSTM → Sentence Embedding s1       │
└──────────────────────────────────────────┘
(Repeat for all sentences)

Level 2: Sentence-level LSTM
┌──────────────────────────────────────────┐
│  [s1, s2, s3, ..., sN]                   │
│       ↓                                   │
│  Sentence LSTM → Document Embedding      │
└──────────────────────────────────────────┘

Level 3: Classification
┌──────────────────────────────────────────┐
│  Document Embedding → Classifier         │
│       ↓                                   │
│  Class Probabilities                      │
└──────────────────────────────────────────┘
```

**Why hierarchical?**
1. Captures both local (word) and global (sentence) patterns
2. Reduces sequence length at each level
3. More interpretable (can analyze sentence importance)

**Attention enhancement:**
Add attention at each level to weight important words/sentences.

---

**Q10: How would you parallelize RNN training across multiple GPUs?**

**A:**

**Challenge:** RNNs are inherently sequential within a sequence.

**Strategies:**

**1. Data Parallelism:**
```
Split batch across GPUs:
GPU 0: Batch samples 0-15
GPU 1: Batch samples 16-31
Each GPU computes full sequence, average gradients
```

**2. Sequence Parallelism (for very long sequences):**
```
Split sequence into chunks with overlap:
GPU 0: Positions 0-512
GPU 1: Positions 256-768 (overlap for context)
Merge hidden states at boundaries
```

**3. Tensor Parallelism:**
```
Split weight matrices across GPUs:
GPU 0: W[:, 0:256]
GPU 1: W[:, 256:512]
Requires communication for matrix multiply
```

**4. Pipeline Parallelism:**
```
Different layers on different GPUs:
GPU 0: LSTM layers 1-2
GPU 1: LSTM layers 3-4
Use gradient checkpointing to reduce memory
```

**Modern approach:** Use Transformers instead (naturally parallel).

---

## 📚 Section 2: Attention Mechanism (10 Questions)

### Beginner Level

**Q11: What is attention in neural networks?**

**A:** Attention allows a model to **focus on relevant parts** of input when producing output. Instead of compressing all information into a fixed vector, attention provides **direct access** to all input positions.

**Analogy:** 
- Without attention: Reading a book and only remembering the last page
- With attention: Having a perfect index to find any page instantly

**Formula:**
```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V
```

---

**Q12: Explain Query, Key, Value in attention.**

**A:**

| Concept | Meaning | Analogy |
|---------|---------|---------|
| **Query (Q)** | "What am I looking for?" | Search term |
| **Key (K)** | "What does each position offer?" | Index/tags |
| **Value (V)** | "What content should be returned?" | Actual data |

**Process:**
1. Compare Query with all Keys (similarity scores)
2. Apply softmax to get attention weights
3. Weight Values by these scores
4. Sum weighted Values for output

**Example:** For translation, when generating "cat", Query asks "what noun is the subject?", finds Key matching "chat" in French, returns corresponding Value.

---

**Q13: Why scale by √d_k in scaled dot-product attention?**

**A:**

**Problem:** When dimension d_k is large, dot products have large variance.

**Math:**
```
If Q, K have elements with variance 1:
- E[q·k] = 0
- Var[q·k] = d_k (grows with dimension!)

Large values → softmax saturates → tiny gradients
```

**Solution:** Scale by √d_k to restore variance to 1:
```
Var[q·k / √d_k] = d_k / d_k = 1 ✓
```

This keeps softmax in a good operating range.

---

### Intermediate Level

**Q14: What's the difference between self-attention and cross-attention?**

**A:**

**Self-Attention:**
- Q, K, V all from **same** sequence
- Each position attends to all positions in same input
- Used in encoders for building context

```python
self_attn = Attention(X @ W_Q, X @ W_K, X @ W_V)
```

**Cross-Attention:**
- Q from one sequence, K/V from another
- Decoder queries look at encoder keys/values
- Used for decoder to "see" encoder information

```python
cross_attn = Attention(decoder @ W_Q, encoder @ W_K, encoder @ W_V)
```

---

**Q15: Explain multi-head attention and why it's useful.**

**A:**

**What it does:**
Run multiple attention operations in parallel with different learned projections:
```
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) W^O
head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)
```

**Why multiple heads?**
Different heads can learn different relationships:
- Head 1: Subject-verb agreement
- Head 2: Coreference ("it" → "cat")
- Head 3: Positional patterns
- Head 4: Semantic similarity

**Dimensions:**
```
d_model = 512, num_heads = 8
d_k = d_model / num_heads = 64 per head
```

Each head operates on a lower dimension, but combined they equal d_model.

---

**Q16: How does masking work in attention?**

**A:**

**Purpose:** Prevent attention to certain positions.

**Types:**
1. **Padding Mask:** Ignore padded tokens
2. **Causal Mask:** Prevent looking at future (for autoregressive)

**Implementation:**
```python
# Create mask (1 = attend, 0 = mask)
causal_mask = torch.tril(torch.ones(seq_len, seq_len))

# Apply before softmax
scores = Q @ K.T / sqrt(d_k)
scores = scores.masked_fill(mask == 0, float('-inf'))
# -inf → 0 after softmax
attention_weights = softmax(scores)
```

**Causal mask example:**
```
       pos1  pos2  pos3  pos4
pos1    1     0     0     0
pos2    1     1     0     0
pos3    1     1     1     0
pos4    1     1     1     1
```

---

### Advanced Level

**Q17: Derive the computational complexity of self-attention.**

**A:**

For sequence length n, dimension d:

**Operations:**
1. **QKV projections:** 3 × n × d × d = O(nd²)
2. **QK^T:** n × d × n = O(n²d)
3. **Softmax:** O(n²)
4. **Attention × V:** n × n × d = O(n²d)
5. **Output projection:** n × d × d = O(nd²)

**Total:** O(n²d + nd²)

**Bottleneck:** n² term dominates for long sequences
- n = 1K: ~4MB attention matrix
- n = 10K: ~400MB
- n = 100K: ~40GB ← infeasible!

**Solutions:** Sparse attention, linear attention, flash attention.

---

**Q18: Explain different attention variants that reduce O(n²) complexity.**

**A:**

**1. Sparse Attention (Longformer, BigBird):**
```
Only attend to:
- Local window (nearby tokens)
- Global tokens (e.g., [CLS])
- Random tokens

Complexity: O(n × w) where w = window size
```

**2. Linear Attention (Performer):**
```
Key insight: softmax(QK^T)V can be rewritten
Use kernel trick: φ(Q)(φ(K)^T V)
Change order of operations

Complexity: O(n)
```

**3. Low-Rank (Linformer):**
```
Project K, V to lower dimension k << n
K_proj = K @ E  (n × d → k × d)

Complexity: O(nk)
```

**4. Flash Attention:**
```
Same O(n²) math but:
- Fused kernels
- Tiling for GPU memory
- Never materialize full attention matrix

Result: Same quality, 2-4x faster, less memory
```

---

### FAANG Level

**Q19: Design an attention mechanism for multimodal (text + image) input.**

**A:**

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│              MULTIMODAL ATTENTION                        │
│                                                          │
│  TEXT                          IMAGE                     │
│  ────                          ─────                     │
│  Tokenize                      Patch Embed               │
│     ↓                             ↓                      │
│  [t1, t2, ..., tn]           [p1, p2, ..., pm]         │
│     ↓                             ↓                      │
│  + Text Position              + 2D Position              │
│  + Modality Embed             + Modality Embed           │
│     ↓                             ↓                      │
│  ═══════════════════════════════════════════            │
│           Combined: [CLS, t1..tn, SEP, p1..pm]          │
│                            ↓                             │
│              Unified Self-Attention                      │
│                            ↓                             │
│              Cross-Modal Representations                 │
└─────────────────────────────────────────────────────────┘

Alternative: Co-Attention
- Separate encoders for each modality
- Cross-attention: text queries → image keys/values
- Cross-attention: image queries → text keys/values
```

**Key considerations:**
1. Different positional encodings (1D text, 2D image)
2. Modality tokens to distinguish types
3. Asymmetric attention if modalities have different importance

---

**Q20: How does Flash Attention work and why is it faster?**

**A:**

**The Problem:**
Standard attention loads full N×N attention matrix to GPU HBM (slow memory).

**Flash Attention Solution:**
```
Key insight: Never materialize full attention matrix

Algorithm:
1. Split Q, K, V into blocks
2. For each Q block:
   a. Load K, V blocks to fast SRAM
   b. Compute partial attention on-chip
   c. Accumulate with running softmax normalization
3. Write only final output to HBM

Memory: O(N) instead of O(N²)
```

**Why faster:**
1. **Memory hierarchy:** HBM is slow, SRAM is fast
2. **Reduced memory bandwidth:** Fewer reads/writes to HBM
3. **Fused operations:** Fewer kernel launches

**Results:**
- 2-4x faster than standard attention
- Same mathematical result
- Enables longer sequences

---

## 📚 Section 3: Transformer Architecture (10 Questions)

### Beginner Level

**Q21: What are the main components of a Transformer?**

**A:**

**Encoder:**
1. Input Embedding + Positional Encoding
2. Multi-Head Self-Attention
3. Add & Norm (Residual + LayerNorm)
4. Feed-Forward Network
5. Add & Norm

**Decoder:**
1. Output Embedding + Positional Encoding
2. **Masked** Multi-Head Self-Attention
3. Add & Norm
4. Multi-Head **Cross**-Attention (to encoder)
5. Add & Norm
6. Feed-Forward Network
7. Add & Norm

Stack N layers of each (N=6 in original paper).

---

**Q22: Why do Transformers need positional encoding?**

**A:**

**Problem:** Self-attention is **permutation invariant** - it doesn't inherently know word order.

```
"Dog bites man" and "Man bites dog"
Would produce same attention patterns without position info!
```

**Solution:** Add position information to embeddings.

**Sinusoidal encoding:**
```
PE(pos, 2i) = sin(pos / 10000^(2i/d))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d))
```

**Benefits:**
1. Bounded values (-1 to 1)
2. Unique pattern per position
3. Can extrapolate to longer sequences
4. Relative positions learnable (linear transformation exists)

---

**Q23: What is the purpose of the Feed-Forward Network in Transformers?**

**A:**

**Structure:**
```
FFN(x) = ReLU(xW₁ + b₁)W₂ + b₂

Dimensions:
- Input: d_model (512)
- Hidden: d_ff (2048) - 4x expansion
- Output: d_model (512)
```

**Purpose:**
1. **Non-linearity:** Attention is mostly linear; FFN adds non-linear transformations
2. **Capacity:** 4x expansion provides more capacity for learning
3. **Per-position processing:** Each position transformed independently
4. **Pattern storage:** Acts like a key-value memory for learned patterns

**Modern variants:** GELU activation, GLU (Gated Linear Unit) in GPT-4/LLaMA.

---

### Intermediate Level

**Q24: Explain residual connections and layer normalization.**

**A:**

**Residual Connections:**
```
output = x + Sublayer(x)
```
- Creates "gradient highway" - gradients flow directly through
- Each layer learns "what to add" instead of full transformation
- Enables very deep networks (100+ layers)

**Layer Normalization:**
```
LN(x) = γ × (x - μ) / σ + β

Where:
- μ, σ computed across features (not batch)
- γ, β are learnable scale and shift
```

**Why LayerNorm (not BatchNorm)?**
- Works with variable sequence lengths
- Independent of batch size
- Consistent behavior in training/inference

**Post-LN vs Pre-LN:**
```
Post-LN: x = LayerNorm(x + Sublayer(x))  # Original paper
Pre-LN:  x = x + Sublayer(LayerNorm(x))  # Modern, more stable
```

---

**Q25: What's the difference between encoder-decoder, encoder-only, and decoder-only Transformers?**

**A:**

| Architecture | Example | Use Case | Attention |
|--------------|---------|----------|-----------|
| **Encoder-Decoder** | T5, BART | Translation, Summarization | Full + Cross |
| **Encoder-Only** | BERT | Classification, NER | Bidirectional |
| **Decoder-Only** | GPT, LLaMA | Generation, Chat | Causal (masked) |

**Encoder-Only (BERT):**
- Sees all tokens simultaneously
- Best for understanding tasks
- Can't generate autoregressively

**Decoder-Only (GPT):**
- Each token only sees previous tokens
- Natural for generation
- Can be adapted for understanding with prompting

**Encoder-Decoder (T5):**
- Encoder processes input fully
- Decoder generates output autoregressively with cross-attention
- Best for sequence-to-sequence tasks

---

**Q26: Explain the training process for a Transformer.**

**A:**

**For Encoder-Decoder (e.g., translation):**

```python
# Input: Source sentence
# Target: Target sentence

# Teacher Forcing:
encoder_output = encoder(source)

# Shift target for input/output
decoder_input = target[:-1]   # [BOS, w1, w2, w3]
decoder_target = target[1:]   # [w1, w2, w3, EOS]

# Create causal mask
causal_mask = create_causal_mask(decoder_input.size(1))

# Forward pass
logits = decoder(decoder_input, encoder_output, causal_mask)

# Loss: Cross-entropy
loss = CrossEntropyLoss(logits.view(-1, vocab_size), 
                        decoder_target.view(-1))

# Backward and optimize
loss.backward()
optimizer.step()
```

**Key training techniques:**
1. **Label smoothing:** Soft targets (0.1 smoothing)
2. **Warmup:** Gradually increase learning rate
3. **Dropout:** On attention, FFN, embeddings
4. **Gradient clipping:** Prevent exploding gradients

---

### Advanced Level

**Q27: Compare Pre-LN vs Post-LN and their tradeoffs.**

**A:**

**Post-LN (Original Paper):**
```python
x = LayerNorm(x + Sublayer(x))
```
- Norm applied after residual
- Can have gradient issues in very deep networks
- Often requires learning rate warmup
- Slight advantage in some quality metrics

**Pre-LN (Modern):**
```python
x = x + Sublayer(LayerNorm(x))
```
- Norm applied before sublayer
- More stable gradients (gradient flows directly through residual)
- Easier to train, often no warmup needed
- Used in GPT-2, GPT-3, LLaMA

**Analysis:**
```
Post-LN gradient: ∂L/∂x passes through LN (can be scaled)
Pre-LN gradient: ∂L/∂x has direct path (identity shortcut)
```

**Recommendation:** Use Pre-LN for easier training, consider Post-LN for final quality optimization.

---

**Q28: How would you modify a Transformer for very long sequences (100K+ tokens)?**

**A:**

**1. Efficient Attention:**
```
- Sparse patterns (Longformer): O(n × window)
- Linear attention (Performer): O(n)
- Low-rank (Linformer): O(n)
```

**2. Chunking with Recurrence:**
```
Transformer-XL:
- Process in chunks
- Pass hidden states between chunks
- Relative positional encoding
```

**3. Hierarchical:**
```
- Paragraph → Document
- Compress then process
- Used in legal document analysis
```

**4. Memory-Efficient Implementation:**
```
- Flash Attention: Tiled computation
- Gradient checkpointing: Trade compute for memory
- Mixed precision: FP16/BF16
```

**5. Retrieval-Augmented:**
```
- Don't process all 100K at once
- Retrieve relevant chunks
- Process relevant context only
```

---

### FAANG Level

**Q29: Design a Transformer variant for streaming/real-time applications.**

**A:**

**Requirements:**
- Low latency (< 100ms)
- Constant memory (can't grow with history)
- Causal (only see past)

**Design: Streaming Transformer**

```
┌─────────────────────────────────────────────────────────┐
│           STREAMING TRANSFORMER                          │
│                                                          │
│  Key Modifications:                                      │
│                                                          │
│  1. CHUNKED PROCESSING                                   │
│     - Process fixed-size chunks (e.g., 256 tokens)      │
│     - Maintain KV cache from previous chunks            │
│                                                          │
│  2. SLIDING WINDOW ATTENTION                            │
│     - Only attend to last W positions                   │
│     - Constant memory O(W) instead of O(n)              │
│                                                          │
│  3. MEMORY BANK                                          │
│     - Compress old context into fixed-size memory       │
│     - Key tokens preserved, others summarized           │
│                                                          │
│  4. SPARSE PATTERNS                                      │
│     - Local window + stride patterns                    │
│     - Global tokens every N positions                   │
│                                                          │
│  Architecture:                                           │
│  [Input Chunk] → [Sliding Attention + Memory] → [Output]│
│        ↓                    ↓                            │
│  [Update KV Cache]    [Update Memory Bank]              │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
```python
class StreamingTransformer(nn.Module):
    def __init__(self, window_size=256, memory_size=64):
        self.window_size = window_size
        self.memory = FixedSizeMemory(memory_size)
        self.kv_cache = SlidingWindowKVCache(window_size)
    
    def forward(self, chunk):
        # Use cached KV pairs
        cached_kv = self.kv_cache.get()
        
        # Attention over window + memory
        output = self.attention(chunk, cached_kv, self.memory)
        
        # Update cache and memory
        self.kv_cache.update(chunk)
        self.memory.compress_and_store(chunk)
        
        return output
```

---

**Q30: Explain how Mixture of Experts (MoE) works in Transformers.**

**A:**

**Concept:**
Replace single FFN with multiple "expert" FFNs, route tokens to different experts.

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│              MIXTURE OF EXPERTS LAYER                    │
│                                                          │
│  Input x                                                 │
│     │                                                    │
│     ▼                                                    │
│  ┌─────────┐     ┌─────────────────────────────┐        │
│  │ Router  │────▶│ Expert Selection (Top-K)    │        │
│  │ Network │     │ e.g., select 2 of 8 experts │        │
│  └─────────┘     └─────────────────────────────┘        │
│                              │                           │
│                    ┌─────────┼─────────┐                │
│                    ▼         ▼         ▼                │
│              ┌─────────┐ ┌─────────┐      ┌─────────┐  │
│              │Expert 1 │ │Expert 2 │ ...  │Expert N │  │
│              │  FFN    │ │  FFN    │      │  FFN    │  │
│              └────┬────┘ └────┬────┘      └────┬────┘  │
│                   │           │                │        │
│                   └─────┬─────┘                         │
│                         ▼                               │
│              Weighted Sum (by router probabilities)     │
│                         │                               │
│                         ▼                               │
│                     Output                              │
└─────────────────────────────────────────────────────────┘
```

**Key Components:**

**Router (Gating Network):**
```python
router_logits = linear(x)  # (batch, seq, num_experts)
router_probs = softmax(router_logits, dim=-1)
top_k_probs, top_k_indices = topk(router_probs, k=2)
```

**Expert Selection:**
```python
# Only compute for selected experts
output = sum(prob_i * expert_i(x) for i in selected_experts)
```

**Benefits:**
1. **Scaling:** More parameters without proportional compute
2. **Specialization:** Experts learn different patterns
3. **Efficiency:** Only activate subset of network

**Challenges:**
1. **Load balancing:** Need auxiliary loss to use all experts
2. **Communication:** Experts may be on different GPUs
3. **Training stability:** Router training can be tricky

**Used in:** Switch Transformer, Mixtral, GPT-4 (rumored)

---

## 📚 Section 4: GPT and BERT (10 Questions)

### Beginner Level

**Q31: What's the main difference between BERT and GPT?**

**A:**

| Aspect | BERT | GPT |
|--------|------|-----|
| **Architecture** | Encoder-only | Decoder-only |
| **Attention** | Bidirectional (full) | Unidirectional (causal) |
| **Pre-training** | MLM + NSP | Causal LM |
| **Best for** | Understanding (classification) | Generation (text completion) |

**Visual:**
```
BERT: "The [MASK] sat on mat"
      Sees: ← all tokens →

GPT:  "The cat sat on ___"
      Sees: ← only past tokens
```

---

**Q32: What is Masked Language Modeling (MLM)?**

**A:**

**BERT's pre-training objective:**

1. Randomly select 15% of tokens
2. Of those:
   - 80%: Replace with [MASK]
   - 10%: Replace with random token
   - 10%: Keep unchanged
3. Predict original tokens

**Example:**
```
Input:  "The cat [MASK] on the mat"
Target: Predict "sat" at [MASK] position

Why 80-10-10 strategy?
- [MASK] never appears in fine-tuning
- Model shouldn't rely only on [MASK] signal
- Learns robust representations
```

---

**Q33: What is Causal Language Modeling (CLM)?**

**A:**

**GPT's pre-training objective:**

Predict next token given all previous tokens:
```
P(x_t | x_1, x_2, ..., x_{t-1})

Loss = -Σ log P(x_t | x_<t)
```

**Example:**
```
Input:  "The cat sat"
Step 1: "The" → predict "cat"
Step 2: "The cat" → predict "sat"
Step 3: "The cat sat" → predict "on"
```

**Causal mask ensures** model can't "cheat" by looking at future.

---

### Intermediate Level

**Q34: How does BERT handle sentence-pair tasks?**

**A:**

**Input format:**
```
[CLS] Sentence A [SEP] Sentence B [SEP]
```

**Segment embeddings:**
```
Sentence A tokens get segment ID = 0
Sentence B tokens get segment ID = 1
```

**Use cases:**
1. **Sentence similarity:** Compare embeddings
2. **Natural Language Inference:** Is B entailed by A?
3. **Question Answering:** A = question, B = context

**Example:**
```
Input: [CLS] How old is the cat? [SEP] The cat is 5 years old. [SEP]
Segment: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]
```

---

**Q35: Explain how to use BERT for different downstream tasks.**

**A:**

**1. Classification (Sentiment, Topic):**
```
[CLS] token embedding → Linear → Softmax → Class
```

**2. Token Classification (NER, POS):**
```
Each token embedding → Linear → Softmax → Label per token
```

**3. Question Answering:**
```
Each token embedding → Linear (start) + Linear (end)
Predict start and end positions of answer span
```

**4. Sentence Embedding:**
```
Mean pool all token embeddings (or use [CLS])
```

**Fine-tuning tips:**
- Small learning rate: 2e-5 to 5e-5
- Few epochs: 2-4
- Warmup: 10% of steps
- Optional: Freeze early layers

---

**Q36: Compare RoBERTa improvements over BERT.**

**A:**

| Aspect | BERT | RoBERTa |
|--------|------|---------|
| **NSP Task** | Yes | Removed (not helpful) |
| **Masking** | Static (same mask each epoch) | Dynamic (different each epoch) |
| **Training Data** | 16GB | 160GB (10x more) |
| **Training Time** | Shorter | Much longer |
| **Batch Size** | 256 | 8K |
| **Sequence Length** | Mix of 128 and 512 | Always 512 |

**Results:** RoBERTa significantly outperforms BERT on all benchmarks.

**Key insight:** BERT was undertrained; better hyperparameters and more data help a lot.

---

### Advanced Level

**Q37: Explain GPT's few-shot and zero-shot capabilities.**

**A:**

**Zero-shot:** No examples, just instructions
```
Prompt: "Translate English to French: sea otter =>"
Output: "loutre de mer"
```

**One-shot:** One example
```
Prompt: "Translate English to French:
         sea otter => loutre de mer
         peppermint =>"
Output: "menthe poivrée"
```

**Few-shot:** Multiple examples
```
Prompt: "Translate English to French:
         sea otter => loutre de mer
         peppermint => menthe poivrée
         plush giraffe => girafe en peluche
         cheese =>"
Output: "fromage"
```

**Why it works:**
1. **Scale:** 175B parameters store vast knowledge
2. **Diverse pre-training:** Seen many task formats
3. **In-context learning:** Pattern matching in the prompt
4. No gradient updates needed!

---

**Q38: How do you efficiently fine-tune large language models?**

**A:**

**1. Full Fine-tuning:**
```
Update all parameters
Expensive: Need full model in GPU memory
```

**2. LoRA (Low-Rank Adaptation):**
```
Freeze base model
Add small trainable matrices: W' = W + BA

A: (d, r) where r << d
B: (r, d)

Only train A, B (< 1% of parameters)
```

**3. QLoRA:**
```
LoRA + 4-bit quantization of base model
Can fine-tune 65B model on single 24GB GPU
```

**4. Adapter Layers:**
```
Insert small trainable layers between frozen layers
Only train adapters
```

**5. Prompt Tuning:**
```
Add learnable "soft" tokens to input
Only train these tokens (thousands of parameters)
```

**Comparison:**
| Method | Params Trained | Memory | Quality |
|--------|----------------|--------|---------|
| Full | 100% | High | Best |
| LoRA | ~1% | Medium | Near-full |
| QLoRA | ~1% | Low | Good |
| Prompt | <0.1% | Very Low | Task-specific |

---

### FAANG Level

**Q39: Design a retrieval-augmented generation (RAG) system.**

**A:**

```
┌─────────────────────────────────────────────────────────────┐
│                   RAG ARCHITECTURE                           │
│                                                              │
│  OFFLINE: Document Processing                                │
│  ─────────────────────────────                               │
│  Documents → Chunking → Embedding → Vector DB               │
│                           ↑                                  │
│                   BERT/Sentence-BERT                        │
│                                                              │
│  ONLINE: Query Processing                                    │
│  ────────────────────────                                    │
│  User Query                                                  │
│       │                                                      │
│       ▼                                                      │
│  ┌────────────┐                                             │
│  │ Embed Query│ ← Same embedding model                      │
│  └─────┬──────┘                                             │
│        │                                                     │
│        ▼                                                     │
│  ┌────────────────┐                                         │
│  │ Vector Search  │ → Top-K similar chunks                  │
│  └─────┬──────────┘                                         │
│        │                                                     │
│        ▼                                                     │
│  ┌────────────────────────────────────────┐                 │
│  │ Prompt Construction                     │                 │
│  │ "Context: {retrieved_chunks}            │                 │
│  │  Question: {user_query}                 │                 │
│  │  Answer:"                               │                 │
│  └─────────────────┬──────────────────────┘                 │
│                    │                                         │
│                    ▼                                         │
│  ┌────────────────────────────────────────┐                 │
│  │         GPT/LLM Generator              │                 │
│  │   (Generates grounded response)         │                 │
│  └─────────────────┬──────────────────────┘                 │
│                    │                                         │
│                    ▼                                         │
│              Answer to User                                  │
└─────────────────────────────────────────────────────────────┘
```

**Key Components:**

**1. Chunking Strategy:**
```python
def chunk_document(doc, chunk_size=512, overlap=50):
    # Sliding window with overlap
    chunks = []
    for i in range(0, len(doc), chunk_size - overlap):
        chunks.append(doc[i:i + chunk_size])
    return chunks
```

**2. Embedding Model:**
- Sentence-BERT, E5, BGE
- Optimized for semantic similarity

**3. Vector Database:**
- Pinecone, Weaviate, Chroma, FAISS
- Efficient ANN (Approximate Nearest Neighbor) search

**4. Retrieval Enhancement:**
- Hybrid search (dense + sparse/BM25)
- Re-ranking with cross-encoder
- Query expansion

**5. Generation:**
- Include retrieved context in prompt
- Instruction to cite sources
- Handle conflicting information

---

**Q40: How would you reduce inference latency for a production LLM?**

**A:**

**1. Model Optimization:**
```
Quantization:
- FP32 → FP16: 2x memory reduction
- FP16 → INT8: 2x more, 2-3x faster
- INT4 (GPTQ, AWQ): Aggressive but quality trade-off

Pruning:
- Remove redundant attention heads
- Structured pruning for hardware efficiency
```

**2. Inference Optimization:**
```
KV Cache:
- Cache key/value pairs from previous tokens
- Avoid recomputing for already-generated tokens

Batching:
- Continuous batching: Add new requests without waiting
- Dynamic batching: Group similar-length requests

Speculative Decoding:
- Draft with small model
- Verify with large model
- Accept multiple tokens at once
```

**3. Serving Infrastructure:**
```
Tensor Parallelism:
- Split model across GPUs
- Each GPU handles portion of computation

Pipeline Parallelism:
- Different layers on different GPUs
- Overlap computation

Specialized Serving:
- vLLM: PagedAttention for memory efficiency
- TensorRT-LLM: NVIDIA optimizations
- Text Generation Inference (TGI): Hugging Face
```

**4. System-Level:**
```
Caching:
- Cache common prompt prefixes
- Semantic caching for similar queries

Load Balancing:
- Route to least-loaded instance
- Separate long/short request queues
```

**Typical Optimizations Stack:**
```
Model: Quantize to INT8 (2-3x speedup)
Inference: KV cache + continuous batching (5-10x throughput)
Serving: vLLM or TensorRT-LLM (additional 2x)
```

---

## 📚 Section 5: Implementation & Production (10 Questions)

### Q41-Q50: Practical Implementation Questions

**Q41: How do you handle out-of-vocabulary (OOV) words?**

**A:**
- **Subword tokenization:** BPE, WordPiece, SentencePiece
- Break unknown words into known subwords
- Example: "unhappiness" → "un" + "happiness"

---

**Q42: What is the purpose of [CLS] token in BERT?**

**A:**
- Aggregates sequence-level information
- Specifically trained during NSP task
- Used for classification by adding head on [CLS] embedding

---

**Q43: How do you choose batch size for Transformer training?**

**A:**
- **Larger is generally better** (up to memory limits)
- Effective batch size = batch_size × gradient_accumulation × num_gpus
- BERT: 256-8192, GPT-3: 3.2M tokens per batch
- Use gradient accumulation if memory-limited

---

**Q44: What learning rate schedule works best for Transformers?**

**A:**
```python
# Linear warmup + decay
def lr_schedule(step, warmup_steps, total_steps):
    if step < warmup_steps:
        return step / warmup_steps  # Linear warmup
    else:
        # Cosine or linear decay
        return 0.5 * (1 + cos(pi * (step - warmup) / (total - warmup)))
```

---

**Q45: How do you debug a Transformer that's not learning?**

**A:**
1. **Check gradients:** Are they flowing? Vanishing/exploding?
2. **Verify masking:** Is causal mask correctly applied?
3. **Attention patterns:** Visualize - are they meaningful?
4. **Loss curve:** Sanity check on simple task first
5. **Overfit small data:** Can model memorize 10 examples?

---

**Q46: What's the difference between greedy, beam search, and sampling decoding?**

**A:**
```
Greedy: Always pick highest probability token
- Fast but can get stuck in loops

Beam Search: Keep top-k candidates at each step
- Better quality, more compute

Sampling: Randomly sample from distribution
- More diverse, control with temperature

Top-k/Top-p Sampling:
- Only sample from top tokens
- Balances diversity and quality
```

---

**Q47: How do you handle multilingual data in Transformers?**

**A:**
- **Shared vocabulary:** Use multilingual BPE
- **Language embedding:** Add learnable language token
- **Joint training:** Train on all languages together
- Examples: mBERT, XLM-R

---

**Q48: What metrics do you use to evaluate language models?**

**A:**
- **Perplexity:** exp(cross-entropy loss) - lower is better
- **BLEU:** For translation (n-gram overlap)
- **ROUGE:** For summarization (recall-oriented)
- **Task-specific:** Accuracy, F1 for downstream tasks

---

**Q49: How do you prevent overfitting in Transformers?**

**A:**
1. **Dropout:** On attention, FFN, embeddings
2. **Label smoothing:** Soft targets
3. **Weight decay:** L2 regularization
4. **Early stopping:** Monitor validation loss
5. **Data augmentation:** Back-translation, paraphrasing

---

**Q50: Describe a complete MLOps pipeline for deploying an LLM.**

**A:**
```
┌─────────────────────────────────────────────────────────────┐
│                   LLM MLOps PIPELINE                         │
│                                                              │
│  1. DATA PIPELINE                                            │
│     - Data collection & cleaning                            │
│     - Version control (DVC)                                 │
│     - Quality checks                                        │
│                                                              │
│  2. TRAINING                                                 │
│     - Distributed training (DeepSpeed, FSDP)               │
│     - Experiment tracking (W&B, MLflow)                    │
│     - Checkpoint management                                 │
│                                                              │
│  3. EVALUATION                                               │
│     - Automated benchmarks                                  │
│     - Human evaluation                                      │
│     - Safety testing                                        │
│                                                              │
│  4. OPTIMIZATION                                             │
│     - Quantization                                          │
│     - Distillation                                          │
│     - Pruning                                               │
│                                                              │
│  5. DEPLOYMENT                                               │
│     - Container (Docker)                                    │
│     - Serving (vLLM, TGI)                                  │
│     - Load balancing                                        │
│                                                              │
│  6. MONITORING                                               │
│     - Latency & throughput                                  │
│     - Token usage & costs                                   │
│     - Quality drift detection                               │
│     - Error rates                                           │
│                                                              │
│  7. FEEDBACK LOOP                                            │
│     - User feedback collection                              │
│     - RLHF data pipeline                                    │
│     - Continuous improvement                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary: Key Takeaways

### Must-Know Formulas

```
Attention: softmax(QK^T / √d_k) × V

Multi-Head: Concat(head_1,...,head_h) W^O

Transformer Layer:
  x = LayerNorm(x + Attention(x))
  x = LayerNorm(x + FFN(x))

Positional Encoding:
  PE(pos,2i) = sin(pos/10000^(2i/d))
  PE(pos,2i+1) = cos(pos/10000^(2i/d))
```

### Critical Concepts

1. **Attention** enables direct access to all positions
2. **Transformers** parallelize sequence processing
3. **BERT** = bidirectional understanding
4. **GPT** = autoregressive generation
5. **Scaling** requires efficient attention variants
6. **Fine-tuning** adapts pre-trained models efficiently

### Interview Tips

1. **Start simple:** Explain intuitively first
2. **Add depth:** Show you understand the math
3. **Be practical:** Mention real implementations
4. **Trade-offs:** Discuss pros/cons
5. **Stay current:** Mention recent developments

---

## ✅ Week 3 Complete!

You now have comprehensive knowledge of:
- RNN/LSTM fundamentals and limitations
- Attention mechanism in depth
- Transformer architecture
- GPT and BERT paradigms
- Implementation from scratch
- Production deployment

**You're ready for any Transformers/LLM interview!** 🚀
