# 📘 Attention Mechanism - The Breakthrough

## 📚 Table of Contents

1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
3. [Mathematical Formulas](#-mathematical-formulas)
4. [Multi-Head Attention](#-multi-head-attention)
5. [Types of Attention](#-types-of-attention)
6. [Real World Use Cases](#-real-world-use-cases)
7. [Sample Mini Project: Attention Visualizer](#-sample-mini-project-attention-visualizer)
8. [Homework](#-homework)
9. [Common Mistakes](#️-common-mistakes)
10. [Interview Questions & Answers](#-interview-questions--answers)
11. [Next Steps](#-next-steps)

---

## 🎯 Beginner Friendly Explanation

### The Problem with RNN/LSTM: The Bottleneck

Remember how LSTM works? It processes words **one by one**, squeezing all information into a fixed-size hidden state.

```
"I love machine learning because it helps me build amazing products"

LSTM processes:
I → love → machine → learning → because → it → helps → me → build → amazing → products
                                                                              ↓
                                                              Single fixed-size vector h_T
                                                              (Supposed to contain EVERYTHING!)
```

**The Problem:** By the time we reach "products", all the information about "I", "love", "machine" must be compressed into one vector. This is like trying to fit a book summary into a single sentence!

### The Solution: Let the Model "Look Back"

**What if** instead of just using the last hidden state, we could look at ALL the hidden states and pick what's relevant?

```
For generating each output word, we can:
1. Look at ALL input words
2. Decide which ones are most relevant
3. Focus on those (pay ATTENTION to them)
```

**Real-life Analogy: Google Search**
```
Query: "How to train a neural network"

Google doesn't just read the entire internet and give you one compressed answer.
It SEARCHES for relevant pages and shows you the most relevant ones.

Attention is like giving your neural network a search engine!
```

### Visual Mental Model

```
Without Attention (RNN):
You're reading a book, but you can only remember the last page.
If someone asks about Chapter 1, you've forgotten it!

With Attention:
You're reading a book with a perfect index.
For any question, you can instantly flip to relevant pages.
```

---

## 🧠 Deep Technical Breakdown

### Query, Key, Value - The Core Concept

Attention uses three concepts borrowed from **database retrieval**:

| Concept | Database Analogy | Attention Meaning |
|---------|------------------|-------------------|
| **Query (Q)** | Search term | What am I looking for? |
| **Key (K)** | Index/Tags | What does each item contain? |
| **Value (V)** | Actual data | What should I return? |

**Example: Library Search**
```
You walk into a library looking for "machine learning" (Query)

Each book has:
- Subject tags (Keys): "AI", "ML", "Deep Learning", "Statistics"
- Content (Values): The actual pages

Search process:
1. Compare your Query with each book's Keys
2. Find matches: "ML", "Deep Learning" match well
3. Return weighted combination of Values (contents of matching books)
```

### How Attention Actually Works

**Step 1: Compute Similarity Scores**
```
For each query, compute how well it matches each key:
score_i = Query · Key_i  (dot product)
```

**Step 2: Convert to Probabilities (Attention Weights)**
```
weights = softmax(scores)
# Now weights sum to 1, representing "how much attention to pay"
```

**Step 3: Weighted Sum of Values**
```
output = Σ (weight_i × Value_i)
# Combine all values, weighted by relevance
```

### Visual Flow

```
Input Sequence: [x₁, x₂, x₃, x₄]
                 ↓   ↓   ↓   ↓
              [h₁, h₂, h₃, h₄]  (Hidden states)
                 |   |   |   |
                 ↓   ↓   ↓   ↓
Query q ──────→ Compare with each h_i
                 ↓   ↓   ↓   ↓
             [0.1, 0.6, 0.2, 0.1]  (Attention weights)
                 ↓   ↓   ↓   ↓
             Weight × Value for each
                 ↓   ↓   ↓   ↓
                 └───┴───┴───┘
                       ↓
               Context Vector c
               (Weighted sum of all values)
```

---

## 📐 Mathematical Formulas

### Dot-Product Attention (Basic)

```
Attention(Q, K, V) = softmax(Q · K^T) × V
```

**Dimensions:**
- Q (Query): (query_len, d_k)
- K (Key): (key_len, d_k)
- V (Value): (key_len, d_v)
- Output: (query_len, d_v)

**Step by step:**
```
1. Q · K^T → (query_len, d_k) × (d_k, key_len) = (query_len, key_len)
   These are the "similarity scores"

2. softmax(row-wise) → (query_len, key_len)
   Each row sums to 1 (attention distribution)

3. × V → (query_len, key_len) × (key_len, d_v) = (query_len, d_v)
   Weighted combination of values
```

### Scaled Dot-Product Attention

**The Problem with Plain Dot-Product:**
```
When d_k is large, dot products grow large in magnitude.
Large values → softmax saturates → gradients vanish!
```

**The Solution: Scale!**
```
Attention(Q, K, V) = softmax(Q · K^T / √d_k) × V
                              ↑
                         Scaling factor!
```

**Why √d_k?**
```
If Q and K have elements with variance 1,
then Q·K has variance d_k (sum of d_k terms).
Dividing by √d_k gives variance 1 again.
```

**Mathematical Justification:**
```
Given q, k are vectors of dimension d_k with elements ~ N(0, 1):
    E[q · k] = 0
    Var[q · k] = d_k  (variance grows with dimension!)
    
After scaling by √d_k:
    Var[q · k / √d_k] = d_k / d_k = 1  ✓
```

### Complete Formula

```
                    Q K^T
Attention(Q, K, V) = softmax(─────) V
                       √d_k

Where:
- Q = X W_Q  (queries projected from input)
- K = X W_K  (keys projected from input)
- V = X W_V  (values projected from input)
- W_Q, W_K ∈ ℝ^(d_model × d_k)
- W_V ∈ ℝ^(d_model × d_v)
```

---

## 🌟 Multi-Head Attention

### Why Multiple Heads?

Single attention can only capture one type of relationship:

```
Sentence: "The cat sat on the mat because it was tired"

Questions attention might answer:
1. What does "it" refer to? → Focus on "cat"
2. Where did sitting happen? → Focus on "mat"
3. Why did sitting happen? → Focus on "tired"

Single attention: Can only focus on ONE aspect at a time!
Multi-head: Multiple parallel attention mechanisms, each learning different patterns!
```

### How Multi-Head Attention Works

```
┌──────────────────────────────────────────────────────────────────┐
│                    MULTI-HEAD ATTENTION                          │
│                                                                  │
│   Input: X                                                       │
│     │                                                            │
│     ├───→ [Linear W_Q] ─→ Q₁ ─┐                                 │
│     ├───→ [Linear W_K] ─→ K₁ ─┼─→ [Attention] ─→ head₁         │
│     ├───→ [Linear W_V] ─→ V₁ ─┘                                 │
│     │                                                            │
│     ├───→ [Linear W_Q] ─→ Q₂ ─┐                                 │
│     ├───→ [Linear W_K] ─→ K₂ ─┼─→ [Attention] ─→ head₂         │
│     ├───→ [Linear W_V] ─→ V₂ ─┘                                 │
│     │                                                            │
│     ├───→ [Linear W_Q] ─→ Q₃ ─┐                                 │
│     ├───→ [Linear W_K] ─→ K₃ ─┼─→ [Attention] ─→ head₃         │
│     └───→ [Linear W_V] ─→ V₃ ─┘                                 │
│            ...                  ...         ...                  │
│            ...                  ...         ...                  │
│                                                                  │
│     [head₁, head₂, ..., head_h] ─→ [Concat] ─→ [Linear W_O]     │
│                                                       │          │
│                                                       ↓          │
│                                                  Output          │
└──────────────────────────────────────────────────────────────────┘
```

### Multi-Head Attention Formula

```
MultiHead(Q, K, V) = Concat(head₁, head₂, ..., head_h) W^O

Where:
head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V)
```

**Dimensions:**
```
d_model = 512 (typical)
h = 8 heads (typical)
d_k = d_v = d_model / h = 64

For each head i:
- W_i^Q ∈ ℝ^(512 × 64)
- W_i^K ∈ ℝ^(512 × 64)
- W_i^V ∈ ℝ^(512 × 64)

After concat: 8 × 64 = 512 dimensions
W^O ∈ ℝ^(512 × 512) projects back to d_model
```

### What Different Heads Learn

Research has shown that different heads learn different things:

```
Head 1: Subject-verb agreement
        "The cats [that I saw yesterday] ARE cute"
        
Head 2: Coreference resolution
        "John said HE was tired" (HE → John)
        
Head 3: Next word prediction
        "She went to the..." → focus on "went"
        
Head 4: Syntactic structure
        Focus on matching brackets, quotes
        
Head 5: Semantic similarity
        "dog" attends to "puppy", "canine"
```

---

## 🎭 Types of Attention

### 1. Self-Attention (Intra-Attention)

Each position attends to all positions in the **same** sequence.

```
Input: "The cat sat"
       └──┬──┘
Self-attention: Each word looks at every other word

"sat" attends to: "The"(0.1), "cat"(0.7), "sat"(0.2)
                  └─── Who sat? The cat! ───┘
```

**Formula:**
```
Self-Attention(X) = Attention(XW_Q, XW_K, XW_V)
# Q, K, V all come from same input X
```

### 2. Cross-Attention

Query comes from one sequence, keys/values from another.

```
Translation: "Je suis étudiant" → "I am a student"

When generating "student":
Query: From decoder ("I am a")
Keys/Values: From encoder ("Je suis étudiant")

Cross-attention: "Where in French input should I look?"
```

**Formula:**
```
Cross-Attention = Attention(Decoder_XW_Q, Encoder_XW_K, Encoder_XW_V)
# Q from decoder, K,V from encoder
```

### 3. Masked Self-Attention (Causal Attention)

Used in **decoders** to prevent looking at future tokens.

```
Generating: "The cat sat on the ___"

When predicting after "sat":
- CAN look at: "The", "cat", "sat"
- CANNOT look at: "on", "the", "___" (future tokens!)

Mask matrix:
        The  cat  sat  on  the  ___
The      1    0    0   0   0    0
cat      1    1    0   0   0    0
sat      1    1    1   0   0    0
on       1    1    1   1   0    0
the      1    1    1   1   1    0
___      1    1    1   1   1    1
```

**Implementation:**
```python
# Create causal mask
mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()

# Apply mask before softmax
scores = scores.masked_fill(mask, float('-inf'))
# -inf becomes 0 after softmax!
```

---

## 🌍 Real World Use Cases

### 1. Machine Translation

```
English: "The cat sat on the mat"
French:  "Le chat était assis sur le tapis"

Attention matrix (generating "chat"):
         The   cat   sat   on   the   mat
chat     0.05  0.85  0.05  0.02  0.01  0.02
              ↑
           "cat" in English → "chat" in French
```

### 2. Text Summarization

```
Article: "Apple Inc. announced today that Tim Cook will present 
          the new iPhone 15 at their annual September event..."

Summary: "Apple to reveal iPhone 15"

Attention: Focuses on "Apple", "iPhone 15", "announce"
```

### 3. Question Answering

```
Context: "Paris is the capital of France. It has the Eiffel Tower."
Question: "What is the capital of France?"

Attention heatmap:
         Paris  is  the  capital  of  France  It  has  Eiffel  Tower
Answer:  0.35   0.1  0.1   0.15   0.1  0.15   0.01 0.01  0.01    0.02
         ↑                  ↑           ↑
         Key               Key        Key
```

### 4. Image Captioning

```
Image: [Picture of a dog catching a frisbee]

Generating "dog":
  Attention focuses on: pixels showing the dog
  
Generating "frisbee":
  Attention focuses on: pixels showing the frisbee
  
Generating "catching":
  Attention focuses on: dog's mouth near frisbee
```

---

## 💻 Sample Mini Project: Attention Visualizer

```python
"""
Visualize attention weights for text analysis
See which words attend to which!
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# ============================================
# STEP 1: IMPLEMENT ATTENTION
# ============================================

class ScaledDotProductAttention(nn.Module):
    """
    Scaled Dot-Product Attention as described in 
    'Attention Is All You Need' (Vaswani et al., 2017)
    """
    
    def __init__(self, d_k: int):
        super().__init__()
        self.d_k = d_k
        self.scale = np.sqrt(d_k)
    
    def forward(self, Q, K, V, mask=None):
        """
        Args:
            Q: Queries (batch, seq_len_q, d_k)
            K: Keys (batch, seq_len_k, d_k)
            V: Values (batch, seq_len_k, d_v)
            mask: Optional mask (batch, seq_len_q, seq_len_k)
        
        Returns:
            output: (batch, seq_len_q, d_v)
            attention_weights: (batch, seq_len_q, seq_len_k)
        """
        # Step 1: Compute attention scores
        # (batch, seq_q, d_k) @ (batch, d_k, seq_k) = (batch, seq_q, seq_k)
        scores = torch.matmul(Q, K.transpose(-2, -1))
        
        # Step 2: Scale
        scores = scores / self.scale
        
        # Step 3: Apply mask (if provided)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))
        
        # Step 4: Softmax to get attention weights
        attention_weights = F.softmax(scores, dim=-1)
        
        # Step 5: Weighted sum of values
        output = torch.matmul(attention_weights, V)
        
        return output, attention_weights


class MultiHeadAttention(nn.Module):
    """
    Multi-Head Attention with visualization support
    """
    
    def __init__(self, d_model: int, num_heads: int):
        super().__init__()
        assert d_model % num_heads == 0
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        # Linear projections
        self.W_Q = nn.Linear(d_model, d_model)
        self.W_K = nn.Linear(d_model, d_model)
        self.W_V = nn.Linear(d_model, d_model)
        self.W_O = nn.Linear(d_model, d_model)
        
        self.attention = ScaledDotProductAttention(self.d_k)
        
        # Store attention weights for visualization
        self.attention_weights = None
    
    def forward(self, Q, K, V, mask=None):
        batch_size = Q.size(0)
        
        # 1. Linear projections and reshape to (batch, heads, seq_len, d_k)
        Q = self.W_Q(Q).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        K = self.W_K(K).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        V = self.W_V(V).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        
        # 2. Apply attention
        if mask is not None:
            mask = mask.unsqueeze(1)  # Add head dimension
        
        x, attn_weights = self.attention(Q, K, V, mask)
        self.attention_weights = attn_weights  # Store for visualization
        
        # 3. Concatenate heads
        x = x.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        
        # 4. Final linear projection
        x = self.W_O(x)
        
        return x

# ============================================
# STEP 2: VISUALIZATION FUNCTIONS
# ============================================

def visualize_attention(attention_weights, tokens_q, tokens_k, title="Attention Weights"):
    """
    Create heatmap visualization of attention weights
    
    Args:
        attention_weights: (seq_len_q, seq_len_k) numpy array
        tokens_q: List of query tokens
        tokens_k: List of key tokens
        title: Plot title
    """
    plt.figure(figsize=(10, 8))
    
    sns.heatmap(
        attention_weights,
        xticklabels=tokens_k,
        yticklabels=tokens_q,
        annot=True,
        fmt='.2f',
        cmap='Blues',
        vmin=0,
        vmax=1
    )
    
    plt.xlabel('Keys (attending TO)')
    plt.ylabel('Queries (attending FROM)')
    plt.title(title)
    plt.tight_layout()
    plt.show()


def visualize_multihead_attention(attention_weights, tokens, num_heads=4):
    """
    Visualize attention patterns from multiple heads
    
    Args:
        attention_weights: (num_heads, seq_len, seq_len) numpy array
        tokens: List of tokens
        num_heads: Number of heads to display
    """
    fig, axes = plt.subplots(1, num_heads, figsize=(4*num_heads, 4))
    
    for i, ax in enumerate(axes):
        sns.heatmap(
            attention_weights[i],
            xticklabels=tokens,
            yticklabels=tokens,
            ax=ax,
            cmap='Blues',
            vmin=0,
            vmax=1
        )
        ax.set_title(f'Head {i+1}')
        ax.set_xlabel('Keys')
        if i == 0:
            ax.set_ylabel('Queries')
    
    plt.tight_layout()
    plt.show()

# ============================================
# STEP 3: DEMO WITH SAMPLE SENTENCE
# ============================================

def demo_attention():
    """
    Demonstrate attention on a simple sentence
    """
    # Sample sentence
    sentence = "The cat sat on the mat"
    tokens = sentence.lower().split()
    print(f"Sentence: {sentence}")
    print(f"Tokens: {tokens}")
    
    # Create simple embeddings (in real model, these would be learned)
    vocab = {word: i for i, word in enumerate(set(tokens))}
    print(f"Vocabulary: {vocab}")
    
    # Parameters
    d_model = 64
    num_heads = 4
    seq_len = len(tokens)
    
    # Random embeddings (pretend these are learned word vectors)
    torch.manual_seed(42)
    embeddings = torch.randn(1, seq_len, d_model)
    
    # Create multi-head attention
    mha = MultiHeadAttention(d_model=d_model, num_heads=num_heads)
    
    # Forward pass (self-attention: Q=K=V=embeddings)
    output = mha(embeddings, embeddings, embeddings)
    
    # Get attention weights: (batch=1, heads, seq_len, seq_len)
    attn_weights = mha.attention_weights.detach().numpy()
    
    # Visualize each head
    print("\n" + "="*50)
    print("ATTENTION WEIGHTS PER HEAD")
    print("="*50)
    
    for head_idx in range(num_heads):
        print(f"\nHead {head_idx + 1}:")
        weights = attn_weights[0, head_idx]
        
        # Print as table
        print(f"{'':8}", end="")
        for t in tokens:
            print(f"{t:8}", end="")
        print()
        
        for i, t in enumerate(tokens):
            print(f"{t:8}", end="")
            for j in range(seq_len):
                print(f"{weights[i,j]:.4f}  ", end="")
            print()
    
    # Visualize (uncomment to see plots)
    # visualize_multihead_attention(attn_weights[0], tokens, num_heads)
    
    return attn_weights


def demo_causal_attention():
    """
    Demonstrate causal (masked) attention for autoregressive models
    """
    sentence = "I love machine learning"
    tokens = sentence.lower().split()
    seq_len = len(tokens)
    d_model = 64
    
    print("\nCAUSAL ATTENTION DEMO")
    print("="*50)
    print(f"Sentence: {sentence}")
    
    # Create causal mask
    # mask[i,j] = 1 if i >= j (can attend), 0 otherwise
    causal_mask = torch.tril(torch.ones(seq_len, seq_len))
    
    print("\nCausal Mask (lower triangular):")
    print("1 = can attend, 0 = cannot attend (future tokens)")
    print(f"{'':12}", end="")
    for t in tokens:
        print(f"{t:12}", end="")
    print()
    
    for i, t in enumerate(tokens):
        print(f"{t:12}", end="")
        for j in range(seq_len):
            print(f"{int(causal_mask[i,j]):12}", end="")
        print()
    
    print("\nInterpretation:")
    print("- 'I' can only see 'I'")
    print("- 'love' can see 'I', 'love'")
    print("- 'machine' can see 'I', 'love', 'machine'")
    print("- 'learning' can see all previous tokens")


# ============================================
# RUN DEMO
# ============================================

if __name__ == "__main__":
    print("="*60)
    print("      ATTENTION MECHANISM VISUALIZER")
    print("="*60)
    
    demo_attention()
    demo_causal_attention()
    
    print("\n" + "="*60)
    print("KEY INSIGHTS:")
    print("="*60)
    print("""
    1. Each head learns different attention patterns
    2. Some heads might focus on nearby words (local)
    3. Some heads might focus on related words (semantic)
    4. Causal masking prevents looking at future tokens
    5. Attention weights sum to 1 for each query
    """)
```

**Expected Output:**
```
============================================================
      ATTENTION MECHANISM VISUALIZER
============================================================
Sentence: The cat sat on the mat
Tokens: ['the', 'cat', 'sat', 'on', 'the', 'mat']
Vocabulary: {'mat': 0, 'cat': 1, 'the': 2, 'sat': 3, 'on': 4}

==================================================
ATTENTION WEIGHTS PER HEAD
==================================================

Head 1:
        the     cat     sat     on      the     mat     
the     0.1523  0.1756  0.1892  0.1543  0.1623  0.1663  
cat     0.1445  0.2134  0.1756  0.1432  0.1567  0.1666  
sat     0.1534  0.1867  0.1923  0.1478  0.1589  0.1609  
...
```

---

## 📝 Homework

### Easy
1. **Trace attention by hand** for 3 tokens with d_k=2. Compute scores, softmax, output.
2. **Explain Query, Key, Value** using your own analogy (not the library one)
3. **Modify the visualizer** to show attention for a different sentence

### Medium
4. **Implement scaled dot-product attention** from scratch without using the code above
5. **Compare attention weights** for "The bank by the river" vs "I went to the bank" - how does context change attention?
6. **Visualize cross-attention** between two different sentences (encoder-decoder style)

### Hard
7. **Implement multi-head attention** from scratch including the linear projections
8. **Create attention for different modalities**: text attends to image regions
9. **Implement relative positional attention** (used in modern models like T5)

---

## ⚠️ Common Mistakes

### 1. Forgetting to Scale

```python
# WRONG - scores can become very large
scores = Q @ K.transpose(-2, -1)
attention = softmax(scores)  # Softmax saturates!

# RIGHT - scale by sqrt(d_k)
scores = Q @ K.transpose(-2, -1) / math.sqrt(d_k)
attention = softmax(scores)  # Stable softmax
```

### 2. Wrong Matrix Dimensions

```python
# Common confusion about which dimension to transpose
Q: (batch, seq_q, d_k)
K: (batch, seq_k, d_k)

# WRONG
scores = Q @ K  # Matrix multiplication fails!

# RIGHT
scores = Q @ K.transpose(-2, -1)  # (batch, seq_q, seq_k)
```

### 3. Incorrect Mask Application

```python
# WRONG - applying mask after softmax
attention = softmax(scores)
attention = attention * mask  # Messes up probability distribution!

# RIGHT - apply mask before softmax with -inf
scores = scores.masked_fill(mask == 0, float('-inf'))
attention = softmax(scores)  # -inf becomes 0 after softmax
```

### 4. Confusing Self-Attention vs Cross-Attention

```python
# Self-attention: Q, K, V all from same source
self_attn = attention(X @ W_Q, X @ W_K, X @ W_V)

# Cross-attention: Q from one source, K,V from another
cross_attn = attention(decoder @ W_Q, encoder @ W_K, encoder @ W_V)
```

### 5. Not Handling Variable Sequence Lengths

```python
# WRONG - ignoring padding
output = attention(Q, K, V)

# RIGHT - mask out padding tokens
padding_mask = (input_ids != pad_token_id)  # (batch, seq_len)
padding_mask = padding_mask.unsqueeze(1)     # (batch, 1, seq_len)
output = attention(Q, K, V, mask=padding_mask)
```

---

## 🎤 Interview Questions & Answers

### Beginner Level

**Q1: What is attention in neural networks?**

**A:** Attention is a mechanism that allows a model to focus on relevant parts of the input when producing an output. Instead of compressing all information into a fixed-size vector (like RNN), attention lets the model "look back" at all input positions and decide which ones are most relevant for the current task.

Think of it like a spotlight that highlights important information.

---

**Q2: What are Query, Key, and Value in attention?**

**A:**
- **Query (Q):** "What am I looking for?" - represents the current position seeking information
- **Key (K):** "What do I contain?" - represents what each position offers
- **Value (V):** "What should I return?" - the actual content to retrieve

The process: Compare Query with all Keys to get similarity scores, then use those scores to weight the Values.

---

**Q3: Why do we scale by √d_k in scaled dot-product attention?**

**A:** When dimension d_k is large, dot products can become very large in magnitude. This pushes softmax into regions where it has extremely small gradients (saturates). Scaling by √d_k keeps the variance of dot products at 1, preventing softmax saturation and maintaining stable gradients.

---

### Intermediate Level

**Q4: What's the difference between self-attention and cross-attention?**

**A:**
- **Self-attention:** Q, K, V all come from the same sequence. Each position attends to all positions in the same input. Used in encoders to build representations.

- **Cross-attention:** Q comes from one sequence (e.g., decoder), K and V from another (e.g., encoder output). Used to let decoder "look at" encoder information during generation.

---

**Q5: Why use multi-head attention instead of single attention?**

**A:** Different aspects of language require different attention patterns:
- Subject-verb agreement needs different focus than coreference
- Syntactic structure differs from semantic similarity

Multi-head attention runs multiple attention operations in parallel, each with different learned projections. This allows the model to capture multiple types of relationships simultaneously.

The outputs are concatenated and projected back, combining all perspectives.

---

**Q6: How is masking implemented in attention?**

**A:**
1. Create mask matrix where 0 = mask out, 1 = keep
2. Before softmax, add mask: `scores = scores.masked_fill(mask == 0, -inf)`
3. After softmax, -inf positions become 0 (contribute nothing)

This is used for:
- **Padding mask:** Ignore padding tokens
- **Causal mask:** Prevent looking at future tokens (autoregressive)

---

### Advanced Level

**Q7: Derive the computational complexity of self-attention.**

**A:**
For sequence length n and dimension d:

1. **Q, K, V projections:** 3 × n × d × d = O(nd²)
2. **QK^T computation:** n × n × d = O(n²d)
3. **Softmax:** O(n²)
4. **Attention × V:** n × n × d = O(n²d)
5. **Output projection:** n × d × d = O(nd²)

**Total: O(n²d + nd²)**

For typical transformers, n² dominates when sequence length is large.
This is why long sequences are expensive!

---

**Q8: How does attention help with interpretability?**

**A:** Attention weights provide a window into what the model "focuses on":

1. **Visualization:** Plot attention heatmaps to see which input tokens influence each output
2. **Debugging:** If model fails, check if attention is looking at wrong places
3. **Analysis:** Discover learned linguistic patterns (heads for syntax, semantics, etc.)

**Caveats:**
- Attention ≠ explanation (it's what the model looks at, not why)
- Multiple paths can lead to same output
- Should be used as one tool among many for interpretability

---

### FAANG Level

**Q9: Describe attention variants that address the O(n²) complexity problem.**

**A:**
1. **Sparse Attention (Longformer, BigBird):** Only attend to local windows + some global tokens
   - Complexity: O(n)

2. **Linear Attention (Performers, Linear Transformer):** Use kernel trick to decompose QK^T
   - Change softmax(QK^T)V to φ(Q)(φ(K)^TV)
   - Complexity: O(n)

3. **Low-Rank Attention (Linformer):** Project K, V to lower dimension
   - Complexity: O(n)

4. **Chunked Attention (Flash Attention):** Memory-efficient implementation
   - Same complexity but much faster due to hardware awareness

5. **Mixture of Experts:** Not all heads process all tokens
   - Complexity: O(n) per token

---

**Q10: Design an attention mechanism for a task where we need to attend over both text and images simultaneously.**

**A:**
**Multi-Modal Attention Design:**

```
Text:  [t1, t2, ..., tn]  → Text Encoder → [T1, T2, ..., Tn]
Image: [Patch 1, ..., Pm] → Image Encoder → [I1, I2, ..., Im]

Approach 1: Cross-Modal Attention
- Text Query attends to Image Keys/Values
- Image Query attends to Text Keys/Values
- Bidirectional information flow

Approach 2: Unified Self-Attention
- Concatenate: [CLS, T1, ..., Tn, SEP, I1, ..., Im]
- Single self-attention over combined sequence
- Model learns cross-modal relationships

Approach 3: Co-Attention
- Two parallel attention streams
- Exchange information via cross-attention layers
- Used in CLIP, ALIGN

Key Considerations:
- Positional encoding: Different for text (sequential) vs image (2D)
- Modality tokens: Add learned embeddings to distinguish modalities
- Scaling: Image patches >> text tokens typically
```

---

## 🔗 Next Steps

Now that you understand attention, you're ready for:

**➡️ 03-Transformers-Architecture.md** - See how attention is assembled into the full Transformer architecture that powers GPT, BERT, and all modern LLMs!

The Transformer removes RNNs entirely and relies **purely on attention** - "Attention Is All You Need"!
