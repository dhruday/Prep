---

# 30 Portfolio Projects Index

> Every project mapped to the day it's primarily built. All 30 projects from the original curriculum are covered.

| # | Project | Primary Day | Phase | Status |
|---|---|---|---|---|
| 1 | AI Chat App (ChatGPT Clone) | Day 25, 73 | 3, 10 | [ ] |
| 2 | AI PDF Chat | Day 35 | 4 | [ ] |
| 3 | AI Resume Analyzer | Day 14 | 2 | [ ] |
| 4 | AI Email Assistant | Day 78 | 10 | [ ] |
| 5 | AI Meeting Notes Generator | Day 22, 27 | 3 | [ ] |
| 6 | Token Cost Calculator Dashboard | Day 4 | 1 | [ ] |
| 7 | AI Flashcard Generator | Day 13 (mini) | 2 | [ ] |
| 8 | AI Writing Assistant (Copilot) | Day 75 | 10 | [ ] |
| 9 | Prompt Engineering Playground | Day 19 | 2 | [ ] |
| 10 | AI FAQ Bot (RAG on Docs) | Day 28, 31 | 4 | [ ] |
| 11 | AI Interview Coach | Day 52 | 6 | [ ] |
| 12 | AI Customer Support Bot | Day 63 (guardrails) | 8 | [ ] |
| 13 | AI Code Review Tool | Day 80 | 10 | [ ] |
| 14 | AI Knowledge Base (Notion-style) | Day 45 (memory) | 6 | [ ] |
| 15 | AI Stock Research Assistant | Day 15 (tools) | 2 | [ ] |
| 16 | AI Social Media Manager | Day 80 | 10 | [ ] |
| 17 | AI Coding Assistant (VS Code Extension) | Day 87 | 12 | [ ] |
| 18 | Multi-modal Image Analyzer | Day 24 | 3 | [ ] |
| 19 | AI Language Learning App | Day 74 (voice) | 10 | [ ] |
| 20 | AI-Powered Search Engine | Day 76 | 10 | [ ] |
| 21 | Production RAG Platform | Day 34 | 4 | [ ] |
| 22 | AI Agent for Software Engineering | Day 49 | 6 | [ ] |
| 23 | Multi-Agent Research System | Day 48 | 6 | [ ] |
| 24 | MCP Server for Internal Tools | Day 57–60 | 7 | [ ] |
| 25 | Voice AI Assistant (Full-Stack) | Day 74 | 10 | [ ] |
| 26 | AI SaaS Application (Full Product) | Day 79, 86 | 10, 11 | [ ] |
| 27 | AI Evaluation Framework | Day 9 | 1 | [ ] |
| 28 | Real-Time AI Translation Platform | Day 74 (extended) | 10 | [ ] |
| 29 | AI Content Moderation System | Day 63 | 8 | [ ] |
| 30 | Enterprise AI Copilot Platform | Day 79 | 10 | [ ] |

---

# Interview Preparation Guide

## By Role

### AI Product Engineer (Google, Meta, Anthropic)
**Focus areas:** Phases 1–7, 10
**Key projects:** Production RAG Platform, AI Chat App, AI Interview Coach
**Unique questions:** product design with AI, eval design, LLM selection

### AI Software Engineer (OpenAI, Anthropic, Databricks)
**Focus areas:** Phases 4–9, 11
**Key projects:** Production RAG, SWE Agent, MCP Server, AI Evaluation Framework
**Unique questions:** RAG architecture, agent reliability, scalability, observability

### Senior Frontend + AI Engineer (Airbnb, Stripe, Netflix)
**Focus areas:** Phases 3, 10, plus frontend engineering background
**Key projects:** AI Chat App, AI Writing Copilot, AI Search, AI UX Library
**Unique questions:** streaming UX, generative UI, AI UX patterns

### Full Stack AI Engineer (Uber, Salesforce, Adobe)
**Focus areas:** All phases, emphasis on end-to-end systems
**Key projects:** Production RAG, Voice AI, Enterprise Copilot, Email Triage
**Unique questions:** API design, deployment, monitoring, cost optimization

---

## AI System Design Framework (Memorize This)

```
1. CLARIFY REQUIREMENTS (3 min)
   □ Who are the users?
   □ What's the scale? (MAU, QPS, data volume)
   □ What AI capabilities are needed?
   □ Latency SLA? Cost budget? Accuracy requirement?
   □ Regulatory/privacy constraints?

2. HIGH-LEVEL ARCHITECTURE (5 min)
   □ Which AI architecture pattern? (single LLM / RAG / Agent / Multi-agent)
   □ Which model(s)? (justify choice)
   □ Data flow diagram
   □ Key external systems

3. CORE COMPONENTS DEEP-DIVE (15 min)
   □ Ingestion pipeline (if RAG)
   □ Retrieval strategy (if RAG)
   □ Agent design (if agentic)
   □ Prompt architecture
   □ Tool design

4. PERFORMANCE & SCALE (5 min)
   □ Expected QPS and how you handle it
   □ Latency optimization strategy
   □ Caching strategy (semantic cache, prompt cache)
   □ Cost optimization

5. SECURITY & SAFETY (3 min)
   □ Prompt injection defense
   □ Content safety guardrails
   □ PII handling
   □ Access control

6. OBSERVABILITY (3 min)
   □ What you log (every AI call)
   □ Key metrics
   □ Alerting

7. TRADE-OFFS & ALTERNATIVES (2 min)
   □ What you chose and why
   □ What you'd do differently at 10x scale
   □ Alternative architecture considered
```

---

# Progress Tracker

## Daily Completion Log — All 90 Days

### Phase 1: AI Foundations (Days 1–10)
- [ ] Day 1: What is Generative AI?
- [ ] Day 2: How LLMs Work (Conceptual)
- [ ] Day 3: Transformers (High-Level)
- [ ] Day 4: Tokens & Tokenization
- [ ] Day 5: Embeddings
- [ ] Day 6: Context Windows
- [ ] Day 7: Temperature, Top-P & Sampling
- [ ] Day 8: Hallucinations & Grounding
- [ ] Day 9: AI Evaluation (Evals)
- [ ] Day 10: Model Capabilities & Limitations

### Phase 2: Prompt Engineering (Days 11–19)
- [ ] Day 11: Anatomy of a Great Prompt
- [ ] Day 12: Chain-of-Thought Prompting
- [ ] Day 13: Advanced Prompt Patterns
- [ ] Day 14: Structured Outputs & JSON Mode
- [ ] Day 15: Function Calling & Tool Calling
- [ ] Day 16: Prompt Security & Injection
- [ ] Day 17: System Prompt Architecture
- [ ] Day 18: Prompt Optimization & Cost Reduction
- [ ] Day 19: Project Day — Prompt Engineering Playground

### Phase 3: AI APIs & SDKs (Days 20–27)
- [ ] Day 20: OpenAI API Mastery
- [ ] Day 21: Anthropic Claude API Mastery
- [ ] Day 22: Google Gemini API Mastery
- [ ] Day 23: OpenRouter & Streaming APIs (combined)
- [ ] Day 24: Multimodal APIs
- [ ] Day 25: Vercel AI SDK
- [ ] Day 26: LangChain (Where It Matters)
- [ ] Day 27: Project Day — Chat App + Meeting Notes

### Phase 4: RAG Systems (Days 28–37)
- [ ] Day 28: What is RAG and Why It Matters
- [ ] Day 29: Chunking Strategies
- [ ] Day 30: Embeddings for RAG + Retrieval Strategies (combined)
- [ ] Day 31: Re-ranking
- [ ] Day 32: Hybrid Search
- [ ] Day 33: Metadata Filtering
- [ ] Day 34: Production RAG Architecture
- [ ] Day 35: Project Day — PDF Chat
- [ ] Day 36: Advanced RAG Techniques
- [ ] Day 37: RAG Evaluation Deep Dive + Checkpoint

### Phase 5: Vector Databases (Days 38–43)
- [ ] Day 38: Vector Database Fundamentals
- [ ] Day 39: pgvector (PostgreSQL)
- [ ] Day 40: Pinecone
- [ ] Day 41: Weaviate & Chroma
- [ ] Day 42: Vector DB at Scale
- [ ] Day 43: Phase 5 Project Day + Benchmark

### Phase 6: AI Agents (Days 44–55)
- [ ] Day 44: What is an AI Agent?
- [ ] Day 45: Agent Memory Systems
- [ ] Day 46: Agent Tool Design
- [ ] Day 47: Agent Planning & Reasoning
- [ ] Day 48: Multi-Agent Systems
- [ ] Day 49: LangGraph
- [ ] Day 50: CrewAI + AutoGen (combined)
- [ ] Day 51: Building Agents Without Frameworks
- [ ] Day 52: Project Day — AI Interview Coach
- [ ] Day 53: Agent Reliability, Testing & Observability
- [ ] Day 54: Agent Security & Human-in-the-Loop
- [ ] Day 55: Phase 6 Checkpoint + Portfolio Review

### Phase 7: MCP Protocol (Days 56–60)
- [ ] Day 56: What is MCP?
- [ ] Day 57: Building MCP Servers
- [ ] Day 58: MCP Security & Production Architecture
- [ ] Day 59: MCP Ecosystem + Integration Patterns
- [ ] Day 60: MCP Project Polish + Phase 7 Review

### Phase 8: AI Security & Safety (Days 61–65)
- [ ] Day 61: Prompt Injection Attacks & Defenses
- [ ] Day 62: PII Protection & Data Privacy
- [ ] Day 63: Guardrails & Content Safety
- [ ] Day 64: AI Governance & Compliance
- [ ] Day 65: Phase 8 Security Audit + Checkpoint

### Phase 9: AI System Design (Days 66–72)
- [ ] Day 66: AI Application Architecture Patterns
- [ ] Day 67: AI Cost Optimization at Scale
- [ ] Day 68: AI Observability & Monitoring
- [ ] Day 69: Scalability & Performance
- [ ] Day 70: AI System Design Interview Practice
- [ ] Day 71: Full System Design Document
- [ ] Day 72: Phase 9 Checkpoint + Interview Prep

### Phase 10: AI Product Engineering (Days 73–81)
- [ ] Day 73: AI Chat Interface Design
- [ ] Day 74: Voice AI
- [ ] Day 75: AI Copilots & Inline AI
- [ ] Day 76: AI Search
- [ ] Day 77: AI UX Patterns
- [ ] Day 78: AI Workflows & Automation
- [ ] Day 79: Enterprise AI Applications
- [ ] Day 80: Project Sprint (Code Review + Social Media)
- [ ] Day 81: Phase 10 Checkpoint + Portfolio Polish

### Phase 11: AI Deployment & MLOps (Days 82–86)
- [ ] Day 82: Containerizing AI + Serverless Deployment (combined)
- [ ] Day 83: Local LLMs & Edge AI
- [ ] Day 84: GPU Basics + Production Monitoring (combined)
- [ ] Day 85: CI/CD for AI + Phase 11 Checkpoint
- [ ] Day 86: Deployment Day — All Projects Live

### Phase 12: Latest AI Ecosystem (Days 87–90)
- [ ] Day 87: AI Coding Tools + AI Browsers (combined)
- [ ] Day 88: Model Routing & AI Gateways + SLMs (combined)
- [ ] Day 89: AI Automation Tools + Governance (combined)
- [ ] Day 90: Final Review + Interview Prep + Peak Readiness

---

## Interview Readiness Tracker

Update every Sunday:

| Week | Foundations | Prompt Eng | APIs/SDKs | RAG | Agents | MCP | Security | System Design | Product | Deployment | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Week 1 | | | | | | | | | | | |
| Week 2 | | | | | | | | | | | |
| Week 3 | | | | | | | | | | | |
| Week 4 | | | | | | | | | | | |
| Week 5 | | | | | | | | | | | |
| Week 6 | | | | | | | | | | | |
| Week 7 | | | | | | | | | | | |
| Week 8 | | | | | | | | | | | |
| Week 9 | | | | | | | | | | | |
| Week 10 | | | | | | | | | | | |
| Week 11 | | | | | | | | | | | |
| Week 12 | | | | | | | | | | | |
| Week 13 | | | | | | | | | | | |

**Score: 1 = Can't explain | 3 = Explain with notes | 5 = Fluent, can implement**

---

## Emergency Interview Prep (If Called Tomorrow)

**Priority order — study in this sequence:**

**Hour 1: Foundations**
- LLMs work by next-token prediction trained on internet scale data + RLHF
- RAG = Retrieve relevant docs → augment prompt → generate grounded answer
- Embeddings = vectors in high-dimensional space, similar meaning = close vectors
- Prompt injection = user overrides system prompt → defense = input/output validation

**Hour 2: System Design Framework**
Memorize and practice the 7-step AI system design framework above.
Apply to: "Design a RAG-based customer support AI" (40 minutes)

**Hour 3: Agents + MCP**
- Agent loop: Perceive → Think → Act → Observe → repeat
- MCP: open protocol, Resources + Tools + Prompts + Sampling
- Multi-agent: Orchestrator → specialized sub-agents

**Hour 4: Your Best Project**
Practice explaining your Production RAG Platform in 5 minutes:
- Problem it solves
- Architecture (draw it)
- Key decisions + why
- What you learned
- What you'd change

**Hour 5: Behavioral**
Prepare and rehearse:
- "Tell me about yourself" (90 seconds)
- "Most complex AI thing you've built"
- "Why this company specifically"

**Rest. Your 90 days of preparation are your foundation. Trust it.**

---

## GitHub Repository Structure

```
ai-engineer-portfolio/
├── README.md                          # Portfolio overview + all project links
├── phase-01-foundations/
│   ├── day-01-generative-ai/
│   │   ├── notes.md
│   │   ├── src/multi-provider-compare.ts
│   │   └── interview-qa.md
│   ├── ...
├── phase-02-prompt-engineering/
│   ├── day-11-prompt-anatomy/
│   ├── day-19-prompt-playground/      # Project 9 — live demo
│   └── ...
├── phase-03-ai-apis-sdks/
│   ├── day-25-ai-chat-app/            # Project 1 — live demo
│   └── ...
├── phase-04-rag/
│   ├── day-34-production-rag/         # Project 21 — flagship
│   ├── day-35-pdf-chat/               # Project 2
│   └── benchmarks/                   # Chunking, retrieval, reranking results
├── phase-05-vector-databases/
│   └── benchmarks/                   # pgvector vs Pinecone vs Weaviate
├── phase-06-agents/
│   ├── day-49-swe-agent/              # Project 22 — flagship agent
│   ├── day-52-interview-coach/        # Project 11
│   └── day-51-bare-metal-agent/
├── phase-07-mcp/
│   └── day-57-jira-mcp-server/        # Project 24
├── phase-08-security/
│   └── security-audit-checklist.md
├── phase-09-system-design/
│   └── designs/                      # 2+ full system design docs
├── phase-10-product-engineering/
│   ├── day-75-writing-copilot/        # Project 8
│   ├── day-76-ai-search/              # Project 20
│   └── day-77-ai-ux-library/         # 10 AI UX components
├── phase-11-deployment/
│   ├── docker/                       # Production Dockerfiles
│   └── ci-cd/                        # GitHub Actions for AI quality
└── phase-12-ecosystem/
    └── benchmarks/                   # SLM vs GPT-4o comparisons
```

---

## Final Note

> **The AI engineering landscape moves fast. What stays stable:**
> - Embeddings, RAG, and vector search (core infrastructure)
> - Agent patterns and memory systems (architectural patterns)
> - Evaluation methodologies (how you measure quality)
> - Security principles (injection, PII, guardrails)
>
> **What changes:**
> - Specific models (new ones every quarter)
> - Specific APIs (syntax changes constantly)
> - Framework versions (LangChain, LangGraph evolve rapidly)
>
> **You've learned the concepts deeply. The syntax you can always look up.**
>
> The AI engineers who will thrive in 2026–2035 are those who:
> 1. Ship production AI systems with real users, not just demos
> 2. Can evaluate and measure AI quality rigorously
> 3. Design for security, cost, and scale from day one
> 4. Build with any model, not just the current hot one
> 5. Understand both the product layer and the engineering layer

*90 days. 12 phases. 77 lessons. 30 projects. All complete.*
