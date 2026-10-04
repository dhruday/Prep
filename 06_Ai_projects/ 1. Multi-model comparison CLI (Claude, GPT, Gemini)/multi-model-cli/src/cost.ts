import type { Pricing } from './config.js';

/** Returns cost in USD, or null when pricing for the model is missing. */
export function computeCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  pricing: Pricing,
): number | null {
  const p = pricing.models[model];
  if (!p || p.inputPerMTok === null || p.outputPerMTok === null) return null;
  return (inputTokens * p.inputPerMTok + outputTokens * p.outputPerMTok) / 1_000_000;
}
