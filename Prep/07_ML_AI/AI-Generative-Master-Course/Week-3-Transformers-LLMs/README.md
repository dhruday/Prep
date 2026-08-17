# 📚 Week 3: Transformers & Large Language Models

## 🎯 Overview

This week covers the **most revolutionary architectures in AI history** - the technologies that power ChatGPT, Claude, Gemini, and every modern AI system.

**The Journey:**
```
RNN → LSTM → Attention → Transformers → GPT/BERT → Modern LLMs
```

**By the end of this week, you will:**
✅ Understand why RNNs failed and how LSTM partially fixed them
✅ Master the attention mechanism (the key innovation)
✅ Deeply understand Transformer architecture inside-out
✅ Know the difference between GPT (decoder) and BERT (encoder)
✅ Build a working Transformer from scratch
✅ Complete a real-world sentiment analysis project
✅ Ace any interview on these topics

---

## 📁 Files in This Week

| # | File | Topic | Description |
|---|------|-------|-------------|
| 0 | `00-NLP-Text-Processing.md` | Text to Numbers | How text becomes numbers (BPE, WordPiece, subwords) |
| 1 | `01-RNN-LSTM.md` | RNN & LSTM | Sequential processing, vanishing gradients, LSTM gates |
| 2 | `02-Attention-Mechanism.md` | Attention | Query-Key-Value, scaled dot-product, multi-head attention |
| 3 | `03-Transformers-Architecture.md` | Transformers | Complete architecture, encoder-decoder, positional encoding |
| 4 | `04-GPT-and-BERT.md` | GPT & BERT | Two paradigms, pre-training objectives, when to use which |
| 5 | `05-Build-Transformer-Scratch.md` | Implementation | Step-by-step Transformer from scratch in PyTorch |
| 6 | `06-Sentiment-Analysis-Project.md` | Project | End-to-end sentiment classifier with BERT |
| 7 | `07-Interview-QA.md` | Interview Prep | 50+ questions from beginner to FAANG level |

> **📝 Start with 00-NLP-Text-Processing.md** - Understanding how text becomes numbers is essential before diving into transformers!

---

## 📈 Learning Path

```
Week 3 Learning Flow (7 Days):

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  DAY 1-2: THE PROBLEM & FIRST SOLUTIONS                        │
│  ├── 01-RNN-LSTM.md                                            │
│  │   ├── Why we need sequential models                         │
│  │   ├── RNN architecture & vanishing gradient problem         │
│  │   ├── LSTM gates: Forget, Input, Output                     │
│  │   └── Mini-project: Name generator with LSTM                │
│  │                                                              │
│  DAY 3: THE BREAKTHROUGH                                        │
│  ├── 02-Attention-Mechanism.md                                  │
│  │   ├── Why attention was revolutionary                       │
│  │   ├── Query, Key, Value intuition                           │
│  │   ├── Scaled dot-product attention                          │
│  │   ├── Multi-head attention                                  │
│  │   └── Mini-project: Attention visualizer                    │
│  │                                                              │
│  DAY 4: THE ARCHITECTURE                                        │
│  ├── 03-Transformers-Architecture.md                           │
│  │   ├── "Attention Is All You Need" paper breakdown           │
│  │   ├── Encoder stack                                         │
│  │   ├── Decoder stack                                         │
│  │   ├── Positional encoding (why and how)                     │
│  │   └── Layer normalization & residual connections            │
│  │                                                              │
│  DAY 5: THE TWO PARADIGMS                                       │
│  ├── 04-GPT-and-BERT.md                                        │
│  │   ├── GPT: Decoder-only, autoregressive                     │
│  │   ├── BERT: Encoder-only, bidirectional                     │
│  │   ├── Pre-training objectives                               │
│  │   ├── When to use GPT vs BERT                               │
│  │   └── Modern evolution: GPT-4, Claude, Gemini               │
│  │                                                              │
│  DAY 6: BUILD IT YOURSELF                                       │
│  ├── 05-Build-Transformer-Scratch.md                           │
│  │   ├── Token embeddings                                      │
│  │   ├── Positional encoding                                   │
│  │   ├── Multi-head attention layer                            │
│  │   ├── Feed-forward network                                  │
│  │   ├── Encoder & Decoder                                     │
│  │   └── Full training loop                                    │
│  │                                                              │
│  DAY 7: REAL PROJECT + INTERVIEW PREP                          │
│  ├── 06-Sentiment-Analysis-Project.md                          │
│  │   ├── End-to-end BERT fine-tuning                           │
│  │   ├── Dataset preparation                                   │
│  │   ├── Training & evaluation                                 │
│  │   └── Deployment considerations                             │
│  │                                                              │
│  └── 07-Interview-QA.md                                        │
│      └── 50+ questions with detailed answers                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Concepts Quick Reference

### The Evolution Timeline

```
1986: RNN
├── First sequential neural network
├── Problem: Vanishing gradients (can't remember long sequences)
│
1997: LSTM
├── Added gates + cell state
├── Fixed long-term memory somewhat
├── Problem: Still sequential (slow training)
│
2014: Seq2Seq with Attention
├── Encoder-decoder for translation
├── Attention allows "looking back" at input
├── Problem: Still needs RNN backbone
│
2017: Transformer ("Attention Is All You Need")
├── Removed RNN entirely
├── Pure attention mechanism
├── Parallel processing = FAST
├── Revolution begins!
│
2018: GPT-1 (OpenAI)
├── Decoder-only Transformer
├── Autoregressive (predict next token)
├── 117M parameters
│
2018: BERT (Google)
├── Encoder-only Transformer
├── Bidirectional (see both directions)
├── Masked Language Modeling
│
2019-2024: The LLM Era
├── GPT-2 (1.5B) → GPT-3 (175B) → GPT-4 (1.8T?)
├── Claude, Gemini, Llama, Mistral
└── Current state of the art
```

---

## 🧮 Essential Formulas

### Attention Formula
```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V

Where:
- Q = Query matrix (what am I looking for?)
- K = Key matrix (what do I contain?)
- V = Value matrix (what should I return?)
- d_k = dimension of keys (scaling factor)
```

### Multi-Head Attention
```
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) × W^O

Where each head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)
```

### Positional Encoding
```
PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
```

### Transformer Layer
```
# Encoder Layer
x = LayerNorm(x + MultiHeadAttention(x, x, x))
x = LayerNorm(x + FeedForward(x))

# Decoder Layer (adds cross-attention)
x = LayerNorm(x + MaskedMultiHeadAttention(x, x, x))
x = LayerNorm(x + MultiHeadAttention(x, encoder_output, encoder_output))
x = LayerNorm(x + FeedForward(x))
```

---

## 🎯 Prerequisites Check

Before starting Week 3, make sure you understand:

| Concept | From Week | Quick Check |
|---------|-----------|-------------|
| Neural Networks | Week 1 | Can you explain forward/backward pass? |
| Gradient Descent | Week 1 | Do you understand how weights update? |
| Matrix Multiplication | Week 1 | Can you multiply matrices by hand? |
| Softmax | Week 1 | Do you know it converts scores to probabilities? |
| Embeddings | Week 2 | Do you understand word vectors? |

---

## 🛠️ Setup Requirements

```python
# Install required packages
pip install torch torchvision
pip install transformers datasets
pip install matplotlib numpy pandas
pip install tensorboard

# Verify installation
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

from transformers import __version__
print(f"Transformers version: {__version__}")
```

---

## 📚 Recommended Resources

### Papers (Read After Understanding Concepts)
1. **"Attention Is All You Need"** (2017) - The Transformer paper
2. **"BERT: Pre-training of Deep Bidirectional Transformers"** (2018)
3. **"Language Models are Unsupervised Multitask Learners"** (GPT-2, 2019)
4. **"Language Models are Few-Shot Learners"** (GPT-3, 2020)

### Tools
- [HuggingFace Transformers](https://huggingface.co/transformers/)
- [PyTorch Documentation](https://pytorch.org/docs/)
- [The Annotated Transformer](https://nlp.seas.harvard.edu/2018/04/03/attention.html)

---

## ✅ Week 3 Checklist

- [ ] Understand why RNNs have vanishing gradient problem
- [ ] Can explain all 3 LSTM gates with formulas
- [ ] Understand Query, Key, Value intuitively and mathematically
- [ ] Can draw Transformer architecture from memory
- [ ] Know difference between encoder and decoder
- [ ] Understand positional encoding purpose
- [ ] Can explain GPT vs BERT differences
- [ ] Built Transformer from scratch
- [ ] Completed sentiment analysis project
- [ ] Reviewed all interview questions

---

**Let's revolutionize your understanding of modern AI! 🚀**
