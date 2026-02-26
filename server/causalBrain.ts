/**
 * Causal Brain Intelligence Hub
 * 
 * Central AI orchestration layer for evidence-based treatment recommendations,
 * causal inference analysis, and policy learning from clinical outcomes.
 */

import { invokeLLM } from "./_core/llm";
import crypto from "crypto";

/**
 * Evidence source from medical literature
 */
export interface EvidenceSource {
  title: string;
  authors?: string;
  publicationDate?: string;
  source?: string;
  doi?: string;
  pmid?: string;
  abstract?: string;
  keyFindings?: string;
  relevanceScore: number;
}

/**
 * Treatment recommendation from Causal Brain
 */
export interface TreatmentRecommendation {
  treatmentName: string;
  treatmentType: string;
  confidenceScore: number;
  reasoning: string;
  evidenceSources: string[];
  indicatedFor?: string;
  contraindications?: string[];
  expectedOutcome?: string;
  alternativeTreatments?: string[];
  suggestedDosage?: string;
  suggestedFrequency?: string;
  suggestedDuration?: string;
}

/**
 * Patient context for generating recommendations
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
 * Causal analysis result
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

/**
 * Retrieve evidence from medical literature for a given query
 */
export async function retrieveEvidence(
  query: string,
  maxResults: number = 5
): Promise<EvidenceSource[]> {
  // Generate query hash for caching
  const queryHash = crypto.createHash('sha256').update(query).digest('hex');

  // In production, this would search PubMed, clinical guidelines, etc.
  // For now, we use LLM to simulate evidence retrieval
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a medical research assistant. Retrieve relevant evidence from medical literature for the given query. 
        
        Provide ${maxResults} evidence sources with:
        - Title
        - Authors (if available)
        - Publication date
        - Source (journal/database)
        - Key findings
        - Relevance score (0-100)
        
        Focus on high-quality evidence: clinical trials, meta-analyses, and clinical guidelines.`
      },
      {
        role: "user",
        content: query
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "evidence_sources",
        strict: true,
        schema: {
          type: "object",
          properties: {
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  authors: { type: "string" },
                  publicationDate: { type: "string" },
                  source: { type: "string" },
                  doi: { type: "string" },
                  pmid: { type: "string" },
                  keyFindings: { type: "string" },
                  relevanceScore: { type: "number" }
                },
                required: ["title", "keyFindings", "relevanceScore"],
                additionalProperties: false
              }
            }
          },
          required: ["sources"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') return [];

  const parsed = JSON.parse(content);
  return parsed.sources;
}

/**
 * Generate treatment recommendations based on patient context and evidence
 */
export async function generateTreatmentRecommendations(
  patientContext: PatientContext,
  maxRecommendations: number = 3
): Promise<TreatmentRecommendation[]> {
  // Build evidence query
  const evidenceQuery = `Treatment options for ${patientContext.diagnosisDescription || 'condition'} in ${patientContext.age}-year-old ${patientContext.gender} patient${
    patientContext.chronicConditions && patientContext.chronicConditions.length > 0
      ? ` with ${patientContext.chronicConditions.join(', ')}`
      : ''
  }`;

  // Retrieve evidence
  const evidence = await retrieveEvidence(evidenceQuery, 5);

  // Generate recommendations using LLM with evidence context
  const evidenceContext = evidence
    .map((e, i) => `[${i + 1}] ${e.title}: ${e.keyFindings}`)
    .join('\n\n');

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert clinical decision support system. Generate evidence-based treatment recommendations.
        
        Consider:
        - Patient age, gender, and medical history
        - Current medications and potential interactions
        - Allergies and contraindications
        - Evidence from medical literature
        - Standard of care guidelines
        
        Provide ${maxRecommendations} treatment recommendations ranked by confidence.`
      },
      {
        role: "user",
        content: `Patient Context:
- Age: ${patientContext.age}
- Gender: ${patientContext.gender}
- Diagnosis: ${patientContext.diagnosisDescription || 'Not specified'}
- Symptoms: ${patientContext.symptoms.join(', ')}
- Allergies: ${patientContext.allergies?.join(', ') || 'None reported'}
- Chronic Conditions: ${patientContext.chronicConditions?.join(', ') || 'None'}
- Current Medications: ${patientContext.currentMedications?.join(', ') || 'None'}

Evidence from Literature:
${evidenceContext}

Generate treatment recommendations.`
      }
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
                  evidenceSources: {
                    type: "array",
                    items: { type: "string" }
                  },
                  indicatedFor: { type: "string" },
                  contraindications: {
                    type: "array",
                    items: { type: "string" }
                  },
                  expectedOutcome: { type: "string" },
                  alternativeTreatments: {
                    type: "array",
                    items: { type: "string" }
                  },
                  suggestedDosage: { type: "string" },
                  suggestedFrequency: { type: "string" },
                  suggestedDuration: { type: "string" }
                },
                required: [
                  "treatmentName",
                  "treatmentType",
                  "confidenceScore",
                  "reasoning",
                  "evidenceSources"
                ],
                additionalProperties: false
              }
            }
          },
          required: ["recommendations"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') return [];

  const parsed = JSON.parse(content);
  return parsed.recommendations;
}

/**
 * Perform causal analysis on treatment effectiveness
 * 
 * Analyzes historical patient outcomes to identify causal relationships
 * between treatments and outcomes.
 */
export async function performCausalAnalysis(
  diagnosisCode: string,
  treatmentCode: string,
  historicalData: Array<{
    patientId: number;
    outcome: string;
    outcomeValue: number;
    confounders: Record<string, any>;
  }>
): Promise<CausalAnalysisResult> {
  // In production, this would use statistical methods like:
  // - Propensity score matching
  // - Instrumental variables
  // - Regression discontinuity
  // - Difference-in-differences
  
  // For now, we use LLM to simulate causal analysis
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a biostatistician performing causal inference analysis on clinical data.
        
        Analyze the effectiveness of a treatment for a specific diagnosis using the provided historical data.
        
        Consider:
        - Confounding variables (age, gender, comorbidities, etc.)
        - Selection bias
        - Treatment adherence
        - Follow-up duration
        
        Provide causal analysis results with statistical measures.`
      },
      {
        role: "user",
        content: `Diagnosis Code: ${diagnosisCode}
Treatment Code: ${treatmentCode}
Sample Size: ${historicalData.length}

Historical Outcomes:
${JSON.stringify(historicalData.slice(0, 10), null, 2)}

Perform causal analysis.`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "causal_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            effectSize: { type: "number" },
            confidenceInterval: { type: "string" },
            pValue: { type: "number" },
            methodology: { type: "string" },
            confounders: {
              type: "array",
              items: { type: "string" }
            },
            outcomeType: { type: "string" },
            outcomeValue: { type: "number" },
            analysisNotes: { type: "string" }
          },
          required: [
            "effectSize",
            "confidenceInterval",
            "pValue",
            "methodology",
            "confounders",
            "outcomeType",
            "outcomeValue",
            "analysisNotes"
          ],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to perform causal analysis");
  }

  const parsed = JSON.parse(content);
  
  return {
    diagnosisCode,
    treatmentCode,
    effectSize: parsed.effectSize,
    confidenceInterval: parsed.confidenceInterval,
    pValue: parsed.pValue,
    sampleSize: historicalData.length,
    methodology: parsed.methodology,
    confounders: parsed.confounders,
    outcomeType: parsed.outcomeType,
    outcomeValue: parsed.outcomeValue,
    analysisNotes: parsed.analysisNotes
  };
}

/**
 * Update treatment policy based on new outcome data (policy learning)
 * 
 * Adjusts recommendation confidence scores based on real-world outcomes.
 */
export async function updateTreatmentPolicy(
  treatmentCode: string,
  outcomes: Array<{
    success: boolean;
    adverseEvent: boolean;
    outcomeDescription: string;
  }>
): Promise<{
  updatedConfidence: number;
  policyAdjustment: string;
  reasoning: string;
}> {
  const successRate = outcomes.filter(o => o.success).length / outcomes.length;
  const adverseEventRate = outcomes.filter(o => o.adverseEvent).length / outcomes.length;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a reinforcement learning system for clinical decision support.
        
        Update treatment recommendation policies based on real-world outcomes.
        
        Consider:
        - Success rate vs expected
        - Adverse event rate
        - Patient satisfaction
        - Long-term outcomes
        
        Adjust confidence scores and provide policy recommendations.`
      },
      {
        role: "user",
        content: `Treatment Code: ${treatmentCode}
Total Outcomes: ${outcomes.length}
Success Rate: ${(successRate * 100).toFixed(1)}%
Adverse Event Rate: ${(adverseEventRate * 100).toFixed(1)}%

Recent Outcomes:
${JSON.stringify(outcomes.slice(0, 5), null, 2)}

Update treatment policy.`
      }
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
            reasoning: { type: "string" }
          },
          required: ["updatedConfidence", "policyAdjustment", "reasoning"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to update treatment policy");
  }

  return JSON.parse(content);
}
