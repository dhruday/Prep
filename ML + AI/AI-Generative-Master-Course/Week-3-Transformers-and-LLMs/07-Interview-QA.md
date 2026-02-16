# 📘 Week 3 Interview Questions & Answers - Transformers & LLMs

## 🎯 Overview

This comprehensive guide covers interview questions from **beginner to FAANG level** for all Week 3 topics:
- RNN and LSTM
- Attention Mechanism
- Transformers Architecture
- GPT and BERT
- Implementation Details

---

## 📚 Topic 1: RNN and LSTM

### Beginner Level

**Q1: What is a Recurrent Neural Network (RNN)?**

**A:** An RNN is a neural network designed for sequential data that maintains a hidden state (memory) that gets updated at each time step. Unlike feedforward networks that process each input independently, RNNs can remember information from previous inputs.

```
Regular NN:  Input → Process → Output (no memory)

RNN:         Input₁ → [RNN + h₀] → Output₁, h₁
             Input₂ → [RNN + h₁] → Output₂, h₂
             Input₃ → [RNN + h₂] → Output₃, h₃
```

**Key formula:**
```
h_t = tanh(W_hh · h_{t-1} + W_xh · x_t + b)
```

---

**Q2: What is the vanishing gradient problem?**

**A:** During backpropagation through time (BPTT), gradients are multiplied at each time step. If these gradients are small (< 1), they shrink exponentially:

```
0.9 × 0.9 × 0.9 × ... (100 times) ≈ 0.00003

Result:
- Early layers receive tiny gradients
- Can't learn long-term dependencies
- Model forgets early information
```

**Example:** In "The cat, which had been sleeping all day, suddenly meowed", a simple RNN might forget "cat" by the time it processes "meowed".

---

**Q3: How does LSTM solve the vanishing gradient problem?**

**A:** LSTM introduces:

1. **Cell State:** A separate pathway for long-term memory with additive updates (not multiplicative)
2. **Gates:** 
   - **Forget Gate:** What to remove from memory
   - **Input Gate:** What new information to add
   - **Output Gate:** What to expose as output

```
C_t = f_t ⊙ C_{t-1} + i_t ⊙ C̃_t

Key insight: Addition allows gradients to flow unchanged
(multiplying by 1 preserves gradient, multiplying by small numbers kills it)
```

---

### Intermediate Level

**Q4: Explain the three gates in LSTM with their formulas.**

**A:**

**1. Forget Gate (f_t):**
Decides what to discard from cell state
```
f_t = σ(W_f · [h_{t-1}, x_t] + b_f)
```
Output between 0-1: 0 = forget completely, 1 = keep completely

**2. Input Gate (i_t) + Candidate Values (C̃_t):**
Decides what new information to store
```
i_t = σ(W_i · [h_{t-1}, x_t] + b_i)
C̃_t = tanh(W_C · [h_{t-1}, x_t] + b_C)
```

**3. Output Gate (o_t):**
Decides what to output based on cell state
```
o_t = σ(W_o · [h_{t-1}, x_t] + b_o)
h_t = o_t ⊙ tanh(C_t)
```

**Cell State Update:**
```
C_t = f_t ⊙ C_{t-1} + i_t ⊙ C̃_t
```

---

**Q5: Compare LSTM and GRU. When would you choose one over the other?**

**A:**

| Aspect | LSTM | GRU |
|--------|------|-----|
| Gates | 3 (forget, input, output) | 2 (reset, update) |
| Parameters | More | Fewer (~25% less) |
| Cell State | Separate cell state and hidden state | Combined (only hidden state) |
| Training Speed | Slower | Faster |
| Expressiveness | More expressive | Simpler |

**Choose LSTM when:**
- Complex, long-term dependencies
- Large dataset available
- Performance is priority over speed

**Choose GRU when:**
- Limited computational resources
- Shorter sequences
- Need faster training
- Smaller datasets

---

**Q6: What is teacher forcing and what are its trade-offs?**

**A:** Teacher forcing is a training technique where we feed the ground truth (actual previous word) as input to the next time step, instead of the model's own prediction.

```python
# With teacher forcing
for t in range(seq_len):
    output = model(ground_truth[t])  # Use actual word
    
# Without teacher forcing  
for t in range(seq_len):
    output = model(prediction[t-1])  # Use model's prediction
```

**Pros:**
- Faster convergence
- Stable training
- Less error accumulation during training

**Cons:**
- **Exposure bias:** Model never learns to recover from its own mistakes
- **Train/test mismatch:** During inference, model must use own predictions
- Model becomes dependent on perfect inputs

**Solution:** Scheduled sampling (gradually reduce teacher forcing ratio)

---

### Advanced Level

**Q7: How do you handle variable-length sequences in batched training?**

**A:**

**1. Padding + Masking:**
```python
from torch.nn.utils.rnn import pad_sequence, pack_padded_sequence, pad_packed_sequence

# Pad sequences to same length
padded = pad_sequence(sequences, batch_first=True, padding_value=0)

# Pack to efficiently ignore padding
lengths = [len(s) for s in sequences]
packed = pack_padded_sequence(padded, lengths, batch_first=True, enforce_sorted=False)

# Process through LSTM
output, (hidden, cell) = lstm(packed)

# Unpack if needed
unpacked, _ = pad_packed_sequence(output, batch_first=True)
```

**2. Bucketing:**
Group sequences of similar length in same batch to minimize padding

**3. Dynamic batching:**
Sort by length, create batches with minimal total padding

---

**Q8: Design a bidirectional LSTM architecture for named entity recognition.**

**A:**

```python
class BiLSTM_NER(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, num_tags):
        super().__init__()
        
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        
        # Bidirectional LSTM
        self.lstm = nn.LSTM(
            embed_dim, 
            hidden_dim, 
            num_layers=2,
            bidirectional=True,
            batch_first=True,
            dropout=0.3
        )
        
        # CRF layer for sequence labeling (optional but recommended)
        self.fc = nn.Linear(hidden_dim * 2, num_tags)  # *2 for bidirectional
        
    def forward(self, x, lengths):
        # x: (batch, seq_len)
        embedded = self.embedding(x)
        
        # Pack for variable length
        packed = pack_padded_sequence(embedded, lengths, 
                                       batch_first=True, enforce_sorted=False)
        
        lstm_out, _ = self.lstm(packed)
        
        # Unpack
        lstm_out, _ = pad_packed_sequence(lstm_out, batch_first=True)
        
        # Classify each token
        logits = self.fc(lstm_out)  # (batch, seq_len, num_tags)
        
        return logits
```

**Why bidirectional for NER?**
- "Apple announced..." - need context after "Apple" to know it's a company
- "...works at Apple" - need context before "Apple" as well
- Both past and future context matter for classification

---

## 📚 Topic 2: Attention Mechanism

### Beginner Level

**Q9: What problem does attention solve?**

**A:** Attention solves the **bottleneck problem** in sequence-to-sequence models.

**Without attention:**
```
"The cat sat on the mat" → [Single fixed-size vector] → Translation
                              ↑
                    All information compressed here!
```

**With attention:**
```
"The cat sat on the mat" → [h₁, h₂, h₃, h₄, h₅, h₆] → All preserved!
                                    ↓
            Decoder attends to relevant parts for each output word
```

**Benefits:**
1. No information loss from compression
2. Direct access to all input positions
3. Can handle long sequences
4. Provides interpretability (attention weights)

---

**Q10: Explain the three components of attention: Query, Key, Value.**

**A:** Think of attention like a database lookup:

```
Query (Q): "What am I looking for?"
Key (K):   "What do I contain?" (index)
Value (V): "What information do I have?" (content)
```

**Process:**
1. Compare Query with all Keys (similarity scores)
2. Convert scores to probabilities (softmax)
3. Weighted sum of Values

**Analogy - Library Search:**
```
Query:  "Books about machine learning"
Keys:   Book titles/descriptions
Values: Actual book content

Step 1: Match query against all book descriptions
Step 2: Rank books by relevance
Step 3: Return content weighted by relevance
```

---

### Intermediate Level

**Q11: Compare additive (Bahdanau) and multiplicative (dot-product) attention.**

**A:**

**Additive (Bahdanau) Attention:**
```
score(s, h) = v^T · tanh(W_s · s + W_h · h)
```
- Uses a small neural network
- More parameters to learn
- Can be more expressive
- Slower computation

**Multiplicative (Dot-Product) Attention:**
```
score(s, h) = s^T · h
```
- Simple dot product
- Fewer parameters
- Faster (matrix multiplication)
- May have scaling issues

**Scaled Dot-Product (Transformer):**
```
score(s, h) = (s^T · h) / √d_k
```
- Scaled to prevent softmax saturation
- Best of both: fast and stable

---

**Q12: Why do we scale attention scores by √d_k?**

**A:** For large d_k (dimension), dot products can become very large:

```
If d_k = 512, and vectors have unit variance:
E[q · k] = 0, but Var[q · k] = d_k = 512

Some scores could be 20+, others -20
```

**Problem:**
```
softmax([30, 25, 20, 15]) ≈ [0.99, 0.01, 0.00, 0.00]
```
This is almost one-hot! Leads to:
- Vanishing gradients (softmax saturated)
- Model becomes overconfident early
- Can't learn nuanced attention

**Solution:**
```
softmax([30/√512, 25/√512, 20/√512, 15/√512])
= softmax([1.33, 1.11, 0.88, 0.66])
≈ [0.33, 0.27, 0.21, 0.17]
```
Now gradients can flow and attention is distributed.

---

**Q13: What is multi-head attention and why is it useful?**

**A:** Multi-head attention runs multiple attention functions in parallel:

```python
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) @ W_O

where head_i = Attention(Q @ W_i^Q, K @ W_i^K, V @ W_i^V)
```

**Example with 8 heads, d_model=512:**
- Each head has d_k = 512/8 = 64 dimensions
- Each head can learn different relationships

**What different heads learn:**
```
Head 1: Syntactic relationships (subject-verb)
Head 2: Semantic similarity
Head 3: Positional patterns (nearby words)
Head 4: Coreference (pronouns → nouns)
Head 5: Negation patterns ("not good")
...
```

**Benefits:**
1. Captures diverse relationship types
2. Richer representations
3. More robust than single attention
4. Parallel computation (efficient)

---

### Advanced Level

**Q14: How would you implement attention masking for causal/autoregressive models?**

**A:**

```python
def create_causal_mask(seq_len):
    """
    Create lower triangular mask for causal attention.
    Each position can only attend to itself and previous positions.
    """
    # Upper triangular matrix (ones above diagonal)
    mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1)
    
    # Convert to boolean: True = masked (don't attend)
    mask = mask.bool()
    
    return mask

def masked_attention(Q, K, V, mask=None):
    d_k = Q.size(-1)
    
    # Attention scores
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    
    # Apply mask: set masked positions to -infinity
    if mask is not None:
        scores = scores.masked_fill(mask, float('-inf'))
    
    # Softmax (masked positions become 0 probability)
    weights = F.softmax(scores, dim=-1)
    
    # Weighted sum of values
    return torch.matmul(weights, V)

# Example:
# seq_len = 5
# Mask:
# [[False,  True,  True,  True,  True],   Token 0: only sees self
#  [False, False,  True,  True,  True],   Token 1: sees 0, self
#  [False, False, False,  True,  True],   Token 2: sees 0, 1, self
#  [False, False, False, False,  True],   Token 3: sees 0, 1, 2, self
#  [False, False, False, False, False]]   Token 4: sees all
```

---

**Q15: Compare self-attention vs cross-attention vs causal attention.**

**A:**

| Type | Q, K, V Source | Use Case | Masking |
|------|----------------|----------|---------|
| **Self-Attention** | All from same sequence | Encoder, understanding | None (bidirectional) |
| **Cross-Attention** | Q from decoder, K/V from encoder | Encoder-decoder models | Padding only |
| **Causal Self-Attention** | All from same sequence | Decoder, generation | Lower triangular |

**Self-Attention (Encoder):**
```
Input: "The cat sat"
Each word attends to ALL words (including future)
Used for: BERT, understanding tasks
```

**Cross-Attention (Decoder attending to Encoder):**
```
Decoder Query: Current translation word
Encoder K/V:   All source sentence words
Used for: Translation, summarization
```

**Causal Self-Attention (Decoder):**
```
Input: "The cat sat"
Each word only attends to PREVIOUS words
Used for: GPT, text generation
```

---

## 📚 Topic 3: Transformers Architecture

### Beginner Level

**Q16: What are the main components of a Transformer?**

**A:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSFORMER COMPONENTS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. INPUT EMBEDDINGS                                           │
│     - Token embeddings (word → vector)                         │
│     - Positional encoding (position information)               │
│                                                                 │
│  2. ENCODER (N layers)                                         │
│     - Multi-Head Self-Attention                                │
│     - Feed-Forward Network                                     │
│     - Layer Normalization                                      │
│     - Residual Connections                                     │
│                                                                 │
│  3. DECODER (N layers)                                         │
│     - Masked Multi-Head Self-Attention (causal)               │
│     - Multi-Head Cross-Attention (to encoder)                 │
│     - Feed-Forward Network                                     │
│     - Layer Normalization                                      │
│     - Residual Connections                                     │
│                                                                 │
│  4. OUTPUT                                                      │
│     - Linear projection to vocabulary                          │
│     - Softmax for probabilities                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Q17: Why do Transformers need positional encoding?**

**A:** Transformers process all positions in parallel (no recurrence), so they have no inherent notion of order.

```
Without positional encoding:
"dog bites man" = "man bites dog"  ← Same attention patterns!
```

**Positional Encoding:**
- Adds unique position information to each token
- Uses sinusoidal functions (sin/cos at different frequencies)
- Allows model to learn position-dependent patterns

```
PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))

Position 0: [0.0, 1.0, 0.0, 1.0, ...]
Position 1: [0.84, 0.54, 0.02, 0.99, ...]
Position 2: [0.91, -0.42, 0.04, 0.98, ...]
```

Each position has unique encoding, and relative positions are linear transformations.

---

### Intermediate Level

**Q18: Explain the residual connections in Transformers and why they're important.**

**A:**

**Structure:**
```python
# Residual connection
output = LayerNorm(x + Sublayer(x))
```

**Why important:**

1. **Gradient flow:**
   ```
   Without residual: gradient must flow through every layer
   With residual:    gradient has "shortcut" path
   
   ∂Loss/∂x = ∂Loss/∂output × (1 + ∂Sublayer/∂x)
                                 ↑
                            Direct path (gradient = 1)
   ```

2. **Training deep networks:**
   - Original Transformer has 6 encoder + 6 decoder layers
   - GPT-3 has 96 layers
   - Without residuals, training such deep networks is nearly impossible

3. **Identity mapping:**
   - If sublayer learns 0, output = input
   - Easier to learn than learning full transformation

---

**Q19: What is the Feed-Forward Network in Transformers and why is it needed?**

**A:**

**Architecture:**
```python
FFN(x) = GELU(x @ W₁ + b₁) @ W₂ + b₂

# Dimensions:
# x:    (batch, seq_len, d_model)      e.g., 512
# W₁:   (d_model, d_ff)                e.g., 512 → 2048
# W₂:   (d_ff, d_model)                e.g., 2048 → 512
```

**Why needed:**

1. **Non-linearity:** Attention is essentially a weighted average (linear). FFN adds non-linear processing.

2. **Per-position processing:** Acts like a 1x1 convolution, processing each position with the same weights.

3. **Memory/knowledge storage:** Research suggests FFN layers store factual knowledge:
   ```
   Attention: "Who is related to who in this context?"
   FFN:       "What do I know about entities mentioned?"
   ```

4. **Capacity:** The 4x expansion (512 → 2048) provides computational capacity.

---

**Q20: Compare Pre-LN vs Post-LN Transformer architectures.**

**A:**

**Post-LN (Original Transformer):**
```python
x = x + Sublayer(x)
x = LayerNorm(x)
```

**Pre-LN (Modern, GPT-2+):**
```python
x = x + Sublayer(LayerNorm(x))
```

| Aspect | Post-LN | Pre-LN |
|--------|---------|--------|
| Layer Norm | After residual | Before sublayer |
| Training Stability | Less stable | More stable |
| Learning Rate | Needs warmup | No warmup needed |
| Deep Networks | Harder to train | Easier to train |
| Final Performance | Slightly better | Slightly worse |

**Why Pre-LN is more stable:**
- Input to sublayer is always normalized
- Gradients are more consistent across layers
- No gradient explosion at initialization

---

### Advanced Level

**Q21: How does Transformer complexity scale with sequence length?**

**A:**

**Self-Attention Complexity:**
```
Time:   O(n² × d)
Memory: O(n²)

Where n = sequence length, d = model dimension
```

**Why O(n²):**
- Attention matrix is (seq_len × seq_len)
- Every position attends to every other position

**Problem with long sequences:**
```
n = 1,000:   1,000,000 attention values
n = 10,000:  100,000,000 attention values
n = 100,000: 10,000,000,000 attention values (10 billion!)
```

**Solutions:**

1. **Sparse Attention (Longformer, BigBird):**
   - Local attention (sliding window)
   - Global attention (special tokens)
   - Random attention (sample)
   - Complexity: O(n × k) where k << n

2. **Linear Attention (Performer):**
   - Approximate attention with kernel trick
   - Complexity: O(n × d)

3. **Flash Attention:**
   - Same computation, optimized memory access
   - IO-aware algorithm
   - 2-4x faster, less memory

---

**Q22: Design a Transformer for handling documents with 100K+ tokens.**

**A:**

```python
class LongDocumentTransformer(nn.Module):
    def __init__(self, vocab_size, d_model=768, window_size=512, 
                 global_tokens=128, num_layers=12):
        super().__init__()
        
        # Standard embeddings
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoding = LearnedPositionalEncoding(100000, d_model)
        
        # Longformer-style sparse attention
        self.layers = nn.ModuleList([
            LongformerLayer(
                d_model=d_model,
                num_heads=12,
                window_size=window_size,      # Local attention window
                global_tokens=global_tokens,   # Global attention tokens
                d_ff=d_model * 4
            )
            for _ in range(num_layers)
        ])
        
    def forward(self, x, global_attention_mask=None):
        # x: (batch, seq_len)
        
        # Embedding
        x = self.embedding(x) + self.pos_encoding(x)
        
        # Sparse attention layers
        for layer in self.layers:
            x = layer(x, global_attention_mask)
        
        return x


class LongformerLayer(nn.Module):
    def __init__(self, d_model, num_heads, window_size, global_tokens, d_ff):
        super().__init__()
        
        self.local_attention = SlidingWindowAttention(d_model, num_heads, window_size)
        self.global_attention = GlobalAttention(d_model, num_heads, global_tokens)
        self.ffn = FeedForward(d_model, d_ff)
        
    def forward(self, x, global_mask):
        # Local attention (O(n × window_size))
        local_out = self.local_attention(x)
        
        # Global attention for marked tokens
        if global_mask is not None:
            global_out = self.global_attention(x, global_mask)
            x = local_out + global_out
        else:
            x = local_out
        
        # Feed-forward
        x = self.ffn(x)
        
        return x
```

**Key Design Decisions:**
1. Sliding window attention for local context
2. Global tokens ([CLS], sentence boundaries) attend everywhere
3. Linear complexity O(n × w) instead of O(n²)
4. Optional: Hierarchical processing (chunk → summarize → combine)

---

## 📚 Topic 4: GPT and BERT

### Beginner Level

**Q23: What is the main difference between BERT and GPT?**

**A:**

| Aspect | BERT | GPT |
|--------|------|-----|
| Architecture | Encoder-only | Decoder-only |
| Attention | Bidirectional | Causal (left-to-right) |
| Pre-training | Masked Language Model | Next Token Prediction |
| Best For | Understanding | Generation |

**BERT (Bidirectional):**
```
"The [MASK] sat on the mat"
    ↑↓   ↑↓   ↑↓  ↑↓  ↑↓
Sees ALL words to predict [MASK] = "cat"
```

**GPT (Autoregressive):**
```
"The cat" → predict "sat"
"The cat sat" → predict "on"
Only sees PREVIOUS words
```

---

**Q24: What is Masked Language Modeling (MLM)?**

**A:** MLM is BERT's pre-training objective where:

1. Randomly select 15% of tokens
2. Replace them:
   - 80% with [MASK]
   - 10% with random token
   - 10% keep original
3. Predict original tokens

**Example:**
```
Original: "The cat sat on the mat"
Masked:   "The [MASK] sat on [MASK] mat"
Predict:  [MASK] = "cat", [MASK] = "the"
```

**Why not 100% [MASK]?**
- 80% [MASK]: Learn to predict from context
- 10% random: Model must be robust to noise
- 10% same: Not all [MASK] positions are special

---

**Q25: How does GPT generate text?**

**A:** GPT uses autoregressive generation:

```python
def generate(prompt, max_tokens=50):
    tokens = tokenize(prompt)
    
    for _ in range(max_tokens):
        # Get logits for next token
        logits = model(tokens)[-1]  # Last position
        
        # Sample from distribution
        probs = softmax(logits / temperature)
        next_token = sample(probs)
        
        # Stop if end token
        if next_token == EOS:
            break
            
        # Append and continue
        tokens.append(next_token)
    
    return detokenize(tokens)
```

**Key parameters:**
- **Temperature:** Higher = more random, Lower = more deterministic
- **Top-k:** Sample from top k tokens only
- **Top-p (nucleus):** Sample from smallest set with cumulative prob ≥ p

---

### Intermediate Level

**Q26: Explain the [CLS] token in BERT and its purpose.**

**A:**

**What is [CLS]?**
- Special token added at the start of every input
- Position 0 in the sequence
- Used for classification tasks

**How it works:**
```
Input: [CLS] The movie was great [SEP]
        ↓    ↓   ↓     ↓    ↓    ↓
       BERT processes with self-attention
        ↓
[CLS] embedding aggregates sentence information
        ↓
    Classifier → Sentiment: Positive
```

**Why [CLS] works:**
1. Self-attention allows [CLS] to attend to all other tokens
2. Pre-training with NSP teaches [CLS] to represent sentence meaning
3. Fine-tuning adapts it to specific tasks

```python
# Usage
outputs = bert(input_ids, attention_mask)
cls_embedding = outputs.last_hidden_state[:, 0, :]  # First token
logits = classifier(cls_embedding)
```

---

**Q27: Compare fine-tuning vs prompt engineering for GPT.**

**A:**

**Fine-tuning:**
```python
# Update model weights on task-specific data
for batch in task_data:
    loss = model(batch)
    loss.backward()
    optimizer.step()
```

**Prompt Engineering:**
```
# Keep weights frozen, craft input to get desired output
"Classify as positive or negative:
Review: This movie was amazing!
Sentiment:"
```

| Aspect | Fine-tuning | Prompt Engineering |
|--------|-------------|-------------------|
| Model Weights | Updated | Frozen |
| Data Needed | Labeled dataset | Few/zero examples |
| Compute Cost | High (GPU hours) | Low (inference only) |
| Task Flexibility | One task per model | Many tasks, one model |
| Best Performance | Usually higher | Good, improving |
| Deployment | Multiple models | One model |

**When to use each:**
- **Fine-tuning:** Production systems, maximum accuracy needed, have labeled data
- **Prompting:** Prototyping, diverse tasks, limited data, using API

---

**Q28: What is the difference between GPT-3's few-shot learning and fine-tuning?**

**A:**

**Few-Shot Learning (In-Context Learning):**
```
Prompt:
"Translate English to French:
Hello → Bonjour
Thank you → Merci
Good morning →"

Model completes: "Bonjour"
```

- Examples in the prompt, not training
- Model adapts behavior based on context
- No weight updates
- Limited by context length

**Fine-tuning:**
```python
# Actual training on examples
for epoch in range(epochs):
    for (english, french) in dataset:
        loss = model(english, french)
        loss.backward()
```

- Updates model weights
- Requires compute for training
- Permanent knowledge incorporation
- Better for specialized tasks

**GPT-3's magic:** Large scale enables strong few-shot learning without fine-tuning. The model has seen so many patterns that it can adapt from just a few examples.

---

### Advanced Level

**Q29: How does GPT-4 differ architecturally from GPT-3?**

**A:**

| Aspect | GPT-3 | GPT-4 |
|--------|-------|-------|
| Architecture | Dense Transformer | Mixture of Experts (MoE) |
| Total Parameters | 175B | ~1.7T (estimated) |
| Active Parameters | 175B | ~280B per token |
| Modality | Text only | Text + Images |
| Context Length | 4K/8K | 8K/32K/128K |

**Mixture of Experts (MoE):**
```
Input → Router → Expert₁  (25% of params)
              → Expert₂  (25% of params)
              → Expert₃  (25% of params)
              → ...
              
Only 2-4 experts activated per token
Massive capacity, efficient inference
```

**Benefits of MoE:**
1. Scale parameters without scaling compute proportionally
2. Different experts specialize in different domains
3. More efficient than dense model of same capacity

---

**Q30: Design a system using both BERT and GPT for different stages.**

**A:**

**Use Case: Customer Support Chatbot**

```python
class HybridSupportBot:
    def __init__(self):
        # BERT for understanding
        self.intent_classifier = BertForSequenceClassification.from_pretrained(
            'bert-intent-classifier'
        )
        self.entity_extractor = BertForTokenClassification.from_pretrained(
            'bert-ner-model'
        )
        self.retriever = SentenceTransformer('bert-base-nli')
        
        # GPT for generation
        self.generator = GPT2LMHeadModel.from_pretrained('gpt2-chat')
    
    def respond(self, user_message):
        # Stage 1: Intent Classification (BERT)
        intent = self.classify_intent(user_message)
        
        # Stage 2: Entity Extraction (BERT)
        entities = self.extract_entities(user_message)
        
        # Stage 3: Knowledge Retrieval (BERT embeddings)
        relevant_docs = self.retrieve_knowledge(user_message)
        
        # Stage 4: Response Generation (GPT)
        context = self.build_context(intent, entities, relevant_docs)
        response = self.generate_response(context)
        
        return response
    
    def classify_intent(self, text):
        inputs = self.tokenizer(text, return_tensors='pt')
        outputs = self.intent_classifier(**inputs)
        return outputs.logits.argmax(-1).item()
    
    def extract_entities(self, text):
        inputs = self.tokenizer(text, return_tensors='pt')
        outputs = self.entity_extractor(**inputs)
        # Process NER output
        return self.decode_entities(outputs)
    
    def retrieve_knowledge(self, query):
        query_embedding = self.retriever.encode(query)
        # Search vector database
        docs = self.vector_db.search(query_embedding, k=5)
        return docs
    
    def generate_response(self, context):
        inputs = self.tokenizer(context, return_tensors='pt')
        outputs = self.generator.generate(**inputs, max_length=200)
        return self.tokenizer.decode(outputs[0])
```

**Why this hybrid approach?**
- BERT excels at understanding (classification, extraction, similarity)
- GPT excels at generating natural responses
- Best of both worlds

---

## 📚 Topic 5: Implementation Details

### Practical Questions

**Q31: How do you handle out-of-vocabulary (OOV) words in BERT?**

**A:** BERT uses **WordPiece tokenization** which handles OOV through subword units:

```python
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# Known word
tokenizer.tokenize("hello")  # ['hello']

# Unknown word - broken into subwords
tokenizer.tokenize("unbelievable")  # ['un', '##bel', '##ie', '##va', '##ble']

# Completely unknown - character level
tokenizer.tokenize("asdfgh")  # ['as', '##df', '##gh']
```

**How WordPiece works:**
1. Start with character vocabulary
2. Iteratively merge most frequent pairs
3. "##" prefix indicates continuation of word
4. Very rare words broken into known subwords

**Benefits:**
- No [UNK] tokens (or very rare)
- Handles misspellings, new words, technical terms
- Finite vocabulary (typically 30K-50K tokens)

---

**Q32: What learning rate schedule is typically used for Transformers?**

**A:**

**Original Transformer (Warmup + Decay):**
```python
lr = d_model^(-0.5) × min(step^(-0.5), step × warmup_steps^(-1.5))
```

**For Fine-tuning (Linear Warmup + Linear Decay):**
```python
from transformers import get_linear_schedule_with_warmup

total_steps = len(train_loader) * epochs
warmup_steps = int(0.1 * total_steps)  # 10% warmup

scheduler = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps=warmup_steps,
    num_training_steps=total_steps
)
```

```
Learning Rate
     ↑
     │    /‾‾‾‾‾‾‾‾‾‾‾‾‾\
     │   /               \
     │  /                 \
     │ /                   \
     └────────────────────────→ Steps
     Warmup    Peak    Decay
```

**Why warmup?**
- Gradients are noisy at start (random weights)
- Large learning rate can cause instability
- Warmup allows gradients to stabilize

**Typical values for fine-tuning:**
- Learning rate: 2e-5 to 5e-5
- Warmup: 6-10% of total steps
- Weight decay: 0.01

---

**Q33: How do you efficiently serve Transformer models in production?**

**A:**

**1. Model Optimization:**
```python
# Quantization (INT8)
from transformers import BertModel
import torch

model = BertModel.from_pretrained('bert-base-uncased')
quantized_model = torch.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8
)
```

**2. ONNX Export:**
```python
from transformers import BertModel
import torch

model = BertModel.from_pretrained('bert-base-uncased')
dummy_input = torch.randint(0, 1000, (1, 128))

torch.onnx.export(
    model, 
    (dummy_input,),
    "bert.onnx",
    input_names=['input_ids'],
    output_names=['output'],
    dynamic_axes={'input_ids': {0: 'batch', 1: 'seq_len'}}
)
```

**3. TorchScript:**
```python
scripted_model = torch.jit.script(model)
scripted_model.save("model.pt")
```

**4. KV-Cache for Autoregressive Models:**
```python
class CachedGPT:
    def __init__(self, model):
        self.model = model
        self.kv_cache = {}  # Store past key-values
    
    def generate_token(self, new_token):
        # Only compute attention for new token
        # Reuse cached K, V for previous tokens
        output, new_kv = self.model(
            new_token, 
            past_key_values=self.kv_cache
        )
        self.kv_cache = new_kv
        return output
```

**5. Batching and Async:**
```python
from concurrent.futures import ThreadPoolExecutor

class BatchedInference:
    def __init__(self, model, batch_size=32, timeout=0.1):
        self.model = model
        self.batch_size = batch_size
        self.queue = []
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def predict(self, input):
        # Collect inputs, batch when ready
        self.queue.append(input)
        if len(self.queue) >= self.batch_size:
            batch = self.queue[:self.batch_size]
            self.queue = self.queue[self.batch_size:]
            return self.model(batch)
```

---

**Q34: How do you debug attention patterns in Transformers?**

**A:**

```python
import matplotlib.pyplot as plt
import seaborn as sns
from transformers import BertModel, BertTokenizer

def visualize_attention(text, model, tokenizer, layer=11, head=0):
    """Visualize attention for a specific layer and head"""
    
    # Tokenize
    inputs = tokenizer(text, return_tensors='pt')
    tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
    
    # Get attention
    outputs = model(**inputs, output_attentions=True)
    attention = outputs.attentions[layer][0, head].detach().numpy()
    
    # Plot
    fig, ax = plt.subplots(figsize=(10, 10))
    sns.heatmap(
        attention,
        xticklabels=tokens,
        yticklabels=tokens,
        cmap='viridis',
        ax=ax
    )
    ax.set_title(f'Layer {layer}, Head {head}')
    plt.tight_layout()
    plt.show()

# Aggregate attention across heads
def attention_rollout(attentions):
    """
    Compute attention rollout to see cumulative attention flow.
    """
    result = torch.eye(attentions[0].size(-1))
    
    for attention in attentions:
        # Average across heads
        attention_avg = attention.mean(dim=1)
        
        # Add residual connection (identity)
        attention_with_residual = 0.5 * attention_avg + 0.5 * torch.eye(attention_avg.size(-1))
        
        # Normalize rows
        attention_with_residual = attention_with_residual / attention_with_residual.sum(dim=-1, keepdim=True)
        
        # Multiply through
        result = torch.matmul(attention_with_residual, result)
    
    return result
```

**What to look for:**
1. **[CLS] attention:** Should attend to semantically important tokens
2. **Syntactic patterns:** Subject-verb, adjective-noun connections
3. **Positional patterns:** Some heads focus on nearby tokens
4. **Separator attention:** [SEP] often serves as "no-op" attention target

---

**Q35: How would you implement knowledge distillation for a Transformer?**

**A:**

```python
class DistillationTrainer:
    """
    Train a smaller student model to mimic a larger teacher model.
    """
    
    def __init__(self, teacher, student, temperature=4.0, alpha=0.5):
        self.teacher = teacher
        self.student = student
        self.temperature = temperature
        self.alpha = alpha  # Balance between distillation and task loss
        
        # Freeze teacher
        for param in self.teacher.parameters():
            param.requires_grad = False
    
    def compute_loss(self, inputs, labels):
        # Student outputs
        student_outputs = self.student(**inputs)
        student_logits = student_outputs.logits
        
        # Teacher outputs (no gradient)
        with torch.no_grad():
            teacher_outputs = self.teacher(**inputs)
            teacher_logits = teacher_outputs.logits
        
        # Task loss (cross-entropy with true labels)
        task_loss = F.cross_entropy(student_logits, labels)
        
        # Distillation loss (KL divergence with soft labels)
        student_soft = F.log_softmax(student_logits / self.temperature, dim=-1)
        teacher_soft = F.softmax(teacher_logits / self.temperature, dim=-1)
        
        distill_loss = F.kl_div(
            student_soft, 
            teacher_soft, 
            reduction='batchmean'
        ) * (self.temperature ** 2)
        
        # Combined loss
        total_loss = self.alpha * distill_loss + (1 - self.alpha) * task_loss
        
        return total_loss, task_loss, distill_loss

# Usage
teacher = BertForSequenceClassification.from_pretrained('bert-large')
student = BertForSequenceClassification.from_pretrained('bert-tiny')

trainer = DistillationTrainer(teacher, student)
```

**Key concepts:**
1. **Soft labels:** Teacher's probability distribution (not just argmax)
2. **Temperature:** Higher = softer distribution, more information transfer
3. **Combined loss:** Balance mimicking teacher vs. solving task directly

**Result:** Student achieves ~97% of teacher performance with ~60% of parameters.

---

## 🎯 FAANG-Level Questions

**Q36: You're building a real-time sentiment analysis system for 10M tweets/day. Design the architecture.**

**A:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME SENTIMENT PIPELINE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Twitter Stream] → [Kafka] → [Spark Streaming] → [Model API]  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MODEL SERVING                        │   │
│  │                                                         │   │
│  │  Load Balancer                                         │   │
│  │       │                                                │   │
│  │  ┌────┴────┬────────┬────────┐                        │   │
│  │  │         │        │        │                        │   │
│  │  GPU Node  GPU Node GPU Node (auto-scaling)           │   │
│  │  │         │        │                                  │   │
│  │  ONNX Runtime + TensorRT                              │   │
│  │  Quantized DistilBERT (INT8)                          │   │
│  │  Batch size: 64, Latency: <50ms                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Results] → [Kafka] → [Elasticsearch] → [Dashboard]           │
│                    └→ [Redis Cache]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Capacity Planning:
- 10M tweets/day = ~116 tweets/second
- 64 batch size × 3 nodes = 192 tweets/batch
- 50ms latency = 20 batches/second = 3,840 tweets/second (33x capacity)
```

**Key decisions:**
1. **Model:** DistilBERT (6 layers) instead of BERT (12 layers) - 60% of params, 95% accuracy
2. **Optimization:** ONNX + TensorRT + INT8 quantization - 4x throughput
3. **Batching:** Dynamic batching to maximize GPU utilization
4. **Caching:** Redis for frequently seen phrases
5. **Scaling:** Kubernetes auto-scaling based on queue depth

---

**Q37: Your LLM is hallucinating facts. How do you debug and fix this?**

**A:**

**Debugging:**

1. **Identify patterns:**
```python
# Track hallucination rate by topic
hallucinations_by_topic = defaultdict(list)

for query, response, ground_truth in test_set:
    is_hallucination = not verify_facts(response, ground_truth)
    topic = classify_topic(query)
    hallucinations_by_topic[topic].append(is_hallucination)

# Find problematic topics
for topic, hallucinations in hallucinations_by_topic.items():
    rate = sum(hallucinations) / len(hallucinations)
    print(f"{topic}: {rate:.2%} hallucination rate")
```

2. **Analyze attention:**
```python
# Are hallucinations correlated with low attention to context?
for query, context, response in hallucinated_examples:
    attention_to_context = compute_cross_attention(query, context, response)
    print(f"Context attention: {attention_to_context.mean():.2f}")
```

**Fixes:**

1. **RAG (Retrieval-Augmented Generation):**
```python
def generate_with_retrieval(query):
    # Retrieve relevant documents
    docs = retriever.search(query, k=5)
    
    # Include in prompt
    context = "\n".join(docs)
    prompt = f"Context: {context}\n\nQuestion: {query}\n\nAnswer:"
    
    return model.generate(prompt)
```

2. **Self-consistency:**
```python
def consistent_generation(query, n=5):
    # Generate multiple responses
    responses = [model.generate(query) for _ in range(n)]
    
    # Return most common answer
    return Counter(responses).most_common(1)[0][0]
```

3. **Calibration training:**
```python
# Train model to say "I don't know" when uncertain
training_data = [
    {"query": "What is X?", "answer": "I don't have reliable information about X."}
    for X in uncertain_topics
]
```

4. **Post-processing verification:**
```python
def verified_response(query, response):
    # Check against knowledge base
    claims = extract_claims(response)
    for claim in claims:
        if not knowledge_base.verify(claim):
            response = response.replace(claim, "[UNVERIFIED]")
    return response
```

---

## 📋 Quick Reference Card

### Model Selection
| Task | Best Model | Why |
|------|------------|-----|
| Classification | BERT/RoBERTa | Bidirectional context |
| Generation | GPT | Autoregressive |
| Translation | T5/mBART | Encoder-decoder |
| Embeddings | Sentence-BERT | Optimized for similarity |
| Code | Codex/StarCoder | Code-trained |

### Hyperparameters Cheat Sheet
| Parameter | Fine-tuning | Pre-training |
|-----------|-------------|--------------|
| Learning Rate | 2e-5 to 5e-5 | 1e-4 to 1e-3 |
| Batch Size | 16-32 | 256-2048 |
| Epochs | 3-10 | 1-3 over data |
| Warmup | 6-10% | 1-5% |
| Weight Decay | 0.01 | 0.01 |
| Dropout | 0.1 | 0.1 |

### Complexity Reference
| Component | Time | Space |
|-----------|------|-------|
| Self-Attention | O(n²d) | O(n²) |
| FFN | O(nd²) | O(d²) |
| Total Layer | O(n²d + nd²) | O(n² + d²) |

---

**Remember:** These interview questions test both theoretical understanding and practical experience. Be prepared to:
1. Explain concepts simply (whiteboard)
2. Dive into mathematical details (formulas)
3. Discuss trade-offs (system design)
4. Debug real issues (production experience)
