# How LLMs Work — Tokens, Context Window, Temperature, Top-p
> Part 21 — Generative AI for Full Stack Engineers · LLM Fundamentals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Token ≠ word**: "temperature" = 1 token; "ChatGPT" = 2 tokens; a token is roughly 3-4 characters on average; 1,000 words ≈ 1,300 tokens — you are billed per token, so this matters for cost estimation
- **Context window is the model's working memory**: GPT-4o has 128k tokens; everything the model "knows" about your conversation must fit in this window; when it fills up, the model loses the oldest content (sliding window) or truncates — it cannot remember earlier turns once the context is full
- **Temperature controls randomness**: temperature=0 → deterministic, always picks the most likely next token; temperature=1 → more varied/creative; use 0 for data extraction tasks, 0.7 for text generation, near 1 for creative writing; higher temperature = less predictable
- **Top-p (nucleus sampling)**: instead of picking from all tokens, only pick from the top tokens that together sum to p% probability; top-p=0.9 means pick from the 90th percentile subset; in practice, set temperature OR top-p, not both, when tuning — they interact unpredictably
- **Inference = autoregressive one token at a time**: the model generates token[N+1] by predicting the most likely continuation of token[1..N]; it does not plan ahead; each token is a prediction based on all prior tokens in the context — this is why order and phrasing in your prompt matters
- **Billion parameters ≠ intelligence**: parameters are floating-point weights trained to predict the next token; the "intelligence" emerges from scale — bigger models trained on more data are better at following instructions, but all models are ultimately token predictors

---

## 1. One-Line Definition
An LLM (Large Language Model) is a neural network trained to predict the next token given a sequence of previous tokens; it generates responses by repeating this prediction one token at a time until a stop condition is met.

---

## 2. The Problem It Solves

A developer asks: "What is the model doing when I call the OpenAI API?"

Without understanding the internals:
- They set temperature=1 and wonder why their JSON extraction is inconsistent
- They send a 200k token context and wonder why the model "forgot" their earlier instructions
- They get charged $0.40 for a single request and have no idea why
- They can't explain to a PM why the model sometimes gets things wrong

With the fundamentals:
- They know temperature=0 is the right setting for structured extraction
- They know context window = memory limit and design their prompts accordingly
- They can estimate API cost before building (tokens × cost-per-token)
- They can explain model behaviour to non-technical stakeholders

---

## 3. How It Works Internally

### Tokenisation

```
Text → Tokens (before the model sees anything)

"Hello world" → ["Hello", " world"] → 2 tokens

"Bangalore" → ["Bang", "alore"] → 2 tokens (subword tokenisation)

"const fetchUser = async (id) => {" 
→ ["const", " fetch", "User", " =", " async", " (", "id", ")", " =>", " {"] 
→ 10 tokens

Rough rules of thumb:
  1 English word ≈ 1.3 tokens
  1,000 words ≈ 1,300 tokens
  1 page of A4 text ≈ 500-700 tokens
  1,000-word blog post ≈ 1,300 tokens

Cost implication:
  GPT-4o (2025): $0.0025 per 1K input tokens
  A 100-page PDF = ~60,000 tokens input
  Cost to process: 60,000 / 1000 × $0.0025 = $0.15 per query
```

### Context Window

```
GPT-4o:          128,000 tokens (~96,000 words / ~300 pages)
Claude Sonnet:   200,000 tokens (~150,000 words)
Llama 3 (8B):    8,000 tokens
Gemini 1.5 Pro:  1,000,000 tokens (experimental)

What goes into the context window:
  - System prompt (your instructions to the model)
  - Chat history (all prior turns in the conversation)
  - User message (current input)
  - Retrieved documents (if doing RAG)
  - Output so far (partial generation counts against context)

When context fills:
  - Sliding window: oldest messages dropped
  - Hard truncation: error thrown if you exceed the limit
  - Design implication: for long conversations, summarise 
    and compress history rather than letting context grow unbounded
```

### Temperature and Top-p

```
TEMPERATURE

The model calculates a probability distribution over all 
possible next tokens. Temperature scales this distribution.

temperature = 0:
  Probabilities → [token_A: 0.95, token_B: 0.04, token_C: 0.01]
  Always picks token_A (highest probability, deterministic)
  
temperature = 1:
  No scaling. Mixed results. Some variation.
  
temperature = 2:
  Distribution flattened. Unusual tokens become more likely.
  Use case: very creative, but often incoherent beyond ~1.2

USE:
  Extraction / classification tasks: temperature = 0
  Chat / conversation: temperature = 0.5-0.7
  Creative writing: temperature = 0.8-1.0

─────────────────────────────────────────────────────────────────────────

TOP-P (NUCLEUS SAMPLING)

Instead of picking from all tokens, restrict to the smallest 
set of tokens that together sum to P% probability mass.

top-p = 0.9: 
  Only consider tokens that together = 90% of probability
  (might be 10 tokens, might be 100 — depends on distribution)
  
Practical advice:
  Set temperature to your target range.
  Leave top-p at default (1.0) unless you have a specific reason.
  Setting both is redundant and creates unpredictable interactions.
```

### Autoregressive Generation

```
Input:   "The capital of France is"
Step 1:  Predict next token → " Paris" (probability 0.97)
Step 2:  New sequence: "The capital of France is Paris"
         Predict next token → "." (probability 0.85)
Step 3:  New sequence: "The capital of France is Paris."
         Predict next → "<end>" (stop token hit)
         
Result: "Paris."

IMPORTANT: The model does not plan the full sentence.
It predicts token by token. This is why:
  - You can get grammatically perfect but factually wrong output
  - The model can contradict itself mid-sentence
  - Longer outputs can drift from the original instruction
  - Better prompts that constrain the generation space → more reliable output
```

---

## 4. The Pattern in Practice

### Wrong Way — Ignoring temperature for structured tasks

```
❌ Code: extracting JSON with temperature=0.8

Prompt: "Extract the name and email from this text as JSON"
Text:   "Hi, I'm John Smith. Email: john@example.com"

Output at temperature=0.8 (example A):
{"name": "John Smith", "email": "john@example.com"}

Output at temperature=0.8 (example B — same prompt, same text):
{"person": "John Smith", "contact_email": "john@example.com", "note": "extracted as requested"}

The field names differ between calls.
If your code does response.email, it breaks on example B.
```

```
✅ Use temperature=0 for deterministic structured extraction

Output at temperature=0 (consistent across calls):
{"name": "John Smith", "email": "john@example.com"}

Plus: use JSON mode / structured outputs API if the provider 
supports it — schema-enforced output removes field naming 
variability entirely.
```

---

## 5. Interview Questions & Model Answers

### Q1 — Foundations
**Interviewer:** "What is a context window and why does it matter for building LLM applications?"

**Hruday:**
> "The context window is the model's working memory — everything you send plus everything the model has generated so far must fit within it. For applications, this matters in two ways: first, the context window sets the maximum amount of information you can send per request (RAG retrieved documents, chat history, system prompt all compete for space); second, when you exceed it, the model loses older content, which can cause it to lose track of earlier instructions in long conversations. Good LLM application design manages context size deliberately — summarising history, chunking documents, and prioritising the most relevant content."

---

### Q2 — Temperature practical
**Interviewer:** "When would you set temperature to 0 and when would you set it higher?"

**Hruday:**
> "Temperature=0 for any task where consistency matters: extracting structured data, classification, answering factual questions, filling in templates. Temperature=0.7 for conversational responses where you want natural-sounding text but not randomness that breaks logic. Temperature approaching 1 for creative content like marketing copy or story generation where variety is desirable. The key insight is: higher temperature doesn't make the model 'smarter' — it makes it more random. For engineering tasks I almost always start at 0 and only increase if the output feels repetitive or robotic."

---

## 6. Cost Estimation Mental Model

```
ESTIMATE LLM API COST FOR A FEATURE

Step 1: Count input tokens per call
  - System prompt: ~200 tokens
  - User message: ~100 tokens
  - Retrieved context (RAG): ~1,000 tokens
  - Total input: ~1,300 tokens

Step 2: Estimate output tokens
  - Short answers: 100-200 tokens
  - Detailed responses: 300-500 tokens
  - Code generation: 500-2,000 tokens

Step 3: Apply cost
  GPT-4o (approximation): 
    input = $0.0025 / 1K tokens → 1,300 tokens = $0.00325
    output = $0.010 / 1K tokens → 300 tokens = $0.003
    Total per call: ~$0.006

Step 4: Scale
  1,000 calls/day × $0.006 = $6/day = $180/month
  
  At 10,000 calls/day: ~$1,800/month — this is where 
  caching and model selection decisions start to matter
```

---

## 7. Hruday's Real Experience Hook
> "When I first integrated OpenAI into a Spring Boot service, I set temperature=1 for a structured JSON extraction task and the output field names changed unpredictably across calls. The downstream React component was parsing a field called `email` that was sometimes `contact_email`, sometimes `emailAddress`. Setting temperature=0 fixed the consistency issue immediately. Understanding that temperature controls the probability distribution — not the model's 'creativity' — let me reason about which setting to use and why."

---

## 8. Scale Evolution

**Prototype →** Single API call, manual prompt, check temperature only; 100-500 calls/day; cost is trivial.

**Production feature →** Context management matters; system prompts are versioned; temperature is set per task type; cost is tracked per feature.

**High-scale platform →** Semantic caching to avoid repeat calls; model tiering (cheap fast model for easy tasks, expensive model for complex ones); context compression to maximise information density per token; cost monitoring with alerts.

---

## 9. Company Relevance

| Company | Why LLM fundamentals matter here | Interview signal |
|---------|----------------------------------|-----------------|
| Razorpay / PhonePe | AI-powered fraud detection, support chatbots; engineers expected to integrate LLMs; structured output reliability is critical for financial data | Demonstrate temperature=0 + JSON mode for reliable financial data extraction |
| Swiggy / Meesho | Product personalisation, review summarisation, catalogue tagging; cost-per-call matters at scale | Cost estimation at 10M calls/day; model selection trade-offs |
| Adobe / Microsoft | LLM APIs are internal infrastructure; copilots and creative AI are core products; deep model understanding expected | Context window design for long documents; token counting and cost architecture |
| SAP Labs | SAP AI Core and Joule AI assistant; Spring AI integration for enterprise tooling; LLM fundamentals are the foundation | Spring AI = Java-native LLM integration; SAP engineers expected to work with Joule prompts in 2025-2026 |

---

## 10. Related Topics — What to Study Next

- **Topic 338 — Prompt Engineering** — the techniques for getting reliable output from the model mechanics described here
- **Topic 339 — LLM Limitations** — hallucinations, context limits (covered briefly here), and stale knowledge
- **Topic 340 — Tokens and Cost** — deeper cost estimation methodology
- **Topic 344 — Vector Databases** — RAG architecture places large retrieved contexts into the context window — these topics connect

---

*Part 21 · How LLMs Work — Tokens, Context Window, Temperature, Top-p · Full Stack Interview Guide · Hruday D · 2026*
