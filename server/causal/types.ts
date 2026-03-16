/**
 * ============================================================
 * CAUSAL AI ENGINE — SHARED TYPES
 * server/causal/types.ts
 *
 * Single source of truth for all interfaces used across the
 * Clinical Reasoning Engine, Evidence Layer, Inference Layer,
 * and Policy Learning modules.
 * ============================================================
 */

// ─────────────────────────────────────────────
// PATIENT CONTEXT
// ─────────────────────────────────────────────

export interface PatientContext {
  patientId: number;
  age: number;
  gender: string;
  chiefComplaint: string;
  symptoms: string[];
  vitalSigns?: Record<string, string | number>;
  chronicConditions?: string[];
  currentMedications?: string[];
  allergies?: string[];
  labResults?: LabResult[];
  // DAO Protocol structured data
  diagnosisCode?: string;
  diagnosisDescription?: string;
  // Longitudinal data for Delphi-2M integration
  biomarkers?: BiomarkerReading[];
  familyHistory?: FamilyHistoryEntry[];
  lifestyleFactors?: LifestyleFactors;
}

export interface LabResult {
  testName: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  flag?: "high" | "low" | "critical" | "normal";
  collectedAt?: Date;
}

export interface BiomarkerReading {
  name: string;
  value: number;
  unit: string;
  measuredAt: Date;
}

export interface FamilyHistoryEntry {
  relation: string;
  condition: string;
  ageOfOnset?: number;
}

export interface LifestyleFactors {
  smokingStatus?: "never" | "former" | "current";
  alcoholUse?: "none" | "moderate" | "heavy";
  exerciseFrequency?: "sedentary" | "light" | "moderate" | "vigorous";
  bmi?: number;
  diet?: string;
}

// ─────────────────────────────────────────────
// EVIDENCE LAYER
// ─────────────────────────────────────────────

export interface EvidenceSource {
  title: string;
  authors?: string;
  publicationDate?: string;
  journal?: string;
  doi?: string;
  pmid?: string;                // PubMed ID — used for real API retrieval
  abstract?: string;
  keyFindings: string;
  evidenceGrade: "A" | "B" | "C" | "D" | "expert_opinion";
  studyType?: "RCT" | "meta_analysis" | "cohort" | "case_control" | "guideline" | "case_series";
  relevanceScore: number;       // 0–100
  isVerified: boolean;          // true = retrieved from real API; false = LLM-generated
  retrievedAt: Date;
}

export interface EvidenceQuery {
  diagnosisCode?: string;
  diagnosisDescription?: string;
  treatmentName?: string;
  patientAge?: number;
  patientGender?: string;
  comorbidities?: string[];
  maxResults?: number;
}

// ─────────────────────────────────────────────
// CAUSAL INFERENCE LAYER
// ─────────────────────────────────────────────

export interface CausalFactor {
  factor: string;
  direction: "increases_risk" | "decreases_risk" | "modifies_response" | "neutral";
  impact: string;
  confidence: number;           // 0–1
  evidenceLevel: "high" | "moderate" | "low";
  evidenceSource?: string;
}

export interface CausalAnalysisRequest {
  patientContext: PatientContext;
  clinicalQuestion: string;
  dataSource: "physician_guided" | "patient_initiated";
  sessionId?: number;
}

export interface CausalAnalysisResult {
  analysisId: string;
  sessionId?: number;
  patientSummary: string;
  causalFactors: CausalFactor[];
  evidenceSources: EvidenceSource[];
  clinicalInsights: string[];
  recommendedSimulationScenarios: string[];
  confidenceScore: number;      // 0–100
  analysisMethod: "llm_simulated" | "statistical" | "hybrid";
  createdAt: Date;
}

// Statistical causal inference — used when real outcome data is available
export interface StatisticalCausalAnalysis {
  diagnosisCode: string;
  treatmentCode: string;
  sampleSize: number;
  effectSize: number;
  confidenceInterval: string;   // e.g. "0.45–0.72"
  pValue: number;
  methodology: "propensity_score_matching" | "instrumental_variables" | "difference_in_differences" | "regression_discontinuity" | "llm_simulated";
  confounders: string[];
  outcomeType: string;
  outcomeValue: number;
  analysisNotes: string;
  // TODO: Add when real data pipeline is built
  // numberNeededToTreat?: number;
  // absoluteRiskReduction?: number;
  // relativeRiskReduction?: number;
}

// ─────────────────────────────────────────────
// TREATMENT RECOMMENDATIONS
// ─────────────────────────────────────────────

export interface TreatmentRecommendation {
  treatmentName: string;
  treatmentType: "medication" | "procedure" | "lifestyle" | "referral" | "monitoring" | "other";
  confidenceScore: number;      // 0–1
  reasoning: string;
  evidenceSources: EvidenceSource[];
  indicatedFor?: string;
  contraindications?: string[];
  expectedOutcome?: string;
  alternativeTreatments?: string[];
  suggestedDosage?: string;
  suggestedFrequency?: string;
  suggestedDuration?: string;
  // Delphi-2M cross-pathway compatibility
  longitudinalRiskImpact?: "improves" | "worsens" | "neutral" | "unknown";
  longitudinalRiskNotes?: string;
}

// ─────────────────────────────────────────────
// DELPHI SIMULATOR INTEGRATION
// ─────────────────────────────────────────────

export interface TreatmentOption {
  option: string;
  description: string;
  predictedOutcome: string;
  confidence: number;
  risks: string[];
  benefits: string[];
  evidenceSupport: string;
}

export interface DelphiSimulationRequest {
  causalAnalysis: CausalAnalysisResult;
  scenarioToExplore: string;
  iterationNumber: number;
  previousFeedback?: string;
}

export interface DelphiSimulationResult {
  simulationId: string;
  scenarioDescription: string;
  treatmentOptions: TreatmentOption[];
  outcomeAnalysis: string;
  uncertaintyFactors: string[];
  recommendationsForCausalBrain: string[];
}

// ─────────────────────────────────────────────
// CONVERGENCE (validateAndOptimize)
// ─────────────────────────────────────────────

export interface ValidationRequest {
  causalAnalysis: CausalAnalysisResult;
  delphiSimulation: DelphiSimulationResult;
  patientContext: PatientContext;
}

export interface ValidatedOption {
  option: string;
  causalValidity: number;       // 0–1
  evidenceAlignment: number;    // 0–1
  recommendation: "proceed" | "modify" | "reject";
  rationale: string;
}

export interface CausalValidationResult {
  validatedOptions: ValidatedOption[];
  optimalPath: string;
  convergenceRationale: string;
  requiresRefinement: boolean;
  refinementSuggestions?: string[];
}

// ─────────────────────────────────────────────
// POLICY LEARNING
// ─────────────────────────────────────────────

export interface OutcomeRecord {
  patientId: number;
  sessionId: number;
  treatmentCode: string;
  diagnosisCode: string;
  success: boolean;
  adverseEvent: boolean;
  adverseEventDescription?: string;
  outcomeDescription: string;
  outcomeValue?: number;
  /** Measured value of the primary outcome instrument (e.g., HbA1c = 6.8) */
  measuredValue?: number;
  /** Baseline value before treatment started (required for drop_by operator) */
  baselineValue?: number;
  followUpDays: number;
  recordedAt: Date;
}

export interface PolicyUpdateResult {
  treatmentCode: string;
  previousConfidence: number;
  updatedConfidence: number;
  policyAdjustment: string;
  reasoning: string;
  sampleSize: number;
  successRate: number;
  adverseEventRate: number;
  updatedAt: Date;
}

// ─────────────────────────────────────────────
// SAFETY REVIEW (Digital Review Board)
// ─────────────────────────────────────────────

export interface SafetyAlert {
  severity: "critical" | "warning" | "info";
  category: "drug_interaction" | "allergy" | "dosage" | "contraindication" | "guideline" | "age_specific";
  message: string;
  recommendation: string;
  requiresPhysicianAcknowledgment: boolean;
}

export interface ComplianceCheck {
  guideline: string;
  guidelineSource: string;      // e.g. "ACC/AHA 2023", "JNC 8"
  status: "pass" | "fail" | "warning";
  details: string;
}

export interface SafetyReviewResult {
  safetyAlerts: SafetyAlert[];
  complianceChecks: ComplianceCheck[];
  overallStatus: "approved" | "flagged" | "rejected";
  reviewSummary: string;
  criticalAlertCount: number;
  requiresPhysicianReview: boolean;
}

// ─────────────────────────────────────────────
// PRECISION CARE PLAN
// ─────────────────────────────────────────────

export interface Intervention {
  intervention: string;
  frequency: string;
  duration: string;
  rationale: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  purpose: string;
  rxnormCode?: string;          // TODO: populate from RxNorm API
}

export interface LifestyleRecommendation {
  recommendation: string;
  rationale: string;
}

export interface FollowUp {
  action: string;
  timeframe: string;
}

export interface PrecisionCarePlanResult {
  planTitle: string;
  executiveSummary: string;
  goals: string[];
  interventions: Intervention[];
  medications: Medication[];
  lifestyle: LifestyleRecommendation[];
  followUp: FollowUp[];
  causalRationale: string;
  evidenceBasis: string[];
}
