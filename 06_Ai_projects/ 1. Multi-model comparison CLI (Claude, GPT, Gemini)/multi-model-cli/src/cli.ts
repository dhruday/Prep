#!/usr/bin/env node
import 'dotenv/config';
import { Command, InvalidArgumentError } from 'commander';
import {
  loadConfig,
  loadPricing,
  loadPromptFile,
  selectProviders,
  type PromptItem,
} from './config.js';
import { registry } from './providers/index.js';
import { renderRun } from './render.js';
import { compareAll } from './runner.js';
import { formatReport, summarize } from './stats.js';
import { appendRun, readRuns } from './storage.js';
import type { CompareRequest, RunRecord } from './types.js';

const num = (label: string, min: number) => (v: string) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) throw new InvalidArgumentError(`${label} must be a number >= ${min}`);
  return n;
};

interface RunFlags {
  models?: string;
  system?: string;
  file?: string;
  stream?: boolean;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  repeat: number;
  config?: string;
  pricing?: string;
  save: boolean;
}

const program = new Command();
program
  .name('compare')
  .description('Send one prompt to Claude, OpenAI and Gemini and compare the results.')
  .version('1.0.0');

program
  .command('run [prompt]', { isDefault: true })
  .description('Run a prompt (or a prompt file) across providers')
  .option('-m, --models <list>', 'comma-separated providers, e.g. claude,openai')
  .option('-s, --system <text>', 'system prompt')
  .option('-f, --file <path>', 'JSON file with a list of prompts (batch mode)')
  .option('--stream', 'stream responses and record time to first token')
  .option('--json', 'print machine-readable JSON only')
  .option('-t, --temperature <n>', 'sampling temperature', num('temperature', 0))
  .option('--max-tokens <n>', 'max output tokens', num('max-tokens', 1))
  .option('--timeout <ms>', 'per-call timeout in ms', num('timeout', 1))
  .option('--repeat <n>', 'repeat each prompt N times', num('repeat', 1), 1)
  .option('--config <path>', 'path to config.json')
  .option('--pricing <path>', 'path to pricing.json')
  .option('--no-save', 'do not append results to results/*.jsonl')
  .action(async (promptArg: string | undefined, flags: RunFlags) => {
    try {
      const config = loadConfig(flags.config);
      const pricing = loadPricing(flags.pricing);

      const available = Object.keys(config.models).filter((k) => registry[k]);
      const missing = Object.keys(config.models).filter((k) => !registry[k]);
      if (missing.length > 0) {
        throw new Error(`config.json lists provider(s) with no adapter: ${missing.join(', ')}`);
      }
      const chosen = selectProviders(flags.models, available);
      const targets = chosen.map((name) => ({
        adapter: registry[name]!,
        model: config.models[name]!,
      }));

      let prompts: PromptItem[];
      if (flags.file) prompts = loadPromptFile(flags.file);
      else if (promptArg) prompts = [{ prompt: promptArg, system: flags.system }];
      else throw new Error('Provide a prompt, or use --file prompts.json');

      const opts = {
        timeoutMs: flags.timeout ?? config.defaults.timeoutMs,
        retries: config.defaults.retries,
      };
      const total = prompts.length * flags.repeat;
      const runs: RunRecord[] = [];
      let done = 0;

      for (let rep = 0; rep < flags.repeat; rep++) {
        for (const item of prompts) {
          done++;
          const req: CompareRequest = {
            prompt: item.prompt,
            system: item.system ?? flags.system,
            temperature: flags.temperature ?? config.defaults.temperature,
            maxTokens: flags.maxTokens ?? config.defaults.maxTokens,
            stream: Boolean(flags.stream),
          };
          if (total > 1) process.stderr.write(`[${done}/${total}] ${item.id ?? item.prompt.slice(0, 40)}\n`);

          const results = await compareAll(targets, req, opts, pricing);
          const record: RunRecord = {
            timestamp: new Date().toISOString(),
            promptId: item.id,
            category: item.category,
            prompt: req.prompt,
            system: req.system,
            temperature: req.temperature,
            maxTokens: req.maxTokens,
            stream: req.stream,
            results,
          };
          runs.push(record);
          if (flags.save) appendRun(record);
          if (!flags.json) console.log(renderRun(req.prompt, results));
        }
      }

      if (flags.json) console.log(JSON.stringify(runs, null, 2));
      const allFailed = runs.every((r) => r.results.every((x) => x.error));
      if (allFailed) process.exitCode = 1;
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    }
  });

program
  .command('report')
  .description('Summarize saved results: median latency, TTFT, cost per 1K output tokens')
  .option('--dir <path>', 'results directory', 'results')
  .option('--json', 'print JSON')
  .action((flags: { dir: string; json?: boolean }) => {
    const summary = summarize(readRuns(flags.dir));
    console.log(flags.json ? JSON.stringify(summary, null, 2) : formatReport(summary));
  });

await program.parseAsync(process.argv);
