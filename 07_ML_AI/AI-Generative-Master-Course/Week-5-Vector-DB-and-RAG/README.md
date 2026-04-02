# 📚 Week 5: Vector Databases & RAG

## 🎯 Week Overview

Welcome to **Week 5** of the AI Generative Master Course! This week focuses on **Vector Databases** and **Retrieval-Augmented Generation (RAG)** – the technologies that enable AI systems to access and reason over external knowledge.

By the end of this week, you'll be able to build production-ready AI applications that can search, retrieve, and generate responses based on your own documents and data.

---

## 📋 Learning Objectives

After completing this week, you will be able to:

- ✅ Understand vector embeddings and similarity search
- ✅ Work with ChromaDB and other vector databases
- ✅ Build complete RAG pipelines with LangChain
- ✅ Create interactive UIs with Streamlit
- ✅ Deploy production chatbots with document Q&A
- ✅ Implement multimodal search with CLIP
- ✅ Handle advanced RAG patterns (hybrid search, reranking, multi-turn)

---

## 📁 Week Structure

| File | Topic | Duration |
|------|-------|----------|
| `01-Vector-Databases-Fundamentals.md` | Vector DB concepts, embeddings, similarity metrics | 2-3 hours |
| `02-ChromaDB-Deep-Dive.md` | ChromaDB operations, collections, queries | 2-3 hours |
| `03-RAG-Pipelines.md` | RAG architecture, chunking, LangChain integration | 3-4 hours |
| `04-Streamlit-Frontend.md` | Building interactive AI applications | 2-3 hours |
| `05-End-to-End-Chatbot.md` | Production chatbot with conversation memory | 3-4 hours |
| `06-Multimodal-Applications.md` | CLIP, image search, multimodal RAG | 3-4 hours |
| `Projects.md` | 4 hands-on projects + capstone | 15-25 hours |
| `Interview-QA.md` | 16 interview questions with answers | 3-4 hours |

**Total Time:** ~35-45 hours

---

## 🗺️ Learning Path

```
Week 5 Learning Journey
========================

Day 1-2: Foundations
├── 01-Vector-Databases-Fundamentals.md
│   └── Embeddings, similarity search, ANN algorithms
└── 02-ChromaDB-Deep-Dive.md
    └── CRUD operations, metadata, persistence

Day 3-4: RAG Core
├── 03-RAG-Pipelines.md
│   └── Document processing, chunking, retrieval
└── Start Project 1: Document Search Engine

Day 5-6: Frontend & UX
├── 04-Streamlit-Frontend.md
│   └── Widgets, state, layouts
└── 05-End-to-End-Chatbot.md
    └── Streaming, memory, production patterns

Day 7: Advanced Topics
├── 06-Multimodal-Applications.md
│   └── CLIP, image search, vision-language
└── Complete Project 2: Customer Support Bot

Weekend: Projects & Interview Prep
├── Projects.md
│   └── Research Assistant, Multimodal Search, Capstone
└── Interview-QA.md
    └── Practice interview questions
```

---

## 🛠️ Technical Stack

### Core Technologies

| Category | Technology | Purpose |
|----------|------------|---------|
| **Vector DB** | ChromaDB | Local vector storage |
| **Vector DB** | Pinecone | Cloud-scale vectors |
| **Vector DB** | FAISS | High-performance search |
| **Framework** | LangChain | RAG orchestration |
| **Embeddings** | OpenAI Embeddings | Text vectorization |
| **Embeddings** | CLIP | Image vectorization |
| **Frontend** | Streamlit | Interactive UI |
| **LLM** | GPT-4 / GPT-3.5 | Response generation |

### Prerequisites

```bash
# Install required packages
pip install openai langchain langchain-openai langchain-community
pip install chromadb faiss-cpu sentence-transformers
pip install streamlit pypdf unstructured
pip install transformers torch pillow
pip install ragas  # For evaluation
```

### Environment Setup

```bash
# Create .env file
OPENAI_API_KEY=your-key-here
PINECONE_API_KEY=your-key-here  # Optional
```

---

## 🎓 Key Concepts Overview

### What is a Vector Database?

A **Vector Database** stores data as high-dimensional vectors (embeddings) and enables fast similarity search.

```
Traditional DB          Vector DB
==============         ===========
"Find user #123"       "Find similar to this embedding"
Exact matches          Semantic similarity
SQL queries            ANN algorithms
Structured data        Unstructured data
```

### What is RAG?

**Retrieval-Augmented Generation** enhances LLMs by retrieving relevant context from external knowledge bases.

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│  Query  │────▶│   Retrieve   │────▶│  Top-K Docs │
└─────────┘     │   from VDB   │     └──────┬──────┘
                └──────────────┘            │
                                           ▼
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│ Answer  │◀────│   Generate   │◀────│   Prompt +  │
│         │     │   with LLM   │     │   Context   │
└─────────┘     └──────────────┘     └─────────────┘
```

### Why RAG Over Fine-Tuning?

| Aspect | RAG | Fine-Tuning |
|--------|-----|-------------|
| **Update data** | Real-time | Requires retraining |
| **Cost** | Lower (no training) | Higher (GPU hours) |
| **Accuracy** | High with good retrieval | Can overfit |
| **Transparency** | Can cite sources | Black box |
| **Scale** | Handles millions of docs | Limited by context |

---

## 📊 Week 5 Projects

### Difficulty Progression

| # | Project | Difficulty | Skills Practiced |
|---|---------|------------|------------------|
| 1 | Document Search Engine | ⭐⭐ Medium | Vector DB, Search |
| 2 | Customer Support Chatbot | ⭐⭐⭐ Hard | RAG, Streaming, Memory |
| 3 | Research Paper Assistant | ⭐⭐⭐ Hard | PDF Processing, Citations |
| 4 | Multimodal Product Search | ⭐⭐⭐⭐ Expert | CLIP, Multimodal |
| 5 | Enterprise Knowledge Base | ⭐⭐⭐⭐⭐ Capstone | Full Stack, Production |

### Capstone Preview

Build a complete enterprise knowledge management system:
- Multi-format document ingestion
- Role-based access control
- Conversation history
- Analytics dashboard
- FastAPI + Streamlit
- Docker deployment

---

## 🎯 Interview Preparation

### Topics Covered

1. **Conceptual:** Vector DBs, embeddings, RAG architecture
2. **Technical:** HNSW, chunking strategies, hybrid search
3. **System Design:** Scale, latency optimization, production patterns
4. **Coding:** Implement vector DB, RAG pipeline from scratch
5. **Behavioral:** Debugging hallucinations, handling production issues

### Sample Questions

- "What is a vector database and why do we need it?"
- "Explain the difference between exact and approximate nearest neighbor"
- "How does HNSW work?"
- "Design a document Q&A system for 10,000 employees"
- "Your RAG system is hallucinating. How do you debug it?"

---

## 📈 Self-Assessment Checklist

### After This Week, I Can...

**Fundamentals:**
- [ ] Explain what embeddings are and how they enable semantic search
- [ ] Describe different similarity metrics (cosine, euclidean, dot product)
- [ ] Explain ANN algorithms and why we need them

**Vector Databases:**
- [ ] Set up and use ChromaDB for local development
- [ ] Perform CRUD operations on vector collections
- [ ] Use metadata filtering with vector search

**RAG:**
- [ ] Build a complete RAG pipeline with LangChain
- [ ] Implement effective chunking strategies
- [ ] Handle multi-turn conversations with context

**Applications:**
- [ ] Create interactive UIs with Streamlit
- [ ] Build production-ready chatbots with streaming
- [ ] Implement multimodal search with CLIP

**Production:**
- [ ] Design scalable RAG architectures
- [ ] Debug retrieval and generation issues
- [ ] Evaluate RAG systems with metrics

---

## 🔗 Additional Resources

### Documentation
- [ChromaDB Docs](https://docs.trychroma.com/)
- [LangChain Docs](https://python.langchain.com/)
- [Streamlit Docs](https://docs.streamlit.io/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

### Research Papers
- ["Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"](https://arxiv.org/abs/2005.11401)
- ["HNSW: Efficient and robust approximate nearest neighbor search"](https://arxiv.org/abs/1603.09320)
- ["Learning Transferable Visual Models From Natural Language Supervision"](https://arxiv.org/abs/2103.00020) (CLIP)

### Tools
- [RAGAS](https://github.com/explodinggradients/ragas) - RAG evaluation
- [LangSmith](https://smith.langchain.com/) - LangChain monitoring
- [Pinecone](https://www.pinecone.io/) - Managed vector DB

---

## 🚀 Next Week Preview

**Week 6: Trending Topics in Generative AI**
- Mixture of Experts (MoE)
- Multimodal Models
- Constitutional AI
- Recent Model Architectures
- Industry Applications

---

## 💡 Study Tips

1. **Code Along:** Don't just read – type and run every example
2. **Build Projects:** The projects solidify your understanding
3. **Experiment:** Try different chunking sizes, models, prompts
4. **Debug Actively:** When things break, understand why
5. **Interview Prep:** Practice explaining concepts out loud

---

**Ready to master Vector DBs and RAG? Let's dive in!** 🎉

---

*Week 5 of AI Generative Master Course | Last Updated: 2024*
