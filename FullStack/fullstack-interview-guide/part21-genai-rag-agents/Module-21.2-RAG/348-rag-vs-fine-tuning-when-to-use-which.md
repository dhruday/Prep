# RAG vs Fine-Tuning — When to Use Which
> Part 21 — Generative AI for Full Stack Engineers · RAG
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **RAG = inject knowledge at query time**: retrieve relevant documents → add to prompt → LLM uses them; knowledge is external, updatable in real-time, citable; no model training
- **Fine-tuning = bake knowledge/patterns into model weights**: train additional passes on your dataset; changes how the model reasons, responds, or formats output; expensive to update (requires retraining)
- **The interview answer**: "For dynamic knowledge that changes (docs, policies, product info), use RAG — update the vector DB, instantly reflected. For teaching the model a new reasoning pattern, output style, or domain-specific behaviour, use fine-tuning — the model learns HOW to do something, not WHAT the latest facts are."
- **Fine-tuning is NOT for injecting facts**: studies show fine-tuned models still hallucinate facts; they just hallucinate with more confidence; fine-tuning changes behaviour, not knowledge reliability
- **Cost asymmetry**: RAG is cheap to update (re-index one document in seconds); fine-tuning requires a training job (hours, $10-$1,000+ per run depending on model size); maintenance cost compounds with every knowledge update
- **Combining both (best of both worlds)**: fine-tune for STYLE/FORMAT/REASONING, add RAG for KNOWLEDGE; a customer support bot may be fine-tuned on support conversation tone + RAG for current product documentation

---

## 1. One-Line Definition
RAG adds knowledge to the prompt at runtime; fine-tuning changes the model's weights to alter its behaviour patterns — they solve fundamentally different problems and are most powerful when combined.

---

## 2. Side-by-Side Comparison

| Dimension | RAG | Fine-Tuning |
|-----------|-----|-------------|
| What it changes | Prompt content (retrieved documents) | Model weights |
| Knowledge freshness | Real-time (update vector DB) | Frozen at training time |
| Update cost | Re-index one document: seconds | Re-run training job: hours + $ |
| What it's good for | Dynamic facts, domain-specific knowledge, long documents | Tone, format, reasoning pattern, task-specific behaviour |
| Debuggability | Can log and inspect retrieved chunks | Hard to interpret why model changed behaviour |
| Citeability | Can show source documents | No source citation |
| Cost to implement | Low (Spring AI + pgvector) | Medium-high (training job, eval pipeline, versioning) |
| Risk | Wrong retrieval → wrong answer | Catastrophic forgetting, overfitting, harder rollback |

---

## 3. When to Use RAG

```
USE RAG WHEN:

1. KNOWLEDGE CHANGES FREQUENTLY
   - Company policy updated monthly → re-index, done
   - Product docs ship with every release → auto-ingest pipeline
   - Pricing info → real-time data retrieval integration
   
2. KNOWLEDGE BASE IS LARGE AND SPECIFIC
   - 10,000-page product manual → can't fit in context → retrieve sub-sections
   - Customer purchase history → per-customer knowledge injection
   
3. CITATIONS ARE REQUIRED
   - "Here's the answer, sourced from HR Policy v4.2, Section 3.1"
   - Regulated industries: financial, healthcare, legal
   - Users need to verify answers against source

4. YOU NEED FAST ITERATION
   - Update the knowledge base without any ML pipeline
   - Non-ML engineers can maintain the knowledge base
   - A/B test different knowledge sources without model changes
   
5. YOU DON'T HAVE TRAINING DATA
   - Fine-tuning requires hundreds of quality training examples
   - RAG works from day one with just the source documents

EXAMPLES:
  Customer support chatbot → RAG (policy docs change regularly)
  Internal IT helpdesk     → RAG (config guides update with each release)
  Merchant documentation   → RAG (product docs versioned with API releases)
```

---

## 4. When to Use Fine-Tuning

```
USE FINE-TUNING WHEN:

1. TEACHING A SPECIFIC FORMAT OR RESPONSE STYLE
   - "Always respond in exactly this JSON schema for our API"
   - "Use a professional but empathetic tone for all responses"
   - "For support tickets, always include: diagnosis + steps + escalation path"
   
   RAG cannot teach the model how to format output — it can only 
   add content to the prompt.

2. TEACHING DOMAIN-SPECIFIC REASONING PATTERNS
   - Legal reasoning that follows specific statutory interpretation rules
   - Medical triage logic that follows specific clinical decision trees
   - Financial risk classification based on internal criteria
   
3. REDUCING LATENCY / COST BY INTERNALISING COMMON KNOWLEDGE
   - If 90% of queries touch the same base knowledge:
     fine-tune that knowledge in → no retrieval needed for most calls
   - Then RAG only activates for the remaining 10% that needs fresh data
   
4. SMALLER MODEL SPECIALISATION
   - Instead of GPT-4o ($0.0025/1K input) for a specific task,
     fine-tune a smaller model (GPT-3.5 equivalent) to match quality
     → 10× cost reduction at same accuracy for that specific task
   
5. YOU HAVE QUALITY TRAINING DATA
   - 500+ high-quality (input, expected_output) pairs
   - Real user interactions that have been reviewed and corrected
   - Without quality data, fine-tuning makes things worse

EXAMPLES:
  Code review comments (company style) → fine-tune (consistent format)
  ABAP code assistant (SAP DSL)        → fine-tune (non-standard syntax)
  Customer support tone adjustment     → fine-tune (voice/personality)
```

---

## 5. The Combined Approach

```
BEST-IN-CLASS PATTERN:
  Fine-tune for HOW (style, format, reasoning)
  RAG for WHAT (current, accurate, citable knowledge)

EXAMPLE: Customer Support Bot at a Fintech Company

FINE-TUNING COMPONENT:
  Train on 500+ reviewed support conversations.
  Model learns:
  - Empathetic but concise tone
  - Always include resolution time estimate
  - Format: [greeting + diagnosis + steps + next action]
  - Never discuss competitor products
  
FINE-TUNING DOES NOT TEACH:
  - Current refund timelines (changes monthly)
  - Current API rate limits (change with product updates)
  - Current account-specific information

RAG COMPONENT:
  Knowledge base: 
  - Current product documentation (re-indexed weekly)
  - Current policy documents (re-indexed on update)
  - User's account data retrieved live from API
  
RESULT:
  Fine-tuned model speaks with consistent brand voice.
  RAG ensures the facts are current and citable.
  Neither technique alone achieves both goals.
```

---

## 6. The Pattern in Practice

### Wrong Way — Fine-tuning to inject facts

```
❌ Common mistake:
  "Our new API v3 launched in October. Let's fine-tune the model 
   on v3 docs so it knows about the new endpoints."
  
  Problems:
  - Training job takes 3-4 hours; API v4 launches in 3 months
  - Fine-tuned model still hallucinated v2 details for edge cases
    (catastrophic forgetting doesn't always fully overwrite old knowledge)
  - v3 endpoints are not cited in answers — user cannot verify
  - When v4 launches: another training job, same problems
  
  Fine-tuning is the wrong tool for injecting facts that change.
```

```
✅ RAG for facts, no fine-tuning needed:
  
  - Index API v3 docs in vector DB (takes 10 minutes)
  - System prompt: "Use only the API documentation provided."
  - Query: "How do I use the new payment webhook in API v3?"
  - Retriever fetches the v3 webhook section
  - LLM answers with citation: "From API v3 docs, section 4.2..."
  
  When v4 launches:
  - Re-index v4 docs (10 minutes)
  - Done. No training job. No model deployment.
```

---

## 7. Interview Questions & Model Answers

### Q1 — The classic comparison
**Interviewer:** "A customer wants their support chatbot to know about our latest product update AND respond in a specific professional tone. How would you architect this?"

**Hruday:**
> "Two separate techniques for two separate problems. The professional tone is a behavioural pattern — I'd fine-tune on 300-500 reviewed example conversations where the responses are already in the desired tone; the model internalises the format and voice. The product update knowledge is a fact-injection problem — I'd use RAG with the updated product docs indexed in pgvector; the retriever fetches the relevant documentation at query time; no retraining needed when the product updates. Combining both: the fine-tuned model handles the style, and RAG handles the knowledge. Neither technique alone achieves both."

---

## 8. Decision Tree

```
Is the primary need injection of current, factual knowledge?
  YES → Use RAG

Does the knowledge change frequently (monthly or more)?
  YES → Use RAG (fine-tuning is too expensive to keep updated)

Does the task require a specific output format, tone, or reasoning style?
  YES → Consider fine-tuning

Do you have 300+ quality training examples for that style/format?
  YES → Fine-tune
  NO  → Use few-shot prompting in the system prompt (cheaper, faster)

Should you combine both? 
  Ask: does my current system fail on style OR knowledge?
  Both → combine
  Just style → fine-tune alone
  Just knowledge → RAG alone
```

---

## 9. Scale Evolution

**Prototype →** RAG first; almost always; zero ML pipeline needed; iterate quickly on knowledge base.

**Scale / quality →** Evaluate whether base model's tone is acceptable; if a consistent style issue emerges, collect training examples; fine-tune only after RAG is stable.

**Enterprise →** Combined approach: fine-tune for domain reasoning + RAG for knowledge; separate knowledge base per product domain; access-controlled retrieval by user role.

---

## 10. Company Relevance

| Company | Architecture likely to use | Interview signal |
|---------|---------------------------|-----------------|
| Razorpay / PhonePe | RAG for policy+API docs; fine-tune optionally for fintech-specific tone + compliance language | Defend RAG-first for a fast-changing API platform |
| Swiggy / Meesho | RAG for live catalogue + order status; fine-tune for conversational Hindi/English code-switch support | Multilingual fine-tuning awareness; live data RAG |
| Adobe / Microsoft | Fine-tune for productivity/creative domain reasoning; RAG for product docs via Microsoft Graph | Large-scale RAG over SharePoint + Teams; fine-tuning via Azure ML |
| SAP Labs | Fine-tune for SAP business process reasoning + ABAP-specific code; RAG for SAP Help documentation | SAP AI Core fine-tuning pipeline; combined approach for Joule assistant |

---

## 11. Related Topics — What to Study Next

- **Topic 342 — Why RAG Exists** — RAG motivation and problem framing
- **Topic 343 — RAG Architecture** — implementation of the retrieval + generation pipeline
- **Topic 341 — Choosing a Model** — base model selection affects fine-tuning feasibility and cost

---

*Part 21 · RAG vs Fine-Tuning — When to Use Which · Full Stack Interview Guide · Hruday D · 2026*
