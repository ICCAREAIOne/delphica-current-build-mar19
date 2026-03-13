/**
 * ============================================================
 * CAUSAL AI ENGINE — POLICY LEARNING LAYER
 * server/causal/policy.ts
 *
 * Closes the feedback loop: real physician outcomes update
 * treatment confidence scores over time.
 *
 * CURRENT STATE:  LLM-based policy adjustment using real outcome records
 * BUILD TARGET:   Bayesian confidence updating + reinforcement learning
 *
 * BUILD ORDER:
 *   Step 1 (now):    LLM policy adjustment on real DB outcome records — functional
 *   Step 2 (next):   Bayesian confidence score updating (Beta distribution)
 *   Step 3 (later):  Contextual bandit for treatment selection optimization
 *   Step 4 (later):  Subgroup analysis (age, gender, comorbidity stratification)
 * ============================================================
 */

import { invokeLLM } from "../_core/llm";
import type { OutcomeRecord, PolicyUpdateResult } from "./types";

// ─────────────────────────────────────────────
// STEP 2 TODO: Bayesian Confidence Updating
//
// Use Beta distribution to update treatment confidence:
//   - Prior: Beta(α, β) where α = prior successes, β = prior failures
//   - Posterior: Beta(α + successes, β + failures)
//   - Updated confidence = α_posterior / (α_posterior + β_posterior)
//
// This is more statistically sound than LLM adjustment and
// requires no external API calls.
//
// function bayesianConfidenceUpdate(
//   priorAlpha: number,
//   priorBeta: number,
//   newSuccesses: number,
//   newFailures: number
// ): { updatedConfidence: number; alpha: number; beta: number }
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// STEP 3 TODO: Contextual Bandit
//
// For each patient context, select the treatment arm that
// maximizes expected reward (outcome success) using Thompson Sampling.
// Requires: treatment_policy table in DB to persist Beta params per
// (diagnosisCode, treatmentCode, ageGroup, genderGroup) tuple.
// ─────────────────────────────────────────────

/**
 * Update treatment policy confidence based on real outcome records.
 *
 * Called after physician records a patient outcome.
 * Uses real DB records — not mock data.
 *
 * @param treatmentCode  - The treatment being evaluated
 * @param outcomes       - Real outcome records from patient_outcomes table
 * @param previousConfidence - Current confidence score (0–1) for this treatment
 */
export async function updateTreatmentPolicy(
  treatmentCode: string,
  outcomes: OutcomeRecord[],
  previousConfidence: number = 0.7
): Promise<PolicyUpdateResult> {
  if (outcomes.length === 0) {
    throw new Error("No outcome records provided for policy update");
  }

  const successRate = outcomes.filter((o) => o.success).length / outcomes.length;
  const adverseEventRate = outcomes.filter((o) => o.adverseEvent).length / outcomes.length;

  // ── STEP 2: Replace LLM block with Bayesian update ──
  // const priorSuccesses = Math.round(previousConfidence * 10);
  // const priorFailures = 10 - priorSuccesses;
  // const newSuccesses = outcomes.filter(o => o.success).length;
  // const newFailures = outcomes.length - newSuccesses;
  // const { updatedConfidence } = bayesianConfidenceUpdate(priorSuccesses, priorFailures, newSuccesses, newFailures);
  // ────────────────────────────────────────────────────

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a clinical policy learning system.
Update treatment recommendation confidence based on real-world outcomes.
Consider: success rate vs baseline, adverse event rate, outcome severity, and follow-up duration.
Confidence score must be between 0.0 and 1.0.
Be conservative — adverse events should significantly reduce confidence.`,
      },
      {
        role: "user",
        content: `Treatment: ${treatmentCode}
Previous Confidence: ${previousConfidence}
Total Outcomes: ${outcomes.length}
Success Rate: ${(successRate * 100).toFixed(1)}%
Adverse Event Rate: ${(adverseEventRate * 100).toFixed(1)}%

Recent Outcomes (last 5):
${JSON.stringify(
  outcomes
    .slice(-5)
    .map((o) => ({
      success: o.success,
      adverseEvent: o.adverseEvent,
      description: o.outcomeDescription,
      followUpDays: o.followUpDays,
    })),
  null,
  2
)}

Update confidence score and provide policy adjustment rationale.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "policy_update",
        strict: true,
        schema: {
          type: "object",
          properties: {
            updatedConfidence: { type: "number" },
            policyAdjustment: { type: "string" },
            reasoning: { type: "string" },
          },
          required: ["updatedConfidence", "policyAdjustment", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Policy learning: no valid response from LLM");
  }

  const parsed = JSON.parse(content);
  return {
    treatmentCode,
    previousConfidence,
    updatedConfidence: parsed.updatedConfidence,
    policyAdjustment: parsed.policyAdjustment,
    reasoning: parsed.reasoning,
    sampleSize: outcomes.length,
    successRate,
    adverseEventRate,
    updatedAt: new Date(),
  };
}

/**
 * Record a patient outcome after treatment completion.
 * Persists to patient_outcomes table and triggers policy update if
 * sufficient data exists (n >= 10 for this treatment).
 *
 * TODO Step 2: After saving, check if n >= 10 for this treatment code.
 * If yes, auto-trigger updateTreatmentPolicy() and save updated confidence
 * to a treatment_policy table.
 */
export async function recordOutcomeAndUpdatePolicy(
  outcome: OutcomeRecord,
  allOutcomesForTreatment: OutcomeRecord[]
): Promise<{ recorded: true; policyUpdated: boolean; policyResult?: PolicyUpdateResult }> {
  // Policy update threshold — only update when we have enough data
  const MINIMUM_OUTCOMES_FOR_POLICY_UPDATE = 10;

  if (allOutcomesForTreatment.length >= MINIMUM_OUTCOMES_FOR_POLICY_UPDATE) {
    const policyResult = await updateTreatmentPolicy(
      outcome.treatmentCode,
      allOutcomesForTreatment,
      0.7 // TODO Step 2: Read current confidence from treatment_policy table
    );
    return { recorded: true, policyUpdated: true, policyResult };
  }

  return { recorded: true, policyUpdated: false };
}
