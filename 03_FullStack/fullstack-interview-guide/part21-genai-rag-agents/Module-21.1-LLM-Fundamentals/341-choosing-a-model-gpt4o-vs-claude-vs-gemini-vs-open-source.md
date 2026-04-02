# Choosing a Model — GPT-4o vs Claude vs Gemini vs Open-Source (Llama, Mistral)
> Part 21 — Generative AI for Full Stack Engineers · LLM Fundamentals
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **No model is best at everything**: GPT-4o is strong at instruction-following + JSON mode + tool use; Claude is strongest at long-context reasoning and nuanced writing; Gemini is tightly integrated with Google Cloud; open-source (Llama, Mistral) is best when data cannot leave your infrastructure
- **The primary decision axes are**: accuracy on your specific task, cost at your volume, latency for your UX requirement, data privacy requirement (can you send data to a third-party API?), and deployment model (hosted API vs self-hosted)
- **Enterprise / regulated data → open-source self-hosted**: sending PII, financial records, or health data to a third-party LLM API is a compliance risk at most regulated companies; Llama or Mistral self-hosted on your cloud gives full data control
- **Speed-sensitive UX needs the small model tier**: GPT-4o-mini, Claude Haiku, Gemini Flash — latency is 200-400ms vs 1-3s for frontier models; for chat UI where token streaming matters, the faster model wins even if it's slightly less accurate
- **Always task-test before committing**: LLM benchmarks (MMLU, HumanEval etc.) measure general capability; your task is not a benchmark; run your specific test cases on 2-3 candidate models and pick the one that works best for YOUR input/output pair — not the one with the best leaderboard score
- **Cost is multiplicative**: a model that is 3× more expensive at 10 DAU becomes a $90K/year difference at 100K DAU; the model tier decision is a product-economics decision, not just a technical one

---

## 1. One-Line Definition
Model selection is a decision that trades off accuracy, cost, latency, and data privacy for a specific task; the right model is the cheapest one that meets your accuracy and privacy requirements.

---

## 2. The Problem It Solves

"Just use GPT-4" is not an engineering decision — it's a default. Default is fine for a prototype. In production, the model choice directly affects monthly cost, latency SLA, data compliance posture, and fallback capability.

An engineer who can articulate "I chose GPT-4o-mini because our task is structured classification, the latency requirement is < 500ms, and GPT-4o-mini is 17× cheaper with identical accuracy on our test set" signals senior-level thinking about LLM integration. An engineer who says "I used the best model available" does not.

---

## 3. Model Landscape

### Tier Overview

```
FRONTIER MODELS (Highest accuracy, highest cost, hosted only)

GPT-4o (OpenAI)
  Strengths: JSON mode, tool use / function calling, instruction-following,
             vision (image input), code generation
  Context: 128K tokens
  Latency: 1-3s for typical completions (streaming starts faster)
  Cost:    ~$0.0025/1K input, ~$0.010/1K output
  Best for: complex multi-step tasks, structured data extraction, 
            tool use / agents, code generation

Claude Sonnet 3.5 / Claude 3 Opus (Anthropic)
  Strengths: long-context reasoning (200K window), nuanced writing,
             following complex nested instructions, safety
  Context: 200K tokens
  Latency: similar to GPT-4o
  Cost:    Sonnet ~$0.003/1K input, ~$0.015/1K output
  Best for: long document analysis, legal/compliance text, 
            coding tasks, situations requiring nuance

Gemini 1.5 Pro (Google)
  Strengths: extremely large context (1M tokens), native multimodal,
             tight GCP integration
  Context: 1M tokens (experimental)
  Best for: Google Cloud shops; audio/video analysis; 
            tasks requiring very long context (full codebase, large PDFs)

─────────────────────────────────────────────────────────────────────────

FAST / CHEAP MODELS (Good accuracy, much lower cost, 2-5× faster)

GPT-4o-mini (OpenAI)
  Cost:    ~$0.000150/1K input, ~$0.000600/1K output (~17× cheaper)
  Latency: 200-500ms typical
  Best for: classification, short Q&A, first-pass filtering, 
            high-volume low-latency tasks

Claude Haiku 3.5 (Anthropic)
  Cost:    ~$0.0008/1K input, ~$0.004/1K output
  Latency: fast
  Best for: same as GPT-4o-mini; slightly different strengths/weaknesses

Gemini Flash (Google)
  Best for: GCP-native applications requiring speed

─────────────────────────────────────────────────────────────────────────

OPEN-SOURCE / SELF-HOSTED (Data stays in your infrastructure)

Llama 3 (Meta) — 8B, 70B parameter variants
  Strengths: strong general capability; 70B is near-frontier for many tasks;
             completely open weights; no API call — pure inference cost
  Deployment: Ollama (local), vLLM (cluster), AWS Bedrock, Azure AI
  Best for: regulated industries (banking, healthcare, enterprise); 
            cases where data cannot leave company infrastructure;
            cost-predictable inference at scale

Mistral (Mistral AI) — 7B, Mixtral 8×7B
  Strengths: efficient; Mixtral 8×7B (mixture of experts) 
             punches above its parameter count
  Best for: European companies (Mistral is French; EU data residency);
            code tasks (Codestral variant); fast inference

CodeLlama / StarCoder (code-specialised)
  Best for: specifically code generation / completion tasks where 
            data is sensitive (internal codebase, proprietary logic)
```

---

## 4. Decision Framework

### The 5-Question Model Selection checklist

```
Q1: Can the data leave our infrastructure?
    YES → consider cloud APIs (OpenAI, Anthropic, Google)
    NO  → must be self-hosted (Llama, Mistral, CodeLlama)
    
    Data that typically cannot leave:
    - PII (covered in Topic 384)
    - Financial records
    - Patient health data
    - Proprietary product/codebase data

Q2: What is the latency requirement?
    < 500ms response (chat UX) → use mini/small tier + streaming
    1-3s acceptable            → frontier tier is fine
    Batch processing (async)   → latency doesn't matter; use best accuracy model

Q3: What is the cost at target scale?
    Calculate: cost/call × calls/day × 30
    If monthly cost > budget threshold → model-tier down + test accuracy
    
Q4: How complex is the task?
    Classification / labelling → small model usually sufficient
    Structured extraction      → small model with temperature=0, often fine
    Multi-step reasoning       → frontier model; try CoT
    Code generation            → GPT-4o or Claude Sonnet; test output quality
    Long document analysis     → Claude (200K context) or Gemini (1M context)

Q5: What does your test set show?
    Build a 50-100 sample evaluation dataset.
    Run all candidate models on it.
    Pick the cheapest model that meets your accuracy threshold.
    This step is MANDATORY before production — leaderboard scores 
    are not a substitute for testing on your actual use case.
```

---

## 5. The Pattern in Practice

### Wrong Way — Default to the best model

```
❌ "We'll use GPT-4o for everything — it's the best model."

Consequence (real example at scale):
  High-volume classification task: 50,000 calls/day
  GPT-4o: $0.007/call → $350/day → ~$10,500/month
  
  After testing GPT-4o-mini on a 200-sample eval set:
  GPT-4o accuracy: 94%
  GPT-4o-mini accuracy: 93% (acceptable — this is a filter, not final decision)
  GPT-4o-mini cost: $0.00042/call → $21/day → ~$630/month
  
  Saving: $9,870/month for 1% accuracy reduction that is acceptable.
```

```
✅ Model tiering + evaluation-first:
  
  Tier 1: GPT-4o-mini for first-pass classification
           → 90% of queries handled here at minimal cost
  
  Tier 2: GPT-4o for complex queries escalated from Tier 1
           → remaining 10% that need deeper reasoning
  
  Result:
  0.9 × $0.00042 + 0.1 × $0.007 = $0.000378 + $0.0007 = ~$0.001/call
  $50/day → $1,500/month
  vs. $10,500/month for GPT-4o only
  
  Build the evaluation set FIRST.
  Let the data decide the model tier split.
```

---

## 6. Spring AI — Model Selection in Java

```java
// Spring AI abstracts model selection — swap models by configuration

// application.yaml
// spring:
//   ai:
//     openai:
//       api-key: ${OPENAI_API_KEY}
//       chat:
//         options:
//           model: gpt-4o-mini   ← easy swap

@Service
public class DocumentClassificationService {
    
    private final ChatClient chatClient;
    
    public ClassificationResult classify(String document) {
        // Fast, cheap model for classification
        return chatClient.prompt()
            .system("Classify document into: INVOICE, CONTRACT, OTHER. Return JSON.")
            .user(document)
            .options(OpenAiChatOptions.builder()
                .withModel("gpt-4o-mini")   // explicit model override
                .withTemperature(0.0)
                .build())
            .call()
            .entity(ClassificationResult.class);
    }
    
    public AnalysisResult analyzeComplex(String document) {
        // Frontier model for complex analysis
        return chatClient.prompt()
            .system("Analyze the contractual obligations in this document.")
            .user(document)
            .options(OpenAiChatOptions.builder()
                .withModel("gpt-4o")        // upgraded for complex task
                .withTemperature(0.0)
                .build())
            .call()
            .entity(AnalysisResult.class);
    }
}
```

---

## 7. Interview Questions & Model Answers

### Q1 — Model selection decision
**Interviewer:** "How would you choose between GPT-4o and an open-source model like Llama for a feature in a fintech product?"

**Hruday:**
> "The first question I'd ask is: what data will this model see? For a fintech product processing payment data or customer PII, sending that data to OpenAI's API is a compliance question — some companies allow it with a DPA, others prohibit it entirely. If the data must stay in our infrastructure, I'd go with Llama 70B self-hosted on our cloud — it's near-frontier quality for most tasks and gives us full data control. If the data is non-sensitive (generic user queries, public product information), I'd evaluate GPT-4o vs GPT-4o-mini on a test set of 100 real examples and pick the cheapest model that meets the accuracy threshold. I wouldn't commit to a model before running that evaluation."

---

## 8. Scale Evolution

**Prototype →** Pick one hosted API, probably GPT-4o; don't over-engineer model selection; just make it work.

**Production →** Evaluate on test set; split into task tiers (cheap for simple, expensive for complex); add model configuration via environment variables so it's swappable without code changes.

**High scale / regulated →** Multi-provider fallback (if OpenAI is down, fall back to Anthropic or a self-hosted model); open-source for sensitive data; model performance monitoring (accuracy, latency, cost per feature tracked monthly); periodic re-evaluation as model landscape evolves.

---

## 9. Company Relevance

| Company | Model selection concern | Interview signal |
|---------|------------------------|-----------------|
| Razorpay / PhonePe | Financial transaction data may not go to third-party APIs; internal model deployment is a real option | Demonstrate awareness of data privacy constraints; self-hosted model design for sensitive transaction data |
| Swiggy / Meesho | High-volume catalogue and review tasks; cost per call at scale is a budget concern | Model tiering; GPT-4o-mini or Gemini Flash for high-volume simple tasks; cost estimation |
| Adobe / Microsoft | Both have proprietary model offerings (Adobe Firefly, Azure OpenAI Service); using in-house/Azure offers better SLAs and compliance | Azure OpenAI (runs OpenAI models on Azure infrastructure with Microsoft data controls) is the preferred path at Microsoft; mention this at interviews |
| SAP Labs | SAP AI Core runs LLMs within the BTP (Business Technology Platform) — data control is paramount for enterprise customers | SAP uses Joule + SAP-hosted AI Core; no customer data leaves SAP's infrastructure; this aligns with the self-hosted rationale |

---

## 10. Related Topics — What to Study Next

- **Topic 340 — Tokens and Cost** — cost estimation is the core quantitative input to model selection
- **Topic 364 — Observability for AI** — once you've chosen a model, observing its accuracy/cost/latency in production is how you verify the choice was correct
- **Topic 384 — PII Handling** — data privacy is the first decision axis in the model selection framework described here

---

*Part 21 · Choosing a Model — GPT-4o vs Claude vs Gemini vs Open-Source · Full Stack Interview Guide · Hruday D · 2026*
