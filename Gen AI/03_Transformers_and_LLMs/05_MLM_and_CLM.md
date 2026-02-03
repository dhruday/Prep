# 📘 MLM & CLM (Masked Language Modeling & Causal Language Modeling)

---

## **Purpose (Why this exists):**

### **The Pre-training Revolution:**

**Before 2018:**
```javascript
const traditionalNLP = {
  approach: 'Train from scratch for each task',
  problem: 'Need large labeled datasets for EVERY task',
  
  example: {
    sentiment: 'Need 100k labeled reviews',
    translation: 'Need 1M parallel sentences',
    QA: 'Need 50k question-answer pairs'
  },
  
  issue: 'Expensive, time-consuming, doesn't transfer knowledge'
};
```

**After 2018 (Pre-training + Fine-tuning):**
```javascript
const modernNLP = {
  step1_pretraining: {
    task: 'Self-supervised learning on MASSIVE unlabeled text',
    data: 'Billions of words from internet',
    cost: 'One-time expensive training',
    output: 'General language understanding model'
  },
  
  step2_finetuning: {
    task: 'Adapt pre-trained model to specific task',
    data: 'Small labeled dataset (1k-10k examples)',
    cost: 'Cheap and fast',
    output: 'Task-specific model'
  },
  
  benefit: 'Transfer learning for NLP!'
};
```

### **Two Pre-training Strategies:**

**1. Masked Language Modeling (MLM) - BERT:**
```
Training Text: "The cat sat on the mat"
               ↓
Masked: "The [MASK] sat on the [MASK]"
               ↓
Model predicts: "cat" and "mat"

Key: Model sees context from BOTH directions (bidirectional)
```

**2. Causal Language Modeling (CLM) - GPT:**
```
Training Text: "The cat sat on the mat"
               ↓
Model predicts:
  Given: "The"           → Predict: "cat"
  Given: "The cat"       → Predict: "sat"
  Given: "The cat sat"   → Predict: "on"
  ...

Key: Model only sees LEFT context (autoregressive)
```

### **Why Two Different Approaches?**

```javascript
const comparison = {
  MLM: {
    strength: 'Understands context from both sides',
    use: 'Understanding tasks (classification, QA)',
    architecture: 'Encoder-only (BERT)',
    example: 'Is this review positive or negative?'
  },
  
  CLM: {
    strength: 'Generates text naturally',
    use: 'Generation tasks (writing, completion)',
    architecture: 'Decoder-only (GPT)',
    example: 'Complete this story: Once upon a time...'
  }
};
```

---

## **What it is:**

### **Masked Language Modeling (MLM):**

**Definition:**

A pre-training objective where:
1. Randomly mask 15% of input tokens
2. Model predicts original tokens from context
3. Uses bidirectional context (left + right)

```javascript
const MLM = {
  input: 'Sentence with [MASK] tokens',
  task: 'Predict what word was masked',
  context: 'Bidirectional (sees full sentence)',
  
  masking_strategy: {
    percent: '15% of tokens',
    breakdown: {
      '80%': 'Replace with [MASK]',
      '10%': 'Replace with random word',
      '10%': 'Keep original word'
    }
  },
  
  objective: 'Maximize P(masked_word | context)',
  
  models: ['BERT', 'RoBERTa', 'ALBERT', 'ELECTRA']
};
```

### **Causal Language Modeling (CLM):**

**Definition:**

A pre-training objective where:
1. Predict next token given all previous tokens
2. Autoregressive generation (left-to-right)
3. Uses only left context (causal masking)

```javascript
const CLM = {
  input: 'Sequence of tokens',
  task: 'Predict next token',
  context: 'Unidirectional (only sees previous tokens)',
  
  training: {
    given: 'The cat sat',
    predict: 'on'
  },
  
  objective: 'Maximize P(word_t | word_1, ..., word_{t-1})',
  
  models: ['GPT', 'GPT-2', 'GPT-3', 'GPT-4']
};
```

---

## **How it works (Intuition):**

### **MLM: The Cloze Test Analogy:**

Remember fill-in-the-blank tests in school?

```
Question: "The capital of France is ____."

You think:
  - "capital" suggests a city
  - "France" narrows it to French cities
  - Only one capital per country
  - Answer: "Paris"

You used BOTH sides of the blank to figure it out!
```

**MLM works the same way:**

```
Sentence: "The [MASK] sat on the mat"

Model thinks:
  LEFT context: "The" (article → noun coming)
  RIGHT context: "sat" (verb → subject is something that can sit)
  RIGHT context: "on the mat" (sits on things)
  Conclusion: "cat" (animals sit!)
```

**Another Example:**

```
"She put the book on the [MASK]"

Model thinks:
  LEFT: "put" + "on" → preposition, need a surface
  LEFT: "book" → something to place book on
  Candidates: "table", "shelf", "desk", "floor"
  
All are valid! Model outputs probability distribution.
```

### **CLM: The Story Writing Analogy:**

Imagine writing a story one word at a time:

```
You've written: "Once upon a time, there was a"

What next?
  - You can ONLY see what you've written so far
  - You predict: "princess", "dragon", "knight", etc.
  - You pick one: "princess"
  
Next prediction:
You've written: "Once upon a time, there was a princess"
  
What next?
  - Context: Story about a princess
  - Predict: "who", "named", "living", etc.
  - Pick: "who"

Continue until story is complete!
```

**CLM works the same way:**

```
Given: "The cat"
Predict: "sat" (high probability)

Given: "The cat sat"
Predict: "on" (high probability)

Given: "The cat sat on"
Predict: "the" (high probability)

Given: "The cat sat on the"
Predict: "mat", "floor", "sofa" (all reasonable)
```

### **Key Difference Visualized:**

```
Sentence: "The cat sat on the mat"

MLM (Bidirectional):
  Predicting "sat":
    ← "The cat" (LEFT context)
    "on the mat" → (RIGHT context)
    
  Both sides help predict!

CLM (Unidirectional):
  Predicting "sat":
    ← "The cat" (LEFT context only)
    ✗ Cannot see "on the mat"
    
  Only left side available!
```

---

## **How it works (Math – simplified):**

### **Masked Language Modeling (MLM):**

**Objective Function:**

```
Given sentence: w = [w₁, w₂, ..., w_n]
Mask subset M of positions

Objective: Maximize log P(w_M | w_\M)

Where:
  w_M = masked words
  w_\M = unmasked words (context)
  
Loss = -Σ log P(w_i | context) for i in M
```

**In JavaScript:**

```javascript
class MLMTraining {
  maskTokens(tokens, mask_prob = 0.15) {
    const masked_tokens = [...tokens];
    const labels = Array(tokens.length).fill(-100);  // -100 = ignore in loss
    
    for (let i = 0; i < tokens.length; i++) {
      if (Math.random() < mask_prob) {
        labels[i] = tokens[i];  // Store original for loss computation
        
        const rand = Math.random();
        if (rand < 0.8) {
          // 80%: Replace with [MASK]
          masked_tokens[i] = this.MASK_TOKEN_ID;
        } else if (rand < 0.9) {
          // 10%: Replace with random token
          masked_tokens[i] = Math.floor(Math.random() * this.vocab_size);
        }
        // 10%: Keep original (helps model learn actual distribution)
      }
    }
    
    return { masked_tokens, labels };
  }
  
  computeLoss(model, input_ids, labels) {
    // Forward pass
    const logits = model(input_ids);  // [batch, seq_len, vocab_size]
    
    // Compute loss only on masked positions
    let loss = 0;
    let count = 0;
    
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] !== -100) {
        const true_token = labels[i];
        const predicted_probs = this.softmax(logits[i]);
        loss += -Math.log(predicted_probs[true_token]);
        count++;
      }
    }
    
    return loss / count;  // Average loss over masked tokens
  }
  
  softmax(logits) {
    const max = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }
}

// Example
const mlm = new MLMTraining();
const tokens = [15, 234, 56, 789, 12];  // "The cat sat on mat"
const { masked_tokens, labels } = mlm.maskTokens(tokens);

console.log("Original:", tokens);
console.log("Masked:", masked_tokens);  // [15, MASK, 56, 789, MASK]
console.log("Labels:", labels);         // [-100, 234, -100, -100, 12]
```

### **Causal Language Modeling (CLM):**

**Objective Function:**

```
Given sentence: w = [w₁, w₂, ..., w_n]

Objective: Maximize Π P(w_i | w_1, ..., w_{i-1})
         = Maximize Σ log P(w_i | w_1, ..., w_{i-1})

Where:
  Each token prediction depends only on previous tokens
  
Loss = -Σ log P(w_i | w_1, ..., w_{i-1}) for i = 1 to n
```

**In JavaScript:**

```javascript
class CLMTraining {
  computeLoss(model, input_ids) {
    // input_ids: [batch_size, seq_len]
    
    // Forward pass with causal masking
    const logits = model(input_ids, causal_mask=true);
    // logits: [batch_size, seq_len, vocab_size]
    
    // Shift: predict next token
    const input_tokens = input_ids.slice(0, -1);   // All but last
    const target_tokens = input_ids.slice(1);      // All but first
    const target_logits = logits.slice(0, -1);     // All but last prediction
    
    // Compute cross-entropy loss
    let total_loss = 0;
    for (let t = 0; t < target_tokens.length; t++) {
      const true_token = target_tokens[t];
      const predicted_probs = this.softmax(target_logits[t]);
      total_loss += -Math.log(predicted_probs[true_token]);
    }
    
    return total_loss / target_tokens.length;
  }
  
  generate(model, prompt_ids, max_length = 50) {
    let generated = [...prompt_ids];
    
    for (let i = 0; i < max_length; i++) {
      // Get logits for next token
      const logits = model(generated);
      const next_token_logits = logits[logits.length - 1];
      
      // Sample next token
      const probs = this.softmax(next_token_logits);
      const next_token = this.sample(probs);
      
      generated.push(next_token);
      
      if (next_token === this.EOS_TOKEN_ID) break;
    }
    
    return generated;
  }
  
  sample(probs, temperature = 1.0) {
    // Temperature sampling
    const adjusted = probs.map(p => Math.pow(p, 1 / temperature));
    const sum = adjusted.reduce((a, b) => a + b, 0);
    const normalized = adjusted.map(p => p / sum);
    
    // Sample from distribution
    const rand = Math.random();
    let cumsum = 0;
    for (let i = 0; i < normalized.length; i++) {
      cumsum += normalized[i];
      if (rand < cumsum) return i;
    }
    return normalized.length - 1;
  }
  
  softmax(logits) {
    const max = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }
}

// Example
const clm = new CLMTraining();
const tokens = [15, 234, 56, 789, 12];  // "The cat sat on mat"

// Training: Predict each token from previous
const loss = clm.computeLoss(model, tokens);

// Generation: Continue sequence
const prompt = [15, 234];  // "The cat"
const generated = clm.generate(model, prompt, max_length=10);
console.log("Generated:", generated);  // [15, 234, 56, 789, ...]
```

### **PyTorch Implementation:**

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class MLMModel(nn.Module):
    def __init__(self, vocab_size, d_model=768, num_layers=12):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoding = PositionalEncoding(d_model)
        
        # Encoder (bidirectional)
        encoder_layer = nn.TransformerEncoderLayer(d_model, nhead=12, batch_first=True)
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers)
        
        # MLM head
        self.mlm_head = nn.Linear(d_model, vocab_size)
    
    def forward(self, input_ids, labels=None):
        # Embed and encode
        x = self.embedding(input_ids)
        x = self.pos_encoding(x)
        x = self.encoder(x)
        
        # Predict masked tokens
        logits = self.mlm_head(x)
        
        if labels is not None:
            # Compute loss only on masked positions (labels != -100)
            loss = F.cross_entropy(
                logits.view(-1, logits.size(-1)),
                labels.view(-1),
                ignore_index=-100
            )
            return logits, loss
        
        return logits


class CLMModel(nn.Module):
    def __init__(self, vocab_size, d_model=768, num_layers=12):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoding = PositionalEncoding(d_model)
        
        # Decoder (autoregressive)
        decoder_layer = nn.TransformerDecoderLayer(d_model, nhead=12, batch_first=True)
        self.decoder = nn.TransformerDecoder(decoder_layer, num_layers)
        
        # LM head
        self.lm_head = nn.Linear(d_model, vocab_size)
    
    def forward(self, input_ids, labels=None):
        batch_size, seq_len = input_ids.shape
        
        # Causal mask
        causal_mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
        
        # Embed and decode
        x = self.embedding(input_ids)
        x = self.pos_encoding(x)
        x = self.decoder(x, x, tgt_mask=causal_mask)
        
        # Predict next token
        logits = self.lm_head(x)
        
        if labels is not None:
            # Shift for next token prediction
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            
            loss = F.cross_entropy(
                shift_logits.view(-1, shift_logits.size(-1)),
                shift_labels.view(-1)
            )
            return logits, loss
        
        return logits


# Training MLM
mlm_model = MLMModel(vocab_size=30000)
optimizer = torch.optim.Adam(mlm_model.parameters(), lr=1e-4)

for batch in mlm_dataloader:
    input_ids, labels = batch  # labels: -100 for unmasked, token_id for masked
    
    logits, loss = mlm_model(input_ids, labels)
    
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    
    print(f"MLM Loss: {loss.item():.4f}")


# Training CLM
clm_model = CLMModel(vocab_size=30000)
optimizer = torch.optim.Adam(clm_model.parameters(), lr=1e-4)

for batch in clm_dataloader:
    input_ids = batch  # Full sequence
    
    logits, loss = clm_model(input_ids, labels=input_ids)
    
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    
    print(f"CLM Loss: {loss.item():.4f}")


# Generation with CLM
@torch.no_grad()
def generate_text(model, prompt, max_length=50, temperature=1.0):
    model.eval()
    
    generated = prompt.clone()
    
    for _ in range(max_length):
        logits = model(generated)
        next_token_logits = logits[0, -1, :] / temperature
        
        probs = F.softmax(next_token_logits, dim=-1)
        next_token = torch.multinomial(probs, num_samples=1)
        
        generated = torch.cat([generated, next_token.unsqueeze(0)], dim=1)
        
        if next_token.item() == eos_token_id:
            break
    
    return generated

prompt = torch.tensor([[15, 234]])  # "The cat"
generated = generate_text(clm_model, prompt, max_length=20)
print("Generated:", tokenizer.decode(generated[0]))
```

---

## **Visual Explanation (described):**

### **MLM Training:**

```
Input: "The cat sat on the mat"
         ↓
Step 1: Random masking
  "The [MASK] sat on the [MASK]"
     0     1    2  3  4    5

Step 2: Model processing (bidirectional)
  Position 1 ("[MASK]"):
    ← Looks at: "The" (left)
    → Looks at: "sat on the" (right)
    Predicts: "cat" (correct!)
  
  Position 5 ("[MASK]"):
    ← Looks at: "The cat sat on the" (left)
    → No right context (end of sentence)
    Predicts: "mat" (correct!)

Step 3: Loss computation
  Position 1: -log P("cat" | context) = 0.1
  Position 5: -log P("mat" | context) = 0.2
  Total loss: (0.1 + 0.2) / 2 = 0.15
```

### **CLM Training:**

```
Input: "The cat sat on the mat"

Step 1: Autoregressive prediction
  Given: "<START>"        → Predict: "The"
  Given: "The"            → Predict: "cat"
  Given: "The cat"        → Predict: "sat"
  Given: "The cat sat"    → Predict: "on"
  Given: "The cat sat on" → Predict: "the"
  Given: "The cat sat on the" → Predict: "mat"
  Given: "The cat sat on the mat" → Predict: "<END>"

Step 2: Causal masking (prevents looking ahead)
        The   cat   sat   on    the   mat
The     ✓     ✗     ✗     ✗     ✗     ✗
cat     ✓     ✓     ✗     ✗     ✗     ✗
sat     ✓     ✓     ✓     ✗     ✗     ✗
on      ✓     ✓     ✓     ✓     ✗     ✗
the     ✓     ✓     ✓     ✓     ✓     ✗
mat     ✓     ✓     ✓     ✓     ✓     ✓

✓ = Can attend to
✗ = Cannot attend to (masked)

Step 3: Loss computation
  Sum of -log P(word_i | previous words) for all positions
```

### **Attention Patterns:**

**MLM (BERT-style):**
```
Sentence: "The [MASK] sat"

Token "[MASK]" attends to:
┌─────────────────────────┐
│  "The"  ←──┐            │
│            │            │
│ [MASK]  ←──┼──→ BIDI   │  ← Can see both sides!
│            │            │
│  "sat"  ←──┘            │
└─────────────────────────┘

Result: Rich context from both directions
```

**CLM (GPT-style):**
```
Predicting next after "The cat":

"The" can see: [itself]
"cat" can see: ["The", itself]
Next token can see: ["The", "cat"]
                       ↓
                  [predict "sat"]

┌─────────────────────────┐
│  "The"  ──→ "cat" ──→ ? │  ← Unidirectional!
└─────────────────────────┘

Result: Sequential, autoregressive
```

---

## **Real-World Applications:**

### **MLM (BERT) Applications:**

```python
from transformers import BertForMaskedLM, BertTokenizer

# 1. Fill in the blanks
model = BertForMaskedLM.from_pretrained('bert-base-uncased')
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

def predict_masked_word(sentence):
    inputs = tokenizer(sentence, return_tensors='pt')
    outputs = model(**inputs)
    
    # Get predictions for [MASK] token
    mask_token_index = torch.where(inputs['input_ids'] == tokenizer.mask_token_id)[1]
    mask_token_logits = outputs.logits[0, mask_token_index, :]
    
    # Top 5 predictions
    top_5_tokens = torch.topk(mask_token_logits, 5, dim=1).indices[0].tolist()
    
    for token in top_5_tokens:
        print(f"Prediction: {sentence.replace('[MASK]', tokenizer.decode([token]))}")

# Example
predict_masked_word("The capital of France is [MASK].")
# Output:
# Prediction: The capital of France is Paris.
# Prediction: The capital of France is Lyon.
# ...

# 2. Sentence Classification (Fine-tuned BERT)
from transformers import BertForSequenceClassification

model = BertForSequenceClassification.from_pretrained('bert-base-uncased', num_labels=2)

def classify_sentiment(text):
    inputs = tokenizer(text, return_tensors='pt', padding=True, truncation=True)
    outputs = model(**inputs)
    prediction = torch.argmax(outputs.logits, dim=-1)
    return "Positive" if prediction.item() == 1 else "Negative"

print(classify_sentiment("I love this movie!"))  # Positive
print(classify_sentiment("This film is terrible."))  # Negative

# 3. Question Answering
from transformers import BertForQuestionAnswering

qa_model = BertForQuestionAnswering.from_pretrained('bert-large-uncased-whole-word-masking-finetuned-squad')

def answer_question(question, context):
    inputs = tokenizer(question, context, return_tensors='pt')
    outputs = qa_model(**inputs)
    
    answer_start = torch.argmax(outputs.start_logits)
    answer_end = torch.argmax(outputs.end_logits) + 1
    
    answer = tokenizer.convert_tokens_to_string(
        tokenizer.convert_ids_to_tokens(inputs['input_ids'][0][answer_start:answer_end])
    )
    return answer

context = "The Transformer was introduced in 2017 by Vaswani et al."
question = "When was the Transformer introduced?"
print(answer_question(question, context))  # 2017
```

### **CLM (GPT) Applications:**

```python
from transformers import GPT2LMHeadModel, GPT2Tokenizer

model = GPT2LMHeadModel.from_pretrained('gpt2')
tokenizer = GPT2Tokenizer.from_pretrained('gpt2')

# 1. Text Generation
def generate_text(prompt, max_length=100):
    inputs = tokenizer(prompt, return_tensors='pt')
    outputs = model.generate(
        inputs['input_ids'],
        max_length=max_length,
        num_return_sequences=1,
        no_repeat_ngram_size=2,
        temperature=0.7,
        top_k=50,
        top_p=0.95
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

prompt = "Once upon a time, in a faraway land"
print(generate_text(prompt))
# Output: "Once upon a time, in a faraway land, there lived a young princess..."

# 2. Code Completion (GPT trained on code)
def complete_code(code_snippet):
    prompt = f"# Complete the following code:\n{code_snippet}"
    return generate_text(prompt, max_length=200)

code = """
def fibonacci(n):
    if n <= 1:
"""
print(complete_code(code))
# Output: Full function implementation

# 3. Dialogue
def chat(message, conversation_history=""):
    prompt = f"{conversation_history}\nUser: {message}\nAssistant:"
    response = generate_text(prompt, max_length=len(prompt.split()) + 50)
    return response.split("Assistant:")[-1].strip()

response = chat("Hello! How are you?")
print(f"Assistant: {response}")
# Output: "I'm doing great, thanks for asking! How can I help you today?"
```

### **Hybrid Applications (Both MLM and CLM):**

```python
# T5: Uses both during training, generates like CLM
from transformers import T5ForConditionalGeneration, T5Tokenizer

model = T5ForConditionalGeneration.from_pretrained('t5-base')
tokenizer = T5Tokenizer.from_pretrained('t5-base')

# Translation
def translate(text, source='en', target='fr'):
    input_text = f"translate {source} to {target}: {text}"
    inputs = tokenizer(input_text, return_tensors='pt')
    outputs = model.generate(inputs['input_ids'])
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

print(translate("Hello, how are you?"))  # "Bonjour, comment allez-vous?"

# Summarization
def summarize(article):
    input_text = f"summarize: {article}"
    inputs = tokenizer(input_text, return_tensors='pt', max_length=512, truncation=True)
    outputs = model.generate(inputs['input_ids'], max_length=150, min_length=40)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

article = "The Transformer architecture revolutionized NLP..."
print(summarize(article))
```

---

## **Common Misconceptions:**

### ❌ **Misconception 1: "MLM and CLM are mutually exclusive"**

**Reality:**
```python
# Many models use BOTH!

t5_training = {
    'pretraining': 'Span corruption (MLM-like)',
    'finetuning': 'Seq2seq generation (CLM-like)',
    'result': 'Best of both worlds'
}

# UniLM: Unified Language Model
unilm = {
    'idea': 'Single model with different attention masks',
    'mlm_mode': 'Bidirectional attention for understanding',
    'clm_mode': 'Causal attention for generation',
    'seq2seq_mode': 'Both (encoder bidirectional, decoder causal)'
}

reality = 'Not either/or — modern models combine both strategies!'
```

### ❌ **Misconception 2: "MLM models cannot generate text"**

**Reality:**
```python
# BERT CAN generate, just not as naturally as GPT

# Method 1: Iterative masking
def bert_generate(prompt, max_length=50):
    generated = prompt + " [MASK]" * (max_length - len(prompt.split()))
    
    for _ in range(max_length):
        # Predict first [MASK]
        masked_pos = generated.index("[MASK]")
        predicted_word = predict_masked_word(generated)
        generated = generated.replace("[MASK]", predicted_word, 1)
    
    return generated

# Method 2: Fine-tune BERT for generation
# (Though GPT is much better for this!)

conclusion = {
    'can_generate': True,
    'naturally_designed_for': False,
    'better_alternative': 'Use GPT for generation',
    'bert_strength': 'Understanding, not generation'
}
```

### ❌ **Misconception 3: "CLM models cannot understand context"**

**Reality:**
```python
# GPT understands context VERY well!

gpt_understanding = {
    'myth': 'Only left-to-right means no understanding',
    
    'reality': {
        'deep_layers': 'Build rich representations over many layers',
        'attention': 'Each layer can attend to all previous tokens',
        'emergence': 'Understanding emerges from predicting next token'
    },
    
    'evidence': {
        'gpt3': 'Excellent at few-shot learning',
        'gpt4': 'Human-level understanding on many tasks',
        'chatgpt': 'Understands complex conversations'
    }
}

# GPT-3 can do tasks that require deep understanding:
examples = [
    'Sentiment analysis: "This movie is... NOT bad" → Positive (understands negation)',
    'Sarcasm detection: "Oh great, another meeting" → Sarcastic',
    'Reasoning: "If A > B and B > C, what about A and C?" → A > C'
]
```

### ❌ **Misconception 4: "More masking is better for MLM"**

**Reality:**
```python
masking_experiments = {
    '5% masking': 'Too easy, not enough learning signal',
    '15% masking': 'OPTIMAL (original BERT)',
    '30% masking': 'Too hard, model struggles',
    '50% masking': 'Catastrophic, cannot learn',
    
    'sweet_spot': '15% masks enough tokens to learn, but leaves enough context'
}

# Why 80-10-10 split?
masking_strategy = {
    '80% [MASK]': 'Main training signal',
    '10% random': 'Prevents over-reliance on [MASK] token',
    '10% unchanged': 'Learns actual token distribution',
    
    'ablation': 'Removing 10-10 hurts performance!'
}
```

### ❌ **Misconception 5: "CLM is just predicting the next word"**

**Reality:**
```javascript
const clm_depth = {
  surface: 'Predict next word',
  
  actually_learns: {
    syntax: 'Grammar, sentence structure',
    semantics: 'Meaning, relationships',
    pragmatics: 'Context, intent',
    world_knowledge: 'Facts about the world',
    reasoning: 'Logical inference',
    common_sense: 'Unstated assumptions'
  },
  
  example: {
    prompt: 'The ice cream melted because it was',
    prediction: 'hot' (requires understanding physics!),
    not_just: 'Statistical word patterns'
  },
  
  emergence: 'Complex understanding emerges from simple objective'
};
```

---

## **Best Practices:**

### **1. Choosing Between MLM and CLM:**

```python
task_recommendations = {
    'Use MLM (BERT-style)': [
        'Classification (sentiment, topic, etc.)',
        'Named Entity Recognition',
        'Question Answering (extract answer from context)',
        'Sentence similarity',
        'Understanding-focused tasks'
    ],
    
    'Use CLM (GPT-style)': [
        'Text generation',
        'Code generation',
        'Dialogue systems',
        'Creative writing',
        'Few-shot learning',
        'Generation-focused tasks'
    ],
    
    'Use Both (T5-style)': [
        'Translation',
        'Summarization',
        'Question Answering (generate answer)',
        'Seq2seq tasks'
    ]
}

# Decision tree
def choose_architecture(task_type):
    if task_type in ['classification', 'tagging', 'extraction']:
        return 'MLM (BERT)'
    elif task_type in ['generation', 'completion', 'dialogue']:
        return 'CLM (GPT)'
    elif task_type in ['translation', 'summarization']:
        return 'Encoder-Decoder (T5, BART)'
    else:
        return 'Try all and compare!'
```

### **2. Pre-training Strategies:**

```python
# MLM Pre-training
mlm_best_practices = {
    'masking_rate': 0.15,
    'masking_strategy': '80-10-10',
    'batch_size': 'Large (256-1024)',
    'learning_rate': '1e-4 to 5e-5',
    'warmup_steps': '10% of total steps',
    'data': 'Diverse, high-quality text',
    'epochs': '100-1000 (until convergence)'
}

# CLM Pre-training
clm_best_practices = {
    'context_length': '512-2048 tokens',
    'batch_size': 'As large as GPU memory allows',
    'learning_rate': '6e-4 (GPT-3 used this)',
    'gradient_accumulation': 'To simulate larger batches',
    'data': 'Massive, diverse corpus',
    'training_time': 'Weeks to months on many GPUs'
}
```

### **3. Fine-tuning Strategies:**

```python
# Fine-tuning MLM model for classification
class BERTClassifier(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.bert = BertModel.from_pretrained('bert-base-uncased')
        self.classifier = nn.Linear(768, num_classes)
        self.dropout = nn.Dropout(0.1)
    
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids, attention_mask=attention_mask)
        cls_output = outputs.last_hidden_state[:, 0, :]  # [CLS] token
        cls_output = self.dropout(cls_output)
        logits = self.classifier(cls_output)
        return logits

# Best practices
finetuning_tips = {
    'learning_rate': '2e-5 to 5e-5 (lower than pre-training)',
    'epochs': '2-4 (more can overfit)',
    'batch_size': '16-32',
    'warmup': '10% of steps',
    'weight_decay': '0.01',
    'max_seq_length': '128-512',
    'early_stopping': 'Monitor validation loss',
    'layer_wise_lr_decay': 'Lower LR for lower layers'
}
```

### **4. Efficient Training:**

```python
# Mixed precision training
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

for batch in dataloader:
    optimizer.zero_grad()
    
    with autocast():
        outputs = model(**batch)
        loss = outputs.loss
    
    scaler.scale(loss).backward()
    scaler.unscale_(optimizer)
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
    scaler.step(optimizer)
    scaler.update()

# Gradient checkpointing (save memory)
from torch.utils.checkpoint import checkpoint

class MemoryEfficientTransformer(nn.Module):
    def forward(self, x):
        # Use checkpointing for transformer layers
        for layer in self.layers:
            x = checkpoint(layer, x)
        return x
```

---

## **Key Takeaways:**

```javascript
const mlm_vs_clm = {
  MLM: {
    objective: 'Predict masked tokens from bidirectional context',
    strength: 'Deep understanding of language',
    architecture: 'Encoder-only (BERT)',
    best_for: 'Classification, extraction, understanding',
    training: 'Mask 15% of tokens, predict them'
  },
  
  CLM: {
    objective: 'Predict next token from left context',
    strength: 'Natural text generation',
    architecture: 'Decoder-only (GPT)',
    best_for: 'Generation, completion, dialogue',
    training: 'Maximize P(w_t | w_1, ..., w_{t-1})'
  },
  
  revolution: {
    'before_2018': 'Train from scratch for every task',
    'after_2018': 'Pre-train once, fine-tune for many tasks',
    'impact': 'Transfer learning for NLP!'
  }
};
```

---

## ✅ **Review Questions:**

1. **Conceptual:**
   - Why is MLM called "masked"?
   - How does CLM differ from MLM?
   - What is the purpose of pre-training?

2. **Technical:**
   - Why mask 15% of tokens, not more?
   - Why 80-10-10 masking strategy?
   - What is teacher forcing in CLM?

3. **Practical:**
   - When would you use BERT vs GPT?
   - Can MLM models generate text?
   - How do you fine-tune a pre-trained model?

4. **Deep:**
   - Why does predicting next word lead to understanding?
   - Can a single model do both MLM and CLM?
   - What is the trade-off between context length and speed?

---

## 🧩 **Practice Problems:**

### **Problem 1:**

Implement masking function:
```python
def mask_tokens(tokens, mask_prob=0.15):
    # Implement 80-10-10 strategy
    pass
```

### **Problem 2:**

Calculate training cost:
- Vocabulary size: 50,000
- Sequence length: 512
- Batch size: 256
- Model: 12 layers, d_model=768
- How many FLOPs per forward pass?

### **Problem 3:**

Design pre-training strategy for:
- **Task:** Medical text understanding
- **Data:** 100M medical documents
- **Goal:** Fine-tune for diagnosis classification
- **Question:** MLM, CLM, or both? Why?

---

## 🚀 **Mini Project:**

Train mini-BERT and mini-GPT from scratch:

```python
# 1. Implement MLM model (BERT-style)
# 2. Implement CLM model (GPT-style)
# 3. Train on same dataset (e.g., WikiText-2)
# 4. Fine-tune both for sentiment analysis
# 5. Compare performance
# 6. Analyze attention patterns

# Expected observations:
# - BERT better at classification
# - GPT better at generation
# - Both learn meaningful representations!
```

---

**🎉 MLM & CLM Complete!**

You now understand:
- Two fundamental pre-training objectives
- How BERT and GPT work
- When to use which architecture
- Training and fine-tuning strategies

**Next:** **GPT & BERT** - Deep dive into these iconic models! 🚀
