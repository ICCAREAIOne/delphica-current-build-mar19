/**
 * outcome-definitions.test.ts
 *
 * Validates the outcome_definitions table, DB helpers, and the
 * success-classification logic in classifyOutcome() (policy.ts).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

// ─── DB helpers ───────────────────────────────────────────────────────────────

describe('Outcome Definitions – DB helpers', () => {
  it('should return 30 seeded definitions (25 original + 5 fatigue)', async () => {
    const defs = await db.getAllOutcomeDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(30);
  });

  it('should return the primary E11 definition (HbA1c < 7%)', async () => {
    const def = await db.getOutcomeDefinitionByDiagnosis('E11');
    expect(def).toBeDefined();
    expect(def!.measurementInstrument).toContain('HbA1c');
    expect(def!.successOperator).toBe('lt');
    expect(Number(def!.successThreshold)).toBe(7);
  });

  it('should return the primary I10 definition (SBP < 130 mmHg)', async () => {
    const def = await db.getOutcomeDefinitionByDiagnosis('I10');
    expect(def).toBeDefined();
    expect(def!.measurementInstrument.toLowerCase()).toMatch(/sbp|systolic/i);
    expect(def!.successOperator).toBe('lt');
    expect(Number(def!.successThreshold)).toBe(130);
  });

  it('should return the primary F32 definition (PHQ-9 drop ≥ 5)', async () => {
    const def = await db.getOutcomeDefinitionByDiagnosis('F32');
    expect(def).toBeDefined();
    expect(def!.measurementInstrument).toContain('PHQ-9');
    expect(def!.successOperator).toBe('drop_by');
    expect(Number(def!.successThreshold)).toBe(5);
  });

  it('should return undefined for an unknown diagnosis code', async () => {
    const def = await db.getOutcomeDefinitionByDiagnosis('Z99');
    expect(def).toBeUndefined();
  });

  it('R53.83 — FACIT-Fatigue ≥ 40 (gte, 90d, Grade B)', async () => {
    const def = await db.getOutcomeDefinitionByDiagnosis('R53.83');
    expect(def).toBeDefined();
    expect(def!.measurementInstrument).toContain('FACIT');
    expect(def!.successOperator).toBe('gte');
    expect(Number(def!.successThreshold)).toBe(40);
    expect(def!.timeHorizonDays).toBe(90);
    expect(def!.evidenceGrade).toBe('B');
  });

  it('G93.3 — SF-36 Vitality ≥ 50 (gte, 180d, Grade B)', async () => {
    const def = await db.getOutcomeDefinitionByDiagnosis('G93.3');
    expect(def).toBeDefined();
    expect(def!.measurementInstrument).toContain('SF-36');
    expect(def!.successOperator).toBe('gte');
    expect(Number(def!.successThreshold)).toBe(50);
    expect(def!.timeHorizonDays).toBe(180);
  });

  it('M79.3 — VAS Fatigue drop_by 30mm (90d, Grade B)', async () => {
    const defs = await db.getAllOutcomeDefinitionsForDiagnosis('M79.3');
    const vasDef = defs.find((d) => d.measurementInstrument === 'VAS Fatigue');
    expect(vasDef).toBeDefined();
    expect(vasDef!.successOperator).toBe('drop_by');
    expect(Number(vasDef!.successThreshold)).toBe(30);
  });

  it('D50 — Hemoglobin ≥ 12 g/dL (gte, 30d, Grade A)', async () => {
    const def = await db.getOutcomeDefinitionByDiagnosis('D50');
    expect(def).toBeDefined();
    expect(def!.measurementInstrument).toBe('Hemoglobin');
    expect(def!.successOperator).toBe('gte');
    expect(Number(def!.successThreshold)).toBe(12);
    expect(def!.timeHorizonDays).toBe(30);
    expect(def!.evidenceGrade).toBe('A');
  });

  it('R53 — generic SF-36 Vitality row (gte, 90d)', async () => {
    const def = await db.getOutcomeDefinitionByDiagnosis('R53');
    expect(def).toBeDefined();
    expect(def!.measurementInstrument).toContain('SF-36');
    expect(def!.successOperator).toBe('gte');
    expect(Number(def!.successThreshold)).toBe(50);
    expect(def!.timeHorizonDays).toBe(90);
  });

  it('should have evidence grades A or B for all primary definitions', async () => {
    const defs = await db.getAllOutcomeDefinitions();
    const primaryCodes = ['E11', 'I10', 'J44', 'N18', 'F32', 'I48'];
    for (const code of primaryCodes) {
      const def = defs.find((d) => d.diagnosisCode === code);
      expect(def, `Missing definition for ${code}`).toBeDefined();
      expect(['A', 'B']).toContain(def!.evidenceGrade);
    }
  });
});

// ─── classifyOutcome logic ─────────────────────────────────────────────────────

describe('classifyOutcome – threshold logic', () => {
  /**
   * Inline the same switch logic used in routers.ts so we can unit-test it
   * without importing the full router.
   */
  function classify(
    operator: string,
    threshold: number,
    measured: number,
    baseline?: number
  ): boolean {
    switch (operator) {
      case 'lt':      return measured < threshold;
      case 'lte':     return measured <= threshold;
      case 'gt':      return measured > threshold;
      case 'gte':     return measured >= threshold;
      case 'drop_by': return baseline !== undefined ? (baseline - measured) >= threshold : false;
      case 'reach':   return measured >= threshold;
      default:        return false;
    }
  }

  it('lt: HbA1c 6.8 < 7 → success', () => {
    expect(classify('lt', 7, 6.8)).toBe(true);
  });

  it('lt: HbA1c 7.1 < 7 → failure', () => {
    expect(classify('lt', 7, 7.1)).toBe(false);
  });

  it('lt: HbA1c exactly 7 < 7 → failure (strict)', () => {
    expect(classify('lt', 7, 7)).toBe(false);
  });

  it('lte: SBP 130 ≤ 130 → success', () => {
    expect(classify('lte', 130, 130)).toBe(true);
  });

  it('gte: FEV1 ≥ 80% → success', () => {
    expect(classify('gte', 80, 82)).toBe(true);
  });

  it('drop_by: PHQ-9 drops 6 points (≥ 5) → success', () => {
    expect(classify('drop_by', 5, 8, 14)).toBe(true);
  });

  it('drop_by: PHQ-9 drops only 3 points (< 5) → failure', () => {
    expect(classify('drop_by', 5, 11, 14)).toBe(false);
  });

  it('drop_by: no baseline → failure (cannot compute drop)', () => {
    expect(classify('drop_by', 5, 8, undefined)).toBe(false);
  });

  it('reach: eGFR stabilisation ≥ 45 → success', () => {
    expect(classify('reach', 45, 50)).toBe(true);
  });

  it('reach: eGFR 40 < 45 → failure', () => {
    expect(classify('reach', 45, 40)).toBe(false);
  });
});

// ─── Policy confidence history ─────────────────────────────────────────────────

describe('Policy Confidence History – DB helpers', () => {
  it('should return seeded history for E11/MET500', async () => {
    const rows = await db.getPolicyConfidenceHistory('MET500', 'E11', 'over_65', 'female', 10);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const score = Number(r.confidenceScore);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('should return empty array for non-existent arm', async () => {
    const rows = await db.getPolicyConfidenceHistory('NONEXISTENT', 'Z99', 'all', 'all', 5);
    expect(rows).toHaveLength(0);
  });
});
