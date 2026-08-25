# 🎓 Week 4: Fine-Tuning & Agents

## 📋 Overview

Welcome to **Week 4** of the Generative AI Master Course! This week focuses on **adapting LLMs to your needs** through fine-tuning and building **intelligent AI agents** that can take actions.

---

## 🎯 Learning Objectives

By the end of this week, you will:

| Objective | Skills Gained |
|-----------|---------------|
| **Fine-Tuning** | Adapt pre-trained models to specific tasks |
| **LoRA & QLoRA** | Efficient fine-tuning with minimal resources |
| **HuggingFace** | Master the leading AI/ML platform |
| **LangChain** | Build LLM-powered applications |
| **LangGraph** | Create stateful, multi-step workflows |
| **AI Agents** | Build autonomous agents with tool use |
| **Q&A Systems** | Complete document Q&A application |

---

## 📚 Topics Covered

### 1. [Fine-Tuning Fundamentals](./01-Fine-Tuning-Fundamentals.md)
- Full Fine-Tuning vs Feature Extraction
- Transfer Learning concepts
- Catastrophic Forgetting & solutions
- Learning Rate strategies
- When to fine-tune vs prompt

### 2. [LoRA and QLoRA](./02-LoRA-and-QLoRA.md)
- Low-Rank Adaptation mathematics
- Parameter-Efficient Fine-Tuning (PEFT)
- 4-bit Quantization (QLoRA)
- Practical implementation
- Memory optimization

### 3. [HuggingFace Ecosystem](./03-HuggingFace-Ecosystem.md)
- 🤗 Transformers library
- Datasets & tokenizers
- Model Hub & inference
- Trainer API
- Spaces deployment

### 4. [LangChain](./04-LangChain.md)
- Chains & compositions
- Prompt templates
- Retrievers & document loaders
- Memory systems
- Building RAG applications

### 5. [LangGraph](./05-LangGraph.md)
- Stateful graphs for LLMs
- Nodes, edges, and state
- Conditional routing
- Persistence & memory
- Multi-agent orchestration

### 6. [AI Agents](./06-AI-Agents.md)
- Agent architecture patterns
- ReAct: Reasoning + Acting
- Tool use & function calling
- Planning strategies
- Multi-agent systems

### 7. [Q&A Application Project](./07-QA-Application.md)
- Complete system architecture
- Document processing pipeline
- Vector store integration
- RAG chain implementation
- Frontend & deployment

---

## 🗓️ Study Plan

| Day | Topic | Time |
|-----|-------|------|
| Day 1 | Fine-Tuning Fundamentals | 2-3 hrs |
| Day 2 | LoRA and QLoRA | 2-3 hrs |
| Day 3 | HuggingFace Ecosystem | 2-3 hrs |
| Day 4 | LangChain | 3-4 hrs |
| Day 5 | LangGraph | 2-3 hrs |
| Day 6 | AI Agents | 3-4 hrs |
| Day 7 | Q&A Application Project | 4-5 hrs |

**Total:** ~18-25 hours

---

## 🛠️ Prerequisites

### Required Knowledge
- ✅ Week 1-3 concepts (Transformers, Attention, GPT/BERT)
- ✅ Python programming
- ✅ Basic ML concepts
- ✅ PyTorch fundamentals

### Required Setup
```bash
# Core libraries
pip install transformers datasets torch

# Fine-tuning
pip install peft bitsandbytes accelerate

# LangChain ecosystem
pip install langchain langchain-openai langchain-community
pip install langgraph

# Vector stores
pip install chromadb faiss-cpu

# Web framework (for project)
pip install fastapi uvicorn streamlit

# API keys needed
# - OPENAI_API_KEY
# - (Optional) HUGGINGFACE_TOKEN
# - (Optional) COHERE_API_KEY
```

---

## 📊 Key Concepts Map

```
Week 4: Fine-Tuning & Agents
│
├── Model Adaptation
│   ├── Full Fine-Tuning
│   ├── Feature Extraction
│   ├── LoRA (Low-Rank)
│   └── QLoRA (Quantized)
│
├── Platforms & Tools
│   ├── HuggingFace Hub
│   ├── PEFT Library
│   └── Transformers
│
├── LLM Applications
│   ├── LangChain
│   │   ├── Chains
│   │   ├── Retrievers
│   │   └── Memory
│   │
│   └── LangGraph
│       ├── StateGraph
│       ├── Nodes/Edges
│       └── Persistence
│
├── AI Agents
│   ├── ReAct Pattern
│   ├── Tool Use
│   ├── Planning
│   └── Multi-Agent
│
└── Complete Project
    └── Q&A Application
```

---

## 🔬 Hands-On Projects

### Mini Projects (Throughout Week)

| Project | File | Skills |
|---------|------|--------|
| Fine-tune BERT for sentiment | Topic 1 | PEFT, Training |
| LoRA on GPT-2 | Topic 2 | Low-rank adaptation |
| HuggingFace pipeline | Topic 3 | Model Hub, Inference |
| RAG with LangChain | Topic 4 | Retrieval, Chains |
| Multi-step agent | Topic 6 | Tool use, Planning |

### Major Project: Q&A Application

Build a complete document Q&A system:
- 📄 Document upload & processing
- 🔍 Semantic search with vector store
- 💬 Conversational interface
- 📚 Source citations
- 🚀 Deployment ready

---

## 📝 Key Formulas

### LoRA
$$W = W_0 + BA$$
Where:
- $W_0$: Original weights (frozen)
- $B \in \mathbb{R}^{d \times r}$, $A \in \mathbb{R}^{r \times k}$
- $r \ll \min(d, k)$ (rank)

### QLoRA Quantization
$$Q(W) = \text{round}\left(\frac{W - \min(W)}{\max(W) - \min(W)} \times (2^b - 1)\right)$$

### RAG Retrieval Score
$$\text{score}(q, d) = \text{cosine}(\text{embed}(q), \text{embed}(d))$$

---

## ✅ Self-Assessment Checklist

After completing Week 4, you should be able to:

- [ ] Explain when to fine-tune vs use prompting
- [ ] Implement LoRA fine-tuning with PEFT
- [ ] Use QLoRA for memory-efficient training
- [ ] Navigate HuggingFace Hub and Transformers
- [ ] Build chains with LangChain
- [ ] Create stateful graphs with LangGraph
- [ ] Design AI agents with tool use
- [ ] Build a complete Q&A application

---

## 🔗 Resources

### Official Documentation
- [HuggingFace PEFT](https://huggingface.co/docs/peft)
- [LangChain Docs](https://docs.langchain.com/)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)

### Papers
- [LoRA Paper](https://arxiv.org/abs/2106.09685)
- [QLoRA Paper](https://arxiv.org/abs/2305.14314)
- [ReAct Paper](https://arxiv.org/abs/2210.03629)

### Tutorials
- [HuggingFace Course](https://huggingface.co/course)
- [LangChain Tutorials](https://python.langchain.com/docs/tutorials/)

---

## ⏭️ What's Next?

**Week 5: Vector Databases & RAG**
- Deep dive into vector databases
- Advanced RAG techniques
- Production RAG systems
- Evaluation and optimization

---

## 💡 Tips for Success

1. **Practice fine-tuning** on small models first (BERT, GPT-2)
2. **Use Colab/Kaggle** for GPU access if needed
3. **Build incrementally** - test each component before combining
4. **Track experiments** with Weights & Biases or MLflow
5. **Read source code** of LangChain for deep understanding

---

**Good luck with Week 4!** 🚀

*Remember: The goal is not just to understand concepts but to BUILD working applications!*
