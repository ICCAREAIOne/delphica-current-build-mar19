import { invokeLLM } from "./_core/llm";

/**
 * AI Service for Clinical Decision Support
 * Implements the bidirectional framework with Causal Brain as central intelligence hub
 */

// ============ Causal Brain (Central Intelligence Hub) ============

export interface PatientContext {
  age: number;
  gender: string;
  chiefComplaint: string;
  symptoms: string[];
  vitalSigns?: Record<string, any>;
  chronicConditions?: string[];
  currentMedications?: string[];
  allergies?: string[];
  labResults?: any[];
}

export interface CausalAnalysisRequest {
  patientContext: PatientContext;
  clinicalQuestion: string;
  dataSource: "physician_guided" | "patient_initiated";
}

export interface CausalFactor {
  factor: string;
  impact: string;
  confidence: number;
  evidenceLevel: string;
}

export interface EvidenceSource {
  source: string;
  citation: string;
  relevance: number;
  qualityRating: string;
}

export interface CausalAnalysisResult {
  analysisId: string;
  patientSummary: string;
  causalFactors: CausalFactor[];
  evidenceSources: EvidenceSource[];
  clinicalInsights: string[];
  recommendedSimulationScenarios: string[];
  confidenceScore: number;
}

/**
 * Causal Brain: Central intelligence hub that performs causal analysis
 * This is the FIRST step - analyzes patient data before engaging Delphi
 */
export async function performCausalAnalysis(
  request: CausalAnalysisRequest
): Promise<CausalAnalysisResult> {
  // Retrieve relevant knowledge base entries for this condition
  const db = await import("./db");
  const relevantKnowledge = await db.getRelevantKnowledgeForCondition(
    request.patientContext.chiefComplaint,
    request.patientContext.symptoms
  );
  
  const systemPrompt = `You are the Causal Brain - the central intelligence hub of a clinical decision support system.
Your role is to perform deep causal analysis of patient data to identify:
1. Key causal factors affecting the patient's condition
2. Evidence-based relationships between factors and outcomes
3. Optimal scenarios to explore through simulation
4. Clinical insights that guide treatment decisions

You use causal inference, policy learning, and evidence integration to provide the foundation for all downstream decisions.
Be rigorous, evidence-based, and identify the most clinically relevant causal relationships.`;

  const userPrompt = `Patient Context (${request.dataSource === "physician_guided" ? "Physician-Guided Entry" : "Patient-Initiated Entry"}):
- Age: ${request.patientContext.age}
- Gender: ${request.patientContext.gender}
- Chief Complaint: ${request.patientContext.chiefComplaint}
- Symptoms: ${request.patientContext.symptoms.join(", ")}
${request.patientContext.chronicConditions?.length ? `- Chronic Conditions: ${request.patientContext.chronicConditions.join(", ")}` : ""}
${request.patientContext.currentMedications?.length ? `- Current Medications: ${request.patientContext.currentMedications.join(", ")}` : ""}
${request.patientContext.allergies?.length ? `- Allergies: ${request.patientContext.allergies.join(", ")}` : ""}

Clinical Question: ${request.clinicalQuestion}

${relevantKnowledge.length > 0 ? `
Relevant Clinical Knowledge Base Entries:
${relevantKnowledge.map((entry: any) => `
**${entry.compoundName}** (${entry.category}):
${entry.summary}

Mechanisms:
${entry.mechanisms.map((m: any) => `- ${m.name}: ${m.description}`).join('\n')}

Clinical Evidence:
${entry.clinicalEvidence.map((e: any) => `- ${e.finding}`).join('\n')}
`).join('\n---\n')}

Consider these evidence-based interventions when formulating treatment recommendations.` : ''}

Perform comprehensive causal analysis and recommend scenarios for Delphi Simulator exploration.`;

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
            analysisId: { type: "string", description: "Unique identifier for this analysis" },
            patientSummary: { type: "string", description: "Concise clinical summary" },
            causalFactors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string", description: "Causal factor name" },
                  impact: { type: "string", description: "Description of causal impact" },
                  confidence: { type: "number", description: "Confidence 0-1" },
                  evidenceLevel: { type: "string", description: "Evidence quality (high/moderate/low)" },
                },
                required: ["factor", "impact", "confidence", "evidenceLevel"],
                additionalProperties: false,
              },
            },
            evidenceSources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source: { type: "string", description: "Source name" },
                  citation: { type: "string", description: "Citation or reference" },
                  relevance: { type: "number", description: "Relevance score 0-1" },
                  qualityRating: { type: "string", description: "Quality rating (A/B/C)" },
                },
                required: ["source", "citation", "relevance", "qualityRating"],
                additionalProperties: false,
              },
            },
            clinicalInsights: {
              type: "array",
              items: { type: "string" },
              description: "Key clinical insights from causal analysis",
            },
            recommendedSimulationScenarios: {
              type: "array",
              items: { type: "string" },
              description: "Scenarios to explore with Delphi Simulator",
            },
            confidenceScore: { type: "number", description: "Overall confidence 0-100" },
          },
          required: [
            "analysisId",
            "patientSummary",
            "causalFactors",
            "evidenceSources",
            "clinicalInsights",
            "recommendedSimulationScenarios",
            "confidenceScore",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from Causal Brain");
  }

  return JSON.parse(content);
}

// ============ Delphi Simulator (Bidirectional with Causal Brain) ============

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

/**
 * Delphi Simulator: Generates treatment scenarios based on Causal Brain guidance
 * Receives causal analysis and produces scenarios for validation
 */
export async function runDelphiSimulation(
  request: DelphiSimulationRequest
): Promise<DelphiSimulationResult> {
  const systemPrompt = `You are the Delphi Simulator - an AI-powered generative role-play engine for clinical scenario exploration.
You work in BIDIRECTIONAL communication with the Causal Brain:
- You RECEIVE: Causal analysis, patient context, and specific scenarios to explore
- You GENERATE: Multiple treatment options with detailed predictions
- You PROVIDE: Recommendations back to Causal Brain for validation

Your role is to creatively explore treatment possibilities while staying grounded in medical evidence.
Generate diverse, clinically plausible scenarios with detailed outcome predictions.`;

  const feedbackContext = request.previousFeedback
    ? `\n\nPrevious Causal Brain Feedback (Iteration ${request.iterationNumber}):\n${request.previousFeedback}\n\nRefine your scenarios based on this feedback.`
    : "";

  const userPrompt = `Causal Brain Analysis Summary:
${request.causalAnalysis.patientSummary}

Key Causal Factors:
${request.causalAnalysis.causalFactors.map((f) => `- ${f.factor}: ${f.impact} (Confidence: ${f.confidence})`).join("\n")}

Clinical Insights:
${request.causalAnalysis.clinicalInsights.map((i) => `- ${i}`).join("\n")}

Scenario to Explore: ${request.scenarioToExplore}${feedbackContext}

Generate detailed treatment options with outcome predictions for Causal Brain validation.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "delphi_simulation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            simulationId: { type: "string", description: "Unique simulation identifier" },
            scenarioDescription: { type: "string", description: "Detailed scenario description" },
            treatmentOptions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  option: { type: "string", description: "Treatment option name" },
                  description: { type: "string", description: "Detailed description" },
                  predictedOutcome: { type: "string", description: "Expected outcome" },
                  confidence: { type: "number", description: "Confidence 0-1" },
                  risks: {
                    type: "array",
                    items: { type: "string" },
                    description: "Potential risks",
                  },
                  benefits: {
                    type: "array",
                    items: { type: "string" },
                    description: "Expected benefits",
                  },
                  evidenceSupport: { type: "string", description: "Evidence level for this option" },
                },
                required: ["option", "description", "predictedOutcome", "confidence", "risks", "benefits", "evidenceSupport"],
                additionalProperties: false,
              },
            },
            outcomeAnalysis: { type: "string", description: "Comparative outcome analysis" },
            uncertaintyFactors: {
              type: "array",
              items: { type: "string" },
              description: "Factors creating uncertainty",
            },
            recommendationsForCausalBrain: {
              type: "array",
              items: { type: "string" },
              description: "Recommendations for Causal Brain to consider",
            },
          },
          required: [
            "simulationId",
            "scenarioDescription",
            "treatmentOptions",
            "outcomeAnalysis",
            "uncertaintyFactors",
            "recommendationsForCausalBrain",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from Delphi Simulator");
  }

  return JSON.parse(content);
}

// ============ Causal Brain: Validation & Optimization ============

export interface CausalValidationRequest {
  causalAnalysis: CausalAnalysisResult;
  delphiSimulation: DelphiSimulationResult;
}

export interface CausalValidationResult {
  validatedOptions: Array<{
    option: string;
    causalValidity: number;
    evidenceAlignment: number;
    recommendation: "approved" | "needs_refinement" | "rejected";
    rationale: string;
  }>;
  optimalChoice: string;
  optimizationRationale: string;
  needsRefinement: boolean;
  refinementGuidance?: string;
}

/**
 * Causal Brain: Validates Delphi scenarios and selects optimal treatment
 * This completes the bidirectional loop before sending to Precision Care
 */
export async function validateAndOptimize(
  request: CausalValidationRequest
): Promise<CausalValidationResult> {
  const systemPrompt = `You are the Causal Brain performing validation and optimization.
You received treatment scenarios from Delphi Simulator. Now you must:
1. Validate each scenario against your causal analysis
2. Check evidence alignment and causal validity
3. Select the optimal treatment path
4. Determine if refinement is needed (send back to Delphi)

Use rigorous causal reasoning and evidence-based validation. Be conservative - if scenarios don't align with causal analysis, request refinement.`;

  const userPrompt = `Your Original Causal Analysis:
${request.causalAnalysis.patientSummary}

Key Causal Factors:
${request.causalAnalysis.causalFactors.map((f) => `- ${f.factor} (${f.evidenceLevel} evidence)`).join("\n")}

Delphi Simulator Results:
Scenario: ${request.delphiSimulation.scenarioDescription}

Treatment Options:
${request.delphiSimulation.treatmentOptions.map((opt, i) => `${i + 1}. ${opt.option}: ${opt.description} (Confidence: ${opt.confidence})`).join("\n")}

Delphi's Recommendations:
${request.delphiSimulation.recommendationsForCausalBrain.join("\n")}

Validate these options against your causal analysis and select the optimal path.`;

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
                  option: { type: "string", description: "Treatment option name" },
                  causalValidity: { type: "number", description: "Causal validity score 0-1" },
                  evidenceAlignment: { type: "number", description: "Evidence alignment 0-1" },
                  recommendation: {
                    type: "string",
                    enum: ["approved", "needs_refinement", "rejected"],
                    description: "Validation recommendation",
                  },
                  rationale: { type: "string", description: "Validation rationale" },
                },
                required: ["option", "causalValidity", "evidenceAlignment", "recommendation", "rationale"],
                additionalProperties: false,
              },
            },
            optimalChoice: { type: "string", description: "Selected optimal treatment" },
            optimizationRationale: { type: "string", description: "Why this is optimal" },
            needsRefinement: { type: "boolean", description: "Should scenarios be refined?" },
            refinementGuidance: { type: "string", description: "Guidance for Delphi refinement (if needed)" },
          },
          required: ["validatedOptions", "optimalChoice", "optimizationRationale", "needsRefinement"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from Causal Brain validation");
  }

  return JSON.parse(content);
}

// ============ Precision Care Plan Generator ============

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
}

export interface LifestyleRecommendation {
  recommendation: string;
  rationale: string;
}

export interface FollowUp {
  action: string;
  timeframe: string;
}

export interface PrecisionCarePlanRequest {
  causalAnalysis: CausalAnalysisResult;
  validatedTreatment: CausalValidationResult;
  patientContext: PatientContext;
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

/**
 * Precision Care: Generates detailed care plan from Causal Brain's optimized output
 */
export async function generatePrecisionCarePlan(
  request: PrecisionCarePlanRequest
): Promise<PrecisionCarePlanResult> {
  const systemPrompt = `You are the Precision Care output generator.
You receive OPTIMIZED treatment recommendations from the Causal Brain and create detailed, actionable care plans.

Your plans must be:
1. Personalized to the specific patient
2. Based on the causal analysis and validated treatment
3. Actionable with specific steps and timelines
4. Evidence-based with clear rationale
5. Ready for Digital Review Board safety verification`;

  const insuranceContext = (request.patientContext as any).insuranceBenefits
    ? `\nInsurance Coverage:\n- Primary Insurer: ${(request.patientContext as any).insuranceBenefits.primaryInsurer ?? 'Unknown'}\n- Plan Type: ${(request.patientContext as any).insuranceBenefits.planType ?? 'Unknown'}${(request.patientContext as any).insuranceBenefits.benefitsSummary ? `\n- Benefits Summary: ${JSON.stringify((request.patientContext as any).insuranceBenefits.benefitsSummary)}` : ''}\nIMPORTANT: Flag any recommended treatments that may require prior authorization, are typically excluded from this plan type, or have significant out-of-pocket costs. Where clinically appropriate, suggest covered alternatives.`
    : '';

  const userPrompt = `Patient Context:
- Age: ${request.patientContext.age}
- Gender: ${request.patientContext.gender}
${request.patientContext.allergies?.length ? `- Allergies: ${request.patientContext.allergies.join(", ")}` : ""}
${request.patientContext.chronicConditions?.length ? `- Chronic Conditions: ${request.patientContext.chronicConditions.join(", ")}` : ""}${insuranceContext}

Causal Brain's Optimal Treatment: ${request.validatedTreatment.optimalChoice}

Optimization Rationale: ${request.validatedTreatment.optimizationRationale}

Causal Analysis Summary: ${request.causalAnalysis.patientSummary}

Generate a comprehensive, personalized precision care plan optimized for both clinical outcomes and insurance coverage.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "precision_care_plan",
        strict: true,
        schema: {
          type: "object",
          properties: {
            planTitle: { type: "string", description: "Care plan title" },
            executiveSummary: { type: "string", description: "Executive summary" },
            goals: {
              type: "array",
              items: { type: "string" },
              description: "Treatment goals",
            },
            interventions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intervention: { type: "string", description: "Intervention name" },
                  frequency: { type: "string", description: "Frequency" },
                  duration: { type: "string", description: "Duration" },
                  rationale: { type: "string", description: "Rationale" },
                },
                required: ["intervention", "frequency", "duration", "rationale"],
                additionalProperties: false,
              },
            },
            medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Medication name" },
                  dosage: { type: "string", description: "Dosage" },
                  frequency: { type: "string", description: "Frequency" },
                  duration: { type: "string", description: "Duration" },
                  purpose: { type: "string", description: "Purpose" },
                },
                required: ["name", "dosage", "frequency", "duration", "purpose"],
                additionalProperties: false,
              },
            },
            lifestyle: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendation: { type: "string", description: "Lifestyle recommendation" },
                  rationale: { type: "string", description: "Rationale" },
                },
                required: ["recommendation", "rationale"],
                additionalProperties: false,
              },
            },
            followUp: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string", description: "Follow-up action" },
                  timeframe: { type: "string", description: "Timeframe" },
                },
                required: ["action", "timeframe"],
                additionalProperties: false,
              },
            },
            causalRationale: {
              type: "string",
              description: "Explanation of causal reasoning behind plan",
            },
            evidenceBasis: {
              type: "array",
              items: { type: "string" },
              description: "Evidence supporting this plan",
            },
          },
          required: [
            "planTitle",
            "executiveSummary",
            "goals",
            "interventions",
            "medications",
            "lifestyle",
            "followUp",
            "causalRationale",
            "evidenceBasis",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from Precision Care generator");
  }

  return JSON.parse(content);
}

// ============ Safety Review (Digital Review Board) ============

export interface SafetyAlert {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  recommendation: string;
}

export interface ComplianceCheck {
  guideline: string;
  status: "pass" | "fail" | "warning";
  details: string;
}

export interface SafetyReviewRequest {
  carePlan: PrecisionCarePlanResult;
  patientContext: PatientContext;
}

export interface SafetyReviewResult {
  safetyAlerts: SafetyAlert[];
  complianceChecks: ComplianceCheck[];
  overallStatus: "approved" | "flagged" | "rejected";
  reviewSummary: string;
}

/**
 * Digital Review Board: Multi-layer safety verification
 */
export async function performSafetyReview(
  request: SafetyReviewRequest
): Promise<SafetyReviewResult> {
  const systemPrompt = `You are the Digital Review Board - the final safety verification layer.
You perform multi-layer safety checks on care plans before implementation:
1. Drug interaction screening
2. Allergy contraindication checks
3. Dosage validation
4. Clinical guideline compliance
5. Age/condition-specific safety rules

Be thorough and conservative. Patient safety is paramount.`;

  const userPrompt = `Patient Safety Profile:
- Age: ${request.patientContext.age}
${request.patientContext.allergies?.length ? `- Allergies: ${request.patientContext.allergies.join(", ")}` : "- No known allergies"}
${request.patientContext.chronicConditions?.length ? `- Chronic Conditions: ${request.patientContext.chronicConditions.join(", ")}` : ""}
${request.patientContext.currentMedications?.length ? `- Current Medications: ${request.patientContext.currentMedications.join(", ")}` : ""}

Proposed Care Plan:
Title: ${request.carePlan.planTitle}

Medications:
${request.carePlan.medications.map((m) => `- ${m.name} ${m.dosage} ${m.frequency}`).join("\n")}

Interventions:
${request.carePlan.interventions.map((i) => `- ${i.intervention}`).join("\n")}

Perform comprehensive safety review and compliance verification.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "safety_review",
        strict: true,
        schema: {
          type: "object",
          properties: {
            safetyAlerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: {
                    type: "string",
                    enum: ["critical", "warning", "info"],
                    description: "Alert severity",
                  },
                  category: { type: "string", description: "Alert category" },
                  message: { type: "string", description: "Alert message" },
                  recommendation: { type: "string", description: "Recommendation" },
                },
                required: ["severity", "category", "message", "recommendation"],
                additionalProperties: false,
              },
            },
            complianceChecks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  guideline: { type: "string", description: "Guideline name" },
                  status: {
                    type: "string",
                    enum: ["pass", "fail", "warning"],
                    description: "Compliance status",
                  },
                  details: { type: "string", description: "Details" },
                },
                required: ["guideline", "status", "details"],
                additionalProperties: false,
              },
            },
            overallStatus: {
              type: "string",
              enum: ["approved", "flagged", "rejected"],
              description: "Overall review status",
            },
            reviewSummary: { type: "string", description: "Review summary" },
          },
          required: ["safetyAlerts", "complianceChecks", "overallStatus", "reviewSummary"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from Digital Review Board");
  }

  return JSON.parse(content);
}
