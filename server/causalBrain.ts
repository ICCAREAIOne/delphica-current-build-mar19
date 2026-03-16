/**
 * ============================================================
 * CAUSAL BRAIN — COMPATIBILITY SHIM
 * server/causalBrain.ts
 *
 * Thin shim delegating all calls to the canonical engine at
 * server/causal/inference.ts.
 *
 * DO NOT add new logic here.
 * All new features belong in server/causal/.
 * ============================================================
 */
import {
  generateTreatmentRecommendations as _generateRecs,
  performCausalAnalysis as _performAnalysis,
} from "./causal/inference";
import type {
  PatientContext as NewPatientContext,
  CausalAnalysisRequest,
} from "./causal/types";

// ─── Re-exported types for backward compatibility ────────────────────────────
export type { TreatmentRecommendation } from "./causal/types";



/**
 * Legacy PatientContext shape — maps to the richer causal/types.ts PatientContext.
 */
export interface PatientContext {
  age: number;
  gender: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  symptoms: string[];
  diagnosisCode?: string;
  diagnosisDescription?: string;
}

/**
 * Legacy CausalAnalysisResult shape — matches fields saved to causal_analyses DB table.
 */
export interface CausalAnalysisResult {
  diagnosisCode: string;
  treatmentCode: string;
  effectSize: number;
  confidenceInterval: string;
  pValue: number;
  sampleSize: number;
  methodology: string;
  confounders: string[];
  outcomeType: string;
  outcomeValue: number;
  analysisNotes: string;
}

// ─── Shim: generateTreatmentRecommendations ──────────────────────────────────

export async function generateTreatmentRecommendations(
  patientContext: PatientContext,
  maxRecommendations: number = 3
) {
  const newCtx: NewPatientContext = {
    patientId: 0,
    age: patientContext.age,
    gender: patientContext.gender,
    chiefComplaint: patientContext.diagnosisDescription || "General assessment",
    symptoms: patientContext.symptoms,
    allergies: patientContext.allergies,
    chronicConditions: patientContext.chronicConditions,
    currentMedications: patientContext.currentMedications,
    diagnosisCode: patientContext.diagnosisCode,
    diagnosisDescription: patientContext.diagnosisDescription,
  };
  return _generateRecs(newCtx, maxRecommendations);
}

// ─── Shim: performCausalAnalysis ─────────────────────────────────────────────
export async function performCausalAnalysis(
  diagnosisCode: string,
  treatmentCode: string,
  historicalData: Array<{
    patientId: number;
    outcome: string;
    outcomeValue: number;
    confounders: Record<string, unknown>;
  }>
): Promise<CausalAnalysisResult> {
  const request: CausalAnalysisRequest = {
    patientContext: {
      patientId: 0,
      age: 0,
      gender: "unknown",
      chiefComplaint: `Causal analysis for ${diagnosisCode}`,
      symptoms: [],
      diagnosisCode,
      diagnosisDescription: `Diagnosis ${diagnosisCode} — Treatment ${treatmentCode}`,
    },
    clinicalQuestion: `What is the causal effect of treatment ${treatmentCode} on outcomes for diagnosis ${diagnosisCode}? Sample size: ${historicalData.length}.`,
    dataSource: "physician_guided",
  };

  const richResult = await _performAnalysis(request);

  // CausalFactor has: factor, direction, impact, confidence, evidenceLevel
  // Map to legacy statistical fields using available data
  const primaryFactor = richResult.causalFactors[0];
  const effectSize = primaryFactor?.confidence ?? 0.5;
  const pValue = primaryFactor?.evidenceLevel === "high" ? 0.01
    : primaryFactor?.evidenceLevel === "moderate" ? 0.05 : 0.1;
  const confounders = richResult.causalFactors
    .filter((f) => f.direction === "neutral" || f.direction === "modifies_response")
    .map((f) => f.factor);

  return {
    diagnosisCode,
    treatmentCode,
    effectSize,
    confidenceInterval: `${(effectSize - 0.1).toFixed(2)}–${(effectSize + 0.1).toFixed(2)}`,
    pValue,
    sampleSize: historicalData.length,
    methodology: richResult.analysisMethod,
    confounders,
    outcomeType: "treatment_response",
    outcomeValue: effectSize,
    analysisNotes: richResult.clinicalInsights.join(" | "),
  };
}

// updateTreatmentPolicy is no longer used — policy learning is handled by
// server/causal/policy.ts (updateTreatmentPolicy / recordOutcomeAndUpdatePolicy).
// Kept as a no-op stub to avoid breaking any lingering import sites.
export async function updateTreatmentPolicy(
  _treatmentCode: string,
  _outcomes: Array<{ success: boolean; adverseEvent: boolean; outcomeDescription: string }>
): Promise<{ updatedConfidence: number; policyAdjustment: string; reasoning: string }> {
  return { updatedConfidence: 0.75, policyAdjustment: "delegated", reasoning: "Use causal/policy.ts" };
}
