# ⚡ Quick Recall — Day 01: What is Generative AI?

> **Use case:** 5-min review before recording video · before interview · before Day 2

---

## 🎯 One-Line Truth
> **Generative AI creates new content; discriminative AI classifies existing content — and an LLM is autocomplete for the internet, plus manners (RLHF).**

---

## 🧠 Mental Model
**LLM = autocomplete deity, trained on the internet, house-trained by humans.**

---

## 📖 Essential Definitions

| Term | 1-Line Definition |
|---|---|
| **AI** | The field. Making computers do things that need human intelligence. |
| **ML** | Learning rules from data (not humans writing rules). |
| **Deep Learning** | ML with multi-layer neural networks. |
| **Generative AI** | Deep-learning use case that *creates* new content. |
| **LLM** | Currently dominant generative model for text (GPT, Claude, Gemini). |
| **Foundation Model** | General-purpose base model. You build on top of it. |
| **Fine-Tuned Model** | Foundation model further trained on specific data. |
| **RLHF** | Reinforcement Learning from Human Feedback — the "manners" step. |
| **Constitutional AI** | Anthropic's alternative to RLHF — trains against written principles. |
| **Token** | The unit an LLM reads/writes. Roughly 4 chars in English. |

---

## 🏗️ Family Tree at a Glance

```
AI  ⊃  ML  ⊃  Deep Learning  ⊃  Generative AI  ⊃  LLMs
```

Each is a *strict subset* of the previous. When someone says "AI" — ask *which layer*.

---

## ⚡ 3 Memory Hooks

1. **"Discriminative picks. Generative produces."**
2. **"LLM = autocomplete + manners at internet scale."**
3. **"The value is in the system, not the model."**

---

## 🔑 Key Contrast — Whiteboard-Ready

| | Discriminative | Generative |
|---|---|---|
| Question | *Which one?* | *Make me one.* |
| Output | Label / probability | New content |
| Failure | Misclassification | Hallucination |
| Product | Spam filter, fraud detect | ChatGPT, Midjourney |

| | Foundation Model | Fine-Tuned Model |
|---|---|---|
| Purpose | General | Specialist |
| Cost to train | $10M–$500M | $1K–$100K |
| Cost/token to use | Higher | Lower |
| Best for | Prototyping, broad tasks | High-volume narrow tasks |

---

## 💬 Explain in 60 Seconds

- **PM:** *"Old AI sorts things into piles. Generative AI creates things — text, images, code. LLMs are that idea, at massive scale, powered by essentially reading the internet."*
- **Engineer:** *"LLMs are transformer neural networks pre-trained to predict the next token on internet-scale text, then aligned via RLHF. You call them via APIs. The value is in the system around the API."*
- **Senior:** *"GenAI is a use-case category, not a technology. The interesting trade-offs are at the system layer — retrieval, prompting, tool use, evals, cost. Senior signal: knowing when NOT to reach for an LLM."*

---

## 🎯 Top 5 Interview Cheatsheet

1. **Q:** *What's the difference between discriminative and generative AI?*
   **A:** Discriminative picks from options (classifier). Generative produces new content. Same math (neural nets), different question you're asking.

2. **Q:** *What is a foundation model?*
   **A:** A general-purpose, pre-trained large model built to be broadly capable, on top of which you fine-tune, prompt-engineer, or add retrieval. Named by Stanford CRFM (2021).

3. **Q:** *When would you NOT use generative AI?*
   **A:** Any task solvable deterministically — regex, rule engine, exact lookup, well-defined classifier. LLMs are slow, expensive, and non-deterministic; reserve them for ambiguity and creativity.

4. **Q:** *Should we fine-tune for our support chatbot?*
   **A:** Not yet. Escalation ladder: prompting → few-shot → RAG → fine-tune. Fine-tune only with measured evidence and stable high-volume patterns.

5. **Q:** *How do you pick between GPT-4o and Claude Sonnet?*
   **A:** Build an eval dataset of 100–500 domain queries. Score both on accuracy, latency, cost, refusal rate, instruction-following variance. Never pick on vibes or Twitter benchmarks.

---

## ⚠️ 3 Things NOT to Say

- ❌ *"The AI understands what it's saying."* → It's statistical pattern completion, not comprehension.
- ❌ *"Bigger model is always better."* → Smaller models often win on cost-adjusted quality.
- ❌ *"Let's fine-tune it first."* → Fine-tuning is the last resort, not the first.

---

## 📦 Mini Project Checklist

- [ ] `.env` has `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`
- [ ] `npm install` completed
- [ ] `compare-providers.ts` runs and prints 3 responses
- [ ] Test with 3 different prompts (factual · creative · reasoning)
- [ ] Note the "personality" differences in `mini-project/observations.md`

---

## 📁 GitHub Commit

**Folder:** `phase-01-foundations/day-01-generative-ai/`
**Files:** `ppt-plan.md`, `youtube-meta.md`, `narration-script.md`, `notes.md`, `quick-recall.md`, `interview-qa.md`, `mini-project/`
**Commit:** `✅ Day 01 — What is Generative AI? | Phase 1: Foundations`
