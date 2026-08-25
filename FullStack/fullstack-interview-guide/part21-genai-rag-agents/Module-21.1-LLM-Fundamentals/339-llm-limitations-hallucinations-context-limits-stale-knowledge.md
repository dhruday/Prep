# LLM Limitations — Hallucinations, Context Limits, Stale Knowledge
> Part 21 — Generative AI for Full Stack Engineers · LLM Fundamentals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Hallucination**: the model generates fluent, confident text that is factually wrong; it is not lying — it has no concept of truth; it generates most-likely next tokens, and sometimes the most linguistically likely thing is factually incorrect; no LLM is hallucination-free; the best you can do is design systems that detect or reduce it
- **Context limit**: everything the model uses must fit in the context window; large documents, long conversations, and big RAG retrievals all compete for space; at limit, the model loses older content (recency bias) or throws an error; design for this by summarising history and chunking documents
- **Stale knowledge**: LLMs have a training cutoff; events, APIs, libraries, and prices that changed after the training date are unknown to the model; GPT-4o's training cutoff is approximately Oct 2023 — asking it about 2025 events will produce hallucinations or "I don't know" responses; RAG exists specifically to patch this limitation by injecting fresh data at query time
- **Verbosity bias**: models are trained on human feedback that tends to rate longer, more detailed answers higher; this creates a bias toward verbose output; models can add confident-sounding filler that is factually thin; for engineering tasks, constrain length and format explicitly
- **Lost-in-the-middle problem**: when you put 50 pages of context into the prompt, the model is better at recalling information from the beginning and end of the context; middle content is statistically more likely to be missed; chunk and rerank retrieved documents to put the most relevant content first and last
- **Mitigation hierarchy**: for factual questions, RAG > fine-tuning > prompting; RAG injects current facts at query time; fine-tuning teaches the model new patterns but can overwrite existing knowledge and adds cost; prompting alone cannot add knowledge the model doesn't have

---

## 1. One-Line Definition
LLM limitations are the structural constraints of the underlying architecture — token prediction, fixed training data, and bounded working memory — that make models unreliable for tasks requiring real-time truth, long-term memory, or guaranteed factual accuracy.

---

## 2. The Problem It Solves

A product manager asks: "Why did the AI assistant give a customer the wrong refund amount?"

Without understanding limitations, the answer is: "The AI made a mistake — we'll change the prompt."

With understanding limitations:
- "The model hallucinated the refund policy because the policy changed after its training cutoff — we needed RAG to inject the current policy at query time"
- "The refund terms were in a 50-page PDF and landed in the middle of the context — the model missed it; we need better chunking and reranking"
- "The model was told to give a 'helpful' answer and when it didn't know, it guessed rather than saying 'I don't know' — we need an explicit 'say I don't know' instruction in the system prompt"

Understanding the limitation tells you which mitigation to apply.

---

## 3. Each Limitation in Depth

### Hallucination

```
WHAT IT IS:
  The model outputs fluent, confident, factually incorrect text.
  
  Examples:
  - Inventing citations that look real but don't exist
  - Describing a library API with methods that don't exist
  - Calculating a wrong number with confident explanation
  - Summarising a document and adding detail that wasn't in the source

WHY IT HAPPENS:
  The model is a token predictor. It generates the most statistically 
  likely continuation of the text. Sometimes the most linguistically 
  likely continuation is not the factually accurate one.
  
  The model has no "knowledge module" separate from its weights.
  It cannot "check" its answer against a truth store.

DETECTION APPROACHES:
  1. Grounding: for every claim, require a citation from the 
     retrieved source document (RAG-based systems only)
  
  2. Self-consistency: run the same prompt 3-5 times at temperature 
     slightly above 0; if answers differ across runs, flag as uncertain
  
  3. Verification layer: use a second LLM call to check the first 
     output against the source document ("Does this summary contradict 
     the original document?")
  
  4. Structured output + schema validation: if the output must be JSON 
     with specific types, any non-conforming hallucination is caught at 
     parse time

MITIGATION:
  - RAG: don't rely on the model's internal knowledge for facts; 
    retrieve and inject fresh, cited documents
  - Explicit instruction: "If you don't know the answer, say exactly 
    'I don't have enough information to answer this accurately.'" — 
    models follow this instruction more faithfully than you might expect
  - Low temperature: reduces creativity, reduces hallucination frequency 
    on factual tasks
```

### Context Limit and Recency Bias

```
CONTEXT LIMIT:
  Every token in the prompt + every generated token counts 
  against the context window.
  
  At 128K context (GPT-4o):
  - 50-page PDF = ~30,000 tokens — fills 23% of context
  - 100 chat turns = ~20,000 tokens — fills 15%  
  - System prompt = ~1,000 tokens
  
  For a long conversation + large document:
  Context fills faster than you think.

RECENCY BIAS:
  When context is full, the model drops the oldest tokens first 
  (most providers use a sliding window).
  This means early system instructions can be "forgotten" 
  in very long conversations.
  
LOST-IN-THE-MIDDLE:
  Research (Liu et al., 2023) showed that LLMs recall information 
  from the start and end of long contexts significantly better 
  than from the middle.
  
  Mitigation: put the most relevant retrieved chunk FIRST in the 
  context, not last. If you have 10 chunks from RAG, put the 
  top-scored chunk at position 1, not buried in the middle.

DESIGN PATTERNS:
  1. Context compression: summarise old conversation turns 
     rather than keeping them verbatim
  
  2. Context priority: system prompt > recent messages > older messages
  
  3. Chunked retrieval: don't put the whole document in context; 
     retrieve and inject only the relevant 3-5 chunks
```

### Stale Knowledge (Training Cutoff)

```
TRAINING CUTOFF EXAMPLES (approximate):
  GPT-4o:           October 2023
  Claude 3.5 Sonnet: early to mid 2024
  Llama 3 (Meta):    early 2024
  
WHAT THE MODEL DOESN'T KNOW AFTER CUTOFF:
  - New library versions, breaking API changes
  - Pricing, regulations, policies that changed
  - Events, news, acquisitions
  - New products, tech releases

EXAMPLE FAILURE:
  Prompt: "What is the current Spring Boot minimum Java version?"
  Response: "Spring Boot 3.x requires Java 17."
  
  If Spring Boot 4.x has launched after the cutoff and requires 
  Java 21, the model gives the old answer with total confidence.

MITIGATION — RAG:
  Retrieve current documentation from an authoritative source at 
  query time and inject it into the context. The model now has 
  fresh data even though it wasn't in training.
  
  Retrieval source examples:
  - Internal knowledge base (company policies, product docs)
  - Vector DB indexed with refreshed documentation
  - Real-time API call result (weather, pricing, availability)

MITIGATION — Acknowledge cutoff:
  For time-sensitive tasks, always include the current date in 
  system prompt: "Today is 14 January 2025. Use this to resolve 
  any time-relative questions." 
  This helps the model self-identify when it might be out of date.
```

---

## 4. The Pattern in Practice

### Wrong Way — Assuming the model knows current facts

```
❌ System prompt: "Answer customer questions about our return policy."

Problem: The return policy is stored in an internal document 
that was last updated 6 months after the model training cutoff.
The model will answer based on an old version of the policy 
(or its best inference of what a typical return policy looks like).

At Razorpay or a fintech company, this is a regulatory risk.
```

```
✅ RAG-grounded system prompt:
  
  "Answer customer questions about our return policy.
   Use ONLY the policy document retrieved below.
   If the answer is not in the document, say exactly:
   'I don't have enough information to answer this — please 
   contact our support team at support@example.com.'
   
   POLICY DOCUMENT:
   {{retrieved_policy_chunks}}"

Why this works:
- Fresh policy injected at query time (not baked into model weights)
- Explicit constraint: use only retrieved content, not model knowledge
- Explicit fallback instruction for unknown questions
- If policy changes, re-index the vector DB — no model update needed
```

---

## 5. Interview Questions & Model Answers

### Q1 — Hallucination
**Interviewer:** "A customer chatbot built with an LLM is giving users wrong information. What's your debugging approach?"

**Hruday:**
> "I'd first classify the failure: is the model hallucinating (generating wrong facts), or is it using outdated training data (stale knowledge), or is the relevant information not making it into the context (retrieval failure)? For hallucination, I'd check whether the answer contradicts the source document — if so, the model invented it. Fix: add a 'use only the retrieved document' constraint and a 'say I don't know' fallback instruction. For stale knowledge, I'd check when the information last changed and compare to the model's training cutoff — if the change post-dates the cutoff, the model simply doesn't know; fix is RAG. For retrieval failure, I'd check whether the correct chunk is being retrieved and whether it's landing in the middle of a large context (lost-in-the-middle)."

---

### Q2 — Architecture implication
**Interviewer:** "What design patterns do you use to handle LLM limitations in production?"

**Hruday:**
> "Three patterns. First, RAG for knowledge freshness and hallucination reduction — I retrieve from an authoritative source at query time rather than relying on the model's training data. Second, structured outputs with schema validation — if the response is supposed to be JSON with specific types, any hallucinated extra field or wrong type is caught immediately at parse time, not discovered by a customer. Third, explicit fallback instructions in the system prompt — models follow 'if you don't know, say exactly X' instructions quite reliably, which is far better than confident hallucination."

---

## 6. Hallucination Rate Benchmarks (Approximate)

```
Tasks where hallucination risk is highest:
  - Asking for specific URLs or citations: very high
  - Asking for numerical facts (percentages, prices): high  
  - Asking for dates of specific events: high
  - Code with APIs the model may not know: medium-high

Tasks where hallucination risk is lower:
  - Summarising text you provide: low (grounded in context)
  - Classifying / labelling provided text: low
  - Reformatting / transforming provided data: low
  - Writing to an explicit schema with examples: low

Design principle: ground the model in provided data whenever possible.
Tasks that require the model to "recall" facts from training 
carry the highest hallucination risk.
```

---

## 7. Hruday's Real Experience Hook
> "I was building a support assistant where the model was answering questions about our product's integration docs. It was giving technically plausible but wrong answers about one particular API endpoint — confident, well-formatted JSON examples with method names that didn't exist. The documentation for that endpoint was added after the model's training cutoff; the model had never seen it. Switching to RAG (indexing our current docs in pgvector and retrieving at query time) fixed it. The lesson was concrete: the model's knowledge is frozen at training; if your product is newer or changed, you must inject current documentation."

---

## 8. Scale Evolution

**Prototype →** Note the limitations but don't over-engineer; manual review of outputs is acceptable.

**Production small scale →** RAG for freshness; schema validation for output reliability; 'say I don't know' fallback instruction.

**High scale →** Automated hallucination detection pipeline (second LLM call to verify claims against sources); confidence scoring; human-in-the-loop escalation for low-confidence answers; guardrail layer before response reaches users.

---

## 9. Company Relevance

| Company | Primary limitation risk | Mitigation they expect |
|---------|------------------------|----------------------|
| Razorpay / PhonePe | Hallucinated payment/compliance policy details are a regulatory and reputational risk | RAG over authoritative internal policy documents; no model-generated financial advice without cited source |
| Swiggy / Meesho | Stale product catalogue, outdated prices | Real-time data injection or catalogue retrieval at query time; never rely on model weights for product prices |
| Adobe / Microsoft | Hallucinated API references in Copilot features | Grounding in current SDK documentation; structured output + syntax validation |
| SAP Labs | Compliance and legal context varies by customer country; stale regulatory knowledge is dangerous | RAG from customer-specific knowledge bases; Joule AI at SAP is designed with retrieval grounding for this reason |

---

## 10. Related Topics — What to Study Next

- **Topic 342 — Why RAG Exists** — RAG is the primary architectural solution to both hallucination and stale knowledge
- **Topic 338 — Prompt Engineering** — explicit instructions in prompts ('say I don't know') are a low-cost first line of defence
- **Topic 340 — Tokens and Cost** — context limit is tied to cost; managing context = managing cost

---

*Part 21 · LLM Limitations — Hallucinations, Context Limits, Stale Knowledge · Full Stack Interview Guide · Hruday D · 2026*
