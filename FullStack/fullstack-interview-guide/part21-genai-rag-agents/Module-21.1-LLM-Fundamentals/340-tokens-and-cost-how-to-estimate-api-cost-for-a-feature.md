# Tokens and Cost — How to Estimate API Cost for a Feature
> Part 21 — Generative AI for Full Stack Engineers · LLM Fundamentals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The cost formula**: `Total cost = (input_tokens × input_price) + (output_tokens × output_price)` — input and output are priced separately; output tokens cost 3-4× more than input tokens on most APIs, because generating each output token is computationally heavier than reading input
- **Estimate 1K words ≈ 1,300 tokens**: 1 English word averages ~1.3 tokens under BPE tokenization; code is similar; PDFs and HTML have overhead from formatting tokens; use 1,300 tokens per 1,000 words as your estimation constant
- **System prompt is an input cost that repeats every call**: a 1,000-token system prompt costs 0.1¢ (at $0.001/1K) per call; at 10,000 calls/day that's $10/day = $300/month just for the system prompt; keep system prompts concise and use prompt caching where available
- **Output tokens dominate cost for long generations**: GPT-4o input ≈ $0.0025/1K, output ≈ $0.010/1K; generating a 500-word answer costs more than sending a 2,000-word context; instruct the model to be concise when length is not the goal
- **Three cost levers**: (1) choose a cheaper model for simpler subtasks — GPT-4o-mini at ~10× cheaper than GPT-4o for classification; (2) reduce output length — constrain to the minimum needed; (3) cache repeated prompts — semantic caching reduces API calls for repeated questions
- **Cost before you commit**: estimate total monthly cost at expected volume before starting implementation; if the feature costs $3k/month at 10k DAU, that's a product conversation before a single line of code

---

## 1. One-Line Definition
Token cost estimation is the ability to calculate the expected API bill for an LLM feature before building it, and to identify which components (input size, output length, model tier, call volume) are the primary cost drivers.

---

## 2. The Problem It Solves

A senior engineer proposes an AI-powered code review assistant for a team of 50 developers. Without cost estimation, it ships. Then the first monthly bill arrives: $8,400. The feature is shut down.

With cost estimation upfront:
- 50 developers × 20 PRs/month = 1,000 PRs/month
- Each PR = 500 lines of code ≈ 3,000 tokens input + 300 tokens output
- Model: GPT-4o
- Input: 1,000 × 3,000 × $0.0025/1K = $7.50
- Output: 1,000 × 300 × $0.010/1K = $3.00
- Total: $10.50/month — that's $0.01/PR, easily justified

Or, using GPT-4o-mini at ~10× cheaper: $1.05/month. The question becomes: is GPT-4o accuracy worth the 10× cost premium for this use case? Test-first, then decide.

Cost estimation turns guesswork into a design decision.

---

## 3. Tokenisation and Estimation Constants

### How to Count Tokens

```
BPE (Byte Pair Encoding) — tokenizer used by GPT models

Rules of thumb (approximate):
  1 English word       ≈ 1.3 tokens
  1 page A4 text       ≈ 450-600 tokens
  1,000 words English  ≈ 1,300 tokens
  1,000 words code     ≈ 1,200-1,500 tokens (code has symbols + whitespace)
  1 image (GPT-4V)     ≈ 85-765 tokens depending on resolution
  
Exact counts: use tiktoken (Python) or the OpenAI tokenizer playground.

For Java/Spring Boot, approximate and add 20% buffer.
```

### API Pricing Reference (Approximate 2025)

```
MODEL              INPUT           OUTPUT          NOTES
─────────────────────────────────────────────────────────────────────
GPT-4o            $0.0025/1K      $0.010/1K       Flagship; highest quality
GPT-4o-mini       $0.000150/1K   $0.000600/1K    ~17× cheaper input; good for simple tasks
Claude Sonnet 3.5 $0.003/1K      $0.015/1K       Strong reasoning; slightly pricier output
Claude Haiku 3.5  $0.0008/1K     $0.004/1K       Fast + cheap; good for classification

NOTE: Prices change regularly. Check providers' pricing pages before
estimating for any real project. These figures are illustrative.

Cost driver insight:
Output tokens cost 3-4× more than input tokens per unit.
Controlling output length is the highest ROI cost optimization.
```

---

## 4. The Estimation Workflow

### Step-by-Step Cost Estimation

```
STEP 1: IDENTIFY THE INPUTS PER CALL
  - System prompt: [count tokens]
  - Retrieved documents / RAG context: [count tokens]
  - User message: [count tokens]
  - Total input per call: sum of above

STEP 2: ESTIMATE OUTPUT TOKENS PER CALL
  - Short answer / classification: 50-200 tokens
  - Paragraph-length response: 200-500 tokens
  - Code generation snippet: 500-2,000 tokens
  - Long analysis: 1,000-3,000 tokens

STEP 3: CALCULATE COST PER CALL
  Cost/call = (input_tokens × input_price/1K) + (output_tokens × output_price/1K)

STEP 4: ESTIMATE CALL VOLUME
  - Calls/day = users × average calls/user/day
  - Calls/month = calls/day × 30

STEP 5: MONTHLY TOTAL
  Monthly cost = cost/call × calls/month

STEP 6: IDENTIFY TOP COST DRIVER
  Is it input tokens (large docs, big system prompt)?
  Is it output tokens (long generated text)?
  Is it call volume (high traffic)?
  → Optimize the largest driver first
```

### Worked Example — Support Chatbot

```
Feature: Customer support chatbot for Razorpay merchants.
Model: GPT-4o

INPUTS PER CALL:
  System prompt (policies, persona): 800 tokens
  Retrieved policy chunks (RAG, 3 chunks): 1,500 tokens
  User question: 100 tokens
  Chat history (last 3 turns): 400 tokens
  Total input: 2,800 tokens

OUTPUT PER CALL:
  Support response (2-3 paragraphs): 350 tokens

COST PER CALL:
  Input: 2,800 × $0.0025 / 1,000 = $0.007
  Output: 350 × $0.010 / 1,000 = $0.0035
  Total per call: $0.0105 (~1¢)

CALL VOLUME:
  50,000 merchants × 0.3 support queries/day average = 15,000 calls/day
  Monthly: 15,000 × 30 = 450,000 calls

MONTHLY COST:
  450,000 × $0.0105 = $4,725/month

DECISION:
  $4,725/month is viable for a company-level tool.
  
  Cost optimization options:
  - Try GPT-4o-mini for first-pass classification (~$300/month for same volume)
  - Semantic caching for repeated questions (20% cache hit = 20% cost saving)
  - Compress RAG context from 1,500 tokens to 800 tokens via better chunking
  Potential reduction to ~$2,500/month with these changes.
```

---

## 5. Cost Reduction Toolkit

### Wrong Way — Ignoring cost until it's a problem

```
❌ Approach:
  Ship the feature.
  Review cost when the bill arrives.
  Panic when it's $15,000/month.
  Try to optimize under pressure.
```

```
✅ Approach:

BEFORE BUILDING:
  Estimate the cost at 3 scale points:
  - 1,000 users/day (initial launch)
  - 10,000 users/day (growth)
  - 100,000 users/day (scale)
  
  If cost at 100K/day is unsustainable, design the 
  cost optimization INTO the architecture now.

DURING BUILDING:
  1. Model tiering: use cheap model for easy subtasks
     (classification, short answers) and expensive model 
     for complex tasks (analysis, code generation)
  
  2. Output length constraints: add to system prompt:
     "Answer in 2-3 sentences max. Be direct."
     Shorter output = lower cost per call.
  
  3. Prompt caching: Anthropic prefix caching / OpenAI 
     prompt caching — static system prompts are cached; 
     subsequent calls only pay for the non-cached portion.
     Can save 30-50% on system prompt tokens.
  
  4. Semantic caching: before calling the LLM, check if 
     a similar question was already answered recently; 
     return the cached answer (Topic 363 covers this in depth).
  
  5. Input compression: for long documents, summarise 
     before sending to the LLM; or use smaller chunks 
     via better retrieval.
```

---

## 6. Interview Questions & Model Answers

### Q1 — Technical design
**Interviewer:** "You're building an AI feature that analyzes uploaded contracts and answers questions about them. How do you estimate and control the API cost?"

**Hruday:**
> "I'd estimate three components per call: the system prompt (~500 tokens, stable), the retrieved contract chunks (I'd chunk the contract and retrieve only the 3 most relevant sections per question — roughly 1,500 tokens), and the user question (~100 tokens). The answer would be maybe 300 tokens. That's about 2,400 input + 300 output, roughly $0.009 per question at GPT-4o pricing. At 1,000 contract questions per day, that's $9/day, ~$270/month. To control it: I'd use semantic caching so that the same question on the same contract (common for recurring users) is served from cache. I'd also evaluate whether GPT-4o-mini is accurate enough for simpler questions, which would bring cost down by 10-15×."

---

## 7. Token Counting in Java (Spring AI)

```java
// Spring AI provides token counting utilities

import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.tokenizer.JTokkitTokenCountEstimator;

@Service
public class TokenEstimationService {
    
    private final JTokkitTokenCountEstimator estimator = 
        new JTokkitTokenCountEstimator();
    
    public int estimateTokens(String text) {
        return estimator.estimate(text);
    }
    
    public double estimateCostUsd(String input, String output) {
        int inputTokens = estimateTokens(input);
        int outputTokens = estimateTokens(output);
        // GPT-4o approximate pricing
        double inputCost = inputTokens * 0.0025 / 1000;
        double outputCost = outputTokens * 0.010 / 1000;
        return inputCost + outputCost;
    }
}

// Log cost per call in production
log.info("LLM call cost=${} inputTokens={} outputTokens={}",
    cost, inputTokens, outputTokens);
// Feed into cost dashboard / alerting
```

---

## 8. Hruday's Real Experience Hook
> "When I was scoping an AI feature that would auto-summarise customer feedback forms, I ran the cost estimate before writing a single line of code. Each feedback form was ~500 words (~650 tokens), the system prompt was ~400 tokens, and the summary was ~200 tokens. At GPT-4o pricing, that was ~$0.009/form. We had 500 forms per month at that point — $4.50/month. Trivial. But the estimate made me think about scale: at 50,000 forms/month (a realistic growth target), it would be $450/month. That's still acceptable, but it told me to look at GPT-4o-mini for this task. Same quality at 15× lower cost — $30/month at 50k forms. The estimate was done in 20 minutes and informed the model choice for the entire feature."

---

## 9. Scale Evolution

**100 users/day →** Cost is negligible; pick the best model; no caching needed.

**10,000 users/day →** Cost is a real budget line; model tiering, output length constraints, and prompt caching are worth the engineering effort.

**100,000 users/day →** Semantic caching is mandatory; input compression is important; model routing between tiers (cheap for classification, expensive for generation) is architectural.

---

## 10. Company Relevance

| Company | Cost concern | What they expect |
|---------|-------------|-----------------|
| Razorpay / PhonePe | High transaction volume means LLM features at scale very quickly; cost per call × millions of daily transactions = significant monthly bills | Demonstrate model tiering and caching awareness; show cost estimate in the design |
| Swiggy / Meesho | Catalogue-tagging and review-summarisation run at millions of items; batch processing at non-peak hours to reduce cost | Async batch job design; cost-per-unit estimate for catalogue scale |
| Adobe / Microsoft | LLM APIs are core infrastructure cost; LLM cost per product feature is tracked like any cloud cost | Detailed per-call cost logging; cost attribution per feature |
| SAP Labs | Enterprise customers are cost-sensitive; SAP AI Core pricing is passed through to customers | Prompt caching + model tiering design; avoiding unnecessary regeneration of cached answers |

---

## 11. Related Topics — What to Study Next

- **Topic 337 — How LLMs Work** — token mechanics are the foundation for cost calculation
- **Topic 341 — Choosing a Model** — model selection is the highest ROI cost decision
- **Topic 363 — Semantic Caching** — the primary architectural tool for reducing call volume and cost

---

*Part 21 · Tokens and Cost — How to Estimate API Cost for a Feature · Full Stack Interview Guide · Hruday D · 2026*
