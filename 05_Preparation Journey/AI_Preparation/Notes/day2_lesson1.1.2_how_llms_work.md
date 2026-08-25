# Day 2 — Lesson 1.1.2: How LLMs Work (Conceptual)

> **Why this matters:** You won't train LLMs — but you'll build systems on top of them.  
> Understanding how they work helps you **predict failures**, **design around limits**, and **make smart architecture calls**.

---

## Table of Contents
1. [Pre-Training](#1-pre-training)
2. [What "Next Token Prediction" Actually Means](#2-what-next-token-prediction-actually-means)
3. [RLHF — Making Models Helpful](#3-rlhf--making-models-helpful)
4. [RLAIF — Anthropic's Constitutional AI](#4-rlaif--anthropics-constitutional-ai)
5. [What "Billion Parameters" Actually Means](#5-what-billion-parameters-actually-means)
6. [Why Models Have Different "Personalities"](#6-why-models-have-different-personalities)
7. [Model Benchmarks](#7-model-benchmarks)
8. [How to Read a Model Card](#8-how-to-read-a-model-card)
9. [Mini Project — LLM Explainer (2 Versions)](#9-mini-project--llm-explainer-2-versions)
10. [Interview Q&A — All Levels](#10-interview-qa--all-levels)

---

## 1. Pre-Training

### What it is
The model reads a massive chunk of the internet and learns to **predict what word (token) comes next** in any piece of text.

### The data
- Books, Wikipedia, code, Reddit, news, papers — trillions of tokens
- **Unsupervised** — no human labels, no "right answer" — just raw text
- Scale: GPT-3 trained on ~300B tokens. LLaMA-3 on 15T tokens.

### What the model learns (implicitly)
| Skill | How it emerges |
|---|---|
| Grammar & syntax | Seen millions of examples |
| Facts about the world | Encoded in the training text |
| Reasoning patterns | Mathematical, logical text in training data |
| Code | Billions of lines of open-source code |
| Multiple languages | Multilingual training corpus |

> **Key insight:** The model never "reads" for understanding. It just gets extremely good at compression — predicting what comes next forces it to internalize the structure of language and knowledge.

---

## 2. What "Next Token Prediction" Actually Means

### Tokens ≠ Words
A token is roughly 3–4 characters. "ChatGPT is cool" = `["Chat", "G", "PT", " is", " cool"]` — 5 tokens.

### The prediction task
Given: `"The capital of France is"`  
Model outputs a **probability distribution** over every token in its vocabulary (~50,000–100,000 tokens):
```
" Paris"    → 87%
" Lyon"     → 3%
" Rome"     → 1%
...
```
It picks the highest (or samples based on **temperature**).

### Why this is powerful
To predict "Paris" confidently, the model must have encoded:
- What a "capital" is
- That France is a country
- What country-capital relationships look like

All from next-token prediction alone. **No one told it what facts to memorize.**

### Temperature (quick note)
| Temperature | Behavior |
|---|---|
| 0.0 | Always picks the most probable token (deterministic) |
| 0.7–1.0 | Balanced — creative but coherent |
| 2.0+ | Very random, often nonsensical |

---

## 3. RLHF — Making Models Helpful

### The problem with raw pre-training
A raw pre-trained model is a **text completion machine**. Ask it "How do I bake a cake?" and it might respond with another question (because the internet has lots of Q&A forums), or something off-topic.

It is **not** tuned to be helpful, safe, or follow instructions.

### RLHF in 3 steps

```
Step 1: Supervised Fine-Tuning (SFT)
  → Human trainers write ideal responses to prompts
  → Model is fine-tuned on these examples
  → Model learns the format and tone of "being helpful"

Step 2: Train a Reward Model
  → Show human raters 2–4 model responses to the same prompt
  → They rank them: "A is better than B, B is better than C"
  → A separate smaller model (Reward Model) is trained to predict these human preferences
  → Reward Model = a learned "human preference score"

Step 3: RL Optimization (PPO)
  → The main model generates responses
  → Reward Model scores each response
  → Main model is updated via Proximal Policy Optimization (PPO)
  → Goal: generate responses that score high on human preferences
```

### What RLHF teaches the model
- Follow instructions accurately
- Be concise and clear
- Avoid harmful, toxic, or misleading content
- Match tone to context (formal vs casual)

### RLHF failure modes to know
| Problem | What it is |
|---|---|
| **Reward hacking** | Model finds ways to score high that aren't actually helpful (e.g., longer = better in early RLHF) |
| **Sycophancy** | Model agrees with the user even when the user is wrong |
| **Over-refusal** | Model refuses borderline requests to be "safe" |

---

## 4. RLAIF — Anthropic's Constitutional AI

### The problem RLHF has at scale
RLHF requires thousands of human comparisons. It's:
- **Expensive** — human annotators cost money
- **Inconsistent** — different raters have different values
- **Hard to scale** — can't cover every edge case

### What Constitutional AI (CAI) does
Anthropic's approach: **use the AI itself as the rater**, guided by a written Constitution.

```
The Constitution = a list of principles
  e.g., "Be helpful, harmless, and honest"
       "Don't assist with illegal activity"
       "Prioritize the wellbeing of third parties"
```

### CAI in 2 phases

**Phase 1: Supervised Learning from AI Feedback**
1. Model generates a response to a harmful prompt
2. Model critiques its own response using the Constitution  
   *"This response is harmful because it assists with illegal activity"*
3. Model rewrites the response to comply with the Constitution
4. The rewritten response becomes training data

**Phase 2: RL from AI Feedback (RLAIF)**
1. Generate pairs of responses to the same prompt
2. Ask a "preference model" (guided by the Constitution) which is better
3. Use those AI-generated preferences to train a Reward Model
4. Run standard RL (like PPO) using this AI-generated Reward Model

### RLHF vs Constitutional AI — quick comparison
| | RLHF | Constitutional AI |
|---|---|---|
| Feedback source | Humans | AI + written principles |
| Scalability | Limited by human hours | Much more scalable |
| Consistency | Variable (human raters differ) | More consistent (same constitution) |
| Transparency | Implicit in rater preferences | Explicit — you can read the principles |
| Used by | OpenAI (GPT models) | Anthropic (Claude) |

---

## 5. What "Billion Parameters" Actually Means

### What a parameter is
A parameter is a **number (weight)** in the neural network. The model is essentially a giant math function:

```
f(input tokens) → output probability distribution

where f has billions of learnable numbers (parameters)
```

Think of parameters like the "knobs" on an equalizer — each one fine-tunes how the model responds to patterns in input.

### Scale in plain terms
| Model | Parameters | Rough analogy |
|---|---|---|
| GPT-2 | 1.5B | Small town (knows a lot, limited depth) |
| LLaMA-3 8B | 8B | Medium city |
| GPT-3 | 175B | Large country |
| GPT-4 (est.) | ~1.7T | Continent |

### More parameters ≠ more intelligence
Parameters = **capacity to store patterns**, not reasoning ability.

| Myth | Reality |
|---|---|
| Bigger model = smarter | A smaller model trained longer on better data often beats a bigger one |
| More params = more knowledge | Params store statistical patterns, not curated facts |
| Biggest model is always best | GPT-4o-mini outperforms much larger models on many tasks at lower cost |

### Practical implications for engineers
- **Latency** grows with size — 70B models are slower than 7B models
- **Cost** scales roughly with parameters and context length
- **Task-specific fine-tuned small models** often beat huge general models
- Choose based on **task requirements**, not parameter count alone

---

## 6. Why Models Have Different "Personalities"

Even when trained on similar data, models feel different. Why?

### Factor 1: Training Data Curation
The same internet corpus can be filtered differently:
- GPT models filter aggressively for quality
- LLaMA uses Common Crawl with different de-duplication
- Different proportions of code vs prose vs science

More code in training → better at structured reasoning  
More books → better long-form writing style

### Factor 2: RLHF / CAI Choices
The reward signal **shapes personality**:
- OpenAI's RLHF → tends toward confident, direct responses
- Anthropic's CAI → Claude tends toward nuanced, cautious, thoughtful
- Meta's RLHF → LLaMA tends toward more neutral, less filtered

### Factor 3: SFT (Supervised Fine-Tuning) Data
The "example responses" humans wrote in Step 1 of RLHF encode:
- Tone (formal vs casual)
- Response length preferences
- How to handle ambiguous requests
- Default assumptions about the user

### Factor 4: System Prompts & Deployment Configuration
Operators (companies building on top of the model) add system prompts that further shape behavior. A lot of what feels like "model personality" is actually **the system prompt**.

---

## 7. Model Benchmarks

### Why benchmarks exist
You can't evaluate a general-purpose AI with a single test. Benchmarks measure specific capabilities.

### Key benchmarks to know

#### MMLU (Massive Multitask Language Understanding)
- **What:** 57 subjects — math, history, law, medicine, CS, ethics, etc.
- **Format:** Multiple choice questions
- **Tests:** Breadth of world knowledge
- **Score to know:** Human expert ≈ 89%, GPT-4 ≈ 86%, Claude 3 Opus ≈ 88%
- **Limitation:** Multiple choice doesn't test reasoning depth or generation quality

#### HumanEval
- **What:** 164 Python programming problems
- **Format:** Write code that passes unit tests
- **Tests:** Functional coding ability
- **Score to know:** GPT-4 ≈ 87%, Claude 3.5 Sonnet ≈ 92%
- **Limitation:** Mostly algorithmic, doesn't test real-world software engineering

#### MT-Bench (Multi-Turn Benchmark)
- **What:** 80 multi-turn conversation questions across 8 categories
- **Format:** GPT-4 scores responses 1–10
- **Tests:** Instruction following, reasoning, multi-turn coherence
- **Limitation:** GPT-4 as judge has biases (prefers verbose, GPT-style responses)

#### Other benchmarks worth knowing
| Benchmark | Tests |
|---|---|
| GSM8K | Grade school math word problems (reasoning) |
| BIG-Bench Hard | Tasks that stump most models (hard reasoning) |
| TruthfulQA | How often the model gives factually correct vs hallucinated answers |
| MATH | Competition-level math |
| SWE-bench | Real GitHub issues — can the model fix the bug? |

### How to use benchmarks as an engineer
- **Don't pick a model based on one benchmark** — know which benchmark matches your use case
- For **coding tasks** → HumanEval, SWE-bench
- For **reasoning** → GSM8K, MATH, BIG-Bench
- For **general knowledge** → MMLU
- For **factuality** → TruthfulQA
- **Run your own evals** on your actual data — benchmarks are proxies, not guarantees

---

## 8. How to Read a Model Card

A model card is the official documentation for a model. Learn to extract signal from it fast.

### What to look for

```
1. Model overview
   - Architecture (transformer? mixture of experts?)
   - Parameter count
   - Context window (8K? 128K? 1M?)
   - Training data cutoff date ← critical for freshness-sensitive apps

2. Intended use cases
   - What the model was optimized for
   - What it was NOT designed for

3. Benchmark scores
   - Which benchmarks they ran (and which ones they didn't run — absence is data)
   - Compare to competitors on the same benchmark

4. Limitations section  ← READ THIS CAREFULLY
   - Known failure modes
   - Topics where the model underperforms
   - Hallucination tendencies

5. Evaluation methodology
   - How did they test safety? Red-teaming details?
   - How were human raters selected?

6. Usage and pricing
   - Input/output token costs
   - Rate limits
   - Available via API? Fine-tunable?
```

### Red flags in model cards
- Benchmarks cherry-picked with no comparison to competitors
- No limitations section
- Vague safety evaluation ("we did red-teaming" with no details)
- Training data cutoff older than 1 year without a RAG solution mentioned

---

## 9. Mini Project — LLM Explainer (2 Versions)

### Version A — For a Non-Technical Product Manager

> ChatGPT is trained by reading billions of web pages, books, and articles — essentially most of the internet. Through this, it learns patterns: what words usually follow other words, how ideas connect, and what "good writing" looks like.
>
> After that initial training, human trainers give it feedback on thousands of sample conversations — rating which responses are helpful, honest, and safe. The model adjusts itself to produce more of what humans rated highly.
>
> The result is a system that can have fluent conversations, answer questions, and assist with writing — but it works by predicting what a helpful response looks like, not by "understanding" in the way humans do. This is why it can be confidently wrong: it's optimizing for plausibility, not truth.

---

### Version B — For a Senior Engineer

> GPT-class models use a transformer architecture pre-trained via next-token prediction on ~1–15T tokens of internet-scale data. The pre-trained base model is a powerful distribution over text, but not a useful assistant.
>
> Alignment is achieved through RLHF: first, supervised fine-tuning on human-written demonstrations, then training a reward model on human preference rankings, then optimizing the LM against that reward signal via PPO. This is where "helpfulness" is learned — not pre-training.
>
> Key engineering implications: the model has no persistent memory, no grounding in real-time data, and no reliable fact-checking mechanism. Hallucination is a structural property, not a bug — the model samples from a learned distribution. At inference, the model is stateless; all context must be packed into the context window. Parameter count sets capacity; RLHF and data quality set alignment and capability expression.

---

### What changes between versions

| Dimension | PM Version | Engineer Version |
|---|---|---|
| **Jargon** | None — plain English throughout | Technical terms used precisely |
| **Framing** | What it does and why it matters for product | How it works mechanically |
| **Failure mode** | "Confidently wrong" as user-facing risk | Hallucination as structural property of sampling |
| **Length** | Short — PMs are time-poor | Denser — engineers want precision |
| **Analogy** | Implicit ("learns patterns") | Explicit ("distribution over text", "stateless") |

---

## 10. Interview Q&A — All Levels

### Beginner

**Q: Explain how a large language model is trained at a high level. What data does it use?**

> LLMs are trained in two main stages. First, **pre-training**: the model reads trillions of tokens from the internet (books, code, Wikipedia, news) and learns to predict the next token in any sequence. This is unsupervised — no human labels, just raw text. The model learns grammar, facts, and reasoning patterns as a side effect of getting good at this prediction task.
>
> Second, **alignment**: through RLHF or similar techniques, human feedback is used to make the model helpful, safe, and instruction-following. This is a much smaller dataset but it's what shapes the "personality" and usefulness of the model.

---

### Intermediate

**Q: What is RLHF and why does it matter for building product-grade AI?**

> RLHF (Reinforcement Learning from Human Feedback) is how raw pre-trained models are turned into useful assistants. It has three steps: (1) supervised fine-tuning on human-written examples, (2) training a reward model that predicts human preference scores, (3) optimizing the main model to maximize those scores using RL.
>
> For product engineers, RLHF matters because it's the source of the model's "helpful" behavior — and its failure modes. Sycophancy (agreeing with users even when wrong), over-refusal, and reward hacking all trace back to how the reward model was trained. If you're seeing weird model behavior in production, RLHF is often where to look first.

---

**Q: Why do different AI models have different "personalities"?**

> Three main factors: training data curation (different ratios of code, prose, and scientific content shape different strengths), the RLHF reward signal (OpenAI's vs Anthropic's human raters encode different values and preferences), and the SFT demonstration data (the human-written example responses encode tone, length preferences, and default assumptions). System prompts from operators also layer on top of all this.

---

**Q: What does "100 billion parameters" mean practically? Does more always mean better?**

> Parameters are the learned weights in the neural network — numbers that get tuned during training to make the model better at prediction. More parameters = more capacity to store patterns.
>
> But bigger isn't always better. A smaller model trained longer on higher-quality data often beats a larger one. Parameters determine capacity, not intelligence. For engineers: larger models mean higher latency and cost. Pick based on the actual task — a 7B model fine-tuned on your domain will often beat GPT-4 on your specific use case while being 100x cheaper.

---

### Advanced

**Q: What is Constitutional AI? How is it different from RLHF?**

> Constitutional AI (Anthropic) replaces human raters with an AI-generated feedback loop guided by a written set of principles (the "constitution"). Phase 1: the model critiques and rewrites its own harmful outputs according to the constitution. Phase 2: AI-generated preference rankings (using the constitution) train a reward model, which is used for RL fine-tuning.
>
> The core difference from RLHF: the feedback source. RLHF depends on thousands of human raters (expensive, inconsistent, hard to scale). CAI uses the AI itself as rater, making it more scalable and consistent — and critically, the principles are **explicit and readable**, unlike the implicit preferences encoded in human rankings. Anthropic argues this makes Claude's alignment more interpretable and auditable.

---

**Q: What's the difference between pre-training, fine-tuning, and RLHF? At which stage does the model learn to be helpful?**

> - **Pre-training:** Self-supervised next-token prediction on internet-scale data. Model learns language structure, facts, reasoning patterns. Output: a powerful text predictor, not a useful assistant.
> - **Fine-tuning (SFT):** Supervised training on a smaller, curated dataset of instruction-response pairs. Model learns the format of "being an assistant." Output: a model that follows instruction formats.
> - **RLHF:** Optimization against a learned human preference reward. Model learns what "good" looks like to humans. Output: a model that's helpful, safe, and aligned.
>
> Helpfulness is primarily learned in the RLHF stage. Pre-training gives capability; RLHF gives direction.

---

**Q: An LLM gives confident but wrong answers. What causes this and how do you architect around it?**

> This is **hallucination** — a structural property of how LLMs work, not a bug. The model generates tokens based on what's statistically plausible given the context. It optimizes for fluency and coherence, not factual accuracy. There's no internal "did I check that?" step.
>
> Architectural mitigations:
> - **RAG (Retrieval-Augmented Generation):** Ground answers in retrieved documents. The model cites sources rather than generating facts from weights.
> - **Tool use / function calling:** Give the model access to APIs for factual lookups (databases, search).
> - **Chain-of-thought prompting:** Forces the model to reason step-by-step, which reduces hallucination on reasoning tasks.
> - **Output validation:** Post-process outputs through a fact-checking layer or a second model review pass.
> - **Constrained generation:** For structured outputs (JSON, SQL), use grammar-constrained decoding.
> - **Uncertainty surfacing:** Prompt the model to say "I don't know" when confidence is low, rather than confabulating.
>
> No single fix eliminates hallucination entirely. Defense in depth is the right architecture.

---

### Staff Level

**Q: Evaluating GPT-4o vs Claude Sonnet for a complex reasoning task — what criteria do you use?**

> Start with the task, not the model's reputation.
>
> **Step 1 — Define what "complex reasoning" means for your use case:**
> Is it multi-step math? Logical deduction? Code generation? Long-document analysis? Each has different benchmark proxies.
>
> **Step 2 — Relevant benchmarks:**
> - Multi-step reasoning → MATH, GSM8K, BIG-Bench Hard
> - Code → SWE-bench, HumanEval
> - Long context fidelity → "Needle in a haystack" tests
> - Instruction following → MT-Bench, IFEval
>
> **Step 3 — Run your own evals (most important):**
> Benchmarks are proxies. Build a golden set of 50–200 examples from your actual task, with human-labeled correct answers. Run both models. Measure accuracy, format compliance, error patterns.
>
> **Step 4 — Operational criteria:**
> - Context window (does your task require 100K+ tokens?)
> - Latency (streaming vs batch? User-facing vs async?)
> - Cost at your expected volume
> - API reliability and rate limits
> - Fine-tuning availability if you need it
>
> **Step 5 — Failure mode analysis:**
> What happens when the model is wrong? Does it fail gracefully or confidently? Which model's error distribution is easier to handle in your system?
>
> The answer is almost always "run the eval" — never rely on benchmarks or hype alone.

---

## Quick Reference Cheat Sheet

```
Pre-training    →  learns language + knowledge (unsupervised, next-token prediction)
SFT             →  learns instruction format (supervised on human demos)
RLHF            →  learns helpfulness + safety (RL against human preference reward)
CAI             →  learns helpfulness + safety (RL against AI preference + constitution)

Parameters      →  capacity (knobs in the network), not intelligence
Temperature     →  controls randomness at inference (0 = deterministic, 1 = creative)
Hallucination   →  plausibility optimization, not truth optimization — use RAG + tools

MMLU            →  knowledge breadth benchmark
HumanEval       →  coding benchmark  
MT-Bench        →  instruction following, multi-turn
TruthfulQA      →  factuality / hallucination rate
```

---

*Day 2 — Lesson 1.1.2 Complete*  
*Next: Day 2 — Lesson 1.1.3 (Tokenization, Context Windows, Embeddings)*
