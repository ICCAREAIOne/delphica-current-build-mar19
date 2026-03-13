/**
 * ============================================================
 * CAUSAL AI ENGINE — ORCHESTRATOR
 * server/causal/orchestrator.ts
 *
 * The single entry point for all Clinical Reasoning Engine
 * operations. Wires together:
 *   Evidence Layer     → evidence.ts
 *   Inference Layer    → inference.ts
 *   Delphi Simulator   → aiService.ts (runDelphiSimulation)
 *   Safety Review      → aiService.ts (performSafetyReview)
 *   Policy Learning    → policy.ts
 *
 * All tRPC router procedures in server/routers.ts should import
 * from here — not from individual module files.
 *
 * THREE-GATE PIPELINE:
 *   Gate 1: Causal Analysis → physician reviews causal factors
 *   Gate 2: Delphi Simulation + Convergence → physician selects path
 *   Gate 3: Safety Review (DRB) → physician authorizes care plan
 * ============================================================
 */

import { performCausalAnalysis, validateAndOptimize, generateTreatmentRecommendations } from "./inference";
import { updateTreatmentPolicy, recordOutcomeAndUpdatePolicy } from "./policy";
import { retrieveEvidence } from "./evidence";
import type {
  PatientContext,
  CausalAnalysisRequest,
  CausalAnalysisResult,
  CausalValidationResult,
  TreatmentRecommendation,
  OutcomeRecord,
  PolicyUpdateResult,
  PrecisionCarePlanResult,
  SafetyReviewResult,
  EvidenceQuery,
} from "./types";

// Re-export types so consumers only need to import from orchestrator
export type {
  PatientContext,
  CausalAnalysisRequest,
  CausalAnalysisResult,
  CausalValidationResult,
  TreatmentRecommendation,
  OutcomeRecord,
  PolicyUpdateResult,
  PrecisionCarePlanResult,
  SafetyReviewResult,
  EvidenceQuery,
};

// ─────────────────────────────────────────────
// GATE 1: Causal Analysis
// ─────────────────────────────────────────────

/**
 * Run the Clinical Reasoning Engine on a patient session.
 * Returns causal factors, evidence sources, and recommended
 * simulation scenarios for the physician to review (Gate 1).
 */
export async function runCausalAnalysis(
  request: CausalAnalysisRequest
): Promise<CausalAnalysisResult> {
  return performCausalAnalysis(request);
}

// ─────────────────────────────────────────────
// GATE 2: Delphi Simulation + Convergence
// ─────────────────────────────────────────────

/**
 * Run the full bidirectional pipeline:
 *   Causal Analysis → Delphi Simulation → Convergence Validation
 *
 * Returns validated treatment options for physician selection (Gate 2).
 *
 * @param causalAnalysis  - Result from runCausalAnalysis()
 * @param scenarioToExplore - Physician-selected scenario from Gate 1
 */
export async function runDelphiConvergence(
  causalAnalysis: CausalAnalysisResult,
  scenarioToExplore: string,
  patientContext: PatientContext
): Promise<{ simulation: any; validation: CausalValidationResult }> {
  const aiService = await import("../aiService");

  // Step 1: Delphi Simulator generates treatment options
  const simulation = await aiService.runDelphiSimulation({
    causalAnalysis: causalAnalysis as any,
    scenarioToExplore,
    iterationNumber: 1,
  });

  // Step 2: Convergence — validate Delphi options against causal analysis
  const validation = await validateAndOptimize({
    causalAnalysis,
    delphiSimulation: simulation as any,
    patientContext,
  });

  return { simulation, validation };
}

// ─────────────────────────────────────────────
// GATE 3: Care Plan + Safety Review (DRB)
// ─────────────────────────────────────────────

/**
 * Generate a Precision Care Plan from the validated treatment path,
 * then run it through the Digital Review Board safety check (Gate 3).
 *
 * Returns both the care plan and the safety review result.
 * Physician must acknowledge all critical alerts before the plan
 * can be saved to the patient record.
 */
export async function generateCarePlanWithSafetyReview(
  causalAnalysis: CausalAnalysisResult,
  validatedTreatment: CausalValidationResult,
  patientContext: PatientContext
): Promise<{ carePlan: PrecisionCarePlanResult; safetyReview: SafetyReviewResult }> {
  const aiService = await import("../aiService");

  // Generate Precision Care Plan
  const carePlan = await aiService.generatePrecisionCarePlan({
    causalAnalysis: causalAnalysis as any,
    validatedTreatment: validatedTreatment as any,
    patientContext: patientContext as any,
  });

  // Digital Review Board safety check
  const rawReview = await aiService.performSafetyReview({
    carePlan,
    patientContext: patientContext as any,
  });

  // Augment with fields required by our extended SafetyReviewResult type
  // Cast safetyAlerts to our richer type — requiresPhysicianAcknowledgment defaults to true for critical/warning
  const augmentedAlerts = rawReview.safetyAlerts.map((a: any) => ({
    ...a,
    category: a.category ?? "guideline",
    requiresPhysicianAcknowledgment: a.severity === "critical" || a.severity === "warning",
  }));
  const augmentedChecks = rawReview.complianceChecks.map((c: any) => ({
    ...c,
    guidelineSource: c.guidelineSource ?? "Clinical Guidelines",
  }));
  const safetyReview: SafetyReviewResult = {
    safetyAlerts: augmentedAlerts,
    complianceChecks: augmentedChecks,
    overallStatus: rawReview.overallStatus,
    reviewSummary: rawReview.reviewSummary,
    criticalAlertCount: augmentedAlerts.filter((a: any) => a.severity === "critical").length,
    requiresPhysicianReview: rawReview.overallStatus !== "approved",
  };

  return { carePlan, safetyReview };
}

// ─────────────────────────────────────────────
// TREATMENT RECOMMENDATIONS (direct path)
// ─────────────────────────────────────────────

/**
 * Generate ranked treatment recommendations without running the
 * full three-gate pipeline. Used by the Treatment Recommendations UI.
 */
export async function getTreatmentRecommendations(
  patientContext: PatientContext,
  maxRecommendations: number = 3
): Promise<TreatmentRecommendation[]> {
  return generateTreatmentRecommendations(patientContext, maxRecommendations);
}

// ─────────────────────────────────────────────
// POLICY LEARNING
// ─────────────────────────────────────────────

/**
 * Record a physician-verified outcome and update treatment policy.
 * Called after a patient follow-up confirms treatment result.
 *
 * @param outcome - The outcome to record
 * @param allOutcomesForTreatment - All known outcomes for this treatment code
 *        (query from patient_outcomes table before calling this)
 */
export async function recordOutcome(
  outcome: OutcomeRecord,
  allOutcomesForTreatment: OutcomeRecord[]
): Promise<{ recorded: true; policyUpdated: boolean; policyResult?: PolicyUpdateResult }> {
  return recordOutcomeAndUpdatePolicy(outcome, allOutcomesForTreatment);
}

/**
 * Manually trigger a policy update for a treatment code.
 * Used by the admin panel to recalculate confidence scores.
 */
export async function refreshTreatmentPolicy(
  treatmentCode: string,
  outcomes: OutcomeRecord[],
  previousConfidence: number
): Promise<PolicyUpdateResult> {
  return updateTreatmentPolicy(treatmentCode, outcomes, previousConfidence);
}

// ─────────────────────────────────────────────
// EVIDENCE (direct access)
// ─────────────────────────────────────────────

/**
 * Retrieve evidence for a clinical query without running full analysis.
 * Used by the Knowledge Base and Clinical Library pages.
 */
export async function getEvidence(query: EvidenceQuery) {
  return retrieveEvidence(query);
}
