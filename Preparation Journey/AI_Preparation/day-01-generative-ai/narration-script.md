# Narration Script — Day 01: What is Generative AI?

> **Duration target:** 12–14 minutes
> **Delivery:** Conversational · warm · curious · talking to ONE person
> **Format:** Speak as-is. Line breaks = natural pauses. `[brackets]` = B-roll or visual cue.

---

## [00:00 – 00:45] Hook & Title

*[Slide 1 — Title card]*

> Hey. Welcome back to AI Systems and Architecture.
>
> I'm [YOUR NAME], and this is Day 1 of my 90-day journey to become a Senior AI Engineer — in public. Every day. For 90 days. No skipping.
>
> Here's my promise for the next 12 minutes.
>
> By the end of this video, you'll be able to explain generative AI to your non-technical PM… AND to a staff engineer interviewing you at Google. Same concept. Two very different framings. And you'll know which one to use, when.
>
> If that sounds like a fair trade for 12 minutes of your day, let's go.

---

## [00:45 – 02:00] The Problem — Terms Nobody Defines

*[Slide 2 — The Question Nobody Answers]*

> Here's a small test. Ready?
>
> If I asked you right now — *"What's the difference between machine learning and generative AI?"* — could you answer in one sentence, without saying the word "AI" again?
>
> Most people can't. And that's not their fault. Nobody actually defines these terms. Every article assumes you know. Every course starts three levels too high.
>
> The result? You end up building on a foundation of fog. You call `openai.chat.completions.create()`, but you can't explain to a teammate what's *actually* happening on the other end of that HTTP call.
>
> So today, we're going to fix that. Not with jargon. With clarity.

---

## [02:00 – 04:00] The AI Family Tree — From Zero

*[Slide 3 — Learning Objectives]*
*[Slide 4 — The AI Family Tree diagram]*

> First thing to internalize: these words are **nested**. They are not synonyms. Each one is a subset of the previous.
>
> **AI** is the whole field. Started in the 1950s. The goal: make computers do things that normally require human intelligence. That's it. Playing chess counts. Sorting your email counts. Recommending a movie counts.
>
> **Machine Learning** is a *technique* inside AI. Instead of a human writing rules, the computer *learns* the rules from data. Show it 10,000 photos of cats and dogs, it learns to tell them apart. Nobody wrote "cats have pointy ears" in code.
>
> **Deep Learning** is a subset of machine learning that uses these things called neural networks. Multiple layers. Way more data. Way more compute. It's what made image recognition and speech recognition finally work.
>
> **Generative AI** is a *use case* of deep learning. Instead of *classifying* (is this a cat or a dog?), it *creates* (make me a picture of a cat riding a dog).
>
> **LLMs** — Large Language Models — are the current dominant *implementation* of generative AI for text. GPT-4, Claude, Gemini. They're one specific way to do generative AI. Not the only way. Just the one that took over.
>
> So: AI contains ML, which contains DL, which contains GenAI, which contains LLMs. Nested boxes. Remember this. When someone says "we're using AI in our product" — ask them which layer they mean.

---

## [04:00 – 06:00] Discriminative vs Generative — The Split

*[Slide 5 — Discriminative vs Generative]*

> Okay, this next distinction is the single most important idea in the whole video. Get this one right and half the field opens up to you.
>
> **Discriminative AI** answers the question: *"Which one is it?"*
>
> Give it an image, it tells you *cat or dog*.
> Give it an email, it tells you *spam or not spam*.
> Give it a transaction, it tells you *fraud or not fraud*.
>
> It's picking from a set of options that already exist. It's a very sophisticated *classifier*. That's it.
>
> **Generative AI** answers a totally different question: *"Make me one."*
>
> Give it a topic, it *creates* a paragraph.
> Give it a description, it *creates* an image.
> Give it a function name, it *creates* the code.
>
> Nothing is being picked from a menu. Something new is being produced. That is a *fundamentally* different capability, and it changes what products you can even *imagine* building.
>
> Here's the punchline: the same underlying math — neural networks — can do both. But the *question* you're asking of it determines whether you call it discriminative or generative. When Netflix predicts which movie you'll like, that's discriminative. When Netflix — someday — generates a personalized trailer for you? Generative.

---

## [06:00 – 07:30] The 6 Flavors + The Mental Model That Sticks

*[Slide 6 — The 6 Flavors]*

> Generative AI comes in six flavors today. Text, image, code, audio, video, and the big one — multimodal.
>
> Text: ChatGPT, Claude. Image: Midjourney, DALL·E. Code: GitHub Copilot, Cursor. Audio: ElevenLabs. Video: OpenAI Sora, Runway. Multimodal: models that can see AND hear AND write. Gemini, GPT-4o.
>
> Every AI product on Earth right now is one of these six — or a combination. That's your entire map.

*[Slide 7 — Mental Model: The Autocomplete Deity]*

> Now here's the mental model I want you to carry for the rest of your life.
>
> **An LLM is autocomplete, trained on the internet, then taught manners by humans.**
>
> That's it. That's the whole trick.
>
> When you type into ChatGPT, the model isn't "thinking" in any human sense. It's predicting the most probable next word. Then the next word after that. Then the next.
>
> The magic — the *feeling* that it understands you — comes from two things: **scale** (billions of parameters, trillions of training tokens) and **training tricks** (like RLHF — Reinforcement Learning from Human Feedback — which we'll cover tomorrow).
>
> Once you have this mental model, hallucinations stop being mysterious. Of course it hallucinates — it's optimizing for *plausible*, not *true*. The whole field of AI engineering is basically: *how do we get more truth out of a plausibility engine?*

---

## [07:30 – 09:00] Foundation Models vs Fine-Tuned Models

*[Slide 8 — Foundation vs Fine-Tuned]*

> Two more terms, then we're at the finish line.
>
> A **foundation model** is a general-purpose model, trained on a massive slice of the internet, at a cost of tens to hundreds of millions of dollars. GPT-4o. Claude Sonnet. Gemini Pro. These are the base rock. Everyone builds on top of them.
>
> A **fine-tuned model** takes that foundation and teaches it a specialty. Take GPT-4o and train it on 10,000 examples of your customer support tickets — now it "speaks your brand." Take Claude and fine-tune it on medical papers — now it's a domain expert.
>
> Here's the reality check for your career. As an AI engineer in 2026 — you will almost certainly *never* train a foundation model. You'll call APIs. You'll fine-tune (rarely — it's expensive and often unnecessary). You'll build systems: prompts, retrieval, tools, evals.
>
> The value is in the *system*, not the model. Two engineers with the same OpenAI API key will ship products of wildly different quality. That difference is what this 90-day series is about.

---

## [09:00 – 10:30] The 3 Big Players + Why 2023 Changed Everything

*[Slide 9 — Three Players]*

> Quick landscape check. Three companies dominate the frontier of LLMs, and each has a different *philosophy*.
>
> **OpenAI** — move fast, ship first, scale aggressively. They created ChatGPT. They redefined the market.
>
> **Anthropic** — founded by ex-OpenAI safety researchers. They bake safety directly into how the model is trained (a technique called Constitutional AI). Their model, Claude, tends to be more careful, more nuanced.
>
> **Google DeepMind** — the sleeping giant. They *invented* the transformer architecture back in 2017 — the paper is literally called "Attention Is All You Need." Gemini is their comeback. Native multimodal from day one. The longest context windows in the industry.
>
> These aren't just competing products. They're competing worldviews. And when you're choosing a provider in production, you're not just picking a model — you're picking a philosophy about how AI should behave.

*[Slide 10 — Timeline]*

> Why did all of this explode in 2023? The tech was already there. Transformer in 2017. GPT-3 in 2020. Both quietly available for years.
>
> Then November 30th, 2022. ChatGPT launches. Free. Simple UI. 100 million users in 2 months. Fastest-growing consumer product in history. Faster than TikTok. Faster than Instagram.
>
> The tech was 5 years old. The **UX** was new. That's the lesson. Distribution beats invention.

---

## [10:30 – 11:30] Architecture — What YOU Will Actually Build

*[Slide 11 — Your App Architecture]*

> Okay — practical. What does an AI engineer actually do?
>
> The architecture, 99% of the time, looks like this:
>
> Your app sends a request to an LLM provider API. The provider does the heavy lifting — inference, GPUs, model weights, all of that. It streams back tokens. Your app parses those tokens, maybe combines them with your database, and renders them to the user.
>
> You are not managing a model. You are managing a *pipeline*. Prompts in, responses out. Add retrieval. Add tools. Add evaluation. Add caching. Add cost tracking. THAT is AI engineering.

---

## [11:30 – 12:30] Mini Project + Interview Angle

*[Slide 12 — Mini Project Preview]*

> Today's mini project. 25 lines of TypeScript. It sends the *same* prompt to GPT-4o, Claude Sonnet, and Gemini — in parallel — and prints all three responses side by side.
>
> Do this once and something clicks in your brain. Each model has a *personality*. Different training data, different RLHF, different guardrails. Claude tends to be more careful. GPT tends to be more direct. Gemini tends to be more structured. You'll feel it immediately.
>
> Full code in the GitHub repo linked below. Takes 20 minutes.

*[Slide 14 — Interview Angle]*

> One killer interview question before we wrap. Google, Meta, Anthropic — every serious interviewer asks this at some point:
>
> *"When would you NOT use generative AI?"*
>
> The junior answer is: *"You'd always use it, right?"* Wrong. Get rejected.
>
> The senior answer: *"For any task where a regex, a rule, or a lookup table can give you the answer deterministically — you should use those instead. LLMs are slow, expensive, and non-deterministic. Use them when creativity, ambiguity, or open-ended input demands it. Not when you're checking if a string is a valid email."*
>
> Knowing when NOT to reach for the shiny tool is a senior-level signal. Remember that.

---

## [12:30 – 13:15] Recap + Tomorrow

*[Slide 15 — Recap + CTA]*

> Three things to walk away with today.
>
> **One:** GenAI is about *creating*, not *classifying*. That's the core split.
>
> **Two:** An LLM is autocomplete plus RLHF at massive scale. Not consciousness. Not magic. A very sophisticated pattern engine.
>
> **Three:** Your job as an AI engineer is to build *systems* on top of these models — not to train them. The value is in the pipeline.
>
> Tomorrow — Day 2 — we're going one layer deeper. **How LLMs Actually Work.** Pre-training, RLHF, why different models have different "personalities." It builds directly on today, so complete the mini project first, then hit play.
>
> If this cleared up something you'd been fuzzy about — hit subscribe. I'm publishing every single day. All the notes and code are in the description.
>
> See you tomorrow. 🚀

---

## 📝 Delivery Notes

- **Pacing:** ~150 wpm — conversational, not radio-DJ fast
- **Energy:** Warm curiosity, not "presenter voice" — imagine talking to a smart friend at a coffee shop
- **Pauses:** After every mental model, every punchline, every "That's it"
- **Camera:** Look at lens on hooks, punchlines, and CTAs. It's OK to glance at notes during technical walk-throughs
- **B-roll cues:** In `[brackets]` — hand these to your editor
- **Retake units:** Every section separated by `## [MM:SS]` is independently re-recordable — mess up section 4? Just redo section 4

---

## 🎬 Section Word Counts (aim for ~150 wpm)

| Section | Duration | Word target |
|---|---|---|
| Hook | 0:45 | ~110 |
| Problem | 1:15 | ~185 |
| Family Tree | 2:00 | ~300 |
| Disc vs Gen | 2:00 | ~300 |
| 6 Flavors + Model | 1:30 | ~225 |
| Foundation vs Fine-tuned | 1:30 | ~225 |
| Players + 2023 | 1:30 | ~225 |
| Architecture | 1:00 | ~150 |
| Mini project + Interview | 1:00 | ~150 |
| Recap + CTA | 0:45 | ~110 |
| **Total** | **~13:15** | **~1,980 words** |
