# 📘 Encoder-Decoder Architecture



## 📑 Table of Contents

- [**Purpose (Why this exists):**](#purpose-why-this-exists)
- [**What it is:**](#what-it-is)
- [**How it works (Intuition):**](#how-it-works-intuition)
- [**How it works (Math – simplified):**](#how-it-works-math-simplified)
- [**Visual Explanation (described):**](#visual-explanation-described)
- [**Simple Example:**](#simple-example)
- [**Real-World Applications:**](#real-world-applications)
- [**Common Misconceptions:**](#common-misconceptions)
- [**Best Practices:**](#best-practices)
- [**Key Takeaways:**](#key-takeaways)
- [✅ **Review Questions:**](#review-questions)
- [🧩 **Practice Problems:**](#practice-problems)
- [🚀 **Mini Project:**](#mini-project)

---

---

## **Purpose (Why this exists):**

### **The Sequence-to-Sequence Problem:**

```javascript
// Many real-world tasks involve transforming one sequence to another

const sequence_tasks = {
  translation: {
    input: "I love cats",           // English
    output: "J'aime les chats"      // French
  },
  
  summarization: {
    input: "The quick brown fox jumps over the lazy dog...",  // Long text
    output: "A fox jumps over a dog"                          // Summary
  },
  
  questionAnswering: {
    input: "Context: Paris is the capital of France. Question: What is the capital of France?",
    output: "Paris"
  },
  
  dialogue: {
    input: "Hello, how are you?",
    output: "I'm doing great, thanks!"
  }
};

// Challenge: Input and output are DIFFERENT sequences with DIFFERENT lengths
```

**Why NOT Just Encoder or Just Decoder?**

```javascript
// Encoder-Only (like BERT)
const encoderOnly = {
  strength: 'Understanding input',
  weakness: 'Cannot generate variable-length output',
  use: 'Classification, encoding'
};

// Example: Sentiment classification
input: "I love this movie"  →  [ENCODER]  →  output: "Positive" ✓

// But cannot do translation:
input: "I love cats"  →  [ENCODER]  →  output: ??? (no generation mechanism) ✗

// Decoder-Only (like GPT)
const decoderOnly = {
  strength: 'Generating sequences',
  weakness: 'Processes input and output together (autoregressive)',
  use: 'Text generation'
};

// Can do translation but less efficiently:
input: "Translate: I love cats\nFrench:"  →  [DECODER]  →  "J'aime les chats" ✓
// But treats input + output as one sequence (less structured)

// Encoder-Decoder (like T5, BART)
const encoderDecoder = {
  strength: 'Separate processing of input and output',
  benefits: [
    'Encoder focuses on understanding input',
    'Decoder focuses on generating output',
    'Explicit cross-attention (decoder attends to encoder)',
    'More parameter-efficient for seq2seq tasks'
  ],
  use: 'Translation, summarization, question answering'
};

input: "I love cats"  →  [ENCODER] → representations → [DECODER] → "J'aime les chats" ✓
```

---

## **What it is:**

### **High-Level Definition:**

An architecture with **two main components**:

1. **Encoder:** Processes and understands the input sequence
2. **Decoder:** Generates the output sequence, attending to encoder outputs

```javascript
const EncoderDecoderArchitecture = {
  encoder: {
    input: 'Source sequence (e.g., English sentence)',
    process: 'Self-attention on input → understands context',
    output: 'Encoded representations'
  },
  
  decoder: {
    input: 'Target sequence so far (e.g., French words generated)',
    process: [
      'Self-attention on what has been generated',
      'Cross-attention to encoder outputs',
      'Generate next token'
    ],
    output: 'Next token in target sequence'
  },
  
  connection: 'Decoder attends to encoder via cross-attention'
};
```

### **Architecture Diagram:**

```
Input: "I love cats"
    ↓
┌─────────────────────┐
│      ENCODER        │
│                     │
│  ┌───────────────┐  │
│  │ Self-Attention│  │  ← Understands input
│  └───────┬───────┘  │
│          ↓          │
│  ┌───────────────┐  │
│  │ Feed-Forward  │  │
│  └───────┬───────┘  │
│          ↓          │
│  (Repeat × N layers)│
└──────────┬──────────┘
           ↓
    Encoder Output
     (memory)
           ↓
┌──────────┴──────────┐
│      DECODER        │
│                     │
│  Start: <START>     │
│          ↓          │
│  ┌───────────────┐  │
│  │ Self-Attention│  │  ← Attends to previously generated tokens
│  └───────┬───────┘  │
│          ↓          │
│  ┌───────────────┐  │
│  │Cross-Attention│  │  ← Attends to encoder output!
│  └───────┬───────┘  │
│          ↓          │
│  ┌───────────────┐  │
│  │ Feed-Forward  │  │
│  └───────┬───────┘  │
│          ↓          │
│  (Repeat × N layers)│
│          ↓          │
│  Output: "J'"       │
│  Output: "'aime"    │
│  Output: "les"      │
│  Output: "chats"    │
└─────────────────────┘
```

---

## **How it works (Intuition):**

### **The Interpreter Analogy:**

Imagine a professional interpreter translating a speech:

**Encoder = Listening Phase:**
```
Speaker says: "The quick brown fox jumps over the lazy dog"

Interpreter (Encoder):
  Step 1: Listens to ENTIRE sentence first
  Step 2: Understands context, subject, verb, objects
  Step 3: Forms mental representation
  Step 4: Stores understanding in memory
  
Result: Complete understanding of the message
```

**Decoder = Speaking Phase:**
```
Interpreter (Decoder):
  Step 1: Starts speaking in target language
  Step 2: While speaking, CONSTANTLY refers back to understood message
  Step 3: Generates one word at a time
  Step 4: Each new word depends on:
          a) What has been said so far (self-attention)
          b) The original message (cross-attention to encoder)
  
Result: Fluent translation
```

**Key Insight:**

> The decoder doesn't just memorize and repeat. It **actively attends** to the encoder's understanding while generating each word!

### **Step-by-Step Translation Example:**

```
Input (English): "I love cats"

ENCODER PHASE:
  Token 1: "I"    → Encoder layer 1 → ... → Encoder layer 6 → h₁
  Token 2: "love" → Encoder layer 1 → ... → Encoder layer 6 → h₂
  Token 3: "cats" → Encoder layer 1 → ... → Encoder layer 6 → h₃
  
  Encoder outputs: [h₁, h₂, h₃] (stored in memory)

DECODER PHASE:
  Step 1:
    Generated so far: [<START>]
    Decoder looks at: <START> (self-attention)
    Decoder looks at: [h₁, h₂, h₃] (cross-attention)
    Decoder thinks: "Need to generate first word... 'I' is subject..."
    Decoder outputs: "J'"
  
  Step 2:
    Generated so far: [<START>, "J'"]
    Decoder looks at: <START>, "J'" (self-attention)
    Decoder looks at: [h₁, h₂, h₃] (cross-attention)
    Decoder thinks: "After 'J'', need verb... 'love' → 'aime'"
    Decoder outputs: "aime"
  
  Step 3:
    Generated so far: [<START>, "J'", "aime"]
    Decoder looks at: <START>, "J'", "aime" (self-attention)
    Decoder looks at: [h₁, h₂, h₃] (cross-attention)
    Decoder thinks: "Need article... 'cats' is plural → 'les'"
    Decoder outputs: "les"
  
  Step 4:
    Generated so far: [<START>, "J'", "aime", "les"]
    Decoder looks at: <START>, "J'", "aime", "les" (self-attention)
    Decoder looks at: [h₁, h₂, h₃] (cross-attention)
    Decoder thinks: "'cats' → 'chats'"
    Decoder outputs: "chats"
  
  Step 5:
    Generated so far: [<START>, "J'", "aime", "les", "chats"]
    Decoder outputs: <END>
  
Final output: "J'aime les chats"
```

### **Cross-Attention in Detail:**

```
When generating "chats" (French for "cats"):

Decoder's cross-attention:
  Query: "What word should I generate now?"
  
  Keys (from encoder): 
    h₁ ("I")    → Low relevance
    h₂ ("love") → Low relevance
    h₃ ("cats") → HIGH relevance!  ← Strong attention here!
  
  Attention weights:
    "I":    0.10
    "love": 0.15
    "cats": 0.75  ← Focuses on this
  
  Values: Weighted combination of encoder outputs
  
  Result: Decoder strongly attends to "cats" encoding,
          helping it generate "chats"
```

---

## **How it works (Math – simplified):**

### **Encoder Math:**

```
Given input tokens: [x₁, x₂, ..., x_n]

1. Embedding + Positional Encoding:
   X = Embedding(tokens) + PositionalEncoding

2. For each encoder layer l (1 to N):
   
   a) Self-Attention:
      Q, K, V = X × W_Q, X × W_K, X × W_V
      Attention = softmax(QK^T / √d_k) × V
      X = LayerNorm(X + Attention)
   
   b) Feed-Forward:
      FF = FFN(X)
      X = LayerNorm(X + FF)

3. Final encoder output:
   H = [h₁, h₂, ..., h_n]  (one for each input token)
```

### **Decoder Math:**

```
Given encoder output H and target tokens generated so far: [y₁, y₂, ..., y_t]

1. Embedding + Positional Encoding:
   Y = Embedding(target_tokens) + PositionalEncoding

2. For each decoder layer l (1 to N):
   
   a) Masked Self-Attention (causal):
      Q, K, V = Y × W_Q, Y × W_K, Y × W_V
      mask = causal_mask (prevent looking at future tokens)
      Attention = softmax(QK^T / √d_k + mask) × V
      Y = LayerNorm(Y + Attention)
   
   b) Cross-Attention (to encoder):
      Q = Y × W_Q           ← From decoder
      K = H × W_K           ← From encoder!
      V = H × W_V           ← From encoder!
      CrossAttn = softmax(QK^T / √d_k) × V
      Y = LayerNorm(Y + CrossAttn)
   
   c) Feed-Forward:
      FF = FFN(Y)
      Y = LayerNorm(Y + FF)

3. Output projection:
   logits = Y × W_output
   probs = softmax(logits)
   next_token = sample(probs)
```

### **JavaScript Implementation:**

```javascript
class EncoderDecoderTransformer {
  constructor(config) {
    this.encoder = new TransformerEncoder(config);
    this.decoder = new TransformerDecoder(config);
    this.outputProjection = new Linear(config.d_model, config.vocab_size);
  }
  
  encode(src_tokens) {
    // src_tokens: [batch_size, src_len]
    const encoder_output = this.encoder.forward(src_tokens);
    return encoder_output;
  }
  
  decode(tgt_tokens, encoder_output) {
    // tgt_tokens: [batch_size, tgt_len]
    // encoder_output: [batch_size, src_len, d_model]
    
    const decoder_output = this.decoder.forward(tgt_tokens, encoder_output);
    const logits = this.outputProjection.forward(decoder_output);
    return logits;
  }
  
  forward(src_tokens, tgt_tokens) {
    const encoder_output = this.encode(src_tokens);
    const logits = this.decode(tgt_tokens, encoder_output);
    return logits;
  }
  
  generate(src_tokens, max_length = 50) {
    // Encode source
    const encoder_output = this.encode(src_tokens);
    
    // Start with <START> token
    let generated = [this.start_token_id];
    
    for (let i = 0; i < max_length; i++) {
      // Decode
      const logits = this.decode(generated, encoder_output);
      
      // Get next token logits (last position)
      const next_token_logits = logits[logits.length - 1];
      
      // Sample
      const next_token = this.sample(next_token_logits);
      generated.push(next_token);
      
      // Stop if <END> token
      if (next_token === this.end_token_id) {
        break;
      }
    }
    
    return generated;
  }
  
  sample(logits) {
    const probs = this.softmax(logits);
    return this.argmax(probs);  // Greedy sampling (can use temperature, beam search, etc.)
  }
  
  softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }
  
  argmax(arr) {
    return arr.indexOf(Math.max(...arr));
  }
}

class TransformerEncoder {
  constructor(config) {
    this.layers = [];
    for (let i = 0; i < config.num_layers; i++) {
      this.layers.push(new EncoderLayer(config));
    }
    this.embedding = new Embedding(config.vocab_size, config.d_model);
    this.positional = new PositionalEncoding(config.d_model);
  }
  
  forward(tokens) {
    let X = this.embedding.forward(tokens);
    X = this.positional.forward(X);
    
    for (let layer of this.layers) {
      X = layer.forward(X);
    }
    
    return X;
  }
}

class EncoderLayer {
  constructor(config) {
    this.selfAttention = new MultiHeadAttention(config.d_model, config.num_heads);
    this.feedForward = new FeedForward(config.d_model, config.d_ff);
    this.norm1 = new LayerNorm(config.d_model);
    this.norm2 = new LayerNorm(config.d_model);
  }
  
  forward(X) {
    // Self-attention
    const attn_out = this.selfAttention.forward(X);
    X = this.norm1.forward(this.add(X, attn_out));
    
    // Feed-forward
    const ff_out = this.feedForward.forward(X);
    X = this.norm2.forward(this.add(X, ff_out));
    
    return X;
  }
  
  add(A, B) {
    return A.map((row, i) => row.map((val, j) => val + B[i][j]));
  }
}

class TransformerDecoder {
  constructor(config) {
    this.layers = [];
    for (let i = 0; i < config.num_layers; i++) {
      this.layers.push(new DecoderLayer(config));
    }
    this.embedding = new Embedding(config.vocab_size, config.d_model);
    this.positional = new PositionalEncoding(config.d_model);
  }
  
  forward(tokens, encoder_output) {
    let X = this.embedding.forward(tokens);
    X = this.positional.forward(X);
    
    for (let layer of this.layers) {
      X = layer.forward(X, encoder_output);
    }
    
    return X;
  }
}

class DecoderLayer {
  constructor(config) {
    this.selfAttention = new MultiHeadAttention(config.d_model, config.num_heads);
    this.crossAttention = new MultiHeadAttention(config.d_model, config.num_heads);  // New!
    this.feedForward = new FeedForward(config.d_model, config.d_ff);
    this.norm1 = new LayerNorm(config.d_model);
    this.norm2 = new LayerNorm(config.d_model);
    this.norm3 = new LayerNorm(config.d_model);
  }
  
  forward(X, encoder_output) {
    // Masked self-attention
    const self_attn_out = this.selfAttention.forward(X, mask='causal');
    X = this.norm1.forward(this.add(X, self_attn_out));
    
    // Cross-attention to encoder
    const cross_attn_out = this.crossAttention.forward(
      query=X,                // From decoder
      key_value=encoder_output  // From encoder!
    );
    X = this.norm2.forward(this.add(X, cross_attn_out));
    
    // Feed-forward
    const ff_out = this.feedForward.forward(X);
    X = this.norm3.forward(this.add(X, ff_out));
    
    return X;
  }
  
  add(A, B) {
    return A.map((row, i) => row.map((val, j) => val + B[i][j]));
  }
}
```

### **Cross-Attention Implementation:**

```javascript
class CrossAttention {
  constructor(d_model, d_k) {
    this.d_k = d_k;
    this.W_Q = this.randomMatrix(d_model, d_k);  // For decoder
    this.W_K = this.randomMatrix(d_model, d_k);  // For encoder
    this.W_V = this.randomMatrix(d_model, d_k);  // For encoder
  }
  
  forward(decoder_hidden, encoder_output) {
    // decoder_hidden: [tgt_len, d_model]
    // encoder_output: [src_len, d_model]
    
    // Query from decoder
    const Q = this.matmul(decoder_hidden, this.W_Q);  // [tgt_len, d_k]
    
    // Key and Value from encoder
    const K = this.matmul(encoder_output, this.W_K);  // [src_len, d_k]
    const V = this.matmul(encoder_output, this.W_V);  // [src_len, d_k]
    
    // Attention scores: decoder positions × encoder positions
    const scores = this.matmul(Q, this.transpose(K));  // [tgt_len, src_len]
    const scaled = this.scale(scores, Math.sqrt(this.d_k));
    
    // Softmax over source positions
    const attention_weights = this.softmax(scaled);  // [tgt_len, src_len]
    
    // Apply to encoder values
    const output = this.matmul(attention_weights, V);  // [tgt_len, d_k]
    
    return { output, attention_weights };
  }
  
  // ... matrix operations
}

// Example
const cross_attn = new CrossAttention(d_model=512, d_k=64);

const decoder_state = [[0.1, 0.2, ...], [0.3, 0.4, ...]];  // 2 tokens generated
const encoder_output = [[0.5, 0.6, ...], [0.7, 0.8, ...], [0.9, 1.0, ...]];  // 3 source tokens

const { output, attention_weights } = cross_attn.forward(decoder_state, encoder_output);

console.log("Cross-attention weights:");
console.log(attention_weights);
// [
//   [0.3, 0.5, 0.2],  // First decoder token attends to encoder tokens
//   [0.1, 0.2, 0.7]   // Second decoder token attends to encoder tokens
// ]
```

---

## **Visual Explanation (described):**

### **Information Flow:**

```
SOURCE: "I love cats"
   │
   ▼
┌──────────────────────────┐
│  ENCODER                 │
│                          │
│  Layer 1:                │
│    Self-Attn: "I" ↔ "love" ↔ "cats"
│    Feed-Forward          │
│                          │
│  Layer 2:                │
│    Self-Attn: Deeper relationships
│    Feed-Forward          │
│                          │
│  ...                     │
│                          │
│  Layer 6:                │
│    Output: [h_I, h_love, h_cats]
└────────────┬─────────────┘
             │
             ▼ (Encoder output stored)
             │
┌────────────▼─────────────┐
│  DECODER                 │
│                          │
│  Generated: <START>      │
│                          │
│  Layer 1:                │
│    Self-Attn: <START>    │
│    Cross-Attn: Look at [h_I, h_love, h_cats]  ← Key!
│    Feed-Forward          │
│    Output: "J'"          │
│                          │
│  Generated: <START>, J'  │
│                          │
│  Layer 1:                │
│    Self-Attn: <START> ↔ J'
│    Cross-Attn: Look at [h_I, h_love, h_cats]  ← Key!
│    Feed-Forward          │
│    Output: "aime"        │
│                          │
│  Generated: <START>, J', aime
│                          │
│  Layer 1:                │
│    Self-Attn: <START> ↔ J' ↔ aime
│    Cross-Attn: Look at [h_I, h_love, h_cats]  ← Key!
│    Feed-Forward          │
│    Output: "les"         │
│                          │
│  ... (continue until <END>)
└──────────────────────────┘

TARGET: "J'aime les chats"
```

### **Cross-Attention Visualization:**

```
When generating "chats":

Decoder Query: "What should I generate?"
       ↓
┌──────────────────────────┐
│   Cross-Attention        │
│                          │
│   Decoder position:      │
│     [J', aime, les, ???] │
│             ↓            │
│        Queries (Q)       │
│             │            │
│             ▼            │
│   ┌─────────────────┐   │
│   │  Attention to:  │   │
│   │  ┌──┬──────┬───┐│   │
│   │  │I │ love │cat││   │  ← Encoder output
│   │  └──┴──────┴───┘│   │
│   │   ↓    ↓    ↓   │   │
│   │  0.1  0.1  0.8  │   │  ← Attention weights
│   └─────────────────┘   │
│             ↓            │
│   Weighted combination   │
│   = mostly "cats" info   │
│             ↓            │
│     Generate "chats"     │
└──────────────────────────┘
```

### **Masked Self-Attention in Decoder:**

```
Decoder generated so far: ["J'", "aime", "les"]
Currently generating: position 3

Self-Attention Mask:
        J'  aime  les  ???
J'      ✓   ✗    ✗    ✗    ← Can only see itself
aime    ✓   ✓    ✗    ✗    ← Can see J', aime
les     ✓   ✓    ✓    ✗    ← Can see J', aime, les
???     ✓   ✓    ✓    ✓    ← Can see all previous

✓ = Can attend to (visible)
✗ = Cannot attend to (masked out, future tokens)

This prevents "cheating" - model cannot look ahead!
```

---

## **Simple Example:**

### **Complete PyTorch Implementation:**

```python
import torch
import torch.nn as nn
import math

class EncoderDecoderTransformer(nn.Module):
    def __init__(self, src_vocab_size, tgt_vocab_size, 
                 d_model=512, nhead=8, num_encoder_layers=6, num_decoder_layers=6):
        super().__init__()
        
        self.d_model = d_model
        
        # Embeddings
        self.src_embedding = nn.Embedding(src_vocab_size, d_model)
        self.tgt_embedding = nn.Embedding(tgt_vocab_size, d_model)
        self.pos_encoding = PositionalEncoding(d_model)
        
        # Transformer
        self.transformer = nn.Transformer(
            d_model=d_model,
            nhead=nhead,
            num_encoder_layers=num_encoder_layers,
            num_decoder_layers=num_decoder_layers,
            dim_feedforward=2048,
            dropout=0.1,
            batch_first=True
        )
        
        # Output projection
        self.output_projection = nn.Linear(d_model, tgt_vocab_size)
    
    def forward(self, src, tgt, src_mask=None, tgt_mask=None, 
                src_padding_mask=None, tgt_padding_mask=None):
        # src: [batch, src_len]
        # tgt: [batch, tgt_len]
        
        # Embed and encode
        src = self.src_embedding(src) * math.sqrt(self.d_model)
        tgt = self.tgt_embedding(tgt) * math.sqrt(self.d_model)
        
        src = self.pos_encoding(src)
        tgt = self.pos_encoding(tgt)
        
        # Transformer
        output = self.transformer(
            src, tgt,
            src_mask=src_mask,
            tgt_mask=tgt_mask,
            src_key_padding_mask=src_padding_mask,
            tgt_key_padding_mask=tgt_padding_mask
        )
        
        # Project to vocabulary
        logits = self.output_projection(output)
        
        return logits
    
    def encode(self, src, src_mask=None):
        """Encode source sequence"""
        src = self.src_embedding(src) * math.sqrt(self.d_model)
        src = self.pos_encoding(src)
        
        # Get encoder only
        memory = self.transformer.encoder(src, mask=src_mask)
        return memory
    
    def decode(self, tgt, memory, tgt_mask=None):
        """Decode target sequence given encoder memory"""
        tgt = self.tgt_embedding(tgt) * math.sqrt(self.d_model)
        tgt = self.pos_encoding(tgt)
        
        # Get decoder only
        output = self.transformer.decoder(tgt, memory, tgt_mask=tgt_mask)
        logits = self.output_projection(output)
        return logits
    
    @torch.no_grad()
    def generate(self, src, max_length=50, start_token=1, end_token=2):
        """Generate target sequence autoregressively"""
        self.eval()
        
        # Encode source
        memory = self.encode(src)
        
        # Start with <START> token
        batch_size = src.size(0)
        generated = torch.full((batch_size, 1), start_token, dtype=torch.long, device=src.device)
        
        for _ in range(max_length):
            # Create causal mask
            tgt_mask = nn.Transformer.generate_square_subsequent_mask(generated.size(1)).to(src.device)
            
            # Decode
            logits = self.decode(generated, memory, tgt_mask=tgt_mask)
            
            # Get next token (greedy)
            next_token = logits[:, -1, :].argmax(dim=-1, keepdim=True)
            
            # Append
            generated = torch.cat([generated, next_token], dim=1)
            
            # Stop if all sequences have <END> token
            if (next_token == end_token).all():
                break
        
        return generated


class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1).float()
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                            (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        return x + self.pe[:, :x.size(1), :]


# Usage
model = EncoderDecoderTransformer(
    src_vocab_size=10000,  # English
    tgt_vocab_size=10000,  # French
    d_model=512,
    nhead=8,
    num_encoder_layers=6,
    num_decoder_layers=6
)

# Training
criterion = nn.CrossEntropyLoss(ignore_index=0)  # Ignore padding
optimizer = torch.optim.Adam(model.parameters(), lr=0.0001)

for batch in dataloader:
    src, tgt = batch  # src: English, tgt: French
    
    # Teacher forcing: use ground truth as decoder input
    tgt_input = tgt[:, :-1]   # All but last token
    tgt_output = tgt[:, 1:]   # All but first token
    
    # Create causal mask for decoder
    tgt_mask = nn.Transformer.generate_square_subsequent_mask(tgt_input.size(1))
    
    # Forward
    logits = model(src, tgt_input, tgt_mask=tgt_mask)
    
    # Loss
    loss = criterion(logits.reshape(-1, logits.size(-1)), tgt_output.reshape(-1))
    
    # Backward
    optimizer.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()

# Generation
src_sentence = torch.tensor([[1, 234, 56, 789, 2]])  # "I love cats"
generated = model.generate(src_sentence, max_length=50)
print("Translation:", tokenizer.decode(generated[0]))
```

---

## **Real-World Applications:**

### **1. Machine Translation:**

```python
# Production-ready translation model (T5-style)
from transformers import T5ForConditionalGeneration, T5Tokenizer

# Load pre-trained model
model = T5ForConditionalGeneration.from_pretrained('t5-base')
tokenizer = T5Tokenizer.from_pretrained('t5-base')

# Translate
def translate(text, source_lang='en', target_lang='fr'):
    input_text = f"translate {source_lang} to {target_lang}: {text}"
    input_ids = tokenizer(input_text, return_tensors='pt').input_ids
    
    # Generate
    outputs = model.generate(
        input_ids,
        max_length=128,
        num_beams=4,          # Beam search
        early_stopping=True,
        no_repeat_ngram_size=2
    )
    
    translation = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return translation

# Example
english = "I love programming with AI models"
french = translate(english, 'en', 'fr')
print(f"{english} → {french}")
# Output: "J'aime programmer avec des modèles d'IA"
```

### **2. Text Summarization:**

```python
# BART for summarization
from transformers import BartForConditionalGeneration, BartTokenizer

model = BartForConditionalGeneration.from_pretrained('facebook/bart-large-cnn')
tokenizer = BartTokenizer.from_pretrained('facebook/bart-large-cnn')

def summarize(article, max_summary_length=150):
    inputs = tokenizer([article], max_length=1024, return_tensors='pt', truncation=True)
    
    # Generate summary
    summary_ids = model.generate(
        inputs['input_ids'],
        max_length=max_summary_length,
        min_length=40,
        length_penalty=2.0,
        num_beams=4,
        early_stopping=True
    )
    
    summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    return summary

# Example
article = """
The Transformer architecture has revolutionized natural language processing.
Introduced in 2017 by Vaswani et al., it replaces recurrent layers with 
self-attention mechanisms. This allows for parallel processing and better
handling of long-range dependencies. The encoder-decoder structure is 
particularly effective for sequence-to-sequence tasks like translation
and summarization.
"""

summary = summarize(article)
print("Summary:", summary)
# Output: "The Transformer architecture revolutionized NLP with self-attention 
#         mechanisms, enabling parallel processing and better long-range dependencies."
```

### **3. Question Answering:**

```python
# T5 for QA
def answer_question(context, question):
    input_text = f"question: {question} context: {context}"
    input_ids = tokenizer(input_text, return_tensors='pt', max_length=512, truncation=True).input_ids
    
    outputs = model.generate(input_ids, max_length=64)
    answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return answer

# Example
context = "The Transformer was introduced in the paper 'Attention Is All You Need' in 2017."
question = "When was the Transformer introduced?"
answer = answer_question(context, question)
print(f"Q: {question}\nA: {answer}")
# Output: "2017"
```

### **4. Dialogue Systems:**

```python
# Conversational model
class DialogueModel(nn.Module):
    def __init__(self, vocab_size, d_model=512):
        super().__init__()
        self.encoder_decoder = EncoderDecoderTransformer(
            src_vocab_size=vocab_size,
            tgt_vocab_size=vocab_size,
            d_model=d_model
        )
    
    def generate_response(self, user_message, conversation_history=[]):
        # Encode conversation history + new message
        context = conversation_history + [user_message]
        context_ids = tokenizer.encode(" ".join(context), return_tensors='pt')
        
        # Generate response
        response_ids = self.encoder_decoder.generate(context_ids, max_length=100)
        response = tokenizer.decode(response_ids[0], skip_special_tokens=True)
        
        return response

# Usage
model = DialogueModel(vocab_size=50000)
conversation = []

user1 = "Hello, how are you?"
bot1 = model.generate_response(user1, conversation)
conversation.extend([user1, bot1])

user2 = "Tell me about Transformers"
bot2 = model.generate_response(user2, conversation)
print(f"User: {user2}\nBot: {bot2}")
```

---

## **Common Misconceptions:**

### ❌ **Misconception 1: "Decoder-only models (GPT) cannot do translation"**

**Reality:**
```python
# Both work, but differently!

# Encoder-Decoder (Explicit structure)
class T5Translation:
    def translate(self, source):
        encoder_output = self.encode(source)        # Understand source
        translation = self.decode(encoder_output)   # Generate target
        return translation

# Decoder-Only (Implicit structure via prompting)
class GPTTranslation:
    def translate(self, source):
        prompt = f"Translate to French: {source}\nFrench:"
        translation = self.generate(prompt)  # Generate continuation
        return translation

# Trade-offs
tradeoffs = {
    'Encoder-Decoder': {
        'pros': ['Explicit separation', 'Parameter-efficient', 'Faster training'],
        'cons': ['More complex architecture']
    },
    'Decoder-Only': {
        'pros': ['Simpler architecture', 'Unified training', 'Few-shot learning'],
        'cons': ['Needs more parameters', 'Less efficient for seq2seq']
    },
    
    'reality': 'Both can translate! GPT-3/4 are excellent translators despite being decoder-only'
}
```

### ❌ **Misconception 2: "Cross-attention is the same as self-attention"**

**Reality:**
```javascript
// Self-Attention (within same sequence)
const selfAttention = {
  input: 'Single sequence',
  Q_from: 'Same sequence',
  K_from: 'Same sequence',
  V_from: 'Same sequence',
  purpose: 'Capture relationships WITHIN sequence',
  example: '"cat" attends to "sat" in same sentence'
};

// Cross-Attention (between different sequences)
const crossAttention = {
  input: 'Two sequences (encoder output + decoder state)',
  Q_from: 'Decoder (target)',
  K_from: 'Encoder (source)',
  V_from: 'Encoder (source)',
  purpose: 'Capture relationships BETWEEN sequences',
  example: 'French "chats" attends to English "cats"'
};

// Key difference:
const difference = {
  self: 'Q, K, V all from same source',
  cross: 'Q from decoder, K and V from encoder'
};
```

### ❌ **Misconception 3: "Teacher forcing is cheating"**

**Reality:**
```python
# Teacher Forcing (Training)
def train_step(model, src, tgt):
    # Use ground truth as input to decoder
    tgt_input = tgt[:, :-1]    # "J' aime les"
    tgt_target = tgt[:, 1:]    # "aime les chats"
    
    logits = model(src, tgt_input)
    loss = criterion(logits, tgt_target)
    
    # This is NOT cheating! It's a training strategy.
    return loss

# Why Teacher Forcing?
benefits = {
    'faster_convergence': 'Model learns from correct previous tokens',
    'stable_training': 'Errors don\'t compound during training',
    'efficient': 'Parallel processing of all decoder positions',
    
    'inference': 'At test time, model generates autoregressively (no teacher forcing)',
    
    'reality': 'Standard practice! Like training with answers during study, testing without'
}

# Exposure Bias Problem
problem = {
    'issue': 'Model never sees its own errors during training',
    'solution': 'Scheduled sampling (mix teacher forcing with model predictions)',
    'advanced': 'Use techniques like SeqGAN, RL fine-tuning'
}
```

### ❌ **Misconception 4: "Encoder and decoder must have same number of layers"**

**Reality:**
```python
# Flexible configurations!

asymmetric_models = {
    'BERT': {'encoder': 12, 'decoder': 0},       # Encoder-only
    'GPT': {'encoder': 0, 'decoder': 12},        # Decoder-only
    'T5-Base': {'encoder': 12, 'decoder': 12},   # Symmetric
    'T5-Large': {'encoder': 24, 'decoder': 24},  # Symmetric
    
    'Custom': {'encoder': 6, 'decoder': 12},     # Asymmetric (valid!)
}

# Reasoning for asymmetry
when_asymmetric = {
    'more_encoder': 'When understanding input is complex (e.g., document summarization)',
    'more_decoder': 'When generation is complex (e.g., creative writing)',
    'equal': 'General purpose (most common)',
    
    'flexibility': 'Architecture choice depends on task requirements!'
}
```

---

## **Best Practices:**

### **1. Beam Search for Better Generation:**

```python
def beam_search(model, src, beam_size=4, max_length=50):
    """Generate with beam search instead of greedy"""
    
    # Encode source
    memory = model.encode(src)
    batch_size = src.size(0)
    
    # Initialize beams
    beams = [(torch.tensor([[start_token]]), 0.0)]  # (sequence, score)
    
    for step in range(max_length):
        candidates = []
        
        for seq, score in beams:
            if seq[0, -1].item() == end_token:
                candidates.append((seq, score))
                continue
            
            # Get next token logits
            logits = model.decode(seq, memory)
            log_probs = torch.log_softmax(logits[:, -1, :], dim=-1)
            
            # Top-k candidates
            topk_probs, topk_indices = torch.topk(log_probs, beam_size)
            
            for prob, idx in zip(topk_probs[0], topk_indices[0]):
                new_seq = torch.cat([seq, idx.unsqueeze(0).unsqueeze(0)], dim=1)
                new_score = score + prob.item()
                candidates.append((new_seq, new_score))
        
        # Keep top beam_size candidates
        beams = sorted(candidates, key=lambda x: x[1], reverse=True)[:beam_size]
    
    # Return best sequence
    return beams[0][0]

# Usage
translated = beam_search(model, src_tokens, beam_size=4)
```

### **2. Label Smoothing (Better Training):**

```python
class LabelSmoothingLoss(nn.Module):
    def __init__(self, classes, smoothing=0.1, ignore_index=0):
        super().__init__()
        self.confidence = 1.0 - smoothing
        self.smoothing = smoothing
        self.classes = classes
        self.ignore_index = ignore_index
    
    def forward(self, pred, target):
        # pred: [batch * seq_len, vocab_size]
        # target: [batch * seq_len]
        
        log_probs = torch.log_softmax(pred, dim=-1)
        
        # One-hot with smoothing
        smooth_target = torch.zeros_like(log_probs)
        smooth_target.fill_(self.smoothing / (self.classes - 1))
        smooth_target.scatter_(1, target.unsqueeze(1), self.confidence)
        
        # Ignore padding
        mask = (target != self.ignore_index).unsqueeze(1)
        smooth_target = smooth_target * mask
        
        loss = (-smooth_target * log_probs).sum(dim=-1).mean()
        return loss

# Why label smoothing?
benefits = {
    'prevents_overconfidence': 'Model outputs softer probabilities',
    'better_generalization': 'Improves test performance',
    'recommended': 'Standard in modern seq2seq models'
}
```

### **3. Learning Rate Warmup + Decay:**

```python
class TransformerLRScheduler:
    def __init__(self, optimizer, d_model, warmup_steps=4000):
        self.optimizer = optimizer
        self.d_model = d_model
        self.warmup_steps = warmup_steps
        self.current_step = 0
    
    def step(self):
        self.current_step += 1
        lr = self.get_lr()
        for param_group in self.optimizer.param_groups:
            param_group['lr'] = lr
    
    def get_lr(self):
        # Original Transformer schedule
        step = self.current_step
        warmup = self.warmup_steps
        
        lr = (self.d_model ** -0.5) * min(step ** -0.5, step * warmup ** -1.5)
        return lr

# Usage
optimizer = torch.optim.Adam(model.parameters(), lr=1.0, betas=(0.9, 0.98), eps=1e-9)
scheduler = TransformerLRScheduler(optimizer, d_model=512, warmup_steps=4000)

for batch in dataloader:
    loss = train_step(model, batch)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    scheduler.step()  # Update learning rate
```

### **4. Inference Optimization:**

```python
# Caching encoder output (for multiple translations)
class EfficientTranslator:
    def __init__(self, model):
        self.model = model
        self.encoder_cache = {}
    
    def translate_batch(self, sources):
        """Translate multiple sentences efficiently"""
        
        # Encode all sources in parallel
        src_ids = torch.stack([tokenizer.encode(s) for s in sources])
        memory = self.model.encode(src_ids)
        
        # Decode in parallel with batching
        translations = []
        for i in range(len(sources)):
            translation = self.model.generate(
                src_ids[i:i+1],
                memory=memory[i:i+1]
            )
            translations.append(tokenizer.decode(translation[0]))
        
        return translations

# Key-Value caching for autoregressive decoding
@torch.no_grad()
def generate_with_kv_cache(model, src, max_length=50):
    memory = model.encode(src)
    generated = torch.tensor([[start_token]])
    past_key_values = None
    
    for _ in range(max_length):
        if past_key_values is None:
            # First step: full forward pass
            logits, past_key_values = model.decode_with_cache(generated, memory)
        else:
            # Subsequent steps: only process last token
            logits, past_key_values = model.decode_with_cache(
                generated[:, -1:], memory, past_key_values=past_key_values
            )
        
        next_token = logits[:, -1, :].argmax(dim=-1, keepdim=True)
        generated = torch.cat([generated, next_token], dim=1)
        
        if next_token.item() == end_token:
            break
    
    return generated
```

---

## **Key Takeaways:**

```javascript
const encoderDecoder = {
  architecture: {
    encoder: 'Processes and understands input',
    decoder: 'Generates output, attending to encoder',
    connection: 'Cross-attention bridges encoder and decoder'
  },
  
  advantages: {
    separation: 'Clear separation of understanding and generation',
    efficiency: 'Parameter-efficient for seq2seq tasks',
    interpretability: 'Can analyze cross-attention patterns'
  },
  
  vs_decoder_only: {
    'Encoder-Decoder': 'Better for translation, summarization',
    'Decoder-Only': 'Better for general-purpose, few-shot learning'
  },
  
  key_components: {
    encoder_self_attention: 'Understand input relationships',
    decoder_self_attention: 'Attend to previously generated tokens',
    decoder_cross_attention: 'Attend to encoder output (KEY innovation!)',
    feed_forward: 'Process each position'
  }
};
```

---

## ✅ **Review Questions:**

1. **Conceptual:**
   - What is the role of cross-attention?
   - Why do we need both encoder AND decoder?
   - How does teacher forcing work?

2. **Architectural:**
   - How many attention mechanisms in a decoder layer?
   - What's the difference between encoder and decoder self-attention?
   - Can decoder attend to future tokens?

3. **Practical:**
   - When to use encoder-decoder vs decoder-only?
   - What is beam search and why use it?
   - How does the model know when to stop generating?

4. **Deep:**
   - Why is cross-attention not symmetric?
   - Can we have different vocab sizes for source and target?
   - What happens if encoder has 6 layers but decoder has 12?

---

## 🧩 **Practice Problems:**

### **Problem 1:**

Implement causal mask for decoder:
```python
def create_causal_mask(seq_len):
    # Prevent attending to future tokens
    # Return mask of shape [seq_len, seq_len]
    pass
```

### **Problem 2:**

Design architecture for:
- **Task:** Code comment generation
- **Input:** Code snippet
- **Output:** Natural language comment
- **Question:** Encoder-decoder or decoder-only? Why?

### **Problem 3:**

Calculate parameters:
```python
model = EncoderDecoderTransformer(
    src_vocab=10000,
    tgt_vocab=10000,
    d_model=512,
    num_layers=6
)
# How many total parameters?
```

---

## 🚀 **Mini Project:**

Build English-to-French translator:

```python
# Complete seq2seq model with:
# 1. Encoder-decoder architecture
# 2. Beam search
# 3. Label smoothing
# 4. Learning rate warmup
# 5. Evaluation (BLEU score)

# Train on parallel corpus
# Visualize cross-attention
# Compare with decoder-only model (GPT-style)
```

---

**🎉 Encoder-Decoder Architecture Complete!**

You now understand:
- How encoder and decoder work together
- Cross-attention mechanism
- Training and inference strategies
- Real-world applications

**Next:** **MLM & CLM** (Masked vs Causal Language Modeling)! 🚀
