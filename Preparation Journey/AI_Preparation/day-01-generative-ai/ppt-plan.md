# PPT Plan — Day 01: What is Generative AI?

> **Phase 1 · AI Foundations · Day 1 / 90**
> **Video length target:** 12–14 min · 15 slides · dark theme, animation-friendly
> **Series:** AI Systems & Architecture

---

## Slide Deck

| # | Title | Visual / Diagram | Key Points (on-slide text — keep short) | Speaker Notes (30–60 sec each) | Animation |
|:-:|---|---|---|---|---|
| 1 | **Day 1 / 90 — What Is Generative AI, Really?** | Big title. Subtitle: *"Not what your CEO thinks it is."* Bottom: your name + `github.com/[you]/ai-engineer-prep` | • AI Systems & Architecture<br>• Day 1 / 90<br>• Duration: 12 min | Open with the promise: "By the end of this video, you can explain generative AI to your grandma AND to a Google staff engineer. Same concept. Two very different framings." | Fade in title, subtitle slides up |
| 2 | **The Question Nobody Answers** | Confused emoji + a fake headline like *"AI takes over the world"* | *If AI is so smart, why does it hallucinate the price of a pizza?* | Everyone throws around "AI." Almost nobody defines it. Today we fix that — from zero. | Slide up |
| 3 | **What You'll Walk Away With** | 4-line checklist | ✅ Discriminative vs Generative<br>✅ 6 flavors of GenAI<br>✅ Foundation vs Fine-tuned<br>✅ Why 2023 changed everything | Preview the 4 things. Promise clarity, not hype. | Reveal one line at a time |
| 4 | **The AI Family Tree** | Nested-box diagram: AI ⊃ ML ⊃ DL ⊃ GenAI ⊃ LLMs | AI → ML → DL → GenAI → LLM<br>Each is a *subset* of the previous | 90% of confusion comes from mixing these terms. AI is a field. ML is a technique. DL is a subset. GenAI is a *use case*. LLMs are one implementation. | Reveal nested boxes one by one, zoom into "GenAI" |
| 5 | **Discriminative vs Generative — The Split** | 2-column comparison. Left: cat/dog classifier. Right: "Write me a poem about my cat." | Discriminative: *"Which is it?"*<br>Generative: *"Make me one."* | This is the single most important distinction. Discriminative asks "which bucket?" Generative asks "create something new." Fraud detection vs writing your email — same math, different question. | Split screen animation |
| 6 | **The 6 Flavors of GenAI** | Grid of 6 icons: 📝 Text · 🎨 Image · 💻 Code · 🔊 Audio · 🎬 Video · 🌐 Multimodal | Text · Image · Code · Audio · Video · Multimodal | Every GenAI product on earth is one of these six — or a combo. Multimodal is the future because humans are multimodal. | Reveal each icon with 1-sec pop |
| 7 | **Mental Model — The Autocomplete Deity** | Illustration: giant autocomplete bar with universe emerging from it | *An LLM is autocomplete trained on the internet, then taught manners by humans.* | This is the model that stays with you forever. It's not conscious. It's not "reasoning" in the human sense. It's predicting the next token. That's the whole trick. Everything else is scale + training tricks. | Zoom into autocomplete bar |
| 8 | **Foundation Models vs Fine-Tuned Models** | 2-tier stack. Bottom: massive "foundation" block. Top: small fine-tuned specialist blocks | Foundation = general (GPT-4o)<br>Fine-tuned = specialist (medical GPT) | Foundation models are the base rock. Everyone builds on top. Fine-tuning is teaching that rock a new trick — a specific domain, style, or task. As an engineer, you'll almost never train a foundation model. You'll build ON one. | Base block appears, specialist blocks stack on top |
| 9 | **The 3 Big Players (And Their Philosophies)** | 3 logos side-by-side: OpenAI, Anthropic, Google | OpenAI: *ship fast, scale*<br>Anthropic: *safety-first, constitutional*<br>Google: *research-deep, multimodal-native* | These aren't just competing products. They're competing philosophies. OpenAI moves fastest. Anthropic bakes safety into training (Constitutional AI). Google was in the game before it was a game (they invented the transformer). | Logos slide in from left |
| 10 | **Why 2023 Was the Inflection Point** | Timeline: 2017 (transformer) → 2020 (GPT-3) → **2022 (ChatGPT)** → 2023 (GPT-4, Claude, Gemini) | 2017: Transformer paper<br>2020: GPT-3<br>2022: ChatGPT (100M users, 2 months)<br>2023: Multi-provider era | ChatGPT hitting 100 million users in 2 months is what changed the world. Faster than TikTok. Faster than Instagram. The tech was 5+ years old — the *UX* was new. The lesson? Distribution beats invention. | Timeline animates left-to-right |
| 11 | **Architecture: How You'll Use GenAI as an Engineer** | ASCII diagram: `Your App → LLM Provider API → Response → Your UI` | You don't train.<br>You **call APIs**.<br>You **compose** systems on top. | Here's the 2026 reality for 99% of AI engineering jobs. You will not train GPT-5. You will make API calls to it, wrap it in prompts, add retrieval, deploy to production. The value is in the SYSTEM, not the model. | Arrows animate flow |
| 12 | **Mini Project Preview — Multi-Provider Comparison** | Code snippet: `Promise.all([openai, claude, gemini])` | Send the SAME prompt to 3 providers. See how their "personalities" differ. | Today's exercise: 25 lines of TypeScript that reveals more than 10 blog posts. Same prompt, three brains. You'll see immediately why "just switch to GPT" is naive engineering. | Code slides up with syntax highlighting |
| 13 | **⚠️ 3 Traps to Avoid** | Warning icon + 3 bullets | ❌ "AI understands what it says"<br>❌ "Bigger model = always better"<br>❌ "Fine-tune first, ask questions later" | These are the three sentences that get people rejected in AI interviews. Understanding, size-worship, and premature fine-tuning. Junior thinking. | Bullets fade in one at a time |
| 14 | **💡 The Interview Question** | Callout box | *"When would you NOT use generative AI?"* | This is what separates a senior candidate from a junior one. Junior candidates use AI for everything. Senior candidates know when a regex, a rule, or a lookup table beats an LLM by a mile — on cost, speed, AND reliability. | Highlight box pulses |
| 15 | **Recap + Tomorrow** | 3-bullet summary + CTA | 1. GenAI = *create*, not *classify*<br>2. LLMs = autocomplete + RLHF<br>3. You call APIs, you don't train | Recap fast. Tell them Day 2 is "How LLMs Actually Work" — we go one layer deeper into next-token prediction and RLHF. Subscribe. Star the repo. See you tomorrow. | Bullets appear on beat |

---

## Slide Design System

- **Font:** Inter (body 32pt+, titles 60pt+, code JetBrains Mono)
- **Palette:** BG `#0a0a0a` · Text `#f5f5f5` · Accent `#00d4ff` · Warning `#ff6b6b`
- **Diagrams:** Excalidraw hand-drawn feel (no sterile corporate icons)
- **Ban list:** No robots, no glowing brains, no circuit boards, no "The Matrix" green

---

## Speaker Note Micro-Framework

For every slide, follow this rhythm:
1. **Say** the concept (1 sentence)
2. **Anchor** it (analogy, example, or contradiction)
3. **Bridge** to the next slide (1 sentence)

---

## B-Roll Cues

- Slide 2: Screen recording of a real ChatGPT hallucination (pizza price)
- Slide 6: Quick supercut of Midjourney art, GitHub Copilot, ElevenLabs voice, Sora video
- Slide 10: ChatGPT launch news article (Nov 30, 2022)
- Slide 12: Terminal running the mini-project, three responses stream in
