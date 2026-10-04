import type { ProviderAdapter } from '../types.js';
import { anthropicAdapter } from './anthropic.js';
import { geminiAdapter } from './gemini.js';
import { openaiAdapter } from './openai.js';

/** To add a provider: write one adapter file and add it here. */
const adapters: ProviderAdapter[] = [anthropicAdapter, openaiAdapter, geminiAdapter];

export const registry: Record<string, ProviderAdapter> = Object.fromEntries(
  adapters.map((a) => [a.name, a]),
);
