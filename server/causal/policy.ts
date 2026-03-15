/**
 * ============================================================
 * CAUSAL AI ENGINE — POLICY LEARNING LAYER
 * server/causal/policy.ts
 *
 * Closes the feedback loop: real physician outcomes update
 * treatment confidence scores using Bayesian Beta distribution.
 *
 * CURRENT STATE:  Bayesian conjugate update (Beta distribution) — REAL STATS
 * BUILD TARGET:   Contextual bandit (Thompson Sampling) for treatment selection
 *
 * BUILD ORDER:
 *   Step 1 (done):   LLM policy adjustment on real DB outcome records
 *   Step 2 (done):   Bayesian confidence score updating (Beta distribution) ← YOU ARE HERE
 *   Step 3 (next):   Contextual bandit for treatment selection optimization (Thompson Sampling)
 *   Step 4 (later):  Subgroup analysis (age, gender, comorbidity stratification)
 * ============================================================
 */

import type { OutcomeRecord, PolicyUpdateResult } from "./types";

// ─────────────────────────────────────────────
// BAYESIAN CONFIDENCE UPDATING
// Beta distribution conjugate update.
//
// Prior:     Beta(α, β)  — represents prior belief about success probability
// Posterior: Beta(α + successes, β + failures)  — updated after observing outcomes
// Confidence = α_posterior / (α_posterior + β_posterior)  — posterior mean
//
// Initial prior: Beta(7, 3) → 70% baseline confidence
// This encodes "we believe 70% of patients improve" before any data.
// ─────────────────────────────────────────────

/**
 * Bayesian Beta distribution conjugate update.
 *
 * Pure function — no side effects, no DB calls.
 * Returns updated parameters and derived confidence score.
 */
export function bayesianConfidenceUpdate(
  priorAlpha: number,
  priorBeta: number,
  newSuccesses: number,
  newFailures: number
): {
  updatedConfidence: number;
  alpha: number;
  beta: number;
  posteriorMean: number;
  posteriorVariance: number;
  credibleInterval95: [number, number];
} {
  const alpha = priorAlpha + newSuccesses;
  const beta = priorBeta + newFailures;
  const total = alpha + beta;

  // Posterior mean (expected value of Beta distribution)
  const posteriorMean = alpha / total;

  // Posterior variance
  const posteriorVariance = (alpha * beta) / (total * total * (total + 1));

  // Approximate 95% credible interval using normal approximation
  // (exact: use incomplete beta function; approximation is sufficient for n > 10)
  const std = Math.sqrt(posteriorVariance);
  const lo = Math.max(0, posteriorMean - 1.96 * std);
  const hi = Math.min(1, posteriorMean + 1.96 * std);

  return {
    updatedConfidence: posteriorMean,
    alpha,
    beta,
    posteriorMean,
    posteriorVariance,
    credibleInterval95: [lo, hi],
  };
}

/**
 * Classify an outcome as success or failure for the Beta update.
 *
 * Success = improved outcome with likely treatment attribution.
 * Failure = worsened outcome OR adverse event attributed to treatment.
 * Neutral = stable / unrelated — does not update the Beta params.
 */
function classifyOutcome(outcome: OutcomeRecord): 'success' | 'failure' | 'neutral' {
  if (outcome.adverseEvent) return 'failure';
  if (outcome.success) return 'success';
  // Stable outcomes that are not adverse events are neutral — don't update
  return 'neutral';
}

/**
 * Map patient age to ageGroup enum.
 */
export function ageToGroup(age: number): 'under_40' | '40_to_65' | 'over_65' {
  if (age < 40) return 'under_40';
  if (age <= 65) return '40_to_65';
  return 'over_65';
}

/**
 * Update treatment policy confidence based on real outcome records.
 *
 * Replaces the LLM block with a deterministic Bayesian conjugate update.
 * Reads prior parameters from the treatment_policy DB table.
 * Persists updated parameters back to the DB.
 *
 * @param treatmentCode     - The treatment being evaluated (CPT or custom code)
 * @param treatmentName     - Human-readable treatment name
 * @param diagnosisCode     - ICD-10 code
 * @param outcomes          - Real outcome records from patient_outcomes table
 * @param ageGroup          - Subgroup for stratified analysis
 * @param genderGroup       - Subgroup for stratified analysis
 */
export async function updateTreatmentPolicy(
  treatmentCode: string,
  treatmentName: string,
  diagnosisCode: string,
  outcomes: OutcomeRecord[],
  ageGroup: 'under_40' | '40_to_65' | 'over_65' | 'all' = 'all',
  genderGroup: 'male' | 'female' | 'other' | 'all' = 'all'
): Promise<PolicyUpdateResult> {
  if (outcomes.length === 0) {
    throw new Error("No outcome records provided for policy update");
  }

  const db = await import("../db");

  // ── 1. Read current prior from DB (or use default Beta(7,3)) ──
  const existing = await db.getTreatmentPolicy(treatmentCode, diagnosisCode, ageGroup, genderGroup);
  const priorAlpha = existing ? Number(existing.alpha) : 7.0;
  const priorBeta  = existing ? Number(existing.beta)  : 3.0;
  const previousConfidence = existing ? Number(existing.confidenceScore) : 0.7;

  // ── 2. Count successes and failures from new outcomes ──
  const classified = outcomes.map(classifyOutcome);
  const newSuccesses = classified.filter((c) => c === 'success').length;
  const newFailures  = classified.filter((c) => c === 'failure').length;
  // Neutral outcomes do not update Beta params

  // ── 3. Bayesian conjugate update ──
  const {
    updatedConfidence,
    alpha,
    beta,
    credibleInterval95,
  } = bayesianConfidenceUpdate(priorAlpha, priorBeta, newSuccesses, newFailures);

  const successRate      = outcomes.filter((o) => o.success).length / outcomes.length;
  const adverseEventRate = outcomes.filter((o) => o.adverseEvent).length / outcomes.length;

  // ── 4. Persist updated parameters to treatment_policy table ──
  const totalObs     = (existing?.totalObservations ?? 0) + outcomes.length;
  const totalSuccess = (existing?.successCount ?? 0) + newSuccesses;
  const totalFailure = (existing?.failureCount ?? 0) + newFailures;

  await db.upsertTreatmentPolicy({
    treatmentCode,
    treatmentName,
    diagnosisCode,
    ageGroup,
    genderGroup,
    alpha,
    beta,
    confidenceScore: updatedConfidence,
    totalObservations: totalObs,
    successCount: totalSuccess,
    failureCount: totalFailure,
  });

  // ── 5. Build human-readable policy adjustment note ──
  const delta = updatedConfidence - previousConfidence;
  const direction = delta > 0.01 ? 'increased' : delta < -0.01 ? 'decreased' : 'unchanged';
  const policyAdjustment = `Confidence ${direction} from ${(previousConfidence * 100).toFixed(1)}% to ${(updatedConfidence * 100).toFixed(1)}% based on ${outcomes.length} new outcomes (${newSuccesses} success, ${newFailures} failure, ${outcomes.length - newSuccesses - newFailures} neutral). 95% credible interval: [${(credibleInterval95[0] * 100).toFixed(1)}%, ${(credibleInterval95[1] * 100).toFixed(1)}%]. Beta(${alpha.toFixed(1)}, ${beta.toFixed(1)}).`;

  const reasoning = `Bayesian conjugate update: Prior Beta(${priorAlpha.toFixed(1)}, ${priorBeta.toFixed(1)}) + ${newSuccesses} successes + ${newFailures} failures → Posterior Beta(${alpha.toFixed(1)}, ${beta.toFixed(1)}). Posterior mean = ${(updatedConfidence * 100).toFixed(1)}%. Success rate in this batch: ${(successRate * 100).toFixed(1)}%. Adverse event rate: ${(adverseEventRate * 100).toFixed(1)}%. Total observations to date: ${totalObs}.`;

  return {
    treatmentCode,
    previousConfidence,
    updatedConfidence,
    policyAdjustment,
    reasoning,
    sampleSize: outcomes.length,
    successRate,
    adverseEventRate,
    updatedAt: new Date(),
  };
}

/**
 * Record a patient outcome after treatment completion and trigger policy update.
 *
 * Persists to patient_outcomes table (caller's responsibility) and triggers
 * Bayesian policy update if sufficient data exists (n >= 10 for this treatment).
 *
 * TODO Step 3: After saving, run Thompson Sampling to recommend the next
 * treatment arm for similar patients (contextual bandit).
 */
export async function recordOutcomeAndUpdatePolicy(
  outcome: OutcomeRecord,
  allOutcomesForTreatment: OutcomeRecord[],
  treatmentName: string = outcome.treatmentCode,
  diagnosisCode: string = 'unknown',
  ageGroup: 'under_40' | '40_to_65' | 'over_65' | 'all' = 'all',
  genderGroup: 'male' | 'female' | 'other' | 'all' = 'all'
): Promise<{ recorded: true; policyUpdated: boolean; policyResult?: PolicyUpdateResult }> {
  // Policy update threshold — only update when we have enough data for statistical validity
  const MINIMUM_OUTCOMES_FOR_POLICY_UPDATE = 10;

  if (allOutcomesForTreatment.length >= MINIMUM_OUTCOMES_FOR_POLICY_UPDATE) {
    const policyResult = await updateTreatmentPolicy(
      outcome.treatmentCode,
      treatmentName,
      diagnosisCode,
      allOutcomesForTreatment,
      ageGroup,
      genderGroup
    );
    return { recorded: true, policyUpdated: true, policyResult };
  }

  return { recorded: true, policyUpdated: false };
}

// ─────────────────────────────────────────────
// STEP 3 TODO: Thompson Sampling (Contextual Bandit)
//
// For each patient context, select the treatment arm that
// maximizes expected reward using Thompson Sampling:
//
//   1. For each candidate treatment, read Beta(α, β) from treatment_policy
//   2. Sample θ_i ~ Beta(α_i, β_i) for each treatment i
//   3. Select treatment with highest sampled θ
//   4. This naturally balances exploration (uncertain treatments) vs
//      exploitation (proven treatments)
//
// function thompsonSample(
//   candidates: Array<{ treatmentCode: string; alpha: number; beta: number }>
// ): string  // returns selected treatmentCode
//
// Requires: beta distribution sampler (use 'jstat' npm package or
// implement via gamma distribution: Beta(a,b) = Gamma(a) / (Gamma(a) + Gamma(b)))
// ─────────────────────────────────────────────
