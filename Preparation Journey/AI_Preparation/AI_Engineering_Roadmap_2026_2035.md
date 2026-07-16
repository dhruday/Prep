# 🚀 AI Product Engineer Roadmap 2026–2035
### From Senior Frontend Engineer → Future-Ready AI Software Engineer

> **Designed for:** Senior Software Engineers (7+ years) transitioning into AI Product/Software Engineering  
> **Target Companies:** Google · OpenAI · Anthropic · Microsoft · Meta · Amazon · NVIDIA · Stripe · Airbnb · Uber · Databricks  
> **Duration:** ~12–18 months at 30–60 min/day  
> **Last Updated:** July 2026

---

## 📋 Table of Contents

1. [Who This Roadmap Is For](#who-this-roadmap-is-for)
2. [Roadmap Overview & Phases](#roadmap-overview--phases)
3. [Daily Study Plan](#daily-study-plan)
4. [Phase 1 — AI Foundations](#phase-1--ai-foundations)
5. [Phase 2 — Prompt Engineering](#phase-2--prompt-engineering)
6. [Phase 3 — AI APIs & SDKs](#phase-3--ai-apis--sdks)
7. [Phase 4 — Retrieval-Augmented Generation (RAG)](#phase-4--retrieval-augmented-generation-rag)
8. [Phase 5 — Vector Databases](#phase-5--vector-databases)
9. [Phase 6 — AI Agents & Agentic Systems](#phase-6--ai-agents--agentic-systems)
10. [Phase 7 — Model Context Protocol (MCP)](#phase-7--model-context-protocol-mcp)
11. [Phase 8 — AI Security & Safety](#phase-8--ai-security--safety)
12. [Phase 9 — AI System Design](#phase-9--ai-system-design)
13. [Phase 10 — AI Product Engineering](#phase-10--ai-product-engineering)
14. [Phase 11 — AI Deployment & MLOps](#phase-11--ai-deployment--mlops)
15. [Phase 12 — Latest AI Ecosystem](#phase-12--latest-ai-ecosystem)
16. [30+ Portfolio Projects](#30-portfolio-projects)
17. [Interview Preparation](#interview-preparation)
18. [Monthly Revision Plan](#monthly-revision-plan)
19. [Resources](#resources)

---

## Who This Roadmap Is For

### ✅ This Roadmap Assumes You Already Know

- JavaScript / TypeScript (advanced)
- React / Frontend System Design
- REST APIs / GraphQL
- Basic Backend Development
- Git / CI/CD basics
- Data Structures & Algorithms

### 🎯 What You Will Become

| Title | Key Skills |
|---|---|
| **AI Product Engineer** | Build AI-powered products end-to-end |
| **AI Software Engineer** | Integrate LLMs, RAG, Agents into production systems |
| **Senior Frontend + AI Engineer** | AI UX, Streaming, AI Chat Interfaces |
| **Full Stack AI Engineer** | APIs, Agents, Deployment, Observability |

### ❌ What This Roadmap Does NOT Cover

- ML Research / Training models from scratch
- Data Science / Statistics
- MLOps for model training pipelines
- General Frontend / Backend fundamentals

---

## Roadmap Overview & Phases

```
Phase 1  →  AI Foundations         (Weeks 1–4)
Phase 2  →  Prompt Engineering     (Weeks 5–8)
Phase 3  →  AI APIs & SDKs         (Weeks 9–12)
Phase 4  →  RAG Systems            (Weeks 13–18)
Phase 5  →  Vector Databases       (Weeks 17–20)
Phase 6  →  AI Agents              (Weeks 19–26)
Phase 7  →  MCP Protocol           (Weeks 25–28)
Phase 8  →  AI Security            (Weeks 27–30)
Phase 9  →  AI System Design       (Weeks 29–34)
Phase 10 →  AI Product Engineering (Weeks 33–40)
Phase 11 →  AI Deployment & MLOps  (Weeks 39–44)
Phase 12 →  Latest AI Ecosystem    (Weeks 43–48)
```

> ⚡ **Note:** Phases overlap intentionally. Build projects throughout every phase.

---

## Daily Study Plan

| Day Type | Activity | Time |
|---|---|---|
| **Weekday** | 1 lesson + mini exercise | 45–60 min |
| **Weekend (Sat)** | 1 lesson + start a project | 60–90 min |
| **Weekend (Sun)** | Project work + review week | 60–90 min |

### Phase Durations

| Phase | Weeks | Days at 45 min/day |
|---|---|---|
| Phase 1: Foundations | 4 | 28 |
| Phase 2: Prompt Engineering | 4 | 28 |
| Phase 3: APIs & SDKs | 4 | 28 |
| Phase 4: RAG | 5 | 35 |
| Phase 5: Vector DBs | 3 | 21 |
| Phase 6: AI Agents | 7 | 49 |
| Phase 7: MCP | 4 | 28 |
| Phase 8: AI Security | 3 | 21 |
| Phase 9: AI System Design | 5 | 35 |
| Phase 10: AI Product Engineering | 7 | 49 |
| Phase 11: Deployment & MLOps | 5 | 35 |
| Phase 12: Latest Ecosystem | 5 | 35 |
| **Total** | **~56 weeks** | **~392 days** |

---

## Phase 1 — AI Foundations

> **Duration:** 4 weeks | **Difficulty:** Beginner–Intermediate  
> **Goal:** Understand how modern AI systems work at a conceptual and practical level

---

### Module 1.1 — Generative AI Fundamentals

---

#### Lesson 1.1.1 — What is Generative AI?

- **Difficulty:** ⭐ Beginner  
- **Time:** 45 min  

**Why This Matters**  
Generative AI is the foundational paradigm shift of 2023–2030. Every company is building products on top of it. Understanding what it is — and is not — is your starting point.

**Concepts to Learn**  
- Discriminative AI vs Generative AI  
- Types: Text, Image, Code, Audio, Video, Multimodal  
- Foundation Models vs Fine-tuned Models  
- The difference between AI, ML, DL, and GenAI  

**Practical Implementation**  
- Call the OpenAI API with a simple text prompt  
- Call the Anthropic API with a simple text prompt  
- Compare outputs from GPT-4o vs Claude vs Gemini  

**Mini Exercise**  
> Write a TypeScript script that sends the same prompt to 3 different AI providers and prints all responses side by side.

**Interview Questions**  
- What is the difference between discriminative and generative AI?  
- How does a language model differ from a traditional ML classifier?  
- What are foundation models and why do they matter?  

- [ ] **Completed**

---

#### Lesson 1.1.2 — How LLMs Work (Conceptual)

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
You don't need to train LLMs, but you need to understand them well enough to build reliable systems on top of them.

**Concepts to Learn**  
- Pre-training on internet-scale data  
- Unsupervised next-token prediction  
- RLHF (Reinforcement Learning from Human Feedback) — conceptual  
- What makes GPT-4, Claude, Gemini different  
- Parameter counts and what they mean  

**Practical Implementation**  
- Read Anthropic's model cards for Claude  
- Read OpenAI's system card for GPT-4o  
- Understand what "billion parameters" means in practice  

**Mini Exercise**  
> Write a 200-word blog post explaining how LLMs work to a non-technical PM. No jargon.

**Interview Questions**  
- Explain how a large language model is trained at a high level.  
- What is RLHF and why does it matter for product-grade AI?  
- Why do different models have different "personalities"?  

- [ ] **Completed**

---

#### Lesson 1.1.3 — Transformers (High-Level)

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
The Transformer architecture is the backbone of every modern LLM. Understanding it conceptually (not mathematically) is essential for debugging and designing AI systems.

**Concepts to Learn**  
- Attention mechanism — what it does conceptually  
- Encoder vs Decoder vs Encoder-Decoder  
- Why GPT is decoder-only  
- Positional encoding (why order matters to transformers)  
- Multi-head attention — what it enables  
- Why transformers scale better than RNNs  

**Practical Implementation**  
- Read the "Attention Is All You Need" abstract + intro (skip the math)  
- Watch Andrej Karpathy's "Let's Build GPT" (first 30 min only)  
- Visualize attention weights using BertViz or similar tools  

**Mini Exercise**  
> Create a diagram (ASCII or draw.io) showing the high-level flow of a prompt through a transformer model.

**Interview Questions**  
- What is self-attention and why does it matter?  
- Why are GPT models "decoder-only"?  
- What problem did transformers solve that RNNs couldn't?  

- [ ] **Completed**

---

#### Lesson 1.1.4 — Tokens & Tokenization

- **Difficulty:** ⭐ Beginner  
- **Time:** 45 min  

**Why This Matters**  
Everything in LLMs is tokens. Cost, speed, context limits, and performance all depend on tokens. A senior AI engineer must understand tokenization deeply.

**Concepts to Learn**  
- What a token is (not a word, not a character)  
- BPE (Byte Pair Encoding) — how tokenizers are built  
- Why "1 token ≈ 4 characters" in English  
- Token counts for different languages (CJK, Arabic cost more)  
- How tokenization affects prompts and costs  
- Special tokens: `<|im_start|>`, `[INST]`, `<s>`, `<|eot_id|>`  

**Practical Implementation**  
- Use OpenAI's Tokenizer playground  
- Use `tiktoken` library to count tokens programmatically  
- Write a TypeScript function: `estimateCost(prompt, model)`  

**Mini Exercise**  
> Build a "Token Cost Calculator" web component that accepts a prompt, selects a model, and shows estimated cost + token count in real-time.

**Interview Questions**  
- Why does tokenization matter for production AI systems?  
- How would you reduce token usage without losing quality?  
- Why do some languages cost more tokens per word?  

- [ ] **Completed**

---

#### Lesson 1.1.5 — Embeddings

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
Embeddings are the foundation of RAG, semantic search, recommendation systems, and clustering. Understanding them is non-negotiable for an AI engineer.

**Concepts to Learn**  
- What an embedding is (a vector in high-dimensional space)  
- Semantic similarity via cosine distance  
- Embedding models: text-embedding-3-small, text-embedding-3-large, Gemini embeddings  
- Embedding dimensions and their trade-offs  
- Why "similar meaning → close vectors"  
- Use cases: search, clustering, anomaly detection, RAG  

**Practical Implementation**  
- Generate embeddings using OpenAI's `text-embedding-3-small`  
- Compute cosine similarity between two sentences  
- Build a simple semantic search over 100 documents  

**Mini Exercise**  
> Build a "Semantic Similarity Checker" — input two sentences, output their cosine similarity score with a visual indicator.

**Interview Questions**  
- What is the difference between keyword search and semantic search?  
- How do embeddings power RAG systems?  
- What is cosine similarity and why is it used over Euclidean distance for embeddings?  

- [ ] **Completed**

---

#### Lesson 1.1.6 — Context Windows

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 45 min  

**Why This Matters**  
Context window management is one of the top architectural decisions in every production AI system. Limits, costs, and "lost in the middle" effects all stem from this.

**Concepts to Learn**  
- What is a context window (tokens in + tokens out)  
- Current limits: GPT-4o (128K), Claude 3.5 (200K), Gemini 1.5 Pro (1M)  
- The "lost in the middle" problem  
- Sliding window techniques  
- Prompt caching and why it reduces costs  
- KV cache — conceptual  

**Practical Implementation**  
- Test the "lost in the middle" problem with a 50-page document  
- Implement a simple sliding window context manager  
- Use Anthropic prompt caching API  

**Mini Exercise**  
> Build a context window visualizer showing how many tokens are used, how many remain, and estimated cost.

**Interview Questions**  
- What happens when you exceed the context window?  
- How would you handle a 500-page document in a chat system?  
- What is prompt caching and when should you use it?  

- [ ] **Completed**

---

#### Lesson 1.1.7 — Temperature, Top-P & Sampling

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 45 min  

**Why This Matters**  
These parameters control creativity vs determinism in outputs. Wrong settings break production systems. Understanding them lets you tune models precisely.

**Concepts to Learn**  
- Temperature (0 → deterministic, 2 → chaotic)  
- Top-P / Nucleus sampling  
- Top-K sampling  
- Presence & Frequency penalties  
- When to use low temperature (factual tasks)  
- When to use high temperature (creative tasks)  
- Why temperature=0 is not truly deterministic  

**Practical Implementation**  
- Run the same prompt 10 times at temperature 0, 0.7, and 1.5  
- Build a side-by-side comparison of different temperature values  
- Test Top-P vs Top-K on creative writing  

**Mini Exercise**  
> Build a "Sampling Playground" that lets you slide temperature/top-p and see live output differences.

**Interview Questions**  
- What temperature would you use for a customer support bot? Why?  
- Explain the difference between Top-P and Top-K sampling.  
- Why is temperature=0 not always fully deterministic?  

- [ ] **Completed**

---

#### Lesson 1.1.8 — Hallucinations & Grounding

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
Hallucinations are the #1 cause of production AI failures. Every senior AI engineer must know what causes them and how to mitigate them architecturally.

**Concepts to Learn**  
- Why LLMs hallucinate (statistical next-token prediction)  
- Types: factual hallucinations, entity hallucinations, citation hallucinations  
- Grounding techniques: RAG, tool use, system prompts  
- Confidence calibration  
- Chain-of-thought and its effect on accuracy  
- Verification patterns (output → verify → retry)  

**Practical Implementation**  
- Reproduce common hallucination patterns intentionally  
- Build a RAG system and compare accuracy with/without grounding  
- Implement a "verification loop" that checks AI output against a source  

**Mini Exercise**  
> Design a system that detects potential hallucinations using a second LLM call as a judge.

**Interview Questions**  
- Why do LLMs hallucinate?  
- How would you reduce hallucination rates in a medical AI product?  
- What is "grounding" and how does it work architecturally?  

- [ ] **Completed**

---

#### Lesson 1.1.9 — AI Evaluation (Evals)

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
"LLM as a judge" and systematic evals are what separate toy AI apps from production-grade systems. This is increasingly asked at senior engineering interviews.

**Concepts to Learn**  
- What evals are and why they matter  
- Types: accuracy, faithfulness, relevance, coherence  
- LLM-as-judge pattern  
- Human evaluation vs automated evaluation  
- Benchmarks: MMLU, HumanEval, MT-Bench  
- Eval frameworks: Braintrust, LangSmith, Promptfoo, OpenAI Evals  
- A/B testing AI outputs  

**Practical Implementation**  
- Set up Promptfoo for automated prompt evaluation  
- Build a simple LLM-as-judge evaluator  
- Create an eval dataset for a chatbot use case  

**Mini Exercise**  
> Build an eval pipeline that tests 3 different system prompts on 20 test cases and ranks them by quality score.

**Interview Questions**  
- How do you know if your AI system improved after a prompt change?  
- What is LLM-as-judge and what are its limitations?  
- How would you design an eval suite for a customer support bot?  

- [ ] **Completed**

---

#### Lesson 1.1.10 — AI Model Capabilities & Limitations

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 45 min  

**Why This Matters**  
Knowing what models can and cannot do prevents over-engineering and under-delivering. Model selection is a core architectural decision.

**Concepts to Learn**  
- Capability benchmarks: reasoning, coding, math, multilingual  
- Model families: GPT-4o, Claude 3.5/4, Gemini 1.5/2.0  
- Open-source vs proprietary: Llama 3, Mistral, Qwen  
- Cost per token comparisons  
- Latency characteristics  
- Fine-tuning availability  
- Multimodal capabilities  

**Practical Implementation**  
- Build a model comparison matrix spreadsheet  
- Test GPT-4o-mini vs GPT-4o on your use case  
- Test Claude Haiku vs Claude Sonnet on the same tasks  

**Mini Exercise**  
> Build a "Model Selector" decision tree that recommends the best model based on task type, cost budget, and latency requirements.

**Interview Questions**  
- How would you choose between GPT-4o and Claude for a production application?  
- When would you use a smaller model vs a larger model?  
- What are the trade-offs of open-source models vs proprietary APIs?  

- [ ] **Completed**

---

### Module 1.2 — AI Fundamentals Checkpoint

**Module Review**
- [ ] Can explain how LLMs work to a non-technical person  
- [ ] Can calculate token costs for any API call  
- [ ] Can compute cosine similarity between embeddings  
- [ ] Can set sampling parameters correctly for different tasks  
- [ ] Can design a basic hallucination mitigation strategy  
- [ ] Has run Lesson 1.1.4 mini project (Token Cost Calculator)  

---

## Phase 2 — Prompt Engineering

> **Duration:** 4 weeks | **Difficulty:** Beginner → Advanced  
> **Goal:** Master the craft of communicating with LLMs at a professional level

---

### Module 2.1 — Prompt Engineering Fundamentals

---

#### Lesson 2.1.1 — Anatomy of a Great Prompt

- **Difficulty:** ⭐ Beginner  
- **Time:** 45 min  

**Why This Matters**  
Prompt engineering is the fastest ROI skill in AI engineering. A 10x better prompt can eliminate the need for fine-tuning.

**Concepts to Learn**  
- System prompt vs User prompt vs Assistant turn  
- Role assignment ("You are a...")  
- Task + Context + Format + Constraints  
- Few-shot vs Zero-shot prompting  
- Positive instructions vs negative instructions  
- Why specific beats vague  

**Practical Implementation**  
- Rewrite 5 bad prompts into production-quality prompts  
- Test zero-shot vs 3-shot vs 5-shot on a classification task  
- Build a prompt template library in TypeScript  

**Mini Exercise**  
> Take a vague prompt like "summarize this" and refine it into a production-grade prompt with role, task, format, constraints, and an example.

**Interview Questions**  
- What makes a system prompt effective?  
- What is few-shot prompting and when should you use it?  
- How do you handle prompts that produce inconsistent outputs?  

- [ ] **Completed**

---

#### Lesson 2.1.2 — Chain-of-Thought Prompting

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
CoT dramatically improves reasoning accuracy. It's a core technique used in production AI systems and is referenced in nearly every AI engineering interview.

**Concepts to Learn**  
- What Chain-of-Thought (CoT) is  
- "Let's think step by step" and why it works  
- Zero-shot CoT vs few-shot CoT  
- Tree-of-Thought (ToT) — extension of CoT  
- When CoT helps and when it doesn't  
- Extended thinking (Claude) and reasoning models (o1, o3)  

**Practical Implementation**  
- Compare standard vs CoT prompts on a math problem  
- Compare Claude extended thinking vs standard on a complex task  
- Implement a ToT prompting pattern  

**Mini Exercise**  
> Build a "Reasoning Comparator" that runs the same task with 3 prompting strategies (standard, CoT, ToT) and shows outputs side by side.

**Interview Questions**  
- Why does "let's think step by step" improve accuracy?  
- When would Chain-of-Thought not be beneficial?  
- How do reasoning models like o1 differ from CoT prompting?  

- [ ] **Completed**

---

#### Lesson 2.1.3 — Advanced Prompt Patterns

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Why This Matters**  
These patterns are the advanced toolkit of production prompt engineers. They appear constantly in real product codebases.

**Concepts to Learn**  
- **ReAct** (Reason + Act) pattern  
- **COSTAR** framework (Context, Objective, Style, Tone, Audience, Response)  
- **Self-Consistency** — run N times, vote on answer  
- **Meta-prompting** — prompts that generate prompts  
- **Least-to-most prompting** — break complex tasks into subtasks  
- **Prompt chaining** — output of one prompt → input to next  
- **Skeleton-of-thought** — parallel generation for speed  

**Practical Implementation**  
- Implement the ReAct pattern manually (before using LangChain)  
- Build a self-consistency pipeline that runs 5 completions and picks the most common answer  
- Build a prompt chain for a complex multi-step task  

**Mini Exercise**  
> Implement a "Research Pipeline" using prompt chaining: Query → Extract key claims → Verify each claim → Synthesize final answer.

**Interview Questions**  
- What is the ReAct pattern and when would you use it?  
- How does self-consistency improve output reliability?  
- Describe a real-world scenario where prompt chaining is the right solution.  

- [ ] **Completed**

---

#### Lesson 2.1.4 — Structured Outputs & JSON Mode

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
Structured outputs make AI outputs reliable and parseable. This is essential in any system where AI output feeds into application logic.

**Concepts to Learn**  
- JSON mode vs structured outputs vs response_format  
- OpenAI structured outputs with JSON Schema  
- Anthropic's approach to structured output  
- Zod validation of AI outputs  
- Handling parsing failures gracefully  
- Why you should always validate AI JSON output  

**Practical Implementation**  
- Use OpenAI `response_format: { type: "json_schema" }`  
- Validate output with Zod schema  
- Build retry logic when JSON parsing fails  
- Implement a TypeScript generic function: `aiJSON<T>(prompt, schema)`  

**Mini Exercise**  
> Build a "Resume Parser" that extracts structured data (name, skills, experience years, education) from unstructured resume text with Zod validation.

**Interview Questions**  
- Why is JSON mode not the same as structured outputs?  
- How do you handle cases where the AI returns invalid JSON?  
- What are the trade-offs of strict schema enforcement vs flexible output?  

- [ ] **Completed**

---

#### Lesson 2.1.5 — Function Calling & Tool Calling

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
Function calling is the bridge between LLMs and real-world systems. It's the foundation of every AI agent architecture.

**Concepts to Learn**  
- What function/tool calling is (AI decides to call a function)  
- OpenAI function calling schema  
- Anthropic tool use API  
- Parallel tool calling  
- Tool results and feeding them back  
- When the model chooses NOT to call a tool  
- Tool call loop architecture  

**Practical Implementation**  
- Implement a weather lookup tool with function calling  
- Build a multi-tool agent (search + calculator + database query)  
- Implement parallel tool calling and merge results  

**Mini Exercise**  
> Build a "Personal Finance Assistant" that uses function calling to: (1) get current stock prices, (2) calculate portfolio value, (3) lookup news headlines for holdings.

**Interview Questions**  
- How does function calling differ from just asking the model to return JSON?  
- What happens when a model decides to call multiple tools in parallel?  
- How do you handle tool call errors and retries?  

- [ ] **Completed**

---

#### Lesson 2.1.6 — Prompt Security & Injection

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
Prompt injection is the #1 security threat in AI systems. This is asked in virtually every senior AI engineering interview. Ignore this at your peril.

**Concepts to Learn**  
- What prompt injection is (malicious input overrides system prompt)  
- Direct vs indirect prompt injection  
- Jailbreaking techniques (for defense knowledge)  
- Prompt exfiltration attacks  
- Defense techniques: input validation, output validation, sandboxing  
- Constitutional AI principles  
- Guardrails for production systems  

**Practical Implementation**  
- Attempt to inject your own system prompt in various ways  
- Build an input validation layer that detects injection attempts  
- Implement Guardrails AI or similar library  
- Test your system against common jailbreak patterns  

**Mini Exercise**  
> Build a "Prompt Security Analyzer" that takes any user input and rates it on a 5-point injection risk scale with explanations.

**Interview Questions**  
- What is prompt injection and how do you mitigate it?  
- How would you secure a customer-facing AI chatbot?  
- What is the difference between direct and indirect prompt injection?  

- [ ] **Completed**

---

#### Lesson 2.1.7 — System Prompt Architecture

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Why This Matters**  
Production AI systems have complex, layered system prompts. Designing them correctly is a core skill of any senior AI engineer.

**Concepts to Learn**  
- System prompt as the source of truth for AI behavior  
- Layered system prompt architecture: base + persona + context + constraints  
- Dynamic system prompts (injecting runtime context)  
- System prompt versioning  
- Testing system prompt changes  
- Prompt leakage prevention  
- Rate limits and system prompt caching  

**Practical Implementation**  
- Build a system prompt management system in TypeScript  
- Implement dynamic context injection into system prompts  
- Version control your system prompts  
- A/B test two different system prompts on real users  

**Mini Exercise**  
> Design a full system prompt architecture for a "Senior Engineer AI Interviewer" product with: persona, constraints, format, examples, and edge case handling.

**Interview Questions**  
- How would you version control system prompts in production?  
- What information should you include in a system prompt vs the user message?  
- How do you prevent users from extracting your system prompt?  

- [ ] **Completed**

---

#### Lesson 2.1.8 — Prompt Optimization & Cost Reduction

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Why This Matters**  
In production at scale, prompt costs matter enormously. Optimizing prompts can reduce costs by 60–80% without quality loss.

**Concepts to Learn**  
- Prompt compression techniques  
- Model routing (use small model when possible, large model when needed)  
- Prompt caching (Anthropic, OpenAI)  
- Output length control  
- Removing redundant instructions  
- Shorter prompts via instruction distillation  
- Cost monitoring and budgeting  

**Practical Implementation**  
- Implement Anthropic prompt caching  
- Build a cost monitoring dashboard  
- Reduce a 2000-token system prompt to 800 tokens without quality loss  
- Implement model routing: GPT-4o-mini → GPT-4o fallback  

**Mini Exercise**  
> Take a production-like system prompt and reduce its token count by 40% while maintaining output quality (measure with evals).

**Interview Questions**  
- How would you reduce AI API costs by 50% without changing the product?  
- What is prompt caching and how does it work?  
- How would you implement model routing to optimize cost vs quality?  

- [ ] **Completed**

---

### Module 2.2 — Prompt Engineering Checkpoint

- [ ] Can write production-quality prompts from scratch  
- [ ] Can implement structured output with Zod validation  
- [ ] Can implement function calling end-to-end  
- [ ] Understands and can defend against prompt injection  
- [ ] Can reduce prompt token costs by 40%+ without quality loss  

---

## Phase 3 — AI APIs & SDKs

> **Duration:** 4 weeks | **Difficulty:** Intermediate  
> **Goal:** Fluent with all major AI APIs and SDKs used in production

---

### Module 3.1 — AI APIs

---

#### Lesson 3.1.1 — OpenAI API Mastery

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 90 min  

**Why This Matters**  
OpenAI is the industry standard. Mastery of their API is expected at every AI engineering role.

**Concepts to Learn**  
- Chat Completions API (messages array, roles)  
- Models: GPT-4o, GPT-4o-mini, o1, o3  
- Streaming responses  
- Function/tool calling  
- Vision API (image input)  
- Audio API (Whisper, TTS)  
- Assistants API (stateful threads)  
- Batch API (async, 50% cheaper)  
- Rate limits and error handling  
- Backoff strategies  

**Practical Implementation**  
- Build a full-featured chat interface with streaming  
- Implement vision analysis (image upload → description)  
- Use the Batch API for bulk processing  
- Implement exponential backoff for rate limits  

**Mini Exercise**  
> Build an "AI Document Processor" that accepts a PDF image, extracts structured data using vision API, and returns a validated JSON object.

**Interview Questions**  
- How does the Assistants API differ from the Chat Completions API?  
- When would you use the Batch API?  
- How do you handle OpenAI rate limits in a high-traffic application?  

- [ ] **Completed**

---

#### Lesson 3.1.2 — Anthropic Claude API Mastery

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 75 min  

**Why This Matters**  
Claude is increasingly preferred for complex reasoning, coding, and enterprise use cases. Anthropic is a top target employer for AI engineers.

**Concepts to Learn**  
- Messages API structure  
- Models: Claude 3.5 Haiku, Sonnet, Opus; Claude 4 series  
- Tool use API  
- Prompt caching (cache_control)  
- Extended thinking (Claude's reasoning mode)  
- Vision capabilities  
- Constitutional AI and why Claude behaves differently  
- Token counting API  

**Practical Implementation**  
- Build a chat app with Claude  
- Implement prompt caching and measure cost savings  
- Use extended thinking for a complex multi-step problem  
- Implement tool use with 3+ tools  

**Mini Exercise**  
> Build a "Code Review Assistant" using Claude that: reviews code, uses a tool to look up related documentation, and uses extended thinking for complex logic review.

**Interview Questions**  
- What is Constitutional AI and how does it affect Claude's behavior?  
- How does Claude's prompt caching work and when should you use it?  
- What are the trade-offs between Claude's models?  

- [ ] **Completed**

---

#### Lesson 3.1.3 — Google Gemini API Mastery

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
Google is the world's largest AI employer. Gemini is rapidly becoming an enterprise standard, especially in Google Cloud environments.

**Concepts to Learn**  
- Gemini API (Google AI Studio vs Vertex AI)  
- Models: Gemini 1.5 Pro, Gemini 2.0, Gemini Flash  
- 1M token context window — use cases  
- Grounding with Google Search  
- Native multimodal (video, audio, document)  
- Gemini embeddings  
- Function calling  
- Safety settings  

**Practical Implementation**  
- Analyze a 1-hour video with Gemini  
- Use Google Search grounding to reduce hallucinations  
- Build a multimodal AI app (text + image + audio)  

**Mini Exercise**  
> Build a "Meeting Intelligence Tool" that takes an MP4 meeting recording and returns: summary, action items, key decisions, and speaker highlights — using Gemini's native audio/video understanding.

**Interview Questions**  
- When would you choose Gemini over GPT-4o?  
- How does Google Search grounding work?  
- What can you do with a 1M token context window that you couldn't before?  

- [ ] **Completed**

---

#### Lesson 3.1.4 — OpenRouter & Model Routing

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 45 min  

**Why This Matters**  
OpenRouter provides unified API access to 100+ models. Model routing — using the cheapest model that can handle the task — is a key production optimization.

**Concepts to Learn**  
- What OpenRouter is and how it works  
- Unified API interface for all models  
- Cost-based model routing  
- Quality-based model routing  
- Fallback chains (GPT-4o fails → Claude → Gemini)  
- Latency-based routing  
- `auto` model in OpenRouter  

**Practical Implementation**  
- Set up OpenRouter as your single AI provider  
- Build a routing function: classify task → select model  
- Implement fallback chains with error handling  
- Build cost monitoring across all models  

**Mini Exercise**  
> Build a "Smart Model Router" that classifies the user's query (simple/medium/complex) and routes to the appropriate model tier, with cost tracking.

**Interview Questions**  
- How would you implement model routing in a production system?  
- What is the cost-quality trade-off of using smaller models?  
- How do you handle provider outages in a multi-model system?  

- [ ] **Completed**

---

#### Lesson 3.1.5 — Streaming APIs

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
Streaming is essential for good AI UX. No modern AI product shows a blank screen for 10 seconds. Every AI engineer must master streaming implementations.

**Concepts to Learn**  
- Server-Sent Events (SSE)  
- ReadableStream and async iteration  
- Streaming in OpenAI, Claude, Gemini  
- Streaming with function calls (delta handling)  
- Abort controllers for cancellation  
- Streaming in Next.js (Route Handlers)  
- Edge Runtime vs Node.js for streaming  

**Practical Implementation**  
- Build a streaming chat interface in React  
- Implement token-by-token rendering  
- Handle streaming with concurrent tool calls  
- Implement "Stop generating" with AbortController  

**Mini Exercise**  
> Build a streaming chat UI with: real-time token rendering, a stop button, a typing indicator, and automatic scroll-to-bottom.

**Interview Questions**  
- How does SSE differ from WebSockets for AI streaming?  
- How do you handle streaming when function calls are involved?  
- What are the Edge Runtime trade-offs for AI streaming endpoints?  

- [ ] **Completed**

---

#### Lesson 3.1.6 — Multimodal APIs

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Why This Matters**  
The future of AI is multimodal. Vision, audio, video, and document understanding are all converging into unified model APIs.

**Concepts to Learn**  
- Vision: sending images to GPT-4o, Claude, Gemini  
- Audio: speech-to-text (Whisper), text-to-speech  
- Document understanding: PDFs, spreadsheets  
- Video: Gemini native video analysis  
- Base64 vs URL for image input  
- Cost of vision tokens  
- Resolution and token count trade-offs  

**Practical Implementation**  
- Build an image analysis pipeline (upload → analyze → structured output)  
- Implement speech-to-text with Whisper  
- Build a PDF analyzer that answers questions about documents  
- Build a video summarizer using Gemini  

**Mini Exercise**  
> Build an "AI Receipt Scanner" that: accepts a photo of a receipt, extracts all line items with amounts, and outputs a JSON expense report.

**Interview Questions**  
- How do you handle large image files to minimize vision API costs?  
- What is the difference between base64 and URL image inputs?  
- How would you build a multimodal document intelligence system?  

- [ ] **Completed**

---

### Module 3.2 — AI SDKs

---

#### Lesson 3.2.1 — Vercel AI SDK

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 75 min  

**Why This Matters**  
The Vercel AI SDK is the de facto standard for AI in Next.js applications. It abstracts provider differences and provides production-ready streaming, tool calls, and generative UI.

**Concepts to Learn**  
- `streamText` / `streamObject` / `generateText` / `generateObject`  
- Provider system (OpenAI, Anthropic, Google adapters)  
- `useChat` and `useCompletion` React hooks  
- Streaming with tool calls in the UI  
- Generative UI (render React components based on AI output)  
- `DataStreamResponse` for custom streaming  
- Middleware (logging, rate limiting, auth)  

**Practical Implementation**  
- Build a full chat app with Vercel AI SDK in <1 hour  
- Implement tool calls that render custom UI components  
- Build generative UI (AI outputs a stock chart component)  
- Add logging middleware  

**Mini Exercise**  
> Build a "Smart Dashboard" where AI can call tools to: search a database, calculate metrics, and render appropriate chart components in the UI.

**Interview Questions**  
- How does the Vercel AI SDK handle provider differences?  
- What is generative UI and when would you use it?  
- How does `streamObject` handle partial JSON while streaming?  

- [ ] **Completed**

---

#### Lesson 3.2.2 — LangChain (Where It Matters)

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
LangChain is controversial but widely used in enterprise. You need to know it, its strengths, and its limitations — particularly where it over-engineers simple solutions.

**Concepts to Learn**  
- LangChain components: Models, Prompts, Chains, Memory, Agents  
- LCEL (LangChain Expression Language)  
- When LangChain adds value vs when it adds complexity  
- LangSmith for observability  
- Document loaders and text splitters  
- LangChain vs Vercel AI SDK trade-offs  
- LangGraph (separate lesson in Phase 6)  

**Practical Implementation**  
- Build a RAG pipeline using LangChain  
- Set up LangSmith observability  
- Re-implement the same RAG pipeline without LangChain — compare complexity  

**Mini Exercise**  
> Build the same "Document Q&A" feature twice: once with LangChain, once without. Document the trade-offs in a README.

**Interview Questions**  
- When would you use LangChain vs building your own pipeline?  
- What is LangSmith and why is observability critical in AI systems?  
- What are the criticisms of LangChain and do you agree?  

- [ ] **Completed**

---

### Module 3.3 — APIs & SDKs Checkpoint

- [ ] Can call OpenAI, Claude, and Gemini APIs fluently  
- [ ] Can implement streaming with proper UX (cancel, scroll, indicators)  
- [ ] Can handle multimodal inputs (image, audio, document)  
- [ ] Can build production apps with Vercel AI SDK  
- [ ] Understands when to use LangChain vs rolling your own  

---

## Phase 4 — Retrieval-Augmented Generation (RAG)

> **Duration:** 5 weeks | **Difficulty:** Intermediate → Advanced  
> **Goal:** Build production-grade RAG systems that outperform naive implementations

---

### Module 4.1 — RAG Foundations

---

#### Lesson 4.1.1 — What is RAG and Why It Matters

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 45 min  

**Why This Matters**  
RAG is the single most commonly used AI architecture in production. It solves hallucination and stale knowledge problems. Almost every enterprise AI product uses RAG.

**Concepts to Learn**  
- RAG architecture: Retrieve → Augment → Generate  
- Why RAG beats fine-tuning for most use cases  
- When to use RAG vs fine-tuning vs long context  
- Naive RAG vs Advanced RAG vs Modular RAG  
- RAG evaluation metrics: faithfulness, relevance, groundedness  

**Practical Implementation**  
- Build a naive RAG pipeline in <50 lines of code  
- Test with and without retrieval — compare accuracy  
- Measure faithfulness using an LLM judge  

**Mini Exercise**  
> Build a "Company Docs Q&A" system with naive RAG on a set of 20 markdown documentation files.

**Interview Questions**  
- What problem does RAG solve that fine-tuning doesn't?  
- When would you choose a long context window over RAG?  
- What is the evaluation framework for a RAG system?  

- [ ] **Completed**

---

#### Lesson 4.1.2 — Chunking Strategies

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Why This Matters**  
Chunking is the most underestimated factor in RAG quality. Wrong chunk size = wrong retrieval = wrong answers.

**Concepts to Learn**  
- Fixed-size chunking (character/token based)  
- Recursive character text splitter  
- Semantic chunking (chunk by meaning, not size)  
- Sentence-level chunking  
- Document-aware chunking (respect headings, sections)  
- Small-to-big chunking (retrieve small, return large)  
- Overlapping chunks and why they help  
- Chunk size vs retrieval accuracy trade-offs  

**Practical Implementation**  
- Test 5 different chunking strategies on the same document  
- Measure retrieval accuracy for each  
- Implement semantic chunking using embeddings  
- Build a chunk visualizer tool  

**Mini Exercise**  
> Build a "Chunking Strategy Benchmarker" that tests 4 chunking methods on a 50-page PDF and ranks them by retrieval accuracy on 20 test questions.

**Interview Questions**  
- What is the optimal chunk size for a technical documentation RAG?  
- What is semantic chunking and when is it better than fixed-size?  
- How does chunk overlap affect retrieval quality?  

- [ ] **Completed**

---

#### Lesson 4.1.3 — Embeddings for RAG

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
The quality of your embedding model determines the ceiling of your RAG system's retrieval accuracy.

**Concepts to Learn**  
- Embedding model selection: text-embedding-3-large vs small  
- OpenAI vs Cohere vs open-source embeddings (BGE, E5)  
- Embedding dimensions and trade-offs  
- Matryoshka embeddings (adaptive dimensions)  
- Domain-specific embedding fine-tuning  
- Batch embedding for efficiency  
- Storing and updating embeddings  

**Practical Implementation**  
- Compare text-embedding-3-small vs large on a retrieval benchmark  
- Compare OpenAI embeddings vs a free open-source model  
- Batch-embed 1000 documents efficiently  

**Mini Exercise**  
> Build an embedding pipeline that: reads 100 Markdown files, chunks them, generates embeddings in batches of 100, and stores them with metadata.

**Interview Questions**  
- How do you choose an embedding model for production?  
- What are Matryoshka embeddings and why do they matter?  
- When would you fine-tune an embedding model?  

- [ ] **Completed**

---

#### Lesson 4.1.4 — Retrieval Strategies

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
Most RAG systems fail not at generation but at retrieval. Advanced retrieval is what separates amateur from production-grade RAG.

**Concepts to Learn**  
- Similarity search (cosine, dot product)  
- Top-K vs threshold-based retrieval  
- Multi-query retrieval (rewrite query N ways)  
- HyDE (Hypothetical Document Embedding)  
- Parent-child retrieval (small chunks → return parent)  
- Step-back prompting for retrieval  
- Contextual compression  
- Lost-in-the-middle mitigation in final context  

**Practical Implementation**  
- Implement multi-query retrieval  
- Implement HyDE retrieval  
- Compare naive vs multi-query vs HyDE accuracy  
- Build contextual compression  

**Mini Exercise**  
> Build a retrieval system that uses 3 different strategies, votes on the top 5 results, and returns the consensus answer.

**Interview Questions**  
- What is HyDE and when would you use it?  
- How does multi-query retrieval improve accuracy?  
- What is the "lost in the middle" problem in RAG?  

- [ ] **Completed**

---

#### Lesson 4.1.5 — Re-ranking

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Why This Matters**  
Re-ranking is the step that most dramatically improves RAG quality with minimal extra cost. It's used in production at almost every AI company.

**Concepts to Learn**  
- Why initial retrieval is noisy  
- Cross-encoder re-ranking vs bi-encoder  
- Cohere Rerank API  
- Jina Reranker  
- ColBERT-based re-ranking  
- MMR (Maximal Marginal Relevance) for diversity  
- Fusion re-ranking (RRF — Reciprocal Rank Fusion)  
- Cost-quality trade-offs of re-ranking  

**Practical Implementation**  
- Implement Cohere Rerank in a RAG pipeline  
- Compare retrieval quality before/after re-ranking (20 test questions)  
- Implement Reciprocal Rank Fusion across multiple retrievers  

**Mini Exercise**  
> Add a re-ranking layer to your RAG system from Lesson 4.1.1 and measure the accuracy improvement on 20 questions.

**Interview Questions**  
- Why is re-ranking necessary even with good embedding search?  
- What is the difference between bi-encoder and cross-encoder re-ranking?  
- How do you balance re-ranking cost vs quality improvement?  

- [ ] **Completed**

---

#### Lesson 4.1.6 — Hybrid Search

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Why This Matters**  
Semantic search alone fails on exact terms (product codes, names, IDs). Hybrid search combines the best of both worlds and is used in 90% of production RAG systems.

**Concepts to Learn**  
- BM25 keyword search (how it works)  
- Semantic vector search  
- Hybrid search: combine BM25 + vector  
- Reciprocal Rank Fusion (RRF) for merging results  
- Alpha parameter tuning  
- When keyword search beats semantic search  
- Weaviate, Pinecone, pgvector hybrid search support  

**Practical Implementation**  
- Implement BM25 with Elasticsearch or Typesense  
- Combine with vector search results using RRF  
- Tune alpha parameter on a benchmark dataset  

**Mini Exercise**  
> Build a hybrid search system for a product catalog with 1000 items. Test cases where exact match beats semantic (SKU lookup) and vice versa.

**Interview Questions**  
- When would pure semantic search fail?  
- How does Reciprocal Rank Fusion work?  
- What alpha parameter would you use for a technical documentation search?  

- [ ] **Completed**

---

#### Lesson 4.1.7 — Metadata Filtering

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
Without metadata filtering, every query searches your entire database. At scale, this is slow and inaccurate. Filtering is how production RAG systems achieve precision.

**Concepts to Learn**  
- Attaching metadata to vectors (date, category, author, source)  
- Pre-filtering vs post-filtering  
- Dynamic metadata extraction from user queries  
- Metadata-aware retrieval ("find Q3 2024 finance docs")  
- Metadata schema design for RAG  
- Multi-tenant RAG with user/org metadata isolation  

**Practical Implementation**  
- Add metadata to all your chunks (source, date, category, section)  
- Implement metadata extraction from user queries with an LLM  
- Build a multi-tenant RAG where users only see their org's data  

**Mini Exercise**  
> Build a "Time-Aware RAG" that automatically extracts date ranges from queries ("last quarter", "this year") and filters documents accordingly.

**Interview Questions**  
- How do you design metadata schemas for enterprise RAG?  
- How would you implement multi-tenant document isolation in RAG?  
- What is the difference between pre-filter and post-filter metadata?  

- [ ] **Completed**

---

#### Lesson 4.1.8 — Production RAG Architecture

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 120 min  

**Why This Matters**  
This lesson brings everything together into a production-grade RAG architecture that could run at a real company.

**Concepts to Learn**  
- RAG pipeline architecture diagram  
- Ingestion pipeline: crawl → parse → chunk → embed → store  
- Query pipeline: understand → filter → retrieve → re-rank → generate  
- Document update strategies (full re-index vs incremental)  
- RAG caching (query → result cache)  
- Fallback strategies  
- RAG observability: trace every retrieval  
- RAG evaluation in CI/CD  

**Practical Implementation**  
- Build a full production RAG system with all components  
- Add observability with LangSmith or Langfuse  
- Implement a document update pipeline  
- Run evals in GitHub Actions on every prompt change  

**Mini Exercise**  
> Design and build a "RAG System for a 100-person Company's Internal Knowledge Base" — handle ingestion, retrieval, multi-turn conversation, and source citations.

**Interview Questions**  
- Design a RAG system for 10 million documents.  
- How do you handle document updates without full re-indexing?  
- How do you add observability to every RAG query?  

- [ ] **Completed**

---

## Phase 5 — Vector Databases

> **Duration:** 3 weeks | **Difficulty:** Intermediate → Advanced  
> **Goal:** Master production vector storage and retrieval systems

---

### Module 5.1 — Vector Database Deep Dive

---

#### Lesson 5.1.1 — Vector Database Fundamentals

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Concepts to Learn**  
- HNSW (Hierarchical Navigable Small World) — how vector search indexes work  
- ANN (Approximate Nearest Neighbor) vs exact search  
- Recall vs latency trade-off  
- Indexing strategies: Flat, IVF, HNSW, PQ  
- Vector database vs traditional database  
- Persistence, backups, and scaling  

- [ ] **Completed**

---

#### Lesson 5.1.2 — pgvector (PostgreSQL)

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 75 min  

**Concepts to Learn**  
- pgvector extension setup  
- Creating vector columns  
- Similarity search with `<->`, `<#>`, `<=>` operators  
- Indexing with IVFFlat and HNSW  
- Hybrid search with full-text + vector  
- When to choose pgvector over dedicated vector DBs  
- Supabase pgvector in production  

**Mini Exercise**  
> Build a product recommendation engine using pgvector and Supabase with <100ms query latency.

- [ ] **Completed**

---

#### Lesson 5.1.3 — Pinecone

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Concepts to Learn**  
- Pinecone architecture (serverless vs pod-based)  
- Namespaces for multi-tenancy  
- Metadata filtering  
- Hybrid search in Pinecone  
- Pinecone Inference API  
- Cost optimization at scale  

**Mini Exercise**  
> Migrate the pgvector RAG system from Lesson 4.1.8 to Pinecone and compare query latency.

- [ ] **Completed**

---

#### Lesson 5.1.4 — Weaviate & Chroma

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Concepts to Learn**  
- Weaviate: schema-based, hybrid search, modules  
- Weaviate generative search (built-in LLM integration)  
- Chroma: local development, in-memory mode  
- When to use Chroma (prototyping) vs Weaviate (production)  
- Open-source deployment trade-offs  

**Mini Exercise**  
> Build a local RAG prototype with Chroma, then migrate to Weaviate for production.

- [ ] **Completed**

---

#### Lesson 5.1.5 — Vector DB at Scale

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 90 min  

**Concepts to Learn**  
- Scaling to 1B+ vectors  
- Sharding strategies  
- Quantization (PQ, SQ) for memory reduction  
- Multi-region deployments  
- Cost modeling: memory vs latency vs accuracy  
- When to self-host vs managed service  

**Mini Exercise**  
> Design a vector database architecture for a 10M document legal research platform with strict data residency requirements.

- [ ] **Completed**

---

## Phase 6 — AI Agents & Agentic Systems

> **Duration:** 7 weeks | **Difficulty:** Advanced → Staff  
> **Goal:** Build reliable, production-ready AI agent systems

---

### Module 6.1 — Agent Fundamentals

---

#### Lesson 6.1.1 — What is an AI Agent?

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
Agents are the next evolution of AI products. Every major company is moving from "chatbot" to "agent" architectures.

**Concepts to Learn**  
- Agents vs chatbots vs pipelines  
- The agent loop: Perceive → Think → Act → Observe  
- ReAct framework (Reason + Act)  
- Agency spectrum: simple tool use → fully autonomous  
- When agents are overkill vs when they're necessary  

- [ ] **Completed**

---

#### Lesson 6.1.2 — Agent Memory Systems

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
Memory is what makes agents useful over time. Without memory, every interaction starts from zero.

**Concepts to Learn**  
- **Sensory memory:** Current context window  
- **Short-term memory:** In-context working memory  
- **Long-term memory:** External storage (vector DB, SQL)  
- **Procedural memory:** Skills/tools the agent knows  
- Memory retrieval strategies  
- Memory compression (summarize old context)  
- Memory management in multi-turn conversations  

**Practical Implementation**  
- Build a conversational agent with long-term memory using pgvector  
- Implement memory retrieval: "What did we discuss last week about X?"  
- Implement context window compression when conversation gets long  

**Mini Exercise**  
> Build a "Personal Research Assistant" that remembers your research topics, past findings, and can answer questions about previous sessions.

- [ ] **Completed**

---

#### Lesson 6.1.3 — Agent Tool Design

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
The tools you give an agent define what it can accomplish. Well-designed tools lead to reliable agents. Poorly designed tools lead to agent failures.

**Concepts to Learn**  
- Tool design principles: single responsibility, clear descriptions  
- Why tool descriptions matter as much as tool code  
- Atomic vs composite tools  
- Error handling in tools  
- Tool versioning  
- Rate-limiting tools  
- Human-in-the-loop tools  

**Practical Implementation**  
- Build a tool library with 10+ well-documented tools  
- Test tool selection accuracy: does the agent pick the right tool?  
- Implement a "confirm before executing" tool pattern  

**Mini Exercise**  
> Design and implement a 10-tool library for a "Sales Research Agent" (search company, find contacts, enrich data, draft emails, log to CRM, schedule follow-up).

- [ ] **Completed**

---

#### Lesson 6.1.4 — Agent Planning & Reasoning

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 90 min  

**Concepts to Learn**  
- Plan-and-execute pattern  
- Task decomposition  
- Dynamic re-planning when steps fail  
- Reflection and self-critique patterns  
- MCTS (Monte Carlo Tree Search) for planning  
- Why agents hallucinate plans  

**Mini Exercise**  
> Build a "Project Planner Agent" that takes a goal, creates a multi-step plan, executes each step, reflects on results, and adjusts the plan dynamically.

- [ ] **Completed**

---

#### Lesson 6.1.5 — Multi-Agent Systems

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 120 min  

**Why This Matters**  
Multi-agent systems are becoming the standard architecture for complex AI workflows. Every senior AI engineer needs to know how to design them.

**Concepts to Learn**  
- Orchestrator → Sub-agent pattern  
- Peer-to-peer agent communication  
- Agent specialization vs generalization  
- Shared memory vs isolated memory  
- Inter-agent messaging protocols  
- Failure handling in multi-agent systems  
- Observability across agent chains  

**Practical Implementation**  
- Build a 3-agent system: Planner + Executor + Reviewer  
- Implement agent handoff protocols  
- Add observability to see every inter-agent message  

**Mini Exercise**  
> Build a "Research → Write → Fact-Check" multi-agent pipeline where three specialized agents collaborate to produce a verified article.

- [ ] **Completed**

---

### Module 6.2 — Agent Frameworks

---

#### Lesson 6.2.1 — LangGraph

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 120 min  

**Why This Matters**  
LangGraph is the industry standard for stateful, graph-based agent workflows. It's used at major companies and is becoming a hiring signal.

**Concepts to Learn**  
- Graph-based agent architecture (nodes + edges)  
- State management in LangGraph  
- Conditional edges (dynamic routing)  
- Loops and cycles in graphs  
- Human-in-the-loop checkpoints  
- LangGraph persistence  
- Streaming agent steps  

**Practical Implementation**  
- Build a ReAct agent in LangGraph  
- Build a multi-agent workflow with LangGraph  
- Implement human approval checkpoints  
- Deploy LangGraph agent to LangGraph Cloud  

**Mini Exercise**  
> Build a "Software Engineer Agent" in LangGraph that: reads requirements → writes code → runs tests → fixes failures → submits PR.

- [ ] **Completed**

---

#### Lesson 6.2.2 — CrewAI

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Concepts to Learn**  
- Crew, Agent, Task, Process abstractions  
- Sequential vs hierarchical vs parallel processes  
- Crew memory and knowledge  
- Custom tools in CrewAI  
- When to use CrewAI vs LangGraph  

**Mini Exercise**  
> Build a "Content Marketing Crew" with agents: Market Researcher, Content Writer, SEO Editor, and Quality Reviewer.

- [ ] **Completed**

---

#### Lesson 6.2.3 — AutoGen / AG2

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Concepts to Learn**  
- AutoGen conversation patterns  
- User proxy vs AI proxy agents  
- Group chat for multi-agent  
- Code execution capabilities  
- AutoGen vs LangGraph trade-offs  

**Mini Exercise**  
> Build a "Data Analysis Team" where agents debate the best approach before writing and executing Python analysis code.

- [ ] **Completed**

---

#### Lesson 6.2.4 — Building Agents Without Frameworks

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 120 min  

**Why This Matters**  
Every senior engineer must know how to build agents from scratch. Frameworks hide complexity that you need to understand for debugging.

**Concepts to Learn**  
- Pure TypeScript/Python agent loop  
- Manual tool calling and result handling  
- State machine for agent behavior  
- When to NOT use a framework  

**Mini Exercise**  
> Build a full ReAct agent in pure TypeScript without any framework in <200 lines. Then explain what LangGraph adds on top.

- [ ] **Completed**

---

## Phase 7 — Model Context Protocol (MCP)

> **Duration:** 4 weeks | **Difficulty:** Advanced → Staff  
> **Goal:** Master MCP — the emerging standard for AI tool integration

---

### Module 7.1 — MCP Fundamentals

---

#### Lesson 7.1.1 — What is MCP?

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Why This Matters**  
MCP (Model Context Protocol) is Anthropic's open standard for connecting AI to data sources and tools. It's rapidly becoming the industry standard. Claude.ai, Cursor, and many AI products now use MCP.

**Concepts to Learn**  
- What MCP is (open protocol for AI ↔ tool communication)  
- MCP vs function calling (protocol vs API)  
- MCP clients (Claude.ai, Cursor, Claude Code)  
- MCP servers (tools + resources)  
- Stdio vs SSE transport  
- MCP primitives: Resources, Tools, Prompts, Sampling  

- [ ] **Completed**

---

#### Lesson 7.1.2 — Building MCP Servers

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 120 min  

**Why This Matters**  
Building MCP servers is a highly valuable skill. Every company will need custom MCP servers to connect their internal tools to AI assistants.

**Concepts to Learn**  
- MCP SDK (TypeScript and Python)  
- Defining tools in an MCP server  
- Exposing resources (files, databases)  
- Prompt templates  
- Error handling  
- Authentication in MCP servers  

**Practical Implementation**  
- Build an MCP server for GitHub (list repos, read files, create issues)  
- Build an MCP server for a PostgreSQL database  
- Build an MCP server for internal company tools  

**Mini Exercise**  
> Build a "Jira MCP Server" that exposes: list issues, create issue, update issue, add comment — and connect it to Claude.ai.

- [ ] **Completed**

---

#### Lesson 7.1.3 — MCP Security & Production Architecture

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 90 min  

**Concepts to Learn**  
- Authentication: OAuth, API keys, JWT in MCP  
- Authorization: what tools should the AI be allowed to call?  
- MCP server sandboxing  
- Remote MCP servers (SSE transport)  
- Multi-tenant MCP servers  
- MCP server registry and discovery  
- Audit logging for MCP tool calls  

**Mini Exercise**  
> Design a multi-tenant MCP server for a SaaS product where each tenant's AI assistant only has access to their own data.

- [ ] **Completed**

---

## Phase 8 — AI Security & Safety

> **Duration:** 3 weeks | **Difficulty:** Advanced  
> **Goal:** Build secure, safe, production-grade AI systems

---

### Module 8.1 — AI Security

---

#### Lesson 8.1.1 — Prompt Injection Attacks & Defenses

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 90 min  

**Concepts to Learn**  
- Direct prompt injection  
- Indirect prompt injection (from documents, emails, web pages)  
- Prompt injection in agents (highest risk)  
- Defense: input sanitization, output validation, sandboxing  
- LLM firewalls (LlamaGuard, Azure AI Content Safety)  
- Canary tokens for detecting extraction attacks  

**Mini Exercise**  
> Red-team a simple AI assistant with 10 different injection techniques. Document which succeed and build defenses for each.

- [ ] **Completed**

---

#### Lesson 8.1.2 — PII Protection & Data Privacy

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Concepts to Learn**  
- PII detection before sending to AI APIs  
- Data anonymization techniques  
- Presidio (Microsoft) for PII detection  
- GDPR/CCPA compliance in AI systems  
- Data retention policies  
- On-premise vs cloud AI for sensitive data  

**Mini Exercise**  
> Build a PII detection middleware that strips names, emails, phone numbers, and SSNs before sending data to any AI API.

- [ ] **Completed**

---

#### Lesson 8.1.3 — Guardrails & Content Safety

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Concepts to Learn**  
- Guardrails AI framework  
- Input guardrails (validate before sending to LLM)  
- Output guardrails (validate after receiving from LLM)  
- Topic restrictions  
- Toxic content detection  
- LlamaGuard  
- OpenAI Moderation API  
- Custom content filters  

**Mini Exercise**  
> Build a production guardrails layer for a customer service bot: blocks competitor mentions, off-topic queries, and toxic content.

- [ ] **Completed**

---

#### Lesson 8.1.4 — AI Governance & Compliance

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 90 min  

**Concepts to Learn**  
- EU AI Act implications for AI engineers  
- AI audit trails  
- Model cards and documentation  
- Bias detection and mitigation  
- Fairness metrics  
- AI incident response  
- Responsible AI frameworks  

- [ ] **Completed**

---

## Phase 9 — AI System Design

> **Duration:** 5 weeks | **Difficulty:** Staff  
> **Goal:** Design AI systems that scale to millions of users

---

### Module 9.1 — AI Architecture Patterns

---

#### Lesson 9.1.1 — AI Application Architecture Patterns

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 120 min  

**Why This Matters**  
This is the most important differentiator for senior/staff AI engineering interviews.

**Concepts to Learn**  
- Simple LLM call vs RAG vs Agent vs Multi-agent  
- When to use each pattern  
- Orchestration layer design  
- API gateway for AI  
- Circuit breakers for AI calls  
- Fallback chains  
- Caching strategies (semantic caching with GPTCache)  

**Mini Exercise**  
> Design the architecture for an "Enterprise AI Copilot" that serves 10,000 employees with personalized, role-based AI assistance.

- [ ] **Completed**

---

#### Lesson 9.1.2 — AI Cost Optimization at Scale

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 90 min  

**Concepts to Learn**  
- Cost per query calculation  
- Prompt caching ROI  
- Semantic caching (cache similar queries)  
- Model routing (cheap first, expensive as fallback)  
- Batch processing for non-real-time use cases  
- Output length optimization  
- Per-user cost budgets  

**Mini Exercise**  
> Design a cost optimization system that reduces AI API costs by 60% for a product with 100K daily active users.

- [ ] **Completed**

---

#### Lesson 9.1.3 — AI Observability & Monitoring

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Concepts to Learn**  
- Tracing AI calls (LangSmith, Langfuse, Helicone, Arize)  
- Metrics: latency, cost, error rate, user satisfaction  
- LLM-specific monitoring: token usage, model performance  
- Alerting: latency spikes, cost anomalies  
- A/B testing AI features  
- Drift detection (model behavior changing over time)  

**Mini Exercise**  
> Set up full observability for a RAG system: trace every query, measure latency percentiles, alert on errors, track cost per user.

- [ ] **Completed**

---

#### Lesson 9.1.4 — Scalability & Performance

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 120 min  

**Concepts to Learn**  
- Horizontal scaling of AI services  
- Connection pooling for AI APIs  
- Queue-based processing for agent tasks  
- Load balancing across multiple API keys  
- Timeout strategies for long AI tasks  
- Async processing with webhooks  
- Global deployment for low-latency  

**Mini Exercise**  
> Design a system that can handle 10,000 simultaneous AI requests with <2s p95 latency.

- [ ] **Completed**

---

#### Lesson 9.1.5 — AI System Design Interview Practice

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 120 min  

**System Design Problems to Practice**  
1. Design a ChatGPT-like product  
2. Design a code review AI for GitHub (Copilot-style)  
3. Design an enterprise knowledge base AI  
4. Design an AI customer support system  
5. Design a real-time AI translation service  
6. Design an AI content moderation system  
7. Design an AI-powered search engine  
8. Design a multi-tenant RAG platform  

- [ ] **Completed**

---

## Phase 10 — AI Product Engineering

> **Duration:** 7 weeks | **Difficulty:** Intermediate → Advanced  
> **Goal:** Build polished, production-quality AI products

---

### Module 10.1 — AI Chat Applications

---

#### Lesson 10.1.1 — AI Chat Interface Design & Engineering

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 90 min  

**Concepts to Learn**  
- Chat message architecture (role, content, metadata)  
- Streaming UI patterns  
- Message branching (regenerate, edit)  
- Multi-modal message handling (text + images)  
- Conversation history management  
- Chat context window management  
- Conversation persistence  

**Mini Exercise**  
> Build a production-quality chat interface with: streaming, message editing, regeneration, copy, like/dislike, and conversation history.

- [ ] **Completed**

---

#### Lesson 10.1.2 — Voice AI

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Concepts to Learn**  
- Speech-to-text: Whisper API, Deepgram  
- Text-to-speech: OpenAI TTS, ElevenLabs  
- Real-time voice: WebRTC, audio streams  
- Voice activity detection (VAD)  
- Latency targets for voice AI (<300ms)  
- OpenAI Realtime API  
- Voice AI UX patterns  

**Mini Exercise**  
> Build a voice AI assistant that: accepts microphone input, transcribes it, sends to AI, and streams the audio response back.

- [ ] **Completed**

---

#### Lesson 10.1.3 — AI Copilots & Inline AI

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Concepts to Learn**  
- Inline AI (like GitHub Copilot in editors)  
- Context extraction from user's current work  
- AI suggestions UI patterns  
- Accepting/rejecting AI suggestions  
- Ghost text pattern  
- Right-click AI actions  
- Slash commands  

**Mini Exercise**  
> Build an "AI Writing Copilot" for a text editor with: inline completions, paragraph rewrite, tone adjustment, and grammar check.

- [ ] **Completed**

---

#### Lesson 10.1.4 — AI Search

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Concepts to Learn**  
- AI-powered search vs keyword search  
- Query understanding and expansion  
- Search result re-ranking with AI  
- Answer synthesis from multiple results  
- Perplexity-style AI search  
- Citation and source display  
- Search with multi-modal results  

**Mini Exercise**  
> Build a "Perplexity-clone" for a niche domain (e.g., medical research, legal docs) with web search + AI answer synthesis + citations.

- [ ] **Completed**

---

#### Lesson 10.1.5 — AI UX Patterns

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
As a senior frontend engineer, AI UX is your superpower. This is where your existing skills compound with AI.

**Concepts to Learn**  
- Progressive disclosure of AI actions  
- Confidence indicators  
- Source citations and explainability  
- Loading states for AI (not just spinners)  
- Error states ("AI couldn't help with this")  
- Undo/redo for AI actions  
- Human-in-the-loop UI patterns  
- AI suggestions vs AI commands  
- Streaming text animation  
- Generative UI patterns  

**Mini Exercise**  
> Build a "Component Library for AI UX" — 10 reusable components: streaming text, confidence badge, source citation, AI thinking indicator, accept/reject buttons, etc.

- [ ] **Completed**

---

#### Lesson 10.1.6 — AI Workflows & Automation

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 120 min  

**Concepts to Learn**  
- AI workflow orchestration  
- Trigger → Process → Action patterns  
- n8n / Zapier-style AI workflows  
- Webhook-driven AI workflows  
- Long-running AI tasks (async)  
- AI workflow monitoring  
- Human approval in workflows  

**Mini Exercise**  
> Build an "AI Email Triage System" that: reads incoming emails → classifies urgency → drafts responses → asks for human approval → sends.

- [ ] **Completed**

---

#### Lesson 10.1.7 — Enterprise AI Applications

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 120 min  

**Concepts to Learn**  
- Enterprise AI requirements: SSO, audit logs, data residency  
- Role-based AI access control  
- Multi-tenant AI architectures  
- Enterprise RAG with access control  
- AI governance features  
- Integration with enterprise tools (Salesforce, SAP, ServiceNow)  
- Enterprise AI pricing models  

**Mini Exercise**  
> Design and prototype an "Enterprise AI Assistant" with: role-based access, department-specific knowledge bases, audit logging, and SSO integration.

- [ ] **Completed**

---

## Phase 11 — AI Deployment & MLOps

> **Duration:** 5 weeks | **Difficulty:** Advanced  
> **Goal:** Deploy, monitor, and maintain AI systems in production

---

### Module 11.1 — AI Deployment

---

#### Lesson 11.1.1 — Containerizing AI Applications

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Concepts to Learn**  
- Docker for AI apps  
- Multi-stage builds for AI  
- GPU passthrough in Docker  
- Environment variable management for API keys  
- Docker Compose for local AI stacks  

- [ ] **Completed**

---

#### Lesson 11.1.2 — Serverless AI Deployment

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Concepts to Learn**  
- Vercel Edge Functions for AI  
- AWS Lambda for AI endpoints  
- Cloudflare Workers AI  
- Cold start issues with AI  
- Streaming in serverless (limitations)  
- Cost comparison: serverless vs containers  

- [ ] **Completed**

---

#### Lesson 11.1.3 — Local LLMs & Edge AI

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 90 min  

**Why This Matters**  
Local LLMs are critical for: privacy, offline capability, cost reduction, and regulated industries.

**Concepts to Learn**  
- Ollama for local LLM serving  
- llama.cpp for inference  
- Model quantization (Q4, Q8) for edge devices  
- LM Studio for local development  
- WebLLM (LLMs in browser)  
- Small Language Models: Phi-3, Mistral 7B, Llama 3.1 8B  
- When to use local vs cloud models  

**Mini Exercise**  
> Build a fully offline AI assistant using Ollama + llama3 that runs locally with no API calls.

- [ ] **Completed**

---

#### Lesson 11.1.4 — GPU Basics for AI Engineers

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Concepts to Learn**  
- Why GPUs for AI (parallelism)  
- VRAM requirements for different models  
- GPU cloud providers: Lambda Labs, RunPod, Vast.ai  
- When you need a GPU vs CPU inference  
- GPU cost estimation for production  

- [ ] **Completed**

---

#### Lesson 11.1.5 — Production Monitoring for AI

- **Difficulty:** ⭐⭐⭐⭐ Staff  
- **Time:** 90 min  

**Concepts to Learn**  
- Langfuse (open-source LLM observability)  
- Helicone for usage analytics  
- Arize for ML monitoring  
- Custom metrics for AI  
- Real user monitoring for AI features  
- Cost tracking per user/feature  
- Automatic alerts on quality degradation  

**Mini Exercise**  
> Set up production monitoring for an AI application: track latency, cost, error rate, and user satisfaction score.

- [ ] **Completed**

---

## Phase 12 — Latest AI Ecosystem

> **Duration:** 5 weeks | **Difficulty:** Intermediate → Advanced  
> **Goal:** Stay current with the rapidly evolving AI engineering landscape

---

### Module 12.1 — Emerging AI Technologies

---

#### Lesson 12.1.1 — AI Coding Assistants & AI IDEs

- **Difficulty:** ⭐ Beginner  
- **Time:** 45 min  

**Concepts to Learn**  
- GitHub Copilot: context, inline completions, chat  
- Cursor IDE: Composer, agent mode, rules  
- Windsurf: Cascade AI  
- Claude Code: terminal-based AI coding  
- Devin, SWE-agent: fully autonomous coding  
- Effective use patterns for AI coding tools  

**Mini Exercise**  
> Configure Cursor with a `.cursorrules` file for an AI engineering project. Use Composer to build a complete RAG pipeline.

- [ ] **Completed**

---

#### Lesson 12.1.2 — AI Browsers & Computer Use

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Concepts to Learn**  
- Claude Computer Use API  
- Browser automation with AI (Playwright + AI)  
- Web scraping with AI vision  
- AI form filling  
- UI automation use cases  
- Limitations and reliability challenges  

**Mini Exercise**  
> Build an "AI Web Researcher" that uses browser automation to gather information from multiple websites and synthesizes a report.

- [ ] **Completed**

---

#### Lesson 12.1.3 — Model Routing & AI Gateway

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 60 min  

**Concepts to Learn**  
- AI gateway pattern (single endpoint, multiple providers)  
- PortKey, LiteLLM as AI gateways  
- Intelligent routing: by cost, latency, quality  
- Failover and redundancy  
- Load balancing across providers  
- Rate limit management  

**Mini Exercise**  
> Build a production AI gateway that routes between 3 providers based on query complexity, with automatic failover and cost tracking.

- [ ] **Completed**

---

#### Lesson 12.1.4 — Small Language Models (SLMs)

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Concepts to Learn**  
- Why SLMs matter (cost, latency, privacy, edge)  
- Leading SLMs: Phi-4, Mistral 7B, Llama 3.1 8B, Qwen 2.5  
- Distillation — how SLMs are created from large models  
- Use cases for SLMs vs LLMs  
- Fine-tuning SLMs for specific tasks  
- Evaluating SLMs for your use case  

- [ ] **Completed**

---

#### Lesson 12.1.5 — AI Automation & Workflow Tools

- **Difficulty:** ⭐⭐ Intermediate  
- **Time:** 60 min  

**Concepts to Learn**  
- n8n (open-source workflow automation with AI)  
- Make (formerly Integromat)  
- Zapier AI  
- AI agents in no-code platforms  
- When automation tools beat custom code  
- Building AI workflows for non-developers  

- [ ] **Completed**

---

#### Lesson 12.1.6 — AI Governance & The Future

- **Difficulty:** ⭐⭐⭐ Advanced  
- **Time:** 75 min  

**Concepts to Learn**  
- EU AI Act: risk categories, compliance requirements  
- Model cards and documentation standards  
- Responsible AI development  
- AI safety research (conceptual) — alignment, RLHF  
- Future model capabilities prediction  
- AI regulation trends globally  
- How to future-proof your AI engineering skills  

- [ ] **Completed**

---

## 30+ Portfolio Projects

> **Arrangement:** Beginner (1–10) → Intermediate (11–20) → Advanced (21–30+)

---

### Beginner Projects (1–10)

---

#### Project 1 — AI Chat App (ChatGPT Clone)

**Objective:** Build a full-featured AI chat interface  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 1 weekend  
**Skills:** OpenAI API, streaming, React, Vercel AI SDK  

**Architecture:**
```
User → Next.js Frontend → API Route → OpenAI API
                ↓
         Streaming Response
```

**Features:**
- Streaming responses
- Conversation history
- Model selection (GPT-4o, Claude, Gemini)
- Markdown rendering
- Code syntax highlighting
- System prompt editor

**Stretch Goals:**
- Multi-modal (image upload)
- Voice input/output
- Export conversation as PDF
- Prompt library

- [ ] **Built**

---

#### Project 2 — AI PDF Chat

**Objective:** Chat with any PDF document  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 2–3 days  
**Skills:** PDF parsing, embeddings, basic RAG, pgvector  

**Architecture:**
```
PDF Upload → Parse Text → Chunk → Embed → Store in pgvector
                                              ↓
User Query → Embed Query → Similarity Search → LLM → Answer
```

**Features:**
- PDF upload and parsing
- Page-level source citations
- Streaming answers
- Multi-PDF support
- Question suggestions

**Stretch Goals:**
- Support DOCX, TXT, Markdown
- Table extraction
- Image understanding
- Shareable chat links

- [ ] **Built**

---

#### Project 3 — AI Resume Analyzer

**Objective:** AI-powered resume analysis and scoring  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 2 days  
**Skills:** Structured outputs, Zod, PDF parsing  

**Features:**
- Parse resume PDF  
- Score against job description  
- ATS keyword analysis  
- Specific improvement suggestions  
- Generate tailored cover letter

- [ ] **Built**

---

#### Project 4 — AI Email Assistant

**Objective:** AI that drafts and manages emails  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 2–3 days  
**Skills:** Gmail API, function calling, prompt engineering  

**Features:**
- Read and summarize inbox
- Draft email replies in your voice
- Priority classification
- Auto-labels
- Follow-up reminders

- [ ] **Built**

---

#### Project 5 — AI Meeting Notes Generator

**Objective:** Transcribe and analyze meetings  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 2 days  
**Skills:** Whisper API, structured outputs, summarization  

**Features:**
- Audio/video upload or recording
- Transcription with speaker labels
- Automatic summary
- Action items extraction
- Decision log
- Follow-up email draft

- [ ] **Built**

---

#### Project 6 — Token Cost Calculator Dashboard

**Objective:** Track and optimize AI API costs  
**Difficulty:** ⭐ Beginner  
**Time:** 1 day  
**Skills:** OpenAI/Claude billing APIs, React, charts  

**Features:**
- Daily/monthly cost breakdown
- Per-model cost comparison
- Token usage analytics
- Cost forecasting
- Budget alerts

- [ ] **Built**

---

#### Project 7 — AI Flashcard Generator

**Objective:** Generate study flashcards from any content  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 1–2 days  
**Skills:** Structured outputs, prompt engineering  

**Features:**
- Generate from: text, PDF, URL, YouTube transcript
- Spaced repetition algorithm
- Export to Anki
- Difficulty rating
- Wrong answer explanations

- [ ] **Built**

---

#### Project 8 — AI Writing Assistant

**Objective:** Inline AI writing copilot  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 2–3 days  
**Skills:** Streaming, React, AI UX patterns  

**Features:**
- Inline text completion
- Rephrase / Shorten / Expand
- Tone adjustment
- Grammar correction
- Continue writing

- [ ] **Built**

---

#### Project 9 — Prompt Engineering Playground

**Objective:** Tool for testing and comparing prompts  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 2 days  
**Skills:** Multi-provider API, evals, React  

**Features:**
- Test prompt across multiple models
- Side-by-side comparison
- Save prompt library
- Token count and cost display
- Eval scoring
- Prompt history

- [ ] **Built**

---

#### Project 10 — AI FAQ Bot (RAG on Documentation)

**Objective:** Answer questions using product documentation  
**Difficulty:** ⭐⭐ Beginner  
**Time:** 2–3 days  
**Skills:** RAG, embeddings, pgvector, hybrid search  

**Features:**
- Index documentation from URLs or files
- Accurate answers with source citations
- Confidence scores
- Suggested related questions
- Admin dashboard for adding docs

- [ ] **Built**

---

### Intermediate Projects (11–20)

---

#### Project 11 — AI Interview Coach

**Objective:** AI-powered mock interview platform  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1 week  
**Skills:** Voice AI, structured outputs, evaluation  

**Architecture:**
```
User Voice → Whisper → Interview AI → TTS Response
                           ↓
                    Evaluation Engine
                           ↓
                    Feedback Report
```

**Features:**
- Voice-based mock interviews
- Dynamic follow-up questions
- Real-time feedback
- STAR method scoring
- Session recording and replay
- Progress tracking

- [ ] **Built**

---

#### Project 12 — AI Customer Support Bot

**Objective:** Production-grade support bot with RAG  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1 week  
**Skills:** RAG, guardrails, handoff to human, analytics  

**Features:**
- Product knowledge RAG
- Escalation to human agent
- Ticket creation integration
- Conversation analytics
- Multi-language support
- CSAT scoring

- [ ] **Built**

---

#### Project 13 — AI Code Review Tool

**Objective:** Automated code review with AI  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1 week  
**Skills:** GitHub API, Claude API, streaming  

**Features:**
- PR analysis and review
- Security vulnerability detection
- Performance suggestions
- Code quality scoring
- Auto-fix suggestions
- GitHub Actions integration

- [ ] **Built**

---

#### Project 14 — AI Knowledge Base (Notion-style)

**Objective:** AI-powered personal knowledge management  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1–2 weeks  
**Skills:** RAG, embeddings, rich text editor, semantic search  

**Features:**
- Write and store notes
- AI-powered semantic search
- Automatic tagging and linking
- "Ask my notes" chat
- Knowledge graph visualization
- Export and import

- [ ] **Built**

---

#### Project 15 — AI Stock Research Assistant

**Objective:** AI-powered investment research tool  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1 week  
**Skills:** Tool use, web search, structured outputs, financial data APIs  

**Features:**
- Fetch live stock data
- Analyze news sentiment
- Generate research report
- Compare competitors
- DCF calculator integration
- Risk analysis

- [ ] **Built**

---

#### Project 16 — AI Social Media Manager

**Objective:** AI that creates and schedules social content  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1 week  
**Skills:** Prompt engineering, image generation, scheduling  

**Features:**
- Generate posts for LinkedIn, Twitter, Instagram
- Create matching images
- Optimal posting time suggestions
- Performance analytics
- Engagement analysis
- Brand voice customization

- [ ] **Built**

---

#### Project 17 — AI Coding Assistant (VS Code Extension)

**Objective:** Build a GitHub Copilot-like VS Code extension  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 2 weeks  
**Skills:** VS Code Extension API, inline completions, AI  

**Features:**
- Inline code completions
- Explain selected code
- Refactor with AI
- Generate tests
- Chat panel
- Context-aware suggestions

- [ ] **Built**

---

#### Project 18 — Multi-modal Image Analyzer

**Objective:** AI that analyzes and understands images deeply  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1 week  
**Skills:** Vision API, structured outputs, batch processing  

**Features:**
- Describe images in detail
- Extract text from images (OCR)
- Identify objects, people (privacy-safe)
- Compare multiple images
- Image search by semantic query
- Bulk processing

- [ ] **Built**

---

#### Project 19 — AI Language Learning App

**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1–2 weeks  
**Skills:** Voice AI, structured outputs, gamification  

**Features:**
- Conversational language practice
- Grammar correction with explanations
- Vocabulary learning with spaced repetition
- Pronunciation feedback (voice AI)
- Cultural context explanations
- Progress tracking

- [ ] **Built**

---

#### Project 20 — AI-Powered Search Engine

**Objective:** Perplexity-style AI search  
**Difficulty:** ⭐⭐⭐ Intermediate  
**Time:** 1–2 weeks  
**Skills:** Web search tool, RAG, streaming, citations  

**Features:**
- Real-time web search
- AI answer synthesis
- Source citations with links
- Follow-up questions
- Image results
- Domain filtering

- [ ] **Built**

---

### Advanced Projects (21–30+)

---

#### Project 21 — Production RAG Platform

**Objective:** Enterprise-grade RAG infrastructure  
**Difficulty:** ⭐⭐⭐⭐ Advanced  
**Time:** 3–4 weeks  

**Architecture:**
```
Ingestion:  Sources → Crawl → Parse → Chunk → Embed → Index
                                                    ↓
Query:      User → Classify → Filter → Retrieve → Rerank → Generate
                                                    ↓
Output:     Streamed Answer + Citations + Confidence + Trace ID
```

**Features:**
- Multi-format ingestion (PDF, DOCX, HTML, Markdown, CSV)
- Hybrid search (semantic + keyword)
- Re-ranking with Cohere
- Source citations with page numbers
- Multi-tenant with access control
- Full observability with Langfuse
- Eval suite in CI/CD
- Admin dashboard

- [ ] **Built**

---

#### Project 22 — AI Agent for Software Engineering

**Objective:** Autonomous coding agent  
**Difficulty:** ⭐⭐⭐⭐ Advanced  
**Time:** 3–4 weeks  
**Skills:** LangGraph, tool use, code execution, Git API  

**Features:**
- Read and understand codebase
- Implement feature from ticket description
- Write and run tests
- Fix failing tests
- Create PR with detailed description
- Handle review comments

- [ ] **Built**

---

#### Project 23 — Multi-Agent Research System

**Objective:** CrewAI-based research automation  
**Difficulty:** ⭐⭐⭐⭐ Advanced  
**Time:** 2–3 weeks  

**Agents:**
- Market Researcher → finds relevant information
- Data Analyst → interprets numbers
- Writer → creates the report
- Fact Checker → verifies claims

**Features:**
- Automated web research
- Source verification
- Structured report output
- Conflict resolution between agents
- Full audit trail

- [ ] **Built**

---

#### Project 24 — MCP Server for Internal Tools

**Objective:** Company tool integration via MCP  
**Difficulty:** ⭐⭐⭐⭐ Advanced  
**Time:** 2 weeks  

**Exposed Tools:**
- Database queries (read-only)
- JIRA issue management
- Confluence search
- GitHub repository operations
- Slack messaging
- Calendar scheduling

**Features:**
- OAuth authentication
- Per-tool authorization
- Audit logging
- Rate limiting
- Multi-tenant support

- [ ] **Built**

---

#### Project 25 — Voice AI Assistant (Full-Stack)

**Objective:** Production-grade voice AI (like Alexa, but custom)  
**Difficulty:** ⭐⭐⭐⭐ Advanced  
**Time:** 3 weeks  
**Skills:** WebRTC, OpenAI Realtime API, Deepgram, ElevenLabs  

**Features:**
- Wake word detection
- Real-time speech recognition
- AI response generation
- Natural TTS output
- Tool calling (set reminders, search, smart home)
- Custom voice and personality

- [ ] **Built**

---

#### Project 26 — AI SaaS Application (Full Product)

**Objective:** Build a complete AI SaaS product  
**Difficulty:** ⭐⭐⭐⭐⭐ Staff  
**Time:** 6–8 weeks  

**Example: "DocuMind" — AI Document Intelligence Platform**

**Tech Stack:**
- Next.js + Vercel AI SDK
- PostgreSQL + pgvector
- Stripe payments
- Auth (Clerk/NextAuth)
- Langfuse observability

**Features:**
- User auth and billing
- Document upload and processing
- AI Q&A with citations
- Sharing and collaboration
- API access
- Admin dashboard
- Usage-based billing

- [ ] **Built**

---

#### Project 27 — AI Evaluation Framework

**Objective:** Open-source AI eval tooling  
**Difficulty:** ⭐⭐⭐⭐ Advanced  
**Time:** 2–3 weeks  

**Features:**
- Define eval datasets
- Run evals against multiple models
- LLM-as-judge scoring
- Human annotation UI
- Statistical significance testing
- CI/CD integration

- [ ] **Built**

---

#### Project 28 — Real-Time AI Translation Platform

**Objective:** Live multilingual communication tool  
**Difficulty:** ⭐⭐⭐⭐ Advanced  
**Time:** 2–3 weeks  
**Skills:** WebRTC, Whisper, LLM, TTS, real-time systems  

**Features:**
- Real-time voice translation
- 50+ language pairs
- <500ms latency
- Context-aware translation
- Speaker identification
- Transcript with translation

- [ ] **Built**

---

#### Project 29 — AI Content Moderation System

**Objective:** AI-powered content safety at scale  
**Difficulty:** ⭐⭐⭐⭐ Advanced  
**Time:** 2–3 weeks  

**Features:**
- Multi-modal moderation (text, image, video)
- Real-time classification
- Custom policy engine
- Human review queue
- Appeals system
- Analytics dashboard

- [ ] **Built**

---

#### Project 30 — Enterprise AI Copilot Platform

**Objective:** Slack/Teams AI copilot for enterprise  
**Difficulty:** ⭐⭐⭐⭐⭐ Staff  
**Time:** 6–8 weeks  

**Architecture:**
```
Slack Message → AI Gateway → Intent Classification
                                    ↓
              Tool Router → [RAG | Agent | Search | Code | ...]
                                    ↓
              Response Formatter → Slack Response
```

**Features:**
- Slack/Teams integration
- Role-based AI access
- Department-specific knowledge bases
- Tool integrations (JIRA, Salesforce, GitHub)
- Usage analytics per team
- SSO + SCIM provisioning
- Audit logging

- [ ] **Built**

---

## Interview Preparation

### AI Foundations Interview Questions

**Beginner**
- What is the difference between GPT-4 and fine-tuned GPT-4?
- How does tokenization affect API costs?
- What is temperature and how do you set it for a customer support bot?
- Why do LLMs hallucinate?

**Senior Engineer**
- How would you design an eval framework for an AI assistant?
- Explain the "lost in the middle" problem and how you would mitigate it.
- What are the trade-offs between RAG and fine-tuning?
- How does prompt caching work and when should you use it?

**Staff Engineer**
- Design the evaluation strategy for migrating from GPT-4 to Claude without regressions.
- How would you detect if your deployed model has started drifting in quality?
- Design a cost-optimization system for 100K daily AI queries.

---

### Prompt Engineering Interview Questions

**Senior Engineer**
- How do you systematically improve a failing prompt?
- Design a prompt injection defense strategy for a customer-facing chatbot.
- How do you handle inconsistent JSON output from an LLM?
- What is the COSTAR framework and give an example of applying it?

**Staff Engineer**
- Design a prompt management system for a team of 20 AI engineers.
- How would you A/B test system prompt changes in production?
- Design a self-healing prompt system that detects and corrects output quality degradation.

---

### RAG System Design Questions

**Senior Engineer**
- Walk me through building a RAG system for a 10,000-page documentation site.
- How would you choose a chunk size for a legal document RAG?
- What is HyDE and when would you use it over standard retrieval?

**Staff Engineer**
- Design a RAG system for 10 million documents with <200ms P99 latency.
- How would you implement access-controlled RAG (user A cannot see user B's documents)?
- Design an incremental update strategy for a RAG system where documents change frequently.

---

### AI System Design Interview Questions

These are typical Staff Engineer interview topics:

1. **Design ChatGPT** — architecture, streaming, conversation management, safety
2. **Design GitHub Copilot** — context extraction, inline completions, latency
3. **Design a RAG platform for a legal firm** — security, access control, accuracy
4. **Design an AI customer support system** — RAG, escalation, analytics
5. **Design an AI content moderation system** — multi-modal, scale, latency
6. **Design Perplexity** — web search, synthesis, citations, streaming
7. **Design an enterprise AI copilot** — multi-tenant, SSO, integrations
8. **Design an AI code review system** — GitHub integration, latency, accuracy

---

### Agent & MCP Interview Questions

**Senior Engineer**
- What is the difference between a chatbot and an agent?
- How do you prevent an agent from taking unintended actions?
- What is MCP and why is it becoming an industry standard?

**Staff Engineer**
- Design a multi-agent system for automated software deployment.
- How would you build a reliable agent that can recover from tool failures?
- Design an MCP server with fine-grained authorization for a multi-tenant SaaS.

---

## Monthly Revision Plan

### Month 1 — Solidify Foundations

- [ ] Re-read Phase 1 notes
- [ ] Complete any unfinished Phase 1–2 projects
- [ ] Practice 5 AI system design problems
- [ ] Review tokenization and embedding concepts

### Month 2 — RAG Deep Dive

- [ ] Build one advanced RAG project from scratch
- [ ] Set up Langfuse for observability
- [ ] Test 5 different retrieval strategies
- [ ] Complete the Production RAG Platform project (Project 21)

### Month 3 — Agents & MCP

- [ ] Build one LangGraph agent
- [ ] Build one MCP server
- [ ] Complete 2 agent projects from the portfolio list
- [ ] Read and implement 3 agent papers/blog posts

### Month 4 — System Design Practice

- [ ] Practice 8 AI system design problems (1 per week + 4 in final push)
- [ ] Complete 2 advanced portfolio projects
- [ ] Mock interview with an AI engineer peer

### Month 5 — AI Product Engineering

- [ ] Build one complete AI SaaS product
- [ ] Focus on AI UX patterns
- [ ] Write a technical blog post about something you built
- [ ] Contribute to an open-source AI project

### Month 6 — Interview Sprint

- [ ] Daily leetcode-style AI engineering problems (architecture, prompts, evals)
- [ ] 2× mock system design interviews per week
- [ ] Review all module checkpoints
- [ ] Apply to target companies with polished portfolio

---

## Resources

### Books

| Title | Relevance |
|---|---|
| *Building LLM Powered Applications* — Valentina Alto | ⭐⭐⭐⭐⭐ |
| *AI Engineering* — Chip Huyen | ⭐⭐⭐⭐⭐ |
| *Designing Machine Learning Systems* — Chip Huyen | ⭐⭐⭐⭐ |
| *The Alignment Problem* — Brian Christian | ⭐⭐⭐ (context) |

### Online Courses

| Course | Provider | Relevance |
|---|---|---|
| LLM Engineering | DeepLearning.AI | ⭐⭐⭐⭐⭐ |
| Building AI Products | Fast.ai | ⭐⭐⭐⭐ |
| LangChain for LLM App Development | DeepLearning.AI | ⭐⭐⭐⭐ |
| AI Agents in LangGraph | DeepLearning.AI | ⭐⭐⭐⭐⭐ |
| Prompt Engineering for Developers | DeepLearning.AI | ⭐⭐⭐⭐ |

### Key Documentation

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic Claude Docs](https://docs.anthropic.com)
- [Google Gemini API Docs](https://ai.google.dev)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [LangChain Docs](https://python.langchain.com/docs)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [MCP Docs](https://modelcontextprotocol.io)
- [Pinecone Docs](https://docs.pinecone.io)
- [pgvector GitHub](https://github.com/pgvector/pgvector)

### Essential Newsletters & Blogs

- **The Batch** — DeepLearning.AI weekly newsletter
- **Latent Space** — AI engineering deep dives
- **One Useful Thing** — Ethan Mollick on practical AI
- **The Pragmatic Engineer** — AI in software engineering context
- **Anthropic Blog** — Model releases and safety research

### YouTube Channels

- **Andrej Karpathy** — Neural network fundamentals
- **Matt Wolfe** — AI news and tools
- **Sam Witteveen** — LangChain and practical LLM tutorials
- **1littlecoder** — Practical AI engineering tutorials

### GitHub Repositories to Study

- `openai/openai-cookbook` — OpenAI best practices
- `anthropics/anthropic-cookbook` — Anthropic best practices
- `vercel/ai` — Vercel AI SDK source
- `langchain-ai/langchain` — LangChain source
- `langchain-ai/langgraph` — LangGraph source
- `modelcontextprotocol/servers` — Official MCP servers

---

## Completion Tracker

### Overall Progress

```
Phase 1  — AI Foundations         [ ] 0/10 lessons
Phase 2  — Prompt Engineering     [ ] 0/8 lessons
Phase 3  — AI APIs & SDKs         [ ] 0/8 lessons
Phase 4  — RAG                    [ ] 0/8 lessons
Phase 5  — Vector Databases       [ ] 0/5 lessons
Phase 6  — AI Agents              [ ] 0/7 lessons
Phase 7  — MCP                    [ ] 0/3 lessons
Phase 8  — AI Security            [ ] 0/4 lessons
Phase 9  — AI System Design       [ ] 0/5 lessons
Phase 10 — AI Product Engineering [ ] 0/7 lessons
Phase 11 — AI Deployment          [ ] 0/5 lessons
Phase 12 — Latest Ecosystem       [ ] 0/6 lessons

Portfolio Projects               [ ] 0/30 built
```

---

## Final Note

> This roadmap is a living document. AI moves fast.  
> Update it as new models, APIs, and patterns emerge.  
> The fundamentals (embeddings, RAG, agents, evals) will remain stable.  
> The specific tools will change. Learn the concepts deeply.

**The best AI engineers in 2026–2035 will be those who:**
1. Ship production AI systems, not just demos
2. Can evaluate and measure AI quality rigorously  
3. Design for security, cost, and scale from day one
4. Understand both the product and the engineering layer
5. Build with any model, not just the current hot one

---

*Made with ❤️ for AI engineers who ship real products*  
*Share it, star it, update it — and build something great.*
