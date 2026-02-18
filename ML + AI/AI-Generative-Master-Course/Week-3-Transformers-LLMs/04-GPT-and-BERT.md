# 📘 GPT and BERT - The Two Paradigms

## 📚 Table of Contents

1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Deep Technical Breakdown](#-deep-technical-breakdown)
3. [Mathematical Formulas](#-mathematical-formulas)
4. [BERT vs GPT Comparison](#-bert-vs-gpt-comparison)
5. [Evolution and Modern Variants](#-evolution-and-modern-variants)
6. [Real World Use Cases](#-real-world-use-cases)
7. [Sample Mini Project: BERT Sentiment Classification](#-sample-mini-project-bert-sentiment-classification)
8. [Bonus: GPT Text Generation](#-bonus-gpt-text-generation)
9. [Homework](#-homework)
10. [Common Mistakes](#️-common-mistakes)
11. [Interview Questions & Answers](#-interview-questions--answers)
12. [Next Steps](#-next-steps)

---

## 🎯 Beginner Friendly Explanation

### The Fork in the Road

After the Transformer was invented in 2017, researchers asked: **"How do we use this for language understanding?"**

Two major approaches emerged:

```
Transformer (2017)
       │
       ├──────────────────────────────────────────┐
       │                                          │
       ▼                                          ▼
   ENCODER-ONLY                              DECODER-ONLY
       │                                          │
       ▼                                          ▼
     BERT                                        GPT
  (Google, 2018)                           (OpenAI, 2018)
       │                                          │
       ▼                                          ▼
 Understanding tasks                       Generation tasks
 - Classification                         - Text completion
 - Named Entity Recognition               - Chatbots
 - Question Answering                     - Code generation
```

### Simple Analogy

```
BERT = A reader who reads the entire book, 
       then answers questions about it.
       Sees everything at once. (Bidirectional)
       
GPT  = A writer who writes one word at a time,
       based on what they've written so far.
       Can only see the past. (Autoregressive)
```

### The Key Difference

```
BERT (Bidirectional):
"The [MASK] sat on the mat"
     ↑
BERT sees: "The" + "sat on the mat"
           Can look LEFT and RIGHT!
Predicts: "cat"

GPT (Unidirectional):
"The cat sat on the ___"
                      ↑
GPT sees: "The cat sat on the"
          Can only look LEFT!
Predicts: "mat"
```

---

## 🧠 Deep Technical Breakdown

### BERT: Bidirectional Encoder Representations from Transformers

**Architecture:** Stack of Transformer **Encoder** layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         BERT                                     │
│                                                                  │
│   Input: [CLS] The cat [MASK] on the mat [SEP]                  │
│              │    │      │    │   │   │    │                    │
│              ▼    ▼      ▼    ▼   ▼   ▼    ▼                    │
│          ┌──────────────────────────────────────┐               │
│          │        Token Embeddings              │               │
│          │      + Segment Embeddings            │               │
│          │      + Position Embeddings           │               │
│          └──────────────────────────────────────┘               │
│                            │                                     │
│                            ▼                                     │
│          ┌──────────────────────────────────────┐               │
│          │      Transformer Encoder × 12        │               │
│          │    (Self-attention - sees all!)      │               │
│          └──────────────────────────────────────┘               │
│                            │                                     │
│                            ▼                                     │
│   Output: [h_CLS] [h_The] [h_cat] [h_MASK] [h_on] ...          │
│              │                       │                          │
│              ▼                       ▼                          │
│      Classification            Masked Token                     │
│          Head                   Prediction                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Properties:**
- **Bidirectional:** Every token can see every other token
- **Pre-training:** Masked Language Modeling (MLM) + Next Sentence Prediction (NSP)
- **Fine-tuning:** Add task-specific head, train on labeled data

### GPT: Generative Pre-trained Transformer

**Architecture:** Stack of Transformer **Decoder** layers (without cross-attention)

```
┌─────────────────────────────────────────────────────────────────┐
│                          GPT                                     │
│                                                                  │
│   Input: The cat sat on the                                     │
│           │   │   │   │   │                                     │
│           ▼   ▼   ▼   ▼   ▼                                     │
│       ┌──────────────────────────────────────┐                  │
│       │      Token Embeddings                │                  │
│       │    + Position Embeddings             │                  │
│       └──────────────────────────────────────┘                  │
│                        │                                         │
│                        ▼                                         │
│       ┌──────────────────────────────────────┐                  │
│       │    Transformer Decoder × 12          │                  │
│       │  (MASKED self-attention - left only!)│                  │
│       └──────────────────────────────────────┘                  │
│                        │                                         │
│                        ▼                                         │
│   Output:  _    _    _    _    mat                              │
│                             ↑                                    │
│                    Next token prediction                         │
│                                                                  │
│   Then: "The cat sat on the mat" → predict "."                  │
│         "The cat sat on the mat." → predict "<END>"             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Properties:**
- **Unidirectional (Causal):** Each token can only see previous tokens
- **Pre-training:** Causal Language Modeling (CLM) - predict next token
- **Fine-tuning:** Continue generating, or add classification head

---

## 📐 Mathematical Formulas

### BERT Pre-training Objectives

**1. Masked Language Modeling (MLM):**
```
Given: "The [MASK] sat on the mat"

BERT predicts: P(word | context) for masked position

Loss = -log P(cat | "The __ sat on the mat")

Masking Strategy:
- 15% of tokens selected for prediction
  - 80% replaced with [MASK]
  - 10% replaced with random token
  - 10% kept unchanged
```

**Why this strategy?**
```
Problem: [MASK] token never appears in fine-tuning!
Solution: Sometimes don't mask, so model doesn't rely only on [MASK]

Example training cases:
"The [MASK] sat" → predict "cat"    (80%)
"The dog sat"    → predict "cat"    (10%, wrong token)
"The cat sat"    → predict "cat"    (10%, correct token)
```

**2. Next Sentence Prediction (NSP):**
```
Input: [CLS] Sentence A [SEP] Sentence B [SEP]

Predict: Are A and B consecutive sentences?

50% of time: Yes (actual consecutive)
50% of time: No (random sentence B)

Output: Binary classification using [CLS] token
```

### GPT Pre-training Objective

**Causal Language Modeling (CLM):**
```
Given: x₁, x₂, ..., xₜ₋₁
Predict: xₜ

Loss = -Σ log P(xₜ | x₁, x₂, ..., xₜ₋₁)

This is autoregressive language modeling!
```

**Causal Mask:**
```
Token positions: [The] [cat] [sat] [on]

Attention mask:
        The  cat  sat  on
The      1    0    0    0
cat      1    1    0    0
sat      1    1    1    0
on       1    1    1    1

Each position only attends to itself and previous positions
```

---

## 📊 BERT vs GPT Comparison

### Architecture Comparison

| Aspect | BERT | GPT |
|--------|------|-----|
| **Base Architecture** | Encoder only | Decoder only |
| **Attention** | Bidirectional (full) | Unidirectional (causal) |
| **Pre-training** | MLM + NSP | Causal LM |
| **Best for** | Understanding | Generation |
| **Special Tokens** | [CLS], [SEP], [MASK] | <BOS>, <EOS> |
| **Output** | Contextual embeddings | Next token probabilities |

### When to Use Which?

```
USE BERT when:
├── Classification (sentiment, spam, topic)
├── Named Entity Recognition
├── Question Answering (extractive)
├── Semantic similarity
├── Feature extraction for downstream tasks
└── You need to UNDERSTAND the full context

USE GPT when:
├── Text generation
├── Chatbots and conversational AI
├── Code generation
├── Creative writing
├── Translation (with proper prompting)
└── You need to GENERATE new content
```

### Visual Comparison of Attention Patterns

```
BERT - Full Attention:
       The  cat  sat  on  mat
The     ●    ●    ●    ●    ●
cat     ●    ●    ●    ●    ●
sat     ●    ●    ●    ●    ●
on      ●    ●    ●    ●    ●
mat     ●    ●    ●    ●    ●
        (Every token sees everything)

GPT - Causal Attention:
       The  cat  sat  on  mat
The     ●    ○    ○    ○    ○
cat     ●    ●    ○    ○    ○
sat     ●    ●    ●    ○    ○
on      ●    ●    ●    ●    ○
mat     ●    ●    ●    ●    ●
        (Lower triangular - only past)
```

---

## 🌟 Evolution and Modern Variants

### BERT Family

```
BERT-base (2018)
├── 110M parameters
├── 12 layers, 768 hidden, 12 heads
│
├── BERT-large
│   └── 340M parameters, 24 layers
│
├── RoBERTa (2019) - Facebook
│   ├── Better training: more data, longer, no NSP
│   └── Outperforms BERT
│
├── ALBERT (2020) - Google
│   ├── Parameter sharing between layers
│   └── Smaller but competitive
│
├── DistilBERT (2019) - Hugging Face
│   ├── 66M parameters (60% smaller)
│   └── 97% of BERT performance
│
├── ELECTRA (2020) - Google
│   ├── Replaced token detection (not MLM)
│   └── More efficient pre-training
│
└── DeBERTa (2020) - Microsoft
    ├── Disentangled attention
    └── State-of-the-art on many benchmarks
```

### GPT Family

```
GPT-1 (2018)
├── 117M parameters
├── 12 layers, 768 hidden
│
├── GPT-2 (2019)
│   ├── 1.5B parameters
│   ├── Zero-shot learning ability
│   └── "Too dangerous to release"
│
├── GPT-3 (2020)
│   ├── 175B parameters
│   ├── Few-shot learning
│   ├── API access
│   └── Powers early ChatGPT
│
├── GPT-3.5-Turbo (2022)
│   ├── Optimized for chat
│   └── RLHF fine-tuned
│
├── GPT-4 (2023)
│   ├── ~1.7T parameters (rumored)
│   ├── Multimodal (text + images)
│   └── Strongest reasoning
│
└── GPT-4o (2024)
    ├── Optimized version
    └── Faster, cheaper
```

### Other Notable Models

```
Encoder-Decoder (BERT + GPT combined):
├── T5 (Google) - "Text-to-Text Transfer Transformer"
├── BART (Facebook) - Denoising autoencoder
└── mBART - Multilingual BART

Decoder-only (GPT-style):
├── LLaMA (Meta) - Open source
├── Mistral - Efficient, open
├── Claude (Anthropic) - Constitutional AI
├── Gemini (Google) - Multimodal
└── Phi (Microsoft) - Small but capable
```

---

## 🌍 Real World Use Cases

### BERT Applications

**1. Sentiment Analysis:**
```python
Input: "This movie was absolutely terrible!"
       ↓
   [CLS] + BERT + Classifier
       ↓
Output: Negative (0.95)
```

**2. Named Entity Recognition:**
```python
Input: "Apple CEO Tim Cook announced iPhone 15 in Cupertino"
       ↓
      BERT + Token Classifier
       ↓
Output: [Apple: ORG] [Tim Cook: PERSON] [iPhone 15: PRODUCT] [Cupertino: LOCATION]
```

**3. Question Answering:**
```python
Context: "Paris is the capital of France. It has the Eiffel Tower."
Question: "What is the capital of France?"
       ↓
   BERT + Start/End Pointers
       ↓
Answer: "Paris" (span extraction)
```

**4. Semantic Similarity:**
```python
Sentence A: "How do I reset my password?"
Sentence B: "I forgot my login credentials"
       ↓
   BERT embeddings + cosine similarity
       ↓
Similarity: 0.89 (high - same intent!)
```

### GPT Applications

**1. Chatbots:**
```
User: "Can you explain quantum computing?"
       ↓
  GPT generates response token by token
       ↓
Assistant: "Quantum computing is a type of computation that..."
```

**2. Code Generation:**
```
Prompt: "# Python function to calculate fibonacci"
       ↓
      GPT
       ↓
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

**3. Creative Writing:**
```
Prompt: "Write a haiku about artificial intelligence"
       ↓
      GPT
       ↓
Silicon dreams wake,
Patterns dance in neural nets,
Wisdom born from math.
```

**4. Translation (with prompting):**
```
Prompt: "Translate to French: The cat sat on the mat"
       ↓
      GPT
       ↓
"Le chat était assis sur le tapis"
```

---

## 💻 Sample Mini Project: BERT Sentiment Classification

```python
"""
Fine-tune BERT for sentiment analysis
Using Hugging Face Transformers
"""

import torch
from torch.utils.data import DataLoader, Dataset
from transformers import BertTokenizer, BertForSequenceClassification
from transformers import AdamW, get_linear_schedule_with_warmup
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import numpy as np

# ============================================
# STEP 1: PREPARE DATA
# ============================================

# Sample dataset (in real project, use actual dataset)
texts = [
    "This movie was absolutely wonderful! I loved every minute.",
    "Terrible film. Complete waste of time and money.",
    "An okay movie, nothing special but not bad either.",
    "The acting was superb and the plot was engaging!",
    "I fell asleep halfway through. So boring.",
    "A masterpiece of modern cinema. Must watch!",
    "Disappointing. The trailer was better than the movie.",
    "Brilliant performances by the entire cast.",
    "Worst movie I've seen this year. Avoid at all costs.",
    "A delightful film that will warm your heart.",
]

# 1 = positive, 0 = negative
labels = [1, 0, 1, 1, 0, 1, 0, 1, 0, 1]

# Split data
train_texts, val_texts, train_labels, val_labels = train_test_split(
    texts, labels, test_size=0.2, random_state=42
)

print(f"Training samples: {len(train_texts)}")
print(f"Validation samples: {len(val_texts)}")


# ============================================
# STEP 2: TOKENIZATION
# ============================================

class SentimentDataset(Dataset):
    """Custom Dataset for sentiment analysis"""
    
    def __init__(self, texts, labels, tokenizer, max_length=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]
        
        # Tokenize
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,       # Add [CLS] and [SEP]
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }


# Load tokenizer
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

# Create datasets
train_dataset = SentimentDataset(train_texts, train_labels, tokenizer)
val_dataset = SentimentDataset(val_texts, val_labels, tokenizer)

# Create dataloaders
train_loader = DataLoader(train_dataset, batch_size=2, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=2)


# ============================================
# STEP 3: LOAD PRE-TRAINED BERT
# ============================================

# Load BERT with classification head
model = BertForSequenceClassification.from_pretrained(
    'bert-base-uncased',
    num_labels=2,  # Binary classification
    output_attentions=False,
    output_hidden_states=False
)

# Move to GPU if available
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)
print(f"Using device: {device}")


# ============================================
# STEP 4: TRAINING SETUP
# ============================================

# Optimizer
optimizer = AdamW(model.parameters(), lr=2e-5, eps=1e-8)

# Number of training epochs
epochs = 3

# Total training steps
total_steps = len(train_loader) * epochs

# Learning rate scheduler
scheduler = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps=0,
    num_training_steps=total_steps
)


# ============================================
# STEP 5: TRAINING LOOP
# ============================================

def train_epoch(model, data_loader, optimizer, device, scheduler):
    model.train()
    total_loss = 0
    
    for batch in data_loader:
        # Move to device
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['labels'].to(device)
        
        # Clear gradients
        optimizer.zero_grad()
        
        # Forward pass
        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels
        )
        
        loss = outputs.loss
        total_loss += loss.item()
        
        # Backward pass
        loss.backward()
        
        # Clip gradients
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        
        # Update weights
        optimizer.step()
        scheduler.step()
    
    return total_loss / len(data_loader)


def evaluate(model, data_loader, device):
    model.eval()
    predictions = []
    actual_labels = []
    
    with torch.no_grad():
        for batch in data_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)
            
            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask
            )
            
            _, preds = torch.max(outputs.logits, dim=1)
            predictions.extend(preds.cpu().numpy())
            actual_labels.extend(labels.cpu().numpy())
    
    return accuracy_score(actual_labels, predictions), predictions, actual_labels


# ============================================
# STEP 6: TRAIN THE MODEL
# ============================================

print("\nTraining BERT for sentiment analysis...")
print("="*50)

for epoch in range(epochs):
    print(f'\nEpoch {epoch + 1}/{epochs}')
    
    train_loss = train_epoch(model, train_loader, optimizer, device, scheduler)
    print(f'Training loss: {train_loss:.4f}')
    
    val_accuracy, _, _ = evaluate(model, val_loader, device)
    print(f'Validation accuracy: {val_accuracy:.4f}')


# ============================================
# STEP 7: INFERENCE
# ============================================

def predict_sentiment(text, model, tokenizer, device):
    """Predict sentiment for a single text"""
    model.eval()
    
    encoding = tokenizer(
        text,
        add_special_tokens=True,
        max_length=128,
        padding='max_length',
        truncation=True,
        return_tensors='pt'
    )
    
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)
    
    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        probs = torch.softmax(outputs.logits, dim=1)
        prediction = torch.argmax(probs, dim=1).item()
        confidence = probs[0][prediction].item()
    
    sentiment = "Positive" if prediction == 1 else "Negative"
    return sentiment, confidence


# Test predictions
print("\n" + "="*50)
print("TESTING PREDICTIONS")
print("="*50)

test_texts = [
    "I absolutely loved this product! Best purchase ever!",
    "Terrible quality. Broke after one day.",
    "It's okay, nothing special.",
    "Amazing experience, highly recommend!",
    "Worst customer service I've ever encountered."
]

for text in test_texts:
    sentiment, confidence = predict_sentiment(text, model, tokenizer, device)
    print(f"\nText: {text[:50]}...")
    print(f"Sentiment: {sentiment} (confidence: {confidence:.2f})")
```

**Expected Output:**
```
Training samples: 8
Validation samples: 2
Using device: cuda

Training BERT for sentiment analysis...
==================================================

Epoch 1/3
Training loss: 0.7234
Validation accuracy: 0.5000

Epoch 2/3
Training loss: 0.4521
Validation accuracy: 1.0000

Epoch 3/3
Training loss: 0.2134
Validation accuracy: 1.0000

==================================================
TESTING PREDICTIONS
==================================================

Text: I absolutely loved this product! Best purchase ev...
Sentiment: Positive (confidence: 0.95)

Text: Terrible quality. Broke after one day....
Sentiment: Negative (confidence: 0.92)
...
```

---

## 💻 Bonus: GPT Text Generation

```python
"""
Use GPT-2 for text generation
"""

from transformers import GPT2LMHeadModel, GPT2Tokenizer

# Load pre-trained GPT-2
tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
model = GPT2LMHeadModel.from_pretrained('gpt2')

def generate_text(prompt, max_length=100, temperature=0.7, top_p=0.9):
    """
    Generate text using GPT-2
    
    Args:
        prompt: Starting text
        max_length: Maximum total length
        temperature: Higher = more creative (0.0-2.0)
        top_p: Nucleus sampling threshold
    """
    # Encode prompt
    input_ids = tokenizer.encode(prompt, return_tensors='pt')
    
    # Generate
    output = model.generate(
        input_ids,
        max_length=max_length,
        temperature=temperature,
        top_p=top_p,
        do_sample=True,
        pad_token_id=tokenizer.eos_token_id,
        no_repeat_ngram_size=2
    )
    
    # Decode
    generated = tokenizer.decode(output[0], skip_special_tokens=True)
    return generated


# Examples
prompts = [
    "Artificial intelligence will",
    "The future of programming is",
    "Once upon a time, in a land far away,"
]

print("GPT-2 TEXT GENERATION")
print("="*60)

for prompt in prompts:
    print(f"\nPrompt: '{prompt}'")
    print("-"*40)
    generated = generate_text(prompt, max_length=80)
    print(generated)
```

---

## 📝 Homework

### Easy
1. **Compare BERT and GPT** in your own words - when would you use each?
2. **Explain MLM vs CLM** pre-training objectives
3. **Run the sentiment analysis code** with different texts

### Medium
4. **Fine-tune BERT** for a different task (e.g., spam detection)
5. **Implement top-k sampling** for GPT text generation
6. **Compare BERT-base vs DistilBERT** on the same task (speed vs accuracy)

### Hard
7. **Implement MLM pre-training** from scratch for a small BERT
8. **Build a question-answering system** using BERT
9. **Fine-tune GPT-2** for a specific domain (e.g., poetry, code)

---

## ⚠️ Common Mistakes

### 1. Using BERT for Generation

```python
# WRONG - BERT is not designed for generation
output = bert.generate(input_ids)  # Won't work properly!

# RIGHT - Use GPT for generation
output = gpt.generate(input_ids)
```

### 2. Forgetting Special Tokens

```python
# WRONG - Missing special tokens
tokens = tokenizer.encode(text)

# RIGHT - Include special tokens
tokens = tokenizer.encode(text, add_special_tokens=True)
# Result: [CLS] tokens... [SEP]
```

### 3. Not Using Attention Mask with Padding

```python
# WRONG - Ignoring padding in attention
outputs = model(input_ids)

# RIGHT - Use attention mask
outputs = model(input_ids, attention_mask=attention_mask)
```

### 4. Wrong Learning Rate for Fine-tuning

```python
# WRONG - Learning rate too high, destroys pre-training
optimizer = AdamW(model.parameters(), lr=1e-3)

# RIGHT - Small learning rate for fine-tuning
optimizer = AdamW(model.parameters(), lr=2e-5)
```

### 5. Confusing [CLS] Token Purpose

```python
# BERT [CLS] token contains sentence-level representation
cls_embedding = outputs.last_hidden_state[:, 0, :]  # First token

# For classification, use [CLS] embedding
# For token tasks (NER), use all token embeddings
```

---

## 🎤 Interview Questions & Answers

### Beginner Level

**Q1: What's the main difference between BERT and GPT?**

**A:** 
- **BERT** uses **bidirectional** attention (sees entire sequence) and is pre-trained with **Masked Language Modeling** (predicting masked tokens). Best for understanding tasks like classification.

- **GPT** uses **unidirectional (causal)** attention (sees only past tokens) and is pre-trained with **Causal Language Modeling** (predicting next token). Best for generation tasks.

---

**Q2: What does the [CLS] token do in BERT?**

**A:** The [CLS] (classification) token is a special token added at the beginning of every input. After passing through BERT, the [CLS] token's embedding contains an aggregated representation of the entire sequence. It's used for sentence-level tasks like classification by adding a classifier head on top.

---

**Q3: What is the difference between MLM and CLM?**

**A:**
- **MLM (Masked Language Modeling - BERT):** Randomly mask 15% of tokens, predict what they were. Sees full context.
  - "The [MASK] sat on mat" → predict "cat"

- **CLM (Causal Language Modeling - GPT):** Predict next token given all previous tokens. Only sees past.
  - "The cat sat on" → predict "the"

---

### Intermediate Level

**Q4: Why does BERT mask tokens with 80-10-10 strategy?**

**A:** The masking strategy is:
- 80% replaced with [MASK]
- 10% replaced with random token
- 10% kept unchanged

**Why?**
1. The [MASK] token never appears in fine-tuning, so model shouldn't rely solely on it
2. Random replacement forces model to maintain good representations for all tokens
3. Unchanged tokens help model use context even when not predicting

---

**Q5: How would you use BERT for question answering?**

**A:**
1. Input format: `[CLS] Question [SEP] Context [SEP]`
2. BERT produces embeddings for each token
3. Add two linear layers predicting:
   - Start position (which token starts the answer)
   - End position (which token ends the answer)
4. Extract text between start and end positions

This is called **extractive** QA - the answer is a span from the context.

---

**Q6: What is the attention mechanism difference in decoder vs encoder?**

**A:**
- **Encoder (BERT):** Full self-attention - every token attends to every token
- **Decoder (GPT):** Causal/masked self-attention - each token only attends to previous tokens (and itself)

The causal mask is a lower-triangular matrix that sets future positions to -∞ before softmax.

---

### Advanced Level

**Q7: Compare RoBERTa improvements over BERT.**

**A:**
1. **No NSP task:** Removed Next Sentence Prediction (found not helpful)
2. **Dynamic masking:** Different mask each epoch (BERT uses static)
3. **Longer training:** 10x more data, longer training
4. **Larger batches:** 8K tokens vs 256
5. **Full-length sequences:** Always use 512 tokens

Result: Significant improvements on all benchmarks.

---

**Q8: Explain how GPT-3 achieves few-shot learning.**

**A:**
GPT-3's few-shot learning comes from:

1. **Scale:** 175B parameters store vast knowledge
2. **Diverse training data:** Seen many examples of many tasks
3. **In-context learning:** Provide examples in the prompt

```
Prompt format:
"Translate English to French:
sea otter => loutre de mer
peppermint => menthe poivrée
cheese => "

Model completes: "fromage"
```

The model learns the "task format" from examples and applies it. No gradient updates needed!

---

### FAANG Level

**Q9: Design a system that combines BERT's understanding with GPT's generation.**

**A:**
```
DESIGN: Retrieval-Augmented Generation (RAG)

Components:
1. DOCUMENT ENCODER (BERT-based):
   - Encode all documents in knowledge base
   - Store embeddings in vector database

2. QUERY ENCODER (BERT-based):
   - Encode user query
   - Find similar documents via embedding similarity

3. GENERATOR (GPT-based):
   - Input: Query + Retrieved documents
   - Generate answer grounded in retrieved content

Architecture:
┌──────────────────────────────────────────────────┐
│                                                  │
│  User Query ──→ BERT Query Encoder ──→ Query Embedding
│                                            │
│                                            ▼
│  Knowledge Base ──→ BERT Doc Encoder ──→ Vector DB
│                                            │
│                                            ▼
│                                     Top-K Retrieval
│                                            │
│                                            ▼
│  Retrieved Docs + Query ──→ GPT Generator ──→ Answer
│                                                  │
└──────────────────────────────────────────────────┘

Benefits:
- Factual grounding (not hallucinating)
- Updatable knowledge (just update documents)
- Explainable (can show sources)
```

---

**Q10: How would you reduce BERT's inference latency for production?**

**A:**
**Optimization techniques:**

1. **Distillation (DistilBERT):**
   - Train smaller model to mimic BERT
   - 60% smaller, 60% faster, 97% accuracy

2. **Quantization:**
   - INT8 instead of FP32
   - 4x memory reduction, 2-3x faster

3. **Pruning:**
   - Remove unnecessary attention heads/layers
   - Can remove 30-40% with minimal accuracy loss

4. **Layer reduction:**
   - Use only first 6 layers instead of 12
   - Often sufficient for simpler tasks

5. **ONNX Runtime optimization:**
   - Graph optimizations, operator fusion
   - 2-3x speedup

6. **Batching and caching:**
   - Process multiple requests together
   - Cache common prefixes

7. **Speculative decoding (for generation):**
   - Use small model to draft, large model to verify

**Production pipeline:**
```python
# Quantized BERT for production
from transformers import BertForSequenceClassification
from neural_compressor import quantization

model = BertForSequenceClassification.from_pretrained('bert-base-uncased')
quantized_model = quantization.fit(model, calib_dataloader)
# INT8 model: ~4x faster inference
```

---

## 🔗 Next Steps

Now that you understand both paradigms:

**➡️ 05-Build-Transformer-Scratch.md** - Build a complete Transformer from scratch to truly understand every component!

You'll implement:
- Token embeddings and positional encoding
- Multi-head attention
- Encoder and decoder stacks
- Full training loop
