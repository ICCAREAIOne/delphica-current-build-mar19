/**
 * ============================================================
 * CAUSAL AI ENGINE — PUBLIC API
 * server/causal/index.ts
 *
 * Import everything you need from here.
 * Do not import directly from sub-modules in router code.
 *
 * Usage in routers.ts:
 *   import { runCausalAnalysis, getTreatmentRecommendations } from "./causal";
 * ============================================================
 */

export {
  runCausalAnalysis,
  runDelphiConvergence,
  generateCarePlanWithSafetyReview,
  getTreatmentRecommendations,
  recordOutcome,
  refreshTreatmentPolicy,
  getEvidence,
} from "./orchestrator";

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
  EvidenceSource,
  CausalFactor,
  StatisticalCausalAnalysis,
  ValidatedOption,
  SafetyAlert,
  ComplianceCheck,
  LabResult,
  BiomarkerReading,
  FamilyHistoryEntry,
  LifestyleFactors,
} from "./types";
