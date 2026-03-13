/**
 * ============================================================
 * CAUSAL AI ENGINE — CAUSAL INFERENCE LAYER
 * server/causal/inference.ts
 *
 * The core reasoning engine. Takes patient context + evidence
 * and produces causal factor analysis and treatment validation.
 *
 * CURRENT STATE:  LLM-based causal reasoning (analysisMethod: "llm_simulated")
 * BUILD TARGET:   Statistical causal inference on real outcome data
 *
 * BUILD ORDER:
 *   Step 1 (now):    LLM causal reasoning — functional
 *   Step 2 (next):   Wire real patient_outcomes DB data into performStatisticalAnalysis()
 *   Step 3 (later):  Propensity score matching (use 'causal-inference' npm pkg or Python sidecar)
 *   Step 4 (later):  Delphi-2M longitudinal risk cross-pathway scoring
 * ============================================================
 */

import { invokeLLM } from "../_core/llm";
import { retrieveEvidence } from "./evidence";
import type {
  PatientContext,
  CausalAnalysisRequest,
  CausalAnalysisResult,
  StatisticalCausalAnalysis,
  ValidationRequest,
  CausalValidationResult,
  TreatmentRecommendation,
  EvidenceQuery,
} from "./types";

// ─────────────────────────────────────────────
// STEP 2 TODO: Statistical Causal Inference
//
// When patient_outcomes table has sufficient data (n > 30 per
// diagnosis-treatment pair), replace _llmCausalAnalysis() with
// performStatisticalAnalysis() below.
//
// Minimum viable statistical pipeline:
//   1. Query patient_outcomes WHERE diagnosisCode = X AND treatmentCode = Y
//   2. Build confounder matrix (age, gender, comorbidities, severity)
//   3. Run propensity score matching to balance treated vs control groups
//   4. Compute average treatment effect (ATE) and confidence interval
//   5. Return StatisticalCausalAnalysis with methodology: "propensity_score_matching"
//
// Recommended approach: Python sidecar via child_process.execFile()
// pointing to server/causal/scripts/causal_inference.py
// (scipy.stats + statsmodels for propensity scoring)
// ─────────────────────────────────────────────

/**
 * STEP 2 STUB: Statistical causal analysis.
 * Uncomment and implement when real outcome data is available.
 */
export async function performStatisticalAnalysis(
  diagnosisCode: string,
  treatmentCode: string,
  outcomeData: Array<{
    patientId: number;
    outcome: string;
    outcomeValue: number;
    confounders: Record<string, any>;
  }>
): Promise<StatisticalCausalAnalysis> {
  // TODO Step 2: Replace with real statistical computation
  // Minimum sample size check
  if (outcomeData.length < 10) {
    throw new Error(
      `Insufficient data for statistical analysis: ${outcomeData.length} records (minimum 10 required). Use LLM analysis instead.`
    );
  }

  // TODO: Implement propensity score matching
  // const { ate, ci, pValue } = await runPropensityScoreMatching(outcomeData);

  // TEMPORARY: LLM simulation until real stats are implemented
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a biostatistician performing causal inference analysis.
Analyze treatment effectiveness using the provided outcome data.
Consider confounders, selection bias, treatment adherence, and follow-up duration.
Methodology should reflect the data quality and sample size.
NOTE: This is a simulation — flag methodology as "llm_simulated".`,
      },
      {
        role: "user",
        content: `Diagnosis: ${diagnosisCode}
Treatment: ${treatmentCode}
Sample Size: ${outcomeData.length}
Outcomes (first 10):
${JSON.stringify(outcomeData.slice(0, 10), null, 2)}
Perform causal analysis.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "statistical_causal_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            effectSize: { type: "number" },
            confidenceInterval: { type: "string" },
            pValue: { type: "number" },
            methodology: { type: "string" },
            confounders: { type: "array", items: { type: "string" } },
            outcomeType: { type: "string" },
            outcomeValue: { type: "number" },
            analysisNotes: { type: "string" },
          },
          required: [
            "effectSize", "confidenceInterval", "pValue", "methodology",
            "confounders", "outcomeType", "outcomeValue", "analysisNotes",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Failed to perform causal analysis");
  }

  const parsed = JSON.parse(content);
  return {
    diagnosisCode,
    treatmentCode,
    sampleSize: outcomeData.length,
    effectSize: parsed.effectSize,
    confidenceInterval: parsed.confidenceInterval,
    pValue: parsed.pValue,
    methodology: "llm_simulated",   // TODO: Change to "propensity_score_matching" in Step 2
    confounders: parsed.confounders,
    outcomeType: parsed.outcomeType,
    outcomeValue: parsed.outcomeValue,
    analysisNotes: parsed.analysisNotes,
  };
}

/**
 * PRIMARY: LLM-based causal analysis.
 * Runs on every clinical session — does not require historical outcome data.
 * This is the main function called by the orchestrator.
 */
export async function performCausalAnalysis(
  request: CausalAnalysisRequest
): Promise<CausalAnalysisResult> {
  // Retrieve evidence to ground the analysis
  const evidenceQuery: EvidenceQuery = {
    diagnosisCode: request.patientContext.diagnosisCode,
    diagnosisDescription:
      request.patientContext.diagnosisDescription || request.patientContext.chiefComplaint,
    patientAge: request.patientContext.age,
    comorbidities: request.patientContext.chronicConditions,
    maxResults: 5,
  };
  const evidence = await retrieveEvidence(evidenceQuery);

  // Build knowledge base context if available
  let knowledgeContext = "";
  try {
    const db = await import("../db");
    const relevantKnowledge = await db.getRelevantKnowledgeForCondition(
      request.patientContext.chiefComplaint,
      request.patientContext.symptoms
    );
    if (relevantKnowledge.length > 0) {
      knowledgeContext = `\nRelevant Clinical Knowledge Base:\n${relevantKnowledge
        .map(
          (entry: any) =>
            `**${entry.compoundName}** (${entry.category}): ${entry.summary}`
        )
        .join("\n")}`;
    }
  } catch {
    // Knowledge base lookup is optional — continue without it
  }

  const evidenceContext = evidence
    .map((e, i) => `[${i + 1}] ${e.title} (${e.evidenceGrade}): ${e.keyFindings}`)
    .join("\n");

  const systemPrompt = `You are the Clinical Reasoning Engine — the central intelligence hub of a physician-governed clinical decision support system.

Your role:
1. Identify key causal factors driving the patient's condition
2. Map evidence-based relationships between factors and outcomes
3. Recommend specific scenarios for Delphi Simulator exploration
4. Surface clinical insights that guide physician decision-making

Rules:
- Be rigorous and evidence-based
- Distinguish between high/moderate/low evidence levels
- Flag uncertainty explicitly — do not overstate confidence
- Recommend 3–5 simulation scenarios, ordered by clinical priority`;

  const userPrompt = `Patient Context (${request.dataSource === "physician_guided" ? "Physician-Guided" : "Patient-Initiated"}):
Age: ${request.patientContext.age} | Gender: ${request.patientContext.gender}
Chief Complaint: ${request.patientContext.chiefComplaint}
Symptoms: ${request.patientContext.symptoms.join(", ")}
${request.patientContext.diagnosisCode ? `Diagnosis: ${request.patientContext.diagnosisCode} — ${request.patientContext.diagnosisDescription}` : ""}
${request.patientContext.chronicConditions?.length ? `Chronic Conditions: ${request.patientContext.chronicConditions.join(", ")}` : ""}
${request.patientContext.currentMedications?.length ? `Current Medications: ${request.patientContext.currentMedications.join(", ")}` : ""}
${request.patientContext.allergies?.length ? `Allergies: ${request.patientContext.allergies.join(", ")}` : ""}

Clinical Question: ${request.clinicalQuestion}

Evidence Retrieved:
${evidenceContext}
${knowledgeContext}

Perform comprehensive causal analysis.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "causal_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            analysisId: { type: "string" },
            patientSummary: { type: "string" },
            causalFactors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string" },
                  direction: { type: "string" },
                  impact: { type: "string" },
                  confidence: { type: "number" },
                  evidenceLevel: { type: "string" },
                  evidenceSource: { type: "string" },
                },
                required: ["factor", "direction", "impact", "confidence", "evidenceLevel", "evidenceSource"],
                additionalProperties: false,
              },
            },
            clinicalInsights: { type: "array", items: { type: "string" } },
            recommendedSimulationScenarios: { type: "array", items: { type: "string" } },
            confidenceScore: { type: "number" },
          },
          required: [
            "analysisId", "patientSummary", "causalFactors",
            "clinicalInsights", "recommendedSimulationScenarios", "confidenceScore",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Clinical Reasoning Engine: no valid response from LLM");
  }

  const parsed = JSON.parse(content);
  return {
    ...parsed,
    evidenceSources: evidence,
    analysisMethod: "llm_simulated",
    sessionId: request.sessionId,
    createdAt: new Date(),
  };
}

/**
 * Validate Delphi Simulator scenarios against causal analysis.
 * This is the convergence step — called by the orchestrator after
 * runDelphiSimulation() returns.
 */
export async function validateAndOptimize(
  request: ValidationRequest
): Promise<CausalValidationResult> {
  const systemPrompt = `You are the Clinical Reasoning Engine performing convergence validation.
You have completed causal analysis and the Delphi Simulator has generated treatment scenarios.
Your job: validate each scenario against your causal analysis and select the optimal path.

Scoring criteria:
- causalValidity (0–1): Does this scenario address the identified causal factors?
- evidenceAlignment (0–1): Is this scenario supported by the retrieved evidence?
- recommendation: "proceed" | "modify" | "reject"

Be conservative — if a scenario contradicts causal analysis, reject it.`;

  const userPrompt = `Causal Analysis Summary:
${request.causalAnalysis.patientSummary}

Key Causal Factors:
${request.causalAnalysis.causalFactors
  .map((f) => `- ${f.factor} (${f.evidenceLevel} evidence, confidence: ${f.confidence})`)
  .join("\n")}

Delphi Simulator Scenarios:
${request.delphiSimulation.treatmentOptions
  .map((o, i) => `${i + 1}. ${o.option}: ${o.description}`)
  .join("\n")}

Delphi Recommendations to Causal Brain:
${request.delphiSimulation.recommendationsForCausalBrain.join("\n")}

Validate and select optimal treatment path.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "causal_validation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            validatedOptions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  option: { type: "string" },
                  causalValidity: { type: "number" },
                  evidenceAlignment: { type: "number" },
                  recommendation: { type: "string" },
                  rationale: { type: "string" },
                },
                required: ["option", "causalValidity", "evidenceAlignment", "recommendation", "rationale"],
                additionalProperties: false,
              },
            },
            optimalPath: { type: "string" },
            convergenceRationale: { type: "string" },
            requiresRefinement: { type: "boolean" },
            refinementSuggestions: { type: "array", items: { type: "string" } },
          },
          required: ["validatedOptions", "optimalPath", "convergenceRationale", "requiresRefinement", "refinementSuggestions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Convergence validation: no valid response from LLM");
  }

  return JSON.parse(content);
}

/**
 * Generate ranked treatment recommendations from causal analysis.
 * Called directly by the tRPC router for the Treatment Recommendations UI.
 */
export async function generateTreatmentRecommendations(
  patientContext: PatientContext,
  maxRecommendations: number = 3
): Promise<TreatmentRecommendation[]> {
  const evidenceQuery: EvidenceQuery = {
    diagnosisCode: patientContext.diagnosisCode,
    diagnosisDescription: patientContext.diagnosisDescription || patientContext.chiefComplaint,
    patientAge: patientContext.age,
    comorbidities: patientContext.chronicConditions,
    maxResults: 5,
  };
  const evidence = await retrieveEvidence(evidenceQuery);

  const evidenceContext = evidence
    .map((e, i) => `[${i + 1}] ${e.title}: ${e.keyFindings}`)
    .join("\n\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert clinical decision support system.
Generate ${maxRecommendations} evidence-based treatment recommendations ranked by confidence.
For each recommendation, specify the longitudinalRiskImpact (improves/worsens/neutral/unknown)
to support Delphi-2M cross-pathway compatibility scoring.`,
      },
      {
        role: "user",
        content: `Patient:
Age: ${patientContext.age} | Gender: ${patientContext.gender}
Diagnosis: ${patientContext.diagnosisDescription || patientContext.chiefComplaint}
${patientContext.diagnosisCode ? `ICD-10: ${patientContext.diagnosisCode}` : ""}
Symptoms: ${patientContext.symptoms.join(", ")}
Allergies: ${patientContext.allergies?.join(", ") || "None"}
Chronic Conditions: ${patientContext.chronicConditions?.join(", ") || "None"}
Current Medications: ${patientContext.currentMedications?.join(", ") || "None"}

Evidence:
${evidenceContext}

Generate treatment recommendations.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "treatment_recommendations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  treatmentName: { type: "string" },
                  treatmentType: { type: "string" },
                  confidenceScore: { type: "number" },
                  reasoning: { type: "string" },
                  indicatedFor: { type: "string" },
                  contraindications: { type: "array", items: { type: "string" } },
                  expectedOutcome: { type: "string" },
                  alternativeTreatments: { type: "array", items: { type: "string" } },
                  suggestedDosage: { type: "string" },
                  suggestedFrequency: { type: "string" },
                  suggestedDuration: { type: "string" },
                  longitudinalRiskImpact: { type: "string" },
                  longitudinalRiskNotes: { type: "string" },
                },
                required: [
                  "treatmentName", "treatmentType", "confidenceScore",
                  "reasoning", "indicatedFor", "contraindications",
                  "expectedOutcome", "alternativeTreatments",
                  "suggestedDosage", "suggestedFrequency", "suggestedDuration",
                  "longitudinalRiskImpact", "longitudinalRiskNotes",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["recommendations"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") return [];

  const parsed = JSON.parse(content);
  // Attach evidence sources to each recommendation
  return parsed.recommendations.map((rec: any) => ({
    ...rec,
    evidenceSources: evidence,
  }));
}
