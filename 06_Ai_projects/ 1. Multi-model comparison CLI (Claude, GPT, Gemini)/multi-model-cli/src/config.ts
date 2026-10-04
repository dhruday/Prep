import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ConfigSchema = z.object({
  models: z.record(z.string(), z.string().min(1)),
  defaults: z.object({
    maxTokens: z.number().int().positive().default(1024),
    temperature: z.number().min(0).max(2).optional(),
    timeoutMs: z.number().int().positive().default(60_000),
    retries: z.number().int().min(0).max(5).default(2),
  }),
});

const PriceSchema = z.object({
  inputPerMTok: z.number().nonnegative().nullable(),
  outputPerMTok: z.number().nonnegative().nullable(),
});

const PricingSchema = z.object({
  updated: z.string().optional(),
  note: z.string().optional(),
  models: z.record(z.string(), PriceSchema),
});

const PromptFileSchema = z
  .array(
    z.object({
      id: z.string().optional(),
      category: z.string().optional(),
      prompt: z.string().min(1),
      system: z.string().optional(),
    }),
  )
  .min(1);

export type Config = z.infer<typeof ConfigSchema>;
export type Pricing = z.infer<typeof PricingSchema>;
export type PromptItem = z.infer<typeof PromptFileSchema>[number];

function readJson(file: string): unknown {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    throw new Error(`Cannot read file: ${file}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${file}`);
  }
}

function parseWith<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const res = schema.safeParse(data);
  if (!res.success) {
    const issues = res.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid ${label}: ${issues.join('; ')}`);
  }
  return res.data;
}

export const parseConfig = (data: unknown): Config => parseWith(ConfigSchema, data, 'config');
export const parsePricing = (data: unknown): Pricing => parseWith(PricingSchema, data, 'pricing');
export const parsePromptFile = (data: unknown): PromptItem[] =>
  parseWith(PromptFileSchema, data, 'prompt file');

export const loadConfig = (file = path.join(ROOT, 'config.json')) => parseConfig(readJson(file));
export const loadPricing = (file = path.join(ROOT, 'pricing.json')) => parsePricing(readJson(file));
export const loadPromptFile = (file: string) => parsePromptFile(readJson(file));

/** Turns "claude,openai" into a validated list. Undefined means all available. */
export function selectProviders(flag: string | undefined, available: string[]): string[] {
  if (!flag) return available;
  const wanted = flag
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const unknown = wanted.filter((w) => !available.includes(w));
  if (unknown.length > 0) {
    throw new Error(`Unknown provider(s): ${unknown.join(', ')}. Available: ${available.join(', ')}`);
  }
  return wanted;
}
