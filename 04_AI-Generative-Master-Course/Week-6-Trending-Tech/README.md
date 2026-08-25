# 📚 Week 6: Trending Tech in AI

## 🎯 Overview

Welcome to **Week 6** of the AI Generative Master Course! This week explores the **cutting-edge technologies** shaping the AI landscape in 2024-2025. From local LLM deployment to revolutionary model architectures, you'll learn the tools and techniques that top AI engineers use today.

---

## 📋 What You'll Learn

| Topic | Key Concepts | Practical Skills |
|-------|--------------|------------------|
| **MCP** | Model Context Protocol, Tool Use | Build MCP servers |
| **Ollama** | Local LLMs, GGUF, Quantization | Deploy models locally |
| **Unsloth** | Fast Fine-tuning, LoRA | Train 2-5x faster |
| **MoE** | Mixture of Experts, Routing | Understand sparse models |
| **Chain of Thought** | CoT, ToT, Self-Consistency | Improve reasoning |
| **DeepSeek** | MLA, MoE, FP8 Training | Modern architectures |

---

## 📁 Course Files

| # | File | Description | Difficulty |
|---|------|-------------|------------|
| 1 | [01-MCP.md](./01-MCP.md) | Model Context Protocol - Connect LLMs to tools | ⭐⭐ |
| 2 | [02-Ollama.md](./02-Ollama.md) | Run LLMs locally with Ollama | ⭐ |
| 3 | [03-Unsloth.md](./03-Unsloth.md) | Fine-tune LLMs 2-5x faster | ⭐⭐⭐ |
| 4 | [04-MoE.md](./04-MoE.md) | Mixture of Experts architecture | ⭐⭐⭐⭐ |
| 5 | [05-Chain-of-Thought.md](./05-Chain-of-Thought.md) | Reasoning techniques for LLMs | ⭐⭐ |
| 6 | [06-DeepSeek-Architecture.md](./06-DeepSeek-Architecture.md) | DeepSeek-V2/V3 innovations | ⭐⭐⭐⭐ |

---

## 🗓️ Suggested Study Plan

### Day 1-2: Local AI Deployment
```
Morning:  Read 02-Ollama.md
Afternoon: Install Ollama, run local models
Evening:  Build a simple chatbot with Ollama
```

### Day 3-4: Tool Integration
```
Morning:  Read 01-MCP.md
Afternoon: Build your first MCP server
Evening:  Connect MCP to Claude/other clients
```

### Day 5-6: Fine-Tuning
```
Morning:  Read 03-Unsloth.md
Afternoon: Set up Unsloth environment
Evening:  Fine-tune a small model
```

### Day 7: Advanced Architectures
```
Morning:  Read 04-MoE.md
Afternoon: Read 06-DeepSeek-Architecture.md
Evening:  Implement mini MoE components
```

### Day 8: Reasoning Techniques
```
Morning:  Read 05-Chain-of-Thought.md
Afternoon: Implement CoT prompting
Evening:  Build a math tutor with CoT
```

---

## 🔧 Prerequisites

Before starting Week 6, ensure you have:

### Technical Requirements
- [ ] Python 3.10+
- [ ] GPU with 8GB+ VRAM (for Unsloth)
- [ ] 16GB+ RAM
- [ ] Docker (optional, for MCP)

### Knowledge Prerequisites
- [ ] Transformer architecture basics (Week 3)
- [ ] Fine-tuning concepts (Week 4)
- [ ] Basic PyTorch/TensorFlow

### Recommended Installations
```bash
# Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Unsloth (in a virtual environment)
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"

# MCP
pip install mcp anthropic

# General
pip install torch transformers openai langchain
```

---

## 🌟 Why These Topics?

### 2024-2025 Trends

```
┌─────────────────────────────────────────────────────────────┐
│                 AI INDUSTRY TRENDS                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LOCAL AI                                                    │
│  ├─ Privacy concerns driving on-device AI                   │
│  ├─ Ollama: 100K+ GitHub stars                              │
│  └─ Edge deployment becoming standard                       │
│                                                              │
│  TOOL USE                                                    │
│  ├─ Agentic AI requires tool integration                    │
│  ├─ MCP standardizing LLM-tool communication                │
│  └─ Every major LLM adding function calling                 │
│                                                              │
│  EFFICIENT TRAINING                                          │
│  ├─ Fine-tuning costs dropping rapidly                      │
│  ├─ Unsloth: 2-5x speedup, 80% less memory                  │
│  └─ Small models matching larger ones with fine-tuning      │
│                                                              │
│  SPARSE ARCHITECTURES                                        │
│  ├─ MoE models becoming dominant                            │
│  ├─ DeepSeek-V3: GPT-4 level at 5% cost                     │
│  └─ Efficiency without quality loss                         │
│                                                              │
│  REASONING                                                   │
│  ├─ Chain-of-Thought now standard                           │
│  ├─ OpenAI o1, DeepSeek-R1 for reasoning                    │
│  └─ Tree-of-Thought for complex problems                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💼 Career Applications

### Job Roles
| Role | Relevant Topics |
|------|-----------------|
| ML Engineer | MoE, DeepSeek, Unsloth |
| AI Application Developer | MCP, Ollama, CoT |
| Research Engineer | All topics |
| MLOps Engineer | Ollama, Unsloth |
| Prompt Engineer | CoT, MCP |

### Interview Topics
- "How does MoE reduce inference cost?"
- "Explain Chain of Thought prompting"
- "How would you deploy LLMs locally?"
- "What's MLA and why does it matter?"

---

## 🎯 Learning Objectives

By the end of Week 6, you will be able to:

1. **Deploy** LLMs locally using Ollama
2. **Build** MCP servers to connect LLMs to tools
3. **Fine-tune** models efficiently with Unsloth
4. **Understand** MoE architecture and routing
5. **Implement** CoT prompting techniques
6. **Explain** DeepSeek's architectural innovations

---

## 🏆 Week 6 Projects

### Mini Projects (In Each File)
- MCP: File system access server
- Ollama: Local chat application
- Unsloth: Fine-tune a coding assistant
- MoE: Build mini MoE layer
- CoT: Math tutor with reasoning
- DeepSeek: Mini DeepSeek model

### Capstone Project Ideas
1. **Local AI Assistant** - Ollama + MCP for local tool-using AI
2. **Reasoning Tutor** - Fine-tuned model with CoT for education
3. **MoE Experiment** - Compare dense vs sparse models

---

## 📊 Topic Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                 TOPIC RELATIONSHIPS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌──────────┐                              │
│                    │  MoE     │                              │
│                    │ (Sparse) │                              │
│                    └────┬─────┘                              │
│                         │                                    │
│                    Uses MoE                                  │
│                         │                                    │
│                    ┌────▼─────┐                              │
│  ┌──────────┐      │ DeepSeek │      ┌──────────┐           │
│  │ Unsloth  │──────┤  Arch    ├──────│  Local   │           │
│  │(Training)│      │          │      │ (Ollama) │           │
│  └──────────┘      └────┬─────┘      └──────────┘           │
│                         │                                    │
│                    Improved by                               │
│                         │                                    │
│                    ┌────▼─────┐      ┌──────────┐           │
│                    │   CoT    │      │   MCP    │           │
│                    │(Prompting│──────│ (Tools)  │           │
│                    └──────────┘      └──────────┘           │
│                                                              │
│  Connections:                                                │
│  - DeepSeek uses MoE architecture                           │
│  - Unsloth can fine-tune DeepSeek models                    │
│  - Ollama can run DeepSeek locally                          │
│  - CoT improves any model's reasoning                       │
│  - MCP enables tool use with any model                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Additional Resources

### Papers
- [Mixture of Experts](https://arxiv.org/abs/1701.06538)
- [Chain of Thought](https://arxiv.org/abs/2201.11903)
- [DeepSeek-V2](https://arxiv.org/abs/2405.04434)
- [DeepSeek-V3](https://github.com/deepseek-ai/DeepSeek-V3/blob/main/DeepSeek_V3.pdf)

### GitHub Repos
- [Ollama](https://github.com/ollama/ollama)
- [Unsloth](https://github.com/unslothai/unsloth)
- [MCP SDK](https://github.com/anthropics/anthropic-sdk-python)
- [DeepSeek](https://github.com/deepseek-ai)

### Tutorials
- [Ollama Documentation](https://ollama.com/library)
- [Unsloth Wiki](https://github.com/unslothai/unsloth/wiki)
- [MCP Docs](https://docs.anthropic.com/mcp)

---

## ✅ Week 6 Checklist

- [ ] Read all 6 topic files
- [ ] Install Ollama and run a local model
- [ ] Build one MCP server
- [ ] Try Unsloth fine-tuning (even small example)
- [ ] Implement basic CoT prompting
- [ ] Understand MLA and MoE concepts
- [ ] Complete at least 2 mini projects
- [ ] Answer interview questions from each file

---

## 🚀 Next Steps

After completing Week 6, you're ready for:

**Week 7: Advanced Topics**
- Multi-Modal Models (Vision + Language)
- RLHF and DPO
- Model Serving and Optimization
- Production Deployment

---

**Good luck with Week 6! These are the skills that define cutting-edge AI engineering in 2024-2025.** 🎉
