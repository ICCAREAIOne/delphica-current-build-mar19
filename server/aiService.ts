import { invokeLLM } from "./_core/llm";

/**
 * AI Service for Clinical Decision Support
 * Implements AI-powered features for the framework components
 */

// ============ Delphi Simulator ============

export interface TreatmentOption {
  option: string;
  description: string;
  predictedOutcome: string;
  confidence: number;
  risks: string[];
  benefits: string[];
}

export interface DelphiSimulationRequest {
  patientContext: {
    age: number;
    gender: string;
    chiefComplaint: string;
    symptoms: string[];
    vitalSigns?: Record<string, any>;
    chronicConditions?: string[];
    currentMedications?: string[];
  };
  diagnosis: string;
  scenarioDescription: string;
}

export async function runDelphiSimulation(
  request: DelphiSimulationRequest
): Promise<{ analysis: string; treatmentOptions: TreatmentOption[] }> {
  const systemPrompt = `You are an expert clinical decision support AI assistant specializing in treatment scenario simulation. 
Your role is to analyze patient cases and generate evidence-based treatment options with detailed risk-benefit analysis.

Provide responses in a structured format that includes:
1. Comprehensive clinical analysis
2. Multiple treatment options (at least 3-4)
3. For each option: description, predicted outcome, confidence level (0-1), specific risks, and specific benefits

Base your recommendations on current medical evidence and guidelines.`;

  const userPrompt = `Patient Context:
- Age: ${request.patientContext.age}
- Gender: ${request.patientContext.gender}
- Chief Complaint: ${request.patientContext.chiefComplaint}
- Symptoms: ${request.patientContext.symptoms.join(", ")}
${request.patientContext.chronicConditions?.length ? `- Chronic Conditions: ${request.patientContext.chronicConditions.join(", ")}` : ""}
${request.patientContext.currentMedications?.length ? `- Current Medications: ${request.patientContext.currentMedications.join(", ")}` : ""}

Diagnosis: ${request.diagnosis}

Scenario: ${request.scenarioDescription}

Please provide:
1. A detailed clinical analysis of this scenario
2. At least 3-4 evidence-based treatment options with complete risk-benefit analysis`;

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
            analysis: {
              type: "string",
              description: "Comprehensive clinical analysis of the scenario",
            },
            treatmentOptions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  option: { type: "string", description: "Name of the treatment option" },
                  description: { type: "string", description: "Detailed description of the treatment" },
                  predictedOutcome: { type: "string", description: "Expected clinical outcome" },
                  confidence: { type: "number", description: "Confidence level 0-1" },
                  risks: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of potential risks",
                  },
                  benefits: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of expected benefits",
                  },
                },
                required: ["option", "description", "predictedOutcome", "confidence", "risks", "benefits"],
                additionalProperties: false,
              },
            },
          },
          required: ["analysis", "treatmentOptions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from AI");
  }

  return JSON.parse(content);
}

// ============ Causal Brain ============

export interface CausalFactor {
  factor: string;
  impact: string;
  confidence: number;
}

export interface EvidenceSource {
  source: string;
  citation: string;
  relevance: number;
}

export interface CausalInsightRequest {
  patientData: {
    age: number;
    gender: string;
    chronicConditions?: string[];
    currentMedications?: string[];
  };
  clinicalData: {
    diagnosis: string;
    symptoms: string[];
    labResults?: any[];
    treatmentHistory?: string[];
  };
  insightType: "risk_prediction" | "treatment_efficacy" | "pattern_analysis" | "causal_relationship";
}

export async function generateCausalInsight(
  request: CausalInsightRequest
): Promise<{
  title: string;
  description: string;
  causalFactors: CausalFactor[];
  evidenceSources: EvidenceSource[];
  recommendations: string[];
  confidenceScore: number;
}> {
  const systemPrompt = `You are an expert clinical AI specializing in causal analysis and evidence-based medicine.
Your role is to identify causal relationships, predict risks, and analyze treatment efficacy based on patient data.

Provide insights with:
1. Clear identification of causal factors and their impact
2. Evidence-based sources and citations
3. Actionable clinical recommendations
4. Confidence scoring based on evidence strength`;

  const insightTypeDescriptions = {
    risk_prediction: "Predict clinical risks and identify contributing factors",
    treatment_efficacy: "Analyze treatment effectiveness and outcomes",
    pattern_analysis: "Identify clinical patterns and trends",
    causal_relationship: "Establish causal relationships between factors and outcomes",
  };

  const userPrompt = `Patient Data:
- Age: ${request.patientData.age}
- Gender: ${request.patientData.gender}
${request.patientData.chronicConditions?.length ? `- Chronic Conditions: ${request.patientData.chronicConditions.join(", ")}` : ""}
${request.patientData.currentMedications?.length ? `- Current Medications: ${request.patientData.currentMedications.join(", ")}` : ""}

Clinical Data:
- Diagnosis: ${request.clinicalData.diagnosis}
- Symptoms: ${request.clinicalData.symptoms.join(", ")}
${request.clinicalData.treatmentHistory?.length ? `- Treatment History: ${request.clinicalData.treatmentHistory.join(", ")}` : ""}

Analysis Type: ${insightTypeDescriptions[request.insightType]}

Please provide a comprehensive causal analysis with evidence-based insights.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "causal_insight",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Concise title for the insight" },
            description: { type: "string", description: "Detailed description of the insight" },
            causalFactors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string", description: "Name of the causal factor" },
                  impact: { type: "string", description: "Description of the impact" },
                  confidence: { type: "number", description: "Confidence level 0-1" },
                },
                required: ["factor", "impact", "confidence"],
                additionalProperties: false,
              },
            },
            evidenceSources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source: { type: "string", description: "Name of the evidence source" },
                  citation: { type: "string", description: "Citation or reference" },
                  relevance: { type: "number", description: "Relevance score 0-1" },
                },
                required: ["source", "citation", "relevance"],
                additionalProperties: false,
              },
            },
            recommendations: {
              type: "array",
              items: { type: "string" },
              description: "List of clinical recommendations",
            },
            confidenceScore: {
              type: "number",
              description: "Overall confidence score 0-100",
            },
          },
          required: ["title", "description", "causalFactors", "evidenceSources", "recommendations", "confidenceScore"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from AI");
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

export interface CarePlanRequest {
  patientData: {
    age: number;
    gender: string;
    chronicConditions?: string[];
    allergies?: string[];
  };
  diagnosis: string;
  treatmentGoals: string[];
  selectedTreatmentOption?: string;
  causalInsights?: string[];
}

export async function generatePrecisionCarePlan(
  request: CarePlanRequest
): Promise<{
  planTitle: string;
  goals: string[];
  interventions: Intervention[];
  medications: Medication[];
  lifestyle: LifestyleRecommendation[];
  followUp: FollowUp[];
  aiRationale: string;
}> {
  const systemPrompt = `You are an expert clinical AI specializing in personalized care plan generation.
Your role is to create comprehensive, evidence-based, and patient-specific treatment plans.

Generate care plans that include:
1. Clear, measurable treatment goals
2. Specific clinical interventions with rationale
3. Detailed medication regimens (considering allergies and interactions)
4. Lifestyle modifications with evidence-based rationale
5. Follow-up schedule and monitoring plan
6. Comprehensive rationale for all recommendations`;

  const userPrompt = `Patient Profile:
- Age: ${request.patientData.age}
- Gender: ${request.patientData.gender}
${request.patientData.chronicConditions?.length ? `- Chronic Conditions: ${request.patientData.chronicConditions.join(", ")}` : ""}
${request.patientData.allergies?.length ? `- Allergies: ${request.patientData.allergies.join(", ")}` : ""}

Diagnosis: ${request.diagnosis}

Treatment Goals:
${request.treatmentGoals.map((goal, i) => `${i + 1}. ${goal}`).join("\n")}

${request.selectedTreatmentOption ? `Selected Treatment Approach: ${request.selectedTreatmentOption}` : ""}

${request.causalInsights?.length ? `AI-Generated Insights:\n${request.causalInsights.join("\n")}` : ""}

Please generate a comprehensive, personalized care plan optimized for this patient.`;

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
            planTitle: { type: "string", description: "Descriptive title for the care plan" },
            goals: {
              type: "array",
              items: { type: "string" },
              description: "List of specific, measurable treatment goals",
            },
            interventions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intervention: { type: "string", description: "Name of the intervention" },
                  frequency: { type: "string", description: "How often to perform" },
                  duration: { type: "string", description: "How long to continue" },
                  rationale: { type: "string", description: "Clinical rationale" },
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
                  dosage: { type: "string", description: "Dosage amount" },
                  frequency: { type: "string", description: "Dosing frequency" },
                  duration: { type: "string", description: "Treatment duration" },
                  purpose: { type: "string", description: "Purpose of medication" },
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
                  rationale: { type: "string", description: "Evidence-based rationale" },
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
                  action: { type: "string", description: "Follow-up action required" },
                  timeframe: { type: "string", description: "When to perform" },
                },
                required: ["action", "timeframe"],
                additionalProperties: false,
              },
            },
            aiRationale: {
              type: "string",
              description: "Comprehensive explanation of the AI's reasoning for this care plan",
            },
          },
          required: ["planTitle", "goals", "interventions", "medications", "lifestyle", "followUp", "aiRationale"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from AI");
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
  patientData: {
    age: number;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
  };
  carePlan: {
    diagnosis: string;
    medications: Medication[];
    interventions: Intervention[];
  };
}

export async function performSafetyReview(
  request: SafetyReviewRequest
): Promise<{
  safetyAlerts: SafetyAlert[];
  complianceChecks: ComplianceCheck[];
  overallStatus: "approved" | "flagged" | "rejected";
}> {
  const systemPrompt = `You are a clinical safety verification AI specializing in medication safety, drug interactions, and clinical guideline compliance.

Your role is to:
1. Identify potential safety concerns (drug interactions, contraindications, allergies)
2. Check compliance with clinical guidelines
3. Flag critical issues that require physician review
4. Provide specific recommendations for safety improvements

Be thorough and conservative in safety assessments.`;

  const userPrompt = `Patient Safety Profile:
- Age: ${request.patientData.age}
${request.patientData.allergies?.length ? `- Known Allergies: ${request.patientData.allergies.join(", ")}` : "- No known allergies"}
${request.patientData.chronicConditions?.length ? `- Chronic Conditions: ${request.patientData.chronicConditions.join(", ")}` : ""}
${request.patientData.currentMedications?.length ? `- Current Medications: ${request.patientData.currentMedications.join(", ")}` : ""}

Proposed Care Plan:
Diagnosis: ${request.carePlan.diagnosis}

Medications:
${request.carePlan.medications.map((m) => `- ${m.name} ${m.dosage} ${m.frequency}`).join("\n")}

Interventions:
${request.carePlan.interventions.map((i) => `- ${i.intervention}`).join("\n")}

Please perform a comprehensive safety review and identify any concerns.`;

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
                    description: "Severity level of the alert",
                  },
                  category: { type: "string", description: "Category of safety concern" },
                  message: { type: "string", description: "Description of the safety issue" },
                  recommendation: { type: "string", description: "Recommended action" },
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
                  guideline: { type: "string", description: "Name of clinical guideline" },
                  status: {
                    type: "string",
                    enum: ["pass", "fail", "warning"],
                    description: "Compliance status",
                  },
                  details: { type: "string", description: "Details of compliance check" },
                },
                required: ["guideline", "status", "details"],
                additionalProperties: false,
              },
            },
            overallStatus: {
              type: "string",
              enum: ["approved", "flagged", "rejected"],
              description: "Overall safety review status",
            },
          },
          required: ["safetyAlerts", "complianceChecks", "overallStatus"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No valid response from AI");
  }

  return JSON.parse(content);
}
