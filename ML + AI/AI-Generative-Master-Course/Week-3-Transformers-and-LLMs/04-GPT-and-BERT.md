# 📘 GPT and BERT - The Two Paradigms of Modern NLP

## 🎯 Beginner Friendly Explanation

### The Big Picture

After the Transformer was invented, two powerful paradigms emerged:

**BERT (2018)** - "I understand text deeply"
**GPT (2018)** - "I generate text fluently"

They're like two sides of the same coin:

```
BERT = Reading Comprehension Expert
       "What does this text mean?"
       
GPT  = Creative Writer
       "Continue this story..."
```

### Simple Analogy

**BERT (Bidirectional):**
- Like reading a mystery novel where you can flip back and forth
- Sees ALL words at once (past AND future)
- Great for understanding, answering questions, classification

```
"The [MASK] sat on the mat"
BERT sees: The ??? sat on the mat
            ↑↓ ↑↓ ↑↓ ↑↓ ↑↓
           All directions!
BERT thinks: "cat" fits best here
```

**GPT (Autoregressive):**
- Like writing a story one word at a time
- Only sees PREVIOUS words
- Great for generation, completion, conversation

```
"The cat sat on the"
GPT sees: The → cat → sat → on → the → ???
                                        ↓
GPT thinks: "mat" or "floor" comes next
```

---

## 🧠 Deep Technical Breakdown

### Architecture Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                         BERT                                    │
│                   (Encoder-Only)                                │
│                                                                 │
│  Input: [CLS] The cat [MASK] on mat [SEP]                      │
│          ↓    ↓   ↓    ↓     ↓   ↓   ↓                         │
│        ┌───────────────────────────────┐                        │
│        │    Bidirectional Attention    │ ← See ALL tokens      │
│        │    (no masking)               │                        │
│        └───────────────────────────────┘                        │
│          ↓    ↓   ↓    ↓     ↓   ↓   ↓                         │
│        ┌───────────────────────────────┐                        │
│        │      × 12/24 Layers           │                        │
│        └───────────────────────────────┘                        │
│                                                                 │
│  Output: Contextual embeddings for each token                  │
│          [MASK] → "sat" (MLM prediction)                       │
│          [CLS] → sentence classification                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          GPT                                    │
│                    (Decoder-Only)                               │
│                                                                 │
│  Input: The cat sat on the                                     │
│         ↓   ↓   ↓   ↓  ↓                                       │
│       ┌───────────────────────────────┐                         │
│       │    Causal (Masked) Attention  │ ← Only see PAST tokens │
│       │                               │                         │
│       │    The → •  •  •  •           │                         │
│       │    cat → The  •  •  •         │                         │
│       │    sat → The cat  •  •        │                         │
│       │    on  → The cat sat  •       │                         │
│       │    the → The cat sat on       │                         │
│       └───────────────────────────────┘                         │
│          ↓   ↓   ↓   ↓  ↓                                       │
│       ┌───────────────────────────────┐                         │
│       │      × 12/48/96 Layers        │                         │
│       └───────────────────────────────┘                         │
│                                                                 │
│  Output: Next token prediction at each position                │
│          "the" → "mat" (predict next word)                     │
└─────────────────────────────────────────────────────────────────┘
```

### BERT Architecture Details

**Configuration (BERT-Base):**
- Layers: 12 Transformer encoder blocks
- Hidden size: 768
- Attention heads: 12
- Parameters: 110M
- Vocabulary: 30,522 (WordPiece)

**Configuration (BERT-Large):**
- Layers: 24
- Hidden size: 1024
- Attention heads: 16
- Parameters: 340M

**Special Tokens:**
- `[CLS]` - Classification token (start)
- `[SEP]` - Separator (between sentences)
- `[MASK]` - Masked token for MLM
- `[PAD]` - Padding token
- `[UNK]` - Unknown token

### GPT Architecture Details

**GPT-1:**
- Layers: 12
- Hidden size: 768
- Parameters: 117M

**GPT-2:**
- Small: 117M | Medium: 345M | Large: 774M | XL: 1.5B

**GPT-3:**
- Parameters: 175B
- Layers: 96
- Hidden size: 12,288
- Attention heads: 96

**GPT-4:**
- Parameters: ~1.7T (estimated, MoE)
- Multimodal (text + images)

---

## 📐 Mathematical Formulas

### BERT Training Objectives

**1. Masked Language Modeling (MLM)**

Randomly mask 15% of tokens, predict them:

$$\mathcal{L}_{MLM} = -\sum_{i \in M} \log P(x_i | x_{\backslash M})$$

Where:
- $M$ = set of masked positions
- $x_{\backslash M}$ = all tokens except masked ones

**Masking Strategy:**
```
Of the 15% selected tokens:
- 80% → Replace with [MASK]
- 10% → Replace with random token
- 10% → Keep original

Why not 100% [MASK]?
- Prevent model from learning "[MASK] is special"
- Random token forces model to be robust
- Original token teaches model that context matters
```

**2. Next Sentence Prediction (NSP)**

Given two sentences, predict if B follows A:

$$\mathcal{L}_{NSP} = -\log P(\text{IsNext} | [CLS])$$

```
Input: [CLS] The cat sat on mat [SEP] It was comfortable [SEP]
Label: IsNext (True)

Input: [CLS] The cat sat on mat [SEP] I like pizza [SEP]  
Label: NotNext (False)
```

**Note:** NSP was later found to be less useful; RoBERTa removed it.

### GPT Training Objective

**Causal Language Modeling (CLM)**

Predict next token given previous tokens:

$$\mathcal{L}_{CLM} = -\sum_{i=1}^{n} \log P(x_i | x_{<i})$$

Where:
- $x_i$ = token at position i
- $x_{<i}$ = all tokens before position i

**Autoregressive Generation:**
```
Input:  "The cat"
Step 1: P(sat | The cat)      → "sat"
Step 2: P(on | The cat sat)   → "on"  
Step 3: P(the | The cat sat on) → "the"
Step 4: P(mat | The cat sat on the) → "mat"
```

### Attention Patterns

**BERT (Bidirectional):**
```
Attention Mask (all 1s - can attend everywhere):
    T  h  e  c  a  t
T   1  1  1  1  1  1
h   1  1  1  1  1  1
e   1  1  1  1  1  1
c   1  1  1  1  1  1
a   1  1  1  1  1  1
t   1  1  1  1  1  1
```

**GPT (Causal):**
```
Attention Mask (lower triangular):
    T  h  e  c  a  t
T   1  0  0  0  0  0
h   1  1  0  0  0  0
e   1  1  1  0  0  0
c   1  1  1  1  0  0
a   1  1  1  1  1  0
t   1  1  1  1  1  1
```

---

## 🎨 Visual Mental Model

### Training vs Fine-tuning vs Inference

```
┌────────────────────────────────────────────────────────────────┐
│                      THE LLM LIFECYCLE                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PRE-TRAINING (expensive, done once)                        │
│  ═══════════════                                               │
│  • Massive dataset (internet, books, code)                     │
│  • Self-supervised (MLM for BERT, CLM for GPT)                 │
│  • Learns language patterns, facts, reasoning                  │
│  • Cost: $$$$ (millions of dollars for large models)           │
│                                                                 │
│                        ↓                                        │
│                                                                 │
│  2. FINE-TUNING (cheaper, done per task)                       │
│  ═══════════════                                               │
│  • Small labeled dataset (1K-100K examples)                    │
│  • Supervised learning                                         │
│  • Adapts to specific task                                     │
│  • Cost: $ (hours on single GPU)                               │
│                                                                 │
│                        ↓                                        │
│                                                                 │
│  3. INFERENCE (production)                                      │
│  ═══════════════                                               │
│  • Feed input, get output                                      │
│  • No learning, just using                                     │
│  • Cost: Per query                                             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### BERT for Different Tasks

```
┌─────────────────────────────────────────────────────────────────┐
│              BERT FINE-TUNING FOR DIFFERENT TASKS               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SENTENCE CLASSIFICATION (Sentiment, Topic)                    │
│  ──────────────────────────────────────────                    │
│  [CLS] This movie is great! [SEP]                              │
│    ↓                                                            │
│  [CLS] embedding → Linear → Softmax → "Positive"               │
│                                                                 │
│  TOKEN CLASSIFICATION (NER, POS Tagging)                       │
│  ──────────────────────────────────────────                    │
│  [CLS] John lives in Paris [SEP]                               │
│    ↓     ↓    ↓    ↓    ↓                                      │
│    -   PER    O    O   LOC   -  (Named Entity Tags)            │
│                                                                 │
│  QUESTION ANSWERING (Extract Answer)                           │
│  ──────────────────────────────────────────                    │
│  [CLS] Question? [SEP] Context with answer here [SEP]          │
│                           ↑              ↑                      │
│                        Start           End                      │
│                        Index           Index                    │
│                                                                 │
│  SENTENCE PAIR (NLI, Paraphrase)                               │
│  ──────────────────────────────────────────                    │
│  [CLS] Sentence A [SEP] Sentence B [SEP]                       │
│    ↓                                                            │
│  [CLS] → Entailment / Contradiction / Neutral                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### GPT for Different Tasks

```
┌─────────────────────────────────────────────────────────────────┐
│              GPT: PROMPT-BASED LEARNING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TEXT COMPLETION                                                │
│  ─────────────────────                                         │
│  Prompt: "Once upon a time"                                    │
│  Output: "Once upon a time, in a faraway kingdom..."           │
│                                                                 │
│  ZERO-SHOT CLASSIFICATION                                      │
│  ─────────────────────                                         │
│  Prompt: "Classify the sentiment: 'I love this movie!'"        │
│          "Sentiment:"                                          │
│  Output: "Positive"                                            │
│                                                                 │
│  FEW-SHOT LEARNING                                             │
│  ─────────────────────                                         │
│  Prompt: "Translate English to French:                         │
│           Hello → Bonjour                                      │
│           Goodbye → Au revoir                                  │
│           Thank you →"                                         │
│  Output: "Merci"                                               │
│                                                                 │
│  INSTRUCTION FOLLOWING                                          │
│  ─────────────────────                                         │
│  Prompt: "Write a poem about the ocean"                        │
│  Output: [Generates poem]                                      │
│                                                                 │
│  CHAIN-OF-THOUGHT REASONING                                     │
│  ─────────────────────                                         │
│  Prompt: "If John has 5 apples and gives 2 to Mary,            │
│           how many does he have? Let's think step by step."    │
│  Output: "John starts with 5 apples.                           │
│           He gives 2 to Mary.                                  │
│           5 - 2 = 3.                                           │
│           John has 3 apples."                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌍 Real World Use Cases

### When to Use BERT

| Task | Why BERT? |
|------|-----------|
| **Sentiment Analysis** | Needs full context understanding |
| **Named Entity Recognition** | Each token needs full context |
| **Question Answering** | Must understand both Q and context |
| **Text Similarity** | Compare sentence representations |
| **Search/Retrieval** | Encode queries and documents |

**Example: Search Engine**
```
Query: "best Italian restaurant near me"
       ↓ (BERT encoding)
[0.23, -0.45, 0.87, ...]  ← Query embedding

Documents encoded similarly
Find documents with similar embeddings
```

### When to Use GPT

| Task | Why GPT? |
|------|----------|
| **Text Generation** | Natural autoregressive generation |
| **Chatbots** | Conversation is sequential |
| **Code Completion** | Generate code left-to-right |
| **Summarization** | Generate summary from input |
| **Translation** | Generate target from source |

**Example: Customer Service Bot**
```
User: "I need to return my order"
      ↓
GPT generates: "I'd be happy to help you with your return.
               Could you please provide your order number?"
```

### Combined Approaches

**T5 (Text-to-Text Transfer Transformer):**
- Encoder-Decoder architecture
- All tasks as text-to-text

```
Sentiment: "translate English to sentiment: I love this movie"
Output: "positive"

Summarization: "summarize: [long article]"
Output: "[short summary]"
```

---

## 💻 Sample Mini Project: BERT Sentiment Classifier

### Using HuggingFace Transformers

```python
import torch
from torch.utils.data import DataLoader, Dataset
from transformers import BertTokenizer, BertForSequenceClassification
from transformers import AdamW, get_linear_schedule_with_warmup
import numpy as np
from sklearn.model_selection import train_test_split
from tqdm import tqdm

# ============================================
# 1. PREPARE DATASET
# ============================================
class SentimentDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]
        
        # Tokenize with BERT tokenizer
        encoding = self.tokenizer(
            text,
            max_length=self.max_len,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].squeeze(),
            'attention_mask': encoding['attention_mask'].squeeze(),
            'labels': torch.tensor(label)
        }

# Sample data
texts = [
    "This movie is absolutely wonderful and amazing!",
    "Terrible waste of time, completely boring",
    "Best film I've ever seen, incredible acting",
    "Worst movie ever made, I want my money back",
    "Fantastic story, great characters, loved it",
    "Disappointing and dull, not recommended",
    "A masterpiece of cinema, must watch",
    "Boring and predictable, fell asleep"
]
labels = [1, 0, 1, 0, 1, 0, 1, 0]  # 1 = positive, 0 = negative

# Split data
train_texts, val_texts, train_labels, val_labels = train_test_split(
    texts, labels, test_size=0.2, random_state=42
)

# ============================================
# 2. LOAD BERT
# ============================================
MODEL_NAME = 'bert-base-uncased'

# Load tokenizer
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)

# Load pre-trained BERT with classification head
model = BertForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=2,  # Binary classification
    output_attentions=False,
    output_hidden_states=False
)

# Create datasets
train_dataset = SentimentDataset(train_texts, train_labels, tokenizer)
val_dataset = SentimentDataset(val_texts, val_labels, tokenizer)

# Create dataloaders
train_loader = DataLoader(train_dataset, batch_size=4, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=4)

# ============================================
# 3. TRAINING SETUP
# ============================================
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)

# Optimizer
optimizer = AdamW(model.parameters(), lr=2e-5, eps=1e-8)

# Learning rate scheduler
epochs = 4
total_steps = len(train_loader) * epochs

scheduler = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps=0,
    num_training_steps=total_steps
)

# ============================================
# 4. TRAINING LOOP
# ============================================
def train_epoch(model, dataloader, optimizer, scheduler, device):
    model.train()
    total_loss = 0
    
    for batch in tqdm(dataloader, desc="Training"):
        # Move to device
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['labels'].to(device)
        
        # Zero gradients
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
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        
        # Update weights
        optimizer.step()
        scheduler.step()
    
    return total_loss / len(dataloader)

def evaluate(model, dataloader, device):
    model.eval()
    total_loss = 0
    predictions = []
    true_labels = []
    
    with torch.no_grad():
        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['labels'].to(device)
            
            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )
            
            total_loss += outputs.loss.item()
            
            # Get predictions
            logits = outputs.logits
            preds = torch.argmax(logits, dim=1)
            
            predictions.extend(preds.cpu().numpy())
            true_labels.extend(labels.cpu().numpy())
    
    accuracy = np.mean(np.array(predictions) == np.array(true_labels))
    return total_loss / len(dataloader), accuracy

# Training
print("Starting training...")
for epoch in range(epochs):
    train_loss = train_epoch(model, train_loader, optimizer, scheduler, device)
    val_loss, val_acc = evaluate(model, val_loader, device)
    
    print(f"Epoch {epoch+1}/{epochs}")
    print(f"  Train Loss: {train_loss:.4f}")
    print(f"  Val Loss: {val_loss:.4f}, Val Accuracy: {val_acc:.4f}")

# ============================================
# 5. INFERENCE
# ============================================
def predict_sentiment(text, model, tokenizer, device):
    model.eval()
    
    # Tokenize
    encoding = tokenizer(
        text,
        max_length=128,
        padding='max_length',
        truncation=True,
        return_tensors='pt'
    )
    
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)
    
    # Predict
    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=1)
        pred = torch.argmax(probs, dim=1).item()
    
    return {
        'text': text,
        'sentiment': 'Positive' if pred == 1 else 'Negative',
        'confidence': probs[0][pred].item()
    }

# Test predictions
test_sentences = [
    "This is the best movie I've seen this year!",
    "Complete waste of time, don't watch it",
    "It was okay, nothing special"
]

print("\nPredictions:")
for sentence in test_sentences:
    result = predict_sentiment(sentence, model, tokenizer, device)
    print(f"  '{result['text'][:50]}...'")
    print(f"  → {result['sentiment']} (confidence: {result['confidence']:.2%})")
```

---

## 💻 Sample Mini Project: GPT Text Generation

```python
import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer

# ============================================
# 1. LOAD GPT-2
# ============================================
model_name = 'gpt2'  # or 'gpt2-medium', 'gpt2-large', 'gpt2-xl'

tokenizer = GPT2Tokenizer.from_pretrained(model_name)
model = GPT2LMHeadModel.from_pretrained(model_name)

# Set pad token (GPT-2 doesn't have one by default)
tokenizer.pad_token = tokenizer.eos_token
model.config.pad_token_id = model.config.eos_token_id

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model.to(device)
model.eval()

# ============================================
# 2. BASIC TEXT GENERATION
# ============================================
def generate_text(prompt, max_length=100, temperature=1.0, top_k=50, top_p=0.95):
    """
    Generate text continuation from a prompt
    
    Args:
        prompt: Starting text
        max_length: Maximum total length (prompt + generated)
        temperature: Higher = more random, Lower = more deterministic
        top_k: Sample from top k tokens
        top_p: Nucleus sampling threshold
    """
    # Tokenize input
    inputs = tokenizer(prompt, return_tensors='pt').to(device)
    
    # Generate
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=max_length,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            do_sample=True,
            num_return_sequences=1,
            pad_token_id=tokenizer.eos_token_id
        )
    
    # Decode
    generated = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return generated

# Examples
prompts = [
    "The future of artificial intelligence is",
    "Once upon a time in a magical forest,",
    "The most important thing in life is"
]

print("=" * 50)
print("GPT-2 Text Generation")
print("=" * 50)

for prompt in prompts:
    print(f"\nPrompt: {prompt}")
    print("-" * 40)
    result = generate_text(prompt, max_length=80)
    print(result)

# ============================================
# 3. DIFFERENT GENERATION STRATEGIES
# ============================================
def compare_generation_strategies(prompt):
    """Compare different sampling strategies"""
    
    strategies = {
        'Greedy (temp=0)': {'temperature': 0.1, 'top_k': 1, 'do_sample': False},
        'Conservative (temp=0.5)': {'temperature': 0.5, 'top_k': 50, 'top_p': 0.95},
        'Creative (temp=1.0)': {'temperature': 1.0, 'top_k': 100, 'top_p': 0.95},
        'Random (temp=1.5)': {'temperature': 1.5, 'top_k': 0, 'top_p': 0.99}
    }
    
    print(f"\nPrompt: {prompt}")
    print("=" * 50)
    
    inputs = tokenizer(prompt, return_tensors='pt').to(device)
    
    for name, params in strategies.items():
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=60,
                num_return_sequences=1,
                pad_token_id=tokenizer.eos_token_id,
                do_sample=params.get('do_sample', True),
                temperature=params.get('temperature', 1.0),
                top_k=params.get('top_k', 50),
                top_p=params.get('top_p', 1.0)
            )
        
        result = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"\n{name}:")
        print(f"  {result}")

compare_generation_strategies("The key to success is")

# ============================================
# 4. FEW-SHOT LEARNING
# ============================================
def few_shot_classification(examples, query):
    """
    Use few-shot examples to classify text
    """
    # Build prompt with examples
    prompt = "Classify the sentiment of each sentence.\n\n"
    
    for text, label in examples:
        prompt += f"Text: {text}\nSentiment: {label}\n\n"
    
    prompt += f"Text: {query}\nSentiment:"
    
    # Generate
    inputs = tokenizer(prompt, return_tensors='pt').to(device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=len(inputs['input_ids'][0]) + 5,
            temperature=0.1,
            do_sample=False,
            pad_token_id=tokenizer.eos_token_id
        )
    
    result = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # Extract just the generated part
    generated = result[len(prompt):].strip().split('\n')[0]
    
    return generated

# Example
examples = [
    ("I love this product, it's amazing!", "Positive"),
    ("Terrible quality, waste of money", "Negative"),
    ("Best purchase I ever made", "Positive"),
    ("Disappointed, doesn't work as advertised", "Negative")
]

query = "This exceeded my expectations!"
result = few_shot_classification(examples, query)
print(f"\nFew-shot Classification:")
print(f"  Query: {query}")
print(f"  Predicted: {result}")

# ============================================
# 5. CHAT-STYLE INTERACTION
# ============================================
def chat(messages, system_prompt="You are a helpful assistant."):
    """
    Simple chat using GPT-2 (not optimal, just demonstration)
    """
    # Format conversation
    conversation = f"{system_prompt}\n\n"
    
    for role, content in messages:
        if role == "user":
            conversation += f"User: {content}\n"
        else:
            conversation += f"Assistant: {content}\n"
    
    conversation += "Assistant:"
    
    # Generate response
    inputs = tokenizer(conversation, return_tensors='pt').to(device)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=len(inputs['input_ids'][0]) + 50,
            temperature=0.7,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.encode('\n')[0]  # Stop at newline
        )
    
    full_response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    # Extract assistant's response
    response = full_response.split("Assistant:")[-1].strip().split('\n')[0]
    
    return response

# Example chat
messages = [
    ("user", "What is machine learning?"),
]

response = chat(messages)
print(f"\nChat Example:")
print(f"  User: What is machine learning?")
print(f"  Assistant: {response}")
```

---

## 📝 Homework

### Easy:
1. **Explain:** What's the key difference between BERT and GPT training objectives?
2. **Code:** Fine-tune BERT on a simple classification task
3. **Experiment:** Compare GPT-2 generation with different temperatures

### Intermediate:
4. **Build:** Create a question-answering system with BERT
5. **Compare:** Fine-tune both BERT and GPT on same task, compare results
6. **Analyze:** Visualize attention patterns in BERT for different sentences

### Advanced:
7. **Implement:** Add prompt engineering techniques to improve GPT performance
8. **Project:** Build a semantic search engine using BERT embeddings
9. **Research:** Implement knowledge distillation from BERT-large to BERT-base

---

## ⚠️ Common Mistakes

### BERT Mistakes

**1. Not Using [CLS] Token for Classification**
```python
# ❌ Wrong - using mean of all tokens
embedding = outputs.last_hidden_state.mean(dim=1)

# ✅ Correct - use [CLS] token
embedding = outputs.last_hidden_state[:, 0, :]  # First token
```

**2. Forgetting Attention Mask for Padding**
```python
# ❌ Wrong - padding contributes to output
outputs = model(input_ids)

# ✅ Correct - mask padding tokens
outputs = model(input_ids, attention_mask=attention_mask)
```

**3. Wrong Learning Rate**
```python
# ❌ Wrong - too high for fine-tuning
optimizer = AdamW(model.parameters(), lr=1e-3)

# ✅ Correct - lower for pre-trained models
optimizer = AdamW(model.parameters(), lr=2e-5)
```

### GPT Mistakes

**1. Not Setting Temperature Correctly**
```python
# ❌ Temperature = 0 causes division by zero
outputs = model.generate(temperature=0)

# ✅ Use greedy decoding instead
outputs = model.generate(do_sample=False)
# Or use small temperature
outputs = model.generate(temperature=0.1, do_sample=True)
```

**2. Forgetting to Set Pad Token**
```python
# ❌ Wrong - GPT-2 has no pad token
tokenizer.pad_token  # None

# ✅ Correct - set it to eos token
tokenizer.pad_token = tokenizer.eos_token
model.config.pad_token_id = model.config.eos_token_id
```

**3. Not Using Proper Stop Sequences**
```python
# ❌ Wrong - generates forever
outputs = model.generate(max_length=1000)

# ✅ Correct - set stop conditions
outputs = model.generate(
    max_length=100,
    eos_token_id=tokenizer.eos_token_id,
    early_stopping=True
)
```

---

## 🎤 Interview Questions + Answers

### Beginner Level:

**Q1: What's the main difference between BERT and GPT?**

**A:**
- **BERT** is an encoder-only model with bidirectional attention. It sees all tokens simultaneously and is trained with masked language modeling (predict masked tokens). Best for understanding tasks.
- **GPT** is a decoder-only model with causal attention. It only sees previous tokens and is trained with next token prediction. Best for generation tasks.

**Q2: What is masked language modeling (MLM)?**

**A:** MLM is BERT's pre-training objective where 15% of input tokens are masked, and the model must predict them using bidirectional context.

```
Input:  "The [MASK] sat on the mat"
Output: "cat" (predicted for [MASK] position)
```

---

### Intermediate Level:

**Q3: Why doesn't GPT use bidirectional attention?**

**A:** GPT is designed for generation, which is inherently autoregressive (left-to-right). During generation, future tokens don't exist yet, so the model can only use past tokens. Using bidirectional attention during training would cause train/test mismatch.

```
Generation process:
"The" → model → "cat"
"The cat" → model → "sat"
"The cat sat" → model → ...

At each step, only left context is available
```

**Q4: Explain the difference between fine-tuning and prompt engineering.**

**A:**

**Fine-tuning:**
- Update model weights on task-specific data
- Requires labeled dataset
- Creates specialized model
- Better task performance
- Higher computational cost

**Prompt Engineering:**
- Keep model weights frozen
- Design input prompts to elicit desired behavior
- No training required
- More flexible, but may be less reliable
- Zero additional training cost

```
Fine-tuning: Train on sentiment labels
Prompt: "This movie is great" → Positive

Prompt Engineering:
"Classify as positive or negative: This movie is great
Sentiment:" → "Positive"
```

**Q5: What is the [CLS] token in BERT and why is it important?**

**A:** `[CLS]` (Classification) is a special token added at the start of every input. During pre-training with NSP, this token's embedding learns to aggregate sentence-level information.

For classification tasks, we use the `[CLS]` embedding as the sentence representation:

```python
# Get [CLS] embedding
cls_embedding = outputs.last_hidden_state[:, 0, :]

# Pass through classifier
logits = classifier(cls_embedding)
```

It works because:
1. Self-attention allows [CLS] to attend to all tokens
2. NSP pre-training teaches it to represent sentence meaning
3. Fine-tuning further adapts it to specific tasks

---

### Advanced Level:

**Q6: Compare RoBERTa, ALBERT, and DistilBERT to original BERT.**

**A:**

| Model | Key Changes | Size | Performance |
|-------|-------------|------|-------------|
| **BERT** | Original | 110M/340M | Baseline |
| **RoBERTa** | Removed NSP, more data, longer training | 125M/355M | +2-3% |
| **ALBERT** | Parameter sharing, factorized embeddings | 12M/18M | Similar, much smaller |
| **DistilBERT** | Knowledge distillation, 6 layers | 66M | 97% of BERT, 60% size |

**RoBERTa improvements:**
- Dynamic masking (different mask each epoch)
- Removed NSP (not helpful)
- Larger batches, more data
- Longer training

**ALBERT innovations:**
- Cross-layer parameter sharing (all layers share weights)
- Factorized embedding (vocab × 128 + 128 × hidden)
- SOP instead of NSP (Sentence Order Prediction)

**DistilBERT approach:**
- Train smaller model to mimic BERT
- Use soft labels from teacher
- Combine MLM + distillation loss

**Q7: How would you implement efficient inference for a BERT-based search system?**

**A:**

```python
# 1. Pre-compute document embeddings (offline)
def encode_documents(documents, model, tokenizer):
    embeddings = []
    for doc in documents:
        inputs = tokenizer(doc, return_tensors='pt', padding=True, truncation=True)
        with torch.no_grad():
            outputs = model(**inputs)
            # Use [CLS] embedding
            embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()
        embeddings.append(embedding)
    return np.vstack(embeddings)

# Store in vector database (e.g., FAISS, Pinecone)
doc_embeddings = encode_documents(documents, model, tokenizer)
index = faiss.IndexFlatIP(embedding_dim)  # Inner product for cosine sim
index.add(doc_embeddings)

# 2. Online query (fast)
def search(query, model, tokenizer, index, k=10):
    # Encode query
    inputs = tokenizer(query, return_tensors='pt')
    with torch.no_grad():
        outputs = model(**inputs)
        query_embedding = outputs.last_hidden_state[:, 0, :].cpu().numpy()
    
    # Search in index
    scores, indices = index.search(query_embedding, k)
    return indices[0], scores[0]
```

**Additional optimizations:**
- Quantization (INT8)
- ONNX runtime
- Batch queries
- Approximate nearest neighbors (HNSW, IVF)

**Q8: How does GPT-3 achieve few-shot learning?**

**A:** GPT-3 achieves few-shot learning through **in-context learning** - providing examples in the prompt:

```
# Zero-shot (no examples)
"Translate to French: Hello"

# One-shot (one example)
"Translate to French:
Hello → Bonjour
Goodbye →"

# Few-shot (multiple examples)
"Translate to French:
Hello → Bonjour
Thank you → Merci
Good morning → Bonjour
Goodbye →"
```

**Why it works:**
1. **Scale:** 175B parameters encode vast knowledge
2. **Pre-training:** Exposed to many task formats in training data
3. **Pattern matching:** Model recognizes input-output patterns
4. **In-context learning:** Adapts behavior based on prompt context

**Limitations:**
- Context length limits (4K-8K tokens)
- Not as good as fine-tuning for specific tasks
- Can be sensitive to prompt format
- May require many examples for complex tasks

**Q9: Design a system that uses both BERT and GPT for different stages.**

**A:**

**Use Case: Customer Support Chatbot**

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID BERT + GPT SYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STAGE 1: Intent Classification (BERT)                        │
│  ═══════════════════════════════════════                       │
│  User: "I want to return my order"                             │
│       ↓                                                         │
│  BERT Classifier → Intent: "RETURN_REQUEST"                   │
│                                                                 │
│  STAGE 2: Entity Extraction (BERT)                             │
│  ═══════════════════════════════════════                       │
│  BERT NER → Entities: {order_id: None, product: None}          │
│                                                                 │
│  STAGE 3: Knowledge Retrieval (BERT)                           │
│  ═══════════════════════════════════════                       │
│  Query BERT → Find relevant FAQ/policy documents               │
│  Retrieved: "Returns accepted within 30 days..."               │
│                                                                 │
│  STAGE 4: Response Generation (GPT)                            │
│  ═══════════════════════════════════════                       │
│  Context: {intent, entities, retrieved_docs}                   │
│       ↓                                                         │
│  GPT → "I'd be happy to help with your return!                 │
│         Our policy allows returns within 30 days.              │
│         Could you please provide your order number?"           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why hybrid:**
- BERT excels at understanding/classification
- GPT excels at natural response generation
- Best of both worlds

**Q10: What are the key differences between GPT-3 and GPT-4?**

**A:**

| Aspect | GPT-3 | GPT-4 |
|--------|-------|-------|
| **Architecture** | Dense Transformer | Mixture of Experts (MoE) |
| **Parameters** | 175B | ~1.7T (8x220B experts) |
| **Multimodal** | Text only | Text + Images |
| **Context Length** | 4K/8K tokens | 8K/32K/128K tokens |
| **Reasoning** | Good | Significantly better |
| **Safety** | RLHF | RLHF + Red teaming |
| **Factuality** | Often hallucinates | Reduced hallucination |

**Key GPT-4 improvements:**
1. **MoE Architecture:** Only ~25% of parameters active per token (efficient)
2. **Vision:** Can process images, charts, documents
3. **Longer context:** Can handle entire documents
4. **Better reasoning:** Chain-of-thought, step-by-step
5. **Instruction following:** Better at complex instructions
6. **Safety:** More robust to jailbreaks

---

## 🚀 Next Steps

Now that you understand GPT and BERT, you're ready for:
1. **Build Transformer from Scratch** - Deep implementation understanding
2. **Fine-tuning Techniques** - LoRA, QLoRA, Adapters
3. **Sentiment Analysis Project** - End-to-end application

**Key Takeaway:** BERT and GPT represent two fundamental paradigms in NLP - understanding vs. generation. Modern systems often combine both approaches for comprehensive language AI!

---

## 📚 Additional Resources

**Papers:**
- "BERT: Pre-training of Deep Bidirectional Transformers" (Devlin et al., 2018)
- "Language Models are Unsupervised Multitask Learners" (GPT-2, Radford et al., 2019)
- "Language Models are Few-Shot Learners" (GPT-3, Brown et al., 2020)
- "GPT-4 Technical Report" (OpenAI, 2023)

**Implementations:**
- HuggingFace Transformers library
- OpenAI API for GPT models
- Google's original BERT implementation

**Practice:**
- HuggingFace course (free)
- Fine-tune on GLUE benchmark
- Build applications with both models

---

**Remember:** BERT and GPT are not competing models - they're complementary tools. Understanding when to use each is key to building effective NLP systems!
