# Project 1: Multi-Model Comparison CLI

**Goal:** One CLI command sends the same prompt to Claude, OpenAI, and Gemini in parallel, then prints a side-by-side comparison of answer, latency, tokens, and cost.

**Time budget:** 4-6 hours
**Stack:** Node 20+, TypeScript, `@anthropic-ai/sdk`, `openai`, `@google/genai`, `commander`, `zod`, `dotenv`, `vitest`

> If you already have comparison scripts from earlier work, refactor them into the adapter design below instead of starting over.

---

## 1. Scope

**In scope**
- Single-prompt and batch-file modes
- Parallel calls to 3 providers
- Normalized response format
- Latency, token, and cost reporting
- Streaming with time-to-first-token (TTFT)
- Terminal table + JSON output + saved results

**Out of scope**
- UI, auth, databases, agents, tool calling, quality scoring (that comes in Phase 5)

---

## 2. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR1 | `compare "prompt"` runs the prompt on all configured models in parallel |
| FR2 | `--models` flag selects a subset (e.g. `claude,openai`) |
| FR3 | `--system` sets a system prompt, mapped correctly per provider |
| FR4 | `--file prompts.json` runs a batch of prompts sequentially, models in parallel |
| FR5 | `--stream` streams tokens and records TTFT |
| FR6 | `--json` prints machine-readable output only |
| FR7 | `--temperature` and `--max-tokens` apply to all providers |
| FR8 | Every run appends to `results/<date>.jsonl` |
| FR9 | One provider failing never blocks the others (use `Promise.allSettled`) |
| FR10 | Per-call timeout (default 60s) via `AbortController` |
| FR11 | Missing API key for a provider gives a clear message and skips only that provider |
| FR12 | Cost computed from a `pricing.json` file you maintain, not hardcoded in code |

## 3. Non-Functional Requirements

- Strict TypeScript, no `any` in adapter code
- Secrets only from `.env`; `.env.example` committed, `.env` gitignored
- Model names live in `config.json`, never inline in code
- Adding a 4th provider must need only one new file
- At least 8 unit tests (mocked SDKs)

---

## 4. Architecture

```
src/
  cli.ts                 # commander entrypoint
  config.ts              # loads config.json + env, validates with zod
  types.ts               # NormalizedResponse, ProviderAdapter
  providers/
    anthropic.ts
    openai.ts
    gemini.ts
    index.ts             # registry
  runner.ts              # parallel execution, timeouts, retries
  cost.ts                # tokens x pricing.json
  render.ts              # table + json output
  storage.ts             # jsonl append
tests/
prompts/sample.json
config.json
pricing.json
```

**Core interface**

```ts
interface ProviderAdapter {
  name: string;
  call(req: CompareRequest, signal: AbortSignal): Promise<NormalizedResponse>;
}

interface NormalizedResponse {
  provider: string;
  model: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  ttftMs?: number;
  costUsd: number;
  finishReason: string;
  error?: { type: string; message: string };
}
```

Each adapter converts its provider's quirks into `NormalizedResponse`. The runner and renderer never see provider-specific shapes.

---

## 5. CLI Examples

```bash
compare "Explain CAP theorem in 3 sentences"
compare "Write a debounce function" --models claude,openai --stream
compare --file prompts/sample.json --json > out.json
compare "Summarize this" --system "You are a terse analyst" --temperature 0.2
```

**Expected terminal output**

```
Prompt: Explain CAP theorem in 3 sentences

Provider   Model        Latency   TTFT    In/Out tok   Cost
claude     <model>      1.9s      0.6s    18 / 74      $0.0012
openai     <model>      2.4s      0.8s    17 / 81      $0.0009
gemini     <model>      1.5s      0.5s    16 / 69      $0.0004

--- claude ---
...answer...
```

---

## 6. Test Prompt Set (`prompts/sample.json`)

Create 10 prompts across categories so the comparison means something:

1. Summarization (paste a ~500-word article)
2. Multi-step reasoning (a word problem)
3. Code generation (write + explain a function)
4. Code debugging (give broken code)
5. Strict JSON extraction (extract fields from messy text)
6. Instruction following (exactly 3 bullets, under 40 words)
7. Ambiguous request (see who asks for clarification)
8. Refusal/safety edge (benign but borderline wording)
9. Domain question (fintech or BI)
10. Long-ish context recall (fact buried mid-text)

---

## 7. Implementation Order

1. Scaffold project, tsconfig, lint, vitest
2. Define types + config loading with zod
3. Anthropic adapter (non-streaming) + test
4. OpenAI adapter + Gemini adapter
5. Runner with `Promise.allSettled` and timeouts
6. Cost module + `pricing.json`
7. Renderer (table, JSON)
8. Batch mode + JSONL storage
9. Streaming + TTFT
10. Retries with backoff on 429/5xx only
11. Tests, README, demo recording

---

## 8. Acceptance Criteria (Definition of Done)

- [ ] All three providers return normalized responses for the same prompt
- [ ] Killing one API key does not break the others
- [ ] Timeout works (test with a 1ms timeout)
- [ ] Streaming shows TTFT distinct from total latency
- [ ] Batch run of 10 prompts x 3 models completes and saves JSONL
- [ ] `--json` output pipes cleanly to `jq`
- [ ] No API keys or model names hardcoded in source
- [ ] 8+ passing tests
- [ ] README with architecture diagram, usage, and results table
- [ ] 2-minute demo recorded

## 9. Your Measured Number (for the README)

Run the 10-prompt set on all three models, 3 runs each, then report:

- **Median latency and median TTFT per model**
- **Average cost per 1K output tokens per model**
- **One surprising finding** (e.g. which model overshot `max_tokens`, ignored the system prompt, or broke the JSON format)

---

## 10. Learnings to Capture

**API design differences you will hit**
- Anthropic requires `max_tokens`; others treat it as optional
- System prompt placement differs: separate `system` field vs a message with a system/developer role vs a config object
- Token usage fields have different names and sometimes arrive only at the end of a stream
- Streaming event shapes differ completely; normalizing them is the hardest part
- Finish reasons use different vocabularies (`end_turn`, `stop`, `length`, `max_tokens`, safety blocks)

**Benchmarking pitfalls**
- Tokenizers differ, so "tokens" are not comparable across providers; compare cost and quality, not raw counts
- One run proves nothing: LLM latency varies by time of day and load, so use medians over multiple runs
- Cold first call vs warm calls can differ; discard or note the first run
- Temperature 0 reduces but does not eliminate variation
- Latency includes network from your machine, not just model speed

**Engineering lessons**
- The adapter pattern: isolate vendor SDK churn behind one interface
- Why `Promise.allSettled` instead of `Promise.all` for fan-out
- Retry only on retryable errors (429, 5xx, network); never retry 400s
- Config-driven model names let you swap models without code changes
- Pricing changes often, so keep it in data, with a "last updated" date
- Never log full prompts or keys in error output

**Questions to answer in your write-up**
1. Which model was fastest to first token, and which to full response?
2. Which was cheapest per task, not just per token?
3. Where did models disagree most, and why?
4. What would break if a provider changed its response schema?

---

## 11. Stretch Goals

- Add a 4th provider (a local model via Ollama) with zero changes outside one new file
- `--repeat N` flag with a summary of mean, median, and p95
- Export a Markdown comparison report
- Simple cost-budget guard: abort if estimated cost exceeds `--max-cost`
- Publish as an npm package with `npx` usage

## 12. Demo Script (2 minutes)

1. Run one prompt across 3 models (15s)
2. Show streaming with TTFT (20s)
3. Run the batch file and show the results table (30s)
4. Kill one API key, show graceful degradation (20s)
5. Show adding a new provider = one file (20s)
6. Close with your measured numbers and the surprising finding (15s)

## 13. README Checklist

- [ ] Problem and why it matters
- [ ] Architecture diagram (adapter + runner + renderer)
- [ ] Install and usage examples
- [ ] Results table with your measured numbers
- [ ] "What broke" section (top 3 issues and fixes)
- [ ] Limitations (small sample, network variance, pricing snapshot date)
