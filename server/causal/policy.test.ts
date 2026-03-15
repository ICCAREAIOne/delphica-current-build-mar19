/**
 * policy.test.ts
 *
 * Unit tests for the Bayesian Beta distribution confidence updater.
 * Pure function tests — no DB, no LLM calls.
 */

import { describe, it, expect } from 'vitest';
import { bayesianConfidenceUpdate, ageToGroup } from './policy';

describe('bayesianConfidenceUpdate', () => {
  it('returns 70% confidence from default prior Beta(7,3) with no new data', () => {
    const result = bayesianConfidenceUpdate(7, 3, 0, 0);
    expect(result.updatedConfidence).toBeCloseTo(0.7, 3);
    expect(result.alpha).toBe(7);
    expect(result.beta).toBe(3);
  });

  it('increases confidence when all outcomes are successes', () => {
    // Prior Beta(7,3) = 70%, add 10 successes
    const result = bayesianConfidenceUpdate(7, 3, 10, 0);
    expect(result.updatedConfidence).toBeGreaterThan(0.7);
    expect(result.alpha).toBe(17);
    expect(result.beta).toBe(3);
    // Posterior mean = 17/20 = 0.85
    expect(result.updatedConfidence).toBeCloseTo(0.85, 3);
  });

  it('decreases confidence when all outcomes are failures', () => {
    // Prior Beta(7,3) = 70%, add 10 failures
    const result = bayesianConfidenceUpdate(7, 3, 0, 10);
    expect(result.updatedConfidence).toBeLessThan(0.7);
    expect(result.alpha).toBe(7);
    expect(result.beta).toBe(13);
    // Posterior mean = 7/20 = 0.35
    expect(result.updatedConfidence).toBeCloseTo(0.35, 3);
  });

  it('is conservative with small samples — prior dominates', () => {
    // 1 success should not dramatically shift from 70%
    const result = bayesianConfidenceUpdate(7, 3, 1, 0);
    expect(result.updatedConfidence).toBeGreaterThan(0.70);
    expect(result.updatedConfidence).toBeLessThan(0.80);
  });

  it('converges toward true rate with large samples', () => {
    // 100 successes, 0 failures — should approach 100%
    const result = bayesianConfidenceUpdate(7, 3, 100, 0);
    expect(result.updatedConfidence).toBeGreaterThan(0.95);
  });

  it('returns valid 95% credible interval', () => {
    const result = bayesianConfidenceUpdate(7, 3, 5, 5);
    const [lo, hi] = result.credibleInterval95;
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeLessThan(result.updatedConfidence);
    expect(hi).toBeGreaterThan(result.updatedConfidence);
  });

  it('handles mixed outcomes correctly', () => {
    // 5 successes, 5 failures from prior Beta(7,3)
    const result = bayesianConfidenceUpdate(7, 3, 5, 5);
    // Posterior = Beta(12, 8), mean = 12/20 = 0.6
    expect(result.updatedConfidence).toBeCloseTo(0.6, 3);
  });
});

describe('ageToGroup', () => {
  it('classifies age < 40 as under_40', () => {
    expect(ageToGroup(25)).toBe('under_40');
    expect(ageToGroup(39)).toBe('under_40');
  });

  it('classifies age 40-65 as 40_to_65', () => {
    expect(ageToGroup(40)).toBe('40_to_65');
    expect(ageToGroup(55)).toBe('40_to_65');
    expect(ageToGroup(65)).toBe('40_to_65');
  });

  it('classifies age > 65 as over_65', () => {
    expect(ageToGroup(66)).toBe('over_65');
    expect(ageToGroup(85)).toBe('over_65');
  });
});
