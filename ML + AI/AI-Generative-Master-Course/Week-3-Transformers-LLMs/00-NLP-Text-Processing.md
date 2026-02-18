# 🔤 Text Processing Fundamentals for NLP

> **Prerequisite:** Basic Python
> **Time:** 1-1.5 hours  
> **Difficulty:** ⭐ (Beginner-friendly)
> **Read this BEFORE:** Transformers Architecture

---

## 📚 Table of Contents

1. [Learning Objectives](#-learning-objectives)
2. [Why Text Processing?](#-why-text-processing)
3. [Part 1: Types of Text Splitting](#-part-1-types-of-text-splitting)
4. [Part 2: BPE (Byte Pair Encoding)](#-part-2-bpe-byte-pair-encoding)
5. [Part 3: WordPiece](#-part-3-wordpiece)
6. [Part 4: Using Processors in Practice](#️-part-4-using-processors-in-practice)
7. [Part 5: Common Gotchas](#️-part-5-common-gotchas)
8. [Part 6: Processor Comparison](#-part-6-processor-comparison)
9. [Quick Reference Card](#-quick-reference-card)
10. [Common Mistakes](#️-common-mistakes)
11. [Interview Questions](#-interview-questions)
12. [Key Takeaways](#-key-takeaways)
13. [Next Up](#-next-up)

---

## 🎯 Learning Objectives

By the end of this module, you will:
- [ ] Understand why machines need text-to-number conversion
- [ ] Know the difference between word, character, and subword approaches
- [ ] Understand BPE and WordPiece (used in GPT and BERT)
- [ ] Be able to use text processors from Hugging Face
- [ ] Know common text processing gotchas

---

## 🤔 Why Text Processing?

**The Problem:** Neural networks work with numbers, not text.

```
Human sees:  "Hello, how are you?"
Computer needs: [15496, 11, 703, 389, 499, 30]

Text Processing = Converting text → numbers
```

### The Pipeline

```
┌────────────────────────────────────────────────────────────┐
│                    TEXT PROCESSING PIPELINE                 │
│                                                             │
│   "Hello world"                                             │
│        ↓                                                    │
│   ┌─────────────┐                                          │
│   │  Splitter   │  Split into pieces                       │
│   └─────────────┘                                          │
│        ↓                                                    │
│   ["Hello", "world"]  or  ["Hel", "lo", "wor", "ld"]       │
│        ↓                                                    │
│   ┌─────────────┐                                          │
│   │  Vocabulary │  Look up each piece                      │
│   └─────────────┘                                          │
│        ↓                                                    │
│   [15496, 995]   ← IDs (numbers!)                          │
│        ↓                                                    │
│   ┌─────────────┐                                          │
│   │  Embedding  │  Convert to vectors                      │
│   └─────────────┘                                          │
│        ↓                                                    │
│   [[0.1, 0.3, ...], [0.2, -0.1, ...]]  ← Neural network    │
│                                           can process!      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📝 Part 1: Types of Text Splitting

### 1.1 Character-Level

Split every character:

```
"Hello" → ["H", "e", "l", "l", "o"]

Vocabulary size: ~100-200 (just characters)
```

```python
text = "Hello world"
pieces = list(text)
print(pieces)  # ['H', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd']
```

#### Pros and Cons

```
✅ Very small vocabulary
✅ Can handle ANY word (no "unknown" pieces)
✅ Works for any language

❌ Very long sequences (inefficient)
❌ Loses word meaning ("H" doesn't mean much alone)
❌ Harder for models to learn patterns
```

---

### 1.2 Word-Level

Split on spaces and punctuation:

```
"Hello, world!" → ["Hello", ",", "world", "!"]

Vocabulary size: 30,000 - 100,000+ words
```

```python
import re

def word_split(text):
    return re.findall(r'\w+|[^\w\s]', text)

text = "Hello, world! How are you?"
pieces = word_split(text)
print(pieces)  # ['Hello', ',', 'world', '!', 'How', 'are', 'you', '?']
```

#### Pros and Cons

```
✅ Intuitive - matches how humans think
✅ Short sequences (efficient)
✅ Words carry meaning

❌ HUGE vocabulary needed
❌ Unknown words = [UNK] (bad!)
❌ Different forms = different pieces
   "run", "runs", "running" = 3 separate pieces
```

---

### 1.3 Subword ⭐ (The Modern Approach)

Split words into meaningful pieces:

```
"unhappiness" → ["un", "happi", "ness"]
"transformers" → ["trans", "form", "ers"]

Vocabulary size: 30,000 - 50,000 subwords
```

**This is what GPT, BERT, and modern LLMs use!**

#### Why It Works

```
✅ Reasonable vocabulary size
✅ No unknown words (breaks into known pieces)
✅ Captures word parts that carry meaning
   "un-" means negation
   "-ness" means "state of"
   "-ing" means ongoing action
✅ Efficient sequences
```

---

## 🧩 Part 2: BPE (Byte Pair Encoding)

### 2.1 How BPE Works

**Used by:** GPT-2, GPT-3, GPT-4, LLaMA

BPE starts with characters and merges the most common pairs:

```
Step 0: Start with characters
"low" "lower" "newest" "widest"
→ ['l','o','w'] ['l','o','w','e','r'] ['n','e','w','e','s','t'] ['w','i','d','e','s','t']

Step 1: Most common pair = ('e','s') → merge to 'es'
→ ['l','o','w'] ['l','o','w','e','r'] ['n','e','w','es','t'] ['w','i','d','es','t']

Step 2: Most common pair = ('es','t') → merge to 'est'
→ ['l','o','w'] ['l','o','w','e','r'] ['n','e','w','est'] ['w','i','d','est']

Step 3: Most common pair = ('l','o') → merge to 'lo'
→ ['lo','w'] ['lo','w','e','r'] ['n','e','w','est'] ['w','i','d','est']

... continue until vocabulary size reached
```

### 2.2 BPE Visualization

```
Original vocabulary (characters): 
    {a, b, c, d, e, ..., z, space, ...}

After BPE training:
    {a, b, c, ..., z, th, he, in, er, an, the, ing, tion, ...}
    
"the" is common → becomes single unit
"tion" is common → becomes single unit
"xyzzy" is rare → stays as ['x', 'y', 'z', 'z', 'y']
```

### 2.3 Simple BPE Implementation

```python
from collections import defaultdict

def get_stats(vocab):
    """Count frequency of adjacent pairs."""
    pairs = defaultdict(int)
    for word, freq in vocab.items():
        symbols = word.split()
        for i in range(len(symbols) - 1):
            pairs[symbols[i], symbols[i + 1]] += freq
    return pairs

def merge_vocab(pair, vocab):
    """Merge all occurrences of a pair."""
    new_vocab = {}
    bigram = ' '.join(pair)
    replacement = ''.join(pair)
    for word, freq in vocab.items():
        new_word = word.replace(bigram, replacement)
        new_vocab[new_word] = freq
    return new_vocab

def learn_bpe(vocab, num_merges):
    """Learn BPE merges."""
    merges = []
    for i in range(num_merges):
        pairs = get_stats(vocab)
        if not pairs:
            break
        best = max(pairs, key=pairs.get)
        vocab = merge_vocab(best, vocab)
        merges.append(best)
        print(f"Merge {i+1}: {best}")
    return merges, vocab

# Example
vocab = {
    'l o w </w>': 5,
    'l o w e r </w>': 2,
    'n e w e s t </w>': 6,
    'w i d e s t </w>': 3,
}

merges, final_vocab = learn_bpe(vocab, num_merges=10)
```

---

## 🔠 Part 3: WordPiece

### 3.1 How WordPiece Works

**Used by:** BERT, DistilBERT, ELECTRA

Similar to BPE, but uses a different scoring:

```
BPE: Merge most frequent pair
WordPiece: Merge pair that maximizes likelihood of training data
```

### 3.2 The ## Prefix

WordPiece uses `##` to indicate continuation:

```
"unbelievable" → ["un", "##bel", "##iev", "##able"]

## means "this is a continuation of the previous unit"
```

```python
from transformers import BertTokenizer

proc = BertTokenizer.from_pretrained('bert-base-uncased')

pieces = proc.tokenize("unbelievable")
print(pieces)  # ['un', '##bel', '##ie', '##va', '##ble']
```

---

## 🛠️ Part 4: Using Processors in Practice

### 4.1 Hugging Face Processors

```python
from transformers import AutoTokenizer

# Load GPT-2 processor (BPE)
gpt2_proc = AutoTokenizer.from_pretrained("gpt2")

# Load BERT processor (WordPiece)
bert_proc = AutoTokenizer.from_pretrained("bert-base-uncased")

text = "Hello, how are you doing today?"

# GPT-2
gpt2_pieces = gpt2_proc.tokenize(text)
gpt2_ids = gpt2_proc.encode(text)
print(f"GPT-2 pieces: {gpt2_pieces}")
print(f"GPT-2 IDs: {gpt2_ids}")

# BERT
bert_pieces = bert_proc.tokenize(text)
bert_ids = bert_proc.encode(text)
print(f"\nBERT pieces: {bert_pieces}")
print(f"BERT IDs: {bert_ids}")
```

### 4.2 Important Methods

```python
from transformers import AutoTokenizer

proc = AutoTokenizer.from_pretrained("gpt2")

text = "Hello, world!"

# encode: text → IDs
ids = proc.encode(text)
print(f"IDs: {ids}")

# decode: IDs → text
decoded = proc.decode(ids)
print(f"Decoded: {decoded}")

# Vocabulary info
print(f"\nVocabulary size: {proc.vocab_size}")
print(f"Special markers: {proc.all_special_tokens}")
```

### 4.3 Handling Long Texts

```python
from transformers import AutoTokenizer

proc = AutoTokenizer.from_pretrained("gpt2")

long_text = "This is a very long text. " * 500

# Encode with truncation
encoded = proc.encode(
    long_text,
    max_length=100,
    truncation=True
)
print(f"Truncated to {len(encoded)} units")

# For batches
texts = ["Hello world", "How are you doing today?"]
batch = proc(
    texts,
    padding=True,
    truncation=True,
    max_length=20,
    return_tensors="pt"
)
print(f"\nBatch shape: {batch['input_ids'].shape}")
```

---

## ⚠️ Part 5: Common Gotchas

### 5.1 Units ≠ Words

```python
from transformers import AutoTokenizer

proc = AutoTokenizer.from_pretrained("gpt2")

examples = [
    "Hello",
    "Supercalifragilisticexpialidocious",
    "🤖",
    "你好",
    " Hello",  # Leading space!
]

for text in examples:
    pieces = proc.tokenize(text)
    print(f"'{text}' → {len(pieces)} units")
```

### 5.2 The Space Problem

```python
proc = AutoTokenizer.from_pretrained("gpt2")

# With and without leading space
print(proc.tokenize("Hello"))    # ['Hello']
print(proc.tokenize(" Hello"))   # ['ĠHello']  # Ġ = space
```

### 5.3 Count Estimation

```python
def estimate_count(text, chars_per_unit=4):
    """
    Rule of thumb: ~4 characters per unit for English.
    """
    return len(text) / chars_per_unit
```

### 5.4 Model-Specific Markers

```python
from transformers import AutoTokenizer

gpt2 = AutoTokenizer.from_pretrained("gpt2")
bert = AutoTokenizer.from_pretrained("bert-base-uncased")

print("GPT-2: EOS =", gpt2.eos_token)  # <|endoftext|>
print("BERT: CLS =", bert.cls_token)   # [CLS]
print("BERT: SEP =", bert.sep_token)   # [SEP]
```

---

## 📊 Part 6: Processor Comparison

| Model | Method | Vocab Size | Features |
|-------|--------|------------|----------|
| GPT-2 | BPE | 50,257 | Unicode support |
| GPT-3/4 | BPE (cl100k) | 100,000+ | Code optimized |
| BERT | WordPiece | 30,522 | Case variants |
| T5 | SentencePiece | 32,100 | Language agnostic |
| LLaMA | SentencePiece | 32,000 | Multilingual |

---

## 📋 Quick Reference Card

| Concept | Description | Example |
|---------|-------------|---------|
| Character splitting | Split every character | "hi" → ["h", "i"] |
| Word splitting | Split on spaces | "hi there" → ["hi", "there"] |
| Subword (BPE) | Merge common pairs | "unhappy" → ["un", "happy"] |
| ID | Vocabulary index | "hello" → 15496 |
| Special markers | [CLS], [SEP], [PAD] | Model-specific |

---

## ⚠️ Common Mistakes

| Mistake | Fix |
|---------|-----|
| Counting words as units | Always process to check |
| Ignoring special markers | Include [CLS], [SEP] in counts |
| Wrong processor for model | Use model's matching processor |
| Forgetting padding/truncation | Always specify max_length |

---

## 🎤 Interview Questions

**Q1: Why can't we just use word-level splitting?**
> Vocabulary would be huge, and rare words become [UNK]. Subword handles unknown words by breaking into known pieces.

**Q2: What is BPE?**
> Byte Pair Encoding merges common character pairs until reaching vocabulary size. Used by GPT.

**Q3: What are the trade-offs of vocabulary size?**
> Large vocab = shorter sequences, more parameters. Small vocab = longer sequences, fewer parameters.

---

## ✅ Key Takeaways

1. **Text processing** converts text to numbers
2. **Subword** (BPE, WordPiece) is the modern standard
3. **Units ≠ words** - always check actual count
4. **Each model has its own processor**
5. **Special markers** vary by model

---

## 🔜 Next Up

Continue to → [02-Attention-Mechanism.md](./02-Attention-Mechanism.md)

*Text → Units → Attention → Transformers → LLMs!* 🚀
