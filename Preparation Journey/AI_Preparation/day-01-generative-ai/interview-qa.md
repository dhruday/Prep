# 🎯 Interview Q&A — Day 01: What is Generative AI?

> **8 questions from Beginner → Staff.** Each: Question · Answer Framework · Interviewer Intent · Follow-up Trap.

---

## Q1 — Beginner *(All Companies)*

**Question:** *What is the difference between discriminative AI and generative AI? Give a concrete example of each.*

**Answer Framework (30–45 sec):**
1. **Define both in one sentence:** Discriminative *classifies existing content*; generative *creates new content*.
2. **Example each:** Discriminative — Gmail spam filter (spam or not spam). Generative — ChatGPT (writes an email from scratch).
3. **Underline the insight:** Same underlying tech (neural networks) — different question you ask of it.

**Interviewer's intent:** Baseline literacy check. Wants to know you can *separate* — not conflate — the two categories.

**Follow-up trap:** *"Can the same model do both?"*
**Answer:** Yes — an LLM can classify (via prompting or embeddings) AND generate. The *category* is defined by the *task*, not the model. This is why "generative" is a use-case label, not an architecture label.

---

## Q2 — Beginner *(Google, Meta)*

**Question:** *What is a foundation model? Why are they called "foundation" models?*

**Answer Framework:**
1. **Define:** Large, general-purpose pre-trained model — GPT-4o, Claude Sonnet, Gemini Pro.
2. **Why "foundation":** Named by Stanford CRFM (2021) — they're the *base rock* everyone else builds on: fine-tuning, prompting, retrieval, tool use.
3. **Contrast:** A fine-tuned model is a foundation model taught a specialty.
4. **Engineering implication:** You almost never train one; you build systems that call one.

**Interviewer's intent:** Testing whether you understand modern AI economics — most engineering effort happens *on top of* foundation models, not building them.

**Follow-up trap:** *"Why don't we just fine-tune everything?"*
**Answer:** Fine-tuning is expensive, freezes you to a snapshot (loses future model updates), and is usually worse than prompt engineering + RAG for most tasks. Fine-tune only with a specific measured signal.

---

## Q3 — Intermediate *(All Companies)*

**Question:** *How does a language model differ from a traditional ML classifier?*

**Answer Framework:**
1. **Objective:** Classifier learns *boundaries* between classes. LM learns *the distribution* of language itself.
2. **Output type:** Classifier outputs a probability over N fixed classes. LM outputs a probability over ~50K–200K vocabulary tokens — then samples one, then does it again.
3. **Generalization:** Classifier is tightly bounded to its training classes. LM generalizes to any text task via prompting.
4. **Practical consequence:** You can swap a spam classifier for a fraud classifier only by retraining. You can swap an LM from writing emails to summarizing PDFs *without retraining* — just by changing the prompt.

**Interviewer's intent:** Depth. Can you talk about the *mechanism*, not just the surface behavior?

**Follow-up trap:** *"So LMs make classifiers obsolete?"*
**Answer:** No. For narrow, high-volume, latency-critical classification (spam, fraud, ad relevance), a specialized classifier is 100–1000× cheaper and faster than an LLM call. Use LLMs for open-ended, low-volume tasks.

---

## Q4 — Intermediate *(OpenAI, Anthropic)*

**Question:** *Why did 2022–2023 mark a step change in AI capability? What actually changed?*

**Answer Framework:**
1. **The tech was 5+ years old:** Transformer paper (2017), GPT-3 (2020). Nothing about the *math* changed in 2022.
2. **What changed was UX:** ChatGPT (Nov 30, 2022) — free, simple chat UI, no signup friction. Hit 100M users in 2 months — fastest consumer product adoption in history.
3. **Then competition:** GPT-4, Claude, Gemini all shipped in 2023. Real multi-provider era.
4. **The lesson:** *Distribution beat invention.* The engineering value shifted from "train a better model" to "wrap the model in a great product."

**Interviewer's intent:** Judgment about *why* markets move. Senior engineers know when a technology inflection is about tech vs UX vs distribution.

**Follow-up trap:** *"What could cause the next inflection?"*
**Answer:** Multi-modal reasoning at cheap price points, agentic reliability, or on-device SLMs — any of which could shift the product surface again.

---

## Q5 — Intermediate *(Google, Microsoft)*

**Question:** *What is the difference between GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro at a high level?*

**Answer Framework:**
1. **All three are:** Frontier foundation LLMs from the three dominant labs.
2. **GPT-4o (OpenAI):** Fastest ecosystem, richest tooling (Assistants API, Realtime, structured outputs), strong all-round, 128K context.
3. **Claude 3.5 Sonnet (Anthropic):** Trained with Constitutional AI, tends toward careful nuanced outputs, industry-leading on coding + reasoning, 200K context, prompt caching for cost.
4. **Gemini 1.5 Pro (Google):** Native multimodal from day one, industry-leading 1M–2M token context, best for massive documents / video, Vertex AI integration.
5. **Selection heuristic:** Build an eval on YOUR data. Never pick on vibes.

**Interviewer's intent:** Are you keeping current? Do you know it's an *evaluation* problem, not a leaderboard problem?

**Follow-up trap:** *"Which is best?"*
**Answer:** "Best" is undefined without a task. On coding? Claude. On latency + ecosystem? GPT-4o-mini. On 1M-token context? Gemini. Give me the task and I'll pick.

---

## Q6 — Intermediate *(All Companies)*

**Question:** *A PM asks: "Should we use AI or ML for this feature?" How do you answer?*

**Answer Framework:**
1. **Reframe the question:** They usually mean "should we use an LLM?" ML is broader.
2. **Ask 4 diagnostic questions:**
   - Is the input open-ended natural language / images? (Yes → LLM candidate)
   - Is the output creative or single-answer? (Creative → LLM, single-answer → classifier)
   - What's the volume × latency budget? (High volume, tight latency → not LLM)
   - What's the cost per query tolerance? (Tight → cheaper option first)
3. **Recommend the *smallest tool that solves it*:** Regex → rule engine → classical ML → fine-tuned classifier → prompted LLM → agentic LLM.
4. **Commit to an eval plan** before shipping.

**Interviewer's intent:** Engineering judgment and PM-collaboration skills. Not everything is an LLM problem.

**Follow-up trap:** *"But the CEO wants AI in the product."*
**Answer:** Fine — but the goal is *user value*, not *AI-badge*. Sometimes the right answer is a boring regex under a marketing label. Ship what works.

---

## Q7 — Advanced *(Stripe, Uber, Meta)*

**Question:** *What are the risks of building a production product on a foundation model API?*

**Answer Framework:**
1. **Provider risk:** Outages (they happen), price changes, deprecations, terms-of-service changes. Mitigation: multi-provider abstraction layer + fallback chain.
2. **Behavior drift:** New model versions can silently change behavior. Mitigation: pin model versions, run regression evals on every model update, canary rollout.
3. **Cost surprises:** Token usage compounds silently. Mitigation: per-user cost tracking, hard budget limits, cheap-model routing for simple queries.
4. **Data governance:** By default, requests may be used for training. Mitigation: enterprise agreements with no-training clauses, PII redaction.
5. **Latency variance:** P99 can be 5–10× P50. Mitigation: streaming, timeouts, retry with jitter.
6. **Hallucination liability:** For high-stakes domains (medical, legal, financial), the model can confidently invent facts. Mitigation: RAG + verification loops + human-in-the-loop for critical actions.

**Interviewer's intent:** Staff-level judgment. Can you enumerate risks *before* they hit production?

**Follow-up trap:** *"Which risk is biggest?"*
**Answer:** Depends on domain. For enterprise: data governance. For consumer: cost drift. For high-stakes: hallucination. State your assumption before answering.

---

## Q8 — Staff *(OpenAI, Anthropic, Google)*

**Question:** *What is the difference between a fine-tuned model and a prompted foundation model? When would you choose each — and at what scale does the ROI flip?*

**Answer Framework:**
1. **Prompt engineering (default):** Zero training cost, instant iteration, works across model updates. Ceiling: prompts can only carry so much context before quality degrades and cost climbs.
2. **RAG:** Injects fresh knowledge at query time — the *right* step before fine-tuning for anything knowledge-based.
3. **Fine-tuning:** Bakes patterns into the model — style, format, task-specific behavior. Wins on cost-per-token at scale AND latency (smaller specialist model can outperform larger general model on a narrow task).
4. **ROI flip:** Approximately when *prompt tokens per request × requests per day × prompt cost > cost of training + serving a fine-tuned model*. Rule of thumb: 1M+ queries/day of a narrow, stable pattern.
5. **Freezing risk:** Fine-tuned models don't benefit from future foundation improvements. Every model update = re-train.

**Interviewer's intent:** Senior-to-staff signal. Can you reason about *the* right technique for a task, and think in terms of ROI curves, not preferences?

**Follow-up trap:** *"What about combining fine-tuning with RAG?"*
**Answer:** Common in production. Fine-tune for *style + format*, RAG for *knowledge*. Best of both — but only worth the complexity at real scale.

---

## 🧪 Practice Protocol

For each question:
1. **Set a 2-min timer.** Think, then answer out loud.
2. **Record on your phone.**
3. **Play back:** Did you use the framework? Did you get to the point? Did you sound confident, not defensive?
4. **Rewrite in your own words** below each question.

---

## 📊 Self-Rating

| Question | Confidence 1–5 | Needs Practice? | Notes |
|:-:|:-:|:-:|---|
| Q1 — Disc vs Gen | | ☐ | |
| Q2 — Foundation models | | ☐ | |
| Q3 — LM vs classifier | | ☐ | |
| Q4 — 2023 inflection | | ☐ | |
| Q5 — GPT vs Claude vs Gemini | | ☐ | |
| Q6 — AI vs ML for feature | | ☐ | |
| Q7 — Foundation API risks | | ☐ | |
| Q8 — Fine-tune vs prompt ROI | | ☐ | |

**Rule:** Any question below 4/5 → re-read `notes.md` § 5 (Technical Deep Dive) before starting Day 2.

---

## 🎓 The Interview Killer Move

If asked *"What would you have asked me first?"* — respond:
> *"Before I answer, I'd want to know: what's the production context — traffic volume, latency budget, and existing team AI experience? Because the right answer to 'should we use GenAI' is completely different for a 10-user internal tool vs a 10-million-user consumer product."*

That single sentence separates junior candidates from senior ones. It shows: (1) you don't leap to solutions, (2) you think in production trade-offs, (3) you communicate with product context. Bank that move.
