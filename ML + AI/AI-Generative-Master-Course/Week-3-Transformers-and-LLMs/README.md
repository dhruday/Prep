# 📚 Week 3: Transformers & LLMs

## 🎯 Overview

This week covers the **revolutionary architectures** that power modern AI:
- From sequential models (RNN/LSTM) to parallel processing (Transformers)
- The attention mechanism that changed everything
- GPT and BERT - the two paradigms of modern NLP
- Building and training your own models

**By the end of this week, you will:**
✅ Understand how sequence models evolved from RNN to Transformers
✅ Master the attention mechanism mathematically and intuitively
✅ Know when to use GPT vs BERT for different tasks
✅ Build a Transformer from scratch
✅ Complete a real-world sentiment analysis project
✅ Be ready for technical interviews on these topics

---

## 📁 Files in This Week

| File | Topic | Description |
|------|-------|-------------|
| `01-RNN-and-LSTM.md` | RNN & LSTM | Sequential processing, vanishing gradients, LSTM gates |
| `02-Attention-Mechanism.md` | Attention | Query-Key-Value, scaled dot-product, multi-head attention |
| `03-Transformers-Architecture.md` | Transformers | Complete architecture, encoder-decoder, positional encoding |
| `04-GPT-and-BERT.md` | GPT & BERT | Two paradigms, pre-training objectives, use cases |
| `05-Build-Transformer-from-Scratch.md` | Implementation | Step-by-step Transformer implementation |
| `06-Sentiment-Analysis-Project.md` | Project | End-to-end sentiment classifier with BERT |
| `07-Interview-QA.md` | Interview Prep | Comprehensive Q&A from beginner to FAANG level |

---

## 📈 Learning Path

```
Week 3 Learning Flow:

Day 1-2: Foundations
├── 01-RNN-and-LSTM.md
│   └── Understand sequential processing
│   └── Learn LSTM gates
│   └── Code: Name classifier
│
Day 3: Attention Revolution  
├── 02-Attention-Mechanism.md
│   └── Why attention solves bottleneck
│   └── Multi-head attention
│   └── Code: Attention visualizer
│
Day 4-5: Transformer Deep Dive
├── 03-Transformers-Architecture.md
│   └── Full architecture breakdown
│   └── Positional encoding
│   └── Code: Building blocks
│
├── 04-GPT-and-BERT.md
│   └── Pre-training objectives
│   └── When to use which
│   └── Code: Using HuggingFace
│
Day 6: Implementation
├── 05-Build-Transformer-from-Scratch.md
│   └── Complete implementation
│   └── Training loop
│   └── Code: Working Transformer
│
Day 7: Project + Review
├── 06-Sentiment-Analysis-Project.md
│   └── End-to-end project
│   └── Real-world deployment
│
└── 07-Interview-QA.md
    └── Review all concepts
    └── Practice interview questions
```

---

## 🔑 Key Concepts Summary

### RNN → LSTM → Attention → Transformer

```
Evolution of Sequence Models:

RNN (1986)
├── Problem: Vanishing gradients
├── Can't handle long sequences
│
LSTM (1997)
├── Solution: Gates + Cell State
├── Problem: Still sequential (slow)
│
Attention (2015)
├── Solution: Direct access to all positions
├── Problem: Still needs RNN backbone
│
Transformer (2017)
├── Solution: Attention is ALL you need
├── Parallel processing
└── Foundation of GPT, BERT, and all modern LLMs
```

### BERT vs GPT

```
┌─────────────────────────────────────────┐
│              BERT vs GPT                │
├──────────────────┬──────────────────────┤
│      BERT        │        GPT           │
├──────────────────┼──────────────────────┤
│ Encoder-only     │ Decoder-only         │
│ Bidirectional    │ Left-to-right        │
│ Masked LM        │ Next token pred      │
│ Understanding    │ Generation           │
│ Classification   │ Text completion      │
│ Q&A, NER         │ Chat, code, writing  │
└──────────────────┴──────────────────────┘
```

---

## 💡 Interview Highlights

### Must-Know Questions

1. **What is the vanishing gradient problem and how does LSTM solve it?**
2. **Explain Query, Key, Value in attention**
3. **Why scale attention scores by √d_k?**
4. **What is multi-head attention and why use it?**
5. **Difference between BERT and GPT?**
6. **Why does Transformer need positional encoding?**
7. **How does Transformer complexity scale with sequence length?**

### Quick Formulas

**Scaled Dot-Product Attention:**
$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

**LSTM Cell State Update:**
$$C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$$

**Positional Encoding:**
$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d}}\right)$$

---

## 🛠️ Projects & Homework

### This Week's Project
**Sentiment Analysis with BERT** (File: `06-Sentiment-Analysis-Project.md`)
- Data preprocessing
- BERT fine-tuning
- Evaluation metrics
- API deployment

### Additional Practice
1. Implement attention visualization
2. Train GPT-2 on custom dataset
3. Build question-answering system
4. Compare BERT variants (RoBERTa, ALBERT, DistilBERT)

---

## 📚 Prerequisites

**Before starting Week 3, ensure you understand:**
- Neural network basics (forward/backward pass)
- Gradient descent and optimization
- PyTorch basics (tensors, nn.Module)
- Basic probability (softmax, distributions)

---

## ⏭️ Next Week Preview

**Week 4: Fine-Tuning & Agentic AI**
- Efficient fine-tuning (LoRA, QLoRA)
- HuggingFace ecosystem
- LangChain and LangGraph
- Building AI agents
- Q&A applications

---

## 📖 Additional Resources

### Papers
- "Attention Is All You Need" (Vaswani et al., 2017)
- "BERT: Pre-training of Deep Bidirectional Transformers" (Devlin et al., 2018)
- "Language Models are Few-Shot Learners" (GPT-3, Brown et al., 2020)

### Tutorials
- Jay Alammar's Illustrated Transformer
- HuggingFace Course (free)
- Harvard NLP's Annotated Transformer

### Code
- HuggingFace Transformers library
- PyTorch's nn.Transformer
- This week's implementations!

---

**Happy Learning! 🚀**

*Remember: Transformers are the foundation of ALL modern LLMs. Master this week's content and you'll understand GPT-4, Claude, LLaMA, and every model to come!*
