# 🤖 90-Day AI Product Engineer Interview Preparation Roadmap
### From Senior Frontend Engineer → AI Product Engineer
#### Target: Google · OpenAI · Anthropic · Microsoft · Meta · Amazon · NVIDIA · Stripe · Airbnb · Uber · Databricks

---

> **Complete curriculum coverage: All 12 Phases · All 77 Lessons · All 30 Portfolio Projects**
> Every topic from the original 12-18 month roadmap is covered — compressed intelligently into 90 days at 75–90 min/day.
> Zero topics removed. Zero lessons skipped. Every mini project included.

---

## 📋 Table of Contents

1. [Roadmap Philosophy](#roadmap-philosophy)
2. [How This Works in 90 Days](#how-this-works-in-90-days)
3. [Phase Overview](#phase-overview)
4. [Daily Study Structure](#daily-study-structure)
5. [Phase 1: AI Foundations (Days 1–10)](#phase-1-ai-foundations-days-110)
6. [Phase 2: Prompt Engineering (Days 11–19)](#phase-2-prompt-engineering-days-1119)
7. [Phase 3: AI APIs & SDKs (Days 20–27)](#phase-3-ai-apis--sdks-days-2027)
8. [Phase 4: RAG Systems (Days 28–37)](#phase-4-rag-systems-days-2837)
9. [Phase 5: Vector Databases (Days 38–43)](#phase-5-vector-databases-days-3843)
10. [Phase 6: AI Agents (Days 44–55)](#phase-6-ai-agents-days-4455)
11. [Phase 7: MCP Protocol (Days 56–60)](#phase-7-mcp-protocol-days-5660)
12. [Phase 8: AI Security & Safety (Days 61–65)](#phase-8-ai-security--safety-days-6165)
13. [Phase 9: AI System Design (Days 66–72)](#phase-9-ai-system-design-days-6672)
14. [Phase 10: AI Product Engineering (Days 73–81)](#phase-10-ai-product-engineering-days-7381)
15. [Phase 11: AI Deployment & MLOps (Days 82–86)](#phase-11-ai-deployment--mlops-days-8286)
16. [Phase 12: Latest AI Ecosystem (Days 87–90)](#phase-12-latest-ai-ecosystem-days-8790)
17. [30 Portfolio Projects Index](#30-portfolio-projects-index)
18. [Interview Preparation Guide](#interview-preparation-guide)
19. [Progress Tracker](#progress-tracker)

---

## Roadmap Philosophy

### How 12–18 Months Becomes 90 Days

The original roadmap spreads 77 lessons over ~56 weeks at 30–60 min/day. We compress it to 90 days at 75–90 min/day using three strategies:

**1. Parallel Learning:** Concepts that originally lived in separate weeks are studied together when they are naturally connected (e.g., embeddings + vector search on the same day).

**2. Project Integration:** All 30 portfolio projects are built as mini-exercises DURING the learning session — not as separate standalone weeks. The curriculum already includes mini exercises for each lesson; we use those to build your portfolio incrementally.

**3. Strategic Doubling:** On days where two lessons are closely related (e.g., Pinecone + Weaviate/Chroma), they are covered in one 90-minute session. No content is dropped — the same concepts, just taught back-to-back.

### Nothing Is Removed

Every lesson from the original curriculum has a dedicated day. Every mini project is built. Every interview question is practiced. The only thing that changes is the pacing — from leisurely exploration to focused sprint.

---

## How This Works in 90 Days

| Original Duration | 90-Day Approach |
|---|---|
| 77 lessons × 45–90 min | 1 lesson per day (some days 2 short lessons combined) |
| 30 projects as separate weeks | Projects built as mini-exercises within lesson days |
| Monthly revision | Weekly checkpoints + Day 90 final review |
| 30–60 min/day | 75–90 min/day |

### Lesson Coverage

| Phase | Lessons | Days Allocated | How |
|---|---|---|---|
| Phase 1: AI Foundations | 10 | 10 | 1 lesson/day |
| Phase 2: Prompt Engineering | 8 | 9 | 1 lesson/day + 1 project day |
| Phase 3: AI APIs & SDKs | 8 | 8 | 1 lesson/day |
| Phase 4: RAG | 8 | 10 | 1 lesson/day + 2 project days |
| Phase 5: Vector Databases | 5 | 6 | 1 lesson/day + 1 project day |
| Phase 6: AI Agents | 8 | 12 | 1 lesson/day + 4 project days |
| Phase 7: MCP | 3 | 5 | 1 lesson/day + 2 project days |
| Phase 8: AI Security | 4 | 5 | 1 lesson/day + 1 project day |
| Phase 9: AI System Design | 5 | 7 | 1 lesson/day + 2 practice days |
| Phase 10: AI Product Engineering | 7 | 9 | 1 lesson/day + 2 project days |
| Phase 11: AI Deployment | 5 | 5 | 1 lesson/day |
| Phase 12: Latest Ecosystem | 6 | 4 | 2 lessons combined on 3 days |
| **TOTAL** | **77** | **90** | **Complete coverage** |

---

## Phase Overview

```
╔══════════════════════════════════════════════════════════════════════╗
║ PHASE 1  │ Days  1–10  │ AI Foundations                             ║
║          │             │ How LLMs work, tokens, embeddings, evals   ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 2  │ Days 11–19  │ Prompt Engineering                         ║
║          │             │ CoT, structured outputs, tool calling,     ║
║          │             │ security, optimization                     ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 3  │ Days 20–27  │ AI APIs & SDKs                             ║
║          │             │ OpenAI, Claude, Gemini, streaming,         ║
║          │             │ multimodal, Vercel AI SDK, LangChain       ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 4  │ Days 28–37  │ Retrieval-Augmented Generation             ║
║          │             │ Chunking, embeddings, retrieval, rerank,   ║
║          │             │ hybrid search, production RAG              ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 5  │ Days 38–43  │ Vector Databases                           ║
║          │             │ HNSW, pgvector, Pinecone, Weaviate,        ║
║          │             │ scale architecture                         ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 6  │ Days 44–55  │ AI Agents & Agentic Systems                ║
║          │             │ Agent loop, memory, tools, planning,       ║
║          │             │ multi-agent, LangGraph, CrewAI, AutoGen    ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 7  │ Days 56–60  │ Model Context Protocol (MCP)               ║
║          │             │ MCP fundamentals, servers, security        ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 8  │ Days 61–65  │ AI Security & Safety                       ║
║          │             │ Injection, PII, guardrails, governance     ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 9  │ Days 66–72  │ AI System Design                           ║
║          │             │ Architecture patterns, cost, observability,║
║          │             │ scalability, design interview practice     ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 10 │ Days 73–81  │ AI Product Engineering                     ║
║          │             │ Chat apps, voice AI, copilots, search,    ║
║          │             │ AI UX, workflows, enterprise AI            ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 11 │ Days 82–86  │ AI Deployment & MLOps                      ║
║          │             │ Docker, serverless, local LLMs, GPU,       ║
║          │             │ production monitoring                      ║
╠══════════════════════════════════════════════════════════════════════╣
║ PHASE 12 │ Days 87–90  │ Latest AI Ecosystem + Final Prep           ║
║          │             │ AI coding tools, computer use, gateways,  ║
║          │             │ SLMs, automation, governance, final review ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Daily Study Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  DAILY STUDY SESSION (75–90 minutes)                            │
├─────────────────────────────────────────────────────────────────┤
│  0:00–0:05  │  Warm-up: review yesterday's key concept (1 min) │
│  0:05–0:45  │  Core lesson: theory + internals + trade-offs    │
│  0:45–1:05  │  Mini project / hands-on implementation          │
│  1:05–1:20  │  Interview Q&A practice (5–8 questions)          │
│  1:20–1:25  │  Log to GitHub + mark progress                   │
└─────────────────────────────────────────────────────────────────┘
```

### GitHub Portfolio Strategy

Every day, push to your GitHub repo:
```
ai-engineer-prep/
  ├── phase-01-foundations/
  │   ├── day-01-generative-ai/
  │   │   ├── notes.md
  │   │   ├── mini-exercise/
  │   │   └── interview-qa.md
  ├── phase-02-prompt-engineering/
  ...
```

---

# Phase 1: AI Foundations (Days 1–10)

> **Goal:** Understand how modern AI systems work at conceptual and practical level.
> Complete all 10 Lesson 1.1.x topics. Start Project 6 (Token Cost Calculator).

---

## DAY 1 — Lesson 1.1.1: What is Generative AI?

**Why it matters:** Generative AI is the foundational paradigm of 2023–2035. Every company is building on it. This is your starting point — zero assumptions.

**Study Agenda (75 min)**

- Discriminative AI vs Generative AI — the fundamental difference
- Types of generative AI: Text, Image, Code, Audio, Video, Multimodal
- Foundation Models vs Fine-tuned Models — what each means in practice
- The hierarchy: AI → ML → DL → GenAI — where LLMs fit
- Why 2023 was the inflection point — GPT-4, Claude, Gemini
- OpenAI vs Anthropic vs Google — different philosophies, same era

**Mini Project — Multi-Provider Comparison Script**
```typescript
// Build this: sends same prompt to 3 providers, prints responses side by side
async function compareProviders(prompt: string) {
  const [openai, claude, gemini] = await Promise.all([
    callOpenAI(prompt),
    callClaude(prompt),
    callGemini(prompt)
  ]);
  printSideBySide({ openai, claude, gemini });
}
```

**Expected Outcome:** Can explain GenAI to a non-technical person AND to a senior engineer. Can call 3 different AI APIs.

**GitHub Deliverable:** `day-01/notes.md` + working multi-provider script

---

**📝 Day 1 Interview Practice Questions**

1. **(Beginner | All Companies)** What is the difference between discriminative AI and generative AI? Give a concrete example of each.

2. **(Beginner | Google, Meta)** What is a foundation model? Why are they called "foundation" models?

3. **(Beginner | All Companies)** How does a language model differ from a traditional ML classifier?

4. **(Intermediate | OpenAI, Anthropic)** Why did 2022–2023 mark a step change in AI capability? What changed?

5. **(Intermediate | Google, Microsoft)** What is the difference between GPT-4o, Claude 3.5, and Gemini 1.5 Pro at a high level?

6. **(Intermediate | All Companies)** A PM asks: "Should we use AI or ML for this feature?" How do you answer?

7. **(Intermediate | Stripe, Uber)** What are the risks of building a production product on a foundation model API?

8. **(Advanced | OpenAI, Anthropic)** What is the difference between a fine-tuned model and a prompted foundation model? When would you choose each?

---

## DAY 2 — Lesson 1.1.2: How LLMs Work (Conceptual)

**Why it matters:** You don't train LLMs, but you build systems on top of them. Understanding their internals is what lets you predict failure modes, design around limitations, and make architectural decisions.

**Study Agenda (75 min)**

- Pre-training: internet-scale data, unsupervised next-token prediction
- What "predicting the next token" actually means at scale
- RLHF (Reinforcement Learning from Human Feedback) — how models become helpful
- RLAIF (RL from AI Feedback) — Anthropic's Constitutional AI approach
- What "billion parameters" means in practice — capacity, not intelligence
- Why different models have different "personalities" (training data + RLHF)
- Model capabilities benchmarks: MMLU, HumanEval, MT-Bench
- Model cards: reading and interpreting them (Claude, GPT-4o)

**Mini Project — 200-word LLM Explainer**
Write a clear explanation of "How does ChatGPT work?" for a non-technical PM. Then write a second version for a senior engineer. Compare the framing.

**Expected Outcome:** Can explain LLM training pipeline clearly. Can read a model card and extract useful engineering information.

---

**📝 Day 2 Interview Practice Questions**

1. **(Beginner | All Companies)** Explain how a large language model is trained at a high level. What data does it use?

2. **(Intermediate | Anthropic, OpenAI)** What is RLHF and why does it matter for building product-grade AI?

3. **(Intermediate | Google, Meta)** Why do different AI models have different "personalities" even when trained on similar data?

4. **(Intermediate | All Companies)** What does "100 billion parameters" mean in a practical sense? Does more always mean better?

5. **(Advanced | Anthropic)** What is Constitutional AI? How is it different from RLHF and why did Anthropic build it?

6. **(Advanced | OpenAI, Google)** What is the difference between pre-training, fine-tuning, and RLHF? At which stage does the model "learn to be helpful"?

7. **(Advanced | All Companies)** An LLM gives confident but wrong answers. What training phenomenon causes this and how do you architect around it?

8. **(Staff | All Companies)** You are evaluating whether to use GPT-4o or Claude Sonnet for a complex reasoning task. What benchmarks and criteria do you use?

---

## DAY 3 — Lesson 1.1.3: Transformers (High-Level)

**Why it matters:** The Transformer is the architecture of every modern LLM. Understanding it conceptually — not mathematically — helps you predict behavior, debug issues, and design better systems.

**Study Agenda (75 min)**

- The core insight of attention: tokens "look at" each other
- Self-attention explained without math: which words does "it" refer to?
- Multi-head attention: looking at different aspects simultaneously
- Encoder vs Decoder vs Encoder-Decoder — what each is used for
- Why GPT is decoder-only (next-token prediction)
- Positional encoding: why order matters to transformers
- Why transformers scale better than RNNs (parallelism vs sequential)
- Residual connections, layer normalization — conceptual purpose

**Mini Project — Architecture Diagram**
Draw (ASCII or tool of choice) the flow of a prompt through a transformer:
```
Input Tokens → Token Embeddings → Positional Encoding
→ [Self-Attention → FFN] × N layers → Output Logits → Softmax → Next Token
```

**Expected Outcome:** Can draw and explain the transformer pipeline. Can answer "why is GPT decoder-only?" without hesitation.

---

**📝 Day 3 Interview Practice Questions**

1. **(Intermediate | Google, OpenAI)** What is self-attention? Explain it without using math — use a sentence as an example.

2. **(Intermediate | All Companies)** Why are GPT-style models "decoder-only"? What would an encoder add?

3. **(Intermediate | Google, Meta)** What problem did transformers solve that RNNs and LSTMs couldn't handle at scale?

4. **(Intermediate | OpenAI, Anthropic)** What is positional encoding and why do transformers need it?

5. **(Advanced | Google)** What is multi-head attention? What does having multiple heads enable the model to do?

6. **(Advanced | All Companies)** Why does the transformer architecture scale so well with more data and more compute?

7. **(Advanced | OpenAI, Anthropic)** What is the "attention is all you need" claim? What does it mean for system design?

8. **(Staff | Google, Meta)** How does understanding the transformer architecture help you design better prompts and better AI systems?

---

## DAY 4 — Lesson 1.1.4: Tokens & Tokenization

**Why it matters:** Everything in LLMs is tokens. Cost, speed, context limits, and performance all depend on tokenization. This is foundational engineering knowledge.

**Study Agenda (75 min)**

- What a token is: not a word, not a character — a BPE subword unit
- Byte Pair Encoding (BPE): how tokenizers are built, examples
- Why "1 token ≈ 4 characters" in English — and why it varies
- Token costs by language: CJK and Arabic cost 2–4x more tokens per word
- Special tokens: `<|im_start|>`, `[INST]`, `<s>`, `<|eot_id|>` — what they do
- Context window = total tokens (input + output) — limits and implications
- Tokenization affects: cost, speed, context fit, and model comprehension
- `tiktoken` library for counting tokens programmatically

**Mini Project — Token Cost Calculator** *(Portfolio Project 6)*
```typescript
// Build a real token cost calculator component
interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
}

function estimateCost(
  prompt: string,
  model: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-5-sonnet' | 'gemini-1.5-pro',
  expectedOutputTokens: number
): CostEstimate
```

**Expected Outcome:** Fluent with tokenization. Can estimate costs for any API call. Token Cost Calculator working.

---

**📝 Day 4 Interview Practice Questions**

1. **(Beginner | All Companies)** What is a token? Why is it not the same as a word or a character?

2. **(Intermediate | All Companies)** Why does tokenization matter for production AI systems? Give 3 specific engineering implications.

3. **(Intermediate | Stripe, Meta)** A user says "your AI costs too much." Walk through how you would analyze and reduce token costs.

4. **(Intermediate | Google, OpenAI)** Why do Japanese, Chinese, and Arabic text cost more tokens per word than English?

5. **(Intermediate | All Companies)** How do special tokens like `<|im_start|>` work and why do they exist?

6. **(Advanced | All Companies)** A prompt is 120,000 tokens and the model has a 128K context window. What are the risks and how do you handle them?

7. **(Advanced | Stripe, Uber)** How would you implement token budgeting per user in a multi-tenant AI product?

8. **(Staff | OpenAI, Anthropic)** What is the relationship between tokenization quality and model performance? Can a poor tokenizer hurt a good model?

---

## DAY 5 — Lesson 1.1.5: Embeddings

**Why it matters:** Embeddings are the foundation of RAG, semantic search, recommendations, and clustering. Understanding them is non-negotiable for an AI engineer.

**Study Agenda (75 min)**

- What an embedding is: a vector in high-dimensional space (1536 or 3072 dimensions)
- Why similar meaning → close vectors (the geometry of semantic space)
- Cosine similarity: the standard measure, why not Euclidean distance
- Embedding models: `text-embedding-3-small`, `text-embedding-3-large`, Cohere
- Embedding dimensions and their trade-offs (speed vs accuracy)
- Matryoshka embeddings: adaptive dimensions from one model
- Use cases: semantic search, RAG retrieval, clustering, anomaly detection
- Batch embedding for efficiency

**Mini Project — Semantic Similarity Checker** *(Part of Projects 2, 10)*
```typescript
// Build: input two sentences → output cosine similarity + visual bar
async function semanticSimilarity(s1: string, s2: string): Promise<{
  similarity: number;   // 0–1
  interpretation: string; // "Very similar" | "Related" | "Unrelated"
}> {
  const [emb1, emb2] = await Promise.all([embed(s1), embed(s2)]);
  return { similarity: cosineSimilarity(emb1, emb2), ... };
}
```

**Expected Outcome:** Can explain embeddings to any audience. Can implement cosine similarity from scratch. Basic semantic search working.

---

**📝 Day 5 Interview Practice Questions**

1. **(Beginner | All Companies)** What is an embedding? Explain it to a non-technical person using an analogy.

2. **(Intermediate | All Companies)** What is cosine similarity and why is it preferred over Euclidean distance for embeddings?

3. **(Intermediate | Google, Meta)** What is the difference between `text-embedding-3-small` and `text-embedding-3-large`? When do you use each?

4. **(Intermediate | All Companies)** How do embeddings power a RAG system? Trace the exact path from a user query to a retrieved document.

5. **(Advanced | OpenAI)** What are Matryoshka embeddings and what problem do they solve?

6. **(Advanced | Stripe, Airbnb)** How would you build a duplicate detection system using embeddings for a product catalog with 1 million items?

7. **(Advanced | Google, Meta)** What happens to embedding quality when you embed very long documents (10,000+ words)?

8. **(Staff | All Companies)** When would you fine-tune an embedding model vs using a general-purpose one?

---

## DAY 6 — Lesson 1.1.6: Context Windows

**Why it matters:** Context window management is one of the top architectural decisions in every production AI system. Every senior AI engineer must know its limits, costs, and failure modes.

**Study Agenda (75 min)**

- Context window = tokens in + tokens out (the total budget)
- Current limits: GPT-4o (128K), Claude 3.5 (200K), Gemini 1.5 Pro (1M)
- The "lost in the middle" problem: models ignore middle content in long contexts
- Sliding window techniques: keep most recent context, summarize old
- Prompt caching: Anthropic's `cache_control` — send once, pay fraction on reuse
- KV cache (conceptual): how the model stores computed attention for reuse
- When to use long context vs RAG: trade-offs at depth
- Context window cost: 200K tokens at full price vs chunked retrieval

**Mini Project — Context Window Visualizer**
```typescript
// Build a visual component showing:
// [████████░░░░░░░░░░░░] 40% used (51,200 / 128,000 tokens)
// System: 2,400 | History: 28,000 | Current: 20,800
// Estimated cost: $0.024 | Remaining: $0.038 budget
```

**Expected Outcome:** Can design context management strategies. Understands prompt caching ROI. Can explain "lost in the middle" failure mode.

---

**📝 Day 6 Interview Practice Questions**

1. **(Beginner | All Companies)** What is a context window? What counts toward the limit?

2. **(Intermediate | All Companies)** What is the "lost in the middle" problem? How do you design prompts to avoid it?

3. **(Intermediate | OpenAI, Anthropic)** What is prompt caching? How does Anthropic's `cache_control` work and when should you use it?

4. **(Intermediate | All Companies)** A user wants to chat with a 500-page PDF. How do you handle this architecturally?

5. **(Advanced | Google, Anthropic)** When would you use a 1M token context window vs a RAG system? What are the trade-offs?

6. **(Advanced | All Companies)** How would you implement a sliding window memory system for a long-running conversation agent?

7. **(Advanced | Stripe, Netflix)** A production AI system is spending 60% of costs on context tokens. How do you optimize it?

8. **(Staff | All Companies)** Design a context management system for a multi-turn agent that handles conversations lasting hours.

---

## DAY 7 — Lesson 1.1.7: Temperature, Top-P & Sampling Parameters

**Why it matters:** These parameters control creativity vs determinism. Wrong settings break production systems. Right settings define product personality.

**Study Agenda (75 min)**

- Temperature: 0 = deterministic, 1 = balanced, 2 = chaotic — with examples
- Why temperature=0 is NOT truly deterministic (floating point, batching)
- Top-P (nucleus sampling): only sample from top-P probability mass
- Top-K: only sample from top K tokens
- Presence penalty: discourages repeating topics
- Frequency penalty: discourages repeating exact tokens
- When to use low temperature: code generation, factual lookup, JSON
- When to use high temperature: creative writing, brainstorming, diversity
- Practical settings matrix: customer support / code / creative / analysis

**Mini Project — Sampling Playground**
```typescript
// Build: same prompt × 10 runs at temp [0, 0.3, 0.7, 1.0, 1.5]
// Show output variance visually — how different are the 10 results at each temp?
// Use standard deviation of embedding distances as variance metric
```

**Expected Outcome:** Can set sampling parameters precisely for any task. Can explain why temp=0 isn't always deterministic.

---

**📝 Day 7 Interview Practice Questions**

1. **(Beginner | All Companies)** What is temperature in an LLM? What does setting it to 0 vs 1.5 do?

2. **(Intermediate | All Companies)** What temperature would you use for: a customer support bot / a code generator / a creative writing tool? Justify each.

3. **(Intermediate | Google, Meta)** What is the difference between Top-P and Top-K sampling? When does Top-P outperform Top-K?

4. **(Intermediate | All Companies)** Why is temperature=0 not truly deterministic? What causes variance?

5. **(Advanced | Stripe, OpenAI)** A code generation tool is producing code that always uses the same patterns even when better alternatives exist. What parameter do you adjust?

6. **(Advanced | All Companies)** Explain the difference between presence penalty and frequency penalty. Give a scenario where each matters.

7. **(Advanced | Anthropic)** Claude's "extended thinking" mode — how does it change the sampling process?

8. **(Staff | All Companies)** Design a production AI system that dynamically adjusts temperature based on query type (classified at runtime). What's your architecture?

---

## DAY 8 — Lesson 1.1.8: Hallucinations & Grounding

**Why it matters:** Hallucinations are the #1 cause of production AI failures. Every senior AI engineer must understand the root cause and design systems that mitigate them architecturally.

**Study Agenda (75 min)**

- Why LLMs hallucinate: statistical next-token prediction without truth grounding
- Types: factual hallucinations, entity hallucinations, citation hallucinations
- Grounding technique 1: RAG (retrieve real facts before generating)
- Grounding technique 2: Tool use (give model access to real data)
- Grounding technique 3: System prompts with explicit constraints ("only answer from provided context")
- Chain-of-thought effect on hallucination: making reasoning explicit reduces errors
- Verification patterns: AI generates → second AI verifies → retry on failure
- Confidence calibration: does the model "know what it doesn't know"?

**Mini Project — Hallucination Detection System**
```typescript
// Build: LLM-as-judge that evaluates AI output for potential hallucinations
// Input: [AI answer, source documents]
// Output: { hallucination_risk: 'low'|'medium'|'high', flagged_claims: string[] }
```

**Expected Outcome:** Can diagnose hallucination causes. Can design multi-layer grounding architectures. Hallucination detector implemented.

---

**📝 Day 8 Interview Practice Questions**

1. **(Beginner | All Companies)** Why do LLMs hallucinate? What is the fundamental cause?

2. **(Intermediate | All Companies)** What are the three types of LLM hallucinations? Give an example of each.

3. **(Intermediate | All Companies)** What is "grounding" an AI system? What are 3 grounding techniques?

4. **(Advanced | Anthropic, OpenAI)** How would you build a hallucination mitigation system for a medical AI product where wrong answers are dangerous?

5. **(Advanced | Google, Meta)** Explain the verification loop pattern. How does a second LLM call reduce hallucination risk?

6. **(Advanced | Stripe)** A user asks a financial AI for specific numbers. The AI confidently gives wrong numbers. How do you architect this to prevent it?

7. **(Advanced | All Companies)** Does Chain-of-Thought prompting reduce hallucinations? Why or why not?

8. **(Staff | All Companies)** Design a production system where hallucination rate is tracked, alerted on, and automatically triggers a fallback strategy.

---

## DAY 9 — Lesson 1.1.9: AI Evaluation (Evals)

**Why it matters:** Evals are what separate toy AI demos from production systems. This is increasingly asked at senior/staff AI interviews. "How do you know if your AI improved?" is the test.

**Study Agenda (90 min — extra time, this is critical)**

- What evals are: systematic measurement of AI quality
- Evaluation types: accuracy, faithfulness, relevance, coherence, groundedness
- LLM-as-judge pattern: use a more powerful model to score a weaker one
- Human evaluation: gold standard, but expensive
- Automated benchmarks: MMLU, HumanEval, MT-Bench — what they measure
- Eval frameworks: Promptfoo, Braintrust, LangSmith, OpenAI Evals
- A/B testing AI: comparing prompt v1 vs v2 on the same dataset
- Regression testing: ensuring new changes don't break existing behavior
- Building an eval dataset: how many cases? What coverage?

**Mini Project — Eval Pipeline** *(Part of Project 27 — AI Evaluation Framework)*
```typescript
// Build: eval pipeline that tests 3 system prompts on 20 test cases
// Score each using LLM-as-judge on: accuracy (0-5), helpfulness (0-5), safety (0-5)
// Output: ranked leaderboard of system prompts
interface EvalResult {
  promptVersion: string;
  avgAccuracy: number;
  avgHelpfulness: number;
  passRate: number;
}
```

**Expected Outcome:** Can design and run an eval suite from scratch. Understands LLM-as-judge trade-offs. Eval pipeline implemented.

---

**📝 Day 9 Interview Practice Questions**

1. **(Intermediate | All Companies)** How do you know if your AI system improved after a prompt change?

2. **(Intermediate | OpenAI, Anthropic)** What is LLM-as-judge? What are its limitations?

3. **(Intermediate | All Companies)** How would you design an eval suite for a customer support chatbot?

4. **(Advanced | Google, Stripe)** What is the difference between offline evals and online A/B testing for AI? When do you need both?

5. **(Advanced | All Companies)** How do you handle the problem of eval datasets becoming "contaminated" when you use them too often?

6. **(Advanced | Anthropic, OpenAI)** Design the evaluation strategy for migrating from GPT-4o to Claude without regressions.

7. **(Staff | All Companies)** How do you run evals in CI/CD? What triggers an eval run and what are the pass/fail criteria?

8. **(Staff | All Companies)** How do you measure "hallucination rate" as a production metric? What does your monitoring dashboard show?

---

## DAY 10 — Lesson 1.1.10: AI Model Capabilities & Limitations

**Why it matters:** Model selection is a core architectural decision. Knowing what models can and cannot do prevents over-engineering and under-delivering. This is a Phase 1 capstone.

**Study Agenda (75 min)**

- Capability benchmarks: coding (HumanEval), reasoning (MMLU), math (MATH), multilingual
- Model families 2025–2026: GPT-4o / o1 / o3, Claude 3.5/4, Gemini 2.0
- Open-source frontier: Llama 3.1/3.3, Mistral, Qwen 2.5, Phi-4
- Proprietary vs open-source trade-offs: cost, privacy, fine-tuning, reliability
- Cost per token comparison matrix (always verify current pricing)
- Latency: GPT-4o-mini vs GPT-4o vs Claude Haiku vs Sonnet — where it matters
- Fine-tuning availability: GPT-4o-mini, Claude (limited), Gemini Flash
- Multimodal capabilities: what each model can actually see/hear/read

**Mini Project — Model Selector Decision Tree** *(Portfolio documentation)*
```
Build an interactive decision tree:
Is the task creative? → High temperature models
Does it require real-time web data? → Need tools/search
Is cost critical? → Route to mini/haiku/flash first
Is privacy critical? → Local LLM or self-hosted
Is reasoning required? → o1/o3 or Claude with extended thinking
```

**Phase 1 Completion Checklist:**
- [ ] Can explain GenAI, LLMs, transformers without notes
- [ ] Can calculate token costs for any API call
- [ ] Can implement cosine similarity from scratch
- [ ] Can explain "lost in the middle" and design around it
- [ ] Can set temperature/top-p for any use case
- [ ] Can design a hallucination mitigation strategy
- [ ] Can build and run a basic eval pipeline
- [ ] Token Cost Calculator (Project 6) — complete
- [ ] Semantic Similarity Checker — complete

---

**📝 Day 10 Interview Practice Questions**

1. **(Intermediate | All Companies)** How would you choose between GPT-4o and Claude Sonnet for a production application? What criteria do you use?

2. **(Intermediate | All Companies)** When would you use a smaller, cheaper model vs a larger, more capable one?

3. **(Advanced | Google, Meta)** What are the trade-offs of open-source models (Llama, Mistral) vs proprietary APIs (OpenAI, Anthropic)?

4. **(Advanced | All Companies)** A user needs real-time information, high accuracy on code, and low latency. Which model(s) do you use and why?

5. **(Advanced | Stripe, Netflix)** Design a model routing strategy for a product with 3 tiers of queries: simple Q&A, complex reasoning, and code generation.

6. **(Advanced | OpenAI, Anthropic)** When does fine-tuning make sense vs prompt engineering? At what scale does the ROI flip?

7. **(Staff | All Companies)** Design a model evaluation process for your team to use when a new model is released. What do you test before adopting it in production?

8. **(Staff | All Companies)** How do you future-proof an AI system architecture so that swapping models doesn't require a full rewrite?

---

# Phase 2: Prompt Engineering (Days 11–19)

> **Goal:** Master the craft of communicating with LLMs at a professional level.
> Complete all 8 Lesson 2.1.x topics. Build Projects 1 (Chat App basics), 9 (Prompt Playground).

---

## DAY 11 — Lesson 2.1.1: Anatomy of a Great Prompt

**Why it matters:** Prompt engineering is the fastest ROI skill in AI. A 10x better prompt can eliminate the need for fine-tuning.

**Study Agenda (75 min)**

- System prompt vs User prompt vs Assistant turn — roles and purpose
- Role assignment: "You are a senior engineer at Google..." — why it works
- The TASK + CONTEXT + FORMAT + CONSTRAINTS framework
- Few-shot vs Zero-shot: when to provide examples and how many
- Positive instructions vs negative instructions (say DO rather than DON'T)
- Why specific beats vague: "Summarize in 3 bullet points under 20 words each" vs "Summarize"
- Building a prompt template library in TypeScript

**Mini Project — Prompt Template Library**
```typescript
// Build reusable, typed prompt templates
const prompts = {
  summarize: (content: string, bulletCount: number) => `...`,
  classify: (text: string, categories: string[]) => `...`,
  extract: <T>(text: string, schema: T) => `...`,
  rewrite: (text: string, tone: 'formal'|'casual'|'technical') => `...`,
}
```

---

**📝 Day 11 Interview Practice Questions**

1. **(Beginner | All Companies)** What makes a system prompt effective? Give 3 principles.
2. **(Intermediate | All Companies)** What is few-shot prompting? When should you use 3-shot vs 5-shot vs 0-shot?
3. **(Intermediate | Google, Meta)** How do you handle prompts that produce inconsistent outputs across runs?
4. **(Intermediate | All Companies)** What is the COSTAR framework? Apply it to design a prompt for a code review assistant.
5. **(Advanced | Stripe, OpenAI)** How would you version control system prompts in a production application?
6. **(Advanced | All Companies)** A prompt works great in testing but fails 20% of the time in production. How do you diagnose and fix this?
7. **(Advanced | Anthropic)** What is the difference between a system prompt and a human turn for Claude? Does it matter where you put instructions?
8. **(Staff | All Companies)** Design a prompt management system for a team of 20 AI engineers with A/B testing, versioning, and rollback.

---

## DAY 12 — Lesson 2.1.2: Chain-of-Thought Prompting

**Why it matters:** CoT dramatically improves reasoning accuracy and is a core technique in every production AI system.

**Study Agenda (75 min)**

- What Chain-of-Thought is: explicitly making reasoning visible improves output
- "Let's think step by step" — why this 5-word addition changes everything
- Zero-shot CoT vs Few-shot CoT — examples of each
- Tree-of-Thought (ToT): exploring multiple reasoning branches
- Extended thinking in Claude: what happens internally during "thinking"
- Reasoning models (o1, o3): CoT built into training, not just prompting
- When CoT helps: math, logic, multi-step reasoning
- When CoT doesn't help: simple factual lookup, classification, short tasks

**Mini Project — Reasoning Comparator**
```typescript
// Run same problem with: standard / CoT / ToT prompting
// Show outputs + accuracy on 10 math/logic test cases
// Measure: correct answers and reasoning quality
```

---

**📝 Day 12 Interview Practice Questions**

1. **(Intermediate | All Companies)** Why does "let's think step by step" improve accuracy? What cognitive process does it simulate?
2. **(Intermediate | OpenAI, Google)** What is the difference between reasoning models (o1, o3) and CoT prompting? Are they the same thing?
3. **(Intermediate | All Companies)** When would Chain-of-Thought NOT be beneficial? Give 3 examples.
4. **(Advanced | Anthropic)** How does Claude's extended thinking work? What is happening during the thinking phase?
5. **(Advanced | Google)** What is Tree-of-Thought? How does it extend CoT and when does it outperform?
6. **(Advanced | Stripe, Meta)** A financial analysis AI is making calculation errors. How do you use CoT to fix this?
7. **(Advanced | All Companies)** How do you evaluate whether CoT improved output quality? What's your measurement approach?
8. **(Staff | All Companies)** Design a complex multi-step reasoning pipeline (plan → execute → verify → synthesize) using CoT at each stage.

---

## DAY 13 — Lesson 2.1.3: Advanced Prompt Patterns

**Why it matters:** These patterns are the advanced toolkit used in real production codebases.

**Study Agenda (75 min)**

- **ReAct** (Reason + Act): interleave reasoning and tool use
- **COSTAR** framework: Context, Objective, Style, Tone, Audience, Response
- **Self-Consistency**: run N times, majority vote on answer
- **Meta-prompting**: prompts that generate better prompts
- **Least-to-most**: decompose complex task into simpler subtasks
- **Prompt chaining**: output of prompt 1 → input to prompt 2
- **Skeleton-of-thought**: generate outline first, then fill in parallel

**Mini Project — Research Pipeline with Prompt Chaining**
```typescript
// Query → Extract key claims → Verify each claim → Synthesize final answer
// 4-stage pipeline, each stage uses a different specialized prompt
```

---

**📝 Day 13 Interview Practice Questions**

1. **(Intermediate | All Companies)** What is the ReAct pattern? How does it combine reasoning and tool use?
2. **(Intermediate | Google, Meta)** How does self-consistency improve output reliability? What's the overhead cost?
3. **(Advanced | All Companies)** Describe a real-world scenario where prompt chaining is the right solution (vs a single prompt).
4. **(Advanced | Stripe, OpenAI)** What is meta-prompting? Build a meta-prompt that generates better system prompts for customer service.
5. **(Advanced | All Companies)** What is the least-to-most prompting technique? When does it outperform standard prompting?
6. **(Advanced | Google)** How does skeleton-of-thought improve latency? What is the parallelism strategy?
7. **(Staff | Anthropic, OpenAI)** Design a prompt pattern for an AI that needs to: understand a complex legal document, extract relevant clauses, verify them against regulations, and draft a compliance report.
8. **(Staff | All Companies)** How would you benchmark different prompt patterns (ReAct vs CoT vs Chaining) for the same task?

---

## DAY 14 — Lesson 2.1.4: Structured Outputs & JSON Mode

**Why it matters:** Structured outputs make AI integration reliable. Unstructured outputs in application code cause failures.

**Study Agenda (75 min)**

- JSON mode vs structured outputs vs `response_format` — the differences
- OpenAI structured outputs with JSON Schema — how to define the schema
- Anthropic's approach to structured output (constrained generation)
- Zod for validating AI JSON output in TypeScript
- Retry logic when parsing fails: 3 attempts with error feedback
- TypeScript generic for type-safe AI output: `aiJSON<T>(prompt, schema)`
- Why always validate AI JSON, even when using JSON mode

**Mini Project — Resume Parser** *(Portfolio Project 3)*
```typescript
const resumeSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  skills: z.array(z.string()),
  yearsExperience: z.number(),
  education: z.array(z.object({ degree: z.string(), institution: z.string() }))
});
// Parse unstructured resume text → validated ResumeData object
```

---

**📝 Day 14 Interview Practice Questions**

1. **(Intermediate | All Companies)** What is the difference between JSON mode and OpenAI structured outputs?
2. **(Intermediate | Stripe, Google)** How do you handle the case where an AI returns invalid JSON?
3. **(Advanced | All Companies)** Implement a type-safe `aiJSON<T>(prompt, schema)` function with 3-attempt retry and error feedback.
4. **(Advanced | Stripe, Meta)** What are the trade-offs of strict schema enforcement vs flexible AI output?
5. **(Advanced | All Companies)** How do you handle optional fields in AI structured output when the AI might not always have the information?
6. **(Advanced | OpenAI, Anthropic)** How does constrained decoding (structured outputs) work at the token level? Why is it more reliable than asking for JSON in the prompt?
7. **(Staff | Stripe)** Design a type-safe AI integration layer for your backend that handles: schema validation, retry, error reporting, and cost tracking.
8. **(Staff | All Companies)** How do you version structured output schemas when your AI feature evolves over time?

---

## DAY 15 — Lesson 2.1.5: Function Calling & Tool Calling

**Why it matters:** Function calling is the bridge between LLMs and real systems. It's the foundation of every AI agent.

**Study Agenda (90 min)**

- What function/tool calling is: AI decides to call a function vs respond with text
- OpenAI function calling schema: tool definition format
- Anthropic tool use API: different syntax, same concept
- Parallel tool calling: model calls multiple tools simultaneously
- Tool results: feeding results back into the conversation
- When the model chooses NOT to call a tool: understanding this behavior
- Tool call loop: model → tools → model → tools → final response
- Error handling: what happens when a tool fails

**Mini Project — Personal Finance Assistant** *(Part of Project 15)*
```typescript
const tools = [
  getStockPrice({ ticker: string }),
  calculatePortfolioValue({ holdings: Holding[] }),
  getNewsHeadlines({ ticker: string, count: number }),
];
// Build the full tool calling loop with parallel execution
```

---

**📝 Day 15 Interview Practice Questions**

1. **(Intermediate | All Companies)** How does function calling differ from just asking the model to return JSON with a function name?
2. **(Intermediate | OpenAI, Anthropic)** What happens when a model calls multiple tools in parallel? How do you handle the responses?
3. **(Advanced | All Companies)** How do you handle tool call errors and implement retry logic?
4. **(Advanced | Stripe, Google)** Design a tool that lets an AI query your database safely — what constraints do you put on it?
5. **(Advanced | Meta, Uber)** What is the tool call loop? Implement one that can handle up to 10 iterations with a stop condition.
6. **(Advanced | All Companies)** When would you NOT use function calling? What are its limitations?
7. **(Staff | Anthropic, OpenAI)** Design a tool library for a "Sales Research Agent" with 10 tools: search company, find contacts, enrich data, draft emails, log to CRM, schedule follow-up.
8. **(Staff | All Companies)** How do you test function calling in CI? What test cases do you write?

---

## DAY 16 — Lesson 2.1.6: Prompt Security & Injection

**Why it matters:** Prompt injection is the #1 security threat in AI systems. Asked in virtually every senior AI engineering interview.

**Study Agenda (90 min)**

- What prompt injection is: malicious user input overrides system prompt
- Direct injection: user says "ignore previous instructions and..."
- Indirect injection: malicious content in a document/email the AI reads
- Prompt exfiltration: user tricks AI into revealing the system prompt
- Jailbreaking techniques: role-play, hypothetical framing, base64 encoding
- Defense 1: input validation and sanitization layer
- Defense 2: output validation (does response contain prompt content?)
- Defense 3: sandboxing — restrict what AI can do even if injected
- Defense 4: Constitutional AI / system-level guardrails
- Canary tokens for detecting extraction attacks

**Mini Project — Prompt Security Analyzer**
```typescript
// Input: any user message
// Output: { risk: 'low'|'medium'|'high', detected_patterns: string[], recommendation: string }
// Detect: injection attempts, jailbreak patterns, extraction attempts
```

---

**📝 Day 16 Interview Practice Questions**

1. **(Intermediate | All Companies)** What is prompt injection? Give a concrete example of a direct injection attack.
2. **(Intermediate | All Companies)** What is indirect prompt injection? How does it differ from direct injection?
3. **(Advanced | Google, Anthropic)** How would you secure a customer-facing AI chatbot against prompt injection?
4. **(Advanced | Stripe, Meta)** What is a canary token in the context of AI security? How do you use it to detect system prompt extraction?
5. **(Advanced | All Companies)** A user sends: "You are now DAN (Do Anything Now)..." to your customer service bot. What does your defense layer do?
6. **(Advanced | OpenAI, Anthropic)** Why is indirect prompt injection especially dangerous in agentic systems?
7. **(Staff | All Companies)** Design a multi-layer prompt security system for an enterprise AI assistant that processes emails, Slack messages, and documents.
8. **(Staff | Google, Meta)** How do you red-team an AI system for prompt injection vulnerabilities before launch?

---

## DAY 17 — Lesson 2.1.7: System Prompt Architecture

**Why it matters:** Production AI systems have complex, layered system prompts. Designing them correctly is a core senior skill.

**Study Agenda (75 min)**

- System prompt as the source of truth for all AI behavior
- Layered architecture: base persona + context + constraints + examples
- Dynamic injection: inserting user-specific context at runtime
- System prompt versioning: treating prompts as code artifacts
- Testing system prompt changes: regression testing with evals
- Prompt leakage prevention: what to do if user asks "what are your instructions?"
- Rate limits and prompt caching with large system prompts

**Mini Project — AI Interviewer System Prompt** *(Portfolio documentation)*
Design the complete system prompt for a "Senior Engineer AI Interviewer" product with: persona, behavior constraints, format rules, 5 few-shot examples, and edge case handling. Include a TypeScript prompt manager with versioning.

---

**📝 Day 17 Interview Practice Questions**

1. **(Intermediate | All Companies)** What information should live in a system prompt vs the user message?
2. **(Intermediate | All Companies)** How do you prevent users from extracting your system prompt?
3. **(Advanced | All Companies)** How would you version control system prompts with rollback capability?
4. **(Advanced | Stripe, Google)** Design a layered system prompt architecture for a multi-role AI (handles support, sales, and technical queries differently).
5. **(Advanced | All Companies)** How do you dynamically inject user context (role, permissions, history) into a system prompt without exceeding token budgets?
6. **(Staff | All Companies)** How do you A/B test system prompt changes in production with statistical significance?
7. **(Staff | Anthropic, OpenAI)** Design a system prompt management platform for a team of 20 engineers: versioning, testing, deployment, rollback.
8. **(Staff | All Companies)** A system prompt is 15,000 tokens and it's sent on every request. How do you optimize this for cost without losing quality?

---

## DAY 18 — Lesson 2.1.8: Prompt Optimization & Cost Reduction

**Why it matters:** At scale, prompt costs matter enormously. Optimizing prompts can reduce costs by 60–80% without quality loss.

**Study Agenda (75 min)**

- Prompt compression: removing redundant instructions, shortening examples
- Model routing: use cheap model for simple tasks, expensive model for complex
- Prompt caching (Anthropic, OpenAI): implementation + ROI calculation
- Output length control: set `max_tokens` aggressively, penalize verbosity
- Instruction distillation: compress 2000-token prompt to 800 tokens
- Cost monitoring: per-user, per-feature cost tracking
- Budget enforcement: per-user daily limits, graceful degradation

**Mini Project — Cost Dashboard + Prompt Compressor**
```typescript
// Build: takes a system prompt → compresses it → runs evals to verify quality maintained
// Also build: cost monitoring dashboard with per-model, per-user breakdown
```

**Phase 2 Completion Checklist:**
- [ ] Can write production-quality prompts from scratch
- [ ] Can implement structured output with Zod validation
- [ ] Can implement full function calling loop
- [ ] Can defend against prompt injection (input + output validation)
- [ ] Can reduce prompt costs 40%+ without quality loss
- [ ] Prompt Playground (Project 9) — complete
- [ ] Resume Parser (Project 3) — complete

---

**📝 Day 18 Interview Practice Questions**

1. **(Intermediate | All Companies)** How would you reduce AI API costs by 50% without changing the product experience?
2. **(Intermediate | Stripe, Meta)** What is prompt caching and how does Anthropic's implementation work?
3. **(Advanced | All Companies)** How would you implement model routing: decide at runtime whether to use GPT-4o-mini vs GPT-4o?
4. **(Advanced | Netflix, Uber)** Design a cost optimization system for 100K daily AI queries. Target: reduce cost by 60%.
5. **(Advanced | All Companies)** How do you implement per-user AI spending limits without impacting UX for most users?
6. **(Staff | All Companies)** Design a prompt compression system that automatically distills long system prompts while maintaining quality (measured by evals).
7. **(Staff | Stripe, Google)** Design a cost monitoring system that alerts when per-user cost exceeds budget, traces cost to specific features, and auto-routes to cheaper models.
8. **(Staff | All Companies)** You need to roll out a new AI feature to 1M users. What cost modeling do you do before launch?

---

## DAY 19 — Phase 2 Project Day: Prompt Engineering Playground

**Why it matters:** Project day consolidates all Phase 2 concepts into one working product. This becomes a portfolio centerpiece.

**Study Agenda (90 min — all building)**

**Project 9 — Prompt Engineering Playground (Complete Build)**
```
Features to implement today:
✅ Test same prompt across GPT-4o, Claude, Gemini simultaneously
✅ Side-by-side output comparison
✅ Token count + cost display for each run
✅ Save/load prompt library (localStorage)
✅ Temperature/top-p slider controls
✅ Structured output mode (with schema definition)
✅ Eval scoring: run 5 test cases, score each output
✅ Export prompt + results as Markdown
```

**GitHub Push:** Complete working Prompt Engineering Playground deployed to Vercel/Netlify.

---

**📝 Day 19 Interview Practice Questions**

1. Walk me through how you built the Prompt Engineering Playground. What architectural decisions did you make?
2. **(Advanced | All Companies)** How would you extend this to support 50 users with their own prompt libraries?
3. **(Advanced | Stripe)** How do you handle API rate limits when running the same prompt across 3 providers simultaneously?
4. **(Advanced | Google)** If a user's prompt consistently gets better results on Claude than GPT-4o, how would you detect this automatically?
5. **(Staff | All Companies)** Design a team version of this tool: shared prompt library, A/B testing, and eval dashboards.
