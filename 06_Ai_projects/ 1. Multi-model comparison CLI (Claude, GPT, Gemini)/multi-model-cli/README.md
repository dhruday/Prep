# Multi-Model Comparison CLI

Send one prompt to **Claude, OpenAI and Gemini in parallel** and compare the answer, latency, time to first token (TTFT), tokens and cost side by side.

Project 1 of the 90-project AI engineering plan.

## Quick start

```bash
npm install
cp .env.example .env        # add the API keys you have; missing keys are skipped
npm run dev -- "Explain the CAP theorem in 3 sentences"
```

Before the first real run:

1. **Check `config.json`**: model names change often, so confirm them against each provider's docs.
2. **Fill `pricing.json`** (USD per 1M tokens). Leave `null` and cost shows `n/a`.

## Usage

```bash
compare "prompt"                                   # all providers, in parallel
compare "prompt" --models claude,openai            # subset
compare "prompt" --system "You are a terse analyst" --temperature 0.2 --max-tokens 300
compare "prompt" --stream                          # records TTFT
compare --file prompts/sample.json                 # batch of prompts
compare --file prompts/sample.json --repeat 3      # 3 runs each, for stable medians
compare "prompt" --json | jq '.[0].results[] | {provider, latencyMs, costUsd}'
compare report                                     # medians, p95, $/1K output tokens from saved runs
```

During development use `npm run dev -- <args>`. After `npm run build && npm link`, the `compare` command is available globally.

| Flag | Meaning |
|------|---------|
| `-m, --models` | Comma-separated subset of providers |
| `-s, --system` | System prompt (mapped per provider) |
| `-f, --file` | JSON array of `{id?, category?, prompt, system?}` |
| `--stream` | Stream and record TTFT |
| `--json` | Print JSON only (always an array of runs) |
| `-t, --temperature` / `--max-tokens` | Applied to every provider |
| `--timeout <ms>` | Per-call timeout (default 60000) |
| `--repeat <n>` | Repeat each prompt N times |
| `--no-save` | Skip writing `results/<date>.jsonl` |

Exit code is `1` if every provider failed, so it works in scripts and CI.

## Architecture

```
cli.ts ──> runner.ts ──> providers/{anthropic,openai,gemini}.ts ──> vendor SDKs
   │          │  timeout (AbortController), retry (429/5xx/network only),
   │          │  Promise.allSettled fan-out, cost via pricing.json
   │          └──> NormalizedResponse
   ├──> render.ts   (terminal table + answers)
   ├──> storage.ts  (append results/<date>.jsonl)
   └──> stats.ts    (median / p95 / $ per 1K output tokens)
```

Each adapter converts vendor quirks into one `RawResult`. The runner and renderer never see provider-specific shapes. To add a provider: write one adapter file, add it to `src/providers/index.ts`, and add its model to `config.json`.

## Project layout

```
src/        cli, config, cost, runner, render, storage, stats, types, providers/
tests/      28 unit tests (SDKs mocked)
prompts/    sample.json: 10 prompts across 10 categories
config.json models + defaults        pricing.json  your price table
```

## Provider differences handled in the adapters

| Concern | Anthropic | OpenAI | Gemini |
|---------|-----------|--------|--------|
| System prompt | top-level `system` | message with role `system` | `config.systemInstruction` |
| Output cap | `max_tokens` (required) | `max_completion_tokens` | `config.maxOutputTokens` |
| Usage fields | `input_tokens` / `output_tokens` | `prompt_tokens` / `completion_tokens` (stream needs `include_usage`) | `promptTokenCount` / `candidatesTokenCount` (+ `thoughtsTokenCount`) |
| Streaming | `messages.stream()` events | async chunks | async chunks |
| Finish reason | `end_turn`, `max_tokens` | `stop`, `length` | `STOP`, `MAX_TOKENS` |

## Your results (fill in after running)

Run: `compare --file prompts/sample.json --repeat 3 --stream`, then `compare report`.

| Provider | Model | Median latency | Median TTFT | $/1K output tokens |
|----------|-------|----------------|-------------|--------------------|
|          |       |                |             |                    |

**Surprising finding:** _(e.g. which model ignored the word limit, broke JSON, or overshot max tokens)_

## What broke (fill in)

1. 
2. 
3. 

## Limitations

- Small sample; latency includes your network and varies by time of day.
- Tokenizers differ, so token counts are not comparable across providers. Compare cost and quality instead.
- Prices are a snapshot you maintain in `pricing.json`.
- Some newer models reject a custom `temperature`; if a provider returns a 400, drop `--temperature`.
- The sample prompts are short. Replace them with your own domain prompts for a more meaningful comparison.
- Quality scoring is out of scope here (see the evals phase of the plan).

## Development

```bash
npm run typecheck
npm test
npm run build
```
