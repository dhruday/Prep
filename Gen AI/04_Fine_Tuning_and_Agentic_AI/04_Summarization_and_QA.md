# 📘 Text Summarization & Question Answering

---

## **Purpose (Why this exists):**

### **The Information Overload Crisis:**

```javascript
const modern_information_problem = {
  data_explosion: {
    emails_per_day: 306_000_000_000,  // 306 billion emails daily
    articles_published: 7_500_000,      // 7.5M articles per day
    meeting_notes: 'Endless',
    research_papers: 'Thousands daily',
    
    human_capacity: {
      reading_speed: '200-300 words/minute',
      working_hours: '8 hours/day',
      conclusion: 'Cannot possibly read everything!'
    }
  },
  
  business_need: {
    executives: 'Need executive summaries',
    researchers: 'Need literature review',
    customer_support: 'Need instant answers from docs',
    legal: 'Need to extract key info from contracts',
    medical: 'Need patient history summaries'
  },
  
  ai_solution: {
    summarization: 'Condense 10 pages → 1 paragraph',
    qa: 'Answer "What is X?" from documents instantly',
    impact: 'Save thousands of human-hours'
  }
};
```

### **Why These Tasks Matter:**

```
Traditional Approach:
  1000-page document → Human reads 5 hours → Extract 10 key points
  
AI Approach:
  1000-page document → Model processes 1 minute → Extract 10 key points
  
Savings: 299 minutes per document
         × 10 documents per day
         = 50 hours saved per week per person!
```

---

## **What it is:**

### **1. Text Summarization:**

```javascript
const text_summarization = {
  definition: 'Automatically generate shorter version of text while preserving key information',
  
  types: {
    extractive: {
      method: 'Select and combine important sentences from original',
      analogy: 'Like highlighting key sentences in a textbook',
      example: 'Original has 50 sentences → Select top 5 → Done',
      pros: 'Grammatically correct, preserves exact wording',
      cons: 'May be choppy, less natural'
    },
    
    abstractive: {
      method: 'Generate new text that captures meaning',
      analogy: 'Like writing your own notes after reading',
      example: 'Read article → Understand → Write summary in own words',
      pros: 'Natural, coherent, can paraphrase',
      cons: 'May introduce errors, hallucinations'
    }
  },
  
  modern_approach: {
    model: 'Transformer-based (BART, T5, Pegasus)',
    type: 'Abstractive (seq2seq)',
    training: 'Supervised on (article, summary) pairs',
    breakthrough: 'Can understand and rephrase like humans'
  }
};
```

### **2. Question Answering:**

```javascript
const question_answering = {
  definition: 'Given context and question, extract or generate answer',
  
  types: {
    extractive_qa: {
      method: 'Find answer span in given context',
      example: {
        context: 'Paris is the capital of France. It has 2.2M people.',
        question: 'What is the capital of France?',
        answer: 'Paris',  // Extracted from position [0:5]
        
        how: 'Model predicts start and end positions in text'
      },
      models: 'BERT, RoBERTa, ELECTRA',
      use_case: 'Reading comprehension, document search'
    },
    
    open_qa: {
      method: 'Answer from general knowledge (no context given)',
      example: {
        question: 'Who invented the telephone?',
        answer: 'Alexander Graham Bell',
        // No context provided!
      },
      models: 'T5, GPT, RAG',
      use_case: 'General Q&A, chatbots'
    },
    
    multi_hop_qa: {
      method: 'Requires reasoning over multiple pieces of info',
      example: {
        context: 'John lives in Paris. Paris is in France. France is in Europe.',
        question: 'What continent does John live in?',
        answer: 'Europe',  // Requires: John→Paris→France→Europe
        reasoning: 'Chain multiple facts together'
      },
      difficulty: 'Very hard',
      models: 'Specialized architectures'
    }
  }
};
```

---

## **How it works (Intuition):**

### **Summarization Intuition:**

```javascript
// Human summarization process
const human_summarization = {
  step1: 'Read entire document',
  step2: 'Understand main ideas',
  step3: 'Identify key points',
  step4: 'Write concise version in own words',
  
  mental_model: 'Compression: 100 sentences → 5 core ideas'
};

// AI summarization (abstractive)
const ai_summarization = {
  step1: 'Encode document into representation',
  step2: 'Attention identifies important parts',
  step3: 'Decoder generates summary token by token',
  step4: 'Trained to maximize similarity to human summaries',
  
  architecture: 'Seq2Seq with attention',
  
  visual: `
    Input: "Long article about AI..."
                  ↓
    Encoder: [h1, h2, h3, ..., h1000]  ← Context vectors
                  ↓
    Attention: Focus on important parts
                  ↓
    Decoder: Generate "AI" → "is" → "transforming" → ...
                  ↓
    Output: "AI is transforming industries by..."
  `
};
```

### **QA Intuition:**

```javascript
// Human QA process
const human_qa = {
  given: {
    context: 'Long paragraph about topic',
    question: 'When did X happen?'
  },
  
  process: [
    '1. Read question',
    '2. Identify what is being asked (date)',
    '3. Scan context for date-related info',
    '4. Find relevant sentence',
    '5. Extract specific date',
    '6. Return answer'
  ],
  
  mental_model: 'Pattern matching + understanding'
};

// AI QA (extractive)
const ai_qa = {
  model: 'BERT-based',
  
  process: [
    '1. Encode question and context together',
    '2. For each token, compute probability of being:',
    '   - Start of answer',
    '   - End of answer',
    '3. Find span with highest combined probability',
    '4. Extract text between start and end'
  ],
  
  visual: `
    Question: "When did X happen?"
    Context: "In 2020, X happened. It was significant."
                     ^^^^
                     Found!
    
    Model outputs:
      Position:  0   1   2    3  4   5      6  7   8  9
      Tokens:    In  2020 ,   X  happened . It was significant .
      P(start):  0.1 0.9  0.05 0.1 0.05     0  0   0   0
      P(end):    0.1 0.1  0.9  0.2 0.1      0  0   0   0
                     ^^^^
                     Answer: "2020"
  `
};
```

---

## **How it works (Math – simplified):**

### **Extractive Summarization Math:**

```python
# Extractive Summarization: Score-based sentence selection

import numpy as np

def extractive_summarization(sentences, num_sentences=3):
    """
    Select most important sentences using TF-IDF + cosine similarity
    """
    # Step 1: TF-IDF scores
    # TF (Term Frequency): frequency of word in sentence
    # IDF (Inverse Document Frequency): log(N / df)
    # where N = total docs, df = docs containing term
    
    # For sentence s and word w:
    # TF-IDF(w, s) = TF(w, s) × IDF(w)
    
    # Step 2: Sentence vectors
    # v_s = [TF-IDF(w1, s), TF-IDF(w2, s), ..., TF-IDF(wV, s)]
    
    # Step 3: Sentence importance
    # Score(s) = cosine_similarity(v_s, v_document)
    #          = (v_s · v_doc) / (||v_s|| × ||v_doc||)
    
    # Step 4: Select top-N sentences
    scores = []
    for sentence in sentences:
        score = calculate_importance(sentence, sentences)
        scores.append(score)
    
    top_indices = np.argsort(scores)[-num_sentences:]
    summary = [sentences[i] for i in sorted(top_indices)]
    
    return summary


def calculate_importance(sentence, all_sentences):
    """
    Calculate importance using centrality
    """
    # Centrality: How similar is this sentence to all others?
    # High centrality = captures main theme
    
    similarities = []
    for other in all_sentences:
        if other != sentence:
            sim = cosine_similarity(sentence, other)
            similarities.append(sim)
    
    return np.mean(similarities)
```

### **Abstractive Summarization Math:**

```python
# Abstractive Summarization: Seq2Seq with Attention

def abstractive_summarization(document):
    """
    Generate summary using encoder-decoder
    """
    # Input: x = [x1, x2, ..., xT]  (document tokens)
    # Output: y = [y1, y2, ..., yT']  (summary tokens)
    
    # ===== ENCODER =====
    # Encode document into hidden states
    # h_t = LSTM(x_t, h_{t-1})
    # H = [h_1, h_2, ..., h_T]
    
    encoder_outputs = []
    h = initial_hidden_state
    for x_t in document_tokens:
        h = encoder_lstm(x_t, h)
        encoder_outputs.append(h)
    # encoder_outputs shape: [T, hidden_dim]
    
    # ===== DECODER with ATTENTION =====
    # Generate summary one token at a time
    
    decoder_hidden = encoder_outputs[-1]  # Initial state
    generated_summary = []
    
    for t in range(max_summary_length):
        # Attention: Which encoder states to focus on?
        # α_i = softmax(score(decoder_hidden, encoder_outputs[i]))
        # context = Σ α_i × encoder_outputs[i]
        
        attention_weights = []
        for encoder_output in encoder_outputs:
            score = dot_product(decoder_hidden, encoder_output)
            attention_weights.append(score)
        
        attention_weights = softmax(attention_weights)
        
        context = sum(
            w * enc_out 
            for w, enc_out in zip(attention_weights, encoder_outputs)
        )
        
        # Generate next token
        # y_t ~ P(y_t | y_{<t}, context)
        combined = concatenate(decoder_hidden, context)
        logits = output_layer(combined)
        y_t = argmax(logits)  # Or sample
        
        generated_summary.append(y_t)
        
        # Update decoder state
        decoder_hidden = decoder_lstm(y_t, decoder_hidden)
        
        if y_t == END_TOKEN:
            break
    
    return generated_summary


# Training objective: Maximize log-likelihood
# L = Σ log P(y_t | y_{<t}, x)
# where x = document, y = summary
```

### **Question Answering Math:**

```python
# Extractive QA: BERT-based span prediction

def question_answering(question, context):
    """
    Predict answer span in context
    """
    # Input format: [CLS] question [SEP] context [SEP]
    input_text = f"[CLS] {question} [SEP] {context} [SEP]"
    
    # Tokenize
    tokens = tokenizer(input_text)
    # tokens = [CLS, What, is, ..., question tokens..., SEP, context tokens..., SEP]
    
    # BERT encoding
    # H = BERT(tokens)
    # H shape: [seq_len, 768]
    H = bert_model(tokens)
    
    # ===== Predict Start Position =====
    # P(start = i) = softmax(H · W_start)
    # W_start shape: [768, 1]
    
    start_logits = linear_start(H)  # [seq_len, 1]
    start_probs = softmax(start_logits)
    
    # ===== Predict End Position =====
    # P(end = j) = softmax(H · W_end)
    end_logits = linear_end(H)  # [seq_len, 1]
    end_probs = softmax(end_logits)
    
    # ===== Find Best Span =====
    # score(i, j) = P(start=i) × P(end=j)
    # Constraint: i <= j, both in context (not question)
    
    best_score = 0
    best_start, best_end = 0, 0
    
    for i in range(len(tokens)):
        for j in range(i, min(i + max_answer_length, len(tokens))):
            if is_in_context(i) and is_in_context(j):
                score = start_probs[i] * end_probs[j]
                if score > best_score:
                    best_score = score
                    best_start, best_end = i, j
    
    # Extract answer
    answer_tokens = tokens[best_start:best_end+1]
    answer = tokenizer.decode(answer_tokens)
    
    return answer


# Training objective: Cross-entropy loss
# L = -log P(start = s*) - log P(end = e*)
# where s*, e* are true start/end positions
```

---

## **Visual Explanation (described):**

### **Abstractive Summarization Architecture:**

```
INPUT DOCUMENT (1000 tokens):
┌────────────────────────────────────────────────┐
│ "Machine learning is a subset of artificial    │
│ intelligence that enables systems to learn     │
│ from data. Deep learning, a type of machine   │
│ learning, uses neural networks with many      │
│ layers..."                                     │
└────────────────────────────────────────────────┘
                    ↓
         TOKENIZATION & EMBEDDING
                    ↓
┌────────────────────────────────────────────────┐
│     ENCODER (Transformer/LSTM)                 │
│                                                │
│  [h1] [h2] [h3] ... [h1000]                   │
│   ↑    ↑    ↑         ↑                       │
│  Each h_i captures meaning of position i      │
└────────────────────────────────────────────────┘
                    ↓
         ATTENTION MECHANISM
      (Which parts are important?)
                    ↓
┌────────────────────────────────────────────────┐
│     DECODER (Generate summary)                 │
│                                                │
│  Step 1: Generate "Machine"                   │
│  Step 2: Generate "learning" (given "Machine") │
│  Step 3: Generate "uses" ...                  │
│  ...                                           │
└────────────────────────────────────────────────┘
                    ↓
OUTPUT SUMMARY (50 tokens):
┌────────────────────────────────────────────────┐
│ "Machine learning uses data to enable systems │
│ to learn. Deep learning employs multi-layer   │
│ neural networks."                              │
└────────────────────────────────────────────────┘

Compression Ratio: 1000 → 50 (20x compression)
```

### **Question Answering Process:**

```
INPUT:
┌─────────────────────────────────────────────┐
│ Question: "When was Tesla founded?"         │
│                                             │
│ Context: "Tesla, Inc. was founded in 2003  │
│ by Martin Eberhard and Marc Tarpenning.    │
│ Elon Musk became chairman in 2004. The     │
│ company is based in Austin, Texas."        │
└─────────────────────────────────────────────┘
            ↓
COMBINE & TOKENIZE:
[CLS] When was Tesla founded? [SEP] Tesla Inc was founded in 2003 by ... [SEP]
            ↓
BERT ENCODING:
Each token → 768-dimensional vector
            ↓
START/END PREDICTION:
┌─────────────────────────────────────────────┐
│ Tokens:    Tesla Inc was founded in 2003 by│
│ P(start):  0.1   0.1 0.1  0.1    0.1 0.9  │
│ P(end):    0.1   0.1 0.1  0.1    0.1 0.9  │
│                                     ^^^^    │
│                                  Answer!    │
└─────────────────────────────────────────────┘
            ↓
OUTPUT:
┌─────────────────────────────────────────────┐
│ Answer: "2003"                              │
│ Confidence: 87%                             │
│ Context: "...founded in 2003 by..."        │
└─────────────────────────────────────────────┘
```

---

## **Simple Example:**

### **JavaScript Conceptual Implementation:**

```javascript
// Simplified Extractive Summarization

class ExtractiveSummarizer {
  constructor() {
    this.stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an']);
  }
  
  summarize(text, numSentences = 3) {
    // Step 1: Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    if (sentences.length <= numSentences) {
      return text;
    }
    
    // Step 2: Calculate word frequencies
    const wordFreq = this.getWordFrequencies(sentences);
    
    // Step 3: Score each sentence
    const sentenceScores = sentences.map(sentence => ({
      sentence,
      score: this.scoreSentence(sentence, wordFreq)
    }));
    
    // Step 4: Select top sentences
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, numSentences)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));
    
    return topSentences.map(s => s.sentence.trim()).join(' ');
  }
  
  getWordFrequencies(sentences) {
    const freq = {};
    const allText = sentences.join(' ').toLowerCase();
    const words = allText.match(/\b\w+\b/g) || [];
    
    for (const word of words) {
      if (!this.stopWords.has(word)) {
        freq[word] = (freq[word] || 0) + 1;
      }
    }
    
    return freq;
  }
  
  scoreSentence(sentence, wordFreq) {
    const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
    let score = 0;
    
    for (const word of words) {
      if (!this.stopWords.has(word)) {
        score += wordFreq[word] || 0;
      }
    }
    
    return score / words.length;  // Normalize by length
  }
}

// Usage
const summarizer = new ExtractiveSummarizer();

const article = `
  Machine learning is a subset of artificial intelligence. 
  It enables systems to learn from data without explicit programming. 
  Deep learning is a type of machine learning that uses neural networks. 
  Neural networks are inspired by the human brain. 
  They consist of layers of interconnected nodes. 
  Each layer learns increasingly complex features. 
  This approach has revolutionized computer vision and NLP.
`;

const summary = summarizer.summarize(article, 3);
console.log('Summary:', summary);
```

```javascript
// Simplified Question Answering

class SimpleQASystem {
  constructor() {
    this.stopWords = new Set(['the', 'is', 'was', 'are', 'a', 'an']);
  }
  
  answer(question, context) {
    // Step 1: Extract question keywords
    const questionKeywords = this.extractKeywords(question);
    
    // Step 2: Split context into sentences
    const sentences = context.match(/[^.!?]+[.!?]+/g) || [];
    
    // Step 3: Find most relevant sentence
    const scoredSentences = sentences.map(sentence => ({
      sentence,
      score: this.scoreSentence(sentence, questionKeywords)
    }));
    
    const best = scoredSentences.sort((a, b) => b.score - a.score)[0];
    
    if (!best || best.score === 0) {
      return { answer: "I don't know", confidence: 0 };
    }
    
    // Step 4: Extract answer from best sentence
    const answer = this.extractAnswer(question, best.sentence);
    
    return {
      answer,
      confidence: best.score,
      context: best.sentence.trim()
    };
  }
  
  extractKeywords(text) {
    return text.toLowerCase()
      .match(/\b\w+\b/g)
      .filter(word => !this.stopWords.has(word));
  }
  
  scoreSentence(sentence, keywords) {
    const sentenceWords = this.extractKeywords(sentence);
    let matches = 0;
    
    for (const keyword of keywords) {
      if (sentenceWords.includes(keyword)) {
        matches++;
      }
    }
    
    return matches / keywords.length;
  }
  
  extractAnswer(question, sentence) {
    // Simple heuristic: return key phrase
    const questionType = this.getQuestionType(question);
    
    if (questionType === 'when') {
      const dateMatch = sentence.match(/\b(19|20)\d{2}\b/);
      return dateMatch ? dateMatch[0] : sentence.trim();
    } else if (questionType === 'where') {
      // Look for location indicators
      return sentence.trim();
    } else {
      return sentence.trim();
    }
  }
  
  getQuestionType(question) {
    const q = question.toLowerCase();
    if (q.startsWith('when')) return 'when';
    if (q.startsWith('where')) return 'where';
    if (q.startsWith('who')) return 'who';
    if (q.startsWith('what')) return 'what';
    if (q.startsWith('why')) return 'why';
    if (q.startsWith('how')) return 'how';
    return 'general';
  }
}

// Usage
const qa = new SimpleQASystem();

const context = `
  Tesla, Inc. was founded in 2003 by Martin Eberhard and Marc Tarpenning.
  Elon Musk became chairman in 2004.
  The company is based in Austin, Texas.
  Tesla produces electric vehicles and clean energy products.
`;

const result = qa.answer("When was Tesla founded?", context);
console.log('Answer:', result.answer);
console.log('Confidence:', result.confidence);
console.log('Context:', result.context);
```

### **Python Real Implementation:**

```python
# ============================================
# 1. Text Summarization
# ============================================

from transformers import pipeline

# Using pre-trained summarization model
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# Long article
article = """
Machine learning is a subset of artificial intelligence that enables systems
to learn and improve from experience without being explicitly programmed.
It focuses on developing computer programs that can access data and learn
from it autonomously. The process of learning begins with observations or
data, such as examples, direct experience, or instruction, to look for
patterns in data and make better decisions in the future. Deep learning is
a subset of machine learning that uses neural networks with multiple layers.
These networks are capable of learning complex patterns in large amounts of
data. Deep learning has been particularly successful in areas such as image
recognition, natural language processing, and speech recognition.
"""

# Generate summary
summary = summarizer(
    article,
    max_length=60,
    min_length=30,
    do_sample=False
)

print("Original length:", len(article.split()))
print("Summary length:", len(summary[0]['summary_text'].split()))
print("\nSummary:", summary[0]['summary_text'])


# Multiple summaries (different lengths)
for max_len in [30, 60, 100]:
    summary = summarizer(article, max_length=max_len, min_length=10)[0]
    print(f"\nSummary ({max_len} tokens):")
    print(summary['summary_text'])


# ============================================
# 2. Different Summarization Models
# ============================================

models = {
    'BART': 'facebook/bart-large-cnn',
    'T5': 't5-small',
    'Pegasus': 'google/pegasus-xsum'
}

for name, model_name in models.items():
    print(f"\n{name} Summary:")
    summarizer = pipeline("summarization", model=model_name)
    
    if name == 'T5':
        # T5 requires prefix
        result = summarizer(f"summarize: {article}", max_length=60)
    else:
        result = summarizer(article, max_length=60, min_length=30)
    
    print(result[0]['summary_text'])


# ============================================
# 3. Question Answering
# ============================================

from transformers import pipeline

# Pre-trained QA model
qa_pipeline = pipeline("question-answering", model="distilbert-base-cased-distilled-squad")

context = """
Tesla, Inc. was founded in 2003 by Martin Eberhard and Marc Tarpenning. 
The company's name is a tribute to inventor Nikola Tesla. Elon Musk became 
the largest shareholder in 2004 with a $6.5 million investment and became 
chairman of the board. In 2008, Musk became CEO. Tesla is headquartered in 
Austin, Texas, and has become the world's most valuable automaker by market 
capitalization. The company's first product was the Tesla Roadster, launched 
in 2008. This was followed by the Model S in 2012, Model X in 2015, Model 3 
in 2017, and Model Y in 2020.
"""

# Ask multiple questions
questions = [
    "When was Tesla founded?",
    "Who founded Tesla?",
    "Where is Tesla headquartered?",
    "What was Tesla's first product?",
    "When did Elon Musk become CEO?"
]

for question in questions:
    result = qa_pipeline(question=question, context=context)
    print(f"\nQ: {question}")
    print(f"A: {result['answer']}")
    print(f"Confidence: {result['score']:.2%}")
    print(f"Position: [{result['start']}:{result['end']}]")


# ============================================
# 4. Custom QA with Manual Control
# ============================================

from transformers import AutoTokenizer, AutoModelForQuestionAnswering
import torch

model_name = "deepset/bert-base-cased-squad2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForQuestionAnswering.from_pretrained(model_name)

def answer_question(question, context):
    # Tokenize
    inputs = tokenizer(
        question,
        context,
        return_tensors="pt",
        max_length=512,
        truncation=True
    )
    
    # Get model predictions
    with torch.no_grad():
        outputs = model(**inputs)
    
    # Get start and end logits
    start_logits = outputs.start_logits
    end_logits = outputs.end_logits
    
    # Find best answer span
    start_idx = torch.argmax(start_logits)
    end_idx = torch.argmax(end_logits)
    
    # Get confidence scores
    start_score = torch.softmax(start_logits, dim=1)[0][start_idx].item()
    end_score = torch.softmax(end_logits, dim=1)[0][end_idx].item()
    confidence = (start_score + end_score) / 2
    
    # Extract answer
    answer_tokens = inputs['input_ids'][0][start_idx:end_idx+1]
    answer = tokenizer.decode(answer_tokens, skip_special_tokens=True)
    
    return {
        'answer': answer,
        'confidence': confidence,
        'start': start_idx.item(),
        'end': end_idx.item()
    }

# Test
result = answer_question("When was Tesla founded?", context)
print(f"\nAnswer: {result['answer']}")
print(f"Confidence: {result['confidence']:.2%}")


# ============================================
# 5. Fine-tuning for Custom Domain
# ============================================

from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    Trainer,
    TrainingArguments,
    DataCollatorForSeq2Seq
)
from datasets import load_dataset

# Load dataset
dataset = load_dataset("xsum")  # BBC news summarization

# Load model
model_name = "t5-small"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# Preprocessing
def preprocess_function(examples):
    inputs = ["summarize: " + doc for doc in examples["document"]]
    model_inputs = tokenizer(
        inputs,
        max_length=512,
        truncation=True,
        padding="max_length"
    )
    
    # Tokenize targets
    labels = tokenizer(
        examples["summary"],
        max_length=128,
        truncation=True,
        padding="max_length"
    )
    
    model_inputs["labels"] = labels["input_ids"]
    return model_inputs

# Process dataset
tokenized_dataset = dataset.map(
    preprocess_function,
    batched=True,
    remove_columns=dataset["train"].column_names
)

# Training arguments
training_args = TrainingArguments(
    output_dir="./summarization_model",
    evaluation_strategy="steps",
    eval_steps=500,
    learning_rate=5e-5,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=3,
    weight_decay=0.01,
    save_steps=1000,
    logging_steps=100,
    fp16=True  # Mixed precision
)

# Data collator
data_collator = DataCollatorForSeq2Seq(
    tokenizer=tokenizer,
    model=model
)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"].select(range(1000)),  # Subset for demo
    eval_dataset=tokenized_dataset["validation"].select(range(100)),
    data_collator=data_collator
)

# Train
trainer.train()

# Save
model.save_pretrained("./my_summarization_model")
tokenizer.save_pretrained("./my_summarization_model")


# ============================================
# 6. Evaluation Metrics
# ============================================

from rouge_score import rouge_scorer
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction

# ROUGE for summarization
scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)

reference = "Machine learning enables systems to learn from data."
hypothesis = "Machine learning allows systems to learn using data."

scores = scorer.score(reference, hypothesis)
print("\nROUGE Scores:")
for key, value in scores.items():
    print(f"{key}: Precision={value.precision:.3f}, Recall={value.recall:.3f}, F1={value.fmeasure:.3f}")


# BLEU for text generation
reference = ["Machine", "learning", "enables", "systems", "to", "learn"]
hypothesis = ["Machine", "learning", "allows", "systems", "to", "learn"]

smoothing = SmoothingFunction().method1
bleu = sentence_bleu([reference], hypothesis, smoothing_function=smoothing)
print(f"\nBLEU Score: {bleu:.3f}")


# ============================================
# 7. Combined Pipeline: Summarize then QA
# ============================================

class SummarizeAndAnswer:
    def __init__(self):
        self.summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
        self.qa = pipeline("question-answering")
    
    def process(self, long_document, questions):
        # Step 1: Summarize document
        summary = self.summarizer(
            long_document,
            max_length=300,
            min_length=100
        )[0]['summary_text']
        
        print(f"Document length: {len(long_document.split())} words")
        print(f"Summary length: {len(summary.split())} words\n")
        print(f"Summary: {summary}\n")
        
        # Step 2: Answer questions from summary
        answers = []
        for question in questions:
            result = self.qa(question=question, context=summary)
            answers.append({
                'question': question,
                'answer': result['answer'],
                'confidence': result['score']
            })
        
        return {
            'summary': summary,
            'answers': answers
        }

# Usage
pipeline_system = SummarizeAndAnswer()

long_doc = """
[Very long document about AI history, applications, etc...]
[1000+ words]
"""

questions = [
    "What is machine learning?",
    "What are applications of deep learning?"
]

results = pipeline_system.process(long_doc, questions)

for ans in results['answers']:
    print(f"Q: {ans['question']}")
    print(f"A: {ans['answer']} ({ans['confidence']:.2%})\n")
```

---

## **Real-World Applications:**

### **1. Customer Support Automation:**

```python
# Automatic FAQ answering

class CustomerSupportQA:
    def __init__(self):
        self.qa = pipeline("question-answering")
        self.knowledge_base = self.load_knowledge_base()
    
    def load_knowledge_base(self):
        return {
            'shipping': """
                We offer free shipping on orders over $50. 
                Standard shipping takes 3-5 business days.
                Express shipping is available for $15 and takes 1-2 days.
                International shipping is available to most countries.
            """,
            'returns': """
                Items can be returned within 30 days of purchase.
                Products must be unused and in original packaging.
                Refunds are processed within 5-7 business days.
            """,
            'warranty': """
                All products come with a 1-year manufacturer warranty.
                Extended warranty is available for purchase.
                Warranty covers manufacturing defects only.
            """
        }
    
    def answer(self, customer_question):
        # Find relevant context
        best_context = None
        best_score = 0
        
        for category, context in self.knowledge_base.items():
            # Simple keyword matching (in production, use embeddings)
            score = self.relevance_score(customer_question, context)
            if score > best_score:
                best_score = score
                best_context = context
        
        if best_context:
            result = self.qa(
                question=customer_question,
                context=best_context
            )
            return result['answer']
        
        return "I don't have information about that. Please contact support."

# Handles thousands of customer questions automatically!
```

### **2. Meeting Summarization:**

```python
# Summarize Zoom/Teams meetings

class MeetingSummarizer:
    def __init__(self):
        self.summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    
    def summarize_meeting(self, transcript, extract_action_items=True):
        # Generate summary
        summary = self.summarizer(
            transcript,
            max_length=200,
            min_length=50
        )[0]['summary_text']
        
        # Extract action items (simple heuristic)
        action_items = []
        if extract_action_items:
            lines = transcript.split('.')
            for line in lines:
                if any(keyword in line.lower() for keyword in 
                       ['will', 'should', 'need to', 'must', 'action']):
                    action_items.append(line.strip())
        
        return {
            'summary': summary,
            'action_items': action_items[:5],  # Top 5
            'original_length': len(transcript.split()),
            'summary_length': len(summary.split())
        }

# Saves hours of manual note-taking!
```

### **3. Legal Document Analysis:**

```python
# Extract key information from contracts

class LegalDocumentQA:
    def __init__(self):
        self.qa = pipeline("question-answering", 
                          model="deepset/roberta-base-squad2")
    
    def analyze_contract(self, contract_text):
        questions = [
            "What is the contract effective date?",
            "Who are the parties involved?",
            "What is the contract duration?",
            "What are the termination conditions?",
            "What is the payment amount?",
            "What are the deliverables?"
        ]
        
        analysis = {}
        for question in questions:
            result = self.qa(question=question, context=contract_text)
            analysis[question] = {
                'answer': result['answer'],
                'confidence': result['score']
            }
        
        return analysis

# Extracts key contract terms in seconds vs hours of manual review
```

---

## **Common Misconceptions:**

### ❌ **Misconception 1: "Abstractive summaries are always better"**

**Reality:**
```python
comparison = {
    'extractive': {
        'pros': [
            'Factually accurate (uses original text)',
            'No hallucinations',
            'Faster to compute',
            'Better for technical/legal documents'
        ],
        'cons': [
            'May be choppy',
            'Cannot paraphrase',
            'Limited compression ratio'
        ]
    },
    
    'abstractive': {
        'pros': [
            'Natural, fluent text',
            'Can paraphrase and combine ideas',
            'Better compression'
        ],
        'cons': [
            'May hallucinate facts',
            'Computationally expensive',
            'Harder to verify accuracy'
        ]
    },
    
    'best_practice': 'Choose based on use case: Legal→Extractive, News→Abstractive'
}
```

### ❌ **Misconception 2: "QA models understand like humans"**

**Reality:**
```python
what_qa_models_do = {
    'actual_process': [
        'Pattern matching in text',
        'Statistical correlations',
        'Position prediction (start/end)'
    ],
    
    'what_they_dont_do': [
        'True understanding',
        'Reasoning (without training)',
        'Common sense inference'
    ],
    
    'example': {
        'question': 'What color is the sky?',
        'context': 'The grass is green. The sky is blue.',
        'model': 'Finds "sky is blue" → Returns "blue" ✓',
        
        'question2': 'What color is grass?',
        'context': 'The sky is blue.',  # No mention of grass!
        'model': 'Cannot answer (no pattern match) ✗',
        
        'human': 'Would use world knowledge (grass is green)'
    }
}
```

### ❌ **Misconception 3: "Longer summaries are always better"**

**Reality:**
```python
summary_length_tradeoff = {
    'short_summary': {
        'length': '20-50 words',
        'use_case': 'Email subject lines, headlines',
        'risk': 'May miss important details',
        'benefit': 'Very quick to read'
    },
    
    'medium_summary': {
        'length': '100-200 words',
        'use_case': 'Executive summaries, meeting notes',
        'balance': 'Good detail vs brevity tradeoff'
    },
    
    'long_summary': {
        'length': '500+ words',
        'use_case': 'Literature reviews, detailed reports',
        'risk': 'Defeats purpose of summarization',
        'note': 'If summary is too long, just read original!'
    },
    
    'rule': 'Summary length = f(reader_time, document_complexity, purpose)'
}
```

---

## **Best Practices:**

### **1. Summarization Best Practices:**

```python
class BestPracticeSummarizer:
    def __init__(self):
        self.summarizer = pipeline("summarization")
    
    def summarize_with_best_practices(self, text):
        # 1. Check length
        word_count = len(text.split())
        if word_count < 50:
            return text  # Too short to summarize
        
        # 2. Adjust parameters based on length
        if word_count < 200:
            max_length = 50
        elif word_count < 500:
            max_length = 100
        else:
            max_length = 150
        
        min_length = max_length // 3
        
        # 3. Use appropriate model
        if word_count > 1000:
            # Use BART for long documents
            model = "facebook/bart-large-cnn"
        else:
            # Use T5 for shorter texts
            model = "t5-small"
        
        # 4. Generate summary
        summary = self.summarizer(
            text,
            max_length=max_length,
            min_length=min_length,
            do_sample=False,  # Deterministic
            truncation=True
        )[0]['summary_text']
        
        # 5. Post-process
        summary = self.post_process(summary)
        
        return summary
    
    def post_process(self, summary):
        # Remove incomplete sentences
        if not summary.endswith(('.', '!', '?')):
            # Find last complete sentence
            last_period = summary.rfind('.')
            if last_period > 0:
                summary = summary[:last_period+1]
        
        return summary.strip()
```

### **2. QA Best Practices:**

```python
class BestPracticeQA:
    def __init__(self):
        self.qa = pipeline("question-answering")
    
    def answer_with_confidence(self, question, context, threshold=0.5):
        result = self.qa(question=question, context=context)
        
        # Check confidence
        if result['score'] < threshold:
            return {
                'answer': "I'm not confident enough to answer. Here's what I found:",
                'suggestion': result['answer'],
                'confidence': result['score'],
                'warning': 'Low confidence'
            }
        
        return {
            'answer': result['answer'],
            'confidence': result['score']
        }
    
    def handle_no_answer(self, question, context):
        # Some models trained on SQuAD 2.0 can predict "no answer"
        qa_with_na = pipeline(
            "question-answering",
            model="deepset/roberta-base-squad2"  # Supports "no answer"
        )
        
        result = qa_with_na(question=question, context=context)
        
        if result['score'] < 0.1:  # Very low confidence
            return "The answer is not in the provided context."
        
        return result['answer']
```

### **3. Evaluation Best Practices:**

```python
from rouge_score import rouge_scorer

def evaluate_summarization(generated_summaries, reference_summaries):
    """
    Properly evaluate summarization quality
    """
    scorer = rouge_scorer.RougeScorer(
        ['rouge1', 'rouge2', 'rougeL'],
        use_stemmer=True
    )
    
    results = []
    for gen, ref in zip(generated_summaries, reference_summaries):
        scores = scorer.score(ref, gen)
        results.append(scores)
    
    # Average scores
    avg_rouge1 = sum(r['rouge1'].fmeasure for r in results) / len(results)
    avg_rouge2 = sum(r['rouge2'].fmeasure for r in results) / len(results)
    avg_rougeL = sum(r['rougeL'].fmeasure for r in results) / len(results)
    
    print(f"ROUGE-1: {avg_rouge1:.3f}")
    print(f"ROUGE-2: {avg_rouge2:.3f}")
    print(f"ROUGE-L: {avg_rougeL:.3f}")
    
    # ROUGE-1: unigram overlap
    # ROUGE-2: bigram overlap (more strict)
    # ROUGE-L: longest common subsequence
    
    return {
        'rouge1': avg_rouge1,
        'rouge2': avg_rouge2,
        'rougeL': avg_rougeL
    }
```

---

## **Key Takeaways:**

```javascript
const summarization_and_qa_mastery = {
  summarization: {
    types: ['Extractive (select sentences)', 'Abstractive (generate new text)'],
    models: ['BART', 'T5', 'Pegasus'],
    use_cases: ['News', 'Meetings', 'Legal docs', 'Research papers'],
    evaluation: 'ROUGE metrics'
  },
  
  question_answering: {
    types: ['Extractive (find span)', 'Generative (create answer)'],
    models: ['BERT', 'RoBERTa', 'ELECTRA'],
    architecture: 'Start/end position prediction',
    evaluation: 'Exact Match, F1 score'
  },
  
  practical_tips: {
    summarization: 'Adjust length based on use case',
    qa: 'Check confidence scores',
    evaluation: 'Always evaluate on real data',
    deployment: 'Cache results for repeated queries'
  },
  
  future: 'Moving toward generative models (GPT-4, Claude) that can do both tasks'
};
```

---

## ✅ **Review Questions:**

1. **Conceptual:**
   - What's the difference between extractive and abstractive summarization?
   - How does BERT predict answer spans?
   - Why is attention important in summarization?

2. **Technical:**
   - What's the architecture of seq2seq summarization?
   - How are start/end positions predicted in QA?
   - What's ROUGE and how is it calculated?

3. **Practical:**
   - When to use extractive vs abstractive?
   - How to handle low confidence QA answers?
   - How to evaluate summarization quality?

---

## 🧩 **Practice Problems:**

### **Problem 1: Multi-Document Summarization**

```python
def multi_document_summarization(documents):
    """
    Summarize multiple related documents into one coherent summary
    
    Challenge: Avoid redundancy, maintain coherence
    """
    # Your implementation
    pass
```

### **Problem 2: Context-Aware QA**

```python
def contextual_qa(question, multiple_contexts):
    """
    Answer question by searching across multiple contexts
    
    Return best answer with source attribution
    """
    # Your implementation
    pass
```

---

## 🚀 **Mini Project:**

**Build Document Intelligence System:**

```python
class DocumentIntelligence:
    def __init__(self):
        self.summarizer = pipeline("summarization")
        self.qa = pipeline("question-answering")
    
    def process_document(self, document):
        """
        Full document processing:
        1. Generate summary
        2. Extract key entities
        3. Answer preset questions
        4. Create searchable index
        """
        # Implement complete system
        pass
    
    def interactive_qa(self, document):
        """
        Interactive Q&A session
        """
        pass

# Test on legal contracts, research papers, news articles
```

---

**🎉 Summarization & QA Complete!**

You now understand:
- Text summarization (extractive & abstractive)
- Question answering systems
- Evaluation metrics
- Production deployment

**Next:** **LangChain** - Build LLM applications! 🚀
