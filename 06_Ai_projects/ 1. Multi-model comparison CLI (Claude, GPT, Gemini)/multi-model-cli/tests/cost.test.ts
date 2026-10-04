import { describe, expect, it } from 'vitest';
import { computeCost } from '../src/cost.js';

const pricing = {
  models: {
    priced: { inputPerMTok: 3, outputPerMTok: 15 },
    unpriced: { inputPerMTok: null, outputPerMTok: null },
  },
};

describe('computeCost', () => {
  it('multiplies tokens by per-million prices', () => {
    // 1000 in * $3/M + 2000 out * $15/M = 0.003 + 0.03
    expect(computeCost('priced', 1000, 2000, pricing)).toBeCloseTo(0.033, 6);
  });

  it('returns null when price is null', () => {
    expect(computeCost('unpriced', 1000, 1000, pricing)).toBeNull();
  });

  it('returns null for unknown models', () => {
    expect(computeCost('nope', 1000, 1000, pricing)).toBeNull();
  });
});
