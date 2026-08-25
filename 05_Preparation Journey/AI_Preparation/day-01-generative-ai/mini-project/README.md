# Mini Project — Day 01: Multi-Provider Comparison

> **Time budget:** 20–30 minutes
> **Language:** TypeScript (Node.js 20+)
> **Goal:** Feel — in one run — why "just swap the model" is naive engineering.

---

## 🎯 What You'll Build

A ~25-line TypeScript script that sends the **same prompt** to three LLM providers **in parallel** — OpenAI (GPT-4o-mini), Anthropic (Claude Haiku), and Google (Gemini Flash) — and prints their responses side by side.

**Why this matters:** Every AI engineer eventually thinks *"can't we just switch providers?"* Running this exercise once — with your own prompts — teaches you that models have distinct personalities, formatting habits, and refusal patterns. That intuition never comes from reading blog posts.

**Success criteria:**
- [ ] Script runs without errors
- [ ] All three providers respond
- [ ] You've tested at least 3 different prompts (factual · creative · reasoning)
- [ ] You've written 3+ observations in `observations.md`

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Your prompt    │
└────────┬────────┘
         │  (same prompt, 3x)
    ┌────┼────┐
    ▼    ▼    ▼
 OpenAI Anthropic Google      ← Promise.all — parallel
    │    │    │
    └────┼────┘
         ▼
   Side-by-side output
```

**Key concept:** `Promise.all([...])` — all three API calls fire simultaneously. Total time = slowest response, not sum of all three.

---

## 📦 Setup

```powershell
# From this folder:
cd mini-project

# Install dependencies
npm install

# Set up your API keys
Copy-Item .env.example .env
# Then open .env in your editor and fill in the three keys
```

**Required env vars (in `.env`):**

| Variable | Where to get it |
|---|---|
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `GOOGLE_API_KEY` | https://aistudio.google.com/apikey |

💡 All three providers offer free tier / trial credits. You should be able to run this project without paying anything.

---

## 🧑‍💻 Implementation Steps

### Step 1 — Understand the starter (open `compare-providers.ts`)

The starter file has three `TODO` markers. You need to implement three functions:
- `callOpenAI(prompt: string)` — uses the `openai` SDK
- `callClaude(prompt: string)` — uses the `@anthropic-ai/sdk`
- `callGemini(prompt: string)` — uses `@google/generative-ai`

Each should return a `ProviderResponse` object.

### Step 2 — Implement the three provider functions

Fill in the three `TODO` blocks. Each SDK has slightly different syntax — that's the point. You'll feel the API surface differences immediately.

### Step 3 — Run it

```powershell
npm run start
```

### Step 4 — Test with 3 kinds of prompts

Run the script 3 times, changing the prompt each time:

1. **Factual:** `"What is the boiling point of water at sea level in Celsius?"`
2. **Creative:** `"Write a two-line haiku about a broken code deploy at 3am."`
3. **Reasoning:** `"If a train leaves Bangalore at 6am at 60 km/h, and another leaves Chennai at 8am at 80 km/h, at what time do they meet? Show your reasoning."`

Note the differences: response length, formatting habits, whether they refuse or comply, how they show reasoning.

### Step 5 — Write your observations

Create `observations.md` and write 3+ observations about what surprised you. Suggestions:
- Which model was fastest? Slowest?
- Which was most verbose?
- Which followed the format most literally?
- Which added disclaimers you didn't ask for?

---

## ✅ Expected Output

```
======================================================================
 PROMPT: Write a two-line haiku about a broken code deploy at 3am.
======================================================================

--- OpenAI (gpt-4o-mini) [1.2s, 42 tokens] ---
Silent screen at three—
Red errors bloom like moonlight.

--- Claude (claude-3-5-haiku-latest) [1.8s, 38 tokens] ---
Deploy fails at three,
Coffee cools, cursor blinks slow—
Rollback whispers "yes."

--- Gemini (gemini-1.5-flash) [0.9s, 45 tokens] ---
Deploy failed at three,
Code sleeps but I do not—rollback.

======================================================================
```

---

## 🚀 Stretch Goals (+30 min each, optional)

- [ ] **Add a 4th provider** — try OpenRouter or Groq for a completely different vibe
- [ ] **Add cost calculation** — multiply tokens × per-model rate, print `$0.0021` next to each response
- [ ] **Add streaming** — instead of waiting for full responses, print tokens as they arrive
- [ ] **Save results to JSON** — build up a comparison log you can analyze later
- [ ] **Add temperature variation** — same prompt at temp=0, 0.7, and 1.0 for each provider (9-way grid)

---

## 📚 What You Just Learned

Tie it back to `../notes.md`:

- **You applied:** Section 5.3 (three dominant philosophies) — you felt the philosophy differences firsthand.
- **You now understand:** Why "just switch to Claude" is not a 30-second decision. Each provider has different formatting habits, verbosity, refusal patterns, and speed.
- **You'd struggle with:** Formal evaluation. That's coming in Day 7. For now, "vibes-based observation" is a valid first step.

---

## 🐛 Common Pitfalls

- **Pitfall:** `Cannot find module 'openai'` after install
  **Fix:** Make sure you ran `npm install` inside the `mini-project/` folder, not the day root.

- **Pitfall:** `401 Unauthorized` on one provider
  **Fix:** Double-check the `.env` variable name matches exactly. Common mistake: `OPEN_AI_KEY` instead of `OPENAI_API_KEY`.

- **Pitfall:** Gemini refuses with "safety filter blocked"
  **Fix:** Gemini has stricter default safety settings. Try a milder prompt, or add `safetySettings: [{ category: '...', threshold: 'BLOCK_NONE' }]` in the call.

- **Pitfall:** `ReferenceError: fetch is not defined`
  **Fix:** You're on Node.js < 18. Upgrade to Node 20+ or install `node-fetch`.

- **Pitfall:** Types missing / red squigglies in editor
  **Fix:** `npm install --save-dev @types/node` and restart your TS server.

---

## 🎬 Bonus: Record it

If you're publishing to YouTube today, record a 30-second screen capture of the script running and paste it into `youtube-meta.md` under the "B-Roll Cues" section.
